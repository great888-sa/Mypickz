// MyPickz — tests/rules-sim.js
// يختبر firestore.rules على محرك Firebase الرسمي (المحاكي) — لا تفسير خاص لدلالات القواعد.
// v3.16 (١١ نوفمبر ٢٠٢٦ — r117): + القسم ٢٩ (٢٤ حالة — ٩ للربط و١٥ للاتجاه الثاني ومعرّف العدّاد واسمه ورابطه) وقياسات INFO لا تدخل الحصيلة: placeFavoriteCounts مربوط بسجل صاحبه copies/<uid>__p_<docId> (+١ بإنشائه بالطلب نفسه · −١ بحذفه) — حالات العدّاد الأقدم (٦ · ١٧ · ١٩ · ٢٨) صارت بالدفعة نفسها؛
//   + القسم ٣٠ (٤ حالات): مفاتيح الأحداث الأربعة المحذوفة تُرفض. لم تُشغَّل على المحاكي في بيئة الكتابة — يشغّلها CI.
// v3.15 (١١ نوفمبر ٢٠٢٦ — r116-أ «الرائج في المدينة»): + القسم ٢٨ (٥ حالات): placeFavoriteCounts يقبل city الاختياري بنمطه عند الإنشاء؛ التحديث لا يغيّره.
// v3.14 (٩ أكتوبر ٢٠٢٦ — ب-٢ My stats): + القسم ٢٧ (٧ حالات): المفتاح اليومي save بـstats_curators؛ المفاتيح القديمة وقيود ±١..٥٠ والقراءة كما هي.
// v3.13 (١ أكتوبر ٢٠٢٦ — الإحكام): + القسم ٢٦ (٩ حالات) · حالات الأم بـcategories صارت مرفوضة · حالات cities حُذفت · المدن بالتحليلات بمعرّف المعجم.
// v3.12 (٢٩ سبتمبر ٢٠٢٦ — others عام): + القسم ٢٥ (٦ حالات) · تُحدَّث حالات others القديمة.
// v3.11 (٢٤ سبتمبر ٢٠٢٦ — سجل هوية الأماكن): + القسم ٢٤ (١٤ حالة).
// M4.26 (٢٢ سبتمبر ٢٠٢٦ — التقسيم والأسطر الثمانية): + القسم ٢٣ (~٥٠ حالة).
// M4.25 (١٧ سبتمبر ٢٠٢٦ — النشرة الجامعة على أ-٦): + القسم ٢٢ — ٦٤ حالة (hasTop للموثَّق · geoSources/legSources/flagsUsed/catsV · copyCount بسجل copies ذرّيًّا
//   · عدّاد المتابعين للموثَّقين بلا محتوى وبالدفعة (existsAfter) · curatorCityNotes · curatorRequests · reports · stats_cities · مفاتيح الإحصاء الجديدة والقديمة) — المجموع ٥١١.
// M4.24 (٤ سبتمبر ٢٠٢٦ — نشرة التنظيف الثنائية): اجتثاث مجموعة favorites بحدثَيها (حالاتها العشر صارت حالتَي
//   حراسة رفض افتراضي) · bookmark_add محل reserved_1 وfavorite_add بحالات الأحداث — المجموع ٤٤٧ حالة.
// v3.8 (٣ سبتمبر ٢٠٢٦ — نشرة القرار المؤسِّس ٠٩، سطور M4.23 أقرّها المالك أولًا): + القسم ٢١ وقلب سبع حالات إعجاب مجمَّدة:
//   سجل مفكرة القوائم وعدّادها المربوط · سجل حفظ الرحلات وعدّاده · تجميد favoriteCount بالمجموعات الثلاث ·
//   عدّاد مشاهدات القائمة · قراءة المستند الغائب لصاحب البادئة · خصوصية السجلين (الثابت ١٢ — «كم لا مَن»)
// v3.7 (٢٦ أغسطس ٢٠٢٦ — دفعة الإطار خ٣): + القسم ٢٠ — ٣٩٠ حالة (٣٤٣ + ٤٧): المتابعة · حقول الملف والفجوات ١٥–١٨ · تفضيل الرحلات
// v3.6 (٢٥ أغسطس ٢٠٢٦ — الشرط الحاجب، ثلاثة قرارات): + القسم ١٩ — ٣٤٣ حالة (٣١٩ + ٢٤)
// v3.5 (٢٤ أغسطس ٢٠٢٦ — الشرط الحاجب): + القسم ١٨ — ٣١٩ حالة
// يُشغَّل بـ: npx firebase emulators:exec --only firestore --project demo-mypickz "node tests/rules-sim.js"
// كل حالة تُطبع بسطر PASS/FAIL. أي FAIL ⇒ رمز خروج ١ ⇒ الناشر يتوقف.
// v3.17 (١٢ نوفمبر ٢٠٢٦ — إصلاحات المراجعة الشاملة · المحور ١ · ق١١-١٢-٠٥): + القسم ٣٢ (حالات النص الجديد) · قياسات القسم ٣١ صارت محتسبة (المتوقَّع لكل قياس تحت v3.17)
//   · الحالات القائمة التي كانت تنشئ سجلًّا أو تحذفه وحده انقلبت إلى رفض (الربط بالاتجاهين) وحالتها تُبذر بقواعد معطَّلة كي يبقى ما بعدها كما هو
//   · التواريخ الحرفية في معرّفات المستندات اليومية تُحوَّل عند النداء إلى أمس/اليوم/غدًا (نافذة التاريخ) — انظر DATE_MAP
// قياسات المراجعة الشاملة (١٢ نوفمبر ٢٠٢٦ · ق١١-١٢-٠٢): + القسم ٣١ — أسطر INFO خارج الحصيلة (الحالات المحتسبة تبقى ٦٧١) · خلاصتها أسطر «PS» آخر السجل
'use strict';
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'demo-mypickz'; // بادئة demo- = وضع محاكاة صريح بلا اعتماد على المشروع الحقيقي ولا تسجيل دخول
const RULES = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

// الأدوار الأربعة (مستخرجة من نص القواعد): بلا حساب · مستخدم عادي · مستخدم مُوقَف · المالك
/* v3.16 (١-ب): معرّف العدّاد بصمة ١٦ خانة ست-عشرية — الحالات تسمّي عدّاداتها بأسماء قصيرة (p1 · c28a) وهذه الدالة تجعلها بالنمط */
const pf = (name) => ('0000000000000000' + Buffer.from(String(name)).toString('hex')).slice(-16);
const OWNER = 'owner1';
const A = 'userA';        // مستخدم عادي (صاحب الشأن بأغلب الحالات)
const B = 'userB';        // مستخدم عادي آخر (يملك محتوى عامًّا وخاصًّا)
const S = 'userS';        // مُوقَف — له مستند suspensions/userS
const N = 'userN';        // مستخدم بملف مجتمعي غير عام (لاختبار العدّادات)
const TODAY = '2026-08-18';

let pass = 0, fail = 0;
async function expect(allowed, label, promiseFactory){
  try {
    if (allowed) await assertSucceeds(promiseFactory()); else await assertFails(promiseFactory());
    pass++; console.log('PASS  ' + label);
  } catch (e) {
    fail++; console.log('FAIL  ' + label + '  →  expected ' + (allowed ? 'ALLOW' : 'DENY') + ' | ' + String(e && e.message || e).slice(0, 140));
  }
}
const ok = (label, f) => expect(true, label, f);
const no = (label, f) => expect(false, label, f);

