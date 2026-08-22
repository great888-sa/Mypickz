// MyPickz — tests/load.js
// قياس الكلفة المبرمَج (المحطة ١): جلسات حقيقية بمتصفح Chrome بلا واجهة على نسخة الاختبار.
// يعمل يدويًا فقط عبر .github/workflows/load.yml (workflow_dispatch) — لا يعمل مع الدفعات.
// القراءة الرسمية للأرقام من لوحة Firebase Usage بعد إغلاق الساعة؛ هذا السكربت يطبع ما يراه العميل فقط.
//
// متغيرات البيئة:
//   LT_SCENARIO   s1 | s2 | s3 | s4 | s5        (افتراضي s2)
//   LT_SESSIONS   عدد الجلسات (افتراضي 20، سقف صلب 25)
//   LT_ACCOUNTS   "email:pass,email:pass,..."  (من GitHub Secrets — لا يُطبع أبدًا)
//   LT_BASE       الرابط (افتراضي نسخة الاختبار)
//   CHROME_PATH   مسار Chrome (افتراضي /usr/bin/google-chrome)
'use strict';
const puppeteer = require('puppeteer-core');

const BASE = process.env.LT_BASE || 'https://test.mypickz.app/index-debug-test.html';
const SCENARIO = (process.env.LT_SCENARIO || 's2').toLowerCase();
const SESSIONS = Math.min(25, Math.max(1, parseInt(process.env.LT_SESSIONS || '20', 10)));
const DEADLINE_MS = 12 * 60 * 1000;           // سقف صلب: ١٢ دقيقة للتشغيلة كلها
const GAP_MS = 3000;                          // تباعد بين الجلسات المتتابعة (حدود المصادقة غير المعلَنة)
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const ACCOUNTS = (process.env.LT_ACCOUNTS || '').split(',').map(s => s.trim()).filter(Boolean)
  .map(s => { const i = s.indexOf(':'); return { email: s.slice(0, i), pass: s.slice(i + 1) }; });

const started = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function log(msg){ console.log('[' + new Date().toISOString().slice(11, 19) + '] ' + msg); }
function timeLeft(){ return DEADLINE_MS - (Date.now() - started); }

async function waitFor(page, fn, ms){
  const end = Date.now() + ms;
  while (Date.now() < end){
    try { if (await page.evaluate(fn)) return true; } catch(_){}
    await sleep(250);
  }
  return false;
}

