// MyPickz — tests/audit.js
// فحوصات ثابتة تُشغَّل قبل النشر. أي FAIL ⇒ الناشر يتوقف.
// تشغيل محلي: node tests/audit.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROD = 'index.html';
const TEST = 'index-debug-test.html';

let fails = 0;
function pass(name){ console.log('PASS  ' + name); }
function fail(name, why){ fails++; console.log('FAIL  ' + name + (why ? '  →  ' + why : '')); }
function check(cond, name, why){ cond ? pass(name) : fail(name, why); }
function read(f){
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { fail('exists ' + f, 'file missing'); return null; }
  pass('exists ' + f);
  return fs.readFileSync(p, 'utf8');
}
// إزالة التعليقات حتى لا تُحتسب أسماء مذكورة بالتعليقات فقط
function stripComments(s){
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');
}

// ر٧٣-ج (قرار المالك ٨ أكتوبر — الخيار أ): ملف الإنتاج القديم أُلغي حتى المرحلة د؛ حين يغيب تُطبَّق الفحوص على نسخة الاختبار وحدها،
// والإنتاج عند ترقيته = بناء الملمح prod من المصدر نفسه (§٢٣-ب يفحصه الآن في الذاكرة بلا نشر)
const prod = fs.existsSync(path.join(ROOT, PROD)) ? read(PROD) : (console.log('INFO  ' + PROD + ' absent — production is built from src/ at stage D; checks apply to ' + TEST + ' only'), null);
const test = read(TEST);
if (!test) { finish(); }
const FILES = prod ? [[PROD, prod], [TEST, test]] : [[TEST, test]];

// ---------- ١) هيكل HTML سليم ----------
for (const [n, s] of FILES) {
  check(/<html[\s>]/i.test(s) && /<\/html>\s*$/i.test(s.trimEnd()), 'html structure ' + n);
  check(s.length > 100000, 'size sanity ' + n, 'file unexpectedly small (' + s.length + ' bytes)');
}

// ---------- ٢) لا أسرار بالمستودع ----------
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk_(live|test)_[A-Za-z0-9]{8,}/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /"private_key"\s*:/,
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9_-]{20,}/
];
for (const [n, s] of FILES) {
  const hit = SECRET_PATTERNS.find(r => r.test(s));
  check(!hit, 'no secrets ' + n, hit && String(hit));
}

// ---------- ٣) لا بقايا مسارات محذوفة (الدفعة ١ / GitHub Pages) ----------
const FORBIDDEN_IDS = ['editPassword', 'loadPassword', 'savePassword', 'logoTap', 'checkOwnerAccess', 'managePassword'];
for (const [n, s] of FILES) {
  const code = stripComments(s);
  const found = FORBIDDEN_IDS.filter(id => new RegExp('\\b' + id + '\\b').test(code));
  check(found.length === 0, 'no removed owner-mode code ' + n, found.join(', '));
  check(!/github\.io/.test(code), 'no github.io references ' + n);
  check(!/[?&]key=/.test(code), 'no ?key= access path ' + n);
}

