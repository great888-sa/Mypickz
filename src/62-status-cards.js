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
/* ═══ r120 (ق١١-١٨-٢٣ ٥ · ق١١-٢٤-٠٤): التقارير التي تُصدَّر — بنية واحدة (rep) تُرسم شاشةً ونصًّا وصورة، فلا يخالف التقرير شاشته ولا نصُّه صورتَه.
   rep = { title, sub, sections: [{ h, sub, tiles: [[label, value]], bars: { label, vals, left, right }, rows: [[name, value, sub]], ranked, lines: [text] }] } ═══ */
let mpRepLast = null;
function mpRepHtml(rep){
  let h = '<div class="ctx" style="text-align:center;"><b>' + escapeHtml(rep.title) + '</b><br>' + escapeHtml(rep.sub || '') + '</div>';
  (rep.sections || []).forEach(function(s){ let b = '';
    if (s.tiles) for (let i = 0; i < s.tiles.length; i += 3){ const part = s.tiles.slice(i, i + 3); b += kpRow(part.map(function(t){ return kpTile(t[0], t[1], null, 'soft'); }), part.length === 2 ? 'two kp-wrap' : 'kp-wrap'); } /* r120 (ق١١-٢٤-٠٩ — قيس باللقطة): بلاطتان في صف يلتفّ اسمهما ولا يُقصّ */
    if (s.bars) b += '<div class="kc-note" style="margin-top:0;"><b>' + escapeHtml(s.bars.label) + '</b></div>' + (s.bars.vals.some(function(v){ return v > 0; }) ? kcBars(s.bars.vals, s.bars.left, s.bars.right) : kcEmpty('Nothing counted in this period yet', true));
    if (s.rows) b += s.rows.length ? s.rows.map(function(r, i){ const max = Math.max.apply(null, s.rows.map(function(x){ return Number(x[1]) || 0; }).concat([1])); const pct = (Number(r[1]) || 0) / max * 100; if (s.below) return kcRank(i + 1, r[0], mpRepUnit(s, r[1]), r[1], pct) + (r[2] ? '<div class="kc-note" dir="auto" style="margin:-4px 0 8px; margin-inline-start:34px;">' + escapeHtml(r[2]) + '</div>' : ''); /* r120 (قيس باللقطة): تفصيل طويل يُكتب تحت الصف ملتفًّا — في سطره كان يدفع الرقم خارج الشاشة */ return kcRank(i + 1, r[0], mpRepUnit(s, r[1]) + (s.unit && r[2] ? ' · ' : '') + (r[2] || ''), r[1], pct); }).join('') : kcEmpty(s.empty || 'Nothing to list yet', true);
    if (s.lines) b += s.lines.map(function(l){ return '<div class="kc-note">' + escapeHtml(l) + '</div>'; }).join('');
    h += kcCard(s.h, s.sub || '', b); });
  return h + '<div class="chiprow" style="margin:10px 0 0; overflow:visible; gap:6px; flex-wrap:wrap; justify-content:center;"><button type="button" class="chip on" style="flex:none;" onclick="mpRepCopy()">📋 Copy as text</button><button type="button" class="chip" style="flex:none;" onclick="mpRepImage()">🖼 Save as image</button><button type="button" class="chip" style="flex:none;" onclick="mpRepShare()">📤 Share</button></div>';
}
function mpRepUnit(s, v){ return s.unit ? (v === 1 ? s.unit[0] : s.unit[1]) : ''; } /* وحدة رقم الصف: «3 opens» لا «3» */
function mpRepText(rep){ const L = [rep.title, rep.sub || '', ''];
  (rep.sections || []).forEach(function(s){ L.push(String(s.h).toUpperCase() + (s.sub ? ' · ' + s.sub : ''));
    if (s.tiles) L.push(s.tiles.map(function(t){ return t[0] + ': ' + t[1]; }).join(' · '));
    if (s.bars) L.push(s.bars.label + ': ' + s.bars.vals.join(', ') + ' (' + s.bars.left + ' … ' + s.bars.right + ')');
    if (s.rows){ if (!s.rows.length) L.push(s.empty || 'Nothing to list yet'); s.rows.forEach(function(r, i){ L.push((i + 1) + '. ' + r[0] + ': ' + r[1] + (s.unit ? ' ' + mpRepUnit(s, r[1]) : '') + (r[2] ? ' · ' + r[2] : '')); }); }
    if (s.lines) s.lines.forEach(function(l){ L.push(l); });
    L.push(''); });
  L.push('MyPickz · mypickz.app'); return L.join('\n'); }
function mpRepOpen(rep, backFn){ const body = document.getElementById('dashBody'), bd = document.getElementById('dashBackdrop'); if (!body || !bd || !rep) return; mpRepLast = rep; dashSet('📄 ' + rep.title, backFn || null); body.innerHTML = mpRepHtml(rep); bd.classList.add('show'); }
async function mpRepCopy(){ if (!mpRepLast) return; try{ await navigator.clipboard.writeText(mpRepText(mpRepLast)); showToast('Report copied — paste it anywhere'); }catch(e){ mpErrToast('Could not copy the report', e); } }
async function mpRepShare(){ if (!mpRepLast) return; const text = mpRepText(mpRepLast); /* تقرير لا محتوى: لا حدث share_link ولا عدّ لأحد */
  if (navigator.share){ try{ await navigator.share({ title: mpRepLast.title, text: text }); return; }catch(e){ if (e && e.name === 'AbortError') return; } }
  try{ await navigator.clipboard.writeText(text); showToast('Report copied — paste it anywhere'); }catch(e){ mpErrToast('Could not share the report', e); } }
