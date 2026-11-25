// ===== خ٢ (٢٧ أغسطس ٢٠٢٦، r3 بالتحسينات المعتمدة): وجهة العناوين الشخصية — المشهدان ٦/و و٦/و٢ =====
// المصدر الوحيد: userPrivatePlaces/{uid}_{cityId} عبر النواة · لا علم عام ولا مشاركة ولا زر رحلة
// مدينة العناوين مستقلة عن مدينة التصفح بالأماكن (استخدام يومي) — تُحفظ بمستند المستخدم (addrCity)
let addrData = {};          // { cityId: { catId: { active, places:[{id,name,url,note,area}] } } }
let addrSaved = null; /* r100-أ: لقطة آخر حالة محفوظة/محمَّلة للعناوين */
function addrSnap(){ addrSaved = JSON.stringify(addrData || {}); mpSaveOk('addresses'); }
function addrDiscard(){ if (addrSaved) addrData = JSON.parse(addrSaved); addrEditRef = null; try{ closeModalById('addrBackdrop'); }catch(_){} renderAddresses(); }
let addrCities = [];        // مدن فيها عناوين (من فهرس userLists.privateCities)
let addrCurrentCity = null; // المدينة المعروضة (لا "الكل")
let addrCurrentCountry = null; // الدولة المعروضة — الدولة أولًا ثم المدينة (منهج الأماكن)
let addrLoaded = false;     // تخزين القراءات بالذاكرة — يُبطَل عند أي كتابة
let addrModalCity = null, addrModalCat = null, addrEditRef = null; // {cityId, catId, index} عند التعديل
function privateCategoryList(){
  const out = [];
  ADDR_SECTIONS.forEach(sec => {
    sec.items.forEach(i => out.push({ id: i.id, icon: '', name: i.name, section: sec.title, sicon: sec.icon })); // r72r-1: لا أيقونة للفرعي (قرار المالك)
    customItems.filter(c => c.section === sec.title).forEach(c => out.push({ id: c.id, icon: c.icon, name: c.name, section: sec.title, sicon: sec.icon }));
  });
  return out;
}
function addrCountOf(cityId){ return Object.values(addrData[cityId] || {}).reduce((a, e) => a + ((e.places || []).length), 0); }
async function loadAddresses(force){
  if (!currentUser) return;
  if (!mpAccountReady()) return; /* r120 (المراجعة المستقلة ١ · مهم · مقيس): فهرس مدن العناوين من الحساب — على حساب لم يُحمَّل كانت الذاكرة تُبنى «بلا عناوين» وتُثبَّت، ثم يكتب حفظُ عنوان [الجديد] فوق تصنيف فيه عناوين. المعالج يعيد التحميل حين يصل الحساب */
  if (addrLoaded && !force){ renderAddresses(); return; }
  const __who = currentUser.uid, __gen = mpSessionGen; const idx = (userListData && userListData.privateCities) || [];
  const cities = Array.from(new Set(idx)).filter(Boolean);
  const prev = addrData || {}; addrData = {}; let readFailed = false; /* r100-أ: قراءة فاشلة لا تمسح ما كان على الشاشة ولا تُحدّث اللقطة */
  await Promise.all(cities.map(async c => { try{ addrData[c] = await mpData.privatePlaces.get(__who, c); }catch(e){ readFailed = true; mpSwallow(e, 'addresses-load'); addrData[c] = prev[c] || {}; } }));
  if (!mpSameUser(__who, __gen)){ addrData = {}; return; } /* قراءة وصلت والداخل غير صاحبها */
  addrCities = cities.filter(c => addrCountOf(c) > 0); if (!readFailed) addrSnap(); else showToast('Could not load your addresses — showing what was on screen');
  // المدينة المعروضة: المحفوظة، وإلا مدينة أكثر العناوين
  const saved = userListData && userListData.addrCity;
  if (saved && addrCities.includes(saved)) addrCurrentCity = saved;
  else if (!addrCities.includes(addrCurrentCity)) addrCurrentCity = addrCities.slice().sort((a, b) => addrCountOf(b) - addrCountOf(a))[0] || null;
  addrLoaded = true;
  renderAddresses();
}
function cityNameOf(id){ const c = cityListAllCities().find(x => x.id === id) || allCities().find(x => x.id === id); return c ? c.name : id; }
// خ٢-r4: إضافة مدينة بنفس منهج قائمتي والأماكن — اسم المدينة (إنجليزي فقط) ثم الدولة؛ تُحفظ بمدنك الخاصة (مشتركة مع قائمتي)
async function addAddrCity(){
  if (!currentUser) return;
  // ر٧٠د: المدينة المضافة تُخلَّد فورًا وتظهر هنا بعدّاد صفر حتى يُحفظ أول عنوان (قرار المالك ب)
  // الدولة أولًا ثم المدينة — منهج الأماكن (إنجليزي فقط)
  const country = await openInputModal("Country", "e.g. Saudi Arabia, Italy... (English letters only)", addrCurrentCountry || "", WORLD_COUNTRIES.map(c => c.name));
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
    if (!Array.isArray(userListData.customCities)) userListData.customCities = []; // ر٧٠د: تخليد فوري (قرار المالك)
    if (!existing) userListData.customCities.push(gazEntryToCity(__row, country.trim()));
    pendingCity = null;
    await saveUserListGeneral(); // كان: تعليق حتى أول حفظ أول عنوان
  }
  addrCurrentCity = id; addrCurrentCountry = country.trim();
  if (!addrCities.includes(id)) addrCities.push(id);
  addrData[id] = addrData[id] || {};
  renderAddresses();
  openAddrModal(id, null);
}
function countryOfCity(cityId){ const c = cityListAllCities().find(x => x.id === cityId) || allCities().find(x => x.id === cityId); return c ? c.country : null; }
function pickAddrCountry(country){
  addrCurrentCountry = country;
  const inCountry = addrCities.filter(c => countryOfCity(c) === country);
  addrCurrentCity = inCountry.includes(addrCurrentCity) ? addrCurrentCity : (inCountry[0] || null);
  if (addrCurrentCity && userListData && userListData.addrCity !== addrCurrentCity){ userListData.addrCity = addrCurrentCity; mpData.userLists.merge(currentUser.uid, { addrCity: addrCurrentCity }).catch(()=>{}); }
  renderAddresses();
}
function pickAddrCity(cityId){
  addrCurrentCity = cityId;
  if (userListData && userListData.addrCity !== cityId){ userListData.addrCity = cityId; mpData.userLists.merge(currentUser.uid, { addrCity: cityId }).catch(()=>{}); }
  renderAddresses();
}
let addrPanel = null;                     // 'cities' | 'cats' | null — حالة عرض بحتة
function addrPickCat(catId){ openAddrModal(addrCurrentCity, catId); } // ر٧٠د
function addrTogglePanel(which){ addrPanel = (addrPanel === which) ? null : which; renderAddresses(); }
function renderAddresses(){
  const countries = [...new Set(addrCities.map(countryOfCity).filter(Boolean))];
  if (!addrCurrentCountry || !countries.includes(addrCurrentCountry)) addrCurrentCountry = countryOfCity(addrCurrentCity) || countries[0] || null;
  const inCountry = addrCities.filter(c => countryOfCity(c) === addrCurrentCountry);
  if (!inCountry.includes(addrCurrentCity)) addrCurrentCity = inCountry[0] || null;
  const cityId = addrCurrentCity;

  /* المحدد الواحد — نفس نموذج وجهة الأماكن */
  const oneC = countries.length <= 1;
  document.getElementById('addrTrio').innerHTML =
      (!addrCurrentCountry ? '<span class="csel label">—</span>'
        : '<button type="button" class="csel" onclick="addrTogglePanel(\'countries\')">' + (countryFlag(addrCurrentCountry) ? countryFlag(addrCurrentCountry) + ' ' : '') + plCountryCode(addrCurrentCountry) + ' ' + (addrPanel === 'countries' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>')
    + (!cityId ? '<span class="csel label grow"><b>Add your city</b></span>'
        : '<button type="button" class="csel grow" onclick="addrTogglePanel(\'cities\')"><b>' + escapeHtml(cityNameOf(cityId)) + '</b> ' + (addrPanel === 'cities' ? '<span class="arr">⌃</span>' : '<span class="arr">⌄</span>') + '</button>')
    + '<button type="button" class="actn primary hact" onclick="addAddrCity()"><b>＋</b> City</button>'; // ر٧٠د (N-073): فعل رئيس ثلث الصف
  const actx = document.getElementById('addrCtx'); if (actx) actx.innerHTML = '<b>My addresses</b>' + (cityId ? ' · ' + escapeHtml(cityNameOf(cityId)) : '') + mpUnsavedTag('addresses');
  const cb = document.getElementById('addrCatBtn'); if (cb) cb.innerHTML = '<b>＋</b> Add address';

  /* ر٧٠د (N-011 · ٦/و): اللوحات الثلاث بلوحة الاختيار المشتركة — الدول بعلمها · المدن بعدّاد عناويني (الحذف بوضع التحرير = عناويني فيها) · التصنيفات الخاصة */
  let panel = '';
  if (addrPanel === 'cities'){
    panel = pickerPanel({ id: 'addrCities', title: 'Browse cities · ' + (addrCurrentCountry || ''), countryLabel: (countryFlag(addrCurrentCountry) ? countryFlag(addrCurrentCountry) + ' ' : '') + plCountryCode(addrCurrentCountry), onCountry: "addrTogglePanel('countries')",
      filterPlaceholder: 'Type a city…', onPick: 'pickAddrCity', onClose: 'addrTogglePanel(null)', editable: true, onDelete: 'removeAddrCity', canAdd: true, onAdd: 'addAddrCity()', emptyText: 'No city matches — add it below',
      items: inCountry.map(c => ({ id: c, name: cityNameOf(c), count: addrCountOf(c), selected: c === cityId, custom: true })) });
  } else if (addrPanel === 'countries'){
    panel = pickerPanel({ id: 'addrCountries', title: 'Browse countries', filterPlaceholder: 'Type a country…', onPick: 'pickAddrCountry', onClose: 'addrTogglePanel(null)',
      items: countries.map(c => ({ id: c, name: c, icon: countryFlag(c) || '', country: c, count: addrCities.filter(x => countryOfCity(x) === c).length, selected: c === addrCurrentCountry })) });
  } else if (addrPanel === 'cats' && cityId){
    const cm = (cityId && addrData[cityId]) || {};
    panel = pickerPanel({ id: 'addrCats', title: 'Pick a category to add an address', filterPlaceholder: 'Type a category…', onPick: 'addrPickCat', onClose: 'addrTogglePanel(null)',
      items: privateCategoryList().map(c => ({ id: c.id, name: c.name, count: ((cm[c.id] && cm[c.id].places) || []).length })) }); // r72r-1
  }
  document.getElementById('addrPanel').innerHTML = panel;

  /* التصنيفات السبعة مسطَّحة — كلٌّ بعدّاده و＋ */
  const cats = privateCategoryList();
  const susp = currentUserSuspended ? '<div class="warnline">🚫 <span><b>Account Suspended</b><br>You can browse everything, but saving is turned off.</span></div>' : '';
  const catsMap = (cityId && addrData[cityId]) || {};
  let html = susp;
  if (!cityId){
    html += '<div class="mp-empty">🔒<br>Start with your city.<br><span class="mini">Tap ＋ Add city, then add your home, work, clinic… only you can see them.</span></div>';
  } else {
    cats.forEach(cat => {
      const places = (catsMap[cat.id] && catsMap[cat.id].places) || [];
      if (!places.length) return;                 // منطق الأماكن نفسه: الفارغ باللوحة لا بالجسم
      let __acards = ''; const __aright = '<button type="button" class="pg-add go" onclick="openAddrModal(\'' + cityId + '\',\'' + cat.id + '\')" title="Add an address under ' + escapeHtml(cat.name) + '">' + mpIcon('plus', { size: 13 }) + ' Add address</button>'; // r72r-1 · r75a-٢: «+ Add address» بالاسم الكامل
      places.forEach((p, i) => {
        const aActions = [ /* r75a-٢: الطقم بالعناوين — أربع بلاطات: Google Maps · Call · Share · Edit */
          { icon: 'maps', label: 'Google Maps', href: p.url, title: 'Open in Google Maps', attrs: 'data-mpsrc="app" data-mpcat="' + cat.id + '" data-mppersonal="1"' },
          p.phone ? { icon: 'phone', label: 'Call', href: 'tel:' + String(p.phone).replace(/[^+\d]/g, ''), title: 'Call' } : { icon: 'phone', label: 'Call', disabled: true, title: 'No phone saved' },
          { icon: 'share', label: 'Share', on: "sendAddr('" + cityId + "','" + cat.id + "'," + i + ")", title: 'Send via MyPickz' },
          { icon: 'edit', label: 'Edit', on: "openAddrModal('" + cityId + "','" + cat.id + "'," + i + ")", title: 'Edit' }
        ];
        __acards += placeCardHtml({ id: p.id || p.url, name: p.name || cat.name, url: p.url, area: p.area ? String(p.area) : '', phone: p.phone ? String(p.phone) : '', note: p.note }, 'address', { actions: aActions, open: true }); /* r75c: الحي سطرًا بدبوس */
      });
      html += placeGroupHtml(cat.name, places.length, __aright, __acards, 'address');
    });
  }
  document.getElementById('addrBody').innerHTML = html;
}

// إرسال العنوان خارج التطبيق بتوقيع (قرار إرسال لا مشاركة بيانات) — مشاركة النظام، وإلا نسخ للحافظة
async function sendAddr(cityId, catId, index){
  const cat = privateCategoryList().find(c => c.id === catId); const p = ((addrData[cityId] || {})[catId] || {}).places[index]; if (!p) return;
  const text = `${cat ? cat.name : ''}${p.name ? ': ' + p.name : ''} — ${cityNameOf(cityId)}${p.note ? ' · ' + p.note : ''}${p.phone ? ' · ' + p.phone : ''}\n${p.url}\nSent via MyPickz · ${mpShareUrl({ src: 'app' })}`;
  mpTrack.hit('share_link');
  try{
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); showToast('Copied — paste it anywhere'); }
  }catch(e){}
}
async function pasteToAddrUrl(){
  try{ const t = await navigator.clipboard.readText(); if (!t || !t.trim()){ showToast('Clipboard is empty'); return; } document.getElementById('addrUrl').value = t.trim(); showToast('Pasted ✓'); }
  catch(e){ showToast('Could not access clipboard — paste manually in the field'); }
}
// نافذة الإضافة/التعديل (٦/و٢): الدولة ثم المدينة بالمنهج الموحَّد — المختارة مسبقًا مدينة العناوين الحالية
// ر٧٠د (٦/و٢): مدينة نافذة العنوان بلوحة الاختيار المشتركة — مدني كلها بعلم دولتها · المختارة مسبقًا مدينة العناوين الحالية · ＋ Add city بمسار الإضافة نفسه
function addrFillCountries(selectedCityId){
  const list = cityListAllCities().filter(c => c.country);
  addrModalCity = list.some(c => c.id === selectedCityId) ? selectedCityId : (list.some(c => c.id === addrModalCity) ? addrModalCity : (list[0] ? list[0].id : null));
  delete __pk.addrModalCity;
  addrModalRenderCityPanel();
}
function addrModalRenderCityPanel(){
  const host = document.getElementById('addrModalCityHost'); if (!host) return;
  const cur = cityListAllCities().find(c => c.id === addrModalCity);
  host.innerHTML = pickerRow({ id: 'addrModalCity', label: cur ? cur.name : 'Choose a city', placeholder: 'Type a city…', onPick: 'addrModalPickCity', canAdd: true, onAdd: 'addrModalAddCity()', emptyText: 'No city matches — add it below',
    items: cityListAllCities().filter(c => c.country).map(c => ({ id: c.id, name: c.name, icon: countryFlag(c.country) || '', selected: c.id === addrModalCity })) });
}
function addrModalPickCity(id){ addrModalCity = id; pickerRowClose('addrModalCity'); addrModalRenderCityPanel(); }
async function addrModalAddCity(){ await addAddrCity(); } /* r117-ج (وُجد بمحطته): كان يعيد ملء النافذة بمدينة تبويب العناوين بعد كل عودة — فإلغاء الإضافة يُسقط المدينة التي اختارها المستخدم في النافذة. مسار الإضافة نفسه يفتح النافذة على المدينة الجديدة عند اكتماله (openAddrModal)؛ والإلغاء لا يغيّر شيئًا */
function addrSetMethod(paste){
  const pw = document.getElementById('addrPasteWrap');
  document.getElementById('addrMethodPaste').classList.toggle('on', paste);
  document.getElementById('addrMethodManual').classList.toggle('on', !paste);
  if (pw) pw.style.display = paste ? '' : 'none';
}
function addrParseShare(){
  const raw = String((document.getElementById('addrShareBox') || {}).value || '');
  if (!raw.trim()) return;
  const um = raw.match(/https?:\/\/\S+/);
  if (um){ const u = document.getElementById('addrUrl'); if (u) u.value = um[0]; }
  const nameGuess = raw.replace(/https?:\/\/\S+/g, ' ').replace(/[\n\r]+/g, ' ').trim().replace(/[،,]$/, '').trim();
  const n = document.getElementById('addrName');
  if (n && !n.value.trim() && nameGuess) n.value = nameGuess.slice(0, 80);
}
function openAddrModal(cityId, catId, index){
  if (!currentUser) return;
  const sb = document.getElementById('addrShareBox'); if (sb) sb.value = '';
  if (document.getElementById('addrMethodPaste')) addrSetMethod(true);
  if (currentUserSuspended){ showToast("Your account is suspended — you can't add addresses"); return; }
  const cats = privateCategoryList();
  addrEditRef = (cityId && catId && index !== undefined) ? { cityId, catId, index } : null;
  const existing = addrEditRef ? ((addrData[cityId][catId].places || [])[index] || {}) : {};
  addrModalCat = catId || (cats[0] && cats[0].id);
  document.getElementById('addrModalTitle').textContent = addrEditRef ? '✏️ Edit address' : '🔒 Add address';
  const adb = document.getElementById('addrDeleteBtn'); if (adb) adb.style.display = addrEditRef ? '' : 'none'; // ر٦١
  addrFillCountries(cityId || addrCurrentCity);
  document.getElementById('addrModalCats').innerHTML = cats.map(c => `<button type="button" class="addr-chip ${c.id === addrModalCat ? 'on' : ''}" onclick="addrModalCat='${c.id}'; this.parentNode.querySelectorAll('.addr-chip').forEach(b=>b.classList.remove('on')); this.classList.add('on');">${escapeHtml(c.name)}</button>`).join('');
  document.getElementById('addrName').value = existing.name || '';
  document.getElementById('addrUrl').value = existing.url || '';
  document.getElementById('addrArea').value = existing.area || ''; /* r75c: خانة الحي */
  document.getElementById('addrNote').value = existing.note || '';
  document.getElementById('addrPhone').value = existing.phone || '';
  document.getElementById('addrError').textContent = '';
  openModalById('addrBackdrop');
  mpLenWatch('addrName', MP_LIMITS.name); mpLenWatch('addrArea', MP_LIMITS.area); mpLenWatch('addrNote', MP_LIMITS.note); mpLenWatch('addrPhone', MP_LIMITS.phone); /* r100-ج */
}
let cityDelCtx = null; // {cityId, from:'addr'|'places'}
async function openCityDeleteChooser(cityId, from){ /* r75c (البند ١٠): ورقة سفلية بدل النافذة القديمة — العدّادان يُقرآن أولًا (لا يحذف أحد وهو يجهل حجم ما يفقد · قرار المالك ٣٠ أغسطس) ثم الخيارات: هذا الوجه · الوجه الآخر حين له محتوى (قرار ١ سبتمبر) · الحذف الشامل فعلًا أحمر */
  const isCustom = true; // ز-١-ج-٢: كل مدني ملكي (لا قياسية)
  const name = cityNameOf(cityId);
  cityDelCtx = { cityId: cityId, from: from, isCustom: isCustom };
  const nList = await cityCountList(cityId), nAddr = await cityCountAddr(cityId);
  if (!cityDelCtx || cityDelCtx.cityId !== cityId) return;   // تغيّرت أثناء القراءة
  const plural = function(n, w){ return n + ' ' + w + (n === 1 ? '' : (/s$/.test(w) ? 'es' : 's')); }; /* r75c: «addresses» لا «addresss» (كانت تجمع بـs وحدها) */
  const n2 = (from === 'addr') ? nList : nAddr;
  const v = await mpSheet({ title: '🗑 ' + name, text: plural(nList, 'place') + ' in My List · ' + plural(nAddr, 'address') + '. Choose what to delete.',
    ok: 'Delete everywhere · ' + plural(nList + nAddr, 'item'), danger: true, /* r75d-٢: تسميات أقصر — المدينة بالعنوان */
    alt: (from === 'addr') ? 'Remove addresses (' + nAddr + ')' : 'Clear my list (' + nList + ')',
    alt2: n2 > 0 ? ((from === 'addr') ? 'Clear my list (' + n2 + ')' : 'Remove addresses (' + n2 + ')') : null });
  if (!cityDelCtx || cityDelCtx.cityId !== cityId) return;
  if (v === 'ok') return cityDelFull();
  if (v === 'alt') return cityDelSide();
  if (v === 'alt2') return cityDelSide(true);
}
async function cityCountList(cityId){ // عدد أماكن قائمة المدينة (للطرف الآخر)
  try{ if (typeof plSaveWait === 'function') await plSaveWait(cityId); /* r120 (أ-١٠ — قيس): العدد بعد حفظ في الطريق لا قبله */ const d = await mpData.cityLists.get(currentUser.uid, cityId); if (!d || !d.categories) return 0;
    return Object.values(d.categories).reduce((a, e) => a + ((e && e.places) ? e.places.length : 0), 0); }catch(e){ return 0; }
}
async function cityCountAddr(cityId){
  try{ const cats = await mpData.privatePlaces.get(currentUser.uid, cityId);
    return Object.values(cats || {}).reduce((a, e) => a + ((e && e.places) ? e.places.length : 0), 0); }catch(e){ return 0; }
}
async function cityDelSide(other){
  let { cityId, from } = cityDelCtx || {}; if (!cityId) return;
  if (other) from = (from === 'addr') ? 'list' : 'addr';   // الزر الثاني = الوجه الآخر
  const n1 = from === 'addr' ? await cityCountAddr(cityId) : await cityCountList(cityId);
  if (!(await mpConfirm('This cannot be undone.', { title: (from === 'addr' ? '🗑 Remove your ' + n1 + ' address' + (n1 === 1 ? '' : 'es') + ' in ' : '🗑 Clear your list of ' + n1 + ' place' + (n1 === 1 ? '' : 's') + ' in ') + cityNameOf(cityId) + '?', ok: from === 'addr' ? 'Remove addresses' : 'Clear list', danger: true }))) return; /* ب-٢-٢-أ٢ */
  if (from === 'addr'){
    let __ok = false; const __att = async function(){ try{ await mpData.privatePlaces.remove(currentUser.uid, cityId); __ok = true; return true; }catch(e){ await mpSaveFailed('addresses', e, __att, async function(){}); return __ok; } }; if (!(await __att())) return; /* r100-أ: لا تُمسّ الذاكرة إلا بعد نجاح الحذف */
    delete addrData[cityId];
    addrCities = addrCities.filter(c => c !== cityId);
    if (addrCurrentCity === cityId) addrCurrentCity = null;
    if (cityDelCtx.isCustom && (await cityCountList(cityId)) === 0) await removeCityListCity(cityId, { confirmed: true }); // منع الشبح (الخاصة فقط)
    showToast('Removed from Addresses');
    renderAddresses(); if (currentTab === 'Places') renderPlacesBody();
  } else {
    const __sbGone = await savedByGather(cityId); /* r117-أ: النسخ المعدودة في «saved by» تُجمع قبل حذف القائمة */
    let __ok2 = false; const __att2 = async function(){ try{ await mpData.cityLists.remove(currentUser.uid, cityId); plListGone(cityId); __ok2 = true; return true; }catch(e){ await mpSaveFailed('places', e, __att2, async function(){}); return __ok2; } }; if (!(await __att2())) return; /* r100-أ */ savedByRelease(__sbGone); /* r117-أ: الحذف نجح — عدّاداتها تنقص وسجلاتي تُحذف */ try{ await syncCommunityProfile(); }catch(e){} // ر٧٢-أ-١د: إلغاء المحتوى بمدينة قياسية يزامن الملف العام أيضًا
    if (myCityListLoadedFor === cityId){ myCityListData = null; myCityListLoadedFor = null; }
    if (cityDelCtx.isCustom && (await cityCountAddr(cityId)) === 0){ await removeCityListCity(cityId, { confirmed: true }); /* r120 (ع-٤): ومفاتيح أعدادها تُحذف هناك */ }
    else { await mpCityCountsSave(cityId, { n: 0, pin: 0, from: 0 }); /* r120 (ع-٤ — شقيق): القائمة حُذفت من هذا الباب والمدينة باقية ⇒ أعدادها صفر (كان عددها القديم يبقى) */ if (cityListCityId === cityId){ const rem = cityListAllCities().filter(c => c.country === cityListCountry && c.id !== cityId); cityListCityId = rem.length ? rem[0].id : null; } }
    showToast('Removed from My List');
    renderPlacesBody(); 
  }
}
async function cityDelFull(){
  const { cityId } = cityDelCtx || {}; if (!cityId) return;
  const nA = await cityCountAddr(cityId), nL = await cityCountList(cityId);
  if (!(await mpConfirm((nA + nL) + ' item' + (nA + nL === 1 ? '' : 's') + ' will be lost. This cannot be undone.', { title: '🗑 Delete ' + cityNameOf(cityId) + ' everywhere?', ok: 'Delete everywhere', danger: true }))) return; /* ب-٢-٢-أ٢ */
  let __ok = false; const __att = async function(){ try{ await mpData.privatePlaces.remove(currentUser.uid, cityId); __ok = true; return true; }catch(e){ await mpSaveFailed('addresses', e, __att, async function(){}); return __ok; } }; if (!(await __att())) return; /* r100-أ */
  delete addrData[cityId];
  addrCities = addrCities.filter(c => c !== cityId);
  if (addrCurrentCity === cityId) addrCurrentCity = null;
  await removeCityListCity(cityId, { confirmed: true });
  renderAddresses(); if (currentTab === 'Places') renderPlacesBody();
}
async function removeAddrCity(cityId){
  // r18: المدينة كيان مشترك — حذفها يزيل عناوينها وقائمة أماكنها معًا، والتأكيد يقولها صراحة
  if (pendingCity && pendingCity.id === cityId){ pendingCity = null; delete addrData[cityId]; addrCities = addrCities.filter(c => c !== cityId); if (addrCurrentCity === cityId) addrCurrentCity = null; renderAddresses(); return; }
  openCityDeleteChooser(cityId, 'addr');
}
async function saveAddr(){ return mpBusyRun('addr-save', saveAddrRun, '#addrSaveBtn'); } /* r100-ب: نقرة ثانية أثناء الحفظ تُتجاهل والزر معطَّل */
async function saveAddrRun(){
  if (!mpAccountGate()) return; if (!addrLoaded){ try{ await loadAddresses(true); }catch(_){} if (!addrLoaded){ showToast('Could not load your addresses — try again'); return; } } /* r120: التصنيف يُكتب كله من الذاكرة — عناويني تُحمَّل أولًا إن لم تكن محمَّلة، ولا يُكتب على ما لم يُقرأ */
  const name = document.getElementById('addrName').value.trim();
  const url = document.getElementById('addrUrl').value.trim();
  const note = document.getElementById('addrNote').value.trim();
  const phone = document.getElementById('addrPhone').value.trim();
  const area = document.getElementById('addrArea').value.trim().slice(0, 80); /* r75c (قرار المالك ١٢ أكتوبر): الحي اختياري — كان يُحفظ فارغًا */
  const err = document.getElementById('addrError');
  err.textContent = '';
  if (!name){ err.textContent = 'Enter a name'; return; }
  if (!isGoogleMapsUrl(url)){ err.textContent = 'Paste a Google Maps link'; return; }
  if (!(mpLenOk('addrName', MP_LIMITS.name) & mpLenOk('addrArea', MP_LIMITS.area) & mpLenOk('addrNote', MP_LIMITS.note) & mpLenOk('addrPhone', MP_LIMITS.phone))) return; /* r100-ج */
  const cityId = addrModalCity, catId = addrModalCat;
  if (!cityId){ err.textContent = 'Choose a city'; return; }
  const catsMap = addrData[cityId] || (addrData[cityId] = {});
  const entry = catsMap[catId] || (catsMap[catId] = { active: true, places: [] });
  const place = { id: 'p_' + Date.now().toString(36), name, url, note, phone, area };
  if (addrEditRef && addrEditRef.cityId === cityId && addrEditRef.catId === catId){
    place.id = (entry.places[addrEditRef.index] || place).id || place.id;
    entry.places[addrEditRef.index] = place;
  } else {
    if (addrEditRef){ const old = addrData[addrEditRef.cityId][addrEditRef.catId]; old.places.splice(addrEditRef.index, 1);
      try{ await mpData.privatePlaces.setCategory(currentUser.uid, addrEditRef.cityId, addrEditRef.catId, old); }catch(e){} }
    entry.places.push(place);
  }
  const __attempt = async function(){ /* r100-أ: إعادة المحاولة تعيد الكتابة فقط — الذاكرة عُدّلت أعلاه مرة واحدة */
    try{
      await commitPendingCityIfNeeded(cityId); // r18: تخليد المدينة المعلقة مع حفظ أول عنوان
      await mpData.privatePlaces.setCategory(currentUser.uid, cityId, catId, entry);
      await mpData.userLists.addPrivateCity(currentUser.uid, cityId);
      if (userListData){ if (!Array.isArray(userListData.privateCities)) userListData.privateCities = []; /* r116-ح (وُجد بمحطة personal_save ١١ نوفمبر): الفهرس قد يغيب عن الكائن (تحميل هوية تعثّر — السطر ٧٨ في citylist) فكان هذا السطر يرمي بعد نجاح الكتابتين: العنوان محفوظ والنافذة تقول «Could not save» */ if (!userListData.privateCities.includes(cityId)) userListData.privateCities.push(cityId); }
      addrCurrentCity = cityId; if (userListData){ userListData.addrCity = cityId; mpData.userLists.merge(currentUser.uid, { addrCity: cityId }).catch(()=>{}); }
      closeModalById('addrBackdrop');
      showToast('Saved ✓'); mpTrack.hit('personal_save', { personal: true }); /* r116-ح: عنوان شخصي حُفظ — بلا مدينة ولا تصنيف (خاص) */
      await loadAddresses(true);
    }catch(e){ err.textContent = 'Could not save — try again'; await mpSaveFailed('addresses', e, __attempt, async function(){ addrDiscard(); }); renderAddresses(); }
  };
  await __attempt();
}
async function deleteAddr(cityId, catId, index){
  const entry = addrData[cityId] && addrData[cityId][catId]; if (!entry) return; const __p = (entry.places || [])[index]; if (!__p) return;
  return mpBusyRun('addr-delete', async function(){ /* r100-ب: ورقة واحدة · الحذف بهوية العنوان لا بالفهرس */
  if (!(await mpConfirm('', { title: '🗑 Delete this address?', ok: 'Delete', danger: true }))) return; /* ب-٢-٢-أ٢ */
  const entryNow = (addrData[cityId] && addrData[cityId][catId]) || entry; let __i = entryNow.places.indexOf(__p); if (__i < 0) __i = entryNow.places.findIndex(function(q){ return q && __p.id && q.id === __p.id; }); if (__i < 0){ showToast('Already removed'); renderAddresses(); return; } entryNow.places.splice(__i, 1);
  let __done = false; const __attempt = async function(){ try{ await mpData.privatePlaces.setCategory(currentUser.uid, cityId, catId, entryNow); showToast('Deleted'); __done = true; return true; }catch(e){ await mpSaveFailed('addresses', e, __attempt, async function(){ addrDiscard(); }); return __done; } }; /* r100-أ: الناتج هو الحقيقة بعد كل المحاولات */
  if (!(await __attempt())){ renderAddresses(); return; }
  await loadAddresses(true);
  });
}

