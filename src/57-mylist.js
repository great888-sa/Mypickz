/* =========================================================
   القائمة الشخصية (Personal List) — بيانات كل مستخدم مسجّل، منفصلة تمامًا عن قائمة المالك
   ========================================================= */
let userListData = { customCities: [], customCountries: [] };
let myListCityId = null;   // المدينة اللي المستخدم شغال عليها جوه "My List"
let sharedCityLists = [];  // قوائم مدن مستخدمين آخرين شُوركت معي بالتحديد (Share with someone)
let myCityListCatsDirty = false, myCityListOldKeys = []; // ر٧٠ط
let myCityListData = null; // بيانات المدينة الحالية بـMy List (المرحلة ١ من إعادة الهيكلة): { public, sharedWith, sharedWithNames, favoriteCount, categories:{} }
let myCityListLoadedFor = null;
let myCityListLoadFailed = false;   // القراءة فشلت — يُمنع كل حفظ حتى تنجح
let myCityListLoadError = '';
async function retryLoadCity(){        // إعادة محاولة صريحة بيد المستخدم
  myCityListLoadFailed = false; myCityListLoadedFor = null;
  await loadMyCityList(myListCityId);
  renderPlacesMine();
} // أي cityId مُحمَّل حاليًا بـmyCityListData (لتفادي إعادة تحميل غير ضرورية)
let currentUserSuspended = false;
let userListLoadFailed = false; // true لو فشلت قراءة userLists شبكيًا — يميّز "لا اسم مستعار" عن "تعذّر التحقق" (لا نحبس المستخدم بخطأ مؤقت)
let myListCountry = null;  // الدولة المختارة حاليًا داخل نافذة "My List"

async function loadSharedCityLists(){
  if (!currentUser){ sharedCityLists = []; return; }
  try{
    const snap = await withAuthRetry(() => mpData.cityLists.sharedWith(currentUser.uid)); // r72t: الأم؛ التركيب بالطبقة أدناه
    sharedCityLists = [];
    const __rows = []; snap.forEach(doc => __rows.push({ docId: doc.id, ...doc.data() })); sharedCityLists = await Promise.all(__rows.map(function(r){ return mpData.cityLists._compose(r, r.docId); })); // r72t (M4.26): المشارَك معي كاملًا بالفرعية
  }catch(e){ sharedCityLists = []; }
}

async function loadUserList(){
  if (!currentUser){ userListData = { customCities: [], customCountries: [], nickname: null }; myListCityId = null; myListCountry = null; currentUserSuspended = false; myCityListData = null; myCityListLoadedFor = null; return; }
  userListLoadFailed = false;
  try{
    const doc = await withAuthRetry(() => mpData.userLists.get(currentUser.uid));
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
  }catch(e){ userListData = { customCities: [], customCountries: [], nickname: null }; userListLoadFailed = true; }
  try{
    // v3: الحالة تُقرأ من suspensions/{uid} (وجود المستند = إيقاف). users.suspended احتياط انتقالي حتى نشر v3.
    const sDoc = await withAuthRetry(() => mpData.suspensions.get(currentUser.uid));
    if (sDoc.exists){ currentUserSuspended = true; }
    else {
      const uDoc = await withAuthRetry(() => mpData.users.get(currentUser.uid));
      currentUserSuspended = uDoc.exists && uDoc.data().suspended === true;
    }
  }catch(e){ currentUserSuspended = false; }
  refreshSuspendedBadge();
}

// معرّف مستند Firestore لبيانات مدينة معيّنة بـMy List الخاصة بالمستخدم الحالي

