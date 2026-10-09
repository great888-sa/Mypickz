/* =========================================================
   Add Trip — إعادة تصميم كاملة (يوليو 2026)
   - نقطة بداية وحيدة: My Trips (لا زر Select مستقل)
   - وضع "إضافة نشطة" لرحلة محددة (activeTripId) — أي بطاقة تُضغط تُضاف لها مباشرة
   - تصنيف صريح لكل مكان وقت الإضافة (7 فئات ثابتة)، ترتيب قابل للتخصيص لكل يوم
   - مشاركة مزدوجة: Public (عام عبر Community Lists) + Share with someone (محدد بالاسم)
   بنية التخزين: trips/{tripId} = {
     ownerId, cityId, cityName, customLabel, public, sharedWith:[uid...], sharedWithNames:{uid:nickname},
     days:[{ dayNumber, categoryOrder:[...7 فئات...], places:{ categoryId: [ref, ...] } }]
   }
   ref مكان = { sourceType:'owner'|'mylist'|'community', subcatId, placeId, sourceUid? }
   ========================================================= */

// ر٥٥ (ق٣٠-٠٥ والمشهد ٦/ب): الأنواع ثلاثة و«All» مرشِّح لا نوع — خانات كل نوع الخاصة بالخطوة ٦
const TRIP_TYPES = [
  { id:'city', icon:'\uD83C\uDFD9', label:'Single city' },
  { id:'multi', icon:'\uD83C\uDF0D', label:'Multi-city' },
];
function tripTypeMeta(id){ return TRIP_TYPES.find(t => t.id === id) || null; }
// الرحلات القديمة بلا حقل تُعرض بلا مقطع نوع (بيانات تجريبية — التصفير مقرَّر)
function tripTypeLine(trip){ const m = trip && tripTypeMeta(trip.type); return m ? (m.icon + ' ' + m.label) : ''; }
const TRIP_CATEGORIES = [
  { id:'breakfast',  label:'Breakfast',  icon:'🍳', color:'#E8A33D' },
  { id:'coffee_tea', label:'Coffee/Tea', icon:'☕', color:'#8B5E3C' },
  { id:'bakery',     label:'Bakery',     icon:'🥐', color:'#C97B3D' },
  { id:'lunch',      label:'Lunch',      icon:'🍽️', color:'#D9704F' },
  { id:'activity',   label:'Activity',   icon:'🎟️', color:'#4A7C9B' },
  { id:'icecream',   label:'Ice Cream',  icon:'🍦', color:'#D98CA3' },
  { id:'dinner',     label:'Dinner',     icon:'🌙', color:'#3D4F66' },
];
function defaultCategoryOrder(){ return TRIP_CATEGORIES.map(c => c.id); }
function categoryMeta(id){ return TRIP_CATEGORIES.find(c => c.id === id) || { id, label:id, icon:'📍', color:'#8A8A8A' }; }
function emptyDay(dayNumber){
  const places = {};
  TRIP_CATEGORIES.forEach(c => places[c.id] = []);
  return { dayNumber, categoryOrder: defaultCategoryOrder(), places };
}

let userTrips = [];
let sharedTrips = [];           // رحلات شُوركت معي بالتحديد (sharedWith)
let tripsLoaded = false;
let currentTripId = null;       // الرحلة المفتوحة حاليًا بوضع العرض/التعديل داخل My Trips
let viewingSharedTrip = false;  // الرحلة المفتوحة من "شُوركت معي" — قراءة فقط دائمًا
let tripViewMode = false;       // false = وضع تعديل، true = وضع عرض نهائي مصقول
let resolvedTripCache = {};
let activeTripId = null;        // الرحلة اللي "وضع الإضافة النشط" مفعّل لها حاليًا

// إعادة محاولة تلقائية مرة واحدة لو فشل الاستعلام بسبب "permission-denied" — يحمي من نافذة توقيت نادرة حيث تكون بيانات تسجيل الدخول جاهزة بالواجهة قبل جهوزيتها الكاملة لدى Firestore، خصوصًا فور إعادة فتح جلسة محفوظة
async function withAuthRetry(fn){
  try{
    return await fn();
  }catch(e){
    if (e && e.code === 'permission-denied'){
      await new Promise(r => setTimeout(r, 600));
      return await fn();
    }
    throw e;
  }
}

