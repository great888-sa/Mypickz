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

const prod = read(PROD);
const test = read(TEST);
if (!prod || !test) { finish(); }

// ---------- ١) هيكل HTML سليم ----------
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
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
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
  const hit = SECRET_PATTERNS.find(r => r.test(s));
  check(!hit, 'no secrets ' + n, hit && String(hit));
}

// ---------- ٣) لا بقايا مسارات محذوفة (الدفعة ١ / GitHub Pages) ----------
const FORBIDDEN_IDS = ['editPassword', 'loadPassword', 'savePassword', 'logoTap', 'checkOwnerAccess', 'managePassword'];
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
  const code = stripComments(s);
  const found = FORBIDDEN_IDS.filter(id => new RegExp('\\b' + id + '\\b').test(code));
  check(found.length === 0, 'no removed owner-mode code ' + n, found.join(', '));
  check(!/github\.io/.test(code), 'no github.io references ' + n);
  check(!/[?&]key=/.test(code), 'no ?key= access path ' + n);
}

// ---------- ٣-ب) كل onclick (بالHTML وبالقوالب داخل JS) يشير لدالة معرَّفة ----------
// فحص ثابت مكمِّل لـruntime.js: يلتقط أيضًا المعالجات المولَّدة داخل قوالب JS التي لا تظهر بالDOM عند التحميل
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
  const handlers = new Set();
  for (const m of s.matchAll(/onclick=\\?["']\s*([A-Za-z_$][\w$]*)\s*\(/g)) handlers.add(m[1]);
  const defined = new Set();
  for (const m of s.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
  for (const m of s.matchAll(/(?:^|\n)\s*(?:const|let|var|window\.)\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) defined.add(m[1]);
  const missing = [...handlers].filter(h => !defined.has(h));
  check(missing.length === 0, 'onclick handlers defined (' + handlers.size + ') ' + n, 'missing: ' + missing.join(', '));
}

// ---------- ٤) Firebase مثبَّت الإصدار ومشروع صحيح ----------
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
  check(/cdnjs\.cloudflare\.com\/ajax\/libs\/firebase\/\d+\.\d+\.\d+\//.test(s), 'firebase SDK pinned ' + n);
  check(/projectId:\s*"mypickz-6f809"/.test(s), 'firebase projectId ' + n);
  for (const lib of ['firebase-app-compat', 'firebase-auth-compat', 'firebase-firestore-compat'])
    check(s.includes(lib + '.min.js'), lib + ' loaded ' + n);
}

// ---------- ٥) الفصل بين الإنتاج والاختبار ----------
check(!/logTiming/.test(prod), 'prod has no diagnostics (logTiming)');
check(!/BUILD:/.test(prod), 'prod has no BUILD marker');
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
const np = normalize(prod), nt = normalize(test);
if (np === nt) pass('prod == test after removing diagnostics');
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
check(!fs.existsSync(path.join(ROOT, 'CNAME')), 'no CNAME (GitHub Pages leftover)');

// ---------- ٧) A3-L3-r1: حارس نقاط حقن mpTrack ----------
// يحمي نقاط القياس من السقوط الصامت عند أي إعادة هيكلة (خصوصًا تقسيم الملف بج-١أ).
// نسخة الاختبار تُفحص دائمًا؛ الإنتاج يُفحص فقط بعد ترقيته لطبقة القياس (وجود وحدة mpTrack به).
const MP_EXPECTED = [
  ["const mpTrack = (function(){", 1],
  ["mpTrack.hit('mylist_open'", 1],
  ["mpTrack.hit('mylist_save')", 1],
  ["mpTrack.hit('trip_open'", 1],
  ["mpTrack.hit('trip_save')", 1],
  ["mpTrack.hit('favorites_open'", 1],
  ["mpTrack.hit('community_open'", 1],
  ["mpTrack.hit('share_link')", 4],
  ["mpTrack.hit('favorite_add')", 1],
  ["mpTrack.hit('signup_start')", 1],
  ["mpTrack.hit('signup_done')", 1],
  ["mpTrack.hit('reserved_1')", 2],
  ["mpTrack.statsList(docId, 'open_ulist')", 1],
  ["mpTrack.statsTrip(tripId, 'view_shared')", 1],
  ["mpTrack.statsTrip(tripId, 'view_community')", 1],
  ["mpTrack.captureSource();", 1],
  ["mpTrack.trapError(mpTrack.classify", 1],
  ["window.addEventListener('unhandledrejection'", 1],
  // خ٢ (٢٧ أغسطس): وجهة العناوين الشخصية تعرض روابطها بسماتها (data-mpsrc="app" · data-mppersonal="1") — إبرة إضافية بنسخة الاختبار
  //   حتى ترقية الإطار للإنتاج (حينها يصير العدد ٨/٣ بالملفين وتُوحَّد القيمة). القيمة إما رقم واحد للملفين أو {prod, test}.
  ['data-mpsrc=', { prod: 7, test: 8 }],
  ['data-mppersonal=', { prod: 2, test: 3 }],
  ['data-mpowner="1"', 1]
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
if (countOcc(prod, 'const mpTrack') > 0) {
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
for (const [n, s] of [[PROD, prod], [TEST, test]])
  check(!/FIREBASE_APPCHECK_DEBUG_TOKEN/.test(s), 'no App Check debug token ' + n);
acGuard(TEST, test);
if (countOcc(prod, 'firebase.appCheck().activate(') > 0) {
  acGuard(PROD, prod);
} else {
  console.log('INFO  prod not yet promoted to A3-L4 (no App Check) — ac guard applied to test only');
}

// ---------- ٩) M2-DAL: حارس طبقة العزل — خط أساس مجمَّد للنداءات المباشرة، سقف لكل ملف ----------
// يعدّ نداءات المنصة المباشرة خارج الوحدتين المعزولتين (mpTrack · mpData). زيادة عن السقف = لا نشر.
// خط الأساس: ٢١ أغسطس ٢٠٢٦ = ٨٢ (التأسيس) · ٢٥ أغسطس = ٧٧ (toggleFavorite) · ٢٦ أغسطس = ٦٢ (toggleSuspendUser · loadMyCityList · saveMyCityList · resolveTripPlaces).
// سقف مستقل لكل ملف لأن نسخة الاختبار تسبق الإنتاج بدفعة (الاختبار أولًا): يُخفَّض سقف الإنتاج عند ترقيته. السقف يُخفَّض فقط ولا يُرفع أبدًا.
const DAL_MAX = { [TEST]: 62, [PROD]: 62 };
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
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
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
for (const [n, s] of [[PROD, prod], [TEST, test]]) {
  const hasDal = countOcc(s, 'const mpData = (function(){') === 1;
  const max = hasDal ? AUTH_MAX[n] : 5;
  const direct = countAuthDirect(s);
  check(direct <= max, 'direct auth calls outside DAL ' + n + ' = ' + direct + ' (max ' + max + ')');
}

finish();

function finish(){
  console.log('\n' + (fails === 0 ? '✅ AUDIT PASSED' : '❌ AUDIT FAILED (' + fails + ')'));
  process.exit(fails === 0 ? 0 : 1);
}
