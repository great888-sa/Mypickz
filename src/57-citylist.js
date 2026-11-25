/* =========================================================
   r75d (البند ١١ — الكنس): الجزء كان 57-mylist.js ومعرّفاته myList… صارت cityList… (الاسم الحقيقي للكيان: قائمة المدينة) — مسارات التخزين ومفاتيح الوثائق (userCityLists · hasMyListActivity · 'mylist' بمرجع الرحلة · mylist_save) لم تُمس
   القائمة الشخصية (Personal List) — بيانات كل مستخدم مسجّل، منفصلة تمامًا عن قائمة المالك
   ========================================================= */
let userListData = { customCities: [], customCountries: [] };
let cityListCityId = null;   // المدينة اللي المستخدم شغال عليها جوه "My List"
let sharedCityLists = [];  // قوائم مدن مستخدمين آخرين شُوركت معي بالتحديد (Share with someone)
let myCityListCatsDirty = false, myCityListOldKeys = []; // ر٧٠ط
const plVisState = {}; /* r105-أ (الاقتراح الأول): لكل مدينة — { stale: n, repaired: bool, failed: code } من آخر تحميل؛ المؤشر على 🌐 يُضاء حين بقيت تصنيفات بعلم يخالف الأم (إصلاح فشل أو حساب موقوف) */
let myCityListSavedVis = null; /* r104 (ق١١-٠٦-٠١): آخر علمَي رؤية مكتوبَين (public · sharedWith) — تغيّرهما = كل مستندات التصنيفات تأخذهما في دفعة الحفظ نفسها */
const plGoneGen = {}; function plListGone(cityId){ plGoneGen[cityId] = (plGoneGen[cityId] || 0) + 1; } /* ق١١-١٤-١٩ (مقيس): تُعلَّم بعد نجاح الحذف لا قبله — حذفٌ فشل وأبقى المستخدم قائمته لا يترك علامة، ولا عدّاد يُنقَص. كتابة حفظ تصل بعد الحذف تجد العلامة (الطلبات تُنفَّذ بترتيب إرسالها) فتُسحب */ /* r120 (ق١١-١٤-١٧): قائمة هذه المدينة حُذفت بأمر المستخدم — حفظٌ لها ما زال جاريًا يتوقف ولا يعيدها */
let MP_SAVE_WAIT_MS = 8000; /* أقصى انتظار لحفظ جارٍ قبل قراءة مدينته — غير معايَر (ق١١-١٤-١٨): كتابة لا تصل (انقطاع) لا تُبقي التحميل معلّقًا بلا نهاية */
function plSaveWait(cityId){ /* r120 (ق١١-١٦-٠٣ · القاعدة ٥): من يقرأ حال المدينة ينتظر فراغ طابورها كله — الحفظ الجاري والمنتظِر بعده — بالسقف نفسه */ if (!plSaveBusy[cityId] && !plSaveNext[cityId]) return Promise.resolve(); const nop = function(){}; const drain = async function(){ let n = 0; while ((plSaveBusy[cityId] || plSaveNext[cityId]) && n++ < 50){ await (plSaveBusy[cityId] || plSaveNext[cityId].prev).then(nop, nop); } }; return Promise.race([drain(), new Promise(function(z){ setTimeout(z, MP_SAVE_WAIT_MS); })]); }
const plSaveSeq = {}; let myCityListSeenSave = 0; /* ق١١-١٤-١٩ (مقيس): عدد الحفوظ التي وصلت لكل مدينة، وما رآه منها آخر تحميل — حفظ يصل بعد تحميل مدينته (الحدّ انقضى · إعادة بعد فشل) والشاشة بلا تعديل ⇒ تُحمَّل من جديد */
const plSaveBusy = {}; /* r120 (ق١١-١٤-١٧ · المراجعة المستقلة · مقيس): لكل مدينة — وعد حفظها الجاري. تحميل المدينة ينتظره: كان نسخ مكان أو قائمة يعيد تحميل المدينة السابقة قبل أن تصل كتابة حفظها، فتعرض الشاشة ما قبل التعديل، والحفظ التالي يُسقطه من المخزن */
/* ═══ r120 (ق١١-١٦-٠٣ — «موافق على القواعد الست · الخيار ب»): طابور الحفظ لكل مدينة ═══
   قيس (١٦ نوفمبر): حفظان للمدينة نفسها في الطريق والثاني تفشل كتابته ⇒ الحفظ التالي يقول «نجح» والتعديل الثاني لا يُكتب ثم يختفي.
   ١ · حفظ واحد للمدينة في وقت واحد — التالي لا يبدأ قراءته حتى ينتهي الجاري · ٢ · منتظِر واحد: ما يُطلب في الأثناء يُجمع فيه ويأخذ الشاشة كما هي حين يأتي دوره ·
   ٤ · الجاري فشل ⇒ المنتظِر لا يجري من تلقاء نفسه: يُجاب بعد أن تُجاب ورقة الفشل — «حُفظ» إن نجحت «Retry» (وهي حفظ واحد يحمل كل ما على الشاشة)، وإلا «لم يُحفظ». من ينتظره (تبديل المدينة) ينتظر الورقة كما كان قبل الطابور (المراجعة المستقلة ١٣ — قيس). الجاري توقّف بلا فشل (قائمته حُذفت) ⇒ المنتظِر يجري ويحكم بحاله هو · ٦ · لكل مدينة طابورها · الخيار ب: المنتظِر يمضي بعد MP_SAVE_WAIT_MS إن لم ينتهِ الجاري (كتابة معلّقة لا توقف المدينة).
   الانتقال يقع في لحظة انتهاء الجاري نفسها (done في go) — لا فجوة يدخل منها حفظ ثالث. */
const plSaveNext = {}; /* مدينة ← { data, prev, cap, p, res, timer } — الحفظ المنتظِر */
function plSaveTurn(city, n, run){ if (plSaveNext[city] !== n) return false; delete plSaveNext[city]; clearTimeout(n.timer); if (run) n.res(plSaveNow(city, n.data, n.cap, n.out)); return true; } /* run = false: يخرج من الطابور ولا يُجاب هنا — يجيبه الحفظ الذي فشل بعد ورقته (plSaveNow) */
function plSaveLater(city, data, out){ const pass = function(n){ return out ? n.p.then(function(v){ if (n.out.sheet) out.sheet = n.out.sheet; return v; }) : n.p; }; /* من سأل من باب plSaveAsk يأخذ جواب الورقة التي أجابت منتظِره */
  const n0 = plSaveNext[city]; const capNow = function(){ return { uid: currentUser.uid, gen: mpSessionGen, goneAt: plGoneGen[city] || 0, snap: myCityListSaved, oldAll: myCityListOldKeys.slice(), ixStale: myCityListIndexStale, savedVis: myCityListSavedVis }; }; /* ما يخصّ لحظة الطلب: صاحبه وجلسته، وهل حُذفت القائمة بعده — وحال الشاشة إن لم تعد شاشته حين يأتي دوره */
  if (n0 && n0.data === data){ n0.cap = capNow(); return pass(n0); } /* القاعدة ٢ — وحال آخر طلب هي ما يقيس عليه إن انتقلت الشاشة (المراجعة المستقلة ١٤ — قيس: كان يقيس على حال الطلب الأول، فتصنيف حُذف بعده لا يُحذف مستنده) */
  if (n0 || !plSaveBusy[city]) return plSaveNow(city, data, null, out); /* منتظِرٌ لبيانات أخرى للمدينة نفسها (أُعيد تحميلها والطابور لم يفرغ — بعد السقف وحده): يمضي كما كان قبل الطابور */
  const n = { data: data, prev: plSaveBusy[city], cap: capNow(), out: { sheet: '' } };
  n.p = new Promise(function(z){ n.res = z; }); n.timer = setTimeout(function(){ plSaveTurn(city, n, true); }, MP_SAVE_WAIT_MS); plSaveNext[city] = n; return pass(n);
}
function plSnapWrote(data, snap, keys, wrote, dropped){ /* القاعدة ٣: الحفظ يعدّ محفوظًا ما كتبه هو وحده — لا ما على الشاشة عند انتهائه (تعديل وُضع عليها والكتابة في الطريق يبقى «غير محفوظ» ويحمله الحفظ التالي). keys = التصنيفات المكتوبة (null = الكل) · wrote = ما كُتب، ملتقَطًا قبل الكتابة · dropped = ما حُذف مستنده.
     تصنيف ينتظر الحذف (حُذف عن الشاشة والحفظ في الطريق) يبقى في اللقطة: حذفه لم يُحفظ بعد — واللقطة لا تُلغى له، فالحفظ التالي يكتب ما تغيّر ويحذف مستنده، لا القائمة كلها بلا دمج (المراجعة المستقلة ١٤ — قيس) */
  const mineNow = myCityListData === data; const gone = function(s){ (dropped || []).forEach(function(k){ delete s[k]; }); return s; }; /* ما حُذف مستنده يخرج مما يُعدّ محفوظًا — كان يبقى، فإعادته كما كان تُعدّ «لم يتغيّر» ولا تُكتب، و«Discard» يعيده (المراجعة المستقلة ١٣ — قيس) */
  if (!keys){ if (mineNow) myCityListSaved = wrote; return; } /* الكتابة الكاملة: ما كُتب هو ما قُسم عند بدء الحفظ — وما حُذف مستنده لم يكن منه */
  [snap, mineNow ? myCityListSaved : null].forEach(function(s, i){ if (!s || (i && s === snap)) return; keys.forEach(function(k){ s[k] = JSON.parse(JSON.stringify(wrote[k])); }); gone(s); }); /* لقطة هذا الحفظ تُحدَّث في مكانها — منتظِرٌ لم تعد شاشته يقيس عليها */
}
let myCityListIndexStale = false; function plIndexKey(ix){ return (Array.isArray(ix) ? ix : []).map(function(e){ return (e && e.catId) + '|' + (e && e.id) + '|' + (e && e.name) + ((e && e.h === 1) ? '|h' : ''); /* r120 (ق١١-٢٤-١٨): علامة الوسم جزء من الفهرس — فهرس محفوظ بلاها لمكان موسوم «مخالف» فيُكتب كله في الحفظ التالي */ }).sort().join('\n'); } /* r120: فهرس القائمة في الخادم خالف مستندات تصنيفها عند آخر تحميل للمدينة المفتوحة */
let myCityListSaved = null; /* r100-أ: لقطة آخر حالة محفوظة لتصنيفات المدينة المعروضة — الفرق عنها = ما تغيّر محليًّا (يُكتب وحده) وما حُذف محليًّا (لا يعود من المخزن) */
function plSnapSaved(){ if (myCityListOldKeys.length || myCityListCatsDirty){ myCityListSaved = null; return; } /* ترحيل معلَّق: الذاكرة لا تطابق المخزن — الحفظ التالي يكتب كاملًا */ myCityListSaved = JSON.parse(JSON.stringify((myCityListData && myCityListData.categories) || {})); }
function plSnapSavedKeys(keys){ /* r120 (ق١١-١٥-٠٩): كاتبٌ كتب تصنيفات بعينها (استيراد · تراجعه) — لقطتها وحدها تُحدَّث. ما لم يكتبه يبقى على لقطته: تعديل لم يُحفظ فيه ما زال «غير محفوظ» ويحمله الحفظ التالي */ if (!myCityListSaved || !myCityListData) return; const cats = myCityListData.categories || {}; (keys || []).forEach(function(k){ if (cats[k]) myCityListSaved[k] = JSON.parse(JSON.stringify(cats[k])); else delete myCityListSaved[k]; }); }
function plVisSnap(){ myCityListSavedVis = myCityListData ? { nm: Object.assign({}, (myCityListData.sharedWithNames && typeof myCityListData.sharedWithNames === 'object') ? myCityListData.sharedWithNames : {}) /* الأسماء نفسها: «Discard» يعيدها مع المشاركة (المراجعة المستقلة ١٩ — قيس) */, public: myCityListData.public === true, sharedWith: (myCityListData.sharedWith || []).slice(), names: Object.keys((myCityListData.sharedWithNames && typeof myCityListData.sharedWithNames === 'object') ? myCityListData.sharedWithNames : {}) /* r120 (ق١١-١٥-٠٤): أسماء آخر ما كُتب أو حُمّل — ما خرج منها يُمحى صراحةً عند الحفظ */ } : null; } /* r104 */
const plVisSent = {}; /* مدينة ← الرؤية والمشاركة التي يكتبها حفظٌ ما زال في الطريق */
function plVisToScreen(cityId, v){ /* r120 (ق١١-١٥-٠٨ · المراجعة المستقلة ٩ — قيس): مسار كتب الرؤية والمشاركة كما في الخادم (استيراد · تراجعه · «أصلح») يضعها على الشاشة ويجعلها ما يقيس عليه الحفظ التالي — كانت الشاشة تبقى على حالها القديمة. إلا إن غيّرها صاحبها على الشاشة ولم يصل حفظه بعد: حفظه التالي يحملها */
  if (myCityListLoadedFor !== cityId || !myCityListData || !v) return; if (myCityListSavedVis && plVisChanged(myCityListData, myCityListSavedVis)) return;
  myCityListData.public = v.public === true; myCityListData.sharedWith = (v.sharedWith || []).slice(); myCityListData.sharedWithNames = Object.assign({}, v.sharedWithNames || {}); plVisSnap(); }
function plVisChanged(meta, sv){ return !sv || (sv.public !== (meta.public === true)) || mpData.cityLists._sharedKey(sv.sharedWith) !== mpData.cityLists._sharedKey(meta.sharedWith); } /* r120: اللقطة المقارَن بها يمرّرها المستدعي (لقطة مدينة الحفظ الملتقطة) */ /* r104: بلا لقطة = يُعامل متغيّرًا (الأمان للرؤية) */
function plPlaceKey(p){ return (p && (p.id || p.url)) || ''; }
function plMergeCat(local, remote, saved){ /* r100-أ (العائلة ٥ — الكتابة العمياء): الناتج = المحلي ∪ (البعيد − المحذوف محليًّا)؛ مكان لم يُمسّ هنا وتغيّر هناك يؤخذ من هناك */
  const L = (local && local.places) || [], R = (remote && remote.places) || [], S = (saved && saved.places) || [];
  const cnt = function(arr){ const c = {}; arr.forEach(function(p){ const k = plPlaceKey(p); c[k] = (c[k] || 0) + 1; }); return c; }; const cL = cnt(L), cS = cnt(S), cR = cnt(R); const uniq = function(k){ return cL[k] === 1 && cS[k] === 1 && cR[k] === 1; }; /* المفاتيح المكرَّرة (توائم بالهوية نفسها) لا تُبدَّل — تبقى كما في الذاكرة */
  const canon = function(o){ return JSON.stringify(o, Object.keys(o || {}).sort()); }; /* مقارنة بالمحتوى لا بترتيب الحقول */
  const sJ = {}; S.forEach(function(p){ sJ[plPlaceKey(p)] = canon(p); }); const lKeys = new Set(L.map(plPlaceKey)); const rMap = {}; R.forEach(function(p){ rMap[plPlaceKey(p)] = p; });
  const out = L.map(function(p){ const k = plPlaceKey(p); const r = rMap[k]; if (r && uniq(k) && sJ[k] && canon(p) === sJ[k] && canon(r) !== sJ[k]){ Object.keys(p).forEach(function(f){ delete p[f]; }); Object.assign(p, r); } /* يُحدَّث في مكانه — هوية الكائن تبقى للشاشة */ return p; });
  R.forEach(function(q){ const k = plPlaceKey(q); if (!k || lKeys.has(k)) return; if (k in sJ) return; /* كان عندنا وحُذف هنا */ out.push(q); });
  if (local) local.places = out; /* الكيان نفسه يبقى — مراجع الشاشة والمحطات إليه صالحة */ return local || { active: true, places: out };
}
let myCityListData = null; // بيانات المدينة الحالية بـMy List (المرحلة ١ من إعادة الهيكلة): { public, sharedWith, sharedWithNames, favoriteCount, categories:{} }
let myCityListLoadedFor = null; const mpListOpened = {}; /* r116-ح: مدن عُدّ فتحها في هذه الجلسة */
let myCityListLoadSeq = 0, myCityListLoading = false; /* r74m-٣ (سبب عطل الخريطة): تحميلان متزامنان لمدينتين كان الأبطأ منهما يكتب بياناته فوق الأحدث — فتظهر أماكن مدينة تحت اسم أخرى؛ الرقم التسلسلي يُسقط كل تحميل تجاوزه تحميل أحدث */
let myCityListLoadFailed = false;   // القراءة فشلت — يُمنع كل حفظ حتى تنجح
let myCityListLoadError = '';
async function retryLoadCity(){        // إعادة محاولة صريحة بيد المستخدم
  myCityListLoadFailed = false; myCityListLoadedFor = null;
  await loadMyCityList(cityListCityId);
  renderPlacesMine();
} // أي cityId مُحمَّل حاليًا بـmyCityListData (لتفادي إعادة تحميل غير ضرورية)
let currentUserSuspended = false;
/* r120 (ق١١-١٤-٠١ — العيوب الثلاثة من صنف «التطبيق يتصرّف والحساب لم يُحمَّل»):
   userListLoadedFor = معرّف المستخدم الذي قُرئ مستند حسابه بنجاح في هذه الجلسة. بين «عُرف المستخدم» و«وصل مستنده» ما في الذاكرة بديل فارغ (اسم null · مدن [])؛
   كل كاتب يشتقّ من الذاكرة يسأل mpAccountReady قبل أن يكتب (كان الحارس يمنع بعد قراءة فاشلة فقط — لا أثناء القراءة: مقيس بمحطة «الدخول الحقيقي»: الاسم والمدن مُسحا).
   mpSameUser: محمِّل قرأ لمستخدم ثم وصلت قراءته والداخل غيره (خروج · حساب آخر) يهملها — كانت تُكتب في جلسة الثاني (مقيس: اسم الأول ومدنه ورحلته الخاصة معروضة للثاني). */
let userListLoadedFor = null;
let mpSessionGen = 0; /* رقم الجلسة: يزيد مع كل تبدّل للمستخدم (resetSessionState). قراءة بدأت في جلسة ووصلت في أخرى تُهمل ولو عاد المستخدم نفسه (دخول · خروج · دخول) — المراجعة المستقلة (٥): المقارنة بالمعرّف وحده كانت تترك قراءة الجلسة الأولى تمسح حسابًا حمّلته الثانية */
function mpSameUser(uid, gen){ return !!currentUser && currentUser.uid === uid && (gen === undefined || gen === mpSessionGen); }
function mpAccountReady(){ return !!currentUser && userListLoadedFor === currentUser.uid; }
function mpAccountGate(){ if (typeof mpDeleting !== 'undefined' && mpDeleting){ showToast('Your account is being deleted — nothing is saved now'); return false; } /* r120 (ق١١-١٧-٠٦ — قيس: حفظ في الطريق كان يُكتب بعد أن حذف الحذف القائمة) */ if (mpAccountReady()) return true; showToast(userListLoadFailed ? 'Could not load your account · please reload' : 'Your account is still loading — try again in a moment'); return false; }
let userListLoadFailed = false; // true لو فشلت قراءة userLists شبكيًا — يميّز "لا اسم مستعار" عن "تعذّر التحقق" (لا نحبس المستخدم بخطأ مؤقت)
let cityListCountry = null;  // الدولة المختارة حاليًا داخل نافذة "My List"

