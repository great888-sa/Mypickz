// MyPickz — scripts/maintain.js — الصيانة ربع السنوية (المواصفة أ-٦ §١٨-د)
// (١) إعادة اشتقاق followerCount · copyCount · bookmarkCount · saveCount من سجلاتها  (٢) تجميع الإحصاء اليومي الأقدم من ٣٦٥ يومًا  (٣) فحص أحجام الفرعية فوق ٧٠٠ كيلوبايت
// التشغيل: GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/maintain.js [--dry] [--days=365]
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const DRY = process.argv.includes('--dry');
const DAYS = parseInt((process.argv.find(a => a.startsWith('--days=')) || '--days=365').split('=')[1], 10);
async function countBy(coll, field){ const m = {}; const s = await db.collection(coll).get(); s.forEach(d => { const k = d.data()[field]; if (k) m[k] = (m[k] || 0) + 1; }); return m; }
async function countByDocKey(coll, prefixSplit){ const m = {}; const s = await db.collection(coll).get(); s.forEach(d => { const key = d.id.split(prefixSplit)[1]; if (key) m[key] = (m[key] || 0) + 1; }); return m; }
async function fixCounter(coll, field, expected){ const s = await db.collection(coll).get(); let fixed = 0; for (const d of s.docs){ const want = expected[d.id] || 0; const have = d.data()[field] || 0; if (want !== have){ console.log((DRY ? '[dry] ' : '') + coll + '/' + d.id + ' ' + field + ' ' + have + ' → ' + want); if (!DRY) await d.ref.set({ [field]: want }, { merge: true }); fixed++; } } return fixed; }
(async () => {
  const followers = await countBy('follows', 'curatorUid');
  const copies = await countByDocKey('copies', '__');
  const listBm = await countByDocKey('listBookmarks', '__');
  const tripSv = await countByDocKey('tripSaves', '__');
  console.log('followerCount fixed: ' + await fixCounter('communityProfiles', 'followerCount', followers));
  console.log('list copyCount fixed: ' + await fixCounter('userCityLists', 'copyCount', copies));
  console.log('trip copyCount fixed: ' + await fixCounter('trips', 'copyCount', copies));
  console.log('list bookmarkCount fixed: ' + await fixCounter('userCityLists', 'bookmarkCount', listBm));
  console.log('trip saveCount fixed: ' + await fixCounter('trips', 'saveCount', tripSv));
  // (٢) الإحصاء اليومي الأقدم من DAYS يومًا → يُجمَّع بمستند الكيان الشهري ثم يُحذف
  const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
  for (const coll of ['stats_curators', 'stats_lists', 'stats_trips', 'stats_cities']){
    const s = await db.collection(coll).get(); let rolled = 0;
    for (const d of s.docs){ const m = d.id.match(/^(.+)__(\d{4}-\d{2})-\d{2}$/); if (!m || m[0].slice(-10) >= cutoff) continue; const target = db.collection(coll).doc(m[1] + '__' + m[2]); const data = d.data(); const inc = {}; Object.keys(data).forEach(k => { if (typeof data[k] === 'number') inc[k] = admin.firestore.FieldValue.increment(data[k]); }); if (!DRY){ await target.set(inc, { merge: true }); await d.ref.delete(); } rolled++; }
    console.log(coll + ' rolled up: ' + rolled);
  }
  // (٣) أحجام الفرعية
  const cats = await db.collection('userCityListCats').get(); let big = 0;
  cats.forEach(d => { const size = Buffer.byteLength(JSON.stringify(d.data()), 'utf8'); if (size > 700 * 1024){ console.log('BIG ' + d.id + ' ' + Math.round(size / 1024) + ' KB'); big++; } });
  console.log('big cat docs: ' + big + ' · DONE' + (DRY ? ' (dry)' : ''));
})();
