/* ===== عرض رحلات مستخدم آخر (Community Lists → تبويب Trips، Public فقط) — قراءة فقط ===== */
let communityUserTrips = [];
let viewingCommunityTripId = null;

async function loadCommunityUserTrips(uid){
  try{
    const __rows = await mpData.trips.publicByOwner(uid); const snap = { forEach: function(fn){ __rows.forEach(function(r){ fn({ id: r.id, data: function(){ return r; } }); }); }, empty: __rows.length === 0, size: __rows.length };
    communityUserTrips = [];
    snap.forEach(doc => { const d = doc.data(); if (d && d.dayPlan) return; communityUserTrips.push({ id: doc.id, ...d }); }); /* r92 (ق١٠-٢٨-٠٦): خطة اليوم لا تُعرض في المجتمع */
  }catch(e){ communityUserTrips = []; }
}
async function openCommunityTrip(tripId){
  try{ const __t = (cmCache.trips && cmCache.trips[tripId]) || (communityUserTrips || []).find(function(t){ return t.id === tripId; }); if (__t && currentUser && __t.ownerId !== currentUser.uid) mpData.trips.bumpView(tripId).catch(function(){}); }catch(_){} // r72t (M4.26 ٣)
  mpTrack.statsTrip(tripId, 'view_total');
  viewingCommunityTripId = tripId;
  let trip = communityUserTrips.find(t => t.id === tripId) || cmCache.trips[tripId]; // ر٦٩ذ: من السوق مباشرة
  if (!trip){ try{ trip = await mpData.trips.get(tripId); }catch(e){} }
  if (!trip){ showToast('This trip is no longer available'); return; }
  if (!communityUserTrips.find(t => t.id === tripId)) communityUserTrips.push(trip);
  if (!viewingUserUid){ cmDirect = true; viewingUserUid = trip.ownerId; viewingUserData = (communityUsers || []).find(u => u.uid === trip.ownerId) || { uid: trip.ownerId, nickname: trip.ownerName || 'user', publicCityIds: [] }; viewingUserCities = []; } // ر٦٩غ: الفتح من السوق مباشرة — عرض الرحلة يعيش بطبقة صاحبها
  const wrap = document.getElementById('communityBody');
  wrap.innerHTML = `<div class="mp-empty mini">Loading…</div>`;
  resolvedTripCache['community_'+tripId] = await resolveTripPlaces(trip);
  // فتح رحلة مشتركة يُحتسَب كمشاهدة إضافية (نفس أهمية فتح الملف الشخصي نفسه)
  if (trip && trip.ownerId){
    mpData.communityProfiles.bumpView(trip.ownerId).catch(()=>{});
    if (viewingUserData && viewingUserData.uid === trip.ownerId) viewingUserData.viewCount = (viewingUserData.viewCount||0) + 1;
  }
  renderCommunityModal();
}
function backFromCommunityTrip(){ viewingCommunityTripId = null; if (cmDirect){ cmDirect = false; viewingUserUid = null; communityUserLayer = null; } renderCommunityModal(); } // ر٦٩غ: الرجوع إلى حيث فُتحت