async function loadSharedCityLists(){
  if (!currentUser){ sharedCityLists = []; return; }
  const __who = currentUser.uid, __gen = mpSessionGen; /* r120: كمحمِّل الحساب — قراءة وصلت والداخل غير صاحبها تُهمل */
  try{
    const snap = await withAuthRetry(() => mpData.cityLists.sharedWith(__who)); if (!mpSameUser(__who, __gen)) return; // r72t: الأم؛ التركيب بالطبقة أدناه
    sharedCityLists = [];
    const __rows = []; snap.forEach(doc => __rows.push({ docId: doc.id, ...doc.data() })); const __full = await Promise.all(__rows.map(function(r){ return mpData.cityLists._compose(r, r.docId); })); if (!mpSameUser(__who, __gen)) return; sharedCityLists = __full; // r72t (M4.26): المشارَك معي كاملًا بالفرعية
  }catch(e){ if (!mpSameUser(__who, __gen)) return; sharedCityLists = []; }
}

async function loadUserList(){
  if (!currentUser){ userListData = { customCities: [], customCountries: [], nickname: null }; cityListCityId = null; cityListCountry = null; currentUserSuspended = false; myCityListData = null; myCityListLoadedFor = null; userListLoadedFor = null; return; }
  const __who = currentUser.uid, __gen = mpSessionGen; userListLoadFailed = false; if (userListLoadedFor !== __who) userListLoadedFor = null; /* تجدّد الجلسة للمستخدم نفسه: ما في الذاكرة حسابه — يبقى جاهزًا حتى تصل القراءة الجديدة */
  try{
    const doc = await withAuthRetry(() => mpData.userLists.getServer(__who)); if (!mpSameUser(__who, __gen)) return; /* r120: القراءة وصلت والداخل غير صاحبها — تُهمل */ /* و-١: من الخادم حصرًا — تعثّر القناة رفضٌ لا مستند فارغ */
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
      cityPlaceCounts: (data.cityPlaceCounts && typeof data.cityPlaceCounts === 'object') ? data.cityPlaceCounts : {}, // ر٦٩ع (N-053): عدّاد أماكن كل مدينة
      cityPinCounts: (data.cityPinCounts && typeof data.cityPinCounts === 'object') ? data.cityPinCounts : {}, cityFromCounts: (data.cityFromCounts && typeof data.cityFromCounts === 'object') ? data.cityFromCounts : {}, // r120 (ع-٦): المثبَّت وما حُفظ من الغير لكل مدينة
      navApp: data.navApp || null, /* المراجعة المستقلة (٩): يُكتب ولا يُحمَّل — كـwaiting */
      waiting: Array.isArray(data.waiting) ? data.waiting : [] /* r120: «Waiting for their city» تُحمَّل مع الحساب — كانت تُكتب ولا تُقرأ، فتفرغ بعد إعادة التحميل ويكتب الحفظ التالي فوقها */
    };
    listBookmarksMap = null; tripSavesMap = null; addrLoaded = false; /* المراجعة المستقلة (١٥ · ١): ما يُشتقّ من الحساب يُبنى من جديد — الخريطتان، وذاكرة العناوين (كانت تُبنى على فهرس فارغ أثناء التحميل ثم يكتب حفظُ عنوان فوق التصنيف كله) */
    userListLoadedFor = __who;
    if (userListData.placesSource && ['mine','bookmarked'].includes(userListData.placesSource)) placesSource = userListData.placesSource;
    try{ const prof = await mpData.profiles.get(__who); if (mpSameUser(__who, __gen)){ userListData.curatorSelf = !!(prof && prof.verified === true); try{ mpChipCurator(); }catch(_){} } }catch(e){} if (!mpSameUser(__who, __gen)) return; // ر٧٢-أ-١د: علم المنتقي لنافذة المكان والدرج
    if (data.myCities !== undefined){ try{ await mpData.userLists.merge(__who, { myCities: mpData.fieldDelete() }); }catch(e){} if (!mpSameUser(__who, __gen)) return; } // ر٧٢-أ-١ح: تنظيف أثر «مدينتي» الملغى من الخاص (مرة)
    listBookmarksMap = null; tripSavesMap = null; // تُبنى من المرآة المحمَّلة لا من الفراغ
    if (userListData && userListData.nickname && !currentUserSuspended){ const __nk = userListData.nickname; mpData.nicknames.ensure(__who, __nk).then(function(r){ if (r !== 'ok') try{ logTiming('NICK · registry ' + r + ' · ' + __nk); }catch(_){} }, function(e){ mpSwallow(e, 'nick-ensure'); }); } /* r118-و: سجل اسمي يُكمَّل عند الدخول إن نقص — بلا انتظار */
  }catch(e){
    if (!mpSameUser(__who, __gen)) return; /* r120: فشل قراءةٍ لمستخدم لم يعد هو الداخل لا يُضيء علم الفشل ولا رسالته للداخل الآن (كان الزائر بعد الخروج يرى «Could not load your account») */
    userListData = { customCities: [], customCountries: [], nickname: null }; userListLoadFailed = true; userListLoadedFor = null;
    /* و-١: الفشل بصوت — سطر باللوحة ورسالة للمستخدم؛ لا إعادة محاولة تلقائية (اختيار ٢ بالبيان): المستخدم يعيد التحميل */
    const __code = (e && (e.code || e.message)) || 'error';
    if (typeof logTiming === 'function') logTiming('[NET] userLists read FAILED · ' + __code);
    try{ const __t = document.getElementById('toast'); __t.textContent = 'Could not load your account · please reload'; __t.classList.add('show'); setTimeout(function(){ __t.classList.remove('show'); }, 8000); }catch(_){} /* القرص نفسه لثماني ثوانٍ (لا ٢٫٢) حتى تُقرأ */
  }
  try{
    // v3: الحالة تُقرأ من suspensions/{uid} (وجود المستند = إيقاف). users.suspended احتياط انتقالي حتى نشر v3.
    const sDoc = await withAuthRetry(() => mpData.suspensions.get(__who)); if (!mpSameUser(__who, __gen)) return;
    if (sDoc.exists){ currentUserSuspended = true; if ((sDoc.data() || {}).deleted === true){ userListLoadedFor = null; userListLoadFailed = true; /* لا يُعدّ محمَّلًا: لا سؤال عن اسم ولا كتابة من أي باب — حتى يصل حدث الخروج */ await mpGoneFinish(); return; } /* r120 (ق١١-١٧-١٠): شاهد حذف قائم — هذا الحساب حُذفت بياناته (جهاز ثانٍ ما زال داخلًا · أو حذفٌ انقطع عند آخر خطوة): لا يُسأل عن اسم ولا يُحمَّل له شيء */ }
    else {
      const uDoc = await withAuthRetry(() => mpData.users.get(__who)); if (!mpSameUser(__who, __gen)) return;
      currentUserSuspended = uDoc.exists && uDoc.data().suspended === true;
      try{ sgLoadFrom(uDoc.exists ? uDoc.data() : {}); }catch(_){} /* r80: المجموعات المحفوظة من القراءة نفسها — لا قراءة إضافية */
    }
  }catch(e){ if (!mpSameUser(__who, __gen)) return; currentUserSuspended = false; }
  refreshSuspendedBadge();
  try{ await mpMirrorReconcile(); }catch(e){ mpSwallow(e, 'mirror reconcile'); } /* الدفعة ٢ (ص-٧): بلا قراءة لغير الموقوف */
}

// معرّف مستند Firestore لبيانات مدينة معيّنة بـMy List الخاصة بالمستخدم الحالي

// تحميل بيانات مدينة معيّنة بـMy List (المرحلة ١ من إعادة الهيكلة) — مستند مستقل لكل مدينة
async function loadMyCityList(cityId){
  if (!currentUser || !cityId){ myCityListData = null; myCityListLoadedFor = null; return; }
  if (myCityListLoadedFor === cityId && myCityListData && !myCityListLoading) return; // محمَّلة أصلًا، لا داعي لإعادة القراءة
  const __who = currentUser.uid, __gen = mpSessionGen; const seq = ++myCityListLoadSeq; myCityListLoading = true; const stale = function(){ return seq !== myCityListLoadSeq || !mpSameUser(__who, __gen); }; /* r74m-٣ · r120: والداخل ما زال صاحب القراءة */
  try{
    await plSaveWait(cityId); const __seen = plSaveSeq[cityId] || 0; /* r120: حفظ هذه المدينة ما زال جاريًا — القراءة بعده، بحدّ · وما وصل من حفوظها حتى هذه القراءة */
    const data = (await withAuthRetry(() => mpData.cityLists.get(__who, cityId))) || {};
    if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; } /* تحميل أحدث بدأ — هذا يُهمل بلا أثر */
    let priv = {};
    try{ priv = await mpData.privatePlaces.get(__who, cityId); }catch(e){ priv = {}; }
    if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; }
    let raw = (data.categories && typeof data.categories === 'object') ? data.categories : {};
    if (doc0Exists(data) && !liveCountOf(raw)){ try{ await mpData.cityLists.remove(__who, cityId); }catch(e){} raw = {}; if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; } } // ر٧٠ط-٢: قائمة فارغة موروثة تُحذف فور فتحها (القاعدة: لا قائمة بلا مكان)
    let __oldKeys = [], __dirty = false; /* r120 (ق١١-١٤-١٨ · مقيس): علما الترحيل يُحسبان لهذه المدينة ويُسندان مع بياناتها في اللحظة نفسها. كانا يُكتبان فقط حين الشجرة قديمة ولا يُصفَّران لمدينة حالية الشجرة — فأعلام مدينة قديمة تنتقل إلى التالية، وحفظ تلك يحذف تصنيفها الحيّ الذي يحمل اسم مفتاح قديم */
    if ((data.catsV || 1) < CATS_VERSION){ __oldKeys = Object.keys(raw).filter(function(k){ return !!CAT_ID_MAP_ONCE[k] || (!catKnown(k) && !isPrivateCategoryId(k)); }); const mg = migrateCategoryKeys(raw, true); raw = mg.categories; __dirty = true; } // ر٧٠ط: إعادة كتابة المعرّفات القديمة لمرة واحدة (تُحفظ مع أول حفظ، والمفاتيح القديمة تُحذف من المستند)
    // ٢٦ أغسطس (٣-ب) — ترحيل مرة واحدة: مفاتيح خاصة موروثة داخل مستند القائمة ⇒ تُنقل للمستند الخاص وتُحذف من القائمة
    // (يُتخطى للموقوف — القواعد ترفض كتابته؛ يبقى الدمج بالذاكرة فقط)
    const split = splitCategories(raw);
    const legacyKeys = Object.keys(split.priv);
    if (legacyKeys.length){
      priv = { ...split.priv, ...priv };
      if (!currentUserSuspended){
        try{
          await mpData.privatePlaces.save(__who, cityId, priv);
          /* r118-ط (ص-٥ · مقيس R2-11a/11b): حذف مفتاح واحد من categories على أم قديمة مرفوض (القاعدة تقبل زوال الحقل كله فقط)، فكان العنوان الخاص يبقى داخل مستند قد يكون عامًّا حتى أول حفظ كامل.
             الآن كتابة الترحيل نفسها: العام إلى مستندات تصنيفاته والحقل القديم يزول كله — في الطلب الذي يلي نسخ الخاص إلى مستنده. */
          await mpData.cityLists.save(__who, cityId, { ownerId: __who, cityId: cityId, cityName: cityNameOf(cityId) || cityId, public: data.public === true, sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [], categories: split.pub });
          await mpData.userLists.addPrivateCity(__who, cityId);
        }catch(e){}
      }
      if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; }
    }
    myCityListOldKeys = __oldKeys; myCityListCatsDirty = __dirty; myCityListSeenSave = __seen;
    myCityListData = {
      public: data.public === true,
      sharedWith: Array.isArray(data.sharedWith) ? data.sharedWith : [],
      sharedWithNames: (data.sharedWithNames && typeof data.sharedWithNames === 'object') ? data.sharedWithNames : {},
      bookmarkCount: data.bookmarkCount || 0,
      categories: split.pub // خ٢: الخاص لم يعد يُدمج بقائمتي — وجهة العناوين هي المحرِّر الوحيد للمستند الخاص
    };
    myCityListIndexStale = data.splitV === 1 && plIndexKey(mpData.cityLists._indexOf(split.pub)) !== plIndexKey(data.index); /* r120 (ق١١-١٥-١٠ · المراجعة المستقلة ١١ — قيس): الفهرس ومستندات التصنيف قُرئا معًا الآن — خلافٌ بينهما يُصلحه الحفظ التالي بكتابة الفهرس كله من هذه الشاشة (كما كان يفعل كل حفظ)؛ بلا خلاف يبقى فهرس ما لا يُكتب من الخادم */
    plSnapSaved(); mpSaveOk('places'); /* r100-أ */
    plVisSnap(); /* r104 */
    delete plVisState[cityId]; /* r105-أ */
    if (Array.isArray(data._visStale) && data._visStale.length){ /* r104 (ق١١-٠٦-٠١): العلاج الذاتي — تصنيفات علمها يخالف الأم (أثر r100-أ على 🌐/المشاركة) تُصلَّح في مكانها من القراءة نفسها، دفعة واحدة، وتُترك أثرًا · r105-أ/ج: الحالة للمؤشر وسطر VIS */
      const nCats = Object.keys(myCityListData.categories || {}).length; plVisState[cityId] = { stale: data._visStale.length, repaired: false, failed: '', ids: data._visStale.slice() };
      if (currentUserSuspended){ plVisState[cityId].failed = 'suspended'; mpVisLine(cityId, myCityListData, 'repair skipped · suspended · ' + data._visStale.length + '/' + nCats + ' cats out of step'); }
      else { try{ await mpData.cityLists.repairVisibility(data._visStale, myCityListData.public, myCityListData.sharedWith); if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; } delete plVisState[cityId]; mpVisLine(cityId, myCityListData, 'repaired ' + data._visStale.length + '/' + nCats + ' cats'); }
        catch(e){ if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; } const __vf = (e && (e.code || e.message)) || 'error'; if (plVisState[cityId]) plVisState[cityId].failed = __vf; /* المراجعة: الحالة قد تُمسح أثناء الانتظار (ضغطة · حفظ) — لا يُكتب على غائب */ mpSwallow(e, 'visibility-repair'); mpVisLine(cityId, myCityListData, 'repair FAILED · ' + __vf + ' · ' + data._visStale.length + '/' + nCats + ' cats out of step'); } }
    }
    try{ // r70q2: تعافي العدّاد ذاتيًّا — إن خالف الواقع (مستند مستخدم صُفّر بعد الأماكن) يُصحَّح ويُحفظ · r120 (ع-٦): والأعداد الثلاثة معًا — قائمة قديمة تُعدّ أول فتح لمدينتها
      const __t = mpCityTally(myCityListData.categories); if (currentUser && !(__t.n === 0 && mpCityCountsNone(cityId))) mpCityCountsWrite(__who, [[cityId, __t]]); }catch(e){}
    // تعبئة تلقائية بأثر رجعي لمعرّفات الأماكن القديمة — لهذي المدينة فقط
    if (backfillPlaceIds(myCityListData.categories) && !currentUserSuspended && Object.keys(myCityListData.categories).length){
      mpData.cityLists.save(__who, cityId, { ownerId: __who, cityId, cityName: cityNameOf(cityId) || cityId, public: myCityListData.public === true, sharedWith: myCityListData.sharedWith || [], categories: myCityListData.categories }, { heal: true }).catch(()=>{}); /* r120 (المراجعة ٤٠ — قيس): تعبئة آلية لا تعديل من صاحبها — لا تُسقط Undo عملية انتهت للتو */ /* r104 (المراجعة المستقلة): الكتابة الكاملة هنا كانت بلا علمَي الرؤية فتُعيد كل التصنيفات خاصة — العلمان يُمرَّران من الأم */
    }
  }catch(e){
    if (stale()){ if (seq === myCityListLoadSeq) myCityListLoading = false; /* لا تحميل أحدث يُطفئها: الداخل تبدّل */ return; }
    const code = (e && e.code) || '';
    // v1.40 · قواعد ٣٫٨ (ق٠١-٠٧): قراءة المستند الغائب لصاحب البادئة تعود «غير موجود» بلا خطأ —
    // فالمسار الطبيعي للحساب والمدينة الجديدين يمر من فرع !doc.exists أعلاه، وتصنيف الحارس الثالث صار دقيقًا:
    // permission-denied هنا رفضٌ حقيقي (قواعد أو جلسة) لا غيابًا — يُعامل فشلًا حاجبًا للحفظ كأي خطأ آخر.
    myCityListData = { public:false, sharedWith:[], sharedWithNames:{}, bookmarkCount:0, categories:{} };
    myCityListLoadFailed = true; myCityListLoadedFor = null; myCityListSaved = null; myCityListSavedVis = null; delete plVisState[cityId]; /* r109 (المراجعة): تحميل فشل — لا مؤشر على بيانات بديلة */ /* r100-أ: بلا لقطة — الحفظ التالي (إن سُمح) يكتب كاملًا */
    myCityListLoadError = mpErrText(e); mpSwallow(e, 'places-load'); if (code === 'permission-denied') try{ logTiming('PLACES · load · permission denied (rules 3.8: absent docs read as empty — this is a real denial)'); }catch(_){} /* r100-د: للمستخدم سبب مفهوم؛ للتشخيص تصنيف الحارس الثالث كما كان */
    myCityListLoading = false; return;
  }
  myCityListLoadFailed = false;
  myCityListLoadedFor = cityId; myCityListLoading = false; try{ setTimeout(function(){ try{ tkReviewSweep(cityId); }catch(_){} }, 0); }catch(_){} /* r120 (ق١١-٢٤-١٥ د): ما حجبه المالك يُحذف عند فتح مدينته */ savedByRebase(cityId, (myCityListData || {}).categories); /* r117-أ: أساس علامات «saved by» لهذه القائمة */ if (!mpListOpened[cityId]){ mpListOpened[cityId] = true; mpTrack.hit('mylist_open', { city: cityId, depth: 1 }); } /* r116-ح: فتح قائمتي في مدينة — مرة للمدينة في الجلسة (إعادة التحميل بعد الحفظ لا تُعدّ) */
  try{ if (typeof dpReconcile === 'function') await dpReconcile(); }catch(_){} /* r103: خطط ما قبل r103 أو مزامنة مقطوعة تلحق بالقائمة مرة بالجلسة */
}

