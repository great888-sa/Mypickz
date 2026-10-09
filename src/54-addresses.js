// ===== خ٢ (٢٧ أغسطس ٢٠٢٦، r3 بالتحسينات المعتمدة): وجهة العناوين الشخصية — المشهدان ٦/و و٦/و٢ =====
// المصدر الوحيد: userPrivatePlaces/{uid}_{cityId} عبر النواة · لا علم عام ولا مشاركة ولا زر رحلة
// مدينة العناوين مستقلة عن مدينة التصفح بالأماكن (استخدام يومي) — تُحفظ بمستند المستخدم (addrCity)
let addrData = {};          // { cityId: { catId: { active, places:[{id,name,url,note,area}] } } }
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
  if (addrLoaded && !force){ renderAddresses(); return; }
  const idx = (userListData && userListData.privateCities) || [];
  const cities = Array.from(new Set(idx)).filter(Boolean);
  addrData = {};
  await Promise.all(cities.map(async c => { try{ addrData[c] = await mpData.privatePlaces.get(currentUser.uid, c); }catch(e){ addrData[c] = {}; } }));
  addrCities = cities.filter(c => addrCountOf(c) > 0);
  // المدينة المعروضة: المحفوظة، وإلا مدينة أكثر العناوين
  const saved = userListData && userListData.addrCity;
  if (saved && addrCities.includes(saved)) addrCurrentCity = saved;
  else if (!addrCities.includes(addrCurrentCity)) addrCurrentCity = addrCities.slice().sort((a, b) => addrCountOf(b) - addrCountOf(a))[0] || null;
  addrLoaded = true;
  renderAddresses();
}
function cityNameOf(id){ const c = myListAllCities().find(x => x.id === id) || allCities().find(x => x.id === id); return c ? c.name : id; }
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
  const inSameCountry = myListAllCities().filter(c => c.country.toLowerCase() === country.trim().toLowerCase());
  let existing = inSameCountry.find(c => pickerNormalize(c.name) === pickerNormalize(name));
  if (!existing){ const near = pickerNearest(name, inSameCountry); if (near && confirm('Did you mean ' + near.name + '? OK to use it, Cancel to add "' + name.trim() + '" as a new city.')) existing = near; }
  let id = existing ? existing.id : null;
  if (!id){
    const __row = await gazFindCity(country.trim(), name); // ز-١-ج-٢: المعجم وحده — لا مدينة يدوية
    if (!__row){ showToast('City not found in the list — pick one of the suggestions'); return; }
    id = String(__row.id); const __dup = myListAllCities().find(function(c){ return c.id === id; }); if (__dup){ existing = __dup; }
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
function countryOfCity(cityId){ const c = myListAllCities().find(x => x.id === cityId) || allCities().find(x => x.id === cityId); return c ? c.country : null; }
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
  const actx = document.getElementById('addrCtx'); if (actx) actx.innerHTML = '<b>My addresses</b>' + (cityId ? ' · ' + escapeHtml(cityNameOf(cityId)) : '');
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
      let __acards = ''; const __aright = '<button type="button" class="pg-add go" onclick="openAddrModal(\'' + cityId + '\',\'' + cat.id + '\')" title="Add under ' + escapeHtml(cat.name) + '">＋ Add</button>'; // r72r-1: العناوين بالبطاقة الموحَّدة (وضع address) — بلا أيقونة
      places.forEach((p, i) => {
        const aActions = [
          { html: 'Maps ↗', href: p.url, title: 'Open in Google Maps', attrs: 'data-mpsrc="app" data-mpcat="' + cat.id + '" data-mppersonal="1"' },
          p.phone ? { html: '📞', href: 'tel:' + String(p.phone).replace(/[^+\d]/g, ''), title: 'Call' } : null,
          { html: '📤', on: "sendAddr('" + cityId + "','" + cat.id + "'," + i + ")", title: 'Send via MyPickz' },
          { html: '✏️', on: "openAddrModal('" + cityId + "','" + cat.id + "'," + i + ")", title: 'Edit' }
        ];
        __acards += placeCardHtml({ id: p.id || p.url, name: p.name || cat.name, url: p.url, area: p.phone ? String(p.phone) : '', note: p.note }, 'address', { actions: aActions, open: true });
      });
      html += placeGroupHtml(cat.name, places.length, __aright, __acards);
    });
  }
  document.getElementById('addrBody').innerHTML = html;
}

