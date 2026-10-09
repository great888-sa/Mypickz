// MyPickz — scripts/purge-directory.js (ر٧٣-د · ٩ أكتوبر ٢٠٢٦): حذف مجموعة الدليل الموروثة cities بعد تحقق آلي أن الهجرة (ز-١-ج-١) كاملة
// التشغيل بالناشر فقط (سير Migrate directory · الوضع purge) بالمفتاح المؤقت FIREBASE_SA_KEY الذي يُحذف في اليوم نفسه · النسخة الاحتياطية cities-backup.json تُؤخذ بالسير قبل هذا السكربت
// المراحل: (١) التحقق — لكل مستند cities فيه أماكن عامة توجد قائمة للمالك بـmigratedFrom مطابق وعدد فهرسها = عدد أماكنه العامة؛ أي خلل = توقف بلا حذف
//          (٢) الحذف على دفعات ≤ ٥٠٠: مستندات cities كلها (ومنها العناوين التجريبية الثلاثة بالرياض — قرار المالك ٩ أكتوبر: تجريبية، تبقى بالنسخة الاحتياطية فقط)
//              + مستندات الإعدادات التي زالت قراءتها من التطبيق بـr73p: settings/cities-list · settings/countries-list · settings/publish-status
//          (٣) التقرير · --dry = التحقق والتقرير بلا حذف
'use strict';
const admin = require('firebase-admin'); admin.initializeApp(); const db = admin.firestore();
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const OWNER = arg('owner', ''), DRY = process.argv.includes('--dry'); if (!OWNER){ console.error('--owner=<UID> required'); process.exit(2); }
const PRIVATE = ['hospitals_clinics', 'personal_home', 'personal_work', 'personal_family', 'personal_relatives', 'personal_friends'];
const SETTINGS_DOCS = ['cities-list', 'countries-list', 'publish-status'];
(async () => {
  const snap = await db.collection('cities').get();
  console.log('cities docs:', snap.size, DRY ? '(dry — verify only)' : '');
  const lists = await db.collection('userCityLists').where('ownerId', '==', OWNER).get();
  const byFrom = {}; lists.forEach(d => { const x = d.data() || {}; if (x.migratedFrom) byFrom[x.migratedFrom] = { id: d.id, index: Array.isArray(x.index) ? x.index.length : -1, city: x.cityName }; });
  console.log('owner lists with migratedFrom:', Object.keys(byFrom).length);
  let ok = true; let publicPlaces = 0, privatePlaces = 0, verified = 0, empty = 0;
  for (const doc of snap.docs){
    const links = (doc.data() || {}).links || {}; let pub = 0, priv = 0;
    Object.keys(links).forEach(k => { const ps = ((links[k] && links[k].places) || []).filter(p => p && (p.name || p.url)); if (PRIVATE.includes(k)) priv += ps.length; else pub += ps.length; });
    publicPlaces += pub; privatePlaces += priv;
    if (!pub){ empty++; console.log('  ' + doc.id + ': no public places' + (priv ? ' · private (test addresses) ' + priv + ' — dropped with the collection, kept in backup' : '')); continue; }
    const m = byFrom['cities/' + doc.id];
    if (!m){ ok = false; console.log('  ✗ ' + doc.id + ': ' + pub + ' public places but NO migrated list for owner — ABORT'); continue; }
    if (m.index !== pub){ ok = false; console.log('  ✗ ' + doc.id + ' → ' + m.id + ' (' + m.city + '): index ' + m.index + ' ≠ public places ' + pub + ' — ABORT'); continue; }
    verified++; console.log('  ✓ ' + doc.id + ' → ' + m.id + ' (' + m.city + ') · ' + pub + ' places');
  }
  console.log('verify: cities ' + snap.size + ' · with public places ' + (snap.size - empty) + ' · verified ' + verified + ' · public places ' + publicPlaces + ' · private (dropped) ' + privatePlaces);
  if (!ok){ console.log('VERIFY FAILED — nothing deleted'); process.exit(1); }
  const settingsRefs = []; for (const id of SETTINGS_DOCS){ const d = await db.collection('settings').doc(id).get(); if (d.exists) settingsRefs.push(d.ref); }
  console.log('settings docs to delete:', settingsRefs.map(r => r.id).join(', ') || '(none)');
  if (DRY){ console.log('DRY DONE — would delete cities ' + snap.size + ' + settings ' + settingsRefs.length); process.exit(0); }
  const refs = snap.docs.map(d => d.ref).concat(settingsRefs); let deleted = 0;
  for (let i = 0; i < refs.length; i += 400){ const b = db.batch(); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); deleted += Math.min(400, refs.length - i); }
  const left = await db.collection('cities').limit(1).get();
  console.log('DONE deleted ' + deleted + ' docs (cities ' + snap.size + ' + settings ' + settingsRefs.length + ') · cities remaining: ' + left.size + (left.size ? ' ✗' : ' ✓') + ' · backup: cities-backup.json artifact of this run');
  process.exit(left.size ? 1 : 0);
})().catch(e => { console.error('ERROR', e && e.message || e); process.exit(1); });
