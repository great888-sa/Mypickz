// MyPickz — scripts/migrate-directory.js (ز-١-ج-١): هجرة أماكن الدليل (cities/{id}.links) إلى قوائم المالك بوصفه منتقيًا، بمعرّف المعجم لكل مدينة، بالشكل المقسَّم نفسه
// التشغيل (بجهاز المالك): GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/migrate-directory.js --owner=<UID> [--dry]
// المدخلات: scripts/eval/directory-map.json (مدن الدليل: المعرّف · الاسم · الدولة) · cities/<CC>.json (المعجم المُثرى) · قبل التشغيل: نسخة احتياطية من cities · لا حذف لـcities هنا أبدًا
const admin = require('firebase-admin'); const fs = require('fs');
admin.initializeApp(); const db = admin.firestore();
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const OWNER = arg('owner', ''), DRY = process.argv.includes('--dry'); if (!OWNER){ console.error('--owner=<UID> required'); process.exit(2); }
const CC = { 'France': 'FR', 'Spain': 'ES', 'UK': 'GB', 'United Kingdom': 'GB', 'England': 'GB', 'Scotland': 'GB', 'Switzerland': 'CH', 'Italy': 'IT', 'Saudi Arabia': 'SA', 'Saudi': 'SA', 'KSA': 'SA', 'UAE': 'AE', 'United Arab Emirates': 'AE', 'Bahrain': 'BH', 'Qatar': 'QA', 'Kuwait': 'KW', 'Oman': 'OM', 'Lebanon': 'LB', 'Egypt': 'EG', 'Jordan': 'JO', 'Morocco': 'MA', 'Greece': 'GR', 'USA': 'US', 'United States': 'US', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI', 'Turkey': 'TR', 'Germany': 'DE', 'Netherlands': 'NL', 'Belgium': 'BE', 'Austria': 'AT', 'Portugal': 'PT', 'Ireland': 'IE', 'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Poland': 'PL', 'Hungary': 'HU', 'Croatia': 'HR', 'Cyprus': 'CY', 'Malta': 'MT', 'Monaco': 'MC', 'Iceland': 'IS' };
const CAT_ID_MAP = { coffee_bakery: 'coffee', fine_lebanese: 'lebanese', fine_italian: 'italian', fine_japanese: 'japanese', taco: 'other_cuisine', shawarma: 'sandwich' };
const PRIVATE = ['hospitals_clinics', 'personal_home', 'personal_work', 'personal_family', 'personal_relatives', 'personal_friends', 'others'];
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
const ISLANDS = fs.existsSync('scripts/eval/islands.json') ? JSON.parse(fs.readFileSync('scripts/eval/islands.json', 'utf8')).islands : [];
function gazFind(name, country){ const isl = ISLANDS.find(a => [a.n].concat(a.a || [], a.ar ? [a.ar] : []).some(x => norm(x) === norm(name))); if (isl) return { id: isl.id, n: isl.n, cc: isl.cc, lat: isl.lat, lng: isl.lng, p: 0, island: true }; // الجزر أولًا (مايوركا …)
  const cc = CC[country] || (/^[A-Z]{2}$/.test(country || '') ? country : ''); const files = cc ? ['cities/' + cc + '.json'] : fs.readdirSync('cities').filter(f => /^[A-Z]{2}\.json$/.test(f)).map(f => 'cities/' + f); let best = null;
  for (const f of files){ if (!fs.existsSync(f)) continue; let arr; try{ arr = JSON.parse(fs.readFileSync(f, 'utf8')); }catch(_){ continue; } if (!Array.isArray(arr)) continue; // ملفات المعجم قوائم؛ غيرها يُتجاهل
    for (const e of arr){ if (!e || !e.n) continue; const names = [e.n].concat(e.a || [], e.ar ? [e.ar] : []); if (names.some(x => norm(x) === norm(name))){ if (!best || (e.p || 0) > (best.p || 0)) best = Object.assign({ cc: f.slice(7, 9) }, e); } } }
  return best; }
function bucketOf(){ return null; }
(async () => {
  const map = JSON.parse(fs.readFileSync('scripts/eval/directory-map.json', 'utf8')).cities;
  try{ const cl = await db.collection('settings').doc('cities-list').get(); if (cl.exists) (cl.data().cities || []).forEach(c => { if (c && c.id && !map.find(m => m.id === c.id)) map.push({ id: c.id, name: c.name, country: c.country || '' }); }); console.log('directory cities from settings/cities-list:', map.length); }catch(e){ console.log('cities-list not readable', String(e).slice(0, 80)); } // مدن الدليل المضافة: أسماؤها ودولها بمستند القائمة
  const snap = await db.collection('cities').get(); let totalBefore = 0, totalAfter = 0, moved = 0; const unmatched = [];
  for (const doc of snap.docs){
    const data = doc.data() || {}; const links = data.links || {}; const dir = map.find(c => c.id === doc.id) || { id: doc.id, name: data.cityName || data.name || doc.id, country: data.country || '' }; // خارج الدليل: الاسم والدولة من المستند
    const places = Object.keys(links).reduce((a, k) => a + ((links[k] && links[k].places) || []).filter(p => p && (p.name || p.url)).length, 0);
    if (!places){ console.log(doc.id, 'no places — skipped'); continue; } totalBefore += places;
    const g = gazFind(dir.name, dir.country); if (!g){ console.log('UNMATCHED', doc.id, '·', dir.name, '·', dir.country || '(no country)', '· places', places, '— add it to directory-map.json (name + country) and rerun'); unmatched.push({ id: doc.id, name: dir.name, country: dir.country, places }); continue; }
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
  const unmatchedPlaces = unmatched.reduce((a, u) => a + u.places, 0);
  console.log('DONE cities=' + moved + ' places before=' + totalBefore + ' after=' + totalAfter + (totalBefore - unmatchedPlaces === totalAfter ? ' ✓' : ' ✗ MISMATCH') + (unmatched.length ? ' · UNMATCHED cities=' + unmatched.length + ' places=' + unmatchedPlaces + ' (not migrated)' : ''));
  process.exit(totalBefore - unmatchedPlaces === totalAfter ? 0 : 1);
})();