// خ١-ب: معاينة شاشات ٩ و١٠ (معطَّلة حتى ٢/ب و٢/د)
function openDeletePreview(){
  document.getElementById('delCntPlaces').textContent = Object.values((myCityListData && myCityListData.categories) || {}).reduce((a, c) => a + ((c.places || []).length), 0) || '—';
  document.getElementById('delCntTrips').textContent = (typeof userTrips !== 'undefined' && userTrips) ? userTrips.length : '—';
  document.getElementById('delCntFav').textContent = String(Object.keys(placeBmMap()).length + Object.keys(listBmMap()).length + Object.keys(tripSaveMap()).length); /* r119: العدد من الخريطة المبنيّة — كان صفرًا حتى يفتح أحدٌ شاشة تبنيها */
  const prof = (typeof curators !== 'undefined' && curators && currentUser) ? curators.find(function(c){ return c.uid === currentUser.uid; }) : null; const pe = document.getElementById('delCntProfile'); if (pe) pe.textContent = prof ? ((typeof prof.followerCount === 'number' ? prof.followerCount : 0) + ' followers') : '1'; /* ب-٢-٢-أ٢: صفحة المنتقي بمتابعيها */
  delStep(1); openModalById('delBackdrop');
}
/* ر٥٩ · الحذف التسلسلي (القرار: تقديمه قبل الميداني — البند ١٣):
   الترتيب: سجلاتي على محتوى الآخرين بدفعاتها المربوطة (تُنقص عدّاداتهم، وبديل degraded عند غياب الأصل)
   ← متابعاتي ← محتواي (رحلات · قوائم مدن · عناوين) ← هويتي (الملف · حجز الاسم · السجل · المستند الأم)
   ← حساب المصادقة بإعادة التوثيق. لا صمت: أي توقف يظهر برسالته. */
