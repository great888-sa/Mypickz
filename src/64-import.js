/* ═══ أ-١٣ (r84 · ق١٠-١٩-٠١ · خريطة الاستيراد v1.1 عقد IM1…IM8 · IM-R): الاستيراد من Google Takeout — رفعة واحدة، كل مكان يجد مدينته
   الخطوط الحمراء (على الرسم كما في الكود): لا نداء لجوجل ولا للعامل · الملف لا يُرفع · موقع الملف في الذاكرة فقط (IM4) ويُطرح — لا يُكتب في أي مستند ولا يُرسل (٠٩-١٥-٠٥)
   · لا دمج بالاسم وحده (S7 «similar») · لا مساس بمكان قائم غير حقل gid · حارس العدّ قبل كل حفظة · المعاينة هي التنفيذ بلا حفظ (خطة → Commit من الخطة نفسها) */
const tkState = { phase: 'intro', plan: null, busy: false, result: null };
const TK_CAP_PER_CITY = 500; // ٠٩-١٥-٠٥ (السقف لكل مدينة — ق١٠-١٩-٠١ البند ٥)
const TK_DUP_KM = 0.3, TK_RADIUS_SLACK = 1.2;

/* ── IM4 · فكّ خلية S2 (المستوى ٣٠) من الجزء الأول لمعرّف المكان — حساب محلي حتمي (المرجع: s2geometry · CellId::ToPoint) ── */
const __s2 = (function(){
  const LB = 4, MAXL = 30, POS_BITS = 2 * MAXL + 1; const SWAP = 1, INVERT = 2;
  const POS_TO_IJ = [[0, 1, 3, 2], [0, 2, 3, 1], [3, 2, 0, 1], [3, 1, 0, 2]], POS_TO_OR = [SWAP, 0, 0, INVERT | SWAP];
  const IJ = new Array(1 << (2 * LB + 2)).fill(0);
  (function(){ function init(level, i, j, orig, pos, orient){ if (level === LB){ IJ[(pos << 2) + orig] = (((i << LB) + j) << 2) + orient; return; } level++; i <<= 1; j <<= 1; pos <<= 2; const r = POS_TO_IJ[orient]; for (let k = 0; k < 4; k++) init(level, i + (r[k] >> 1), j + (r[k] & 1), orig, pos + k, orient ^ POS_TO_OR[k]); } for (let o = 0; o < 4; o++) init(0, 0, 0, o, 0, o); })();
  function stToUv(s){ return s >= 0.5 ? (1 / 3) * (4 * s * s - 1) : (1 / 3) * (1 - 4 * (1 - s) * (1 - s)); }
  function faceUvToXyz(f, u, v){ return [[1, u, v], [-u, 1, v], [-u, -v, 1], [-1, -v, -u], [v, -1, -u], [v, u, -1]][f]; }
  function decode(hex){ // → { lat, lng, level } أو null
    let id; try{ id = BigInt(hex); }catch(_){ return null; } if (id <= 0n) return null;
    const lsb = id & (-id); let lv = 0; { let x = lsb; while (x > 1n){ x >>= 1n; lv++; } } const level = MAXL - (lv >> 1); if (level < 0 || level > MAXL) return null;
    const face = Number(id >> BigInt(POS_BITS)); if (face > 5) return null; let bits = face & SWAP; let i = 0, j = 0;
    for (let k = 7; k >= 0; k--){ const nb = (k === 7) ? (MAXL - 7 * LB) : LB; const mask = (1 << (2 * nb)) - 1; bits += Number((id >> BigInt(k * 2 * LB + 1)) & BigInt(mask)) << 2; bits = IJ[bits]; i += (bits >> (LB + 2)) << (k * LB); j += ((bits >> 2) & ((1 << LB) - 1)) << (k * LB); bits &= (SWAP | INVERT); }
    const size = 1 << (MAXL - level); const si = 2 * (i - (i % size)) + size, ti = 2 * (j - (j % size)) + size; const s = si / (2 * (1 << MAXL)), t = ti / (2 * (1 << MAXL));
    const p = faceUvToXyz(face, stToUv(s), stToUv(t)); const lat = Math.atan2(p[2], Math.hypot(p[0], p[1])) * 180 / Math.PI, lng = Math.atan2(p[1], p[0]) * 180 / Math.PI;
    if (!isFinite(lat) || !isFinite(lng)) return null; return { lat: lat, lng: lng, level: level };
  }
  return { decode: decode };
})();
function tkCellToLatLng(hex){ return __s2.decode(hex); }

