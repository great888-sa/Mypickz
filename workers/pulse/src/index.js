// MyPickz — workers/places/src/index.js (ز-١-أ): عامل الأماكن — /match (Overture بمخزن R2، كلفة صفر) · /resolve (اسم المكان من رابط جوجل — لا إحداثيات من جوجل أبدًا: الثابت السابع)
import { toks, splitName, decide, bucketOf } from './match.js';
const ALLOWED_ORIGINS = ['https://mypickz.app', 'https://test.mypickz.app'];
const CITIES = new Set(['riyadh', 'jeddah', 'khobar', 'paris', 'madrid', 'cannes', 'milan', 'geneva', 'rome', 'florence', 'london', 'dubai', 'athens', 'barcelona', 'capri', 'nyc', 'beirut', 'manama']);
const GOOGLE_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|www\.google\.[a-z.]+|google\.[a-z.]+|maps\.google\.[a-z.]+)$/i;
function cors(origin){ const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]; return { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }; }
const json = (obj, origin, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors(origin) });
const shardCache = new Map(); // ذاكرة العزلة: مدينة/شظية → {tokens, entries}
async function shard(env, city, b){ const k = city + '/' + b; if (shardCache.has(k)) return shardCache.get(k); const obj = await env.PLACES.get('ovt/' + city + '/' + b + '.json'); const data = obj ? await obj.json() : { tokens: {}, entries: {} }; if (shardCache.size > 64) shardCache.clear(); shardCache.set(k, data); return data; }
async function candidatesFor(env, city, name){
  const qs = new Set(); splitName(name).forEach(n => toks(n).forEach(t => qs.add(t))); if (!qs.size) return [];
  const hits = new Map(); const entries = {};
  for (const t of qs){ const sh = await shard(env, city, bucketOf(t)); const ids = sh.tokens[t] || []; const rare = 1 / Math.sqrt(ids.length || 1); ids.forEach(id => { hits.set(id, (hits.get(id) || 0) + rare); if (sh.entries[id]) entries[id] = sh.entries[id]; }); }
  return [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 800).map(e => Object.assign({ id: 'ovt:' + e[0] }, entries[e[0]])).filter(x => typeof x.lat === 'number');
}
async function resolveGoogle(raw){ // يتتبّع الرابط ويستخرج الاسم من مسار /maps/place/<name>/… — لا يقرأ الإحداثيات
  let u; try{ u = new URL(raw); }catch(_){ return { error: 'bad url' }; } if (!GOOGLE_HOSTS.test(u.hostname)) return { error: 'not a google maps link' };
  let final = u.href; try{ const r = await fetch(u.href, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 MyPickz-Resolve/1.0', 'Accept-Language': 'en' }, cf: { cacheTtl: 86400 } }); final = r.url || final; }catch(_){ }
  const m = final.match(/\/maps\/place\/([^/?#]+)/); let name = '', addr = '';
  if (m){ const seg = decodeURIComponent(m[1].replace(/\+/g, ' ')); const parts = seg.split(',').map(s => s.trim()).filter(Boolean); name = parts[0] || ''; addr = parts.slice(1).join(', '); }
  if (!name){ const q = new URL(final).searchParams.get('q'); if (q && !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(q)) name = q; }
  return { name: name.slice(0, 120), addr: addr.slice(0, 160), host: new URL(final).hostname }; // لا lat/lng إطلاقًا
}
export default {
  async fetch(request, env){
    const url = new URL(request.url); const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'GET') return json({ error: 'method' }, origin, 405);
    if (url.pathname === '/match'){
      const city = (url.searchParams.get('city') || '').toLowerCase(), name = (url.searchParams.get('name') || '').slice(0, 120), addr = (url.searchParams.get('addr') || '').slice(0, 160);
      if (!CITIES.has(city)) return json({ error: 'city not indexed', candidates: [] }, origin, 200);
      if (!name.trim()) return json({ error: 'name required', candidates: [] }, origin, 400);
      const cands = await candidatesFor(env, city, name); return json(decide(name, addr, cands), origin);
    }
    if (url.pathname === '/resolve'){ const raw = url.searchParams.get('url') || ''; if (!raw) return json({ error: 'url required' }, origin, 400); return json(await resolveGoogle(raw), origin); }
    if (url.pathname === '/health'){ const obj = await env.PLACES.head('ovt/manifest.json'); return json({ ok: true, data: !!obj, at: new Date().toISOString() }, origin); }
    return new Response('MyPickz places', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
};