// حفظ بيانات المدينة الحالية بـMy List — مستند مستقل، مو الملف الشامل القديم
async function saveMyCityList(__out){ /* __out: يمرّره plSaveAsk وحده — ما يعيده الحفظ لمن يناديه لا يتغيّر */
  await commitPendingCityIfNeeded(cityListCityId); // r18: تخليد المدينة المعلقة مع أول حفظ فعلي
  if (!currentUser || !cityListCityId || !myCityListData) return;
  if (!mpAccountGate()){ if (!__out) plUnsavedSync(); return false; } /* r120: مستند القائمة يحمل اسم صاحبه من الحساب · أ-١٧ (قيس): الحفظ لم يبدأ والتعديل باقٍ على الشاشة ⇒ «Unsaved» — من يسأل من باب plSaveAsk يتراجع هو، فلا علامة له */
  if (typeof tbForgetCity === 'function') tbForgetCity(cityListCityId); /* ب-٨: نسخة المنشئ من هذه المدينة تُبطَل مع كل حفظ */
  // حارس التطابق: لا يُكتب محتوى مدينة فوق مستند مدينة أخرى — ولا يُكتب قبل اكتمال التحميل
  if (myCityListLoadedFor !== cityListCityId){
    console.warn('[MyPickz] save skipped — loaded:', myCityListLoadedFor, 'target:', cityListCityId);
    try{ logTiming('SAVE · ' + cityListCityId + ' · SKIPPED · loaded ' + (myCityListLoadedFor || 'none')); }catch(_){} showToast('Not saved — this city is still loading, try again in a moment'); /* r87-3 (البند ٤): لا حفظ يختفي بصمت */
    return;
  }
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); if (!__out) plUnsavedSync(); /* أ-١٧ */ return; }
  if (plSaveBusy[cityListCityId] || plSaveNext[cityListCityId]) return plSaveLater(cityListCityId, myCityListData, __out); /* r120 (ق١١-١٦-٠٣): حفظ هذه المدينة يجري — هذا ينتظر دوره */
  return plSaveNow(cityListCityId, myCityListData, null, __out);
}
/* r120 (ق١١-١٧-٠٢ — «أ بالصيغة الأضيق»): قيس — مسار يتراجع عن فعله حين يعود الحفظ «لم يُحفظ»، والورقة قد أجابت: بعد «Discard» يعيد المكان فوق ما أعادته الورقة (مرتين على الشاشة وفي المخزن)، وبعد «Keep on screen» يُلغي ما اختار المستخدم إبقاءه والعلامة «Unsaved» مضاءة.
   باب لمن يتراجع بعد الحفظ: 'saved' حُفظ · 'kept' فشل والورقة أبقت التعديل على الشاشة · 'discarded' فشل والورقة أعادت آخر محفوظ · 'none' لم يبدأ الحفظ أصلًا (بلا ورقة: الحساب لم يُحمَّل · المدينة تُحمَّل · موقوف · الجلسة تبدّلت) — فيها وحدها يتراجع المسار · 'away' لم يُحفظ والشاشة صارت مدينة أخرى — لا يفعل المسار شيئًا. بعد ورقة لا يمسّ المسار البيانات: يعيد رسم لوحته مما على الشاشة، لا أكثر. saveMyCityList يعيد لمن يناديه ما كان يعيده. */
/* r120 (ق١١-١٧-٠٣ · طابور العمل أ — قيس ١٧ نوفمبر): هل ما على الشاشة هو ما يُعدّ محفوظًا؟ true نعم · false لا · null لا يُعرف (بلا بيانات أو بلا لقطة — أول حفظ · تحميل فشل). التصنيفات مفتاحًا مفتاحًا (الترتيب بين التصنيفات لا يُحسب) ثم الرؤية والمشاركة.
   العلامة «Unsaved» تُضبط منها في المواضع التي قيس فيها كذبها: حفظ نجح والشاشة تحمل ما لم يكتبه (أ-١) · ورقة أُجيبت وحفظ آخر كتب كل شيء من خلفها (أ-٢) · ورقة أُجيبت والمدينة لم تعد على الشاشة (أ-١١) · حفظ لم يبدأ والتعديل باقٍ (أ-١٧). */
