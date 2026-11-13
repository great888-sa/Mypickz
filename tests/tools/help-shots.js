// MyPickz — tests/tools/help-shots.js (r115 · ١١ نوفمبر ٢٠٢٦ · ق١١-١١-٠٤ «الشرح متحرك»)
// فحص بمتصفح حقيقي (Chromium بعرض ٣٩٠) للإرشاد: المستوى الأول ببطاقاته، ثم العروض الخمسة خطوةً خطوة — بالإنجليزية والعربية وللزائر.
// ما لا تراه الرحلة (jsdom بلا تخطيط): أن الحلقة تقع فوق الزر المقصود فعلًا، وأن الزر داخل المسرح، وأن الصفحة لا تحمل معرّفًا مكرَّرًا والعرض مفتوح،
// وأن حالة المستخدم بعد العروض كما كانت قبلها. وُجد به في النموذج الأول أن الحلقة كانت تُقاس في منتصف الحركة فتقع فوق زر آخر والفحص الأول يمرّ.
// لا يدخل سير GitHub (يحتاج Playwright في بيئة المنفِّذ).   الاستعمال:  node tests/tools/help-shots.js <مجلد اللقطات>
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'tests', '.shots-help')); fs.mkdirSync(OUT, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build.json'), 'utf8'));
let html = cfg.parts.filter(p => p !== '92-init.js').map(p => fs.readFileSync(path.join(ROOT, 'src', p), 'utf8')).join('');
html = html.replace(/<link[^>]+(fonts\.googleapis|cdnjs)[^>]*>/g, '').replace(/<script src="https:[^"]+"[^>]*><\/script>/g, '');
const pageFile = path.join(OUT, 'page.html'); fs.writeFileSync(pageFile, html);
const results = []; const check = (name, cond, why) => { results.push({ name, ok: !!cond }); console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (cond ? '' : '  →  ' + String(why || ''))); };
const IDS = ['places', 'trips', 'curators', 'community', 'addresses']; const STEPS = { places: 4, trips: 4, curators: 3, community: 3, addresses: 3 };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] }); const errors = [];
  for (const mode of [['en', false], ['ar', false], ['en', true]]){ const lang = mode[0], guest = mode[1], tag = lang + (guest ? '-guest' : '');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, offline: true }); const page = await ctx.newPage(); page.on('pageerror', e => errors.push(tag + ': ' + String(e)));
    await page.goto('file://' + pageFile); await page.waitForTimeout(400);
    await page.evaluate(([lang, guest]) => { document.body.classList.remove('auth-pending'); const tb = document.getElementById('mpTimingBox'); if (tb) tb.style.display = 'none'; if (!guest){ currentUser = { uid: 'uTESTTESTTESTTESTTESTTEST01', email: 'o@x' }; userListData = { customCities: [], customCountries: [], nickname: 'sara', cityPlaceCounts: {}, following: [], placeBookmarks: {} }; } userTrips = []; helpLang = lang; helpView = null; openHelpModal(); }, [lang, guest]);
    await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, 'help-level1-' + tag + '.png') });
    const l1 = await page.evaluate(() => { const box = document.getElementById('helpSections').getBoundingClientRect(); const cards = Array.prototype.map.call(document.querySelectorAll('#helpSections .help-card'), c => { const r = c.getBoundingClientRect(); return [c.id, r.left >= box.left - 1 && r.right <= box.right + 1, c.querySelectorAll('button[onclick^="helpAct"]').length, !!c.querySelector('.help-card-ic svg')]; }); return { cards, dir: document.getElementById('helpSections').style.direction }; });
    check('[' + tag + '] المستوى الأول: ست بطاقات داخل عرض النافذة، الخمس الأولى بأيقونتها' + (guest ? '، وبلا زر فعل للزائر' : '، ولكلٍّ زر فعل'), l1.cards.length === 6 && l1.cards.every(c => c[1]) && l1.cards.slice(0, 5).every(c => c[3] && c[2] === (guest ? 0 : 1)) && l1.dir === (lang === 'ar' ? 'rtl' : 'ltr'), JSON.stringify(l1));
    const snap = () => page.evaluate(() => JSON.stringify({ n: userTrips.length, tb: typeof TB === 'undefined' ? null : (TB === null ? 'null' : 'set'), ls: Object.keys(localStorage).filter(k => k !== 'mp_hb').sort().join(','), cur: Object.keys(curData).join(','), cp: Object.keys(__cp).sort().join(','), plv: (document.getElementById('plUrl') || {}).value || '', adv: (document.getElementById('addrName') || {}).value || '' }));
    const before = await snap();
    for (const id of IDS){
      await page.evaluate(id => { document.querySelector('#help_card_' + id + ' button[onclick^="helpDemoOpen"]').click(); }, id); await page.waitForTimeout(900);
      const n = await page.evaluate(() => helpDemo ? helpDemo.frames.length : 0); const res = [];
      for (let i = 0; i < n; i++){
        res.push(await page.evaluate(() => { const st = document.getElementById('hdStage').getBoundingClientRect(), rr = document.getElementById('hdRing').getBoundingClientRect(); const el = document.getElementById('hdIn').querySelector(helpDemo.frames[helpDemo.i].point); const er = el ? el.getBoundingClientRect() : null; const ids = Array.prototype.map.call(document.querySelectorAll('[id]'), e => e.id); return { found: helpDemo.found, on: !!er && Math.abs(rr.left - (er.left - 4)) < 3 && Math.abs(rr.top - (er.top - 4)) < 3, in: !!er && er.top >= st.top - 2 && er.bottom <= st.bottom + 2 && er.left >= st.left - 2 && er.right <= st.right + 2, dup: ids.length - new Set(ids).size, cap: (document.getElementById('hdCap').textContent || '').length, kb: document.getElementById('hdStage').inert === true && document.querySelectorAll('#hdIn [id]').length === 0 && document.querySelectorAll('#hdIn a:not([tabindex="-1"]), #hdIn button:not([tabindex="-1"]), #hdIn input:not([tabindex="-1"]), #hdIn select:not([tabindex="-1"]), #hdIn textarea:not([tabindex="-1"])').length === 0, n: document.getElementById('hdN').getBoundingClientRect().width > 0 ? document.getElementById('hdN').textContent : '' }; }));
        await page.evaluate(id => { document.getElementById('help_card_' + id).scrollIntoView({ block: 'start' }); }, id); await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, 'help-' + id + '-' + (i + 1) + '-' + tag + '.png') });
        if (i < n - 1){ await page.evaluate(id => { document.querySelector('#helpDemoHost_' + id + ' button[aria-label="Next step"]').click(); }, id); await page.waitForTimeout(900); } }
      await page.evaluate(id => { document.querySelector('#helpDemoHost_' + id + ' button[aria-label="Close"]').click(); }, id);
      check('[' + tag + '] عرض ' + id + ': ' + STEPS[id] + ' خطوات — كل خطوة تجد زرّها، والحلقة فوقه، وهو داخل المسرح، وبلا معرّف مكرَّر، والمسرح خامل بلا معرّفات ولا ما يقبل التركيز، وبشرح وعدّاد', n === STEPS[id] && res.every((r, i) => r.found && r.on && r.in && r.dup === 0 && r.kb && r.cap > 20 && r.n === (i + 1) + ' / ' + n), JSON.stringify(res)); }
    /* لوحة المفاتيح: Tab لا يدخل المسرح أبدًا (المراجعة المستقلة ضغطت أزرار العرض بـTab ثم Enter فنفّذت معالجاتها الحقيقية) · وإغلاق الإرشاد يغلق العرض */
    await page.evaluate(() => { document.querySelector('#help_card_community button[onclick^="helpDemoOpen"]').click(); }); await page.waitForTimeout(500);
    let inside = 0; for (let k = 0; k < 40; k++){ await page.keyboard.press('Tab'); if (await page.evaluate(() => { const st = document.getElementById('hdStage'); return !!(st && st.contains(document.activeElement)); })) inside++; }
    check('[' + tag + '] لوحة المفاتيح: أربعون Tab لا يدخل أيٌّ منها المسرح (كل ما فيه خارج ترتيب التركيز والمسرح inert)', inside === 0, 'focus entered the stage ' + inside + ' times');
    await page.evaluate(() => { helpView = null; openHelpModal(); document.querySelector('#help_card_places button[onclick^="helpDemoOpen"]').click(); }); await page.waitForTimeout(300);
    const closed = await page.evaluate(() => { const cu = currentUser; if (!cu){ document.getElementById('helpBackdrop').classList.remove('show'); helpDemoClose(); return [helpDemo === null, true]; } closeHelpModal(); return [helpDemo === null, document.querySelectorAll('.hdm').length === 0]; });
    check('[' + tag + '] إغلاق الإرشاد يغلق العرض ومسرحه', closed[0] && closed[1], JSON.stringify(closed));
    const after = await snap(); check('[' + tag + '] بعد العروض الخمسة حالة المستخدم كما كانت (TB · رحلاتي · ذاكرة الجهاز · بيانات المنتقين · حالة صف التصنيفات · خانات النافذتين)', before === after, before + ' ≠ ' + after);
    await ctx.close(); }
  check('لا خطأ في الصفحة طوال الفحص', errors.length === 0, errors.slice(0, 3).join(' ‖ '));
  await browser.close();
  const bad = results.filter(r => !r.ok).length; console.log('\n' + (bad ? '❌ HELP BROWSER CHECK FAILED (' + bad + ') of ' + results.length : '✅ HELP BROWSER CHECK PASSED — ' + results.length + ' checks · shots in ' + OUT));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FAIL  harness → ' + (e && e.stack || e)); process.exit(1); });
