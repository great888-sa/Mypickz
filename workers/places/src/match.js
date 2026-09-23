// MyPickz — workers/places/src/match.js (ز-١-أ): منطق المطابقة نفسه المقيس بـscripts/match-score.js v4 — نسخة واحدة تُستعمل بالعامل وبالاختبارات
export const STOP = new Set(['restaurant', 'restaurante', 'ristorante', 'cafe', 'coffee', 'the', 'and', 'de', 'la', 'le', 'du', 'des', 'el', 'al', 'by', 'مطعم', 'كافيه', 'كوفي', 'مقهى', 'lounge', 'bar', 'kitchen', 'mall', 'hotel',
  'riyadh', 'الرياض', 'jeddah', 'جدة', 'khobar', 'الخبر', 'paris', 'madrid', 'cannes', 'milan', 'milano', 'geneva', 'geneve', 'rome', 'roma', 'florence', 'firenze', 'london', 'dubai', 'دبي', 'athens', 'barcelona', 'capri', 'nyc', 'york', 'beirut', 'بيروت', 'manama', 'المنامة']);
const AR = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };
export const norm = s => String(s || '').toLowerCase().replace(/[’'`´]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').replace(/\s+/g, ' ').trim();
export const normAr = s => norm(s).replace(/[أإآةىؤئ]/g, ch => AR[ch]).replace(/[\u064B-\u0652]/g, '').replace(/\bال/g, '');
export const toks = s => new Set(normAr(s).split(' ').filter(t => t && !STOP.has(t)));
export const splitName = s => String(s || '').split(/\s*[|｜]\s*/).map(x => x.trim()).filter(Boolean);
export function nameSim(q, c){
  const qs = splitName(q), cs = [c.name].concat(c.names || []).filter(Boolean); let best = 0;
  for (const a of qs){ const A = toks(a); if (!A.size) continue; for (const b of cs){ const B = toks(b); if (!B.size) continue;
    const inter = [...A].filter(t => B.has(t)).length; const jac = inter / (A.size + B.size - inter);
    const na = normAr(a), nb = normAr(b); const prefix = (na.startsWith(nb) || nb.startsWith(na)) ? 0.9 : 0; const eq = na === nb ? 1 : 0;
    best = Math.max(best, eq, prefix, jac); } }
  return best;
}
export function addrSim(addr, c){ const A = toks(addr); if (!A.size) return 0; const B = toks((c.addr || '') + ' ' + (c.locality || '')); const inter = [...A].filter(t => B.has(t) && t.length > 2).length; return Math.min(1, inter / 3); }
export function dist(a, b){ const R = 6371000, toR = x => x * Math.PI / 180; const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng); const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
export const WEIGHTS = { wn: 0.5, wa: 0.5, min: 0.55, minNs: 0.5, gap: 0.1, maxM: 300 }; // v4 — الوضع الآمن (خاطئ ≤ ٣٪)
export function bucketOf(tok){ let h = 0; for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) >>> 0; return (h % 256).toString(16).padStart(2, '0'); } // شظية الرمز (٢٥٦ لكل مدينة)
// ترتيب المرشَّحين وحكمهم: {auto} عند اليقين · {candidates:[≤3]} عند الشك · {} عند الغياب
export function decide(name, addr, cands, W = WEIGHTS){
  const scored = []; const noAddr = !toks(addr).size; // بلا عنوان بالطلب: الدرجة = تشابه الاسم وحده، واليقين عند ≥ ٠٫٩ (القياس بالمجموعة الذهبية كان بعناوين دائمًا)
  for (const c of cands){ if (typeof c.lat !== 'number') continue; const ns = nameSim(name, c); if (ns < W.minNs) continue; const as = addrSim(addr, c); scored.push({ c, s: noAddr ? ns : (ns * W.wn + as * W.wa) }); }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 3).map(x => ({ id: x.c.id, name: x.c.name, addr: x.c.addr || '', locality: x.c.locality || '', lat: x.c.lat, lng: x.c.lng, score: +x.s.toFixed(2) }));
  if (!top.length) return { candidates: [] };
  const ambiguous = scored.length > 1 && (scored[0].s - scored[1].s) < W.gap && dist(scored[0].c, scored[1].c) > W.maxM;
  if (top[0].score >= (noAddr ? 0.9 : W.min) && !ambiguous) return { auto: top[0], candidates: top };
  return { candidates: top };
}
