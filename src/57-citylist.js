/* =========================================================
   r75d (البند ١١ — الكنس): الجزء كان 57-mylist.js ومعرّفاته myList… صارت cityList… (الاسم الحقيقي للكيان: قائمة المدينة) — مسارات التخزين ومفاتيح الوثائق (userCityLists · hasMyListActivity · 'mylist' بمرجع الرحلة · mylist_save) لم تُمس
   القائمة الشخصية (Personal List) — بيانات كل مستخدم مسجّل، منفصلة تمامًا عن قائمة المالك
   ========================================================= */
let userListData = { customCities: [], customCountries: [] };
let cityListCityId = null;   // المدينة اللي المستخدم شغال عليها جوه "My List"
let sharedCityLists = [];  // قوائم مدن مستخدمين آخرين شُوركت معي بالتحديد (Share with someone)
let myCityListCatsDirty = false, myCityListOldKeys = []; // ر٧٠ط
let myCityListData = null; // بيانات المدينة الحالية بـMy List (المرحلة ١ من إعادة الهيكلة): { public, sharedWith, sharedWithNames, favoriteCount, categories:{} }
let myCityListLoadedFor = null;
let myCityListLoadSeq = 0, myCityListLoading = false; /* r74m-٣ (سبب عطل الخريطة): تحميلان متزامنان لمدينتين كان الأبطأ منهما يكتب بياناته فوق الأحدث — فتظهر أماكن مدينة تحت اسم أخرى؛ الرقم التسلسلي يُسقط كل تحميل تجاوزه تحميل أحدث */
let myCityListLoadFailed = false;   // القراءة فشلت — يُمنع كل حفظ حتى تنجح
let myCityListLoadError = '';
async function retryLoadCity(){        // إعادة محاولة صريحة بيد المستخدم
  myCityListLoadFailed = false; myCityListLoadedFor = null;
  await loadMyCityList(cityListCityId);
  renderPlacesMine();
} // أي cityId مُحمَّل حاليًا بـmyCityListData (لتفادي إعادة تحميل غير ضرورية)
let currentUserSuspended = false;
let userListLoadFailed = false; // true لو فشلت قراءة userLists شبكيًا — يميّز "لا اسم مستعار" عن "تعذّر التحقق" (لا نحبس المستخدم بخطأ مؤقت)
let cityListCountry = null;  // الدولة المختارة حاليًا داخل نافذة "My List"

async function loadSharedCityLists(){
  if (!currentUser){ sharedCityLists = []; return; }
  try{
    const snap = await withAuthRetry(() => mpData.cityLists.sharedWith(currentUser.uid)); // r72t: الأم؛ التركيب بالطبقة أدناه
    sharedCityLists = [];
    const __rows = []; snap.forEach(doc => __rows.push({ docId: doc.id, ...doc.data() })); sharedCityLists = await Promise.all(__rows.map(function(r){ return mpData.cityLists._compose(r, r.docId); })); // r72t (M4.26): المشارَك معي كاملًا بالفرعية
  }catch(e){ sharedCityLists = []; }
}

async function loadUserList(){
  if (!currentUser){ userListData = { customCities: [], customCountries: [], nickname: null }; cityListCityId = null; cityListCountry = null; currentUserSuspended = false; myCityListData = null; myCityListLoadedFor = null; return; }
  userListLoadFailed = false;
  try{
    const doc = await withAuthRetry(() => mpData.userLists.getServer(currentUser.uid)); /* و-١: من الخادم حصرًا — تعثّر القناة رفضٌ لا مستند فارغ */
    const data = doc.exists ? doc.data() : {};
    userListData = {
      customCities: Array.isArray(data.customCities) ? data.customCities : [],
      customCountries: Array.isArray(data.customCountries) ? data.customCountries : [],
      nickname: data.nickname || null,
      viewCount: data.viewCount || 0,
      guideSeen: data.guideSeen === true,      // خ١-ب: النبذة شوهدت
      defaultTab: data.defaultTab || null,      // خ١-ب: الوجهة الافتراضية
      curatorSelf: false, // ر٧٢-أ-١د: يُملأ من الملف العام بعد التحميل
      following: Array.isArray(data.following) ? data.following : [], followDisclosed: data.followDisclosed === true, // ر٧٢-أ-٢: النسخة الخفيفة + الإفصاح مرة
      privateCities: Array.isArray(data.privateCities) ? data.privateCities : [], // خ٢: فهرس مدن العناوين الخاصة
      addrCity: data.addrCity || null,          // خ٢-r3: مدينة العناوين المستقلة
      // ر٦٩س (N-048): مرايا المفكرة والحفظ — كانت تُكتب بالمستند ولا تُحمَّل عند الدخول، فتختفي كل الحالات بعد إعادة الدخول
      placeBookmarks: (data.placeBookmarks && typeof data.placeBookmarks === 'object') ? data.placeBookmarks : {},
      tripSelfBookmarks: (data.tripSelfBookmarks && typeof data.tripSelfBookmarks === 'object') ? data.tripSelfBookmarks : {},
      listBookmarkIds: (data.listBookmarkIds && typeof data.listBookmarkIds === 'object') ? data.listBookmarkIds : {},
      tripSaveIds: (data.tripSaveIds && typeof data.tripSaveIds === 'object') ? data.tripSaveIds : {},
      listCity: data.listCity || null, listCountry: data.listCountry || null, placesSource: data.placesSource || null, // ر٦٩ع (N-052): آخر موضع بالأماكن
      cityPlaceCounts: (data.cityPlaceCounts && typeof data.cityPlaceCounts === 'object') ? data.cityPlaceCounts : {} // ر٦٩ع (N-053): عدّاد أماكن كل مدينة
    };
    if (userListData.placesSource && ['mine','bookmarked'].includes(userListData.placesSource)) placesSource = userListData.placesSource;
    try{ const prof = await mpData.profiles.get(currentUser.uid); userListData.curatorSelf = !!(prof && prof.verified === true); }catch(e){} // ر٧٢-أ-١د: علم المنتقي لنافذة المكان والدرج
    if (data.myCities !== undefined){ try{ await mpData.userLists.merge(currentUser.uid, { myCities: mpData.fieldDelete() }); }catch(e){} } // ر٧٢-أ-١ح: تنظيف أثر «مدينتي» الملغى من الخاص (مرة)
    listBookmarksMap = null; tripSavesMap = null; // تُبنى من المرآة المحمَّلة لا من الفراغ
  }catch(e){
    userListData = { customCities: [], customCountries: [], nickname: null }; userListLoadFailed = true;
    /* و-١: الفشل بصوت — سطر باللوحة ورسالة للمستخدم؛ لا إعادة محاولة تلقائية (اختيار ٢ بالبيان): المستخدم يعيد التحميل */
    const __code = (e && (e.code || e.message)) || 'error';
    if (typeof logTiming === 'function') logTiming('[NET] userLists read FAILED · ' + __code);
    try{ const __t = document.getElementById('toast'); __t.textContent = 'Could not load your account · please reload'; __t.classList.add('show'); setTimeout(function(){ __t.classList.remove('show'); }, 8000); }catch(_){} /* القرص نفسه لثماني ثوانٍ (لا ٢٫٢) حتى تُقرأ */
  }
  try{
    // v3: الحالة تُقرأ من suspensions/{uid} (وجود المستند = إيقاف). users.suspended احتياط انتقالي حتى نشر v3.
    const sDoc = await withAuthRetry(() => mpData.suspensions.get(currentUser.uid));
    if (sDoc.exists){ currentUserSuspended = true; }
    else {
      const uDoc = await withAuthRetry(() => mpData.users.get(currentUser.uid));
      currentUserSuspended = uDoc.exists && uDoc.data().suspended === true;
      try{ sgLoadFrom(uDoc.exists ? uDoc.data() : {}); }catch(_){} /* r80: المجموعات المحفوظة من القراءة نفسها — لا قراءة إضافية */
    }
  }catch(e){ currentUserSuspended = false; }
  refreshSuspendedBadge();
}

// معرّف مستند Firestore لبيانات مدينة معيّنة بـMy List الخاصة بالمستخدم الحالي

