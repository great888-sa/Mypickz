// MyPickz — scripts/match-score.js (ز-١): ترتيب المرشَّحين والحكم بالمجموعة الذهبية — بلا شبكة
// المصدر: --source=overture (scripts/eval/overture/<city>.json) أو --source=fsq (تقرير match-eval v2 بمرشَّحيه)
// الدرجة = تشابه الاسم (رموز · بادئة · عربي/إنجليزي) + تشابه العنوان (رموز الشارع/الحي) · الرفض دون MIN → none (أسلم من الخطأ)
const fs = require('fs');
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const SRC = arg('source', 'overture'), MAX_M = parseInt(arg('max', '300'), 10), MIN = parseFloat(arg('min', '0.6')), CITY = arg('city', ''), WN = parseFloat(arg('wn', '0.6')), WA = parseFloat(arg('wa', '0.4')), MIN_NS = parseFloat(arg('minns', '0.5')); // v3: الأوزان من البحث الشبكي (٢٣ سبتمبر)
const norm = s => String(s || '').toLowerCase().replace(/[’'`´]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').replace(/\s+/g, ' ').trim();
const AR = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };
const normAr = s => norm(s).replace(/[أإآةىؤئ]/g, ch => AR[ch]).replace(/[\u064B-\u0652]/g, '').replace(/\bال/g, '');
const STOP = new Set(['restaurant', 'restaurante', 'ristorante', 'cafe', 'coffee', 'the', 'and', 'de', 'la', 'le', 'du', 'des', 'el', 'al', 'by', 'مطعم', 'كافيه', 'كوفي', 'مقهى', 'lounge', 'bar', 'kitchen', 'mall', 'hotel',
  'riyadh', 'الرياض', 'jeddah', 'جدة', 'khobar', 'الخبر', 'paris', 'madrid', 'cannes', 'milan', 'milano', 'geneva', 'geneve', 'rome', 'roma', 'florence', 'firenze', 'london', 'dubai', 'دبي', 'athens', 'barcelona', 'capri', 'nyc', 'york', 'beirut', 'بيروت', 'manama', 'المنامة']); // v3: أسماء المدن لا تُحسب رموزًا
