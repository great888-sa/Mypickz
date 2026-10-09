/* =========================================================
   تصفح قوائم المستخدمين الآخرين (Community Lists)
   ========================================================= */
let communityUsers = [];
let communityTab = 'places';            // ر٦١ (السوق): places | trips
let communityScreen = 'root';           // ر٦٦ (القرار ١١): root | source — كل مصدر شاشة مستقلة بزر عودة
const communityScreenState = { places: { city: '', marked: false, sort: 'recent' }, trips: { city: '', marked: false, sort: 'recent' } }; // r72u (قرار المالك): الافتراضي recent — الشريحة نفسها قائمة الترتيبات // حالة كل شاشة تُحفظ
let communityMarkedOnly = false;
let communitySort = 'views';          // ر٦٤: views | bookmarks (للرحلات: bookmarks افتراضًا)
let communityCityFilter = '';   // 'city' | 'all'
// ر٥٣ (بيان الفرز · ق٠٢-٠٦ والمشهد ٦/د): الفرز الحي الوحيد اليوم المشاهدة؛ «Most saved» (مجموع الحفظات المنسوبة) يُفعَّل بمصدره الحي بالمرحلة ٣
let viewingUserUid = null;
let viewingUserData = null;
let communityViewingCityId = null;

async function loadCommunityLists(){
  try{
    const snap = await mpData.communityProfiles.withPublic();
    communityUsers = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (!d.nickname) return;
      communityUsers.push({
        uid: doc.id,
        nickname: d.nickname,
        publicCityIds: Array.isArray(d.publicCityIds) ? d.publicCityIds : [],
        viewCount: d.viewCount || 0
      });
    });
  }catch(e){ communityUsers = []; }
}

async function openCommunityModal(){
  mpTrack.hit('community_open', { depth: 1 });
  document.getElementById('communityBody').innerHTML = `<div class="mp-empty mini">Loading…</div>`;
  showBackdropUnlessHosted('communityBackdrop', 'Community'); // خ١
  await loadCommunityLists();
  // ر٦٩ي (N-043): ذاكرة آخر وضع — الجذر والتبويب والشاشة تبقى بين الزيارات (تُعاد عند الخروج فقط)
  if (typeof communityTab === 'undefined' || !communityTab) communityTab = 'places';
  renderCommunityModal();
}
function closeCommunityModal(){
  document.getElementById('communityBackdrop').classList.remove('show');
  viewingUserUid = null; personLayerOnly = null;
  if (HOSTED.Community && currentTab === 'Community') renderCommunityModal(); // خ١
}
// ر٦٩ح: switchCommunityTab حُذفت — الرأس القديم لشاشة المفكرة زال (N-040)