function plCatSame(a, b){ /* تصنيف الشاشة = تصنيف اللقطة؟ — ومعرّفٌ وُلّد عند التحميل لمكان قديم بلا معرّف ليس تعديلًا من المستخدم (المراجعات ١٩ · ٢٠ · ٢١ — قيس: قائمة قديمة كانت تخالف لقطتها منذ فتحها فتضيء «Unsaved» بلا تعديل؛ وأخذُ اللقطة بعد المعرّفات — علاجٌ جُرّب وسُحب — جعل الدمج يكرّر الأماكن). للعلامة وحدها: ما يكتبه الحفظ يُقاس كما كان */ if (JSON.stringify(a) === JSON.stringify(b)) return true; const pa = a && a.places, pb = b && b.places; if (!Array.isArray(pa) || !Array.isArray(pb) || pa.length !== pb.length) return false; const rest = function(e){ const o = Object.assign({}, e); delete o.places; return JSON.stringify(o); }; if (rest(a) !== rest(b)) return false; for (let i = 0; i < pa.length; i++){ if (JSON.stringify(pa[i]) === JSON.stringify(pb[i])) continue; if (!pa[i] || !pb[i] || pb[i].id || !pa[i].id) return false; const o = Object.assign({}, pa[i]); delete o.id; if (JSON.stringify(o) !== JSON.stringify(pb[i])) return false; } return true; }
function plScreenSaved(){ const d = myCityListData, s = myCityListSaved; if (!d || !s) return null; const c = d.categories || {}; const ks = Object.keys(c); if (ks.length !== Object.keys(s).length) return false; for (let i = 0; i < ks.length; i++){ const k = ks[i]; if (!(k in s) || !plCatSame(c[k], s[k])) return false; } return !(myCityListSavedVis && plVisChanged(d, myCityListSavedVis)); }
function plUnsavedSync(){ const v = plScreenSaved(); if (v === null) return null; if (v) mpSaveStreak.places = 0; mpUnsavedSet('places', !v); return v; }
function plUnsavedSyncOpen(){ /* العلامة للشاشة المفتوحة حين يتكلّم حفظُ مدينة أخرى — وإن كان للمفتوحة حفظ يجري أو ينتظر فهو من يضبطها حين يصل: لا تضيء «Unsaved» لتعديل يُحفظ الآن (المراجعة المستقلة ٢١ — قيس) */ if (cityListCityId && (plSaveBusy[cityListCityId] || plSaveNext[cityListCityId])) return undefined; return plUnsavedSync(); }
const plDiscardGen = {}; /* مدينة ← عدد مرات «Discard» لها: حفظٌ بدأ قبل «Discard» ووصل بعده يعرف أن ما كتبه ليس ما اختاره المستخدم (أ-١) */
async function plSaveAsk(){ const o = { sheet: '' }; const c0 = cityListCityId; let v = false; try{ v = await saveMyCityList(o); }catch(e){ mpSwallow(e, 'save-ask'); if (o.sheet) return (cityListCityId !== c0) ? 'away' : (o.sheet === 'discard' ? 'discarded' : 'kept'); /* أ-٨ (قيس): خطأ رُمي بعد أن أجابت الورقة — جوابها هو الجواب؛ كان يعود «لم يبدأ» فيتراجع المسار فوق ما قرّرته (المكان مرتين بعد «Discard») */ return 'none'; } if (v !== true && cityListCityId !== c0) return 'away'; /* لم يُحفظ والشاشة صارت مدينة أخرى: لا شاشة يتراجع عليها المسار ولا لوحة يرسمها (المراجعة المستقلة ١٦ — قيس: كان يفتح لوحة المدينة الأخرى) */ return v === true ? 'saved' : (o.sheet === 'discard' ? 'discarded' : (o.sheet ? 'kept' : 'none')); }
async function plSaveNow(city, data, cap, out){ /* جسم الحفظ — يبدأ فورًا (cap = null) أو حين يأتي دور المنتظِر (cap = ما التُقط لحظة طلبه) */
  if (cap && !mpSameUser(cap.uid, cap.gen)) return false; /* الجلسة تبدّلت والحفظ ينتظر: لا كتابة في جلسة غير التي طُلب فيها */
  if (!mpAccountGate()){ if (cap && myCityListData === data) plUnsavedSync(); /* r120 (المراجعة ٢٥ — قيس): منتظِرٌ رُفض حين جاء دوره وتعديله على الشاشة — الحفظ الذي سبقه أطفأ العلامة على أنه سيحمله */ return false; } /* والحساب ما زال محمَّلًا حين يأتي دوره — مستند القائمة يحمل اسم صاحبه منه */
  if (cap && currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return false; } /* أُوقف والحفظ ينتظر: لا يبدأ (المراجعة المستقلة ١٣ — قيس) */
  if (cap && typeof tbForgetCity === 'function') tbForgetCity(city); /* ب-٨ · والمنتظِر يُبطلها ثانية حين يأتي دوره: نسخة جُلبت وهو ينتظر لا تحمل ما سيكتبه */
  const __sbCity = city; /* r117-أ: مدينة هذا الحفظ */
  /* r120 (ق١١-١٤-١٧ · مقيس): الحفظ يلتقط مدينته وبياناتها ولقطتها عند بدايته ولا يقرأ غيرها حتى ينتهي. كان يقرأ «المدينة المفتوحة» من جديد بعد كل انتظار:
     مسار يبدّلها والحفظ جارٍ (بدء الاستيراد · نسخ مكان أو قائمة · تراجع مدير المدن) جعله يكتب باسم المدينة الجديدة — تعديل يضيع بصمت، أو أماكن مدينة فوق تصنيف أخرى.
     ما يخصّ الشاشة (اللقطة · علم الترحيل · لقطة الرؤية) يُحدَّث فقط إن بقيت مدينته وبياناتها هي المفتوحة (mine). */
  const st = (myCityListData === data || !cap) ? { snap: myCityListSaved, oldAll: myCityListOldKeys, ixStale: myCityListIndexStale, savedVis: myCityListSavedVis } : cap; /* المنتظِر الذي لم تعد بياناته على الشاشة (انتقلت إلى مدينة أخرى) يقيس على حال شاشته لحظة طلبه — لا على حال المدينة المفتوحة */
  const uid = currentUser.uid, snap = st.snap, oldAll = st.oldAll.slice(), oldKeys = oldAll.filter(function(k){ return !(k in (data.categories || {})); }) /* r120 (ق١١-١٥-١١ — قيس): تصنيف معروض على الشاشة لا يُحذف مستنده — مفتاح حُذف ثم عاد (أُضيف إليه مكان قبل الحفظ) كان يُكتب ثم يُحذف */, ixStale = st.ixStale, savedVis = plVisSent[city] || st.savedVis; /* r120 (المراجعة المستقلة ٨ — قيس): حفظٌ لهذه المدينة ما زال في الطريق ⇒ يُقاس على ما قصده لا على اللقطة القديمة */
  const mine = function(){ return myCityListData === data; }; /* البيانات نفسها ما زالت على الشاشة — المعرّف وحده قد يتبدّل وهي باقية (منتقي الرحلة)، فاللقطة تُحدَّث لها (المراجعة المستقلة · مقيس: كانت تُتخطّى فيُهمل الحذف التالي) */
  const goneAt = cap ? cap.goneAt : (plGoneGen[city] || 0); const still = function(){ return (plGoneGen[city] || 0) === goneAt; }; /* لم تُحذف قائمة هذه المدينة منذ بدأ الحفظ — حُذفت والحفظ جارٍ ⇒ لا كتابة تعيدها (المراجعة المستقلة · مقيس: تراجعٌ أدخله الالتقاط) */
  // نفس فحص روابط خرائط جوجل الموجود أصلًا، مطبَّق على تصنيفات هذي المدينة فقط
  let invalidCount = 0;
  Object.keys(data.categories).forEach(itemId => {
    const entry = data.categories[itemId];
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
  let __sent = null; let __tail = false; /* أ-١٢ (قيس): القائمة كُتبت ثم فشل ما بعدها — ما كُتب لا يُعدّ «لم يُحفظ» */ const __dropped = []; const __o = out || { sheet: '' }; /* جواب ورقة هذا الحفظ إن فشل: 'keep' · 'discard' */ /* منتظِرون أسقطهم فشل هذا الحفظ — يُجابون بعد ورقته */
  const run = async function(){ /* الجسم كله على الملتقَط — يُعاد كما هو إن فشل والمدينة المفتوحة صارت غيرها */
    __tail = false; const __dg0 = plDiscardGen[city] || 0;
    if (!still()) return false;
    // ٢٦ أغسطس (٣-ب): الفئات الخاصة لا تدخل مستند القائمة أبدًا — مستندان: القائمة (عام/مشارَك) والخاص (لصاحبه وحده)
    const { pub, priv } = splitCategories(data.categories);
    const { categories, ...meta } = data;
    const livePlaces = Object.values(pub).reduce(function(a, e){ return a + ((e && e.places) || []).filter(function(q){ return q && (q.name || q.url); }).length; }, 0);
    if (curData[uid]) delete curData[uid]; // ر٧٢-أ-١و: ⭐/الملاحظات تظهر بصفحتي فورًا بعد الحفظ
  if (!livePlaces){ // ر٧٠ج (قرار المالك): القائمة الفارغة لا وجود لها — يُحذف مستندها (كالرحلة الفارغة)؛ المدينة تبقى بعدّاد صفر
      const __emptied = JSON.parse(JSON.stringify(data.categories)); /* ما تقرّر عليه الحذف — يُلتقط قبل الانتظار (القاعدة ٣) */
      try{ await mpData.cityLists.remove(uid, city); }catch(e){}
      if (mine()){ myCityListOldKeys = []; myCityListCatsDirty = false; myCityListSavedVis = null; } /* r104 */
      try{ if (Object.keys(priv).length) await mpData.privatePlaces.save(uid, city, priv); }catch(eT){ __tail = true; if (mine() && myCityListSaved){ const s2 = {}; Object.keys(myCityListSaved).forEach(function(k){ if (isPrivateCategoryId(k)) s2[k] = myCityListSaved[k]; }); Object.keys(pub).forEach(function(k){ s2[k] = JSON.parse(JSON.stringify(__emptied[k])); }); myCityListSaved = s2; } throw eT; } /* أ-١٢: مستند القائمة حُذف ثم فشلت كتابة الخاص — اللقطة تأخذ ما وقع فعلًا (العام فرغ · الخاص كما كان): «Discard» يعيد إليها، لا إلى قائمة لم يعد لها مستند */
      if (!mpCityCountsNone(city)) await mpCityCountsSave(city, { n: 0, pin: 0, from: 0 }); /* لا كتابة لمدينة لم يُعدّ لها شيء قط · r120 (ع-٤ · مقيس): الصفر يُكتب بمفتاحه — كان «يُحفظ» بدالة لا تكتب هذا الحقل، فيبقى العدد القديم على الخادم · (ع-٦): والأعداد الثلاثة معًا */
      delete __cmSummary.places; plSnapWrote(data, null, null, __emptied, null); savedBySaved(__sbCity, {}); /* r117-أ: القائمة فرغت وحُذف مستندها — علامات أساسها تُطلق */ __okFlag(__dg0); /* r100-أ */ try{ await syncCommunityProfile(); }catch(e){} try{ logTiming('SAVE · ' + city + ' · 0 places · list removed'); }catch(_){} return true; // ر٧٢-أ-١د: لا مدينة شبح بالملف العام بعد حذف القائمة الفارغة · r87-3
    }
    /* r100-أ: ما تغيّر عن آخر حفظ يُقرأ من المخزن ويُدمج بالمعرّف ثم يُكتب وحده — المدن بلا لقطة (أول حفظ · تحميل فاشل) تُكتب كاملة كما كانت */
    let onlyCats = null;
    const visChanged = plVisChanged(meta, savedVis); /* r104 · r120: المقارنة بلقطة رؤية هذه المدينة الملتقطة — إعادة الحفظ بعد فشل لا تقرأ لقطة مدينة أخرى (المراجعة المستقلة · مقيس) */
    if (snap){
      const changed = Object.keys(pub).filter(function(k){ return JSON.stringify(pub[k]) !== JSON.stringify(snap[k]); });
      const remotes = {}; for (const k of changed) remotes[k] = await mpData.cityLists.catDoc(uid, city, k); /* r120 (ق١١-١٥-١٠ — قيس): قراءة تصنيف للدمج فشلت ⇒ الحفظ يفشل برسالته ويبقى التعديل على الشاشة. كانت تُعدّ «لا مستند» فيُكتب التصنيف بلا دمج: ما أضافه جهاز آخر يُحذف والحفظ يقول نجح. القراءات كلها قبل أي دمج — فشل إحداها لا يترك الذاكرة مدموجًا نصفها */
      if (!still()) return false; for (const k of changed){ if (remotes[k]) plMergeCat(pub[k], remotes[k], snap[k]); /* يحدّث pub[k] في مكانه — وهو كيان data.categories[k] نفسه */ }
      onlyCats = changed; try{ logTiming('SAVE · ' + city + ' · cats changed ' + changed.length + '/' + Object.keys(pub).length); }catch(_){}
    }
    const __sbMarks = savedByMarks(pub); /* r117-أ: علامات «saved by» كما تُكتب الآن */
    if (!still()) return false; /* حُذفت أثناء قراءة الدمج */
    /* r120 (ق١١-١٥-٠٦ — قيس): الرؤية والمشاركة تُكتبان بما غيّره صاحب الشاشة فوق ما في الخادم الآن — لا من ذاكرة الشاشة. قراءة واحدة لمستند القائمة حين توجد لقطة (المدينة حُمّلت أو حُفظت)؛ بلا لقطة (أول حفظ) تُكتب الذاكرة كما كانت. قراءة فشلت ⇒ الحفظ يفشل برسالته: لا كتابة بحال لم تُعرف */
    let __vis = null, __ixBase = null; if (savedVis){ const head = await mpData.cityLists.headNow(uid, city); if (!still()) return false; if (head.exists) __vis = mpVisResolve(meta, savedVis, head.vis); if (onlyCats && head.exists && head.split && !ixStale){ const dropNow = oldKeys.filter(function(k){ return !(k in (data.categories || {})); }); __ixBase = head.index.filter(function(e){ return e && dropNow.indexOf(e.catId) < 0; }); } /* r120 (ق١١-١٥-١١ · المراجعة المستقلة ١٢ — قيس): ما التُقط للحذف ثم عاد إلى الشاشة والحفظ في الطريق تبقى مداخله */ } /* r120 (ق١١-١٥-١٠ — قيس): القراءة نفسها تعطي فهرس الخادم — مداخل التصنيفات التي لا يكتبها هذا الحفظ تبقى منه (كان الفهرس كله من ذاكرة الشاشة، فيخرج منه ما أضافه جهاز آخر إلى تصنيف لم تمسّه). ما حُذف من تصنيفات على هذه الشاشة لا تعود مداخله */
    if ((typeof mpDeleting !== 'undefined' && mpDeleting) || !currentUser || currentUser.uid !== uid){ if (mine() && (cap || !out)) plUnsavedSync(); else if (!mine() && !out) showToast('Not saved — your change to ' + (cityNameOf(city) || city) + ' could not be saved'); return false; } /* r120 (المراجعات ٢٣ · ٢٤ · ٢٥ — قيس): حفظ بلغ كتابته وحذف الحساب جارٍ (أو خرج صاحبه) لا يكتب — كان يكتب القائمة العامة بعد أن حُذفت. موضعه بعد آخر قراءة وقبل تسجيل «رؤية في الطريق» (plVisSent): حفظ لم يكتب لا يترك أثرًا يقيس عليه الحفظ التالي. لا سحب ولا حذف: إن توقف الحذف بقي التعديل على الشاشة بعلامته «Unsaved» والحفظ التالي يحمله؛ ومن سأل من باب plSaveAsk يتراجع هو فلا علامة له؛ ومدينة لم تعد على الشاشة تُسمّى برسالتها */
    if (__vis){ __sent = plVisSent[city] = { public: __vis.public, sharedWith: __vis.sharedWith.slice(), names: Object.keys(__vis.names) }; } /* ما يُكتب الآن: حفظ يبدأ قبل وصوله يقيس عليه */
    const visSync = __vis ? (__vis.differs || visChanged) : visChanged; /* يخالف الخادم، أو غيّره صاحب الشاشة عمّا قيس عليه (ومنه حفظ في الطريق لم يصل بعد) ⇒ كل مستندات التصنيف تُختم */ const metaW = __vis ? Object.assign({}, meta, { public: __vis.public, sharedWith: __vis.sharedWith, sharedWithNames: __vis.write }) : meta;
    const __visW = __vis ? { nm: Object.assign({}, __vis.names), public: __vis.public, sharedWith: __vis.sharedWith.slice(), names: Object.keys(__vis.names) } : { nm: Object.assign({}, (meta.sharedWithNames && typeof meta.sharedWithNames === 'object') ? meta.sharedWithNames : {}), public: meta.public === true, sharedWith: (meta.sharedWith || []).slice(), names: Object.keys((meta.sharedWithNames && typeof meta.sharedWithNames === 'object') ? meta.sharedWithNames : {}) }; /* القاعدة ٣: الرؤية والمشاركة كما تُكتبان الآن — هي ما يُعدّ محفوظًا، لا ما على الشاشة عند الانتهاء */
    const __wrote = {}; (onlyCats ? onlyCats.concat(Object.keys(priv)) /* والخاص يُكتب كله مع كل حفظ */ : Object.keys(data.categories).filter(function(k){ return (k in pub) || (k in priv); }).concat(Object.keys(pub).concat(Object.keys(priv)).filter(function(k){ return !(k in data.categories); })) /* بترتيب الشاشة، ثم ما كُتب وخرج منها والحفظ يقرأ (ينتظر الحذف: مستنده كُتب) */).forEach(function(k){ __wrote[k] = JSON.parse(JSON.stringify((k in pub) ? pub[k] : priv[k])); }); /* ما يُكتب الآن — يُلتقط قبل الانتظار. الكتابة الكاملة تكتب ما قُسم عند بدء الحفظ (pub · priv): تصنيف أُنشئ والحفظ يقرأ ليس مما يُكتب، فلا يُعدّ محفوظًا (المراجعة المستقلة ١٣ — قيس) */
    const __scr0 = { pub: meta.public === true, key: mpData.cityLists._sharedKey(meta.sharedWith) }; /* ما حُسبت منه هذه الكتابة من رؤية ومشاركة — نسخة تؤخذ الآن: meta.sharedWith قد تكون مصفوفة الشاشة نفسها (مشاركة تُضاف فيها والكتابة في الطريق لا تُرى بمقارنتها بنفسها)، وقد تكون الشاشة استبدلتها أو بدّلت 🌐 والحفظ يقرأ (فلا تُقاس الشاشة على نفسها) */
    const __w = await mpData.cityLists.save(uid, city,
      { ownerId: uid, cityId: city, cityName: cityNameOf(city) || city, nickname: userListData.nickname || null, ...metaW, categories: pub, catsV: CATS_VERSION }, onlyCats ? { onlyCats: onlyCats, syncVis: visSync, indexBase: __ixBase || undefined } : undefined);
    if (__sent && plVisSent[city] === __sent) delete plVisSent[city];
    if (__vis && (data.public === true) === __scr0.pub && mpData.cityLists._sharedKey(data.sharedWith) === __scr0.key){ data.public = __vis.public; data.sharedWith = __vis.sharedWith.slice(); data.sharedWithNames = Object.assign({}, __vis.names); } /* الشاشة تعرض ما كُتب — وهو الحال الحقيقية؛ إلا إن غيّرها صاحبها والحفظ في الطريق (حفظه التالي يحملها) */ // ر٧٠ط · r100-أ · r104: تغيّر الرؤية يُسرى على كل مستندات التصنيفات في الدفعة نفسها
    if (!still()){ try{ await mpData.cityLists.remove(uid, city); }catch(e){ mpSwallow(e, 'save after city removed'); } return false; } /* حُذفت والكتابة في الطريق: ما كُتب يُسحب */
    if ((visSync || !onlyCats) && plVisState[city]){ delete plVisState[city]; if (!(visSync && onlyCats)) mpVisLine(city, metaW, 'in step again · full save'); } /* r105-أ: الختم نجح — لا خلاف بعد الآن (سطر VIS يصدر من طبقة البيانات) · r109 (المراجعة): الحفظ الكامل يكتب كل تصنيف بعلمَي الأم فيطفئ المؤشر هو أيضًا */
    if (mine()){ myCityListSavedVis = __visW; /* r104: اللقطة بعد الكتابة الناجحة · r120: ما كُتب، لا الشاشة */ if (ixStale) myCityListIndexStale = false; /* الفهرس كُتب كله من الشاشة */ }
    const dropped = oldKeys.filter(function(k){ return !(k in (data.categories || {})); }); /* الشاشة تُنظر لحظة الحذف لا لحظة البدء: تصنيف عاد إليها والحفظ في الطريق لا يُحذف مستنده (المراجعة المستقلة ١٢ — قيس) */ let __dropDone = []; const __tailFail = function(eT){ __tail = true; if (onlyCats) plSnapWrote(data, snap, onlyCats, __wrote, __dropDone); if (mine()) myCityListIndexStale = true; /* والفهرس كُتب بلا تصنيفٍ ما زال مستنده قائمًا أو عاد إلى الشاشة — الحفظ التالي يكتبه كله منها */ throw eT; }; /* أ-١٢ (قيس): القائمة وتصنيفاتها كُتبت، ثم فشل حذف مستند تصنيف أو كتابة الخاص — اللقطة تأخذ ما كُتب وما حُذف فعلًا: كانت تبقى على ما قبل الحفظ، فتصنيف حُذف مستنده ثم عاد إلى الشاشة كما كان يُعدّ «لم يتغيّر» ولا يُكتب (أماكنه تضيع عند التحميل التالي) */
    try{ if (dropped.length){ await mpData.cityLists.dropCategoryKeys(uid, city, dropped); __dropDone = dropped; } }catch(eT){ __tailFail(eT); }
    if (mine() && oldAll.length) myCityListOldKeys = myCityListOldKeys.filter(function(k){ return !(dropped.indexOf(k) >= 0 || (oldAll.indexOf(k) >= 0 && (k in (data.categories || {})))); }); /* r120 (ق١١-١٥-١١): يخرج من القائمة ما حُذف مستنده، وما التُقط وهو الآن على الشاشة. ما التُقط ولم يُحذف وليس على الشاشة (عاد ثم حُذف ثانية والحفظ في الطريق) يبقى للحفظ التالي — وكذلك مفتاح أُضيف والحفظ في الطريق */ // الدمج لا يحذف المفاتيح القديمة — تُحذف صراحة
    if (mine()) myCityListCatsDirty = false;
    try{ if (Object.keys(priv).length) await mpData.privatePlaces.save(uid, city, priv); }catch(eT){ __tailFail(eT); }
    await mpCityCountsSave(city, mpCityTally(data.categories)); /* ق١١-١٤-٠٤: حارس «تبديل المدينة أثناء الحفظ» سُحب — قيس قبله وبعده: التبديل ينتظر الحفظ (selectCityListCity) والأعداد صحيحة في الحالين، فلا عيب يُصلَح */ // ر٦٩ع (N-053) · r120 (ع-٦): عدد الأماكن والمثبَّت وما حُفظ من الغير تُكتب معًا لحظة الحفظ
    const hasRealPlace = Object.values(data.categories).some(entry => (entry.places||[]).some(p => p.url && p.name));
    if (hasRealPlace) mpData.users.flag(uid, 'hasMyListActivity').catch(()=>{});
    try{ logTiming('SAVE · ' + city + ' · ' + livePlaces + ' places · ok'); }catch(_){} /* r87-3 (البند ٤): سطر لكل حفظ — الدليل لا الوعد */
    plSnapWrote(data, snap, onlyCats ? onlyCats.concat(Object.keys(priv)) : null, __wrote, dropped); savedBySaved(__sbCity, __sbMarks); /* r117-أ: الباب العام — سجلات «saved by» تطابق علامات النسخ بعد كل حفظ ناجح (المدينة والعلامات كما كُتبتا) */ try{ if (typeof tkRemovedSync === 'function') tkRemovedSync(city, mine() ? (myCityListSaved || __wrote) : (snap || __wrote)); /* مما يُعدّ محفوظًا، لا مما على الشاشة: مكان أُعيد إليها وحفظه ينتظر لم يُكتب بعد (المراجعة المستقلة ١٨ — قيس) */ }catch(eS){ mpSwallow(eS, 'removed-sync'); } /* أ-١٥ */ __okFlag(__dg0); /* r100-أ */ return true;
  };
  const __okFlag = function(dg0){ /* أ-١ (قيس): حفظ نجح — والعلامة تقول ما على الشاشة، لا «كل شيء حُفظ». حفظٌ معلّق تجاوز السقف ووصل بعد أن فشل المنتظِر: بعد «Keep» كان يطفئ «Unsaved» وتعديل المنتظِر لم يُكتب؛ بعد «Discard» كان يترك في المخزن تعديلًا ليس على الشاشة والعلامة مطفأة. منتظِرٌ في الطابور سيحمل ما بقي — العلامة لا تضيء له */
    mpSaveStreak.places = 0; /* حفظ نجح: «Retry» تعود في الورقة التالية ولو بقي على الشاشة ما لم يُكتب (المراجعة المستقلة ١٨ — قيس) */ const disc = (plDiscardGen[city] || 0) !== dg0;
    if (!mine()){ plUnsavedSyncOpen(); return; } /* حفظ مدينة ليست بياناتها على الشاشة لا يطفئ علامة المدينة المفتوحة: العلامة لما عليها (المراجعات ١٨ · ١٩ · ٢٠ — قيس). كتابة معلّقة تصل بعد «Discard» والمدينة غودرت: لا حفظ يتبعها من هنا — قيس (المراجعة ١٩) أن حفظًا يتبع من بيانات ملتقطة يكتب فوق تعديل أحدث حُفظ؛ علاجها ترتيب في الخادم (طابور العمل د-١٠) */
    if (plSaveNext[city]){ mpUnsavedSet('places', false); return; } const __v = plUnsavedSync(); if (__v === null){ mpUnsavedSet('places', false); return; } if (__v) return;
    if (disc) setTimeout(function(){ if (myCityListData !== data || cityListCityId !== city || myCityListLoadedFor !== city || plSaveBusy[city] || plSaveNext[city] || plScreenSaved() !== false) return; saveMyCityList().then(function(){ try{ renderPlacesMine(); }catch(_){} }, function(e2){ mpSwallow(e2, 'save after late write'); }); }, 0); /* «Discard» وقع والكتابة في الطريق: ما اختاره المستخدم هو ما على الشاشة — حفظٌ يتبع يعيد المخزن إليه (وإن فشل فورقته) */
    try{ renderPlacesMine(); }catch(_){} };
  const go = function(){ const p = run(); plSaveBusy[city] = p; const done = function(v, failed){ if (v === true) plSaveSeq[city] = (plSaveSeq[city] || 0) + 1; if (plSaveBusy[city] === p) delete plSaveBusy[city]; const n = plSaveNext[city]; if (n && n.prev === p && plSaveTurn(city, n, !failed) && failed) __dropped.push(n); /* r120 (ق١١-١٦-٠٣): دور المنتظِر — يبدأ الآن إن انتهى الجاري بلا فشل؛ وإن فشل خرج من الطابور وأُجيب بعد الورقة (القاعدة ٤) */ }; p.then(done, function(){ done(false, true); }); return p.then(async function(v){ if (v === true && !mine() && cityListCityId === city && myCityListLoadedFor === city && myCityListData && myCityListSeenSave < (plSaveSeq[city] || 0) && myCityListSaved && JSON.stringify(myCityListData.categories) === JSON.stringify(myCityListSaved)){ myCityListLoadedFor = null; await loadMyCityList(city); if (typeof renderPlacesMine === 'function') renderPlacesMine(); } return v; }); }; /* كتابة هذه المدينة في الطريق — تحميلها ينتظرها (loadMyCityList) */
  try{ return await go(); }
  catch(e){ try{ logTiming('SAVE · ' + city + ' · FAILED · ' + ((e && e.code) || (e && e.message) || 'error')); }catch(_){}
    if (__sent && plVisSent[city] === __sent) delete plVisSent[city]; /* r120 (المراجعة المستقلة ٩ — قيس): لم يصل ⇒ القصد يسقط من «في الطريق» كما في الرحلات. كان يبقى، فيقيس عليه الحفظ التالي ولا يرى تغييرًا: «حُفظ» والقائمة ما زالت عامة */
    const cityAtFail = city; /* r100-أ: ورقة Retry/Discard بدل toast؛ Discard يستعيد آخر لقطة (أو يعيد التحميل إن لم توجد) */
    let __retryOk = false; /* r117 (المراجعة المستقلة الثانية): إعادة المحاولة التي نجحت حفظٌ نجح — كان يُعاد false فيعامله المستدعي فشلًا (ونسخة حُفظت للتوّ تُسحب من الذاكرة ويُعاد عدّها) */
    const __seq0 = plSaveSeq[city] || 0; const __f0 = mpUnsaved.places === true, __dg1 = plDiscardGen[city] || 0; let __laterD = false; const __laterNow = function(){ return mine() && (plDiscardGen[city] || 0) === __dg1 && (plSaveSeq[city] || 0) > __seq0 && plScreenSaved() === true; }; /* «Discard» وقع منذ الفشل (ومنه «Discard» ورقة الإعادة) ⇒ «الشاشة = المحفوظ» لا تعني أن شيئًا حُفظ (المراجعة المستقلة ١٩ — قيس: Retry تفشل ثم Discard كان يُجاب «حُفظ») */ let __ans = ''; try{ __ans = await mpSaveFailed('places', e, async function(){ let r = false; if (mine()) r = await saveMyCityList(__o); /* وإن فشلت الإعادة فورقتها هي التي تجيب */ else { await plSaveWait(city); /* أ-٩ (قيس): حفظٌ آخر لهذه المدينة يجري (أُعيد تحميلها وعُدّلت والورقة مفتوحة) — الإعادة تنتظر دورها: كانت تكتب معه فيضيع تعديله من المخزن ثم من الشاشة والحفظان يقولان «نجح» */ try{ r = await go(); /* ق١١-١٤-١٨ · ١٩ (مقيس): إن أُعيد تحميل المدينة بين الفشل والإعادة فالشاشة تأخذ ما كُتب — من الباب نفسه (go) */ }catch(e2){ mpSwallow(e2, 'save-places retry'); showToast('Not saved — your change to ' + (cityNameOf(city) || 'that city') + ' could not be saved'); } } /* r120: المدينة المفتوحة صارت غيرها — الإعادة تعيد حفظ مدينة الفشل ببياناتها الملتقطة، لا المدينة المفتوحة */ if (r === true) __retryOk = true; return r; }, async function(){ __laterD = __laterNow(); /* قبل أن تُعاد الشاشة: بعدها «الشاشة = المحفوظ» صحيحة دائمًا (المراجعة المستقلة ١٨ — قيس) */ plDiscardGen[cityAtFail] = (plDiscardGen[cityAtFail] || 0) + 1; if (cityListCityId !== cityAtFail || !myCityListData) return; if (myCityListSaved){ const __sv = myCityListSavedVis; if (__sv && plVisChanged(myCityListData, __sv)){ myCityListData.public = __sv.public === true; myCityListData.sharedWith = (__sv.sharedWith || []).slice(); const __nm = Object.assign({}, myCityListData.sharedWithNames || {}, __sv.nm || {}); Object.keys(__nm).forEach(function(u){ if (myCityListData.sharedWith.indexOf(u) < 0) delete __nm[u]; }); myCityListData.sharedWithNames = __nm; } /* أ-٧ (قيس): الرؤية والمشاركة تعودان إلى آخر مكتوب — من الذاكرة لا بقراءة: الحفظ يفشل حين تسوء الشبكة، وقراءةٌ عندها تفشل أو تتأخر (المراجعة المستقلة ١٨ — قيس: قائمة فارغة، وتعديل يُرفض) */ if (__tail) showToast('Part of this change was already saved — the list now shows what is saved'); /* أ-١٢: اللقطة أخذت ما كُتب قبل الفشل — العودة إليها عودةٌ إلى ما في الخادم */ /* أ-١٢ (قيس): القائمة كُتبت قبل الفشل — آخر محفوظ هو ما في المخزن لا لقطة ما قبل الحفظ ⇒ يُعاد التحميل · أ-٧ (قيس): الرؤية أو المشاركة غُيّرت ولم تُحفظ — «Discard» كان يعيد الأماكن وحدها: الشاشة تقول «خاصة» والقائمة عامة، أو مشاركة «أُلغيت» يكتبها الحفظ التالي ⇒ يُعاد التحميل */ myCityListData.categories = JSON.parse(JSON.stringify(myCityListSaved)); myCityListOldKeys = []; myCityListIndexStale = true; /* وما وصل من الحفظ الفاشل قبل فشله لا يُعرف (القائمة قد كُتبت بفهرس بلا ما عاد الآن) — الحفظ التالي يكتب الفهرس كله من الشاشة (المراجعة المستقلة ١٢ — قيس) */ /* r120 (ق١١-١٥-١١ — قيس): اللقطة لا تؤخذ إلا وقائمة «يُحذف» فارغة — العودة إليها عودةٌ إلى تلك الحال. كانت القائمة تبقى، فيحذف الحفظ التالي مستند تصنيف عاد إلى الشاشة */ } else { myCityListLoadedFor = null; await loadMyCityList(cityAtFail); } myCityListCatsDirty = false; renderPlacesMine(); });
    } finally { if (!__retryOk && (__ans === 'discard' ? __laterD : __laterNow())){ __retryOk = true; plUnsavedSync(); } /* أ-٢ (قيس): الورقة مفتوحة وحفظٌ آخر للبيانات نفسها كتب كل ما على الشاشة من خلفها — «حُفظ» هو الجواب: كان المنتظِر يُجاب «لم يُحفظ» وتعديله مكتوب، و«Keep» تضيء «Unsaved» ولا شيء غير محفوظ */
      if (!__retryOk && !mine()){ const __vo = plUnsavedSyncOpen(); if (__vo === null || __vo === undefined) mpUnsavedSet('places', __f0); /* ورقة مدينة ليست على الشاشة: العلامة لما على الشاشة المفتوحة الآن — تُحسب (المراجعة المستقلة ٢٠ — قيس: إعادتها إلى ما كانت قبل الورقة أطفأتها عن تعديل أُبقي، وأبقتها بعد أن حُفظ كل شيء). شاشة بلا لقطة: كما كانت قبل الورقة */ if (__ans === 'keep') showToast('Not saved — your change to ' + (cityNameOf(city) || 'that city') + ' could not be saved'); } /* أ-١١ (قيس): الورقة أُجيبت والمدينة لم تعد على الشاشة — «Keep on screen» لا شاشة لها: كانت تضيء «Unsaved» على مدينة أخرى لا تعديل فيها، والتعديل يضيع بلا كلمة */
      if (!__retryOk && !__o.sheet){ __o.sheet = __ans === 'discard' ? 'discard' : 'keep'; /* ما لم يُعَد إلى آخر محفوظ فهو باقٍ على الشاشة */ if (__ans === 'retry' && mine()) mpUnsavedSet('places', true); /* إعادةٌ لم تبلغ ورقة (أوقفها باب) والتعديل ما زال على الشاشة: العلامة تقول إنه غير محفوظ (المراجعة المستقلة ١٥ — قيس). شاشةٌ صارت لمدينة أخرى لا تُعلَّم بتعديل ليس عليها (المراجعة المستقلة ١٦ — قيس) */ } __dropped.splice(0).forEach(function(n){ const ok = n.data === data && __retryOk; if (!ok) n.out.sheet = __o.sheet; n.res(ok); }); } /* r120 (ق١١-١٦-٠٣ · القاعدة ٤): من كان ينتظر دوره يُجاب الآن — «حُفظ» إن حملت الإعادة تعديله (بياناته هي بيانات هذا الحفظ)، وإلا «لم يُحفظ» */
    try{ renderPlacesMine(); }catch(e3){ mpSwallow(e3, 'render after save sheet'); } /* أ-٨: رسمٌ يرمي لا يقلب جواب الحفظ */ return __retryOk; /* r100-أ: الحقيقة لمن يسأل — لا toast نجاح بعد فشل · r117: ونجاح الإعادة نجاح */
  }
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
  if (!currentUser || !userListData || !mpAccountReady()) return; /* r120: «محمَّل» لا «لم يفشل» */
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
  if (currentUser && !mpAccountGate()) return; /* r120: المدينة تُضاف إلى «مدني» المحمَّلة */
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
  return id; /* r117-ج: المعرّف عند الاكتمال — الإلغاء يعيد undefined، فالمستدعي (tbAddCity) يفرّق بين «أضاف» و«ألغى» */
}

async function removeCityListCity(cityId, opts){
  if (pendingCity && pendingCity.id === cityId){ pendingCity = null; showToast('City removed'); return; } // معلقة: تتبخر بلا أثر
  const city = (userListData.customCities || []).find(c => c.id === cityId);
  if (!city) return; // حماية: يسمح فقط بحذف المدن اللي أضافها المستخدم نفسه
  if (!(opts && opts.confirmed) && !(await mpConfirm('Any places saved under it will be lost. This cannot be undone.', { title: '🗑 Delete "' + city.name + '"?', ok: 'Delete city', danger: true }))) return; /* ب-٢-٢-أ٢ */
  const __cc0 = (userListData.customCities || []).slice(); const __stay = function(msg){ userListData.customCities = __cc0; try{ if (typeof dpSynced !== 'undefined') delete dpSynced[cityId]; }catch(_){} showToast(msg); try{ renderCityListChips(); }catch(_){} }; /* r120 (ق١١-١٧-٢٣ · المراجعة المستقلة ٣٠ — قيس): حذف لم يكتمل ⇒ المدينة تبقى في «مدني» ويُقال ذلك */
  userListData.customCities = (userListData.customCities || []).filter(c => c.id !== cityId);
  try{ if (typeof dpPrivatize === 'function') await dpPrivatize(cityId); }catch(e){ mpSwallow(e, 'dayplans-sync'); } /* r103 (المراجعة): حذف القائمة (أو دمجها) يعيد خططها خاصة */
  if (typeof dpPrivatize === 'function' && typeof dpSynced !== 'undefined' && !dpSynced[cityId] && !(opts && opts.moved)){ __stay('“' + city.name + '” was not deleted — a day plan of it could not be made private. Try again'); return; } /* كانت المدينة تُحذف وخطة يوم لها تبقى عامة بلا طريق إليها */
  const __sbGone = (opts && opts.moved) ? [] : await savedByGather(cityId); /* r117-أ: نسخها المعدودة في «saved by» تُجمع قبل الحذف — إلا حين نُقلت أماكنها إلى مدينة أخرى (الدمج: opts.moved) فالنسخ باقية بعلاماتها */
  try{ if (typeof plSaveWait === 'function') await plSaveWait(cityId); }catch(_){} /* r120 (ج-١ · ق١١-١٧-٢٣ — قيس): الحذف ينتظر حفظ المدينة الجاري — كتابة تقع بين قراءتَي الحذف كانت تُبقي مستند تصنيف عامًّا بلا قائمته */
  let __rm = false; try{ await mpData.cityLists.remove(currentUser.uid, cityId); __rm = true; plListGone(cityId); }catch(e){} // خ٥/م٢-ب: عبر النواة
  if (!__rm){ __stay('Could not delete “' + city.name + '” — it is still in your cities. Try again'); return; } /* كانت تزول من «مدني» ويُقال «City deleted» وقائمتها باقية عامة في الخادم */
  if (__rm) savedByRelease(__sbGone); /* r117-أ: وتُطلق بعد نجاحه — عدّاد كل مكان ينقص واحدًا وسجلي يُحذف */
  await mpCityCountsSave(cityId, null); /* r120 (ع-٤ · مقيس): المدينة زالت من مدني — مفاتيح أعدادها تُحذف على الخادم بعلامتها (كانت تبقى فيبقى عدّها في «مجموع أماكني») */
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
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false; /* r117 (المراجعة المستقلة الثانية): كان يفحص اسم الخادم وحده — «javascript://maps.google.com/%0a…» له اسم خادم مقبول وكان يمرّ رابطًا للمكان */
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
  if (!mpAccountGate()) return false; /* r120: الحساب لم يُحمَّل (ما زال في الطريق أو فشل) — لا كتابة من البديل الفارغ، برسالته؛ false = لم يُحفظ */ /* r119 (المراجعة المستقلة · مهم): مستند الحساب لم يُقرأ — ما في الذاكرة بديل فارغ (اسم null · دول [])، وكتابته تمسح الاسم والدول على الخادم. كانت تُكتب بلا فعل من المستخدم (syncCitiesFromCityLists بعد الدخول) */
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return; }
  try{
    await mpData.userLists.merge(currentUser.uid, { customCities: userListData.customCities || [], customCountries: userListData.customCountries || [], nickname: userListData.nickname || null });
  }catch(e){ mpSwallow(e, 'user-list'); mpErrToast('Could not save your list', e); } /* r100-هـ */
}

let cityListEditingKeys = new Set(); // مفاتيح "itemId#index" للأماكن اللي حاليًا في وضع تعديل
let cityListEditBackup = {}; // نسخة أصلية لكل مكان لحظة دخول وضع التعديل — تتيح التراجع قبل الحفظ

function removeUserPlaceObj(id, pl){ const e = userGetEntry(id); const i = ((e && e.places) || []).indexOf(pl); if (i < 0) return false; return removeUserPlace(id, i); } /* r100-ب: الحذف بالهوية — التوأم (مفتاح مكرّر) لا يُصاب، والمحذوف للتو لا يُحذف ثانية */
function removeUserPlace(id, index){
  const e = userEnsurePlaces(id);
  const gone = e.places.splice(index, 1); try{ if (typeof tkRemember === 'function') tkRemember(gone); }catch(_){} /* r86-3 (البند ٣): المستورَد المحذوف بيدك يُذكر — لا يعود في إعادة الاختيار إلا بطلبك */
  [...cityListEditingKeys].forEach(k => { if (k.startsWith(id + '#')) cityListEditingKeys.delete(k); });
  return saveMyCityList(); /* r100-ب: يعيد وعد الحفظ ليُنتظر تحت مفتاح الحذف */
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
      + '<label class="flabel">' + (current ? 'New nickname' : 'Nickname') + ' <span class="dim">· 3–24 characters</span></label><input type="text" id="nickInput" class="modal-input" autocomplete="off" value="' + attrVal(current) + '" placeholder="e.g. TheCurator" oninput="nickCheck()" onkeydown="if (event.key === \'Enter\') nickSave()">'
      + '<div class="errline" id="nickStatus"></div>'
      + '<div class="ctx">' + (current ? 'Changes on all your public lists and your curator page' : 'You can change it later in Settings') + '</div>'
      + '<div style="display:flex; gap:8px; margin-top:14px;"><button type="button" class="btn btn-ghost" style="flex:1" onclick="nickCancel()">Cancel</button><button type="button" class="btn btn-brass" style="flex:1" id="nickSaveBtn" onclick="nickSave()">Save nickname</button></div>';
    bd.classList.add('show'); mpLenWatch('nickInput', MP_LIMITS.nickname); /* r100-ج */ setTimeout(function(){ const i = document.getElementById('nickInput'); if (i){ try{ i.focus(); i.select(); }catch(_){} } }, 30);
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
  if (!mpLenOk('nickInput', MP_LIMITS.nickname)) return; /* r100-ج */
  if (btn) btn.disabled = true;
  const ok = await saveNickname(v);
  if (btn) btn.disabled = false;
  if (ok){ const r = __nickResolve; __nickResolve = null; dashBack(); if (r) r(true); }
}
async function saveNickname(name){ /* منطق الحفظ القائم كما هو — حجز الاسم · تحرير القديم · المستند الأم · نسخ الاسم بقوائم المدن · الملف العام */
  if (!mpAccountGate()) return false; /* r120 (المراجعة المستقلة ٢): «الاسم الحالي» يُقرأ من الحساب — أثناء التحميل كان الاسم الجديد يُحجز والقديم لا يُحرَّر ويُقال «Nickname saved ✓» */
  if (currentUserSuspended){ showToast('Your account is suspended — you can\'t save changes'); return false; } /* r120 (ق١١-١٤-٢٧): كان الحفظ العام يقولها بعد أن حُجز الاسم — الآن قبل أي كتابة */
  const current = userListData.nickname || '';
  const clean = String(name || '').trim();
  if (!clean || clean.length < 3){ showToast('Nickname must be at least 3 characters'); return false; }
  if (clean.length > 24){ showToast('Nickname must be 24 characters or fewer'); return false; }
  if (clean === current){ try{ await mpData.nicknames.ensure(currentUser.uid, clean); }catch(e){ mpSwallow(e, 'nick-ensure'); } return true; } /* r118-و: إعادة حفظ الاسم نفسه تُكمل سجله إن نقص (كانت تعود بلا كتابة) */
  if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}_.'\- ]*$/u.test(clean)){ showToast('Letters, numbers, spaces, _ . - only'); return false; } /* r100-ج: لا HTML ولا فواصل مسار في معرّف nicknames — بعد فحص «لم يتغيّر» كي لا يُرفض اسم قديم يُعاد حفظه */
  const key = clean.toLowerCase();
  try{
    const doc = await mpData.nicknames.get(key);
    if (doc.exists && doc.data().uid !== currentUser.uid){
      showToast('This nickname is already taken — try another');
      return false;
    }
    { let __oldMine = ''; if (current && current.toLowerCase() !== key){ const oldDoc0 = await mpData.nicknames.get(current.toLowerCase()); /* r120 (المراجعة المستقلة ٥ — قيس: قراءة فاشلة كانت تُبتلع فيُحجز الجديد والقديم باقٍ): فشلها يوقف التبديل برسالته */ if (oldDoc0.exists && oldDoc0.data().uid === currentUser.uid) __oldMine = current.toLowerCase(); }
      await mpData.nicknames.swap(key, { uid: currentUser.uid, nickname: clean }, __oldMine); } /* r120 (ق١١-١٤-٢٧): طلب واحد — الحجز والتحرير واسم الحساب معًا (كان الحجز يسبق الحفظ: حفظ يفشل يترك حجزًا بلا اسم) */
    userListData.nickname = clean;
    try{ await mpData.users.merge(currentUser.uid, { nickname: clean }); }catch(e){ mpSwallow(e, 'nickname-user'); } /* r100-هـ */
    // تحديث النسخة المكررة من الاسم بكل مستندات مدن المستخدم (تُستخدَم لاستعلام Community Lists بدون قراءات إضافية)
    try{
      await mpData.cityLists.setNicknameAll(currentUser.uid, clean);
    }catch(e){ mpSwallow(e, 'nickname-lists'); } /* r100-هـ */
    await syncCommunityProfile();
    showToast('Nickname saved ✓');
    return true;
  }catch(e){
    mpSwallow(e, 'nickname'); mpErrToast('Could not save nickname', e); /* r100-هـ */
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
      const __pt = await mpData.trips.publicByOwner(uid); /* r109 (المراجعة · مانع): قرار كتابة — من الخادم لا من ذاكرة الجلسة */
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
async function ensureCommunityNick(){ if (__cmNickSynced || !currentUser || !userListData || !userListData.nickname) return; try{ await mpData.communityProfiles.set(currentUser.uid, { nickname: userListData.nickname }); __cmNickSynced = true; }catch(e){ mpSwallow(e, 'community-nick'); } /* r100-هـ */ }
async function syncCommunityProfile(){
  if (!currentUser) return;
  if (!mpAccountReady()){ await syncCommunityProfileFor(currentUser.uid, undefined); return; } /* r120: بلا حساب محمَّل يُزامَن المحتوى العام ولا يُمسّ الاسم (كان يُكتب nickname: null) — المراجعة المستقلة (٦): سحب العلنية يحتاج المزامنة */
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
    const __c = cityListCityId; /* r120 (ق١١-١٧-٠٣ · المراجعة المستقلة ١٧ — قيس): خطط اليوم تتبع مدينة القائمة التي حُفظت — «المدينة المفتوحة» قد تكون تبدّلت والحفظ ينتظر، فتبقى الخطة عامة أو مشارَكة تحت قائمة صارت خاصة */ const __d = myCityListData; const __r = await plSaveAsk(); ensureCommunityNick(); /* r120 (ق١١-١٧-٠٣ · أ-٧ — قيس): «Shared ✓» كانت تُقال والحفظ فشل — وبعد «Discard» تبقى المشاركة على الشاشة ويكتبها الحفظ التالي */
    if (__r === 'none'){ const __i = (__d.sharedWith || []).indexOf(targetUid); if (__i >= 0) __d.sharedWith.splice(__i, 1); if (__d.sharedWithNames) delete __d.sharedWithNames[targetUid]; showToast('Could not save'); return; } /* لم يبدأ الحفظ: المشاركة تخرج من الشاشة — لا تبقى عليها بلا حفظ */
    if (__r === 'saved'){ try{ if (typeof dpSyncWithList === 'function') await dpSyncWithList(__c); }catch(e){ mpSwallow(e, 'dayplans-sync'); } /* r103: خطط اليوم تتبع القائمة — بعد كتابة ناجحة فقط */ showToast('Shared ✓'); } /* «Keep»: باقية «Unsaved» · «Discard»: أُعيد التحميل · الشاشة صارت مدينة أخرى: لا شيء */
  }catch(e){ mpSwallow(e, 'share-list'); mpErrToast('Could not verify username', e); } /* r100-هـ */
}
async function removeCityListShare(uid){
  if (!myCityListData || !myCityListData.sharedWith) return;
  const __d = myCityListData; const __prev = { nm: (__d.sharedWithNames || {})[uid] };
  myCityListData.sharedWith = myCityListData.sharedWith.filter(u => u !== uid); if (myCityListData.sharedWithNames) delete myCityListData.sharedWithNames[uid]; /* r103 (المراجعة): الاسم يُمحى مع المعرّف */
  const __c = cityListCityId; /* ق١١-١٧-٠٣: خطط اليوم لمدينة هذه القائمة */ const __r = await plSaveAsk(); /* r120 (ق١١-١٥-٠٤): الاسم خرج من الذاكرة — الحفظ يمحوه من المستند صراحةً */
  if (__r === 'none' || __r === 'discarded'){ if (__r === 'none' && (__d.sharedWith || []).indexOf(uid) < 0) __d.sharedWith = (__d.sharedWith || []).concat([uid]); if ((__d.sharedWith || []).indexOf(uid) >= 0 && __prev.nm !== undefined){ __d.sharedWithNames = __d.sharedWithNames || {}; __d.sharedWithNames[uid] = __prev.nm; } if (__r === 'none') showToast('Could not save'); return; } /* أ-٧ (قيس): لم يبدأ الحفظ — المشاركة تعود إلى الشاشة: لا تقول «أُلغيت» وهي قائمة */
  if (__r === 'saved'){ try{ if (typeof dpSyncWithList === 'function') await dpSyncWithList(__c); }catch(e){ mpSwallow(e, 'dayplans-sync'); } } /* r103 · خطط اليوم بعد كتابة ناجحة فقط — كانت تُزامَن بأعلام شاشة لم تُحفظ حين لا يبدأ الحفظ */
}

async function toggleCityListPublic(){
  if (!myCityListData) return;
  if (!myCityListData.public){
    if (!mpAccountGate()) return; /* r120: «بلا اسم» يُحكم به على حساب محمَّل */
    if (!userListData.nickname){
      const ok = await chooseNickname();
      if (!ok) return;
    }
  }
  const __d = myCityListData; __d.public = !__d.public;
  if (__d.public) mpTrack.hit('reserved_2'); // ر٦٣: نشر عام
  const __c = cityListCityId; /* ق١١-١٧-٠٣: خطط اليوم لمدينة هذه القائمة */ const __r = await plSaveAsk();
  if (__r === 'none'){ __d.public = !__d.public; showToast('Could not save'); return; } /* أ-٧ (قيس): لم يبدأ الحفظ (موقوف · الحساب يُحمَّل) — الشاشة كانت تقول «خاصة» والقائمة عامة، بلا علامة */
  await syncCommunityProfile();
  if (__r === 'saved'){ try{ if (typeof dpSyncWithList === 'function') await dpSyncWithList(__c); }catch(e){ mpSwallow(e, 'dayplans-sync'); } } /* r103: خطط اليوم تتبع القائمة — بعد كتابة ناجحة فقط (المراجعة) */
}

async function selectCityListCity(cityId){
  if (cityId === cityListCityId){ try{ if (typeof dpReconcile === 'function') await dpReconcile(); }catch(e){ mpSwallow(e, 'dayplans-sync'); } return; } /* r120 (المراجعة المستقلة ٣٠ — قيس): خطة يوم لم تتبع القائمة تُعاد محاولتها حين تُختار المدينة نفسها من جديد — الرسالة تعد بذلك */
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
let cmUndo = null; let cmUndoWaiting = false; /* { kind, label, at, docs: { cityId: doc|null }, cities: [...], counts: {...} } */
async function cmSavedFirst(ids){ /* r120 (ق١١-٢٥-٠٥ — المراجعتان ٣٩ `12` و٤١، قيس): على الشاشة ما لم يصل الخادم («Unsaved») — يُحفظ أولًا، فتكون لقطة التراجع من الخادم وفيها هو وما كتبه جهاز آخر. لم يُحفظ ⇒ العملية لا تبدأ (ورقة «Not saved» قالت ما جرى). كانت اللقطة بلا المكان غير المحفوظ فيحذفه Undo */ if (mpUnsaved.places !== true) return true; if (ids && ids.indexOf(cityListCityId) < 0) return true; /* (ق١١-٢٥-٠٦ — المراجعة ٤١ `x02`، قيس) الدمج والفصل والنقل: المدينة المفتوحة طرف فيها ⇒ ستُحمَّل من جديد، وما لم يُحفظ عليها كان يزول بلا رسالة */ const c0 = cityListCityId; const r = await plSaveAsk(); return r === 'saved' && cityListCityId === c0; }
function cmUndoStale(cityId){ /* r120 (ق١١-٢٥-٠٥ — المراجعة المستقلة ٣٩، قيس على الكود القديم والجديد): Undo الدمج والفصل والنقل وحذف البلدة و«Keep this» يعيد لقطة كاملة لمدنه؛ إن حُفظت إحداها بعد العملية (مكان أُضيف، ملاحظة كُتبت) كان التراجع يعيد اللقطة فوقها فيُحذف ما أُضيف. الآن: أول حفظ لأماكن مدينة في اللقطة يُسقط ذلك التراجع — «Undo حتى فعل آخر» كما يقول التطبيق. العملية نفسها تكتب ثم تضع تراجعها، فلا يمسّها هذا. تراجع العلامات (unmark) لا لقطة فيه فيبقى */ const u = cmUndo; if (!u || !u.docs || !(String(cityId) in u.docs)) return; /* تراجع العلامات لقطته فارغة ({}) فلا تبلغه هذه القاعدة */ cmUndo = null; try{ cmLog('UNDO CITY · dropped · ' + cityId + ' was saved after “' + u.label + '”'); }catch(_){} }
function cmCityOf(id){ return cityListAllCities().find(function(c){ return c.id === id; }) || null; }
function cmOthers(cityId){ const me = cmCityOf(cityId); return cityListAllCities().filter(function(c){ return c.id !== cityId && (!me || c.country === me.country) && !(pendingCity && pendingCity.id === c.id); }); }
async function cmReadDoc(cityId){ await plSaveWait(cityId); /* r120 (ق١١-١٤-١٨ · مقيس): مدير المدن (دمج · نقل · فصل · تراجع) يقرأ المدينة بعد أن يصل حفظها الجاري — كان الدمج يُضيع التعديل */ const d = await mpData.cityLists.get(currentUser.uid, cityId); return d || null; }
function cmMetaOf(doc){ const m = Object.assign({}, doc || {}); delete m.categories; delete m.index; delete m.splitV; delete m.cityId; delete m.cityName; delete m.ownerId; delete m.nickname; delete m.catsV; delete m.favoriteCount; delete m.bookmarkCount; delete m.viewCount; delete m.copyCount; /* r118-د (ك-٣): العدّادات ليست «بيانات وصفية» يعيدها صاحبها — القاعدة تشترطها أصفارًا عند الإنشاء وثابتة عند التعديل */ return m; }
async function cmWriteDoc(cityId, cityName, meta, cats, prevDoc){ if (!mpAccountReady()) throw Object.assign(new Error('account not loaded'), { code: 'account-loading' }); /* r120 */ await mpData.cityLists.save(currentUser.uid, cityId, Object.assign({ public: false, sharedWith: [], sharedWithNames: {}, bookmarkCount: 0 }, meta || {}, { ownerId: currentUser.uid, cityId: cityId, cityName: cityName, nickname: userListData.nickname || null, categories: cats, catsV: CATS_VERSION })); const stale = Object.keys((prevDoc && prevDoc.categories) || {}).filter(function(k){ return !(k in cats); }); if (stale.length) await mpData.cityLists.dropCategoryKeys(currentUser.uid, cityId, stale); } /* الحفظ يدمج ولا يحذف الفرعيات الغائبة — تُحذف صراحةً (كما في saveMyCityList) */
function cmScreenDoc(){ return { ownerId: currentUser.uid, cityId: cityListCityId, cityName: cityNameOf(cityListCityId) || cityListCityId, public: myCityListData.public === true, sharedWith: (myCityListData.sharedWith || []).slice(), sharedWithNames: Object.assign({}, myCityListData.sharedWithNames || {}), categories: JSON.parse(JSON.stringify(myCityListData.categories || {})) }; } /* r120 (ق١١-١٥-١٠ — قيس): مدينة لا قائمة لها في الخادم بعد (أماكنها على الشاشة لم تُحفظ) — لقطة التراجع ما على الشاشة قبل العملية. كانت «لا مستند»، والتراجع يفهمها «العملية أنشأت المدينة» فيحذف قائمتها ومعها ما بقي */
function cmVisOf(doc){ return { public: !!doc && doc.public === true, sharedWith: (doc && Array.isArray(doc.sharedWith)) ? doc.sharedWith.slice() : [], sharedWithNames: (doc && doc.sharedWithNames && typeof doc.sharedWithNames === 'object') ? Object.assign({}, doc.sharedWithNames) : {} }; } /* r120 (ق١١-١٥-٠٨): رؤية مستند ومشاركته — نسخة مستقلة */
function cmCatsOf(doc){ const raw = (doc && doc.categories && typeof doc.categories === 'object') ? doc.categories : {}; const out = {}; Object.keys(raw).forEach(function(k){ if (isPrivateCategoryId(k)) return; const e = raw[k] || {}; out[k] = { active: e.active !== false, places: (e.places || []).filter(function(p){ return p && (p.name || p.url); }).map(function(p){ return Object.assign({}, p); }) }; }); return out; }
function cmAppend(cats, k, list){ if (!list.length) return; cats[k] = cats[k] || { active: true, places: [] }; cats[k].active = true; cats[k].places = (cats[k].places || []).concat(list); }
function cmTownsOf(cats){ const by = {}; Object.keys(cats).forEach(function(k){ (cats[k].places || []).forEach(function(p){ const t = String(p.town || '').trim(); if (t) by[t] = (by[t] || 0) + 1; }); }); return Object.keys(by).sort(function(a, b){ return by[b] - by[a] || a.localeCompare(b); }).map(function(t){ return { town: t, n: by[t] }; }); }
async function cmAfter(touched){ touched.forEach(function(id){ if (typeof tbForgetCity === 'function') tbForgetCity(id); }); const pairs = []; for (const id of touched){ if (!cmCityOf(id)){ pairs.push([id, null]); /* r120 (ع-٤): مدينة زالت — مفاتيحها تُحذف على الخادم */ continue; } try{ const d = await cmReadDoc(id); pairs.push([id, mpCityTally(cmCatsOf(d))]); }catch(_){} } await mpCityCountsWrite(currentUser.uid, pairs); if (touched.indexOf(myCityListLoadedFor) >= 0 || touched.indexOf(cityListCityId) >= 0){ myCityListLoadedFor = null; myCityListData = null; if (cityListCityId && cmCityOf(cityListCityId)) await loadMyCityList(cityListCityId); } try{ await syncCommunityProfile(); }catch(_){} if (typeof renderPlacesMine === 'function') renderPlacesMine(); }
function cmLog(line){ try{ logTiming(line); }catch(_){} }
/* ── الدمج: كل أماكن المدينة A إلى B بالتصنيف نفسه · town = A · area إن فرغت · ثم تُحذف A ── */
async function cmMerge(fromId, toId){ if (!currentUser || !fromId || !toId || fromId === toId) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(fromId), B = cmCityOf(toId); if (!A || !B){ showToast('City not found'); return false; } if (pendingCity && (pendingCity.id === fromId || pendingCity.id === toId)){ showToast('Save the city first'); return false; } if (!(await cmSavedFirst([fromId, toId]))) return false;
  let docA, docB; try{ docA = await cmReadDoc(fromId); docB = await cmReadDoc(toId); }catch(e){ mpSwallow(e, 'merge-read'); showToast('Could not read the lists'); return false; }
  const catsA = cmCatsOf(docA), catsB = cmCatsOf(docB); const nA = liveCountOf(catsA), nB = liveCountOf(catsB); if (!nA){ showToast(A.name + ' has no places — delete it instead'); return false; }
  const undoDocs = {}; undoDocs[fromId] = docA; undoDocs[toId] = docB; const undoCities = JSON.parse(JSON.stringify(userListData.customCities || []));
  Object.keys(catsA).forEach(function(k){ const moved = (catsA[k].places || []).map(function(p){ const q = Object.assign({}, p); q.town = A.name; if (!String(q.area || '').trim()) q.area = A.name; q.updatedAt = Date.now(); return q; }); cmAppend(catsB, k, moved); });
  if (liveCountOf(catsB) !== nA + nB){ showToast('Count mismatch — nothing saved'); return false; }
  try{ await cmWriteDoc(toId, B.name, cmMetaOf(docB), catsB); }catch(e){ mpSwallow(e, 'merge-write'); showToast('Could not save ' + B.name); return false; }
  { let __bad = false; try{ const chk = cmCatsOf(await cmReadDoc(toId)); if (liveCountOf(chk) !== nA + nB){ showToast('Count mismatch after saving — ' + A.name + ' was kept'); cmLog('MERGE · ' + fromId + ' → ' + toId + ' · FAILED count'); __bad = true; } }catch(_){}
    if (__bad){ try{ await cmAfter([toId]); }catch(e){ mpSwallow(e, 'merge-count'); } /* الهدف كُتب — أعداده تُحدَّث وإن رُفض الدمج · ق١١-١٤-٠٤ (مقيس): الرفض خارج try — كان تحديث الأعداد داخلها، فإن رمى ابتُلع الرفض ومضى الدمج فحذف المدينة الأصل */ return false; } }
  await removeCityListCity(fromId, { confirmed: true, moved: true }); /* r117-أ (المراجعة المستقلة): أماكنها انتقلت إلى المدينة الأخرى بعلاماتها — لا يُطلق شيء من «saved by» */
  cmUndo = { uid: currentUser.uid, kind: 'merge', label: 'Undo merge · ' + A.name + ' → ' + B.name, at: Date.now(), docs: undoDocs, cities: undoCities, names: { from: A.name, to: B.name } };
  cmLog('MERGE · ' + fromId + ' → ' + toId + ' · ' + nA + ' places · ' + B.name + ' now ' + (nA + nB)); showToast(A.name + ' → ' + B.name + ' · ' + nA + ' place' + (nA === 1 ? '' : 's') + ' ✓ — Undo is in City');
  await cmAfter([fromId, toId]); return true; }
/* ── الفصل: أماكن البلدة town داخل المدينة → مدينة بذاتها (المعجم ثم مركز الدبابيس) · town يُمسح ── */
async function cmSplit(fromId, town){ if (!currentUser || !fromId || !town) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } if (!(await cmSavedFirst([fromId]))) return false; const A = cmCityOf(fromId); if (!A){ showToast('City not found'); return false; } if (cityListAllCities().some(function(c){ return c.id !== fromId && c.country === A.country && pickerNormalize(c.name) === pickerNormalize(town); })){ showToast(town + ' is already one of your cities — use Move on each place'); return false; }
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
  cmUndo = { uid: currentUser.uid, kind: 'split', label: 'Undo split · ' + town + ' out of ' + A.name, at: Date.now(), docs: undoDocs, cities: undoCities, names: { from: A.name, to: town } };
  cmLog('SPLIT · ' + fromId + ' → ' + city.id + ' · ' + moved + ' places · ' + (row ? 'gazetteer' : 'pins centre')); showToast(town + ' is now its own city · ' + moved + ' place' + (moved === 1 ? '' : 's') + ' ✓ — Undo is in City');
  await cmAfter([fromId, city.id]); return true; }
/* ── نقل مكان واحد إلى مدينة أخرى بالتصنيف نفسه ── */
async function cmMovePlace(fromId, catId, index, toId){ if (!currentUser || !fromId || !toId || fromId === toId) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(fromId), B = cmCityOf(toId); if (!A || !B){ showToast('City not found'); return false; } if (pendingCity && pendingCity.id === toId){ showToast('Save the city first'); return false; }
  const __w = (fromId === cityListCityId && myCityListData) ? ((((myCityListData.categories || {})[catId] || {}).places || []).filter(function(q){ return q && (q.name || q.url); })[index] || null) : null; const __same = function(q){ return !!q && !!__w && (__w.id ? q.id === __w.id : (q.name === __w.name && (q.url || '') === (__w.url || ''))); }; /* r120 (ق١١-٢٥-٠٦ — المراجعة ٤٢ `y3` `y4`، قيس): المكان المقصود يُعرَف بهويته قبل أي انتظار — صف يُحذف فوقه والحفظ في الطريق كان يجعل الموضع يشير إلى مكان آخر فيُنقل غير المقصود */
  if (!(await cmSavedFirst([fromId, toId]))) return false;
  let docA, docB; try{ docA = await cmReadDoc(fromId); docB = await cmReadDoc(toId); }catch(e){ mpSwallow(e, 'move-read'); showToast('Could not read the lists'); return false; }
  const catsA = cmCatsOf(docA), catsB = cmCatsOf(docB); const src = (catsA[catId] && catsA[catId].places) || []; if (__w && !__same(src[index])) index = src.findIndex(__same); const p = src[index]; if (!p){ showToast('Place not found'); return false; } const nA = liveCountOf(catsA), nB = liveCountOf(catsB);
  const undoDocs = {}; undoDocs[fromId] = docA; undoDocs[toId] = docB;
  src.splice(index, 1); const q = Object.assign({}, p); delete q.town; q.updatedAt = Date.now(); cmAppend(catsB, catId, [q]); if (liveCountOf(catsA) + liveCountOf(catsB) !== nA + nB){ showToast('Count mismatch — nothing saved'); return false; }
  try{ await cmWriteDoc(toId, B.name, cmMetaOf(docB), catsB); }catch(e){ mpSwallow(e, 'move-write'); showToast('Could not save ' + B.name); return false; }
  { let __bad = false; try{ const chk = cmCatsOf(await cmReadDoc(toId)); if (liveCountOf(chk) !== nB + 1){ showToast('Count mismatch after saving — nothing moved'); __bad = true; } }catch(_){}
    if (__bad){ try{ await cmAfter([toId]); }catch(e){ mpSwallow(e, 'move-count'); } /* ق١١-١٤-٠٤: الرفض خارج try — كما في الدمج */ return false; } }
  try{ await cmWriteDoc(fromId, A.name, cmMetaOf(docA), catsA); }catch(e){ mpSwallow(e, 'move-write-src'); showToast('Could not save ' + A.name + ' — the place is now in both; undo from City'); }
  cmUndo = { uid: currentUser.uid, kind: 'move', label: 'Undo move · ' + (p.name || 'place') + ' → ' + B.name, at: Date.now(), docs: undoDocs, cities: JSON.parse(JSON.stringify(userListData.customCities || [])), names: { from: A.name, to: B.name } };
  cmLog('MOVE PLACE · ' + fromId + ' → ' + toId + ' · 1 place · ' + catId); showToast((p.name || 'Place') + ' → ' + B.name + ' ✓ — Undo is in City');
  await cmAfter([fromId, toId]); if (fromId === cityListCityId && typeof plCityEmptyAsk === 'function') plCityEmptyAsk(); /* r94 (ق١٠-٢٩-٠٩): نقل آخر مكان يفرغ المدينة → السؤال */ return true; }
/* ── Undo للجلسة: يعيد مستندَي المدينتين وقيد المدن كما كانت ── */
async function cmUndoLast(){ const u = cmUndo; if (!u || !currentUser) return false; if (u.uid !== currentUser.uid){ cmUndo = null; try{ cmLog('UNDO CITY · dropped · not this account’s'); renderPlacesMine(); }catch(_){} return false; } /* r120 (ق١١-٢٥-٠٦ — المراجعة ٤١ `x04`، قيس): تراجع حسابٍ لا يُكتب في حسابٍ آخر — وخانته تُمسح عند تبدّل الحساب (resetSessionState) */ if (u.unmark) return mpBusyRun('dups', function(){ return cmDupUnmark(u); }); /* r120 (ق١١-٢٥-٠٤) */ if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; }
  /* r120 (ق١١-٢٥-٠٥ — المراجعة ٤٠، قيس): حفظ في الطريق لحظة الضغط يصل أولًا — فإن كتب أماكن مدينةٍ في اللقطة سقط Undo ولا يُكتب فوقه (كان يُعيد اللقطة فوق مكان قيل عنه «Saved»). وتعديل على الشاشة لم يُحفظ («Unsaved») لا تُعاد اللقطة فوقه. */
  if (cmUndoWaiting) return false; cmUndoWaiting = true; try{ for (const id of Object.keys(u.docs)) await plSaveWait(id); }catch(_){} finally{ cmUndoWaiting = false; }
  if (cmUndo !== u){ if (!cmUndo){ showToast('Nothing to undo — the list changed after that'); try{ renderPlacesMine(); }catch(_){} } return false; }
  if (mpUnsaved.places === true && cityListCityId && (String(cityListCityId) in u.docs)){ showToast('Unsaved changes on screen — Undo would erase them. Nothing was changed'); return false; }
  cmUndo = null; const ids = Object.keys(u.docs);
  /* r120 (ق١١-١٥-٠٨ — قيس): التراجع يعيد الأماكن كما كانت؛ الرؤية والمشاركة ليستا مما يعيده — تُكتبان بما في الخادم الآن. كان يكتبهما من اللقطة، فيعود من خرج من المشاركة بعد العملية وتعود «عامة» قائمةٌ جُعلت خاصة.
     القراءة قبل أي تغيير، وأول قراءة تفشل توقف التراجع ولا شيء تغيّر (كانت قراءة فاشلة تُعدّ «لا مستند» فيمضي التراجع بلقطته). مدينة حذفتها العملية لا مستند لها يُقرأ: تُعاد بلقطتها كما كانت.
     عملية أحدث انتهت والقراءة في الطريق: تراجعها هو الباقي — لا يُكتب فوقه هذا (المراجعة المستقلة ٩ — قيس). */
  const __uCur = {}, __uVis = {};
  try{ for (const id of ids){ __uCur[id] = await cmReadDoc(id); if (u.docs[id]) __uVis[id] = cmVisOf(__uCur[id] || u.docs[id]); } }
  catch(e){ mpSwallow(e, 'cm-undo-read'); if (!cmUndo) cmUndo = u; cmLog('UNDO CITY · read failed · nothing changed · ' + ((e && e.code) || e)); showToast('Could not undo — nothing was changed. Try Undo again'); return false; }
  const __uCitiesBefore = JSON.parse(JSON.stringify(userListData.customCities || [])); /* r118-د */ userListData.customCities = JSON.parse(JSON.stringify(u.cities)); if (u.kind === 'towndel' && u.forget){ try{ if (typeof tkForget === 'function') tkForget(u.forget); }catch(_){} } /* r97: التراجع عن حذف البلدة يُنسي الأماكن المذكورة كالمحذوفة */
  /* r118-د (ك-٣): الإعادة أولًا ثم الحذف — وأول فشل يوقف التراجع. كان يكمل بعد فشل إعادة المدينة المدموجة فيسحب أماكنها من الأخرى ثم يقول «Undone ✓»: الأماكن في لا مكان.
     الآن: ما أُعيد يبقى، ما لم يُعَد لا يُمسّ، وUndo يعود متاحًا لمحاولة ثانية. */
  const __uOrder = ids.filter(function(id){ return u.docs[id] && !__uCur[id]; }).concat(ids.filter(function(id){ return u.docs[id] && __uCur[id]; })).concat(ids.filter(function(id){ return !u.docs[id]; })); /* المفقودة تُعاد أولًا · ثم القائمة تُردّ إلى ما كانت · ثم ما أُنشئ يُحذف */
  let __uDone = 0;
  for (const id of __uOrder){ const d = u.docs[id]; try{ if (d){ const c = cmCityOf(id); await cmWriteDoc(id, (c && c.name) || d.cityName || id, Object.assign(cmMetaOf(d), __uVis[id]), cmCatsOf(d), __uCur[id]); } else { await mpData.cityLists.remove(currentUser.uid, id); plListGone(id); } __uDone++; }
    catch(e){ mpSwallow(e, 'cm-undo'); cmUndo = u; cmLog('UNDO CITY · stopped at ' + id + ' after ' + __uDone + ' · ' + ((e && e.code) || e));
      if (!__uDone){ userListData.customCities = __uCitiesBefore; showToast('Could not undo — nothing was changed. Try Undo again'); }
      else { try{ await saveUserListGeneral(); }catch(_){} showToast('Could not finish the undo — nothing was lost; some places are now in both cities. Try Undo again'); }
      try{ await cmAfter(ids.filter(function(x){ return !!cmCityOf(x); })); }catch(_){} return false; } }
  try{ await saveUserListGeneral(); }catch(_){} if (cityListCityId && !cmCityOf(cityListCityId)){ const all = cityListAllCities(); cityListCityId = all.length ? all[0].id : null; } cmLog('UNDO CITY · ' + u.kind + ' · ' + ids.join(' · ')); showToast('Undone · ' + u.names.from + (u.kind === 'split' ? ' back together' : '') + ' ✓'); await cmAfter(ids); savedByRecount(u.docs); /* r117-أ (المراجعة المستقلة الثانية): ما أعاده التراجع بعد حذف (بلدة · مكرّرات) أُطلق عدّه عند الحذف — يُعدّ من جديد؛ وما لم يُطلق (دمج · فصل) سجله قائم فلا يتغيّر */ return true; }
