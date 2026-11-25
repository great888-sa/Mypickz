/* =========================================================
   إدارة المستخدمين (Manage Users) — سجل خفيف لكل مستخدم مسجّل + لوحة للمالك
   ========================================================= */
function todayKey(){
  return mpDayKey(); // "YYYY-MM-DD" — r120: يوم الرياض (كان UTC)
}

async function registerUserRecord(){
  if (!currentUser) return;
  const today = todayKey();
  try{
    const __who = currentUser.uid, __gen = mpSessionGen; const doc = await mpData.users.get(__who); if (!mpSameUser(__who, __gen)) return; /* r120: سجل قُرئ لمستخدم لا يُكتب على حكمه لمستخدم آخر */
    if (!doc.exists){
      try{ if (typeof mpSharerInit === 'function') await mpSharerInit(); }catch(_){} /* رمزي يُحسب قبل قراءة من جلبني — «رمزي لا يُنسب إليّ» كان يقارن برمز فارغ */
      if (!mpSameUser(__who, __gen)) return;
      await mpData.users.merge(__who, Object.assign({ email: currentUser.email || '', firstSeen: Date.now(), lastSeen: Date.now(), suspended: false, lastActiveDay: today }, (typeof mpArrivalFields === 'function') ? mpArrivalFields() : {})); /* r115-د (٥): من جلب المستخدم الجديد (رمز مستعار) ومن أي نوع وقناة — مرة عند أول تسجيل */
      await mpData.dailyStats.bump(today, { newSignupsToday: mpData.fieldInc(1), activeToday: mpData.fieldInc(1) });
    } else {
      const prevDay = doc.data().lastActiveDay;
      await mpData.users.merge(__who, { lastSeen: Date.now(), lastActiveDay: today });
      if (prevDay !== today){ // نتجنب عدّ نفس المستخدم مرتين في نفس اليوم
        await mpData.dailyStats.bump(today, { activeToday: mpData.fieldInc(1) });
      }
    }
  }catch(e){ /* صامت — التسجيل تحسين إضافي، مش شرط لعمل التطبيق */ }
}

let allUsersCache = [];

const EXPECTED_RULES = 'v3.18'; // v3.18 (ق١١-١٤-٠٢): السجل يخرج بعدّاده دائمًا · v3.17 (ق١١-١٢-٠٥): إصلاحات المراجعة الشاملة — المحور ١ (حقل المالك · الربط بالاتجاهين للسجلات الأربعة · أنواع الحقول · نافذة التاريخ …) · r117: «saved by» مربوط بسجل صاحبه · حذف أربعة مفاتيح أحداث · (v3.15 لم تُنشر منفردة) r116-أ: + city الاختياري بـplaceFavoriteCounts · ب-٢-١: + save بـstats_curators // r72t (M4.26 ٧): يُرفع مع كل نشرة — يُقارن بـ settings/app.rulesVersion الذي يكتبه المالك بعد النشر باللوحة
async function checkRulesVersion(){ try{ const live = (await mpData.settings.rulesVersion()) || '—'; const ok = live === EXPECTED_RULES; logTiming('[RULES] live=' + live + ' expected=' + EXPECTED_RULES + (ok ? ' ✓' : ' ✗ DRIFT')); return { live: live, ok: ok }; }catch(e){ return { live: '?', ok: false }; } }
/* ═══ ب-٢-٢-ب (المسودة v2-ب): نوافذ المالك — اللوحة قشرةً بثلاث مجموعات؛ كل نافذة فرعية داخل dashBackdrop فوقها وتعود إليها بـBack (adminBack يحدّث العدّادات) ═══ */
function adminBack(){ closeModalById('dashBackdrop'); adminRefreshCounts(); }
async function adminRefreshCounts(){
  try{ const rq = await mpData.requests.all(); const pend = rq.filter(function(r){ return r.status === 'pending'; }).length; const el = document.getElementById('adminReqCount'); if (el) el.textContent = pend + ' pending ›'; }catch(e){}
  try{ const rp = await mpData.reports.all(); const el = document.getElementById('adminRepCount'); if (el) el.textContent = rp.filter(function(r){ return !adminIsReview(r); }).length + ' ›'; adminRevRows = rp.filter(adminIsReview).map(adminRevParse).filter(Boolean); const ev = document.getElementById('adminRevCount'); if (ev) ev.textContent = adminRevGroups().filter(function(o){ return !o.allowed && !o.blocked; }).length + ' waiting ›'; }catch(e){} /* r120 (ق١١-٢٤-١٥): قراءة واحدة للعدّادين */
  try{ const el = document.getElementById('adminCatsCount'); if (el) el.textContent = customItems.length + ' ›'; }catch(e){}
}
/* ═══ r116-ح (ق١١-١١-١٣ «نعم، فقط أ» · دَين stats-residue): بقايا العدّ بعد حذف حساب أو قائمة أو رحلة — مستندات يحمل معرّفها معرّف ما زال (stats_lists · stats_places ← القائمة · stats_trips ← الرحلة · stats_curators و stats_cards ← الحساب). القواعد تجعل حذفها لمالك التطبيق وحده، فيكنسها هو:
   مرة في اليوم عند فتح لوحة الإدارة (وبضغط سطرها) · مستند العدّ يُحذف فقط حين تثبت قراءةٌ ناجحة أن أباه غير موجود — قراءة تعذّرت لا تُعدّ غيابًا · بسقوف: صفحة لكل مجموعة، وعدد آباء يُفحصون، وعدد يُحذف · مؤشّر لكل مجموعة يكمل منه في اليوم التالي. لا تعديل قاعدة. ═══ */
