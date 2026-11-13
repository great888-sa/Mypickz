/* =========================================================
   6) نافذة الإدخال العامة، QR، نسخ الرابط
   ========================================================= */

let modalResolve = null;
// وضع select اختياري: مرّر options (مصفوفة نصوص) لعرض قائمة منسدلة بدل حقل نص حر
function openInputModal(title, placeholder, initialValue, options, opts){
  return new Promise((resolve) => {
    modalResolve = resolve;
    inputModalFree = !!(opts && opts.allowFree); // ر٧٠د: قائمة اقتراح لا قيد (المعجم) — الحر مقبول
    inputModalMax = (opts && opts.maxLen) || 0; /* r100-ج */
    document.getElementById('inputModalTitle').textContent = title;
    const f = document.getElementById('inputModalField');
    const s = document.getElementById('inputModalSelect');
    document.getElementById('inputModalError').textContent = '';
    const l = document.getElementById('inputModalList');
    s.style.display = 'none';
    f.style.display = '';
    if (Array.isArray(options) && options.length){
      // v1.37 (قرار المالك ١ سبتمبر): قائمة مع حقل كتابة — الحروف الأولى تصفّي؛ لا قائمة منسدلة للنظام
      inputModalOptions = options.slice();
      inputModalTouched = false;
      f.placeholder = placeholder || 'Type to filter…'; f.value = initialValue || '';
      l.style.display = '';
      inputModalFilter();
      setTimeout(()=> f.focus(), 50);
    } else {
      inputModalOptions = null;
      l.style.display = 'none'; l.innerHTML = '';
      f.placeholder = placeholder || ''; f.value = initialValue || '';
      setTimeout(()=> f.focus(), 50);
    }
    document.getElementById('inputBackdrop').classList.add('show');
  });
}
// ر٧٠ب-٢ (ق٠٩-١٠-٠٢ الطبقة ١-ب): المعجم المرجعي المفتوح — ملف واحد `cities.json` مجمَّع برمز الدولة {CC:[{n, a?}]}
//   يُحمَّل مرة عند أول إضافة مدينة ثم يبقى بالذاكرة؛ فشل التحميل لا يمنع الإضافة الحرة (الطبقتان ٢ و٣ قائمتان).
// ر٧٠ج-٢: المعجم مقسَّم بالدولة — `cities/<CC>.json` (المواضع فوق ٥٠٠ نسمة أو المقرّات الإدارية ≈ ٢٣٦ ألفًا بـ٢٤٦ دولة؛ قرار المالك بعد غياب القرى)
//   يُحمَّل ملف الدولة وحده عند اختيارها بخطوة إضافة المدينة ويبقى بالذاكرة؛ فشل التحميل صامت ولا يمنع الإضافة الحرة.
const __gaz = {};
function gazLoad(cc){
  cc = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return Promise.resolve([]);
  if (__gaz[cc]) return __gaz[cc];
  __gaz[cc] = (typeof fetch === 'function' ? fetch('cities/' + cc + '.json', { cache: 'force-cache' }).then(r => r.ok ? r.json() : null) : Promise.resolve(null))
    .then(d => Array.isArray(d) ? d : [])
    .catch(() => []);
  return __gaz[cc];
}
async function gazCityOptions(countryName){
  const rows = await gazLoad(plCountryCode(countryName));
  return rows.map(c => ({ name: c.n, alt: [].concat(c.s || [], c.a || [], c.ar ? [c.ar] : []) })); /* r107-ج: الأسماء القوية تدخل البحث */
}
/* ═══ r107-ب (ق١١-١٠-٠٢ — عيّنة المالك: نيويورك تُثبَّت في كلينتون، ويسكونسن): محلِّل الأسماء الواحد. أسماء المعجم البديلة ضجيج (أول أربعة بدائل من GeoNames كيفما جاءت: «New York» بديلٌ لبلدتين ليس أيٌّ منهما نيويورك،
   وصف نيويورك نفسه اسمه «New York City»). القواعد — لكل من يطابق اسمًا بصف: (١) الاسم الأصلي/العربي ٤ ثم القوي s (يكتبه باني المعجم الجديد) ٣ ثم «الاسم بلا لاحقة City» ٢ ثم البديل ١ ·
   (٢) بديلٌ وحده أبعد من ١٠٠ كم عن المرجع لا يُصدَّق (far) — يُسأل عنه ولا يُختار صامتًا · (٣) بمرجع: الأقرب بين أصحاب الطبقة العليا (Salamanca الحيّ لا المدينة) · بلا مرجع: الرتبة ثم السكان. ═══ */