/* ═══ r120 (ق١١-١٧-٠٦ — «نعم» ١٧ نوفمبر ١١:٤٥ · قياس المراجعة المستقلة ٢٢): حذف الحساب لا يدّعي ما لم يقع ═══
   قيس: كل خطوة كانت داخل «حاول وتجاهل» إلا حذف حساب الدخول — قاعدة البيانات ترفض كل شيء، فيُحذف الدخول وتقول الشاشة «all your data were permanently deleted»؛
   خطوة واحدة تفشل فيبقى بندها (قائمة عامة · ملف · ملاحظة · معرّفه في مشاركة غيره) للأبد بصمت؛ وما أُنشئ من جهاز آخر (مفكرة · حفظ رحلة · عناوين · اسم بُدّل) يبقى لأن الحذف يأخذه من ذاكرة الجلسة.
   الآن: (١) الحساب يُقرأ من الخادم أولًا · (٢) ما يراه غيره أو يدلّ عليه إن فشل منه شيء يتوقف الحذف قبل حساب الدخول — الحساب باقٍ والإعادة ممكنة · (٣) السجلات الصغيرة على محتوى غيره تُحاوَل وتُعدّ ولا توقف (يكنسها المالك) ·
   (٤) الشاشة تقول ما وقع · (٥) أثناء الحذف لا حفظ من هذا الجهاز (mpAccountGate · saveTrip)، وما في الطريق يصل أولًا. مستندا الحساب (users · userLists) يُحذفان آخرًا: توقّفٌ قبلهما يُبقي حسابًا يُحمَّل ويُعاد منه. */
