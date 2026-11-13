/* =========================================================
   System Status (أ-٣ الطبقة ٢ "النبضة") — للمالك فقط
   يقرأ آخر جولة فحص من Worker النبضة (pulse.mypickz.app/status) بطلب واحد عند الفتح — لا Firestore، لا مستمعين.
   غياب الأثر > ساعتين = إنذار أحمر حتى لو المُراقِب نفسه توقف (سدّ ثغرة Cron الصامت — قرار ١٩ أغسطس).
   ========================================================= */
const PULSE_STATUS_URL = 'https://pulse.mypickz.app/status';
const PULSE_STALE_MS = 2 * 60 * 60 * 1000;

/* ب-٢-٢-ب (v2-ب · ٨): System status داخل القشرة — بطاقات بصنف واحد (admcard) · بطاقة Rules · زر تحديث · Back إلى اللوحة */
async function openSystemStatusModal(){
  if (!isOwner) return;
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('🩺 System status', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading pulse…</div>'; bd.classList.add('show');
  let h = await renderPulseCard(); h += await renderMpErrorsCard(); h += await renderMpEventsCard(); h += await renderRulesCard();
  body.innerHTML = '<button type="button" class="btn btn-ghost wide" style="margin:0 0 10px;" onclick="openSystemStatusModal()">↻ Refresh</button>' + h;
}
async function renderRulesCard(){ try{ const rv = await checkRulesVersion(); return mpCardHtml(rv.ok ? '🟢' : '🔴', 'Rules ' + rv.live + (rv.ok ? ' · matches app' : ' · app expects ' + EXPECTED_RULES), ['expected ' + EXPECTED_RULES + ' · set in settings/app after each publish']); }catch(e){ return mpCardHtml('⚪', 'Rules: unavailable', ['Could not read settings/app']); } }
async function pulseFetch(ms){ try{ const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), ms || 5000); const res = await fetch(PULSE_STATUS_URL, { cache: 'no-store', signal: ctrl.signal }); clearTimeout(timer); return res.ok ? await res.json() : null; }catch(e){ return null; } }
async function pulseSummary(){ /* سطر قصير لباب اللوحة */ const data = await pulseFetch(3000); if (!data || !data.at) return '⚪ pulse unavailable'; const age = Date.now() - new Date(data.at).getTime(); if (age > PULSE_STALE_MS) return '🔴 no check ' + pulseAgo(age); return (data.ok ? '🟢' : '🔴') + ' pulse ' + pulseAgo(age); }
function pulseAgo(ms){
  if (ms < 60000) return Math.round(ms / 1000) + 's ago';
  if (ms < 3600000) return Math.round(ms / 60000) + 'm ago';
  if (ms < 86400000) return (ms / 3600000).toFixed(1) + 'h ago';
  return (ms / 86400000).toFixed(1) + 'd ago';
}
async function renderPulseCard(){
  const data = await pulseFetch(5000); const card = mpCardHtml;
  if (!data) return card('⚪', 'Pulse: unavailable', ['Could not reach pulse.mypickz.app/status', 'Check the pulse worker deployment.']);
  if (!data.at) return card('⚪', 'Pulse: no check recorded yet', ['The hourly monitor has not run yet.']);
  const age = Date.now() - new Date(data.at).getTime();
  const details = (data.results || []).map(r => (r.ok ? 'OK   ' : 'FAIL ') + r.name + ' · ' + r.ms + 'ms' + (r.why ? ' · ' + r.why : ''));
  if (age > PULSE_STALE_MS) return card('🔴', 'Pulse: no check for ' + pulseAgo(age).replace(' ago', ''), ['Monitor may be down — last record ' + pulseAgo(age)].concat(details));
  if (data.ok) return card('🟢', 'Pulse: OK — last check ' + pulseAgo(age), details);
  return card('🔴', 'Pulse: FAILED — last check ' + pulseAgo(age), details);
}