/* ── IM3 · الصف الموحَّد: من CSV وJSON إلى { name, url, note, from, list, gid, cell, loc*, cc, addr } — loc* في الذاكرة فقط ── */
function tkIdsFromUrl(url){ // gid = معرّف المكان بصيغة واحدة (cid العشري ≡ الجزء الثاني 0x…) · cell = الجزء الأول (خلية الموقع — لا يُخزَّن)
  const s = String(url || ''); let m = /!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/.exec(s) || /[?&]ftid=(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/.exec(s);
  if (m){ let gid = ''; try{ gid = BigInt(m[2].toLowerCase()).toString(10); }catch(_){ gid = ''; } return { gid: gid, cell: m[1].toLowerCase() }; }
  m = /[?&]cid=(\d+)/.exec(s); if (m) return { gid: m[1], cell: '' }; return { gid: '', cell: '' };
}
function tkParseCsv(text){ // محلّل CSV بالاقتباسات — الملاحظات تحوي فواصل وأسطرًا
  const rows = []; let row = [], cell = '', q = false; const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++){ const ch = s[i];
    if (q){ if (ch === '"'){ if (s[i + 1] === '"'){ cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ','){ row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r'){ if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch; }
  if (cell !== '' || row.length){ row.push(cell); rows.push(row); } return rows;
}
function tkListFrom(listName){ const n = String(listName || '').trim().toLowerCase(); if (n === 'want to go') return 'want_to_go'; if (n === 'favorite places' || n === 'favourite places') return 'favorites'; if (n === 'saved places' || n === 'saved') return 'saved'; return 'list:' + String(listName || '').trim(); }
function tkListLabel(from){ if (from === 'want_to_go') return 'Want to go'; if (from === 'favorites') return 'Favorite places'; if (from === 'saved') return 'Saved'; return String(from || '').replace(/^list:/, ''); }
function tkCsvRows(text, listName){ // الترويسة تُلتقط أينما كانت (قائمة تبدأ بسطر وصف)
  const rows = tkParseCsv(text); const hi = rows.findIndex(function(r){ return r.length >= 3 && r[0] === 'Title' && r[1] === 'Note' && r[2] === 'URL'; }); if (hi < 0) return [];
  const from = tkListFrom(listName); const out = [];
  rows.slice(hi + 1).forEach(function(r){ if (r.length < 3) return; const name = String(r[0] || '').trim(), note = String(r[1] || '').trim(), url = String(r[2] || '').trim(); if (!name && !url) return;
    const ids = tkIdsFromUrl(url); const loc = ids.cell ? tkCellToLatLng(ids.cell) : null; let sm = null; if (!loc){ const m = /maps\/search\/(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url); if (m) sm = { lat: +m[1], lng: +m[2] }; }
    out.push({ name: name, url: url, note: note, from: from, list: tkListLabel(from), gid: ids.gid, cell: ids.cell, loc: loc ? { lat: loc.lat, lng: loc.lng } : sm, cc: '', addr: '' }); });
  return out;
}
function tkJsonRows(text){
  let d = null; try{ d = JSON.parse(text); }catch(_){ return []; } const fs = (d && Array.isArray(d.features)) ? d.features : []; const out = [];
  fs.forEach(function(f){ const pr = (f && f.properties) || {}; const lc = pr.location || {}; const url = String(pr.google_maps_url || '').trim(); const name = String(lc.name || '').trim(); const co = (f && f.geometry && Array.isArray(f.geometry.coordinates)) ? f.geometry.coordinates : null;
    const ids = tkIdsFromUrl(url); let loc = null; if (co && co.length === 2 && (co[0] !== 0 || co[1] !== 0) && isFinite(co[0]) && isFinite(co[1])) loc = { lat: +co[1], lng: +co[0] }; if (!loc && ids.cell){ const c = tkCellToLatLng(ids.cell); if (c) loc = { lat: c.lat, lng: c.lng }; }
    let nm = name; if (!nm){ const m = /[?&]q=([^&]+)/.exec(url); if (m){ try{ nm = decodeURIComponent(m[1].replace(/\+/g, ' ')).split(',')[0].trim(); }catch(_){ nm = ''; } } }
    if (!nm && !url) return; out.push({ name: nm, url: url, note: '', from: 'saved', list: 'Saved', gid: ids.gid, cell: ids.cell, loc: loc, cc: String(lc.country_code || '').toUpperCase(), addr: String(lc.address || '') }); });
  return out;
}

/* ── IM2 · الفكّ محليًّا: قارئ zip (الدليل المركزي · stored/deflate عبر DecompressionStream) — لا مكتبة ولا رفع ── */
async function tkUnzip(buf){ const dv = new DataView(buf), u8 = new Uint8Array(buf); const n = u8.length; let eocd = -1;
  for (let i = n - 22; i >= Math.max(0, n - 65557); i--){ if (dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; } } if (eocd < 0) throw new Error('not a zip file');
  const count = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true); const out = []; const td = new TextDecoder('utf-8');
  for (let k = 0; k < count; k++){ if (dv.getUint32(off, true) !== 0x02014b50) break; const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true), lho = dv.getUint32(off + 42, true);
    const name = td.decode(u8.subarray(off + 46, off + 46 + nlen)); off += 46 + nlen + elen + clen; if (/\/$/.test(name)) continue;
    const lnlen = dv.getUint16(lho + 26, true), lelen = dv.getUint16(lho + 28, true); const start = lho + 30 + lnlen + lelen; const data = u8.subarray(start, start + csize);
    if (method === 0) out.push({ name: name, text: td.decode(data) });
    else if (method === 8){ const ds = new DecompressionStream('deflate-raw'); const blob = new Blob([data]); const txt = await new Response(blob.stream().pipeThrough(ds)).text(); out.push({ name: name, text: txt }); }
  } return out;
}
function tkWanted(name){ const n = String(name || ''); if (/\/Saved\/[^/]+\.csv$/i.test(n) || /^[^/]+\.csv$/i.test(n)) return 'csv'; if (/Saved Places\.json$/i.test(n)) return 'json'; return ''; }
function tkListNameOf(path){ return String(path || '').split('/').pop().replace(/\.csv$/i, '').replace(/\(\d+\)$/, '').trim(); }

/* ── IM6 · معنى القائمة: اقتراح القسم من اسم القائمة بالقاموس — الثلاث العامة بلا اقتراح (شخصية) ── */
const TK_SECTION_WORDS = [ ['landmarks', /معالم|معلم|landmark|museum|متحف|قصر|palace|castle|سياح/i], ['squares_streets', /ساحات|ساحة|ميادين|ميدان|square|plaza|شوارع|شارع|street|promenade|تمشية|walk/i], ['beaches', /شواطئ|شاطئ|beach|playa|plage/i], ['stay', /فنادق|فندق|hotel|resort|منتجع|apartment|شقق/i], ['transportation', /مطار|airport|محطة|station|قطار|train|مترو|metro|ميناء|port|ferry/i], ['parks_gardens', /حديقة|حدائق|park|garden/i], ['nature', /جبل|جبال|mountain|شلال|waterfall|وادي|valley|كهف|cave|طبيعة|nature|hike|hiking/i], ['shopping_store', /تسوق|تسوّق|shopping|mall|مول|سوق|market|boutique|stores?/i], ['cafes_sweets', /قهوة|كافيه|كوفي|coffee|cafe|café|مقاهي|مقهى|بيكري|مخبوز|bakery|حلى|حلويات|dessert|sweet|ايسكريم|آيسكريم|ice ?cream|gelato|فطور|برنش|breakfast|brunch/i], ['restaurants_dish', /برجر|burger|بيتزا|pizza|سندويتش|sandwich|شاورما|shawarma|ستيك|steak|سي ?فود|seafood|مطاعم|مطعم|restaurant|غداء|عشاء|lunch|dinner/i] ]; /* الترتيب مقصود: القسم الأعم (معالم · ساحات وشوارع · شواطئ · إقامة · نقل) قبل الطعام — قائمة «شوارع (للتمشية، التسوق، مقاهي، مطاعم)» شوارعٌ لا مطاعم */
function tkSuggestSection(listName){ const n = String(listName || ''); if (/^(want to go|favorite places|favourite places|saved places|saved)$/i.test(n.trim())) return ''; for (let i = 0; i < TK_SECTION_WORDS.length; i++){ if (TK_SECTION_WORDS[i][1].test(n)) return TK_SECTION_WORDS[i][0]; } return ''; }
function tkSectionOptions(sel){ return '<option value="">— not set —</option>' + DATA.filter(function(s){ return s.id !== 'others'; }).map(function(s){ return '<option value="' + attrStr(s.id) + '"' + (sel === s.id ? ' selected' : '') + '>' + escapeHtml(sectionDisplay(s).name) + '</option>'; }).join(''); }
function tkSectionName(id){ const s = DATA.find(function(x){ return x.id === id; }); return s ? sectionDisplay(s).name : ''; }

/* ── IM5 · المدينة تلقائيًّا: أقرب مدينة بالمعجم واقعة ضمن نصف قطرها — مدني أولًا، ثم المعجم؛ خارج الأنصاف = Other ── */
function tkKm(a, b){ const R = 6371, t = function(x){ return x * Math.PI / 180; }; const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng); const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
/* r84-2 (ق١٠-٢٠-٠١ · القاعدة ٣): سقف نصف القطر متدرّج في الاستيراد فقط — ٢٥ كم حتى ٣ ملايين · ٣٥ حتى ٥ · ٤٥ فوقها (الرياض · جدة · القاهرة) · المطابق cityGeoOf لا يُمسّ */
function tkCityR(c){ if (c && c.r) return c.r; const p = Math.max((c && c.p) || 200000, 10000); const base = 6 + 19 * Math.log10(p / 10000) / 3; return p >= 5e6 ? Math.max(base, 45) : p >= 3e6 ? Math.max(base, 35) : Math.max(6, Math.min(25, base)); } /* المدن الممتدة: الصيغة تعطي الرياض (٧٫٧ م) ٢٤ كم فتترك شمالها خارجها — الأرضية ٣٥/٤٥ بالسكان */
function tkCountryName(cc){ const c = WORLD_COUNTRIES.find(function(x){ return x.code === cc; }); return c ? c.name : ''; }
function tkNorm(name, cityName){ let n = pickerNormalize(String(name || '')); const cn = pickerNormalize(String(cityName || '')); if (cn){ n = n.replace(new RegExp('(^|\\s)' + cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'g'), ' '); } return n.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim(); }
/* r84-2 (ق١٠-٢٠-٠١): «المدينة هي ما يسمّيها السائح» — القواعد الخمس تُستخرج من المعجم نفسه */
const TK_ABSORB_RATIO = 3, TK_BIG_P = 100000, TK_ATTACH_KM = 45, TK_ISLAND_MAX_R = 60, TK_SMALL_N = 5;
const TK_MICRO = { QA: ['Doha', 90], BH: ['Manama', 30], KW: ['Kuwait City', 70], SG: ['Singapore', 25], HK: ['Hong Kong', 35], MO: ['Macau', 12], MC: ['Monaco', 3] }; /* القاعدة ٢: دول المدينة الواحدة — نصف قطر يغطي الدولة لا أكثر (موناكو ٣ كم لا تلتقط نيس) · الإمارات ليست فيها */
const TK_ISLAND_EXCEPT = ['Maldives']; /* القاعدة ٤: أرخبيل منتجعات = وجهة واحدة رغم ٢٥٠ كم */
async function tkCityCandidates(rows){ // مدني (بمراكزها) + المعجم للدول الحاضرة (دول مدني + دول ملف النجمة) → مرشَّحون بعد الامتصاص + فهرس شبكي
  const mine = (currentUser ? cityListAllCities() : []).map(function(c){ return { id: String(c.id), name: c.name, country: c.country || '', cc: plCountryCode(c.country || ''), lat: c.lat, lng: c.lng, r: c.r, p: c.p, mine: true }; });
  const ccs = {}; mine.forEach(function(c){ if (c.country) ccs[c.cc] = c.country; }); rows.forEach(function(r){ if (r.cc && !ccs[r.cc]) ccs[r.cc] = tkCountryName(r.cc) || r.cc; });
  const gaz = [], absorbed = [], bigIslands = []; const codes = Object.keys(ccs);
  for (let i = 0; i < codes.length; i++){ const cc = codes[i]; let list = []; try{ list = await gazLoad(cc); }catch(_){ list = []; } const all = [];
    (list || []).forEach(function(row){ if (typeof row.lat !== 'number') return; const id = String(row.id); const m = mine.find(function(c){ return c.id === id; }) || mine.find(function(c){ return c.cc === cc && pickerNormalize(c.name) === pickerNormalize(row.n); }); /* المدن المهاجَرة بمعرّف قديم (paris · Mallorca) تُعرف باسمها في معجم دولتها — لا تُنشأ ثانية؛ وتأخذ مركزها ونصف قطرها (الجزيرة ٥٥) */
      if (m){ if (typeof m.lat !== 'number'){ m.lat = row.lat; m.lng = row.lng; } if (row.r && !m.r) m.r = row.r; if (!m.p) m.p = row.p; m.island = !!row.island; m.row = m.row || row; all.push(m); return; }
      all.push({ id: id, name: row.n, country: ccs[cc] || tkCountryName(cc), cc: cc, lat: row.lat, lng: row.lng, r: row.r, p: row.p, island: !!row.island, row: row, mine: false }); });
    const micro = TK_MICRO[cc]; if (micro){ const cap = all.filter(function(c){ return pickerNormalize(c.name) === pickerNormalize(micro[0]); }).sort(function(a, b){ return (b.p || 0) - (a.p || 0); })[0]; if (cap){ cap.micro = true; cap.r = micro[1]; } }
    all.forEach(function(c){ c.rr = tkCityR(c); if (c.island){ c.dest = (c.rr <= TK_ISLAND_MAX_R) || TK_ISLAND_EXCEPT.indexOf(c.name) >= 0; } }); /* القاعدة ٤: الجزيرة وجهة إن كان نصف قطرها ≤ ٦٠ (أو المالديف)؛ فوقه تُعامل كدولة ولا تُرشَّح */
    const absorbers = all.filter(function(c){ return c.micro || (c.island && c.dest) || (c.p || 0) >= TK_BIG_P || c.mine; }).sort(function(a, b){ return (b.micro || (b.island && b.dest) ? 1e12 : 0) + (b.p || 0) - ((a.micro || (a.island && a.dest) ? 1e12 : 0) + (a.p || 0)); });
    const ag = {}; absorbers.forEach(function(b){ const rc = Math.ceil(b.rr / 100) + 1; const la = Math.floor(b.lat), lo = Math.floor(b.lng); for (let i = -rc; i <= rc; i++) for (let j = -rc; j <= rc; j++){ const k = (la + i) + ':' + (lo + j); (ag[k] = ag[k] || []).push(b); } }); /* فهرس الممتصّين بخلايا درجة (نصف القطر ≤ ٩٠ كم) — بلا فهرس: ٤٥ ث على ملف المالك */
    all.forEach(function(c){ if (c.mine || c.micro || (c.island && c.dest)) return; const near = ag[Math.floor(c.lat) + ':' + Math.floor(c.lng)] || []; let best = null; near.forEach(function(b){ if (b === c) return; const d = tkKm(c, b); const ok = (b.micro || (b.island && b.dest)) ? d <= b.rr : ((b.p || 0) >= TK_ABSORB_RATIO * (c.p || 0) && d <= b.rr); if (ok && (!best || (b.micro || (b.island && b.dest) ? 1e12 : 0) + (b.p || 0) > (best.micro || (best.island && best.dest) ? 1e12 : 0) + (best.p || 0))) best = b; }); if (best) c.absorbedBy = best; }); /* القاعدة ١: الامتصاص ≥ ٣× (بروكلين ← نيويورك · الدرعية ← الرياض) · القاعدة ٥: ما خرج عن نصف القطر يبقى بذاته (كان · بيلاجيو · مونترو) */
    all.forEach(function(c){ if (c.mine) return; if (c.island && !c.dest){ bigIslands.push(c); return; } if (c.absorbedBy) absorbed.push(c); else gaz.push(c); }); }
  mine.forEach(function(c){ if (typeof c.lat !== 'number'){ const ctr = cityCenterOf(c.id); if (ctr){ c.lat = ctr[0]; c.lng = ctr[1]; } } if (!c.rr) c.rr = tkCityR(c); });
  const grid = {}, subGrid = {}; gaz.forEach(function(c){ const k = Math.floor(c.lat) + ':' + Math.floor(c.lng); (grid[k] = grid[k] || []).push(c); }); absorbed.forEach(function(c){ const k = Math.floor(c.lat) + ':' + Math.floor(c.lng); (subGrid[k] = subGrid[k] || []).push(c); }); /* فهرس شبكي بدرجة واحدة (بلا فهرس: ٢٧٣ ث على ملف المالك) */
  return { mine: mine.filter(function(c){ return typeof c.lat === 'number'; }), gaz: gaz, grid: grid, absorbed: absorbed, subGrid: subGrid, bigIslands: bigIslands };
}
function tkNear(loc, grid){ const la = Math.floor(loc.lat), lo = Math.floor(loc.lng); let out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++){ const k = (la + i) + ':' + (lo + j); if (grid[k]) out = out.concat(grid[k]); } return out; }
function tkPickCity(loc, cands){ // → { city, sub } · مدينتك أولًا داخل نصف قطرها (× ١٫٢) · وإلا الأقرب نسبيًّا (d/r) بين غير الممتصّين الذين تحتويه أنصافهم · sub = المُمتصّ الذي كان سيتبعه (لـsplit out الدقيق)
  if (!loc) return null; let best = null, bestS = Infinity;
  cands.mine.forEach(function(c){ const d = tkKm(loc, c); const s = d / (c.rr * TK_RADIUS_SLACK); if (s <= 1 && s < bestS){ best = c; bestS = s; } });
  if (!best){ tkNear(loc, cands.grid || {}).forEach(function(c){ const s = tkKm(loc, c) / c.rr; if (s <= 1 && s < bestS){ best = c; bestS = s; } }); }
  let sub = null, subS = Infinity;
  if (!best){ tkNear(loc, cands.subGrid || {}).forEach(function(c){ const s = tkKm(loc, c) / c.rr; if (s <= 1 && s < subS){ sub = c; subS = s; } }); if (sub) best = sub.absorbedBy; } /* المُمتصّ يمدّ بصمة مدينته: مكان داخل نصف قطر الضاحية لا المدينة يتبع المدينة (sub = الضاحية) */
  if (!best){ (cands.bigIslands || []).forEach(function(isl){ const s = tkKm(loc, isl) / isl.rr; if (s <= 1 && s < bestS){ best = isl; bestS = s; } }); if (best) return { city: best, sub: null, d: Math.round(tkKm(loc, best) * 10) / 10 }; } /* الجزيرة الكبيرة (> ٦٠): «بقية الجزيرة» لما لا تحتويه بلدة */
  if (!best) return null;
  if (!sub){ tkNear(loc, cands.subGrid || {}).forEach(function(c){ if (!c.absorbedBy || c.absorbedBy.id !== best.id) return; const s = tkKm(loc, c) / c.rr; if (s <= 1 && s < subS){ sub = c; subS = s; } }); }
  return { city: best, sub: sub, d: Math.round(tkKm(loc, best) * 10) / 10 };
}

/* ── IM1 · الورقة (بالقشرة الموحَّدة dash) ── */
function tkOpenImport(){ const bd = document.getElementById('dashBackdrop'); if (!bd) return; bd.classList.add('show'); dashSet('📥 Import from Google Maps', null); if (tkState.phase === 'intro' || !tkState.plan) tkState.phase = 'intro'; tkRender(); }
function tkWaiting(){ try{ return localStorage.getItem('mp_tk_waiting') || ''; }catch(_){ return ''; } }
function tkMarkWaiting(){ try{ localStorage.setItem('mp_tk_waiting', String(Date.now())); }catch(_){} tkRender(); if (typeof renderPlacesMine === 'function') try{ renderPlacesMine(); }catch(_){} }
function tkClearWaiting(){ try{ localStorage.removeItem('mp_tk_waiting'); }catch(_){} }
function tkMeanwhile(){ closeModalById('dashBackdrop'); try{ switchTab('Places'); }catch(_){} if (!cityListCityId){ plAddCity(); } else { plTogglePanel('cats'); } }
function tkIntroHtml(){ const w = tkWaiting(); const signed = !!currentUser; /* r84-2 §٧: التعليمات من أول خطوة · منتجان في Takeout (Saved + Maps (your places)) · النص الأساسي عاجي لا فضي */
  const steps = ['Open <b>takeout.google.com</b> and sign in with the Google account you use in Maps.', 'Tap <b>Deselect all</b>.', 'Tick <b>two</b> items only: <b>Saved</b> (your lists) and <b>Maps (your places)</b>.', 'Tap <b>Next step</b> → keep “Send download link via email” · Export once · .zip → <b>Create export</b>.', 'Google emails you “Your Google data is ready” — usually within minutes, up to a few hours for big accounts.', 'Open the email → <b>Download your files</b> (sign in again). The .zip lands in <b>Files → Downloads</b> on iPhone, or <b>Downloads</b> on Android.', 'Back here: <b>Choose the Takeout file</b> → pick the .zip (no need to unzip).'];
  const li = function(t, i){ return '<li style="margin:2px 0;">' + t + '</li>'; };
  return '<div style="text-align:left; line-height:1.55; font-size:13px;"><b>How to get your file from Google</b><ol style="margin:4px 0 0; padding-left:20px;">' + steps.slice(0, 3).map(li).join('') + '</ol><details id="tkSteps"' + (w ? ' open' : '') + '><summary class="dim" style="cursor:pointer; font-size:12px; margin:2px 0 0 2px;">show all steps</summary><ol start="4" style="margin:2px 0 0; padding-left:20px;">' + steps.slice(3).map(li).join('') + '</ol></details></div>'
    + '<div class="chiprow" style="margin:10px 0 6px;"><a class="chip" href="https://takeout.google.com/" target="_blank" rel="noopener" onclick="tkMarkWaiting()">Open Google Takeout ↗</a></div>' + (w ? '<div style="font-size:12.5px; margin:0 0 6px;">⏳ Waiting for your Takeout file — when Google’s email arrives, come back and choose it here.</div>' : '')
    + (signed ? '<label class="cta" style="display:block; text-align:center; cursor:pointer;">📁 Choose the Takeout file<input type="file" id="tkFile" accept=".zip,.csv,.json" multiple style="display:none;" onchange="tkFilesChosen(this.files)"></label>' : '<button type="button" class="cta" onclick="closeModalById(\'dashBackdrop\'); openAuthModal()">Sign in to import</button>')
    + '<div class="dim" style="font-size:11.5px; margin-top:6px; text-align:center;">🔒 Nothing leaves your phone — the file is read here, nothing is uploaded, nothing is read from Google.</div>'
    + (w ? '<button type="button" class="btn btn-ghost" style="margin-top:10px; padding:7px 14px; font-size:12px;" onclick="tkMeanwhile()">Meanwhile, paste one place</button>' : '')
    + (tkState.err ? '<div class="pl-sub" style="color:#ffb4a2; margin-top:8px;">' + escapeHtml(tkState.err) + '</div>' : '');
}
function tkRender(){ const body = document.getElementById('dashBody'); if (!body) return; let h = '';
  if (tkState.phase === 'intro') h = tkIntroHtml(); else if (tkState.phase === 'reading') h = '<div style="font-size:13px;">Reading your file… ' + escapeHtml(tkState.progress || '') + '</div>'; else if (tkState.phase === 'plan') h = tkPlanHtml(); else if (tkState.phase === 'commit') h = '<div style="font-size:13px;">Importing… ' + escapeHtml(tkState.progress || '') + '</div>'; else if (tkState.phase === 'done') h = tkResultHtml();
  body.innerHTML = h;
}
async function tkFilesChosen(files){ if (!files || !files.length) return; tkState.err = ''; tkState.phase = 'reading'; tkState.progress = ''; tkRender();
  try{ const entries = []; for (let i = 0; i < files.length; i++){ const f = files[i]; const nm = String(f.name || ''); if (/\.zip$/i.test(nm)){ const buf = await f.arrayBuffer(); const inner = await tkUnzip(buf); inner.forEach(function(e){ entries.push(e); }); } else { entries.push({ name: nm, text: await f.text() }); } }
    const plan = await tkBuildPlan(entries, function(p){ tkState.progress = p; tkRender(); }); tkState.plan = plan; tkState.phase = 'plan'; tkClearWaiting(); tkRender();
  }catch(e){ mpSwallow(e, 'import'); tkState.err = 'Could not read this file · ' + ((e && e.message) || 'error'); tkState.phase = 'intro'; tkRender(); }
}

/* ── IM3 → IM7 · الخطة: التنفيذ ذاته بلا حفظ — كل صف وحالته ومدينته (الأرقام المعروضة دقيقة لا تقديرية) ── */
async function tkBuildPlan(entries, onProgress){
  const rows = [], lists = {}; let xNoLink = 0, xNoLoc = 0;
  entries.forEach(function(e){ const kind = tkWanted(e.name); if (!kind) return; let rs = []; if (kind === 'csv'){ const ln = tkListNameOf(e.name); rs = tkCsvRows(e.text, ln); if (!lists[ln]) lists[ln] = { name: ln, from: tkListFrom(ln), n: 0, section: tkSuggestSection(ln) }; } else rs = tkJsonRows(e.text);
    rs.forEach(function(r){ if (!r.url || !isGoogleMapsUrl(r.url)){ xNoLink++; return; } if (!r.loc){ xNoLoc++; return; } if (kind === 'csv'){ lists[tkListNameOf(e.name)].n++; } else { if (!lists.Saved) lists.Saved = { name: 'Saved', from: 'saved', n: 0, section: '' }; lists.Saved.n++; } rows.push(r); }); });
  // تكرار داخل الملف نفسه (gid واحد في قائمتين) → صف واحد
  const seen = {}; const uniq = []; let xDupFile = 0; rows.forEach(function(r){ if (r.gid){ if (seen[r.gid]){ xDupFile++; return; } seen[r.gid] = true; } uniq.push(r); });
  if (onProgress) onProgress(uniq.length + ' places · finding cities…'); await tkTick();
  const cands = await tkCityCandidates(uniq); const byCity = {}, other = { n: 0, byCountry: {} };
  for (let i = 0; i < uniq.length; i++){ const r = uniq[i]; const pick = tkPickCity(r.loc, cands); if (!pick){ other.n++; const k = r.cc ? (tkCountryName(r.cc) || r.cc) : 'unknown country'; other.byCountry[k] = (other.byCountry[k] || 0) + 1; r.city = null; continue; } r.city = pick.city.id; r.sub = pick.sub ? pick.sub.id : null;
    if (!byCity[r.city]) byCity[r.city] = tkNodeOf(pick.city); const node = byCity[r.city]; node.rows.push(r); if (pick.sub){ if (!node.subs[pick.sub.id]) node.subs[pick.sub.id] = { id: pick.sub.id, name: pick.sub.name, n: 0, ent: pick.sub, split: false }; node.subs[pick.sub.id].n++; }
    if (i % 200 === 199){ if (onProgress) onProgress((i + 1) + ' / ' + uniq.length + ' placed…'); await tkTick(); } }
  // IM7 · التكرار بثلاث درجات مع مستندات المدن القائمة (قراءة لكل مدينة عندك — الخطة تحتاجها والحفظ يعيد استعمالها)
  const ids = Object.keys(byCity); for (let i = 0; i < ids.length; i++){ const c = byCity[ids[i]]; if (!c.isNew && currentUser){ try{ if (myCityListLoadedFor === c.id && myCityListData) c.existing = { fromMemory: true, categories: myCityListData.categories || {}, meta: { public: myCityListData.public === true, sharedWith: myCityListData.sharedWith || [], sharedWithNames: myCityListData.sharedWithNames || {}, bookmarkCount: myCityListData.bookmarkCount || 0 } }; else { const d = await mpData.cityLists.get(currentUser.uid, c.id); c.existing = d ? { categories: d.categories || {}, meta: { public: d.public === true, sharedWith: d.sharedWith || [], sharedWithNames: d.sharedWithNames || {}, bookmarkCount: d.bookmarkCount || 0 } } : null; } }catch(e){ mpSwallow(e, 'import-read'); c.readFailed = true; c.on = false; } }
    tkDedupeCity(c); if (onProgress) onProgress('checking ' + c.name + '…'); await tkTick(); }
  const cities = ids.map(function(k){ return byCity[k]; }); tkAttach(cities, cands); cities.sort(function(a, b){ return b.rows.length - a.rows.length; });
  return { importId: 'imp_' + Date.now().toString(36), at: Date.now(), rows: uniq.length, lists: Object.keys(lists).map(function(k){ return lists[k]; }).filter(function(l){ return l.n > 0; }), cities: cities, other: other, x: { noLink: xNoLink, noLoc: xNoLoc, dupFile: xDupFile }, waiting: [], open: {} };
}
function tkNodeOf(c){ return { id: String(c.id), name: c.name, country: c.country || '', cc: c.cc || plCountryCode(c.country || ''), lat: c.lat, lng: c.lng, p: c.p || 0, rr: c.rr || tkCityR(c), island: !!c.island, isNew: !c.mine, mine: !!c.mine, row: c.row || null, rows: [], on: true, existing: null, subs: {}, parentId: null, merged: false, moved: null, fromSplit: false }; }
function tkAttach(cities, cands){ // الشجرة: البلدة الأصغر تُعلَّق تحت أقرب مدينة كبيرة (≥ ١٠٠ ألف أو مدينتك أو جزيرة-وجهة) في الدولة نفسها ضمن ٤٥ كم · الجزيرة الكبيرة (> ٦٠) عقدة أمًّا افتراضية لما عليها
  const tops = cities.filter(function(c){ return c.mine || c.p >= TK_BIG_P || c.island; });
  cities.forEach(function(c){ if (c.mine || c.p >= TK_BIG_P || c.island) return; let best = null, bd = Infinity; tops.forEach(function(t){ if (t.cc !== c.cc) return; const d = tkKm(c, t); if (d <= TK_ATTACH_KM && d < bd){ best = t; bd = d; } }); if (best){ c.parentId = best.id; return; }
    (cands.bigIslands || []).forEach(function(isl){ if (isl.cc !== c.cc) return; const d = tkKm(c, isl); if (d <= isl.rr && d < bd){ bd = d; best = isl; } }); if (best){ let node = cities.find(function(x){ return x.id === String(best.id); }); if (!node){ node = tkNodeOf(best); node.virtual = true; cities.push(node); } c.parentId = node.id; } });
}
function tkIsChild(c){ return !!c.parentId && (c.merged || c.fromSplit || c.rows.length < TK_SMALL_N); } /* قرار المالك ١٢:٤٠: الفرع بعدد الأماكن لا بالسكان — ما فيه ٥ فأكثر مدينة عليا بذاته (كان ٣١ لا تُرسم تحت نيس) ويحتفظ بزر الضمّ */
function tkChildren(p, id){ return p.cities.filter(function(c){ return c.parentId === id && tkIsChild(c); }); }
function tkRedo(c){ if (c.virtual && !c.rows.length){ c.newN = 0; c.dup = 0; c.similar = 0; c.gidWrites = []; return; } tkDedupeCity(c); }
function tkMerge(id){ const p = tkState.plan; const c = p.cities.find(function(x){ return x.id === id; }); if (!c || !c.parentId || c.merged) return; const P = p.cities.find(function(x){ return x.id === c.parentId; }); if (!P) return;
  c.moved = c.rows; c.rows = []; c.merged = true; c.moved.forEach(function(r){ r.city = P.id; r.areaFrom = c.name; P.rows.push(r); }); if (P.virtual){ P.virtual = false; P.wasVirtual = true; } tkRedo(P); tkRedo(c); tkRender(); } /* الضمّ: الأماكن تدخل المدينة الكبيرة والحي = اسم البلدة (كما يفعل المالك: Outside Paris - Versailles) */
function tkUnmerge(id){ const p = tkState.plan; const c = p.cities.find(function(x){ return x.id === id; }); if (!c || !c.merged) return; const P = p.cities.find(function(x){ return x.id === c.parentId; });
  c.rows = c.moved || []; c.moved = null; c.merged = false; c.rows.forEach(function(r){ r.city = c.id; delete r.areaFrom; }); if (P){ P.rows = P.rows.filter(function(r){ return r.city !== c.id; }); if (P.wasVirtual && !P.rows.length) P.virtual = true; tkRedo(P); } tkRedo(c); tkRender(); }
function tkSplit(cityId, subId){ // split out: المُمتصّ يصير بلدة بذاتها تحت المدينة — بأماكنه هي بعينها (الخطة تحفظ لكل مكان مُمتصَّه)
  const p = tkState.plan; const c = p.cities.find(function(x){ return x.id === cityId; }); if (!c) return; const sub = c.subs[subId]; if (!sub || sub.split) return;
  const n = tkNodeOf(sub.ent); n.parentId = c.id; n.fromSplit = true; n.rows = c.rows.filter(function(r){ return r.sub === subId; }); c.rows = c.rows.filter(function(r){ return r.sub !== subId; }); n.rows.forEach(function(r){ r.city = n.id; }); sub.split = true; p.cities.push(n); tkRedo(c); tkRedo(n); tkRender();
}
function tkUnsplit(id){ const p = tkState.plan; const n = p.cities.find(function(x){ return x.id === id; }); if (!n || !n.fromSplit) return; const c = p.cities.find(function(x){ return x.id === n.parentId; }); if (!c) return; n.rows.forEach(function(r){ r.city = c.id; c.rows.push(r); }); if (c.subs[n.id]) c.subs[n.id].split = false; p.cities = p.cities.filter(function(x){ return x !== n; }); tkRedo(c); tkRender(); }
function tkTick(){ return new Promise(function(res){ setTimeout(res, 0); }); }
function tkDedupeCity(c){ // (أ) gid · (ب) الاسم + القرب ≤ ٣٠٠ م والقديم مدبَّس → مكرر · الاسم وحده → similar (S7) · لا دمج بالاسم وحده
  const ex = []; const cats = (c.existing && c.existing.categories) || {}; Object.keys(cats).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p){ if (!p || !(p.name || p.url)) return; const ids = p.gid ? { gid: String(p.gid) } : tkIdsFromUrl(p.url); ex.push({ p: p, gid: ids.gid || '', key: tkNorm(p.name, c.name), geo: (p.geo && typeof p.geo.lat === 'number') ? p.geo : null }); }); });
  const byGid = {}, byKey = {}, byUrl = {}; ex.forEach(function(e){ if (e.gid) byGid[e.gid] = e; if (e.key){ (byKey[e.key] = byKey[e.key] || []).push(e); } if (e.p.url) byUrl[String(e.p.url).trim()] = e; });
  c.dup = 0; c.similar = 0; c.newN = 0; c.gidWrites = [];
  c.rows.forEach(function(r){ r.state = 'new'; r.similar = false; const key = tkNorm(r.name, c.name);
    if (r.gid && byGid[r.gid]){ r.state = 'dup'; c.dup++; return; }
    if (r.url && byUrl[String(r.url).trim()]){ r.state = 'dup'; c.dup++; return; } /* الرابط نفسه حرفيًّا (صف بلا معرّف يُعاد استيراده) */
    const same = key ? (byKey[key] || []) : []; if (same.length){ const near = same.find(function(e){ return e.geo && r.loc && tkKm(r.loc, e.geo) <= TK_DUP_KM; }); if (near){ r.state = 'dup'; c.dup++; if (r.gid && !near.p.gid){ c.gidWrites.push({ p: near.p, gid: r.gid }); } return; } r.similar = true; c.similar++; }
    c.newN++; });
  if (c.newN > TK_CAP_PER_CITY){ c.capped = c.newN - TK_CAP_PER_CITY; }
}