// إرسال العنوان خارج التطبيق بتوقيع (قرار إرسال لا مشاركة بيانات) — مشاركة النظام، وإلا نسخ للحافظة
async function sendAddr(cityId, catId, index){
  const cat = privateCategoryList().find(c => c.id === catId); const p = ((addrData[cityId] || {})[catId] || {}).places[index]; if (!p) return;
  const text = `${cat ? cat.name : ''}${p.name ? ': ' + p.name : ''} — ${cityNameOf(cityId)}${p.note ? ' · ' + p.note : ''}${p.phone ? ' · ' + p.phone : ''}\n${p.url}\nSent via MyPickz · mypickz.app`;
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
  const list = myListAllCities().filter(c => c.country);
  addrModalCity = list.some(c => c.id === selectedCityId) ? selectedCityId : (list.some(c => c.id === addrModalCity) ? addrModalCity : (list[0] ? list[0].id : null));
  delete __pk.addrModalCity;
  addrModalRenderCityPanel();
}
function addrModalRenderCityPanel(){
  const host = document.getElementById('addrModalCityHost'); if (!host) return;
  const cur = myListAllCities().find(c => c.id === addrModalCity);
  host.innerHTML = pickerRow({ id: 'addrModalCity', label: cur ? cur.name : 'Choose a city', placeholder: 'Type a city…', onPick: 'addrModalPickCity', canAdd: true, onAdd: 'addrModalAddCity()', emptyText: 'No city matches — add it below',
    items: myListAllCities().filter(c => c.country).map(c => ({ id: c.id, name: c.name, icon: countryFlag(c.country) || '', selected: c.id === addrModalCity })) });
}
function addrModalPickCity(id){ addrModalCity = id; pickerRowClose('addrModalCity'); addrModalRenderCityPanel(); }
async function addrModalAddCity(){ await addAddrCity(); if (addrCurrentCity) addrFillCountries(addrCurrentCity); }
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
  document.getElementById('addrNote').value = existing.note || '';
  document.getElementById('addrPhone').value = existing.phone || '';
  document.getElementById('addrError').textContent = '';
  openModalById('addrBackdrop');
}
let cityDelCtx = null; // {cityId, from:'addr'|'places'}
async function openCityDeleteChooser(cityId, from){
  const isCustom = true; // ز-١-ج-٢: كل مدني ملكي (لا قياسية)
  const name = cityNameOf(cityId);
  cityDelCtx = { cityId: cityId, from: from, isCustom: isCustom };
  document.getElementById('cityDelTitle').textContent = '🗑 ' + name;
  document.getElementById('cityDelHint').textContent = 'Counting…';
  document.getElementById('cityDelSideBtn').textContent = '…';
  document.getElementById('cityDelFullBtn').style.display = isCustom ? '' : 'none';
  openModalById('cityDelBackdrop');
  // العدّادان: لا يحذف أحد وهو يجهل حجم ما يفقد (قرار المالك ٣٠ أغسطس) — قراءتان بفعل نادر
  const nList = await cityCountList(cityId), nAddr = await cityCountAddr(cityId);
  if (!cityDelCtx || cityDelCtx.cityId !== cityId) return;   // أُغلقت أو تغيّرت أثناء القراءة
  const plural = function(n, w){ return n + ' ' + w + (n === 1 ? '' : 's'); };
  document.getElementById('cityDelHint').textContent = isCustom
    ? plural(nList, 'place') + ' in My List · ' + plural(nAddr, 'address') + '. Choose what to delete.'
    : (from === 'addr' ? plural(nAddr, 'address') + ' here. This removes your own content only.'
                       : plural(nList, 'place') + ' here. This removes your own content only.');
  document.getElementById('cityDelSideBtn').textContent = (from === 'addr')
    ? 'Remove my addresses here (' + nAddr + ')'
    : 'Clear my list for this city (' + nList + ')';
  // المرجع ٦/أ: خيارات بالأسطح — الوجه الآخر يظهر زرًّا ثانيًا حين للمدينة محتوى فيه (قرار المالك ١ سبتمبر)
  const other = document.getElementById('cityDelSideBtn2');
  if (other){
    const n2 = (from === 'addr') ? nList : nAddr;
    other.style.display = n2 > 0 ? '' : 'none';
    other.textContent = (from === 'addr') ? 'Clear my list for this city (' + n2 + ')' : 'Remove my addresses here (' + n2 + ')';
  }
  document.getElementById('cityDelFullBtn').textContent =
    'Delete city everywhere — ' + plural(nList + nAddr, 'item') + ' · cannot be undone';
}
async function cityCountList(cityId){ // عدد أماكن قائمة المدينة (للطرف الآخر)
  try{ const d = await mpData.cityLists.get(currentUser.uid, cityId); if (!d || !d.categories) return 0;
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
  if (!confirm((from === 'addr' ? 'Remove your ' + n1 + ' address' + (n1 === 1 ? '' : 'es') + ' in ' : 'Clear your list of ' + n1 + ' place' + (n1 === 1 ? '' : 's') + ' in ') + cityNameOf(cityId) + '? This cannot be undone.')) return;
  closeModalById('cityDelBackdrop');
  if (from === 'addr'){
    try{ await mpData.privatePlaces.remove(currentUser.uid, cityId); }catch(e){}
    delete addrData[cityId];
    addrCities = addrCities.filter(c => c !== cityId);
    if (addrCurrentCity === cityId) addrCurrentCity = null;
    if (cityDelCtx.isCustom && (await cityCountList(cityId)) === 0) await removeMyListCity(cityId, { confirmed: true }); // منع الشبح (الخاصة فقط)
    showToast('Removed from Addresses');
    renderAddresses(); if (currentTab === 'Places') renderPlacesBody();
  } else {
    try{ await mpData.cityLists.remove(currentUser.uid, cityId); }catch(e){} try{ await syncCommunityProfile(); }catch(e){} // ر٧٢-أ-١د: إلغاء المحتوى بمدينة قياسية يزامن الملف العام أيضًا
    if (myCityListLoadedFor === cityId){ myCityListData = null; myCityListLoadedFor = null; }
    if (cityDelCtx.isCustom && (await cityCountAddr(cityId)) === 0){ await removeMyListCity(cityId, { confirmed: true }); }
    else if (myListCityId === cityId){ const rem = myListAllCities().filter(c => c.country === myListCountry && c.id !== cityId); myListCityId = rem.length ? rem[0].id : null; }
    showToast('Removed from My List');
    renderPlacesBody(); 
  }
}
async function cityDelFull(){
  const { cityId } = cityDelCtx || {}; if (!cityId) return;
  const nA = await cityCountAddr(cityId), nL = await cityCountList(cityId);
  if (!confirm('Delete ' + cityNameOf(cityId) + ' everywhere — ' + (nA + nL) + ' item' + (nA + nL === 1 ? '' : 's') + ' will be lost. This cannot be undone.')) return;
  closeModalById('cityDelBackdrop');
  try{ await mpData.privatePlaces.remove(currentUser.uid, cityId); }catch(e){}
  delete addrData[cityId];
  addrCities = addrCities.filter(c => c !== cityId);
  if (addrCurrentCity === cityId) addrCurrentCity = null;
  await removeMyListCity(cityId, { confirmed: true });
  renderAddresses(); if (currentTab === 'Places') renderPlacesBody();
}
async function removeAddrCity(cityId){
  // r18: المدينة كيان مشترك — حذفها يزيل عناوينها وقائمة أماكنها معًا، والتأكيد يقولها صراحة
  if (pendingCity && pendingCity.id === cityId){ pendingCity = null; delete addrData[cityId]; addrCities = addrCities.filter(c => c !== cityId); if (addrCurrentCity === cityId) addrCurrentCity = null; renderAddresses(); return; }
  openCityDeleteChooser(cityId, 'addr');
}
async function saveAddr(){
  const name = document.getElementById('addrName').value.trim();
  const url = document.getElementById('addrUrl').value.trim();
  const note = document.getElementById('addrNote').value.trim();
  const phone = document.getElementById('addrPhone').value.trim();
  const err = document.getElementById('addrError');
  err.textContent = '';
  if (!name){ err.textContent = 'Enter a name'; return; }
  if (!isGoogleMapsUrl(url)){ err.textContent = 'Paste a Google Maps link'; return; }
  const cityId = addrModalCity, catId = addrModalCat;
  if (!cityId){ err.textContent = 'Choose a city'; return; }
  const catsMap = addrData[cityId] || (addrData[cityId] = {});
  const entry = catsMap[catId] || (catsMap[catId] = { active: true, places: [] });
  const place = { id: 'p_' + Date.now().toString(36), name, url, note, phone, area: '' };
  if (addrEditRef && addrEditRef.cityId === cityId && addrEditRef.catId === catId){
    place.id = (entry.places[addrEditRef.index] || place).id || place.id;
    entry.places[addrEditRef.index] = place;
  } else {
    if (addrEditRef){ const old = addrData[addrEditRef.cityId][addrEditRef.catId]; old.places.splice(addrEditRef.index, 1);
      try{ await mpData.privatePlaces.setCategory(currentUser.uid, addrEditRef.cityId, addrEditRef.catId, old); }catch(e){} }
    entry.places.push(place);
  }
  try{
    await commitPendingCityIfNeeded(cityId); // r18: تخليد المدينة المعلقة مع حفظ أول عنوان
    await mpData.privatePlaces.setCategory(currentUser.uid, cityId, catId, entry);
    await mpData.userLists.addPrivateCity(currentUser.uid, cityId);
    if (userListData && !userListData.privateCities.includes(cityId)) userListData.privateCities.push(cityId);
    addrCurrentCity = cityId; if (userListData){ userListData.addrCity = cityId; mpData.userLists.merge(currentUser.uid, { addrCity: cityId }).catch(()=>{}); }
    closeModalById('addrBackdrop');
    showToast('Saved ✓');
    await loadAddresses(true);
  }catch(e){ err.textContent = 'Could not save — try again'; }
}
async function deleteAddr(cityId, catId, index){
  const entry = addrData[cityId] && addrData[cityId][catId]; if (!entry) return;
  if (!confirm('Delete this address?')) return;
  entry.places.splice(index, 1);
  try{ await mpData.privatePlaces.setCategory(currentUser.uid, cityId, catId, entry); showToast('Deleted'); }catch(e){ showToast('Could not delete'); }
  await loadAddresses(true);
}

// خ١-ب: معاينة شاشات ٩ و١٠ (معطَّلة حتى ٢/ب و٢/د)
function openDeletePreview(){
  document.getElementById('delCntPlaces').textContent = Object.values((myCityListData && myCityListData.categories) || {}).reduce((a, c) => a + ((c.places || []).length), 0) || '—';
  document.getElementById('delCntTrips').textContent = (typeof userTrips !== 'undefined' && userTrips) ? userTrips.length : '—';
  document.getElementById('delCntFav').textContent = String(Object.keys(placeBmMap()).length + Object.keys(listBookmarksMap || {}).length + Object.keys(tripSavesMap || {}).length);
  delStep(1); openModalById('delBackdrop');
}
/* ر٥٩ · الحذف التسلسلي (القرار: تقديمه قبل الميداني — البند ١٣):
   الترتيب: سجلاتي على محتوى الآخرين بدفعاتها المربوطة (تُنقص عدّاداتهم، وبديل degraded عند غياب الأصل)
   ← متابعاتي ← محتواي (رحلات · قوائم مدن · عناوين) ← هويتي (الملف · حجز الاسم · السجل · المستند الأم)
   ← حساب المصادقة بإعادة التوثيق. لا صمت: أي توقف يظهر برسالته. */
async function doAccountDelete(){
  const btn = document.getElementById('delGo'); if (!btn || btn.disabled) return;
  if (!currentUser) return;
  const ok = await requestReauth();
  if (!ok){ showToast('Identity not confirmed — nothing was deleted'); return; }
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Deleting…';
  const uid = currentUser.uid;
  try{
    // ١ — سجلاتي على محتوى الآخرين (العدّادات تتراجع بالدفعة المربوطة)
    await ensureListBookmarks(); await ensureTripSaves();
    for (const listId of Object.keys(listBookmarksMap || {})){
      const r = listBookmarksMap[listId];
      try{ await mpData.bookmarks.toggleList(uid, r.ownerUid, r.cityId, false); }
      catch(e){ try{ await mpData.bookmarks.removeRecord(uid, listId); }catch(_){ } }
    }
    for (const tripId of Object.keys(tripSavesMap || {})){
      try{ await mpData.tripSaves.toggle(uid, tripId, false); }
      catch(e){ try{ await mpData.tripSaves.removeRecord(uid, tripId); }catch(_){ } }
    }
    // ٢ — متابعاتي
    try{
      const fids = await mpData.follows.mineAsFollower(uid);
      for (const id of fids){ try{ await mpData.follows.remove(id); }catch(_){ } }
    }catch(_){ }
    try{ await mpData.copies.removeMine(uid); }catch(_){ } // r72t (M4.26 ٢): سجلات النسخ (بلا إنقاص العدّادات — سكربت الصيانة يعيد اشتقاقها)
    try{ await mpData.requests.removeMine(uid); }catch(_){ }
    try{ await mpData.reports.removeMine(uid); }catch(_){ }
    // ٣ — محتواي: الرحلات (تُترك حفوظ الآخرين لها صفوف degraded بتصميمها) ثم قوائم المدن والعناوين لكل مدينة معروفة
    // ر٦٧ (صيد المحاكاة): الحذف بالاستعلام المالكي ∪ المحلي — القائمة المحلية قد تكون ناقصة (تحميل لم يكتمل · جهاز آخر)
    const tripIds = new Set((userTrips || []).map(t => t.id));
    try{ (await mpData.trips.byOwner(uid)).forEach(function(d){ tripIds.add(d.id); }); }catch(e){ mpSwallow(e, 'cascade'); }
    for (const id of tripIds){ try{ await mpData.trips.remove(id); }catch(_){ } }
    const cityIds = [...new Set(
      (typeof myListAllCities === 'function' ? myListAllCities() : []).map(c => c && c.id)
        .concat(((userListData && userListData.privateCities) || []))
        .filter(Boolean)
    )];
    try{ (await mpData.cityLists.byOwner(uid)).forEach(function(d){ const cid = String(d.id).split('_').slice(1).join('_'); if (cid && cityIds.indexOf(cid) < 0) cityIds.push(cid); }); }catch(e){ mpSwallow(e, 'cascade'); } // ر٦٧: ∪ استعلام المالك
    for (const cid of cityIds){
      try{ await mpData.cityLists.remove(uid, cid); }catch(e){ mpSwallow(e, 'cascade'); }
      try{ await mpData.privatePlaces.remove(uid, cid); }catch(_){ } // العناوين: قاعدتها بمعرّف المستند فلا استعلام — مرآة privateCities هي الفهرس (قيد r58)
    }
    // ٤ — هويتي (المستند الأم أخيرًا — المرايا والفهارس تسكنه)
    try{ await mpData.profiles.remove(uid); }catch(_){ }
    const nick = (userListData && userListData.nickname) || '';
    if (nick){ try{ await mpData.nicknames.remove(nick.toLowerCase()); }catch(e){ mpSwallow(e, 'cascade'); } }
    try{ await mpData.users.remove(uid); }catch(e){ mpSwallow(e, 'cascade'); }
    try{ await mpData.userLists.remove(uid); }catch(_){ }
    // ٥ — حساب المصادقة
    await mpData.auth.deleteSelf();
    delStep(3);
  }catch(e){
    btn.disabled = false; btn.textContent = label;
    showToast('Deletion stopped: ' + ((e && e.code) || 'error') + ' — nothing else was removed');
  }
}
function delStep(n){
  [1,2,3].forEach(i => { document.getElementById('delStep' + i).style.display = (i === n) ? '' : 'none'; document.getElementById('delDot' + i).classList.toggle('on', i <= n); });
  if (n === 2){ const w = document.getElementById('delWord'); w.value = ''; setTimeout(() => w.focus(), 50); }
}
function checkDelWord(){ // ر٥٩: المطابقة تفعّل الزر — وجولة التدقيق أثبتت سطور الحذف الذاتي قائمة بالقواعد الحية أصلًا (لا شرط نشرة)
  const w = document.getElementById('delWord');
  const b = document.getElementById('delGo');
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
  if (!email || !pass || pass.length < 8){
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
    mpData.stats.bumpUsers().catch(()=>{});
  }catch(e){
    signUpInProgress = false;
    errEl.textContent = authErrorMessage(e);
  }
}
