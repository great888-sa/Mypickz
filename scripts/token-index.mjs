// MyPickz — scripts/token-index.mjs (الفهرس بالكلمة أولًا · لكل دولة): من scripts/eval/cells/<CC>.jsonl (المستخرِج) إلى tok/<CC>/<bucket>.json.gz — ٤٠٩٦ دلوًا: { token: [[id, lat, lng, name, addr, locality], …] }
// السؤال الواحد = ≤ ٥ قراءات صغيرة مهما كبرت المدينة · الكلمات الشائعة جدًّا بالدولة (> STOP_MAX ظهورًا) تُسقط وتُسجَّل بـ stop.json · المرور على الملف بمراحل (حزم أدلاء) لضبط الذاكرة
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import readline from 'readline';
import { toks, bucketOf } from '../workers/places/src/match.js';
const SRC = 'scripts/eval/cells', OUT = 'scripts/eval/r2/tok'; const PASSES = 4, STOP_MAX = 12000; // كلمة > ١٢ ألف ظهور بالدولة = توقف (الدلو يبقى صغيرًا)
let BUCKETS = 4096; // الدول > مليوني مكان: ١٦٬٣٨٤ دلوًا (أكبر دلو ~٣٠٠ ك.ب) — العدد يُكتب ببيان الدولة ويقرؤه العامل
function bucket4096(t){ let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h % BUCKETS; }
const report = {};
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.jsonl'))){
  const cc = f.replace('.jsonl', ''); const dir = path.join(OUT, cc); fs.mkdirSync(dir, { recursive: true });
  const counts = new Map(); // ظهور كل كلمة بالدولة (للتوقف التلقائي) — مرور أول
  let places = 0;
  await (async () => { const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, f)), crlfDelay: Infinity }); for await (const line of rl){ if (!line.trim()) continue; let p; try{ p = JSON.parse(line); }catch(_){ continue; } if (!p.name || typeof p.lat !== 'number') continue; places++; const names = [p.name].concat(p.common && typeof p.common === 'object' ? Object.values(p.common).filter(x => x && x !== p.name).slice(0, 3) : []); toks(names.join(' ')).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)); } })();
  const stop = [...counts.entries()].filter(([, n]) => n > STOP_MAX).map(([t]) => t); const stopSet = new Set(stop); BUCKETS = places > 2000000 ? 16384 : 4096;
  let bytes = 0, postings = 0, maxBucket = 0;
  for (let pass = 0; pass < PASSES; pass++){
    const lo = pass * (BUCKETS / PASSES), hi = lo + BUCKETS / PASSES; // أجزاء متساوية من نطاق الأدلاء const buckets = new Map();
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, f)), crlfDelay: Infinity });
    for await (const line of rl){ if (!line.trim()) continue; let p; try{ p = JSON.parse(line); }catch(_){ continue; } if (!p.name || typeof p.lat !== 'number') continue;
      const names = [p.name].concat(p.common && typeof p.common === 'object' ? Object.values(p.common).filter(x => x && x !== p.name).slice(0, 3) : []); const T = toks(names.join(' '));
      const entry = [p.id, +(+p.lat).toFixed(5), +(+p.lng).toFixed(5), String(p.name).slice(0, 80), String(p.addr || '').slice(0, 60), String(p.locality || '').slice(0, 30)];
      T.forEach(t => { if (stopSet.has(t)) return; const b = bucket4096(t); if (b < lo || b >= hi) return; if (!buckets.has(b)) buckets.set(b, Object.create(null)); const bk = buckets.get(b); (bk[t] = bk[t] || []).push(entry); }); } // كائن بلا وراثة: «constructor» كلمة لا خاصية
    for (const [b, bk] of buckets){ const raw = JSON.stringify(bk); const gz = zlib.gzipSync(Buffer.from(raw), { level: 9 }); bytes += gz.length; if (gz.length > maxBucket) maxBucket = gz.length; Object.values(bk).forEach(a => { postings += a.length; }); fs.writeFileSync(path.join(dir, b + '.json.gz'), gz); }
    buckets.clear();
  }
  fs.writeFileSync(path.join(dir, 'stop.json'), JSON.stringify(stop)); fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ cc, places, postings, buckets: BUCKETS, stop: stop.length, maxBucketKB: Math.round(maxBucket / 1024), mb: +(bytes / 1048576).toFixed(1), builtAt: new Date().toISOString() }));
  report[cc] = { places, postings, stop: stop.length, maxBucketKB: Math.round(maxBucket / 1024), mb: +(bytes / 1048576).toFixed(1) };
  console.log(cc.padEnd(4), 'places', String(places).padStart(9), 'postings', String(postings).padStart(10), 'stop-tokens', String(stop.length).padStart(4), 'max bucket', Math.round(maxBucket / 1024) + ' KB', 'total', (bytes / 1048576).toFixed(0) + ' MB');
}
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1)); console.log('DONE countries', Object.keys(report).length);