let mpDeleting = false; let mpDelRun = 0; let __delReauthAt = 0, __delReauthFor = '';
function mpDelFlag(on){ mpDeleting = !!on; try{ document.body.classList.toggle('mp-deleting', !!on); }catch(_){ } } /* r120 (المراجعة ٢٤ — قيس في المتصفح): الشريطان فوق كل نافذة (٧٠٠ فوق ١٠١) — والحذف جارٍ تُرفع نافذته فوقهما (10-structure.css) فلا يُبلغ الدرج ولا التبويبات ولا شريحة الحساب */
function mpDelCarry(uid){ try{ return localStorage.getItem('mp_del_left_' + uid) === '1'; }catch(_){ return false; } } /* سجلات صغيرة بقيت في محاولة سابقة لهذا الحساب على هذا الجهاز — شاشة النهاية لا تنساها بعد إعادة تحميل. مفتاح لكل حساب (المراجعة ٢٤ — قيس: مفتاح واحد للجهاز كان حذفُ حساب آخر يمسحه) */
async function mpGoneFinish(){ /* r120 (ق١١-١٧-١٠): حساب دخل وشاهد حذفه قائم. يُحاوَل إتمام حذف حساب الدخول (ينجح إن كان الدخول للتوّ — وهو حال من انقطع حذفه عند آخر خطوة ثم دخل من جديد)؛ وإلا يُخرَج برسالته: القواعد ترفض كل كتابة له، وسؤاله عن اسم مستعار كان حلقة لا تنتهي */
  const who = currentUser && currentUser.uid; const same = function(){ return !!who && !!currentUser && currentUser.uid === who; }; /* المراجعة ٢٦ (قيس): حساب آخر دخل والنداء في الطريق — لا يُخرَج هو ولا تُعرض له الرسالة */
  try{ await mpData.auth.deleteSelf(); const some = mpDelCarry(who); try{ localStorage.removeItem('mp_del_left_' + who); }catch(_){ } showToast(some ? 'Your account was deleted — some small records may not have been removed' : 'Your account was deleted'); } /* علامة «بقيت سجلات صغيرة» من المحاولة التي انقطعت تُقال هنا وتُمسح — هذا المسار لا يمرّ بشاشة النهاية */
  catch(e){ mpSwallow(e, 'gone · sign-in account'); if (!same()) return; showToast(String((e && e.code) || '') === 'auth/requires-recent-login' ? 'This account was deleted — sign in once more to finish removing it' : 'This account was deleted'); try{ await mpData.auth.signOut(); }catch(e2){ mpSwallow(e2, 'gone · sign out'); } } }
