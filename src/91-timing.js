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
window.__mpBuild = 'M2-ID-r87-4c';
/* د-٦: ملخص الشبكة سطرًا واحدًا مثبَّتًا: شهادة App Check · أول قراءة · الدخول (وتكراره) · الأخطاء · آخر خطوة بطيئة */
let __netLineEl = null; const __net = { check: '', first: '', auth: [], errs: 0, slow: '', wait: '', blocked: '', imp: '', sort: '', save: '' };
/* هـ-٧: السطر الأصفر يحمل ساعته «t=52s» (تتقدم كل ثانية — إن توقفت فالخيط الرئيسي متجمد لا الشبكة) · «BLOCKED 3.2s ×1» حين يتأخر نبض الثانية (شفرة مشغولة) · نتيجة مسبارَي الشبكة حين ينتظر هدف ٨ ثوانٍ: نفس الأصل (manifest.json) وخادم Firestore بـREST (settings/app الذي تقرأه القواعد للجميع) */
function __netRender(){ const el = __netLineEl; if (!el) return; el.textContent = 'NET · t=' + Math.round((performance.now() - __timingStart) / 1000) + 's · AppCheck ' + (__net.check || '…') + ' · transport ' + (__net.transport || '?') + ' · keep-alive ' + (__net.keep || '…') + ' · first read ' + (__net.first || '…') + ' · auth @' + (__net.auth.join(', ') || '…') + (__net.imp ? ' · IMPORT ' + __net.imp : '') + (__net.sort ? ' · ' + __net.sort : '') + (__net.save ? ' · SAVE ' + __net.save : '') + (__net.errs ? ' · errors ' + __net.errs : '') + (__net.blocked ? ' · BLOCKED ' + __net.blocked : '') + (__net.wait ? ' · WAITING: ' + __net.wait : '') + (__net.slow ? ' · slow: ' + __net.slow : ''); }
function __netNote(label, elapsed){
  if (/^BUILD:/.test(label)) return; /* هـ-٦: سطر البناء يذكر «first Firestore read» في نصه فكان يلوّث الحقل حتى تأتي القراءة الحقيقية */
  if (/App Check token in/.test(label)) __net.check = label.replace(/.*token in /, '') ; else if (/App Check token FAILED/.test(label)) __net.check = 'FAILED'; else if (/App Check OFF/.test(label)) __net.check = 'OFF';
  else if (/first Firestore read/.test(label)) __net.first = label.replace(/.*in /, '');
  else if (/Firestore transport/.test(label)) __net.transport = label.replace(/^\[NET\] Firestore transport: /, ''); else if (/long polling not applied/.test(label)) __net.transport = 'FAILED · ' + label.replace(/^\[NET\] long polling not applied · /, ''); /* هـ-٦: فشل الإعداد يظهر في السطر الأصفر لا في سطر مدفون */
  else if (/keep-alive listener on/.test(label)) __net.keep = 'on'; else if (/keep-alive listener (error|not started)/.test(label)) __net.keep = 'FAILED';
  else if (/onAuthStateChanged/.test(label)) __net.auth.push(elapsed + 's' + (/signed-in/.test(label) ? ' signed-in' : (/guest/.test(label) ? ' guest' : ''))); /* غ-١ */
  else if (/^IMPORT · /.test(label)) __net.imp = label.replace(/^IMPORT · /, ''); else if (/^UNDO IMPORT · /.test(label)) __net.imp = 'undone · ' + label.replace(/^UNDO IMPORT · /, ''); /* r86 */ /* أ-١٣ (IM-R): الدليل لا الوعد — «2,615 rows · 0 external requests · 0 coordinates kept» */
  else if (/^(AUTOSORT|CONFIRM ALL STRONG|CONFIRM LIKELY|PIN AT GOOGLE SPOT|PIN REVIEW|PICK BY NAME|PICK SUGGESTED|PICK LOOK-ALIKES|REMOVED|RESTORE REMOVED|UNPINNED LIST|PASTE PIN|PLUS CODE PIN|AREAS) · /.test(label)) __net.sort = label; /* r85: الدليل لا الوعد — «AUTOSORT · paris · 61 scanned · 38 sorted · 0 coordinates from the file written» */
  else if (/^SAVE · /.test(label)) __net.save = label.replace(/^SAVE · /, ''); /* r87-3 (البند ٤): آخر حفظ — ok · FAILED · SKIPPED */
  else if (/^\[ERR\]|^\[SWALLOWED\]/.test(label)) __net.errs++;
  const m = /in (\d+)ms/.exec(label); if (m && +m[1] > 4000) __net.slow = label.replace(/^\[\w+\] /, '');
  __netRender();
}
function __mpFsDebug(fb){ try{ if (fb && fb.firestore && typeof fb.firestore.setLogLevel === 'function') fb.firestore.setLogLevel('debug'); }catch(_){} }
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
logTiming('BUILD: M2-ID-r87-4c (r87-4c - a municipality (localadmin) is not an area and is never written, counted as municipality only; the last Re-read result stays in Diag)');
mpTrack._diag = logTiming; // نسخة الاختبار فقط — عدّاد p99 التشخيصي لكتابات الجلسة
logTiming('Script started (t=0 reference)');