function mpRepCanvas(rep){ /* صورة التقرير من نصّه نفسه: العنوان عريض، رؤوس الأقسام بلون التمييز، والباقي أسطر ملفوفة */
  const W = 1080, P = 64, cs = getComputedStyle(document.documentElement); const C = function(v, fb){ return (cs.getPropertyValue(v) || '').trim() || fb; };
  const probe = document.createElement('canvas'); const pg = probe.getContext && probe.getContext('2d'); if (!pg) return null;
  const F = { title: '700 44px Cairo, sans-serif', sub: '500 28px Cairo, sans-serif', head: '800 26px Cairo, sans-serif', line: '500 28px Cairo, sans-serif' }; const LH = { title: 58, sub: 40, head: 44, line: 40 };
  const heads = {}; (rep.sections || []).forEach(function(s){ heads[String(s.h).toUpperCase() + (s.sub ? ' · ' + s.sub : '')] = true; });
  const out = []; mpRepText(rep).split('\n').forEach(function(l, i){ const k = i === 0 ? 'title' : i === 1 ? 'sub' : heads[l] ? 'head' : 'line'; if (!l){ out.push({ k: 'gap' }); return; } pg.font = F[k]; xcWrap(pg, l, W - P * 2, 40).forEach(function(w){ out.push({ k: k, t: w }); }); });
  const H = P * 2 + out.reduce(function(a, o){ return a + (o.k === 'gap' ? 18 : LH[o.k]); }, 0);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); if (!g) return null;
  g.fillStyle = C('--bar', C('--ink', '')); g.fillRect(0, 0, W, H); g.textBaseline = 'top'; let y = P;
  out.forEach(function(o){ if (o.k === 'gap'){ y += 18; return; } g.font = F[o.k]; g.fillStyle = o.k === 'head' ? C('--saffron', '') : o.k === 'sub' ? C('--night-3', '') : C('--on-night', ''); g.fillText(o.t, P, y); y += LH[o.k]; });
  return cv; }
async function mpRepImage(){ if (!mpRepLast) return; let cv = null; try{ if (document.fonts && document.fonts.ready) await document.fonts.ready; }catch(_){}
  try{ cv = mpRepCanvas(mpRepLast); }catch(e){ mpSwallow(e, 'report image'); } if (!cv){ showToast('Could not draw the report'); return; }
  const blob = await new Promise(function(res){ try{ cv.toBlob(res, 'image/png'); }catch(_){ res(null); } }); if (!blob){ showToast('Could not draw the report'); return; }
  const name = 'mypickz-report-' + mpDayKey() + '.png'; const file = new File([blob], name, { type: 'image/png' });
  try{ if (navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: mpRepLast.title }); return; } }catch(e){ if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); showToast('Report saved as an image'); }
