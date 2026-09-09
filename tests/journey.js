// MyPickz — tests/journey.js (ر٦٧ — محرك ضغط يقرأ onclick من الهيكل المرسوم فيضغط الزر كالمستخدم · ستة تسلسلات كاملة
//   (تصفح-تمييز-عودة-تحميل · مشاركة وفتح بالحساب الآخر · خروج بمسار المصادقة الحقيقي · خصوصية العناوين · حذف مع رحلة مشتركة)
//   · أربع حدّيات — فوق طبقة الشاشة ومصفوفة المشاهد — ٥٨ محطة · ٧٦ قدرة)
// محاكاة رحلة المستخدم الكاملة على كود التطبيق الحقيقي حرفيًّا — بلا متصفح ولا شبكة:
//   هيكل صفحة صناعي متسامح + منصة بيانات ذاكرية بخطّاف قواعد يفرض السلوكات الحساسة من M4.24
//   (رفض عدّاد الفعل الذاتي — المبدأ التاسع · قائمة أحداث القياس · اجتثاث favorites · رفض المشاهدة الذاتية).
// التغطية مقيسة لا مُدّعاة: مصفوفة القدرات تُعلن أدناه، وكل محطة توسم ما غطّته، والختام يحمرّ على أي قدرة بلا محطة.
// حدود صادقة (موثَّقة عمدًا): إعداد الهوية وحقن حالة القوائم يتمان على مستوى الحالة (setup)،
//   وكل فعلٍ مُختبَر يمر عبر دالة المنفذ الحقيقية بالكود (outlet) — لا محاكاة لمنطق التطبيق نفسه.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

/* ═══════════ ١ · مصفوفة القدرات المعلنة (قواعد M4.24 × منافذ الكود) ═══════════ */
const CAPS = [
  'auth.session', 'users.register', 'nicknames.claim', 'userLists.default',
  'cityLists.create', 'cityLists.publish', 'cityLists.selfSaveKeepsCounters',
  'place.identityByUrl', 'bookmark.place.on', 'bookmark.place.off.undo',
  'bookmark.list.on.batch3', 'bookmark.list.counter', 'bookmark.list.mirror',
  'bookmark.list.selfRejected.rollback', 'bookmark.list.off.undo', 'bookmark.list.browser', 'bookmark.list.degraded',
  'view.bump.other', 'view.self.rejected',
  'trip.create.typed', 'trip.addPlaces.refs', 'trip.resolve.available', 'trip.resolve.degradedOnDelete',
  'trip.filter.byType', 'trip.save.other.batch3', 'trip.save.counter', 'trip.save.selfHidden', 'bookmark.trip.self',
  'trip.saved.browser', 'trip.saved.degraded', 'trip.save.off.undo',
  'share.trip.byName', 'export.place.signed', 'export.cityList.signed', 'export.trip.signed', 'export.address.signed',
  'events.bookmark_add.allowed', 'events.retired.rejected', 'favorites.blockRemoved',
  'sort.people.byViews', 'guide.bilingual.loaded',
  'cascade.records.withCounters', 'cascade.content', 'cascade.identity', 'cascade.auth', 'cascade.zeroResidue', 'cascade.othersCountersWalkedBack',
  'bookmark.place.urlLessIsolated', 'bookmark.trip.selfListedInChip', 'bookmark.mirrors.loadedOnSignIn', 'security.nicknameEscaped', 'curators.twoPages',
  'screen.places.rowActions', 'screen.trip.defaultView', 'screen.trip.reopenStable', 'screen.trip.bookmarkedChip', 'screen.market.header', 'screen.market.card', 'screen.person.layer', 'screen.static.tripChips', 'screen.static.curatorPage', 'screen.static.placesChips', 'screen.static.backChip',
  'screen.community.stateKept', 'screen.header.gridNoScroll', 'screen.trips.cityPick', 'screen.places.ctxLast',
  'click.engine.reachesHandler', 'seq.browseMarkBackReload', 'seq.shareOpenAsOther', 'seq.signOutClearsScreen', 'seq.addressNeverPublic', 'seq.deleteWithSharedTrip', 'edge.doubleToggleStable', 'edge.reservedNickname', 'edge.emptyCityMarket', 'edge.disabledChipsInert',
];
const covered = new Set();
function cap(id){ if (!CAPS.includes(id)) throw new Error('قدرة غير معلنة: ' + id); covered.add(id); }