function renderCommunityTripDetail(wrap){ // r77: رحلة الآخرين بالخطة — قراءة فقط (الأيام · الفترات · البدائل)
  const trip = communityUserTrips.find(t => t.id === viewingCommunityTripId);
  if (!trip){ viewingCommunityTripId = null; renderCommunityModal(); return; }
  const resolved = resolvedTripCache['community_'+trip.id] || { days: [], tray: [] };
  let html = `<button type="button" class="backchip" onclick="backFromCommunityTrip()" style="margin-bottom:8px;"><i class="fa-solid fa-arrow-left"></i> Back</button>
  <h4 style="text-align:center; margin:4px 0 4px; font-family:'Cairo',sans-serif;" dir="auto">${escapeHtml(tripTitle(trip))}</h4><div class="ctx" style="text-align:center; margin-bottom:8px;">${escapeHtml(tripMetaLine(trip))}</div>`;
  if (!tripHasPlan(trip)){ wrap.innerHTML = html + '<div class="mp-empty mini">This trip uses the old format.</div>'; return; }
  (resolved.days || []).forEach(function(day){
    const es = tripDayEntries(day); if (!es.length) return;
    html += `<div class="dayhead"><span class="daynum">${day.n}</span><span class="daytitle">${escapeHtml(tripDayLabel(day).toUpperCase())}${day.date ? ' · ' + escapeHtml(tripDateLabel(day.date)) : ''}</span><span class="dayline"></span></div>`;
    TRIP_PERIODS.forEach(function(p){ const arr = day.periods[p] || []; if (!arr.length) return; let __tcards = '';
      arr.forEach(function(e){ [e].concat(e.alts || []).forEach(function(x, k){
        if (!x._available){ __tcards += `<div class="row triprow dim">⚠️ This place is no longer available</div>`; return; }
        const ref = x._ref || x.ref || {}; const pl = x._p || {}; const ouid = ref.sourceUid || viewingUserUid || ''; const sCat = String(ref.subcatId || ''); const cityNm = ((trip.cities || []).find(function(c){ return c.cityId === (ref.cityId || trip.cityId); }) || {}).cityName || trip.cityName || '';
        __tcards += (k ? '<div class="pc-lab" style="margin:0 0 2px 6px;">or</div>' : '') + othersPlaceRowHtml({ id: ref.placeId || pl.id || hashUrl(pl.url || ''), name: pl.name || x.name || 'Place', url: pl.url, area: pl.area, picks: pl.picks, note: pl.note, geo: pl.geo }, { uid: ouid, nickname: (viewingUserData && viewingUserData.nickname) || 'a user' }, { id: ref.cityId || trip.cityId || '', name: cityNm }, sCat, ref.cityId || trip.cityId || '') + (x.alert ? '<div class="pc-lab" style="margin:-2px 0 8px 6px;">Alert · <span class="pc-val">' + escapeHtml(x.alert) + '</span></div>' : '');
      }); });
      html += placeGroupHtml(TRIP_PERIOD_LABEL[p], arr.length, '', __tcards, 'stop'); });
  });
  wrap.innerHTML = html;
}

/* ب-٢-٢-ب (v2-ب · ٧): Most saved داخل القشرة — مبدّل Places (placeFavoriteCounts أعلى ٣٠) / Lists (copyCount من فهرس السوق القائم) · الرتبة بدائرة زعفرانية · Back إلى اللوحة */
let mostSavedTab = 'places';
function mostSavedPick(t){ mostSavedTab = t; openMostSavedStats(); }
async function openMostSavedStats(){
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('📊 Most saved', adminBack); bd.classList.add('show');
  const seg = '<div class="pseg"><button type="button" class="chip' + (mostSavedTab === 'places' ? ' on' : '') + '" onclick="mostSavedPick(\'places\')">Places</button><button type="button" class="chip' + (mostSavedTab === 'lists' ? ' on' : '') + '" onclick="mostSavedPick(\'lists\')">Lists</button></div><div class="ctx" style="text-align:center;">all cities · top 30</div>';
  body.innerHTML = seg + '<div class="mp-empty mini">Loading…</div>';
  try{
    let rowsHtml = '';
    if (mostSavedTab === 'places'){
      const rows = await mpData.placeCounts.top(30); // v1.40: placeFavoriteCounts = عدّاد الحفظ
      rowsHtml = rows.length ? rows.map(function(d, i){ return '<div class="row rowblock"><div class="pn"><span class="stats-rank" style="display:inline-flex; margin-right:8px;">' + (i + 1) + '</span><a href="' + attrStr(d.url || '#') + '" target="_blank" rel="noopener" class="stats-name">' + escapeHtml(d.name || '') + '</a></div><div class="pl-sub">' + (d.count || 0) + ' save' + (d.count === 1 ? '' : 's') + '</div></div>'; }).join('') : '<div class="mp-empty mini">No saves recorded yet</div>';
    } else {
      const rows = (await mpData.cityLists.publicLists()).filter(function(l){ return (l.copyCount || 0) > 0; }).sort(function(a, b){ return (b.copyCount || 0) - (a.copyCount || 0); }).slice(0, 30);
      rowsHtml = rows.length ? rows.map(function(l, i){ return '<div class="row rowblock"><div class="pn"><span class="stats-rank" style="display:inline-flex; margin-right:8px;">' + (i + 1) + '</span>' + escapeHtml(l.cityName || l.cityId || '') + '</div><div class="pl-sub">' + (l.copyCount || 0) + ' cop' + (l.copyCount === 1 ? 'y' : 'ies') + (l.nickname ? ' · by ' + escapeHtml(l.nickname) : '') + '</div></div>'; }).join('') : '<div class="mp-empty mini">No copies recorded yet</div>';
    }
    body.innerHTML = seg + rowsHtml;
  }catch(e){ mpSwallow(e, 'most saved'); body.innerHTML = seg + '<div class="mp-empty mini">Could not load statistics</div><button type="button" class="dash-door" onclick="openMostSavedStats()"><span>↻ Retry</span><span></span></button>'; }
}