const MP_RESIDUE_PAGE = 150;   /* مستندات عدّ تُسرد من كل مجموعة في الجولة */
const MP_RESIDUE_CHECKS = 40;  /* آباء مختلفون تُقرأ حالتهم في الجولة — لكل مجموعة ميزانيتها (r116 · المراجعة المستقلة ٣: كانت ميزانية واحدة تستنفدها المجموعة الأولى فلا تُبلغ التالية أبدًا) */
const MP_RESIDUE_CAP = 100;    /* مستندات تُحذف في الجولة */
const MP_RESIDUE_OF = { follows: function(id){ const p = String(id).split('_'); return p.length === 2 && p[1] ? ['users', p[1]] : null; }, /* r120 (ق١١-١٥-٠٤ — قيس: سجل متابعة من حُذف حسابه يبقى باسمه): المعرّف «متابِع_متابَع» — يُكنس حين لا يوجد المتابَع */ stats_lists: 'userCityLists', stats_places: 'userCityLists', stats_trips: 'trips', stats_curators: 'users', stats_cards: 'users',
  /* r120 (ق١١-١٤-٠٩ — قاسته محطة حذف الحساب): عدّادات مشاهدي الشهر لمحتوى حُذف، وسجلات من شاهدوه، تبقى بعد حذف صاحبه (لا يملك حذفها) — يكنسها مالك التطبيق كبقايا العدّ. الأب بحسب النوع: l قائمة · t رحلة · p حساب */
  viewerCounts: function(id){ const p = String(id).split('__'); return mpViewSrcOf(p[0], p[1]); }, viewers: function(id){ const p = String(id).split('__'); return mpViewOld(id) || mpViewSrcOf(p[1], p[2]); },
  placeViewerCounts: function(id){ const p = String(id).split('__'); return mpViewSrcOf('l', p[0]); }, placeViewers: function(id){ const p = String(id).split('__'); return mpViewOld(id) || mpViewSrcOf('l', p[1]); } }; /* r120 (ق١١-١٤-١٢): أسابيع الأماكن وسجلاتها تتبع قائمتها */
function mpViewOld(id){ return mpData.viewers.isOld(String(id).split('__').pop()) ? ['__expired__', 'week'] : null; } /* r120 (ق١١-١٤-٢٤): سجل مشاهدة مضى عليه أربعة أسابيع — يُكنس مهما كان أبوه (لمن لم يعد إلى التطبيق) */
function mpViewSrcOf(k, sid){ return !sid ? null : (k === 'l' ? ['userCityLists', sid] : (k === 't' ? ['trips', sid] : (k === 'p' ? ['users', sid] : null))); }
async function statsResidueSweep(force){
  if (!isOwner) return null; const today = todayKey(); let st = {}; try{ st = JSON.parse(localStorage.getItem('mp_residue') || '{}') || {}; }catch(_){ st = {}; }
  if (!force && st.day === today && st.last) return st.last;
  const res = { day: today, removed: 0, checked: 0, kept: 0, errors: 0, pins: 0, more: false }; const cur = Object.assign({}, st.cur || {}); const known = { '__expired__/week': false }; /* سجلات المشاهدة المنتهية مدتها: «أبوها» غير موجود بالتعريف — بلا قراءة */
  for (const coll of Object.keys(MP_RESIDUE_OF)){ let ids = []; try{ ids = await mpData.stats.pageIds(coll, cur[coll] || '', MP_RESIDUE_PAGE); }catch(e){ mpSwallow(e, 'residue list ' + coll); res.errors++; continue; }
    let last = '', stopped = false, checkedHere = 0;
    for (const id of ids){ const par = (typeof MP_RESIDUE_OF[coll] === 'function') ? MP_RESIDUE_OF[coll](id) : [MP_RESIDUE_OF[coll], String(id).split('__')[0]]; if (!par){ res.kept++; last = id; continue; } /* معرّف لا يُعرف أبوه: يبقى */ const key = par[0] + '/' + par[1];
      if (!(key in known)){ if (checkedHere >= MP_RESIDUE_CHECKS){ stopped = true; break; } checkedHere++; res.checked++; try{ known[key] = await mpData.stats.parentExists(par[0], par[1]); }catch(e){ mpSwallow(e, 'residue parent'); res.errors++; known[key] = null; /* لم تُعرف حاله: يبقى */ } }
      if (known[key] === false){ if (res.removed >= MP_RESIDUE_CAP){ stopped = true; break; } try{ await mpData.stats.remove(coll, id); res.removed++; }catch(e){ mpSwallow(e, 'residue remove'); res.errors++; } } else res.kept++;
      last = id; }
    if (stopped || ids.length >= MP_RESIDUE_PAGE){ cur[coll] = last || cur[coll] || ''; res.more = true; } else cur[coll] = ''; /* بلغ آخر المجموعة: الجولة التالية من أولها */ }
  try{ res.pins = await mpData.identity.stripBy(MP_RESIDUE_CAP); if (res.pins >= MP_RESIDUE_CAP) res.more = true; }catch(e){ mpSwallow(e, 'residue identity by'); res.errors++; } /* r120 (ق١١-١٤-٢٢): معرّف الكاتب يُنزع من الدبابيس العامة القديمة */
  try{ await statsResidueGone(res); }catch(e){ mpSwallow(e, 'residue deleted accounts'); res.errors++; }
  try{ localStorage.setItem('mp_residue', JSON.stringify({ day: today, cur: cur, last: res })); }catch(_){}
  logTiming('[RESIDUE] removed ' + res.removed + ' · parents checked ' + res.checked + ' · kept ' + res.kept + (res.errors ? ' · errors ' + res.errors : '') + (res.more ? ' · more next round' : '')); return res;
}
/* r120 (ق١١-١٧-٠٦ بند ٣ · ق١١-١٧-١٠ · قواعد v3.18 ١١ و١٢): بقايا الحسابات المحذوفة على محتوى حيّ — مفكرة · حفظ رحلة · متابعة · نسخ · مشاهدات · حجوز أسماء. قيس: الكنس لم يكن يبلغها، والعدّاد عند الغير يبقى زائدًا.
   من زال يُعرف بشاهده (علامة موجبة يكتبها حذف الحساب) لا بغياب سجله. كل سجل يُطلق من بابه القائم بعدّاده. الشاهد يُحذف بعد يوم ولا شيء باقيًا: جلسة الجهاز الثاني تنتهي في ساعة. */