// تحميل بيانات مدينة معيّنة بـMy List (المرحلة ١ من إعادة الهيكلة) — مستند مستقل لكل مدينة
async function loadMyCityList(cityId){
  if (!currentUser || !cityId){ myCityListData = null; myCityListLoadedFor = null; return; }
  if (myCityListLoadedFor === cityId && myCityListData && !myCityListLoading) return; // محمَّلة أصلًا، لا داعي لإعادة القراءة
  const seq = ++myCityListLoadSeq; myCityListLoading = true; const stale = function(){ return seq !== myCityListLoadSeq; }; /* r74m-٣ */
  try{
    const data = (await withAuthRetry(() => mpData.cityLists.get(currentUser.uid, cityId))) || {};
    if (stale()) return; /* تحميل أحدث بدأ — هذا يُهمل بلا أثر */
    let priv = {};
    try{ priv = await mpData.privatePlaces.get(currentUser.uid, cityId); }catch(e){ priv = {}; }
    if (stale()) return;
    let raw = (data.categories && typeof data.categories === 'object') ? data.categories : {};
    if (doc0Exists(data) && !liveCountOf(raw)){ try{ await mpData.cityLists.remove(currentUser.uid, cityId); }catch(e){} raw = {}; if (stale()) return; } // ر٧٠ط-٢: قائمة فارغة موروثة تُحذف فور فتحها (القاعدة: لا قائمة بلا مكان)
    if ((data.catsV || 1) < CATS_VERSION){ myCityListOldKeys = Object.keys(raw).filter(function(k){ return !!CAT_ID_MAP_ONCE[k] || (!catKnown(k) && !isPrivateCategoryId(k)); }); const mg = migrateCategoryKeys(raw, true); raw = mg.categories; myCityListCatsDirty = true; } // ر٧٠ط: إعادة كتابة المعرّفات القديمة لمرة واحدة (تُحفظ مع أول حفظ، والمفاتيح القديمة تُحذف من المستند)
    // ٢٦ أغسطس (٣-ب) — ترحيل مرة واحدة: مفاتيح خاصة موروثة داخل مستند القائمة ⇒ تُنقل للمستند الخاص وتُحذف من القائمة
    // (يُتخطى للموقوف — القواعد ترفض كتابته؛ يبقى الدمج بالذاكرة فقط)
    const split = splitCategories(raw);
    const legacyKeys = Object.keys(split.priv);
    if (legacyKeys.length){
      priv = { ...split.priv, ...priv };
      if (!currentUserSuspended){
        try{
          await mpData.privatePlaces.save(currentUser.uid, cityId, priv);
          await mpData.cityLists.removeKeys(currentUser.uid, cityId, legacyKeys);
          await mpData.userLists.addPrivateCity(currentUser.uid, cityId);
        }catch(e){}
      }
      if (stale()) return;
    }
    myCityListData = {
      public: data.public === true,
      sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
      sharedWithNames: (data.sharedWithNames && typeof data.sharedWithNames === 'object') ? data.sharedWithNames : {},
      bookmarkCount: data.bookmarkCount || 0,
      categories: split.pub // خ٢: الخاص لم يعد يُدمج بقائمتي — وجهة العناوين هي المحرِّر الوحيد للمستند الخاص
    };
    try{ const live = liveCountOf(myCityListData.categories); userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; // r70q2: تعافي العدّاد ذاتيًّا — إن خالف الواقع (مستند مستخدم صُفّر بعد الأماكن) يُصحَّح ويُحفظ
      if (currentUser && (Number(userListData.cityPlaceCounts[cityId]) || 0) !== live){ userListData.cityPlaceCounts[cityId] = live; const patch = { cityPlaceCounts: {} }; patch.cityPlaceCounts[cityId] = live; mpData.userLists.merge(currentUser.uid, patch).catch(function(){}); } }catch(e){}
    // تعبئة تلقائية بأثر رجعي لمعرّفات الأماكن القديمة — لهذي المدينة فقط
    if (backfillPlaceIds(myCityListData.categories) && !currentUserSuspended && Object.keys(myCityListData.categories).length){
      mpData.cityLists.save(currentUser.uid, cityId, { ownerId: currentUser.uid, cityId, cityName: cityNameOf(cityId) || cityId, categories: myCityListData.categories }).catch(()=>{});
    }
  }catch(e){
    if (stale()) return;
    const code = (e && e.code) || '';
    // v1.40 · قواعد ٣٫٨ (ق٠١-٠٧): قراءة المستند الغائب لصاحب البادئة تعود «غير موجود» بلا خطأ —
    // فالمسار الطبيعي للحساب والمدينة الجديدين يمر من فرع !doc.exists أعلاه، وتصنيف الحارس الثالث صار دقيقًا:
    // permission-denied هنا رفضٌ حقيقي (قواعد أو جلسة) لا غيابًا — يُعامل فشلًا حاجبًا للحفظ كأي خطأ آخر.
    myCityListData = { public:false, sharedWith:[], sharedWithNames:{}, bookmarkCount:0, categories:{} };
    myCityListLoadFailed = true; myCityListLoadedFor = null;
    myCityListLoadError = (code === 'permission-denied') ? 'permission denied (rules 3.8: absent docs read as empty — this is a real denial)' : (code || (e && e.message) || 'unknown');
    myCityListLoading = false; return;
  }
  myCityListLoadFailed = false;
  myCityListLoadedFor = cityId; myCityListLoading = false;
}

// حفظ بيانات المدينة الحالية بـMy List — مستند مستقل، مو الملف الشامل القديم
async function saveMyCityList(){
  await commitPendingCityIfNeeded(cityListCityId); // r18: تخليد المدينة المعلقة مع أول حفظ فعلي
  if (!currentUser || !cityListCityId || !myCityListData) return;
  if (typeof tbForgetCity === 'function') tbForgetCity(cityListCityId); /* ب-٨: نسخة المنشئ من هذه المدينة تُبطَل مع كل حفظ */
  // حارس التطابق: لا يُكتب محتوى مدينة فوق مستند مدينة أخرى — ولا يُكتب قبل اكتمال التحميل
  if (myCityListLoadedFor !== cityListCityId){
    console.warn('[MyPickz] save skipped — loaded:', myCityListLoadedFor, 'target:', cityListCityId);
    try{ logTiming('SAVE · ' + cityListCityId + ' · SKIPPED · loaded ' + (myCityListLoadedFor || 'none')); }catch(_){} showToast('Not saved — this city is still loading, try again in a moment'); /* r87-3 (البند ٤): لا حفظ يختفي بصمت */
    return;
  }
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  // نفس فحص روابط خرائط جوجل الموجود أصلًا، مطبَّق على تصنيفات هذي المدينة فقط
  let invalidCount = 0;
  Object.keys(myCityListData.categories).forEach(itemId => {
    const entry = myCityListData.categories[itemId];
    const places = entry.places || [];
    entry.places = places.filter(p => {
      if (!p.url || !p.url.trim()) return true;
      if (isGoogleMapsUrl(p.url.trim())) return true;
      invalidCount++;
      return false;
    });
  });
  if (invalidCount > 0){
    showToast(`Only Google Maps links are allowed — removed ${invalidCount} invalid link(s)`);
  }
  try{
    // ٢٦ أغسطس (٣-ب): الفئات الخاصة لا تدخل مستند القائمة أبدًا — مستندان: القائمة (عام/مشارَك) والخاص (لصاحبه وحده)
    const { pub, priv } = splitCategories(myCityListData.categories);
    const { categories, ...meta } = myCityListData;
    const livePlaces = Object.values(pub).reduce(function(a, e){ return a + ((e && e.places) || []).filter(function(q){ return q && (q.name || q.url); }).length; }, 0);
    if (currentUser && curData[currentUser.uid]) delete curData[currentUser.uid]; // ر٧٢-أ-١و: ⭐/الملاحظات تظهر بصفحتي فورًا بعد الحفظ
  if (!livePlaces){ // ر٧٠ج (قرار المالك): القائمة الفارغة لا وجود لها — يُحذف مستندها (كالرحلة الفارغة)؛ المدينة تبقى بعدّاد صفر
      try{ await mpData.cityLists.remove(currentUser.uid, cityListCityId); }catch(e){}
      myCityListOldKeys = []; myCityListCatsDirty = false;
      if (Object.keys(priv).length) await mpData.privatePlaces.save(currentUser.uid, cityListCityId, priv);
      userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; if (userListData.cityPlaceCounts[cityListCityId]){ userListData.cityPlaceCounts[cityListCityId] = 0; try{ await saveUserListGeneral(); }catch(e){} }
      delete __cmSummary.places; try{ await syncCommunityProfile(); }catch(e){} try{ logTiming('SAVE · ' + cityListCityId + ' · 0 places · list removed'); }catch(_){} return; // ر٧٢-أ-١د: لا مدينة شبح بالملف العام بعد حذف القائمة الفارغة · r87-3
    }
    await mpData.cityLists.save(currentUser.uid, cityListCityId,
      { ownerId: currentUser.uid, cityId: cityListCityId, cityName: cityNameOf(cityListCityId) || cityListCityId, nickname: userListData.nickname || null, ...meta, categories: pub, catsV: CATS_VERSION }); // ر٧٠ط
    if (myCityListOldKeys.length){ await mpData.cityLists.dropCategoryKeys(currentUser.uid, cityListCityId, myCityListOldKeys); myCityListOldKeys = []; } // الدمج لا يحذف المفاتيح القديمة — تُحذف صراحة
    myCityListCatsDirty = false;
    if (Object.keys(priv).length) await mpData.privatePlaces.save(currentUser.uid, cityListCityId, priv);
    try{ const total = Object.values(myCityListData.categories || {}).reduce(function(a, e){ return a + ((e && e.places) || []).filter(function(p){ return p && (p.name || p.url); }).length; }, 0); // ر٦٩ع (N-053)
      userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; if (userListData.cityPlaceCounts[cityListCityId] !== total){ userListData.cityPlaceCounts[cityListCityId] = total; const patch = { cityPlaceCounts: {} }; patch.cityPlaceCounts[cityListCityId] = total; await mpData.userLists.merge(currentUser.uid, patch); } }catch(e){}
    const hasRealPlace = Object.values(myCityListData.categories).some(entry => (entry.places||[]).some(p => p.url && p.name));
    if (hasRealPlace) mpData.users.flag(currentUser.uid, 'hasMyListActivity').catch(()=>{});
    try{ logTiming('SAVE · ' + cityListCityId + ' · ' + livePlaces + ' places · ok'); }catch(_){} /* r87-3 (البند ٤): سطر لكل حفظ — الدليل لا الوعد */
  }catch(e){ showToast('Could not save your list'); try{ logTiming('SAVE · ' + cityListCityId + ' · FAILED · ' + ((e && e.code) || (e && e.message) || 'error')); }catch(_){} }
}

