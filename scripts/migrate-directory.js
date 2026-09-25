// MyPickz — scripts/migrate-directory.js (ز-١-ج-١): هجرة أماكن الدليل (cities/{id}.links) إلى قوائم المالك بوصفه منتقيًا، بمعرّف المعجم لكل مدينة، بالشكل المقسَّم نفسه
// التشغيل (بجهاز المالك): GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/migrate-directory.js --owner=<UID> [--dry]
// المدخلات: scripts/eval/directory-map.json (مدن الدليل: المعرّف · الاسم · الدولة) · cities/<CC>.json (المعجم المُثرى) · قبل التشغيل: نسخة احتياطية من cities · لا حذف لـcities هنا أبدًا
const admin = require('firebase-admin'); const fs = require('fs');
admin.initializeApp(); const db = admin.firestore();
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const OWNER = arg('owner', ''), DRY = process.argv.includes('--dry'); if (!OWNER){ console.error('--owner=<UID> required'); process.exit(2); }
const CC = { 'France': 'FR', 'Spain': 'ES', 'UK': 'GB', 'United Kingdom': 'GB', 'Switzerland': 'CH', 'Italy': 'IT', 'Saudi Arabia': 'SA', 'UAE': 'AE', 'Bahrain': 'BH', 'Qatar': 'QA', 'Kuwait': 'KW', 'Lebanon': 'LB', 'Egypt': 'EG', 'Greece': 'GR', 'USA': 'US', 'Sweden': 'SE', 'Turkey': 'TR' };
const CAT_ID_MAP = { coffee_bakery: 'coffee', fine_lebanese: 'lebanese', fine_italian: 'italian', fine_japanese: 'japanese', taco: 'other_cuisine', shawarma: 'sandwich' };
const PRIVATE = ['hospitals_clinics', 'personal_home', 'personal_work', 'personal_family', 'personal_relatives', 'personal_friends', 'others'];
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
function gazFind(name, country){ const cc = CC[country] || ''; const files = cc ? ['cities/' + cc + '.json'] : fs.readdirSync('cities').filter(f => f.endsWith('.json')).map(f => 'cities/' + f); let best = null;
  for (const f of files){ if (!fs.existsSync(f)) continue; for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))){ const names = [e.n].concat(e.a || [], e.ar ? [e.ar] : []); if (names.some(x => norm(x) === norm(name))){ if (!best || e.p > best.p) best = Object.assign({ cc: f.slice(7, 9) }, e); } } }
  return best; }
function bucketOf(){ return null; }
(async () => {
  const map = JSON.parse(fs.readFileSync('scripts/eval/directory-map.json', 'utf8')).cities;
  const snap = await db.collection('cities').get(); let totalBefore = 0, totalAfter = 0, moved = 0;
  for (const doc of snap.docs){
    const links = (doc.data() || {}).links || {}; const dir = map.find(c => c.id === doc.id) || { id: doc.id, name: doc.id, country: '' };
    const places = Object.keys(links).reduce((a, k) => a + ((links[k] && links[k].places) || []).filter(p => p && (p.name || p.url)).length, 0);
    if (!places){ console.log(doc.id, 'no places — skipped'); continue; } totalBefore += places;
    const g = gazFind(dir.name, dir.country); if (!g){ console.error('NO GAZETTEER MATCH for', doc.id, dir.name, dir.country, '— fix directory-map.json'); process.exit(1); }
    const cityId = String(g.id); const cats = {}; Object.keys(links).forEach(k => { const e = links[k]; if (!e || !Array.isArray(e.places)) return; let id = CAT_ID_MAP[k] || k; if (PRIVATE.includes(id)) return; const ps = e.places.filter(p => p && (p.name || p.url)).map(p => Object.assign({}, p, { id: p.id || ('d_' + Math.random().toString(36).slice(2, 10)) })); if (!ps.length) return; (cats[id] = cats[id] || { active: true, places: [] }).places.push(...ps); });
    const index = []; Object.keys(cats).forEach(k => cats[k].places.forEach(p => { const o = { id: p.id, name: p.name || '', catId: k }; if (p.topPlace === true) o.top = true; if (p.topAt || p.updatedAt) o.at = p.topAt || p.updatedAt; index.push(o); }));
    totalAfter += index.length; moved++;
    console.log((DRY ? '[dry] ' : '') + doc.id + ' → ' + cityId + ' (' + g.n + ', ' + g.cc + ') · cats ' + Object.keys(cats).length + ' · places ' + index.length);
    if (DRY) continue;
    const parentId = OWNER + '_' + cityId; const b = db.batch();
    b.set(db.collection('userCityLists').doc(parentId), { ownerId: OWNER, cityId: cityId, cityName: g.n, country: g.cc, public: true, sharedWith: [], catsV: 3, splitV: 1, index: index, hasTop: index.some(x => x.top), geoSources: [], flagsUsed: [], bookmarkCount: 0, viewCount: 0, copyCount: 0, updatedAt: Date.now(), migratedFrom: 'cities/' + doc.id }, { merge: true });
    Object.keys(cats).forEach(k => b.set(db.collection('userCityListCats').doc(parentId + '_' + k), { ownerId: OWNER, cityId: cityId, catId: k, public: true, sharedWith: [], active: true, places: cats[k].places, updatedAt: Date.now() }));
    await b.commit();
    await db.collection('communityProfiles').doc(OWNER).set({ publicCityIds: admin.firestore.FieldValue.arrayUnion(cityId), hasAnyPublicContent: true, updatedAt: Date.now() }, { merge: true }); // الملف العام للمالك بوصفه منتقيًا
  }
  console.log('DONE cities=' + moved + ' places before=' + totalBefore + ' after=' + totalAfter + (totalBefore === totalAfter ? ' ✓' : ' ✗ MISMATCH'));
  process.exit(totalBefore === totalAfter ? 0 : 1);
})();
