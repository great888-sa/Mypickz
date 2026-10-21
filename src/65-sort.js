/* ═══ r85 (ق١٠-١٩-٠١ §٢ · ق١٠-٢١-٠١ · جدول التحويل v1.1): «أغلبه يجد دبوسه وتصنيفه» — المطابقة عند فتح المدينة · موقع الملف مرجِّحًا من رابط المكان في الذاكرة · درجتا ثقة · Confirm all strong · التصنيف من فئة Overture · الممنوع لا يُصنَّف ولا يُحفظ
   الخطوط الحمراء: لا دبوس من موقع الملف (الدبوس إحداثيات Overture وحدها) · لا تثبيت صامت (Confirm all فعل صريح بعيّنة وUndo) · لا تصنيف بلا مطابقة · لا حذف صامت (الممنوع والمكرر يُوسمان وزر الحذف بيد المستخدم) */
const TK_STRONG_M = 100, TK_NEAR_M = 300, TK_SORT_CHUNK = 40;
/* ── جدول التحويل v1.1 (معتمد ١٦:٠٦–١٦:١٠): فئة Overture → تصنيفنا · ما ليس هنا يبقى في الصندوق — لا تخمين ── */
const TK_CAT_MAP = {
  coffee_shop: 'coffee', coffee_roastery: 'coffee',
  cafe: 'cafe', animal_cafe: 'cafe', cat_cafe: 'cafe', dog_cafe: 'cafe', hong_kong_style_cafe: 'cafe', internet_cafe: 'cafe', bistro: 'cafe', smoothie_juice_bar: 'cafe', milk_bar: 'cafe', milkshake_bar: 'cafe', kombucha_bar: 'cafe', non_alcoholic_beverage_venue: 'cafe',
  tea_room: 'tea', bubble_tea_shop: 'tea',
  breakfast_and_brunch_restaurant: 'brunch', pancake_house: 'brunch', waffle_restaurant: 'brunch', bagel_shop: 'brunch',
  bakery: 'bakery', baguette_shop: 'bakery', pretzel_shop: 'bakery', flatbread_shop: 'bakery', macaron_shop: 'bakery', pie_shop: 'bakery', donut_shop: 'bakery', cupcake_shop: 'bakery',
  dessert_shop: 'dessert', candy_store: 'dessert', chocolatier: 'dessert', indian_sweets_shop: 'dessert', japanese_confectionery_shop: 'dessert', popcorn_shop: 'dessert', sugar_shack: 'dessert',
  ice_cream_shop: 'icecream', gelato_shop: 'icecream', frozen_yogurt_shop: 'icecream', shaved_ice_shop: 'icecream',
  burger_restaurant: 'burger', cheesesteak_restaurant: 'burger', hot_dog_restaurant: 'burger', pizza_restaurant: 'pizza', piadina_restaurant: 'pizza', sandwich_shop: 'sandwich', wrap_restaurant: 'sandwich', delicatessen: 'sandwich', doner_kebab_restaurant: 'shawarma', falafel_restaurant: 'falafel', friterie: 'fries',
  chicken_restaurant: 'chicken', chicken_wings_restaurant: 'chicken', rotisserie_chicken_restaurant: 'chicken', barbecue_restaurant: 'grill', bar_and_grill_restaurant: 'grill', meat_restaurant: 'grill', kofta_restaurant: 'grill', meatball_restaurant: 'grill', curry_sausage_restaurant: 'grill', steakhouse: 'steak',
  seafood_restaurant: 'seafood', fish_restaurant: 'seafood', fish_and_chips_restaurant: 'seafood', poke_restaurant: 'seafood', fischbrotchen_restaurant: 'seafood', sushi_restaurant: 'sushi',
  fast_food_restaurant: 'fast_food', food_court: 'fast_food', food_truck_stand: 'fast_food', diner: 'fast_food', canteen: 'fast_food', cafeteria: 'fast_food', buffet_restaurant: 'fast_food', casual_eatery: 'fast_food',
  lebanese_restaurant: 'lebanese', syrian_restaurant: 'lebanese', palestinian_restaurant: 'lebanese', middle_eastern_restaurant: 'lebanese', israeli_restaurant: 'lebanese', turkish_restaurant: 'turkish', turkmen_restaurant: 'turkish', azerbaijani_restaurant: 'turkish', egyptian_restaurant: 'egyptian', north_african_restaurant: 'egyptian', moroccan_restaurant: 'egyptian', algerian_restaurant: 'egyptian',
  italian_restaurant: 'italian', french_restaurant: 'french', brasserie: 'french', haute_cuisine_restaurant: 'french', fondue_restaurant: 'french', spanish_restaurant: 'spanish', basque_restaurant: 'spanish', catalan_restaurant: 'spanish', iberian_restaurant: 'spanish', portuguese_restaurant: 'spanish', tapas_bar: 'spanish', greek_restaurant: 'greek', mediterranean_restaurant: 'greek', maltese_restaurant: 'greek',
  japanese_restaurant: 'japanese', ramen_restaurant: 'japanese', korean_restaurant: 'korean', thai_restaurant: 'thai', dumpling_restaurant: 'chinese', taiwanese_restaurant: 'chinese',
  mexican_restaurant: 'mexican', taco_restaurant: 'mexican', texmex_restaurant: 'mexican', empanada_restaurant: 'mexican', american_restaurant: 'american', north_american_restaurant: 'american', southern_american_restaurant: 'american', cajun_and_creole_restaurant: 'american', canadian_restaurant: 'american', soul_food: 'american', comfort_food_restaurant: 'american',
  restaurant: 'other_cuisine', yemenite_restaurant: 'other_cuisine', kurdish_restaurant: 'other_cuisine',
  shopping_mall: 'malls', department_store: 'department', market: 'local_markets', farmers_market: 'local_markets', fashion_and_apparel_store: 'fashion', personal_care_and_beauty_store: 'perfumes',
  park: 'parks', national_park: 'parks', dog_park: 'parks', playground: 'parks', garden: 'gardens', public_plaza: 'squares', public_pathway: 'pedestrian', marina: 'marina', dock: 'harbours', pier: 'harbours', scenic_viewpoint: 'tower_views', bridge: 'bridge_views',
  mountain: 'mountains', hill: 'mountains', canyon: 'mountains', valley: 'mountains', waterfall: 'waterfalls', beach: 'beaches',
  historic_site: 'landmarks', monument: 'landmarks', memorial_site: 'landmarks', lighthouse: 'landmarks', sculpture_statue: 'landmarks', street_art: 'landmarks', cultural_center: 'landmarks', public_fountain: 'landmarks', cemetery: 'landmarks', castle: 'palaces', fort: 'palaces', museum: 'museums', art_gallery: 'museums', planetarium: 'museums', science_attraction: 'museums',
  stadium_arena: 'stadium_tours', sports_complex: 'stadium_tours', amusement_park: 'amusement', amusement_attraction: 'amusement', carnival_venue: 'amusement', fairgrounds: 'amusement', arcade: 'game_zones', zoo: 'zoo', animal_attraction: 'zoo', aquarium: 'aquarium',
  hotel: 'hotels', inn: 'hotels', bed_and_breakfast: 'hotels', private_lodging: 'apartments', resort: 'resorts', airport: 'airports', air_transport_facility_or_service: 'airports', train_station: 'train_stations', rail_facility_or_service: 'train_stations', public_transit_facility_or_service: 'train_stations', ferry_service: 'ferry', water_taxi_service: 'ferry', water_transport_facility_or_service: 'ferry',
  movie_theater: 'others', theatre_venue: 'others', music_venue: 'others', comedy_club: 'others', performing_arts_venue: 'others', wellness_service: 'others', golf_course: 'others', skating_rink: 'others', swimming_pool: 'others', gym: 'others', fitness_studio: 'others', library: 'others', event_venue: 'others', festival_venue: 'others', social_club: 'others', country_club: 'others', rodeo: 'others', makerspace: 'others', ticket_office_or_booth: 'others'
};
/* قواعد الكلمة على اسم الفئة الدقيقة (الفروع التي لم تُسمَّ) — بالترتيب، الأول يفوز */
const TK_CAT_RULES = [
  [/_indian_|^indian_|punjabi|hyderabadi|gujarati|bengali|chettinad|rajasthani|pakistani|bangladeshi|sri_lankan|nepalese|himalayan|south_asian/, 'indian'],
  [/chinese|cantonese|sichuan|dim_sum|shanghainese|hunan|fujian|beijing|baozi|dongbei|jiangsu|shandong|xinjiang|indo_chinese/, 'chinese'],
  [/asian|vietnamese|filipino|indonesian|sundanese|malaysian|singaporean|burmese|cambodian|laotian|mongolian|nasi_|wok_|afghani|uzbek|kazakhstani/, 'asian'],
  [/latin_american|caribbean|cuban|dominican|haitian|jamaican|puerto_rican|trinidadian|central_american|belizean|costa_rican|guatemalan|honduran|nicaraguan|panamanian|salvadoran|south_american|argentine|bolivian|brazilian|chilean|colombian|ecuadorian|paraguayan|peruvian|surinamese|uruguayan|venezuelan/, 'mexican'],
  [/souq|souk|bazaar|flea_market|street_market|fish_market/, 'local_markets'], [/clothing|apparel|fashion|^boutique$/, 'fashion'], [/shoe|handbag|luggage|leather/, 'shoes_bags'], [/perfume|fragrance|cosmetic|beauty_store/, 'perfumes'], [/jewel|watch_store|goldsmith/, 'jewelry'],
  [/botanical/, 'gardens'], [/plaza|square|piazza/, 'squares'], [/pedestrian/, 'pedestrian'], [/promenade|boardwalk|esplanade|waterfront|riverwalk/, 'promenades'], [/harbor|harbour|wharf/, 'harbours'],
  [/clock_tower/, 'landmarks'], [/observation|tower|skyscraper|viewpoint|lookout|rooftop/, 'tower_views'], [/peak|summit|cable_car|gondola|ski_/, 'mountains'], [/cave|grotto|cavern/, 'caves'],
  [/landmark|historic|heritage|ruins|archaeolog|citadel|city_wall|clock_tower/, 'landmarks'], [/palace|chateau|manor/, 'palaces'], [/museum|gallery|exhibition/, 'museums'],
  [/stadium|arena|racetrack|circuit/, 'stadium_tours'], [/factory|workshop_tour|^farm$/, 'factory_tours'], [/theme_park|roller_coaster|ferris_wheel/, 'amusement'], [/water_park|aqua_park|splash|wave_pool/, 'water_parks'], [/escape_room|bowling|laser_tag|go_kart|trampoline|^vr_/, 'game_zones'], [/kids|children|indoor_play|soft_play/, 'kids'],
  [/petting_zoo|bird_park|butterfly/, 'zoo'], [/safari|wildlife|game_reserve/, 'safari'], [/oceanarium|sea_life/, 'aquarium'],
  [/hostel|motel|boutique_hotel|guest_house|ryokan|riad|pension|lodge/, 'hotels'], [/apartment|vacation_rental|serviced|aparthotel|condo/, 'apartments'], [/resort|spa_hotel|all_inclusive|glamping/, 'resorts'],
  [/heliport|air_terminal/, 'airports'], [/metro|subway|tram|bus_station|bus_terminal|railway|funicular/, 'train_stations'], [/ferry|cruise_terminal|port_terminal/, 'ferry'], [/spa$|hammam|sauna/, 'others'],
  [/_restaurant$/, 'other_cuisine'] /* الأوروبية والأفريقية والفارسية وكل مطعم لم يُسمَّ */
];
/* ممنوع — ضوابط المحتوى §١ (تسري حتى على القوائم الخاصة): لا يُصنَّف · لا يدخل Confirm all · يُوسم بزر حذف · وعند الإضافة اليدوية لا يُحفظ بمرشَّح أكيد */
const TK_CAT_BANNED = /(^|_)(bar|pub|lounge|brewery|winery|distillery|cidery|wine_tasting_room|beer_garden|alcoholic_beverage_venue|nightlife_venue|dance_club|adult_entertainment_venue|hookah_bar|gaming_venue|casino|beach_club|nightclub|strip_club|betting|gambling|speakeasy)(_|$)/;
const TK_NAME_WARN = /\b(bar|pub|club|lounge|casino|shisha|hookah|nightclub|brewery|winery)\b|بار|شيشة|معسل|كازينو/i;
const TK_BAR_NOT_ALCOHOL = /^(milk_bar|milkshake_bar|smoothie_juice_bar|kombucha_bar|salad_bar|juice_bar|snack_bar|coffee_bar|tea_bar|dessert_bar|chocolate_bar|sandwich_bar|poke_bar|cereal_bar|tapas_bar|oyster_bar|sushi_bar)$/; /* «bar» في الاسم لا يعني حانة — tapas_bar وsushi_bar مطعمان */
function tkCatBanned(cat){ const c = String(cat || '').toLowerCase(); if (!c || TK_BAR_NOT_ALCOHOL.test(c)) return false; return TK_CAT_BANNED.test(c); }
const TK_CAT_BOX = /^(arabian_restaurant|halal_restaurant|religious_landmark|religious_organization|religious_retreat_or_center|[a-z_]*place_of_worship|lake|river|forest|nature_reserve|canal|hot_springs|island|ocean|sea|recreational_trail_or_path|campground|rv_park)$/; /* يبقى في الصندوق بقرار (جدول v1.1 §٥): لا قطر سعودي في Overture · حلال ليست تصنيفًا · أماكن العبادة ليست من التطبيق · مناطق لا نقاط */
function tkCatToOurs(cat){ const c = String(cat || '').toLowerCase().trim(); if (!c || tkCatBanned(c) || TK_CAT_BOX.test(c)) return null; if (TK_CAT_MAP[c]) return TK_CAT_MAP[c]; for (let i = 0; i < TK_CAT_RULES.length; i++){ if (TK_CAT_RULES[i][0].test(c)) return TK_CAT_RULES[i][1]; } return null; }
function tkSectionOfCat(catId){ const c = plCatsAll().find(function(x){ return x.id === catId; }); return c ? c.sectionId : ''; }