// مدن المالك المتاحة للقائمة الشخصية: المنشورة فقط (زي أي زائر بالظبط) — مش أي مدينة لسه Draft
// كل المدن المتاحة للمستخدم داخل قائمته الشخصية: مدن المالك المنشورة + مدنه الخاصة هو بس
function cityListAllCities(){ const __all = (userListData.customCities || []).slice(); return pendingCity ? __all.concat([pendingCity]) : __all; } // ز-١-ج-٢: مدني = المعجم (لا إخفاء — كل مدينة ملك صاحبها تُحذف حين لا محتوى)
function cityListAllCountries(){
  // الدولة كيان مشتق من مدنها — دولة بلا مدينة لا وجود لها (قرار المالك ٣١ أغسطس)
  return [...new Set(cityListAllCities().map(c => c.country).filter(Boolean))];
}
async function pruneEmptyCountries(){        // تنقية الدول اليتيمة بمستند المستخدم
  // حارس: لا تُنقّي قبل أن تكون البيانات محمَّلة فعلًا — وإلا مُسحت الدول كلها بحساب خاطئ
  if (!currentUser || !userListData || userListLoadFailed) return;
  if (!Array.isArray(userListData.customCountries) || !userListData.customCountries.length) return;
  if (!Array.isArray(userListData.customCities)) return;
  const live = new Set(cityListAllCities().map(c => c.country).filter(Boolean));
  if (!live.size) return;                    // لا مدن محمَّلة = لا حكم
  const kept = (userListData.customCountries || []).filter(c => live.has(c));
  if (kept.length !== (userListData.customCountries || []).length){
    userListData.customCountries = kept;
    try{ await mpData.userLists.merge(currentUser.uid, { customCountries: kept }); }catch(e){}
  }
}

async function selectCityListCountry(country){
  await saveMyCityList(); // حفظ أي تعديل معلّق بالمدينة الحالية قبل التبديل
  cityListCountry = country;
  const firstCity = cityListAllCities().find(c => c.country === country);
  cityListCityId = firstCity ? firstCity.id : null;
  if (userListData){                                   // آخر دولة تصفّحتها تُحفظ ولو لم تكن فيها مدن
    userListData.listCountry = country; if (cityListCityId) userListData.listCity = cityListCityId; // ر٧٢-أ-١ز: لا مسح للمحفوظة حين لا مدينة
    const __patch = { listCountry: country }; if (cityListCityId) __patch.listCity = cityListCityId; mpData.userLists.merge(currentUser.uid, __patch).catch(()=>{});
  }
  await loadMyCityList(cityListCityId);
}


async function addCityListCity(){
  // خ٥/م٢-د (r7 — توحيد مع مسار العناوين): الدولة أولًا بقائمة الدول + فحص اللاتينية + منع التكرار
  const country = await openInputModal("Country", "e.g. Saudi Arabia, Italy... (English letters only)", cityListCountry || "", WORLD_COUNTRIES.map(c => c.name));
  if (country === null || !country.trim()){ showToast('Country is required'); return; }
  if (!isLatinOnly(country)) { showToast('Country name must be in English letters only'); return; }
  const name = await openInputModal("City · " + country.trim(), "Type to find or add… (English letters only)", "", await gazCityOptions(country.trim()), { allowFree: true }); // N-070 // ر٧٠ب-٢: المعجم المرجعي للدولة — اقتراح لا قيد (ر٧٠د)
  if (!name || !name.trim()) return;
  if (!isLatinOnly(name)) { showToast('City name must be in English letters only'); return; }
  // ر٧٠ب: منع التكرار بالمفتاح المطبَّع (الطبقة ٢) ثم «هل تقصد؟» بالتقارب داخل الدولة نفسها (الطبقة ٣ — ق٠٩-١٠-٠٢)
  const inSameCountry = cityListAllCities().filter(c => c.country.toLowerCase() === country.trim().toLowerCase());
  let existing = inSameCountry.find(c => pickerNormalize(c.name) === pickerNormalize(name));
  if (!existing){ const near = pickerNearest(name, inSameCountry); if (near){ const pick = await mpSheet({ title: 'Did you mean ' + near.name + '?', text: 'You already have ' + near.name + ' in ' + country.trim() + '.', ok: 'Use ' + near.name, alt: 'Add "' + name.trim() + '" as a new city' }); if (pick === null) return; if (pick === 'ok') existing = near; } } /* ب-٢-٢-أ٢: ورقة بزرّين بدل confirm */
  let id = existing ? existing.id : null;
  if (!id){
    const __row = await gazFindCity(country.trim(), name); // ز-١-ج-٢: المعجم وحده — لا مدينة يدوية
    if (!__row){ showToast('City not found in the list — pick one of the suggestions'); return; }
    id = String(__row.id); const __dup = cityListAllCities().find(function(c){ return c.id === id; }); if (__dup){ existing = __dup; }
    // ر٧٠د (قرار المالك ١٠ سبتمبر): تُخلَّد فورًا بعدّاد صفر — لا تعليق ولا تبخر؛ الحذف بوضع التحرير
    if (!Array.isArray(userListData.customCities)) userListData.customCities = [];
    if (!existing) userListData.customCities.push(gazEntryToCity(__row, country.trim()));
    pendingCity = null;
    await saveUserListGeneral();
  }
  cityListCountry = country.trim();
  cityListCityId = id;
}

async function removeCityListCity(cityId, opts){
  if (pendingCity && pendingCity.id === cityId){ pendingCity = null; showToast('City removed'); return; } // معلقة: تتبخر بلا أثر
  const city = (userListData.customCities || []).find(c => c.id === cityId);
  if (!city) return; // حماية: يسمح فقط بحذف المدن اللي أضافها المستخدم نفسه
  if (!(opts && opts.confirmed) && !(await mpConfirm('Any places saved under it will be lost. This cannot be undone.', { title: '🗑 Delete "' + city.name + '"?', ok: 'Delete city', danger: true }))) return; /* ب-٢-٢-أ٢ */
  userListData.customCities = (userListData.customCities || []).filter(c => c.id !== cityId);
  try{ await mpData.cityLists.remove(currentUser.uid, cityId); }catch(e){} // خ٥/م٢-ب: عبر النواة
  if (myCityListLoadedFor === cityId){ myCityListData = null; myCityListLoadedFor = null; }
  if (cityListCityId === cityId){
    const all = cityListAllCities();
    let remaining = all.filter(c => c.country === cityListCountry);
    if (!remaining.length && all.length){          // لم تبقَ مدينة بهذه الدولة — الدولة تتبع المدينة الجديدة
      cityListCountry = all[0].country;
      remaining = all.filter(c => c.country === cityListCountry);
    }
    cityListCityId = remaining.length ? remaining[0].id : null;
    await pruneEmptyCountries();
    if (userListData) { if (cityListCityId) userListData.listCity = cityListCityId; userListData.listCountry = cityListCountry || ''; // ر٧٢-أ-١ز
      const __p2 = { listCountry: cityListCountry || '' }; if (cityListCityId) __p2.listCity = cityListCityId; mpData.userLists.merge(currentUser.uid, __p2).catch(()=>{}); }
  }
  await saveUserListGeneral();
  await syncCommunityProfile(); // تفادي "بيانات أشباح" لمدينة محذوفة كانت عامة بـcommunityProfiles
  showToast('City deleted');
}