const GAZ_ALIAS_KM = 100;
function gazWords(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(function(w){ return w && !/^\d+$/.test(w); }); }
function gazCore(s){ const w = gazWords(s); while (w.length > 1 && w[w.length - 1] === 'city') w.pop(); return w.join(' '); }
function gazNameRank(row, name){ const base = String(name || '').replace(/[\d٠-٩]+/g, ' ').trim(); /* «الرياض ١٢٢١١» — الرمز البريدي ليس من الاسم */ const en = pickerNormalize(base); const ar = (typeof arNorm === 'function') ? arNorm(base) : ''; if (!row || (!en && !ar)) return 0;
  if ((en && pickerNormalize(row.n) === en) || (ar && [].concat(row.ar || []).some(function(x){ return arNorm(x) === ar; }))) return 4;
  if (en && (row.s || []).some(function(x){ return pickerNormalize(x) === en; })) return 3;
  const core = gazCore(name); if (core.length >= 3 && (gazCore(row.n) === core || (row.s || []).some(function(x){ return gazCore(x) === core; }))) return 2;
  if (en && (row.a || []).some(function(x){ return pickerNormalize(x) === en; })) return 1; return 0; }
function gazCityRow(city, row){ return { n: (city && city.name) || (row && row.n) || '', ar: [city && city.nameAr, row && row.ar].filter(Boolean), s: [row && row.n].concat((row && row.s) || []).filter(Boolean), a: (row && row.a) || [] }; } /* المدينة المفتوحة بكل أسمائها (اسمها عندك + صف المعجم) — صفًّا يُسأل عنه gazNameRank */
function gazResolve(rows, name, o){ o = o || {}; const near = (o.near && typeof o.near.lat === 'number') ? o.near : null; const ok = [], far = [];
  (rows || []).forEach(function(r){ if (typeof r.lat !== 'number' || (o.skipId !== undefined && o.skipId !== null && String(r.id) === String(o.skipId))) return; const rank = gazNameRank(r, name); if (!rank) return; const km = near ? plKm(near, r) : null; if (o.maxKm && near && km > o.maxKm) return; const it = { row: r, rank: rank, km: km }; if (rank === 1 && near && km > GAZ_ALIAS_KM) far.push(it); else ok.push(it); });
  const tier = function(x){ return x.rank >= 3 ? 3 : x.rank; }; const top = ok.reduce(function(m, x){ return Math.max(m, tier(x)); }, 0); const by = near ? function(a, b){ return (a.km - b.km) || (b.rank - a.rank); } : function(a, b){ return (b.rank - a.rank) || ((b.row.p || 0) - (a.row.p || 0)); };
  const best = ok.filter(function(x){ return tier(x) === top; }).sort(by), lower = ok.filter(function(x){ return tier(x) !== top; }).sort(by); far.sort(function(a, b){ return a.km - b.km; });
  return { ok: best, lower: lower, far: far, best: best.length ? best[0].row : null }; } /* (٤) الطبقة تسبق القرب: اسمٌ مطابق تمامًا يسبق «بلا City» وهذا يسبق البديل — ثم الأقرب داخل الطبقة (عيّنتا القياس: «Quezon City» من دافاو · «Marseille» من باريس) */