(async () => {
  process.exitCode = 1; // حارس صدق: إن فرغت حلقة الأحداث وحالةٌ معلَّقة (وعد لا يُحسم) يخرج التشغيل برمز ١ لا بصفر — السطر الأخير process.exit هو الذي يعلن النجاح
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 }
  });

  /* v3.17 (٥-ب): نافذة التاريخ — المستند اليومي يُقبل لأمس واليوم وغدًا بساعة الخادم. الحالات كُتبت بتواريخ حرفية ثابتة (٢٠٢٦-٠٨-١٩ …)؛
     بدل إعادة كتابة مئة معرّف، كل نداء doc() يحوّل التاريخ الحرفي إلى يوم من الثلاثة بهذا الجدول (مرة واحدة لكل نداء). التاريخ غير المذكور يبقى كما هو — به تُكتب حالات «خارج النافذة».
     القاعدة: تاريخ يُنشأ عليه مستند جديد بنجاح لا يشاركه تاريخ آخر في اليوم نفسه للمعرّف نفسه (روجعت الحالات واحدة واحدة). تشغيل يعبر منتصف الليل بالتوقيت العالمي قد يُسقط حالات «أمس» — يُعاد. */
  const DAY = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const D0 = DAY(0), DM = DAY(-1), DP = DAY(1);
  const DATE_MAP = { '2026-08-18': D0, '2026-08-19': DM, '2026-08-20': DP, '2026-08-21': DP, '2026-08-22': DP, '2026-08-23': DP, '2026-08-25': DP, '2026-08-26': DM, '2026-08-27': DP,
    '2026-09-17': D0, '2026-09-18': DP, '2026-10-01': D0, '2026-10-09': DP, '2026-11-09': D0, '2026-11-10': DM, '2026-11-11': DP };
  const mapDates = (path) => String(path).replace(/20\d\d-\d\d-\d\d/g, (d) => DATE_MAP[d] || d);
  const wrapFs = (fs) => { if (fs && !fs.__mpDates){ const doc0 = fs.doc.bind(fs); fs.doc = (path) => doc0(mapDates(path)); fs.__mpDates = true; } return fs; };
  const wrapCtx = (ctx) => { if (ctx && !ctx.__mpDates){ const f0 = ctx.firestore.bind(ctx); ctx.firestore = function(){ return wrapFs(f0.apply(null, arguments)); }; ctx.__mpDates = true; } return ctx; };
  { const ac = env.authenticatedContext.bind(env), uc = env.unauthenticatedContext.bind(env), wd = env.withSecurityRulesDisabled.bind(env);
    env.authenticatedContext = function(){ return wrapCtx(ac.apply(null, arguments)); };
    env.unauthenticatedContext = function(){ return wrapCtx(uc.apply(null, arguments)); };
    env.withSecurityRulesDisabled = function(fn){ return wd(function(ctx){ return fn(wrapCtx(ctx)); }); }; }
  /* v3.17 (١١): حالة تُبذر أو تُزال بقواعد معطَّلة — حين تنقلب حالة قديمة إلى رفض وما بعدها يعتمد على أثرها */
  const seedDoc = (path, data) => env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(path).set(data); });
  const dropDoc = (path) => env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(path).delete(); });

  // ---------- بيانات البذر (بقواعد معطَّلة) ----------
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('settings/app').set({ ownerUid: OWNER });
    await db.doc(`suspensions/${S}`).set({ at: 1, by: OWNER, email: 's@x' });
    await db.doc(`userLists/${A}`).set({ public: false, nickname: 'a', favoriteCount: 0 });
    await db.doc(`userLists/${B}`).set({ public: true, nickname: 'b', favoriteCount: 3 });
    await db.doc(`userLists/${S}`).set({ public: false, nickname: 's', favoriteCount: 0 });
    await db.doc('trips/tA').set({ ownerId: A, public: false, sharedWith: [], name: 'A private' });
    await db.doc('trips/tB').set({ ownerId: B, public: false, sharedWith: [A], name: 'B shared with A' });
    await db.doc('trips/tBpriv').set({ ownerId: B, public: false, sharedWith: [], name: 'B private' });
    await db.doc('trips/tBpub').set({ ownerId: B, public: true, sharedWith: [], name: 'B public' });
    await db.doc('trips/tS').set({ ownerId: S, public: false, sharedWith: [], name: 'S private' });
    await db.doc('userCityLists/cA').set({ ownerId: A, public: false, sharedWith: [], favoriteCount: 0 });
    await db.doc('userCityLists/cBpub').set({ ownerId: B, public: true, sharedWith: [], favoriteCount: 2 });
    await db.doc('userCityLists/cBpriv').set({ ownerId: B, public: false, sharedWith: [], favoriteCount: 0 });
    await db.doc('userCityLists/cS').set({ ownerId: S, public: false, sharedWith: [], favoriteCount: 0 });
    await db.doc(`communityProfiles/${A}`).set({ hasAnyPublicContent: false, viewCount: 0, totalFavoriteCount: 0 });
    await db.doc(`communityProfiles/${B}`).set({ hasAnyPublicContent: true, viewCount: 5, totalFavoriteCount: 2 });
    await db.doc(`communityProfiles/${N}`).set({ hasAnyPublicContent: false, viewCount: 0, totalFavoriteCount: 0 });
    await db.doc('nicknames/nick_a').set({ uid: A, nickname: 'a' });
    await db.doc('nicknames/nick_b').set({ uid: B, nickname: 'b' });
    await db.doc('nicknames/nick_s').set({ uid: S, nickname: 's' });
    await db.doc(`users/${A}`).set({ email: 'a@x', nickname: 'a' });
    await db.doc(`users/${B}`).set({ email: 'b@x', nickname: 'b' });
    await db.doc(`users/${S}`).set({ email: 's@x', nickname: 's' });
    await db.doc('analytics/visits').set({ count: 10 });
    await db.doc('stats/users').set({ count: 4 });
    await db.doc('placeFavoriteCounts/' + pf('p1')).set({ name: 'Holybelly', url: 'https://maps.app.goo.gl/x', count: 2 });
    await db.doc(`copies/${S}__p_${pf('p1')}`).set({ uid: S, kind: 'place', docKey: 'p_' + pf('p1') }); /* v3.16: سجل الموقوف القائم — به يسحب حفظه (−١) */
    await db.doc(`dailyStats/${TODAY}`).set({ newSignupsToday: 2, activeToday: 5 });
  });

  const guest = env.unauthenticatedContext().firestore();
  const a = env.authenticatedContext(A).firestore();
  const b = env.authenticatedContext(B).firestore();
  const s = env.authenticatedContext(S).firestore();
  const owner = env.authenticatedContext(OWNER).firestore();

  // ================= ١) settings =================
  await ok('settings read guest', () => guest.doc('settings/app').get());
  await ok('settings read user', () => a.doc('settings/app').get());
  await ok('settings read suspended', () => s.doc('settings/app').get());
  await ok('settings read owner', () => owner.doc('settings/app').get());
  await no('settings write guest', () => guest.doc('settings/app').set({ x: 1 }, { merge: true }));
  await no('settings write user', () => a.doc('settings/app').set({ x: 1 }, { merge: true }));
  await no('settings write suspended', () => s.doc('settings/app').set({ x: 1 }, { merge: true }));
  await ok('settings write owner', () => owner.doc('settings/app').set({ x: 1 }, { merge: true }));

  // ================= ٢) cities =================

  // ================= ٣) suspensions =================
  await no('suspensions read guest', () => guest.doc(`suspensions/${S}`).get());
  await ok('suspensions read own (suspended reads own record)', () => s.doc(`suspensions/${S}`).get());
  await ok('suspensions read own missing (normal user reads own — doc absent, allowed)', () => a.doc(`suspensions/${A}`).get());
  await no('suspensions read other user', () => a.doc(`suspensions/${S}`).get());
  await ok('suspensions read owner', () => owner.doc(`suspensions/${S}`).get());
  await no('suspensions write user', () => a.doc(`suspensions/${B}`).set({ at: 1 }));
  await no('suspensions DELETE OWN by suspended (root exploit closed)', () => s.doc(`suspensions/${S}`).delete());
  await ok('suspensions write owner', () => owner.doc(`suspensions/${B}`).set({ at: 1, by: OWNER }));
  await ok('suspensions delete owner', () => owner.doc(`suspensions/${B}`).delete());

  // ================= ٤) analytics/visits =================
  await ok('analytics read guest', () => guest.doc('analytics/visits').get());
  await ok('analytics update +1 guest', () => guest.doc('analytics/visits').update({ count: 11 }));
  await no('analytics update +2', () => guest.doc('analytics/visits').update({ count: 13 }));
  await no('analytics reset to 0', () => guest.doc('analytics/visits').update({ count: 0 }));
  await no('analytics update extra field', () => a.doc('analytics/visits').update({ count: 12, hacked: true }));
  await no('analytics delete owner', () => owner.doc('analytics/visits').delete());
  await no('analytics create other doc', () => guest.doc('analytics/other').set({ count: 1 }));
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('analytics/visits').delete());
  await ok('analytics create {count:1} guest', () => guest.doc('analytics/visits').set({ count: 1 }));
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('analytics/visits').delete());
  await no('analytics create {count:5}', () => guest.doc('analytics/visits').set({ count: 5 }));
  await no('analytics create extra field', () => guest.doc('analytics/visits').set({ count: 1, x: 1 }));

  // ================= ٤-ب) v3.3: analytics/errors_* =================
  const ED = 'analytics/errors_2026-08-19';
  await ok('errors create {TypeError:1,total:1} guest', () => guest.doc(ED).set({ TypeError: 1, total: 1 }));
  await no('errors create with message field', () => guest.doc('analytics/errors_2026-08-20').set({ TypeError: 1, message: 'x' }));
  await no('errors create value 60 (>50)', () => guest.doc('analytics/errors_2026-08-21').set({ TypeError: 60 }));
  await no('errors create value 0', () => guest.doc('analytics/errors_2026-08-22').set({ TypeError: 0 }));
  await no('errors create string value', () => guest.doc('analytics/errors_2026-08-23').set({ TypeError: 'many' }));
  await no('errors create bad id', () => guest.doc('analytics/errors_today').set({ TypeError: 1 }));
  await ok('errors update +1 two keys guest', () => guest.doc(ED).update({ TypeError: 2, total: 2 }));
  await ok('errors update +50 user', () => a.doc(ED).update({ Other: 50, total: 52 }));
  await no('errors update +51', () => guest.doc(ED).update({ TypeError: 53 }));
  await no('errors update decrease', () => guest.doc(ED).update({ TypeError: 1 }));
  await no('errors update unknown key', () => guest.doc(ED).update({ hack: 1 }));
  await no('errors read guest (owner-only)', () => guest.doc(ED).get());
  await no('errors read user (owner-only)', () => a.doc(ED).get());
  await ok('errors read owner', () => owner.doc(ED).get());
  await no('errors delete owner', () => owner.doc(ED).delete());
  await ok('visits still public read after v3.3', () => guest.doc('analytics/visits').get());

  // ================= ٤-ج) v3.3: analytics/events_* =================
  const EV = 'analytics/events_2026-08-19__2988507__cafes';
  await ok('events create {place_open:3} guest (real city)', () => guest.doc(EV).set({ place_open: 3 }));
  await no('events create unknown city (not a gazetteer id)', () => guest.doc('analytics/events_2026-08-19__nowhere__cafes').set({ place_open: 1 }));
  await ok('events create city all / category all', () => guest.doc('analytics/events_2026-08-19__all__all').set({ visit_source: 1, signup_start: 1 }));
  await ok('events create two kept keys (share_card, personal_open)', () => guest.doc('analytics/events_2026-08-19__2988507__all').set({ share_card: 1, personal_open: 2 }));
  await no('events create unknown key', () => guest.doc('analytics/events_2026-08-19__2988507__bars').set({ hack: 1 }));
  await ok('events create import keys (reserved for ب-١)', () => guest.doc('analytics/events_2026-08-19__2988507__import').set({ import_run: 1, import_place: 30, import_suggest_kept: 20, import_suggest_changed: 10 }));
  await ok('events create bookmark_add (نشرة التنظيف — محل reserved_1)', () => guest.doc('analytics/events_2026-08-19__all__lists').set({ bookmark_add: 1 }));
  await no('events create reserved_1 (استُهلك — خرج من القائمة)', () => guest.doc('analytics/events_2026-08-19__all__list2').set({ reserved_1: 1 }));
  await ok('events create personal_* (aggregate only, city all)', () => guest.doc('analytics/events_2026-08-19__all__personal').set({ personal_open: 3, personal_save: 1, personal_place_open: 2 }));
  await no('events create uppercase city (bad id)', () => guest.doc('analytics/events_2026-08-19__Paris__cafes').set({ place_open: 1 }));
  await no('events create with uid field', () => guest.doc('analytics/events_2026-08-19__2988507__hotels').set({ place_open: 1, uid: 'x' }));
  await ok('events update +50 user', () => a.doc(EV).update({ place_open: 53 }));
  await no('events update +51', () => guest.doc(EV).update({ place_open: 104 }));
  await no('events update decrease', () => guest.doc(EV).update({ place_open: 1 }));
  await ok('events update add second key +1 (bookmark_add)', () => guest.doc(EV).update({ bookmark_add: 1 }));
  // r115-ب: رؤية البوابة (reserved_3) من زائر · وحدّ الستة مفاتيح في التحديث (eventsUpdateOk: aff.size() <= 6) — العميل يقسّم الدفعة عليه
  await ok('events create reserved_3 by a guest, city all (gate seen — r115)', () => guest.doc('analytics/events_2026-08-19__all__gate').set({ reserved_3: 1 }));
  await ok('events update six keys at once', () => guest.doc('analytics/events_2026-08-19__all__all').update({ place_open: 1, bookmark_add: 1, mylist_open: 1, mylist_save: 1, trip_open: 1, trip_save: 1 }));
  await no('events update seven keys at once (the client splits at six)', () => guest.doc('analytics/events_2026-08-19__all__all').update({ place_open: 2, bookmark_add: 2, mylist_open: 2, mylist_save: 2, trip_open: 2, trip_save: 2, community_open: 1 }));
  await no('events read user (owner-only)', () => a.doc(EV).get());
  await ok('events read owner', () => owner.doc(EV).get());
  await no('events delete owner', () => owner.doc(EV).delete());

  // ================= ٤-د) v3.3: sources_* / hours_* / sessions_* =================
  await ok('sources create guest (real city)', () => guest.doc('analytics/sources_2026-08-19__2988507').set({ src_app: 3, ref_ig: 1 }));
  await no('sources create unknown key', () => guest.doc('analytics/sources_2026-08-19__all').set({ src_x: 1 }));
  await no('sources create unknown city', () => guest.doc('analytics/sources_2026-08-19__nowhere').set({ src_app: 1 }));
  await ok('sources update +1', () => guest.doc('analytics/sources_2026-08-19__2988507').update({ ref_card: 1 }));
  await no('sources read user', () => a.doc('analytics/sources_2026-08-19__2988507').get());
  await ok('sources read owner', () => owner.doc('analytics/sources_2026-08-19__2988507').get());
  await ok('hours create guest', () => guest.doc('analytics/hours_2026-08-19__2988507').set({ h14: 5, h15: 2 }));
  await no('hours create key h24', () => guest.doc('analytics/hours_2026-08-19__all').set({ h24: 1 }));
  await ok('hours update +1', () => guest.doc('analytics/hours_2026-08-19__2988507').update({ h14: 6 }));
  await no('hours read user', () => a.doc('analytics/hours_2026-08-19__2988507').get());
  await ok('sessions create guest', () => guest.doc('analytics/sessions_2026-08-19__2988507').set({ count: 1, seconds: 600, depth: 4 }));
  await no('sessions create seconds 9000 (>7200)', () => guest.doc('analytics/sessions_2026-08-19__all').set({ count: 1, seconds: 9000 }));
  await ok('sessions create seconds 7200 (max)', () => guest.doc('analytics/sessions_2026-08-19__all').set({ count: 1, seconds: 7200 }));
  await no('sessions create count 60 (>50)', () => guest.doc('analytics/sessions_2026-08-20__all').set({ count: 60 }));
  await no('sessions create extra field', () => guest.doc('analytics/sessions_2026-08-20__2988507').set({ count: 1, uid: 'x' }));
  await ok('sessions update +seconds', () => guest.doc('analytics/sessions_2026-08-19__2988507').update({ count: 2, seconds: 900 }));
  await no('sessions read user', () => a.doc('analytics/sessions_2026-08-19__2988507').get());
  await ok('sessions read owner', () => owner.doc('analytics/sessions_2026-08-19__2988507').get());

  // ================= ٤-هـ) v3.3: stats_lists =================
  await ok('stats_lists create guest (existing list cA)', () => guest.doc('stats_lists/cA').set({ open_community: 1, open_app: 1 })); // M4.25: مفاتيح §١٧-ج
  await no('stats_lists create unknown list', () => guest.doc('stats_lists/zzz').set({ open_app: 1 }));
  await ok('stats_lists create daily doc', () => guest.doc('stats_lists/cA__2026-08-19').set({ open_community: 1, open_app: 1 }));
  await no('stats_lists create unknown key', () => guest.doc('stats_lists/cBpub').set({ hack: 1 }));
  await ok('stats_lists update +1', () => guest.doc('stats_lists/cA').update({ open_app: 2, copy_from: 1 }));
  await no('stats_lists update +51', () => guest.doc('stats_lists/cA').update({ open_app: 53 }));
  await no('stats_lists update decrease', () => guest.doc('stats_lists/cA').update({ open_app: 1 }));
  await ok('stats_lists read by list owner (A)', () => a.doc('stats_lists/cA').get());
  await ok('stats_lists read daily by list owner (A)', () => a.doc('stats_lists/cA__2026-08-19').get());
  await no('stats_lists read by other user (B)', () => b.doc('stats_lists/cA').get());
  await no('stats_lists read guest', () => guest.doc('stats_lists/cA').get());
  await ok('stats_lists read app owner', () => owner.doc('stats_lists/cA').get());
  await no('stats_lists delete by list owner', () => a.doc('stats_lists/cA__2026-08-19').delete());
  await ok('stats_lists delete app owner', () => owner.doc('stats_lists/cA__2026-08-19').delete());

  // ================= ٤-و) v3.3: stats_trips =================
  await ok('stats_trips create guest (existing trip tA)', () => guest.doc('stats_trips/tA').set({ view_total: 1 }));
  await no('stats_trips create unknown trip', () => guest.doc('stats_trips/nope').set({ view_total: 1 }));
  await ok('stats_trips update view_total +1', () => guest.doc('stats_trips/tA').update({ view_total: 2 }));
  await ok('stats_trips read by trip owner (A)', () => a.doc('stats_trips/tA').get());
  await no('stats_trips read by other (B)', () => b.doc('stats_trips/tA').get());
  await ok('stats_trips read app owner', () => owner.doc('stats_trips/tA').get());

  // ================= ٤-ز) v3.3: stats_places =================
  await ok('stats_places create guest (list cA + 16-hex hash)', () => guest.doc('stats_places/cA__0123456789abcdef').set({ open_total: 2 }));
  await no('stats_places create short hash', () => guest.doc('stats_places/cA__abc').set({ open_total: 1 }));
  await no('stats_places create unknown list', () => guest.doc('stats_places/zzz__0123456789abcdef').set({ open_total: 1 }));
  await no('stats_places create unknown key', () => guest.doc('stats_places/cA__fedcba9876543210').set({ url: 'x' }));
  await ok('stats_places update trip_add +1', () => guest.doc('stats_places/cA__0123456789abcdef').update({ trip_add: 1 }));
  await ok('stats_places read by list owner (A)', () => a.doc('stats_places/cA__0123456789abcdef').get());
  await no('stats_places read by other (B)', () => b.doc('stats_places/cA__0123456789abcdef').get());
  await no('stats_places read guest', () => guest.doc('stats_places/cA__0123456789abcdef').get());

  // ================= ٤-ز-٢) v3.3.1: stats_places — أماكن دليل المالك =================
  await no('[v3.13 owner_ places gone] stats_places owner guide create (no such user list)', () => guest.doc('stats_places/owner_nowhere__0123456789abcdef').set({ open_total: 5 }));
  await no('stats_places owner guide unknown city', () => guest.doc('stats_places/owner_nowhere__0123456789abcdef').set({ open_total: 1 }));
  await no('stats_places owner guide uppercase city (bad id)', () => guest.doc('stats_places/owner_Paris__0123456789abcdef').set({ open_total: 1 }));
  await no('[v3.13 owner_ places gone] stats_places owner guide update +1 (no such user list)', () => guest.doc('stats_places/owner_nowhere__0123456789abcdef').update({ open_total: 6 }));
  await ok('stats_places read by app owner (any id)', () => owner.doc('stats_places/owner_paris__0123456789abcdef').get());
  await no('stats_places owner guide read by user', () => a.doc('stats_places/owner_paris__0123456789abcdef').get());
  await no('stats_places owner guide read guest', () => guest.doc('stats_places/owner_paris__0123456789abcdef').get());
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('userCityLists/owner_paris').set({ ownerId: B, public: false, sharedWith: [] }));
  await no('stats_places owner guide read by user who forged userCityLists/owner_paris', () => b.doc('stats_places/owner_paris__0123456789abcdef').get());

  // ================= ٤-ح) v3.3: stats_curators / stats_cards =================
  const CUR = 'abcdefghijklmnopqrstuvwxyz12';
  const cur = env.authenticatedContext(CUR).firestore();
  await seedDoc('communityProfiles/' + CUR, { hasAnyPublicContent: true }); await seedDoc('communityProfiles/userB00000000000000000', { hasAnyPublicContent: true }); /* v3.17 (٥): عدّاد المنتقي لملف قائم */
  await ok('stats_curators create guest (uid-shaped id)', () => guest.doc('stats_curators/' + CUR).set({ page_view: 1, ref_social: 1 }));
  await no('stats_curators create short id', () => guest.doc('stats_curators/userA').set({ page_view: 1 }));
  await ok('stats_curators create daily', () => guest.doc('stats_curators/' + CUR + '__2026-08-19').set({ contact_click: 1 }));
  await no('stats_curators create unknown key', () => guest.doc('stats_curators/' + CUR).set({ followers_list: 1 }));
  await ok('stats_curators read by curator', () => cur.doc('stats_curators/' + CUR).get());
  await no('stats_curators read by other user', () => a.doc('stats_curators/' + CUR).get());
  await ok('stats_curators read app owner', () => owner.doc('stats_curators/' + CUR).get());
  await ok('stats_cards create guest (uid__cardId)', () => guest.doc('stats_cards/' + CUR + '__card_0001').set({ view_social: 1, view_total: 1 }));
  await no('stats_cards create bad id', () => guest.doc('stats_cards/card1').set({ view_total: 1 }));
  await ok('stats_cards update +1', () => guest.doc('stats_cards/' + CUR + '__card_0001').update({ view_total: 2, view_social: 2 })); // M4.25: مفاتيح §١٧-ج
  await ok('stats_cards read by card owner', () => cur.doc('stats_cards/' + CUR + '__card_0001').get());
  await no('stats_cards read by other', () => a.doc('stats_cards/' + CUR + '__card_0001').get());
  await ok('stats_cards read app owner', () => owner.doc('stats_cards/' + CUR + '__card_0001').get());

  // ================= ٥) stats =================
  await ok('stats read guest', () => guest.doc('stats/users').get());
  await no('stats create guest', () => guest.doc('stats/new').set({ count: 1 }));
  await ok('stats create {count:1} user', () => a.doc('stats/new').set({ count: 1 }));
  await ok('stats update +1 user', () => a.doc('stats/users').update({ count: 5 }));
  await no('stats update +2', () => a.doc('stats/users').update({ count: 7 }));
  await no('stats delete user', () => a.doc('stats/users').delete());
  await ok('stats delete owner', () => owner.doc('stats/new').delete());

  // ================= ٦) placeFavoriteCounts (v3.8: عدّاد حفظ المكان — البنية كما هي) =================
  const pfc = { name: 'X', url: 'https://maps.app.goo.gl/y', count: 1 };
  /* v3.16 (r117-أ): الزيادة والنقص بدفعة واحدة مع سجل صاحبها copies/<uid>__p_<docId> */
  const pfcUp = (ctx, uid, name, data, create) => { const id = pf(name); const btch = ctx.batch(); btch.set(ctx.doc(`copies/${uid}__p_${id}`), { uid, kind: 'place', docKey: 'p_' + id }); if (create) btch.set(ctx.doc('placeFavoriteCounts/' + id), data); else btch.update(ctx.doc('placeFavoriteCounts/' + id), data); return btch.commit(); };
  const pfcDown = (ctx, uid, name, data) => { const id = pf(name); const btch = ctx.batch(); btch.delete(ctx.doc(`copies/${uid}__p_${id}`)); btch.update(ctx.doc('placeFavoriteCounts/' + id), data); return btch.commit(); };
  await ok('pfc read guest', () => guest.doc('placeFavoriteCounts/' + pf('p1')).get());
  await no('pfc create guest', () => guest.doc('placeFavoriteCounts/' + pf('p2')).set(pfc));
  await ok('pfc create user (with own record, one batch)', () => pfcUp(a, A, 'p2', pfc, true));
  await no('pfc create suspended', () => pfcUp(s, S, 'p3', pfc, true));
  await no('pfc create count:5', () => pfcUp(a, A, 'p4', { ...pfc, count: 5 }, true));
  await no('pfc create extra field', () => pfcUp(a, A, 'p5', { ...pfc, x: 1 }, true));
  await ok('pfc update +1 user (with own record, one batch)', () => pfcUp(a, A, 'p1', { count: 3 }));
  await no('pfc update +1 suspended (on a counter he has no record for)', () => pfcUp(s, S, 'p2', { count: 2 }));
  await ok('pfc update -1 suspended (may withdraw a save: deletes own record in the same batch)', () => pfcDown(s, S, 'p1', { count: 2 }));
  await no('pfc update +5', () => pfcUp(b, B, 'p1', { count: 7 }));
  await no('pfc delete user', () => a.doc('placeFavoriteCounts/' + pf('p1')).delete());
  await ok('pfc delete owner', () => owner.doc('placeFavoriteCounts/' + pf('p2')).delete());

  // ================= ٧) favorites — المجموعة مجتثة (نشرة التنظيف ٤ سبتمبر) =================
  // نشرة التنظيف ٤ سبتمبر: الكتلة اجتُثت — الرفض الافتراضي يحكم الجميع (حراسة الاجتثاث)
  await no('favorites create own — block removed, default deny', () => a.doc(`favorites/${A}`).set({ places: ['x'] }));
  await no('favorites read own — block removed, default deny', () => a.doc(`favorites/${A}`).get());

  // ================= ٨) userLists =================
  await no('userLists read guest (public)', () => guest.doc(`userLists/${B}`).get());
  await ok('userLists read own', () => a.doc(`userLists/${A}`).get());
  await no('v3.17 userLists flagged public: read by other deny (was allow — the private mirror doc)', () => a.doc(`userLists/${B}`).get());
  await no('userLists read private of other', () => b.doc(`userLists/${A}`).get());
  await ok('userLists write own', () => a.doc(`userLists/${A}`).set({ nickname: 'a2' }, { merge: true }));
  await no('userLists write suspended', () => s.doc(`userLists/${S}`).set({ nickname: 's2' }, { merge: true }));
  await ok('userLists write owner on other', () => owner.doc(`userLists/${A}`).set({ flag: 1 }, { merge: true }));
  await no('v3.8 FROZEN: userLists favoriteCount +1 on public by other (was allow)', () => a.doc(`userLists/${B}`).update({ favoriteCount: 4 }));
  await no('userLists favoriteCount +1 by suspended', () => s.doc(`userLists/${B}`).update({ favoriteCount: 5 }));
  await no('userLists favoriteCount +999', () => a.doc(`userLists/${B}`).update({ favoriteCount: 999 }));
  await no('userLists other field on public by other', () => a.doc(`userLists/${B}`).update({ nickname: 'hack' }));
  await ok('userLists delete own by suspended', () => s.doc(`userLists/${S}`).delete());
  await no('userLists delete other', () => b.doc(`userLists/${A}`).delete());
  await ok('userLists delete owner', () => owner.doc(`userLists/${A}`).delete());

  // ================= ٩) trips =================
  await no('trips read guest', () => guest.doc('trips/tBpub').get());
  await ok('trips read own', () => a.doc('trips/tA').get());
  await ok('trips read shared-with-me', () => a.doc('trips/tB').get());
  await ok('trips read public of other', () => a.doc('trips/tBpub').get());
  await no('trips read private of other', () => a.doc('trips/tBpriv').get());
  await ok('trips read owner (private of other)', () => owner.doc('trips/tBpriv').get());
  await ok('trips owner query by ownerId (suspend flow)', () => owner.collection('trips').where('ownerId', '==', S).get());
  await no('trips user query by ownerId of other', () => a.collection('trips').where('ownerId', '==', B).get());
  await ok('trips create own', () => a.doc('trips/tA2').set({ ownerId: A, public: false, sharedWith: [] }));
  await no('trips create with other ownerId', () => a.doc('trips/tX').set({ ownerId: B, public: false, sharedWith: [] }));
  await no('trips create suspended', () => s.doc('trips/tS2').set({ ownerId: S, public: false, sharedWith: [] }));
  await ok('trips update own', () => a.doc('trips/tA').update({ name: 'n' }));
  await no('trips update other', () => b.doc('trips/tA').update({ name: 'n' }));
  await no('trips update suspended own', () => s.doc('trips/tS').update({ name: 'n' }));
  await ok('trips update owner', () => owner.doc('trips/tA').update({ suspended: true }));
  await no('trips add self to sharedWith of other', () => b.doc('trips/tA').update({ sharedWith: [B] }));
  await ok('trips delete own by suspended', () => s.doc('trips/tS').delete());
  await no('trips delete other', () => b.doc('trips/tA').delete());
  await ok('trips delete owner', () => owner.doc('trips/tA2').delete());

  // ================= ١٠) userCityLists =================
  await no('ucl read guest', () => guest.doc('userCityLists/cBpub').get());
  await ok('ucl read own', () => a.doc('userCityLists/cA').get());
  await ok('ucl read public of other', () => a.doc('userCityLists/cBpub').get());
  await no('ucl read private of other', () => a.doc('userCityLists/cBpriv').get());
  await ok('ucl read owner', () => owner.doc('userCityLists/cBpriv').get());
  await ok('ucl owner query by ownerId (suspend flow)', () => owner.collection('userCityLists').where('ownerId', '==', S).get());
  await ok('ucl create own (v3.5: conforming id uid_cityId)', () => a.doc(`userCityLists/${A}_paris2`).set({ ownerId: A, public: false, sharedWith: [] }));
  await no('ucl create with other ownerId', () => a.doc('userCityLists/cX').set({ ownerId: B, public: false, sharedWith: [] }));
  await no('ucl create suspended', () => s.doc('userCityLists/cS2').set({ ownerId: S, public: false, sharedWith: [] }));
  await ok('ucl update own', () => a.doc('userCityLists/cA').update({ x: 1 }));
  await no('ucl update suspended own', () => s.doc('userCityLists/cS').update({ x: 1 }));
  await ok('ucl update owner', () => owner.doc('userCityLists/cA').update({ suspended: true }));
  await no('v3.8 FROZEN: ucl favoriteCount +1 on public by other (was allow)', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 3 }));
  await no('v3.8 FROZEN: ucl favoriteCount -1 on public by other (was allow)', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 1 }));
  await no('ucl favoriteCount +999', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 999 }));
  await no('ucl favoriteCount by suspended', () => s.doc('userCityLists/cBpub').update({ favoriteCount: 3 }));
  await ok('ucl delete own by suspended', () => s.doc('userCityLists/cS').delete());
  await no('ucl delete other', () => b.doc('userCityLists/cA').delete());
  await ok('ucl delete owner', () => owner.doc(`userCityLists/${A}_paris2`).delete());

  // ================= ١١) communityProfiles =================
  await no('cp read guest (M4.24.1 بند ١٤: الملفات للمسجلين — كان يُسمح)', () => guest.doc(`communityProfiles/${B}`).get());
  await ok('cp query hasAnyPublicContent user', () => a.collection('communityProfiles').where('hasAnyPublicContent', '==', true).get());
  await ok('cp create own (new user)', () => env.authenticatedContext('newC').firestore().doc('communityProfiles/newC').set({ hasAnyPublicContent: false }));
  await no('cp create for other uid', () => a.doc('communityProfiles/newD').set({ hasAnyPublicContent: false }));
  await ok('cp update own', () => a.doc(`communityProfiles/${A}`).update({ hasAnyPublicContent: true }));
  await no('cp update other (non-counter field)', () => a.doc(`communityProfiles/${B}`).update({ hasAnyPublicContent: false }));
  await ok('cp viewCount +1 on public other', () => a.doc(`communityProfiles/${B}`).update({ viewCount: 6 }));
  await no('cp viewCount +2', () => a.doc(`communityProfiles/${B}`).update({ viewCount: 8 }));
  await no('cp viewCount +1 by suspended', () => s.doc(`communityProfiles/${B}`).update({ viewCount: 7 }));
  await no('v3.17 cp totalFavoriteCount by other deny (field withdrawn from the visitors branch — was allow)', () => a.doc(`communityProfiles/${B}`).update({ totalFavoriteCount: 1 }));
  await no('cp counters on NON-public profile of other', () => b.doc(`communityProfiles/${N}`).update({ viewCount: 1 }));
  await ok('cp update owner', () => owner.doc(`communityProfiles/${B}`).update({ flag: 1 }));
  await no('cp delete other', () => b.doc(`communityProfiles/${A}`).delete());
  await ok('cp delete own', () => a.doc(`communityProfiles/${A}`).delete());
  await ok('cp delete owner', () => owner.doc(`communityProfiles/${B}`).delete());

  // ================= ١٢) nicknames =================
  await ok('nicknames read guest', () => guest.doc('nicknames/nick_a').get());
  await no('nicknames create guest', () => guest.doc('nicknames/nick_g').set({ uid: 'g', nickname: 'ggg' }));
  await ok('nicknames create own uid', () => a.doc('nicknames/nick_a2').set({ uid: A, nickname: 'a22' }));
  await no('nicknames create with OTHER uid (vuln 4)', () => a.doc('nicknames/nick_x').set({ uid: B, nickname: 'xxx' }));
  await no('nicknames create by suspended (v3.2)', () => s.doc('nicknames/nick_s2').set({ uid: S, nickname: 'ss2' }));
  await no('nicknames update move to other uid', () => a.doc('nicknames/nick_a').update({ uid: B }));
  await ok('nicknames update own', () => a.doc('nicknames/nick_a').update({ nickname: 'Abc' }));
  await no('nicknames update by suspended (v3.2)', () => s.doc('nicknames/nick_s').update({ nickname: 'Sss' }));
  await ok('nicknames delete own', () => a.doc('nicknames/nick_a2').delete());
  await ok('nicknames delete own by suspended', () => s.doc('nicknames/nick_s').delete());
  await no('nicknames delete other', () => b.doc('nicknames/nick_a').delete());
  await ok('nicknames delete owner', () => owner.doc('nicknames/nick_a').delete());

  // ================= ١٣) users =================
  await no('users read guest', () => guest.doc(`users/${A}`).get());
  await ok('users read own', () => a.doc(`users/${A}`).get());
  await no('users read other', () => b.doc(`users/${A}`).get());
  await ok('users read owner', () => owner.doc(`users/${A}`).get());
  await ok('users owner collection query (Manage Users)', () => owner.collection('users').get());
  await no('users create with other uid', () => a.doc(`users/${B}2`).set({ email: 'x' }));
  await ok('users create own', () => env.authenticatedContext('newU').firestore().doc('users/newU').set({ email: 'n@x' }));
  await ok('users update own', () => a.doc(`users/${A}`).set({ hasFavorited: true }, { merge: true }));
  await no('users update own by SUSPENDED (v3.2)', () => s.doc(`users/${S}`).set({ nickname: 'S' }, { merge: true }));
  await no('users update other', () => b.doc(`users/${A}`).set({ x: 1 }, { merge: true }));
  await ok('users update owner', () => owner.doc(`users/${S}`).set({ suspended: true }, { merge: true }));
  await ok('users delete own by suspended', () => s.doc(`users/${S}`).delete());
  await no('users delete other', () => b.doc(`users/${A}`).delete());
  await ok('users delete owner', () => owner.doc(`users/${A}`).delete());

  // ================= ١٤) dailyStats =================
  await no('dailyStats read user', () => a.doc(`dailyStats/${TODAY}`).get());
  await ok('dailyStats read owner', () => owner.doc(`dailyStats/${TODAY}`).get());
  await no('dailyStats create guest', () => guest.doc('dailyStats/2026-08-19').set({ newSignupsToday: 1, activeToday: 1 }));
  await ok('dailyStats create user', () => a.doc('dailyStats/2026-08-19').set({ newSignupsToday: 1, activeToday: 1 }));
  await no('dailyStats create extra field', () => a.doc('dailyStats/2026-08-20').set({ newSignupsToday: 1, activeToday: 1, x: 1 }));
  await ok('dailyStats update increase', () => a.doc(`dailyStats/${TODAY}`).update({ activeToday: 6 }));
  await no('dailyStats update decrease', () => a.doc(`dailyStats/${TODAY}`).update({ activeToday: 1 }));
  await no('dailyStats delete user', () => a.doc(`dailyStats/${TODAY}`).delete());
  await ok('dailyStats delete owner', () => owner.doc('dailyStats/2026-08-19').delete());

  // ================= ١٥) A3-L3-r1: أشكال كتابة وحدة mpTrack =================
  await ok('mp batch: events(multi-field)+hours+sessions in one commit', () => {
    const btch = guest.batch();
    btch.set(guest.doc('analytics/events_2026-08-19__2988507__mp15'), { place_open: 3, mylist_open: 1 }, { merge: true });
    btch.set(guest.doc('analytics/hours_2026-08-19__all'), { h09: 2 }, { merge: true });
    btch.set(guest.doc('analytics/sessions_2026-08-21__2988507'), { count: 1, seconds: 60, depth: 2 }, { merge: true });
    return btch.commit();
  });
  await no('mp batch: one bad field sinks the whole commit', () => {
    const btch = guest.batch();
    btch.set(guest.doc('analytics/events_2026-08-19__2988507__mp15b'), { place_open: 1 }, { merge: true });
    btch.set(guest.doc('analytics/hours_2026-08-21__all'), { hack: 1 }, { merge: true });
    return btch.commit();
  });
  await no('mp create: per-field delta 51 rejected', () => guest.doc('analytics/events_2026-08-19__2988507__mp15c').set({ place_open: 51 }, { merge: true }));
  await no('mp update: decrease rejected on mp doc', () => guest.doc('analytics/events_2026-08-19__2988507__mp15').update({ place_open: 2 }));


  // ================= ١٦) M3: إغلاق التغطية — الشبكة والحواف والأعلام التصميمية =================
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc(`userLists/${S}`).set({ public: false, nickname: 's', favoriteCount: 0 });
    await db.doc('trips/tS').set({ ownerId: S, public: false, sharedWith: [], name: 'S private' });
    await db.doc('userCityLists/cS').set({ ownerId: S, public: false, sharedWith: [], favoriteCount: 0 });
    await db.doc(`users/${S}`).set({ email: 's@x', nickname: 's' });
    await db.doc(`communityProfiles/${S}`).set({ hasAnyPublicContent: false, viewCount: 0, totalFavoriteCount: 0 });
    await db.doc(`communityProfiles/${B}`).set({ hasAnyPublicContent: true, viewCount: 5, totalFavoriteCount: 2 });
    await db.doc('analytics/visits').delete();
  });

  await no('suspensions write guest', () => guest.doc(`suspensions/${B}`).set({ at: 1 }));

  await no('visits create EMPTY object {} (hasOnly-empty edge)', () => guest.doc('analytics/visits').set({}));
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('analytics/visits').set({ count: 1 }));
  await no('visits update count as string', () => guest.doc('analytics/visits').update({ count: '2' }));
  await no('visits delete by user', () => a.doc('analytics/visits').delete());

  await no('errors create EMPTY object {} (size>=1 edge)', () => guest.doc('analytics/errors_2026-08-25').set({}));
  await no('errors update no-op same values (affectedKeys>=1 edge)', () => guest.doc(ED).set({ TypeError: 2 }, { merge: true }));
  await no('events create category over 40 chars', () => guest.doc('analytics/events_2026-08-19__2988507__' + 'x'.repeat(41)).set({ place_open: 1 }));
  await no('events create malformed id (missing category segment)', () => guest.doc('analytics/events_2026-08-19__2988507').set({ place_open: 1 }));
  await ok('[ACK P1] events update +1 by suspended (measurement anonymous by design — owner-approved)', () => s.doc(EV).update({ bookmark_add: 2 }));

  await ok('hours read owner', () => owner.doc('analytics/hours_2026-08-19__2988507').get());

  await no('stats update by guest', () => guest.doc('stats/users').update({ count: 6 }));
  await ok('[ACK P2] stats create by suspended (anonymous counters uniform policy — owner-approved)', () => s.doc('stats/new2').set({ count: 1 }));

  await no('pfc update by guest', () => guest.doc('placeFavoriteCounts/' + pf('p1')).update({ count: 3 }));
  await no('pfc P3 CLOSED: rename attempt (name+count) rejected — name/url frozen after create', () => pfcUp(b, B, 'p1', { name: 'Renamed', count: 3 }));
  await no('pfc P4 CLOSED: partial create (count only) rejected — all three fields required', () => pfcUp(a, A, 'p9', { count: 1 }, true));

  await no('favorites read by suspended — block removed, default deny (نشرة التنظيف)', () => s.doc(`favorites/${S}`).get());
  await no('favorites write guest', () => guest.doc('favorites/ghost').set({ places: [] }));

  await ok('userLists read own by suspended', () => s.doc(`userLists/${S}`).get());
  await no('v3.8 FROZEN: userLists favoriteCount -1 on public by other (was allow)', () => a.doc(`userLists/${B}`).update({ favoriteCount: 2 }));

  await ok('trips read own by suspended', () => s.doc('trips/tS').get());
  await no('[ACK P6] trips create by APP OWNER for other user (owner manages, never impersonates)', () => owner.doc('trips/tOwn').set({ ownerId: B, public: false, sharedWith: [] }));

  await ok('ucl read own by suspended', () => s.doc('userCityLists/cS').get());
  await no('[ACK P6] ucl create by APP OWNER for other user (owner manages, never impersonates)', () => owner.doc('userCityLists/cOwn').set({ ownerId: B, public: false, sharedWith: [] }));

  await no('cp viewCount +1 by guest', () => guest.doc(`communityProfiles/${B}`).update({ viewCount: 6 }));
  await no('cp viewCount decrease -1', () => a.doc(`communityProfiles/${B}`).update({ viewCount: 4 }));
  await no('cp P5 CLOSED: suspended cannot update own community profile', () => s.doc(`communityProfiles/${S}`).update({ hasAnyPublicContent: false }));

  await no('[ACK P6] nicknames update by APP OWNER on other (delete-only power — owner-approved)', () => owner.doc('nicknames/nick_b').update({ nickname: 'B2' }));

  await ok('users read own by suspended', () => s.doc(`users/${S}`).get());

  await no('dailyStats read guest', () => guest.doc(`dailyStats/${TODAY}`).get());
  await no('dailyStats P7 CLOSED: seeding large initial values rejected (create bounded 0..1)', () => a.doc('dailyStats/2026-08-25').set({ newSignupsToday: 999, activeToday: 999 }));

  await ok('stats_trips delete app owner', () => owner.doc('stats_trips/tA').delete());
  await no('stats_places delete by list owner', () => a.doc('stats_places/cA__0123456789abcdef').delete());
  await ok('stats_curators delete app owner', () => owner.doc('stats_curators/' + CUR).delete());
  await no('stats_cards delete by other user', () => a.doc('stats_cards/' + CUR + '__card_0001').delete());


  // ================= ١٧) v3.4: أشقاء قرارات الأعلام =================
  await no('pfc P3: url change rejected (link hijack closed)', () => pfcUp(b, B, 'p1', { url: 'https://evil.example', count: 3 }));
  await ok('cp read own by suspended (withdrawal rights intact)', () => s.doc(`communityProfiles/${S}`).get());
  await ok('cp delete own by suspended (withdrawal rights intact)', () => s.doc(`communityProfiles/${S}`).delete());
  await no('cp P5: suspended cannot CREATE own community profile', () => s.doc(`communityProfiles/${S}`).set({ hasAnyPublicContent: false }));
  await ok('dailyStats create with initial values 1 allowed', () => a.doc('dailyStats/2026-08-26').set({ newSignupsToday: 1, activeToday: 1 }));
  await no('dailyStats P7: negative initial value rejected', () => a.doc('dailyStats/2026-08-27').set({ activeToday: -5 }));

  // ================= ١٨) v3.5: تقييد معرّف userCityLists عند الإنشاء =================
  await ok('v3.5 ucl create conforming id uid_city', () => a.doc(`userCityLists/${A}_riyadh`).set({ ownerId: A, public: false, sharedWith: [] }));
  await no('v3.5 ucl create with OTHER user prefix', () => a.doc(`userCityLists/${B}_paris9`).set({ ownerId: A, public: false, sharedWith: [] }));
  await no('v3.5 ucl create with owner_ spoof prefix', () => a.doc('userCityLists/owner_rome9').set({ ownerId: A, public: false, sharedWith: [] }));
  await no('v3.5 ucl create with no-underscore id', () => a.doc('userCityLists/paris9').set({ ownerId: A, public: false, sharedWith: [] }));
  await ok('v3.5 REGRESSION: legacy bad-id doc still updatable by its owner', () => b.doc('userCityLists/cBpub').update({ note: 1 }));
  await no('v3.5 ucl create suspended with conforming id', () => s.doc(`userCityLists/${S}_paris9`).set({ ownerId: S, public: false, sharedWith: [] }));

  // ================= ١٩) v3.6: القرارات الثلاثة =================
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc('placeFavoriteCounts/' + pf('p0')).set({ name: 'Zero', url: 'https://maps.app.goo.gl/z', count: 0 });
    await db.doc(`copies/${A}__p_${pf('p0')}`).set({ uid: A, kind: 'place', docKey: 'p_' + pf('p0') }); /* v3.16: بسجل قائم — الرفض للأرضية لا لغياب السجل */
    await db.doc(`communityProfiles/${B}`).set({ hasAnyPublicContent: true, viewCount: 5, totalFavoriteCount: 0 });
    await db.doc('userCityLists/cBpub').set({ ownerId: B, public: true, sharedWith: [], favoriteCount: 0 });
    await db.doc(`userLists/${B}`).set({ public: true, nickname: 'b', favoriteCount: 0 });
    await db.doc(`userPrivatePlaces/${A}_paris`).set({ categories: { personal_home: { active: true, places: [] } } });
    await db.doc(`userPrivatePlaces/${S}_paris`).set({ categories: { others: { active: true, places: [] } } });
    await db.doc('userCityLists/cA').set({ ownerId: A, public: false, sharedWith: [], favoriteCount: 0, categories: { cafes: { active: true, places: [] } } });
    await db.doc('userCityLists/cLegacy').set({ ownerId: A, public: true, sharedWith: [], favoriteCount: 0, categories: { cafes: { places: [] }, personal_home: { places: ['old'] } } });
    await db.doc('trips/tHeld').set({ ownerId: S, public: false, sharedWith: [], sharedWithHeld: [A], name: 'held' });
    await db.doc('userCityLists/cHeld').set({ ownerId: S, public: false, sharedWith: [], sharedWithHeld: [A], favoriteCount: 0 });
  });

  await no('v3.6 (12) pfc count 0 -> -1 denied', () => pfcDown(a, A, 'p0', { count: -1 }));
  await no('v3.6 (12) cp totalFavoriteCount 0 -> -1 denied', () => a.doc(`communityProfiles/${B}`).update({ totalFavoriteCount: -1 }));
  await no('v3.6 (12) ucl favoriteCount 0 -> -1 denied', () => a.doc('userCityLists/cBpub').update({ favoriteCount: -1 }));
  await no('v3.6 (12) userLists favoriteCount 0 -> -1 denied', () => a.doc(`userLists/${B}`).update({ favoriteCount: -1 }));
  await no('v3.8 FROZEN: ucl favoriteCount 0 -> +1 denied (was v3.6 allow)', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 1 }));

  await ok('v3.6 (3b) upp read self allow', () => a.doc(`userPrivatePlaces/${A}_paris`).get());
  await no('v3.6 (3b) upp read other deny', () => b.doc(`userPrivatePlaces/${A}_paris`).get());
  await no('v3.6 (3b) upp read APP OWNER deny (policy promise)', () => owner.doc(`userPrivatePlaces/${A}_paris`).get());
  await no('v3.6 (3b) upp read guest deny', () => guest.doc(`userPrivatePlaces/${A}_paris`).get());
  await ok('v3.6 (3b) upp create self conforming id allow', () => a.doc(`userPrivatePlaces/${A}_rome`).set({ categories: {} }));
  await no('v3.6 (3b) upp create with OTHER prefix deny', () => a.doc(`userPrivatePlaces/${B}_rome`).set({ categories: {} }));
  await no('v3.6 (3b) upp create suspended deny', () => s.doc(`userPrivatePlaces/${S}_rome`).set({ categories: {} }));
  await ok('v3.6 (3b) upp update self allow', () => a.doc(`userPrivatePlaces/${A}_paris`).update({ x: 1 }));
  await no('v3.6 (3b) upp update suspended deny', () => s.doc(`userPrivatePlaces/${S}_paris`).update({ x: 1 }));
  await ok('v3.6 (3b) upp delete self by suspended allow (withdrawal)', () => s.doc(`userPrivatePlaces/${S}_paris`).delete());
  await ok('v3.6 (3b) upp delete app owner allow', () => owner.doc(`userPrivatePlaces/${A}_rome`).delete());
  await no('v3.6 (3b) ucl create with private category key deny', () => a.doc(`userCityLists/${A}_rome`).set({ ownerId: A, public: false, sharedWith: [], categories: { personal_home: { places: [] } } }));
  await no('v3.6 (3b) ucl update adding private category key deny', () => a.doc('userCityLists/cA').update({ categories: { cafes: { active: true, places: [] }, hospitals_clinics: { places: [] } } }));
  await no('[v3.13 parent categories now rejected] v3.6 (3b) ucl update public categories only allow', () => a.doc('userCityLists/cA').update({ categories: { cafes: { active: true, places: [] }, bakery: { places: [] } } }));
  await no('[v3.13 parent categories now rejected] v3.6 (3b) LEGACY doc with inherited private key: changing it still allowed (safe before code batch)', () => a.doc('userCityLists/cLegacy').update({ categories: { cafes: { places: [] }, personal_home: { places: ['old', 'new'] } } }));
  await no('[v3.13 parent categories now rejected] v3.6 (3b) LEGACY doc: removing the private key (migration write) allowed', () => a.doc('userCityLists/cLegacy').update({ categories: { cafes: { places: [] } } }));

  await no('v3.6 (1) trip held-share: recipient denied while owner suspended', () => a.doc('trips/tHeld').get());
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('trips/tHeld').update({ sharedWith: [A], sharedWithHeld: [] }));
  await ok('v3.6 (1) trip held-share: recipient allowed after restore', () => a.doc('trips/tHeld').get());
  await no('v3.6 (1) ucl held-share: recipient denied while owner suspended', () => a.doc('userCityLists/cHeld').get());

  // ================= ٢٠) v3.7: المتابعة · حقول الملف والفجوات ١٥–١٨ · تفضيل الرحلات (مجمَّد بـ٣٫٨) =================
  const C = 'curatorC';
  const c = env.authenticatedContext(C).firestore();
  await env.withSecurityRulesDisabled(async (x) => {
    const db = x.firestore();
    await db.doc(`communityProfiles/${C}`).set({ hasAnyPublicContent: true, viewCount: 3, totalFavoriteCount: 1, followerCount: 0 });
    await db.doc(`communityProfiles/${A}`).set({ hasAnyPublicContent: true, viewCount: 2, totalFavoriteCount: 0, followerCount: 0 });
    await db.doc(`follows/${B}_${C}`).set({ followerUid: B, curatorUid: C, at: 1 });
    await db.doc(`follows/${S}_${C}`).set({ followerUid: S, curatorUid: C, at: 1 });
    await db.doc('trips/tCpub').set({ ownerId: C, public: true, sharedWith: [], name: 'C public', favoriteCount: 0 });
    await db.doc('trips/tCpriv').set({ ownerId: C, public: false, sharedWith: [], name: 'C private', favoriteCount: 0 });
  });

  await no('v3.17 follow record created ALONE deny (two-way binding — was allow)', () => a.doc(`follows/${A}_${C}`).set({ followerUid: A, curatorUid: C, at: 1 }));
  await seedDoc(`follows/${A}_${C}`, { followerUid: A, curatorUid: C, at: 1 }); /* ما بعدها يقرأ هذا السجل */
  await no('v3.7 follow create with OTHER prefix deny', () => a.doc(`follows/${B}_${A}`).set({ followerUid: A, curatorUid: A, at: 1 }));
  await no('v3.7 follow create self-follow deny', () => a.doc(`follows/${A}_${A}`).set({ followerUid: A, curatorUid: A, at: 1 }));
  await no('v3.7 follow create suspended deny', () => s.doc(`follows/${S}_${A}`).set({ followerUid: S, curatorUid: A, at: 1 }));
  await no('v3.7 follow create curatorUid mismatch deny', () => a.doc(`follows/${A}_${B}`).set({ followerUid: A, curatorUid: C, at: 1 }));
  await no('v3.7 follow create followerUid mismatch deny', () => a.doc(`follows/${A}_${B}`).set({ followerUid: B, curatorUid: B, at: 1 }));
  await no('v3.7 follow create extra field deny', () => a.doc(`follows/${A}_${B}`).set({ followerUid: A, curatorUid: B, email: 'x' }));
  await ok('v3.7 follow read own (follower) allow', () => a.doc(`follows/${A}_${C}`).get());
  await ok('v3.7 follow read by CURATOR allow (invariant 10: relation visible to both sides)', () => c.doc(`follows/${A}_${C}`).get());
  await no('v3.7 follow read by other user deny', () => b.doc(`follows/${A}_${C}`).get());
  await no('v3.7 follow read guest deny', () => guest.doc(`follows/${A}_${C}`).get());
  await ok('v3.7 follow read app owner allow', () => owner.doc(`follows/${A}_${C}`).get());
  await ok('v3.7 follow query my followers (curator) allow', () => c.collection('follows').where('curatorUid', '==', C).get());
  await ok('v3.7 follow query who I follow (follower) allow', () => a.collection('follows').where('followerUid', '==', A).get());
  await no('v3.7 follow query followers of OTHER curator deny', () => a.collection('follows').where('curatorUid', '==', C).get());
  await no('v3.7 follow update deny (even by follower)', () => a.doc(`follows/${A}_${C}`).update({ at: 2 }));
  await no('v3.7 follow delete by curator deny', () => c.doc(`follows/${A}_${C}`).delete());
  await ok('v3.7 follow delete own by suspended allow (withdrawal)', () => s.doc(`follows/${S}_${C}`).delete());
  await ok('v3.7 follow delete app owner allow', () => owner.doc(`follows/${B}_${C}`).delete());

  await no('v3.7→v3.10 cp followerCount +1 by other with a PRE-EXISTING record deny (no inflation)', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 1 })); // v3.10: السجل يُنشأ بالطلب نفسه
  await ok('v3.10 cp followerCount +1 BATCH (new record + counter) by another user allow', () => { const btch = b.batch(); btch.set(b.doc(`follows/${B}_${C}`), { followerUid: B, curatorUid: C, at: 1 }); btch.set(b.doc(`communityProfiles/${C}`), { followerCount: 1 }, { merge: true }); return btch.commit(); });
  await no('v3.7 cp followerCount +2 deny', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 3 }));
  await no('v3.7 cp followerCount 1 -> -1 deny (floor)', () => a.doc(`communityProfiles/${C}`).update({ followerCount: -1 }));
  await no('v3.7 cp SELF bump viewCount deny (gap 15 closed)', () => c.doc(`communityProfiles/${C}`).update({ viewCount: 999 }));
  await no('v3.7 cp SELF bump followerCount deny (gap 15)', () => c.doc(`communityProfiles/${C}`).update({ followerCount: 999 }));
  await no('v3.7 cp SELF set verified deny', () => c.doc(`communityProfiles/${C}`).update({ verified: true }));
  await no('v3.7 cp SELF create with verified deny', () => env.authenticatedContext('newV').firestore().doc('communityProfiles/newV').set({ hasAnyPublicContent: false, verified: true }));
  await ok('v3.7 cp OWNER set verified allow', () => owner.doc(`communityProfiles/${C}`).update({ verified: true }));
  await ok('v3.7→M4.26 cp self set bio/contactUrl/showFollowerCount allow (displayName withdrawn)', () => c.doc(`communityProfiles/${C}`).update({ bio: 'Food and coffee in Riyadh', contactUrl: 'https://instagram.com/khalid', showFollowerCount: true }));
  await no('v3.7 cp self bio over 200 chars deny', () => c.doc(`communityProfiles/${C}`).update({ bio: 'x'.repeat(201) }));
  await no('v3.7 cp self contactUrl not https deny', () => c.doc(`communityProfiles/${C}`).update({ contactUrl: 'http://evil.example' }));
  await ok('v3.7 cp self totalFavoriteCount recompute still allowed (documented exception — syncCommunityProfile)', () => c.doc(`communityProfiles/${C}`).update({ totalFavoriteCount: 4 }));

  await no('v3.8 FROZEN: trip favoriteCount +1 on public by other (was v3.7 allow)', () => a.doc('trips/tCpub').update({ favoriteCount: 1 }));
  await no('v3.7 trip favoriteCount +1 on PRIVATE trip deny', () => a.doc('trips/tCpriv').update({ favoriteCount: 1 }));
  await no('v3.7 trip favoriteCount +2 deny', () => a.doc('trips/tCpub').update({ favoriteCount: 3 }));
  await no('v3.7 trip favoriteCount 1 -> -1 deny (floor)', () => a.doc('trips/tCpub').update({ favoriteCount: -1 }));
  await no('v3.7 trip favoriteCount by suspended deny', () => s.doc('trips/tCpub').update({ favoriteCount: 2 }));

  await no('v3.7 gap16 ucl OWNER bumps own favoriteCount deny', () => b.doc('userCityLists/cBpub').update({ favoriteCount: 99 }));
  await ok('v3.7 gap16 ucl owner save with UNCHANGED favoriteCount allow (merge same value)', () => b.doc('userCityLists/cBpub').set({ favoriteCount: 0, note: 2 }, { merge: true }));
  await no('v3.7 gap16 ucl create with favoriteCount 5 deny', () => a.doc(`userCityLists/${A}_milan`).set({ ownerId: A, public: false, sharedWith: [], favoriteCount: 5 }));
  await ok('v3.7 gap16 ucl create with favoriteCount 0 allow', () => a.doc(`userCityLists/${A}_milan`).set({ ownerId: A, public: false, sharedWith: [], favoriteCount: 0 }));
  await no('v3.7 gap16 trip OWNER bumps own favoriteCount deny', () => c.doc('trips/tCpub').update({ favoriteCount: 50 }));
  await no('v3.7 gap16 trip create with favoriteCount 5 deny', () => a.doc('trips/tA5').set({ ownerId: A, public: true, sharedWith: [], favoriteCount: 5 }));
  await no('v3.7 gap16 userLists SELF sets favoriteCount deny', () => b.doc(`userLists/${B}`).update({ favoriteCount: 77 }));

  await no('v3.7 gap17 followerCount +1 by user WITHOUT follow doc deny', () => b.doc(`communityProfiles/${C}`).update({ followerCount: 2 }));
  await no('v3.7 gap17 followerCount -1 by follower WHILE follow doc exists deny', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 0 }));
  await env.withSecurityRulesDisabled(async (x) => x.firestore().doc(`follows/${A}_${C}`).delete());
  await no('v3.7→v3.10 followerCount -1 with record ABSENT deny (no zeroing)', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 0 }));
  await ok('v3.10 followerCount -1 BATCH (delete record + counter) allow', () => { const btch = b.batch(); btch.delete(b.doc(`follows/${B}_${C}`)); btch.set(b.doc(`communityProfiles/${C}`), { followerCount: 0 }, { merge: true }); return btch.commit(); });

  await no('v3.7 gap18 follow create to uid without communityProfile deny', () => a.doc(`follows/${A}_nobody123`).set({ followerUid: A, curatorUid: 'nobody123', at: 1 }));

  // ================= ٢١) v3.8: نشرة القرار المؤسِّس ٠٩ — المفكرة والحفظ والتجميد والغائب والمشاهدات =================
  await env.withSecurityRulesDisabled(async (x) => {
    const db = x.firestore();
    // قائمتان عامتان (الثانية بعدّاد إعجاب موروث لاختبار التجميد الصافي) وقائمة خاصة قائمة (cA)
    await db.doc('userCityLists/cBpub2').set({ ownerId: B, public: true, sharedWith: [], favoriteCount: 2 });
    // رحلة خاصة إضافية لصاحب آخر
    await db.doc('trips/tPriv38').set({ ownerId: B, public: false, sharedWith: [], name: 'B private 38' });
  });

  // --- (السطر ٢) سجل مفكرة القوائم: listBookmarks/{uid}__{listId} ---
  await no('v3.17 lb record created ALONE deny (two-way binding — was allow)', () => a.doc(`listBookmarks/${A}__cBpub`).set({ at: 1 }));
  await seedDoc(`listBookmarks/${A}__cBpub`, { at: 1 }); /* ما بعدها يقرأ هذا السجل */
  await no('v3.8 lb create with OTHER prefix deny', () => a.doc(`listBookmarks/${B}__cBpub`).set({ at: 1 }));
  await no('v3.8 lb create suspended deny', () => s.doc(`listBookmarks/${S}__cBpub`).set({ at: 1 }));
  await no('v3.8 lb create on PRIVATE list deny', () => b.doc(`listBookmarks/${B}__cA`).set({ at: 1 }));
  await no('v3.8 lb create on MISSING list deny', () => a.doc(`listBookmarks/${A}__nolist9`).set({ at: 1 }));
  await no('v3.8 lb create extra field deny', () => a.doc(`listBookmarks/${A}__cBpub2`).set({ at: 1, note: 'x' }));
  await no('v3.8 lb create guest deny', () => guest.doc(`listBookmarks/g__cBpub`).set({ at: 1 }));
  await no('v3.8 lb update deny (no update ever)', () => a.doc(`listBookmarks/${A}__cBpub`).update({ at: 2 }));
  await ok('v3.8 lb read own allow', () => a.doc(`listBookmarks/${A}__cBpub`).get());
  await no('v3.8 lb read by LIST OWNER deny (invariant 12: kum not man)', () => b.doc(`listBookmarks/${A}__cBpub`).get());
  await no('v3.8 lb read other user deny', () => s.doc(`listBookmarks/${A}__cBpub`).get());
  await no('v3.8 lb read guest deny', () => guest.doc(`listBookmarks/${A}__cBpub`).get());
  await ok('v3.8 lb read app owner allow', () => owner.doc(`listBookmarks/${A}__cBpub`).get());

  // --- (السطر ٣) عدّاد مفكرة القائمة المربوط بالسجل ---
  await no('v3.8 bookmarkCount +1 WITHOUT bookmark record deny (gap17 pattern)', () => b.doc('userCityLists/cBpub2').update({ bookmarkCount: 1 }));
  await no('v3.8→v3.10 bookmarkCount +1 with a PRE-EXISTING record deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 1 }));
  await ok('v3.10 bookmarkCount +1 BATCH (new record + counter) by another user allow', () => { const btch = c.batch(); btch.set(c.doc(`listBookmarks/${C}__cBpub`), { at: 1 }); btch.set(c.doc('userCityLists/cBpub'), { bookmarkCount: 1 }, { merge: true }); return btch.commit(); });
  await no('v3.8 bookmarkCount +2 deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 3 }));
  await no('v3.8 bookmarkCount SELF bump by list owner deny (gap16 pattern)', () => b.doc('userCityLists/cBpub').update({ bookmarkCount: 2 }));
  await no('v3.8 bookmarkCount by suspended deny', () => s.doc('userCityLists/cBpub').update({ bookmarkCount: 2 }));
  await no('v3.8 bookmarkCount by guest deny', () => guest.doc('userCityLists/cBpub').update({ bookmarkCount: 2 }));
  await no('v3.8 bookmarkCount on PRIVATE list deny', () => b.doc('userCityLists/cA').update({ bookmarkCount: 1 }));
  await no('v3.8 bookmarkCount -1 WHILE record exists deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 0 }));
  await no('v3.8 bookmarkCount floor 0 -> -1 deny', () => a.doc('userCityLists/cBpub2').update({ bookmarkCount: -1 }));

  // --- (السطر المعلَّق ق٠١-١٩) عدّاد مشاهدات القائمة العام ---
  await ok('v3.8 ucl viewCount +1 (bookmarkCount untouched) allow', () => a.doc('userCityLists/cBpub').update({ viewCount: 1 }));
  await ok('v3.8 ucl viewCount +1 alone by other allow', () => a.doc('userCityLists/cBpub').update({ viewCount: 2 }));
  await no('v3.8 ucl viewCount +2 deny', () => a.doc('userCityLists/cBpub').update({ viewCount: 4 }));
  await no('v3.8 ucl viewCount decrease deny', () => a.doc('userCityLists/cBpub').update({ viewCount: 1 }));
  await no('v3.8 ucl viewCount SELF by list owner deny (gap15 pattern)', () => b.doc('userCityLists/cBpub').update({ viewCount: 3 }));
  await no('v3.8 ucl viewCount guest deny', () => guest.doc('userCityLists/cBpub').update({ viewCount: 3 }));
  await no('v3.8 ucl viewCount on PRIVATE list deny', () => b.doc('userCityLists/cA').update({ viewCount: 1 }));

  // --- فكّ التمييز: الحذف ثم النقص بغياب السجل ---
  await no('v3.8 lb delete by LIST OWNER deny', () => b.doc(`listBookmarks/${A}__cBpub`).delete());
  await no('v3.17 lb record deleted ALONE while counted deny (bookmarkCount 1, public — was allow)', () => a.doc(`listBookmarks/${A}__cBpub`).delete());
  await dropDoc(`listBookmarks/${A}__cBpub`); /* ما بعدها يفترض غياب السجل */
  await no('v3.8→v3.10 bookmarkCount -1 with record ABSENT deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 0 }));
  await ok('v3.10 bookmarkCount -1 BATCH (delete record + counter) allow', () => { const btch = c.batch(); btch.delete(c.doc(`listBookmarks/${C}__cBpub`)); btch.set(c.doc('userCityLists/cBpub'), { bookmarkCount: 0 }, { merge: true }); return btch.commit(); });
  await no('v3.8 bookmarkCount +1 after unbookmark (record absent) deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 1 }));

  // --- (السطران ٣ و١٩ — نمط ١٦ عند الإنشاء) ---
  await no('v3.8 ucl create with bookmarkCount 5 deny', () => a.doc(`userCityLists/${A}_lyon`).set({ ownerId: A, public: false, sharedWith: [], bookmarkCount: 5 }));
  await no('v3.8 ucl create with viewCount 7 deny', () => a.doc(`userCityLists/${A}_lyon`).set({ ownerId: A, public: false, sharedWith: [], viewCount: 7 }));
  await ok('v3.8 ucl create with counters absent allow', () => a.doc(`userCityLists/${A}_lyon`).set({ ownerId: A, public: false, sharedWith: [] }));

  // --- (السطر ٥) التجميد الصافي بلا أرضية (قيمة موروثة ٢) ---
  await no('v3.8 FROZEN: ucl favoriteCount 2 -> 1 by other deny (pure freeze, no floor involved)', () => a.doc('userCityLists/cBpub2').update({ favoriteCount: 1 }));
  await no('v3.8 FROZEN: ucl favoriteCount 2 -> 3 by other deny', () => a.doc('userCityLists/cBpub2').update({ favoriteCount: 3 }));

  // --- (السطر المعلَّق ق٠١-٠٧) قراءة المستند الغائب لصاحب البادئة ---
  await ok('v3.8 absent-doc read with OWN prefix allow (returns not-found)', () => a.doc(`userCityLists/${A}_ghost`).get());
  await no('v3.8 absent-doc read with OTHER prefix deny', () => a.doc(`userCityLists/${B}_ghost`).get());
  await no('v3.8 absent-doc read guest deny', () => guest.doc(`userCityLists/${A}_ghost`).get());
  await ok('v3.8 upp absent-doc read own prefix allow (id-based rule — unchanged)', () => a.doc(`userPrivatePlaces/${A}_ghost`).get());

  // --- (السطر ٤) سجل حفظ الرحلات وعدّاده ---
  await no('v3.17 ts record created ALONE deny (two-way binding — was allow)', () => a.doc(`tripSaves/${A}__tBpub`).set({ at: 1 }));
  await seedDoc(`tripSaves/${A}__tBpub`, { at: 1 });
  await no('v3.8 ts create with OTHER prefix deny', () => a.doc(`tripSaves/${B}__tBpub`).set({ at: 1 }));
  await no('v3.8 ts create on PRIVATE trip deny', () => a.doc(`tripSaves/${A}__tPriv38`).set({ at: 1 }));
  await no('v3.8 ts create on MISSING trip deny', () => a.doc(`tripSaves/${A}__noTrip9`).set({ at: 1 }));
  await no('v3.8 ts create suspended deny', () => s.doc(`tripSaves/${S}__tBpub`).set({ at: 1 }));
  await no('v3.8 ts create extra field deny', () => a.doc(`tripSaves/${A}__tCpub`).set({ at: 1, note: 'x' }));
  await no('v3.8 ts update deny', () => a.doc(`tripSaves/${A}__tBpub`).update({ at: 2 }));
  await ok('v3.8 ts read own allow', () => a.doc(`tripSaves/${A}__tBpub`).get());
  await no('v3.8 ts read by TRIP OWNER deny (invariant 12)', () => b.doc(`tripSaves/${A}__tBpub`).get());
  await no('v3.8 ts read guest deny', () => guest.doc(`tripSaves/${A}__tBpub`).get());
  await ok('v3.8 ts read app owner allow', () => owner.doc(`tripSaves/${A}__tBpub`).get());
  await no('v3.8→v3.10 saveCount +1 with a PRE-EXISTING record deny', () => a.doc('trips/tBpub').update({ saveCount: 1 }));
  await ok('v3.10 saveCount +1 BATCH by another user allow', () => { const btch = c.batch(); btch.set(c.doc(`tripSaves/${C}__tBpub`), { at: 1 }); btch.set(c.doc('trips/tBpub'), { saveCount: 1 }, { merge: true }); return btch.commit(); });
  await no('v3.8 saveCount +1 WITHOUT record deny (curatorC has none)', () => c.doc('trips/tBpub').update({ saveCount: 2 }));
  await no('v3.8 saveCount +2 deny', () => a.doc('trips/tBpub').update({ saveCount: 3 }));
  await no('v3.8 saveCount SELF by trip owner deny (gap16 pattern)', () => b.doc('trips/tBpub').update({ saveCount: 2 }));
  await no('v3.8 saveCount by suspended deny', () => s.doc('trips/tBpub').update({ saveCount: 2 }));
  await no('v3.8 saveCount -1 WHILE record exists deny', () => a.doc('trips/tBpub').update({ saveCount: 0 }));
  await no('v3.17 ts record deleted ALONE while counted deny (saveCount 1, public — was allow)', () => a.doc(`tripSaves/${A}__tBpub`).delete());
  await dropDoc(`tripSaves/${A}__tBpub`);
  await no('v3.8→v3.10 saveCount -1 with record ABSENT deny', () => a.doc('trips/tBpub').update({ saveCount: 0 }));
  await ok('v3.10 saveCount -1 BATCH (delete record + counter) allow', () => { const btch = c.batch(); btch.delete(c.doc(`tripSaves/${C}__tBpub`)); btch.set(c.doc('trips/tBpub'), { saveCount: 0 }, { merge: true }); return btch.commit(); });
  await no('v3.8 trips create with saveCount 5 deny', () => a.doc('trips/t38a').set({ ownerId: A, public: false, sharedWith: [], saveCount: 5 }));
  await ok('v3.8 trips create with saveCount 0 allow', () => a.doc('trips/t38b').set({ ownerId: A, public: false, sharedWith: [], saveCount: 0 }));
  await no('v3.8 trip owner self-update touching saveCount deny', () => b.doc('trips/tBpub').update({ name: 'x', saveCount: 1 }));


  // ================= M4.24.1 (٨ سبتمبر ٢٠٢٦) — النشرة المصغّرة: الدفعة الذرّية كما يكتبها العميل · بند ١٨ · قراءة الملفات والأسماء للمسجلين =================
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('userCityLists/cBpub2').set({ ownerId: B, public: true, sharedWith: [], bookmarkCount: 0, viewCount: 0, categories: {} });
    await db.doc('userCityLists/cBshared').set({ ownerId: B, public: false, sharedWith: [A], bookmarkCount: 0, viewCount: 0, categories: {} });
    await db.doc('userCityLists/cBpriv2').set({ ownerId: B, public: false, sharedWith: [], bookmarkCount: 0, viewCount: 0, categories: {} });
    await db.doc('trips/tBpub2').set({ ownerId: B, public: true, sharedWith: [], saveCount: 0, name: 'B public 2' });
    await db.doc('communityProfiles/pB').set({ nickname: 'b', uid: B });
    await db.doc('nicknames/nickb').set({ uid: B });
  });
  const bmBatch = (who, uid, listId, on, count) => () => { const btch = who.batch();
    if (on) btch.set(who.doc(`listBookmarks/${uid}__${listId}`), { at: 1 }); else btch.delete(who.doc(`listBookmarks/${uid}__${listId}`));
    btch.set(who.doc(`userCityLists/${listId}`), { bookmarkCount: count }, { merge: true });
    btch.set(who.doc(`userLists/${uid}`), { listBookmarkIds: { [listId]: on ? true : false } }, { merge: true });
    return btch.commit(); };
  await ok('M4.24.1 lb BATCH (record+counter+mirror) on public list allow — existsAfter', bmBatch(a, A, 'cBpub2', true, 1));
  await ok('M4.24.1 lb BATCH unsave on public list allow', bmBatch(a, A, 'cBpub2', false, 0));
  await ok('M4.24.1 lb BATCH on PRIVATE list SHARED with me allow (بند ١٨)', bmBatch(a, A, 'cBshared', true, 1));
  await no('M4.24.1 lb BATCH on PRIVATE list NOT shared deny', bmBatch(a, A, 'cBpriv2', true, 1));
  await no('M4.24.1 lb BATCH by suspended deny', bmBatch(s, S, 'cBpub2', true, 1));
  const tsBatch = (who, uid, tripId, on, count) => () => { const btch = who.batch();
    if (on) btch.set(who.doc(`tripSaves/${uid}__${tripId}`), { at: 1 }); else btch.delete(who.doc(`tripSaves/${uid}__${tripId}`));
    btch.set(who.doc(`trips/${tripId}`), { saveCount: count }, { merge: true });
    btch.set(who.doc(`userLists/${uid}`), { tripSaveIds: { [tripId]: on ? true : false } }, { merge: true });
    return btch.commit(); };
  await ok('M4.24.1 ts BATCH on public trip allow — existsAfter', tsBatch(a, A, 'tBpub2', true, 1));
  await ok('M4.24.1 ts BATCH unsave on public trip allow', tsBatch(a, A, 'tBpub2', false, 0));
  await ok('M4.24.1 ts BATCH on PRIVATE trip SHARED with me allow (بند ١٨)', tsBatch(a, A, 'tB', true, 1));
  await no('M4.24.1 ts BATCH on PRIVATE trip NOT shared deny', tsBatch(a, A, 'tBpriv', true, 1));
  await no('M4.24.1 communityProfiles read GUEST deny (بند ١٤)', () => guest.doc('communityProfiles/pB').get());
  await ok('M4.24.1 communityProfiles read signed-in allow', () => a.doc('communityProfiles/pB').get());
  await ok('M4.24.1 nicknames read GUEST allow (availability check before auth — login-by-name is server-side later)', () => guest.doc('nicknames/nickb').get());
  await ok('M4.24.1 nicknames read signed-in allow (share by name)', () => a.doc('nicknames/nickb').get());

  // ================= ٢٢) M4.25 — النشرة الجامعة (١٧ سبتمبر ٢٠٢٦) =================
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('communityProfiles/userV').set({ nickname: 'v', verified: true, hasAnyPublicContent: false, followerCount: 0, viewCount: 0 }); // موثَّق بلا محتوى عام
    await db.doc('communityProfiles/pB').set({ nickname: 'b', uid: B, verified: true, hasAnyPublicContent: true, followerCount: 0, viewCount: 0 }, { merge: true });
    await db.doc(`communityProfiles/${B}`).set({ verified: true }, { merge: true }); // isVerifiedUser(B) يقرأ ملف B بمعرّفه
    await db.doc('userCityLists/cBpub3').set({ ownerId: B, public: true, sharedWith: [], bookmarkCount: 0, viewCount: 0, copyCount: 0, categories: {} });
    await db.doc('userCityLists/cApub').set({ ownerId: A, public: true, sharedWith: [], categories: {} });
    await db.doc('trips/tBpub3').set({ ownerId: B, public: true, sharedWith: [], saveCount: 0, copyCount: 0, name: 'B public 3' });
    await db.doc('trips/tBpriv3').set({ ownerId: B, public: false, sharedWith: [], saveCount: 0, copyCount: 0, name: 'B private 3' });
    await db.doc('curatorRequests/userB').set({ uid: B, text: 'x', at: 1, status: 'pending' });
  });
  const v = env.authenticatedContext('userV').firestore();
  // (١) hasTop: موثَّق + عامة ✓ · موثَّق + خاصة ✗ · غير موثَّق ✗ · بلا الحقل ✓ · المالك ✓ · تحديث ذاتي
  await ok('[v3.13 split shape] M4.25 hasTop create by VERIFIED owner on PUBLIC list allow', () => b.doc('userCityLists/userB_top1').set({ ownerId: B, public: true, sharedWith: [], hasTop: true}));
  await no('M4.25 hasTop create by VERIFIED owner on PRIVATE list deny', () => b.doc('userCityLists/userB_top2').set({ ownerId: B, public: false, sharedWith: [], hasTop: true, categories: {} }));
  await no('M4.25 hasTop create by NON-verified owner deny', () => a.doc('userCityLists/userA_top1').set({ ownerId: A, public: true, sharedWith: [], hasTop: true, categories: {} }));
  await ok('[v3.13 split shape] M4.25 hasTop:false create by non-verified allow', () => a.doc('userCityLists/userA_top2').set({ ownerId: A, public: true, sharedWith: [], hasTop: false}));
  await ok('[v3.13 split shape] M4.25 no hasTop field create allow (old shape)', () => a.doc('userCityLists/userA_top3').set({ ownerId: A, public: true, sharedWith: []}));
  await no('M4.25 hasTop update by non-verified owner deny', () => a.doc('userCityLists/cApub').set({ hasTop: true }, { merge: true }));
  // (٢) الجغرافيا
  await ok('[v3.13 split shape] M4.25 geoSources allowed set create allow', () => a.doc('userCityLists/userA_geo1').set({ ownerId: A, public: false, sharedWith: [], geoSources: ['user_pin', 'fsq']}));
  await no('M4.25 geoSources with google deny', () => a.doc('userCityLists/userA_geo2').set({ ownerId: A, public: false, sharedWith: [], geoSources: ['google'], categories: {} }));
  await no('M4.25 googleLat key on list deny', () => a.doc('userCityLists/userA_geo3').set({ ownerId: A, public: false, sharedWith: [], googleLat: 48.8, categories: {} }));
  await ok('M4.25 trip legSources allowed create allow', () => a.doc('trips/tA_leg1').set({ ownerId: A, public: false, sharedWith: [], legSources: ['estimate', 'osrm'], plan: {}, dayRoutes: [] }));
  await no('M4.25 trip legSources google deny', () => a.doc('trips/tA_leg2').set({ ownerId: A, public: false, sharedWith: [], legSources: ['google'] }));
  // (٣) القاموس
  await ok('[v3.13 split shape] M4.25 catsV 3 allow', () => a.doc('userCityLists/userA_cv1').set({ ownerId: A, public: false, sharedWith: [], catsV: 3}));
  await no('M4.25 catsV 2 deny', () => a.doc('userCityLists/userA_cv2').set({ ownerId: A, public: false, sharedWith: [], catsV: 2, categories: {} }));
  await ok('[v3.13 split shape] M4.25 flagsUsed fine_dining allow', () => a.doc('userCityLists/userA_fl1').set({ ownerId: A, public: false, sharedWith: [], flagsUsed: ['fine_dining']}));
  await no('M4.25 flagsUsed unknown flag deny', () => a.doc('userCityLists/userA_fl2').set({ ownerId: A, public: false, sharedWith: [], flagsUsed: ['michelin'], categories: {} }));
  await ok('M4.25 trip plan/dayRoutes by owner update allow', () => a.doc('trips/tA').set({ plan: { coffee: [] }, dayRoutes: [{ day: 1, variant: 'shortest', stops: [], legs: [] }] }, { merge: true }));
  await no('M4.25 trip owner touching copyCount deny', () => a.doc('trips/tA').set({ copyCount: 3 }, { merge: true }));
  // (٤) copies + copyCount
  const cpBatch = (who, uid, kind, key, coll, count) => () => { const btch = who.batch();
    btch.set(who.doc(`copies/${uid}__${key}`), { uid: uid, kind: kind, docKey: key, at: 1 });
    btch.set(who.doc(`${coll}/${key}`), { copyCount: count }, { merge: true });
    return btch.commit(); };
  await no('v3.17 copies trip record created ALONE deny (two-way binding — was allow)', () => a.doc('copies/userA__tBpub3').set({ uid: A, kind: 'trip', docKey: 'tBpub3', at: 1 }));
  await seedDoc('copies/userA__tBpub3', { uid: A, kind: 'trip', docKey: 'tBpub3', at: 1 });
  await no('M4.25 copies record create for other uid deny', () => a.doc('copies/userB__tBpub3').set({ uid: B, kind: 'trip', docKey: 'tBpub3', at: 1 }));
  await no('M4.25 copies record bad kind deny', () => a.doc('copies/userA__cBpub3').set({ uid: A, kind: 'card', docKey: 'cBpub3', at: 1 }));
  await no('M4.25 copies record docKey mismatch deny', () => a.doc('copies/userA__cBpub3').set({ uid: A, kind: 'list', docKey: 'other', at: 1 }));
  await no('M4.25 copies record update deny', () => a.doc('copies/userA__tBpub3').set({ at: 2 }, { merge: true }));
  await no('v3.17 copies trip record for a MISSING trip deny (was allow)', () => a.doc('copies/userA__scratch22').set({ uid: A, kind: 'trip', docKey: 'scratch22', at: 1 }));
  await ok('M4.25 copies read by self allow', () => a.doc('copies/userA__tBpub3').get());
  await no('M4.25 copies read by other deny', () => b.doc('copies/userA__tBpub3').get());
  await no('M4.25→v3.10 copyCount +1 with a PRE-EXISTING record deny', () => a.doc('trips/tBpub3').set({ copyCount: 1 }, { merge: true }));
  await ok('v3.10 copyCount +1 BATCH (new record + counter) on public trip allow', () => { const btch = c.batch(); btch.set(c.doc(`copies/${C}__tBpub3`), { uid: C, kind: 'trip', docKey: 'tBpub3', at: 1 }); btch.set(c.doc('trips/tBpub3'), { copyCount: 1 }, { merge: true }); return btch.commit(); });
  await no('M4.25 copyCount +1 on public list WITHOUT record deny', () => a.doc('userCityLists/cBpub3').set({ copyCount: 1 }, { merge: true }));
  await ok('M4.25 copyCount BATCH (record + counter) on public list allow — existsAfter', cpBatch(a, A, 'list', 'cBpub3', 'userCityLists', 1));
  await no('M4.25 copyCount +2 deny', () => a.doc('trips/tBpub3').set({ copyCount: 3 }, { merge: true }));
  await no('M4.25 copyCount -1 deny (لا تناقص)', () => a.doc('trips/tBpub3').set({ copyCount: 0 }, { merge: true }));
  await no('M4.25 copyCount on PRIVATE trip deny', cpBatch(a, A, 'trip', 'tBpriv3', 'trips', 1));
  await no('M4.25 list create with copyCount 5 deny', () => a.doc('userCityLists/userA_cc1').set({ ownerId: A, public: false, sharedWith: [], copyCount: 5, categories: {} }));
  await no('M4.25 list owner touching copyCount deny', () => b.doc('userCityLists/cBpub3').set({ copyCount: 9 }, { merge: true }));
  // (٥) المتابعة: موثَّق بلا محتوى عام · الدفعة الواحدة
  const flBatch = (who, uid, cur, on, count) => () => { const btch = who.batch();
    if (on) btch.set(who.doc(`follows/${uid}_${cur}`), { followerUid: uid, curatorUid: cur, at: 1 }); else btch.delete(who.doc(`follows/${uid}_${cur}`));
    btch.set(who.doc(`communityProfiles/${cur}`), { followerCount: count }, { merge: true });
    return btch.commit(); };
  await ok('M4.25 follow BATCH (record + counter) on VERIFIED profile WITHOUT public content allow', flBatch(a, A, 'userV', true, 1));
  await ok('M4.25 unfollow BATCH on verified profile allow', flBatch(a, A, 'userV', false, 0));
  await ok('M4.25 follow BATCH on public-content profile allow (existsAfter)', flBatch(a, A, 'pB', true, 1));
  await no('M4.25 followerCount +1 WITHOUT record deny', () => a.doc('communityProfiles/userV').set({ followerCount: 1 }, { merge: true }));
  await no('M4.25 followerCount on profile neither verified nor public deny', flBatch(a, A, N, true, 1));
  // (٦) رأي المدينة
  await ok('M4.25 curatorCityNotes create by verified self allow', () => b.doc('curatorCityNotes/userB__paris').set({ uid: B, cityId: 'paris', text: 'Coffee first', bestTime: 'April', returns: 'yes', updatedAt: 1 }));
  await no('M4.25 curatorCityNotes create by NON-verified deny', () => a.doc('curatorCityNotes/userA__paris').set({ uid: A, cityId: 'paris', text: 'x' }));
  await no('M4.25 curatorCityNotes cityId mismatch deny', () => b.doc('curatorCityNotes/userB__rome').set({ uid: B, cityId: 'paris', text: 'x' }));
  await no('M4.25 curatorCityNotes text > 300 deny', () => b.doc('curatorCityNotes/userB__rome').set({ uid: B, cityId: 'rome', text: 'x'.repeat(301) }));
  await no('M4.25 curatorCityNotes bad returns deny', () => b.doc('curatorCityNotes/userB__rome').set({ uid: B, cityId: 'rome', returns: 'maybe' }));
  await no('M4.25 curatorCityNotes unknown field deny', () => b.doc('curatorCityNotes/userB__rome').set({ uid: B, cityId: 'rome', rating: 5 }));
  await ok('M4.25 curatorCityNotes read by signed-in allow', () => a.doc('curatorCityNotes/userB__paris').get());
  await no('M4.25 curatorCityNotes read by guest deny', () => guest.doc('curatorCityNotes/userB__paris').get());
  await no('M4.25 curatorCityNotes create for other uid deny', () => b.doc('curatorCityNotes/userA__paris').set({ uid: B, cityId: 'paris' }));
  // (٧) الطلبات والبلاغات
  await ok('M4.25 curatorRequests create by self pending allow', () => a.doc('curatorRequests/userA').set({ uid: A, text: 'please', at: Date.now(), status: 'pending' }));
  await no('M4.25 curatorRequests create with status accepted deny', () => a.doc('curatorRequests/userA2').set({ uid: A, status: 'accepted' }));
  await no('M4.25 curatorRequests create for other uid deny', () => a.doc('curatorRequests/userB').set({ uid: B }));
  await no('M4.25 curatorRequests status change by self deny', () => a.doc('curatorRequests/userA').set({ status: 'accepted' }, { merge: true }));
  await ok('M4.25 curatorRequests status change by OWNER allow', () => owner.doc('curatorRequests/userB').set({ status: 'accepted' }, { merge: true }));
  await no('M4.25 curatorRequests owner changing text deny', () => owner.doc('curatorRequests/userB').set({ text: 'edited' }, { merge: true }));
  await ok('M4.25 curatorRequests read by self allow', () => a.doc('curatorRequests/userA').get());
  await no('M4.25 curatorRequests read by other deny', () => b.doc('curatorRequests/userA').get());
  await ok('M4.25 reports create by signed-in allow', () => a.doc('reports/r1').set({ by: A, kind: 'place', docKey: 'cBpub3:coffee:p1', reason: 'spam', at: 1 }));
  await no('M4.25 reports create by SUSPENDED deny', () => s.doc('reports/r2').set({ by: S, kind: 'place', docKey: 'x' }));
  await no('M4.25 reports create with other by deny', () => a.doc('reports/r3').set({ by: B, kind: 'place', docKey: 'x' }));
  await no('M4.25 reports bad kind deny', () => a.doc('reports/r4').set({ by: A, kind: 'user', docKey: 'x' }));
  await ok('v3.17 reports read by the reporter allow (was deny — account deletion finds its own reports)', () => a.doc('reports/r1').get());
  await ok('M4.25 reports read by OWNER allow', () => owner.doc('reports/r1').get());
  await ok('M4.25 reports delete by OWNER allow', () => owner.doc('reports/r1').delete());
  // (٩) مفاتيح الإحصاء الجديدة والقديمة
  await ok('M4.25 stats_lists new key open_app allow', () => a.doc('stats_lists/cBpub3').set({ open_app: 1 }));
  await no('M4.25 stats_lists old key open_ulist deny', () => a.doc('stats_lists/cBpub3__2026-09-17').set({ open_ulist: 1 }));
  await no('M4.25 stats_lists removed key save_from deny', () => a.doc('stats_lists/cBpub3__2026-09-18').set({ save_from: 1 }));
  await ok('M4.25 stats_curators new key ref_social allow', () => a.doc('stats_curators/userB00000000000000000').set({ ref_social: 1 }));
  await ok('M4.25 stats_curators export key allow', () => a.doc('stats_curators/userB00000000000000000__2026-09-17').set({ export: 1 }));
  await no('M4.25 stats_curators old key ref_ig deny', () => a.doc('stats_curators/userB00000000000000000__2026-09-18').set({ ref_ig: 1 }));
  await ok('M4.25 stats_trips view_total allow', () => a.doc('stats_trips/tBpub3').set({ view_total: 1 }));
  await no('M4.25 stats_trips removed key interested deny', () => a.doc('stats_trips/tBpub3__2026-09-17').set({ interested: 1 }));
  await ok('M4.25 stats_cards view_social allow', () => a.doc('stats_cards/userA0000000000000000000__card1').set({ view_social: 1 }));
  await no('M4.25 stats_cards old key view_ig deny', () => a.doc('stats_cards/userA0000000000000000000__card2').set({ view_ig: 1 }));
  // (١١) stats_cities
  await ok('M4.25 stats_cities create by signed-in allow', () => a.doc('stats_cities/paris__2026-09-17').set({ open: 1, place_added: 1 }));
  await ok('M4.25 stats_cities update +1 allow', () => b.doc('stats_cities/paris__2026-09-17').set({ open: 2 }, { merge: true }));
  await no('M4.25 stats_cities unknown key deny', () => a.doc('stats_cities/paris__2026-09-18').set({ views: 1 }));
  await no('M4.25 stats_cities bad id (no date) deny', () => a.doc('stats_cities/paris').set({ open: 1 }));
  await no('M4.25 stats_cities read by user deny', () => a.doc('stats_cities/paris__2026-09-17').get());
  await ok('M4.25 stats_cities read by OWNER allow', () => owner.doc('stats_cities/paris__2026-09-17').get());
  await no('M4.25 stats_cities create by GUEST deny', () => guest.doc('stats_cities/rome__2026-09-17').set({ open: 1 }));

  // ================= ٢٣) M4.26 + أ-١٤ — التقسيم والأسطر الثمانية (٢٢ سبتمبر ٢٠٢٦) =================
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('userCityLists/userB_split').set({ ownerId: B, cityId: 'split', cityName: 'Split', public: true, sharedWith: [], index: [{ id: 'p1', name: 'P1', catId: 'coffee' }], splitV: 1, bookmarkCount: 0, viewCount: 0, copyCount: 1 });
    await db.doc('userCityListCats/userB_split_coffee').set({ ownerId: B, cityId: 'split', catId: 'coffee', public: true, sharedWith: [], places: [{ id: 'p1', name: 'P1', url: 'u' }] });
    await db.doc('userCityListCats/userB_split_pizza').set({ ownerId: B, cityId: 'split', catId: 'pizza', public: false, sharedWith: [A], places: [] });
    await db.doc('userCityListCats/userB_priv_bar').set({ ownerId: B, cityId: 'priv', catId: 'bar', public: false, sharedWith: [], places: [] });
    await db.doc('copies/userA__userB_split').set({ uid: A, kind: 'list', docKey: 'userB_split', at: 1 });
    await db.doc('trips/tB_v').set({ ownerId: B, public: true, sharedWith: [], saveCount: 0, copyCount: 1, viewCount: 0, name: 'v' });
    await db.doc('copies/userA__tB_v').set({ uid: A, kind: 'trip', docKey: 'tB_v', at: 1 });
    await db.doc('curatorRequests/userA').set({ uid: A, text: 'x', at: 1, status: 'pending' });
    await db.doc('reports/rA1').set({ by: A, kind: 'place', docKey: 'x', at: 1 });
    await db.doc('follows/userA_pB').set({ followerUid: A, curatorUid: 'pB', at: 1 });
  });
  // (أ) الأم فهرسًا — انتقالية: categories أو index
  await ok('M4.26 parent create with index+splitV allow', () => a.doc('userCityLists/userA_ix1').set({ ownerId: A, public: false, sharedWith: [], index: [], splitV: 1 }));
  await ok('[v3.13 split shape] M4.26 parent create with categories (transitional) allow', () => a.doc('userCityLists/userA_ix2').set({ ownerId: A, public: false, sharedWith: []}));
  await no('M4.26 parent splitV 2 deny', () => a.doc('userCityLists/userA_ix3').set({ ownerId: A, public: false, sharedWith: [], index: [], splitV: 2 }));
  await no('M4.26 parent index not a list deny', () => a.doc('userCityLists/userA_ix4').set({ ownerId: A, public: false, sharedWith: [], index: 'x', splitV: 1 }));
  // (أ) الفرعي
  await ok('M4.26 cat create by owner allow', () => a.doc('userCityListCats/userA_ix1_coffee').set({ ownerId: A, cityId: 'ix1', catId: 'coffee', public: false, sharedWith: [], places: [{ id: 'q', name: 'Q', url: 'u' }] }));
  await no('M4.26 cat create private catId deny', () => a.doc('userCityListCats/userA_ix1_personal_home').set({ ownerId: A, cityId: 'ix1', catId: 'personal_home', public: false, sharedWith: [], places: [] }));
  await no('M4.26 cat create missing places deny', () => a.doc('userCityListCats/userA_ix1_pizza').set({ ownerId: A, cityId: 'ix1', catId: 'pizza', public: false, sharedWith: [] }));
  await no('M4.26 cat create for other uid deny', () => a.doc('userCityListCats/userB_x_coffee').set({ ownerId: B, cityId: 'x', catId: 'coffee', public: false, sharedWith: [], places: [] }));
  await no('M4.26 cat create with googleLat deny', () => a.doc('userCityListCats/userA_ix1_bar').set({ ownerId: A, cityId: 'ix1', catId: 'bar', public: false, sharedWith: [], places: [], googleLat: 1 }));
  await ok('M4.26 cat update by owner (places) allow', () => a.doc('userCityListCats/userA_ix1_coffee').set({ places: [] }, { merge: true }));
  await no('M4.26 cat update changing catId deny', () => a.doc('userCityListCats/userA_ix1_coffee').set({ catId: 'pizza' }, { merge: true }));
  await no('M4.26 cat update by other deny', () => b.doc('userCityListCats/userA_ix1_coffee').set({ places: [] }, { merge: true }));
  await ok('M4.26 cat read PUBLIC by other allow', () => a.doc('userCityListCats/userB_split_coffee').get());
  await ok('M4.26 cat read SHARED with me allow', () => a.doc('userCityListCats/userB_split_pizza').get());
  await no('M4.26 cat read PRIVATE by other deny', () => a.doc('userCityListCats/userB_priv_bar').get());
  await no('M4.26 cat read by guest deny', () => guest.doc('userCityListCats/userB_split_coffee').get());
  await ok('M4.26 cat delete by owner allow', () => a.doc('userCityListCats/userA_ix1_coffee').delete());
  await no('M4.26 cat delete by other deny', () => a.doc('userCityListCats/userB_split_coffee').delete());
  // (١) العدّاد اللحظي: حذف السجل و −١ بالدفعة
  const unBatch = (who, uid, key, coll, count) => () => { const btch = who.batch(); btch.delete(who.doc(`copies/${uid}__${key}`)); btch.set(who.doc(`${coll}/${key}`), { copyCount: count }, { merge: true }); return btch.commit(); };
  await no('v3.17 copies trip record for a MISSING trip deny (second form — was allow)', () => a.doc('copies/userA__scratch23').set({ uid: A, kind: 'trip', docKey: 'scratch23', at: 1 }));
  await no('M4.26 copies delete by other deny', () => b.doc('copies/userA__userB_split').delete());
  await ok('M4.26 copyCount -1 BATCH (delete record + counter) on list allow', unBatch(a, A, 'userB_split', 'userCityLists', 0));
  await ok('M4.26 copyCount -1 BATCH on trip allow', unBatch(a, A, 'tB_v', 'trips', 0));
  await no('M4.26 copyCount -1 WITH record still present deny', () => a.doc('trips/tBpub3').set({ copyCount: 0 }, { merge: true }));
  await no('M4.26 copyCount below zero deny', () => a.doc('trips/tB_v').set({ copyCount: -1 }, { merge: true }));
  // (٩) إغلاق ثغرة العدّادات: لا تضخيم بسجل قائم ولا تصفير بلا سجل — بالأربعة
  await no('v3.10 inflate: copyCount +1 again with my record already there deny', () => c.doc('trips/tBpub3').set({ copyCount: 2 }, { merge: true }));
  await no('v3.10 zero: copyCount -1 without any record deny', () => v.doc('trips/tBpub3').set({ copyCount: 0 }, { merge: true })); // userV بلا سجل
  await no('v3.10 inflate: bookmarkCount +1 with pre-existing record deny', () => a.doc('userCityLists/cBpub3').set({ bookmarkCount: 1 }, { merge: true }));
  await no('v3.10 zero: bookmarkCount -1 without record deny', () => v.doc('userCityLists/cBpub3').set({ bookmarkCount: -1 }, { merge: true }));
  await no('v3.10 inflate: saveCount +1 without creating a record deny', () => a.doc('trips/tB_v').set({ saveCount: 1 }, { merge: true }));
  await no('v3.10 inflate: followerCount +1 without a new record deny', () => v.doc('communityProfiles/pB').set({ followerCount: 9 }, { merge: true }));
  await no('v3.10 batch that creates a record but bumps by +2 deny', () => { const btch = a.batch(); btch.set(a.doc('copies/userA__tB_v'), { uid: A, kind: 'trip', docKey: 'tB_v', at: 1 }); btch.set(a.doc('trips/tB_v'), { copyCount: 2 }, { merge: true }); return btch.commit(); });
  await ok('v3.10 batch that creates a record and bumps by +1 allow', () => { const btch = a.batch(); btch.set(a.doc('copies/userA__tB_v'), { uid: A, kind: 'trip', docKey: 'tB_v', at: 1 }); btch.set(a.doc('trips/tB_v'), { copyCount: 1 }, { merge: true }); return btch.commit(); });
  // (٢) حذف الحساب: كل سجل يحذفه صاحبه
  await ok('M4.26 curatorRequests delete by self allow', () => a.doc('curatorRequests/userA').delete());
  await ok('M4.26 reports delete by reporter allow', () => a.doc('reports/rA1').delete());
  await no('M4.26 reports delete by other deny', () => b.doc('reports/r5').set({ by: B, kind: 'place', docKey: 'x' }).then(() => a.doc('reports/r5').delete()));
  await no('v3.17 follows record deleted ALONE while counted deny (pB followerCount 1 — was allow)', () => a.doc('follows/userA_pB').delete());
  // (٣) trips.viewCount
  await ok('M4.26 trips viewCount +1 by other allow', () => a.doc('trips/tB_v').set({ viewCount: 1 }, { merge: true }));
  await no('M4.26 trips viewCount +2 deny', () => a.doc('trips/tB_v').set({ viewCount: 3 }, { merge: true }));
  await no('M4.26 trips viewCount by OWNER deny', () => b.doc('trips/tB_v').set({ viewCount: 5 }, { merge: true }));
  await no('M4.26 trip create with viewCount 3 deny', () => a.doc('trips/tA_v').set({ ownerId: A, public: false, sharedWith: [], viewCount: 3 }));
  // (٤) التواصل بنوعه · displayName مسحوب · tagline
  await ok('M4.26 profile contact email allow', () => a.doc('communityProfiles/' + A).set({ contact: { type: 'email', value: 'a@x.io' } }, { merge: true }));
  await ok('M4.26 profile contact whatsapp allow', () => a.doc('communityProfiles/' + A).set({ contact: { type: 'whatsapp', value: '+9665' } }, { merge: true }));
  await no('M4.26 profile contact bad type deny', () => a.doc('communityProfiles/' + A).set({ contact: { type: 'fax', value: '1' } }, { merge: true }));
  await no('M4.26 profile contact empty value deny', () => a.doc('communityProfiles/' + A).set({ contact: { type: 'email', value: '' } }, { merge: true }));
  await no('M4.26 profile contact extra key deny', () => a.doc('communityProfiles/' + A).set({ contact: { type: 'email', value: 'a', x: 1 } }, { merge: true }));
  await no('M4.26 profile displayName deny (withdrawn)', () => a.doc('communityProfiles/' + A).set({ displayName: 'X' }, { merge: true }));
  await ok('M4.26 profile tagline 40 allow', () => a.doc('communityProfiles/' + A).set({ tagline: 'x'.repeat(40) }, { merge: true }));
  await no('M4.26 profile tagline 41 deny', () => a.doc('communityProfiles/' + A).set({ tagline: 'x'.repeat(41) }, { merge: true }));
  await ok('M4.26 profile contactUrl https still allowed (transitional)', () => a.doc('communityProfiles/' + A).set({ contactUrl: 'https://x.io/a' }, { merge: true }));
  // (٥) مدن المواسم — المالك يكتب
  // (٦) أنواع البلاغ
  await ok('M4.26 report kind notes allow', () => a.doc('reports/rn1').set({ by: A, kind: 'notes', docKey: 'cur_a__paris', reason: 'x' }));
  await ok('M4.26 report kind app without docKey allow', () => a.doc('reports/rapp1').set({ by: A, kind: 'app', reason: 'The button does nothing' }));
  await no('M4.26 report kind place without docKey deny', () => a.doc('reports/rp0').set({ by: A, kind: 'place' }));
  // (٧) rulesVersion — المالك
  await ok('M4.26 settings rulesVersion by OWNER allow', () => owner.doc('settings/app').set({ rulesVersion: 'v3.10' }, { merge: true }));
  await no('M4.26 settings rulesVersion by user deny', () => a.doc('settings/app').set({ rulesVersion: 'v9' }, { merge: true }));
  // ملاحظة المصفوفة (المطابقة المقيَّدة): المالك ينشئ ملفًا عامًّا لمستخدم آخر — تجيزه القواعد؛ حالة تخصه
  await ok('M4.12 matrix note: OWNER creates a community profile for another user allow', () => owner.doc('communityProfiles/userNewByOwner').set({ nickname: 'newby', verified: true, publicCityIds: [] }));
  await no('M4.12 matrix note: a user cannot create a profile for another user deny', () => a.doc('communityProfiles/userNewByA').set({ nickname: 'x' }));
  // (٨) hiddenCities بمستند صاحبه
  await ok('M4.26 userLists hiddenCities by self allow', () => a.doc('userLists/' + A).set({ hiddenCities: ['paris'] }, { merge: true }));
  await no('M4.26 userLists hiddenCities by other deny', () => b.doc('userLists/' + A).set({ hiddenCities: [] }, { merge: true }));

  // ================= ٢٤) v3.11 — سجل هوية الأماكن placeIdentity (٢٤ سبتمبر ٢٠٢٦) =================
  const PI = { lat: 48.86453, lng: 2.34943, source: 'overture', openId: 'ovt:155747', n: 'Dalmata', cityId: '2988507', by: A, at: 1 };
  await ok('v3.11 identity create by signed-in allow', () => a.doc('placeIdentity/h_dalmata').set(PI));
  await ok('v3.11 identity read by guest allow', () => guest.doc('placeIdentity/h_dalmata').get());
  await ok('v3.11 identity update by another user allow (last confirmer wins)', () => b.doc('placeIdentity/h_dalmata').set(Object.assign({}, PI, { by: B, source: 'user_pin', at: 2 })));
  await no('v3.11 identity create by guest deny', () => guest.doc('placeIdentity/h_g').set(PI));
  await no('v3.11 identity by mismatched uid deny', () => a.doc('placeIdentity/h_x1').set(Object.assign({}, PI, { by: B })));
  await no('v3.11 identity bad source deny', () => a.doc('placeIdentity/h_x2').set(Object.assign({}, PI, { source: 'google' })));
  await no('v3.11 identity lat out of range deny', () => a.doc('placeIdentity/h_x3').set(Object.assign({}, PI, { lat: 95 })));
  await no('v3.11 identity extra field deny', () => a.doc('placeIdentity/h_x4').set(Object.assign({}, PI, { extra: 1 })));
  await no('v3.11 identity googleLat deny', () => a.doc('placeIdentity/h_x5').set(Object.assign({}, PI, { googleLat: 1 })));
  await no('v3.11 identity missing lng deny', () => a.doc('placeIdentity/h_x6').set({ lat: 1, source: 'user_pin', by: A, at: 1 }));
  await no('v3.11 identity name too long deny', () => a.doc('placeIdentity/h_x7').set(Object.assign({}, PI, { n: 'x'.repeat(121) })));
  await no('v3.11 identity delete by user deny', () => a.doc('placeIdentity/h_dalmata').delete());
  await ok('v3.11 identity delete by OWNER allow', () => owner.doc('placeIdentity/h_dalmata').delete());
  await no('v3.11 identity by suspended user deny', () => s.doc('placeIdentity/h_x8').set(Object.assign({}, PI, { by: S })));

  // ================= ٢٥) v3.12 — others تصنيف عام (٢٩ سبتمبر ٢٠٢٦) =================
  await ok('[v3.13 split shape] v3.12 others: public list parent with categories.others allow', () => a.doc('userCityLists/' + A + '_o12').set({ ownerId: A, cityId: 'o12', cityName: 'O', public: true, sharedWith: [], catsV: 3}));
  await ok('v3.12 others: public split cat doc others allow', () => a.doc('userCityListCats/' + A + '_o12_others').set({ ownerId: A, cityId: 'o12', catId: 'others', public: true, sharedWith: [], active: true, places: [{ id: 'p1', name: 'Odd spot', url: 'https://maps.app.goo.gl/o1' }], updatedAt: 1 }));
  await ok('v3.12 others: another signed-in user reads the public others cat', () => b.doc('userCityListCats/' + A + '_o12_others').get());
  await no('v3.12 others: guest still cannot read cats (sign-in gate)', () => guest.doc('userCityListCats/' + A + '_o12_others').get());
  await no('v3.12 private keys still denied on public parent (personal_home)', () => a.doc('userCityLists/' + A + '_o13').set({ ownerId: A, cityId: 'o13', cityName: 'O', public: true, sharedWith: [], catsV: 3, categories: { personal_home: { active: true, places: [] } } }));
  await no('v3.12 private cat doc still denied (hospitals_clinics)', () => a.doc('userCityListCats/' + A + '_o13_hospitals_clinics').set({ ownerId: A, cityId: 'o13', catId: 'hospitals_clinics', public: true, sharedWith: [], active: true, places: [], updatedAt: 1 }));
  await no('v3.12 private cat doc still denied (personal_friends)', () => a.doc('userCityListCats/' + A + '_o13_personal_friends').set({ ownerId: A, cityId: 'o13', catId: 'personal_friends', public: true, sharedWith: [], active: true, places: [], updatedAt: 1 }));

  // ================= ٢٦) v3.13 — الإحكام (١ أكتوبر ٢٠٢٦) =================
  await no('v3.13 parent list with categories on create denied (split shape only)', () => a.doc('userCityLists/' + A + '_h13').set({ ownerId: A, cityId: '2988507', cityName: 'Paris', public: true, sharedWith: [], catsV: 3, categories: { coffee: { active: true, places: [] } } }));
  await ok('v3.13 parent list without categories (index + splitV) allow', () => a.doc('userCityLists/' + A + '_h13').set({ ownerId: A, cityId: '2988507', cityName: 'Paris', public: true, sharedWith: [], catsV: 3, splitV: 1, index: [] }));
  await ok('v3.13 split cat doc allow', () => a.doc('userCityListCats/' + A + '_h13_coffee').set({ ownerId: A, cityId: '2988507', catId: 'coffee', public: true, sharedWith: [], active: true, places: [{ id: 'p1', name: 'X', url: 'https://maps.app.goo.gl/x' }], updatedAt: 1 }));
  await no('v3.13 update adding categories to parent denied', () => a.doc('userCityLists/' + A + '_h13').update({ categories: { coffee: { active: true, places: [] } } }));
  await ok('v3.13 analytics events with gazetteer city id allow', () => guest.doc('analytics/events_2026-10-01__2988507__coffee').set({ place_open: 1 }));
  await ok('v3.13 analytics events with island id allow', () => guest.doc('analytics/events_2026-10-01__i_mallorca__all').set({ place_open: 1 }));
  await no('v3.13 analytics events with a non-id city denied', () => guest.doc('analytics/events_2026-10-01__paris__coffee').set({ place_open: 1 }));
  await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('userCityLists/' + A + '_h13old').set({ ownerId: A, cityId: '2988507', cityName: 'Paris', public: true, sharedWith: [], catsV: 3, categories: { coffee: { active: true, places: [] } }, bookmarkCount: 0, viewCount: 0, copyCount: 0 }); });
  await ok('v3.13 legacy parent still holding categories: owner update of another field allow (untouched categories)', () => a.doc('userCityLists/' + A + '_h13old').update({ cityName: 'Paris FR' }));
  await ok('v3.13 legacy parent: others bump viewCount allow (untouched categories)', () => b.doc('userCityLists/' + A + '_h13old').update({ viewCount: 1 }));
  await ok('v3.13 legacy parent: rewriting the doc without categories (migration write) allow', () => a.doc('userCityLists/' + A + '_h13old').set({ ownerId: A, cityId: '2988507', cityName: 'Paris FR', public: true, sharedWith: [], catsV: 3, splitV: 1, index: [], bookmarkCount: 0, viewCount: 1, copyCount: 0 }));
  await no('v3.13 cities collection: owner write denied (collection removed)', () => owner.doc('cities/paris').set({ links: {} }));
  await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('analytics/events_2026-10-01__all__all').set({ place_open: 1 }); });
  await ok('v3.13 analytics update touching 4 keys allow (within cap)', () => guest.doc('analytics/events_2026-10-01__all__all').update({ place_open: 2, bookmark_add: 1, mylist_open: 1, mylist_save: 1 }));
  await no('v3.13 analytics update touching more than 6 keys denied (cap)', () => guest.doc('analytics/events_2026-10-01__all__all').update({ place_open: 1, bookmark_add: 1, mylist_open: 1, mylist_save: 1, trip_open: 1, trip_save: 1, community_open: 1 }));
  await no('v3.13 stats_places: id without an existing user list denied (owner_ guide form gone)', () => a.doc('stats_places/owner_nowhere__0123456789abcdef').set({ open_total: 1 }));

  // ================= ٢٧) v3.14 — المفتاح اليومي save بـstats_curators (٩ أكتوبر ٢٠٢٦ · ب-٢) =================
  const SV = 'stats_curators/' + CUR + '__2026-10-09';
  await ok('v3.14 stats_curators daily create {save:1} by a signed user (A)', () => a.doc(SV).set({ save: 1 }));
  await ok('v3.14 stats_curators daily update save +1 by another user (B)', () => b.doc(SV).update({ save: 2 }));
  await ok('v3.14 stats_curators daily update save together with page_view', () => guest.doc(SV).update({ save: 3, page_view: 1 }));
  await no('v3.14 stats_curators update save +51 denied (cap)', () => a.doc(SV).update({ save: 54 }));
  await no('v3.14 stats_curators update save decrease denied', () => a.doc(SV).update({ save: 2 }));
  await no('v3.14 stats_curators unknown key still denied (saves)', () => a.doc(SV).set({ saves: 1 }));
  await ok('v3.14 stats_curators daily read by its curator', () => cur.doc(SV).get());

  // ================= ٢٨) v3.15 — placeFavoriteCounts: حقل city الاختياري عند الإنشاء (١١ نوفمبر ٢٠٢٦ · r116-أ) =================
  const PC = { name: 'Pastéis de Belém', url: 'https://maps.app.goo.gl/pc28', count: 1 };
  await ok('v3.15 pfc create with a gazetteer city id allow', () => pfcUp(a, A, 'c28a', { ...PC, city: '2267057' }, true));
  await ok('v3.15 pfc create without city still allow', () => pfcUp(a, A, 'c28b', PC, true));
  await no('v3.15 pfc create with a private (non-id) city denied', () => pfcUp(a, A, 'c28c', { ...PC, city: 'c_my_village' }, true));
  await no('v3.15 pfc create with city plus an unknown field denied', () => pfcUp(a, A, 'c28d', { ...PC, city: '2267057', by: A }, true));
  await no('v3.15 pfc update changing city denied (frozen after create)', () => pfcUp(b, B, 'c28a', { count: 2, city: 'i_madeira' }));

  // ================= ٢٩) v3.16 — placeFavoriteCounts مربوط بسجل صاحبه copies/<uid>__p_<docId> (١١ نوفمبر ٢٠٢٦ · r117-أ) =================
  await no('v3.16 pfc bare create without a record denied (forged first save)', () => a.doc('placeFavoriteCounts/' + pf('c29x')).set(PC));
  await no('v3.16 pfc bare +1 without a record denied (forged save)', () => b.doc('placeFavoriteCounts/' + pf('c28a')).update({ count: 2 }));
  await ok('v3.16 pfc +1 with own new record in one batch allow', () => pfcUp(b, B, 'c28a', { count: 2 }));
  await no('v3.16 pfc second +1 by the same saver denied (record already exists)', () => pfcUp(b, B, 'c28a', { count: 3 }));
  await no('v3.16 pfc +1 carried by a record of another counter denied', () => { const btch = c.batch(); btch.set(c.doc(`copies/${C}__p_${pf('c28b')}`), { uid: C, kind: 'place', docKey: 'p_' + pf('c28b') }); btch.update(c.doc('placeFavoriteCounts/' + pf('c28a')), { count: 3 }); return btch.commit(); });
  await no('v3.16 pfc bare -1 keeping the record denied', () => b.doc('placeFavoriteCounts/' + pf('c28a')).update({ count: 1 }));
  await no('v3.16 pfc -1 by a user who never saved denied (zeroing others closed)', () => pfcDown(c, C, 'c28a', { count: 1 }));
  await ok('v3.16 pfc -1 deleting own record in one batch allow', () => pfcDown(b, B, 'c28a', { count: 1 }));
  await no('v3.16 copies: a save record under another uid denied (no borrowing)', () => b.doc(`copies/${A}__p_${pf('c29z')}`).set({ uid: A, kind: 'place', docKey: 'p_' + pf('c29z') })); /* معرّف لم يوجد قط — الرفض لشرط الصاحب لا لـupdate: false */

  // v3.16 (١-ب): الربط في الاتجاهين — السجل لا يُنشأ ولا يُحذف إلا مع حركة عدّاده · معرّف العدّاد الجديد ١٦ خانة ست-عشرية
  const rec29 = (uid, name) => `copies/${uid}__p_${pf(name)}`; const recData = (uid, name) => ({ uid, kind: 'place', docKey: 'p_' + pf(name) });
  await no('v3.16 save record created alone (no counter move) denied — first half of a two-step zeroing', () => b.doc(rec29(B, 'c28b')).set(recData(B, 'c28b')));
  await ok('v3.16 +1 on c28b with own record (count 2) allow', () => pfcUp(b, B, 'c28b', { count: 2 }));
  await no('v3.16 save record deleted alone while its counter is above zero denied — first half of a two-step inflation', () => b.doc(rec29(B, 'c28b')).delete());
  await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(rec29(B, 'gone29')).set(recData(B, 'gone29')); });
  await ok('v3.16 save record of a missing counter may be deleted alone', () => b.doc(rec29(B, 'gone29')).delete());
  await ok('v3.16 save record of a counter at zero may be deleted alone', () => a.doc(rec29(A, 'p0')).delete());
  await no('v3.16 counter created under a free (non-hex) id denied', () => { const btch = a.batch(); btch.set(a.doc(`copies/${A}__p_plainid29`), { uid: A, kind: 'place', docKey: 'p_plainid29' }); btch.set(a.doc('placeFavoriteCounts/plainid29'), PC); return btch.commit(); });
  await ok('v3.16 second counter for the same saver (c29y, count 1) allow', () => pfcUp(b, B, 'c29y', PC, true));
  await ok('v3.16 two pairs in one batch (account deletion shape): both records deleted, both counters -1 allow', () => { const btch = b.batch(); ['c28b', 'c29y'].forEach((n, i) => { btch.delete(b.doc(rec29(B, n))); btch.update(b.doc('placeFavoriteCounts/' + pf(n)), { count: i === 0 ? 1 : 0 }); }); return btch.commit(); });
  await ok('v3.16 app owner may correct a counter without a record', () => owner.doc('placeFavoriteCounts/' + pf('c28b')).update({ count: 7 }));
  await no('v3.16 counter created with a non-http link denied', () => pfcUp(a, A, 'c29j', { name: 'J', url: 'javascript://maps.google.com/%0aalert(1)', count: 1 }, true));
  await no('v3.16 counter created with a non-string name denied', () => pfcUp(a, A, 'c29n', { name: { x: 1 }, url: 'https://maps.app.goo.gl/n29', count: 1 }, true));
  await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('placeFavoriteCounts/legacy29').set({ name: 'Legacy', url: 'https://maps.app.goo.gl/l29', count: 3 }); });
  await no('v3.16 counter with a free (pre-v3.16) id cannot be moved by a non-owner', () => { const btch = b.batch(); btch.set(b.doc(`copies/${B}__p_legacy29`), { uid: B, kind: 'place', docKey: 'p_legacy29' }); btch.update(b.doc('placeFavoriteCounts/legacy29'), { count: 4 }); return btch.commit(); });
  await ok('v3.16 my own missing save record is readable by id (the app checks it before unsaving)', () => a.doc(rec29(A, 'c29q')).get());
  await no('v3.16 another saver’s record is not readable by id', () => b.doc(rec29(A, 'c28a')).get());
  await no('v3.17 an ordinary copy record (list) is no longer created alone (was allow in v3.16)', () => a.doc(`copies/${A}__someList29`).set({ uid: A, kind: 'list', docKey: 'someList29' }));

  /* قياسات لا أحكام (لا تدخل الحصيلة — تُقرأ من سجل CI): سلوك للمحرّك الرسمي لم يُقَس في بيئة الكتابة، والتطبيق مبنيّ ليعمل على الوجهين.
     (١) هل ترى قاعدة السجل (getAfter للعدّاد) حركة increment على العدّاد في الدفعة نفسها؟ التطبيق يكتب increment أولًا ثم يعيد بقيمة صريحة إن رُفض.
     (٢) هل يقبل المحرّك استعلام حذف الحساب where('uid','==',uid) بقاعدة القراءة الجديدة؟ التطبيق لا يعتمد عليه لعدّاد «saved by» (savedByReleaseCities يقرأ بالمعرّف). */
  try{ const q29r = await b.collection('reports').where('by', '==', B).get(); console.log('INFO  v3.16 reports list by own uid (account deletion query): ALLOWED · ' + q29r.size + ' docs'); }catch(e){ console.log('INFO  v3.16 reports list by own uid (account deletion query): DENIED · ' + (e && e.code) + ' — reports of a deleted account stay (read is owner-only)'); }
  { let FV = null; try{ const fb = require('firebase/compat/app'); require('firebase/compat/firestore'); FV = (fb.default || fb).firestore.FieldValue; }catch(_){ }
    if (!FV) console.log('INFO  v3.16 increment probes: not measured (FieldValue not available in this runner)');
    else { const probe = async (label, fn) => { try{ await fn(); console.log('INFO  v3.16 ' + label + ': ALLOWED'); return true; }catch(e){ console.log('INFO  v3.16 ' + label + ': DENIED · ' + (e && e.code)); return false; } };
      const up = await probe('save as the app writes it (record with serverTimestamp + counter increment(1), one batch)', () => { const btch = b.batch(); btch.set(b.doc(rec29(B, 'c29y')), Object.assign(recData(B, 'c29y'), { at: FV.serverTimestamp() })); btch.update(b.doc('placeFavoriteCounts/' + pf('c29y')), { count: FV.increment(1) }); return btch.commit(); });
      if (up) await probe('unsave as the app writes it (record delete + counter increment(-1), one batch)', () => { const btch = b.batch(); btch.delete(b.doc(rec29(B, 'c29y'))); btch.update(b.doc('placeFavoriteCounts/' + pf('c29y')), { count: FV.increment(-1) }); return btch.commit(); }); } }
  try{ const q29 = await b.collection('copies').where('uid', '==', B).get(); console.log('INFO  v3.16 copies list by uid (account deletion query): ALLOWED · ' + q29.size + ' docs'); }catch(e){ console.log('INFO  v3.16 copies list by uid (account deletion query): DENIED · ' + (e && e.code)); }

  // ================= ٣٠) v3.16 — مفاتيح الأحداث الأربعة المحذوفة (١١ نوفمبر ٢٠٢٦ · r117-ب) =================
  await no('v3.16 events create with curator_view denied (key removed)', () => guest.doc('analytics/events_2026-11-11__2988507__all').set({ curator_view: 1 }));
  await no('v3.16 events create with session_depth denied (key removed)', () => guest.doc('analytics/events_2026-11-11__all__all').set({ session_depth: 1 }));
  await ok('v3.16 events create with kept keys allow (share_card, personal_save)', () => guest.doc('analytics/events_2026-11-11__all__all').set({ share_card: 1, personal_save: 1 }));
  await no('v3.16 events update adding curator_follow or curator_contact denied', () => guest.doc('analytics/events_2026-11-11__all__all').update({ curator_follow: 1, curator_contact: 1 }));

  // ================= ٣١) قياسات المراجعة الشاملة — المحور ١ (١٢ نوفمبر ٢٠٢٦ · ق١١-١٢-٠٢) — صارت محتسبة مع v3.17 (ق١١-١٢-٠٥) =================
  // v3.17: كل قياس له نتيجة متوقَّعة تحت القواعد الجديدة (PS1_EXPECT · PS2_EXPECT أدناه) — المطابقة حالة ناجحة والمخالفة حالة فاشلة.
  //   نتيجة v3.16 المقيسة (١٢ نوفمبر ٠٥:٢٤) محفوظة في تقرير المحور ١ v1.2 §٠. ما بقي «A» تحت v3.17 ثغرة مسمّاة لم تُغلق أو مسار مشروع؛ كل واحدة مذكورة في المواصفة.
  // قياسات لا أحكام: كل سطر INFO خارج الحصيلة (pass/fail لا يتغيّران) ولا يُسقط التشغيل — أي عطل في القسم يُطبع INFO ABORTED ويمضي.
  // المصدر: مراجعان مستقلان (R1 = سطح الهجوم على القواعد · R2 = مطابقة ما يكتبه التطبيق للقواعد). نصّ كل قياس كما كتبه صاحبه.
  // قراءة R1: ALLOWED = الثغرة مؤكَّدة، إلا ما بدأ وصفه بـ[DENIED = …] فهو العكس (كتابة مشروعة ترفضها القواعد).
  // قراءة R2: ما كُتب ok( / no( هو توقّع المراجع من نص القاعدة — يُطبع هنا INFO بنتيجته الفعلية ولا يُحتسب (ok وno مظلَّلتان داخل القسم).
  // بعد كل إصلاح: القياس يتحوّل إلى حالة محتسبة (no / ok) في قسم الإصلاح.
  // الخلاصة: آخر القسم يطبع أسطر «PS» — عشرون نتيجة في السطر بترتيب التنفيذ، وأول السطر رقم أول قياس فيه (A مقبول · A/n مقبول بعدد المستندات · D مرفوض بالقواعد · X:رمز رفض آخر · =قيمة · ? غير مقيس · ! عطل).
  // جدول الأرقام والأوصاف: PROBE_MAP=1 يطبعه (أسطر PSMAP).
  /* المتوقَّع تحت v3.17 — بترتيب التنفيذ. A مقبول (عدد المستندات لا يُقارن) · D مرفوض بالقواعد · X:رمز · =قيمة.
     PS1 ‎001–045: العدّادات الخمسة — الخطوة الأولى (سجل + عدّاد بطلب واحد) مقبولة، وكل ما بعدها مرفوض: حذف السجل وحده · +١ ثانية · إنشاء السجل وحده · −١؛ القيمة النهائية بذرة+١ في الحالتين. */
  const PS1_EXPECT = (Array(5).fill('A D D =4 D D D D =4').join(' ')
    + ' D =0 D =5 D' /* 046–050: العدّاد مرتين في دفعة */
    + ' D D =userA X:not-in-result D' /* 051–055: حقل المالك مثبَّت — القائمة لم تُزرع */
    + ' D A' /* 056 صاحب الملف لا يزيد مشاهداته · 057 زائر يكرّر +١ (غير مغلق — المشاهدات رقم لا معيار) */
    + ' D D A' /* 058–060: dailyStats — القفز مرفوض · المعرّف غير التاريخ مرفوض · الموقوف يكتب +١ (غير مغلق) */
    + ' D D D D D' /* 061–065: معرّفات العدّادات المجهولة */
    + ' D D D D D D' /* 066–071: معرّفات ملحَقة وحقول بلا نوع */
    + ' D' /* 072: displayName القديم — يبقى مرفوضًا، علاجه في الكود */
    + ' A D D D' /* 073 أسماء كثيرة لحساب واحد (غير مغلق) · 074 حقل زائد · 075–076 اسم غيره */
    + ' D D' /* 077 الموقوف لا يعيد إنشاء مستنده · 078 حذف الطلب المرفوض ثم إعادته بوقت قديم: مرفوض (v3.17 ١٥ — بوقت الخادم يبقى ممكنًا: مسمّى) */
    + ' D D' /* 079–080: المستند الخاص المعلَّم عامًّا */
    + ' D D D' /* 081–083: كتابات مشروعة مرفوضة — علاجها في الكود أو البيانات */
    + ' A A A A A A A A A A' /* 084–093: استعلامات التطبيق */
    + ' D D D' /* 094–096 */
    + ' D A A D' /* 097 سرد الأسماء أُغلق · 098–099 تصميم · 100 ضابط */
    + ' A A D' /* 101–103: الدفعات الكبيرة */
    + ' A =0' /* 104–105: عدّاد «saved by» بمعرّف لا يطابق رابطه (غير مغلق) */).split(' ');
  const PS2_EXPECT = ('D D A D' /* 001–004 ★ */
    + ' A D D A A D D' /* 005–011 عدّادات المالك (علاجها في الكود) */
    + ' D A' /* 012–013 Undo الدمج */
    + ' D D D A D D A' /* 014–020 الإلغاء */
    + ' A A' /* 021–022 */
    + ' A A A D A A A A A A A A A A D D A A D A A A' /* 023–044 الاستعلامات */
    + ' A A A' /* 045 البلاغ ٢٤٨ حرفًا صار مقبولًا (الحدّ ٣٠٠) · 046–047 */
    + ' D A' /* 048–049 displayName */
    + ' D D D' /* 050–052 حذف غير الموجود */
    + ' D A' /* 053–054 */
    + ' D D D D' /* 055–058 */
    + ' A D A A D' /* 059 فهرس [null] (القارئ يتحمّله) · 060 nickname:5 مرفوض · 061–062 داخل المصفوفات · 063 هوية بعيدة مرفوضة */
    + ' A A A' /* 064–066 */
    + ' =W' /* 067: دلالة الدمج بالخريطة الفارغة — حقيقة المكتبة، علاجها في الكود */).split(' ');
  { const PS = { 1: [], 2: [] }; const __log = console.log; const PSMAP = [];
    const __judge = function(){ [[1, PS1_EXPECT], [2, PS2_EXPECT]].forEach(function(pr){ const k = pr[0], E = pr[1], L = PS[k];
        if (L.length !== E.length){ fail++; __log('FAIL  v3.17 PS' + k + ' count  →  expected ' + E.length + ' results | got ' + L.length); }
        for (let i = 0; i < Math.min(L.length, E.length); i++){ const got = String(L[i]), want = E[i]; const same = (want === 'A') ? /^A(\/\d+)?$/.test(got) : got === want;
          const label = String(PSMAP[(k === 1 ? 0 : PS[1].length) + i] || '').split('\t').pop().replace(/^INFO  /, '').slice(0, 150);
          if (same){ pass++; __log('PASS  v3.17 PS' + k + ' ' + ('00' + (i + 1)).slice(-3) + ' [' + want + '] ' + label); }
          else { fail++; __log('FAIL  v3.17 PS' + k + ' ' + ('00' + (i + 1)).slice(-3) + '  →  expected ' + want + ' | got ' + got + ' | ' + label); } } }); };
    const __end = function(note){ console.log = __log; [1, 2].forEach(function(k){ const L = PS[k]; console.log('\nPS' + k + ' n=' + L.length + ' (expected ' + (k === 1 ? 105 : 67) + ')' + (note || '')); for (let i = 0; i < L.length; i += 20) console.log('PS' + k + ' ' + ('00' + (i + 1)).slice(-3) + ': ' + L.slice(i, i + 20).join(' ')); }); if (process.env.PROBE_MAP) PSMAP.forEach(function(t){ console.log('PSMAP\t' + t); }); };
    const __wd = setTimeout(function(){ __end(' — WATCHDOG 300 s, stopped after: ' + String(PSMAP[PSMAP.length - 1] || '(seed)').slice(0, 90)); __judge(); console.log('\n' + (fail === 0 ? '✅ RULES PASSED' : '❌ RULES FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail === 0 ? 0 : 1); }, 300000);
    console.log = function(line){ __log.apply(console, arguments); try{ const t = String(line); if (!/^INFO  R[12]/.test(t)) return; let r, m;
      if (/ABORTED/.test(t)) r = '!';
      else if ((m = /: ALLOWED(?: · (\d+) docs)?$/.exec(t))) r = 'A' + (m[1] ? '/' + m[1] : '');
      else if ((m = /: DENIED · (\S+)$/.exec(t))) r = (m[1] === 'permission-denied') ? 'D' : 'X:' + m[1];
      else if ((m = /(SURVIVES|IS WIPED)/.exec(t))) r = '=' + (m[1] === 'SURVIVES' ? 'S' : 'W');
      else if ((m = / = (\S+)/.exec(t))) r = '=' + m[1];
      else r = '?';
      PS[t.charAt(7)].push(r); PSMAP.push('PS' + t.charAt(7) + ' ' + ('00' + PS[t.charAt(7)].length).slice(-3) + '\t' + t); }catch(_){ } };
    try {
    const r1 = async (label, fn) => { try { await fn(); console.log('INFO  R1 ' + label + ': ALLOWED'); return true; } catch (e) { console.log('INFO  R1 ' + label + ': DENIED · ' + (e && e.code)); return false; } };
    const r1val = async (path, field) => { let n; await env.withSecurityRulesDisabled(async (ctx) => { const d = await ctx.firestore().doc(path).get(); n = d.exists ? d.data()[field] : '(no doc)'; }); return n; };
    const R1BIG = 'x'.repeat(200000);
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc('userCityLists/userB_r1').set({ ownerId: B, cityId: 'r1', public: true, sharedWith: [], bookmarkCount: 3, copyCount: 3, viewCount: 0, splitV: 1, index: [] });
      await db.doc('userCityLists/userB_r2').set({ ownerId: B, cityId: 'r2', public: true, sharedWith: [], bookmarkCount: 0, copyCount: 0, viewCount: 0, splitV: 1, index: [] });
      await db.doc('trips/tR1').set({ ownerId: B, public: true, sharedWith: [], saveCount: 3, copyCount: 3, viewCount: 0, name: 'r1' });
      await db.doc('trips/tR2').set({ ownerId: B, public: true, sharedWith: [], saveCount: 5, copyCount: 0, viewCount: 0, name: 'r2' });
      await db.doc(`tripSaves/${A}__tR2`).set({ at: 1 });
      await db.doc('communityProfiles/curR1').set({ nickname: 'r1', hasAnyPublicContent: true, followerCount: 3, viewCount: 0 });
      await db.doc('communityProfiles/curR2').set({ nickname: 'r2', hasAnyPublicContent: true, followerCount: 0, viewCount: 0 });
      await db.doc(`follows/${A}_curR2`).set({ followerUid: A, curatorUid: 'curR2', at: 1 });
      await db.doc(`communityProfiles/${C}`).set({ nickname: 'c', hasAnyPublicContent: true, viewCount: 10, followerCount: 0 });
      await db.doc(`communityProfiles/${A}`).set({ nickname: 'a', displayName: 'Old Name', hasAnyPublicContent: false });
      await db.doc('placeFavoriteCounts/' + pf('r1x')).set({ name: 'R1', url: 'https://maps.app.goo.gl/r1x', count: 1 });
      await db.doc('trips/tR3').set({ ownerId: A, public: false, sharedWith: [], name: 'r3' });
      await db.doc('trips/tR3b').set({ ownerId: A, public: false, sharedWith: [], name: 'r3b' });
      await db.doc(`userCityLists/${A}_r3`).set({ ownerId: A, cityId: 'r3', cityName: 'R3', public: false, sharedWith: [], splitV: 1, index: [] });
      await db.doc('dailyStats/2026-11-10').set({ newSignupsToday: 1, activeToday: 1 });
      await db.doc('dailyStats/2026-11-09').set({ newSignupsToday: 1, activeToday: 1 });
      await db.doc(`users/${S}`).set({ email: 's@x', nickname: 's', suspended: true });
      await db.doc(`curatorRequests/${A}`).set({ uid: A, text: 'x', at: 1, status: 'declined' });
      await db.doc(`userLists/${B}`).set({ public: true, nickname: 'b', favoriteCount: 0, listBookmarkIds: { someone_list: true }, tripSaveIds: { someTrip: true }, following: ['someCurator'], privateCities: ['2988507'], placeBookmarks: { p1: { name: 'private note' } } });
      await db.doc('stats_lists/userB_r2').set({ open_ulist: 4, open_app: 1 });
      await db.doc('analytics/events_2026-11-11__all__r1').set({ session_depth: 2, place_open: 1 });
      for (let i = 0; i < 25; i++) await db.doc('trips/tR5_' + i).set({ ownerId: S, public: true, sharedWith: [], name: 'r5' });
      for (let i = 0; i < 21; i++) await db.doc('userCityLists/userB_q' + i).set({ ownerId: B, cityId: 'q' + i, public: false, sharedWith: [], splitV: 1, index: [] });
    });

    // --- P1/P2 · finding 3: the four bound counters, several requests, ONE account ---
    // inflate: (+1 with a new record) → (record deleted alone) → (+1 again). Hole confirmed when step 3 is ALLOWED and the final value is seed+2.
    const r1inflate = async (tag, who, rec, recData, ctr, field) => {
      const n0 = await r1val(ctr, field);
      const up = (n) => { const w = who.batch(); w.set(who.doc(rec), recData); w.update(who.doc(ctr), { [field]: n }); return w.commit(); };
      await r1(tag + ' inflate 1/3: +1 with a new record (' + n0 + '→' + (n0 + 1) + ')', () => up(n0 + 1));
      await r1(tag + ' inflate 2/3: record deleted ALONE, counter untouched', () => who.doc(rec).delete());
      await r1(tag + ' inflate 3/3: +1 AGAIN by the same user (' + (n0 + 1) + '→' + (n0 + 2) + ')', () => up(n0 + 2));
      console.log('INFO  R1 ' + tag + ' inflate: final ' + field + ' = ' + await r1val(ctr, field) + ' (seed ' + n0 + ' · seed+2 = one user counted twice)');
      await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(rec).delete(); });
    };
    // drain: (record created alone) → (−1 with that record deleted), twice. Hole confirmed when the −1 steps are ALLOWED and the final value is seed−2
    // for a user who was never counted.
    const r1drain = async (tag, who, rec, recData, ctr, field) => {
      const n0 = await r1val(ctr, field);
      const down = (n) => { const w = who.batch(); w.delete(who.doc(rec)); w.update(who.doc(ctr), { [field]: n }); return w.commit(); };
      await r1(tag + ' drain 1/4: record created ALONE, counter untouched', () => who.doc(rec).set(recData));
      await r1(tag + ' drain 2/4: -1 with that record deleted (' + n0 + '→' + (n0 - 1) + ')', () => down(n0 - 1));
      await r1(tag + ' drain 3/4: record created ALONE again', () => who.doc(rec).set(recData));
      await r1(tag + ' drain 4/4: -1 again (' + (n0 - 1) + '→' + (n0 - 2) + ')', () => down(n0 - 2));
      console.log('INFO  R1 ' + tag + ' drain: final ' + field + ' = ' + await r1val(ctr, field) + ' (seed ' + n0 + ' · seed-2 = counts of other people removed)');
    };
    await r1inflate('P1 bookmarkCount', a, `listBookmarks/${A}__userB_r1`, { at: 1 }, 'userCityLists/userB_r1', 'bookmarkCount');
    await r1drain('P2 bookmarkCount', c, `listBookmarks/${C}__userB_r1`, { at: 1 }, 'userCityLists/userB_r1', 'bookmarkCount');
    await r1inflate('P1 saveCount', a, `tripSaves/${A}__tR1`, { at: 1 }, 'trips/tR1', 'saveCount');
    await r1drain('P2 saveCount', c, `tripSaves/${C}__tR1`, { at: 1 }, 'trips/tR1', 'saveCount');
    await r1inflate('P1 followerCount', a, `follows/${A}_curR1`, { followerUid: A, curatorUid: 'curR1', at: 1 }, 'communityProfiles/curR1', 'followerCount');
    await r1drain('P2 followerCount', c, `follows/${C}_curR1`, { followerUid: C, curatorUid: 'curR1', at: 1 }, 'communityProfiles/curR1', 'followerCount');
    await r1inflate('P1 copyCount(list)', a, `copies/${A}__userB_r1`, { uid: A, kind: 'list', docKey: 'userB_r1', at: 1 }, 'userCityLists/userB_r1', 'copyCount');
    await r1drain('P2 copyCount(list)', c, `copies/${C}__userB_r1`, { uid: C, kind: 'list', docKey: 'userB_r1', at: 1 }, 'userCityLists/userB_r1', 'copyCount');
    await r1inflate('P1 copyCount(trip)', a, `copies/${A}__tR1`, { uid: A, kind: 'trip', docKey: 'tR1', at: 1 }, 'trips/tR1', 'copyCount');
    await r1drain('P2 copyCount(trip)', c, `copies/${C}__tR1`, { uid: C, kind: 'trip', docKey: 'tR1', at: 1 }, 'trips/tR1', 'copyCount');

    // --- P3 · finding 4: the same counter written twice in ONE batch (engine semantics of `resource` on the second write) ---
    await r1('P3a ONE batch: new bookmark record + bookmarkCount written twice (0→1, then →2) — ALLOWED = +2 for one record in one request', () => { const w = a.batch(); w.set(a.doc(`listBookmarks/${A}__userB_r2`), { at: 1 }); w.update(a.doc('userCityLists/userB_r2'), { bookmarkCount: 1 }); w.update(a.doc('userCityLists/userB_r2'), { bookmarkCount: 2 }); return w.commit(); });
    console.log('INFO  R1 P3a final bookmarkCount = ' + await r1val('userCityLists/userB_r2', 'bookmarkCount') + ' (2 = hole confirmed)');
    await r1('P3b ONE batch: save record deleted + saveCount written twice (5→4, then →3) — ALLOWED = -2 for one record in one request', () => { const w = a.batch(); w.delete(a.doc(`tripSaves/${A}__tR2`)); w.update(a.doc('trips/tR2'), { saveCount: 4 }); w.update(a.doc('trips/tR2'), { saveCount: 3 }); return w.commit(); });
    console.log('INFO  R1 P3b final saveCount = ' + await r1val('trips/tR2', 'saveCount') + ' (3 = hole confirmed)');
    await r1('P3c control on placeFavoriteCounts (expected DENIED: the record rule compares final state, getAfter == get + 1): record + count 1→2→3', () => { const id = pf('r1x'); const w = a.batch(); w.set(a.doc(`copies/${A}__p_${id}`), { uid: A, kind: 'place', docKey: 'p_' + id }); w.update(a.doc('placeFavoriteCounts/' + id), { count: 2 }); w.update(a.doc('placeFavoriteCounts/' + id), { count: 3 }); return w.commit(); });

    // --- P4 · finding 1: ownerId is not pinned on the owner's own update (trips, userCityLists) ---
    await r1('P4a trip owner rewrites ownerId to ANOTHER user and publishes it — ALLOWED = a document planted in B\'s account', () => a.doc('trips/tR3').update({ ownerId: B, public: true, ownerName: 'b', nickname: 'b' }));
    await r1('P4b list owner rewrites ownerId to another user', () => a.doc(`userCityLists/${A}_r3`).update({ ownerId: B, public: true, nickname: 'b', cityName: 'Injected city name' }));
    console.log('INFO  R1 P4b stored ownerId = ' + await r1val(`userCityLists/${A}_r3`, 'ownerId') + ' (userB = planted)');
    await r1('P4c the planted list comes back in B\'s OWN query (the app loads "my lists" with it)', () => b.collection('userCityLists').where('ownerId', '==', B).get().then((q) => { if (!q.docs.some((d) => d.id === A + '_r3')) throw { code: 'not-in-result' }; }));
    await r1('P4d ownerId rewritten to a uid that does not exist, public — ALLOWED = orphan public trip only the app owner can remove, invisible to a later hold of A', () => a.doc('trips/tR3b').update({ ownerId: 'ghostR1', public: true }));

    // --- P5 · finding 5: view counters ---
    await r1('P5a profile owner bumps OWN viewCount by +1 (10→11) — ALLOWED = "gap 15" is open in +1 steps', () => c.doc(`communityProfiles/${C}`).update({ viewCount: 11 }));
    await r1('P5b one visitor bumps the same trip viewCount three times in a row', async () => { for (const n of [1, 2, 3]) await a.doc('trips/tR1').update({ viewCount: n }); });

    // --- P6 · finding 7: dailyStats ---
    await r1('P6a dailyStats jump 1 → 1e9 in one update by a normal user', () => a.doc('dailyStats/2026-11-10').update({ activeToday: 1000000000, newSignupsToday: 1000000000 }));
    await r1('P6b dailyStats document with a non-date id', () => a.doc('dailyStats/2026-11-10zz').set({ activeToday: 1 }));
    await r1('P6c dailyStats written by a SUSPENDED user', () => s.doc('dailyStats/2026-11-09').update({ activeToday: 2 }));

    // --- P7 · finding 6: anonymous counters — document ids the app never produces ---
    await r1('P7a events doc for an impossible date and a made-up city number', () => guest.doc('analytics/events_9999-99-99__999__zz').set({ place_open: 50, trip_open: 50 }));
    await r1('P7b sessions doc with a junk suffix after the city', () => guest.doc('analytics/sessions_2026-11-11__all__junk1').set({ count: 50, seconds: 7200 }));
    await r1('P7c stats_lists doc with a non-date suffix on an existing list', () => guest.doc('stats_lists/userB_r1__junk1').set({ open_app: 50, copy_from: 50 }));
    await r1('P7d stats_places doc with an extra segment before the hash', () => guest.doc('stats_places/userB_r1__x__0123456789abcdef').set({ open_total: 50 }));
    await r1('P7e stats_curators doc for an id that is no account', () => guest.doc('stats_curators/' + 'Z'.repeat(28)).set({ page_view: 50, follow: 50, save: 50 }));

    // --- P8/P9 · finding 16: record ids and untyped fields ---
    await r1('P8a a second follow record for the same pair under a suffixed id', () => a.doc(`follows/${A}_curR1_x`).set({ followerUid: A, curatorUid: 'curR1' }));
    await r1('P8b a second bookmark record for the same list under a suffixed id', () => a.doc(`listBookmarks/${A}__userB_r1__x`).set({ at: 1 }));
    await r1('P8c a copy record for a target that does not exist', () => a.doc(`copies/${A}__nothing_r1`).set({ uid: A, kind: 'list', docKey: 'nothing_r1' }));
    await r1('P9a 200 KB string in listBookmarks.at', () => a.doc(`listBookmarks/${A}__userB_r1__big`).set({ at: R1BIG }));
    await r1('P9b report kind app with a map as docKey and a 200 KB at (the owner inbox loads every report)', () => a.doc('reports/rR1big').set({ by: A, kind: 'app', docKey: { blob: R1BIG }, at: R1BIG }));
    await r1('P9c 200 KB at in a follow record (delivered to the curator\'s followers query)', () => a.doc(`follows/${A}_curR1_big`).set({ followerUid: A, curatorUid: 'curR1', at: R1BIG }));

    // --- P14 · finding 13 (run before P10c re-seeds the profile): legacy displayName blocks the owner's own update ---
    await r1('P14 [DENIED = finding] profile that still holds displayName: the app\'s sync write (syncCommunityProfileFor payload)', () => a.doc(`communityProfiles/${A}`).set({ hasAnyPublicCity: true, hasAnyPublicContent: true, publicCityIds: ['2988507'], updatedAt: 1, nickname: 'a' }, { merge: true }));

    // --- P10 · finding 10: names ---
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(`communityProfiles/${A}`).set({ nickname: 'a', hasAnyPublicContent: false }); });
    await r1('P10a one account registers three nicknames', async () => { for (const n of ['r1name1', 'r1name2', 'r1name3']) await a.doc('nicknames/' + n).set({ uid: A, nickname: n }); });
    await r1('P10b nickname doc whose field differs from its key, with a 200 KB extra field (guest-readable)', () => a.doc('nicknames/r1name4').set({ uid: A, nickname: 'Someone Else', blob: R1BIG }));
    await r1('P10c profile nickname set to ANOTHER user\'s name (no link to nicknames/{key})', () => a.doc(`communityProfiles/${A}`).set({ nickname: 'b' }, { merge: true }));
    await r1('P10d own list and trip carrying another user\'s name in nickname / ownerName', async () => { await a.doc(`userCityLists/${A}_r4`).set({ ownerId: A, cityId: 'r4', public: true, sharedWith: [], splitV: 1, index: [], nickname: 'b' }); await a.doc('trips/tR4').set({ ownerId: A, public: true, sharedWith: [], ownerName: 'b', nickname: 'b' }); });

    // --- P11/P12 · findings 15 and 20 ---
    await r1('P11 suspended user deletes and re-creates own users doc with new content — ALLOWED = the v3.2 update block is bypassed', async () => { await s.doc(`users/${S}`).delete(); await s.doc(`users/${S}`).set({ email: 'forged@x', suspended: false }); });
    await r1('P12 declined curator request deleted and re-filed as pending', async () => { await a.doc(`curatorRequests/${A}`).delete(); await a.doc(`curatorRequests/${A}`).set({ uid: A, text: 'again', at: 2, status: 'pending' }); });

    // --- P13 · finding 2: userLists flagged public ---
    await r1('P13a another user GETs a userLists doc flagged public (bookmark / save / follow mirrors and the private-city index are inside)', () => a.doc(`userLists/${B}`).get().then((d) => { if (!(d.data() || {}).listBookmarkIds) throw { code: 'mirror-not-returned' }; }));
    await r1('P13b …and enumerates every such doc', () => a.collection('userLists').where('public', '==', true).get());

    // --- P15/P16 · findings 14 and 12: legitimate writes the rules refuse ---
    await r1('P15a [DENIED = finding] cumulative stats_lists doc that still holds a pre-M4.25 key: +1 on a current key', () => guest.doc('stats_lists/userB_r2').update({ open_app: 2 }));
    await r1('P15b [DENIED = finding] events doc that still holds a key removed in v3.16: +1 on a current key', () => guest.doc('analytics/events_2026-11-11__all__r1').update({ place_open: 2 }));
    await r1('P16 [DENIED = finding] unfollow as the app writes it while followerCount is already 0 (record + mirror + -1, one batch; the app has no fallback)', () => { const w = a.batch(); w.delete(a.doc(`follows/${A}_curR2`)); w.set(a.doc(`userLists/${A}`), { following: [] }, { merge: true }); w.set(a.doc('communityProfiles/curR2'), { followerCount: -1 }, { merge: true }); return w.commit(); });

    // --- P17 · note 25: the app's own list queries (no existing case measures any of them for an ordinary user) ---
    await r1('P17a [DENIED = app path broken] categories of a split list shared with me (array-contains against resource.data.get(\'sharedWith\', []))', () => a.collection('userCityListCats').where('ownerId', '==', B).where('cityId', '==', 'split').where('sharedWith', 'array-contains', A).get());
    await r1('P17b [DENIED = app path broken] public categories of another owner\'s split list', () => a.collection('userCityListCats').where('ownerId', '==', B).where('cityId', '==', 'split').where('public', '==', true).get());
    await r1('P17c [DENIED = app path broken] my own categories of one city', () => a.collection('userCityListCats').where('ownerId', '==', A).where('cityId', '==', 'r5').get());
    await r1('P17d [DENIED = app path broken] my own lists', () => a.collection('userCityLists').where('ownerId', '==', A).get());
    await r1('P17e [DENIED = app path broken] public lists (market)', () => a.collection('userCityLists').where('public', '==', true).limit(100).get());
    await r1('P17f [DENIED = app path broken] lists shared with me', () => a.collection('userCityLists').where('sharedWith', 'array-contains', A).get());
    await r1('P17g [DENIED = app path broken] another owner\'s public lists (curator page)', () => a.collection('userCityLists').where('ownerId', '==', B).where('public', '==', true).get());
    await r1('P17h [DENIED = app path broken] my own trips', () => a.collection('trips').where('ownerId', '==', A).get());
    await r1('P17i [DENIED = app path broken] trips shared with me', () => a.collection('trips').where('sharedWith', 'array-contains', A).get());
    await r1('P17j [DENIED = app path broken] public trips', () => a.collection('trips').where('public', '==', true).limit(100).get());

    // --- P18/P19 · findings 19 and 18: what an owner cannot find, what everybody can ---
    { let FP = null; try { const fb = require('firebase/compat/app'); require('firebase/compat/firestore'); FP = (fb.default || fb).firestore.FieldPath; } catch (_) { }
      if (!FP) for (const col of ['listBookmarks', 'tripSaves', 'userPrivatePlaces']) console.log('INFO  R1 P18 ' + col + ': not measured (FieldPath not available in this runner)');
      else for (const pair of [['listBookmarks', '__'], ['tripSaves', '__'], ['userPrivatePlaces', '_']]) await r1('P18 [DENIED = finding] ' + pair[0] + ': owner\'s id-range query over own prefix (without it the records are reachable only through the mirror in userLists)', () => a.collection(pair[0]).orderBy(FP.documentId()).startAt(A + pair[1]).endAt(A + pair[1] + '').get()); }
    await r1('P19a guest lists every nickname document (uid of every account)', () => guest.collection('nicknames').get());
    await r1('P19b guest lists placeIdentity (by = uid of the last confirmer, n = place name)', () => guest.collection('placeIdentity').get());
    await r1('P19c any signed-in user reads every community profile in one query (contact fields included)', () => a.collection('communityProfiles').get());
    await r1('P19d control (expected DENIED): non-owner collection read of analytics', () => a.collection('analytics').get());

    // --- P20 · note 24: document-access-call limits in the batches the app sends ---
    await r1('P20a [DENIED = hold flow breaks above ~19 docs] app owner batch of 25 trip updates (isOwner() reads settings/app for each write)', () => { const w = owner.batch(); for (let i = 0; i < 25; i++) w.update(owner.doc('trips/tR5_' + i), { suspended: true, public: false, sharedWith: [] }); return w.commit(); });
    await r1('P20b [DENIED = list save breaks above ~19 categories] user batch: parent + 25 category docs (isSuspended() for each write)', () => { const w = a.batch(); w.set(a.doc(`userCityLists/${A}_r5`), { ownerId: A, cityId: 'r5', public: false, sharedWith: [], splitV: 1, index: [] }, { merge: true }); for (let i = 0; i < 25; i++) w.set(a.doc(`userCityListCats/${A}_r5_c${i}`), { ownerId: A, cityId: 'r5', catId: 'c' + i, public: false, sharedWith: [], active: true, places: [], updatedAt: 1 }); return w.commit(); });
    await r1('P20c [DENIED = tracker batch falls back to single writes] guest batch on the stats of 21 DIFFERENT lists (one exists() each)', () => { const w = guest.batch(); for (let i = 0; i < 21; i++) w.set(guest.doc('stats_lists/userB_q' + i), { open_app: 1 }, { merge: true }); return w.commit(); });

    // --- P21 · finding 8: placeFavoriteCounts — id unrelated to its url, chosen city, count-0 leftover ---
    await r1('P21 counter created under an id unrelated to its url, for a chosen city, then released — ALLOWED = a count-0 document with that city stays for good', async () => { await pfcUp(a, A, 'r1flood', { name: 'Looks like a real place', url: 'https://example.org/not-the-hashed-url', count: 1, city: '2988507' }, true); await pfcDown(a, A, 'r1flood', { count: 0 }); });
    console.log('INFO  R1 P21 leftover count = ' + await r1val('placeFavoriteCounts/' + pf('r1flood'), 'count') + ' (0 with the doc still present = occupies a slot of the 100-doc in-city sample)');
    } catch (e) { console.log('INFO  R1 ABORTED · ' + String(e && (e.code || e.message) || e).slice(0, 120)); }
    try {
      const ok = (label, f) => info(label, f), no = ok; // داخل القسم فقط: توقّع المراجع يُقاس ولا يُحتسب
    const R2FB = (() => { try { const fb = require('firebase/compat/app'); require('firebase/compat/firestore'); return (fb.default || fb).firestore; } catch (_) { return null; } })();
    const R2FV = R2FB ? R2FB.FieldValue : null;
    const r2inc = (n, explicit) => (R2FV ? R2FV.increment(n) : explicit);          // the app sends increment(); explicit value when FieldValue is not available in the runner
    const r2del = (fallback) => (R2FV ? R2FV.delete() : fallback);
    const r2id = R2FB ? R2FB.FieldPath.documentId() : '__name__';
    const info = async (label, fn) => { try { const r = await fn(); console.log('INFO  R2 ' + label + ': ALLOWED' + (r && typeof r.size === 'number' ? ' · ' + r.size + ' docs' : '')); return true; } catch (e) { console.log('INFO  R2 ' + label + ': DENIED · ' + (e && e.code)); return false; } };
    const P = { id: 'p1', name: 'P', url: 'https://maps.app.goo.gl/p' };
    // mpData.cityLists.save as written: parent (merge, categories deleted, derived fields) + one full doc per category, one batch
    const r2Save = (who, uid, cityId, parent, cats) => () => { const id = uid + '_' + cityId; const bt = who.batch();
      bt.set(who.doc('userCityLists/' + id), Object.assign({ ownerId: uid, cityId: cityId, cityName: cityId, nickname: null, catsV: 3, splitV: 1, sharedWithNames: {}, hasTop: false, geoSources: [], flagsUsed: [], index: [] }, parent, R2FV ? { categories: R2FV.delete() } : {}), { merge: true });
      Object.keys(cats || {}).forEach((k) => bt.set(who.doc('userCityListCats/' + id + '_' + k), { ownerId: uid, cityId: cityId, catId: k, public: parent.public === true, sharedWith: parent.sharedWith || [], active: true, places: cats[k], updatedAt: 1 }));
      return bt.commit(); };
    // mpData.bookmarks.toggleList(…, false) / removeRecord and the tripSaves twins, as written
    const r2Unmark = (who, uid, recCol, srcCol, srcId, field, mirror) => () => { const bt = who.batch(); bt.delete(who.doc(recCol + '/' + uid + '__' + srcId));
      bt.set(who.doc(srcCol + '/' + srcId), { [field]: r2inc(-1, 0) }, { merge: true }); bt.set(who.doc('userLists/' + uid), { [mirror]: { [srcId]: r2del(false) } }, { merge: true }); return bt.commit(); };
    const r2RecordOnly = (who, uid, recCol, srcId, mirror) => () => { const bt = who.batch(); bt.delete(who.doc(recCol + '/' + uid + '__' + srcId)); bt.set(who.doc('userLists/' + uid), { [mirror]: { [srcId]: r2del(false) } }, { merge: true }); return bt.commit(); };

    await env.withSecurityRulesDisabled(async (ctx) => { const db = ctx.firestore();
      await db.doc(`communityProfiles/${C}`).set({ nickname: 'c', verified: true, hasAnyPublicContent: true, followerCount: 0 });
      await db.doc(`communityProfiles/${A}`).set({ nickname: 'a', displayName: 'Old shown name', hasAnyPublicContent: false });
      await db.doc('nicknames/a').set({ uid: A, nickname: 'a' }); await db.doc('nicknames/c').set({ uid: C, nickname: 'c' }); /* v3.17 (١٤): الاسم في الملف مسجَّل لصاحبه — وإلا رُفض R2-9b لسبب غير سببه */
      await db.doc(`userCityLists/${C}_r2top`).set({ ownerId: C, cityId: 'r2top', public: true, sharedWith: [], splitV: 1, index: [], hasTop: true, bookmarkCount: 0, catsV: 3 });
      await db.doc(`userCityLists/${A}_r2top`).set({ ownerId: A, cityId: 'r2top', public: false, sharedWith: [], splitV: 1, index: [], hasTop: false, bookmarkCount: 0, catsV: 3 });
      await db.doc(`userCityLists/${A}_r2top2`).set({ ownerId: A, cityId: 'r2top2', public: true, sharedWith: [], splitV: 1, index: [], hasTop: false, bookmarkCount: 0, catsV: 3 });
      await db.doc('trips/r2trip').set({ ownerId: A, public: true, sharedWith: [], title: 'T', viewCount: 3, saveCount: 0, copyCount: 0 });
      await db.doc(`userCityLists/${A}_r2bm`).set({ ownerId: A, cityId: 'r2bm', public: true, sharedWith: [], splitV: 1, index: [], bookmarkCount: 0, catsV: 3 });
      await db.doc(`userCityLists/${A}_r2nobm`).set({ ownerId: A, cityId: 'r2nobm', public: false, sharedWith: [], splitV: 1, index: [], catsV: 3 }); // legacy: never had bookmarkCount
      await db.doc(`userCityLists/${B}_r2gone`).set({ ownerId: B, cityId: 'r2gone', public: false, sharedWith: [], bookmarkCount: 1 });        // was public when A bookmarked it
      await db.doc(`listBookmarks/${A}__${B}_r2gone`).set({ at: 1 });
      await db.doc(`listBookmarks/${A}__${B}_r2none`).set({ at: 1 });                                                                          // its list was deleted
      await db.doc(`userCityLists/${B}_r2pub`).set({ ownerId: B, cityId: 'r2pub', public: true, sharedWith: [], bookmarkCount: 1 });
      await db.doc(`listBookmarks/${S}__${B}_r2pub`).set({ at: 1 });
      await db.doc('trips/r2tgone').set({ ownerId: B, public: false, sharedWith: [], saveCount: 1 });
      await db.doc(`tripSaves/${A}__r2tgone`).set({ at: 1 });
      await db.doc(`curatorCityNotes/${A}__r2city`).set({ uid: A, cityId: 'r2city', text: 'left behind' });
      await db.doc(`userCityLists/${B}_r2q`).set({ ownerId: B, cityId: 'r2q', public: false, sharedWith: [A], splitV: 1, index: [{ id: 'p1', name: 'P', catId: 'coffee' }] });
      await db.doc(`userCityListCats/${B}_r2q_coffee`).set({ ownerId: B, cityId: 'r2q', catId: 'coffee', public: false, sharedWith: [A], active: true, places: [P] });
      await db.doc(`userCityLists/${B}_r2qp`).set({ ownerId: B, cityId: 'r2qp', public: true, sharedWith: [], splitV: 1, index: [{ id: 'p1', name: 'P', catId: 'coffee' }] });
      await db.doc(`userCityListCats/${B}_r2qp_coffee`).set({ ownerId: B, cityId: 'r2qp', catId: 'coffee', public: true, sharedWith: [], active: true, places: [P] });
      await db.doc(`userCityLists/${A}_r2leg`).set({ ownerId: A, cityId: 'r2leg', public: true, sharedWith: [], bookmarkCount: 0, categories: { coffee: { active: true, places: [P] }, personal_home: { active: true, places: [{ name: 'Home' }] } } });
      await db.doc(`follows/${A}_${C}`).set({ followerUid: A, curatorUid: C, at: 1 });                                                        // followed while C had no counter
      await db.doc(`follows/${S}_${C}`).set({ followerUid: S, curatorUid: C, at: 1 });
      await db.doc('trips/r2tc').set({ ownerId: B, public: true, sharedWith: [], copyCount: 1 });
      await db.doc(`copies/${A}__r2tc`).set({ uid: A, kind: 'trip', docKey: 'r2tc', at: 1 });
      await db.doc(`curatorRequests/${A}`).set({ uid: A, text: 'x', at: 1, status: 'declined' });
      await db.doc(`userPrivatePlaces/${A}_r2addr`).set({ categories: { personal_home: { active: true, places: [{ name: 'Home' }] }, personal_work: { active: true, places: [{ name: 'Work' }] } } });
      for (let i = 0; i < 12; i++) await db.doc(`userCityLists/${A}_r2n${i}`).set({ ownerId: A, cityId: 'r2n' + i, public: false, sharedWith: [], splitV: 1, index: [], bookmarkCount: 0 });
    });

    // --- F1 · Top ★ (plToggleTopRow → saveMyCityList → listDerived ⇒ hasTop:true) ---
    await no('R2-1a Top place saved by a NON-verified owner (app batch, hasTop derived true) deny', r2Save(a, A, 'r2top', { public: false, sharedWith: [], bookmarkCount: 0, hasTop: true, index: [{ id: 'p1', name: 'P', catId: 'coffee', top: true }] }, { coffee: [Object.assign({ topPlace: true }, P)] }));
    await no('R2-1b verified curator makes a PUBLIC list holding a Top place PRIVATE deny (cannot un-publish)', r2Save(c, C, 'r2top', { public: false, sharedWith: [], bookmarkCount: 0, hasTop: true }, {}));
    await ok('R2-1c control: verified curator, public list, hasTop true allow', r2Save(c, C, 'r2top', { public: true, sharedWith: [], bookmarkCount: 0, hasTop: true }, { coffee: [Object.assign({ topPlace: true }, P)] }));
    await no('R2-1d Top place saved by a NON-verified owner on a PUBLIC list deny (isolates verification from privacy)', r2Save(a, A, 'r2top2', { public: true, sharedWith: [], bookmarkCount: 0, hasTop: true, index: [{ id: 'p1', name: 'P', catId: 'coffee', top: true }] }, { coffee: [Object.assign({ topPlace: true }, P)] }));

    // --- F2 · owner saves re-send counters as loaded ---
    await ok('R2-2a visitor view bump as the app writes it (trips.bumpView)', () => b.doc('trips/r2trip').set({ viewCount: r2inc(1, 4) }, { merge: true }));
    await no('R2-2b owner saves the trip object loaded BEFORE that view (viewCount 3) deny', () => a.doc('trips/r2trip').set({ id: 'r2trip', __saved: true, ownerId: A, public: true, sharedWith: [], title: 'T edited', viewCount: 3, saveCount: 0, copyCount: 0 }, { merge: true }));
    await no('R2-2c owner makes that trip PRIVATE with the same stale object deny (toast still says private)', () => a.doc('trips/r2trip').set({ id: 'r2trip', __saved: true, ownerId: A, public: false, sharedWith: [], title: 'T', viewCount: 3, saveCount: 0, copyCount: 0 }, { merge: true }));
    await ok('R2-2d control: same save carrying the current viewCount allow', () => a.doc('trips/r2trip').set({ id: 'r2trip', __saved: true, ownerId: A, public: true, sharedWith: [], title: 'T edited', viewCount: 4, saveCount: 0, copyCount: 0 }, { merge: true }));
    await ok('R2-2e another user bookmarks the list (record + counter + mirror)', () => { const bt = c.batch(); bt.set(c.doc(`listBookmarks/${C}__${A}_r2bm`), { at: 1 }); bt.set(c.doc(`userCityLists/${A}_r2bm`), { bookmarkCount: r2inc(1, 1) }, { merge: true }); bt.set(c.doc(`userLists/${C}`), { listBookmarkIds: { [`${A}_r2bm`]: true } }, { merge: true }); return bt.commit(); });
    await no('R2-2f list owner saves with bookmarkCount as loaded (0) deny', r2Save(a, A, 'r2bm', { public: true, sharedWith: [], bookmarkCount: 0 }, { coffee: [P] }));
    await no('R2-2g list owner save ADDS bookmarkCount:0 to a doc that never had the field deny (affectedKeys counts an added key)', r2Save(a, A, 'r2nobm', { public: false, sharedWith: [], bookmarkCount: 0 }, { coffee: [P] }));

    // --- F3 · cmUndoLast re-creates a deleted list from its old document (cmMetaOf keeps counters) ---
    await no('R2-3a undo-merge re-create with the old viewCount (2) deny ⇒ merged city is not restored', r2Save(a, A, 'r2undo', { public: true, sharedWith: [], bookmarkCount: 0, viewCount: 2, copyCount: 0, index: [{ id: 'p1', name: 'P', catId: 'coffee' }] }, { coffee: [P] }));
    await ok('R2-3b control: same re-create without counters allow', r2Save(a, A, 'r2undo', { public: true, sharedWith: [], bookmarkCount: 0, index: [{ id: 'p1', name: 'P', catId: 'coffee' }] }, { coffee: [P] }));

    // --- F5 · un-bookmark / un-save when the source is private or gone, or the user is suspended ---
    await no('R2-5a un-bookmark batch on a list that became private deny (the app swallows this as "floor")', r2Unmark(a, A, 'listBookmarks', 'userCityLists', `${B}_r2gone`, 'bookmarkCount', 'listBookmarkIds'));
    await no('R2-5b un-bookmark batch on a DELETED list deny (set-merge = create of another user\'s list)', r2Unmark(a, A, 'listBookmarks', 'userCityLists', `${B}_r2none`, 'bookmarkCount', 'listBookmarkIds'));
    await no('R2-5c un-save batch on a trip that became private deny', r2Unmark(a, A, 'tripSaves', 'trips', 'r2tgone', 'saveCount', 'tripSaveIds'));
    await ok('R2-5d record + mirror alone allow (removeRecord — the fallback the app never reaches)', r2RecordOnly(a, A, 'listBookmarks', `${B}_r2gone`, 'listBookmarkIds'));
    await no('R2-5e un-bookmark batch by a SUSPENDED user on a public list deny', r2Unmark(s, S, 'listBookmarks', 'userCityLists', `${B}_r2pub`, 'bookmarkCount', 'listBookmarkIds'));
    await no('R2-5f removeRecord by a SUSPENDED user deny (the userLists mirror write)', r2RecordOnly(s, S, 'listBookmarks', `${B}_r2pub`, 'listBookmarkIds'));
    await ok('R2-5g suspended user deletes the record alone allow (the only shape the rules accept)', () => s.doc(`listBookmarks/${S}__${B}_r2pub`).delete());

    // --- F4 · account deletion: what the cascade could delete but does not ---
    await ok('R2-4a curatorCityNotes delete by the uid in the id (no verified needed) allow — never called by doAccountDelete', () => a.doc(`curatorCityNotes/${A}__r2city`).delete());
    await info('R2-4b own category docs by ownerId alone (finds orphans the per-city cascade misses)', () => a.collection('userCityListCats').where('ownerId', '==', A).get());

    // --- F7 / inventory · the app's exact queries ---
    await info('R2-7a cats of a list SHARED with me: ownerId + cityId + sharedWith array-contains (rule: resource.data.get(\'sharedWith\', []))', () => a.collection('userCityListCats').where('ownerId', '==', B).where('cityId', '==', 'r2q').where('sharedWith', 'array-contains', A).get());
    await info('R2-7b cats of a PUBLIC list: ownerId + cityId + public == true', () => a.collection('userCityListCats').where('ownerId', '==', B).where('cityId', '==', 'r2qp').where('public', '==', true).get());
    await info('R2-7c my own cats: ownerId + cityId', () => b.collection('userCityListCats').where('ownerId', '==', B).where('cityId', '==', 'r2q').get());
    await no('R2-7d cats of another user with no visibility constraint deny', () => a.collection('userCityListCats').where('ownerId', '==', B).where('cityId', '==', 'r2qp').get());
    await info('R2-7e app owner: all cats of one account (holdAll)', () => owner.collection('userCityListCats').where('ownerId', '==', B).get());
    await info('R2-7f lists shared with me (cityLists.sharedWith)', () => a.collection('userCityLists').where('sharedWith', 'array-contains', A).get());
    await info('R2-7g public lists, limit 100 (cityLists.publicLists)', () => a.collection('userCityLists').where('public', '==', true).limit(100).get());
    await info('R2-7h my own lists (cityLists.byOwner)', () => a.collection('userCityLists').where('ownerId', '==', A).get());
    await info('R2-7i public lists of one person (cityLists.publicByOwner)', () => a.collection('userCityLists').where('ownerId', '==', B).where('public', '==', true).get());
    await info('R2-7j my own trips (trips.byOwner)', () => a.collection('trips').where('ownerId', '==', A).get());
    await info('R2-7k trips shared with me (trips.sharedWith)', () => a.collection('trips').where('sharedWith', 'array-contains', A).get());
    await info('R2-7l public trips, limit 100 (trips.publicTrips)', () => a.collection('trips').where('public', '==', true).limit(100).get());
    await info('R2-7m public trips of one person (trips.publicByOwner)', () => a.collection('trips').where('ownerId', '==', B).where('public', '==', true).get());
    await info('R2-7n curators directory (profiles.curators)', () => a.collection('communityProfiles').where('verified', '==', true).limit(200).get());
    await no('R2-7o GUEST opens Community: profiles with public content deny', () => guest.collection('communityProfiles').where('hasAnyPublicContent', '==', true).get());
    await no('R2-7p GUEST opens Community: public lists deny', () => guest.collection('userCityLists').where('public', '==', true).limit(100).get());
    await info('R2-7q GUEST: Popular-in-city counters (placeCounts.inCity)', () => guest.collection('placeFavoriteCounts').where('city', '==', '2988507').limit(100).get());
    await info('R2-7r app owner: analytics range on document id (analytics.range)', () => owner.collection('analytics').orderBy(r2id).startAt('events_2026-10-01').endAt('events_2026-10-31').limit(200).get());
    await info('R2-7s ordinary user: the same analytics range (expected DENIED)', () => a.collection('analytics').orderBy(r2id).startAt('events_2026-10-01').endAt('events_2026-10-31').limit(200).get());
    await info('R2-7t app owner: dailyStats range (dailyStats.range)', () => owner.collection('dailyStats').orderBy(r2id).startAt('2026-08-01').endAt('2026-08-31').limit(40).get());
    await info('R2-7u app owner: stats_lists page of ids (stats.pageIds)', () => owner.collection('stats_lists').orderBy(r2id).limit(100).get());
    await info('R2-7v app owner: whole collections (suspensions · curatorRequests · reports)', async () => { await owner.collection('suspensions').get(); await owner.collection('curatorRequests').get(); return owner.collection('reports').get(); });

    // --- F8 · report a problem: prefix + text, sliced at 260 ---
    await no('R2-8a app report with the app prefix + a 200-character description (reason 248 > 200) deny', () => a.doc('reports/r_r2_1').set({ by: A, kind: 'app', reason: '[Something broke · Community · 2026-11-11-r117] ' + 'x'.repeat(200), at: 1 }));
    await ok('R2-8b reason of exactly 200 allow', () => a.doc('reports/r_r2_2').set({ by: A, kind: 'app', reason: 'x'.repeat(200), at: 1 }));
    await info('R2-8c reason of 200 Arabic letters (does size() count characters or bytes?)', () => a.doc('reports/r_r2_3').set({ by: A, kind: 'app', reason: 'ع'.repeat(200), at: 1 }));

    // --- F9 · legacy community profile still carrying displayName ---
    await no('R2-9a syncCommunityProfile payload on a profile that still has displayName deny (silent in the app)', () => a.doc(`communityProfiles/${A}`).set({ hasAnyPublicCity: true, hasAnyPublicContent: true, publicCityIds: ['2988507'], updatedAt: 1, nickname: 'a' }, { merge: true }));
    if (!R2FV) console.log('INFO  R2 R2-9b: not measured (FieldValue not available in this runner)'); else await ok('R2-9b same payload also deleting displayName allow', () => a.doc(`communityProfiles/${A}`).set({ hasAnyPublicCity: true, hasAnyPublicContent: true, publicCityIds: ['2988507'], updatedAt: 1, nickname: 'a', displayName: R2FV.delete() }, { merge: true }));

    // --- F10 · deletes of documents that do not exist (rule reads resource.data) ---
    await no('R2-10a delete of a category doc that does not exist deny (first op of dropCategoryKeys on a never-split legacy list)', () => a.doc(`userCityListCats/${A}_r2top_ghostcat`).delete());
    await no('R2-10b delete of a list parent that does not exist deny ("Clear my list (0)" · cityLists.remove)', () => a.doc(`userCityLists/${A}_r2ghost`).delete());
    await no('R2-10c delete of a trip that does not exist deny', () => a.doc('trips/r2ghosttrip').delete());

    // --- F11 · legacy parent with private keys: cityLists.removeKeys ---
    if (!R2FV) console.log('INFO  R2 R2-11a: not measured (FieldValue not available in this runner)'); else await no('R2-11a removeKeys: update categories.personal_home → delete on a legacy parent deny', () => a.doc(`userCityLists/${A}_r2leg`).update({ 'categories.personal_home': R2FV.delete() }));
    if (!R2FV) console.log('INFO  R2 R2-11b: not measured (FieldValue not available in this runner)'); else await ok('R2-11b dropping the whole categories field allow (what the next full save does)', () => a.doc(`userCityLists/${A}_r2leg`).update({ categories: R2FV.delete() }));

    // --- F13/F14 · follows ---
    if (!R2FB) console.log('INFO  R2 R2-14a: not measured (FieldValue not available in this runner)'); else await no('R2-14a unfollow batch with the counter at 0 deny (follow was recorded without a counter; curator verified since)', () => { const bt = a.batch(); bt.delete(a.doc(`follows/${A}_${C}`)); bt.set(a.doc(`userLists/${A}`), { following: R2FV.arrayRemove(C) }, { merge: true }); bt.set(a.doc(`communityProfiles/${C}`), { followerCount: R2FV.increment(-1) }, { merge: true }); return bt.commit(); });
    if (!R2FB) console.log('INFO  R2 R2-13a: not measured (FieldValue not available in this runner)'); else await no('R2-13a unfollow batch by a SUSPENDED user deny (userLists write) — rules allow only the bare record delete', () => { const bt = s.batch(); bt.delete(s.doc(`follows/${S}_${C}`)); bt.set(s.doc(`userLists/${S}`), { following: R2FV.arrayRemove(C) }, { merge: true }); return bt.commit(); });

    // --- F15 · copies.record on a record that already exists ---
    await no('R2-15 copy a trip again after deleting my copy the ordinary way (record still there ⇒ update:false) deny', () => { const bt = a.batch(); bt.set(a.doc(`copies/${A}__r2tc`), { uid: A, kind: 'trip', docKey: 'r2tc', at: 2 }); bt.set(a.doc('trips/r2tc'), { copyCount: r2inc(1, 2) }, { merge: true }); return bt.commit(); });

    // --- F17 · curator request after a decline ---
    await no('R2-17 second curator request while the declined one exists (set = update, owner-only) deny', () => a.doc(`curatorRequests/${A}`).set({ uid: A, text: 'again', at: 2, status: 'pending' }));

    // --- F6/F16 · shapes the rules accept and the readers do not survive ---
    await ok('R2-6a public list parent with index:[null] accepted (mpData.cityLists._fromIndex throws for every reader of the market)', () => a.doc(`userCityLists/${A}_r2evil1`).set({ ownerId: A, cityId: 'r2evil1', public: true, sharedWith: [], splitV: 1, index: [null] }));
    await ok('R2-6b public list parent with nickname:5 accepted (cmGroupByOwner → curInitials → .trim throws)', () => a.doc(`userCityLists/${A}_r2evil2`).set({ ownerId: A, cityId: 'r2evil2', public: true, sharedWith: [], splitV: 1, nickname: 5, index: [{ id: 'p1', name: 'P', catId: 'coffee' }] }));
    await ok('R2-6c public trip with ownerName:5 and plan.days:[{}] accepted (tripMetaLine → tripDayEntries throws)', () => a.doc('trips/r2evil').set({ ownerId: A, public: true, sharedWith: [], ownerName: 5, plan: { days: [{}] } }));
    await ok('R2-16a category doc whose place has picks:5 · flags:7 · geo.source:"evil" accepted', () => a.doc(`userCityListCats/${A}_r2evil2_coffee`).set({ ownerId: A, cityId: 'r2evil2', catId: 'coffee', public: true, sharedWith: [], active: true, places: [{ id: 'p1', name: 'P', url: 'https://maps.app.goo.gl/p', picks: 5, flags: 7, geo: { lat: 1, lng: 1, source: 'evil' } }], updatedAt: 1 }));
    await ok('R2-16b placeIdentity record written by one user is overwritten by another, far away, accepted', async () => { await a.doc('placeIdentity/kpr2x').set({ lat: 48.85, lng: 2.35, source: 'user_pin', n: 'Cafe', cityId: '2988507', by: A, at: 1 }); await b.doc('placeIdentity/kpr2x').set({ lat: -33.9, lng: 151.2, source: 'overture', openId: 'ovt:x', n: 'Cafe', cityId: '2988507', by: B, at: 2 }); });

    // --- F19 · document-access calls in one batch (same documents read by every write) ---
    await info('R2-19a full save: parent + 25 category docs in one batch', r2Save(a, A, 'r2big', { public: false, sharedWith: [], bookmarkCount: 0 }, Object.fromEntries(Array.from({ length: 25 }, (_, i) => ['cat' + i, [P]]))));
    await info('R2-19b the same 26 documents again (now updates: isOwner() + isSuspended() per write)', r2Save(a, A, 'r2big', { public: false, sharedWith: [], bookmarkCount: 0 }, Object.fromEntries(Array.from({ length: 25 }, (_, i) => ['cat' + i, [P]]))));
    await info('R2-19c setNicknameAll: 12 own list parents updated in one batch', () => { const bt = a.batch(); for (let i = 0; i < 12; i++) bt.update(a.doc(`userCityLists/${A}_r2n${i}`), { nickname: 'a2' }); return bt.commit(); });

    // --- F18 · not a rules question: what set({categories:{}},{merge:true}) does to the other categories (privatePlaces.setCategory) ---
    try { let d = {}; await env.withSecurityRulesDisabled(async (ctx) => { const ref = ctx.firestore().doc(`userPrivatePlaces/${A}_r2addr`); await ref.set({ categories: {}, updatedAt: 1 }, { merge: true }); await ref.update({ 'categories.personal_work': { active: true, places: [{ name: 'Work 2' }] }, updatedAt: 2 }); d = (await ref.get()).data() || {}; });
      console.log('INFO  R2-18 setCategory as the app writes it (rules disabled: SDK merge semantics) — the untouched category personal_home: ' + ((d.categories && d.categories.personal_home) ? 'SURVIVES' : 'IS WIPED')); } catch (e) { console.log('INFO  R2-18 setCategory probe: DENIED · ' + (e && e.code)); }
    } catch (e) { console.log('INFO  R2 ABORTED · ' + String(e && (e.code || e.message) || e).slice(0, 120)); }
    clearTimeout(__wd); __end(''); __judge();
  }

  // ================= ٣٢) v3.17 — حالات النص الجديد (١٢ نوفمبر ٢٠٢٦ · ق١١-١٢-٠٥) =================
  // ما لا تغطيه قياسات القسم ٣١: المسارات المشروعة تحت القواعد الجديدة (كما يكتبها التطبيق بعد الإصلاح) وحدود كل شرط جديد.
  // ثلاثة أشياء تُقاس هنا لأول مرة في قواعدنا: math.abs (الهوية) · is timestamp مع serverTimestamp (السجلات) · تحويل الحروف lower() للأسماء (قرار ٣-٤).
  { const X = 'userX17', Y = 'userY17', Z = 'userZ17', W = 'userW17', NN = 'userN17';
    const x = env.authenticatedContext(X).firestore(), y = env.authenticatedContext(Y).firestore(), z = env.authenticatedContext(Z).firestore(), w = env.authenticatedContext(W).firestore();
    let FV17 = null; try { const fb = require('firebase/compat/app'); require('firebase/compat/firestore'); FV17 = (fb.default || fb).firestore.FieldValue; } catch (_) { }
    const inc17 = (n, explicit) => (FV17 ? FV17.increment(n) : explicit); const ts17 = () => (FV17 ? FV17.serverTimestamp() : 1);
    const NOW = Date.now(), DAYMS = 86400000;
    const LQ = `${Y}_q17`, LP = `${Y}_p17`, LG = `${Y}_g17`, LZ = `${Y}_z17`;
    await env.withSecurityRulesDisabled(async (ctx) => { const db = ctx.firestore();
      await db.doc(`userCityLists/${LP}`).set({ ownerId: Y, cityId: 'p17', public: true, sharedWith: [], bookmarkCount: 0, copyCount: 0, viewCount: 0, splitV: 1, index: [] });
      await db.doc(`userCityLists/${LQ}`).set({ ownerId: Y, cityId: 'q17', public: true, sharedWith: [], bookmarkCount: 2, copyCount: 2, viewCount: 0, splitV: 1, index: [] });
      await db.doc(`userCityLists/${LG}`).set({ ownerId: Y, cityId: 'g17', public: false, sharedWith: [], bookmarkCount: 1, splitV: 1, index: [] }); // كانت عامة حين وُضعت المفكرة
      await db.doc(`userCityLists/${LZ}`).set({ ownerId: Y, cityId: 'z17', public: true, sharedWith: [], bookmarkCount: 0, splitV: 1, index: [] });
      await db.doc(`listBookmarks/${X}__${LQ}`).set({ at: 1 }); await db.doc(`listBookmarks/${X}__${LG}`).set({ at: 1 }); await db.doc(`listBookmarks/${X}__${Y}_gone17`).set({ at: 1 }); await db.doc(`listBookmarks/${X}__${LZ}`).set({ at: 1 });
      await db.doc(`copies/${X}__${LQ}`).set({ uid: X, kind: 'list', docKey: LQ, at: 1 });
      await db.doc('trips/t17').set({ ownerId: Y, public: true, sharedWith: [], saveCount: 2, copyCount: 2, viewCount: 0, title: 'T' });
      await db.doc(`tripSaves/${X}__t17`).set({ at: 1 }); await db.doc(`copies/${X}__t17`).set({ uid: X, kind: 'trip', docKey: 't17', at: 1 });
      await db.doc(`communityProfiles/${Y}`).set({ hasAnyPublicContent: true, followerCount: 2, viewCount: 0 });
      await db.doc(`communityProfiles/${X}`).set({ hasAnyPublicContent: false });
      await db.doc(`communityProfiles/${NN}`).set({ hasAnyPublicContent: false }); // لا محتوى عامًّا ولا توثيق — لا عدّاد له يُحرَّك
      await db.doc(`follows/${X}_${Y}`).set({ followerUid: X, curatorUid: Y, at: 1 });
      await db.doc('nicknames/x17name').set({ uid: X, nickname: 'X17name' }); await db.doc('nicknames/y17name').set({ uid: Y, nickname: 'Y17name' });
      for (const nm of ['سارة', 'Émile', 'Abu Ali Jr.', "O'Neil", 'İbrahim', 'ΝΙΚΟΣ']) await db.doc('nicknames/' + nm.toLowerCase()).set({ uid: X, nickname: nm }); /* المفتاح كما يبنيه التطبيق: toLowerCase */
      await db.doc(`curatorRequests/${X}`).set({ uid: X, text: 'x', at: NOW - 8 * DAYMS, status: 'declined' });
      await db.doc(`curatorRequests/${Y}`).set({ uid: Y, text: 'x', at: NOW - 2 * DAYMS, status: 'declined' });
      await db.doc(`curatorRequests/${W}`).set({ uid: W, text: 'x', at: NOW - 8 * DAYMS, status: 'declined' });
      await db.doc('placeIdentity/k17').set({ lat: 48.85, lng: 2.35, source: 'user_pin', by: Y, at: 1 });
      await db.doc('reports/r17x').set({ by: X, kind: 'app', reason: 'x', at: 1 });
      await db.doc(`suspensions/${Z}`).set({ at: 1, by: OWNER, email: 'z@x' }); await db.doc(`listBookmarks/${Z}__${LQ}`).set({ at: 1 });
      await db.doc('dailyStats/2026-08-20').set({ newSignupsToday: 1, activeToday: 1 });
    });

    // --- (١١) المفكرة: السجل وعدّاده معًا — كما يكتبها التطبيق (السجل بـserverTimestamp · العدّاد بـincrement · المرآة) ---
    const bm17 = (who, uid, listId, on, explicit) => () => { const bt = who.batch(); const rec = who.doc(`listBookmarks/${uid}__${listId}`);
      if (on) bt.set(rec, { at: ts17() }); else bt.delete(rec);
      bt.set(who.doc(`userCityLists/${listId}`), { bookmarkCount: inc17(on ? 1 : -1, explicit) }, { merge: true });
      bt.set(who.doc(`userLists/${uid}`), { listBookmarkIds: { [listId]: on } }, { merge: true }); return bt.commit(); };
    await ok('v3.17 bookmark as the app writes it (record with serverTimestamp + increment(1) + mirror) allow', bm17(x, X, LP, true, 1));
    await no('v3.17 bookmark a second time (record already there) deny', bm17(x, X, LP, true, 2));
    await ok('v3.17 un-bookmark as the app writes it (record delete + increment(-1) + mirror) allow', bm17(x, X, LP, false, 0));
    await no('v3.17 bookmark record created ALONE deny', () => x.doc(`listBookmarks/${X}__${LP}`).set({ at: 1 }));
    await no('v3.17 bookmark record deleted ALONE while counted (public, count 2) deny', () => x.doc(`listBookmarks/${X}__${LQ}`).delete());
    await ok('v3.17 bookmark record deleted ALONE: the list went private allow', () => x.doc(`listBookmarks/${X}__${LG}`).delete());
    await ok('v3.17 bookmark record deleted ALONE: the list was deleted allow', () => x.doc(`listBookmarks/${X}__${Y}_gone17`).delete());
    await ok('v3.17 bookmark record deleted ALONE: the counter is at 0 allow', () => x.doc(`listBookmarks/${X}__${LZ}`).delete());
    await ok('v3.17 bookmark record deleted ALONE by a SUSPENDED user (withdrawal) allow', () => z.doc(`listBookmarks/${Z}__${LQ}`).delete());
    await no('v3.17 bookmark record with a string in `at` deny (typed field)', () => { const bt = x.batch(); bt.set(x.doc(`listBookmarks/${X}__${LZ}`), { at: 'now' }); bt.set(x.doc(`userCityLists/${LZ}`), { bookmarkCount: 1 }, { merge: true }); return bt.commit(); });

    // --- (١١) حفظ الرحلة ---
    const ts17b = (who, uid, on, explicit) => () => { const bt = who.batch(); const rec = who.doc(`tripSaves/${uid}__t17`); if (on) bt.set(rec, { at: ts17() }); else bt.delete(rec);
      bt.set(who.doc('trips/t17'), { saveCount: inc17(on ? 1 : -1, explicit) }, { merge: true }); return bt.commit(); };
    await ok('v3.17 trip save (record + increment(1)) allow', ts17b(c, C, true, 3));
    await no('v3.17 trip-save record deleted ALONE while counted deny', () => c.doc(`tripSaves/${C}__t17`).delete());
    await ok('v3.17 trip un-save (record delete + increment(-1)) allow', ts17b(c, C, false, 2));
    await no('v3.17 a seeded trip-save record deleted ALONE while counted deny', () => x.doc(`tripSaves/${X}__t17`).delete());

    // --- (١١) النسخ: قائمة ورحلة مربوطتان · سجل نسخ المكان المفرد حرّ ---
    const cp17 = (who, uid, on, explicit) => () => { const bt = who.batch(); const rec = who.doc(`copies/${uid}__${LQ}`); if (on) bt.set(rec, { uid: uid, kind: 'list', docKey: LQ, at: ts17() }); else bt.delete(rec);
      bt.set(who.doc(`userCityLists/${LQ}`), { copyCount: inc17(on ? 1 : -1, explicit) }, { merge: true }); return bt.commit(); };
    await ok('v3.17 list copy (record + increment(1)) allow', cp17(c, C, true, 3));
    await no('v3.17 list-copy record deleted ALONE while counted deny', () => c.doc(`copies/${C}__${LQ}`).delete());
    await ok('v3.17 list copy removed (record delete + increment(-1)) allow', cp17(c, C, false, 2));
    await no('v3.17 trip-copy record created ALONE deny', () => c.doc(`copies/${C}__t17`).set({ uid: C, kind: 'trip', docKey: 't17' }));
    await no('v3.17 a seeded list-copy record deleted ALONE while counted deny', () => x.doc(`copies/${X}__${LQ}`).delete());
    await ok('v3.17 single-place attribution record (kind place, no counter) created alone allow', () => c.doc(`copies/${C}__${LQ}:coffee:p1`).set({ uid: C, kind: 'place', docKey: `${LQ}:coffee:p1`, at: ts17() }));
    await ok('v3.17 single-place attribution record deleted alone allow', () => c.doc(`copies/${C}__${LQ}:coffee:p1`).delete());

    // --- (١١ · ق٣-١) المتابعة ---
    const fl17 = (who, uid, cur, on, explicit, counter) => () => { const bt = who.batch(); const rec = who.doc(`follows/${uid}_${cur}`); if (on) bt.set(rec, { followerUid: uid, curatorUid: cur, at: ts17() }); else bt.delete(rec);
      bt.set(who.doc(`userLists/${uid}`), { following: on ? [cur] : [] }, { merge: true });
      if (counter !== false) bt.set(who.doc(`communityProfiles/${cur}`), { followerCount: inc17(on ? 1 : -1, explicit) }, { merge: true }); return bt.commit(); };
    await ok('v3.17 follow as the app writes it (record + mirror + increment(1)) allow', fl17(c, C, Y, true, 3));
    await no('v3.17 follow record deleted ALONE while counted deny', () => c.doc(`follows/${C}_${Y}`).delete());
    await ok('v3.17 unfollow (record delete + mirror + increment(-1)) allow', fl17(c, C, Y, false, 2));
    await no('v3.17 follow of a profile with no public content and not verified deny (ق٣-١ — no counter to move)', fl17(c, C, NN, true, 1, false));
    await no('v3.17 a seeded follow record deleted ALONE while counted deny', () => x.doc(`follows/${X}_${Y}`).delete());
    await ok('v3.17 a seeded follow released with its counter (record delete + mirror + increment(-1)) allow', fl17(x, X, Y, false, 1));

    // --- (٣) مشاهدات الملف ---
    await no('v3.17 profile owner bumps OWN viewCount by +1 deny', () => y.doc(`communityProfiles/${Y}`).update({ viewCount: 1 }));
    await ok('v3.17 a visitor bumps the profile viewCount by +1 allow', () => x.doc(`communityProfiles/${Y}`).update({ viewCount: 1 }));

    // --- (١) حقل المالك ---
    await no('v3.17 trip owner rewrites ownerId deny', () => y.doc('trips/t17').update({ ownerId: X }));
    await ok('v3.17 trip owner edits the title (ownerId untouched) allow', () => y.doc('trips/t17').update({ title: 'T2' }));
    await no('v3.17 list owner rewrites ownerId deny', () => y.doc(`userCityLists/${LP}`).update({ ownerId: X }));
    await ok('v3.17 list owner edits cityName (ownerId untouched) allow', () => y.doc(`userCityLists/${LP}`).update({ cityName: 'P' }));

    // --- (٧) أنواع الحقول المعروضة ---
    const L17 = (id, extra) => () => x.doc(`userCityLists/${X}_${id}`).set(Object.assign({ ownerId: X, cityId: id, public: false, sharedWith: [], splitV: 1, index: [] }, extra));
    await no('v3.17 list create with a number in cityName deny', L17('c1', { cityName: 5 }));
    await no('v3.17 list create with a string in public deny', L17('c1', { public: 'yes' }));
    await no('v3.17 list create with a number in nickname deny', L17('c1', { nickname: 5 }));
    await no('v3.17 list create with a map in sharedWith deny', L17('c1', { sharedWith: { a: 1 } }));
    await ok('v3.17 list create with nickname null and a text cityName allow (what the app sends)', L17('c1', { nickname: null, cityName: 'C1' }));
    await no('v3.17 trip create with a number in title deny', () => x.doc('trips/t17x').set({ ownerId: X, public: false, sharedWith: [], title: 5 }));
    await no('v3.17 trip create with a string in plan deny', () => x.doc('trips/t17x').set({ ownerId: X, public: false, sharedWith: [], plan: 'x' }));
    await ok('v3.17 trip create with title text, plan null, cities list allow', () => x.doc('trips/t17x').set({ ownerId: X, public: false, sharedWith: [], title: 'ok', plan: null, cities: [] }));
    await no('v3.17 category doc with a string in public deny', () => x.doc(`userCityListCats/${X}_c1_coffee`).set({ ownerId: X, cityId: 'c1', catId: 'coffee', public: 'true', sharedWith: [], places: [] }));
    await ok('v3.17 category doc with a boolean public allow', () => x.doc(`userCityListCats/${X}_c1_coffee`).set({ ownerId: X, cityId: 'c1', catId: 'coffee', public: false, sharedWith: [], places: [] }));

    // --- (١٤ · ق٣-٤) الاسم المعروض مسجَّل لصاحبه — الحالتان الموسومتان [measure] هما شرط القرار: إن فشلت إحداهما يُسحب البند ---
    await ok('v3.17 PUBLIC list carrying my registered nickname allow', L17('n1', { public: true, nickname: 'X17name' }));
    await no('v3.17 PUBLIC list carrying a nickname nobody registered deny', L17('n2', { public: true, nickname: 'Nobody17' }));
    await no('v3.17 PUBLIC list carrying ANOTHER user\'s nickname deny', L17('n3', { public: true, nickname: 'Y17name' }));
    await ok('v3.17 PRIVATE list with any nickname allow (the check is for public lists)', L17('n4', { nickname: 'Nobody17' }));
    await no('v3.17 making that private list PUBLIC while its nickname is not mine deny', () => x.doc(`userCityLists/${X}_n4`).update({ public: true }));
    await ok('v3.17 [measure ق٣-٤] PUBLIC list with an Arabic nickname (key = the same letters) allow', L17('n5', { public: true, nickname: 'سارة' }));
    await ok('v3.17 [measure ق٣-٤] PUBLIC list with an accented capital (Émile → key émile) allow', L17('n6', { public: true, nickname: 'Émile' }));
    await ok('v3.17 [measure ق٣-٤] PUBLIC list with a nickname holding spaces and a dot (Abu Ali Jr.) allow', L17('n7', { public: true, nickname: 'Abu Ali Jr.' }));
    await ok('v3.17 [measure ق٣-٤] PUBLIC list with a nickname holding an apostrophe (O\'Neil) allow', L17('n8', { public: true, nickname: "O'Neil" }));
    /* حرفان معروفان باختلاف تحويلهما بين المكتبات — قياس خارج الحصيلة: إن رُفض أحدهما فصاحب اسم كهذا يُرفض حفظ قائمته العامة (يُعرض على المالك) */
    for (const pr of [['n9', 'İbrahim'], ['n10', 'ΝΙΚΟΣ']]){ try { await L17(pr[0], { public: true, nickname: pr[1] })(); console.log('INFO  v3.17 lower() ' + pr[1] + ' (app key ' + pr[1].toLowerCase() + '): ALLOWED'); } catch (e) { console.log('INFO  v3.17 lower() ' + pr[1] + ' (app key ' + pr[1].toLowerCase() + '): DENIED · ' + (e && e.code)); } }
    await ok('v3.17 profile carrying my registered nickname allow', () => x.doc(`communityProfiles/${X}`).set({ nickname: 'X17name' }, { merge: true }));
    await no('v3.17 profile carrying ANOTHER user\'s nickname deny', () => x.doc(`communityProfiles/${X}`).set({ nickname: 'Y17name' }, { merge: true }));

    // --- (٥-ب · ق٣-٢) نافذة التاريخ — ٢٠٢٦-٠٨-١٨/١٩/٢٠ تُحوَّل إلى اليوم/أمس/غدًا؛ ٢٠٢٦-٠١-٠٥ و٢٠٣١-٠١-٠١ خارج النافذة دائمًا ---
    await ok('v3.17 events doc dated TODAY allow', () => guest.doc('analytics/events_2026-08-18__all__w17').set({ place_open: 1 }));
    await ok('v3.17 events doc dated YESTERDAY allow', () => guest.doc('analytics/events_2026-08-19__all__w17').set({ place_open: 1 }));
    await ok('v3.17 events doc dated TOMORROW allow', () => guest.doc('analytics/events_2026-08-20__all__w17').set({ place_open: 1 }));
    await no('v3.17 events doc dated months ago deny', () => guest.doc('analytics/events_2026-01-05__all__w17').set({ place_open: 1 }));
    await no('v3.17 events doc dated years ahead deny', () => guest.doc('analytics/events_2031-01-01__all__w17').set({ place_open: 1 }));
    await ok('v3.17 hours doc dated TOMORROW: create allow (a user ahead of UTC writes tomorrow for part of each day)', () => guest.doc('analytics/hours_2026-08-20__all').set({ h00: 1 }));
    await ok('v3.17 hours doc dated TOMORROW: update touching six keys allow (the widest doc on the longest path of the date window — measures the expression budget)', () => guest.doc('analytics/hours_2026-08-20__all').update({ h00: 2, h01: 1, h02: 1, h03: 1, h04: 1, h05: 1 }));
    await ok('v3.17 events doc dated TOMORROW: update touching six keys allow (expression budget)', () => guest.doc('analytics/events_2026-08-20__all__w17').update({ place_open: 2, bookmark_add: 1, mylist_open: 1, mylist_save: 1, trip_open: 1, trip_save: 1 }));
    await no('v3.17 sessions doc dated months ago deny', () => guest.doc('analytics/sessions_2026-01-05__all').set({ count: 1 }));
    await no('v3.17 errors doc dated months ago deny', () => guest.doc('analytics/errors_2026-01-05').set({ total: 1 }));
    await ok('v3.17 errors doc dated today allow', () => guest.doc('analytics/errors_2026-08-18').set({ total: 1 }));
    await no('v3.17 dailyStats doc dated months ago deny', () => a.doc('dailyStats/2026-01-05').set({ activeToday: 1 }));
    await no('v3.17 dailyStats doc dated years ahead deny', () => a.doc('dailyStats/2031-01-01').set({ activeToday: 1 }));
    await no('v3.17 dailyStats +2 in one update deny', () => a.doc('dailyStats/2026-08-20').update({ activeToday: 3 }));
    await ok('v3.17 dailyStats +1 allow', () => a.doc('dailyStats/2026-08-20').update({ activeToday: 2 }));
    await no('v3.17 stats_cities doc dated months ago deny', () => a.doc('stats_cities/paris__2026-01-05').set({ open: 1 }));
    await no('v3.17 stats_lists daily doc dated months ago deny', () => guest.doc(`stats_lists/${LP}__2026-01-05`).set({ open_app: 1 }));
    await ok('v3.17 stats_lists daily doc dated today allow', () => guest.doc(`stats_lists/${LP}__2026-08-18`).set({ open_app: 1 }));
    await no('v3.17 stats_curators daily doc dated months ago deny', () => guest.doc('stats_curators/' + CUR + '__2026-01-05').set({ page_view: 1 }));

    // --- (٦) سجل هوية الأماكن: شرط القرب (math.abs) ---
    const PI17 = (lat, lng) => ({ lat: lat, lng: lng, source: 'user_pin', by: X, at: 2 });
    await ok('v3.17 identity update NEAR the recorded point (0.005° lat, 0.02° lng) allow', () => x.doc('placeIdentity/k17').set(PI17(48.855, 2.37)));
    await no('v3.17 identity update FAR in latitude (0.02°) deny', () => x.doc('placeIdentity/k17').set(PI17(48.875, 2.37)));
    await no('v3.17 identity update FAR in longitude (0.08°) deny', () => x.doc('placeIdentity/k17').set(PI17(48.855, 2.45)));
    await ok('v3.17 identity update on a record stored with INTEGER coordinates (48 → 48.005) allow (int/float arithmetic)', async () => { await seedDoc('placeIdentity/k17int', { lat: 48, lng: 2, source: 'user_pin', by: Y, at: 1 }); await x.doc('placeIdentity/k17int').set(PI17(48.005, 2.01)); });
    await ok('v3.17 identity create anywhere allow', () => x.doc('placeIdentity/k17b').set(PI17(-33.9, 151.2)));

    // --- (١٠)(١٢) البلاغات ---
    await ok('v3.17 reports: my own reports by query (account deletion) allow', () => x.collection('reports').where('by', '==', X).get());
    await no('v3.17 reports: another user reads my report deny', () => y.doc('reports/r17x').get());
    await ok('v3.17 report reason of 300 characters allow', () => x.doc('reports/r17a').set({ by: X, kind: 'app', reason: 'x'.repeat(300), at: 1 }));
    await no('v3.17 report reason of 301 characters deny', () => x.doc('reports/r17b').set({ by: X, kind: 'app', reason: 'x'.repeat(301), at: 1 }));
    await no('v3.17 report kind app with a map in docKey deny', () => x.doc('reports/r17c').set({ by: X, kind: 'app', docKey: { a: 1 } }));
    await no('v3.17 report with a string in `at` deny', () => x.doc('reports/r17d').set({ by: X, kind: 'app', at: 'now' }));

    // --- (١٣ · ق٣-٣) إعادة طلب المنتقي بعد أسبوع ---
    await ok('v3.17 declined 8 days ago: re-request by editing my own doc allow', () => x.doc(`curatorRequests/${X}`).update({ status: 'pending', text: 'again', at: Date.now() }));
    await no('v3.17 declined 2 days ago: re-request deny (one week)', () => y.doc(`curatorRequests/${Y}`).update({ status: 'pending', text: 'again', at: Date.now() }));
    await no('v3.17 re-request stamped two days in the future deny (one day of clock slack is accepted)', () => w.doc(`curatorRequests/${W}`).update({ status: 'pending', at: Date.now() + 2 * DAYMS }));
    await no('v3.17 re-request that sets status accepted deny', () => w.doc(`curatorRequests/${W}`).update({ status: 'accepted', at: Date.now() }));
    await no('v3.17 a pending request edited again by its owner deny', () => x.doc(`curatorRequests/${X}`).update({ status: 'pending', text: 'once more', at: Date.now() + 1000 }));

    // --- (٨) users · (٩) nicknames ---
    await no('v3.17 SUSPENDED user creates own users doc deny', () => z.doc(`users/${Z}`).set({ email: 'z@x' }));
    await no('v3.17 nicknames listed by a GUEST deny', () => guest.collection('nicknames').get());
    await no('v3.17 nicknames listed by a signed-in user deny', () => a.collection('nicknames').get());
    await no('v3.17 nickname doc with an extra field deny', () => x.doc('nicknames/k17extra').set({ uid: X, nickname: 'K17extra', blob: 'x' }));
    await no('v3.17 nickname of 2 characters deny', () => x.doc('nicknames/k1').set({ uid: X, nickname: 'k1' }));
    await no('v3.17 nickname key of 25 characters deny', () => x.doc('nicknames/' + 'k'.repeat(25)).set({ uid: X, nickname: 'k'.repeat(24) }));
    await ok('v3.17 nickname doc as the app writes it allow', () => x.doc('nicknames/k17ok').set({ uid: X, nickname: 'K17ok' }));

    // --- (١٥ · ق١١-١٢-٠٦) إضافات المراجعة المستقلة ---
    await env.withSecurityRulesDisabled(async (ctx) => { const db = ctx.firestore();
      await db.doc(`copies/${W}__${LQ}`).set({ uid: W, kind: 'place', docKey: LQ }); // سجل من نوع آخر في مسار سجل نسخ القائمة
      await db.doc('analytics/sessions_2026-08-18__all__junk17').set({ count: 1 }); });
    await no('v3.17 copyCount +1 on a list with a record of ANOTHER kind (place) in the record path deny', () => { const bt = c.batch(); bt.set(c.doc(`copies/${C}__${LQ}`), { uid: C, kind: 'place', docKey: LQ }); bt.set(c.doc(`userCityLists/${LQ}`), { copyCount: inc17(1, 3) }, { merge: true }); return bt.commit(); });
    await no('v3.17 copyCount -1 on a list by deleting a record of ANOTHER kind deny (the drain)', () => { const bt = w.batch(); bt.delete(w.doc(`copies/${W}__${LQ}`)); bt.set(w.doc(`userCityLists/${LQ}`), { copyCount: inc17(-1, 1) }, { merge: true }); return bt.commit(); });
    await no('v3.17 copyCount +1 on a trip with a record of ANOTHER kind (place) deny', () => { const bt = c.batch(); bt.set(c.doc(`copies/${C}__t17`), { uid: C, kind: 'place', docKey: 't17' }); bt.set(c.doc('trips/t17'), { copyCount: inc17(1, 3) }, { merge: true }); return bt.commit(); });
    await no('v3.17 copyCount +1 on a list with a record of kind TRIP in the record path deny', () => { const bt = c.batch(); bt.set(c.doc(`copies/${C}__${LQ}`), { uid: C, kind: 'trip', docKey: LQ }); bt.set(c.doc(`userCityLists/${LQ}`), { copyCount: inc17(1, 3) }, { merge: true }); return bt.commit(); });
    await ok('v3.17 delete of an ordinary copy record that does not exist allow (as before)', () => x.doc(`copies/${X}__ghost17`).delete());
    await no('v3.17 analytics doc with a junk id is not readable by a guest', () => guest.doc('analytics/sessions_2026-08-18__all__junk17').get());
    await ok('v3.17 analytics doc with a junk id is readable by the app owner', () => owner.doc('analytics/sessions_2026-08-18__all__junk17').get());
    await no('v3.17 curator request filed with time zero deny', () => env.authenticatedContext('userQ17').firestore().doc('curatorRequests/userQ17').set({ uid: 'userQ17', text: 'x', at: 0, status: 'pending' }));
    await ok('v3.17 curator request filed with the present time allow (what the app writes)', () => env.authenticatedContext('userQ17').firestore().doc('curatorRequests/userQ17').set({ uid: 'userQ17', text: 'x', at: Date.now(), status: 'pending' }));
    await ok('v3.17 trip create with title null and cityName null allow', () => x.doc('trips/t17n').set({ ownerId: X, public: false, sharedWith: [], title: null, cityName: null }));
  }


  await env.cleanup();
  console.log('\n' + (fail === 0 ? '✅ RULES PASSED' : '❌ RULES FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('FAIL  harness  →  ' + (e && e.stack || e)); process.exit(1); });
