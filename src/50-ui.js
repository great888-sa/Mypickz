/* =========================================================
   5) واجهة المستخدم
   ========================================================= */




// --- اسم/أيقونة التصنيف الفرعي (مشترك لكل المدن) ---
// ر٦٩ع (N-050): مُحلّ واحد للاسم والأيقونة — يقبل المعرّف أو الاسم المعروض القديم
function catLegacyHint(id){ const c = customItems.find(function(x){ return x.id === id; }); return (c && c.legacySection && isOwner) ? ' <span class="dim">· from ' + escapeHtml(c.legacySection) + '</span>' : ''; } // ز-١-ج-٣: أصل التصنيف المخصَّص اليتيم لصاحبه
function catLabelOf(idOrName){ const all = (typeof plCatsAll === 'function') ? plCatsAll() : []; const hit = all.find(function(x){ return x.id === idOrName; }) || all.find(function(x){ return x.name === idOrName; }); return hit ? hit.name : String(idOrName || ''); } // r72r-1: بلا أيقونة (قرار المالك: أيقونات الفرعي تُحذف من التطبيق كله)
function displayName(item){ const o = itemOverrides[item.id]; return (o && o.name) ? o.name : item.name; }

// --- تخصيص اسم/أيقونة القسم الرئيسي (مشترك لكل المدن) ---
// ر٧٠ط: المعرّفات القديمة — قراءة متسامحة للثلاثة غير المتعارضة، والرابع (shawarma→sandwich) بإعادة الكتابة لمرة واحدة فقط (لأن shawarma صار معرّفًا حيًّا للشاورما)
const CAT_ID_MAP = { coffee_bakery: 'coffee', fine_lebanese: 'lebanese', fine_italian: 'italian', fine_japanese: 'japanese', taco: 'other_cuisine' };
const CAT_ID_MAP_ONCE = Object.assign({ shawarma: 'sandwich' }, CAT_ID_MAP);
function catIdNew(id){ const v = CAT_ID_MAP[id] || id; return catKnown(v) ? v : 'others'; } // ر٧٠ل: المجهول → Others (منفذ الاستيراد)
function catKnown(id){ return DATA.some(function(sec){ return (sec.items || []).some(function(it){ return it.id === id; }); }) || customItems.some(function(c){ return c.id === id; }); }
function migrateCategoryKeys(categories, once){ // يعيد {categories, changed}
  const map = once ? CAT_ID_MAP_ONCE : CAT_ID_MAP; const out = {}; let changed = false;
  Object.keys(categories || {}).forEach(function(k){ let nk = map[k] || k; if (once && !catKnown(nk) && !isPrivateCategoryId(nk)) nk = 'others'; if (nk !== k) changed = true; // ر٧٠ل: المجهول → Others
    if (!out[nk]) out[nk] = categories[k]; else { out[nk] = Object.assign({}, out[nk], { places: (out[nk].places || []).concat(categories[k].places || []) }); } });
  return { categories: out, changed: changed };
}
const CATS_VERSION = 3; // ر٧٠ل: الشجرة v3
function sectionIdOf(catId){ const c = plCatsAll().find(function(x){ return x.id === catIdNew(catId); }); return c ? c.sectionId : null; }
function sectionDisplay(section){
  const o = sectionOverrides[section.title];
  return { name: (o && o.name) ? o.name : section.title, icon: (o && o.icon) ? o.icon : section.icon };
}

// --- ترتيب التصنيفات الفرعية داخل قسم (مشترك لكل المدن) ---

// يرجع مصفوفة المواقع لتصنيف معيّن (بيانات هذي المدينة بس)


// لصق رابط من حافظة الجهاز مباشرة بخانة رابط موقع معيّن


// يفتح خرائط Google بحث مباشر على اسم المدينة الحالية بتبويب جديد

