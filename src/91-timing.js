/* =========================================================
   0.6) أداة قياس توقيت مؤقتة — تعرض كم استغرقت كل خطوة رئيسية من بداية التحميل
   ========================================================= */
const __timingStart = performance.now();
let __timingBox = null;
let __lastLabel = '', __lastLabelT = 0, __lastFsText = ''; /* هـ-٨: آخر علامة وآخر سطر [FS] — لأثر التجمّد */
function logTiming(label){
  const elapsed = ((performance.now() - __timingStart) / 1000).toFixed(2); __lastLabel = String(label).slice(0, 120); __lastLabelT = +elapsed;
  console.log(`[TIMING] ${label}: ${elapsed}s`);
  if (!__timingBox){
    __timingBox = document.createElement('div'); __timingBox.id = 'mpTimingBox'; /* ب-٢-٢-أ٢: الورقة السفلية تقيس هذا الشريط لتستقر فوقه */
    // خ١: اللوحة فوق الشريط الخمسي (٦٤) لا فوقه؛ وتُطوى بنقرة على شريطها إلى سطر واحد حتى يظهر ما تحتها
    __timingBox.style.cssText = 'position:fixed; bottom:58px; left:0; right:0; z-index:400; background:#2a3f4f; color:#9fe8a0; padding:6px 14px 8px; font-size:11px; font-family:monospace; text-align:left; max-height:30vh; overflow-y:auto; box-shadow:0 -4px 12px rgba(0,0,0,.3); transition:max-height .2s;';
    const bar = document.createElement('div');
    bar.textContent = '▼ TIMING — tap to collapse/expand';
    bar.style.cssText = 'cursor:pointer; font-weight:700; color:#fff; margin-bottom:4px; user-select:none;';
    bar.onclick = () => {
      const collapsed = __timingBox.getAttribute('data-collapsed') === '1';
      __timingBox.setAttribute('data-collapsed', collapsed ? '0' : '1');
      __timingBox.style.maxHeight = collapsed ? '30vh' : '26px';
      __timingBox.style.overflowY = collapsed ? 'auto' : 'hidden';
      bar.textContent = (collapsed ? '▼' : '▲') + ' TIMING — tap to collapse/expand';
    };
    __timingBox.appendChild(bar);
    const net = document.createElement('div'); __netLineEl = net; net.style.cssText = 'color:#ffd27a; font-weight:700; margin-bottom:4px; white-space:normal;'; net.textContent = 'NET: …'; __timingBox.appendChild(net); /* د-٦: سطر ملخص مثبَّت أعلى اللوحة — لا حاجة للتمرير */
    document.body.appendChild(__timingBox);
    document.body.style.paddingBottom = 'calc(30vh + 74px)'; // __timingBox: خلوص يمنع قص آخر عنصر — نسخة الاختبار وحدها
  }
  const line = document.createElement('div');
  line.textContent = `⏱ ${label}: ${elapsed}s`;
  __timingBox.appendChild(line);
  try{ __netNote(label, elapsed); }catch(_){}
}
// نسخة الاختبار فقط: ترفع الرسائل المنبثقة فوق لوحة التوقيت (كانت مغطاة بها كليًا ⇒ "لم تظهر رسالة" بكل الجولات السابقة)
document.addEventListener('DOMContentLoaded', () => { const t = document.getElementById('toast'); if (t){ t.style.zIndex = '99999'; t.style.bottom = 'calc(30vh + 76px)'; } });
window.__mpBuild = 'M2-ID-r119';
/* د-٦: ملخص الشبكة سطرًا واحدًا مثبَّتًا: شهادة App Check · أول قراءة · الدخول (وتكراره) · الأخطاء · آخر خطوة بطيئة */
let __netLineEl = null; const __net = { check: '', first: '', auth: [], errs: 0, slow: '', wait: '', blocked: '', imp: '', sort: '', save: '' };
/* هـ-٧: السطر الأصفر يحمل ساعته «t=52s» (تتقدم كل ثانية — إن توقفت فالخيط الرئيسي متجمد لا الشبكة) · «BLOCKED 3.2s ×1» حين يتأخر نبض الثانية (شفرة مشغولة) · نتيجة مسبارَي الشبكة حين ينتظر هدف ٨ ثوانٍ: نفس الأصل (manifest.json) وخادم Firestore بـREST (settings/app الذي تقرأه القواعد للجميع) */
function __netRender(){ const el = __netLineEl; if (!el) return; el.textContent = 'NET · t=' + Math.round((performance.now() - __timingStart) / 1000) + 's · AppCheck ' + (__net.check || '…') + ' · transport ' + (__net.transport || '?') + ' · keep-alive ' + (__net.keep || '…') + ' · first read ' + (__net.first || '…') + ' · auth @' + (__net.auth.join(', ') || '…') + (__net.imp ? ' · IMPORT ' + __net.imp : '') + (__net.sort ? ' · ' + __net.sort : '') + (__net.save ? ' · SAVE ' + __net.save : '') + (__net.errs ? ' · errors ' + __net.errs : '') + (mpQuotaHook.done ? ' · ' + mpQuotaLine() : '') + (__net.blocked ? ' · BLOCKED ' + __net.blocked : '') + (__net.wait ? ' · WAITING: ' + __net.wait : '') + (__net.slow ? ' · slow: ' + __net.slow : ''); }
function __netNote(label, elapsed){
  if (/^BUILD:/.test(label)) return; /* هـ-٦: سطر البناء يذكر «first Firestore read» في نصه فكان يلوّث الحقل حتى تأتي القراءة الحقيقية */
  if (/App Check token in/.test(label)) __net.check = label.replace(/.*token in /, '') ; else if (/App Check token FAILED/.test(label)) __net.check = 'FAILED'; else if (/App Check OFF/.test(label)) __net.check = 'OFF';
  else if (/first Firestore read/.test(label)) __net.first = label.replace(/.*in /, '');
  else if (/Firestore transport/.test(label)) __net.transport = label.replace(/^\[NET\] Firestore transport: /, ''); else if (/long polling not applied/.test(label)) __net.transport = 'FAILED · ' + label.replace(/^\[NET\] long polling not applied · /, ''); /* هـ-٦: فشل الإعداد يظهر في السطر الأصفر لا في سطر مدفون */
  else if (/keep-alive listener on/.test(label)) __net.keep = 'on'; else if (/keep-alive listener (error|not started)/.test(label)) __net.keep = 'FAILED';
  else if (/onAuthStateChanged/.test(label)) __net.auth.push(elapsed + 's' + (/signed-in/.test(label) ? ' signed-in' : (/guest/.test(label) ? ' guest' : ''))); /* غ-١ */
  else if (/^IMPORT · /.test(label)) __net.imp = label.replace(/^IMPORT · /, ''); else if (/^UNDO IMPORT · /.test(label)) __net.imp = 'undone · ' + label.replace(/^UNDO IMPORT · /, ''); /* r86 */ /* أ-١٣ (IM-R): الدليل لا الوعد — «2,615 rows · 0 external requests · 0 coordinates kept» */
  else if (/^(AUTOSORT|CONFIRM ALL STRONG|CONFIRM LIKELY|PIN AT GOOGLE SPOT|PIN REVIEW|PICK BY NAME|PICK SUGGESTED|PICK LOOK-ALIKES|REMOVED|RESTORE REMOVED|UNPINNED LIST|PASTE PIN|PLUS CODE PIN|AREAS|TO ADDRESSES|MERGE|SPLIT|MOVE PLACE|UNDO CITY|DUPLICATES|TOWN REMOVED|EMPTY CITY REMOVED|DAYPLAN → TRIP|UNDO DAYPLAN → TRIP) · /.test(label)) __net.sort = label; /* r85: الدليل لا الوعد — «AUTOSORT · paris · 61 scanned · 38 sorted · 0 coordinates from the file written» */
  else if (/^SAVE · /.test(label)) __net.save = label.replace(/^SAVE · /, ''); /* r87-3 (البند ٤): آخر حفظ — ok · FAILED · SKIPPED */
  else if (/^\[ERR\]|^\[SWALLOWED\]/.test(label)) __net.errs++;
  const m = /in (\d+)ms/.exec(label); if (m && +m[1] > 4000) __net.slow = label.replace(/^\[\w+\] /, '');
  __netRender();
}
function __mpFsDebug(fb){ try{ if (fb && fb.firestore && typeof fb.firestore.setLogLevel === 'function') fb.firestore.setLogLevel('debug'); }catch(_){} try{ mpQuotaHook(fb && fb.firestore); }catch(_){} }
/* ═══ r100-و (ق١١-٠٣-٠٩): عدّاد الحصة — قراءات/كتابات هذا الجهاز في يوم الحصة (منتصف الليل بتوقيت المحيط الهادئ = ١١:٠٠ الرياض شتاءً · ١٠:٠٠ صيفًا) مقابل Spark ٥٠k/٢٠k · يُحفظ في localStorage ويُعرض في سطر NET ═══ */
const MP_QUOTA = { reads: 50000, writes: 20000 };
function mpQuotaDayKey(){ try{ return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }catch(_){ return new Date().toISOString().slice(0, 10); } } /* تاريخ المحيط الهادئ = مفتاح يوم الحصة */
function mpQuotaResetLabel(){ let pdt = false; try{ pdt = /PDT/.test(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(new Date())); }catch(_){} return (pdt ? '10:00' : '11:00') + ' Riyadh'; }
const mpQuota = { day: '', reads: 0, writes: 0 }; window.__mpQuota = mpQuota;
function mpQuotaLoad(){ const day = mpQuotaDayKey(); try{ const j = JSON.parse(localStorage.getItem('mp_quota') || 'null'); if (j && j.day === day){ mpQuota.day = day; mpQuota.reads = j.reads || 0; mpQuota.writes = j.writes || 0; return; } }catch(_){} mpQuota.day = day; mpQuota.reads = 0; mpQuota.writes = 0; }
let __quotaSaveT = null; function mpQuotaSave(){ if (__quotaSaveT) return; __quotaSaveT = setTimeout(function(){ __quotaSaveT = null; try{ localStorage.setItem('mp_quota', JSON.stringify(mpQuota)); }catch(_){} }, 500); }
function mpQuotaAdd(kind, n){ if (mpQuota.day !== mpQuotaDayKey()) mpQuotaLoad(); mpQuota[kind] += (n > 0 ? n : 1); mpQuotaSave(); try{ __netRender(); }catch(_){} }
/* ملاحظة القياس: onSnapshot لا يُحتسب (مستمع الإعدادات الدائم) · كتابات الدفعة تُعدّ عند الاستدعاء لا عند commit · تبويبان مفتوحان يتبادلان الكتابة — العدّاد أرضية تقريبية لهذا الجهاز */
function mpQuotaLine(){ const pr = Math.round(100 * mpQuota.reads / MP_QUOTA.reads), pw = Math.round(100 * mpQuota.writes / MP_QUOTA.writes); return 'quota (this device) R ' + mpQuota.reads + '/' + MP_QUOTA.reads + ' (' + pr + '%) · W ' + mpQuota.writes + '/' + MP_QUOTA.writes + ' (' + pw + '%) · resets ' + mpQuotaResetLabel(); }
function mpQuotaHook(fs){ /* يلفّ get للمستند والاستعلام (القراءات = عدد المستندات العائدة، وأقلّه ١) وset/update/delete للمستند والدفعة (كتابة لكل عملية) — نسخة الاختبار فقط */
  if (!fs || mpQuotaHook.done) return false; mpQuotaHook.done = true; mpQuotaLoad();
  const wrapGet = function(proto, isQuery){ if (!proto || typeof proto.get !== 'function') return; const g = proto.get; proto.get = function(){ const p = g.apply(this, arguments); if (p && typeof p.then === 'function'){ p.then(function(s){ mpQuotaAdd('reads', isQuery && s && typeof s.size === 'number' ? Math.max(1, s.size) : 1); }, function(){}); } return p; }; }; /* القراءة المرفوضة لا تُحتسب (لا تُفوتَر) */
  const wrapWrite = function(proto){ if (!proto) return; ['set', 'update', 'delete'].forEach(function(m){ if (typeof proto[m] !== 'function') return; const f = proto[m]; proto[m] = function(){ mpQuotaAdd('writes', 1); return f.apply(this, arguments); }; }); };
  wrapGet(fs.DocumentReference && fs.DocumentReference.prototype, false); wrapGet(fs.Query && fs.Query.prototype, true); wrapWrite(fs.DocumentReference && fs.DocumentReference.prototype); wrapWrite(fs.WriteBatch && fs.WriteBatch.prototype); wrapWrite(fs.Transaction && fs.Transaction.prototype); wrapGet(fs.Transaction && fs.Transaction.prototype, false);
  return true; }