function mpRepPeriod(weeks){ /* «3 – 30 Nov 2026 · 4 weeks» بأسابيع الإحصاء (الرياض): من أحد أقدمها إلى سبت آخرها */ const a = mpData.viewers.week(weeks - 1), b = new Date(+new Date(mpData.viewers.week(0) + 'T00:00:00Z') + 6 * 864e5).toISOString().slice(0, 10); return ownerDashDayLabel(a) + ' – ' + ownerDashDayLabel(b) + ' ' + b.slice(0, 4) + ' · ' + weeks + (weeks === 1 ? ' week' : ' weeks'); }
const MP_REP_DEFS = ['People — accounts, each counted once a week, whichever public list, trip or page they opened.', 'Opens — every open of a public list or trip, once per visit.', 'Bookmarks — people who bookmarked a list or trip. Copies — a whole list or trip copied into their account. Place saves — single places saved from a list.', 'Shares sent — cards, messages and itinerary pages of public content, sent by the owner or by others. Arrived by card — people who scanned a share card.', 'Day = Riyadh day (GMT+3). Week = Sunday to Saturday.'];
const MP_DASH_MIN_GATE = 10;     /* غير معايَرة: أقلّ «seen» اليوم لتُعرض نسبة التحويل */
const MP_DASH_MIN_SESSIONS = 20; /* غير معايَرة: أقلّ جلسات الأسبوع ليُعرض متوسط المدة والعمق */
const MP_DASH_MIN_PULSE = 20;    /* غير معايَرة: أقلّ أحداث مدينة في ٧ أيام ليُرسم نبضها بالساعة */
const MP_DASH_MIN_LEGS = 10;     /* غير معايَرة: أقلّ أرجل وسيلة لتُعرض نسبتها */
let ownerDashCity = '', ownerDashLast = null;
const MP_USE_KEYS = [['community_open', 'Community opened'], ['mylist_open', 'My list opened'], ['trip_open', 'Trips opened'], ['personal_open', 'Addresses opened'], ['mylist_save', 'List saves'], ['trip_save', 'Trip saves'], ['personal_save', 'Address saves'], ['bookmark_add', 'Bookmarks added'], ['reserved_2', 'Published publicly']]; /* r120 (ق١١-٢٤-٠٩ أ): تسعة — عدّادا المشاركة خارجها (المحاولة لا تُعدّ إرسالًا، و«Shares sent» للحساب) */
const MP_USE_DEF = 'App usage — actions, not people: one active account can raise them. Opened: the Community, Trips and Addresses tabs, and My list once per city in a session. Saves: each save of a list, a trip (your own, or one you keep) or an address. Published publicly: a list or trip made public.';
const MP_TAG_DEF = 'Tagged links — the kind of link a visitor arrived by: a user’s list, a curator’s page, a trip, Community, or an App link — the app’s own link or QR, not a list or a trip.'; /* r120 (ق١١-٢٤-١٠): «The app» صار «App link» بتعريفه */
const MP_TAG_KEYS = [['src_ulist', 'A user list'], ['src_curator', 'A curator'], ['src_trip', 'A trip'], ['src_app', 'App link'], ['src_community', 'Community']];
function ownerDashDays(n){ /* r120 (ع٥-٧ · ٨ · ١٠): يوم واحد لكل اللوحة — يوم الرياض. كان النشاط بيوم UTC والأحداث بيوم الجهاز */ const out = []; for (let i = n - 1; i >= 0; i--) out.push(mpDayKey(Date.now() - i * 86400000)); return out; } /* الأقدم أولًا، واليوم آخرًا */
function ownerDashDayLabel(day){ const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || ''); return m ? (+m[3] + ' ' + MON[+m[2] - 1]) : ''; }
function ownerDashCityName(id){ return (typeof CITY_NAMES !== 'undefined' && CITY_NAMES[id] && CITY_NAMES[id].name) || (allCities().find(function(c){ return String(c.id) === String(id); }) || {}).name || ('City ' + id); }
async function ownerDashData(fresh){
  const out = { errs: [], partial: [] }; const safe = async function(name, fn, dflt){ try{ return await fn(); }catch(e){ mpSwallow(e, 'dash ' + name); out.errs.push(name); return dflt; } };
  const u14 = ownerDashDays(14), l7 = ownerDashDays(7), u7 = u14.slice(7);
  const got = await Promise.all([ safe('activity', function(){ return mpData.dailyStats.range(u14[0], u14[13]); }, {}), safe('events', function(){ return mpData.analytics.range('events', l7[0], l7[6], 300); }, []), safe('events today', function(){ return mpData.analytics.range('events', l7[6], l7[6], 100); }, []), /* r116 (المراجعة المستقلة ٢): الاستعلام مرتَّب بالمعرّف تصاعديًّا فالسقف يُسقط أحدث الأيام أولًا — قمع اليوم يُقرأ باستعلامه وحده */ safe('hours', function(){ return mpData.analytics.range('hours', l7[0], l7[6], 200); }, []), safe('sources', function(){ return mpData.analytics.range('sources', l7[0], l7[6], 100); }, []), safe('sessions', function(){ return mpData.analytics.range('sessions', l7[0], l7[6], 100); }, []),
    (!fresh && allUsersCache && allUsersCache.length) ? Promise.resolve(allUsersCache) : safe('users', async function(){ allUsersCache = await mpData.users.all(); return allUsersCache; }, []) ]);
  const daily = got[0], events = got[1], eventsToday = got[2], hours = got[3], sources = got[4], sessions = got[5], users = got[6] || [];
  [['events', events], ['events today', eventsToday], ['hours', hours], ['sources', sources], ['sessions', sessions]].forEach(function(x){ if (x[1] && x[1].partial) out.partial.push(x[0]); });
  const num = function(o, k){ return (o && typeof o[k] === 'number') ? o[k] : 0; }; const sumRows = function(rows, pick){ const s = {}; (rows || []).forEach(function(r){ if (pick && !pick(r)) return; Object.keys(r.data).forEach(function(k){ if (typeof r.data[k] === 'number') s[k] = (s[k] || 0) + r.data[k]; }); }); return s; };
  /* النشط والجديد */
  const act = u14.map(function(d){ return num(daily[d], 'activeToday'); }), neu = u14.map(function(d){ return num(daily[d], 'newSignupsToday'); }); const now = Date.now(); const sum = function(a){ return a.reduce(function(x, y){ return x + y; }, 0); };
  out.active = { days: u14, perDay: act, today: users.filter(function(u){ return u.lastActiveDay === u14[13]; }).length, dToday: null, /* r120 (ق١١-١٤-٠٢ · ع-٧): «اليوم» من سجلات المستخدمين كالأسبوع والشهر (حساب = واحد) — كان من dailyStats (عدّاد مفتوح) فقد يفوق الأسبوع. لا فرق عن أمس: السجل يحمل آخر يوم وحده */ d7: users.filter(function(u){ return u.lastSeen && now - u.lastSeen <= 7 * 86400000; }).length, d30: users.filter(function(u){ return u.lastSeen && now - u.lastSeen <= 30 * 86400000; }).length, newToday: neu[13], dNew: neu[13] - neu[12], new7: sum(neu.slice(7)), dNew7: sum(neu.slice(7)) - sum(neu.slice(0, 7)), any: sum(act) + sum(neu) > 0 };
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
  out.use = MP_USE_KEYS.map(function(x){ return [x[1], num(ev7, x[0])]; }); /* r120 (ق١١-٢٤-٠٩ أ): عدّادات استعمال التطبيق — من أحداث السبعة أيام المقروءة أصلًا، بلا قراءة */
  /* المشاركون: كم سجلًّا جديدًا حمل رمز كل مشارك (refBy — رمز مستعار) */
  const sh = {}; users.forEach(function(u){ const c = u && u.refBy; if (typeof c === 'string' && /^[a-z0-9]{6,16}$/i.test(c)) sh[c] = (sh[c] || 0) + 1; }); out.sharers = Object.keys(sh).map(function(k){ return { code: k, n: sh[k] }; }).sort(function(a, b){ return (b.n - a.n) || a.code.localeCompare(b.code); }).slice(0, 5);
  out.acc = await safe('accounts', function(){ return ownerAccData(fresh); }, null); /* r120 (ق١١-٢٤-٠٨): الإجمالي مجموع أرقام الحسابات */
  out.legs = mpLegCalSummary(); out.at = Date.now(); return out;
}
function ownerDashHtml(d){
  const s = function(n, one, many){ return n + ' ' + (n === 1 ? one : (many || one + 's')); }; let h = '';
  if (d.partial.length) h += '<div class="warnline">⚠️ <span><b>Partial numbers</b><br>' + escapeHtml(d.partial.join(' · ')) + ' reached the read cap — the oldest days are counted first, so 7-day totals are a floor. Today’s gate is read on its own.</span></div>'; /* r116 (المراجعة ٢): في أعلى اللوحة لا في ذيلها */
  if (d.errs.length) h += '<div class="warnline">⚠️ <span><b>Some numbers could not be read</b><br>' + escapeHtml(d.errs.join(' · ')) + ' — the cards below show what did load.</span></div>';
  /* اليوم */
  const a = d.active; h += '<div class="gsec">Today</div>' + kpRow([kpTile('Active today', a.today, a.dToday, 'hero'), kpTile('7 days', a.d7), kpTile('30 days', a.d30)]) + kpRow([kpTile('New sign-ups today', a.newToday, a.dNew), kpTile('Sign-ups · 7 days', a.new7, a.dNew7)], 'two');
  h += kcCard('Activity per day' /* r120 (ع-٧): عدّاد اليوم المفتوح — «نشاط» لا «نشطون»: البلاطات فوقه تعدّ الحسابات من سجلاتها */, 'last 14 days · peak ' + Math.max.apply(null, a.perDay), a.any ? kcBars(a.perDay, ownerDashDayLabel(a.days[0]), ownerDashDayLabel(a.days[13]) + ' · today') : kcEmpty('No activity recorded in the last 14 days'));
  h += '<div class="gsec">Accounts</div>' + ownerAccCard(d.acc); /* r120 (ق١١-٢٤-٠٨): مبدأ المستويين — الإجمالي هنا والحساب الواحد من جدوله */
  /* القمعان */
  const g = d.gate; const gOk = g.seen >= MP_DASH_MIN_GATE; const pct = g.seen ? Math.round(g.done / g.seen * 100) : 0;
  h += '<div class="gsec">Funnels</div>' + kcCard('Gate', 'today', (g.seen || g.started || g.done) ? ('<div class="kc-big">' + kcRing(gOk ? pct : 0, gOk ? pct + '%' : '—') + kcFunnel([['Seen', g.seen], ['Started', g.started], ['Signed up', g.done]]) + '</div><div class="kc-note">' + (gOk ? 'A floor — “seen” counts a device once a day' : 'The rate shows from ' + MP_DASH_MIN_GATE + ' devices seen in a day') + '</div>') : kcEmpty('No device has seen the gate today'), '');
  const im = d.imp; const sg = im.kept + im.changed; h += kcCard('Import', 'last 7 days', (im.runs || im.places) ? (kc2([im.runs, im.runs === 1 ? 'run' : 'runs'], [im.places, 'places brought in']) + (sg ? kcSplit([['Suggestions kept', im.kept, Math.round(im.kept / sg * 100) + '%'], ['changed', im.changed, Math.round(im.changed / sg * 100) + '%']]) : '<div class="kc-note">No category suggestion confirmed yet</div>')) : kcEmpty('No import in the last 7 days'));
  /* المدن */
  const cs = d.cities; const maxO = Math.max.apply(null, cs.map(function(c){ return c.open; }).concat([1]));
  h += '<div class="gsec">Cities · last 7 days</div>' + kcCard('Busiest cities', 'opens', cs.length ? cs.map(function(c, i){ return kcRank(i + 1, c.name, s(c.added, 'place') + ' · ' + s(c.trips, 'trip'), c.open, c.open / maxO * 100); }).join('') : kcEmpty('No city activity in the last 7 days'));
  if (cs.length){ const pick = cs.find(function(c){ return c.id === ownerDashCity; }) || cs.slice().sort(function(x, y){ return y.total - x.total; })[0]; const peak = pick.h.indexOf(Math.max.apply(null, pick.h)); const okP = pick.total >= MP_DASH_MIN_PULSE;
    h += kcCard('City pulse by hour', pick.name + (okP ? ' · peak ' + String(peak).padStart(2, '0') + ':00' : ''), (cs.length > 1 ? '<div class="kchips">' + cs.map(function(c){ return '<button type="button" class="chip' + (c.id === pick.id ? ' on' : '') + '" onclick="ownerDashPickCity(\'' + attrStr(c.id) + '\')">' + escapeHtml(c.name) + '</button>'; }).join('') + '</div>' : '') + (okP ? kcBars(pick.h, '00', '23').replace(' class="today"', ' class=""') : kcEmpty('Not enough data yet — fewer than ' + MP_DASH_MIN_PULSE + ' actions here this week')), ''); }
  /* المصادر */
  const sr = d.src; const n = function(k){ return sr[k] || 0; }; const types = [['A user list', n('src_ulist')], ['A curator', n('src_curator')], ['A trip', n('src_trip')], ['App link', n('src_app')], ['Community', n('src_community')]].filter(function(x){ return x[1] > 0; }); const tagged = types.reduce(function(x, y){ return x + y[1]; }, 0); const social = n('ref_ig') + n('ref_tt') + n('ref_sc'); const anySrc = tagged + n('ref_qr') + n('ref_link') + n('ref_direct') + n('ref_card') + social > 0;
  h += '<div class="gsec">Where visitors come from</div>' + kcCard('Sources', 'last 7 days' + (tagged ? ' · ' + tagged + ' tagged' : ''), anySrc ? ((types.length ? kcSplit(types) + (n('src_app') ? '<div class="kc-note">App link — the app’s own link or QR, not a list or a trip.</div>' : '') : '<div class="kc-note">No tagged link opened yet</div>') + kpRow([kpTile('By QR', n('ref_qr'), null, 'soft'), kpTile('By link', n('ref_link'), null, 'soft'), kpTile('Direct', n('ref_direct'), null, 'soft')], 'in') + ((social || n('ref_card')) ? kpRow([kpTile('Social', social, null, 'soft'), kpTile('Share card', n('ref_card'), null, 'soft')], 'two in') : '')) : kcEmpty('No visit source recorded in the last 7 days'));
  const sh = d.sharers; h += kcCard('Sharers', 'sign-ups brought', sh.length ? sh.map(function(x, i){ return kcRank(i + 1, x.code, 'code', x.n, x.n / sh[0].n * 100); }).join('') : kcEmpty('No sign-up carried a sharer code yet'));
  /* r120 (ق١١-٢٤-٠٩ أ): استعمال التطبيق */
  const us = d.use || []; h += '<div class="gsec">App usage</div>' + kcCard('What accounts did in the app', 'last 7 days · actions, not people', us.some(function(x){ return x[1] > 0; }) ? ('<div class="kc-note" style="margin:0 0 4px;"><b>Opened</b></div>' + kpRow(us.slice(0, 2).map(function(x){ return kpTile(x[0].replace(' opened', ''), x[1], null, 'soft'); }), 'two') + kpRow(us.slice(2, 4).map(function(x){ return kpTile(x[0].replace(' opened', ''), x[1], null, 'soft'); }), 'two') + '<div class="kc-note" style="margin:0 0 4px;"><b>Saved</b></div>' + kpRow(us.slice(4, 7).map(function(x){ return kpTile(x[0], x[1], null, 'soft'); }), 'kp-wrap') + kpRow(us.slice(7, 9).map(function(x){ return kpTile(x[0], x[1], null, 'soft'); }), 'two') + '<div class="kc-note">Actions, not people — one active account can raise them. Shares are counted per account as “Shares sent”.</div>') : kcEmpty('No app usage recorded in the last 7 days'));
  /* الجلسات */
  const se = d.sess; const okS = se.n >= MP_DASH_MIN_SESSIONS; const avg = se.n ? Math.round(se.seconds / se.n) : 0;
  h += '<div class="gsec">Sessions</div>' + kcCard('Depth and length', okS ? 'last 7 days · ' + se.n + ' sessions' : '', okS ? kc2([Math.floor(avg / 60) + ':' + String(avg % 60).padStart(2, '0'), 'average length'], [(se.depth / se.n).toFixed(1), 'actions per session']) : kcEmpty('Not enough data yet — fewer than ' + MP_DASH_MIN_SESSIONS + ' sessions this week' + (se.n ? ' (' + se.n + ')' : '')), '');
  /* معايرة الأرجل — هذا الجهاز */
  const lg = d.legs; h += '<div class="gsec">Calibration</div>' + kcCard('Leg estimates', 'typed ÷ estimate', (lg.length ? lg.map(function(m){ const nm = ({ walk: 'Walk', transit: 'Transit', car: 'Car' })[m.mode] || m.label; return m.n >= MP_DASH_MIN_LEGS ? kcGauge(nm, s(m.n, 'leg'), m.ratio) : kcEmpty(nm + ' — ' + s(m.n, 'leg') + ' · not enough data yet — shows from ' + MP_DASH_MIN_LEGS + ' legs', true); }).join('') : kcEmpty('No leg minutes typed over an estimate on this device yet')) + '<div class="kc-note">From this device only — minutes you typed over our estimate. 1.00 means the estimate was exact; above it, the real leg took longer.</div>', ''); /* r120 (ع٥-١ · ق١١-١٨-٢٣ ٩): «not calibrated» أُزيلت من لوحات المالك أيضًا — جملة العتبة في كل بطاقة تبقى */
  return h;
}
async function openOwnerDashboard(fresh){ /* r120 (ع-٧ · المراجعة المستقلة ٣): ↻ Refresh يعيد قراءة سجلات المستخدمين — «Active today» منها، وذاكرة الجلسة تشيخ */
  if (!isOwner) return; const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return; ownerAccView = 'dash';
  dashSet('📊 Owner dashboard', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading the numbers…</div>'; bd.classList.add('show');
  try{ ownerDashLast = await ownerDashData(fresh === true); ownerDashPaint(); }catch(e){ mpSwallow(e, 'owner dashboard'); body.innerHTML = '<div class="mp-empty mini">Could not load the dashboard — ' + escapeHtml(mpErrText(e)) + '</div><button type="button" class="dash-door" onclick="openOwnerDashboard()"><span>↻ Retry</span><span></span></button>'; }
}
function ownerDashPaint(){ const body = document.getElementById('dashBody'); if (!body || !ownerDashLast) return; body.innerHTML = '<button type="button" class="btn btn-ghost wide" style="margin:0 0 10px;" onclick="openOwnerDashboard(true)">↻ Refresh</button><button type="button" class="dash-door" style="margin:0 0 10px;" onclick="openAppReport()"><span>📄 App report</span><span>these numbers · export ›</span></button>' + '<div class="kc-note kn-out" style="text-align:center; margin:0 2px 8px;">' + mpDayNote() + ' · hours are Riyadh time · hours and sessions are counted for the whole app, not per account.</div>' + ownerDashHtml(ownerDashLast); } /* r120 (ق١١-١٨-٢٠ · ٢٥ ح) */
function ownerAppRep(d){ /* r120 (ق١١-٢٤-٠٤): تقرير التطبيق — من بيانات لوحة المالك المحمَّلة نفسها */ const a = d.active, g = d.gate, im = d.imp, sr = d.src, se = d.sess; const n = function(k){ return sr[k] || 0; };
  const secs = [{ h: 'Active accounts', sub: 'each account once', tiles: [['Today', a.today], ['7 days', a.d7], ['30 days', a.d30]], bars: { label: 'Active accounts per day — last 14 days', vals: a.perDay, left: ownerDashDayLabel(a.days[0]), right: ownerDashDayLabel(a.days[13]) + ' · today' } },
    { h: 'Sign-ups', tiles: [['Today', a.newToday], ['7 days', a.new7]] },
    { h: 'Gate', sub: 'today', tiles: [['Seen', g.seen], ['Started', g.started], ['Signed up', g.done]], lines: [g.seen >= MP_DASH_MIN_GATE ? 'Signed up ÷ seen: ' + Math.round(g.done / g.seen * 100) + '% — a floor; a device is counted once a day.' : 'The rate shows from ' + MP_DASH_MIN_GATE + ' devices seen in a day.'] },
    { h: 'Import', sub: 'last 7 days', tiles: [['Runs', im.runs], ['Places brought in', im.places]] },
    { h: 'Busiest cities', sub: 'last 7 days', unit: ['open', 'opens'], rows: d.cities.map(function(c){ return [c.name, c.open, c.added + (c.added === 1 ? ' place added' : ' places added') + ' · ' + c.trips + (c.trips === 1 ? ' trip built' : ' trips built')]; }), empty: 'No city activity in the last 7 days' },
    { h: 'Where visitors come from', sub: 'last 7 days', tiles: [['By QR', n('ref_qr')], ['By link', n('ref_link')], ['Direct', n('ref_direct')], ['Social', n('ref_ig') + n('ref_tt') + n('ref_sc')], ['Share card', n('ref_card')]] },
    { h: 'Tagged links opened', sub: 'last 7 days', tiles: MP_TAG_KEYS.map(function(x){ return [x[1], n(x[0])]; }) },
    { h: 'Sharers', sub: 'sign-ups brought', unit: ['sign-up', 'sign-ups'], rows: (d.sharers || []).map(function(x){ return [x.code, x.n, '']; }), empty: 'No sign-up carried a sharer code yet' },
    { h: 'App usage', sub: 'last 7 days · actions, not people', tiles: d.use || [] }, /* r120 (ق١١-٢٤-٠٩): التقرير يحمل ما على لوحته — إلا ما سُمّي في تعريفاته */
    { h: 'Sessions', sub: 'last 7 days · whole app', tiles: se.n >= MP_DASH_MIN_SESSIONS ? [['Sessions', se.n], ['Average minutes', (se.seconds / se.n / 60).toFixed(1)], ['Actions per session', (se.depth / se.n).toFixed(1)]] : [['Sessions', se.n]], lines: se.n >= MP_DASH_MIN_SESSIONS ? [] : ['Averages show from ' + MP_DASH_MIN_SESSIONS + ' sessions in the week.'] },
    { h: 'Definitions', lines: (d.acc ? [OWNER_ACC_DEFS[0]] : []).concat(['Active — accounts seen in the period, each counted once.', 'Gate — a device that saw the sign-in gate, counted once a day; “signed up” is the same day.', 'Busiest cities — opens of a city in My places; places added and trips built there.', MP_TAG_DEF, MP_USE_DEF, 'Hours and sessions are counted for the whole app, not per account.', 'On the dashboard screen only: City pulse by hour, import suggestions and leg estimates (this device).', 'Day = Riyadh day (GMT+3). Week = Sunday to Saturday.']) }];
  if (d.acc) Array.prototype.splice.apply(secs, [2, 0].concat(ownerAccSecs(d.acc))); /* r120 (ق١١-٢٤-٠٨): الإجمالي في تقرير التطبيق بعد Sign-ups */
  if (d.partial.length || d.errs.length) secs.unshift({ h: 'Read this first', lines: [(d.partial.length ? 'Partial numbers: ' + d.partial.join(' · ') + ' reached the read cap — 7-day totals are a floor. ' : '') + (d.errs.length ? 'Could not be read: ' + d.errs.join(' · ') + '.' : '')] });
  return { title: 'MyPickz — app report', sub: ownerDashDayLabel(a.days[0]) + ' – ' + ownerDashDayLabel(a.days[13]) + ' ' + a.days[13].slice(0, 4) + ' · read ' + mpDayKey(d.at), sections: secs }; }
function openAppReport(){ if (!isOwner || !ownerDashLast) return; mpRepOpen(ownerAppRep(ownerDashLast), function(){ openOwnerDashboard(); }); }
/* ═══ r120 (ق١١-٢٤-٠٨): لوحة المالك — الحسابات والإجمالي. الإجمالي مجموع أرقام الحسابات نفسها «all time» عن محتواها العام (ق١١-٢٤-٠١ ٢)؛
   المصدر ثلاثة استعلامات (القوائم العامة · الرحلات العامة · الملفات العامة) بلا قصّ، بذاكرة عشر دقائق؛ وPlace saves وArrived by card والأبواب بزر عند الطلب (مستندان لكل قائمة ومستند لكل رحلة). ═══ */
let ownerAccLast = null, ownerAccSort = 'opens', ownerAccShown = 50, ownerAccView = 'dash'; const OWNER_ACC_TTL = 10 * 60 * 1000;
const OWNER_ACC_COLS = [['opens', 'Opens'], ['bm', 'Bookmarks'], ['copies', 'Copies'], ['fol', 'Followers']];
async function ownerAccData(fresh){ if (!fresh && ownerAccLast && Date.now() - ownerAccLast.at < OWNER_ACC_TTL) return ownerAccLast;
  const got = await Promise.all([mpData.cityLists.publicAll(), mpData.trips.publicAll(), cmMarketGet('users')]); const lists = got[0] || [], trips = got[1] || [], profs = got[2] || [];
  const by = {}; const N = function(v){ return Number(v) || 0; }; const row = function(uid){ return by[uid] = by[uid] || { uid: uid, name: '', role: 'Member', lists: [], trips: [], nLists: 0, nTrips: 0, nPlans: 0, opens: 0, bm: 0, copies: 0, fol: 0 }; };
  lists.forEach(function(l){ if (!l || !l.ownerId) return; const r = row(l.ownerId); r.lists.push({ id: l.id, cityId: l.cityId }); r.nLists++; r.opens += N(l.viewCount); r.bm += N(l.bookmarkCount); r.copies += N(l.copyCount); /* الاسم من الملف العام المتحقَّق منه (r118-و) لا من حقل القائمة الذي يكتبه صاحبها */ });
  trips.forEach(function(t){ if (!t || !t.ownerId) return; const r = row(t.ownerId); r.trips.push(t.id); if (t.dayPlan === true) r.nPlans++; else r.nTrips++; r.opens += N(t.viewCount); r.bm += N(t.saveCount); r.copies += N(t.copyCount); });
  profs.forEach(function(p){ const r = by[p.id], d = p.data || {}; if (!r) return; /* ملف عام بلا قائمة ولا رحلة عامة الآن: لا صف له */ if (typeof d.nickname === 'string' && d.nickname) r.name = d.nickname; if (d.verified === true) r.role = 'Curator'; r.fol = N(d.followerCount); });
  const rows = Object.keys(by).map(function(k){ const r = by[k]; if (!r.name) r.name = adminName(r.uid, null); return r; }); const sum = function(k){ return rows.reduce(function(a, r){ return a + r[k]; }, 0); };
  ownerAccLast = { at: Date.now(), rows: rows, tot: { accounts: rows.length, lists: sum('nLists'), trips: sum('nTrips'), plans: sum('nPlans'), opens: sum('opens'), bm: sum('bm'), copies: sum('copies'), fol: sum('fol') }, docs: lists.length + trips.length + profs.length, moreDocs: 2 * lists.length + trips.length, more: null, busy: false }; return ownerAccLast; }
async function ownerAccMore(){ /* ق١١-٢٤-٠٨ أ: عند الطلب — لكل قائمة عامة مستندان (stats_lists · stats_cards) ولكل رحلة عامة مستند بطاقتها */ const a = ownerAccLast; if (!isOwner || !a || a.busy || a.more) return; a.busy = true; ownerAccRepaint();
  const N = function(v){ return Number(v) || 0; }; const more = { saves: 0, arr: 0, doors: [0, 0, 0], docs: 0 };
  try{ const per = await Promise.all(a.rows.map(async function(r){ const o = { saves: 0, arr: 0, doors: [0, 0, 0], docs: 0 };
      await Promise.all(r.lists.map(async function(l){ const g = await Promise.all([mpData.stats.listDoc(l.id), mpData.stats._get('stats_cards', r.uid + '__l_' + l.cityId)]); o.docs += 2; const s = g[0] || {}, c = g[1] || {}; o.saves += N(s.copy_from); o.arr += N(c.view_total); o.doors[0] += N(s.open_community); o.doors[1] += N(s.open_app); o.doors[2] += N(s.open_curator); }));
      await Promise.all(r.trips.map(async function(id){ const c = await mpData.stats._get('stats_cards', r.uid + '__t_' + id); o.docs++; o.arr += N((c || {}).view_total); })); return o; }));
    if (a !== ownerAccLast) return; /* ↻ Refresh أثناء التحميل: هذه الأرقام لصفوف أقدم */
    per.forEach(function(o, i){ a.rows[i].saves = o.saves; a.rows[i].arr = o.arr; more.saves += o.saves; more.arr += o.arr; more.docs += o.docs; for (let k = 0; k < 3; k++) more.doors[k] += o.doors[k]; }); a.more = more;
  }catch(e){ mpSwallow(e, 'accounts more'); mpErrToast('Could not load the rest', e); /* لا أرقام ناقصة تُعرض مجموعًا */ }
  a.busy = false; ownerAccRepaint(); }
function ownerAccRepaint(){ if (ownerAccView === 'table') ownerAccPaint(); else ownerDashPaint(); }
function ownerAccMoreHtml(a){ if (a.more) return kpRow([kpTile('Place saves', a.more.saves, null, 'soft'), kpTile('Arrived by card', a.more.arr, null, 'soft')], 'two') + '<div class="kc-note" style="margin:0 0 4px;"><b>Opened from</b> · public lists · all time</div>' + kpRow([kpTile('Community', a.more.doors[0], null, 'soft'), kpTile('Shared link', a.more.doors[1], null, 'soft'), kpTile('Curator page', a.more.doors[2], null, 'soft')], 'kp-wrap') + '<div class="kc-note">Read ' + a.more.docs + (a.more.docs === 1 ? ' doc' : ' docs') + ' for these.</div>';
  if (!a.moreDocs) return ''; return '<button type="button" class="dash-door" style="margin:6px 0 0;" onclick="ownerAccMore()"' + (a.busy ? ' disabled' : '') + '><span>' + (a.busy ? 'Loading…' : 'Load place saves, card arrivals and doors') + '</span><span>reads ' + a.moreDocs + (a.moreDocs === 1 ? ' doc' : ' docs') + ' ›</span></button>'; }
function ownerAccCard(a){ if (!a) return kcCard('All accounts', 'all time', kcEmpty('Could not read the accounts this time', true));
  const t = a.tot; return kcCard('All accounts', 'public content · all time', kpRow([kpTile('Accounts', t.accounts, null, 'soft'), kpTile('Public lists', t.lists, null, 'soft')], 'two') + kpRow([kpTile('Public trips', t.trips, null, 'soft'), kpTile('Public day plans', t.plans, null, 'soft')], 'two')
    + kpRow([kpTile('Opens', t.opens), kpTile('Bookmarks', t.bm), kpTile('Copies', t.copies)], 'kp-wrap') + kpRow([kpTile('Followers', t.fol, null, 'soft')], 'two') + ownerAccMoreHtml(a)
    + '<div class="kc-note">The sum of the accounts’ own numbers — the same numbers each account sees in its dashboard, for public lists, trips and day plans. People, Shares sent and New followers are per period: open an account to see them.</div>'
    + '<button type="button" class="dash-door" style="margin:8px 0 0;" onclick="openOwnerAccounts()"><span>👥 Accounts</span><span>' + t.accounts + ' · each account’s numbers ›</span></button>'
    + '<div class="kc-note">Read ' + a.docs + (a.docs === 1 ? ' doc' : ' docs') + ' · kept 10 minutes · ↻ Refresh reads again.</div>'); }
function ownerAccSecs(a){ /* أقسام التقرير: الإجمالي نفسه الذي على الشاشة */ const t = a.tot; const secs = [{ h: 'All accounts', sub: 'public content · all time', tiles: [['Accounts', t.accounts], ['Public lists', t.lists], ['Public trips', t.trips], ['Public day plans', t.plans], ['Opens', t.opens], ['Bookmarks', t.bm], ['Copies', t.copies], ['Followers', t.fol]].concat(a.more ? [['Place saves', a.more.saves], ['Arrived by card', a.more.arr]] : []), lines: a.more ? [] : ['Place saves, Arrived by card and Opened from are loaded on request in the owner dashboard.'] }];
  if (a.more) secs.push({ h: 'Opened from', sub: 'public lists · all time', tiles: [['Community', a.more.doors[0]], ['Shared link', a.more.doors[1]], ['Curator page', a.more.doors[2]]], lines: MS_DOOR_DEFS }); return secs; }
const OWNER_ACC_DEFS = ['All accounts — the sum of the accounts’ own all-time numbers, for public lists, trips and day plans. Private content is not counted.', 'Opens — every open of a public list or trip, once per visit. Bookmarks — people who bookmarked a list or trip. Copies — a whole list or trip copied into their account.', 'Followers — people following the account. Curator — a page verified by the app owner; Member — any other account.'];
function ownerAccSorted(a){ const k = ownerAccSort; return a.rows.slice().sort(function(x, y){ return (y[k] - x[k]) || (y.opens - x.opens) || mpByName(x, y); }); }
function ownerAccContent(r){ const p = []; if (r.nLists) p.push(r.nLists + (r.nLists === 1 ? ' list' : ' lists')); if (r.nTrips) p.push(r.nTrips + (r.nTrips === 1 ? ' trip' : ' trips')); if (r.nPlans) p.push(r.nPlans + (r.nPlans === 1 ? ' day plan' : ' day plans')); return p.join(' · '); }
function ownerAccNums(r, more){ return 'Opens ' + r.opens + ' · Bookmarks ' + r.bm + ' · Copies ' + r.copies + ' · Followers ' + r.fol + (more ? ' · Place saves ' + (r.saves || 0) + ' · Arrived by card ' + (r.arr || 0) : ''); }
function openOwnerAccounts(){ if (!isOwner || !ownerDashLast || !ownerDashLast.acc) return; ownerAccView = 'table'; dashSet('👥 Accounts', function(){ openOwnerDashboard(); }); ownerAccPaint(); }
function ownerAccPick(k){ ownerAccSort = k; ownerAccShown = 50; ownerAccPaint(); }
function ownerAccShowMore(){ ownerAccShown += 50; ownerAccPaint(); }
function ownerAccPaint(){ const body = document.getElementById('dashBody'), a = ownerAccLast; if (!body || !a) return; const rows = ownerAccSorted(a);
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>' + a.tot.accounts + '</b> ' + (a.tot.accounts === 1 ? 'account' : 'accounts') + ' with public content · all time</div>'
    + '<div class="chiprow" style="flex-wrap:wrap;">' + OWNER_ACC_COLS.map(function(c){ return '<button type="button" class="chip' + (ownerAccSort === c[0] ? ' on' : '') + '" onclick="ownerAccPick(\'' + c[0] + '\')">' + c[1] + '</button>'; }).join('') + '</div>'
    + (rows.length ? rows.slice(0, ownerAccShown).map(function(r, i){ return '<button type="button" class="dash-door" style="display:block; text-align:start;" onclick="openMyStats(\'' + attrStr(r.uid) + '\', function(){ openOwnerAccounts(); })"><span style="display:flex; justify-content:space-between; gap:8px;"><b dir="auto" style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (i + 1) + '. ' + escapeHtml(r.name) + '</b><span style="flex:none;">' + r.role + ' ›</span></span><span class="kc-note kn-out" style="display:block; margin:4px 0 0;">' + ownerAccNums(r, !!a.more) + '</span><span class="kc-note kn-out" style="display:block; margin:2px 0 0;">' + ownerAccContent(r) + '</span></button>'; }).join('') + (rows.length > ownerAccShown ? '<button type="button" class="btn btn-ghost wide" style="margin:8px 0 0;" onclick="ownerAccShowMore()">Show more · ' + (rows.length - ownerAccShown) + ' left</button>' : '') : '<div class="mp-empty mini">No account has public content yet</div>')
    + ((a.more || a.moreDocs) ? kcCard('All accounts — the rest', 'all time', ownerAccMoreHtml(a)) : '') /* قيس باللقطة: خارج بطاقة كانت الملاحظات على الخلفية الداكنة لا تُقرأ */ + '<button type="button" class="dash-door" style="margin:10px 0 0;" onclick="openAccountsReport()"><span>📄 Accounts report</span><span>export ›</span></button>'
    + '<div class="kc-note kn-out" style="text-align:center; margin:8px 2px 0;">Tap an account for its dashboard and its report · only accounts with public content now are listed.</div>'; }
function openAccountsReport(){ const a = ownerAccLast; if (!isOwner || !a) return; const prev = ownerAccSort; ownerAccSort = 'opens'; const rows = ownerAccSorted(a); ownerAccSort = prev;
  mpRepOpen({ title: 'MyPickz — accounts report', sub: 'all time · read ' + mpDayKey(a.at), sections: ownerAccSecs(a).concat([{ h: 'Accounts', sub: 'by opens · all time', unit: ['open', 'opens'], below: true, rows: rows.map(function(r){ return [r.name, r.opens, 'Bookmarks ' + r.bm + ' · Copies ' + r.copies + ' · Followers ' + r.fol + (a.more ? ' · Place saves ' + (r.saves || 0) + ' · Arrived by card ' + (r.arr || 0) : '') + ' · ' + r.role]; }), empty: 'No account has public content yet' }, { h: 'Definitions', lines: OWNER_ACC_DEFS }]) }, function(){ openOwnerAccounts(); }); }
function ownerDashPickCity(id){ ownerDashCity = id; ownerDashPaint(); }

function mpCardHtml(dot, title, cardLines){ /* ب-٢-٢-ب: بطاقة بصنف واحد بدل الأنماط الداخلية */
  return '<div class="admcard"><div class="pn">' + dot + ' ' + escapeHtml(title) + '</div>' + cardLines.map(l => '<div class="pl-sub">' + escapeHtml(l) + '</div>').join('') + '</div>';
}
async function renderMpErrorsCard(){
  try{
    const id = 'errors_' + mpDayKey(); /* r120: يوم الإحصاء الواحد (الرياض) — كان يوم الجهاز */
    const d = await mpData.analytics.getDoc(id);
    const total = d ? (d.total || 0) : 0;
    const rows = d ? ['TypeError','ReferenceError','SyntaxError','NetworkError','UnhandledRejection','Other'].filter(k => d[k]).map(k => k + ': ' + d[k]) : [];
    const dot = total === 0 ? '🟢' : (total < 10 ? '🟡' : '🔴');
    return mpCardHtml(dot, 'Field errors today: ' + total, rows.length ? rows : ['No errors recorded today.']);
  }catch(e){ return mpCardHtml('⚪', 'Field errors: unavailable', ['Could not read analytics/errors.']); }
}
async function renderMpEventsCard(){
  try{
    const prefix = 'events_' + mpDayKey() + '__'; /* r120: يوم الإحصاء الواحد (الرياض) */
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
  tiles.innerHTML = tile(visitCount === null ? '…' : visitCount, 'visits') + tile(d.total, 'registered') + tile(d.publicCount, 'public · ' + d.pct + '%') + tile(d.curatorSet.size, msUnit(d.curatorSet.size, 'curator')) + tile(d.active7, 'active 7d') + tile(d.active30, 'active 30d') + tile(d.usedCityList, 'Saved a place') + tile(d.usedBookmarks, 'Bookmarked');
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
    return '<button type="button" class="row rowblock urow" onclick="openAdminUserCard(\'' + attrStr(u.uid) + '\')"><div class="pn">' + (u.nickname ? escapeHtml(u.nickname) : '<span class="dim">(no nickname yet)</span>') + '</div><div class="pl-sub">' + escapeHtml(u.email || '') + '</div><div class="ubadges">' + badges + '</div></button>';
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


