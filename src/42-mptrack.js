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
    const id = String(typeof myListCityId !== 'undefined' && myListCityId ? myListCityId : '');
    if (!/^(\d{3,9}|i_[a-z0-9_]{2,30})$/.test(id)) return 'all';
    const mine = (typeof allCities === 'function') ? allCities() : [];
    return mine.some(function(c){ return c && c.id === id; }) ? id : 'all'; };
  const catSlug = function(s){ const v = String(s || 'all').toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40); return v || 'all'; };
  function add(path, field, n){
    try{
      let f = buf.get(path); if (!f){ f = {}; buf.set(path, f); }
      f[field] = (f[field] || 0) + (n || 1);
      schedule();
    }catch(_){}
  }
  function schedule(){
    if (timer) return;
    timer = setTimeout(function(){ timer = null; flush(false); }, FLUSH_MS * slowFactor);
  }
  async function flush(isFinal){
    if (busy) return; busy = true;
    try{
      if (db && buf.size > 0){
        const maxAllowed = isFinal ? HARD_CAP : (HARD_CAP - 1); /* مقعد محجوز */
        let room = maxAllowed - writesUsed;
        if (room > 0){
          const __entries = []; const written = [];
          for (const entry of buf){
            if (room <= 0) break;
            const path = entry[0], fields = entry[1];
            const portions = {}, inc = {}; let any = false;
            for (const k in fields){
              const cap = (k === 'seconds') ? 7200 : 50;
              const portion = Math.min(fields[k], cap);
              if (portion >= 1){ portions[k] = portion; inc[k] = firebase.firestore.FieldValue.increment(portion); any = true; }
            }
            if (!any){ buf.delete(path); continue; }
            const seg = path.split('/');
            __entries.push([path, inc]);
            written.push([path, portions]); room--;
          }
          if (written.length > 0){
            await mpData.analytics.batchInc(__entries);
            writesUsed += written.length;
            for (const w of written){
              const f = buf.get(w[0]); if (!f) continue;
              for (const k in w[1]){ f[k] -= w[1][k]; if (f[k] <= 0) delete f[k]; }
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
  function statsCurator(uid, field){ // r72p (M4.25 ٩): إحصاء المنتقي — page_view · follow · contact_click · ref_social · ref_card · export
    try{ if (!uid || !/^[A-Za-z0-9]{20,40}$/.test(uid)) return; const day = new Date().toISOString().slice(0, 10);
      if (field === 'page_view'){ const k = 'mp_cv_' + uid + '_' + day; try{ if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); }catch(_){} } // مرة لكل زائر يوميًّا
      add('stats_curators/' + uid + '__' + day, field, 1);
      if (field === 'page_view'){ const ref = (new URLSearchParams(location.search).get('ref') || '').toLowerCase(); if (/^(ig|tt|sc)$/.test(ref)) add('stats_curators/' + uid + '__' + day, 'ref_social', 1); else if (/^(card|qr|link)$/.test(ref)) add('stats_curators/' + uid + '__' + day, 'ref_card', 1); }
    }catch(_){}
  }
  function statsCity(cityId, field){ // r72m (M4.25 ١١): مدينة × يوم — open · place_added · trip_built (مدن الدليل فقط: معرّف صغير بلا mylist_)
    try{ if (!cityId || /^mylist_/.test(cityId) || !/^[a-z0-9_-]{1,40}$/.test(cityId)) return; const day = new Date().toISOString().slice(0, 10); add('stats_cities/' + cityId + '__' + day, field, 1); }catch(_){}
  }
  function statsList(listId, field){
    try{
      if (!/^[A-Za-z0-9_-]{1,60}$/.test(String(listId))) return;
      add('stats_lists/' + listId, field, 1); // r72m (M4.25 ٩): مفاتيح §١٧-ج — open_app · open_community · open_curator · copy_from (لا open_total)
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
      const a = ev.target && ev.target.closest ? ev.target.closest('a.place-link') : null;
      if (!a) return;
      const d = a.dataset || {};
      if (d.mppersonal === '1'){ hit('personal_place_open', { personal: true }); return; }
      hit('place_open', { cat: d.mpcat, city: d.mpcity });
    }catch(_){}
  }, true);
  return {
    hit: hit, statsList: statsList, statsTrip: statsTrip, statsPlaceList: statsPlaceList, statsCity: statsCity, statsCurator: statsCurator,
    trapError: trapError, classify: classify, captureSource: captureSource, closeSession: closeSession,
    set _diag(fn){ diag = fn; },
    get _stats(){ return { writesUsed: writesUsed, errUsed: errUsed, buffered: buf.size, slowFactor: slowFactor }; }
  };
})();