async function gazFindCity(countryName, name){ // ز-١-ج-٢: الصف بالمعجم (معرّف · مركز · نصف قطر الجزيرة) · r107-ب: الاسم الأصلي يسبق البديل (كان الأكبر سكانًا بين كل من حمل الاسم ولو بديلًا)
  const rows = await gazLoad(plCountryCode(countryName)); return gazResolve(rows, name).best;
}
function gazEntryToCity(row, countryName){ const o = { id: String(row.id), name: row.n, country: countryName }; if (typeof row.lat === 'number'){ o.lat = row.lat; o.lng = row.lng; } if (row.r) o.r = row.r; if (row.ar) o.nameAr = row.ar; if (row.island) o.island = true; return o; }
let inputModalOptions = null;
let inputModalFree = false;
let inputModalMax = 0; /* r100-ج: حد الطول للنافذة الحالية (0 = بلا) */
let inputModalTouched = false;
function inputModalFilter(){
  const l = document.getElementById('inputModalList'); if (!l || !inputModalOptions) return;
  const cur = String(document.getElementById('inputModalField').value || '').trim().toLowerCase();
  const q = inputModalTouched ? cur : '';   // القيمة المسبقة لا تُصفّي — القائمة كاملة حتى يكتب المستخدم
  // ر٧٠ب-٢: الخيارات نصوص أو كائنات {name, alt} (المعجم المرجعي) — الترشيح بالتطبيع والأسماء البديلة (pickerFilterItems)
  const items = inputModalOptions.map(o => (typeof o === 'string') ? { name: o } : o);
  const rows = (q ? pickerFilterItems(items, q) : items).slice(0, 40);
  l.innerHTML = rows.length
    ? rows.map(o => '<div class="prow' + (pickerNormalize(o.name) === pickerNormalize(cur) ? ' on' : '') + '" onclick="inputModalPick(\'' + attrStr(o.name) + '\')"><span>' + (typeof countryFlag === 'function' && countryFlag(o.name) ? countryFlag(o.name) + ' ' : '') + escapeHtml(o.name) + '</span><span></span></div>').join('')
    : '<div class="prow dim label"><span>No match — Confirm adds it as a new city</span><span></span></div>';
}
function inputModalPick(v){
  inputModalTouched = true;
  document.getElementById('inputModalField').value = v;
  document.getElementById('inputModalError').textContent = '';
  inputModalFilter();
}
function confirmInputModal(){
  const f = document.getElementById('inputModalField');
  let val = f.value;
  if (inputModalMax && String(val || '').length > inputModalMax){ document.getElementById('inputModalError').textContent = String(val).length.toLocaleString('en') + ' / ' + inputModalMax + ' characters — shorten to save'; return; } /* r100-ج */
  if (inputModalOptions){
    // ر٧٠د (إصلاح انحدار r70b2): الخيارات نصوص أو كائنات {name} — المطابقة بالتطبيع؛ ومع المعجم (inputModalFree) يُقبل النص الحر للمدينة الغائبة
    const key = pickerNormalize(val);
    const hit = inputModalOptions.map(o => (typeof o === 'string') ? o : o.name).find(n => pickerNormalize(n) === key);
    if (!hit && !inputModalFree){ document.getElementById('inputModalError').textContent = 'Pick one from the list'; return; }
    if (!hit && !String(val || '').trim()){ document.getElementById('inputModalError').textContent = 'Type a city name'; return; }
    val = hit || String(val).trim();
  }
  document.getElementById('inputBackdrop').classList.remove('show');
  if (modalResolve){ modalResolve(val); modalResolve = null; }
}
function closeInputModal(){
  document.getElementById('inputBackdrop').classList.remove('show');
  if (modalResolve){ modalResolve(null); modalResolve = null; }
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 2200);
}
// v1.40 — رسالة «تراجع» العابرة (فك المفكرة والحفظ): نفس القرص + زر Undo
// v1.40/ر٥٢ — تعميم مسار الإرسال الحي (sendAddr): نص موقَّع بورقة مشاركة النظام وبديلها النسخ
async function mpSendText(text){
  mpTrack.hit('share_link');
  try{
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); showToast('Copied — paste it anywhere'); }
  }catch(e){}
}
let undoTimer = null;
function showUndoToast(msg, undoFn){
  const t = document.getElementById('toast'); if (!t){ showToast(msg); return; }
  clearTimeout(undoTimer);
  t.innerHTML = '';
  t.appendChild(document.createTextNode(msg + ' '));
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'toast-undo'; b.textContent = 'Undo';
  b.onclick = function(){ clearTimeout(undoTimer); t.classList.remove('show'); t.style.pointerEvents = 'none'; if (undoFn) undoFn(); };
  t.appendChild(b);
  t.style.pointerEvents = 'auto';
  t.classList.add('show');
  undoTimer = setTimeout(function(){ t.classList.remove('show'); t.style.pointerEvents = 'none'; }, 5000);
}
/* ═══ r115-د (٥) · القرار ٠٩-٠١-١٢ ب · ق١١-١١-٠٦: مخطط عنوان واحد لكل رابط يخرج من التطبيق — نوع المصدر (src) · القناة (ref) · رمز المشارك المستعار (by) · الوجهة (to).
   كان كل مولِّد يُخرج العنوان عاريًا أو «mypickz.app» نصًّا: كل زيارة تُحسب ref_direct، والرابط يفتح البوابة لا المحتوى.
   الرمز المستعار: أول ١٠ خانات من SHA-256 لمعرّف المستخدم — ثابت، بلا تخزين، ولا يُعرض لأحد (القرار ٠٨-٣١-١١: الالتقاط من اليوم الأول والعرض مؤجَّل بقرار). ═══ */