// تحميل بيانات مدينة معيّنة بـMy List (المرحلة ١ من إعادة الهيكلة) — مستند مستقل لكل مدينة
async function loadMyCityList(cityId){
  if (!currentUser || !cityId){ myCityListData = null; myCityListLoadedFor = null; return; }
  if (myCityListLoadedFor === cityId && myCityListData) return; // محمَّلة أصلًا، لا داعي لإعادة القراءة
  try{
    const data = (await withAuthRetry(() => mpData.cityLists.get(currentUser.uid, cityId))) || {};
    let priv = {};
    try{ priv = await mpData.privatePlaces.get(currentUser.uid, cityId); }catch(e){ priv = {}; }
    let raw = (data.categories && typeof data.categories === 'object') ? data.categories : {};
    if (doc0Exists(data) && !liveCountOf(raw)){ try{ await mpData.cityLists.remove(currentUser.uid, cityId); }catch(e){} raw = {}; } // ر٧٠ط-٢: قائمة فارغة موروثة تُحذف فور فتحها (القاعدة: لا قائمة بلا مكان)
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
    const code = (e && e.code) || '';
    // v1.40 · قواعد ٣٫٨ (ق٠١-٠٧): قراءة المستند الغائب لصاحب البادئة تعود «غير موجود» بلا خطأ —
    // فالمسار الطبيعي للحساب والمدينة الجديدين يمر من فرع !doc.exists أعلاه، وتصنيف الحارس الثالث صار دقيقًا:
    // permission-denied هنا رفضٌ حقيقي (قواعد أو جلسة) لا غيابًا — يُعامل فشلًا حاجبًا للحفظ كأي خطأ آخر.
    myCityListData = { public:false, sharedWith:[], sharedWithNames:{}, bookmarkCount:0, categories:{} };
    myCityListLoadFailed = true; myCityListLoadedFor = null;
    myCityListLoadError = (code === 'permission-denied') ? 'permission denied (rules 3.8: absent docs read as empty — this is a real denial)' : (code || (e && e.message) || 'unknown');
    return;
  }
  myCityListLoadFailed = false;
  myCityListLoadedFor = cityId;
}

// حفظ بيانات المدينة الحالية بـMy List — مستند مستقل، مو الملف الشامل القديم
async function saveMyCityList(){
  await commitPendingCityIfNeeded(myListCityId); // r18: تخليد المدينة المعلقة مع أول حفظ فعلي
  if (!currentUser || !myListCityId || !myCityListData) return;
  // حارس التطابق: لا يُكتب محتوى مدينة فوق مستند مدينة أخرى — ولا يُكتب قبل اكتمال التحميل
  if (myCityListLoadedFor !== myListCityId){
    console.warn('[MyPickz] save skipped — loaded:', myCityListLoadedFor, 'target:', myListCityId);
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
      try{ await mpData.cityLists.remove(currentUser.uid, myListCityId); }catch(e){}
      myCityListOldKeys = []; myCityListCatsDirty = false;
      if (Object.keys(priv).length) await mpData.privatePlaces.save(currentUser.uid, myListCityId, priv);
      userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; if (userListData.cityPlaceCounts[myListCityId]){ userListData.cityPlaceCounts[myListCityId] = 0; try{ await saveUserListGeneral(); }catch(e){} }
      delete __cmSummary.places; try{ await syncCommunityProfile(); }catch(e){} return; // ر٧٢-أ-١د: لا مدينة شبح بالملف العام بعد حذف القائمة الفارغة
    }
    await mpData.cityLists.save(currentUser.uid, myListCityId,
      { ownerId: currentUser.uid, cityId: myListCityId, cityName: cityNameOf(myListCityId) || myListCityId, nickname: userListData.nickname || null, ...meta, categories: pub, catsV: CATS_VERSION }); // ر٧٠ط
    if (myCityListOldKeys.length){ await mpData.cityLists.dropCategoryKeys(currentUser.uid, myListCityId, myCityListOldKeys); myCityListOldKeys = []; } // الدمج لا يحذف المفاتيح القديمة — تُحذف صراحة
    myCityListCatsDirty = false;
    if (Object.keys(priv).length) await mpData.privatePlaces.save(currentUser.uid, myListCityId, priv);
    try{ const total = Object.values(myCityListData.categories || {}).reduce(function(a, e){ return a + ((e && e.places) || []).filter(function(p){ return p && (p.name || p.url); }).length; }, 0); // ر٦٩ع (N-053)
      userListData.cityPlaceCounts = userListData.cityPlaceCounts || {}; if (userListData.cityPlaceCounts[myListCityId] !== total){ userListData.cityPlaceCounts[myListCityId] = total; const patch = { cityPlaceCounts: {} }; patch.cityPlaceCounts[myListCityId] = total; await mpData.userLists.merge(currentUser.uid, patch); } }catch(e){}
    const hasRealPlace = Object.values(myCityListData.categories).some(entry => (entry.places||[]).some(p => p.url && p.name));
    if (hasRealPlace) mpData.users.flag(currentUser.uid, 'hasMyListActivity').catch(()=>{});
  }catch(e){ showToast('Could not save your list'); }
}

