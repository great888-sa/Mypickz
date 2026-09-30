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
export const STREET_WORDS = /\b(rue|quai|avenue|ave|av|boulevard|blvd|bd|place|pl|allee|allée|chemin|impasse|cours|passage|street|st|road|rd|way|lane|ln|drive|dr|square|sq|terrace|court|ct|crescent|close|strasse|straße|str|platz|weg|gasse|via|viale|piazza|corso|calle|carrer|avenida|paseo|plaza|camino|gracht|straat|laan|plein|vej|gade|gatan|vägen|katu|tie|ulica|улица|شارع|طريق|جادة|ميدان|حي)\b/i;
export function isStreetAddress(addr, vocab){ const a = String(addr || ''); if (!/\d/.test(a)) return false; if (/^\s*\d+(e|er|nd|rd|th)?\s*(arr\.?|arrondissement)?\s*$/i.test(a)) return false;
  if (vocab && vocab.streetWords && vocab.streetWords.length){ const T = toks(a); if (vocab.streetWords.some(w => T.has(w))) return true; if ((vocab.postcodePatterns || []).some(pat => new RegExp('\\b' + pat.replace(/9/g, '\\d').replace(/A/g, '[A-Za-z]').replace(/ /g, ' ?') + '\\b').test(a))) return true; return false; } // مفردات الدولة المشتقة من بياناتها (كلمات الشارع · صيغ الرمز البريدي)
  return /\b\d{4,6}\b/.test(a) || STREET_WORDS.test(a); } // احتياط عام حين لا مفردات للدولة
export function decide(name, addr, cands, W = WEIGHTS, vocab = null){
  const scored = []; const aT = toks(addr); const isStreet = isStreetAddress(addr, vocab); const noAddr = !isStreet; // عنوان الشارع = رقم مع كلمة شارع أو رمز بريدي؛ ما عداه حي («Louvre · 1er» · «Le Marais 3e/4e» · «Saint-Germain-des-Prés») // خ-٢: عنوان شارع (أرقام أو ≥ ٣ كلمات) يدخل بنصف الدرجة؛ الحي/الدائرة (مثل «As Sahafah» · «2e arr.») لا يُخصم — الاسم وحده يحكم (يقين ≥ ٠٫٩) والحي يساند حين يطابق
  for (const c of cands){ if (typeof c.lat !== 'number') continue; const ns = nameSim(name, c); if (ns < W.minNs) continue; const as = addrSim(addr, c); const locB = (!isStreet && vocab && vocab.localitySet && c.locality && vocab.localitySet.has(String(c.locality)) && toks(addr).size && toks(c.locality).size && [...toks(c.locality)].every(t => toks(addr).has(t))) ? 0.05 : 0; scored.push({ c, s: isStreet ? (ns * W.wn + as * W.wa) : Math.min(1, ns + (aT.size ? as * 0.1 : 0) + locB) }); } // الحي المعروف يساند المرشَّح الواقع فيه
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 3).map(x => ({ id: x.c.id, name: x.c.name, addr: x.c.addr || '', locality: x.c.locality || '', lat: x.c.lat, lng: x.c.lng, score: +x.s.toFixed(2) }));
  if (!top.length) return { candidates: [] };
  const ambiguous = scored.length > 1 && (scored[0].s - scored[1].s) < W.gap && dist(scored[0].c, scored[1].c) > W.maxM; // تام ١ مقابل بادئة ٠٫٩ بموضعين مختلفين = فرعان → غموض (لا حكم آلي)
  if (top[0].score >= (noAddr ? 0.9 : W.min) && !ambiguous) return { auto: top[0], candidates: top };
  return { candidates: top };
}
export function cellsAround(lat, lng, rKm){ const size = 11.1; const dl = Math.min(4, Math.ceil(rKm / size)); const dg = Math.min(6, Math.ceil(rKm / (size * Math.max(0.2, Math.cos(lat * Math.PI / 180))))); const cy = Math.floor(lat * 10), cx = Math.floor(lng * 10); const out = []; for (let y = cy - dl; y <= cy + dl; y++) for (let x = cx - dg; x <= cx + dg; x++) out.push('c' + y + '_' + x); return out.slice(0, 81); } // الخلايا حول مركز (صرفة — تُختبر بلا شبكة)