async function loadUserTrips(){
  if (!currentUser){ userTrips = []; sharedTrips = []; tripsLoaded = true; return; }
  try{
    const snap = await withAuthRetry(() => mpData.trips.byOwner(currentUser.uid));
    userTrips = [];
    snap.forEach(doc => userTrips.push({ id: doc.id, ...doc.data() }));
  }catch(e){ userTrips = []; }
  try{
    const snap2 = await withAuthRetry(() => mpData.trips.sharedWith(currentUser.uid));
    sharedTrips = [];
    snap2.forEach(doc => sharedTrips.push({ id: doc.id, ...doc.data() }));
  }catch(e){ sharedTrips = []; }
  tripsLoaded = true;
}
async function saveTrip(trip){
  mpTrack.hit('trip_save');
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  try{
    trip.ownerId = trip.ownerId || currentUser.uid; // صيد المحاكاة (ر٦٠+): الحل يقرأ المالك من الكائن المحلي — رحلة منشأة توًّا كانت تتدهور حتى أول إعادة تحميل
    const __legs = {}; (trip.dayRoutes || []).forEach(function(r){ (r.legs || []).forEach(function(l){ if (l && l.source) __legs[l.source] = true; }); }); // r72m (M4.25 ٢): مصادر الأرجل المشتقة
    const __isNew = !trip.__saved; trip.__saved = true; // r72p (٧): trip_built مرة عند أول حفظ
    await mpData.trips.save(trip, { ownerId: currentUser.uid, legSources: Object.keys(__legs) });
    if (__isNew && !trip.source) try{ mpTrack.statsCity(trip.cityId, 'trip_built'); }catch(_){}
  }catch(e){ showToast('Could not save trip'); }
}
function generateTripId(){
  return "trip_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function findPlaceInLinksById(linksObj, subcatId, placeId){
  const entry = linksObj && linksObj[subcatId];
  if (!entry || !Array.isArray(entry.places)) return null;
  return entry.places.find(p => p.id === placeId) || null;
}