function delDone(){ closeModalById('delBackdrop'); delCurStep = 1; } /* زر «Close» في شاشة النهاية */
function delDialogForget(){ if (mpDeleting) return; const bd = document.getElementById('delBackdrop'); if (bd && bd.classList.contains('show')) bd.classList.remove('show'); delCurStep = 1; } /* حساب دخل: نافذة حذف بقيت من غيره (شاشة نهاية لم تُغلق · خطوة كُتبت فيها DELETE) لا تُعرض له (المراجعة ٢٤ — قيس) */
function delStopped(btn, kind, left, o){ /* kind: 'left' بقي ما يوقف · 'auth' البيانات أُزيلت وحساب الدخول باقٍ · 'read' لم يُقرأ الحساب فلم يُحذف شيء · 'odd' خطأ غير متوقع */ btn.disabled = false; btn.textContent = 'Try again'; const el = document.getElementById('delLeft'); o = o || {};
  const text = kind === 'auth' ? ((o.small ? 'Your data were removed — except some small records (such as a bookmark, a follow, a view or a request) that could not be — but the sign-in account could not be deleted. ' : 'Your data were removed, but the sign-in account could not be deleted. ') + (o.login ? 'Confirm your password again and try again.' : 'Check your connection and try again.'))
    : kind === 'read' ? 'Your account could not be read from the server, so nothing was deleted. Check your connection and try again.'
    : kind === 'odd' ? ('Deletion stopped on something unexpected (' + left + ') — your sign-in account is still here. Try again.')
    : ('Deletion did not finish — your sign-in account is still here. Some of your content may already be deleted. Not removed yet: ' + left.join(' · ') + '. Check your connection and try again.');
  if (el){ el.textContent = text; el.style.display = ''; } showToast(kind === 'auth' ? 'Your data were removed — the sign-in account is still here · try again' : (kind === 'read' ? 'Nothing was deleted — your account could not be read' : 'Deletion did not finish — your sign-in account is still here')); try{ logTiming('DELETE · stopped · ' + kind + (kind === 'left' ? ' · ' + left.join(' · ') : '')); }catch(_){ } }
