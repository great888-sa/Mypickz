// MyPickz — tests/rules-sim.js
// يختبر firestore.rules (v3.3) على محرك Firebase الرسمي (المحاكي) — لا تفسير خاص لدلالات القواعد.
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

  // ================= ٤-ز-٢) v3.3.1: stats_places — أماكن دليل المالك (owner_{city}__{hash}) =================
  await ok('stats_places owner guide create (real city paris)', () => guest.doc('stats_places/owner_paris__0123456789abcdef').set({ open_app: 5, open_total: 5 }));
  await no('stats_places owner guide unknown city', () => guest.doc('stats_places/owner_nowhere__0123456789abcdef').set({ open_app: 1 }));
  await no('stats_places owner guide uppercase city (bad id)', () => guest.doc('stats_places/owner_Paris__0123456789abcdef').set({ open_app: 1 }));
  await ok('stats_places owner guide update +1', () => guest.doc('stats_places/owner_paris__0123456789abcdef').update({ open_total: 6 }));
  await ok('stats_places owner guide read by app owner', () => owner.doc('stats_places/owner_paris__0123456789abcdef').get());
  await no('stats_places owner guide read by user', () => a.doc('stats_places/owner_paris__0123456789abcdef').get());
  await no('stats_places owner guide read guest', () => guest.doc('stats_places/owner_paris__0123456789abcdef').get());
  // ثغرة مُغلقة بالتدقيق: مستخدم ينشئ userCityLists/owner_paris بنفسه ثم يحاول قراءة عدّادات دليل المالك
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('userCityLists/owner_paris').set({ ownerId: B, public: false, sharedWith: [] }));
  await no('stats_places owner guide read by user who forged userCityLists/owner_paris', () => b.doc('stats_places/owner_paris__0123456789abcdef').get());

  // ================= ٤-ح) v3.3: stats_curators / stats_cards (reserved for ج-١أ) =================
  const CUR = 'abcdefghijklmnopqrstuvwxyz12';            // uid واقعي (٢٨ حرفًا)
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

  // ================= ٦) placeFavoriteCounts =================
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
  await ok('userLists favoriteCount +1 on public by other', () => a.doc(`userLists/${B}`).update({ favoriteCount: 4 }));
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
  await ok('ucl create own', () => a.doc('userCityLists/cA2').set({ ownerId: A, public: false, sharedWith: [] }));
  await no('ucl create with other ownerId', () => a.doc('userCityLists/cX').set({ ownerId: B, public: false, sharedWith: [] }));
  await no('ucl create suspended', () => s.doc('userCityLists/cS2').set({ ownerId: S, public: false, sharedWith: [] }));
  await ok('ucl update own', () => a.doc('userCityLists/cA').update({ x: 1 }));
  await no('ucl update suspended own', () => s.doc('userCityLists/cS').update({ x: 1 }));
  await ok('ucl update owner', () => owner.doc('userCityLists/cA').update({ suspended: true }));
  await ok('ucl favoriteCount +1 on public by other', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 3 }));
  await ok('ucl favoriteCount -1 on public by other', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 2 }));
  await no('ucl favoriteCount +999', () => a.doc('userCityLists/cBpub').update({ favoriteCount: 999 }));
  await no('ucl favoriteCount by suspended', () => s.doc('userCityLists/cBpub').update({ favoriteCount: 3 }));
  await ok('ucl delete own by suspended', () => s.doc('userCityLists/cS').delete());
  await no('ucl delete other', () => b.doc('userCityLists/cA').delete());
  await ok('ucl delete owner', () => owner.doc('userCityLists/cA2').delete());

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
  // الوحدة تكتب دفعة batch واحدة (set + merge) قد تمس مستندات تجميع متعددة بالدورة الواحدة —
  // ورفض مستند واحد بالقواعد يُسقط الدفعة كاملة، لذا تُختبر الدفعة نفسها لا المستند المفرد فقط.
  // (حالة "personal بمدينة حقيقية" قيدُ كودٍ لا قواعد — القواعد تجيزها بنيويًا؛ تُفحص ببند Personal بقائمة الاختبار الميداني.)
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
  // مصدر الحالات: تشريح النص الحرفي v3.3.1 بندًا بندًا ضد فهرس M2 (٢١ أغسطس).
  // الحالات الموسومة [PIN] تثبّت سلوكًا قائمًا بالنص يحتاج قرار مالك لاحقًا — أي تغيير يمر بالشرط الحاجب (المصفوفة أولًا).
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    // إعادة بذر ما حذفته المجموعات السابقة (لاختبارات "الموقوف يقرأ محتواه" وغيرها)
    await db.doc(`favorites/${S}`).set({ places: [] });
    await db.doc(`userLists/${S}`).set({ public: false, nickname: 's', favoriteCount: 0 });
    await db.doc('trips/tS').set({ ownerId: S, public: false, sharedWith: [], name: 'S private' });
    await db.doc('userCityLists/cS').set({ ownerId: S, public: false, sharedWith: [], favoriteCount: 0 });
    await db.doc(`users/${S}`).set({ email: 's@x', nickname: 's' });
    await db.doc(`communityProfiles/${S}`).set({ hasAnyPublicContent: false, viewCount: 0, totalFavoriteCount: 0 });
    await db.doc(`communityProfiles/${B}`).set({ hasAnyPublicContent: true, viewCount: 5, totalFavoriteCount: 2 });
    await db.doc('analytics/visits').delete(); // لاختبار حافة الإنشاء الفارغ ثم إعادة البذر
  });

  // --- settings / cities / suspensions: إكمال شبكة العمليات ---
  await ok('cities create new doc by owner', () => owner.doc('cities/rome').set({ name: 'Rome', published: false }));
  await no('cities delete by user', () => a.doc('cities/rome').delete());
  await ok('cities delete by owner', () => owner.doc('cities/rome').delete());
  await no('suspensions write guest', () => guest.doc(`suspensions/${B}`).set({ at: 1 }));

  // --- analytics/visits: حواف البنية ---
  await no('visits create EMPTY object {} (hasOnly-empty edge)', () => guest.doc('analytics/visits').set({}));
  await env.withSecurityRulesDisabled(async (c) => c.firestore().doc('analytics/visits').set({ count: 1 }));
  await no('visits update count as string', () => guest.doc('analytics/visits').update({ count: '2' }));
  await no('visits delete by user', () => a.doc('analytics/visits').delete());

  // --- errors/events family: حواف مشتركة ---
  await no('errors create EMPTY object {} (size>=1 edge)', () => guest.doc('analytics/errors_2026-08-25').set({}));
  await no('errors update no-op same values (affectedKeys>=1 edge)', () => guest.doc(ED).set({ TypeError: 2 }, { merge: true }));
  await no('events create category over 40 chars', () => guest.doc('analytics/events_2026-08-19__paris__' + 'x'.repeat(41)).set({ place_open: 1 }));
  await no('events create malformed id (missing category segment)', () => guest.doc('analytics/events_2026-08-19__paris').set({ place_open: 1 }));
  await ok('[PIN] events update +1 by SUSPENDED (measurement never blocked by suspension)', () => s.doc(EV).update({ favorite_add: 2 }));

  // --- sources/hours/sessions ---
  await ok('hours read owner', () => owner.doc('analytics/hours_2026-08-19__paris').get());

  // --- stats (٥): شبكة + علم ---
  await no('stats update by guest', () => guest.doc('stats/users').update({ count: 6 }));
  await ok('[PIN] stats create by SUSPENDED (no suspension check on stats)', () => s.doc('stats/new2').set({ count: 1 }));

  // --- placeFavoriteCounts: شبكة + علمان ---
  await no('pfc update by guest', () => guest.doc('placeFavoriteCounts/p1').update({ count: 3 }));
  await ok('[PIN] pfc update renames place (name change allowed with count +1)', () => a.doc('placeFavoriteCounts/p1').update({ name: 'Renamed', count: 3 }));
  await ok('[PIN] pfc create with count only (partial fields accepted)', () => a.doc('placeFavoriteCounts/p9').set({ count: 1 }));

  // --- favorites ---
  await ok('favorites read own by suspended', () => s.doc(`favorites/${S}`).get());
  await no('favorites write guest', () => guest.doc('favorites/ghost').set({ places: [] }));

  // --- userLists ---
  await ok('userLists read own by suspended', () => s.doc(`userLists/${S}`).get());
  await ok('userLists favoriteCount -1 on public by other', () => a.doc(`userLists/${B}`).update({ favoriteCount: 3 }));

  // --- trips ---
  await ok('trips read own by suspended', () => s.doc('trips/tS').get());
  await no('[PIN] trips create by APP OWNER for other user (no isOwner on create)', () => owner.doc('trips/tOwn').set({ ownerId: B, public: false, sharedWith: [] }));

  // --- userCityLists ---
  await ok('ucl read own by suspended', () => s.doc('userCityLists/cS').get());
  await no('[PIN] ucl create by APP OWNER for other user (no isOwner on create)', () => owner.doc('userCityLists/cOwn').set({ ownerId: B, public: false, sharedWith: [] }));

  // --- communityProfiles: شبكة + العلم الأبرز ---
  await no('cp viewCount +1 by guest', () => guest.doc(`communityProfiles/${B}`).update({ viewCount: 6 }));
  await no('cp viewCount decrease -1', () => a.doc(`communityProfiles/${B}`).update({ viewCount: 4 }));
  await ok('[PIN] cp update OWN profile by SUSPENDED (ownership branch lacks suspension check)', () => s.doc(`communityProfiles/${S}`).update({ hasAnyPublicContent: false }));

  // --- nicknames ---
  await no('[PIN] nicknames update by APP OWNER on other (no isOwner on update; delete only)', () => owner.doc('nicknames/nick_b').update({ nickname: 'B2' }));

  // --- users ---
  await ok('users read own by suspended', () => s.doc(`users/${S}`).get());

  // --- dailyStats: شبكة + علم ---
  await no('dailyStats read guest', () => guest.doc(`dailyStats/${TODAY}`).get());
  await ok('[PIN] dailyStats create with large initial values (no value bound on create)', () => a.doc('dailyStats/2026-08-25').set({ newSignupsToday: 999, activeToday: 999 }));

  // --- بنود delete المستقلة ببقية كتل stats_* ---
  await ok('stats_trips delete app owner', () => owner.doc('stats_trips/tA').delete());
  await no('stats_places delete by list owner', () => a.doc('stats_places/cA__0123456789abcdef').delete());
  await ok('stats_curators delete app owner', () => owner.doc('stats_curators/' + CUR).delete());
  await no('stats_cards delete by other user', () => a.doc('stats_cards/' + CUR + '__card_0001').delete());

  await env.cleanup();
  console.log('\n' + (fail === 0 ? '✅ RULES PASSED' : '❌ RULES FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('FAIL  harness  →  ' + (e && e.stack || e)); process.exit(1); });
