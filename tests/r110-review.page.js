// MyPickz — tests/r110-review.page.js (r110 · ١١ نوفمبر ٢٠٢٦): جسم محطة «r110 · المراجعة المستقلة ب» — يُنفَّذ داخل الصفحة (تقرؤه tests/journey.js)
// كل قياس هنا بتنفيذ نصّ المعالج المرسوم على العنصر نفسه (press: يقرأ سمة on… من الـDOM وينفّذها كما يفعل المتصفح) لا بنداء الدالة باسمها:
// المراجعة بيّنت أن مطابقة الأسماء تمرّ والزر موصول بغير معالجه. (محاكي الرحلة لا يشغّل السمات المضمَّنة بنفسه — jsdom بلا runScripts.)
// المتطلّب: مدينة الاختبار r110p محمَّلة (تهيّئها المحطة قبل النداء). يعيد JSON واحدًا.
(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var toasts = []; var st0 = showToast; showToast = function(m){ toasts.push(String(m)); };
  var a0 = window.__mpSheetAuto; var sheets = []; window.__mpSheetAuto = function(s){ sheets.push(String((s && s.title) || '')); return (s && s.input) ? null : 'ok'; };
  var o = {}; var body = function(){ return document.getElementById('tbBody'); };
  var pick = function(keys){ keys.forEach(function(k){ tbTogglePick(k, true, 'r110p'); }); };
  var EV = ['onclick', 'onchange', 'oninput', 'onkeydown', 'onpaste', 'onblur', 'onfocus', 'ontouchstart'];
  var outside = function(){ var s = {}; body().querySelectorAll('*').forEach(function(x){ if (x.closest('.tb-acts')) return; EV.forEach(function(a){ var v = x.getAttribute(a); if (!v) return; var m = v.match(/^\s*([A-Za-z_$][\w$.]*)/); s[a.slice(2) + ':' + (m ? m[1] : '?')] = 1; }); }); return Object.keys(s).sort(); };
  var strip = function(){ var out = []; body().querySelectorAll('.tb-acts').forEach(function(a){ out.push(Array.prototype.map.call(a.querySelectorAll('button'), function(b){ return b.textContent; })); }); return out; };
  var btn = function(rowIdx, label){ var rows = body().querySelectorAll('.tb-acts'); var r = rows[rowIdx]; if (!r) return null; return Array.prototype.find.call(r.querySelectorAll('button'), function(b){ return b.textContent === label; }) || null; };
  var mkEv = function(init){ var ev = { defaultPrevented: false, preventDefault: function(){ this.defaultPrevented = true; }, stopPropagation: function(){} }; Object.keys(init || {}).forEach(function(k){ ev[k] = init[k]; }); return ev; };
  var press = function(el, type, ev){ if (!el || el.disabled) return false; var code = el.getAttribute('on' + (type || 'click')); if (!code) return false; var event = ev || mkEv(); (function(){ eval(code); }).call(el); return true; };
  var cityNames = function(){ return tripPlanEntries(TB.plan).map(function(e){ return e.name; }); };
  var linNames = function(){ return tbDTDay().stops.map(function(e){ return e.name; }); };
  var text = function(h){ return String(h || '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); };

  /* ── (أ) داخل المدينة: الأزرار المرسومة تعمل بالضغط · ما خارج الشريط · Add again في فترة واحدة · محطة مكتوبة ── */
  try{
    await openTripBuilder({ cityId: 'r110p', dayPlan: true }); tbSetDT('arrival', 'time', '09:00');
    await tbOpenPick('r110p'); pick(['me|coffee|c1', 'me|coffee|c2', 'me|bakery|b1', 'me|museums|m1']); tbPickDone();
    TB.cities[0].stay = { name: 'Secret Inn', geo: { lat: 46.429, lng: 6.909 } }; tbBuildGo(); await wait(30); tbSetTripName('RB city');
    o.cityBuild = [TB.undo.length, TB.moveCount];
    o.cityOutside0 = outside(); o.cityStrip0 = strip();
    /* ✕ بالضغط: المحطة الأولى تخرج من يومها */
    var n0 = cityNames(); var first = tripPlanEntries(TB.plan)[0]; var bx = btn(0, '✕'); press(bx); await wait(30);
    o.cityRemoveClick = [!!bx, n0.length, cityNames().length, cityNames().indexOf(first.name) < 0];
    o.cityOutsideTray = outside();
    tbUndo(); await wait(10);
    /* ▼ بالضغط: محطة لها شقيق في فترتها تنزل موضعًا */
    var d0 = TB.plan.days[0]; var per = TRIP_PERIODS.find(function(p){ return (d0.periods[p] || []).length > 1; }); o.cityPer = per || null;
    if (per){ var ids0 = d0.periods[per].map(function(e){ return e.id; }); var rowOf = tripPlanEntries(TB.plan).findIndex(function(e){ return e.id === ids0[0]; }); var bd = btn(rowOf, '▼'); press(bd); await wait(10); var ids1 = TB.plan.days[0].periods[per].map(function(e){ return e.id; }); o.cityDownClick = [!!bd, ids0[0] === ids1[1] && ids0[1] === ids1[0]]; }
    /* Add again بالضغط: الورقة على خطوة التكرار؛ خلية الفترة نفسها صالحة؛ الضغط عليها يضيف زيارة ثانية */
    var e0 = tripPlanEntries(TB.plan)[0]; var f0 = tripFindEntry(TB.plan, e0.id); var ba = btn(0, 'Add again'); press(ba); await wait(10);
    var here = document.querySelector('#tmBody .tm-c.here'); o.cityAgainSheet = [!!ba, !!__tm && __tm.step, !!here, here ? here.disabled : null, here ? here.textContent : ''];
    var cnt0 = tripPlanEntries(TB.plan).filter(function(e){ return e.name === e0.name; }).length; press(here); await wait(10);
    var same = TB.plan.days[f0.dayIdx].periods[f0.period].filter(function(e){ return e.name === e0.name; });
    o.cityAgainHere = [cnt0, tripPlanEntries(TB.plan).filter(function(e){ return e.name === e0.name; }).length, same.length, same.length === 2 && same[0].id !== same[1].id, !__tm];
    /* خلية «here» في النقل العادي تبقى معطَّلة */
    tbMove(e0.id); var hereM = document.querySelector('#tmBody .tm-c.here'); o.cityMoveHere = hereM ? hereM.disabled : null; tripMoveDone(null);
    /* محطة مكتوبة داخل المدينة: تُضاف ثم تُكرَّر — النسخة تحتفظ بالرابط والوصف ونوع المعرّف */
    await tbStopSheet(); tbStopDraft.name = "Maya's kiosk"; tbStopDraft.url = 'https://maps.app.goo.gl/kiosk'; tbStopDraft.kind = 'water'; tbStopDraft.geo = { lat: 46.435, lng: 6.92 }; tbStopDraft.about = 'Round the back'; tbStopDraft.optional = true; tbStopDraft.fixedAt = '10:00'; tbStopSave(); await wait(10);
    var cell = document.querySelector('#tmBody .tm-c:not([disabled])'); press(cell); await wait(10); if (__tm && __tm.step === 'pos'){ press(document.querySelector('#tmBody .tm-list .btn.on')); await wait(10); }
    var ts = tripPlanEntries(TB.plan).find(function(e){ return tripIsStop(e); }); o.cityTyped = [!!ts, ts ? ts.name : '', ts ? ts.fixedAt : null];
    if (ts){ var rowT = tripPlanEntries(TB.plan).findIndex(function(e){ return e.id === ts.id; }); o.cityTypedStrip = strip()[rowT]; var bt = btn(rowT, 'Add again'); press(bt); await wait(10); var c2 = Array.prototype.find.call(document.querySelectorAll('#tmBody .tm-c'), function(c){ return !c.disabled; }); press(c2); await wait(10);
      var both = tripPlanEntries(TB.plan).filter(function(e){ return e.name === "Maya's kiosk"; }); var cp = both.find(function(e){ return e.id !== ts.id; }) || {};
      o.cityTypedClone = [both.length, tripIsStop(cp), String(cp.id || '').charAt(0), cp.url, cp.about, cp.optional === true, cp.ref && cp.ref.kind, cp.fixedAt || null]; }
    o.cityOutsideTyped = outside();
    /* تنبيه على مكان ثم تكراره: التنبيه مع النسخة */
    var pl = tripPlanEntries(TB.plan).find(function(e){ return !tripIsStop(e); }); pl.alert = 'closes at dusk'; pl.optional = true; var cl = tripEntryClone(pl); o.cloneAlert = [cl.alert, cl.id !== pl.id, (cl.alts || []).length, cl.ref !== pl.ref && JSON.stringify(cl.ref) === JSON.stringify(pl.ref), cl.optional === true, tripIsStop(cl)]; delete pl.optional;
    /* استراحة + بدائل: ما خارج الشريط في أغنى حالة */
    try{ var slot = TRIP_REST_SLOTS.find(function(p){ return tripRestSlotNext(TB.plan.days[0], p); }); if (slot) tbRestAdd(slot); }catch(_){}
    o.cityOutsideRich = outside();
    /* الحفظ مسودة ثم الاعتماد — للخصوصية وللعرض المحفوظ */
    await tbSaveNow(); o.idCity = tbTrip().id; await tbApprove(); try{ closeModalById('dashBackdrop'); }catch(_){} await wait(60);
    var tc = userTrips.find(function(x){ return x.id === o.idCity; });
    o.cityDayFrom = tc.plan.days[0].from;
    cmCache.trips['oRBc'] = Object.assign(JSON.parse(JSON.stringify(tc)), { id: 'oRBc', nickname: 'maya' }); var ic = itineraryHtml('otrip', 'oRBc') || ''; delete cmCache.trips['oRBc'];
    var dayC = ic.slice(ic.indexOf('<h2>')); o.privCity = [/\d\d:\d\d/.test(dayC), /\d+ min\b/.test(text(dayC)), ic.indexOf('Secret Inn') >= 0, /it-rest/.test(dayC), /≈/.test(dayC), dayC.indexOf('Bean One') >= 0 || dayC.indexOf('Bean Two') >= 0, /it-notimes/.test(dayC)];
    var mine = itineraryHtml('trip', o.idCity) || ''; var dayM = mine.slice(mine.indexOf('<h2>')); o.privMine = [/\d\d:\d\d/.test(dayM), mine.indexOf('Secret Inn') >= 0, /it-rest/.test(dayM)];
  }catch(e){ o.errA = String(e && e.stack || e); }
  try{ if (__tm) tripMoveDone(null); }catch(_){}
  try{ if (TB) tbCloseNow(false); }catch(_){}

  /* ── (ب) المسار الخطّي: الأزرار بالضغط · ما خارج الشريط · كتابة في الطريق · الخصوصية بوقت البدء ── */
  try{
    await openTripBuilder({ cityId: 'r110p', dayPlan: true, dayTrip: true }); tbSetDT('arrival', 'time', '09:00');
    await tbOpenPick('r110p'); pick(['me|coffee|c2', 'me|bakery|b1', 'me|coffee|c1']); tbPickDone();
    TB.cities[0].stay = { name: 'Secret Inn', geo: { lat: 46.429, lng: 6.909 } }; await tbBuild(); await wait(30); tbSetTripName('RB trip');
    o.linBuild = [TB.undo.length, TB.moveCount, linNames()];
    o.linOutside0 = outside(); o.linStrip0 = strip();
    var b1 = btn(0, '▼'); press(b1); await wait(10); o.linDownClick = [!!b1, linNames()];
    var b2 = btn(0, 'optional'); press(b2); await wait(10); o.linOptClick = [!!b2, tbDTDay().stops[0].optional === true];
    var b3 = btn(1, 'Add again'); press(b3); await wait(10); o.linAgainClick = [!!b3, linNames()];
    var b4 = btn(3, '✕'); press(b4); await wait(30); o.linRemoveClick = [!!b4, linNames()];
    await tbStopSheet(); tbStopDraft.name = 'Typed peak'; tbStopDraft.url = 'https://maps.app.goo.gl/peak'; tbStopDraft.kind = 'peak'; tbStopDraft.geo = { lat: 46.46, lng: 6.95 }; tbStopDraft.about = 'Cable car up'; tbStopSave(); await wait(10);
    var k = tbDTDay().stops.length - 1; var b5 = btn(k, 'Add again'); press(b5); await wait(10); var lc = tbDTDay().stops[tbDTDay().stops.length - 1];
    o.linTypedClone = [!!b5, lc.name, tripIsStop(lc), String(lc.id).charAt(0), lc.url, lc.about, lc.ref.kind]; await tbDTRemove(lc.id); await wait(10);
    try{ tripEndApply(tbDTRoute(), { name: 'Far station', geo: { lat: 46.47, lng: 6.99 } }); tbTouch(); tbRender(); }catch(_){}
    o.linOutsideRich = outside();
    /* كتابة مسودة في الطريق ويقع تعديل */
    await tbSaveDraft(); o.idLin = tbTrip().id; var nSaved = tbDTDay().stops.length;
    var save0 = mpData.trips.save; mpData.trips.save = function(){ var a = arguments, self = this; return new Promise(function(r){ setTimeout(r, 150); }).then(function(){ return save0.apply(self, a); }); };
    tbDTToggleOptional(tbDTDay().stops[1].id); var nT = toasts.length;
    var p = tbSaveDraft(); await wait(40);
    o.raceBusy = [TB.saving === true, document.getElementById('tripBuildBackdrop').classList.contains('tb-busy')];
    await tbDTRemove(tbDTDay().stops[tbDTDay().stops.length - 1].id); var leave0 = (JSON.parse(tripSavedJson[o.idLin]).dayRoutes['1'] || {}).leave || null; tbDTTime('leave', '07:15');
    await p; mpData.trips.save = save0; await wait(30);
    var mem = userTrips.find(function(x){ return x.id === o.idLin; });
    o.raceAfter = { editor: tbDTDay().stops.length, written: JSON.parse(tripSavedJson[o.idLin]).plan.days[0].stops.length, origin: JSON.parse(TB.origin).plan.days[0].stops.length, saved0: nSaved, originLeave: (JSON.parse(TB.origin).dayRoutes['1'] || {}).leave || null, writtenLeave: (JSON.parse(tripSavedJson[o.idLin]).dayRoutes['1'] || {}).leave || null, leave0: leave0, liveLeave: (userTrips.find(function(x){ return x.id === o.idLin; }).dayRoutes['1'] || {}).leave, liveStops: mem.plan.days[0].stops.length, dirty: tbDirty(), device: localStorage.getItem(TB_SESSION_KEY) !== null, toast: toasts.slice(nT).slice(-1)[0] || '', busy: [TB.saving === true, document.getElementById('tripBuildBackdrop').classList.contains('tb-busy')] };
    var nS = sheets.length; window.__tbCloseReal = true; /* المحاكي يغلّف tbClose بخروج صامت — هنا الخروج الحقيقي بسؤاله */ await tbClose(); window.__tbCloseReal = false; await wait(40);
    var back = userTrips.find(function(x){ return x.id === o.idLin; }) || { plan: { days: [{ stops: [] }] }, dayRoutes: {} }; o.raceClose = [!TB, sheets.slice(nS), back.plan.days[0].stops.length, ((back.dayRoutes || {})['1'] || {}).leave || null];
    /* حفظ هادئ بلا تعديل في الطريق: نظيف والرسالة «keep going» */
    await openTripBuilder({ tripId: o.idLin, stage: 2 }); tbDTToggleOptional(tbDTDay().stops[0].id); nT = toasts.length; await tbSaveDraft(); await wait(20);
    o.calm = [!!TB, tbDirty(), localStorage.getItem(TB_SESSION_KEY) === null, toasts.slice(nT).slice(-1)[0] || '', TB.origin === tripSavedJson[o.idLin]];
    /* المراجعة ج (٣): قفل اللمس محدود — كتابة أبطأ من TB_BUSY_MAX يُرفع عنها القفل برسالة، و saving باقٍ حتى تعود */
    var max0 = TB_BUSY_MAX; TB_BUSY_MAX = 60; mpData.trips.save = function(){ var a = arguments, self = this; return new Promise(function(r){ setTimeout(r, 320); }).then(function(){ return save0.apply(self, a); }); }; tbDTToggleOptional(tbDTDay().stops[0].id); nT = toasts.length; var ps = tbSaveDraft(); await wait(30); var early = document.getElementById('tripBuildBackdrop').classList.contains('tb-busy'); await wait(150);
    o.slow = [early, TB.saving === true, document.getElementById('tripBuildBackdrop').classList.contains('tb-busy'), toasts.slice(nT)]; await ps; mpData.trips.save = save0; TB_BUSY_MAX = max0; await wait(20); o.slowAfter = [TB.saving === true, document.getElementById('tripBuildBackdrop').classList.contains('tb-busy'), tbDirty(), TB_BUSY_MAX];
    /* مؤقّت كتابة عادت لا يمسّ كتابة تالية: حفظ سريع ثم حفظ بطيء قبل انقضاء مهلة الأول — القفل باقٍ ولا رسالة قبل مهلة الثاني */
    TB_BUSY_MAX = 200; tbDTToggleOptional(tbDTDay().stops[0].id); await tbSaveDraft(); await wait(100); mpData.trips.save = function(){ var a = arguments, self = this; return new Promise(function(r){ setTimeout(r, 420); }).then(function(){ return save0.apply(self, a); }); }; tbDTToggleOptional(tbDTDay().stops[0].id); nT = toasts.length; var p2 = tbSaveDraft(); await wait(150);
    o.timerOwn = [TB.saving === true, document.getElementById('tripBuildBackdrop').classList.contains('tb-busy'), toasts.slice(nT).filter(function(x){ return /Still saving/.test(x); }).length]; await p2; mpData.trips.save = save0; TB_BUSY_MAX = max0; await wait(20);
    mpData.trips.save = function(){ var a = arguments, self = this; return new Promise(function(r){ setTimeout(r, 120); }).then(function(){ return save0.apply(self, a); }); }; var pa = tbApprove(); await wait(40); o.approveBusy = [!!TB && TB.saving === true, document.getElementById('tripBuildBackdrop').classList.contains('tb-busy')]; await pa; mpData.trips.save = save0; try{ closeModalById('dashBackdrop'); }catch(_){} await wait(60);
    o.busyAfterApprove = document.getElementById('tripBuildBackdrop').classList.contains('tb-busy');
    var tl = userTrips.find(function(x){ return x.id === o.idLin; });
    cmCache.trips['oRBl'] = Object.assign(JSON.parse(JSON.stringify(tl)), { id: 'oRBl', nickname: 'maya' }); var il = itineraryHtml('otrip', 'oRBl') || ''; delete cmCache.trips['oRBl'];
    var dayL = il.slice(il.indexOf('<h2>')); o.linDayFrom = tl.plan.days[0].from; o.privLin = [/\d\d:\d\d/.test(dayL), /\d+ min\b/.test(text(dayL)), il.indexOf('Secret Inn') >= 0, il.indexOf('Far station') >= 0, /≈/.test(dayL), dayL.indexOf('Bean') >= 0]; var ml = itineraryHtml('trip', o.idLin) || ''; var dayML = ml.slice(ml.indexOf('<h2>')); o.privMineLin = [/\d\d:\d\d/.test(dayML), ml.indexOf('Secret Inn') >= 0, ml.indexOf('Far station') >= 0, /≈/.test(dayML)];
  }catch(e){ o.errB = String(e && e.stack || e); }
  try{ if (typeof save0 === 'function') mpData.trips.save = save0; }catch(_){}
  try{ if (TB) tbCloseNow(false); }catch(_){}

  /* ── (ج) العرض المحفوظ خلف المحرّر: يبقى بأيامه بعد كل خروج · ويحلّ نفسه إن مُسحت ذاكرته ── */
  try{
    var mb = function(){ return String(document.getElementById('myTripsBody').innerHTML || ''); }; var seen = function(){ return [mb().indexOf('Bean') >= 0, !!resolvedTripCache[o.idCity]]; };
    switchTab('Trips'); await openTripDetail(o.idCity); await wait(120); o.view0 = seen();
    var rt0 = resolveTripPlaces, nRes = 0; resolveTripPlaces = function(t){ nRes++; return rt0(t); };
    await openTripBuilder({ tripId: o.idCity, stage: 2 }); var nR0 = nRes; await tbClose(); await wait(250); o.viewEditCancel = seen(); o.resolvesOnCancel = nRes - nR0; resolveTripPlaces = rt0;
    await openTripBuilder({ tripId: o.idCity, stage: 2, pick: true, daySel: 0 }); var wasPick = !!(TB && TB.pick); if (TB && TB.pick) tbPickCancel(); await tbClose(); await wait(250); o.viewAddCancel = [wasPick].concat(seen());
    await openTripBuilder({ tripId: o.idCity, stage: 2 }); tbSetTripName('RB city 2'); tbRender(); await tbSaveDraft(); await wait(50); var stay = !!TB; if (TB) await tbClose(); await wait(250); o.viewDraftCancel = [stay].concat(seen());
    delete resolvedTripCache[o.idCity]; renderMyTripsModal(); var blank = mb().indexOf('Bean') < 0; await wait(250); o.viewHeal = [blank].concat(seen());
    /* خطة يوم أُضيفت إلى رحلة: محطتها المكتوبة في يوم مدينة داخل رحلة متعددة الأيام — ✎ Edit يعمل و Move يجد خلايا */
    await openTripBuilder({ cityId: 'r110p' }); await tbOpenPick('r110p'); pick(['me|coffee|c1', 'me|museums|m1']); tbPickDone(); tbSetDays(2); tbBuildGo(); await wait(30); await tbSaveNow(); o.idMulti = tbTrip().id; await tbApprove(); await wait(120);
    await dpAddToTripRun(o.idCity, o.idMulti, { mode: 'new' }); await wait(150);
    var tm = userTrips.find(function(x){ return x.id === o.idMulti; }); var di = tm.plan.days.findIndex(function(d){ return d.mode !== 'daytrip' && tripDayEntries(d).some(tripIsStop); });
    o.multiDays = tm.plan.days.map(function(d){ return (d.mode || 'city') + ':' + tripDayEntries(d).length; }); o.multiTypedDay = di;
    if (di >= 0){ await openTripBuilder({ tripId: o.idMulti, stage: 2 }); TB.daySel = di; tbRender(); var tsm = tripDayEntries(TB.plan.days[di]).find(tripIsStop); var all = []; body().querySelectorAll('.tb-acts').forEach(function(a){ all.push(a); }); var rowM = all.findIndex(function(a){ return (a.innerHTML || '').indexOf(tsm.id) >= 0; });
      o.multiStrip = strip()[rowM]; o.multiOutside = outside();
      var be = btn(rowM, '✎ Edit'); press(be); await wait(60); var opened = !!tbStopDraft && tbStopDraft.id === tsm.id; if (opened){ tbStopDraft.name = 'Kiosk renamed'; tbStopSave(); await wait(10); }
      var f2 = tripFindEntry(TB.plan, tsm.id); o.multiEdit = [!!be, opened, f2 && f2.entry.name, f2 && f2.where];
      var bm = btn(rowM, 'Move'); press(bm); await wait(10); o.multiMove = [!!bm, document.querySelectorAll('#tmBody .tm-c:not([disabled])').length > 0];
      /* المراجعة ج (١): من يوم المدينة إلى الصينية بزر الورقة المرسوم، ثم من الصينية — الشبكة ليست مقفلة والمكان يعود إلى يوم */
      var byText = function(re){ return Array.prototype.find.call(document.querySelectorAll('#tmBody button'), function(b){ return re.test(b.textContent); }) || null; };
      var toTray = byText(/No day yet/); press(toTray); await wait(10); var fT = tripFindEntry(TB.plan, tsm.id);
      tbMove(tsm.id); var freeT = document.querySelectorAll('#tmBody .tm-c:not([disabled])').length; press(document.querySelector('#tmBody .tm-c:not([disabled])')); await wait(10); if (__tm && __tm.step === 'pos'){ press(document.querySelector('#tmBody .tm-list .btn.on')); await wait(10); }
      var fB = tripFindEntry(TB.plan, tsm.id); o.multiTray = [!!toTray, fT && fT.where, freeT > 0, fB && fB.where]; try{ if (__tm) tripMoveDone(null); }catch(_){}
      /* المراجعة ج (٢): مكان مكتوب بديلًا لمكان مكتوب — يُحفظ، ويُحلّ مع صاحبه، ويُكتب في البرنامج؛ والبديل نفسه غير مقفل */
      var other = tripPlanEntries(TB.plan).find(function(e){ return tripIsStop(e) && e.id !== tsm.id; });
      if (other){ tbMove(other.id); press(byText(/Make it an alternative of/)); await wait(10); var hostBtn = byText(/Kiosk renamed/); press(hostBtn); await wait(10); try{ if (__tm) tripMoveDone(null); }catch(_){}
        var fA = tripFindEntry(TB.plan, other.id); tbMove(other.id); var freeA = document.querySelectorAll('#tmBody .tm-c:not([disabled])').length; try{ tripMoveDone(null); }catch(_){}
        await tbApprove(); await wait(120); var tm2 = userTrips.find(function(x){ return x.id === o.idMulti; }); var res2 = await resolveTripPlaces(tm2); var hostR = null; res2.days.forEach(function(d){ tripDayEntries(d).forEach(function(e){ if (e.id === tsm.id) hostR = e; }); });
        resolvedTripCache[o.idMulti] = res2; var im = itineraryHtml('trip', o.idMulti) || ''; var altLine = (im.match(/<div class="it-alts">[\s\S]*?<\/div>/g) || []).join(' ');
        o.multiAlt = [!!hostBtn, fA && fA.where, freeA > 0, !!hostR && (hostR.alts || []).length, !!hostR && hostR.alts[0] && hostR.alts[0].name, altLine.indexOf(escapeHtml(other.name)) >= 0]; }
      if (TB) tbCloseNow(false); }
  }catch(e){ o.errC = String(e && e.stack || e); }
  try{ if (__tm) tripMoveDone(null); }catch(_){}
  try{ if (TB) tbCloseNow(false); }catch(_){}

  /* ── (د) معالجات لم تسمّها محطة: الورقة بالمفاتيح وبالسحب · لصق نص المشاركة في ورقة المحطة ── */
  try{
    window.__mpSheetAuto = undefined; var inp = document.getElementById('sheetInput'); var card = document.getElementById('sheetCard');
    var fire = function(el, type, init){ var ev = mkEv(init); press(el, type, ev); return ev; };
    var s1 = mpSheet({ title: 'Name it', ok: 'Save', input: { value: 'abc' } }); await wait(10); inp.value = 'typed'; var ev1 = fire(inp, 'keydown', { key: 'Enter' }); o.sheetEnter = [await s1, ev1.defaultPrevented, document.getElementById('sheetBackdrop').classList.contains('show')];
    var s2 = mpSheet({ title: 'Name it', ok: 'Save', input: { value: 'abc' } }); await wait(10); fire(inp, 'keydown', { key: 'Escape' }); o.sheetEscape = [await s2];
    var s3 = mpSheet({ title: 'Sure?', ok: 'Yes' }); await wait(10); fire(card, 'touchstart', { touches: [{ clientY: 100 }] }); fire(card, 'touchmove', { touches: [{ clientY: 130 }] }); fire(card, 'touchend', { touches: [], changedTouches: [{ clientY: 130 }] }); await wait(10); var open3 = document.getElementById('sheetBackdrop').classList.contains('show');
    fire(card, 'touchstart', { touches: [{ clientY: 100 }] }); fire(card, 'touchmove', { touches: [{ clientY: 220 }] }); fire(card, 'touchend', { touches: [], changedTouches: [{ clientY: 220 }] }); o.sheetDrag = [open3, await Promise.race([s3, wait(300).then(function(){ return 'still open'; })])];
    window.__mpSheetAuto = function(s){ sheets.push(String((s && s.title) || '')); return (s && s.input) ? null : 'ok'; };
    await openTripBuilder({ cityId: 'r110p', dayPlan: true, dayTrip: true }); await tbBuild(); await wait(20); await tbStopSheet(); await wait(20);
    var u = document.getElementById('tbStopUrl'); var evp = fire(u, 'paste', { clipboardData: { getData: function(){ return 'Lake Pier\nQuai 1, Parityville\nhttps://maps.app.goo.gl/pier'; } } }); await wait(60);
    o.paste = [!!u, evp.defaultPrevented, tbStopDraft && tbStopDraft.url, tbStopDraft && tbStopDraft.name]; tbStopDraft = null; try{ closeModalById('dashBackdrop'); }catch(_){} tbCloseNow(false);
  }catch(e){ o.errD = String(e && e.stack || e); }
  try{ if (TB) tbCloseNow(false); }catch(_){}

  /* ── (هـ) سمة HTML غير معالج تُرمَّز HTML: عنوان فيه فاصلة عليا يُقرأ كما كُتب ── */
  try{ var hh = document.createElement('div'); hh.innerHTML = '<a title="' + attrVal("St John's \"old\" <town>") + '" href="' + attrVal("https://x.test/a?b='c'&d=1") + '">x</a><i data-key="' + attrVal('k\'1"2\\3') + '"></i>'; var aa = hh.firstChild; document.body.appendChild(hh);
    o.attr = [aa.getAttribute('title'), aa.getAttribute('href'), !!document.querySelector('[data-key="' + cssVal('k\'1"2\\3') + '"]')]; hh.remove(); }catch(e){ o.errE = String(e && e.stack || e); }

  try{ [o.idCity, o.idLin, o.idMulti].forEach(function(id){ if (!id) return; userTrips = (userTrips || []).filter(function(x){ return x.id !== id; }); delete resolvedTripCache[id]; delete tripSavedJson[id]; }); currentTripId = null; }catch(_){}
  window.__tbCloseReal = false; showToast = st0; window.__mpSheetAuto = a0; o.toasts = toasts.slice(-6);
  return JSON.stringify(o);
})()
