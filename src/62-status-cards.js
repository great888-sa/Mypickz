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
    const top = Object.keys(sums).sort((a,b) => sums[b] - sums[a]).slice(0,6).map(k => k + ': ' + sums[k]);
    return mpCardHtml(top.length ? '🟢' : '⚪', 'Events today (' + snap.size + ' doc' + (snap.size === 1 ? '' : 's') + ')', top.length ? top : ['No events recorded yet today.']);
  }catch(e){ return mpCardHtml('⚪', 'Events: unavailable', ['Could not read analytics/events.']); }
}

function adminStatsData(){
  const total = allUsersCache.length; const publicSet = new Set(communityUsers.map(u => u.uid)); const publicCount = communityUsers.length;
  const pct = total ? Math.round((publicCount / total) * 100) : 0; const now = Date.now();
  return { total: total, publicSet: publicSet, publicCount: publicCount, pct: pct,
    active7: allUsersCache.filter(u => u.lastSeen && (now - u.lastSeen) <= 7*24*60*60*1000).length,
    active30: allUsersCache.filter(u => u.lastSeen && (now - u.lastSeen) <= 30*24*60*60*1000).length,
    usedMyList: allUsersCache.filter(u => u.hasMyListActivity).length, usedBookmarks: allUsersCache.filter(u => u.hasBookmarked).length,
    curatorSet: new Set((curators || []).map(function(c){ return c.uid; })) };
}
function renderAdminStats(){ // ر٧٢-أ-١ (إعادة البناء): بلاطات ٢×٣ + سطر تكميلي
  const d = adminStatsData(); const tiles = document.getElementById('adminTiles'); if (!tiles) return;
  const tile = function(v, l){ return '<div class="admtile"><b>' + v + '</b><span>' + l + '</span></div>'; };
  tiles.innerHTML = tile(visitCount === null ? '…' : visitCount, 'visits') + tile(d.total, 'registered') + tile(d.publicCount, 'public · ' + d.pct + '%') + tile(d.curatorSet.size, 'curators') + tile(d.active7, 'active 7d') + tile(d.active30, 'active 30d');
  const line = document.getElementById('adminLine'); if (line) line.textContent = 'Used My List ' + d.usedMyList + ' · Bookmarked something ' + d.usedBookmarks;
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
  const usedMyList = allUsersCache.filter(u => u.hasMyListActivity).length;
  const usedBookmarks = allUsersCache.filter(u => u.hasBookmarked).length;
  const suspendedCount = allUsersCache.filter(u => u.suspended).length;
  const curatorsCount = (curators || []).length;
  const pct = (n) => total ? Math.round((n/total)*100) : 0; const when = new Date();
  usersReportText = [
    'MyPickz — Users Report', 'Generated: ' + when.toLocaleString(), '',
    'Total page visits: ' + (visitCount === null ? 'N/A' : visitCount), 'Total registered users: ' + total,
    'Active in last 7 days: ' + active7 + ' (' + pct(active7) + '%)', 'Active in last 30 days: ' + active30 + ' (' + pct(active30) + '%)',
    'Used My List at least once: ' + usedMyList + ' (' + pct(usedMyList) + '%)', 'Bookmarked at least one place: ' + usedBookmarks + ' (' + pct(usedBookmarks) + '%)',
    'Sharing publicly (Community Lists): ' + publicCount + ' (' + pct(publicCount) + '%)', 'Curators: ' + curatorsCount, 'Suspended accounts: ' + suspendedCount
  ].join('\n');
  const rowf = function(label, v){ return '<li><span>' + label + '</span><b>' + v + '</b></li>'; };
  dashSet('📄 Users report', adminBack);
  body.innerHTML = '<div class="ctx" style="text-align:center;">Generated · ' + escapeHtml(when.toLocaleString()) + '</div>'
    + '<div class="gsec">Reach</div><div class="receipt"><ul>' + rowf('Total page visits', visitCount === null ? 'N/A' : visitCount) + rowf('Registered users', total) + '</ul></div>'
    + '<div class="gsec">Activity</div><div class="receipt"><ul>' + rowf('Active · 7 days', active7 + ' · ' + pct(active7) + '%') + rowf('Active · 30 days', active30 + ' · ' + pct(active30) + '%') + rowf('Used My List at least once', usedMyList + ' · ' + pct(usedMyList) + '%') + rowf('Bookmarked at least one place', usedBookmarks + ' · ' + pct(usedBookmarks) + '%') + '</ul></div>'
    + '<div class="gsec">Sharing & moderation</div><div class="receipt"><ul>' + rowf('Sharing publicly', publicCount + ' · ' + pct(publicCount) + '%') + rowf('Curators', curatorsCount) + rowf('Suspended accounts', suspendedCount) + '</ul></div>'
    + '<div style="display:flex; gap:8px; margin-top:12px;"><button type="button" class="btn btn-ghost" style="flex:1" onclick="copyUsersReport()">📋 Copy as text</button><button type="button" class="btn btn-brass" style="flex:1" onclick="mpSendText(usersReportText)">📤 Share</button></div>';
  bd.classList.add('show');
}
async function copyUsersReport(){
  try{ await navigator.clipboard.writeText(usersReportText); showToast('Report copied ✓'); }catch(e){ showToast('Could not copy'); }
}

async function toggleSuspendUser(uid){
  const u = allUsersCache.find(x => x.uid === uid);
  if (!u) return;
  const newVal = !u.suspended;
  if (newVal && !(await mpConfirm('Holds every public list and trip and the shared-by-name access. Unsuspend restores everything.', { title: '⛔ Suspend ' + (u.nickname || u.email || 'this user') + '?', ok: 'Suspend', danger: true }))) return; /* ب-٢-٢-ب: الإيقاف بورقة تأكيد */
  try{
    // v3: مصدر الحقيقة suspensions/{uid} — وجود المستند = إيقاف. users.suspended كتابة انتقالية (تُزال بدفعة ٢/ز).
    if (newVal) await mpData.suspensions.set(uid, { at: Date.now(), by: currentUser.uid, email: u.email || '' });
    else await mpData.suspensions.remove(uid);
    await mpData.users.merge(uid, { suspended: newVal }).catch(()=>{});
    // ٢٦ أغسطس (القرار ١): الإيقاف يحتجز العام والمشاركة بالاسم على كل قوائم المستخدم ورحلاته، والرفع يستعيدهما كما كانا —
    // لا محو ولا فعل يدوي؛ البوابة البشرية هي قرار الرفع (المالك يراجع المحتوى قبله — وصفة الإيقاف بدليل التشغيل)
    await mpData.holdOrRestore(await mpData.cityLists.byOwner(uid), newVal);
    try{ await mpData.holdOrRestore(await mpData.trips.byOwner(uid), newVal); }catch(e){}
    if (newVal){
      await mpData.profiles.merge(uid, { hasAnyPublicCity: false, hasAnyPublicContent: false, publicCityIds: [] }).catch(()=>{});
    } else {
      await syncCommunityProfileFor(uid); // الرفع: نعيد حساب حالة الظهور الحقيقية بعد الاستعادة
    }
    u.suspended = newVal;
    showToast(newVal ? 'User suspended' : 'User unsuspended');
    await loadCommunityLists();
    openAdminUserCard(uid); /* ب-٢-٢-ب */
  }catch(e){ showToast('Could not update user'); }
}

let expandedSections = {}; // { sectionTitle: true } — القسم مفتوح بالكامل
let areaFilter = {};       // { sectionTitle: "اسم المنطقة" } — فلتر نشط على مستوى القسم الرئيسي

const COLLAPSE_LIMIT = 6;