function userCityLinks(){
  if (!cityListCityId || !myCityListData) return {};
  return myCityListData.categories;
}
function userGetEntry(id){
  const links = userCityLinks();
  return links[id] || { active:false, places: [] };
}
function userEnsurePlaces(id){
  const links = userCityLinks();
  const e = links[id] || { active:false, places: [] };
  if (!Array.isArray(e.places)) e.places = [];
  links[id] = e;
  return e;
}

// يقبل فقط روابط خرائط جوجل — حماية أساسية من روابط ضارة أو غير مرتبطة بمكان حقيقي
function isGoogleMapsUrl(url){
  try{
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./,'');
    return host === 'google.com' && u.pathname.startsWith('/maps')
        || host === 'maps.google.com'
        || host === 'goo.gl'
        || host === 'maps.app.goo.gl';
  }catch(e){ return false; }
}

// حفظ البيانات العامة فقط (اسم مستعار، دول/مدن مخصّصة) — منفصل تمامًا عن بيانات أي مدينة (راجع saveMyCityList)
async function saveUserListGeneral(){
  mpTrack.hit('mylist_save');
  if (!currentUser) return;
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  try{
    await mpData.userLists.merge(currentUser.uid, { customCities: userListData.customCities || [], customCountries: userListData.customCountries || [], nickname: userListData.nickname || null });
  }catch(e){ showToast('Could not save your list'); }
}

let cityListEditingKeys = new Set(); // مفاتيح "itemId#index" للأماكن اللي حاليًا في وضع تعديل
let cityListEditBackup = {}; // نسخة أصلية لكل مكان لحظة دخول وضع التعديل — تتيح التراجع قبل الحفظ

function removeUserPlace(id, index){
  const e = userEnsurePlaces(id);
  const gone = e.places.splice(index, 1); try{ if (typeof tkRemember === 'function') tkRemember(gone); }catch(_){} /* r86-3 (البند ٣): المستورَد المحذوف بيدك يُذكر — لا يعود في إعادة الاختيار إلا بطلبك */
  [...cityListEditingKeys].forEach(k => { if (k.startsWith(id + '#')) cityListEditingKeys.delete(k); });
  saveMyCityList();
}
let updateFieldSaveTimer = null;
/* ب-٢-٢-أ٢ (المسودة v3 · ٨): نافذة الاسم المستعار المسماة بالقشرة الليلية — القيد ظاهر (٣–٢٤) · فحص التوفر الحي عند التوقف عن الكتابة · تعيد وعدًا true/false كما كانت (مسار الإلزام عند أول دخول يبقى يكررها حتى الحفظ) */
let __nickResolve = null, __nickTimer = null;
function chooseNickname(){
  return new Promise(function(resolve){
    if (!currentUser){ resolve(false); return; }
    const current = userListData.nickname || ''; const body = document.getElementById('dashBody'); const bd = document.getElementById('dashBackdrop'); if (!body || !bd){ resolve(false); return; }
    if (__nickResolve){ const r = __nickResolve; __nickResolve = null; r(false); }
    __nickResolve = resolve;
    dashSet(current ? '✏️ Change nickname' : '👤 Choose a nickname', null);
    body.innerHTML = '<div class="ctx" style="text-align:center;">Shown to other users instead of your email</div>'
      + '<label class="flabel">' + (current ? 'New nickname' : 'Nickname') + ' <span class="dim">· 3–24 characters</span></label><input type="text" id="nickInput" class="modal-input" maxlength="24" autocomplete="off" value="' + attrStr(current) + '" placeholder="e.g. TheCurator" oninput="nickCheck()" onkeydown="if (event.key === \'Enter\') nickSave()">'
      + '<div class="errline" id="nickStatus"></div>'
      + '<div class="ctx">' + (current ? 'Changes on all your public lists and your curator page' : 'You can change it later in Settings') + '</div>'
      + '<div style="display:flex; gap:8px; margin-top:14px;"><button type="button" class="btn btn-ghost" style="flex:1" onclick="nickCancel()">Cancel</button><button type="button" class="btn btn-brass" style="flex:1" id="nickSaveBtn" onclick="nickSave()">Save nickname</button></div>';
    bd.classList.add('show'); setTimeout(function(){ const i = document.getElementById('nickInput'); if (i){ try{ i.focus(); i.select(); }catch(_){} } }, 30);
    if (window.MutationObserver){ const obs = new MutationObserver(function(){ if (!bd.classList.contains('show')){ obs.disconnect(); if (__nickResolve === resolve){ __nickResolve = null; resolve(false); } } }); obs.observe(bd, { attributes: true, attributeFilter: ['class'] }); } /* ✕ أو إغلاق خارجي = إلغاء */
  });
}
function nickCancel(){ const r = __nickResolve; __nickResolve = null; dashBack(); if (r) r(false); }
function nickCheck(){ /* التوفر الحي بعد توقف الكتابة ٤٠٠ م.ث */
  const st = document.getElementById('nickStatus'); const v = String((document.getElementById('nickInput') || {}).value || '').trim(); if (__nickTimer) clearTimeout(__nickTimer);
  if (!st) return; if (v.length < 3){ st.textContent = v ? 'At least 3 characters' : ''; st.className = 'errline'; return; }
  if (v === (userListData.nickname || '')){ st.textContent = 'Your current nickname'; st.className = 'errline ok'; return; }
  st.textContent = 'Checking…'; st.className = 'errline';
  __nickTimer = setTimeout(async function(){ try{ const doc = await mpData.nicknames.get(v.toLowerCase()); const taken = doc.exists && doc.data().uid !== currentUser.uid; st.textContent = taken ? 'Taken — try another' : '✓ Available'; st.className = taken ? 'errline' : 'errline ok'; }catch(e){ st.textContent = ''; } }, 400);
}
async function nickSave(){
  const btn = document.getElementById('nickSaveBtn'); const v = String((document.getElementById('nickInput') || {}).value || '');
  if (btn) btn.disabled = true;
  const ok = await saveNickname(v);
  if (btn) btn.disabled = false;
  if (ok){ const r = __nickResolve; __nickResolve = null; dashBack(); if (r) r(true); }
}
async function saveNickname(name){ /* منطق الحفظ القائم كما هو — حجز الاسم · تحرير القديم · المستند الأم · نسخ الاسم بقوائم المدن · الملف العام */
  const current = userListData.nickname || '';
  const clean = String(name || '').trim();
  if (!clean || clean.length < 3){ showToast('Nickname must be at least 3 characters'); return false; }
  if (clean.length > 24){ showToast('Nickname must be 24 characters or fewer'); return false; }
  if (clean === current) return true;
  const key = clean.toLowerCase();
  try{
    const doc = await mpData.nicknames.get(key);
    if (doc.exists && doc.data().uid !== currentUser.uid){
      showToast('This nickname is already taken — try another');
      return false;
    }
    await mpData.nicknames.set(key, { uid: currentUser.uid, nickname: clean });
    if (current){
      const oldKey = current.toLowerCase();
      if (oldKey !== key){
        try{
          const oldDoc = await mpData.nicknames.get(oldKey);
          if (oldDoc.exists && oldDoc.data().uid === currentUser.uid){
            await mpData.nicknames.remove(oldKey);
          }
        }catch(e){}
      }
    }
    userListData.nickname = clean;
    await saveUserListGeneral();
    try{ await mpData.users.merge(currentUser.uid, { nickname: clean }); }catch(e){}
    // تحديث النسخة المكررة من الاسم بكل مستندات مدن المستخدم (تُستخدَم لاستعلام Community Lists بدون قراءات إضافية)
    try{
      await mpData.cityLists.setNicknameAll(currentUser.uid, clean);
    }catch(e){}
    await syncCommunityProfile();
    showToast('Nickname saved ✓');
    return true;
  }catch(e){
    showToast('Could not save nickname');
    return false;
  }
}

