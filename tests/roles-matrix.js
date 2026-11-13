// MyPickz — tests/roles-matrix.js (r118-ي · ١٢ نوفمبر ٢٠٢٦ · ق١١-١٢-٠٢ · ق١١-١٢-٠٥)
// مصفوفة الأدوار: طبقة البيانات الحقيقية (src/43-mpdata.js — الملف نفسه بلا نسخ) أمام القواعد الحقيقية على المحرّك الرسمي.
// كل باب يُنادى كما يناديه التطبيق، بستة أدوار: زائر · مستخدم عادي · مستخدم ثانٍ (صاحب المحتوى المعروض) · موقوف · منتقٍ موثَّق · مالك التطبيق.
// قبل كل نداء تُعاد قاعدة البيانات إلى عالم واحد معلوم (بقواعد معطَّلة) كي لا يؤثّر باب في باب.
// المرحلة الأولى (١٢ نوفمبر): قياس — أسطر RM و PS3 خارج الحصيلة، ومع كل خلية المتوقَّع بالقراءة.
// المرحلة الثانية (هذه · ١٣ نوفمبر — بعد أول قياس على المحرّك الرسمي: ٢٩٤ خلية، ٢٩٣ طابقت المتوقَّع):
//   الخلايا تجمّدت: كل باب حالة محتسبة في tests/rules-sim.js (صفّه المقيس = صفّه المتوقَّع، وإلا احمرّ التشغيل).
//   المخالفة الوحيدة كانت بذر هذا الملف لا قاعدة ولا كود: الباب ٤٢ (المالك يقبل طلب rmA) لم يكن طلب rmA مزروعًا حين يفعل المالك، فرُفض التحديث على مستند غائب.
//   بذره صُحّح هنا وقيس بعد التصحيح (١٣ نوفمبر: DDDDDA كالمتوقَّع) فصار محتسبًا كغيره — الأبواب الـ٤٩ كلها في الحصيلة. (العنصر السادس في صفّ باب يُبقيه «قيد القياس» خارج الحصيلة — لا باب يحمله الآن.) قبول المالك نفسه محتسب أصلًا («M4.25 curatorRequests status change by OWNER allow»).
// النتيجة لكل خلية: A نجح النداء · D رفضته القواعد · s رُفض وابتُلع (النداء عاد بلا خطأ والأثر لم يقع) · W نجح ومسح جاره · X:رمز خطأ آخر.
'use strict';
const fs = require('fs');
const path = require('path');

const ROLES = ['G', 'A', 'B', 'S', 'V', 'O'];
const PID_NEW = 'aaaaaaaaaaaaaa01', PID_OLD = 'aaaaaaaaaaaaaa02';

