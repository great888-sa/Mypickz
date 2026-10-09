/* =========================================================
   2) بيانات المدن والتصنيفات
   ========================================================= */
const CITIES = [
  { id:"paris",     name:"Paris",    country:"France" },
  { id:"marbella",  name:"Marbella", country:"Spain" },
  { id:"london",    name:"London",   country:"UK" },
  { id:"barcelona", name:"Barcelona", country:"Spain" },
  { id:"geneva",    name:"Geneva",   country:"Switzerland" },
  { id:"madrid",    name:"Madrid",   country:"Spain" },
  { id:"mallorca",  name:"Mallorca", country:"Spain" },
];

let customCities = []; // مدن أضفتها لاحقًا: [{id, name, country}]
let customCountries = []; // دول أضفتها بدون مدن بعد: ["اسم1", "اسم2"]
let customCountryFlags = {}; // أعلام الدول اللي أضفتها لاحقًا: { "اسم الدولة": "🇦🇪" }
const COUNTRY_FLAGS = { "France":"🇫🇷", "Spain":"🇪🇸", "UK":"🇬🇧", "Switzerland":"🇨🇭" };
function countryFlag(name){
  if (COUNTRY_FLAGS[name]) return COUNTRY_FLAGS[name];
  if (customCountryFlags[name]) return customCountryFlags[name];
  const w = WORLD_COUNTRIES.find(c => c.name === name);   // العلم يُشتق من كود الدولة — لا يُخزَّن
  return w ? isoFlagEmoji(w.code) : '';
}