// يُعاد حسابها وتُكتب بمستند خفيف منفصل (communityProfiles) — يخدم استعلام الاكتشاف بدون تحميل كل تفاصيل الفئات/الأماكن
async function syncCommunityProfileFor(uid, nickname){
  try{
    const citySnap = await mpData.cityLists.publicByOwnerRaw(uid);
    const publicCityIds = [];
    citySnap.forEach(doc => {
      const d = doc.data();
      const __d = mpData.cityLists._fromIndex(d); const nLive = Object.values((__d.categories && typeof __d.categories === 'object') ? __d.categories : {}).reduce(function(a, e){ return a + ((e && e.places) || []).filter(function(q){ return q && (q.name || q.url); }).length; }, 0);
      if (!nLive) return; // ر٧٢-أ-١د
      publicCityIds.push(d.cityId);
    });
    // فحص إضافي: رحلات عامة، حتى لو المستخدم ما عنده أي مدينة My List عامة إطلاقًا (سيناريو Add Trip بمفرده)
    let hasAnyPublicTrip = false;
    try{
      const __pt = await mpData.trips.publicByOwner(uid);
      hasAnyPublicTrip = __pt.length > 0;
    }catch(e){}
    const payload = {
      hasAnyPublicCity: publicCityIds.length > 0,
      hasAnyPublicContent: publicCityIds.length > 0 || hasAnyPublicTrip, // يحدد فعليًا الظهور بنتائج الاكتشاف
      publicCityIds,
      myCityIds: mpData.fieldDelete(), // ر٧٢-أ-١ح: تنظيف أثر «مدينتي» الملغى من الملف العام
      updatedAt: Date.now() // ر٧٢-أ-١: آخر تحديث عام — لترتيب شبكة المنتقين و«updated Nd ago» (سطر بالنشرة M4.25 يقيّده)
    };
    if (nickname !== undefined) payload.nickname = nickname; // لا نكتب/نمحو الاسم لو ما تم تمريره صراحة (تفادي مسحه بالخطأ)
    await mpData.communityProfiles.set(uid, payload);
  }catch(e){}
}
let __cmNickSynced = false; /* د-٢ (ملاحظة المالك): المستلِم يقرأ اسم المرسل من ملفه بالمجتمع — ومن لم ينشر شيئًا عامًّا لا ملف له فيظهر «user»؛ يُكتب الاسم وحده مرة بالجلسة عند أول مشاركة (الملف بلا محتوى عام لا يظهر في الاكتشاف: hasAnyPublicContent) */
async function ensureCommunityNick(){ if (__cmNickSynced || !currentUser || !userListData || !userListData.nickname) return; try{ await mpData.communityProfiles.set(currentUser.uid, { nickname: userListData.nickname }); __cmNickSynced = true; }catch(e){} }
async function syncCommunityProfile(){
  if (!currentUser) return;
  await syncCommunityProfileFor(currentUser.uid, userListData.nickname || null);
}

async function shareCityListWithSomeone(){
  mpTrack.hit('share_link');
  if (!myCityListData) return;
  const name = await openInputModal("Share with (username)", "Enter their exact username", "");
  if (name === null) return;
  const key = name.trim().toLowerCase();
  if (!key) return;
  try{
    const doc = await mpData.nicknames.get(key); // خ٥/م٢-ب: عبر النواة
    if (!doc.exists){ showToast('No user found with that username'); return; }
    const data = doc.data();
    const targetUid = data.uid;
    if (targetUid === currentUser.uid){ showToast("You can't share with yourself"); return; }
    if (!myCityListData.sharedWith) myCityListData.sharedWith = [];
    if (!myCityListData.sharedWithNames) myCityListData.sharedWithNames = {};
    if (myCityListData.sharedWith.includes(targetUid)){ showToast('Already shared with this user'); return; }
    myCityListData.sharedWith.push(targetUid);
    myCityListData.sharedWithNames[targetUid] = data.nickname || name.trim();
    await saveMyCityList(); ensureCommunityNick(); /* د-٢ */
    showToast('Shared ✓');
  }catch(e){ showToast('Could not verify username'); }
}
async function removeCityListShare(uid){
  if (!myCityListData || !myCityListData.sharedWith) return;
  myCityListData.sharedWith = myCityListData.sharedWith.filter(u => u !== uid);
  await saveMyCityList();
}

async function toggleCityListPublic(){
  if (!myCityListData) return;
  if (!myCityListData.public){
    if (!userListData.nickname){
      const ok = await chooseNickname();
      if (!ok) return;
    }
  }
  myCityListData.public = !myCityListData.public;
  if (myCityListData.public) mpTrack.hit('reserved_2'); // ر٦٣: نشر عام
  await saveMyCityList();
  await syncCommunityProfile();
}

async function selectCityListCity(cityId){
  if (cityId === cityListCityId) return;
  await saveMyCityList(); // نحفظ أي تعديل معلّق بالمدينة الحالية قبل ما ننتقل
  cityListCityId = cityId;
  const c = cityListAllCities().find(c => c.id === cityId);
  if (c) cityListCountry = c.country;
  if (userListData && (userListData.listCity !== cityId || userListData.listCountry !== cityListCountry)){
    userListData.listCity = cityId; userListData.listCountry = cityListCountry || '';
    mpData.userLists.merge(currentUser.uid, { listCity: cityId, listCountry: cityListCountry || '' }).catch(()=>{});
  }
  await loadMyCityList(cityId);
}

/* ═══ r91 (قرار المالك ٢٨ أكتوبر ٠٥:٢٠ «نفذ» · ق١٠-٢٨-٠٢): إدارة المدينة بعد الاستيراد — Merge into another city · Split out a town · Move one place to another city — بعدّ وحفظة واحدة لكل مدينة وUndo للجلسة ═══ */
let cmUndo = null; /* { kind, label, at, docs: { cityId: doc|null }, cities: [...], counts: {...} } */
function cmCityOf(id){ return cityListAllCities().find(function(c){ return c.id === id; }) || null; }
function cmOthers(cityId){ const me = cmCityOf(cityId); return cityListAllCities().filter(function(c){ return c.id !== cityId && (!me || c.country === me.country) && !(pendingCity && pendingCity.id === c.id); }); }
async function cmReadDoc(cityId){ const d = await mpData.cityLists.get(currentUser.uid, cityId); return d || null; }
function cmMetaOf(doc){ const m = Object.assign({}, doc || {}); delete m.categories; delete m.index; delete m.splitV; delete m.cityId; delete m.cityName; delete m.ownerId; delete m.nickname; delete m.catsV; return m; }
async function cmWriteDoc(cityId, cityName, meta, cats, prevDoc){ await mpData.cityLists.save(currentUser.uid, cityId, Object.assign({ public: false, sharedWith: [], sharedWithNames: {}, bookmarkCount: 0 }, meta || {}, { ownerId: currentUser.uid, cityId: cityId, cityName: cityName, nickname: userListData.nickname || null, categories: cats, catsV: CATS_VERSION })); const stale = Object.keys((prevDoc && prevDoc.categories) || {}).filter(function(k){ return !(k in cats); }); if (stale.length) await mpData.cityLists.dropCategoryKeys(currentUser.uid, cityId, stale); } /* الحفظ يدمج ولا يحذف الفرعيات الغائبة — تُحذف صراحةً (كما في saveMyCityList) */
function cmCatsOf(doc){ const raw = (doc && doc.categories && typeof doc.categories === 'object') ? doc.categories : {}; const out = {}; Object.keys(raw).forEach(function(k){ if (isPrivateCategoryId(k)) return; const e = raw[k] || {}; out[k] = { active: e.active !== false, places: (e.places || []).filter(function(p){ return p && (p.name || p.url); }).map(function(p){ return Object.assign({}, p); }) }; }); return out; }
function cmAppend(cats, k, list){ if (!list.length) return; cats[k] = cats[k] || { active: true, places: [] }; cats[k].active = true; cats[k].places = (cats[k].places || []).concat(list); }
function cmTownsOf(cats){ const by = {}; Object.keys(cats).forEach(function(k){ (cats[k].places || []).forEach(function(p){ const t = String(p.town || '').trim(); if (t) by[t] = (by[t] || 0) + 1; }); }); return Object.keys(by).sort(function(a, b){ return by[b] - by[a] || a.localeCompare(b); }).map(function(t){ return { town: t, n: by[t] }; }); }
async function cmAfter(touched){ touched.forEach(function(id){ if (typeof tbForgetCity === 'function') tbForgetCity(id); }); userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; const patch = { cityPlaceCounts: {} }; let any = false; for (const id of touched){ if (!cmCityOf(id)){ delete userListData.cityPlaceCounts[id]; continue; } try{ const d = await cmReadDoc(id); const n = liveCountOf(cmCatsOf(d)); userListData.cityPlaceCounts[id] = n; patch.cityPlaceCounts[id] = n; any = true; }catch(_){} } if (any) try{ await mpData.userLists.merge(currentUser.uid, patch); }catch(_){} if (touched.indexOf(myCityListLoadedFor) >= 0 || touched.indexOf(cityListCityId) >= 0){ myCityListLoadedFor = null; myCityListData = null; if (cityListCityId && cmCityOf(cityListCityId)) await loadMyCityList(cityListCityId); } try{ await syncCommunityProfile(); }catch(_){} if (typeof renderPlacesMine === 'function') renderPlacesMine(); }
function cmLog(line){ try{ logTiming(line); }catch(_){} }
/* ── الدمج: كل أماكن المدينة A إلى B بالتصنيف نفسه · town = A · area إن فرغت · ثم تُحذف A ── */
async function cmMerge(fromId, toId){ if (!currentUser || !fromId || !toId || fromId === toId) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(fromId), B = cmCityOf(toId); if (!A || !B){ showToast('City not found'); return false; } if (pendingCity && (pendingCity.id === fromId || pendingCity.id === toId)){ showToast('Save the city first'); return false; }
  let docA, docB; try{ docA = await cmReadDoc(fromId); docB = await cmReadDoc(toId); }catch(e){ mpSwallow(e, 'merge-read'); showToast('Could not read the lists'); return false; }
  const catsA = cmCatsOf(docA), catsB = cmCatsOf(docB); const nA = liveCountOf(catsA), nB = liveCountOf(catsB); if (!nA){ showToast(A.name + ' has no places — delete it instead'); return false; }
  const undoDocs = {}; undoDocs[fromId] = docA; undoDocs[toId] = docB; const undoCities = JSON.parse(JSON.stringify(userListData.customCities || []));
  Object.keys(catsA).forEach(function(k){ const moved = (catsA[k].places || []).map(function(p){ const q = Object.assign({}, p); q.town = A.name; if (!String(q.area || '').trim()) q.area = A.name; q.updatedAt = Date.now(); return q; }); cmAppend(catsB, k, moved); });
  if (liveCountOf(catsB) !== nA + nB){ showToast('Count mismatch — nothing saved'); return false; }
  try{ await cmWriteDoc(toId, B.name, cmMetaOf(docB), catsB); }catch(e){ mpSwallow(e, 'merge-write'); showToast('Could not save ' + B.name); return false; }
  try{ const chk = cmCatsOf(await cmReadDoc(toId)); if (liveCountOf(chk) !== nA + nB){ showToast('Count mismatch after saving — ' + A.name + ' was kept'); cmLog('MERGE · ' + fromId + ' → ' + toId + ' · FAILED count'); return false; } }catch(_){}
  await removeCityListCity(fromId, { confirmed: true });
  cmUndo = { kind: 'merge', label: 'Undo merge · ' + A.name + ' → ' + B.name, at: Date.now(), docs: undoDocs, cities: undoCities, names: { from: A.name, to: B.name } };
  cmLog('MERGE · ' + fromId + ' → ' + toId + ' · ' + nA + ' places · ' + B.name + ' now ' + (nA + nB)); showToast(A.name + ' → ' + B.name + ' · ' + nA + ' place' + (nA === 1 ? '' : 's') + ' ✓ — Undo is in City');
  await cmAfter([fromId, toId]); return true; }
