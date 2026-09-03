// MyPickz — tests/rules-sim.js
// يختبر firestore.rules (v3.8) على محرك Firebase الرسمي (المحاكي) — لا تفسير خاص لدلالات القواعد.
// v3.8 (٣ سبتمبر ٢٠٢٦ — نشرة القرار المؤسِّس ٠٩، سطور M4.23 أقرّها المالك أولًا): + القسم ٢١ وقلب سبع حالات إعجاب مجمَّدة:
//   سجل مفكرة القوائم وعدّادها المربوط · سجل حفظ الرحلات وعدّاده · تجميد favoriteCount بالمجموعات الثلاث ·
//   عدّاد مشاهدات القائمة · قراءة المستند الغائب لصاحب البادئة · خصوصية السجلين (الثابت ١٢ — «كم لا مَن»)
// v3.7 (٢٦ أغسطس ٢٠٢٦ — دفعة الإطار خ٣): + القسم ٢٠ — ٣٩٠ حالة (٣٤٣ + ٤٧): المتابعة · حقول الملف والفجوات ١٥–١٨ · تفضيل الرحلات
// v3.6 (٢٥ أغسطس ٢٠٢٦ — الشرط الحاجب، ثلاثة قرارات): + القسم ١٩ — ٣٤٣ حالة (٣١٩ + ٢٤)
// v3.5 (٢٤ أغسطس ٢٠٢٦ — الشرط الحاجب): + القسم ١٨ — ٣١٩ حالة
// يُشغَّل بـ: npx firebase emulators:exec --only firestore --project demo-mypickz "node tests/rules-sim.js"
// كل حالة تُطبع بسطر PASS/FAIL. أي FAIL ⇒ رمز خروج ١ ⇒ الناشر يتوقف.
'use strict';
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'demo-mypickz'; // بادئة demo- = وضع محاكاة صريح بلا اعتماد على المشروع الحقيقي ولا تسجيل دخول
const RULES = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

