// MyPickz — workers/places/test-index.js (ر٧٣-ب-٢): الفهرس v2 والحي من الموضع بمخزن محاكى — بلا شبكة
// يحاكي env.PLACES (R2) فوق fixtures/XX ويمرّ عبر fetch(request, env) نفسها: /match · /match-batch · /area · noData · تسجيل الطلب · القراءة بالمدى هي المسلوكة
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import worker from './src/index.js';
const here = path.dirname(fileURLToPath(import.meta.url)); const FIX = path.join(here, 'fixtures');
let fails = 0; const ok = (n, c, why) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (c ? '' : '  →  ' + (why || ''))); if (!c) fails++; };

// ═══ محاكي R2: المفتاح tok/XX/… ↔ fixtures/XX/tok/… · div/XX/… ↔ fixtures/XX/div/… · يسجّل كل قراءة (كاملة أو بالمدى) وكل كتابة
const log = { gets: [], ranges: [], puts: [] }; const store = new Map();
function fileOf(key){ const m = /^(tok|div)\/([A-Z]{2})\/(.+)$/.exec(key); if (!m) return null; const p = path.join(FIX, m[2], m[1], m[3]); return fs.existsSync(p) ? p : null; }
function r2Object(buf){ return { body: new Blob([buf]).stream(), httpEtag: '"fixture"', json: async () => JSON.parse(buf.toString('utf8')), text: async () => buf.toString('utf8'), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }; }
const PLACES = {
  async get(key, opts){ if (store.has(key)) return r2Object(Buffer.from(store.get(key))); const f = fileOf(key); if (!f) return null; let buf = fs.readFileSync(f);
    if (opts && opts.range){ log.ranges.push(key); buf = buf.subarray(opts.range.offset, opts.range.offset + opts.range.length); } else log.gets.push(key); return r2Object(buf); },
  async head(key){ return store.has(key) || fileOf(key) ? { key } : null; },
  async put(key, val){ log.puts.push(key); store.set(key, String(val)); },
  async list({ prefix }){ return { objects: [...store.keys()].filter(k => k.startsWith(prefix || '')).map(key => ({ key })) } }
};
const env = { PLACES };
const ORIGIN = 'https://test.mypickz.app';
async function GET(pathAndQuery){ const r = await worker.fetch(new Request('https://places.mypickz.app' + pathAndQuery, { headers: { Origin: ORIGIN } }), env); return { status: r.status, body: await r.json(), headers: r.headers }; }
async function POST(p, body){ const r = await worker.fetch(new Request('https://places.mypickz.app' + p, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env); return { status: r.status, body: await r.json(), headers: r.headers }; }
const CENTER = { lat: 0.51, lng: 0.51, r: 12 }; // مركز المدينة الاصطناعية ونصف قطرها (كم)

// ═══ ١) /match-batch بالفهرس v2
const b1 = await POST('/match-batch', { cc: 'XX', ...CENTER, items: [
  { name: 'Dalmata', addr: '8 Rue Tiquetonne' },      // اسم + عنوان شارع → يقين لفرع الوسط لا فرع الميناء
  { name: 'Dalmata' },                                 // فرعان بعيدان بلا عنوان → غموض (مرشَّحون بلا حكم)
  { name: 'Em Sherif' },                               // اسم فريد بلا عنوان → يقين بالاسم وحده (≥ ٠٫٩)
  { name: 'Al Deera Restaurant' },                     // الاسم الشائع الإنجليزي لمكان عربي (common) مفهرس
  { name: 'Far Away Diner' },                          // موجود بالدولة لكن خارج نصف القطر (×١٫٣) → لا مرشَّح
  { name: 'Totally Unknown Place' }                    // لا شيء يشبهه
] });
ok('match-batch: 200 · index = token2 (الفهرس v2 هو المُجيب)', b1.status === 200 && b1.body.index === 'token2', JSON.stringify(b1.body).slice(0, 200));
const R = b1.body.results || [];
ok('match-batch: name + street address → auto = x001 (Centre branch, not Port)', R[0] && R[0].auto && R[0].auto.id === 'ovt:x001', JSON.stringify(R[0]));
ok('match-batch: same name, two far branches, no address → no auto · 2 candidates', R[1] && !R[1].auto && R[1].candidates.length === 2, JSON.stringify(R[1]));
ok('match-batch: unique exact name without address → auto = x004', R[2] && R[2].auto && R[2].auto.id === 'ovt:x004', JSON.stringify(R[2]));
ok('match-batch [current behaviour · مقيَّد للقرار]: common (English) name of an Arabic place is INDEXED for retrieval but the posting carries no alternative names, so nameSim scores it 0 → no candidates', R[3] && !R[3].auto && R[3].candidates.length === 0, JSON.stringify(R[3]));
const ar = await POST('/match-batch', { cc: 'XX', ...CENTER, items: [{ name: 'مطعم الديرة' }] });
ok('match-batch: Arabic primary name with Arabic normalization (ال · ة) → auto = x031', ar.body.results[0].auto && ar.body.results[0].auto.id === 'ovt:x031', JSON.stringify(ar.body.results[0]));
ok('match-batch: place beyond radius ×1.3 → no candidates', R[4] && !R[4].auto && R[4].candidates.length === 0, JSON.stringify(R[4]));
ok('match-batch: unknown name → no candidates', R[5] && R[5].candidates.length === 0, JSON.stringify(R[5]));
ok('match-batch: candidate shape {id, name, addr, locality, lat, lng, score}', R[0] && ['id', 'name', 'addr', 'locality', 'lat', 'lng', 'score'].every(k => k in R[0].auto), JSON.stringify(R[0] && R[0].auto));
ok('CORS: Access-Control-Allow-Origin echoes the allowed test origin', b1.headers.get('Access-Control-Allow-Origin') === ORIGIN);

// ═══ ٢) القراءة بالمدى هي المسلوكة — لا تنزيل لملف دلو كامل
ok('range reads happened on <bucket>.bin only', log.ranges.length > 0 && log.ranges.every(k => /^tok\/XX\/\d+\.bin$/.test(k)), JSON.stringify(log.ranges.slice(0, 5)));
ok('no full read of any .bin (only manifest · stop · vocab · .dir.json.gz)', log.gets.every(k => !k.endsWith('.bin')) && log.gets.some(k => k.endsWith('.dir.json.gz')), JSON.stringify(log.gets.slice(0, 8)));
const n1 = log.ranges.length; await POST('/match-batch', { cc: 'XX', ...CENTER, items: [{ name: 'Dalmata' }] });
ok('second ask for the same token is served from the isolate cache (no new range read)', log.ranges.length === n1, 'ranges ' + n1 + ' → ' + log.ranges.length);

// ═══ ٣) /match (المفرد) بالفهرس نفسه
const m1 = await GET('/match?cc=XX&lat=0.51&lng=0.51&r=12&name=' + encodeURIComponent('Le Peloton Café'));
ok('match (GET): exact name → auto = x003', m1.status === 200 && m1.body.auto && m1.body.auto.id === 'ovt:x003', JSON.stringify(m1.body));
const m2 = await GET('/match?cc=XX&lat=0.51&lng=0.51&name=');
ok('match (GET): empty name → 400', m2.status === 400);
const m3 = await GET('/match?cc=XX&name=Dalmata');
ok('match (GET): missing lat/lng → 400', m3.status === 400);

// ═══ ٤) دولة بلا فهرس → noData + تسجيل الطلب req/<CC> مرة واحدة
const nd = await POST('/match-batch', { cc: 'YY', ...CENTER, items: [{ name: 'Dalmata' }, { name: 'X' }] });
ok('country without index → 200 · noData · one empty result per item', nd.status === 200 && nd.body.noData === true && nd.body.results.length === 2 && nd.body.results.every(r => r.candidates.length === 0), JSON.stringify(nd.body));
ok('request logged once as req/YY', log.puts.filter(k => k === 'req/YY').length === 1, JSON.stringify(log.puts));
await POST('/match-batch', { cc: 'YY', ...CENTER, items: [{ name: 'Dalmata' }] });
ok('second ask for the same country does not log again (head() finds req/YY)', log.puts.filter(k => k === 'req/YY').length === 1, JSON.stringify(log.puts));
const rq = await GET('/requests'); ok('/requests lists YY for the hourly backfill', rq.body.countries.includes('YY'), JSON.stringify(rq.body));
const nd2 = await GET('/match?cc=ZZ&lat=0.5&lng=0.5&name=Dalmata'); ok('match (GET) for a country without index → noData', nd2.body.noData === true && nd2.body.candidates.length === 0);

// ═══ ٥) /area — الحي من الموضع: الأصغر أولًا
const a1 = await GET('/area?cc=XX&lat=0.5015&lng=0.5025');
ok('area: point inside microhood ⊂ neighborhood ⊂ locality → smallest first', a1.body.area === 'Îlot Royal' && a1.body.type === 'microhood' && JSON.stringify(a1.body.chain) === JSON.stringify(['Îlot Royal', 'Quartier Tiquetonne', 'Vieille Ville']), JSON.stringify(a1.body));
const a2 = await GET('/area?cc=XX&lat=0.506&lng=0.506');
ok('area: inside neighborhood but outside microhood → neighborhood', a2.body.area === 'Quartier Tiquetonne' && a2.body.type === 'neighborhood', JSON.stringify(a2.body));
const a3 = await GET('/area?cc=XX&lat=0.532&lng=0.542');
ok('area: the port neighborhood (separate polygon in the same cell)', a3.body.area === 'Port', JSON.stringify(a3.body));
const a4 = await GET('/area?cc=XX&lat=0.58&lng=0.58');
ok('area: inside localadmin only → localadmin name (last resort)', a4.body.area === 'Commune XX' && a4.body.type === 'localadmin', JSON.stringify(a4.body));
const a5 = await GET('/area?cc=XX&lat=0.9&lng=0.9');
ok('area: same cell (d1_1) but outside every polygon → area "" · empty chain · no noData flag', a5.body.noData === undefined && a5.body.area === '' && a5.body.chain.length === 0, JSON.stringify(a5.body));
const a5b = await GET('/area?cc=XX&lat=1.2&lng=1.2');
ok('area: a cell the country has no file for (d2_2) → noData', a5b.body.noData === true && a5b.body.area === '', JSON.stringify(a5b.body));
const a6 = await GET('/area?cc=YY&lat=0.5015&lng=0.5025');
ok('area: country without divisions → noData', a6.body.noData === true, JSON.stringify(a6.body));
const a7 = await GET('/area?cc=XX&lat=abc&lng=1');
ok('area: bad coordinates → 400', a7.status === 400);

// ═══ ٦) الأسلوب العام
const opt = await worker.fetch(new Request('https://places.mypickz.app/match-batch', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env);
ok('OPTIONS preflight → 204 with CORS headers', opt.status === 204 && opt.headers.get('Access-Control-Allow-Methods').includes('POST'));
const bad = await worker.fetch(new Request('https://places.mypickz.app/match', { method: 'POST', headers: { Origin: ORIGIN } }), env);
ok('POST on a GET-only route → 405', bad.status === 405);

console.log(fails ? ('FAILED ' + fails) : 'ALL PASS'); process.exit(fails ? 1 : 0);
