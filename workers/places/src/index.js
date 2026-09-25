// MyPickz — workers/places/src/index.js (ز-١-أ): عامل الأماكن — /match (Overture بمخزن R2، كلفة صفر) · /resolve (اسم المكان من رابط جوجل — لا إحداثيات من جوجل أبدًا: الثابت السابع)
import { toks, splitName, decide, bucketOf, normAr } from './match.js';
const ALLOWED_ORIGINS = ['https://mypickz.app', 'https://test.mypickz.app'];
// ز-١-ج v1.2: التغطية بالخلايا الجغرافية (٠٫١° ≈ ١١ كم) — manifest الخلايا يُقرأ من R2 مرة لكل عزلة (~٢ ميغابايت للمناطق الكاملة)
let manifestCache = null, manifestAt = 0;
async function manifest(env){ if (manifestCache && Date.now() - manifestAt < 900000) return manifestCache; try{ const o = await env.PLACES.get('cells/manifest.json'); manifestCache = o ? await o.json() : { cells: {} }; }catch(_){ manifestCache = { cells: {} }; } manifestAt = Date.now(); return manifestCache; }
function cellsAround(lat, lng, rKm){ const size = 11.1; const dl = Math.min(4, Math.ceil(rKm / size)); const dg = Math.min(6, Math.ceil(rKm / (size * Math.max(0.2, Math.cos(lat * Math.PI / 180))))); const cy = Math.floor(lat * 10), cx = Math.floor(lng * 10); const out = []; for (let y = cy - dl; y <= cy + dl; y++) for (let x = cx - dg; x <= cx + dg; x++) out.push('c' + y + '_' + x); return out.slice(0, 81); }
async function readJson(env, key){ const o = await env.PLACES.get(key); if (!o) return null; if (key.endsWith('.gz')){ const ds = new DecompressionStream('gzip'); const txt = await new Response(o.body.pipeThrough(ds)).text(); return JSON.parse(txt); } return o.json(); }
const GOOGLE_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|www\.google\.[a-z.]+|google\.[a-z.]+|maps\.google\.[a-z.]+)$/i;
function cors(origin){ const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]; return { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }; }
const json = (obj, origin, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors(origin) });
const shardCache = new Map(); // ذاكرة العزلة: مدينة/شظية → {tokens, entries}
async function cellShard(env, key){ if (shardCache.has(key)) return shardCache.get(key); let data = null; try{ data = await readJson(env, 'cells/' + key + '.json.gz'); }catch(_){ } data = data || { tokens: {}, entries: {} }; if (shardCache.size > 96) shardCache.clear(); shardCache.set(key, data); return data; }
async function candidatesFor(env, m, lat, lng, rKm, name){ // v1.2: الخلايا حول مركز المدينة (لا معرّف المدينة) — يعيد null إن لم توجد تغطية
  const qs = new Set(); splitName(name).forEach(n => toks(n).forEach(t => qs.add(t))); if (!qs.size) return [];
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k); const cells = cellsAround(lat, lng, rKm).filter(c => own(m.cells || {}, c)); if (!cells.length) return null;
  const hits = new Map(); const entries = {};
  for (const c of cells){ const parts = m.cells[c] || 1; for (const t of qs){ const key = parts === 1 ? c : (c + '.' + (parseInt(bucketOf(t), 16) % parts)); const sh = await cellShard(env, key); const ids = own(sh.tokens, t) ? sh.tokens[t] : []; const rare = 1 / Math.sqrt(ids.length || 1); ids.forEach(id => { hits.set(id, (hits.get(id) || 0) + rare); if (own(sh.entries, id)) entries[id] = sh.entries[id]; }); } }
  return [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 800).filter(e => own(entries, e[0])).map(e => Object.assign({ id: 'ovt:' + e[0] }, entries[e[0]])).filter(x => typeof x.lat === 'number');
}
const UNIT_RE = /\b(shop|unit|building|bldg|floor|office|suite|store|tower|block|villa|gate|plot|no\.?|رقم|محل|مبنى|الدور|مكتب|شارع|طريق|حي|road|rd|st|street|ave|avenue|rue|via|calle|strasse|str|blvd|boulevard|highway|hwy|district)\b/i;
function pickNamePart(parts){ // الجزء الذي يشبه اسم مكان: حروف أكثر، أرقام أقل، لا أوصاف وحدات/شوارع، ولا مدينة/دولة في الذيل
  let best = 0, bestS = -1e9; const n = parts.length;
  parts.forEach((x, i) => { const letters = (x.match(/[A-Za-z\u0600-\u06FF]/g) || []).length, digits = (x.match(/\d/g) || []).length; let sc = Math.min(letters, 12) - 6 * digits - (UNIT_RE.test(x) ? 30 : 0) - (i >= n - 2 && n > 2 ? 6 : 0) - i; if (letters < 2) sc -= 50; if (sc > bestS){ bestS = sc; best = i; } });
  return best;
}
async function resolveGoogle(raw, debug){ // يتتبّع الرابط ويستخرج الاسم والعنوان من المسار أو من عنوان الصفحة — لا يقرأ الإحداثيات أبدًا (الثابت السابع)
  let u; try{ u = new URL(raw.trim()); }catch(_){ return { error: 'bad url' }; } if (!GOOGLE_HOSTS.test(u.hostname)) return { error: 'not a google maps link' };
  const H = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en,ar;q=0.8', 'Accept': 'text/html' };
  let final = u.href, html = '';
  const SHORT0 = /^(maps\.app\.goo\.gl|goo\.gl)$/i;
  if (SHORT0.test(u.hostname)){ // الرابط المختصر: بهوية غير متصفح تعيد المنصة إعادة توجيه صريحة إلى الوجهة (بدل صفحة «فتح بالتطبيق»)
    try{ const r0 = await fetch(u.href, { redirect: 'manual', headers: { 'User-Agent': 'curl/8.6.0', 'Accept': '*/*' } }); const loc = r0.headers.get('location'); if (loc) u = new URL(loc, u.href); }catch(_){ }
  }
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
  if (m){ const seg = dec(m[1].replace(/\+/g, ' ')); if (!looksLikeToken(seg)){ const parts = seg.split(',').map(x => x.trim()).filter(Boolean); const k = pickNamePart(parts); name = parts[k] || ''; addr = parts.filter((_, i) => i !== k).join(', '); } }
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
  if (name && !addr && name.indexOf(',') > 0){ const parts = name.split(',').map(x => x.trim()).filter(Boolean); const k = pickNamePart(parts); name = parts[k]; addr = parts.filter((_, i) => i !== k).join(', '); } // «Shop 2104 Building, Caribou Coffee…, 1435 Rd 4626, Manama» → الاسم الجزء الأعلى حروفًا بلا أوصاف الوحدات؛ الباقي عنوان
  if (/^-?\d+(\.\d+)?$/.test(name)) name = ''; // لا نقبل رقمًا (إحداثية) اسمًا
  let host = ''; try{ host = new URL(final).hostname; }catch(_){ }
  const out = { name: name.slice(0, 120), addr: addr.slice(0, 160), host }; // لا lat/lng إطلاقًا
  if (debug){ let path = ''; try{ const f = new URL(final); path = (f.pathname + f.search).replace(/@-?\d+\.?\d*,-?\d+\.?\d*[^/]*/g, '@…').replace(/[?&](ll|q|center|sll|near)=-?\d+\.?\d*,-?\d+\.?\d*/g, '?…').slice(0, 200); }catch(_){ }
    const t = (html.match(/<title>([^<]{0,160})<\/title>/i) || [])[1] || ''; const og = (html.match(/property=["']og:title["'][^>]+content=["']([^"']{0,160})["']/i) || [])[1] || '';
    const mask = x => String(x).replace(/-?\d{1,3}\.\d{3,}/g, '#').replace(/\s+/g, ' ');
    const urls = [...new Set((html.match(/https?:\/\/[^"'<>\s\\]{8,160}/g) || []).map(x => { try{ return new URL(x.replace(/&amp;/g, '&')).hostname + new URL(x.replace(/&amp;/g, '&')).pathname.slice(0, 40); }catch(_){ return ''; } }).filter(Boolean))].slice(0, 12);
    out.debug = { path, title: t, og, htmlBytes: html.length, hasConsent: /consent\.google/i.test(final), urls, snippet: mask(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).slice(0, 600) }; } // المسار بلا إحداثيات
  return out;
}

const gazCache = new Map();
async function gazShard(env, key){ if (gazCache.has(key)) return gazCache.get(key); let d = null; try{ d = await readJson(env, 'gaz/idx/' + key + '.json'); }catch(_){ } d = d || []; if (gazCache.size > 128) gazCache.clear(); gazCache.set(key, d); return d; }
const hexOf = s => [...s].map(ch => ch.codePointAt(0).toString(16).padStart(4, '0')).join('');
async function searchCities(env, q, cc){ // ز-١-ج: بحث بالمعجم — شظية البادئة (حرفان) ثم ترشيح بالبادئة الكاملة وترتيب بالسكان
  const nq = normAr(q); if (nq.length < 2) return []; const key = hexOf(nq.slice(0, 2)); const arr = await gazShard(env, key);
  const hits = arr.filter(c => (!cc || c.cc === cc) && (normAr(c.n).startsWith(nq) || normAr(c.ar || '').startsWith(nq) || normAr(c.n).split(' ').some(w => w.startsWith(nq))));
  return hits.sort((a, b) => b.p - a.p).slice(0, 8).map(c => ({ id: String(c.id), name: c.n, nameAr: c.ar || '', cc: c.cc, lat: c.lat, lng: c.lng }));
}
async function logRequest(env, city){ try{ const k = 'req/' + city; if (!(await env.PLACES.head(k))) await env.PLACES.put(k, JSON.stringify({ city, at: new Date().toISOString() })); }catch(_){ } } // مدينة طُلبت ولا بيانات لها — يجهّزها السير الأسبوعي
export const cellsAroundForTest = cellsAround; // للاختبار
export default {
  async fetch(request, env){
    const url = new URL(request.url); const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'GET') return json({ error: 'method' }, origin, 405);
    if (url.pathname === '/match'){ // v1.2: ?city=<geonameid>&lat=&lng=&r=<km>&name=&addr=
      const city = (url.searchParams.get('city') || '').trim(), name = (url.searchParams.get('name') || '').slice(0, 120), addr = (url.searchParams.get('addr') || '').slice(0, 160);
      const lat = parseFloat(url.searchParams.get('lat')), lng = parseFloat(url.searchParams.get('lng')), rKm = Math.min(30, Math.max(3, parseFloat(url.searchParams.get('r')) || 12));
      if (!name.trim()) return json({ error: 'name required', candidates: [] }, origin, 400);
      if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return json({ error: 'lat/lng required', candidates: [] }, origin, 400);
      const m = await manifest(env); const cands = await candidatesFor(env, m, lat, lng, rKm, name);
      if (cands === null){ if (/^[A-Za-z0-9_-]{1,40}$/.test(city)) await logRequest(env, city); return json({ noData: true, candidates: [] }, origin, 200); } // لا تغطية — ليس خطأ؛ الخريطة والدبوس يعملان · الطلب يُسجَّل للخلفي
      return json(decide(name, addr, cands), origin);
    }
    if (url.pathname === '/cities'){ const q = (url.searchParams.get('q') || '').slice(0, 60), cc = (url.searchParams.get('cc') || '').toUpperCase().slice(0, 2); return json({ results: await searchCities(env, q, cc) }, origin); } // ز-١-ج
    if (url.pathname === '/requests'){ const list = await env.PLACES.list({ prefix: 'req/' }); return json({ cities: (list.objects || []).map(o => o.key.slice(4)) }, origin); } // للسير الأسبوعي
    if (url.pathname === '/resolve'){ const raw = url.searchParams.get('url') || ''; if (!raw) return json({ error: 'url required' }, origin, 400); return json(await resolveGoogle(raw, url.searchParams.get('debug') === '1'), origin); }
    if (url.pathname === '/health'){ const m = await manifest(env); const g = await env.PLACES.head('gaz/manifest.json'); return json({ ok: true, data: Object.keys(m.cells || {}).length > 0, cells: Object.keys(m.cells || {}).length, release: m.release || '', gazetteer: !!g, at: new Date().toISOString() }, origin); }
    return new Response('MyPickz places', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
};