/* هـ-٢/هـ-٦: سجل Firestore الداخلي مضغوطًا وبأرقام الأهداف (الصيغة من مصدر المكتبة: addTarget{query|documents,targetId} · targetChange{targetChangeType,targetIds} · removeTarget):
   «+T48 doc userCityLists/…_paris» عند الإضافة · «CURRENT T48 · 3 docs · 0.3s» عند الجواب (أصفر إن تجاوز ٤ ثوانٍ) · «−T48» عند الإزالة · كشف الوسيط العازل (detected buffering proxy) · فتح القناة وإغلاقها وأخطاؤها · التراجع (Backing off) · «Backend didn't respond».
   هدف بلا جواب ٨ ثوانٍ يُكتب سطرًا ويُرفع إلى السطر الأصفر «WAITING: T46 query communityProfiles 8s» حتى يُجاب — فلا حاجة لتمرير ولا لتخمين أي قراءة توقفت */
const __fs = { n: 0, pend: {}, docs: {} };
function __fsLine(text, color){ __fs.n++; const line = document.createElement('div'); line.style.color = color || '#ffb4a2'; line.setAttribute('data-fs', '1'); line.textContent = '[FS ' + __fs.n + '] ' + text + ' @' + ((performance.now() - __timingStart) / 1000).toFixed(1) + 's'; __lastFsText = line.textContent.slice(0, 140); if (__timingBox && __netLineEl){ __netLineEl.insertAdjacentElement('afterend', line); const olds = __timingBox.querySelectorAll('[data-fs]'); if (olds.length > 12) olds[olds.length - 1].remove(); } }
function __fsDocLabel(path){ const parts = String(path).split('/'); const col = parts[0], id = parts.slice(1).join('/'); if (/^[A-Za-z0-9]{20,}$/.test(id)) return col + '/' + id.slice(0, 5) + '…'; const u = /^([A-Za-z0-9]{20,})_(.+)$/.exec(id); if (u) return col + '/…_' + u[2].slice(0, 20); return col + '/' + id.slice(0, 24); }
function __fsIds(t){ const m = /"targetIds":\[([\d,]*)\]/.exec(t); return m ? m[1].split(',').filter(Boolean) : []; }
function __fsWaitRender(){ const now = performance.now(); const w = Object.keys(__fs.pend).filter(function(id){ return now - __fs.pend[id].t > 8000; }).map(function(id){ return 'T' + id + ' ' + __fs.pend[id].what + ' ' + Math.round((now - __fs.pend[id].t) / 1000) + 's'; }); const s = w.join(' · '); if (s !== __net.wait){ __net.wait = s; __netRender(); } }
function __fsHandle(t){
  const now = performance.now(); let m;
  if (/stream 0x[0-9a-f]+ sending:/.test(t)){
    if ((m = /"addTarget":\{"(query|documents)"/.exec(t))){
      const id = (/"targetId":(\d+)/.exec(t) || [])[1] || '?'; let what;
      if (m[1] === 'query'){ what = 'query ' + ((/"collectionId":"([^"]+)"/.exec(t) || [])[1] || '?'); const f = /"fieldPath":"([^"]+)"/.exec(t); if (f) what += ' where ' + f[1]; }
      else { const p = /\/documents\/([^"]+)"/.exec(t); what = 'doc ' + (p ? __fsDocLabel(p[1]) : '?'); }
      __fs.pend[id] = { t: now, what: what, warned: false }; __fs.docs[id] = 0; __fsLine('+T' + id + ' ' + what + (/"resumeToken"/.test(t) ? ' (resume)' : '')); return true;
    }
    if ((m = /"removeTarget":(\d+)/.exec(t))){ delete __fs.pend[m[1]]; __fsWaitRender(); __fsLine('−T' + m[1], '#c9b8ff'); return true; }
    return false;
  }
  if (/stream 0x[0-9a-f]+ received:/.test(t)){
    if (/"documentChange"|"documentDelete"|"documentRemove"/.test(t)){ __fsIds(t).forEach(function(id){ __fs.docs[id] = (__fs.docs[id] || 0) + 1; }); return true; }
    if ((m = /"targetChangeType":"(\w+)"/.exec(t))){
      const ids = __fsIds(t);
      if (m[1] === 'CURRENT'){ ids.forEach(function(id){ const p = __fs.pend[id]; const dt = p ? (now - p.t) : -1; __fsLine('CURRENT T' + id + ' · ' + (__fs.docs[id] || 0) + ' docs · ' + (dt >= 0 ? (dt / 1000).toFixed(1) + 's' : 'already current'), dt > 4000 ? '#ffd27a' : '#9fe8a0'); delete __fs.pend[id]; }); __fsWaitRender(); return true; }
      if (m[1] === 'ADD' || m[1] === 'NO_CHANGE') return true;
      if (m[1] === 'REMOVE' && !/"cause"/.test(t)) return true; /* هـ-٧: إقرار الخادم بإزالة طلبناها — ضجيج؛ REMOVE بسبب (إذن · فهرس) يبقى */
      __fsLine(m[1] + ' T' + ids.join(',') + (/"cause"/.test(t) ? ' · ' + ((/"message":"([^"]*)"/.exec(t) || [])[1] || 'error') : ''), '#ff8a80'); ids.forEach(function(id){ delete __fs.pend[id]; }); __fsWaitRender(); return true;
    }
    if (/"filter"/.test(t)) return true;
  }
  return false;
}
(function(){ const orig = { log: console.log, warn: console.warn, error: console.error }; const KEY = /firestore/i, HIT = /(backoff|Backing off|Backend didn|closed|errored|error|unavailable|timed? ?out|reconnect|transport|Opening RPC|proxy|addTarget|"CURRENT"|removeTarget|Permission|PERMISSION|FAILED_PRECONDITION)/i, NOISE = /"ADD"|"NO_CHANGE"|Persistence|LocalStore|Simple|IndexedDb/;
  ['log', 'warn', 'error'].forEach(function(k){ console[k] = function(){ try{ const a = Array.prototype.slice.call(arguments); const t = a.map(function(x){ return typeof x === 'string' ? x : (x && x.message) || ''; }).join(' '); if (KEY.test(t) && !/\[TIMING\]/.test(t) && !__fsHandle(t) && HIT.test(t) && !NOISE.test(t)) __fsLine(t.replace(/^\[[^\]]*\]\s*/, '').replace(/@firebase\/firestore: Firestore \([\d.]+\): /, '').replace(/WebChannelConnection RPC '(\w+)' stream 0x[0-9a-f]+ /, '$1 ').slice(0, 170)); }catch(_){} return orig[k].apply(console, arguments); }; });
  setInterval(function(){ try{ const now = performance.now(); let fire = false; Object.keys(__fs.pend).forEach(function(id){ const p = __fs.pend[id]; if (!p.warned && now - p.t > 8000){ p.warned = true; fire = true; __fsLine('T' + id + ' ' + p.what + ' · no answer after 8s', '#ffd27a'); } }); __fsWaitRender(); }catch(_){} }, 2000);
  /* و-٤: قُلّمت أدوات التشخيص الظرفية (مسبار ما بعد الدخول هـ-٣ · مسبارا الشبكة وتتبّع XHR هـ-٧ · تغليف دوال المسار هـ-٩) بعد إغلاق السبب الجذري؛ يبقى الدائم: السطر الأصفر · الأسطر المضغوطة بأرقام الأهداف · كاشف الانتظار ٨ ث · نبض الثانية وأثر التجمّد في المواضع الثلاثة */
  /* هـ-٧: نبض الثانية — تأخره يعني أن الخيط الرئيسي كان مشغولًا بشفرة (لا بشبكة) طوال الفجوة */
  let __lastTick = performance.now(); let __blockedN = 0; let __hiddenSinceTick = document.hidden; let __labelAtTick = '';
  document.addEventListener('visibilitychange', function(){ try{ if (document.hidden) __hiddenSinceTick = true; __hbSave(!document.hidden ? false : true, document.hidden ? 'hidden' : ''); }catch(_){} }); /* هـ-٨: الخفاء يوقف المؤقتات على iOS — فجوته ليست تجمّدًا */
  /* هـ-٨: أثر التجمّد — كل ثانية تُحفظ الساعة وآخر علامة وآخر سطر [FS] في localStorage؛ pagehide والخفاء يعلّمان خروجًا نظيفًا. التحميل التالي يقرأ الأثر: إن لم يكن الخروج نظيفًا فالصفحة انتهت والخيط الرئيسي مشغول (تجمّد) — ويُكتب أين كان */
  /* هـ-٩: الأثر في ثلاثة مواضع — localStorage وsessionStorage وكعكة — لأن قتل عملية الصفحة على iOS أضاع التخزين المحلي (الدليل التعريفي عاد كأول زيارة) */
  function __hbSave(clean, why){ try{ const j = JSON.stringify({ t: +((performance.now() - __timingStart) / 1000).toFixed(1), label: __lastLabel, labelT: __lastLabelT, fs: __lastFsText, clean: !!clean, why: why || '', build: 'r82', at: Date.now() }); try{ localStorage.setItem('mp_hb', j); }catch(_){} try{ sessionStorage.setItem('mp_hb', j); }catch(_){} try{ document.cookie = 'mp_hb=' + encodeURIComponent(j) + '; path=/; max-age=86400; SameSite=Strict'; }catch(_){} }catch(_){} }
  window.addEventListener('pagehide', function(){ __hbSave(true, 'pagehide'); });
  setInterval(function(){ try{ const now = performance.now(); const gap = now - __lastTick - 1000; __lastTick = now; const hidden = __hiddenSinceTick; __hiddenSinceTick = document.hidden; if (gap > 1500 && !hidden){ __blockedN++; __net.blocked = (gap / 1000).toFixed(1) + 's ×' + __blockedN; __fsLine('main thread blocked ~' + (gap / 1000).toFixed(1) + 's (code, not network) · after "' + __labelAtTick + '"', '#ff8a80'); } __labelAtTick = __lastLabel; if (!document.hidden) __hbSave(false, ''); __netRender(); }catch(_){} }, 1000); })();
(function(){ try{ const found = []; const take = function(src, raw){ try{ if (raw){ const h = JSON.parse(raw); if (h && h.build){ h.src = src; found.push(h); } } }catch(_){} };
  try{ take('local', localStorage.getItem('mp_hb')); localStorage.removeItem('mp_hb'); }catch(_){}
  try{ take('session', sessionStorage.getItem('mp_hb')); sessionStorage.removeItem('mp_hb'); }catch(_){}
  try{ const m = /(?:^|;\s*)mp_hb=([^;]*)/.exec(document.cookie); if (m) take('cookie', decodeURIComponent(m[1])); document.cookie = 'mp_hb=; path=/; max-age=0; SameSite=Strict'; }catch(_){}
  if (!found.length) return; found.sort(function(a, b){ return (b.at || 0) - (a.at || 0); }); const h = found[0]; const srcs = found.map(function(x){ return x.src; }).join('+');
  setTimeout(function(){ if (h.clean === false) __fsLine('PREVIOUS PAGE ENDED WHILE JS WAS BUSY (frozen) · its clock stopped at t=' + h.t + 's · last marker "' + (h.label || '—') + '" @' + h.labelT + 's · last FS "' + (h.fs || '—') + '" · ' + Math.round((Date.now() - h.at) / 1000) + 's ago · trace kept in ' + srcs, '#ff8a80'); else __fsLine('previous page left cleanly (' + (h.why || '—') + ') · trace in ' + srcs, '#c9b8ff'); }, 0); }catch(_){} })();
/* د-٤: نسخة الاختبار تسجّل الأخطاء غير الملتقَطة في لوحة TIMING نفسها (الرسالة والسطر) — ليُقرأ السبب من الهاتف بلا وحدة تحكم */
window.addEventListener('error', function(e){ try{ logTiming('[ERR] ' + (e.message || 'error') + ' @' + (e.lineno || '?') + ':' + (e.colno || '?')); }catch(_){} });
window.addEventListener('unhandledrejection', function(e){ try{ const r = e.reason; logTiming('[ERR] rejection: ' + ((r && (r.code || r.message)) || String(r)).slice(0, 160)); }catch(_){} }); /* ب-٢-٢-أ٢: تذييل الدرج يعرض رقم البناء */
logTiming('BUILD: ' + window.__mpBuild + ' (r117 - saved by N is tied to the saver\'s own record (rules v3.16): a person counts once per place; a saved copy that leaves your list (deleted, moved to Addresses, removed with its town or city, or with the account) takes its count back; under rules v3.16 a counter moves only together with the saver\'s own record and that record only together with its counter; place links are accepted and opened only as http(s) links; four event keys nobody writes are gone from the rules; the Soon tag is off sharing from Google Maps on Android (still to be tried on a phone); every inline handler now has its named station. r116 - Popular in a city and saved by N on place cards (a place counter carries its city); Owner dashboard, My summary and list impact with bold numbers; Export opens with choose places; a footer QR on the share card opens the public list or trip in MyPickz and is counted; Symbols and Icons guide in English and Arabic; Open card from the map opens a folded category; counter cleanup by the owner; Android share target (untested on a phone). r115 - Help is five cards in the order of the bottom bar (Places, Trips, Curators, Community, Addresses), each with an action, an animated Show me walkthrough drawn from the real screens, and its topics folded by title, plus an Everywhere strip; the Help language is remembered on this device; a typed place in a day route now moves like any other (any day, No day yet, or as an alternative); the gate, imports, saved by and link sources are counted; every link the app shares is tagged with its source | r110 - one interface for both plan paths: the same + Add places chip and door in the same two spots, the same Pick places door in Setup, Add again on every stop row, and + Add places next to Edit opens the same picker; leg times start from an estimate (≈ est.) that your typed minutes replace; no automatic return - you choose the end point (+ End point: back to start, another point, or none); Save as draft keeps the editor open; names with an apostrophe show as typed | r108 - the trip editor is a session: nothing is written until Save as draft, Approve or Done; leaving with changes asks Discard your changes? and puts the plan back; an edit cut off by the app closing is offered back (Restore your unsaved edit?); one door to add (+ Add places) and a note says where each place landed; Setup is a step (Apply); one Edit on a saved trip; r109 - Community reads from one door: the market is read once and shared by everyone who asks, kept for ten minutes (the line says when, a refresh button reads it now), what is kept is checked with one read when you open it (hidden, unshared or suspended content is gone at once), a suspension hides every list, every sub-category under it and every trip; a dot on the public button when a list is not fully visible (tap retries the repair) and one VIS line in Diag for every visibility event; r107 - every plan step knows both day shapes: Setup and Done keeps a day trip\'s stops, a place added to a day trip becomes its last stop, a day plan copied into a longer trip keeps its day and its stop editor, Move sheet shows it as one cell; plan guard before every save (Kept as it was) and self-heal at load; one name resolver for Plus-code towns, address detection, the stop sheet and adding a city (New York = New York City, a far side-name is asked about and never trusted alone); a far pin is asked about before saving and City lists Far pins with Move near the city; r106 - day plan as one path with one difference: who orders the stops (MyPickz by periods, My order, Nearest first), Option 2 wording everywhere, From My places chip, the same kind line in both paths; r105 - viewers see each leg in the owner\'s mode and open the place card from a stop, Options row in Day route after saving, Start from lists Transportation and Stay first with unpinned places greyed, a place not in My places inside the city plan, Add again in both paths; r104 - public/shared mark stamped on every sub-category document when a list is published or shared, self-repair when the owner opens the list, honest viewer message when a list claims places but none can be read; r103 - day plans follow their city list (public/shared), viewer chips and read-only stops without start or times, never in trip feeds; r102 - short Plus code decoded around its town with a 40 km guard, Stay and Transportation pickable, stop name opens the place card with category and note and pins follow the list, saved day plans as chips; r101b - day trip: two doors to add stops, category and note on list places, save only after the first stop, plan-a-day line in Places; r101a - nearby cities in the places picker, 1 h 30 by car; r100f - quota counter in Diag, daily backup worker; r100e - every failure leaves a trace in Diag, sign-out rejection handled, a failed search is not reported as missing; r100d - plain-words failure messages: reads that failed say so and keep the screen, no raw error codes, quota message, bad Takeout file messages; r100c input guards; r100b one tap one change; r100a honest save)'); /* r93: السطر يُشتق من __mpBuild — كان نصًّا يدويًّا توقّف عند r88 (ملاحظة المالك ٢٩ أكتوبر ١٢:١٣) */
mpTrack._diag = logTiming; // نسخة الاختبار فقط — عدّاد p99 التشخيصي لكتابات الجلسة
logTiming('Script started (t=0 reference)');