/* ── موقع الملف من رابط المكان نفسه — في الذاكرة فقط ولا يُكتب (٠٩-١٥-٠٥) ── */
function tkFileLocOf(p){ const url = String((p && p.url) || ''); if (!url) return null; const ids = tkIdsFromUrl(url); if (ids.cell){ const c = tkCellToLatLng(ids.cell); if (c) return { lat: c.lat, lng: c.lng }; } const m = /maps\/search\/(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url) || /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url); return m ? { lat: +m[1], lng: +m[2] } : null; }
function tkNameExact(a, b){ const x = pickerNormalize(String(a || '')), y = pickerNormalize(String(b || '')); return !!x && x === y; }
function tkJudge(p, res, fileLoc){ // → اقتراح للذاكرة { lat, lng, openId, cat, strong?, probable?, n } أو null · موقع الملف يرجّح بين المرشَّحين ولا يصنع دبوسًا
  const cands = ((res && res.candidates) || []).filter(function(c){ return typeof c.lat === 'number'; }); if (!cands.length) return null;
  let pick = null, probable = false;
  if (fileLoc){ const near = cands.map(function(c){ return { c: c, m: plKm(fileLoc, c) * 1000 }; }).filter(function(x){ return x.m <= TK_NEAR_M; }).sort(function(a, b){ return a.m - b.m; }); if (near.length){ pick = near[0].c; } else { pick = (res && res.auto) || cands[0]; probable = true; } }
  else { if (res && res.auto){ pick = res.auto; } else { pick = cands[0]; probable = true; } }
  const sg = { lat: pick.lat, lng: pick.lng, openId: pick.id || null, source: 'overture', cat: pick.cat || '', city: cityListCityId };
  if (probable){ sg.probable = true; sg.n = cands.length; } else if (fileLoc && tkNameExact(p.name, pick.name) && plKm(fileLoc, pick) * 1000 <= TK_STRONG_M) sg.strong = true;
  return sg;
}

