// MyPickz — scripts/overture-index.mjs (ز-١-أ): يحوّل scripts/eval/overture/<city>.json إلى شظايا R2: ovt/<city>/<bucket>.json = { tokens: {tok: [ids]}, entries: {id: {name, names, addr, locality, cat, lat, lng}} }
// ٢٥٦ شظية لكل مدينة بتجزئة الرمز (bucketOf) — العامل يقرأ شظايا رموز الاستعلام فقط · المخرج: scripts/eval/r2/ + manifest.json
import fs from 'fs'; import path from 'path';
import { toks, bucketOf } from '../workers/places/src/match.js';
const SRC = 'scripts/eval/overture', OUT = 'scripts/eval/r2/ovt'; fs.mkdirSync(OUT, { recursive: true });
const manifest = { builtAt: new Date().toISOString(), cities: {} };
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.json'))){
  const city = f.replace(/\.json$/, ''); const arr = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  const shards = {}; let n = 0;
  arr.forEach((p, i) => { if (typeof p.lat !== 'number' || !p.name) return; const id = String(i);
    const entry = { name: p.name, names: (p.names || []).filter(x => x && x !== p.name).slice(0, 3), addr: (p.addr || '').slice(0, 80), locality: (p.locality || '').slice(0, 40), cat: p.cat || '', lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) };
    const T = toks(p.name + ' ' + entry.names.join(' ')); if (!T.size) return; n++;
    T.forEach(t => { const b = bucketOf(t); const sh = shards[b] = shards[b] || { tokens: {}, entries: {} }; (sh.tokens[t] = sh.tokens[t] || []).push(id); sh.entries[id] = entry; }); });
  const dir = path.join(OUT, city); fs.mkdirSync(dir, { recursive: true }); let bytes = 0;
  Object.keys(shards).forEach(b => { const s = JSON.stringify(shards[b]); bytes += s.length; fs.writeFileSync(path.join(dir, b + '.json'), s); });
  manifest.cities[city] = { places: n, shards: Object.keys(shards).length, mb: +(bytes / 1048576).toFixed(1) };
  console.log(city.padEnd(10), 'places', String(n).padStart(7), 'shards', Object.keys(shards).length, (bytes / 1048576).toFixed(1) + ' MB');
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1)); console.log('DONE', JSON.stringify(manifest.cities).length ? 'manifest written' : '');
