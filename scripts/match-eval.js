// MyPickz — scripts/match-eval.js v2 (ز-١ · تقييم جودة المطابقة بالأرقام لا بالعين) — v2: يحفظ المرشَّحين العشرة بالتقرير ليُضبط الترتيب دون شبكة (scripts/match-score.js)
// يطابق كل مكان بالمجموعة الذهبية (scripts/eval/golden-set.json) على Foursquare Places API بالاسم والمدينة، ويقيس:
//   correct  = وُجدت نتيجة ضمن MAX_M متر من الحقيقة الأرضية (إحداثيات التصدير — للقياس فقط، لا تُكتب بأي مكان)
//   wrong    = وُجدت نتيجة أبعد من MAX_M (الأخطر: مكان آخر بالاسم نفسه)
//   none     = لا نتيجة
// عتبات القبول (تُكتب سلفًا): correct ≥ 85% · wrong ≤ 3%.
// المفتاح: Service API Key من لوحة Foursquare (مشروع ← API Keys) — ليس Client ID/Secret · التشغيل: FSQ_API_KEY=... node scripts/match-eval.js [--limit=100] [--city=riyadh] [--max=150]
const fs = require('fs');
const KEY = process.env.FSQ_API_KEY; if (!KEY){ console.error('FSQ_API_KEY missing'); process.exit(2); }
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const LIMIT = parseInt(arg('limit', '0'), 10), CITY = arg('city', ''), MAX_M = parseInt(arg('max', '150'), 10);
const CITY_CENTER = { riyadh: [24.7136, 46.6753], jeddah: [21.5433, 39.1728], khobar: [26.2172, 50.1971], paris: [48.8566, 2.3522], madrid: [40.4168, -3.7038], cannes: [43.5528, 7.0174], milan: [45.4642, 9.19], geneva: [46.2044, 6.1432], rome: [41.9028, 12.4964], florence: [43.7696, 11.2558], london: [51.5074, -0.1278], dubai: [25.2048, 55.2708], athens: [37.9838, 23.7275], barcelona: [41.3874, 2.1686], capri: [40.5532, 14.2222], nyc: [40.7128, -74.006], beirut: [33.8938, 35.5018], manama: [26.2285, 50.586] };
const CITY_NAME = { riyadh: 'Riyadh', jeddah: 'Jeddah', khobar: 'Al Khobar', paris: 'Paris', madrid: 'Madrid', cannes: 'Cannes', milan: 'Milan', geneva: 'Geneva', rome: 'Rome', florence: 'Florence', london: 'London', dubai: 'Dubai', athens: 'Athens', barcelona: 'Barcelona', capri: 'Capri', nyc: 'New York', beirut: 'Beirut', manama: 'Manama' };
function dist(a, b){ const R = 6371000, toR = x => x * Math.PI / 180; const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng); const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
function cleanName(n){ return String(n).replace(/\s*[|｜]\s*.*$/, '').replace(/[®™]/g, '').trim(); } // «شيفز برجر | Chef's Burger» → الجزء الأول
// نوعا المفاتيح: القديم (v3 — يبدأ بـ fsq3) والجديد (Service API Key — Bearer + إصدار الواجهة)
const LEGACY = false; // ٢٣ سبتمبر: الواجهة القديمة أُوقفت (HTTP 410) — الجديدة دائمًا بترويسة Bearer وإصدار الواجهة، مهما كان شكل المفتاح
async function fsq(name, city){
  const [lat, lng] = CITY_CENTER[city]; const qs = new URLSearchParams({ query: name, ll: lat + ',' + lng, radius: '30000', limit: '10', fields: LEGACY ? 'fsq_id,name,geocodes,location' : 'fsq_place_id,name,latitude,longitude,location' });
  const url = (LEGACY ? 'https://api.foursquare.com/v3/places/search?' : 'https://places-api.foursquare.com/places/search?') + qs;
  const headers = LEGACY ? { Authorization: KEY, Accept: 'application/json' } : { Authorization: 'Bearer ' + KEY, Accept: 'application/json', 'X-Places-Api-Version': '2025-06-17' };
  const r = await fetch(url, { headers: headers }); if (!r.ok){ let body = ''; try{ body = (await r.text()).slice(0, 300); }catch(_){} return { error: r.status, body: body }; } const j = await r.json();
  const results = (j.results || []).map(function(x){ return { fsq_id: x.fsq_id || x.fsq_place_id, name: x.name, address: (x.location && (x.location.formatted_address || x.location.address)) || '', locality: (x.location && x.location.locality) || '', geocodes: x.geocodes || ((typeof x.latitude === 'number') ? { main: { latitude: x.latitude, longitude: x.longitude } } : null) }; });
  return { results: results };
}
(async () => {
  const gold = JSON.parse(fs.readFileSync(__dirname + '/eval/golden-set.json', 'utf8')).places.filter(p => !CITY || p.city === CITY).slice(0, LIMIT || undefined);
  const out = { correct: 0, wrong: 0, none: 0, error: 0, byCity: {}, rows: [] }; const t0 = Date.now();
  for (const p of gold){
    const c = out.byCity[p.city] = out.byCity[p.city] || { n: 0, correct: 0, wrong: 0, none: 0 }; c.n++;
    let q = cleanName(p.name); let res = await fsq(q, p.city);
    if (res.error){ out.error++; out.rows.push({ id: p.id, name: p.name, city: p.city, verdict: 'error ' + res.error }); if (out.error === 1) console.log('FIRST ERROR · HTTP ' + res.error + ' · key type: ' + (LEGACY ? 'legacy (fsq3)' : 'service (Bearer)') + ' · body: ' + (res.body || '').replace(/\s+/g, ' ')); if (out.error >= 5 && out.correct + out.wrong + out.none === 0){ console.log('ABORT: 5 errors in a row — fix the key/endpoint first'); break; } continue; }
    if (!res.results.length && q !== p.name){ res = await fsq(p.name, p.city); }
    if (!res.results.length){ out.none++; c.none++; out.rows.push({ id: p.id, name: p.name, city: p.city, verdict: 'none' }); continue; }
    const cands = res.results.map(function(x){ const g = x.geocodes && (x.geocodes.main || x.geocodes.roof); return { fsq_id: x.fsq_id, name: x.name, address: x.address, locality: x.locality, lat: g ? g.latitude : null, lng: g ? g.longitude : null, m: g ? Math.round(dist(p.truth, { lat: g.latitude, lng: g.longitude })) : null }; }); // v2: المرشَّحون كلهم للضبط دون شبكة
    const best = cands[0]; if (best.m === null){ out.none++; c.none++; out.rows.push({ id: p.id, name: p.name, city: p.city, verdict: 'none (no geocode)', cands: cands }); continue; }
    const d = best.m;
    if (d <= MAX_M){ out.correct++; c.correct++; out.rows.push({ id: p.id, name: p.name, addr: p.addr || '', city: p.city, verdict: 'correct', m: d, fsq_id: best.fsq_id, fsq_name: best.name, cands: cands }); }
    else { out.wrong++; c.wrong++; out.rows.push({ id: p.id, name: p.name, addr: p.addr || '', city: p.city, verdict: 'wrong', m: d, fsq_id: best.fsq_id, fsq_name: best.name, cands: cands }); }
    await new Promise(r => setTimeout(r, 120)); // احترام الحصة
  }
  const n = gold.length, pct = x => n ? (100 * x / n).toFixed(1) + '%' : '—';
  console.log('MATCH-EVAL · n=' + n + ' · correct ' + out.correct + ' (' + pct(out.correct) + ') · wrong ' + out.wrong + ' (' + pct(out.wrong) + ') · none ' + out.none + ' (' + pct(out.none) + ') · error ' + out.error + ' · ' + Math.round((Date.now() - t0) / 1000) + 's');
  Object.keys(out.byCity).sort().forEach(k => { const c = out.byCity[k]; console.log('  ' + k.padEnd(10) + ' n=' + String(c.n).padStart(3) + '  correct ' + String(c.correct).padStart(3) + '  wrong ' + String(c.wrong).padStart(2) + '  none ' + String(c.none).padStart(3)); });
  const pass = (out.correct / n) >= 0.85 && (out.wrong / n) <= 0.03;
  console.log(pass ? 'VERDICT: PASS (correct ≥ 85% · wrong ≤ 3%)' : 'VERDICT: FAIL — review wrong/none rows in scripts/eval/match-report.json');
  fs.writeFileSync(__dirname + '/eval/match-report.json', JSON.stringify({ n, summary: { correct: out.correct, wrong: out.wrong, none: out.none, error: out.error }, byCity: out.byCity, maxMeters: MAX_M, rows: out.rows }, null, 1)); // التقرير بلا إحداثيات
  process.exit(pass ? 0 : 1);
})();
