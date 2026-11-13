// MyPickz — tests/b2.page.js (الدفعة ٢ · ١٢ نوفمبر ٢٠٢٦): جسم محطة «الدفعة ٢» — يُنفَّذ داخل الصفحة (تقرؤه tests/journey.js)
// الباب الواحد للسجلات المربوطة بعدّاداتها (قواعد v3.17 ١١): المفكرة · حفظ الرحلة · نسخ القائمة والرحلة · المتابعة — كل فعل بدالته الكاملة.
// المتطلّب: window.__b2 من جهة Node — { uid, get(k), seed(k, v), del(k), keys(p), mark(), since(n), denies(), actor(uid), susp(on), noT(flag), reads(on) }. يعيد JSON واحدًا.
(async function(){
  var T = window.__b2, uid = T.uid, O = 'uB2O', CITY = 'b2c', L = O + '_' + CITY, TR = 'trip_b2pub';
  var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var toasts = []; var st0 = showToast; showToast = function(m){ toasts.push(String(m)); };
  var a0 = window.__mpSheetAuto; var sheetAnswer = function(s){ return 'ok'; }; window.__mpSheetAuto = function(s){ return sheetAnswer(s); };
  var rc0 = renderCommunityModal, rb0 = renderCuratorsBody, oc0 = openConfirmModal, ut0 = showUndoToast, tab0 = currentTab;
  renderCommunityModal = function(){}; renderCuratorsBody = function(){ return Promise.resolve(); }; openConfirmModal = function(){ return Promise.resolve(true); }; var undos = 0; showUndoToast = function(){ undos++; }; currentTab = 'Addresses';
  var o = {};
  var num = function(k, f){ var d = T.get(k); return d ? (d[f] === undefined ? null : d[f]) : 'gone'; };
  var cnt = function(){ return [num('userCityLists/' + L, 'bookmarkCount'), num('trips/' + TR, 'saveCount'), num('communityProfiles/' + O, 'followerCount'), num('userCityLists/' + L, 'copyCount'), num('trips/' + TR, 'copyCount')]; };
  var recs = function(u){ u = u || uid; return [!!T.get('listBookmarks/' + u + '__' + L), !!T.get('tripSaves/' + u + '__' + TR), !!T.get('follows/' + u + '_' + O), !!T.get('copies/' + u + '__' + L), !!T.get('copies/' + u + '__' + TR)]; };
  var mir = function(){ var u = T.get('userLists/' + uid) || {}; return [!!((u.listBookmarkIds || {})[L]), !!((u.tripSaveIds || {})[TR]), (u.following || []).indexOf(O) >= 0]; };
  var tr = async function(f){ try{ var v = await f(); return (v && typeof v === 'object' && 'state' in v) ? v.state : v; }catch(e){ return 'THROW ' + (e && e.code) + (e && e.mpClosed ? ' closed' : ''); } };
  var five = async function(on){ return [
    await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, on); }), await tr(function(){ return mpData.tripSaves.toggle(uid, TR, on); }), await tr(function(){ return mpData.follows.set(uid, O, on); }),
    await tr(function(){ return on ? mpData.copies.record(uid, 'list', L) : mpData.copies.unrecord(uid, 'list', L); }), await tr(function(){ return on ? mpData.copies.record(uid, 'trip', TR) : mpData.copies.unrecord(uid, 'trip', TR); })]; };
  var srcTrip = function(){ var c = [{ cityId: 'paris', cityName: 'Paris', days: 1, stay: null, arrival: null, departure: null, fallback: 'transit' }]; return JSON.parse(JSON.stringify({ ownerId: O, title: 'B2 Trip', cityId: 'paris', cityName: 'Paris', customLabel: '', cities: c, plan: tripBuildPlan({ cities: c, entries: [], version: 'balanced' }), version: 'balanced', status: 'approved', public: true, sharedWith: [], sharedWithNames: {}, saveCount: 0, copyCount: 0 })); };
  var reset = function(){ T.seed('userCityLists/' + L, { ownerId: O, cityId: CITY, cityName: 'B2 City', public: true, sharedWith: [], splitV: 1, index: [], bookmarkCount: 0, copyCount: 0, updatedAt: 1 }); T.seed('trips/' + TR, srcTrip()); T.seed('communityProfiles/' + O, { hasAnyPublicContent: true, verified: false, followerCount: 0, publicCityIds: [CITY] });
    ['listBookmarks/' + uid + '__' + L, 'tripSaves/' + uid + '__' + TR, 'follows/' + uid + '_' + O, 'copies/' + uid + '__' + L, 'copies/' + uid + '__' + TR].forEach(T.del);
    var u = T.get('userLists/' + uid) || {}; if (u.listBookmarkIds) delete u.listBookmarkIds[L]; if (u.tripSaveIds) delete u.tripSaveIds[TR]; u.following = (u.following || []).filter(function(x){ return x !== O; }); T.seed('userLists/' + uid, u); };
  T.reads(true);

  try{ /* (أ) الأفعال الخمسة من الباب: تشغيل · تكرار (لا عدّ ثانٍ) · إيقاف · إيقاف ثانٍ (لا سجل) */
    reset(); var d0 = T.denies();
    o.on = [await five(true), cnt(), recs(), mir()];
    o.again = [await five(true), cnt()];
    o.off = [await five(false), cnt(), recs(), mir()];
    o.offAgain = [await five(false), cnt()];
  }catch(e){ o.errA = String(e && e.stack || e); }

  try{ /* (ب) حالات الإطلاق: السجل يُحذف وحده ولا رسالة فشل — المصدر صار خاصًّا · حُذف · العدّاد صفر · الملف لم يعد معدودًا */
    reset(); await five(true);
    var l0 = T.get('userCityLists/' + L); l0.public = false; T.seed('userCityLists/' + L, l0); /* صاحبها جعلها خاصة */
    o.wentPrivate = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), await tr(function(){ return mpData.copies.unrecord(uid, 'list', L); }), recs(), mir(), cnt()];
    T.del('trips/' + TR); /* صاحبها حذفها */
    o.deleted = [await tr(function(){ return mpData.tripSaves.toggle(uid, TR, false); }), await tr(function(){ return mpData.copies.unrecord(uid, 'trip', TR); }), recs(), mir()];
    var p0 = T.get('communityProfiles/' + O); p0.hasAnyPublicContent = false; p0.followerCount = 3; T.seed('communityProfiles/' + O, p0); /* لم يعد له محتوى عام */
    o.notCountable = [await tr(function(){ return mpData.follows.set(uid, O, false); }), recs()[2], mir()[2], num('communityProfiles/' + O, 'followerCount')];
    reset(); /* العدّاد عند الصفر وسجلي قائم (سجل قديم أُنشئ بلا عدّ) — ك-٥: كان إلغاء المتابعة مستحيلًا */
    T.seed('listBookmarks/' + uid + '__' + L, { at: 1 }); T.seed('tripSaves/' + uid + '__' + TR, { at: 1 }); T.seed('follows/' + uid + '_' + O, { followerUid: uid, curatorUid: O, at: 1 }); T.seed('copies/' + uid + '__' + L, { uid: uid, kind: 'list', docKey: L, at: 1 }); T.seed('copies/' + uid + '__' + TR, { uid: uid, kind: 'trip', docKey: TR, at: 1 });
    o.atZero = [await five(false), cnt(), recs()];
  }catch(e){ o.errB = String(e && e.stack || e); }

  try{ /* (ب١) المصدر لم يُقرأ لانقطاع (لا لرفض): لا يُحكم بالإطلاق — الخطأ يُرمى والسجل باقٍ */
    reset(); await five(true); var l9 = T.get('userCityLists/' + L); l9.public = false; T.seed('userCityLists/' + L, l9); T.readFail('userCityLists/' + L);
    o.srcNet = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), recs()[0], mir()[0]];
    listBookmarksMap = {}; listBookmarksMap[L] = { listId: L, ownerUid: O, cityId: CITY }; userListData.listBookmarkIds = {}; userListData.listBookmarkIds[L] = true; tripSavesMap = {}; tripSavesMap[TR] = { tripId: TR }; userListData.tripSaveIds = {}; userListData.tripSaveIds[TR] = true;
    var tgl0 = mpData.tripSaves.toggle; mpData.tripSaves.toggle = function(){ return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); }; toasts.length = 0; __mpLastToast = { t: '', at: 0 };
    try{ await toggleListBookmark(O, CITY); __mpLastToast = { t: '', at: 0 }; await toggleTripSave(TR); } finally { mpData.tripSaves.toggle = tgl0; }
    o.uiRollback = [!!listBookmarksMap[L], userListData.listBookmarkIds[L] === true, !!tripSavesMap[TR], userListData.tripSaveIds[TR] === true, toasts.filter(function(t){ return /Could not update bookmark/.test(t); }).length]; listBookmarksMap = null; tripSavesMap = null; T.readFail(null);
  }catch(e){ o.errB1 = String(e && e.stack || e); } finally { T.readFail(null); }

  try{ /* (ب١ب) الأعطال عند كل خطوة (المراجعة الثانية): الدفعة الأولى انقطعت — يُرمى بلا قراءة · الإعادة الصريحة انقطعت — يُرمى انقطاعًا والسجل باقٍ · السجل وحده انقطع — كذلك · فحص سجلي انقطع — لا يُعامل غائبًا */
    reset(); await five(true); var rmk = T.rmark(); T.batchFail(1);
    var f1 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), T.rsince(rmk).length, recs()[0]]; T.batchFail(null);
    T.noT(true); T.batchFail(2); var f2 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), recs()[0], cnt()[0]]; T.batchFail(null); T.noT(false);
    reset(); T.seed('tripSaves/' + uid + '__' + TR, { at: 1 }); T.batchFail(2); var f3 = [await tr(function(){ return mpData.tripSaves.toggle(uid, TR, false); }), recs()[1]]; T.batchFail(null);
    reset(); await five(true); var lz = T.get('userCityLists/' + L); lz.public = false; T.seed('userCityLists/' + L, lz); T.readFail('listBookmarks/' + uid + '__' + L);
    var f4 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), recs()[0], mir()[0]]; lz.public = true; T.seed('userCityLists/' + L, lz);
    var f5 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, true); }), cnt()[0]]; T.readFail(null); /* سجلي قائم وفحصه انقطع: لا إعادة عدّ */
    T.noT(true); T.batchFail(2); reset(); var f6 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, true); }), recs()[0], cnt()[0]]; T.batchFail(null); T.noT(false); /* إعادة الإنشاء الصريحة انقطعت: انقطاع لا «لا صلاحية» */
    o.faults = [f1, f2, f3, f4, f5, f6];
    /* رفض شامل على سجلات المتابعة وسجلي قائم (توقيع ساقط): الإلغاء يُرمى ولا يُقال «غائب» · المرآة لا تُمسّ · والمطابقة لا تُسقط شيئًا */
    reset(); await five(true); userListData.following = [O]; T.denyCol('follows'); toasts.length = 0; __mpLastToast = { t: '', at: 0 };
    var d1 = await tr(function(){ return mpData.follows.set(uid, O, false); }); await curToggleFollow(O);
    var cs0 = currentUserSuspended; currentUserSuspended = true; userListData.listBookmarkIds = {}; userListData.tripSaveIds = {}; var nG = await mpMirrorReconcile(); currentUserSuspended = cs0; T.denyCol(null);
    o.blanket = [d1, recs()[2], mir()[2], userListData.following.indexOf(O) >= 0, toasts.filter(function(t){ return /Could not unfollow/.test(t); }).length, toasts.filter(function(t){ return /^Unfollowed/.test(t); }).length, nG];
    /* سجل متابعة بمعرّف خارج الصيغة: ليس سجل هذا الباب — «none» لا رمي */
    reset(); T.seed('follows/' + uid + '_zz_legacy', { followerUid: uid, curatorUid: O, at: 1 }); o.strayFollow = [await tr(function(){ return mpData.follows.set(uid, O, false); }), !!T.get('follows/' + uid + '_zz_legacy')]; T.del('follows/' + uid + '_zz_legacy');
  }catch(e){ o.errB1b = String(e && e.stack || e); } finally { T.batchFail(null); T.readFail(null); T.denyCol(null); T.noT(false); }

  try{ /* (ب٢) ك-٤ · ✕ على صف متدهور والحذف فشل (انقطاع): الصف يعود والرسالة تظهر — كان الفشل صامتًا */
    reset(); await five(true); listBookmarksMap = {}; listBookmarksMap[L] = { listId: L, ownerUid: O, cityId: CITY }; tripSavesMap = {}; tripSavesMap[TR] = { tripId: TR };
    var tl0 = mpData.bookmarks.toggleList, tg0 = mpData.tripSaves.toggle; var net = function(){ return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); }; mpData.bookmarks.toggleList = net; mpData.tripSaves.toggle = net; toasts.length = 0;
    try{ await removeDegradedListBookmark(L); __mpLastToast = { t: '', at: 0 }; /* الرسالة نفسها لا تتكرّر خلال ١٫٥ ث — هنا فعلان مختلفان */ await removeDegradedTripSave(TR); } finally { mpData.bookmarks.toggleList = tl0; mpData.tripSaves.toggle = tg0; }
    o.degradedFailed = [!!listBookmarksMap[L], !!tripSavesMap[TR], toasts.filter(function(t){ return /Could not remove bookmark/.test(t); }).length, recs().slice(0, 2)];
    toasts.length = 0; await removeDegradedListBookmark(L); await removeDegradedTripSave(TR);
    o.degradedDone = [!!listBookmarksMap[L], !!tripSavesMap[TR], toasts.filter(function(t){ return /Could not/.test(t); }).length, recs().slice(0, 2), cnt().slice(0, 2)];
    listBookmarksMap = null; tripSavesMap = null;
  }catch(e){ o.errB2 = String(e && e.stack || e); }

  try{ /* (ج) شبح: المرآة تقول «مميَّزة» ولا سجل — الباب يصحّح المرآة وحدها · وسجل قائم بلا مرآة: التشغيل يعيد 'already' ويكتب المرآة */
    reset(); var u1 = T.get('userLists/' + uid) || {}; u1.listBookmarkIds = u1.listBookmarkIds || {}; u1.listBookmarkIds[L] = true; T.seed('userLists/' + uid, u1);
    o.ghost = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), mir()[0], cnt()[0]];
    T.seed('listBookmarks/' + uid + '__' + L, { at: 1 }); var l1 = T.get('userCityLists/' + L); l1.bookmarkCount = 1; T.seed('userCityLists/' + L, l1);
    o.heal = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, true); }), mir()[0], cnt()[0]];
  }catch(e){ o.errC = String(e && e.stack || e); }

  try{ /* (ج٢) العدّاد المعروض يتبع ما تحرّك فعلًا: سجلي قائم والمرآة ناقصة ⇒ 'already' — لا +١ على الشاشة (المفكرة والمتابعة) */
    reset(); T.seed('listBookmarks/' + uid + '__' + L, { at: 1 }); var l2 = T.get('userCityLists/' + L); l2.bookmarkCount = 1; T.seed('userCityLists/' + L, l2);
    var vc0 = (typeof viewingUserCities === 'undefined') ? undefined : viewingUserCities; var vu0 = viewingUserUid; viewingUserUid = O; viewingUserCities = [{ id: CITY, bookmarkCount: 1 }]; listBookmarksMap = {}; userListData.listBookmarkIds = {};
    await toggleListBookmark(O, CITY); o.shownBookmark = [viewingUserCities[0].bookmarkCount, cnt()[0], !!listBookmarksMap[L]]; viewingUserCities = vc0; listBookmarksMap = null;
    T.seed('follows/' + uid + '_' + O, { followerUid: uid, curatorUid: O, at: 1 }); var p2 = T.get('communityProfiles/' + O); p2.followerCount = 5; T.seed('communityProfiles/' + O, p2);
    var curK = curators; var row = { uid: O, nickname: 'b2o', verified: false, hasAnyPublicContent: true, followerCount: 5 }; curators = (curators || []).filter(function(c){ return c.uid !== O; }).concat([row]); userListData.following = []; userListData.followDisclosed = true;
    var sc0 = mpTrack.statsCurator, bumps = []; mpTrack.statsCurator = function(u, k){ bumps.push(k); };
    try{ await curToggleFollow(O); } finally { mpTrack.statsCurator = sc0; } o.shownFollow = [row.followerCount, cnt()[2], userListData.following.indexOf(O) >= 0]; o.followStat = bumps.filter(function(k){ return k === 'follow'; }).length; curators = curK; /* سجل قائم: اليومي لا يزيد */
    /* العدّاد صفر وسجلي قائم: السحب «released» — الشاشة ٠ كالخادم (كانت تعرض ١) · ومرآة بلا سجل: «none» — الشاشة كما كانت */
    reset(); T.seed('listBookmarks/' + uid + '__' + L, { at: 1 }); viewingUserCities = [{ id: CITY, bookmarkCount: 0 }]; listBookmarksMap = {}; listBookmarksMap[L] = { listId: L, ownerUid: O, cityId: CITY }; userListData.listBookmarkIds = {}; userListData.listBookmarkIds[L] = true;
    await toggleListBookmark(O, CITY); var z1 = [viewingUserCities[0].bookmarkCount, cnt()[0], recs()[0]];
    var l3 = T.get('userCityLists/' + L); l3.bookmarkCount = 4; T.seed('userCityLists/' + L, l3); viewingUserCities = [{ id: CITY, bookmarkCount: 4 }]; listBookmarksMap = {}; listBookmarksMap[L] = { listId: L, ownerUid: O, cityId: CITY };
    await toggleListBookmark(O, CITY); o.shownRelease = [z1, [viewingUserCities[0].bookmarkCount, cnt()[0]]];
    /* صفحة شخص آخر مفتوحة وفيها مدينة بالمعرّف نفسه: عدّادها المعروض لا يتحرّك بمفكرتي على قائمة O */
    reset(); viewingUserUid = 'uB2other'; viewingUserCities = [{ id: CITY, bookmarkCount: 9 }]; listBookmarksMap = {}; userListData.listBookmarkIds = {};
    await toggleListBookmark(O, CITY); o.shownOther = [viewingUserCities[0].bookmarkCount, cnt()[0]];
    /* فشل الفعل: العدّاد المعروض يعود إلى قيمته */
    viewingUserUid = O; viewingUserCities = [{ id: CITY, bookmarkCount: 1 }]; var tlF = mpData.bookmarks.toggleList; mpData.bookmarks.toggleList = function(){ return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); }; __mpLastToast = { t: '', at: 0 };
    try{ await toggleListBookmark(O, CITY); } finally { mpData.bookmarks.toggleList = tlF; } o.shownFail = [viewingUserCities[0].bookmarkCount, !!listBookmarksMap[L]];
    viewingUserCities = vc0; viewingUserUid = vu0; listBookmarksMap = null;
  }catch(e){ o.errC2 = String(e && e.stack || e); }

  try{ /* (د) قاعدة السجل لا ترى increment (الوجه غير المقيس على الخادم الحي): إعادة واحدة بقيمة صريحة في الاتجاهين */
    reset(); T.noT(true); var m0 = T.mark();
    o.explicit = [await five(true), cnt(), await five(false), cnt(), recs()];
  }catch(e){ o.errD = String(e && e.stack || e); } finally { T.noT(false); }

  try{ /* (هـ) ص-٧ · الموقوف يسحب ولا يضيف: الواجهة لا تمنع السحب · السجل وحده · العدّاد لا يتحرّك · المرآة لا تُكتب · والمطابقة عند التحميل تُسقط المدخل من الذاكرة، وتكتبه حين يُرفع الإيقاف */
    reset(); await five(true); var c0 = cnt();
    T.susp(true); currentUserSuspended = true; listBookmarksMap = null; tripSavesMap = null; userListData.listBookmarkIds = {}; userListData.listBookmarkIds[L] = true; userListData.tripSaveIds = {}; userListData.tripSaveIds[TR] = true; userListData.following = [O]; toasts.length = 0;
    var flag = function(){ var v = localStorage.getItem('mp_mirror_dirty_' + uid); localStorage.removeItem('mp_mirror_dirty_' + uid); return v; }; flag();
    undos = 0; await toggleListBookmark(O, CITY); var f1 = flag(); await toggleTripSave(TR); var f2 = flag(); await curToggleFollow(O); var f3 = flag(); /* كل سحب يعلّم المرآة بنفسه (الباب، لا المستدعي) */
    o.suspTold = [undos, toasts.filter(function(t){ return /while suspended/.test(t); }).length]; /* لا Undo لا يعمل — ثلاث رسائل تقول إنه لا يُعاد */
    o.suspFlags = [f1, f2, f3]; localStorage.setItem('mp_mirror_dirty_' + uid, '1');
    o.suspOff = [recs().slice(0, 3), cnt().slice(0, 3), c0.slice(0, 3), mir(), !!(listBookmarksMap && listBookmarksMap[L]), !!(tripSavesMap && tripSavesMap[TR]), userListData.following.indexOf(O) >= 0, toasts.filter(function(t){ return /Could not/.test(t); }), localStorage.getItem('mp_mirror_dirty_' + uid)];
    toasts.length = 0; await toggleListBookmark(O, CITY); o.suspOn = [recs()[0], toasts.slice()]; /* الإضافة ممنوعة برسالتها */
    var dS = T.denies(); toasts.length = 0; await toggleTripSave(TR); o.suspOnTrip = [recs()[1], !!(tripSavesMap && tripSavesMap[TR]), toasts.slice(), T.denies() - dS]; /* وحفظ الرحلة كذلك — بلا طلب يُرسل */
    flag(); var gh = await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }); o.suspGhost = [gh, flag(), mir()[0]]; localStorage.setItem('mp_mirror_dirty_' + uid, '1'); /* موقوف ومرآته بلا سجل: «none» والمرآة لا تُكتب — العلامة تُوضع */
    dS = T.denies(); toasts.length = 0; userListData.following = []; await curToggleFollow(O); o.suspOnFollow = [recs()[2], userListData.following.indexOf(O) >= 0, toasts.slice(), T.denies() - dS]; /* والمتابعة كذلك */
    /* إعادة تحميل وهو موقوف: المرآة المخزَّنة ما زالت تحمل المداخل الثلاثة */
    var stale = function(){ listBookmarksMap = null; tripSavesMap = null; var u = T.get('userLists/' + uid) || {}; userListData.listBookmarkIds = Object.assign({}, u.listBookmarkIds || {}); userListData.tripSaveIds = Object.assign({}, u.tripSaveIds || {}); userListData.following = (u.following || []).slice(); };
    localStorage.removeItem('mp_mirror_dirty_' + uid); /* جهاز آخر: لا علامة — الإيقاف وحده يكفي للمطابقة */ stale(); var n1 = await mpMirrorReconcile(); localStorage.setItem('mp_mirror_dirty_' + uid, '1');
    o.reconSusp = [n1, !!userListData.listBookmarkIds[L], !!userListData.tripSaveIds[TR], userListData.following.indexOf(O) >= 0, mir()];
    T.susp(false); currentUserSuspended = false; stale(); var n2 = await mpMirrorReconcile(); /* رُفع الإيقاف: التصحيح يُكتب والعلامة تُمحى */
    o.reconLifted = [n2, mir(), localStorage.getItem('mp_mirror_dirty_' + uid)];
    var m5 = T.mark(); var n3 = await mpMirrorReconcile(); o.reconIdle = [n3, T.since(m5).length]; /* غير موقوف وبلا علامة: لا قراءة ولا كتابة */
    /* تحميل فشل (مرايا فارغة) لا يمحو العلامة · ومرايا كلها بسجلاتها تمحوها */
    localStorage.setItem('mp_mirror_dirty_' + uid, '1'); userListData.listBookmarkIds = {}; userListData.tripSaveIds = {}; userListData.following = []; var n4 = await mpMirrorReconcile(); var fl4 = localStorage.getItem('mp_mirror_dirty_' + uid);
    reset(); await five(true); stale(); var n5 = await mpMirrorReconcile(); o.reconFlag = [n4, fl4, n5, localStorage.getItem('mp_mirror_dirty_' + uid), mir()];
  }catch(e){ o.errE = String(e && e.stack || e); } finally { T.susp(false); currentUserSuspended = false; try{ localStorage.removeItem('mp_mirror_dirty_' + uid); }catch(_){ } }

  try{ /* (و) المتابعة من الواجهة: من ليس في قائمة المنتقين المحمَّلة وله محتوى عام يُعدّ (كان يُسجَّل بلا عدّ) · ومن لا محتوى عامًّا له ولا توثيق: لا سجل، والرسالة بنصّها */
    reset(); var cur0 = curators, cu0 = (typeof communityUsers === 'undefined') ? null : communityUsers; curators = (curators || []).filter(function(c){ return c.uid !== O; }); userListData.following = []; userListData.followDisclosed = true; toasts.length = 0;
    await curToggleFollow(O);
    o.followCounted = [recs()[2], cnt()[2], mir()[2], userListData.following.indexOf(O) >= 0, toasts.slice()];
    await curToggleFollow(O); o.unfollow = [recs()[2], cnt()[2], mir()[2], toasts.slice(-1)];
    var p1 = T.get('communityProfiles/' + O); p1.hasAnyPublicContent = false; p1.verified = false; T.seed('communityProfiles/' + O, p1); toasts.length = 0;
    await curToggleFollow(O);
    o.followClosed = [recs()[2], cnt()[2], mir()[2], userListData.following.indexOf(O) >= 0, toasts.slice()];
    curators = cur0;
  }catch(e){ o.errF = String(e && e.stack || e); }

  try{ /* (ز) ص-٨ · نسخة الرحلة: السجل يتبع حفظ النسخة — حفظ فشل وأُبقيت على الشاشة: لا سجل ولا عدّ؛ حُفظت لاحقًا: تُعدّ · حذفها من «Delete trip» يُطلق سجلها · فتُعدّ نسخة ثانية */
    reset(); var ut = userTrips; userTrips = []; var sv0 = mpData.trips.save; var fail = true; mpData.trips.save = function(){ if (fail) return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); return sv0.apply(this, arguments); };
    sheetAnswer = function(s){ return /Not saved/.test(String(s && s.title || '')) ? 'cancel' : 'ok'; }; toasts.length = 0;
    await copyOthersTrip(TR); var kept = tripCopyOf(TR);
    o.copyFailed = [!!kept, recs()[4], cnt()[4], toasts.some(function(t){ return /Saved to my trips/.test(t); }), !!(kept && tripCopyPending[kept.id])];
    fail = false; await saveTrip(kept); try{ mpSaveOk('trips'); }catch(_){ }
    o.copySavedLater = [recs()[4], cnt()[4], !!tripCopyPending[kept.id], !!T.get('trips/' + kept.id)];
    await deleteTripById(kept.id);
    o.copyDeleted = [!!tripCopyOf(TR), recs()[4], cnt()[4], !!T.get('trips/' + kept.id)];
    toasts.length = 0; await copyOthersTrip(TR); var c2 = tripCopyOf(TR);
    o.copyAgain = [!!c2, recs()[4], cnt()[4], toasts.some(function(t){ return /Saved to my trips ✓/.test(t); })];
    /* نسخة أُبقيت بلا حفظ ثم حُذفت من «Delete trip»: لا سجل لها يُطلق — لا طلب على سجل النسخ · ونسخة أُبقيت ثم تُخلّي عنها عند حفظ لاحق فاشل: الانتظار يسقط */
    if (c2){ await mpData.trips.remove(c2.id); await mpData.copies.unrecord(uid, 'trip', TR); userTrips = []; c2 = null; }
    fail = true; sheetAnswer = function(s){ return /Not saved/.test(String(s && s.title || '')) ? 'cancel' : 'ok'; }; try{ mpSaveOk('trips'); }catch(_){ } await copyOthersTrip(TR); var k2 = tripCopyOf(TR);
    fail = false; var mK = T.mark(); var dK = T.denies(); await deleteTripById(k2.id);
    o.keptDeleted = [!!tripCopyOf(TR), Object.keys(tripCopyPending).length, T.since(mK).filter(function(w){ return /copies\//.test(w); }).length, T.deniedSince(dK).filter(function(x){ return /copies|copyCount/.test(x); }).length, cnt()[4]];
    fail = true; try{ mpSaveOk('trips'); }catch(_){ } sheetAnswer = function(s){ return /Not saved/.test(String(s && s.title || '')) ? 'cancel' : 'ok'; }; await copyOthersTrip(TR); var k3 = tripCopyOf(TR); var pend3 = !!(k3 && tripCopyPending[k3.id]);
    try{ mpSaveOk('trips'); }catch(_){ } sheetAnswer = function(s){ return /Not saved/.test(String(s && s.title || '')) ? 'alt' : 'ok'; }; await saveTrip(k3);
    o.keptDiscarded = [pend3, !!tripCopyOf(TR), Object.keys(tripCopyPending).length, recs()[4], cnt()[4]]; try{ mpSaveOk('trips'); }catch(_){ } userTrips = [];
    /* Retry ثم Discard: saveTrip يعود undefined — لا «Saved ✓» لنسخة تُخلّي عنها */
    fail = true; try{ mpSaveOk('trips'); }catch(_){ } var asked = 0; sheetAnswer = function(s){ if (!/Not saved/.test(String(s && s.title || ''))) return 'ok'; asked++; return asked === 1 ? 'ok' : 'alt'; }; toasts.length = 0; await copyOthersTrip(TR);
    o.retryDiscard = [asked, !!tripCopyOf(TR), recs()[4], cnt()[4], Object.keys(tripCopyPending).length, toasts.some(function(t){ return /Saved to my trips/.test(t); })]; try{ mpSaveOk('trips'); }catch(_){ } userTrips = [];
    /* الحفظ نجح والعدّ فشل: رسالة «لم تُعدّ» وحدها (لا تغطّيها «Saved ✓») · ثم حذف النسخة والإطلاق فشل: «counter not updated» وحدها (لا «Trip deleted») */
    fail = false; sheetAnswer = function(){ return 'ok'; }; var rc9 = mpData.copies.record, ur9 = mpData.copies.unrecord; var net9 = function(){ return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); };
    mpData.copies.record = net9; toasts.length = 0; __mpLastToast = { t: '', at: 0 }; await copyOthersTrip(TR); mpData.copies.record = rc9; var k9 = tripCopyOf(TR);
    var t9a = [!!k9, recs()[4], toasts.some(function(t){ return /copy not counted/.test(t); }), toasts.some(function(t){ return /Saved to my trips ✓/.test(t); })];
    T.seed('copies/' + uid + '__' + TR, { uid: uid, kind: 'trip', docKey: TR, at: 1 }); var tt9 = T.get('trips/' + TR); tt9.copyCount = 1; T.seed('trips/' + TR, tt9);
    mpData.copies.unrecord = net9; toasts.length = 0; __mpLastToast = { t: '', at: 0 }; if (k9) await deleteTripById(k9.id); mpData.copies.unrecord = ur9;
    o.toastsKept = [t9a, [!!tripCopyOf(TR), toasts.some(function(t){ return /counter not updated/.test(t); }), toasts.some(function(t){ return /Trip deleted/.test(t); })]];
    await tr(function(){ return mpData.copies.unrecord(uid, 'trip', TR); }); userTrips = [];
    /* «Saved ✓» ← حذف نسختي والإطلاق فشل: لا «Copy removed» · ونسخة سجلها قائم («already»): اليومي للمنتقي لا يزيد */
    var iv0 = mpIsVerified, sc1 = mpTrack.statsCurator, saves = 0; mpIsVerified = function(){ return true; }; mpTrack.statsCurator = function(u, k){ if (k === 'save') saves++; };
    try{
      T.seed('copies/' + uid + '__' + TR, { uid: uid, kind: 'trip', docKey: TR, at: 1 }); var ty = T.get('trips/' + TR); ty.copyCount = 1; T.seed('trips/' + TR, ty); toasts.length = 0; __mpLastToast = { t: '', at: 0 };
      var stA = null; var rcA = mpData.copies.record; mpData.copies.record = function(){ return rcA.apply(this, arguments).then(function(v){ stA = v; return v; }); }; await copyOthersTrip(TR); mpData.copies.record = rcA;
      o.copyAlready = [stA, cnt()[4], saves];
      mpData.copies.unrecord = net9; toasts.length = 0; __mpLastToast = { t: '', at: 0 }; await removeMyTripCopy(TR); mpData.copies.unrecord = ur9;
      o.copyRemoveFailed = [!!tripCopyOf(TR), toasts.some(function(t){ return /counter not updated/.test(t); }), toasts.some(function(t){ return /^Copy removed$/.test(t); })];
      await tr(function(){ return mpData.copies.unrecord(uid, 'trip', TR); });
    } finally { mpIsVerified = iv0; mpTrack.statsCurator = sc1; mpData.copies.record = rc9; mpData.copies.unrecord = ur9; userTrips = []; }
    /* تخلٍّ عن نسخة لم تُحفظ: لا سجل ولا انتظار */
    if (c2){ await mpData.trips.remove(c2.id); await mpData.copies.unrecord(uid, 'trip', TR); userTrips = []; }
    fail = true; sheetAnswer = function(s){ return /Not saved/.test(String(s && s.title || '')) ? 'alt' : 'ok'; }; await copyOthersTrip(TR);
    o.copyDiscarded = [!!tripCopyOf(TR), recs()[4], cnt()[4], Object.keys(tripCopyPending).length];
    /* الموقوف: لا نسخة ولا سجل (saveTrip يعود بلا كتابة) */
    fail = false; T.susp(true); currentUserSuspended = true; toasts.length = 0; await copyOthersTrip(TR);
    o.copySuspended = [!!tripCopyOf(TR), recs()[4], cnt()[4], toasts.slice()];
    T.susp(false); currentUserSuspended = false; mpData.trips.save = sv0; userTrips = ut; try{ mpSaveOk('trips'); }catch(_){ }
  }catch(e){ o.errG = String(e && e.stack || e); } finally { T.susp(false); currentUserSuspended = false; }

  try{ /* (ح) ك-٤ (شقيق) · «Delete this trip» من نافذة الرحلة: حذف فشل لا يُسقط الرحلة من الشاشة · وحذف نجح يُسقطها */
    var ut2 = userTrips; var own = { id: 'trip_b2own', ownerId: uid, title: 'Mine', public: false, sharedWith: [] }; T.seed('trips/trip_b2own', { ownerId: uid, title: 'Mine', public: false, sharedWith: [] }); userTrips = [own];
    var rm0 = mpData.trips.remove; mpData.trips.remove = function(){ return Promise.reject(Object.assign(new Error('net'), { code: 'unavailable' })); };
    sheetAnswer = function(s){ return /Not saved/.test(String(s && s.title || '')) ? 'cancel' : 'ok'; }; currentTripId = 'trip_b2own'; var rm1 = renderMyTripsModal; renderMyTripsModal = function(){}; /* رسم النافذة خارج القياس */ 
    await deleteTrip();
    o.deleteFailed = [userTrips.some(function(t){ return t.id === 'trip_b2own'; }), !!T.get('trips/trip_b2own')];
    mpData.trips.remove = rm0; try{ mpSaveOk('trips'); }catch(_){ } sheetAnswer = function(){ return 'ok'; }; currentTripId = 'trip_b2own'; await deleteTrip();
    o.deleteDone = [userTrips.some(function(t){ return t.id === 'trip_b2own'; }), !!T.get('trips/trip_b2own')];
    renderMyTripsModal = rm1; userTrips = ut2; currentTripId = null;
  }catch(e){ o.errH = String(e && e.stack || e); }

  try{ /* (ط) حذف الحساب — أبواب الإطلاق لحساب آخر D: متابعاته ونسخه تُنقص عدّاداتها · رأيه في المدن وبلاغاته وتصنيفاته اليتيمة تُحذف */
    reset(); var D = 'uB2D';
    var lD = T.get('userCityLists/' + L); lD.copyCount = 2; T.seed('userCityLists/' + L, lD); var tD = T.get('trips/' + TR); tD.copyCount = 1; T.seed('trips/' + TR, tD); var pD = T.get('communityProfiles/' + O); pD.followerCount = 2; T.seed('communityProfiles/' + O, pD);
    T.seed('follows/' + D + '_' + O, { followerUid: D, curatorUid: O, at: 1 }); T.seed('follows/' + D + '_uB2gone', { followerUid: D, curatorUid: 'uB2gone', at: 1 }); /* متابَع حُذف ملفه */
    T.seed('copies/' + D + '__' + L, { uid: D, kind: 'list', docKey: L, at: 1 }); T.seed('copies/' + D + '__' + TR, { uid: D, kind: 'trip', docKey: TR, at: 1 }); T.seed('copies/' + D + '__trip_b2gone', { uid: D, kind: 'trip', docKey: 'trip_b2gone', at: 1 }); T.seed('copies/' + D + '__x:y:z', { uid: D, kind: 'place', docKey: 'x:y:z', at: 1 });
    T.seed('communityProfiles/' + D, { hasAnyPublicContent: true, followerCount: 1 }); T.seed('follows/' + D + '_' + D, { followerUid: D, curatorUid: D, at: 1 }); /* سجل لا تطلقه القاعدة (متابعة للذات مزروعة): يُعدّ في «ما بقي» */
    T.seed('userCityLists/' + D + '_own', { ownerId: D, cityId: 'own', public: true, sharedWith: [], copyCount: 1 }); T.seed('copies/' + D + '__' + D + '_own', { uid: D, kind: 'list', docKey: D + '_own', at: 1 }); /* ونسخة من قائمتي أنا مزروعة: كذلك */
    T.seed('follows/' + D + '_zz_legacy', { followerUid: D, curatorUid: O, at: 1 }); /* معرّف خارج الصيغة: يُحذف وحده */
    T.seed('curatorCityNotes/' + D + '__' + CITY, { uid: D, cityId: CITY, text: 'hi' }); T.seed('reports/r_b2_1', { by: D, kind: 'app', reason: 'x', at: 1 }); T.seed('reports/r_b2_2', { by: 'someoneElse', kind: 'app', reason: 'y', at: 1 }); T.seed('userCityListCats/' + D + '_zz_coffee', { ownerId: D, cityId: 'zz', catId: 'coffee', public: false, sharedWith: [], places: [] });
    T.actor(D); var left = [];
    try{ left.push(await mpData.follows.releaseMine(D)); left.push(await mpData.copies.removeMine(D)); left.push(await mpData.cityNotes.removeMine(D)); left.push(await mpData.reports.removeMine(D)); left.push(await mpData.cityLists.removeOrphanCats(D)); } finally { T.actor(null); }
    o.account = [left, cnt().slice(2), T.keys('follows/' + D + '_').length, T.keys('copies/' + D + '__').length, !!T.get('curatorCityNotes/' + D + '__' + CITY), !!T.get('reports/r_b2_1'), !!T.get('reports/r_b2_2'), !!T.get('userCityListCats/' + D + '_zz_coffee')];
  }catch(e){ o.errI = String(e && e.stack || e); }

  var ioKeep = isOwner;
  try{ /* (ط٢) مالك التطبيق: القواعد تقبل كتاباته كلها، فبابه يقرأ قبل أن يكتب — لا نقص بلا سجل · لا نزول تحت الصفر · لا ملف شبح · ولا عدّ على مصدر مغلق */
    reset(); T.boss(true); isOwner = true;
    var lo = T.get('userCityLists/' + L); lo.bookmarkCount = 2; T.seed('userCityLists/' + L, lo); var uo = T.get('userLists/' + uid) || {}; uo.listBookmarkIds = uo.listBookmarkIds || {}; uo.listBookmarkIds[L] = true; T.seed('userLists/' + uid, uo);
    var o1 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), cnt()[0], mir()[0]]; /* مرآة بلا سجل */
    T.seed('follows/' + uid + '_' + O, { followerUid: uid, curatorUid: O, at: 1 });
    var o2 = [await tr(function(){ return mpData.follows.set(uid, O, false); }), cnt()[2], recs()[2]]; /* سجل قديم والعدّاد صفر */
    T.seed('follows/' + uid + '_uB2gone', { followerUid: uid, curatorUid: 'uB2gone', at: 1 });
    var o3 = [await tr(function(){ return mpData.follows.set(uid, 'uB2gone', false); }), !!T.get('communityProfiles/uB2gone'), !!T.get('follows/' + uid + '_uB2gone')]; /* ملف المتابَع حُذف */
    var lp = T.get('userCityLists/' + L); lp.public = false; T.seed('userCityLists/' + L, lp);
    var o4 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, true); }), recs()[0], cnt()[0]]; /* مصدر خاص: المالك يقرؤه لكن لا يُعدّ عليه */
    lp.public = true; T.seed('userCityLists/' + L, lp);
    var o5 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, true); }), cnt()[0], await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), cnt()[0], recs()[0]]; /* الطريق العادي يعمل */
    var PF = 'b2b2b2b2b2b2b2b2'; T.seed('placeFavoriteCounts/' + PF, { name: 'Zero', url: 'https://maps.app.goo.gl/b2zero', count: 0 }); T.seed('copies/' + uid + '__p_' + PF, { uid: uid, kind: 'place', docKey: 'p_' + PF });
    var o6 = [await tr(function(){ return mpData.placeCounts.unbind(uid, PF); }), num('placeFavoriteCounts/' + PF, 'count'), !!T.get('copies/' + uid + '__p_' + PF)]; /* «saved by» عند الصفر: لا نزول تحته (شقيق) */
    var lq = T.get('userCityLists/' + L); lq.public = false; lq.copyCount = 0; lq.bookmarkCount = 2; T.seed('userCityLists/' + L, lq);
    var o7 = [await tr(function(){ return mpData.copies.record(uid, 'list', L); }), recs()[3], cnt()[3]]; /* نسخ قائمة خاصة: القاعدة تقبله من المالك — الباب لا يعدّ على مصدر مغلق */
    T.seed('listBookmarks/' + uid + '__' + L, { at: 1 });
    var o8 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), cnt()[0], recs()[0]]; /* مفكرة على قائمة صارت خاصة: السجل وحده والعدّاد لا يتحرّك (كغير المالك) */
    /* قاعدة السجل لا ترى increment: المالك أيضًا يُتمّ بقيمة صريحة (كان يفقدها) */
    lq.public = true; lq.bookmarkCount = 0; T.seed('userCityLists/' + L, lq); T.del('listBookmarks/' + uid + '__' + L); T.noT(true);
    var o9 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, true); }), cnt()[0], await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), cnt()[0], recs()[0]]; T.noT(false);
    /* مشاهدة ملف غائب: لا ملف شبح يُنشأ */
    var o10 = [await tr(function(){ return mpData.communityProfiles.bumpView('uB2ghost'); }), !!T.get('communityProfiles/uB2ghost')];
    /* علم الصفحة لم يُضبط (قراءة الإقلاع فشلت) والحساب مالك في القواعد: الباب يسأل مرة ثم يقرأ قبل أن يكتب */
    isOwner = false; var ou0 = ownerUid; ownerUid = null; mpData.ownerForget(); var lr = T.get('userCityLists/' + L); lr.bookmarkCount = 2; T.seed('userCityLists/' + L, lr); var ur = T.get('userLists/' + uid) || {}; ur.listBookmarkIds = ur.listBookmarkIds || {}; ur.listBookmarkIds[L] = true; T.seed('userLists/' + uid, ur);
    var rp = T.rmark(); var o11 = [await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }), cnt()[0], T.rsince(rp).filter(function(k){ return k === 'settings/app'; }).length];
    rp = T.rmark(); await tr(function(){ return mpData.bookmarks.toggleList(uid, O, CITY, false); }); o11.push(T.rsince(rp).filter(function(k){ return k === 'settings/app'; }).length); ownerUid = ou0; mpData.ownerForget();
    o.boss = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11];
  }catch(e){ o.errI2 = String(e && e.stack || e); } finally { T.boss(false); T.noT(false); isOwner = ioKeep; try{ mpData.ownerForget(); }catch(_){ } }

  try{ /* (ي) ك-١١ · ملفي وقائمتي لا يُعدّان لي: لا كتابة تُرسل */
    var m9 = T.mark(); var b1 = await mpData.communityProfiles.bumpView(uid); var b2 = await mpData.lists.bumpView(uid, 'paris');
    o.selfView = [b1, b2, T.since(m9).length];
    var pr9 = T.get('communityProfiles/' + uid) || null; var had9 = !!pr9; if (!pr9){ pr9 = { nickname: (userListData && userListData.nickname) || 'me', hasAnyPublicContent: true, viewCount: 7, publicCityIds: [] }; T.seed('communityProfiles/' + uid, pr9); }
    var v9 = pr9.viewCount || 0; var keepV = [viewingUserUid, viewingUserData, (typeof viewingUserCities === 'undefined') ? undefined : viewingUserCities, communityUserLayer];
    try{ await viewCommunityUser(uid); await wait(60); o.selfShown = [viewingUserData ? (viewingUserData.viewCount || 0) : 'none', v9, num('communityProfiles/' + uid, 'viewCount') || 0]; }
    finally { viewingUserUid = keepV[0]; viewingUserData = keepV[1]; viewingUserCities = keepV[2]; communityUserLayer = keepV[3]; if (!had9) T.del('communityProfiles/' + uid); }
  }catch(e){ o.errJ = String(e && e.stack || e); }

  T.reads(false);
  showToast = st0; window.__mpSheetAuto = a0; renderCommunityModal = rc0; renderCuratorsBody = rb0; openConfirmModal = oc0; showUndoToast = ut0; currentTab = tab0; listBookmarksMap = null; tripSavesMap = null;
  return JSON.stringify(o);
})()
