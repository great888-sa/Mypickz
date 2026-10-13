/* ═══ r77 (حزمة الرحلات · الدفعة أ — البيان v1.2 · التثبيت ١): محرك الرحلات — دوال نقية بلا واجهة وبلا شبكة.
   الخطة مصدر الحقيقة الوحيد (التثبيت ٢) · جدول الإيقاع واحد مملوك للمالك بقاعدة عامة لما لم يُذكر (التثبيت ٣) ·
   حتمية كاملة: ترتيب مستقر وكسر التعادل بمعرّف المدخل، لا عشوائية (التثبيت ٤).
   بنية الخطة: plan = { days:[{ n, kind:'full'|'arrival'|'departure', cityId, date|null, from|null, to|null, periods:{morning:[],midday:[],afternoon:[],evening:[]}, rest:{minutes}|null, excursion:id|null }], tray:[entry] }
   المدخل: entry = { id, ref:{sourceType,cityId,subcatId,placeId,sourceUid}, name, geo:{lat,lng}|null, sec, alts:[entry], alert:'' } ═══ */
const TRIP_PERIODS = ['morning', 'midday', 'afternoon', 'evening'];
const TRIP_PERIOD_LABEL = { morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', evening: 'Evening' };
const TRIP_VERSIONS = [['calm', 'Calm'], ['balanced', 'Balanced'], ['dense', 'Dense']];
const TRIP_ROLE_ORDER = { meal: 0, excursion: 1, light: 2, sight: 3, visit: 4 }; // ترتيب الاعتبار: الأضيق فتراتٍ أولًا
const TRIP_RHYTHM = { // ═══ جدول الإيقاع (البيان v1.2 · القسم الخامس — معتمد بقيمه) ═══
  windows: { morning: [480, 690], midday: [690, 870], afternoon: [870, 1110], evening: [1110, 1380] }, // دقائق من منتصف الليل
  capacity: { calm: { morning: 1, midday: 1, afternoon: 1, evening: 1 }, balanced: { morning: 2, midday: 2, afternoon: 2, evening: 2 }, dense: { morning: 3, midday: 2, afternoon: 3, evening: 3 } },
  roles: { // بالتصنيف الفرعي أولًا ثم بالقسم؛ ما لم يُذكر يأخذ القاعدة العامة
    coffee: { role: 'light', periods: ['morning', 'afternoon'], minutes: 45 }, cafe: { role: 'light', periods: ['morning', 'afternoon'], minutes: 45 }, tea: { role: 'light', periods: ['morning', 'afternoon'], minutes: 45 },
    brunch: { role: 'light', periods: ['morning', 'midday'], minutes: 60 }, bakery: { role: 'light', periods: ['morning'], minutes: 30 },
    dessert: { role: 'light', periods: ['afternoon', 'evening'], minutes: 30 }, icecream: { role: 'light', periods: ['afternoon', 'evening'], minutes: 30 },
    cafes_sweets: { role: 'light', periods: ['morning', 'afternoon'], minutes: 45 },
    restaurants_dish: { role: 'meal', periods: ['midday', 'evening'], minutes: 75 }, restaurants_cuisine: { role: 'meal', periods: ['midday', 'evening'], minutes: 75 },
    shopping_store: { role: 'visit', periods: ['afternoon', 'evening'], minutes: 120 }, shopping_product: { role: 'visit', periods: ['afternoon', 'evening'], minutes: 60 },
    parks_gardens: { role: 'sight', periods: ['morning', 'afternoon'], minutes: 75 }, squares_streets: { role: 'sight', periods: ['morning', 'afternoon', 'evening'], minutes: 60 },
    corniche_marinas: { role: 'sight', periods: ['afternoon', 'evening'], minutes: 60 }, tower_bridge_views: { role: 'sight', periods: ['afternoon', 'evening'], minutes: 60 },
    nature: { role: 'excursion', periods: ['morning', 'afternoon'], minutes: 180 }, beaches: { role: 'excursion', periods: ['morning', 'afternoon'], minutes: 180 },
    landmarks: { role: 'sight', periods: ['morning', 'afternoon'], minutes: 90 }, tours_venues: { role: 'sight', periods: ['morning', 'afternoon'], minutes: 120 },
    theme_parks: { role: 'excursion', periods: ['morning', 'afternoon'], minutes: 240 }, zoos_aquariums: { role: 'excursion', periods: ['morning', 'afternoon'], minutes: 180 },
    stay: { role: 'none', periods: [], minutes: 0 }, transportation: { role: 'none', periods: [], minutes: 0 }
  },
  defaultRole: { role: 'visit', periods: ['morning', 'midday', 'afternoon', 'evening'], minutes: 60 },
  walkKm: 1.2, pocketKm: { transit: 1.5, car: 8 }, detour: { walk: 1.3, transit: 1.3, car: 1.4 },
  rest: { minutes: 120, maxKm: 3, minStops: 4 }, longLegKm: { walk: 3, car: 25 }
};
function tripRoleOf(subcatId, sectionId){ const R = TRIP_RHYTHM.roles; const r = R[subcatId] || R[sectionId] || TRIP_RHYTHM.defaultRole; return { role: r.role, periods: (r.periods || TRIP_PERIODS).slice(), minutes: r.minutes || 60 }; }
function tripEntryRole(e){ return tripRoleOf(e && e.ref && e.ref.subcatId, e && e.sec); }
function tripCapacity(version, period){ const c = TRIP_RHYTHM.capacity[version] || TRIP_RHYTHM.capacity.balanced; return c[period] || 0; }
function tripKm(a, b){ if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return null; const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180; const s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2); return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); }
function tripRouteKm(a, b, mode){ const d = tripKm(a, b); if (d === null) return null; return d * (TRIP_RHYTHM.detour[mode] || TRIP_RHYTHM.detour.walk); } // المسافة ≈ خط مستقيم × معامل التعرج (البيان ٦-٣ — للدفعة ب والجدوى)
function tripMinutesOf(hhmm){ const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim()); if (!m) return null; const v = parseInt(m[1], 10) * 60 + parseInt(m[2], 10); return (v >= 0 && v < 1440) ? v : null; }
function tripDateAdd(ymd, n){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '')); if (!m) return null; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (n || 0))); return d.toISOString().slice(0, 10); } // نصوص يوم بلا مناطق زمنية (الاختيار ٤)
function tripDateLabel(ymd){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '')); if (!m) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return D[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + M[d.getUTCMonth()]; }
function tripDateDiff(a, b){ const x = tripDateAdd(a, 0), y = tripDateAdd(b, 0); if (!x || !y) return null; return Math.round((Date.parse(y + 'T00:00:00Z') - Date.parse(x + 'T00:00:00Z')) / 86400000); }
function tripEmptyPeriods(){ return { morning: [], midday: [], afternoon: [], evening: [] }; }
function tripDayAvailable(day){ // الفترة متاحة في اليوم الجزئي إن بقي منها ساعة ونصف على الأقل بعد الوصول أو قبل المغادرة (البيان ٥-١)
  return TRIP_PERIODS.filter(function(p){ const w = TRIP_RHYTHM.windows[p]; if (typeof day.from === 'number' && w[1] - 90 < day.from) return false; if (typeof day.to === 'number' && w[0] + 90 > day.to) return false; return true; });
}
function tripDayLabel(day){ return 'Day ' + day.n + (day.kind === 'arrival' ? ' · arrival' : day.kind === 'departure' ? ' · departure' : ''); }
function tripNewEntry(p){ // p = { id?, ref, name, geo, sec }
  return { id: p.id || ('e_' + String(p.ref && p.ref.placeId || p.name || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) + '_' + Math.random().toString(36).slice(2, 7)), ref: Object.assign({}, p.ref || {}), name: p.name || 'Place', geo: (p.geo && typeof p.geo.lat === 'number' && typeof p.geo.lng === 'number') ? { lat: p.geo.lat, lng: p.geo.lng } : null, sec: p.sec || '', alts: [], alert: p.alert || '' };
}
function tripCityDays(city, startN, first){ // أيام مدينة: جزئي الوصول (اليوم ٠ للمدينة الأولى) · الأيام الكاملة · جزئي المغادرة
  const out = []; let n = startN; const N = Math.max(1, Math.min(30, parseInt(city.days, 10) || 1));
  let firstDate = null; const arr = city.arrival && city.arrival.date ? city.arrival : null; const dep = city.departure && city.departure.date ? city.departure : null;
  if (city.single){ const from = tripMinutesOf(city.arrival && city.arrival.time), to = tripMinutesOf(city.departure && city.departure.time); out.push({ n: n++, kind: 'full', cityId: city.cityId, date: (arr && arr.date) || (dep && dep.date) || null, from: (typeof from === 'number') ? from : null, to: (typeof to === 'number') ? to : null, periods: tripEmptyPeriods(), rest: null, excursion: null }); return { days: out, next: n }; } // خطة يوم واحد (اللوحة ٩): البداية والعودة نافذتا اليوم نفسه
  if (arr){ const from = tripMinutesOf(arr.time); const d = { n: first ? 0 : n, kind: 'arrival', cityId: city.cityId, date: arr.date, from: (typeof from === 'number') ? from : null, to: null, periods: tripEmptyPeriods(), rest: null, excursion: null }; if (tripDayAvailable(d).length){ out.push(d); if (!first) n++; } firstDate = tripDateAdd(arr.date, 1); }
  else if (dep){ firstDate = tripDateAdd(dep.date, -N); }
  for (let i = 0; i < N; i++){ out.push({ n: n++, kind: 'full', cityId: city.cityId, date: firstDate ? tripDateAdd(firstDate, i) : null, from: null, to: null, periods: tripEmptyPeriods(), rest: null, excursion: null }); }
  if (dep){ const to = tripMinutesOf(dep.time); const d = { n: n, kind: 'departure', cityId: city.cityId, date: dep.date, from: null, to: (typeof to === 'number') ? to : null, periods: tripEmptyPeriods(), rest: null, excursion: null }; if (tripDayAvailable(d).length && (!firstDate || tripDateDiff(firstDate, dep.date) >= N)){ out.push(d); n++; } }
  return { days: out, next: n };
}
function tripPlanDays(cities){ let n = 1; const days = []; (cities || []).forEach(function(c, i){ const r = tripCityDays(c, n, i === 0); days.push.apply(days, r.days); n = r.next; }); return days; }
function tripDayEntries(day){ const out = []; TRIP_PERIODS.forEach(function(p){ (day.periods[p] || []).forEach(function(e){ out.push(e); }); }); return out; }
function tripPeriodCount(day, p){ return (day.periods[p] || []).length + ((day.excursion && TRIP_PERIODS.indexOf(p) > 0 && (day.periods[TRIP_PERIODS[TRIP_PERIODS.indexOf(p) - 1]] || []).some(function(e){ return e.id === day.excursion; })) ? 1 : 0); } // النزهة الطويلة تُحتسب في الفترتين
function tripPeriodRoom(day, p, version){ return tripCapacity(version, p) - tripPeriodCount(day, p); }
function tripDayRoom(day, version){ return tripDayAvailable(day).reduce(function(a, p){ return a + Math.max(0, tripPeriodRoom(day, p, version)); }, 0); }
function tripPlanEntries(plan){ const out = []; (plan.days || []).forEach(function(d){ tripDayEntries(d).forEach(function(e){ out.push(e); }); }); return out; }
function tripPlanCount(plan){ let n = 0; tripPlanEntries(plan).forEach(function(e){ n += 1 + (e.alts || []).length; }); (plan.tray || []).forEach(function(e){ n += 1 + (e.alts || []).length; }); return n; }
function tripFindEntry(plan, id){ for (let d = 0; d < (plan.days || []).length; d++){ const day = plan.days[d]; for (let k = 0; k < TRIP_PERIODS.length; k++){ const p = TRIP_PERIODS[k]; const arr = day.periods[p] || []; for (let i = 0; i < arr.length; i++){ if (arr[i].id === id) return { where: 'day', dayIdx: d, period: p, index: i, entry: arr[i] }; const a = (arr[i].alts || []).findIndex(function(x){ return x.id === id; }); if (a >= 0) return { where: 'alt', dayIdx: d, period: p, index: i, host: arr[i], altIndex: a, entry: arr[i].alts[a] }; } } } const t = (plan.tray || []).findIndex(function(x){ return x.id === id; }); if (t >= 0) return { where: 'tray', index: t, entry: plan.tray[t] }; return null; }
function tripCentroid(list){ const pts = (list || []).filter(function(e){ return e.geo; }); if (!pts.length) return null; return { lat: pts.reduce(function(a, e){ return a + e.geo.lat; }, 0) / pts.length, lng: pts.reduce(function(a, e){ return a + e.geo.lng; }, 0) / pts.length }; }
function tripDayCentroid(day){ return tripCentroid(tripDayEntries(day)); }
function tripById(a, b){ return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }
function tripPockets(entries, radiusKm){ // الخطوة ٢: الجيوب بالإحداثيات — الأقرب إلى الأقرب، حتمي
  const pockets = []; entries.slice().sort(tripById).forEach(function(e){ let best = null, bd = Infinity; pockets.forEach(function(p){ const d = tripKm(e.geo, p.c); if (d !== null && d <= radiusKm && d < bd){ best = p; bd = d; } }); if (best){ best.items.push(e); best.c = tripCentroid(best.items); } else pockets.push({ c: { lat: e.geo.lat, lng: e.geo.lng }, items: [e] }); });
  pockets.forEach(function(p){ p.items.sort(function(a, b){ const ra = TRIP_ROLE_ORDER[tripEntryRole(a).role], rb = TRIP_ROLE_ORDER[tripEntryRole(b).role]; return (ra === rb) ? tripById(a, b) : ((ra === undefined ? 9 : ra) - (rb === undefined ? 9 : rb)); }); });
  return pockets.sort(function(a, b){ return (b.items.length - a.items.length) || tripById(a.items[0], b.items[0]); });
}
function tripMealIn(day, p){ return (day.periods[p] || []).some(function(e){ return tripEntryRole(e).role === 'meal'; }); }
function tripTryPlace(day, e, version, allowAlt){ // يحاول إدخال مدخل في يوم بقواعد الإيقاع؛ يعيد { period, alt } أو null — لا يعدّل
  const role = tripEntryRole(e); if (role.role === 'none') return null; const avail = tripDayAvailable(day); const periods = role.periods.filter(function(p){ return avail.indexOf(p) >= 0; }); if (!periods.length) return null;
  if (allowAlt !== false){ for (let i = 0; i < periods.length; i++){ const host = (day.periods[periods[i]] || []).find(function(x){ return x.ref && e.ref && x.ref.subcatId === e.ref.subcatId; }); if (host) return { period: periods[i], alt: host.id }; } } // الخطوة ٥: التصنيف الفرعي نفسه في الفترة نفسها → بديل
  if (role.role === 'excursion' && !day.excursion){ for (let i = 0; i < periods.length - 1; i++){ const a = periods[i], b = TRIP_PERIODS[TRIP_PERIODS.indexOf(a) + 1]; if (periods.indexOf(b) >= 0 && tripPeriodCount(day, a) === 0 && tripPeriodCount(day, b) === 0) return { period: a, alt: null, excursion: true }; } }
  let best = null, br = 0; periods.forEach(function(p){ if (role.role === 'meal' && tripMealIn(day, p)) return; const r = tripPeriodRoom(day, p, version); if (r > br){ best = p; br = r; } }); // الأوسع فراغًا؛ التعادل للأبكر
  return best ? { period: best, alt: null } : null;
}
function tripInsert(plan, dayIdx, period, e, altOf, excursion){ const day = plan.days[dayIdx]; if (!day) return false; if (altOf){ const host = (day.periods[period] || []).find(function(x){ return x.id === altOf; }); if (!host) return false; host.alts = host.alts || []; host.alts.push(e); return true; } day.periods[period] = day.periods[period] || []; day.periods[period].push(e); if (excursion) day.excursion = e.id; return true; }
function tripDetach(plan, id){ const f = tripFindEntry(plan, id); if (!f) return null; if (f.where === 'day'){ const day = plan.days[f.dayIdx]; day.periods[f.period].splice(f.index, 1); if (day.excursion === id) day.excursion = null; } else if (f.where === 'alt'){ f.host.alts.splice(f.altIndex, 1); } else { plan.tray.splice(f.index, 1); } return f.entry; }
function tripOrderDay(day, stayGeo){ // الخطوة ٤: الإيقاع ثم القرب — داخل كل فترة سلسلة الأقرب فالأقرب من آخر محطة قبلها (أو الإقامة)
  let last = stayGeo || null; TRIP_PERIODS.forEach(function(p){ const arr = (day.periods[p] || []).slice(); const out = []; while (arr.length){ let bi = 0, bd = Infinity; arr.forEach(function(e, i){ const d = tripKm(last, e.geo); const dd = (d === null) ? 1e9 : d; if (dd < bd || (dd === bd && tripById(e, arr[bi]) < 0)){ bd = dd; bi = i; } }); const e = arr.splice(bi, 1)[0]; out.push(e); if (e.geo) last = e.geo; } day.periods[p] = out; });
}
function tripRestFor(day, stayGeo){ if (!stayGeo) return null; const n = tripDayEntries(day).length; if (n < TRIP_RHYTHM.rest.minStops) return null; const c = tripCentroid(day.periods.midday); const d = tripKm(c, stayGeo); if (d === null || d > TRIP_RHYTHM.rest.maxKm) return null; if (tripDayAvailable(day).indexOf('afternoon') < 0) return null; return { minutes: TRIP_RHYTHM.rest.minutes }; }
function tripBuildPlan(spec){ // spec = { cities:[{cityId, days, stay:{geo}|null, arrival, departure, fallback}], entries:[entry], version }
  const version = spec.version || 'balanced'; const plan = { days: tripPlanDays(spec.cities), tray: [] };
  const fresh = (spec.entries || []).map(function(e){ return Object.assign({}, e, { ref: Object.assign({}, e.ref || {}), geo: e.geo ? { lat: e.geo.lat, lng: e.geo.lng } : null, alts: [], alert: e.alert || '' }); }); // لا يعدّل مدخلات المستدعي — نسخة نظيفة بلا بدائل
  (spec.cities || []).forEach(function(city, ci){
    const dayIdx = []; plan.days.forEach(function(d, i){ if (d.cityId === city.cityId) dayIdx.push(i); });
    const mine = fresh.filter(function(e){ const c = e.ref && e.ref.cityId; return c ? c === city.cityId : ci === 0; });
    const pinned = mine.filter(function(e){ return !!e.geo && tripEntryRole(e).role !== 'none'; }); mine.filter(function(e){ return !e.geo || tripEntryRole(e).role === 'none'; }).sort(tripById).forEach(function(e){ plan.tray.push(e); });
    if (!dayIdx.length){ pinned.sort(tripById).forEach(function(e){ plan.tray.push(e); }); return; }
    const pockets = tripPockets(pinned, TRIP_RHYTHM.pocketKm[city.fallback === 'car' ? 'car' : 'transit']);
    pockets.forEach(function(pk){ // الخطوة ٣: الجيوب على الأيام — اليوم الأوسع فراغًا أولًا؛ الفائض ينتقل للتالي؛ ما لم يجد خانة في كل الأيام → الصينية
      const order = dayIdx.slice().sort(function(a, b){ return (tripDayRoom(plan.days[b], version) - tripDayRoom(plan.days[a], version)) || (a - b); });
      pk.items.forEach(function(e){ let done = false; for (let k = 0; k < order.length && !done; k++){ const day = plan.days[order[k]]; const t = tripTryPlace(day, e, version, true); if (t){ tripInsert(plan, order[k], t.period, e, t.alt, !!t.excursion); done = true; } } if (!done) plan.tray.push(e); });
    });
    dayIdx.forEach(function(i){ const day = plan.days[i]; const stay = city.stay && city.stay.geo; tripOrderDay(day, stay); day.rest = tripRestFor(day, stay); });
  });
  plan.tray.sort(tripById);
  return plan;
}
function tripSuggestSlot(plan, e, spec){ // الإضافة من بطاقة المكان (البيان ٦-٢): الدور → الفترات · الإحداثيات → اليوم الأقرب جيبًا · الجدول → هل تتسع؛ وإلا null = الصينية
  if (!e.geo) return null; const version = (spec && spec.version) || 'balanced'; const cityId = e.ref && e.ref.cityId; const city = ((spec && spec.cities) || []).find(function(c){ return c.cityId === cityId; }) || ((spec && spec.cities) || [])[0];
  const cands = []; (plan.days || []).forEach(function(d, i){ if (city && d.cityId !== city.cityId) return; const c = tripDayCentroid(d) || (city && city.stay && city.stay.geo) || null; const dist = tripKm(e.geo, c); cands.push({ i: i, dist: (dist === null) ? 1e9 : dist }); });
  cands.sort(function(a, b){ return (a.dist - b.dist) || (a.i - b.i); });
  for (let k = 0; k < cands.length; k++){ const t = tripTryPlace(plan.days[cands[k].i], e, version, true); if (t) return { dayIdx: cands[k].i, period: t.period, alt: t.alt || null, excursion: !!t.excursion }; }
  return null;
}
function tripWarnings(plan, spec){ // الخطوة ٦: الجدوى — تحذير لا منع
  const out = []; const version = (spec && spec.version) || 'balanced';
  (plan.days || []).forEach(function(d, i){ const cap = tripDayAvailable(d).reduce(function(a, p){ return a + tripCapacity(version, p); }, 0); const n = tripDayEntries(d).length; if (n > cap) out.push({ dayIdx: i, kind: 'dense', text: tripDayLabel(d) + ' holds ' + n + ' stops for a ' + version + ' day of ' + cap });
    const city = ((spec && spec.cities) || []).find(function(c){ return c.cityId === d.cityId; }) || {}; const mode = city.fallback === 'car' ? 'car' : 'transit'; const es = tripDayEntries(d);
    for (let k = 1; k < es.length; k++){ const km = tripRouteKm(es[k - 1].geo, es[k].geo, mode); const lim = TRIP_RHYTHM.longLegKm[mode === 'car' ? 'car' : 'walk']; if (km !== null && km > lim) out.push({ dayIdx: i, kind: 'longLeg', text: tripDayLabel(d) + ': ' + es[k - 1].name + ' → ' + es[k].name + ' ≈ ' + Math.round(km) + ' km' }); } });
  return out;
}
function tripPlanNormalize(plan){ // قراءة مستند قديم أو ناقص بأمان: الفترات الأربع دائمًا، والمصفوفات موجودة
  plan = plan || {}; const days = Array.isArray(plan.days) ? plan.days : []; days.forEach(function(d){ d.periods = d.periods || {}; TRIP_PERIODS.forEach(function(p){ if (!Array.isArray(d.periods[p])) d.periods[p] = []; d.periods[p].forEach(function(e){ e.alts = Array.isArray(e.alts) ? e.alts : []; e.alert = e.alert || ''; }); }); if (d.rest && typeof d.rest.minutes !== 'number') d.rest = null; if (!d.excursion) d.excursion = null; }); plan.days = days; plan.tray = Array.isArray(plan.tray) ? plan.tray : []; return plan;
}
