// MyPickz — scripts/overture-index.mjs v3 (ز-١-ج-١ v1.2): من ملفات الخلايا (scripts/eval/cells/cell=<c>/…jsonl) إلى شظايا R2 مضغوطة: cells/<c>.json.gz = { tokens: {tok: [ids]}, entries: {id: {…}} }
// الخلية الكبيرة (> 25k مدخل) تُقسَّم إلى أجزاء بتجزئة الرمز: cells/<c>.<k>.json.gz · المخرج: scripts/eval/r2/cells/ + cells/manifest.json { release, cells: {c: parts} }
import fs from 'fs'; import path from 'path'; import zlib from 'zlib';
import { toks, bucketOf } from '../workers/places/src/match.js';
const SRC = 'scripts/eval/cells', OUT = 'scripts/eval/r2/cells'; fs.mkdirSync(OUT, { recursive: true });
const prevPath = OUT + '/manifest.json'; const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : { cells: {} };
const extract = fs.existsSync(SRC + '/_extract.json') ? JSON.parse(fs.readFileSync(SRC + '/_extract.json', 'utf8')) : {};
const manifest = { builtAt: new Date().toISOString(), release: extract.release || prev.release || '', cells: prev.cells || {} };
const MAX = 25000, PARTS = 8; let cellsDone = 0, places = 0, bytes = 0;
const cellDirs = new Map(); // cell → [مسارات المجلدات من كل الصناديق]
for (const box of fs.readdirSync(SRC).filter(d => !d.startsWith('_') && fs.statSync(path.join(SRC, d)).isDirectory())){
  for (const d of fs.readdirSync(path.join(SRC, box)).filter(x => x.startsWith('cell='))){ const c = d.slice(5); if (!cellDirs.has(c)) cellDirs.set(c, []); cellDirs.get(c).push(path.join(SRC, box, d)); }
}
for (const [cell, dirs] of cellDirs){
  const entries = Object.create(null); const seen = new Set();
  for (const dir of dirs) for (const f of fs.readdirSync(dir)){
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
    for (const line of lines){ if (!line.trim()) continue; let p; try{ p = JSON.parse(line); }catch(_){ continue; } if (!p.name || typeof p.lat !== 'number' || seen.has(p.id)) continue; seen.add(p.id);
      let names = []; if (p.common && typeof p.common === 'object') names = Object.values(p.common).filter(x => x && x !== p.name).slice(0, 3);
      entries[p.id] = { name: p.name, names, addr: String(p.addr || '').slice(0, 80), locality: String(p.locality || '').slice(0, 40), cat: p.cat || '', lat: +(+p.lat).toFixed(5), lng: +(+p.lng).toFixed(5) }; }
  }
  const ids = Object.keys(entries); if (!ids.length) continue; places += ids.length;
  const parts = ids.length > MAX ? PARTS : 1; const shards = Array.from({ length: parts }, () => ({ tokens: Object.create(null), entries: Object.create(null) }));
  ids.forEach(id => { const e = entries[id]; const T = toks(e.name + ' ' + e.names.join(' ')); T.forEach(t => { const k = parts === 1 ? 0 : (parseInt(bucketOf(t), 16) % parts); const sh = shards[k]; (sh.tokens[t] = sh.tokens[t] || []).push(id); sh.entries[id] = e; }); });
  shards.forEach((sh, k) => { const gz = zlib.gzipSync(Buffer.from(JSON.stringify(sh)), { level: 9 }); bytes += gz.length; fs.writeFileSync(path.join(OUT, cell + (parts === 1 ? '' : '.' + k) + '.json.gz'), gz); });
  manifest.cells[cell] = parts; cellsDone++;
}
fs.writeFileSync(prevPath, JSON.stringify(manifest)); // كبير (~٢ ميغابايت للمناطق) — يُقرأ مرة لكل عزلة بالعامل
console.log('cells', cellsDone, '· places', places, '· ' + (bytes / 1048576).toFixed(1) + ' MB gz · manifest cells', Object.keys(manifest.cells).length, '· release', manifest.release);