const MP_RESIDUE_GONE = 20; /* شواهد تُقرأ في الجولة — شاهد نُظّف يبقى يومًا فيُقرأ ثانية؛ حدّ صغير كان يحجب عن الكنس حسابًا حُذف بعد خمسة (قيس في المحطة) */ const MP_GONE_KEEP_MS = 24 * 3600 * 1000;
async function statsResidueGone(res){ res.gone = 0; res.goneRec = 0; const dead = (await mpData.suspensions.deletedList(MP_RESIDUE_GONE)).sort(function(a, b){ return (a.at || 0) - (b.at || 0); }); /* الأقدم أولًا */
  for (const d of dead){ const uid = d.uid; let left = 0, out = 0; const pre = uid + '__';
    const door = async function(fn){ try{ const v = await fn(); if (v === 'uncounted' || v === 'released') out++; }catch(e){ mpSwallow(e, 'residue gone'); left++; } };
    const many = async function(coll, sep, fn){ let n0 = 0; try{ n0 = (await mpData.stats.idsWithPrefix(coll, uid + sep, 60)).length; }catch(e){ mpSwallow(e, 'residue gone count'); } /* العدّ قبل الإطلاق: أبواب الإطلاق تعيد «ما بقي» لا «ما أُطلق» — ولا تُمسّ هنا */ try{ const l = (await fn()) || 0; left += l; out += Math.max(0, n0 - l); }catch(e){ mpSwallow(e, 'residue gone'); left++; } };
    let ids = []; try{ ids = (await mpData.stats.idsWithPrefix('listBookmarks', pre, 60)); }catch(e){ mpSwallow(e, 'residue gone list'); left++; }
    for (const id of ids){ const listId = String(id).slice(pre.length), cut = listId.indexOf('_'); if (cut <= 0){ left++; continue; } await door(function(){ return mpData.bookmarks.toggleList(uid, listId.slice(0, cut), listId.slice(cut + 1), false, { noMirror: true }); }); }
    ids = []; try{ ids = (await mpData.stats.idsWithPrefix('tripSaves', pre, 60)); }catch(e){ mpSwallow(e, 'residue gone list'); left++; }
    for (const id of ids){ await door(function(){ return mpData.tripSaves.toggle(uid, String(id).slice(pre.length), false, { noMirror: true }); }); }
    try{ const w = await mpData.warnings.get(uid); if (w){ await mpData.warnings.remove(uid); out++; } }catch(e){ if (!e || e.code !== 'permission-denied') mpSwallow(e, 'residue warning'); } /* r120 (ق١١-٢٤-١٥ و): إنذار حساب محذوف يزول — وتعذّر قراءته لا يُبقي الشاهد مفتوحًا (المراجعة ٣٧ ٣ — قيس: قاعدة لم تُنشر كانت توقف كنس الحسابات المحذوفة كله) */
    await many('follows', '_', function(){ return mpData.follows.releaseMine(uid); }); await many('copies', '__', function(){ return mpData.copies.removeMine(uid); }); await many('viewers', '__', function(){ return mpData.viewers.removeMine(uid); }); await many('placeViewers', '__', function(){ return mpData.placeViewers.removeMine(uid); });
    let keys = []; try{ keys = await mpData.nicknames.keysOf(uid); }catch(e){ mpSwallow(e, 'residue gone names'); left++; }
    for (const k of keys){ try{ await mpData.nicknames.remove(k); out++; }catch(e){ mpSwallow(e, 'residue gone name'); left++; } }
    res.goneRec += out; if (left) res.errors++;
    if (!left && !out && d.at && Date.now() - d.at > MP_GONE_KEEP_MS){ try{ await mpData.suspensions.remove(uid); res.gone++; }catch(e){ mpSwallow(e, 'residue gone marker'); res.errors++; } } /* جولة لم تجد شيئًا والشاهد أقدم من يوم: يُحذف */
  }
  if (dead.length >= MP_RESIDUE_GONE) res.more = true; }
