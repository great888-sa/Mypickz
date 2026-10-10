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
      await mpData.users.merge(currentUser.uid, { email: currentUser.email || '', firstSeen: Date.now(), lastSeen: Date.now(), suspended: false, lastActiveDay: today });
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

const EXPECTED_RULES = 'v3.14'; // ب-٢-١: + save بـstats_curators // r72t (M4.26 ٧): يُرفع مع كل نشرة — يُقارن بـ settings/app.rulesVersion الذي يكتبه المالك بعد النشر باللوحة
async function checkRulesVersion(){ try{ const live = (await mpData.settings.rulesVersion()) || '—'; const ok = live === EXPECTED_RULES; logTiming('[RULES] live=' + live + ' expected=' + EXPECTED_RULES + (ok ? ' ✓' : ' ✗ DRIFT')); return { live: live, ok: ok }; }catch(e){ return { live: '?', ok: false }; } }
async function openAdminPanel(){ // ر٧٢-أ-١ب: الباب الواحد للمالك — الإحصائيات بشكلها الحالي والأبواب
  document.getElementById('usersStatsLine').innerHTML = '<p style="text-align:center; color:var(--ink-soft);">Loading…</p>';
  document.getElementById('adminBackdrop').classList.add('show');
  await loadUsersForAdmin(); renderAdminStats();
  try{ const rq = await mpData.requests.all(); const pend = rq.filter(function(r){ return r.status === 'pending'; }).length; const el = document.getElementById('adminReqCount'); if (el) el.textContent = pend + ' pending ›'; }catch(e){} // r72p (٥)
  try{ const rp = await mpData.reports.all(); const el = document.getElementById('adminRepCount'); if (el) el.textContent = rp.length + ' ›'; }catch(e){}
  try{ const el = document.getElementById('adminCatsCount'); if (el) el.textContent = customItems.length + ' ›'; }catch(e){}
  try{ const rv = await checkRulesVersion(); const el = document.getElementById('adminRulesVer'); if (el){ el.textContent = 'Rules: ' + rv.live + (rv.ok ? ' ✓' : ' ✗ expected ' + EXPECTED_RULES); el.classList.toggle('danger', !rv.ok); } }catch(e){} // r72t (M4.26 ٧)
}
function openAdminCustomCats(){ /* ر٧٣-أب (١) — قرار المالك: إنشاء التصنيفات المخصَّصة من أدوات الإدارة بالدرج (كان بوضع تحرير الدليل الموروث) · القالب المشترك لكل المدن */
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return; bd.classList.add('show'); dashSet('🏷 Custom categories', function(){ closeModalById('dashBackdrop'); }); /* ب-٢-٢-أ: القشرة */
  const secs = DATA; const opts = secs.map(function(x){ return '<option value="' + attrStr(x.id || x.title) + '">' + escapeHtml(sectionDisplay(x).name) + '</option>'; }).join('');
  const rows = customItems.map(function(c, i){ return '<div class="row rowblock"><div class="pn" dir="auto">' + escapeHtml(c.name || c.id) + ' <span class="dim">· ' + escapeHtml(c.section || '') + ' · <code>' + escapeHtml(c.id) + '</code></span></div><button type="button" class="act" onclick="adminCustomCatRemove(' + i + ')" title="Remove this category from the template (places keep their category id)">🗑</button></div>'; }).join('');
  const secRows = secs.map(function(x){ const d = sectionDisplay(x); return '<div class="row rowblock"><div class="pn" dir="auto">' + escapeHtml(d.icon ? d.icon + ' ' : '') + escapeHtml(d.name) + (sectionOverrides[x.title] && sectionOverrides[x.title].name ? ' <span class="dim">· was ' + escapeHtml(x.title) + '</span>' : '') + '</div><button type="button" class="act" onclick="adminRenameSection(\'' + attrStr(x.title) + '\')" title="Rename this main section for everyone">✏️</button></div>'; }).join(''); /* خ-٥: إعادة التسمية بالقالب (المعرّفات ثابتة) */
  const subOpts = plCatsAll().map(function(c){ return '<option value="' + attrStr(c.id) + '">' + escapeHtml(c.section + ' · ' + c.name) + '</option>'; }).join('');
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>Custom categories</b> · shared by all cities</div>' + (rows || '<div class="mp-empty mini">No custom categories yet.</div>') + '<div class="row rowblock" style="flex-wrap:wrap; gap:6px;"><input class="modal-input" id="adminCatName" placeholder="New category name" style="flex:1; min-width:150px; margin:0;"><select class="modal-input" id="adminCatSec" style="flex:1; min-width:140px; margin:0;">' + opts + '</select><button type="button" class="act on" onclick="adminCustomCatAdd()">＋ Add</button></div>'
    + '<div class="ctx" style="text-align:center; margin-top:10px;"><b>Rename</b> · names only, ids never change</div>' + secRows + '<div class="row rowblock" style="flex-wrap:wrap; gap:6px;"><select class="modal-input" id="adminSubPick" style="flex:1; min-width:160px; margin:0;">' + subOpts + '</select><button type="button" class="act" onclick="adminRenameSub()">✏️ Rename sub-category</button></div>';
}
function adminCustomCatSlug(name){ const base = String(name || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'custom'; let id = 'c_' + base, n = 2; const taken = new Set(plCatsAll().map(function(c){ return c.id; }).concat(customItems.map(function(c){ return c.id; }))); while (taken.has(id)) id = 'c_' + base + '_' + (n++); return id; }
async function adminRenameSection(title){ if (!isOwner) return; const sec = DATA.find(function(x){ return x.title === title; }); if (!sec) return; const cur = sectionDisplay(sec).name; const nm = await mpSheet({ title: '✏️ Rename section', text: 'Shown to everyone. Leave empty to restore "' + title + '".', ok: 'Save', input: { value: cur, placeholder: title } }); if (nm === null) return; /* ب-٢-٢-أ٢: ورقة بحقل بدل prompt */ const v = String(nm).trim(); if (v && v !== title) sectionOverrides[title] = Object.assign({}, sectionOverrides[title] || {}, { name: v }); else if (sectionOverrides[title]){ delete sectionOverrides[title].name; if (!Object.keys(sectionOverrides[title]).length) delete sectionOverrides[title]; } try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'rename section'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function adminRenameSub(){ if (!isOwner) return; const id = (document.getElementById('adminSubPick') || {}).value; const cat = plCatsAll().find(function(c){ return c.id === id; }); if (!cat) return; const base = (DATA.flatMap(function(x){ return x.items; }).concat(customItems).find(function(it){ return it.id === id; }) || {}).name || cat.name; const nm = await mpSheet({ title: '✏️ Rename category', text: 'Leave empty to restore "' + base + '".', ok: 'Save', input: { value: cat.name, placeholder: base } }); if (nm === null) return; /* ب-٢-٢-أ٢: ورقة بحقل بدل prompt */ const v = String(nm).trim(); if (v && v !== base) itemOverrides[id] = Object.assign({}, itemOverrides[id] || {}, { name: v }); else if (itemOverrides[id]){ delete itemOverrides[id].name; if (!Object.keys(itemOverrides[id]).length) delete itemOverrides[id]; } try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'rename sub'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function adminCustomCatAdd(){ if (!isOwner) return; const nm = (document.getElementById('adminCatName') || {}).value || ''; const secId = (document.getElementById('adminCatSec') || {}).value || ''; const sec = DATA.find(function(x){ return (x.id || x.title) === secId; }); if (!nm.trim() || !sec){ showToast('Name and section are required'); return; }
  customItems.push({ id: adminCustomCatSlug(nm), name: nm.trim(), icon: '', section: sec.title, sectionId: sec.id || sec.title }); try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'custom cat add'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function adminCustomCatRemove(i){ if (!isOwner) return; const c = customItems[i]; if (!c) return; if (!(await mpConfirm('Places keep their category and will show in the import panel.', { title: '🗑 Remove "' + (c.name || c.id) + '" from the template?', ok: 'Remove', danger: true }))) return; /* ب-٢-٢-أ٢ */ customItems.splice(i, 1); try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'custom cat remove'); } openAdminCustomCats(); if (currentTab === 'Places') renderPlacesMine(); }
async function customCatSetSection(i, secId){ const c = customItems[i]; const sec = DATA.find(function(x){ return (x.id || x.title) === secId; }); if (!c || !sec) return; c.sectionId = secId; c.section = sec.title; delete c.legacySection; try{ await saveCategoryTemplate(); }catch(e){ mpSwallow(e, 'custom cat'); showToast('Could not save'); } if (currentTab === 'Places') renderPlacesMine(); } // ز-١-ج-٣: من صندوق الأماكن (المالك)
async function openAdminRequests(){ // r72p (٥): الطلبات — Accept يوسم الملف العام آليًّا
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('⭐ Curator requests', function(){ closeModalById('dashBackdrop'); }); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show'); /* ب-٢-٢-أ: القشرة */
  let rows = []; try{ rows = await mpData.requests.all(); }catch(e){ mpSwallow(e, 'requests'); }
  const names = {}; await Promise.all(rows.map(function(r){ return mpData.profiles.get(r.uid).then(function(pr){ names[r.uid] = (pr && (pr.displayName || pr.nickname)) || r.uid.slice(0, 8); }).catch(function(){ names[r.uid] = r.uid.slice(0, 8); }); }));
  rows.sort(function(a, b){ return ((a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1)) || ((b.at || 0) - (a.at || 0)); });
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>Curator requests</b> · ' + rows.length + '</div>' + (rows.length ? rows.map(function(r){ return '<div class="row rowblock"><div class="pn">' + escapeHtml(names[r.uid]) + ' <span class="stage">' + escapeHtml(r.status || 'pending') + '</span></div>' + (r.text ? '<div class="pl-sub">' + escapeHtml(r.text) + '</div>' : '') + (r.status === 'pending' ? '<div class="acts"><button type="button" class="actn on" onclick="adminDecideRequest(\'' + attrStr(r.uid) + '\', \'accepted\')">Accept</button><button type="button" class="actn danger" onclick="adminDecideRequest(\'' + attrStr(r.uid) + '\', \'declined\')">Decline</button></div>' : '') + '</div>'; }).join('') : '<div class="mp-empty mini">No requests</div>');
}
async function adminDecideRequest(uid, status){
  if (!isOwner) return;
  try{ await mpData.requests.setStatus(uid, status); if (status === 'accepted'){ await mpData.profiles.merge(uid, { verified: true }); curators = null; } }catch(e){ mpSwallow(e, 'decide'); showToast('Could not update · ' + ((e && e.code) || 'error')); return; }
  showToast(status === 'accepted' ? 'Accepted — curator badge set ✓' : 'Declined'); openAdminRequests();
}
async function openAdminReports(){ // r72p (٥): البلاغات — Open يفتح المحتوى · Dismiss يحذف
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('⚑ Reports', function(){ closeModalById('dashBackdrop'); }); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show'); /* ب-٢-٢-أ: القشرة */
  let rows = []; try{ rows = await mpData.reports.all(); }catch(e){ mpSwallow(e, 'reports'); }
  rows.sort(function(a, b){ return (b.at || 0) - (a.at || 0); });
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>Reports</b> · ' + rows.length + '</div>' + (rows.length ? rows.map(function(r){ return '<div class="row rowblock"><div class="pn">' + escapeHtml(r.kind || '') + ' <span class="dim mini">' + escapeHtml(String(r.docKey || '')) + '</span></div>' + (r.reason ? '<div class="pl-sub"><b>Reason:</b> ' + escapeHtml(r.reason) + '</div>' : '') + '<div class="pl-sub dim">by ' + escapeHtml(String(r.by || '').slice(0, 8)) + ' · ' + (r.at ? new Date(r.at).toISOString().slice(0, 10) : '') + '</div><div class="acts"><button type="button" class="actn" onclick="adminOpenReported(\'' + attrStr(r.kind) + '\', \'' + attrStr(String(r.docKey || '')) + '\')">Open</button><button type="button" class="actn danger" onclick="adminDismissReport(\'' + attrStr(r.id) + '\')">Dismiss</button></div></div>'; }).join('') : '<div class="mp-empty mini">No reports</div>');
}
async function adminDismissReport(id){ try{ await mpData.reports.remove(id); }catch(e){ showToast('Could not remove'); return; } openAdminReports(); }
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
async function loadUsersForAdmin(){ // عبر طبقة العزل فقط
  await loadVisitCount();
  try{
    allUsersCache = await mpData.users.all();
    try{ const susSet = await mpData.suspensions.allIds(); allUsersCache.forEach(u => { u.suspended = susSet.has(u.uid); }); }catch(e){}
    try{ if (!communityUsers.length) await loadCommunityLists(); }catch(e){}
    try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = curators || []; }
  }catch(e){ allUsersCache = []; }
}
async function openUsersModal(){
  document.getElementById('usersSearchInput').value = '';
  document.getElementById('usersListBody').innerHTML = `<p style="text-align:center; color:var(--ink-soft);">Loading...</p>`;
  document.getElementById('usersBackdrop').classList.add('show');
  await loadVisitCount();
  try{
    allUsersCache = await mpData.users.all();
    // v3: حالة الإيقاف الفعلية من suspensions (مصدر الحقيقة) — تطغى على الحقل القديم بالمستند
    try{
      const susSet = await mpData.suspensions.allIds();
      allUsersCache.forEach(u => { u.suspended = susSet.has(u.uid); });
    }catch(e){ /* لو فشلت (قبل نشر v3 مثلًا) نبقى على الحقل القديم */ }
  }catch(e){ allUsersCache = []; }
  await loadCommunityLists(); // نحتاجها دايمًا عشان نعرف مين مفعّل المشاركة العامة، ونستخدمها كمان لتصحيح أسماء قديمة ناقصة

  // إصلاح تلقائي: لو حساب عنده قائمة عامة فعليًا لكن سجله الجديد ناقص الاسم المستعار (اسم اتحدد قبل إضافة هذه الميزة)، نستكمله من بيانات القائمة العامة نفسها
  communityUsers.forEach(cu => {
    const u = allUsersCache.find(x => x.uid === cu.uid);
    if (u && !u.nickname && cu.nickname){
      u.nickname = cu.nickname;
      mpData.users.merge(cu.uid, { nickname: cu.nickname }).catch(()=>{});
    }
  });

  try{ curators = await mpData.profiles.curators(200); }catch(e){ curators = curators || []; } // ر٧٢-أ-١ب: الشارات
  renderUsersModal();
}
function closeUsersModal(){
  document.getElementById('usersBackdrop').classList.remove('show');
}

