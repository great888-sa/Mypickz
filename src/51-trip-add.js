/* =========================================================
   الرحلات — r77 (حزمة الرحلات · الدفعة أ — البيان v1.2): الخطة بالفترات الأربع بدل جدول الخانات السبع
   بنية التخزين: trips/{tripId} = {
     ownerId, title, cityId, cityName (المدينة الأولى — للمرشّحات والفهارس القائمة),
     cities:[{ cityId, cityName, days, stay:{name, geo}|null, arrival:{date,time}|null, departure:{date,time}|null, fallback:'transit'|'car' }],
     plan:{ days:[…], tray:[…] } (البنية في 59-trip-engine.js), version:'calm'|'balanced'|'dense', status:'draft'|'approved',
     public, sharedWith:[uid…], sharedWithNames:{uid:nickname}, source? (نسخة بإسناد), dayRoutes? (الدفعة ب)
   }
   مرجع المكان بالمدخل = { sourceType:'mylist'|'community', cityId, subcatId, placeId, sourceUid? } — كما كان، بلا حقل جديد (الاختيار ٢)
   مستند بلا plan = تنسيق قديم: لا يُفتح، سطر «Old format · delete» فقط (القرار ١٤ · الاختيار ١٢)
   ========================================================= */
let userTrips = [];
let sharedTrips = [];           // رحلات شُوركت معي بالتحديد (sharedWith)
let tripsLoaded = false;
let currentTripId = null;       // الرحلة المفتوحة حاليًا
let viewingSharedTrip = false;  // الرحلة المفتوحة من "شُوركت معي" — قراءة فقط دائمًا
let tripViewMode = true;        // r77: العرض دائمًا؛ التحرير بالمنشئ (المسودة) لا بالعرض
let resolvedTripCache = {};
let activeTripId = null;        // وضع الإضافة القائم (ر٧٠ز)

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
  userTrips.forEach(tripNormalize); sharedTrips.forEach(tripNormalize);
  tripsLoaded = true;
}
function tripNormalize(t){ if (!t) return t; if (t.plan) tripPlanNormalize(t.plan); if (!Array.isArray(t.cities)) t.cities = t.cityId ? [{ cityId: t.cityId, cityName: t.cityName || '', days: tripHasPlan(t) ? Math.max(1, t.plan.days.filter(function(d){ return d.kind === 'full'; }).length) : 1, stay: null, arrival: null, departure: null, fallback: 'transit' }] : []; t.cities = t.cities.map(function(c){ return (typeof c === 'string') ? { cityId: c, cityName: c, days: 1, stay: null, arrival: null, departure: null, fallback: 'transit' } : c; }); if (!t.version) t.version = 'balanced'; if (!t.status) t.status = tripHasPlan(t) ? 'approved' : 'draft'; if (t.dayRoutes && (typeof t.dayRoutes !== 'object' || Array.isArray(t.dayRoutes))) t.dayRoutes = {}; if (t.dayRoutes) tripRoutesPrune(t); return t; } // r78: مسار اليوم يُقرأ مقلَّمًا (أرجل فقدت طرفًا تسقط)
function tripHasPlan(t){ return !!(t && t.plan && Array.isArray(t.plan.days)); }
function tripIsOld(t){ return !!(t && !tripHasPlan(t) && Array.isArray(t.days)); } // القديم: days[] بالخانات
function tripCityIds(t){ return (t && Array.isArray(t.cities) ? t.cities : []).map(function(c){ return typeof c === 'string' ? c : c.cityId; }).filter(Boolean).concat(t && t.cityId && !(t.cities || []).length ? [t.cityId] : []); }
function tripHasCity(t, cityId){ return tripCityIds(t).indexOf(cityId) >= 0; }
function tripDayCount(t){ return tripHasPlan(t) ? t.plan.days.length : ((t && t.days && t.days.length) || 0); }
function tripPlaceCount(t){ return tripHasPlan(t) ? tripPlanCount(t.plan) : 0; }
function tripMetaLine(t){ const d = tripDayCount(t), p = tripPlaceCount(t); return d + (d === 1 ? ' day' : ' days') + ' · ' + p + (p === 1 ? ' place' : ' places'); } // بدل سطر النوع (القرار ١٣)
function tripTitle(t){ if (!t) return ''; if (t.title) return t.title; const names = (t.cities || []).map(function(c){ return c.cityName; }).filter(Boolean); const base = names.length ? names.join(' & ') : (t.cityName || 'Trip'); return t.customLabel ? (base + ' — ' + t.customLabel) : base; }
function tripSpec(t){ return { cities: t.cities || [], version: t.version || 'balanced' }; }
function tripRestRowHtml(stayName, minutes, removeOn){ return '<div class="trip-rest"><span><b>Rest at ' + escapeHtml(stayName || 'your stay') + '</b> <span class="dim">· about ' + (minutes >= 90 ? (Math.round(minutes / 30) / 2) + ' h' : minutes + ' min') + '</span></span>' + (removeOn ? '<button type="button" class="actn" onclick="' + removeOn + '">Remove</button>' : '') + '</div>'; } // ب-٧: سطر الراحة بين فترتين (المسودة والعرض)
function tripRestAddHtml(hasStay, addOn){ return hasStay ? '<button type="button" class="trip-rest-add" onclick="' + addOn + '">＋ Add rest</button>' : '<div class="trip-rest-add off">＋ Add rest <span class="dim">· set where you stay in Setup</span></div>'; } // ب-٧: الزر بين الفترتين؛ بلا إقامة تلميح
function tripLegWarnHtml(w){ return '<div class="trip-legwarn">↓ ' + tripKmLabel(w.km) + ' · ' + (w.mode === 'walk' ? 'walk' : w.mode === 'car' ? 'car' : 'metro') + ' — a long leg</div>'; } // ب-٥: الرِّجل الطويلة سطرًا رفيعًا قبل محطتها (المسودة والعرض)
async function saveTrip(trip){
  mpTrack.hit('trip_save');
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  try{
    trip.ownerId = trip.ownerId || currentUser.uid; // صيد المحاكاة (ر٦٠+): الحل يقرأ المالك من الكائن المحلي
    const __isNew = !trip.__saved; trip.__saved = true; // r72p (٧): trip_built مرة عند أول حفظ
    if (trip.dayRoutes) tripRoutesPrune(trip); // r78 (البيان ٣-١): الأرجل التي فقدت طرفًا تُحذف عند الحفظ
    const __hasLegs = !!(trip.dayRoutes && Object.keys(trip.dayRoutes).some(function(k){ return trip.dayRoutes[k] && trip.dayRoutes[k].legs && Object.keys(trip.dayRoutes[k].legs).length; }));
    await mpData.trips.save(trip, Object.assign({ ownerId: currentUser.uid }, __hasLegs ? { legSources: ['user'] } : {})); // الدفعة ب: الأرجل من المستخدم وحده (legSourcesOk)
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
function tripSectionOf(subcatId){ const all = (typeof plCatsAll === 'function') ? plCatsAll() : []; const hit = all.find(function(x){ return x.id === subcatId; }); return hit ? (hit.sectionId || '') : ''; } // القسم من الشجرة لدور الإيقاع
function tripEntryFromPlace(ref, place){ const p = place || {}; return tripNewEntry({ ref: ref, name: p.name || ref.name || 'Place', geo: (p.geo && typeof p.geo.lat === 'number') ? p.geo : null, sec: tripSectionOf(ref.subcatId) }); } // بلا دبوس مؤكَّد = بلا إحداثيات (الاختيار ٣)

// الحل الموحّد: يجلب بيانات كل مكان بالخطة أيًّا كان مصدره — يُستدعى لحظة فتح رحلة
async function resolveTripPlaces(trip){
  const plan = tripHasPlan(trip) ? trip.plan : { days: [], tray: [] };
  const all = tripPlanEntries(plan).concat(plan.tray || []); const flat = []; all.forEach(function(e){ flat.push(e); (e.alts || []).forEach(function(a){ flat.push(a); }); });
  const cityIds = {}; tripCityIds(trip).forEach(function(c){ cityIds[c] = true; }); flat.forEach(function(e){ if (e.ref && e.ref.cityId) cityIds[e.ref.cityId] = true; });
  const myLinksByCity = {}; const isMe = !!(currentUser && trip.ownerId === currentUser.uid);
  for (const cid of Object.keys(cityIds)){
    try{ const d = await mpData.cityLists.get(trip.ownerId, cid); const links = Object.assign({}, (d && d.categories) || {}); if (isMe){ try{ Object.assign(links, await mpData.privatePlaces.get(currentUser.uid, cid)); }catch(e){} } myLinksByCity[cid] = links; }catch(e){ myLinksByCity[cid] = {}; } // ٢٦ أغسطس (٣-ب): الخاصة لصاحبها وحده
  }
  const communityLinks = {}; // uid|cityId
  for (const e of flat){ if (e.ref && e.ref.sourceType === 'community' && e.ref.sourceUid){ const k = e.ref.sourceUid + '|' + (e.ref.cityId || trip.cityId); if (communityLinks[k]) continue; try{ const d = await mpData.cityLists.get(e.ref.sourceUid, e.ref.cityId || trip.cityId); communityLinks[k] = (d && d.categories) || {}; }catch(err){ communityLinks[k] = {}; } } }
  function resolveRef(e){
    const ref = e.ref || {}; const linksObj = ref.sourceType === 'community' ? (communityLinks[ref.sourceUid + '|' + (ref.cityId || trip.cityId)] || {}) : (myLinksByCity[ref.cityId || trip.cityId] || {});
    const place = findPlaceInLinksById(linksObj, ref.subcatId, ref.placeId);
    if (!place) console.warn('[MyPickz][trip-resolve] unavailable', JSON.stringify(ref)); // ر٦٠ · عدسة التشخيص
    return Object.assign({}, e, { alts: (e.alts || []).map(resolveRef), _p: place || null, _available: !!place });
  }
  return { days: plan.days.map(function(d){ const out = Object.assign({}, d, { periods: {} }); TRIP_PERIODS.forEach(function(p){ out.periods[p] = (d.periods[p] || []).map(resolveRef); }); return out; }), tray: (plan.tray || []).map(resolveRef) };
}

/* ===== وضع الإضافة القائم (ر٧٠ز) ===== */
function activeTripLabel(){ const t = userTrips.find(tr => tr.id === activeTripId); return t ? escapeHtml(tripTitle(t)) : ''; }
let activeTripAdded = [];   // أسماء ما أُضيف بهذه الجلسة — للمراجعة قبل Done
let activeTripAddedRefs = []; // r77: معرّفات المدخلات المضافة (للتراجع)
function tripsEmptyGuideHtml(){ // بلا رحلة بالحساب: أبواب أربعة
  return '<div class="pl-guide"><div class="pl-guide-h">Start here — four ways to get a trip</div>'
    + '<button type="button" class="pl-guide-row" onclick="openTripBuilder()"><b>1 · Build your first trip</b><span>City, days and your places — MyPickz drafts the days, you move what you like, then approve.</span></button>'
    + '<button type="button" class="pl-guide-row" onclick="tripsGuideGo(\'community\')"><b>2 · Save a community trip</b><span>Other users\' public trips by city — save one to your world.</span></button>'
    + '<button type="button" class="pl-guide-row" onclick="tripsGuideGo(\'curators\')"><b>3 · Trips from curators</b><span>Active members whose favorites you may like</span></button>'
    + '<button type="button" class="pl-guide-row" onclick="tripsGuideGo(\'shared\')"><b>4 · Trips shared with you</b><span>By name, from one person — they stay between you two.</span></button>'
    + '</div>';
}
function tripsGuideGo(src){ if (src === 'curators'){ switchTab('Curators'); return; } communityTab = 'trips'; communityScreen = 'source'; communityScreenState.trips.shared = (src === 'shared'); switchTab('Community'); }
function startAddingToTrip(tripId){
  activeTripId = tripId;
  activeTripAdded = []; activeTripAddedRefs = [];
  updateActiveTripBanner();
  switchTab('Places');
  showToast('Tap Trip on any place — it lands in its best slot');
}
function openActiveTrip(){ const id = activeTripId; if (!id) return; switchTab('Trips'); openTripDetail(id); }
async function stopAddingToTrip(discard){
  const doneId = activeTripId, origin = tripAddOrigin;
  activeTripId = null; activeTripAdded = []; activeTripAddedRefs = [];
  updateActiveTripBanner();
  if (viewingUserUid) renderCommunityModal();
  if (origin){
    if (discard || !doneId || !userTrips.find(function(t){ return t.id === doneId; })){ tripAddOrigin = null; if (origin.tab) switchTab(origin.tab); return; }
    switchTab('Trips'); await openMyTripsModal(); await openTripDetail(doneId); return;
  }
  switchTab('Trips');
}
function refreshActiveViews(){ if (currentTab === 'Places') renderPlacesBody(); if (viewingUserUid) renderCommunityModal(); }
function updateActiveTripBanner(){
  const bar = document.getElementById('activeTripBar');
  if (!bar) return;
  if (activeTripId){
    bar.classList.add('show');
    document.getElementById('activeTripLabel').innerHTML = 'Adding to: <b>' + activeTripLabel() + '</b>' + (activeTripAdded.length ? ' · ' + activeTripAdded.length + ' added' : '');
    const list = document.getElementById('activeTripAddedRow');
    if (list) list.innerHTML = activeTripAdded.map((n, i) => '<span class="chip label">' + escapeHtml(n) + ' <b onclick="undoTripAdd(' + i + ')">✕</b></span>').join('');
  } else {
    bar.classList.remove('show');
  }
  refreshActiveViews();
}
async function undoTripAdd(i){
  const trip = userTrips.find(t => t.id === activeTripId);
  const rec = activeTripAdded[i]; if (!trip || rec === undefined) return;
  const id = (activeTripAddedRefs || [])[i];
  if (id && tripHasPlan(trip)){ tripDetach(trip.plan, id); await saveTrip(trip); delete resolvedTripCache[trip.id]; }
  activeTripAdded.splice(i, 1); activeTripAddedRefs.splice(i, 1);
  updateActiveTripBanner();
  if (currentTab === 'Trips' && currentTripId === trip.id) openTripDetail(trip.id);
  showToast('Removed');
}
let pendingPlaceRef = null;
function plAddToTripFor(cityId, catId, placeId, placeName){ const keep = cityListCityId; if (cityId) cityListCityId = cityId; try{ plAddToTrip(catId, placeId, placeName); } finally { if (!document.getElementById('tripPickerBackdrop').classList.contains('show')) cityListCityId = keep; } }
function cmSendCachedPlace(id){ const p = cmCache.places[id] || {}; if (p.myCat != null) return plSendPlaceText(p.myCat, p.myIndex); mpSendText('📍 ' + (p.name || 'Place') + '\n' + (p.url || '') + '\nfrom ' + (p.owner || 'a user') + "'s list · MyPickz"); statsExportFor('oplace', id); /* ب-٢-١ */ } // ر٧٠و: مكاني يُرسل بنصه المعتاد
function cmExportOthersPlace(id, name, url, owner, area, city, category){ cmCache.places[id] = { name: name, url: url, owner: owner, area: area, city: city, category: category }; openExportPreview('oplace', id); } // ر٦٩ض (N-057): بطاقة مكان واحد بوسم صاحبه
function cmAddOthersPlaceToTrip(cityId, subcatId, placeId, sourceUid, placeName){ // ر٧٠و: النواة الموحَّدة
  if (!currentUser){ openAuthModal(); return; }
  pendingPlaceRef = { sourceType: 'community', cityId: cityId, subcatId: subcatId, placeId: placeId, sourceUid: sourceUid, name: placeName || 'Place' };
  tripAddStart(cityId);
}
// r77 (البيان ٦-٢): الإضافة من بطاقة المكان — نواة ر٧٠و بثلاث حالات ثم قاعدة واحدة بلا سؤال:
//   دور الشجرة → الفترات الجائزة · الإحداثيات → اليوم الأقرب جيبًا · جدول الإيقاع → هل تتسع؛ وإلا الصينية؛ بلا دبوس → الصينية.
//   الرسالة تقول أين ذهب دائمًا ومعها Undo · Change (ورقة النقل). تبقى على بطاقة المكان ويبقى شريط وضع الإضافة.
let tripAddOrigin = null, tripAddPendingTripId = null;
function plAddToTrip(catId, placeId, placeName){
  if (!currentUser){ openAuthModal(); return; }
  pendingPlaceRef = { sourceType: 'mylist', cityId: cityListCityId, subcatId: catId, placeId: placeId, sourceUid: null, name: placeName || 'Place' };
  tripAddStart(cityListCityId);
}
function tripAddStart(cityId){
  const trips = (userTrips || []).filter(function(t){ return tripHasPlan(t) && tripHasCity(t, cityId); });
  tripAddOrigin = { tab: currentTab };
  if (activeTripId && userTrips.find(function(t){ return t.id === activeTripId && tripHasPlan(t); })){ tripAddContinue(activeTripId); return; } // الشريط قائم: النقرات التالية تتجاوز «أي رحلة»
  if (!trips.length){ openTripBuilder({ cityId: cityId, preselect: pendingPlaceRef }); return; } // لا رحلة بالمدينة → المنشئ والمدينة محددة والمكان مُعلَّم
  if (trips.length === 1){ tripAddContinue(trips[0].id); return; }
  const wrap = document.getElementById('tripPickerBody');
  wrap.innerHTML = '<p class="mp-empty mini" style="margin-bottom:10px;">Which trip?</p>' + pickerPanel({ id: 'tripAddChoose', bare: true, onPick: 'tripAddContinue',
    items: trips.map(function(t){ return { id: t.id, name: tripTitle(t), sub: tripMetaLine(t) + (t.status === 'draft' ? ' · draft' : '') }; }) })
    + '<button type="button" class="btn btn-ghost wide" onclick="closeTripPickerModal(); openTripBuilder({ cityId: \'' + attrStr(cityId) + '\', preselect: __tripLastPending })">＋ New trip with this place</button>';
  window.__tripLastPending = pendingPlaceRef;
  document.getElementById('tripPickerBackdrop').classList.add('show');
}
async function tripAddContinue(tripId){
  const trip = (userTrips || []).find(function(t){ return t.id === tripId; }); if (!trip || !pendingPlaceRef || !tripHasPlan(trip)) return;
  document.getElementById('tripPickerBackdrop').classList.remove('show');
  tripAddPendingTripId = tripId;
  if (activeTripId !== tripId){ activeTripId = tripId; activeTripAdded = []; activeTripAddedRefs = []; }
  const ref = pendingPlaceRef; pendingPlaceRef = null;
  if (!tripHasCity(trip, ref.cityId)){ // مدينة ليست في الرحلة → «أضف X قسمًا إلى هذه الرحلة؟»
    const cObj = (typeof cityListAllCities === 'function' ? cityListAllCities() : []).find(function(c){ return c.id === ref.cityId; }); const cName = cObj ? cObj.name : ref.cityId;
    const v = await mpSheet({ title: 'Add ' + cName + ' to this trip?', text: 'The place is in ' + cName + '. It becomes a new section with one day — change the days from the trip setup.', ok: 'Add ' + cName + ' · 1 day' });
    if (v !== 'ok'){ updateActiveTripBanner(); return; }
    trip.cities.push({ cityId: ref.cityId, cityName: cName, days: 1, stay: null, arrival: null, departure: null, fallback: 'transit' });
    const built = tripPlanDays(trip.cities); built.forEach(function(d){ if (!trip.plan.days.some(function(x){ return x.cityId === d.cityId; })) trip.plan.days.push(d); });
  }
  await tripAutoPlace(trip, ref);
}
async function tripPlaceDataFor(ref){ // بيانات المكان للمدخل (الاسم والدبوس): من الذاكرة إن كانت المدينة الحالية، وإلا قراءة واحدة
  try{
    if (ref.sourceType === 'mylist'){ if (ref.cityId === cityListCityId && myCityListData){ const p = findPlaceInLinksById(myCityListData.categories || {}, ref.subcatId, ref.placeId); if (p) return p; } const d = await mpData.cityLists.get(currentUser.uid, ref.cityId); let links = Object.assign({}, (d && d.categories) || {}); try{ Object.assign(links, await mpData.privatePlaces.get(currentUser.uid, ref.cityId)); }catch(e){} return findPlaceInLinksById(links, ref.subcatId, ref.placeId); }
    const d = await mpData.cityLists.get(ref.sourceUid, ref.cityId); return findPlaceInLinksById((d && d.categories) || {}, ref.subcatId, ref.placeId);
  }catch(e){ return null; }
}
async function tripAutoPlace(trip, ref){
  const place = await tripPlaceDataFor(ref);
  if (ref.sourceType === 'mylist' && tripSectionOf(ref.subcatId) === 'stay'){ const city = (trip.cities || []).find(function(c){ return c.cityId === ref.cityId; }); if (city){ city.stay = { name: (place && place.name) || ref.name || 'Stay', geo: (place && place.geo && typeof place.geo.lat === 'number') ? { lat: place.geo.lat, lng: place.geo.lng } : null }; await saveTrip(trip); delete resolvedTripCache[trip.id]; updateActiveTripBanner(); showActionToast('Set as where you stay · ' + (city.cityName || ''), [['Setup', "openTripBuilder({ tripId: '" + attrStr(trip.id) + "', stage: 1 })"]]); if (currentTab === 'Trips' && currentTripId === trip.id) openTripDetail(trip.id); return; } } /* ب-٨: الفندق إقامة لا محطة */
  const e = tripEntryFromPlace(Object.assign({}, ref, { name: ref.name }), place);
  const slot = tripSuggestSlot(trip.plan, e, tripSpec(trip)); let where;
  if (slot){ tripInsert(trip.plan, slot.dayIdx, slot.period, e, slot.alt, slot.excursion); const d = trip.plan.days[slot.dayIdx]; where = tripDayLabel(d) + ' · ' + TRIP_PERIOD_LABEL[slot.period] + (slot.alt ? ' · alternative' : ''); }
  else { trip.plan.tray.push(e); where = e.geo ? 'Program full · in the tray · ' + trip.plan.tray.length : 'No pin · in the tray'; }
  try{ mpTripCount('placesAdded', 1); if (!slot) mpTripCount('placesTrayed', 1); }catch(_){} /* r79 (ج · القرار ١٠) */
  // r78: لا علم مخزَّن للاكتمال — الرِّجل الجديدة بلا دقائق تجعل مسار اليوم «غير مكتمل» اشتقاقًا (التثبيت ٢)
  activeTripAdded.push(e.name); activeTripAddedRefs.push(e.id);
  await saveTrip(trip); delete resolvedTripCache[trip.id];
  updateActiveTripBanner();
  const acts = slot ? [['Undo', 'undoTripAdd(' + (activeTripAdded.length - 1) + ')'], ['Change', "tripOpenMoveSheet('" + attrStr(trip.id) + "', '" + attrStr(e.id) + "')"]] : (e.geo ? [['Open', "switchTab('Trips'); openTripDetail('" + attrStr(trip.id) + "')"]] : [['Pin it', "switchTab('Places')"]]);
  showActionToast((slot ? 'Added · ' : '') + where, acts);
  if (currentTab === 'Trips' && currentTripId === trip.id) openTripDetail(trip.id);
}
let __actionToastTimer = null;
function showActionToast(msg, actions){ // رسالة بأفعال (Undo · Change) على قرص الرسائل نفسه
  const t = document.getElementById('toast'); if (!t){ showToast(msg); return; }
  clearTimeout(__actionToastTimer); t.innerHTML = ''; t.appendChild(document.createTextNode(msg + ' '));
  (actions || []).forEach(function(a){ const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-undo'; b.textContent = a[0]; b.setAttribute('onclick', a[1]); b.addEventListener('click', function(){ clearTimeout(__actionToastTimer); t.classList.remove('show'); t.style.pointerEvents = 'none'; }); t.appendChild(b); });
  t.style.pointerEvents = 'auto'; t.classList.add('show');
  __actionToastTimer = setTimeout(function(){ t.classList.remove('show'); t.style.pointerEvents = 'none'; }, 6000);
}
async function addPlaceToTrip(sourceType, cityId, subcatId, placeId, sourceUid, placeName){ // من بطاقة المكان والشريط قائم
  if (!currentUser){ openAuthModal(); return; }
  if (!activeTripId){ showToast('Open a trip from My Trips first'); return; }
  const trip = userTrips.find(t => t.id === activeTripId); if (!trip || !tripHasPlan(trip)){ showToast('Open a trip from My Trips first'); return; }
  pendingPlaceRef = { sourceType, cityId, subcatId, placeId, sourceUid: sourceUid || null, name: placeName || 'Place' };
  tripAddOrigin = tripAddOrigin || { tab: currentTab };
  await tripAddContinue(trip.id);
}
function closeTripPickerModal(){
  document.getElementById('tripPickerBackdrop').classList.remove('show');
  pendingPlaceRef = null;
}
