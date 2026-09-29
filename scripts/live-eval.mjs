// MyPickz — scripts/live-eval.mjs (القياس الحي): المجموعة الذهبية عبر دفعة العامل الحي كما يفعل التطبيق (match-batch · ٤٠ اسمًا · مركز المدينة ونصف قطرها) — يسجّل النجاح والفشل ونوعه ونسبة الاقتراح لكل مدينة
// التشغيل: node scripts/live-eval.mjs [--base=https://places.mypickz.app] [--r=12]
import fs from 'fs';
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const BASE = arg('base', 'https://places.mypickz.app'), RARG = arg('r', '');
const bbAll = JSON.parse(fs.readFileSync('scripts/eval/cities-bbox.json', 'utf8')); const CC = bbAll.cc || {}; delete bbAll.note; delete bbAll.cc; const bb = bbAll;
const gold = JSON.parse(fs.readFileSync('scripts/eval/golden-set.json', 'utf8')).places;
function dist(a, b){ const R = 6371000, t = x => x * Math.PI / 180; const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng); const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
const out = { byCity: {}, errors: {} }; let tot = { n: 0, auto: 0, autoOk: 0, autoWrong: 0, cand: 0, candOk: 0, none: 0, noData: 0, err: 0 }; const t0 = Date.now();
for (const city of Object.keys(bb)){
  const b = bb[city]; const lat = (b[1] + b[3]) / 2, lng = (b[0] + b[2]) / 2; const rKm = RARG ? +RARG : Math.max(8, Math.min(25, Math.round(Math.max((b[2] - b[0]) * 111 * Math.cos(lat * Math.PI / 180), (b[3] - b[1]) * 111) / 2)));
  const places = gold.filter(p => p.city === city); const c = out.byCity[city] = { n: places.length, r: rKm, auto: 0, autoOk: 0, autoWrong: 0, cand: 0, candOk: 0, none: 0, noData: 0, err: 0, ms: 0, errKinds: {} };
  for (let i = 0; i < places.length; i += 40){ const chunk = places.slice(i, i + 40); const t1 = Date.now();
    let r = null, kind = '';
    try{ const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 20000); const res = await fetch(BASE + '/match-batch', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://test.mypickz.app' }, body: JSON.stringify({ city, cc: CC[city] || '', lat, lng, r: rKm, items: chunk.map(p => ({ name: p.name, addr: p.addr || '' })) }), signal: ac.signal }); clearTimeout(tm); if (!res.ok){ kind = 'HTTP ' + res.status; const txt = (await res.text()).slice(0, 80); kind += /1102|resource/i.test(txt) ? ' (1102 limits)' : ''; } else r = await res.json(); }
    catch(e){ kind = /abort/i.test(String(e)) ? 'timeout 20s' : 'fetch ' + String(e).slice(0, 40); }
    c.ms += Date.now() - t1;
    if (!r){ c.err += chunk.length; c.errKinds[kind] = (c.errKinds[kind] || 0) + 1; out.errors[kind] = (out.errors[kind] || 0) + 1; continue; }
    if (r.noData){ c.noData += chunk.length; continue; }
    if (r.index) c.index = r.index;
    (r.results || []).forEach((res, k) => { const p = chunk[k]; if (!p) return; if (res.auto){ c.auto++; if (dist(p.truth, res.auto) <= 300) c.autoOk++; else c.autoWrong++; } else if (res.candidates && res.candidates.length){ c.cand++; if (res.candidates.some(x => dist(p.truth, x) <= 300)) c.candOk++; } else c.none++; });
  }
  tot.n += c.n; ['auto', 'autoOk', 'autoWrong', 'cand', 'candOk', 'none', 'noData', 'err'].forEach(k => { tot[k] += c[k]; });
  console.log(city.padEnd(10) + ' n=' + String(c.n).padStart(3) + ' r=' + String(c.r).padStart(2) + 'km · auto ' + String(c.auto).padStart(3) + ' (ok ' + c.autoOk + ' · wrong ' + c.autoWrong + ') · candidates ' + String(c.cand).padStart(3) + ' (true in top3 ' + c.candOk + ') · none ' + String(c.none).padStart(3) + (c.noData ? ' · noData ' + c.noData : '') + (c.err ? ' · ERR ' + c.err + ' ' + JSON.stringify(c.errKinds) : '') + ' · ' + c.ms + 'ms' + (c.index ? ' · ' + c.index : ''));
}
const pct = x => (100 * x / tot.n).toFixed(1) + '%';
console.log('LIVE-EVAL · n=' + tot.n + ' · auto ' + tot.auto + ' (' + pct(tot.auto) + ') of which wrong ' + tot.autoWrong + ' (' + pct(tot.autoWrong) + ') · candidates-only ' + tot.cand + ' (true in top3 ' + tot.candOk + ') · none ' + tot.none + ' · noData ' + tot.noData + ' · ERR ' + tot.err + ' (' + pct(tot.err) + ') ' + JSON.stringify(out.errors) + ' · ' + Math.round((Date.now() - t0) / 1000) + 's');
console.log('SUGGESTION RATE (as the app shows): ' + pct(tot.auto) + ' · if "probable" tier (top candidate) were shown: ' + pct(tot.auto + tot.cand));
fs.writeFileSync('scripts/eval/live-report.json', JSON.stringify(out, null, 1));