// الحل الموحّد: يجلب بيانات كل مكان بكل فئة بكل يوم بالرحلة، أيًا كان مصدره — يُستدعى فقط لحظة فتح رحلة معيّنة
async function resolveTripPlaces(trip){
  // ر٦٠: تنفيذ ق٢٠٢٦-٠٨-٢٨-٠١ (كان نافذًا معلَّق التنفيذ) — فرع الدليل أُزيل؛ مراجع owner القديمة تتدهور طبيعيًّا
  let myLinks = {};
  try{
    const myDoc = await mpData.cityLists.get(trip.ownerId, trip.cityId);
    myLinks = Object.assign({}, (myDoc && myDoc.categories) || {});
    // ٢٦ أغسطس (٣-ب): الأماكن الخاصة تُحل لصاحب الرحلة وحده من مستنده الخاص؛ لغيره تبقى "غير متاحة"
    if (currentUser && trip.ownerId === currentUser.uid){
      try{ Object.assign(myLinks, await mpData.privatePlaces.get(currentUser.uid, trip.cityId)); }catch(e){}
    }
  }catch(e){}

  // v1.37 (١ سبتمبر): المرجع المحفوظ يحمل مدينته؛ الأماكن المضافة من مدينة غير مدينة الرحلة (مثل مدينة مخصصة تحمل الاسم نفسه) تُحل من مستندها لا من مستند مدينة الرحلة — قراءة فقط
  const myLinksByCity = { [trip.cityId]: myLinks };
  const extraCities = new Set();
  trip.days.forEach(day => TRIP_CATEGORIES.forEach(c => (day.places[c.id]||[]).forEach(ref => {
    if (ref.sourceType === 'mylist' && ref.cityId && ref.cityId !== trip.cityId) extraCities.add(ref.cityId);
  })));
  for (const cid of extraCities){
    try{
      const d = await mpData.cityLists.get(trip.ownerId, cid);
      const links = Object.assign({}, (d && d.categories) || {});
      if (currentUser && trip.ownerId === currentUser.uid){ try{ Object.assign(links, await mpData.privatePlaces.get(currentUser.uid, cid)); }catch(e){} }
      myLinksByCity[cid] = links;
    }catch(e){ myLinksByCity[cid] = {}; }
  }
  const communityUids = new Set();
  trip.days.forEach(day => TRIP_CATEGORIES.forEach(c => (day.places[c.id]||[]).forEach(ref => {
    if (ref.sourceType === 'community' && ref.sourceUid) communityUids.add(ref.sourceUid);
  })));
  const communityLinksByUid = {};
  for (const uid of communityUids){
    try{
      const d = await mpData.cityLists.get(uid, trip.cityId);
      communityLinksByUid[uid] = (d && d.categories) || {};
    }catch(e){ communityLinksByUid[uid] = {}; }
  }
  function resolveRef(ref){
    let linksObj;
    if (ref.sourceType === 'mylist') linksObj = myLinksByCity[ref.cityId || trip.cityId] || myLinks;
    else linksObj = communityLinksByUid[ref.sourceUid] || {};
    const place = findPlaceInLinksById(linksObj, ref.subcatId, ref.placeId);
    // ر٦٠ · عدسة التشخيص: أي تدهور يطبع حلقة انقطاعه — لا لغز بعد اليوم
    if (!place){
      const entry = linksObj && linksObj[ref.subcatId];
      console.warn('[MyPickz][trip-resolve] unavailable', JSON.stringify(ref),
        '| doc keys:', linksObj ? Object.keys(linksObj).length : 'none',
        '| entry:', !!entry, '| places:', (entry && Array.isArray(entry.places)) ? entry.places.length : 0,
        '| ids:', (entry && Array.isArray(entry.places)) ? entry.places.map(pp => pp.id || '(no id)').join(',') : '');
    }
    return place ? { ...place, _ref: ref, _available: true } : { _available: false, _ref: ref };
  }
  return trip.days.map(day => ({
    dayNumber: day.dayNumber,
    categoryOrder: day.categoryOrder || defaultCategoryOrder(),
    places: Object.fromEntries(TRIP_CATEGORIES.map(c => [c.id, (day.places[c.id]||[]).map(resolveRef)]))
  }));
}