/* ── التشغيل عند فتح المدينة: مجموعات tk: فقط (المستورَد) · تقسيط ٤٠ · سطر تقدّم في الصندوق · حفظة واحدة بحارس العدّ ── */
const tkSortState = {}; let tkSortBusy = false, tkUndoLast = null;
function tkSortLine(){ const s = tkSortState[cityListCityId]; if (!s) return 'Auto-sort: not run for this city'; if (s.status === 'running') return 'Auto-sort: running · ' + (s.progress || ''); const r = s.report || {}; return 'Auto-sort: ' + (r.scanned || 0) + ' scanned · strong ' + (r.strong || 0) + ' · suggested ' + (r.suggested || 0) + ' · possible ' + (r.possible || 0) + ' · not found ' + (r.notFound || 0) + ' · sorted ' + (r.sorted || 0) + ' · kept by list section ' + (r.heldBySection || 0) + ' · outside guidelines ' + (r.banned || 0) + ' · duplicates ' + (r.dup || 0) + (r.err ? ' · error ' + r.err : ''); }
function tkTkGroups(){ return plUnknownCats().map(function(x){ return x.id; }); } /* r85 (كلمة المالك ١٦:٤٠): كل مجموعات الصندوق — المستورَدة (tk:) والمهجَّرة القديمة (Activities …) — صندوق واحد يُفرز كله */
function tkSortNeeded(){ if (!currentUser || !myCityListData || myCityListLoadedFor !== cityListCityId) return false; const s = tkSortState[cityListCityId]; if (s && (s.status === 'running' || s.status === 'done')) return false; return tkTkGroups().length > 0; }
function tkSortKick(){ if (tkSortNeeded()) setTimeout(function(){ tkSortRun().catch(function(e){ mpSwallow(e, 'autosort'); }); }, 0); } /* يُنادى من رسم الصندوق — مرة لكل مدينة بالجلسة */
function tkSortProgress(txt){ const s = tkSortState[cityListCityId]; if (s) s.progress = txt; const el = document.getElementById('tkSortLine'); if (el) el.textContent = txt; }
async function tkSortRun(){ if (tkSortBusy || !tkSortNeeded()) return; const city = cityListCityId; tkSortBusy = true; tkSortState[city] = { status: 'running', progress: 'Finding pins…', report: null };
  try{
    const cats = myCityListData.categories; const groups = tkTkGroups(); const todo = []; groups.forEach(function(k){ (cats[k].places || []).forEach(function(p, i){ if (p && (p.name || p.url) && !(p.geo && typeof p.geo.lat === 'number')) todo.push({ p: p, k: k }); }); });
    const existingOpen = {}; Object.keys(cats).forEach(function(k){ if (/^tk:/.test(k)) return; ((cats[k] || {}).places || []).forEach(function(q){ if (q && q.openId) existingOpen[q.openId] = true; }); });
    const g = await cityGeoOf(city); const rep = { scanned: todo.length, strong: 0, suggested: 0, possible: 0, notFound: 0, sorted: 0, heldBySection: 0, banned: 0, dup: 0, err: '' }; if (!g){ rep.err = 'no city centre'; tkSortState[city] = { status: 'done', report: rep }; return; }
    const need = todo.filter(function(t){ return !(plSugKey(t.p) in plSuggestCache); }); const chunks = []; for (let i = 0; i < need.length; i += TK_SORT_CHUNK) chunks.push(need.slice(i, i + TK_SORT_CHUNK)); let done = 0;
    for (let i = 0; i < chunks.length; i += 2){ if (cityListCityId !== city) return; await Promise.all(chunks.slice(i, i + 2).map(async function(chunk){ let r = null; try{ r = await mpData.geo.matchBatch(city, chunk.map(function(t){ return { name: t.p.name || '', addr: t.p.area || '' }; }), g); }catch(e){ rep.err = /abort/i.test(String(e)) ? 'timeout' : 'network'; } if (r && r.noData) rep.err = 'noData';
      chunk.forEach(function(t, k){ const res = r && r.results ? r.results[k] : null; plSuggestCache[plSugKey(t.p)] = tkJudge(t.p, res, tkFileLocOf(t.p)); }); done += chunk.length; tkSortProgress('Finding pins… ' + Math.min(done, need.length) + '/' + need.length); })); }
    if (cityListCityId !== city) return;
    // التصنيف والوسم — في الذاكرة ثم حفظة واحدة بحارس العدّ
    const before = liveCountOf(cats); let changed = false; const moves = [];
    todo.forEach(function(t){ const p = t.p; const sg = plSuggestCache[plSugKey(p)]; if (!sg){ rep.notFound++; return; } if (sg.probable){ rep.possible++; return; }
      if (sg.openId && existingOpen[sg.openId]){ if (!p.dup){ p.dup = true; changed = true; } rep.dup++; return; } /* التكرار (ج): مكان قديم بالمعرّف نفسه — يُوسم لا يُحذف */
      if (tkCatBanned(sg.cat)){ if (p.hold !== 'guidelines'){ p.hold = 'guidelines'; changed = true; } rep.banned++; delete sg.strong; return; } /* ممنوع: لا تصنيف · وسم · حذف بيد المستخدم · لا يُعدّ قويًّا */
      if (sg.strong) rep.strong++; else rep.suggested++;
      const catId = tkCatToOurs(sg.cat); if (!catId) return; if (p.section && tkSectionOfCat(catId) !== p.section){ rep.heldBySection++; p.autoCat = sg.cat; changed = true; return; } /* قيد القائمة يسبق */
      moves.push({ p: p, from: t.k, to: catId, cat: sg.cat }); });
    moves.forEach(function(m){ const src = cats[m.from]; const i = (src.places || []).indexOf(m.p); if (i < 0) return; src.places.splice(i, 1); const dst = userEnsurePlaces(m.to); dst.active = true; m.p.autoCat = m.cat; m.p.sortedAt = Date.now(); if (!m.p.fromCat) m.p.fromCat = m.from; m.p.searchKey = placeSearchKey(m.p, m.to); dst.places.push(m.p); rep.sorted++; changed = true; });
    groups.forEach(function(k){ if (cats[k] && !((cats[k] || {}).places || []).length){ delete cats[k]; if (myCityListOldKeys.indexOf(k) < 0) myCityListOldKeys.push(k); } }); /* المجموعة الفارغة تُحذف من المستند الفرعي أيضًا */
    const after = liveCountOf(cats); if (after !== before){ rep.err = 'count mismatch — nothing saved'; tkSortState[city] = { status: 'done', report: rep }; return; } /* حارس العدّ: النقل لا يغيّر العدد */
    if (changed){ try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'autosort-save'); rep.err = 'save failed'; } }
    tkSortState[city] = { status: 'done', report: rep }; try{ logTiming('AUTOSORT · ' + city + ' · ' + rep.scanned + ' scanned · ' + rep.sorted + ' sorted · ' + rep.strong + ' strong · ' + rep.banned + ' outside guidelines · 0 coordinates from the file written'); }catch(_){}
  } finally { tkSortBusy = false; if (cityListCityId === city) try{ renderPlacesMine(); }catch(_){} }
}