// مدن المالك المتاحة للقائمة الشخصية: المنشورة فقط (زي أي زائر بالظبط) — مش أي مدينة لسه Draft
// كل المدن المتاحة للمستخدم داخل قائمته الشخصية: مدن المالك المنشورة + مدنه الخاصة هو بس
function myListAllCities(){ const __all = (userListData.customCities || []).slice(); return pendingCity ? __all.concat([pendingCity]) : __all; } // ز-١-ج-٢: مدني = المعجم (لا إخفاء — كل مدينة ملك صاحبها تُحذف حين لا محتوى)
function myListAllCountries(){
  // الدولة كيان مشتق من مدنها — دولة بلا مدينة لا وجود لها (قرار المالك ٣١ أغسطس)
  return [...new Set(myListAllCities().map(c => c.country).filter(Boolean))];
}
async function pruneEmptyCountries(){        // تنقية الدول اليتيمة بمستند المستخدم
  // حارس: لا تُنقّي قبل أن تكون البيانات محمَّلة فعلًا — وإلا مُسحت الدول كلها بحساب خاطئ
  if (!currentUser || !userListData || userListLoadFailed) return;
  if (!Array.isArray(userListData.customCountries) || !userListData.customCountries.length) return;
  if (!Array.isArray(userListData.customCities)) return;
  const live = new Set(myListAllCities().map(c => c.country).filter(Boolean));
  if (!live.size) return;                    // لا مدن محمَّلة = لا حكم
  const kept = (userListData.customCountries || []).filter(c => live.has(c));
  if (kept.length !== (userListData.customCountries || []).length){
    userListData.customCountries = kept;
    try{ await mpData.userLists.merge(currentUser.uid, { customCountries: kept }); }catch(e){}
  }
}

async function selectMyListCountry(country){
  await saveMyCityList(); // حفظ أي تعديل معلّق بالمدينة الحالية قبل التبديل
  myListCountry = country;
  const firstCity = myListAllCities().find(c => c.country === country);
  myListCityId = firstCity ? firstCity.id : null;
  if (userListData){                                   // آخر دولة تصفّحتها تُحفظ ولو لم تكن فيها مدن
    userListData.listCountry = country; if (myListCityId) userListData.listCity = myListCityId; // ر٧٢-أ-١ز: لا مسح للمحفوظة حين لا مدينة
    const __patch = { listCountry: country }; if (myListCityId) __patch.listCity = myListCityId; mpData.userLists.merge(currentUser.uid, __patch).catch(()=>{});
  }
  await loadMyCityList(myListCityId);
}


async function addMyListCity(){
  // خ٥/م٢-د (r7 — توحيد مع مسار العناوين): الدولة أولًا بقائمة الدول + فحص اللاتينية + منع التكرار
  const country = await openInputModal("Country", "e.g. Saudi Arabia, Italy... (English letters only)", myListCountry || "", WORLD_COUNTRIES.map(c => c.name));
  if (country === null || !country.trim()){ showToast('Country is required'); return; }
  if (!isLatinOnly(country)) { showToast('Country name must be in English letters only'); return; }
  const name = await openInputModal("City · " + country.trim(), "Type to find or add… (English letters only)", "", await gazCityOptions(country.trim()), { allowFree: true }); // N-070 // ر٧٠ب-٢: المعجم المرجعي للدولة — اقتراح لا قيد (ر٧٠د)
  if (!name || !name.trim()) return;
  if (!isLatinOnly(name)) { showToast('City name must be in English letters only'); return; }
  // ر٧٠ب: منع التكرار بالمفتاح المطبَّع (الطبقة ٢) ثم «هل تقصد؟» بالتقارب داخل الدولة نفسها (الطبقة ٣ — ق٠٩-١٠-٠٢)
  const inSameCountry = myListAllCities().filter(c => c.country.toLowerCase() === country.trim().toLowerCase());
  let existing = inSameCountry.find(c => pickerNormalize(c.name) === pickerNormalize(name));
  if (!existing){ const near = pickerNearest(name, inSameCountry); if (near && confirm('Did you mean ' + near.name + '? OK to use it, Cancel to add "' + name.trim() + '" as a new city.')) existing = near; }
  let id = existing ? existing.id : null;
  if (!id){
    const __row = await gazFindCity(country.trim(), name); // ز-١-ج-٢: المعجم وحده — لا مدينة يدوية
    if (!__row){ showToast('City not found in the list — pick one of the suggestions'); return; }
    id = String(__row.id); const __dup = myListAllCities().find(function(c){ return c.id === id; }); if (__dup){ existing = __dup; }
    // ر٧٠د (قرار المالك ١٠ سبتمبر): تُخلَّد فورًا بعدّاد صفر — لا تعليق ولا تبخر؛ الحذف بوضع التحرير
    if (!Array.isArray(userListData.customCities)) userListData.customCities = [];
    if (!existing) userListData.customCities.push(gazEntryToCity(__row, country.trim()));
    pendingCity = null;
    await saveUserListGeneral();
  }
  myListCountry = country.trim();
  myListCityId = id;
}

