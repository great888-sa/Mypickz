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

finish();

function finish(){
  console.log('\n' + (fails === 0 ? '✅ AUDIT PASSED' : '❌ AUDIT FAILED (' + fails + ')'));
  process.exit(fails === 0 ? 0 : 1);
}