const MP_SRC_OK = { app: 1, ulist: 1, trip: 1, community: 1, curator: 1 }; const MP_REF_OK = { ig: 1, tt: 1, sc: 1, card: 1, qr: 1, link: 1 };
const MP_TO_RE = /^(l\.[A-Za-z0-9]{4,40}_[A-Za-z0-9_]{1,60}|t\.[A-Za-z0-9]{4,40}\.[A-Za-z0-9_]{4,60})$/; const MP_BY_RE = /^[0-9a-f]{10}$/;
let mpSharer = ''; let mpSharerFor = '';
async function mpSharerInit(){ try{ const uid = currentUser && currentUser.uid; if (!uid){ mpSharer = ''; mpSharerFor = ''; return ''; } if (mpSharerFor === uid) return mpSharer; const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mp-sharer:' + uid)); mpSharer = Array.from(new Uint8Array(h)).map(function(b){ return b.toString(16).padStart(2, '0'); }).join('').slice(0, 10); mpSharerFor = uid; return mpSharer; }catch(_){ mpSharer = ''; return ''; } }
function mpShareBase(){ try{ return /(^|\.)mypickz\.app$/.test(location.hostname) ? location.origin + '/' : 'https://mypickz.app/'; }catch(_){ return 'https://mypickz.app/'; } } /* موقع الاختبار يُخرج روابطه إلى نفسه */
function mpShareUrl(o){ o = o || {}; const q = []; if (MP_SRC_OK[o.src]) q.push('src=' + o.src); q.push('ref=' + (MP_REF_OK[o.ref] ? o.ref : 'link')); if (currentUser && mpSharerFor === currentUser.uid && mpSharer) q.push('by=' + mpSharer); if (o.to && MP_TO_RE.test(o.to)) q.push('to=' + o.to); return mpShareBase() + '?' + q.join('&'); }
const MP_ARRIVAL_MS = 7 * 86400000; /* r115 (مراجعة مستقلة): ما حمله الرابط يسقط بعد أسبوع — ويُستهلك عند أول دخول مكتمل (mpArrivalOpen) */
function mpArrivalRead(){ try{ const a = JSON.parse(localStorage.getItem('mp_arrival') || 'null'); if (!a || typeof a !== 'object') return null; if (!(a.at > 0) || Date.now() - a.at > MP_ARRIVAL_MS){ localStorage.removeItem('mp_arrival'); return null; } return a; }catch(_){ return null; } }
function mpArrivalCapture(){ /* عند الإقلاع: ما حمله الرابط يُحفظ على الجهاز حتى يكتمل الدخول (البوابة إلزامية) */ try{ const q = new URLSearchParams(location.search); const a = {}; const s = (q.get('src') || '').toLowerCase(), r = (q.get('ref') || '').toLowerCase(), by = (q.get('by') || '').toLowerCase(), to = q.get('to') || ''; if (MP_SRC_OK[s]) a.src = s; if (MP_REF_OK[r]) a.ref = r; if (MP_BY_RE.test(by)) a.by = by; if (MP_TO_RE.test(to)) a.to = to; if (!Object.keys(a).length) return null; a.at = Date.now(); localStorage.setItem('mp_arrival', JSON.stringify(a)); try{ sessionStorage.removeItem('mp_arrival_opened'); }catch(_){} return a; }catch(_){ return null; } }
/* ═══ r116-ز (البند ١ صف ٨ · ق١١-١١-١٢): مشاركة أندرويد — manifest.json يعلن share_target (GET بثلاثة معاملات: share_title · share_text · share_url)، فيظهر MyPickz المثبَّت في ورقة «مشاركة» خرائط جوجل.
   المستقبِل: النص المشارَك يُلتقط عند الإقلاع ويُنظَّف العنوان، ويبقى للجلسة حتى يكتمل الدخول؛ ثم تُفتح نافذة «＋ Add place» ويُقرأ النص بالمحلِّل الواحد (plParseShare — كاللصق تمامًا). بلا مدينة مفتوحة ينتظر: أول نافذة إضافة تُفتح تأخذه.
   حدّ معلن: لم يُقَس على هاتف هنا — ورقة المشاركة لا تعرض إلا تطبيقًا مثبَّتًا على أندرويد؛ r117-د (ق١١-١١-١٦): علامة «Soon» أُزيلت من الإرشاد بقرار المالك — التجربة على الهاتف بعد الرفع، وما يظهر فيها يُعالج. ═══ */
function mpShareInCapture(){ try{ const q = new URLSearchParams(location.search); if (!q.has('share_text') && !q.has('share_url') && !q.has('share_title')) return ''; const t = [q.get('share_title'), q.get('share_text'), q.get('share_url')].filter(function(x, i, a){ return x && a.indexOf(x) === i; }).join('\n').trim().slice(0, 2000); try{ history.replaceState(null, '', location.pathname); }catch(_){} if (!t) return ''; try{ sessionStorage.setItem('mp_share_in', t); }catch(_){} return t; }catch(_){ return ''; } }
function mpShareInPending(){ try{ return sessionStorage.getItem('mp_share_in') || ''; }catch(_){ return ''; } }
function mpShareInTake(){ const t = mpShareInPending(); if (t){ try{ sessionStorage.removeItem('mp_share_in'); }catch(_){} } return t; }
function mpShareInOpen(){ /* بعد اكتمال الدخول: المشارَك يفتح نافذة الإضافة مقروءًا */ try{ if (!mpShareInPending() || !currentUser) return false; if (currentUserSuspended){ mpShareInTake(); showToast('Your account is suspended — adding places is turned off'); return false; } if (currentTab !== 'Places') switchTab('Places'); if (!cityListCityId || !myCityListData){ showToast('Shared from Google Maps — pick a city, then ＋ Add place: it is waiting'); return false; } openPlPlaceModal(null, null); return true; }catch(e){ mpSwallow(e, 'share-in'); return false; } }
function mpCardOf(to){ /* وجهة الرابط → [صاحب البطاقة، معرّف البطاقة في stats_cards]: l.<uid>_<city> ← l_<city> · t.<uid>.<trip> ← t_<trip> */ if (!to || !MP_TO_RE.test(to)) return null; if (to.charAt(0) === 'l'){ const k = to.slice(2), i = k.indexOf('_'); return [k.slice(0, i), 'l_' + k.slice(i + 1)]; } const p = to.slice(2).split('.'); return [p[0], 't_' + p[1]]; }
function mpCardArrivalCount(){ /* r116-هـ: حين تُعرف حال الدخول — وصول برمز بطاقة (ref=card وله وجهة) يُعدّ لصاحب البطاقة مرة لهذا الوصول؛ صاحبها نفسه لا يُعدّ */ try{ const a = mpArrivalRead(); if (!a || a.ref !== 'card' || !a.to || a.cc) return false; const c = mpCardOf(a.to); if (!c) return false; a.cc = 1; try{ localStorage.setItem('mp_arrival', JSON.stringify(a)); }catch(_){} if (currentUser && currentUser.uid === c[0]) return false; return mpTrack.statsCard(c[0], c[1]); }catch(_){ return false; } }
function mpArrivalFields(){ /* ما يُكتب في سجل المستخدم الجديد مرة واحدة: من جلبه (رمزًا مستعارًا) ومن أي نوع وقناة — المالك يجمع «كم جلب كل رمز» لاحقًا؛ لا يُعرض لأحد الآن */ const a = mpArrivalRead(); if (!a) return {}; const o = {}; if (a.by && a.by !== mpSharer) o.refBy = a.by; if (a.src) o.refSrc = a.src; if (a.ref) o.refCh = a.ref; if (a.to) o.refTo = a.to; return o; }
function mpArrivalOpen(){ /* بعد اكتمال الدخول: الرابط يفتح محتواه لا البوابة — مرة للجلسة */ try{ const a = mpArrivalRead(); if (!a || !currentUser) return false; try{ localStorage.removeItem('mp_arrival'); }catch(_){} /* يُستهلك: كان يبقى على الجهاز فيعيد فتح الوجهة في كل جلسة لاحقة ويُنسب إلى أي حساب جديد بعده */ if (!a.to) return false; if (sessionStorage.getItem('mp_arrival_opened') === a.to) return false; sessionStorage.setItem('mp_arrival_opened', a.to); const origin = a.src === 'curator' ? 'curator' : 'app'; if (a.to.charAt(0) === 'l'){ const k = a.to.slice(2); const i = k.indexOf('_'); cmOpenList(k.slice(0, i), k.slice(i + 1), origin); } else { const p = a.to.slice(2).split('.'); openSavedTripInCommunity(p[0], p[1]); } try{ logTiming('ARRIVAL · opened ' + a.to.slice(0, 1) + ' · src ' + (a.src || '—') + ' · ref ' + (a.ref || '—') + (a.by ? ' · by code' : '')); }catch(_){} return true; }catch(e){ mpSwallow(e, 'arrival-open'); return false; } }
function copyLink(){
  mpTrack.hit('share_link');
  navigator.clipboard.writeText(mpShareUrl({ src: 'app', ref: 'link' })).then(()=> showToast('Link copied ✓'))
    .catch(()=> showToast('Copy the link manually from the address bar'));
}
function showQR(){
  mpTrack.hit('share_link');
  const box = document.getElementById('qrcode'); box.innerHTML = '';
  try{ new QRCode(box, { text: mpShareUrl({ src: 'app', ref: 'qr' }), width:180, height:180, colorDark:'var(--ink)', colorLight:'var(--ivory-bright)' }); }
  catch(e){ box.innerHTML = '<div style="font-size:12px;color:var(--ink-strong)">Could not generate the code</div>'; }
  document.getElementById('qrBackdrop').classList.add('show');
}
function closeQR(){ document.getElementById('qrBackdrop').classList.remove('show'); }