async function removeMyListCity(cityId, opts){
  if (pendingCity && pendingCity.id === cityId){ pendingCity = null; showToast('City removed'); return; } // معلقة: تتبخر بلا أثر
  const city = (userListData.customCities || []).find(c => c.id === cityId);
  if (!city) return; // حماية: يسمح فقط بحذف المدن اللي أضافها المستخدم نفسه
  if (!(opts && opts.confirmed) && !confirm(`Delete "${escapeHtml(city.name)}" and any places saved under it? This cannot be undone.`)) return;
  userListData.customCities = (userListData.customCities || []).filter(c => c.id !== cityId);
  try{ await mpData.cityLists.remove(currentUser.uid, cityId); }catch(e){} // خ٥/م٢-ب: عبر النواة
  if (myCityListLoadedFor === cityId){ myCityListData = null; myCityListLoadedFor = null; }
  if (myListCityId === cityId){
    const all = myListAllCities();
    let remaining = all.filter(c => c.country === myListCountry);
    if (!remaining.length && all.length){          // لم تبقَ مدينة بهذه الدولة — الدولة تتبع المدينة الجديدة
      myListCountry = all[0].country;
      remaining = all.filter(c => c.country === myListCountry);
    }
    myListCityId = remaining.length ? remaining[0].id : null;
    await pruneEmptyCountries();
    if (userListData) { if (myListCityId) userListData.listCity = myListCityId; userListData.listCountry = myListCountry || ''; // ر٧٢-أ-١ز
      const __p2 = { listCountry: myListCountry || '' }; if (myListCityId) __p2.listCity = myListCityId; mpData.userLists.merge(currentUser.uid, __p2).catch(()=>{}); }
  }
  await saveUserListGeneral();
  await syncCommunityProfile(); // تفادي "بيانات أشباح" لمدينة محذوفة كانت عامة بـcommunityProfiles
  showToast('City deleted');
}


function userCityLinks(){
  if (!myListCityId || !myCityListData) return {};
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

let myListEditingKeys = new Set(); // مفاتيح "itemId#index" للأماكن اللي حاليًا في وضع تعديل
let myListEditBackup = {}; // نسخة أصلية لكل مكان لحظة دخول وضع التعديل — تتيح التراجع قبل الحفظ

function removeUserPlace(id, index){
  const e = userEnsurePlaces(id);
  e.places.splice(index, 1);
  [...myListEditingKeys].forEach(k => { if (k.startsWith(id + '#')) myListEditingKeys.delete(k); });
  saveMyCityList();
}
let updateFieldSaveTimer = null;
async function chooseNickname(){
  const current = userListData.nickname || '';
  const name = await openInputModal("Choose a nickname", "Shown to other users instead of your email", current);
  if (name === null) return false;
  const clean = name.trim();
  if (!clean || clean.length < 3){ showToast('Nickname must be at least 3 characters'); return false; }
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
async function syncCommunityProfile(){
  if (!currentUser) return;
  await syncCommunityProfileFor(currentUser.uid, userListData.nickname || null);
}

async function shareMyListWithSomeone(){
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
    await saveMyCityList();
    showToast('Shared ✓');
  }catch(e){ showToast('Could not verify username'); }
}
async function removeMyListShare(uid){
  if (!myCityListData || !myCityListData.sharedWith) return;
  myCityListData.sharedWith = myCityListData.sharedWith.filter(u => u !== uid);
  await saveMyCityList();
}

async function toggleMyListPublic(){
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

async function selectMyListCity(cityId){
  if (cityId === myListCityId) return;
  await saveMyCityList(); // نحفظ أي تعديل معلّق بالمدينة الحالية قبل ما ننتقل
  myListCityId = cityId;
  const c = myListAllCities().find(c => c.id === cityId);
  if (c) myListCountry = c.country;
  if (userListData && (userListData.listCity !== cityId || userListData.listCountry !== myListCountry)){
    userListData.listCity = cityId; userListData.listCountry = myListCountry || '';
    mpData.userLists.merge(currentUser.uid, { listCity: cityId, listCountry: myListCountry || '' }).catch(()=>{});
  }
  await loadMyCityList(cityId);
}