// خ١-ب: البوابة (المشهد ١) تسبق نافذة الدخول/التسجيل (المشهد ٢) — النافذة موحَّدة (قرار المالك: الاسم داخلها)، والعنوان بحسب الزر
function openGate(){
  document.getElementById('authGateView').style.display = '';
  document.getElementById('authFormView').style.display = 'none';
  const b = document.getElementById('authBackdrop'); b.classList.add('show'); b.classList.add('gate-mode');
}
function closeGate(){ document.getElementById('authBackdrop').classList.remove('show'); }
function openAuthModal(mode){
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  errEl.className = 'errline'; /* r75c */
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  const signup = mode === 'signup';
  document.getElementById('authTitle').textContent = signup ? '✨ Create your account' : '👤 Welcome back';
  document.getElementById('authSubtitle').textContent = signup ? 'Pick a username, then your email and a password (8+ characters)' : 'Sign in to your account';
  document.getElementById('authNickname').style.display = signup ? '' : 'none';
  document.getElementById('authLoginBtn').style.display = signup ? 'none' : '';
  document.getElementById('authSignupBtn').style.display = signup ? '' : 'none';
  document.getElementById('authGateView').style.display = 'none';
  document.getElementById('authFormView').style.display = '';
  const b = document.getElementById('authBackdrop'); b.classList.add('show'); b.classList.add('gate-mode'); // النموذج بنفس الخلفية المعتمة
  setTimeout(() => document.getElementById(signup ? 'authNickname' : 'authEmail').focus(), 50);
}
function closeAuthModal(force){
  // البوابة إلزامية: إغلاق النموذج بلا دخول يعيد مشهد البوابة — إلا بعد نجاح الدخول/التسجيل (force) حيث الإشعار بالمستخدم يصل بعد لحظة
  if (!currentUser && !force){ openGate(); return; }
  document.getElementById('authBackdrop').classList.remove('show');
}
function openModalById(id){ document.getElementById(id).classList.add('show'); }
// v1.37 (قرار المالك ١ سبتمبر): ما فُتح من الدرج يعود إليه عند الإغلاق — ب-٢-٢-أ٢ (المسودة v3): طبقتان — نوافذ القشرة (dashBackdrop) تستلم Back صريحًا «أغلق وافتح الدرج»؛ النوافذ الأخرى تُرصد فتعيد الدرج حين تُغلق (✕ يرفع علم __mpNoReopen فلا عودة)
function mpOpenThen(openFn, after){ /* يفتح نافذة ويستدعي after حين تُغلق (ما لم تُغلق بـ✕) — أساس العودة للدرج وللإعدادات */
  const before = new Set(Array.from(document.querySelectorAll('.modal-backdrop.show')));
  try{ openFn(); }catch(e){ return null; }
  const opened = Array.from(document.querySelectorAll('.modal-backdrop.show')).find(b => !before.has(b));
  if (!opened || !window.MutationObserver) return opened || null;
  const isDash = opened.id === 'dashBackdrop'; /* نوافذ القشرة: Back صريح (لا عودة بالإغلاق) — المراقب يستهلك علم ✕ فقط */
  if (isDash && !__dashBack && typeof after === 'function'){ const t = document.getElementById('dashTitle'); dashSet(t ? t.textContent : '', function(){ closeModalById('dashBackdrop'); after(); }); }
  __mpWatched.add(opened.id);
  const obs = new MutationObserver(function(){
    if (!opened.classList.contains('show')){ obs.disconnect(); __mpWatched.delete(opened.id); if (window.__mpNoReopen){ window.__mpNoReopen = false; return; } if (!isDash && typeof after === 'function') after(); }
  });
  obs.observe(opened, { attributes: true, attributeFilter: ['class'] });
  return opened;
}
function openFromDrawer(openFn){
  closeAccountModal(); window.__mpFromDrawer = true;
  try{ mpOpenThen(openFn, function(){ if (currentUser) openAccountModal(); }); } finally { window.__mpFromDrawer = false; }
}
function closeModalById(id){ document.getElementById(id).classList.remove('show'); }
const __mpWatched = new Set(); /* ب-٢-٢-أ٢: النوافذ التي يرصدها mpOpenThen الآن — علم «لا عودة» يُرفع لها وحدها فلا يبقى معلَّقًا */
function mpNoReopenFor(id){ if (__mpWatched.has(id)) window.__mpNoReopen = true; }
function mpCloseAll(id){ mpNoReopenFor(id); closeModalById(id); if (id === 'dashBackdrop' && typeof tkPinOrigin !== 'undefined') tkPinOrigin = ''; } /* r90: ✕ ينسى الورقة الأصل لمسار Pin */ /* ب-٢-٢-أ: ✕ بالقشرة الموحَّدة — إغلاق النافذة بلا إعادة فتح الدرج */
let __dashBack = null; /* ب-٢-٢-أ: معالج Back الحالي لنافذة dashBackdrop (null = لا طبقة سابقة فيُخفى الزر) */
function dashSet(title, backFn){ const t = document.getElementById('dashTitle'); if (t) t.textContent = title || ''; __dashBack = (typeof backFn === 'function') ? backFn : null; const b = document.getElementById('dashBackBtn'); if (b) b.classList.toggle('hidden', !__dashBack); }
function dashBack(){ const f = __dashBack; if (f) f(); else closeModalById('dashBackdrop'); }

