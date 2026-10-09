/* =========================================================
   0.8) mpData — نواة طبقة العزل · تأسيس ٢٥ أغسطس ٢٠٢٦
   كل نداء منصة جديد يمر من هنا؛ لا نوع من أنواع المزوّد يخرج من الوحدة.
   النطاق: المفكرات والحفوظ وعدّاداتها (v1.40 — القرار ٠٩) والمصادقة والقوائم والرحلات — يتسع بكل دفعة.
   الوحدة لا تعرف الواجهة ولا تعرض رسائل؛ الأخطاء تُرمى للمستدعي كما هي.
   ========================================================= */
const mpData = (function(){
  const inc = function(n){ return firebase.firestore.FieldValue.increment(n); };
  function listDerived(data){ // r72m (M4.25): hasTop · geoSources · flagsUsed من أماكن القائمة — تُكتب مع الحفظ، وتُحدَّث كلما تغيّرت الأماكن
    const cats = (data && data.categories && typeof data.categories === 'object') ? data.categories : null; if (!cats) return {};
    let hasTop = false; const geo = {}, flags = {};
    Object.keys(cats).forEach(function(k){ ((cats[k] && cats[k].places) || []).forEach(function(pl){ if (!pl) return; if (pl.topPlace === true) hasTop = true; if (pl.geo && pl.geo.source) geo[pl.geo.source] = true; (pl.flags || []).forEach(function(f){ flags[f] = true; }); }); });
    return { hasTop: hasTop, geoSources: Object.keys(geo), flagsUsed: Object.keys(flags) };
  }
  const del = function(){ return firebase.firestore.FieldValue.delete(); };
  const col = function(name){ return db.collection(name); };
  // القرار ١٢: رفض النقص عند الصفر (الأرضية بالقواعد ٣٫٦) يُبتلع — السحب تم والعدّاد صفر؛ غيره يُرمى
  const swallowFloor = function(e, delta){ if (delta < 0 && e && e.code === 'permission-denied') return; throw e; };
  return {
    // v1.40 · القرار 	٦٩: مفكرة المكان توثيقيًّا داخل مستند المستخدم الخاص (لا عدّاد) — حقل placeBookmarks بـuserLists
    bookmarks: {
      setPlace: function(uid, pid, data){
        const patch = { placeBookmarks: {} };
        patch.placeBookmarks[pid] = (data === null) ? del() : data;
        return col('userLists').doc(uid).set(patch, { merge: true });
      },
      // مفكرة القائمة — سجل listBookmarks/{uid}__{listId} + عدّاد bookmarkCount مربوطًا بدفعة ذرّية واحدة (قواعد ٣٫٨)
      // بطاقة المصفوفة: الحقل الوحيد at والهوية بالمعرّف {uid}__{listId} — لا حقول تُستعلم («كم لا مَن»)
      toggleList: function(uid, ownerUid, cityId, on){
        const listId = ownerUid + '_' + cityId;
        const rec = col('listBookmarks').doc(uid + '__' + listId);
        const listRef = col('userCityLists').doc(listId);
        const b = db.batch();
        const mirror = { listBookmarkIds: {} };                 // ر٥٨: مرآة المعرّفات بمستندك — الاستعلام على السجلات غير مُثبَت بالقواعد قصدًا
        mirror.listBookmarkIds[listId] = on ? true : del();
        // ر٦٩ي (N-039): دفعة واحدة ذرّية — القواعد M4.24.1 تفحص السجل بـexistsAfter فترى ما بالدفعة
        if (on){ b.set(rec, { at: firebase.firestore.FieldValue.serverTimestamp() }); b.set(listRef, { bookmarkCount: inc(1) }, { merge: true }); }
        else { b.delete(rec); b.set(listRef, { bookmarkCount: inc(-1) }, { merge: true }); }
        b.set(col('userLists').doc(uid), mirror, { merge: true });
        return b.commit().catch(function(e){ return swallowFloor(e, on ? 1 : -1); });
      },
      // سجلاتي بمدى معرّف المستند (لا حقل هوية يُستعلم) — uid بلا شرطة سفلية فالقطع عند أول "__" ثم أول "_"
      // ر٥٨ (مسار degraded): حذف السجل وحده + محو مفتاح المرآة — دفعة واحدة، فلا صف شبح يعود
      removeRecord: function(uid, listId){
        const b = db.batch();
        b.delete(col('listBookmarks').doc(uid + '__' + listId));
        const mirror = { listBookmarkIds: {} }; mirror.listBookmarkIds[listId] = del();
        b.set(col('userLists').doc(uid), mirror, { merge: true });
        return b.commit();
      }
    },
    // حفظ الرحلة — سجل tripSaves/{uid}__{tripId} + عدّاد saveCount مربوطًا (قواعد ٣٫٨)
    tripSaves: {
      // بطاقة المصفوفة: «بنفس أحكام سجل المفكرة حرفيًّا» — الحقل الوحيد at
      toggle: function(uid, tripId, on){
        const rec = col('tripSaves').doc(uid + '__' + tripId);
        const tripRef = col('trips').doc(tripId);
        const b = db.batch();
        const mirror = { tripSaveIds: {} };                     // ر٥٨: مرآة كمثيلتها بمفكرة القوائم
        mirror.tripSaveIds[tripId] = on ? true : del();
        // ر٦٩ي (N-039): دفعة واحدة ذرّية (M4.24.1 · existsAfter)
        if (on){ b.set(rec, { at: firebase.firestore.FieldValue.serverTimestamp() }); b.set(tripRef, { saveCount: inc(1) }, { merge: true }); }
        else { b.delete(rec); b.set(tripRef, { saveCount: inc(-1) }, { merge: true }); }
        b.set(col('userLists').doc(uid), mirror, { merge: true });
        return b.commit().catch(function(e){ return swallowFloor(e, on ? 1 : -1); });
      },
      // ر٦١ (التسوية): مفكرة رحلتك الذاتية — خريطة بمستندك، بلا عدّاد وبلا سجل (نمط مفكرة المكان)
      setSelf: function(uid, tripId, on){
        const patch = { tripSelfBookmarks: {} };
        patch.tripSelfBookmarks[tripId] = on ? true : firebase.firestore.FieldValue.delete();
        return col('userLists').doc(uid).set(patch, { merge: true });
      },
      removeRecord: function(uid, tripId){
        const b = db.batch();
        b.delete(col('tripSaves').doc(uid + '__' + tripId));
        const mirror = { tripSaveIds: {} }; mirror.tripSaveIds[tripId] = del();
        b.set(col('userLists').doc(uid), mirror, { merge: true });
        return b.commit();
      }
    },
    placeCounts: {
      // v1.40 · القرار ٠٩: placeFavoriteCounts دلالتها عدّاد الحفظ (saved by) — كاتبها فعل Save بالمرحلة الثالثة
      top: async function(limit){
        const snap = await col('placeFavoriteCounts').orderBy('count', 'desc').limit(limit || 30).get();
        const rows = []; snap.forEach(function(doc){ const d = doc.data(); if (d && d.count > 0) rows.push(d); }); return rows;
      },
      // تحديث العدّاد وحده أولًا (يجتاز تجميد الاسم والرابط بقواعد ٣٫٤+)؛
      // وعند غياب المستند: إنشاؤه بالحقول الثلاثة كاملة، وللزيادة فقط.
      bump: async function(docId, name, url, delta){
        const ref = col('placeFavoriteCounts').doc(docId);
        try{
          await ref.update({ count: inc(delta) });
        }catch(e){
          // المنصة تقيّم القواعد قبل فحص الوجود: تحديث مستند غائب يُرفض صلاحيةً (permission-denied) لا "غير موجود".
          // لذلك نتحقق بقراءة واحدة على مسار الفشل فقط؛ غائب + زيادة ⇒ إنشاء كامل، وإلا يُرمى الخطأ الأصلي (أو يُبتلع إن كان أرضية).
          if (delta <= 0) return swallowFloor(e, delta);
          const snap = await ref.get();
          if (snap.exists) throw e;
          await ref.set({ name: name, url: url, count: 1 });
        }
      }
    },
    userLists: {
      remove: function(uid){ return col('userLists').doc(uid).delete(); },
      merge: function(uid, data){ return col('userLists').doc(uid).set(data, { merge: true }); },
      get: function(uid){ return col('userLists').doc(uid).get(); }, /* ر٧٣-أب (٢) */
      // خ٢: فهرس المدن التي فيها عناوين خاصة — قراءة واحدة بدل مسح المدن كلها
      addPrivateCity: function(uid, cityId){ return col('userLists').doc(uid).set({ privateCities: firebase.firestore.FieldValue.arrayUnion(cityId) }, { merge: true }); }
    },
    users: {
      all: async function(){ const snap = await col('users').get(); const rows = []; snap.forEach(function(d){ rows.push({ uid: d.id, ...d.data() }); }); return rows; }, // ر٧٢-أ-١ب (المالك)
      remove: function(uid){ return col('users').doc(uid).delete(); }, // ر٥٩
      flag: function(uid, field){
        const d = {}; d[field] = true;
        return col('users').doc(uid).set(d, { merge: true });
      },
      merge: function(uid, data){ return col('users').doc(uid).set(data, { merge: true }); },
      get: function(uid){ return col('users').doc(uid).get(); } /* ر٧٣-أب (٢) */
    },
    lists: {
      // v1.40 · ق٣-٠٧: favoriteCount مجمّد بالقواعد ٣٫٨ — لا كاتب له بالكود
      // عدّاد مشاهدات القائمة (ق٠١-١٩ — فُتح بـ٣٫٨): زائر يفتح قائمة شخص
      bumpView: function(ownerUid, cityId){
        return col('userCityLists').doc(ownerUid + '_' + cityId).set({ viewCount: inc(1) }, { merge: true }).catch(function(){});
      }
    },
    listDerived: listDerived, // r72m: مُصدَّرة للمحاكاة
    fieldInc: function(n){ return inc(n); }, /* ر٧٣-أب (٢) */
    fieldDelete: function(){ return firebase.firestore.FieldValue.delete(); }, // ر٧٢-أ-١ح: حذف حقل عبر الطبقة (تنظيف الآثار)
    copies: { // r72m (M4.25 ٤): سجل النسخ بإسناد — +١ على المصدر بوجود السجل
      record: function(uid, kind, docKey, coll){
        const b = db.batch(); b.set(col('copies').doc(uid + '__' + docKey), { uid: uid, kind: kind, docKey: docKey, at: firebase.firestore.FieldValue.serverTimestamp() });
        b.set(col(coll).doc(docKey), { copyCount: inc(1) }, { merge: true }); return b.commit();
      },
      removeMine: async function(uid){ const snap = await col('copies').where('uid', '==', uid).get(); const b = db.batch(); snap.forEach(function(d){ b.delete(col('copies').doc(d.id)); }); return b.commit(); }, // r72t (M4.26 ٢)
      recordOnly: function(uid, kind, docKey){ return col('copies').doc(uid + '__' + docKey).set({ uid: uid, kind: kind, docKey: docKey, at: firebase.firestore.FieldValue.serverTimestamp() }); }, // ز-١-ب: نسخ المكان — سجل بلا عدّاد (العدّاد للقائمة والرحلة)
      unrecord: function(uid, docKey, coll){ // r72t (M4.26 ١ — قرار المالك «لحظي»): حذف السجل و −١ بدفعة
        const b = db.batch(); b.delete(col('copies').doc(uid + '__' + docKey)); b.set(col(coll).doc(docKey), { copyCount: inc(-1) }, { merge: true }); return b.commit();
      }
    },
    profiles: {
      curators: async function(limit){ // ر٧٢-أ-١: الدليل — الملفات العامة الموثَّقة (verified يكتبه المالك حصرًا — M4.12)
        const snap = await col('communityProfiles').where('verified', '==', true).limit(limit || 200).get();
        const rows = []; snap.forEach(function(d){ rows.push({ uid: d.id, ...d.data() }); }); return rows;
      },
      get: async function(uid){ const d = await col('communityProfiles').doc(uid).get(); return d.exists ? { uid: uid, ...d.data() } : null; }, // ر٦٥: قراءة ملف واحد (صيد طبقة الشاشة)
      merge: function(uid, data){ return col('communityProfiles').doc(uid).set(data, { merge: true }); },
      remove: function(uid){ return col('communityProfiles').doc(uid).delete(); }
    },
    // ر٥٩ — الحذف التسلسلي: متابعاتي (القراءة بشرط حقل المتابع — استعلام قابل للإثبات)
    follows: {
      set: async function(followerUid, curatorUid, on, curatorHasPublic){ // ر٧٢-أ-٢د: خطوتان كما تفرض القواعد — العدّاد +١ يشترط وجود السجل (exists) فلا يُقبل بالدفعة نفسها
        const id = followerUid + '_' + curatorUid; const b = db.batch(); const rec = col('follows').doc(id);
        if (on) b.set(rec, { followerUid: followerUid, curatorUid: curatorUid, at: firebase.firestore.FieldValue.serverTimestamp() }); else b.delete(rec);
        b.set(col('userLists').doc(followerUid), { following: on ? firebase.firestore.FieldValue.arrayUnion(curatorUid) : firebase.firestore.FieldValue.arrayRemove(curatorUid) }, { merge: true });
        if (curatorHasPublic) b.set(col('communityProfiles').doc(curatorUid), { followerCount: inc(on ? 1 : -1) }, { merge: true }); // r72m (M4.25 ٥): existsAfter — دفعة واحدة؛ والعدّاد يشمل الموثَّقين بلا محتوى
        await b.commit();
        return { counter: !!curatorHasPublic };
      },
      followersOf: async function(curatorUid, limit){ const snap = await col('follows').where('curatorUid', '==', curatorUid).limit(limit || 50).get(); const ids = []; snap.forEach(function(d){ ids.push(d.data().followerUid); }); return ids; }, // للمنتقي عن نفسه (القواعد: الطرفان)
      mineAsFollower: async function(uid){
        const snap = await col('follows').where('followerUid', '==', uid).get();
        const ids = []; snap.forEach(function(d){ ids.push(d.id); }); return ids;
      },
      remove: function(id){ return col('follows').doc(id).delete(); }
    },
    // ٢/أ (٢٦ أغسطس): المصادقة عبر النواة — لا نداء مصادقة مباشرًا خارجها (الحارس يعدّها بسقف صفر)
    cityNotes: { // r72p (M4.25 ٦): رأي المنتقي بالمدينة
      get: async function(uid, cityId){ const d = await col('curatorCityNotes').doc(uid + '__' + cityId).get(); return d.exists ? d.data() : null; },
      save: function(uid, cityId, data){ return col('curatorCityNotes').doc(uid + '__' + cityId).set(Object.assign({ uid: uid, cityId: cityId, updatedAt: Date.now() }, data)); }
    },
    requests: { // r72p (M4.25 ٧): طلب الصيرورة
      mine: async function(uid){ const d = await col('curatorRequests').doc(uid).get(); return d.exists ? d.data() : null; },
      create: function(uid, text){ return col('curatorRequests').doc(uid).set({ uid: uid, text: text, at: Date.now(), status: 'pending' }); },
      all: async function(){ const snap = await col('curatorRequests').get(); const rows = []; snap.forEach(function(d){ rows.push({ id: d.id, ...d.data() }); }); return rows; },
      setStatus: function(uid, status){ return col('curatorRequests').doc(uid).update({ status: status }); },
      removeMine: function(uid){ return col('curatorRequests').doc(uid).delete(); } // r72t (M4.26 ٢)
    },
    reports: { // r72p (M4.25 ٧): البلاغات
      create: function(by, kind, docKey, reason){ const rec = { by: by, kind: kind, reason: reason || '', at: Date.now() }; if (kind !== 'app') rec.docKey = docKey; return col('reports').doc('r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)).set(rec); }, // r72t: app بلا docKey
      all: async function(){ const snap = await col('reports').get(); const rows = []; snap.forEach(function(d){ rows.push({ id: d.id, ...d.data() }); }); return rows; },
      remove: function(id){ return col('reports').doc(id).delete(); },
      removeMine: async function(uid){ const snap = await col('reports').where('by', '==', uid).get(); const b = db.batch(); snap.forEach(function(d){ b.delete(col('reports').doc(d.id)); }); return b.commit(); } // r72t (M4.26 ٢)
    },
    auth: {
      sendVerification: function(){ return auth.currentUser ? auth.currentUser.sendEmailVerification() : Promise.reject(new Error('no user')); }, // r72p (١٠)
      signIn: function(email, pass){ return auth.signInWithEmailAndPassword(email, pass); },
      signUp: function(email, pass){ return auth.createUserWithEmailAndPassword(email, pass); },
      sendReset: function(email){ return auth.sendPasswordResetEmail(email); },
      signOut: function(){ return auth.signOut(); },
      deleteSelf: function(){ return auth.currentUser.delete(); }, // ر٥٩ — خاتمة التتالي (بعد إعادة التوثيق)
      onChange: function(cb){ return auth.onAuthStateChanged(cb); },
      // تأكيد الهوية بكلمة السر (المسار الأول) — المسار الثاني (المزوّد) يُضاف بـ٢/و
      reauthWithPassword: function(pass){
        const u = auth.currentUser;
        if (!u || !u.email) return Promise.reject(new Error('no-user'));
        const cred = firebase.auth.EmailAuthProvider.credential(u.email, pass);
        return u.reauthenticateWithCredential(cred);
      }
    },
    // v3.6 (القرار ٣-ب): المجموعة الخاصة — قراءتها وكتابتها لصاحبها وحده
    privatePlaces: {
      get: async function(uid, cityId){
        const d = await col('userPrivatePlaces').doc(uid + '_' + cityId).get();
        return d.exists ? (d.data().categories || {}) : {};
      },
      save: function(uid, cityId, categories){
        return col('userPrivatePlaces').doc(uid + '_' + cityId).set({ categories: categories, updatedAt: Date.now() }, { merge: true });
      },
      // خ٢: استبدال تصنيف كاملًا (لحذف عنوان) — الكتابة بمسار منقوط تستبدل المصفوفة لا تدمجها
      setCategory: function(uid, cityId, catId, entry){
        const u = {}; u['categories.' + catId] = entry; u.updatedAt = Date.now();
        return col('userPrivatePlaces').doc(uid + '_' + cityId).set({ categories: {}, updatedAt: Date.now() }, { merge: true }).then(() => col('userPrivatePlaces').doc(uid + '_' + cityId).update(u));
      },
      // خ٥/r18: حذف المستند الخاص لمدينة عند حذفها نهائيًا
      remove: function(uid, cityId){
        return col('userPrivatePlaces').doc(uid + '_' + cityId).delete();
      }
    },
    nicknames: { // خ٥/م٢-ب (هجرة انتهازية — التصور المعتمد): قراءة اسم مستعار للمشاركة بالاسم
      get: function(key){ return col('nicknames').doc(key).get(); },
      set: function(key, data){ return col('nicknames').doc(key).set(data); }, /* ر٧٣-أب (٢) */
      remove: function(key){ return col('nicknames').doc(key).delete(); } // ر٥٩ (نشرة التنظيف: حذف ذاتي بحقل الهوية)
    },
    cityLists: { // r72t (M4.26 · أ-١٤): التقسيم — الأم فهرسًا + مستند لكل تصنيف؛ الطبقة تعيد الشكل القديم (categories) لكل الواجهات · انتقالي: مستند قديم بلا splitV يُقرأ كما هو
      _compose: async function(parent, id){ // الأم (+ الفرعية إن كانت مقسَّمة) → مستند بالشكل القديم — r72u: الاستعلام يثبت شرط القراءة (قاعدة Firestore: لا استعلام على قوائم الآخرين بلا قيد public/sharedWith)
        if (!parent) return null; if (parent.cityId && parent.cityName) rememberCity(parent.cityId, parent.cityName, parent.country); if (parent.splitV !== 1) return parent;
        const me = currentUser && currentUser.uid; let q = col('userCityListCats').where('ownerId', '==', parent.ownerId).where('cityId', '==', parent.cityId);
        if (parent.ownerId !== me && !isOwner){ if (parent.public === true) q = q.where('public', '==', true); else if (me && (parent.sharedWith || []).indexOf(me) >= 0) q = q.where('sharedWith', 'array-contains', me); else return Object.assign({}, parent, { categories: {} }); }
        const snap = await q.get();
        const cats = {}; snap.forEach(function(d){ const c = d.data(); cats[c.catId] = { active: c.active !== false, places: c.places || [] }; });
        return Object.assign({}, parent, { categories: cats });
      },
      _indexOf: function(categories){ const ix = []; Object.keys(categories || {}).forEach(function(k){ (((categories[k] || {}).places) || []).forEach(function(p){ if (!p || !(p.name || p.url)) return; const o = { id: p.id || '', name: p.name || '', catId: k }; if (p.topPlace === true) o.top = true; if (p.topAt || p.updatedAt) o.at = p.topAt || p.updatedAt; if (p.updatedAt) o.up = p.updatedAt; /* خ-٦: ختم التعديل وحده — Latest يقرؤه من الفهرس (قرار r73y: المعدَّل لا Top) */ ix.push(o); }); }); return ix; },
      _fromIndex: function(parent){ // للشاشات الجماعية: categories مصغَّرة من الفهرس (اسم · معرّف · top · at) بلا قراءة فرعية
        if (parent && parent.cityId && parent.cityName) rememberCity(parent.cityId, parent.cityName, parent.country);
        if (!parent || parent.splitV !== 1) return parent; const cats = {}; (parent.index || []).forEach(function(e){ (cats[e.catId] = cats[e.catId] || { active: true, places: [] }).places.push({ id: e.id, name: e.name, topPlace: e.top === true, topAt: e.at, updatedAt: e.up, _index: true }); });
        return Object.assign({}, parent, { categories: cats, _indexOnly: true });
      },
      publicLists: async function(){ // ر٦١ (السوق): القوائم العامة — بالفهرس (لا قراءة فرعية)
        const snap = await col('userCityLists').where('public', '==', true).limit(100).get();
        const rows = []; snap.forEach(function(d){ rows.push(mpData.cityLists._fromIndex({ id: d.id, ...d.data() })); }); return rows;
      },
      getIndex: async function(uid, cityId){ const d = await col('userCityLists').doc(uid + '_' + cityId).get(); return d.exists ? mpData.cityLists._fromIndex(d.data()) : null; }, /* خ-٦: الأم وحدها (الفهرس) — للشاشات الجماعية قبل فتح المدينة */
      catDoc: async function(uid, cityId, catId){ const d = await col('userCityListCats').doc(uid + '_' + cityId + '_' + catId).get(); if (!d.exists) return null; const c = d.data(); return { active: c.active !== false, places: c.places || [] }; }, /* خ-٦: مستند تصنيف واحد — Latest والبحث يقرآن المعنيّ فقط لا المدينة كلها */
      get: async function(uid, cityId){ const d = await col('userCityLists').doc(uid + '_' + cityId).get(); return d.exists ? mpData.cityLists._compose(d.data(), d.id) : null; },
      save: async function(uid, cityId, data){ // r72m: المشتقات · r72t: الفرعية + الفهرس بدفعة ذرّية؛ الأم بلا categories
        const id = uid + '_' + cityId; const cats = (data && data.categories) || null; const parent = Object.assign({}, data, listDerived(data));
        if (!cats){ return col('userCityLists').doc(id).set(parent, { merge: true }); }
        delete parent.categories; parent.index = mpData.cityLists._indexOf(cats); parent.splitV = 1;
        const isPublic = data.public === true; const shared = data.sharedWith || [];
        const b = db.batch(); b.set(col('userCityLists').doc(id), Object.assign({}, parent, { categories: del() }), { merge: true });
        Object.keys(cats).forEach(function(k){ const e = cats[k] || {}; b.set(col('userCityListCats').doc(id + '_' + k), { ownerId: uid, cityId: cityId, catId: k, public: isPublic, sharedWith: shared, active: e.active !== false, places: (e.places || []).filter(function(p){ return p && (p.name || p.url); }), updatedAt: Date.now() }); });
        return b.commit();
      },
      setVisibility: async function(uid, cityId, isPublic, shared){ // r72t: نسخة شرط القراءة بالفرعية تتبع الأم
        const id = uid + '_' + cityId; const snap = await col('userCityListCats').where('ownerId', '==', uid).where('cityId', '==', cityId).get(); const b = db.batch();
        b.set(col('userCityLists').doc(id), { public: isPublic, sharedWith: shared || [] }, { merge: true }); snap.forEach(function(d){ b.set(col('userCityListCats').doc(d.id), { public: isPublic, sharedWith: shared || [] }, { merge: true }); }); return b.commit();
      },
      dropCategoryKeys: async function(uid, cityId, keys){ // ر٧٠ط · r72t: حذف الفرعيات القديمة
        const id = uid + '_' + cityId; const b = db.batch(); keys.forEach(function(k){ b.delete(col('userCityListCats').doc(id + '_' + k)); }); const u = {}; keys.forEach(function(k){ u['categories.' + k] = del(); }); b.set(col('userCityLists').doc(id), u, { merge: true }); return b.commit();
      },
      remove: async function(uid, cityId){ // خ٥/م٢-ب · r72t: الأم وفرعياتها بدفعة
        const id = uid + '_' + cityId; const snap = await col('userCityListCats').where('ownerId', '==', uid).where('cityId', '==', cityId).get(); const b = db.batch(); snap.forEach(function(d){ b.delete(col('userCityListCats').doc(d.id)); }); b.delete(col('userCityLists').doc(id)); return b.commit();
      },
      removeKeys: function(uid, cityId, keys){ const u = {}; keys.forEach(k => { u['categories.' + k] = del(); }); return col('userCityLists').doc(uid + '_' + cityId).update(u); },
      byOwner: function(uid){ return col('userCityLists').where('ownerId', '==', uid).get(); },
      sharedWith: function(uid){ return col('userCityLists').where('sharedWith', 'array-contains', uid).get(); }, /* ر٧٣-أب (٢) */
      publicByOwnerRaw: function(uid){ return col('userCityLists').where('ownerId', '==', uid).where('public', '==', true).get(); },
      setNicknameAll: async function(uid, nickname){ const snap = await col('userCityLists').where('ownerId', '==', uid).get(); const b = db.batch(); snap.forEach(function(d){ b.update(d.ref, { nickname: nickname }); }); return b.commit(); }, /* ر٧٣-أب (٢) */
      publicByOwner: async function(uid){ const snap = await col('userCityLists').where('ownerId', '==', uid).where('public', '==', true).get(); const rows = []; snap.forEach(function(d){ rows.push(mpData.cityLists._fromIndex(d.data())); }); return rows; }, // ر٧٢-أ-١هـ · r72t: بالفهرس
    },
    geo: { // ز-١-ب/ج: عامل الأماكن (places.mypickz.app) — بلا مفتاح · لا إحداثيات من جوجل أبدًا (الثابت السابع) · مهلة ٦ ثوانٍ
      base: 'https://places.mypickz.app',
      _get: async function(path){ const ac = (typeof AbortController === 'function') ? new AbortController() : null; const t = ac ? setTimeout(function(){ ac.abort(); }, 6000) : null; try{ const r = await fetch(mpData.geo.base + path, ac ? { signal: ac.signal } : {}); if (!r.ok) throw new Error('geo ' + r.status); return await r.json(); } finally { if (t) clearTimeout(t); } },
      resolve: function(url){ return mpData.geo._get('/resolve?url=' + encodeURIComponent(url)); },
      ccOf: function(cityId){ const c = allCities().find(function(x){ return x.id === cityId; }); return c && c.country ? plCountryCode(c.country) : ''; },
      match: function(cityId, name, addr, g){ return mpData.geo._get('/match?city=' + encodeURIComponent(cityId || '') + '&cc=' + encodeURIComponent(mpData.geo.ccOf(cityId)) + '&lat=' + (g ? g.lat : '') + '&lng=' + (g ? g.lng : '') + '&r=' + (g ? g.r : 12) + '&name=' + encodeURIComponent(name || '') + '&addr=' + encodeURIComponent(addr || '')); },
      area: async function(cityId, lat, lng){ try{ const r = await mpData.geo._get('/area?cc=' + encodeURIComponent(mpData.geo.ccOf(cityId)) + '&lat=' + lat + '&lng=' + lng); return (r && r.area) || ''; }catch(_){ return ''; } }, // خ-٤: الحي من الموضع (حدود Overture بمخزننا)
      matchBatch: async function(cityId, items, g){ const ac = (typeof AbortController === 'function') ? new AbortController() : null; const t = ac ? setTimeout(function(){ ac.abort(); }, 45000) : null; try{ const r = await fetch(mpData.geo.base + '/match-batch', Object.assign({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: cityId || '', cc: mpData.geo.ccOf(cityId), lat: g ? g.lat : null, lng: g ? g.lng : null, r: g ? g.r : 12, items: items }) }, ac ? { signal: ac.signal } : {})); if (!r.ok) throw new Error('geo ' + r.status); return await r.json(); } finally { if (t) clearTimeout(t); } } // خ-٢: دفعة حتى ٥٠ اسمًا بمهلة ٤٥ ثانية
    },
    identity: { // v3.11: سجل هوية الأماكن — موضع مصدَّق يتراكم (أول مثبِّت يخدم الباقين)
      keyOf: function(cityId, name){ return 'k' + hashUrl(String(cityId || '') + '|' + pickerNormalize(name || '')); },
      getMany: async function(keys){ /* ر٧٣-أب (١): ١٠ مفاتيح بقراءة واحدة · المجموعات بالتوازي · مهلة ٨ ث · إن فشل الاستعلام يعود إلى القراءة المفردة */ const out = {}; const ks = (keys || []).filter(Boolean); const chunks = []; for (let i = 0; i < ks.length; i += 10) chunks.push(ks.slice(i, i + 10));
        const withTimeout = function(p, ms){ return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('identity timeout')); }, ms); })]); };
        await Promise.all(chunks.map(async function(chunk){ try{ const snap = await withTimeout(col('placeIdentity').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get(), 8000); snap.forEach(function(d){ out[d.id] = d.data(); }); }catch(e){ mpSwallow(e, 'identity.getMany'); await Promise.all(chunk.map(async function(k){ try{ const d = await withTimeout(col('placeIdentity').doc(k).get(), 8000); if (d.exists) out[k] = d.data(); }catch(_){} })); } }));
        return out; },
      get: async function(key){ const d = await col('placeIdentity').doc(key).get(); return d.exists ? d.data() : null; },
      put: function(key, rec){ return col('placeIdentity').doc(key).set(rec); }
    },

    analytics: { /* ر٧٣-أب (٢): الزيارات · دفعة الزيادات (mpTrack) · قراءة مستند · أحداث يوم (الإدارة) */
      bumpVisits: function(){ return col('analytics').doc('visits').set({ count: inc(1) }, { merge: true }); },
      batchInc: function(entries){ const b = db.batch(); entries.forEach(function(e){ const seg = e[0].split('/'); b.set(col(seg[0]).doc(seg[1]), e[1], { merge: true }); }); return b.commit(); },
      getDoc: async function(id){ const d = await col('analytics').doc(id).get(); return d.exists ? d.data() : null; },
      byPrefix: function(prefix, limit){ return col('analytics').orderBy(firebase.firestore.FieldPath.documentId()).startAt(prefix).endAt(prefix + '\uf8ff').limit(limit || 50).get(); }
    },
    dailyStats: { bump: function(day, fields){ return col('dailyStats').doc(day).set(fields, { merge: true }); } },
    stats: { bumpUsers: function(){ return col('stats').doc('users').set({ count: inc(1) }, { merge: true }); } },
    communityProfiles: { set: function(uid, payload){ return col('communityProfiles').doc(uid).set(payload, { merge: true }); }, bumpView: function(uid){ return col('communityProfiles').doc(uid).set({ viewCount: inc(1) }, { merge: true }); }, withPublic: function(){ return col('communityProfiles').where('hasAnyPublicContent', '==', true).get(); } },
    settings: { // ر٧٠ط-٢: قالب التصنيفات (المالك)
      app: async function(){ const d = await col('settings').doc('app').get(); return d.exists ? d.data() : null; }, /* ر٧٣-أب (٢) */
      mergeApp: function(data){ return col('settings').doc('app').set(data, { merge: true }); },
      getCategoryTemplate: async function(){ const d = await col('settings').doc('category-template').get(); return d.exists ? d.data() : null; },
      rulesVersion: async function(){ const d = await col('settings').doc('app').get(); return d.exists ? (d.data().rulesVersion || '') : ''; }, // r72t (M4.26 ٧)
      saveCategoryTemplate: function(data){ return col('settings').doc('category-template').set(data, { merge: true }); }, /* ر٧٣-أب (١): الحفظ عبر الطبقة (كان نداءً مباشرًا) */
      resetCategoryTemplate: function(){ return col('settings').doc('category-template').set({ customItems: [], sectionOverrides: {}, itemOrder: {}, itemOverrides: {}, catsV: CATS_VERSION }); }
    },
    cities: {
      links: async function(cityId){ return {}; } /* v3.13: الدليل مهاجَر ومحذوف — لا قراءة (يُكنس بر٧٣-ب) */
    },
    trips: {
      // ر٥٦: استفتاء الأصل الحي للرحلة المحفوظة (متصفح Bookmarked trips)
      getDoc: function(tripId){ return col('trips').doc(tripId).get(); },
      bumpView: function(tripId){ return col('trips').doc(tripId).set({ viewCount: inc(1) }, { merge: true }); }, // r72t (M4.26 ٣): مشاهدة من غير المالك
      publicTrips: async function(){
        const snap = await col('trips').where('public', '==', true).limit(100).get();
        const rows = []; snap.forEach(function(d){ rows.push({ id: d.id, ...d.data() }); }); return rows;
      },
      remove: function(tripId){ return col('trips').doc(tripId).delete(); },
      byOwner: function(uid){ return col('trips').where('ownerId', '==', uid).get(); },
      sharedWith: function(uid){ return col('trips').where('sharedWith', 'array-contains', uid).get(); }, /* ر٧٣-أب (٢) */
      save: function(trip, extra){ return col('trips').doc(trip.id).set(Object.assign({}, trip, extra || {}), { merge: true }); },
      publicByOwner: async function(uid){ const snap = await col('trips').where('ownerId', '==', uid).where('public', '==', true).get(); const rows = []; snap.forEach(function(d){ rows.push({ id: d.id, ...d.data() }); }); return rows; } // ر٧٢-أ-١ (إعادة البناء): رحلاته العامة لصفحة المنتقي
    },
    suspensions: {
      allIds: async function(){ const snap = await col('suspensions').get(); const ids = new Set(); snap.forEach(function(d){ ids.add(d.id); }); return ids; }, // ر٧٢-أ-١ب (المالك)
      set: function(uid, data){ return col('suspensions').doc(uid).set(data); },
      get: function(uid){ return col('suspensions').doc(uid).get(); }, /* ر٧٣-أب (٢) */
      remove: function(uid){ return col('suspensions').doc(uid).delete(); }
    },
    // القرار ١ (٢٦ أغسطس): الإيقاف احتجاز كامل (العام + المشاركة بالاسم)، والرفع استعادة كاملة — البوابة البشرية هي قرار الرفع
    holdOrRestore: async function(snap, hold){
      if (snap.empty) return;
      const batch = db.batch();
      snap.forEach(doc => {
        const d = doc.data();
        const u = { suspended: hold };
        if (hold){
          u.sharedWithHeld = Array.isArray(d.sharedWith) ? d.sharedWith : [];
          u.sharedWith = [];
          u.publicHeld = d.public === true;
          u.public = false;
        } else {
          u.sharedWith = Array.isArray(d.sharedWithHeld) ? d.sharedWithHeld : (Array.isArray(d.sharedWith) ? d.sharedWith : []);
          u.sharedWithHeld = del();
          u.public = d.publicHeld === true;
          u.publicHeld = del();
        }
        batch.update(doc.ref, u);
      });
      await batch.commit();
    }
  };
})();