// معرّف ثابت فريد لكل مكان (يُستخدم لاحقًا للربط الحي بميزة Add Trip) — بنفس نمط توليد معرّفات مدن My List المخصّصة
function generatePlaceId(){
  return "place_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}
let ownerNoteBackup = {}; // نسخة أصلية لكل ملاحظة (id#index) لحظة أول لمسة لها منذ آخر حفظ ناجح — لا يوجد زر "edit" منفصل لخانة الملاحظة بقائمة المالك (تُعدَّل مباشرة دائمًا بوضع Edit العام)


// --- إضافة/حذف تصنيف فرعي مخصص (مشترك لكل المدن) ---



// ===== حسابات المستخدمين والمفكرات (للزوار) =====
let currentUser = null;
let resolveAuthReady;
const authReadyPromise = new Promise(res => { resolveAuthReady = res; }); // يكتمل أول ما Firebase يتأكد من حالة تسجيل الدخول (بغض النظر لو فاضية أو حساب حقيقي)
/* v1.40 · دفعة الأفعال الأربعة (القرار المؤسِّس ٠٩): القلب تقاعد —
   مفكرة المكان (بلا عدّاد — حقل placeBookmarks بمستندك) · مفكرة القائمة (سجل + عدّاد) · حفظ الرحلة (سجل + عدّاد) */
let listBookmarksMap = null;   // {listId: record} — تُحمّل عند أول حاجة
let tripSavesMap = null;       // {tripId: record}
const viewBumped = {};         // مشاهدة القائمة تُحسب مرة بالجلسة
function placeBmMap(){ return (userListData && userListData.placeBookmarks && typeof userListData.placeBookmarks === 'object') ? userListData.placeBookmarks : {}; }
// ر٦٨: مفتاح مفكرة مكانك = هوية العنصر (المعرّف) لا بصمة الرابط — روابط متطابقة لا تتشارك الحالة (ع٣)
function isBookmarked(key){ return !!(key && placeBmMap()[hashUrl(key)]); } // المفتاح: رابط (محتوى الآخرين) أو 'id:…' (مكانك)
function bmKeyFor(pl){ return pl && pl.id ? ('id:' + pl.id) : (pl && pl.url ? pl.url : ''); }
function isBookmarkedPlace(pl){ return isBookmarked(bmKeyFor(pl)); }
// ر٧٠ج (N-066): رمز «مشاركة مع شخص» رسمة متجهة — شخص وزائد — بلون النص (حبر/زعفران عند on) لا رمزًا تعبيريًّا
function shareSvg(){
  return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M18 6v6M15 9h6"/></svg>';
}
function placeSearchKey(p, catId){ const c = plCatsAll().find(function(x){ return x.id === catId; }); return pickerNormalize([p.name, p.area, (p.picks || []).map(function(x){ return x.name; }).join(' '), c ? c.name + ' ' + c.section : ''].join(' ')); }
function flagsHtml(flags){ return (flags || []).indexOf('fine_dining') >= 0 ? '<span class="pl-flag">Fine dining</span>' : ''; } // ر٧٠ط: شارة العلامة
function liveCountOf(categories){ return Object.values(categories || {}).reduce(function(a, e){ return a + ((e && e.places) || []).filter(function(q){ return q && (q.name || q.url); }).length; }, 0); }
function doc0Exists(data){ return !!(data && (data.ownerId || data.cityId || data.categories)); }
function bmkSvg(on){
  return on
    ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>';
}
// ر٥٨: الخريطتان من مرآة مستندك المحمَّل بالإقلاع — صفر استعلام (استعلام السجلات غير مُثبَت بالقواعد قصدًا)
async function ensureListBookmarks(){
  if (listBookmarksMap !== null || !currentUser) return;
  listBookmarksMap = {};
  const ids = (userListData && userListData.listBookmarkIds) || {};
  Object.keys(ids).forEach(function(listId){
    if (!ids[listId]) return;
    const cut = listId.indexOf('_');
    listBookmarksMap[listId] = { listId: listId, ownerUid: cut > 0 ? listId.slice(0, cut) : listId, cityId: cut > 0 ? listId.slice(cut + 1) : '' };
  });
}
async function ensureTripSaves(){
  if (tripSavesMap !== null || !currentUser) return;
  tripSavesMap = {};
  const ids = (userListData && userListData.tripSaveIds) || {};
  Object.keys(ids).forEach(function(tripId){ if (ids[tripId]) tripSavesMap[tripId] = { tripId: tripId }; });
}

// معرّف آمن ومختصر لأي رابط (Firestore ما يقبل / بمعرّف المستند)

// ═══ ر٦٨ — عقد العنصر المؤجل (ق٠٨-٣٠-٠٦ · ق٠٩-٠٦-١٩): المؤجل يُرسم بوسمه الظاهر ويستجيب برسالة خطوته — لا disabled ولا تلميح
function showSoon(msg){ showToast(msg); }
// ر٦٩ب: noop حُذفت — كل عنصر مؤجل يستجيب برسالة (عقد المؤجل)
function soonChip(label, step, msg, cls){
  return '<button type="button" class="' + (cls || 'chip') + ' soon" onclick="showSoon(\'' + attrStr(msg || (label + ' — ' + step)) + '\')">' + escapeHtml(label) + ' <span class="dim">' + escapeHtml(step) + '</span></button>';
}
// ═══ ر٦٨ — زر العودة دالة بناء واحدة (المواضع الستة تشترك بالصنف والقاعدة) ═══
function backChip(label, handler){ return '<button type="button" class="backchip" onclick="' + handler + '">' + escapeHtml(label) + '</button>'; }
// ═══ ر٦٨ — جدول الأسطح المسمّى (مصدر إبرة §٢٠: كل صنف بلون نص وخلفية موروثة يُحل سطحه هنا لا استنتاجًا) ═══
const SURFACES = { backchip: 'paper', 'pl-src': 'paper', chip: 'paper', csel: 'paper', ctx: 'paper', 'pl-cathead': 'paper', actn: 'paper', 'mp-empty': 'paper', 'bmk-btn': 'ivory-bright', 'pl-row': 'ivory-bright', 'pl-name': 'ivory-bright', 'pl-sub': 'ivory-bright', 'act-chip': 'ivory-bright', act: 'ivory-bright', modal: 'ivory', panel: 'ivory', 'geo-note': 'ivory', 'help-attr': 'ivory', 'pl-search-x': 'ivory-bright', 'dr-item': 'ivory', 'acc-item': 'ivory', hdr: 'ivory', bk: 'ivory-bright', x: 'ivory-bright', gsec: 'ivory', num: 'ivory-bright', sheet: 'ivory', 'sheet-txt': 'ivory', 'sheet-cancel': 'ivory', 'acc-sub': 'ivory-bright', 'dr-foot': 'bar', lnk: 'bar', ptext: 'bar', pmeta: 'bar', scap: 'bar', ok: 'surf', no: 'surf', dsub: 'surf' }; /* ب-٢-٢-أ: أصناف القشرة الموحَّدة بسطوحها */
// ═══ ر٦٨ — القوالب المشتركة (المرجع v1.42: ٦/د٢ ولوحة الاختيار) — دالتا بناء بلا تركيب؛ يستهلكهما ر٦٩–ر٧١ ═══
const SOURCE_CHIPS = [['all','All'],['views','Most viewed'],['bookmarked','Most bookmarked'],['shared','Shared with you'],['mine','🔖 My bookmarked'],['saved','Most saved']];
function sourceScreen(spec){
  const chips = SOURCE_CHIPS.map(([id, label]) => (id === 'saved' && spec.savedSoon !== false)
    ? soonChip(label, 'stage 3', 'Sort by copies made with Save — arrives with stage 3', 'chip')
    : '<button type="button" class="chip' + (spec.active === id ? ' on' : '') + '" onclick="' + (spec.onChip || 'void') + '(\'' + id + '\')">' + escapeHtml(label) + '</button>').join('');
  return '<div class="stickyhead"><div class="headrow">' + backChip(spec.backLabel || '← Back', spec.backHandler || 'void(0)') + '<span class="csel label"><b>' + escapeHtml(spec.title || '') + '</b></span></div>'
    + '<div class="headrow"><span class="csel" onclick="' + (spec.onCountry || 'void(0)') + '">' + escapeHtml(spec.countryLabel || '') + ' <span class="arr">⌄</span></span><span class="csel grow" onclick="' + (spec.onCity || 'void(0)') + '"><b>' + escapeHtml(spec.cityLabel || 'All cities') + '</b> <span class="arr">⌄</span></span></div>'
    + '<div class="chipgrid c3">' + chips + '</div>'
    + '<div class="ctx"><b>' + escapeHtml(spec.ctx || spec.title || '') + '</b></div></div>'
    + (spec.cards || []).join('');
}
// ر٧٠أ (N-011): لوحة الاختيار المشتركة — القالب الحي بسلوك المرجع v1.42 (ق٠٩-٠٧-٠٥):
//   حقل تصفية حي (بالتطبيع — الطبقة ١ من ق٠٩-١٠-٠٢) · عمود عدّاد ثابت · المختار زعفراني بنقطة · ضابط الدولة بالسطر نفسه ·
//   وضع تحرير بحذف حي على ما يملكه المستخدم · ＋ Add city أسفل النتائج لا بدلها · ذاكرة آخر اختيار لكل وجهة.
//   الحالة: __pk[id] = { spec, query, edit } — الرسم دالة نقية من الحالة؛ الواجهات تركّبها بالذيول ب–هـ.
const __pk = {};
// التطبيع (الطبقة ٢): أحرف صغيرة · إسقاط الحركات اللاتينية · إسقاط كل ما ليس حرفًا أو رقمًا — فتلتقي «Al-Khobar» و«Al Khobar» و«Alkhobar» على مفتاح واحد.
//   أداة التعريف لا تُحذف من المفتاح (حذفها يشوّه Alexandria وAthens) بل تُولَّد صيغة ثانية للبحث فقط حين تسبق فاصلًا.
function pickerNormalize(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function pickerKeys(s){
  const full = pickerNormalize(s);
  const stripped = pickerNormalize(String(s || '').toLowerCase().replace(/^(al|ar|el|as|ad|an|az|at|ash|ath)[\s'-]+/, ''));
  return stripped && stripped !== full ? [full, stripped] : [full];
}
// الطبقة ٣ (ق٠٩-١٠-٠٢): أقرب اسم بمسافة تحرير ≤ ٢ على المفتاح المطبَّع — لسؤال «هل تقصد؟» قبل الإنشاء الحر
function pickerNearest(name, candidates){
  const key = pickerNormalize(name); if (key.length < 4) return null;
  const lev = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 3; let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++){ const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
  let best = null, bd = 3;
  (candidates || []).forEach(c => { const ks = pickerKeys(c.name).concat((c.alt || []).map(pickerNormalize)); ks.forEach(k => { if (k === key) return; const d = lev(key, k); if (d < bd){ bd = d; best = c; } }); });
  return bd <= 2 ? best : null;
}
function pickerFilterItems(items, q){
  const n = pickerNormalize(q);
  if (!n) return (items || []).slice();
  const qs = pickerKeys(q); // ر٧٠ب-٢: أداة التعريف تُسقَط من السؤال أيضًا — «al riy» يجد Riyadh
  const hit = v => pickerKeys(v).some(k => qs.some(x => k.indexOf(x) >= 0));
  return (items || []).filter(it => hit(it.name) || (it.alt || []).some(hit));
}
const pickerMemory = {
  key(k){ return 'mp_pick_' + String(k || ''); },
  get(k){ try{ return localStorage.getItem(this.key(k)); }catch(e){ return null; } },
  set(k, v){ try{ if (v == null) localStorage.removeItem(this.key(k)); else localStorage.setItem(this.key(k), String(v)); }catch(e){ /* صامت */ } }
};
function pickerPanel(spec){
  spec = spec || {};
  const id = spec.id || 'pk';
  const st = __pk[id] || (__pk[id] = { query: '', edit: false });
  st.spec = spec;
  if (typeof spec.query === 'string') st.query = spec.query;
  if (typeof spec.edit === 'boolean') st.edit = spec.edit;
  const items = pickerFilterItems(spec.items, st.query);
  const rows = (spec.limit ? items.slice(0, spec.limit) : items).map(it =>
    '<div class="prow' + (it.selected ? ' sel' : '') + '"' + (it.country ? ' data-country="' + attrStr(String(it.country).toLowerCase()) + '"' : '')
    + ' onclick="' + (spec.onPick || 'void') + '(\'' + attrStr(it.id) + '\')"><span class="nm">' + (it.selected ? '<span class="dot"></span>' : '') + (it.icon ? escapeHtml(it.icon) + ' ' : '') + escapeHtml(it.name) + (it.sub ? '<br><span class="dim mini">' + escapeHtml(it.sub) + '</span>' : '') + '</span>'
    + '<span>' + (it.count == null ? '' : '<span class="cnt-num">' + escapeHtml(String(it.count)) + '</span>')
    + ((st.edit && it.custom) ? ' <button type="button" class="del" onclick="event.stopPropagation();' + (spec.onDelete || 'void') + '(\'' + attrStr(it.id) + '\')" title="Delete">🗑</button>' : '')
    + '</span></div>').join('');
  const empty = items.length ? '' : '<div class="prow dim label">' + escapeHtml(spec.emptyText || 'No match') + '</div>';
  const more = (spec.limit && items.length > spec.limit) ? '<div class="prow dim label">' + escapeHtml('… ' + (items.length - spec.limit) + ' more — type to narrow') + '</div>' : '';
  const head = '<div class="phead"><span>' + escapeHtml(spec.title || '') + '</span><span>'
    + (spec.editable ? '<span class="edit' + (st.edit ? ' on' : '') + '" onclick="pickerToggleEdit(\'' + attrStr(id) + '\')">' + (st.edit ? 'Done' : '✏️ Edit') + '</span> ' : '')
    + (spec.noClose ? '' : '<span class="x" onclick="' + (spec.onClose || 'void(0)') + '">✕</span>') + '</span></div>';
  const filter = '<div class="pline">'
    + (spec.countryLabel ? '<span class="csel" onclick="' + (spec.onCountry || 'void(0)') + '">' + escapeHtml(spec.countryLabel) + ' <span class="arr">⌄</span></span>' : '')
    + '<input type="text" class="search psearch" placeholder="' + attrStr(spec.filterPlaceholder || 'Type to filter…') + '" value="' + attrStr(st.query) + '" oninput="pickerFilterInput(\'' + attrStr(id) + '\', this.value)" autocomplete="off"></div>';
  const bareSearch = (spec.bare && spec.search) ? '<div class="pline"><input type="text" class="search psearch" placeholder="' + attrStr(spec.filterPlaceholder || 'Type to filter…') + '" value="' + attrStr(st.query) + '" oninput="pickerFilterInput(\'' + attrStr(id) + '\', this.value)" autocomplete="off"></div>' : '';
  return '<div class="panel' + (spec.bare ? ' bare' : '') + '" id="pk_' + attrStr(id) + '">' + (spec.bare ? bareSearch : head + filter) + rows + empty + more
    + (spec.canAdd ? '<button type="button" class="cta" onclick="' + (spec.onAdd || 'void(0)') + '">' + escapeHtml(spec.addLabel || '＋ Add city') + '</button>' : '') + '</div>';
}
// ر٧٠هـ (N-074 · N-075 · قرار المالك): الصيغة الموحَّدة بالصفوف والنوافذ — شريحة يسارًا (المختارة أو «Choose a city ⌄») وحقل «Type a city…» يمينًا؛
//   الضغط على الشريحة يفتح اللوحة كاملة (مجرَّدة: بلا رأس ولا حقل داخلي)، والكتابة بالحقل تفتحها مرشَّحة، والاختيار يكتب بالشريحة ويطويها.
//   spec.rowId · label · placeholder · items · onPick · canAdd/onAdd · limit — الحالة بـ__pk[rowId] {open, query}
function pickerRow(spec){
  const id = spec.id; const st = __pk[id] || (__pk[id] = { query: '', edit: false, open: false });
  st.rowSpec = spec;
  return '<div class="headrow pkrow"><button type="button" class="csel grow' + (st.open ? ' on' : '') + '" onclick="pickerToggle(\'' + attrStr(id) + '\')"><b>' + escapeHtml(spec.label || 'Choose a city') + '</b> ' + (st.open ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>'
    + '<input type="text" class="csel grow psearch" placeholder="' + attrStr(spec.placeholder || 'Type a city…') + '" value="' + attrStr(st.query) + '" oninput="pickerTypeOpen(\'' + attrStr(id) + '\', this.value)" autocomplete="off"></div>'
    + '<div id="pk_' + attrStr(id) + '_host">' + pickerRowPanel(id) + '</div>';
}
function pickerRowPanel(id){
  const st = __pk[id]; if (!st || !st.rowSpec || !st.open) return '';
  const sp = st.rowSpec;
  return pickerPanel({ id: id, bare: true, query: st.query, items: sp.items, onPick: sp.onPick, canAdd: sp.canAdd, onAdd: sp.onAdd, addLabel: sp.addLabel, emptyText: sp.emptyText, limit: sp.limit || 8 });
}
function pickerRowRefresh(id){ const h = document.getElementById('pk_' + id + '_host'); if (h) h.innerHTML = pickerRowPanel(id); }
function pickerRowChip(id){ const st = __pk[id]; const h = document.getElementById('pk_' + id + '_host'); const row = h && h.previousElementSibling; const b = row && row.querySelector ? row.querySelector('.csel') : null; if (b && b.classList) b.classList.toggle('on', !!(st && st.open)); }
function pickerToggle(id){ const st = __pk[id]; if (!st) return; st.open = !st.open; pickerRowRefresh(id); pickerRowChip(id); }
function pickerTypeOpen(id, q){ const st = __pk[id]; if (!st) return; st.query = String(q || ''); st.open = true; pickerRowRefresh(id); pickerRowChip(id); }
function pickerRowClose(id){ const st = __pk[id]; if (!st) return; st.open = false; st.query = ''; }
// ر٧٠ط (N-082 · قرار المالك): صف التصنيف بشريحتين — الرئيسي يسارًا ← الفرعي يمينًا — على اللوحة المشتركة المجرَّدة؛ حقل التصفية داخل لوحة الفرعي يبحث بأسماء الفرعيات وأسماء الأماكن
//   spec: id · main · sub · onMain(fn name) · onSub(fn name) · countOf(catId)→n (اختياري) · placesOf(catId)→[names] (اختياري) · allLabel (مثل «All categories») · allowAll
const __cp = {};
function catPairRow(spec){
  const id = spec.id; const st = __cp[id] || (__cp[id] = { open: null }); st.spec = spec;
  const secs = catSections(); const main = secs.find(function(x){ return x.id === spec.main; });
  const sub = spec.sub ? plCatsAll().find(function(c){ return c.id === spec.sub; }) : null;
  return '<div class="headrow cprow"><button type="button" class="csel grow' + (st.open === 'main' ? ' on' : '') + '" onclick="catPairToggle(\'' + attrStr(id) + '\', \'main\')"><b>' + escapeHtml(main ? main.name : (spec.allLabel || 'Category')) + '</b> ' + (st.open === 'main' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>'
    + '<button type="button" class="csel grow' + (st.open === 'sub' ? ' on' : '') + '" onclick="catPairToggle(\'' + attrStr(id) + '\', \'sub\')"' + (main ? '' : ' disabled') + '><b>' + escapeHtml(sub ? sub.name : (spec.subLabel || 'Sub-category')) + '</b> ' + (st.open === 'sub' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button></div>'
    + '<div id="cp_' + attrStr(id) + '_host">' + catPairPanel(id) + '</div>';
}
function catSections(){ const out = []; DATA.forEach(function(sec){ const d = sectionDisplay(sec); out.push({ id: sec.id || sec.title, name: d.name }); }); return out; }
function catPairPanel(id){
  const st = __cp[id]; if (!st || !st.spec || !st.open) return ''; const sp = st.spec; const cnt = sp.countOf || function(){ return undefined; };
  if (st.open === 'main'){ const items = (sp.allowAll ? [{ id: '', name: sp.allLabel || 'All categories', selected: !sp.main }] : []).concat(catSections().map(function(sc){ const n = plCatsAll().filter(function(c){ return c.sectionId === sc.id; }).reduce(function(a, c){ return a + (cnt(c.id) || 0); }, 0); return { id: sc.id, name: sc.name, count: sp.countOf ? n : undefined, selected: sc.id === sp.main }; }).filter(function(it){ return !sp.allowAll || !sp.countOf || it.count > 0 || it.id === sp.main; })); // ر٧٠ل: بالتصفية تُخفى الأقسام ذات الصفر (كما تخفيها الشاشة)؛ بالإدخال تُعرض كلها
    const noContent = sp.allowAll && sp.countOf && items.length <= 1; // ر٧٠ل-٢: لا قسم له محتوى بعد — تُقال صراحة بدل صف وحيد يبدو كأن القائمة لم تُفتح
    return pickerPanel({ id: id + '_m', bare: true, items: items, onPick: 'catPairPickMain_' + id, limit: 20 }) + (noContent ? '<div class="prow dim label">No places in any category yet — add a place first</div>' : ''); }
  const subs = plCatsAll().filter(function(c){ return c.sectionId === sp.main; }).map(function(c){ return { id: c.id, name: c.name, count: sp.countOf ? (cnt(c.id) || 0) : undefined, selected: c.id === sp.sub, alt: sp.placesOf ? (sp.placesOf(c.id) || []) : [] }; });
  const items = (sp.allowAll ? [{ id: '', name: sp.allSubLabel || 'All in this category', selected: !sp.sub }] : []).concat(subs);
  return pickerPanel({ id: id + '_s', bare: true, search: true, query: st.query || '', filterPlaceholder: 'Type a sub-category or a place…', items: items, onPick: 'catPairPickSub_' + id, limit: 20 });
}
function catPairRefresh(id){ const h = document.getElementById('cp_' + id + '_host'); if (h) h.innerHTML = catPairPanel(id); }
function catPairToggle(id, which){ const st = __cp[id]; if (!st) return; st.open = (st.open === which) ? null : which; st.query = ''; if (st.spec && st.spec.rerender) window[st.spec.rerender](); else catPairRefresh(id); }
function catPairClose(id){ const st = __cp[id]; if (st){ st.open = null; st.query = ''; } }
function catPairRegister(id, onMain, onSub){ window['catPairPickMain_' + id] = function(v){ catPairClose(id); onMain(v); }; window['catPairPickSub_' + id] = function(v){ catPairClose(id); onSub(v); }; }
function pickerRender(id){
  const st = __pk[id]; if (!st || !st.spec) return;
  const el = document.getElementById('pk_' + id); if (!el) return;
  const active = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('psearch');
  el.outerHTML = pickerPanel(Object.assign({}, st.spec, { query: st.query, edit: st.edit }));
  if (active){ const i = document.querySelector('#pk_' + id + ' .psearch'); if (i){ i.focus(); try{ i.setSelectionRange(i.value.length, i.value.length); }catch(e){ /* صامت */ } } }
}
function pickerFilterInput(id, q){ const st = __pk[id]; if (!st) return; st.query = String(q || ''); pickerRender(id); }
function pickerToggleEdit(id){ const st = __pk[id]; if (!st) return; st.edit = !st.edit; pickerRender(id); }
window.__mpTemplates = { sourceScreen, pickerPanel, pickerFilterItems, pickerNormalize, pickerKeys, pickerNearest, pickerMemory, gazLoad, gazCityOptions, pickerToggleEdit, pickerFilterInput, SOURCE_CHIPS, SURFACES };
function hashUrl(str){
  let hash = 0;
  for (let i = 0; i < str.length; i++){
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return 'p' + Math.abs(hash).toString(36);
}

// مفكرة المكان — على مكانك بقائمتك بلا أي عدّاد (المبدأ التاسع)؛ الفك بضغط المصمتة نفسها + «تراجع»
async function togglePlaceBookmark(url, name, category, cityId, area, ownerUid, mapsUrl){
  if (!currentUser){ openAuthModal(); return; }
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  if (!url) return;
  const pid = hashUrl(url);
  const map = placeBmMap();
  const was = !!map[pid];
  const prev = map[pid];
  if (was){ delete map[pid]; }
  else {
    map[pid] = { url: mapsUrl || url, key: url, name: name || 'Place', category: category || '', cityId: cityId || '', cityName: (typeof cityNameOf === 'function' ? (cityNameOf(cityId) || '') : ''), area: area || '', ownerUid: ownerUid || null }; // r72r-1: اسم المدينة للمفكرة // ر٦٩خ: المفتاح هوية، والرابط للخريطة
    mpTrack.hit('bookmark_add');
    mpData.users.flag(currentUser.uid, 'hasBookmarked').catch(()=>{});
  }
  userListData.placeBookmarks = map;
  
  if (currentTab === 'Places') renderPlacesBody();
  if (currentTab === 'Community') renderCommunityModal(); // ر٦٩ذ (N-062): إعادة الرسم عبر المدخل الموحَّد (يعيد الطبقة المفتوحة بحاويتها)
  if (currentTab === 'Curators') renderCuratorsBody(); // r72r-1: حالة المفكرة تتحدث فورًا بصفحة المنتقي
  try{
    await mpData.bookmarks.setPlace(currentUser.uid, pid, was ? null : map[pid]);
  }catch(e){
    if (was) map[pid] = prev; else delete map[pid];   // ر٦٠: تراجع تفاؤلي — لا حالة شبح
    userListData.placeBookmarks = map;
     if (currentTab === 'Places') renderPlacesBody();
    showToast('Could not update bookmark — ' + ((e && (e.code || e.message)) || 'unknown')); return;
  }
  if (was) showUndoToast('Removed from your bookmarks', function(){ togglePlaceBookmark(url, name, category, cityId, area, ownerUid, mapsUrl); });
}
// مفكرة القائمة — على قائمة مدينة لشخص بعدّاد (المبدأ التاسع) — سجل + عدّاد بدفعة ذرّية واحدة (قواعد ٣٫٨)
async function toggleListBookmark(ownerUid, cityId){
  if (!currentUser){ openAuthModal(); return; }
  if (ownerUid === currentUser.uid){ showToast('This is your list — bookmarks count others, not you'); return; } // ر٦٠: المبدأ التاسع بالواجهة كما بالقواعد
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  await ensureListBookmarks();
  const listId = ownerUid + '_' + cityId;
  const on = !listBookmarksMap[listId];
  if (on){
    listBookmarksMap[listId] = { listId: listId, ownerUid: ownerUid, cityId: cityId };
    if (userListData){ userListData.listBookmarkIds = userListData.listBookmarkIds || {}; userListData.listBookmarkIds[listId] = true; } // ر٦٩ط: المرآة محليًّا فورًا
    mpTrack.hit('bookmark_add');
    mpData.users.flag(currentUser.uid, 'hasBookmarked').catch(()=>{});
  } else { delete listBookmarksMap[listId]; if (userListData && userListData.listBookmarkIds) delete userListData.listBookmarkIds[listId]; }
  const c = (typeof viewingUserCities !== 'undefined' && viewingUserCities) ? viewingUserCities.find(function(x){ return x.id === cityId; }) : null;
  if (c) c.bookmarkCount = Math.max(0, (c.bookmarkCount || 0) + (on ? 1 : -1));
  renderCommunityModal();
  try{
    await mpData.bookmarks.toggleList(currentUser.uid, ownerUid, cityId, on);
    logTiming('BOOKMARK list ' + listId + ' on=' + on + ' → OK (record+counter+mirror written)'); // ر٦٩ن: تشخيص ميداني
  }catch(e){
    logTiming('BOOKMARK list ' + listId + ' on=' + on + ' → ERROR ' + ((e && (e.code + ' ' + (e.message || ''))) || e)); // ر٦٩ن
    if (on) delete listBookmarksMap[listId]; else listBookmarksMap[listId] = { listId: listId, ownerUid: ownerUid, cityId: cityId };
    if (c) c.bookmarkCount = Math.max(0, (c.bookmarkCount || 0) + (on ? -1 : 1));
    renderCommunityModal();
    showToast('Could not update bookmark — ' + ((e && (e.code || e.message)) || 'unknown')); return;
  }
  renderCommunityModal(); // ر٦٩ط: العدّاد من الخادم بعد اكتمال الكتابة (كان يُقرأ قبلها فيبدو غير مستقر)
  if (!on) showUndoToast('Removed from your bookmarks', function(){ toggleListBookmark(ownerUid, cityId); });
}
// حفظ الرحلة — على رحلات الآخرين بعدّاده؛ المحفوظة مؤشر لأصل حي (التملك بالنسخ — المحطة ٤)
function isSelfTripBookmarked(id){ return !!(userListData && userListData.tripSelfBookmarks && userListData.tripSelfBookmarks[id]); }
function addrModalDelete(){ if (!addrEditRef) return; const r = addrEditRef; closeAddrModal(); deleteAddr(r.cityId, r.catId, r.index); }
function mpSwallow(e, ctx){ // ر٦٤: بديل الابتلاع الصامت — يعدّ بعدّاد الأخطاء القائم (Other) ويطبع بوضع التصحيح
  try{ if (typeof mpTrack !== 'undefined' && mpTrack.trapError) mpTrack.trapError('Other'); }catch(_){}
  try{ console.warn('[MyPickz][swallowed]', ctx || '', (e && e.code) || (e && e.message) || e); }catch(_){}
}
async function toggleTripSelfBookmark(tripId){
  if (!currentUser){ openAuthModal(); return; }
  if (currentUserSuspended){ showToast("Your account is suspended — you can't save changes"); return; }
  const map = (userListData.tripSelfBookmarks = userListData.tripSelfBookmarks || {});
  const was = !!map[tripId];
  if (was) delete map[tripId]; else map[tripId] = true;
  renderTripsBody();
  try{ await mpData.tripSaves.setSelf(currentUser.uid, tripId, !was); mpTrack.hit('bookmark_add'); }
  catch(e){ if (was) map[tripId] = true; else delete map[tripId]; renderTripsBody(); showToast('Could not update bookmark — ' + ((e && (e.code || e.message)) || 'unknown')); return; }
  if (was) showUndoToast('Removed from your bookmarks', function(){ toggleTripSelfBookmark(tripId); });
}
function exportOwnTripRow(id){ currentTripId = id; viewingSharedTrip = false; openTripDetail(id).then(function(){ exportTripText(); }).catch(function(){ exportTripText(); }); }
// ر٦١ · التصدير على العام: نسبة المصدر باسم صاحبه ثم توقيع التطبيق — المركّب الموقَّع نفسه
async function exportOtherList(ownerUid, cityId){
  try{
    const d = await mpData.cityLists.get(ownerUid, cityId);
    if (!d){ showToast('List is no longer available'); return; }
    let out = '📍 ' + (d.cityName || cityId) + ' — a MyPickz list by ' + (d.nickname || 'a MyPickz user') + '\n';
    Object.keys(d.categories || {}).forEach(function(catId){
      const entry = d.categories[catId];
      const all = ((entry && entry.places) || []).filter(function(q){ return q && (q.name || q.url); });
      if (!all.length) return;
      out += '\n' + catId + '\n';
      all.forEach(function(q){
        out += '• ' + (q.name || 'Place') + (q.area ? ' — ' + q.area : '') + '\n';
        if (q.url) out += '  ' + q.url + '\n';
      });
    });
    mpSendText(out + '\nSent via MyPickz · mypickz.app'); statsExportFor('olist', ownerUid + '_' + cityId); /* ب-٢-١ */
  }catch(e){ showToast('Could not build the message'); }
}
async function exportOtherTrip(tripId){
  try{
    const doc = await mpData.trips.getDoc(tripId);
    if (!doc.exists){ showToast('Trip is no longer available'); return; }
    const t = { id: tripId, ...doc.data() };
    const days = await resolveTripPlaces(t);
    let out = '🧳 ' + (t.customLabel ? (t.cityName + ' — ' + t.customLabel) : (t.cityName || 'Trip')) + ' — a MyPickz trip\n';
    (days || []).forEach(function(day){
      out += '\nDay ' + day.dayNumber + '\n';
      Object.keys(day.places || {}).forEach(function(cat){
        (day.places[cat] || []).forEach(function(pl){
          out += '• ' + ((pl && pl._available) ? (pl.name || 'Place') : 'Place no longer available') + '\n';
          if (pl && pl._available && pl.url) out += '  ' + pl.url + '\n';
        });
      });
    });
    mpSendText(out + '\nSent via MyPickz · mypickz.app'); try{ if (t.ownerId && currentUser && t.ownerId !== currentUser.uid && mpIsVerified(t.ownerId)) mpTrack.statsCurator(t.ownerId, 'export'); }catch(_){} /* ب-٢-١ */
  }catch(e){ showToast('Could not build the message'); }
}
async function toggleTripSave(tripId){
  if (!currentUser){ openAuthModal(); return; }
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  await ensureTripSaves();
  const on = !tripSavesMap[tripId];
  if (on){
    tripSavesMap[tripId] = { tripId: tripId };
    if (userListData){ userListData.tripSaveIds = userListData.tripSaveIds || {}; userListData.tripSaveIds[tripId] = true; }
    mpTrack.hit('trip_save');
  } else { delete tripSavesMap[tripId]; if (userListData && userListData.tripSaveIds) delete userListData.tripSaveIds[tripId]; }
  if (currentTab === 'Community') renderCommunityModal();
  if (currentTab === 'Trips') renderTripsBody();
  try{
    await mpData.tripSaves.toggle(currentUser.uid, tripId, on);
    logTiming('SAVE trip ' + tripId + ' on=' + on + ' → OK (record+counter+mirror written)'); // ر٦٩ن
  }catch(e){
    logTiming('SAVE trip ' + tripId + ' on=' + on + ' → ERROR ' + ((e && (e.code + ' ' + (e.message || ''))) || e)); // ر٦٩ن
    if (on) delete tripSavesMap[tripId]; else tripSavesMap[tripId] = { tripId: tripId };
    if (typeof viewingUserUid !== 'undefined' && viewingUserUid) renderCommunityModal();
    if (currentTab === 'Trips') renderTripsBody();
    showToast('Could not update bookmark — ' + ((e && (e.code || e.message)) || 'unknown')); return;
  }
  if (currentTab === 'Community') renderCommunityModal(); // العدّاد من الخادم بعد الكتابة
  if (!on) showUndoToast('Removed from your bookmarked trips', function(){ toggleTripSave(tripId); });
}

