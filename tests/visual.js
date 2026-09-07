// MyPickz — tests/visual.js (ر٦٨ب — «عين السير»)
// يفتح ملف الاختبار بكروم حقيقي بلا شبكة، يُظهر الشاشات الرئيسة، ثم يقيس ما تراه العين لا ما يقوله الترميز:
//   ١) التباين المحسوب فعلًا لكل عنصر تفاعلي ونصي على خلفيته الحقيقية (بصعود السلالة حتى أول خلفية معتمة)
//   ٢) القصّ: أي عنصر تفاعلي يخرج عن عرض الشاشة أو صفر عرض
//   ٣) المؤجل الصامت: disabled بلا معالج · .soon بلا وسم ظاهر
//   ٤) سجل الملاحظات الميدانية tests/notes.json: كل ملاحظة فحصٌ قابل للتنفيذ — تُطبع حالتها (CLOSED/OPEN) بكل تشغيل
//   ٥) لقطة لكل شاشة تُحفظ بـ visual-out/ لترفع كأثر بالسير — المالك يراها بلا تصفح يدوي
'use strict';
const fs = require('fs'), path = require('path');
let puppeteer; try { puppeteer = require('puppeteer-core'); } catch (e) { console.log('FAIL  puppeteer-core not installed'); process.exit(1); }
const ROOT = path.resolve(__dirname, '..');
const FILE = 'index-debug-test.html';
const OUT = path.join(ROOT, 'visual-out'); fs.mkdirSync(OUT, { recursive: true });
const NOTES = fs.existsSync(path.join(__dirname, 'notes.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'notes.json'), 'utf8')) : [];
function findChrome(){ return [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find(p => fs.existsSync(p)); }
let fails = 0; const pass = n => console.log('PASS  ' + n); const fail = (n, w) => { fails++; console.log('FAIL  ' + n + (w ? '  →  ' + w : '')); };
let STAGE = 'start'; const at = s => { STAGE = s; };
const WATCHDOG = setTimeout(() => { console.log('FAIL  watchdog: visual.js exceeded 120s while at «' + STAGE + '»'); console.log('\n❌ VISUAL FAILED (hung)'); process.exit(1); }, 120000);
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + 'ms at ' + what)), ms))]);
const armPage = pg => { pg.setDefaultTimeout(15000); pg.setDefaultNavigationTimeout(20000); pg.on('dialog', d => { console.log('INFO  dialog auto-dismissed: ' + String(d.message()).slice(0, 80)); d.dismiss().catch(() => {}); }); };

// الشاشات: اسم · كيف تُظهَر (كود يُنفَّذ بالصفحة) · الحاوية التي تُقاس
const SCREENS = [
  { id: 'places',    show: "switchTab && switchTab('places'); typeof renderPlacesMine==='function' && renderPlacesMine();", root: 'body' },
  { id: 'trips',     show: "switchTab && switchTab('trips'); typeof renderTripsBody==='function' && renderTripsBody();", root: 'body' },
  { id: 'community', show: "switchTab && switchTab('community'); typeof renderCommunityModal==='function' && renderCommunityModal();", root: 'body' },
  { id: 'curators',  show: "switchTab && switchTab('curators'); typeof curOpenPage==='function' && curOpenPage();", root: 'body' },
  { id: 'addresses', show: "switchTab && switchTab('addresses');", root: 'body' },
  { id: 'template-source', show: "(function(){ var d=document.createElement('div'); d.id='__tplSource'; d.style.cssText='position:fixed;left:0;top:0;width:100%;background:var(--paper);z-index:9999;padding:8px'; d.innerHTML = window.__mpTemplates.sourceScreen({title:'Places', backLabel:'← Community', backHandler:'void(0)', countryLabel:'SA', cityLabel:'Riyadh', active:'all', onChip:'void', cards:[]}); document.body.appendChild(d); })();", root: '#__tplSource' },
];
// ما يُقاس: كل عنصر تفاعلي أو نصي مرئي
const MEASURE = 'button, a, .act, .actn, .chip, .pl-src, .backchip, .cta, .bmk-btn, .pn, .ps, .ctx, .pl-cathead, .cathead, .csel, .dim, .stattext, .pl-name, .pl-sub, .place-link, .mp-empty, label';