/* ── الورقة «⚙ City» ── */
async function cmOpen(){ const bd = document.getElementById('dashBackdrop'); const body = document.getElementById('dashBody'); if (!bd || !body || !cityListCityId) return; const A = cmCityOf(cityListCityId); if (!A) return; bd.classList.add('show'); dashSet('⚙ ' + A.name + ' · city', null); const cats = (myCityListData && myCityListData.categories) || {}; const n = liveCountOf(cats); const others = cmOthers(cityListCityId); const towns = cmTownsOf(cats);
  body.innerHTML = '<div id="cmBody"><div style="font-size:13px; line-height:1.5;"><b>' + escapeHtml(A.name) + '</b> · ' + n + ' place' + (n === 1 ? '' : 's') + (A.country ? ' · ' + escapeHtml(A.country) : '') + '</div>'
    + (cmUndo ? '<div class="chiprow" style="margin:8px 0 2px; flex-wrap:wrap; overflow:visible;"><button type="button" class="chip on" onclick="cmUndoLast()">↶ ' + escapeHtml(cmUndo.label) + '</button></div>' : '')
    + ((typeof tkCityChipsHtml === 'function') ? tkCityChipsHtml() : '') /* r98b */
    + '<div class="dim" style="font-size:11.5px; font-weight:700; margin:12px 0 4px;">Merge into another city</div><div style="font-size:12.5px; line-height:1.45;">Every place here moves to the city you pick, in the same category, marked “' + escapeHtml(A.name) + ' · outside …” — then <b>' + escapeHtml(A.name) + '</b> is removed from your cities. Pins and identities stay.</div>'
    + (others.length ? '<select class="modal-input" style="margin-top:6px;" onchange="cmMergeAsk(this.value)"><option value="">Merge into…</option>' + others.map(function(c){ return '<option value="' + attrVal(c.id) + '">' + escapeHtml(c.name) + ' · ' + ((userListData.cityPlaceCounts || {})[c.id] || 0) + '</option>'; }).join('') + '</select>' : '<div class="dim" style="font-size:12px; margin-top:4px;">No other city of yours in ' + escapeHtml(A.country || 'this country') + ' yet.</div>')
    + '<div class="dim" style="font-size:11.5px; font-weight:700; margin:14px 0 4px;">Split out a town</div><div style="font-size:12.5px; line-height:1.45;">Towns folded into this city at import (“outside ' + escapeHtml(A.name) + '”) — pick one and it becomes its own city with its places.</div>'
    + (towns.length ? '<div class="chiprow" style="margin:6px 0 0; flex-wrap:wrap; overflow:visible; gap:6px; row-gap:8px;">' + towns.map(function(t){ return '<span style="display:inline-flex; gap:2px; align-items:center;"><button type="button" class="chip" style="flex:none;" onclick="cmSplitAsk(\'' + attrStr(t.town) + '\')">' + escapeHtml(t.town) + ' · ' + t.n + ' ⤴</button><button type="button" class="chip" style="flex:none; padding:4px 8px;" onclick="cmTownRemoveAsk(\'' + attrStr(t.town) + '\')" title="Remove ' + attrVal(t.town) + ' and its ' + t.n + ' place' + (t.n === 1 ? '' : 's') + ' from your list">🗑</button></span>'; }).join('') + '</div><div class="dim" style="font-size:11.5px; margin-top:4px;">⤴ makes the town its own city · 🗑 deletes its places (the rest of ' + escapeHtml(A.name) + ' stays; Undo right after).</div>' : '<div class="dim" style="font-size:12px; margin-top:4px;">No folded towns here. To move one place, open it → Edit → “To another city…”.</div>')
    + '<button type="button" class="btn btn-ghost" style="margin-top:14px; padding:7px 14px; font-size:12px;" onclick="closeModalById(\'dashBackdrop\')">Close</button></div>'; }