// قائمة دول العالم الثابتة (اسم + كود ISO2) لاستخدامها في القائمة المنسدلة عند إضافة دولة جديدة
const WORLD_COUNTRIES = [
  {code:"AF",name:"Afghanistan"},{code:"AL",name:"Albania"},{code:"DZ",name:"Algeria"},{code:"AD",name:"Andorra"},
  {code:"AO",name:"Angola"},{code:"AG",name:"Antigua and Barbuda"},{code:"AR",name:"Argentina"},{code:"AM",name:"Armenia"},
  {code:"AU",name:"Australia"},{code:"AT",name:"Austria"},{code:"AZ",name:"Azerbaijan"},{code:"BS",name:"Bahamas"},
  {code:"BH",name:"Bahrain"},{code:"BD",name:"Bangladesh"},{code:"BB",name:"Barbados"},{code:"BY",name:"Belarus"},
  {code:"BE",name:"Belgium"},{code:"BZ",name:"Belize"},{code:"BJ",name:"Benin"},{code:"BT",name:"Bhutan"},
  {code:"BO",name:"Bolivia"},{code:"BA",name:"Bosnia and Herzegovina"},{code:"BW",name:"Botswana"},{code:"BR",name:"Brazil"},
  {code:"BN",name:"Brunei"},{code:"BG",name:"Bulgaria"},{code:"BF",name:"Burkina Faso"},{code:"BI",name:"Burundi"},
  {code:"CV",name:"Cabo Verde"},{code:"KH",name:"Cambodia"},{code:"CM",name:"Cameroon"},{code:"CA",name:"Canada"},
  {code:"CF",name:"Central African Republic"},{code:"TD",name:"Chad"},{code:"CL",name:"Chile"},{code:"CN",name:"China"},
  {code:"CO",name:"Colombia"},{code:"KM",name:"Comoros"},{code:"CG",name:"Congo"},{code:"CD",name:"Congo (DRC)"},
  {code:"CR",name:"Costa Rica"},{code:"CI",name:"Cote d'Ivoire"},{code:"HR",name:"Croatia"},{code:"CU",name:"Cuba"},
  {code:"CY",name:"Cyprus"},{code:"CZ",name:"Czechia"},{code:"DK",name:"Denmark"},{code:"DJ",name:"Djibouti"},
  {code:"DM",name:"Dominica"},{code:"DO",name:"Dominican Republic"},{code:"EC",name:"Ecuador"},{code:"EG",name:"Egypt"},
  {code:"SV",name:"El Salvador"},{code:"GQ",name:"Equatorial Guinea"},{code:"ER",name:"Eritrea"},{code:"EE",name:"Estonia"},
  {code:"SZ",name:"Eswatini"},{code:"ET",name:"Ethiopia"},{code:"FJ",name:"Fiji"},{code:"FI",name:"Finland"},
  {code:"FR",name:"France"},{code:"GA",name:"Gabon"},{code:"GM",name:"Gambia"},{code:"GE",name:"Georgia"},
  {code:"DE",name:"Germany"},{code:"GH",name:"Ghana"},{code:"GR",name:"Greece"},{code:"GD",name:"Grenada"},
  {code:"GT",name:"Guatemala"},{code:"GN",name:"Guinea"},{code:"GW",name:"Guinea-Bissau"},{code:"GY",name:"Guyana"},
  {code:"HT",name:"Haiti"},{code:"HN",name:"Honduras"},{code:"HK",name:"Hong Kong"},{code:"HU",name:"Hungary"},
  {code:"IS",name:"Iceland"},{code:"IN",name:"India"},{code:"ID",name:"Indonesia"},{code:"IR",name:"Iran"},
  {code:"IQ",name:"Iraq"},{code:"IE",name:"Ireland"},{code:"IL",name:"Israel"},{code:"IT",name:"Italy"},
  {code:"JM",name:"Jamaica"},{code:"JP",name:"Japan"},{code:"JO",name:"Jordan"},{code:"KZ",name:"Kazakhstan"},
  {code:"KE",name:"Kenya"},{code:"KI",name:"Kiribati"},{code:"KW",name:"Kuwait"},{code:"KG",name:"Kyrgyzstan"},
  {code:"LA",name:"Laos"},{code:"LV",name:"Latvia"},{code:"LB",name:"Lebanon"},{code:"LS",name:"Lesotho"},
  {code:"LR",name:"Liberia"},{code:"LY",name:"Libya"},{code:"LI",name:"Liechtenstein"},{code:"LT",name:"Lithuania"},
  {code:"LU",name:"Luxembourg"},{code:"MO",name:"Macau"},{code:"MG",name:"Madagascar"},{code:"MW",name:"Malawi"},
  {code:"MY",name:"Malaysia"},{code:"MV",name:"Maldives"},{code:"ML",name:"Mali"},{code:"MT",name:"Malta"},
  {code:"MH",name:"Marshall Islands"},{code:"MR",name:"Mauritania"},{code:"MU",name:"Mauritius"},{code:"MX",name:"Mexico"},
  {code:"FM",name:"Micronesia"},{code:"MD",name:"Moldova"},{code:"MC",name:"Monaco"},{code:"MN",name:"Mongolia"},
  {code:"ME",name:"Montenegro"},{code:"MA",name:"Morocco"},{code:"MZ",name:"Mozambique"},{code:"MM",name:"Myanmar"},
  {code:"NA",name:"Namibia"},{code:"NR",name:"Nauru"},{code:"NP",name:"Nepal"},{code:"NL",name:"Netherlands"},
  {code:"NZ",name:"New Zealand"},{code:"NI",name:"Nicaragua"},{code:"NE",name:"Niger"},{code:"NG",name:"Nigeria"},
  {code:"KP",name:"North Korea"},{code:"MK",name:"North Macedonia"},{code:"NO",name:"Norway"},{code:"OM",name:"Oman"},
  {code:"PK",name:"Pakistan"},{code:"PW",name:"Palau"},{code:"PS",name:"Palestine"},{code:"PA",name:"Panama"},
  {code:"PG",name:"Papua New Guinea"},{code:"PY",name:"Paraguay"},{code:"PE",name:"Peru"},{code:"PH",name:"Philippines"},
  {code:"PL",name:"Poland"},{code:"PT",name:"Portugal"},{code:"QA",name:"Qatar"},{code:"RO",name:"Romania"},
  {code:"RU",name:"Russia"},{code:"RW",name:"Rwanda"},{code:"KN",name:"Saint Kitts and Nevis"},{code:"LC",name:"Saint Lucia"},
  {code:"VC",name:"Saint Vincent and the Grenadines"},{code:"WS",name:"Samoa"},{code:"SM",name:"San Marino"},
  {code:"ST",name:"Sao Tome and Principe"},{code:"SA",name:"Saudi Arabia"},{code:"SN",name:"Senegal"},{code:"RS",name:"Serbia"},
  {code:"SC",name:"Seychelles"},{code:"SL",name:"Sierra Leone"},{code:"SG",name:"Singapore"},{code:"SK",name:"Slovakia"},
  {code:"SI",name:"Slovenia"},{code:"SB",name:"Solomon Islands"},{code:"SO",name:"Somalia"},{code:"ZA",name:"South Africa"},
  {code:"KR",name:"South Korea"},{code:"SS",name:"South Sudan"},{code:"ES",name:"Spain"},{code:"LK",name:"Sri Lanka"},
  {code:"SD",name:"Sudan"},{code:"SR",name:"Suriname"},{code:"SE",name:"Sweden"},{code:"CH",name:"Switzerland"},
  {code:"SY",name:"Syria"},{code:"TW",name:"Taiwan"},{code:"TJ",name:"Tajikistan"},{code:"TZ",name:"Tanzania"},
  {code:"TH",name:"Thailand"},{code:"TL",name:"Timor-Leste"},{code:"TG",name:"Togo"},{code:"TO",name:"Tonga"},
  {code:"TT",name:"Trinidad and Tobago"},{code:"TN",name:"Tunisia"},{code:"TR",name:"Turkiye"},{code:"TM",name:"Turkmenistan"},
  {code:"TV",name:"Tuvalu"},{code:"UG",name:"Uganda"},{code:"UA",name:"Ukraine"},{code:"AE",name:"United Arab Emirates"},
  {code:"GB",name:"United Kingdom"},{code:"US",name:"United States"},{code:"UY",name:"Uruguay"},{code:"UZ",name:"Uzbekistan"},
  {code:"VU",name:"Vanuatu"},{code:"VA",name:"Vatican City"},{code:"VE",name:"Venezuela"},{code:"VN",name:"Vietnam"},
  {code:"YE",name:"Yemen"},{code:"ZM",name:"Zambia"},{code:"ZW",name:"Zimbabwe"}
];
// يحسب رمز العلم تلقائيًا من كود الدولة (ISO2) — بدون الحاجة لإدخال العلم يدويًا
function isoFlagEmoji(code){
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
// تحقق: يسمح فقط بأحرف لاتينية/إنجليزية (+ مسافة، شرطة، فاصلة، فاصلة عليا، نقطة) لأسماء المدن
function isLatinOnly(text){
  return /^[A-Za-z\s.,'\-]+$/.test(text.trim());
}
async function syncCitiesFromMyLists(){ // ز-١-ج-٢: كل مدينة عندي فيها قائمة تدخل «مدني» باسمها ودولتها (الرمز يُترجم باسم الدولة) — مرة عند الدخول
  if (!currentUser || !userListData) return; let snap; try{ snap = await mpData.cityLists.byOwner(currentUser.uid); }catch(e){ mpSwallow(e, 'sync cities'); return; }
  if (!Array.isArray(userListData.customCities)) userListData.customCities = []; let added = 0;
  snap.forEach(function(d){ const r = d.data() || {}; const id = String(r.cityId || ''); if (!id || userListData.customCities.some(function(c){ return c.id === id; })) return; const cc = String(r.country || ''); const cn = (/^[A-Z]{2}$/.test(cc) ? ((WORLD_COUNTRIES.find(function(w){ return w.code === cc; }) || {}).name || cc) : cc) || ''; userListData.customCities.push({ id: id, name: r.cityName || id, country: cn }); added++; });
  if (added){ try{ await saveUserListGeneral(); }catch(e){ mpSwallow(e, 'sync cities save'); } }
}
const CITY_NAMES = Object.create(null); // ز-١-ج-٢: أسماء مدن الآخرين المرئية بهذه الجلسة (من مستندات قوائمهم ورحلاتهم) — للعرض لا للاختيار
function rememberCity(id, name, country){ if (!id || !name) return; id = String(id); if (!CITY_NAMES[id] || !CITY_NAMES[id].name) CITY_NAMES[id] = { id: id, name: String(name), country: /^[A-Z]{2}$/.test(String(country || '')) ? ((WORLD_COUNTRIES.find(function(w){ return w.code === country; }) || {}).name || '') : String(country || '') }; }
function allCities(){ const reg = (userListData && Array.isArray(userListData.customCities)) ? userListData.customCities.slice() : []; const ids = {}; reg.forEach(function(c){ ids[c.id] = true; }); return reg.concat(Object.keys(CITY_NAMES).filter(function(k){ return !ids[k]; }).map(function(k){ return CITY_NAMES[k]; })); } // ز-١-ج-٢: مصدر واحد — «مدني» بمعرّف المعجم (GeoNames/الجزر) · لا دليل ولا مدن مواسم (قرار المالك ٢٥ سبتمبر)





// ===== قالب التصنيفات المشترك (كل المدن تقرأ من نفس المستند) =====
let categoryTemplateStale = false; // ر٧٠ط-٢
async function resetStaleCategoryTemplate(){ if (!categoryTemplateStale || !isOwner) return; try{ await mpData.settings.resetCategoryTemplate(); categoryTemplateStale = false; }catch(e){} } // حذف القديم مرة واحدة بيد المالك — عبر طبقة البيانات
function normalizeCustomItems(){ // ز-١-ج-٣ (الحل الجذري): التصنيف المخصَّص يُربط بمعرّف القسم (sectionId) لا بعنوانه؛ العنوان يُشتق منه عند كل تحميل · ما لا قسم له → Others بحفظ أصله (legacySection) — لا يختفي شيء أبدًا
  let changed = false;
  customItems.forEach(function(c){ if (!c) return;
    let sec = c.sectionId ? DATA.find(function(x){ return (x.id || x.title) === c.sectionId; }) : null;
    if (!sec && c.section) sec = DATA.find(function(x){ return x.title === c.section; });
    if (!sec){ if (c.section && c.section !== 'Others' && !c.legacySection){ c.legacySection = c.section; changed = true; } sec = DATA.find(function(x){ return x.id === 'others'; }); }
    const id = sec.id || sec.title; if (c.sectionId !== id){ c.sectionId = id; changed = true; } if (c.section !== sec.title){ c.section = sec.title; changed = true; } });
  return changed;
}
async function loadCategoryTemplate(){
  try{
    const __tpl = await mpData.settings.getCategoryTemplate(); const doc = { exists: !!__tpl, data: function(){ return __tpl; } };
    const data = doc.exists ? doc.data() : {};
    if ((data.catsV || 1) < CATS_VERSION){ // ر٧٠ط-٢ (قرار المالك): تعديلات القالب القديم (أسماء وأيقونات الشجرة السابقة) لا تُطبَّق على الشجرة v2 — تُهمل، ويُصفّرها المالك بأول تحميل
      customItems = []; sectionOverrides = {}; itemOrder = {}; itemOverrides = {}; categoryTemplateStale = true; return; }
    customItems = data.customItems || [];
    if (normalizeCustomItems() && isOwner){ try{ await saveCategoryTemplate(); }catch(e){} } // ز-١-ج-٣: تطبيع مرة واحدة (الربط بمعرّف القسم؛ اليتيم → Others)
    sectionOverrides = data.sectionOverrides || {};
    itemOrder = data.itemOrder || {};
    itemOverrides = data.itemOverrides || {};
  }catch(e){
    customItems = []; sectionOverrides = {}; itemOrder = {}; itemOverrides = {};
  }
}
async function saveCategoryTemplate(){
  try{
    await mpData.settings.saveCategoryTemplate({ customItems, sectionOverrides, itemOrder, itemOverrides, catsV: CATS_VERSION }); categoryTemplateStale = false;
    showToast('Category saved for all cities ✓');
  }catch(e){
    showToast('Could not save the category');
  }
}




const DATA = [ // ر٧٠ل (الشجرة v3 المعتمدة ١٥ سبتمبر — مسودة المالك بلا Spa وParking): ١٨ قسمًا بترتيب الاستعمال · ٨٠ فرعيًّا · الرئيسي مشتق · معرّف مجهول → Others 
  { id:"cafes_sweets", title:"Cafes & Sweets", icon:"☕", items:[ {id:"coffee", icon:"☕", name:"Specialty Coffee"}, {id:"cafe", icon:"🫖", name:"Cafe"}, {id:"tea", icon:"🍵", name:"Tea House"}, {id:"brunch", icon:"🥞", name:"Breakfast & Brunch"}, {id:"bakery", icon:"🥐", name:"Bakery & Pastries"}, {id:"dessert", icon:"🍰", name:"Desserts"}, {id:"icecream", icon:"🍦", name:"Ice Cream"} ]}, 
  { id:"restaurants_dish", title:"Restaurants · by dish", icon:"🍽️", items:[ {id:"burger", icon:"🍔", name:"Burger"}, {id:"pizza", icon:"🍕", name:"Pizza"}, {id:"sandwich", icon:"🥪", name:"Sandwiches"}, {id:"shawarma", icon:"🌯", name:"Shawarma"}, {id:"falafel", icon:"🧆", name:"Falafel"}, {id:"fries", icon:"🍟", name:"Fries"}, {id:"manaqish", icon:"🫓", name:"Manaqish & Fatayer"}, {id:"chicken", icon:"🍗", name:"Broast & Fried Chicken"}, {id:"grill", icon:"🍢", name:"Grills"}, {id:"steak", icon:"🥩", name:"Steak"}, {id:"seafood", icon:"🦐", name:"Seafood"}, {id:"sushi", icon:"🍣", name:"Sushi"}, {id:"fast_food", icon:"🍟", name:"Fast Food"} ]}, 
  { id:"restaurants_cuisine", title:"Restaurants · by cuisine", icon:"🌍", items:[ {id:"saudi", icon:"🍛", name:"Saudi & Gulf"}, {id:"lebanese", icon:"🍽️", name:"Lebanese"}, {id:"turkish", icon:"🥙", name:"Turkish"}, {id:"egyptian", icon:"🍲", name:"Egyptian"}, {id:"italian", icon:"🍝", name:"Italian"}, {id:"french", icon:"🥖", name:"French"}, {id:"spanish", icon:"🥘", name:"Spanish"}, {id:"greek", icon:"🫒", name:"Greek & Mediterranean"}, {id:"indian", icon:"🍛", name:"Indian"}, {id:"chinese", icon:"🥡", name:"Chinese"}, {id:"japanese", icon:"🍱", name:"Japanese"}, {id:"korean", icon:"🍜", name:"Korean"}, {id:"thai", icon:"🍜", name:"Thai"}, {id:"asian", icon:"🥢", name:"Other Asian"}, {id:"mexican", icon:"🌮", name:"Mexican"}, {id:"american", icon:"🍖", name:"American"}, {id:"other_cuisine", icon:"🍽️", name:"Other Cuisines"} ]}, 
  { id:"shopping_store", title:"Shopping · by store", icon:"🛍️", items:[ {id:"malls", icon:"🏬", name:"Malls"}, {id:"department", icon:"🏢", name:"Department Stores"}, {id:"shopping_streets", icon:"🛍️", name:"Shopping Streets"}, {id:"local_markets", icon:"🧺", name:"Local Markets"}, {id:"outlet", icon:"🏷️", name:"Outlets"} ]}, 
  { id:"shopping_product", title:"Shopping · by product", icon:"👗", items:[ {id:"fashion", icon:"👗", name:"Fashion"}, {id:"shoes_bags", icon:"👜", name:"Shoes & Bags"}, {id:"perfumes", icon:"🧴", name:"Perfumes & Cosmetics"}, {id:"jewelry", icon:"💍", name:"Jewelry & Watches"} ]}, 
  { id:"parks_gardens", title:"Parks & Gardens", icon:"🌳", items:[ {id:"parks", icon:"🌳", name:"Parks"}, {id:"gardens", icon:"🌷", name:"Gardens"} ]}, 
  { id:"squares_streets", title:"Squares & Streets", icon:"⛲", items:[ {id:"squares", icon:"⛲", name:"Squares"}, {id:"pedestrian", icon:"🚶", name:"Pedestrian Streets"}, {id:"promenades", icon:"🌉", name:"Promenades"} ]}, 
  { id:"corniche_marinas", title:"Corniche & Marinas", icon:"🌅", items:[ {id:"corniche", icon:"🌅", name:"Corniche"}, {id:"marina", icon:"⛵", name:"Marinas"}, {id:"harbours", icon:"⚓", name:"Harbours"} ]}, 
  { id:"tower_bridge_views", title:"Tower & Bridge Views", icon:"🗼", items:[ {id:"tower_views", icon:"🗼", name:"Tower Top Views"}, {id:"bridge_views", icon:"🌁", name:"Bridge Views"} ]}, 
  { id:"nature", title:"Nature", icon:"⛰️", items:[ {id:"mountains", icon:"⛰️", name:"Mountain Peaks"}, {id:"waterfalls", icon:"💦", name:"Waterfalls"}, {id:"caves", icon:"🕳️", name:"Caves"} ]}, 
  { id:"beaches", title:"Beaches", icon:"🏖️", items:[ {id:"beaches", icon:"🏖️", name:"Public Beaches"}, {id:"boat_tours", icon:"🚤", name:"Boat Tours"} ]}, 
  { id:"landmarks", title:"Landmarks", icon:"🏛️", items:[ {id:"landmarks", icon:"🏛️", name:"Landmarks"}, {id:"palaces", icon:"🏰", name:"Palaces & Castles"}, {id:"museums", icon:"🖼️", name:"Museums"} ]}, 
  { id:"tours_venues", title:"Tours & Venues", icon:"🎟️", items:[ {id:"stadium_tours", icon:"🏟️", name:"Stadium Tours"}, {id:"factory_tours", icon:"🏭", name:"Factory Tours"} ]}, 
  { id:"theme_parks", title:"Theme & Water Parks", icon:"🎡", items:[ {id:"amusement", icon:"🎢", name:"Theme Parks"}, {id:"water_parks", icon:"💧", name:"Water Parks"}, {id:"game_zones", icon:"🎮", name:"Game Zones"}, {id:"kids", icon:"🧒", name:"Kids Play Areas"} ]}, 
  { id:"zoos_aquariums", title:"Zoos & Aquariums", icon:"🦁", items:[ {id:"zoo", icon:"🦁", name:"Zoo"}, {id:"safari", icon:"🦒", name:"Safari"}, {id:"aquarium", icon:"🐠", name:"Aquarium"} ]}, 
  { id:"stay", title:"Stay", icon:"🏨", items:[ {id:"hotels", icon:"🏨", name:"Hotels"}, {id:"apartments", icon:"🏢", name:"Apartments"}, {id:"resorts", icon:"🏝️", name:"Resorts"} ]}, 
  { id:"transportation", title:"Transportation", icon:"✈️", items:[ {id:"airports", icon:"✈️", name:"Airports"}, {id:"train_stations", icon:"🚆", name:"Train Stations"}, {id:"ferry", icon:"⛴️", name:"Ferry Terminals"} ]}, 
  { id:"others", title:"Others", icon:"📌", items:[ {id:"others", icon:"📌", name:"Others"} ]},
];
/* r74b (ر٧٣-أب المرحلة ٢ · قرار ٠٩-٢٩-٠٢): العناوين الشخصية كيان مستقل — تصنيفاتها خارج شجرة الأماكن (DATA = ١٨ قسمًا عامًّا صِرفة).
   المعرّفات والأسماء كما كانت (القواعد v3.13 تعرفها وترفضها كتصنيف عام — السطر catId in [...]) · تقرؤها شاشة Addresses وحدها عبر privateCategoryList() وisPrivateCategoryId() */
const ADDR_SECTIONS = [
  { title:"Hospitals & Clinics", icon:"🏥", items:[
    {id:"hospitals_clinics", icon:"🏥", name:"Hospitals & Clinics"},
  ]},
  { title:"Personal", icon:"🔒", items:[
    {id:"personal_home", icon:"🏠", name:"Home"},
    {id:"personal_work", icon:"💼", name:"Work"},
    {id:"personal_family", icon:"👨‍👩‍👧", name:"Family"},
    {id:"personal_relatives", icon:"👪", name:"Relatives"},
    {id:"personal_friends", icon:"🧑‍🤝‍🧑", name:"Friends"},
  ]},
];



/* =========================================================
   3) الحالة العامة
   ========================================================= */
let currentCityId = CITIES[0].id;
let currentCountry = CITIES[0].country;
let links = {};          // (لكل مدينة) { itemId: {active, places:[{name,url,area}]} }
let editMode = false;
let isOwner = false; // true فقط عندما currentUser.uid == settings/app.ownerUid — يُحدَّد داخل onAuthStateChanged
let ownerUid = null; // يُقرأ من settings/app عند التحميل
let cityStatus = {};     // (لكل مدينة) { cityId: true/false } — true = منشورة وظاهرة للزوار
let sectionStatus = {};  // (لكل مدينة) { sectionTitle: true/false } — true (أو غير موجود) = القسم الرئيسي ظاهر

// ===== قالب التصنيفات — مشترك بين كل المدن (تعديله بأي مدينة ينعكس على الجميع) =====
let customItems = [];      // [{id, section, icon, name}] — تصنيفات فرعية مضافة يدويًا

// ٢٦ أغسطس ٢٠٢٦ — القرار ٣-ب: التصنيف "خاص" إذا كان تحت قسم خاص بالقالب، أو تصنيفًا مخصصًا أُضيف تحت قسم خاص.
// القواعد تحرس المفاتيح السبعة المعرَّفة؛ المخصصة يحرسها هذا السطر (قيد كود موثَّق بالمصفوفة M4.11).
function isPrivateCategoryId(id){
  if (!id) return false;
  if (ADDR_SECTIONS.some(s => s.items.some(i => i.id === id))) return true;
  const c = customItems.find(x => x.id === id);
  return !!(c && ADDR_SECTIONS.some(s => s.title === c.section));
}
function splitCategories(cats){
  const pub = {}, priv = {};
  Object.keys(cats || {}).forEach(k => { (isPrivateCategoryId(k) ? priv : pub)[k] = cats[k]; });
  return { pub, priv };
}
let sectionOverrides = {}; // { sectionTitle: {name, icon} } — تخصيص اسم/أيقونة القسم الرئيسي
let itemOrder = {};        // { sectionTitle: [itemId, itemId, ...] } — ترتيب التصنيفات الفرعية
let itemOverrides = {};    // { itemId: {name, icon} } — تخصيص اسم/أيقونة تصنيف فرعي

/* =========================================================
   4) تحميل/حفظ من Firestore
   بنية الوثيقة: cities/{cityId} = { links: {...}, customItems: [...] }
   الإعدادات المشتركة: settings/app = { ownerUid, ownerEmail } — هوية المالك (بلا كلمة مرور)
   ========================================================= */
async function trackVisit(){
  try{
    await mpData.analytics.bumpVisits();
  }catch(e){ /* صامت — ما نزعج الزائر لو فشل */ }
}