// ---------- ٣-ب) كل onclick (بالHTML وبالقوالب داخل JS) يشير لدالة معرَّفة ----------
// فحص ثابت مكمِّل لـruntime.js: يلتقط أيضًا المعالجات المولَّدة داخل قوالب JS التي لا تظهر بالDOM عند التحميل
for (const [n, s] of FILES) {
  const handlers = new Set();
  for (const m of s.matchAll(/onclick=\\?["']\s*([A-Za-z_$][\w$]*)\s*\(/g)) handlers.add(m[1]);
  const defined = new Set();
  for (const m of s.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
  for (const m of s.matchAll(/(?:^|\n)\s*(?:const|let|var|window\.)\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) defined.add(m[1]);
  const missing = [...handlers].filter(h => !defined.has(h));
  check(missing.length === 0, 'onclick handlers defined (' + handlers.size + ') ' + n, 'missing: ' + missing.join(', '));
}

// ---------- ٤) Firebase مثبَّت الإصدار ومشروع صحيح ----------
for (const [n, s] of FILES) {
  check(/cdnjs\.cloudflare\.com\/ajax\/libs\/firebase\/\d+\.\d+\.\d+\//.test(s), 'firebase SDK pinned ' + n);
  check(/projectId:\s*"mypickz-6f809"/.test(s), 'firebase projectId ' + n);
  for (const lib of ['firebase-app-compat', 'firebase-auth-compat', 'firebase-firestore-compat'])
    check(s.includes(lib + '.min.js'), lib + ' loaded ' + n);
}

// ---------- ٥) الفصل بين الإنتاج والاختبار ----------
if (prod){ check(!/logTiming/.test(prod), 'prod has no diagnostics (logTiming)');
check(!/BUILD:/.test(prod), 'prod has no BUILD marker'); }
const build = (test.match(/BUILD:\s*([^'"\n)]+)/) || [])[1];
check(!!build, 'test has BUILD marker', 'BUILD: not found');
if (build) console.log('INFO  test build = ' + build.trim());

// الفروق بين الملفين يجب أن تكون أدوات تشخيص فقط:
// نحذف كل سطر يحتوي logTiming أو كتلة أداة القياس ثم نقارن
function normalize(s){
  return s.split('\n')
    .filter(l => !/logTiming|__timingBox|__timingStart|TIMING\]|\[SIGNUP\]|\[NICK\]|0\.6\) أداة قياس|toast\b.*99999/.test(l))
    .map(l => l.replace(/\s+$/, ''))
    .filter(l => l.trim() !== '' && !/^\s*(\/\*\s*=+|=+\s*\*\/)\s*$/.test(l))
    .join('\n');
}
const np = prod ? normalize(prod) : null, nt = normalize(test);
if (!prod) { /* لا إنتاج — §٢٣-ب يقارن ملمح prod بالمصدر */ }
else if (np === nt) pass('prod == test after removing diagnostics');
else {
  const a = np.split('\n'), b = nt.split('\n');
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const why = 'first divergence near normalized line ' + (i + 1) +
    ' | prod: ' + (a[i] || '<eof>').slice(0, 80) + ' | test: ' + (b[i] || '<eof>').slice(0, 80);
  // هذا الفحص تحذيري بالمرحلة الأولى (WARN لا FAIL) حتى نثبّت قواعد الفصل
  console.log('WARN  prod != test after removing diagnostics  →  ' + why);
}

// ---------- ٦) ملفات النشر ----------
check(fs.existsSync(path.join(ROOT, 'wrangler.toml')), 'wrangler.toml exists');
check(fs.existsSync(path.join(ROOT, 'wrangler.prod.toml')), 'wrangler.prod.toml exists');
const ai = fs.existsSync(path.join(ROOT, '.assetsignore')) ? fs.readFileSync(path.join(ROOT, '.assetsignore'), 'utf8') : '';
check(/node_modules/.test(ai), '.assetsignore excludes node_modules');
check(/tests\/?/.test(ai), '.assetsignore excludes tests/', 'add a line: tests/');
check(/^src\/?$/m.test(ai), '.assetsignore excludes src/ (source parts are not published)', 'add a line: src/'); // ر٧٣-ج
check(/^scripts\/?$/m.test(ai), '.assetsignore excludes scripts/ (build and data scripts are not published)', 'add a line: scripts/'); // ر٧٣-ج
check(!fs.existsSync(path.join(ROOT, 'CNAME')), 'no CNAME (GitHub Pages leftover)');

// ---------- ٧) A3-L3-r1: حارس نقاط حقن mpTrack ----------
// يحمي نقاط القياس من السقوط الصامت عند أي إعادة هيكلة (خصوصًا تقسيم الملف بج-١أ).
// نسخة الاختبار تُفحص دائمًا؛ الإنتاج يُفحص فقط بعد ترقيته لطبقة القياس (وجود وحدة mpTrack به).
const MP_EXPECTED = [
  ["const mpTrack = (function(){", 1],
  ["mpTrack.hit('mylist_save')", 1],
  ["mpTrack.hit('trip_open'", 1],
  ["mpTrack.hit('trip_save')", { prod: 1, test: 2 }], // ر٥٢: + حفظ رحلة الآخرين (toggleTripSave) بجانب حدث saveTrip القائم
  ["mpTrack.hit('favorites_open'", { prod: 1, test: 0 }], // ر٥٢: تقاعد بنسخة الاختبار — يُصفَّر بالإنتاج عند ترقيته
  ["mpTrack.hit('community_open'", 1],
  ["mpTrack.hit('share_link')", { prod: 5, test: 7 }], // r80: + المشاركة مع مجموعة محفوظة (sgShareWith) · ر٥٢: + المركّب الموقَّع الموحَّد mpSendText (تصدير المكان والقائمة والرحلة نصًّا)
  ["mpTrack.hit('favorite_add')", { prod: 1, test: 0 }], // ر٥٢: تقاعد
  ["mpTrack.hit('bookmark_add')", { prod: 0, test: 3 }], // ر٥٢: مفكرة المكان والقائمة · ر٦١: + مفكرة رحلتك الذاتية
  ["mpTrack.hit('signup_start')", 1],
  ["mpTrack.hit('signup_done')", 1],
  ["mpTrack.hit('reserved_1')", { prod: 2, test: 0 }], // ر٦٣: الاختبار انتقل لـreserved_2 (reserved_1 خارج قائمة M4.24)
  ["mpTrack.hit('reserved_2')", { prod: 0, test: 2 }],
  ["mpTrack.statsList(docId, 'open_ulist')", { prod: 1, test: 0 }], // r72m (M4.25 §١٧-ج): الاختبار انتقل إلى open_app — الإنتاج يلحق بترقيته
  ["mpTrack.statsList(k, listOpenKey(origin))", { prod: 0, test: 1 }], // ب-٢-١: نقطة العدّ الواحدة بالمنشأ (كانت open_app مباشرة بـplOpenSharedList)
  ["mpTrack.statsTrip(tripId, 'view_shared')", { prod: 1, test: 0 }],
  ["mpTrack.statsTrip(tripId, 'view_community')", { prod: 1, test: 0 }],
  ["mpTrack.statsTrip(tripId, 'view_total')", { prod: 0, test: 2 }],
  ["mpTrack.captureSource();", 1],
  ["mpTrack.trapError(mpTrack.classify", 1],
  ["window.addEventListener('unhandledrejection'", { prod: 1, test: 2 }], // د-٤: نسخة الاختبار تسجّل الرفض غير الملتقَط في لوحة TIMING
  // خ٢ (٢٧ أغسطس): وجهة العناوين الشخصية تعرض روابطها بسماتها (data-mpsrc="app" · data-mppersonal="1") — إبرة إضافية بنسخة الاختبار
  //   حتى ترقية الإطار للإنتاج (حينها يصير العدد ٨/٣ بالملفين وتُوحَّد القيمة). القيمة إما رقم واحد للملفين أو {prod, test}.
  ['data-mpsrc=', { prod: 8, test: 5 }], /* r115-د (٤): + بلاطة الخريطة في أماكني (data-mpsrc="mine") */ // r74b-٢: نافذة My List القديمة زالت برابطيها // ر٧٣-أب (١): زالت سمة الدليل الموروث // r72w: رحلة الآخرين تمرّ بالبطاقة الموحَّدة (community) // ر٥٢: رابط نافذة My Favorites المتقاعدة كان يحمل السمة — زال معها
  ['data-mppersonal=', { prod: 2, test: 1 }] // r74b-٢: نافذة My List القديمة زالت (بقي رابط وجهة العناوين) // ر٧٣-أب (١): data-mpowner زالت مع الدليل
];
function countOcc(haystack, needle){ return haystack.split(needle).length - 1; }
function mpGuard(label, content){
  for (const [needle, exp] of MP_EXPECTED) {
    const expected = (typeof exp === 'object') ? (label === PROD ? exp.prod : exp.test) : exp;
    const c = countOcc(content, needle);
    check(c === expected, 'mpTrack ' + label + ': ' + needle.slice(0, 44) + ' = ' + expected, 'found ' + c);
  }
}
mpGuard(TEST, test);

// ═══ §14–§18 (ر٦٣ — إبر المراجعة الشاملة) ═══
(function reviewNeedles(){
  const T = '§14 index-debug-test.html: ';
  const cssAll = (test.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('\n');
  // §14 · كل متغيّر لوني مستعمَل معرَّف فعلًا
  const usedVars = new Set([...test.matchAll(/var\(--([\w-]+)/g)].map(m => m[1]));
  const definedVars = new Set([...cssAll.matchAll(/--([\w-]+)\s*:/g)].map(m => m[1]));
  const DYN_VARS = ['pin-', 'pinsec-', 'pind-']; /* r120 (ق١١-٢٤-٢٣): بادئات تُبنى من المتغيّر (لون التصنيف الفرعي · لون القسم · نقطة الدبوس) — يُفحص تعريف كل اسم منها بعينه في السطرين التاليين */
  const undefinedVars = [...usedVars].filter(v => !definedVars.has(v) && DYN_VARS.indexOf(v) < 0);
  check(undefinedVars.length === 0, T + 'every var(--x) used is defined', 'undefined: ' + undefinedVars.join(', '));
  { const pm = /const PIN_SUB = (\{[^;]*\});/.exec(test); let ps = {}; try{ ps = pm ? JSON.parse(pm[1]) : {}; }catch(_){ ps = {}; } const subs = Object.keys(ps); const secs = [...new Set(subs.map(k => String(ps[k]).split('|')[0]))]; const dots = [...new Set(subs.map(k => String(ps[k]).split('|')[1]).filter(Boolean))];
    const missing = subs.filter(k => !definedVars.has('pin-' + k)).concat(secs.filter(k => !definedVars.has('pinsec-' + k))).concat(dots.filter(k => !definedVars.has('pind-' + k))).concat(definedVars.has('pinsec-others') ? [] : ['pinsec-others']);
    const tree = [...test.matchAll(/\{id:"([a-z0-9_]+)", icon:"[^"]*", name:"[^"]+"\}/g)].map(m => m[1]); const noColour = [...new Set(tree)].filter(k => !(k in ps) && !/^(personal_[a-z]+|hospitals_clinics)$/.test(k)); /* تصنيفات العناوين الخاصة (Addresses) ليست من أقسام الخريطة العامة — دبوسها رمادي Others */
    check(subs.length >= 86 && missing.length === 0, T + 'every subcategory, section and dot in the pin table has its colour defined (' + subs.length + ' · ' + secs.length + ' · ' + dots.length + ')', 'missing: ' + missing.slice(0, 8).join(', '));
    check(tree.length >= 86 && noColour.length === 0, T + 'every subcategory of the tree has a pin colour of its own (' + tree.length + ')', 'no colour: ' + noColour.slice(0, 8).join(', ')); }
  // §15 · لا معرّف HTML مكرر
  const idCounts = {};
  for (const m of test.matchAll(/\sid="([^"]+)"/g)) idCounts[m[1]] = (idCounts[m[1]] || 0) + 1;
  const dupIds = Object.keys(idCounts).filter(k => idCounts[k] > 1);
  check(dupIds.length === 0, '§15 index-debug-test.html: no duplicate element ids', 'dup: ' + dupIds.join(', '));
  // §16 · حقول المستخدمين الآخرين لا تدخل قالبًا بلا تهريب
  const js = (test.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g) || []).join('\n');
  const SENSITIVE = ['nickname', 'customLabel', 'cityName', 'displayName', 'bio', 'contactUrl'];
  const leaks = [];
  for (const m of js.matchAll(/\$\{([^}]*)\}/g)) {
    const expr = m[1];
    if (SENSITIVE.some(f => expr.includes('.' + f) || expr.includes(f + ' ||')) && !/escapeHtml|encodeURI|JSON\.stringify|\.length|\.trim\(\)\s*\?|\?\s*'/.test(expr)) leaks.push(expr.slice(0, 50));
  }
  check(leaks.length === 0, '§16 index-debug-test.html: other-user fields escaped in templates', 'unescaped: ' + leaks.slice(0, 4).join(' | '));
  // §17 · ألفاظ محظورة بعد التسوية بنصوص الواجهة (لا التعليقات)
  const uiOnly = test.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, '');
  const BANNED = ['My favorites', '🔖 Saved trips', '>From community<', '>From curators<', 'Most Loved', 'People &amp; lists'];
  const hits = BANNED.filter(b => uiOnly.includes(b));
  check(hits.length === 0, '§17 index-debug-test.html: no pre-settlement lexicon in UI text', 'found: ' + hits.join(', '));
  // §18 · كل مفتاح قياس يرسله الكود موجود بقائمة القواعد (إن وُجد ملف القواعد)
  const rulesPath = path.join(ROOT, 'firestore.rules');
  if (fs.existsSync(rulesPath)) {
    const rules = fs.readFileSync(rulesPath, 'utf8');
    const line = (rules.split('\n').find(l => l.includes("hasOnly(['visit_source'")) || '');
    const allowed = new Set([...line.matchAll(/'(\w+)'/g)].map(m => m[1]));
    const fired = new Set([...js.matchAll(/mpTrack\.hit\('(\w+)'\)/g)].map(m => m[1]));
    const rejected = [...fired].filter(k => allowed.size && !allowed.has(k));
    check(rejected.length === 0, '§18 index-debug-test.html: every mpTrack key is in the rules whitelist', 'silently rejected: ' + rejected.join(', '));
  } else {
    console.log('INFO  §18 skipped — firestore.rules not present');
  }
})();

if (prod && countOcc(prod, 'const mpTrack') > 0) {
  mpGuard(PROD, prod);
  check(!/mpTrack\._diag/.test(prod), 'prod has no mpTrack diagnostics hook (_diag)');
} else {
  console.log('INFO  prod not yet promoted to A3-L3 (no mpTrack) — mp guard applied to test only');
}

// ---------- ٨) A3-L4-r1: حارس App Check (reCAPTCHA Enterprise — وضع المراقبة) ----------
// يمنع السقوط الصامت للتفعيل (ملفوف بحماية أخطاء عمدًا)، وانزياح المفتاح بين الملفين، والعودة للمزوّد القديم.
// نسخة الاختبار تُفحص دائمًا؛ الإنتاج فقط بعد ترقيته (وجود التفعيل به). رمز التصحيح ممنوع بالملفين دائمًا.
const AC_KEY_LINE = 'const MP_APPCHECK_KEY = "6Lery5EtAAAAANS-ab4HgjY76F8aLlY_V8SJWsXC";';
const AC_EXPECTED = [
  ['firebase-app-check-compat.min.js', 1],
  [AC_KEY_LINE, 1],
  ['new firebase.appCheck.ReCaptchaEnterpriseProvider(MP_APPCHECK_KEY)', 1],
  ['firebase.appCheck().activate(', 1],
  ['ReCaptchaV3Provider', 0]
];
function acGuard(label, content){
  for (const [needle, expected] of AC_EXPECTED) {
    const c = countOcc(content, needle);
    check(c === expected, 'appCheck ' + label + ': ' + needle.slice(0, 44) + ' = ' + expected, 'found ' + c);
  }
}
for (const [n, s] of FILES)
  check(!/FIREBASE_APPCHECK_DEBUG_TOKEN/.test(s), 'no App Check debug token ' + n);
acGuard(TEST, test);
if (prod && countOcc(prod, 'firebase.appCheck().activate(') > 0) {
  acGuard(PROD, prod);
} else {
  console.log('INFO  prod not yet promoted to A3-L4 (no App Check) — ac guard applied to test only');
}

// ---------- ٩) M2-DAL: حارس طبقة العزل — خط أساس مجمَّد للنداءات المباشرة، سقف لكل ملف ----------
// يعدّ نداءات المنصة المباشرة خارج الوحدتين المعزولتين (mpTrack · mpData). زيادة عن السقف = لا نشر.
// خط الأساس: ٢١ أغسطس ٢٠٢٦ = ٨٢ (التأسيس) · ٢٥ أغسطس = ٧٧ (toggleFavorite) · ٢٦ أغسطس = ٦٢ (toggleSuspendUser · loadMyCityList · saveMyCityList · resolveTripPlaces).
// سقف مستقل لكل ملف لأن نسخة الاختبار تسبق الإنتاج بدفعة (الاختبار أولًا): يُخفَّض سقف الإنتاج عند ترقيته. السقف يُخفَّض فقط ولا يُرفع أبدًا.
const DAL_MAX = { [TEST]: 0, [PROD]: 62 }; // ر٧٣-أب (٢) — قرار المالك: الوضع المثالي صفر (نسخة الاختبار)؛ الإنتاج القديم حتى ترقيته
const DAL_MAX_LEGACY = 82;
function sliceModule(s, startNeedle){
  const a = s.indexOf(startNeedle); if (a < 0) return '';
  const b = s.indexOf('})();', a); return b < 0 ? s.slice(a) : s.slice(a, b);
}
function countDirect(content){
  const iso = sliceModule(content, 'const mpTrack = (function(){') + sliceModule(content, 'const mpData = (function(){');
  const total = countOcc(content, 'db.collection(') + countOcc(content, 'db.batch(');
  const inIso = countOcc(iso, 'db.collection(') + countOcc(iso, 'db.batch(');
  return total - inIso;
}
for (const [n, s] of FILES) {
  const hasDal = countOcc(s, 'const mpData = (function(){') === 1;
  const max = hasDal ? DAL_MAX[n] : DAL_MAX_LEGACY;
  const direct = countDirect(s);
  check(direct <= max, 'direct platform calls outside DAL ' + n + ' = ' + direct + ' (max ' + max + ')');
  console.log('INFO  ' + n + (hasDal ? ' has mpData' : ' legacy (no mpData yet)') + ' — direct calls outside DAL = ' + direct);
}
check(DAL_MAX[PROD] >= DAL_MAX[TEST], 'DAL caps consistent (prod cap never below test cap before promotion)');
// ٢/أ (٢٦ أغسطس): نداءات المصادقة المباشرة خارج النواة — سقف صفر بعد الهجرة (الإنتاج ٥ حتى ترقيته)
const AUTH_MAX = { [TEST]: 0, [PROD]: 5 };
const AUTH_RE = /(?<!mpData\.)\bauth\.(signInWithEmailAndPassword|createUserWithEmailAndPassword|sendPasswordResetEmail|signOut|onAuthStateChanged|currentUser|updatePassword|reauthenticateWithCredential)\b/g;
function countAuthDirect(content){
  const iso = sliceModule(content, 'const mpData = (function(){');
  const total = (content.match(AUTH_RE) || []).length;
  const inIso = (iso.match(AUTH_RE) || []).length;
  return total - inIso;
}
for (const [n, s] of FILES) {
  const hasDal = countOcc(s, 'const mpData = (function(){') === 1;
  const max = hasDal ? AUTH_MAX[n] : 5;
  const direct = countAuthDirect(s);
  check(direct <= max, 'direct auth calls outside DAL ' + n + ' = ' + direct + ' (max ' + max + ')');
}

// ---------- ١٠) M2-ID: حرّاس البنية والهوية والسلوك ومسارات الكتابة — عشرة فحوص ----------
// منقولة من الفحوص اليدوية لدفعة الهوية على الكود (ختام جلسة ٣٠–٣١ أغسطس ٢٠٢٦ · القسم د) + فحص عاشر (الألوان خارج الهوية).
// تُطبَّق على نسخة الاختبار دائمًا، وعلى الإنتاج عند ترقيته (يُكشف بوجود كتلة الهوية <style id="identity">).
// قاعدة التسليم: ما كان أحمر على M2-ID-r42 يُعلَن WARN بقائمته المسمّاة (KNOWN_*) والإصلاح دفعة مستقلة؛ أي جديد خارج القائمة = FAIL.
// السقوف (CAP_*) مجمَّدة على قياس r42 وتُخفَّض ولا تُرفع — نمط حارس النواة (§٩).
function warn(name, why){ console.log('WARN  ' + name + (why ? '  →  ' + why : '')); }
function styleBlock(s, id){
  const m = s.match(new RegExp('<style[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</style>'));
  return m ? m[1] : '';
}
// قواعد الأنماط: [{sel, decl:{prop:value}}] — تحليل بسيط يكفي ورقتَي البنية والهوية (لا تداخل ولا @media)
function cssRules(css){
  const out = [];
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(src))){
    const sel = m[1].trim(); if (!sel || sel.startsWith('@')) continue;
    const decl = {};
    m[2].split(';').forEach(d => { const i = d.indexOf(':'); if (i > 0) decl[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim(); });
    out.push({ sel, decl });
  }
  return out;
}
function classesInSelector(sel){ return [...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]); }
function varName(v){ const m = /var\(--([\w-]+)\)/.exec(v || ''); return m ? m[1] : null; }
// الأسطح والأحبار — من ملف الهوية (القرار ٢٠٢٦-٠٨-٢٩-٠٢ · ٠٣ · ٠٧ · ٢٠٢٦-٠٨-٣٠-٠٢)
const NIGHT_SURF = ['paper', 'bar', 'surf', 'line-night', 'line-bar', 'line-strong', 'ink', 'ink-soft', 'danger', 'night-4'];
const IVORY_SURF = ['ivory', 'ivory-bright', 'line-ivory'];
const INK_FAMILY = ['ink', 'ink-strong', 'ink-faint', 'ink-soft', 'danger'];
const NIGHT_FAMILY = ['on-night', 'night-2', 'night-3', 'night-4', 'saffron', 'danger-night', 'ivory-bright', 'ivory'];
const KNOWN_UNSTYLED = [];                     // ر43: أُغلق (قاعدة flabel أُضيفت بدفعة تصحيحات الهوية) — القائمة تبقى فارغة
const KNOWN_STRUCT_IN_IDENTITY = [];          // ر43: أُغلق (الحدّان نُقلا إلى كتلة البنية)
const KNOWN_EMPTY_RULES = [];                  // ر43: أُغلق (القاعدتان الفارغتان حُذفتا)
const KNOWN_DEAD = ['requestReauth'];          // ر42: مبنية عمدًا قبل موعدها (تأكيد الهوية — تُستدعى بدفعتي كلمة المرور والحذف المتتالي) · r78: باني شريحة «قريبًا» يبقى بلا مستهلك بعد أن صار مسار اليوم حقيقيًّا (الحارس §10 يشترط وجوده؛ القريب مني في الدفعة ج قد يستعمله)
// ---------- §34 (r98): القائمة المعتمدة لوسوم Soon — تُعرَّف هنا لأن الحرّاس يُستدعون قبل ذيل الملف
const KNOWN_SOON = [ /* النص الظاهر → المرحلة التي تُزيله (الخطة §٢) */
  { re: /Available when Google sign-in arrives/, phase: 'هـ · Continue with Google' },
  { re: /App card &amp; home-screen icon<\/span><span class="soon">المرحلة ب/, phase: 'ب · بطاقة التطبيق وأيقونة الشاشة' },
  { re: /soonChip\('Open now', 'Soon'/, phase: 'بلا موعد · لا ساعات عمل مخزَّنة' },
  { re: /Arrives with stage هـ <span class="soon-tag">هـ|Continue with Google<\/span><span class="soon">هـ/, phase: 'هـ · Continue with Google (الدرج · نافذة الحساب)' },
];
const KNOWN_NO_OUTLET = []; /* r116-هـ: stats_cards فُتح مخرجه (كاتب statsCard وقارئ My stats) — القائمة فرغت */ // ز-١-ج-٢ (الوثيقة الثامنة v1.17): الباقي بلا مخرج stats_cards وحده — ما فُتح مخرجه خرج من القائمة // r72p: مخارجها فُتحت بنسخة الاختبار (تحذير «opened» متوقع) — تُحذف من القائمة عند ترقية الإنتاج، لأن الفحص يشمل index.html القديم // M4.25 (١٧ سبتمبر): الخمس الجديدة مسجَّلة بوثيقة القدرات v1.14 قبل مخرجها (r72m · ر٧٢-ب · لوحة الإدارة) · نشرة التنظيف (٤ سبتمبر): كتلة favorites حُذفت من القواعد — خرجت من القائمة (الثامنة ج-١-ج أُغلق) // ر٥٢ (٣ سبتمبر): قدرات ٣٫٨ الأربع (listBookmarks · tripSaves · bookmarkCount · saveCount) فُتح مخرجها بدفعة كود الأفعال — أزيلت بمرآة الثامنة v1.4 // الوثيقة الدائمة الثامنة — قدرات بُنيت قبل موعدها
const CAP_COLORS_OUTSIDE_IDENTITY = { [TEST]: 139, [PROD]: 149 }; // ر42 = ١٤٩ (١٤ صريحًا · ١٣٥ متغيرًا) · ر43 = ١٤٠ · ر50 = ١٣٩ (سطر الخطأ صار صنفًا بالهوية) · سقف الإنتاج يُخفَّض عند ترقيته · يُخفَّض ولا يُرفع
const CONTROL_CLASSES = ['btn', 'chip', 'act', 'actn', 'cta', 'csel', 'pl-src', 'mp-tab', 'dr-item', 'acc-item', 'switch-btn', 'pl-actbtn', 'addr-chip', 'pl-catpick', 'city-tab', 'area-chip', 'hcard', 'remove-btn', 'bmk-btn', 'reorder-btn', 'add-place-btn', 'quick-nav-btn', 'action-btn', 'status-toggle', 'mp-burger', 'mp-idchip', 'pw-eye', 'show-more-btn', 'pclose', 'prow', 'addmini'];
const LIFE_PATHS = [ // مسارات الحياة العشرة — دالة مدخل مسمّاة لكل مسار: معرَّفة ومستدعاة
  ['signup', ['doSignUp']], ['signin', ['doSignIn']], ['save place', ['savePlPlace', 'saveMyCityList']],
  ['publish & share', ['plTogglePublic', 'shareCityListWithSomeone']], ['trip', ['openTripBuilder', 'saveTrip']],
  ['private address', ['saveAddr']], ['bookmark', ['togglePlaceBookmark']], ['suspend', ['toggleSuspendUser']],
  ['delete', ['deleteTrip', 'plDeleteRow', 'deleteAddr', 'openDeletePreview']], ['sign out', ['doSignOut', 'confirmLogout']]
];
// عقود مسارات الكتابة على بيانات المستخدم — الحرّاس الثلاثة (مصفوفة الأمان M4.19 · دليل التشغيل v1.21)
const WRITE_CONTRACTS = [
  ['if (myCityListLoadedFor !== cityListCityId){', 1, 'حارس التطابق داخل saveMyCityList'],
  ['myCityListLoadFailed = true; myCityListLoadedFor = null;', 1, 'حارس فشل القراءة: تبقى غير محمَّلة'],
  ["permission denied (rules 3.8", 1, 'تصنيف قراءة الغائب ٣٫٨: الرفض حقيقي لا غيابًا (ق٠١-٠٧ — ر٥٢)'],
  ['myCityListLoadFailed = false; myCityListLoadedFor = null;', 1, 'إعادة المحاولة الصريحة تصفّر العلمين معًا'],
  ['backfillPlaceIds(myCityListData.categories) && !currentUserSuspended && Object.keys(myCityListData.categories).length', 1, 'الكتابة الخلفية لا تعمل على محتوى فارغ'],
  ['if (!currentUser || !userListData || !mpAccountReady()) return;', 1, 'التنقية بعد تحقق التحميل (r120: «محمَّل لهذا المستخدم» لا «لم يفشل»)'],
  ['if (!live.size) return;', 1, 'لا تنقية بلا مدن محمَّلة'],
  ['if (currentUserSuspended){ showToast(\'Your account is suspended — you can\\\'t save changes\'); return; }', 3, 'الموقوف لا يحفظ (القائمة · الرحلة · البيانات العامة)']
];

// §10-م (ر٥٤ — ملاحظة المالك على واجهة المنتقي): إبرة تباين القشرة المعتَّمة
// تغلق عمى الفحص الثلاثي: قواعد اللون بلا خلفية · الأزواج المضمّنة · تركيب opacity.
function curatorContrastGuard(label, s){
  const T = '§10-م ' + label + ': ';
  const vals = {}; for (const m of s.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) vals[m[1]] = m[2];
  const hx = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
  const mixc = (a,b,t) => a.map((v,i)=>v*t+b[i]*(1-t));
  const lum = c => { const f = u => { u/=255; return u<=0.03928 ? u/12.92 : Math.pow((u+0.055)/1.055,2.4); };
    const [r,g,b] = c.map(f); return 0.2126*r+0.7152*g+0.0722*b; };
  const cr = (a,b) => { let la=lum(a), lb=lum(b); if (la<lb) [la,lb]=[lb,la]; return (la+0.05)/(lb+0.05); };
  const need = ['paper','ivory-bright','ink','on-night','night-2','night-3','saffron'];
  if (!need.every(k => vals[k])){ fail(T + 'identity vars present', 'missing: ' + need.filter(k=>!vals[k]).join(',')); return; }
  const om = s.match(/\.cur-shell\{[^}]*opacity:\s*([0-9.]+)/);
  check(!!om, T + 'cur-shell dim value found');
  if (!om) return;
  const O = parseFloat(om[1]);
  const P = hx(vals['paper']), IVB = hx(vals['ivory-bright']);
  const pairsList = [
    ['on-night/paper', mixc(hx(vals['on-night']),P,O), P],
    ['night-3/paper',  mixc(hx(vals['night-3']),P,O),  P],
    ['night-2/paper',  mixc(hx(vals['night-2']),P,O),  P],
    ['saffron/paper',  mixc(hx(vals['saffron']),P,O),  P],
    ['ink/card',       mixc(hx(vals['ink']),P,O),      mixc(IVB,P,O)]
  ];
  const low = pairsList.filter(([n,f,b]) => cr(f,b) < 4.5).map(([n,f,b]) => n + '=' + cr(f,b).toFixed(2));
  check(low.length === 0, T + 'dimmed shell pairs \u2265 4.5 (opacity ' + O + ')', 'below: ' + low.join(' | '));
  // المحدد الجامح: تجاوزات curhead يجب ألا تبلغ صفوف الأماكن
  check(!/\.curhead\s*>\s*div\s+\.(pn|ps)/.test(s), T + 'no greedy curhead override reaching rows');
  check(s.includes('.curhead > div:not(.row) .pn') && s.includes('.curhead > div:not(.row) .ps'), T + 'tightened curhead selectors present');
  // الأزواج المضمّنة: ترقية من رصدٍ لفحص — نفس قاعدة تباين §10
  const NIGHT_S = new Set(NIGHT_SURF), IVORY_S = new Set(IVORY_SURF), INK_F = new Set(INK_FAMILY), NIGHT_F = new Set(NIGHT_FAMILY);
  const bad = [];
  for (const m of s.matchAll(/style="([^"]*)"/g)){
    const st = m[1];
    const bg = st.match(/background(?:-color)?:\s*var\(--([a-z0-9-]+)\)/);
    const fg = st.match(/(?:^|[^a-z-])color:\s*var\(--([a-z0-9-]+)\)/);
    if (!bg || !fg) continue;
    const b = bg[1], f = fg[1];
    if ((b === 'saffron' && f !== 'ink') || (NIGHT_S.has(b) && INK_F.has(f)) || (IVORY_S.has(b) && NIGHT_F.has(f) && f !== 'saffron' && f !== 'danger')) bad.push(b + '+' + f);
  }
  check(bad.length === 0, T + 'inline background+colour pairs conform', 'violations: ' + bad.slice(0,6).join(' | '));
}

// ═══ دفعة الحارس (ر٥٦ · ٣ سبتمبر مساءً) — ثلاث إبر جديدة، كلٌّ اختُبرت بطفرات عند زرعها ═══

// §١١ — إبرة «فتحتَها ولم تُهاجرها»: دوال خارج النواتين (mpData · mpTrack) بنداء منصة مباشر.
// القائمة الإرثية لقطة ر٥٦ مثبَّتة — تتناقص ولا تزيد (كسقف الألوان): اسم جديد أو زيادة عدٍّ = دالة فُتحت بلا هجرة.
const KNOWN_DIRECT = [["addCity", 1], ["chooseNickname", 7], ["doSignUp", 6], ["initFirebase", 9], ["linkOwnerUid", 2], ["loadAllCityStatus", 3], ["loadCategoryTemplate", 1], ["loadCity", 2], ["loadCommunityLists", 1], ["loadCommunityUserTrips", 1], ["loadCustomCities", 1], ["loadCustomCountries", 1], ["loadOwnerUid", 1], ["loadSharedCityLists", 1], ["loadUserList", 3], ["loadUserTrips", 2], ["loadVisitCount", 1], ["openCommunityTrip", 2], ["openUsersModal", 3], ["registerUserRecord", 6], ["removeCity", 1], ["removeMyListCountry", 1], ["renderMpErrorsCard", 1], ["renderMpEventsCard", 2], ["saveCategoryTemplate", 1], ["saveCity", 1], ["saveCityStatusSummary", 1], ["saveCustomCountries", 1], ["saveTrip", 1], ["saveUserListGeneral", 1], ["shareTripWithSomeone", 1], ["syncCommunityProfileFor", 3], ["trackVisit", 2], ["viewCommunityUser", 3]];
function migrationGuard(label, s){
  const T = '§11 ' + label + ': ';
  const script = (s.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/) || [,''])[1];
  const code = stripComments(script);
  function span(needle){ const i = code.indexOf(needle); if (i < 0) return null; const j = code.indexOf('})();', i); return [i, j < 0 ? code.length : j + 5]; }
  const allowedSpans = [span('const mpData = (function(){'), span('const mpTrack = (function(){')].filter(Boolean);
  const inAllowed = pos => allowedSpans.some(([a,b]) => pos >= a && pos < b);
  const fns = [];
  for (const m of code.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) fns.push([m.index, m[1]]);
  const owner = pos => { let n = '(top-level)'; for (const [i, name] of fns){ if (i <= pos) n = name; else break; } return n; };
  const counts = {};
  for (const m of code.matchAll(/(?<![\w$.'"])(?:db|auth|firebase)\s*\./g)){
    if (inAllowed(m.index)) continue;
    const n = owner(m.index); counts[n] = (counts[n] || 0) + 1;
  }
  const baseline = Object.fromEntries(KNOWN_DIRECT);
  const newcomers = Object.keys(counts).filter(n => !(n in baseline));
  const grown = Object.keys(counts).filter(n => (n in baseline) && counts[n] > baseline[n]);
  check(newcomers.length === 0, T + 'no NEW function with direct platform calls', 'opened without migration: ' + newcomers.join(' | '));
  check(grown.length === 0, T + 'no legacy function grew its direct calls', grown.map(n => n + ' ' + baseline[n] + '\u2192' + counts[n]).join(' | '));
  const shrunk = KNOWN_DIRECT.filter(([n,c]) => (counts[n] || 0) < c);
  if (shrunk.length) console.log('INFO  ' + T + 'legacy shrank (تُحدَّث اللقطة): ' + shrunk.map(([n]) => n).join(', '));
}

// §١٢ + §١٣ — فحصا ملف المرجع: توازن حاويات كل مشهد (ق٠٢-٠٢ — درس حاوية ٦/د٢) وسقف وسم mk ≤ ٤٥ (ق٠٣-٠٦).
// المرجع يُلتقط بنمط الاسم (يصمد أمام ترقيات النسخ) من الجذر أو docs/ — وبغيابه تحذير صريح لا فشل زائف.
const MK_LEGACY = [
  "Day plan: زر معطَّل بالخطوة الخامسة · يُفعَّل بالخطوة السادسة",
  "v1.38 — قسم مستقل؛ الاسم نفسه للوحة المنتقي بالخطوة الرابعة",
  "مبنية بالنص المعتمد — باب مغلق حتى دفعة نشر السياسة",
  "إدارة المستخدمين ونافذة الحالة: كما هما داخلها"
]; // إرث ما قبل ق٠٣-٠٦ («أي وسم جديد») — يتناقص بإعادة الصياغة للنوت ولا يزيد
function referenceGuard(){
  const T = '§12/13 reference: ';
  let refPath = null;
  for (const dir of [ROOT, path.join(ROOT, 'docs')]){
    if (!fs.existsSync(dir)) continue;
    const c = fs.readdirSync(dir).filter(f => /^Mypickz-STEPS-marked-v.*\.html$/.test(f)).sort();
    if (c.length){ refPath = path.join(dir, c[c.length - 1]); break; }
  }
  if (!refPath){ console.log('WARN  ' + T + 'reference file not in repo \u2014 container-balance and mk-cap checks skipped'); return; }
  const r = fs.readFileSync(refPath, 'utf8');
  pass(T + 'found ' + path.basename(refPath));
  const scenes = [...r.matchAll(/<section class="scene"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  check(scenes.length >= 20, T + 'scenes detected (' + scenes.length + ')');
  const unbalanced = scenes.filter(([, id, body]) => (body.match(/<div\b/g) || []).length !== (body.match(/<\/div>/g) || []).length).map(([, id]) => id);
  check(unbalanced.length === 0, T + 'every scene div-balanced', 'unbalanced: ' + unbalanced.join(' | '));
  check((r.match(/<section class="scene"/g) || []).length === (r.match(/<\/section>/g) || []).length, T + 'sections open = close');
  const tags = [...r.matchAll(/<(?:span|div) class="mk[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/g)] // ر٦٨: يشمل div.mk الغلاف (درس لافتة ٧ سبتمبر)
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const over = tags.filter(t => t.length > 45 && !MK_LEGACY.includes(t));
  check(over.length === 0, T + 'mk tags \u2264 45 chars (legacy list excepted)', 'over: ' + over.map(t => t.slice(0, 30) + '\u2026(' + t.length + ')').join(' | '));
  const gone = MK_LEGACY.filter(t => !tags.includes(t));
  if (gone.length) console.log('INFO  ' + T + 'legacy mk reworded (\u062a\u064f\u0634\u0637\u0628 \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629): ' + gone.length);
}
function idGuard(label, s){
  const code = stripComments(s);
  const structure = styleBlock(s, 'structure'), identity = styleBlock(s, 'identity');
  const sRules = cssRules(structure), iRules = cssRules(identity);
  const sClasses = new Set(), iClasses = new Set();
  sRules.forEach(r => classesInSelector(r.sel).forEach(c => sClasses.add(c)));
  iRules.forEach(r => classesInSelector(r.sel).forEach(c => iClasses.add(c)));
  const T = '§10 ' + label + ': ';

  // ١) تباين السطح — قاعدة هوية تجمع خلفية ونص: ليلي ⇒ حبر فاتح · عاجي ⇒ حبر · زعفران ⇒ حبر
  const contrast = [];
  iRules.forEach(r => {
    const bg = varName(r.decl['background'] || r.decl['background-color']); const fg = varName(r.decl['color']);
    if (!bg || !fg) return;
    if (bg === 'saffron' && fg !== 'ink') contrast.push(r.sel);
    else if (NIGHT_SURF.includes(bg) && INK_FAMILY.includes(fg)) contrast.push(r.sel);
    else if (IVORY_SURF.includes(bg) && NIGHT_FAMILY.includes(fg) && fg !== 'saffron' && fg !== 'danger') contrast.push(r.sel);
  });
  check(contrast.length === 0, T + 'surface contrast (identity rules with bg+color)', 'violations: ' + contrast.join(' | '));

  // ٢) بنية وهوية لكل صنف — معمَّم على كل صنف مستعمَل بالترميز والقوالب
  const used = new Set();
  for (const m of code.matchAll(/class=\\?["']([^"'\\]+)/g)) m[1].split(/\s+/).forEach(c => { if (c && !/[${}()+'"]/.test(c)) used.add(c); });
  for (const m of code.matchAll(/classList\.(?:add|toggle|remove)\(\s*'([A-Za-z_][\w-]*)'/g)) used.add(m[1]);
  for (const m of code.matchAll(/className\s*=\s*'([^']+)'/g)) m[1].split(/\s+/).forEach(c => { if (c) used.add(c); });
  // أصناف الأنماط بهذا الملف كلها بحروف صغيرة وشرطات؛ ما عداه (متغيرات القوالب والمعاملات) يُستبعد
  const usedClean = [...used].filter(c => /^[a-z][a-z0-9-]*$/.test(c) && !/^(true|false|null)$/.test(c) && !/^fa(-|$)|^mk|^st$/.test(c) && !/^(pinkey|geo-pin)-?$/.test(c) && !/^it-/.test(c)); /* ج: أصناف it-* تعيش في ملف البرنامج المولَّد (52-trip-itinerary) بورقة أنماطه الخاصة داخل الملف */ // خ-٥: بادئتا الأصناف الديناميكية (pinkey-<fam> · geo-pin-<fam>) تُبنيان من المتغيّر؛ قواعدهما الكاملة بالهوية
  const noRule = usedClean.filter(c => !sClasses.has(c) && !iClasses.has(c));
  const newNoRule = noRule.filter(c => !KNOWN_UNSTYLED.includes(c));
  const knownNoRule = noRule.filter(c => KNOWN_UNSTYLED.includes(c));
  check(newNoRule.length === 0, T + 'every used class has a rule (structure or identity) — ' + usedClean.length + ' classes', 'no rule: ' + newNoRule.join(', '));
  if (knownNoRule.length) warn(T + 'known unstyled classes (r42, fixed in identity-corrections batch)', knownNoRule.join(', '));
  const empty = sRules.filter(r => Object.keys(r.decl).length === 0).map(r => r.sel.replace(/\s*,\s*/g, ','));
  const newEmpty = empty.filter(e => !KNOWN_EMPTY_RULES.includes(e));
  check(newEmpty.length === 0, T + 'no empty rules in structure block', 'empty: ' + newEmpty.join(' | '));
  if (empty.length - newEmpty.length) warn(T + 'known empty structure rules (r42)', empty.filter(e => KNOWN_EMPTY_RULES.includes(e)).join(' | '));
  // البنية لا لون · الهوية لا بنية (حدود بسُمك/نمط · أبعاد · مسافات)
  const colorInStructure = sRules.filter(r => Object.values(r.decl).some(v => /#[0-9a-fA-F]{3,8}\b|rgba?\(|var\(--/.test(v)));
  check(colorInStructure.length === 0, T + 'structure block has zero colour declarations', colorInStructure.map(r => r.sel).join(' | '));
  const structInIdentity = iRules.filter(r => Object.keys(r.decl).some(p => /^(width|height|padding|margin|font|border(?!-color|-[a-z]+-color)|border-top$|border-bottom$|position|display|top|left|right|bottom|gap)/.test(p) && !/color/.test(p) && !/^box-shadow$/.test(p)))
    .map(r => r.sel);
  const newStructInIdentity = structInIdentity.filter(x => !KNOWN_STRUCT_IN_IDENTITY.includes(x));
  check(newStructInIdentity.length === 0, T + 'identity block has no structural declarations', newStructInIdentity.join(' | '));
  if (structInIdentity.length - newStructInIdentity.length) warn(T + 'known structural declarations inside identity (r42)', structInIdentity.filter(x => KNOWN_STRUCT_IN_IDENTITY.includes(x)).join(' | '));

  // ٣) مظهر بلا سلوك — كل عنصر بصنف ضابط يحمل معالجًا أو رابطًا أو تعطيلًا أو وسم label/Soon
  const noBehaviour = [];
  const tagRe = /<(button|a|span|div)\b([^>]*)>([^<]{0,60})/g; let tm;
  while ((tm = tagRe.exec(code))){
    const attrs = tm[2], text = tm[3];
    const cm = /class=\\?["']([^"'\\]+)/.exec(attrs); if (!cm) continue;
    const cls = cm[1].split(/\s+/);
    if (!cls.some(c => CONTROL_CLASSES.includes(c))) continue;
    if (cls.includes('label') || cls.includes('cur-shell') || cls.includes('trip-soon')) continue;
    if (/\bon(click|change|input|keydown|submit)=/.test(attrs) || /\bhref=/.test(attrs) || /\bdisabled\b/.test(attrs) || /\bdata-label=/.test(attrs)) continue;
    if (/Soon|Stage \d|Step \d/.test(text)) continue;
    // قشرة معطَّلة (cur-shell على الحاوية — تمتد لكل عناصر الصفحة داخل شاشتها) أو حاوية يحمل ابنها المعالج (صفوف اللوحات)
    const after = code.slice(tm.index, tm.index + 260);
    const shellIdx = code.lastIndexOf('cur-shell', tm.index), screenIdx = code.lastIndexOf('mp-screen', tm.index);
    if (tm[1] !== 'button' && (shellIdx > screenIdx || /\bonclick=/.test(after.slice(tm[0].length)))) continue;
    noBehaviour.push('<' + tm[1] + ' class="' + cm[1] + '">' + text.trim().slice(0, 30));
  }
  check(noBehaviour.length === 0, T + 'appearance without behaviour (control classes)', noBehaviour.slice(0, 6).join(' | ') + (noBehaviour.length > 6 ? ' … +' + (noBehaviour.length - 6) : ''));

  // ٤) سلامة المعرّفات — كل معرّف يناديه الكود حرفيًا موجود بالترميز أو بالقوالب
  const idsInMarkup = new Set([...code.matchAll(/\bid=\\?["']([A-Za-z_][\w-]*)\\?["']/g)].map(m => m[1]));
  const idsCalled = new Set();
  for (const m of code.matchAll(/getElementById\(\s*'([A-Za-z_][\w-]*)'\s*\)/g)) idsCalled.add(m[1]);
  for (const m of code.matchAll(/querySelector(?:All)?\(\s*'#([A-Za-z_][\w-]*)/g)) idsCalled.add(m[1]);
  const missingIds = [...idsCalled].filter(i => !idsInMarkup.has(i));
  check(missingIds.length === 0, T + 'id integrity (' + idsCalled.size + ' literal ids called)', 'missing: ' + missingIds.join(', '));

  // ٥) كل زر إلى دالته — كل استدعاء بأي سمة حدث (onclick · onchange · oninput · onkeydown · onsubmit) إلى دالة معرَّفة
  const defined = new Set();
  for (const m of code.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
  for (const m of code.matchAll(/(?:^|\n)\s*(?:const|let|var|window\.)\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) defined.add(m[1]);
  const GLOBAL_OK = new Set(['if', 'else', 'for', 'while', 'switch', 'return', 'event', 'this', 'document', 'window', 'confirm', 'alert', 'String', 'Number', 'parseInt', 'setTimeout', 'encodeURIComponent', 'Array', 'Object']);
  const badCalls = new Set(); let attrCount = 0;
  for (const m of code.matchAll(/\bon(?:click|change|input|keydown|submit)=\\?["']([^"']*)\\?["']/g)){
    attrCount++;
    for (const c of m[1].matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)){
      const name = c[2];
      if (GLOBAL_OK.has(name) || defined.has(name)) continue;
      badCalls.add(name);
    }
  }
  check(badCalls.size === 0, T + 'every event attribute call resolves (' + attrCount + ' attributes)', 'undefined: ' + [...badCalls].join(', '));

  // ٦) مسارات الحياة العشرة — دالة المدخل معرَّفة ومستدعاة خارج تعريفها
  const brokenPaths = [];
  LIFE_PATHS.forEach(([name, fns]) => fns.forEach(fn => {
    const def = defined.has(fn);
    const refs = (code.match(new RegExp('\\b' + fn.replace(/\$/g, '\\$') + '\\b', 'g')) || []).length;
    if (!def || refs < 2) brokenPaths.push(name + ':' + fn + (def ? ' (never called)' : ' (undefined)'));
  }));
  check(brokenPaths.length === 0, T + 'ten life paths — entry functions defined and called', brokenPaths.join(' | '));

  // ٧) دوال ميتة — دالة معرَّفة لا يُشار إليها بأي موضع آخر (كودًا أو سمة)
  const dead = [];
  for (const fn of defined){
    if (/^on[a-z]+$/.test(fn)) continue;      // معالجات النافذة (window.onerror) ليست دوالًا تُستدعى بالاسم
    const refs = (code.match(new RegExp('(?<![\\w$.])' + fn.replace(/\$/g, '\\$') + '(?![\\w$])', 'g')) || []).length;
    if (refs < 2) dead.push(fn);
  }
  const newDead = dead.filter(d => !KNOWN_DEAD.includes(d));
  check(newDead.length === 0, T + 'no dead functions (' + defined.size + ' defined)', 'dead: ' + newDead.join(', '));
  if (dead.length - newDead.length) warn(T + 'known functions built ahead of their caller (r42)', dead.filter(d => KNOWN_DEAD.includes(d)).join(', '));

  // ٨) قدرات القواعد بلا مخرج — كل مجموعة وحقل مصرَّح بالقواعد يُستعمل بالواجهة، أو مسجَّل بالوثيقة الثامنة (KNOWN_NO_OUTLET)
  const rulesPath = path.join(ROOT, 'firestore.rules');
  if (fs.existsSync(rulesPath)){
    const rules = stripComments(fs.readFileSync(rulesPath, 'utf8'));
    const collections = new Set([...rules.matchAll(/match \/([A-Za-z_]+)\/\{/g)].map(m => m[1]).filter(c => c !== 'databases'));
    const fields = new Set();
    for (const m of rules.matchAll(/hasAny\(\[([^\]]+)\]\)|'(verified|followerCount|bio|contactUrl|showFollowerCount|displayName)'\s+in\s+request/g)){
      if (m[2]) fields.add(m[2]);
    }
    ['verified', 'followerCount', 'bio', 'contactUrl', 'showFollowerCount', 'displayName'].forEach(f => { if (new RegExp("'" + f + "'").test(rules)) fields.add(f); });
    const noOutletCol = [...collections].filter(c => !new RegExp("['\"]" + c + "['\"/]").test(code));
    const noOutletField = [...fields].filter(f => !new RegExp("['\"]" + f + "['\"]|\\." + f + "\\b|\\b" + f + "\\s*:").test(code));
    const all = noOutletCol.concat(noOutletField);
    const unknown = all.filter(x => !KNOWN_NO_OUTLET.includes(x));
    check(unknown.length === 0, T + 'rules capabilities without an outlet are recorded (doc 8) — ' + collections.size + ' collections', 'unrecorded: ' + unknown.join(', '));
    // ر٧٣-أب (١) — درس حادثة v3.13: كل مجموعة يقرؤها/يكتبها التطبيق يجب أن تكون معرَّفة بالقواعد (المعكوس من فحص المخرج) — القراءة لمجموعة محذوفة تُرفض عند الإقلاع وتختل بها سلسلة التحميل
    const usedCols = new Set([...code.matchAll(/(?:col|collection)\(['"]([A-Za-z_]+)['"]\)/g)].map(m => m[1]));
    const undefinedCols = [...usedCols].filter(c => !collections.has(c));
    check(undefinedCols.length === 0, T + 'every collection the app touches is defined in the rules — ' + usedCols.size + ' used', 'not in rules: ' + undefinedCols.join(', '));
    const bareToast = (code.match(/onclick=\\?["']showToast\(/g) || []).length; // ز-١-ج-٣: لا زر يعد بميزة ثم يعرض رسالة فقط — المؤجَّل يُوسم بـsoonChip/showSoon
    check(bareToast === 0, T + 'no bare showToast buttons (deferred features use soonChip/showSoon)', bareToast + ' found');
    const recordedNow = KNOWN_NO_OUTLET.filter(x => all.includes(x));
    console.log('INFO  ' + T + 'capabilities awaiting an outlet = ' + recordedNow.length + ' (' + recordedNow.join(', ') + ')');
    const opened = KNOWN_NO_OUTLET.filter(x => !all.includes(x));
    if (opened.length) warn(T + 'recorded capabilities now have an outlet — move them out of doc 8', opened.join(', '));
  } else {
    console.log('INFO  ' + T + 'firestore.rules not found at repo root — rules-outlet check skipped');
  }

  // ٩) مسارات الكتابة على البيانات — العقود الحرفية للحرّاس الثلاثة
  WRITE_CONTRACTS.forEach(([needle, expected, meaning]) => {
    const c = countOcc(code, needle);
    check(c >= expected, T + 'write-path contract: ' + meaning, 'expected ≥' + expected + ' found ' + c + ' — ' + needle.slice(0, 60));
  });
  // رصد فقط: كتل catch تصفّر بيانات المستخدم بخريطة فارغة (مسار الدليل القديم يُتقاعد بالمرحلة الخامسة)
  const emptyInCatch = (code.match(/catch\(e\)\{\s*(?:links|myLinks|customCities|favoritePlaces|userTrips|sharedTrips)\s*=\s*(?:\{\}|\[\])/g) || []).length;
  console.log('INFO  ' + T + 'catch blocks resetting user data to empty = ' + emptyInCatch);

  // ١٠) الألوان خارج كتلة الهوية — سمات مضمَّنة وقوالب وشيفرة: عدّاد بسقف مجمَّد يُخفَّض ولا يُرفع
  const outside = code.replace(styleBlock(code, 'identity'), '').replace(styleBlock(code, 'structure'), '');
  const outsideNoDiag = outside.split('\n').filter(l => !/logTiming|__timingBox|__timingStart/.test(l)).join('\n');
  const colours = (outsideNoDiag.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|var\(--/g) || []).length;
  const cap = CAP_COLORS_OUTSIDE_IDENTITY[label];
  const lit = (outsideNoDiag.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || []).length;
  check(colours <= cap, T + 'colours outside identity block = ' + colours + ' (cap ' + cap + ')');
  console.log('INFO  ' + T + 'colour literals outside identity = ' + lit + ' · colour variables in inline styles/templates = ' + (colours - lit));
}
// ---------- §19 (ر٦٨ — ق٠٩-٠٦-١٩ · ق٠٩-٠٧-٠١): عقد العنصر المؤجل — لا disabled صامت ولا تلميح وحيد ----------
function deferredContractGuard(label, s){
  const T = '§19 ' + label + ': ';
  const btns = [...s.matchAll(/<button\b[^>]*>/g)].map(m => m[0]);
  const silent = btns.filter(b => /\bdisabled\b/.test(b) && !/onclick=/.test(b) && /title=/.test(b));
  check(silent.length === 0, T + 'no disabled+title button without a handler (deferred = soonChip)', 'found ' + silent.length + ': ' + silent.map(b=>b.slice(0,60)).join(' | '));
  const soonNoHandler = [...s.matchAll(/<button\b[^>]*class="(?:[^"]*\s)?soon(?:\s[^"]*)?"[^>]*>/g)].map(m=>m[0]).filter(b => !/onclick=/.test(b));
  check(soonNoHandler.length === 0, T + 'every .soon element responds (onclick present)', 'silent: ' + soonNoHandler.length);
  const soonNoTag = [...s.matchAll(/<button\b[^>]*class="(?:[^"]*\s)?soon(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/button>/g)].filter(m => !/<span class="(?:dim|soon|mini)">/.test(m[1]));
  check(soonNoTag.length === 0, T + 'every .soon element carries a visible tag', 'untagged: ' + soonNoTag.length);
  check(/function soonChip\(/.test(s) && /function showSoon\(/.test(s), T + 'soonChip()/showSoon() builders present');
}
// ---------- §20 (ر٦٨): أزواج الأصناف بحل السطح من جدول SURFACES المسمّى بالكود ----------
function surfaceContrastGuard(label, s){
  const T = '§20 ' + label + ': ';
  const vals = {}; for (const m of s.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) vals[m[1]] = m[2];
  const alpha = {}; for (const m of s.matchAll(/--([a-z0-9-]+):\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/g)) alpha[m[1]] = [[+m[2],+m[3],+m[4]], parseFloat(m[5])];
  const tbl = s.match(/const SURFACES = (\{[^;]*\});/);
  check(!!tbl, T + 'SURFACES table present in code'); if (!tbl) return;
  let SURF; try { SURF = Function('return ' + tbl[1])(); } catch(e){ fail(T + 'SURFACES parses'); return; }
  const hx = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
  const lum = c => { const f = u => { u/=255; return u<=0.03928 ? u/12.92 : Math.pow((u+0.055)/1.055,2.4); }; const [r,g,b]=c.map(f); return 0.2126*r+0.7152*g+0.0722*b; };
  const cr = (a,b) => { let la=lum(a), lb=lum(b); if (la<lb) [la,lb]=[lb,la]; return (la+0.05)/(lb+0.05); };
  const identity = (s.match(/<style id="identity">([\s\S]*?)<\/style>/) || [])[1] || '';
  const bad = [];
  // ر٦٨ب: كل قاعدة تُقسَّم بمحدداتها (بالفاصلة) ويُقيَّم كل محدد وحده — فلا يفلت `.actn b,.x b{…}` لأن آخر محدد خارج الجدول
  for (const rule of identity.matchAll(/([^{}]+)\{([^}]*)\}/g)){
    const body = rule[2];
    const fg = (body.match(/(?:^|[;\s])color:\s*var\(--([a-z0-9-]+)\)/) || [])[1]; if (!fg) continue;
    const bgv = (body.match(/background(?:-color)?:\s*var\(--([a-z0-9-]+)\)/) || [])[1];
    for (const selector of rule[1].split(',').map(x => x.trim())){
      const m = selector.match(/\.([a-z0-9-]+)(?:\.[a-z-]+)?(?:\s+(?:b|span|\.dim))?$/); if (!m) continue;
      const cls = m[1]; const surf = SURF[cls]; if (!surf) continue;
      const host = vals[surf]; if (!host) { bad.push(cls + ': unknown surface ' + surf); continue; }
      const scopedIvory = /\.(?:modal|panel|drawer|dpanel|pl-row|row|card)\b/.test(selector);
      const scopedNight = /\.(?:pl-ownerpanel|stickyhead|mp-empty|pl-cathead|topbar|tabbar|chipgrid|curhead|place-row-view|block)\b/.test(selector);
      const H = bgv && vals[bgv] ? hx(vals[bgv]) : hx(scopedIvory ? vals['ivory'] : (scopedNight ? vals['paper'] : host));
      let F = vals[fg] ? hx(vals[fg]) : null;
      if (!F && alpha[fg]) { const [c,t] = alpha[fg]; F = c.map((v,i)=>v*t+H[i]*(1-t)); }
      if (!F) continue;
      const need = /bmk|icon|act\b/.test(cls) ? 3 : 4.5;
      const ratio = cr(F, H);
      if (ratio < need) bad.push(cls + ' [' + selector + '] ' + fg + ' on ' + (bgv || (scopedIvory ? 'ivory' : (scopedNight ? 'paper' : surf))) + ' = ' + ratio.toFixed(2));
    }
  }
  check(bad.length === 0, T + 'every identity class pair ≥ 4.5 text / ≥ 3 icons on its declared surface', bad.join(' | '));
}
idGuard(TEST, test);
curatorContrastGuard(TEST, test);
deferredContractGuard(TEST, test);
surfaceContrastGuard(TEST, test);
migrationGuard(TEST, test);
referenceGuard();
if (prod && styleBlock(prod, 'identity')) {
  idGuard(PROD, prod);
  curatorContrastGuard(PROD, prod);
} else {
  console.log('INFO  prod not yet promoted to the identity batch (no <style id="identity">) — §10 applied to test only');
}

finish();

function finish(){
  referenceConformanceGuard(TEST, test);
  slashCommentGuard(TEST, test);
  buildGuard();
  manifestGuard();
  tripModelGuard();
  perfInvariantsGuard();
  importRedLinesGuard();
  sortRedLinesGuard();
  undoRedLinesGuard();
  planTruthGuard();
  handlerCoverageGuard();
  soonGuard();
  faultMatrixGuard();
  planMatrixGuard();
  dupFnGuard();
  namesGuard();
  readsGuard();
  dataMembersGuard();
  sessionGuard();
  uiParityGuard();
  wiringGuard();
  helpGuard();
  statsKeysGuard(TEST, test);
  dialogGuard(TEST, test);
  toastGuard();
  bookmarkMapGuard();
  pinGuard();
  soloGuard();
  worldGuard();
  accountReadyGuard();
  cityCountsGuard();
  viewOnceGuard();
  console.log('\n' + (fails === 0 ? '✅ AUDIT PASSED' : '❌ AUDIT FAILED (' + fails + ')'));
  process.exit(fails === 0 ? 0 : 1);
}

// ---------- §43 (r115-أ · بيان r115 §٢-أ — «المشكلة عيّنة لصنف»): الإرشاد جدول واحد. الصنف: نصٌّ يصف الشاشة ولا يعرف حين تتغيّر —
//            كانت ٢١ محطة تثبّت «Help يواكب» بجملة حرفية وقت كتابتها، فبقي في النص ما زال اسمه من الشاشة (Add from My places · Save this day · 1 · Pin the matches)،
//            وانجرفت اللغتان (كائنان بلا مقابلة)، وظهر وسم البناء للمستخدم. هنا يُقابَل كل اسم مُبرَز بمصدر الشاشة وباللغة الأخرى في كل بناء.
function helpGuard(){
  const T = '§43 help is one table (r115): ';
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts;
  const hs = fs.readFileSync(path.join(ROOT, 'src', '60-help.js'), 'utf8');
  const outside = parts.filter(function(p){ return p !== '60-help.js' && /\.(js|html)$/.test(p); }).map(function(p){ return fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); }).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 '); /* r115 (مراجعة مستقلة): الاسم يُطلب في الكود لا في تعليق — «＋ Places» و«Not in My places» كانا في تعليقين فقط ومرّا */
  const a = hs.indexOf('const HELP_TOPICS = ['), b = hs.indexOf('\n];', a); let topics = [];
  try{ topics = (0, eval)('(' + hs.slice(hs.indexOf('[', a), b + 2) + ')'); }catch(e){ check(false, T + 'the topics table parses', String(e)); return; }
  const GROUPS = ['places', 'trips', 'curators', 'community', 'addresses', 'cards', 'import', 'privacy', 'howto', 'settings', 'home'];
  const ids = topics.map(function(t){ return t.id; });
  const badShape = topics.filter(function(t){ return !(t.id && GROUPS.indexOf(t.dest) >= 0 && t.id.indexOf(t.dest + '.') === 0 && Array.isArray(t.tags) && Array.isArray(t.ui) && t.en && t.ar && t.en.h && t.ar.h && t.en.b && t.en.b.length > 40 && t.ar.b && t.ar.b.length > 30); }).map(function(t){ return t.id; });
  const emptyG = GROUPS.filter(function(g){ return !topics.some(function(t){ return t.dest === g; }); });
  check(topics.length >= 40 && new Set(ids).size === ids.length && badShape.length === 0 && emptyG.length === 0, T + 'every topic carries both languages (heading and text), its destination and its tags; every one of the eleven groups has topics (' + topics.length + ' topics)', 'bad: ' + badShape.join(' · ') + ' ‖ empty groups: ' + emptyG.join(' · '));
  /* (٢) وسم البناء بيانات لا نص: لا في المواضيع ولا في المستوى الأول ولا في Symbols و Icons guide */
  const TAG = /\br\d{2,3}[a-z]?(?:-[\u0600-\u06FF]+)?\b/;
  const tagged = topics.filter(function(t){ return TAG.test(t.en.h + ' ' + t.en.b + ' ' + t.ar.h + ' ' + t.ar.b); }).map(function(t){ return t.id; });
  const code = hs.slice(0, a) + hs.slice(b); const shown = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 '); const strTag = (shown.match(/'(?:[^'\\\n]|\\.)*'/g) || []).filter(function(x){ return x.length > 12 && TAG.test(x); });
  check(tagged.length === 0 && strTag.length === 0, T + 'no build tag in any text a user reads (topics · level one · Symbols · Icons guide) — tags are data', 'topics: ' + tagged.join(' · ') + ' ‖ strings: ' + strTag.map(function(x){ return x.slice(0, 70); }).join(' ‖ '));
  /* (٣) كل اسم في ui: في نصَّي اللغتين وفي مصدر الشاشة */
  const inSrc = function(n){ return outside.indexOf(n) >= 0 || outside.indexOf(n.replace(/&amp;/g, '&')) >= 0 || outside.indexOf(n.replace(/'/g, "\\'")) >= 0 || outside.indexOf(n.replace(/’/g, "'")) >= 0; };
  const badUi = []; topics.forEach(function(t){ t.ui.forEach(function(n){ if (t.en.b.indexOf(n) < 0) badUi.push(t.id + ' · not in English · ' + n); else if (t.ar.b.indexOf(n) < 0) badUi.push(t.id + ' · not in Arabic · ' + n); else if (!inSrc(n)) badUi.push(t.id + ' · not on any screen · ' + n); }); });
  const nUi = topics.reduce(function(x, t){ return x + t.ui.length; }, 0);
  check(nUi >= 100 && badUi.length === 0, T + 'every button name a topic lists is written in both languages and exists in the app source outside Help (' + nUi + ' names)', badUi.join(' ‖ '));
  /* (٤) كل اسم مُبرَز (<b> · <i>) في الإنجليزية: إما في ui وإما مسمًّى هنا بأنه ليس اسم زر — فاسم جديد لا يدخل بلا مقابلة */
  const HELP_NOT_UI = ['Places outside …: Estepona', 'beside a town', 'Re-read N pins', 'They follow the list', 'Which …?', 'Where is …?', 'That pin is … km from …', 'city', 'public|private', 'shared N', 'what happened', 'who orders the stops', 'two', 'on your device', 'Already in your list', 'Same name as an older place of yours', 'Looks similar', "In a city you don't have yet", "In a city we don't cover yet", 'waits', 'A place link', 'Your saved lists', 'On Android']; /* عبارات مُبرَزة للتوكيد أو نماذج بنقاط ومتغيّرات — لا تكبر بلا سبب مكتوب */
  const loose = [], usedNot = {}; topics.forEach(function(t){ const seen = {}; const re = /<(b|i)>([^<]+)<\/\1>/g; let m; while ((m = re.exec(t.en.b))){ const n0 = m[2].replace(/:$/, '').trim(); if (!/[A-Za-z]/.test(n0) || seen[n0]) continue; seen[n0] = 1;
      const ps = (t.ui.indexOf(n0) >= 0) ? [n0] : n0.split(/ · | › /).map(function(x){ return x.replace(/^[^A-Za-z]+/, '').replace(/ ›$/, '').replace(/^N /, '').trim(); }).filter(function(x){ return x.length >= 3; }); /* اسم مركَّب (A · B › C) يُقابَل بأجزائه · ما دون ثلاثة أحرف ليس اسمًا */
      ps.forEach(function(n){ if (t.ui.indexOf(n) >= 0) return; if (HELP_NOT_UI.indexOf(n) >= 0){ usedNot[n] = 1; return; } loose.push(t.id + ' · ' + n); }); } });
  const staleNot = HELP_NOT_UI.filter(function(n){ return !usedNot[n]; });
  check(loose.length === 0 && staleNot.length === 0 && HELP_NOT_UI.length <= 23, T + 'every emphasised name in a topic is either a listed button name or on the short not-a-button list, which only shrinks (' + HELP_NOT_UI.length + ')', 'unlisted: ' + loose.join(' ‖ ') + ' ‖ stale: ' + staleNot.join(' · '));
  /* (٥) الانجراف المعاكس: اسم لاتيني مُبرَز في العربية يجب أن يكون في إنجليزية الموضوع نفسه */
  const arOnly = []; topics.forEach(function(t){ const re = /<(b|i)>([^<]+)<\/\1>/g; let m; while ((m = re.exec(t.ar.b))){ const n = m[2].replace(/:$/, '').trim(); if (/[A-Za-z]/.test(n) && !/[\u0600-\u06FF]/.test(n) && t.en.b.indexOf(n) < 0) arOnly.push(t.id + ' · ' + n); } });
  check(arOnly.length === 0, T + 'a button name emphasised in Arabic is in the English of the same topic', arOnly.join(' ‖ '));
  /* (٦) مصدر واحد: الكائن القديم بقسميه لا يعود · أزرار البطاقة جدول واحد تقرؤه الصفحتان · فعل كل بطاقة باسم زر في الشاشة */
  const acts = (hs.match(/const HELP_ACT = \{([^}]+)\}/) || [, ''])[1]; const actNames = (acts.match(/'[^']+'/g) || []).map(function(x){ return x.slice(1, -1); });
  const actBad = actNames.filter(function(n){ const core = n.replace(/^＋ /, ''); return !/^Open (Curators|Community|Addresses)$/.test(n) && outside.indexOf(core) < 0; });
  check(!/\bsections: \[/.test(hs) && !/my cities/.test(hs) && (hs.match(/CARD_ACTIONS\.map\(/g) || []).length === 2 && !/row\('maps', 'Google Maps'/.test(hs) && !/row\(mpIcon\('maps'/.test(hs) && actNames.length === 5 && actBad.length === 0, T + 'one source: no per-language sections object, the place-card buttons are one table read by Symbols and the Icons guide, and each card action is named as its button on the screen', 'action names not on screen: ' + actBad.join(' · '));
  /* (٧) أصناف مسرح العرض خاصة به: «hd» صنف بطاقات الرئيسية — النموذج الأول سمّى المسرح به فانسكب تنسيقه عليها (وُجد بالقراءة ١١ نوفمبر) */
  const css = fs.readFileSync(path.join(ROOT, 'src', '10-structure.css'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src', '20-identity.css'), 'utf8');
  const bareHd = (css.match(/(^|[},])[ \t]*\.hd\s*[{,]/gm) || []).length; const hdmOutside = /\bhdm\b|hdm-/.test(outside);
  check(bareHd === 0 && !hdmOutside && /class="hdm"/.test(hs), T + 'the walkthrough stage has class names of its own: no bare .hd rule in the stylesheets, and hdm is used nowhere outside Help', 'bare .hd rules: ' + bareHd + ' · hdm outside Help: ' + hdmOutside);
}

// ---------- §41 (r110-ب · ق١١-١١-٠٢ — «المشكلة عيّنة لصنف»): واجهة واحدة لشكلَي محرّر الخطة. مصفوفة الخطة (§36) تحرس البيانات؛ هذا القسم يحرس الواجهة:
//            أفعال صف المحطة وأبواب الإضافة تُرسم من قطع مشتركة بالأسماء والترتيب المعلنة في tests/ui-parity.js — ورسّاما الشكلين لا يكتبان فعل صف خارجها.
function wiringGuard(){
  /* r115-د (ق١١-١١-٠٥ · مراجعة القدرات v1.1): الصنف «مبنيّ بلا نداء». الفحص القديم (٨) يعدّ المجموعة مخدومة إن وُجد اسمها في الواجهة — فمرّت دالة كاتبة بلا أي نداء (stats_places · placeFavoriteCounts.bump)
     وأحداث تقبلها القواعد ولا يُطلقها الكود. هنا يُقابَل كل طرف بمن *يناديه*؛ وما لا نداء له مسمًّى في قائمة لا تكبر، لكل اسم موعده. */
  const T = '§42 built means wired (r115): ';
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts.filter(function(p){ return /\.js$/.test(p); });
  const src = {}; parts.forEach(function(p){ src[p] = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); }); const all = Object.keys(src).map(function(k){ return src[k]; }).join('\n');
  /* (١) طبقة البيانات: كل دالة mpData.<ns>.<fn> لها نداء */
  const UNWIRED_DATA = { /* الاسم: موعده أو سببه — r116: فرغ السجلّ: stats.placesOf و stats.listDays وُصلا بشاشة أثر القائمة (openListImpact)، والثلاث الباقية (userLists.get · cityLists.setVisibility · cities.links) حُذفت بلا نداء */
  };
  const defs = []; let ns = null; src['43-mpdata.js'].split('\n').forEach(function(line){ let m = line.match(/^    ([A-Za-z]\w*): \{/); if (m){ ns = m[1]; const re = /(?:[\s,{])([A-Za-z]\w*): (?:async )?function/g; let x; while ((x = re.exec(line))) defs.push(ns + '.' + x[1]); return; } if (/^    [A-Za-z]\w*: (?:async )?function/.test(line)){ ns = null; return; } if (ns){ m = line.match(/^\s{6}([A-Za-z]\w*): (?:async )?function/); if (m) defs.push(ns + '.' + m[1]); } });
  const used = function(n){ return new RegExp('\\b' + n.replace('.', '\\.') + '\\b').test(all); };
  const dead = defs.filter(function(n){ return !used(n) && !UNWIRED_DATA[n]; }); const stale = Object.keys(UNWIRED_DATA).filter(function(n){ return used(n) || defs.indexOf(n) < 0; });
  check(defs.length >= 100 && dead.length === 0, T + 'every data-layer method is called somewhere (' + defs.length + ' methods · ' + Object.keys(UNWIRED_DATA).length + ' named as not yet wired)', 'no caller: ' + dead.join(' · '));
  check(stale.length === 0 && Object.keys(UNWIRED_DATA).length <= 5, T + 'the not-yet-wired list only shrinks (data layer)', 'remove: ' + stale.join(' · '));
  /* (٢) القياس: كل دالة يصدّرها mpTrack لها نداء خارج ملفها */
  const tr = src['42-mptrack.js']; const exp = (tr.match(/return \{\s*\n\s*hit: hit,[^\n]*\n[^\n]*/) || [''])[0]; const names = (exp.match(/(\w+): \w+/g) || []).map(function(x){ return x.split(':')[0]; });
  const others = Object.keys(src).filter(function(k){ return k !== '42-mptrack.js'; }).map(function(k){ return src[k]; }).join('\n'); const TRACK_INTERNAL = { closeSession: 'يناديها الملف نفسه عند إخفاء الصفحة' };
  const deadT = names.filter(function(n){ return !new RegExp('mpTrack\\.' + n + '\\b').test(others) && !TRACK_INTERNAL[n]; });
  check(names.length >= 12 && deadT.length === 0, T + 'every tracker function is called from the app (' + names.length + ' — statsPlaceList · savedBy · count included)', 'no caller: ' + deadT.join(' · '));
  /* (٣) الأحداث: كل مفتاح تقبله القواعد يُطلقه الكود بنداء hit('k' أو count('k' — أو مسمًّى بموعده */
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'); const i = rules.indexOf('function eventKeysOk'); const keys = (rules.slice(i, rules.indexOf(']', i)).match(/'([a-z_0-9]+)'/g) || []).map(function(x){ return x.slice(1, -1); });
  const UNWIRED_EVENTS = { /* r116-ح: الأربعة التي وُعد بإطلاقها أُطلقت (mylist_open · share_card · personal_open · personal_save). r117-ب (ق١١-١١-١٥): الأربعة الباقية (curator_view · curator_contact · curator_follow · session_depth) عوّضتها عدّادات أخرى فحُذفت من القواعد v3.16 — السجل فارغ: كل مفتاح تقبله القواعد يُطلق */ };
  const allCode = all.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 '); /* النداء في الكود لا في تعليق */
  const fired = function(k){ return new RegExp("(?:hit|count)\\('" + k + "'").test(allCode); };
  const mute = keys.filter(function(k){ return !fired(k) && !UNWIRED_EVENTS[k]; }); const staleE = Object.keys(UNWIRED_EVENTS).filter(function(k){ return fired(k) || keys.indexOf(k) < 0; });
  check(keys.length === 21 && mute.length === 0, T + 'every event the rules accept is fired by a hit()/count() call (' + (keys.length - Object.keys(UNWIRED_EVENTS).length) + '/' + keys.length + ' · ' + Object.keys(UNWIRED_EVENTS).length + ' named with their slot)', 'never fired: ' + mute.join(' · '));
  check(staleE.length === 0 && Object.keys(UNWIRED_EVENTS).length === 0, T + 'the not-yet-fired list only shrinks (events)', 'remove: ' + staleE.join(' · '));
  /* (٣-ب) r115-أ: كل خطوة في عرض متحرّك تسمّي معالجًا معرَّفًا خارج ملف الإرشاد واسم زر مكتوبًا في الواجهة — زر يُحذف أو يُعاد تسميته يُسقط البناء لا يترك شرحًا يشير إلى لا شيء */
  { const hs = src['60-help.js']; const steps = []; const re = /point: '([^']+)', ui: '([^']+)', fn: '([A-Za-z_$][\w$]*)', en: '[^']{12,}', ar: '[^']{8,}'/g; let m; while ((m = re.exec(hs))) steps.push({ point: m[1], ui: m[2], fn: m[3] });
    const outside = Object.keys(src).filter(function(k){ return k !== '60-help.js'; }).map(function(k){ return src[k]; }).join('\n') + '\n' + fs.readFileSync(path.join(ROOT, 'src', '30-body.html'), 'utf8'); /* أسماء الأزرار المكتوبة في صفحة HTML الثابتة (نافذتا المكان والعنوان) تُحسب */
    const demoIds = (hs.match(/\n  (\w+): \{ title: \{ en: /g) || []).map(function(x){ return x.replace(/\n  (\w+):.*/, '$1'); });
    check(JSON.stringify(demoIds.slice().sort()) === JSON.stringify(['addresses', 'community', 'curators', 'places', 'trips']), T + 'each of the five destinations has a walkthrough', demoIds.join(' · '));
    const badS = steps.filter(function(st){ return !new RegExp('function\\s+' + st.fn + '\\s*\\(').test(outside) || outside.indexOf(st.ui) < 0 || st.point.indexOf(st.fn) < 0; }).map(function(st){ return st.fn + ' / ' + st.ui; });
    check(steps.length >= 17 && badS.length === 0, T + 'every walkthrough step names a real handler, a label written in the app, and points at that handler (' + steps.length + ' steps)', badS.join(' ‖ ')); }
  /* (٤) قائمة الديون — تُطبع مع كل تشغيل (ق١١-١١-٠٥: الضمان في المستودع لا في الذاكرة). لكل دين شرط إغلاقه. لا تكبر بلا قرار. */
  const OPEN_DEBTS = [
    /* r117-د: دَين readers أُغلق — يوميات stats_lists يقرؤها أثر القائمة (openListImpact ← mpData.stats.listDays) منذ r116-د، والستة الأخرى لوحة المالك منذ r116-ب؛ سجل UNWIRED_DATA فارغ ويحرسه §42 */
    ['thresholds', 'عتبات «لا توجد بيانات كافية» غير معايَرة — مسمّاة كلها في سجلّ UNCALIBRATED أدناه وعلى لوحات المالك علامة not calibrated (أُزيلت من شاشة المستخدم بطلبه — r120)', 'تُغلق بمعايرتها من بيانات حقيقية (كل ثابت يخرج من السجلّ عند معايرته)'],
    ['offline-save', 'كتابة لا تعود عند انقطاع الاتصال: Cancel و Save في المحرّر يبقيان متوقفين', 'دفعة بقياس سلوك Firestore على الخادم الحي'],
    /* r117-ج: دَين handlers أُغلق — الثمانية الباقية نالت محطاتها (وفي خمسٍ منها وُجدت عيوب أُصلحت: tbAddCity · addrModalAddCity · curEditPlace · exportOtherList · زر 📤 للرحلة المشارَكة) */
  ];
  /* r116 (وُجد ١١ نوفمبر: نشرة v3.15 كُتبت والتطبيق ما زال ينتظر v3.14 — سطر Rules في لوحة المالك كان سيقول DRIFT بعد نشر صحيح): الإصدار الذي ينتظره التطبيق = إصدار ملف القواعد في رأسه */
  { const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'); const rv = (rules.match(/^\/\/ firestore rules (v\d+\.\d+)/) || [])[1] || ''; const ev = (src['61-admin-users.js'].match(/const EXPECTED_RULES = '(v\d+\.\d+)'/) || [])[1] || '';
    check(!!rv && rv === ev, T + 'the rules version the app expects equals the version at the top of firestore.rules (' + rv + ')', 'file ' + rv + ' · app expects ' + ev); }
  /* r117-أ/ب: نصّ القاعدتين في firestore.rules كما أُقرّ (ق١١-١١-١٥) — المحاكي الرسمي لا يعمل في بيئة الكتابة (يشغّله CI بـtests/rules-sim.js القسمين ٢٩ و٣٠)، فهذا حارس نصّي يمنع زوالهما صامتًا لا أكثر:
     العدّاد +١ (إنشاءً وتحديثًا) بـ!exists && existsAfter لسجل صاحبه · −١ بـexists && !existsAfter · والمفاتيح الأربعة المحذوفة لا تعود إلى قائمة الأحداث · والتطبيق لا يكتب العدّاد إلا من باب واحد */
  { const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'); const body = rules.split('\n').filter(function(l){ return !/^\s*\/\//.test(l); }).join('\n'); const a0 = body.indexOf('match /placeFavoriteCounts/{docId} {'); const blk = a0 < 0 ? '' : body.slice(a0, body.indexOf('allow delete: if isOwner();', a0));
    const n = function(t){ return blk.split(t).length - 1; };
    check(blk.indexOf("copies/$(request.auth.uid + '__p_' + docId)") > 0 && n('!exists(savedRec()) && existsAfter(savedRec())') === 2 && n('exists(savedRec()) && !existsAfter(savedRec())') === 1 && n('request.resource.data.count == resource.data.count + 1') === 1 && n('request.resource.data.count >= 0') === 1, T + 'rules text: a place counter moves only with the saver’s own record in the same request (+1 create and update · −1)', 'create/update +1: ' + n('!exists(savedRec()) && existsAfter(savedRec())') + ' · −1: ' + n('exists(savedRec()) && !existsAfter(savedRec())'));
    /* v3.16 (١-ب · ١-ج — ق١١-١١-١٨): الاتجاه الثاني للربط في قاعدة copies ومعرّف العدّاد وقراءة صاحب الحقل */
    { const c0 = body.indexOf('match /copies/{docId} {'); const cb = c0 < 0 ? '' : body.slice(c0, body.indexOf('match /curatorCityNotes/', c0)); const m = function(t){ return cb.split(t).length - 1; };
      check(m('&& (!isSaveRec() || saveCounted())') === 1 && m("&& (!isSaveRec() || saveReleased())") === 1 /* v3.17: الشرطان باقيان بنصّهما وبعدهما شروط سجلَّي القائمة والرحلة */ && m("docId.split('__')[1].matches('p_[a-f0-9]{16}')") === 1 && m('getAfter(saveCounter()).data.count == get(saveCounter()).data.count + 1') === 1 && m('getAfter(saveCounter()).data.count == get(saveCounter()).data.count - 1') === 1 && m('get(saveCounter()).data.count <= 0') === 1 && n("&& docId.matches('[a-f0-9]{16}')") === 2 && n("request.resource.data.url.matches('https?://.*')") === 1 && n('request.resource.data.name is string && request.resource.data.name.size() <= 120') === 1 && n('request.resource.data.url is string && request.resource.data.url.size() <= 400') === 1, T + 'rules text: a save record is created only with +1 on its counter and deleted only with −1 (or when there is nothing to lower) · counter ids are 16 hex on create and on every move · name and link are bounded strings, the link http(s)', 'create ' + m('&& (!isSaveRec() || saveCounted());') + ' · delete ' + m('&& (!isSaveRec() || saveReleased()));'));
      check(m("((resource != null && resource.data.uid == request.auth.uid) || docId.split('__')[0] == request.auth.uid)") === 1, T + 'rules text: a copy record is readable by the owner of its uid field (the account-deletion query)', 'read rule changed'); }
    /* v3.17 (ق١١-١٢-٠٥): نصوص المراجعة الشاملة — المحور ١. حارس نصّي يمنع زوالها صامتًا؛ السلوك نفسه يمتحنه CI (القسمان ٣١ و٣٢ في tests/rules-sim.js). */
    { const has = function(t){ return body.split(t).length - 1; }; const want = [
        ['request.resource.data.ownerId == resource.data.ownerId', 3, 'owner field pinned (trips · lists · category docs)'],
        ['allow read: if isSignedIn() && request.auth.uid == userId;', 1, 'userLists read by its owner only'],
        ['request.auth.uid != uid', 2, 'profile owner cannot move the visitors counters (v3.18: + the withdrawal branch)'],
        ['&& bmCounted();', 1, 'bookmark record created only with its counter'], ['&& bmReleased());', 1, 'bookmark record deleted only when released'],
        ['&& tsCounted();', 1, 'trip-save record created only with its counter'], ['&& tsReleased());', 1, 'trip-save record deleted only when released'],
        ['&& followCounted();', 1, 'follow record created only with its counter'], ['&& followReleased());', 1, 'follow record deleted only when released'],
        ["(request.resource.data.kind != 'list' || cntUp(copyList()))", 1, 'list-copy record created only with its counter'], ["resource.data.get('kind', '') != 'trip' || cntFree(copyTrip()))", 1, 'trip-copy record deleted only when released'],
        [".data.kind == 'list')", 3, 'list copyCount moves only with a record of kind list (ق١١-١٢-٠٦ · v3.18: + the withdrawal branch)'], [".data.kind == 'trip')", 3, 'trip copyCount moves only with a record of kind trip (v3.18: + the withdrawal branch)'],
        ["allow read: if docId == 'visits' || isOwner();", 1, 'analytics read by name'], ['request.resource.data.at >= request.time.toMillis() - 86400000', 1, 'curator request time near the server clock'],
        ['math.abs(request.resource.data.lat - resource.data.lat) <= 0.01', 1, 'place identity proximity'],
        ['allow list: if isOwner(); // v3.18 (١٢)', 1, 'nicknames cannot be listed — except by the app owner (v3.18 ١٢ · ق١١-١٧-١٠)'], ["request.resource.data.keys().hasOnly(['uid', 'nickname'])", 1, 'nickname doc holds two fields'],
        ['&& request.auth.uid == userId && !isSuspended();', 1, 'suspended user cannot create the users doc'],
        ['resource.data.at + 604800000', 1, 'curator re-request after one week'],
        ['isSignedIn() && resource.data.by == request.auth.uid); // v3.17', 0, ''],
        ['function dayNear(d)', 1, 'date window helper'], ['&& anDay(docId)', 10, 'date window on the five daily analytics kinds'], ['&& shownFieldsOk()', 2, 'typed shown fields on lists (create · owner update)'], /* البند ١٤ (ربط الاسم) سُحب — ق٣-٤ مشروط، قياس ١٢ نوفمبر */ ['&& tripShownOk()', 2, 'typed shown fields on trips (create · owner update)']
      ].filter(function(w){ return w[2]; }); const off = want.filter(function(w){ return has(w[0]) !== w[1]; }).map(function(w){ return w[2] + ' (' + has(w[0]) + '/' + w[1] + ')'; });
      const rd = rules.indexOf("allow read: if isOwner() || (isSignedIn() && resource.data.by == request.auth.uid);") >= 0;
      check(off.length === 0 && rd, T + 'rules text v3.17: the lines approved for the first-axis fixes are all present (' + want.length + ' markers + the reports read line)', (off.join(' · ') || 'reports read line missing'));
      /* v3.18 (ق١١-١٤-٠٢): السجل يخرج بعدّاده دائمًا — الفروع الثلاثة ودوالّ الإطلاق الأربع كما أُقرّ نصّها */
      const w18 = [["affectedKeys().hasOnly(['bookmarkCount', 'copyCount'])", 1, 'lists: withdrawal branch'], ["affectedKeys().hasOnly(['saveCount', 'copyCount'])", 1, 'trips: withdrawal branch'], ["affectedKeys().hasOnly(['followerCount'])", 1, 'profiles: withdrawal branch'], ['// v3.18 (١)', 7, 'three branches + four release functions carry the v3.18 mark'], ['// v3.18 (١-ب)', 2, 'lists and trips: the withdrawal branch requires a real decrement (ق١١-١٤-٠٣)'], ["== resource.data.get('copyCount', 0) - 1) // v3.18 (١-ب)", 2, 'the (١-ب) line ends on copyCount − 1 in both branches'], ['|| isSuspended()\n          || (existsAfter', 0, 'no release function lets a suspended user take the record out alone'], ["|| !(get(bmList()).data.get('public', false) == true", 0, 'bookmark: not-public is no longer a release'], ['|| !fCountable()', 0, 'follow: not-countable is no longer a release']];
      const off18 = w18.filter(function(x){ return (rules.split(x[0]).length - 1) !== x[1]; }).map(function(x){ return x[2] + ' (' + (rules.split(x[0]).length - 1) + '/' + x[1] + ')'; });
      /* المراجعة المستقلة (٥): دوالّ الإطلاق الأربع تُفحص بأجسامها — لا شرط علنية ولا إيقاف ولا «معدود» في أيّ منها، وكلٌّ يحمل «المصدر غائب · العدّاد عند الصفر · −١ في الطلب نفسه»؛ والفروع الثلاثة تحمل «سجلي قائم قبلُ وزائل بعدُ» */
      ['bmReleased', 'tsReleased', 'cntFree', 'followReleased'].forEach(function(fn){ const m = rules.match(new RegExp('function ' + fn + '\\([^)]*\\) \\{[\\s\\S]*?\\n      \\}')); const body = m ? m[0].replace(/\/\/[^\n]*/g, '') : '';
        if (!body) off18.push(fn + ': body not found'); else { if (/isSuspended|public|sharedWith|fCountable|hasAnyPublicContent|verified|openTo/.test(body)) off18.push(fn + ': carries a not-open / suspended release again'); if (!/!exists\(/.test(body) || !/<= 0/.test(body) || !/existsAfter\(\w+(\(\))?\) && getAfter\(/.test(body) || !/- 1\)/.test(body)) off18.push(fn + ': one of the three release cases is missing'); } });
      { const wd = rules.split('// v3.18 (١)').length - 1; const pairs = (rules.match(/&& exists\(\/databases\/\$\(database\)\/documents\/(listBookmarks|tripSaves|copies|follows)\/\$\(request\.auth\.uid \+ '__?' \+ \w+\)\)\s*\n\s*&& !existsAfter\(/g) || []).length; if (pairs !== 5) off18.push('withdrawal branches: "my record exists before and is gone after" pairs ' + pairs + ' ≠ 5 (bookmark · list copy · trip save · trip copy · follow)'); }
      { /* (١-ب · المراجعة المستقلة): الشرط كاملًا بسطرَيه، في فرعه، بعد سطرَي >= 0 وقبل أول «(» تالية — والتعليقات خارج الحكم (سطر معلَّق لا يُحسب) */ const bare = rules.split('\n').filter(function(l){ return !/^\s*\/\//.test(l); }).map(function(l){ return l.replace(/\s*\/\/.*$/, ''); }).join('\n'); const esc = function(x){ return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }; const g = function(f){ return "request.resource.data.get('" + f + "', 0)"; }, r0 = function(f){ return "resource.data.get('" + f + "', 0)"; };
        [['bookmarkCount', 'copyCount'], ['saveCount', 'copyCount']].forEach(function(pr){ const a = pr[0], b = pr[1]; const re = new RegExp(esc("affectedKeys().hasOnly(['" + a + "', '" + b + "'])") + '\\s*&& ' + esc(g(a) + ' >= 0') + '\\s*&& ' + esc(g(b) + ' >= 0') + '\\s*&& \\(' + esc(g(a) + ' == ' + r0(a) + ' - 1') + '\\s*\\|\\| ' + esc(g(b) + ' == ' + r0(b) + ' - 1') + '\\)\\s*&& \\(' + esc(g(a) + ' == ' + r0(a)) + '\\s', 'g'); const n = (bare.match(re) || []).length; if (n !== 1) off18.push('(١-ب) the real-decrement condition of the ' + a + ' branch: found ' + n + ' ≠ 1 (whole two-line condition, in place)'); }); }
      { /* (٢ · ق١١-١٤-٠٥): الأسطر الثمانية — إنشاء وتحديث المخازن الأربعة يبدآن باشتراط الدخول، و stats_cards بلا اشتراط */ let cur = null; const seen = {}; rules.split('\n').forEach(function(l){ const m = l.match(/match \/(\w+)\/\{/); if (m) cur = m[1]; const a = l.match(/^\s+allow (create|update): if (.*)$/); if (a && cur && /^stats_/.test(cur)){ seen[cur + ' ' + a[1]] = /^isSignedIn\(\) && /.test(a[2]); } });
        ['stats_lists', 'stats_trips', 'stats_places', 'stats_curators', 'stats_cities'].forEach(function(c){ ['create', 'update'].forEach(function(k){ if (seen[c + ' ' + k] !== true) off18.push('(٢) ' + c + ' ' + k + ' does not start with isSignedIn()'); }); }); ['create', 'update'].forEach(function(k){ if (seen['stats_cards ' + k] !== false) off18.push('(٢) stats_cards ' + k + ' must stay open (card arrival before sign-in)'); });
        const tr = fs.readFileSync(path.join(ROOT, 'src', '42-mptrack.js'), 'utf8'); if (tr.split("if (/^stats_(lists|trips|places|curators)\\//.test(path) && !(typeof currentUser !== 'undefined' && currentUser)) continue;").length - 1 !== 1) off18.push('(٢) the tracker no longer holds the four stores while nobody is signed in'); }
      { /* (٣) و(٤) و(٥) · ق١١-١٤-٠٩ · ق١١-١٤-١١ · ق١١-١٤-١٢: النصوص المُقرّة في مكانها (أسبوعية، بالحقلين n و v)، والتطبيق موصول بها. الأسطر المشتركة بين (٣) و(٥) تُعدّ مرتين */ const need = [["match /viewers/{docId} {", 1], ["match /viewerCounts/{docId} {", 1], ["match /placeViews/{docId} {", 1], ["match /placeViewers/{docId} {", 1], ["match /placeViewerCounts/{docId} {", 1],
        ["function weekStr(t) {", 1], ["let back = t.dayOfWeek() - timestamp.date(2026, 11, 8).dayOfWeek();", 1], ["return dayStr(t - duration.value(back < 0 ? back + 7 : back, 'd'));", 1], ["dayOfWeek() == 7", 0], /* ق١١-١٤-١٦: رقم الأحد من المحرّك نفسه — ٨ نوفمبر ٢٠٢٦ أحد */ ["dayOfYear", 0], ["-W", 0], ["function weekNear(w) {", 1], ["|| w == weekStr(request.time - duration.value(1, 'd'))\n        || w == weekStr(request.time + duration.value(1, 'd'));", 1],
        ["&& getAfter(vCnt()).data.get('n', 0) == (exists(vCnt()) ? get(vCnt()).data.get('n', 0) : 0) + 1;", 2], ["|| get(vCnt()).data.get('n', 0) <= 0\n                || (existsAfter(vCnt()) && getAfter(vCnt()).data.get('n', 0) == get(vCnt()).data.get('n', 0) - 1)))\n        || (isSignedIn() && docId.split('__')[0] == request.auth.uid // v3.18 (٧)", 2],
        ["&& vp()[3].matches('[0-9]{4}-[0-9]{2}-[0-9]{2}') && weekNear(vp()[3])", 2], ["&& vwSrcOpen(vp()[1], vp()[2])", 1], ["&& vwSrcOpen('l', vp()[1])", 1], ["&& vp()[1].matches('[A-Za-z0-9_-]{1,60}') && vp()[2].matches('[a-f0-9]{16}')", 1],
        ["&& request.resource.data.at == request.time", 2], ["allow list: if isOwner() || (isSignedIn() && resource.data.uid == request.auth.uid);", 2], ["allow update: if false;\n      allow delete: if isOwner()\n        || (isSignedIn() && docId.split('__')[0] == request.auth.uid\n            && (!exists(vCnt())", 2],
        ["&& request.resource.data.keys().hasOnly(['n', 'v'])\n        && nNew() == 1 && (vNew() == 0 || vNew() == 1)\n        && !exists(cRec()) && existsAfter(cRec());", 2], ["&& request.resource.data.diff(resource.data).affectedKeys().hasOnly(['n', 'v'])", 2],
        ["&& ((nNew() == nOld() + 1 && !exists(cRec()) && existsAfter(cRec()) && (vNew() == vOld() || vNew() == vOld() + 1))\n            || (nNew() == nOld() - 1 && nNew() >= 0 && exists(cRec()) && !existsAfter(cRec()) && vNew() == vOld())\n            || (nNew() == nOld() && vNew() == vOld() + 1 && !isSuspended()", 2],
        ["&& cp()[2].matches('[0-9]{4}-[0-9]{2}-[0-9]{2}') && weekNear(cp()[2]) && vwSrcOpen(cp()[0], cp()[1])));", 1], ["&& cp()[1].matches('[a-f0-9]{16}') && cp()[2].matches('[0-9]{4}-[0-9]{2}-[0-9]{2}') && weekNear(cp()[2])\n                && vwSrcOpen('l', cp()[0])));", 1],
        ["&& get(/databases/$(database)/documents/userCityLists/$(cp()[0])).data.ownerId == request.auth.uid);", 1],
        ["&& request.resource.data.diff(resource.data).affectedKeys().hasOnly(['n'])\n        && request.resource.data.n == resource.data.n + 1;", 1], ["monthNear", 0], ["monthStr", 0]];
        need.forEach(function(x){ if (rules.split(x[0]).length - 1 !== x[1]) off18.push('(٣/٤) rule line missing or repeated — ' + x[0].slice(0, 46)); });
        const srcOf = function(f){ return fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'); }; const wired = [['58-community-curators.js', "mpViewerMark('l', k);"], ['58-community-curators.js', "if (currentUser && uid !== currentUser.uid) mpViewerMark('p', uid);"], ['53-community-trips.js', "if (currentUser && trip.ownerId !== currentUser.uid){ mpViewerMark('t', tripId); if (trip.public === true) mpViewerMark('p', trip.ownerId);"], ['58-community-curators.js', "mpViewerMark('l', k); if (viewingUserData && viewingUserData.uid === viewingUserUid && Array.isArray(viewingUserData.publicCityIds) && viewingUserData.publicCityIds.indexOf(cityId) >= 0) mpViewerMark('p', viewingUserUid);"], ['52-trips.js', "((!mine && p.url) ? ' data-mpview=\"1\"' + ((cityObj && cityObj.id) ? ' data-mpvcity=\"' + attrVal(cityObj.id) + '\"' : '') : '')"], ['54-addresses.js', "mpData.viewers.removeMine(uid)"], ['54-addresses.js', "mpData.placeViewers.removeMine(uid)"], ['42-mptrack.js', "if (d.mpview && typeof mpPlaceView === 'function') mpPlaceView(a.getAttribute('href') || '', d.mpvcity, d.mplist);"], ['51-trip-add.js', "mpPlaceView(place.url, ref.cityId, ref.sourceUid + '_' + ref.cityId);"], ['52-trips.js', "mpPlaceView(__a.getAttribute('href') || '', (__a.dataset || {}).mpvcity, (__a.dataset || {}).mplist);"], ['58-community-curators.js', "if (listId) mpTrack.sha16(String(url)).then(function(h){ if (h) mpPlaceViewerMark(String(listId), h); })"], ['50-ui.js', "mpData.placeViewers.mark(uid, listId, hex, !!mpVmMemo(uid, w).s[key])"], ['50-ui.js', "mpData.viewers.mark(uid, kind, srcId, !!mpVmMemo(uid, w).s[key])"], ['43-mpdata.js', "const sun = +new Date(mpWeekKey() + 'T00:00:00Z');"], ['42-mptrack.js', "function mpWeekKey(ms){"], /* ق١١-١٤-١٧: كل حذف لقائمة مدينة بأمر المستخدم يُعلِم الحفظ الجاري (plListGone) — أربعة مواضع، واحد منها تقيسه محطة */ ['57-citylist.js', "__rm = true; plListGone(cityId); }catch(e){}"], ['57-citylist.js', "} else { await mpData.cityLists.remove(currentUser.uid, id); plListGone(id); }"], ['56-frame-places.js', "try{ await mpData.cityLists.remove(currentUser.uid, cityId); plListGone(cityId); }catch(e){ mpSwallow(e, 'empty-city'); }"], ['54-addresses.js', "await mpData.cityLists.remove(currentUser.uid, cityId); plListGone(cityId); __ok2 = true; return true; }"], /* ق١١-١٤-١٩: «إبقاء مكرّر» يلتقط بيانات الشاشة بعد القراءة ويتوقف إن تبدّلت المدينة — مثبَّت بنصّه (شقيقه «حذف بلدة» تقيسه محطة) */ ['57-citylist.js', "nothing was removed. Try again'); return false; } /* ق١١-١٤-١٩ (مقيس): القراءة تنتظر الحفظ الجاري"] /* ق١١-١٤-١٤: أحد الأسبوع بالتوقيت العالمي كما في القاعدة — طفرة «يوم الجهاز المحلي» لا تقتلها الرحلة (تعمل بالتوقيت العالمي)؛ قُتلت بتشغيل المحطة بتوقيت الرياض */];
        wired.forEach(function(x){ if (srcOf(x[0]).split(x[1]).length - 1 !== 1) off18.push('(٣/٤) not wired once — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٤-١١: رقم المشاهدات على بطاقات الرحلة الأربع وعلى القائمة الخاصة المشارَكة — بنصّه (لا محطة سلوك لها بعد) */ const tv = (srcOf('52-trips.js').split("stat: (t.viewCount || 0) + ' views',").length - 1) + (srcOf('58-community-curators.js').split("stat: (t.viewCount || 0) + ' views',").length - 1); if (tv !== 4) off18.push('trip cards carrying views: ' + tv + ' ≠ 4'); if (srcOf('58-community-curators.js').split("sub: 'Shared with you by name', stat: (r.viewCount || 0) + ' views',").length - 1 !== 1) off18.push('the shared private list card does not carry views'); }
      { /* (٦) و(٧) و(٩) و(١٠) · ق١١-١٤-٢١ … ٢٧: نصوص الخصوصية المُقرّة في مكانها، والتطبيق موصول بها. (٨) أُسقط بقرار المالك — لا أثر له في القواعد · (٦) عُدّل في ق١١-١٥-٠١: لا سجل «من ثبّت» */ const need = [["placeIdentityBy", 0], ["byMine", 0], /* ق١١-١٥-٠١: سجل «من ثبّت الدبوس» أُلغي — لا مخزن ولا شرط */ ["allow create: if idFieldsOk();", 1], ["allow update: if isOwner()\n        || (idFieldsOk()\n            && math.abs(request.resource.data.lat - resource.data.lat) <= 0.01\n            && math.abs(request.resource.data.lng - resource.data.lng) <= 0.03);", 1],
        ["&& request.resource.data.keys().hasOnly(['lat', 'lng', 'source', 'openId', 'n', 'cityId', 'at'])", 1], ["&& request.resource.data.keys().hasAll(['lat', 'lng', 'source', 'at'])", 1], 
        ["&& !(vp()[3] in [weekStr(request.time), weekStr(request.time + duration.value(1, 'd')),\n                             weekStr(request.time - duration.value(7, 'd')), weekStr(request.time - duration.value(14, 'd')),\n                             weekStr(request.time - duration.value(21, 'd')), weekStr(request.time - duration.value(28, 'd'))]));", 2],
        ["&& request.resource.data.diff(resource.data).affectedKeys().hasOnly(['sharedWith', 'sharedWithNames'])\n            && request.resource.data.sharedWith == resource.data.sharedWith.removeAll([request.auth.uid])\n            && request.resource.data.get('sharedWithNames', {}).diff(resource.data.get('sharedWithNames', {})).affectedKeys().hasOnly([request.auth.uid])\n            && !(request.auth.uid in request.resource.data.get('sharedWithNames', {})))", 2],
        ["&& request.resource.data.diff(resource.data).affectedKeys().hasOnly(['sharedWith'])\n            && request.resource.data.sharedWith == resource.data.sharedWith.removeAll([request.auth.uid]));", 1],
        ["function listOpenToMe(id) {", 1], ["&& listOpenToMe(docId.split('__')[0]) && createOk()", 1], ["&& listOpenToMe(docId.split('__')[0]) && updateOk()", 1], ["&& listOpenToMe(docId.split('__')[0]); // v3.18 (١٠)", 1], ["v3.18 (٨)", 0],
        /* v3.18 (١١) و(١٢) — ق١١-١٧-١٠: شاهد حذف الحساب والسرد للمالك — النص كما أُقرّ */
        ["      allow create: if isOwner()\n        || (isSignedIn() && request.auth.uid == uid\n            && request.resource.data.keys().hasOnly(['deleted', 'at'])\n            && request.resource.data.deleted == true\n            && request.resource.data.at is number);\n      allow update: if isOwner();", 1],
        ["      allow delete: if isOwner()\n        || (isSignedIn() && request.auth.uid == uid\n            && resource.data.get('deleted', false) == true);", 1],
        ["      allow list: if isOwner(); // v3.18 (١٢)", 1], ["allow list: if false;", 0], ["    match /suspensions/{uid} {\n      allow read: if isOwner() || (isSignedIn() && request.auth.uid == uid);\n      // v3.18 (١١)", 1],
        ["return exists(/databases/$(database)/documents/suspensions/$(request.auth.uid));", 1]];
        need.forEach(function(x){ if (rules.split(x[0]).length - 1 !== x[1]) off18.push('(٦-١٠) rule line missing or repeated — ' + x[0].slice(0, 46)); });
        const srcOf = function(f){ return fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'); }; const wired = [['43-mpdata.js', "const pub = Object.assign({}, rec); delete pub.by; return col('placeIdentity').doc(key).set(pub); },"], ['61-admin-users.js', "res.pins = await mpData.identity.stripBy(MP_RESIDUE_CAP);"], ['54-addresses.js', "mpData.identity.stripMine(uid)"], ['43-mpdata.js', "const snap = await col('placeIdentity').where('by', '==', uid).get(); let left = 0;"], ['54-addresses.js', "mpData.cityLists.leaveShares(uid)"], ['54-addresses.js', "mpData.trips.leaveShares(uid)"],
          ['57-citylist.js', "await mpData.nicknames.swap(key, { uid: currentUser.uid, nickname: clean }, __oldMine);"], ['43-mpdata.js', "b.set(col('nicknames').doc(newKey), data); if (oldKey && oldKey !== newKey) b.delete(col('nicknames').doc(oldKey)); b.set(col('userLists').doc(data.uid), { nickname: data.nickname }, { merge: true }); return b.commit(); },"], ['92-init.js', "if (user) mpViewerPrune();"], ['50-ui.js', "Promise.all([mpData.viewers.pruneMine(uid), mpData.placeViewers.pruneMine(uid), mpFollowMirrorTidy(uid)])"], /* ق١١-١٥-٠٤: ما يتبع «من لم يعد موجودًا» */ /* ق١١-١٥-٠٦: الرؤية والمشاركة تُكتبان بما غيّره صاحب الشاشة فوق ما في الخادم */ ['51-trip-add.js', "const __tv = await tripVisForSave(trip);"], ['51-trip-add.js', "(__tv && __tv.extra) || {}), (__tv && __tv.omit) || null);"], ['51-trip-add.js', "if ((trip.public === true) === (base.public === true) && key(trip.sharedWith) === key(base.sharedWith) && nk(trip.sharedWithNames) === nk(base.sharedWithNames)) return { omit: ['public', 'sharedWith', 'sharedWithNames'] };"], ['51-trip-add.js', "const base = tripVisSent[trip.id] || old;"], ['57-citylist.js', "savedVis = plVisSent[city] || st.savedVis;"], ['59-trip-builder.js', "__f = await dpListFlagsNow(t.cityId);"], ['43-mpdata.js', "HOLD_KEYS.forEach(function(k){ delete d[k]; }); Object.keys(d).forEach(function(k){ if (k.charAt(0) === '_') delete d[k]; });"], ['43-mpdata.js', "}catch(e){ if (e && e.code === 'permission-denied') return null; throw e; } if (!d.exists) return null;"], ['57-citylist.js', "if (savedVis){ const head = await mpData.cityLists.headNow(uid, city); if (!still()) return false; if (head.exists) __vis = mpVisResolve(meta, savedVis, head.vis);"], ['57-citylist.js', "...metaW, categories: pub,"], ['43-mpdata.js', "const p = stripCounters(Object.assign({}, trip, extra || {})); (omit || []).forEach(function(k){ delete p[k]; });"], ['52-trips.js', "if (__sgBusy) return; const g = sgById(id);"], ['52-trips.js', "await sgSaveTarget(target, kind, city);", 2], ['50-ui.js', "/* فشلها يُرمى: ذاكرة «هذا الأسبوع» لا تُكتب فتُعاد عند الفتح التالي (المراجعة المستقلة ٧) */"], ['52-trips.js', "alive = await Promise.all(missing.map(function(m){ return sgMemberAlive(m); }));"], ['43-mpdata.js', "goneAcc = await mpData.stats.accountsGone(heldIds);", 2], ['61-admin-users.js', "follows: function(id){ const p = String(id).split('_'); return p.length === 2 && p[1] ? ['users', p[1]] : null; },"], ['52-trips.js', "if (!pr) return 'ex-member';"], ['56-frame-places.js', "}catch(e){ plOwnerFailed[u] = Date.now(); mpSwallow(e, 'owner name'); }"], ['43-mpdata.js', "String(w) < mpRuleWeek(4); }"],
          ['61-admin-users.js', "return mpViewOld(id) || mpViewSrcOf(p[1], p[2]); },"], ['61-admin-users.js', "return mpViewOld(id) || mpViewSrcOf('l', p[1]); } };"], ['60-help.js', "What is recorded: to count each person once a week"], ['60-help.js', "ما الذي يُسجَّل: كي يُعدّ كل شخص مرة في الأسبوع"]];
        wired.forEach(function(x){ if (srcOf(x[0]).split(x[1]).length - 1 !== (x[2] || 1)) off18.push('(٦-١٠) not wired ' + (x[2] || 1) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٥-٠٨ (قيس): مسار لا يقصد الرؤية ولا المشاركة يكتبهما من الخادم الآن — الاستيراد وتراجعه · تراجع مدير المدن · «أصلح» */
        [['50-ui.js', "const v = await mpData.cityLists.visNow(currentUser.uid, cityId); return v || { public: false, sharedWith: [], sharedWithNames: {} }; }"], ['64-import.js', "let head; try{ head = await tkServerNow(c.id, keys); }catch(e){", 2], ['64-import.js', "res.failed.push(c.name + ' (' + mpErrText(e) + ')'); continue; } /* r120 (ق١١-١٥-٠٨"], ['56-frame-places.js', "try{ const srv = await mpListVisNow(cid);"], ['56-frame-places.js', "await mpData.cityLists.repairVisibility(v.ids, srv.public === true, srv.sharedWith); delete plVisState[cid];"], ['57-citylist.js', "__uCur[id] = await cmReadDoc(id); if (u.docs[id]) __uVis[id] = cmVisOf(__uCur[id] || u.docs[id]);"], ['57-citylist.js', "Object.assign(cmMetaOf(d), __uVis[id]), cmCatsOf(d), __uCur[id]);"], ['57-citylist.js', "catch(e){ mpSwallow(e, 'cm-undo-read'); if (!cmUndo) cmUndo = u;"], ['64-import.js', "plVisToScreen(cityId, head.vis); return myCityListData.categories; }"], ['64-import.js', "const shown = tkScreenAfter(c.id, cats, head, keys);", 2], ['56-frame-places.js', "plVisToScreen(cid, srv); mpVisLine(cid, srv, 'repaired on tap"], ['64-import.js', "tkApplyWrites(c, cats, plan, res); /* بعد القراءة"], ['57-citylist.js', "if (__sent && plVisSent[city] === __sent) delete plVisSent[city];", 2] /* ق١١-١٥-٠٦ (المراجعة ٩ — قيس): القصد يسقط من «في الطريق» بعد الوصول وبعد الفشل */, ['57-citylist.js', "await mpData.cityLists.repairVisibility(data._visStale, myCityListData.public, myCityListData.sharedWith);"]]
          .forEach(function(x){ if (srcOf(x[0]).split(x[1]).length - 1 !== (x[2] || 1)) off18.push('(ق١١-١٥-٠٨) not wired ' + (x[2] || 1) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٥-٠٩ (قيس): قراءة لقطة التراجع · تراجع استيراد فشل · ما مُسّ وحده فوق الخادم · حقول المحمِّل */
        [['57-citylist.js', "}catch(e){ mpSwallow(e, 'dups-read'); showToast('Could not read the list'); return false; }"], ['57-citylist.js', "}catch(e){ mpSwallow(e, 'town-read'); showToast('Could not read the list'); return false; }"], ['57-citylist.js', "catch(_){ undoDocs[cityId] = null; }", 0], ['64-import.js', "if (res.failed.length) c.last.undoPart = sum;"], ['64-import.js', "c.last.undone = {", 2] /* مرتان فقط: بعد تراجع لم تفشل فيه مدينة · وحين لم يبقَ ما يُتراجع عنه بعد تراجع جزئي */, ['64-import.js', "↶ ' + (tkUndoNone(res) ? 'Not undone' : 'Undone') + '</div>"], ['64-import.js', "tkMergeNow(cats, head, base, keys);", 2], ['64-import.js', "tkSaveOpts(head, keys));", 2], ['64-import.js', "if (!head.exists){ if (myCityListLoadedFor === c.id && myCityListData){ myCityListLoadedFor = null; await loadMyCityList(c.id); } res.removed += c.remove.length;"], ['64-import.js', "function tkSaveOpts(head, keys){ return head.partial ? { onlyCats: keys, indexBase: head.index } : undefined; }"], ['64-import.js', "keys.forEach(function(k){ if (cats[k]) mem[k] = cats[k]; else delete mem[k]; }); plSnapSavedKeys(keys); }"], ['64-import.js', "copy.categories === myCityListData.categories && myCityListSaved) || null;"], ['64-import.js', "if (q && q.importId === plan.importId && q.url) mine[q.url] = true;"], ['64-import.js', "tkResumeMark(plan, c.id); /* العلامة تلي الكتابة مباشرة"], ['64-import.js', "unclear(); res.failed.push(c.name); continue; }", 3], ['64-import.js', "if (c.emptyKeys.length){ c.emptyKeys.forEach(function(k){ delete cats[k]; }); try{ await mpData.cityLists.dropCategoryKeys(currentUser.uid, c.id, c.emptyKeys); }catch(e){ mpSwallow(e, 'undo-drop'); } }"], ['64-import.js', "if ((await mpData.cityLists.headNow(currentUser.uid, c.id)).exists){ await mpData.cityLists.remove(currentUser.uid, c.id); plListGone(c.id); }"], ['64-import.js', "indexOf(c.id) >= 0 && live === 0 && tkLiveCount(cats) === 0){"], ['64-import.js', "const full = await mpData.cityLists.get(currentUser.uid, c.id); const mineKey = {};"], ['64-import.js', "keys.forEach(function(k){ if (/^tk:/.test(k) && cats[k] && !cats[k].places.length) c.emptyKeys.push(k); });"], ['64-import.js', "head.partial = head.exists && head.split;"], ['50-ui.js', "await plSaveWait(cityId); return mpData.cityLists.headNow(currentUser.uid, cityId); }"], ['43-mpdata.js', "LOADER_KEYS.forEach(function(k){ delete parent[k]; });"], ['43-mpdata.js', "LOADER_KEYS.forEach(function(k){ gone[k] = del(); });"], ['43-mpdata.js', "parent.index = opts.indexBase.filter(function(e){ return e && !mine[e.catId]; }).concat(parent.index.filter(function(e){ return mine[e.catId]; }));"], ['57-citylist.js', "if (cats[k]) myCityListSaved[k] = JSON.parse(JSON.stringify(cats[k])); else delete myCityListSaved[k];"]]
          .forEach(function(x){ const n = srcOf(x[0]).split(x[1]).length - 1; if (n !== (x[2] === 0 ? 0 : (x[2] || 1))) off18.push('(ق١١-١٥-٠٩) not wired ' + (x[2] === 0 ? 0 : (x[2] || 1)) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٥-١٠ (قيس): قراءة الدمج فشلت ⇒ الحفظ يفشل · فهرس ما لا يُكتب من الخادم · لقطة التراجع لمدينة لم تُحفظ */
        [['57-citylist.js', "const remotes = {}; for (const k of changed) remotes[k] = await mpData.cityLists.catDoc(uid, city, k);"], ['57-citylist.js', "catch(e){ remote = null; }", 0], ['57-citylist.js', "if (onlyCats && head.exists && head.split && !ixStale){ const dropNow = oldKeys.filter(function(k){ return !(k in (data.categories || {})); }); __ixBase = head.index.filter(function(e){ return e && dropNow.indexOf(e.catId) < 0; }); }"], ['57-citylist.js', "myCityListIndexStale = data.splitV === 1 && plIndexKey(mpData.cityLists._indexOf(split.pub)) !== plIndexKey(data.index);"], ['57-citylist.js', "{ onlyCats: onlyCats, syncVis: visSync, indexBase: __ixBase || undefined }"], ['57-citylist.js', "undoDocs[cityId] = (await cmReadDoc(cityId)) || cmScreenDoc();", 2]]
          .forEach(function(x){ const n = srcOf(x[0]).split(x[1]).length - 1; if (n !== (x[2] === 0 ? 0 : (x[2] || 1))) off18.push('(ق١١-١٥-١٠) not wired ' + (x[2] === 0 ? 0 : (x[2] || 1)) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٥-١١ (قيس): Discard يعيد قائمة «يُحذف» · تصنيف على الشاشة لا يُحذف مستنده */
        [['57-citylist.js', "myCityListData.categories = JSON.parse(JSON.stringify(myCityListSaved)); myCityListOldKeys = []; myCityListIndexStale = true;"], ['57-citylist.js', "oldAll = st.oldAll.slice(), oldKeys = oldAll.filter(function(k){ return !(k in (data.categories || {})); })"], ['57-citylist.js', "const dropped = oldKeys.filter(function(k){ return !(k in (data.categories || {})); });"], ['57-citylist.js', "return !(dropped.indexOf(k) >= 0 || (oldAll.indexOf(k) >= 0 && (k in (data.categories || {})))); });"], ['57-citylist.js', "oldKeys = myCityListOldKeys.slice()", 0]]
          .forEach(function(x){ const n = srcOf(x[0]).split(x[1]).length - 1; if (n !== (x[2] === 0 ? 0 : (x[2] || 1))) off18.push('(ق١١-١٥-١١) not wired ' + (x[2] === 0 ? 0 : (x[2] || 1)) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٦-٠٣ (قيس): طابور الحفظ لكل مدينة — حفظ واحد يجري وآخر ينتظر · الحفظ يعدّ محفوظًا ما كتبه وحده · القرّاء ينتظرون فراغ الطابور */
        [['57-citylist.js', "if (plSaveBusy[cityListCityId] || plSaveNext[cityListCityId]) return plSaveLater(cityListCityId, myCityListData, __out);"], ['57-citylist.js', "const n = plSaveNext[city]; if (n && n.prev === p && plSaveTurn(city, n, !failed) && failed) __dropped.push(n);"], ['57-citylist.js', "__dropped.splice(0).forEach(function(n){ const ok = n.data === data && __retryOk; if (!ok) n.out.sheet = __o.sheet; n.res(ok); }); }"], ['57-citylist.js', "mpData.cityLists._sharedKey(data.sharedWith) === __scr0.key){"], ['57-citylist.js', "if (cap && currentUserSuspended){"], ['57-citylist.js', "n.timer = setTimeout(function(){ plSaveTurn(city, n, true); }, MP_SAVE_WAIT_MS);"], ['57-citylist.js', "if (n0 && n0.data === data){ n0.cap = capNow(); return pass(n0); }"], ['57-citylist.js', "if (cap && !mpSameUser(cap.uid, cap.gen)) return false;"], ['57-citylist.js', "const goneAt = cap ? cap.goneAt : (plGoneGen[city] || 0);"], ['57-citylist.js', "plSnapWrote(data, snap, onlyCats ? onlyCats.concat(Object.keys(priv)) : null, __wrote, dropped);"], ['57-citylist.js', "plSnapWrote(data, null, null, __emptied, null);"], ['57-citylist.js', "(dropped || []).forEach(function(k){ delete s[k]; });"], ['57-citylist.js', "myCityListSavedVis = __visW;"], ['57-citylist.js', "if (mine()) plSnapSaved();", 0] /* الحفظ لا يلتقط الشاشة عند انتهائه */, ['57-citylist.js', "if (mine()){ plVisSnap();", 0], ['57-citylist.js', "await (plSaveBusy[cityId] || plSaveNext[cityId].prev).then(nop, nop);"]]
          .forEach(function(x){ const n = srcOf(x[0]).split(x[1]).length - 1; if (n !== (x[2] === 0 ? 0 : (x[2] || 1))) off18.push('(ق١١-١٦-٠٣) not wired ' + (x[2] === 0 ? 0 : (x[2] || 1)) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        /* ق١١-١٧-٠٢ (قيس): مسار طلب الحفظ لا يتراجع بعد أن أجابت ورقة الفشل — باب plSaveAsk، والمسارات الخمسة تسأله */
        [['57-citylist.js', "async function plSaveAsk(){ const o = { sheet: '' };"], ['57-citylist.js', "return v === true ? 'saved' : (o.sheet === 'discard' ? 'discarded' : (o.sheet ? 'kept' : 'none')); }"], ['57-citylist.js', "if (!__retryOk && !__o.sheet){ __o.sheet = __ans === 'discard' ? 'discard' : 'keep';"], ['57-citylist.js', "if (__ans === 'retry' && mine()) mpUnsavedSet('places', true);"], ['57-citylist.js', "if (v !== true && cityListCityId !== c0) return 'away';"], ['57-citylist.js', "if (__r !== 'saved'){ try{ renderPlacesMine(); }catch(_){} if (cmFarPins().length) cmFarOpen(); else closeModalById('dashBackdrop'); return __r === 'kept'; }"], ['57-citylist.js', "if (__r === 'none'){ back(); showToast('Could not save — nothing moved'); return false; }"], ['57-citylist.js', "if (__r === 'away'){ if (typeof tkAwayClose === 'function') tkAwayClose(); return false; }", 3] /* r120 (ق١١-٢٥-٠٤): +٢ — cmDupSet وتراجعه cmDupUnmark */, ['65-sort.js', "if (__r === 'away'){ tkAwayClose(); return; } if (__r === 'none'){ tkRemovedRollback(removed); showToast('Could not save'); return; } if (__r === 'saved')", 2], ['65-sort.js', "if (__r === 'away'){ tkAwayClose(); return; }", 4], ['65-sort.js', "if (cityListCityId !== __c){ tkAwayClose(); return; }", 5], ['65-sort.js', "if (__r === 'saved'){ tkRemovedCommit(removed, __c); delete tkConfirmSkip[key]; delete tkPickChoice[key]; } if (cityListCityId !== __c){ tkAwayClose(); return; }"], ['65-sort.js', "if (__r === 'saved') tkRemovedCommit(removed, __c); if (cityListCityId !== __c){ tkAwayClose(); return; }"], ['65-sort.js', "if (__r === 'none'){ delete p.geo; delete p.openId; if (typeof __ar !== 'undefined' && __ar){ if (__ar[0] === undefined) delete p.area; else p.area = __ar[0];"], ['65-sort.js', "if (__r !== 'saved'){ plSuggestCache[key] = prevSg;"], ['65-sort.js', "if (__r === 'kept'){ mpCloseAll('dashBackdrop');"], ['65-sort.js', "if (__r !== 'saved'){ if (prevSg !== undefined) plSuggestCache[key] = prevSg; if (__r === 'kept'){ tkPasteBarHide(); mpCloseAll('dashBackdrop'); renderPlacesMine(); } return; }"], ['65-sort.js', "tkRemovedRollback(removed); showToast('Could not save'); return; }", 2] /* لا تراجع ثالث عن إزالة بعد الحفظ */, ['57-citylist.js', "await plSaveAsk()", 7] /* r120 (ق١١-٢٥-٠٤): +٢ — cmDupSet وتراجعه cmDupUnmark: يسألان من الباب ويتراجعان بجوابه · (ق١١-٢٥-٠٥): +١ cmSavedFirst — «Keep this» وحذف البلدة يحفظان ما على الشاشة أولًا ولا يبدآن إن لم يُحفظ */, ['65-sort.js', "await plSaveAsk()", 9] /* r120 (ق١١-٢٤-١٥ · المراجعة ٣٦ ٩): +١ كنس المحجوب — يسأل من الباب ويتراجع بجوابه */, ['56-frame-places.js', "await plSaveAsk()"],
          /* ق١١-١٧-٠٣ (قيس): النقاط الثلاث — «Restore» لا تعيد مكانًا في القائمة · الذاكرة لمدينة الفعل · Undo على المكان كما هو على الشاشة */
          ['65-sort.js', "const todo = u.items.filter(function(x){ if (has(x)) return false;"], ['65-sort.js', "async function tkPinSuggested(key, i){ const __c = cityListCityId;"], ['65-sort.js', "async function tkPinFromGoogleApply(key, text){ const __c = cityListCityId;"], ['57-citylist.js', "async function cmFarFix(key){ if (!currentUser || !myCityListData) return false; const __c = cityListCityId;"], ['57-citylist.js', "await dpSyncWithList(__c);", 3], ['57-citylist.js', "dpSyncWithList(cityListCityId)", 0], ['52-trips.js', "const __c = city || cityListCityId;"], ['65-sort.js', "if (__r === 'none'){ tkRemoveRows(todo.map(function(x){ return { p: x.p, k: x.k }; })); showToast('Could not save'); renderPlacesMine(); return; }"], ['65-sort.js', "const c = city || cityListCityId;"], ['65-sort.js', "tkUndoLast = { city: __c,", 3], ['65-sort.js', "tkUndoLast = { city: cityListCityId", 0], ['57-citylist.js', "cmFarUndo = { city: __c, items: items, back: back }; if (cityListCityId !== __c){ if (typeof tkAwayClose === 'function') tkAwayClose(); return true; }"], ['65-sort.js', "const q = tkPlaceByKey(plSugKey(x0.p)); if (!q) return; __n++;"], ['65-sort.js', "if (!__n){ tkUndoLast = null; showToast('Nothing to undo — those places are no longer in this list'); renderPlacesMine(); return; }"],
          /* ق١١-١٧-٠٣ (قيس ١٧ نوفمبر) · طابور العمل أ: مسار الحفظ بعد الطابور — العلامة تقول ما على الشاشة · ما كُتب لا يُعدّ «لم يُحفظ» · «Discard» والرؤية · الأبواب الجديدة · ذاكرة لكل مدينة · قرّاء ينتظرون */
          ["57-citylist.js", "function plScreenSaved(){ const d = myCityListData, s = myCityListSaved; if (!d || !s) return null;"], ["57-citylist.js", "function plUnsavedSync(){ const v = plScreenSaved(); if (v === null) return null;"], ["57-citylist.js", "if (!mpAccountGate()){ if (!__out) plUnsavedSync(); return false; }"], ["57-citylist.js", "if (o.sheet) return (cityListCityId !== c0) ? 'away' : (o.sheet === 'discard' ? 'discarded' : 'kept');"], ["57-citylist.js", "const __tailFail = function(eT){ __tail = true; if (onlyCats) plSnapWrote(data, snap, onlyCats, __wrote, __dropDone); if (mine()) myCityListIndexStale = true;"], ["57-citylist.js", "}catch(eT){ __tailFail(eT); }", 2], ["57-citylist.js", "}catch(eT){ __tail = true; if (mine() && myCityListSaved){ const s2 = {};"], ["57-citylist.js", "else { await plSaveWait(city);"], ["57-citylist.js", "async function(){ __laterD = __laterNow();"], ["57-citylist.js", "if (__sv && plVisChanged(myCityListData, __sv)){ myCityListData.public = __sv.public === true; myCityListData.sharedWith = (__sv.sharedWith || []).slice();"], ["57-citylist.js", "if (__tail) showToast('Part of this change was already saved"], ["57-citylist.js", "if (!__retryOk && (__ans === 'discard' ? __laterD : __laterNow())){ __retryOk = true; plUnsavedSync(); }"], ["57-citylist.js", "if (!__retryOk && !mine()){ const __vo = plUnsavedSyncOpen(); if (__vo === null || __vo === undefined) mpUnsavedSet('places', __f0);"], ["57-citylist.js", "return mine() && (plDiscardGen[city] || 0) === __dg1 && (plSaveSeq[city] || 0) > __seq0 && plScreenSaved() === true; };"], ["57-citylist.js", "const __nm = Object.assign({}, myCityListData.sharedWithNames || {}, __sv.nm || {});"], ["57-citylist.js", "if (__ans === 'keep') showToast('Not saved — your change to '"], ["57-citylist.js", "if (disc) setTimeout(function(){ if (myCityListData !== data || cityListCityId !== city"], ["57-citylist.js", "if (!mine()){ plUnsavedSyncOpen(); return; }"], ["57-citylist.js", "function plCatSame(a, b){"], ["57-citylist.js", "if (cityListCityId && (plSaveBusy[cityListCityId] || plSaveNext[cityListCityId])) return undefined; return plUnsavedSync(); }"], ["57-citylist.js", "if (!(k in s) || !plCatSame(c[k], s[k])) return false;"], ["57-citylist.js", "mpSaveStreak.places = 0; /* حفظ نجح"], ["57-citylist.js", "__okFlag(__dg0);", 2], ["57-citylist.js", "mpSaveOk('places')", 1], ["57-citylist.js", "(cmFarUndo && cmFarUndo.city === cityListCityId) ? '<div class=\"chiprow\""], ["57-citylist.js", "if (!u || u.city !== cityListCityId) return false;"], ["57-citylist.js", "if (__r === 'none'){ __d.public = !__d.public; showToast('Could not save'); return; }"], ["57-citylist.js", "tkRemovedSync(city, mine() ? (myCityListSaved || __wrote) : (snap || __wrote));"], ["65-sort.js", "function tkRemovedOf(city){"], ["65-sort.js", "function tkRemovedPut(city, mem){"], ["65-sort.js", "function tkRemovedSync(city, cats){"], ["65-sort.js", "const __rd = await plSaveAsk();", 2], ["65-sort.js", "if (cityListCityId !== __c || myCityListData !== __d0){ tkAreasBusy = false; return; }"], ["65-sort.js", "var __rep = tkDupWhere(__d.p); tkDupDrop(__d.p);", 2], ["65-sort.js", "if (typeof __rep !== 'undefined' && __rep) tkRemovedRollback([__rep]);", 2], ["56-frame-places.js", "showToast('Already in My List · ' + cityName);"], ["52-trips.js", "const __r = await plSaveAsk(); if (__r === 'saved'){ try{ if (typeof dpSyncWithList === 'function') await dpSyncWithList(__c); }"], ["52-trips.js", "if (__r !== 'saved'){ if (__r === 'none'){ live.forEach(function(m){"], ["64-import.js", "if (typeof plSaveWait === 'function') await plSaveWait(cityId);"], ["65-sort.js", "if (dirty && cityListCityId === __c) await saveMyCityList();"], ["65-sort.js", "if (__r === 'none'){ showToast('Could not save'); plUnsavedSync(); } renderPlacesMine(); return; } if (tkUndoLast === u) tkUndoLast = null;"], ["56-frame-places.js", "if (__r === 'kept'){ __draw(); return; }"], ["56-frame-places.js", "if (prevCity !== cityId && cityListCityId === cityId){ cityListCityId = prevCity; if (prevCity) await loadMyCityList(prevCity); }"], ["59-trip-builder.js", "if (typeof plSaveWait === 'function') await plSaveWait(cityId);"], ["51-trip-add.js", "if (typeof plSaveWait === 'function') await plSaveWait(ref.cityId);"], ["54-addresses.js", "if (typeof plSaveWait === 'function') await plSaveWait(cityId);"]]
          .forEach(function(x){ const n = srcOf(x[0]).split(x[1]).length - 1; if (n !== (x[2] === 0 ? 0 : (x[2] || 1))) off18.push('(ق١١-١٧-٠٢) not wired ' + (x[2] === 0 ? 0 : (x[2] || 1)) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
          /* ق١١-١٧-٠٦ (قيس ١٧ نوفمبر · المراجعة المستقلة ٢٢): حذف الحساب لا يدّعي ما لم يقع — خطوات لازمة توقف قبل حساب الدخول · قراءة الخادم أولًا · سجلات صغيرة تُعدّ · لا حفظ أثناءه وما في الطريق يُنتظر · النص القديم «nothing else was removed» لا يعود · المراجعة المستقلة ٢٣: الاسم يُقرأ قبل حذفه · سلسلة تُترك عند تبدّل المستخدم · النافذة لا تُغلق والحذف جارٍ · شاشة النهاية تُفتح · المراجعة ٢٤: جيل الحذف سُحب (كان يسحب القائمة) — الحفظ يسأل العلم قبل كتابته · النافذة فوق الشريطين والحذف جارٍ · علامة ما بقي لكل حساب */
          [["54-addresses.js", "let mpDeleting = false; let mpDelRun = 0; let __delReauthAt = 0, __delReauthFor = '';"], ["54-addresses.js", "const need = async function(what, fn){ if (!alive()) throw GONE; try{ return await fn(); }catch(e){ if (e === GONE) throw e; mpSwallow(e, 'delete · ' + what); miss(what); return null; } };"], ["54-addresses.js", "const soft = async function(what, fn){ if (!alive()) throw GONE; try{ return (await fn()) || 0; }catch(e){ if (e === GONE) throw e; mpSwallow(e, 'cascade ' + what); __some = true; return 0; } };"], ["54-addresses.js", "const alive = function(){ return mpDelRun === run && !!currentUser && currentUser.uid === uid; };"], ["54-addresses.js", "if (must.length){ stop('left', must); return; }", 5], ["54-addresses.js", "const d = await mpData.userLists.getServer(uid); fresh = (d && d.exists) ? (d.data() || {}) : {};"], ["54-addresses.js", "if (!fresh){ stop('read'); return; }"], ["54-addresses.js", "forEach(function(c){ plListGone(c); });", 0], ["54-addresses.js", " try{ await tripSaveWaitAll(); }catch(_){ }"], ["54-addresses.js", "if (mpDeleting || !currentUser) return; mpDelFlag(true); const run = ++mpDelRun;"], ["54-addresses.js", "} finally { if (mpDelRun === run) mpDelFlag(false); }"], ["54-addresses.js", "const d = await mpData.nicknames.get(nk); if (!alive()) throw GONE; if (d && d.exists && ((d.data() || {}).uid === uid)) await mpData.nicknames.remove(nk);"], ["54-addresses.js", "if (__delReauthFor !== currentUser.uid || Date.now() - __delReauthAt > 240000){"], ["54-addresses.js", "delStep(3); openModalById('delBackdrop');"], ["54-addresses.js", "if (mpDeleting && n !== 3) return;"], ["54-addresses.js", "nothing else was removed", 0], ["54-addresses.js", "cleaned up automatically", 0], ["54-addresses.js", "on other people\\'s content", 0], ["53-community-trips.js", "function closeModalById(id){ if (id === 'delBackdrop' && typeof mpDeleting !== 'undefined' && mpDeleting) return;"], ["55-account.js", "if (b.id !== 'authBackdrop' && !(b.id === 'delBackdrop' && typeof delCurStep !== 'undefined' && delCurStep === 3)) b.classList.remove('show');"], ["55-account.js", "if (typeof delCurStep !== 'undefined' && delCurStep === 3 && document.getElementById('delBackdrop').classList.contains('show')) openModalById('delBackdrop');"], ["56-frame-places.js", "function resetSessionState(){ try{ mpDelRun++; mpDelFlag(false); __delReauthAt = 0; __delReauthFor = ''; }catch(_){}"], ["57-citylist.js", "function mpAccountGate(){ if (typeof mpDeleting !== 'undefined' && mpDeleting){ showToast('Your account is being deleted — nothing is saved now'); return false; }"], ["51-trip-add.js", "tripSaveFlying.add(__fp); try{ await __fp; } finally { tripSaveFlying.delete(__fp); }"], ["51-trip-add.js", "if (typeof mpDeleting !== 'undefined' && mpDeleting){ if (__tvS && tripVisSent[trip.id] === __tvS) delete tripVisSent[trip.id]; showToast('Your account is being deleted — nothing is saved now'); return 'keep'; }"], ["30-body.html", "<div id=\"delLeft\" class=\"ctx\" style=\"display:none;"], ["30-body.html", "<p class=\"ctx\" id=\"delDoneText\""], ["30-body.html", "onclick=\"delDone()\">Close</button>"], ["30-body.html", "Back to preview", 0], ["60-help.js", "If something of yours cannot be removed at that moment, deletion stops before your sign-in account, tells you what is left, and you can try again."], ["60-help.js", "وإن تعذّر حذف شيء من بياناتك في تلك اللحظة توقف الحذف قبل حساب الدخول وسمّى ما بقي، ولك أن تعيد المحاولة."], ["54-addresses.js", "function mpDelFlag(on){ mpDeleting = !!on; try{ document.body.classList.toggle('mp-deleting', !!on); }catch(_){ } }"], ["54-addresses.js", "function mpDelCarry(uid){ try{ return localStorage.getItem('mp_del_left_' + uid) === '1'; }catch(_){ return false; } }"], ["54-addresses.js", "if (currentUser && currentUser.uid !== uid) return;"], ["54-addresses.js", "function delDialogForget(){ if (mpDeleting) return;"], ["10-structure.css", "body.mp-deleting #delBackdrop{z-index:3000 !important;}"], ["53-community-trips.js", "function mpCloseAll(id){ if (id === 'delBackdrop' && typeof mpDeleting !== 'undefined' && mpDeleting) return;"], ["92-init.js", "updateUserUI(); if (__other) try{ delDialogForget(); }catch(_){}"], ["92-init.js", "const __other = !!user && (!currentUser || currentUser.uid !== user.uid);"], ["57-citylist.js", "if ((typeof mpDeleting !== 'undefined' && mpDeleting) || !currentUser || currentUser.uid !== uid){ if (mine() && (cap || !out)) plUnsavedSync(); else if (!mine() && !out) showToast('Not saved — your change to ' + (cityNameOf(city) || city) + ' could not be saved'); return false; }"], ["57-citylist.js", "if (!mpAccountGate()){ if (cap && myCityListData === data) plUnsavedSync();"], ["54-addresses.js", "await need('your account record', async function(){ const sd = await mpData.suspensions.get(uid); if (!alive()) throw GONE; if (sd && sd.exists) return;"], ["54-addresses.js", "try{ await mpData.suspensions.markDeleted(uid); }catch(e){ if (String((e && e.code) || '') !== 'permission-denied') throw e;"], ["54-addresses.js", "mpData.suspensions.remove(uid)", 0], ["54-addresses.js", "async function mpGoneFinish(){"], ["57-citylist.js", "if ((sDoc.data() || {}).deleted === true){ userListLoadedFor = null; userListLoadFailed = true;"], ["57-citylist.js", "await mpGoneFinish(); return; }"], ["43-mpdata.js", "markDeleted: function(uid){ return col('suspensions').doc(uid).set({ deleted: true, at: Date.now() }); },"], ["43-mpdata.js", "const snap = await col('suspensions').where('deleted', '==', true).limit(limit || 20).get();"], ["43-mpdata.js", "keysOf: async function(uid){ const snap = await col('nicknames').where('uid', '==', uid).get();"], ["61-admin-users.js", "try{ await statsResidueGone(res); }catch(e){ mpSwallow(e, 'residue deleted accounts'); res.errors++; }"], ["61-admin-users.js", "if (!left && !out && d.at && Date.now() - d.at > MP_GONE_KEEP_MS){ try{ await mpData.suspensions.remove(uid); res.gone++; }"], ["60-help.js", "A short record that the account was deleted — its id and the time, nothing else — is kept so that nothing can be written under it again, and is removed by a periodic cleanup (a day later at the earliest)."], ["60-help.js", "ويبقى سجلٌّ قصير بأن الحساب حُذف — معرّفه ووقت الحذف لا غير — كي لا يُكتب باسمه شيء بعدها، ثم يحذفه تنظيف دوري (بعد يوم على الأقل)."], ["54-addresses.js", "const who = currentUser && currentUser.uid; const same = function(){ return !!who && !!currentUser && currentUser.uid === who; };"], ["43-mpdata.js", "startAt(prefix).endAt(prefix + '\\uf8ff').limit(limit || 100).get();"], ["61-admin-users.js", "mpData.stats.pageIds('listBookmarks'", 0], ["60-help.js", "for about a day", 0], ["54-addresses.js", "showToast(some ? 'Your account was deleted — some small records may not have been removed' : 'Your account was deleted');"], ["56-frame-places.js", "plGeoConfirmed = false; plGeoResult = null; plUrlWas = null; /* هذا الباب يفتح خطوة الخريطة دائمًا"], ["56-frame-places.js", "{ plEdit = null; showToast('This place has text over the length limit — open Edit, shorten it, then pin it'); return; }"], ["56-frame-places.js", "  if (mpBusy['place-save']){ showToast('One moment — still working on the previous place'); return; }"], ["56-frame-places.js", "  if (mpBusy['place-save']){ showToast('One moment — still working on the previous place'); return false; }"], ["56-frame-places.js", "place.town = (__tw && __arWas && __tw !== __arWas) ? __tw : (place.area || __tw || name);"], ["56-frame-places.js", "  const __arWas = String(place.area || '').trim();\n  place.area = mpFixAreaDot("], ["53-community-trips.js", "  if (openPlPlaceModal(null, null) === false){ pendingShareText = t; return; }"], ["56-frame-places.js", "async function savePlPlaceRun(cont){"], ["56-frame-places.js", "  await savePlPlaceRun(true);\n}"], ["56-frame-places.js", "function plEditSet(catId, index){ plEdit = { catId: catId, index: index };"], ["56-frame-places.js", "function plEditNow(){ if (!plEdit) return null; if (plEditHold && plEditHold.ref === plEdit) return plWhere(plEditHold.obj) || false; return { catId: plEdit.catId, index: plEdit.index }; }"], ["56-frame-places.js", "  if (catId != null && index != null){ plEditSet(catId, index); plModalCat = catId; }"], ["56-frame-places.js", "  plEditSet(catId, index); plModalCat = catId;\n  const __pst = plPasted; plFillModal(false); document.getElementById('plPlaceBackdrop').classList.remove('show'); plPasted = __pst;"], ["56-frame-places.js", "  if (cont === true){ const h = plSaveTgt; if (h){ ed = plWhere(h.obj); if (!ed){ __gone(); return; } } }"], ["56-frame-places.js", "  else { const w = plEditNow(); if (w === false){ __gone(); return; } ed = w; }"], ["56-frame-places.js", "  const orig = ed ? ((userGetEntry(ed.catId).places || [])[ed.index] || null) : null; const __was = !!orig;\n  const place = orig ? Object.assign({}, orig) : {};"], ["56-frame-places.js", "  if (cont !== true) plSaveTgt = __was ? { obj: orig } : null;"], ["56-frame-places.js", "  if (__was){ const w2 = plWhere(orig); if (!w2){ __gone(); return; } ed = w2; } const __ix = ed ? ed.index : -1;"], ["56-frame-places.js", "tkDupOf(plGeoResult.openId || null, plGeoResult.geo, ed ? orig : null)"], ["56-frame-places.js", "  const __at = plEditNow(); if (__at === false){ plEditGone(); return; } /* r120 (ب-٢٢"], ["56-frame-places.js", "const __at = plEditNow(); if (__at === false){ plEditGone(); return; } const from = cityListCityId, catId = __at.catId, index = __at.index;"], ["56-frame-places.js", "const __at = plEditNow(); if (__at === false){ plEditGone(); return; } const p = ((userGetEntry(__at.catId).places || [])[__at.index]) || null;"], ["56-frame-places.js", "  const __at = plEditNow(); if (__at === false){ plEditGone(); return; } const c = __at.catId, i = __at.index;"], ["57-citylist.js", "  try{ if (typeof plSaveWait === 'function') await plSaveWait(cityId); }catch(_){} /* r120 (ج-١"], ["52-trips.js", "const __tr = await saveTrip(target); return __tr === undefined ? 'saved' : (__tr === 'discarded' ? 'discarded' : 'kept');"], ["52-trips.js", "try{ if (typeof tripSaveWaitAll === 'function') await tripSaveWaitAll(); /* r120 (و-٤"], ["52-trips.js", "if (fails >= 2){ if (dpNeeds(t, f)) left++; continue; }"], ["52-trips.js", "const __r = await saveTrip(t); if (__r !== undefined){ fails++; left++;"], ["52-trips.js", "if (left){ delete dpSynced[cityId];"], ["57-citylist.js", "  if (!__rm){ __stay('Could not delete “' + city.name + '” — it is still in your cities. Try again'); return; }"], ["57-citylist.js", "!dpSynced[cityId] && !(opts && opts.moved)){ __stay("], ["57-citylist.js", "  if (cityId === cityListCityId){ try{ if (typeof dpReconcile === 'function') await dpReconcile(); }catch(e){ mpSwallow(e, 'dayplans-sync'); } return; }"], ["52-trips.js", "if (kept) mpUnsavedSet('trips', true);"], ["52-trips.js", "tripDeleting[id] = true;"], ["52-trips.js", "if (!(await __attempt())){ delete tripDeleting[id]; renderTripsBody(); return; }"], ["51-trip-add.js", "    if (tripDeleting[trip.id]){ if (__tvS && tripVisSent[trip.id] === __tvS) delete tripVisSent[trip.id]; return 'keep'; }"], /* المحور ٤ (ق١١-١٨-٠٥) */ ["52-trips.js", "if (!tripNamedMember(src)){ (copy.cities || []).forEach(function(c){ if (c) delete c.stay; }); ((copy.plan && copy.plan.days) || []).forEach(function(d){ if (d && d.start) d.start = null; }); tripCopyStripTimes(copy); }"], ["52-trips.js", "viewingUserUid = null; viewingUserData = null; communityUserLayer = null; viewingCommunityTripId = null;"], ["52-trips.js", "Promise.resolve(openCommunityTrip(tripId)).catch("], ["52-trips.js", "viewCommunityUser(ownerUid)", 0], ["52-trips.js", "openCommunityUserByUid", 0], ["52-trips.js", "function tripNamedMember(t){ return !!(currentUser && t && Array.isArray(t.sharedWith) && t.sharedWith.indexOf(currentUser.uid) >= 0); }"], ["53-community-trips.js", "(d0 ? (__mem ? __memDay(d0) : dpViewerDayHtml(trip, d0))"], ["53-community-trips.js", "return day.mode === 'daytrip' ? tripDayTripViewHtml(trip, day, city, true) : tripRouteTabHtml(trip, day, city, true);"], ["53-community-trips.js", "const __mem = tripNamedMember(trip);"], ["53-community-trips.js", "else if (day.mode === 'daytrip') html += dpViewerDayHtml(trip, day, tripCityOfDay(trip, day));"], ["58-community-curators.js", "t.customLabel ? (t.cityName", 0]]
          .forEach(function(x){ const n = srcOf(x[0]).split(x[1]).length - 1; if (n !== (x[2] === 0 ? 0 : (x[2] || 1))) off18.push('(ق١١-١٧-٠٦) not wired ' + (x[2] === 0 ? 0 : (x[2] || 1)) + '× — ' + x[0] + ': ' + x[1].slice(0, 40)); });
        if (/sharedWith|\.public\b/.test(srcOf('64-import.js'))) off18.push('(ق١١-١٥-٠٨) the import file names visibility or sharing again — it must take both from mpListVisNow at write time, never from a copy'); if ((Object.keys(src).map(function(k){ return src[k]; }).join('\n').match(/repairVisibility\(/g) || []).length !== 2) off18.push('(ق١١-١٥-٠٨) a new caller stamps sub-category visibility — only the load-time repair (from the read itself) and the tap (from the server now) may'); if (srcOf('57-citylist.js').split('cmWriteDoc(').length - 1 !== 7) off18.push('(ق١١-١٥-٠٨) a city-manager write was added or removed (cmWriteDoc: the definition + 6 callers — merge · split ×2 · move ×2 · undo) — a new caller must take visibility and sharing from a read made just before it');
        const bare = Object.keys(src).map(function(k){ return src[k]; }).join('\n'); if (bare.indexOf('placeIdentityBy') >= 0 || bare.indexOf('removeMineBy') >= 0) off18.push('(٦ · ق١١-١٥-٠١) the app still refers to the cancelled who-pinned store'); if ((bare.match(/col\('placeIdentity'\)\.doc\([^)]*\)\.set\(/g) || []).length !== 1 || /col\('placeIdentity'\)\.doc\([^)]*\)\.update\(/.test(bare)) off18.push('(٦) the pin is written in exactly one place (identity.put, which drops by) and never by a bare update'); if (/by: currentUser\.uid, at: Date\.now\(\) \}|\{ by: by, at: at \}/.test(bare)) off18.push('(٦) a caller still passes the writer id with a pin'); if (srcOf('57-citylist.js').indexOf('mpData.nicknames.set(') >= 0) off18.push('(ق١١-١٤-٢٦) the rename reserves a nickname outside the swap batch'); }
      check(off18.length === 0 && /^\/\/ firestore rules v3\.18 /.test(rules), T + 'rules text v3.18: the record leaves with its counter — three withdrawal branches, four release functions narrowed to "source deleted · counter at zero" (' + w18.length + ' markers)', off18.join(' · ')); }
    const gone = ['curator_view', 'curator_contact', 'curator_follow', 'session_depth'].filter(function(k){ return body.indexOf("'" + k + "'") >= 0; });
    check(gone.length === 0, T + 'rules text: the four removed event keys are not accepted again', 'back in the rules: ' + gone.join(' · '));
    const all = Object.keys(src).map(function(k){ return src[k]; }).join('\n'); const direct = (all.match(/col\('placeFavoriteCounts'\)\.doc\([^)]*\)\.(?:set|update)\(/g) || []).length;
    check(direct === 0 && all.indexOf('placeCounts.bump(') < 0, T + 'the app writes a place counter only inside a batch with the saver’s record (no bare set/update on placeFavoriteCounts)', 'bare writes: ' + direct); }
  /* r117 (المراجعة المستقلة الثانية — مخطّط الرابط): كل href يُبنى من متغيّر في src/ يمرّ بالمرمِّز (mpSafeUrl · mpSafeHref) أو هو من قائمة الروابط التي يبنيها التطبيق نفسه — موضع جديد يرسم رابطًا خامًا يُحمرّ.
     وتحتها الشبكة العامة: حارس النقر مسجَّل على الوثيقة، والمدقِّق يفحص المخطّط لا اسم الخادم وحده. */
  { const all = Object.keys(src).map(function(k){ return src[k]; }).join('\n'); const BUILT = ['attrVal(nav)', 'attrVal(mh)', 'attrVal(href)', 'attrVal(tkMapHref(', 'escapeHtml(dayUrl)']; const SAFE = ['attrVal(mpSafeUrl(', 'escapeHtml(mpSafeUrl(', 'attrVal(mpSafeHref(']; const raw = []; const re = /href=\\?"' \+ ([^\n]{0,60})/g; let m; let seen = 0;
    while ((m = re.exec(all))){ seen++; const t = m[1]; if (!SAFE.concat(BUILT).some(function(p){ return t.indexOf(p) === 0; })) raw.push(t.slice(0, 40)); }
    check(seen >= 15 && raw.length === 0, T + 'every link built from a variable passes the scheme guard or is on the list of links the app builds itself (' + seen + ' sinks)', 'raw href: ' + raw.join(' ‖ '));
    check(all.indexOf("document.addEventListener('click', mpLinkGuard, true); document.addEventListener('auxclick', mpLinkGuard, true);") > 0 && all.indexOf("if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;") > 0, T + 'the page-wide link guard is registered and the Maps link validator checks the scheme', 'guard or scheme check missing'); }
  /* r117-د (ق١١-١١-١٦ — وسم Soon أُزيل عن مشاركة أندرويد): وجهة المشاركة في manifest.json هي صفحة البدء نفسها وبالمعاملات التي يلتقطها mpShareInCapture — صفحة البدء تتبدّل عند الانتقال للصفحة الرسمية، ووجهة تبقى على صفحة الاختبار كانت ستفتح المشارَك في غير التطبيق المثبَّت */
  { let man = {}; try{ man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')); }catch(_){} const st = man.share_target || {}; const pr = st.params || {}; const cap = src['63-input-qr.js'] || '';
    check(!!st.action && st.action === man.start_url && st.method === 'GET' && ['title', 'text', 'url'].every(function(k){ return typeof pr[k] === 'string' && cap.indexOf("q.get('" + pr[k] + "')") >= 0; }), T + 'manifest share_target opens the start page itself with the three parameters the app captures (' + (st.action || 'none') + ')', 'start_url ' + man.start_url + ' · action ' + st.action + ' · params ' + JSON.stringify(pr)); }
  /* r116-أ: العتبات غير المعايَرة سجلّ بالاسم — كل ثابت فيه يُعرَّف في المصدر وعلى سطره علامة «غير معايَرة»؛ يخرج من السجل حين يُعايَر من بيانات حقيقية (دَين thresholds). */
  const UNCALIBRATED = ['MP_POPULAR_MIN', 'MP_DASH_MIN_GATE', 'MP_DASH_MIN_SESSIONS', 'MP_DASH_MIN_PULSE', 'MP_DASH_MIN_LEGS', 'MP_IMPACT_MIN_VIEWS'];
  { const all = Object.keys(src).map(function(k){ return src[k]; }).join('\n'); const badU = UNCALIBRATED.filter(function(n){ const m = all.match(new RegExp('\\n\\s*const ' + n + ' = [^\\n]*')); return !m || m[0].indexOf('غير معايَرة') < 0; });
    check(badU.length === 0, T + 'uncalibrated thresholds are named constants carrying the mark (' + UNCALIBRATED.join(' · ') + ')', badU.join(' · ')); }
  check(OPEN_DEBTS.length <= 9 && OPEN_DEBTS.every(function(d){ return d[1].length > 12 && d[2].length > 3; }), T + 'open debts (' + OPEN_DEBTS.length + ') — ' + OPEN_DEBTS.map(function(d){ return d[0] + ' → ' + d[2]; }).join(' ‖ '));
}
function uiParityGuard(){
  const T = '§41 one interface for both plan shapes (r110): ';
  const P = require(path.join(ROOT, 'tests', 'ui-parity.js'));
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts; let all = ''; const fns = {};
  parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); all += src + '\n'; const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; const idx = []; while ((m = re.exec(src))) idx.push([m.index, m[1]]); idx.forEach(function(it, i){ fns[it[1]] = src.slice(it[0], i + 1 < idx.length ? idx[i + 1][0] : src.length); }); });
  const body = function(n){ return fns[n] || ''; };
  const acts = body('tbRowActs');
  check(!!acts && !!body('tbAddChipHtml') && !!body('tbAddDoorHtml'), T + 'the shared pieces exist (tbRowActs · tbAddChipHtml · tbAddDoorHtml)');
  /* (١) الجدول: كل صف يسمّي معالجًا معرَّفًا لكل شكل أو سببًا مكتوبًا — والمعالج مرسوم في tbRowActs */
  const bad = []; P.ROW.forEach(function(r){ ['city', 'linear'].forEach(function(k){ const v = r[k]; if (P.isFn(v)){ if (!fns[v]) bad.push(r.key + '.' + k + ': ' + v + ' is not defined'); else if (acts.indexOf('"' + v + "('") < 0) bad.push(r.key + '.' + k + ': ' + v + ' is not drawn by tbRowActs'); } else if (String(v || '').trim().length < 12) bad.push(r.key + '.' + k + ': no handler and no written reason'); }); if (r.linearWhen && String(r.linearElse || '').trim().length < 12) bad.push(r.key + ': conditional on linear without a written reason'); });
  check(P.ROW.length >= 9 && bad.length === 0, T + 'every row action names a handler per shape or a written reason, and tbRowActs draws it (' + P.ROW.length + ' rows)', bad.join(' ‖ '));
  /* (٢) الترتيب: أسماء الأفعال تظهر في tbRowActs بترتيب الجدول */
  let at = -1; const order = []; P.ROW.forEach(function(r){ const i = acts.indexOf("'" + r.label + "'", 0); if (i < 0) order.push(r.label + ' not found'); else { if (i < at) order.push(r.label + ' is drawn before the row above it'); at = Math.max(at, i); } });
  check(order.length === 0, T + 'tbRowActs draws the actions in the order of the table', order.join(' ‖ '));
  /* (٣) الرسّامان يرسمان الأفعال من القطعة المشتركة وحدها — لا فعل صف مكتوب في أيٍّ منهما */
  const rowHandlers = Array.from(new Set(P.ROW.reduce(function(a, r){ return a.concat([r.city, r.linear].filter(P.isFn)); }, [])));
  const leak = []; ['tbCardHtml', 'tbDayTripHtml'].forEach(function(n){ if (body(n).indexOf('tbRowActs(') < 0) leak.push(n + ' does not call tbRowActs'); });
  /* المراجعة المستقلة ب (٥): كان يُبحث عن onclick="اسم(" حرفيًّا — فمرّ معالج صف يُمرَّر اسمًا لقطعة راسمة (tripOrdHtml(…, 'tbDTMove')). الآن: اسم معالج الصف لا يظهر *بأي صيغة* في أي راسم للمحرّر غير tbRowActs، إلا ما سمّاه الجدول (STATIC_OUTSIDE) بسببه. */
  const renderers = Object.keys(fns).filter(function(n){ return /^tb[A-Z]\w*Html$/.test(n); }); const allowed = P.STATIC_OUTSIDE || {};
  renderers.forEach(function(n){ rowHandlers.forEach(function(h){ if (new RegExp('\\b' + h + '\\b').test(body(n)) && !((allowed[n] || {})[h])) leak.push(n + ' names ' + h); }); });
  Object.keys(allowed).forEach(function(n){ Object.keys(allowed[n]).forEach(function(h){ if (!new RegExp('\\b' + h + '\\b').test(body(n))) leak.push('STATIC_OUTSIDE lists ' + n + '.' + h + ' but it is not there'); else if (String(allowed[n][h]).trim().length < 12) leak.push(n + '.' + h + ': no written reason'); }); });
  check(renderers.length >= 10 && leak.length === 0, T + 'no editor renderer names a row handler except tbRowActs (' + renderers.length + ' renderers · token-level)', leak.join(' ‖ '));
  /* (٤) أبواب الإضافة: الشريحة والباب العريض من القطعتين في الرسّامين كليهما — ولا «＋ Add places» مكتوبًا خارجهما إلا زر العرض المحفوظ */
  const doors = []; ['tbDraftHtml', 'tbDayTripHtml'].forEach(function(n){ const b = body(n); if (b.indexOf('tbAddChipHtml(') < 0) doors.push(n + ' has no ＋ Add places chip'); if (b.indexOf('tbAddDoorHtml(') < 0) doors.push(n + ' has no ＋ Add places door'); });
  let lit = 0; parts.forEach(function(p){ if (p === '60-help.js') return; lit += (fs.readFileSync(path.join(ROOT, 'src', p), 'utf8').match(/>＋ Add places</g) || []).length; }); /* نص الإرشاد يذكر الاسم ولا يرسم بابًا */
  check(doors.length === 0, T + 'the add chip and the add door are drawn in both editors from the shared pieces', doors.join(' ‖ '));
  check(lit === 3, T + '“＋ Add places” is written in three places only: the chip, the door and the saved view (' + lit + ')');
  check(/openTripBuilder\(\{ tripId: \\'' \+ attrStr\(trip\.id\) \+ '\\', stage: 2, pick: true, daySel: tripDaySel \}\)">＋ Add places</.test(all), T + 'the saved view’s ＋ Add places opens the editor with the picker open (same behaviour as inside Edit)');
  check(all.indexOf('startAddingToTrip') < 0, T + 'the old Places adding entry (startAddingToTrip) is gone — one name, one behaviour');
  /* (٥) Setup: باب الاختيار للشكلين */
  check((all.match(/<span>Pick places in /g) || []).length === 1 && all.indexOf('You add the stops on the next screen with') < 0 && /flabel">' \+ \(TB\.dayTrip \? 'Stops' : 'Places for this '/.test(all), T + 'Setup offers the same “Pick places in …” door for both shapes');
  /* (٦) بلا عودة تلقائية وبلا كلمة return (r110-أ) */
  check(all.indexOf("? 'return' :") < 0 && !/seq\.push\(\{ kind: 'end', id: 'stay'/.test(all), T + 'no automatic return step and no “return” label — the end is the user’s choice (r110-أ)');
  /* (٧) المراجعة المستقلة (٥ — الصنف): قيمة سمة HTML تُرمَّز HTML (attrVal) — attrStr ترميز نصّ JS داخل onclick، وفي value كانت تُظهر الفاصلة العليا بشرطة وتحفظها */
  const badVal = (all.match(/(?:value|placeholder)=\\?"' \+ attrStr\(/g) || []).length; const goodVal = (all.match(/(?:value|placeholder)=\\?"' \+ attrVal\(/g) || []).length;
  check(badVal === 0 && goodVal >= 40 && /function attrVal\(s\)\{[^}]*&#39;/.test(all), T + 'attribute values are HTML-escaped (attrVal · ' + goodVal + ' sites) — attrStr is for handler strings only (' + badVal + ' left in value/placeholder)');
  /* المراجعة المستقلة ب (الصنف كله): attrStr داخل سمة حدث (on…) أو نصّ معالج وحدهما — كل سمة أخرى (title · href · label · min · id · data-*) attrVal، والمحدِّد cssVal */
  const ctx = { handler: 0, other: [] }; all.split('\n').forEach(function(l){ let i = -1; while ((i = l.indexOf('attrStr(', i + 1)) >= 0){ if (l.slice(Math.max(0, i - 9), i).endsWith('function ')) continue; const q = l.lastIndexOf('"', i); const mm = q >= 0 ? l.slice(0, q).match(/([\w:-]+)=\\?$/) : null; if (mm && !/^on/.test(mm[1])) ctx.other.push(mm[1] + '=…' + l.slice(i, i + 40)); else ctx.handler++; } });
  check(ctx.other.length === 0 && ctx.handler >= 250 && /function cssVal\(s\)/.test(all), T + 'attrStr appears only inside handlers (' + ctx.handler + ') — every other attribute is attrVal and selectors are cssVal', ctx.other.slice(0, 6).join(' ‖ '));
}

// ---------- §21 (ر٦٩): تطابق الواجهات الخمس بالمرجع الحاكم v1.42 — نسبة تُطبع بكل تشغيل ولا تنخفض ----------
function referenceConformanceGuard(label, s){
  const T = '§21 ' + label + ': ';
  const has = (...ps) => ps.every(p => p.test(s)); const none = (...ps) => !ps.some(p => p.test(s));
  const C = [
    ['٦/أ صف المصدر بالرأس الثابت: My places · ＋ Add place · Search a place (r74m — بلا وسم stage 3)', has(/class="chipgrid c3 headgrid" id="plSrcRow"/, /Search a place/, /id="plAddBtn"/) && none(/Saved from Curators <span class="dim">stage 3/)],
    ['٦/أ المحدد بالمنسدلتين + ＋ City', has(/plToggle\w*Country|plPickCountry|plCountryBtn/, /＋<\/b> City|＋ City/)],
    ['٦/أ الصف الرابع: Day plan حي (r77) · Export · العلنية · المشاركة', has(/class="plrow4"/, /dayPlan: true/, /Export places list/, /id="plPublicBtn"/, /id="plShareBtn"/)],
    ['٦/أ سطر السياق بعد الصف الرابع (r74m)', s.indexOf('class="plrow4"') > 0 && s.indexOf('id="plCtx"') > s.indexOf('class="plrow4"')],
    ['٦/أ المشاركة الصادرة «Share my list with…»', has(/Share my list with/)],
    ['٦/أ لا قسم Shared with you بالوجهتين', none(/Shared with you \(' \+ shared/, /moves into/)],
    ['٦/أ نافذة مفكرتي مجمَّعة بالمدينة', has(/bmCity|groupByCity|Bookmarked places[^\n]{0,400}cityName/)],
    ['٦/أ نافذة المخططات بنوعيها', has(/City Route/, /Outside city trip/)],
    ['٦/ب المبدل الرباعي شبكة ٢×٢', has(/data-tsrc="saved"/, /Saved from Community <span class="dim">stage 3<\/span><\/button>/)],
    ['٦/ب صف واحد: Build a trip أولًا يسارًا ثم All trips (r77)', s.indexOf('openTripBuilder()">＋ Build a trip') > 0 && s.indexOf('openTripBuilder()">＋ Build a trip') < s.indexOf('id="tripCityPick"')],
    ['٦/ب لا نوع للرحلة: شرائح الحالة الثلاث بدل مدينة واحدة/متعددة (r77 · القرار ١٣)', none(/One day trip/, /data-ttype="day"/, /data-ttype="city"/, /data-ttype="multi"/) && has(/data-ttype="upcoming"/, /data-ttype="past"/)],
    ['٦/ب عرض الرحلة بالخطة: الفترات والبدائل والصينية وورقة النقل (r77)', has(/trip-tray/, /trip-alts/, /tm-grid/)],
    ['٦/د الجذر: مبدل + بحث الاسم + محدد المدينة', has(/communityScreen = 'root'/, /Search by username|cmSearch/) && has(/rootCity|cmRootCity/)],
    ['٦/د شاشة المصدر على القالب المشترك', has(/sourceScreen\(\{[^\n]*backHandler: 'cmBackToRoot/)],
    ['٦/د الشرائح الست ٣+٣', has(/Most bookmarked<\/button><\/div>'\n?\s*\+ '<div class="chipgrid c3"><button[^\n]*Shared with you/)],
    ['٦/د بطاقات بصفين', has(/class="row rowblock"><div>[^\n]{0,400}Save <span class="dim">stage 3/)],
    ['٦/د المحدد لوحة اختيار لا منسدلة', none(/<select id="cmCity"/)],
    ['٦/هـ الشبكة بلا بحث ظاهر', has(/class="csel" hidden[^>]*>🔍 Find a curator/) || none(/Find a curator/)],
    ['٦/هـ٢ رأس الثقة: Contact/Following مؤجلان بلا 📤', has(/✉ Contact/, /Following <span class="dim">/) && none(/Send this curator page/)],
    ['٦/هـ٢ المبدل بلا Bookmarked بمستواه + الشرائح الست', none(/>🔖 Bookmarked<\/span>/) && has(/Shared with you <span class="dim">later/)],
    ['٦/هـ٢ لا وسوم متقادمة', none(/Preview · step 4/, /Curators<\/b> · Step 4/)],
    ['٦/و الرأس الثلاثي + Add address', has(/Add address/, /addrCountry|addrCity|addr[^\n]{0,300}City/)],
    ['٦/و لافتة الإيقاف', has(/Account [sS]uspended/)],
    ['٦/و المحدد لوحة اختيار لا منسدلة', none(/<select[^>]*id="addr/)],
  ];
  const n = C.filter(x => x[1]).length;
  console.log('INFO  ' + T + 'reference conformance ' + n + '/' + C.length + ' — open: ' + C.filter(x => !x[1]).map(x => x[0]).join(' | '));
  check(n >= 13, T + 'conformance never drops below the r69 baseline (13)', n + '/' + C.length);
}


// ---------- §22 (r74b · ر٧٣ البند ٧ — درس ٣٠ سبتمبر/١ أكتوبر): لا تعليق سطري // داخل القوالب الحرفية ----------
// التعليقات السطرية داخل الاستبدالات ابتلعت أسطرًا ثلاث مرات (r73m · r73l)؛ والقالب الحرفي (backtick) هو الموضع الذي يُعبَّأ ويُحقن بالاستبدال.
// القاعدة: داخل أي قالب حرفي متعدد الأسطر بنسخة الاختبار لا يظهر «//» إلا ضمن رابط (://) — التعليق الكتلي /* */ وحده مسموح.
function slashCommentGuard(label, s){
  const T = '§22 ' + label + ': ';
  const bad = []; let n = 0;
  const re = /`((?:[^`\\]|\\.)*)`/g; let m;
  while ((m = re.exec(s))){ const body = m[1]; if (body.indexOf('\n') < 0) continue; n++;
    body.split('\n').forEach((ln, i) => { if (/(^|[^:])\/\//.test(ln)) bad.push((s.slice(0, m.index).split('\n').length + i) + ': ' + ln.trim().slice(0, 60)); }); }
  console.log('INFO  ' + T + 'multi-line template literals scanned = ' + n);
  check(bad.length === 0, T + 'no // line comments inside multi-line template literals (block comments only)', bad.slice(0, 5).join(' | '));
}

// ---------- §23 (ر٧٣-ج البند ٥): المخرج مبنيّ من src/ لا معدَّل يدويًّا ----------
// الملف المنشور index-debug-test.html يُبنى بـ scripts/build.js من أجزاء src/ بالترتيب المكتوب في src/build.json.
// (أ) بناء الملمح test في الذاكرة يطابق الملف المرفوع بايتًا بايتًا — وإلا: تعديل يدوي على المخرج أو جزء لم يُرفع.
// (ب) ملمح prod (الإنتاج عند المرحلة د) يُبنى في الذاكرة ويُفحص: بلا لوحة توقيت ولا سطر BUILD ولا خطّاف _diag، وبالدوال المفتاحية نفسها.
function buildGuard(){
  const T = '§23 build: ';
  let b; try{ b = require(path.join(ROOT, 'scripts', 'build.js')); }catch(e){ fail(T + 'scripts/build.js loads', String(e && e.message || e)); return; }
  let t; try{ t = b.build('test'); }catch(e){ fail(T + 'test profile builds from src/', String(e && e.message || e)); return; }
  console.log('INFO  ' + T + 'parts ' + t.names.length + ' · src ' + t.srcHash);
  const tabbed = t.names.filter(n => fs.readFileSync(path.join(ROOT, 'src', n), 'utf8').indexOf('\t') >= 0); // ب-٢-١ (درس ٩ أكتوبر): علامة جدولة واحدة بتعليق ضاعت بطريق التسليم فاختلف المخرج عن بناء الأجزاء — لا جدولة بالمصدر
  check(tabbed.length === 0, T + 'no tab characters in any src/ part (lost in transit → false build mismatch)', tabbed.join(', '));
  const nonNfc = t.names.filter(n => { const x = fs.readFileSync(path.join(ROOT, 'src', n), 'utf8'); return x !== x.normalize('NFC'); }); // ب-٢-١ (درس ٩ أكتوبر ٢): طريق التسليم يطبّع يونيكود (NFC) فيُعاد ترتيب علامتي تشكيل متجاورتين — المصدر يُحفظ NFC أصلًا فيصير التطبيع بلا أثر
  check(nonNfc.length === 0, T + 'every src/ part is Unicode NFC-normalized (transit normalization must be a no-op)', nonNfc.join(', '));
  if (t.out === test) pass(T + TEST + ' is byte-identical to build(test) — no hand edits, all parts committed');
  else { const a = t.out.split('\n'), c = test.split('\n'); let i = 0; while (i < a.length && i < c.length && a[i] === c[i]) i++;
    fail(T + TEST + ' is byte-identical to build(test)', 'first divergence at line ' + (i + 1) + ' | built: ' + (a[i] || '<eof>').slice(0, 70) + ' | file: ' + (c[i] || '<eof>').slice(0, 70)); }
  let p; try{ p = b.build('prod'); }catch(e){ fail(T + 'prod profile builds from src/', String(e && e.message || e)); return; }
  check(!/__timingBox|TIMING — tap|BUILD:|mpTrack\._diag/.test(p.out), T + 'prod profile has no timing panel, no BUILD line, no _diag hook');
  check(countOcc(p.out, 'function logTiming(') === 1 && countOcc(p.out, 'logTiming(') > 20, T + 'prod profile keeps a no-op logTiming for the call sites');
  for (const k of ['function initFirebase', 'function renderPlacesBody', 'function openAuthModal', 'const mpData = (function(){', 'const mpTrack = (function(){']) check(p.out.indexOf(k) > 0, T + 'prod profile keeps ' + k);
  const dTest = fs.readFileSync(path.join(ROOT, 'src', '91-timing.js'), 'utf8').length, dProd = fs.readFileSync(path.join(ROOT, 'src', '91-timing-prod.js'), 'utf8').length;
  check(t.out.length - p.out.length === dTest - dProd, T + 'prod differs from test exactly by the diagnostics part (' + (t.out.length - p.out.length) + ' chars)');
}

// ---------- §24 (ب-٢-١ · ٩ أكتوبر ٢٠٢٦): مفاتيح الإحصاء التي يكتبها التطبيق موجودة بالقائمة البيضاء المطابقة في القواعد ----------
// الدرس: نسخ القائمة كتب 'copy' (خارج القائمة) فرُفض صامتًا شهرًا، ونسخ المكان استدعى mpTrack.statsPlace غير الموجودة داخل try/catch فلم يكتب شيئًا — لا المحاكاة ولا الحارس التقطا ذلك.
// (أ) كل نداء mpTrack.<x>( بالتطبيق يشير إلى عضو معرَّف بكائن mpTrack المُصدَّر.
// (ب) كل مفتاح نصي يُمرَّر إلى statsList/statsTrip/statsCurator/statsCity/statsPlaceList موجود بـhasOnly([...]) للمجموعة المطابقة في firestore.rules.
function statsKeysGuard(label, s){
  const T = '§24 ' + label + ': ';
  const code = stripComments(s);
  const ret = (code.match(/const mpTrack = \(function\(\)\{[\s\S]*?\n  return \{([\s\S]*?)\};\n\}\)\(\);/) || [])[1] || '';
  const members = new Set([...ret.matchAll(/(?:^|[\s,{])(?:get |set )?([A-Za-z_]\w*)\s*[:(]/g)].map(m => m[1]));
  const used = new Set([...code.matchAll(/mpTrack\.([A-Za-z_]\w*)\s*\(/g)].map(m => m[1]));
  const undef = [...used].filter(u => !members.has(u));
  console.log('INFO  ' + T + 'mpTrack members ' + members.size + ' · call sites use ' + used.size);
  check(members.size >= 8 && undef.length === 0, T + 'every mpTrack.<x>( call names a defined member', 'undefined: ' + undef.join(', '));
  const rulesPath = path.join(ROOT, 'firestore.rules'); if (!fs.existsSync(rulesPath)){ warn(T + 'firestore.rules absent — key whitelist check skipped'); return; }
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const white = coll => { const m = new RegExp('match /' + coll + '/\\{docId\\} \\{[\\s\\S]*?hasOnly\\(\\[([^\\]]*)\\]').exec(rules); return m ? new Set([...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])) : null; };
  const map = { statsList: 'stats_lists', statsTrip: 'stats_trips', statsCurator: 'stats_curators', statsCity: 'stats_cities', statsPlaceList: 'stats_places' };
  const bad = []; let n = 0;
  for (const fn of Object.keys(map)){
    const wl = white(map[fn]); if (!wl){ bad.push(map[fn] + ': whitelist not found in rules'); continue; }
    for (const m of code.matchAll(new RegExp('mpTrack\\.' + fn + '\\(([^)]*)\\)', 'g'))){
      const args = m[1]; const keys = [...args.matchAll(/'([a-z][a-z_]{2,})'/g)].map(x => x[1]).filter(k => !/^(daily|all)$/.test(k)); /* المفاتيح النصية فقط — لا فواصل المعرّفات مثل '_' */
      for (const k of keys){ n++; if (!wl.has(k)) bad.push(fn + "('" + k + "') not in " + map[fn] + ' whitelist'); }
    }
  }
  const inner = (code.match(/function statsPlaceList\([\s\S]*?\n  \}/) || [''])[0]; for (const k of ['trip_add', 'open_total']){ n++; if (!(white('stats_places') || new Set()).has(k)) bad.push('statsPlaceList writes ' + k + ' not in stats_places whitelist'); }
  console.log('INFO  ' + T + 'stats keys checked at call sites = ' + n);
  check(bad.length === 0, T + 'every stats key written by the app is in its rules whitelist', bad.slice(0, 6).join(' | '));
}

// ---------- §25 (ب-٢-٢-أ٢ · القرار ١ من ٦ وملاحظة المالك ١٠ أكتوبر): لا حوارات متصفح خام ولا وسم عبر textContent ----------
// (أ) confirm()/prompt()/alert() المتصفح خرجت كلها إلى الورقة السفلية داخل التطبيق (mpSheet/mpConfirm) — أي عودة لها تُرفض.
// (ب) textContent = '…<span…' يعرض الوسم نصًّا (ظهر «<SPAN CLASS="ARR">» في More/Less والدرج) — الوسم يُكتب بـ innerHTML أو يُكتب النص وحده.
function dialogGuard(label, s){
  const T = '§25 ' + label + ': ';
  const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const dialogs = []; for (const m of code.matchAll(/(^|[^\w$])(confirm|prompt|alert)\(/g)) dialogs.push((code.slice(0, m.index).split('\n').length) + ': ' + m[2] + '(');
  check(dialogs.length === 0, T + 'no raw browser dialogs (confirm/prompt/alert) — the in-app sheet mpSheet/mpConfirm only', dialogs.slice(0, 6).join(' | '));
  const markup = []; for (const m of code.matchAll(/textContent\s*=\s*[^;\n]*<[a-z]/g)) markup.push((code.slice(0, m.index).split('\n').length) + ': ' + m[0].slice(0, 60));
  check(markup.length === 0, T + 'no markup assigned through textContent (it renders as literal text)', markup.slice(0, 6).join(' | '));
  const sheet = /function mpSheet\(o\)\{/.test(s) && /id="sheetBackdrop"/.test(s) && /function sheetDone\(v\)\{/.test(s);
  check(sheet, T + 'the in-app sheet exists (mpSheet · sheetDone · #sheetBackdrop)');
}

// ---------- §26 (r76 · دراسة التوافق مع خرائط جوجل ت٤ — ملاحظة المالك ١٢ أكتوبر): بيان التطبيق المثبَّت يشير إلى الصفحة المنشورة فعلًا ----------
// start_url كان ./index.html وهي لا تُبنى قبل المرحلة د ⇒ أيقونة الشاشة الرئيسية تفتح فراغًا. الحارس: الملف الذي يسمّيه start_url موجود بالمستودع، وما دام الإنتاج غير منشور فهو نسخة الاختبار؛ ولون الإقلاع من لوحة الهوية الليلية.
function manifestGuard(){
  const T = '§26 manifest: ';
  const mp = path.join(ROOT, 'manifest.json'); if (!fs.existsSync(mp)){ warn(T + 'manifest.json absent — skipped'); return; }
  let m; try{ m = JSON.parse(fs.readFileSync(mp, 'utf8')); }catch(e){ fail(T + 'manifest.json parses', String(e && e.message || e)); return; }
  const su = String(m.start_url || ''); const file = su.replace(/^\.?\//, '').split(/[?#]/)[0];
  check(!!file && fs.existsSync(path.join(ROOT, file)), T + 'start_url names a file that exists in the repo (' + su + ')');
  if (!prod) check(file === TEST, T + 'production not published yet ⇒ start_url is ' + TEST, 'found ' + su);
  const paper = (test.match(/--paper:(#[0-9A-Fa-f]{6})/) || [])[1];
  check(!paper || String(m.background_color || '').toUpperCase() === paper.toUpperCase(), T + 'splash background_color equals --paper (' + paper + ')', 'found ' + m.background_color);
}

// ---------- §27 (r77 · حزمة الرحلات · الدفعة أ — التثبيت ٥): لا عودة للنموذج القديم (جدول الخانات السبع ونوع الرحلة) · المحرك وجدول الإيقاع حاضران ----------
function tripModelGuard(){
  const T = '§27 trip model: ';
  const code = stripComments(test.replace(/<script\b[^>]*>|<\/script>/g, ''));
  const banned = ['TRIP_CATEGORIES', 'categoryOrder', 'defaultCategoryOrder(', 'emptyDay(', 'openCreateTripFlow', 'tripTypeLine', 'TRIP_TYPES', 'newTripType', 'Single city', 'Multi-city', 'openCategoryPicker', 'openDayPicker', 'tripSourcesCardHtml'];
  const found = banned.filter(n => code.includes(n));
  check(found.length === 0, T + 'no consumer of the old day-slot model or the trip type remains', found.join(', '));
  check(/const TRIP_RHYTHM = \{/.test(code) && /function tripBuildPlan\(/.test(code) && /function tripSuggestSlot\(/.test(code) && /function tripWarnings\(/.test(code), T + 'engine present: TRIP_RHYTHM · tripBuildPlan · tripSuggestSlot · tripWarnings');
  const engine = fs.readFileSync(path.join(ROOT, 'src', '59-trip-engine.js'), 'utf8');
  check(!/document\.|window\.|mpData\.|fetch\(|localStorage/.test(stripComments(engine)), T + 'engine part is pure — no DOM, no data layer, no network (التثبيت ١)');
  check(/Math\.random/.test(stripComments(engine).replace(/function tripNewEntry[\s\S]*?\n\}/, '')) === false, T + 'engine is deterministic — no Math.random outside id generation (التثبيت ٤)');
  check(/tripPlanNormalize\(/.test(code) && /Old format/.test(test), T + 'old-format trips are guarded (normalize + delete-only row)');
  check(!/Day 0/.test(test) && !/kind: 'arrival'/.test(code) && /function tripDaysFromDates\(/.test(code), T + 'no Day 0 and no derived partial days — arrival and departure trim the first and last day (أ-٢ · القرار ٢ · ٣)');
  // r78 (الدفعة ب — التثبيتان ٢ و٦): مسار اليوم يُشتق ولا يُخزَّن ترتيبًا؛ الروابط بلا مفاتيح؛ التبويب حقيقي
  check(/function tripDaySchedule\(/.test(engine) && /function tripRoutesPrune\(/.test(engine) && /function tripNavUrl\(/.test(engine) && /function tripDaySequence\(/.test(engine), T + 'day-route engine present: tripDaySequence · tripDaySchedule · tripRoutesPrune · tripNavUrl (r78)');
  const nav = (stripComments(engine).match(/function tripNavUrl\([\s\S]*?\n\}/) || [''])[0];
  check(nav.includes('maps/dir/?api=1') && nav.includes('maps.apple.com/?') && nav.includes('waze.com/ul?') && !/key=|apiKey|token/.test(nav), T + 'navigation links are plain Google, Apple and Waze directions without keys (البيان ٦-٣)');
  check(!/Day route <span class="dim">Soon/.test(test) && /tripPickTab\(\\'route\\'\)/.test(code) && /tripRoutesPrune\(trip\)/.test(code), T + 'Day route tab is real and routes are pruned on save (r78)');
  check(!/dayRoutes\[[^\]]*\]\.(stops|order|arrive|complete)\s*=/.test(code), T + 'no stored order, times or completeness flag in dayRoutes — derived from the plan (التثبيت ٢)');
  check(/function tripCityPeriods\(/.test(engine) && /function tripDayAbsorb\(/.test(engine) && /function tripDayFold\(/.test(engine) && /tbTogglePeriod\(/.test(code), T + 'flexible periods: city periods · absorption · fold · setup toggles (r78-2)');
  check(/altCap: 2/.test(engine) && /function tripAltSlot\(/.test(engine) && /orderTiers: \{/.test(engine) && /removing an alternative sends it back here/.test(test), T + 'alternatives capped at two in the automatic build · tiered order within a period · tray note (r78-3)');
}


// ---------- §28 (هـ-١٠ · قرار المالك ١٥ أكتوبر: «وثّق التحسّن حتى لا يتأثر بأي تحديث مستقبلي»): ثوابت الأداء التي أنهت تجمّد المجتمع وبطء التحميل — تُحرس نصًّا ----------
function perfInvariantsGuard(){
  const T = '§28 perf invariants (هـ): ';
  const boot = stripComments(fs.readFileSync(path.join(ROOT, 'src', '40-boot.js'), 'utf8'));
  const init = stripComments(fs.readFileSync(path.join(ROOT, 'src', '92-init.js'), 'utf8'));
  const cm = stripComments(fs.readFileSync(path.join(ROOT, 'src', '58-community-curators.js'), 'utf8'));
  const code = stripComments(test.replace(/<script\b[^>]*>|<\/script>/g, ''));
  // ١ · النقل الطويل مطبَّق فعلًا: force مع autoDetect=false صراحةً (compat+merge يدمج الافتراضي autoDetect=true فيرمي المنشئ «cannot be used together» — هـ-٦)
  check(/experimentalForceLongPolling: true, experimentalAutoDetectLongPolling: false, experimentalLongPollingOptions: \{ timeoutSeconds: 10 \}, merge: true/.test(boot), T + 'Firestore long polling is forced with auto-detect explicitly off and a 10 s request timeout (هـ-٦ — without autoDetect:false the compat merge makes the call throw and the setting never applies)');
  check(/\[NET\] long polling not applied/.test(boot), T + 'a failed settings call is logged under its own line so the NET line can show transport FAILED (never silent)');
  // ٢ · المستمع الدائم: القناة لا تُغلق بعد ٦٠ ثانية بلا أهداف فلا تُعاد تهيئتها عند أول قراءة بعد خمول (هـ-٥)
  check(/await initFirebase\(\);[\s\S]{0,600}mpData\.settings\.watchApp\(/.test(init), T + 'keep-alive listener on settings/app starts right after initFirebase (هـ-٥ — no stream reopen after idle)');
  // ٣ · App Check موقوفة حتى الإنفاذ: التفعيل مشروط بـ?withcheck=1 (هـ) — لا انتظار لشهادة reCAPTCHA قبل أول قراءة
  check(/if \(firebase\.appCheck && __withCheck\)\{/.test(boot), T + 'App Check activation stays gated behind ?withcheck=1 until enforcement (هـ)');
  // ٤ · لا دوران: استدعاء ثانٍ لـcmEnsureCity أثناء التحميل ينتظر الوعد الجاري، وبعد المحاولة تُعدّ المدينة مكتملة (هـ-١٠ — السبب الجذري لتجمّد Open من Shared with me)
  check(/if \(!c \|\| c\._full\) return c; if \(c\._loading\) return c\._loading;/.test(cm) && /c\._full = true; c\._loading = null; return c;/.test(cm), T + 'cmEnsureCity: a second call during a load waits for the in-flight promise and the city counts as complete after one attempt (هـ-١٠)');
  // ٥ · صنف الخلل عمومًا: لا دالة غير متزامنة تعود فورًا بقيمة حين يكون «التحميل جاريًا» — ذلك ما يصنع سلسلة المهام الدقيقة مع .then(render)
  const earlyReturn = code.match(/_loading\) return [A-Za-z_$][\w$]*;/g) || [];
  check(earlyReturn.length === 0, T + 'no async loader returns a plain value while its own load is in flight (the pattern behind the microtask loop)', earlyReturn.join(' | '));
}

// ---------- §29 (أ-١٣ · ق١٠-١٩-٠١ · خريطة الاستيراد v1.1 — الخطوط الحمراء): الاستيراد من Takeout لا ينادي أحدًا ولا يكتب موقعًا من الملف ----------
function importRedLinesGuard(){
  const T = '§29 import red lines (أ-١٣): ';
  const f = path.join(ROOT, 'src', '64-import.js'); check(fs.existsSync(f), T + 'src/64-import.js exists (the import part is its own file so the guard can read it whole)'); if (!fs.existsSync(f)) return;
  const imp = stripComments(fs.readFileSync(f, 'utf8'));
  // ١ · لا نداء خارجيًّا من جزء الاستيراد: لا fetch ولا XHR ولا beacon ولا نداء للعامل (mpData.geo) — الملف يُقرأ على الجهاز فقط
  check(!/\bfetch\s*\(/.test(imp) && !/XMLHttpRequest/.test(imp) && !/sendBeacon/.test(imp) && !/mpData\.geo\./.test(imp), T + 'no fetch / XMLHttpRequest / sendBeacon / mpData.geo call inside the import part (the file is read on the device; nothing is uploaded, nothing is asked of Google or the worker)');
  // ٢ · المكان المكتوب يُبنى من دالة واحدة لا تحمل موقعًا: لا lat/lng/loc/cell/coordinates في بانيه
  const m = /function tkPlaceOf\(r, section, plan\)\{([^\n]*)/.exec(imp); check(!!m && !/\b(lat|lng|loc|cell|coordinates|geo)\s*:/.test(m[1]) && !/p\.geo\s*=/.test(m[1]) && /if \(r\.loc && r\.locFrom === 'json'\)\{ p\.url2 = tkLocUrl\(r\.loc\); p\.locBy = plan\.importId; \}/.test(m[1]) && /function tkLocUrl\(loc\)\{ return 'https:\/\/www\.google\.com\/maps\/search\/' \+ \(\+loc\.lat\)\.toFixed\(5\) \+ ',' \+ \(\+loc\.lng\)\.toFixed\(5\); \}/.test(imp), T + 'tkPlaceOf writes no lat / lng / loc / geo field — the file location is kept only as a Google-format link (url2 · maps/search/lat,lng · locBy) for matching, never as a pin (ق١٠-٢٣-٠١ r86-4 · supersedes ٠٩-١٥-٠٥ for JSON rows)');
  // ٣ · حارس العدّ قبل كل حفظة · gid هو الحقل الوحيد المكتوب على مكان قائم
  check(/if \(after !== before \+ added\)\{ res\.failed\.push\(c\.name \+ ' \(count mismatch\)'\); continue; \}/.test(imp), T + 'count guard before every city save (before + added = after, else nothing is saved)');
  check(/const write = function\(w\)\{ const p = resolve\(w\); if \(!p \|\| p\.gid \|\| !w\.gid\) return; p\.gid = w\.gid; p\.gidBy = plan\.importId;/.test(imp) && !/\bp\.url\s*=/.test(imp) && !/w\.p\.url\s*=/.test(imp), T + 'an existing place gains gid (+gidBy · url2) only when it had none — its url is never rewritten by the import (r86)');
  // ٤ · لا دمج بالاسم وحده: الاسم بلا قرب يوسم similar ولا يُتخطّى
  check(/r\.similar = true; c\.similar\+\+;/.test(imp) && /e\.geo && r\.loc && tkKm\(r\.loc, e\.geo\) <= TK_DUP_KM/.test(imp), T + 'name-only matches are flagged similar (S7), never merged; a duplicate needs gid, the same url, or name + proximity with a pinned existing place');
  // ٥ · السقف لكل مدينة ٥٠٠ (٠٩-١٥-٠٥ · ق١٠-١٩-٠١)
  check(/const TK_CAP_PER_CITY = 500;/.test(imp) && /added >= TK_CAP_PER_CITY\) return;/.test(imp), T + 'cap of 500 imported places per city per run');
}

// ---------- §32 (r86-1 · ق١٠-٢٢-٠١ — الخطة تقول الحقيقة): الاسم يرجّح بين المحتوين فقط · لا ضمّ افتراضيًّا فوق ٢٠ كم ولا لمدينة أكبر من أمّها · البلدة كمكان لا تُستورد افتراضيًّا · الممتصّ الأقرب والسلسلة تُحلّ ----------
function planTruthGuard(){
  const T = '§32 plan truth (r86-1): ';
  const f = path.join(ROOT, 'src', '64-import.js'); if (!fs.existsSync(f)) return; const src = stripComments(fs.readFileSync(f, 'utf8'));
  check(/const named = pool\.filter\(function\(x\)\{ return mentions\(x\.city\) \|\| \(x\.sub && mentions\(x\.sub\)\); \}\); const from = named\.length \? named : pool;/.test(src) && /if \(s <= slack\) list\.push\(\{ city: c, sub: null, s: s \}\);/.test(src), T + 'the place name only tips the choice between candidates that already contain the point (s ≤ slack) — it never jumps to a far city');
  check(/const TK_TINY_P = 1000, TK_PASS2_SLACK = 1\.5, TK_TOWN_P = 5000, TK_TOWN_KM = 3, TK_TOWN_SNAP_KM = 15, TK_SMALL_ROWS = 3, TK_AUTO_GAP = 20;/.test(src), T + 'constants as decided: hamlet < 1000 · second pass 1.5× · town ≥ 5000 within 3 km · small < 3 places · default tuck ≤ 20 km');
  check(/if \(P && tkRowsN\(c\) > 0 && tkGap\(c, P\) <= TK_AUTO_GAP && \(c\.p \|\| 0\) <= Math\.max\(P\.p \|\| 0, TK_BIG_P\)\)\{ c\.autoMerged = true; tkMergeIn\(plan, c\.id\); \} else \{ c\.on = false; \}/.test(src) && !/TK_VILLAGE/.test(src), T + 'a small new city is tucked by default only under a tree parent within 20 km that is not smaller than it; otherwise it is left unticked — and the old village merge is gone');
  check(/if \(c\.merged \|\| c\.virtual \|\| c\.mine \|\| !tkSmall\(c\)\) return;/.test(src) && /function tkSmall\(c\)\{ return !c\.mine && !c\.virtual && tkRowsN\(c\) < TK_SMALL_ROWS; \}/.test(src), T + 'defaults never touch the user’s own cities or cities with 3+ places');
  check(/if \(r\.isTown && !tkState\.includeTowns\)\{ r\.state = 'town'; c\.towns\+\+; return; \}/.test(src) && /if \(r\.state !== 'new' \|\| added >= TK_CAP_PER_CITY\) return;/.test(src) && /tkState\.includeTowns = false; tkState\.includeRemoved = false; tkState\.removedIds = tkRemovedLoad\(\)\.ids; tkState\.decoderOk = tkSelfCheck\(\);/.test(src), T + 'a town saved as a place is not imported unless the user asks (state town · reset per plan · commit saves new rows only)');
  check(/if \(\(c\.p \|\| 0\) >= TK_TOWN_P && !\(c\.absorbedBy && tkIsDistrict\(c\.absorbedBy\)\)\)/.test(src), T + 'a district of a big city (Times Square · Retiro) is never mistaken for a town saved as a place');
  check(/const sc = \(b\.micro \|\| \(b\.island && b\.dest\) \? 0 : 1\) \+ d \/ b\.rr; if \(sc < bestS\)\{ best = b; bestS = sc; \}/.test(src) && /while \(b && b\.absorbedBy && n\+\+ < 8\) b = b\.absorbedBy;/.test(src), T + 'the absorber is the nearest eligible one by relative distance and chains resolve to the root (Paris 08 → Paris, not Paris 17)');
  check(/\(\(c\.p \|\| 0\) >= TK_BIG_P && !\(c\.island && !c\.dest\)\)/.test(src), T + 'a big island (> 60 km) is not an absorber — its towns stay cities (owner rule 4)');
  check(/if \(k\.locFrom === 'cell' && r\.locFrom === 'json' && r\.loc\)\{ k\.loc = r\.loc; k\.locFrom = 'json';/.test(src) && !/locFrom === 'json'[^\n]*\.geo\s*=/.test(src), T + 'JSON coordinates replace the link cell for the same place in memory only — still never written');
}
// ---------- §31 (r86 · ق١٠-٢١-٠٣ — الخطوط الحمراء): Undo لا يحذف ما لمسته يدك · waiting بلا موقع · الإيصال لا يُخزَّن · url2 من الرابط حرفيًّا ----------
function undoRedLinesGuard(){
  const T = '§31 undo/receipt/waiting red lines (r86): ';
  const f = path.join(ROOT, 'src', '64-import.js'); if (!fs.existsSync(f)) return; const src = stripComments(fs.readFileSync(f, 'utf8'));
  check(/function tkTouched\(p, tripIds\)\{ if \(p\.geo && typeof p\.geo\.lat === 'number'\) return 'pinned'; if \(\(p\.updatedAt \|\| 0\) > \(p\.importedAt \|\| 0\)\) return 'edited'; if \(p\.topPlace \|\| \(p\.picks && p\.picks\.length\)\) return 'edited'; if \(p\.id && tripIds\[p\.id\]\) return 'trip'; return ''; \}/.test(src), T + 'Undo never removes a place that carries a pin (geo), was updated after import (updatedAt > importedAt), is Top/Picks, or is referenced by a trip (tkTouched — the dividing line)');
  check(/if \(p\.importId === last\.importId\)\{ const why = tkTouched\(p, tripIds\); if \(why\)\{ city\.keep\+\+;/.test(src) && /else if \(p\.gidBy === last\.importId \|\| p\.addrBy === last\.importId \|\| p\.locBy === last\.importId\)\{ city\.clears\.push\(p\); \}/.test(src) && /if \(p\.locBy === last\.importId\)\{ delete p\.url2; delete p\.locBy; \}/.test(src), T + 'Undo selects by this importId only and clears the gid / address / location bundle only where gidBy · addrBy · locBy name this import — older places are otherwise untouched');
  const undo = src.slice(src.indexOf('async function tkUndoRun'), src.indexOf('function tkReceiptText'));
  check(undo.length > 200 && /if \(after !== before - c\.remove\.length\)\{ res\.failed\.push\(c\.name \+ ' \(count mismatch\)'\); continue; \}/.test(undo) && /removeCityListCity\(c\.id, \{ confirmed: true \}\)/.test(undo) && /\(last\.created \|\| \[\]\)\.indexOf\(c\.id\) >= 0 && live === 0/.test(undo) /* r120 (ق١١-١٥-٠٩): «فرغت» تُحسب مما في الخادم الآن — لا مما رأته المعاينة */, T + 'reversed count guard before every Undo save (before − removed = after) and a created city is dropped only when it ends empty');
  check(/tkState\.undoPlan = u; tkState\.undoBack = back; tkState\.phase = 'undo'; tkRender\(\);/.test(src) && /keeps ' \+ u\.keeps \+ ' you worked on'/.test(src) && /onclick="tkUndoGo\(\)">Undo import<\/button>/.test(src) && /tkState\.phase = 'undone'; tkState\.undoPlan = null; tkState\.undoResult = res;/.test(src) && /chips\.push\(chip\('tkUndoFromBox\(\)', '↶ Undo last import · ' \+ escapeHtml\(when\)/.test(stripComments(fs.readFileSync(path.join(ROOT, 'src', '65-sort.js'), 'utf8'))), T + 'Undo goes through a preview screen in place (what is removed · what is kept) → Undo import → an Undone screen; the box carries an Undo last import button (r86-3)');
  check(/out\.push\(\{ name: String\(r\.name \|\| ''\)\.slice\(0, 120\), url: r\.url, gid: r\.gid \|\| '', country: cn \}\);/.test(src) && /const TK_WAIT_MAX = 500;/.test(src), T + 'waiting rows carry name · url · gid · country only (no location) and are capped at 500');
  const rc = src.slice(src.indexOf('function tkReceiptText'), src.indexOf('function tkLastHtml'));
  check(rc.length > 200 && !/localStorage\.setItem|mpData\.|sessionStorage\.setItem/.test(rc) && /a\.download = name;/.test(rc), T + 'the receipt is generated and downloaded — never written to localStorage, sessionStorage or any document');
  check((src.match(/url2: r\.url \}/g) || []).length === 2 && (src.match(/tkLocUrl\(r\.loc\)/g) || []).length === 2 && !/url2\s*=\s*[^;]*\bcell\b/.test(src) && /if \(w\.url2 && w\.url2 !== p\.url\) p\.url2 = w\.url2;/.test(src) && !/tkLocUrl\([^)]*\)[^;]*geo/.test(src), T + 'url2 is either the row’s link verbatim (upgrade) or Google’s own precise point from Saved Places.json via tkLocUrl (new row · dup enrichment) — never a decoded cell, never a pin (ق١٠-٢٣-٠١)');
  check(/if \(same\.length === 1 && rowKeyCount\[key\] === 1 && !same\[0\]\.p\.gid && r\.gid\)\{ r\.state = 'upgrade';/.test(src), T + 'an older place is upgraded only when exactly one row carries that name, it is the only older place with it, and it has no gid yet');
  check(/function tkPlanStrip\(plan\)/.test(src) && !/loc: r\.loc|cell: r\.cell|sub: r\.sub/.test(src.slice(src.indexOf('function tkPlanStrip'), src.indexOf('async function tkResume'))), T + 'the resume plan stored in sessionStorage strips loc · cell · sub (no location survives the session; the address is text and may stay — r86-2)');
}
// ---------- §30 (r85 · ق١٠-١٩-٠١ §٢ · جدول التحويل v1.1 — الخطوط الحمراء): الفرز الآلي لا يثبّت ولا يكتب موقع الملف ولا يحذف صامتًا ولا يصنّف الممنوع ----------
function sortRedLinesGuard(){
  const T = '§30 auto-sort red lines (r85): ';
  const f = path.join(ROOT, 'src', '65-sort.js'); check(fs.existsSync(f), T + 'src/65-sort.js exists (its own part so the guard reads it whole)'); if (!fs.existsSync(f)) return;
  const src = stripComments(fs.readFileSync(f, 'utf8')); const src56 = stripComments(fs.readFileSync(path.join(ROOT, 'src', '56-frame-places.js'), 'utf8')); /* r86-11: Pin on map يعيش في 56 */
  const run = src.slice(src.indexOf('async function tkSortRun'), src.indexOf('function tkStrongList'));
  check(run.length > 200 && !/\.geo\s*=/.test(run) && !/openId\s*=/.test(run), T + 'tkSortRun never writes a pin (no .geo = / openId = inside it) — sorting moves and flags only; pins need Confirm');
  check(!/geo\s*=\s*\{[^}]*(fileLoc|loc\.lat|loc\.lng)/.test(src) && !/function tkJudge[\s\S]*?\n\}[\s\S]*?function tkSortRun[\s\S]*?\.geo\s*=/.test(src.slice(src.indexOf('function tkJudge'), src.indexOf('function tkStrongList'))) && /source: 'user_paste', via: 'file'/.test(src) && !/tkPastePin\b|tkPastePinAt/.test(src) && /function tkPlusDecode\(code\)\{/.test(src) && /async function tkPinFromGoogleApply\(key, text\)\{/.test(src) && /source: 'user_paste', via: r\.how/.test(src) && /p\.geo = \{ lat: c\.lat, lng: c\.lng, source: 'user_pin' \}; delete p\.openId;/.test(src56) && !/tkIdentityKeyGid[^\n]*user_paste/.test(src) && !/tkIdentityWrite\([^)]*paste/.test(src), T + 'the matcher never writes a pin from the file location; the only pins from the user’s own Google data are the file spot (via file, source user_paste) and the Plus code / pin-link / coordinates paste (Pin from Google Maps, source user_paste via code|link|coords, decoded on the device) and the hand-placed pin (Pin on map, source user_pin), all in the user’s own document — never into the shared identity (٠٩-١٥-٠٥ · ١٠-٢٣-٠٢ · r86-8 · r86-11 · r87)');
  check(/x\.p\.geo = tkPinGeo\(x\.p, sg\); if \(sg\.openId\) x\.p\.openId = sg\.openId; undo\.push\(\{ p: x\.p, sg: x\.sg, from: rowTier === 'pick' \? x\.k : undefined \}\);/.test(src) && /if \(rowTier === 'pick'\)\{ const alt = sg\.alts\[tkPickChoice\[plSugKey\(x\.p\)\]\]; if \(!alt \|\| \(alt\.id && pinnedIds\[alt\.id\] !== undefined\)\) return; if \(alt\.id\) pinnedIds\[alt\.id\] = x\.p\.name \|\| ''; sg = \{ lat: alt\.lat, lng: alt\.lng, openId: alt\.id \|\| null, source: 'overture', cat: alt\.cat \|\| '', known: false \};/.test(src) && /function tkIsTwin\(p, sg, open, byName\)\{ if \(byName && tkIsTwinByName\(p, sg, byName\)\) return true;/.test(src) && /function tkPinnedByName\(\)\{/.test(src) && /const listEl = document\.getElementById\('tkConfirmList'\), footEl = document\.getElementById\('tkConfirmFoot'\); if \(withMap === false && listEl && footEl\)\{ listEl\.innerHTML = listHtml; footEl\.innerHTML = footHtml; return; \}/.test(src) && /function tkPinGeo\(p, sg\)\{ const fl = tkFileLocOf\(p\); const src = tkFileLocSrc\(p\); if \(fl && src === 'point' && typeof sg\.lat === 'number' && plKm\(fl, sg\) \* 1000 <= TK_LIKELY_M\) return \{ lat: \+\(\+fl\.lat\)\.toFixed\(5\), lng: \+\(\+fl\.lng\)\.toFixed\(5\), source: sg\.source === 'user_pin' \? 'user_pin' : 'overture', pos: 'file' \}; return \{ lat: \+\(\+sg\.lat\)\.toFixed\(5\), lng: \+\(\+sg\.lng\)\.toFixed\(5\), source: sg\.source === 'user_pin' \? 'user_pin' : 'overture' \}; \}/.test(src) && /if \(rowTier === 'file'\)\{ nFile\+\+; x\.p\.geo = \{ lat: \+\(\+sg\.lat\)\.toFixed\(5\), lng: \+\(\+sg\.lng\)\.toFixed\(5\), source: 'user_paste', via: 'file' \}; delete x\.p\.openId;/.test(src) && /rec: \{ lat: \+\(\+sg\.lat\)\.toFixed\(5\), lng: \+\(\+sg\.lng\)\.toFixed\(5\), source: 'overture', openId: String\(sg\.openId\)\.slice\(0, 80\)/.test(src) && !/tkIdentityKeyGid[^\n]*source: 'file'/.test(src), T + 'Confirm all: identity from our map (openId) · position from your file only when a precise point agrees within 500 m (pos file) · file-spot pins carry source user_paste via file (the rules accept it for every user) and never enter the shared identity · identity records carry Overture coordinates only (ق١٠-٢٣-٠٢ r86-5 · r86-8)');
  check(/const chip = function\(on, label, hint, arrow\)\{/.test(src) && /function tkPinPanelOpen\(\)\{/.test(src) && /function tkPinPanelToggle\(\)\{/.test(src) && /id="plPinPanelBody"/.test(src) && /onclick="tkTierOpen\(\\'all\\'\)">✓ Suggested pins ' \+ allN \+ ' <span class="arr">›<\/span><\/button>'\);/.test(src) && /onclick="tkTierOpen\(/.test(src) && /onclick="tkTierOpen\(\\'pick\\'\)">≈ Look-alikes ' \+ pickN \+ ' <span class="arr">›<\/span><\/button>'\);/.test(src) && /function tkMapPanelHtml\(\)\{/.test(src) && /async function tkPinSuggested\(key, i\)\{/.test(src) && /function tkSkipRow\(p\)\{ return !p \|\| \(p\.geo && typeof p\.geo\.lat === 'number'\) \|\| p\.hold === 'guidelines' \|\| !!p\.dup; \}/.test(src) && /async function tkConfirmRemove\(key\)\{/.test(src) && /async function tkUnpinnedRemove\(key\)\{/.test(src) && !/tkConfirmToggle|tkUnpinnedToggle|tkUnpinnedSkip/.test(src) && /if \(liveCountOf\(cats\) !== before - removed\.length\)\{ tkRemovedRollback\(removed\); showToast\('Count mismatch — nothing saved'\); return; \}/.test(src) && /if \(liveCountOf\(cats\) !== before\)\{ showToast\('Count mismatch — nothing saved'\); return; \}/.test(src) && /async function tkAreaRefresh\(p\)\{/.test(src) && /function tkAfterPinBatch\(keys, moves\)\{/.test(src) && /async function tkAreasReread\(\)\{/.test(src) && /function tkRemovedCommit\(items, city\)\{[^\n]*tkRemember\(items\.map/.test(src) && /async function tkRestoreRemoved\(\)\{/.test(src) && /function tkPinOnMap\(key\)[^\n]*plPinMoveStart\(loc\.catId, loc\.index\);/.test(src) && /hz\.map\.getZoom\(\) < PL_PIN_MIN_ZOOM/.test(src56) && !/tkPastePinAt|Paste &amp; pin/.test(src56) && /tkPinFromGoogleOpen\(/.test(src56) && /if \(!sg\.strong && !sg\.likely && !street && \(cell \|\| !fileLoc\)\)\{/.test(src) && /take\(hits\[0\], 'name',/.test(src) && /take\(by\[0\], 'areaName',/.test(src) && /function tkAllList\(\)\{ return tkTierList\('strong'\)\.concat\(tkTierList\('likely'\), tkTierList\('file'\)\); \}/.test(src) && /if \(!fl \|\| tkIsCellRow\(p\)\) return;/.test(src) &&  /list\.slice\(0, 300\)\.forEach\(function\(x, i\)\{ const key = plSugKey\(x\.p\); if \(pickT && !\(key in tkPickChoice\)\) return;/.test(src) && /return !tkConfirmSkip\[key\] && \(!tkIsPickTier\(tier\) \|\| \(key in tkPickChoice\)\); \}\); if \(!list\.length\) return;/.test(src) && /tkUndoLast = \{ city: __c, items: undo/.test(src) && /Nothing is pinned until you confirm\./.test(src), T + 'three chips in Map (Suggested pins · Look-alikes · Not pinned yet — r87-2), each an explicit review screen (every row numbered on the map · 🗑 removes the row at once in its own single save, remembered, with Restore in the Pins panel — r87-4) with an Undo record; after a batch the category sheet asks for the uncategorized; areas are re-read from the pin (tkAreaRefresh · Re-read areas from pins) — no silent pinning; the count guard covers removals; a CSV list-link cell never enters the bulk list; Pick by name pins only rows whose name the user tapped, with that candidate as identity; Pin on map is the one manual move (best guess · zoom guard · user_pin); the only candidate with the name wins regardless of distance for cells and rows without a location, an area word in the name breaks chains (ق١٠-١٩-٠١ البند ٧ · r86-3 v1.1 · r86-6 · r86-7 · r86-8 v1.1 · r86-11)');
  check(/async function tkRemoveBanned\(\)[^\n]*const ok = await mpConfirm\([^\n]*if \(!ok\) return;/.test(src) && (run.match(/\.splice\(/g) || []).length === (run.match(/\.places\.push\(/g) || []).length, T + 'removal of guideline-breaking places goes through a confirmation sheet; in tkSortRun every splice is a move (paired with a push) — nothing is deleted');
  check(/const TK_CAT_BANNED = \/[^\n]*(bar|nightlife_venue|dance_club|casino|hookah_bar|adult_entertainment_venue)[^\n]*\//.test(src) && /if \(!c \|\| tkCatBanned\(c\) \|\| \(TK_CAT_BANNED\.test\(c\) && !TK_BAR_NOT_ALCOHOL\.test\(c\)\) \|\| TK_CAT_BOX\.test\(c\)\) return null;/.test(src) /* r120 (المراجعة ٣٦ ٥): المحظور قديمًا كله بلا تصنيف عندنا — حُجب أو نُبّه عنه */, T + 'banned categories (content guidelines §1) and box-only categories never map to a category of ours');
  check((src.match(/liveCountOf\(cats\)/g) || []).length >= 4 && /rep\.err = 'count mismatch — nothing saved'/.test(src), T + 'count guard before every save in the sort part (sort · confirm all · remove)');
}

// ---------- §33 (r98 · ق١١-٠٢-٠١ — «هل تختبر كل زر؟»): كل معالج واجهة في src/ (onclick · onchange · oninput) له محطة في الرحلة — الحارس يعدّ ويقارن؛ زر جديد بلا محطة يُحمرّ
function handlerCoverageGuard(){
  const T = '§33 every handler has a station (r98): ';
  /* معالجات سبقت r110 يُبنى نصُّها ديناميًّا ولا محطة تسمّيها (قد تُضغط في محطة بزرّها المرسوم — لم يُقَس) — تُشطب كلٌّ عند محطتها؛ لا يُضاف إليها */
  const HANDLERS_PENDING = new Set([]); /* r117-ج (ق١١-١١-١٥): الثمانية الباقية نالت محطاتها بنصوصها المرسومة (tests/r117b.page.js) — القائمة فارغة: كل معالج له محطة باسمه، واسم جديد بلا محطة يُحمرّ */
  /* دوال تظهر بصيغة نصّ معالج وليست معالج واجهة (رسالة داخل نص) */
  const NOT_HANDLERS = new Set(['showToast']);
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts; const names = new Set();
  const SKIP = new Set(['document', 'event', 'this']); /* تعبيرات مضمَّنة لا دوال: event.stopPropagation() · this.classList … */
  let all = ''; parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); all += src + '\n'; const re = /on(?:click|change|input)=\\?"([A-Za-z_$][\w$]*)/g; let m; while ((m = re.exec(src))){ if (!SKIP.has(m[1])) names.add(m[1]); } });
  /* r110-ب (قياس ١١ نوفمبر): المعالج الذي يُبنى نصُّه ديناميًّا (onclick="' + fn + '") كان خارج نظر هذا الحارس — ٧٠ معالجًا. يُقرأ الآن أيضًا: (١) نصّ معالج كامل يُمرَّر لقطعة راسمة ("name('" · 'name()') لدالة معرَّفة في src/ ·
     (٢) اسم مجرَّد يُمرَّر للقطع الراسمة المسمّاة. ما سبق r110 بلا محطة باسمه مُدرج في HANDLERS_PENDING — قائمة لا تكبر: اسم جديد يُحمرّ، واسم نال محطته يجب أن يُشطب. */
  const defined = new Set(); { const reF = /(?:^|[\n;}\s])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; while ((m = reF.exec(all))) defined.add(m[1]); }
  /* r110 (المراجعة المستقلة ب): كان يُقرأ أول اسم في onclick/onchange/oninput وحدها — فخرج من النظر كل معالج ثانٍ في النص («x = v; curRerender()») وكل حدث آخر (onpaste · onkeydown · ontouch…). يُقرأ الآن كل حدث مضمَّن وكل نداء لدالة معرَّفة داخل نص المعالج (لا داخل ما يُضمّ إليه وقت الرسم). */
  { const reA = /\bon[a-z]+=(\\?)"/g; let m; while ((m = reA.exec(all))){ const esc = m[1] === '\\'; const j = reA.lastIndex; let end; if (esc) end = all.indexOf('\\"', j); else { end = j; while (end < all.length && all[end] !== '"' && all[end] !== '\n') end++; } if (end < 0) continue; const body = all.slice(j, Math.min(end, j + 900)).replace(/\$\{[^}]*\}/g, ''); body.split(esc ? /(?<!\\)"/ : /(?<!\\)'/).forEach(function(seg, k){ if (k % 2) return; const re = /([A-Za-z_$][\w$]*)\s*\(/g; let x; while ((x = re.exec(seg))){ if (seg[x.index - 1] === '.') continue; if (defined.has(x[1]) && !SKIP.has(x[1]) && !NOT_HANDLERS.has(x[1])) names.add(x[1]); } }); } }
  const literal = names.size; { const reC = /(["'])([A-Za-z_$][\w$]*)\((?:\)\1|')/g; let m; while ((m = reC.exec(all))){ if (defined.has(m[2]) && !SKIP.has(m[2]) && !NOT_HANDLERS.has(m[2])) names.add(m[2]); } }
  { const reB = /(?:tripLegMinInput|tripOrdHtml)\([^;\n]{0,200}?,\s*'([A-Za-z_$][\w$]*)'\s*\)/g; let m; while ((m = reB.exec(all))){ if (defined.has(m[1])) names.add(m[1]); } }
  const journey = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tests', 'plan-matrix.js'), 'utf8');
  const has = function(n){ return new RegExp('\\b' + n.replace(/\$/g, '\\$') + '\\b').test(journey); };
  const missing = [...names].filter(function(n){ return !has(n) && !HANDLERS_PENDING.has(n); });
  const stale = [...HANDLERS_PENDING].filter(function(n){ return has(n) || !names.has(n); });
  check(literal >= 350, T + 'handler inventory read from src/ — every inline event and every call inside a handler (' + literal + ' literal · ' + names.size + ' with handlers passed to shared renderers)');
  check(['sheetTouch', 'sheetKey', 'curRerender', 'curRerenderPage', 'tbStopOnPaste'].every(function(n){ return names.has(n); }), T + 'second calls and non-click events are read (ontouch · onkeydown · onpaste · “x = v; fn()”)');
  check(names.size >= literal + 45, T + 'handlers built through shared renderers are read too (r110 — ' + (names.size - literal) + ')');
  check(missing.length === 0, T + 'every handler is referenced by a station (' + (names.size - missing.length - HANDLERS_PENDING.size) + '/' + names.size + ' · ' + HANDLERS_PENDING.size + ' pending by name)', 'no station: ' + missing.join(' · '));
  check(stale.length === 0, T + 'the pending list only shrinks — a handler that got its station (or is gone) leaves it', 'remove from HANDLERS_PENDING: ' + stale.join(' · '));
}


// ---------- §34 (r98 · ق١١-٠٢-٠١ — الكنس يُستهلك بالاختبار): لا وسم Soon إلا بمرحلة مسمّاة في القائمة المعتمدة — وسم جديد أو متقادم يُحمرّ
function soonGuard(){
  const T = '§34 every Soon names its phase (r98): ';
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts; let all = '';
  parts.forEach(function(p){ all += fs.readFileSync(path.join(ROOT, 'src', p), 'utf8') + '\n'; });
  const hits = []; const re = /[^\n]{0,80}(soon-tag|class="soon"|soonChip\(|showSoon\()[^\n]{0,80}/g; let m; while ((m = re.exec(all))){ hits.push(m[0]); }
  const unknown = hits.filter(function(h){ return !KNOWN_SOON.some(function(k){ return k.re.test(h); }) && !/function soonChip|function showSoon|class="' \+ \(cls \|\| 'chip'\) \+ ' soon"|\.soon-tag\{|\.soon\{|soon-tag\b[^<]*\{|'<span class="soon-tag">' \+ escapeHtml\(step\)/.test(h); });
  check(hits.length > 0, T + 'Soon markers read from src/ (' + hits.length + ' lines)');
  check(unknown.length === 0, T + 'every Soon marker is on the approved list with its phase (' + KNOWN_SOON.length + ' approved)', 'unlisted: ' + unknown.map(function(h){ return h.trim().slice(0, 90); }).join(' ‖ '));
}

// ---------- §36 (r107 · ق١١-١٠-٠٢ — «المشكلة عيّنة لصنف»): مصفوفة الخطة سقّاطة — كل دالة تحفظ خطة رحلة لها صف في tests/plan-matrix.js (أو سبب مكتوب أنها لا تمسّ الخطة) ·
//            كل صف يحكم في السياقات الأربعة أو يسبّب · كل من يعيد رسم الأيام يمرّ بالناقل الواحد · الحارس قبل الكتابة في saveTrip · الرحلة تشغّل المصفوفة ----------
// ---------- §44 (r120 · المراجعة المستقلة ٣٧ — «المشكلة عيّنة لصنف»): الأجزاء تُبنى ملفًّا واحدًا، فدالتان عامّتان باسم واحد = الأخيرة تغلب بصمت.
// عيّنتاه: tkPlanStrip (٤-ب) عطّلت Resume في الاستيراد · tkNorm (٤-أ) أفقدت تطبيع الاستيراد نزع اسم المدينة — والتدقيق والرحلة لم يرياهما.
function dupFnGuard(){
  const T = '§44 one name, one function (r120): '; const KNOWN = {}; /* plPlaceKey كانت هنا (قائمة قبل r120) — حُذفت نسختها المغلوبة بالقرار ق١١-٢٤-١٨ */
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts.filter(function(p){ return /\.js$/.test(p); });
  const seen = {}; parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; while ((m = re.exec(src))) (seen[m[1]] = seen[m[1]] || []).push(p); });
  const dup = Object.keys(seen).filter(function(n){ return seen[n].length > 1; });
  const bad = dup.filter(function(n){ return !KNOWN[n]; });
  check(Object.keys(seen).length > 1500 && bad.length === 0, T + 'no top-level function is declared twice across the build parts (' + Object.keys(seen).length + ' names · ' + dup.length + ' known)', bad.map(function(n){ return n + ' @ ' + seen[n].join(' + '); }).join(' · '));
  const stale = Object.keys(KNOWN).filter(function(n){ return dup.indexOf(n) < 0; });
  check(stale.length === 0, T + 'the known list only shrinks', stale.join(' · '));
}
function planMatrixGuard(){
  const T = '§36 plan matrix is a ratchet (r107): ';
  const pmPath = path.join(__dirname, 'plan-matrix.js'); if (!fs.existsSync(pmPath)){ check(false, T + 'tests/plan-matrix.js exists'); return; }
  let PM; try{ PM = require(pmPath); }catch(e){ check(false, T + 'tests/plan-matrix.js loads', String(e && e.message)); return; }
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts.filter(function(p){ return /\.js$/.test(p); });
  const fns = {}; parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; const idx = []; while ((m = re.exec(src))) idx.push([m.index, m[1]]); idx.forEach(function(it, i){ fns[it[1]] = { file: p, body: src.slice(it[0], i + 1 < idx.length ? idx[i + 1][0] : src.length).replace(/^[^{]*\{/, '') }; }); });
  const savers = Object.keys(fns).filter(function(n){ return /\b(saveTrip|tbTouch|tbSaveNow|tripViewSave)\s*\(/.test(fns[n].body); }); /* r108: tbTouch = «الجلسة تغيّرت» — ما يغيّره يُكتب عند زر الحفظ، فهو من الأفعال التي تغيّر الخطة المحفوظة */
  const covers = new Set(); PM.OPS.forEach(function(o){ (o.covers || []).forEach(function(c){ covers.add(c); }); }); const notPlan = PM.NOT_PLAN || {};
  const ids = PM.OPS.map(function(o){ return o.id; });
  check(PM.OPS.length >= 50 && new Set(ids).size === ids.length, T + 'ops are defined with unique ids (' + PM.OPS.length + ')');
  const badCtx = []; PM.OPS.forEach(function(o){ PM.CTX.forEach(function(k){ const c = (o.ctx || {})[k]; if (typeof c === 'string'){ if (c.trim().length < 6) badCtx.push(o.id + '×' + k); } else if (!c || !(typeof c.d === 'number' || c.d === 'replace') || typeof c.shape !== 'string') badCtx.push(o.id + '×' + k); }); });
  check(PM.CTX.length === 4 && badCtx.length === 0, T + 'every op states a verdict or a reason in each of the four plan shapes (' + (PM.OPS.length * PM.CTX.length) + ' cells)', badCtx.slice(0, 6).join(', '));
  const missing = savers.filter(function(n){ return !covers.has(n) && !(n in notPlan); });
  check(savers.length >= 50, T + 'functions that save a trip are read from src/ (' + savers.length + ')');
  check(missing.length === 0, T + 'every function that saves a trip has a matrix row or a written reason (' + (savers.length - missing.length) + '/' + savers.length + ')', 'no row: ' + missing.map(function(n){ return n + ' @ ' + fns[n].file; }).join(' · '));
  const stale = [...covers].filter(function(n){ return !fns[n]; }).concat(Object.keys(notPlan).filter(function(n){ return !fns[n]; }));
  check(stale.length === 0, T + 'no row names a function that is gone', stale.join(' · '));
  check(Object.keys(notPlan).every(function(n){ return String(notPlan[n]).trim().length >= 6; }), T + 'every exemption carries its reason');
  const REDRAW_OK = { tripAddContinue: 'يُلحق أيام مدينة جديدة بآخر الخطة — لا يمسّ يومًا قائمًا' };
  const redraw = Object.keys(fns).filter(function(n){ return /\btripPlanDays\s*\(/.test(fns[n].body); }); const loose = redraw.filter(function(n){ return !/\b(tripDayCarry|tripLinearPlace)\s*\(/.test(fns[n].body) && !REDRAW_OK[n]; });
  check(redraw.length >= 3 && loose.length === 0, T + 'whoever redraws the days carries each day in its shape — tripDayCarry / tripLinearPlace (' + redraw.length + ' sites)', loose.join(' · '));
  const st = fns.saveTrip ? fns.saveTrip.body : ''; const gi = st.indexOf('tripGuardCheck('), wi = st.indexOf('mpData.trips.save(');
  check(gi >= 0 && wi > gi && /tripGuardRestore\(trip, __g\); return 'guard';/.test(st) && /tripGuardSettle\(trip\.id, __gen, __was, __now, /.test(st) && /!\(now\.count\[id\] > 0\)/.test(fns.tripGuardSettle ? fns.tripGuardSettle.body : ''), T + 'saveTrip asks the plan guard before the write, tells its caller when it objects, and settles a declaration only when the write that carried it has landed');
  check(!!fns.tripInsert && /mode === 'daytrip'\)\{ tripLinearPush\(/.test(fns.tripInsert.body) && !!fns.tripSuggestSlot && /if \(d\.mode === 'daytrip'\) return;/.test(fns.tripSuggestSlot.body) && !!fns.tripPlanNormalize && /healed \+= tripLinearPush\(/.test(fns.tripPlanNormalize.body), T + 'the engine knows both day shapes at insert, at suggest and at load (self-heal)');
  check(!!fns.dpAddToTripRun && /tripDayFreshIds\(srcDay, srcRoute\)/.test(fns.dpAddToTripRun.body) && !!fns.tripNormalize && /tripIdsHeal\(t\)/.test(fns.tripNormalize.body) && /tripIdsHeal\(trip\)/.test(st) && /\(b\.count\[id\] \|\| 0\) < a\.count\[id\]/.test(fns.tripGuardCheck ? fns.tripGuardCheck.body : ''), T + 'a copied day gets its own entry ids, duplicate ids are healed at load and before the write, and the guard counts copies');
  const journey = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8');
  check(/require\(path\.join\(__dirname, 'plan-matrix\.js'\)\)/.test(journey) && /await planMatrixRun\(uid, /.test(journey) && /reds\.length === 0/.test(journey), T + 'the journey runs the matrix and fails on a red cell');
}

// ---------- §37 (r107-ب/ج · ق١١-١٠-٠٢ — عيّنة نيويورك/كلينتون): اسم المعجم لا يُطابَق إلا بالمحلِّل الواحد · الدبوس الملصوق لا يُحفظ بعيدًا بلا سؤال · باني المعجم يجتاز عيّنته ----------
function namesGuard(){
  const T = '§37 one name resolver, asked far pins, checked gazetteer build (r107): ';
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts.filter(function(p){ return /\.js$/.test(p); });
  const fns = {}; parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; const idx = []; while ((m = re.exec(src))) idx.push([m.index, m[1]]); idx.forEach(function(it, i){ fns[it[1]] = { file: p, body: src.slice(it[0], i + 1 < idx.length ? idx[i + 1][0] : src.length) }; }); });
  const ALIAS_OK = { gazNameRank: 'المحلِّل نفسه', gazCityRow: 'صف المدينة المفتوحة للمحلِّل', gazCityOptions: 'نص البحث في منتقي المدن — المستخدم يختار الصف بعينه', tkPickCity: 'ترجيح بين مرشَّحين متجاورين جغرافيًّا في الاستيراد (كلمة كاملة في اسم المكان) — لا يختار صفًّا بالاسم وحده' };
  const raw = Object.keys(fns).filter(function(n){ return /\.a \|\| \[\]|\(row\.a\b|\(c\.a\b|\.row\.a\)/.test(fns[n].body); }); const loose = raw.filter(function(n){ return !ALIAS_OK[n]; });
  check(raw.indexOf('gazNameRank') >= 0 && loose.length === 0, T + 'no function reads gazetteer side-names except the resolver and the listed geo-bounded ones (' + raw.length + ' sites)', loose.map(function(n){ return n + ' @ ' + fns[n].file; }).join(' · '));
  const users = ['tkTownRef', 'plTownDetect', 'tbStopTownPick', 'tkAreaIsTown', 'gazFindCity'].filter(function(n){ return fns[n] && /\b(gazResolve|gazNameRank)\(/.test(fns[n].body); });
  check(users.length === 5, T + 'the five name matchers go through gazResolve / gazNameRank (' + users.length + '/5)');
  const gr = fns.gazResolve ? fns.gazResolve.body : ''; check(/rank === 1 && near && km > GAZ_ALIAS_KM\) far\.push\(it\)/.test(gr) && /tier\(x\) === top/.test(gr), T + 'a far side-name is set aside (never the silent pick) and the name tier outranks distance');
  const asked = ['savePlPlaceRun', 'tkPinFromGoogleApply'].filter(function(n){ return fns[n] && /await plFarAsk\(/.test(fns[n].body); });
  check(asked.length === 2 && !!fns.plFarAsk && /return v === 'alt' \? 'outside' : 'stop';/.test(fns.plFarAsk.body), T + 'a pasted pin far from its city is asked about before it is written (' + asked.length + '/2 writers)');
  const tp = fns.tkPlusPoint ? fns.tkPlusPoint.body : ''; check(/ref\.soft/.test(tp) && /tkTownRef\(r\.locality, \{ ask: true, ctx: soft \}\)/.test(tp), T + 'the town pasted with a short code outranks a default reference and may be asked about');
  const gb = path.join(ROOT, 'scripts', 'gazetteer-build.py'); const gsrc = fs.existsSync(gb) ? fs.readFileSync(gb, 'utf8') : '';
  check(/SANITY FAILED/.test(gsrc) && /HARD_ANCHORS = \[\('US', 5128581, 'New York'\)\]/.test(gsrc) && /def selftest\(\)/.test(gsrc) && /raise SystemExit\(1\)/.test(gsrc) && gsrc.indexOf("if problems:") < gsrc.indexOf("os.makedirs(cdir, exist_ok=True)"), T + 'the gazetteer builder checks before it writes (anchors · nothing lost · no side-name equal to a bigger city)');
  let st = null; try{ st = require('child_process').spawnSync('python3', [gb, '--selftest'], { encoding: 'utf8', timeout: 60000 }); }catch(_){ st = null; }
  if (!st || st.error) console.log('INFO  ' + T + 'python3 not available here — builder self-test not run');
  else check(st.status === 0 && /SELFTEST PASSED — 18\/18/.test(st.stdout || ''), T + 'the gazetteer builder passes its own sample (18/18)', String(st.stdout || st.stderr || '').split('\n').filter(function(l){ return /^FAIL/.test(l); }).join(' · '));
}

// ---------- §37b (r118 · ق١١-١٢-٠٩): قرص الرسالة يلتفّ إلى سطرين — ولا نصّ ثابت أطول مما يسعه السطران على ٣٩٠ ----------
// القرص كان سطرًا واحدًا يُقطع بثلاث نقاط (نحو ٢٤ نصًّا قائمًا كانت تضيع نهايته). السطران يسعان نحو ٩٨ حرفًا (مقيس بالمتصفح: أطول نص قائم ٩٧ حرفًا في سطرين بلا قطع).
function toastGuard(){
  const T = '§37b the toast wraps to two lines (r118): ';
  const cssT = fs.readFileSync(path.join(ROOT, 'src', '10-structure.css'), 'utf8'); const rule = (/\n\.toast\{[^}]*\}/.exec(cssT) || [''])[0];
  check(/white-space:normal/.test(rule) && !/white-space:nowrap/.test(rule) && /width:max-content/.test(rule) && /max-width:88vw/.test(rule) && /max-height:calc\(2\.8em \+ 18px\)/.test(rule), T + 'the rule wraps, is as wide as its text up to 88vw, and is two lines high at most');
  const cfgT = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')); const longT = [];
  cfgT.parts.filter(function(p){ return /\.js$/.test(p); }).forEach(function(p){ const t = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); const re = /(?:showToast|showUndoToast|mpErrToast)\('((?:[^'\\]|\\.)*)'/g; let m; while ((m = re.exec(t))){ const lit = m[1].replace(/\\'/g, "'"); if (lit.length > 98) longT.push(p + ': ' + lit.length + ' · ' + lit.slice(0, 50)); } });
  check(longT.length === 0, T + 'no fixed toast text is longer than two lines hold (98 characters) — a longer one loses its end', longT.slice(0, 4).join(' | '));
}

// ---------- §37d (المحور ١ · ق١١-١٣-٠٥ · البند ٧): الفحوص النصّية لا تزيد ----------
// فحص «نصّي خالص» = ok(...) شرطه كله tplCount(…).ok — يثبّت أن سطرًا في المصدر مكتوب كما كُتب، لا أن التطبيق يفعل ما يُفترض؛ يخضرّ والسلوك مكسور، ويحمرّ عند إعادة صياغة سليمة.
// الحارس سقف يُنزَّل ولا يُرفع: فحص جديد يُكتب بالسلوك. رفع أيٍّ من الرقمين قرار يُكتب سببه هنا (ما الذي تعذّر امتحانه بالسلوك).
/* الرقمان داخل pinGuard (ثابت بمستوى الملف بعد نداء finish() لا يُهيَّأ — فخّ §37b نفسه) */
function okCallsOf(src){ /* يستخرج نداءات ok(label, cond, …) بماسح يعرف النصوص والتعليقات والتعابير النمطية والأقواس */
  const out = []; const n = src.length;
  const reStart = function(S, k){ let j = k - 1; while (j >= 0 && /\s/.test(S[j])) j--; return j < 0 || /[(,=:\[!&|?{};+\-*%<>~^]/.test(S[j]); };
  const skipStr = function(S, q, k){ k++; while (k < S.length){ const c = S[k]; if (c === '\\'){ k += 2; continue; } if (c === q) return k + 1; k++; } return S.length; };
  const skipRe = function(S, k){ k++; let cls = false; while (k < S.length){ const c = S[k]; if (c === '\\'){ k += 2; continue; } if (c === '\n') return k; if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) return k + 1; k++; } return S.length; };
  const walk = function(S, k, onComma){ /* S[k] فاتح؛ يعيد موضع ما بعد غالقه */ let d = 0; while (k < S.length){ const c = S[k];
      if (c === "'" || c === '"' || c === '`'){ k = skipStr(S, c, k); continue; }
      if (c === '/' && S[k + 1] === '*'){ const e = S.indexOf('*/', k + 2); k = e < 0 ? S.length : e + 2; continue; }
      if (c === '/' && S[k + 1] === '/'){ const e = S.indexOf('\n', k); k = e < 0 ? S.length : e; continue; }
      if (c === '/' && reStart(S, k)){ k = skipRe(S, k); continue; }
      if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}'){ d--; if (d === 0) return k + 1; } else if (c === ',' && d === 1 && onComma) onComma(k);
      k++; } return S.length; };
  const re = /(^|[^A-Za-z0-9_$.])ok\(/g; let m;
  while ((m = re.exec(src))){ const start = m.index + m[0].length - 1; const cuts = [start]; const end = walk(src, start, function(k){ cuts.push(k); }); cuts.push(end - 1);
    if (cuts.length >= 3) out.push({ line: src.slice(0, m.index).split('\n').length, label: src.slice(cuts[0] + 1, cuts[1]).trim().slice(0, 80), cond: src.slice(cuts[1] + 1, cuts[2]) }); re.lastIndex = end; }
  return out; }
function pinGuard(){
  const PIN_PURE_MAX = 44;   /* فحوص نصّية خالصة (قيس ١٣ نوفمبر ٢٠٢٦) */
  const PIN_CALLS_MAX = 1127; /* نداءات tplCount كلها (قيس ١٣ نوفمبر ٢٠٢٦: ١١٢٩، ثم رُفع تثبيتان من محطة r119 صارا ممتحنَين بالسلوك — ومنها اثنان في محطة الدخول الحقيقي: ربط المعالج المسمّى عند Firebase، لا يُمتحن بالسلوك في المحاكي لأن الإقلاع لا يجري فيه) */
  const T = '§37d source-pin checks may only go down (axis 1): ';
  const j = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8'); const calls = okCallsOf(j);
  const pure = calls.filter(function(c){ let t = c.cond.replace(/\/\*[\s\S]*?\*\//g, ''); if (!/tplCount\(/.test(t)) return false; t = t.replace(/tplCount\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"))*\s*,\s*\d+\s*\)\.ok/g, ''); return t.replace(/&&|[()\s!]/g, '') === ''; });
  const all = (j.match(/tplCount\(/g) || []).length - 1 /* تعريف الدالة نفسه */;
  check(calls.length > 900, T + 'the scanner still finds the journey checks (' + calls.length + ')');
  check(pure.length <= PIN_PURE_MAX, T + 'checks whose whole condition is tplCount(…) — ' + pure.length + ' of ' + PIN_PURE_MAX + ' allowed. A new check proves behaviour, not the spelling of a source line', pure.slice(-3).map(function(p){ return 'line ' + p.line + ' ' + p.label; }).join(' | '));
  check(all <= PIN_CALLS_MAX, T + 'tplCount calls — ' + all + ' of ' + PIN_CALLS_MAX + ' allowed', '');
  const PIN_OTHER_MAX = 54; /* المراجعة المستقلة (١٢): التثبيت بغير tplCount — tpl([…]) (٣١) وقراءة SRC مباشرة (٢٣) — يُعدّ ويُسقَّف مثله */
  const other = (j.match(/\btpl\(\[/g) || []).length + (j.match(/\bSRC\./g) || []).length;
  check(other <= PIN_OTHER_MAX, T + 'other reads of the source text (tpl([…]) · SRC.…) — ' + other + ' of ' + PIN_OTHER_MAX + ' allowed', '');
  if (pure.length < PIN_PURE_MAX || all < PIN_CALLS_MAX || other < PIN_OTHER_MAX) console.log('INFO  ' + T + 'lower the ceilings to ' + pure.length + ' / ' + all + ' / ' + other + ' (tests/audit.js PIN_PURE_MAX · PIN_CALLS_MAX · PIN_OTHER_MAX)');
}

// ---------- §37e (المحور ١ · البند ٣): كل محطة قيست وحدها، والتابعات لا تزيد ----------
// tests/solo-status.json يكتبه tests/tools/solo.js (كل محطة بعد محطتَي الأساس وحدها). محطة جديدة تُقاس قبل أن تدخل (node tests/tools/solo.js --new) وتدخل مستقلة.
function soloGuard(){
  const SOLO_DEP_MAX = 68; /* محطات تابعة (قيس ١٣ نوفمبر ٢٠٢٦) — ينزل مع إصلاحها على مراحل */
  const T = '§37e every station is measured on its own, dependent stations may only go down (axis 1): ';
  let st = null; try{ st = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'solo-status.json'), 'utf8')); }catch(_){}
  check(!!st && Array.isArray(st.measured) && Array.isArray(st.dependent), T + 'tests/solo-status.json exists (written by tests/tools/solo.js)');
  if (!st || !Array.isArray(st.measured)) return;
  const names = []; let lines = 0, parsed = 0; fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8').split('\n').forEach(function(l){ if (/^\s*await must\(/.test(l)) lines++; const m = l.match(/^  await must\('((?:[^'\\]|\\.)*)'/) || l.match(/^  await must\("((?:[^"\\]|\\.)*)"/); if (m){ parsed++; if (m[1].indexOf('١ · ') !== 0 && m[1].indexOf('٢ · ') !== 0) names.push(m[1]); } });
  check(lines === parsed && parsed > 190, T + 'every `await must(` line in tests/journey.js is a station the tools can name (' + parsed + ' of ' + lines + ') — six double-quoted stations were invisible to them (independent review)');
  const tools = ['solo.js', 'subset.js'].filter(function(f){ return fs.readFileSync(path.join(ROOT, 'tests', 'tools', f), 'utf8').indexOf('await must\\("') < 0; });
  check(tools.length === 0, T + 'solo.js and subset.js name a station written with either quote', tools.join(', '));
  const meas = {}; st.measured.forEach(function(x){ meas[x] = 1; }); const missing = names.filter(function(x){ return !meas[x]; });
  check(missing.length === 0, T + 'every station in tests/journey.js was run alone (' + names.length + ') — a new or renamed station: node tests/tools/solo.js --new', missing.slice(0, 3).map(function(x){ return x.slice(0, 60); }).join(' | '));
  const live = {}; names.forEach(function(x){ live[x] = 1; }); const dep = st.dependent.filter(function(x){ return live[x]; });
  check(dep.length <= SOLO_DEP_MAX, T + 'dependent stations — ' + dep.length + ' of ' + SOLO_DEP_MAX + ' allowed. A new station stands alone', dep.slice(0, 2).map(function(x){ return x.slice(0, 60); }).join(' | '));
  if (dep.length < SOLO_DEP_MAX) console.log('INFO  ' + T + 'lower the ceiling to ' + dep.length + ' (tests/audit.js SOLO_DEP_MAX)');
  const mut = fs.readFileSync(path.join(ROOT, 'tests', 'tools', 'mutate.js'), 'utf8');
  check(/the chosen stations do not pass on clean code when run on their own/.test(mut) && /the audit is red on clean code/.test(mut) && /MUTATE_SKIP_BASE/.test(mut) && mut.indexOf('if (!process.env.MUTATE_SKIP_BASE){') < mut.indexOf('spec.muts.forEach('), T + 'the mutation tool runs the audit and the chosen stations on clean code first and refuses when either is red');
  const sub = fs.readFileSync(path.join(ROOT, 'tests', 'tools', 'subset.js'), 'utf8');
  check(/failures\+\+; console\.log\('FAIL  DRIFT /.test(sub) && /failures\+\+; console\.log\('FAIL  OWNERLEAK /.test(sub), T + 'a partial run (subset · solo · mutate) fails on identity drift and on an owner flag left on, as the full journey does');
}

// ---------- §37f (المحور ١ · البندان ٢ و٤): عالم الرحلة لا يكون أرحم من الواقع ----------
// قواعد القراءة على كل مجموعة في firestore.rules وعلى الرحلة كلها (لا علم يطفئها) · ما يرفضه برنامج Firebase يُرفض قبل القواعد · الهوية لا تنجرف.
function worldGuard(){
  const T = '§37f the journey world is not kinder than the real one (axis 1): ';
  const j = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8'); const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  const a = j.indexOf('function readRule(col, id, u, d){'), b = j.indexOf('\nfunction rdeny(', a); const rr = a >= 0 && b > a ? j.slice(a, b) : '';
  const cols = []; const reM = /\n\s*match \/([A-Za-z_]+)\/\{/g; let m; while ((m = reM.exec(rules))) if (m[1] !== 'databases' && cols.indexOf(m[1]) < 0) cols.push(m[1]);
  const lacking = cols.filter(function(c){ return rr.indexOf("case '" + c + "':") < 0; });
  check(cols.length >= 25 && lacking.length === 0, T + 'every collection matched in firestore.rules (' + cols.length + ') has its read rule in the journey world — a new collection brings its read rule with it', lacking.join(', '));
  /* المراجعة المستقلة (١٢): وجود الاسم لا يكفي — مجموعة في صفّ «تُقرأ للجميع» يجب أن تقول قاعدتها ذلك حرفًا، وكذلك صفّ «لكل موقّع» */
  const blockOf = function(c){ const i = rules.search(new RegExp('\\n\\s*match /' + c + '/\\{')); if (i < 0) return ''; const nx = rules.slice(i + 5).search(/\n\s*match \/[A-Za-z_]+\/\{/); return rules.slice(i, nx < 0 ? rules.length : i + 5 + nx); };
  const rowOf = function(ret){ const mm = new RegExp("\\n((?:\\s*case '[A-Za-z_]+':)+) return " + ret + ';').exec(rr); return mm ? (mm[1].match(/'([A-Za-z_]+)'/g) || []).map(function(x){ return x.slice(1, -1); }) : []; };
  const openRow = rowOf('true'), signedRow = rowOf('signed');
  const badOpen = openRow.filter(function(c){ const b0 = blockOf(c); return !(/allow read: if true;/.test(b0) || /allow get: if true;/.test(b0)); });
  const badSigned = signedRow.filter(function(c){ return !/allow read: if isSignedIn\(\);/.test(blockOf(c)); });
  check(openRow.length >= 4 && badOpen.length === 0, T + 'a collection the world lets everyone read says `allow read: if true` (or `allow get: if true`) in firestore.rules', badOpen.join(', '));
  check(signedRow.length >= 2 && badSigned.length === 0, T + 'a collection the world lets every signed-in user read says `allow read: if isSignedIn()` in firestore.rules', badSigned.join(', '));
  const qa = j.indexOf('function queryHook(col, filters, who){'), qb = j.indexOf('\nfunction makeSnap(', qa); const qh = qa >= 0 && qb > qa ? j.slice(qa, qb) : '';
  const qLack = cols.filter(function(c){ return qh.indexOf("case '" + c + "':") < 0; });
  check(qLack.length === 0 && /default: okQ = false;/.test(qh), T + 'every collection has its query rule too, and a query on a collection the world does not know is denied — even for the app owner', qLack.join(', '));
  check(/\n  return false;\n\}\nfunction rdeny\(/.test(j), T + 'a collection the world does not know is denied (no match = deny)');
  check(j.indexOf('__readRules') < 0, T + 'no switch turns the read rules off — they run on the whole journey');
  const gets = (j.match(/readHook\(col, id, who\); return makeSnap\(col, id\);/g) || []).length, qs = (j.match(/queryHook\(col, filters, who\);/g) || []).length, snaps = (j.match(/makeSnap\(/g) || []).length;
  check(gets === 1 && qs === 1 && snaps === 3, T + 'every document read and every query passes the read rules, with the actor taken when the request is sent — and no other path builds a snapshot (' + snaps + ' makeSnap)');
  const sdk = ['    set: (data, opts) => { const op = ', '    update: (data) => { const op = ', '    delete: () => { const op = ', '    set: (ref, data, opts) => { const op = ', '    update: (ref, data) => { const op = ', '    delete: (ref) => { const op = '].filter(function(x){ const i = j.indexOf(x); if (i < 0) return true; const e = j.indexOf('\n', i); const ln = j.slice(i, e < 0 ? i + 200 : e); const k = ln.indexOf('sdkCheck(op);'); const after = Math.min.apply(null, ['ops.push(', 'writeLog.push(', 'rulesHook(', 'return (async'].map(function(t){ const q = ln.indexOf(t); return q < 0 ? 1e9 : q; })); return k < 0 || k > after; }); /* السطر نفسه، وقبل أي أثر (سجل · دفعة · قواعد) — والمفردة ترمي عند النداء لا وعدًا */
  check(/set: \(data, opts\) => \{[^\n]*sdkCheck\(op\); return \(async/.test(j) && j.indexOf('set: async (data, opts)') < 0, T + 'a single write throws what the SDK rejects at the call itself (not as a rejected promise a `.catch` would swallow)');
  check(sdk.length === 0, T + 'every write (single and batched) passes what the Firebase SDK rejects before it reaches the rules', sdk.join(' | '));
  check(/ok\('[^']*بلا انجراف هوية[^']*', Object\.keys\(actorDrift\)\.length === 0 && ownerLeak\.length === 0/.test(j), T + 'the journey ends with a counted check: the app user was the signed-in actor at every read and write, and no station started with the owner flag left on');
}

// ---------- §37h (r120 · ق١١-١٤-٠٢ · ع-٤ · ع-٦): أعداد المدينة الثلاثة لا يكتبها إلا بابها ----------
// عدد الأماكن والمثبَّت و«من الآخرين» لكل مدينة مخزَّنة في مستند المستخدم. كاتب يكتب واحدًا منها بيده يترك الآخرين على قديمهما
// (الانجراف الذي قيس في ع-٤: صفر في الذاكرة وثلاثة على الخادم). الحارس: لا إسناد ولا حذف ولا رقعة لأيّ من الخرائط الثلاث خارج الباب.
function cityCountsGuard(){
  const T = '§37h the three per-city counts are written through their one door (r120): ';
  const FIELDS = ['cityPlaceCounts', 'cityPinCounts', 'cityFromCounts']; const DOOR = '50-ui.js';
  /* المراجعة المستقلة (٤): الحارس الأول كان يطابق أشكال كتابة بعينها (إسناد بمفتاح · حذف · رقعة) فيفوته الاسم المستعار والخريطة الحرفية والزيادة — الآن كل ذكر لأيّ من الحقول الثلاثة خارج الباب معدود بملفه:
     ذكرٌ جديد يُحمرّ حتى يُنظر فيه (قارئ؟ يُرفع الرقم هنا · كاتب؟ يمرّ بالباب). ونداءات الباب معدودة بملفها كذلك: كاتب يُحذف نداؤه يُحمرّ. */
  const MENTIONS = { '53-community-trips.js': 1, '56-frame-places.js': 9, '57-citylist.js': 13, '58-community-curators.js': 3, '64-import.js': 1 };
  const WRITES = { '50-ui.js': 2 /* التعريف + mpCityCountsSave */, '57-citylist.js': 2 /* تعافي التحميل · cmAfter */, '58-community-curators.js': 1 /* «حصيلتي» */, '64-import.js': 2 /* الاستيراد · تراجعه */ };
  const SAVES = { '50-ui.js': 1 /* التعريف */, '54-addresses.js': 1 /* Clear my list */, '56-frame-places.js': 1 /* ورقة المدينة الفارغة */, '57-citylist.js': 3 /* مدينة فرغت · الحفظ · حذف المدينة */ };
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')); const strip = function(t){ return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1'); };
  const off = []; const cmp = function(p, what, got, want){ if (got !== (want || 0)) off.push(p + ': ' + what + ' ' + got + ' ≠ ' + (want || 0)); };
  cfg.parts.filter(function(p){ return /\.js$/.test(p); }).forEach(function(p){ const t = strip(fs.readFileSync(path.join(ROOT, 'src', p), 'utf8')); const c = function(re){ return (t.match(re) || []).length; };
    cmp(p, 'mpCityCountsWrite calls', c(/mpCityCountsWrite\(/g), WRITES[p]); cmp(p, 'mpCityCountsSave calls', c(/mpCityCountsSave\(/g), SAVES[p]);
    if (p === DOOR) return; cmp(p, 'mpCityCountsPut outside the door', c(/mpCityCountsPut\(/g), 0);
    cmp(p, 'mentions of the three fields', FIELDS.reduce(function(a, f){ return a + c(new RegExp(f, 'g')); }, 0), MENTIONS[p]); });
  check(off.length === 0, T + 'outside the door every mention of cityPlaceCounts · cityPinCounts · cityFromCounts is counted per file (readers only), mpCityCountsPut is never called, and each writer\'s door call is counted per file', off.join(' · '));
}
// ---------- §37i (r120 · ق١١-١٤-٠٢ · ع-٣): المشاهدة تُعدّ مرة لكل مصدر في الجلسة ----------
// كل نداء مشاهدة يقف خلف mpViewOnce بنوعه — النصوص الخمسة مثبَّتة بحروفها وعدد النداءات مثبَّت بملفه (المراجعة المستقلة ٤: الحارس الأول كان يكتفي بذكر الباب قريبًا من النداء).
function viewOnceGuard(){
  const T = '§37i a view is counted once per source per session (r120): ';
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')); const strip = function(t){ return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1'); };
  const GATED = [["if (mpViewOnce('list', k)) mpData.lists.bumpView(viewingUserUid, cityId);", '58-community-curators.js'], ["__t.ownerId !== currentUser.uid && mpViewOnce('trip', tripId)) mpData.trips.bumpView(tripId)", '53-community-trips.js'], ["if (mpViewOnce('profile', trip.ownerId)) Promise.resolve(mpData.communityProfiles.bumpView(trip.ownerId))", '53-community-trips.js'], ["const __bv = mpViewOnce('profile', uid) ? await mpData.communityProfiles.bumpView(uid) : false;", '58-community-curators.js'], ["if (!(currentUser && trip.ownerId === currentUser.uid) && mpViewOnce('tripstat', tripId)) mpTrack.statsTrip(tripId, 'view_total');", '53-community-trips.js'], ["if (mpViewOnce('tripstat', tripId)) mpTrack.statsTrip(tripId, 'view_total');", '52-trips.js']];
  const CALLS = { '52-trips.js': [0, 1], '53-community-trips.js': [2, 1], '58-community-curators.js': [2, 0] }; /* [bumpView · view_total] */
  const off = []; const src = {};
  cfg.parts.filter(function(p){ return /\.js$/.test(p); }).forEach(function(p){ const t = strip(fs.readFileSync(path.join(ROOT, 'src', p), 'utf8')); src[p] = t; if (p === '43-mpdata.js' || p === '42-mptrack.js'){ if (p === '43-mpdata.js' && (t.match(/viewCount: inc\(1\)/g) || []).length !== 3) off.push(p + ': viewCount writers ≠ 3 (the three bumpView doors)'); return; }
    const got = [(t.match(/\.bumpView\(/g) || []).length, (t.match(/statsTrip\([^)]*'view_total'\)/g) || []).length]; const want = CALLS[p] || [0, 0]; if (got[0] !== want[0] || got[1] !== want[1]) off.push(p + ': view calls ' + got.join('/') + ' ≠ ' + want.join('/'));
    if (/viewCount: inc\(/.test(t) || /viewCount:\s*firebase/.test(t)) off.push(p + ': writes viewCount outside the data door'); });
  GATED.forEach(function(g){ if ((src[g[1]] || '').split(g[0]).length - 1 !== 1) off.push(g[1] + ': gated call text missing or repeated — ' + g[0].slice(0, 50)); });
  check(off.length === 0, T + 'the six view writes (list · trip · the trip\'s second counter ×2 · profile ×2) each stand behind mpViewOnce of their own kind — exact text and per-file counts', off.join(' · '));
}
// ---------- §37g (r120 · ق١١-١٤-٠١): لا كتابة من حساب لم يُحمَّل، ولا قراءة تُكتب في جلسة غير صاحبها ----------
// الصنف: التطبيق يتصرّف والحساب لم يُحمَّل بعد (ثلاثة عيوب مقيسة بمحطة «الدخول الحقيقي»). الحارس يحمي الأشقّاء الذين لم يُكتبوا بعد.
function accountReadyGuard(){
  const T = '§37g nothing is written from an account that has not loaded, and no read lands in another user\'s session (r120): ';
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')); const open = [], stale = [], fails = []; const fns = {};
  const strip = function(t){ return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1'); }; /* التعليقات خارج الحكم: «mpAccountGate()» في تعليق ليس حارسًا (المراجعة المستقلة ٨) */
  cfg.parts.filter(function(p){ return /\.js$/.test(p); }).forEach(function(p){ const t = strip(fs.readFileSync(path.join(ROOT, 'src', p), 'utf8')); let m;
    const reFn = /\n(async function|function) ([A-Za-z0-9_$]+)\(/g; const starts = []; while ((m = reFn.exec(t))) starts.push({ at: m.index, name: m[2] });
    starts.forEach(function(st, k){ fns[st.name] = { file: p, body: t.slice(st.at, k + 1 < starts.length ? starts[k + 1].at : t.length) }; });
    const fnOf = function(at){ let f = null; starts.forEach(function(st){ if (st.at <= at) f = st; }); return f ? { name: f.name, body: fns[f.name].body } : { name: '?', body: '' }; };
    const gatedBefore = function(f, at0){ const g = f.body.search(/mpAccount(Gate|Ready)\(\)/); return g >= 0; };
    const reN = /userListData\.nickname \|\| null/g; while ((m = reN.exec(t))){ const f = fnOf(m.index); if (!gatedBefore(f)) open.push(p + ': ' + f.name); }
    const reW = /userLists\.merge\([^,]+,\s*\{\s*(customCities|customCountries|nickname|waiting)\b/g; while ((m = reW.exec(t))){ const f = fnOf(m.index); if (f.name === 'doSignUp') continue; /* التسجيل مصدر الاسم لا مشتقّ منه: يكتبه للحساب الجديد قبل أن يكون له مستند */ if (!gatedBefore(f)) open.push(p + ': ' + f.name + ' (' + m[1] + ')'); }
    const reS = /withAuthRetry\(\(\) => [^\n;]*?currentUser\.uid/g; while ((m = reS.exec(t))) stale.push(p + ': ' + t.slice(m.index, m.index + 70));
    const reF = /if \(userListLoadFailed\)\s*(return|\{ ?showToast)/g; while ((m = reF.exec(t))){ const f = fnOf(m.index); if (!/mpAccountReady\(\)/.test(f.body)) fails.push(p + ': ' + f.name); } });
  check(open.length === 0, T + 'every writer that derives the name, the cities, the countries or the waiting list from the in-memory account asks mpAccountReady / mpAccountGate', open.slice(0, 4).join(' | '));
  /* الكتّاب المعلومون بأسمائهم: الحارس قبل أول كتابة أو قراءة من طبقة البيانات في الدالة */
  const GATED = ['saveUserListGeneral', 'saveNickname', 'saveMyCityList', 'cmWriteDoc', 'toggleTripPublic', 'toggleCityListPublic', 'doAccountDelete', 'tkCommit', 'tkUndoRun', 'tkWaitingSave', 'saveOthersPlace', 'saveOthersList', 'addCityListCity', 'saveAddrRun', 'loadAddresses', 'syncCitiesFromCityLists', 'syncCommunityProfile', 'pruneEmptyCountries', 'enforceNickname', 'runOnboardingIfNeeded'];
  const late = GATED.filter(function(n){ const f = fns[n]; if (!f) return true; const g = f.body.search(/mpAccount(Gate|Ready)\(\)/); const w = f.body.search(/\bmpData\.[A-Za-z]+\.[A-Za-z]+\(/); return g < 0 || (w >= 0 && g > w); });
  check(late.length === 0, T + 'the ' + GATED.length + ' named writers ask before their first call into the data layer (a gate after the write, or in another branch only, does not count)', late.join(', '));
  check(stale.length === 0, T + 'a loader that reads with withAuthRetry captures the user it reads for (no currentUser.uid inside the call)', stale.slice(0, 3).join(' | '));
  /* المحمِّلات المعلومة: بعد أول await لا يُقرأ currentUser.uid (المعرّف يُؤخذ قبله)، وكلٌّ منها يسأل mpSameUser بالمعرّف ورقم الجلسة */
  const LOADERS = ['loadUserList', 'loadUserTrips', 'loadSharedCityLists', 'loadMyCityList', 'registerUserRecord', 'loadAddresses', 'syncCitiesFromCityLists', 'sgEnsureLoaded', 'mpMirrorReconcile', 'linkOwnerUid'];
  const lbad = LOADERS.filter(function(n){ const f = fns[n]; if (!f) return true; const a0 = f.body.indexOf('await '); return a0 < 0 || /currentUser\.uid/.test(f.body.slice(a0)) || !/mpSameUser\([A-Za-z_]+, __gen\)/.test(f.body); });
  check(lbad.length === 0, T + 'the ' + LOADERS.length + ' named loaders take the uid and the session number before their first await, never read currentUser.uid after it, and ask mpSameUser(uid, __gen)', lbad.join(', '));
  check(fails.length === 0, T + 'no guard asks only "did the read fail" — "loaded for this user" is the question (a read in flight has not failed)', fails.slice(0, 3).join(' | '));
  const lu = (fns.loadUserList || { body: '' }).body;
  check(/getServer\(__who\)\); if \(!mpSameUser\(__who, __gen\)\) return;/.test(lu) && /userListLoadedFor = __who;/.test(lu) && lu.indexOf('userListLoadedFor = __who;') > lu.indexOf('userListData = {') && /listBookmarksMap = null; tripSavesMap = null; addrLoaded = false;\s*userListLoadedFor = __who;/.test(lu) && /if \(!mpSameUser\(__who, __gen\)\) return;\s*userListData = \{ customCities: \[\], customCountries: \[\], nickname: null \}; userListLoadFailed = true; userListLoadedFor = null;/.test(lu), T + 'loadUserList: the flag is raised only after the document is in memory and what derives from it is reset, lowered on failure, and a late result for another session is dropped before anything is assigned');
  const init = strip(fs.readFileSync(path.join(ROOT, 'src', '92-init.js'), 'utf8'));
  check(/currentUser = user; const __gen = mpSessionGen;/.test(init) && /await Promise\.all\(tasks\);\s*if \(__gen !== mpSessionGen \|\| \(currentUser \? currentUser\.uid : null\) !== \(user \? user\.uid : null\)\) return;/.test(init), T + 'the sign-in handler stops when a newer sign-in event took over while it was loading (session number, not the uid alone)');
  const rs = (fns.resetSessionState || { body: '' }).body;
  check(['userListLoadedFor = null', 'mpSessionGen++', 'userListLoadFailed = false', 'addrLoaded = false', 'addrData = {}', 'sharedTrips = []', 'tripsLoaded = false', 'mpShareGroups = []', 'mpShareGroupsFor = null', '__cmNickSynced = false'].every(function(x){ return rs.indexOf(x) >= 0; }), T + 'every change of user (not only sign-out) starts a new session number and clears what belongs to the account: the ready flag, the failure flag, addresses, shared trips, share groups, the "my name is in my profile" flag');
}

// ---------- §37c (r119 · ق١١-١٣-٠١): خريطتا التمييز وحفظ الرحلات تُقرآن من باب واحد يبنيهما عند أول قراءة ----------
// شاشة ترسم زر التمييز من المتغيّر مباشرة ترسمه مطفأً قبل أن تُبنى الخريطة، ثم تحذف الضغطةُ التمييزَ (بلاغ المالك من الهاتف ١٣ نوفمبر — مقيس).
function bookmarkMapGuard(){
  const T = '§37c the bookmark maps are read through one door (r119): ';
  const cfgB = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')); const bad = [];
  cfgB.parts.filter(function(p){ return /\.js$/.test(p) && p !== '50-ui.js'; }).forEach(function(p){ const t = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); const re = /\b(listBookmarksMap|tripSavesMap)\b(?!\s*=\s*(?:null|\{\})\s*;)/g; let m; while ((m = re.exec(t))) bad.push(p + ': ' + t.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\n/g, ' ')); });
  check(bad.length === 0, T + 'outside src/50-ui.js the two variables are only reset (= null · = {}) — every screen asks listBmOn / tripSaveOn / listBmMap / tripSaveMap', bad.slice(0, 3).join(' | '));
  const ui = fs.readFileSync(path.join(ROOT, 'src', '50-ui.js'), 'utf8');
  const cl = fs.readFileSync(path.join(ROOT, 'src', '57-citylist.js'), 'utf8'); const lu = cl.slice(cl.indexOf('async function loadUserList(){'), cl.indexOf('\n}\n', cl.indexOf('async function loadUserList(){')));
  check(/listBookmarksMap = null; tripSavesMap = null;/.test(lu), T + 'loadUserList resets both maps to null after the user document is read — the door rebuilds from the loaded mirror, not from the empty fallback (independent review: nothing else protected this line)');
  const tr = fs.readFileSync(path.join(ROOT, 'src', '52-trips.js'), 'utf8');
  check(/const bmTap = String\(o\.bmHandler \|\| ''\)\.replace\(\/\\\)\\s\*\$\/, ', ' \+ \(o\.bmOn \? 0 : 1\) \+ '\)'\);/.test(tr) && /on: bmTap,/.test(tr) && /if \(!mpTapAgrees\(want, !on\)\)/.test(ui), T + 'every list / trip card button carries what was drawn on it, and the handler does not write when the state disagrees');
  check(/function listBmMap\(\)\{ if \(listBookmarksMap === null && currentUser\) listBmBuild\(\); return listBookmarksMap \|\| \{\}; \}/.test(ui) && /function tripSaveMap\(\)\{ if \(tripSavesMap === null && currentUser\) tripSaveBuild\(\); return tripSavesMap \|\| \{\}; \}/.test(ui), T + 'the door builds the map on first read (synchronously, from the loaded mirror)');
}

// ---------- §38 (r109 · ق١١-١٠-٠٣ — ميزانية القراءة): قراءات سوق المجتمع من باب واحد (cmMarketGet) بذاكرة جلسة ومهلة — لا نداء مباشر لاستعلامَي السوق خارجه · والرحلة تعدّ القراءات شاشةً شاشة ----------
function sessionGuard(){
  /* §40 (r108 · ق١١-١٠-٠٤): the trip editor is a session — nothing writes the trip but the buttons. Before: 31 sites saved after one second and closing saved what was pending. */
  const T = '§40 the trip editor writes only from its buttons (r108): ';
  const src = fs.readFileSync(path.join(ROOT, 'src', '59-trip-builder.js'), 'utf8'); const idx = []; const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; while ((m = re.exec(src))) idx.push([m.index, m[1]]);
  const fns = {}; idx.forEach(function(it, i){ fns[it[1]] = src.slice(it[0], i + 1 < idx.length ? idx[i + 1][0] : src.length).replace(/^[^{]*\{/, ''); });
  const writers = Object.keys(fns).filter(function(n){ return /\bsaveTrip\s*\(/.test(fns[n]); }).sort(); const callers = Object.keys(fns).filter(function(n){ return /\btbSaveNow\s*\(/.test(fns[n]); }).sort();
  check(writers.join() === 'tbApprove,tbSaveNow' && callers.join() === 'tbSaveDraft' && !/setTimeout\(\s*tbSaveNow/.test(src) && !/saveTimer\s*=\s*setTimeout/.test(src) && !/\btbSave\s*\(\)/.test(src), T + 'saveTrip is reached from Approve/Done and from the writer alone, the writer from Save as draft alone, and no timer saves', 'saveTrip in: ' + writers.join(',') + ' · tbSaveNow in: ' + callers.join(','));
  check((src.match(/\btbTouch\(\)/g) || []).length >= 30 && /function tbTouch\(\)\{ if \(!TB\) return; TB\.landed = null;[^}]*tbSessionStore\(\); \}/.test(src) && !/saveTrip|mpData\./.test(fns.tbTouch || 'x saveTrip') && !/saveTrip|mpData\.trips/.test(fns.tbSessionStore || 'x saveTrip'), T + 'every edit marks the session and writes the device copy only (' + (src.match(/\btbTouch\(\)/g) || []).length + ' sites)');
  check(/if \(!TB \|\| TB\.closing \|\| TB\.saving\) return;/.test(fns.tbClose || '') && /mpConfirm\('What you changed since the last save will be lost\.', \{ title: 'Discard your changes\?', ok: 'Discard', cancel: 'Keep editing', danger: true \}\)/.test(fns.tbClose || '') && /if \(!TB \|\| TB\.saving\) return;/.test(fns.tbApprove || '') && /TB\.saving\) return;/.test(fns.tbSaveDraft || ''), T + 'leaving asks before discarding, and no button acts while a write is on its way');
  check(!/tripGuardAllow\([^)]*'\*'/.test(src) && /TB\.plan && \(TB\.dayPlan \|\| tbDTDay\(\)\)\) h \+= '<button type="button" class="tb-door two" style="margin-top:10px;" onclick="tbPickTyped\(\)">/.test(src) && /alt: 'Discard', cancel: 'Not now'/.test(fns.tbSessionOffer || '') && /tripsLoadFailed\) return 'later';/.test(fns.tbSessionOffer || ''), T + 'inside a session the guard is never switched off wholesale (undo and restore declare exactly what they take away), the typed-place door is in the picker for every day that takes stops, and the device copy is dropped only by an explicit Discard');
}
function dataMembersGuard(){
  /* §39 (r109 · second review): a call on a data-layer member that does not exist fails only when its path runs (measured: mpData.trips.get — 1 of 317 call sites, in a fallback that then always said "no longer available"). The layer is evaluated with stubs to get its real shape; every mpData.<group>.<fn>( and mpData.<fn>( in the parts must name a defined member. */
  const T = '§39 every data-layer call names a defined member (r109): ';
  const vm = require('vm'); const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts.filter(function(p){ return /\.js$/.test(p); });
  const dl = fs.readFileSync(path.join(ROOT, 'src', '43-mpdata.js'), 'utf8'); let shape = null, err = '';
  const sb = { firebase: { firestore: Object.assign(function(){ return {}; }, { FieldValue: { increment: function(){ return 0; }, delete: function(){ return 0; }, serverTimestamp: function(){ return 0; }, arrayUnion: function(){ return 0; }, arrayRemove: function(){ return 0; } } }), auth: function(){ return {}; }, storage: function(){ return {}; } }, db: { collection: function(){ return { doc: function(){ return {}; } }; }, batch: function(){ return {}; } }, window: {}, document: {}, console: console, logTiming: function(){}, setTimeout: setTimeout, clearTimeout: clearTimeout, localStorage: { getItem: function(){ return null; }, setItem: function(){} }, navigator: {} }; sb.globalThis = sb;
  try{ vm.runInNewContext(dl + '\n;globalThis.__shape = (function(){ const o = {}; Object.keys(mpData).forEach(function(k){ o[k] = (mpData[k] && typeof mpData[k] === "object") ? Object.keys(mpData[k]) : typeof mpData[k]; }); return o; })();', sb, { timeout: 5000 }); shape = sb.__shape; }catch(e){ err = String(e && e.message).slice(0, 160); }
  check(!!shape && Object.keys(shape).length >= 25, T + 'the data layer evaluates on its own and exposes its groups', err || (shape ? Object.keys(shape).length + ' groups' : ''));
  if (!shape) return;
  const bad = []; let n = 0;
  parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); let m; const re = /\bmpData\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g; while ((m = re.exec(src))){ n++; const g = shape[m[1]]; if (!Array.isArray(g) || g.indexOf(m[2]) < 0) bad.push(p + ': mpData.' + m[1] + '.' + m[2]); }
    const re2 = /\bmpData\.([A-Za-z_$][\w$]*)\s*\(/g; while ((m = re2.exec(src))){ n++; if (shape[m[1]] !== 'function') bad.push(p + ': mpData.' + m[1] + '()'); } });
  check(n >= 300 && bad.length === 0, T + 'no call site names a missing member', n + ' call sites · ' + (bad.slice(0, 5).join(' · ') || 'none missing'));
}
function readsGuard(){
  const T = '§38 community reads go through one door with a budget (r109): ';
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8')).parts.filter(function(p){ return /\.js$/.test(p); });
  const fns = {}; let all = ''; parts.forEach(function(p){ const src = fs.readFileSync(path.join(ROOT, 'src', p), 'utf8'); all += src; const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g; let m; const idx = []; while ((m = re.exec(src))) idx.push([m.index, m[1]]); idx.forEach(function(it, i){ fns[it[1]] = { file: p, body: src.slice(it[0], i + 1 < idx.length ? idx[i + 1][0] : src.length) }; }); });
  const calls = function(needle){ return Object.keys(fns).filter(function(n){ return fns[n].body.indexOf(needle) >= 0; }); };
  const cl = calls('mpData.cityLists.publicLists('), ct = calls('mpData.trips.publicTrips('), cu = calls('mpData.communityProfiles.withPublic('), cp = calls('mpData.trips.publicByOwner(');
  check(cl.join() === 'cmMarketGet' && ct.join() === 'cmMarketGet' && cu.join() === 'cmMarketGet' && cp.slice().sort().join() === 'cmPersonTrips,syncCommunityProfileFor', T + 'the three market queries are called from cmMarketGet only, and a person\'s trips from cmPersonTrips only — plus the one place that decides a write (syncCommunityProfileFor reads the server, never the session memory)', 'publicLists: ' + cl.join(',') + ' · publicTrips: ' + ct.join(',') + ' · withPublic: ' + cu.join(',') + ' · publicByOwner: ' + cp.join(','));
  const g = fns.cmMarketGet ? fns.cmMarketGet.body : '';
  check(/if \(m && m\.promise && Date\.now\(\) - m\.at < CM_FLIGHT_MAX\) return m\.promise;/.test(g) && /const CM_FLIGHT_MAX = 30 \* 1000;/.test(all) && /Date\.now\(\) - m\.at < CM_MARKET_TTL/.test(g) && /const CM_MARKET_TTL = 10 \* 60 \* 1000;/.test(all), T + 'one in-flight promise is shared and rows are kept for ten minutes');
  check(!!fns.cmMarketFresh && /now - m\.at >= CM_MARKET_TTL/.test(fns.cmMarketFresh.body) && !!fns.cmMarketRefresh && !!fns.cmFreshPaint && /cmMarketRefresh\(\)/.test(fns.cmFreshPaint.body), T + 'entering the tab drops only what is past its time, and the user can read again by hand (the line says when it was read)');
  check(!!fns.cmForgetSession && /cmMarketDrop\(\)/.test(fns.cmForgetSession.body), T + 'the session memory is cleared when the account changes');
  /* the write door: every data-layer member that writes to a collection the market shows is in MP_MARKET_WRITES (or exempt by name with a reason) */
  const dl = fs.readFileSync(path.join(ROOT, 'src', '43-mpdata.js'), 'utf8');
  const tbl = {}; (dl.match(/\n  \['(\w*)', '(\w+)', function/g) || []).forEach(function(l){ const m = /\['(\w*)', '(\w+)'/.exec(l); tbl[(m[1] ? m[1] + '.' : '') + m[2]] = true; });
  const exempt = { 'lists.bumpView': 1, 'trips.bumpView': 1, 'communityProfiles.bumpView': 1, 'follows.set': 1, 'follows.releaseMine': 1 }; /* views and the follower counter: they change neither what is shown nor who is shown */
  const mem = []; const reM = /([A-Za-z_$][\w$]*): (?:async )?function\(/g; let mm; while ((mm = reM.exec(dl))) mem.push([mm.index, mm[1]]);
  const missing = []; let writers = 0;
  mem.forEach(function(it, i){ const body = dl.slice(it[0], i + 1 < mem.length ? mem[i + 1][0] : dl.indexOf('\nconst MP_MARKET_WRITES')); const ls = dl.lastIndexOf('\n', it[0]) + 1; const indent = (/^ */.exec(dl.slice(ls, it[0])) || [''])[0].length; const lineHead = dl.slice(ls, it[0]);
    let group = ''; if (!(indent === 4 && lineHead.trim() === '')){ const gs = dl.slice(0, it[0]).match(/\n    ([A-Za-z_$][\w$]*): \{/g) || []; group = gs.length ? /([A-Za-z_$][\w$]*): \{/.exec(gs[gs.length - 1])[1] : ''; }
    const door = /bound(On|Off)\(/.test(body) && /(bm|ts|cp|fl)Spec\(/.test(body); /* batch 2: the bound-record door writes the record and its counter on the source (lists · trips · profiles) — a member that goes through it is a market writer */
    const writes = door || /\.(set|update|delete)\(|\.commit\(/.test(body); const market = door || /col\('(trips|userCityLists|userCityListCats|communityProfiles)'\)|col\(coll\)|\bbatch\.(update|set)\(doc\.ref/.test(body) && /col\('(trips|userCityLists|userCityListCats|communityProfiles)'\)\.doc\([^)]*\)\.(set|update|delete)\(|b\.(set|delete|update)\(col\('(trips|userCityLists|userCityListCats|communityProfiles)'\)|b\.(set|delete|update)\(col\(coll\)|b\.(set|update)\((listRef|tripRef)|b\.update\(d\.ref|batch\.(update|set)\(doc\.ref/.test(body);
    if (!writes || !market) return; writers++; const name = (group ? group + '.' : '') + it[1]; if (!tbl[name] && !exempt[name]) missing.push(name); });
  check(writers >= 21 /* batch 2: the five bound-record doors and the two account-deletion releases are recognised by the door they go through */ && missing.length === 0 && Object.keys(tbl).length >= 18 /* batch 2: + cityLists.removeOrphanCats · copies.removeMine */ /* r118-ط: cityLists.removeKeys أُزيلت (القاعدة ترفضها — الترحيل صار بكتابة الحفظ الكاملة) فالجدول ١٦ */ && /function cmWrote\(kind, id, pub, ownerUid\)/.test(all) && /if \(typeof cmWrote === 'function'\) cmWrote\.apply\(null, w\[2\]\(a\)\)/.test(dl), T + 'the write door: every data-layer write on what the market shows tells the community memory after it succeeds (MP_MARKET_WRITES · views and the follower counter are exempt by name)', 'writers ' + writers + ' · table ' + Object.keys(tbl).length + ' · missing: ' + (missing.join(', ') || 'none'));
  check(!!fns.resetSessionState && /cmForgetSession\(\);/.test(fns.resetSessionState.body) && /Object\.keys\(plVisState\)\.forEach\(function\(k\)\{ delete plVisState\[k\]; \}\);/.test(fns.resetSessionState.body), T + 'an account change clears the community memory and the visibility-dot state (resetSessionState)');
  check(/const __free = setTimeout\(function\(\)\{ cmRefreshBusy = false; \}, CM_FLIGHT_MAX\);/.test(all) && /finally \{ clearTimeout\(__free\); cmRefreshBusy = false; \}/.test(all), T + 'the refresh guard is released after thirty seconds even when a read never settles');
  check(!!fns.viewCommunityUser && /const __seq = \+\+vcuSeq;/.test(fns.viewCommunityUser.body) && (fns.viewCommunityUser.body.match(/if \(!__mine\(\)\) return;/g) || []).length >= 5 && !/viewingUserCities\.push\(/.test(fns.viewCommunityUser.body), T + 'overlapping opens of a person: the latest call alone completes (the superseded one stops after every wait and never fills the shared array)');
  check(!!fns.resetSessionState && /delete cmCache\.trips\[k\]/.test(fns.resetSessionState.body) && /delete cmCache\.places\[k\]/.test(fns.resetSessionState.body), T + 'an account change clears the market cards kept for export (lists, trips, places)');
  check(!/r\._matches = n/.test(all) && /cities: viewingUserCities\.filter\(function\(c\)\{ return !c\._shared; \}\)/.test(all) && /viewingUserCities = __pc\.cities\.slice\(\);/.test(all), T + 'the shared rows are never written on (the category filter counts on a copy) and a list shared by name never enters the person memory');
  /* r109-ب: the hold is complete, and every open point of someone else's content from memory passes the one-read check */
  check(/await mpData\.cityLists\.holdAll\(uid, newVal\);/.test(all) && !/holdOrRestore\(await mpData\.cityLists\.byOwner/.test(all) && /if \(hold && d && d\.suspended === true\) return;/.test(dl) && /holdAll: async function\(uid, hold, opts\)/.test(dl) && !!fns.adminHoldSweep && /holdAll\(u\.uid, true, \{ onlyOutOfStep: true \}\)/.test(fns.adminHoldSweep.body), T + 'a suspension holds every list together with its category documents (holdAll), holding twice keeps what was saved for the lift, and accounts held before this are swept once per session from Users');
  const cityIn = Object.keys(fns).filter(function(n){ return /communityUserLayer = (cityId|\(what === 'places'\) \? cityId)/.test(fns[n].body); }); const tripIn = Object.keys(fns).filter(function(n){ return /viewingCommunityTripId = tripId|viewingSharedTrip = true/.test(fns[n].body); });
  check(cityIn.slice().sort().join() === 'curBrowse,openCommunityCityList' && cityIn.every(function(n){ return /cmOpenMark\(cityId/.test(fns[n].body); }) && tripIn.slice().sort().join() === 'openCommunityTrip,openSharedTripDetail' && tripIn.every(function(n){ return /cmVerifyTrip\(tripId\)/.test(fns[n].body); }) && !!fns.cmEnsureCity && /if \(c\._recheck\)/.test(fns.cmEnsureCity.body) && !!fns.cmStillOpen, T + 'the open points are known by name (a city: openCommunityCityList, curBrowse · a trip: openCommunityTrip, openSharedTripDetail) and each passes the check — a new way in must be added here', 'city: ' + cityIn.join(',') + ' · trip: ' + tripIn.join(','));
  const journey = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8');
  check(/await must\('r109 · ميزانية القراءة في المجتمع/.test(journey) && /steps\.open\.listQ === 1 && steps\.open\.reads >= N \+ U && steps\.open\.reads <= N \+ U \+ U \+ 2/.test(journey) && /total <= 3 \* N \+ 2 \* U \+ U \+ 20/.test(journey) /* r118-و (ق١١-١٢-٠٧): الميزانية تشمل قراءة سجل الاسم مرة لكل صاحب محتوى */, T + 'the journey counts billed reads screen by screen against the budget');
}

// ---------- §35 (r99 · ق١١-٠٣-٠٢ — مصفوفة الإفشال سقّاطة): كل خلية إمّا حكم وإمّا سبب عدم انطباق · الحُمر لا تزيد عن الأساس · خلية خضراء في الأساس لا تحمرّ ----------
function faultMatrixGuard(){
  const T = '§35 fault matrix is a ratchet (r99): ';
  const mp = path.join(__dirname, 'fault-matrix.json'), bp = path.join(__dirname, 'fault-baseline.json');
  if (!fs.existsSync(mp)){ check(false, T + 'tests/fault-matrix.json exists (journey writes it)'); return; }
  const m = JSON.parse(fs.readFileSync(mp, 'utf8')); const base = fs.existsSync(bp) ? JSON.parse(fs.readFileSync(bp, 'utf8')) : null;
  const cells = m.cells || []; const bad = cells.filter(c => !c.v && !c.na); const broken = cells.filter(c => c.setupError || c.cleanupError);
  check(cells.length > 0, T + 'cells recorded (' + cells.length + ' = ' + (m.groups || []).reduce((a, g) => a + g.caps.length, 0) + ' caps × ' + (m.modes || []).length + ' modes)');
  check(bad.length === 0, T + 'every cell has a verdict or a reason', bad.slice(0, 5).map(c => c.cap + '/' + c.mode).join(', '));
  check(broken.length === 0, T + 'no fixture errors inside the matrix', broken.slice(0, 5).map(c => c.cap + '/' + c.mode).join(', '));
  if (!base){ check(false, T + 'tests/fault-baseline.json exists (accepted reds)'); return; }
  const reds = cells.filter(c => c.v && c.v !== 'ok'); const baseCells = base.cells || {};
  const regressions = reds.filter(c => baseCells[c.cap + '/' + c.mode] === 'ok');
  const newCells = cells.filter(c => c.v && !(c.cap + '/' + c.mode in baseCells));
  check(reds.length <= base.reds, T + 'reds never exceed the baseline (' + reds.length + ' ≤ ' + base.reds + ')');
  check(regressions.length === 0, T + 'no cell that was green in the baseline is red now', regressions.slice(0, 5).map(c => c.cap + '/' + c.mode + ' ' + c.v).join(', '));
  check(newCells.filter(c => c.v !== 'ok').length === 0, T + 'a new capability enters green or gets its reds accepted into the baseline', newCells.filter(c => c.v !== 'ok').slice(0, 5).map(c => c.cap + '/' + c.mode).join(', '));
  const closed = Object.keys(baseCells).filter(k => baseCells[k] !== 'ok' && cells.some(c => c.cap + '/' + c.mode === k && c.v === 'ok'));
  if (closed.length) console.log('INFO  ' + T + closed.length + ' red cell(s) in the baseline are green now — lower the baseline: ' + closed.slice(0, 6).join(', '));
}
