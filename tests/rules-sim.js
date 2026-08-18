// MyPickz — tests/rules-sim.js
// يختبر firestore.rules (v3.2) على محرك Firebase الرسمي (المحاكي) — لا تفسير خاص لدلالات القواعد.
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

  await env.cleanup();
  console.log('\n' + (fail === 0 ? '✅ RULES PASSED' : '❌ RULES FAILED') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('FAIL  harness  →  ' + (e && e.stack || e)); process.exit(1); });