module.exports = async function runRolesMatrix(env, OWNER, log){
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'src', '43-mpdata.js'), 'utf8');
  let fb = null; try { fb = require('firebase/compat/app'); require('firebase/compat/firestore'); fb = fb.default || fb; } catch (_) { }
  if (!fb){ log('INFO  RM not measured (firebase/compat not available in this runner)'); return { cells: 0, mismatches: 0 }; }
  const UID = { G: null, A: 'rmA', B: 'rmB', S: 'rmS', V: 'rmV', O: OWNER };
  const dbOf = {}; ROLES.forEach(function(r){ dbOf[r] = UID[r] ? env.authenticatedContext(UID[r]).firestore() : env.unauthenticatedContext().firestore(); });

  // طبقة البيانات تُحمَّل مرة لكل دور في سياق معزول: db = قاعدة هذا الدور · currentUser = حسابه · وما سواهما من أسماء عامة غير معرَّف (كما في صفحة لم تُحمَّل بقيتها)
  const load = function(role){ const uid = UID[role];
    const base = { firebase: fb, db: dbOf[role], currentUser: uid ? { uid: uid, email: uid + '@x' } : null, isOwner: role === 'O', currentUserSuspended: role === 'S',
      logTiming: function(){}, rememberCity: function(){}, mpSwallow: function(){}, mpIsVerified: function(u){ return u === 'rmV'; }, hashUrl: function(s){ let h = 0; String(s).split('').forEach(function(c){ h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return ('0000000000000000' + h.toString(16)).slice(-16); }, pickerNormalize: function(s){ return String(s || '').toLowerCase().trim(); }, CATS_VERSION: 3, ownerUid: OWNER };
    /* الملف يُنفَّذ في هذا العالم نفسه (لا vm): الكائنات التي يبنيها يجب أن تكون كائنات عادية عند مكتبة Firestore. الأسماء العامة التي لا يعرّفها الملف ولا Node تُقرأ من base (وغير الموجود فيها = undefined، كما في صفحة لم تُحمَّل بقيتها). */
    const scope = new Proxy(base, { has: function(t, k){ return typeof k === 'string' && ((k in t) || !(k in globalThis)); }, get: function(t, k){ return k === Symbol.unscopables ? undefined : t[k]; }, set: function(t, k, v){ t[k] = v; return true; } });
    return new Function('__scope', 'with (__scope){ ' + SRC + '\n; return mpData; }')(scope); };
  const MP = {}; ROLES.forEach(function(r){ MP[r] = load(r); });

  const DAY = 86400000; const TODAY = new Date().toISOString().slice(0, 10);
  const seed = async function(u){ /* u = معرّف الدور الفاعل (أو rmG للزائر) — سجلاته القائمة تُبذر باسمه */
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async function(ctx){ const db = ctx.firestore(); const b = db.batch(); const put = function(p, d){ b.set(db.doc(p), d); };
      put('settings/app', { ownerUid: OWNER }); put('suspensions/rmS', { at: 1, by: OWNER, email: 's@x' });
      ['rmA', 'rmB', 'rmS', 'rmV', OWNER].forEach(function(x){ put('userLists/' + x, { nickname: x.toLowerCase(), favoriteCount: 0 }); put('users/' + x, { email: x + '@x' }); });
      put('communityProfiles/rmV', { nickname: 'rmv', verified: true, hasAnyPublicContent: true, followerCount: 3, viewCount: 0 });
      put('communityProfiles/rmB', { nickname: 'rmb', hasAnyPublicContent: true, followerCount: 0, viewCount: 0 });
      put('communityProfiles/rmA', { nickname: 'rma', hasAnyPublicContent: false, displayName: 'Old shown name' }); put('communityProfiles/rmS', { nickname: 'rms', hasAnyPublicContent: false });
      ['rma', 'rmb', 'rms', 'rmv'].forEach(function(n){ put('nicknames/' + n, { uid: 'rm' + n.slice(2).toUpperCase(), nickname: n }); });
      const L = function(id, owner, city, extra){ put('userCityLists/' + id, Object.assign({ ownerId: owner, cityId: city, cityName: city, nickname: null, public: false, sharedWith: [], splitV: 1, catsV: 3, index: [{ id: 'p1', name: 'P', catId: 'coffee' }], bookmarkCount: 0, copyCount: 0, viewCount: 0 }, extra)); put('userCityListCats/' + id + '_coffee', { ownerId: owner, cityId: city, catId: 'coffee', public: !!(extra && extra.public), sharedWith: (extra && extra.sharedWith) || [], active: true, places: [{ id: 'p1', name: 'P', url: 'https://maps.app.goo.gl/rmp1' }], updatedAt: 1 }); };
      L('rmB_pub', 'rmB', 'pub', { public: true, bookmarkCount: 1, copyCount: 1 }); L('rmB_pub2', 'rmB', 'pub2', { public: true, bookmarkCount: 3, copyCount: 3 }); L('rmB_priv', 'rmB', 'priv', {}); L('rmB_shared', 'rmB', 'shared', { sharedWith: ['rmA'] });
      const T = function(id, owner, extra){ put('trips/' + id, Object.assign({ ownerId: owner, public: false, sharedWith: [], title: 'T', saveCount: 0, copyCount: 0, viewCount: 0 }, extra)); };
      T('rm_tBpub', 'rmB', { public: true, saveCount: 1, copyCount: 1 }); T('rm_tBpub2', 'rmB', { public: true, saveCount: 3, copyCount: 3 }); T('rm_tBpriv', 'rmB', {});
      put('placeFavoriteCounts/' + PID_OLD, { name: 'Old', url: 'https://maps.app.goo.gl/rmold', count: 3 }); put('placeIdentity/k_rm', { lat: 48.85, lng: 2.35, source: 'user_pin', by: 'rmB', at: 1 });
      put('dailyStats/' + TODAY, { newSignupsToday: 1, activeToday: 1 });
      if (u){ // ما يملكه الفاعل وما سجّله من قبل
        if (u !== 'rmB'){ L(u + '_mine', u, 'mine', { bookmarkCount: 2, viewCount: 5 }); }
        else L('rmB_mine', 'rmB', 'mine', { bookmarkCount: 2, viewCount: 5 });
        T('rm_town_' + u, u, { viewCount: 4, saveCount: 2 });
        put('listBookmarks/' + u + '__rmB_pub2', { at: 1 }); put('tripSaves/' + u + '__rm_tBpub2', { at: 1 }); put('copies/' + u + '__rm_tBpub2', { uid: u, kind: 'trip', docKey: 'rm_tBpub2', at: 1 });
        put('follows/' + u + '_rmV', { followerUid: u, curatorUid: 'rmV', at: 1 }); put('copies/' + u + '__p_' + PID_OLD, { uid: u, kind: 'place', docKey: 'p_' + PID_OLD });
        put('userPrivatePlaces/' + u + '_c1', { categories: { personal_home: { active: true, places: [{ id: 'h1', name: 'Home' }] }, personal_work: { active: true, places: [{ id: 'w1', name: 'Work' }] } }, updatedAt: 1 });
        put('curatorRequests/' + u, { uid: u, text: 'first', at: Date.now() - 8 * DAY, status: 'declined' }); put('reports/r_' + u, { by: u, kind: 'app', reason: 'x', at: 1 });
      }
      await b.commit(); }); };
  const peek = async function(p){ let d = null; await env.withSecurityRulesDisabled(async function(ctx){ const s = await ctx.firestore().doc(p).get(); d = s.exists ? s.data() : null; }); return d; };
  const plant = async function(p, d){ await env.withSecurityRulesDisabled(async function(ctx){ await ctx.firestore().doc(p).set(d); }); };
  const drop = async function(p){ await env.withSecurityRulesDisabled(async function(ctx){ await ctx.firestore().doc(p).delete(); }); };
  const P1 = { id: 'q1', name: 'Q', url: 'https://maps.app.goo.gl/rmq1', topPlace: true, topAt: 5 };
  const listData = function(u, city, pub){ return { ownerId: u, cityId: city, cityName: city, nickname: null, public: pub, sharedWith: [], catsV: 3, bookmarkCount: 0, viewCount: 0, copyCount: 0, categories: { coffee: { active: true, places: [P1] } } }; };

  // الأبواب: [الاسم · المتوقَّع (G A B S V O) · النداء(mp, u) · فحص بعدي اختياري يعيد حرفًا بديلًا]
  const DOORS = [
    ['bookmarks.toggleList ON · public list of B', 'DADDAA', function(mp, u){ return mp.bookmarks.toggleList(u, 'rmB', 'pub', true); }],
    ['bookmarks.toggleList OFF · my existing bookmark', 'DADAAA', function(mp, u){ return mp.bookmarks.toggleList(u, 'rmB', 'pub2', false); }, async function(u){ return (await peek('listBookmarks/' + u + '__rmB_pub2')) ? 's' : 'A'; }], /* الدفعة ٢: من الباب الواحد — الموقوف يحذف سجله وحده (حق الانسحاب) · صاحبة المصدر B لا تحرّك عدّادها وليست في حالة إطلاق فيُرمى الرفض (سجل مزروع لا ينشأ في الواقع) · والزائر يُرمى رفضه. كان الثلاثة يُبتلع رفضهم: s */
    ['bookmarks.toggleList ON · PRIVATE list of B', 'DDDDDD', function(mp, u){ return mp.bookmarks.toggleList(u, 'rmB', 'priv', true); }],
    ['tripSaves.toggle ON · public trip of B', 'DADDAA', function(mp, u){ return mp.tripSaves.toggle(u, 'rm_tBpub', true); }],
    ['tripSaves.toggle OFF · my existing save', 'DADAAA', function(mp, u){ return mp.tripSaves.toggle(u, 'rm_tBpub2', false); }, async function(u){ return (await peek('tripSaves/' + u + '__rm_tBpub2')) ? 's' : 'A'; }],
    ['copies.record · public trip of B', 'DADDAA', function(mp, u){ return mp.copies.record(u, 'trip', 'rm_tBpub'); }],
    ['copies.unrecord · my existing trip copy', 'DADAAA', function(mp, u){ return mp.copies.unrecord(u, 'trip', 'rm_tBpub2'); }, async function(u){ return (await peek('copies/' + u + '__rm_tBpub2')) ? 's' : 'A'; }], /* الدفعة ٢: الموقوف — السجل وحده */
    ['copies.record · public list of B', 'DADDAA', function(mp, u){ return mp.copies.record(u, 'list', 'rmB_pub'); }],
    ['follows.set ON · B (has public content)', 'DADDAA', function(mp, u){ return mp.follows.set(u, 'rmB', true); }],
    ['follows.set OFF · my existing follow of V', 'DAAADA', function(mp, u){ return mp.follows.set(u, 'rmV', false); }], /* الدفعة ٢: الموقوف يسحب متابعته (السجل وحده) · V لا تتابع نفسها */
    /* الدفعة ٢: أبواب حذف الحساب ومطابقة المرايا — خلايا متوقَّعة بالقراءة، تُقاس مع الرفعة. الزائر: الاستعلام والقراءة مرفوضان · V: متابعتها لنفسها (مزروعة) لا تُطلق فتُعدّ في «ما بقي» والنداء يعود */
    ['follows.releaseMine · account deletion', 'DAAAAA', function(mp, u){ return mp.follows.releaseMine(u); }],
    ['copies.removeMine · account deletion', 'DAAAAA', function(mp, u){ return mp.copies.removeMine(u); }],
    ['mirrors.gone · my mirrors against my records', 'DAAAAA', function(mp, u){ return mp.mirrors.gone(u, { listBookmarkIds: { 'rmB_pub2': true }, tripSaveIds: { 'rm_tBpub2': true }, following: ['rmV'] }); }],
    ['cityNotes.removeMine · account deletion', 'DAAAAA', function(mp, u){ return mp.cityNotes.removeMine(u); }],
    ['cityLists.removeOrphanCats · account deletion', 'DAAAAA', function(mp, u){ return mp.cityLists.removeOrphanCats(u); }],
    ['placeCounts.bind · a place nobody saved yet', 'DAADAA', function(mp, u){ return mp.placeCounts.bind(u, PID_NEW, 'Place', 'https://maps.app.goo.gl/rmnew', '2988507'); }],
    ['placeCounts.unbind · my existing save', 'DAAAAA', function(mp, u){ return mp.placeCounts.unbind(u, PID_OLD); }],
    ['cityLists.save · my new PRIVATE list with a Top place', 'DAADAA', function(mp, u){ return mp.cityLists.save(u, 'own1', listData(u, 'own1', false)); }],
    ['cityLists.save · my new PUBLIC list with a Top place', 'DAADAA', function(mp, u){ return mp.cityLists.save(u, 'own2', listData(u, 'own2', true)); }],
    ['cityLists.save · my existing list after visitors moved its counters', 'DAADAA', function(mp, u){ return mp.cityLists.save(u, 'mine', listData(u, 'mine', false)); }],
    ['cityLists.get · public list of B', 'DAAAAA', function(mp){ return mp.cityLists.get('rmB', 'pub'); }],
    ['cityLists.get · PRIVATE list of B', 'DDADDA', function(mp){ return mp.cityLists.get('rmB', 'priv'); }],
    ['cityLists.get · list of B shared with A', 'DAADDA', function(mp){ return mp.cityLists.get('rmB', 'shared'); }],
    ['cityLists.publicLists (the market)', 'DAAAAA', function(mp){ return mp.cityLists.publicLists(); }],
    ['cityLists.publicByOwner · B', 'DAAAAA', function(mp){ return mp.cityLists.publicByOwner('rmB'); }],
    ['cityLists.remove · a city of mine that has no document', 'DAAAAA', function(mp, u){ return mp.cityLists.remove(u, 'ghost'); }],
    ['cityLists.remove · my existing list', 'DAAAAA', function(mp, u){ return mp.cityLists.remove(u, 'mine'); }],
    ['trips.save · my new trip', 'DAADAA', function(mp, u){ return mp.trips.save({ id: 'rm_tnew_' + u, ownerId: u, public: false, sharedWith: [], title: 'New' }, { ownerId: u }); }],
    ['trips.save · my existing trip after visitors moved its counters', 'DAADAA', function(mp, u){ return mp.trips.save({ id: 'rm_town_' + u, ownerId: u, public: true, sharedWith: [], title: 'Edited', viewCount: 0, saveCount: 0, copyCount: 0 }, { ownerId: u }); }],
    ['trips.remove · a trip that does not exist', 'DAAAAA', function(mp){ return mp.trips.remove('rm_ghost'); }],
    ['trips.publicTrips (the market)', 'DAAAAA', function(mp){ return mp.trips.publicTrips(); }],
    ['trips.getDoc · PRIVATE trip of B', 'DDADDA', function(mp){ return mp.trips.getDoc('rm_tBpriv'); }],
    ['privatePlaces.setCategory · one category, the other must survive', 'DAADAA', function(mp, u){ return mp.privatePlaces.setCategory(u, 'c1', 'personal_home', { active: true, places: [{ id: 'h1', name: 'Home 2' }] }); }, async function(u){ const d = await peek('userPrivatePlaces/' + u + '_c1'); return (d && d.categories && d.categories.personal_work) ? 'A' : 'W'; }],
    ['userLists.merge · my own document', 'DAADAA', function(mp, u){ return mp.userLists.merge(u, { addrCity: 'c1' }); }],
    ['nicknames.ensure · a name nobody holds (creates my registry doc)', 'DAADAA', function(mp, u){ return mp.nicknames.ensure(u, 'RmNew' + String(u).slice(-3)); }],
    ['communityProfiles.set · my own profile (A still holds displayName)', 'DAADAA', function(mp, u){ return mp.communityProfiles.set(u, { nickname: String(u).toLowerCase(), updatedAt: 1 }); }],
    ['profiles.get · V', 'DAAAAA', function(mp){ return mp.profiles.get('rmV'); }],
    ['profiles.merge · set verified on A', 'DDDDDA', function(mp){ return mp.profiles.merge('rmA', { verified: true }); }],
    ['cityNotes.save · my note on a city', 'DDDDAD', function(mp, u){ return mp.cityNotes.save(u, 'c1', { text: 'note' }); }],
    ['requests.create · I never asked', 'DAADAA', function(mp, u){ return mp.requests.create(u, 'please'); }, null, async function(u){ await drop('curatorRequests/' + u); }],
    ['requests.again · declined 8 days ago', 'DAADAA', function(mp, u){ return mp.requests.again(u, 'again'); }],
    ['requests.setStatus · accept A', 'DDDDDA', function(mp){ return mp.requests.setStatus('rmA', 'accepted'); }, null, async function(){ await plant('curatorRequests/rmA', { uid: 'rmA', text: 'first', at: Date.now(), status: 'pending' }); }], /* بذره صُحّح ١٣ نوفمبر وقيس بعده: DDDDDA كالمتوقَّع — محتسب */
    ['reports.create · app report of 250 characters', 'DAADAA', function(mp, u){ return mp.reports.create(u, 'app', '', 'x'.repeat(250)); }],
    ['reports.removeMine · account deletion', 'DAAAAA', function(mp, u){ return mp.reports.removeMine(u); }],
    ['identity.put · a new place identity', 'DAADAA', function(mp, u){ return mp.identity.put('k_rm_new', { lat: 1, lng: 2, source: 'user_pin', n: 'X', cityId: '2988507', by: u, at: Date.now() }); }],
    ['dailyStats.bump · today +1', 'DAAAAA', function(mp){ return mp.dailyStats.bump(TODAY, { activeToday: mp.fieldInc(1) }); }],
    ['settings.mergeApp', 'DDDDDA', function(mp){ return mp.settings.mergeApp({ probe: 1 }); }],
    ['users.merge · my own document', 'DAADAA', function(mp, u){ return mp.users.merge(u, { lastSeen: 1 }); }],
    ['bookmarks.setPlace · my own place note', 'DAADAA', function(mp, u){ return mp.bookmarks.setPlace(u, 'p1', { name: 'n' }); }]
  ];

  const rows = []; let mismatches = 0, cells = 0;
  for (let i = 0; i < DOORS.length; i++){ const d = DOORS[i]; let got = '';
    for (let r = 0; r < ROLES.length; r++){ const role = ROLES[r]; const u = UID[role] || 'rmG'; let c;
      try { await seed(UID[role]); if (d[4] && UID[role]) await d[4](u);
        try { await Promise.race([Promise.resolve().then(function(){ return d[2](MP[role], u); }), new Promise(function(_, rej){ setTimeout(function(){ rej({ code: 'timeout-20s' }); }, 20000); })]); c = 'A'; if (d[3] && UID[role]) c = await d[3](u); else if (d[3]) c = 's'; }
        catch (e) { const code = (e && e.code) || (e && e.name) || 'error'; c = code === 'permission-denied' ? 'D' : 'X:' + code; if (c !== 'D') log('INFO  RM ' + ('0' + (i + 1)).slice(-2) + ' ' + role + ' error · ' + String(e && (e.message || e.code) || e).slice(0, 160)); }
      } catch (e) { c = '!'; log('INFO  RM ' + ('0' + (i + 1)).slice(-2) + ' ' + role + ' harness · ' + String(e && (e.message || e) || e).slice(0, 160)); }
      cells++; const want = d[1][r]; if (c[0] !== want){ mismatches++; log('INFO  RM MISMATCH ' + ('0' + (i + 1)).slice(-2) + ' ' + role + ' · expected ' + want + ' · got ' + c + ' · ' + d[0]); }
      got += (c.length === 1 ? c : 'X'); }
    rows.push(got); log('INFO  RM ' + ('0' + (i + 1)).slice(-2) + ' ' + got.split('').join(' ') + '  (G A B S V O) · ' + d[0]); }
  log('\nPS3 n=' + rows.length + ' doors × 6 roles (G A B S V O) · cells ' + cells + ' · mismatches ' + mismatches + ' (الصفوف محتسبة في الحصيلة — عدا ما عُلّم قيد القياس)');
  for (let i = 0; i < rows.length; i += 8) log('PS3 ' + ('0' + (i + 1)).slice(-2) + ': ' + rows.slice(i, i + 8).join(' '));
  return { cells: cells, mismatches: mismatches, rows: rows, doors: DOORS.map(function(d){ return { name: d[0], want: d[1], pending: d[5] || '' }; }) };
};