let visitCount = null;

/* عرض ملاحظة المكان — بتضيف "More/Less" تلقائيًا لو النص طويل، وتعرضه كامل من غير أي زر لو قصير */
function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
async function loadVisitCount(){
  try{
    const __v = await mpData.analytics.getDoc('visits');
    visitCount = __v ? (__v.count || 0) : 0;
  }catch(e){ visitCount = null; }
}


// يفحص كل الأماكن بكائن links ويولّد معرّفًا لأي مكان قديم بلا معرّف (بأثر رجعي) — يُرجع true لو أي تغيير صار
function backfillPlaceIds(linksObj){
  let changed = false;
  Object.keys(linksObj || {}).forEach(subcatId => {
    const entry = linksObj[subcatId];
    if (!entry || !Array.isArray(entry.places)) return;
    entry.places.forEach(p => {
      if (!p.id){ p.id = generatePlaceId(); changed = true; }
    });
  });
  return changed;
}







async function loadOwnerUid(){
  try{
    const __app = await mpData.settings.app();
    ownerUid = __app ? (__app.ownerUid || null) : null;
  }catch(e){ ownerUid = null; }
}

// ===== وضع المالك (إعادة تصميم أ-٢، ١٦ أغسطس ٢٠٢٦) =====
// الصلاحية = تطابق currentUser.uid مع settings/app.ownerUid فقط. لا كلمة مرور، لا إيماءة، لا ?key=.
// "Hide/Show Tools" تفضيل عرض محلي بحت (localStorage) — لا يمس isOwner ولا الصلاحية الفعلية،
// فالحَكَم الحقيقي هو قواعد Firestore على الخادم.
const OWNER_TOOLS_HIDDEN_KEY = 'mypickz_owner_tools_hidden';



