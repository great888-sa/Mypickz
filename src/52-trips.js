/* ===== My Trips — القائمة + إنشاء رحلة + تفاصيل رحلة ===== */
async function openMyTripsModal(){
  mpTrack.hit('trip_open', { depth: 1 });
  if (!currentUser){ openAuthModal(); return; }
  showBackdropUnlessHosted('myTripsBackdrop', 'Trips'); // خ١
  if (!tripsLoaded) await loadUserTrips();
  currentTripId = null;
  viewingSharedTrip = false;
  renderMyTripsModal();
}
function closeMyTripsModal(){
  document.getElementById('myTripsBackdrop').classList.remove('show');
  tripRouteFlush(); currentTripId = null; // r78: ما كُتب في المسار يُحفظ قبل المغادرة
  if (HOSTED.Trips && currentTab === 'Trips') renderMyTripsModal(); // خ١: بالوجهة "الإغلاق" = العودة لقائمة الرحلات
}
function attrStr(s){                       // ترميز آمن داخل سمة onclick: escapeHtml يفكّ &#39; فيكسر الشيفرة
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/[\r\n]/g, ' ');
}
let tripStatusFilter = 'all'; // r77 (القرار ١٣): «الكل · قادمة · ماضية» بدل نوع الرحلة
function pickTripStatus(id){ tripStatusFilter = id; document.querySelectorAll('#tripTypeRow .chip').forEach(x => x.classList.toggle('on', x.getAttribute('data-ttype') === id)); const ctx = document.getElementById('tripCtx'); if (ctx) ctx.innerHTML = '<b>My trips</b> · ' + (id === 'upcoming' ? 'Upcoming' : id === 'past' ? 'Past' : 'All'); renderTripsBody(); }
function tripLastDate(t){ let last = null; (tripHasPlan(t) ? t.plan.days : []).forEach(function(d){ if (d.date && (!last || d.date > last)) last = d.date; }); return last; }
function tripFirstDate(t){ let first = null; (tripHasPlan(t) ? t.plan.days : []).forEach(function(d){ if (d.date && (!first || d.date < first)) first = d.date; }); return first; }
function tripTodayYmd(){ return new Date().toISOString().slice(0, 10); }
function tripIsPast(t){ const l = tripLastDate(t); return !!(l && l < tripTodayYmd()); }
function tripBadge(t){ if (t.status !== 'approved') return { cls: 'draft', text: 'draft' }; if (tripIsPast(t)) return { cls: 'done', text: 'done' }; const f = tripFirstDate(t); if (!f) return { cls: '', text: 'no dates' }; const n = tripDateDiff(tripTodayYmd(), f); if (n === null) return { cls: '', text: '' }; if (n < 0) return { cls: 'now', text: 'on the trip' }; if (n === 0) return { cls: 'now', text: 'today' }; return { cls: 'soon', text: 'in ' + n + (n === 1 ? ' day' : ' days') }; }
/* v1.40 · شريحة «Bookmarked trips» (القرار ٠٩): المتصفح يقرأ سجلاتك ثم يستفتي الأصل الحي —
   المتدهور («لم تعد متاحة») وحده يحمل ✕ · «Saved ✓» يُفَك بضغطه + «تراجع» */
let tripsSource = 'mine';
let tripCityFilter = '';             // ر٦٦ (القرار ١١ · البند ٣): المحدد بالرحلات — مدنه من رحلاتك
const TRIP_SOURCES = [['mine', 'My trips'], ['saved', 'My bookmarked'], ['savedCur', 'Saved from Curators'], ['savedCom', 'Saved from Community'], ['shared', 'Shared with me']]; // r72r-1
let tripShowOpen = false;
function tripSourceCounts(){ // r72w: عدد الرحلات لكل مصدر
  const mine = (userTrips || []).filter(function(t){ return !t.source; }).length; const saved = Object.keys(tripSavesMap || {}).length;
  const curSet = {}; (curators || []).forEach(function(c){ curSet[c.uid] = true; }); const cur = (userTrips || []).filter(function(t){ return t.source && curSet[t.source.ownerId]; }).length; const com = (userTrips || []).filter(function(t){ return t.source && !curSet[t.source.ownerId]; }).length; // كمعيار renderSavedOthersTrips
  return { mine: mine, saved: saved, savedCur: cur, savedCom: com, shared: (sharedTrips || []).length }; }