/* ===== أ-٣ الطبقة ٣-أ: بطاقتا القياس بنافذة System Status (قراءة عند الفتح فقط، للمالك) ===== */
/* ═══ r116-ب (ق١١-١١-١٤ «مناسب جدا»): طقم اللوحات — أرقام بارزة ونسب مرسومة. دوال رسم صرفة (نص HTML) يستعملها لوحة المالك و«حصيلتي» وأثر القائمة وحصيلة النقل. الأصناف kp-/kc- في الملفين. ═══ */
function kpTile(label, n, delta, cls){ const d = (typeof delta === 'number' && delta !== 0 && isFinite(delta)) ? '<span class="kp-d ' + (delta > 0 ? 'up' : 'down') + '">' + (delta > 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '</span>' : ''; return '<div class="kp' + (cls ? ' ' + cls : '') + '"><div class="kp-l">' + escapeHtml(label) + '</div><div class="kp-n">' + escapeHtml(String(n)) + '</div>' + d + '</div>'; }
function kpRow(tiles, cls){ return '<div class="kp-row' + (cls ? ' ' + cls : '') + '">' + tiles.join('') + '</div>'; }
function kcCard(title, sub, body, tag){ return '<div class="kc"><div class="kc-h"><span class="kc-t">' + escapeHtml(title) + (tag ? '<span class="ktag">' + escapeHtml(tag) + '</span>' : '') + '</span>' + (sub ? '<span class="kc-s">' + escapeHtml(sub) + '</span>' : '') + '</div>' + body + '</div>'; }
function kcRing(pct, label){ const r = 31, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, +pct || 0)); return '<div class="kc-ring"><svg viewBox="0 0 74 74" width="74" height="74" aria-hidden="true"><circle class="bg" cx="37" cy="37" r="' + r + '"/><circle class="fg" cx="37" cy="37" r="' + r + '" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 37 37)"/></svg><b>' + escapeHtml(label) + '</b></div>'; }
function kcFunnel(rows){ const max = Math.max(1, rows[0] ? rows[0][1] : 1); return '<div class="kf">' + rows.map(function(r){ return '<div class="kf-r"><span>' + escapeHtml(r[0]) + '</span><div class="kf-b"><i style="width:' + Math.max(0, Math.min(100, Math.round(r[1] / max * 100))) + '%"></i></div><span class="kf-v">' + r[1] + '</span></div>'; }).join('') + '</div>'; }
function kcSplit(parts){ /* [[label, value, shown?]] — العرض بالحصة من المجموع */ const tot = parts.reduce(function(a, x){ return a + (x[1] || 0); }, 0) || 1; return '<div class="ksplit">' + parts.map(function(x){ return '<i style="width:' + ((x[1] || 0) / tot * 100).toFixed(1) + '%"></i>'; }).join('') + '</div><div class="kleg">' + parts.map(function(x){ return '<span>' + escapeHtml(x[0]) + ' <b>' + escapeHtml(String(x[2] !== undefined ? x[2] : x[1])) + '</b></span>'; }).join('') + '</div>'; }
function kcRank(i, name, sub, value, pct){ return '<div class="krank' + (i === 1 ? ' first' : '') + '"><span class="rk">' + i + '</span><div><div class="nm"><span dir="auto">' + escapeHtml(name) + '</span><small>' + escapeHtml(sub || '') + '</small></div><div class="br"><i style="width:' + Math.max(0, Math.min(100, Math.round(pct))) + '%"></i></div></div><div class="vl">' + escapeHtml(String(value)) + '</div></div>'; }
function kcBars(vals, left, right){ const max = Math.max.apply(null, vals.concat([1])); return '<div class="kbars">' + vals.map(function(v, i){ return '<i class="' + (i === vals.length - 1 ? 'today' : (v > 0 && v >= max * 0.75 ? 'hi' : '')) + '" style="height:' + Math.max(5, Math.round(v / max * 100)) + '%"></i>'; }).join('') + '</div><div class="kax"><span>' + escapeHtml(left) + '</span><span>' + escapeHtml(right) + '</span></div>'; }
function kcGauge(name, sub, v){ const pos = Math.max(4, Math.min(96, 50 + (v - 1) * 100)); return '<div class="kgau"><div>' + escapeHtml(name) + '<small>' + escapeHtml(sub) + '</small></div><div class="tr"><i style="left:' + pos.toFixed(0) + '%"></i></div><div class="vv">' + v.toFixed(2) + '</div></div>'; } /* العلامة في الوسط = ١٫٠٠ (المكتوب يساوي التقدير) */
function kcEmpty(text, sm){ return '<div class="kempty' + (sm ? ' sm' : '') + '"><span class="ph">—</span><span>' + escapeHtml(text) + '</span></div>'; }
function kc2(a, b){ return '<div class="k2"><div><b>' + escapeHtml(String(a[0])) + '</b><span>' + escapeHtml(a[1]) + '</span></div><div><b>' + escapeHtml(String(b[0])) + '</b><span>' + escapeHtml(b[1]) + '</span></div></div>'; }

/* ═══ r116-ب (ق١١-١١-١٢ · دَين readers): لوحة المالك — تقرأ المخازن التي تُكتب ولا يراها أحد. للمالك وحده، عند الفتح فقط (و↻)، بمدى أيام ثابت:
   dailyStats ١٤ يومًا (استعلام) · analytics: events ٧ أيام (≤٣٠٠) · hours ٧ (≤٢٠٠) · sources ٧ (≤١٠٠) · sessions ٧ (≤١٠٠) — استعلام مدى لكلٍّ · stats_cities لأنشط خمس مدن (استعلام لكلٍّ) · المستخدمون من ذاكرة اللوحة.
   أيام analytics بتوقيت الجهاز (كما يكتبها mpTrack) · أيام dailyStats و stats_cities بـUTC (كما تُكتب). كل عتبة ثابت مسمّى «غير معايَرة». ═══ */
