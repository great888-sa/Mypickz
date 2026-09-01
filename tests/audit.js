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
  ["mpTrack.hit('share_link')", { prod: 4, test: 5 }], // خ٢-r3: + إرسال العنوان بتوقيع من وجهة العناوين (نسخة الاختبار حتى ترقية الإطار)
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
const KNOWN_UNSTYLED = ['flabel'];            // ر42: صنف مستعمَل بلا قاعدة بأي كتلة — يُغلق بدفعة تصحيحات الهوية
const KNOWN_STRUCT_IN_IDENTITY = ['#activeTripBar', '.pclose']; // ر42: حدّ بسُمك ونمط داخل كتلة الهوية
const KNOWN_EMPTY_RULES = ['.mp-tab.on .ti', '.row,.rowblock'];   // ر42: قاعدتان فارغتان بكتلة البنية
const KNOWN_DEAD = ['requestReauth'];          // ر42: مبنية عمدًا قبل موعدها (تأكيد الهوية — تُستدعى بدفعتي كلمة المرور والحذف المتتالي)
const KNOWN_NO_OUTLET = ['follows', 'stats_curators', 'stats_cards', 'followerCount', 'bio', 'contactUrl', 'showFollowerCount', 'displayName', 'verified']; // الوثيقة الدائمة الثامنة v1.0 — قدرات بُنيت قبل موعدها
const CAP_COLORS_OUTSIDE_IDENTITY = { [TEST]: 149, [PROD]: 149 }; // ر42 = ١٤٩ (١٤ لونًا صريحًا · ١٣٥ متغيرًا لونيًّا) خارج كتلة الهوية — سمات مضمَّنة وقوالب وثوابت الشيفرة · يُخفَّض ولا يُرفع
const CONTROL_CLASSES = ['btn', 'chip', 'act', 'actn', 'cta', 'csel', 'pl-src', 'mp-tab', 'dr-item', 'acc-item', 'switch-btn', 'pl-actbtn', 'addr-chip', 'pl-catpick', 'city-tab', 'area-chip', 'hcard', 'remove-btn', 'fav-btn', 'reorder-btn', 'add-place-btn', 'quick-nav-btn', 'action-btn', 'status-toggle', 'mp-burger', 'mp-idchip', 'pw-eye', 'show-more-btn', 'pclose', 'prow', 'addmini'];
const LIFE_PATHS = [ // مسارات الحياة العشرة — دالة مدخل مسمّاة لكل مسار: معرَّفة ومستدعاة
  ['signup', ['doSignUp']], ['signin', ['doSignIn']], ['save place', ['savePlPlace', 'saveMyCityList']],
  ['publish & share', ['plTogglePublic', 'shareMyListWithSomeone']], ['trip', ['openCreateTripFlow', 'saveTrip']],
  ['private address', ['saveAddr']], ['favorite', ['toggleFavorite']], ['suspend', ['toggleSuspendUser']],
  ['delete', ['deleteTrip', 'plDeleteRow', 'deleteAddr', 'openDeletePreview']], ['sign out', ['doSignOut', 'confirmLogout']]
];
// عقود مسارات الكتابة على بيانات المستخدم — الحرّاس الثلاثة (مصفوفة الأمان M4.19 · دليل التشغيل v1.21)
const WRITE_CONTRACTS = [
  ['if (myCityListLoadedFor !== myListCityId){', 1, 'حارس التطابق داخل saveMyCityList'],
  ['myCityListLoadFailed = true; myCityListLoadedFor = null;', 1, 'حارس فشل القراءة: تبقى غير محمَّلة'],
  ["if (code === 'permission-denied'){", 1, 'تصنيف permission-denied: مستند غائب لا فشل'],
  ['myCityListLoadFailed = false; myCityListLoadedFor = null;', 1, 'إعادة المحاولة الصريحة تصفّر العلمين معًا'],
  ['backfillPlaceIds(myCityListData.categories) && !currentUserSuspended && Object.keys(myCityListData.categories).length', 1, 'الكتابة الخلفية لا تعمل على محتوى فارغ'],
  ['if (!currentUser || !userListData || userListLoadFailed) return;', 1, 'التنقية بعد تحقق التحميل'],
  ['if (!live.size) return;', 1, 'لا تنقية بلا مدن محمَّلة'],
  ['if (currentUserSuspended){ showToast(\'Your account is suspended — you can\\\'t save changes\'); return; }', 3, 'الموقوف لا يحفظ (القائمة · الرحلة · البيانات العامة)']
];
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
  const usedClean = [...used].filter(c => /^[a-z][a-z0-9-]*$/.test(c) && !/^(true|false|null)$/.test(c) && !/^fa(-|$)|^mk|^st$/.test(c));
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
    // قشرة معطَّلة (cur-shell على الحاوية) أو حاوية يحمل ابنها المعالج (صفوف اللوحات)
    const before = code.slice(Math.max(0, tm.index - 700), tm.index), after = code.slice(tm.index, tm.index + 260);
    if (tm[1] !== 'button' && (/class=\\?["'][^"']*cur-shell/.test(before) || /\bonclick=/.test(after.slice(tm[0].length)))) continue;
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
idGuard(TEST, test);
if (styleBlock(prod, 'identity')) {
  idGuard(PROD, prod);
} else {
  console.log('INFO  prod not yet promoted to the identity batch (no <style id="identity">) — §10 applied to test only');
}

finish();

function finish(){
  console.log('\n' + (fails === 0 ? '✅ AUDIT PASSED' : '❌ AUDIT FAILED (' + fails + ')'));
  process.exit(fails === 0 ? 0 : 1);
}
