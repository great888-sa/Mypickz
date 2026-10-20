/* ═══ أ-١٣ (r84 · ق١٠-١٩-٠١ · خريطة الاستيراد v1.1 عقد IM1…IM8 · IM-R): الاستيراد من Google Takeout — رفعة واحدة، كل مكان يجد مدينته
   الخطوط الحمراء (على الرسم كما في الكود): لا نداء لجوجل ولا للعامل · الملف لا يُرفع · موقع الملف في الذاكرة فقط (IM4) ويُطرح — لا يُكتب في أي مستند ولا يُرسل (٠٩-١٥-٠٥)
   · لا دمج بالاسم وحده (S7 «similar») · لا مساس بمكان قائم غير حقل gid · حارس العدّ قبل كل حفظة · المعاينة هي التنفيذ بلا حفظ (خطة → Commit من الخطة نفسها) */
const tkState = { phase: 'intro', plan: null, busy: false, result: null };
const TK_CAP_PER_CITY = 500; // ٠٩-١٥-٠٥ (السقف لكل مدينة — ق١٠-١٩-٠١ البند ٥)
const TK_DUP_KM = 0.3, TK_RADIUS_SLACK = 1.2, TK_ALT_GAP = 0.25, TK_BIG_CITY_P = 100000, TK_ALT_MIN_P = 20000;

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
function tkCityR(c){ if (c && c.r) return c.r; const p = Math.max((c && c.p) || 200000, 10000); return Math.max(6, Math.min(25, 6 + 19 * Math.log10(p / 10000) / 3)); }
function tkCountryName(cc){ const c = WORLD_COUNTRIES.find(function(x){ return x.code === cc; }); return c ? c.name : ''; }
function tkNorm(name, cityName){ let n = pickerNormalize(String(name || '')); const cn = pickerNormalize(String(cityName || '')); if (cn){ n = n.replace(new RegExp('(^|\\s)' + cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'g'), ' '); } return n.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim(); }
async function tkCityCandidates(rows){ // مدني (بمراكزها) + المعجم للدول الحاضرة (دول مدني + دول ملف النجمة)
  const mine = (currentUser ? cityListAllCities() : []).map(function(c){ return { id: String(c.id), name: c.name, country: c.country || '', lat: c.lat, lng: c.lng, r: c.r, p: c.p, mine: true }; });
  const ccs = {}; mine.forEach(function(c){ if (c.country) ccs[plCountryCode(c.country)] = c.country; }); rows.forEach(function(r){ if (r.cc && !ccs[r.cc]) ccs[r.cc] = tkCountryName(r.cc) || r.cc; });
  const gaz = []; const codes = Object.keys(ccs); for (let i = 0; i < codes.length; i++){ const cc = codes[i]; let list = []; try{ list = await gazLoad(cc); }catch(_){ list = []; } (list || []).forEach(function(row){ if (typeof row.lat !== 'number') return; const id = String(row.id); const m = mine.find(function(c){ return c.id === id; }) || mine.find(function(c){ return plCountryCode(c.country) === cc && pickerNormalize(c.name) === pickerNormalize(row.n); }); /* المدن المهاجَرة بمعرّف قديم (paris) تُعرف باسمها في معجم دولتها — لا تُنشأ مدينة ثانية بالاسم نفسه */ if (m){ if (typeof m.lat !== 'number'){ m.lat = row.lat; m.lng = row.lng; } if (row.r && !m.r) m.r = row.r; if (!m.p) m.p = row.p; return; } gaz.push({ id: id, name: row.n, country: ccs[cc] || tkCountryName(cc), cc: cc, lat: row.lat, lng: row.lng, r: row.r, p: row.p, row: row, mine: false }); }); }
  mine.forEach(function(c){ if (typeof c.lat !== 'number'){ const ctr = cityCenterOf(c.id); if (ctr){ c.lat = ctr[0]; c.lng = ctr[1]; } } }); /* احتياط: مركز المدينة من أماكنها المدبَّسة (المدينة المحمَّلة) */
  const grid = {}; gaz.forEach(function(c){ const k = Math.floor(c.lat) + ':' + Math.floor(c.lng); (grid[k] = grid[k] || []).push(c); }); /* فهرس شبكي بدرجة واحدة — الأنصاف ≤ ٢٥ كم فالجوار ٣×٣ خلايا يكفي (٢٦٠٠ مكان × ٢٣٦ ألف صف بلا فهرس = دقائق) */
  return { mine: mine.filter(function(c){ return typeof c.lat === 'number'; }), gaz: gaz, grid: grid };
}
function tkNear(loc, grid){ const la = Math.floor(loc.lat), lo = Math.floor(loc.lng); let out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++){ const k = (la + i) + ':' + (lo + j); if (grid[k]) out = out.concat(grid[k]); } return out; }
function tkPickCity(loc, cands){ // → { city, alt } · مدني يفوز داخل نصف قطره (مع هامش) · وإلا من المعجم: **أكبر مدينة يحتويها نصف قطرها** (الضواحي تتبع مدينتها الكبيرة — فرساي تحت باريس كما يفعل المالك) وإلا أقرب بلدة تحتويها · alt = الأقرب المختلف (IM5 «or Antibes?»)
  if (!loc) return null; let best = null, bestS = Infinity;
  cands.mine.forEach(function(c){ const d = tkKm(loc, c); const s = d / (tkCityR(c) * TK_RADIUS_SLACK); if (s <= 1 && s < bestS){ best = c; bestS = s; } });
  if (best) return { city: best, alt: null, d: Math.round(tkKm(loc, best) * 10) / 10 };
  const inside = []; tkNear(loc, cands.grid || {}).forEach(function(c){ const d = tkKm(loc, c); const s = d / tkCityR(c); if (s <= 1) inside.push({ c: c, s: s, d: d }); });
  if (!inside.length) return null;
  inside.sort(function(a, b){ return a.s - b.s; }); const nearest = inside[0];
  let big = null; inside.forEach(function(x){ if ((x.c.p || 0) >= TK_BIG_CITY_P && (!big || (x.c.p || 0) > (big.c.p || 0))) big = x; });
  const pickd = big || nearest; const alt = (pickd !== nearest && nearest.c.id !== pickd.c.id && (nearest.c.p || 0) >= TK_ALT_MIN_P) ? nearest.c : ((pickd === nearest && inside[1] && inside[1].s <= nearest.s + TK_ALT_GAP) ? inside[1].c : null);
  return { city: pickd.c, alt: alt, d: Math.round(pickd.d * 10) / 10 };
}

