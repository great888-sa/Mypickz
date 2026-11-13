// MyPickz — tests/r115.page.js (r115 · ١١ نوفمبر ٢٠٢٦): جسم محطات r115 — يُنفَّذ داخل الصفحة (تقرؤه tests/journey.js)
// كل ضغطة بنصّ المعالج المرسوم على العنصر (press) كما في tests/r110-review.page.js. المتطلّب: مدينة الاختبار r110p محمَّلة. يعيد JSON واحدًا.
(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var toasts = []; var st0 = showToast; showToast = function(m){ toasts.push(String(m)); };
  var a0 = window.__mpSheetAuto; var sheets = []; window.__mpSheetAuto = function(s){ sheets.push(String((s && s.title) || '')); return (s && s.input) ? null : 'ok'; };
  var o = {}; var body = function(){ return document.getElementById('tbBody'); };
  var pick = function(keys){ keys.forEach(function(k){ tbTogglePick(k, true, 'r110p'); }); };
  var mkEv = function(init){ var ev = { defaultPrevented: false, preventDefault: function(){ this.defaultPrevented = true; }, stopPropagation: function(){} }; Object.keys(init || {}).forEach(function(k){ ev[k] = init[k]; }); return ev; };
  var press = function(el, type, ev){ if (!el || el.disabled) return false; var code = el.getAttribute('on' + (type || 'click')); if (!code) return false; var event = ev || mkEv(); (function(){ eval(code); }).call(el); return true; };
  var rowBtn = function(id, label){ var r = Array.prototype.find.call(body().querySelectorAll('.tb-acts'), function(a){ return (a.innerHTML || '').indexOf(id) >= 0; }); return r ? (Array.prototype.find.call(r.querySelectorAll('button'), function(b){ return b.textContent === label; }) || null) : null; };
  var sheetBtn = function(re){ return Array.prototype.find.call(document.querySelectorAll('#tmBody button'), function(b){ return re.test(b.textContent); }) || null; };
  var freeCells = function(){ return document.querySelectorAll('#tmBody .tm-c:not([disabled]):not(.tm-route)').length; };

  /* ── (ج) فتح القفل: مكان مكتوب في مسار خطّي داخل رحلة متعددة الأيام يتحرّك كأي مكان ── */
  try{
    await openTripBuilder({ cityId: 'r110p', dayPlan: true, dayTrip: true }); await tbOpenPick('r110p'); pick(['me|coffee|c2', 'me|bakery|b1']); tbPickDone(); await tbBuild(); await wait(30); tbSetTripName('R115 route');
    await tbStopSheet(); tbStopDraft.name = 'Typed peak'; tbStopDraft.url = 'https://maps.app.goo.gl/peak'; tbStopDraft.kind = 'peak'; tbStopDraft.geo = { lat: 46.46, lng: 6.95 }; tbStopDraft.about = 'Cable car up'; tbStopDraft.optional = true; tbStopDraft.fixedAt = '11:30'; tbStopSave(); await wait(10);
    await tbStopSheet(); tbStopDraft.name = 'Second typed'; tbStopDraft.kind = 'water'; tbStopDraft.geo = { lat: 46.47, lng: 6.96 }; tbStopSave(); await wait(10);
    await tbSaveNow(); o.idLin = tbTrip().id; await tbApprove(); try{ closeModalById('dashBackdrop'); }catch(_){} await wait(60);
    await openTripBuilder({ cityId: 'r110p' }); await tbOpenPick('r110p'); pick(['me|coffee|c1', 'me|museums|m1']); tbPickDone(); tbSetDays(2); tbBuildGo(); await wait(30); await tbSaveNow(); o.idMulti = tbTrip().id; await tbApprove(); await wait(120);
    await dpAddToTripRun(o.idLin, o.idMulti, { mode: 'new' }); await wait(150);
    await openTripBuilder({ tripId: o.idMulti, stage: 2 }); var li = TB.plan.days.findIndex(function(d){ return d.mode === 'daytrip'; }); TB.daySel = li; tbRender();
    var ts = TB.plan.days[li].stops.find(function(e){ return e.name === 'Typed peak'; }); var t2 = TB.plan.days[li].stops.find(function(e){ return e.name === 'Second typed'; });
    o.lockDays = TB.plan.days.map(function(d){ return (d.mode || 'city') + ':' + tripDayEntries(d).length; }); o.lockLinear = li;
    var routeKey = String(TB.plan.days[li].n); var ix = TB.plan.days[li].stops.findIndex(function(e){ return e.id === ts.id; }); var rr = tbDTRoute(); rr.legs = rr.legs || {}; rr.legs[TB.plan.days[li].stops[ix - 1].id + '>' + ts.id] = { mode: 'walk', minutes: 12 }; /* رِجل مكتوبة إلى المكان — تُقلَّم بعد نقله */ var legs0 = Object.keys(((tbTrip().dayRoutes || {})[routeKey] || {}).legs || {}).filter(function(k){ return k.indexOf(ts.id) >= 0; }).length;
    var bm = rowBtn(ts.id, 'Move'); press(bm); await wait(10);
    o.lockSheet = [!!bm, freeCells(), !!sheetBtn(/No day yet/), !!sheetBtn(/Make it an alternative of/)];
    /* إلى فترة في يوم مدينة بخليتها المرسومة */
    press(document.querySelector('#tmBody .tm-c:not([disabled]):not(.tm-route)')); await wait(10); if (__tm && __tm.step === 'pos'){ press(document.querySelector('#tmBody .tm-list .btn.on')); await wait(10); }
    var f1 = tripFindEntry(TB.plan, ts.id); var e1 = f1 ? f1.entry : {};
    o.lockMoved = [f1 && f1.where, tripIsStop(e1), e1.url, e1.about, e1.optional === true, e1.fixedAt, e1.ref && e1.ref.kind, TB.plan.days[li].stops.some(function(x){ return x.id === ts.id; })];
    /* المكان الثاني: إلى الصينية ثم بديلًا للأول */
    TB.daySel = li; tbRender(); press(rowBtn(t2.id, 'Move')); await wait(10); press(sheetBtn(/No day yet/)); await wait(10); var f2 = tripFindEntry(TB.plan, t2.id);
    tbMove(t2.id); press(sheetBtn(/Make it an alternative of/)); await wait(10); var host = sheetBtn(/Typed peak/); press(host); await wait(10); try{ if (__tm) tripMoveDone(null); }catch(_){}
    var f3 = tripFindEntry(TB.plan, t2.id); o.lockTrayAlt = [f2 && f2.where, !!host, f3 && f3.where, f3 && f3.host && f3.host.id === ts.id];
    /* الحفظ: الحارس لا يرفض، والأرجل القديمة للمكان المنقول تُقلَّم */
    var nS = sheets.length; await tbApprove(); await wait(150); var saved = JSON.parse(tripSavedJson[o.idMulti] || '{}');
    var legs1 = Object.keys((((saved.dayRoutes || {})[routeKey]) || {}).legs || {}).filter(function(k){ return k.indexOf(ts.id) >= 0; }).length; var fs = saved.plan ? tripFindEntry(saved.plan, ts.id) : null;
    o.lockSaved = [sheets.slice(nS).filter(function(t){ return /Not saved/.test(t); }).length, legs0 > 0, legs1, fs && fs.where, !TB];
  }catch(e){ o.errC = String(e && e.stack || e); }
  try{ if (__tm) tripMoveDone(null); }catch(_){}
  try{ if (TB) tbCloseNow(false); }catch(_){}

  /* ── (د) الوصل: بلاطة الخريطة · فتح المكان · saved by · دخول رحلة · العدّ بعدد ── */
  try{
    var bufSum = function(re, field){ var b = mpTrack._buf, n = 0, path = ''; Object.keys(b).forEach(function(k){ if (re.test(k) && b[k][field]){ n += b[k][field]; path = k; } }); return { n: n, path: path }; };
    var oth = { id: 'x1', name: 'Other Cafe', url: 'https://maps.app.goo.gl/oth1', area: 'Old town', geo: { lat: 46.432, lng: 6.913 } };
    var rowHtml = othersPlaceRowHtml(oth, { uid: 'uOTH', nickname: 'oth' }, { id: 'r110p', name: 'Parityville', country: 'Testland' }, 'coffee', null, {});
    var box = document.createElement('div'); box.innerHTML = rowHtml; document.body.appendChild(box); var tile = box.querySelector('a[data-mpsrc="community"]');
    o.tileOthers = tile ? [tile.getAttribute('data-mpsrc'), tile.getAttribute('data-mpcat'), tile.getAttribute('data-mplist')] : null;
    var mineActs = plMineActions('r110p', { id: 'coffee' }, { id: 'c1', name: 'Bean One', url: 'https://maps.app.goo.gl/c1' }, 0, null); o.tileMine = [/data-mpsrc="mine"/.test(mineActs[0].attrs || ''), /data-mpcat="coffee"/.test(mineActs[0].attrs || '')];
    var c0 = bufSum(/^analytics\/events_.*__coffee$/, 'place_open').n, s0 = bufSum(/^stats_places\/uOTH_r110p__/, 'open_total').n;
    var evc = document.createEvent('Event'); evc.initEvent('click', true, true); if (tile){ tile.addEventListener('click', function(e){ e.preventDefault(); }); tile.dispatchEvent(evc); } await wait(60);
    var sp = bufSum(/^stats_places\/uOTH_r110p__/, 'open_total'); o.click = { cat: bufSum(/^analytics\/events_.*__coffee$/, 'place_open').n - c0, openTotal: sp.n - s0, path: sp.path }; box.remove();
    /* saved by — بالفعل كاملًا */
    var top0 = (await mpData.placeCounts.top(30)).filter(function(x){ return x.name === 'Other Cafe'; }).length;
    await saveOthersPlace('uOTH', 'r110p', 'coffee', 'x1'); await wait(80); var t1 = (await mpData.placeCounts.top(30)).filter(function(x){ return x.name === 'Other Cafe'; })[0] || {};
    await saveOthersPlace('uOTH', 'r110p', 'coffee', 'x1'); await wait(80); var t2 = (await mpData.placeCounts.top(30)).filter(function(x){ return x.name === 'Other Cafe'; })[0] || {};
    var sb3 = await mpTrack.savedBy(currentUser.uid, t1.url, 'Other Cafe', 'r110p'); await wait(40); var t3 = (await mpData.placeCounts.top(30)).filter(function(x){ return x.name === 'Other Cafe'; })[0] || {}; /* r117-أ: نداء مباشر ثالث من الحافظ نفسه — سجله قائم فلا يُعدّ (counted: false) والعدّاد كما هو */
    o.savedBy = [t1.count, t1.name, t1.url, t2.count]; o.savedBy3 = [t3.count, !!sb3 && sb3.counted, !!sb3 && /^[a-f0-9]{16}$/.test(sb3.id)]; o.savedTop0 = top0;
    /* دخول رحلة */
    var ta0 = bufSum(/^stats_places\/uOTH_r110p__/, 'trip_add').n; cmAddOthersPlaceToTrip('r110p', 'coffee', 'x1', 'uOTH', 'Other Cafe'); await wait(20); try{ document.getElementById('tripPickerBackdrop').classList.remove('show'); }catch(_){}
    if (o.idMulti){ await tripAddContinue(o.idMulti); await wait(120); } var ta = bufSum(/^stats_places\/uOTH_r110p__/, 'trip_add'); var tmm = userTrips.find(function(x){ return x.id === o.idMulti; });
    o.tripAdd = { n: ta.n - ta0, samePath: ta.path === sp.path, placed: !!tmm && tripPlanEntries(tmm.plan).concat(tmm.plan.tray || []).some(function(e){ return e.name === 'Other Cafe'; }) };
    /* العدّ بعدد وحمله على الجهاز */
    try{ localStorage.removeItem('mp_track_carry'); }catch(_){}
    var cr = function(){ return mpTrack._stats.carry.import_place || 0; }; var ls = function(){ try{ var all = JSON.parse(localStorage.getItem('mp_track_carry') || '{}') || {}; return ((all[mpTrack._stats.carrySid] || {}).import_place) || 0; /* r116-ح: حصّة هذا التبويب */ }catch(_){ return -1; } };
    var bq = function(){ return bufSum(/^analytics\/events_.*__all__all$/, 'import_place'); }; mpTrack.count('import_place', 0); var k0 = cr(), b0 = bq().n;
    mpTrack.count('import_place', 120); var a1 = [cr() - k0, ls() - k0]; mpTrack._sent(bq().path, { import_place: 50 }); var a2 = [cr() - k0, ls() - k0];
    var stored = JSON.parse(localStorage.getItem('mp_track_carry') || '{}'); stored.sOLDTAB = { import_place: 30, t: Date.now() - 20 * 60 * 1000 }; localStorage.setItem('mp_track_carry', JSON.stringify(stored)); /* بقية جلسة سابقة على الجهاز — r116-ح: حصّة تبويب أُغلق (لم تُلمس منذ عشرين دقيقة) */
    mpTrack.carryLoad(); mpTrack.carryLoad(); o.carry = a1.concat(a2).concat([cr() - k0, bq().n - b0]);
    mpTrack._sent(bq().path, { import_place: cr() }); /* لا يُترك محمول اختباري */
  }catch(e){ o.errD = String(e && e.stack || e); }

  /* ── (ب) قياس البوابة: رؤية البوابة مرة للجهاز في اليوم · حدّ الستة مفاتيح · سطر Gate today ── */
  try{
    var gate = function(){ var b = mpTrack._buf, n = 0; Object.keys(b).forEach(function(k){ if (/^analytics\/events_.*__all__all$/.test(k)) n += b[k].reserved_3 || 0; }); return n; };
    var cu = currentUser, hu = mpHadUser, pend = document.body.classList.contains('auth-pending'); var g0 = gate(); var res = [];
    try{
      localStorage.removeItem('mp_gate_seen'); mpHadUser = false; document.body.classList.remove('auth-pending');
      res.push(gateSeen());                                             /* مسجَّل: لا تُعدّ */
      currentUser = null; document.body.classList.add('auth-pending'); res.push(gateSeen()); document.body.classList.remove('auth-pending'); /* حال الدخول لم تُعرف بعد: لا تُعدّ */
      res.push(gateSeen()); res.push(gate() - g0);                       /* زائر: تُعدّ مرة */
      res.push(gateSeen()); res.push(gate() - g0);                       /* مرة ثانية في اليوم: لا */
      localStorage.removeItem('mp_gate_seen'); mpHadUser = true; res.push(gateSeen()); res.push(gate() - g0); mpHadUser = false; /* خرج في هذا التحميل: لا */
      var chip = document.getElementById('guestChipBtn'); var code = chip ? chip.getAttribute('onclick') : ''; press(chip); res.push(code); res.push(gate() - g0); res.push(document.getElementById('authBackdrop').classList.contains('show')); /* بزر الزائر المرسوم: openGate تعدّ */
      press(chip); res.push(gate() - g0);
    } finally { currentUser = cu; mpHadUser = hu; document.body.classList.toggle('auth-pending', pend); try{ closeGate(); }catch(_){} try{ localStorage.removeItem('mp_gate_seen'); }catch(_){} }
    o.gate = res;
    var por = mpTrack._portions({ a: 1, b: 120, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, seconds: 9000 }); o.portions = [Object.keys(por).length, por.b, por.a, ('g' in por), mpTrack._portions({ seconds: 9000 }).seconds];
    var bp0 = mpData.analytics.byPrefix; mpData.analytics.byPrefix = async function(){ return { size: 1, forEach: function(fn){ fn({ data: function(){ return { reserved_3: 4, signup_start: 2, signup_done: 1, reserved_2: 3, visit_source: 9 }; } }); } }; };
    try{ var card = await renderMpEventsCard(); o.gateLine = [card.indexOf('Gate today: seen 4 · started 2 · signed up 1 · 25%') >= 0, card.indexOf('gate seen: 4') >= 0, card.indexOf('published publicly: 3') >= 0, card.indexOf('reserved_3') < 0]; } finally { mpData.analytics.byPrefix = bp0; }
    mpData.analytics.byPrefix = async function(){ return { size: 0, forEach: function(){} }; }; try{ var card0 = await renderMpEventsCard(); o.gateEmpty = card0.indexOf('Gate today: seen 0 · started 0 · signed up 0 · —') >= 0; } finally { mpData.analytics.byPrefix = bp0; }
  }catch(e){ o.errB = String(e && e.stack || e); }

  /* ── (هـ) مخطط العنوان الواحد: التوسيم · رمز المشارك · التقاط الوصول · فتح الوجهة بعد الدخول ── */
  var q0 = location.search; var setQ = function(q){ location.search = q; }; /* محاكي الرحلة يقدّم location كائنًا بسيطًا — عنوان الوصول يُضبط فيه مباشرة */
  try{
    await mpSharerInit(); var code = mpSharer; var me = currentUser.uid;
    var sf0 = mpSharerFor; mpSharerFor = 'someone-else'; o.shareStale = mpShareUrl({ src: 'app' }); mpSharerFor = sf0; /* رمز حُسب لمستخدم آخر (تبديل حساب قبل اكتمال الحساب الجديد) لا يُلصق */
    o.share = [/^[0-9a-f]{10}$/.test(code), mpShareUrl({ src: 'app', ref: 'qr' }) === 'https://mypickz.app/?src=app&ref=qr&by=' + code, mpShareUrl({ src: 'ulist', to: 'l.' + me + '_r110p' }) === 'https://mypickz.app/?src=ulist&ref=link&by=' + code + '&to=l.' + me + '_r110p', mpShareUrl({ src: 'bad', ref: 'zz', to: 'javascript:alert(1)' }) === 'https://mypickz.app/?ref=link&by=' + code];
    var got = null; var nc = navigator.clipboard; var w0 = nc && nc.writeText; try{ nc.writeText = function(t){ got = t; return Promise.resolve(); }; copyLink(); await wait(10); }catch(_){ got = 'clipboard not stubbable'; } finally { try{ nc.writeText = w0; }catch(_){} }
    o.copy = got === 'https://mypickz.app/?src=app&ref=link&by=' + code ? true : got;
    var srcSum = function(f){ var b = mpTrack._buf, n = 0; Object.keys(b).forEach(function(k){ if (/^analytics\/sources_/.test(k)) n += b[k][f] || 0; }); return n; };
    localStorage.removeItem('mp_arrival'); setQ('?src=ulist&ref=qr&by=0123456789&to=l.uOTH_r110p&x=1');
    var s0 = [srcSum('src_ulist'), srcSum('ref_qr'), srcSum('ref_direct')]; var arr = mpArrivalCapture(); mpTrack.captureSource();
    o.arrival = [arr && arr.src, arr && arr.ref, arr && arr.by, arr && arr.to, (mpArrivalRead() || {}).to, srcSum('src_ulist') - s0[0], srcSum('ref_qr') - s0[1], srcSum('ref_direct') - s0[2]];
    o.fields = mpArrivalFields();
    setQ('?by=' + code); mpArrivalCapture(); o.selfBy = ('refBy' in mpArrivalFields());
    localStorage.removeItem('mp_arrival'); setQ('?src=zz&to=..%2F..&by=XYZ'); o.badArr = mpArrivalCapture();
    setQ('?src=curator&ref=ig&to=l.uOTH_r110p'); mpArrivalCapture();
    var c0f = cmOpenList, t0f = openSavedTripInCommunity; var calls = []; cmOpenList = function(a, b, c){ calls.push(['l', a, b, c]); }; openSavedTripInCommunity = function(a, b){ calls.push(['t', a, b]); };
    try{ var cuu = currentUser; currentUser = null; var r0 = mpArrivalOpen(); currentUser = cuu; var r1 = mpArrivalOpen(), r2 = mpArrivalOpen(); setQ('?src=trip&to=t.uOTHER1.trip_abc123'); mpArrivalCapture(); var r3 = mpArrivalOpen(); } finally { cmOpenList = c0f; openSavedTripInCommunity = t0f; }
    o.open = [r0, r1, r2, r3, calls];
  }catch(e){ o.errE = String(e && e.stack || e); }
  try{ location.search = q0; localStorage.removeItem('mp_arrival'); sessionStorage.removeItem('mp_arrival_opened'); }catch(_){}

  /* ── (و) الشرح المتحرّك: عرض Trips من دوال الشاشة الحقيقية — بلا أثر في حالة المستخدم · كل خطوة تجد زرّها · الأزرار بنصّها المرسوم ── */
  try{
    var tb0 = TB, n0 = (userTrips || []).length, ids0 = (userTrips || []).map(function(t){ return t.id; }).join(','), ls0 = Object.keys(localStorage).sort().join(','), cur0 = currentTripId;
    var fr = HELP_DEMOS.trips.build(); var box2 = document.createElement('div');
    o.demoFrames = fr.map(function(f){ box2.innerHTML = f.html; var el = box2.querySelector(f.point); var oc = el ? (el.getAttribute('onclick') || el.getAttribute('onchange') || '') : ''; return [!!el, oc.indexOf(f.fn + '(') === 0, f.html.indexOf(f.ui) >= 0, typeof window[f.fn] === 'function' || eval('typeof ' + f.fn) === 'function', !!f.en && !!f.ar]; });
    o.demoClean = [TB === tb0, (userTrips || []).length === n0, (userTrips || []).map(function(t){ return t.id; }).join(',') === ids0, Object.keys(localStorage).sort().join(',') === ls0, currentTripId === cur0];
    o.demoReal = [fr[1].html === (function(){ return helpDemoSandbox(function(){ return ''; }); })() ? 'x' : 'ok', /class="chiprow tb-acts"/.test(fr[1].html), /Pastéis de Belém/.test(fr[1].html), /≈/.test(fr[1].html), /Pick places in Lisbon/.test(fr[0].html)];
    /* المشغّل بأزراره المرسومة */
    var hl0 = helpLang; helpLang = 'en'; helpView = null; helpOpenTopic = ''; openHelpModal(); await wait(20); var showBtn = document.querySelector('#help_card_trips button[onclick^="helpDemoOpen"]');
    var oc1 = showBtn ? showBtn.getAttribute('onclick') : ''; press(showBtn); await wait(20); var host = document.getElementById('helpDemoHost_trips');
    var cap = function(){ return [helpDemo ? helpDemo.i : -1, (document.getElementById('hdN') || {}).textContent || '', ((document.getElementById('hdCap') || {}).textContent || '').slice(0, 24), helpDemo ? helpDemo.found : null]; };
    var c1 = cap(); press(host.querySelector('button[aria-label="Next step"]')); var c2 = cap(); press(host.querySelector('button[aria-label="Previous step"]')); press(host.querySelector('button[aria-label="Previous step"]')); var c3 = cap(); press(host.querySelector('button[aria-label="Replay"]')); var c4 = cap();
    helpLang = 'ar'; helpDemoGo(1, true); var capAr = (document.getElementById('hdCap') || {}).textContent || ''; helpLang = 'en';
    press(host.querySelector('button[aria-label="Close"]')); o.demoPlay = [oc1, c1, c2, c3, c4, /[؀-ۿ]/.test(capAr), host.innerHTML === '' && helpDemo === null];
    /* التقدّم التلقائي يقف مع «تقليل الحركة» */
    var mm0 = window.matchMedia; window.matchMedia = function(){ return { matches: true }; }; helpDemoOpen('trips'); var noTimer = helpDemo && helpDemo.timer === null; helpDemoClose(); window.matchMedia = function(){ return { matches: false }; }; helpDemoOpen('trips'); var hasTimer = helpDemo && helpDemo.timer !== null; helpDemoClose(); window.matchMedia = mm0; o.demoMotion = [noTimer, hasTimer];
    /* العروض الخمسة: كل خطوة تجد زرّها في الشاشة المرسومة بمعالجه واسمه · بلا أثر: لا مفتاح نموذجي في curData ولا في حالة صفّ التصنيفات ولا قيمة في النافذتين الأصليتين ولا معرّف مكرَّر */
    var plv0 = document.getElementById('plUrl').value, adv0 = document.getElementById('addrName').value, cur0k = Object.keys(curData).sort().join(','), cp0k = Object.keys(__cp).sort().join(',');
    o.demoAll = {}; ['places', 'trips', 'curators', 'community', 'addresses'].forEach(function(id){ var fs2 = HELP_DEMOS[id].build(); var bx = document.createElement('div'); o.demoAll[id] = fs2.map(function(f){ bx.innerHTML = f.html; var el = bx.querySelector(f.point); var oc = el ? (el.getAttribute('onclick') || el.getAttribute('onchange') || '') : ''; return [!!el, oc.indexOf(f.fn + '(') >= 0, f.html.indexOf(f.ui) >= 0, eval('typeof ' + f.fn) === 'function', !!f.en && !!f.ar && /[\u0600-\u06FF]/.test(f.ar) && (!!f.wrap || id === 'trips'), id === 'trips' || Array.prototype.every.call(bx.querySelectorAll('[id]'), function(x){ return !document.getElementById(x.id); })]; }); });
    o.demoAllClean = [document.getElementById('plUrl').value === plv0, document.getElementById('addrName').value === adv0, Object.keys(curData).sort().join(',') === cur0k, Object.keys(__cp).sort().join(',') === cp0k, TB === tb0, (userTrips || []).length === n0, Object.keys(localStorage).sort().join(',') === ls0];
    /* وكلٌّ يُفتح بزرّه المرسوم في بطاقته، في مسرح بطاقته، بحاوية شاشته */
    helpView = null; openHelpModal(); o.demoOpenAll = ['places', 'trips', 'curators', 'community', 'addresses'].map(function(id){ var b = document.querySelector('#help_card_' + id + ' button[onclick^="helpDemoOpen"]'); press(b); var hostX = document.getElementById('helpDemoHost_' + id); var r2 = [b.getAttribute('onclick'), !!(helpDemo && helpDemo.id === id && helpDemo.found), !!hostX.querySelector('.hdm'), (document.getElementById('hdIn') || {}).className || '', document.querySelectorAll('.hdm').length]; press(hostX.querySelector('button[aria-label="Close"]')); r2.push(hostX.innerHTML === ''); return r2; });
    var idsAll = Array.prototype.map.call(document.querySelectorAll('[id]'), function(e){ return e.id; }); o.demoDupIds = idsAll.length - idsAll.filter(function(x, i){ return idsAll.indexOf(x) === i; }).length;
    /* والعرض في المستوى الثاني أيضًا (بطاقة الوجهة أعلى مواضيعها) · وإعادة رسم الإرشاد تغلق العرض بمؤقّته */
    helpOpenGroup('places'); press(document.querySelector('#help_card_places button[onclick^="helpDemoOpen"]')); var inView = !!(helpDemo && helpDemo.id === 'places' && document.querySelector('#helpDemoHost_places .hdm')); press(document.querySelector('#helpSections .help-topic button')); o.demoInView = [inView, helpDemo === null, helpOpenTopic === 'places.basics']; helpOpenGroup('');
    helpLang = hl0; try{ closeHelpModal(); }catch(_){}
    o.demoCleanAfter = [TB === tb0, (userTrips || []).length === n0, Object.keys(localStorage).sort().join(',') === ls0];
  }catch(e){ o.errF = String(e && e.stack || e); }

  /* ── (ز) بطاقات الوجهات: زر الفعل المرسوم ينفّذ ما تصفه البطاقة ويغلق الإرشاد · الزائر بلا أفعال · لغة الإرشاد تُحفظ على الجهاز ── */
  try{
    var sw0 = switchTab, ob0 = openTripBuilder, tp0 = plTogglePanel, ac0 = plAddCity, sp0 = selectPlacesSource; var acts = [];
    switchTab = function(t){ acts.push('tab:' + t); }; openTripBuilder = function(){ acts.push('builder'); }; plTogglePanel = function(w){ acts.push('panel:' + w); }; plAddCity = function(){ acts.push('addCity'); }; selectPlacesSource = function(x){ acts.push('src:' + x); };
    var cid0 = cityListCityId, pp0 = plPanel, ps0 = placesSource;
    var runAct = function(id){ helpView = null; helpOpenTopic = ''; openHelpModal(); acts.length = 0; press(document.querySelector('#help_card_' + id + ' button[onclick^="helpAct"]')); return [acts.slice(), document.getElementById('helpBackdrop').classList.contains('show')]; };
    try{
      cityListCityId = 'x1'; plPanel = null; placesSource = 'mine'; o.actPlaces = runAct('places');
      plPanel = 'cats'; o.actPlacesOpen = runAct('places');
      cityListCityId = null; plPanel = null; placesSource = 'community'; o.actPlacesNoCity = runAct('places');
      o.actTrips = runAct('trips'); o.actCur = runAct('curators'); o.actCom = runAct('community'); o.actAddr = runAct('addresses');
      var cu7 = currentUser; currentUser = null; helpView = null; openHelpModal(); o.actGuest = [document.querySelectorAll('#helpSections button[onclick^="helpAct"]').length, document.querySelectorAll('#helpSections .help-card').length, document.getElementById('helpCloseBtn').textContent]; acts.length = 0; helpAct('trips'); o.actGuest.push(acts.length); currentUser = cu7; document.getElementById('helpBackdrop').classList.remove('show');
    } finally { switchTab = sw0; openTripBuilder = ob0; plTogglePanel = tp0; plAddCity = ac0; selectPlacesSource = sp0; cityListCityId = cid0; plPanel = pp0; placesSource = ps0; }
    /* اللغة: زر «عربي» المرسوم يحفظها · والعناوين والمواضيع بالعربية · وأسماء الأزرار تبقى كما في الشاشة */
    var hl7 = helpLang, ls7 = localStorage.getItem('mp_help_lang'); helpView = null; openHelpModal(); press(document.getElementById('helpLangArBtn')); var lsAr = localStorage.getItem('mp_help_lang');
    press(document.querySelector('#help_card_trips button[onclick^="helpOpenGroup"]')); var arHeads = Array.prototype.map.call(document.querySelectorAll('#helpSections .help-topic-h span:first-child'), function(x){ return x.textContent; });
    o.lang = [lsAr, document.getElementById('helpSections').style.direction, arHeads.length === helpTopicsOf('trips').length, arHeads[0], (document.querySelector('#help_card_trips button[onclick^="helpAct"]') || {}).textContent, (document.querySelector('.help-back') || {}).textContent];
    press(document.getElementById('helpLangEnBtn')); o.lang.push(localStorage.getItem('mp_help_lang'), helpView);
    helpLang = hl7; if (ls7 === null) localStorage.removeItem('mp_help_lang'); else localStorage.setItem('mp_help_lang', ls7); helpView = null; helpOpenTopic = ''; document.getElementById('helpBackdrop').classList.remove('show');
    /* الجدول: كل موضوع بلغتيه · لا وسم بناء في نص ظاهر · أسماء ui في اللغتين */
    var tagRe = /\br\d{2,3}[a-z]?(-[\u0600-\u06FF]+)?\b/; o.table = [HELP_TOPICS.length, HELP_TOPICS.filter(function(t){ return !(t.en && t.en.h && t.en.b && t.ar && t.ar.h && t.ar.b); }).map(function(t){ return t.id; }), HELP_TOPICS.filter(function(t){ return tagRe.test(t.en.h + t.en.b + t.ar.h + t.ar.b); }).map(function(t){ return t.id; }), HELP_TOPICS.filter(function(t){ return t.ui.some(function(n){ return t.en.b.indexOf(n) < 0 || t.ar.b.indexOf(n) < 0; }); }).map(function(t){ return t.id; }), HELP_TOPICS.reduce(function(a, t){ return a + t.tags.length; }, 0), HELP_TOPICS.reduce(function(a, t){ return a + t.ui.length; }, 0)];
    openSymbols(); var sy7 = document.getElementById('dashBody').innerHTML; openIconsGuide(); var ig7 = document.getElementById('dashBody').innerHTML; closeModalById('dashBackdrop');
    o.oneSource = [CARD_ACTIONS.length, CARD_ACTIONS.every(function(a){ return sy7.indexOf(a[2]) >= 0 && ig7.indexOf(a[2]) >= 0 && sy7.indexOf('<b>' + a[1] + '</b>') >= 0 && ig7.indexOf('<span class="ig-nm">' + a[1] + '</span>') >= 0; }), tagRe.test(sy7.replace(/<[^>]+>/g, ' ')), /Add from My places|Save this day/.test(sy7)];
  }catch(e){ o.errG = String(e && e.stack || e); }

  /* ── (ح) ما وجدته المراجعة المستقلة (١١ نوفمبر) — كل بند بقياسه ── */
  try{ /* saved by: مكان من قائمة غير عامة لا يُنشر في العدّاد المقروء للجميع · من قائمة عامة يُعدّ ويحمل علامته · وحذف نسخته يُنقصه */
    var get0 = mpData.cityLists.get; var mk = function(pub, pid, nm){ return { ownerId: 'uOTH', cityId: 'r110p', cityName: 'Parityville', nickname: 'oth', public: pub, sharedWith: pub ? [] : [currentUser.uid], categories: { coffee: { active: true, places: [{ id: pid, name: nm, url: 'https://maps.app.goo.gl/' + pid }] } } }; };
    var cntOf = async function(nm){ var t = (await mpData.placeCounts.top(60)).filter(function(x){ return x.name === nm; })[0]; return t ? t.count : null; };
    var mineOf = function(nm){ return (((myCityListData || {}).categories || {}).coffee || { places: [] }).places.filter(function(q){ return q && q.name === nm; })[0] || null; };
    try{
      mpData.cityLists.get = async function(u, c){ if (u === 'uOTH' && c === 'r110p') return mk(false, 'xpriv', 'Private Bean'); return get0.apply(this, arguments); };
      await saveOthersPlace('uOTH', 'r110p', 'coffee', 'xpriv'); await wait(80); cityListCityId = 'r110p'; await loadMyCityList('r110p'); var mP = mineOf('Private Bean');
      o.sbPrivate = [await cntOf('Private Bean'), !!mP, !!(mP && mP.source && mP.source.cnt)];
      mpData.cityLists.get = async function(u, c){ if (u === 'uOTH' && c === 'r110p') return mk(true, 'xpub', 'Public Bean'); return get0.apply(this, arguments); };
      await saveOthersPlace('uOTH', 'r110p', 'coffee', 'xpub'); await wait(80); cityListCityId = 'r110p'; await loadMyCityList('r110p'); var mQ = mineOf('Public Bean');
      o.sbPublic = [await cntOf('Public Bean'), !!(mQ && mQ.source && /^[a-f0-9]{16}$/.test(String(mQ.source.cnt)))]; /* r117-أ: العلامة معرّف العدّاد */
      mpData.cityLists.get = get0;
      var ixQ = userGetEntry('coffee').places.indexOf(mQ); await plDeleteRow('coffee', ixQ); await wait(120); o.sbAfterDelete = [await cntOf('Public Bean'), !mineOf('Public Bean')];
      var ixP = userGetEntry('coffee').places.indexOf(mineOf('Private Bean')); if (ixP >= 0){ await plDeleteRow('coffee', ixP); await wait(120); } o.sbPrivAfter = [await cntOf('Private Bean'), !mineOf('Private Bean')];
    } finally { mpData.cityLists.get = get0; }
  }catch(e){ o.errH1 = String(e && e.stack || e); }
  try{ /* الوصول: يسقط بعد أسبوع · ويُستهلك عند أول دخول مكتمل — فلا يعيد فتح الوجهة في جلسة لاحقة · وسجل المستخدم الجديد يأخذ حقوله عبر registerUserRecord نفسها */
    var c0g = cmOpenList; var opened = []; cmOpenList = function(a, b, c){ opened.push([a, b, c]); };
    try{
      localStorage.setItem('mp_arrival', JSON.stringify({ src: 'ulist', to: 'l.uOTH_r110p', at: Date.now() - 8 * 86400000 })); o.arrOld = [mpArrivalRead() === null, localStorage.getItem('mp_arrival') === null];
      sessionStorage.removeItem('mp_arrival_opened'); localStorage.setItem('mp_arrival', JSON.stringify({ src: 'ulist', to: 'l.uOTH_r110p', at: Date.now() })); var ro1 = mpArrivalOpen(); var gone = localStorage.getItem('mp_arrival') === null; sessionStorage.removeItem('mp_arrival_opened'); var ro2 = mpArrivalOpen(); o.arrOnce = [ro1, gone, ro2, opened.length];
      localStorage.setItem('mp_arrival', JSON.stringify({ src: 'ulist', ref: 'qr', at: Date.now() })); var ro3 = mpArrivalOpen(); o.arrNoTo = [ro3, localStorage.getItem('mp_arrival') === null];
      var cuX = currentUser, bump0 = mpData.dailyStats.bump; mpData.dailyStats.bump = async function(){};
      try{ currentUser = { uid: 'uNEWUSERNEWUSERNEWUSER01', email: 'new@x' }; localStorage.setItem('mp_arrival', JSON.stringify({ src: 'ulist', ref: 'qr', by: '0123456789', to: 'l.uOTH_r110p', at: Date.now() })); await registerUserRecord(); var ud = await mpData.users.get('uNEWUSERNEWUSERNEWUSER01'); var dd = (ud && ud.exists) ? ud.data() : {}; o.regRef = [dd.refBy, dd.refSrc, dd.refCh, dd.refTo, dd.email, mpSharerFor === 'uNEWUSERNEWUSERNEWUSER01']; try{ await db.collection('users').doc('uNEWUSERNEWUSERNEWUSER01').delete(); }catch(_){} }
      finally { currentUser = cuX; mpData.dailyStats.bump = bump0; localStorage.removeItem('mp_arrival'); sessionStorage.removeItem('mp_arrival_opened'); await mpSharerInit(); }
    } finally { cmOpenList = c0g; }
  }catch(e){ o.errH2 = String(e && e.stack || e); }
  try{ /* الطابور: مستند ترفضه القواعد (عدّاد لقائمة غير موجودة) لا يُسقط الدفعة — المقبول يُكتب والمرفوض يخرج · واسم قائمة مستورَدة لا يدخل معرّف مستند · والمحمول مفاتيحه معلومة */
    for (var dr = 0; dr < 20; dr++){ await mpTrack._flush(true); await wait(20); if (!Object.keys(mpTrack._buf).length) break; } /* r116: حتى يفرغ الطابور كله — مستند فيه أكثر من ستة مفاتيح يُكتب على دورات (≤ ٦ في الكتابة)، فكان «ثبات عدد المستندات» يتوقف وفيه مفاتيح تنتظر فتؤخّر share_link دورة */ /* يُصرَّف ما ينتظر (٣٠ مستندًا في الدورة) حتى يثبت الطابور — ليكون ما يُضاف بعده في دفعة واحدة */
    var dayP = Object.keys(mpTrack._buf)[0]; mpTrack.hit('share_link', { personal: true }); var evPath = Object.keys(mpTrack._buf).filter(function(k){ return /^analytics\/events_.*__all__all$/.test(k); })[0] || ''; var evId = evPath.split('/')[1];
    var rd = async function(){ var sn = await db.collection('analytics').doc(evId).get(); return (sn && sn.exists && sn.data().share_link) || 0; }; var sl0 = await rd();
    mpTrack.statsPlaceList('uGHOSTGHOSTGHOSTGHOST00_nolist', 'https://maps.app.goo.gl/ghost', 'open_total'); await wait(60);
    var q1 = Object.keys(mpTrack._buf); await mpTrack._flush(true); await wait(30); var q2 = Object.keys(mpTrack._buf); var sl1 = await rd();
    mpTrack.hit('share_link', { personal: true }); await mpTrack._flush(true); await wait(30); var sl2 = await rd();
    o.flushDrop = [q1.some(function(k){ return /^stats_places\/uGHOST/.test(k); }), q2.some(function(k){ return /^stats_places\/uGHOST/.test(k); }), sl1 - sl0, sl2 - sl1]; /* الطابور قد يحمل بقية المحمول (٥٠ في الكتابة) — لا يُشترط فراغه */
    mpTrack.hit('place_open', { cat: 'tk:Exes secret spots' }); var tkPaths = Object.keys(mpTrack._buf); o.tkSlug = [tkPaths.some(function(k){ return /tk_|exes|secret/i.test(k); }), tkPaths.some(function(k){ return /^analytics\/events_.*__all$/.test(k); })]; await mpTrack._flush(true);
    var cs0 = localStorage.getItem('mp_track_carry'); var allC = JSON.parse(cs0 || '{}') || {}; allC.evil_key = 5; /* الصيغة القديمة بمفتاح غريب */ allC.sEVILTAB = { evil_key: 9, t: 0 }; /* r116-ح: وحصّة تبويب أُغلق بمفتاح غريب */ localStorage.setItem('mp_track_carry', JSON.stringify(allC)); mpTrack.carryLoad(); mpTrack.count('evil_key', 3);
    o.carryOk = [('evil_key' in mpTrack._stats.carry), /evil_key/.test(localStorage.getItem('mp_track_carry') || ''), Object.keys(mpTrack._buf).some(function(k){ return 'evil_key' in mpTrack._buf[k]; })];
    if (cs0 === null) localStorage.removeItem('mp_track_carry'); else localStorage.setItem('mp_track_carry', cs0);
  }catch(e){ o.errH3 = String(e && e.stack || e); }
  try{ /* ضغط اسم مستخدم (ownerLink) ليس «فتح مكان» */
    var vcu0 = viewCommunityUser; viewCommunityUser = function(){}; var sumPO = function(){ var b = mpTrack._buf, n = 0; Object.keys(b).forEach(function(k){ n += b[k].place_open || 0; }); return n; };
    try{ var hold = document.createElement('div'); hold.innerHTML = ownerLink('uOTH', 'oth'); document.body.appendChild(hold); var po0 = sumPO(); var ev1 = document.createEvent('Event'); ev1.initEvent('click', true, true); hold.querySelector('a').dispatchEvent(ev1); await wait(20); var po1 = sumPO(); var tile = document.createElement('div'); tile.innerHTML = '<a data-mpsrc="community" data-mpcat="coffee" href="https://maps.app.goo.gl/x" onclick="return false">t</a>'; document.body.appendChild(tile); var ev2 = document.createEvent('Event'); ev2.initEvent('click', true, true); tile.querySelector('a').addEventListener('click', function(e){ e.preventDefault(); }); tile.querySelector('a').dispatchEvent(ev2); await wait(20); o.ownerClick = [/class="place-link/.test(hold.innerHTML), po1 - po0, sumPO() - po1]; hold.remove(); tile.remove(); }
    finally { viewCommunityUser = vcu0; }
  }catch(e){ o.errH5 = String(e && e.stack || e); }
  try{ /* قائمة المصدر على البلاطة: لصف من قائمة مفتوحة وبرابط · لا لصف من المفكرة ولا لمحطة رحلة · والمسرح خامل وبلا معرّفات · ويُغلق مع الإرشاد · والنسخة تعود لحال الإضافة */
    var rowOf = function(pp){ var d7 = document.createElement('div'); d7.innerHTML = othersPlaceRowHtml(pp, { uid: 'uOTH', nickname: 'oth' }, { id: 'r110p', name: 'Parityville' }, 'coffee', null); var a7 = d7.querySelector('a[data-mpsrc]'); return a7 ? a7.getAttribute('data-mplist') : 'no tile'; };
    o.mplist = [rowOf({ id: 'x1', name: 'A', url: 'https://maps.app.goo.gl/oth1' }), rowOf({ id: 'x1', name: 'A', url: 'https://maps.app.goo.gl/oth1', nolist: true }), rowOf({ id: 'x9', name: 'Typed stop', url: '' })];
    var ttl = document.getElementById('plPlaceTitle'), del = document.getElementById('plDeleteBtn'); var t0x = ttl.textContent, d0x = del.style.display; ttl.textContent = '✏️ Edit place'; del.style.display = '';
    var fr9 = HELP_DEMOS.places.build()[0].html; var b9 = document.createElement('div'); b9.innerHTML = fr9; o.cloneFresh = [(b9.querySelector('[data-hid="plPlaceTitle"]') || {}).textContent, (b9.querySelector('[data-hid="plDeleteBtn"]') || { style: {} }).style.display, ttl.textContent === '✏️ Edit place']; ttl.textContent = t0x; del.style.display = d0x;
    helpView = null; openHelpModal(); press(document.querySelector('#help_card_trips button[onclick^="helpDemoOpen"]')); var stg = document.getElementById('hdStage');
    o.stage = [stg.hasAttribute('inert'), stg.getAttribute('aria-hidden'), document.querySelectorAll('#hdIn [id]').length, Array.prototype.every.call(document.querySelectorAll('#hdIn a, #hdIn button, #hdIn input, #hdIn select, #hdIn textarea'), function(x){ return x.getAttribute('tabindex') === '-1'; }), document.querySelectorAll('#hdIn button').length > 3];
    closeHelpModal(); o.stageClosed = [helpDemo === null, document.getElementById('helpDemoHost_trips') ? document.getElementById('helpDemoHost_trips').innerHTML === '' : true, document.getElementById('helpBackdrop').classList.contains('show')];
    var ce = HELP_TOPICS.find(function(t){ return t.id === 'cards.export'; }), tb9 = HELP_TOPICS.find(function(t){ return t.id === 'trips.both'; }), tk9 = HELP_TOPICS.find(function(t){ return t.id === 'trips.kinds'; }), ts9 = HELP_TOPICS.find(function(t){ return t.id === 'trips.saved'; });
    o.helpFix = [/beside each place that opens it in Google Maps/.test(ce.en.b) && /one larger code in its footer/.test(ce.en.b), /بجانب كل مكان يفتحه في خرائط جوجل/.test(ce.ar.b) && /رمزًا أكبر في تذييلها/.test(ce.ar.b), /* r116-هـ: رمز المكان ما زال يفتح خرائط جوجل — ورمز التذييل الجديد هو الذي يفتح القائمة في MyPickz */ !/＋ Places|✎ Not in My places/.test(tb9.en.b + tb9.ar.b), /inside this plan/.test(tk9.en.b) && /داخل هذه الخطة/.test(tk9.ar.b), /chip in Places/.test(ts9.en.b) && /شريحتها في Places/.test(ts9.ar.b)];
  }catch(e){ o.errH4 = String(e && e.stack || e); }

  try{ [o.idLin, o.idMulti].forEach(function(id){ if (!id) return; userTrips = (userTrips || []).filter(function(x){ return x.id !== id; }); delete resolvedTripCache[id]; delete tripSavedJson[id]; }); currentTripId = null; }catch(_){}
  window.__tbCloseReal = false; showToast = st0; window.__mpSheetAuto = a0; o.toasts = toasts.slice(-6);
  return JSON.stringify(o);
})()