// الأدوار الأربعة (مستخرجة من نص القواعد): بلا حساب · مستخدم عادي · مستخدم مُوقَف · المالك
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
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 }
  });

  // ---------- بيانات البذر (بقواعد معطَّلة) ----------
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('settings/app').set({ ownerUid: OWNER });
    await db.doc('cities/paris').set({ name: 'Paris', published: true, links: {} });
    await db.doc(`suspensions/${S}`).set({ at: 1, by: OWNER, email: 's@x' });
    await db.doc(`favorites/${A}`).set({ places: [] });
    await db.doc(`favorites/${S}`).set({ places: [] });
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
    await db.doc('placeFavoriteCounts/p1').set({ name: 'Holybelly', url: 'https://maps.app.goo.gl/x', count: 2 });
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
  await ok('cities read guest', () => guest.doc('cities/paris').get());
  await ok('cities read user', () => a.doc('cities/paris').get());
  await ok('cities read suspended', () => s.doc('cities/paris').get());
  await ok('cities read owner', () => owner.doc('cities/paris').get());
  await no('cities write guest', () => guest.doc('cities/paris').set({ x: 1 }, { merge: true }));
  await no('cities write user', () => a.doc('cities/paris').set({ x: 1 }, { merge: true }));
  await no('cities write suspended', () => s.doc('cities/paris').set({ x: 1 }, { merge: true }));
  await ok('cities write owner', () => owner.doc('cities/paris').set({ x: 1 }, { merge: true }));

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
  const EV = 'analytics/events_2026-08-19__paris__cafes';
  await ok('events create {place_open:3} guest (real city)', () => guest.doc(EV).set({ place_open: 3 }));
  await no('events create unknown city', () => guest.doc('analytics/events_2026-08-19__nowhere__cafes').set({ place_open: 1 }));
  await ok('events create city all / category all', () => guest.doc('analytics/events_2026-08-19__all__all').set({ visit_source: 1, signup_start: 1 }));
  await ok('events create reserved future key (share_card, curator_view)', () => guest.doc('analytics/events_2026-08-19__paris__all').set({ share_card: 1, curator_view: 2 }));
  await no('events create unknown key', () => guest.doc('analytics/events_2026-08-19__paris__bars').set({ hack: 1 }));
  await ok('events create import keys (reserved for ب-١)', () => guest.doc('analytics/events_2026-08-19__paris__import').set({ import_run: 1, import_place: 30, import_suggest_kept: 20, import_suggest_changed: 10 }));
  await ok('events create reserved_1 (public toggle)', () => guest.doc('analytics/events_2026-08-19__all__lists').set({ reserved_1: 1 }));
  await ok('events create personal_* (aggregate only, city all)', () => guest.doc('analytics/events_2026-08-19__all__personal').set({ personal_open: 3, personal_save: 1, personal_place_open: 2 }));
  await no('events create uppercase city (bad id)', () => guest.doc('analytics/events_2026-08-19__Paris__cafes').set({ place_open: 1 }));
  await no('events create with uid field', () => guest.doc('analytics/events_2026-08-19__paris__hotels').set({ place_open: 1, uid: 'x' }));
  await ok('events update +50 user', () => a.doc(EV).update({ place_open: 53 }));
  await no('events update +51', () => guest.doc(EV).update({ place_open: 104 }));
  await no('events update decrease', () => guest.doc(EV).update({ place_open: 1 }));
  await ok('events update add second key +1', () => guest.doc(EV).update({ favorite_add: 1 }));
  await no('events read user (owner-only)', () => a.doc(EV).get());
  await ok('events read owner', () => owner.doc(EV).get());
  await no('events delete owner', () => owner.doc(EV).delete());

  // ================= ٤-د) v3.3: sources_* / hours_* / sessions_* =================
  await ok('sources create guest (real city)', () => guest.doc('analytics/sources_2026-08-19__paris').set({ src_app: 3, ref_ig: 1 }));
  await no('sources create unknown key', () => guest.doc('analytics/sources_2026-08-19__all').set({ src_x: 1 }));
  await no('sources create unknown city', () => guest.doc('analytics/sources_2026-08-19__nowhere').set({ src_app: 1 }));
  await ok('sources update +1', () => guest.doc('analytics/sources_2026-08-19__paris').update({ ref_card: 1 }));
  await no('sources read user', () => a.doc('analytics/sources_2026-08-19__paris').get());
  await ok('sources read owner', () => owner.doc('analytics/sources_2026-08-19__paris').get());
  await ok('hours create guest', () => guest.doc('analytics/hours_2026-08-19__paris').set({ h14: 5, h15: 2 }));
  await no('hours create key h24', () => guest.doc('analytics/hours_2026-08-19__all').set({ h24: 1 }));
  await ok('hours update +1', () => guest.doc('analytics/hours_2026-08-19__paris').update({ h14: 6 }));
  await no('hours read user', () => a.doc('analytics/hours_2026-08-19__paris').get());
  await ok('sessions create guest', () => guest.doc('analytics/sessions_2026-08-19__paris').set({ count: 1, seconds: 600, depth: 4 }));
  await no('sessions create seconds 9000 (>7200)', () => guest.doc('analytics/sessions_2026-08-19__all').set({ count: 1, seconds: 9000 }));
  await ok('sessions create seconds 7200 (max)', () => guest.doc('analytics/sessions_2026-08-19__all').set({ count: 1, seconds: 7200 }));
  await no('sessions create count 60 (>50)', () => guest.doc('analytics/sessions_2026-08-20__all').set({ count: 60 }));
  await no('sessions create extra field', () => guest.doc('analytics/sessions_2026-08-20__paris').set({ count: 1, uid: 'x' }));
  await ok('sessions update +seconds', () => guest.doc('analytics/sessions_2026-08-19__paris').update({ count: 2, seconds: 900 }));
  await no('sessions read user', () => a.doc('analytics/sessions_2026-08-19__paris').get());
  await ok('sessions read owner', () => owner.doc('analytics/sessions_2026-08-19__paris').get());

  // ================= ٤-هـ) v3.3: stats_lists =================
  await ok('stats_lists create guest (existing list cA)', () => guest.doc('stats_lists/cA').set({ open_community: 1, open_total: 1 }));
  await no('stats_lists create unknown list', () => guest.doc('stats_lists/zzz').set({ open_total: 1 }));
  await ok('stats_lists create daily doc', () => guest.doc('stats_lists/cA__2026-08-19').set({ open_community: 1, open_total: 1 }));
  await no('stats_lists create unknown key', () => guest.doc('stats_lists/cBpub').set({ hack: 1 }));
  await ok('stats_lists update +1', () => guest.doc('stats_lists/cA').update({ open_total: 2, save_from: 1 }));
  await no('stats_lists update +51', () => guest.doc('stats_lists/cA').update({ open_total: 53 }));
  await no('stats_lists update decrease', () => guest.doc('stats_lists/cA').update({ open_total: 1 }));
  await ok('stats_lists read by list owner (A)', () => a.doc('stats_lists/cA').get());
  await ok('stats_lists read daily by list owner (A)', () => a.doc('stats_lists/cA__2026-08-19').get());
  await no('stats_lists read by other user (B)', () => b.doc('stats_lists/cA').get());
  await no('stats_lists read guest', () => guest.doc('stats_lists/cA').get());
  await ok('stats_lists read app owner', () => owner.doc('stats_lists/cA').get());
  await no('stats_lists delete by list owner', () => a.doc('stats_lists/cA__2026-08-19').delete());
  await ok('stats_lists delete app owner', () => owner.doc('stats_lists/cA__2026-08-19').delete());

  // ================= ٤-و) v3.3: stats_trips =================
  await ok('stats_trips create guest (existing trip tA)', () => guest.doc('stats_trips/tA').set({ view_shared: 1, view_total: 1 }));
  await no('stats_trips create unknown trip', () => guest.doc('stats_trips/nope').set({ view_total: 1 }));
  await ok('stats_trips update copy +1', () => guest.doc('stats_trips/tA').update({ copy: 1 }));
  await ok('stats_trips read by trip owner (A)', () => a.doc('stats_trips/tA').get());
  await no('stats_trips read by other (B)', () => b.doc('stats_trips/tA').get());
  await ok('stats_trips read app owner', () => owner.doc('stats_trips/tA').get());

  // ================= ٤-ز) v3.3: stats_places =================
  await ok('stats_places create guest (list cA + 16-hex hash)', () => guest.doc('stats_places/cA__0123456789abcdef').set({ open_community: 2, open_total: 2 }));
  await no('stats_places create short hash', () => guest.doc('stats_places/cA__abc').set({ open_total: 1 }));
  await no('stats_places create unknown list', () => guest.doc('stats_places/zzz__0123456789abcdef').set({ open_total: 1 }));
  await no('stats_places create unknown key', () => guest.doc('stats_places/cA__fedcba9876543210').set({ url: 'x' }));
  await ok('stats_places update save_from +1', () => guest.doc('stats_places/cA__0123456789abcdef').update({ save_from: 1 }));
  await ok('stats_places read by list owner (A)', () => a.doc('stats_places/cA__0123456789abcdef').get());
  await no('stats_places read by other (B)', () => b.doc('stats_places/cA__0123456789abcdef').get());
  await no('stats_places read guest', () => guest.doc('stats_places/cA__0123456789abcdef').get());

  // ================= ٤-ز-٢) v3.3.1: stats_places — أماكن دليل المالك =================
  await ok('stats_places owner guide create (real city paris)', () => guest.doc('stats_places/owner_paris__0123456789abcdef').set({ open_app: 5, open_total: 5 }));
  await no('stats_places owner guide unknown city', () => guest.doc('stats_places/owner_nowhere__0123456789abcdef').set({ open_app: 1 }));
  await no('stats_places owner guide uppercase city (bad id)', () => guest.doc('stats_places/owner_Paris__0123456789abcdef').set({ open_app: 1 }));
  await ok('stats_places owner guide update +1', () => guest.doc('stats_places/owner_paris__0123456789abcdef').update({ open_total: 6 }));
  await ok('stats_places owner guide read by app owner', () => owner.doc('stats_places/owner_paris__0123456789abcdef').get());
  await no('stats_places owner guide read by user', () => a.doc('stats_places/owner_paris__0123456789abcdef').get());
  await no('stats_places owner guide read guest', () => guest.doc('stats_places/owner_paris__0123456789abcdef').get());
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('userCityLists/owner_paris').set({ ownerId: B, public: false, sharedWith: [] }));
  await no('stats_places owner guide read by user who forged userCityLists/owner_paris', () => b.doc('stats_places/owner_paris__0123456789abcdef').get());

  // ================= ٤-ح) v3.3: stats_curators / stats_cards =================
  const CUR = 'abcdefghijklmnopqrstuvwxyz12';
  const cur = env.authenticatedContext(CUR).firestore();
  await ok('stats_curators create guest (uid-shaped id)', () => guest.doc('stats_curators/' + CUR).set({ page_view: 1, ref_ig: 1 }));
  await no('stats_curators create short id', () => guest.doc('stats_curators/userA').set({ page_view: 1 }));
  await ok('stats_curators create daily', () => guest.doc('stats_curators/' + CUR + '__2026-08-19').set({ contact_click: 1 }));
  await no('stats_curators create unknown key', () => guest.doc('stats_curators/' + CUR).set({ followers_list: 1 }));
  await ok('stats_curators read by curator', () => cur.doc('stats_curators/' + CUR).get());
  await no('stats_curators read by other user', () => a.doc('stats_curators/' + CUR).get());
  await ok('stats_curators read app owner', () => owner.doc('stats_curators/' + CUR).get());
  await ok('stats_cards create guest (uid__cardId)', () => guest.doc('stats_cards/' + CUR + '__card_0001').set({ view_ig: 1, view_total: 1 }));
  await no('stats_cards create bad id', () => guest.doc('stats_cards/card1').set({ view_total: 1 }));
  await ok('stats_cards update +1', () => guest.doc('stats_cards/' + CUR + '__card_0001').update({ view_total: 2, view_tt: 1 }));
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
  await ok('pfc read guest', () => guest.doc('placeFavoriteCounts/p1').get());
  await no('pfc create guest', () => guest.doc('placeFavoriteCounts/p2').set(pfc));
  await ok('pfc create user', () => a.doc('placeFavoriteCounts/p2').set(pfc));
  await no('pfc create suspended', () => s.doc('placeFavoriteCounts/p3').set(pfc));
  await no('pfc create count:5', () => a.doc('placeFavoriteCounts/p4').set({ ...pfc, count: 5 }));
  await no('pfc create extra field', () => a.doc('placeFavoriteCounts/p5').set({ ...pfc, x: 1 }));
  await ok('pfc update +1 user', () => a.doc('placeFavoriteCounts/p1').update({ count: 3 }));
  await no('pfc update +1 suspended', () => s.doc('placeFavoriteCounts/p1').update({ count: 4 }));
  await ok('pfc update -1 suspended (may withdraw a like)', () => s.doc('placeFavoriteCounts/p1').update({ count: 2 }));
  await no('pfc update +5', () => a.doc('placeFavoriteCounts/p1').update({ count: 7 }));
  await no('pfc delete user', () => a.doc('placeFavoriteCounts/p1').delete());
  await ok('pfc delete owner', () => owner.doc('placeFavoriteCounts/p2').delete());

  // ================= ٧) favorites =================
  await no('favorites read guest', () => guest.doc(`favorites/${A}`).get());
  await ok('favorites read own', () => a.doc(`favorites/${A}`).get());
  await no('favorites read other user', () => b.doc(`favorites/${A}`).get());
  await ok('favorites read owner (v3.2)', () => owner.doc(`favorites/${A}`).get());
  await ok('favorites write own', () => a.doc(`favorites/${A}`).set({ places: ['x'] }, { merge: true }));
  await no('favorites write other', () => b.doc(`favorites/${A}`).set({ places: [] }, { merge: true }));
  await no('favorites write suspended', () => s.doc(`favorites/${S}`).set({ places: ['x'] }, { merge: true }));
  await ok('favorites delete own by suspended', () => s.doc(`favorites/${S}`).delete());
  await no('favorites delete other user', () => b.doc(`favorites/${A}`).delete());
  await ok('favorites delete owner', () => owner.doc(`favorites/${A}`).delete());

  // ================= ٨) userLists =================
  await no('userLists read guest (public)', () => guest.doc(`userLists/${B}`).get());
  await ok('userLists read own', () => a.doc(`userLists/${A}`).get());
  await ok('userLists read public of other', () => a.doc(`userLists/${B}`).get());
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
  await ok('cp read guest', () => guest.doc(`communityProfiles/${B}`).get());
  await ok('cp query hasAnyPublicContent user', () => a.collection('communityProfiles').where('hasAnyPublicContent', '==', true).get());
  await ok('cp create own (new user)', () => env.authenticatedContext('newC').firestore().doc('communityProfiles/newC').set({ hasAnyPublicContent: false }));
  await no('cp create for other uid', () => a.doc('communityProfiles/newD').set({ hasAnyPublicContent: false }));
  await ok('cp update own', () => a.doc(`communityProfiles/${A}`).update({ hasAnyPublicContent: true }));
  await no('cp update other (non-counter field)', () => a.doc(`communityProfiles/${B}`).update({ hasAnyPublicContent: false }));
  await ok('cp viewCount +1 on public other', () => a.doc(`communityProfiles/${B}`).update({ viewCount: 6 }));
  await no('cp viewCount +2', () => a.doc(`communityProfiles/${B}`).update({ viewCount: 8 }));
  await no('cp viewCount +1 by suspended', () => s.doc(`communityProfiles/${B}`).update({ viewCount: 7 }));
  await ok('cp totalFavoriteCount -1 on public other', () => a.doc(`communityProfiles/${B}`).update({ totalFavoriteCount: 1 }));
  await no('cp counters on NON-public profile of other', () => b.doc(`communityProfiles/${N}`).update({ viewCount: 1 }));
  await ok('cp update owner', () => owner.doc(`communityProfiles/${B}`).update({ flag: 1 }));
  await no('cp delete other', () => b.doc(`communityProfiles/${A}`).delete());
  await ok('cp delete own', () => a.doc(`communityProfiles/${A}`).delete());
  await ok('cp delete owner', () => owner.doc(`communityProfiles/${B}`).delete());

  // ================= ١٢) nicknames =================
  await ok('nicknames read guest', () => guest.doc('nicknames/nick_a').get());
  await no('nicknames create guest', () => guest.doc('nicknames/nick_g').set({ uid: 'g', nickname: 'g' }));
  await ok('nicknames create own uid', () => a.doc('nicknames/nick_a2').set({ uid: A, nickname: 'a2' }));
  await no('nicknames create with OTHER uid (vuln 4)', () => a.doc('nicknames/nick_x').set({ uid: B, nickname: 'x' }));
  await no('nicknames create by suspended (v3.2)', () => s.doc('nicknames/nick_s2').set({ uid: S, nickname: 's2' }));
  await no('nicknames update move to other uid', () => a.doc('nicknames/nick_a').update({ uid: B }));
  await ok('nicknames update own', () => a.doc('nicknames/nick_a').update({ nickname: 'A' }));
  await no('nicknames update by suspended (v3.2)', () => s.doc('nicknames/nick_s').update({ nickname: 'S' }));
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
    btch.set(guest.doc('analytics/events_2026-08-19__paris__mp15'), { place_open: 3, mylist_open: 1 }, { merge: true });
    btch.set(guest.doc('analytics/hours_2026-08-19__all'), { h09: 2 }, { merge: true });
    btch.set(guest.doc('analytics/sessions_2026-08-21__paris'), { count: 1, seconds: 60, depth: 2 }, { merge: true });
    return btch.commit();
  });
  await no('mp batch: one bad field sinks the whole commit', () => {
    const btch = guest.batch();
    btch.set(guest.doc('analytics/events_2026-08-19__paris__mp15b'), { place_open: 1 }, { merge: true });
    btch.set(guest.doc('analytics/hours_2026-08-21__all'), { hack: 1 }, { merge: true });
    return btch.commit();
  });
  await no('mp create: per-field delta 51 rejected', () => guest.doc('analytics/events_2026-08-19__paris__mp15c').set({ place_open: 51 }, { merge: true }));
  await no('mp update: decrease rejected on mp doc', () => guest.doc('analytics/events_2026-08-19__paris__mp15').update({ place_open: 2 }));


  // ================= ١٦) M3: إغلاق التغطية — الشبكة والحواف والأعلام التصميمية =================
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc(`favorites/${S}`).set({ places: [] });
    await db.doc(`userLists/${S}`).set({ public: false, nickname: 's', favoriteCount: 0 });
    await db.doc('trips/tS').set({ ownerId: S, public: false, sharedWith: [], name: 'S private' });
    await db.doc('userCityLists/cS').set({ ownerId: S, public: false, sharedWith: [], favoriteCount: 0 });
    await db.doc(`users/${S}`).set({ email: 's@x', nickname: 's' });
    await db.doc(`communityProfiles/${S}`).set({ hasAnyPublicContent: false, viewCount: 0, totalFavoriteCount: 0 });
    await db.doc(`communityProfiles/${B}`).set({ hasAnyPublicContent: true, viewCount: 5, totalFavoriteCount: 2 });
    await db.doc('analytics/visits').delete();
  });

  await ok('cities create new doc by owner', () => owner.doc('cities/rome').set({ name: 'Rome', published: false }));
  await no('cities delete by user', () => a.doc('cities/rome').delete());
  await ok('cities delete by owner', () => owner.doc('cities/rome').delete());
  await no('suspensions write guest', () => guest.doc(`suspensions/${B}`).set({ at: 1 }));

  await no('visits create EMPTY object {} (hasOnly-empty edge)', () => guest.doc('analytics/visits').set({}));
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('analytics/visits').set({ count: 1 }));
  await no('visits update count as string', () => guest.doc('analytics/visits').update({ count: '2' }));
  await no('visits delete by user', () => a.doc('analytics/visits').delete());

  await no('errors create EMPTY object {} (size>=1 edge)', () => guest.doc('analytics/errors_2026-08-25').set({}));
  await no('errors update no-op same values (affectedKeys>=1 edge)', () => guest.doc(ED).set({ TypeError: 2 }, { merge: true }));
  await no('events create category over 40 chars', () => guest.doc('analytics/events_2026-08-19__paris__' + 'x'.repeat(41)).set({ place_open: 1 }));
  await no('events create malformed id (missing category segment)', () => guest.doc('analytics/events_2026-08-19__paris').set({ place_open: 1 }));
  await ok('[ACK P1] events update +1 by suspended (measurement anonymous by design — owner-approved)', () => s.doc(EV).update({ favorite_add: 2 }));

  await ok('hours read owner', () => owner.doc('analytics/hours_2026-08-19__paris').get());

  await no('stats update by guest', () => guest.doc('stats/users').update({ count: 6 }));
  await ok('[ACK P2] stats create by suspended (anonymous counters uniform policy — owner-approved)', () => s.doc('stats/new2').set({ count: 1 }));

  await no('pfc update by guest', () => guest.doc('placeFavoriteCounts/p1').update({ count: 3 }));
  await no('pfc P3 CLOSED: rename attempt (name+count) rejected — name/url frozen after create', () => a.doc('placeFavoriteCounts/p1').update({ name: 'Renamed', count: 3 }));
  await no('pfc P4 CLOSED: partial create (count only) rejected — all three fields required', () => a.doc('placeFavoriteCounts/p9').set({ count: 1 }));

  await ok('favorites read own by suspended', () => s.doc(`favorites/${S}`).get());
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
  await no('pfc P3: url change rejected (link hijack closed)', () => a.doc('placeFavoriteCounts/p1').update({ url: 'https://evil.example', count: 3 }));
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
    await db.doc('placeFavoriteCounts/p0').set({ name: 'Zero', url: 'https://maps.app.goo.gl/z', count: 0 });
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

  await no('v3.6 (12) pfc count 0 -> -1 denied', () => a.doc('placeFavoriteCounts/p0').update({ count: -1 }));
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
  await ok('v3.6 (3b) ucl update public categories only allow', () => a.doc('userCityLists/cA').update({ categories: { cafes: { active: true, places: [] }, bakery: { places: [] } } }));
  await ok('v3.6 (3b) LEGACY doc with inherited private key: changing it still allowed (safe before code batch)', () => a.doc('userCityLists/cLegacy').update({ categories: { cafes: { places: [] }, personal_home: { places: ['old', 'new'] } } }));
  await ok('v3.6 (3b) LEGACY doc: removing the private key (migration write) allowed', () => a.doc('userCityLists/cLegacy').update({ categories: { cafes: { places: [] } } }));

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

  await ok('v3.7 follow create self allow', () => a.doc(`follows/${A}_${C}`).set({ followerUid: A, curatorUid: C, at: 1 }));
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

  await ok('v3.7 cp followerCount +1 by other allow', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 1 }));
  await no('v3.7 cp followerCount +2 deny', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 3 }));
  await no('v3.7 cp followerCount 1 -> -1 deny (floor)', () => a.doc(`communityProfiles/${C}`).update({ followerCount: -1 }));
  await no('v3.7 cp SELF bump viewCount deny (gap 15 closed)', () => c.doc(`communityProfiles/${C}`).update({ viewCount: 999 }));
  await no('v3.7 cp SELF bump followerCount deny (gap 15)', () => c.doc(`communityProfiles/${C}`).update({ followerCount: 999 }));
  await no('v3.7 cp SELF set verified deny', () => c.doc(`communityProfiles/${C}`).update({ verified: true }));
  await no('v3.7 cp SELF create with verified deny', () => env.authenticatedContext('newV').firestore().doc('communityProfiles/newV').set({ hasAnyPublicContent: false, verified: true }));
  await ok('v3.7 cp OWNER set verified allow', () => owner.doc(`communityProfiles/${C}`).update({ verified: true }));
  await ok('v3.7 cp self set bio/displayName/contactUrl/showFollowerCount allow', () => c.doc(`communityProfiles/${C}`).update({ bio: 'Food and coffee in Riyadh', displayName: 'Khalid', contactUrl: 'https://instagram.com/khalid', showFollowerCount: true }));
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
  await ok('v3.7 gap17 followerCount -1 after unfollow (doc absent) allow', () => a.doc(`communityProfiles/${C}`).update({ followerCount: 0 }));

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
  await ok('v3.8 lb create self on public list allow', () => a.doc(`listBookmarks/${A}__cBpub`).set({ at: 1 }));
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
  await ok('v3.8 bookmarkCount +1 with record allow', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 1 }));
  await no('v3.8 bookmarkCount +2 deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 3 }));
  await no('v3.8 bookmarkCount SELF bump by list owner deny (gap16 pattern)', () => b.doc('userCityLists/cBpub').update({ bookmarkCount: 2 }));
  await no('v3.8 bookmarkCount by suspended deny', () => s.doc('userCityLists/cBpub').update({ bookmarkCount: 2 }));
  await no('v3.8 bookmarkCount by guest deny', () => guest.doc('userCityLists/cBpub').update({ bookmarkCount: 2 }));
  await no('v3.8 bookmarkCount on PRIVATE list deny', () => b.doc('userCityLists/cA').update({ bookmarkCount: 1 }));
  await no('v3.8 bookmarkCount -1 WHILE record exists deny', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 0 }));
  await no('v3.8 bookmarkCount floor 0 -> -1 deny', () => a.doc('userCityLists/cBpub2').update({ bookmarkCount: -1 }));

  // --- (السطر المعلَّق ق٠١-١٩) عدّاد مشاهدات القائمة العام ---
  await ok('v3.8 ucl viewCount +1 combined with unchanged bookmarkCount allow', () => a.doc('userCityLists/cBpub').update({ viewCount: 1, bookmarkCount: 1 }));
  await ok('v3.8 ucl viewCount +1 alone by other allow', () => a.doc('userCityLists/cBpub').update({ viewCount: 2 }));
  await no('v3.8 ucl viewCount +2 deny', () => a.doc('userCityLists/cBpub').update({ viewCount: 4 }));
  await no('v3.8 ucl viewCount decrease deny', () => a.doc('userCityLists/cBpub').update({ viewCount: 1 }));
  await no('v3.8 ucl viewCount SELF by list owner deny (gap15 pattern)', () => b.doc('userCityLists/cBpub').update({ viewCount: 3 }));
  await no('v3.8 ucl viewCount guest deny', () => guest.doc('userCityLists/cBpub').update({ viewCount: 3 }));
  await no('v3.8 ucl viewCount on PRIVATE list deny', () => b.doc('userCityLists/cA').update({ viewCount: 1 }));

  // --- فكّ التمييز: الحذف ثم النقص بغياب السجل ---
  await no('v3.8 lb delete by LIST OWNER deny', () => b.doc(`listBookmarks/${A}__cBpub`).delete());
  await ok('v3.8 lb delete own allow (unbookmark)', () => a.doc(`listBookmarks/${A}__cBpub`).delete());
  await ok('v3.8 bookmarkCount -1 after unbookmark (record absent) allow', () => a.doc('userCityLists/cBpub').update({ bookmarkCount: 0 }));
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
  await ok('v3.8 ts create self on public trip allow', () => a.doc(`tripSaves/${A}__tBpub`).set({ at: 1 }));
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
  await ok('v3.8 saveCount +1 with record allow', () => a.doc('trips/tBpub').update({ saveCount: 1 }));
  await no('v3.8 saveCount +1 WITHOUT record deny (curatorC has none)', () => c.doc('trips/tBpub').update({ saveCount: 2 }));
  await no('v3.8 saveCount +2 deny', () => a.doc('trips/tBpub').update({ saveCount: 3 }));
  await no('v3.8 saveCount SELF by trip owner deny (gap16 pattern)', () => b.doc('trips/tBpub').update({ saveCount: 2 }));
  await no('v3.8 saveCount by suspended deny', () => s.doc('trips/tBpub').update({ saveCount: 2 }));
  await no('v3.8 saveCount -1 WHILE record exists deny', () => a.doc('trips/tBpub').update({ saveCount: 0 }));
  await ok('v3.8 ts delete own allow (unsave)', () => a.doc(`tripSaves/${A}__tBpub`).delete());
  await ok('v3.8 saveCount -1 after unsave (record absent) allow', () => a.doc('trips/tBpub').update({ saveCount: 0 }));
  await no('v3.8 trips create with saveCount 5 deny', () => a.doc('trips/t38a').set({ ownerId: A, public: false, sharedWith: [], saveCount: 5 }));
  await ok('v3.8 trips create with saveCount 0 allow', () => a.doc('trips/t38b').set({ ownerId: A, public: false, sharedWith: [], saveCount: 0 }));
  await no('v3.8 trip owner self-update touching saveCount deny', () => b.doc('trips/tBpub').update({ name: 'x', saveCount: 1 }));

  await env.cleanup();
  console.log('\n' + (fail === 0 ? '✅ RULES PASSED' : '❌ RULES FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('FAIL  harness  →  ' + (e && e.stack || e)); process.exit(1); });