// تُستدعى من onAuthStateChanged بعد معرفة currentUser
function syncOwnerMode(){
  const wasOwner = isOwner;
  isOwner = !!(currentUser && ownerUid && currentUser.uid === ownerUid);
  if (isOwner && categoryTemplateStale) resetStaleCategoryTemplate(); // ر٧٠ط-٢
  if (wasOwner !== isOwner && typeof renderPlacesBody === 'function' && currentTab === 'Places') renderPlacesBody(); /* ر٧٣-أب (١): لا دليل موروثًا — الشاشة الحية تُعاد وحدها */
}


// يربط حساب Firebase الحالي كمالك معتمد لو لم يكن settings/app.ownerUid مربوطًا بعد (شبكة أمان للربط الأولي)
async function linkOwnerUid(){
  if (!currentUser) return;
  try{
    const __app2 = await mpData.settings.app();
    const savedUid = __app2 ? __app2.ownerUid : null;
    if (savedUid && savedUid !== currentUser.uid) return; // مالك مربوط أصلًا بحساب آخر — لا نلمسه تلقائيًا
    await mpData.settings.mergeApp({ ownerUid: currentUser.uid, ownerEmail: currentUser.email || '' });
    ownerUid = currentUser.uid;
  }catch(e){ /* صامت */ }
}