/* ═══ r107-ب (ق١١-١٠-٠٢): Far pins — ما سبق حفظه بعيدًا عن مدينته بلا وسم Outside. الرمز القصير الذي فُكّ حول بلدة خطأ يحمل الأحرف الستة نفسها، فقراءته حول المدينة تعيده إلى مربعه الصحيح (عكس الخلل تمامًا) —
   يُعرض الموضع المقترح وبُعده، والنقل بيد المستخدم (واحدًا أو الكل) مع تراجع للجلسة؛ مكان بعيد حقًّا يُترك أو يوسم Outside / يُنقل إلى مدينته من بطاقته. ═══ */
let cmFarUndo = null;
function cmFarPins(){ const A = cmCityOf(cityListCityId); if (!A || typeof A.lat !== 'number' || !myCityListData) return []; const rr = tkCityR(A); const cats = myCityListData.categories || {}; const out = [];
  Object.keys(cats).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p){ if (!p || !(p.geo && typeof p.geo.lat === 'number') || String(p.town || '').trim()) return; const d = plKm(A, p.geo); if (d - rr <= TK_NEAR_KM) return; const code = tkPlusOf(p.geo); const fromCode = p.geo.source === 'user_paste' && p.geo.via === 'code'; /* المراجعة المستقلة: النقل لدبوس جاء من رمز وحده — دبوس من رابط أو من الخريطة أو من الاستيراد بعيدٌ حقًّا */ const alt = fromCode ? tkPlusRecover(code, A.lat, A.lng) : null; out.push({ p: p, k: k, key: plSugKey(p), km: Math.round(d), code: code, ref: p.geo.ref || '', alt: alt ? { lat: +alt.lat.toFixed(5), lng: +alt.lng.toFixed(5), km: Math.round(plKm(A, alt)) } : null }); }); });
  return out.sort(function(a, b){ return b.km - a.km; }); }
