// يبني مثبّتات الدولة الاصطناعية XX من مصدرَيها النصيَّين (places.jsonl · divisions.json) — بلا أوامر بيد أحد: test-index.js يستدعيه لحظة الاختبار بالناشر فيبني في مجلد مؤقت
//   ١) tok/  من places.jsonl بالسكربت الحقيقي scripts/token-index.mjs (مساراته ثابتة نسبيًّا، فيُشغَّل داخل جذر مؤقت يحاكي بنية المستودع) — فالمثبّت دائمًا بصيغة الفهرس الحالية
//   ٢) div/  من divisions.json بالشكل الذي يكتبه scripts/divisions-extract.py (خلية مضغوطة + manifest)
// التشغيل المباشر (اختياري للفحص اليدوي): node workers/places/fixtures/make-fixture.mjs → يبني داخل مجلد مؤقت ويطبع مساره (لا شيء يُكتب بالمستودع)
import fs from 'fs'; import path from 'path'; import os from 'os'; import zlib from 'zlib'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)); const repo = path.resolve(here, '../../..');
export function buildFixture(outDir, { quiet = false } = {}){ // outDir/tok و outDir/div
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mpz-fixture-'));
  fs.mkdirSync(path.join(tmp, 'scripts/eval/cells'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'workers/places/src'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'scripts/token-index.mjs'), path.join(tmp, 'scripts/token-index.mjs'));
  fs.copyFileSync(path.join(repo, 'workers/places/src/match.js'), path.join(tmp, 'workers/places/src/match.js'));
  fs.copyFileSync(path.join(here, 'XX/places.jsonl'), path.join(tmp, 'scripts/eval/cells/XX.jsonl'));
  execFileSync(process.execPath, ['scripts/token-index.mjs'], { cwd: tmp, stdio: quiet ? 'ignore' : 'inherit' });
  const tok = path.join(outDir, 'tok'); fs.rmSync(tok, { recursive: true, force: true }); fs.cpSync(path.join(tmp, 'scripts/eval/r2/tok/XX'), tok, { recursive: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  const dv = JSON.parse(fs.readFileSync(path.join(here, 'XX/divisions.json'), 'utf8')); const div = path.join(outDir, 'div'); fs.rmSync(div, { recursive: true, force: true }); fs.mkdirSync(div, { recursive: true });
  fs.writeFileSync(path.join(div, dv.cell + '.json.gz'), zlib.gzipSync(Buffer.from(JSON.stringify(dv.areas)), { level: 9 }));
  fs.writeFileSync(path.join(div, 'manifest.json'), JSON.stringify({ cc: 'XX', areas: dv.areas.length, cells: 1, mb: 0, release: 'fixture' }));
  return { tok: fs.readdirSync(tok).length, div: fs.readdirSync(div).length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){ const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mpz-fixture-xx-')); const r = buildFixture(path.join(out, 'XX')); console.log('fixture XX built in', out, '· tok', r.tok, 'files · div', r.div, 'files'); }
