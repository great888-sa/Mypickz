// MyPickz — tests/tools/shots.js (r110 · ١١ نوفمبر ٢٠٢٦ · ق١١-١١-٠٢: أدوات المنفِّذ داخل المستودع)
// فحص بمتصفح حقيقي (Chromium بعرض ٣٩٠) لمحرّر الخطة في شكليه: ضغط فعلي على أبواب الإضافة وأفعال صف المحطة وصف النهاية، ولقطات الشكلين.
// ما لا تراه الرحلة (jsdom): أن الزر يُضغط فعلًا في موضعه، وأن الصف لا يتجاوز عرض الهاتف. لا يدخل سير GitHub (يحتاج Playwright في بيئة المنفِّذ).
// الاستعمال:  node tests/tools/shots.js <مجلد اللقطات>      (PLAYWRIGHT=/path/to/playwright إن لم يكن في /opt/node-tools)
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'tests', '.shots')); fs.mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8'));
let html = cfg.parts.filter(p => p !== '92-init.js').map(p => fs.readFileSync(path.join(ROOT, 'src', p), 'utf8')).join('');
html = html.replace(/<link[^>]+(fonts\.googleapis|cdnjs)[^>]*>/g, '').replace(/<script src="https:[^"]+"[^>]*><\/script>/g, '');
const pageFile = path.join(OUT, 'page.html'); fs.writeFileSync(pageFile, html);
const results = []; const check = (name, cond, why) => { results.push({ name, ok: !!cond, why: cond ? '' : String(why || '') }); console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (cond ? '' : '  →  ' + why)); };

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, offline: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + pageFile); await page.waitForTimeout(400);
  const shot = async name => { await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('show'); }); await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, name) }); };
  const wide = async label => { const w = await page.evaluate(() => { const bad = []; document.querySelectorAll('#tbBody .tb-acts, #tbBody .tb-adds, #tbBody .chiprow.tb-top, #tbBody .tr-leg, #tbBody .tr-stay, #tbBody .tb-foot').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.right > window.innerWidth + 1 || r.left < -1)) bad.push(el.className + ' ' + Math.round(r.left) + '…' + Math.round(r.right)); if (/auto|scroll/.test(getComputedStyle(el).overflowX)) return; /* صف شرائح يُمرَّر أفقيًّا بتصميمه — ما وراء حافته ليس تجاوزًا */ el.querySelectorAll('button').forEach(b => { const q = b.getBoundingClientRect(); if (q.width && q.right > window.innerWidth + 1) bad.push('button “' + b.textContent.trim().slice(0, 14) + '” right ' + Math.round(q.right)); }); }); return { sw: document.documentElement.scrollWidth, bad: bad }; }); check(label + ' · لا شيء يتجاوز عرض ٣٩٠', w.bad.length === 0, JSON.stringify(w)); };

  /* ── العالم: مستخدم ومدينة بأماكن مثبَّتة؛ الكتابة إلى ذاكرة الصفحة ── */
  await page.evaluate(async () => {
    document.body.classList.remove('auth-pending'); const tb = document.getElementById('mpTimingBox'); if (tb) tb.style.display = 'none';
    currentUser = { uid: 'uTESTTESTTESTTESTTESTTEST01', email: 'o@x' };
    userListData = { customCities: [{ id: 'hs1', name: 'Montreux', country: 'Switzerland', lat: 46.43, lng: 6.91 }], customCountries: [], nickname: 'sara', cityPlaceCounts: {}, following: [], placeBookmarks: {} };
    const mk = (id, name, lat, lng, extra) => Object.assign({ id, name, url: 'https://maps.app.goo.gl/' + id, area: 'Vernex', geo: { lat, lng } }, extra || {});
    window.__doc = { ownerId: currentUser.uid, cityId: 'hs1', cityName: 'Montreux', public: false, sharedWith: [], catsV: CATS_VERSION, categories: { cafe: { active: true, places: [mk('a1', 'Amorino Montreux', 46.433, 6.911), mk('a2', 'Le Palais Oriental', 46.4335, 6.9125)] }, museums: { active: true, places: [mk('m1', 'Château de Chillon', 46.4142, 6.9275)] }, parks: { active: true, places: [mk('p1', 'Quai des Fleurs', 46.4305, 6.9105)] }, train_stations: { active: true, places: [mk('t1', 'Montreux station', 46.4359, 6.9105)] } } };
    mpData.cityLists.get = async () => JSON.parse(JSON.stringify(window.__doc)); mpData.cityLists.catDoc = async (u, c, k) => JSON.parse(JSON.stringify(window.__doc.categories[k] || null));
    window.__trips = {}; mpData.trips.save = async (t) => { window.__trips[t.id] = JSON.parse(JSON.stringify(t)); }; mpData.trips.remove = async (id) => { delete window.__trips[id]; };
    tripsLoaded = true; userTrips = [];
    cityListCountry = 'Switzerland'; cityListCityId = 'hs1'; placesSource = 'mine'; plView = 'list'; myCityListLoadedFor = null; myCityListData = null;
    try{ loadCategoryTemplate(); }catch(e){} try{ switchTab('Places'); }catch(e){} await loadMyCityList('hs1'); await new Promise(r => setTimeout(r, 200));
  });
  const keys = await page.evaluate(async () => { const rows = await tbLoadPlaces('hs1', 'mine'); return rows.map(p => p.key + ' · ' + p.name); });
  check('العالم: أماكن المدينة مقروءة للمنتقي (' + keys.length + ')', keys.length >= 5, JSON.stringify(keys));
  const K = name => (keys.find(k => k.indexOf(name) >= 0) || '').split(' · ')[0];

  /* ── ١ · Setup في الشكلين ── */
  await page.evaluate(async () => { await openTripBuilder({ cityId: 'hs1', dayPlan: true }); }); await shot('01-setup-in-the-city.png');
  const s1 = await page.locator('#tbBody .tb-door:has-text("Pick places in Montreux")').count();
  await page.evaluate(() => tbCloseNow(false));
  await page.evaluate(async () => { await openTripBuilder({ cityId: 'hs1', dayPlan: true, dayTrip: true }); }); await shot('02-setup-day-trip.png');
  const s2 = await page.locator('#tbBody .tb-door:has-text("Pick places in Montreux")').count();
  check('Setup: باب «Pick places in Montreux» في الشكلين', s1 === 1 && s2 === 1, s1 + ' / ' + s2);

  /* ── ٢ · رحلة اليوم: الاختيار من Setup بضغط حقيقي → البناء → المحرّر ── */
  await page.click('#tbBody .tb-door:has-text("Pick places in Montreux")'); await page.waitForTimeout(300);
  for (const n of ['Château de Chillon', 'Amorino Montreux', 'Quai des Fleurs']){ await page.evaluate(k => tbTogglePick(k, true, 'hs1'), K(n)); }
  await page.evaluate(() => { tbPickDone(); TB.cities[0].stay = { name: 'Montreux station', geo: { lat: 46.4359, lng: 6.9105 } }; tbSetDT('arrival', 'time', '09:00'); tbRender(); });
  await page.click('#tbBody button:has-text("Add the stops")'); await page.waitForTimeout(400);
  await page.evaluate(() => { tbSetTripName('Chillon & the lake'); tbRender(); window.scrollTo(0, 0); const m = document.querySelector('#tripBuildBackdrop .modal'); if (m) m.scrollTop = 0; });
  const stops0 = await page.evaluate(() => tbDTDay().stops.map(e => e.name));
  check('رحلة اليوم: ما أُشّر في Setup صار محطات بترتيب التأشير', JSON.stringify(stops0) === JSON.stringify(['Château de Chillon', 'Amorino Montreux', 'Quai des Fleurs']), JSON.stringify(stops0));
  await shot('03-day-trip-editor-top.png'); await wide('محرّر رحلة اليوم');
  const acts = async () => page.evaluate(() => Array.from(document.querySelectorAll('#tbBody .tb-acts')).map(r => Array.from(r.querySelectorAll('button')).map(b => b.textContent.trim())));
  const a1 = await acts(); check('رحلة اليوم: صف الأفعال ▲ ▼ · optional · Add again · ✕ على كل محطة', a1.length === 3 && a1.every(r => JSON.stringify(r) === JSON.stringify(['▲', '▼', 'optional', 'Add again', '✕'])), JSON.stringify(a1));
  await page.click('#tbBody .tb-acts >> nth=0 >> text=Add again'); await page.waitForTimeout(250);
  check('رحلة اليوم: ضغط «Add again» يضيف نسخة في آخر المسار', (await page.evaluate(() => tbDTDay().stops.map(e => e.name))).join('|') === 'Château de Chillon|Amorino Montreux|Quai des Fleurs|Château de Chillon', '');
  await page.click('#tbBody .tb-acts >> nth=3 >> text=✕'); await page.waitForTimeout(300); await page.click('#sheetOk'); await page.waitForTimeout(300);
  check('رحلة اليوم: ضغط ✕ ثم تأكيد الورقة يحذف النسخة', (await page.evaluate(() => tbDTDay().stops.length)) === 3, '');
  await page.click('#tbBody .tb-acts >> nth=1 >> text=▲'); await page.waitForTimeout(200);
  check('رحلة اليوم: ضغط ▲ يرفع المحطة الثانية', (await page.evaluate(() => tbDTDay().stops[0].name)) === 'Amorino Montreux', '');
  await page.click('#tbBody .tb-acts >> nth=0 >> text=▼'); await page.waitForTimeout(200);
  await page.click('#tbBody .tb-acts >> nth=2 >> text=optional'); await page.waitForTimeout(200);
  check('رحلة اليوم: ضغط optional يعلّم المحطة', (await page.evaluate(() => tbDTDay().stops[2].optional)) === true, '');
  /* البابان */
  await page.click('#tbBody .chiprow.tb-top >> text=＋ Add places'); await page.waitForTimeout(300);
  const pk1 = await page.evaluate(() => ({ pick: TB.pick, done: document.getElementById('tbBody').innerHTML.indexOf('tbPickDone()') >= 0 })); await page.evaluate(() => { tbPickCancel(); });
  await page.evaluate(() => { const d = document.querySelector('#tbBody .tb-adds'); if (d) d.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(150);
  await page.click('#tbBody .tb-adds .tb-door'); await page.waitForTimeout(300);
  const pk2 = await page.evaluate(() => ({ pick: TB.pick, done: document.getElementById('tbBody').innerHTML.indexOf('tbPickDone()') >= 0 })); await shot('04-the-picker-from-either-door.png'); await page.evaluate(() => { tbPickCancel(); });
  check('رحلة اليوم: الشريحة أعلى والباب العريض تحت آخر محطة يفتحان المنتقي نفسه', pk1.pick === 'hs1' && pk1.done && pk2.pick === 'hs1' && pk2.done, JSON.stringify([pk1, pk2]));
  /* صف النهاية: لا عودة تلقائية */
  const noEnd = await page.evaluate(() => ({ end: !!document.querySelector('#tbBody .tr-stay.end'), add: !!document.querySelector('#tbBody .tr-end-add'), est: document.querySelectorAll('#tbBody .tr-est').length, legs: document.querySelectorAll('#tbBody .tr-leg').length }));
  check('رحلة اليوم: لا عودة تلقائية — ثلاث أرجل بتقديرها وصف «＋ End point»', !noEnd.end && noEnd.add && noEnd.legs === 3 && noEnd.est === 3, JSON.stringify(noEnd));
  await page.evaluate(() => { const d = document.querySelector('#tbBody .tr-end-add'); if (d) d.scrollIntoView({ block: 'center' }); }); await shot('05-day-trip-route-estimates-and-end-point-row.png');
  await page.click('#tbBody .tr-end-add'); await page.waitForTimeout(300); await shot('06-end-point-sheet.png');
  await page.click('#dashBody button:has-text("Back to start")'); await page.waitForTimeout(300);
  const withEnd = await page.evaluate(() => ({ end: (document.querySelector('#tbBody .tr-stay.end') || {}).textContent || '', legs: document.querySelectorAll('#tbBody .tr-leg').length, dirty: tbDirty(), stored: tbDTRoute().end }));
  check('رحلة اليوم: ضغط «Back to start» يرسم صف العودة ورِجلًا رابعة — في الجلسة', /Montreux station/.test(withEnd.end) && /back to start/.test(withEnd.end) && withEnd.legs === 4 && withEnd.dirty && withEnd.stored === 'start', JSON.stringify(withEnd));
  await page.fill('#tbBody .tr-leg >> nth=0 >> input[type=number]', '14'); await page.keyboard.press('Tab'); await page.waitForTimeout(250);
  const typed = await page.evaluate(() => ({ reset: document.querySelectorAll('#tbBody .tr-reset').length, est: document.querySelectorAll('#tbBody .tr-est').length, status: (document.querySelector('#tbBody .tr-status') || {}).textContent || '' }));
  check('رحلة اليوم: كتابة ١٤ دقيقة تغلب التقدير (↺ يظهر) والحالة «times are approximate» ما دام تقدير', typed.reset === 1 && typed.est === 3 && /times are approximate/.test(typed.status), JSON.stringify(typed));
  await page.evaluate(() => { const d = document.querySelector('#tbBody .tr-stay.end'); if (d) d.scrollIntoView({ block: 'center' }); }); await shot('07-day-trip-with-end-and-a-typed-leg.png'); await wide('رحلة اليوم بنهايتها');
  await page.click('#tbBody .tb-foot >> text=Save as draft'); await page.waitForTimeout(500);
  const dr = await page.evaluate(() => ({ open: document.getElementById('tripBuildBackdrop').classList.contains('show'), dirty: tbDirty(), saved: Object.keys(window.__trips).length, status: (tbTrip() || {}).status }));
  check('ضغط «Save as draft»: كُتب مسودةً والمحرّر باقٍ مفتوحًا نظيفًا', dr.open && !dr.dirty && dr.saved === 1 && dr.status === 'draft', JSON.stringify(dr));
  const tripId = await page.evaluate(() => tbTrip().id); await page.evaluate(() => tbCloseNow(true));

  /* ── ٣ · داخل المدينة ── */
  await page.evaluate(async () => { await openTripBuilder({ cityId: 'hs1', dayPlan: true }); await tbOpenPick('hs1'); });
  for (const n of ['Amorino Montreux', 'Le Palais Oriental', 'Château de Chillon', 'Quai des Fleurs']){ await page.evaluate(k => tbTogglePick(k, true, 'hs1'), K(n)); }
  await page.evaluate(async () => { tbPickDone(); TB.cities[0].stay = { name: 'Montreux station', geo: { lat: 46.4359, lng: 6.9105 } }; tbBuildGo(); await new Promise(r => setTimeout(r, 200)); tbSetTripName('A day in Montreux'); tbRender(); const m = document.querySelector('#tripBuildBackdrop .modal'); if (m) m.scrollTop = 0; });
  await shot('08-in-the-city-editor-top.png'); await wide('محرّر داخل المدينة');
  const a2 = await acts(); const core = r => r.filter(x => x !== '▲' && x !== '▼');
  check('داخل المدينة: صف الأفعال Move · ⚠ Alert · Add again · ✕ على كل محطة (و▲▼ حين تتعدد محطات الفترة)', a2.length >= 3 && a2.every(r => JSON.stringify(core(r)) === JSON.stringify(['Move', '⚠ Alert', 'Add again', '✕']) || JSON.stringify(core(r)) === JSON.stringify(['⇄', 'Move', '⚠ Alert', '✕'])), JSON.stringify(a2));
  await page.click('#tbBody .tb-acts >> nth=0 >> text=Add again'); await page.waitForTimeout(300);
  const again = await page.evaluate(() => ({ show: document.getElementById('tripMoveBackdrop').classList.contains('show'), step: __tm && __tm.step })); await shot('09-in-the-city-add-again-asks-where.png'); await page.evaluate(() => { try{ tripMoveDone(false); }catch(_){} });
  check('داخل المدينة: ضغط «Add again» يفتح ورقة «المكان نفسه مرة أخرى» مباشرة', again.show && again.step === 'repeat', JSON.stringify(again));
  await page.click('#tbBody .chiprow.tb-top >> text=＋ Add places'); await page.waitForTimeout(300); const pk3 = await page.evaluate(() => TB.pick); await page.evaluate(() => tbPickCancel());
  await page.evaluate(() => { const d = document.querySelector('#tbBody .tb-adds'); if (d) d.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(150); await shot('10-in-the-city-add-door-under-the-last-stop.png');
  await page.click('#tbBody .tb-adds .tb-door'); await page.waitForTimeout(300); const pk4 = await page.evaluate(() => TB.pick); await page.evaluate(() => tbPickCancel());
  check('داخل المدينة: الشريحة أعلى والباب العريض تحت آخر محطة يفتحان المنتقي نفسه', pk3 === 'hs1' && pk4 === 'hs1', pk3 + ' / ' + pk4);
  const order = await page.evaluate(() => { const b = document.getElementById('tbBody'); const y = sel => { const el = b.querySelector(sel); return el ? el.getBoundingClientRect().top : null; }; const cards = b.querySelectorAll('.tb-card'); return { chip: y('.chiprow.tb-top'), lastCard: cards.length ? cards[cards.length - 1].getBoundingClientRect().top : null, door: y('.tb-adds'), tray: y('.trip-tray'), foot: y('.tb-foot') }; });
  check('داخل المدينة: الترتيب على الشاشة — الشريحة ← المحطات ← الباب العريض ← الصينية ← الأزرار', order.chip < order.lastCard && order.lastCard < order.door && order.door < order.tray && order.tray < order.foot, JSON.stringify(order));
  await page.evaluate(() => tbCloseNow(false));

  /* ── ٤ · العرض المحفوظ: ＋ Add places بجوار ✏️ Edit ── */
  await page.evaluate(async (id) => { userTrips = [JSON.parse(JSON.stringify(window.__trips[id]))]; userTrips.forEach(tripNormalize); currentTripId = id; switchTab('Trips'); await openTripDetail(id); }, tripId); await page.waitForTimeout(400);
  await page.evaluate(() => { const f = document.querySelector('.trip-foot'); if (f) f.scrollIntoView({ block: 'center' }); }); await shot('11-saved-plan-edit-and-add-places.png');
  await page.click('.trip-foot >> text=＋ Add places'); await page.waitForTimeout(500);
  const fv = await page.evaluate(() => ({ open: document.getElementById('tripBuildBackdrop').classList.contains('show'), pick: TB && TB.pick, dirty: TB ? tbDirty() : null, tab: currentTab })); await shot('12-saved-plan-add-places-opens-the-picker.png');
  check('العرض المحفوظ: ضغط «＋ Add places» يفتح المحرّر والمنتقي مفتوح (لا انتقال إلى Places)', fv.open && fv.pick === 'hs1' && fv.dirty === false && fv.tab === 'Trips', JSON.stringify(fv));
  await page.evaluate(() => { tbPickCancel(); tbCloseNow(false); });

  check('لا خطأ في الصفحة طوال الفحص', errors.length === 0, errors.slice(0, 3).join(' ‖ '));
  await browser.close();
  const bad = results.filter(r => !r.ok).length; console.log('\n' + (bad ? '❌ BROWSER CHECK FAILED (' + bad + ') of ' + results.length : '✅ BROWSER CHECK PASSED — ' + results.length + ' checks · shots in ' + OUT));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FAIL  harness → ' + (e && e.stack || e)); process.exit(1); });
