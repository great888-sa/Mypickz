// ===== خ١ (٢٧ أغسطس ٢٠٢٦): الإطار — الوجهات الخمس والاستضافة بنقل العنصر =====
// الاستضافة: جسم النافذة القائمة (بمعرّفه) يُنقل مرة واحدة إلى حاوية الوجهة، فتعمل كل دوال العرض القائمة بلا تغيير.
const HOSTED = { Trips: false, Community: false };
let currentTab = 'Places';
function hostBody(bodyId, hostId){
  const body = document.getElementById(bodyId), host = document.getElementById(hostId);
  if (body && host && body.parentNode !== host) host.appendChild(body);
}
// النافذة المنبثقة تُعرض فقط إن لم يكن جسمها مستضافًا بوجهة (يحفظ الدوال القائمة كما هي)
function showBackdropUnlessHosted(backdropId, tab){
  if (HOSTED[tab]) { if (currentTab !== tab) switchTab(tab); return; } // يكسر الاستدعاء المتبادل: الوجهة مستضيفة والحارس لا يعيد النداء
  document.getElementById(backdropId).classList.add('show');
}
function switchTab(tab){
  currentTab = tab;
  ['Places','Trips','Curators','Community','Addresses'].forEach(t => {
    const sc = document.getElementById('screen' + t); if (sc) sc.classList.toggle('on', t === tab);
  });
  document.querySelectorAll('.mp-tab').forEach(b => b.classList.toggle('on', b.getAttribute('data-tab') === tab));
  window.scrollTo(0, 0);
  if (tab === 'Places'){
    renderPlacesBody(); // خ٥/م٢: وجهة الأماكن الجديدة
  } else if (tab === 'Trips'){
    if (!HOSTED.Trips){ hostBody('myTripsBody', 'tripsHost'); HOSTED.Trips = true; }
    if (tripsSource === 'saved'){ renderTripsBody(); } else { openMyTripsModal(); }
  } else if (tab === 'Curators'){
    renderCuratorsBody(); // ر٧٢-أ-١
  } else if (tab === 'Community'){
    if (!HOSTED.Community){ hostBody('communityBody', 'communityHost'); HOSTED.Community = true; }
    openCommunityModal();
  } else if (tab === 'Addresses'){
    loadAddresses(); // خ٢
  }
}
/* ═════ خ٥/م٢ — وجهة الأماكن الجديدة (المشهد ٦/أ v1.25) ═════
   تبني فوق دوال قائمتي القائمة حصرًا (التحميل · الحفظ · النشر · المشاركة · المدن) — لا نداء منصة جديدًا.
   إبر القياس: لا إبرة جديدة بهذه المرحلة عمدًا — النقل من النافذة القديمة والتثبيت بالحارس بالمرحلة ٦. */
let pendingCity = null; // r18 — الحفظ الصريح: مدينة جديدة تبقى بالذاكرة وتُخلَّد مع أول حفظ فعلي تحتها؛ الإلغاء يبخّرها
async function commitPendingCityIfNeeded(cityId){
  if (pendingCity && pendingCity.id === cityId){
    if (!Array.isArray(userListData.customCities)) userListData.customCities = [];
    userListData.customCities.push({ id: pendingCity.id, name: pendingCity.name, country: pendingCity.country });
    pendingCity = null;
    await saveUserListGeneral();
  }
}
let placesSource = 'mine';
let plEdit = null;       // null = إضافة · {catId, index} = تحرير (تغيير التصنيف بالنافذة = النقل بين التصنيفات)
let plModalCat = null;   // التصنيف المختار داخل النافذة

const PL_SOURCES = [['mine', 'My places'], ['bookmarked', 'My bookmarked'], ['curators', 'Saved from Curators'], ['community', 'Saved from Community'], ['shared', 'Shared with me']]; // r72r-1 (قرار المالك): الصف الأول = العنوان بعدده + Show ⌄
let plShowOpen = false, plLastCount = null;
function plSourceCounts(){ // r72w: عدد الأماكن لكل مصدر (من الذاكرة — لا قراءة)
  const mine = myCityListData ? liveCountOf(myCityListData.categories) : 0; const bm = Object.keys(placeBmMap()).filter(function(k){ const b = placeBmMap()[k]; return b && !b.ownerUid && /^id:/.test(String(b.key || b.url || '')); }).length;
  const shared = (sharedCityLists || []).reduce(function(a, r){ return a + liveCountOf(r.categories); }, 0);
  return { mine: mine, bookmarked: bm, curators: 0, community: 0, shared: shared }; }
function plToggleShowPanel(){ plShowOpen = !plShowOpen; plSetSrcTitle(plLastCount); const el = document.getElementById('plShowPanel'); if (!el) return; const cnt = plSourceCounts(); el.innerHTML = plShowOpen ? pickerPanel({ id: 'plShow', bare: true, onPick: 'plPickSource', items: PL_SOURCES.map(function(x){ return { id: x[0], name: x[1] + ((x[0] === 'curators' || x[0] === 'community') ? ' · stage 3' : ''), count: cnt[x[0]], selected: placesSource === x[0] }; }) }) : ''; }
function plPickSource(id){ plShowOpen = false; const el = document.getElementById('plShowPanel'); if (el) el.innerHTML = ''; if (id === 'curators' || id === 'community'){ showSoon('Your copies of places arrive with Save (stage 3)'); return; } selectPlacesSource(id); }
function plSourceLabel(){ return (PL_SOURCES.find(function(x){ return x[0] === placesSource; }) || PL_SOURCES[0])[1]; }
function plSetSrcTitle(n){ if (typeof n === 'number') plLastCount = n; else n = plLastCount; const t = document.getElementById('plSrcTitle'); if (t) t.innerHTML = '<b>' + escapeHtml(plSourceLabel()) + '</b>' + (typeof n === 'number' ? ' <span class="cnt"># ' + n + '</span>' : '') + ' <span class="arr">' + (plShowOpen ? '⌃' : '⌄') + '</span>'; } // r72v (قرار المالك): الشريحة نفسها قائمة المصادر — كامل الصف
function selectPlacesSource(src){
  placesSource = src;
  if (currentUser && userListData && userListData.placesSource !== src){ userListData.placesSource = src; mpData.userLists.merge(currentUser.uid, { placesSource: src }).catch(function(){}); } // ر٦٩ع (N-052)
  plSetSrcTitle(); plSetCtx();
  renderPlacesBody();
}
// v1.37 — سطر السياق الحي: المصدر · المدينة (يتبدل بتبدلهما)
function plSetCtx(){
  const el = document.getElementById('plCtx'); if (!el) return;
  const label = plSourceLabel();
  if (placesSource === 'bookmarked' || placesSource === 'shared'){ el.innerHTML = ''; el.style.display = 'none'; return; } // ر٦٠ (قرار المالك): العرض لكل المدن — السطر يُلغى
  el.style.display = '';
  const city = plCityName() || '';
  el.innerHTML = '<b>' + escapeHtml(label) + '</b>' + (city ? ' · ' + escapeHtml(city) : '');
}
async function renderPlacesBody(){
  const body = document.getElementById('plBody'); if (!body) return;
  if (!currentUser){ body.innerHTML = '<div class="mp-empty" style=""><div class="big">📍</div>Sign in to build your places.</div>'; return; }
  if (placesSource === 'bookmarked'){ renderBookmarkedPlaces(body); return; }
  if (placesSource === 'shared'){ body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; await renderSharedListsInto(body); plSetSrcTitle(sharedCityLists.length); return; } // r72r-1
  if (placesSource === 'curators' || placesSource === 'community'){ await renderSavedFromInto(body, placesSource === 'curators'); return; } // ز-١-ب: حي
  if (placesSource !== 'mine'){
    const t = { curators:['⭐','Curators'], community:['🌍','Community'] }[placesSource];
    body.innerHTML = '<div class="mp-empty" style=""><div class="big">' + t[0] + '</div>' + t[1] + ' — opens in stage 3 of this step.</div>';
    return;
  }
  if (!myListCityId){ // أ-١٢-١ (قرار المالك): لا مدينة تُفرض — انظر plInitialCityPick
    const pick = plInitialCityPick(); myListCityId = pick ? pick.id : null; myListCountry = pick ? pick.country : null;
  }
  if (!myListCountry && myListCityId){ const c0 = myListAllCities().find(x => x.id === myListCityId); myListCountry = c0 ? c0.country : (myListAllCountries()[0] || null); }
  body.innerHTML = '<div class="mp-empty">Loading…</div>';
  await loadMyCityList(myListCityId);
  plSetCtx();
  renderPlacesMine();
}
function plEmptyGuideHtml(){ // أ-١٢-٢ (قرار المالك): عرض الحالة الفارغة نفسه — أربعة أبواب تظهر بكل دخول حتى أول مكان؛ لا علم ولا إغلاق
  if (totalMyPlaces() > 0) return '<div class="mp-empty mini">Pick a city — or add one — to start your places</div>';
  return '<div class="pl-guide">'
    + '<div class="pl-guide-h">Start here — four ways to fill MyPickz</div>'
    + '<button type="button" class="pl-guide-row" onclick="plAddCity()"><b>1 · Add your first place</b><span>＋ City, then ＋ Add place → Paste from Maps. In Google Maps: open the place → Share → Copy.</span></button>'
    + '<div class="pl-guide-row dashed"><b>2 · Import your Google Maps lists</b><span>Google Takeout → "Maps (your places)" → upload the file here · stage 3</span></div>'
    + '<button type="button" class="pl-guide-row" onclick="switchTab(\'Community\')"><b>3 · Explore the Community</b><span>Other users\' public lists and trips by city — save what you like.</span></button>'
    + '<button type="button" class="pl-guide-row" onclick="switchTab(\'Curators\')"><b>4 · Follow Curators</b><span>Active members whose favorites you may like.</span></button>'
    + '</div>';
}
function plInitialCityPick(){ // r70r (قرار المالك ٣): آخر مدينة كانت محددة ← وإلا (ر٧٢-أ-١ح) الأكثر محتوًى ← لا شيء — وسم «مدينتي» أُلغي (قرار المالك ١٦ سبتمبر)
  const all = myListAllCities(), saved = userListData && userListData.listCity;
  const bySaved = saved && all.find(function(c){ return c.id === saved; }); if (bySaved) return bySaved;
  const cpc = (userListData && userListData.cityPlaceCounts) || {}; let best = null, n = 0; all.forEach(function(c){ const k = Number(cpc[c.id]) || 0; if (k > n){ n = k; best = c; } });
  return best || null;
}
/* v1.40 · الشريحة الرابعة «Bookmarked places» — عرض داخلي: دولة ← مدينة ← تصنيف (القرار ٠٣-٠٥)
   ضغط المصمتة يفكّ التمييز فيخرج المكان من العرض ويبقى بقائمتك — برسالة «تراجع» */