/* ── IM1 · الورقة (بالقشرة الموحَّدة dash) ── */
function tkOpenImport(){ const bd = document.getElementById('dashBackdrop'); if (!bd) return; bd.classList.add('show'); dashSet('📥 Import from Google Maps', null); if (tkState.phase === 'intro' || !tkState.plan) tkState.phase = 'intro'; tkRender(); }
function tkWaiting(){ try{ return localStorage.getItem('mp_tk_waiting') || ''; }catch(_){ return ''; } }
function tkMarkWaiting(){ try{ localStorage.setItem('mp_tk_waiting', String(Date.now())); }catch(_){} tkRender(); if (typeof renderPlacesMine === 'function') try{ renderPlacesMine(); }catch(_){} }
function tkClearWaiting(){ try{ localStorage.removeItem('mp_tk_waiting'); }catch(_){} }
function tkMeanwhile(){ closeModalById('dashBackdrop'); try{ switchTab('Places'); }catch(_){} if (!cityListCityId){ plAddCity(); } else { plTogglePanel('cats'); } }
function tkIntroHtml(){ const w = tkWaiting(); const signed = !!currentUser;
  return '<div class="ctx" style="text-align:left; line-height:1.6;">'
    + '<b>1 · At Google:</b> Takeout → <i>Deselect all</i> → tick only <b>Maps (your places)</b> → <i>Create export</i>. Google usually takes 2–10 minutes and emails you a .zip.<br>'
    + '<b>2 · Here:</b> choose that .zip (no need to unzip). Your places are sorted into cities on your device.<br>'
    + '<b>3 · Then:</b> open a city and confirm the suggested pins.</div>'
    + '<div class="chiprow" style="margin:10px 0 6px;"><a class="chip" href="https://takeout.google.com/" target="_blank" rel="noopener" onclick="tkMarkWaiting()">Open Google Takeout ↗</a></div>' + (w ? '<div class="pl-sub" style="margin:0 0 6px;">⏳ Waiting for your Takeout file — when Google\'s email arrives, come back and choose it here.</div>' : '')
    + (signed ? '<label class="cta" style="display:block; text-align:center; cursor:pointer;">📁 Choose the Takeout file<input type="file" id="tkFile" accept=".zip,.csv,.json" multiple style="display:none;" onchange="tkFilesChosen(this.files)"></label>' : '<button type="button" class="cta" onclick="closeModalById(\'dashBackdrop\'); openAuthModal()">Sign in to import</button>')
    + '<div class="dim" style="font-size:11.5px; margin-top:6px; text-align:center;">🔒 Nothing leaves your phone — the file is read here, nothing is uploaded, nothing is read from Google.</div>'
    + (w ? '<button type="button" class="btn btn-ghost" style="margin-top:10px; padding:7px 14px; font-size:12px;" onclick="tkMeanwhile()">Meanwhile, paste one place</button>' : '')
    + (tkState.err ? '<div class="pl-sub" style="color:#ffb4a2; margin-top:8px;">' + escapeHtml(tkState.err) + '</div>' : '');
}
function tkRender(){ const body = document.getElementById('dashBody'); if (!body) return; let h = '';
  if (tkState.phase === 'intro') h = tkIntroHtml(); else if (tkState.phase === 'reading') h = '<div class="ctx">Reading your file… ' + escapeHtml(tkState.progress || '') + '</div>'; else if (tkState.phase === 'plan') h = tkPlanHtml(); else if (tkState.phase === 'commit') h = '<div class="ctx">Importing… ' + escapeHtml(tkState.progress || '') + '</div>'; else if (tkState.phase === 'done') h = tkResultHtml();
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
  for (let i = 0; i < uniq.length; i++){ const r = uniq[i]; const pick = tkPickCity(r.loc, cands); if (!pick){ other.n++; const k = r.cc ? (tkCountryName(r.cc) || r.cc) : '?'; other.byCountry[k === '?' ? 'unknown country' : k] = (other.byCountry[k === '?' ? 'unknown country' : k] || 0) + 1; r.city = null; continue; } r.city = pick.city.id; r.alt = pick.alt ? { id: pick.alt.id, name: pick.alt.name, country: pick.alt.country, row: pick.alt.row || null, mine: !!pick.alt.mine } : null;
    if (!byCity[r.city]) byCity[r.city] = { id: pick.city.id, name: pick.city.name, country: pick.city.country, isNew: !pick.city.mine, row: pick.city.row || null, rows: [], on: true, existing: null }; byCity[r.city].rows.push(r); if (i % 200 === 199){ if (onProgress) onProgress((i + 1) + ' / ' + uniq.length + ' placed…'); await tkTick(); } }
  // IM7 · التكرار بثلاث درجات مع مستندات المدن القائمة (قراءة لكل مدينة عندك — الخطة تحتاجها والحفظ يعيد استعمالها)
  const ids = Object.keys(byCity); for (let i = 0; i < ids.length; i++){ const c = byCity[ids[i]]; if (!c.isNew && currentUser){ try{ if (myCityListLoadedFor === c.id && myCityListData) c.existing = { fromMemory: true, categories: myCityListData.categories || {}, meta: { public: myCityListData.public === true, sharedWith: myCityListData.sharedWith || [], sharedWithNames: myCityListData.sharedWithNames || {}, bookmarkCount: myCityListData.bookmarkCount || 0 } }; else { const d = await mpData.cityLists.get(currentUser.uid, c.id); c.existing = d ? { categories: d.categories || {}, meta: { public: d.public === true, sharedWith: d.sharedWith || [], sharedWithNames: d.sharedWithNames || {}, bookmarkCount: d.bookmarkCount || 0 } } : null; } }catch(e){ mpSwallow(e, 'import-read'); c.readFailed = true; c.on = false; } }
    tkDedupeCity(c); if (onProgress) onProgress('checking ' + c.name + '…'); await tkTick(); }
  const cities = ids.map(function(k){ return byCity[k]; }).sort(function(a, b){ return b.rows.length - a.rows.length; });
  return { importId: 'imp_' + Date.now().toString(36), at: Date.now(), rows: uniq.length, lists: Object.keys(lists).map(function(k){ return lists[k]; }).filter(function(l){ return l.n > 0; }), cities: cities, other: other, x: { noLink: xNoLink, noLoc: xNoLoc, dupFile: xDupFile }, waiting: [] };
}
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