function cmFarOpen(){ const A = cmCityOf(cityListCityId); const list = cmFarPins(); const bd = document.getElementById('dashBackdrop'); const body = document.getElementById('dashBody'); if (!A || !bd || !body) return; if (!list.length && !(cmFarUndo && cmFarUndo.city === cityListCityId)){ showToast('No far pins in ' + A.name); return; } /* أ-١٤ (قيس): Undo نقلٍ في مدينة يظهر فيها وحدها — كان يظهر في لوحة أي مدينة، وضغطه هناك يمحوه بلا رسالة */ bd.classList.add('show'); dashSet('📍 Far pins · ' + list.length, cmOpen); const nm = escapeHtml(A.name);
  body.innerHTML = '<div id="cmFarBody"><div style="font-size:13px; line-height:1.5;">These pins are far from <b>' + nm + '</b> and not marked “outside”. The usual cause: a short Plus code (PXCR+2C) was read around the wrong town — the same six characters repeat about every 100 km. For pins that came from a code, the line says where the same code lands near ' + nm + '. Check one or two in Google Maps, then move them.</div>'
    + ((cmFarUndo && cmFarUndo.city === cityListCityId) ? '<div class="chiprow" style="margin:8px 0 2px; flex-wrap:wrap; overflow:visible;"><button type="button" class="chip on" onclick="cmFarUndoGo()">↶ Undo · ' + cmFarUndo.items.length + ' moved</button></div>' : '')
    + '<div style="max-height:46vh; overflow:auto; margin:8px -4px 0; padding:0 4px;">' + list.map(function(x){ return '<div style="display:flex; gap:8px; align-items:center; background:var(--surf); border:1px solid var(--line); border-radius:10px; padding:7px 9px; margin:5px 0;"><span style="flex:1; min-width:0;"><button type="button" class="linklike" style="background:none; border:0; padding:0; font:inherit; font-weight:700; text-align:left; color:inherit;" dir="auto" onclick="plBoxCardOpen(\'' + attrStr(x.key) + '\', \'far\')">' + escapeHtml(x.p.name || 'Place') + '</button><br><span class="dim" style="font-size:11.5px;">' + x.km.toLocaleString() + ' km away · ' + (x.alt ? escapeHtml(x.code) + (x.ref ? ' read around ' + escapeHtml(x.ref) : '') + ' · near ' + nm + ' it lands ' + x.alt.km + ' km from the centre' : 'pinned from a link, the map or an import — not a code: open it to check') + '</span></span>' + (x.alt ? '<button type="button" class="chip" style="flex:none;" onclick="cmFarFix(\'' + attrStr(x.key) + '\')">Move</button>' : '') + '</div>'; }).join('') + '</div>'
    + (list.filter(function(x){ return x.alt; }).length > 1 ? '<button type="button" class="cta" style="display:block; width:100%; margin-top:10px;" onclick="cmFarFix(\'*\')">Move all ' + list.filter(function(x){ return x.alt; }).length + ' near ' + nm + '</button>' : '')
    + '<div class="dim" style="font-size:11.5px; line-height:1.45; margin-top:8px;">A place that really is that far: open it → Edit → switch on “Outside the city”, or “To another city…”. It then leaves this list.</div>'
    + '<button type="button" class="btn btn-ghost" style="margin-top:10px; padding:7px 14px; font-size:12px;" onclick="cmOpen()">Back</button></div>'; }
async function cmFarFix(key){ if (!currentUser || !myCityListData) return false; const __c = cityListCityId; /* ق١١-١٧-٠٣: قبل أي انتظار */ if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(cityListCityId); const todo = cmFarPins().filter(function(x){ return x.alt && (key === '*' || x.key === key); }); if (!A || !todo.length) return false;
  if (key === '*' && !(await mpConfirm(todo.length + ' pins move to the same Plus code read near ' + A.name + '. Places that really are far away would move too — use Move on single rows if unsure. Undo stays here until you leave.', { title: 'Move ' + todo.length + ' pins near ' + A.name + '?', ok: 'Move all' }))) return false;
  const items = todo.map(function(x){ return { key: x.key, geo: Object.assign({}, x.p.geo), openId: x.p.openId, area: x.p.area, areaBy: x.p.areaBy }; }); /* بالمفتاح لا بالكائن: القائمة قد تُعاد قراءتها بين النقل والتراجع */
  todo.forEach(function(x){ x.p.geo = { lat: x.alt.lat, lng: x.alt.lng, source: 'user_paste', via: 'code-near-city' }; delete x.p.openId; x.p.updatedAt = Date.now(); try{ delete plSuggestCache[x.key]; }catch(_){} });
  try{ await tkAreasRefreshMany(todo.map(function(x){ return x.p; })); }catch(e){ mpSwallow(e, 'far-areas'); }
  const back = function(){ let n = 0; items.forEach(function(it){ const q = tkPlaceByKey(it.key); if (!q) return; n++; q.geo = it.geo; if (it.openId) q.openId = it.openId; if (it.area === undefined) delete q.area; else q.area = it.area; if (it.areaBy === undefined) delete q.areaBy; else q.areaBy = it.areaBy; q.updatedAt = Date.now(); }); return n; };
  const __r = await plSaveAsk(); /* r120 (ق١١-١٧-٠٢): الورقة أجابت ⇒ لا تراجع هنا ولا رسالة ثانية */ if (__r === 'away'){ if (typeof tkAwayClose === 'function') tkAwayClose(); return false; } if (__r === 'none'){ back(); showToast('Could not save — nothing moved'); return false; }
  if (__r !== 'saved'){ try{ renderPlacesMine(); }catch(_){} if (cmFarPins().length) cmFarOpen(); else closeModalById('dashBackdrop'); return __r === 'kept'; } /* «Keep»: باقٍ حيث نُقل «Unsaved» وحده — لا Undo لنقل لم يُحفظ · «Discard»: عاد حيث كان — واللوحة تُرسم مما على الشاشة في الحالين (المراجعة المستقلة ١٦ — قيس: كانت تبقى على ما قبل الورقة) */
  cmFarUndo = { city: __c, items: items, back: back }; if (cityListCityId !== __c){ if (typeof tkAwayClose === 'function') tkAwayClose(); return true; } /* ق١١-١٧-٠٣ */ cmLog('FAR PINS · ' + cityListCityId + ' · ' + todo.length + ' moved to their code near ' + A.name); showToast(todo.length + (todo.length === 1 ? ' pin' : ' pins') + ' moved near ' + A.name + ' ✓'); try{ renderPlacesMine(); }catch(_){} cmFarOpen(); return true; }