const PAGE_EVAL = `(function(){
  function lum(rgb){ var f=function(u){u/=255;return u<=0.03928?u/12.92:Math.pow((u+0.055)/1.055,2.4);}; return 0.2126*f(rgb[0])+0.7152*f(rgb[1])+0.0722*f(rgb[2]); }
  function parse(c){ var m=/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/.exec(c||''); return m?[+m[1],+m[2],+m[3],m[4]==null?1:+m[4]]:null; }
  function bgOf(el){ var e=el; while(e && e!==document.documentElement){ var c=parse(getComputedStyle(e).backgroundColor); if(c && c[3]>0.05) return c; e=e.parentElement; } return parse(getComputedStyle(document.body).backgroundColor)||[15,27,42,1]; }
  function blend(fg,bg){ var a=fg[3]; return [fg[0]*a+bg[0]*(1-a), fg[1]*a+bg[1]*(1-a), fg[2]*a+bg[2]*(1-a)]; }
  function cr(a,b){ var la=lum(a), lb=lum(b); if(la<lb){var t=la;la=lb;lb=t;} return (la+0.05)/(lb+0.05); }
  function visible(el){ var r=el.getBoundingClientRect(); var s=getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && el.offsetParent!==null && +s.opacity>0.05; }
  function desc(el){ return el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/).join('.'):'')+' «'+(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,28)+'»'; }
  var root = document.querySelector(ROOT_SEL) || document.body; var W = window.innerWidth; var out = { contrast: [], clipped: [], silent: [], untagged: [], count: 0 };
  root.querySelectorAll(MEASURE_SEL).forEach(function(el){
    if(!visible(el)) return; out.count++;
    var txt=(el.textContent||'').trim(); var s=getComputedStyle(el); var fg=parse(s.color); var bg=bgOf(el);
    if(txt && fg){ var ratio=cr(blend(fg,bg),bg); var icon = txt.length<=2 || /^[\\p{Emoji}\\s→←↗✕＋+·]+$/u.test(txt); var need = icon?3:4.5;
      if(ratio<need) out.contrast.push(desc(el)+' = '+ratio.toFixed(2)+' (need '+need+')'); }
    var r=el.getBoundingClientRect(); if(r.right>W+1 || r.left<-1) out.clipped.push(desc(el)+' right='+Math.round(r.right)+' W='+W);
    if(el.tagName==='BUTTON' && el.disabled && el.getAttribute('title') && !el.getAttribute('onclick')) out.silent.push(desc(el));
    if(/\\bsoon\\b/.test(el.className||'') && !el.querySelector('.dim,.soon,.mini')) out.untagged.push(desc(el));
  });
  return out;
})()`;