function tripToggleShowPanel(){ tripShowOpen = !tripShowOpen; tripSetSrcTitle(); const el = document.getElementById('tripShowPanel'); if (!el) return; const cnt = tripSourceCounts(); el.innerHTML = tripShowOpen ? pickerPanel({ id: 'tripShow', bare: true, onPick: 'tripPickSource', items: TRIP_SOURCES.map(function(x){ return { id: x[0], name: x[1], count: cnt[x[0]], selected: tripsSource === x[0] }; }) }) : ''; }
function tripPickSource(id){ tripShowOpen = false; const el = document.getElementById('tripShowPanel'); if (el) el.innerHTML = ''; selectTripsSource(id); }
function tripSourceLabel(){ return (TRIP_SOURCES.find(function(x){ return x[0] === tripsSource; }) || TRIP_SOURCES[0])[1]; }
let tripLastCount = null;
function tripSetSrcTitle(n){ if (typeof n === 'number') tripLastCount = n; else n = tripLastCount; const t = document.getElementById('tripSrcTitle'); if (t) t.innerHTML = '<b>' + escapeHtml(tripSourceLabel()) + '</b>' + (typeof n === 'number' ? ' <span class="dim">· ' + n + '</span>' : '') + ' ' + (tripShowOpen ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>'); } // r72v
function selectTripsSource(src){
  tripsSource = src; tripSetSrcTitle();
  const ctx = document.getElementById('tripCtx');
  if (ctx) ctx.innerHTML = '<b>' + escapeHtml(tripSourceLabel()) + '</b>' + ((src === 'savedCur') ? ' · trips by curators' : (src === 'savedCom') ? ' · trips by other members' : (src === 'shared') ? ' · shared with you by name' : ' · All');
  const typeRow = document.getElementById('tripTypeRow');
  if (typeRow) typeRow.style.display = (src === 'mine') ? '' : 'none';
  renderTripsBody();
}
let tripCityPanelOpen = false; // ر٧٠ج (N-011): محدد مدينة الرحلات لوحة اختيار مشتركة لا منسدلة أصلية
function pickTripCity(v){ tripCityFilter = v || ''; tripCityPanelOpen = false; renderTripsBody(); }
function tripToggleCityPanel(open){ tripCityPanelOpen = (typeof open === 'boolean') ? open : !tripCityPanelOpen; refreshTripCityPick(); }
function refreshTripCityPick(){ // المحدد يُملأ من رحلاتك فقط (لا مدن فارغة) — بعدّاد رحلات كل مدينة
  const btn = document.getElementById('tripCityPick'), host = document.getElementById('tripCityPanel'); if (!btn || !host) return;
  const seen = {}, cnt = {}; (userTrips || []).forEach(function(t){ if (!t.cityId) return; if (!seen[t.cityId]) seen[t.cityId] = t.cityName || t.cityId; cnt[t.cityId] = (cnt[t.cityId] || 0) + 1; });
  const cur = tripCityFilter && seen[tripCityFilter] ? seen[tripCityFilter] : 'All trips'; // ر٧٠و (N-077)
  btn.innerHTML = '<b>' + escapeHtml(cur) + '</b> ' + (tripCityPanelOpen ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>');
  host.innerHTML = tripCityPanelOpen
    ? pickerPanel({ id: 'tripCity', title: 'Filter by city', filterPlaceholder: 'Type a city…', onPick: 'pickTripCity', onClose: 'tripToggleCityPanel(false)',
        items: [{ id: '', name: 'All trips', count: (userTrips || []).length, selected: !tripCityFilter }]
          .concat(Object.keys(seen).map(function(id){ return { id: id, name: seen[id], count: cnt[id], selected: tripCityFilter === id }; })) })
    : '';
}
function renderTripsBody(){
  refreshTripCityPick();
  if (tripsSource === 'saved'){ renderSavedTrips(); return; }
  if (tripsSource === 'savedCur' || tripsSource === 'savedCom'){ renderSavedOthersTrips(tripsSource === 'savedCur'); return; } // ر٧٢-أ-٢: رحلات الآخرين المحفوظة بمصدرها
  if (tripsSource === 'shared'){ const w = document.getElementById('myTripsBody'); if (w){ w.innerHTML = '<div class="mp-empty mini">Loading…</div>'; renderSharedTripsInto(w).then(function(){ tripSetSrcTitle(sharedTrips.length); }); } return; } // r72r-1
  renderMyTripsModal();
}
async function renderSavedTrips(){ // ر٦٤ (النموذج المستقر): شريحة المفكرة بوجهة الرحلات = رحلاتك التي ميّزتها أنت؛ مؤشراتك على رحلات الآخرين تسكن السوق
  const wrap = document.getElementById('myTripsBody'); if (!wrap) return;
  if (!currentUser){ wrap.innerHTML = '<div class="mp-empty">Sign in to see your bookmarked trips.</div>'; return; }
  const mine = (userTrips || []).filter(t => isSelfTripBookmarked(t.id));
  if (!mine.length){ wrap.innerHTML = '<div class="mp-empty">🔖<br>Trips you bookmarked appear here — tap the bookmark on any of your trips.<br><span class="dim">Bookmarks on other people\'s trips live in Community → Trips → 🔖 Bookmarked.</span></div>'; return; }
  wrap.innerHTML = mine.map(function(t){
    return '<div class="row rowblock"><div class="pn" dir="auto">' + escapeHtml(tripTitle(t)) + '</div>'
      + '<div class="ps">' + tripMetaLine(t) + '</div>'
      + '<div class="rowacts"><button type="button" class="act" onclick="openTripDetail(\'' + t.id + '\')">View trip →</button>'
      + '<button type="button" class="bmk-btn on" onclick="toggleTripSelfBookmark(\'' + t.id + '\')" title="Bookmarked — tap to remove">' + bmkSvg(true) + '</button>'
      + '<button type="button" class="act" onclick="openExportPreview(\'trip\', \'' + t.id + '\')" title="Preview and send">📤</button>'
      + '<button type="button" class="act' + (t.public ? ' on' : '') + '" onclick="toggleTripPublicFor(\'' + t.id + '\')" title="' + (t.public ? 'Public — tap to make private' : 'Private — tap to make public') + '">' + '🌐' + '</button>'
      + '<button type="button" class="act' + (((t.sharedWith || []).length) ? ' on' : '') + '" onclick="shareTripFor(\'' + t.id + '\')" title="Share with someone by name">' + shareSvg() + '</button></div></div>'; // ر٦٩ش (N-061): صف ملكك ناقص التعديل
  }).join('');
}
let tripSourceFilter = null; // ر٧٢-أ-٢د: مرشِّح مصدر رحلاتي المنسوخة (منتقٍ / مجتمع)
function tripSourceName(t){ const id = t.source && t.source.ownerId; const hit = ((curators || []).find(function(c){ return c.uid === id; }) || (communityUsers || []).find(function(c){ return c.uid === id; })); if (hit && hit.nickname) return hit.nickname; const sn = t.source && t.source.ownerName; return (sn && sn !== 'a member') ? sn : 'a member'; } // ر٧٢-أ-٢و · r72u: اسم الحساب أولًا
async function openReport(kind, docKey){ // r72p (٤): البلاغ — سبب قصير ← reports (لا على محتواي) · r72t (M4.26 ٦): notes · app
  if (!currentUser){ openAuthModal(); return; }
  const reason = await openInputModal(kind === 'app' ? 'Report a problem' : 'Report this ' + kind, kind === 'app' ? 'What went wrong? (≤ 200)' : 'What is wrong? (optional, ≤ 200)', '', null, { allowFree: true }); if (reason === null) return;
  if (kind === 'app' && !String(reason || '').trim()){ showToast('Please describe the problem'); return; }
  try{ await mpData.reports.create(currentUser.uid, kind, kind === 'app' ? '' : String(docKey).slice(0, 120), String(reason || '').slice(0, 200)); }catch(e){ mpSwallow(e, 'report'); showToast('Could not report · ' + ((e && e.code) || 'error')); return; }
  showToast(kind === 'app' ? 'Thanks — we will look into it' : 'Thanks — reported');
}
async function removeMyTripCopy(srcTripId){ // r72n (٢): Saved ✓ ← تأكيد ← حذف نسختي (العدّاد على المصدر لا ينقص — بالعقد)
  const c = tripCopyOf(srcTripId); if (!c) return;
  const ok = await openConfirmModal('Remove your copy from My trips?', 'The original stays with its owner. Your edits on the copy are lost.'); if (!ok) return;
  try{ await mpData.trips.remove(c.id); }catch(e){ mpSwallow(e, 'remove copy'); showToast('Could not remove · ' + ((e && e.code) || 'error')); return; }
  try{ await mpData.copies.unrecord(currentUser.uid, srcTripId, 'trips'); }catch(e){ mpSwallow(e, 'unrecord'); showToast('Copy removed — counter not updated · ' + ((e && e.code) || 'error')); } // r72t · r72w: الفشل يُرى
  userTrips = userTrips.filter(function(t){ return t.id !== c.id; }); showToast('Copy removed');
  if (HOSTED.Community && currentTab === 'Community') renderCommunityModal(); if (currentTab === 'Trips') renderTripsBody();
}
function tripCopyOf(tripId){ return (userTrips || []).find(function(t){ return t.source && t.source.tripId === tripId; }) || null; } // نسختي من رحلة الآخرين إن وُجدت
async function copyOthersTrip(tripId){ // ر٧٢-أ-٢د (ق٠٩-١٥-٠٥): Save = نسخة بإسناد إلى رحلاتي — لا نسخ للعدّادات ولا للمشاركة
  if (!currentUser){ openAuthModal(); return; } if (tripCopyOf(tripId)){ showToast('Already in your trips'); return; }
  let src = null; try{ const d = await mpData.trips.getDoc(tripId); if (d && d.exists) src = Object.assign({ id: d.id }, d.data()); }catch(e){ mpSwallow(e, 'trip copy read'); }
  if (!src){ showToast('Could not read this trip'); return; }
  let ownerName = (viewingUserData && viewingUserData.uid === src.ownerId && viewingUserData.nickname) || ((curators || []).find(function(c){ return c.uid === src.ownerId; }) || {}).nickname || ((communityUsers || []).find(function(c){ return c.uid === src.ownerId; }) || {}).nickname || '';
  if (!ownerName && src.ownerId){ try{ const pr = await mpData.profiles.get(src.ownerId); ownerName = (pr && pr.nickname) || ''; }catch(e){} } // ر٧٢-أ-٢و · r72u: اسم الحساب فقط (لا displayName القديم ولا الشعار)
  ownerName = ownerName || 'a member';
  if (!tripHasPlan(src)){ showToast('This trip uses the old format and cannot be saved'); return; }
  const copy = { id: 'trip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), title: src.title || '', cityId: src.cityId || null, cityName: src.cityName || '', cities: JSON.parse(JSON.stringify(src.cities || [])), customLabel: src.customLabel || '', public: false, sharedWith: [], sharedWithNames: {},
    plan: tripPlanNormalize(JSON.parse(JSON.stringify(src.plan))), version: src.version || 'balanced', status: 'approved', source: { tripId: src.id, ownerId: src.ownerId, ownerName: ownerName, at: Date.now() } }; // r77: النسخة تحمل الخطة والمدن
  userTrips.push(copy); try{ await saveTrip(copy); }catch(e){ userTrips = userTrips.filter(function(t){ return t.id !== copy.id; }); mpSwallow(e, 'trip copy'); showToast('Could not save · ' + ((e && e.code) || 'error')); return; }
  try{ await mpData.copies.record(currentUser.uid, 'trip', src.id, 'trips'); }catch(e){ mpSwallow(e, 'copy record'); showToast('Could not record · ' + ((e && e.code) || 'error')); } try{ if (src.ownerId && mpIsVerified(src.ownerId)) mpTrack.statsCurator(src.ownerId, 'save'); }catch(_){} /* ب-٢-١: save اليومي للمنتقي (v3.14) */ // r72m (M4.25 ٤) · r72p (١١): الرمز على الشاشة: سجل النسخ + copyCount على المصدر بدفعة واحدة (existsAfter)
  showToast('Saved to my trips ✓ — from ' + ownerName); if (HOSTED.Community && currentTab === 'Community') renderCommunityModal();
}
async function renderSavedOthersTrips(fromCurators){ // ر٧٢-أ-٢د: رحلاتي المنسوخة بإسناد، مصفّاة بمصدرها (منتقٍ / مجتمع)
  if (curators === null){ try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = []; } }
  const curSet = {}; (curators || []).forEach(function(c){ curSet[c.uid] = true; });
  tripSourceFilter = function(t){ return !!(t.source && t.source.ownerId) && (fromCurators ? !!curSet[t.source.ownerId] : !curSet[t.source.ownerId]); };
  try{ renderMyTripsModal(); } finally { tripSourceFilter = null; }
}
async function renderBookmarkedTripsInto(wrap){ // ر٦١: القالب المشترك — وجهة الرحلات وشريحة السوق
  if (!currentUser){ wrap.innerHTML = '<div class="mp-empty">Sign in to see your bookmarked trips.</div>'; return; }
  wrap.innerHTML = '<div class="mp-empty mini">Loading…</div>';
  await ensureTripSaves();
  const recs = Object.keys(tripSavesMap || {}).map(k => tripSavesMap[k]);
  if (!recs.length){
    wrap.innerHTML = '<div class="mp-empty">🔖<br>Trips you save from curators and community appear here — your own trips live in My trips.</div>';
    return;
  }
  // استفتاء الأصل الحي: المحفوظة مؤشر — تتدهور عند الغياب أو الإخفاء أو إيقاف صاحبها
  const live = {};
  await Promise.all(recs.map(async r => {
    try{
      const d = await mpData.trips.getDoc(r.tripId); // ر٥٦: هجرة — الإبرة أمسكت النداء المباشر قبل تثبيت القائمة
      live[r.tripId] = (d.exists && (d.data().public === true || (Array.isArray(d.data().sharedWith) && currentUser && d.data().sharedWith.includes(currentUser.uid)))) ? Object.assign({ id: d.id }, d.data()) : null; // ر٦٩ل (N-045)
    }catch(e){ live[r.tripId] = null; }
  }));
  let html = '';
  recs.forEach(r => {
    const t = live[r.tripId];
    if (t){
      const title = t.customLabel ? (t.cityName + ' — ' + t.customLabel) : (t.cityName || 'Trip');
      html += othersCard({ title: escapeHtml(title), sub: tripMetaLine(t), bmOn: true, cnt: t.saveCount || 0, bmHandler: "toggleTripSave('" + attrStr(r.tripId) + "')", saveHandler: "copyOthersTrip('" + attrStr(r.tripId) + "')", savedOn: !!tripCopyOf(r.tripId), unsaveHandler: "removeMyTripCopy('" + attrStr(r.tripId) + "')", reportKind: 'trip', reportKey: r.tripId, exportHandler: "exportOtherTrip('" + attrStr(r.tripId) + "')", openHandler: "openSavedTripInCommunity('" + attrStr(t.ownerId || '') + "', '" + attrStr(r.tripId) + "')" });
    } else {
      // الصف المتدهور — وحده يحمل ✕ (جولة ٢)
      html += '<div class="row rowblock" style="opacity:.55;"><div class="pn" dir="auto">Bookmarked trip</div>'
        + '<div class="ps">No longer available — hidden by its owner, or the account was suspended</div>'
        + '<div class="rowacts"><span class="act" onclick="removeDegradedTripSave(\'' + r.tripId + '\')">✕ Remove</span></div></div>';
    }
  });
  wrap.innerHTML = html;
}
// فتح المحفوظة على عرضها المجتمعي (طبقة صاحبها)
function openSavedTripInCommunity(ownerUid, tripId){
  if (!ownerUid){ showToast('Could not open this trip'); return; }
  switchTab('Community');
  openCommunityUserByUid(ownerUid).then(function(){ openCommunityTrip(tripId); }).catch(function(){ showToast('Could not open this trip'); });
}
// إزالة سجل رحلة متدهورة: نحاول الدفعة المربوطة أولًا، وعند رفضها (الأصل غائب) نحذف السجل وحده
async function removeDegradedTripSave(tripId){
  const r = tripSavesMap && tripSavesMap[tripId]; if (!r) return;
  delete tripSavesMap[tripId];
  renderTripsBody();
  try{
    await mpData.tripSaves.toggle(currentUser.uid, tripId, false);
  }catch(e){
    try{ await mpData.tripSaves.removeRecord(currentUser.uid, tripId); }catch(_){ }
  }
}
function renderMyTripsModal(){
  const wrap = document.getElementById('myTripsBody');
  const sc = document.getElementById('screenTrips'); if (sc) sc.classList.toggle('trip-open', !!currentTripId); // r77: رأس القائمة الثابت يختفي ما دامت رحلة مفتوحة
  if (currentTripId){ renderTripDetail(wrap); return; }
  let html = '';
  const mineOnly = userTrips.filter(t => !t.source); // ر٧٢-أ-٢هـ: «My trips» لما أنشأته أنا
  try{ if (tripsSource === 'mine') tripSetSrcTitle(mineOnly.filter(function(t){ return !tripIsOld(t); }).length); else if (tripSourceFilter) tripSetSrcTitle(userTrips.filter(tripSourceFilter).length); }catch(_){}
  const byStatus0 = (tripStatusFilter === 'all') ? mineOnly : mineOnly.filter(function(t){ return tripIsOld(t) ? false : (tripStatusFilter === 'past' ? tripIsPast(t) : !tripIsPast(t)); }); const byType = tripSourceFilter ? userTrips.filter(tripSourceFilter) : byStatus0;
  const shownTrips = tripCityFilter ? byType.filter(t => tripHasCity(t, tripCityFilter)) : byType; // ر٦٦ · r77: الرحلة متعددة المدن تظهر تحت كل مدينة من مدنها (الاختيار ١٦)
  if (tripSourceFilter && !shownTrips.length){
    html += '<div class="mp-empty">🔖<br>' + (tripsSource === 'savedCur' ? 'Trips you save from curators appear here.' : 'Trips you save from other members appear here.') + '</div>';
  } else if (!mineOnly.filter(function(t){ return !tripIsOld(t); }).length && !tripSourceFilter){
    html += tripsEmptyGuideHtml();
    mineOnly.filter(tripIsOld).forEach(function(t){ html += tripOldRowHtml(t); });
  } else if (!shownTrips.length){
    html += '<div class="mp-empty mini">No ' + (tripStatusFilter === 'past' ? 'past' : tripStatusFilter === 'upcoming' ? 'upcoming' : '') + ' trips here — All shows everything.</div>';
  } else {
    const groups = {}; const order = []; const single = function(t){ return (t.cities || []).length <= 1; };
    shownTrips.forEach(function(t){ const k = tripIsOld(t) ? 'Old format' : (single(t) ? ((t.cities[0] && t.cities[0].cityName) || t.cityName || 'Trips') : 'Several cities'); if (!groups[k]){ groups[k] = []; order.push(k); } groups[k].push(t); });
    order.forEach(function(k){ const cards = groups[k].map(function(t){ return tripIsOld(t) ? tripOldRowHtml(t) : tripCardHtml(t); }).join(''); html += placeGroupHtml(k, groups[k].length, '', cards, 'trip'); });
  }
  if (currentUserSuspended){
    html += '<div class="warnline">🚫 <span><b>Account Suspended</b><br>Your account has been suspended and can no longer create trips or add places.</span></div>';
  }
  wrap.innerHTML = html;
}
function tripOldRowHtml(t){ return '<div class="pcard open trip-old"><div class="pc-data"><div class="pc-name" dir="auto">' + escapeHtml(t.cityName || 'Trip') + (t.customLabel ? ' — ' + escapeHtml(t.customLabel) : '') + '</div><div class="pc-lab">Old format</div><div class="pc-val pc-area">Made before the trip builder — it can only be deleted</div></div><div class="pc-acts"><div class="pc-grid"><button type="button" class="pc-a flag" onclick="deleteTripById(\'' + attrStr(t.id) + '\')" title="Delete">🗑 Delete</button></div></div></div>'; } // القرار ١٤ · الاختيار ١٢: حارس التنسيق القديم
function tripCardHtml(t){ // r77 (اللوحة ٧): بطاقة الرحلة — الشارة · التواريخ · رقاقات المدن بأيامها · الأماكن · الصينية
  const b = tripBadge(t); const f = tripFirstDate(t), l = tripLastDate(t); const nd = tripDayCount(t), np = tripPlaceCount(t), nc = (t.cities || []).length;
  const acts = t.status === 'draft' ? [
      { html: 'Continue →', on: "openTripBuilder({ tripId: '" + attrStr(t.id) + "', stage: 2 })", title: 'Continue the draft' },
      { cls: 'flag', html: '🗑', on: "deleteTripById('" + attrStr(t.id) + "')", title: 'Delete this draft' }
    ] : [
      { html: 'Open →', on: "openTripDetail('" + attrStr(t.id) + "')", title: 'View trip' },
      { cls: 'bmk' + (isSelfTripBookmarked(t.id) ? ' on' : ''), html: bmkSvg(isSelfTripBookmarked(t.id)), on: "toggleTripSelfBookmark('" + attrStr(t.id) + "')", title: isSelfTripBookmarked(t.id) ? 'Bookmarked — tap to remove' : 'Bookmark' },
      { html: '📤', on: "openExportPreview('trip', '" + attrStr(t.id) + "')", title: 'Preview and send' },
      { cls: (t.public ? 'on' : ''), html: '🌐', on: "toggleTripPublicFor('" + attrStr(t.id) + "')", title: t.public ? 'Public — tap to make private' : 'Private — tap to make public' },
      { cls: (((t.sharedWith || []).length) ? 'on' : ''), html: shareSvg(), on: "shareTripFor('" + attrStr(t.id) + "')", title: ((t.sharedWith || []).length) ? 'Shared with ' + t.sharedWith.length + ' — tap to manage' : 'Share with someone by name' },
      { html: '✏️', on: "openTripBuilder({ tripId: '" + attrStr(t.id) + "', stage: 2 })", title: 'Reopen the draft — move places, change the version' }
    ];
  const btn = function(a){ return '<button type="button" class="pc-a' + (a.cls ? ' ' + a.cls : '') + '" onclick="' + a.on + '" title="' + attrStr(a.title || '') + '">' + a.html + '</button>'; };
  const chips = (t.cities || []).map(function(c){ return '<span class="pc-chip">' + escapeHtml(c.cityName || c.cityId) + ' · ' + (c.days || 1) + (c.days === 1 ? ' day' : ' days') + '</span>'; }).join('') + '<span class="pc-chip">' + np + (np === 1 ? ' place' : ' places') + '</span>' + ((t.plan && t.plan.tray && t.plan.tray.length) ? '<span class="pc-chip warn">No day yet · ' + t.plan.tray.length + '</span>' : '') + tripRouteChipHtml(t); // r78 (البيان ٦-٤)
  return '<div class="pcard open"><div class="pc-data"><div class="pc-head"><div class="pc-name" dir="auto">' + escapeHtml(tripTitle(t)) + '</div>' + (b.text ? '<span class="trip-badge ' + b.cls + '">' + escapeHtml(b.text) + '</span>' : '') + '</div>'
    + '<div class="pc-area">' + (f ? escapeHtml(tripDateLabel(f)) + (l && l !== f ? ' → ' + escapeHtml(tripDateLabel(l)) : '') + ' · ' : 'No dates yet · ') + nd + (nd === 1 ? ' day' : ' days') + ' · ' + nc + (nc === 1 ? ' city' : ' cities') + '</div>'
    + '<div class="pc-fromrow trip-chips">' + chips + '</div>'
    + (t.public ? '<div class="pc-lab">Saved by users</div><div class="pc-val pc-area">· ' + (t.copyCount || 0) + ((t.copyCount || 0) === 1 ? ' save' : ' saves') + '</div>' : '')
    + (t.source ? '<div class="pc-lab">From</div><div class="pc-val pc-area" dir="auto">' + escapeHtml(tripSourceName(t)) + '</div>' : '')
    + '</div><div class="pc-acts"><div class="pc-grid">' + acts.map(btn).join('') + '</div></div></div>';
}
async function deleteTripById(id){ if (!(await mpConfirm('This cannot be undone.', { title: '🗑 Delete this trip?', ok: 'Delete trip', danger: true }))) return; try{ await mpData.trips.remove(id); }catch(e){} userTrips = userTrips.filter(t => t.id !== id); delete resolvedTripCache[id]; if (currentTripId === id) currentTripId = null; if (activeTripId === id){ activeTripId = null; updateActiveTripBanner(); } renderTripsBody(); showToast('Trip deleted'); }
// ر٦٩هـ: ضابطا الرحلة من بطاقتها (المبدأ: الأفعال على الصف)
async function toggleTripPublicFor(id){ currentTripId = id; await toggleTripPublic(); currentTripId = null; tripViewMode = true; renderMyTripsModal(); } // ر٦٩و (N-030): تبديل الحالة بلا فتح العرض

// ═══ ر٦٩ي (N-042): باني بطاقة محتوى الآخرين — صف الأفعال نفسه بالوجهتين ناقص التعديل والمشاركتين وزائد Save ═══
// ═══ r72q-2 (قرار المالك ٢٢ سبتمبر): بطاقة المكان الموحَّدة — مكوّن واحد لأربعة أوضاع (mine · others · bookmark · trip)
// الإطار: عاجي خارجي (رأس القسم يرسمه المستدعي) · كريمي داخلي مقسوم: بيانات يسارًا (الاسم ثم Area · Picks · Note للمكتوب فقط) · Actions يمينًا (شبكة عمودين تلتف على الموجود)
// More/Less: المطوي = الاسم · Area · أول فعلين (Maps · 🔖)؛ الحالة تُذكر بالجلسة لكل بطاقة؛ تُفتح تلقائيًّا حيث مقترح منتقٍ (open:true)
const plCardOpen = {}; // key → true (ذاكرة الجلسة)
function placeGroupHtml(title, count, right, inner, unit){ unit = unit || 'place'; return '<div class="pgroup"><div class="pg-head"><span class="pg-title">' + escapeHtml(title) + (count !== null && count !== undefined ? ' <span class="pg-n">· ' + count + ' ' + (count === 1 ? unit : unit + (unit === 'address' ? 'es' : 's')) + '</span>' : '') + '</span>' + (right || '') + '</div>' + inner + '</div>'; } // r72r-1 · r75a (اللوحة ١): رأس التصنيف الفرعي سطرٌ على الليل لا صندوقًا عاجيًّا — العدّ بكلمة places؛ البطاقة وحدها عاجية
function plCardToggle(btn, key){ const card = btn.closest('.pcard'); if (!card) return; const open = !card.classList.contains('open'); card.classList.toggle('open', open); plCardOpen[key] = open; btn.innerHTML = open ? 'Less <span class="arr">⌃</span>' : 'More <span class="arr">⌄</span>'; } /* ب-٢-٢-أ٢ (ملاحظة المالك ١٠-١٠): كان textContent فظهر الوسم نصًّا */
function placeCardHtml(p, mode, ctx){ /* r75a (اللوحات ١–٣): ثلاث درجات خط — الاسم وحده كبير · الحي سطرًا بدبوس · الملاحظة بشريط اقتباس خلف More · شريحة الحالة بلا فعل · صف الأفعال خارج الطيّ بأيقونات خطّية بأسمائها (pc-tile) — لا زر تثبيت بالبطاقة */
  ctx = ctx || {}; const key = mode + ':' + (p.id || hashUrl(p.url || '') || p.name); const open = ctx.open === true || plCardOpen[key] === true;
  const acts = (ctx.actions || []).filter(Boolean); // [{cls, icon, label, html, on, title, href}] — بترتيب ثابت للوضع
  const inner = function(a){ return a.label ? '<span class="pc-ico">' + (a.icon ? mpIcon(a.icon, { fill: !!a.fill }) : (a.html || '')) + '</span><span class="pc-lbl">' + escapeHtml(a.label) + '</span>' + (a.dot ? '<span class="pc-dot" aria-hidden="true"></span>' : '') : a.html; }; /* r75a-٢: نقطة الحالة على البلاطة (On map حين يلزم تثبيت) */
  const btn = function(a){ const cls = (a.label ? 'pc-tile' : 'pc-a') + (a.cls ? ' ' + a.cls : ''); if (a.href) return '<a class="' + cls + '" ' + (a.attrs || '') + ' href="' + attrStr(a.href) + '" target="_blank" rel="noopener" title="' + attrStr(a.title || '') + '">' + inner(a) + '</a>'; return '<button type="button" class="' + cls + '"' + (a.disabled ? ' disabled' : '') + ' onclick="' + (a.on || '') + '" title="' + attrStr(a.title || '') + '">' + inner(a) + '</button>'; };
  const picks = (p.picks || []).map(function(x){ return x && x.name ? String(x.name) : (typeof x === 'string' ? x : ''); }).filter(Boolean).join(' · ');
  const hasMore = !!(picks || p.note || (ctx.extraLines || '') || (mode === 'mine' && p.fromCat));
  return '<div class="pcard' + (open ? ' open' : '') + '" data-key="' + attrStr(key) + '"><div class="pc-data">'
    + '<div class="pc-head"><div class="pc-name" dir="auto">' + escapeHtml(p.name || ctx.fallbackName || 'Place') + '</div>' + (ctx.status || '') + '</div>' + flagsHtml(p.flags)
    + (p.area ? '<div class="pc-area" dir="auto">' + mpIcon('pin', { size: 13 }) + escapeHtml(p.area) + '</div>' : '')
    + (p.phone ? '<div class="pc-phone" dir="ltr">' + mpIcon('phone', { size: 13 }) + escapeHtml(p.phone) + '</div>' : '') /* r75a-٢: الهاتف سطرًا بسماعة (العناوين) لا بسطر الحي */
    + ((p.source && p.source.ownerId) ? '<div class="pc-fromrow"><span class="pc-chip pc-from" dir="auto">From ' + escapeHtml(plOwnerName(p.source.ownerId, p.source.ownerName)) + '</span></div>' : '') // ز-١-ب · r74m-٢ · r75a: الإسناد شريحة صغيرة تحت الحي — ظاهرة دائمًا
    + (picks ? '<div class="pc-lab pc-more">Picks</div><div class="pc-val pc-more" dir="auto">' + escapeHtml(picks) + '</div>' : '')
    + (p.note ? '<div class="pc-note pc-more" dir="auto">' + escapeHtml(p.note) + '</div>' : '')
    + ((mode === 'mine' && p.fromCat) ? '<div class="pc-more"><div class="pc-lab">Old category</div><div class="pc-val" dir="auto">' + escapeHtml(p.fromCat) + '</div></div>' : '') // ز-١-ج-٣: أصل المكان الموطَّن — لصاحبه
    + (ctx.extraLines ? '<div class="pc-more">' + ctx.extraLines + '</div>' : '')
    + (hasMore ? '<button type="button" class="pc-toggle" onclick="plCardToggle(this, \'' + attrStr(key) + '\')">' + (open ? 'Less <span class="arr">⌃</span>' : 'More <span class="arr">⌄</span>') + '</button>' : '')
    + '</div>' + (acts.length ? '<div class="pc-acts"><div class="pc-grid">' + acts.map(btn).join('') + '</div></div>' : '') + '</div>';
}
function othersPlaceRowHtml(p, owner, cityObj, catId, tripCityId, extra){ // ر٧٢-أ-١د · r72q-2: صف مكان الآخرين — يمرّ بالمكوّن الموحَّد (وضع others)
  const safeUrl = String(p.url || '').replace(/'/g, "\\'"), safeName = String(p.name || '').replace(/'/g, "\\'");
  const safeCity = (cityObj ? cityObj.name : '').replace(/'/g, "\\'"), safeArea = (p.area || '').replace(/'/g, "\\'");
  const okey = 'oid:' + owner.uid + ':' + (cityObj ? cityObj.id : '') + ':' + (p.id || hashUrl(p.url || ''));
  const cat = (catId || '').replace(/'/g, "\\'"); const mine = !!(currentUser && owner.uid === currentUser.uid);
  const actions = [ /* r75a: البلاطات بأيقونات الطقم وأسمائها (وضع others) */
    p.url ? { icon: 'maps', label: 'Google Maps', href: p.url, title: 'Open in Google Maps', attrs: 'data-mpsrc="community" data-mpcat="' + attrStr(catId || '') + '"' } : { icon: 'maps', label: 'Google Maps', disabled: true, title: 'No Maps link for this place' },
    (p.geo && typeof p.geo.lat === 'number' && cityObj) ? { cls: 'onmap', icon: 'map', label: 'On map', on: "cmOpenPersonCityMap('" + attrStr(cityObj.id) + "', '" + attrStr(p.id || p.url) + "')", title: 'Show on our map' } : { cls: 'onmap', icon: 'map', label: 'On map', disabled: true, title: 'No pin for this place yet' }, // ز-١-ب · r75a-٢: خريطتنا بلاطةً ثانية بالصف (قرار المالك) — لا «Map» بآخره
    { cls: 'bmk' + (isBookmarked(okey) ? ' on' : ''), icon: 'bookmark', fill: isBookmarked(okey), label: 'Bookmark', on: "togglePlaceBookmark('" + okey + "', '" + safeName + "', '" + cat + "', '" + (cityObj ? cityObj.id : '').replace(/'/g, "\\'") + "', '" + safeArea + "', '" + owner.uid + "', '" + safeUrl + "')", title: isBookmarked(okey) ? 'Bookmarked — tap to remove' : 'Bookmark' },
    { icon: 'trip', label: 'Trip', on: "cmAddOthersPlaceToTrip('" + attrStr(tripCityId || (cityObj ? cityObj.id : '')) + "', '" + cat + "', '" + attrStr(p.id || '') + "', '" + owner.uid + "', '" + safeName + "')", title: 'Add to one of my trips' },
    { icon: 'share', label: 'Share', on: "cmExportOthersPlace('" + okey + "', '" + safeName + "', '" + safeUrl + "', '" + escapeHtml(owner.nickname || 'a user').replace(/'/g, "\\'") + "', '" + safeArea + "', '" + safeCity + "', '" + cat + "')", title: 'Preview and send' },
    mine ? null : (placeCopyOf(owner.uid, (cityObj ? cityObj.id : ''), cat, p.id || hashUrl(p.url || '')) ? { cls: 'on', icon: 'check', label: 'Saved', on: "showToast('Already in your list — with credit')", title: 'In your list — with credit' } : { icon: 'save', label: 'Save', on: "saveOthersPlace('" + owner.uid + "', '" + attrStr(cityObj ? cityObj.id : '') + "', '" + cat + "', '" + attrStr(p.id || '') + "')", title: 'Copy into my list — with credit' }), // ز-١-ب: حي
    mine ? (extra ? { cls: 'edit', icon: 'edit', label: 'Edit', on: extra, title: 'Edit in my list' } : null) : { cls: 'flag', icon: 'flag', label: 'Report', on: "openReport('place', '" + attrStr(owner.uid + ':' + (cityObj ? cityObj.id : '') + ':' + cat + ':' + (p.id || '')) + "')", title: 'Report' } // r75a-٢: على مكاني Edit مكان Report
  ];
  return placeCardHtml(p, 'others', { actions: actions, open: !!(p.topPlace && (p.note || (p.picks || []).length)) });
}

function othersCard(o){ // ر٦٩ذ (N-062) · r72r-3: بطاقة القائمة/الرحلة بنمط بطاقة المكان — يسارًا الاسم وأزواج «عنوان/قيمة» · يمينًا Actions شبكة تلتف
  const acts = [];
  acts.push({ html: o.openLabel || 'Open →', on: o.openHandler, title: 'Open' });
  if (!o.bmSelf) acts.push({ cls: 'bmk' + (o.bmOn ? ' on' : ''), html: bmkSvg(!!o.bmOn) + '<span class="bmk-cnt">' + (o.cnt || 0) + '</span>', on: o.bmHandler, title: o.bmOn ? 'Bookmarked — tap to remove' : 'Bookmark' });
  if (o.exportHandler) acts.push({ html: '📤', on: o.exportHandler, title: 'Send' });
  if (!o.bmSelf && o.saveHandler){ acts.push(o.savedOn ? { cls: 'on', html: 'Saved ✓', on: o.unsaveHandler || '', title: 'In your trips — tap to remove your copy' } : { html: 'Save', on: o.saveHandler, title: 'Copy into my trips — with credit' }); } /* r74m: لا زر «Save 3» — بطاقة بلا معالج حفظ لا تعرض حفظًا */
  if (!o.bmSelf && o.reportKey) acts.push({ cls: 'flag', html: '⚑', on: "openReport('" + attrStr(o.reportKind || 'list') + "', '" + attrStr(o.reportKey) + "')", title: 'Report' });
  const btn = function(a){ return '<button type="button" class="pc-a' + (a.cls ? ' ' + a.cls : '') + '" onclick="' + (a.on || '') + '" title="' + attrStr(a.title || '') + '">' + a.html + '</button>'; };
  const lines = (o.lines || []).map(function(l){ return '<div class="pc-lab">' + escapeHtml(l[0]) + '</div><div class="pc-val">' + l[1] + '</div>'; }).join('');
  return '<div class="pcard open"><div class="pc-data"><div class="pc-name" dir="auto">' + o.title + '</div>' + (o.sub ? '<div class="pc-lab">Details</div><div class="pc-val pc-area" dir="auto">' + o.sub + '</div>' : '') + lines + (o.stat ? '<div class="pc-lab">Views</div><div class="pc-val pc-area">' + o.stat.replace(' views', '') + '</div>' : '') + (o.bmSelf ? '<div class="pc-lab" title="' + (o.selfKind === 'trip' ? 'Bookmarks on your trip — the counter counts others' : 'Bookmarks on your list — the counter counts others') + '">Bookmarks</div><div class="pc-val pc-area">' + (o.cnt || 0) + '</div>' : '') + '</div>'
    + '<div class="pc-acts"><div class="pc-grid">' + acts.map(btn).join('') + '</div></div></div>';
}
function ownerLink(uid, name){ return '<a class="place-link linklike" onclick="viewCommunityUser(\'' + attrStr(uid) + '\')">' + escapeHtml(name || 'user') + '</a>'; } // ر٦٩ذ (N-060): الاسم نصًّا؛ شريحة الرجوع في مفكرتي فقط
let shareModalKind = 'trip';
// ر٦٩ش (N-057): معاينة التصدير — بطاقة بهوية التطبيق تُراجع قبل الإرسال (نصًّا الآن، صورةً مع عرض الرحلة الجديد)
// MyPickz — مولّد QR صغير مضمَّن (نمط البايت · تصحيح L · الإصدارات ١–١٠ · الأقنعة الثمانية بتقييمها) — لا اعتماد خارجي
function mpQR(text){
  const EXP = new Array(256), LOG = new Array(256); let x = 1;
  for (let i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  EXP[255] = EXP[0];
  const gmul = (a, b) => (!a || !b) ? 0 : EXP[(LOG[a] + LOG[b]) % 255];
  // [بايتات البيانات الكلية, بايتات التصحيح لكل كتلة, كتل] للإصدارات ١–١٠ بمستوى L
  const V = [[19,7,1],[34,10,1],[55,15,1],[80,20,1],[108,26,1],[136,18,2],[156,20,2],[194,24,2],[232,30,2],[274,18,4]];
  const bytes = new TextEncoder().encode(String(text || ''));
  let ver = -1; for (let v = 0; v < V.length; v++){ if (V[v][0] - 2 - (v + 1 >= 10 ? 1 : 0) >= bytes.length){ ver = v; break; } }
  if (ver < 0) return null;
  const [totalData, ecPer, blocks] = V[ver]; const n = ver + 1; const size = 17 + 4 * n;
  // البتات
  const bits = []; const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(4, 4); push(bytes.length, n >= 10 ? 16 : 8); bytes.forEach(b => push(b, 8));
  const cap = totalData * 8; for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0); while (bits.length % 8) bits.push(0);
  const pads = [0xEC, 0x11]; for (let i = 0; bits.length < cap; i++) push(pads[i % 2], 8);
  const data = []; for (let i = 0; i < bits.length; i += 8){ let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
  // مولّد ريد–سولومون
  let gen = [1]; for (let i = 0; i < ecPer; i++){ const ng = new Array(gen.length + 1).fill(0); for (let j = 0; j < gen.length; j++){ ng[j] ^= gen[j]; ng[j + 1] ^= gmul(gen[j], EXP[i]); } gen = ng; }
  const rs = (msg) => { const res = msg.concat(new Array(ecPer).fill(0)); for (let i = 0; i < msg.length; i++){ const c = res[i]; if (!c) continue; for (let j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], c); } return res.slice(msg.length); };
  // الكتل (متساوية الحجم بهذه الإصدارات لمستوى L عدا ما يُوزَّع بالتناوب)
  const per = Math.floor(totalData / blocks), extra = totalData % blocks; const dBlocks = [], eBlocks = []; let p = 0;
  for (let b = 0; b < blocks; b++){ const len = per + (b >= blocks - extra ? 1 : 0); const d = data.slice(p, p + len); p += len; dBlocks.push(d); eBlocks.push(rs(d)); }
  const out = []; const maxD = Math.max(...dBlocks.map(d => d.length));
  for (let i = 0; i < maxD; i++) dBlocks.forEach(d => { if (i < d.length) out.push(d[i]); });
  for (let i = 0; i < ecPer; i++) eBlocks.forEach(e => out.push(e[i]));
  // المصفوفة
  const M = Array.from({ length: size }, () => new Array(size).fill(null)); // null = فارغ · 0/1 وظيفي أو بيانات
  const F = Array.from({ length: size }, () => new Array(size).fill(false)); // وظيفي
  const setF = (r, c, v) => { M[r][c] = v; F[r][c] = true; };
  const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++){ const rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue; const on = (r >= 0 && r <= 6 && c >= 0 && c <= 6) && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); setF(rr, cc, on ? 1 : 0); } };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++){ setF(6, i, i % 2 === 0 ? 1 : 0); setF(i, 6, i % 2 === 0 ? 1 : 0); }
  const AL = [[],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]][n];
  AL.forEach(r0 => AL.forEach(c0 => { if (F[r0][c0]) return; for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) setF(r0 + r, c0 + c, (Math.max(Math.abs(r), Math.abs(c)) !== 1) ? 1 : 0); }));
  setF(size - 8, 8, 1);
  for (let i = 0; i < 9; i++){ if (i !== 6){ if (!F[8][i]) setF(8, i, 0); if (!F[i][8]) setF(i, 8, 0); } }
  for (let i = size - 8; i < size; i++){ if (!F[8][i]) setF(8, i, 0); if (!F[i][8]) setF(i, 8, 0); }
  // وضع البيانات
  const bitsOut = []; out.forEach(b => { for (let i = 7; i >= 0; i--) bitsOut.push((b >> i) & 1); });
  let bi = 0, up = true;
  for (let col = size - 1; col > 0; col -= 2){ if (col === 6) col--; for (let k = 0; k < size; k++){ const r = up ? size - 1 - k : k; for (let dc = 0; dc < 2; dc++){ const c = col - dc; if (F[r][c]) continue; M[r][c] = bi < bitsOut.length ? bitsOut[bi++] : 0; } } up = !up; }
  // الأقنعة والتقييم
  const masks = [(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>(r*c)%2+(r*c)%3===0,(r,c)=>((r*c)%2+(r*c)%3)%2===0,(r,c)=>((r+c)%2+(r*c)%3)%2===0];
  const fmtBits = (mask) => { const d = (1 << 3) | mask; let v = d << 10; const g = 0x537; for (let i = 14; i >= 10; i--) if (v & (1 << i)) v ^= g << (i - 10); return ((d << 10) | v) ^ 0x5412; };
  const apply = (mask) => { const G = M.map(r => r.slice()); for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!F[r][c] && masks[mask](r, c)) G[r][c] ^= 1;
    const f = fmtBits(mask); const bit = i => (f >> i) & 1;
    // الصيغة (المواصفة): النسخة الأولى حول المكتشف العلوي الأيسر، والثانية: ٧ بتات رأسيًّا أسفل اليسار (من الأسفل) و٨ أفقيًّا أعلى اليمين
    for (let i = 0; i < 6; i++) G[8][i] = bit(14 - i); G[8][7] = bit(8); G[8][8] = bit(7); G[7][8] = bit(6); for (let i = 0; i < 6; i++) G[5 - i][8] = bit(5 - i);
    for (let i = 0; i < 7; i++) G[size - 1 - i][8] = bit(14 - i); for (let i = 0; i < 8; i++) G[8][size - 8 + i] = bit(7 - i);
    G[size - 8][8] = 1; return G; };
  const penalty = (G) => { let s = 0; const run = (get) => { for (let i = 0; i < size; i++){ let cnt = 1; for (let j = 1; j < size; j++){ if (get(i, j) === get(i, j - 1)){ cnt++; if (cnt === 5) s += 3; else if (cnt > 5) s++; } else cnt = 1; } } };
    run((i, j) => G[i][j]); run((i, j) => G[j][i]);
    for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++){ const v = G[r][c]; if (v === G[r][c + 1] && v === G[r + 1][c] && v === G[r + 1][c + 1]) s += 3; }
    const pat = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    const scan = (get) => { for (let i = 0; i < size; i++) for (let j = 0; j <= size - 11; j++){ let a = true, b = true; for (let k = 0; k < 11; k++){ const v = get(i, j + k); if (v !== pat[k]) a = false; if (v !== pat2[k]) b = false; } if (a) s += 40; if (b) s += 40; } };
    scan((i, j) => G[i][j]); scan((i, j) => G[j][i]);
    let dark = 0; for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += G[r][c]; const k = Math.abs(Math.round(dark * 100 / (size * size)) - 50); s += Math.floor(k / 5) * 10; return s; };
  let best = null, bestS = Infinity, bestMask = 0;
  for (let m = 0; m < 8; m++){ const G = apply(m); const sc = penalty(G); if (sc < bestS){ bestS = sc; best = G; bestMask = m; } }
  return { size: size, modules: best, version: n, mask: bestMask };
}

// ر٧٠ح (N-076 v2 — تصميم المالك): بطاقة المكان/القائمة/الرحلة بلغة تُختار عند التصدير، QR لرابط الموقع، الاختيارات والملاحظات، الأقسام الفارغة لا تظهر، الطويلة بطاقات متعددة
let exportLang = 'en';
const XC_T = { en: { place: 'Place card', list: 'List card', trip: 'Trip card', picks: 'Picks', notes: 'Notes', places: 'places', place1: 'place', day: 'Day', days: 'days', day1: 'day', from: 'from the list of', list: 'list', cont: '(cont.)', morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', evening: 'Evening' },
               ar: { place: 'بطاقة مكان', list: 'بطاقة قائمة', trip: 'بطاقة رحلة', picks: 'الاختيارات', notes: 'ملاحظات', places: 'أماكن', place1: 'مكان', day: 'اليوم', days: 'أيام', day1: 'يوم', from: 'من قائمة', list: 'قائمة', cont: '(تتمة)', morning: 'صباح', midday: 'ظهيرة', afternoon: 'عصر', evening: 'مساء' } };
function catPathOf(catId){ const c = plCatsAll().find(function(x){ return x.id === catId; }); if (c) return (c.section ? c.section + ' › ' : '') + c.name; const pc = privateCategoryList().find(function(x){ return x.id === catId; }); return pc ? pc.name : (catId || ''); }
function xcEntry(p, extra){ return Object.assign({ name: p.name || p.placeName || 'Place', fine: (p.flags || []).indexOf('fine_dining') >= 0, area: p.area || '', url: p.url || '', picks: (p.picks || []).map(function(x){ return x && x.name ? x.name : ''; }).filter(Boolean), note: p.note || '' }, extra || {}); }
function exportCardModel2(kind, id){
  const me = (userListData && userListData.nickname) || ''; const m = { type: 'list', title: '', city: '', area: '', count: '', owner: me, groups: [] };
  const lang = exportLang;
  if (kind === 'oplace'){ const p = cmCache.places[id] || {}; m.type = 'place'; m.title = ''; m.city = p.city || ''; m.area = p.area || ''; m.owner = p.owner || me; // ر٧٠ح-٢ (قرار المالك): الرأس المدينة – المنطقة فقط؛ الاسم بالصندوق مرة واحدة
    m.groups = [{ label: p.category ? catPathOf(p.category) : '', entries: [xcEntry(Object.assign({}, p, { area: '' }))] }]; return m; }
  if (kind === 'trip' || kind === 'otrip'){ const t = kind === 'trip' ? userTrips.find(function(x){ return x.id === id; }) : cmCache.trips[id]; if (!t) return m; m.type = 'trip';
    m.title = tripTitle(t); m.city = (t.cities || []).map(function(c){ return c.cityName; }).filter(Boolean).join(' · ') || t.cityName || ''; m.owner = kind === 'trip' ? me : (t.nickname || t.ownerNick || 'a user');
    const nd = tripDayCount(t), np = tripPlaceCount(t);
    m.count = nd + ' ' + (nd === 1 ? XC_T[lang].day1 : XC_T[lang].days) + ' · ' + np + ' ' + (np === 1 ? XC_T[lang].place1 : XC_T[lang].places);
    const res = resolvedTripCache[kind === 'trip' ? t.id : ('community_' + t.id)] || null; const days = res ? res.days : (tripHasPlan(t) ? t.plan.days : []);
    days.forEach(function(d){ TRIP_PERIODS.forEach(function(p){ const arr = d.periods[p] || []; if (!arr.length) return; const entries = []; arr.forEach(function(e){ entries.push(xcEntry(tripXcSrc(e))); (e.alts || []).forEach(function(a){ entries.push(xcEntry(Object.assign(tripXcSrc(a), { name: (lang === 'ar' ? 'أو ' : 'or ') + (a._p && a._p.name || a.name || 'Place') }))); }); });
      m.groups.push({ label: XC_T[lang].day + ' ' + d.n + ' · ' + (XC_T[lang][p] || TRIP_PERIOD_LABEL[p]), entries: entries }); }); }); return m; } // الصينية لا تُصدَّر (الاختيار ١٣)
  // القائمة: مكاني (افتراضي) أو قائمة الآخرين
  m.type = 'list'; let cats, r;
  if (kind === 'olist'){ r = cmCache.lists[id] || {}; m.owner = r.nickname || 'a user'; m.city = r.cityName || r.cityId || ''; cats = r.categories || {}; }
  else { m.city = plCityName(); cats = (myCityListData.categories || {}); }
  m.title = m.city + ' ' + XC_T[lang].list; let n = 0;
  plCatsAll().forEach(function(c){ const live = ((cats[c.id] || {}).places || []).filter(function(p){ return p && (p.name || p.url); }); if (!live.length) return; n += live.length; m.groups.push({ label: catPathOf(c.id), entries: live.map(function(p){ return xcEntry(p); }) }); });
  m.count = n + ' ' + (n === 1 ? XC_T[lang].place1 : XC_T[lang].places); return m;
}
function tripXcSrc(e){ const p = (e && e._p) || {}; return { name: p.name || e.name || 'Place', area: p.area || '', url: p.url || '', picks: p.picks || [], note: e.alert || p.note || '', flags: p.flags || [] }; } // مدخل الخطة → مصدر بطاقة التصدير (التنبيه يحل محل الملاحظة)
function xcWrap(g, text, maxW, maxLines){ const words = String(text || '').split(/\s+/); const lines = []; let cur = ''; words.forEach(function(w){ const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); if (lines.length > maxLines){ lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/.{3}$/, '…'); } return lines; }
function xcIsRtl(t){ return /[\u0600-\u06FF]/.test(String(t || '')); }
function exportCardCanvases(kind, id){
  const m = exportCardModel2(kind, id); const L = XC_T[exportLang]; const rtl = exportLang === 'ar';
  const W = 1080, pad = 64, QR = 132; const cs = getComputedStyle(document.documentElement); const C = function(v){ return (cs.getPropertyValue(v) || '').trim(); };
  const IVORY = C('--ivory'), IVB = C('--ivory-bright'), SAFF = C('--saffron'), INK = C('--ink'), INKS = C('--ink-soft'), NIGHT = C('--paper'), NIGHT2 = C('--night-2');
  const probe = document.createElement('canvas').getContext('2d');
  const entryH = function(e){ probe.font = '500 30px Cairo, sans-serif'; let h = 58; if (e.area) h += 38; if (e.picks.length) h += 52 + e.picks.length * 34; if (e.note) h += 52 + xcWrap(probe, e.note, W - pad * 2 - 40 - (e.url ? QR + 24 : 0), 3).length * 34; return Math.max(h, e.url ? QR + 40 : 0) + 16; }; // ر٧٠ك-٢: مسافات أوسع بين الاسم والاختيارات والملاحظات
  // التقسيم إلى صفحات بحسب الارتفاع (رأس ٣٠٠ · تذييل ١٨٠ · سقف ١٧٠٠ للجسم)
  const CAP = 1700; const pages = []; let page = [], used = 0;
  m.groups.forEach(function(gr){ let first = true, entries = gr.entries.slice(); while (entries.length){ let take = []; let h = gr.label ? 48 : 0; while (entries.length){ const eh = entryH(entries[0]); if (used + h + eh > CAP && (take.length || page.length)) break; take.push(entries.shift()); h += eh; }
      if (!take.length){ pages.push(page); page = []; used = 0; continue; } page.push({ label: gr.label ? (first ? gr.label : gr.label + ' ' + L.cont) : '', entries: take }); used += h; first = false; if (entries.length){ pages.push(page); page = []; used = 0; } } });
  if (page.length || !pages.length) pages.push(page); if (pages.length > 10) pages.length = 10;
  const out = [];
  pages.forEach(function(secs, pi){
    let body = 0; secs.forEach(function(sc){ body += (sc.label ? 48 : 0); sc.entries.forEach(function(e){ body += entryH(e); }); });
    const H = 300 + body + 180 + 24; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const tx = function(t, x, y, font, color, align){ g.font = font; g.fillStyle = color; const r = xcIsRtl(t) || (rtl && !/[A-Za-z]/.test(t)); g.direction = r ? 'rtl' : 'ltr'; g.textAlign = align || (rtl ? 'right' : 'left'); g.fillText(String(t), align ? x : (rtl ? W - x : x), y); };
    g.fillStyle = IVORY; g.fillRect(0, 0, W, H); g.fillStyle = IVB; g.beginPath(); g.roundRect(32, 32, W - 64, H - 64, 40); g.fill();
    g.fillStyle = SAFF; g.beginPath(); if (rtl) g.roundRect(W - 32 - 300, 32, 300, 64, [0, 40, 0, 24]); else g.roundRect(32, 32, 300, 64, [40, 0, 24, 0]); g.fill();
    tx(L[m.type], 60, 76, '800 26px Cairo, sans-serif', INK);
    if (m.title){ tx(m.title, pad, 176, '800 58px Cairo, sans-serif', INK); tx([m.city, m.area].filter(Boolean).join(' – ') + (m.count ? '  ·  ' + m.count : ''), pad, 226, '500 30px Cairo, sans-serif', INKS); }
    else tx([m.city, m.area].filter(Boolean).join(' – '), pad, 196, '800 44px Cairo, sans-serif', INK); // بطاقة المكان: المدينة – المنطقة عنوانًا
    g.fillStyle = SAFF; g.fillRect(pad, 254, W - pad * 2, 4);
    let y = 300, num = 0;
    const chip = function(text, x, yBase, font){ g.font = font; const w = g.measureText(text).width + 28; const cx = rtl ? (W - x - w) : x; g.fillStyle = SAFF; g.beginPath(); g.roundRect(cx, yBase - 26, w, 36, 18); g.fill(); g.fillStyle = INK; g.direction = 'ltr'; g.textAlign = 'left'; g.fillText(text, cx + 14, yBase); return w; }; // شريحة زعفرانية
    secs.forEach(function(sc){ if (sc.label){ tx(sc.label, pad, y + 30, '800 26px Cairo, sans-serif', INKS);
        if (m.type === 'place' && sc.entries.some(function(e){ return e.fine; })){ g.font = '800 26px Cairo, sans-serif'; const lw = g.measureText(sc.label).width; chip('Fine dining', pad + lw + 18, y + 30, '800 22px Cairo, sans-serif'); } // ر٧٠ك-٢: العلامة بجوار التصنيف الفرعي
        y += 48; }
      sc.entries.forEach(function(e){ const h = entryH(e); g.fillStyle = IVORY; g.beginPath(); g.roundRect(pad, y, W - pad * 2, h - 16, 18); g.fill();
        const textW = W - pad * 2 - 40 - (e.url ? QR + 24 : 0); let ty = y + 42; num++;
        tx((m.type === 'list' ? num + '. ' : '') + e.name, pad + 20, ty, '800 32px Cairo, sans-serif', INK);
        if (e.fine && m.type !== 'place'){ g.font = '800 32px Cairo, sans-serif'; const nw = g.measureText((m.type === 'list' ? num + '. ' : '') + e.name).width; chip('Fine dining', pad + 20 + nw + 16, ty, '800 20px Cairo, sans-serif'); } // القوائم والرحلات: بجوار الاسم
        if (e.area){ ty += 38; tx(e.area, pad + 20, ty, '500 28px Cairo, sans-serif', INKS); }
        if (e.picks.length){ ty += 52; tx(L.picks, pad + 20, ty, '800 24px Cairo, sans-serif', SAFF); e.picks.forEach(function(pk){ ty += 34; tx('• ' + pk, pad + 20, ty, '500 28px Cairo, sans-serif', INK); }); }
        if (e.note){ ty += 52; tx(L.notes, pad + 20, ty, '800 24px Cairo, sans-serif', SAFF); g.font = '500 28px Cairo, sans-serif'; xcWrap(g, e.note, textW, 3).forEach(function(ln){ ty += 34; tx(ln, pad + 20, ty, '500 28px Cairo, sans-serif', INK); }); }
        if (e.url){ const q = mpQR(e.url); if (q){ const qx = rtl ? pad + 20 : W - pad - 20 - QR, qy = y + 20, cell = QR / (q.size + 2); g.fillStyle = IVB; g.fillRect(qx, qy, QR, QR); g.fillStyle = INK; for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++) if (q.modules[r][c]) g.fillRect(qx + (c + 1) * cell, qy + (r + 1) * cell, cell + 0.5, cell + 0.5); } }
        y += h; }); });
    g.fillStyle = NIGHT; g.beginPath(); g.roundRect(32, H - 32 - 140, W - 64, 140, [0, 0, 40, 40]); g.fill();
    g.direction = 'ltr'; g.textAlign = 'left'; g.fillStyle = SAFF; g.font = '800 40px Cairo, sans-serif'; g.fillText('MyPickz', pad, H - 96); g.fillStyle = NIGHT2; g.font = '500 24px Cairo, sans-serif'; g.fillText('mypickz.app' + (pages.length > 1 ? '  ·  ' + (pi + 1) + '/' + pages.length : ''), pad, H - 60);
    if (m.owner){ g.textAlign = 'right'; g.direction = rtl ? 'rtl' : 'ltr'; g.fillStyle = NIGHT2; g.font = '500 24px Cairo, sans-serif'; g.fillText(L.from, W - pad, H - 104); g.fillStyle = IVB; g.font = '800 36px Cairo, sans-serif'; g.direction = 'ltr'; g.fillText('@' + m.owner, W - pad, H - 60);
      const ox = W - pad - g.measureText('@' + m.owner).width - 56, oy = H - 74; g.strokeStyle = IVB; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(ox + 12, oy - 12, 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(ox - 2, oy + 12); g.quadraticCurveTo(ox + 12, oy - 4, ox + 26, oy + 12); g.stroke(); g.beginPath(); g.moveTo(ox + 34, oy - 14); g.lineTo(ox + 34, oy + 2); g.moveTo(ox + 26, oy - 6); g.lineTo(ox + 42, oy - 6); g.stroke(); }
    out.push(cv); });
  return { canvases: out, model: m };
}
function exportCardHtml(kind, id){ // المعاينة = صورة البطاقة نفسها (الصفحة الأولى) + اختيار اللغة
  const chips = '<div class="chiprow" style="justify-content:center;margin:0 0 8px;"><button type="button" class="chip' + (exportLang === 'en' ? ' on' : '') + '" onclick="setExportLang(\'en\')">English</button><button type="button" class="chip' + (exportLang === 'ar' ? ' on' : '') + '" onclick="setExportLang(\'ar\')">العربية</button></div>';
  let r; try{ r = exportCardCanvases(kind, id); }catch(e){ return chips + '<div class="mp-empty mini">Could not draw the card</div>'; }
  const n = r.canvases.length; const src = r.canvases[0].toDataURL('image/png');
  return chips + '<img class="xc-img" src="' + src + '" alt="card">' + (n > 1 ? '<p class="mini dim" style="text-align:center;margin:6px 0 0;">You will send ' + n + ' cards</p>' : '');
}
let __xcLast = null;
function setExportLang(l){ exportLang = (l === 'ar') ? 'ar' : 'en'; if (__xcLast) openExportPreview(__xcLast.kind, __xcLast.id); }
async function sendExportCard(kind, id){
  try{ if (document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}
  let r; try{ r = exportCardCanvases(kind, id); }catch(e){ showToast('Could not draw the card'); return; }
  const blobs = []; for (const cv of r.canvases){ const b = await new Promise(function(res){ cv.toBlob(res, 'image/png'); }); if (b) blobs.push(b); }
  if (!blobs.length){ showToast('Could not draw the card'); return; }
  const files = blobs.map(function(b, i){ return new File([b], 'mypickz-card' + (blobs.length > 1 ? '-' + (i + 1) : '') + '.png', { type: 'image/png' }); });
  try{ if (navigator.canShare && navigator.canShare({ files: files })){ await navigator.share({ files: files, title: r.model.title }); closeExportPreview(); statsExportFor(kind, id); return; } }catch(e){ if (e && e.name === 'AbortError') return; }
  files.forEach(function(f){ const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });
  showToast(files.length > 1 ? files.length + ' cards saved as images' : 'Card saved as an image'); closeExportPreview(); statsExportFor(kind, id); /* ب-٢-١ */
}
function openExportPreview(kind, id){
  const bd = document.getElementById('tripShareBackdrop'); shareModalKind = 'export'; __xcLast = { kind: kind, id: id }; // ر٧٠ح
  bd.innerHTML = '<div class="modal night"><div class="hdr"><button type="button" class="bk hidden">← Back</button><span class="ttl">📤 Send</span><button type="button" class="x" onclick="closeExportPreview()" aria-label="Close">✕</button></div>' + exportCardHtml(kind, id) /* r75c (البند ١٠): معاينة الإرسال على القشرة الليلية */
    + '<button type="button" class="cta wide" style="margin-top:12px" onclick="sendExportCard(\'' + kind + '\', \'' + attrStr(id || '') + '\')">Send as card</button>'
    + '<button type="button" class="btn btn-ghost" onclick="closeExportPreview(); ' + (kind === 'trip' ? "exportOwnTripRow('" + attrStr(id) + "')" : kind === 'olist' ? "exportOtherList('" + attrStr(String(id).split('_')[0]) + "', '" + attrStr(String(id).split('_').slice(1).join('_')) + "')" : kind === 'otrip' ? "exportOtherTrip('" + attrStr(id) + "')" : kind === 'oplace' ? "cmSendCachedPlace('" + attrStr(id) + "')" : 'plExportCityList()') + '">Send as message</button>'
    + '<button type="button" class="btn btn-ghost" onclick="closeExportPreview()">Cancel</button></div>';
  bd.classList.add('show');
}
// ر٦٩ث (N-057): البطاقة صورةً — تُرسم على لوحة رسم بهوية التطبيق وتُرسل عبر ورقة مشاركة النظام (أو تُنزَّل)
const cmCache = { lists: {}, trips: {}, places: {} }; // ر٦٩ذ (N-057): ما حُمِّل بالسوق يخدم بطاقة التصدير
function closeExportPreview(){ const bd = document.getElementById('tripShareBackdrop'); if (bd) bd.classList.remove('show'); }
function openShareModal(kind, id){ // ر٦٩ز: نافذة «Shared with» واحدة للقائمة والرحلة (N-031 · N-034)
  const isTrip = kind === 'trip'; const target = isTrip ? userTrips.find(t => t.id === id) : myCityListData; if (!target) return; if (isTrip) currentTripId = id;
  const bd = document.getElementById('tripShareBackdrop'); shareModalKind = kind;
  const names = (target.sharedWith || []).map(function(uid){ return { uid: uid, name: (target.sharedWithNames || {})[uid] || 'user' }; });
  const title = isTrip ? tripTitle(target) : ((allCities().find(function(x){ return x.id === cityListCityId; }) || {}).name || 'My list');
  bd.innerHTML = '<div class="modal night"><div class="hdr"><button type="button" class="bk hidden">← Back</button><span class="ttl">🔗 Shared with</span><button type="button" class="x" onclick="closeTripShareModal()" aria-label="Close">✕</button></div>' /* أ-٢ · القرار ١٠: نافذة «Shared with» على القشرة الليلية */
    + '<label class="flabel">' + escapeHtml(title) + ' — ' + (names.length ? names.length + ' ' + (names.length === 1 ? 'person' : 'people') : 'nobody yet') + '</label>'
    + (names.length ? names.map(function(n){ return '<div class="sharerow"><span>👤 ' + escapeHtml(n.name) + '</span><button type="button" class="btn btn-ghost" style="width:auto;margin:0;padding:5px 10px" onclick="removeShareFromModal(\'' + attrStr(n.uid) + '\')" title="Stop sharing">✕</button></div>'; }).join('') : '<div class="mp-empty mini">Share with someone by their username.</div>')
    + '<button type="button" class="cta wide" style="margin-top:12px" onclick="addShareFromModal()"><b>＋</b> Add by username</button>'
    + '<button type="button" class="btn btn-ghost" onclick="closeTripShareModal()">Done</button></div>';
  bd.classList.add('show');
}
function openTripShareModal(id){ openShareModal('trip', id); }
function closeTripShareModal(){ const bd = document.getElementById('tripShareBackdrop'); if (bd) bd.classList.remove('show'); if (shareModalKind === 'trip'){ currentTripId = null; tripViewMode = true; renderMyTripsModal(); } else { renderPlacesMine(); } }
async function addShareFromModal(){ if (shareModalKind === 'trip'){ const id = currentTripId; await shareTripWithSomeone(); openShareModal('trip', id); } else { await plShareWith(); openShareModal('list'); } }
async function removeShareFromModal(uid){ if (shareModalKind === 'trip'){ const id = currentTripId; await removeTripShare(uid); openShareModal('trip', id); } else { await plRemoveShare(uid); openShareModal('list'); } }
function shareTripFor(id){ openTripShareModal(id); }
async function openTripDetail(tripId, mode){ // ر٦٤: الافتراض عرضٌ (يظهر ✏️ Edit)؛ mode='edit' من الإنشاء
  tripTab = 'plan'; tripCitySel = null; tripDaySel = 0; const __t = userTrips.find(t => t.id === tripId); if (__t && tripHasPlan(__t)) tripDaySel = Math.max(0, __t.plan.days.findIndex(function(d){ return tripDayEntries(d).length; })); // r77: أول يوم فيه محطات
  currentTripId = tripId;
  viewingSharedTrip = false;
  tripViewMode = (mode !== 'edit');
  const trip = userTrips.find(t => t.id === tripId);
  document.getElementById('myTripsBody').innerHTML = `<div class="mp-empty mini">Loading…</div>`;
  resolvedTripCache[tripId] = await resolveTripPlaces(trip);
  renderMyTripsModal();
}
async function openSharedTripDetail(tripId){
  mpTrack.statsTrip(tripId, 'view_total');
  currentTripId = tripId;
  viewingSharedTrip = true;
  tripViewMode = true;
  const trip = sharedTrips.find(t => t.id === tripId);
  if (!trip){ showToast('This trip is no longer shared with you'); viewingSharedTrip = false; currentTripId = null; renderTripsBody(); return; } // ر٦٧: رابط مشاركة لرحلة سُحبت أو حُذفت
  document.getElementById('myTripsBody').innerHTML = `<div class="mp-empty mini">Loading…</div>`;
  resolvedTripCache[tripId] = await resolveTripPlaces(trip);
  renderMyTripsModal();
}
function backToTripsList(){ tripRouteFlush(); currentTripId = null; viewingSharedTrip = false; renderMyTripsModal(); if (tripAddOrigin){ const o = tripAddOrigin; tripAddOrigin = null; if (o.tab && o.tab !== 'Trips') switchTab(o.tab); } } // ر٧٠و: الرجوع للشاشة الأصل بعد الإضافة

async function toggleTripPublic(){
  const trip = userTrips.find(t => t.id === currentTripId);
  if (!trip) return;
  if (!trip.public && !userListData.nickname){
    const ok = await chooseNickname();
    if (!ok) return;
  }
  trip.public = !trip.public;
  if (trip.public) mpTrack.hit('reserved_2'); // ر٦٣: نشر عام — reserved_1 خرج من قائمة M4.24؛ يُسمّى باسمه بنشرة م٣
  await saveTrip(trip);
  await syncCommunityProfile(); // يضمن ظهور المستخدم بنتائج الاكتشاف حتى لو ما عنده أي مدينة My List عامة إطلاقًا
  showToast(trip.public ? 'Trip is now public 🌐' : 'Trip is now private');
  renderMyTripsModal();
}
async function shareTripWithSomeone(){
  mpTrack.hit('share_link');
  const trip = userTrips.find(t => t.id === currentTripId);
  if (!trip) return;
  const name = await openInputModal("Share with (username)", "Enter their exact username", "");
  if (name === null) return;
  const key = name.trim().toLowerCase();
  if (!key) return;
  try{
    const doc = await mpData.nicknames.get(key);
    if (!doc.exists){ showToast('No user found with that username'); return; }
    const data = doc.data();
    const targetUid = data.uid;
    if (targetUid === currentUser.uid){ showToast("You can't share a trip with yourself"); return; }
    if (!trip.sharedWith) trip.sharedWith = [];
    if (!trip.sharedWithNames) trip.sharedWithNames = {};
    if (trip.sharedWith.includes(targetUid)){ showToast('Already shared with this user'); return; }
    trip.sharedWith.push(targetUid);
    trip.sharedWithNames[targetUid] = data.nickname || name.trim();
    await saveTrip(trip);
    showToast('Shared ✓');
    renderMyTripsModal();
  }catch(e){ showToast('Could not verify username'); }
}
async function removeTripShare(uid){
  const trip = userTrips.find(t => t.id === currentTripId);
  if (!trip || !trip.sharedWith) return;
  trip.sharedWith = trip.sharedWith.filter(u => u !== uid);
  await saveTrip(trip);
  renderMyTripsModal();
}

const SOURCE_LABELS = { owner: '📖 App guide', mylist: '📋 My List', community: '👤 Shared list' };

// البند ١٠ (ر٥٢): تقرير الرحلة نصًّا — الأيام فالتصنيفات فالأماكن بروابطها، بالتوقيع ذاته
function exportTripText(){
  const sourceList = viewingSharedTrip ? sharedTrips : userTrips;
  const trip = sourceList.find(t => t.id === currentTripId); if (!trip) return;
  const resolved = resolvedTripCache[currentTripId] || { days: [] };
  let out = '🧳 ' + tripTitle(trip) + '\n';
  (resolved.days || []).forEach(function(d){
    out += '\n' + tripDayLabel(d) + (d.date ? ' · ' + tripDateLabel(d.date) : '') + '\n';
    TRIP_PERIODS.forEach(function(p){ const arr = d.periods[p] || []; if (!arr.length) return; out += TRIP_PERIOD_LABEL[p] + '\n';
      arr.forEach(function(e){ const pl = e._p || {}; out += '• ' + (pl.name || e.name || 'Place') + (pl.url ? '\n  ' + pl.url : '') + '\n'; (e.alts || []).forEach(function(a){ const ap = a._p || {}; out += '  or ' + (ap.name || a.name || 'Place') + (ap.url ? '\n  ' + ap.url : '') + '\n'; }); }); });
  });
  out += '\nSent via MyPickz · mypickz.app';
  mpSendText(out);
}
let tripDaySel = 0, tripTab = 'plan', tripCitySel = null; // r77: اليوم المختار · التبويب (خطة · مسار اليوم · خريطة) · المدينة المختارة بالمبدّل
const tripAltsOpen = {}; // معرّف المدخل → مفتوح (ذاكرة الجلسة)
function tripAltsToggle(id){ tripAltsOpen[id] = !tripAltsOpen[id]; renderMyTripsModal(); }
function tripPickCity(cityId){ tripCitySel = cityId; const r = resolvedTripCache[currentTripId]; if (r){ const i = r.days.findIndex(function(d){ return d.cityId === cityId; }); if (i >= 0) tripDaySel = i; } renderMyTripsModal(); }
function tripPickDay(i){ tripDaySel = i; renderMyTripsModal(); }
function tripPickTab(t){ tripTab = t; renderMyTripsModal(); } // r78: التبويبات الثلاثة حقيقية (خطة · مسار اليوم · خريطة)
function tripEntryCardHtml(e, n, readOnly, tripId, ctxCity){ // بطاقة مدخل الخطة: الرقم شريحةً · الاسم · الحي · التنبيه · بلاطات: Maps · Move · Alert · Remove
  const pl = e._p || {}; const name = pl.name || e.name || 'Place';
  if (!e._available) return '<div class="row triprow dim">⚠️ ' + escapeHtml(name) + ' — no longer available</div>';
  const acts = [ pl.url ? { icon: 'maps', label: 'Google Maps', href: pl.url, title: 'Open in Google Maps', attrs: 'data-mpsrc="trip"' } : { icon: 'maps', label: 'Google Maps', disabled: true, title: 'No Maps link for this place' } ];
  if (!readOnly){ acts.push({ icon: 'move', label: 'Move', on: "tripOpenMoveSheet('" + attrStr(tripId) + "', '" + attrStr(e.id) + "')", title: 'Move to another day or period' }); acts.push({ icon: 'edit', label: 'Alert', on: "tripViewAlert('" + attrStr(e.id) + "')", title: 'A short alert for this stop' }); acts.push({ cls: 'flag', icon: 'trash', label: 'Remove', on: "tripViewRemove('" + attrStr(e.id) + "')", title: 'Remove from this trip' }); }
  const status = (typeof n === 'number') ? '<span class="pc-chip trip-num">' + n + '</span>' : '';
  const alertLine = e.alert ? '<div class="pc-alert" dir="auto">⚠ ' + escapeHtml(e.alert) + '</div>' : '';
  let html = placeCardHtml({ id: e.id, name: name, url: pl.url, area: pl.area, picks: pl.picks, note: pl.note }, 'trip', { actions: acts, status: status, extraLines: alertLine, open: !!e.alert }); // التنبيه سطرًا داخل البطاقة
  const alts = e.alts || [];
  if (alts.length){ const open = !!tripAltsOpen[e.id]; html += '<div class="trip-alts' + (open ? ' open' : '') + '"><button type="button" class="trip-alts-h" onclick="tripAltsToggle(\'' + attrStr(e.id) + '\')"><span>or · ' + escapeHtml((alts[0]._p && alts[0]._p.name) || alts[0].name || 'Place') + (alts.length > 1 ? ' · +' + (alts.length - 1) : '') + '</span><span class="arr">' + (open ? '⌃' : '⌄') + '</span></button>'
    + (open ? alts.map(function(a){ const ap = a._p || {}; return '<div class="trip-alt"><span class="trip-alt-n" dir="auto">' + escapeHtml(ap.name || a.name || 'Place') + (ap.area ? ' <span class="dim">· ' + escapeHtml(ap.area) + '</span>' : '') + '</span>' + (ap.url ? '<a class="act" href="' + attrStr(ap.url) + '" target="_blank" rel="noopener" data-mpsrc="trip">Maps ↗</a>' : '') + (readOnly ? '' : '<button type="button" class="act" onclick="tripViewPromote(\'' + attrStr(e.id) + '\', \'' + attrStr(a.id) + '\')" title="Make it option 1">⇄ Option 1</button><button type="button" class="act flag" onclick="tripViewRemove(\'' + attrStr(a.id) + '\')" title="Remove">✕</button>') + '</div>'; }).join('') : '') + '</div>'; }
  return html;
}
function tripStayCardHtml(trip, city, readOnly){ const c = city || {}; const stay = c.stay && c.stay.name ? escapeHtml(c.stay.name) : 'No stay set'; const when = (c.arrival && c.arrival.date ? tripDateLabel(c.arrival.date) + (c.arrival.time ? ' ' + c.arrival.time : '') : '') + (c.departure && c.departure.date ? ' → ' + tripDateLabel(c.departure.date) + (c.departure.time ? ' ' + c.departure.time : '') : ''); const mode = c.fallback === 'car' ? 'car' : 'walk & metro';
  return '<div class="trip-stay"><span class="trip-stay-t"><b dir="auto">' + stay + '</b><span class="dim">' + escapeHtml([when, mode].filter(Boolean).join(' · ')) + '</span></span>' + (readOnly ? '' : '<button type="button" class="actn" onclick="openTripBuilder({ tripId: \'' + attrStr(trip.id) + '\', stage: 1 })">Edit</button>') + '</div>'; }
function renderTripDetail(wrap){
  const sourceList = viewingSharedTrip ? sharedTrips : userTrips;
  const trip = sourceList.find(t => t.id === currentTripId);
  if (!trip || !tripHasPlan(trip)){ currentTripId = null; renderMyTripsModal(); return; }
  const resolved = resolvedTripCache[currentTripId] || { days: [], tray: [] };
  const readOnly = viewingSharedTrip || currentUserSuspended; // المُوقَف يُجبَر على القراءة
  const cities = trip.cities || []; if (!tripCitySel || !cities.some(function(c){ return c.cityId === tripCitySel; })) tripCitySel = cities.length ? cities[0].cityId : null;
  const days = resolved.days || []; const cityDays = []; days.forEach(function(d, i){ if (!tripCitySel || d.cityId === tripCitySel) cityDays.push(i); });
  if (cityDays.indexOf(tripDaySel) < 0) tripDaySel = cityDays.length ? cityDays[0] : 0;
  const np = tripPlaceCount(trip); const spec = tripSpec(trip); const warns = tripWarnings(trip.plan, spec);
  let html = '<div class="headrow"><button type="button" class="backchip" onclick="backToTripsList()">← Trips</button><span class="csel label grow"><b dir="auto">' + escapeHtml(tripTitle(trip)) + '</b></span><button type="button" class="actn ico" onclick="openExportPreview(\'' + (viewingSharedTrip ? 'otrip' : 'trip') + '\', \'' + attrStr(currentTripId) + '\')" title="Preview and send">📤</button></div>';
  if (viewingSharedTrip) cmCache.trips[trip.id] = trip;
  if (cities.length > 1 || !readOnly) html += '<div class="chipgrid ' + (cities.length >= 3 ? 'c3' : 'c2') + '">' + cities.map(function(c){ return '<button type="button" class="chip' + (c.cityId === tripCitySel ? ' on' : '') + '" onclick="tripPickCity(\'' + attrStr(c.cityId) + '\')">' + escapeHtml(c.cityName || c.cityId) + ' · ' + (c.days || 1) + (c.days === 1 ? ' day' : ' days') + '</button>'; }).join('') + (readOnly ? '' : '<button type="button" class="chip" onclick="openTripBuilder({ tripId: \'' + attrStr(trip.id) + '\', stage: 1, addCity: true })">＋ City</button>') + '</div>'; // رقاقات المدن مبدّل مصدر (القرار ٤)
  html += '<div class="chipgrid c3"><button type="button" class="pl-src' + (tripTab === 'plan' ? ' on' : '') + '" onclick="tripPickTab(\'plan\')">Plan</button><button type="button" class="pl-src' + (tripTab === 'route' ? ' on' : '') + '" onclick="tripPickTab(\'route\')">Day route</button><button type="button" class="pl-src' + (tripTab === 'map' ? ' on' : '') + '" onclick="tripPickTab(\'map\')">Map</button></div>'; // r78: مسار اليوم (اللوحة ٦)
  const city = cities.find(function(c){ return c.cityId === tripCitySel; }) || cities[0];
  if (city) html += tripStayCardHtml(trip, city, readOnly);
  if (currentUserSuspended) html += '<div style="border:1.5px dashed var(--danger); background:var(--ivory-bright); border-radius:10px; padding:10px 12px; margin-bottom:10px; text-align:center; font-size:11.5px; color:var(--danger); font-weight:700;">🚫 Suspended — can\'t add or edit places</div>';
  if (tripTab === 'map'){ const pts = []; days.forEach(function(d){ tripDayEntries(d).forEach(function(e){ const g = (e._p && e._p.geo) || e.geo; if (e._available !== false && g && typeof g.lat === 'number') pts.push(Object.assign({}, e._p || {}, { name: (e._p && e._p.name) || e.name, geo: g, _day: d.n })); }); });
    html += '<div class="ctx" style="text-align:center;">' + pts.length + ' of ' + np + ' places have a pin · numbers = day</div><div id="tripMapInline" class="geo-map"></div>'; wrap.innerHTML = html; renderInlineMap('tripMapInline', pts, function(p){ return p._day; }); return; }
  html += '<div class="chipgrid ' + (cityDays.length >= 3 ? 'c3' : 'c2') + '" id="tripDayGrid">' + cityDays.map(function(i){ const d = days[i]; const rs = tripDaySchedule(trip, d, tripCityOfDay(trip, d)); return '<button type="button" class="pl-src' + (i === tripDaySel ? ' on' : '') + '" onclick="tripPickDay(' + i + ')">Day ' + d.n + (rs.complete ? ' <span class="tr-tick' + (rs.late ? ' late' : '') + '">' + (rs.late ? '!' : '✓') + '</span>' : '') + '<span class="s">' + escapeHtml(d.date ? tripDateLabel(d.date) : (typeof d.from === 'number' ? 'arrival' : typeof d.to === 'number' ? 'departure' : '')) + '</span></button>'; }).join('') + '</div>'; // r78: علامة اليوم المكتمل مساره (أو المتأخر)
  const day = days[tripDaySel];
  if (day){
    const es = tripDayEntries(day); const dw = warns.filter(function(w){ return w.dayIdx === tripDaySel; });
    html += '<div class="ctx trip-ctx"><span>' + escapeHtml(tripDayLabel(day)) + (day.date ? ' · ' + escapeHtml(tripDateLabel(day.date)) : '') + ' — ' + es.length + (es.length === 1 ? ' stop' : ' stops') + (day.rest ? ' · 1 rest' : '') + '</span></div>';
    dw.forEach(function(w){ html += '<div class="trip-warn">⚠ ' + escapeHtml(w.text) + '</div>'; });
    if (tripTab === 'route'){ html += tripRouteTabHtml(trip, day, city, readOnly); }
    let n = 0; const avail = tripTab === 'route' ? [] : tripDayAvailable(day); // r78: في تبويب المسار لا تُعرض الفترات
    avail.forEach(function(p){ const arr = day.periods[p] || []; if (!arr.length && readOnly) return; let inner = '';
      if (p === 'afternoon' && day.rest && city){ inner += '<div class="trip-rest"><span><b>Rest at ' + escapeHtml((city.stay && city.stay.name) || 'your stay') + '</b> <span class="dim">· about ' + Math.round(day.rest.minutes / 60) + ' h</span></span>' + (readOnly ? '' : '<button type="button" class="actn" onclick="tripViewRestRemove()">Remove</button>') + '</div>'; }
      arr.forEach(function(e){ n++; inner += tripEntryCardHtml(e, n, readOnly, trip.id, city); });
      if (!arr.length) inner += '<div class="trip-empty-p">— nothing here' + (readOnly ? '' : ' · move a place in') + '</div>';
      html += placeGroupHtml(TRIP_PERIOD_LABEL[p], arr.length, '', inner, 'stop'); });
    if (!es.length && readOnly && tripTab !== 'route') html += '<div class="mp-empty mini">No places this day.</div>';
  }
  const tray = resolved.tray || [];
  if (tripTab !== 'route' && (tray.length || !readOnly)) html += '<div class="trip-tray' + (tray.length ? '' : ' empty') + '"><div class="trip-tray-h"><b>No day yet · ' + tray.length + '</b>' + (readOnly ? '' : '<span class="dim">tap a place to give it a day</span>') + '</div>' + tray.map(function(e){ const pl = e._p || {}; return '<button type="button" class="trip-tray-i" ' + (readOnly ? 'disabled' : 'onclick="tripOpenMoveSheet(\'' + attrStr(trip.id) + '\', \'' + attrStr(e.id) + '\')"') + '><span dir="auto">' + escapeHtml(pl.name || e.name || 'Place') + '</span>' + (!e.geo ? '<span class="dim">no pin</span>' : '<span class="arr">›</span>') + '</button>'; }).join('') + '</div>';
  if (!readOnly){
    html += '<div class="trip-foot"><button type="button" class="btn btn-ghost" onclick="openTripBuilder({ tripId: \'' + attrStr(trip.id) + '\', stage: 2 })">✏️ Edit</button><button type="button" class="btn btn-ghost" onclick="startAddingToTrip(\'' + attrStr(trip.id) + '\')">＋ Add places</button></div>' // أ-٢ · القرار ٨: زر Edit واحد يفتح المسودة
      + '<button type="button" class="actn danger wide" onclick="deleteTrip()">🗑️ Delete this trip</button>';
  }
  wrap.innerHTML = html;
}
function tripCurrent(){ return userTrips.find(t => t.id === currentTripId) || null; }
async function tripViewSave(trip){ await saveTrip(trip); resolvedTripCache[trip.id] = await resolveTripPlaces(trip); renderMyTripsModal(); }
async function tripViewRemove(entryId){ const trip = tripCurrent(); if (!trip) return; const f = tripFindEntry(trip.plan, entryId); if (!f) return; if (!(await mpConfirm('Remove ' + ((f.entry && f.entry.name) || 'this place') + ' from the trip?', { title: 'Remove from trip', ok: 'Remove', danger: true }))) return; tripDetach(trip.plan, entryId); await tripViewSave(trip); }
async function tripViewPromote(hostId, altId){ const trip = tripCurrent(); if (!trip) return; const f = tripFindEntry(trip.plan, hostId); if (!f || f.where !== 'day') return; const host = f.entry; const k = (host.alts || []).findIndex(function(a){ return a.id === altId; }); if (k < 0) return; const alt = host.alts[k]; host.alts.splice(k, 1); const hostAlts = host.alts; host.alts = []; alt.alts = [host].concat(hostAlts); trip.plan.days[f.dayIdx].periods[f.period][f.index] = alt; if (trip.plan.days[f.dayIdx].excursion === host.id) trip.plan.days[f.dayIdx].excursion = alt.id; await tripViewSave(trip); } // التبديل: البديل يصير الخيار ١ والأول يعود إلى القائمة
async function tripViewAlert(entryId){ const trip = tripCurrent(); if (!trip) return; const f = tripFindEntry(trip.plan, entryId); if (!f) return; const v = await mpSheet({ title: 'Alert for ' + (f.entry.name || 'this stop'), text: 'A short note you want to see on the day — e.g. closes at dusk, book ahead.', ok: 'Save', input: { value: f.entry.alert || '', placeholder: 'e.g. closes at dusk' } }); if (v === null || v === undefined) return; f.entry.alert = String(v || '').trim().slice(0, 80); await tripViewSave(trip); }
async function tripViewRestRemove(){ const trip = tripCurrent(); if (!trip || !trip.plan.days[tripDaySel]) return; trip.plan.days[tripDaySel].rest = null; await tripViewSave(trip); }
function tripOpenMoveSheet(tripId, entryId){ const trip = userTrips.find(t => t.id === tripId); if (!trip || !tripHasPlan(trip)) return; tripMoveSheet(trip.plan, tripSpec(trip), entryId, async function(changed){ if (!changed) return; await saveTrip(trip); delete resolvedTripCache[trip.id]; if (currentTab === 'Trips' && currentTripId === trip.id){ resolvedTripCache[trip.id] = await resolveTripPlaces(trip); renderMyTripsModal(); } }); }
async function deleteTrip(){
  if (!(await mpConfirm('This cannot be undone.', { title: '🗑 Delete this trip?', ok: 'Delete trip', danger: true }))) return; /* ب-٢-٢-أ٢ */
  try{ await mpData.trips.remove(currentTripId); }catch(e){}
  userTrips = userTrips.filter(t => t.id !== currentTripId);
  delete resolvedTripCache[currentTripId];
  currentTripId = null;
  renderMyTripsModal();
}
