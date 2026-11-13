// MyPickz — tests/r117.page.js (r117 · ١١ نوفمبر ٢٠٢٦): جسم محطة r117-أ — يُنفَّذ داخل الصفحة (تقرؤه tests/journey.js)
// «saved by» مربوط بسجل صاحبه (قواعد v3.16): كل فعل بدالته الكاملة (saveOthersPlace · plDeleteRow · plMoveToAddresses · cityDelSide · removeCityListCity · copies.removeMine).
// المتطلّب: window.__r117 من جهة Node — { uid, city, U(n), hx(n), get(k), seed(k, v), del(k), mark(), since(n), old(flag), actor(uid) } والقوائم المصدر مزروعة. يعيد JSON واحدًا.
(async function(){
  var T = window.__r117, uid = T.uid, CITY = T.city, U = T.U, hx = T.hx;
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var toasts = []; var st0 = showToast; showToast = function(m){ toasts.push(String(m)); };
  var a0 = window.__mpSheetAuto; window.__mpSheetAuto = function(s){ if (s && s.input) return null; if (s && /has no places now/.test(String(s.title || ''))) return 'alt'; /* «Keep it» — القائمة الفارغة تبقى، فالمحطة هي من يحذفها */ return 'ok'; };
  var tab0 = currentTab; currentTab = 'Addresses'; /* لا رسم لشاشة أثناء القياس */
  var bumps = []; var pb0 = popularBump; popularBump = function(url, d){ bumps.push([String(url).replace(/^.*r117x/, 'x'), d]); return pb0.apply(this, arguments); };
  var o = {};
  var cnt = function(n){ var d = T.get('placeFavoriteCounts/' + hx(n)); return d ? d.count : null; };
  var rec = function(n){ return T.get('copies/' + uid + '__p_' + hx(n)) || null; };
  var mine = function(nm){ var out = []; var cats = (myCityListData || {}).categories || {}; Object.keys(cats).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(q){ if (q && q.name === nm) out.push(q); }); }); return out; };
  var catOf = function(p){ var cats = (myCityListData || {}).categories || {}; return Object.keys(cats).filter(function(k){ return ((cats[k] || {}).places || []).indexOf(p) >= 0; })[0]; };
  var del = async function(p){ var k = catOf(p); await plDeleteRow(k, userGetEntry(k).places.indexOf(p)); await wait(140); };
  var bound = function(from){ return T.since(from).filter(function(w){ return /copies\/[^ ]*__p_|placeFavoriteCounts\//.test(w); }).map(function(w){ return w.replace(uid, 'me').replace(/[a-f0-9]{16}/, 'H'); }); };
  var open = async function(){ cityListCityId = CITY; await loadMyCityList(CITY); };

  try{ /* (أ) أول حفظ: السجل والعدّاد بدفعة واحدة · النسخة تحمل معرّف العدّاد */
    await open(); var m0 = T.mark(); var rm0 = T.rmark(); bumps.length = 0;
    await saveOthersPlace('uQA', CITY, 'coffee', 'q1'); await savedByQueue(function(){}); await wait(120); var recReads = T.rsince(rm0).filter(function(k){ return k === 'copies/' + uid + '__p_' + hx(1); }).length; /* قراءة واحدة: مسار إنشاء العدّاد */ await open(); var c1 = mine('Bind Cafe')[0];
    o.first = [T.get('placeFavoriteCounts/' + hx(1)), rec(1), !!c1 && c1.source.cnt === hx(1), bound(m0), bumps.slice(), recReads];
    /* (ب) المكان نفسه (الرابط نفسه) من قائمة ثانية: لا يُعدّ مرة أخرى — الحافظ واحد · النسخة الثانية تحمل العلامة نفسها */
    m0 = T.mark(); bumps.length = 0; await saveOthersPlace('uQB', CITY, 'coffee', 'z1'); await wait(120); await open(); var c2 = mine('Bind Cafe (b)')[0];
    o.second = [cnt(1), !!rec(1), !!c2 && c2.source.cnt === hx(1), bound(m0), bumps.slice()];
    /* (ج) حذف إحدى النسختين: الأخرى ما زالت تغطّي سجلي — لا نقص */
    m0 = T.mark(); bumps.length = 0; await del(mine('Bind Cafe')[0]);
    o.delOne = [cnt(1), !!rec(1), mine('Bind Cafe').length, bound(m0), bumps.slice()];
    /* (د) حذف الأخيرة: −١ وحذف السجل بدفعة واحدة */
    m0 = T.mark(); bumps.length = 0; await del(mine('Bind Cafe (b)')[0]);
    o.delLast = [cnt(1), rec(1), bound(m0), bumps.slice()];
    /* إعادة الحفظ بعد الحذف تُعدّ من جديد (السجل حُذف) */
    await saveOthersPlace('uQA', CITY, 'coffee', 'q1'); await wait(120); await open(); o.again = [cnt(1), !!rec(1)]; await del(mine('Bind Cafe')[0]);
  }catch(e){ o.errA = String(e && e.stack || e); }

  try{ /* (هـ) عدّاد قائم لآخرين (٥): +١ بمحاولة واحدة */
    await open(); var m1 = T.mark(); var rm1 = T.rmark(); await saveOthersPlace('uQA', CITY, 'coffee', 'q4'); await savedByQueue(function(){}); await wait(120);
    o.existing = [cnt(4), !!rec(4), bound(m1), T.rsince(rm1).filter(function(k){ return k === 'copies/' + uid + '__p_' + hx(4); }).length]; /* ما عُدّ للتوّ لا يفحصه الباب العام ثانية: لا قراءة لسجلي */
    var m1b = T.mark(); var again4 = await mpTrack.savedBy(uid, U(4), 'Five Cafe', CITY); o.existingAgain = [again4, cnt(4), bound(m1b).length];
  }catch(e){ o.errE = String(e && e.stack || e); }

  try{ /* (و) حفظ لم يتمّ: ما عُدّ يُعاد والنسخة تخرج من الذاكرة */
    await open(); var sv0 = saveMyCityList; toasts.length = 0; saveMyCityList = async function(){ return false; };
    try{ await saveOthersPlace('uQA', CITY, 'coffee', 'q3'); await wait(160); } finally { saveMyCityList = sv0; }
    o.failed = [cnt(3), rec(3), mine('Fail Cafe').length, toasts.some(function(t){ return /Could not save/.test(t); })];
    /* نسخة أولى معدودة ثم حفظ فاشل لنسخة ثانية من المكان نفسه (من قائمة أخرى): ما عدّته الأولى لا يُمسّ */
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q14'); await wait(120); await open(); var f1 = [cnt(14), !!rec(14)];
    var sv2 = saveMyCityList; saveMyCityList = async function(){ return false; }; try{ await saveOthersPlace('uQB', CITY, 'coffee', 'z3'); await wait(160); } finally { saveMyCityList = sv2; }
    o.failedSecond = [f1, cnt(14), !!rec(14), mine('Fail Cafe (b)').length, mine('Fail Cafe (a)').length];
    await open(); await del(mine('Fail Cafe (a)')[0]);
  }catch(e){ o.errF = String(e && e.stack || e); }

  try{ /* (ز) رابط النسخة عُدّل بعد الحفظ: الحذف يُنقص عدّادها الأصلي (العلامة معرّف العدّاد لا الرابط) */
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q2'); await wait(120); await open(); var e2 = mine('Edit Cafe')[0];
    var before = [cnt(2), !!rec(2)]; e2.url = U(77); await saveMyCityList(); await del(e2);
    o.edited = [before, cnt(2), rec(2), cnt(77)];
  }catch(e){ o.errG = String(e && e.stack || e); }

  try{ /* (ح) نقل النسخة المعدودة إلى Addresses: لم تعد «حفظًا» يراه الناس */
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q6'); await wait(120); await open(); var e6 = mine('Move Cafe')[0];
    var pc = privateCategoryList()[0].id; var b6 = [cnt(6), !!rec(6)]; var moved = await plMoveToAddresses(plSugKey(e6), pc); await wait(160);
    o.moved = [b6, moved, cnt(6), rec(6), mine('Move Cafe').length];
    /* والنقل الذي لم يُحفظ لا يُطلق شيئًا */
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q6'); await wait(120); await open(); var e6b = mine('Move Cafe')[0]; var sv1 = saveMyCityList; saveMyCityList = async function(){ return false; };
    try{ await plMoveToAddresses(plSugKey(e6b), pc); await wait(160); } finally { saveMyCityList = sv1; }
    o.movedUnsaved = [cnt(6), !!rec(6)];
    await open(); var e6c = mine('Move Cafe')[0]; if (e6c) await del(e6c);
  }catch(e){ o.errH = String(e && e.stack || e); }

  try{ /* (ط) حذف قائمة المدينة: نسخها المعدودة تُطلق بعد نجاح الحذف — بمسارَي «Clear my list» وحذف المدينة · والحذف الفاشل لا يُطلق */
    var q4c = mine('Five Cafe')[0]; if (q4c){ await open(); await del(mine('Five Cafe')[0]); } /* تنظيف (هـ): يعود ٥ */
    o.fiveBack = [cnt(4), rec(4)];
    await open(); await saveOthersPlace('uQA', CITY, 'bakery', 'q7'); await saveOthersPlace('uQA', CITY, 'bakery', 'q8'); await wait(120);
    var b78 = [cnt(7), cnt(8), !!rec(7), !!rec(8)];
    cityDelCtx = { cityId: CITY, from: 'places', isCustom: true }; await cityDelSide(); await wait(200);
    o.cleared = [b78, cnt(7), cnt(8), rec(7), rec(8), T.get('userCityLists/' + uid + '_' + CITY) || null];
    /* حذف المدينة — والقائمة غير محمَّلة (تُقرأ قبل الحذف) */
    if (!(userListData.customCities || []).some(function(c){ return c.id === CITY; })) userListData.customCities = (userListData.customCities || []).concat([{ id: CITY, name: 'Porto', country: 'Portugal' }]);
    await open(); await saveOthersPlace('uQA', CITY, 'bakery', 'q7'); await wait(120); myCityListData = null; myCityListLoadedFor = null; cityListCityId = null;
    var rm0 = mpData.cityLists.remove; mpData.cityLists.remove = function(){ return Promise.reject(Object.assign(new Error('down'), { code: 'unavailable' })); };
    try{ await removeCityListCity(CITY, { confirmed: true }); await wait(160); } finally { mpData.cityLists.remove = rm0; }
    o.cityFail = [cnt(7), !!rec(7)];
    userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== CITY; }).concat([{ id: CITY, name: 'Porto', country: 'Portugal' }]);
    await removeCityListCity(CITY, { confirmed: true }); await wait(200);
    o.cityGone = [cnt(7), rec(7), T.get('userCityLists/' + uid + '_' + CITY) || null];
    /* حذف الحساب — الشبكة التي لا تعتمد استعلامًا: نسخ المدن تُطلق من القوائم نفسها (ومدينة بلا قائمة لا تُسقط شيئًا) */
    userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== CITY; }).concat([{ id: CITY, name: 'Porto', country: 'Portugal' }]);
    await open(); await saveOthersPlace('uQA', CITY, 'bakery', 'q7'); await saveOthersPlace('uQA', CITY, 'bakery', 'q8'); await wait(120); myCityListData = null; myCityListLoadedFor = null; cityListCityId = null;
    var bc = [cnt(7), cnt(8)]; var nC = await savedByReleaseCities(['nowhere117', CITY]); o.cascade = [bc, nC, cnt(7), cnt(8), rec(7), rec(8), await savedByReleaseCities([CITY])];
  }catch(e){ o.errI = String(e && e.stack || e); }

  try{ /* (ع) مكان من قائمة غير عامة (مشارَكة بالاسم): لا عدّاد ولا سجل ولا علامة */
    await open(); var m6 = T.mark(); await saveOthersPlace('uQC', CITY, 'coffee', 's1'); await wait(120); await open(); var sh = mine('Shared Only Cafe');
    o.notPublic = [sh.length, !!(sh[0] && sh[0].source && sh[0].source.cnt), cnt(40), rec(40), bound(m6)];
    if (sh[0]) await del(sh[0]);
    /* (ف) الباب العام: أي مسار يُخرج نسخة معلَّمة ويمرّ بالحفظ يُطلقها — هنا إخراج مباشر من الذاكرة ثم saveMyCityList (كما تفعل إزالة المكرّرات وحذف البلدة و🗑 في Not pinned yet) */
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q15'); await wait(140); await open(); var d15 = mine('Direct Cafe')[0]; var b15 = [cnt(15), !!rec(15)];
    var e15 = userGetEntry(catOf(d15)); e15.places.splice(e15.places.indexOf(d15), 1); var m7 = T.mark(); await saveMyCityList(); await savedByQueue(function(){}); await wait(40);
    o.anyPath = [b15, cnt(15), rec(15), bound(m7)];
    /* تراجع أعاد النسخة بعلامتها: تُعدّ من جديد */
    e15.places.push(d15); await saveMyCityList(); await savedByQueue(function(){}); await wait(40); o.restored = [cnt(15), !!rec(15)];
    /* حفظ متخطًّى (المدينة المحمَّلة غير المختارة): لا إطلاق */
    e15.places.splice(e15.places.indexOf(d15), 1); var lf0 = myCityListLoadedFor; myCityListLoadedFor = 'elsewhere'; var skipped = await saveMyCityList(); myCityListLoadedFor = lf0; await savedByQueue(function(){}); await wait(40);
    o.skipped = [skipped === undefined, cnt(15), !!rec(15)];
    /* خطأ عابر في الإطلاق: يبقى معلّقًا ويُعاد مع الحفظ التالي */
    var ub0 = mpData.placeCounts.unbind, fails = 1; mpData.placeCounts.unbind = function(){ if (fails-- > 0) return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); return ub0.apply(mpData.placeCounts, arguments); };
    try{ await saveMyCityList(); await savedByQueue(function(){}); await wait(40); var pend = [cnt(15), !!rec(15), Object.keys(savedByPending).length];
      /* النسخة عادت قبل إعادة المحاولة: المعلَّق يُمحى ولا يُطلق شيء */
      e15.places.push(d15); await saveMyCityList(); await savedByQueue(function(){}); await wait(40); var cameBack = [cnt(15), !!rec(15), Object.keys(savedByPending).length];
      /* تخرج ثانية ويفشل الإطلاق مرة ثم ينجح مع الحفظ التالي */
      fails = 1; e15.places.splice(e15.places.indexOf(d15), 1); await saveMyCityList(); await savedByQueue(function(){}); await wait(40); var pend2 = [cnt(15), Object.keys(savedByPending).length];
      myCityListData.touch117 = Date.now(); await saveMyCityList(); await savedByQueue(function(){}); await wait(40); o.pending = [pend, cameBack, pend2, cnt(15), rec(15), Object.keys(savedByPending).length]; delete myCityListData.touch117; } finally { mpData.placeCounts.unbind = ub0; }
    /* الدمج: أماكن المدينة تنتقل إلى مدينة أخرى بعلاماتها — لا إطلاق */
    userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== CITY && c.id !== 'r117m'; }).concat([{ id: CITY, name: 'Porto', country: 'Portugal' }, { id: 'r117m', name: 'Gaia', country: 'Portugal' }]);
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q15'); await wait(140); var bm = [cnt(15), !!rec(15)];
    var merged = await cmMerge(CITY, 'r117m'); await savedByQueue(function(){}); await wait(120);
    var inB = ((T.get('userCityLists/' + uid + '_r117m') || {}).categories || {}); var marksB = []; Object.keys(inB).forEach(function(k){ ((inB[k] || {}).places || []).forEach(function(q){ if (q && q.source && q.source.cnt) marksB.push(q.source.cnt === hx(15)); }); }); if (!marksB.length){ var keysB = T.keys('userCityListCats/' + uid + '_r117m'); keysB.forEach(function(k){ ((T.get(k) || {}).places || []).forEach(function(q){ if (q && q.source && q.source.cnt) marksB.push(q.source.cnt === hx(15)); }); }); }
    o.merge = [bm, merged, cnt(15), !!rec(15), [marksB.some(Boolean)], !!T.get('userCityLists/' + uid + '_' + CITY)]; /* في المدينة الهدف نسخة تحمل علامة هذا العدّاد (ومعها نسخ أخرى من المحطة) */
    try{ cmUndo = null; cityListCityId = 'r117m'; myCityListData = null; myCityListLoadedFor = null; await loadMyCityList('r117m'); var back15 = mine('Direct Cafe')[0]; if (back15) await del(back15); }catch(_){}
    o.mergeClean = [cnt(15), rec(15)];
    userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== 'r117m'; }); cityListCityId = CITY; myCityListData = null; myCityListLoadedFor = null;
  }catch(e){ o.errO = String(e && e.stack || e); }

  try{ /* (ش) ما وجدته المراجعة المستقلة الثانية — كلٌّ بقياسه */
    userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== CITY && c.id !== 'r117m'; }).concat([{ id: CITY, name: 'Porto', country: 'Portugal' }, { id: 'r117m', name: 'Gaia', country: 'Portugal' }]);
    var idle = function(){ return savedByQueue(function(){}); };
    /* (١) تراجع أدوات المدينة: بلدة حُذفت بنسختها المعدودة ثم Undo — العدّ يعود */
    await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q16'); await idle(); await wait(100); await open(); var u16 = mine('Undo Cafe')[0]; u16.town = 'Old Gaia'; await saveMyCityList(); await idle();
    var tr = await cmTownRemove(CITY, 'Old Gaia'); await idle(); await wait(60); var afterRemove = [cnt(16), rec(16)];
    var un = await cmUndoLast(); await idle(); await wait(80); await open();
    o.undo = [tr, afterRemove, un, cnt(16), !!rec(16), mine('Undo Cafe').length]; if (mine('Undo Cafe')[0]) await del(mine('Undo Cafe')[0]);
    /* (٢) تبديل المدينة والحفظ جارٍ: إطلاق المدينة الأولى يتمّ ونسخ الثانية لا تُمسّ — بمسارَي الحفظ: قائمة باقية (الكتابة) وقائمة فرغت (حذف المستند) */
    await open(); userEnsurePlaces('coffee').places.push({ id: 'own117', name: 'Own Place 117', url: 'https://maps.app.goo.gl/r117xown' }); userEnsurePlaces('coffee').active = true; await saveMyCityList();
    await saveOthersPlace('uQA', CITY, 'coffee', 'q17'); await idle(); await wait(100); await open(); await mpTrack.savedBy(uid, U(7), 'City Bun A', CITY); /* نسخة City Bun A في r117m تحمل هذه العلامة — صارت معدودة */
    var midSave = async function(door, drop){ var real = mpData.cityLists[door], gate, held = new Promise(function(r){ gate = r; }); mpData.cityLists[door] = async function(){ await held; return real.apply(mpData.cityLists, arguments); };
      drop(); var pSave = saveMyCityList(); await wait(30); cityListCityId = 'r117m'; myCityListLoadedFor = null; myCityListData = null; await loadMyCityList('r117m'); var nB = Object.keys(savedByBases['r117m'] || {}).length;
      gate(); var okS; try{ okS = await pSave; } finally { mpData.cityLists[door] = real; } await idle(); await wait(80); return [okS, cnt(17), rec(17), cnt(7), !!rec(7), nB, Object.keys(savedByBases['r117m'] || {}).length, !!(savedByBases[CITY] || {})[hx(17)]]; };
    var s17 = mine('Switch Cafe')[0]; o.switched = await midSave('save', function(){ var e = userGetEntry(catOf(s17)); e.places.splice(e.places.indexOf(s17), 1); });
    cityListCityId = CITY; myCityListData = null; myCityListLoadedFor = null; await open(); await saveOthersPlace('uQA', CITY, 'coffee', 'q17'); await idle(); await wait(100); await open(); var back17 = [cnt(17), !!rec(17)];
    o.switchedEmpty = [back17, await midSave('remove', function(){ Object.keys(myCityListData.categories).forEach(function(k){ myCityListData.categories[k].places = []; }); })];
    await mpTrack.savedByDrop(uid, hx(7), U(7), 'City Bun A', CITY); cityListCityId = CITY; myCityListData = null; myCityListLoadedFor = null;
    /* (٣) حفظ فشل مرة ونجحت إعادته (Retry): حفظٌ نجح — النسخة باقية ومعدودة */
    await open(); var sv1 = mpData.cityLists.save, once = 1; mpData.cityLists.save = function(){ if (once-- > 0) return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); return sv1.apply(mpData.cityLists, arguments); }; toasts.length = 0;
    try{ await saveOthersPlace('uQA', CITY, 'coffee', 'q18'); await idle(); await wait(120); } finally { mpData.cityLists.save = sv1; }
    var mem18 = mine('Retry Cafe').length; myCityListData = null; myCityListLoadedFor = null; await open();
    o.retried = [cnt(18), !!rec(18), mem18, mine('Retry Cafe').length, toasts.some(function(t){ return /Could not save/.test(t); }), toasts.some(function(t){ return /Saved to My List/.test(t); })];
    if (mine('Retry Cafe')[0]) await del(mine('Retry Cafe')[0]);
    /* (٤) حفظ لم يتمّ وإعادة ما عُدّ فشلت عابرًا: المعرّف معلَّق والحفظ التالي يعيده */
    await open(); var svm = saveMyCityList, ub1 = mpData.placeCounts.unbind, f1 = 1; saveMyCityList = async function(){ return false; }; mpData.placeCounts.unbind = function(){ if (f1-- > 0) return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); return ub1.apply(mpData.placeCounts, arguments); };
    try{ await saveOthersPlace('uQA', CITY, 'coffee', 'q19'); await idle(); await wait(80); } finally { saveMyCityList = svm; }
    var tb = [cnt(19), !!rec(19), !!savedByPending[hx(19)]]; myCityListData.touch117 = Date.now(); await saveMyCityList(); await idle(); await wait(60); delete myCityListData.touch117; mpData.placeCounts.unbind = ub1;
    o.takeBack = [tb, cnt(19), rec(19), Object.keys(savedByPending).length];
    /* (٥) الوجه الآخر غير المقيس للمحرّك (قاعدة السجل لا ترى increment): الحفظ والسحب يتمّان بالقيمة الصريحة */
    T.noT(true); var m9 = T.mark(); var nt, nd; try{ nt = await mpTrack.savedBy(uid, U(36), 'NoTransform', CITY); var mid36 = [cnt(36), !!rec(36), bound(m9)]; var m10 = T.mark(); nd = await mpTrack.savedByDrop(uid, hx(36), U(36), 'NoTransform', CITY); } finally { T.noT(false); }
    o.noTransform = [nt, mid36, nd, cnt(36), rec(36), bound(m10)];
    /* (٦) مخطّط الرابط: المدقِّق · المرمِّز · Most saved · صف مكان الآخرين · وحارس النقر العام */
    var BAD = 'javascript://maps.google.com/%0aalert(document.domain)';
    var row = othersPlaceRowHtml({ id: 'bx', name: 'Sneaky', url: BAD }, { uid: 'uQA', nickname: 'quim' }, { id: CITY, name: 'Porto' }, 'coffee', CITY, '');
    var box = document.createElement('div'); box.innerHTML = '<a id="g1" href="' + BAD + '">x</a><a id="g2" href="https://maps.app.goo.gl/ok">y</a><a id="g3" href="mailto:a@b.c">z</a><a id="g4" href="JaVaScRiPt:alert(1)"><b id="g4b">w</b></a><a id="g5" href="#top">v</a>'; document.body.appendChild(box);
    var clk = function(id){ var el = document.getElementById(id); var ev = document.createEvent('Event'); ev.initEvent('click', true, true); el.addEventListener('click', function(e){ if (!e.defaultPrevented) e.preventDefault(); e.__seen = true; }); var notCancelled = el.dispatchEvent(ev); return [ev.__seen === true]; };
    var guard = function(href){ var a = document.createElement('a'); a.setAttribute('href', href); var hit = { defaultPrevented: false, target: a, preventDefault: function(){ this.defaultPrevented = true; }, stopImmediatePropagation: function(){ this.stopped = true; } }; mpLinkGuard(hit); return hit.defaultPrevented; };
    o.scheme = [isGoogleMapsUrl(BAD), isGoogleMapsUrl('https://maps.app.goo.gl/abc'), isGoogleMapsUrl('http://maps.google.com/?q=1'), mpSafeUrl(BAD), mpSafeUrl(' https://maps.app.goo.gl/abc '), /href="[^"]*javascript:/i.test(row) || !/<a class="pc-tile"[^>]* href="#"/.test(row) /* بلاطة الفتح: href صار # — الرابط يبقى نصًّا خاملًا في سمات البيانات ونصوص المعالجات */, [guard(BAD), guard('JaVaScRiPt:alert(1)'), guard(' java\tscript:alert(1)'), guard('data:text/html,x'), guard('https://maps.app.goo.gl/ok'), guard('mailto:a@b.c'), guard('tel:+1'), guard('#top'), guard('./index.html')], clk('g1')[0], clk('g2')[0], clk('g4b')[0]]; box.remove();
    /* (٧) حساب آخر في التبويب: لا أساس ولا معلَّق من سابقه */
    savedByPending.x117 = { url: '', name: '', cityId: '' }; savedByFresh.y117 = 1; var hadBase = Object.keys(savedByBases).length > 0; savedByReset(); o.reset = [hadBase, Object.keys(savedByBases).length, Object.keys(savedByPending).length, Object.keys(savedByFresh).length];
    userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== 'r117m'; }); cityListCityId = CITY; myCityListData = null; myCityListLoadedFor = null;
  }catch(e){ o.errS = String(e && e.stack || e); }

  try{ /* (ص) حساب موقوف: لا شيء يُكتب ولا يُحاوَل */
    var sus0 = currentUserSuspended; currentUserSuspended = true; toasts.length = 0; var m8 = T.mark(); var dn8 = T.denies();
    try{ await saveOthersPlace('uQA', CITY, 'coffee', 'q1'); await wait(80); } finally { currentUserSuspended = sus0; }
    o.suspended = [T.since(m8).length, T.denies() - dn8, toasts.some(function(t){ return /suspended/.test(t); }), mine('Bind Cafe').length];
    /* (ق) Most saved: رابط العدّاد يكتبه صاحبه — لا يصير رابطًا إلا رابط خرائط */
    var io0 = isOwner; isOwner = true; mostSavedTab = 'places'; await openMostSavedStats(); await wait(60); var ms = document.getElementById('dashBody').innerHTML; isOwner = io0; try{ closeModalById('dashBackdrop'); }catch(_){}
    o.mostSaved = [/<span class="stats-name">Bad Link 117<\/span>/.test(ms) && /<span class="stats-name">Sneaky Link 117<\/span>/.test(ms), /javascript:/i.test(ms), /<a href="https:\/\/maps\.app\.goo\.gl\/r117xgood"[^>]*class="stats-name">Good Link 117<\/a>/.test(ms), delete window.__pwn117];
  }catch(e){ o.errQ = String(e && e.stack || e); }

  try{ /* (ي) حذف الحساب (copies.removeMine): سجل حفظ المكان يُنقص عدّاده بالدفعة نفسها · عدّاد غائب أو عند الصفر لا يُبقي السجل · بقية السجلات تُحذف */
    var D = 'uDEL117'; var keys = function(){ return T.keys('copies/' + D + '__'); };
    var m2 = T.mark(); T.actor(D); try{ await mpData.copies.removeMine(D); } finally { T.actor(null); }
    o.account = [[20, 21, 22, 23, 24, 25, 26].map(cnt), keys().length, T.since(m2).filter(function(w){ return /^(update|set) placeFavoriteCounts/.test(w); }).length, T.get('userCityLists/uQA_' + CITY).copyCount, T.get('copies/uKEEP117__p_' + hx(20)) ? 1 : 0];
  }catch(e){ o.errJ = String(e && e.stack || e); }

  try{ /* (ك) سباق: حافظ آخر أنشأ العدّاد بين قراءتي وكتابتي — جولة ثانية بالتحديث */
    var b0 = db.batch, armed = true; db.batch = function(){ var b = b0.apply(db, arguments); var s0 = b.set; b.set = function(ref){ if (armed && ref && ref.__col === 'placeFavoriteCounts' && ref.id === hx(5)){ armed = false; T.seed('placeFavoriteCounts/' + hx(5), { name: 'Race Cafe', url: U(5), count: 1, city: CITY }); } return s0.apply(b, arguments); }; return b; };
    var rr; try{ rr = await mpTrack.savedBy(uid, U(5), 'Race Cafe', CITY); } finally { db.batch = b0; }
    o.race = [rr, cnt(5), !!rec(5), armed];
    /* السباق الذي لا يُحلّ (الإنشاء يُرفض مرتين) يعيد null ولا يترك سجلًّا */
    var bb = db.batch; db.batch = function(){ var b = bb.apply(db, arguments); var c0 = b.commit; var bad = false; var s1 = b.set; b.set = function(ref){ if (ref && ref.__col === 'placeFavoriteCounts' && ref.id === hx(30)) bad = true; return s1.apply(b, arguments); }; b.commit = function(){ if (bad) return Promise.reject(Object.assign(new Error('nope'), { code: 'permission-denied' })); return c0.apply(b, arguments); }; return b; };
    var r30; try{ r30 = await mpTrack.savedBy(uid, U(30), 'Never', CITY); } finally { db.batch = bb; }
    o.raceLost = [r30, cnt(30), rec(30)];
    /* رفض حقيقي على عدّاد قائم: محاولة واحدة ثم null */
    var bd = db.batch, tries = 0; db.batch = function(){ var b = bd.apply(db, arguments); var c1 = b.commit, hit = false; var u1 = b.update; b.update = function(ref){ if (ref && ref.__col === 'placeFavoriteCounts' && ref.id === hx(33)) hit = true; return u1.apply(b, arguments); }; var s2 = b.set; b.set = function(ref){ if (ref && ref.__col === 'placeFavoriteCounts' && ref.id === hx(33)) hit = true; return s2.apply(b, arguments); }; b.commit = function(){ if (hit){ tries++; return Promise.reject(Object.assign(new Error('denied'), { code: 'permission-denied' })); } return c1.apply(b, arguments); }; return b; };
    var r33; try{ r33 = await mpTrack.savedBy(uid, U(33), 'Denied', CITY); } finally { db.batch = bd; }
    o.denied = [r33, tries, cnt(33), rec(33)];
  }catch(e){ o.errK = String(e && e.stack || e); }

  try{ /* (ل) النقص: عدّاد عند الصفر وسجلي قائم ⇒ السجل يُحذف وحده · بلا سجل لي ⇒ لا كتابة */
    bumps.length = 0; var m3 = T.mark(); var z = await mpTrack.savedByDrop(uid, hx(9), U(9), 'Zero', CITY); o.zero = [z, cnt(9), rec(9)];
    var m4 = T.mark(); var n = await mpTrack.savedByDrop(uid, hx(10), U(10), 'Theirs', CITY); o.noRec = [n, cnt(10), T.since(m4).length, bumps.slice()]; /* لا شيء نقص ⇒ الرقم على الشاشة لا يتحرّك */
    /* (م) قواعد لم تُنشر نشرتها بعد (v3.14): الحفظ والنقص يعملان — والعدّاد يُنشأ بلا مدينة */
    T.old(true); var ro, rd; try{ ro = await mpTrack.savedBy(uid, U(11), 'Old Rules', CITY); var mid = [T.get('placeFavoriteCounts/' + hx(11)), !!rec(11)]; rd = await mpTrack.savedByDrop(uid, hx(11), U(11), 'Old Rules', CITY); } finally { T.old(false); }
    o.oldRules = [ro, mid, rd, cnt(11), rec(11)];
    /* (ن) مدخلات ناقصة: لا كتابة */
    var m5 = T.mark(); var dn5 = T.denies(); var rm5 = T.rmark(); o.invalid = [await mpTrack.savedBy(null, U(12), 'x', CITY), await mpTrack.savedBy(uid, '', 'x', CITY), await mpTrack.savedByDrop(uid, 'not-a-counter-id', U(12), 'x', CITY), await mpTrack.savedByDrop(null, hx(12), U(12), 'x', CITY), T.since(m5).length, T.denies() - dn5, T.rsince(rm5).length]; /* لا كتابة ولا محاولة مرفوضة ولا قراءة */
    /* (س) التزوير بيد المستخدم مباشرة: كله يُرفض والأرقام كما هي */
    var tryW = async function(fn){ try{ await fn(); return 'written'; }catch(e){ return e.code; } }; var inc = function(d){ return firebase.firestore.FieldValue.increment(d); }; var P = db.collection('placeFavoriteCounts'), C = db.collection('copies');
    await mpTrack.savedBy(uid, U(13), 'Mine Too', CITY); /* لي سجل على ١٣ (العدّاد ٤ ⇒ ٥) */
    o.forge = [
      await tryW(function(){ return P.doc(hx(10)).update({ count: inc(1) }); }),                                   /* +١ مجرّد */
      await tryW(function(){ return P.doc(hx(31)).set({ name: 'F', url: U(31), count: 1 }); }),                     /* إنشاء مجرّد */
      await tryW(function(){ return P.doc(hx(13)).update({ count: inc(-1) }); }),                                  /* −١ والسجل باقٍ */
      await tryW(function(){ var b = db.batch(); b.delete(C.doc(uid + '__p_' + hx(10))); b.update(P.doc(hx(10)), { count: inc(-1) }); return b.commit(); }), /* −١ لمن لم يحفظ */
      await tryW(function(){ return P.doc(hx(13)).update({ count: inc(1) }); }),                                   /* +١ ثانية ولي سجل قائم */
      await tryW(function(){ var b = db.batch(); b.set(C.doc(uid + '__p_' + hx(10)), { uid: uid, kind: 'place', docKey: 'p_' + hx(10) }); b.update(P.doc(hx(10)), { count: inc(2) }); return b.commit(); }), /* +٢ بسجل */
      await tryW(function(){ var b = db.batch(); b.set(C.doc(uid + '__p_' + hx(32)), { uid: uid, kind: 'place', docKey: 'p_' + hx(32) }); b.update(P.doc(hx(10)), { count: inc(1) }); return b.commit(); }), /* سجل عدّاد آخر */
      await tryW(function(){ return C.doc('uKEEP117__p_' + hx(10)).set({ uid: 'uKEEP117', kind: 'place', docKey: 'p_' + hx(10) }); }), /* سجل باسم غيري */
      cnt(10), cnt(13), cnt(31), rec(10), rec(32)];
    /* التزوير بطلبين: (١) سجل يُنشأ وحده ثم يُحذف مع −١ = تصفير عدّاد الغير · (٢) سجلي يُحذف وحده بعد +١ ثم يُعاد = تضخيم. نصف كلٍّ يُرفض */
    T.seed('copies/' + uid + '__p_' + hx(34), { uid: uid, kind: 'place', docKey: 'p_' + hx(34) }); T.seed('placeFavoriteCounts/' + hx(35), { name: 'At zero', url: U(35), count: 0 }); T.seed('copies/' + uid + '__p_' + hx(35), { uid: uid, kind: 'place', docKey: 'p_' + hx(35) });
    o.twoStep = [
      await tryW(function(){ return C.doc(uid + '__p_' + hx(10)).set({ uid: uid, kind: 'place', docKey: 'p_' + hx(10) }); }),   /* سجل وحده على عدّاد الغير (٣) */
      await tryW(function(){ return C.doc(uid + '__p_' + hx(13)).delete(); }),                                                /* سجلي وحده وعدّاده ٥ */
      cnt(10), rec(10), cnt(13), !!rec(13),
      await tryW(function(){ return C.doc(uid + '__p_' + hx(34)).delete(); }),                                                /* سجل بلا عدّاد */
      await tryW(function(){ return C.doc(uid + '__p_' + hx(35)).delete(); })];                                               /* سجل وعدّاده صفر */
  }catch(e){ o.errL = String(e && e.stack || e); }

  try{ await mpTrack._flush(true); }catch(_){}
  popularBump = pb0; showToast = st0; window.__mpSheetAuto = a0; currentTab = tab0;
  return JSON.stringify(o);
})()
