/* =========================================================
   6) نافذة الإدخال العامة، QR، نسخ الرابط
   ========================================================= */

let modalResolve = null;
// وضع select اختياري: مرّر options (مصفوفة نصوص) لعرض قائمة منسدلة بدل حقل نص حر
function openInputModal(title, placeholder, initialValue, options, opts){
  return new Promise((resolve) => {
    modalResolve = resolve;
    inputModalFree = !!(opts && opts.allowFree); // ر٧٠د: قائمة اقتراح لا قيد (المعجم) — الحر مقبول
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
  return rows.map(c => ({ name: c.n, alt: [].concat(c.a || [], c.ar ? [c.ar] : []) }));
}
async function gazFindCity(countryName, name){ // ز-١-ج-٢: الصف بالمعجم (معرّف · مركز · نصف قطر الجزيرة) — الاسم أو بدائله أو العربي
  const rows = await gazLoad(plCountryCode(countryName)); const n = pickerNormalize(name); let best = null;
  (rows || []).forEach(function(c){ const names = [c.n].concat(c.a || [], c.ar ? [c.ar] : []); if (names.some(function(x){ return pickerNormalize(x) === n; }) && (!best || (c.p || 0) > (best.p || 0))) best = c; });
  return best;
}
function gazEntryToCity(row, countryName){ const o = { id: String(row.id), name: row.n, country: countryName }; if (typeof row.lat === 'number'){ o.lat = row.lat; o.lng = row.lng; } if (row.r) o.r = row.r; if (row.ar) o.nameAr = row.ar; if (row.island) o.island = true; return o; }
let inputModalOptions = null;
let inputModalFree = false;
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
function copyLink(){
  mpTrack.hit('share_link');
  navigator.clipboard.writeText(window.location.href).then(()=> showToast('Link copied ✓'))
    .catch(()=> showToast('Copy the link manually from the address bar'));
}
function showQR(){
  mpTrack.hit('share_link');
  const box = document.getElementById('qrcode'); box.innerHTML = '';
  try{ new QRCode(box, { text: window.location.href, width:180, height:180, colorDark:'var(--ink)', colorLight:'var(--ivory-bright)' }); }
  catch(e){ box.innerHTML = '<div style="font-size:12px;color:var(--ink-strong)">Could not generate the code</div>'; }
  document.getElementById('qrBackdrop').classList.add('show');
}
function closeQR(){ document.getElementById('qrBackdrop').classList.remove('show'); }

