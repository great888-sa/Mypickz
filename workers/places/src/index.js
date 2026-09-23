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
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k); // رمز مثل constructor لا يختلط بخاصية موروثة
  for (const t of qs){ const sh = await shard(env, city, bucketOf(t)); const ids = own(sh.tokens, t) ? sh.tokens[t] : []; const rare = 1 / Math.sqrt(ids.length || 1); ids.forEach(id => { hits.set(id, (hits.get(id) || 0) + rare); if (own(sh.entries, id)) entries[id] = sh.entries[id]; }); }
  return [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 800).filter(e => own(entries, e[0])).map(e => Object.assign({ id: 'ovt:' + e[0] }, entries[e[0]])).filter(x => typeof x.lat === 'number');
}
async function resolveGoogle(raw, debug){ // يتتبّع الرابط ويستخرج الاسم والعنوان من المسار أو من عنوان الصفحة — لا يقرأ الإحداثيات أبدًا (الثابت السابع)
  let u; try{ u = new URL(raw.trim()); }catch(_){ return { error: 'bad url' }; } if (!GOOGLE_HOSTS.test(u.hostname)) return { error: 'not a google maps link' };
  const H = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en,ar;q=0.8', 'Accept': 'text/html' };
  let final = u.href, html = '';
  try{ let r = await fetch(u.href, { redirect: 'follow', headers: H, cf: { cacheTtl: 86400 } }); final = r.url || final;
    if (/consent\.google\./i.test(new URL(final).hostname)){ const c = new URL(final).searchParams.get('continue'); if (c){ r = await fetch(c, { redirect: 'follow', headers: Object.assign({}, H, { Cookie: 'CONSENT=YES+; SOCS=CAI' }) }); final = r.url || c; } }
    let txt = await r.text(); html = txt.slice(0, 400000);
    const SHORT = /^(maps\.app\.goo\.gl|goo\.gl)$/i;
    if (SHORT.test(new URL(final).hostname)){ // صفحة وسيطة بلا إعادة توجيه: (١) الطلب بلا معلمات (g_st) · (٢) رابط الوجهة داخل نص الصفحة
      const bare = new URL(u.href); bare.search = '';
      try{ const r2 = await fetch(bare.href, { redirect: 'follow', headers: H }); if (r2.url && !SHORT.test(new URL(r2.url).hostname)){ final = r2.url; txt = await r2.text(); html = txt.slice(0, 400000); } }catch(_){ }
      if (SHORT.test(new URL(final).hostname)){ const mm = html.match(/https?:\/\/(?:www\.google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps[^"'<>\s\\]{0,600}/); if (mm){ final = mm[0].replace(/&amp;/g, '&').replace(/\\u0026/g, '&'); try{ const r3 = await fetch(final, { redirect: 'follow', headers: H }); final = r3.url || final; txt = await r3.text(); html = txt.slice(0, 400000); }catch(_){ } } }
    } }catch(_){ }
  const looksLikeToken = s => !/[A-Za-z\u0600-\u06FF]/.test(s) || (s.length > 40 && !/\s/.test(s));
  let name = '', addr = '';
  const m = final.match(/\/maps\/place\/([^/?#]+)/);
  const dec = x => { let y = x; for (let k = 0; k < 2; k++){ try{ const z = decodeURIComponent(y); if (z === y) break; y = z; }catch(_){ break; } } return y; }; // ترميز مضاعف (Constituci%25C3%25B3n)
  if (m){ const seg = dec(m[1].replace(/\+/g, ' ')); if (!looksLikeToken(seg)){ const parts = seg.split(',').map(x => x.trim()).filter(Boolean); name = parts[0] || ''; addr = parts.slice(1).join(', '); } }
  if (!name && html){ // عنوان الصفحة: og:title = «الاسم · العنوان» أو <title>الاسم - Google Maps</title>
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    let t = og ? og[1] : ((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '');
    t = t.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s*[-–]\s*Google Maps\s*$/i, '').replace(/\s*·\s*Google Maps\s*$/i, '').trim();
    if (t && !/^Google Maps$/i.test(t)){ const parts = t.split(/\s*[·•]\s*/); name = parts[0].trim(); addr = parts.slice(1).join(' · ').trim(); }
  }
  if (!name){ try{ const q = new URL(final).searchParams.get('q'); if (q && !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(q)) name = q; }catch(_){ } }
  for (let k = 0; k < 3 && /^https?:\/\//i.test(name); k++){ // رابط متداخل (maps?q=… أو /maps/place/…) → يُفكّ حتى يبقى نص
    try{ const inner = new URL(name); const q = inner.searchParams.get('q'); const mm = inner.pathname.match(/\/maps\/place\/([^/?#]+)/); name = q ? dec(q) : (mm ? dec(mm[1].replace(/\+/g, ' ')) : ''); }catch(_){ name = ''; }
  }
  if (name && !addr && name.indexOf(',') > 0){ const parts = name.split(',').map(x => x.trim()).filter(Boolean); name = parts[0]; addr = parts.slice(1).join(', '); } // «Molto, Al Imam Saud Rd, As Sahafah, Riyadh» → الاسم والعنوان
  if (/^-?\d+(\.\d+)?$/.test(name)) name = ''; // لا نقبل رقمًا (إحداثية) اسمًا
  let host = ''; try{ host = new URL(final).hostname; }catch(_){ }
  const out = { name: name.slice(0, 120), addr: addr.slice(0, 160), host }; // لا lat/lng إطلاقًا
  if (debug){ let path = ''; try{ const f = new URL(final); path = (f.pathname + f.search).replace(/@-?\d+\.?\d*,-?\d+\.?\d*[^/]*/g, '@…').replace(/[?&](ll|q|center|sll|near)=-?\d+\.?\d*,-?\d+\.?\d*/g, '?…').slice(0, 200); }catch(_){ }
    const t = (html.match(/<title>([^<]{0,160})<\/title>/i) || [])[1] || ''; const og = (html.match(/property=["']og:title["'][^>]+content=["']([^"']{0,160})["']/i) || [])[1] || '';
    out.debug = { path, title: t, og, htmlBytes: html.length, hasConsent: /consent\.google/i.test(final) }; } // المسار بلا إحداثيات
  return out;
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
    if (url.pathname === '/resolve'){ const raw = url.searchParams.get('url') || ''; if (!raw) return json({ error: 'url required' }, origin, 400); return json(await resolveGoogle(raw, url.searchParams.get('debug') === '1'), origin); }
    if (url.pathname === '/health'){ const obj = await env.PLACES.head('ovt/manifest.json'); return json({ ok: true, data: !!obj, at: new Date().toISOString() }, origin); }
    return new Response('MyPickz places', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
};