function renderCommunityModal(){
  const wrap = document.getElementById('communityBody');
  if (viewingUserUid){ renderCommunityUserList(wrap); return; }
  // ر٦٦ (القرار المؤسِّس ١١): الجذر مبدل ١×٢ + بحث الاسم؛ كل مصدر شاشة مستقلة بزر عودة تحفظ حالتها
  communityScreen = 'source'; cmLoadCitySummary(); // r72s (قرار المالك): لا شاشة مدخل — الشاشة الواحدة؛ الملخص لبطاقة المصادر
  const tabT = communityTab === 'trips';
  const st = communityScreenState[communityTab];
  communityMarkedOnly = st.marked; communitySort = st.sort; communityCityFilter = st.city;
  const sortOpts = tabT ? [['recent', 'All · recent'], ['bookmarks', 'Users trips most bookmarked'], ['copies', 'Trips most saved by users'], ['views', 'Users trips most viewed']] : [['recent', 'All · recent'], ['views', 'Users places most viewed'], ['bookmarks', 'Users places most bookmarked'], ['copies', 'Places most saved by users']]; // r72s (قرار المالك): «All · recent» خيار بلا ترتيب يبقى متاحًا؛ Sort by على All users وحدها
  const sortLbl = (sortOpts.find(function(x){ return x[0] === st.sort; }) || sortOpts[0])[1].replace(' · M4.26', '');
  let html = '<div class="stickyhead"><div class="chipgrid c2"><button type="button" class="pl-src' + (!tabT ? ' on' : '') + '" onclick="cmPickTab(\'places\')">Places</button><button type="button" class="pl-src' + (tabT ? ' on' : '') + '" onclick="cmPickTab(\'trips\')">Trips</button></div>' // r72s: الصف الأول مبدّل المصدر (لا مدخل ولا زر عودة)
    + '<div id="cmCityRow">' + cmCityRowHtml() + '</div>' // ر٧٠هـ: الشريحة والحقل باللوحة المشتركة — تُملأ من محتوى السوق بعدّاده
    + (communityTab === 'places' ? '<div id="cmCatRow">' + cmCatRowHtml() + '</div>' : '') // ر٧٠ط (N-082): التصفية رئيسي ← فرعي على قوائم الآخرين
    + '<div class="chipgrid c2"><button type="button" class="chip" onclick="cmAllChip()">' + (tabT ? 'All users trips' : 'All users places lists') + ' <span class="srcsub">· ' + escapeHtml(sortLbl === 'All · recent' ? 'recent' : sortLbl.toLowerCase()) + ' ' + (cmSortOpen ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</span></button>' // r72w: بلا خفوت // r72u (قرار المالك): الشريحة نفسها قائمة منسدلة بالترتيبات (الافتراضي recent)
    + '<button type="button" class="chip' + (cmSearchOpen ? ' on' : '') + '" onclick="cmToggleSearch()">Search by username <span class="arr">' + (cmSearchOpen ? '⌃' : '⌄') + '</span></button></div><div id="cmSortPanel">' + (cmSortOpen && !st.marked ? pickerPanel({ id: 'cmSort', bare: true, onPick: 'cmPickSort', items: sortOpts.map(function(x){ return { id: x[0], name: x[1], count: cmSortCounts()[x[0]], selected: st.sort === x[0] }; }) }) : '') + '</div>' + (cmSearchOpen ? '<div class="headrow"><input id="cmSearch" class="csel" style="flex:1;" placeholder="Type a username" onkeydown="if(event.key===\'Enter\')cmSearchGo()"><button type="button" class="actn primary hact" onclick="cmSearchGo()">Go</button></div>' : '')
    + '<div class="chipgrid c1"><button type="button" class="chip' + (st.marked ? ' on' : '') + '" onclick="cmSetBrowse(\'mine\')">🔖 My bookmarked from users</button></div>' // r72u: وحدها بمنتصف الصف الأخير
    + '<div class="ctx" id="cmCtx"><b>Community · ' + (tabT ? 'Trips' : 'Places') + (st.marked ? ' · 🔖 mine' : '') + '</b> · ' + (st.city ? escapeHtml((allCities().find(function(c){ return c.id === st.city; }) || {}).name || st.city) : 'All cities') + (!st.marked ? ' · <span class="dim">' + escapeHtml(sortLbl.toLowerCase()) + '</span>' : '') + '</div></div>'
    + '<div id="cmMarket"><div class="mp-empty mini">Loading…</div></div>';
  wrap.innerHTML = html;
  cmLoadMarket();
}
function cmPickTab(src){ communityTab = src; communityScreen = 'source'; renderCommunityModal(); } // r72s: مبدّل المصدر بالشاشة الواحدة
// ر٦٩ب (ميداني): Open يفتح أماكن القائمة مباشرة — طبقة الشخص بابٌ من الاسم لا ممرًّا إجباريًّا (N-008)
let cmDirect = false; // ر٦٩ذ: فُتحت القائمة من السوق مباشرة فالرجوع إليه
function cmLayerBack(){ communityUserTripsCity = ''; if (cmDirect){ cmDirect = false; viewingUserUid = null; communityUserLayer = null; } else { communityUserLayer = null; } renderCommunityModal(); }
async function cmOpenList(owner, cityId, origin){ cmDirect = true; communityTab = 'places'; personLayerOnly = null; await viewCommunityUser(owner); openCommunityCityList(cityId, origin); } // r72u: مصدر الأماكن دائمًا · ب-٢-١: المنشأ يُمرَّر إلى نقطة العدّ الواحدة
let cmSortOpen = false; // r72r-2
let cmSearchOpen = false; // r72s
let cmLastRows = []; // r72w: الصفوف المحمَّلة (بعد مرشِّح المدينة) — للأعداد بقائمة الترتيب
function cmSortCounts(){ const rows = cmLastRows || []; const tabT = communityTab === 'trips'; return { recent: rows.length, views: tabT ? rows.length : rows.filter(function(r){ return (r.viewCount || 0) > 0; }).length, bookmarks: rows.filter(function(r){ return ((tabT ? r.saveCount : r.bookmarkCount) || 0) > 0; }).length, copies: rows.filter(function(r){ return (r.copyCount || 0) > 0; }).length }; }
function cmToggleSearch(){ cmSearchOpen = !cmSearchOpen; renderCommunityModal(); if (cmSearchOpen){ const el = document.getElementById('cmSearch'); if (el) el.focus(); } }
function cmAllChip(){ const st = communityScreenState[communityTab]; if (st.marked){ st.marked = false; st.shared = false; cmSortOpen = true; } else { cmSortOpen = !cmSortOpen; } renderCommunityModal(); } // r72u: All users … = قائمة الترتيبات
function cmPickSort(id){ cmSortOpen = false; const st = communityScreenState[communityTab]; st.marked = false; st.shared = false; st.sort = id; renderCommunityModal(); } // r72t (M4.26 ٣): مشاهدات الرحلة عامة
function cmSetBrowse(mode){ // r72r-2: all (يُبقي الترتيب) · mine (مفكرتي) — Shared with me انتقلت إلى الأماكن والرحلات
  const st = communityScreenState[communityTab]; st.shared = false;
  if (mode === 'mine'){ st.marked = true; }
  else if (mode === 'all'){ st.marked = false; }
  else { st.marked = false; st.sort = mode; }
  renderCommunityModal();
}
function cmCityChanged(v){ communityScreenState[communityTab].city = v || ''; pickerRowClose('cmCity'); renderCommunityModal(); }
let __cmCityRows = [];
function cmCityLabel(id){ const r = cmSummaryRows().find(function(x){ return x.cityId === id; }); return (r && r.cityName) || (allCities().find(function(c){ return c.id === id; }) || {}).name || id; }
const __cmSummary = {}; // ر٧٠هـ-٢: ملخص السوق لكل مصدر (places · trips) للجلسة — صفوف المحتوى العام لغير المستخدم
function cmSummaryRows(){ return __cmSummary[communityTab] || __cmCityRows || []; }
async function cmLoadCitySummary(){
  const tab = communityTab;
  if (!__cmSummary[tab]){
    try{
      let rows = (tab === 'trips') ? await mpData.trips.publicTrips() : await mpData.cityLists.publicLists();
      if (tab !== 'trips') rows = (rows || []).filter(function(r){ return liveCountOf(r.categories) > 0; }); // ر٧٠ط-٢
      if (currentUser) rows = (rows || []).filter(function(r){ return (r.ownerId || (r.id || '').split('_')[0]) !== currentUser.uid; });
      __cmSummary[tab] = rows || [];
    }catch(e){ __cmSummary[tab] = []; }
  }
}
let cmFilterMain = '', cmFilterSub = ''; // ر٧٠ط (N-082)
function cmCatFilterHit(catId){ const c = catIdNew(catId); if (cmFilterSub) return c === cmFilterSub; if (cmFilterMain) return sectionIdOf(c) === cmFilterMain; return true; }
function cmApplyCatFilter(rows){
  if (!cmFilterMain && !cmFilterSub) return rows;
  return rows.map(function(r){ let n = 0; Object.keys(r.categories || {}).forEach(function(k){ if (cmCatFilterHit(k)) n += ((r.categories[k] || {}).places || []).length; }); r._matches = n; return r; }).filter(function(r){ return r._matches > 0; });
}
function cmCatCountOf(catId){ let n = 0; cmSummaryRows().forEach(function(r){ Object.keys(r.categories || {}).forEach(function(k){ if (catIdNew(k) === catId) n += ((r.categories[k] || {}).places || []).length; }); }); return n; }
function cmPlaceNamesOf(catId){ const out = []; cmSummaryRows().forEach(function(r){ Object.keys(r.categories || {}).forEach(function(k){ if (catIdNew(k) === catId) ((r.categories[k] || {}).places || []).forEach(function(q){ if (q && q.name) out.push(q.name); }); }); }); return out; }
catPairRegister('cmFilter', function(v){ cmFilterMain = v || ''; cmFilterSub = ''; renderCommunityModal(); }, function(v){ cmFilterSub = v || ''; renderCommunityModal(); }); /* ر٧٣-أب (٢) — ملاحظة المالك: منتقي تصنيفات المجتمع لم يكن مسجَّلًا */
function cmCatRowHtml(){ return catPairRow({ id: 'cmFilter', main: cmFilterMain, sub: cmFilterSub, allowAll: true, allLabel: 'All categories', allSubLabel: 'All in this category', countOf: cmCatCountOf, placesOf: cmPlaceNamesOf, rerender: 'renderCommunityModal' }); }
function cmCityRowHtml(){
  const st = communityScreenState[communityTab]; const seen = {}, cnt = {};
  ((__cmCityRows && __cmCityRows.length) ? __cmCityRows : cmSummaryRows()).forEach(function(r){ if (!r.cityId) return; if (!seen[r.cityId]) seen[r.cityId] = r.cityName || r.cityId; cnt[r.cityId] = (cnt[r.cityId] || 0) + 1; });
  const cur = st.city && seen[st.city] ? seen[st.city] : (st.city ? ((allCities().find(function(c){ return c.id === st.city; }) || {}).name || st.city) : 'Select city'); // ر٧٠و (N-078)
  return pickerRow({ id: 'cmCity', label: cur, placeholder: 'Type a city…', onPick: 'cmCityChanged',
    items: [{ id: '', name: 'All cities', count: (__cmCityRows || []).length, selected: !st.city }].concat(Object.keys(seen).sort().map(function(id){ return { id: id, name: seen[id], count: cnt[id], selected: st.city === id }; })) });
}
async function cmSearchGo(){
  const el = document.getElementById('cmSearch');
  const q = ((el && el.value) || '').trim().toLowerCase();
  if (!q) return;
  try{
    const d = await mpData.nicknames.get(q);
    if (d.exists && d.data().uid){
      const city = communityScreenState[communityTab].city; // ر٧٠و (N-079): المدينة مرشِّح اختياري للبحث
      if (city){
        const uid = d.data().uid; const has = cmSummaryRows().some(function(r){ return r.cityId === city && (r.ownerId || String(r.id || r.docId || '').split('_')[0]) === uid; });
        if (!has){ showToast('No public content by this user in ' + cmCityLabel(city) + ' — choose All cities to search everywhere'); return; }
      }
      viewCommunityUser(d.data().uid); return;
    }
  }catch(e){}
  showToast("This name doesn't exist");
}
function cmFillCityPick(rows){ (arguments[0] || []).forEach(function(r){ if (r && r.cityId && r.cityName) rememberCity(r.cityId, r.cityName); }); // ز-١-ج-٢ // البند ٢: مدن المحدد من المحتوى الموجود فعلًا — ر٧٠هـ: بعدّاد القوائم/الرحلات لكل مدينة
  __cmCityRows = rows || []; __cmSummary[communityTab] = __cmCityRows; // ر٧٠هـ-٢: الملخص يتحدث مع كل تحميل للسوق
  const host = document.getElementById('cmCityRow'); if (host) host.innerHTML = cmCityRowHtml();
}
async function renderSharedTripsInto(host){ // r72r-1: الرحلات المشارَكة معي — تُعرض بوجهة الرحلات (Show → Shared with me)
  await ensureTripSaves();
  for (const t of sharedTrips){ if (!t.ownerName && t.ownerId){ const known = (typeof communityUsers !== 'undefined' && communityUsers.find(function(u){ return u.uid === t.ownerId; })); if (known) t.ownerName = known.nickname; else { try{ const p = await mpData.profiles.get(t.ownerId); t.ownerName = (p && p.nickname) || 'user'; }catch(e){ t.ownerName = 'user'; } } } }
  host.innerHTML = sharedTrips.length ? sharedTrips.map(function(t){ return othersCard({ title: escapeHtml(tripTitle(t)) + (t.ownerId ? ' — ' + ownerLink(t.ownerId, t.ownerName) : ''), sub: (tripTypeLine(t) ? tripTypeLine(t) + ' · ' : '') + 'Shared with you by name', bmOn: !!(tripSavesMap && tripSavesMap[t.id]), cnt: t.saveCount || 0, bmHandler: "toggleTripSave('" + attrStr(t.id) + "')", saveHandler: "copyOthersTrip('" + attrStr(t.id) + "')", savedOn: !!tripCopyOf(t.id), unsaveHandler: "removeMyTripCopy('" + attrStr(t.id) + "')", reportKind: 'trip', reportKey: t.id, exportHandler: "exportOwnTripRow('" + attrStr(t.id) + "')", openHandler: "openSharedTripDetail('" + attrStr(t.id) + "')" }); }).join('') : '<div class="mp-empty">No trips shared with you yet.</div>';
}
async function renderSharedListsInto(host){ // r72r-1: القوائم المشارَكة معي — تُعرض بوجهة الأماكن (Show → Shared with me)
  await loadSharedCityLists(); await ensureListBookmarks(); // ر٦٩ج:
  for (const r of sharedCityLists){ const o = r.ownerId || String(r.docId || '').split('_')[0]; if (!r.ownerName){ const known = (typeof communityUsers !== 'undefined' && communityUsers.find(function(u){ return u.uid === o; })); if (known) r.ownerName = known.nickname; else { try{ const p = await mpData.profiles.get(o); r.ownerName = (p && p.nickname) || 'user'; }catch(e){ r.ownerName = 'user'; } } } } // ر٦٩ج: الاسم المستعار من ملف الصاحب المحمّل القائم (كان يخدم القسم المحذوف بالأماكن) يخدم الشريحة الآن
  host.innerHTML = sharedCityLists.length ? sharedCityLists.map(function(r){
    const owner = r.ownerId || String(r.docId || '').split('_')[0]; const cityId = r.cityId || String(r.docId || '').split('_').slice(1).join('_');
    const cityName = (allCities().find(function(x){ return x.id === cityId; }) || {}).name || cityId; const listId = owner + '_' + cityId;
    return othersCard({ title: escapeHtml(cityName) + ' — ' + ownerLink(owner, r.ownerName), sub: 'Shared with you by name', bmOn: !!(listBookmarksMap && listBookmarksMap[listId]), cnt: r.bookmarkCount || 0, bmHandler: "toggleListBookmark('" + attrStr(owner) + "', '" + attrStr(cityId) + "')", reportKind: 'list', reportKey: owner + '_' + cityId, saveMsg: 'Copy this list into yours — stage 3', exportHandler: "exportOtherList('" + attrStr(owner) + "', '" + attrStr(cityId) + "')", openHandler: "plOpenSharedList('" + attrStr(owner) + "', '" + attrStr(cityId) + "')" });
  }).join('') : '<div class="mp-empty">No lists shared with you yet.</div>';
}
function plOpenSharedList(owner, cityId){ /* r74b-٢: فتح قائمة مشارَكة معي من وجهة الأماكن — عدّاد open_app (§١٧-ج) انتقل هنا من نافذة My List المحذوفة (كان openSharedCityList يسجّله على الفتح نفسه) */
  cmOpenList(owner, cityId, 'app'); /* ب-٢-١: العدّ بنقطة واحدة (openCommunityCityList) بمنشأ app — كان يُعدّ هنا ثم يمرّ بالمجتمع فيُحتمل عدّه مرتين */
}
function cmGroupByOwner(rows, ownerOf, nameOf, cardOf){ // r72r-3: مجموعة عاجية لكل مستخدم — رأسها كبسولته (الحرفان + الاسم) وتحته بطاقاته
  const groups = []; const byO = {};
  rows.forEach(function(r){ const o = ownerOf(r) || ''; if (!byO[o]){ byO[o] = { owner: o, name: nameOf(r) || 'user', rows: [] }; groups.push(byO[o]); } byO[o].rows.push(r); });
  return groups.map(function(g){ const nm = g.name || 'user'; const ini = curInitials({ nickname: nm }); const head = '<button type="button" class="curpill cmpill" onclick="openCommunityUserFrom(\'' + attrStr(g.owner) + '\')"><span class="curring">' + escapeHtml(ini) + '</span><span class="curnm">' + escapeHtml(nm) + '</span></button>';
    return '<div class="pgroup"><div class="pg-head">' + head + '<span class="pg-n"># ' + g.rows.length + '</span></div>' + g.rows.map(cardOf).join('') + '</div>'; }).join('');
}
async function openCommunityUserFrom(uid){ cmDirect = false; await viewCommunityUser(uid); } // رأس المستخدم يفتح طبقة الشخص
async function cmLoadMarket(){
  const host = document.getElementById('cmMarket'); if (!host) return;
  const tabT = communityTab === 'trips';
  try{
    if (communityMarkedOnly){
      if (tabT) await renderBookmarkedTripsInto(host);
      else await renderBookmarkedLists(host, '');
      return;
    }
    if (communityScreenState[communityTab].shared){ // ر٦٩ (N-010) · r72r-1: المشارَك انتقل إلى الأماكن والرحلات — يبقى هنا حتى r72r-2
      if (tabT) await renderSharedTripsInto(host); else await renderSharedListsInto(host);
      return;
    }
    if (!tabT){
      let rows = await mpData.cityLists.publicLists();
      rows = rows.filter(function(r){ return liveCountOf(r.categories) > 0; }); // ر٧٠ط-٢: لا قائمة بلا مكان بالسوق (احترازي للموروث حتى يُفتح من صاحبه)
      if (currentUser) rows = rows.filter(function(r){ return (r.ownerId || (r.id || '').split('_')[0]) !== currentUser.uid; }); // ر٦٩ب: المجتمع سوق الآخرين — ملكك يسكن الأماكن (المبدأ الحاكم)
      cmFillCityPick(rows);
      if (communityCityFilter) rows = rows.filter(function(r){ return r.cityId === communityCityFilter; });
      rows = cmApplyCatFilter(rows); // ر٧٠ط: قوائم فيها مطابقة للتصنيف المختار (بعدّاد المطابقات)
      cmLastRows = rows.slice(); // r72w: للأعداد بقائمة الترتيب
      if (communitySort === 'bookmarks') rows = rows.filter(function(r){ return (r.bookmarkCount || 0) > 0; }); // ر٦٩م (N-047): «الأكثر تمييزًا» = ما له تمييز فعلًا
      if (communitySort === 'views') rows = rows.filter(function(r){ return (r.viewCount || 0) > 0; });
      if (communitySort === 'copies') rows = rows.filter(function(r){ return (r.copyCount || 0) > 0; }); // r72m: «الأكثر حفظًا» = ما نُسخ فعلًا
      rows.sort(function(a, b){ return communitySort === 'copies' ? (b.copyCount || 0) - (a.copyCount || 0) : communitySort === 'bookmarks' ? (b.bookmarkCount || 0) - (a.bookmarkCount || 0) : communitySort === 'recent' ? String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')) : (b.viewCount || 0) - (a.viewCount || 0); });
      if (!rows.length){ host.innerHTML = '<div class="mp-empty">' + (communitySort === 'bookmarks' ? 'No bookmarked lists yet' : communitySort === 'views' ? 'No viewed lists yet' : 'No public lists yet') + (communityCityFilter ? ' in this city' : '') + '.</div>'; return; }
      host.innerHTML = cmGroupByOwner(rows, function(r){ return r.ownerId || (r.id || '').split('_')[0]; }, function(r){ return r.nickname; }, function(r){ // r72r-3: التجميع بالمستخدم — كبسولته رأسًا وتحته قوائمه
        const owner = r.ownerId || (r.id || '').split('_')[0]; const cnt = r.bookmarkCount || 0; cmCache.lists[owner + '_' + r.cityId] = r; const mine = !!(currentUser && owner === currentUser.uid);
        const places = Object.values(r.categories || {}).reduce(function(a, e){ return a + ((e && e.places) || []).length; }, 0);
        return othersCard({ title: escapeHtml(r.cityName || r.cityId), sub: 'Places # ' + places + (r._matches ? ' · matches # ' + r._matches : ''), stat: (r.viewCount || 0) + ' views', bmSelf: mine, bmOn: !!(listBookmarksMap && listBookmarksMap[owner + '_' + r.cityId]), cnt: cnt, bmHandler: "toggleListBookmark('" + attrStr(owner) + "', '" + attrStr(r.cityId) + "')", reportKind: 'list', reportKey: owner + '_' + r.cityId, saveHandler: "saveOthersList('" + attrStr(owner) + "', '" + attrStr(r.cityId) + "')", savedOn: !!myCopiedLists[owner + '_' + r.cityId], unsaveHandler: "showToast('Remove copied places from your list in Places')", exportHandler: "openExportPreview('olist', '" + attrStr(owner + '_' + r.cityId) + "')", openHandler: "cmOpenList('" + attrStr(owner) + "', '" + attrStr(r.cityId) + "')" });
      });
    } else {
      let rows = await mpData.trips.publicTrips();
      if (currentUser) rows = rows.filter(function(t){ return t.ownerId !== currentUser.uid; }); // ر٦٩ب: رحلاتك تسكن الرحلات لا المجتمع
      cmFillCityPick(rows);
      if (communityCityFilter) rows = rows.filter(function(r){ return r.cityId === communityCityFilter; });
      cmLastRows = rows.slice(); // r72w
            if (communitySort === 'bookmarks') rows = rows.filter(function(t){ return (t.saveCount || 0) > 0; }); // ر٦٩م (N-047)
            if (communitySort === 'copies') rows = rows.filter(function(t){ return (t.copyCount || 0) > 0; }); // r72m
rows.sort(function(a, b){ return communitySort === 'recent' ? String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')) : communitySort === 'copies' ? (b.copyCount || 0) - (a.copyCount || 0) : communitySort === 'views' ? (b.viewCount || 0) - (a.viewCount || 0) : (b.saveCount || 0) - (a.saveCount || 0); }); // r72t: views بالرحلات
      if (!rows.length){ host.innerHTML = '<div class="mp-empty">No public trips yet' + (communityCityFilter ? ' in this city' : '') + '.</div>'; return; }
      const nick = {}; (communityUsers || []).forEach(function(u){ nick[u.uid] = u.nickname; });
      host.innerHTML = cmGroupByOwner(rows, function(t){ return t.ownerId || ''; }, function(t){ return t.ownerName || nick[t.ownerId]; }, function(t){ // r72r-3
        const cnt = t.saveCount || 0; const title = t.customLabel ? (t.cityName + ' — ' + t.customLabel) : (t.cityName || 'Trip'); t.ownerName = t.ownerName || nick[t.ownerId]; cmCache.trips[t.id] = t; const mine = !!(currentUser && t.ownerId === currentUser.uid);
        return othersCard({ title: escapeHtml(title), sub: (tripTypeLine(t) ? tripTypeLine(t) : 'Trip') + ' · places # ' + tripPlaceCount(t) + ' · days # ' + ((t.days && t.days.length) || 0), lines: [['Saved by users', '# ' + (t.copyCount || 0)]], bmSelf: mine, bmOn: !!(tripSavesMap && tripSavesMap[t.id]), cnt: cnt, bmHandler: "toggleTripSave('" + attrStr(t.id) + "')", saveHandler: "copyOthersTrip('" + attrStr(t.id) + "')", savedOn: !!tripCopyOf(t.id), unsaveHandler: "removeMyTripCopy('" + attrStr(t.id) + "')", reportKind: 'trip', reportKey: t.id, exportHandler: "openExportPreview('otrip', '" + attrStr(t.id) + "')", openHandler: "openCommunityTrip('" + attrStr(t.id) + "')" });
      });
    }
  }catch(e){ mpSwallow(e, 'market'); host.innerHTML = '<div class="mp-empty">Could not load — try again.</div>'; }
}

let viewingUserCities = []; // تفاصيل المدن العامة الكاملة (فئات/أماكن) — تُحمَّل فقط لحظة فتح ملف شخص معيّن (Lazy)

// ═══ ر٧٢-أ-١ (إعادة البناء من المسودة البصرية v2 — ١٦ سبتمبر): شبكة المنتقين · صفحة المنتقي · الشرائح الست · شاشة المدينة · حالة «أنا» — على القواعد الحية بلا نشرة
let curators = null, curFilterCity = '', curNameQ = '', curCityOpen = false, curShown = 30, curSort = 'updated'; // ر٧٢-أ-١و/ح: الترتيب (updated · views · following) — الافتراضي الأحدث تحديثًا
let curPage = null, curChip = null, curCity = null, curSearchQ = '', curArchiveOf = null, curCitiesOpen = false, curCitiesAuto = false;
const curData = {}; // uid → { cities:[{id,name,count,categories}], trips:[...], loaded }
const CUR_BADGE = 'Curator'; // نص الشارة (قرار المالك) — بالعربية «منتقٍ» حيث تُعرض
function curName(u){ return u.nickname || 'Curator'; } // r72q-1 (قرار المالك): الاسم من الحساب دائمًا — displayName أُلغي (يبقى بالقواعد بلا استعمال) والشعار حقل مستقل tagline
function curInitials(u){ const n = curName(u).trim(); const parts = n.split(/\s+/); return (parts.length > 1 ? parts[0].charAt(0) + parts[1].charAt(0) : n.slice(0, 2)).toUpperCase(); }
function curUpdatedAt(u){ const t = u.updatedAt; if (!t) return 0; if (typeof t === 'number') return t; if (t && typeof t.toMillis === 'function') return t.toMillis(); const d = Date.parse(t); return isNaN(d) ? 0 : d; }
function curAgo(u){ const t = curUpdatedAt(u); if (!t) return 'updated —'; const d = Math.max(0, Math.round((Date.now() - t) / 86400000)); return d === 0 ? 'updated today' : 'updated ' + d + 'd ago'; }
function curFollowers(u){ return (u.showFollowerCount !== false && typeof u.followerCount === 'number') ? u.followerCount : null; }
function curIsMe(u){ return !!(currentUser && u && u.uid === currentUser.uid); }
function curIsFollowing(uid){ const f = (userListData && Array.isArray(userListData.following)) ? userListData.following : []; return f.indexOf(uid) >= 0; }
function curSorted(){ // ر٧٢-أ-١و/ح (قرار المالك): مرشِّحات النشاط — الأحدث تحديثًا · الأكثر مشاهدة · المتابَعون؛ لا ترتيب بعدد المتابعين أبدًا؛ «You» أولًا
  let rows = (curators || []).slice();
  if (curSort === 'following') rows = rows.filter(function(u){ return curIsFollowing(u.uid); });
  const you = function(u){ return curIsMe(u) ? -1 : 0; };
  rows.sort(function(a, b){ const y = you(a) - you(b); if (y) return y;
    if (curSort === 'views'){ const v = (b.viewCount || 0) - (a.viewCount || 0); if (v) return v; }
    const t = curUpdatedAt(b) - curUpdatedAt(a); if (t) return t;
    return curName(a).localeCompare(curName(b)); });
  return rows;
}
function curSortLabel(){ return { views: 'most viewed', updated: 'recently updated', following: 'following' }[curSort] || ''; }
async function curLoadContent(uid){ // مدنه وأماكنه ورحلاته العامة — المصدر الصحيح: مستندات قوائمه العامة نفسها (اسم المدينة وأماكنها)
  if (curData[uid] && curData[uid].loaded) return curData[uid];
  const u = (curators || []).find(function(x){ return x.uid === uid; }) || {}; const out = { cities: [], trips: [], loaded: false };
  try{
    let docs = []; let qErr = null;
    try{ docs = await mpData.cityLists.publicByOwner(uid); }catch(e){ qErr = (e && (e.code || e.message)) || 'query failed'; } /* خ-٦: الفهرس وحده (الأم) — المدينة تُركَّب كاملة عند فتحها (curEnsureCity) */
    const ids0 = Array.isArray(u.publicCityIds) ? u.publicCityIds : []; const have = {}; docs.forEach(function(d){ if (d && d.cityId) have[d.cityId] = true; });
    const extra = await Promise.all(ids0.filter(function(c){ return !have[c]; }).map(function(cid){ return mpData.cityLists.getIndex(uid, cid).catch(function(){ return null; }); })); // ر٧٢-أ-١و: المسار المثبَت بالمجتمع (مستندات الملف العام) يُضم إلى الاستعلام — لا تفاوت بين الواجهتين
    docs = docs.concat(extra.filter(Boolean)); const ids = docs.map(function(d){ return d.cityId; });
    logTiming('[CUR] content ' + uid.slice(0, 6) + ': query=' + (qErr ? 'ERR ' + qErr : (docs.length - extra.filter(Boolean).length)) + ' profile=' + ids0.length + ' union=' + docs.length);
    docs.forEach(function(d, i){ if (!d || d.public !== true) return; const cats = (d.categories && typeof d.categories === 'object') ? d.categories : {}; const n = Object.keys(cats).reduce(function(a, k){ return a + ((cats[k] && cats[k].places) || []).filter(function(p){ return p && (p.name || p.url); }).length; }, 0); if (!n) return; /* ر٧٢-أ-١د: مدينة بلا أماكن لا تُعرض */ out.cities.push({ id: d.cityId || ids[i], name: d.cityName || (allCities().find(function(c){ return c.id === (d.cityId || ids[i]); }) || {}).name || ids[i], count: n, categories: cats, _full: d._indexOnly !== true }); });
    try{ out.trips = await mpData.trips.publicByOwner(uid); }catch(e){ out.trips = []; }
  }catch(e){ mpSwallow(e, 'curator content'); }
  out.loaded = true; curData[uid] = out; return out;
}
function curPrimeLayerFromCurator(uid){ /* ر٧٣-أب (٢): طبقة المستخدم بالمجتمع من بيانات صفحة المنتقي المحمَّلة (لا قراءة جديدة) */ const d = curData[uid]; if (!d || !d.loaded) return false; const u = (curators || []).find(function(x){ return x.uid === uid; }) || (communityUsers || []).find(function(x){ return x.uid === uid; }); if (!u) return false;
  viewingUserUid = uid; viewingUserData = Object.assign({ publicCityIds: d.cities.map(function(c){ return c.id; }) }, u); viewingUserCities = d.cities.map(function(c){ return { id: c.id, name: c.name, categories: c.categories || {}, _full: c._full === true, _src: c, favoriteCount: 0, bookmarkCount: c.bookmarkCount || 0, viewCount: c.viewCount || 0 }; }); communityUserTrips = (d.trips || []).slice(); communityUserLayer = null; communityViewingCityId = null; viewingCommunityTripId = null; vcuStep = 'done'; return true; }
async function curEnsureCity(uid, cityId){ /* خ-٦: تحميل المدينة عند فتحها — تركيب مستنداتها الفرعية مرة بالجلسة؛ قبلها الفهرس يكفي للعدّ والبطاقات */
  const d = curData[uid]; if (!d) return null; const c = (d.cities || []).find(function(x){ return x.id === cityId; }); if (!c || c._full) return c || null;
  try{ const full = await mpData.cityLists.get(uid, cityId); if (full && full.categories && typeof full.categories === 'object'){ c.categories = full.categories; c._full = true; logTiming('[CUR] city composed ' + cityId + ' cats=' + Object.keys(full.categories).length); } }catch(e){ mpSwallow(e, 'curator city'); }
  return c;
}
async function curHydrate(uid, items){ /* خ-٦: عناصر مختارة من الفهرس (مدينة · تصنيف · مكان) → تُقرأ مستندات التصنيفات المعنية فقط (مرة بالجلسة) وتُستبدل الأماكن الكاملة بمعرّفها */
  const d = curData[uid]; if (!d) return items; d.cats = d.cats || {}; const pairs = {};
  items.forEach(function(it){ if (!it.pl || it.pl._index !== true) return; pairs[it.city.id + '|' + it.cat] = it; });
  await Promise.all(Object.keys(pairs).map(async function(k){ if (k in d.cats) return; const it = pairs[k]; try{ d.cats[k] = await mpData.cityLists.catDoc(uid, it.city.id, it.cat); }catch(e){ d.cats[k] = null; mpSwallow(e, 'curator cat'); } }));
  if (Object.keys(pairs).length) logTiming('[CUR] hydrate ' + Object.keys(pairs).length + ' cat doc(s) for ' + items.length + ' place(s)');
  return items.map(function(it){ if (!it.pl || it.pl._index !== true) return it; const cd = d.cats[it.city.id + '|' + it.cat]; const full = cd && (cd.places || []).find(function(p){ return p && p.id === it.pl.id; }); return full ? Object.assign({}, it, { pl: full }) : it; });
}
function curTripsIn(uid, cityId){ const d = curData[uid]; if (!d) return []; return (d.trips || []).filter(function(t){ return t.cityId === cityId || (Array.isArray(t.cities) && t.cities.indexOf(cityId) >= 0); }); }
async function renderCuratorsBody(){
  const body = document.getElementById('curatorsBody'); if (!body) return;
  if (!currentUser){ body.innerHTML = '<div class="mp-empty"><div class="big">✧</div>Sign in to see curators.</div>'; return; }
  if (curators === null){ body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = []; mpSwallow(e, 'curators'); } }
  if (curPage){ await renderCuratorPage(body); return; }
  const q = pickerNormalize(curNameQ);
  let rows = curSorted().filter(function(u){ return !curFilterCity || (u.publicCityIds || []).indexOf(curFilterCity) >= 0; });
  if (q) rows = rows.filter(function(u){ return pickerNormalize(curName(u)).indexOf(q) >= 0 || pickerNormalize(u.nickname || '').indexOf(q) >= 0; });
  const cityIds = {}; (curators || []).forEach(function(u){ (u.publicCityIds || []).forEach(function(c){ cityIds[c] = (cityIds[c] || 0) + 1; }); });
  const cityItems = Object.keys(cityIds).map(function(id){ const c = allCities().find(function(x){ return x.id === id; }) || myListAllCities().find(function(x){ return x.id === id; }); return { id: id, name: (c && c.name) || id, count: cityIds[id], selected: id === curFilterCity }; }).sort(function(a, b){ return b.count - a.count; });
  const cityLabel = curFilterCity ? ((cityItems.find(function(x){ return x.id === curFilterCity; }) || {}).name || curFilterCity) : 'City';
  let h = '<div class="stickyhead"><div class="headrow"><button type="button" class="csel' + (curCityOpen ? ' on' : '') + '" onclick="curCityOpen = !curCityOpen; renderCuratorsBody()"><b>' + escapeHtml(cityLabel) + '</b> ' + (curCityOpen ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button><input type="text" class="csel grow psearch" placeholder="Type a name…" value="' + attrStr(curNameQ) + '" oninput="curNameQ = this.value; curShown = 30; curRerender()" autocomplete="off"></div>'
    + (curCityOpen ? pickerPanel({ id: 'curCity', bare: true, items: [{ id: '', name: 'All cities', selected: !curFilterCity }].concat(cityItems), onPick: 'curPickCity', emptyText: 'No curator in any city yet', limit: 20 }) : '')
    + '<div class="sixgrid three"><button type="button" class="pl-src' + (curSort === 'updated' ? ' on' : '') + '" onclick="curSort = \'updated\'; curShown = 30; renderCuratorsBody()">Recently updated</button><button type="button" class="pl-src' + (curSort === 'views' ? ' on' : '') + '" onclick="curSort = \'views\'; curShown = 30; renderCuratorsBody()">Most viewed</button><button type="button" class="pl-src' + (curSort === 'following' ? ' on' : '') + '" onclick="curSort = \'following\'; curShown = 30; renderCuratorsBody()">Following</button></div>'
    + '<div class="ctx"><b>Curators</b> · pick a curator · ' + rows.length + ' · ' + curSortLabel() + '</div></div>';
  if (!rows.length) h += '<div class="mp-empty mini">' + (curSort === 'following' ? 'You follow no curators yet' : (curFilterCity ? 'No curators in this city yet — try All cities' : 'No curators yet')) + '</div>';
  h += '<div class="curgrid2">' + rows.slice(0, curShown).map(curCellHtml).join('') + '</div>';
  if (rows.length > curShown) h += '<button type="button" class="actn wide" onclick="curShown += 30; renderCuratorsBody()">Show more (' + (rows.length - curShown) + ')</button>';
  body.innerHTML = h;
  curFillTripCounts(rows.slice(0, curShown)); // أعداد الرحلات تُقرأ بعد الرسم (قراءة لكل دائرة — بالعشرات مقبولة؛ حقل بالنشرة لاحقًا)
}
function curCellHtml(u){
  const d = curData[u.uid]; const nC = (d && d.loaded) ? d.cities.length : null; const nT = (d && d.loaded) ? (d.trips || []).length : null; // ر٧٢-أ-١هـ: الأعداد من المصدر الواحد (قوائمه العامة ذات الأماكن)
  const fc = curFollowers(u); const noPub = nC === 0 && nT === 0;
  return '<button type="button" class="curcell2" onclick="curOpen(\'' + attrStr(u.uid) + '\')">' + (curIsMe(u) ? '<span class="curyou">You</span>' : '') + '<span class="curpill"><span class="curring">' + escapeHtml(curInitials(u)) + '</span><span class="curnm">' + escapeHtml(curName(u)) + '</span></span>' // r72q-1 (قرار المالك): كبسولة بشكل الرأس بألوان الشبكة
    + '<span class="curmeta">' + (nC === null ? '…' : (noPub ? '— no public content yet' : ('cities # ' + nC + ' · trips # ' + nT))) + '</span>'
    + '<span class="curmeta">' + (fc !== null ? 'followers # ' + fc + ' · ' : '') + curAgo(u) + '</span></button>';
}
async function curFillTripCounts(rows){ let changed = false; for (const u of rows){ if (curData[u.uid] && curData[u.uid].loaded) continue; try{ await curLoadContent(u.uid); changed = true; }catch(e){} } if (changed && !curPage && currentTab === 'Curators') renderCuratorsBody(); } // ر٧٢-أ-١هـ: الأعداد بالشبكة من المحتوى نفسه
function curPickCity(id){ curFilterCity = id || ''; curCityOpen = false; curShown = 30; renderCuratorsBody(); }
function curRerender(){ const body = document.getElementById('curatorsBody'); if (!body) return; const inp = body.querySelector('input.psearch'); const pos = inp ? inp.selectionStart : null; renderCuratorsBody().then(function(){ const i2 = document.querySelector('#curatorsBody input.psearch'); if (i2){ i2.focus(); if (pos !== null){ try{ i2.setSelectionRange(pos, pos); }catch(e){} } } }); }
function curOpen(uid){ curPage = (curators || []).find(function(u){ return u.uid === uid; }) || null; if (!curPage) return; delete curData[uid]; if (!curIsMe(curPage)) try{ mpTrack.statsCurator(uid, 'page_view'); }catch(_){} /* r72p */ /* r72n: محتوى طازج بكل فتح (الأعداد بالشبكة تبقى من الذاكرة) */ curChip = null; curCity = null; curSearchQ = ''; renderCuratorsBody(); window.scrollTo(0, 0); }
function curBack(){ curPage = null; curCity = null; renderCuratorsBody(); }
function openConfirmModal(title, hint){ // ر٧٢-أ-٢ب: تأكيد بهوية التطبيق (قشرة نافذة الإدخال بلا حقل) — لا نوافذ المتصفح
  return new Promise(function(resolve){ modalResolve = function(v){ resolve(v !== null); }; inputModalFree = false; inputModalOptions = null;
    document.getElementById('inputModalTitle').textContent = title; const f = document.getElementById('inputModalField'); f.style.display = 'none'; f.value = 'ok';
    document.getElementById('inputModalSelect').style.display = 'none'; document.getElementById('inputModalList').style.display = 'none';
    document.getElementById('inputModalError').textContent = hint || ''; document.getElementById('inputBackdrop').classList.add('show'); });
}
async function curToggleFollow(uid){ // ر٧٢-أ-٢: متابعة/إلغاء ذرّيًّا؛ الإفصاح مرة عند أول متابعة؛ لا متابعة للذات
  if (!currentUser){ openAuthModal(); return; } if (uid === currentUser.uid) return;
  const on = !curIsFollowing(uid);
  if (on && !(userListData && userListData.followDisclosed)){ const ok = await openConfirmModal('Follow this curator?', 'Following is visible to the curator — your name appears in their followers.'); if (!ok) return; userListData.followDisclosed = true; try{ await mpData.userLists.merge(currentUser.uid, { followDisclosed: true }); }catch(e){} }
  const u = (curators || []).find(function(c){ return c.uid === uid; }) || {}; const hasPublic = u.hasAnyPublicContent === true || u.verified === true; // r72m: العدّاد للموثَّقين أيضًا (M4.25 ٥)
  try{ await mpData.follows.set(currentUser.uid, uid, on, hasPublic); }catch(e){ mpSwallow(e, 'follow'); logTiming('[CUR] follow failed uid=' + String(uid).slice(0, 6) + ' on=' + on + ' hasPublic=' + hasPublic + ' err=' + ((e && (e.code + ' ' + e.message)) || e)); showToast('Could not follow · ' + ((e && e.code) || (e && e.message) || 'unknown').toString().slice(0, 60)); return; } // ر٧٢-أ-٢ج: الرمز على الشاشة (قرار المالك)
  userListData.following = (userListData.following || []).filter(function(x){ return x !== uid; }); if (on) userListData.following.push(uid);
  if (hasPublic && typeof u.followerCount === 'number') u.followerCount = Math.max(0, u.followerCount + (on ? 1 : -1)); else if (hasPublic && on) u.followerCount = 1;
  if (on) try{ mpTrack.statsCurator(uid, 'follow'); }catch(_){} // r72p
  showToast(on ? 'Following ✓' : 'Unfollowed'); renderCuratorsBody();
}
async function curOpenFollowers(){ // للمنتقي عن نفسه: أسماء متابعيه (٥٠ ثم more)
  if (!currentUser) return; const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('👥 Followers', bd.classList.contains('show') ? openDashboard : null); /* ب-٢-٢-أ: القشرة — Back إلى اللوحة */
  body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  let ids = []; try{ ids = await mpData.follows.followersOf(currentUser.uid, 51); }catch(e){ mpSwallow(e, 'followers'); }
  const rows = await Promise.all(ids.slice(0, 50).map(function(id){ return mpData.profiles.get(id).catch(function(){ return null; }); }));
  const names = rows.map(function(pr, i){ return pr ? (pr.displayName || pr.nickname || ids[i]) : ids[i]; });
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>' + ids.length + (ids.length > 50 ? '+' : '') + '</b> ' + (ids.length === 1 ? 'person follows you' : 'people follow you') + '</div>' + (names.length ? names.map(function(n){ return '<div class="dash-door"><span><span class="curring" style="display:inline-flex; width:22px; height:22px; font-size:9px; margin-right:6px;">' + escapeHtml(curInitials({ nickname: n })) + '</span>' + escapeHtml(n) + '</span><span></span></div>'; }).join('') : '<div class="mp-empty mini">No followers yet — share your curator page</div>') + (ids.length > 50 ? '<div class="ctx" style="text-align:center;">… more</div>' : '');
}
// My profile — r72q-1 (قرار المالك): بقشرة نوافذ التطبيق · الشعار (tagline ≤ ٤٠) · About you (bio ≤ ٢٠٠) · Contact اختياري: رابط أو اسم حساب بنوعه (Instagram · X · Snapchat · Website؛ Email · Phone مع M4.26) · إظهار العدّاد · الحقل الفارغ لا يُرسل
let formOnSave = null; let profContactType = 'instagram';
function formSave(){ if (typeof formOnSave === 'function') formOnSave(); }
function contactToUrl(type, value){ const v = String(value || '').trim().replace(/^@/, ''); if (!v) return ''; if (/^https:\/\//i.test(v)) return v; if (/^http:\/\//i.test(v)) return 'https://' + v.slice(7);
  if (type === 'instagram') return 'https://instagram.com/' + v; if (type === 'x') return 'https://x.com/' + v; if (type === 'snapchat') return 'https://snapchat.com/add/' + v; return /^[\w.-]+\.[a-z]{2,}/i.test(v) ? 'https://' + v : ''; }
function contactHref(u){ const c = u && u.contact; if (c && c.value){ const v = String(c.value); if (c.type === 'email') return 'mailto:' + v; if (c.type === 'phone') return 'tel:' + v.replace(/[^+\d]/g, ''); if (c.type === 'whatsapp') return 'https://wa.me/' + v.replace(/[^\d]/g, ''); return contactToUrl(c.type, v); } return (u && u.contactUrl) || ''; } // r72t (M4.26 ٤)
function contactFromUrl(url){ const u = String(url || ''); let m; if ((m = u.match(/^https:\/\/(?:www\.)?instagram\.com\/([^/?#]+)/i))) return { type: 'instagram', value: '@' + m[1] }; if ((m = u.match(/^https:\/\/(?:www\.)?x\.com\/([^/?#]+)/i))) return { type: 'x', value: '@' + m[1] }; if ((m = u.match(/^https:\/\/(?:www\.)?snapchat\.com\/add\/([^/?#]+)/i))) return { type: 'snapchat', value: '@' + m[1] }; return { type: 'website', value: u }; }
function profPickType(t){ profContactType = t; document.querySelectorAll('.prof-ct').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-t') === t); }); }
async function openMyProfile(){
  if (!currentUser) return; let pr = null; try{ pr = await mpData.profiles.get(currentUser.uid); }catch(e){} pr = pr || {};
  const ct = pr.contact ? { type: pr.contact.type, value: pr.contact.value } : contactFromUrl(pr.contactUrl || ''); profContactType = (pr.contact || pr.contactUrl) ? ct.type : 'instagram'; // r72t: contact{} أولًا ثم contactUrl انتقاليًّا
  document.getElementById('formTitle').textContent = '✎ My profile'; document.getElementById('formSub').textContent = 'What visitors see on your curator page';
  document.getElementById('formBody').innerHTML = '<label class="flabel">Tagline <span class="dim">· one line under your name · ≤ 40</span></label><input type="text" id="mpTagline" class="modal-input" maxlength="40" placeholder="e.g. Experiences I loved — you might too" value="' + attrStr(pr.tagline || '') + '">'
    + '<label class="flabel">About you <span class="dim">· ≤ 200</span></label><textarea id="mpBio" class="modal-input" rows="3" maxlength="200" placeholder="e.g. Coffee first, then everything else. I write about the places I return to.">' + escapeHtml(pr.bio || '') + '</textarea>'
    + '<label class="flabel">Contact <span class="dim">· a link or a social handle · optional</span></label><input type="text" id="mpContact" class="modal-input" maxlength="300" placeholder="@yourname or https://…" value="' + attrStr((pr.contact || pr.contactUrl) ? ct.value : '') + '">'
    + '<div class="chiprow">' + [['instagram', 'Instagram'], ['x', 'X'], ['snapchat', 'Snapchat'], ['website', 'Website'], ['email', 'Email'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp']].map(function(t){ return '<button type="button" class="chip prof-ct' + (profContactType === t[0] ? ' on' : '') + '" data-t="' + t[0] + '" onclick="profPickType(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') + '</div>' // r72t (M4.26 ٤): الأنواع السبعة
    + '<label class="flabel">Follower count on my page</label><div class="chiprow"><button type="button" class="chip' + (pr.showFollowerCount !== false ? ' on' : '') + '" id="mpShowFc" onclick="this.classList.add(\'on\'); document.getElementById(\'mpHideFc\').classList.remove(\'on\')">Show</button><button type="button" class="chip' + (pr.showFollowerCount === false ? ' on' : '') + '" id="mpHideFc" onclick="this.classList.add(\'on\'); document.getElementById(\'mpShowFc\').classList.remove(\'on\')">Hide</button></div>';
  formOnSave = saveMyProfile; document.getElementById('formBackdrop').classList.add('show');
}
async function saveMyProfile(){
  const tag = (document.getElementById('mpTagline').value || '').trim().slice(0, 40), bio = (document.getElementById('mpBio').value || '').trim().slice(0, 200), cv = (document.getElementById('mpContact').value || '').trim();
  const isDirect = /^(email|phone|whatsapp)$/.test(profContactType); const val = cv.replace(/^@/, '').trim().slice(0, 120);
  if (cv && isDirect){ if (profContactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ showToast('Enter a valid email'); return; } if (profContactType !== 'email' && !/^\+?[\d\s-]{6,}$/.test(val)){ showToast('Enter a valid number with country code'); return; } }
  const url = isDirect ? '' : contactToUrl(profContactType, cv); if (cv && !isDirect && !url){ showToast('Contact must be a handle (@name) or a link'); return; }
  const patch = { showFollowerCount: !document.getElementById('mpHideFc').classList.contains('on') }; // الحقل الفارغ لا يُرسل (القاعدة ترفض النص الفارغ) — يُحذف إن كان موجودًا
  patch.tagline = tag ? tag : mpData.fieldDelete(); patch.bio = bio ? bio : mpData.fieldDelete(); patch.displayName = mpData.fieldDelete(); // r72u: تنظيف الاسم المعروض القديم
  patch.contact = cv ? { type: profContactType, value: isDirect ? val : (cv.trim().slice(0, 120)) } : mpData.fieldDelete(); patch.contactUrl = mpData.fieldDelete(); // r72t (M4.26 ٤): contact{} بدل contactUrl
  try{ await mpData.profiles.merge(currentUser.uid, patch); }catch(e){ mpSwallow(e, 'profile save'); showToast('Could not save · ' + ((e && e.code) || 'error')); return; }
  const me = (curators || []).find(function(c){ return c.uid === currentUser.uid; }); if (me){ me.tagline = tag; me.bio = bio; me.contact = cv ? patch.contact : null; me.contactUrl = ''; me.showFollowerCount = patch.showFollowerCount; }
  showToast('Profile saved ✓'); closeModalById('formBackdrop'); if (currentTab === 'Curators') renderCuratorsBody();
}
function curHeadHtml(u, d){
  const me = curIsMe(u); const cities = d.cities.map(function(c){ return c.name; }); const fc = curFollowers(u); const bio = String(u.bio || '').trim();
  const nPlaces = d.cities.reduce(function(a, c){ return a + c.count; }, 0);
  return '<div class="curidn"><div class="curtop"><span class="curava">' + escapeHtml(curInitials(u)) + '</span><div class="curwho"><div class="curnm2">' + escapeHtml(curName(u)) + ' <span class="curvb">✧ ' + CUR_BADGE + '</span></div>' + (u.tagline ? '<div class="curtag2">' + escapeHtml(u.tagline) + '</div>' : (me ? '<div class="curtag2 dim">Add a tagline in your profile</div>' : '')) + '</div>' // r72q-1: الشعار تحت الاسم · لا مدن بالرأس
    + (me ? '<button type="button" class="curfollow me" onclick="openDashboard()">🎛 My dashboard</button>' : '<button type="button" class="curfollow' + (curIsFollowing(u.uid) ? ' on' : '') + '" onclick="curToggleFollow(\'' + attrStr(u.uid) + '\')">' + (curIsFollowing(u.uid) ? 'Following ✓' : '＋ Follow') + '</button>') + '</div>'
    + (bio ? '<div class="curvoice">' + escapeHtml(bio) + '</div>' : '')
    + '<div class="curstats"><span>Top places <b># ' + curTopPlaces(u, d, null).length + '</b></span>' + (fc !== null ? '<span>followers <b># ' + fc + '</b></span>' : '') + '<span>cities <b># ' + d.cities.length + '</b></span><span>views <b># ' + (u.viewCount || 0) + '</b></span><span>' + curAgo(u) + '</span></div>'
    + '<div class="cursmall">' + (me ? '<button type="button" class="curic" onclick="curOpenFollowers()">👥 Followers' + (curFollowers(u) !== null ? ' (' + curFollowers(u) + ')' : '') + '</button><button type="button" class="curic" onclick="openMyProfile()">✎ Edit profile</button>' + (contactHref(u) ? '' : '<button type="button" class="curic" onclick="openMyProfile()">✉ Contact <span class="stage">add in profile</span></button>') : ((contactHref(u) ? '<a class="curic" href="' + attrStr(contactHref(u)) + '" target="_blank" rel="noopener" onclick="mpTrack.statsCurator(\'' + attrStr(u.uid) + '\', \'contact_click\')">✉ Contact</a>' : '<span class="curic">✉ Contact <span class="stage">not set</span></span>') + '<span class="curic">📤 Share <span class="stage">stage</span></span><button type="button" class="curic flag" onclick="openReport(\'profile\', \'' + attrStr(u.uid) + '\')" title="Report this profile">⚑</button>')) + '</div></div>'
    + '<div class="curtag">' + (me ? 'This is how your page looks to others.' : 'Picks with a personal taste — from experience, not a directory.') + '</div>';
}
function curChipsHtml(u, d){ // r72q-1 (قرار المالك): الشرائح مشتقة من اسم الحساب والمدينة المختارة لحظة الرسم
  const nm = curName(u); const poss = escapeHtml(nm) + (/s$/i.test(nm) ? '’' : '’s'); const nPlaces = d.cities.reduce(function(a, c){ return a + c.count; }, 0);
  const chip = function(id, top, sub, on){ return '<button type="button" class="curchip' + (curChip === id ? ' on' : '') + '" onclick="' + on + '"><b>' + top + '</b>' + sub + '</button>'; };
  const cityNow = curCity ? (d.cities.find(function(x){ return x.id === curCity; }) || {}).name : null;
  return '<div class="curchips">'
    + chip('latest', poss, 'Latest update places', "curPickChip('latest')")
    + chip('places', 'All ' + poss, 'places lists # ' + d.cities.length, "curBrowse('" + attrStr(u.uid) + "', 'places')")
    + chip('trips', 'All ' + poss, 'trips # ' + d.trips.length, "curBrowse('" + attrStr(u.uid) + "', 'trips')")
    + '</div><div class="curchips two">'
    + '<button type="button" class="curchip big' + (curChip === 'cities' ? ' on' : '') + '" onclick="curCitiesChip()">Cities # ' + d.cities.length + '<span class="s">' + (cityNow ? escapeHtml(cityNow) + ' ' : '') + (curCitiesOpen ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</span></button>'
    + '<input type="text" class="csel psearch cursearch" placeholder="Search places…" value="' + attrStr(curSearchQ) + '" oninput="curSearchQ = this.value; curRerenderPage()" autocomplete="off"></div>'
    + (curCitiesOpen ? pickerPanel({ id: 'curCities', bare: true, items: d.cities.map(function(c){ const t = curTripsIn(u.uid, c.id).length; return { id: c.id, name: c.name + ' · ' + c.count + (c.count === 1 ? ' place' : ' places') + ' · ' + t + (t === 1 ? ' trip' : ' trips'), selected: curCity === c.id }; }), onPick: 'curPickCityFromChip', emptyText: 'No public cities yet', limit: 20 }) : '');
}
function curPickChip(id){ curChip = id; curCity = null; curSearchQ = ''; curCitiesOpen = false; renderCuratorsBody(); }
function curPickCityFromChip(id){ curCitiesOpen = false; curOpenCity(id); }
function curCitiesChip(){ if (curChip !== 'cities'){ curChip = 'cities'; curCitiesAuto = true; } else { curCitiesOpen = !curCitiesOpen; } renderCuratorsBody(); } // ر٧٢-أ-١ح
function curRerenderPage(){ const body = document.getElementById('curatorsBody'); const inp = body && body.querySelector('input.cursearch'); const pos = inp ? inp.selectionStart : null; renderCuratorsBody().then(function(){ const i2 = document.querySelector('#curatorsBody input.cursearch'); if (i2){ i2.focus(); if (pos !== null){ try{ i2.setSelectionRange(pos, pos); }catch(e){} } } }); }
function curSearchItems(d){ const q = pickerNormalize(curSearchQ); const items = []; d.cities.forEach(function(c){ Object.keys(c.categories).forEach(function(cat){ ((c.categories[cat] && c.categories[cat].places) || []).forEach(function(pl){ if (pl && pl.name && pickerNormalize(pl.name).indexOf(q) >= 0) items.push({ city: c, cat: cat, pl: pl }); }); }); }); return items; } /* خ-٦: البحث بالاسم من الفهرس ثم curHydrate */
function curSearchHtml(u, d, items){ let h = '<div class="ctx"><b>Search</b> · public places · "' + escapeHtml(curSearchQ) + '"</div>'; return items.length ? h + curTopCardsHtml(u, items, true) : h + '<div class="mp-empty mini">No place matches</div>'; } // ر٧٢-أ-١د: بصف الآخرين الموحَّد
async function renderCuratorPage(body){
  const u = curPage; body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; const d = await curLoadContent(u.uid); if (curPage !== u) return;
  if (curChip === null){ const __stamped = (d.cities || []).some(function(c){ return Object.keys(c.categories || {}).some(function(k){ return ((c.categories[k] && c.categories[k].places) || []).some(function(pl){ return pl && pl.updatedAt; }); }); }); curChip = __stamped ? 'latest' : 'cities'; curCitiesAuto = (curChip === 'cities'); } // ر٧٢-أ-١ح: الافتراضي Latest 10 إن وُجدت مختارات، وإلا Cities
  if (curChip === 'cities' && curCitiesAuto){ curCitiesAuto = false; curCitiesOpen = !curCity && d.cities.length > 0; } // ر٧٢-أ-١هـ: تُفتح تلقائيًّا مرة عند اختيار الشريحة، وإعادة الضغط تطويها
  let h = '<div class="headrow" style="margin:2px 0 8px;"><button type="button" class="backchip" onclick="curBack()">← Curators</button></div>';
  h += curHeadHtml(u, d) + curChipsHtml(u, d);
  if (pickerNormalize(curSearchQ)){ const __it = await curHydrate(u.uid, curSearchItems(d)); if (curPage !== u) return; h += curSearchHtml(u, d, __it); }
  else if (curCity){ await curEnsureCity(u.uid, curCity); await curLoadNotes(u.uid, curCity); if (curPage !== u) return; h += curCityScreenHtml(u, d, curCity, true); } /* خ-٦: المدينة تُركَّب عند فتحها */ // ر٧٢-أ-١ح · r72p: الرأي يُقرأ قبل الرسم
  else if (curChip === 'latest'){ const __lt = await curHydrate(u.uid, curLatestItems(d)); if (curPage !== u) return; h += '<div class="ctx"><b>Latest update places</b> · last 10 added or edited · all cities · newest first</div>' + curLatestHtml(u, d, __lt); }
  else if (curChip === 'cities'){ h += '<div class="ctx"><b>Cities</b> · ' + d.cities.length + ' · pick a city above</div>'; }
  body.innerHTML = h;
}
function curOpenCity(cityId){ curCity = cityId; curChip = 'cities'; curCitiesOpen = false; renderCuratorsBody(); }
function curTopPlaces(u, d, cityId){ // ر٧٢-أ-١د: العلامة داخل المكان بقائمته — تجميع بالفرعي
  const out = []; d.cities.forEach(function(c){ if (cityId && c.id !== cityId) return; Object.keys(c.categories).forEach(function(cat){ ((c.categories[cat] && c.categories[cat].places) || []).forEach(function(pl){ if (pl && pl.topPlace && (pl.name || pl.url)) out.push({ city: c, cat: cat, pl: pl }); }); }); }); return out;
}
function curTopCardsHtml(u, items, withCity){ // بطاقات مجمَّعة (المدينة · الفرعي · العدد · Open list →) وصف الآخرين بكل مكان (+ ✎ Edit لصاحبها)
  const groups = {}; items.forEach(function(it){ const k = it.city.id + '|' + it.cat; (groups[k] = groups[k] || { city: it.city, cat: it.cat, places: [] }).places.push(it.pl); });
  const me = curIsMe(u);
  return Object.values(groups).map(function(g){ const meta = plCatsAll().find(function(c){ return c.id === g.cat; }); const sub = (meta && meta.name) || g.cat;
    const right = '<button type="button" class="go" onclick="curBrowse(\'' + attrStr(u.uid) + '\', \'places\', \'' + attrStr(g.city.id) + '\')">Open list →</button>';
    const cards = g.places.map(function(pl){ return othersPlaceRowHtml(pl, { uid: u.uid, nickname: u.nickname }, g.city, g.cat, g.city.id, me ? "curEditPlace('" + attrStr(g.city.id) + "', '" + attrStr(g.cat) + "', '" + attrStr(pl.id || '') + "')" : ''); }).join('');
    return placeGroupHtml((withCity ? g.city.name + ' · ' : '') + sub, g.places.length > 1 ? g.places.length : null, right, cards); }).join(''); // r72r-1: المجموعة الموحَّدة (لا ازدواج للعاجي)
}
function curLatestItems(d){ /* خ-٦: الاختيار من الفهرس (up = ختم التعديل وحده) — ثم curHydrate يقرأ مستندات التصنيفات المعنية فقط */ const items = []; (d.cities || []).forEach(function(c){ Object.keys(c.categories || {}).forEach(function(cat){ ((c.categories[cat] && c.categories[cat].places) || []).forEach(function(pl){ if (pl && (pl.name || pl.url) && pl.updatedAt) items.push({ city: c, cat: cat, pl: pl }); }); }); }); items.sort(function(a, b){ return (b.pl.updatedAt || 0) - (a.pl.updatedAt || 0); }); return items.slice(0, 10); }
function curLatestHtml(u, d, top){ /* قرار المالك (٢ أكتوبر): أحدث الأماكن المحدَّثة فعلًا بختمها الزمني (لا القوائم ولا Top) — الأماكن القديمة بلا ختم خارجها */ return top.length ? curTopCardsHtml(u, top, true) : '<div class="mp-empty mini">' + (curIsMe(u) ? 'Places you add or edit from now on appear here, newest first' : 'No recently updated places yet') + '</div>'; }
const curNotesCache = {}; // r72p: رأي المدينة — uid__cityId → note|null (يُقرأ مرة بالجلسة، ويُصفَّر عند الحفظ والخروج)
async function curLoadNotes(uid, cityId){ const k = uid + '__' + cityId; if (k in curNotesCache) return curNotesCache[k]; let n = null; try{ n = await mpData.cityNotes.get(uid, cityId); }catch(e){ mpSwallow(e, 'city notes'); } curNotesCache[k] = n; return n; }
const CUR_NOTE_FIELDS = [['bestTime', 'Best time of year', 40], ['love', 'What I love', 80], ['knownFor', 'Known for', 80], ['whyPrefer', 'Why I prefer it', 80], ['returns', 'I return', 0]];
function curCityScreenHtml(u, d, cityId, inline){ // r72q-1: الشرائح مشتقة من اسم المدينة · الرأي نصًّا ثم سطور «عنوان: قيمة» للمكتوب فقط · للزائر بلا رأي: الاسم فقط
  const c = d.cities.find(function(x){ return x.id === cityId; }); if (!c) return '<div class="mp-empty mini">City not found</div>';
  const trips = curTripsIn(u.uid, cityId); const me = curIsMe(u); const tops = curTopPlaces(u, d, cityId); const cn = escapeHtml(c.name);
  const n = curNotesCache[u.uid + '__' + cityId] || null; const has = !!(n && (n.text || CUR_NOTE_FIELDS.some(function(f){ return n[f[0]]; })));
  const retLabel = { yes: 'Yes — I keep coming back', sometimes: 'Sometimes', no: 'Not really' };
  const line = function(key, l){ const v = n && n[key]; if (!v) return ''; return '<div><b>' + l + '</b> ' + escapeHtml(key === 'returns' ? (retLabel[v] || v) : v) + '</div>'; };
  return '<div class="curcitycard"><div class="cn">' + cn + (me ? '<button type="button" class="act curedit" onclick="openCityNotesEditor(\'' + attrStr(cityId) + '\')">✎ ' + (has ? 'Edit' : 'Write') + '</button>' : (has ? '<button type="button" class="act curedit flag" onclick="openReport(\'notes\', \'' + attrStr(u.uid + '__' + cityId) + '\')" title="Report these notes">⚑</button>' : '')) + '</div>' // r72t (M4.26 ٦): بلاغ على الرأي
    + ((has || me) ? ((has && n.text) ? '<div class="ci">' + escapeHtml(n.text) + '</div>' : (me ? '<div class="ci dim">Your impression of the city — what you love, when to go, why you return</div>' : '')) + (has ? '<div class="curlines">' + CUR_NOTE_FIELDS.map(function(f){ return line(f[0], f[1]); }).join('') + '</div>' : '') : '') + '</div>'
    + '<div class="cursw3"><button type="button" class="c on"><small>' + cn + '</small>Top places # ' + tops.length + '</button><button type="button" class="c" onclick="curBrowse(\'' + attrStr(u.uid) + '\', \'places\', \'' + attrStr(cityId) + '\')"><small>' + cn + '</small>All places # ' + c.count + '</button><button type="button" class="c" onclick="curBrowse(\'' + attrStr(u.uid) + '\', \'trips\', \'' + attrStr(cityId) + '\')"><small>' + cn + '</small>All trips # ' + trips.length + '</button></div>' // r72q-2 (قرار المالك): سطران — اسم المدينة ثم الفعل بعدده بـ#
    + (tops.length ? curTopCardsHtml(u, tops, false) : '<div class="mp-empty mini">' + (me ? 'Mark places with ★ Top place in your ' + cn + ' list — they appear here with your Picks and Notes' : 'No top places in ' + cn + ' yet') + '</div>');
}
async function openCityNotesEditor(cityId){ // r72q-1: بقشرة نوافذ التطبيق — عنوان وسطر الغرض · كل حقل بعنوانه وحدّه وتلميح مثال · I return شرائح
  if (!currentUser) return; const n = (await curLoadNotes(currentUser.uid, cityId)) || {}; const cname = (curData[currentUser.uid] && (curData[currentUser.uid].cities.find(function(c){ return c.id === cityId; }) || {}).name) || cityId;
  const ex = { bestTime: 'e.g. late September', love: 'e.g. breakfast houses · ferries at sunset', knownFor: 'e.g. fika · design', whyPrefer: 'e.g. walkable, calm, safe' };
  document.getElementById('formTitle').textContent = '✎ ' + cname + ' — your notes'; document.getElementById('formSub').textContent = 'Shown to every visitor of your ' + cname + ' page · all optional';
  document.getElementById('formBody').innerHTML = '<label class="flabel">Your impression <span class="dim">· ≤ 300</span></label><textarea id="cnText" class="modal-input" rows="3" maxlength="300" placeholder="e.g. Quiet in May, alive in August. I come for the bakeries and the islands.">' + escapeHtml(n.text || '') + '</textarea>'
    + CUR_NOTE_FIELDS.filter(function(f){ return f[0] !== 'returns'; }).map(function(f){ return '<label class="flabel">' + f[1] + ' <span class="dim">· ≤ ' + f[2] + '</span></label><input type="text" id="cn_' + f[0] + '" class="modal-input" maxlength="' + f[2] + '" placeholder="' + attrStr(ex[f[0]] || '') + '" value="' + attrStr(n[f[0]] || '') + '">'; }).join('')
    + '<label class="flabel">I return</label><div class="chiprow">' + ['yes', 'sometimes', 'no'].map(function(v){ return '<button type="button" class="chip cn-ret' + ((n.returns || '') === v ? ' on' : '') + '" data-v="' + v + '" onclick="cnPickReturns(this)">' + ({ yes: 'Yes', sometimes: 'Sometimes', no: 'Not really' })[v] + '</button>'; }).join('') + '</div>';
  formOnSave = function(){ saveCityNotes(cityId); }; document.getElementById('formBackdrop').classList.add('show');
}
function cnPickReturns(btn){ document.querySelectorAll('.cn-ret').forEach(function(b){ b.classList.toggle('on', b === btn && !b.classList.contains('on')); }); }
async function saveCityNotes(cityId){
  const data = {}; const t = (document.getElementById('cnText').value || '').trim().slice(0, 300); if (t) data.text = t;
  CUR_NOTE_FIELDS.forEach(function(f){ if (f[0] === 'returns') return; const v = (document.getElementById('cn_' + f[0]).value || '').trim().slice(0, f[2]); if (v) data[f[0]] = v; });
  const r = document.querySelector('.cn-ret.on'); if (r) data.returns = r.getAttribute('data-v');
  try{ await mpData.cityNotes.save(currentUser.uid, cityId, data); }catch(e){ mpSwallow(e, 'notes save'); showToast('Could not save · ' + ((e && e.code) || 'error')); return; }
  delete curNotesCache[currentUser.uid + '__' + cityId]; showToast('Notes saved ✓'); closeModalById('formBackdrop'); if (currentTab === 'Curators') renderCuratorsBody();
}
async function curEditPlace(cityId, catId, placeId){ // ✎ Edit: نافذة المكان القائمة على مكاني بقائمتي (بعد تحميل المدينة)
  if (!currentUser) return; plSessionCity = cityId; try{ await selectMyListCity(cityId); }catch(e){}
  switchTab('Places'); const entry = userGetEntry(catId); const idx = ((entry && entry.places) || []).findIndex(function(q){ return q && q.id === placeId; });
  if (idx < 0){ showToast('Place not found in your list'); return; } openPlPlaceModal(catId, idx);
}
let curBrowseBusy = false; let personLayerOnly = null; // ر٧٢-أ-٢د: من شريحة المنتقي تُعرض القوائم فقط أو الرحلات فقط
async function curBrowse(uid, what, cityId){ // All places / All trips / Open list → : طبقة الشخص القائمة بالمجتمع بشريط «Browsing … — read only» وزر العودة إلى صفحته
  if (curBrowseBusy) return; curBrowseBusy = true; // ر٧٢-أ-١ط: حارس ضغطتين + إشعار فوري
  curArchiveOf = uid; if (!cityId) curChip = what; /* ر٧٣-أب (٢): مع مدينة محددة تبقى الشريحة العليا على Cities (لا تظليل مزدوج) */ communityTab = (what === 'trips') ? 'trips' : 'places'; communityScreen = 'source'; personLayerOnly = (what === 'trips') ? 'trips' : 'places';
  logTiming('[CUR] browse ' + what + ' uid=' + String(uid).slice(0, 6) + (cityId ? ' city=' + cityId : ''));
  let timedOut = false;
  if (cityId && what === 'places'){ try{ await curEnsureCity(uid, cityId); }catch(_){ } if (currentUser && uid !== currentUser.uid) mpTrack.statsList(uid + '_' + cityId, 'open_curator'); } /* خ-٦: المدينة المفتوحة تُركَّب كاملة قبل تسليمها لطبقة المجتمع · ب-٢-١: فتح من صفحة المنتقي يُعدّ open_curator (لا يمرّ بـopenCommunityCityList) */
  const __loaded = (viewingUserUid === uid && viewingUserData && Array.isArray(viewingUserCities) && viewingUserCities.length) || curPrimeLayerFromCurator(uid); /* ر٧٣-أب (٢) — السبب الجذري للبطء: طبقة المجتمع كانت تعيد قراءة كل قوائم الشخص (قائمة + ٢٧ مستندًا لكل مدينة) رغم أن صفحة المنتقي حمّلتها؛ الآن تُبنى من بيانات المنتقي المحمَّلة بلا قراءة */
  try{ if (__loaded){ viewingCommunityTripId = null; try{ await ensureListBookmarks(); await ensureTripSaves(); }catch(_){} } else await Promise.race([viewCommunityUser(uid), new Promise(function(r){ setTimeout(function(){ timedOut = true; r(); }, 15000); })]); if (cityId){ communityViewingCityId = cityId; communityUserLayer = (what === 'places') ? cityId : null; communityUserTripsCity = (what === 'trips') ? cityId : ''; } else { communityUserLayer = null; communityUserTripsCity = ''; } }catch(e){ mpSwallow(e, 'curator browse'); showToast('Could not open · ' + (((e && e.code) || (e && e.message) || 'error') + ' · step ' + vcuStep).slice(0, 70)); logTiming('[CUR] browse failed: ' + ((e && (e.code || e.message)) || e) + ' step=' + vcuStep); }
  if (timedOut){ showToast('Slow connection · stuck at step ' + vcuStep + ' — showing what loaded'); logTiming('[CUR] browse timeout step=' + vcuStep); } // ر٧٢-أ-٢ز: لا انتظار صامتًا
  try{ switchTab('Community'); if (cityId && HOSTED.Community) renderCommunityModal(); } finally { curBrowseBusy = false; }
}
function curArchiveBannerHtml(){ if (!curArchiveOf || !viewingUserUid || viewingUserUid !== curArchiveOf) return ''; const u = (curators || []).find(function(x){ return x.uid === curArchiveOf; }); return '<div class="curbrowse">👁 Browsing ' + escapeHtml(u ? curName(u) : 'a curator') + "'s " + (communityTab === 'trips' ? 'trips' : 'places') + ' — read only<button type="button" class="bk" onclick="curArchiveBack()">← Curator page</button></div>'; }
function curArchiveBack(){ const uid = curArchiveOf; curArchiveOf = null; personLayerOnly = null; viewingUserUid = null; viewingUserData = null; curPage = (curators || []).find(function(x){ return x.uid === uid; }) || null; switchTab('Curators'); } // r72r-1: تبقى الشريحة والمدينة كما كانتا
// لوحة My Dashboard (المرجع ٦/ز) — بطبقتيها؛ البلاطات المؤجلة بوسمها (الشكل كامل، التفعيل تدريجي)
async function resendVerification(){ // r72p (١٠): نداء واحد لخدمة المصادقة
  if (!currentUser){ openAuthModal(); return; }
  try{ await mpData.auth.sendVerification(); showToast('Verification email sent — check your inbox'); }catch(e){ mpSwallow(e, 'verify'); showToast('Could not send · ' + ((e && e.code) || 'error')); }
}
function drToggleComing(){ const el = document.getElementById('drComing'), ar = document.getElementById('drComingArrow'); if (!el) return; const open = el.style.display === 'none'; el.style.display = open ? '' : 'none'; if (ar) ar.textContent = open ? '⌃' : '⌄'; } /* ر٧٣-أب (٢): المؤجَّل مجمَّع لا مبعثر */
function drToggleAccount(){ const el = document.getElementById('drAccount'); const on = el.style.display === 'none'; el.style.display = on ? '' : 'none'; const ar = document.getElementById('drAccArrow'); if (ar) ar.textContent = on ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>'; }
function drSyncCurator(){ // ب-٢-٢-أ: الشارة بترويسة الدرج للمنتقي (البند يختفي)؛ لغيره «⭐ Become a curator» بحالته (Request · Pending · Accepted · Declined)
  const item = document.getElementById('drCuratorItem'); const av = document.getElementById('accountName'); if (!item) return;
  const me = !!(currentUser && ((curators || []).some(function(c){ return c.uid === currentUser.uid; }) || (userListData && userListData.curatorSelf)));
  item.style.display = me ? 'none' : '';
  if (av){ const nm = av.textContent.replace(/ ✧ Curator$/, ''); av.textContent = me ? nm + ' ✧ Curator' : nm; }
  if (!me && currentUser){ const st = document.getElementById('drCuratorStatus'); if (st) mpData.requests.mine(currentUser.uid).then(function(r){ st.textContent = r ? (({ pending: 'Pending', accepted: 'Accepted', declined: 'Declined' })[r.status] || r.status) : 'request'; }).catch(function(){}); }
}
function openDashboard(){ /* ب-٢-٢-أ (المسودة v2-أ · ٢): ثلاث مجموعات Profile · Insights · Tools — Back يعود للدرج (عبر openFromDrawer) و✕ يغلق الكل */
  if (!currentUser){ openAuthModal(); return; }
  const me = (curators || []).some(function(c){ return c.uid === currentUser.uid; }) || !!(userListData && userListData.curatorSelf);
  const name = (userListData && userListData.nickname) || 'You';
  const door = function(icon, label, right, on, stage){ return '<button type="button" class="dash-door' + (on ? '' : ' dim') + '" ' + (on ? 'onclick="' + on + '"' : 'disabled') + '><span>' + icon + ' ' + label + '</span><span>' + (right || '') + (stage ? ' <span class="stage">' + stage + '</span>' : '') + '</span></button>'; };
  const prof = (curators || []).find(function(c){ return c.uid === currentUser.uid; }) || null; const fc = prof && typeof prof.followerCount === 'number' ? prof.followerCount : null;
  let h = '<div class="ctx" style="text-align:center;"><b>' + escapeHtml(name) + '</b>' + (me ? ' · ✧ curator' + (fc !== null ? ' · ' + fc + (fc === 1 ? ' follower' : ' followers') : '') : ' · user') + '</div>';
  if (me){ h += '<div class="gsec">Profile</div>' + door('✎', 'My profile', 'tagline · about · contact ›', 'openMyProfile()') + door('👥', 'Followers', (fc !== null ? fc + ' ›' : 'names ›'), 'curOpenFollowers()'); }
  else { h += '<div class="gsec">Profile</div>' + door('👤', 'Change nickname', escapeHtml(name) + ' ›', 'chooseNickname()'); }
  h += '<div class="gsec">Insights</div>' + door('📊', 'My stats', (me ? 'reach · lists · trips ›' : 'lists · trips ›'), 'openMyStats()');
  h += '<div class="gsec">Tools</div>' + door('🪪', 'Share cards', 'image + QR', null, 'المرحلة ب') + door('📤', 'Export', 'lists & trips', null, 'المرحلة ب') + door('📥', 'Import from Google Maps', 'Takeout', null, 'أ-١٣');
  dashSet('🎛 My Dashboard', null); document.getElementById('dashBody').innerHTML = h; document.getElementById('dashBackdrop').classList.add('show');
}
/* ═══ ب-٢-٢-أ · My stats (المسودة v2-أ · ٣ و٣-ب) — القراءة مفردة عبر mpData.stats · الأرقام من اليوم الأول · Δ٪ من اليوم الثامن (قرار ١٠-٠٩-٠٧) · للمالك عرض أي منتقٍ (uid) ═══ */
function msSum(rows, key){ return (rows || []).reduce(function(a, r){ return a + (Number(r && r[key]) || 0); }, 0); }
function msHasAny(rows){ return (rows || []).some(function(r){ return Object.keys(r || {}).some(function(k){ return k !== 'day' && (Number(r[k]) || 0) > 0; }); }); }
function msDelta(cur, prev, hasPrev){ if (!hasPrev) return '<span class="d">not enough data yet</span>'; if (!prev) return cur > 0 ? '<span class="d">▲ new</span>' : '<span class="d">—</span>'; const p = Math.round((cur - prev) / prev * 100); return '<span class="d">' + (p > 0 ? '▲ ' + p + '%' : p < 0 ? '▼ ' + Math.abs(p) + '%' : '— 0%') + '</span>'; }
function msTile(v, label, delta){ return '<div class="admtile"><b>' + v + '</b><span>' + label + '</span>' + (delta || '') + '</div>'; }
function msNum(n){ return '<span class="num">' + (Number(n) || 0) + '</span>'; }
function msDaysHtml(days){ const last = (days || []).slice(0, 14).reverse(); const max = Math.max(1, Math.max.apply(null, last.map(function(r){ return Number(r.page_view) || 0; }))); return '<div class="sdays" title="daily page views · last 14 days">' + last.map(function(r){ const v = Number(r.page_view) || 0; return '<i style="height:' + Math.max(4, Math.round(v / max * 100)) + '%" title="' + r.day + ' · ' + v + '"></i>'; }).join('') + '</div>'; }
async function openMyStats(uid){
  if (!currentUser){ openAuthModal(); return; }
  const target = (typeof uid === 'string' && uid) ? uid : currentUser.uid; const asOwner = target !== currentUser.uid; if (asOwner && !isOwner) return;
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('📊 My stats', asOwner ? function(){ openAdminPanel(); closeModalById('dashBackdrop'); } : (bd.classList.contains('show') ? openDashboard : null));
  body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  let prof = null, lists = [], trips = [];
  try{ const r = await Promise.all([mpData.profiles.get(target).catch(function(){ return null; }), mpData.cityLists.byOwner(target), mpData.trips.byOwner(target)]);
    prof = r[0]; r[1].forEach(function(d){ const x = d.data() || {}; lists.push({ id: d.id, cityId: x.cityId, name: x.cityName || x.cityId || d.id, pub: x.public === true, views: x.viewCount || 0, bm: x.bookmarkCount || 0, copies: x.copyCount || 0 }); });
    r[2].forEach(function(d){ const x = d.data() || {}; if (x.source) return; trips.push({ id: d.id, name: (x.cityName || '') + (x.customLabel ? ' — ' + x.customLabel : ''), pub: x.public === true, views: x.viewCount || 0, saves: x.saveCount || 0, copies: x.copyCount || 0 }); });
  }catch(e){ mpSwallow(e, 'my stats'); body.innerHTML = '<div class="mp-empty mini">Could not load your stats · ' + escapeHtml((e && e.code) || 'error') + '</div><button type="button" class="dash-door" onclick="openMyStats(' + (asOwner ? "'" + attrStr(target) + "'" : '') + ')"><span>↻ Retry</span><span></span></button>'; return; }
  const isCur = !!(prof && prof.verified === true); const nick = (prof && prof.nickname) || (asOwner ? target.slice(0, 8) : ((userListData && userListData.nickname) || 'You'));
  const pubL = lists.filter(function(l){ return l.pub; }), pubT = trips.filter(function(t){ return t.pub; });
  const st = await Promise.all([Promise.all(pubL.map(function(l){ return mpData.stats.listDoc(l.id); })), Promise.all(pubT.map(function(t){ return mpData.stats.tripDoc(t.id); })), isCur ? mpData.stats.curatorDays(target, 30) : Promise.resolve([])]);
  const days = st[2]; let h = '<div class="ctx" style="text-align:center;"><b>' + escapeHtml(nick) + '</b> · ' + (isCur ? 'last 30 days' : 'my public lists and trips') + (asOwner ? ' · viewing as owner' : '') + '</div>';
  if (isCur){
    const v = function(a, b){ return msSum(days.slice(a, b), 'page_view'); }; const hasPrev = msHasAny(days.slice(7)); const cur7 = v(0, 7), prev7 = v(7, 14);
    h += '<div class="gsec">Reach</div><div class="admtiles">' + msTile(v(0, 1), 'views today') + msTile(cur7, 'views 7d', msDelta(cur7, prev7, hasPrev)) + msTile(v(0, 30), 'views 30d') + '</div>' + msDaysHtml(days);
    const s7 = msSum(days.slice(0, 7), 'save'), sp7 = msSum(days.slice(7, 14), 'save');
    h += '<div class="admtiles">' + msTile('+' + msSum(days.slice(0, 7), 'follow'), 'new follows 7d') + msTile(msSum(days.slice(0, 7), 'contact_click'), 'contact clicks 7d') + msTile(s7, 'saves 7d', msDelta(s7, sp7, hasPrev)) + '</div>';
    const pv = msSum(days, 'page_view'), so = msSum(days, 'ref_social'), ca = msSum(days, 'ref_card'); const di = Math.max(0, pv - so - ca); const pct = function(n){ return pv ? Math.round(n / pv * 100) + '%' : '—'; };
    h += '<div class="gsec">Where visitors came from · 30d</div><div class="chipgrid c3"><span class="actn label' + (so >= ca && so >= di && pv ? ' on' : '') + '">Social ' + pct(so) + '</span><span class="actn label' + (ca > so && ca >= di ? ' on' : '') + '">Card / QR ' + pct(ca) + '</span><span class="actn label' + (di > so && di > ca ? ' on' : '') + '">Direct ' + pct(di) + '</span></div>';
    const ex = msSum(days, 'export'); h += '<div class="ctx" style="text-align:center;">exports 30d · <b>' + ex + '</b> · followers · <b>' + ((prof && typeof prof.followerCount === 'number') ? prof.followerCount : '—') + '</b></div>';
  } else {
    h += '<div class="admtiles">' + msTile(pubL.length, 'public lists') + msTile(pubL.reduce(function(a, l){ return a + l.views; }, 0), 'list views') + msTile(pubL.reduce(function(a, l){ return a + l.copies; }, 0) + pubT.reduce(function(a, t){ return a + t.copies; }, 0), 'copies') + '</div>';
  }
  h += '<div class="gsec">My lists' + (isCur ? ' · by copies' : '') + '</div>';
  if (!lists.length) h += '<div class="mp-empty mini">No lists yet — add your first place</div><button type="button" class="dash-door" onclick="mpCloseAll(\'dashBackdrop\'); switchTab(\'Places\')"><span>Go to Places →</span><span></span></button>';
  else lists.sort(function(a, b){ return (b.pub - a.pub) || (b.copies - a.copies) || (b.views - a.views); }).forEach(function(l, i){ const sl = l.pub ? (st[0][pubL.indexOf(l)] || {}) : null;
    h += '<div class="row rowblock"><div class="pn">' + escapeHtml(l.name) + '</div><div class="ps">' + (l.pub ? 'views ' + msNum(l.views) + ' · bookmarks ' + msNum(l.bm) + ' · copies ' + msNum(l.copies) + ' · opens app ' + msNum(sl.open_app) + ' · community ' + msNum(sl.open_community) + ' · curator ' + msNum(sl.open_curator) : 'private — not counted') + '</div></div>'; });
  h += '<div class="gsec">My trips</div>';
  if (!pubT.length) h += '<div class="mp-empty mini">' + (trips.length ? 'No public trips yet — make a trip public to see its views and saves here' : 'No trips yet') + '</div>' + (asOwner ? '' : '<button type="button" class="dash-door" onclick="mpCloseAll(\'dashBackdrop\'); switchTab(\'Trips\')"><span>Go to Trips →</span><span></span></button>');
  else pubT.forEach(function(t, i){ const stt = st[1][i] || {}; h += '<div class="row rowblock"><div class="pn">' + escapeHtml(t.name || 'Trip') + '</div><div class="ps">views ' + msNum(Math.max(t.views, stt.view_total || 0)) + ' · saves ' + msNum(t.saves) + ' · copies ' + msNum(t.copies) + '</div></div>'; });
  if (isCur && !msHasAny(days)) h += '<div class="mp-empty mini">Reach is counted from this release on — numbers appear from the first day, growth from the eighth</div>';
  body.innerHTML = h;
}
async function openCuratorRequest(){ // r72p (٣): طلب واحد لكل حساب — بنص قصير
  if (!currentUser) return; let r = null; try{ r = await mpData.requests.mine(currentUser.uid); }catch(e){}
  if (r){ showToast('Your request is ' + (r.status || 'pending')); return; }
  const text = await openInputModal('Become a curator', 'Tell us briefly why (≤ 300)', '', null, { allowFree: true }); if (text === null) return;
  try{ await mpData.requests.create(currentUser.uid, String(text || '').slice(0, 300)); }catch(e){ mpSwallow(e, 'request'); showToast('Could not send · ' + ((e && e.code) || 'error')); return; }
  showToast('Request sent — pending'); const el = document.getElementById('drCuratorStatus'); if (el) el.textContent = 'Pending'; /* ب-٢-٢-أ: الحالة ببند الدرج */
}
let vcuStep = ''; // ر٧٢-أ-٢ز: آخر مرحلة بلغها فتح طبقة الشخص (للتشخيص على الجهاز)
async function viewCommunityUser(uid){
  vcuStep = 'profile'; communityUserLayer = null;
  viewingUserUid = uid;
  viewingUserData = null; try{ viewingUserData = await mpData.profiles.get(uid); }catch(e){ mpSwallow(e, 'profile'); } // r72r-1: الملف طازج بكل فتح (المدن الجديدة تظهر) — لا من ذاكرة المجتمع
  if (!viewingUserData) viewingUserData = communityUsers.find(u => u.uid === uid);
  if (!viewingUserData){ // ر٦٥: صاحب بطاقة لم يصل ملفه للقائمة (تحميل ناقص أو ملف حديث) — يُقرأ مفردًا بدل الانهيار
    try{ viewingUserData = await mpData.profiles.get(uid); }catch(e){ mpSwallow(e, 'profile'); }
    if (!viewingUserData) viewingUserData = { uid: uid, nickname: 'user', publicCityIds: [] };
  }
  communityViewingCityId = null;
  viewingCommunityTripId = null;
  document.getElementById('communityBody').innerHTML = `<div class="mp-empty mini">Loading…</div>`;
  // ✅ يعمل الآن (المرحلة ٣) — الاستثناء الأمني الجديد يسمح بتحديث viewCount لملف عام
  try{
    await mpData.communityProfiles.bumpView(uid);
    viewingUserData.viewCount = (viewingUserData.viewCount||0) + 1;
  }catch(e){}
  // تحميل كسول: فقط تفاصيل مدن هذا المستخدم المفتوح حاليًا، مو كل مستخدمي Community دفعة وحدة
  viewingUserCities = [];
  try{
    let __qRows = []; try{ __qRows = await mpData.cityLists.publicByOwner(uid); }catch(e){ mpSwallow(e, 'public by owner'); } /* خ-٦: الفهرس وحده — مدينة الطبقة ٣ تُركَّب عند فتحها (cmEnsureCity) */ // r72s: اتحاد المصدرين كما بصفحة المنتقي · r72t: بالفرعية (الأماكن كاملة) — المدينة الجديدة تظهر ولو لم تصل إلى الملف العام بعد
    const __qIds = {}; __qRows.forEach(function(r){ __qIds[r.cityId || String(r.id || '').split('_').slice(1).join('_')] = r; });
    const __missing = (viewingUserData.publicCityIds || []).filter(function(cid){ return !__qIds[cid]; });
    const cityDocs = await Promise.all(__missing.map(cityId => mpData.cityLists.getIndex(uid, cityId).then(function(d){ return { exists: !!d, data: function(){ return d; } }; }).catch(function(){ return { exists: false }; }))); // r72t: عبر الطبقة (مركَّبة)
    const __all = __qRows.map(function(r){ return { exists: true, data: function(){ return r; } }; }).concat(cityDocs);
    __all.forEach(doc => {
      if (!doc.exists) return;
      const d = doc.data(); if (d.public !== true) return;
      const cityMeta = allCities().find(c => c.id === d.cityId);
      viewingUserCities.push({
        id: d.cityId,
        name: (cityMeta && cityMeta.name) || d.cityName || d.cityId,
        categories: (d.categories && typeof d.categories==='object') ? d.categories : {},
        _full: d._indexOnly !== true,
        favoriteCount: d.favoriteCount || 0,
        bookmarkCount: d.bookmarkCount || 0,
        viewCount: d.viewCount || 0
      });
    });
  }catch(e){}
  vcuStep = 'trips'; await loadCommunityUserTrips(uid);
  vcuStep = 'bookmarks'; await ensureListBookmarks();
  vcuStep = 'saves'; await ensureTripSaves();
  vcuStep = 'render'; renderCommunityModal(); vcuStep = 'done';
}
let communityUserLayer = null;
let communityUserTripsCity = ''; /* ر٧٣-أب (٢): «(City) All trips» من المنتقي → رحلات المستخدم مصفّاة بهذه المدينة */
// v1.40: فتح قائمة الشخص = دخول الطبقة ٣ + رفع عدّاد مشاهدات القائمة مرة واحدة بالجلسة (زائرًا لا صاحبًا)
function openCommunityCityList(cityId, origin){ /* ب-٢-١ (قرار ١٠-٠٩-٠٤): نقطة العدّ الواحدة لفتح قائمة شخص آخر — كل فتح يُعدّ بمنشئه: app (المشارَك معي) · community (الافتراضي) · curator (من صفحة المنتقي) */
  communityUserLayer = cityId; communityViewingCityId = cityId;
  if (currentUser && viewingUserUid && viewingUserUid !== currentUser.uid){
    const k = viewingUserUid + '_' + cityId;
    if (!viewBumped[k]){ viewBumped[k] = true; mpData.lists.bumpView(viewingUserUid, cityId); }
    mpTrack.statsList(k, listOpenKey(origin));
  }
  renderCommunityModal();
}
function listOpenKey(origin){ return origin === 'app' ? 'open_app' : origin === 'curator' ? 'open_curator' : 'open_community'; } // ب-٢-١: المفاتيح البيضاء لـstats_lists (§١٧-ج)
function mpIsVerified(uid){ /* ب-٢-١: أهو منتقٍ موثَّق بحسب ما حُمِّل بالجلسة (لا قراءة جديدة) — يحدد كتابة save/export بـstats_curators */
  if (!uid) return false; if ((curators || []).some(function(c){ return c.uid === uid; })) return true;
  const cu = (communityUsers || []).find(function(c){ return c.uid === uid; }); if (cu && cu.verified === true) return true;
  return !!(viewingUserData && viewingUserData.uid === uid && viewingUserData.verified === true);
}
function statsExportFor(kind, id){ /* ب-٢-١ (قرار ١٠-٠٩-٠٥): تصدير محتوى منتقٍ (بطاقة أو رسالة) يُعدّ له export — olist: صاحب القائمة · otrip: صاحب الرحلة من السوق/الطبقة · oplace: صاحب الطبقة المفتوحة */
  try{ let uid = null; if (kind === 'olist') uid = String(id).split('_')[0]; else if (kind === 'otrip'){ const t = (cmCache.trips && cmCache.trips[id]) || (communityUserTrips || []).find(function(x){ return x.id === id; }) || (sharedTrips || []).find(function(x){ return x.id === id; }); uid = t && t.ownerId; } else if (kind === 'oplace') uid = viewingUserUid;
    if (uid && currentUser && uid !== currentUser.uid && mpIsVerified(uid)) mpTrack.statsCurator(uid, 'export'); }catch(_){}
}
let cmSecCollapsed = {}; /* خ-٦: حالة طيّ أقسام أماكن الآخرين بالجلسة — المفتاح uid|city|section · الافتراضي مغلق (قرار ٠٩-٢٩-٠٥) */
function cmSecIsClosed(k){ return cmSecCollapsed[k] === undefined ? true : !!cmSecCollapsed[k]; }
function cmToggleSection(k){ cmSecCollapsed[k] = !cmSecIsClosed(k); renderCommunityModal(); }
async function cmEnsureCity(uid, c){ /* خ-٦: تركيب مدينة الشخص كاملة مرة بالجلسة — من بيانات المنتقي إن كانت هي المصدر، وإلا قراءة مستنداتها الفرعية */
  if (!c || c._full || c._loading) return c; c._loading = true;
  try{ if (c._src){ await curEnsureCity(uid, c.id); if (c._src._full){ c.categories = c._src.categories; c._full = true; } }
    else { const full = await mpData.cityLists.get(uid, c.id); if (full && full.categories && typeof full.categories === 'object'){ c.categories = full.categories; c._full = true; logTiming('[CM] city composed ' + c.id + ' cats=' + Object.keys(full.categories).length); } } }
  catch(e){ mpSwallow(e, 'community city'); c._full = true; /* لا دوران: تبقى بيانات الفهرس */ }
  c._loading = false; return c;
}
function backToCommunityList(){
  viewingUserUid = null;
  communityUserLayer = null;
  renderCommunityModal();
}
// v1.37 · المجتمع بكيانيه — الأماكن: الأكثر تفضيلًا (عبر كل المدن اليوم — بطاقة المكان بلا حقل مدينة بالقواعد ٣٫٧؛ التصفية بالمدينة مع معرّف المكان بالمحطة الثالثة)
// ر٦١: عارض «الأماكن الأكثر حفظًا» تقاعد — السوق بشريحتيه حلّ محله (v1.41)


/* ر٥٧ · شريحة «Bookmarked lists» (بند ر٥١/٤ — نُفِّذ هنا بإقرار السقوط):
   سجلاتك هوية فقط ← الأصل الحي يعطي الاسم والعدّادات؛ تجميع دولة ← مدينة (روح المحدد بالمرجع)؛
   القائمة التي لم تعد عامة صف degraded بـ✕ — نمط Bookmarked trips نفسه */
async function removeDegradedListBookmark(listId){
  const r = listBookmarksMap && listBookmarksMap[listId]; if (!r) return;
  delete listBookmarksMap[listId];
  renderCommunityModal();
  try{
    await mpData.bookmarks.toggleList(currentUser.uid, r.ownerUid, r.cityId, false);
  }catch(e){
    try{ await mpData.bookmarks.removeRecord(currentUser.uid, listId); }catch(_){ }
  }
}
async function renderBookmarkedLists(wrap, cityName){ // r72s (قرار المالك): مفكرتي من الآخرين مجمَّعة بالمستخدم — كبسولته رأسًا، وتحته قوائمه المميَّزة بطاقاتٍ ثم أماكنه المميَّزة بمجموعة رأسها اسم القائمة (المدينة · الفرعي)
  if (!currentUser){ wrap.innerHTML = '<div class="mp-empty">Sign in to see your bookmarked lists.</div>'; return; }
  wrap.innerHTML = '<div class="mp-empty mini">Loading…</div>';
  await ensureListBookmarks();
  const cityF = communityScreenState[communityTab].city || '';
  const recs = Object.keys(listBookmarksMap || {}).map(function(k){ return listBookmarksMap[k]; }).filter(function(r){ return !cityF || r.cityId === cityF; });
  const pmap = placeBmMap(); const others = Object.keys(pmap).filter(function(k){ return pmap[k] && pmap[k].ownerUid; }).map(function(k){ return Object.assign({ pid: k }, pmap[k]); }).filter(function(b){ return !cityF || b.cityId === cityF; });
  if (!recs.length && !others.length){ wrap.innerHTML = '<div class="mp-empty">🔖<br>Lists and places you bookmark in the community appear here — the owner sees a count, not names.</div>'; return; }
  const byOwner = {}; const order = [];
  const ownerOf = function(uid){ if (!byOwner[uid]){ byOwner[uid] = { uid: uid, lists: [], places: {} }; order.push(uid); } return byOwner[uid]; };
  const live = {};
  await Promise.all(recs.map(async function(r){ try{ const d = await mpData.cityLists.get(r.ownerUid, r.cityId); live[r.ownerUid + '_' + r.cityId] = (d && d.public === true) ? d : null; }catch(e){ live[r.ownerUid + '_' + r.cityId] = null; } }));
  recs.forEach(function(r){ const d = live[r.ownerUid + '_' + r.cityId]; ownerOf(r.ownerUid).lists.push({ r: r, d: d }); }); // d=null → متدهور (لم يعد عامًّا) يُعرض بـ✕
  others.forEach(function(b){ const g = ownerOf(b.ownerUid); const key = b.cityId + '|' + (b.category || ''); (g.places[key] = g.places[key] || []).push(b); });
  const names = {};
  for (const uid of order){ const known = (communityUsers || []).find(function(u){ return u.uid === uid; }); if (known){ names[uid] = known.nickname; continue; } try{ const pr = await mpData.profiles.get(uid); names[uid] = (pr && pr.nickname) || 'user'; }catch(e){ names[uid] = 'user'; } }
  let html = '';
  order.forEach(function(uid){ const g = byOwner[uid]; const nm = names[uid] || 'user'; const ini = curInitials({ nickname: nm });
    const head = '<button type="button" class="curpill cmpill" onclick="openCommunityUserFrom(\'' + attrStr(uid) + '\')"><span class="curring">' + escapeHtml(ini) + '</span><span class="curnm">' + escapeHtml(nm) + '</span></button>';
    let inner = '';
    g.lists.forEach(function(x){ const d = x.d, r = x.r; const c = allCities().find(function(z){ return z.id === r.cityId; });
      if (!d){ inner += '<div class="pcard degraded"><div class="pc-data"><div class="pc-name">' + escapeHtml((c && c.name) || r.cityId) + '</div><div class="pc-val pc-area dim">No longer public</div></div><div class="pc-acts"><div class="pc-grid"><button type="button" class="pc-a" onclick="removeDegradedListBookmark(\'' + attrStr(uid + '_' + r.cityId) + '\')" title="Remove this bookmark">✕</button></div></div></div>'; return; }
      const cityNm = (c && c.name) || d.cityName || r.cityId;
      let n = 0; Object.keys(d.categories || {}).forEach(function(k){ const e = d.categories[k]; if (e && e.active === true && Array.isArray(e.places)) n += e.places.filter(function(pp){ return pp.url && pp.name; }).length; });
      cmCache.lists[uid + '_' + r.cityId] = Object.assign({ ownerId: uid, cityId: r.cityId, cityName: cityNm, nickname: nm }, d);
      inner += othersCard({ title: escapeHtml(cityNm), sub: 'Places # ' + n, stat: (d.viewCount || 0) + ' views', bmOn: true, cnt: d.bookmarkCount || 0, bmHandler: "toggleListBookmark('" + attrStr(uid) + "', '" + attrStr(r.cityId) + "')", reportKind: 'list', reportKey: uid + '_' + r.cityId, saveHandler: "saveOthersList('" + attrStr(uid) + "', '" + attrStr(r.cityId) + "')", savedOn: !!myCopiedLists[uid + '_' + r.cityId], unsaveHandler: "showToast('Remove copied places from your list in Places')", exportHandler: "openExportPreview('olist', '" + attrStr(uid + '_' + r.cityId) + "')", openHandler: "cmOpenList('" + attrStr(uid) + "', '" + attrStr(r.cityId) + "')" }); });
    Object.keys(g.places).forEach(function(key){ const arr = g.places[key]; const cityId = key.split('|')[0], cat = key.split('|')[1]; const cityNm = (allCities().find(function(z){ return z.id === cityId; }) || {}).name || (arr[0] && arr[0].cityName) || cityId;
      const cards = arr.map(function(b){ const pl = { id: String(b.key || b.pid || '').split(':').pop(), name: b.name || 'Place', url: (b.url && !/^(id|oid):/.test(b.url)) ? b.url : '', area: b.area || '' }; return othersPlaceRowHtml(pl, { uid: uid, nickname: nm }, { id: cityId, name: cityNm }, cat, cityId); }).join('');
      inner += placeGroupHtml(cityNm + ' · ' + (cat ? catLabelOf(cat) : 'Places'), arr.length, '<button type="button" class="go" onclick="cmOpenList(\'' + attrStr(uid) + '\', \'' + attrStr(cityId) + '\', \'curator\')">Open list →</button>', cards); });
    html += '<div class="pgroup"><div class="pg-head">' + head + '<span class="pg-n"># ' + (g.lists.length + Object.keys(g.places).length) + '</span></div>' + inner + '</div>'; });
  wrap.innerHTML = html || '<div class="mp-empty">No bookmarks in this city.</div>';
}
// ر٦٩ح: openBookmarkedListInCommunity حُذفت — الرأس القديم لشاشة المفكرة زال (N-040)
function renderCommunityUserList(wrap){
  if (viewingCommunityTripId){ renderCommunityTripDetail(wrap); return; }
  const __arch = curArchiveBannerHtml(); if (__arch){ wrap.innerHTML = __arch; const inner = document.createElement('div'); wrap.appendChild(inner); wrap = inner; } // ر٧٢-أ-١
  const u = viewingUserData;
  const cities = viewingUserCities;

  if (!communityViewingCityId || !cities.find(c => c.id === communityViewingCityId)){
    communityViewingCityId = cities[0] ? cities[0].id : null;
  }

  // v1.38 (المرجع ٦/د · القرارات ١ سبتمبر): الهرم — الطبقة ٢ بطاقات قوائم المدن (+ الرحلات العامة)، والطبقة ٣ أماكن القائمة المختارة
  if (!communityUserLayer){
    // v1.38ب — المشهد ٦/د٢: صفوف مدمجة بارتفاع صف المكان؛ العودة بأول الصفوف؛ سطر السياق يقول أين أنت
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;"><button type="button" class="backchip" onclick="backToCommunityList()"><i class="fa-solid fa-arrow-left"></i> Community</button></div>
    <div class="ctx" style="margin:0 0 8px;"><b>${escapeHtml(u.nickname)}</b> · ${personLayerOnly === 'trips' ? 'Trips · ' + communityUserTrips.length : 'City lists · ' + cities.length}</div>`; // ر٧٢-أ-٢د
    if (!cities.length && !communityUserTrips.length){
      html += `<div class="mp-empty mini">No cities in this list yet</div>`;
      wrap.innerHTML = html; return;
    }
    if (personLayerOnly !== 'trips') html += cities.map(c => { // ر٧٢-أ-٢د: من شريحة الرحلات تُعرض الرحلات فقط
      let n = 0; Object.keys(c.categories || {}).forEach(k => { const e = c.categories[k]; if (e && e.active === true && Array.isArray(e.places)) n += e.places.filter(p => p && (p.name || p.url)).length; }); /* خ-٦: العدّ بالاسم أو الرابط (الفهرس بلا رابط) */
      const views = c.viewCount || 0;
      const bmOn = !!(listBookmarksMap && listBookmarksMap[u.uid + '_' + c.id]);
      // v1.40 (٦/د٢): مفكرة القائمة أيقونة خطية بعدّاد على محتوى الآخرين (المبدأ التاسع)
      const mine = !!(currentUser && u.uid === currentUser.uid); // ر٧٢-أ-١هـ: بطاقة السوق نفسها (Open → · 📤 · مفكرة بعدّاد · Save بوسمه) — صف أفعال واحد بكل الواجهات
      return othersCard({ title: escapeHtml(c.name), sub: n + (n === 1 ? ' place' : ' places'), stat: views + (views === 1 ? ' view' : ' views'), bmOn: bmOn, cnt: c.bookmarkCount || 0, bmSelf: mine, bmHandler: "toggleListBookmark('" + attrStr(u.uid) + "', '" + attrStr(c.id) + "')", reportKind: 'list', reportKey: u.uid + '_' + c.id, saveMsg: 'Copy this list into yours — stage 3', exportHandler: "exportOtherList('" + attrStr(u.uid) + "', '" + attrStr(c.id) + "')", openHandler: "openCommunityCityList('" + attrStr(c.id) + "')" });
    }).join('');
    const __utrips = communityUserTripsCity ? communityUserTrips.filter(t => t.cityId === communityUserTripsCity || (Array.isArray(t.cities) && t.cities.indexOf(communityUserTripsCity) >= 0)) : communityUserTrips;
    if (personLayerOnly !== 'places' && __utrips.length){
      html += `<div class="pl-cathead"><span>🧳 Trips by ${escapeHtml(u.nickname || 'user')} · ${__utrips.length}${communityUserTripsCity ? ' · ' + escapeHtml((cities.find(c => c.id === communityUserTripsCity) || {}).name || '') : ''}</span></div>`
        + __utrips.map(t => {
          const tTitle = t.customLabel ? (t.cityName + ' — ' + t.customLabel) : t.cityName;
          const tOn = !!(tripSavesMap && tripSavesMap[t.id]);
          const tCnt = t.saveCount || 0;
          // v1.40 (٦/د٢): فعل الحفظ بعدّاده على رحلات الآخرين — «Saved ✓» يُفَك بضغطه + «تراجع»
          return othersCard({ title: escapeHtml(tTitle), sub: (tripTypeLine(t) ? tripTypeLine(t) + ' · ' : '') + tripPlaceCount(t) + ' ' + (tripPlaceCount(t) === 1 ? 'place' : 'places') + ' · ' + t.days.length + ' ' + (t.days.length === 1 ? 'day' : 'days'), bmOn: tOn, cnt: tCnt, bmSelf: !!(currentUser && u.uid === currentUser.uid), selfKind: 'trip', bmHandler: "toggleTripSave('" + attrStr(t.id) + "')", saveHandler: "copyOthersTrip('" + attrStr(t.id) + "')", savedOn: !!tripCopyOf(t.id), unsaveHandler: "removeMyTripCopy('" + attrStr(t.id) + "')", reportKind: 'trip', reportKey: t.id, exportHandler: "exportOtherTrip('" + attrStr(t.id) + "')", openHandler: "openCommunityTrip('" + attrStr(t.id) + "')" }); // ر٧٢-أ-٢ب/د · r72n: بطاقة رحلة السوق نفسها — صف أفعال واحد (Open → · 📤 · مفكرة · Save)
        }).join('');
    }
    wrap.innerHTML = html; return;
  }
  if (!cities.find(c => c.id === communityUserLayer)) { communityUserLayer = null; renderCommunityModal(); return; }
  communityViewingCityId = communityUserLayer;
  { const __c = cities.find(c => c.id === communityUserLayer); if (__c && !__c._full){ wrap.innerHTML = '<div class="mp-empty mini">Loading…</div>'; cmEnsureCity(u.uid, __c).then(function(){ if (viewingUserUid === u.uid && communityUserLayer === __c.id) renderCommunityModal(); }); return; } } /* خ-٦: تحميل المدينة عند فتحها */
  let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;"><button type="button" class="backchip" onclick="cmLayerBack()"><i class="fa-solid fa-arrow-left"></i> ${cmDirect ? 'Community' : escapeHtml(u.nickname) + "'s lists"}</button></div>
  <div class="ctx" style="margin:0 0 8px;"><b>${escapeHtml(u.nickname)}</b> · ${escapeHtml((cities.find(c => c.id === communityViewingCityId) || {}).name || '')}</div>`;

  const cityObj = cities.find(c => c.id === communityViewingCityId);
  const cityLinks = cityObj ? cityObj.categories : {};
  let hasAnyPlace = false;

  const secBlocks = []; // ر٧٠ج (N-081): عنوان القسم الرئيسي ثم فرعياته؛ والمطابق للمرشِّح أولًا
  DATA.forEach(section => {
    let sectionHtml = ''; let secPlaces = 0, secHit = false;
    section.items.forEach(item => {
      const entry = cityLinks[item.id] || cityLinks[Object.keys(CAT_ID_MAP_ONCE).find(function(k){ return CAT_ID_MAP_ONCE[k] === item.id && cityLinks[k]; })]; // معرّف قديم لم يُعد بعد
      if (!entry || entry.active !== true || !entry.places || !entry.places.length) return;
      const validPlaces = entry.places.filter(p => p.url && p.name);
      if (!validPlaces.length) return;
      const __hit = (cmFilterSub && item.id === cmFilterSub) || (cmFilterMain && !cmFilterSub && (section.id || section.title) === cmFilterMain); if ((cmFilterMain || cmFilterSub) && !__hit) return; /* ملاحظة المالك: مع التصفية لا يظهر غير المحدد */
      hasAnyPlace = true; secPlaces += validPlaces.length; if (__hit) secHit = true;
      const __cards = validPlaces.map(p => othersPlaceRowHtml(p, { uid: u.uid, nickname: u.nickname }, cityObj, item.id, communityViewingCityId)).join(''); // ر٦٩ث (N-062) · ر٧٢-أ-١د · r72w: المجموعة العاجية بالفرعي بلا أيقونة
      sectionHtml += placeGroupHtml(displayName(item), validPlaces.length, '', __cards);
    });
    if (sectionHtml){ const __k = u.uid + '|' + communityViewingCityId + '|' + (section.id || section.title); const __closed = (cmFilterMain || cmFilterSub) ? !secHit : cmSecIsClosed(__k); secBlocks.push({ hit: secHit, html: secHeadHtml(sectionDisplay(section).name, secPlaces, __closed, "cmToggleSection('" + attrStr(__k) + "')") + (__closed ? '' : sectionHtml) }); } /* خ-٦ (قرار ١٠-٠٣-٠٢): الأقسام مطوية افتراضيًّا كشاشة الأماكن · الحالة بالجلسة · التصفية تفتح المطابق وحده */
  });
  secBlocks.sort(function(a, b){ return (b.hit ? 1 : 0) - (a.hit ? 1 : 0); }); html += secBlocks.map(function(x){ return x.html; }).join('');
  if ((cmFilterMain || cmFilterSub) && hasAnyPlace) html += '<div class="ctx" style="margin-top:8px;"><button type="button" class="act" onclick="cmFilterMain = \'\'; cmFilterSub = \'\'; renderCommunityModal()">Show all categories</button></div>';

  if (!hasAnyPlace) html += `<div class="mp-empty mini">No active places in this city yet</div>`;
  wrap.innerHTML = html;
}