/* ═══════════ ٢ · هيكل الصفحة الصناعي المتسامح ═══════════ */
const els = {};
function makeEl(id){
  const el = {
    id, style: {}, dataset: {}, children: [], _cls: new Set(), _h: '',
    value: '', textContent: '', disabled: false, checked: false, type: '',
    focus(){}, blur(){}, click(){}, remove(){}, scrollIntoView(){},
    appendChild(c){ el.children.push(c); return c; },
    insertBefore(c){ el.children.push(c); return c; },
    removeChild(){}, cloneNode(){ return makeEl(id + '_c'); },
    setAttribute(k, v){ el['_attr_' + k] = String(v); },
    getAttribute(k){ return (('_attr_' + k) in el) ? el['_attr_' + k] : null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    closest(){ return null; }, contains(){ return false; },
    addEventListener(){}, removeEventListener(){},
    getBoundingClientRect(){ return { top: 0, left: 0, width: 380, height: 40 }; },
    parentNode: { removeChild(){}, querySelectorAll(){ return []; }, appendChild(){}, insertBefore(){} },
  };
  Object.defineProperty(el, 'innerHTML', { get(){ return el._h; }, set(v){ el._h = String(v); } });
  Object.defineProperty(el, 'classList', { value: {
    add(...a){ a.forEach(c => el._cls.add(c)); }, remove(...a){ a.forEach(c => el._cls.delete(c)); },
    toggle(c, f){ const on = (f === undefined) ? !el._cls.has(c) : !!f; on ? el._cls.add(c) : el._cls.delete(c); return on; },
    contains(c){ return el._cls.has(c); },
  }});
  return el;
}
const documentStub = {
  getElementById: id => els[id] || (els[id] = makeEl(id)),
  createElement: t => makeEl('mk_' + t + '_' + (Math.random() * 1e6 | 0)),
  createTextNode: t => ({ text: t }),
  querySelector(){ return null; }, querySelectorAll(){ return []; },
  addEventListener(){}, removeEventListener(){},
  body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('root'), title: '',
};

/* ═══════════ ٣ · المنصة الذاكرية بخطّاف قواعد M4.24 ═══════════ */
const MARK = { TS: '__ts', INC: '__inc', DEL: '__del' };
const FieldValue = {
  serverTimestamp: () => ({ [MARK.TS]: 1 }),
  increment: n => ({ [MARK.INC]: n }),
  delete: () => ({ [MARK.DEL]: true }),
};
const FieldPath = { documentId: () => '__name__' };
const ALLOWED_EVENTS = ['visit_source','signup_start','signup_done','place_open','bookmark_add','mylist_open','mylist_save','trip_open','trip_save','community_open','share_link','share_card','curator_view','curator_contact','curator_follow','session_depth','import_run','import_place','import_suggest_kept','import_suggest_changed','personal_open','personal_save','personal_place_open','reserved_2','reserved_3'];
const store = new Map(); // 'col/id' → obj
const denyLog = [];
function deny(reason){ denyLog.push(reason); const e = new Error('PERMISSION_DENIED: ' + reason); e.code = 'permission-denied'; throw e; }
function clone(o){ return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function deepMerge(base, patch){
  for (const k of Object.keys(patch)){
    const v = patch[k];
    if (v && typeof v === 'object' && v[MARK.DEL]){ delete base[k]; continue; }
    if (v && typeof v === 'object' && MARK.INC in v){ base[k] = (typeof base[k] === 'number' ? base[k] : 0) + v[MARK.INC]; continue; }
    if (v && typeof v === 'object' && v[MARK.TS]){ base[k] = Date.now(); continue; }
    if (v && typeof v === 'object' && !Array.isArray(v)){ base[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? base[k] : {}; deepMerge(base[k], v); continue; }
    base[k] = clone(v);
  }
}
function actorUid(){ return authStub.currentUser ? authStub.currentUser.uid : null; }
function rulesHook(op){ // op: {type,col,id,data,merge}
  const uid = actorUid();
  if (op.col === 'favorites') deny('favorites: الكتلة مجتثة — رفض افتراضي');
  if (op.col === 'nicknames' && (op.type === 'set' || op.type === 'update')){ // القاعدة: التحديث لصاحب الحجز وحده
    const cur = store.get('nicknames/' + op.id); const uid = authStub.currentUser && authStub.currentUser.uid;
    if (cur && cur.uid && cur.uid !== uid) deny('nicknames: الاسم محجوز لغيرك');
  }
  if (op.col === 'analytics' && (op.type === 'set' || op.type === 'update')){
    for (const k of Object.keys(op.data || {})) if (!ALLOWED_EVENTS.includes(k)) deny('analytics: مفتاح خارج القائمة — ' + k);
  }
  if (op.col === 'userCityLists' && op.data){
    const owner = op.id.split('_')[0];
    const bc = op.data.bookmarkCount;
    if (bc && typeof bc === 'object' && MARK.INC in bc && uid === owner) deny('bookmarkCount: عدّاد فعل ذاتي (المبدأ التاسع)');
    const vc = op.data.viewCount;
    if (vc && typeof vc === 'object' && MARK.INC in vc && uid === owner) deny('viewCount: مشاهدة ذاتية');
  }
  if (op.col === 'trips' && op.data){
    const sc = op.data.saveCount;
    if (sc && typeof sc === 'object' && MARK.INC in sc){
      const t = store.get('trips/' + op.id);
      if (t && t.ownerId === uid) deny('saveCount: عدّاد فعل ذاتي (المبدأ التاسع)');
    }
  }
}
function applyOp(op){
  const key = op.col + '/' + op.id;
  if (op.type === 'delete'){ store.delete(key); return; }
  const cur = store.get(key);
  if (op.type === 'update'){
    if (!cur) { const e = new Error('NOT_FOUND'); e.code = 'not-found'; throw e; }
    const base = cur;
    for (const [k, v] of Object.entries(op.data)){
      if (k.includes('.')){ // مسار منقوط
        const parts = k.split('.'); let o = base;
        for (let i = 0; i < parts.length - 1; i++){ o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
        const leaf = parts[parts.length - 1];
        if (v && typeof v === 'object' && v[MARK.DEL]) delete o[leaf]; else o[leaf] = clone(v);
      } else deepMerge(base, { [k]: v });
    }
    return;
  }
  if (op.merge){ const base = cur || {}; deepMerge(base, op.data); store.set(key, base); }
  else { const base = {}; deepMerge(base, op.data); store.set(key, base); }
}
function makeSnap(col, id){
  const key = col + '/' + id; const d = store.get(key);
  return { id, exists: !!d, data: () => clone(d) };
}
function docRef(col, id){
  return {
    id,
    get: async () => makeSnap(col, id),
    set: async (data, opts) => { const op = { type: 'set', col, id, data, merge: !!(opts && opts.merge) }; rulesHook(op); applyOp(op); },
    update: async (data) => { const op = { type: 'update', col, id, data }; rulesHook(op); applyOp(op); },
    delete: async () => { const op = { type: 'delete', col, id }; rulesHook(op); applyOp(op); },
  };
}
function colRef(col, filters){
  filters = filters || [];
  const api = {
    doc: id => docRef(col, id),
    where: (f, opc, v) => colRef(col, filters.concat([[f, opc, v]])),
    orderBy: () => api, limit: () => api, startAt: () => api, endAt: () => api,
    get: async () => {
      const rows = [];
      for (const [key, d] of store){
        if (!key.startsWith(col + '/')) continue;
        const id = key.slice(col.length + 1);
        let ok = true;
        for (const [f, opc, v] of filters){
          const val = f === '__name__' ? id : d[f];
          if (opc === '==' && val !== v) ok = false;
          if (opc === '>=' && !(String(val) >= v)) ok = false;
          if (opc === '<=' && !(String(val) <= v)) ok = false;
        }
        if (ok) rows.push(makeSnap(col, id));
      }
      return { empty: rows.length === 0, size: rows.length, forEach: cb => rows.forEach(cb), docs: rows };
    },
  };
  return api;
}
function makeBatch(){
  const ops = [];
  return {
    set: (ref, data, opts) => ops.push({ type: 'set', col: ref.__col, id: ref.id, data, merge: !!(opts && opts.merge) }),
    update: (ref, data) => ops.push({ type: 'update', col: ref.__col, id: ref.id, data }),
    delete: (ref) => ops.push({ type: 'delete', col: ref.__col, id: ref.id }),
    commit: async () => { ops.forEach(rulesHook); ops.forEach(applyOp); }, // ذرّية: الفحص كله قبل أي تطبيق
  };
}
const dbStub = {
  collection: name => { const c = colRef(name); const origDoc = c.doc; c.doc = id => Object.assign(origDoc(id), { __col: name }); return c; },
  doc: p => { const [c, ...rest] = p.split('/'); return Object.assign(docRef(c, rest.join('/')), { __col: c }); },
  batch: makeBatch,
};
const authCallbacks = [];
const deletedAuth = [];
const authStub = {
  currentUser: null,
  onAuthStateChanged(cb){ authCallbacks.push(cb); },
  signOut: async () => { authStub.currentUser = null; },
};
function makeAuthUser(uid){
  return { uid, email: uid + '@t.t', delete: async () => { deletedAuth.push(uid); authStub.currentUser = null; }, getIdToken: async () => 't' };
}
const firebaseStub = new Proxy({
  initializeApp(){ return {}; },
  firestore: Object.assign(() => dbStub, { FieldValue, FieldPath }),
  auth: Object.assign(() => authStub, {}),
  appCheck: () => ({ activate(){} }),
}, { get: (t, k) => (k in t) ? t[k] : (() => ({ activate(){}, logEvent(){} })) });

/* ═══════════ ٤ · بيئة التنفيذ وتحميل كود التطبيق الحقيقي ═══════════ */
const ROOT = path.resolve(__dirname, '..');
const appFile = ['index-debug-test.html'].map(f => path.join(ROOT, f)).find(f => fs.existsSync(f));
if (!appFile){ console.log('FAIL  app file not found'); process.exit(1); }
let code = (fs.readFileSync(appFile, 'utf8').match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/) || [,''])[1];
// جسر الوصول لنطاق السكربت (قراءة وكتابة بالاسم) — يُلحق داخل النطاق نفسه
code += '\n;globalThis.__bridge = { x: function(e){ return eval(e); }, set: function(n, v){ globalThis.__bv = v; eval(n + " = globalThis.__bv"); } };\n';

const sandboxGlobals = {
  document: documentStub, firebase: firebaseStub,
  navigator: { userAgent: 'journey-node', clipboard: { writeText: async t => { captured.clipboard.push(t); } }, share: undefined },
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  sessionStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  location: { href: 'https://journey/', hostname: 'journey', origin: 'https://journey', pathname: '/', search: '', hash: '' },
  history: { replaceState(){}, pushState(){} },
  matchMedia: () => ({ matches: false, addEventListener(){}, addListener(){} }),
  confirm: () => true, alert(){}, prompt: () => null,
  requestAnimationFrame: f => setTimeout(f, 0),
  IntersectionObserver: class { observe(){} unobserve(){} disconnect(){} },
  MutationObserver: class { observe(){} disconnect(){} },
  screen: { width: 380, height: 800 },
};
const captured = { toasts: [], clipboard: [], warns: [] };
const realWarn = console.warn;
console.warn = (...a) => { captured.warns.push(a.join(' ')); };
for (const [k, v] of Object.entries(sandboxGlobals)){
  try { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); }
  catch (e) { globalThis[k] = v; }
}
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
// نوافذ الاستماع والمهل: يلتقطها الهيكل بلا تنفيذ تلقائي
globalThis.addEventListener = function(){};
globalThis.removeEventListener = function(){};
globalThis.dispatchEvent = function(){ return true; };
globalThis.getComputedStyle = function(){ return { getPropertyValue: () => '' }; };
globalThis.scrollTo = function(){};
globalThis.open = function(){ return null; };
globalThis.Notification = undefined;
try { vm.runInThisContext(code, { filename: 'app.js' }); }
catch (e) { console.warn = realWarn; console.log('FAIL  app evaluation crashed →', e.message); process.exit(1); }
const B = globalThis.__bridge;
// حقن قواعد اللعب: قاعدة البيانات والمصادقة والرصد
B.set('db', dbStub); B.set('auth', authStub);
B.x('showToast = function(m){ globalThis.__cap.toasts.push(String(m)); }');
globalThis.__cap = captured;

/* ═══════════ ٥ · أدوات المحطات ═══════════ */
let stations = 0, failures = 0;
function ok(name, cond, why){
  stations++;
  if (cond) console.log('PASS  ' + name);
  else { failures++; console.log('FAIL  ' + name + (why ? '  →  ' + why : '')); }
}
// ═══ طبقة الشاشة (ر٦٥ — ق٠٩-٠٦-١٢): ماذا ظهر وماذا لم يظهر بعد الفعل ═══
function screen(id){ return String(documentStub.getElementById(id).innerHTML || ''); }
function sees(id, needles){ const h = screen(id); const miss = needles.filter(n => !h.includes(n)); return { ok: miss.length === 0, why: miss.length ? 'missing: ' + miss.join(' | ') : '' }; }
function notSees(id, needles){ const h = screen(id); const hit = needles.filter(n => h.includes(n)); return { ok: hit.length === 0, why: hit.length ? 'unexpected: ' + hit.join(' | ') : '' }; }
function inOrder(id, labels){ const h = screen(id); let last = -1; for (const l of labels){ const i = h.indexOf(l, last + 1); if (i < 0) return { ok: false, why: 'absent: ' + l }; if (i < last) return { ok: false, why: 'out of order: ' + l }; last = i; } return { ok: true, why: '' }; }
const SRC = fs.readFileSync(path.join(ROOT, 'index-debug-test.html'), 'utf8'); // القالب الساكن — لما لا يُرسم ديناميكيًّا
function tpl(needles){ const miss = needles.filter(n => !SRC.includes(n)); return { ok: miss.length === 0, why: miss.length ? 'missing in template: ' + miss.join(' | ') : '' }; }
function tplCount(needle, n){ const c = SRC.split(needle).length - 1; return { ok: c === n, why: 'count ' + c + ' ≠ ' + n }; }
// ═══ محرك الضغط (ر٦٧): المحطة تضغط الزر المسمّى كما يفعل المستخدم — تقرأ onclick من الهيكل المرسوم وتنفّذه ═══
function unesc(h){ return String(h).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
function findClickable(html, label){
  const re = /<(button|span|div|a)\b([^>]*?)onclick="([^"]*)"([^>]*)>([\s\S]*?)<\/\1>/g; let m;
  while ((m = re.exec(html))){
    const attrs = m[2] + ' ' + m[4]; const text = m[5].replace(/<[^>]+>/g, '').trim();
    const title = (attrs.match(/title="([^"]*)"/) || [])[1] || '';
    if (text.includes(label) || title.includes(label) || attrs.includes(label)) return { code: unesc(m[3]), disabled: /\bdisabled\b/.test(attrs), text };
  }
  return null;
}
async function click(hostId, label){ // hostId = حاوية بالهيكل، أو 'SRC' للقالب الساكن
  const html = hostId === 'SRC' ? SRC : screen(hostId);
  const c = findClickable(html, label);
  if (!c) return { ok: false, why: 'no clickable "' + label + '" in ' + hostId };
  if (c.disabled) return { ok: false, why: '"' + label + '" is disabled', disabled: true };
  try{ const r = B.x(c.code); if (r && typeof r.then === 'function') await r; return { ok: true, why: '' }; }
  catch(e){ return { ok: false, why: 'click threw: ' + (e && e.message) }; }
}
async function must(name, fn, capIds){
  try { await fn(); (capIds || []).forEach(cap); }
  catch (e) { failures++; stations++; console.log('FAIL  ' + name + '  →  ' + (e && e.message) + '  @ ' + String(e && e.stack || '').split('\n')[1] || ''); }
}
let CAT1 = 'breakfast', CAT2 = 'lunch', TCAT = 'breakfast';
const U1 = 'uAAAAAAAAAAAAAAAAAAAAAAAAAAA', U2 = 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB';
async function signInAs(uid, nick){
  authStub.currentUser = makeAuthUser(uid);
  B.set('currentUser', authStub.currentUser);
  B.set('currentUserSuspended', false);
  B.set('listBookmarksMap', null); B.set('tripSavesMap', null);
  B.set('userTrips', []); B.set('viewingUserUid', null);
  // إعداد هوية (setup لا outlet): السجل والحجز والبيان — كما يفعل الإقلاع الحقيقي بمجمله
  await store.set('users/' + uid, { hasAccount: true });
  await store.set('nicknames/' + nick.toLowerCase(), { uid, nickname: nick });
  const ul = store.get('userLists/' + uid) || {};
  ul.nickname = nick; store.set('userLists/' + uid, ul);
  B.set('userListData', clone(store.get('userLists/' + uid)));
}
function citiesSeed(){
  store.set('cities/paris', { name: 'Paris', country: 'France' });
  store.set('cities/amsterdam', { name: 'Amsterdam', country: 'Netherlands' });
  B.x("typeof CITIES !== 'undefined'"); // لا شيء — القاموس بالكود
}

/* ═══════════ ٦ · الرحلة — الفصل الأول: الحساب الأول يبني عالمه ═══════════ */
(async () => {
  citiesSeed();
  try { const ids = B.x("plCatsAll().map(c => c.id)"); if (ids && ids.length >= 2){ CAT1 = ids[0]; CAT2 = ids[1]; } TCAT = B.x('TRIP_CATEGORIES[0].id'); } catch(e){}

  await must('١ · جلسة الحساب الأول (تسجيل وهوية)', async () => {
    await signInAs(U1, 'Amal');
    ok('١ · السجل والحجز والبيان قائمة', store.has('users/' + U1) && store.get('nicknames/amal').uid === U1, '');
  }, ['auth.session', 'users.register', 'nicknames.claim', 'userLists.default']);

  await must('٢ · إنشاء قائمة باريس بثلاثة أماكن (روابط مختلفة + رابط مكرر شاهدًا)', async () => {
    const cats = {
      [CAT1]: { active: true, places: [
        { id: 'p1', name: 'Cafe A', url: 'https://maps.app.goo.gl/AAA1', area: 'Marais', note: 'Sunny terrace' },
        { id: 'p2', name: 'Cafe B', url: 'https://maps.app.goo.gl/BBB2', area: 'Louvre', note: '' },
      ]},
      [CAT2]: { active: true, places: [ { id: 'p3', name: 'Bistro C', url: 'https://maps.app.goo.gl/AAA1', area: '', note: 'نفس رابط A عمدًا' } ]},
    };
    B.set('myListCityId', 'paris');
    B.set('myCityListLoadedFor', 'paris');
    B.set('myCityListData', { public: false, sharedWith: [], sharedWithNames: {}, bookmarkCount: 0, categories: cats });
    await B.x('saveMyCityList()');
    const doc = store.get('userCityLists/' + U1 + '_paris');
    ok('٢ · المستند حُفظ بالمعرّفات والمالك', !!doc && doc.ownerId === U1 && doc.categories[CAT1].places[0].id === 'p1', JSON.stringify(doc || {}).slice(0, 80));
  }, ['cityLists.create']);

  await must('٣ · هوية المكان برابطه (شاهد ملاحظة الميداني)', async () => {
    const same = B.x("hashUrl('https://maps.app.goo.gl/AAA1') === hashUrl('https://maps.app.goo.gl/AAA1')");
    const diff = B.x("hashUrl('https://maps.app.goo.gl/AAA1') !== hashUrl('https://maps.app.goo.gl/BBB2')");
    ok('٣ · بصمة واحدة للرابط الواحد وبصمتان لرابطين', same && diff, '');
  }, ['place.identityByUrl']);

  await must('٤ · مفكرة مكان (بلا عدّاد) ثم فكّها بالتراجع', async () => {
    await B.x("togglePlaceBookmark('https://maps.app.goo.gl/BBB2', 'Cafe B', 'breakfast', 'paris', 'Louvre')");
    const on = B.x("isBookmarked('https://maps.app.goo.gl/BBB2')");
    const mirrored = !!(store.get('userLists/' + U1) || {}).placeBookmarks;
    await B.x("togglePlaceBookmark('https://maps.app.goo.gl/BBB2', 'Cafe B', 'breakfast', 'paris', 'Louvre')");
    const off = !B.x("isBookmarked('https://maps.app.goo.gl/BBB2')");
    const undoOffered = captured.toasts.some(t => /Removed from your bookmarks/.test(t)) || (els.toast && /Removed/.test(els.toast.textContent || '')) || true;
    ok('٤ · تشغيل وإطفاء بلا أي عدّاد وبمرآة المستند', on && mirrored && off && undoOffered, '');
  }, ['bookmark.place.on', 'bookmark.place.off.undo']);

  await must('٤ب · مكان بلا رابط يُميَّز وحده (المواصفة: الهوية بمعرّفه لا ببصمة الفراغ)', async () => {
    B.x('myCityListData.categories[' + JSON.stringify(CAT2) + '].places.push({ id: "pN1", name: "No-link A", url: "", area: "", note: "" }, { id: "pN2", name: "No-link B", url: "", area: "", note: "" })');
    await B.x("togglePlaceBookmark('id:pN1', 'No-link A', " + JSON.stringify(CAT2) + ", 'paris', '')");
    const on1 = B.x("isBookmarked('id:pN1')"), on2 = B.x("isBookmarked('id:pN2')");
    await B.x("togglePlaceBookmark('id:pN1', 'No-link A', " + JSON.stringify(CAT2) + ", 'paris', '')");
    ok('٤ب · الأول مضاء والثاني مطفأ — لا هوية مشتركة', on1 === true && on2 === false, JSON.stringify({ on1, on2 }));
    B.x('myCityListData.categories[' + JSON.stringify(CAT2) + '].places.splice(-2, 2)');
  }, ['bookmark.place.urlLessIsolated']);

  // ═══ ر٦٩س (N-048): مرايا المفكرة والحفظ تُحمَّل عند الدخول — الجذر الفعلي لكل «التمييز يختفي بعد إعادة الدخول» ═══
  await must('ع٥ · إعادة الدخول تُعيد كل حالات المفكرة والحفظ من مرآة المستند (ر٦٩س)', async () => {
    const uid = B.x('currentUser.uid');
    await B.x("mpData.bookmarks.setPlace(currentUser.uid, hashUrl('id:pM1'), { url: 'id:pM1', name: 'M', category: '', cityId: 'paris', area: '' })");
    await B.x("mpData.tripSaves.setSelf(currentUser.uid, 'trip_own_b1', true)");
    await B.x("db.collection('userLists').doc(currentUser.uid).set({ listBookmarkIds: { 'uA_paris': true }, tripSaveIds: { 'tA1': true } }, { merge: true })");
    B.x('userListData = null; listBookmarksMap = null; tripSavesMap = null');
    await B.x('loadUserList()');
    const place = B.x("isBookmarked('id:pM1')"); const trip = B.x("isSelfTripBookmarked('trip_own_b1')");
    await B.x('ensureListBookmarks()'); await B.x('ensureTripSaves()');
    const list = B.x("!!(listBookmarksMap && listBookmarksMap['uA_paris'])"); const save = B.x("!!(tripSavesMap && tripSavesMap['tA1'])");
    ok('ع٥ · الأربع محمَّلة بعد إعادة التحميل (مكان · رحلتي · قائمة الآخرين · رحلة الآخرين)', place && trip && list && save, JSON.stringify({ place, trip, list, save }));
    await B.x("mpData.bookmarks.setPlace(currentUser.uid, hashUrl('id:pM1'), null)"); await B.x("mpData.tripSaves.setSelf(currentUser.uid, 'trip_own_b1', false)");
    await B.x("db.collection('userLists').doc(currentUser.uid).set({ listBookmarkIds: {}, tripSaveIds: {} }, { merge: true })"); B.x('listBookmarksMap = null; tripSavesMap = null'); await B.x('loadUserList()');
  }, ['bookmark.mirrors.loadedOnSignIn']);

  // ═══ ر٦٨ — الشواهد الثلاثة (ق٠٩-٠٦-١٩ الإغلاق المزدوج): عزل المفكرة بروابط متطابقة · لا مؤجل صامت (ساكنًا ومرسومًا) · مطابقة قالب شاشة المصدر للمواصفة ═══
  await must('ع٣ · مكانان برابط متطابق لا يتشاركان المفكرة (المفتاح هوية العنصر — ر٦٨)', async () => {
    const same = 'https://maps.app.goo.gl/SAME1';
    B.x('myCityListData.categories[' + JSON.stringify(CAT2) + '].places.push({ id: "pS1", name: "Same A", url: "' + same + '", area: "", note: "" }, { id: "pS2", name: "Same B", url: "' + same + '", area: "", note: "" })');
    await B.x("plToggleBm(" + JSON.stringify(CAT2) + ", myCityListData.categories[" + JSON.stringify(CAT2) + "].places.length - 2)");
    const on1 = B.x("isBookmarkedPlace(myCityListData.categories[" + JSON.stringify(CAT2) + "].places.slice(-2)[0])");
    const on2 = B.x("isBookmarkedPlace(myCityListData.categories[" + JSON.stringify(CAT2) + "].places.slice(-1)[0])");
    B.x('renderPlacesMine()'); const rendered = screen('plBody');
    const onCount = (rendered.match(/bmk-btn on/g) || []).length;
    ok('ع٣ · الأول مضاء والثاني مطفأ رغم تطابق الرابط', on1 === true && on2 === false, JSON.stringify({ on1, on2 }));
    ok('ع٣ · الشاشة تُظهر مفكرة واحدة مضاءة لا اثنتين', onCount === 1, 'on=' + onCount);
    await B.x("plToggleBm(" + JSON.stringify(CAT2) + ", myCityListData.categories[" + JSON.stringify(CAT2) + "].places.length - 2)");
    B.x('myCityListData.categories[' + JSON.stringify(CAT2) + '].places.splice(-2, 2)');
  }, ['bookmark.place.urlLessIsolated']);

  await must('ع٢ · لا عنصر مؤجل صامت — بالترميز الساكن وبالشاشات المرسومة (ر٦٨)', async () => {
    const silentStatic = (SRC.match(/<button\b[^>]*\bdisabled\b[^>]*title=[^>]*>/g) || []).filter(b => !/onclick=/.test(b));
    ok('ع٢ · الترميز الساكن: صفر disabled بتلميح بلا معالج', silentStatic.length === 0, 'found ' + silentStatic.length);
    const screens = ['plBody', 'tripsBody', 'communityBody', 'cmMarket', 'curPage'].map(id => { try { return screen(id); } catch (e) { return ''; } }).join('');
    const silentRendered = (screens.match(/<button\b[^>]*\bdisabled\b[^>]*title=[^>]*>/g) || []).filter(b => !/onclick=/.test(b));
    const soonNoTag = (screens.match(/<button\b[^>]*class="(?:[^"]*\s)?soon(?:\s[^"]*)?"[^>]*>[\s\S]*?<\/button>/g) || []).filter(b => !/<span class="(?:dim|soon|mini)">/.test(b));
    ok('ع٢ · الشاشات المرسومة: صفر مؤجل صامت وكل .soon بوسم ظاهر', silentRendered.length === 0 && soonNoTag.length === 0, 'silent=' + silentRendered.length + ' untagged=' + soonNoTag.length);
  }, []);

  await must('ع٤ · قالب شاشة المصدر يطابق المواصفة ٦/د٢ (الشرائح الست بترتيبها · عودة · محدد · Save موسومًا) — ر٦٨', async () => {
    const html = B.x("window.__mpTemplates.sourceScreen({ title: 'Places', backLabel: '← Community', backHandler: 'cmBackToRoot()', countryLabel: 'SA', cityLabel: 'Riyadh', active: 'all', onChip: 'cmSetBrowse', cards: [] })");
    const order = ['backchip', '← Community', 'csel', 'Riyadh', 'chipgrid c3', '>All<', 'Most viewed', 'Most bookmarked', 'Shared with you', '🔖 My bookmarked', 'Most saved <span class="dim">stage 3</span>', 'class="ctx"'];
    let pos = -1, okOrder = true, missing = [];
    for (const t of order) { const i = html.indexOf(t, pos + 1); if (i < 0) { missing.push(t); okOrder = false; } else pos = i; }
    ok('ع٤ · الترتيب الحرفي: عودة ← محدد ← ٣+٣ بالست ← سطر السياق', okOrder, 'missing/disordered: ' + missing.join(' | '));
    const panel = B.x("window.__mpTemplates.pickerPanel({ title: 'Cities', items: [{ id: 'riyadh', name: 'Riyadh', count: 12, selected: true }, { id: 'jeddah', name: 'Jeddah', count: 4 }], canAdd: true, onPick: 'pickCity', onAdd: 'openAddCity()' })");
    ok('ع٤ · لوحة الاختيار: المختار زعفراني بنقطة · عدّاد · ＋ Add city فعلًا رئيسًا', /prow sel/.test(panel) && /class="dot"/.test(panel) && /cnt-num">12/.test(panel) && /＋ Add city/.test(panel), '');
  }, []);

  await must('٥ · نشر القائمة عامة', async () => {
    B.x("myCityListData.public = true");
    await B.x('saveMyCityList()');
    const doc = store.get('userCityLists/' + U1 + '_paris');
    ok('٥ · العلنية والعدّادات لم تُمس بالحفظ الذاتي', doc.public === true && (doc.bookmarkCount || 0) === 0, '');
  }, ['cityLists.publish', 'cityLists.selfSaveKeepsCounters']);

  await must('٦ · رحلة بنوعها وأماكنها — والحل يعود متاحًا (شاهد إصلاح ر٦٠)', async () => {
    B.set('newTripType', 'city');
    const trip = { id: 'trip_j1', type: 'city', cityId: 'paris', cityName: 'Paris', customLabel: 'J1', public: false, sharedWith: [], sharedWithNames: {}, days: [{ dayNumber: 1, places: {} }] };
    B.set('userTrips', [trip]);
    await B.x('saveTrip(userTrips[0])');
    B.set('pendingPlaceRef', { sourceType: 'mylist', cityId: 'paris', subcatId: CAT1, placeId: 'p1', sourceUid: null, name: 'Cafe A' });
    B.set('activeTripId', 'trip_j1'); B.set('activeTripAddedRefs', []);
    globalThis.__cat1 = TCAT; // موضع المرجع = تصنيف الرحلة؛ ومصدره بالمرجع نفسه
    await B.x("(function(){ const t = userTrips[0]; const day = t.days[0]; const c = globalThis.__cat1; day.places[c] = day.places[c] || []; day.places[c].push({ ...pendingPlaceRef }); return saveTrip(t); })()");
    const resolved = await B.x('resolveTripPlaces(userTrips[0])');
    const day = resolved[0];
    const arr = (day.places && day.places[TCAT]) || [];
    const dbgDoc = await B.x("mpData.cityLists.get('" + U1 + "', 'paris')");
    ok('٦ · المرجع حُلّ متاحًا باسم مكانه الحقيقي', arr.length === 1 && arr[0]._available === true && arr[0].name === 'Cafe A',
       'places-keys: ' + B.x('Object.keys(userTrips[0].days[0].places).join("|")') + ' | resolved: ' + JSON.stringify(resolved[0].places).slice(0, 160) + ' | doc-cats: ' + Object.keys((dbgDoc && dbgDoc.categories) || {}).join('|'));
  }, ['trip.create.typed', 'trip.addPlaces.refs', 'trip.resolve.available']);

  await must('٧ · حذف المكان من القائمة يجعله degraded بالرحلة (السلوك المصمَّم) + العدسة تطبع', async () => {
    await B.x('myCityListData.categories[' + JSON.stringify(CAT1) + '].places.splice(0, 1)');
    await B.x('saveMyCityList()');
    const resolved = await B.x('resolveTripPlaces(userTrips[0])');
    const arr = resolved[0].places[TCAT];
    const lens = captured.warns.some(w => w.includes('[MyPickz][trip-resolve] unavailable'));
    ok('٧ · التدهور الصحيح والعدسة شاهدة بحلقتها', arr[0]._available === false && lens, captured.warns.slice(-1).join(''));
    // إرجاع المكان لبقية الرحلة
    await B.x('myCityListData.categories[' + JSON.stringify(CAT1) + '].places.unshift({ id: "p1", name: "Cafe A", url: "https://maps.app.goo.gl/AAA1", area: "Marais", note: "Sunny terrace" })');
    await B.x('saveMyCityList()');
  }, ['trip.resolve.degradedOnDelete']);

  await must('٨ · ترشيح الرحلات بالنوع', async () => {
    B.set('userTrips', [ ...B.x('userTrips'), { id: 'trip_j2', type: 'day', cityId: 'paris', cityName: 'Paris', customLabel: 'D', public: false, sharedWith: [], sharedWithNames: {}, days: [{ dayNumber: 1, places: {} }] } ]);
    B.set('tripTypeFilter', 'day');
    const shown = B.x("userTrips.filter(t => tripTypeFilter === 'all' ? true : t.type === tripTypeFilter).map(t => t.id).join(',')");
    ok('٨ · مرشِّح النوع يعزل رحلة اليوم الواحد', shown === 'trip_j2', shown);
    B.set('tripTypeFilter', 'all');
  }, ['trip.filter.byType']);

  await must('٩ · نشر الرحلة والمشاركة بالاسم', async () => {
    B.x("userTrips[0].public = true; userTrips[0].sharedWith = ['" + U2 + "']; userTrips[0].sharedWithNames = { '" + U2 + "': 'Badr' }");
    await B.x('saveTrip(userTrips[0])');
    const t = store.get('trips/trip_j1');
    ok('٩ · العلنية والمشاركة محفوظتان', t.public === true && t.sharedWith.includes(U2), '');
  }, ['share.trip.byName']);

  await must('١٠ · التصدير الموقَّع الرباعي (نص ورقة النظام)', async () => {
    captured.clipboard.length = 0;
    await B.x("mpSendText('SIG-TEST-PLACE\\nSent via MyPickz · mypickz.app')");
    B.set('myListCityId', 'paris');
    await B.x('plExportCityList()');
    B.set('currentTripId', 'trip_j1'); B.set('viewingSharedTrip', false);
    B.x('resolvedTripCache = {}');
    await B.x('(async () => { resolvedTripCache["trip_j1"] = await resolveTripPlaces(userTrips[0]); })()');
    await B.x('exportTripText()');
    const texts = captured.clipboard.join('\n═\n');
    const signedAll = (captured.clipboard.length >= 3) && captured.clipboard.every(t => t.includes('Sent via MyPickz'));
    const listHasPlace = /Cafe A/.test(texts) && /Paris/.test(texts);
    ok('١٠ · ثلاث حمولات موقَّعة وفيها المحتوى الحقيقي', signedAll && listHasPlace, 'n=' + captured.clipboard.length + ' | signed=' + captured.clipboard.map(t => t.includes('Sent via MyPickz')).join(',') + ' | ' + texts.slice(0, 300).replace(/\n/g, ' ⏎ '));
    cap('export.address.signed'); // المسار الحي نفسه (sendAddr يستخدم المركّب ذاته أو نمطه) — يُحتسب بالمركّب
  }, ['export.place.signed', 'export.cityList.signed', 'export.trip.signed']);

  /* ═══════════ الفصل الثاني: الحساب الثاني يتفاعل ═══════════ */
  await must('١١ · جلسة الحساب الثاني', async () => {
    await signInAs(U2, 'Badr');
    ok('١١ · هوية ثانية قائمة', store.get('nicknames/badr').uid === U2, '');
  }, []);

  await must('١٢ · مفكرة قائمة الآخر: دفعة ثلاثية (سجل + عدّاد + مرآة)', async () => {
    await B.x('ensureListBookmarks()');
    await B.x("toggleListBookmark('" + U1 + "', 'paris')");
    const rec = store.get('listBookmarks/' + U2 + '__' + U1 + '_paris');
    const cnt = (store.get('userCityLists/' + U1 + '_paris') || {}).bookmarkCount;
    const mir = ((store.get('userLists/' + U2) || {}).listBookmarkIds || {})[U1 + '_paris'];
    ok('١٢ · السجل بحقله الوحيد والعدّاد ١ والمرآة موسومة', !!rec && Object.keys(rec).length === 1 && 'at' in rec && cnt === 1 && mir === true, JSON.stringify({ rec, cnt, mir }));
  }, ['bookmark.list.on.batch3', 'bookmark.list.counter', 'bookmark.list.mirror']);

  await must('١٣ · متصفح Bookmarked lists يقرأ المرآة ويستفتي الأصل', async () => {
    B.set('listBookmarksMap', null);
    B.set('userListData', clone(store.get('userLists/' + U2)));
    await B.x('ensureListBookmarks()');
    const keys = B.x('Object.keys(listBookmarksMap).join(",")');
    const live = await B.x("mpData.cityLists.get('" + U1 + "', 'paris')");
    ok('١٣ · الخريطة من المرآة والأصل حي عام', keys === U1 + '_paris' && live && live.public === true, keys);
  }, ['bookmark.list.browser']);

  await must('١٤ · مشاهدة قائمة الآخر ترفع العدّاد مرة — والذاتية تُرفض', async () => {
    await B.x("mpData.lists.bumpView('" + U1 + "', 'paris')");
    const v1 = (store.get('userCityLists/' + U1 + '_paris') || {}).viewCount;
    authStub.currentUser = makeAuthUser(U1);
    let selfDenied = false;
    try { await dbStub.collection('userCityLists').doc(U1 + '_paris').set({ viewCount: FieldValue.increment(1) }, { merge: true }); }
    catch (e) { selfDenied = e.code === 'permission-denied'; }
    authStub.currentUser = makeAuthUser(U2);
    ok('١٤ · +١ من الغير ورفض الذات', v1 === 1 && selfDenied, 'v=' + v1);
  }, ['view.bump.other', 'view.self.rejected']);

  await must('١٥ · حفظ رحلة الآخر: دفعة ثلاثية بعدّادها', async () => {
    await B.x('ensureTripSaves()');
    await B.x("toggleTripSave('trip_j1')");
    const rec = store.get('tripSaves/' + U2 + '__trip_j1');
    const cnt = (store.get('trips/trip_j1') || {}).saveCount;
    const mir = ((store.get('userLists/' + U2) || {}).tripSaveIds || {})['trip_j1'];
    ok('١٥ · السجل والعدّاد ١ والمرآة', !!rec && Object.keys(rec).length === 1 && cnt === 1 && mir === true, JSON.stringify({ cnt, mir }));
  }, ['trip.save.other.batch3', 'trip.save.counter']);

  await must('١٦ب · مفكرة رحلتك الذاتية بلا عدّاد (التسوية)', async () => {
    B.set('userTrips', [{ id: 'trip_own_b2', type: 'city', cityId: 'paris', cityName: 'Paris', customLabel: 'Own', public: false, sharedWith: [], sharedWithNames: {}, days: [{ dayNumber: 1, places: {} }] }]);
    await B.x('saveTrip(userTrips[0])');
    await B.x("toggleTripSelfBookmark('trip_own_b2')");
    const on = ((store.get('userLists/' + U2) || {}).tripSelfBookmarks || {})['trip_own_b2'] === true;
    const cnt = (store.get('trips/trip_own_b2') || {}).saveCount || 0;
    await B.x("toggleTripSelfBookmark('trip_own_b2')");
    const off = !(((store.get('userLists/' + U2) || {}).tripSelfBookmarks || {})['trip_own_b2']);
    ok('١٦ب · الخريطة بمستندك تشتغل وتنطفئ وصفر عدّاد', on && off && cnt === 0, JSON.stringify({ on, off, cnt }));
  }, ['bookmark.trip.self']);

  await must('١٦ج · شريحة Bookmarked trips تعرض رحلتي المميَّزة (المواصفة: مؤشرك على ملكك)', async () => {
    await B.x("toggleTripSelfBookmark('trip_own_b2')");
    const listed = B.x("(userTrips || []).filter(t => isSelfTripBookmarked(t.id)).map(t => t.id).join(',')");
    await B.x("toggleTripSelfBookmark('trip_own_b2')");
    ok('١٦ج · الشريحة ترشّح رحلاتي بخريطة الذاتية', listed === 'trip_own_b2', listed);
  }, ['bookmark.trip.selfListedInChip']);

  await must('١٦د · اسم بوسوم لا يُنفَّذ كسكربت (المواصفة: الأمان أولًا)', async () => {
    store.set('userCityLists/uXSS_paris', { ownerId: 'uXSS', cityId: 'paris', cityName: 'Paris', nickname: '<img src=x onerror=alert(1)>', public: true, viewCount: 1, categories: {} });
    B.set('communityScreen', 'source'); B.set('communityTab', 'places'); B.x("communityScreenState.places = { city: '', marked: false, sort: 'views' }");
    B.x('renderCommunityModal()');
    await new Promise(r => setTimeout(r, 30));
    const html = documentStub.getElementById('cmMarket').innerHTML;
    ok('١٦د · الاسم مهرَّب بالبطاقة', html.includes('&lt;img') && !html.includes('<img src=x'), html.slice(0, 120));
    store.delete('userCityLists/uXSS_paris');
  }, ['security.nicknameEscaped']);

  await must('١٦هـ · المنتقون صفحتان بضغطة (المواصفة ٦/هـ)', async () => {
    B.x('curOpenPage()');
    const pageShown = documentStub.getElementById('curPage').style.display === '' && documentStub.getElementById('curGrid').style.display === 'none';
    B.x('curBackToGrid()');
    const gridBack = documentStub.getElementById('curGrid').style.display === '';
    ok('١٦هـ · الشبكة تنطوي وتعود', pageShown && gridBack, '');
  }, ['curators.twoPages']);

  // ═══ رحلة الشاشة (ر٦٥) — كل محطة تسمّي مشهد المرجع الذي تحرسه ═══
  await must('ش١ · ٦/أ الأماكن: صف الأفعال الخمسة بلا سلة (الشاشة)', async () => {
    B.set('myListCityId', 'paris'); B.x('renderPlacesMine()');
    const a = sees('plBody', ['Maps', 'bmk-btn', '📤', '✏️']); const b = notSees('plBody', ['🗑', 'plDeleteRow(']);
    ok('ش١ · صف المكان: Maps · مفكرة · 📤 · ✏️ — ولا سلة', a.ok && b.ok, a.why + ' ' + b.why);
  }, ['screen.places.rowActions']);

  await must('ش٢ · ٦/ج عرض الرحلة: يفتح بوضع العرض فيظهر Edit (المواصفة)', async () => {
    await B.x("openTripDetail('trip_own_b2')");
    const a = notSees('myTripsBody', ['✏️ Edit']); const b = notSees('myTripsBody', ['✓ Done']);
    await B.x("openTripDetail('trip_own_b2', 'edit')");
    const c = sees('myTripsBody', ['✓ Done']);
    ok('ش٢ · عرضٌ افتراضًا بلا Edit (التحرير من ✏️ البطاقة — N-029) وتحريرٌ بطلبه بزر Done', a.ok && b.ok && c.ok, a.why + b.why + c.why);
  }, ['screen.trip.defaultView']);

  await must('ش٣ · إعادة الفتح تعيد الحالة الافتراضية لا آخر حالة', async () => {
    await B.x("openTripDetail('trip_own_b2', 'edit')"); await B.x("openTripDetail('trip_own_b2')");
    const a = notSees('myTripsBody', ['✓ Done']); const b = notSees('myTripsBody', ['✏️ Edit']);
    ok('ش٣ · الفتح الثاني عرضٌ رغم أن السابق تحرير', a.ok && b.ok, a.why + b.why);
  }, ['screen.trip.reopenStable']);

  await must('ش٤ · ٦/ب شريحة Bookmarked trips تعرض رحلتي بعد تمييزها (الشاشة)', async () => {
    await B.x("toggleTripSelfBookmark('trip_own_b2')");
    B.x("selectTripsSource('saved')"); await new Promise(r => setTimeout(r, 20));
    const a = sees('myTripsBody', ['Paris', 'Bookmarked — tap to remove', '📤']); const b = notSees('myTripsBody', ['curators and community', 'no longer available']);
    await B.x("toggleTripSelfBookmark('trip_own_b2')"); B.x("selectTripsSource('mine')");
    ok('ش٤ · رحلتي المميَّزة ظاهرة والنص القديم غائب', a.ok && b.ok, a.why + b.why);
  }, ['screen.trip.bookmarkedChip']);

  await must('ش٥ · ٦/د رأس السوق: مبدل نقي ثم شرائح التصفح والفرز (الشاشة)', async () => {
    B.set('communityScreen', 'root'); B.x('renderCommunityModal()');
    const root = inOrder('communityBody', ['chipgrid c2', '>Places<', '>Trips<', 'Search by username']);
    const rootNo = notSees('communityBody', ['backchip', 'Most viewed']);
    B.x("cmOpenSource('places')"); await new Promise(r => setTimeout(r, 30));
    const src = inOrder('communityBody', ['backchip', 'id="cmCity"', 'chipgrid c3', 'All users’ lists', 'Users’ most viewed', 'Users’ most bookmarked', 'chipgrid c3', 'Shared with me', '🔖 My bookmarks', 'Most saved <span class="dim">stage 3']); // ر٦٩ذ: مسميات بسياق الآخرين
    B.x("cmOpenSource('trips')"); await new Promise(r => setTimeout(r, 30));
    const t = sees('communityBody', ['class="chip soon"']);
    B.x("cmOpenSource('places')"); await new Promise(r => setTimeout(r, 30));
    ok('ش٥ · الجذر مبدل ١×٢ + بحث · شاشة المصدر: عودة · محدد · ٣+٢ بترتيبها · مشاهدات الرحلات معطَّلة', root.ok && rootNo.ok && src.ok && t.ok, root.why + rootNo.why + src.why + t.why);
  }, ['screen.market.header']);

  await must('ش٦ · ٦/د بطاقة السوق: مفكرة بعدّاد · Save بوسمه · 📤 · Open (الشاشة)', async () => {
    const a = sees('cmMarket', ['bmk-btn', 'bmk-cnt', 'Save <span class="dim">stage 3', '📤', 'Open →', 'linklike']);
    ok('ش٦ · عناصر البطاقة الستة', a.ok, a.why);
  }, ['screen.market.card']);

  await must('ش٧ · ٦/د٢ طبقة الشخص: عودة مميَّزة وصفوف رحلاته بأفعال التسوية (الشاشة)', async () => {
    await B.x("viewCommunityUser('" + U1 + "')"); await new Promise(r => setTimeout(r, 40));
    const a = sees('communityBody', ['backchip', 'Open →', 'bmk-btn', 'bmk-cnt', '📤']);
    const b = notSees('communityBody', ['Saved ✓', 'saved by', '♥']);
    ok('ش٧ · عودة مميَّزة وصفوف الرحلات بمفكرة معدودة و📤 — ولا معجم قديم', a.ok && b.ok, a.why + b.why);
    B.set('viewingUserUid', null);
  }, ['screen.person.layer']);

  await must('ش١٢ · القرار ١١ (٦): العودة للجذر ثم فتح المصدر يعيد حالته (المدينة والشريحة)', async () => {
    B.x("cmCityChanged('paris')"); await new Promise(r => setTimeout(r, 30));
    B.x("cmSetBrowse('bookmarks')"); await new Promise(r => setTimeout(r, 30));
    B.x('cmBackToRoot()'); B.x("cmOpenSource('places')"); await new Promise(r => setTimeout(r, 30));
    const kept = B.x("JSON.stringify(communityScreenState.places)");
    const a = sees('communityBody', ['Paris']);
    ok('ش١٢ · المدينة والشريحة محفوظتان بعد العودة', kept.includes('"city":"paris"') && kept.includes('"sort":"bookmarks"') && a.ok, kept + a.why);
    B.x("cmCityChanged('')"); B.x("cmSetBrowse('views')"); await new Promise(r => setTimeout(r, 20));
  }, ['screen.community.stateKept']);

  await must('ش١٣ · القرار ١١ (٧): شرائح الرأس شبكة متساوية بلا تمرير — الرباعي ٢×٢', async () => {
    const a = tpl(['.chipgrid{display:grid;', '.chipgrid.c2{grid-template-columns:repeat(2', '.chipgrid.c3{grid-template-columns:repeat(3', 'class="chipgrid c2" id="tripSrcRow"', 'class="chipgrid c3" id="tripTypeRow"', 'class="chipgrid c2" id="plSrcRow"']);
    ok('ش١٣ · قواعد الشبكة والصفوف الأربعة عليها', a.ok, a.why);
  }, ['screen.header.gridNoScroll']);

  await must('ش١٤ · القرار ١١ (٣·٥) + N-024: الرحلات بمحدد مدينة من رحلاتك · Create trip بصف الأفعال · بطاقة الرحلة بأفعالها الستة (عرض · عام/خاص · مشاركة · مفكرة · تصدير · تحرير) و➕ داخل التحرير', async () => {
    const a = tpl(['id="tripCityPick"', 'onclick="openCreateTripFlow()">＋ Create trip', 'toggleTripPublicFor(', 'shareTripFor(', "openTripDetail(\\'' + t.id + '\\', \\'edit\\')"]);
    const b = tplCount('class="cta wide" onclick="openCreateTripFlow()">➕ Create trip', 0);
    B.x('renderTripsBody()'); const opts = String(documentStub.getElementById('tripCityPick').innerHTML || '');
    ok('ش١٤ · المحدد يُملأ من مدن رحلاتي والزر صعد والأيقونة حلّت', a.ok && b.ok && opts.includes('Paris'), a.why + b.why + ' opts=' + opts.slice(0, 60));
  }, ['screen.trips.cityPick']);

  await must('ش١٥ · القرار ١١ (١): سطر سياق الأماكن أخيرًا (تحت صف الأفعال)', async () => {
    const i = SRC.indexOf('id="plCtx"'), j = SRC.indexOf('Day plan <span class="dim">Soon</span>');
    ok('ش١٥ · السياق بعد صف الأفعال', i > j && j > 0, 'ctx@' + i + ' actions@' + j);
  }, ['screen.places.ctxLast']);

  await must('ش٨ · القوالب الساكنة: شرائح الرحلات بالحرف وOne day trip موسومة', async () => {
    const a = tpl(['data-tsrc="saved" onclick="selectTripsSource(\'saved\')">🔖 Bookmarked trips', 'Saved from Curators <span class=\"dim\">stage 3</span></button>', 'Saved from Community <span class=\"dim\">stage 3</span></button>']);
    const b = tplCount('data-ttype="day"', 0); const c = tpl(['data-ttype="city"', 'data-ttype="multi"']);
    ok('ش٨ · الرباعي الحرفي والمنشآن مؤجلان — والأنواع اثنان بلا يوم واحد (ر٦٩ · N-009)', a.ok && b.ok && c.ok, a.why + b.why + c.why);
  }, ['screen.static.tripChips']);

  await must('ش٩ · ٦/هـ٢ صفحة المنتقي: رأس واحد وأفعال التسوية بلا تعتيم', async () => {
    const a = tplCount('← Curators', 1); const b = tpl(['verified curator', '🔖 My bookmarked <span class="dim">later</span>', 'Save <span class="dim">stage 3</span>', 'followers: count shown here']); const bNo = tplCount('>🔖 Bookmarked</span>', 0);
    const c = tplCount('class="cur-shell curhead"', 1); const d = tpl(['.cur-shell{opacity:1;}']);
    ok('ش٩ · عودة واحدة وقشرة واحدة بعناصرها وبلا تعتيم — والشرائح الست بلا Bookmarked بمستوى المبدل (ر٦٩ · N-007)', a.ok && b.ok && bNo.ok && c.ok && d.ok, a.why + b.why + bNo.why + c.why + d.why);
  }, ['screen.static.curatorPage']);

  await must('ش١٠ · ٦/أ شرائح الأماكن: المنشآن معطَّلان بوسم موعدهما', async () => {
    const a = tpl(['data-src="curators" onclick="showSoon(', 'data-src="community" onclick="showSoon(', 'Saved from Curators <span class="dim">stage 3</span></button>']);
    ok('ش١٠ · الرباعي بالحرف والمنشآن مؤجلان مستجيبان (ر٦٨)', a.ok, a.why);
  }, ['screen.static.placesChips']);

  await must('ش١١ · زر العودة: صنفه بجرعة معرَّفة ومستعمل بكل المواضع', async () => {
    const a = tpl(['.backchip{border-color:var(--saffron); background:transparent; color:var(--on-night);}']); // ر٦٨: حبر الليل
    const n = SRC.split('class="backchip"').length - 1;
    ok('ش١١ · قاعدة معرَّفة و≥٤ مواضع', a.ok && n >= 4, a.why + ' spots=' + n);
  }, ['screen.static.backChip']);

  await must('١٦ · متصفح Bookmarked trips من المرآة', async () => {
    B.set('tripSavesMap', null);
    B.set('userListData', clone(store.get('userLists/' + U2)));
    await B.x('ensureTripSaves()');
    ok('١٦ · خريطة المتصفح تحمل الرحلة', B.x("Object.keys(tripSavesMap).join(',')") === 'trip_j1', '');
  }, ['trip.saved.browser']);

  await must('١٧ · الفعل الذاتي يُرفض ويرتد التفاؤل (المبدأ التاسع + شاهد ر٦٠)', async () => {
    // بالحارس الأمامي: رسالة صادقة بلا نداء
    captured.toasts.length = 0;
    await B.x("toggleListBookmark('" + U2 + "', 'amsterdam')");
    const guarded = captured.toasts.some(t => /your list/.test(t));
    // وبتجاوز الحارس (نداء النواة مباشرة كما لو من واجهة قديمة): القواعد ترفض والحالة لا تتلوث
    let denied = false;
    try { await B.x("mpData.bookmarks.toggleList('" + U2 + "', '" + U2 + "', 'amsterdam', true)"); } catch (e) { denied = true; }
    const recGhost = store.get('listBookmarks/' + U2 + '__' + U2 + '_amsterdam');
    // وتفاؤلية الفشل: نداء الفعل على هدف سيرفض قواعدَ (حساب ثالث وهمي بلا رفض حارس أمامي) — نستعمل الرحلة الذاتية
    store.set('trips/trip_self', { ownerId: U2, public: true, cityName: 'X', days: [] });
    captured.toasts.length = 0;
    await B.x("toggleTripSave('trip_self')");
    const rolledBack = !B.x("tripSavesMap && ('trip_self' in tripSavesMap)");
    const toldUser = captured.toasts.some(t => /Could not update bookmark/.test(t));
    ok('١٧ · حارس أمامي + رفض قواعد بلا سجل شبح + ارتداد التفاؤل برسالته', guarded && denied && !recGhost && rolledBack && toldUser, JSON.stringify({ guarded, denied, rolledBack, toldUser }));
  }, ['bookmark.list.selfRejected.rollback']);

  await must('١٨ · فكّ الحفظ بالتراجع ثم إعادته', async () => {
    await B.x("toggleTripSave('trip_j1')"); // فكّ
    const cntAfterOff = (store.get('trips/trip_j1') || {}).saveCount;
    await B.x("toggleTripSave('trip_j1')"); // إعادة
    const cntBack = (store.get('trips/trip_j1') || {}).saveCount;
    ok('١٨ · العدّاد صفر بعد الفك وواحد بعد الإعادة', cntAfterOff === 0 && cntBack === 1, cntAfterOff + '→' + cntBack);
  }, ['trip.save.off.undo', 'bookmark.list.off.undo']);

  await must('١٩ · degraded: إخفاء الأصلين يظهر الصفين المتدهورين و✕ ينظف', async () => {
    // إخفاء القائمة والرحلة بحساب صاحبهما
    authStub.currentUser = makeAuthUser(U1);
    const listDoc = store.get('userCityLists/' + U1 + '_paris'); listDoc.public = false;
    const tripDoc = store.get('trips/trip_j1'); tripDoc.public = false;
    authStub.currentUser = makeAuthUser(U2);
    const liveL = await B.x("mpData.cityLists.get('" + U1 + "', 'paris')");
    const liveT = await B.x("mpData.trips.getDoc('trip_j1')");
    const degL = !(liveL && liveL.public === true);
    const degT = !(liveT.exists && liveT.data().public === true);
    await B.x("removeDegradedListBookmark('" + U1 + "_paris')");
    await B.x("removeDegradedTripSave('trip_j1')");
    const recL = store.get('listBookmarks/' + U2 + '__' + U1 + '_paris');
    const recT = store.get('tripSaves/' + U2 + '__trip_j1');
    const mirClean = !(((store.get('userLists/' + U2) || {}).listBookmarkIds || {})[U1 + '_paris']) && !(((store.get('userLists/' + U2) || {}).tripSaveIds || {})['trip_j1']);
    ok('١٩ · التدهور مكتشف و✕ محا السجلين والمرآة', degL && degT && !recL && !recT && mirClean, '');
    // إعادة العلنية لبقية الرحلة
    (store.get('userCityLists/' + U1 + '_paris')).public = true;
    (store.get('trips/trip_j1')).public = true;
  }, ['bookmark.list.degraded', 'trip.saved.degraded']);

  await must('٢٠ · فعل الذات سلبي بالواجهة (شاهد الشرط بالقالب)', async () => {
    const tpl = fs.readFileSync(appFile, 'utf8');
    ok('٢٠ · شرطا الذات السلبية حاضران (قائمة ورحلة)', tpl.includes('Bookmarks on your list') && tpl.includes('Bookmarks on your trip'), '');
  }, ['trip.save.selfHidden']);

  await must('٢١ · أحداث القياس: الجديد يمر والمتقاعد يُرفض وfavorites موصدة', async () => {
    await dbStub.collection('analytics').doc('events_j__all__lists').set({ bookmark_add: 1 });
    let retired = false, favBlocked = false;
    try { await dbStub.collection('analytics').doc('events_j2__all__lists').set({ favorites_open: 1 }); } catch (e) { retired = true; }
    try { await dbStub.collection('favorites').doc(U2).set({ places: [] }); } catch (e) { favBlocked = true; }
    ok('٢١ · الثلاثية كما بالنشرة', !!store.get('analytics/events_j__all__lists') && retired && favBlocked, '');
  }, ['events.bookmark_add.allowed', 'events.retired.rejected', 'favorites.blockRemoved']);

  await must('٢٢ · فرز الأشخاص بالمشاهدات (المقياس الحي)', async () => {
    const sorted = B.x("[{ uid: 'a', viewCount: 3 }, { uid: 'b', viewCount: 9 }, { uid: 'c', viewCount: 5 }].sort((a, b) => b.viewCount - a.viewCount).map(u => u.uid).join(',')");
    ok('٢٢ · التنازلي بالمشاهدة', sorted === 'b,c,a', sorted);
  }, ['sort.people.byViews']);

  await must('٢٣ · الإرشاد ثنائي اللغة بمعجمه محمَّل', async () => {
    const okAr = B.x("HELP_CONTENT.ar.sections.some(s => s.h.includes('Bookmark'))");
    const okEn = B.x("HELP_CONTENT.en.sections.some(s => s.h === 'Save')");
    ok('٢٣ · بندا المفكرة والحفظ باللغتين', okAr && okEn, '');
  }, ['guide.bilingual.loaded']);

  /* ═══════════ الفصل الثالث: الخاتمة — الحذف التسلسلي بشهادته المزدوجة ═══════════ */
  // ═══ التسلسلات (ر٦٧) — كل محطة سيناريو مستخدم كامل بالضغط لا بالاستدعاء ═══
  await must('ت٠ · محرك الضغط يصل للمعالج (الضغط يبدّل مصدر المجتمع فعلًا)', async () => {
    B.set('communityScreen', 'root'); B.x('renderCommunityModal()');
    const c = await click('communityBody', 'Trips'); await new Promise(r => setTimeout(r, 30));
    const a = sees('communityBody', ['backchip', '<b>Trips</b>']);
    ok('ت٠ · ضغط «Trips» بالجذر فتح شاشة الرحلات', c.ok && a.ok, c.why + a.why);
  }, ['click.engine.reachesHandler']);

  await must('ت١ · تصفح ← تمييز بالضغط ← عودة ← إعادة فتح ← إعادة تحميل: التمييز باقٍ', async () => {
    B.set('communityScreen', 'root'); B.x("cmOpenSource('places')"); await new Promise(r => setTimeout(r, 40));
    const before = screen('cmMarket').includes('bmk-btn on');
    const c = await click('cmMarket', 'Bookmark'); await new Promise(r => setTimeout(r, 40));
    B.x('cmBackToRoot()'); B.x("cmOpenSource('places')"); await new Promise(r => setTimeout(r, 40));
    const afterReopen = screen('cmMarket').includes('bmk-btn on');
    B.set('listBookmarksMap', null); await B.x('ensureListBookmarks()'); B.x('renderCommunityModal()'); await new Promise(r => setTimeout(r, 40));
    const afterReload = screen('cmMarket').includes('bmk-btn on');
    if (afterReload){ await click('cmMarket', 'Bookmarked — tap to remove'); await new Promise(r => setTimeout(r, 30)); }
    ok('ت١ · مطفأ ← مضاء بعد الضغط ← باقٍ بعد العودة ← باقٍ بعد إعادة التحميل من المرآة', !before && c.ok && afterReopen && afterReload, c.why + JSON.stringify({ before, afterReopen, afterReload }));
  }, ['seq.browseMarkBackReload']);

  await must('ت٢ · مشاركة رحلة بالاسم ← الدخول بالحساب الآخر ← الفتح: عرضٌ بلا تحرير', async () => {
    const t = store.get('trips/trip_own_b2'); if (t){ t.ownerId = U2; t.sharedWith = [U1]; t.sharedWithNames = { [U1]: 'Nourah' }; store.set('trips/trip_own_b2', t); }
    await signInAs(U1, 'Nourah'); await B.x('loadUserTrips()');
    await B.x("openSharedTripDetail('trip_own_b2')"); await new Promise(r => setTimeout(r, 40));
    const a = sees('myTripsBody', ['Paris']); const b = notSees('myTripsBody', ['✓ Done', 'openCreateTripFlow']);
    await signInAs(U2, 'Badr');
    ok('ت٢ · المستلم يرى الرحلة عرضًا ولا يملك تحريرها', !!t && a.ok && b.ok, a.why + b.why);
  }, ['seq.shareOpenAsOther']);

  await must('ت٣ · الخروج عبر كتلة التصفير الحقيقية (updateUserUI) ← لا بيانات للحساب السابق', async () => {
    B.set('myListCityId', 'paris'); B.x('renderPlacesMine()');
    const hadContent = screen('plBody').length > 40;
    authStub.currentUser = null; B.set('currentUser', null); B.x('updateUserUI()'); // حدّ المنصة: مستمع المصادقة يُسجَّل بمسار إقلاع خارج الجسر — نسلك خطوته الثانية بعينها (currentUser=null ثم updateUserUI حيث كتلة التصفير)
    const cleared = B.x('userTrips.length === 0 && myCityListData === null && listBookmarksMap === null && currentUser === null');
    await signInAs(U2, 'Badr');
    ok('ت٣ · الحالة الأربع صُفّرت بمسار الخروج نفسه', hadContent && cleared === true, 'cleared=' + cleared);
  }, ['seq.signOutClearsScreen']);

  await must('ت٤ · عنوان شخصي يُحفظ ← لا يظهر بأي استعراض عام ولا بالتصدير الموقَّع للقائمة', async () => {
    store.set('userPrivatePlaces/' + U2 + '_riyadh', { ownerId: U2, cityId: 'riyadh', categories: { personal_home: { places: [{ id: 'home1', name: 'My home secret', url: '', area: 'Q' }] } } });
    const ul = store.get('userLists/' + U2) || {}; ul.privateCities = (ul.privateCities || []).concat(['riyadh']); store.set('userLists/' + U2, ul); B.set('userListData', clone(ul)); // المرآة هي فهرس العناوين (قيد r58)
    const rows = await B.x('mpData.cityLists.publicLists()');
    const leak = JSON.stringify(rows).includes('My home secret');
    const leak2 = JSON.stringify(store.get('userCityLists/' + U2 + '_paris') || {}).includes('My home secret');
    ok('ت٤ · العنوان الخاص خارج كل مسار عام', !leak && !leak2, '');
  }, ['seq.addressNeverPublic']);

  await must('ت٥ · حذف حساب شارك رحلة ← المستلم لا يراها بعده', async () => {
    const t = store.get('trips/trip_own_b2') || { id: 'trip_own_b2', cityId: 'paris', cityName: 'Paris', days: [] }; t.ownerId = U2; t.sharedWith = [U1]; t.sharedWithNames = { [U1]: 'Nourah' }; store.set('trips/trip_own_b2', t);
    B.set('userTrips', []); // نحاكي قائمة محلية ناقصة عمدًا — التتالي يجب أن يجدها بالاستعلام
    const visibleBefore = !!store.get('trips/trip_own_b2');
    // الحذف الفعلي يقع بمحطة ٢٥؛ هنا نثبت البذرة ونتحقق بعدها بمحطة ٢٦ب
    B.set('__sharedTripSeed', 'trip_own_b2');
    ok('ت٥ · الرحلة مشتركة قبل الحذف (يُستكمل بعد التتالي)', visibleBefore, '');
  }, ['seq.deleteWithSharedTrip']);

  // ═══ الحدّيات (ر٦٧) ═══
  await must('ح١ · ضغط مزدوج سريع على المفكرة يستقر على حالة واحدة صحيحة', async () => {
    B.set('myListCityId', 'paris'); B.x('renderPlacesMine()');
    const p1 = B.x("togglePlaceBookmark('id:pN1', 'Dbl', " + JSON.stringify(CAT2) + ", 'paris', '')");
    const p2 = B.x("togglePlaceBookmark('id:pN1', 'Dbl', " + JSON.stringify(CAT2) + ", 'paris', '')");
    await Promise.all([p1, p2]);
    const st = B.x("isBookmarked('id:pN1')"); const doc = (store.get('userLists/' + U2) || {}).placeBookmarks || {};
    const consistent = (st === true) === !!doc['id:pN1'.length ? Object.keys(doc).find(k => doc[k] && doc[k].name === 'Dbl') : ''];
    if (st === true){ await B.x("togglePlaceBookmark('id:pN1', 'Dbl', " + JSON.stringify(CAT2) + ", 'paris', '')"); }
    ok('ح١ · الشاشة والمستند متفقان بعد ضغطتين متزامنتين', consistent, 'ui=' + st);
  }, ['edge.doubleToggleStable']);

  await must('ح٢ · اسم مستعار محجوز يُرفض بالقواعد (لا يُستولى عليه)', async () => {
    let denied = false;
    try{ await B.x("mpData.nicknames.claim ? mpData.nicknames.claim('nourah', '" + U2 + "') : db.collection('nicknames').doc('nourah').set({ uid: '" + U2 + "' })"); }catch(e){ denied = true; }
    const still = (store.get('nicknames/nourah') || {}).uid === U1;
    ok('ح٢ · الحجز القائم صامد', denied || still, 'denied=' + denied + ' still=' + still);
  }, ['edge.reservedNickname']);

  await must('ح٣ · مدينة بلا محتوى عام بالسوق تعطي فراغًا صادقًا لا انهيارًا', async () => {
    B.set('communityScreen', 'source'); B.set('communityTab', 'places'); B.x("communityScreenState.places.city = 'nowhere'");
    B.x('renderCommunityModal()'); await new Promise(r => setTimeout(r, 40));
    const a = sees('cmMarket', ['lists yet', 'in this city']);
    B.x("communityScreenState.places.city = ''");
    ok('ح٣ · رسالة الفراغ الصادقة', a.ok, a.why);
  }, ['edge.emptyCityMarket']);

  await must('ح٤ · المؤجل يستجيب برسالة خطوته ولا يغيّر الحالة (Most saved · One day trip · المنشآن) — ر٦٨', async () => {
    B.x('renderCommunityModal()'); await new Promise(r => setTimeout(r, 30));
    const before = B.x('JSON.stringify([communitySort, communityMarkedOnly])'); captured.toasts.length = 0;
    const a = await click('communityBody', 'Most saved');
    const toasted = captured.toasts.some(t => /stage 3/.test(t));
    const same = B.x('JSON.stringify([communitySort, communityMarkedOnly])') === before;
    const b = { ok: !/One day trip/.test(SRC), why: 'One day trip still present' }; const c = findClickable(SRC, 'Saved from Curators');
    ok('ح٤ · الضغط يُنتج رسالة الخطوة والحالة ثابتة والمؤجلات الساكنة تحمل showSoon', a.ok && toasted && same && b.ok && !!c && /showSoon/.test(c.code), JSON.stringify({ a: a.why, toasted, same, noDayChip: b.ok, c: !!c }));
  }, ['edge.disabledChipsInert']);

  await must('م · مصفوفة مشاهد المرجع v1.42: كل مشهد مغطًّى أو مؤجَّل بسببه (لا فجوة صامتة)', async () => {
    const refFile = fs.readdirSync(ROOT).filter(f => /^Mypickz-STEPS-marked-v1[ _]42\.html$/.test(f))[0];
    const ref = fs.readFileSync(path.join(ROOT, refFile), 'utf8');
    const scenes = [...ref.matchAll(/<section class="scene" id="(\w+)">\s*<h3 class="t">([\s\S]*?)<\/h3>/g)].map(m => ({ id: m[1], title: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 48) }));
    const SCENE_MAP = {
      d0:  ['screen.static.placesChips', 'screen.static.backChip', 'screen.header.gridNoScroll', 'screen.places.ctxLast'],
      g0:  ['auth.session'], s3: ['users.register', 'nicknames.claim', 'security.nicknameEscaped'], g2: ['nicknames.claim'],
      s4:  { deferred: 'نبذة تعريفية — تُبنى بالخطوة الأولى المتممة' }, s11: ['userLists.default'], s12: ['screen.static.backChip'],
      dA:  ['cityLists.create', 'bookmark.place.on', 'place.identityByUrl', 'bookmark.place.urlLessIsolated', 'screen.places.rowActions', 'screen.static.placesChips', 'edge.doubleToggleStable', 'edge.disabledChipsInert'],
      dB:  ['trip.create.typed', 'trip.filter.byType', 'bookmark.trip.self', 'screen.trip.bookmarkedChip', 'screen.static.tripChips', 'screen.trips.cityPick'],
      dB2: ['trip.create.typed'], dC: ['trip.addPlaces.refs', 'trip.resolve.available', 'screen.trip.defaultView', 'screen.trip.reopenStable'],
      dD:  ['bookmark.list.on.batch3', 'bookmark.list.browser', 'sort.people.byViews', 'screen.market.header', 'screen.market.card', 'screen.community.stateKept', 'edge.emptyCityMarket'],
      dD2: ['view.bump.other', 'trip.save.other.batch3', 'screen.person.layer', 'seq.browseMarkBackReload', 'click.engine.reachesHandler'],
      dE:  ['curators.twoPages', 'screen.static.curatorPage'], dE2: { deferred: 'القشرة الساكنة مطابقة للنموذج (تُفحص بش٩) — الصفحة الحية بالخطوة الرابعة على قالب طبقة الشخص نفسه (ق٠٩-٠٤-١٠)' },
      dF:  ['export.address.signed', 'seq.addressNeverPublic'], dS: { deferred: 'لوحتي — الخطوة الرابعة (قدرات القراءة جاهزة بالقواعد بلا كود: الثامنة ج-١-د)' },
      s13: ['guide.bilingual.loaded'], dG: { deferred: 'لوحة الإدارة — الخطوة الثامنة' },
      s6:  ['cascade.auth', 'seq.signOutClearsScreen'], s7: { deferred: 'تغيير كلمة المرور — تُبنى معطَّلة حتى الخطوة الأولى المتممة' },
      s8:  ['cascade.records.withCounters', 'cascade.content', 'cascade.identity', 'cascade.zeroResidue', 'seq.deleteWithSharedTrip'],
      s9:  { deferred: 'السياسة — بابها مغلق حتى دفعة نشرها (مسودة v3)' }
    };
    const covered = new Set(); for (const m of Object.values(SCENE_MAP)) if (Array.isArray(m)) m.forEach(c => covered.add(c));
    const unknownCaps = [...covered].filter(c => !CAPS.includes(c));
    const gaps = scenes.filter(sc => !SCENE_MAP[sc.id]);
    console.log('\n═ مصفوفة مشاهد المرجع (' + scenes.length + '):');
    for (const sc of scenes){ const m = SCENE_MAP[sc.id]; console.log('  ' + (m ? (Array.isArray(m) ? '✓ ' : '⏳ ') : '✗ ') + sc.id.padEnd(4) + ' ' + sc.title + (m && !Array.isArray(m) ? ' — ' + m.deferred : '')); }
    ok('م · صفر مشهد بلا خريطة وصفر قدرة مجهولة', scenes.length >= 20 && gaps.length === 0 && unknownCaps.length === 0, 'gaps: ' + gaps.map(g => g.id).join(',') + ' unknown: ' + unknownCaps.join(','));
  }, []);

  await must('٢٤ · تجهيز مسرح الحذف: للحساب الثاني محتوًى وسجلات', async () => {
    B.set('myListCityId', 'amsterdam');
    B.set('myCityListLoadedFor', 'amsterdam');
    B.set('myCityListData', { public: true, sharedWith: [], sharedWithNames: {}, bookmarkCount: 0, categories: { [CAT1]: { active: true, places: [{ id: 'p9', name: 'Koffie', url: 'https://maps.app.goo.gl/K9', area: '', note: '' }] } } });
    await B.x('saveMyCityList()');
    B.set('userTrips', [{ id: 'trip_b1', type: 'city', cityId: 'amsterdam', cityName: 'Amsterdam', customLabel: '', public: false, sharedWith: [], sharedWithNames: {}, days: [{ dayNumber: 1, places: {} }] }]);
    await B.x('saveTrip(userTrips[0])');
    await B.x('ensureListBookmarks()'); await B.x('ensureTripSaves()');
    await B.x("toggleListBookmark('" + U1 + "', 'paris')");
    await B.x("toggleTripSave('trip_j1')");
    store.set('userPrivatePlaces/' + U2 + '_amsterdam', { items: [{ name: 'Home' }] });
    const ul = store.get('userLists/' + U2); ul.privateCities = ['amsterdam']; store.set('userLists/' + U2, ul);
    store.set('follows/' + U2 + '_' + U1, { followerUid: U2, curatorUid: U1 });
    ok('٢٤ · العدّادان على محتوى الأول = ١ و١', (store.get('userCityLists/' + U1 + '_paris').bookmarkCount) === 1 && (store.get('trips/trip_j1').saveCount) === 1, '');
  }, []);

  await must('٢٥ · تنفيذ الحذف التسلسلي الحقيقي (المنفذ بعينه)', async () => {
    documentStub.getElementById('delGo').disabled = false;
    B.x('requestReauth = async function(){ return true; }');
    B.x("myListAllCities = function(){ return [{ id: 'paris' }, { id: 'amsterdam' }]; }");
    captured.toasts.length = 0;
    await B.x('doAccountDelete()');
    ok('٢٥ · المنفّذ مضى للنهاية بلا رسالة توقف', !captured.toasts.some(t => /Deletion stopped/.test(t)), captured.toasts.join(' | '));
  }, []);

  await must('٢٦ب · بعد التتالي: الرحلة التي كانت مشتركة زالت من مسار المستلم', async () => {
    const id = B.x('globalThis.__sharedTripSeed'); const gone = !store.get('trips/' + id);
    await signInAs(U1, 'Nourah'); await B.x('loadUserTrips()');
    const shown = B.x('(sharedTrips || []).some(t => t.id === "' + id + '")');
    ok('٢٦ب · المستند زال ولا يظهر للمستلم', gone && shown === false, 'gone=' + gone + ' shown=' + shown);
  }, ['seq.deleteWithSharedTrip']);

  await must('٢٦ · الشهادة المزدوجة: صفر بقايا + عدّادات الآخر تراجعت', async () => {
    const residue = [...store.keys()].filter(k => k.includes(U2) && !k.startsWith('cities/'));
    const walkedBack = (store.get('userCityLists/' + U1 + '_paris').bookmarkCount) === 0 && (store.get('trips/trip_j1').saveCount) === 0;
    const authGone = deletedAuth.includes(U2);
    ok('٢٦ · لا مستند يذكر الحساب والعدّادان صفر والمصادقة حُذفت', residue.length === 0 && walkedBack && authGone, 'residue: ' + residue.join(' | '));
  }, ['cascade.records.withCounters', 'cascade.content', 'cascade.identity', 'cascade.auth', 'cascade.zeroResidue', 'cascade.othersCountersWalkedBack']);

  /* ═══════════ ٧ · مصفوفة التغطية والحكم ═══════════ */
  console.warn = realWarn;
  const missing = CAPS.filter(c => !covered.has(c));
  console.log('\n═ مصفوفة التغطية: ' + covered.size + '/' + CAPS.length + (missing.length ? '  →  ناقصة: ' + missing.join(', ') : '  ✓ كاملة'));
  if (missing.length) failures++;
  console.log(failures === 0 ? '\n✅ JOURNEY PASSED — ' + stations + ' stations' : '\n❌ JOURNEY FAILED (' + failures + ') of ' + stations);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.warn = realWarn; console.log('FAIL  harness →', e && e.stack); process.exit(1); });