async function openPage(browser){
  const ctx = await browser.createBrowserContext();   // تخزين منفصل لكل جلسة (كمستخدم جديد على جهازه)
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });
  page.on('response', r => { try { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url().replace(/[?#].*$/, '').slice(0, 120)); } catch(_){} });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // المحتوى خلف البوابة محمَّل حين تتوفر قاعدة البيانات والمدينة الحالية
  await waitFor(page, () => typeof db !== 'undefined' && db && typeof currentCityId === 'string', 20000);
  return { ctx, page, errors };
}

async function login(page, acc){
  await page.evaluate((e, p) => {
    document.getElementById('authEmail').value = e;
    document.getElementById('authPassword').value = p;
  }, acc.email, acc.pass);
  await page.evaluate(() => doSignIn());
  const ok = await waitFor(page, () => !!(firebase.auth().currentUser) && typeof currentUser !== 'undefined' && !!currentUser, 15000); // متغير الصفحة لا حالة المصادقة فقط
  if (!ok) throw new Error('auth-failed');
  await sleep(4000); // استعادة القوائم والرحلات وفحص الاسم
  return page.evaluate(() => (firebase.auth().currentUser || {}).email || null);
}

async function modalOpen(page, id){
  return page.evaluate(id => { const el = document.getElementById(id); return !!(el && el.classList.contains('show')); }, id); // النوافذ ثابتة الموضع: offsetParent دائمًا null
}

async function clickPlaces(page, n){
  return page.evaluate((n) => {
    const links = Array.from(document.querySelectorAll('a.place-link')).filter(a => a.offsetParent !== null).slice(0, n);
    for (const a of links){
      a.addEventListener('click', ev => ev.preventDefault(), { once: true }); // لا نفتح الرابط الخارجي
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
    return links.length;
  }, n);
}

async function closeSession(page){
  try { await page.evaluate(() => { try { mpTrack.closeSession(); } catch(_){} }); } catch(_){}
  await sleep(2500); // مهلة الدفعة الأخيرة
}

async function stats(page){
  try { return await page.evaluate(() => (mpTrack && mpTrack._stats) ? mpTrack._stats : null); } catch(_){ return null; }
}

// ---------- السيناريوهات ----------
async function s1(page){            // زائر حتى البوابة
  await sleep(5000);
}
async function s2(page, acc){       // الجلسة المتكررة الدنيا
  await login(page, acc);
  await page.evaluate(() => openMyListModal()); await sleep(2500);
  page.__checks = { mylist: await modalOpen(page, 'myListBackdrop') };
  await page.evaluate(() => openMyTripsModal()); await sleep(2500);
  page.__checks.trips = await modalOpen(page, 'myTripsBackdrop');
  await page.evaluate(() => { const b = document.querySelector('#myTripsBody button[onclick^="openTripDetail"]'); if (b) b.click(); });
  await sleep(2500);
}
async function s3(page, acc, revisit){   // جلسة الفضول (+ عودات في s4)
  await login(page, acc);
  const cities = await page.evaluate(() => allCities().slice(0, 4).map(c => c.id));
  for (const c of cities){ await page.evaluate(id => loadCity(id), c); await sleep(2000); }
  await page.evaluate(() => openCommunityModal()); await sleep(3000);
  await page.evaluate(() => switchCommunityTab('all')); await sleep(1500);
  const uids = await page.evaluate(() => (communityUsers || []).slice(0, 3).map(u => u.uid));
  let trips = [];
  for (const u of uids){
    await page.evaluate(id => viewCommunityUser(id), u); await sleep(3000);
    const t = await page.evaluate(() => Array.from(document.querySelectorAll('button[onclick^="openCommunityTrip"]')).slice(0, 2).map(b => b.getAttribute('onclick').match(/'([^']+)'/)[1]));
    trips = trips.concat(t);
    await clickPlaces(page, 2); await sleep(800);
  }
  for (const t of trips.slice(0, 2)){ await page.evaluate(id => openCommunityTrip(id), t); await sleep(3000); await clickPlaces(page, 1); }
  if (revisit){
    for (let i = 0; i < 3; i++){ await page.evaluate(() => openCommunityModal()); await sleep(2500); }
    await page.evaluate(id => loadCity(id), cities[0]); await sleep(2000);
    await page.evaluate(id => loadCity(id), cities[0]); await sleep(2000);
  }
}

async function runOne(browser, i, acc){
  const { ctx, page, errors } = await openPage(browser);
  let st = null, err = null;
  try{
    if (SCENARIO === 's1') await s1(page);
    else if (SCENARIO === 's2' || SCENARIO === 's5') await s2(page, acc);
    else if (SCENARIO === 's3') await s3(page, acc, false);
    else if (SCENARIO === 's4') await s3(page, acc, true);
    else throw new Error('unknown scenario ' + SCENARIO);
    await closeSession(page);
    st = await stats(page);
  }catch(e){ err = e && e.message || String(e); }
  try { await ctx.close(); } catch(_){}
  return { i, writes: st ? st.writesUsed : null, buffered: st ? st.buffered : null, err, checks: page.__checks || null, pageErrors: errors.slice(0, 4) };
}

(async () => {
  const needAuth = SCENARIO !== 's1';
  if (needAuth && ACCOUNTS.length === 0){ console.error('LT_ACCOUNTS missing'); process.exit(2); }
  log('scenario=' + SCENARIO + ' sessions=' + SESSIONS + ' accounts=' + ACCOUNTS.length + ' base=' + BASE);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const results = [];
  const concurrency = SCENARIO === 's5' ? 10 : 1;
  let next = 0, authFailures = 0;
  async function worker(){
    while (next < SESSIONS && timeLeft() > 30000 && authFailures === 0){
      const i = next++;
      const acc = ACCOUNTS.length ? ACCOUNTS[i % ACCOUNTS.length] : null;
      const r = await runOne(browser, i, acc);
      if (r.err === 'auth-failed') authFailures++;       // توقف عند أول رفض مصادقة
      results.push(r);
      log('session ' + (i + 1) + '/' + SESSIONS + ' writes=' + r.writes + (r.err ? ' ERR=' + r.err : ''));
      if (concurrency === 1) await sleep(GAP_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  await browser.close();

  const ok = results.filter(r => !r.err);
  const writes = ok.map(r => r.writes).filter(n => typeof n === 'number');
  const avg = writes.length ? (writes.reduce((a, b) => a + b, 0) / writes.length) : null;
  const summary = {
    scenario: SCENARIO, requested: SESSIONS, completed: ok.length, failed: results.length - ok.length,
    stoppedEarly: results.length < SESSIONS, authFailures,
    clientWritesAvg: avg === null ? null : Math.round(avg * 10) / 10,
    clientWritesMax: writes.length ? Math.max(...writes) : null,
    pageErrorsTotal: results.reduce((a, r) => a + r.pageErrors.length, 0),
    finishedAt: new Date().toISOString(),
    note: 'reads are NOT visible to the client — read the official Usage dashboard after the hour closes'
  };
  console.log('\nSUMMARY ' + JSON.stringify(summary));
  const bad = results.filter(r => r.err || r.pageErrors.length);
  if (bad.length) console.log('DETAILS ' + JSON.stringify(bad.slice(0, 10)));
  process.exit(0);
})().catch(e => { console.error('FATAL', e && e.message || e); process.exit(1); });
