// MyPickz — tests/runtime.js
// يشغّل الصفحتين فعليًا بمتصفح حقيقي (Chrome بلا شبكة) ويتأكد أن:
//   ١) السكربت يُنفَّذ بلا أي خطأ غير مُلتقَط (pageerror)
//   ٢) التهيئة تكتمل وتصل للحالة المتوقَّعة بلا Firebase (بانر الفشل الرحيم + نافذة التسجيل)
//   ٣) كل معالج onclick بالـDOM يشير إلى دالة معرَّفة فعلًا على window
//   ٤) الدوال المفتاحية موجودة بالمستوى الأعلى (window)
// يعتمد على puppeteer-core + Chrome مثبَّت بالنظام (GitHub ubuntu-latest يوفّره).
// تشغيل محلي: CHROME_PATH=/path/to/chrome node tests/runtime.js
'use strict';
const path = require('path');
const fs = require('fs');

let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch (e) { console.log('FAIL  puppeteer-core not installed  →  npm i --no-save puppeteer-core'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const FILES = ['index.html', 'index-debug-test.html'];
const KEY_FUNCTIONS = [
  'initFirebase', 'render', 'loadCity', 'openAuthModal', 'closeAuthModal', 'doSignIn', 'doSignUp',
  'enforceNickname', 'syncOwnerMode', 'updateUserUI', 'loadUserList', 'loadUserTrips', 'loadFavorites',
  'saveTrip', 'toggleSuspendUser', 'openUsersModal', 'closeTripPickerModal', 'withAuthRetry', 'trackVisit'
];

function findChrome(){
  const cands = [
    process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome'
  ].filter(Boolean);
  return cands.find(p => fs.existsSync(p));
}

let fails = 0;
const pass = n => console.log('PASS  ' + n);
const fail = (n, w) => { fails++; console.log('FAIL  ' + n + (w ? '  →  ' + w : '')); };

(async () => {
  const chrome = findChrome();
  if (!chrome) { fail('chrome executable', 'set CHROME_PATH'); return finish(); }
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  try {
    for (const f of FILES) {
      const url = 'file://' + path.join(ROOT, f);
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
      // بلا شبكة: أي طلب خارجي يفشل فورًا (يحاكي انقطاع CDN) — التهيئة يجب أن تفشل برحمة لا بانهيار
      await page.setRequestInterception(true);
      page.on('request', r => r.url().startsWith('file:') ? r.continue() : r.abort());
      await page.goto(url, { waitUntil: 'load' });
      // ننتظر اكتمال محاولات تحميل SDK (٣ محاولات × ٨٠٠ مللي) + التهيئة
      await new Promise(r => setTimeout(r, 4500));

      pageErrors.length === 0 ? pass('no uncaught errors ' + f) : fail('no uncaught errors ' + f, pageErrors.slice(0, 3).join(' | '));

      const state = await page.evaluate((keys) => {
        const banner = document.getElementById('debugBanner');
        const auth = document.getElementById('authBackdrop');
        const missing = [];
        document.querySelectorAll('[onclick]').forEach(el => {
          const m = (el.getAttribute('onclick') || '').match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
          if (m && typeof window[m[1]] !== 'function') missing.push(m[1]);
        });
        const missingKeys = keys.filter(k => typeof window[k] !== 'function');
        return {
          bannerText: banner ? banner.textContent : null,
          bannerShown: banner ? banner.style.display === 'block' : false,
          authShown: auth ? auth.classList.contains('show') : false,
          onclickCount: document.querySelectorAll('[onclick]').length,
          missing: [...new Set(missing)],
          missingKeys
        };
      }, KEY_FUNCTIONS);

      state.bannerShown && /Firebase load\/init failed/.test(state.bannerText || '')
        ? pass('graceful init fallback ' + f)
        : fail('graceful init fallback ' + f, 'banner=' + JSON.stringify(state.bannerText).slice(0, 80));
      state.authShown ? pass('auth gate opened for guest ' + f) : fail('auth gate opened for guest ' + f);
      state.missing.length === 0
        ? pass('all onclick handlers defined (' + state.onclickCount + ') ' + f)
        : fail('all onclick handlers defined ' + f, 'missing: ' + state.missing.join(', '));
      state.missingKeys.length === 0
        ? pass('key functions at top level ' + f)
        : fail('key functions at top level ' + f, 'missing: ' + state.missingKeys.join(', '));
      await page.close();
    }
  } catch (e) {
    fail('runtime harness', String(e && e.message || e));
  } finally {
    await browser.close();
  }
  finish();
})();

function finish(){
  console.log('\n' + (fails === 0 ? '✅ RUNTIME PASSED' : '❌ RUNTIME FAILED (' + fails + ')'));
  process.exit(fails === 0 ? 0 : 1);
}