/* ===== وضع الإضافة النشط — يستبدل التحديد الجماعي القديم بالكامل ===== */
function activeTripLabel(){
  const t = userTrips.find(tr => tr.id === activeTripId);
  if (!t) return '';
  return t.customLabel ? `${escapeHtml(t.cityName)} — ${escapeHtml(t.customLabel)}` : escapeHtml(t.cityName || '');
}
let activeTripAdded = [];   // أسماء ما أُضيف بهذه الجلسة — للمراجعة قبل Done
// أ-١٢-٣: بطاقة المصادر الستة — أعداد مدينة الرحلة؛ العناوين مستثناة؛ عدّ القوائم لا الأماكن بالمجتمع؛ بلا رقم قبل التحميل
let tripSrcOpen = false; // ر٧٠س-٢: بطاقة المصادر مفتوحة أعلى الرحلة (يوم فيه محطات)
function tripsEmptyGuideHtml(){ // بلا رحلة بالحساب: أبواب أربعة (إنشاء · حفظ من المجتمع · من المنتقين · المشارَك معي)
  return '<div class="pl-guide"><div class="pl-guide-h">Start here — four ways to get a trip</div>'
    + '<button type="button" class="pl-guide-row" onclick="openCreateTripFlow()"><b>1 · Create your first trip</b><span>Pick the city and the days, then add places from any source — the sources card meets you on day one.</span></button>'
    + '<button type="button" class="pl-guide-row" onclick="tripsGuideGo(\'community\')"><b>2 · Save a community trip</b><span>Other users\' public trips by city — save one to your world.</span></button>'
    + '<button type="button" class="pl-guide-row dashed" onclick="tripsGuideGo(\'curators\')"><b>3 · Trips from curators</b><span>Active members whose favorites you may like · stage 3</span></button>'
    + '<button type="button" class="pl-guide-row" onclick="tripsGuideGo(\'shared\')"><b>4 · Trips shared with you</b><span>By name, from one person — they stay between you two.</span></button>'
    + '</div>';
}
function tripsGuideGo(src){ if (src === 'curators'){ switchTab('Curators'); return; } communityTab = 'trips'; communityScreen = 'source'; communityScreenState.trips.shared = (src === 'shared'); switchTab('Community'); }
function tripSourcesCardHtml(trip, dIdx){
  const cityId = trip.cityId || (trip.cities && trip.cities[0]) || null;
  const cpc = (userListData && userListData.cityPlaceCounts) || {}; const mine = cityId ? (Number(cpc[cityId]) || 0) : 0;
  const bm = Object.values(placeBmMap()).filter(function(v){ return v && (!cityId || v.cityId === cityId); }).length;
  const rows = (typeof __cmSummary !== 'undefined' && __cmSummary && Array.isArray(__cmSummary.places)) ? __cmSummary.places : null;
  const lists = rows ? rows.filter(function(r){ return !cityId || r.cityId === cityId; }).length : null;
  const trows = (typeof __cmSummary !== 'undefined' && __cmSummary && Array.isArray(__cmSummary.trips)) ? __cmSummary.trips : null;
  const trips = trows ? trows.filter(function(r){ return !cityId || r.cityId === cityId || (Array.isArray(r.cities) && r.cities.indexOf(cityId) >= 0); }).length : null;
  const n = function(v){ return (v === null || v === undefined) ? '' : ' (' + v + ')'; };
  const btn = function(src, label, count, stage){ return '<button type="button" class="pl-src' + (stage ? ' dashed' : '') + '" onclick="tripGoSource(\'' + attrStr(trip.id) + '\', \'' + src + '\')">' + label + n(count) + (stage ? ' <span class="dim">· stage 3</span>' : '') + '</button>'; };
  return '<div class="trip-srcs"><div class="pl-sub">Add places to this day from:</div><div class="chipgrid c3">'
    + btn('mine', 'My places', mine) + btn('bookmarks', 'My bookmarks', bm) + btn('shared', 'Shared with me', null)
    + btn('curators', 'Curators', null, true) + btn('lists', 'Community lists', lists) + btn('trips', 'Community trips', trips) + '</div></div>';
}
async function tripGoSource(tripId, src){ // كل زر ينقل إلى موضعه مصفًّى على مدينة الرحلة ووضع الإضافة قائم
  const trip = (userTrips || []).find(function(t){ return t.id === tripId; }); const cityId = trip ? (trip.cityId || (trip.cities && trip.cities[0]) || null) : null;
  activeTripId = tripId; activeTripAdded = []; activeTripAddedRefs = []; updateActiveTripBanner();
  if (src === 'mine' || src === 'bookmarks'){ if (cityId && cityId !== myListCityId){ plSessionCity = cityId; try{ await selectMyListCity(cityId); }catch(e){} } switchTab('Places'); selectPlacesSource(src === 'mine' ? 'mine' : 'bookmarked'); return; }
  if (src === 'curators'){ switchTab('Curators'); return; }
  communityTab = (src === 'trips') ? 'trips' : 'places'; communityScreen = 'source'; if (cityId) communityScreenState[communityTab].city = cityId; communityScreenState[communityTab].shared = (src === 'shared');
  switchTab('Community');
}
function startAddingToTrip(tripId){
  activeTripId = tripId;
  activeTripAdded = []; activeTripAddedRefs = [];
  closeMyTripsModal();
  updateActiveTripBanner();
  switchTab('Places');                       // الانتقال آخر خطوة — فلا تتسابق دورتا رسم على الجسم
  showToast('Pick places — they appear below, then tap Done');
}
function openActiveTrip(){                 // من الشريط: «View trip» يفتح الرحلة النشطة لمراجعتها (البطاقة مطوية) — كما كان
  const id = activeTripId; if (!id) return;
  switchTab('Trips'); openTripDetail(id, 'edit');
}
function openActiveTripSources(){          // ر٧٠س-٤ (قرار المالك: زران): «← Sources» يعود إلى الرحلة وبطاقة المصادر الستة مفتوحة
  const id = activeTripId; if (!id) return;
  switchTab('Trips'); openTripDetail(id, 'edit'); tripSrcOpen = true; renderMyTripsModal();
}
async function stopAddingToTrip(discard){
  // قرار المالك (١ سبتمبر): إلغاء وضع الإضافة لرحلة أُنشئت توًّا وما زالت بلا أماكن = التخلص منها، لا حفظ رحلة فارغة
  if (discard && freshTripId && activeTripId === freshTripId){
    const t = userTrips.find(x => x.id === freshTripId);
    if (t && tripPlaceCount(t) === 0){
      try{ await mpData.trips.remove(freshTripId); }catch(e){}
      userTrips = userTrips.filter(x => x.id !== freshTripId);
      delete resolvedTripCache[freshTripId];
      if (currentTripId === freshTripId) currentTripId = null;
      showToast('Empty trip discarded');
    }
  }
  const doneId = activeTripId, origin = tripAddOrigin; // ر٧٠ز: إن بدأ الوضع من صف مكان — «إنهاء» يعرض الرحلة و«رجوع» يعيد للأصل؛ «إلغاء» يعيد للأصل مباشرة
  freshTripId = null;
  activeTripId = null;
  activeTripAdded = [];
  updateActiveTripBanner();
  
  if (viewingUserUid) renderCommunityModal();
  if (origin){
    if (discard || !doneId || !userTrips.find(function(t){ return t.id === doneId; })){ tripAddOrigin = null; if (origin.tab) switchTab(origin.tab); return; }
    switchTab('Trips'); await openMyTripsModal(); await openTripDetail(doneId); return;
  }
  switchTab('Trips');                        // ر٦٠ (قرار المالك): Done أو Cancel يعيدانك لوجهة الرحلات
}
function refreshActiveViews(){             // كل ما يعرض زر الرحلة يُعاد رسمه عند تغيّر الوضع
  if (currentTab === 'Places') renderPlacesBody();
  if (viewingUserUid) renderCommunityModal();
}
function updateActiveTripBanner(){
  const bar = document.getElementById('activeTripBar');
  if (!bar) return;
  if (activeTripId){
    bar.classList.add('show');
    document.getElementById('activeTripLabel').innerHTML = 'Adding to: <b>' + escapeHtml(activeTripLabel()) + '</b>' + (activeTripAdded.length ? ' · ' + activeTripAdded.length : '');
    const list = document.getElementById('activeTripAddedRow');
    if (list) list.innerHTML = activeTripAdded.map((n, i) =>
      '<span class="chip label">' + escapeHtml(n) + ' <b onclick="undoTripAdd(' + i + ')">✕</b></span>').join('');
  } else {
    bar.classList.remove('show');
  }
  refreshActiveViews();
}