function renderBookmarkedPlaces(body){
  const map = placeBmMap(); plSetSrcTitle(Object.keys(map).filter(function(k){ const b = map[k]; return b && !b.ownerUid && /^id:/.test(String(b.key || b.url || '')); }).length); // r72r-1: العنوان بعدده
  const pids = Object.keys(map).filter(function(k){ const b = map[k]; return b && !b.ownerUid && /^id:/.test(String(b.key || b.url || '')); }); // ر٦٩ذ (ق٠٩-٠٩-٠١): عالمك = أماكنك (مفتاح id:) فقط
  if (!pids.length){
    body.innerHTML = '<div class="mp-empty">🔖<br>Bookmark places in your lists — they gather here by city.</div>';
    return;
  }
  const meta = {}; allCities().forEach(function(c){ meta[c.id] = c; });
  const byCity = {};
  pids.forEach(function(pid){
    const b = map[pid]; const cid = b.cityId || '_';
    (byCity[cid] = byCity[cid] || []).push(Object.assign({ pid: pid }, b));
  });
  let html = '';
  Object.keys(byCity).sort(function(a, bK){
    const ca = meta[a], cb = meta[bK];
    return String((ca && ca.country) || '') .localeCompare(String((cb && cb.country) || '')) || String((ca && ca.name) || a).localeCompare(String((cb && cb.name) || bK));
  }).forEach(function(cid){
    const c = meta[cid];
    const anyRec = byCity[cid][0] || {}; const head = c ? ((c.country ? c.country + ' · ' : '') + c.name) : (anyRec.cityName || (myListAllCities().find(function(x){ return x.id === cid; }) || {}).name || 'Other places'); // r72r-1: اسم المدينة من السجل أو من مدني الخاصة
    html += '<div class="pl-sechead"><span>' + escapeHtml(head) + '</span><span class="seccnt"># ' + byCity[cid].length + (byCity[cid].length === 1 ? ' place' : ' places') + '</span></div>';
    const byCat = {};
    byCity[cid].forEach(function(b){ (byCat[b.category || ''] = byCat[b.category || ''] || []).push(b); });
    Object.keys(byCat).sort().forEach(function(cat){
      let __bmCards = ''; // r72r-1: مجموعة عاجية بالفرعي (بلا أيقونة) تضم البطاقات
      byCat[cat].forEach(function(b){ // r72q-2 (وضع bookmark): Maps · 🔖 · 🧳 · 📤
        const q = function(v){ return String(v || '').replace(/'/g, "\\'"); };
        const actions = [
          b.url ? { html: 'Maps ↗', href: b.url, title: 'Open in Google Maps' } : null,
          { cls: 'bmk on', html: bmkSvg(true), on: "togglePlaceBookmark('" + q(b.url) + "', '" + q(b.name || 'Place') + "', '" + q(b.category) + "', '" + q(b.cityId) + "', '" + q(b.area) + "')", title: 'Bookmarked — tap to remove' },
          { html: '🧳', on: "plAddToTripFor('" + q(b.cityId) + "', '" + q(b.category) + "', '" + q(String(b.pid || '').replace(/^id:/, '')) + "', '" + q(b.name || 'Place') + "')", title: 'Add to a trip' },
          { html: '📤', on: "mpSendText('📍 ' + " + JSON.stringify(escapeHtml(b.name || 'Place')) + " + ('" + q(b.url) + "' ? '\\n' + '" + q(b.url) + "' : ''))", title: 'Send' }
        ];
        __bmCards += placeCardHtml({ id: b.pid || b.url, name: b.name || 'Place', url: b.url, area: b.area, picks: b.picks, note: b.note }, 'bookmark', { actions: actions });
      });
      html += placeGroupHtml(cat ? catLabelOf(cat) : 'Places', byCat[cat].length, '', __bmCards);
    });
  });
  body.innerHTML = html;
}
function plCatsAll(){ // كل التصنيفات العامة المتاحة بقسمها — للنافذة الموحدة
  const out = [];
  DATA.forEach(section => {
    const items = section.items.concat(customItems.filter(c => c.section === section.title));
    items.forEach(item => { if (!isPrivateCategoryId(item.id)) out.push({ id: item.id, icon: '', name: displayName(item), section: sectionDisplay(section).name, sectionId: section.id || section.title }); });
  });
  return out;
}
function plCityName(){ const c = myListAllCities().find(x => x.id === myListCityId); return c ? c.name : ''; }
function plCountryCode(name){
  const c = WORLD_COUNTRIES.find(x => x.name === name);
  return c ? c.code : String(name || '').slice(0, 2).toUpperCase();
}
let plPanel = null;                       // 'cities' | 'cats' | null — حالة عرض بحتة
// ر٦٩ع (N-054): رؤوس الأقلام — نص خام، النقطة تُدرج في بداية السطر الحالي
function plNoteBullet(){ const t = document.getElementById('plNote'); if (!t) return; const v = t.value, pos = t.selectionStart || v.length; const lineStart = v.lastIndexOf('\n', pos - 1) + 1; const line = v.slice(lineStart, pos); const ins = (line.trim() === '' ? '' : '\n') + '• '; t.value = v.slice(0, lineStart + (line.trim() === '' ? 0 : line.length)) + ins + v.slice(lineStart + (line.trim() === '' ? 0 : line.length)); t.focus(); const np = lineStart + (line.trim() === '' ? 0 : line.length) + ins.length; t.setSelectionRange(np, np); }
function plTogglePanel(which){ plPanel = (plPanel === which) ? null : which; if (plPanel === 'cats'){ plAddMain = ''; __cp.plAdd = { open: 'main' }; } renderPlacesMine(); }
let plFilterMain = '', plFilterSub = ''; // ر٧٠ط (N-082)
catPairRegister('plFilter', function(v){ plFilterMain = v || ''; plFilterSub = ''; renderPlacesMine(); }, function(v){ plFilterSub = v || ''; renderPlacesMine(); });
function plPlaceNamesOf(catId){ const e = (myCityListData && myCityListData.categories || {})[catId]; return ((e && e.places) || []).map(function(q){ return q && q.name ? q.name : ''; }).filter(Boolean); }
function secHeadHtml(name, count, closed, onclick){ /* خ-٦: رأس القسم الرئيسي المطوي — مكوّن واحد لشاشة الأماكن ولأماكن الآخرين (المنتقون والمجتمع) */ return '<div class="pl-sechead' + (closed ? ' closed' : '') + '" onclick="' + onclick + '"><span>' + escapeHtml(name) + '</span><span class="seccnt"># ' + count + (count === 1 ? ' place' : ' places') + ' ' + (closed ? '<span class="arr">⌄</span>' : '<span class="arr">⌃</span>') + '</span></div>'; }
let plSecCollapsed = {}; // ر٧٠ج: حالة طي الأقسام للجلسة · ز-١-ج-٣ (قرار المالك): مغلقة افتراضيًّا؛ القيمة false تعني فتحها المستخدم
function plToggleSection(id){ plSecCollapsed[id] = !plSecIsClosed(id); renderPlacesMine(); }
let plSearchQ = ''; let plSearchTimer = null; // خ-٣ (قرار المالك): بحث بالاسم بالصف الأول — يصفّي القائمة والخريطة ويفتح الأقسام التي فيها نتائج
function plSearchInput(v){ clearTimeout(plSearchTimer); plSearchTimer = setTimeout(function(){ plSearchQ = pickerNormalize(String(v || '').trim()); const x = document.getElementById('plSearchX'); if (x) x.style.display = plSearchQ ? '' : 'none'; renderPlacesMine(); }, 160); }
function plSearchClear(){ plSearchQ = ''; const i = document.getElementById('plSearch'); if (i) i.value = ''; const x = document.getElementById('plSearchX'); if (x) x.style.display = 'none'; renderPlacesMine(); }
let plSearchOpen = false; /* ملاحظة المالك: شريحة بسهم تفتح حقل البحث وتغلقه بإعادة الضغط */
function plSearchToggle(){ plSearchOpen = !plSearchOpen; const row = document.getElementById('plSearchRow'), arr = document.getElementById('plSearchArr'), chip = document.getElementById('plSearchChip'); if (row) row.style.display = plSearchOpen ? '' : 'none'; if (arr) arr.textContent = plSearchOpen ? '⌃' : '⌄'; if (chip) chip.classList.toggle('on', plSearchOpen); if (plSearchOpen){ const i = document.getElementById('plSearch'); if (i) setTimeout(function(){ i.focus(); }, 30); } else { plSearchClear(); } }
function plSearchHit(p){ if (!plSearchQ) return true; const hay = pickerNormalize([p.name, p.area, p.note, p.tags].filter(Boolean).join(' ')); return hay.indexOf(plSearchQ) >= 0; }
let plSecDefaultClosed = true; // ز-١-ج-٣ (قرار المالك): الأقسام الرئيسية تُفتح مغلقة (قابل للتفضيل لاحقًا)
function plSecIsClosed(id){ return plSecCollapsed[id] === undefined ? plSecDefaultClosed : !!plSecCollapsed[id]; }
function plCatCount(catId){
  const e = (myCityListData && myCityListData.categories) || {};
  const p = (e[catId] && e[catId].places) || [];
  return p.filter(q => q && (q.name || q.url)).length;
}
// البند ٩ (ر٥٢): إرسال قائمة المدينة نصًّا — التصنيفات بأماكنها سطرًا سطرًا بتوقيع sendAddr نفسه
function plExportCityList(){
  if (!myCityListData) return;
  const cats = plCatsAll();
  let out = '📍 ' + plCityName() + ' — my MyPickz list\n';
  let any = false;
  cats.forEach(cat => {
    const entry = (myCityListData.categories || {})[cat.id];
    const all = ((entry && entry.places) || []).filter(p => p && (p.name || p.url));
    if (!all.length) return;
    any = true;
    out += '\n' + cat.name + '\n'; // r72r-1
    all.forEach(p => { out += '• ' + (p.name || 'Place') + (p.area ? ' — ' + p.area : '') + (p.url ? '\n  ' + p.url : '') + '\n'; });
  });
  if (!any){ showToast('No places in this city yet'); return; }
  out += '\nSent via MyPickz · mypickz.app';
  mpSendText(out);
}
function renderPlacesMine(){
  try{ plSetSrcTitle(myCityListData ? liveCountOf(myCityListData.categories) : 0); }catch(_){} // r72r-1: العنوان بعدده
  const body = document.getElementById('plBody'); if (!body) return;
  if (!myListCityId){ // أ-١٢-١: بلا مدينة محددة — صف الرأس بشريحة «Select city» وإرشاد قصير؛ لا مدينة تُفرض
    let h = '<div class="headrow"><button type="button" class="csel" onclick="plTogglePanel(\'countries\')">' + (myListCountry ? ((countryFlag(myListCountry) ? countryFlag(myListCountry) + ' ' : '') + plCountryCode(myListCountry)) : 'Country') + ' ' + (plPanel === 'countries' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>'
      + '<button type="button" class="csel grow" onclick="plTogglePanel(\'cities\')"><b>Select city</b> ' + (plPanel === 'cities' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>'
      + '<button type="button" class="actn primary hact" onclick="plAddCity()"><b>＋</b> City</button></div>';
    if (plPanel === 'countries'){ h += pickerPanel({ id: 'plCountries', title: 'Browse countries', filterPlaceholder: 'Type a country…', onPick: 'plPickCountry', onClose: 'plTogglePanel(null)', items: myListAllCountries().map(function(k){ return { id: k, name: k, icon: countryFlag(k) || '', count: myListAllCities().filter(function(c){ return c.country === k; }).length }; }) }); }
    else if (plPanel === 'cities'){ const inC = myListAllCities().filter(function(c){ return !myListCountry || c.country === myListCountry; }); h += pickerPanel({ id: 'plCities', title: 'Browse cities' + (myListCountry ? ' · ' + myListCountry : ''), filterPlaceholder: 'Type a city…', onPick: 'plPickCity', onClose: 'plTogglePanel(null)', editable: true, onDelete: 'plRemoveCity', canAdd: true, onAdd: 'plAddCity()', emptyText: 'No city yet — add one', items: inC.map(function(c){ const n = (userListData && userListData.cityPlaceCounts) ? userListData.cityPlaceCounts[c.id] : 0; return { id: c.id, name: c.name, count: (typeof n === 'number') ? n : 0, custom: c.id.indexOf('mylist_') === 0 }; }) }); } // ر٧٠س-٣: وضع التحرير بفرع «بلا مدينة» أيضًا
    h += plEmptyGuideHtml();
    body.innerHTML = h; return;
  }
  if (!myCityListData) return;
  const cats = plCatsAll();
  const inCountry = myListAllCities().filter(c => c.country === myListCountry);

  /* الصف الأول — المحدد الواحد والفعل الأساسي (المشهد ٦/أ · القرار ٢٠٢٦-٠٨-٢٩-٠٥) */
  const countriesAll = myListAllCountries();
  const oneCountry = countriesAll.length <= 1;
  let outerHtml = '<div class="headrow">'
    + '<button type="button" class="csel" onclick="plTogglePanel(\'countries\')">' + (countryFlag(myListCountry) ? countryFlag(myListCountry) + ' ' : '') + plCountryCode(myListCountry) + ' ' + (plPanel === 'countries' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>' // ر٧٠ج (N-067): العلم بواجهة الشاشة
    + '<button type="button" class="csel grow" onclick="plTogglePanel(\'cities\')"><b>' + escapeHtml(plCityName()) + '</b> ' + (plPanel === 'cities' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>' // أ-١٢-١: رمز مدينتي بصف الرأس (قرار المالك)
    + '<button type="button" class="actn primary hact" onclick="plAddCity()"><b>＋</b> City</button>' // ر٧٠ج (N-068): فعل رئيس بحيز أوضح — النص كما بالمرجع ٦/أ (إبرة §٢١)
    + '</div>';

  /* الصف الثاني — التصنيفات وطريقة العرض */
  outerHtml += '<div class="chipgrid c3 headgrid">' // ر٦٩ش (N-056): الصف الثاني — أفعال الملكية بثلاثة أعمدة
    + '<button type="button" class="actn primary" onclick="plTogglePanel(\'cats\')"><b>＋</b> Add place</button>' // ر٧٠ل-٣ (قرار المالك): فعل رئيس زعفراني
    + '<button type="button" class="actn' + (myCityListData.public ? ' on' : '') + '" id="plPublicBtn" onclick="plTogglePublic()" title="' + (myCityListData.public ? 'Public — tap to make private' : 'Private — tap to allow others to view') + '">' + '🌐' + '</button>'
    + '<button type="button" class="actn' + (((myCityListData.sharedWith || []).length) ? ' on' : '') + '" id="plShareBtn" onclick="openShareModal(\'list\')" title="' + (((myCityListData.sharedWith || []).length) ? 'Shared with ' + myCityListData.sharedWith.length + ' — tap to manage' : 'Share my list with…') + '">' + shareSvg() + '</button>' // ر٦٩ص (N-055): زعفراني حين تكون مشارَكة
    + '</div>'
    + catPairRow({ id: 'plFilter', main: plFilterMain, sub: plFilterSub, allowAll: true, allLabel: 'All categories', allSubLabel: 'All in this category', countOf: plCatCount, placesOf: plPlaceNamesOf, rerender: 'renderPlacesMine' }) // ر٧٠ط (N-082): التصفية رئيسي ← فرعي
    + '<div class="chipgrid c3 headgrid">' // ر٦٩ش (N-056): الصف الثالث — أدوات العرض والتصدير بثلاثة أعمدة
    + '<button type="button" class="actn" onclick="plToggleView()">' + (plView === 'map' ? 'View: <b>Map</b> · List' : 'View: <b>List</b> · Map') + '</button>' // ز-١-ب: العرض القائم يصير حيًّا (List ⇄ Map)
    + '<button type="button" class="actn soon" onclick="showSoon(\'Day plans arrive with the day-plan batch\')">🗓 Day plan <span class="dim">Soon</span></button>'
    + '<button type="button" class="actn" onclick="openExportPreview(\'list\')" title="Preview and send this city list">📤 Export places list</button>'
    + '</div><div class="ctx" id="plCtx"><b>My places</b></div>';

  /* ر٧٠ب (N-011 · ق٠٩-٠٧-٠٥): اللوحات الثلاث بلوحة الاختيار المشتركة — الدول (بعلمها N-067) · المدن (عدّاد ثابت · المختارة بنقطة · الحذف بوضع التحرير على مدني الخاصة · ＋ Add city أسفل النتائج) · التصنيفات (＋ على كل تصنيف بما فيه الفارغ) */
  if (plPanel === 'countries'){
    outerHtml += pickerPanel({ id: 'plCountries', title: 'Browse countries', filterPlaceholder: 'Type a country…', onPick: 'plPickCountry', onClose: 'plTogglePanel(null)',
      items: countriesAll.map(c => ({ id: c, name: c, icon: countryFlag(c) || '', country: c, count: myListAllCities().filter(x => x.country === c).length, selected: c === myListCountry })) });
  } else if (plPanel === 'cities'){
    const __allMine = myListAllCities(); const __panelCities = plCityPanelAll ? __allMine : inCountry; // r72r-1 (قرار المالك): اللوحة تعرض كل المدن عبر الدول حين يُكتب أو يُطلب، والدولة تتبع المدينة المختارة
    outerHtml += pickerPanel({ id: 'plCities', title: 'Browse cities · ' + (plCityPanelAll ? 'all countries' : (myListCountry || '')), countryLabel: (countryFlag(myListCountry) ? countryFlag(myListCountry) + ' ' : '') + plCountryCode(myListCountry), onCountry: "plTogglePanel('countries')", filterPlaceholder: 'Type a city…',
      onPick: 'plPickCity', onClose: 'plTogglePanel(null)', editable: true, onDelete: 'plRemoveCity', canAdd: true, onAdd: 'plAddCity()', emptyText: 'No city matches — add it below',
      items: __panelCities.map(c => { const n = (userListData && userListData.cityPlaceCounts) ? userListData.cityPlaceCounts[c.id] : undefined;
        return { id: c.id, name: c.name, sub: (plCityPanelAll && c.country) ? c.country : '', count: (typeof n === 'number') ? n : 0, selected: c.id === myListCityId, custom: true }; }) }); // ز-١-ج-٢: كل مدني قابل للحذف
  } else if (plPanel === 'cats'){ // ر٧٠ط-٢: «＋ Add place» بالمستويين — الرئيسي ثم فرعياته بعدّادها؛ اختيار الفرعي يفتح نافذة الإضافة عليه
    outerHtml += '<div class="panel"><div class="phead"><span>Pick a category to add a place</span><span><span class="x" onclick="plTogglePanel(null)">✕</span></span></div>'
      + catPairRow({ id: 'plAdd', main: plAddMain, sub: '', countOf: plCatCount, placesOf: plPlaceNamesOf, rerender: 'renderPlacesMine', subLabel: 'Pick a sub-category' }) + '</div>';
  }

  /* ر٦٩ز: قائمة الأسماء انتقلت إلى نافذة Shared with */
  /* ر٦٩ز (N-034): الضابطان انتقلا لصف أفعال الرأس (🌐/🔒 · 🔗 بنافذة Shared with) */

  /* التصنيفات التي فيها أماكن — بعدّادها و＋ · ثم صف المكان بأفعاله الخمسة */
  let any = false;
  const secOrder = catSections(); const secHtml = {}, secCount = {}; // ر٧٠ج (N-081 أ): التدرج — القسم الرئيسي عنوانًا قابلًا للطي وتحته فرعياته بأماكنها
  cats.filter(cat => (!plFilterMain || cat.sectionId === plFilterMain) && (!plFilterSub || cat.id === plFilterSub)).forEach(cat => { // ر٧٠ط: التصفية
    const entry = (myCityListData.categories || {})[cat.id];
    const all = (entry && entry.places) || [];
    const visible = all.map((q, realIdx) => ({ q: q, realIdx: realIdx })).filter(x => x.q && (x.q.name || x.q.url) && plSearchHit(x.q));
    if (!visible.length) return;
    any = true;
    if (plSecIsClosed(cat.sectionId) && !plSearchQ){ secHtml[cat.sectionId] = secHtml[cat.sectionId] || ' '; secCount[cat.sectionId] = (secCount[cat.sectionId] || 0) + visible.length; return; } // خ-٢: الرسم عند الفتح — القسم المغلق يُعدّ ولا تُبنى بطاقاته
    let html = ''; // يُجمَّع تحت قسمه
    const __catRight = '<button type="button" class="pg-add go" onclick="openPlPlaceModal(\'' + cat.id + '\', null)" title="Add under ' + escapeHtml(cat.name) + '">＋ Add</button>'; let __cards = ''; // r72r-1: المجموعة العاجية برأس الفرعي
    visible.forEach(vx => {
      const pl = vx.q, i = vx.realIdx;
      const bm = isBookmarkedPlace(pl); // ر٦٨: المفتاح هوية العنصر (ر٦٤ كان بصمة الرابط)
      const actions = [ // r72q-2 (وضع mine): Maps · 🔖 · 🧳 · 📤 · ★ · ✏️
        pl.url ? { html: 'Maps ↗', href: pl.url, title: 'Open in Google Maps' } : null,
        { cls: 'bmk' + (bm ? ' on' : ''), html: bmkSvg(bm), on: "plToggleBm('" + cat.id + "', " + i + ")", title: bm ? 'Bookmarked — tap to remove' : 'Bookmark' },
        (activeTripId && pl.id) ? { html: '🧳', on: "addPlaceToTrip('mylist', '" + myListCityId + "', '" + cat.id + "', '" + pl.id + "', null, '" + attrStr(pl.name) + "')", title: 'Add to active trip' } : (pl.id ? { html: '🧳', on: "plAddToTripFor('" + myListCityId + "', '" + cat.id + "', '" + pl.id + "', '" + attrStr(pl.name) + "')", title: 'Add to a trip' } : null),
        { html: '📤', on: "plSendPlace('" + cat.id + "', " + i + ")", title: 'Send this place' },
        { cls: 'star' + (pl.topPlace ? ' on' : ''), html: '★', on: "plToggleTopRow('" + cat.id + "', " + i + ")", title: pl.topPlace ? 'Top place — tap to remove' : 'Add to Top places' },
        { html: '✏️', on: "openPlPlaceModal('" + cat.id + "', " + i + ")", title: 'Edit' },
        (pl.geo && typeof pl.geo.lat === 'number') ? { html: '📍 Edit pin', on: "plConfirmPin('" + cat.id + "', " + i + ")", title: 'Move or remove this pin' } : { html: '📍 Confirm', on: "plConfirmPin('" + cat.id + "', " + i + ")", title: 'Confirm this place on the map' } // خ-٤ (قرار المالك): له دبوس → «Edit pin» يفتح خطوة الخريطة على موضعه
      ];
      __cards += placeCardHtml(pl, 'mine', { actions: actions, fallbackName: cat.name });
    });
    html += placeGroupHtml(cat.name + catLegacyHint(cat.id), visible.length, __catRight, __cards);
    secHtml[cat.sectionId] = (secHtml[cat.sectionId] || '') + html; secCount[cat.sectionId] = (secCount[cat.sectionId] || 0) + visible.length;
  });
  secOrder.forEach(function(sc){ if (!secHtml[sc.id]) return; const closed = plSecIsClosed(sc.id);
    outerHtml += secHeadHtml(sc.name, secCount[sc.id], closed, "plToggleSection('" + attrStr(sc.id) + "')"); // ر٧٠ل-٣: العدّاد بارز
    if (!closed) outerHtml += secHtml[sc.id]; });
  if (currentUserSuspended){
    outerHtml += '<div class="warnline">🚫 <span><b>Account Suspended</b><br>You can browse everything, but saving, publishing and sharing are turned off.</span></div>';
  }
  if (myCityListLoadFailed){
    outerHtml += '<div class="warnline">⚠️ <span><b>Could not load this city</b><br>Nothing is saved until it loads, so your places stay safe. <span class="dim">(' + escapeHtml(myCityListLoadError) + ')</span></span></div>'
      + '<button type="button" class="cta wide" onclick="retryLoadCity()">Try again</button>';
  }
  if (!any && !myCityListLoadFailed) outerHtml += (totalMyPlaces() > 0 ? ('<div class="mp-empty">No places in ' + escapeHtml(plCityName()) + ' yet<br>'
    + '<button type="button" class="cta" onclick="plTogglePanel(\'cats\')"><b>＋</b> Add place</button>'
    + '<button type="button" class="actn" onclick="selectPlacesSource(\'community\')">Browse curators &amp; community</button></div>') : plEmptyGuideHtml()); // أ-١٢-٢: بلا مكان بالحساب كله تُعرض لوحة الأبواب الأربعة
  outerHtml += plUnsortedPanelHtml(); // ز-١-ج-٣ (قرار المالك ٢٩ سبتمبر): «Import places still not categorized» — لكل مستخدم؛ مخرج الهجرة والاستيراد
  if (plView === 'map'){ const __places = Object.keys(myCityListData.categories || {}).flatMap(function(k){ return ((myCityListData.categories[k] || {}).places || []).filter(function(q){ return q && (q.name || q.url) && plSearchHit(q); }); }); const __withGeo = __places.filter(function(q){ return q.geo && typeof q.geo.lat === 'number'; }); outerHtml = outerHtml.replace(/<div class="pl-sechead"[\s\S]*$/, '') + '<div class="ctx" id="plMapLine" style="text-align:center;">' + __withGeo.length + ' of ' + __places.length + ' places have a pin — finding suggestions…</div><div class="pinkeys" id="plMapKey" style="display:none;"></div><div id="plMapInline" class="geo-map"></div>'; body.innerHTML = outerHtml; renderInlineMap('plMapInline', __places, null); return; } // ز-١-ب: عرض الخريطة بدل القائمة
  body.innerHTML = outerHtml;
}

async function plPickCountry(v){ if (pendingCity) pendingCity = null; plCityPanelAll = false; /* r72r-1: اختيار دولة يضيّق اللوحة إلى مدنها */ await selectMyListCountry(v); renderPlacesMine(); }
let plSessionCity = null; // أ-١٢-١: المدينة التي اختارها المستخدم بهذه الجلسة (تبقى محددة ولو بلا محتوى)
let plCityPanelAll = true; // r72r-1: اللوحة عبر الدول افتراضيًّا؛ شريحة الدولة تضيّقها اختياريًّا
async function plPickCity(id){ if (pendingCity && pendingCity.id !== id) pendingCity = null; plSessionCity = id; const __c = myListAllCities().find(function(x){ return x.id === id; }); if (__c && __c.country && __c.country !== myListCountry) await selectMyListCountry(__c.country); /* r72r-1: الدولة تتبع المدينة */ await selectMyListCity(id); renderPlacesMine(); try{ mpTrack.statsCity(id, 'open'); }catch(_){} } // r72m
async function plAddCity(){ await addMyListCity(); plSessionCity = myListCityId; await loadMyCityList(myListCityId); renderPlacesMine(); }
let plAddMain = ''; // ر٧٠ط-٢: القسم المختار بلوحة «＋ Add place»
catPairRegister('plAdd', function(v){ plAddMain = v || ''; if (v){ const st = __cp.plAdd; if (st) st.open = 'sub'; } renderPlacesMine(); }, function(v){ if (v){ plPanel = null; openPlPlaceModal(v, null); } else renderPlacesMine(); });
async function plRemoveCity(cityId){
  if (pendingCity && pendingCity.id === cityId){ await removeMyListCity(cityId); renderPlacesBody(); return; } // معلقة: فورية
  openCityDeleteChooser(cityId, 'places');
}
async function plTogglePublic(){ await toggleMyListPublic(); renderPlacesMine(); }
async function plShareWith(){ await shareMyListWithSomeone(); renderPlacesMine(); }
async function plRemoveShare(uid){ await removeMyListShare(uid); renderPlacesMine(); }
// البند ٨ (ر٥٢ — قرار المالك): إرسال المكان نصًّا موقَّعًا — نفس مركّب sendAddr
async function plSendPlace(catId, i){ // ر٧٠و (N-076): معاينة الإرسال بخيار البطاقة — البطاقة نفسها المستعملة لمكان الآخرين
  const e0 = userGetEntry(catId); const pl0 = (e0.places || [])[i]; if (!pl0) return;
  const key = 'my_' + catId + '_' + i; cmCache.places[key] = { name: pl0.name, url: pl0.url, owner: null, area: pl0.area, city: plCityName(), category: catId, picks: pl0.picks || [], note: pl0.note || '', flags: pl0.flags || [], myCat: catId, myIndex: i }; // ر٧٠ط-٢: العلامات والاختيارات والملاحظة كانت تسقط
  openExportPreview('oplace', key);
}
async function plSendPlaceText(catId, i){
  const e = userGetEntry(catId); const pl = (e.places || [])[i]; if (!pl) return;
  const cat = plCatsAll().find(c => c.id === catId);
  const text = (cat ? cat.name : '') + (pl.name ? ': ' + pl.name : '') + ' — ' + plCityName()
    + (pl.area ? ' · ' + pl.area : '') + (pl.note ? ' · ' + pl.note : '')
    + (pl.url ? '\n' + pl.url : '') + '\nSent via MyPickz · mypickz.app';
  await mpSendText(text);
}
async function plToggleBm(catId, i){
  const e = userGetEntry(catId); const pl = (e.places || [])[i]; if (!pl || !pl.url) return;
  await togglePlaceBookmark(bmKeyFor(pl), pl.name, catId, myListCityId, pl.area || ''); // ر٦٨: المفتاح هوية العنصر
  renderPlacesMine();
}
function plDeleteRow(catId, i){
  const e = userGetEntry(catId); const pl = (e.places || [])[i]; if (!pl) return;
  if (!confirm('Delete "' + (pl.name || 'this place') + '"?')) return;
  removeUserPlace(catId, i);
  renderPlacesMine();
}
/* نافذة المكان الموحدة: إضافة · تحرير · نقل بين التصنيفات · لصق ما شاركته الخرائط */
function plSetMethod(paste){                 // طريقتا الإضافة داخل النافذة: لصق ما شاركته الخرائط · أو إدخال يدوي
  document.getElementById('plPasteWrap').style.display = paste ? '' : 'none';
  document.querySelectorAll('#plMethodRow .chip').forEach(function(b){ b.classList.remove('on'); });
  document.getElementById(paste ? 'plMethodPaste' : 'plMethodManual').classList.add('on');
}
function openPlPlaceModal(catId, index){
  plResolvedAddr = ''; plGeoConfirmed = false; plGeoResult = null; // ز-١-ب
  if (catId !== null && index !== null){ plEdit = { catId: catId, index: index }; plModalCat = catId; }
  else { plEdit = null; plModalCat = catId; }
  if (!catId) plModalSec = null;
  plFillModal(false);
}
function plFillModal(pasteMode){
  document.getElementById('plPlaceTitle').textContent = plEdit ? '✏️ Edit place' : '➕ Add a place';
  const delBtn = document.getElementById('plDeleteBtn'); if (delBtn) delBtn.style.display = plEdit ? '' : 'none'; // ر٦١: الحذف داخل التحرير
  plSetMethod(pasteMode !== false);
  document.getElementById('plShareText').value = '';
  document.getElementById('plModalCity').textContent = '🏙 ' + plCityName() + ' — change the city from the chips above';
  if (plModalCat){ const c0 = plCatsAll().find(c => c.id === plModalCat); if (c0) plModalSec = c0.section; }
  const __ul = document.getElementById('plUrlLine'); if (__ul) __ul.textContent = ''; plAreaAuto = ''; // خ-٤
  plRenderModalCats();
  const pl = plEdit ? ((userGetEntry(plEdit.catId).places || [])[plEdit.index] || {}) : {};
  document.getElementById('plName').value = pl.name || '';
  document.getElementById('plUrl').value = pl.url || '';
  document.getElementById('plArea').value = pl.area || '';
  document.getElementById('plNote').value = pl.note || '';
  document.getElementById('plPicks').value = (pl.picks || []).map(function(x){ return x && x.name ? x.name : ''; }).filter(Boolean).join('\n'); // ر٧٠ح
  plModalFine = (pl.flags || []).indexOf('fine_dining') >= 0; plModalTop = !!pl.topPlace; plMoveMode = false; catPairClose('plModal'); // ر٧٠ط
  plPasted = null; const ch = document.getElementById('plCityHint'); if (ch){ ch.style.display = 'none'; ch.innerHTML = ''; } // أ-١٢-٤
  document.getElementById('plDeleteBtn').style.display = plEdit ? '' : 'none';
  document.getElementById('plPlaceBackdrop').classList.add('show');
  if (pasteMode) setTimeout(() => document.getElementById('plShareText').focus(), 60);
}
let plModalSec = null;   // r10: القسم المختار بالمرحلة الأولى
let plModalSecs = [];    // أسماء الأقسام بترتيبها (التمرير بالفهرس لا بالنص)
let plModalFine = false, plMoveMode = false, plModalTop = false;
async function plToggleTopRow(catId, i){ // ⭐ بصف الأفعال — الشروط نفسها (منتقٍ · قائمة عامة) والحفظ بالمسار القائم
  if (!(userListData && userListData.curatorSelf)){ showToast('Top places are for curators — become one from your dashboard'); return; }
  if (!(myCityListData && myCityListData.public)){ showToast('Publish this list first — top places must be public'); return; }
  const entry = userGetEntry(catId); const pl = ((entry && entry.places) || [])[i]; if (!pl) return;
  if (pl.topPlace){ delete pl.topPlace; delete pl.topAt; showToast('Removed from Top places'); } else { pl.topPlace = true; pl.topAt = Date.now(); showToast('Added to Top places ⭐'); }
  await saveMyCityList(); renderPlacesMine();
}
function plToggleTop(){ // ر٧٢-أ-١د: العلامة داخل المكان بمستند قائمته (لا مجموعة ولا قواعد)
  if (!(userListData && userListData.curatorSelf)){ showToast('Top places are for curators — become one from your dashboard'); return; }
  if (!(myCityListData && myCityListData.public)){ showToast('Publish this list first — top places must be public'); return; }
  plModalTop = !plModalTop; plRenderModalCats();
} // ر٧٠ط: علامة Fine dining · وضع النقل من نافذة التعديل
catPairRegister('plModal', function(v){ plModalMainId = v; const cur = plCatsAll().find(function(c){ return c.id === plModalCat; }); if (cur && cur.sectionId !== v) plModalCat = null; plRenderModalCats(); }, function(v){ plModalCat = v; if (plMoveMode){ plMoveMode = false; plMovePlaceTo(v); return; } plRenderModalCats(); });
let plModalMainId = null;
function plRenderModalCats(){
  const cats = plCatsAll();
  const cur = cats.find(function(c){ return c.id === plModalCat; }); if (cur) plModalMainId = cur.sectionId; else if (!plModalMainId && plModalSec){ const sc = catSections().find(function(x){ return x.name === plModalSec; }); if (sc) plModalMainId = sc.id; }
  const isEdit = !!plEdit;
  document.getElementById('plModalCats').innerHTML = catPairRow({ id: 'plModal', main: plModalMainId, sub: plModalCat, rerender: 'plRenderModalCats' })
    + '<div class="chiprow" style="margin-top:8px;"><button type="button" class="chip' + (plModalFine ? ' on' : '') + '" onclick="plModalFine = !plModalFine; plRenderModalCats()">Fine dining</button>'
    + '<button type="button" class="chip' + (plModalTop ? ' on' : '') + '" onclick="plToggleTop()">⭐ Top place</button>' // ر٧٢-أ-١د (قرار المالك): ظاهر للجميع، مفعّل للمنتقي
    + (isEdit ? '<button type="button" class="chip" onclick="plMoveMode = true; catPairToggle(\'plModal\', \'main\')">Move to another category</button>' : '') + '</div>'
    + (plMoveMode ? '<div class="pl-sub" style="margin-top:4px;">Pick the new category — the place moves as soon as you choose a sub-category.</div>' : '');
}
async function plMovePlaceTo(catId){ // ر٧٠ط (N-083): نقل المكان المحرَّر إلى تصنيف آخر فورًا
  if (!plEdit || !catId || catId === plEdit.catId) { plRenderModalCats(); return; }
  const from = userEnsurePlaces(plEdit.catId); const pl = (from.places || [])[plEdit.index]; if (!pl){ plRenderModalCats(); return; }
  from.places.splice(plEdit.index, 1); userEnsurePlaces(catId).places.push(pl); pl.searchKey = placeSearchKey(pl, catId);
  await saveMyCityList(); const c = plCatsAll().find(function(x){ return x.id === catId; }); showToast('Moved to ' + (c ? c.name : catId) + ' ✓');
  closePlPlaceModal(); renderPlacesMine();
}
function closePlPlaceModal(){ document.getElementById('plPlaceBackdrop').classList.remove('show'); plEdit = null; }
async function plUseInferredCity(id){ closePlPlaceModal(); plSessionCity = id; try{ await selectMyListCity(id); }catch(e){} renderPlacesMine(); showToast('City set to ' + (myListAllCities().find(function(c){ return c.id === id; }) || {}).name + ' — add the place again here'); }
function nameSim(a, b){ a = pickerNormalize(a); b = pickerNormalize(b); if (!a || !b) return 0; if (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return 1; const g = function(x){ const o = {}; for (let i = 0; i < x.length - 2; i++) o[x.substr(i, 3)] = 1; return Object.keys(o); }; const ga = g(a), gb = g(b); if (!ga.length || !gb.length) return 0; const sb = {}; gb.forEach(function(t){ sb[t] = 1; }); let n = 0; ga.forEach(function(t){ if (sb[t]) n++; }); return (2 * n) / (ga.length + gb.length); }
async function plPasteShare(){
  try{ const t = await navigator.clipboard.readText(); if (!t || !t.trim()){ showToast('Clipboard is empty'); return; } document.getElementById('plShareText').value = t.trim(); plParseShare(); }
  catch(e){ showToast('Could not access clipboard — paste manually in the box'); }
}
let plPasted = null; // أ-١٢-٤: ما جاء مع الرابط (الاسم · الرابط) لمطابقة الاسم ووسم الرابط
function parseMapsShare(raw){ // المحلّل بثلاث درجات: اسم+عنوان+رابط · اسم+رابط · رابط وحده — دالة واحدة (نقطة تحول نص المشاركة)
  raw = String(raw || '').trim(); const um = raw.match(/https?:\/\/\S+/); const url = um ? um[0] : '';
  let lines = raw.split(/\n+/).map(function(l){ return l.replace(/https?:\/\/\S+/g, '').replace(/^(check out|see)\s+/i, '').trim(); }).filter(Boolean);
  let name = '', address = '';
  if (lines.length >= 2){ name = lines[0]; address = lines.slice(1).join(', '); }
  else if (lines.length === 1){ const l = lines[0]; const i = l.indexOf(', '); if (i > 0 && i < 60){ name = l.slice(0, i); address = l.slice(i + 2); } else name = l; }
  name = name.replace(/[,·]+$/, '').trim();
  const parts = address.split(/,\s*/).map(function(x){ return x.replace(/\b\d{4,6}\b/g, '').trim(); }).filter(Boolean);
  const area = parts.length ? parts[0] : (parisArrFrom(address) || ''); // باريس: الدائرة من الرمز البريدي حين لا حي بالحروف
  return { url: url, name: name, address: address, area: area, parts: parts, grade: (name && address) ? 3 : (name ? 2 : (url ? 1 : 0)) };
}
function inferCityFrom(parts){ const cities = myListAllCities(); for (let i = 0; i < parts.length; i++){ const k = pickerNormalize(parts[i]); if (!k) continue; const c = cities.find(function(x){ return pickerNormalize(x.name) === k || (x.alt || []).some(function(a){ return pickerNormalize(a) === k; }); }); if (c) return c; } return null; }
function plParseShare(){
  const raw = (document.getElementById('plShareText').value || '').trim(); if (!raw){ showToast('Paste the shared text first'); return; }
  const r = parseMapsShare(raw); plPasted = r.url ? { name: r.name, url: r.url } : null;
  if (r.url) document.getElementById('plUrl').value = r.url;
  if (r.url && (!r.name || !r.area)) plResolveLink(r.url); // ز-١-ب: العامل يكمل الاسم/العنوان من الرابط حين ينقصان (يعود فارغًا بأمان لروابط cid)
  if (r.name && !document.getElementById('plName').value) document.getElementById('plName').value = r.name;
  if (r.area && !document.getElementById('plArea').value) document.getElementById('plArea').value = r.area; // العنوان إلى المنطقة (الحي أو الشارع) لا إلى الملاحظة
  const hint = document.getElementById('plCityHint'); const c = inferCityFrom(r.parts);
  if (hint){ if (c && c.id !== myListCityId){ hint.style.display = ''; hint.innerHTML = 'Looks like <b>' + escapeHtml(c.name) + '</b> — <button type="button" class="linklike" onclick="plUseInferredCity(\'' + attrStr(c.id) + '\')">switch city</button>'; } else { hint.style.display = 'none'; hint.innerHTML = ''; } }
  showToast(r.url ? (r.grade === 3 ? 'Read ✓ — name and area filled' : r.grade === 2 ? 'Read ✓ — name filled' : 'Link only — type the name') : 'No link found in the pasted text');
}
let plResolvedAddr = ''; // ز-١-ب: عنوان الرابط بعد حلّه (للمطابقة فقط)
let plAreaAuto = ''; // خ-٤: آخر حي مُلئ تلقائيًّا — يُستبدل فقط إن لم يغيّره المستخدم
const KNOWN_COUNTRIES = ['saudi arabia', 'السعودية', 'bahrain', 'البحرين', 'united arab emirates', 'uae', 'الإمارات', 'qatar', 'قطر', 'kuwait', 'oman', 'عمان', 'lebanon', 'لبنان', 'egypt', 'مصر', 'france', 'italy', 'spain', 'switzerland', 'greece', 'united kingdom', 'uk', 'united states', 'usa', 'sweden', 'turkey', 'jordan', 'الأردن'];
function isCityOrCountry(x){ const n = pickerNormalize(String(x || '').replace(/\d+/g, '').trim()); if (!n) return true; if (KNOWN_COUNTRIES.some(function(c){ return pickerNormalize(c) === n; }) || WORLD_COUNTRIES.some(function(c){ return pickerNormalize(c.name) === n; })) return true; return allCities().some(function(c){ return pickerNormalize(c.name) === n || pickerNormalize(c.nameAr || '') === n; }) || pickerNormalize(plCityName()) === n; } // ز-١-ج-٢
function parisArrFrom(addr){ if (myListCityId !== 'paris') return ''; const m = String(addr || '').match(/\b750(\d{2})\b/); if (!m) return ''; const n = parseInt(m[1], 10); if (!n || n > 20) return ''; return n + (n === 1 ? 'er' : 'e') + ' arr.'; } // باريس: الحي بالرقم (الدائرة) من الرمز البريدي 750XX
async function plResolveLink(url){
  try{ const r = await mpData.geo.resolve(url); if (!r) return; plResolvedAddr = r.addr || '';
    const nm = document.getElementById('plName'); if (r.name && nm && !nm.value.trim()){ nm.value = r.name; showToast('Name read from the link ✓'); }
    const line = document.getElementById('plUrlLine'); if (line) line.textContent = r.addr ? '📍 ' + r.addr : ''; // خ-٤: العنوان المحلول يُعرض للاطمئنان (لا يُخزَّن)
    const ar = document.getElementById('plArea'); let filled = false;
    if (r.addr && ar && !ar.value.trim()){ // خ-٤: تطابق سريع بالعنوان → الحي من الموضع (حدود الأحياء) يملأ Area
      try{ const g = await cityGeoOf(myListCityId); const m = await mpData.geo.match(myListCityId, (nm && nm.value) || r.name || '', r.addr, g); if (m && m.auto){ const a = await mpData.geo.area(myListCityId, m.auto.lat, m.auto.lng); if (a && !isCityOrCountry(a)){ ar.value = a; plAreaAuto = a; filled = true; } } }catch(_){}
      if (!filled){ const parts = r.addr.split(',').map(function(x){ return x.trim(); }).filter(Boolean).slice(0, -1); const known = allCities().map(function(c){ return pickerNormalize(c.name); }); const cand = parts.filter(function(x){ return !/\d/.test(x) && !/\b(rd|road|st|street|ave|avenue|rue|via|calle|شارع|طريق)\b/i.test(x) && known.indexOf(pickerNormalize(x)) < 0 && !isCityOrCountry(x); }); if (cand.length){ ar.value = cand[cand.length - 1]; plAreaAuto = ar.value; } else { const arr = parisArrFrom(r.addr); if (arr){ ar.value = arr; plAreaAuto = arr; } } } // ز-١-ب: الحي من نص العنوان احتياطًا
    }
  }catch(e){ mpSwallow(e, 'resolve'); }
}
function plOnPaste(ev){ // ز-١-ج-٢: اللصق المباشر يُقرأ كنص مشاركة (لا نافذة إذن من النظام)
  try{ const t = ((ev.clipboardData || window.clipboardData) || {}).getData ? (ev.clipboardData || window.clipboardData).getData('text') : ''; if (!t || !t.trim()) return; const r = parseMapsShare(t.trim()); if (!r.url) return; ev.preventDefault(); document.getElementById('plUrl').value = r.url; if (r.name && !document.getElementById('plName').value.trim()) document.getElementById('plName').value = r.name; if (!r.name || !r.area) plResolveLink(r.url); showToast(r.name ? 'Read ✓ — name filled' : 'Link pasted ✓'); }catch(_){}
}
async function plPasteUrl(){
  try{ const t = await navigator.clipboard.readText(); if (!t || !t.trim()){ showToast('Clipboard is empty'); return; } const r = parseMapsShare(t.trim()); document.getElementById('plUrl').value = r.url || t.trim(); if (r.name && !document.getElementById('plName').value.trim()) document.getElementById('plName').value = r.name; if (r.url && (!r.name || !r.area)) plResolveLink(r.url); showToast('Pasted ✓'); }
  catch(e){ showToast('Could not access clipboard — paste manually in the field'); }
}
// ═══ ز-١-ب: خطوة الخريطة (Leaflet/OSM خلفيةً) — الدبوس على المرشَّح الأفضل، المرشَّحون مرقَّمون، سحب الدبوس، Skip · لا شيء يُكتب إلى OSM · لا إحداثيات من جوجل
let plGeoConfirmed = false, plGeoResult = null, geoMap = null, geoPin = null, geoPick = null, geoCands = [];
function cityCenterOf(cityId){ const c = allCities().find(function(x){ return x.id === cityId; }); if (c && typeof c.lat === 'number') return [c.lat, c.lng]; const withGeo = myCityListData ? Object.values(myCityListData.categories || {}).flatMap(function(e){ return (e && e.places) || []; }).filter(function(p){ return p.geo && typeof p.geo.lat === 'number'; }) : []; return withGeo.length ? [withGeo[0].geo.lat, withGeo[0].geo.lng] : null; } // ز-١-ج-٢: المركز من المعجم
async function cityGeoOf(cityId){ // مركز ونصف قطر المطابقة: «مدني» ← المعجم بالدولة ← أماكن القائمة · نصف القطر: الجزيرة r · وإلا بحسب السكان (٦–٢٥ كم)
  let c = allCities().find(function(x){ return x.id === cityId; });
  if (c && typeof c.lat !== 'number' && c.country){ try{ const rows = await gazLoad(plCountryCode(c.country)); const row = (rows || []).find(function(r){ return String(r.id) === String(cityId); }); if (row){ c.lat = row.lat; c.lng = row.lng; if (row.r) c.r = row.r; c.p = row.p; if (currentUser && (userListData.customCities || []).indexOf(c) >= 0){ try{ await saveUserListGeneral(); }catch(_){} } } }catch(_){} } // المركز يُحفظ بمدني مرة (المدن المهاجَرة جاءت بلا مركز)
  const center = (c && typeof c.lat === 'number') ? [c.lat, c.lng] : cityCenterOf(cityId); if (!center) return null;
  const r = (c && c.r) ? c.r : Math.max(6, Math.min(25, 6 + 19 * Math.log10(Math.max((c && c.p) || 200000, 10000) / 10000) / 3));
  return { lat: center[0], lng: center[1], r: Math.round(r) };
}
// ═══ خ-٢: وحدة الخريطة الواحدة mpMap — عقد ثابت تستعمله الشاشات الثلاث؛ المزوّد إعداد من قائمة بيضاء (التبديل إلى مزوّد مدفوع = محوّل جديد وسطر إعداد، لا إعادة بناء) · لا شيء يُكتب إلى أي خريطة
const MAP_PROVIDER = 'protomaps';
const MAP_PROVIDERS = { protomaps: { style: 'https://places.mypickz.app/tiles/style/light.json', attribution: '© OpenStreetMap contributors · Protomaps', lib: { js: 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js', css: 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css' } } };
const mpMap = (function(){
  const cfg = MAP_PROVIDERS[MAP_PROVIDER]; let loading = null;
  function load(){ if (window.maplibregl) return Promise.resolve(); if (loading) return loading; loading = new Promise(function(res, rej){ setTimeout(function(){ rej(new Error('map lib timeout')); }, 10000); const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = cfg.lib.css; document.head.appendChild(css); const sc = document.createElement('script'); sc.src = cfg.lib.js; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); }); return loading; }
  function popupHtml(p, o){ o = o || {}; const loc = (o.mine && typeof plLocateInList === 'function') ? plLocateInList(p) : null; // خ-٤ (قرار المالك): الاسم · Maps ↗ · Open card · ✏️ Edit (لمكاني) + Confirm on map للمقترح/المحتمل
    const pre = o.inList ? "closeModalById('dashBackdrop'); " : ''; // داخل القائمة الفرعية: تُغلق أولًا
    return '<div class="geo-pop"><b dir="auto">' + escapeHtml(p.name || 'Place') + '</b>' + (p.area ? '<div class="dim" dir="auto">' + escapeHtml(p.area) + '</div>' : '') + (o.note ? '<div class="dim">' + o.note + '</div>' : '') + '<div class="geo-pop-acts">' + (p.url ? '<a class="act" href="' + attrStr(p.url) + '" target="_blank" rel="noopener">Maps ↗</a>' : '') + (loc ? '<button type="button" class="act" onclick="' + pre + 'plOpenCardAt(\'' + attrStr(loc.catId) + '\', ' + loc.index + ')">Open card</button><button type="button" class="act" onclick="' + pre + 'openPlPlaceModal(\'' + attrStr(loc.catId) + '\', ' + loc.index + ')">✏️ Edit</button>' : '') + (loc && o.confirm ? '<button type="button" class="act on" onclick="' + pre + 'plConfirmPin(\'' + attrStr(loc.catId) + '\', ' + loc.index + ')">📍 Confirm on map</button>' : '') + '</div></div>'; }
  async function create(el, o){ // o: { center:[lat,lng], zoom }
    await load(); const map = new maplibregl.Map({ container: el, style: cfg.style, center: [o.center[1], o.center[0]], zoom: o.zoom || 13, attributionControl: false }); map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left'); map.addControl(new maplibregl.AttributionControl({ compact: true })); // الإسناد من مصدر الأسلوب (لا تكرار)
    let errOnce = false; if (map.on) map.on('error', function(ev){ const msg = (ev && ev.error && ev.error.message) || 'map error'; const where = (ev && ev.error && ev.error.url) ? String(ev.error.url).replace(/^https?:\/\/[^/]+/, '') : (ev && ev.tile ? 'tile' : (ev && ev.sourceId ? ev.sourceId : '')); mpSwallow(ev && ev.error || new Error(msg), 'map'); if (!errOnce && !/AbortError|aborted/i.test(msg)){ errOnce = true; showToast('Map: ' + msg.slice(0, 60) + (where ? ' · ' + where.slice(0, 70) : '')); } }); // خ-٢: لا خريطة صمّاء — الخطأ يظهر مع موضعه
    const h = { map: map, markers: [],
      setView: function(latlng, zoom){ map.jumpTo({ center: [latlng[1], latlng[0]], zoom: zoom || map.getZoom() }); },
      fitBounds: function(points){ if (!points.length) return; const b = new maplibregl.LngLatBounds(); points.forEach(function(q){ b.extend([q[1], q[0]]); }); map.fitBounds(b, { padding: 40, maxZoom: 16, duration: 0 }); },
      marker: function(latlng, opt){ opt = opt || {}; let elm = null;
        if (opt.label !== undefined && opt.label !== '' && !opt.suggested){ elm = document.createElement('div'); elm.className = 'geo-num'; elm.innerHTML = '<b>' + escapeHtml(String(opt.label)) + '</b>'; }
        else if (opt.family){ elm = document.createElement('div'); elm.className = 'geo-pin geo-pin-fam geo-pin-' + opt.family; elm.innerHTML = '<svg viewBox="0 0 24 34" width="22" height="31" aria-hidden="true"><path d="M12 1C6 1 1.5 5.6 1.5 11.5c0 7.6 8.6 18.6 9.9 20.2a.8.8 0 0 0 1.2 0c1.3-1.6 9.9-12.6 9.9-20.2C22.5 5.6 18 1 12 1z"/><circle cx="12" cy="11.5" r="3.6"/></svg>'; } /* خ-٥: المؤكَّد بلون قسمه (بلا أيقونات — قرار سابق) */
        else if (opt.suggested){ elm = document.createElement('div'); elm.className = 'geo-pin ' + (opt.probable ? 'geo-pin-prob' : 'geo-pin-sugg'); elm.innerHTML = '<svg viewBox="0 0 24 34" width="22" height="31" aria-hidden="true"><path d="M12 1C6 1 1.5 5.6 1.5 11.5c0 7.6 8.6 18.6 9.9 20.2a.8.8 0 0 0 1.2 0c1.3-1.6 9.9-12.6 9.9-20.2C22.5 5.6 18 1 12 1z"/><circle cx="12" cy="11.5" r="3.6"/></svg>' + (opt.probable && opt.count > 1 ? '<span class="geo-pin-n">' + opt.count + '</span>' : ''); } // مقترح: رمادي بإطار زعفراني · محتمل: رمادي أفتح + شارة رقم
        const m = elm ? new maplibregl.Marker({ element: elm, draggable: !!opt.draggable, anchor: (opt.suggested || opt.family) ? 'bottom' : 'center' }) : new maplibregl.Marker({ draggable: !!opt.draggable, color: opt.color || '#c9963a' }); m.setLngLat([latlng[1], latlng[0]]).addTo(map); if (opt.popup) m.setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(opt.popup)); if (opt.onClick) m.getElement().addEventListener('click', function(ev){ ev.stopPropagation(); opt.onClick(); }); if (opt.onDrag) m.on('dragend', function(){ const ll = m.getLngLat(); opt.onDrag({ lat: ll.lat, lng: ll.lng }); }); h.markers.push(m);
        return { setLatLng: function(ll){ m.setLngLat([ll[1], ll[0]]); }, getLatLng: function(){ const ll = m.getLngLat(); return { lat: ll.lat, lng: ll.lng }; }, openPopup: function(){ try{ if (!m.getPopup().isOpen()) m.togglePopup(); }catch(_){} }, remove: function(){ m.remove(); } }; },
      resize: function(){ try{ map.resize(); }catch(_){} },
      featuresAt: function(latlng){ // خ-٤: أقرب مكان وشارع تحت الدبوس من البلاطات المرسومة (طبقتا pois وroads بأسلوب Protomaps) — بلا نداء
        try{ const pt = map.project([latlng[1], latlng[0]]); const box = [[pt.x - 24, pt.y - 24], [pt.x + 24, pt.y + 24]]; const feats = map.queryRenderedFeatures(box) || []; let poi = '', road = '';
          for (const f of feats){ const lid = String((f.layer && f.layer.id) || ''); const nm = (f.properties && (f.properties.name || f.properties['name:en'])) || ''; if (!nm) continue; if (!poi && /pois|places/.test(lid) && !/places_(country|region|locality|subplace)/.test(lid)) poi = nm; if (!road && /roads/.test(lid)) road = nm; if (poi && road) break; }
          return { poi: poi, road: road }; }catch(_){ return { poi: '', road: '' }; } },
      remove: function(){ try{ map.remove(); }catch(_){} } };
    return h;
  }
  return { create: create, load: load, popupHtml: popupHtml, provider: MAP_PROVIDER };
})();
let ctxMap = null; const ctxPins = {};
async function openContextMap(places, title, focusId){ // ز-١-ب: خريطة السياق — كقائمة جوجل المحفوظة: ما له إحداثيات فقط، سياق واحد
  const bd = document.getElementById('mapBackdrop'); if (!bd) return; const withGeo = (places || []).filter(function(p){ return p && p.geo && typeof p.geo.lat === 'number'; });
  document.getElementById('mapTitle').textContent = title || 'Map'; document.getElementById('mapCount').textContent = withGeo.length + ' of ' + (places || []).length + ' places have a pin';
  bd.classList.add('show'); if (!withGeo.length){ document.getElementById('mapCount').textContent = 'No pinned places yet — confirm places on the map when you add them.'; }
  const el = document.getElementById('ctxMap'); if (ctxMap){ ctxMap.remove(); ctxMap = null; }
  const focus = focusId ? withGeo.find(function(p){ return (p.id || p.url) === focusId; }) : null;
  const __g = await cityGeoOf(myListCityId); const center = focus ? [focus.geo.lat, focus.geo.lng] : (withGeo.length ? [withGeo[0].geo.lat, withGeo[0].geo.lng] : (__g ? [__g.lat, __g.lng] : [24.7136, 46.6753]));
  try{ ctxMap = await mpMap.create(el, { center: center, zoom: focus ? 16 : 13 }); }catch(e){ document.getElementById('mapCount').textContent = 'Map could not load'; return; } // خ-٢: خرائطنا
  withGeo.forEach(function(p){ const m = ctxMap.marker([p.geo.lat, p.geo.lng], { popup: mpMap.popupHtml(p, { mine: !!(myCityListData && plLocateInList(p)) }) }); if (focus && p === focus) setTimeout(function(){ m.openPopup(); }, 120); });
  if (!focus && withGeo.length > 1) ctxMap.fitBounds(withGeo.map(function(p){ return [p.geo.lat, p.geo.lng]; }));
  setTimeout(function(){ ctxMap.resize(); }, 60);
}
let plView = 'list', tripView = 'days';
function plToggleView(){ plView = plView === 'map' ? 'list' : 'map'; renderPlacesMine(); }
function tripToggleView(){ tripView = tripView === 'map' ? 'days' : 'map'; renderMyTripsModal(); } // العرض يُعاد بالمسار الطبيعي (جسم الرحلات)
const inlineMaps = {};
let plSuggestDiag = { err: [], index: '', slowest: 0, batches: 0, sent: '' }; // خ-٢: تشخيص آخر بحث (نوع الفشل · الفهرس المُجيب) — يظهر بسطر الخريطة
const plSuggestCache = {}; // خ-٢ (قرار المالك): اقتراحات المواضع لأماكني بلا دبوس — بالجلسة، لا تُحفظ إلا بتأكيد صاحبها
function plPlaceKey(p){ return p.id || p.url || p.name; }
const PIN_FAMILY = { cafes_sweets: 'cafe', restaurants_dish: 'dish', restaurants_cuisine: 'cuisine', shopping_store: 'store', shopping_product: 'product', parks_gardens: 'parks', squares_streets: 'squares' }; /* خ-٥ (قرار مشترك ٣ أكتوبر): ٧ أقسام بألوان مميّزة بأسمائها الأصلية — الكثيفة بوسط المدينة · بقية الأقسام نحاسي («Other categories») · بلا أيقونات */
const PIN_FAMILY_LABEL = { cafe: 'Cafes & Sweets', dish: 'Restaurants · by dish', cuisine: 'Restaurants · by cuisine', store: 'Shopping · by store', product: 'Shopping · by product', parks: 'Parks & Gardens', squares: 'Squares & Streets', rest: 'Other categories' };
let plMapFam = ''; /* مصفّي عائلة بالخريطة (شريحة المفتاح) */
function plPinInfo(p){ const loc = plLocateInList(p); if (!loc) return null; const cat = plCatsAll().find(function(c){ return c.id === loc.catId; }); const fam = (cat && PIN_FAMILY[cat.sectionId]) || 'rest'; return { fam: fam, sectionId: cat ? cat.sectionId : '' }; }
let plSuggestRun = null, plSuggestGen = 0, plSuggestRunCity = ''; /* ر٧٣-أب (١): تغيير المدينة يلغي البحث الجاري فورًا (كان ينتظره فتبدو الشاشة معلّقة)؛ المدينة نفسها تنتظر */
async function plSuggestFor(places){ if (plSuggestRun && plSuggestRunCity === myListCityId) return plSuggestRun; /* المدينة نفسها: مشاركة البحث الجاري لا إلغاؤه (الخريطة تُرسم مرتين عند الفتح) */ const gen = ++plSuggestGen; plSuggestRunCity = myListCityId; plSuggestRun = plSuggestRunOnce(places, gen); try{ return await plSuggestRun; } finally { if (plSuggestGen === gen) plSuggestRun = null; } }
function plSuggestProgress(txt){ const line = document.getElementById('plMapLine'); if (line) line.textContent = txt; }
async function plSuggestRunOnce(places, gen){ // يقين المطابق (أو سجل الهوية) فقط؛ غير ذلك → null (لا تخمين) · التشخيص يتراكم · يتوقف إن تغيّرت المدينة (gen)
  const alive = function(){ if (gen !== plSuggestGen){ plSuggestProgress('Cancelled — city changed'); return false; } return true; };
  const g = await cityGeoOf(myListCityId); const todo = (places || []).filter(function(p){ return p && (p.name || p.url) && !(p.geo && typeof p.geo.lat === 'number') && !(plPlaceKey(p) in plSuggestCache); });
  if (!alive()) return [];
  plSuggestDiag = { err: [], index: plSuggestDiag.index || '', slowest: 0, batches: 0, sent: (g ? mpData.geo.ccOf(myListCityId) + ' ' + (+g.lat).toFixed(3) + ',' + (+g.lng).toFixed(3) + ' r' + g.r : 'no centre') }; /* ما يُرسل فعلًا للعامل (تشخيص) */
  if (!g){ plSuggestDiag.err.push('no city centre'); }
  const rest = []; plSuggestProgress('Checking pinned-before places… ' + todo.length); const idKeys = todo.map(function(p){ return mpData.identity.keyOf(myListCityId, p.name); }); const knownMap = await mpData.identity.getMany(idKeys); if (!alive()) return [];
  todo.forEach(function(p, k){ const known = knownMap[idKeys[k]]; if (known && typeof known.lat === 'number') plSuggestCache[plPlaceKey(p)] = { lat: known.lat, lng: known.lng, openId: known.openId || null, source: known.source === 'user_pin' ? 'user_pin' : 'overture', known: true }; else rest.push(p); });
  const chunks = []; for (let i = 0; i < rest.length; i += 40) chunks.push(rest.slice(i, i + 40)); const nb = chunks.length; let done = 0;
  const runChunk = async function(chunk){ const __t0 = Date.now(); try{ const r = await mpData.geo.matchBatch(myListCityId, chunk.map(function(p){ return { name: p.name || '', addr: p.area || '' }; }), g); if (!alive()) return; if (r && r.index) plSuggestDiag.index = r.index; if (r && r.noData) plSuggestDiag.err.push('noData'); (r && r.results || []).forEach(function(res, k){ const p = chunk[k]; if (!p) return; const top = (res && res.candidates && res.candidates[0]) || null; plSuggestCache[plPlaceKey(p)] = (res && res.auto) ? { lat: res.auto.lat, lng: res.auto.lng, openId: res.auto.id || null, source: 'overture' } : (top ? { lat: top.lat, lng: top.lng, openId: top.id || null, source: 'overture', probable: true, n: (res.candidates || []).length } : null); }); }catch(e){ plSuggestDiag.err.push(/abort/i.test(String(e)) ? 'timeout' : String((e && e.message) || e).slice(0, 24)); } plSuggestDiag.batches++; plSuggestDiag.slowest = Math.max(plSuggestDiag.slowest, Date.now() - __t0); done++; if (alive()) plSuggestProgress('Finding suggestions… ' + done + '/' + nb); };
  for (let i = 0; i < chunks.length; i += 2){ if (!alive()) return []; await Promise.all(chunks.slice(i, i + 2).map(runChunk)); } /* دفعتان بالتوازي */
  if (!alive()) return [];
  return places.filter(function(p){ return p && !(p.geo && typeof p.geo.lat === 'number'); }).map(function(p){ return { p: p, s: plSuggestCache[plPlaceKey(p)] || null }; });
}
let plPinLists = { probable: [], notFound: [] };
let plMapFocus = null; // خ-٤ (قرار المالك): بعد تأكيد دبوس من عرض الخريطة تعود الخريطة إلى موضعه (لا ضمّ كل الدبابيس)
function plOpenPinList(kind){ // نافذة فرعية بأسماء المحتملة/غير الموجودة، لكل اسم زر التأكيد على الخريطة (قرار المالك: لا ازدحام بالسطر)
  const list = plPinLists[kind] || []; const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return; bd.classList.add('show');
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>' + (kind === 'notFound' ? 'Not found in our data' : 'Probable — needs your confirmation') + '</b> · ' + list.length + '</div>' + (list.length ? list.map(function(p){ const sg = plSuggestCache[plPlaceKey(p)]; return '<div class="row rowblock pin-row">' + mpMap.popupHtml(p, { mine: true, confirm: true, inList: true, note: kind === 'notFound' ? 'Not found in our data — place the pin yourself' : (sg && sg.probable ? (sg.n === 1 ? '1 possible match — name differs slightly' : sg.n + ' possible matches') : 'Probable') }) + '</div>'; }).join('') : '<div class="mp-empty mini">Nothing here.</div>'); // قرار المالك: الصف = نافذة الدبوس نفسها
}
function plOpenCardAt(catId, index){ // خ-٤: من نافذة الدبوس إلى بطاقة المكان بموضعها (القسم يُفتح والبطاقة تُوسَّع وتُمرَّر إليها)
  try{ closeModalById('mapBackdrop'); }catch(_){} const cat = plCatsAll().find(function(c){ return c.id === catId; }); if (cat) plSecCollapsed[cat.sectionId] = false; plView = 'list'; const p = ((myCityListData.categories || {})[catId] || { places: [] }).places[index]; const key = p ? ('mine:' + (p.id || hashUrl(p.url || '') || p.name)) : ''; if (key) plCardOpen[key] = true; renderPlacesMine();
  setTimeout(function(){ const el = key ? document.querySelector('.pcard[data-key="' + attrStr(key) + '"]') : null; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
}
function plLocateInList(p){ const cats = (myCityListData && myCityListData.categories) || {}; for (const k in cats){ const arr = (cats[k] && cats[k].places) || []; const i = arr.indexOf(p); if (i >= 0) return { catId: k, index: i }; } return null; }
async function plConfirmPin(catId, index){ // من البطاقة أو من الدبوس المقترح: خطوة الخريطة بالاقتراح جاهزًا → ✓ يحفظ الإحداثيات وحدها
  const p = (((myCityListData || {}).categories || {})[catId] || { places: [] }).places[index]; if (!p) return;
  plEdit = { catId: catId, index: index }; plModalCat = catId; plResolvedAddr = p.area || ''; plGeoConfirmed = false; plGeoResult = null;
  const nm = document.getElementById('plName'), ur = document.getElementById('plUrl'), ar = document.getElementById('plArea'); if (nm) nm.value = p.name || ''; if (ur) ur.value = p.url || ''; if (ar) ar.value = p.area || '';
  await savePlPlace(); // يفتح خطوة الخريطة أولًا (التأكيد دائمًا)
}
async function renderInlineMap(elId, places, labelOf){ // خريطة داخل الشاشة (لا نافذة): دبابيس ما له إحداثيات، بوسم اختياري (رقم اليوم)
  const el = document.getElementById(elId); if (!el) return; if (inlineMaps[elId]){ try{ inlineMaps[elId].remove(); }catch(_){} delete inlineMaps[elId]; }
  const withGeo = (places || []).filter(function(p){ return p && p.geo && typeof p.geo.lat === 'number'; });
  const __g = await cityGeoOf(myListCityId); const __focus = (elId === 'plMapInline' && plMapFocus) ? plMapFocus : null; plMapFocus = null; const center = __focus ? [__focus.lat, __focus.lng] : (withGeo.length ? [withGeo[0].geo.lat, withGeo[0].geo.lng] : (__g ? [__g.lat, __g.lng] : [24.7136, 46.6753]));
  let map; try{ map = await mpMap.create(el, { center: center, zoom: __focus ? 16 : 14 }); }catch(e){ el.innerHTML = '<div class="mp-empty mini">Map could not load</div>'; return; } inlineMaps[elId] = map; // خ-٢: خرائطنا
  const __mine = elId === 'plMapInline' && !!myCityListData; const __fams = {};
  withGeo.forEach(function(p){ const lbl = labelOf ? labelOf(p) : ''; let fam = null; if (__mine && !lbl){ const info = plPinInfo(p); if (info){ fam = info; __fams[info.fam] = (__fams[info.fam] || 0) + 1; if (plMapFam && info.fam !== plMapFam) return; } } map.marker([p.geo.lat, p.geo.lng], { label: lbl || '', family: fam ? fam.fam : undefined, popup: mpMap.popupHtml(p, { mine: __mine }) }); });
  if (__mine){ const key = document.getElementById('plMapKey'); if (key){ const fams = Object.keys(__fams); key.innerHTML = fams.length ? fams.map(function(f){ return '<button type="button" class="chip pinkey pinkey-' + f + (plMapFam === f ? ' on' : '') + '" onclick="plMapFam = plMapFam === \'' + f + '\' ? \'\' : \'' + f + '\'; renderPlacesMine()"><span class="pinkey-dot"></span>' + escapeHtml(PIN_FAMILY_LABEL[f] || f) + ' <span class="cnt"># ' + __fams[f] + '</span></button>'; }).join('') : ''; key.style.display = fams.length ? '' : 'none'; } } /* خ-٥: مفتاح الألوان يصفّي الخريطة */
  if (withGeo.length > 1 && !__focus) map.fitBounds(withGeo.map(function(p){ return [p.geo.lat, p.geo.lng]; }));
  setTimeout(function(){ map.resize(); }, 60);
  if (elId === 'plMapInline' && myCityListData){ const sugg = (await plSuggestFor(places)).filter(function(x){ return plSearchHit(x.p); }); const shown = sugg.filter(function(x){ return x.s; }), need = sugg.filter(function(x){ return !x.s; }); // خ-٢: المقترح (مجوَّف) والمحتاج لدبوس
    const sure = shown.filter(function(x){ return !x.s.probable; }), prob = shown.filter(function(x){ return x.s.probable; });
    shown.forEach(function(x){ map.marker([x.s.lat, x.s.lng], { suggested: true, probable: !!x.s.probable, count: x.s.n || 0, popup: mpMap.popupHtml(x.p, { mine: true, confirm: true, note: (x.s.probable ? (x.s.n === 1 ? '1 possible match — name differs slightly; tap Confirm to check' : x.s.n + ' possible matches — tap Confirm and pick the right one') : 'Suggested') + (x.s.known ? ' · pinned before by users' : '') }) }); });
    plPinLists = { probable: prob.map(function(x){ return x.p; }), notFound: need.map(function(x){ return x.p; }) }; // للنافذة الفرعية
    const line = document.getElementById('plMapLine'); if (line) line.innerHTML = withGeo.length + ' pinned · ' + sure.length + ' suggested · ' + (prob.length ? '<button type="button" class="act on" onclick="plOpenPinList(\'probable\')">' + prob.length + ' probable ›</button>' : '0 probable') + ' · ' + (need.length ? '<button type="button" class="act on" onclick="plOpenPinList(\'notFound\')">' + need.length + ' not found ›</button>' : '0 not found') + (plSuggestDiag.index ? ' · index: ' + plSuggestDiag.index : '') + (plSuggestDiag.batches ? ' · ' + plSuggestDiag.batches + ' batches · slowest ' + (plSuggestDiag.slowest / 1000).toFixed(1) + 's' : '') + (plSuggestDiag.sent ? ' · sent: ' + escapeHtml(plSuggestDiag.sent) : '') + (plSuggestDiag.err.length ? ' · ERR ' + escapeHtml(plSuggestDiag.err.join(', ')) : '');
    const allPts = withGeo.map(function(p){ return [p.geo.lat, p.geo.lng]; }).concat(shown.map(function(x){ return [x.s.lat, x.s.lng]; })); if (allPts.length > 1 && !__focus) map.fitBounds(allPts); }
}
// ═══ ز-١-ج-٣: أماكن بتصنيف لا يعرضه التطبيق (هجرة الدليل · استيراد Takeout · نسخ) → صندوق بشاشة الأماكن يوطّنها صاحبها بنفسه بعدّ متطابق — ولا يختفي مكان أبدًا
const plUnsortedOpen = {}; // ز-١-ج-٣: الصفوف المفتوحة بالصندوق (للجلسة)
function plKnownCatIds(){ const ids = {}; DATA.forEach(function(sec){ (sec.items || []).forEach(function(it){ ids[it.id] = true; }); }); customItems.forEach(function(c){ if (c && c.id) ids[c.id] = true; }); return ids; }
function plUnknownCats(){ if (!myCityListData || !myCityListData.categories) return []; const known = plKnownCatIds(); return Object.keys(myCityListData.categories).filter(function(k){ const e = myCityListData.categories[k]; return !known[k] && e && Array.isArray(e.places) && e.places.some(function(q){ return q && (q.name || q.url); }); }).map(function(k){ return { id: k, n: myCityListData.categories[k].places.filter(function(q){ return q && (q.name || q.url); }).length }; }); }
function plUnsortedPanelHtml(){
  const unk = plUnknownCats(); const orphans = isOwner ? customItems.map(function(c, i){ return { c: c, i: i }; }).filter(function(x){ return x.c && x.c.legacySection; }) : [];
  if (!unk.length && !orphans.length) return '';
  const total = unk.reduce(function(a, x){ return a + x.n; }, 0);
  const opts = '<option value="">Choose a category…</option>' + DATA.map(function(sec){ return '<optgroup label="' + attrStr(sectionDisplay(sec).name) + '">' + (sec.items || []).filter(function(it){ return !isPrivateCategoryId(it.id); }).map(function(it){ return '<option value="' + attrStr(it.id) + '">' + escapeHtml(catLabelOf(it.id)) + '</option>'; }).join('') + '</optgroup>'; }).join('');
  let h = '<div class="pl-ownerpanel" id="plUnsorted"><b>📥 Import places still not categorized</b>';
  if (unk.length) h += '<div class="pl-sub">' + total + ' place' + (total === 1 ? '' : 's') + ' in ' + escapeHtml(plCityName()) + ' came with a category the app does not know — open a group to see its places, then choose a category for all of them (or ✏️ to move one place on its own)</div>' + unk.map(function(x){ const open = !!plUnsortedOpen[x.id]; const places = (myCityListData.categories[x.id].places || []); return '<div class="row rowblock"><div class="pn" onclick="plUnsortedOpen[\'' + attrStr(x.id) + '\'] = !plUnsortedOpen[\'' + attrStr(x.id) + '\']; renderPlacesMine()" style="cursor:pointer;">' + (open ? '▾' : '▸') + ' ' + escapeHtml(x.id) + ' <span class="dim">· ' + x.n + ' place' + (x.n === 1 ? '' : 's') + '</span></div>' + (open ? '<div class="pl-unsorted-list">' + places.map(function(p, i){ if (!p || !(p.name || p.url)) return ''; return '<div class="pl-unsorted-item"><span dir="auto">' + escapeHtml(p.name || p.url) + '</span>' + (p.url ? ' <a href="' + attrStr(p.url) + '" target="_blank" rel="noopener">Maps ↗</a>' : '') + ' <button type="button" class="act" onclick="openPlPlaceModal(\'' + attrStr(x.id) + '\', ' + i + ')" title="Move this place on its own">✏️</button></div>'; }).join('') + '</div>' : '') + '<select class="modal-input" onchange="plResortUnknown(\'' + attrStr(x.id) + '\', this.value)">' + opts + '</select></div>'; }).join('');
  if (orphans.length) h += '<div class="pl-sub">Custom categories whose section no longer exists — choose a section</div>' + orphans.map(function(x){ const c = x.c; return '<div class="row rowblock"><div class="pn">' + escapeHtml(c.icon || '🏷️') + ' ' + escapeHtml(c.name) + ' <span class="dim">· from ' + escapeHtml(c.legacySection) + '</span></div><select class="modal-input" onchange="customCatSetSection(' + x.i + ', this.value)">' + DATA.map(function(sec){ return '<option value="' + attrStr(sec.id || sec.title) + '"' + ((sec.id || sec.title) === c.sectionId ? ' selected' : '') + '>' + escapeHtml(sectionDisplay(sec).name) + '</option>'; }).join('') + '</select></div>'; }).join('');
  return h + '</div>';
}
async function plResortUnknown(oldId, newId){ // النقل بالعدّ: قبل = بعد، وإلا لا حفظ
  if (!newId || !myCityListData || !myCityListData.categories || !myCityListData.categories[oldId]) return;
  const before = Object.keys(myCityListData.categories).reduce(function(a, k){ return a + ((myCityListData.categories[k] || {}).places || []).length; }, 0);
  const src = myCityListData.categories[oldId].places || []; const dst = userEnsurePlaces(newId); dst.active = true; src.forEach(function(p){ if (p && (p.name || p.url)){ if (!p.fromCat) p.fromCat = oldId; dst.places.push(p); } }); // fromCat: أصل المكان لصاحبه (يزول عند التحرير)
  delete myCityListData.categories[oldId]; if (myCityListOldKeys.indexOf(oldId) < 0) myCityListOldKeys.push(oldId);
  const after = Object.keys(myCityListData.categories).reduce(function(a, k){ return a + ((myCityListData.categories[k] || {}).places || []).length; }, 0);
  if (after !== before){ showToast('Count mismatch — nothing saved'); await loadMyCityList(myListCityId); renderPlacesMine(); return; }
  try{ await saveMyCityList(); showToast(src.length + ' place' + (src.length === 1 ? '' : 's') + ' → ' + catLabelOf(newId) + ' ✓'); }catch(e){ mpSwallow(e, 'resort'); showToast('Could not save · ' + ((e && e.code) || 'error')); }
  renderPlacesMine();
}
function placeCopyOf(ownerUid, cityId, catId, placeId){ // هل نسخت هذا المكان من قبل؟ (بحث بالذاكرة بقائمتي للمدينة المحمَّلة أو بسجل النسخ المحلي)
  const key = ownerUid + ':' + cityId + ':' + catId + ':' + placeId; if (myCopiedPlaces[key]) return true;
  if (myCityListData && myListCityId === cityId){ const e = (myCityListData.categories || {})[catId]; return !!((e && e.places) || []).find(function(q){ return q.source && q.source.ownerId === ownerUid && q.source.placeId === placeId; }); } return false;
}
const myCopiedPlaces = {};
const myCopiedLists = {};
async function saveOthersList(ownerUid, cityId){ // ز-١-ب: نسخة القائمة كاملة بإسناد إلى مدينتي (تُدمج بالفرعيات؛ المكرر بالرابط يُتخطى) + سجل النسخ و copyCount على القائمة (القواعد جاهزة)
  if (!currentUser){ openAuthModal(); return; }
  let d = null; try{ d = await mpData.cityLists.get(ownerUid, cityId); }catch(e){ mpSwallow(e, 'copy list'); } if (!d || !d.categories){ showToast('Could not read this list'); return; }
  const cityName = d.cityName || cityId, ownerName = d.nickname || ((curators || []).find(function(c){ return c.uid === ownerUid; }) || {}).nickname || 'a user';
  if (!confirm('Copy all places of ' + cityName + ' by ' + ownerName + ' into your list? Each place keeps its credit.')) return;
  if (!allCities().find(function(c){ return c.id === cityId; })){ if (!Array.isArray(userListData.customCities)) userListData.customCities = []; if (!userListData.customCities.find(function(c){ return c.id === cityId; })){ userListData.customCities.push({ id: cityId, name: cityName, country: '' }); try{ await saveUserListGeneral(); }catch(e){} } }
  const prevCity = myListCityId; if (myListCityId !== cityId){ myListCityId = cityId; await loadMyCityList(cityId); }
  let n = 0; Object.keys(d.categories).forEach(function(catId){ const e = d.categories[catId]; if (!e || e.active === false) return; const dst = userEnsurePlaces(catId); (e.places || []).forEach(function(src){ if (!src || !(src.name || src.url)) return; if (src.url && (dst.places || []).some(function(q){ return q.url === src.url; })) return; dst.active = true; const copy = { id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: src.name || 'Place', url: src.url || '', area: src.area || '', picks: Array.isArray(src.picks) ? src.picks.slice(0, 6) : [], note: src.note || '', source: { ownerId: ownerUid, ownerName: ownerName, cityId: cityId, catId: catId, placeId: src.id || hashUrl(src.url || ''), at: Date.now() } }; if (src.geo && typeof src.geo.lat === 'number') copy.geo = { lat: src.geo.lat, lng: src.geo.lng, source: src.geo.source || 'overture' }; if (src.openId) copy.openId = src.openId; dst.places.push(copy); n++; }); });
  try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'save list copy'); showToast('Could not save · ' + ((e && e.code) || 'error')); return; }
  try{ await mpData.copies.record(currentUser.uid, 'list', ownerUid + '_' + cityId, 'userCityLists'); }catch(e){ mpSwallow(e, 'copy record'); }
  myCopiedLists[ownerUid + '_' + cityId] = true; try{ mpTrack.statsList(ownerUid + '_' + cityId, 'copy'); }catch(_){}
  showToast('Copied ' + n + ' place' + (n === 1 ? '' : 's') + ' · ' + cityName + ' — with credit to ' + ownerName + ' ✓');
  if (prevCity !== cityId){ myListCityId = prevCity; if (prevCity) await loadMyCityList(prevCity); }
  if (typeof renderCommunityModal === 'function' && currentTab === 'Community') renderCommunityModal(); if (currentTab === 'Curators') renderCuratorsBody(); if (currentTab === 'Places') renderPlacesMine();
}
async function renderSavedFromInto(body, fromCurators){ // ز-١-ب: الأماكن المنسوخة بإسناد بكل مدني — مجموعة لكل مدينة · بطاقة مكاني + سطر «From»
  body.innerHTML = '<div class="mp-empty mini">Loading…</div>';
  if (curators === null){ try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = []; } } const curSet = {}; (curators || []).forEach(function(c){ curSet[c.uid] = true; });
  let rows = []; try{ const snap = await mpData.cityLists.byOwner(currentUser.uid); const parents = []; snap.forEach(function(d){ parents.push({ id: d.id, ...d.data() }); }); rows = await Promise.all(parents.map(function(r){ return mpData.cityLists._compose(r, r.id); })); }catch(e){ mpSwallow(e, 'saved from'); }
  let html = '', total = 0;
  rows.forEach(function(list){ const cards = []; Object.keys(list.categories || {}).forEach(function(catId){ ((list.categories[catId] || {}).places || []).forEach(function(p, i){ if (!p.source || !p.source.ownerId) return; const isCur = !!curSet[p.source.ownerId]; if (isCur !== fromCurators) return; cards.push(placeCardHtml(p, 'mine', { cat: { id: catId }, index: i, extraLines: '<div class="pc-lab">From</div><div class="pc-val" dir="auto">' + escapeHtml(p.source.ownerName || 'a user') + ' · ' + escapeHtml(catLabelOf(catId)) + '</div>' })); }); });
    if (cards.length){ total += cards.length; html += placeGroupHtml(list.cityName || list.cityId, cards.length, '', cards.join('')); } });
  plSetSrcTitle(total);
  body.innerHTML = html || '<div class="mp-empty">' + (fromCurators ? '⭐<br>Places you save from curators land here — with credit.' : '🌍<br>Places you save from the community land here — with credit.') + '</div>';
}
async function saveOthersPlace(ownerUid, cityId, catId, placeId){ // ز-١-ب: نسخة بإسناد إلى قائمتي — المدينة نفسها (قياسية أو خاصة تُنشأ باسمها) · الفرعي نفسه · الاسم والرابط والمنطقة وPicks/Note والهوية إن وُجدت
  if (!currentUser){ openAuthModal(); return; }
  let src = null, cityName = cityId, ownerName = 'a user'; try{ const d = await mpData.cityLists.get(ownerUid, cityId); cityName = (d && d.cityName) || cityId; ownerName = (d && d.nickname) || ((curators || []).find(function(c){ return c.uid === ownerUid; }) || {}).nickname || 'a user'; src = ((((d || {}).categories || {})[catId] || {}).places || []).find(function(q){ return (q.id || hashUrl(q.url || '')) === placeId; }); }catch(e){ mpSwallow(e, 'copy place'); }
  if (!src){ showToast('Could not read this place'); return; }
  if (!allCities().find(function(c){ return c.id === cityId; })){ if (!Array.isArray(userListData.customCities)) userListData.customCities = []; if (!userListData.customCities.find(function(c){ return c.id === cityId; })){ userListData.customCities.push({ id: cityId, name: cityName, country: '' }); try{ await saveUserListGeneral(); }catch(e){} } } // مدينة خاصة عند صاحبها → تُنشأ عندي بالاسم نفسه
  const prevCity = myListCityId; if (myListCityId !== cityId){ myListCityId = cityId; await loadMyCityList(cityId); }
  const dst = userEnsurePlaces(catId); dst.active = true;
  const copy = { id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: src.name || 'Place', url: src.url || '', area: src.area || '', picks: Array.isArray(src.picks) ? src.picks.slice(0, 6) : [], note: src.note || '', source: { ownerId: ownerUid, ownerName: ownerName, cityId: cityId, catId: catId, placeId: placeId, at: Date.now() } };
  if (src.geo && typeof src.geo.lat === 'number') copy.geo = { lat: src.geo.lat, lng: src.geo.lng, source: src.geo.source || 'overture' }; if (src.openId) copy.openId = src.openId;
  dst.places.push(copy);
  try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'save copy'); showToast('Could not save · ' + ((e && e.code) || 'error')); return; }
  try{ await mpData.copies.recordOnly(currentUser.uid, 'place', ownerUid + '_' + cityId + ':' + catId + ':' + placeId); }catch(e){ mpSwallow(e, 'copy record'); }
  myCopiedPlaces[ownerUid + ':' + cityId + ':' + catId + ':' + placeId] = true;
  try{ mpTrack.statsPlace(ownerUid + '_' + cityId, hashUrl(src.url || placeId), 'copy'); }catch(_){}
  showToast('Saved to My List · ' + cityName + ' — with credit to ' + ownerName + ' ✓');
  if (prevCity !== cityId){ myListCityId = prevCity; if (prevCity) await loadMyCityList(prevCity); }
  if (typeof renderCommunityModal === 'function' && currentTab === 'Community') renderCommunityModal(); if (currentTab === 'Curators') renderCuratorsBody(); if (currentTab === 'Places') renderPlacesMine();
}
function cmOpenPersonCityMap(cityId, focusId){ const c = (viewingUserCities || []).find(function(x){ return x.id === cityId; }); const places = c ? Object.keys(c.categories || {}).flatMap(function(k){ return ((c.categories[k] || {}).places || []); }) : []; openContextMap(places, ((viewingUserData && viewingUserData.nickname) || 'User') + ' · ' + (c ? c.name : ''), focusId); }
async function openGeoStep(place){
  if (window.__geoAuto){ plGeoResult = window.__geoAuto === 'confirm' ? { geo: { lat: 24.7, lng: 46.7, source: 'user_pin' }, openId: null } : { geo: null, openId: null }; plGeoConfirmed = true; return savePlPlace(); } // قناة المحاكاة (لا واجهة)
  const bd = document.getElementById('geoBackdrop'); if (!bd) { plGeoConfirmed = true; return savePlPlace(); }
  document.getElementById('geoTitle').textContent = place.name || 'Place'; document.getElementById('geoStatus').textContent = 'Finding it on the map…'; document.getElementById('geoCands').innerHTML = ''; geoPick = null; geoCands = [];
  bd.classList.add('show');
  const g = await cityGeoOf(myListCityId); // ز-١-ج-٢: مركز المدينة ونصف قطرها من المعجم
  let res = { candidates: [] }, timedOut = false; try{ res = await mpData.geo.match(myListCityId, place.name, plResolvedAddr || place.area || '', g); }catch(e){ timedOut = true; mpSwallow(e, 'match'); }
  let known = null; const idKey = mpData.identity.keyOf(myListCityId, place.name); try{ known = await mpData.identity.get(idKey); }catch(_){} // سجل الهوية: موضع مصدَّق سابقًا
  if (known && typeof known.lat === 'number'){ const kc = { id: known.openId || ('mp:' + idKey), name: place.name + ' · confirmed', addr: '', lat: known.lat, lng: known.lng, score: 1, known: true }; res.candidates = [kc].concat((res.candidates || []).filter(function(c){ return !(Math.abs(c.lat - kc.lat) < 0.0005 && Math.abs(c.lng - kc.lng) < 0.0005); })); if (!res.auto) res.auto = kc; }
  geoCands = (res.candidates || []).slice(0, 3); const auto = res.auto || null; geoPick = (place.geo && typeof place.geo.lat === 'number') ? { lat: place.geo.lat, lng: place.geo.lng, id: place.openId || null, name: place.name, addr: place.area || '', keep: true } : (auto || geoCands[0] || null);
  const __rm = document.getElementById('geoRemove'); if (__rm) __rm.style.display = (place.geo && typeof place.geo.lat === 'number') ? '' : 'none'; // خ-٤
  const center = geoPick ? [geoPick.lat, geoPick.lng] : (g ? [g.lat, g.lng] : [24.7136, 46.6753]);
  document.getElementById('geoStatus').textContent = (geoPick && geoPick.keep) ? 'Your saved pin — drag to move, or Remove pin.' : (auto && auto.known) ? 'Pinned before by MyPickz users — confirm or drag.' : auto ? 'Is this the place? Confirm or drag the pin.' : (geoCands.length ? 'Pick the right one, or drag the pin.' : (res.noData ? 'No place suggestions for this city yet — drop the pin.' : (timedOut ? 'Suggestions are slow right now — drop the pin, or skip.' : 'Not found in our data — drag the pin to where it is, or skip.')));
  document.getElementById('geoCands').innerHTML = geoCands.map(function(c, i){ return '<button type="button" class="chip geo-cand' + (geoPick && geoPick.id === c.id ? ' on' : '') + '" onclick="geoChoose(' + i + ')">' + (i + 1) + ' · ' + escapeHtml(c.name) + (c.addr ? ' <span class="dim">' + escapeHtml(c.addr) + '</span>' : '') + '</button>'; }).join('');
  const el = document.getElementById('geoMap'); if (geoMap){ geoMap.remove(); geoMap = null; }
  try{ geoMap = await mpMap.create(el, { center: center, zoom: geoPick ? 16 : 14 }); }catch(e){ document.getElementById('geoStatus').textContent = 'Map could not load — you can skip.'; return; } // خ-٢: خرائطنا
  geoCands.forEach(function(c, i){ geoMap.marker([c.lat, c.lng], { label: i + 1, onClick: function(){ geoChoose(i); } }); });
  geoPin = geoMap.marker(center, { draggable: true, onDrag: function(ll){ geoPick = { lat: ll.lat, lng: ll.lng, id: null, name: place.name, addr: '', dragged: true }; document.getElementById('geoStatus').textContent = 'Pin placed by you.'; document.querySelectorAll('.geo-cand').forEach(function(b){ b.classList.remove('on'); }); geoShowArea(ll.lat, ll.lng, 'Pin placed by you'); } }); // خ-٤: ما تحت الدبوس والحي يظهران فور السحب
  setTimeout(function(){ geoMap.resize(); }, 60);
}
function geoChoose(i){ const c = geoCands[i]; if (!c) return; geoPick = Object.assign({}, c); if (geoPin) geoPin.setLatLng([c.lat, c.lng]); if (geoMap) geoMap.setView([c.lat, c.lng], 16); document.querySelectorAll('.geo-cand').forEach(function(b, k){ b.classList.toggle('on', k === i); }); document.getElementById('geoStatus').textContent = 'Selected ' + (i + 1) + ' — confirm or drag.'; geoShowArea(c.lat, c.lng, 'Selected ' + (i + 1) + ' — confirm or drag'); }
async function geoConfirm(){
  if (!geoPick){ showToast('Drag the pin to the place, or skip'); return; }
  const src = geoPick.dragged ? 'user_pin' : (geoPick.keep ? ((myCityListData && plEdit && (userGetEntry(plEdit.catId).places || [])[plEdit.index] || {}).geo || {}).source || 'user_pin' : 'overture');
  plGeoResult = { geo: { lat: +geoPick.lat.toFixed(5), lng: +geoPick.lng.toFixed(5), source: src }, openId: geoPick.dragged ? null : (geoPick.id || null) };
  plGeoConfirmed = true; closeModalById('geoBackdrop'); if (plGeoResult && plGeoResult.geo && plView === 'map') plMapFocus = { lat: plGeoResult.geo.lat, lng: plGeoResult.geo.lng };
  try{ if (plGeoResult && plGeoResult.geo){ const ar = document.getElementById('plArea'); if (ar && (!ar.value.trim() || ar.value === plAreaAuto)){ const a = await mpData.geo.area(myListCityId, plGeoResult.geo.lat, plGeoResult.geo.lng); if (a && !isCityOrCountry(a)){ ar.value = a; plAreaAuto = a; } } } }catch(e){ mpSwallow(e, 'area'); } // خ-٤: الحي من الموضع — لا يستبدل ما كتبه المستخدم
  try{ if (currentUser && plGeoResult && plGeoResult.geo){ const nm = (document.getElementById('plName') || {}).value || ''; const key = mpData.identity.keyOf(myListCityId, nm); let prev = null; try{ prev = await mpData.identity.get(key); }catch(_){} const far = prev && typeof prev.lat === 'number' && geoDistM(prev, plGeoResult.geo) > 1000; if (!far){ const rec = { lat: plGeoResult.geo.lat, lng: plGeoResult.geo.lng, source: plGeoResult.geo.source === 'user_pin' ? 'user_pin' : 'overture', n: nm.slice(0, 120), cityId: String(myListCityId || '').slice(0, 40), by: currentUser.uid, at: Date.now() }; if (plGeoResult.openId && /^ovt:/.test(plGeoResult.openId)) rec.openId = plGeoResult.openId.slice(0, 80); await mpData.identity.put(key, rec); } } }catch(e){ mpSwallow(e, 'identity'); } // v3.11: آخر مؤكِّد يفوز — إلا إن ابتعد > ١ كم عن المسجَّل
  await savePlPlace();
}
function geoDistM(a, b){ const R = 6371000, t = function(x){ return x * Math.PI / 180; }; const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng); const q = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2); return 2 * R * Math.asin(Math.sqrt(q)); }
let geoAreaSeq = 0;
async function geoShowArea(lat, lng, prefix){ // خ-٤: ما تحت الدبوس (أقرب مكان · الشارع من بلاطاتنا) + الحي من حدود الأحياء — يُعرض بسطر الحالة قبل التأكيد
  const seq = ++geoAreaSeq; const near = (geoMap && geoMap.featuresAt) ? geoMap.featuresAt([lat, lng]) : { poi: '', road: '' }; const st = document.getElementById('geoStatus');
  const parts = []; if (near.poi) parts.push('near ' + near.poi); if (near.road) parts.push(near.road); if (st) st.textContent = prefix + (parts.length ? ' · ' + parts.join(' · ') : '') + '.';
  const a = await mpData.geo.area(myListCityId, lat, lng); if (seq !== geoAreaSeq) return; if (a) parts.push('📍 ' + a); if (st) st.textContent = prefix + (parts.length ? ' · ' + parts.join(' · ') : '') + '.';
}
function geoHere(){ // ز-١-ج-٢: موضع الجهاز بإذن المتصفح → دبوس user_pin (لا طرف ثالث)
  if (!navigator.geolocation){ showToast('Location is not available on this device'); return; }
  navigator.geolocation.getCurrentPosition(function(pos){ const ll = [pos.coords.latitude, pos.coords.longitude]; geoPick = { lat: ll[0], lng: ll[1], id: null, dragged: true }; if (geoPin) geoPin.setLatLng(ll); if (geoMap) geoMap.setView(ll, 17); document.getElementById('geoStatus').textContent = 'Pinned at your location — confirm.'; document.querySelectorAll('.geo-cand').forEach(function(b){ b.classList.remove('on'); }); geoShowArea(ll[0], ll[1], 'Pinned at your location — confirm'); }, function(){ showToast('Location permission denied — drag the pin instead'); }, { enableHighAccuracy: true, timeout: 8000 });
}
async function geoRemovePin(){ // خ-٤: يزيل الدبوس المحفوظ ويعيد المكان إلى «بلا دبوس»
  plGeoResult = { geo: null, openId: null }; plGeoConfirmed = true; closeModalById('geoBackdrop'); await savePlPlace();
}
async function geoSkip(){ if (plView === 'map'){ const c = geoPick || null; if (c) plMapFocus = { lat: c.lat, lng: c.lng }; else if (geoMap && geoMap.map && geoMap.map.getCenter){ try{ const ce = geoMap.map.getCenter(); plMapFocus = { lat: ce.lat, lng: ce.lng }; }catch(_){} } } /* خ-٤: Skip يبقي الخريطة على موضع الدبوس كما ✓ */ plGeoResult = { geo: null, openId: null }; plGeoConfirmed = true; closeModalById('geoBackdrop'); await savePlPlace(); }
async function savePlPlace(){
  if (currentUserSuspended){ showToast("Your account is suspended — you can't save changes"); return; }
  const name = document.getElementById('plName').value.trim();
  const url = document.getElementById('plUrl').value.trim();
  if (!plModalCat){ showToast('Pick a category first'); return; }
  if (!name || !url){ showToast('Name and Google Maps link are required'); return; }
  // عقد المكان الجديد بحقوله الفارغة — الحقول حاضرة دائمًا ولو فارغة
  const place = plEdit ? ((userGetEntry(plEdit.catId).places || [])[plEdit.index] || {}) : {};
  place.id = place.id || ('place_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  place.name = name; place.url = url;
  place.area = document.getElementById('plArea').value.trim();
  if (!plGeoConfirmed){ plGeoConfirmed = false; await openGeoStep(place); return; } // ز-١-ب: خطوة الخريطة بملء الشاشة — تعود إلى الحفظ بعد التأكيد/التخطي
  plGeoConfirmed = false; if (plGeoResult){ if (plGeoResult.geo) place.geo = plGeoResult.geo; else delete place.geo; if (plGeoResult.openId) place.openId = plGeoResult.openId; else delete place.openId; plGeoResult = null; }
  place.updatedAt = Date.now(); /* ر٧٣-أب (٢) — قرار المالك: «Latest update places» بختم زمني لكل مكان من الآن */
  place.note = document.getElementById('plNote').value.trim();
  place.picks = String(document.getElementById('plPicks').value || '').split('\n').map(function(l){ return l.trim(); }).filter(Boolean).slice(0, 12).map(function(n){ return { name: n }; }); // ر٧٠ح: البنية النهائية picks:[{name}]
  if (!place.picks.length) delete place.picks;
  place.flags = plModalFine ? ['fine_dining'] : []; if (!place.flags.length) delete place.flags; // ر٧٠ط: العلامات
  if (plModalTop){ if (!place.topPlace || !place.topAt) place.topAt = Date.now(); place.topPlace = true; } else { delete place.topPlace; delete place.topAt; } // ر٧٢-أ-١د
  if (!plEdit) try{ mpTrack.statsCity(myListCityId, 'place_added'); }catch(_){} // r72m (M4.25 ١١): إضافة لا تعديل: Top place بطابع مخزَّن للفرز (لا يُعرض)
  const verified = !!(plPasted && plPasted.url === url && plPasted.name); // أ-١٢-٤: الرابط متحقَّق حين جاء الاسم مع الرابط نفسه
  if (verified && nameSim(name, plPasted.name) < 0.45) showToast("Name doesn't match what came with the link"); // تنبيه لا منع
  if (!verified) place.linkUnverified = true; else delete place.linkUnverified;
  place.searchKey = placeSearchKey(place, plModalCat); // ر٧٠ط: مفتاح البحث المطبَّع
  if (plEdit && plEdit.catId !== plModalCat){
    userEnsurePlaces(plEdit.catId).places.splice(plEdit.index, 1); // النقل بين التصنيفات
    const dst = userEnsurePlaces(plModalCat); dst.active = true; dst.places.push(place);
  } else if (plEdit){
    userEnsurePlaces(plEdit.catId).places[plEdit.index] = place;
  } else {
    const dst = userEnsurePlaces(plModalCat); dst.active = true; dst.places.push(place);
  }
  await saveMyCityList();
  closePlPlaceModal();
  renderPlacesMine();
  showToast('Saved to My List · ' + plCityName() + ' ✓');
}
function deletePlPlaceFromModal(){ // ر٦٣: مسار حذف واحد — الحذف داخل التحرير يمر بمسار الصف نفسه (تأكيد واحد)
  if (!plEdit) return;
  const c = plEdit.catId, i = plEdit.index;
  closePlPlaceModal();
  plDeleteRow(c, i);
}

// r15: نقل خلفيات النوافذ كلها لذيل الجسم عند الجاهزية — يفكّ أي محاصرة سياق تراص محتملة من الحاويات
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.modal-backdrop').forEach(function(b){ document.body.appendChild(b); });
});