/* ── Confirm all strong (N): فعل صريح واحد · عيّنة ثلاثة على خريطة مصغّرة · Undo بعده (ق١٠-١٩-٠١ البند ٧) ── */
function tkStrongList(){ const out = []; const cats = (myCityListData && myCityListData.categories) || {}; Object.keys(cats).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p, i){ if (!p || (p.geo && typeof p.geo.lat === 'number') || p.hold === 'guidelines' || p.dup) return; const sg = plSuggestCache[plSugKey(p)]; if (sg && sg.strong && typeof sg.lat === 'number') out.push({ p: p, k: k, i: i, sg: sg }); }); }); return out; }
function tkPickSample(list, n){ const a = list.slice(); const out = []; while (a.length && out.length < n){ out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); } return out; }
let tkStrongSample = [];
function tkConfirmStrongOpen(){ const list = tkStrongList(); if (!list.length){ showToast('No strong pins to confirm'); return; } const bd = document.getElementById('dashBackdrop'), body = document.getElementById('dashBody'); if (!bd || !body) return; bd.classList.add('show'); dashSet('✓ Confirm all strong', null); tkStrongSample = tkPickSample(list, 3);
  body.innerHTML = '<div style="font-size:13px; line-height:1.5;"><b>' + list.length + ' place' + (list.length === 1 ? '' : 's') + '</b> matched by exact name within ' + TK_STRONG_M + ' m of where Google had them. ' + (list.length > 3 ? 'Here are three at random' : 'Here they are') + ' — if they look right, confirm all in one tap. You can undo right after.</div>'
    + '<div id="tkSampleMap" style="height:180px; border-radius:12px; overflow:hidden; margin:8px 0; background:var(--surf);"></div>'
    + tkStrongSample.map(function(x, i){ return '<div class="row rowblock" style="display:flex; gap:8px; align-items:center;"><span style="flex:none; width:20px; height:20px; border-radius:50%; background:var(--saffron); color:var(--ink); font-weight:800; font-size:12px; display:inline-flex; align-items:center; justify-content:center;">' + (i + 1) + '</span><span style="flex:1; min-width:0;" dir="auto"><b>' + escapeHtml(x.p.name) + '</b>' + (x.sg.cat ? ' <span class="dim">· ' + escapeHtml(String(x.sg.cat).replace(/_/g, ' ')) + '</span>' : '') + '</span></div>'; }).join('')
    + '<button type="button" class="cta" style="display:block; width:100%; margin-top:10px;" onclick="tkConfirmStrong()">Confirm ' + list.length + ' pin' + (list.length === 1 ? '' : 's') + '</button><button type="button" class="btn btn-ghost" style="margin-top:8px; padding:7px 14px; font-size:12px;" onclick="closeModalById(\'dashBackdrop\')">Not now</button>'
    + '<div class="dim" style="font-size:11.5px; margin-top:6px; text-align:center;">Pins come from our map data (Overture), never from the file.</div>';
  setTimeout(async function(){ const el = document.getElementById('tkSampleMap'); if (!el) return; try{ const m = await mpMap.create(el, { center: [tkStrongSample[0].sg.lat, tkStrongSample[0].sg.lng], zoom: 13 }); tkStrongSample.forEach(function(x, i){ m.marker([x.sg.lat, x.sg.lng], { label: i + 1 }); }); if (tkStrongSample.length > 1) m.fitBounds(tkStrongSample.map(function(x){ return [x.sg.lat, x.sg.lng]; })); setTimeout(function(){ m.resize(); }, 80); }catch(_){ el.innerHTML = '<div class="mp-empty mini">Map could not load — the names above still apply</div>'; } }, 30);
}
async function tkConfirmStrong(){ const list = tkStrongList(); if (!list.length) return; const cats = myCityListData.categories; const before = liveCountOf(cats); const undo = [];
  list.forEach(function(x){ const sg = x.sg; x.p.geo = { lat: +(+sg.lat).toFixed(5), lng: +(+sg.lng).toFixed(5), source: 'overture' }; if (sg.openId) x.p.openId = sg.openId; undo.push({ p: x.p, sg: sg }); delete plSuggestCache[plSugKey(x.p)]; }); /* الدبوس إحداثيات Overture (sg) لا الملف */
  if (liveCountOf(cats) !== before){ showToast('Count mismatch — nothing saved'); return; }
  try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'confirm-strong'); showToast('Could not save'); return; }
  tkUndoLast = { city: cityListCityId, items: undo, at: Date.now() }; try{ logTiming('CONFIRM ALL STRONG · ' + cityListCityId + ' · ' + undo.length + ' pins · 0 coordinates from the file'); }catch(_){}
  closeModalById('dashBackdrop'); showToast('Pinned ' + undo.length + ' place' + (undo.length === 1 ? '' : 's') + ' ✓ — Undo is in the box'); renderPlacesMine(); }