/* ── المعاينة: الشجرة (دولة ← مدينة كبيرة ← بلدات أصغر) · بلا إخفاء · < ٥ بخط زعفراني · ضمّ/فكّ بضغطة · includes بأعداده وsplit out · الزر الواحد بعدّه الحي ── */
function tkCountable(c){ return c.on && !c.merged && !c.readFailed && c.rows.length > 0; }
function tkTotals(p){ const on = p.cities.filter(tkCountable); return { places: on.reduce(function(a, c){ return a + Math.min(c.newN || 0, TK_CAP_PER_CITY); }, 0), create: on.filter(function(c){ return c.isNew && (c.newN || 0) > 0; }).length, cities: on.length }; }
function tkCountries(p){ const by = {}; p.cities.forEach(function(c){ if (c.merged && !c.parentId) return; const k = c.cc || '??'; if (!by[k]) by[k] = { cc: k, name: c.country || tkCountryName(k) || k, nodes: [], places: 0, small: 0, cities: 0 }; by[k].nodes.push(c); if (!c.merged && !c.virtual){ by[k].places += c.rows.length; by[k].cities++; if (c.rows.length < TK_SMALL_N && c.rows.length) by[k].small++; } });
  return Object.keys(by).map(function(k){ return by[k]; }).sort(function(a, b){ return b.places - a.places; }); }
