// يبني مثبّتات الدولة الاصطناعية XX من مصدرَيها النصيَّين — يُشغَّل من أي مجلد: node workers/places/fixtures/make-fixture.mjs
//   ١) fixtures/XX/tok/  من fixtures/XX/places.jsonl بالسكربت الحقيقي scripts/token-index.mjs (مساراته ثابتة نسبيًّا، فيُشغَّل داخل جذر مؤقت يحاكي بنية المستودع)
//   ٢) fixtures/XX/div/  من fixtures/XX/divisions.json بالشكل الذي يكتبه scripts/divisions-extract.py (خلية مضغوطة + manifest)
import fs from 'fs'; import path from 'path'; import os from 'os'; import zlib from 'zlib'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)); const repo = path.resolve(here, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mpz-fixture-'));
fs.mkdirSync(path.join(tmp, 'scripts/eval/cells'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'workers/places/src'), { recursive: true });
fs.copyFileSync(path.join(repo, 'scripts/token-index.mjs'), path.join(tmp, 'scripts/token-index.mjs'));
fs.copyFileSync(path.join(repo, 'workers/places/src/match.js'), path.join(tmp, 'workers/places/src/match.js'));
fs.copyFileSync(path.join(here, 'XX/places.jsonl'), path.join(tmp, 'scripts/eval/cells/XX.jsonl'));
execFileSync(process.execPath, ['scripts/token-index.mjs'], { cwd: tmp, stdio: 'inherit' });
const tok = path.join(here, 'XX/tok'); fs.rmSync(tok, { recursive: true, force: true }); fs.cpSync(path.join(tmp, 'scripts/eval/r2/tok/XX'), tok, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });
const dv = JSON.parse(fs.readFileSync(path.join(here, 'XX/divisions.json'), 'utf8')); const div = path.join(here, 'XX/div'); fs.rmSync(div, { recursive: true, force: true }); fs.mkdirSync(div, { recursive: true });
fs.writeFileSync(path.join(div, dv.cell + '.json.gz'), zlib.gzipSync(Buffer.from(JSON.stringify(dv.areas)), { level: 9 }));
fs.writeFileSync(path.join(div, 'manifest.json'), JSON.stringify({ cc: 'XX', areas: dv.areas.length, cells: 1, mb: 0, release: 'fixture' }));
console.log('fixtures/XX rebuilt: tok', fs.readdirSync(tok).length, 'files · div', fs.readdirSync(div).length, 'files');