function statsResidueLine(r){ if (!r) return '›'; return (r.removed ? 'removed ' + r.removed : 'nothing to remove') + ((r.goneRec || r.gone) ? ' · deleted accounts: ' + (r.goneRec || 0) + ' leftover' + (r.goneRec === 1 ? '' : 's') + ' removed' + (r.gone ? ', ' + r.gone + ' closed' : '') : '') + ' · checked ' + r.checked + (r.pins ? ' · ' + r.pins + ' pins cleaned' : '') + (r.errors ? ' · ' + r.errors + ' unread' : '') + (r.more ? ' · more next time' : '') + ' ›'; }
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
function adminDate(ms){ return ms ? msDayLabel(mpDayKey(ms)) : ''; }
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
let adminRepWhat = {};
async function adminRepResolve(rows){ /* r120 (ق١١-٢٤-٠٨ ٣): البلاغ باسم المحتوى وصاحبه — قراءة واحدة لكل قائمة أو رحلة مبلَّغ عنها (فهرس القائمة يحمل أسماء أماكنها)؛ ما لا يُقرأ يبقى بمعرّفه */
  const lists = {}, trips = {}, owners = {}; const listOf = function(r){ const k = String(r.docKey || ''); if (r.kind === 'list'){ const i = k.indexOf('_'); return i > 0 ? [k.slice(0, i), k.slice(i + 1)] : null; } if (r.kind === 'place'){ const p = k.split(':'); return (p[0] && p[1]) ? [p[0], p[1]] : null; } return null; };
  rows.forEach(function(r){ const l = listOf(r); if (l){ lists[l[0] + '_' + l[1]] = l; owners[l[0]] = 1; } else if (r.kind === 'trip' && r.docKey) trips[r.docKey] = 1; else if ((r.kind === 'profile' || r.kind === 'notes') && r.docKey) owners[String(r.docKey).split('__')[0]] = 1; });
  const L = {}, T = {}; await Promise.all(Object.keys(lists).map(async function(id){ try{ L[id] = await mpData.cityLists.getIndex(lists[id][0], lists[id][1]); }catch(e){ mpSwallow(e, 'report list'); } }).concat(Object.keys(trips).map(async function(id){ try{ const d = await mpData.trips.getDoc(id); if (d.exists){ T[id] = d.data() || {}; if (T[id].ownerId) owners[T[id].ownerId] = 1; } }catch(e){ mpSwallow(e, 'report trip'); } })));
  const names = await adminNames(Object.keys(owners)); const at = function(uid){ return '@' + (names[uid] || adminName(uid, null)); }; const out = {};
  rows.forEach(function(r){ const k = String(r.docKey || ''), l = listOf(r);
    if (l){ const d = L[l[0] + '_' + l[1]]; if (!d) return; const city = d.cityName || d.cityId || l[1]; if (r.kind === 'list'){ out[r.id] = 'List “' + city + '” by ' + at(l[0]); return; }
      const p = k.split(':'); const pl = (((d.categories || {})[p[2]] || {}).places || []).find(function(q){ return q && q.id === p[3]; }); out[r.id] = ((pl && pl.name) || 'A place') + ' — in “' + city + '” by ' + at(l[0]); return; }
    if (r.kind === 'trip'){ const t = T[k]; if (t) out[r.id] = (t.dayPlan === true ? 'Day plan “' : 'Trip “') + (tripTitle(t) || 'Trip') + '” by ' + at(t.ownerId); return; }
    if (r.kind === 'profile'){ if (names[k]) out[r.id] = 'Profile of @' + names[k]; return; }
    if (r.kind === 'notes'){ const p = k.split('__'); if (names[p[0]]) out[r.id] = 'Notes on ' + ownerDashCityName(p[1]) + ' by @' + names[p[0]]; } });
  return out; }
/* ═══ r120 (ق١١-٢٤-١٢ · ق١١-٢٤-١٥): مراجعة المحتوى — التنبيهات الصامتة أسبوعًا أسبوعًا، وقرار المالك على المكان (Allowed · Block) وعلى التصنيف كاملًا.
   التنبيه سجل في مجموعة البلاغات نصّه «[review · النوع · التصنيف أو الكلمة · معرّف الخريطة] الاسم — المدينة»؛ القرار يُكتب في settings/guidelines بمفاتيح أماكن وتصنيفات وحدها. ═══ */
let adminRevRows = null, adminRevWeek = 0, adminRevTag = 'all', adminRevNames = {}, adminRevBusy = false, adminRevWarn = null; /* adminRevWarn: إنذارات الحسابات { uid: مستنده } — null حين تعذّرت قراءتها (قاعدة لم تُنشر بعد): لا زر إنذار */
function adminIsReview(r){ return !!r && r.kind === 'place' && !!r.by && String(r.docKey || '').indexOf(r.by + ':') === 0 && /^\[review · [a-z]+ · [^·\]]* · [^\]]*\] /.test(String(r.reason || '')); } /* المراجعة ٣٦ (١٠ — قيس): التنبيه يكتبه صاحب القائمة عن مكانه (المفتاح يبدأ بمعرّفه) — بلاغ كتبه غيره بهذه البادئة يبقى بلاغًا في شاشته */
function adminRevParse(r){ const m = /^\[review · ([a-z]+) · ([^·\]]*) · ([^\]]*)\] ([\s\S]*)$/.exec(String(r.reason || '')); if (!m) return null; const t = m[4], i = t.lastIndexOf(' — '); const dk = String(r.docKey || '').split(':'); const open = m[3].trim() === '-' ? '' : m[3].trim();
  const name = i >= 0 ? t.slice(0, i) : t, cityId = dk[1] || ''; return { id: r.id, kind: m[1], tag: m[2].trim(), open: open, name: name, city: i >= 0 ? t.slice(i + 3) : '', by: r.by, cityId: cityId, at: Number(r.at) || 0, lk: tkListKey(r.by, name, cityId), ok: tkOpenKey(open), trip: dk[2] === 'trip' }; } /* trip: محطة مكتوبة باليد في رحلة (ق١١-٢٤-١٦ ٤) */
