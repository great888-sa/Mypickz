/* =========================================================
   0.7) mpTrack — وحدة القياس الميداني (أ-٣ الطبقة ٣-أ · A3-L3-r1)
   تجميع بالذاكرة ← دفعة واحدة كل ٦٠ث + عند الإخفاء/pagehide.
   القيود من قواعد v3.3.1 حرفيًا: زيادة ١..٥٠ لكل حقل (seconds ≤٧٢٠٠)،
   معرّفات lowercase، المدينة الحقيقية تُتحقق محليًا وإلا 'all'.
   الميزانية: تباطؤ بعد ١٥ كتابة · مقعد محجوز لإغلاق الجلسة · سقف صلب ٣٠.
   كل فشل صامت دائمًا ولا يُسجَّل بمصيدة الأخطاء (منع التضخيم الذاتي).
   ========================================================= */
const mpTrack = (function(){
  const FLUSH_MS = 60000, SLOW_AFTER = 15, HARD_CAP = 30, ERR_CAP = 20;
  const buf = new Map();
  let writesUsed = 0, errUsed = 0, slowFactor = 1, timer = null, busy = false;
  let sessStart = Date.now(), sessDepth = 0, closed = false;
  let diag = null; /* يُسند بنسخة الاختبار فقط (أسفل الملف) */
  const dayStr = function(){ const d = new Date(), p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()); };
  const cityOkId = function(){ /* v3.13 (ر٧٣-ب): المدينة الحقيقية = معرّف المعجم أو الجزيرة من «مدني» (المدينة المفتوحة بالأماكن) — غيرها 'all' */
    const id = String(typeof cityListCityId !== 'undefined' && cityListCityId ? cityListCityId : '');
    if (!/^(\d{3,9}|i_[a-z0-9_]{2,30})$/.test(id)) return 'all';
    const mine = (typeof allCities === 'function') ? allCities() : [];
    return mine.some(function(c){ return c && c.id === id; }) ? id : 'all'; };
  const catSlug = function(s){ if (/^tk:/i.test(String(s || ''))) return 'all'; /* r115 (مراجعة مستقلة): تصنيف قائمة مستورَدة معرّفه «tk:اسم قائمة المستخدم في Google» — اسم خاص لا يدخل معرّف مستند القياس */ const v = String(s || 'all').toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40); return v || 'all'; };
  function add(path, field, n){
    try{
      let f = buf.get(path); if (!f){ f = {}; buf.set(path, f); }
      f[field] = (f[field] || 0) + (n || 1);
      schedule();
    }catch(_){}
  }
  /* r115-د (١): حدث بعدد (استيراد N مكانًا). القاعدة تقبل ≤ ٥٠ للمفتاح في الكتابة الواحدة، و flush يرسل الباقي في الدورات التالية؛
     ما لم يُرسل قبل إغلاق الصفحة يبقى على الجهاز (mp_track_carry) ويُضاف عند الإقلاع التالي — فيُحسب في يوم إرساله. */
  /* r116-ح (دَين carry-tabs — المراجعة المستقلة): المحمول كان كائنًا واحدًا لكل التبويبات — تبويب ثانٍ يُفتح وفي الأول باقٍ لم يُرسل يتبنّاه ويعدّه مرة أخرى، وكل حفظ يكتب فوق حفظ الآخر.
     الآن حصّة لكل تبويب بمعرّفه: { <تبويب>: { مفتاح: عدد, t: آخر لمسة } } — الحفظ قراءة ثم تعديل حصّتي وحدها، والتبنّي عند الإقلاع لحصص توقّفت لمستها (تبويب أُغلق) لا لحصّة تبويب حيّ ما زال يرسلها. الصيغة القديمة (مفتاح ← عدد) تُتبنّى مرة. */
  const CARRY_KEY = 'mp_track_carry'; let carry = {}; const CARRY_SID = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); const CARRY_STALE_MS = 10 * 60 * 1000; /* حصّة لم تُلمس منذ عشر دقائق = تبويبها لم يعد يرسل (التبويب الحيّ يلمسها مع كل دورة إرسال) */
  const carryPath = function(){ return 'analytics/events_' + dayStr() + '__all__all'; };
  function carryRead(){ try{ const o = JSON.parse(localStorage.getItem(CARRY_KEY) || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }catch(_){ return {}; } }
  function carryWrite(all){ try{ if (Object.keys(all).length) localStorage.setItem(CARRY_KEY, JSON.stringify(all)); else localStorage.removeItem(CARRY_KEY); }catch(_){} }
  function carrySave(){ const all = carryRead(); const mine = {}; Object.keys(carry).forEach(function(k){ if (carry[k] > 0) mine[k] = carry[k]; }); if (Object.keys(mine).length){ mine.t = Date.now(); all[CARRY_SID] = mine; carrySeen = true; } else { delete all[CARRY_SID]; carrySeen = false; } carryWrite(all); }
  function carryBeat(){ /* r116 (المراجعة المستقلة ٤): تبويب حيّ قد لا يرسل عشر دقائق (الإرسال يتباعد مع كثرة الكتابات، والمخفيّ يُبطَّأ) فتبدو حصّته متروكة فيتبنّاها تبويب آخر ثم يرسلها هو أيضًا. نبضة كل دقيقتين تلمس حصّة غير فارغة؛ وإن وُجدت حصّتي قد زالت من الجهاز (تبنّاها غيري وأنا مجمَّد) أُسقط ما في طابوري منها ولا أرسله. */
    try{ const has = Object.keys(carry).some(function(k){ return carry[k] > 0; }); if (!has) return 'empty'; const all = carryRead(); if (carrySeen && !all[CARRY_SID]){ buf.forEach(function(f, path){ if (!/\/events_[^/]*__all__all$/.test(path)) return; Object.keys(carry).forEach(function(k){ if (f[k] > 0){ f[k] = Math.max(0, f[k] - carry[k]); if (!f[k]) delete f[k]; } }); if (!Object.keys(f).length) buf.delete(path); }); carry = {}; carrySeen = false; return 'dropped'; } carrySave(); return 'beat'; }catch(_){ return 'err'; } }
  let carrySeen = false; /* حصّتي كُتبت على الجهاز مرة على الأقل — غيابها بعد ذلك يعني أن تبويبًا آخر تبنّاها */
  try{ setInterval(carryBeat, 120000); }catch(_){}
  function carryLoad(){ /* عند الإقلاع: ما تركه تبويب أُغلق يدخل طابوري وحصّتي مرة واحدة (حصّته تُمحى في الكتابة نفسها) — نداء ثانٍ لا يجد ما يتبنّاه */
    try{ const all = carryRead(); const take = {}; let changed = false;
      Object.keys(all).forEach(function(id){ if (id === CARRY_SID) return; const b = all[id];
        if (typeof b === 'number'){ if (CARRY_OK[id] && b > 0) take[id] = (take[id] || 0) + Math.round(b); delete all[id]; changed = true; return; } /* الصيغة القديمة — والمفتاح الغريب يُمحى */
        if (!b || typeof b !== 'object'){ delete all[id]; changed = true; return; }
        if (Date.now() - (+b.t || 0) < CARRY_STALE_MS) return; /* تبويب حيّ: حصّته له */
        Object.keys(b).forEach(function(k){ if (k !== 't' && CARRY_OK[k] && b[k] > 0) take[k] = (take[k] || 0) + Math.round(b[k]); }); delete all[id]; changed = true; });
      if (!changed) return; carryWrite(all); Object.keys(take).forEach(function(k){ carry[k] = (carry[k] || 0) + take[k]; add(carryPath(), k, take[k]); }); carrySave();
    }catch(_){} }
  function carryDrop(path){ /* مستند المحمول رفضته القواعد: لا يبقى على الجهاز ليعود مع كل إقلاع */ if (!/\/events_[^/]*__all__all$/.test(path)) return; for (const k in carry) delete carry[k]; carrySave(); }
  function carrySent(path, portions){ /* ما كُتب فعلًا يُطرح من المحمول */ if (!/\/events_[^/]*__all__all$/.test(path)) return; let ch = false; for (const k in portions){ if (carry[k] > 0){ carry[k] = Math.max(0, carry[k] - portions[k]); ch = true; } } if (ch) carrySave(); }
  const CARRY_OK = { import_place: 1, import_suggest_kept: 1, import_suggest_changed: 1 }; /* r115 (مراجعة مستقلة): ما يُحمل على الجهاز مفاتيح معلومة تقبلها القواعد — مفتاح غريب في ذاكرة الجهاز كان يدخل الطابور ويُرفض ويعود مع كل إقلاع */
  function count(event, n){ try{ n = Math.max(0, Math.round(+n || 0)); if (!n || !CARRY_OK[event]) return; carry[event] = (carry[event] || 0) + n; carrySave(); add(carryPath(), event, n); }catch(_){} }
  /* r117-أ (ق١١-١١-١٥ · قواعد v3.16): عدّاد «saved by» مربوط بسجل الحافظ — يُعدّ الشخص مرة لكل مكان مهما تعدّدت القوائم التي حفظه منها (كان: مرة لكل مصدر، وبكتابة حرّة تُزوَّر).
     savedBy ⇒ { id: معرّف العدّاد, counted: هل عُدّ الآن } — أو null إن تعذّر (بلا رابط · بلا مستخدم · فشل الكتابة). النسخة تحمل id علامةً (source.cnt) فيُعرف عدّادها عند حذفها ولو تغيّر رابطها.
     savedByDrop ⇒ true إن نقص العدّاد وحُذف السجل · false: لا سجل لي أو لا عدّاد يُنقص · null: خطأ عابر (المستدعي يعيد المحاولة لاحقًا). savedByBack ⇒ نسخة عادت إلى قائمتي بعلامتها (تراجع): تُعدّ من جديد إن لم يكن سجلي قائمًا.
     المدينة (cityId) تُحمل عند إنشاء العدّاد فقط — للرائج في المدينة (r116-أ). */
  function savedBy(uid, url, name, cityId){ const u = String(url || '').slice(0, 400), nm = String(name || 'Place').slice(0, 120); if (!uid || !url) return Promise.resolve(null);
    return sha16(String(url)).then(function(hex){ if (!hex) return null; return mpData.placeCounts.bind(uid, hex, nm, u, cityId).then(function(counted){ if (counted){ try{ if (typeof popularBump === 'function') popularBump(u, 1, cityId, nm); }catch(_){} } return { id: hex, counted: !!counted }; }); }).catch(function(){ return null; }); }
  function savedByDrop(uid, id, url, name, cityId){ if (!uid || !/^[a-f0-9]{16}$/.test(String(id || ''))) return Promise.resolve(false);
    return mpData.placeCounts.unbind(uid, String(id)).then(function(done){ if (done){ try{ if (typeof popularBump === 'function') popularBump(String(url || '').slice(0, 400), -1, cityId, String(name || 'Place').slice(0, 120)); }catch(_){} } return !!done; }).catch(function(){ return null; }); }
  function savedByBack(uid, id, url, name, cityId){ const u = String(url || '').slice(0, 400), nm = String(name || 'Place').slice(0, 120); if (!uid || !u || !/^[a-f0-9]{16}$/.test(String(id || ''))) return Promise.resolve(false);
    return mpData.placeCounts.has(uid, String(id)).then(function(mine){ if (mine) return false; return mpData.placeCounts.bind(uid, String(id), nm, u, cityId).then(function(counted){ if (counted){ try{ if (typeof popularBump === 'function') popularBump(u, 1, cityId, nm); }catch(_){} } return !!counted; }); }).catch(function(){ return false; }); }
  function portionsOf(fields){ /* ما يُرسل من مستند في كتابة واحدة: ≤ ٥٠ للمفتاح (٧٢٠٠ للثواني) و≤ ٦ مفاتيح — r115-ب: القاعدة تقبل تحديث ٦ مفاتيح على الأكثر، والسابع كان يُسقط الدفعة كلها صامتًا؛ الباقي للدورة التالية */
    const out = {}; let nk = 0; for (const k in fields){ if (nk >= 6) break; const portion = Math.min(fields[k], (k === 'seconds') ? 7200 : 50); if (portion >= 1){ out[k] = portion; nk++; } } return out; }
  function schedule(){
    if (timer) return;
    timer = setTimeout(function(){ timer = null; flush(false); }, FLUSH_MS * slowFactor);
  }
  async function flush(isFinal){
    if (busy) return; busy = true; carryBeat(); /* r116: قبل كل إرسال — حصّة تبنّاها تبويب آخر لا تُرسل من هنا */
    try{
      if (db && buf.size > 0){
        const maxAllowed = isFinal ? HARD_CAP : (HARD_CAP - 1); /* مقعد محجوز */
        let room = maxAllowed - writesUsed;
        if (room > 0){
          const __entries = []; const written = [];
          for (const entry of buf){
            if (room <= 0) break;
            const path = entry[0], fields = entry[1];
            const portions = portionsOf(fields), inc = {}; let any = false;
            for (const k in portions){ inc[k] = firebase.firestore.FieldValue.increment(portions[k]); any = true; }
            if (!any){ buf.delete(path); continue; }
            const seg = path.split('/');
            __entries.push([path, inc]);
            written.push([path, portions]); room--;
          }
          if (written.length > 0){
            let okW = written;
            try{ await mpData.analytics.batchInc(__entries); writesUsed += written.length; }
            catch(e){ /* r115 (مراجعة مستقلة): الدفعة ذرّية — مستند واحد ترفضه القواعد كان يُسقطها كلها في كل دورة فيقف القياس لبقية الجلسة. عند رفض الصلاحية يُكتب كلٌّ وحده: المرفوض يُحذف من الطابور، وغيره يُكتب. وأي خطأ آخر (انقطاع) يبقى كما كان: يُعاد لاحقًا */
              if (!(e && e.code === 'permission-denied')) throw e;
              okW = [];
              for (let i = 0; i < __entries.length; i++){ writesUsed++; try{ if (__entries.length === 1) throw e; await mpData.analytics.batchInc([__entries[i]]); okW.push(written[i]); }catch(e2){ if (e2 && e2.code === 'permission-denied'){ buf.delete(written[i][0]); carryDrop(written[i][0]); } } }
            }
            for (const w of okW){
              const f = buf.get(w[0]); if (!f) continue;
              for (const k in w[1]){ f[k] -= w[1][k]; if (f[k] <= 0) delete f[k]; }
              carrySent(w[0], w[1]);
              if (Object.keys(f).length === 0) buf.delete(w[0]);
            }
            if (writesUsed >= SLOW_AFTER && slowFactor < 32) slowFactor *= 2; /* تباطؤ تدريجي */
            if (diag) diag('[MP] flushed ' + written.length + ' doc(s) — session total ' + writesUsed + (slowFactor > 1 ? ' (slow x' + slowFactor + ')' : ''));
          }
        }
      }
    }catch(_){ /* صامت دائمًا */ }
    busy = false;
    if (buf.size > 0) schedule();
  }
  function hit(event, opts){
    try{
      opts = opts || {};
      const personal = !!opts.personal;
      const city = personal ? 'all' : ((opts.city && /^(\d{3,9}|i_[a-z0-9_]{2,30})$/.test(String(opts.city))) ? String(opts.city) : cityOkId()); /* v3.13: المدينة بالنمط وإلا all */
      const cat = personal ? 'all' : catSlug(opts.cat);
      add('analytics/events_' + dayStr() + '__' + city + '__' + cat, event, 1);
      if (!personal){
        add('analytics/hours_' + dayStr() + '__' + city, 'h' + String(new Date().getHours()).padStart(2,'0'), 1);
        if (opts.depth) sessDepth++;
      }
    }catch(_){}
  }
  function statsCurator(uid, field){ // r72p (M4.25 ٩): إحصاء المنتقي — page_view · follow · contact_click · ref_social · ref_card · export · save (v3.14 · ب-٢-١: الحفظ بإسناد لمنتقٍ، يوميًّا)
    try{ if (!uid || !/^[A-Za-z0-9]{20,40}$/.test(uid)) return; const day = new Date().toISOString().slice(0, 10);
      if (field === 'page_view'){ const k = 'mp_cv_' + uid + '_' + day; try{ if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); }catch(_){} } // مرة لكل زائر يوميًّا
      add('stats_curators/' + uid + '__' + day, field, 1);
      if (field === 'page_view'){ const ref = (new URLSearchParams(location.search).get('ref') || '').toLowerCase(); if (/^(ig|tt|sc)$/.test(ref)) add('stats_curators/' + uid + '__' + day, 'ref_social', 1); else if (/^(card|qr|link)$/.test(ref)) add('stats_curators/' + uid + '__' + day, 'ref_card', 1); }
    }catch(_){}
  }
  function statsCard(uid, cardId){ /* r116-هـ (دَين stats_cards: قاعدة بلا كاتب): وصول برمز بطاقة المشاركة — المستند «صاحب البطاقة__البطاقة» والمفتاح view_total؛ مرة للجهاز في اليوم لكل بطاقة. القاعدة تقبل الكتابة بلا توقيع (الماسح زائر غالبًا). */
    try{ if (!/^[A-Za-z0-9]{20,40}$/.test(String(uid)) || !/^[A-Za-z0-9_-]{4,40}$/.test(String(cardId))) return false; const k = 'mp_cardv_' + uid + '_' + cardId, day = dayStr(); try{ if (localStorage.getItem(k) === day) return false; localStorage.setItem(k, day); }catch(_){} add('stats_cards/' + uid + '__' + cardId, 'view_total', 1); return true; }catch(_){ return false; }
  }
  function statsCity(cityId, field){ // r72m (M4.25 ١١): مدينة × يوم — open · place_added · trip_built (مدن الدليل فقط: معرّف صغير بلا mylist_)
    try{ if (!cityId || /^mylist_/.test(cityId) || !/^[a-z0-9_-]{1,40}$/.test(cityId)) return; const day = new Date().toISOString().slice(0, 10); add('stats_cities/' + cityId + '__' + day, field, 1); }catch(_){}
  }
  function statsList(listId, field, opts){
    try{
      if (!/^[A-Za-z0-9_-]{1,60}$/.test(String(listId))) return;
      add('stats_lists/' + listId, field, 1); // r72m (M4.25 ٩): مفاتيح §١٧-ج — open_app · open_community · open_curator · copy_from (لا open_total)
      if (opts && opts.daily) add('stats_lists/' + listId + '__' + new Date().toISOString().slice(0, 10), field, 1); // ب-٢-١: نسخة يومية للمفتاح (المعرّف اليومي مسموح بالقواعد منذ v3.3) — نمو الحفظ بالقائمة لـMy stats
    }catch(_){}
  }
  function statsTrip(tripId, field){
    try{
      if (!/^[A-Za-z0-9_-]{1,60}$/.test(String(tripId))) return;
      add('stats_trips/' + tripId, field, 1); // r72m (M4.25 ٩): view_total فقط
    }catch(_){}
  }
  const shaCache = {};
  async function sha16(url){
    try{
      if (shaCache[url]) return shaCache[url];
      const bytes = new TextEncoder().encode(String(url));
      const h = await crypto.subtle.digest('SHA-256', bytes);
      const hex = Array.from(new Uint8Array(h)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('').slice(0,16);
      shaCache[url] = hex; return hex;
    }catch(_){ return null; }
  }

  async function statsPlaceList(listId, url, field){
    try{
      if (!/^[A-Za-z0-9_-]{1,60}$/.test(String(listId))) return;
      const hex = await sha16(url); if (!hex) return;
      const id = listId + '__' + hex;
      add('stats_places/' + id, (field === 'trip_add') ? 'trip_add' : 'open_total', 1); // r72m (M4.25 ٩)
    }catch(_){}
  }
  function trapError(kind){
    try{
      if (errUsed >= ERR_CAP) return; errUsed++;
      const p = 'analytics/errors_' + dayStr();
      add(p, kind, 1); add(p, 'total', 1);
    }catch(_){}
  }
  function classify(msg, error){
    const name = (error && error.name) || '';
    const m = String(msg || '');
    if (name === 'TypeError' || /TypeError/.test(m)) return 'TypeError';
    if (name === 'ReferenceError' || /ReferenceError/.test(m)) return 'ReferenceError';
    if (name === 'SyntaxError' || /SyntaxError/.test(m)) return 'SyntaxError';
    if (/network|fetch|Failed to load|ERR_/i.test(m)) return 'NetworkError';
    return 'Other';
  }
  function captureSource(){
    try{
      const q = new URLSearchParams(location.search);
      const srcParam = (q.get('src') || '').toLowerCase();
      const refParam = (q.get('ref') || '').toLowerCase();
      const SRC = { app:'src_app', ulist:'src_ulist', trip:'src_trip', community:'src_community', curator:'src_curator' };
      const REF = { ig:'ref_ig', tt:'ref_tt', sc:'ref_sc', card:'ref_card', qr:'ref_qr', link:'ref_link' };
      const p = 'analytics/sources_' + dayStr() + '__' + cityOkId();
      if (SRC[srcParam]) add(p, SRC[srcParam], 1);
      if (REF[refParam]) add(p, REF[refParam], 1);
      else if (!SRC[srcParam]) add(p, 'ref_direct', 1);
      hit('visit_source');
    }catch(_){}
  }
  function closeSession(){
    try{
      if (closed) return;
      const secs = Math.min(7200, Math.max(1, Math.round((Date.now() - sessStart) / 1000)));
      const p = 'analytics/sessions_' + dayStr() + '__' + cityOkId();
      add(p, 'count', 1); add(p, 'seconds', secs);
      if (sessDepth > 0) add(p, 'depth', Math.min(50, sessDepth));
      closed = true;
      flush(true);
    }catch(_){}
  }
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') closeSession();
    else { closed = false; sessStart = Date.now(); sessDepth = 0; }
  });
  window.addEventListener('pagehide', closeSession);
  window.addEventListener('unhandledrejection', function(){ trapError('UnhandledRejection'); });
  document.addEventListener('click', function(ev){
    try{
      const a = ev.target && ev.target.closest ? ev.target.closest('a[data-mpsrc]') : null; /* r115 (مراجعة مستقلة): الصنف place-link لا يحمله في الواجهة إلا رابط اسم المستخدم (ownerLink) — كان ضغط اسم مستخدم يُعدّ «فتح مكان». بلاطة الخريطة وحدها فتح مكان */ /* r115-د (٤): بلاطة الخريطة هي فتح المكان — كان الالتقاط ينتظر صنفًا لا تحمله أي بلاطة، فبقي بُعد التصنيف فارغًا */
      if (!a) return;
      const d = a.dataset || {};
      if (d.mppersonal === '1'){ hit('personal_place_open', { personal: true }); return; }
      hit('place_open', { cat: d.mpcat, city: d.mpcity });
      if (d.mplist) statsPlaceList(d.mplist, a.getAttribute('href') || '', 'open_total'); /* r115-د (٣): فتح مكان من قائمة غيرك — المكان × القائمة التي فُتح منها */
    }catch(_){}
  }, true);
  return {
    hit: hit, count: count, savedBy: savedBy, savedByDrop: savedByDrop, savedByBack: savedByBack, sha16: sha16, /* r116-د: قارئ stats_places يحسب معرّف المكان بالدالة نفسها التي يكتب بها الكاتب */ carryLoad: carryLoad, statsList: statsList, statsTrip: statsTrip, statsPlaceList: statsPlaceList, statsCity: statsCity, statsCard: statsCard, statsCurator: statsCurator,
    trapError: trapError, classify: classify, captureSource: captureSource, closeSession: closeSession,
    set _diag(fn){ diag = fn; },
    get _buf(){ const o = {}; buf.forEach(function(f, path){ o[path] = Object.assign({}, f); }); return o; }, /* r115: لقطة قراءة لما ينتظر الإرسال — للتشخيص والمحطات */
    _sent: carrySent, _beat: carryBeat, _portions: portionsOf, _flush: function(fresh){ if (fresh){ writesUsed = 0; slowFactor = 1; } return flush(true); }, /* للمحطات: إرسال فوري (وبميزانية جلسة جديدة) */
    get _stats(){ return { writesUsed: writesUsed, errUsed: errUsed, buffered: buf.size, slowFactor: slowFactor, carry: Object.assign({}, carry), carrySid: CARRY_SID }; }
  };
})();