const MP_DASH_MIN_GATE = 10;     /* غير معايَرة: أقلّ «seen» اليوم لتُعرض نسبة التحويل */
const MP_DASH_MIN_SESSIONS = 20; /* غير معايَرة: أقلّ جلسات الأسبوع ليُعرض متوسط المدة والعمق */
const MP_DASH_MIN_PULSE = 20;    /* غير معايَرة: أقلّ أحداث مدينة في ٧ أيام ليُرسم نبضها بالساعة */
const MP_DASH_MIN_LEGS = 10;     /* غير معايَرة: أقلّ أرجل وسيلة لتُعرض نسبتها */
let ownerDashCity = '', ownerDashLast = null;
function ownerDashDays(n, utc){ const out = []; const p = function(x){ return String(x).padStart(2, '0'); }; for (let i = n - 1; i >= 0; i--){ const d = new Date(Date.now() - i * 86400000); out.push(utc ? d.toISOString().slice(0, 10) : (d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()))); } return out; } /* الأقدم أولًا، واليوم آخرًا */
function ownerDashDayLabel(day){ const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || ''); return m ? (+m[3] + ' ' + MON[+m[2] - 1]) : ''; }
function ownerDashCityName(id){ return (typeof CITY_NAMES !== 'undefined' && CITY_NAMES[id] && CITY_NAMES[id].name) || (allCities().find(function(c){ return String(c.id) === String(id); }) || {}).name || ('City ' + id); }
async function ownerDashData(){
  const out = { errs: [], partial: [] }; const safe = async function(name, fn, dflt){ try{ return await fn(); }catch(e){ mpSwallow(e, 'dash ' + name); out.errs.push(name); return dflt; } };
  const u14 = ownerDashDays(14, true), l7 = ownerDashDays(7, false), u7 = u14.slice(7);
  const got = await Promise.all([ safe('activity', function(){ return mpData.dailyStats.range(u14[0], u14[13]); }, {}), safe('events', function(){ return mpData.analytics.range('events', l7[0], l7[6], 300); }, []), safe('events today', function(){ return mpData.analytics.range('events', l7[6], l7[6], 100); }, []), /* r116 (المراجعة المستقلة ٢): الاستعلام مرتَّب بالمعرّف تصاعديًّا فالسقف يُسقط أحدث الأيام أولًا — قمع اليوم يُقرأ باستعلامه وحده */ safe('hours', function(){ return mpData.analytics.range('hours', l7[0], l7[6], 200); }, []), safe('sources', function(){ return mpData.analytics.range('sources', l7[0], l7[6], 100); }, []), safe('sessions', function(){ return mpData.analytics.range('sessions', l7[0], l7[6], 100); }, []),
    (allUsersCache && allUsersCache.length) ? Promise.resolve(allUsersCache) : safe('users', async function(){ allUsersCache = await mpData.users.all(); return allUsersCache; }, []) ]);
  const daily = got[0], events = got[1], eventsToday = got[2], hours = got[3], sources = got[4], sessions = got[5], users = got[6] || [];
  [['events', events], ['events today', eventsToday], ['hours', hours], ['sources', sources], ['sessions', sessions]].forEach(function(x){ if (x[1] && x[1].partial) out.partial.push(x[0]); });
  const num = function(o, k){ return (o && typeof o[k] === 'number') ? o[k] : 0; }; const sumRows = function(rows, pick){ const s = {}; (rows || []).forEach(function(r){ if (pick && !pick(r)) return; Object.keys(r.data).forEach(function(k){ if (typeof r.data[k] === 'number') s[k] = (s[k] || 0) + r.data[k]; }); }); return s; };
  /* النشط والجديد */
  const act = u14.map(function(d){ return num(daily[d], 'activeToday'); }), neu = u14.map(function(d){ return num(daily[d], 'newSignupsToday'); }); const now = Date.now(); const sum = function(a){ return a.reduce(function(x, y){ return x + y; }, 0); };
  out.active = { days: u14, perDay: act, today: act[13], dToday: act[13] - act[12], d7: users.filter(function(u){ return u.lastSeen && now - u.lastSeen <= 7 * 86400000; }).length, d30: users.filter(function(u){ return u.lastSeen && now - u.lastSeen <= 30 * 86400000; }).length, newToday: neu[13], dNew: neu[13] - neu[12], new7: sum(neu.slice(7)), dNew7: sum(neu.slice(7)) - sum(neu.slice(0, 7)), any: sum(act) + sum(neu) > 0 };
  /* القمعان */
  const evToday = sumRows(eventsToday, function(r){ return r.day === l7[6]; }), ev7 = sumRows(events);
  out.gate = { seen: num(evToday, 'reserved_3'), started: num(evToday, 'signup_start'), done: num(evToday, 'signup_done') };
  out.imp = { runs: num(ev7, 'import_run'), places: num(ev7, 'import_place'), kept: num(ev7, 'import_suggest_kept'), changed: num(ev7, 'import_suggest_changed') };
  /* الساعات: لكل مدينة مجموعها وساعاتها الأربع والعشرون */
  const byCity = {}; (hours || []).forEach(function(r){ const c = r.rest; if (!c || c === 'all') return; const o = byCity[c] = byCity[c] || { id: c, total: 0, h: new Array(24).fill(0) }; Object.keys(r.data).forEach(function(k){ const m = /^h(\d{2})$/.exec(k); if (!m || typeof r.data[k] !== 'number' || +m[1] > 23) return; o.h[+m[1]] += r.data[k]; o.total += r.data[k]; }); });
  const top = Object.keys(byCity).map(function(k){ return byCity[k]; }).sort(function(a, b){ return b.total - a.total; }).slice(0, 5);
  const cs = await Promise.all(top.map(function(c){ return safe('cities', function(){ return mpData.stats.cityRange(c.id, u7[0], u7[6]); }, { open: 0, place_added: 0, trip_built: 0 }); }));
  top.forEach(function(c, i){ c.stats = cs[i]; }); if (top.some(function(c){ return /^City /.test(ownerDashCityName(c.id)); })) await safe('names', function(){ return cmPublicListsCached(); }, []); /* أسماء المدن من فهرس السوق (استعلام واحد في مهلته) */
  out.cities = top.map(function(c){ return { id: c.id, name: ownerDashCityName(c.id), total: c.total, h: c.h, open: c.stats.open, added: c.stats.place_added, trips: c.stats.trip_built }; }).sort(function(a, b){ return (b.open - a.open) || (b.total - a.total); });
  /* المصادر والجلسات */
  out.src = sumRows(sources); const ss = sumRows(sessions); out.sess = { n: num(ss, 'count'), seconds: num(ss, 'seconds'), depth: num(ss, 'depth') };
  /* المشاركون: كم سجلًّا جديدًا حمل رمز كل مشارك (refBy — رمز مستعار) */
  const sh = {}; users.forEach(function(u){ const c = u && u.refBy; if (typeof c === 'string' && /^[a-z0-9]{6,16}$/i.test(c)) sh[c] = (sh[c] || 0) + 1; }); out.sharers = Object.keys(sh).map(function(k){ return { code: k, n: sh[k] }; }).sort(function(a, b){ return (b.n - a.n) || a.code.localeCompare(b.code); }).slice(0, 5);
  out.legs = mpLegCalSummary(); out.at = Date.now(); return out;
}
function ownerDashHtml(d){
  const s = function(n, one, many){ return n + ' ' + (n === 1 ? one : (many || one + 's')); }; let h = '';
  if (d.partial.length) h += '<div class="warnline">⚠️ <span><b>Partial numbers</b><br>' + escapeHtml(d.partial.join(' · ')) + ' reached the read cap — the oldest days are counted first, so 7-day totals are a floor. Today’s gate is read on its own.</span></div>'; /* r116 (المراجعة ٢): في أعلى اللوحة لا في ذيلها */
  if (d.errs.length) h += '<div class="warnline">⚠️ <span><b>Some numbers could not be read</b><br>' + escapeHtml(d.errs.join(' · ')) + ' — the cards below show what did load.</span></div>';
  /* اليوم */
  const a = d.active; h += '<div class="gsec">Today</div>' + kpRow([kpTile('Active today', a.today, a.dToday, 'hero'), kpTile('7 days', a.d7), kpTile('30 days', a.d30)]) + kpRow([kpTile('New sign-ups today', a.newToday, a.dNew), kpTile('Sign-ups · 7 days', a.new7, a.dNew7)], 'two');
  h += kcCard('Active per day', 'last 14 days · peak ' + Math.max.apply(null, a.perDay), a.any ? kcBars(a.perDay, ownerDashDayLabel(a.days[0]), ownerDashDayLabel(a.days[13]) + ' · today') : kcEmpty('No activity recorded in the last 14 days'));
  /* القمعان */
  const g = d.gate; const gOk = g.seen >= MP_DASH_MIN_GATE; const pct = g.seen ? Math.round(g.done / g.seen * 100) : 0;
  h += '<div class="gsec">Funnels</div>' + kcCard('Gate', 'today', (g.seen || g.started || g.done) ? ('<div class="kc-big">' + kcRing(gOk ? pct : 0, gOk ? pct + '%' : '—') + kcFunnel([['Seen', g.seen], ['Started', g.started], ['Signed up', g.done]]) + '</div><div class="kc-note">' + (gOk ? 'A floor — “seen” counts a device once a day' : 'The rate shows from ' + MP_DASH_MIN_GATE + ' devices seen in a day') + '</div>') : kcEmpty('No device has seen the gate today'), gOk ? '' : 'not calibrated');
  const im = d.imp; const sg = im.kept + im.changed; h += kcCard('Import', 'last 7 days', (im.runs || im.places) ? (kc2([im.runs, im.runs === 1 ? 'run' : 'runs'], [im.places, 'places brought in']) + (sg ? kcSplit([['Suggestions kept', im.kept, Math.round(im.kept / sg * 100) + '%'], ['changed', im.changed, Math.round(im.changed / sg * 100) + '%']]) : '<div class="kc-note">No category suggestion confirmed yet</div>')) : kcEmpty('No import in the last 7 days'));
  /* المدن */
  const cs = d.cities; const maxO = Math.max.apply(null, cs.map(function(c){ return c.open; }).concat([1]));
  h += '<div class="gsec">Cities · last 7 days</div>' + kcCard('Busiest cities', 'opens', cs.length ? cs.map(function(c, i){ return kcRank(i + 1, c.name, s(c.added, 'place') + ' · ' + s(c.trips, 'trip'), c.open, c.open / maxO * 100); }).join('') : kcEmpty('No city activity in the last 7 days'));
  if (cs.length){ const pick = cs.find(function(c){ return c.id === ownerDashCity; }) || cs.slice().sort(function(x, y){ return y.total - x.total; })[0]; const peak = pick.h.indexOf(Math.max.apply(null, pick.h)); const okP = pick.total >= MP_DASH_MIN_PULSE;
    h += kcCard('City pulse by hour', pick.name + (okP ? ' · peak ' + String(peak).padStart(2, '0') + ':00' : ''), (cs.length > 1 ? '<div class="kchips">' + cs.map(function(c){ return '<button type="button" class="chip' + (c.id === pick.id ? ' on' : '') + '" onclick="ownerDashPickCity(\'' + attrStr(c.id) + '\')">' + escapeHtml(c.name) + '</button>'; }).join('') + '</div>' : '') + (okP ? kcBars(pick.h, '00', '23').replace(' class="today"', ' class=""') : kcEmpty('Not enough data yet — fewer than ' + MP_DASH_MIN_PULSE + ' actions here this week')), okP ? '' : 'not calibrated'); }
  /* المصادر */
  const sr = d.src; const n = function(k){ return sr[k] || 0; }; const types = [['A user list', n('src_ulist')], ['A curator', n('src_curator')], ['A trip', n('src_trip')], ['The app', n('src_app')], ['Community', n('src_community')]].filter(function(x){ return x[1] > 0; }); const tagged = types.reduce(function(x, y){ return x + y[1]; }, 0); const social = n('ref_ig') + n('ref_tt') + n('ref_sc'); const anySrc = tagged + n('ref_qr') + n('ref_link') + n('ref_direct') + n('ref_card') + social > 0;
  h += '<div class="gsec">Where visitors come from</div>' + kcCard('Sources', 'last 7 days' + (tagged ? ' · ' + tagged + ' tagged' : ''), anySrc ? ((types.length ? kcSplit(types) : '<div class="kc-note">No tagged link opened yet</div>') + kpRow([kpTile('By QR', n('ref_qr'), null, 'soft'), kpTile('By link', n('ref_link'), null, 'soft'), kpTile('Direct', n('ref_direct'), null, 'soft')], 'in') + ((social || n('ref_card')) ? kpRow([kpTile('Social', social, null, 'soft'), kpTile('Share card', n('ref_card'), null, 'soft')], 'two in') : '')) : kcEmpty('No visit source recorded in the last 7 days'));
  const sh = d.sharers; h += kcCard('Sharers', 'sign-ups brought', sh.length ? sh.map(function(x, i){ return kcRank(i + 1, x.code, 'code', x.n, x.n / sh[0].n * 100); }).join('') : kcEmpty('No sign-up carried a sharer code yet'));
  /* الجلسات */
  const se = d.sess; const okS = se.n >= MP_DASH_MIN_SESSIONS; const avg = se.n ? Math.round(se.seconds / se.n) : 0;
  h += '<div class="gsec">Sessions</div>' + kcCard('Depth and length', okS ? 'last 7 days · ' + se.n + ' sessions' : '', okS ? kc2([Math.floor(avg / 60) + ':' + String(avg % 60).padStart(2, '0'), 'average length'], [(se.depth / se.n).toFixed(1), 'actions per session']) : kcEmpty('Not enough data yet — fewer than ' + MP_DASH_MIN_SESSIONS + ' sessions this week' + (se.n ? ' (' + se.n + ')' : '')), okS ? '' : 'not calibrated');
  /* معايرة الأرجل — هذا الجهاز */
  const lg = d.legs; h += '<div class="gsec">Calibration</div>' + kcCard('Leg estimates', 'typed ÷ estimate', (lg.length ? lg.map(function(m){ const nm = ({ walk: 'Walk', transit: 'Transit', car: 'Car' })[m.mode] || m.label; return m.n >= MP_DASH_MIN_LEGS ? kcGauge(nm, s(m.n, 'leg'), m.ratio) : kcEmpty(nm + ' — ' + s(m.n, 'leg') + ' · not enough data yet', true); }).join('') : kcEmpty('No leg minutes typed over an estimate on this device yet')) + '<div class="kc-note">From this device only — minutes you typed over our estimate. 1.00 means the estimate was exact; above it, the real leg took longer.</div>', (lg.length && lg.every(function(m){ return m.n >= MP_DASH_MIN_LEGS; })) ? '' : 'not calibrated');
  return h;
}
async function openOwnerDashboard(){
  if (!isOwner) return; const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('📊 Owner dashboard', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading the numbers…</div>'; bd.classList.add('show');
  try{ ownerDashLast = await ownerDashData(); ownerDashPaint(); }catch(e){ mpSwallow(e, 'owner dashboard'); body.innerHTML = '<div class="mp-empty mini">Could not load the dashboard — ' + escapeHtml(mpErrText(e)) + '</div><button type="button" class="dash-door" onclick="openOwnerDashboard()"><span>↻ Retry</span><span></span></button>'; }
}
function ownerDashPaint(){ const body = document.getElementById('dashBody'); if (!body || !ownerDashLast) return; body.innerHTML = '<button type="button" class="btn btn-ghost wide" style="margin:0 0 10px;" onclick="openOwnerDashboard()">↻ Refresh</button>' + ownerDashHtml(ownerDashLast); }
function ownerDashPickCity(id){ ownerDashCity = id; ownerDashPaint(); }

function mpCardHtml(dot, title, cardLines){ /* ب-٢-٢-ب: بطاقة بصنف واحد بدل الأنماط الداخلية */
  return '<div class="admcard"><div class="pn">' + dot + ' ' + escapeHtml(title) + '</div>' + cardLines.map(l => '<div class="pl-sub">' + escapeHtml(l) + '</div>').join('') + '</div>';
}
async function renderMpErrorsCard(){
  try{
    const d0 = new Date(), pd = n => String(n).padStart(2,'0');
    const id = 'errors_' + d0.getFullYear() + '-' + pd(d0.getMonth()+1) + '-' + pd(d0.getDate());
    const d = await mpData.analytics.getDoc(id);
    const total = d ? (d.total || 0) : 0;
    const rows = d ? ['TypeError','ReferenceError','SyntaxError','NetworkError','UnhandledRejection','Other'].filter(k => d[k]).map(k => k + ': ' + d[k]) : [];
    const dot = total === 0 ? '🟢' : (total < 10 ? '🟡' : '🔴');
    return mpCardHtml(dot, 'Field errors today: ' + total, rows.length ? rows : ['No errors recorded today.']);
  }catch(e){ return mpCardHtml('⚪', 'Field errors: unavailable', ['Could not read analytics/errors.']); }
}
async function renderMpEventsCard(){
  try{
    const d0 = new Date(), pd = n => String(n).padStart(2,'0');
    const prefix = 'events_' + d0.getFullYear() + '-' + pd(d0.getMonth()+1) + '-' + pd(d0.getDate()) + '__';
    const snap = await mpData.analytics.byPrefix(prefix, 50);
    const sums = {};
    snap.forEach(doc => { const d = doc.data(); for (const k in d){ if (typeof d[k] === 'number') sums[k] = (sums[k] || 0) + d[k]; } });
    const NAMES = { reserved_3: 'gate seen', reserved_2: 'published publicly' }; /* r115-ب: المفتاحان المحجوزان باسم مقروء */
    const top = Object.keys(sums).sort((a,b) => sums[b] - sums[a]).slice(0,6).map(k => (NAMES[k] || k) + ': ' + sums[k]);
    const seen = sums.reserved_3 || 0, started = sums.signup_start || 0, done = sums.signup_done || 0; /* r115-ب: «وصل ← سجّل» — من المجموع نفسه بلا قراءة إضافية */
    const gate = 'Gate today: seen ' + seen + ' · started ' + started + ' · signed up ' + done + ' · ' + (seen ? Math.round(done / seen * 100) + '% (a floor — “seen” counts a device once a day)' : '—');
    return mpCardHtml(top.length ? '🟢' : '⚪', 'Events today (' + snap.size + ' doc' + (snap.size === 1 ? '' : 's') + ')', (top.length ? top : ['No events recorded yet today.']).concat([gate]));
  }catch(e){ return mpCardHtml('⚪', 'Events: unavailable', ['Could not read analytics/events.']); }
}

function adminStatsData(){
  const total = allUsersCache.length; const publicSet = new Set(communityUsers.map(u => u.uid)); const publicCount = communityUsers.length;
  const pct = total ? Math.round((publicCount / total) * 100) : 0; const now = Date.now();
  return { total: total, publicSet: publicSet, publicCount: publicCount, pct: pct,
    active7: allUsersCache.filter(u => u.lastSeen && (now - u.lastSeen) <= 7*24*60*60*1000).length,
    active30: allUsersCache.filter(u => u.lastSeen && (now - u.lastSeen) <= 30*24*60*60*1000).length,
    usedCityList: allUsersCache.filter(u => u.hasMyListActivity).length, usedBookmarks: allUsersCache.filter(u => u.hasBookmarked).length,
    curatorSet: new Set((curators || []).map(function(c){ return c.uid; })) };
}
function renderAdminStats(){ // ر٧٢-أ-١ (إعادة البناء) · r74m (ق١٠-١٠-٠٦ الخيار أ): بلاطات ٢×٤ — الرقمان المنفردان صارا بلاطتين
  const d = adminStatsData(); const tiles = document.getElementById('adminTiles'); if (!tiles) return;
  const tile = function(v, l){ return '<div class="admtile"><b>' + v + '</b><span>' + l + '</span></div>'; };
  tiles.innerHTML = tile(visitCount === null ? '…' : visitCount, 'visits') + tile(d.total, 'registered') + tile(d.publicCount, 'public · ' + d.pct + '%') + tile(d.curatorSet.size, 'curators') + tile(d.active7, 'active 7d') + tile(d.active30, 'active 30d') + tile(d.usedCityList, 'Saved a place') + tile(d.usedBookmarks, 'Bookmarked');
  const uc = document.getElementById('adminUsersCount'); if (uc) uc.textContent = d.total + ' ›';
}
function renderUsersModal(query){ /* ب-٢-٢-ب (v2-ب · ٢): الصف بلا أزرار — النقر يفتح بطاقة المستخدم · Show more بعد ٥٠ */
  const d = adminStatsData();
  const ctx = document.getElementById('usersCtx'); if (ctx) ctx.innerHTML = '<b>' + d.total + '</b> registered · ' + d.publicCount + ' public · ' + d.curatorSet.size + (d.curatorSet.size === 1 ? ' curator' : ' curators');
  const q = (query || '').trim().toLowerCase();
  const list = allUsersCache.filter(u => !q || (u.email || '').toLowerCase().includes(q) || (u.nickname || '').toLowerCase().includes(q)).sort((a, b) => (a.nickname || 'zz').localeCompare(b.nickname || 'zz'));
  const wrap = document.getElementById('usersListBody'); if (!wrap) return;
  if (!list.length){ wrap.innerHTML = '<div class="mp-empty mini">No users match</div>'; return; }
  wrap.innerHTML = list.slice(0, adminUsersShown).map(u => {
    const isPublicNow = d.publicSet.has(u.uid); const isCur = d.curatorSet.has(u.uid);
    const badges = (isPublicNow ? '<span class="pl-flag ubadge">Public</span>' : '') + (isCur ? '<span class="curvb ubadge">✧ ' + CUR_BADGE + '</span>' : '') + (u.suspended ? '<span class="pl-flag ubadge danger">Suspended</span>' : '');
    return '<button type="button" class="row rowblock urow" onclick="openAdminUserCard(\'' + attrStr(u.uid) + '\')"><div class="pn"><span class="curring" style="display:inline-flex; width:22px; height:22px; font-size:9px; margin-right:6px;">' + escapeHtml(curInitials({ nickname: u.nickname || '?' })) + '</span>' + (u.nickname ? escapeHtml(u.nickname) : '<span class="dim">(no nickname yet)</span>') + '</div><div class="pl-sub">' + escapeHtml(u.email || '') + '</div><div class="ubadges">' + badges + '</div></button>';
  }).join('') + (list.length > adminUsersShown ? '<button type="button" class="dash-door ghost" onclick="adminUsersMore()"><span>Show more · ' + (list.length - adminUsersShown) + ' left</span><span></span></button>' : '');
}
async function toggleCuratorUser(uid){ // ر٧٢-أ-١ب: وسم المنتقي بيد المالك من التطبيق — الحقل القائم verified بالملف العام (M4.12)
  if (!isOwner) return;
  const isCur = (curators || []).some(function(c){ return c.uid === uid; });
  const u = allUsersCache.find(function(x){ return x.uid === uid; }) || {};
  try{
    const patch = { verified: !isCur }; if (!isCur && u.nickname) patch.nickname = u.nickname; // يُنشئ الملف إن لم يوجد
    await mpData.profiles.merge(uid, patch);
    if (isCur) curators = (curators || []).filter(function(c){ return c.uid !== uid; }); else curators = (curators || []).concat([{ uid: uid, nickname: u.nickname || '', verified: true, publicCityIds: (communityUsers.find(function(c){ return c.uid === uid; }) || {}).publicCityIds || [] }]);
    showToast(isCur ? 'Curator badge removed' : 'Marked as curator ✓');
  }catch(e){ showToast('Could not update — check your permissions'); }
  openAdminUserCard(uid); /* ب-٢-٢-ب: البطاقة تتحدث في مكانها */
}
/* ب-٢-٢-ب (v2-ب · ٩): Users report بطاقة مقسَّمة بالأرقام نفسها · Copy as text بالصيغة النصية القائمة · Share بـmpSendText */
let usersReportText = '';
function generateUsersReport(){
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  const total = allUsersCache.length; const publicCount = communityUsers.length; const now = Date.now();
  const active7 = allUsersCache.filter(u => u.lastSeen && (now - u.lastSeen) <= 7*24*60*60*1000).length;
  const active30 = allUsersCache.filter(u => u.lastSeen && (now - u.lastSeen) <= 30*24*60*60*1000).length;
  const usedCityList = allUsersCache.filter(u => u.hasMyListActivity).length;
  const usedBookmarks = allUsersCache.filter(u => u.hasBookmarked).length;
  const suspendedCount = allUsersCache.filter(u => u.suspended).length;
  const curatorsCount = (curators || []).length;
  const pct = (n) => total ? Math.round((n/total)*100) : 0; const when = new Date();
  usersReportText = [
    'MyPickz — Users Report', 'Generated: ' + when.toLocaleString(), '',
    'Total page visits: ' + (visitCount === null ? 'N/A' : visitCount), 'Total registered users: ' + total,
    'Active in last 7 days: ' + active7 + ' (' + pct(active7) + '%)', 'Active in last 30 days: ' + active30 + ' (' + pct(active30) + '%)',
    'Used My List at least once: ' + usedCityList + ' (' + pct(usedCityList) + '%)', 'Bookmarked at least one place: ' + usedBookmarks + ' (' + pct(usedBookmarks) + '%)',
    'Sharing publicly (Community Lists): ' + publicCount + ' (' + pct(publicCount) + '%)', 'Curators: ' + curatorsCount, 'Suspended accounts: ' + suspendedCount
  ].join('\n');
  const rowf = function(label, v){ return '<li><span>' + label + '</span><b>' + v + '</b></li>'; };
  dashSet('📄 Users report', adminBack);
  body.innerHTML = '<div class="ctx" style="text-align:center;">Generated · ' + escapeHtml(when.toLocaleString()) + '</div>'
    + '<div class="gsec">Reach</div><div class="receipt"><ul>' + rowf('Total page visits', visitCount === null ? 'N/A' : visitCount) + rowf('Registered users', total) + '</ul></div>'
    + '<div class="gsec">Activity</div><div class="receipt"><ul>' + rowf('Active · 7 days', active7 + ' · ' + pct(active7) + '%') + rowf('Active · 30 days', active30 + ' · ' + pct(active30) + '%') + rowf('Used My List at least once', usedCityList + ' · ' + pct(usedCityList) + '%') + rowf('Bookmarked at least one place', usedBookmarks + ' · ' + pct(usedBookmarks) + '%') + '</ul></div>'
    + '<div class="gsec">Sharing & moderation</div><div class="receipt"><ul>' + rowf('Sharing publicly', publicCount + ' · ' + pct(publicCount) + '%') + rowf('Curators', curatorsCount) + rowf('Suspended accounts', suspendedCount) + '</ul></div>'
    + '<div style="display:flex; gap:8px; margin-top:12px;"><button type="button" class="btn btn-ghost" style="flex:1" onclick="copyUsersReport()">📋 Copy as text</button><button type="button" class="btn btn-brass" style="flex:1" onclick="mpSendText(usersReportText)">📤 Share</button></div>';
  bd.classList.add('show');
}
async function copyUsersReport(){
  try{ await navigator.clipboard.writeText(usersReportText); showToast('Report copied ✓'); }catch(e){ showToast('Could not copy'); }
}

async function toggleSuspendUser(uid){
  if (!uid || !currentUser || uid === currentUser.uid){ if (uid && currentUser && uid === currentUser.uid) showToast("You can't suspend yourself"); return; } /* r100-ج */
  const u = allUsersCache.find(x => x.uid === uid);
  if (!u) return;
  if (u.__suspendBusy) return; u.__suspendBusy = true; /* r109-ب (المراجعة): ضغطتان = فعل واحد — العلم يُرفع قبل أي انتظار (ورقة التأكيد نفسها انتظار) */
  const newVal = !u.suspended;
  if (newVal && !(await mpConfirm('Holds every public list and trip and the shared-by-name access. Unsuspend restores everything.', { title: '⛔ Suspend ' + (u.nickname || u.email || 'this user') + '?', ok: 'Suspend', danger: true }))){ delete u.__suspendBusy; return; } /* ب-٢-٢-ب: الإيقاف بورقة تأكيد */
  try{
    // v3: مصدر الحقيقة suspensions/{uid} — وجود المستند = إيقاف. users.suspended كتابة انتقالية (تُزال بدفعة ٢/ز).
    if (newVal) await mpData.suspensions.set(uid, { at: Date.now(), by: currentUser.uid, email: u.email || '' });
    else await mpData.suspensions.remove(uid);
    await mpData.users.merge(uid, { suspended: newVal }).catch(()=>{});
    // ٢٦ أغسطس (القرار ١): الإيقاف يحتجز العام والمشاركة بالاسم على كل قوائم المستخدم ورحلاته، والرفع يستعيدهما كما كانا —
    // لا محو ولا فعل يدوي؛ البوابة البشرية هي قرار الرفع (المالك يراجع المحتوى قبله — وصفة الإيقاف بدليل التشغيل)
    await mpData.cityLists.holdAll(uid, newVal); /* r109-ب: القوائم وتصنيفاتها معًا — الإيقاف كامل */
    await mpData.holdOrRestore(await mpData.trips.byOwner(uid), newVal); /* r109-ب (المراجعة): كان فشلها يُبتلع فيُقال «User suspended» ورحلاته عامة — الآن يُعلَن، وإعادة الضغط تكمل الاتجاه نفسه (الإيقاف والرفع قابلان للتكرار) */
    if (newVal){
      await mpData.profiles.merge(uid, { hasAnyPublicCity: false, hasAnyPublicContent: false, publicCityIds: [] }).catch(()=>{});
    } else {
      await syncCommunityProfileFor(uid); // الرفع: نعيد حساب حالة الظهور الحقيقية بعد الاستعادة
    }
    u.suspended = newVal;
    showToast(newVal ? 'User suspended' : 'User unsuspended');
    await loadCommunityLists(true);
    openAdminUserCard(uid); /* ب-٢-٢-ب */
  }catch(e){ mpSwallow(e, 'suspend'); mpErrToast('Could not finish — tap again to complete it', e); }
  finally{ delete u.__suspendBusy; }
}

let expandedSections = {}; // { sectionTitle: true } — القسم مفتوح بالكامل
let areaFilter = {};       // { sectionTitle: "اسم المنطقة" } — فلتر نشط على مستوى القسم الرئيسي

const COLLAPSE_LIMIT = 6;