/* ── الفصل: أماكن البلدة town داخل المدينة → مدينة بذاتها (المعجم ثم مركز الدبابيس) · town يُمسح ── */
async function cmSplit(fromId, town){ if (!currentUser || !fromId || !town) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(fromId); if (!A){ showToast('City not found'); return false; } if (cityListAllCities().some(function(c){ return c.id !== fromId && c.country === A.country && pickerNormalize(c.name) === pickerNormalize(town); })){ showToast(town + ' is already one of your cities — use Move on each place'); return false; }
  let docA; try{ docA = await cmReadDoc(fromId); }catch(e){ mpSwallow(e, 'split-read'); showToast('Could not read the list'); return false; }
  const catsA = cmCatsOf(docA); const n0 = liveCountOf(catsA); const catsN = {}; let moved = 0; let sumLat = 0, sumLng = 0, nGeo = 0;
  Object.keys(catsA).forEach(function(k){ const keep = [], out = []; (catsA[k].places || []).forEach(function(p){ if (String(p.town || '').trim() === town){ const q = Object.assign({}, p); delete q.town; if (String(q.area || '').trim() === town) q.area = ''; q.updatedAt = Date.now(); out.push(q); if (q.geo && typeof q.geo.lat === 'number'){ sumLat += q.geo.lat; sumLng += q.geo.lng; nGeo++; } } else keep.push(p); }); catsA[k].places = keep; cmAppend(catsN, k, out); moved += out.length; });
  if (!moved){ showToast('No places marked ' + town); return false; } if (moved === n0){ showToast('Every place here is ' + town + ' — rename the city instead'); return false; }
  let row = null; try{ row = await gazFindCity(A.country, town); }catch(_){} let city; if (row) city = gazEntryToCity(row, A.country); else if (nGeo) city = { id: 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6), name: town, country: A.country, lat: +(sumLat / nGeo).toFixed(5), lng: +(sumLng / nGeo).toFixed(5) }; else { showToast(town + ' is not in our city list and none of its places is pinned — pin one first'); return false; }
  if (cityListAllCities().some(function(c){ return c.id === city.id; })){ showToast(town + ' is already one of your cities — use Move on each place'); return false; }
  if (liveCountOf(catsA) + liveCountOf(catsN) !== n0){ showToast('Count mismatch — nothing saved'); return false; }
  const undoDocs = {}; undoDocs[fromId] = docA; undoDocs[city.id] = null; const undoCities = JSON.parse(JSON.stringify(userListData.customCities || []));
  try{ await cmWriteDoc(city.id, city.name, null, catsN); }catch(e){ mpSwallow(e, 'split-write'); showToast('Could not create ' + town); return false; }
  try{ const chk = cmCatsOf(await cmReadDoc(city.id)); if (liveCountOf(chk) !== moved){ showToast('Count mismatch after saving — nothing moved'); try{ await mpData.cityLists.remove(currentUser.uid, city.id); }catch(_){} return false; } }catch(_){}
  try{ await cmWriteDoc(fromId, A.name, cmMetaOf(docA), catsA); }catch(e){ mpSwallow(e, 'split-write-src'); showToast('Could not save ' + A.name + ' — ' + town + ' was created with copies; undo from City'); }
  userListData.customCities = (userListData.customCities || []).concat([city]); try{ await saveUserListGeneral(); }catch(_){}
  cmUndo = { kind: 'split', label: 'Undo split · ' + town + ' out of ' + A.name, at: Date.now(), docs: undoDocs, cities: undoCities, names: { from: A.name, to: town } };
  cmLog('SPLIT · ' + fromId + ' → ' + city.id + ' · ' + moved + ' places · ' + (row ? 'gazetteer' : 'pins centre')); showToast(town + ' is now its own city · ' + moved + ' place' + (moved === 1 ? '' : 's') + ' ✓ — Undo is in City');
  await cmAfter([fromId, city.id]); return true; }
/* ── نقل مكان واحد إلى مدينة أخرى بالتصنيف نفسه ── */
async function cmMovePlace(fromId, catId, index, toId){ if (!currentUser || !fromId || !toId || fromId === toId) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(fromId), B = cmCityOf(toId); if (!A || !B){ showToast('City not found'); return false; } if (pendingCity && pendingCity.id === toId){ showToast('Save the city first'); return false; }
  let docA, docB; try{ docA = await cmReadDoc(fromId); docB = await cmReadDoc(toId); }catch(e){ mpSwallow(e, 'move-read'); showToast('Could not read the lists'); return false; }
  const catsA = cmCatsOf(docA), catsB = cmCatsOf(docB); const src = (catsA[catId] && catsA[catId].places) || []; const p = src[index]; if (!p){ showToast('Place not found'); return false; } const nA = liveCountOf(catsA), nB = liveCountOf(catsB);
  const undoDocs = {}; undoDocs[fromId] = docA; undoDocs[toId] = docB;
  src.splice(index, 1); const q = Object.assign({}, p); delete q.town; q.updatedAt = Date.now(); cmAppend(catsB, catId, [q]); if (liveCountOf(catsA) + liveCountOf(catsB) !== nA + nB){ showToast('Count mismatch — nothing saved'); return false; }
  try{ await cmWriteDoc(toId, B.name, cmMetaOf(docB), catsB); }catch(e){ mpSwallow(e, 'move-write'); showToast('Could not save ' + B.name); return false; }
  try{ const chk = cmCatsOf(await cmReadDoc(toId)); if (liveCountOf(chk) !== nB + 1){ showToast('Count mismatch after saving — nothing moved'); return false; } }catch(_){}
  try{ await cmWriteDoc(fromId, A.name, cmMetaOf(docA), catsA); }catch(e){ mpSwallow(e, 'move-write-src'); showToast('Could not save ' + A.name + ' — the place is now in both; undo from City'); }
  cmUndo = { kind: 'move', label: 'Undo move · ' + (p.name || 'place') + ' → ' + B.name, at: Date.now(), docs: undoDocs, cities: JSON.parse(JSON.stringify(userListData.customCities || [])), names: { from: A.name, to: B.name } };
  cmLog('MOVE PLACE · ' + fromId + ' → ' + toId + ' · 1 place · ' + catId); showToast((p.name || 'Place') + ' → ' + B.name + ' ✓ — Undo is in City');
  await cmAfter([fromId, toId]); if (fromId === cityListCityId && typeof plCityEmptyAsk === 'function') plCityEmptyAsk(); /* r94 (ق١٠-٢٩-٠٩): نقل آخر مكان يفرغ المدينة → السؤال */ return true; }