function tkFlag(cc){ cc = String(cc || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(cc)) return '🌍'; return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65); }
function tkCountsHtml(c){ const bits = [Math.min(c.newN || 0, TK_CAP_PER_CITY) + ' new' + (c.capped ? ' (first ' + TK_CAP_PER_CITY + ' — ' + c.capped + ' more next time)' : '')]; if (c.dup) bits.push(c.dup + ' already here'); if (c.similar) bits.push(c.similar + ' similar'); if (c.readFailed) bits.push('<span style="color:#ffb4a2;">could not read this city — try again</span>'); return bits.join(' · '); }
function tkIncludesHtml(c){ const subs = Object.keys(c.subs || {}).map(function(k){ return c.subs[k]; }).filter(function(x){ return x.n > 0 && !x.split; }).sort(function(a, b){ return b.n - a.n; }); if (!subs.length) return '';
  return '<details style="margin-top:3px;"><summary class="dim" style="cursor:pointer; font-size:11.5px;">includes ' + subs.slice(0, 3).map(function(x){ return escapeHtml(x.name) + ' ' + x.n; }).join(' · ') + (subs.length > 3 ? ' +' + (subs.length - 3) : '') + '</summary>' + subs.map(function(x){ return '<div style="display:flex; align-items:center; gap:8px; padding:3px 0 3px 10px;"><span style="flex:1; font-size:12px;" dir="auto">' + escapeHtml(x.name) + ' <span class="dim">· ' + x.n + '</span></span><button type="button" class="chip" style="font-size:10.5px; padding:2px 8px;" onclick="tkSplit(\'' + attrStr(c.id) + '\', \'' + attrStr(x.id) + '\')">split out</button></div>'; }).join('') + '</details>';
}
function tkChildHtml(p, c, P){ const few = c.rows.length && c.rows.length < TK_SMALL_N; const bar = 'border-left:3px solid ' + (few ? 'var(--saffron)' : 'transparent') + '; padding-left:8px; margin:6px 0 0 4px;';
  if (c.merged) return '<div style="' + bar + ' display:flex; align-items:center; gap:6px; flex-wrap:wrap;"><span class="dim" style="text-decoration:line-through;">' + escapeHtml(c.name) + '</span><span class="dim">' + (c.moved || []).length + '</span><span style="font-size:11.5px; color:#8fd19e; font-weight:700;">→ under ' + escapeHtml(P.name) + ' · area “' + escapeHtml(c.name) + '”</span><button type="button" class="chip" style="font-size:10.5px; padding:2px 8px;" onclick="tkUnmerge(\'' + attrStr(c.id) + '\')">undo</button></div>';
  return '<div style="' + bar + '"><label style="display:flex; align-items:center; gap:6px;"><input type="checkbox"' + (c.on ? ' checked' : '') + ' onchange="tkToggleCity(\'' + attrStr(c.id) + '\', this.checked)"><b dir="auto" style="flex:1; min-width:0;">' + escapeHtml(c.name) + ' <span class="dim" style="font-weight:600;">· ' + c.rows.length + '</span></b>' + (c.fromSplit ? '<span class="chip mini" data-label="1">split out</span>' : '') + '</label><div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:4px 0 0 24px;"><button type="button" class="chip" style="font-size:10.5px; padding:2px 8px;" onclick="tkMerge(\'' + attrStr(c.id) + '\')">⤴ under ' + escapeHtml(P.name) + '</button><span class="chip on" data-label="1" style="font-size:10.5px; padding:2px 8px;">own city</span>' + (c.fromSplit ? '<button type="button" class="chip" style="font-size:10.5px; padding:2px 8px;" onclick="tkUnsplit(\'' + attrStr(c.id) + '\')">undo</button>' : '') + '<span class="dim" style="font-size:11px;">' + tkCountsHtml(c) + '</span></div>' + tkIncludesHtml(c) + '</div>';
}
function tkCityHtml(p, c){ const kids = tkChildren(p, c.id); const few = c.rows.length && c.rows.length < TK_SMALL_N && !c.mine;
  let h = '<div style="background:var(--surf); border:1px solid var(--line-night); border-radius:12px; padding:9px 10px; margin:6px 0;' + (few ? ' border-left:3px solid var(--saffron);' : '') + '">';
  if (c.virtual && !c.rows.length) h += '<div><b dir="auto">' + escapeHtml(c.name) + '</b> <span class="chip mini" data-label="1">island</span> <span class="dim">· cities on it below — tuck any under “' + escapeHtml(c.name) + '” to make it one destination</span></div>';
  else h += '<label style="display:flex; gap:8px; align-items:flex-start;"><input type="checkbox"' + (c.on ? ' checked' : '') + (c.readFailed ? ' disabled' : '') + ' onchange="tkToggleCity(\'' + attrStr(c.id) + '\', this.checked)"><span style="flex:1; min-width:0;"><b dir="auto">' + escapeHtml(c.name) + '</b> ' + (c.mine ? '<span class="chip mini" data-label="1">yours</span>' : '<span class="chip mini" data-label="1">new city</span>') + (c.island ? ' <span class="chip mini" data-label="1">island</span>' : '') + '<br><span class="dim" style="font-size:11.5px;">' + tkCountsHtml(c) + ((few && !kids.length) ? ' · <span style="color:var(--saffron);">nothing bigger nearby — keep it, or untick it</span>' : '') + '</span></span></label>' + (c.parentId && !c.mine ? (function(){ const P = p.cities.find(function(x){ return x.id === c.parentId; }); return P ? '<div style="margin:4px 0 0 24px;"><button type="button" class="chip" style="font-size:10.5px; padding:2px 8px;" onclick="tkMerge(\'' + attrStr(c.id) + '\')">⤴ under ' + escapeHtml(P.name) + '</button></div>' : ''; })() : '') + tkIncludesHtml(c);
  h += kids.map(function(k){ return tkChildHtml(p, k, c); }).join('');
  return h + '</div>';
}
function tkToggleCountry(cc){ const p = tkState.plan; p.open[cc] = !p.open[cc]; tkRender(); }
function tkPlanHtml(){ const p = tkState.plan; if (!p) return ''; const t = tkTotals(p); const cs = tkCountries(p); const nC = p.cities.filter(function(c){ return !c.merged && !c.virtual; }).length;
  let h = '<div style="line-height:1.5; margin:2px 0 6px;"><b>' + p.rows + ' places</b> found in your file · <b>' + cs.length + ' countr' + (cs.length === 1 ? 'y' : 'ies') + ' · ' + nC + ' cities</b>' + (p.other.n ? ' · ' + p.other.n + ' in places we don’t cover yet' : '') + '</div>';
  h += '<div class="dim" style="font-size:11px; margin:0 0 8px;"><span style="display:inline-block; width:3px; height:11px; background:var(--saffron); vertical-align:-1px; margin-right:5px;"></span>fewer than ' + TK_SMALL_N + ' places — keep it, or tuck it under the big city next door</div>';
  cs.forEach(function(co){ const open = p.open[co.cc] !== undefined ? p.open[co.cc] : (cs.length <= 3 || co.nodes.some(tkIsChild)); /* مطويّة إلا ما فيه قرار (بلدة تحت كبيرة) — والخطة الصغيرة (≤ ٣ دول) مفتوحة كلها */
    h += '<div style="border:1.5px solid var(--line-night, #2a3a55); border-radius:14px; margin:0 0 8px; overflow:hidden;"><button type="button" style="display:flex; width:100%; align-items:center; gap:8px; padding:10px 12px; background:none; border:none; color:inherit; font:inherit; font-weight:800; font-size:14px; cursor:pointer; text-align:left;" onclick="tkToggleCountry(\'' + attrStr(co.cc) + '\')"><span>' + tkFlag(co.cc) + '</span><span style="flex:1;" dir="auto">' + escapeHtml(co.name) + '</span><span class="dim" style="font-size:12px; font-weight:600;">' + co.cities + ' cit' + (co.cities === 1 ? 'y' : 'ies') + ' · ' + co.places + ' places' + (co.small ? ' · <span style="color:var(--saffron);">' + co.small + ' small</span>' : '') + '</span><span class="dim">' + (open ? '⌃' : '⌄') + '</span></button>';
    if (open) h += '<div style="padding:0 8px 6px;">' + co.nodes.filter(function(c){ return !tkIsChild(c); }).sort(function(a, b){ return b.rows.length - a.rows.length; }).map(function(c){ return tkCityHtml(p, c); }).join('') + '</div>';
    h += '</div>'; });
  if (p.other.n){ const ks = Object.keys(p.other.byCountry); h += '<div class="row rowblock"><span class="dim">Not covered yet · ' + p.other.n + (ks.length ? ' (' + ks.map(function(k){ return escapeHtml(k) + ' ' + p.other.byCountry[k]; }).join(' · ') + ')' : '') + ' · kept out for now</span></div>'; }
  const xs = []; if (p.x.noLink) xs.push(p.x.noLink + ' without a Maps link'); if (p.x.noLoc) xs.push(p.x.noLoc + ' without a location'); if (p.x.dupFile) xs.push(p.x.dupFile + ' repeated in the file'); if (xs.length) h += '<div class="dim" style="font-size:11.5px; margin:4px 0;">Skipped: ' + xs.join(' · ') + '</div>';
  h += '<details style="margin:8px 0;"><summary class="dim" style="cursor:pointer;">Fine-tune (optional) — what each list is mostly about</summary>' + p.lists.map(function(l, i){ return '<div class="row" style="display:flex; gap:8px; align-items:center;"><span style="flex:1;" dir="auto">' + escapeHtml(l.name) + ' <span class="dim">· ' + l.n + '</span></span><select class="modal-input" style="max-width:52%; margin:0;" onchange="tkSetListSection(' + i + ', this.value)">' + tkSectionOptions(l.section) + '</select></div>'; }).join('') + '<div class="dim" style="font-size:11px; margin-top:4px;">Saved · Want to go · Favorites mean something different to everyone — tell us once, or set it later from the imported box.</div></details>';
  h += '<button type="button" class="cta" style="display:block; width:100%;"' + (t.places ? '' : ' disabled') + ' onclick="tkCommit()">Import ' + t.places + ' place' + (t.places === 1 ? '' : 's') + (t.create ? ' · create ' + t.create + ' cit' + (t.create === 1 ? 'y' : 'ies') : '') + '</button>';
  h += '<div class="dim" style="font-size:11.5px; margin-top:6px; text-align:center;">🔒 Nothing leaves your phone · locations in the file are used once to sort into cities and are not kept.</div>';
  h += '<button type="button" class="btn btn-ghost" style="margin-top:8px; padding:7px 14px; font-size:12px;" onclick="tkState.phase = \'intro\'; tkState.plan = null; tkRender()">← Choose another file</button>';
  return h;
}
function tkToggleCity(id, on){ const c = (tkState.plan.cities || []).find(function(x){ return x.id === id; }); if (c) c.on = !!on; tkRender(); }
function tkSetListSection(i, v){ const l = tkState.plan.lists[i]; if (l) l.section = v || ''; }