/* ── المعاينة: صفوف مدن · كل شيء مختار افتراضًا · زر واحد · Fine-tune مطوي ── */
function tkPlanHtml(){ const p = tkState.plan; if (!p) return ''; const on = p.cities.filter(function(c){ return c.on; }); const newPlaces = on.reduce(function(a, c){ return a + Math.min(c.newN, TK_CAP_PER_CITY); }, 0); const toCreate = on.filter(function(c){ return c.isNew; }).length;
  let h = '<div class="ctx"><b>' + p.rows + ' places</b> found in your file · ' + p.cities.length + ' cities' + (p.other.n ? ' · ' + p.other.n + ' in cities not covered yet' : '') + '</div>';
  h += p.cities.map(function(c){ const alt = c.rows.filter(function(r){ return r.alt; }).length; return '<label class="row rowblock" style="display:flex; gap:8px; align-items:flex-start;"><input type="checkbox"' + (c.on ? ' checked' : '') + (c.readFailed ? ' disabled' : '') + ' onchange="tkToggleCity(\'' + attrStr(c.id) + '\', this.checked)"><span style="flex:1;"><b>' + escapeHtml(c.name) + '</b> <span class="dim">· ' + escapeHtml(c.country || '') + (c.isNew ? ' · <span class="chip mini" data-label="1">new city</span>' : '') + '</span><br><span class="dim">' + Math.min(c.newN, TK_CAP_PER_CITY) + ' new' + (c.capped ? ' (first ' + TK_CAP_PER_CITY + ' — ' + c.capped + ' more next time)' : '') + (c.dup ? ' · ' + c.dup + ' already here' : '') + (c.similar ? ' · ' + c.similar + ' similar' : '') + (alt ? ' · ' + alt + ' near another city' : '') + (c.readFailed ? ' · <span style="color:#ffb4a2;">could not read this city — try again</span>' : '') + '</span>' + (alt ? '<br><button type="button" class="linklike" style="background:none; border:none; padding:0; margin-top:3px; font:inherit; font-size:11.5px; font-weight:700; color:inherit;" onclick="tkMoveAlt(\'' + attrStr(c.id) + '\')">' + alt + ' nearer to ' + escapeHtml(tkAltName(c)) + ' → move them there</button>' : '') + '</span></label>'; }).join('');
  if (p.other.n){ const ks = Object.keys(p.other.byCountry); h += '<div class="row rowblock"><span class="dim">Other · ' + p.other.n + ' — not covered yet' + (ks.length ? ' (' + ks.map(function(k){ return escapeHtml(k) + ' ' + p.other.byCountry[k]; }).join(' · ') + ')' : '') + ' · kept out for now</span></div>'; }
  const xs = []; if (p.x.noLink) xs.push(p.x.noLink + ' without a Maps link'); if (p.x.noLoc) xs.push(p.x.noLoc + ' without a location'); if (p.x.dupFile) xs.push(p.x.dupFile + ' repeated in the file'); if (xs.length) h += '<div class="dim" style="font-size:11.5px; margin:4px 0;">Skipped: ' + xs.join(' · ') + '</div>';
  h += '<details style="margin:8px 0;"><summary class="dim" style="cursor:pointer;">Fine-tune (optional) — what each list is mostly about</summary>' + p.lists.map(function(l, i){ return '<div class="row" style="display:flex; gap:8px; align-items:center;"><span style="flex:1;" dir="auto">' + escapeHtml(l.name) + ' <span class="dim">· ' + l.n + '</span></span><select class="modal-input" style="max-width:52%; margin:0;" onchange="tkSetListSection(' + i + ', this.value)">' + tkSectionOptions(l.section) + '</select></div>'; }).join('') + '<div class="dim" style="font-size:11px; margin-top:4px;">Saved · Want to go · Favorites mean something different to everyone — tell us once, or set it later from the imported box.</div></details>';
  h += '<button type="button" class="cta" style="display:block; width:100%;"' + (newPlaces ? '' : ' disabled') + ' onclick="tkCommit()">Import ' + newPlaces + ' place' + (newPlaces === 1 ? '' : 's') + (toCreate ? ' · create ' + toCreate + ' cit' + (toCreate === 1 ? 'y' : 'ies') : '') + '</button>';
  h += '<div class="dim" style="font-size:11.5px; margin-top:6px; text-align:center;">🔒 Nothing leaves your phone · locations in the file are used once to sort into cities and are not kept.</div>';
  h += '<button type="button" class="btn btn-ghost" style="margin-top:8px; padding:7px 14px; font-size:12px;" onclick="tkState.phase = \'intro\'; tkState.plan = null; tkRender()">← Choose another file</button>';
  return h;
}
function tkAltName(c){ const n = {}; c.rows.forEach(function(r){ if (r.alt) n[r.alt.name] = (n[r.alt.name] || 0) + 1; }); const ks = Object.keys(n).sort(function(a, b){ return n[b] - n[a]; }); return ks.length > 1 ? ks[0] + ' +' + (ks.length - 1) : (ks[0] || ''); }
function tkToggleCity(id, on){ const c = (tkState.plan.cities || []).find(function(x){ return x.id === id; }); if (c) c.on = !!on; tkRender(); }
function tkSetListSection(i, v){ const l = tkState.plan.lists[i]; if (l) l.section = v || ''; }
function tkMoveAlt(cityId){ // IM5 «or Antibes?»: الأماكن الأقرب إلى مدينة مجاورة تُنقل إليها في الخطة (ضغطة واحدة · تُعاد بضغطة) — قبل الحفظ، فلا شيء يُكتب هنا
  const p = tkState.plan; if (!p) return; const c = p.cities.find(function(x){ return x.id === cityId; }); if (!c) return;
  const moving = c.rows.filter(function(r){ return r.alt; }); if (!moving.length) return; c.rows = c.rows.filter(function(r){ return !r.alt; });
  moving.forEach(function(r){ const a = r.alt; let t = p.cities.find(function(x){ return x.id === a.id; }); if (!t){ t = { id: a.id, name: a.name, country: a.country || '', isNew: !a.mine, row: a.row || null, rows: [], on: true, existing: null, movedFrom: c.id }; p.cities.push(t); } r.alt = { id: c.id, name: c.name, country: c.country, row: c.row || null, mine: !c.isNew }; r.city = t.id; t.rows.push(r); });
  p.cities.forEach(function(x){ tkDedupeCity(x); }); p.cities = p.cities.filter(function(x){ return x.rows.length; }).sort(function(a, b){ return b.rows.length - a.rows.length; }); tkRender();
}