async function tkUndoConfirm(){ const u = tkUndoLast; if (!u || u.city !== cityListCityId) return; u.items.forEach(function(x){ delete x.p.geo; delete x.p.openId; plSuggestCache[plSugKey(x.p)] = x.sg; }); try{ await saveMyCityList(); }catch(e){ mpSwallow(e, 'undo-strong'); showToast('Could not save'); return; } tkUndoLast = null; showToast('Undone — ' + u.items.length + ' pin' + (u.items.length === 1 ? '' : 's') + ' back to suggested'); renderPlacesMine(); }

/* ── الممنوع في الصندوق: زر حذف جماعي (لا حذف صامت) ── */
function tkBannedList(){ const out = []; const cats = (myCityListData && myCityListData.categories) || {}; Object.keys(cats).forEach(function(k){ ((cats[k] || {}).places || []).forEach(function(p){ if (p && p.hold === 'guidelines') out.push({ p: p, k: k }); }); }); return out; }
async function tkRemoveBanned(){ const list = tkBannedList(); if (!list.length) return; const ok = await mpConfirm('Remove ' + list.length + ' place' + (list.length === 1 ? '' : 's') + ' that fall outside the content guidelines (bars, nightlife, alcohol, hookah, gambling)? This cannot be undone.', { title: 'Outside the guidelines', okLabel: 'Remove', danger: true }); if (!ok) return;
  const cats = myCityListData.categories; const before = liveCountOf(cats); list.forEach(function(x){ const arr = cats[x.k].places; const i = arr.indexOf(x.p); if (i >= 0) arr.splice(i, 1); }); Object.keys(cats).forEach(function(k){ if (/^tk:/.test(k) && !((cats[k] || {}).places || []).length){ delete cats[k]; if (myCityListOldKeys.indexOf(k) < 0) myCityListOldKeys.push(k); } });
  if (liveCountOf(cats) !== before - list.length){ showToast('Count mismatch — nothing saved'); return; }
  try{ await saveMyCityList(); showToast('Removed ' + list.length); }catch(e){ mpSwallow(e, 'remove-banned'); showToast('Could not save'); } renderPlacesMine(); }