/* ب-٢-٢-أ٢ (القرار ١ من ٦): الورقة السفلية — بديل confirm()/prompt() المتصفح. mpSheet(o) يعيد وعدًا: 'ok' للفعل الأساسي · 'alt' للبديل الاختياري · 'alt2' لبديل ثانٍ (r75c) · null للإلغاء (زر Cancel أو النقر خارجها أو السحب لأسفل).
   o = { title, text, ok, alt, cancel, danger, input: { value, placeholder } } — مع input يعيد النص المكتوب بدل 'ok'. المحاكي يجيب عبر window.__mpSheetAuto(o) بلا رسم (كما __geoAuto). */
let __sheetResolve = null, __sheetHasInput = false, __sheetTouchY = null;
function mpSheet(o){
  o = o || {};
  if (typeof window.__mpSheetAuto === 'function') return Promise.resolve(window.__mpSheetAuto(o));
  if (__sheetResolve) sheetDone(null);
  const el = function(id){ return document.getElementById(id); };
  el('sheetTitle').textContent = o.title || ''; el('sheetText').textContent = o.text || ''; el('sheetText').style.display = o.text ? '' : 'none';
  const ok = el('sheetOk'); ok.textContent = o.ok || 'OK'; ok.classList.toggle('btn-danger', !!o.danger); ok.classList.toggle('btn-brass', !o.danger);
  const alt = el('sheetAlt'); alt.style.display = o.alt ? '' : 'none'; alt.textContent = o.alt || '·';
  const alt2 = el('sheetAlt2'); if (alt2){ alt2.style.display = o.alt2 ? '' : 'none'; alt2.textContent = o.alt2 || '·'; } /* r75c: 'alt2' */
  el('sheetCancel').textContent = o.cancel || 'Cancel';
  const inp = el('sheetInput'); __sheetHasInput = !!o.input; inp.style.display = o.input ? '' : 'none'; inp.value = (o.input && o.input.value) || ''; inp.placeholder = (o.input && o.input.placeholder) || '';
  const alts = el('sheetAlts'); if (alts) alts.style.display = (o.alt || o.alt2) ? '' : 'none'; /* r75d-٢: البديلان بصف واحد */
  el('sheetCard').style.transform = ''; el('sheetBackdrop').classList.add('show'); sheetBarsHide(true); /* r75d-٢ (ملاحظة المالك ١٢ أكتوبر): الأشرطة السفلية تختفي ما دامت الورقة مفتوحة — الورقة على حافة الشاشة بلا قياس ولا رفع (بديل sheetLift) */
  if (o.input) setTimeout(function(){ try{ inp.focus(); inp.select(); }catch(_){} }, 30);
  return new Promise(function(res){ __sheetResolve = res; });
}
function sheetDone(v){
  const r = __sheetResolve; __sheetResolve = null;
  const out = (v === 'ok' && __sheetHasInput) ? document.getElementById('sheetInput').value : v;
  document.getElementById('sheetBackdrop').classList.remove('show'); sheetBarsHide(false);
  if (r) r(out);
}
function sheetBarsHide(on){ /* r75d-٢ (قرار المالك ١٢ أكتوبر — يغلق ملاحظة ١٠-١٠ جذريًّا): الشريط الخمسي وشريط التوقيت وشريط الرحلة النشطة تُخفى ما دامت ورقة مفتوحة (العتمة تحجبها أصلًا) فتجلس الورقة على حافة الشاشة مع المنطقة الآمنة — لا قياس يتعطل حين يبدّل سفاري ارتفاع نافذته */
  document.body.classList.toggle('sheet-open', !!on);
}
function sheetBackdropTap(ev){ if (ev && ev.target && ev.target.id === 'sheetBackdrop') sheetDone(null); }
function sheetKey(ev){ if (!ev) return; if (ev.key === 'Enter'){ ev.preventDefault(); sheetDone('ok'); } else if (ev.key === 'Escape'){ sheetDone(null); } }
function sheetTouch(ev, phase){ /* السحب لأسفل أكثر من ٧٠ بكسل = إلغاء؛ الورقة تتبع الإصبع */
  const card = document.getElementById('sheetCard'); const t = ev && ev.touches && ev.touches[0];
  if (phase === 'start'){ __sheetTouchY = t ? t.clientY : null; return; }
  if (__sheetTouchY === null) return;
  if (phase === 'move'){ const dy = t ? t.clientY - __sheetTouchY : 0; if (dy > 0){ card.style.transform = 'translateY(' + dy + 'px)'; } return; }
  const m = card.style.transform.match(/translateY\((\d+(?:\.\d+)?)px\)/); const dy = m ? parseFloat(m[1]) : 0; __sheetTouchY = null; card.style.transform = '';
  if (dy > 70) sheetDone(null);
}
function mpConfirm(text, o){ return mpSheet(Object.assign({ title: 'Are you sure?', text: text }, o || {})).then(function(v){ return v === 'ok'; }); } /* بديل confirm() بسطر واحد: يعيد true/false */

