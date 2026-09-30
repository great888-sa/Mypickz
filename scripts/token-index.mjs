// MyPickz — scripts/token-index.mjs v2 (الفهرس بالكلمة أولًا · لكل دولة · قراءة بالمدى): من scripts/eval/cells/<CC>.jsonl إلى tok/<CC>/<bucket>.bin (كتلة مضغوطة لكل كلمة) + <bucket>.dir.json.gz (كلمة → [موضع، طول، عدد]) — العامل يقرأ الدليل ثم بايتات الكلمة وحدها
// السؤال الواحد = ≤ ٥ قراءات صغيرة مهما كبرت المدينة · الكلمات الشائعة جدًّا بالدولة (> STOP_MAX ظهورًا) تُسقط وتُسجَّل بـ stop.json · المرور على الملف بمراحل (حزم أدلاء) لضبط الذاكرة
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import readline from 'readline';
import { toks, bucketOf } from '../workers/places/src/match.js';
const SRC = 'scripts/eval/cells', OUT = 'scripts/eval/r2/tok'; const PASSES = 4, STOP_MAX = 12000; // كلمة > ١٢ ألف ظهور بالدولة = توقف (الدلو يبقى صغيرًا)
let BUCKETS = 4096; // الدول > مليوني مكان: ١٦٬٣٨٤ دلوًا (أكبر دلو ~٣٠٠ ك.ب) — العدد يُكتب ببيان الدولة ويقرؤه العامل
function bucket4096(t){ let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h % BUCKETS; }
const report = {};
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.jsonl'))){
  const cc = f.replace('.jsonl', ''); const dir = path.join(OUT, cc); fs.mkdirSync(dir, { recursive: true });
  const counts = new Map(), addrWords = new Map(), localities = new Map(), postcodes = new Map(); // مرور أول: كلمات الاسم (للتوقف) · كلمات العنوان (مفردات الشارع) · الأحياء · أنماط الرمز البريدي — مفردات العنوان مشتقة من بيانات الدولة لا مخمَّنة
  let places = 0, withAddr = 0;
  await (async () => { const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, f)), crlfDelay: Infinity }); for await (const line of rl){ if (!line.trim()) continue; let p; try{ p = JSON.parse(line); }catch(_){ continue; } if (!p.name || typeof p.lat !== 'number') continue; places++; const names = [p.name].concat(p.common && typeof p.common === 'object' ? Object.values(p.common).filter(x => x && x !== p.name).slice(0, 3) : []); toks(names.join(' ')).forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    if (p.addr){ withAddr++; toks(p.addr).forEach(t => { if (!/\d/.test(t) && t.length > 1) addrWords.set(t, (addrWords.get(t) || 0) + 1); }); const pc = /\b(\d{4,6}|[A-Z]\d[A-Z0-9]? ?\d[A-Z]{2})\b/i.exec(p.addr); if (pc){ const pat = pc[1].replace(/\d/g, '9').replace(/[A-Za-z]/g, 'A'); postcodes.set(pat, (postcodes.get(pat) || 0) + 1); } }
    if (p.locality && String(p.locality).trim()){ const l = String(p.locality).trim().slice(0, 40); localities.set(l, (localities.get(l) || 0) + 1); } } })();
  const stop = [...counts.entries()].filter(([, n]) => n > STOP_MAX).map(([t]) => t); const stopSet = new Set(stop);
  const streetWords = [...addrWords.entries()].filter(([, n]) => n >= Math.max(200, withAddr * 0.002)).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([t]) => t); // كلمات الشارع: الأكثر تكرارًا بحقل العنوان (rue · quai · straße · شارع …)
  const postcodePatterns = [...postcodes.entries()].filter(([, n]) => n >= Math.max(100, withAddr * 0.001)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  const localityList = [...localities.entries()].filter(([, n]) => n >= 20).sort((a, b) => b[1] - a[1]).slice(0, 4000).map(([t]) => t); // الأحياء والبلدات المعروفة بالدولة (≥ ٢٠ مكانًا) BUCKETS = 4096; // بالصيغة ٢ حجم الدلو لا يهم القارئ (يقرأ الكلمة وحدها) — ٤٠٩٦ لكل الدول
  let bytes = 0, postings = 0, maxBucket = 0;
  for (let pass = 0; pass < PASSES; pass++){
    const lo = pass * (BUCKETS / PASSES), hi = lo + BUCKETS / PASSES; const buckets = new Map(); // أجزاء متساوية من نطاق الأدلاء
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, f)), crlfDelay: Infinity });
    for await (const line of rl){ if (!line.trim()) continue; let p; try{ p = JSON.parse(line); }catch(_){ continue; } if (!p.name || typeof p.lat !== 'number') continue;
      const names = [p.name].concat(p.common && typeof p.common === 'object' ? Object.values(p.common).filter(x => x && x !== p.name).slice(0, 3) : []); const T = toks(names.join(' '));
      const entry = [p.id, +(+p.lat).toFixed(5), +(+p.lng).toFixed(5), String(p.name).slice(0, 80), String(p.addr || '').slice(0, 60), String(p.locality || '').slice(0, 30)];
      T.forEach(t => { if (stopSet.has(t)) return; const b = bucket4096(t); if (b < lo || b >= hi) return; if (!buckets.has(b)) buckets.set(b, Object.create(null)); const bk = buckets.get(b); (bk[t] = bk[t] || []).push(entry); }); } // كائن بلا وراثة: «constructor» كلمة لا خاصية
    for (const [b, bk] of buckets){ const parts = [], dirIdx = Object.create(null); let off = 0; // الصيغة ٢: كتلة مضغوطة لكل كلمة داخل ملف الدلو + دليل (قراءة بالمدى: الكلمة وحدها تُنزَّل)
      for (const t of Object.keys(bk)){ const arr = bk[t]; const gz = zlib.gzipSync(Buffer.from(JSON.stringify(arr)), { level: 9 }); dirIdx[t] = [off, gz.length, arr.length]; parts.push(gz); off += gz.length; postings += arr.length; if (gz.length > maxBucket) maxBucket = gz.length; }
      const bin = Buffer.concat(parts); const dgz = zlib.gzipSync(Buffer.from(JSON.stringify(dirIdx)), { level: 9 }); bytes += bin.length + dgz.length; fs.writeFileSync(path.join(dir, b + '.bin'), bin); fs.writeFileSync(path.join(dir, b + '.dir.json.gz'), dgz); }
    buckets.clear();
  }
  fs.writeFileSync(path.join(dir, 'stop.json'), JSON.stringify(stop)); fs.writeFileSync(path.join(dir, 'vocab.json'), JSON.stringify({ streetWords, postcodePatterns, localities: localityList })); fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ cc, format: 2, places, postings, buckets: BUCKETS, stop: stop.length, streetWords: streetWords.length, localities: localityList.length, postcodePatterns, maxTokenKB: Math.round(maxBucket / 1024), mb: +(bytes / 1048576).toFixed(1), builtAt: new Date().toISOString() }));
  report[cc] = { places, postings, stop: stop.length, maxTokenKB: Math.round(maxBucket / 1024), mb: +(bytes / 1048576).toFixed(1) };
  console.log(cc.padEnd(4), 'places', String(places).padStart(9), 'postings', String(postings).padStart(10), 'stop-tokens', String(stop.length).padStart(4), 'street-words', streetWords.length, '(' + streetWords.slice(0, 6).join(',') + ')', 'postcodes', JSON.stringify(postcodePatterns), 'localities', localityList.length, 'max token blob', Math.round(maxBucket / 1024) + ' KB', 'total', (bytes / 1048576).toFixed(0) + ' MB');
}
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1)); console.log('DONE countries', Object.keys(report).length);