function adminRevGroups(){ /* صف لكل مكان عند كل حساب: التنبيه الأول يحدّد أسبوعه ونوعه؛ «removed» و«again» أحوال عليه */ const g = {}; (adminRevRows || []).forEach(function(x){ const k = x.by + '|' + (x.lk || x.ok || x.id); const o = g[k] = g[k] || { key: k, by: x.by, name: x.name, city: x.city, cityId: x.cityId, lk: x.lk, ok: '', ids: [], tag: '', kind: '', at: 0, removedAt: 0, again: 0, trip: false };
    if (x.ok && !o.ok) o.ok = x.ok; if (x.trip) o.trip = true; o.ids.push(x.id);
    if (x.kind === 'removed'){ o.removedAt = Math.max(o.removedAt, x.at); } else if (x.kind === 'again'){ o.again++; } else if (!o.at || x.at < o.at || !o.kind){ o.kind = x.kind; o.tag = x.tag; } if (!o.at || (x.at && x.at < o.at)) o.at = x.at; });
  return Object.keys(g).map(function(k){ const o = g[k]; if (!o.kind){ o.kind = 'wait'; o.tag = 'earlier alert'; } /* تنبيهه الأول مُسح من أسبوعه — بقي تأكيد حذفه أو إعادة إضافته */ o.week = mpWeekKey(o.at || Date.now()); const d = tkDecision(o.lk, o.ok); o.allowed = d === 'allow'; o.blocked = d === 'block'; /* الحال كما يحكم به جهاز صاحب المكان — لا «Allowed» على مكان يُحذف (المراجعة ٣٦ ٧) */ return o; }).sort(function(a, b){ return b.at - a.at; }); }
