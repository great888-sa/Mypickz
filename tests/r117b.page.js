// MyPickz — tests/r117b.page.js (r117-ج · ١١ نوفمبر ٢٠٢٦): المعالجات الثمانية التي كانت بلا محطة باسمها — يُنفَّذ داخل الصفحة (تقرؤه tests/journey.js)
// tbSelCity · tbAddCityToggle · tbAddCity · addrModalAddCity · curPickChip · curEditPlace · exportOtherList · exportOwnTripRow — كلٌّ بنصّ معالجه المرسوم على زرّه.
// المتطلّب (من جهة Node): منتقٍ uCR117 بقائمة عامة في r117a · قائمتي العامة في r117a (coffee: mp1) · رحلتي trip_r117h · رحلة مشارَكة معي trip_shr117 (في المخزن). يعيد JSON واحدًا.
(async function(){
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var toasts = []; var st0 = showToast; showToast = function(m){ toasts.push(String(m)); };
  var a0 = window.__mpSheetAuto; window.__mpSheetAuto = function(s){ return (s && s.input) ? null : 'ok'; };
  var sent = []; var send0 = mpSendText; mpSendText = async function(t){ sent.push(String(t)); };
  var ech0 = exportCardHtml; exportCardHtml = function(){ return '<div class="xp-fake"></div>'; }; /* البطاقة المرسومة (canvas) ليست موضوع المحطة — الزر «Send as text» ترسمه openExportPreviewNow نفسها */
  var o = {}; var uid = currentUser.uid;
  var mkEv = function(){ return { defaultPrevented: false, preventDefault: function(){ this.defaultPrevented = true; }, stopPropagation: function(){} }; };
  var press = function(el){ if (!el || el.disabled) return null; var code = el.getAttribute('onclick'); if (!code) return null; var event = mkEv(); var out = (function(){ return eval(code); }).call(el); return { code: code, out: out }; };
  var q = function(sel){ return document.querySelector(sel); }; var qa = function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var byCode = function(root, needle){ return qa(root + ' [onclick]').filter(function(el){ return String(el.getAttribute('onclick')).indexOf(needle) >= 0; })[0] || null; };
  var CITIES = [{ id: 'r117a', name: 'Alphaville', country: 'Testland' }, { id: 'r117b', name: 'Betatown', country: 'Testland' }, { id: 'r117c', name: 'Gammaburg', country: 'Testland' }];
  var keep = { ps: (typeof plSessionCity === 'undefined') ? null : plSessionCity, cpc: Object.assign({}, userListData.cityPlaceCounts || {}), acs: (typeof addrCities === 'undefined') ? null : addrCities.slice(), acn: (typeof addrCurrentCountry === 'undefined') ? null : addrCurrentCountry, ad: (typeof addrData === 'object' && addrData) ? Object.keys(addrData) : [], cc: (userListData.customCities || []).slice(), c: cityListCityId, k: cityListCountry, tab: currentTab, d: myCityListData, lf: myCityListLoadedFor, trips: userTrips, shared: sharedTrips, curators: curators, curPage: curPage, tid: currentTripId, vs: viewingSharedTrip, ac: addrCurrentCity, am: addrModalCity };
  userListData.customCities = keep.cc.filter(function(c){ return !/^r117[abc]$/.test(c.id); }).concat(CITIES);

  /* ── (١) محرّر الرحلة · Setup: tbSelCity · tbAddCityToggle · tbAddCity ── */
  try{
    try{ localStorage.removeItem('mp_tb_session'); }catch(_){}
    await openTripBuilder({ cityId: 'r117a' }); await wait(40);
    var chips = function(){ return qa('#tbBody .tb-cities .chip').map(function(c){ return [c.textContent, c.classList.contains('on'), c.getAttribute('onclick')]; }); };
    o.tb0 = [TB.cities.map(function(c){ return c.cityId; }), TB.ci, !!TB.addCityOpen, chips(), !!q('#tbCityHost')];
    /* tbAddCityToggle: زر «＋ City» المرسوم يفتح لوحة اختيار المدينة ثم يطويها */
    var t1 = press(byCode('#tbBody .tb-cities', 'tbAddCityToggle()')); var open1 = [!!TB.addCityOpen, !!q('#tbCityHost')];
    var t2 = press(byCode('#tbBody .tb-cities', 'tbAddCityToggle()')); var open2 = [!!TB.addCityOpen, !!q('#tbCityHost')];
    o.toggle = [t1 && t1.code, open1, open2];
    /* اختيار مدينة ثانية من اللوحة المرسومة */
    press(byCode('#tbBody .tb-cities', 'tbAddCityToggle()')); press(q('#tbCityHost .csel')); var items = qa('#tbCityHost .prow[onclick]').map(function(r){ return r.getAttribute('onclick'); });
    press(byCode('#tbCityHost', "tbPickCity('r117b')")); tbSetDays(3); /* بيتاتاون ٣ أيام — ليُعرف أيّ مدينة يعرض القسم */
    o.picked = [items.filter(function(c){ return /tbPickCity\('r117[abc]'\)/.test(c); }), TB.cities.map(function(c){ return c.cityId + ':' + c.days; }), TB.ci, !!TB.addCityOpen];
    /* tbSelCity: شريحة المدينة الأولى المرسومة تنقل القسم إليها — وتطوي لوحة الإضافة المفتوحة */
    TB.addCityOpen = true; tbRender(); var hostBefore = !!q('#tbCityHost');
    var s0 = press(byCode('#tbBody .tb-cities', 'tbSelCity(0)'));
    o.sel0 = [s0 && s0.code, TB.ci, !!TB.addCityOpen, hostBefore, !!q('#tbCityHost'), chips().map(function(c){ return c[1]; }), (q('#tbDays') || {}).value, /Days in Alphaville/.test(q('#tbBody').textContent)];
    var s1 = press(byCode('#tbBody .tb-cities', 'tbSelCity(1)'));
    o.sel1 = [s1 && s1.code, TB.ci, chips().map(function(c){ return c[1]; }), (q('#tbDays') || {}).value, /Days in Betatown/.test(q('#tbBody').textContent)];
    /* tbAddCity: زر «＋ Add city» في اللوحة — مسار إضافة المدينة الحقيقي (addCityListCity) بنافذة إدخال تجيب عنها المحطة، ثم تدخل الرحلة */
    var oim0 = openInputModal; var answers = []; var asked = []; openInputModal = async function(title){ asked.push(String(title)); return answers.length ? answers.shift() : null; };
    var addBtn = function(){ if (!q('#tbCityHost')) press(byCode('#tbBody .tb-cities', 'tbAddCityToggle()')); if (!byCode('#tbCityHost', 'tbAddCity()')) press(q('#tbCityHost .csel')); return byCode('#tbCityHost', 'tbAddCity()'); };
    try{
      /* (أ) المستخدم ألغى نافذة الدولة ومدينة Places الحالية ليست في الرحلة: الرحلة لا تتغيّر */
      cityListCityId = 'r117c'; answers = [null]; asked.length = 0; toasts.length = 0;
      var b1 = addBtn(); var p1 = press(b1); if (p1 && p1.out && p1.out.then) await p1.out; await wait(30);
      o.addCancel = [p1 && p1.code, TB.cities.map(function(c){ return c.cityId; }), TB.ci, asked.slice(), toasts.slice()];
      /* (ب) أكمل الإضافة (دولة ثم مدينة من مدنه): تدخل الرحلة وتُختار وتُطوى اللوحة */
      cityListCityId = 'r117a'; answers = ['Testland', 'Gammaburg']; asked.length = 0;
      var b2 = addBtn(); var p2 = press(b2); if (p2 && p2.out && p2.out.then) await p2.out; await wait(30);
      o.addOk = [TB.cities.map(function(c){ return c.cityId; }), TB.ci, !!TB.addCityOpen, chips().length, asked.slice(), cityListCityId];
    } finally { openInputModal = oim0; }
  }catch(e){ o.err1 = String(e && e.stack || e); }
  try{ if (TB) tbCloseNow(false); closeModalById('tripBuildBackdrop'); localStorage.removeItem('mp_tb_session'); }catch(_){}

  /* ── (٢) نافذة العنوان: addrModalAddCity ── */
  try{
    addrCurrentCity = 'r117a'; addrModalCity = 'r117b'; delete __pk.addrModalCity; addrModalRenderCityPanel(); press(q('#addrModalCityHost .csel'));
    var lab = function(){ return ((q('#addrModalCityHost .csel b') || {}).textContent) || ''; };
    var ab = byCode('#addrModalCityHost', 'addrModalAddCity()'); var lab0 = lab();
    var oim1 = openInputModal; var ans2 = []; openInputModal = async function(){ return ans2.length ? ans2.shift() : null; };
    try{
      /* (أ) ألغى نافذة الدولة: المدينة التي اختارها في النافذة تبقى (لا تعود إلى مدينة تبويب العناوين) — بالمسار الحقيقي addAddrCity */
      ans2 = [null];
      var pa = press(ab); if (pa && pa.out && pa.out.then) await pa.out; await wait(20);
      o.addrCancel = [pa && pa.code, lab0, addrModalCity, lab()];
      /* (ب) أكمل الإضافة: النافذة تأخذ المدينة الجديدة */
      ans2 = ['Testland', 'Gammaburg'];
      press(q('#addrModalCityHost .csel')); var ab2 = byCode('#addrModalCityHost', 'addrModalAddCity()'); if (!ab2){ press(q('#addrModalCityHost .csel')); ab2 = byCode('#addrModalCityHost', 'addrModalAddCity()'); }
      var pb = press(ab2); if (pb && pb.out && pb.out.then) await pb.out; await wait(40);
      o.addrOk = [addrModalCity, lab(), addrCurrentCity];
    } finally { openInputModal = oim1; }
  }catch(e){ o.err2 = String(e && e.stack || e); }
  try{ closeModalById('addrBackdrop'); }catch(_){}

  /* ── (٣) صفحة المنتقي: curPickChip ── */
  try{
    curators = (keep.curators || []).filter(function(c){ return c.uid !== 'uCR117' && c.uid !== uid; }).concat([{ uid: 'uCR117', nickname: 'Rana', verified: true, publicCityIds: ['r117a'], hasAnyPublicContent: true }, { uid: uid, nickname: 'Me', verified: true, publicCityIds: ['r117a'], hasAnyPublicContent: true }]);
    switchTab('Curators'); await wait(60); curOpen('uCR117'); await wait(160);
    var chipOn = function(){ return qa('#curatorsBody .curchip').filter(function(c){ return c.classList.contains('on'); }).map(function(c){ return c.textContent; }); };
    var def = curChip; /* أماكنها مختومة ⇒ الافتراضي latest */
    curChip = 'cities'; curCity = 'r117a'; curSearchQ = 'zz'; curCitiesOpen = true; await renderCuratorsBody(); await wait(80);
    var before = [chipOn().some(function(t){ return /^Cities/.test(t); }), chipOn().some(function(t){ return /Latest update places/.test(t); }), (q('#curatorsBody input.cursearch') || {}).value, !!q('#curatorsBody .prow')];
    var pc = press(byCode('#curatorsBody', "curPickChip('latest')")); await wait(200);
    o.chip = [def, before, pc && pc.code, curChip, curCity, curSearchQ, curCitiesOpen, chipOn().some(function(t){ return /Latest update places/.test(t); }), chipOn().some(function(t){ return /^Cities/.test(t); }), /Latest update places<\/b> · last 10/.test(q('#curatorsBody').innerHTML), (q('#curatorsBody input.cursearch') || {}).value, !!q('#curatorsBody .prow'), qa('#curatorsBody .pc-name').map(function(x){ return x.textContent; }), !!byCode('#curatorsBody', 'curEditPlace(')];
  }catch(e){ o.err3 = String(e && e.stack || e); }

  /* ── (٤) صفحتي كما يراها الآخرون: curEditPlace ── */
  try{
    curOpen(uid); await wait(220); /* مكاني مختوم بزمن تحديثه ⇒ الصفحة تفتح على «Latest update places» وفي صفّه ✎ Edit (لصاحب الصفحة وحده) */ var chipMe = curChip;
    cityListCityId = 'r117a'; myCityListData = null; myCityListLoadedFor = null; /* المدينة مختارة وقائمتها لم تُحمَّل بعد */
    var eb = byCode('#curatorsBody', 'curEditPlace('); toasts.length = 0;
    var pe = press(eb); if (pe && pe.out && pe.out.then) await pe.out; await wait(120);
    var bd = q('#plPlaceBackdrop');
    o.edit = [chipMe, pe && pe.code, currentTab, cityListCityId, plEdit && [plEdit.catId, plEdit.index], !!(bd && bd.classList.contains('show')), (q('#plName') || {}).value, toasts.slice(), myCityListLoadedFor, Object.keys((myCityListData || {}).categories || {}).map(function(k){ return k + ':' + (((myCityListData.categories[k] || {}).places) || []).map(function(p){ return p.id; }).join(','); })];
    try{ closePlPlaceModal(); }catch(_){}
    /* المكان لم يعد في قائمتي: رسالة ولا نافذة */
    toasts.length = 0; plEdit = null; await curEditPlace('r117a', 'coffee', 'gone-id'); await wait(60);
    o.editGone = [toasts.slice(), plEdit, !!(q('#plPlaceBackdrop') && q('#plPlaceBackdrop').classList.contains('show'))];
  }catch(e){ o.err4 = String(e && e.stack || e); }

  /* ── (٥) Send as text لقائمة غيري: exportOtherList ── */
  try{
    sent.length = 0; toasts.length = 0; openExportPreviewNow('olist', 'uCR117_r117a'); await wait(60);
    var xb = byCode('#tripShareBackdrop', 'exportOtherList(');
    var px = press(xb); if (px && px.out && px.out.then) await px.out; await wait(80);
    o.olist = [px && px.code, sent.length, sent[0] || '', !!(q('#tripShareBackdrop') && q('#tripShareBackdrop').classList.contains('show'))];
    /* قائمة زالت: رسالة ولا إرسال */
    sent.length = 0; toasts.length = 0; await exportOtherList('uCR117', 'nowhere'); o.olistGone = [sent.length, toasts.slice()];
  }catch(e){ o.err5 = String(e && e.stack || e); }

  /* ── (٦) Send as text لرحلتي: exportOwnTripRow · ورحلة مشارَكة معي ترسل نصّها بقارئها (لا بمسار رحلتي) ── */
  try{
    userTrips = (keep.trips || []).filter(function(t){ return t.id !== 'trip_r117h'; }).concat([window.__r117hTrip]); tripsLoaded = true;
    sent.length = 0; currentTripId = null; viewingSharedTrip = true; openExportPreviewNow('trip', 'trip_r117h'); await wait(60);
    var tb = byCode('#tripShareBackdrop', 'exportOwnTripRow(');
    var pt = press(tb); await wait(260);
    o.otrip = [pt && pt.code, currentTripId, viewingSharedTrip, sent.length, (sent[0] || '').split('\n')[0], !!(q('#tripShareBackdrop') && q('#tripShareBackdrop').classList.contains('show'))];
    /* الرحلات المشارَكة معي: زر 📤 المرسوم */
    sharedTrips = [window.__r117hShared]; var host = document.createElement('div'); host.id = 'r117SharedHost'; document.body.appendChild(host); await renderSharedTripsInto(host); await wait(60);
    var sb = qa('#r117SharedHost [onclick]').filter(function(el){ return /^export/.test(String(el.getAttribute('onclick'))); })[0] || null;
    sent.length = 0; toasts.length = 0; currentTripId = 'trip_r117h'; var mt0 = (q('#myTripsBody') || {}).innerHTML;
    var ps = press(sb); if (ps && ps.out && ps.out.then) await ps.out; await wait(260);
    o.shared = [ps && ps.code, sent.length, (sent[0] || '').split('\n')[0], /Sent via MyPickz/.test(sent[0] || ''), currentTripId, (q('#myTripsBody') || {}).innerHTML === mt0, toasts.slice()];
    host.remove();
  }catch(e){ o.err6 = String(e && e.stack || e); }

  /* ── إعادة الحال ── */
  try{ closeExportPreview(); }catch(_){} try{ closeModalById('tripShareBackdrop'); closeModalById('myTripsBackdrop'); }catch(_){}
  try{ await mpTrack._flush(true); }catch(_){}
  userListData.customCities = keep.cc; cityListCityId = keep.c; cityListCountry = keep.k; myCityListData = keep.d; myCityListLoadedFor = keep.lf; userTrips = keep.trips; sharedTrips = keep.shared; curators = keep.curators; curPage = keep.curPage; currentTripId = keep.tid; viewingSharedTrip = keep.vs; addrCurrentCity = keep.ac; addrModalCity = keep.am; curChip = null; curCity = null; curSearchQ = ''; curCitiesOpen = false; plEdit = null; plSessionCity = keep.ps; userListData.cityPlaceCounts = keep.cpc; if (keep.acs) addrCities = keep.acs; addrCurrentCountry = keep.acn; try{ Object.keys(addrData).forEach(function(k){ if (keep.ad.indexOf(k) < 0) delete addrData[k]; }); }catch(_){}
  try{ delete __pk.addrModalCity; delete __pk.tbCity; }catch(_){}
  try{ switchTab(keep.tab || 'Places'); }catch(_){}
  mpSendText = send0; exportCardHtml = ech0; showToast = st0; window.__mpSheetAuto = a0;
  return JSON.stringify(o);
})()