async function doAccountDelete(){
  const btn = document.getElementById('delGo'); if (!btn || btn.disabled) return;
  if (!currentUser) return;
  if (!mpAccountReady()){ showToast(userListLoadFailed ? 'Reload first — your account did not load' : 'Your account is still loading — try again in a moment'); return; } /* r120: المتابعات والمفكرات والاسم تُؤخذ من الحساب المحمَّل — حذفٌ قبل تحميله يترك سجلاتها عند غيره وحجز الاسم (لا تُطلق) */ /* r120 (المراجعة المستقلة): يتوقف وإن كان التحميل ما زال جاريًا — لا حذف من حساب افتراضي فارغ */
  if (__delReauthFor !== currentUser.uid || Date.now() - __delReauthAt > 240000){ const who = currentUser.uid; const ok = await requestReauth(); if (!ok){ showToast('Identity not confirmed — nothing was deleted'); return; } if (!currentUser || currentUser.uid !== who) return; __delReauthAt = Date.now(); __delReauthFor = who; } /* «Try again» في الدقائق الأربع نفسها لا يسأل كلمة المرور ثانية — لصاحب التأكيد وحده (المراجعة ٢٣: كانت تنتقل إلى حساب دخل بعده) */
  if (mpDeleting || !currentUser) return; mpDelFlag(true); const run = ++mpDelRun; /* ضغطتان وتأكيد الهوية مفتوح للاثنتين: الثانية لا تجري (والزر المعطّل يصدّ ما بعدهما) */
  btn.disabled = true; btn.textContent = 'Deleting…'; { const el = document.getElementById('delLeft'); if (el){ el.style.display = 'none'; el.textContent = ''; } }
  const uid = currentUser.uid; const must = []; let __left = 0, __some = false; const carry = mpDelCarry(uid); const GONE = { gone: true };
  const alive = function(){ return mpDelRun === run && !!currentUser && currentUser.uid === uid; }; /* المراجعة ٢٣ (قيس): خروج أو حساب آخر والسلسلة تنتظر خطوة — تُترك: لا تكتب بعدها ولا تعرض شيئًا لغير صاحبها */
  const miss = function(what){ if (must.indexOf(what) < 0) must.push(what); };
  const need = async function(what, fn){ if (!alive()) throw GONE; try{ return await fn(); }catch(e){ if (e === GONE) throw e; mpSwallow(e, 'delete · ' + what); miss(what); return null; } }; /* ما يراه غيره أو يدلّ عليه: فشله يوقف الحذف */
  const soft = async function(what, fn){ if (!alive()) throw GONE; try{ return (await fn()) || 0; }catch(e){ if (e === GONE) throw e; mpSwallow(e, 'cascade ' + what); __some = true; return 0; } }; /* سجل صغير: ما عُرف عدده يُعدّ، وخطوة رمت لا يُعرف كم تركت (المراجعة ٢٣: كانت تُعدّ «١» وقد تركت ثلاثًا) — ولا يوقف */
  const small = function(){ return !!(__left || __some || carry); };
  const stop = function(kind, left, o){ if (!alive()) return; if (small()) try{ localStorage.setItem('mp_del_left_' + uid, '1'); }catch(_){ } delStopped(btn, kind, left, o); };
  try{
    // ٠ — ما في الطريق يُنتظر وصوله (بسقف)، وحفظ قائمة لم يبلغ كتابته بعدُ لا يكتب والحذف جارٍ (plSaveNow يسأل العلم قبل الكتابة نفسها)؛ ثم الحساب كما هو في الخادم الآن (ما أُنشئ من جهاز آخر)
    try{ await Promise.all(Object.keys(plSaveBusy).concat(Object.keys(plSaveNext)).map(function(c){ return plSaveWait(c); })); }catch(_){ } try{ await tripSaveWaitAll(); }catch(_){ }
    if (!alive()) throw GONE;
    let fresh = null; try{ const d = await mpData.userLists.getServer(uid); fresh = (d && d.exists) ? (d.data() || {}) : {}; }catch(e){ mpSwallow(e, 'delete · account read'); }
    if (!alive()) throw GONE;
    if (!fresh){ stop('read'); return; }
    const onIds = function(a, b){ const o = {}; [a, b].forEach(function(m){ Object.keys(m || {}).forEach(function(k){ if (m[k]) o[k] = true; }); }); return Object.keys(o); };
    // ١ — سجلاتي على محتوى الآخرين. الدفعة ٢ (قواعد v3.17 ١١): كل سجل يُطلق من بابه الواحد — −١ على عدّاده، أو السجل وحده حين لا عدّاد يُنقص (المصدر حُذف · صفر · لم يعد عامًّا · أنا موقوف). المرآة لا تُكتب: المستند الأم يُحذف في ٤.
    for (const listId of onIds((userListData && userListData.listBookmarkIds), fresh.listBookmarkIds)){ const cut = listId.indexOf('_'); const ownerUid = cut > 0 ? listId.slice(0, cut) : listId, cityId = cut > 0 ? listId.slice(cut + 1) : '';
      __left += await soft('bookmark', async function(){ try{ await mpData.bookmarks.toggleList(uid, ownerUid, cityId, false, { noMirror: true }); return 0; }catch(e){ mpSwallow(e, 'cascade bookmark'); return 1; } }); }
    for (const tripId of onIds((userListData && userListData.tripSaveIds), fresh.tripSaveIds)){ __left += await soft('trip save', async function(){ try{ await mpData.tripSaves.toggle(uid, tripId, false, { noMirror: true }); return 0; }catch(e){ mpSwallow(e, 'cascade trip save'); return 1; } }); }
    // ٢ — متابعاتي ونسخي ومشاهداتي وطلبي وبلاغاتي
    __left += await soft('follows', function(){ return mpData.follows.releaseMine(uid); });
    __left += await soft('copies', function(){ return mpData.copies.removeMine(uid); }); // r72t (M4.26 ٢): سجلات النسخ · r117-أ: سجل حفظ المكان يُنقص عدّاده «saved by» بالدفعة نفسها · الدفعة ٢: وسجل نسخ القائمة والرحلة يُنقص copyCount على مصدره
    __left += await soft('old pins', function(){ return mpData.identity.stripMine(uid); }); /* الموقوف تُرفض كتابته هنا بالقاعدة — يكنسها المالك */
    __left += await soft('viewers', function(){ return mpData.viewers.removeMine(uid); }); __left += await soft('place viewers', function(){ return mpData.placeViewers.removeMine(uid); });
    __left += await soft('requests', async function(){ await mpData.requests.removeMine(uid); return 0; }); __left += await soft('reports', async function(){ await mpData.reports.removeMine(uid); return 0; });
    if (__left || __some) try{ logTiming('DELETE · small records not released: ' + __left + (__some ? ' + unknown (a step failed)' : '')); }catch(_){ }
    // ٣ — ما يراه غيري أو يدلّ عليّ: خروجي من مشاركاتهم · ملاحظاتي · رحلاتي · قوائمي · عناويني
    if (await need('your place in lists shared with you', function(){ return mpData.cityLists.leaveShares(uid); })) miss('your place in lists shared with you');
    if (await need('your place in trips shared with you', function(){ return mpData.trips.leaveShares(uid); })) miss('your place in trips shared with you');
    await need('your city notes', function(){ return mpData.cityNotes.removeMine(uid); });
    // ر٦٧ (صيد المحاكاة): الحذف بالاستعلام المالكي ∪ المحلي — القائمة المحلية قد تكون ناقصة (تحميل لم يكتمل · جهاز آخر)
    const tripIds = new Set((userTrips || []).map(t => t.id));
    await need('your trips', async function(){ (await mpData.trips.byOwner(uid)).forEach(function(d){ tripIds.add(d.id); }); });
    for (const id of tripIds){ await need('your trips', function(){ return mpData.trips.remove(id); }); }
    const cityIds = [...new Set(
      (typeof cityListAllCities === 'function' ? cityListAllCities() : []).map(c => c && c.id)
        .concat((userListData && userListData.privateCities) || []).concat(Array.isArray(fresh.privateCities) ? fresh.privateCities : []) /* مدن فيها عناوين — من الذاكرة ومن الخادم */
        .filter(Boolean)
    )];
    await need('your lists', async function(){ (await mpData.cityLists.byOwner(uid)).forEach(function(d){ const cid = String(d.id).split('_').slice(1).join('_'); if (cid && cityIds.indexOf(cid) < 0) cityIds.push(cid); }); }); // ر٦٧: ∪ استعلام المالك
    __left += await soft('saved-by', async function(){ await savedByReleaseCities(cityIds); return 0; }); /* r117-أ: الشبكة الثانية لعدّادات «saved by» */
    for (const cid of cityIds){
      await need('your lists', function(){ return mpData.cityLists.remove(uid, cid); });
      await need('your addresses', function(){ return mpData.privatePlaces.remove(uid, cid); }); /* العناوين: قاعدتها بمعرّف المستند (لا تقرأ بياناته) — حذف غير الموجود مقبول، ففشله فشل حقيقي يوقف في كل مدينة لا في مدن الفهرس وحدها (المراجعة ٢٣: مدينة غابت عن الفهرس كان فشلها يُتجاهل بلا عدّ ولا سطر) */
    }
    await need('your lists', function(){ return mpData.cityLists.removeOrphanCats(uid); });
    if (must.length){ stop('left', must); return; }
    // ٤ — هويتي: الملف والاسم، ثم سجل الحساب، ثم مستند الحساب أخيرًا (المرايا والفهارس تسكنه — وبقاؤه يُبقي الحساب قابلًا للتحميل والإعادة)
    await need('your public profile', function(){ return mpData.profiles.remove(uid); });
    const nicks = [...new Set([(userListData && userListData.nickname) || '', fresh.nickname || ''].map(function(n){ return String(n || '').toLowerCase(); }).filter(Boolean))]; /* اسم بُدّل من جهاز آخر: حجزه من مستند الخادم */
    for (const nk of nicks){ await need('your nickname', async function(){ const d = await mpData.nicknames.get(nk); if (!alive()) throw GONE; if (d && d.exists && ((d.data() || {}).uid === uid)) await mpData.nicknames.remove(nk); }); } /* المراجعة ٢٣ (قيس): القاعدة ترفض حذف حجز غائب أو لغيري — يُقرأ أولًا: غائب (تحرّر في محاولة سابقة · بُدّل) أو لغيري ⇒ لا شيء لي أحذفه. كان الرفض يوقف الحذف للأبد */
    if (must.length){ stop('left', must); return; }
    await need('your account record', function(){ return mpData.users.remove(uid); });
    if (must.length){ stop('left', must); return; }
    await need('your account record', function(){ return mpData.userLists.remove(uid); });
    if (must.length){ stop('left', must); return; }
    // ٤ب — الشاهد (ق١١-١٧-١٠ · قواعد v3.18 ١١): قبل حذف حساب الدخول يكتب الحساب أنه حُذف — بعدها ترفض القواعد كل كتابة باسمه (جهاز ثانٍ ما زال داخلًا · كتابة متأخرة)، والمالك يعرف من زال فيكنس بقاياه. يُكتب آخرًا: لو كُتب أولًا ثم توقف الحذف لبقي حساب حيّ موقوفًا.
    await need('your account record', async function(){ const sd = await mpData.suspensions.get(uid); if (!alive()) throw GONE; if (sd && sd.exists) return; /* شاهدي من محاولة سابقة، أو إيقاف المالك (يوقف كتابته أصلًا — لا شاهد فوقه) */ try{ await mpData.suspensions.markDeleted(uid); }catch(e){ if (String((e && e.code) || '') !== 'permission-denied') throw e; mpSwallow(e, 'delete · marker refused by the rules'); /* المراجعة ٢٦ (قيس): قواعد لم تُنشر فيها فقرة الشاهد بعد ترفض كتابته — الحذف يمضي كما كان قبلها، لا يتوقف وبياناته قد زالت. (بقواعدها لا يُرفض إلا لحساب أُوقف للتوّ — وهو موقوف الكتابة أصلًا.) */ } });
    if (must.length){ stop('left', must); return; }
    // ٥ — حساب المصادقة
    if (!alive()) throw GONE;
    try{ await mpData.auth.deleteSelf(); }catch(e){ mpSwallow(e, 'delete · sign-in account'); const login = String((e && e.code) || '') === 'auth/requires-recent-login'; if (login) __delReauthAt = 0; /* التأكيد انتهت مدته عند المزوّد: الإعادة تسأل كلمة المرور */ /* الشاهد يبقى (ق١١-١٧-١٣ — المراجعة ٢٦ قاست): سحبه عند ردٍّ ضاع والحذف وقع فعلًا كان يعيد الجهاز الثاني يكتب. بقاؤه ليس فخًّا: «Try again» تُكمل، وإعادة الدخول تُتمّ حذف حساب الدخول (mpGoneFinish) */
      stop('auth', null, { small: small(), login: login }); return; }
    try{ localStorage.removeItem('mp_del_left_' + uid); }catch(_){ }
    if (currentUser && currentUser.uid !== uid) return; /* حساب آخر دخل وطلب حذف حساب الدخول في الطريق: شاشة «Account deleted» ليست له (المراجعة ٢٤ — قيس) */
    { const t = document.getElementById('delDoneText'); if (t) t.innerHTML = !small() ? 'Your account and all your data were permanently deleted.<br>Your nickname is now free for anyone to use.<br>Thank you for trying MyPickz.'
        : 'Your account and your data were permanently deleted.<br>' + ((__some || carry) ? 'Some small records (such as a bookmark, a follow, a view or a request) may not have been removed.' : (__left + ' small record' + (__left === 1 ? '' : 's') + ' (such as a bookmark, a follow, a view or a request) could not be removed right now.')) + '<br>Your nickname is now free for anyone to use.<br>Thank you for trying MyPickz.'; }
    delStep(3); openModalById('delBackdrop'); /* قيس (الكود القديم والجديد): معالج الخروج يغلق كل النوافذ عند زوال الحساب — فلم تُرَ شاشة النهاية قط. تُفتح هنا، ومعالج الخروج يُبقي نافذة الحذف وهي على خطوتها الثالثة */
  }catch(e){
    if (e === GONE) return; /* خرج صاحبها أو دخل غيره: لا رسالة لغير صاحبها */
    mpSwallow(e, 'delete'); stop('odd', mpErrText(e));
  } finally { if (mpDelRun === run) mpDelFlag(false); }
}
let delCurStep = 1;
function delBack(){ /* ب-٢-٢-أ٢ (v3 · ١٢): Back بالخطوة ٢ يعود إلى ١ · بالخطوة ١ يغلق (فيعود إلى Settings) */ /* r120: والحذف جارٍ لا رجوع ولا إغلاق — delStep و closeModalById يصدّان */ if (delCurStep === 2) delStep(1); else closeModalById('delBackdrop'); }
function delStep(n){
  if (mpDeleting && n !== 3) return; /* r120 (المراجعة ٢٣): والحذف جارٍ لا تتبدّل الخطوة إلا إلى نهايتها */
  delCurStep = n; const bk = document.getElementById('delBackBtn'); if (bk) bk.classList.toggle('hidden', n === 3);
  [1,2,3].forEach(i => { document.getElementById('delStep' + i).style.display = (i === n) ? '' : 'none'; document.getElementById('delDot' + i).classList.toggle('on', i <= n); });
  if (n === 2){ const w = document.getElementById('delWord'); w.value = ''; setTimeout(() => w.focus(), 50); const b = document.getElementById('delGo'); if (b) b.textContent = 'Delete my account forever'; checkDelWord(); /* الكلمة مُسحت: الزر يعود معطّلًا حتى تُكتب — بعد محاولة توقفت كان يبقى مفعَّلًا بلا كلمة */ const l = document.getElementById('delLeft'); if (l){ l.style.display = 'none'; l.textContent = ''; } /* r120 (ق١١-١٧-٠٦): دخول جديد إلى الخطوة يبدأ نظيفًا — لا «Try again» ولا قائمة من محاولة سابقة */ }
}
function checkDelWord(){ // ر٥٩: المطابقة تفعّل الزر — وجولة التدقيق أثبتت سطور الحذف الذاتي قائمة بالقواعد الحية أصلًا (لا شرط نشرة)
  const w = document.getElementById('delWord');
  const b = document.getElementById('delGo'); if (mpDeleting) return; /* r120 (المراجعة ٢٣ — قيس): الكتابة في الحقل والحذف جارٍ كانت تعيد الزر مفعَّلًا */
  if (b) b.disabled = String((w && w.value) || '').trim().toUpperCase() !== 'DELETE';
}

