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
    const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e)));
    await page.setRequestInterception(true); page.on('request', r => r.url().startsWith('file:') ? r.continue() : r.abort());
    await page.goto('file://' + path.join(ROOT, FILE), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 4500));
    // تجاوز بوابة الدخول للقياس: إخفاء الطبقة وبذر حالة عرض دنيا (بلا شبكة لا مستندات — نقيس الرؤوس والقوالب والحالات الفارغة)
    await page.evaluate(() => { const a = document.getElementById('authBackdrop'); if (a) a.classList.remove('show'); try { window.currentUser = { uid: 'visual', displayName: 'Visual' }; } catch (e) {} });
    for (const sc of SCREENS){
      let shown = true; try { await page.evaluate(sc.show); } catch (e) { shown = false; fail('screen ' + sc.id + ' shows', String(e.message).slice(0, 80)); }
      await new Promise(r => setTimeout(r, 300));
      try { const shot = path.join(OUT, sc.id + '.png'); await page.screenshot({ path: shot, type: 'png', fullPage: false }); fs.existsSync(shot) ? pass('screenshot ' + sc.id + '.png written') : fail('screenshot ' + sc.id, 'file missing after capture'); } catch (e) { fail('screenshot ' + sc.id, String(e && e.message || e).slice(0, 120)); }
      if (!shown) continue;
      const out = await page.evaluate(PAGE_EVAL.replace('ROOT_SEL', JSON.stringify(sc.root)).replace('MEASURE_SEL', JSON.stringify(MEASURE)));
      const T = 'visual ' + sc.id + ' (' + out.count + ' measured): ';
      out.contrast.length === 0 ? pass(T + 'computed contrast ≥ 4.5 text / 3 icons') : fail(T + 'computed contrast', out.contrast.slice(0, 6).join(' | '));
      out.clipped.length === 0 ? pass(T + 'nothing clipped beyond viewport') : fail(T + 'clipped', out.clipped.slice(0, 6).join(' | '));
      out.silent.length === 0 ? pass(T + 'no silent disabled+title') : fail(T + 'silent deferred', out.silent.join(' | '));
      out.untagged.length === 0 ? pass(T + 'every .soon carries a visible tag') : fail(T + 'untagged .soon', out.untagged.join(' | '));
    }
    // سجل الملاحظات الميدانية: كل ملاحظة فحص بالمتصفح الحقيقي
    for (const n of NOTES){
      if (!n.check) { console.log('NOTE  ' + n.id + ' (' + n.first + '): ' + n.text + '  →  ' + (n.status || 'OPEN — بلا فحص بعد')); continue; }
      let ok = false, why = '';
      try { ok = await page.evaluate(n.check); } catch (e) { why = String(e.message).slice(0, 80); }
      console.log((ok ? 'CLOSED' : 'OPEN  ') + '  ' + n.id + ' (منذ ' + n.first + '): ' + n.text + (ok ? '' : '  →  ' + (why || 'الفحص أحمر')));
      if (!ok && n.mustClose) fails++;
    }
    errs.length === 0 ? pass('no uncaught errors while rendering screens') : fail('uncaught errors', errs.slice(0, 3).join(' | '));
    const shots = fs.readdirSync(OUT).filter(f => f.endsWith('.png')); shots.length > 0 ? pass('screenshots on disk: ' + shots.length + ' (' + shots.join(', ') + ') → uploaded as artifact visual-screenshots') : fail('screenshots on disk', 'none written');
  } catch (e) { fail('visual harness', String(e && e.message || e)); } finally { await browser.close(); }
  finish();
})();
function finish(){ console.log('\n' + (fails === 0 ? '✅ VISUAL PASSED' : '❌ VISUAL FAILED (' + fails + ')')); process.exit(fails === 0 ? 0 : 1); }
