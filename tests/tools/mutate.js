// MyPickz — tests/tools/mutate.js (r110 · ١١ نوفمبر ٢٠٢٦ · ق١١-١١-٠٢: أدوات المنفِّذ داخل المستودع)
// مشغّل الطفرات: لكل طفرة — استبدال نصّي واحد في ملف مصدر → بناء → التدقيق + محطات مختارة من الرحلة → إعادة الملف كما كان.
// الطفرة «قُتلت» إن احمرّ التدقيق أو احمرّت محطة؛ «نجت» إن بقي الكل أخضر (تُسمّى في البيان: مكافئة أو ناقصة الفحص).
// يُشغَّل على نسخة من المستودع لا على شجرة العمل (يعدّل src/ ويعيد البناء):
//   cp -r <repo> /tmp/mutA && cd /tmp/mutA && node tests/tools/mutate.js muts.json results.txt [start] [step]
// muts.json: { "stations": ["r110-أ", "r78 ·"], "muts": [ { "id": "e1", "file": "src/59-trip-engine.js", "find": "…", "replace": "…", "why": "…" } ] }
// start/step: لتقسيم القائمة على عدة نسخ بالتوازي (الطفرة i تُشغَّل إن i % step === start).
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const [listFile, outFile, startArg, stepArg] = process.argv.slice(2);
if (!listFile || !outFile){ console.error('usage: node tests/tools/mutate.js muts.json results.txt [start] [step]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(listFile, 'utf8'));
const start = parseInt(startArg || '0', 10) || 0, step = parseInt(stepArg || '1', 10) || 1;
const run = (cmd, args, timeout) => cp.spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: timeout || 600000, env: process.env });
const log = line => { fs.appendFileSync(outFile, line + '\n'); console.log(line); };
const base = cp.spawnSync('git', ['status', '--short', 'src'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
if (base && !process.env.MUTATE_DIRTY_OK){ console.error('mutate: src/ has uncommitted changes in this copy — run on a clean copy (or MUTATE_DIRTY_OK=1)'); process.exit(2); }
/* المحور ١ (ق١١-١٣-٠٥): أداة الطفرات ترفض محطات تابعة — المحطات المختارة تُشغَّل أولًا على الكود السليم (وحدها بعد الأساس، كما ستُشغَّل مع كل طفرة).
   إن احمرّت بلا طفرة فكل طفرة «تُقتل» زورًا (تعتمد على محطة ليست في القائمة)؛ الأداة تتوقف وتسمّي السبب بدل أن تكتب أحكامًا لا معنى لها. MUTATE_SKIP_BASE=1 للتخطّي في تشغيل متوازٍ بعد أول نسخة. */
if (!process.env.MUTATE_SKIP_BASE){
  const refuse = (why, detail) => { console.error('mutate: REFUSED — ' + why + (detail ? ' (' + detail + ')' : '')); fs.appendFileSync(outFile, 'REFUSED\t' + why + '\t' + (detail || '') + '\n'); process.exit(2); };
  const b0 = run(process.execPath, ['scripts/build.js', 'test'], 120000); if (b0.status !== 0) refuse('the clean code does not build');
  const a0 = run(process.execPath, ['tests/audit.js'], 180000); /* المراجعة المستقلة (٩): تدقيق أحمر على الكود السليم يجعل كل طفرة «قُتلت بالتدقيق» */
  if (a0.status !== 0) refuse('the audit is red on clean code — every mutation would be "killed by audit"', ((a0.stdout || '').split('\n').filter(l => /^FAIL/.test(l))[0] || '').slice(0, 160));
  const s0 = run(process.execPath, ['tests/tools/subset.js'].concat(spec.stations), 590000); const out0 = ((s0.stdout || '') + (s0.stderr || '')).split('\n');
  if (s0.status === null || s0.status > 1) refuse('the chosen stations could not be run (no station with that name, a timeout, or a broken environment)', (out0.filter(Boolean).pop() || '').slice(0, 160));
  if (s0.status !== 0) refuse('the chosen stations do not pass on clean code when run on their own — they depend on a station outside the list: add it to "stations", or make the station stand alone (tests/tools/solo.js lists them)', (out0.filter(l => /^FAIL/.test(l))[0] || '').slice(0, 200));
  log('BASE\tGREEN\taudit and stations pass on clean code');
}
spec.muts.forEach((m, i) => {
  if (i % step !== start) return;
  const fp = path.join(ROOT, m.file); const orig = fs.readFileSync(fp, 'utf8'); const n = orig.split(m.find).length - 1;
  if (n !== 1){ log(m.id + '\tINVALID\tfind occurs ' + n + ' times in ' + m.file); return; }
  let verdict = 'SURVIVED', by = '';
  try {
    fs.writeFileSync(fp, orig.replace(m.find, m.replace));
    const b = run(process.execPath, ['scripts/build.js', 'test'], 120000);
    if (b.status !== 0){ verdict = 'KILLED'; by = 'build'; }
    else {
      const a = run(process.execPath, ['tests/audit.js'], 180000);
      if (a.status !== 0){ verdict = 'KILLED'; by = 'audit: ' + ((a.stdout || '').split('\n').filter(l => /^FAIL/.test(l))[0] || '').slice(0, 140); }
      if (verdict !== 'KILLED' || process.env.MUTATE_BOTH){
        const s = run(process.execPath, ['tests/tools/subset.js'].concat(spec.stations), 590000);
        const fails = ((s.stdout || '') + (s.stderr || '')).split('\n').filter(l => /^FAIL/.test(l));
        if (s.status !== 0){ const st = 'station: ' + (fails[0] || 'exit ' + s.status).slice(0, 160); by = by ? by + ' ‖ ' + st : st; verdict = 'KILLED'; }
        else if (verdict === 'KILLED') by += ' ‖ (stations green — audit only)';
      }
    }
  } finally { fs.writeFileSync(fp, orig); }
  log(m.id + '\t' + verdict + '\t' + by + (m.why ? '\t# ' + m.why : ''));
});
run(process.execPath, ['scripts/build.js', 'test'], 120000);