(async () => {
  const chrome = findChrome(); if (!chrome) { fail('chrome executable', 'set CHROME_PATH'); return finish(); }
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  try {
    const page = await browser.newPage(); armPage(page); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
    await page.setRequestInterception(true); page.on('request', r => r.url().startsWith('file:') ? r.continue() : r.abort());
    at('load app'); await page.goto('file://' + path.join(ROOT, FILE), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 4500));
    // تجاوز بوابة الدخول للقياس: إخفاء الطبقة وبذر حالة عرض دنيا (بلا شبكة لا مستندات — نقيس الرؤوس والقوالب والحالات الفارغة)
    // بذر بيانات عرض صناعية (بالأشكال ذاتها التي تبذرها المحاكاة) — فتُرسم الشاشات بمحتواها لا فارغة
    const seeded = await page.evaluate(`(function(){
      try {
        var a = document.getElementById('authBackdrop'); if (a) a.classList.remove('show');
        currentUser = { uid: 'visual', displayName: 'Visual', email: 'visual@t.t' };
        myListCityId = 'paris'; myCityListLoadedFor = 'paris';
        myCityListData = { public: true, sharedWith: [], sharedWithNames: {}, bookmarkCount: 2, categories: {
          breakfast: { active: true, places: [ { id: 'v1', name: 'Holybelly', url: 'https://maps.app.goo.gl/AAA1', area: 'Canal', note: 'Pancakes · early' }, { id: 'v2', name: 'Cafe Oberkampf', url: 'https://maps.app.goo.gl/BBB2', area: 'Oberkampf', note: '' } ] },
          lunch: { active: true, places: [ { id: 'v3', name: 'Le Bouchon', url: 'https://maps.app.goo.gl/CCC3', area: 'Presqu’île', note: '' } ] } } };
        if (typeof emptyDay === 'function') { userTrips = [ { id: 'vt1', type: 'city', cityId: 'paris', cityName: 'Paris', customLabel: 'Spring weekend', public: true, sharedWith: [], sharedWithNames: {}, days: [emptyDay(1), emptyDay(2)] }, { id: 'vt2', type: 'city', cityId: 'paris', cityName: 'Paris', customLabel: 'Food crawl', public: false, sharedWith: [], sharedWithNames: {}, days: [emptyDay(1)] } ]; }
        return 'ok';
      } catch (e) { return 'seed error: ' + e.message; }
    })()`);
    seeded === 'ok' ? pass('synthetic display data seeded (list · 3 places · 2 trips)') : fail('seed', seeded);
    for (const sc of SCREENS){
      at('show ' + sc.id); let shown = true; try { await withTimeout(page.evaluate(sc.show), 15000, 'show ' + sc.id); } catch (e) { shown = false; fail('screen ' + sc.id + ' shows', String(e.message).slice(0, 80)); }
      await new Promise(r => setTimeout(r, 300));
      try { const shot = path.join(OUT, sc.id + '.png'); await page.screenshot({ path: shot, type: 'png', fullPage: false }); fs.existsSync(shot) ? pass('screenshot ' + sc.id + '.png written') : fail('screenshot ' + sc.id, 'file missing after capture'); } catch (e) { fail('screenshot ' + sc.id, String(e && e.message || e).slice(0, 120)); }
      if (!shown) continue;
      at('measure ' + sc.id); const out = await withTimeout(page.evaluate(PAGE_EVAL.replace('ROOT_SEL', JSON.stringify(sc.root)).replace('MEASURE_SEL', JSON.stringify(MEASURE))), 15000, 'measure ' + sc.id);
      const T = 'visual ' + sc.id + ' (' + out.count + ' measured): ';
      out.contrast.length === 0 ? pass(T + 'computed contrast ≥ 4.5 text / 3 icons') : fail(T + 'computed contrast', out.contrast.slice(0, 6).join(' | '));
      out.clipped.length === 0 ? pass(T + 'nothing clipped beyond viewport') : fail(T + 'clipped', out.clipped.slice(0, 6).join(' | '));
      out.silent.length === 0 ? pass(T + 'no silent disabled+title') : fail(T + 'silent deferred', out.silent.join(' | '));
      out.untagged.length === 0 ? pass(T + 'every .soon carries a visible tag') : fail(T + 'untagged .soon', out.untagged.join(' | '));
    }
    // ═══ الأصل: المرجع الحاكم يُرسم بكروم السير نفسه ويُقارن به التطبيق (لا جدول من الذاكرة) ═══
    const refFile = fs.readdirSync(ROOT).filter(f => /^Mypickz-STEPS-marked-v1[ _]\d+\.html$/.test(f)).sort().pop();
    if (!refFile) fail('reference present in repo root'); else {
      pass('reference: ' + refFile);
      at('load reference'); const ref = await browser.newPage(); armPage(ref); await ref.setViewport({ width: 900, height: 1400, deviceScaleFactor: 2 });
      await ref.setRequestInterception(true); ref.on('request', r => r.url().startsWith('file:') ? r.continue() : r.abort());
      await ref.goto('file://' + path.join(ROOT, refFile), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 800));
      const SCENE_OF = { places: 'dA', trips: 'dB', community: 'dD', 'template-source': 'dD2', curators: 'dE2', addresses: 'dF' };
      const compose = await browser.newPage(); armPage(compose); await compose.setViewport({ width: 1200, height: 1700, deviceScaleFactor: 1 });
      for (const [scr, scene] of Object.entries(SCENE_OF)){
        try { at('compare ' + scr);
          const phone = await ref.$('#' + scene + ' .phone'); if (!phone) { fail('reference scene ' + scene + ' phone found'); continue; }
          const refShot = await phone.screenshot({ type: 'png', encoding: 'base64' });
          const appPath = path.join(OUT, scr + '.png'); if (!fs.existsSync(appPath)) continue;
          const appShot = fs.readFileSync(appPath).toString('base64');
          await compose.setContent('<body style="margin:0;background:#111;display:flex;gap:16px;padding:12px;font:700 14px sans-serif;color:#eee"><div><div style="padding:6px">المرجع v1.42 — ' + scene + '</div><img style="width:390px" src="data:image/png;base64,' + refShot + '"></div><div><div style="padding:6px">التطبيق — ' + scr + '</div><img style="width:390px" src="data:image/png;base64,' + appShot + '"></div></body>');
          await compose.screenshot({ path: path.join(OUT, 'compare-' + scr + '.png'), type: 'png', fullPage: true });
          pass('compare-' + scr + '.png (reference ' + scene + ' | app) written');
        } catch (e) { fail('compare ' + scr, String(e.message).slice(0, 100)); }
      }
      // مطابقة الرموز المحسوبة: العنصر بالمرجع (مرسومًا) هو الأصل — ونظيره بالتطبيق يُقرأ بجدول ربط الأصناف
      const MAP = [
        { name: 'back chip',      ref: '#dD2 .backchip',                          app: '.backchip' },
        { name: 'chip inactive',  ref: '#dD2 .srcgrid > .src:not(.on):not(.soon)', app: '#__tplSource .chip:not(.on):not(.soon), .chipgrid .pl-src:not(.on):not(.soon)' },
        { name: 'chip active',    ref: '#dD2 .srcgrid > .src.on',                 app: '#__tplSource .chip.on, .chipgrid .pl-src.on' },
        { name: 'chip deferred',  ref: '#dD2 .srcgrid > .src.soon',               app: '#__tplSource .chip.soon, .chipgrid .pl-src.soon' },
        { name: 'city selector',  ref: '#dD2 .csel',                              app: '#__tplSource .csel, .csel' },
        { name: 'context line',   ref: '#dD2 .ctx',                               app: '#__tplSource .ctx, .ctx' },
      ];
      const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderTopStyle', 'borderTopLeftRadius', 'fontSize', 'fontWeight'];
      const read = (pg, sel) => pg.evaluate((sel, PROPS) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); const o = {}; PROPS.forEach(p => o[p] = s[p]); return o; }, sel, PROPS);
      for (const m of MAP){ at('token ' + m.name);
        const a = await read(ref, m.ref), b = await read(page, m.app);
        if (!a) { fail('token ' + m.name, 'not drawn in reference: ' + m.ref); continue; }
        if (!b) { fail('token ' + m.name, 'not found in app: ' + m.app); continue; }
        const diffs = PROPS.filter(p => { if (/Radius|fontSize/.test(p)) return Math.abs(parseFloat(a[p]) - parseFloat(b[p])) > 2; return String(a[p]) !== String(b[p]); }).map(p => p + ': ref ' + a[p] + ' ≠ app ' + b[p]);
        diffs.length === 0 ? pass('token ' + m.name + ' matches reference (computed)') : fail('token ' + m.name, diffs.join(' | '));
      }
      // الجرد النصي: شرائح شاشة المصدر بالمرجع (ترتيبًا) = شرائح القالب بالتطبيق
      const norm = t => String(t || '').replace(/[·\s]+/g, ' ').replace(/stage 3|later|soon/gi, '').trim().toLowerCase();
      const refChips = await ref.evaluate(() => [...document.querySelectorAll('#dD2 .phone .srcgrid > .src')].slice(0, 6).map(e => e.textContent));
      const appChips = await page.evaluate(() => [...document.querySelectorAll('#__tplSource .chipgrid .chip')].map(e => e.textContent));
      const same = refChips.length === 6 && appChips.length === 6 && refChips.every((t, i) => norm(t) === norm(appChips[i]));
      same ? pass('six source chips — same labels and order as the reference') : fail('six source chips vs reference', 'ref: ' + refChips.map(norm).join(' | ') + '  ⇄  app: ' + appChips.map(norm).join(' | '));
      await ref.close(); await compose.close();
    }
    // سجل الملاحظات الميدانية: كل ملاحظة فحص بالمتصفح الحقيقي
    for (const n of NOTES){ at('note ' + n.id);
      if (!n.check) { console.log('NOTE  ' + n.id + ' (' + n.first + '): ' + n.text + '  →  ' + (n.status || 'OPEN — بلا فحص بعد')); continue; }
      let ok = false, why = '';
      try { ok = await withTimeout(page.evaluate(n.check), 10000, 'note ' + n.id); } catch (e) { why = String(e.message).slice(0, 80); }
      console.log((ok ? 'CLOSED' : 'OPEN  ') + '  ' + n.id + ' (منذ ' + n.first + '): ' + n.text + (ok ? '' : '  →  ' + (why || 'الفحص أحمر')));
      if (!ok && n.mustClose) fails++;
    }
    errs.length === 0 ? pass('no uncaught errors while rendering screens') : fail('uncaught errors', errs.slice(0, 3).join(' | '));
    const shots = fs.readdirSync(OUT).filter(f => f.endsWith('.png')); shots.length > 0 ? pass('screenshots on disk: ' + shots.length + ' (' + shots.join(', ') + ') → uploaded as artifact visual-screenshots') : fail('screenshots on disk', 'none written');
  } catch (e) { fail('visual harness', String(e && e.message || e)); } finally { await browser.close(); }
  finish();
})();
function finish(){ clearTimeout(WATCHDOG); console.log('\n' + (fails === 0 ? '✅ VISUAL PASSED' : '❌ VISUAL FAILED (' + fails + ')')); process.exit(fails === 0 ? 0 : 1); }