/* ── Undo للجلسة: يعيد مستندَي المدينتين وقيد المدن كما كانت ── */
async function cmUndoLast(){ const u = cmUndo; if (!u || !currentUser) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } cmUndo = null; const ids = Object.keys(u.docs); userListData.customCities = JSON.parse(JSON.stringify(u.cities)); if (u.kind === 'towndel' && u.forget){ try{ if (typeof tkForget === 'function') tkForget(u.forget); }catch(_){} } /* r97: التراجع عن حذف البلدة يُنسي الأماكن المذكورة كالمحذوفة */
  for (const id of ids){ const d = u.docs[id]; try{ if (d){ const c = cmCityOf(id); let cur = null; try{ cur = await cmReadDoc(id); }catch(_){} await cmWriteDoc(id, (c && c.name) || d.cityName || id, cmMetaOf(d), cmCatsOf(d), cur); } else { await mpData.cityLists.remove(currentUser.uid, id); } }catch(e){ mpSwallow(e, 'cm-undo'); showToast('Could not undo fully — check both cities'); } }
  try{ await saveUserListGeneral(); }catch(_){} if (cityListCityId && !cmCityOf(cityListCityId)){ const all = cityListAllCities(); cityListCityId = all.length ? all[0].id : null; } cmLog('UNDO CITY · ' + u.kind + ' · ' + ids.join(' · ')); showToast('Undone · ' + u.names.from + (u.kind === 'split' ? ' back together' : '') + ' ✓'); await cmAfter(ids); return true; }
/* ── الورقة «⚙ City» ── */
async function cmOpen(){ const bd = document.getElementById('dashBackdrop'); const body = document.getElementById('dashBody'); if (!bd || !body || !cityListCityId) return; const A = cmCityOf(cityListCityId); if (!A) return; bd.classList.add('show'); dashSet('⚙ ' + A.name + ' · city', null); const cats = (myCityListData && myCityListData.categories) || {}; const n = liveCountOf(cats); const others = cmOthers(cityListCityId); const towns = cmTownsOf(cats);
  body.innerHTML = '<div id="cmBody"><div style="font-size:13px; line-height:1.5;"><b>' + escapeHtml(A.name) + '</b> · ' + n + ' place' + (n === 1 ? '' : 's') + (A.country ? ' · ' + escapeHtml(A.country) : '') + '</div>'
    + (cmUndo ? '<div class="chiprow" style="margin:8px 0 2px; flex-wrap:wrap; overflow:visible;"><button type="button" class="chip on" onclick="cmUndoLast()">↶ ' + escapeHtml(cmUndo.label) + '</button></div>' : '')
    + '<div class="dim" style="font-size:11.5px; font-weight:700; margin:12px 0 4px;">Merge into another city</div><div style="font-size:12.5px; line-height:1.45;">Every place here moves to the city you pick, in the same category, marked “' + escapeHtml(A.name) + ' · outside …” — then <b>' + escapeHtml(A.name) + '</b> is removed from your cities. Pins and identities stay.</div>'
    + (others.length ? '<select class="modal-input" style="margin-top:6px;" onchange="cmMergeAsk(this.value)"><option value="">Merge into…</option>' + others.map(function(c){ return '<option value="' + attrStr(c.id) + '">' + escapeHtml(c.name) + ' · ' + ((userListData.cityPlaceCounts || {})[c.id] || 0) + '</option>'; }).join('') + '</select>' : '<div class="dim" style="font-size:12px; margin-top:4px;">No other city of yours in ' + escapeHtml(A.country || 'this country') + ' yet.</div>')
    + '<div class="dim" style="font-size:11.5px; font-weight:700; margin:14px 0 4px;">Split out a town</div><div style="font-size:12.5px; line-height:1.45;">Towns folded into this city at import (“outside ' + escapeHtml(A.name) + '”) — pick one and it becomes its own city with its places.</div>'
    + (towns.length ? '<div class="chiprow" style="margin:6px 0 0; flex-wrap:wrap; overflow:visible; gap:6px; row-gap:8px;">' + towns.map(function(t){ return '<span style="display:inline-flex; gap:2px; align-items:center;"><button type="button" class="chip" style="flex:none;" onclick="cmSplitAsk(\'' + attrStr(t.town) + '\')">' + escapeHtml(t.town) + ' · ' + t.n + ' ⤴</button><button type="button" class="chip" style="flex:none; padding:4px 8px;" onclick="cmTownRemoveAsk(\'' + attrStr(t.town) + '\')" title="Remove ' + attrStr(t.town) + ' and its ' + t.n + ' place' + (t.n === 1 ? '' : 's') + ' from your list">🗑</button></span>'; }).join('') + '</div><div class="dim" style="font-size:11.5px; margin-top:4px;">⤴ makes the town its own city · 🗑 deletes its places (the rest of ' + escapeHtml(A.name) + ' stays; Undo right after).</div>' : '<div class="dim" style="font-size:12px; margin-top:4px;">No folded towns here. To move one place, open it → Edit → “To another city…”.</div>')
    + '<button type="button" class="btn btn-ghost" style="margin-top:14px; padding:7px 14px; font-size:12px;" onclick="closeModalById(\'dashBackdrop\')">Close</button></div>'; }
