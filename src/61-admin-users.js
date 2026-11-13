/* =========================================================
   إدارة المستخدمين (Manage Users) — سجل خفيف لكل مستخدم مسجّل + لوحة للمالك
   ========================================================= */
function todayKey(){
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function registerUserRecord(){
  if (!currentUser) return;
  const today = todayKey();
  try{
    const doc = await mpData.users.get(currentUser.uid);
    if (!doc.exists){
      try{ if (typeof mpSharerInit === 'function') await mpSharerInit(); }catch(_){} /* رمزي يُحسب قبل قراءة من جلبني — «رمزي لا يُنسب إليّ» كان يقارن برمز فارغ */
      await mpData.users.merge(currentUser.uid, Object.assign({ email: currentUser.email || '', firstSeen: Date.now(), lastSeen: Date.now(), suspended: false, lastActiveDay: today }, (typeof mpArrivalFields === 'function') ? mpArrivalFields() : {})); /* r115-د (٥): من جلب المستخدم الجديد (رمز مستعار) ومن أي نوع وقناة — مرة عند أول تسجيل */
      await mpData.dailyStats.bump(today, { newSignupsToday: mpData.fieldInc(1), activeToday: mpData.fieldInc(1) });
    } else {
      const prevDay = doc.data().lastActiveDay;
      await mpData.users.merge(currentUser.uid, { lastSeen: Date.now(), lastActiveDay: today });
      if (prevDay !== today){ // نتجنب عدّ نفس المستخدم مرتين في نفس اليوم
        await mpData.dailyStats.bump(today, { activeToday: mpData.fieldInc(1) });
      }
    }
  }catch(e){ /* صامت — التسجيل تحسين إضافي، مش شرط لعمل التطبيق */ }
}

let allUsersCache = [];

const EXPECTED_RULES = 'v3.17'; // v3.17 (ق١١-١٢-٠٥): إصلاحات المراجعة الشاملة — المحور ١ (حقل المالك · الربط بالاتجاهين للسجلات الأربعة · أنواع الحقول · نافذة التاريخ …) · r117: «saved by» مربوط بسجل صاحبه · حذف أربعة مفاتيح أحداث · (v3.15 لم تُنشر منفردة) r116-أ: + city الاختياري بـplaceFavoriteCounts · ب-٢-١: + save بـstats_curators // r72t (M4.26 ٧): يُرفع مع كل نشرة — يُقارن بـ settings/app.rulesVersion الذي يكتبه المالك بعد النشر باللوحة
async function checkRulesVersion(){ try{ const live = (await mpData.settings.rulesVersion()) || '—'; const ok = live === EXPECTED_RULES; logTiming('[RULES] live=' + live + ' expected=' + EXPECTED_RULES + (ok ? ' ✓' : ' ✗ DRIFT')); return { live: live, ok: ok }; }catch(e){ return { live: '?', ok: false }; } }
/* ═══ ب-٢-٢-ب (المسودة v2-ب): نوافذ المالك — اللوحة قشرةً بثلاث مجموعات؛ كل نافذة فرعية داخل dashBackdrop فوقها وتعود إليها بـBack (adminBack يحدّث العدّادات) ═══ */
function adminBack(){ closeModalById('dashBackdrop'); adminRefreshCounts(); }
async function adminRefreshCounts(){
  try{ const rq = await mpData.requests.all(); const pend = rq.filter(function(r){ return r.status === 'pending'; }).length; const el = document.getElementById('adminReqCount'); if (el) el.textContent = pend + ' pending ›'; }catch(e){}
  try{ const rp = await mpData.reports.all(); const el = document.getElementById('adminRepCount'); if (el) el.textContent = rp.length + ' ›'; }catch(e){}
  try{ const el = document.getElementById('adminCatsCount'); if (el) el.textContent = customItems.length + ' ›'; }catch(e){}
}
/* ═══ r116-ح (ق١١-١١-١٣ «نعم، فقط أ» · دَين stats-residue): بقايا العدّ بعد حذف حساب أو قائمة أو رحلة — مستندات يحمل معرّفها معرّف ما زال (stats_lists · stats_places ← القائمة · stats_trips ← الرحلة · stats_curators و stats_cards ← الحساب). القواعد تجعل حذفها لمالك التطبيق وحده، فيكنسها هو:
   مرة في اليوم عند فتح لوحة الإدارة (وبضغط سطرها) · مستند العدّ يُحذف فقط حين تثبت قراءةٌ ناجحة أن أباه غير موجود — قراءة تعذّرت لا تُعدّ غيابًا · بسقوف: صفحة لكل مجموعة، وعدد آباء يُفحصون، وعدد يُحذف · مؤشّر لكل مجموعة يكمل منه في اليوم التالي. لا تعديل قاعدة. ═══ */
const MP_RESIDUE_PAGE = 150;   /* مستندات عدّ تُسرد من كل مجموعة في الجولة */
const MP_RESIDUE_CHECKS = 40;  /* آباء مختلفون تُقرأ حالتهم في الجولة — لكل مجموعة ميزانيتها (r116 · المراجعة المستقلة ٣: كانت ميزانية واحدة تستنفدها المجموعة الأولى فلا تُبلغ التالية أبدًا) */
const MP_RESIDUE_CAP = 100;    /* مستندات تُحذف في الجولة */
const MP_RESIDUE_OF = { stats_lists: 'userCityLists', stats_places: 'userCityLists', stats_trips: 'trips', stats_curators: 'users', stats_cards: 'users' };
async function statsResidueSweep(force){
  if (!isOwner) return null; const today = todayKey(); let st = {}; try{ st = JSON.parse(localStorage.getItem('mp_residue') || '{}') || {}; }catch(_){ st = {}; }
  if (!force && st.day === today && st.last) return st.last;
  const res = { day: today, removed: 0, checked: 0, kept: 0, errors: 0, more: false }; const cur = Object.assign({}, st.cur || {}); const known = {};
  for (const coll of Object.keys(MP_RESIDUE_OF)){ let ids = []; try{ ids = await mpData.stats.pageIds(coll, cur[coll] || '', MP_RESIDUE_PAGE); }catch(e){ mpSwallow(e, 'residue list ' + coll); res.errors++; continue; }
    let last = '', stopped = false, checkedHere = 0;
    for (const id of ids){ const key = MP_RESIDUE_OF[coll] + '/' + String(id).split('__')[0];
      if (!(key in known)){ if (checkedHere >= MP_RESIDUE_CHECKS){ stopped = true; break; } checkedHere++; res.checked++; try{ known[key] = await mpData.stats.parentExists(MP_RESIDUE_OF[coll], String(id).split('__')[0]); }catch(e){ mpSwallow(e, 'residue parent'); res.errors++; known[key] = null; /* لم تُعرف حاله: يبقى */ } }
      if (known[key] === false){ if (res.removed >= MP_RESIDUE_CAP){ stopped = true; break; } try{ await mpData.stats.remove(coll, id); res.removed++; }catch(e){ mpSwallow(e, 'residue remove'); res.errors++; } } else res.kept++;
      last = id; }
    if (stopped || ids.length >= MP_RESIDUE_PAGE){ cur[coll] = last || cur[coll] || ''; res.more = true; } else cur[coll] = ''; /* بلغ آخر المجموعة: الجولة التالية من أولها */ }
  try{ localStorage.setItem('mp_residue', JSON.stringify({ day: today, cur: cur, last: res })); }catch(_){}
  logTiming('[RESIDUE] removed ' + res.removed + ' · parents checked ' + res.checked + ' · kept ' + res.kept + (res.errors ? ' · errors ' + res.errors : '') + (res.more ? ' · more next round' : '')); return res;
}
function statsResidueLine(r){ if (!r) return '›'; return (r.removed ? 'removed ' + r.removed : 'nothing to remove') + ' · checked ' + r.checked + (r.errors ? ' · ' + r.errors + ' unread' : '') + (r.more ? ' · more next time' : '') + ' ›'; }
async function adminResidueRun(force){ const el = document.getElementById('adminResidueLine'); if (el && force) el.textContent = 'cleaning…'; let r = null; try{ r = await statsResidueSweep(!!force); }catch(e){ mpSwallow(e, 'residue'); } const now = document.getElementById('adminResidueLine'); if (now) now.textContent = statsResidueLine(r); return r; }
async function openAdminPanel(){ // ر٧٢-أ-١ب: الباب الواحد للمالك — ب-٢-٢-ب: القشرة والمجموعات
  document.getElementById('usersStatsLine').innerHTML = '';
  document.getElementById('adminBackdrop').classList.add('show');
  await loadUsersForAdmin(); renderAdminStats();
  adminRefreshCounts();
  try{ const rv = await checkRulesVersion(); const el = document.getElementById('adminRulesVer'); if (el){ el.textContent = rv.live + (rv.ok ? ' ✓' : ' ✗ expected ' + EXPECTED_RULES); el.className = rv.ok ? 'ok' : 'no'; } }catch(e){} // r72t (M4.26 ٧)
  adminResidueRun(false); /* r116-ح: كنس بقايا العدّ — مرة في اليوم، لا يحبس اللوحة */
  pulseSummary().then(function(t){ const el = document.getElementById('adminPulseLine'); if (el) el.textContent = t + ' ›'; }).catch(function(){}); /* سطر حالة النبضة على بابها */
}
function adminName(uid, pr){ return (pr && (pr.displayName || pr.nickname)) || ((allUsersCache.find(function(u){ return u.uid === uid; }) || {}).nickname) || String(uid || '').slice(0, 8); }
async function adminNames(uids){ const names = {}; await Promise.all(Array.from(new Set(uids)).map(function(uid){ return mpData.profiles.get(uid).then(function(pr){ names[uid] = adminName(uid, pr); }).catch(function(){ names[uid] = adminName(uid, null); }); })); return names; }
function adminDate(ms){ return ms ? msDayLabel(new Date(ms).toISOString().slice(0, 10)) : ''; }
function openAdminCustomCats(){ /* ر٧٣-أب (١) — ب-٢-٢-ب (v2-ب · ٦): ثلاث مجموعات بعناوين · الحذف وإعادة التسمية بالأوراق السفلية (أ٢-١) · Back إلى اللوحة */
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return; bd.classList.add('show'); dashSet('🏷 Custom categories', adminBack);
  const secs = DATA; const opts = secs.map(function(x){ return '<option value="' + attrVal(x.id || x.title) + '">' + escapeHtml(sectionDisplay(x).name) + '</option>'; }).join('');
  const rows = customItems.map(function(c, i){ return '<div class="row rowblock"><div class="pn" dir="auto">' + escapeHtml(c.name || c.id) + '</div><div class="pl-sub">' + escapeHtml(c.section || '') + ' · <code>' + escapeHtml(c.id) + '</code></div><div class="acts"><button type="button" class="actn danger" onclick="adminCustomCatRemove(' + i + ')">🗑 Remove</button></div></div>'; }).join('');
  const secOpts = secs.map(function(x){ const d = sectionDisplay(x); return '<option value="' + attrVal(x.title) + '">' + escapeHtml((d.icon ? d.icon + ' ' : '') + d.name) + (sectionOverrides[x.title] && sectionOverrides[x.title].name ? ' (was ' + escapeHtml(x.title) + ')' : '') + '</option>'; }).join('');
  const subOpts = plCatsAll().map(function(c){ return '<option value="' + attrVal(c.id) + '">' + escapeHtml(c.section + ' · ' + c.name) + '</option>'; }).join('');
  body.innerHTML = '<div class="ctx" style="text-align:center;">Shared by all cities · structure in code, names in data</div>'
    + '<div class="gsec">Custom sub-categories · ' + customItems.length + '</div>' + (rows || '<div class="mp-empty mini">No custom sub-categories yet</div>')
    + '<div class="gsec">Add a sub-category</div><div class="row rowblock" style="display:flex; flex-wrap:wrap; gap:6px;"><input class="modal-input" id="adminCatName" placeholder="New category name" style="flex:1; min-width:150px; margin:0;"><select class="modal-input" id="adminCatSec" style="flex:1; min-width:140px; margin:0;">' + opts + '</select><button type="button" class="actn on" onclick="adminCustomCatAdd()">＋ Add</button></div>'
    + '<div class="gsec">Rename · names only, ids never change</div><div class="row rowblock" style="display:flex; flex-wrap:wrap; gap:6px;"><select class="modal-input" id="adminSecPick" style="flex:1; min-width:160px; margin:0;">' + secOpts + '</select><button type="button" class="actn" onclick="adminRenameSection(document.getElementById(\'adminSecPick\').value)">✏️ Main section</button></div>'
    + '<div class="row rowblock" style="display:flex; flex-wrap:wrap; gap:6px;"><select class="modal-input" id="adminSubPick" style="flex:1; min-width:160px; margin:0;">' + subOpts + '</select><button type="button" class="actn" onclick="adminRenameSub()">✏️ Sub-category</button></div>';
}
function adminCustomCatSlug(name){ const base = String(name || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'custom'; let id = 'c_' + base, n = 2; const taken = new Set(plCatsAll().map(function(c){ return c.id; }).concat(customItems.map(function(c){ return c.id; }))); while (taken.has(id)) id = 'c_' + base + '_' + (n++); return id; }
async function adminRenameSection(title){ if (!isOwner) return; const sec = DATA.find(function(x){ return x.title === title; }); if (!sec) return; const cur = sectionDisplay(sec).name; let nm = await mpSheet({ title: '✏️ Rename «' + cur + '»', text: 'Shown to everyone · original: ' + title + ' · id never changes', ok: 'Save name', alt: 'Restore original', input: { value: cur, placeholder: title } }); if (nm === null) return; if (nm === 'alt') nm = ''; /* ب-٢-٢-ب (v2-ب · ٦-ب): الورقة بزر الاستعادة */ const v = String(nm).trim(); if (v && v !== title) sectionOverrides[title] = Object.assign({}, sectionOverrides[title] || {}, { name: v }); else if (sectionOverrides[title]){ delete sectionOverrides[title].name; if (!Object.keys(sectionOverrides[title]).length) delete sectionOverrides[title]; } try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'rename section'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function adminRenameSub(){ if (!isOwner) return; const id = (document.getElementById('adminSubPick') || {}).value; const cat = plCatsAll().find(function(c){ return c.id === id; }); if (!cat) return; const base = (DATA.flatMap(function(x){ return x.items; }).concat(customItems).find(function(it){ return it.id === id; }) || {}).name || cat.name; let nm = await mpSheet({ title: '✏️ Rename «' + cat.name + '»', text: 'Shown to everyone · original: ' + base + ' · id never changes', ok: 'Save name', alt: 'Restore original', input: { value: cat.name, placeholder: base } }); if (nm === null) return; if (nm === 'alt') nm = ''; /* ب-٢-٢-ب (v2-ب · ٦-ب) */ const v = String(nm).trim(); if (v && v !== base) itemOverrides[id] = Object.assign({}, itemOverrides[id] || {}, { name: v }); else if (itemOverrides[id]){ delete itemOverrides[id].name; if (!Object.keys(itemOverrides[id]).length) delete itemOverrides[id]; } try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'rename sub'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function adminCustomCatAdd(){ if (!isOwner) return; const nm = (document.getElementById('adminCatName') || {}).value || ''; const secId = (document.getElementById('adminCatSec') || {}).value || ''; const sec = DATA.find(function(x){ return (x.id || x.title) === secId; }); if (!nm.trim() || !sec){ showToast('Name and section are required'); return; }
  customItems.push({ id: adminCustomCatSlug(nm), name: nm.trim(), icon: '', section: sec.title, sectionId: sec.id || sec.title }); try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'custom cat add'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function adminCustomCatRemove(i){ if (!isOwner) return; const c = customItems[i]; if (!c) return; if (!(await mpConfirm('Places keep their category id and will show in the «Import places still not categorized» panel until moved.', { title: '🗑 Remove «' + (c.name || c.id) + '» from the template?', ok: 'Remove', danger: true }))) return; /* ب-٢-٢-ب (v2-ب · ٦-ب) */ customItems.splice(i, 1); try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'custom cat remove'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function customCatSetSection(i, secId){ const c = customItems[i]; const sec = DATA.find(function(x){ return (x.id || x.title) === secId; }); if (!c || !sec) return; c.sectionId = secId; c.section = sec.title; delete c.legacySection; try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'custom cat'); showToast('Could not save'); } if (currentTab === 'Places') renderPlacesMine(); } // ز-١-ج-٣: من صندوق الأماكن (المالك)
async function openAdminRequests(){ // r72p (٥) — ب-٢-٢-ب (v2-ب · ٣): المعلَّق أولًا · الاسم والتاريخ والأهلية من الملف العام · Accept يوسم · Decline بورقة · Open page
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('⭐ Curator requests', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  let rows = []; try{ rows = await mpData.requests.all(); }catch(e){ mpSwallow(e, 'requests'); body.innerHTML = '<div class="mp-empty mini">Could not load requests</div><button type="button" class="dash-door" onclick="openAdminRequests()"><span>↻ Retry</span><span></span></button>'; return; }
  const profs = {}; await Promise.all(rows.map(function(r){ return mpData.profiles.get(r.uid).then(function(pr){ profs[r.uid] = pr || {}; }).catch(function(){ profs[r.uid] = {}; }); }));
  rows.sort(function(a, b){ return ((a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1)) || ((b.at || 0) - (a.at || 0)); });
  const pend = rows.filter(function(r){ return r.status === 'pending'; }).length;
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>' + pend + '</b> pending · ' + (rows.length - pend) + ' decided</div>' + (rows.length ? rows.map(function(r){ const pr = profs[r.uid] || {}; const st = r.status || 'pending'; const nL = Array.isArray(pr.publicCityIds) ? pr.publicCityIds.length : 0;
    return '<div class="row rowblock"><div class="pn">' + escapeHtml(adminName(r.uid, pr)) + ' <span class="stage">' + escapeHtml(st) + '</span></div><div class="pl-sub">' + adminDate(r.at) + (st === 'pending' ? ' · ' + nL + ' public list' + (nL === 1 ? '' : 's') : st === 'accepted' ? ' · badge on' : '') + '</div>' + (r.text ? '<div class="pl-sub">«' + escapeHtml(r.text) + '»</div>' : '')
      + '<div class="acts">' + (st === 'pending' ? '<button type="button" class="actn on" onclick="adminDecideRequest(\'' + attrStr(r.uid) + '\', \'accepted\')">Accept — set badge</button><button type="button" class="actn danger" onclick="adminDecideRequest(\'' + attrStr(r.uid) + '\', \'declined\')">Decline</button>' : '') + '<button type="button" class="actn" onclick="adminOpenReported(\'profile\', \'' + attrStr(r.uid) + '\')">Open page →</button></div></div>'; }).join('') : '<div class="mp-empty mini">No requests yet</div>');
}
async function adminDecideRequest(uid, status){
  if (!isOwner) return;
  if (status === 'declined' && !(await mpConfirm('The person keeps their account; they can ask again a week after their request.', { title: '⭐ Decline this request?', ok: 'Decline', danger: true }))) return; /* ب-٢-٢-ب: Decline بورقة تأكيد */
  try{ await mpData.requests.setStatus(uid, status); if (status === 'accepted'){ await mpData.profiles.merge(uid, { verified: true }); curators = null; } }catch(e){ mpSwallow(e, 'decide'); mpErrToast('Could not update', e); return; }
  showToast(status === 'accepted' ? 'Accepted — curator badge set ✓' : 'Declined'); openAdminRequests();
}
/* ب-٢-٢-ب (v2-ب · ٥): البلاغات — الأحدث أولًا · مرشِّح بالنوع · بلاغ app يُعرض بنوع المشكلة والشاشة والبناء من مقدمة نصه [Type · Screen · build] · by بالاسم · Dismiss بورقة */
let adminRepFilter = 'all', adminRepRows = null, adminRepNames = {};
function adminParseReport(r){ const m = String(r.reason || '').match(/^\[([^\]·]+) · ([^\]·]+) · ([^\]]+)\] ([\s\S]*)$/); if (r.kind === 'app' && m) return { title: m[1].trim(), screen: m[2].trim(), build: m[3].trim(), text: m[4].trim() }; return { title: r.kind === 'app' ? 'App problem' : (r.kind || '') + (r.docKey ? ' · ' + String(r.docKey).split(':').slice(0, 2).join(' · ') : ''), screen: '', build: '', text: String(r.reason || '') }; }
function adminRepPick(f){ adminRepFilter = f; renderAdminReports(); }
async function openAdminReports(){
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('⚑ Reports', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  let rows = []; try{ rows = await mpData.reports.all(); }catch(e){ mpSwallow(e, 'reports'); body.innerHTML = '<div class="mp-empty mini">Could not load reports</div><button type="button" class="dash-door" onclick="openAdminReports()"><span>↻ Retry</span><span></span></button>'; return; }
  rows.sort(function(a, b){ return (b.at || 0) - (a.at || 0); }); adminRepRows = rows; adminRepNames = await adminNames(rows.map(function(r){ return r.by; }).filter(Boolean));
  renderAdminReports();
}
function renderAdminReports(){
  const body = document.getElementById('dashBody'); const rows = adminRepRows || []; const kinds = ['all'].concat(Array.from(new Set(rows.map(function(r){ return r.kind || 'other'; }))));
  if (kinds.indexOf(adminRepFilter) < 0) adminRepFilter = 'all';
  const list = rows.filter(function(r){ return adminRepFilter === 'all' || (r.kind || 'other') === adminRepFilter; });
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>' + rows.length + '</b> open</div>' + (rows.length ? '<div class="chiprow" style="flex-wrap:wrap;">' + kinds.map(function(k){ return '<button type="button" class="chip' + (adminRepFilter === k ? ' on' : '') + '" onclick="adminRepPick(\'' + attrStr(k) + '\')">' + escapeHtml(k === 'all' ? 'All' : k) + '</button>'; }).join('') + '</div>' : '')
    + (list.length ? list.map(function(r){ const p = adminParseReport(r); return '<div class="row rowblock"><div class="pn">⚑ ' + escapeHtml(p.title) + '</div><div class="pl-sub">by <b>' + escapeHtml(adminRepNames[r.by] || adminName(r.by, null)) + '</b> · ' + adminDate(r.at) + (p.screen ? ' · screen ' + escapeHtml(p.screen) : '') + (p.build ? ' · ' + escapeHtml(p.build) : '') + '</div>' + (p.text ? '<div class="pl-sub">«' + escapeHtml(p.text) + '»</div>' : '')
      + '<div class="acts">' + (r.kind !== 'app' ? '<button type="button" class="actn" onclick="adminOpenReported(\'' + attrStr(r.kind) + '\', \'' + attrStr(String(r.docKey || '')) + '\')">Open →</button>' : '') + '<button type="button" class="actn danger" onclick="adminDismissReport(\'' + attrStr(r.id) + '\')">Dismiss</button></div></div>'; }).join('') : '<div class="mp-empty mini">No reports — all clear</div>');
}
async function adminDismissReport(id){ if (!(await mpConfirm('The report is removed; nothing happens to the content.', { title: '⚑ Dismiss this report?', ok: 'Dismiss', danger: true }))) return; try{ await mpData.reports.remove(id); }catch(e){ showToast('Could not remove'); return; } openAdminReports(); }
async function adminOpenReported(kind, key){ // يفتح المحتوى المبلَّغ عنه بطبقاته القائمة
  closeModalById('dashBackdrop'); closeModalById('adminBackdrop');
  try{
    if (kind === 'app'){ showToast('App problem report — nothing to open'); return; }
    if (kind === 'notes'){ const parts = String(key).split('__'); curators = curators || await mpData.profiles.curators(200); switchTab('Curators'); curOpen(parts[0]); curCity = parts[1] || null; renderCuratorsBody(); return; }
    if (kind === 'profile'){ curators = curators || await mpData.profiles.curators(200); const u = (curators || []).find(function(c){ return c.uid === key; }); if (u){ switchTab('Curators'); curOpen(key); } else { await viewCommunityUser(key); switchTab('Community'); } }
    else if (kind === 'trip'){ switchTab('Community'); communityTab = 'trips'; openCommunityTrip(key); }
    else { const parts = String(key).split(':'); const owner = parts[0]; await viewCommunityUser(owner); switchTab('Community'); if (parts[1] && typeof communityViewingCityId !== 'undefined'){ communityViewingCityId = parts[1]; renderCommunityModal(); } }
  }catch(e){ mpSwallow(e, 'open reported'); showToast('Could not open'); }
}
/* ب-٢-٢-ب (v2-ب · ٤): Curator stats — قائمة اختيار المنتقي ثم openMyStats(uid) بوضع القراءة، وBack منها إلى القائمة */
async function openAdminCuratorPicker(){
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('📊 Curator stats', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  try{ if (!curators) curators = await mpData.profiles.curators(200); }catch(e){ curators = curators || []; }
  const list = (curators || []).slice().sort(function(a, b){ return (b.followerCount || 0) - (a.followerCount || 0); });
  body.innerHTML = '<div class="ctx" style="text-align:center;">Pick a curator to read their stats</div>' + (list.length ? list.map(function(c){ return '<button type="button" class="dash-door" onclick="openMyStats(\'' + attrStr(c.uid) + '\', openAdminCuratorPicker)"><span><span class="curring" style="display:inline-flex; width:22px; height:22px; font-size:9px; margin-right:6px;">' + escapeHtml(curInitials(c)) + '</span>' + escapeHtml(curName(c)) + '</span><span>' + (typeof c.followerCount === 'number' ? c.followerCount + ' followers ›' : '›') + '</span></button>'; }).join('') : '<div class="mp-empty mini">No badged curators yet</div>');
}
async function loadUsersForAdmin(){ // عبر طبقة العزل فقط
  await loadVisitCount();
  try{
    allUsersCache = await mpData.users.all();
    try{ const susSet = await mpData.suspensions.allIds(); allUsersCache.forEach(u => { u.suspended = susSet.has(u.uid); }); }catch(e){}
    try{ if (!communityUsers.length) await loadCommunityLists(); }catch(e){}
    try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = curators || []; }
  }catch(e){ allUsersCache = []; }
}
/* ب-٢-٢-ب (v2-ب · ٢ · ٢-ب): Users — بحث بالاسم أو البريد · صف بالحرفين والاسم والبريد والشارات · النقر يفتح بطاقة المستخدم بأفعاله الثلاثة (Curator badge · View stats · Suspend) · Show more بعد ٥٠ */
let adminUsersShown = 50;
const adminHoldChecked = {}; /* r109-ب: حساب أُوقف قبل «الإيقاف الكامل» بقيت تصنيفاته عامة في القواعد — عند فتح Users يُفحص كل موقوف مرة بالجلسة ويُكتب ما يخالف وحده (علاج ذاتي كعلاج r104، وسطر VIS · account … held … (out of step only) حين كُتب شيء) */
async function adminHoldSweep(){ const list = (allUsersCache || []).filter(function(u){ return u && u.suspended && !adminHoldChecked[u.uid]; }); for (const u of list){ adminHoldChecked[u.uid] = true; try{ const sd = await mpData.suspensions.get(u.uid); if (!(sd && sd.exists) || !u.suspended || u.__suspendBusy) continue; /* المراجعة: مصدر الحقيقة suspensions/{uid} يُقرأ لحظتها — حساب رُفع إيقافه للتوّ لا يُحتجز من جديد */ await mpData.cityLists.holdAll(u.uid, true, { onlyOutOfStep: true }); await mpData.holdOrRestore(await mpData.trips.byOwner(u.uid), true); }catch(e){ delete adminHoldChecked[u.uid]; mpSwallow(e, 'hold-sweep'); } } }
async function openUsersModal(){
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('👥 Users', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show'); adminUsersShown = 50;
  await loadVisitCount();
  try{
    allUsersCache = await mpData.users.all();
    try{ const susSet = await mpData.suspensions.allIds(); allUsersCache.forEach(u => { u.suspended = susSet.has(u.uid); }); }catch(e){ /* v3: مصدر الحقيقة suspensions — قبل نشرها يبقى الحقل القديم */ }
  }catch(e){ mpSwallow(e, 'admin-users'); allUsersCache = []; body.innerHTML = '<div class="mp-empty mini">Could not load users — ' + escapeHtml(mpErrText(e)) + '</div><button type="button" class="dash-door" onclick="openUsersModal()"><span>↻ Retry</span><span></span></button>'; return; }
  await loadCommunityLists(true); /* r109: بعد فعل إداري — من الخادم */
  adminHoldSweep(); /* r109-ب: لا ينتظره الرسم */
  communityUsers.forEach(cu => { const u = allUsersCache.find(x => x.uid === cu.uid); if (u && !u.nickname && cu.nickname){ u.nickname = cu.nickname; mpData.users.merge(cu.uid, { nickname: cu.nickname }).catch(()=>{}); } }); // إصلاح تلقائي للاسم الناقص من القائمة العامة
  try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = curators || []; }
  body.innerHTML = '<div class="ctx" id="usersCtx" style="text-align:center;"></div><div class="headrow" style="margin:0 0 8px;"><input type="text" id="usersSearchInput" class="csel grow psearch" placeholder="Search by name or email…" oninput="renderUsersModal(this.value)" autocomplete="off"></div><div id="usersListBody"></div>';
  renderUsersModal();
}
function adminUsersMore(){ adminUsersShown += 50; renderUsersModal((document.getElementById('usersSearchInput') || {}).value); }
async function openAdminUserCard(uid){
  const body = document.getElementById('dashBody'); const u = allUsersCache.find(function(x){ return x.uid === uid; }); if (!body || !u) return;
  const d = adminStatsData(); const isCur = d.curatorSet.has(uid); const nick = u.nickname || '(no nickname yet)';
  dashSet('👥 Users', openUsersModal);
  body.innerHTML = '<div class="row rowblock" style="text-align:center;"><div class="curring" style="display:inline-flex; width:44px; height:44px; font-size:15px; margin:4px auto 6px;">' + escapeHtml(curInitials({ nickname: u.nickname || '?' })) + '</div><div class="pn">' + escapeHtml(nick) + '</div><div class="pl-sub">' + escapeHtml(u.email || '') + (u.firstSeen ? ' · joined ' + adminDate(u.firstSeen) : '') + (u.lastSeen ? ' · last seen ' + adminDate(u.lastSeen) : '') + '</div><div class="ubadges" style="justify-content:center;">' + (d.publicSet.has(uid) ? '<span class="pl-flag ubadge">Public</span>' : '') + (isCur ? '<span class="curvb ubadge">✧ ' + CUR_BADGE + '</span>' : '') + (u.suspended ? '<span class="pl-flag ubadge danger">Suspended</span>' : '') + '</div></div>'
    + '<button type="button" class="dash-door" onclick="toggleCuratorUser(\'' + attrStr(uid) + '\')"><span>✧ Curator badge</span><span>' + (isCur ? 'On → Remove' : 'Off → Grant') + '</span></button>'
    + '<button type="button" class="dash-door" onclick="openMyStats(\'' + attrStr(uid) + '\', function(){ openAdminUserCard(\'' + attrStr(uid) + '\'); })"><span>📊 View stats</span><span>reach · lists ›</span></button>'
    + '<button type="button" class="dash-door' + (u.suspended ? '' : ' danger') + '" onclick="toggleSuspendUser(\'' + attrStr(uid) + '\')"><span>' + (u.suspended ? '✅ Unsuspend' : '⛔ Suspend') + '</span><span>' + (u.suspended ? 'restores everything' : 'holds public & shared content') + '</span></button>'
    + '<div class="ctx">' + (u.suspended ? 'Unsuspend restores all public lists and trips as they were — review the content first (owner gate).' : 'Suspend holds every public list and trip and the shared-by-name access. Unsuspend restores everything.') + '</div>';
}