async function undoTripAdd(i){
  const trip = userTrips.find(t => t.id === activeTripId);
  const rec = activeTripAdded[i]; if (!trip || rec === undefined) return;
  const ref = (activeTripAddedRefs || [])[i];
  if (ref){
    const day = trip.days.find(d => d.dayNumber === ref.day);
    const arr = day && day.places[ref.cat];
    if (arr){ const k = arr.findIndex(p => p.placeId === ref.placeId); if (k >= 0) arr.splice(k, 1); }
    await saveTrip(trip);
  }
  activeTripAdded.splice(i, 1); activeTripAddedRefs.splice(i, 1);
  updateActiveTripBanner();
  showToast('Removed');
}
let activeTripAddedRefs = [];
let pendingPlaceRef = null;
// يُستدعى من زر "➕" على أي بطاقة مكان — يظهر فقط أثناء وضع الإضافة النشط لرحلة معيّنة
// ر٦٩ي (N-041): من المكان إلى رحلة — اختر الرحلة (بمدينة المكان) ثم اليوم ثم التصنيف
// ر٦٩ش (N-059): من مكان مميَّز بمدينة أخرى إلى رحلة بتلك المدينة
function plAddToTripFor(cityId, catId, placeId, placeName){ const keep = myListCityId; if (cityId) myListCityId = cityId; try{ plAddToTrip(catId, placeId, placeName); } finally { if (!document.getElementById('tripPickerBackdrop').classList.contains('show')) myListCityId = keep; } }
// ر٦٩خ (N-062): مكان من قائمة شخص إلى إحدى رحلاتي — المُختار نفسه (أي رحلة ← أي يوم ← أي تصنيف)
function cmSendCachedPlace(id){ const p = cmCache.places[id] || {}; if (p.myCat != null) return plSendPlaceText(p.myCat, p.myIndex); mpSendText('📍 ' + (p.name || 'Place') + '\n' + (p.url || '') + '\nfrom ' + (p.owner || 'a user') + "'s list · MyPickz"); } // ر٧٠و: مكاني يُرسل بنصه المعتاد
function cmExportOthersPlace(id, name, url, owner, area, city, category){ cmCache.places[id] = { name: name, url: url, owner: owner, area: area, city: city, category: category }; openExportPreview('oplace', id); } // ر٦٩ض (N-057): بطاقة مكان واحد بوسم صاحبه
function cmAddOthersPlaceToTrip(cityId, subcatId, placeId, sourceUid, placeName){ // ر٧٠و: النواة الموحَّدة
  if (!currentUser){ openAuthModal(); return; }
  pendingPlaceRef = { sourceType: 'community', cityId: cityId, subcatId: subcatId, placeId: placeId, sourceUid: sourceUid, name: placeName || 'Place' };
  tripAddStart(cityId);
}
// ر٧٠و (N-065 · قرار المالك أ): إضافة مكان إلى رحلة من صف الأفعال — الأماكن والمجتمع — بنواة واحدة بثلاث حالات:
//   لا رحلة بالمدينة → نافذة الإنشاء والمدينة محددة ثم يتابع · رحلة واحدة → المسار · أكثر → اختيار الرحلة باللوحة المشتركة.
//   المسار: اليوم باللوحة (إن كانت الرحلة أيامًا) ← خانة الجدول باللوحة بلا اختيار مسبق ← الإضافة بتصنيف المكان ← عرض الرحلة الحالي ← الإنهاء يعود للشاشة الأصل.
let tripAddOrigin = null, tripAddPendingTripId = null, tripAddPendingDay = null, tcPresetCityId = null, tcAfterCreate = null;
function plAddToTrip(catId, placeId, placeName){
  if (!currentUser){ openAuthModal(); return; }
  pendingPlaceRef = { sourceType: 'mylist', cityId: myListCityId, subcatId: catId, placeId: placeId, sourceUid: null, name: placeName || 'Place' };
  tripAddStart(myListCityId);
}
function tripAddStart(cityId){
  const trips = (userTrips || []).filter(function(t){ return t.cityId === cityId; });
  tripAddOrigin = { tab: currentTab };
  if (!trips.length){ tcPresetCityId = cityId; tcAfterCreate = 'addPending'; openCreateTripFlow(); return; }
  if (trips.length === 1){ tripAddContinue(trips[0].id); return; }
  const wrap = document.getElementById('tripPickerBody');
  wrap.innerHTML = '<p class="mp-empty mini" style="margin-bottom:10px;">Which trip?</p>' + pickerPanel({ id: 'tripAddChoose', bare: true, onPick: 'tripAddContinue',
    items: trips.map(function(t){ const nd = (t.days || []).length, np = tripPlaceCount(t); return { id: t.id, name: (t.cityName || '') + (t.customLabel ? ' — ' + t.customLabel : ''), sub: nd + (nd === 1 ? ' day' : ' days') + ' · ' + np + (np === 1 ? ' place' : ' places') }; }) }); // ر٧٠ز: بوضوح بطاقة الرحلة
  document.getElementById('tripPickerBackdrop').classList.add('show');
}
function tripAddContinue(tripId){
  const trip = (userTrips || []).find(function(t){ return t.id === tripId; }); if (!trip || !pendingPlaceRef) return;
  tripAddPendingTripId = tripId;
  if (activeTripId !== tripId){ activeTripId = tripId; activeTripAdded = []; activeTripAddedRefs = []; updateActiveTripBanner(); refreshActiveViews(); } // ر٧٠ز (قرار المالك): وضع الإضافة القائم — الشريط يبقى لأماكن أخرى
  if ((trip.days || []).length === 1) openCategoryPicker(tripId, 1); else openDayPicker(tripId);
}
function tripPickDay(n){ openCategoryPicker(tripAddPendingTripId, parseInt(n, 10) || 1); }
function tripPickSlot(catId){ return confirmAddPlace(tripAddPendingTripId, tripAddPendingDay || 1, catId); }
async function addPlaceToTrip(sourceType, cityId, subcatId, placeId, sourceUid, placeName){
  if (!currentUser){ openAuthModal(); return; }
  if (!activeTripId){ showToast('Open a trip from My Trips first'); return; }
  const trip = userTrips.find(t => t.id === activeTripId);
  if (!trip || trip.cityId !== cityId){ showToast('This place is not in the same city as your active trip'); return; }
  pendingPlaceRef = { sourceType, cityId, subcatId, placeId, sourceUid: sourceUid || null, name: placeName || 'Place' };
  if (trip.days.length === 1) openCategoryPicker(trip.id, 1);
  else openDayPicker(trip.id);
}
// إغلاق نافذة "Add to Trip" عبر زر Cancel — كان الزر يستدعي دالة غير موجودة (اكتُشف بتدقيق ما بعد الدفعة ٢، ١٧ أغسطس)
function closeTripPickerModal(){
  document.getElementById('tripPickerBackdrop').classList.remove('show');
  pendingPlaceRef = null;
}
function openDayPicker(tripId){ // ر٧٠و: باللوحة المشتركة
  const trip = userTrips.find(t => t.id === tripId); if (!trip) return;
  tripAddPendingTripId = tripId;
  const wrap = document.getElementById('tripPickerBody');
  wrap.innerHTML = '<p style="font-size:12px; color:var(--ink-soft); text-align:center; margin-bottom:10px;">Which day?</p>'
    + pickerPanel({ id: 'tripAddDay', bare: true, onPick: 'tripPickDay', items: trip.days.map(d => ({ id: String(d.dayNumber), name: 'Day ' + d.dayNumber, count: Object.keys(d.places || {}).reduce((n, c) => n + ((d.places[c] || []).length), 0) })) });
  document.getElementById('tripPickerBackdrop').classList.add('show');
}
function openCategoryPicker(tripId, dayNumber){ // ر٧٠و: خانة الجدول باللوحة المشتركة بلا اختيار مسبق (قرار المالك)
  tripAddPendingTripId = tripId; tripAddPendingDay = dayNumber;
  const wrap = document.getElementById('tripPickerBody');
  wrap.innerHTML = '<p style="font-size:12px; color:var(--ink-soft); text-align:center; margin-bottom:10px;">Which slot?</p>'
    + pickerPanel({ id: 'tripAddSlot', bare: true, onPick: 'tripPickSlot', items: TRIP_CATEGORIES.map(c => ({ id: c.id, name: c.label })) }); // r72r-1
  document.getElementById('tripPickerBackdrop').classList.add('show');
}
async function confirmAddPlace(tripId, dayNumber, categoryId){
  const trip = userTrips.find(t => t.id === tripId);
  if (!trip || !pendingPlaceRef) return;
  let day = trip.days.find(d => d.dayNumber === dayNumber);
  if (!day){ day = emptyDay(dayNumber); trip.days.push(day); }
  if (!day.places[categoryId]) day.places[categoryId] = [];
  day.places[categoryId].push({ ...pendingPlaceRef });
  const addedName = (pendingPlaceRef && pendingPlaceRef.name) || 'Place';
  activeTripAdded.push(addedName);
  activeTripAddedRefs.push({ day: dayNumber, cat: categoryId, placeId: pendingPlaceRef.placeId });
  document.getElementById('tripPickerBackdrop').classList.remove('show');
  pendingPlaceRef = null;
  await saveTrip(trip);
  updateActiveTripBanner();
  showToast('Added ✓ — ' + addedName);
}

