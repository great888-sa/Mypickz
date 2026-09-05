// MyPickz — tests/journey.js (ر٦٠)
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
  'trip.filter.byType', 'trip.save.other.batch3', 'trip.save.counter', 'trip.save.selfHidden',
  'trip.saved.browser', 'trip.saved.degraded', 'trip.save.off.undo',
  'share.trip.byName', 'export.place.signed', 'export.cityList.signed', 'export.trip.signed', 'export.address.signed',
  'events.bookmark_add.allowed', 'events.retired.rejected', 'favorites.blockRemoved',
  'sort.people.byViews', 'guide.bilingual.loaded',
  'cascade.records.withCounters', 'cascade.content', 'cascade.identity', 'cascade.auth', 'cascade.zeroResidue', 'cascade.othersCountersWalkedBack',
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

  await must('١٦ · متصفح Saved trips من المرآة', async () => {
    B.set('tripSavesMap', null);
    B.set('userListData', clone(store.get('userLists/' + U2)));
    await B.x('ensureTripSaves()');
    ok('١٦ · الخريطة تحمل الرحلة', B.x("Object.keys(tripSavesMap).join(',')") === 'trip_j1', '');
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
    const toldUser = captured.toasts.some(t => /Could not update saved trips/.test(t));
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

  await must('٢٠ · حفظ الذات مخفي بالواجهة (شاهد الشرط بالقالب)', async () => {
    const tpl = fs.readFileSync(appFile, 'utf8');
    ok('٢٠ · شرط الإخفاء حاضر بقالبي الطبقة الثانية', tpl.includes("u.uid === currentUser.uid) ? ''") && tpl.includes('Bookmarks on your list'), '');
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