/* ── الصندوق: سطر الحالة وأزراره (يُحقن في plUnsortedPanelHtml) ── */
function tkSortBoxHtml(){ const s = tkSortState[cityListCityId]; const strong = tkStrongList().length; const banned = tkBannedList().length; let h = '';
  if (s && s.status === 'running') h += '<div class="dim" id="tkSortLine" style="font-size:11.5px; margin:4px 0;">' + escapeHtml(s.progress || 'Finding pins…') + '</div>';
  else if (s && s.report){ const r = s.report; h += '<div class="dim" style="font-size:11.5px; margin:4px 0;">Auto-sort: ' + r.sorted + ' moved to their categories' + (r.heldBySection ? ' · ' + r.heldBySection + ' kept here by the list’s section' : '') + (r.possible ? ' · ' + r.possible + ' need your pick' : '') + (r.notFound ? ' · ' + r.notFound + ' not found' : '') + (r.err ? ' · <span style="color:#ffb4a2;">' + escapeHtml(r.err) + '</span>' : '') + '</div>'; }
  if (strong) h += '<div class="chiprow" style="margin:4px 0;"><button type="button" class="chip on" onclick="tkConfirmStrongOpen()">✓ Confirm all strong (' + strong + ')</button><span class="dim" style="font-size:11px;">exact name · within ' + TK_STRONG_M + ' m of Google’s spot</span></div>';
  if (tkUndoLast && tkUndoLast.city === cityListCityId) h += '<div class="chiprow" style="margin:4px 0;"><button type="button" class="chip" onclick="tkUndoConfirm()">↶ Undo last confirm (' + tkUndoLast.items.length + ')</button></div>';
  if (banned) h += '<div class="chiprow" style="margin:4px 0;"><button type="button" class="chip" onclick="tkRemoveBanned()">Remove ' + banned + ' outside the guidelines</button><span class="dim" style="font-size:11px;">bars · nightlife · alcohol · hookah · gambling</span></div>';
  return h; }