// شاشة السياسة (باب مغلق): النص من مسودة v2 والضوابط v1 — يُدرج بـ٢/هـ نصًّا كاملًا؛ الآن هيكل الشاشة بعناوين البنود
function openPolicyModal(kind){
  const body = document.getElementById('policyBody');
  if (kind === 'rules'){
    body.innerHTML = `<h3 style="text-align:center;">📏 Content Rules</h3><p style="font-size:11px;color:var(--ink-soft);text-align:center;">Last updated: August 2026 · draft, not published</p>
      <h4>1. Prohibited places</h4><p style="font-size:12px;">Nightclubs and beach clubs · venues serving alcohol · shisha lounges · gambling · adult content.</p>
      <h4>2. Prohibited practices</h4><p style="font-size:12px;">Link not matching the place · fake or closed places · other people's private addresses · offensive or misleading text · disguised advertising · counter inflation.</p>
      <h4>3. On violations</h4><p style="font-size:12px;">Our usual actions in the Terms apply, at our discretion.</p>`;
  } else {
    body.innerHTML = `<h3 style="text-align:center;">📄 Privacy Policy &amp; Terms</h3>
      <div class="help-attr" id="dataAttribution"><b>Data &amp; maps attribution</b><br>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL) · Map tiles by <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a><br>Place suggestions from <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noopener">Overture Maps Foundation</a> — CDLA Permissive 2.0; records sourced from Foursquare are Apache 2.0 (© Foursquare Labs, Inc.; transformed to the Overture schema)<br>City index from <a href="https://www.geonames.org" target="_blank" rel="noopener">GeoNames</a> (CC BY 4.0)<br>Pins you place are yours. Google Maps links open in Google Maps; no Google Maps data is stored.</div><p style="font-size:11px;color:var(--ink-soft);text-align:center;">Last updated: August 2026 · draft, not published</p>
      <h4>Privacy</h4><ol style="font-size:12px;padding-left:18px;"><li>Who we are</li><li>Data we collect</li><li>Why we collect it</li><li>What others can see</li><li>Your rights</li><li>Security</li></ol>
      <h4>Terms</h4><ol style="font-size:12px;padding-left:18px;"><li>Your account</li><li>Content you add (Content Rules apply)</li><li>Our usual actions on violations</li><li>Limitation of liability</li><li>Changes</li></ol>
      <p style="font-size:11px;color:var(--ink-soft);">Full text is pasted here in batch ٢/هـ from the approved draft.</p>
      <p style="font-size:11px;color:var(--ink-soft);">City names: © <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a>, CC BY 4.0.</p>`;
  }
  document.getElementById('policyBackdrop').classList.add('show');
}
function closePolicyModal(){ document.getElementById('policyBackdrop').classList.remove('show'); }

