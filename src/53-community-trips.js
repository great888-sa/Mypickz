/* ===== عرض رحلات مستخدم آخر (Community Lists → تبويب Trips، Public فقط) — قراءة فقط ===== */
let communityUserTrips = [];
let viewingCommunityTripId = null;

async function loadCommunityUserTrips(uid){
  try{
    const __rows = await mpData.trips.publicByOwner(uid); const snap = { forEach: function(fn){ __rows.forEach(function(r){ fn({ id: r.id, data: function(){ return r; } }); }); }, empty: __rows.length === 0, size: __rows.length };
    communityUserTrips = [];
    snap.forEach(doc => communityUserTrips.push({ id: doc.id, ...doc.data() }));
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

function renderCommunityTripDetail(wrap){
  const trip = communityUserTrips.find(t => t.id === viewingCommunityTripId);
  if (!trip){ viewingCommunityTripId = null; renderCommunityModal(); return; }
  const resolved = resolvedTripCache['community_'+trip.id] || [];
  const title = trip.customLabel ? `${escapeHtml(trip.cityName)} — ${escapeHtml(trip.customLabel)}` : escapeHtml(trip.cityName || '');

  let html = `<button type="button" class="backchip" onclick="backFromCommunityTrip()" style="margin-bottom:8px;"><i class="fa-solid fa-arrow-left"></i> Back</button>
  <h4 style="text-align:center; margin:4px 0 12px; font-family:'Cairo',sans-serif;">${title}</h4>`;

  resolved.forEach(day => {
    html += `<div style="display:flex; align-items:center; gap:10px; margin:20px 0 12px;">
      <span style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; background:var(--ink); color:#fff; font-weight:700; font-size:13px; flex-shrink:0;">${day.dayNumber}</span>
      <span style="font-weight:700; font-size:15px; letter-spacing:.5px;">DAY ${day.dayNumber}</span>
      <span style="flex:1; height:2px; background:linear-gradient(to left, var(--line), transparent);"></span>
    </div>`;
    const order = day.categoryOrder || defaultCategoryOrder();
    const visibleCats = order.filter(catId => (day.places[catId]||[]).length > 0);
    visibleCats.forEach(catId => {
      const meta = categoryMeta(catId); let __tcards = ''; // r72w: المجموعة العاجية + بطاقة الآخرين الموحَّدة
      day.places[catId].forEach(p => {
        if (!p._available){
          __tcards += `<div class="row triprow dim">⚠️ This place is no longer available</div>`;
          return;
        }
        const ref = p._ref || {}; const ouid = ref.sourceUid || viewingUserUid || ''; const sCat = String(ref.subcatId || '');
        __tcards += othersPlaceRowHtml({ id: ref.placeId || p.id || hashUrl(p.url || ''), name: p.name || 'Place', url: p.url, area: p.area, picks: p.picks, note: p.note }, { uid: ouid, nickname: (viewingUserData && viewingUserData.nickname) || 'a user' }, { id: ref.cityId || trip.cityId || '', name: trip.cityName || '' }, sCat, ref.cityId || trip.cityId || '') + (p._ref.tripNote ? '<div class="pc-lab" style="margin:-2px 0 8px 6px;">Trip note · <span class="pc-val">' + escapeHtml(p._ref.tripNote) + '</span></div>' : '');
      });
      html += placeGroupHtml(meta.label, day.places[catId].length, '', __tcards);
    });
  });
  wrap.innerHTML = html;
}

async function openMostSavedStats(){
  const list = document.getElementById('statsList');
  list.innerHTML = `<p style="color:var(--ink-soft); font-size:12px; text-align:center;">Loading...</p>`;
  document.getElementById('statsBackdrop').classList.add('show');
  try{
    // v1.40: هجرة انتهازية — القراءة عبر النواة (placeFavoriteCounts = عدّاد الحفظ)
    const rows = await mpData.placeCounts.top(30);
    if (!rows.length){
      list.innerHTML = `<p style="color:var(--ink-soft); font-size:12px; text-align:center;">No saves recorded yet</p>`;
    } else {
      list.innerHTML = rows.map((d, i) => `
        <div class="stats-row">
          <span class="stats-rank">${i+1}</span>
          <a href="${d.url}" target="_blank" rel="noopener" class="stats-name">${d.name}</a>
          <span class="stats-count">${d.count} saves</span>
        </div>`).join('');
    }
  }catch(e){
    list.innerHTML = `<p style="color:var(--danger); font-size:12px; text-align:center;">Could not load statistics</p>`;
  }
}
function closeStatsModal(){
  document.getElementById('statsBackdrop').classList.remove('show');
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
  errEl.style.color = 'var(--danger)';
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
// v1.37 (قرار المالك ١ سبتمبر): ما فُتح من الدرج يعود إليه عند الإغلاق — ترصد النافذة التي ظهرت وتعيد الدرج حين تُغلق
function openFromDrawer(openFn){
  const before = new Set(Array.from(document.querySelectorAll('.modal-backdrop.show')));
  closeAccountModal();
  try{ openFn(); }catch(e){ return; }
  const opened = Array.from(document.querySelectorAll('.modal-backdrop.show')).find(b => !before.has(b));
  if (opened && opened.id === 'dashBackdrop' && !__dashBack){ const t = document.getElementById('dashTitle'); dashSet(t ? t.textContent : '', function(){ closeModalById('dashBackdrop'); }); } /* ب-٢-٢-أ (ملاحظة المالك): ما فُتح من الدرج مباشرة يحمل Back إليه — الإغلاق بلا علم ✕ يعيد فتح الدرج عبر المراقب أدناه */
  if (!opened || !window.MutationObserver) return;
  const obs = new MutationObserver(function(){
    if (!opened.classList.contains('show')){ obs.disconnect(); if (window.__mpNoReopen){ window.__mpNoReopen = false; return; } if (currentUser) openAccountModal(); } /* ب-٢-٢-أ: ✕ يغلق كل الطبقات بلا عودة للدرج؛ Back وحده يعود إليه */
  });
  obs.observe(opened, { attributes: true, attributeFilter: ['class'] });
}
function closeModalById(id){ document.getElementById(id).classList.remove('show'); }
function mpCloseAll(id){ window.__mpNoReopen = true; closeModalById(id); } /* ب-٢-٢-أ: ✕ بالقشرة الموحَّدة — إغلاق النافذة بلا إعادة فتح الدرج */
let __dashBack = null; /* ب-٢-٢-أ: معالج Back الحالي لنافذة dashBackdrop (null = لا طبقة سابقة فيُخفى الزر) */
function dashSet(title, backFn){ const t = document.getElementById('dashTitle'); if (t) t.textContent = title || ''; __dashBack = (typeof backFn === 'function') ? backFn : null; const b = document.getElementById('dashBackBtn'); if (b) b.classList.toggle('hidden', !__dashBack); }
function dashBack(){ const f = __dashBack; if (f) f(); else closeModalById('dashBackdrop'); }

// خ١-ب: الوجهة الافتراضية (المشهد ٥) — تُحفظ بمستند المستخدم، والتطبيق يفتح عليها
const HOME_TABS = ['Places','Trips','Community','Curators','Addresses'];
let pendingHome = 'Places';
function openHomeChooser(fromPrefs){
  const cur = (userListData && HOME_TABS.includes(userListData.defaultTab)) ? userListData.defaultTab : 'Places';
  pendingHome = cur;
  document.querySelectorAll('#homeCards .hcard').forEach(b => b.classList.toggle('on', b.getAttribute('data-home') === cur));
  document.getElementById('homeBackdrop').classList.add('show');
}
function pickHome(btn){
  pendingHome = btn.getAttribute('data-home');
  document.querySelectorAll('#homeCards .hcard').forEach(b => b.classList.toggle('on', b === btn));
}
async function saveHome(){
  closeModalById('homeBackdrop');
  if (!currentUser) return;
  userListData.defaultTab = pendingHome;
  try{ await mpData.userLists.merge(currentUser.uid, { defaultTab: pendingHome }); }catch(e){}
  const lbl = document.getElementById('prefHomeLabel'); if (lbl) lbl.textContent = homePrefLabel();
  switchTab(pendingHome);
  showToast('Home saved ✓');
}
// النبذة (المشهد ٤): مرة واحدة بالعمر — العلم بمستند المستخدم؛ بعدها اختيار الوجهة إن لم تُختر
async function runOnboardingIfNeeded(){
  if (!currentUser || !userListData) return;
  if (userListData.guideSeen !== true){
    openHelpModal();
    try{ await mpData.userLists.merge(currentUser.uid, { guideSeen: true }); userListData.guideSeen = true; }catch(e){}
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
  if (c && c.id !== myListCityId){ plSessionCity = c.id; try{ await selectMyListCity(c.id); }catch(e){} }
  switchTab('Places'); if (!myListCityId){ showToast('Pick a city first, then paste again'); return; }
  openPlPlaceModal(null, null); plSetMethod(true); document.getElementById('plShareText').value = t; plParseShare();
}
// أ-١٢-١: الوجهة الافتراضية — يدويًّا ما اختاره؛ وإلا: له أماكن → الأماكن على مدينته؛ وإلا → المجتمع
function totalMyPlaces(){ const c = (userListData && userListData.cityPlaceCounts) || {}; return Object.keys(c).reduce(function(a, k){ return a + (Number(c[k]) || 0); }, 0); }
function homePrefLabel(){ return (userListData && HOME_TABS.includes(userListData.defaultTab)) ? userListData.defaultTab : 'Places'; } // r70r
function defaultTabFor(){ if (userListData && HOME_TABS.includes(userListData.defaultTab)) return userListData.defaultTab; return 'Places'; } // r70r: الأماكن دائمًا — لوحة الأبواب الأربعة ترشد الجديد

