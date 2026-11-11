// MyPickz — tests/tools/subset.js (r110 · ١١ نوفمبر ٢٠٢٦ · ق١١-١١-٠٢: أدوات المنفِّذ داخل المستودع)
// يشغّل جزءًا من الرحلة: رأس tests/journey.js كما هو + محطتا الأساس (١ · ٢) + كل محطة يبدأ اسمها بإحدى البادئات المعطاة.
// الغاية: قياس سريع أثناء العمل وقتل الطفرات — لا يغني عن الرحلة الكاملة (المحطات يعتمد بعضها على ما قبلها؛ الحكم النهائي للرحلة كاملة مرتين).
// الاستعمال:  node tests/tools/subset.js "r110" "r107-ب"        (يكتب tests/.subset-run.js ويشغّله)
//             node tests/tools/subset.js --list "r10"            (يسرد أسماء المحطات المطابقة ولا يشغّل)
//             SUBSET_BODY=path.js node tests/tools/subset.js --body   (جسم حرّ يُنفَّذ بعد الأساس بدل المحطات: قياس بلا محطة)
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8').split('\n');
const args = process.argv.slice(2);
const listOnly = args[0] === '--list', bodyMode = args[0] === '--body';
const prefixes = (listOnly || bodyMode) ? args.slice(1) : args;
const starts = []; src.forEach((l, i) => { if (/^  await must\('/.test(l)) starts.push(i); });
const foot = src.findIndex(l => /^  \/\* ═+ ٧ · مصفوفة التغطية والحكم/.test(l));
if (!starts.length || foot < 0){ console.error('subset: journey.js shape not recognised'); process.exit(2); }
const nameOf = i => (src[i].match(/^  await must\('((?:[^'\\]|\\.)*)'/) || [, ''])[1];
const blocks = starts.map((s, k) => ({ name: nameOf(s), from: s, to: (k + 1 < starts.length ? starts[k + 1] : foot) }));
const BASE = ['١ · ', '٢ · '];
const want = b => BASE.some(p => b.name.indexOf(p) === 0) || prefixes.some(p => b.name.indexOf(p) === 0);
if (listOnly){ blocks.filter(b => prefixes.some(p => b.name.indexOf(p) === 0)).forEach(b => console.log((b.from + 1) + '  ' + b.name.slice(0, 110))); process.exit(0); }
const picked = blocks.filter(b => bodyMode ? BASE.some(p => b.name.indexOf(p) === 0) : want(b));
if (!bodyMode && picked.length <= BASE.length){ console.error('subset: no station starts with ' + JSON.stringify(prefixes)); process.exit(2); }
let out = src.slice(0, starts[0]).join('\n') + '\n';
picked.forEach((b, k) => { out += src.slice(b.from, b.to).join('\n') + '\n'; if (k === BASE.length - 1) out += "  try{ await B.x(\"(async function(){ if (typeof loadUserTrips === 'function') await loadUserTrips(); })()\"); }catch(_){} /* الرحلة الكاملة تبلغ محطات الرحلات والرحلات محمَّلة — التشغيل الجزئي يحمّلها بعد الأساس */\n"; });
if (bodyMode){ const f = process.env.SUBSET_BODY; if (!f || !fs.existsSync(f)){ console.error('subset: SUBSET_BODY missing'); process.exit(2); } out += "  await must('subset body', async () => {\n" + fs.readFileSync(f, 'utf8') + "\n  }, []);\n"; }
out += "  console.warn = realWarn;\n  console.log(failures === 0 ? '\\n✅ SUBSET PASSED — ' + stations + ' checks' : '\\n❌ SUBSET FAILED (' + failures + ') of ' + stations);\n  process.exit(failures === 0 ? 0 : 1);\n})().catch(e => { console.warn = realWarn; console.log('FAIL  harness →', e && e.stack); process.exit(1); });\n";
/* مصفوفة الإفشال تكتب tests/fault-matrix.json — في التشغيل الجزئي لا يُمسّ الملف */
out = out.replace(/fs\.writeFileSync\(path\.join\(__dirname, 'fault-matrix\.json'\)/g, "(function(){})(path.join(__dirname, 'fault-matrix.json')");
const runFile = path.join(ROOT, 'tests', '.subset-run.js');
fs.writeFileSync(runFile, out);
const r = cp.spawnSync(process.execPath, [runFile], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 590000 });
const text = (r.stdout || '') + (r.stderr || '');
const quiet = process.env.SUBSET_VERBOSE ? text : text.split('\n').filter(l => !/^\[TIMING\]/.test(l) && (process.env.SUBSET_ALL || !/^PASS  /.test(l))).join('\n');
try{ fs.unlinkSync(runFile); }catch(_){} /* الملف المؤقت لا يبقى في المستودع */
console.log(quiet.trim());
process.exit(r.status === null ? 3 : r.status);