function adminRevState(o){ if (o.allowed) return 'Allowed ✓'; if (o.blocked) return o.removedAt ? 'Removed ✓ ' + adminDate(o.removedAt) : 'Blocked — not removed yet'; return o.kind === 'auto' ? 'Auto-blocked' : 'Waiting'; }
function adminRevIsCat(tag){ return !!tag && !/^name: /.test(tag) && tag !== 'blocked before' && tag !== 'removed'; }
async function openAdminReview(){ if (!isOwner) return; const body = document.getElementById('dashBody'), bd = document.getElementById('dashBackdrop'); if (!body || !bd) return; dashSet('🛡 Content review', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  try{ const got = await Promise.all([mpData.reports.all(), tkGuideLoad(true), mpData.warnings.all().catch(function(e){ mpSwallow(e, 'warnings'); return null; })]); adminRevWarn = got[2]; adminRevRows = got[0].filter(adminIsReview).map(adminRevParse).filter(Boolean); adminRevNames = await adminNames(adminRevRows.map(function(x){ return x.by; }).filter(Boolean)); }
  catch(e){ mpSwallow(e, 'content review'); body.innerHTML = '<div class="mp-empty mini">Could not load — ' + escapeHtml(mpErrText(e)) + '</div><button type="button" class="dash-door" onclick="openAdminReview()"><span>↻ Retry</span><span></span></button>'; return; }
  adminRevPaint(); }
function adminRevWeekPick(n){ adminRevWeek = n; adminRevTag = 'all'; adminRevPaint(); }
function adminRevTagPick(t){ adminRevTag = t; adminRevPaint(); }
function adminRevList(){ if (adminRevWeek >= 4){ const lim = mpData.viewers.week(3); return adminRevGroups().filter(function(o){ return String(o.week) < String(lim); }); } /* المراجعة ٣٦ (١٠ — قيس): ما قبل الأسابيع الأربعة له شريحته — كان يُعدّ ولا يُبلغ */ const wk = mpData.viewers.week(adminRevWeek); return adminRevGroups().filter(function(o){ return o.week === wk; }); }
function adminRevPaint(){ const body = document.getElementById('dashBody'); if (!body || !adminRevRows) return; const all = adminRevList(); const tags = Array.from(new Set(all.map(function(o){ return o.tag; }))).sort(); if (adminRevTag !== 'all' && tags.indexOf(adminRevTag) < 0) adminRevTag = 'all';
  const list = all.filter(function(o){ return adminRevTag === 'all' || o.tag === adminRevTag; }); const wk = mpData.viewers.week(Math.min(adminRevWeek, 3)); const auto = all.filter(function(o){ return o.kind === 'auto'; }).length, waiting = all.filter(function(o){ return !o.allowed && !o.blocked; }).length;
  const act = function(fn, o, label, cls){ return '<button type="button" class="actn' + (cls ? ' ' + cls : '') + '" onclick="' + fn + '(\'' + attrStr(o.key) + '\')"' + (adminRevBusy ? ' disabled' : '') + '>' + label + '</button>'; };
  let h = '<div class="ctx" style="text-align:center;">' + (adminRevWeek >= 4 ? 'Before <b>' + escapeHtml(msWeekLbl(wk)) + '</b>' : 'Week of <b>' + escapeHtml(msWeekLbl(wk)) + '</b>') + ' · <b>' + all.length + '</b> ' + (all.length === 1 ? 'place' : 'places') + ' · ' + waiting + ' waiting · ' + auto + ' auto-blocked</div>'
    + '<div class="chiprow" style="flex-wrap:wrap;">' + [[0, 'This week'], [1, 'Last week'], [2, '2 weeks ago'], [3, '3 weeks ago'], [4, 'Older']].map(function(w){ return '<button type="button" class="chip' + (adminRevWeek === w[0] ? ' on' : '') + '" onclick="adminRevWeekPick(' + w[0] + ')">' + w[1] + '</button>'; }).join('') + '</div>'
    + (tags.length > 1 ? '<div class="chiprow" style="flex-wrap:wrap;"><button type="button" class="chip' + (adminRevTag === 'all' ? ' on' : '') + '" onclick="adminRevTagPick(\'all\')">All</button>' + tags.map(function(t){ return '<button type="button" class="chip' + (adminRevTag === t ? ' on' : '') + '" onclick="adminRevTagPick(\'' + attrStr(t) + '\')">' + escapeHtml(t) + '</button>'; }).join('') + '</div>' : '');
  if (adminRevTag !== 'all' && adminRevIsCat(adminRevTag)){ const c = adminRevTag.toLowerCase(); h += '<div class="row rowblock"><div class="pl-sub">Map category <b>' + escapeHtml(c) + '</b> · ' + (mpGuide.allowCats[c] ? 'allowed — no alert, no block' : (tkCatBanned(c) ? 'blocked automatically' : 'alert only')) + '</div><div class="acts"><button type="button" class="actn" onclick="adminRevCat(\'allow\')">Allow a whole category</button><button type="button" class="actn danger" onclick="adminRevCat(\'block\')">Block a whole category</button></div></div>'; }
  h += list.length ? list.map(function(o){ return '<div class="row rowblock"><div class="pn" dir="auto">' + escapeHtml(o.name) + ' — ' + escapeHtml(o.city) + '</div><div class="pl-sub">' + escapeHtml(o.tag) + (o.trip ? ' · trip stop' : '') + ' · by <b>@' + escapeHtml(adminRevNames[o.by] || adminName(o.by, null)) + '</b> · ' + adminDate(o.at) + (o.again ? ' · <b>Blocked before ×' + o.again + '</b>' : '') + '</div><div class="pl-sub"><b>' + escapeHtml(adminRevState(o)) + '</b>' + adminRevWarnNote(o) + '</div><div class="acts">' + (o.allowed ? '' : act('adminRevAllow', o, 'Allowed', '')) + (o.blocked ? '' : act('adminRevBlock', o, 'Block', 'danger')) + (o.blocked && adminRevWarn && !adminRevWarned(o) ? act('adminRevWarnAsk', o, '⚠ Warn', 'danger') : '') + '</div></div>'; }).join('') : '<div class="mp-empty mini">No alert in this week' + (adminRevTag === 'all' ? '' : ' for ' + escapeHtml(adminRevTag)) + '</div>';
  if (all.length) h += '<button type="button" class="dash-door" style="margin:10px 0 0;" onclick="adminRevCopy()"><span>📋 Copy this week as text</span><span></span></button><button type="button" class="dash-door danger" style="margin:6px 0 0;" onclick="adminRevClear()"><span>🗑 Clear this week</span><span>removes its ' + all.reduce(function(a, o){ return a + o.ids.length; }, 0) + ' records ›</span></button>';
  body.innerHTML = h + '<div class="kc-note kn-out" style="text-align:center; margin:10px 2px 0;">Alerts are sent silently from the list owner’s device. <b>Allowed</b> lifts any block for everyone; <b>Block</b> hides the place from everyone and its owner’s app removes it at the next open. The decision is on the place, not on the account. <b>⚠ Warn</b> appears after Block: the account sees the warning once at its next open.' + (adminRevWarn ? '' : ' Warnings could not be read — the button is hidden.') + '</div>'; }
function adminRevWarned(o){ const w = adminRevWarn && adminRevWarn[o.by]; return !!w && String(w.place || '') === String(o.name || '').slice(0, 120) && String(w.city || '') === String(o.city || '').slice(0, 80); } /* آخر إنذار للحساب كان عن هذا المكان نفسه */
function adminRevWarnNote(o){ const w = adminRevWarn && adminRevWarn[o.by]; return (w && Number(w.count) >= 1) ? ' · ⚠ warned ×' + Number(w.count) + ' · last ' + escapeHtml(adminDate(w.at)) + (adminRevWarned(o) ? ' — for this place' : '') : ''; }
async function adminRevWarnAsk(key){ /* ق١١-٢٤-١٥ (هـ · و): إنذار بضغطة من المالك بعد الحجب — يُكتب في warnings/{uid}؛ العدد يُقرأ من الخادم لحظتها لا من الشاشة */ const o = adminRevFind(key); if (!isOwner || !o || !o.blocked || !adminRevWarn || adminRevBusy) return; const nm = adminRevNames[o.by] || adminName(o.by, null); const prev = adminRevWarn[o.by] || null;
  if (!(await mpConfirm('@' + nm + ' sees this once at the next open of the app, and it stays as a line in their Settings: “' + o.name + '”' + (o.city ? ' in ' + o.city : '') + ' is outside the content rules and was hidden. If this happens again, your account may be suspended.' + (prev && Number(prev.count) >= 1 ? ' — This account was warned ' + Number(prev.count) + (Number(prev.count) === 1 ? ' time' : ' times') + ' before.' : ''), { title: 'Send a warning?', ok: 'Send warning', danger: true }))) return;
  adminRevBusy = true; adminRevPaint();
  try{ const cur = await mpData.warnings.get(o.by); const cnt = Math.min(99, ((cur && Number(cur.count)) || 0) + 1); const w = { count: cnt, at: Date.now(), place: String(o.name || '').slice(0, 120) }; if (o.city) w.city = String(o.city).slice(0, 80); if (o.tag) w.why = String(o.tag).slice(0, 120);
    await mpData.warnings.set(o.by, w); adminRevWarn[o.by] = w; adminRevBusy = false; adminRevPaint(); showToast('Warning ' + cnt + ' sent to @' + nm + ' — shown at their next open'); }
  catch(e){ mpSwallow(e, 'warning'); adminRevBusy = false; mpErrToast('Could not send the warning', e); adminRevPaint(); } }
async function adminRevSave(mut){ /* القوائم تُقرأ من جديد ثم تُكتب كاملة — قرار على لوحة قديمة لا يمحو قرارًا أحدث منها */ if (!isOwner || adminRevBusy) return false; adminRevBusy = true; adminRevPaint();
  try{ const d0 = await mpData.settings.guidelines(); tkGuideApply(d0); /* المراجعة ٣٦ (٢ — قيس): قراءة صريحة — إن تعذّرت لا يُكتب شيء؛ كانت تعود بما في الذاكرة فيُكتب فوق قرارات غيره */ const g = { allowCats: Object.assign({}, mpGuide.allowCats), blockCats: Object.assign({}, mpGuide.blockCats), allowPlaces: Object.assign({}, mpGuide.allowPlaces), blockPlaces: Object.assign({}, mpGuide.blockPlaces) }; mut(g); await mpData.settings.saveGuidelines(g); tkGuideApply(g); adminRevBusy = false; adminRevPaint(); return true; }
  catch(e){ mpSwallow(e, 'review decision'); adminRevBusy = false; mpErrToast('Could not save the decision', e); adminRevPaint(); return false; } }
function adminRevFind(key){ return adminRevGroups().find(function(o){ return o.key === key; }); }
async function adminRevAllow(key){ const o = adminRevFind(key); if (!o) return; const ks = [o.lk, o.ok].filter(Boolean); if (!ks.length){ showToast('This place has no name or map id to decide by'); return; } if (await adminRevSave(function(g){ ks.forEach(function(q){ g.allowPlaces[q] = 1; delete g.blockPlaces[q]; }); })) showToast('Allowed — any block on it is lifted for everyone'); }
async function adminRevBlock(key){ const o = adminRevFind(key); if (!o) return; if (!(await mpConfirm('“' + o.name + '” is hidden from everyone, and its owner’s app removes it at the next open. This is your decision after checking the place.', { title: 'Block this place?', ok: 'Block', danger: true }))) return;
  const ks = [o.lk, o.ok].filter(Boolean); if (!ks.length){ showToast('This place has no name or map id to decide by'); return; }
  if (await adminRevSave(function(g){ const at = Date.now(); if (o.lk){ g.blockPlaces[o.lk] = o.ok ? { at: at, o: o.ok } : { at: at }; delete g.allowPlaces[o.lk]; } if (o.ok){ g.blockPlaces[o.ok] = { at: at }; delete g.allowPlaces[o.ok]; } })) showToast('Blocked — hidden from everyone'); } /* المراجعة ٣٦ (١٣ — قيس): لا اسم ولا مدينة في المستند المقروء للجميع — مفاتيح ووقت فقط */
async function adminRevCat(what){ const c = String(adminRevTag || '').toLowerCase(); if (!adminRevIsCat(adminRevTag)) return; const ok = await mpConfirm(what === 'allow' ? 'Places of the map category “' + c + '” are no longer blocked or reported, for everyone.' : 'Every place the map puts in “' + c + '” is blocked automatically from now on, for everyone.', { title: (what === 'allow' ? 'Allow' : 'Block') + ' the whole category?', ok: what === 'allow' ? 'Allow' : 'Block', danger: what !== 'allow' }); if (!ok) return;
  if (await adminRevSave(function(g){ if (what === 'allow'){ g.allowCats[c] = 1; delete g.blockCats[c]; } else { g.blockCats[c] = 1; delete g.allowCats[c]; } })) showToast(what === 'allow' ? 'Category allowed' : 'Category blocked'); }
function adminRevText(){ const wk = mpData.viewers.week(Math.min(adminRevWeek, 3)); const all = adminRevList(); return ['MyPickz — content review', (adminRevWeek >= 4 ? 'Before ' : 'Week of ') + msWeekLbl(wk) + ' · ' + all.length + (all.length === 1 ? ' place' : ' places'), ''].concat(all.map(function(o, i){ return (i + 1) + '. ' + o.name + ' — ' + o.city + ' · ' + o.tag + (o.trip ? ' · trip stop' : '') + ' · by @' + (adminRevNames[o.by] || adminName(o.by, null)) + ' · ' + adminRevState(o) + (o.again ? ' · blocked before ×' + o.again : ''); })).join('\n'); }
async function adminRevCopy(){ try{ await navigator.clipboard.writeText(adminRevText()); showToast('Week copied — paste it anywhere'); }catch(e){ mpErrToast('Could not copy', e); } }
async function adminRevClear(){ const all = adminRevList(); const ids = [].concat.apply([], all.map(function(o){ return o.ids; })); if (!ids.length) return; if (!(await mpConfirm('The ' + ids.length + ' alert records of this week are removed. Your Allowed and Block decisions stay.', { title: 'Clear this week?', ok: 'Clear', danger: true }))) return;
  let done = 0; try{ for (let i = 0; i < ids.length; i++){ await mpData.reports.remove(ids[i]); done++; } }catch(e){ mpSwallow(e, 'review clear'); mpErrToast('Could not remove all — ' + done + ' of ' + ids.length + ' removed', e); } openAdminReview(); }
async function openAdminReports(){
  const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd) return;
  dashSet('⚑ Reports', adminBack); body.innerHTML = '<div class="mp-empty mini">Loading…</div>'; bd.classList.add('show');
  let rows = []; try{ rows = (await mpData.reports.all()).filter(function(r){ return !adminIsReview(r); }); /* r120 (ق١١-٢٤-١٥): تنبيهات المراجعة لها شاشتها */ }catch(e){ mpSwallow(e, 'reports'); body.innerHTML = '<div class="mp-empty mini">Could not load reports</div><button type="button" class="dash-door" onclick="openAdminReports()"><span>↻ Retry</span><span></span></button>'; return; }
  rows.sort(function(a, b){ return (b.at || 0) - (a.at || 0); }); adminRepRows = rows; adminRepNames = await adminNames(rows.map(function(r){ return r.by; }).filter(Boolean)); adminRepWhat = {}; try{ adminRepWhat = await adminRepResolve(rows); }catch(e){ mpSwallow(e, 'report names'); }
  renderAdminReports();
}
function renderAdminReports(){
  const body = document.getElementById('dashBody'); const rows = adminRepRows || []; const kinds = ['all'].concat(Array.from(new Set(rows.map(function(r){ return r.kind || 'other'; }))));
  if (kinds.indexOf(adminRepFilter) < 0) adminRepFilter = 'all';
  const list = rows.filter(function(r){ return adminRepFilter === 'all' || (r.kind || 'other') === adminRepFilter; });
  body.innerHTML = '<div class="ctx" style="text-align:center;"><b>' + rows.length + '</b> open</div>' + (rows.length ? '<div class="chiprow" style="flex-wrap:wrap;">' + kinds.map(function(k){ return '<button type="button" class="chip' + (adminRepFilter === k ? ' on' : '') + '" onclick="adminRepPick(\'' + attrStr(k) + '\')">' + escapeHtml(k === 'all' ? 'All' : k) + '</button>'; }).join('') + '</div>' : '')
    + (list.length ? list.map(function(r){ const p = adminParseReport(r); return '<div class="row rowblock"><div class="pn" dir="auto">⚑ ' + escapeHtml(adminRepWhat[r.id] || p.title) + '</div><div class="pl-sub">reported by <b>' + escapeHtml(adminRepNames[r.by] || adminName(r.by, null)) + '</b> · ' + adminDate(r.at) + (p.screen ? ' · screen ' + escapeHtml(p.screen) : '') + (p.build ? ' · ' + escapeHtml(p.build) : '') + '</div>' + (p.text ? '<div class="pl-sub">«' + escapeHtml(p.text) + '»</div>' : '')
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
  body.innerHTML = '<div class="ctx" style="text-align:center;">Pick a curator to read their stats</div>' + (list.length ? list.map(function(c){ return '<button type="button" class="dash-door" onclick="openMyStats(\'' + attrStr(c.uid) + '\', openAdminCuratorPicker)"><span>' + curMark(true) + escapeHtml(curName(c)) + '</span><span>' + (typeof c.followerCount === 'number' ? c.followerCount + ' followers ›' : '›') + '</span></button>'; }).join('') : '<div class="mp-empty mini">No badged curators yet</div>');
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
  body.innerHTML = '<div class="row rowblock" style="text-align:center;"><div class="pn">' + escapeHtml(nick) + '</div><div class="pl-sub">' + escapeHtml(u.email || '') + (u.firstSeen ? ' · joined ' + adminDate(u.firstSeen) : '') + (u.lastSeen ? ' · last seen ' + adminDate(u.lastSeen) : '') + '</div><div class="ubadges" style="justify-content:center;">' + (d.publicSet.has(uid) ? '<span class="pl-flag ubadge">Public</span>' : '') + (isCur ? '<span class="curvb ubadge">✧ ' + CUR_BADGE + '</span>' : '') + (u.suspended ? '<span class="pl-flag ubadge danger">Suspended</span>' : '') + '</div></div>'
    + '<button type="button" class="dash-door" onclick="toggleCuratorUser(\'' + attrStr(uid) + '\')"><span>✧ Curator badge</span><span>' + (isCur ? 'On → Remove' : 'Off → Grant') + '</span></button>'
    + '<button type="button" class="dash-door" onclick="openMyStats(\'' + attrStr(uid) + '\', function(){ openAdminUserCard(\'' + attrStr(uid) + '\'); })"><span>📊 View stats</span><span>reach · lists ›</span></button>'
    + '<div id="adminUserWarn" data-uid="' + attrVal(uid) + '"></div>' /* r120 (ق١١-٢٤-١٥ و): إنذارات المحتوى فوق الإيقاف */
    + '<button type="button" class="dash-door' + (u.suspended ? '' : ' danger') + '" onclick="toggleSuspendUser(\'' + attrStr(uid) + '\')"><span>' + (u.suspended ? '✅ Unsuspend' : '⛔ Suspend') + '</span><span>' + (u.suspended ? 'restores everything' : 'holds public & shared content') + '</span></button>'
    + '<div class="ctx">' + (u.suspended ? 'Unsuspend restores all public lists and trips as they were — review the content first (owner gate).' : 'Suspend holds every public list and trip and the shared-by-name access. Unsuspend restores everything.') + '</div>';
  adminUserWarnPaint(uid);
}
async function adminUserWarnPaint(uid){ let w = null; try{ w = await mpData.warnings.get(uid); }catch(e){ mpSwallow(e, 'warning read'); return; } const el = document.getElementById('adminUserWarn'); if (!el || el.getAttribute('data-uid') !== uid) return;
  el.innerHTML = (w && Number(w.count) >= 1) ? '<div class="dash-door plain"><span>⚠ Content warnings ×' + Number(w.count) + '<small class="dsub" dir="auto">last ' + escapeHtml(adminDate(w.at)) + ' — “' + escapeHtml(w.place || '') + '”' + (w.city ? ' in ' + escapeHtml(w.city) : '') + '</small></span><span><button type="button" class="lnk" onclick="adminUserWarnClear(\'' + attrStr(uid) + '\')">Clear</button></span></div>' : ''; }
async function adminUserWarnClear(uid){ if (!isOwner) return; if (!(await mpConfirm('The warnings of this account are removed, and the line leaves their Settings.', { title: 'Clear the warnings?', ok: 'Clear', danger: true }))) return;
  try{ await mpData.warnings.remove(uid); if (adminRevWarn) delete adminRevWarn[uid]; showToast('Warnings cleared'); adminUserWarnPaint(uid); }catch(e){ mpSwallow(e, 'warning clear'); mpErrToast('Could not clear the warnings', e); } }