let signUpInProgress = false; // يمنع فحص onAuthStateChanged من إظهار نافذة اسم زائفة قبل اكتمال حجز الاسم أثناء التسجيل
let nicknameFlowActive = false; // يمنع تداخل حلقتي اختيار الاسم

async function doSignUp(){
  // خ١-ب: بوضع الدخول حقل الاسم مخفي — أول ضغطة على "New Account" تبدّل النافذة لوضع التسجيل بدل أن تفشل
  if (document.getElementById('authNickname').style.display === 'none'){ openAuthModal('signup'); return; }
  mpTrack.hit('signup_start');
  const nickname = document.getElementById('authNickname').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  if (!nickname || !/^[A-Za-z0-9_-]{3,24}$/.test(nickname)){
    errEl.textContent = 'Username: 3–24 letters, numbers, _ or - only';  // ر٦٣: قيد الأحرف — يُغلق باب الحقن من جذره
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !pass || pass.length < 8){ /* r98 (ما كشفته محطة doSignUp): الرسالة كانت تقول «valid email» ولا تفحص الشكل — فيصل الخطأ من المزوّد بلا رسالة واضحة */
    errEl.textContent = 'Enter a valid email and a password of 8+ characters';
    return;
  }
  const key = nickname.toLowerCase();
  try{
    const nickDoc = await mpData.nicknames.get(key);
    if (nickDoc.exists){
      errEl.textContent = 'This username is already taken — try another';
      return;
    }
  }catch(e){
    mpSwallow(e, 'sign-up'); /* r100-هـ */
    errEl.textContent = 'Could not verify username — try again';
    return;
  }
  signUpInProgress = true;
  try{
    const cred = await mpData.auth.signUp(email, pass);
    const newUid = cred.user.uid;
    // بعد إنشاء الحساب، نحجز اسم المستخدم فورًا كجزء من نفس العملية — نستخدم newUid مباشرة (مضمون)، لا currentUser العام (قد لا يتحدّث فورًا)
    // withAuthRetry: أول كتابة بعد createUser قد تُرفض عابرًا (permission-denied) قبل التقاط Firestore لتوكن الحساب الجديد —
    // نفس التسابق المعالَج بالقراءات؛ كان هنا بلا حماية وبـcatch صامت ⇒ حسابات تنتهي بلا اسم رغم إدخاله (مكتشَف بالدفعة ٢)
    let nicknameSaved = false;
    let step = 'nicknames';
    try{
      logTiming('[SIGNUP] createUser OK uid=' + newUid.slice(0,6) + ' — writing nickname "' + nickname + '"');
      await withAuthRetry(() => mpData.nicknames.set(key, { uid: newUid, nickname }));
      logTiming('[SIGNUP] nicknames write OK'); step = 'userLists';
      await withAuthRetry(() => mpData.userLists.merge(newUid, { nickname }));
      logTiming('[SIGNUP] userLists write OK'); step = 'users';
      await withAuthRetry(() => mpData.users.merge(newUid, { nickname }));
      logTiming('[SIGNUP] users write OK');
      userListData.nickname = nickname; // مزامنة الذاكرة المحلية فورًا (loadUserList قد سبقت الكتابة)
      nicknameSaved = true;
      updateUserUI();                   // الشارة تُرسم قبل معرفة الاسم، وenforceNickname يخرج مبكرًا أثناء التسجيل
    }catch(e){
      logTiming('[SIGNUP] ❌ FAILED at ' + step + ': ' + (e && e.code) + ' — ' + (e && e.message));
      console.warn('Nickname reservation failed at sign-up:', e && e.code, e);
    }
    signUpInProgress = false;
    closeAuthModal(true);
    showToast(nicknameSaved ? 'Account created ✓' : 'Account created — please choose a username');
    if (!nicknameSaved){
      await enforceNickname(); // شبكة الأمان بنفس الجلسة، لا بعد التحديث — تسبق النبذة حتى لا تتراكب النافذتان
    }
  mpTrack.hit('signup_done');
    openHelpAfterSignUp();
    mpData.statsUsers.bumpUsers().catch(()=>{});
  }catch(e){
    signUpInProgress = false;
    errEl.textContent = authErrorMessage(e);
  }
}
