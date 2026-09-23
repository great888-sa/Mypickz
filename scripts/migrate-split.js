// MyPickz — scripts/migrate-split.js (M4.26 · أ-١٤) — الهجرة بسكربت لا بالتطبيق (مبدأ الصفر)
// يحوّل كل مستند userCityLists من {categories} إلى: الأم = فهرس (index · splitV: 1 · بلا categories) + مستند فرعي لكل تصنيف بـ userCityListCats.
// التشغيل (بجهاز المالك): npm i firebase-admin && GOOGLE_APPLICATION_CREDENTIALS=key.json node scripts/migrate-split.js [--dry]
// قبل التشغيل: نسخة احتياطية (تصدير Firestore) + نشر v3.10 الانتقالية باللوحة. بعده: التحقق بالعدّ يُطبع لكل قائمة؛ أي اختلاف يوقف السكربت قبل حذف categories.
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const DRY = process.argv.includes('--dry');
const PRIVATE = ['hospitals_clinics', 'personal_home', 'personal_work', 'personal_family', 'personal_relatives', 'personal_friends', 'others'];
function liveCount(cats){ return Object.values(cats || {}).reduce((a, e) => a + ((e && e.places) || []).filter(p => p && (p.name || p.url)).length, 0); }
(async () => {
  const snap = await db.collection('userCityLists').get();
  let done = 0, skipped = 0, failed = 0;
  for (const doc of snap.docs){
    const d = doc.data(); const id = doc.id;
    if (d.splitV === 1 && !d.categories){ skipped++; continue; }
    const cats = (d.categories && typeof d.categories === 'object') ? d.categories : {};
    const before = liveCount(cats);
    const index = []; const writes = [];
    for (const catId of Object.keys(cats)){
      if (PRIVATE.includes(catId)) continue; // لا فرعي للخاصة (لا تُخزَّن بالعامة أصلًا)
      const e = cats[catId] || {}; const places = (e.places || []).filter(p => p && (p.name || p.url));
      places.forEach(p => index.push({ id: p.id || '', name: p.name || '', catId: catId, top: p.topPlace === true ? true : undefined, at: p.topAt || p.updatedAt || undefined }));
      writes.push({ ref: db.collection('userCityListCats').doc(id + '_' + catId), data: { ownerId: d.ownerId, cityId: d.cityId, catId: catId, public: d.public === true, sharedWith: d.sharedWith || [], places: places, active: e.active !== false, updatedAt: Date.now() } });
    }
    const after = index.length;
    if (after !== before){ console.error('MISMATCH', id, before, after); failed++; continue; }
    console.log((DRY ? '[dry] ' : '') + id + ' → cats ' + writes.length + ' · places ' + after);
    if (DRY) continue;
    // دفعات ≤ ٥٠ للفرعية، ثم الأم (الفهرس + splitV، وحذف categories)
    for (let i = 0; i < writes.length; i += 50){ const b = db.batch(); writes.slice(i, i + 50).forEach(w => b.set(w.ref, w.data)); await b.commit(); }
    const cleanIndex = index.map(x => { const o = { id: x.id, name: x.name, catId: x.catId }; if (x.top) o.top = true; if (x.at) o.at = x.at; return o; });
    await doc.ref.set({ index: cleanIndex, splitV: 1, categories: admin.firestore.FieldValue.delete() }, { merge: true });
    done++;
  }
  console.log('DONE migrated=' + done + ' skipped=' + skipped + ' failed=' + failed);
  process.exit(failed ? 1 : 0);
})();