async function cmFarUndoGo(){ const u = cmFarUndo; if (!u || u.city !== cityListCityId) return false; /* أ-١٤: ليس لهذه المدينة — يبقى لمدينته */ const n = u.back(); cmFarUndo = null; if (!n){ showToast('Nothing to undo — those places are no longer in this list'); cmFarOpen(); return false; } try{ if (!(await saveMyCityList())) throw Object.assign(new Error('not saved'), { code: 'not-saved' }); }catch(e){ mpSwallow(e, 'far-undo'); showToast('Could not save'); return false; } cmLog('FAR PINS · ' + cityListCityId + ' · undo · ' + n); showToast(n + (n === 1 ? ' pin' : ' pins') + ' back where ' + (n === 1 ? 'it was' : 'they were') + ' ✓'); try{ renderPlacesMine(); }catch(_){} cmFarOpen(); return true; }
/* r120 (ق١١-٢٥-٠٤ — ملاحظة المالك: مطعمان داخل متجر واحد برمز Plus واحد يبقيان «مكرَّرين» إلى الأبد): «ليست مكرَّرة» علامة تُحفظ على المكان نفسه — مفاتيح البقعة/الهوية التي أكّد صاحبه أنه فيها مكان مستقل. المعلَّم لا يُدمج ولا يُعدّ مكرَّرًا في بقعته؛ والمجموعة تظهر ما دام فيها مكانان فأكثر وأحدها غير معلَّم (مكان جديد يهبط بجوار معلَّمين يُعرض معهما) */
function cmDupKey(g){ return g.by === 'id' ? 'id:' + g.key : g.key; }
function cmDupSame(g, ii, gk, pk){ /* المراجعة ٣٩ (قيس): زرّ رُسم قبل أن تتغيّر المجموعات يحمل فهرسًا صار لغيرها — الزر يحمل مفتاح مجموعته ومكانه، وما لا يطابق لا يُنفَّذ. نداء بلا مفتاح (من الكود) يمضي بالفهرس */ if (!g) return false; if (gk !== undefined && cmDupKey(g) !== gk) return false; if (pk !== undefined && ii !== null && !(g.items[ii] && plSugKey(g.items[ii].p) === pk)) return false; return true; }
function cmDupKept(p, key){ return !!p && Array.isArray(p.nodup) && p.nodup.indexOf(key) >= 0; }
function cmDupMark(p, keys, force){ /* يُبقي من القديم ما يطابق دبوس المكان الآن وحده (دبوس تحرّك ⇒ علامته القديمة تسقط) · force: المفتاح لبقعة سيُثبَّت عليها للتوّ */ if (!p) return; const cur = {}; const pl = (p.geo && typeof p.geo.lat === 'number') ? tkPlusOf(p.geo) : ''; if (pl) cur[pl] = 1; if (p.openId) cur['id:' + p.openId] = 1; const out = (Array.isArray(p.nodup) ? p.nodup : []).filter(function(k){ return cur[k] || (force && (keys || []).indexOf(k) >= 0); }); (keys || []).forEach(function(k){ if (k && (cur[k] || force) && out.indexOf(k) < 0) out.push(k); }); if (out.length) p.nodup = out.slice(0, 4); else delete p.nodup; }
function cmDupGroups(cats){ /* r96 (ق١٠-٣٠-٠٢): المكرَّر بالهوية (يقين) ثم برمز Plus (البقعة) — مجموعات من مكانين فأكثر · r120: it.kept = معلَّم «ليست مكرَّرة» في هذه المجموعة */ const byId = {}, byPlus = {}; Object.keys(cats || {}).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p){ if (!p || !(p.geo && typeof p.geo.lat === 'number')) return; const it = { p: p, k: k, kept: false }; if (p.openId){ (byId[p.openId] = byId[p.openId] || []).push(it); } const pl = tkPlusOf(p.geo); if (pl) (byPlus[pl] = byPlus[pl] || []).push(it); }); }); const groups = []; const seen = new Set(); Object.keys(byId).forEach(function(id){ const g = byId[id]; if (g.length < 2) return; if (!g.some(function(it){ return !cmDupKept(it.p, 'id:' + id); })) return; /* كلها معلَّمة: لا مجموعة — وتبقى مرشّحة لمجموعة البقعة */ g.forEach(function(it){ it.kept = cmDupKept(it.p, 'id:' + id); seen.add(it.p); }); groups.push({ by: 'id', key: id, items: g }); }); Object.keys(byPlus).forEach(function(pl){ const g = byPlus[pl].filter(function(it){ return !seen.has(it.p); }); if (g.length < 2) return; if (!g.some(function(it){ return !cmDupKept(it.p, pl); })) return; g.forEach(function(it){ it.kept = cmDupKept(it.p, pl); }); groups.push({ by: 'plus', key: pl, items: g }); }); return groups; }
function cmDupsHtml(){ const cats = (myCityListData && myCityListData.categories) || {}; const groups = cmDupGroups(cats); if (!groups.length) return ''; let h = '<div class="pl-sub">Places you have twice. <b>Same Google place</b> = pinned on the same place in Google Maps · <b>Same spot</b> = the same Plus-code square (~14 m). Tap a name to open its card, then <b>Keep this</b> on the one to keep — its note and picks are merged from the others. Two places that really are different (one building, a mall): <b>Not a duplicate</b> on one, or <b>Keep all</b> for the group — they stay as they are and leave this list.</div>' + (cmUndo && cmUndo.kind === 'dups' ? '<div class="chiprow" style="margin:4px 0 2px; flex-wrap:wrap; overflow:visible;"><button type="button" class="chip on" onclick="cmUndoLast()">↶ ' + escapeHtml(cmUndo.label) + '</button></div>' : ''); groups.forEach(function(g, gi){ h += '<div class="cm-dupg" style="margin:6px 0; padding:6px 8px; border:1px solid var(--sand-line); border-radius:10px;"><div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;"><span class="dim" style="font-size:11px; flex:1 1 120px;">' + (g.by === 'id' ? 'Same Google place' : 'Same spot (Plus code)') + ' · ' + g.items.length + '</span><button type="button" class="chip" style="flex:none; padding:2px 9px; font-size:11px;" onclick="cmDupAll(' + gi + ', \'' + attrStr(cmDupKey(g)) + '\')" title="These are different places — keep them all; the group leaves this list">Keep all — different places</button></div>' + g.items.map(function(it, ii){ const others = g.items.filter(function(x){ return x !== it && !x.kept; }).length; const lab = (plKnownCatIds()[it.k] ? catLabelOf(it.k) : (/^tk:/.test(it.k) ? it.k.slice(3) : it.k)); const np = Array.isArray(it.p.picks) ? it.p.picks.filter(function(x){ return x && x.name; }).length : 0; const hints = (it.p.topPlace ? ' ⭐' : '') + (String(it.p.note || '').trim() ? ' 📝 note' : '') + (np ? ' · ' + np + ' pick' + (np === 1 ? '' : 's') : ''); return '<div style="margin-top:6px;"><span style="display:block; min-width:0;" dir="auto"><button type="button" class="linklike cm-dupname" onclick="plBoxCardOpen(\'' + attrStr(plSugKey(it.p)) + '\', \'dups\')" title="Open this place’s card">' + escapeHtml(it.p.name || it.p.url || 'Place') + '</button> <span class="dim" style="font-size:11px;">· ' + escapeHtml(lab) + (it.p.area ? ' · ' + escapeHtml(it.p.area) : '') + escapeHtml(hints) + (it.kept ? ' · <b>different ✓</b>' : '') + '</span></span><div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:3px;">' + (others ? '<button type="button" class="chip" style="flex:none; padding:2px 9px; font-size:11px;" onclick="cmDupKeep(' + gi + ', ' + ii + ', \'' + attrStr(cmDupKey(g)) + '\', \'' + attrStr(plSugKey(it.p)) + '\')" title="Keep this one — the others in this group not marked “different” are removed, their notes and picks merged in">Keep this</button>' : '') + (it.kept ? '' : '<button type="button" class="chip" style="flex:none; padding:2px 9px; font-size:11px;" onclick="cmDupNot(' + gi + ', ' + ii + ', \'' + attrStr(cmDupKey(g)) + '\', \'' + attrStr(plSugKey(it.p)) + '\')" title="A different place at the same spot — it stays, and is no longer listed as a duplicate here">Not a duplicate</button>') + '</div></div>'; }).join('') + '</div>'; }); return h; } /* r97 (ق١٠-٣٠-٠٤ · ٠٦ — ملاحظتا المالك ١٣:٤٦ · ١٥:٢٩): جسم صف «Duplicates» في الصندوق (انتقل من ⚙) · Same Google place / Same spot · الاسم زر يفتح البطاقة · تلميحات ⭐ 📝 picks · ↶ Undo داخله */
async function cmDupKeep(gi, ii, gk, pk){ return mpBusyRun('dups', function(){ return cmDupKeepRun(gi, ii, gk, pk); }); } /* r120 (المراجعة ٣٩ — قيس، قائم قبلها): نقرة ثانية قبل إعادة الرسم كانت تدمج المجموعة التالية — الفهرس يُحسب من جديد عند كل نداء */
async function cmDupKeepRun(gi, ii, gk, pk){ if (!currentUser || !myCityListData) return false; if (!cmDupSame(cmDupGroups(myCityListData.categories || {})[gi], ii, gk, pk)) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } if (!(await cmSavedFirst())) return false; if (!myCityListData || !cmDupSame(cmDupGroups(myCityListData.categories || {})[gi], ii, gk, pk)) return false; const cityId = cityListCityId, __d0 = myCityListData; const undoDocs = {}; try{ undoDocs[cityId] = (await cmReadDoc(cityId)) || cmScreenDoc(); }catch(e){ mpSwallow(e, 'dups-read'); showToast('Could not read the list'); return false; } /* r120 (ق١١-١٥-٠٩ — قيس): قراءة لقطة التراجع فشلت ⇒ العملية تتوقف قبل أي تغيير، كما في الدمج والنقل والفصل. كانت تُحفظ «لا مستند»، والتراجع يفهمها «العملية أنشأت المدينة» فيحذف قائمتها كلها ويقول «Undone ✓» */ if (cityListCityId !== cityId || myCityListData !== __d0){ showToast('The city changed while saving — nothing was removed. Try again'); return false; } /* ق١١-١٤-١٩ (مقيس): القراءة تنتظر الحفظ الجاري — ما يُلتقط من الشاشة يُلتقط بعدها، وإن تبدّلت المدينة يتوقف */ const cats = myCityListData.categories || {}; const groups = cmDupGroups(cats); const g = groups[gi]; if (!g || !g.items[ii] || !cmDupSame(g, ii, gk, pk)) return false; /* وبعد قراءة اللقطة أيضًا */ const keep = g.items[ii].p; const before = liveCountOf(cats); let removed = 0; g.items.forEach(function(it){ if (it.p === keep || it.kept) return; /* r120 (ق١١-٢٥-٠٤): المعلَّم «different» مكان مستقل — لا يُدمج */ const o = it.p; if (!String(keep.note || '').trim() && String(o.note || '').trim()) keep.note = o.note; else if (String(o.note || '').trim() && String(keep.note || '').indexOf(o.note) < 0) keep.note = String(keep.note || '').trim() + '\n' + o.note; const kp = Array.isArray(keep.picks) ? keep.picks : []; (Array.isArray(o.picks) ? o.picks : []).forEach(function(x){ if (x && x.name && !kp.some(function(y){ return y && y.name === x.name; })) kp.push(x); }); if (kp.length) keep.picks = kp.slice(0, 12); if (o.topPlace && !keep.topPlace){ keep.topPlace = true; keep.topAt = o.topAt || Date.now(); } (o.flags || []).forEach(function(f){ keep.flags = keep.flags || []; if (keep.flags.indexOf(f) < 0) keep.flags.push(f); }); const arr = (cats[it.k] || {}).places || []; const i = arr.indexOf(o); if (i >= 0){ arr.splice(i, 1); removed++; } }); if (!removed) return false; if (liveCountOf(cats) !== before - removed){ showToast('Count mismatch — nothing saved'); return false; } if (g.items.some(function(it){ return it.kept; })) cmDupMark(keep, [cmDupKey(g), g.by === 'id' ? tkPlusOf(keep.geo) : ''], false); /* r120 (ق١١-٢٥-٠٤): بقي معه معلَّمون «different» — المجموعة حُسمت، فلا تبقى معروضة بمكان واحد غير معلَّم */ keep.updatedAt = Date.now(); try{ if (!(await saveMyCityList())) throw Object.assign(new Error('not saved'), { code: 'not-saved' }); /* r100-أ */ }catch(e){ mpSwallow(e, 'dups'); showToast('Could not save'); return false; } cmUndo = { uid: currentUser.uid, kind: 'dups', label: 'Undo duplicates · kept ' + (keep.name || 'place'), at: Date.now(), docs: undoDocs, cities: JSON.parse(JSON.stringify(userListData.customCities || [])), names: { from: keep.name || 'place', to: '' } }; cmLog('DUPLICATES · ' + cityId + ' · kept ' + (keep.name || '') + ' · removed ' + removed); showToast('Kept “' + (keep.name || '') + '” · removed ' + removed + ' — Undo is on the Duplicates row'); renderPlacesMine(); return true; } /* r96 (ق١٠-٣٠-٠٢) */
async function cmDupSet(gi, pick, what, ii, gk, pk){ /* r120 (ق١١-٢٥-٠٤): «Not a duplicate» (مكان واحد) و«Keep all» (المجموعة) — علامة على المكان تُحفظ مع قائمته؛ لا شيء يُحذف. التراجع يرفع العلامات التي وضعها هذا الفعل وحدها — لا لقطة تُعاد (المراجعة ٣٩ — قيس: لقطة المدينة كانت تحذف ما أُضيف بعدها) */ if (!currentUser || !myCityListData) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const cityId = cityListCityId; const cats = myCityListData.categories || {}; const g = cmDupGroups(cats)[gi]; if (!g || !cmDupSame(g, ii, gk, pk)) return false; const todo = pick(g); if (!todo.length) return false; const key = cmDupKey(g); const was = todo.map(function(it){ return [it.p, Array.isArray(it.p.nodup) ? it.p.nodup.slice() : null]; }); todo.forEach(function(it){ cmDupMark(it.p, [key, g.by === 'id' ? tkPlusOf(it.p.geo) : ''], false); /* مجموعة الهوية: ومعها بقعتها — وإلا عادت المجموعة نفسها باسم «Same spot» · ختم «آخر تحديث» لا يُمسّ: العلامة ليست تحديثًا لمحتوى المكان (المراجعة ٣٩ — قيس: التراجع لا يعيد المستند كما كان) */ }); const back = function(){ was.forEach(function(w){ if (w[1]) w[0].nodup = w[1]; else delete w[0].nodup; }); }; const __r = await plSaveAsk(); if (__r === 'away'){ if (typeof tkAwayClose === 'function') tkAwayClose(); return false; } if (__r === 'none'){ back(); showToast('Could not save'); renderPlacesMine(); return false; } if (__r !== 'saved'){ renderPlacesMine(); return false; } /* الورقة أجابت: «Keep» باقٍ «Unsaved» · «Discard» عاد — بلا رسالة ثانية */ cmUndo = { uid: currentUser.uid, kind: 'dups', label: 'Undo · kept as different · ' + todo.length, at: Date.now(), city: cityId, unmark: was.map(function(w){ return { p: w[0], id: w[0].id || '', was: w[1] }; }), docs: {}, cities: [], names: { from: what, to: '' } }; cmLog('DUPLICATES · ' + cityId + ' · kept as different · ' + todo.length); showToast((todo.length === 1 ? 'Kept “' + (todo[0].p.name || 'place') + '” as a different place' : 'Kept ' + todo.length + ' as different places') + ' — Undo is on the Duplicates row'); renderPlacesMine(); return true; }
async function cmDupUnmark(u){ /* تراجع «different»: يعيد علامات تلك الأماكن كما كانت قبل الفعل — ولا يمسّ غيرها مما أُضيف أو عُدّل بعده */ if (!currentUser || !myCityListData || cityListCityId !== u.city){ showToast('Open that city again to undo'); return false; } if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const all = []; const cats = myCityListData.categories || {}; Object.keys(cats).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p){ if (p) all.push(p); }); }); const hit = []; u.unmark.forEach(function(m){ const p = all.indexOf(m.p) >= 0 ? m.p : (m.id ? all.filter(function(q){ return q.id === m.id; })[0] : null); if (p) hit.push([p, Array.isArray(p.nodup) ? p.nodup.slice() : null, m.was]); }); if (!hit.length){ cmUndo = null; showToast('Nothing to undo — those places are no longer in this list'); renderPlacesMine(); return false; } hit.forEach(function(h){ if (h[2]) h[0].nodup = h[2].slice(); else delete h[0].nodup; }); const __r = await plSaveAsk(); if (__r === 'away'){ if (typeof tkAwayClose === 'function') tkAwayClose(); return false; } if (__r === 'none'){ hit.forEach(function(h){ if (h[1]) h[0].nodup = h[1]; else delete h[0].nodup; }); showToast('Could not save'); renderPlacesMine(); return false; } cmUndo = null; if (__r === 'saved'){ cmLog('DUPLICATES · ' + u.city + ' · undo different · ' + hit.length); showToast('Undone ✓ — listed as duplicates again'); } renderPlacesMine(); return __r === 'saved'; }
async function cmDupNot(gi, ii, gk, pk){ return mpBusyRun('dups', function(){ return cmDupSet(gi, function(g){ const it = g.items[ii]; if (!it || it.kept) return []; const rest = g.items.filter(function(x){ return x !== it && !x.kept; }); return rest.length === 1 ? [it, rest[0]] : [it]; /* آخر غير معلَّم لا شريك له بين غير المؤكَّدين: «ليس مكرَّرًا» قول عن الاثنين */ }, 'one', ii, gk, pk); }); }
async function cmDupAll(gi, gk){ return mpBusyRun('dups', function(){ return cmDupSet(gi, function(g){ return g.items.filter(function(x){ return !x.kept; }); }, 'all', null, gk); }); }
async function cmMergeAsk(toId){ if (!toId) return; const A = cmCityOf(cityListCityId), B = cmCityOf(toId); if (!A || !B) return; const n = liveCountOf((myCityListData && myCityListData.categories) || {}); if (!(await mpConfirm(n + ' place' + (n === 1 ? '' : 's') + ' move to ' + B.name + ' in their categories, marked “' + A.name + '”. ' + A.name + ' is then removed from your cities. You can undo from City right after.', { title: 'Merge ' + A.name + ' into ' + B.name + '?', ok: 'Merge' }))){ cmOpen(); return; } closeModalById('dashBackdrop'); const ok = await cmMerge(cityListCityId, toId); if (ok && cmCityOf(toId)){ try{ await selectCityListCity(toId); }catch(_){} if (typeof renderPlacesMine === 'function') renderPlacesMine(); } }
async function cmSplitAsk(town){ if (!town) return; const A = cmCityOf(cityListCityId); if (!A) return; const n = (cmTownsOf((myCityListData && myCityListData.categories) || {}).find(function(t){ return t.town === town; }) || { n: 0 }).n; if (!(await mpConfirm(n + ' place' + (n === 1 ? '' : 's') + ' marked “' + town + '” leave ' + A.name + ' and become the city ' + town + ' in your list. You can undo from City right after.', { title: 'Split ' + town + ' out of ' + A.name + '?', ok: 'Split out' }))){ cmOpen(); return; } closeModalById('dashBackdrop'); await cmSplit(cityListCityId, town); }
async function cmTownRemoveAsk(town){ if (!town) return; const A = cmCityOf(cityListCityId); if (!A) return; const n = (cmTownsOf((myCityListData && myCityListData.categories) || {}).find(function(t){ return t.town === town; }) || { n: 0 }).n; if (!(await mpConfirm(n + ' place' + (n === 1 ? '' : 's') + ' marked “' + town + '” ' + (n === 1 ? 'is' : 'are') + ' deleted. The rest of ' + A.name + ' stays. You can undo from City right after.', { title: 'Remove ' + town + ' from ' + A.name + '?', ok: 'Delete ' + n + ' place' + (n === 1 ? '' : 's'), danger: true }))){ cmOpen(); return; } closeModalById('dashBackdrop'); await cmTownRemove(cityListCityId, town); } /* r97 (ق١٠-٣٠-٠٥ — سؤال المالك ١٤:٠٨): حذف بلدة مضمومة بلا فصلها أولًا */
async function cmTownRemove(cityId, town){ if (!currentUser || !cityId || !town || cityId !== cityListCityId || !myCityListData) return false; if (currentUserSuspended){ showToast('Your account is suspended — you can’t save changes'); return false; } const A = cmCityOf(cityId); if (!A) return false; if (!(await cmSavedFirst()) || cityId !== cityListCityId || !myCityListData) return false; const __d0 = myCityListData; const undoDocs = {}; try{ undoDocs[cityId] = (await cmReadDoc(cityId)) || cmScreenDoc(); }catch(e){ mpSwallow(e, 'town-read'); showToast('Could not read the list'); return false; } /* r120 (ق١١-١٥-٠٩ — قيس): كما في المكرّرات */ if (cityListCityId !== cityId || myCityListData !== __d0){ showToast('The city changed while saving — nothing was removed. Try again'); return false; } /* ق١١-١٤-١٩ (مقيس) */ const cats = myCityListData.categories || {}; const before = liveCountOf(cats); const gone = []; Object.keys(cats).forEach(function(k){ const arr = (cats[k] || {}).places || []; for (let i = arr.length - 1; i >= 0; i--){ const p = arr[i]; if (p && (p.name || p.url) && String(p.town || '').trim() === town){ arr.splice(i, 1); gone.push(p); } } }); if (!gone.length){ showToast('No places marked “' + town + '”'); return false; } if (liveCountOf(cats) !== before - gone.length){ showToast('Count mismatch — nothing saved'); return false; } try{ if (!(await saveMyCityList())) throw Object.assign(new Error('not saved'), { code: 'not-saved' }); /* r100-أ */ }catch(e){ mpSwallow(e, 'town-remove'); showToast('Could not save'); return false; } try{ if (typeof tkRemember === 'function') tkRemember(gone); }catch(_){} cmUndo = { uid: currentUser.uid, kind: 'towndel', label: 'Undo remove · ' + town + ' · ' + gone.length, at: Date.now(), docs: undoDocs, cities: JSON.parse(JSON.stringify(userListData.customCities || [])), names: { from: town, to: A.name }, forget: gone }; cmLog('TOWN REMOVED · ' + cityId + ' · ' + town + ' · ' + gone.length + ' places'); showToast('Removed ' + town + ' · ' + gone.length + ' place' + (gone.length === 1 ? '' : 's') + ' — Undo is in City'); if (typeof plTownSel !== 'undefined' && plTownSel === town) plTownSel = ''; await cmAfter([cityId]); if (typeof renderPlacesMine === 'function') renderPlacesMine(); if (typeof plCityEmptyAsk === 'function') plCityEmptyAsk(); return true; } /* r97 (ق١٠-٣٠-٠٥): الأماكن الموسومة بالبلدة تُحذف من المدينة · عدّ قبل/بعد · تُذكر كالمحذوف بيدك · Undo يعيد المستند */