// قرار المالك ٢٧ أغسطس: قائمة الشارة (حسابي · خروج) وتأكيد الخروج
function toggleChipMenu(){ document.getElementById('chipMenu').classList.toggle('show'); }
function closeChipMenu(){ document.getElementById('chipMenu').classList.remove('show'); }
document.addEventListener('click', (ev) => { const m = document.getElementById('chipMenu'); if (m && m.classList.contains('show') && !ev.target.closest('#chipMenu') && !ev.target.closest('#accountChipBtn')) m.classList.remove('show'); });
function resetSessionState(){ // r72n: كل ما يحمل بيانات حساب بالذاكرة يُصفَّر — يُستدعى عند الخروج وعند تبدّل المصادقة
  try{
    userListData = { customCities: [], customCountries: [], nickname: null, cityPlaceCounts: {}, following: [], placeBookmarks: {} }; myListCityId = null; myListCountry = null; myCityListData = null; myCityListLoadedFor = null; myCityListOldKeys = [];
    userTrips = []; currentTripId = null; tripSavesMap = {}; listBookmarksMap = {}; sharedCityLists = [];
    communityUsers = []; viewingUserUid = null; viewingUserData = null; viewingUserCities = []; communityUserTrips = []; communityViewingCityId = null;
    curators = null; curPage = null; curCity = null; curArchiveOf = null; personLayerOnly = null; Object.keys(curData).forEach(function(k){ delete curData[k]; }); cmSecCollapsed = {}; /* خ-٦ */
    allUsersCache = []; Object.keys(cmCache.lists || {}).forEach(function(k){ delete cmCache.lists[k]; }); Object.keys(curNotesCache).forEach(function(k){ delete curNotesCache[k]; }); // r72p
    ['plBody', 'myTripsBody', 'communityBody', 'curatorsBody'].forEach(function(id){ const el = document.getElementById(id); if (el) el.innerHTML = '<div class="mp-empty mini">Loading…</div>'; });
  }catch(e){ mpSwallow(e, 'reset session'); }
}
function confirmLogout(){
  const formOpen = !!document.querySelector('.modal-backdrop.show, #placeModalBackdrop.show') || (typeof currentTripId !== 'undefined' && !!currentTripId && typeof tripViewMode !== 'undefined' && tripViewMode === false); // ر٦٩ف (N-049): التأكيد فقط حين توجد نافذة مفتوحة أو رحلة مفتوحة في وضع التعديل
  if (!formOpen || confirm('Log out? Unsaved changes in open forms will be lost.')){ closeAccountModal(); doSignOut(); }
}

