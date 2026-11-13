// MyPickz — tests/r116.page.js (r116 · ١١ نوفمبر ٢٠٢٦): جسم محطات r116 — يُنفَّذ داخل الصفحة (تقرؤه tests/journey.js)
// كل ضغطة بنصّ المعالج المرسوم على العنصر (press). المتطلّب: مدينة الاختبار r110p محمَّلة (coffee ×٢ · bakery ×١ في قسم واحد · museums ×١). يعيد JSON واحدًا.
(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var toasts = []; var st0 = showToast; showToast = function(m){ toasts.push(String(m)); };
  var a0 = window.__mpSheetAuto; window.__mpSheetAuto = function(s){ return (s && s.input) ? null : 'ok'; };
  var o = {};
  var mkEv = function(){ return { defaultPrevented: false, preventDefault: function(){ this.defaultPrevented = true; }, stopPropagation: function(){} }; };
  var press = function(el, type){ if (!el || el.disabled) return false; var code = el.getAttribute('on' + (type || 'click')); if (!code) return false; var event = mkEv(); (function(){ eval(code); }).call(el); return true; };

  /* ── (ك) ملاحظة المالك ١١ نوفمبر ١٦:٣٦: «Open card» من فقاعة الخريطة والتصنيفات مطوية — ينقل إلى القائمة ولا يفتح البطاقة ── */
  try{
    var keep = { v: plView, g: plGroupClosed, s: plSecCollapsed, fm: plFilterMain, fs: plFilterSub, q: plSearchQ, t: plTownSel, a: plActiveKey, co: Object.assign({}, plCardOpen) }; var gd0 = plGroupDefaultClosed; plGroupDefaultClosed = true; /* حال المستخدم الحقيقية: الرحلة تُطفئ الطيّ الافتراضي لمحطاتها القديمة (journey.js: plGroupDefaultClosed = false) — لذلك لم ترَ محطةٌ هذا العيب */ var clearOpen = function(){ Object.keys(plCardOpen).forEach(function(k){ delete plCardOpen[k]; }); };
    var cardOf = function(id){ return document.querySelector('#plBody .pcard[data-key="mine:' + id + '"]'); };
    var reset = function(){ plView = 'map'; plGroupClosed = {}; plSecCollapsed = {}; plFilterMain = ''; plFilterSub = ''; plSearchQ = ''; plTownSel = ''; plActiveKey = null; clearOpen(); };
    var go = async function(catId, id){ var i = myCityListData.categories[catId].places.findIndex(function(p){ return p.id === id; }); plOpenCardAt(catId, i); await wait(100); var c = cardOf(id); return [!!c, !!(c && c.classList.contains('open')), !!(c && c.classList.contains('active')), plView]; };
    /* الحال الافتراضية: قسم فيه فرعيان — كلاهما مطوي، فلا بطاقة مرسومة */
    reset(); plView = 'list'; renderPlacesMine(); o.foldedBefore = [!!cardOf('b1'), !!cardOf('c1'), document.querySelectorAll('#plBody .pgroup.closed').length]; plView = 'map';
    o.openFolded = await go('bakery', 'b1');
    o.openFoldedOthers = [!!cardOf('c1'), (document.querySelector('#plBody .pgroup[data-group="coffee"]') || { classList: { contains: function(){ return null; } } }).classList.contains('closed')]; /* الفرعي الآخر يبقى مطويًّا */
    /* تصفية بقسم آخر تخفي المكان */
    reset(); plFilterMain = (plCatsAll().find(function(c){ return c.id === 'museums'; }) || {}).sectionId || ''; o.filterWas = plFilterMain; o.openFiltered = await go('bakery', 'b1'); o.filterAfter = [plFilterMain, plFilterSub];
    /* تصفية بفرعي آخر من القسم نفسه */
    reset(); plFilterMain = (plCatsAll().find(function(c){ return c.id === 'coffee'; }) || {}).sectionId || ''; plFilterSub = 'coffee'; o.openSubFiltered = await go('bakery', 'b1'); o.subAfter = [plFilterMain !== '', plFilterSub];
    /* تصفية تُظهر المكان أصلًا تبقى كما هي */
    reset(); plFilterMain = (plCatsAll().find(function(c){ return c.id === 'bakery'; }) || {}).sectionId || ''; plFilterSub = 'bakery'; o.openSameFilter = await go('bakery', 'b1'); o.sameAfter = plFilterSub;
    /* بحث لا يطابق المكان */
    reset(); plSearchQ = 'zzzz'; o.openSearched = await go('bakery', 'b1'); o.searchAfter = plSearchQ;
    /* بحث يطابقه يبقى */
    reset(); plSearchQ = 'crust'; o.openSearchHit = await go('bakery', 'b1'); o.searchKept = plSearchQ;
    /* بلدة مضمومة مختارة ليس المكان منها */
    reset(); plTownSel = 'Nowhere'; o.openTown = await go('bakery', 'b1'); o.townAfter = plTownSel;
    plView = keep.v; plGroupClosed = keep.g; plSecCollapsed = keep.s; plFilterMain = keep.fm; plFilterSub = keep.fs; plSearchQ = keep.q; plTownSel = keep.t; plActiveKey = keep.a; clearOpen(); Object.assign(plCardOpen, keep.co); plGroupDefaultClosed = gd0; renderPlacesMine();
  }catch(e){ o.errK = String(e && e.stack || e); }

  /* ── (ح) دَين carry-tabs: محمول العدّ بين التبويبات ── */
  try{
    var CK = 'mp_track_carry'; var keep0 = localStorage.getItem(CK); var sid = mpTrack._stats.carrySid; var rd = function(){ try{ return JSON.parse(localStorage.getItem(CK) || '{}') || {}; }catch(_){ return {}; } };
    var bufN = function(k){ var b = mpTrack._buf, n = 0; Object.keys(b).forEach(function(p){ if (/^analytics\/events_.*__all__all$/.test(p)) n += b[p][k] || 0; }); return n; };
    var c0 = mpTrack._stats.carry.import_place || 0, b0 = bufN('import_place');
    /* تبويب آخر حيّ يحمل ٧٠ لم تُرسل: لا أتبنّاها، وحفظي لا يمسّ حصّته */
    var all = rd(); all.sLIVETAB = { import_place: 70, t: Date.now() }; localStorage.setItem(CK, JSON.stringify(all)); mpTrack.carryLoad();
    o.tabLive = [(mpTrack._stats.carry.import_place || 0) - c0, bufN('import_place') - b0, (rd().sLIVETAB || {}).import_place];
    mpTrack.count('import_place', 5); o.tabMine = [(rd()[sid] || {}).import_place - c0, (rd().sLIVETAB || {}).import_place, typeof (rd()[sid] || {}).t];
    /* التبويب نفسه أُغلق (حصّته لم تُلمس منذ عشرين دقيقة): أتبنّاها مرة واحدة وحصّته تُمحى */
    all = rd(); all.sLIVETAB.t = Date.now() - 20 * 60 * 1000; localStorage.setItem(CK, JSON.stringify(all)); mpTrack.carryLoad(); mpTrack.carryLoad();
    o.tabDead = [(mpTrack._stats.carry.import_place || 0) - c0, bufN('import_place') - b0, ('sLIVETAB' in rd()), (rd()[sid] || {}).import_place - c0];
    /* الصيغة القديمة (مفتاح ← عدد) تُتبنّى مرة */
    all = rd(); all.import_suggest_kept = 4; localStorage.setItem(CK, JSON.stringify(all)); var k0 = mpTrack._stats.carry.import_suggest_kept || 0; mpTrack.carryLoad(); mpTrack.carryLoad();
    o.tabLegacy = [(mpTrack._stats.carry.import_suggest_kept || 0) - k0, typeof rd().import_suggest_kept];
    /* لا يُترك محمول اختباري */
    var b = mpTrack._buf; Object.keys(b).forEach(function(p){ if (/__all__all$/.test(p)) mpTrack._sent(p, { import_place: mpTrack._stats.carry.import_place || 0, import_suggest_kept: mpTrack._stats.carry.import_suggest_kept || 0 }); });
    o.tabClean = [mpTrack._stats.carry.import_place || 0, mpTrack._stats.carry.import_suggest_kept || 0, sid in rd()];
    if (keep0 === null) localStorage.removeItem(CK); else localStorage.setItem(CK, keep0);
  }catch(e){ o.errT = String(e && e.stack || e); }

  /* ── (ح) أحداث تقبلها القواعد ولم تكن تُطلق ── */
  try{
    var evN = function(k){ var b = mpTrack._buf, n = 0; Object.keys(b).forEach(function(p){ if (/^analytics\/events_/.test(p)) n += b[p][k] || 0; }); return n; };
    /* فتح قائمتي في مدينة: مرة للمدينة في الجلسة */
    delete mpListOpened['r110p']; var m0 = evN('mylist_open'); myCityListLoadedFor = null; await loadMyCityList('r110p'); var m1 = evN('mylist_open'); myCityListLoadedFor = null; await loadMyCityList('r110p'); var m2 = evN('mylist_open');
    o.evList = [m1 - m0, m2 - m1];
    /* فتح العناوين الشخصية بزر التبويب المرسوم */
    var tabWas = currentTab; var ccity = cityListCityId, ccs = (userListData.customCities || []).slice(); cityListCityId = '2267057'; userListData.customCities = ccs.concat([{ id: '2267057', name: 'Lisbon', country: 'Portugal' }]); /* مدينة معجم مفتوحة: حدث غير شخصي كان سيذهب إلى مستندها — والشخصي إلى العام وحده */ var p0 = evN('personal_open'); var tb = document.querySelector('.mp-tab[data-tab="Addresses"]'); var okTab = press(tb); await wait(60); var p1 = evN('personal_open');
    var cu = currentUser; currentUser = null; switchTab('Places'); switchTab('Addresses'); await wait(30); currentUser = cu; var p2 = evN('personal_open'); /* زائر لا يُعدّ */
    o.evPersonal = [okTab, p1 - p0, p2 - p1, Object.keys(mpTrack._buf).filter(function(p){ return (mpTrack._buf[p].personal_open || 0) > 0; }).every(function(p){ return /__all__all$/.test(p); })];
    cityListCityId = ccity; userListData.customCities = ccs; switchTab(tabWas === 'Addresses' ? 'Places' : tabWas); await wait(30);
    /* بطاقة أُرسلت صورةً */
    var s0 = evN('share_card'); var ecc = exportCardCanvases, ush = navigator.share, ucs = navigator.canShare, sef = statsExportFor, cep = closeExportPreview, F0 = window.File;
    exportCardCanvases = function(){ return { canvases: [{ toBlob: function(cb){ cb({ size: 1 }); } }], model: { title: 't' } }; }; window.File = function(parts, name){ this.name = name; }; statsExportFor = function(){}; closeExportPreview = function(){};
    try{ navigator.canShare = function(){ return true; }; navigator.share = function(){ return Promise.resolve(); }; await sendExportCard('list'); var s1 = evN('share_card');
      navigator.share = function(){ return Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })); }; await sendExportCard('list'); var s2 = evN('share_card'); /* المستخدم ألغى: لا يُعدّ */
    } finally { exportCardCanvases = ecc; window.File = F0; statsExportFor = sef; closeExportPreview = cep; try{ navigator.share = ush; navigator.canShare = ucs; }catch(_){} }
    o.evCard = [s1 - s0, s2 - s1];
  }catch(e){ o.errE = String(e && e.stack || e); }

  /* ── (ح) معالجات قديمة بلا محطة باسمها (دَين handlers) — بنصّ المعالج المرسوم ── */
  try{
    var sent = []; var mst = mpSendText; mpSendText = function(t){ sent.push(String(t)); }; var sef2 = statsExportFor; statsExportFor = function(){}; var ech = exportCardHtml; exportCardHtml = function(){ return '<div id="xpFake2"></div>'; };
    try{
      /* plAddToTripFor: بلاطة Trip على بطاقة مكاني حين لا رحلة نشطة */
      var at0 = (typeof activeTripId !== 'undefined') ? activeTripId : null; try{ activeTripId = null; }catch(_){}
      plView = 'list'; plFilterMain = ''; plFilterSub = ''; plSearchQ = ''; plTownSel = ''; plGroupClosed = {}; plGroupDefaultClosed = false; Object.keys(plSecCollapsed).forEach(function(k){ plSecCollapsed[k] = false; }); renderPlacesMine();
      var tile = document.querySelector('#plBody .pc-tile[onclick*="plAddToTripFor("]'); var ppr0 = pendingPlaceRef; pendingPlaceRef = null; window.__tbCloseReal = false; var okT = press(tile); await wait(80); var pk = document.getElementById('tripPickerBackdrop'); var ref = pendingPlaceRef || {};
      o.hTrip = [okT, !!tile && /plAddToTripFor\('r110p', '/.test(tile.getAttribute('onclick')), ref.sourceType, ref.cityId, !!ref.placeId && !!ref.subcatId, cityListCityId]; if (pk) pk.classList.remove('show'); try{ if (TB) tbCloseNow(false); }catch(_){} try{ if (__tm) tripMoveDone(null); }catch(_){} pendingPlaceRef = ppr0; try{ activeTripId = at0; }catch(_){}
      /* cmSendCachedPlace: «Send as text» في معاينة بطاقة مكان من قائمة غيري */
      cmCache.places['hp1'] = { name: 'Their Cafe', url: 'https://maps.app.goo.gl/hp1', owner: 'amal', city: 'Parityville', category: 'coffee' }; openExportPreviewNow('oplace', 'hp1');
      var b1 = Array.prototype.filter.call(document.querySelectorAll('#tripShareBackdrop button'), function(b){ return /cmSendCachedPlace\('hp1'\)/.test(b.getAttribute('onclick') || ''); })[0]; sent.length = 0; var okS = press(b1);
      o.hPlace = [okS, sent.length, /Their Cafe/.test(sent[0] || ''), /maps\.app\.goo\.gl\/hp1/.test(sent[0] || ''), /amal/.test(sent[0] || ''), document.getElementById('tripShareBackdrop').classList.contains('show')]; delete cmCache.places['hp1'];
      try{ closeExportPreview(); }catch(_){}
    } finally { mpSendText = mst; statsExportFor = sef2; exportCardHtml = ech; }
  }catch(e){ o.errHn = String(e && e.stack || e); }

  showToast = st0; window.__mpSheetAuto = a0; o.toasts = toasts.slice(-6);
  return JSON.stringify(o);
})()
