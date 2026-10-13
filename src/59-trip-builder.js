/* ═══ r77 (حزمة الرحلات · الدفعة أ — البيان v1.2 · ٦-١): المنشئ التفاعلي بمرحلتيه على القشرة الليلية
   المرحلة الأولى: المطلوب (المدينة · الأيام · الأماكن) والاختياري (الوصول · المغادرة · الإقامة · بديل المشي) ·
   اختيار الأماكن بالصناديق وسطر الجدوى · المرحلة الثانية: المسودة بفتراتها وبدائلها وصينيتها ونسخها وتراجعها · ورقة النقل · الاعتماد.
   المسودة تُحفظ بعد كل تغيير بتأخير ثانية (التثبيت ٤) · التراجع عشرون خطوة في الذاكرة (الاختيار ٦) · رقاقات النسخ تختفي بعد أول نقل يدوي (القرار ١١) ═══ */
let TB = null; // حالة المنشئ المفتوح
const TB_PLACES = {}; // cityId → [{ key, ref, name, geo, sec, catId, path }] (ذاكرة الجلسة)
function tbTrip(){ return TB && TB.tripId ? (userTrips || []).find(function(t){ return t.id === TB.tripId; }) || null : null; }
function tbCity(){ return TB.cities[TB.ci] || null; }
function tbNewCity(c){ return { cityId: c.id, cityName: c.name, days: 2, stay: null, arrival: null, departure: null, fallback: 'transit' }; }
async function openTripBuilder(o){ // o = { tripId?, stage?, cityId?, preselect?, dayPlan?, addCity? }
  o = o || {};
  if (!currentUser){ openAuthModal(); return; }
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  const t = o.tripId ? (userTrips || []).find(function(x){ return x.id === o.tripId; }) : null;
  TB = { tripId: t ? t.id : null, stage: 1, ci: 0, cities: t ? JSON.parse(JSON.stringify(t.cities || [])) : [], picked: {}, version: t ? (t.version || 'balanced') : 'balanced', plan: t && tripHasPlan(t) ? JSON.parse(JSON.stringify(t.plan)) : null, undo: [], moved: false, dayPlan: !!o.dayPlan, daySel: 0, pick: null, saveTimer: null, preselect: o.preselect || null };
  if (t && tripHasPlan(t)){ tripPlanEntries(t.plan).concat(t.plan.tray).forEach(function(e){ [e].concat(e.alts || []).forEach(function(x){ const cid = (x.ref && x.ref.cityId) || t.cityId; TB.picked[cid] = TB.picked[cid] || {}; TB.picked[cid][tbKey(x.ref)] = x; }); }); }
  if (!t && o.cityId){ const c = cityListAllCities().find(function(x){ return x.id === o.cityId; }); if (c){ const nc = tbNewCity(c); if (o.dayPlan){ nc.days = 1; nc.single = true; } TB.cities.push(nc); } }
  if (o.addCity) TB.addCityOpen = true;
  if (TB.preselect){ const cid = TB.preselect.cityId; await tbLoadPlaces(cid); const hit = (TB_PLACES[cid] || []).find(function(p){ return p.ref.subcatId === TB.preselect.subcatId && p.ref.placeId === TB.preselect.placeId; }); if (hit){ TB.picked[cid] = TB.picked[cid] || {}; TB.picked[cid][hit.key] = tbEntryOf(hit); } TB.preselect = null; }
  TB.stage = (o.stage === 2 && TB.plan) ? 2 : 1; if (TB.plan) TB.daySel = Math.max(0, TB.plan.days.findIndex(function(d){ return tripDayEntries(d).length; }));
  document.getElementById('tripBuildBackdrop').classList.add('show');
  tbRender();
}
function tbClose(){ if (TB && TB.saveTimer){ clearTimeout(TB.saveTimer); tbSaveNow(); } document.getElementById('tripBuildBackdrop').classList.remove('show'); TB = null; if (currentTab === 'Trips') renderTripsBody(); }
function tbBack(){ if (!TB) return; if (TB.stage === 2){ TB.stage = 1; tbRender(); return; } if (TB.pick){ TB.pick = null; tbRender(); return; } tbClose(); }
function tbKey(ref){ return String(ref.subcatId || '') + '|' + String(ref.placeId || ''); }
function tbEntryOf(p){ return tripNewEntry({ ref: p.ref, name: p.name, geo: p.geo, sec: p.sec }); }
async function tbLoadPlaces(cityId){ // أماكن قائمتي بالمدينة (مع الخاصة) بترتيب الشجرة — الدبوس من geo المؤكَّد فقط
  if (TB_PLACES[cityId]) return TB_PLACES[cityId];
  let links = {}; try{ const d = await mpData.cityLists.get(currentUser.uid, cityId); links = Object.assign({}, (d && d.categories) || {}); }catch(e){} try{ Object.assign(links, await mpData.privatePlaces.get(currentUser.uid, cityId)); }catch(e){}
  const out = []; const cats = plCatsAll().concat(privateCategoryList().map(function(c){ return { id: c.id, name: c.name, section: 'Private', sectionId: 'private' }; }));
  cats.forEach(function(c){ const arr = ((links[c.id] || {}).places || []).filter(function(p){ return p && (p.name || p.url); }); arr.forEach(function(p){ const ref = { sourceType: 'mylist', cityId: cityId, subcatId: c.id, placeId: p.id || hashUrl(p.url || ''), sourceUid: null }; out.push({ key: tbKey(ref), ref: ref, name: p.name || 'Place', area: p.area || '', geo: (p.geo && typeof p.geo.lat === 'number') ? { lat: p.geo.lat, lng: p.geo.lng } : null, sec: c.sectionId || '', catId: c.id, path: (c.section ? c.section + ' › ' : '') + c.name }); }); });
  TB_PLACES[cityId] = out; return out;
}
function tbPickedList(cityId){ const m = TB.picked[cityId] || {}; return Object.keys(m).sort().map(function(k){ return m[k]; }); }
function tbFeas(n, days){ const per = days ? n / days : n; const w = per <= 0 ? '' : per <= 4 ? 'calm' : per <= 6 ? 'balanced' : per <= 9 ? 'dense' : 'too many'; return { per: Math.round(per * 10) / 10, word: w }; }
function tbFeasLine(cityId){ const c = TB.cities.find(function(x){ return x.cityId === cityId; }); const n = tbPickedList(cityId).length; if (!n) return '<span class="dim">Pick at least one place</span>'; const f = tbFeas(n, c ? c.days : 1); return n + (n === 1 ? ' place' : ' places') + ' for ' + (c ? c.days : 1) + (c && c.days === 1 ? ' day' : ' days') + ' ≈ ' + f.per + ' a day — <b class="' + (f.word === 'too many' ? 'warn' : 'ok') + '">' + f.word + '</b>'; }
function tbSetTitle(t, step){ const el = document.getElementById('tbTitle'); if (el) el.textContent = t; const st = document.getElementById('tbSteps'); if (st) st.innerHTML = '<span' + (step >= 1 ? ' class="on"' : '') + '></span><span' + (step >= 2 ? ' class="on"' : '') + '></span>'; const bk = document.getElementById('tbBack'); if (bk) bk.classList.toggle('hidden', step === 1 && !TB.pick); }
function tbRender(){ if (!TB) return; const body = document.getElementById('tbBody'); if (!body) return; if (TB.pick){ body.innerHTML = tbPickHtml(); tbSetTitle('Places for ' + (TB.cities.find(function(c){ return c.cityId === TB.pick; }) || {}).cityName, 1); return; } if (TB.stage === 2){ body.innerHTML = tbDraftHtml(); tbSetTitle('Draft · 2 of 2', 2); return; } body.innerHTML = tbStage1Html(); tbSetTitle((TB.dayPlan ? 'Plan a day' : 'Build a trip') + ' · 1 of 2', 1); }
/* ── المرحلة الأولى ── */
function tbStage1Html(){
  const c = tbCity(); const cities = TB.cities; const chip = function(on, label, on_){ return '<button type="button" class="chip' + (on ? ' on' : '') + '" onclick="' + on_ + '">' + label + '</button>'; };
  let h = '';
  if (TB.dayPlan) h += '<div class="tb-note">Same builder as a trip — the city and one day are already filled from the Places tab. It lands in My trips under Day plans.</div>';
  h += '<div class="gsec">Required</div><label class="flabel">City' + (cities.length > 1 ? ' <span class="dim">· ' + cities.length + ' cities — one section each</span>' : '') + '</label>';
  h += '<div class="chiprow tb-cities">' + cities.map(function(x, i){ return chip(i === TB.ci, escapeHtml(x.cityName) + (cities.length > 1 ? ' · ' + x.days + (x.days === 1 ? ' day' : ' days') : ''), 'tbSelCity(' + i + ')'); }).join('') + (TB.dayPlan ? '' : chip(false, '＋ City', 'tbAddCityToggle()')) + '</div>';
  if (TB.addCityOpen || !cities.length){ const mine = cityListAllCities().filter(function(x){ return !cities.some(function(y){ return y.cityId === x.id; }); }); h += '<div id="tbCityHost">' + pickerRow({ id: 'tbCity', label: 'Choose a city', placeholder: 'Type a city…', onPick: 'tbPickCity', canAdd: true, onAdd: 'tbAddCity()', emptyText: 'No city matches — add it below', items: mine.map(function(x){ return { id: x.id, name: x.name, icon: countryFlag(x.country) || '' }; }) }) + '</div>'; }
  if (c){
    if (!TB.dayPlan) h += '<label class="flabel">Days' + (cities.length > 1 ? ' in ' + escapeHtml(c.cityName) : '') + '</label><div class="chiprow tb-days">' + [1, 2, 3, 4, 5].map(function(n){ return chip(c.days === n, String(n), 'tbSetDays(' + n + ')'); }).join('') + chip(c.days > 5, c.days > 5 ? c.days + ' ⌄' : 'More', 'tbMoreDays()') + (cities.length > 1 ? chip(false, '✕ Remove city', 'tbRemoveCity()') : '') + '</div>';
    const n = tbPickedList(c.cityId).length;
    h += '<label class="flabel">Places for this ' + (TB.dayPlan ? 'day' : 'trip') + '</label><button type="button" class="tb-door" onclick="tbOpenPick(\'' + attrStr(c.cityId) + '\')"><span>Pick from my ' + escapeHtml(c.cityName) + ' list</span><span class="tb-door-n">' + n + ' picked ›</span></button><div class="tb-feas">' + tbFeasLine(c.cityId) + '</div>';
    h += '<div class="gsec">Optional</div>';
    const a = c.arrival || {}, d = c.departure || {};
    h += '<div class="tb-grid2"><label class="flabel">' + (TB.dayPlan ? 'Start' : 'Arrival') + '<span class="tb-dt">' + (TB.dayPlan ? '' : '<input type="date" class="modal-input" value="' + attrStr(a.date || '') + '" onchange="tbSetDT(\'arrival\', \'date\', this.value)">') + '<input type="time" class="modal-input" value="' + attrStr(a.time || '') + '" onchange="tbSetDT(\'arrival\', \'time\', this.value)"></span></label>'
      + '<label class="flabel">' + (TB.dayPlan ? 'Back by' : 'Departure') + '<span class="tb-dt">' + (TB.dayPlan ? '' : '<input type="date" class="modal-input" value="' + attrStr(d.date || '') + '" onchange="tbSetDT(\'departure\', \'date\', this.value)">') + '<input type="time" class="modal-input" value="' + attrStr(d.time || '') + '" onchange="tbSetDT(\'departure\', \'time\', this.value)"></span></label></div>';
    h += '<label class="flabel">' + (TB.dayPlan ? 'Start from' : 'Where you stay') + '</label><div class="tb-stay"><input type="text" class="modal-input" id="tbStayName" placeholder="Hotel, apartment or a friend\'s place" value="' + attrStr(c.stay && c.stay.name || '') + '" onchange="tbSetStayName(this.value)"><button type="button" class="actn" onclick="tbStayFromList()">From list</button>' + (c.stay && c.stay.geo ? '<span class="tb-pin-ok" title="Pinned — rest and day order use it">📍</span>' : '') + '</div>';
    h += '<label class="flabel">When it is too far to walk</label><div class="chiprow">' + chip(c.fallback !== 'car', 'Metro &amp; transit', "tbSetFallback('transit')") + chip(c.fallback === 'car', 'Car', "tbSetFallback('car')") + '</div>';
    h += '<div class="tb-hint">Short legs are walked; this is the fallback for longer ones, and you can change any leg later in the day route. Arrival and departure make the first and last day partial; where you stay adds a mid-day rest.</div>';
  }
  const can = cities.length && cities.every(function(x){ return tbPickedList(x.cityId).length > 0; });
  h += '<button type="button" class="cta wide tb-cta" ' + (can ? '' : 'disabled') + ' onclick="tbBuild()">' + (TB.plan ? 'Rebuild the draft →' : 'Build the draft →') + '</button>';
  return h;
}
function tbSelCity(i){ TB.ci = i; TB.addCityOpen = false; tbRender(); }
function tbAddCityToggle(){ TB.addCityOpen = !TB.addCityOpen; tbRender(); }
function tbPickCity(id){ const c = cityListAllCities().find(function(x){ return x.id === id; }); if (!c) return; if (!TB.cities.some(function(y){ return y.cityId === id; })) TB.cities.push(tbNewCity(c)); TB.ci = TB.cities.length - 1; TB.addCityOpen = false; try{ pickerRowClose('tbCity'); }catch(_){} tbRender(); }
async function tbAddCity(){ await addCityListCity(); if (cityListCityId && cityListAllCities().some(function(c){ return c.id === cityListCityId; })) tbPickCity(cityListCityId); }
function tbRemoveCity(){ if (TB.cities.length <= 1) return; TB.cities.splice(TB.ci, 1); TB.ci = Math.max(0, TB.ci - 1); tbRender(); }
function tbSetDays(n){ const c = tbCity(); if (!c) return; c.days = Math.max(1, Math.min(30, n)); tbRender(); }
async function tbMoreDays(){ const c = tbCity(); if (!c) return; const v = await mpSheet({ title: 'How many days?', text: 'Up to 30.', ok: 'Set', input: { value: String(c.days), placeholder: '6' } }); const n = parseInt(v, 10); if (n) tbSetDays(n); }
function tbSetDT(which, field, v){ const c = tbCity(); if (!c) return; c[which] = c[which] || {}; c[which][field] = String(v || ''); if (!c[which].date && !c[which].time) c[which] = null; if (TB.dayPlan && c[which] && c[which].time && !c[which].date) c[which].date = c[which].date || tripTodayYmd(); }
function tbSetStayName(v){ const c = tbCity(); if (!c) return; v = String(v || '').trim(); c.stay = v ? Object.assign({}, c.stay || {}, { name: v, geo: (c.stay && c.stay.name === v) ? c.stay.geo : null }) : null; }
async function tbStayFromList(){ const c = tbCity(); if (!c) return; const list = (await tbLoadPlaces(c.cityId)).filter(function(p){ return p.geo; }); if (!list.length){ showToast('No pinned place in this city yet'); return; } TB.stayPick = true; const body = document.getElementById('tbBody'); body.innerHTML = '<p class="mp-empty mini" style="margin-bottom:10px;">Where you stay — from your pinned places</p>' + pickerPanel({ id: 'tbStay', bare: true, onPick: 'tbStayPicked', items: list.map(function(p){ return { id: p.key, name: p.name, sub: p.path }; }) }) + '<button type="button" class="btn btn-ghost wide" onclick="TB.stayPick = false; tbRender()">Cancel</button>'; }
function tbStayPicked(key){ const c = tbCity(); const p = (TB_PLACES[c.cityId] || []).find(function(x){ return x.key === key; }); if (p) c.stay = { name: p.name, geo: p.geo }; TB.stayPick = false; tbRender(); }
function tbSetFallback(v){ const c = tbCity(); if (c) c.fallback = v; tbRender(); }
/* ── اختيار الأماكن ── */
async function tbOpenPick(cityId){ TB.pick = cityId; await tbLoadPlaces(cityId); tbRender(); }
function tbPickHtml(){
  const cityId = TB.pick; const all = TB_PLACES[cityId] || []; const picked = TB.picked[cityId] || {}; const c = TB.cities.find(function(x){ return x.cityId === cityId; }); const n = Object.keys(picked).length;
  let h = '<div class="chiprow"><button type="button" class="chip" onclick="tbPickAll(true)">Select all · ' + all.filter(function(p){ return p.geo; }).length + '</button><button type="button" class="chip" onclick="tbPickAll(false)">Clear</button></div>';
  h += '<div class="tb-feasbar"><b>' + n + ' picked · ' + (c ? c.days : 1) + (c && c.days === 1 ? ' day' : ' days') + '</b><span>' + (n ? '≈ ' + tbFeas(n, c ? c.days : 1).per + ' a day — ' + tbFeas(n, c ? c.days : 1).word : 'nothing yet') + '</span></div>';
  if (!all.length) h += '<div class="mp-empty mini">No places in this city yet — add some in Places first.</div>';
  const groups = {}; const order = []; all.forEach(function(p){ if (!groups[p.path]){ groups[p.path] = []; order.push(p.path); } groups[p.path].push(p); });
  order.forEach(function(k){ const items = groups[k].map(function(p){ const on = !!picked[p.key]; return '<label class="tb-pick' + (p.geo ? '' : ' nopin') + '"><input type="checkbox" ' + (on ? 'checked ' : '') + (p.geo ? '' : 'disabled ') + 'onchange="tbTogglePick(\'' + attrStr(p.key) + '\', this.checked)"><span class="tb-pick-t"><b dir="auto">' + escapeHtml(p.name) + '</b><span dir="auto">' + (p.geo ? escapeHtml(p.area || '') + (p.area ? ' · ' : '') + 'pinned' : '<i class="warn">no pin yet — place it on the map to include it</i>') + '</span></span></label>'; }).join(''); h += placeGroupHtml(k, groups[k].length, '', items); });
  h += '<div class="sheet-row tb-row"><button type="button" class="btn btn-ghost" onclick="TB.pick = null; tbRender()">Back</button><button type="button" class="btn btn-brass" onclick="TB.pick = null; tbRender()">Use these ' + n + ' →</button></div>';
  return h;
}
function tbTogglePick(key, on){ const cityId = TB.pick; TB.picked[cityId] = TB.picked[cityId] || {}; const p = (TB_PLACES[cityId] || []).find(function(x){ return x.key === key; }); if (!p) return; if (on) TB.picked[cityId][key] = TB.picked[cityId][key] || tbEntryOf(p); else delete TB.picked[cityId][key]; const bar = document.querySelector('#tbBody .tb-feasbar'); if (bar){ const c = TB.cities.find(function(x){ return x.cityId === cityId; }); const n = Object.keys(TB.picked[cityId]).length; bar.innerHTML = '<b>' + n + ' picked · ' + (c ? c.days : 1) + (c && c.days === 1 ? ' day' : ' days') + '</b><span>' + (n ? '≈ ' + tbFeas(n, c ? c.days : 1).per + ' a day — ' + tbFeas(n, c ? c.days : 1).word : 'nothing yet') + '</span>'; } const cta = document.querySelector('#tbBody .btn-brass'); if (cta) cta.textContent = 'Use these ' + Object.keys(TB.picked[cityId]).length + ' →'; }
function tbPickAll(on){ const cityId = TB.pick; TB.picked[cityId] = {}; if (on) (TB_PLACES[cityId] || []).forEach(function(p){ if (p.geo) TB.picked[cityId][p.key] = tbEntryOf(p); }); tbRender(); }
/* ── البناء والمسودة ── */
function tbSpec(){ return { cities: TB.cities, version: TB.version, entries: [] }; }
async function tbBuild(){
  if (TB.plan && tripPlanEntries(TB.plan).length && (TB.moved || TB.tripId)){ const ok = await mpConfirm('Rebuilding makes a fresh draft and drops what you moved by hand.', { title: 'Rebuild the draft?', ok: 'Rebuild' }); if (!ok) return; }
  tbRebuild(); TB.stage = 2; TB.moved = false; TB.undo = []; TB.daySel = Math.max(0, TB.plan.days.findIndex(function(d){ return tripDayEntries(d).length; })); tbEnsureTrip(); tbSave(); tbRender();
}
function tbRebuild(){ const entries = []; TB.cities.forEach(function(c){ tbPickedList(c.cityId).forEach(function(e){ entries.push(tripNewEntry({ id: e.id, ref: e.ref, name: e.name, geo: e.geo, sec: e.sec })); }); }); TB.plan = tripBuildPlan({ cities: TB.cities, entries: entries, version: TB.version }); }
function tbEnsureTrip(){ let t = tbTrip(); const first = TB.cities[0] || {}; if (!t){ t = { id: generateTripId(), title: '', cityId: first.cityId || null, cityName: first.cityName || '', cities: [], plan: null, version: TB.version, status: 'draft', public: false, sharedWith: [], sharedWithNames: {} }; userTrips.push(t); TB.tripId = t.id; } t.cities = JSON.parse(JSON.stringify(TB.cities)); t.cityId = first.cityId || null; t.cityName = first.cityName || ''; t.plan = JSON.parse(JSON.stringify(TB.plan)); t.version = TB.version; if (!t.status) t.status = 'draft'; delete resolvedTripCache[t.id]; return t; }
function tbSave(){ if (!TB) return; clearTimeout(TB.saveTimer); TB.saveTimer = setTimeout(tbSaveNow, 1000); }
async function tbSaveNow(){ const t = tbEnsureTrip(); if (TB) TB.saveTimer = null; await saveTrip(t); }
function tbSnapshot(){ TB.undo.push(JSON.stringify(TB.plan)); if (TB.undo.length > 20) TB.undo.shift(); TB.moved = true; }
function tbUndo(){ if (!TB.undo.length) return; TB.plan = tripPlanNormalize(JSON.parse(TB.undo.pop())); tbSave(); tbRender(); }
async function tbVersion(v){ if (v === TB.version && !TB.moved) return; if (TB.moved){ const ok = await mpConfirm('A new version rebuilds the draft and drops what you moved by hand.', { title: 'Switch to ' + v + '?', ok: 'Rebuild as ' + v }); if (!ok) return; } TB.version = v; tbRebuild(); TB.moved = false; TB.undo = []; tbSave(); tbRender(); }
async function tbVersionSheet(){ const v = await mpSheet({ title: 'Version', text: 'Rebuilds the draft and drops what you moved by hand.', ok: 'Calm', alt: 'Balanced', alt2: 'Dense' }); if (v === 'ok') tbVersion('calm'); else if (v === 'alt') tbVersion('balanced'); else if (v === 'alt2') tbVersion('dense'); }
function tbPickDay(i){ TB.daySel = i; tbRender(); }
function tbCardHtml(e, opts){ // بطاقة عاجية مضغوطة للمسودة: الاسم · الحي/التصنيف · Move › · البدائل مطوية بعد الأول
  const cityId = (e.ref && e.ref.cityId) || (TB.cities[0] || {}).cityId; const meta = (TB_PLACES[cityId] || []).find(function(p){ return p.key === tbKey(e.ref); }); const sub = meta ? (meta.area ? meta.area + ' · ' : '') + meta.path.split(' › ').pop() : '';
  let h = '<div class="tb-card' + (opts && opts.alt ? ' alt' : '') + '"><span class="tb-card-t"><b dir="auto">' + (opts && opts.n ? '<span class="trip-num">' + opts.n + '</span>' : '') + escapeHtml(e.name) + '</b>' + (sub ? '<span dir="auto">' + escapeHtml(sub) + '</span>' : '') + (e.alert ? '<span class="warn">⚠ ' + escapeHtml(e.alert) + '</span>' : '') + '</span>'
    + (opts && opts.alt ? '<button type="button" class="actn" onclick="tbPromote(\'' + attrStr(opts.host) + '\', \'' + attrStr(e.id) + '\')" title="Make it option 1">⇄</button><button type="button" class="actn" onclick="tbMove(\'' + attrStr(e.id) + '\')">Move ›</button>' : '<button type="button" class="actn" onclick="tbMove(\'' + attrStr(e.id) + '\')">Move ›</button>') + '</div>';
  const alts = e.alts || []; if (alts.length && !(opts && opts.alt)){ const open = !!tripAltsOpen[e.id]; h += '<div class="trip-alts' + (open ? ' open' : '') + '"><button type="button" class="trip-alts-h" onclick="tripAltsOpen[\'' + attrStr(e.id) + '\'] = !tripAltsOpen[\'' + attrStr(e.id) + '\']; tbRender()"><span>or · ' + escapeHtml(alts[0].name) + (alts.length > 1 ? ' · +' + (alts.length - 1) : '') + '</span><span class="arr">' + (open ? '⌃' : '⌄') + '</span></button>' + (open ? alts.map(function(a){ return tbCardHtml(a, { alt: true, host: e.id }); }).join('') : '') + '</div>'; }
  return h;
}
function tbDraftHtml(){
  const plan = TB.plan; const days = plan.days; if (TB.daySel >= days.length) TB.daySel = 0; const day = days[TB.daySel]; const spec = tbSpec(); const warns = tripWarnings(plan, spec);
  let h = '<div class="chiprow tb-top">' + (TB.moved ? '<button type="button" class="chip" onclick="tbVersionSheet()">Version · ' + TB.version + ' ⌄</button>' : TRIP_VERSIONS.map(function(v){ return '<button type="button" class="chip' + (TB.version === v[0] ? ' on' : '') + '" onclick="tbVersion(\'' + v[0] + '\')">' + v[1] + '</button>'; }).join('')) + '<button type="button" class="chip" ' + (TB.undo.length ? '' : 'disabled') + ' onclick="tbUndo()" title="Undo last move">↶ Undo</button></div>';
  h += '<div class="chipgrid ' + (days.length >= 3 ? 'c3' : 'c2') + '">' + days.map(function(d, i){ return '<button type="button" class="pl-src' + (i === TB.daySel ? ' on' : '') + '" onclick="tbPickDay(' + i + ')">' + escapeHtml(tripDayLabel(d)) + '<span class="s">' + tripDayEntries(d).length + (tripDayEntries(d).length === 1 ? ' stop' : ' stops') + '</span></button>'; }).join('') + '</div>';
  if (day){
    const city = TB.cities.find(function(c){ return c.cityId === day.cityId; }) || {}; const es = tripDayEntries(day);
    h += '<div class="ctx trip-ctx"><span>' + escapeHtml(tripDayLabel(day)) + (day.date ? ' · ' + escapeHtml(tripDateLabel(day.date)) : '') + (TB.cities.length > 1 ? ' · ' + escapeHtml(city.cityName || '') : '') + ' — ' + es.length + (es.length === 1 ? ' stop' : ' stops') + (day.rest ? ' · 1 rest' : '') + '</span></div>';
    warns.filter(function(w){ return w.dayIdx === TB.daySel; }).forEach(function(w){ h += '<div class="trip-warn">⚠ ' + escapeHtml(w.text) + '</div>'; });
    let n = 0; tripDayAvailable(day).forEach(function(p){ const arr = day.periods[p] || []; let inner = '';
      if (p === 'afternoon' && day.rest) inner += '<div class="trip-rest"><span><b>Rest at ' + escapeHtml((city.stay && city.stay.name) || 'your stay') + '</b> <span class="dim">· about ' + Math.round(day.rest.minutes / 60) + ' h</span></span><button type="button" class="actn" onclick="tbRestRemove()">Remove</button></div>';
      arr.forEach(function(e){ n++; inner += tbCardHtml(e, { n: n }); });
      if (!arr.length) inner += '<div class="trip-empty-p">— nothing here · move a place in</div>';
      h += placeGroupHtml(TRIP_PERIOD_LABEL[p], arr.length, '', inner, 'stop'); });
  }
  h += '<div class="trip-tray' + (plan.tray.length ? '' : ' empty') + '"><div class="trip-tray-h"><b>No day yet · ' + plan.tray.length + '</b><span class="dim">tap a place to give it a day</span></div>' + plan.tray.map(function(e){ return '<button type="button" class="trip-tray-i" onclick="tbMove(\'' + attrStr(e.id) + '\')"><span dir="auto">' + escapeHtml(e.name) + '</span>' + (!e.geo ? '<span class="dim">no pin</span>' : '<span class="arr">›</span>') + '</button>'; }).join('') + '</div>';
  h += '<button type="button" class="cta wide tb-cta" onclick="tbApprove()">Approve this trip ✓</button>';
  return h;
}
function tbMove(entryId){ tripMoveSheet(TB.plan, tbSpec(), entryId, function(changed){ if (changed){ tbSave(); } tbRender(); }, function(){ tbSnapshot(); }); }
function tbPromote(hostId, altId){ const f = tripFindEntry(TB.plan, hostId); if (!f || f.where !== 'day') return; tbSnapshot(); const host = f.entry; const k = host.alts.findIndex(function(a){ return a.id === altId; }); if (k < 0) return; const alt = host.alts[k]; host.alts.splice(k, 1); const rest = host.alts; host.alts = []; alt.alts = [host].concat(rest); TB.plan.days[f.dayIdx].periods[f.period][f.index] = alt; if (TB.plan.days[f.dayIdx].excursion === host.id) TB.plan.days[f.dayIdx].excursion = alt.id; tbSave(); tbRender(); }
function tbRestRemove(){ tbSnapshot(); TB.plan.days[TB.daySel].rest = null; tbSave(); tbRender(); }
async function tbApprove(){ const t = tbEnsureTrip(); t.status = 'approved'; clearTimeout(TB.saveTimer); TB.saveTimer = null; await saveTrip(t); const id = t.id; document.getElementById('tripBuildBackdrop').classList.remove('show'); TB = null; showToast('Trip approved ✓'); switchTab('Trips'); await openMyTripsModal(); await openTripDetail(id); }
/* ── ورقة النقل (اللوحة ٤) — مشتركة بين المسودة وعرض الرحلة والإضافة التلقائية ── */
let __tm = null; // { plan, spec, entryId, onDone, before }
function tripMoveSheet(plan, spec, entryId, onDone, before){
  const f = tripFindEntry(plan, entryId); if (!f) return;
  __tm = { plan: plan, spec: spec, entryId: entryId, onDone: onDone, before: before, step: 'grid' };
  tripMoveRender();
  document.getElementById('tripMoveBackdrop').classList.add('show'); sheetBarsHide(true);
}
function tripMoveRender(){
  const m = __tm; const f = tripFindEntry(m.plan, m.entryId); const e = f.entry; const version = m.spec.version || 'balanced';
  document.getElementById('tmTitle').textContent = 'Move ' + (e.name || 'place');
  document.getElementById('tmText').textContent = f.where === 'tray' ? 'now in No day yet' : f.where === 'alt' ? 'now an alternative of ' + (f.host.name || '') : 'now ' + tripDayLabel(m.plan.days[f.dayIdx]) + ' · ' + TRIP_PERIOD_LABEL[f.period];
  const body = document.getElementById('tmBody'); let h = '';
  if (m.step === 'alts'){ const same = tripPlanEntries(m.plan).filter(function(x){ return x.id !== e.id && x.ref && e.ref && x.ref.subcatId === e.ref.subcatId; }); h += '<div class="tm-list">' + (same.length ? same.map(function(x){ const fx = tripFindEntry(m.plan, x.id); return '<button type="button" class="btn btn-ghost wide" onclick="tripMoveAlt(\'' + attrStr(x.id) + '\')"><span dir="auto">' + escapeHtml(x.name) + '</span> <span class="dim">· ' + escapeHtml(tripDayLabel(m.plan.days[fx.dayIdx])) + ' · ' + TRIP_PERIOD_LABEL[fx.period] + '</span></button>'; }).join('') : '<div class="mp-empty mini">No other place of the same category in a day yet.</div>') + '</div><button type="button" class="btn btn-ghost wide" onclick="__tm.step = \'grid\'; tripMoveRender()">← Back</button>'; body.innerHTML = h; return; }
  h += '<div class="tm-grid"><span></span>' + TRIP_PERIODS.map(function(p){ return '<span class="tm-h">' + TRIP_PERIOD_LABEL[p] + '</span>'; }).join('');
  m.plan.days.forEach(function(d, i){ const avail = tripDayAvailable(d); h += '<span class="tm-d">' + escapeHtml(tripDayLabel(d).replace(' · arrival', ' · arr').replace(' · departure', ' · dep')) + '</span>' + TRIP_PERIODS.map(function(p){ if (avail.indexOf(p) < 0) return '<button type="button" class="tm-c off" disabled>—</button>'; const here = f.where === 'day' && f.dayIdx === i && f.period === p; const cnt = tripPeriodCount(d, p); const full = tripPeriodRoom(d, p, version) <= 0; return '<button type="button" class="tm-c' + (here ? ' here' : full ? ' full' : '') + '" onclick="tripMoveTo(' + i + ', \'' + p + '\')">' + (here ? 'here' : (cnt + (full ? ' · full' : ''))) + '</button>'; }).join(''); });
  h += '</div><div class="tm-note">Numbers are the places already in that period. A dash is outside the day’s window. “Full” still lets you move — it only warns.</div>';
  h += '<div class="sheet-alts">' + (f.where === 'tray' ? '' : '<button type="button" class="btn btn-ghost" onclick="tripMoveTo(null)">To “No day yet”</button>') + '<button type="button" class="btn btn-ghost" onclick="__tm.step = \'alts\'; tripMoveRender()">Make it an alternative of…</button></div>';
  body.innerHTML = h;
}
function tripMoveTo(dayIdx, period){ const m = __tm; if (!m) return; if (m.before) m.before(); const e = tripDetach(m.plan, m.entryId); if (!e) return tripMoveDone(false); if (dayIdx === null){ e.alts = e.alts || []; m.plan.tray.push(e); m.plan.tray.sort(tripById); } else { tripInsert(m.plan, dayIdx, period, e, null, false); } tripMoveDone(true); }
function tripMoveAlt(hostId){ const m = __tm; if (!m) return; if (m.before) m.before(); const e = tripDetach(m.plan, m.entryId); const f = tripFindEntry(m.plan, hostId); if (!e || !f || f.where !== 'day'){ if (e) m.plan.tray.push(e); return tripMoveDone(true); } const carried = e.alts || []; e.alts = []; f.entry.alts = (f.entry.alts || []).concat([e], carried); tripMoveDone(true); }
function tripMoveBackdropTap(ev){ if (ev && ev.target && ev.target.id === 'tripMoveBackdrop') tripMoveDone(null); }
function tripMoveDone(changed){ const m = __tm; __tm = null; document.getElementById('tripMoveBackdrop').classList.remove('show'); sheetBarsHide(false); if (m && typeof m.onDone === 'function') m.onDone(!!changed); }