function tkPlaceBadges(p){ let h = ''; if (p.hold === 'guidelines') h += ' <span style="font-size:11px; font-weight:700; color:#b3261e;" title="Outside the content guidelines — not sorted; remove it from the box">· outside guidelines</span>'; if (p.dup) h += ' <span class="dim" style="font-size:11px; font-weight:700;" title="Same place as one you already have (same map id)">· duplicate</span>'; if (p.autoCat && !p.hold) h += ' <span class="dim" style="font-size:11px;">· ' + escapeHtml(String(p.autoCat).replace(/_/g, ' ')) + '</span>'; return h; } /* وسوم نصًّا بحجم السطر — لا شرائح (ملاحظة المالك على الشجرة ١٥:٤٠) */
/* ── الإضافة اليدوية: مرشَّح أكيد بفئة ممنوعة → لا دبوس ولا حفظ معه؛ Skip = «ليس هذا المكان» يبقى متاحًا · تحذير بالاسم بلا منع ── */
function tkGeoBanned(res){ return !!(res && res.auto && tkCatBanned(res.auto.cat)); }
function tkGuidelineMsg(){ return 'This looks like a place outside MyPickz’s content guidelines (bars, nightlife, alcohol, hookah, gambling) — it can’t be pinned or saved as this match. If it’s a different place, use Skip and it stays unpinned.'; }