// ٢/أ: نافذة الحساب — صارت الجزء الأعلى من الدرج (خ١)؛ تُملأ من الذاكرة (لا قراءة إضافية)
function openAccountModal(){ try{ const n = document.getElementById('drNickNow'); if (n) n.textContent = (userListData && userListData.nickname) || ''; }catch(_){}
  try{ if (curators === null && currentUser) mpData.profiles.curators(200).then(function(r){ curators = r; drSyncCurator(); }).catch(function(){}); else drSyncCurator(); }catch(e){} // ر٧٢-أ-١
  if (!currentUser){ openAuthModal(); return; }
  const nick = userListData.nickname || '';
  const av = document.getElementById('accountAv');
  av.textContent = avatarInitials(nick);
  av.style.background = avatarColor(nick);
  document.getElementById('accountName').textContent = nick || '—';
  document.getElementById('accountEmail').textContent = currentUser.email || '—';
  const dro = document.getElementById('drawerOwner'); if (dro) dro.style.display = isOwner ? '' : 'none';
  const lbl = document.getElementById('prefHomeLabel'); if (lbl) lbl.textContent = homePrefLabel(); // r70q2
  document.getElementById('accountBackdrop').classList.add('show');
}
function closeAccountModal(){
  document.getElementById('accountBackdrop').classList.remove('show');
}
function closeAccountModalOnBackdrop(ev){ if (ev && ev.target && ev.target.id === 'accountBackdrop') closeAccountModal(); }

