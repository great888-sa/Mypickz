// MyPickz — scripts/overture-index.mjs v4 (ز-١-ج-١ v1.2): من ملفات scripts/eval/cells/<label>.jsonl (مرتَّبة بالخلية) إلى شظايا R2 مضغوطة: cells/<c>.json.gz = { tokens: {tok: [ids]}, entries: {id: {…}} }
// قراءة سطرًا سطرًا وإخراج كل خلية حين تنتهي (ذاكرة ثابتة) · الخلية المكتوبة من صندوق سابق تُدمج · الخلية الكبيرة (> 25k) بأجزاء بتجزئة الرمز · manifest.json { release, cells: {c: parts} } متراكم
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import readline from 'readline';
import { toks, bucketOf } from '../workers/places/src/match.js';
const SRC = 'scripts/eval/cells', OUT = 'scripts/eval/r2/cells'; fs.mkdirSync(OUT, { recursive: true });
const prevPath = OUT + '/manifest.json'; const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : { cells: {} };
const extract = fs.existsSync(SRC + '/_extract.json') ? JSON.parse(fs.readFileSync(SRC + '/_extract.json', 'utf8')) : {};
const manifest = { builtAt: new Date().toISOString(), release: extract.release || prev.release || '', cells: prev.cells || {} };
const MAX = 25000, PARTS = 8; let cellsDone = 0, places = 0, bytes = 0; const writtenThisRun = new Set();
function readShard(file){ return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString()); }
function loadExisting(cell){ // خلية كُتبت بهذا التشغيل من صندوق سابق → تُدمج
  const parts = manifest.cells[cell] || 1; const entries = Object.create(null);
  for (let k = 0; k < parts; k++){ const f = path.join(OUT, cell + (parts === 1 ? '' : '.' + k) + '.json.gz'); if (!fs.existsSync(f)) continue; const sh = readShard(f); Object.keys(sh.entries).forEach(id => { entries[id] = sh.entries[id]; }); }
  return entries;
}
function flush(cell, entries){
  if (writtenThisRun.has(cell)){ const old = loadExisting(cell); Object.keys(old).forEach(id => { if (!entries[id]) entries[id] = old[id]; }); }
  const ids = Object.keys(entries); if (!ids.length) return; places += ids.length;
  const parts = ids.length > MAX ? PARTS : 1; const shards = Array.from({ length: parts }, () => ({ tokens: Object.create(null), entries: Object.create(null) }));
  ids.forEach(id => { const e = entries[id]; const T = toks(e.name + ' ' + e.names.join(' ')); T.forEach(t => { const k = parts === 1 ? 0 : (parseInt(bucketOf(t), 16) % parts); const sh = shards[k]; (sh.tokens[t] = sh.tokens[t] || []).push(id); sh.entries[id] = e; }); });
  const oldParts = manifest.cells[cell] || 1; if (oldParts !== parts) for (let k = 0; k < oldParts; k++){ const f = path.join(OUT, cell + (oldParts === 1 ? '' : '.' + k) + '.json.gz'); if (fs.existsSync(f)) fs.unlinkSync(f); }
  shards.forEach((sh, k) => { const gz = zlib.gzipSync(Buffer.from(JSON.stringify(sh)), { level: 9 }); bytes += gz.length; fs.writeFileSync(path.join(OUT, cell + (parts === 1 ? '' : '.' + k) + '.json.gz'), gz); });
  manifest.cells[cell] = parts; writtenThisRun.add(cell); cellsDone++;
}
function entryOf(p){ let names = []; if (p.common && typeof p.common === 'object') names = Object.values(p.common).filter(x => x && x !== p.name).slice(0, 3); return { name: p.name, names, addr: String(p.addr || '').slice(0, 80), locality: String(p.locality || '').slice(0, 40), cat: p.cat || '', lat: +(+p.lat).toFixed(5), lng: +(+p.lng).toFixed(5) }; }
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.jsonl'))){
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(SRC, f)), crlfDelay: Infinity });
  let cur = null, entries = Object.create(null);
  for await (const line of rl){ if (!line.trim()) continue; let p; try{ p = JSON.parse(line); }catch(_){ continue; } if (!p.name || typeof p.lat !== 'number' || !p.cell) continue;
    if (p.cell !== cur){ if (cur !== null) flush(cur, entries); cur = p.cell; entries = Object.create(null); }
    if (!entries[p.id]) entries[p.id] = entryOf(p); }
  if (cur !== null) flush(cur, entries);
  console.log('file', f, 'done');
}
fs.writeFileSync(prevPath, JSON.stringify(manifest));
console.log('cells', cellsDone, '· places', places, '· ' + (bytes / 1048576).toFixed(1) + ' MB gz · manifest cells', Object.keys(manifest.cells).length, '· release', manifest.release);
