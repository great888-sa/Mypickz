/* ═══ r78 (حزمة الرحلات · الدفعة ب — البيان ٦-٣ · اللوحة ٦): تبويب «Day route» في عرض الرحلة.
   الترتيب يُشتق من الخطة بالمحرك (tripDaySchedule) ولا يُخزَّن؛ يُخزَّن ما كتبه المستخدم فقط في trip.dayRoutes (الخروج · العودة بحلول · دقائق ووسيلة كل رِجل · مدة كل محطة).
   تطبيق الملاحة تفضيل على المستخدم (الاختيار ١١) لا على الرحلة. ═══ */
let __tripRouteSaveTimer = null;
function tripNavApp(){ const v = userListData && userListData.navApp; return TRIP_NAV_APPS.some(function(x){ return x[0] === v; }) ? v : 'google'; }
function tripNavAppLabel(){ return (TRIP_NAV_APPS.find(function(x){ return x[0] === tripNavApp(); }) || TRIP_NAV_APPS[0])[1]; }
async function tripNavAppSheet(){ const v = await mpSheet({ title: 'Navigate with', text: 'Chosen once — every Navigate button opens this app in the leg\'s mode (walk · transit · drive).', ok: 'Google Maps', alt: 'Apple Maps', alt2: 'Waze' }); const app = v === 'ok' ? 'google' : v === 'alt' ? 'apple' : v === 'alt2' ? 'waze' : null; if (!app) return; if (userListData) userListData.navApp = app; if (currentUser) try{ await mpData.userLists.merge(currentUser.uid, { navApp: app }); }catch(e){} renderMyTripsModal(); }
function tripRouteDoc(trip, day){ trip.dayRoutes = trip.dayRoutes || {}; const k = String(day.n); const r = trip.dayRoutes[k] = trip.dayRoutes[k] || { leave: null, backBy: null, legs: {}, stays: {} }; r.legs = r.legs || {}; r.stays = r.stays || {}; return r; }
function tripRouteQueueSave(trip){ clearTimeout(__tripRouteSaveTimer); __tripRouteSaveTimer = setTimeout(function(){ __tripRouteSaveTimer = null; saveTrip(trip); }, 1000); } // الحفظ بتأخير ثانية كالمسودة (التثبيت ٤)
function tripRouteFlush(){ if (__tripRouteSaveTimer){ clearTimeout(__tripRouteSaveTimer); __tripRouteSaveTimer = null; const t = tripCurrent(); if (t) saveTrip(t); } }
function tripRouteDayNow(){ const trip = tripCurrent(); if (!trip || !tripHasPlan(trip)) return null; const day = trip.plan.days[tripDaySel]; return day ? { trip: trip, day: day } : null; }
function tripRouteSetTime(field, v){ const c = tripRouteDayNow(); if (!c) return; const r = tripRouteDoc(c.trip, c.day); r[field] = (tripMinutesOf(v) !== null) ? String(v) : null; tripRouteQueueSave(c.trip); renderMyTripsModal(); }
function tripLegSetMinutes(key, v){ const c = tripRouteDayNow(); if (!c) return; const r = tripRouteDoc(c.trip, c.day); const n = parseInt(v, 10); const L = r.legs[key] = r.legs[key] || { mode: null, minutes: null }; L.minutes = (!isNaN(n) && n >= 0 && n <= 1440) ? n : null; tripRouteQueueSave(c.trip); renderMyTripsModal(); }
async function tripLegModeSheet(key, cur){ const v = await mpSheet({ title: 'How do you get there?', text: 'Now: ' + (TRIP_MODE_LABEL[cur] || 'Walk') + '. The minutes you wrote stay as they are — change them if the mode changes them.', ok: 'Walk', alt: 'Metro & transit', alt2: 'Car' }); const mode = v === 'ok' ? 'walk' : v === 'alt' ? 'transit' : v === 'alt2' ? 'car' : null; if (!mode) return; const c = tripRouteDayNow(); if (!c) return; const r = tripRouteDoc(c.trip, c.day); const L = r.legs[key] = r.legs[key] || { mode: null, minutes: null }; L.mode = mode; tripRouteQueueSave(c.trip); renderMyTripsModal(); }
function tripStaySetMinutes(entryId, v){ const c = tripRouteDayNow(); if (!c) return; const r = tripRouteDoc(c.trip, c.day); const n = parseInt(v, 10); if (!isNaN(n) && n >= 0 && n <= 1440) r.stays[entryId] = n; else delete r.stays[entryId]; tripRouteQueueSave(c.trip); renderMyTripsModal(); }
function tripRouteStatusHtml(s){ // سطر الحالة: بلا خروج → اطلبه · رِجل بلا دقائق → غير مكتمل · مكتمل → العودة (وبعد الموعد = أحمر)
  if (!s.hasLeave) return '<div class="tr-status">Set the time you leave — the times of the day follow from it.</div>';
  if (!s.complete) return '<div class="tr-status warn">Incomplete · ' + s.missing + (s.missing === 1 ? ' leg' : ' legs') + ' without minutes</div>';
  if (s.late) return '<div class="tr-status late">Back at ' + tripHHMMx(s.endAt) + ' · after ' + escapeHtml(s.backBy) + '</div>';
  return '<div class="tr-status ok">Complete · back at ' + tripHHMMx(s.endAt) + (s.backBy ? ' · by ' + escapeHtml(s.backBy) : '') + (s.km !== null ? ' · ' + tripKmLabel(s.km) : '') + '</div>';
}
function tripRouteTabHtml(trip, day, city, readOnly){ // day = اليوم المحلول (أسماء الأماكن من _p)
  const s = tripDaySchedule(trip, day, city); const tm = function(m){ return (typeof m === 'number') ? tripHHMMx(m) : '—'; }; const app = tripNavApp();
  let h = '<div class="trip-route">' + tripRouteStatusHtml(s);
  if (!readOnly) h += '<div class="tr-fields"><label class="tr-lab">Leave<input type="time" class="modal-input" value="' + attrStr(s.leave || '') + '" onchange="tripRouteSetTime(\'leave\', this.value)"></label><label class="tr-lab">Back by<input type="time" class="modal-input" value="' + attrStr(s.backBy || '') + '" onchange="tripRouteSetTime(\'backBy\', this.value)"></label></div>'
    + '<div class="tr-navrow"><button type="button" class="chip" onclick="tripNavAppSheet()">Navigate with <b>' + escapeHtml(tripNavAppLabel()) + '</b> ⌄</button></div>';
  else h += '<div class="tr-fields ro"><span>Leave <b>' + escapeHtml(s.leave || '—') + '</b></span><span>Back by <b>' + escapeHtml(s.backBy || '—') + '</b></span></div>';
  let n = 0;
  s.steps.forEach(function(st){
    if (st.leg){ const L = st.leg; const nav = tripNavUrl(app, L.fromGeo, L.toGeo, L.mode);
      h += '<div class="tr-leg' + (L.missing ? ' missing' : '') + '"><span class="tr-leg-km">' + (L.km !== null ? tripKmLabel(L.km) : 'no distance') + '</span>'
        + (readOnly ? '<span class="tr-leg-m">' + escapeHtml(TRIP_MODE_LABEL[L.mode]) + '</span><span class="tr-leg-m">' + (L.missing ? '— min' : L.minutes + ' min') + '</span>' : '<button type="button" class="chip sm" onclick="tripLegModeSheet(\'' + attrStr(L.key) + '\', \'' + attrStr(L.mode) + '\')">' + escapeHtml(TRIP_MODE_LABEL[L.mode]) + ' ⌄</button><label class="tr-min"><input type="number" class="modal-input" min="0" max="1440" inputmode="numeric" placeholder="min" value="' + (L.missing ? '' : L.minutes) + '" onchange="tripLegSetMinutes(\'' + attrStr(L.key) + '\', this.value)"> min</label>')
        + (nav ? '<a class="actn sm tr-nav" href="' + attrStr(nav) + '" target="_blank" rel="noopener">Navigate ↗</a>' : '<span class="tr-leg-m dim">no pin</span>') + '</div>'; }
    if (st.kind === 'stay') h += '<div class="tr-stay"><span>🏨 <b dir="auto">' + escapeHtml(st.name) + '</b></span><span class="tr-time">leave ' + tm(st.depart) + '</span></div>';
    else if (st.kind === 'end') h += '<div class="tr-stay end"><span>🏨 <b dir="auto">' + escapeHtml(st.name) + '</b></span><span class="tr-time">back ' + tm(st.arrive) + '</span></div>';
    else if (st.kind === 'rest') h += '<div class="tr-rest"><span><b>Rest at ' + escapeHtml(st.name) + '</b> <span class="dim">· about ' + Math.round(st.minutes / 60) + ' h</span></span><span class="tr-time">' + tm(st.arrive) + ' → ' + tm(st.depart) + '</span></div>';
    else { n++; const e = st.entry || {}; const pl = e._p || {}; const name = pl.name || st.name;
      h += '<div class="tr-stop' + (e._available === false ? ' gone' : '') + '"><span class="pc-chip trip-num">' + n + '</span><div class="tr-stop-b"><b dir="auto">' + escapeHtml(name) + '</b><span class="tr-sub">' + escapeHtml([pl.area || '', (TRIP_PERIOD_LABEL[st.period] || '')].filter(Boolean).join(' · ')) + '</span><span class="tr-times">' + tm(st.arrive) + ' → ' + tm(st.depart) + '</span>' + (e.alert ? '<span class="pc-alert" dir="auto">⚠ ' + escapeHtml(e.alert) + '</span>' : '') + '</div>'
        + (readOnly ? '<span class="tr-leg-m">' + st.minutes + ' min</span>' : '<label class="tr-min">stay <input type="number" class="modal-input" min="0" max="1440" inputmode="numeric" value="' + st.minutes + '" onchange="tripStaySetMinutes(\'' + attrStr(st.id) + '\', this.value)"> min</label>') + '</div>'; }
  });
  if (!s.steps.length) h += '<div class="mp-empty mini">No stops this day — the route follows the plan.</div>';
  h += '<div class="tb-hint">Times are computed only from what you enter: the minutes of each leg come from your navigation app, the stay at each stop starts from the rhythm table. The plan works without any minute; the route is a layer you complete day by day.</div></div>';
  return h;
}
function tripRouteChipHtml(t){ if (!tripHasPlan(t) || t.status !== 'approved') return ''; const r = tripRoutesSummary(t); if (!r.total) return ''; return '<span class="pc-chip' + (r.complete === r.total ? ' ok' : '') + '">Routes ' + (r.complete === r.total ? '✓ ' : '· ') + r.complete + ' of ' + r.total + (r.total === 1 ? ' day' : ' days') + '</span>'; } // بطاقة الرحلة (البيان ٦-٤): «المسارات: N من M»
