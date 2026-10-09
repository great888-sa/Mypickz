// MyPickz — scripts/purge-directory.js (ر٧٣-د · ٩ أكتوبر ٢٠٢٦): حذف مجموعة الدليل الموروثة cities بعد تحقق آلي أن الهجرة (ز-١-ج-١) كاملة
// التشغيل بالناشر فقط (سير Migrate directory · الوضع purge) بالمفتاح المؤقت FIREBASE_SA_KEY الذي يُحذف في اليوم نفسه · النسخة الاحتياطية cities-backup.json تُؤخذ بالسير قبل هذا السكربت
// المراحل: (١) التحقق على مستوى المكان (لا العدد — قوائم المالك حية منذ الهجرة ويُنقل فيها بين المدن): كل مكان عام بالدليل موجود بأي قائمة للمالك بالرابط (أو بالاسم إن لم يكن له رابط)؛
//              ومع ذلك تُطبع القائمة المهاجَرة لكل مدينة (migratedFrom) · مكان مفقود من كل القوائم = توقف بلا حذف ويُسمّى (--allow-missing يتجاوزه بقرار المالك)
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
  const byFrom = {}; lists.forEach(d => { const x = d.data() || {}; if (x.migratedFrom) byFrom[x.migratedFrom] = { id: d.id, city: x.cityName }; });
  console.log('owner lists with migratedFrom:', Object.keys(byFrom).length);
  const cats = await db.collection('userCityListCats').where('ownerId', '==', OWNER).get(); // كل أماكن المالك بكل مدنه — المكان يُعدّ محفوظًا أينما كان
  const haveUrl = new Map(), haveName = new Map(), haveId = new Map(); let ownerPlaces = 0; const ownerByCity = {}; // مكان المالك: {name,url,id,cat,matched}
  const normU = u => String(u || '').trim().replace(/\/+$/, '').toLowerCase(); const normN = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
  cats.forEach(d => { const x = d.data() || {}; (x.places || []).forEach(p => { if (!p) return; ownerPlaces++; const rec = { name: p.name || '', url: p.url || '', id: p.id || '', cat: x.catId, matched: false }; (ownerByCity[x.cityId] = ownerByCity[x.cityId] || []).push(rec); if (p.url) haveUrl.set(normU(p.url), { city: x.cityId, rec }); if (p.name) haveName.set(normN(p.name), { city: x.cityId, rec }); if (p.id) haveId.set(String(p.id), { city: x.cityId, rec }); }); });
  console.log('owner category docs:', cats.size, '· places:', ownerPlaces);
  const ALLOW_MISSING = process.argv.includes('--allow-missing');
  let ok = true; let publicPlaces = 0, privatePlaces = 0, found = 0, moved = 0, empty = 0; const missing = [];
  for (const doc of snap.docs){
    const links = (doc.data() || {}).links || {}; let pub = [], priv = 0;
    Object.keys(links).forEach(k => { const ps = ((links[k] && links[k].places) || []).filter(p => p && (p.name || p.url)); if (PRIVATE.includes(k)) priv += ps.length; else pub = pub.concat(ps); });
    publicPlaces += pub.length; privatePlaces += priv;
    if (!pub.length){ empty++; console.log('  ' + doc.id + ': no public places' + (priv ? ' · private (test addresses) ' + priv + ' — dropped with the collection, kept in backup' : '')); continue; }
    const m = byFrom['cities/' + doc.id]; const target = m ? m.id.slice(OWNER.length + 1) : null;
    let f = 0, mv = 0; const miss = [];
    pub.forEach(p => { const hit = (p.url && haveUrl.get(normU(p.url))) || (p.name && haveName.get(normN(p.name))) || (p.id && haveId.get(String(p.id))) || null; if (!hit){ miss.push(p.name || p.url); return; } f++; hit.rec.matched = true; if (target && hit.city !== target) mv++; }); /* المطابقة بالرابط ثم الاسم ثم المعرّف — أيها وُجد */
    found += f; moved += mv; missing.push(...miss.map(n => doc.id + ': ' + n));
    const line = '  ' + (miss.length ? '✗ ' : '✓ ') + doc.id + ' → ' + (m ? m.id + ' (' + m.city + ')' : 'NO migrated list') + ' · places ' + pub.length + ' · found ' + f + (mv ? ' (moved to another city ' + mv + ')' : '') + (miss.length ? ' · MISSING ' + miss.length + ': ' + miss.join(' | ') : '');
    console.log(line); if (miss.length) ok = ALLOW_MISSING; if (!m) console.log('    note: no list carries migratedFrom=cities/' + doc.id + ' (places matched elsewhere)');
    if (miss.length && target){ const extra = (ownerByCity[target] || []).filter(r => !r.matched); console.log('    your places in this city that match nothing in the old directory (' + extra.length + '): ' + (extra.map(r => r.name + (r.url ? ' <' + r.url + '>' : '') + ' [' + r.cat + ']').join(' | ') || '(none)')); } /* الوجه الآخر للمقارنة — للحكم بالعين: إعادة تسمية/رابط جديد أم فقدان حقيقي */
  }
  console.log('verify: cities ' + snap.size + ' · with public places ' + (snap.size - empty) + ' · public places ' + publicPlaces + ' · found in owner lists ' + found + (moved ? ' (moved between cities ' + moved + ')' : '') + ' · missing ' + missing.length + ' · private (dropped) ' + privatePlaces);
  if (missing.length && ALLOW_MISSING) console.log('MISSING places accepted by --allow-missing (owner decision): ' + missing.join(' | '));
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