// ٢/أ: تأكيد الهوية كوعد — يُستدعى من ٢/ب و٢/د: const ok = await requestReauth();
let reauthResolver = null;
function requestReauth(){
  return new Promise(resolve => {
    reauthResolver = resolve;
    document.getElementById('reauthPassword').value = '';
    document.getElementById('reauthError').textContent = '';
    document.getElementById('reauthBackdrop').classList.add('show');
    setTimeout(() => document.getElementById('reauthPassword').focus(), 50);
  });
}
function closeReauthModal(result){
  document.getElementById('reauthBackdrop').classList.remove('show');
  const r = reauthResolver; reauthResolver = null;
  if (r) r(result === true);
}
async function doReauthContinue(){
  const pass = document.getElementById('reauthPassword').value;
  const errEl = document.getElementById('reauthError');
  errEl.textContent = '';
  if (!pass){ errEl.textContent = 'Enter your current password'; return; }
  try{
    await mpData.auth.reauthWithPassword(pass);
    closeReauthModal(true);
  }catch(e){
    const code = (e && e.code) || '';
    if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-login-credentials')) errEl.textContent = 'Incorrect password';
    else if (code.includes('too-many-requests')) errEl.textContent = 'Too many attempts — try again later';
    else errEl.textContent = 'Could not confirm — try again';
  }
}

// ٢/أ: عين إظهار كلمة المرور
function togglePasswordVisibility(inputId, btn){
  const el = document.getElementById(inputId);
  if (!el) return;
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  if (btn) btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}