const toks = s => new Set(normAr(s).split(' ').filter(t => t && !STOP.has(t)));
const splitName = s => String(s || '').split(/\s*[|｜]\s*/).map(x => x.trim()).filter(Boolean); // «شيفز برجر | Chef's Burger»
function nameSim(q, c){ // أفضل تشابه بين أي صيغة للاسم المُدخل وأي صيغة لاسم المرشَّح
  const qs = splitName(q), cs = [c.name].concat(c.names || []).filter(Boolean); let best = 0;
  for (const a of qs){ const A = toks(a); if (!A.size) continue; for (const b of cs){ const B = toks(b); if (!B.size) continue;
    const inter = [...A].filter(t => B.has(t)).length; const jac = inter / (A.size + B.size - inter);
    const na = normAr(a), nb = normAr(b); const prefix = (na.startsWith(nb) || nb.startsWith(na)) ? 0.9 : 0; const eq = na === nb ? 1 : 0;
    best = Math.max(best, eq, prefix, jac); } }
  return best;
}
function addrSim(addr, c){ const A = toks(addr); if (!A.size) return 0; const B = toks((c.addr || '') + ' ' + (c.locality || '')); const inter = [...A].filter(t => B.has(t) && t.length > 2).length; return Math.min(1, inter / 3); }
function dist(a, b){ const R = 6371000, toR = x => x * Math.PI / 180; const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng); const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
const gold = JSON.parse(fs.readFileSync(__dirname + '/eval/golden-set.json', 'utf8')).places.filter(p => !CITY || p.city === CITY);
const pool = {}; let fsqRows = null;
if (SRC === 'fsq'){ fsqRows = JSON.parse(fs.readFileSync(__dirname + '/eval/match-report.json', 'utf8')).rows; }
function candidates(p){
  if (fsqRows){ const r = fsqRows.find(x => x.id === p.id); return (r && r.cands || []).map(c => ({ id: c.fsq_id, name: c.name, names: [], addr: c.address, locality: c.locality, lat: c.lat, lng: c.lng })); }
  if (!pool[p.city]){ const f = __dirname + '/eval/overture/' + p.city + '.json'; const arr = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; const idx = new Map(); // v3: فهرس مقلوب رمز → مواضع (مرة لكل مدينة)
    arr.forEach((c, i) => { toks(c.name + ' ' + (c.names || []).join(' ')).forEach(t => { if (!idx.has(t)) idx.set(t, []); idx.get(t).push(i); }); }); pool[p.city] = { arr, idx }; }
  const qs = new Set(); splitName(p.name).forEach(n => toks(n).forEach(t => qs.add(t))); const { arr, idx } = pool[p.city];
  const hits = new Map(); qs.forEach(t => { const rare = 1 / Math.sqrt((idx.get(t) || []).length || 1); (idx.get(t) || []).forEach(i => hits.set(i, (hits.get(i) || 0) + rare)); }); // الرموز النادرة أثقل
  return [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 800).map(e => arr[e[0]]);
}
const out = { correct: 0, wrong: 0, none: 0, byCity: {}, rows: [] }; const CANDS = [];
for (const p of gold){
  const c = out.byCity[p.city] = out.byCity[p.city] || { n: 0, correct: 0, wrong: 0, none: 0 }; c.n++;
  let best = null, bestS = 0; const scored = [];
  for (const cand of candidates(p)){ if (typeof cand.lat !== 'number') continue; const ns = nameSim(p.name, cand), as = addrSim(p.addr, cand); if (ns < MIN_NS) continue; const s = ns * WN + as * WA; scored.push({ name: cand.name, names: cand.names, addr: cand.addr, locality: cand.locality, lat: cand.lat, lng: cand.lng, cat: cand.cat, ns: +ns.toFixed(2), as: +as.toFixed(2), s: +s.toFixed(2), m: Math.round(dist(p.truth, { lat: cand.lat, lng: cand.lng })) }); if (s > bestS){ bestS = s; best = cand; } }
  scored.sort((a, b) => b.s - a.s); CANDS.push({ id: p.id, name: p.name, addr: p.addr, city: p.city, cands: scored.slice(0, 20) }); // للضبط دون شبكة
  if (!best || bestS < MIN){ out.none++; c.none++; out.rows.push({ id: p.id, name: p.name, city: p.city, verdict: 'none', score: +bestS.toFixed(2), top: best && best.name }); continue; }
  const d = Math.round(dist(p.truth, { lat: best.lat, lng: best.lng }));
  if (d <= MAX_M){ out.correct++; c.correct++; out.rows.push({ id: p.id, name: p.name, city: p.city, verdict: 'correct', m: d, score: +bestS.toFixed(2), match: best.name }); }
  else { out.wrong++; c.wrong++; out.rows.push({ id: p.id, name: p.name, city: p.city, verdict: 'wrong', m: d, score: +bestS.toFixed(2), match: best.name, addr: p.addr, caddr: best.addr }); }
}
const n = gold.length, pct = x => (100 * x / n).toFixed(1) + '%';
const r3 = CANDS.filter(x => x.cands.slice(0, 3).some(c => c.m <= MAX_M)).length; console.log('RECALL@3 (true place among top 3 shown to the user): ' + pct(r3));
console.log('MATCH-SCORE · source=' + SRC + ' · min=' + MIN + ' · max=' + MAX_M + 'm · n=' + n + ' · correct ' + out.correct + ' (' + pct(out.correct) + ') · wrong ' + out.wrong + ' (' + pct(out.wrong) + ') · none ' + out.none + ' (' + pct(out.none) + ')');
Object.keys(out.byCity).sort().forEach(k => { const c = out.byCity[k]; console.log('  ' + k.padEnd(10) + ' n=' + String(c.n).padStart(3) + '  correct ' + String(c.correct).padStart(3) + '  wrong ' + String(c.wrong).padStart(2) + '  none ' + String(c.none).padStart(3)); });
const pass = (out.correct / n) >= 0.85 && (out.wrong / n) <= 0.03;
console.log(pass ? 'VERDICT: PASS' : 'VERDICT: FAIL');
fs.writeFileSync(__dirname + '/eval/score-report-' + SRC + '.json', JSON.stringify({ n, summary: { correct: out.correct, wrong: out.wrong, none: out.none }, byCity: out.byCity, rows: out.rows }, null, 1));
fs.writeFileSync(__dirname + '/eval/score-cands-' + SRC + '.json', JSON.stringify(CANDS)); // أفضل ٢٠ مرشَّحًا لكل مكان — الملف الصغير للضبط