function cmDupGroups(cats){ /* r96 (ق١٠-٣٠-٠٢): المكرَّر بالهوية (يقين) ثم برمز Plus (البقعة) — مجموعات من مكانين فأكثر */ const byId = {}, byPlus = {}; Object.keys(cats || {}).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p){ if (!p || !(p.geo && typeof p.geo.lat === 'number')) return; const it = { p: p, k: k }; if (p.openId){ (byId[p.openId] = byId[p.openId] || []).push(it); } const pl = tkPlusOf(p.geo); if (pl) (byPlus[pl] = byPlus[pl] || []).push(it); }); }); const groups = []; const seen = new Set(); Object.keys(byId).forEach(function(id){ const g = byId[id]; if (g.length < 2) return; groups.push({ by: 'id', key: id, items: g }); g.forEach(function(it){ seen.add(it.p); }); }); Object.keys(byPlus).forEach(function(pl){ const g = byPlus[pl].filter(function(it){ return !seen.has(it.p); }); if (g.length < 2) return; groups.push({ by: 'plus', key: pl, items: g }); }); return groups; }
function cmDupsHtml(){ const cats = (myCityListData && myCityListData.categories) || {}; const groups = cmDupGroups(cats); if (!groups.length) return ''; let h = '<div class="pl-sub">Places you have twice. <b>Same Google place</b> = pinned on the same place in Google Maps · <b>Same spot</b> = the same Plus-code square (~14 m). Tap a name to open its card, then <b>Keep this</b> on the one to keep — its note and picks are merged from the others — or leave them if they really are two places.</div>' + (cmUndo && cmUndo.kind === 'dups' ? '<div class="chiprow" style="margin:4px 0 2px; flex-wrap:wrap; overflow:visible;"><button type="button" class="chip on" onclick="cmUndoLast()">↶ ' + escapeHtml(cmUndo.label) + '</button></div>' : ''); groups.forEach(function(g, gi){ h += '<div class="cm-dupg" style="margin:6px 0; padding:6px 8px; border:1px solid var(--sand-line); border-radius:10px;"><div class="dim" style="font-size:11px;">' + (g.by === 'id' ? 'Same Google place' : 'Same spot (Plus code)') + ' · ' + g.items.length + '</div>' + g.items.map(function(it, ii){ const lab = (plKnownCatIds()[it.k] ? catLabelOf(it.k) : (/^tk:/.test(it.k) ? it.k.slice(3) : it.k)); const np = Array.isArray(it.p.picks) ? it.p.picks.filter(function(x){ return x && x.name; }).length : 0; const hints = (it.p.topPlace ? ' ⭐' : '') + (String(it.p.note || '').trim() ? ' 📝 note' : '') + (np ? ' · ' + np + ' pick' + (np === 1 ? '' : 's') : ''); return '<div style="display:flex; gap:6px; align-items:center; margin-top:4px;"><span style="flex:1; min-width:0;" dir="auto"><button type="button" class="linklike cm-dupname" onclick="plBoxCardOpen(\'' + attrStr(plSugKey(it.p)) + '\', \'dups\')" title="Open this place’s card">' + escapeHtml(it.p.name || it.p.url || 'Place') + '</button> <span class="dim" style="font-size:11px;">· ' + escapeHtml(lab) + (it.p.area ? ' · ' + escapeHtml(it.p.area) : '') + escapeHtml(hints) + '</span></span><button type="button" class="chip" style="flex:none; padding:2px 9px; font-size:11px;" onclick="cmDupKeep(' + gi + ', ' + ii + ')" title="Keep this one — the others in this group are removed, their notes and picks merged in">Keep this</button></div>'; }).join('') + '</div>'; }); return h; } /* r97 (ق١٠-٣٠-٠٤ · ٠٦ — ملاحظتا المالك ١٣:٤٦ · ١٥:٢٩): جسم صف «Duplicates» في الصندوق (انتقل من ⚙) · Same Google place / Same spot · الاسم زر يفتح البطاقة · تلميحات ⭐ 📝 picks · ↶ Undo داخله */
async function cmDupKeep(gi, ii){ if (!currentUser || !myCityListData) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const cats = myCityListData.categories || {}; const groups = cmDupGroups(cats); const g = groups[gi]; if (!g || !g.items[ii]) return false; const keep = g.items[ii].p; const cityId = cityListCityId; const before = liveCountOf(cats); const undoDocs = {}; try{ undoDocs[cityId] = await cmReadDoc(cityId); }catch(_){ undoDocs[cityId] = null; } let removed = 0; g.items.forEach(function(it){ if (it.p === keep) return; const o = it.p; if (!String(keep.note || '').trim() && String(o.note || '').trim()) keep.note = o.note; else if (String(o.note || '').trim() && String(keep.note || '').indexOf(o.note) < 0) keep.note = String(keep.note || '').trim() + '\n' + o.note; const kp = Array.isArray(keep.picks) ? keep.picks : []; (Array.isArray(o.picks) ? o.picks : []).forEach(function(x){ if (x && x.name && !kp.some(function(y){ return y && y.name === x.name; })) kp.push(x); }); if (kp.length) keep.picks = kp.slice(0, 12); if (o.topPlace && !keep.topPlace){ keep.topPlace = true; keep.topAt = o.topAt || Date.now(); } (o.flags || []).forEach(function(f){ keep.flags = keep.flags || []; if (keep.flags.indexOf(f) < 0) keep.flags.push(f); }); const arr = (cats[it.k] || {}).places || []; const i = arr.indexOf(o); if (i >= 0){ arr.splice(i, 1); removed++; } }); if (!removed) return false; if (liveCountOf(cats) !== before - removed){ showToast('Count mismatch — nothing saved'); return false; } keep.updatedAt = Date.now(); try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'dups'); showToast('Could not save'); return false; } cmUndo = { kind: 'dups', label: 'Undo duplicates · kept ' + (keep.name || 'place'), at: Date.now(), docs: undoDocs, cities: JSON.parse(JSON.stringify(userListData.customCities || [])), names: { from: keep.name || 'place', to: '' } }; cmLog('DUPLICATES · ' + cityId + ' · kept ' + (keep.name || '') + ' · removed ' + removed); showToast('Kept “' + (keep.name || '') + '” · removed ' + removed + ' — Undo is on the Duplicates row'); renderPlacesMine(); return true; } /* r96 (ق١٠-٣٠-٠٢) */
async function cmMergeAsk(toId){ if (!toId) return; const A = cmCityOf(cityListCityId), B = cmCityOf(toId); if (!A || !B) return; const n = liveCountOf((myCityListData && myCityListData.categories) || {}); if (!(await mpConfirm(n + ' place' + (n === 1 ? '' : 's') + ' move to ' + B.name + ' in their categories, marked “' + A.name + '”. ' + A.name + ' is then removed from your cities. You can undo from City right after.', { title: 'Merge ' + A.name + ' into ' + B.name + '?', ok: 'Merge' }))){ cmOpen(); return; } closeModalById('dashBackdrop'); const ok = await cmMerge(cityListCityId, toId); if (ok && cmCityOf(toId)){ try{ await selectCityListCity(toId); }catch(_){} if (typeof renderPlacesMine === 'function') renderPlacesMine(); } }
async function cmSplitAsk(town){ if (!town) return; const A = cmCityOf(cityListCityId); if (!A) return; const n = (cmTownsOf((myCityListData && myCityListData.categories) || {}).find(function(t){ return t.town === town; }) || { n: 0 }).n; if (!(await mpConfirm(n + ' place' + (n === 1 ? '' : 's') + ' marked “' + town + '” leave ' + A.name + ' and become the city ' + town + ' in your list. You can undo from City right after.', { title: 'Split ' + town + ' out of ' + A.name + '?', ok: 'Split out' }))){ cmOpen(); return; } closeModalById('dashBackdrop'); await cmSplit(cityListCityId, town); }
async function cmTownRemoveAsk(town){ if (!town) return; const A = cmCityOf(cityListCityId); if (!A) return; const n = (cmTownsOf((myCityListData && myCityListData.categories) || {}).find(function(t){ return t.town === town; }) || { n: 0 }).n; if (!(await mpConfirm(n + ' place' + (n === 1 ? '' : 's') + ' marked “' + town + '” ' + (n === 1 ? 'is' : 'are') + ' deleted. The rest of ' + A.name + ' stays. You can undo from City right after.', { title: 'Remove ' + town + ' from ' + A.name + '?', ok: 'Delete ' + n + ' place' + (n === 1 ? '' : 's'), danger: true }))){ cmOpen(); return; } closeModalById('dashBackdrop'); await cmTownRemove(cityListCityId, town); } /* r97 (ق١٠-٣٠-٠٥ — سؤال المالك ١٤:٠٨): حذف بلدة مضمومة بلا فصلها أولًا */
async function cmTownRemove(cityId, town){ if (!currentUser || !cityId || !town || cityId !== cityListCityId || !myCityListData) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(cityId); if (!A) return false; const cats = myCityListData.categories || {}; const before = liveCountOf(cats); const undoDocs = {}; try{ undoDocs[cityId] = await cmReadDoc(cityId); }catch(_){ undoDocs[cityId] = null; } const gone = []; Object.keys(cats).forEach(function(k){ const arr = (cats[k] || {}).places || []; for (let i = arr.length - 1; i >= 0; i--){ const p = arr[i]; if (p && (p.name || p.url) && String(p.town || '').trim() === town){ arr.splice(i, 1); gone.push(p); } } }); if (!gone.length){ showToast('No places marked “' + town + '”'); return false; } if (liveCountOf(cats) !== before - gone.length){ showToast('Count mismatch — nothing saved'); return false; } try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'town-remove'); showToast('Could not save'); return false; } try{ if (typeof tkRemember === 'function') tkRemember(gone); }catch(_){} cmUndo = { kind: 'towndel', label: 'Undo remove · ' + town + ' · ' + gone.length, at: Date.now(), docs: undoDocs, cities: JSON.parse(JSON.stringify(userListData.customCities || [])), names: { from: town, to: A.name }, forget: gone }; cmLog('TOWN REMOVED · ' + cityId + ' · ' + town + ' · ' + gone.length + ' places'); showToast('Removed ' + town + ' · ' + gone.length + ' place' + (gone.length === 1 ? '' : 's') + ' — Undo is in City'); if (typeof plTownSel !== 'undefined' && plTownSel === town) plTownSel = ''; await cmAfter([cityId]); if (typeof renderPlacesMine === 'function') renderPlacesMine(); if (typeof plCityEmptyAsk === 'function') plCityEmptyAsk(); return true; } /* r97 (ق١٠-٣٠-٠٥): الأماكن الموسومة بالبلدة تُحذف من المدينة · عدّ قبل/بعد · تُذكر كالمحذوف بيدك · Undo يعيد المستند */