/* ── IM8 · الحفظ: مجموعة tk:<القائمة> في مستند كل مدينة — حفظة لكل مدينة بحارس العدّ · gid على القديم فقط · لا loc في أي مكتوب ── */
function tkPlaceOf(r, section, plan){ const p = { id: 'place_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), name: String(r.name || '').slice(0, 120), url: r.url, from: r.from, importedAt: plan.at, importId: plan.importId, updatedAt: plan.at }; if (r.note) p.note = r.note.slice(0, 1000); if (r.gid) p.gid = r.gid; if (section) p.section = section; if (r.similar) p.similar = true; if (r.areaFrom){ p.area = String(r.areaFrom).slice(0, 80); p.town = p.area; } return p; } /* الضمّ: الحي = اسم البلدة · town = علامة «بلدة ضُمّت» (كلمة المالك ١٣:٠٠ — تخدم مسار اليوم والفصل لاحقًا) */
function tkLiveCount(cats){ return Object.keys(cats || {}).reduce(function(a, k){ return a + (((cats[k] || {}).places) || []).filter(function(q){ return q && (q.name || q.url); }).length; }, 0); }
async function tkCommit(){ const plan = tkState.plan; if (!plan || tkState.busy || !currentUser) return; if (currentUserSuspended){ showToast("Your account is suspended — you can't save changes"); return; } tkState.busy = true; tkState.phase = 'commit'; tkState.progress = ''; tkRender();
  const res = { cities: 0, created: 0, added: 0, dup: 0, similar: 0, gid: 0, failed: [], perCity: [] }; const sectionOf = {}; plan.lists.forEach(function(l){ sectionOf[l.from] = l.section || ''; });
  try{
    const on = plan.cities.filter(tkCountable);
    // المدن الجديدة تُخلَّد أولًا (المعجم ذاته الذي يخدم + City) — حفظة واحدة لمستند المستخدم
    const toCreate = on.filter(function(c){ return c.isNew && c.row && c.newN > 0; }); if (toCreate.length){ if (!Array.isArray(userListData.customCities)) userListData.customCities = []; toCreate.forEach(function(c){ if (!userListData.customCities.some(function(x){ return String(x.id) === c.id; })){ userListData.customCities.push(gazEntryToCity(c.row, c.country)); res.created++; } }); await saveUserListGeneral(); }
    const counts = {};
    for (let i = 0; i < on.length; i++){ const c = on[i]; tkState.progress = c.name + ' (' + (i + 1) + '/' + on.length + ')'; tkRender(); await tkTick();
      const cats = {}; const src = (c.existing && c.existing.categories) || {}; Object.keys(src).forEach(function(k){ cats[k] = { active: src[k].active !== false, places: (src[k].places || []).slice() }; });
      const before = tkLiveCount(cats); let added = 0;
      c.rows.forEach(function(r){ if (r.state !== 'new' || added >= TK_CAP_PER_CITY) return; const gid = 'tk:' + r.list; if (!cats[gid]) cats[gid] = { active: true, places: [] }; cats[gid].places.push(tkPlaceOf(r, sectionOf[r.from] || '', plan)); added++; });
      c.gidWrites.forEach(function(w){ if (!w.p.gid){ w.p.gid = w.gid; res.gid++; } });
      const after = tkLiveCount(cats); if (after !== before + added){ res.failed.push(c.name + ' (count mismatch)'); continue; } // حارس العدّ: قبل + المُدخَل = بعد وإلا لا حفظ
      if (!added){ res.perCity.push({ id: c.id, name: c.name, added: 0, dup: c.dup, similar: c.similar }); continue; }
      const meta = (c.existing && c.existing.meta) || { public: false, sharedWith: [], sharedWithNames: {}, bookmarkCount: 0 };
      try{ await mpData.cityLists.save(currentUser.uid, c.id, Object.assign({}, meta, { ownerId: currentUser.uid, cityId: c.id, cityName: c.name, nickname: userListData.nickname || null, categories: cats, catsV: CATS_VERSION })); }
      catch(e){ mpSwallow(e, 'import-save'); res.failed.push(c.name); continue; }
      if (myCityListLoadedFor === c.id && myCityListData){ myCityListData.categories = cats; } counts[c.id] = after; res.cities++; res.added += added; res.dup += c.dup; res.similar += c.similar; res.perCity.push({ id: c.id, name: c.name, added: added, dup: c.dup, similar: c.similar });
    }
    const ks = Object.keys(counts); if (ks.length){ userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; const patch = { cityPlaceCounts: {} }; ks.forEach(function(k){ userListData.cityPlaceCounts[k] = counts[k]; patch.cityPlaceCounts[k] = counts[k]; }); try{ await mpData.userLists.merge(currentUser.uid, patch); }catch(e){ mpSwallow(e, 'import-counts'); } try{ mpData.users.flag(currentUser.uid, 'hasMyListActivity').catch(function(){}); }catch(_){} }
  }catch(e){ mpSwallow(e, 'import-commit'); res.failed.push('unexpected error'); }
  tkState.busy = false; tkState.result = res; tkState.phase = 'done'; tkCount(res, plan); logTiming('IMPORT · ' + plan.rows + ' rows · ' + res.cities + ' cities · ' + res.added + ' new · 0 external requests · 0 coordinates kept'); // IM-R: الدليل لا الوعد — في السطر الأصفر
  tkRender(); try{ if (typeof renderPlacesMine === 'function') renderPlacesMine(); }catch(_){} try{ if (typeof renderCityListChips === 'function') renderCityListChips(); }catch(_){}
}
function tkCount(res, plan){ try{ const k = 'mp_import_runs'; const c = JSON.parse(localStorage.getItem(k) || '{}'); c.runs = (c.runs || 0) + 1; c.last = { at: plan.at, rows: plan.rows, cities: res.cities, added: res.added, dup: res.dup }; localStorage.setItem(k, JSON.stringify(c)); }catch(_){} }
function tkImportLine(){ try{ const c = JSON.parse(localStorage.getItem('mp_import_runs') || '{}'); if (!c.runs) return 'Imports on this device: none yet'; return 'Imports on this device: ' + c.runs + ' · last: ' + c.last.rows + ' rows → ' + c.last.cities + ' cities · ' + c.last.added + ' new · ' + c.last.dup + ' already here'; }catch(_){ return 'Imports: n/a'; } }
function tkResultHtml(){ const r = tkState.result, p = tkState.plan; if (!r) return ''; const first = r.perCity.filter(function(c){ return c.added > 0; })[0];
  let h = '<div class="pl-guide-h" style="text-align:center;">Your Google Maps, now in MyPickz</div><div style="text-align:center; font-size:13px;"><b>' + r.cities + ' cit' + (r.cities === 1 ? 'y' : 'ies') + ' · ' + r.added + ' places</b>' + (r.created ? ' · ' + r.created + ' cities created' : '') + (r.dup ? ' · ' + r.dup + ' already here' : '') + (r.similar ? ' · ' + r.similar + ' similar (marked)' : '') + '</div>';
  if (r.failed.length) h += '<div class="pl-sub" style="color:#ffb4a2;">Not saved: ' + escapeHtml(r.failed.join(' · ')) + ' — choose the file again to retry those.</div>';
  h += '<div class="dim" style="font-size:11.5px; text-align:center;">Each city shows them under “Imported from Google Maps” until you sort them. Nothing was read from Google; locations in the file were used once and not kept.</div>';
  if (first) h += '<button type="button" class="cta" style="display:block; width:100%; margin-top:10px;" onclick="tkStartWith(\'' + attrStr(first.id) + '\')">Start with ' + escapeHtml(first.name) + ' · ' + first.added + ' to sort</button>';
  h += '<button type="button" class="btn btn-ghost" style="margin-top:8px; padding:7px 14px; font-size:12px;" onclick="mpCloseAll(\'dashBackdrop\')">Done</button>'; return h;
}
async function tkStartWith(cityId){ closeModalById('dashBackdrop'); try{ switchTab('Places'); }catch(_){} const c = cityListAllCities().find(function(x){ return String(x.id) === String(cityId); }); if (!c) return; cityListCountry = c.country; cityListCityId = c.id; if (userListData){ userListData.listCountry = c.country; userListData.listCity = c.id; } if (myCityListLoadedFor !== c.id){ myCityListLoadedFor = null; await loadMyCityList(c.id); } if (typeof renderPlacesMine === 'function') renderPlacesMine(); }
function tkSetSection(groupId, v){ // الصندوق: «mostly» يُضبط لاحقًا — لكل أماكن المجموعة في المدينة الحالية
  const e = myCityListData && myCityListData.categories && myCityListData.categories[groupId]; if (!e) return; (e.places || []).forEach(function(p){ if (!p) return; if (v) p.section = v; else delete p.section; }); saveMyCityList().then(function(){ showToast(v ? 'Set: mostly ' + tkSectionName(v) + ' ✓' : 'Cleared'); }).catch(function(e){ mpSwallow(e, 'import-section'); });
}