// خ١-ب: الوجهة الافتراضية (المشهد ٥) — تُحفظ بمستند المستخدم، والتطبيق يفتح عليها
const HOME_TABS = ['Places','Trips','Community','Curators','Addresses'];
let pendingHome = 'Places';
function openHomeScreen(){ /* ب-٢-٢-أ٢ (المسودة v3 · ٢-ب): الوجهة الافتراضية داخل القشرة — Back = Settings · البطاقات من القالب homeCardsTpl */
  const body = document.getElementById('dashBody'); const tpl = document.getElementById('homeCardsTpl'); if (!body || !tpl) return;
  const cur = (userListData && HOME_TABS.includes(userListData.defaultTab)) ? userListData.defaultTab : 'Places';
  pendingHome = cur; dashSet('🏠 Home screen', openSettings);
  body.innerHTML = '<div class="ctx" style="text-align:center;">MyPickz opens here every time</div>' + tpl.innerHTML + '<div style="display:flex; gap:8px; margin-top:14px;"><button type="button" class="btn btn-ghost" style="flex:1" onclick="openSettings()">Cancel</button><button type="button" class="btn btn-brass" style="flex:1" onclick="saveHome()">Save</button></div>';
  document.querySelectorAll('#homeCards .hcard').forEach(b => b.classList.toggle('on', b.getAttribute('data-home') === cur));
  document.getElementById('dashBackdrop').classList.add('show');
}
function pickHome(btn){
  pendingHome = btn.getAttribute('data-home');
  document.querySelectorAll('#homeCards .hcard').forEach(b => b.classList.toggle('on', b === btn));
}
async function saveHome(){
  closeModalById('dashBackdrop'); /* ب-٢-٢-أ٢: الحفظ يغلق القشرة ويذهب للوجهة */
  if (!currentUser) return;
  userListData.defaultTab = pendingHome;
  try{ await mpData.userLists.merge(currentUser.uid, { defaultTab: pendingHome }); }catch(e){}
  switchTab(pendingHome);
  showToast('Home saved ✓');
}
// النبذة (المشهد ٤): مرة واحدة بالعمر — العلم بمستند المستخدم؛ بعدها اختيار الوجهة إن لم تُختر
async function runOnboardingIfNeeded(){
  if (!currentUser || !userListData) return;
  if (userListLoadFailed) return; /* و-١: الهوية لم تُقرأ — لا دليل ولا كتابة guideSeen على مستند لم نره */
  if (userListData.guideSeen === true){ markIntroSeen(); } /* و-٢: الحقيقة المخزَّنة تعيد العلم المحلي (localStorage + الكعكة) إن ضاع */
  else {
    openHelpModal();
    try{ await mpData.userLists.merge(currentUser.uid, { guideSeen: true }); userListData.guideSeen = true; markIntroSeen(); }catch(e){}
    const hb = document.getElementById('helpBackdrop');
    await new Promise(res => { const t = setInterval(() => { if (!hb.classList.contains('show')){ clearInterval(t); res(); } }, 300); });
  }
  switchTab(defaultTabFor()); // r70r (قرار المالك ١٦ سبتمبر): الأماكن دائمًا؛ الاختيار اليدوي فوقها؛ المدينة = آخر محددة
  if (pendingShareText) consumePendingShare(); // r70q: اختصار iOS — نص المشاركة ينتظر الدخول
}
// r70q (قرار المالك: تقديم اختصار iOS): ?share=<نص> من ورقة المشاركة — يُحفظ حتى يكتمل الدخول ثم يفتح نافذة المكان بوضع اللصق محلَّلًا
let pendingShareText = null;
function captureShareParam(){ try{ const sp = new URLSearchParams(location.search); const t = sp.get('share'); if (t && t.trim()){ pendingShareText = t.trim(); try{ sessionStorage.setItem('mypickz_pending_share', pendingShareText); }catch(e){} history.replaceState(null, '', location.pathname); } else { try{ const k = sessionStorage.getItem('mypickz_pending_share'); if (k) pendingShareText = k; }catch(e){} } }catch(e){} }
async function consumePendingShare(){
  const t = pendingShareText; pendingShareText = null; try{ sessionStorage.removeItem('mypickz_pending_share'); }catch(e){}
  if (!t || !currentUser) return;
  const r = parseMapsShare(t); const c = inferCityFrom(r.parts || []);
  if (c && c.id !== cityListCityId){ plSessionCity = c.id; try{ await selectCityListCity(c.id); }catch(e){} }
  switchTab('Places'); if (!cityListCityId){ showToast('Pick a city first, then paste again'); return; }
  openPlPlaceModal(null, null); plSetMethod(true); document.getElementById('plShareText').value = t; plParseShare();
}
// أ-١٢-١: الوجهة الافتراضية — يدويًّا ما اختاره؛ وإلا: له أماكن → الأماكن على مدينته؛ وإلا → المجتمع
function totalMyPlaces(){ const c = (userListData && userListData.cityPlaceCounts) || {}; return Object.keys(c).reduce(function(a, k){ return a + (Number(c[k]) || 0); }, 0); }
function homePrefLabel(){ return (userListData && HOME_TABS.includes(userListData.defaultTab)) ? userListData.defaultTab : 'Places'; } // r70r
function defaultTabFor(){ if (userListData && HOME_TABS.includes(userListData.defaultTab)) return userListData.defaultTab; return 'Places'; } // r70r: الأماكن دائمًا — لوحة الأبواب الأربعة ترشد الجديد