/* ── IM8 · الحفظ: مجموعة tk:<القائمة> في مستند كل مدينة — حفظة لكل مدينة بحارس العدّ · gid على القديم فقط · لا loc في أي مكتوب ── */
function tkPlaceOf(r, section, plan){ const p = { id: 'place_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), name: String(r.name || '').slice(0, 120), url: r.url, from: r.from, importedAt: plan.at, importId: plan.importId, updatedAt: plan.at }; if (r.note) p.note = r.note.slice(0, 1000); if (r.gid) p.gid = r.gid; if (section) p.section = section; if (r.similar) p.similar = true; if (r.altChoice) p.altCity = r.altChoice; return p; }
function tkLiveCount(cats){ return Object.keys(cats || {}).reduce(function(a, k){ return a + (((cats[k] || {}).places) || []).filter(function(q){ return q && (q.name || q.url); }).length; }, 0); }
async function tkCommit(){ const plan = tkState.plan; if (!plan || tkState.busy || !currentUser) return; if (currentUserSuspended){ showToast("Your account is suspended — you can't save changes"); return; } tkState.busy = true; tkState.phase = 'commit'; tkState.progress = ''; tkRender();
  const res = { cities: 0, created: 0, added: 0, dup: 0, similar: 0, gid: 0, failed: [], perCity: [] }; const sectionOf = {}; plan.lists.forEach(function(l){ sectionOf[l.from] = l.section || ''; });
  try{
    const on = plan.cities.filter(function(c){ return c.on && !c.readFailed; });
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
  let h = '<div class="pl-guide-h" style="text-align:center;">Your Google Maps, now in MyPickz</div><div class="ctx" style="text-align:center;"><b>' + r.cities + ' cit' + (r.cities === 1 ? 'y' : 'ies') + ' · ' + r.added + ' places</b>' + (r.created ? ' · ' + r.created + ' cities created' : '') + (r.dup ? ' · ' + r.dup + ' already here' : '') + (r.similar ? ' · ' + r.similar + ' similar (marked)' : '') + '</div>';
  if (r.failed.length) h += '<div class="pl-sub" style="color:#ffb4a2;">Not saved: ' + escapeHtml(r.failed.join(' · ')) + ' — choose the file again to retry those.</div>';
  h += '<div class="dim" style="font-size:11.5px; text-align:center;">Each city shows them under “Imported from Google Maps” until you sort them. Nothing was read from Google; locations in the file were used once and not kept.</div>';
  if (first) h += '<button type="button" class="cta" style="display:block; width:100%; margin-top:10px;" onclick="tkStartWith(\'' + attrStr(first.id) + '\')">Start with ' + escapeHtml(first.name) + ' · ' + first.added + ' to sort</button>';
  h += '<button type="button" class="btn btn-ghost" style="margin-top:8px; padding:7px 14px; font-size:12px;" onclick="mpCloseAll(\'dashBackdrop\')">Done</button>'; return h;
}
async function tkStartWith(cityId){ closeModalById('dashBackdrop'); try{ switchTab('Places'); }catch(_){} const c = cityListAllCities().find(function(x){ return String(x.id) === String(cityId); }); if (!c) return; cityListCountry = c.country; cityListCityId = c.id; if (userListData){ userListData.listCountry = c.country; userListData.listCity = c.id; } if (myCityListLoadedFor !== c.id){ myCityListLoadedFor = null; await loadMyCityList(c.id); } if (typeof renderPlacesMine === 'function') renderPlacesMine(); }
function tkSetSection(groupId, v){ // الصندوق: «mostly» يُضبط لاحقًا — لكل أماكن المجموعة في المدينة الحالية
  const e = myCityListData && myCityListData.categories && myCityListData.categories[groupId]; if (!e) return; (e.places || []).forEach(function(p){ if (!p) return; if (v) p.section = v; else delete p.section; }); saveMyCityList().then(function(){ showToast(v ? 'Set: mostly ' + tkSectionName(v) + ' ✓' : 'Cleared'); }).catch(function(e){ mpSwallow(e, 'import-section'); });
}
