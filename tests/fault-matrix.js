// MyPickz — tests/fault-matrix.js (r99 · ق١١-٠٣-٠٢ · ٣ نوفمبر ٢٠٢٦): فهرس القدرات لمصفوفة الإفشال
// كل قدرة: id · name · kind (read|write) · setup/action/cleanup (مصدر JS يُنفَّذ داخل نطاق التطبيق عبر الجسر) · bad (إدخالات فاسدة) · na (أنماط غير منطبقة بسببها) · invariant (لنمط التزامن)
// المشغّل في tests/journey.js (faultCell) — هذا الملف يصف القدرات فقط ولا يصلح شيئًا.
'use strict';
const WAIT = "await new Promise(function(r){ setTimeout(r, 80); });";
const READ_NA = { bad: 'لا إدخال', concurrency: 'قراءة — لا كتابة', stale: 'قراءة — لا كتابة' };

/* ── الأماكن: مدينة ثابتة fmA بأماكنها ── */
const PL_CITY = "window.__fm = window.__fm || {}; if (!__fm.prevCity){ __fm.prevCity = cityListCityId; __fm.prevCountry = cityListCountry; }"
  + " var uid = currentUser.uid; var mk = function(id, name, lat, lng, extra){ return Object.assign({ id: id, name: name, url: 'https://maps.app.goo.gl/' + id, area: 'Old Town', geo: { lat: lat, lng: lng } }, extra || {}); };"
  + " await mpData.cityLists.save(uid, 'fmA', { ownerId: uid, cityId: 'fmA', cityName: 'Faultville', public: false, sharedWith: [], catsV: CATS_VERSION, categories: { coffee: { active: true, places: [mk('f1', 'Fault Cafe', 48.86, 2.35, { openId: 'ovt:f1' }), mk('f2', 'Second Cafe', 48.861, 2.351), mk('f3', 'Brienz Cafe', 48.9, 2.4, { town: 'Brienz' })] }, hotels: { active: true, places: [mk('f4', 'Fault Inn', 48.862, 2.352, { openId: 'ovt:f1' })] } } });"
  + " userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== 'fmA' && c.id !== 'fmB'; }).concat([{ id: 'fmA', name: 'Faultville', country: 'Testland', lat: 48.86, lng: 2.35 }, { id: 'fmB', name: 'Faultburg', country: 'Testland', lat: 48.9, lng: 2.4 }]);"
  + " await mpData.cityLists.save(uid, 'fmB', { ownerId: uid, cityId: 'fmB', cityName: 'Faultburg', public: false, sharedWith: [], catsV: CATS_VERSION, categories: { coffee: { active: true, places: [mk('g1', 'Burg Cafe', 48.9, 2.4)] } } });"
  + " cityListCountry = 'Testland'; cityListCityId = 'fmA'; placesSource = 'mine'; plView = 'list'; plPanel = null; plFilterMain = ''; plFilterSub = ''; plTownSel = ''; cmUndo = null; myCityListLoadedFor = null; myCityListData = null; await loadMyCityList('fmA'); plSecCollapsed['cafes_sweets'] = false; renderPlacesMine(); " + WAIT;
const PL_CLEAN = "try{ closePlPlaceModal(); }catch(_){} plEdit = null; plMoveMode = false; cmUndo = null; myCityListLoadedFor = null; myCityListData = null; cityListCityId = __fm.prevCity; cityListCountry = __fm.prevCountry; await loadMyCityList(cityListCityId); renderPlacesMine(); " + WAIT;

const PLACES = { id: 'places', name: 'الأماكن', caps: [
  { id: 'places.open', name: 'فتح مدينة', kind: 'read', na: READ_NA,
    setup: PL_CITY + " myCityListLoadedFor = null; myCityListData = null;",
    action: "await loadMyCityList('fmA'); renderPlacesMine(); " + WAIT, cleanup: PL_CLEAN },
  { id: 'places.add', name: 'إضافة مكان', kind: 'write',
    setup: PL_CITY, invariant: "(userGetEntry('coffee').places || []).filter(function(p){ return p.name === 'New Fault Place'; }).length <= 1",
    action: "openPlPlaceModal('coffee', null); document.getElementById('plName').value = 'New Fault Place'; document.getElementById('plUrl').value = 'https://maps.app.goo.gl/newf'; await savePlPlace(); " + WAIT,
    bad: ["openPlPlaceModal('coffee', null); document.getElementById('plName').value = ''; document.getElementById('plUrl').value = ''; await savePlPlace(); " + WAIT,
          "openPlPlaceModal('coffee', null); document.getElementById('plName').value = 'x'.repeat(5000); document.getElementById('plUrl').value = 'https://maps.app.goo.gl/long'; await savePlPlace(); " + WAIT,
          "openPlPlaceModal('coffee', null); document.getElementById('plName').value = '<img src=x onerror=alert(1)> مقهى 🍵'; document.getElementById('plUrl').value = 'javascript:alert(1)'; await savePlPlace(); " + WAIT,
          "openPlPlaceModal('coffee', null); document.getElementById('plName').value = 'Not maps'; document.getElementById('plUrl').value = 'https://example.com/not-maps'; await savePlPlace(); " + WAIT],
    cleanup: PL_CLEAN },
  { id: 'places.edit', name: 'تعديل مكان', kind: 'write',
    setup: PL_CITY, invariant: "(userGetEntry('coffee').places || []).length === 3",
    action: "openPlPlaceModal('coffee', 0); document.getElementById('plName').value = 'Fault Cafe Edited'; await savePlPlace(); " + WAIT,
    bad: ["openPlPlaceModal('coffee', 0); document.getElementById('plName').value = ''; await savePlPlace(); " + WAIT,
          "openPlPlaceModal('coffee', 0); document.getElementById('plUrl').value = 'ftp://nowhere'; await savePlPlace(); " + WAIT],
    cleanup: PL_CLEAN },
  { id: 'places.delete', name: 'حذف مكان', kind: 'write',
    setup: PL_CITY, invariant: "(userGetEntry('coffee').places || []).length === 2",
    action: "await plDeleteRow('coffee', 1); " + WAIT, cleanup: PL_CLEAN },
  { id: 'places.moveCat', badKind: 'ids', name: 'نقل مكان إلى تصنيف آخر', kind: 'write',
    setup: PL_CITY, invariant: "(userGetEntry('coffee').places || []).length + (userGetEntry('hotels').places || []).length === 4",
    action: "openPlPlaceModal('coffee', 1); plMoveMode = true; await plMovePlaceTo('hotels'); " + WAIT,
    bad: ["openPlPlaceModal('coffee', 1); plMoveMode = true; await plMovePlaceTo('no_such_cat'); " + WAIT, "openPlPlaceModal('coffee', 1); plMoveMode = true; await plMovePlaceTo(''); " + WAIT],
    cleanup: PL_CLEAN },
  { id: 'places.pinPlus', badKind: 'ids', name: 'تثبيت برمز Plus', kind: 'write',
    setup: PL_CITY + " userGetEntry('coffee').places[1].geo = null; delete userGetEntry('coffee').places[1].geo; await saveMyCityList(); renderPlacesMine(); " + WAIT,
    invariant: "!!(userGetEntry('coffee').places[1].geo)",
    action: "await tkPinFromGoogleApply(plSugKey(userGetEntry('coffee').places[1]), '8FW4V75V+8Q'); " + WAIT,
    bad: ["await tkPinFromGoogleApply(plSugKey(userGetEntry('coffee').places[1]), ''); " + WAIT, "await tkPinFromGoogleApply(plSugKey(userGetEntry('coffee').places[1]), 'not a plus code at all'); " + WAIT, "await tkPinFromGoogleApply('mine:no-such-key', '8FW4V75V+8Q'); " + WAIT],
    cleanup: PL_CLEAN },
  { id: 'places.bookmark', badKind: 'ids', name: 'حفظ مكان من قائمة غيري (Bookmark)', kind: 'write',
    setup: PL_CITY + " await mpData.cityLists.save('" + 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB' + "', 'fmA', { ownerId: '" + 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB' + "', cityId: 'fmA', cityName: 'Faultville', public: true, sharedWith: [], catsV: CATS_VERSION, categories: { coffee: { active: true, places: [mk('o1', 'Other Cafe', 48.87, 2.36)] } } }); userListData.placeBookmarks = userListData.placeBookmarks || {}; delete userListData.placeBookmarks['https://maps.app.goo.gl/o1'];",
    invariant: "Object.keys(userListData.placeBookmarks || {}).filter(function(k){ return k === 'https://maps.app.goo.gl/o1'; }).length <= 1",
    action: "await togglePlaceBookmark('https://maps.app.goo.gl/o1', 'Other Cafe', 'coffee', 'fmA', 'Old Town', 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'https://maps.app.goo.gl/o1'); " + WAIT,
    bad: ["await togglePlaceBookmark('', '', '', '', '', '', ''); " + WAIT, "await togglePlaceBookmark('javascript:x', 'x'.repeat(3000), 'coffee', 'fmA', '', 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'javascript:x'); " + WAIT],
    cleanup: "delete (userListData.placeBookmarks || {})['https://maps.app.goo.gl/o1']; " + PL_CLEAN },
  { id: 'places.dupKeep', name: 'Duplicates → Keep this', kind: 'write',
    setup: PL_CITY, invariant: "(userGetEntry('coffee').places || []).length + (userGetEntry('hotels').places || []).length >= 3",
    action: "var g = cmDupGroups(myCityListData.categories); if (!g.length) throw new Error('fixture: no dup group'); await cmDupKeep(0, 0); " + WAIT,
    cleanup: PL_CLEAN },
  { id: 'places.townRemove', badKind: 'ids', name: 'حذف بلدة مضمومة', kind: 'write',
    setup: PL_CITY, invariant: "(userGetEntry('coffee').places || []).filter(function(p){ return p.town === 'Brienz'; }).length === 0",
    action: "await cmTownRemove('fmA', 'Brienz'); " + WAIT,
    bad: ["await cmTownRemove('fmA', ''); " + WAIT, "await cmTownRemove('fmA', 'NoSuchTown'); " + WAIT, "await cmTownRemove('fmB', 'Brienz'); " + WAIT],
    cleanup: PL_CLEAN },
  { id: 'places.merge', badKind: 'ids', name: 'Merge into another city + Undo', kind: 'write',
    setup: PL_CITY, invariant: "!!(await mpData.cityLists.get(currentUser.uid, 'fmB'))",
    action: "await cmMerge('fmA', 'fmB'); " + WAIT + " if (cmUndo) await cmUndoLast(); " + WAIT,
    bad: ["await cmMerge('fmA', 'fmA'); " + WAIT, "await cmMerge('fmA', 'no_such_city'); " + WAIT, "await cmMerge('', 'fmB'); " + WAIT],
    cleanup: "userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== 'fmA' && c.id !== 'fmB'; }).concat([{ id: 'fmA', name: 'Faultville', country: 'Testland', lat: 48.86, lng: 2.35 }, { id: 'fmB', name: 'Faultburg', country: 'Testland', lat: 48.9, lng: 2.4 }]); " + PL_CLEAN },
] };

/* ── الرحلات ── */
const U2 = 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const TR_SETUP = PL_CITY + " tripsLoaded = true; userTrips = (userTrips || []).filter(function(t){ return !/^fmt/.test(t.id); }); __fm.trips0 = userTrips.map(function(t){ return t.id; }); /* r100-ب: ما تصنعه الخلية من رحلات يُزال في التنظيف — كان يتراكم فيُكذّب ثابت التزامن */ delete TB_PLACES['fmA|mine']; delete TB_PLACES['fmA']; currentTripId = null; TB = null;"
  + " var trip = { id: 'fmt1', ownerId: uid, title: 'Fault Trip', cityId: 'fmA', cities: [{ cityId: 'fmA', name: 'Faultville', days: 1 }], status: 'planned', plan: { days: [{ periods: { morning: [{ id: 'e-host', ref: { cityId: 'fmA', subcatId: 'coffee', id: 'f1' }, name: 'Fault Cafe', alts: [{ id: 'e-alt', ref: { cityId: 'fmA', subcatId: 'coffee', id: 'f2' }, name: 'Second Cafe', alts: [] }] }], noon: [], afternoon: [], evening: [] } }] }, __saved: true };"
  + " await mpData.trips.save(trip); userTrips.push(trip); await mpData.nicknames.set('faultfriend', { uid: '" + 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB' + "' }); await mpData.users.merge('" + 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB' + "', { nickname: 'faultfriend' }); " + WAIT;
const TR_CLEAN = "try{ tbClose(); }catch(_){} try{ closeModalById('tripBackdrop'); }catch(_){} TB = null; currentTripId = null; var __keep = {}; (__fm.trips0 || []).forEach(function(i){ __keep[i] = true; }); var __gone = (userTrips || []).filter(function(t){ return !__keep[t.id]; }); userTrips = (userTrips || []).filter(function(t){ return __keep[t.id] && !/^fmt/.test(t.id); }); for (var gi = 0; gi < __gone.length; gi++){ try{ await mpData.trips.remove(__gone[gi].id); }catch(_){} } for (var i = 0; i < 3; i++){ try{ await mpData.trips.remove('fmt' + i); }catch(_){} } try{ await mpData.trips.remove('fmt1'); }catch(_){} " + PL_CLEAN;
const TRIPS = { id: 'trips', name: 'الرحلات', caps: [
  { id: 'trips.openBuilder', name: 'فتح المنشئ لمدينة', kind: 'read', na: READ_NA, setup: TR_SETUP, action: "await openTripBuilder({ cityId: 'fmA' }); " + WAIT, cleanup: TR_CLEAN },
  { id: 'trips.build', name: 'بناء رحلة وحفظها', kind: 'write', setup: TR_SETUP, invariant: "(userTrips || []).filter(function(t){ return t.cityId === 'fmA' && t.id !== 'fmt1'; }).length <= 1",
    action: "await openTripBuilder({ cityId: 'fmA' }); tbSetDays(1); tbPickAll(true); await tbBuild(); await tbSaveNow(); tbClose(); " + WAIT,
    bad: ["await openTripBuilder({ cityId: 'fmA' }); tbSetDays(0); tbClose(); " + WAIT, /* r100-ج: ٠ أيام → رسالة ولا بناء */ "await openTripBuilder({ cityId: 'fmA' }); tbSetDays(1); await tbBuild(); await tbSaveNow(); tbClose(); " + WAIT, "await openTripBuilder({ cityId: 'no_such_city' }); " + WAIT],
    cleanup: TR_CLEAN },
  { id: 'trips.open', name: 'فتح رحلة محفوظة', kind: 'read', na: READ_NA, setup: TR_SETUP, action: "await openTripDetail('fmt1'); " + WAIT, cleanup: TR_CLEAN },
  { id: 'trips.promote', badKind: 'ids', name: 'ترقية بديل إلى المحطة', kind: 'write', setup: TR_SETUP + " await openTripDetail('fmt1'); " + WAIT, invariant: "(function(){ var t = userTrips.find(function(x){ return x.id === 'fmt1'; }); return !!t && t.plan.days[0].periods.morning.length === 1; })()",
    action: "await tripViewPromote('e-host', 'e-alt'); " + WAIT,
    bad: ["await tripViewPromote('no-such-host', 'no-such-alt'); " + WAIT], cleanup: TR_CLEAN },
  { id: 'trips.share', name: 'مشاركة رحلة باسم مستخدم', kind: 'write', na: { concurrency: 'الفعل يمرّ بنافذة إدخال واحدة — فتحها مرتين معًا مستحيل من الواجهة (كانت خضراء في r99 بنافذة مزيّفة تسرّبت من محطة ١٦هـ)' }, setup: TR_SETUP + " currentTripId = 'fmt1';", invariant: "(function(){ var t = userTrips.find(function(x){ return x.id === 'fmt1'; }); return !t || (t.sharedWith || []).filter(function(u){ return u === '" + 'uBBBBBBBBBBBBBBBBBBBBBBBBBBB' + "'; }).length <= 1; })()",
    action: "var p = shareTripWithSomeone(); " + WAIT + " var f = document.getElementById('inputModalField'); if (f){ f.value = 'faultfriend'; confirmInputModal(); } await p; " + WAIT,
    bad: ["var p = shareTripWithSomeone(); " + WAIT + " var f = document.getElementById('inputModalField'); if (f){ f.value = ''; confirmInputModal(); } await p; " + WAIT, "var p = shareTripWithSomeone(); " + WAIT + " var f = document.getElementById('inputModalField'); if (f){ f.value = 'no_such_user_xyz'; confirmInputModal(); } await p; " + WAIT, "var p = shareTripWithSomeone(); " + WAIT + " var f = document.getElementById('inputModalField'); if (f){ f.value = '<b>x</b>'.repeat(200); confirmInputModal(); } await p; " + WAIT],
    cleanup: TR_CLEAN },
  { id: 'trips.delete', badKind: 'ids', name: 'حذف رحلة', kind: 'write', setup: TR_SETUP, invariant: "true", action: "await deleteTripById('fmt1'); " + WAIT, bad: ["await deleteTripById('no_such_trip'); " + WAIT, "await deleteTripById(''); " + WAIT], cleanup: TR_CLEAN },
  { id: 'trips.dayPlan', name: 'خطة اليوم: بناء وحفظ', kind: 'write', setup: TR_SETUP, invariant: "(userTrips || []).filter(function(t){ return t.dayPlan && t.cityId === 'fmA'; }).length <= 1",
    action: "await openTripBuilder({ cityId: 'fmA', dayPlan: true }); tbPickAll(true); await tbBuild(); await tbSaveNow(); tbClose(); " + WAIT, cleanup: TR_CLEAN },
  { id: 'trips.dayPlanCopy', badKind: 'ids', name: 'نسخ خطة يوم إلى رحلة', kind: 'write', setup: TR_SETUP + " var dp = { id: 'fmt2', ownerId: uid, title: 'Fault Day', cityId: 'fmA', dayPlan: true, cities: [{ cityId: 'fmA', name: 'Faultville', days: 1 }], plan: { days: [{ periods: { morning: [{ ref: { cityId: 'fmA', subcatId: 'coffee', id: 'f2' }, name: 'Second Cafe', alts: [] }], noon: [], afternoon: [], evening: [] } }] }, __saved: true }; await mpData.trips.save(dp); userTrips.push(dp);",
    invariant: "(function(){ var t = userTrips.find(function(x){ return x.id === 'fmt1'; }); return !t || t.plan.days.length <= 2; })()",
    action: "await dpAddToTrip('fmt2', 'fmt1', { mode: 'new' }); " + WAIT, bad: ["await dpAddToTrip('no_plan', 'fmt1', { mode: 'new' }); " + WAIT, "await dpAddToTrip('fmt2', 'no_trip', { mode: 'new' }); " + WAIT, "await dpAddToTrip('fmt2', 'fmt1', 'nowhere'); " + WAIT], cleanup: TR_CLEAN },
] };

/* ── الاستيراد ── */
const TK_SETUP = PL_CITY + " tkOpenImport(); window.__fm.tkDocs = {}; for (const c of ['paris', 'isl', '3028808']){ try{ __fm.tkDocs[c] = await mpData.cityLists.get(uid, c); }catch(_){ __fm.tkDocs[c] = null; } } tkState.phase = 'intro'; tkState.plan = null; tkState.busy = false; tkState.err = ''; sessionStorage.removeItem(tkResumeKey()); localStorage.removeItem('mp_import_runs');"
  + " await tkFilesChosen([{ name: 'takeout-test.zip', arrayBuffer: async function(){ return globalThis.__tkZip; } }]); " + WAIT + " tkToggleCity('isl', true); tkToggleCity('3028808', true);";
const TK_CLEAN = "try{ closeModalById('dashBackdrop'); }catch(_){} tkState.phase = 'intro'; tkState.plan = null; tkState.busy = false; localStorage.removeItem('mp_import_runs'); sessionStorage.removeItem(tkResumeKey()); for (const c of Object.keys(__fm.tkDocs || {})){ const d = __fm.tkDocs[c]; try{ if (d && d.cityId) await mpData.cityLists.save(currentUser.uid, c, d); else await mpData.cityLists.remove(currentUser.uid, c); }catch(_){} } " + PL_CLEAN;
const IMPORT = { id: 'import', name: 'الاستيراد', caps: [
  { id: 'import.files', name: 'قراءة الملفات وبناء الخطة', kind: 'read', na: READ_NA, setup: PL_CITY + " tkOpenImport(); tkState.phase = 'intro'; tkState.plan = null; tkRender();", action: "await tkFilesChosen([{ name: 'takeout-test.zip', arrayBuffer: async function(){ return globalThis.__tkZip; } }]); " + WAIT, cleanup: TK_CLEAN },
  { id: 'import.filesBad', name: 'ملفات فاسدة', kind: 'read', na: { network: 'لا شبكة في القراءة المحلية', permission: 'لا إذن في القراءة المحلية', partial: 'لا مستند', concurrency: 'قراءة — لا كتابة', stale: 'قراءة — لا كتابة' }, setup: PL_CITY + " tkOpenImport(); tkState.phase = 'intro'; tkState.plan = null; tkRender();",
    action: "", bad: ["await tkFilesChosen([{ name: 'notes.txt', arrayBuffer: async function(){ return new TextEncoder().encode('hello').buffer; } }]); " + WAIT, "await tkFilesChosen([{ name: 'empty.zip', arrayBuffer: async function(){ return new ArrayBuffer(0); } }]); " + WAIT, "await tkFilesChosen([{ name: 'Want to go.csv', arrayBuffer: async function(){ return new TextEncoder().encode('Title,Note\\n' + 'x,'.repeat(50000)).buffer; } }]); " + WAIT], cleanup: TK_CLEAN },
  { id: 'import.commit', name: 'الالتزام (نقل الأماكن إلى القوائم)', kind: 'write', setup: TK_SETUP, invariant: "(function(){ var r = tkState.result || {}; return !r.failed; })()", action: "await tkCommit(); " + WAIT, cleanup: TK_CLEAN },
  { id: 'import.undo', name: 'Undo last import', kind: 'write', setup: TK_SETUP + " await tkCommit(); " + WAIT + " tkState.phase = 'intro';", invariant: "true", action: "tkUndoOpen(); " + WAIT + " await tkUndoGo(); " + WAIT, cleanup: TK_CLEAN },
  { id: 'import.pinSuggested', badKind: 'ids', name: 'تثبيت اقتراح من بياناتنا', kind: 'write', setup: PL_CITY + " userGetEntry('coffee').places[1].geo = null; delete userGetEntry('coffee').places[1].geo; await saveMyCityList(); var k = plSugKey(userGetEntry('coffee').places[1]); plSuggestCache[k] = { lat: 48.8615, lng: 2.3515, openId: 'ovt:sec', source: 'overture', cat: 'cafe', city: 'fmA', cname: 'Second Cafe', alts: [] }; renderPlacesMine(); " + WAIT,
    invariant: "!!(userGetEntry('coffee').places[1].geo)", action: "await tkPinSuggested(plSugKey(userGetEntry('coffee').places[1]), 0); " + WAIT, bad: ["await tkPinSuggested('mine:none', 0); " + WAIT, "await tkPinSuggested(plSugKey(userGetEntry('coffee').places[1]), 99); " + WAIT], cleanup: "Object.keys(plSuggestCache).forEach(function(k){ delete plSuggestCache[k]; }); " + PL_CLEAN },
  { id: 'import.resume', name: 'استئناف بعد انقطاع', kind: 'read', na: READ_NA, setup: TK_SETUP + " sessionStorage.setItem(tkResumeKey(), JSON.stringify({ at: Date.now(), importId: 'fm-resume', plan: tkState.plan && { cities: [] } })); tkState.phase = 'intro'; tkState.plan = null;", action: "tkOpenImport(); " + WAIT, cleanup: TK_CLEAN },
] };

/* ── المجتمع ── */
const CM_SETUP = PL_CITY + " await mpData.cityLists.save('" + U2 + "', 'fmA', { ownerId: '" + U2 + "', cityId: 'fmA', cityName: 'Faultville', public: true, sharedWith: [], bookmarkCount: 3, catsV: CATS_VERSION, categories: { coffee: { active: true, places: [mk('o1', 'Other Cafe', 48.87, 2.36)] } } }); await mpData.users.merge('" + U2 + "', { nickname: 'faultfriend', public: true, curator: true }); await mpData.nicknames.set('faultfriend', { uid: '" + U2 + "' }); userListData.following = (userListData.following || []).filter(function(u){ return u !== '" + U2 + "'; }); communityUsers = []; " + WAIT;
const CM_CLEAN = "try{ closeCommunityModal(); }catch(_){} try{ closeModalById('communityBackdrop'); }catch(_){} userListData.following = (userListData.following || []).filter(function(u){ return u !== '" + U2 + "'; }); delete (userListData.placeBookmarks || {})['https://maps.app.goo.gl/o1']; " + PL_CLEAN;
const COMMUNITY = { id: 'community', name: 'المجتمع', caps: [
  { id: 'community.root', name: 'جذر المجتمع (الأكثر حفظًا · المشارَك)', kind: 'read', na: READ_NA, setup: CM_SETUP, action: "await openCommunityModal(); " + WAIT, cleanup: CM_CLEAN },
  { id: 'community.user', name: 'شاشة مستخدم (قوائمه العامة)', kind: 'read', na: READ_NA, setup: CM_SETUP, action: "await openCommunityUserFrom('" + U2 + "'); " + WAIT, cleanup: CM_CLEAN },
  { id: 'community.search', name: 'بحث باسم مستخدم', kind: 'read', na: { concurrency: 'قراءة — لا كتابة', stale: 'قراءة — لا كتابة' }, setup: CM_SETUP + " await openCommunityModal(); " + WAIT, action: "var el = document.getElementById('cmSearch'); if (el) el.value = 'faultfriend'; await cmSearchGo(); " + WAIT,
    bad: ["var el = document.getElementById('cmSearch'); if (el) el.value = ''; await cmSearchGo(); " + WAIT, "var el = document.getElementById('cmSearch'); if (el) el.value = '<img src=x>'.repeat(100); await cmSearchGo(); " + WAIT, "var el = document.getElementById('cmSearch'); if (el) el.value = 'صديق'; await cmSearchGo(); " + WAIT], cleanup: CM_CLEAN },
  { id: 'community.bookmarkList', badKind: 'ids', name: 'حفظ قائمة مدينة كاملة (Bookmark list)', kind: 'write', setup: CM_SETUP + " await ensureListBookmarks(); if (listBookmarksMap) delete listBookmarksMap['" + U2 + "_fmA'];", invariant: "Object.keys(listBookmarksMap || {}).filter(function(k){ return k === '" + U2 + "_fmA'; }).length <= 1",
    action: "await toggleListBookmark('" + U2 + "', 'fmA'); " + WAIT, bad: ["await toggleListBookmark('', ''); " + WAIT, "await toggleListBookmark('" + U2 + "', 'no_such_city'); " + WAIT, "await toggleListBookmark(currentUser.uid, 'fmA'); " + WAIT], cleanup: "try{ if (listBookmarksMap) delete listBookmarksMap['" + U2 + "_fmA']; }catch(_){} " + CM_CLEAN },
  { id: 'community.follow', badKind: 'ids', name: 'متابعة/إلغاء متابعة', kind: 'write', setup: CM_SETUP, invariant: "(userListData.following || []).filter(function(u){ return u === '" + U2 + "'; }).length <= 1",
    action: "await curToggleFollow('" + U2 + "'); " + WAIT, bad: ["await curToggleFollow(''); " + WAIT, "await curToggleFollow(currentUser.uid); " + WAIT, "await curToggleFollow('no-such-uid'); " + WAIT], cleanup: CM_CLEAN },
  { id: 'community.trip', name: 'فتح رحلة مجتمعية', kind: 'read', na: READ_NA, setup: CM_SETUP + " await mpData.trips.save({ id: 'fmtC', ownerId: '" + U2 + "', title: 'Shared Trip', cityId: 'fmA', public: true, cities: [{ cityId: 'fmA', name: 'Faultville', days: 1 }], plan: { days: [{ periods: { morning: [], noon: [], afternoon: [], evening: [] } }] } });", action: "await openCommunityTrip('fmtC'); " + WAIT, cleanup: "try{ await mpData.trips.remove('fmtC'); }catch(_){} " + CM_CLEAN },
] };

/* ── المنتقون ── */
const CURATORS = { id: 'curators', name: 'المنتقون', caps: [
  { id: 'curators.page', name: 'صفحة منتقٍ', kind: 'read', na: READ_NA, setup: CM_SETUP, action: "await viewCommunityUser('" + U2 + "'); " + WAIT, cleanup: CM_CLEAN },
  { id: 'curators.request', name: 'طلب أن أصير منتقيًا', kind: 'write', setup: CM_SETUP + " await openCuratorRequest(); " + WAIT + " var ta = document.getElementById('curReqText'); if (ta) ta.value = 'I curate cafés in Faultville';", invariant: "true",
    action: "await sendCuratorRequest(); " + WAIT, bad: ["var ta = document.getElementById('curReqText'); if (ta) ta.value = ''; await sendCuratorRequest(); " + WAIT, "var ta = document.getElementById('curReqText'); if (ta) ta.value = 'x'.repeat(5000); await sendCuratorRequest(); " + WAIT], cleanup: "try{ closeModalById('dashBackdrop'); }catch(_){} " + CM_CLEAN },
  { id: 'curators.publicToggle', name: 'قائمة عامة/خاصة', kind: 'write', setup: PL_CITY, invariant: "true", action: "await plTogglePublic(); " + WAIT, cleanup: PL_CLEAN },
  { id: 'curators.top', badKind: 'ids', name: 'Top ★ على مكان', kind: 'write', setup: PL_CITY, invariant: "true", action: "await plToggleTopRow('coffee', 0); " + WAIT, bad: ["await plToggleTopRow('coffee', 99); " + WAIT, "await plToggleTopRow('no_cat', 0); " + WAIT], cleanup: PL_CLEAN },
  { id: 'curators.reportUser', badKind: 'ids', name: 'إبلاغ عن قائمة/مستخدم', kind: 'write', na: { concurrency: 'الفعل يمرّ بنافذة إدخال واحدة — فتحها مرتين معًا مستحيل من الواجهة (كانت خضراء في r99 بنافذة مزيّفة تسرّبت من محطة ١٦هـ)' }, setup: CM_SETUP, invariant: "true",
    action: "var p = openReport('list', '" + U2 + "_fmA'); " + WAIT + " var f = document.getElementById('inputModalField'); if (f){ f.value = 'spam'; confirmInputModal(); } await p; " + WAIT,
    bad: ["var p = openReport('list', ''); " + WAIT + " var f = document.getElementById('inputModalField'); if (f){ f.value = 'x'.repeat(2000); confirmInputModal(); } if (document.getElementById('inputBackdrop').classList.contains('show')) closeInputModal(); await p; " + WAIT], cleanup: CM_CLEAN },
] };

/* ── العناوين ── */
const AD_SETUP = "window.__fm = window.__fm || {}; var uid = currentUser.uid; userListData.privateCities = ['fmAd']; userListData.customCities = (userListData.customCities || []).filter(function(c){ return c.id !== 'fmAd'; }).concat([{ id: 'fmAd', name: 'Addrtown', country: 'Testland', lat: 1, lng: 1 }]); await mpData.privatePlaces.setCategory(uid, 'fmAd', 'personal_friends', { active: true, places: [{ id: 'ad1', name: 'Friend Home', url: 'https://maps.app.goo.gl/ad1', area: 'North' }, { id: 'ad2', name: 'Friend Two', url: 'https://maps.app.goo.gl/ad2' }] }); addrLoaded = false; addrCurrentCity = 'fmAd'; addrCurrentCountry = 'Testland'; await loadAddresses(true); renderAddresses(); " + WAIT;
const AD_CLEAN = "try{ closeModalById('addrBackdrop'); }catch(_){} addrEditRef = null; addrLoaded = false; " + WAIT;
const ADDRESSES = { id: 'addresses', name: 'العناوين', caps: [
  { id: 'addresses.open', name: 'فتح العناوين', kind: 'read', na: READ_NA, setup: AD_SETUP + " addrLoaded = false;", action: "await loadAddresses(true); renderAddresses(); " + WAIT, cleanup: AD_CLEAN },
  { id: 'addresses.add', name: 'إضافة عنوان', kind: 'write', setup: AD_SETUP + " openAddrModal('fmAd', 'personal_friends'); addrSetMethod(false);", invariant: "((addrData['fmAd'] || {}).personal_friends || { places: [] }).places.filter(function(p){ return p.name === 'New Friend'; }).length <= 1",
    action: "document.getElementById('addrName').value = 'New Friend'; document.getElementById('addrUrl').value = 'https://maps.app.goo.gl/nf'; await saveAddr(); " + WAIT,
    bad: ["document.getElementById('addrName').value = ''; document.getElementById('addrUrl').value = ''; await saveAddr(); " + WAIT, "document.getElementById('addrName').value = 'x'.repeat(5000); document.getElementById('addrUrl').value = 'https://maps.app.goo.gl/l'; document.getElementById('addrPhone').value = 'not a phone'; await saveAddr(); " + WAIT, "document.getElementById('addrName').value = 'Bad'; document.getElementById('addrUrl').value = 'javascript:alert(1)'; await saveAddr(); " + WAIT], cleanup: AD_CLEAN },
  { id: 'addresses.edit', name: 'تعديل عنوان', kind: 'write', setup: AD_SETUP + " openAddrModal('fmAd', 'personal_friends', 0); addrSetMethod(false);", invariant: "((addrData['fmAd'] || {}).personal_friends || { places: [] }).places.length === 2",
    action: "document.getElementById('addrName').value = 'Friend Home Edited'; await saveAddr(); " + WAIT, bad: ["document.getElementById('addrName').value = ''; await saveAddr(); " + WAIT], cleanup: AD_CLEAN },
  { id: 'addresses.delete', badKind: 'ids', name: 'حذف عنوان', kind: 'write', setup: AD_SETUP, invariant: "((addrData['fmAd'] || {}).personal_friends || { places: [] }).places.length === 1", action: "await deleteAddr('fmAd', 'personal_friends', 1); " + WAIT, bad: ["await deleteAddr('fmAd', 'personal_friends', 99); " + WAIT, "await deleteAddr('no_city', 'personal_friends', 0); " + WAIT], cleanup: AD_CLEAN },
  { id: 'addresses.removeCity', badKind: 'ids', name: 'حذف مدينة عناوين', kind: 'write', setup: AD_SETUP, invariant: "true", action: "await removeAddrCity('fmAd'); " + WAIT, bad: ["await removeAddrCity(''); " + WAIT, "await removeAddrCity('no_city'); " + WAIT], cleanup: AD_CLEAN },
] };

/* ── الحساب ── */
const AC_SETUP = "window.__fm = window.__fm || {}; if (!__fm.auth0) __fm.auth0 = { signIn: mpData.auth.signIn, signUp: mpData.auth.signUp, sendReset: mpData.auth.sendReset, signOut: mpData.auth.signOut }; var gate = function(k, v){ return function(){ return new Promise(function(res, rej){ try{ globalThis.__faultGate(k); res(v); }catch(e){ rej(e); } }); }; }; mpData.auth.signIn = gate('auth', { user: { uid: currentUser ? currentUser.uid : 'x' } }); mpData.auth.signUp = gate('auth', { user: { uid: currentUser ? currentUser.uid : 'x' } }); mpData.auth.sendReset = gate('auth', undefined); mpData.auth.signOut = gate('auth', undefined); var __u = currentUser; __fm.user0 = __u; openAuthModal('signin'); document.getElementById('authEmail').value = 'fault@x.io'; document.getElementById('authPassword').value = 'password123'; document.getElementById('authNickname').value = 'faultnick'; " + WAIT;
const AC_CLEAN = "mpData.auth.signIn = __fm.auth0.signIn; mpData.auth.signUp = __fm.auth0.signUp; mpData.auth.sendReset = __fm.auth0.sendReset; mpData.auth.signOut = __fm.auth0.signOut; currentUser = __fm.user0; try{ var b = document.getElementById('authBackdrop'); b.classList.remove('show'); b.classList.remove('gate-mode'); }catch(_){} try{ closeModalById('dashBackdrop'); }catch(_){} " + WAIT;
const ACCOUNT = { id: 'account', name: 'الحساب', caps: [
  { id: 'account.signIn', name: 'تسجيل الدخول', kind: 'write', setup: AC_SETUP, invariant: "true", na: { partial: 'لا مستند يُقرأ', stale: 'لا مستند يُكتب' }, action: "await doSignIn(); " + WAIT, bad: ["document.getElementById('authEmail').value = ''; await doSignIn(); " + WAIT, "document.getElementById('authEmail').value = 'nomail'; document.getElementById('authPassword').value = 'x'; await doSignIn(); " + WAIT], cleanup: AC_CLEAN },
  { id: 'account.signUp', name: 'إنشاء حساب', kind: 'write', setup: AC_SETUP + " openAuthModal('signup'); document.getElementById('authEmail').value = 'fault@x.io'; document.getElementById('authPassword').value = 'password123'; document.getElementById('authNickname').value = 'faultnick' + Date.now();", invariant: "true", action: "await doSignUp(); " + WAIT, bad: ["document.getElementById('authNickname').value = 'ab'; await doSignUp(); " + WAIT, "document.getElementById('authNickname').value = 'faultfriend'; await doSignUp(); " + WAIT, "document.getElementById('authPassword').value = 'short'; await doSignUp(); " + WAIT], cleanup: AC_CLEAN },
  { id: 'account.reset', name: 'استعادة كلمة السر', kind: 'write', setup: AC_SETUP, invariant: "true", na: { partial: 'لا مستند يُقرأ', stale: 'لا مستند يُكتب' }, action: "await doForgotPassword(); " + WAIT, bad: ["document.getElementById('authEmail').value = ''; await doForgotPassword(); " + WAIT], cleanup: AC_CLEAN },
  { id: 'account.nickname', name: 'تغيير الاسم', kind: 'write', setup: "window.__fm = window.__fm || {}; __fm.nick0 = userListData.nickname; /* r100-ج: «محجوز لغيرك» لا يُكتب عبر القواعد بمعرّف غيرنا — المحطة تحقنه في المخزن قبل المصفوفة (nicknames/takennick → uOTHER) */", invariant: "true",
    action: "await saveNickname('faultnew' + String(Date.now()).slice(-5)); " + WAIT, bad: ["await saveNickname(''); " + WAIT, "await saveNickname('takennick'); " + WAIT, "await saveNickname('x'.repeat(100)); " + WAIT, "await saveNickname('<b>bad</b>'); " + WAIT], cleanup: "try{ if (__fm.nick0) await saveNickname(__fm.nick0); }catch(_){} try{ closeModalById('dashBackdrop'); }catch(_){} " + WAIT },
  { id: 'account.signOut', name: 'تسجيل الخروج', kind: 'write', setup: AC_SETUP, invariant: "true", na: { partial: 'لا مستند', stale: 'لا مستند', bad: 'لا إدخال', concurrency: 'فعل واحد' }, action: "doSignOut(); " + WAIT, cleanup: AC_CLEAN },
  { id: 'account.delete', name: 'حذف الحساب (التتالي)', kind: 'write', setup: AC_SETUP + " openSettings(); " + WAIT + " openDeletePreview(); delStep(2); delStep(3); var w = document.getElementById('delWord'); if (w) w.value = 'DELETE'; checkDelWord(); window.__mpSheetAuto = function(){ return 'ok'; }; mpData.auth.reauthWithPassword = function(){ return new Promise(function(res, rej){ try{ globalThis.__faultGate('auth'); res(true); }catch(e){ rej(e); } }); };",
    invariant: "true", na: { partial: 'عملية مدمّرة — تُقاس بمحطات التتالي ٢٦', concurrency: 'عملية مدمّرة — تُقاس بمحطات التتالي ٢٦', stale: 'عملية مدمّرة — تُقاس بمحطات التتالي ٢٦', bad: 'لا إدخال' },
    action: "var p = doAccountDelete(); " + WAIT + " var f = document.getElementById('reauthPassword'); if (f && document.getElementById('reauthBackdrop').classList.contains('show')){ f.value = 'password123'; await doReauthContinue(); } await p; " + WAIT, cleanup: "try{ closeModalById('delBackdrop'); }catch(_){} try{ var b = document.getElementById('delBackdrop'); if (b) b.classList.remove('show'); }catch(_){} " + AC_CLEAN },
] };

/* ── الإدارة ── */
const ADM_SETUP = "window.__fm = window.__fm || {}; __fm.owner0 = isOwner; isOwner = true; await mpData.users.merge('" + U2 + "', { nickname: 'faultfriend', public: true }); allUsersCache = [{ uid: '" + U2 + "', nickname: 'faultfriend', lastSeen: Date.now() }]; " + WAIT;
const ADM_CLEAN = "isOwner = __fm.owner0; try{ closeModalById('dashBackdrop'); }catch(_){} try{ await mpData.suspensions.remove('" + U2 + "'); }catch(_){} await new Promise(function(r){ setTimeout(r, 400); }); " + WAIT; /* r100-و: قراءات الخلفية لنافذة المستخدمين (دمج الأسماء · المجتمع) تُمهَل حتى لا تدخل نافذة الخلية التالية */
const ADMIN = { id: 'admin', name: 'الإدارة', caps: [
  { id: 'admin.users', name: 'قائمة المستخدمين', kind: 'read', na: READ_NA, setup: ADM_SETUP, action: "await openUsersModal(); " + WAIT, cleanup: ADM_CLEAN },
  { id: 'admin.suspend', badKind: 'ids', name: 'إيقاف/إعادة مستخدم', kind: 'write', setup: ADM_SETUP, invariant: "true", action: "await toggleSuspendUser('" + U2 + "'); " + WAIT, bad: ["await toggleSuspendUser(''); " + WAIT, "await toggleSuspendUser(currentUser.uid); " + WAIT, "await toggleSuspendUser('no-such-uid'); " + WAIT], cleanup: ADM_CLEAN },
  { id: 'admin.report', name: 'تقرير المستخدمين', kind: 'read', na: READ_NA, setup: ADM_SETUP + " await openAdminPanel(); await new Promise(function(r){ setTimeout(r, 400); }); " + WAIT, action: "generateUsersReport(); " + WAIT, cleanup: ADM_CLEAN },
] };

/* ── الدرج ── */
const DR_SETUP = CM_SETUP + " openAccountModal(); " + WAIT;
const DR_CLEAN = "try{ closeAccountModal(); }catch(_){} try{ closeModalById('dashBackdrop'); }catch(_){} " + CM_CLEAN;
const DRAWER = { id: 'drawer', name: 'الدرج', caps: [
  { id: 'drawer.profile', name: 'My profile / My stats', kind: 'read', na: READ_NA, setup: DR_SETUP, action: "await openMyProfile(); " + WAIT + " await openMyStats(currentUser.uid); " + WAIT, cleanup: DR_CLEAN },
  { id: 'drawer.report', name: 'Report a problem', kind: 'write', setup: DR_SETUP + " reportAppProblem(); " + WAIT + " reportPickKind('data'); var ta = document.getElementById('repText'); if (ta) ta.value = 'Map did not open';", invariant: "true",
    action: "await sendAppReport(); " + WAIT, bad: ["var ta = document.getElementById('repText'); if (ta) ta.value = ''; await sendAppReport(); " + WAIT, "var ta = document.getElementById('repText'); if (ta) ta.value = 'x'.repeat(5000); await sendAppReport(); " + WAIT], cleanup: DR_CLEAN },
  { id: 'drawer.diag', name: 'ⓘ Diag يعمل مقطوع الشبكة', kind: 'read', na: { bad: 'لا إدخال', concurrency: 'قراءة — لا كتابة', stale: 'قراءة — لا كتابة', partial: 'يقرأ الذاكرة لا المخزن' }, setup: PL_CITY, action: "plOpenDiag(); " + WAIT + " if (!/BUILD|Diag|build/i.test(document.getElementById('dashBody').textContent)) throw new Error('diag body empty'); ", cleanup: "try{ closeModalById('dashBackdrop'); }catch(_){} " + PL_CLEAN },
  { id: 'drawer.open', name: 'فتح الدرج بحالة ناقصة/متقادمة', kind: 'read', na: { bad: 'لا إدخال', concurrency: 'قراءة — لا كتابة', network: 'يقرأ الذاكرة', permission: 'يقرأ الذاكرة' }, setup: CM_SETUP + " __fm.ul0 = JSON.stringify(userListData); userListData.nickname = null; delete userListData.curatorSelf;", action: "openAccountModal(); " + WAIT + " if (!document.getElementById('accountBackdrop') || !document.getElementById('accountBackdrop').classList.contains('show')) throw new Error('drawer did not open'); ", cleanup: "try{ var u = JSON.parse(__fm.ul0); userListData.nickname = u.nickname; if (u.curatorSelf) userListData.curatorSelf = u.curatorSelf; }catch(_){} " + DR_CLEAN },
] };

module.exports = { MODES: ['network', 'permission', 'partial', 'bad', 'concurrency', 'stale'], GROUPS: [PLACES, TRIPS, IMPORT, COMMUNITY, CURATORS, ADDRESSES, ACCOUNT, ADMIN, DRAWER] };
