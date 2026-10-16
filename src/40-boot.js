/* =========================================================
   0) عرض أي خطأ مباشرة على الصفحة (للتشخيص)
   ========================================================= */
window.onerror = function(msg, url, line, col, error){
  try{ mpTrack.trapError(mpTrack.classify(msg, error)); }catch(_){}
  console.warn('Background script warning (non-critical):', msg);
  return false;
};

/* =========================================================
   1) تحميل Firebase SDK ديناميكيًا مع إعادة محاولة تلقائية
   ========================================================= */
function loadScriptOnce(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // يحافظ على ترتيب التشغيل حتى لو التحميل من الشبكة متوازي
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
}

async function loadScriptWithRetry(src, attempts){
  for (let i = 1; i <= attempts; i++){
    try{ await loadScriptOnce(src + (src.includes('?') ? '&' : '?') + 'retry=' + i); return; }
    catch(e){ if (i === attempts) throw e; await new Promise(r => setTimeout(r, 800)); }
  }
}

async function loadFirebaseSDK(){
  const base = "https://cdnjs.cloudflare.com/ajax/libs/firebase/10.12.2/";
  await Promise.all([
    loadScriptWithRetry(base + "firebase-app-compat.min.js", 3),
    loadScriptWithRetry(base + "firebase-firestore-compat.min.js", 3),
    loadScriptWithRetry(base + "firebase-auth-compat.min.js", 3)
  ]);
  // أ-٣ الطبقة ٤: App Check — مستقلة عن الثلاث الأساسية: فشلها لا يُسقط التطبيق (وضع المراقبة لا يرفض شيئًا)
  try{ await loadScriptWithRetry(base + "firebase-app-check-compat.min.js", 3); }
  catch(_){ /* صامت — يعمل التطبيق بلا شهادة */ }
}

/* =========================================================
   2) FIREBASE CONFIG — ⚠️ استبدل هذا الكائن بالكامل بالكود
   اللي يعطيك إياه Firebase Console بعد إنشاء المشروع:
   Project settings → General → Your apps → Web app → Config
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAZMUTMidMIJCeif5rYBi4MkKa-E4ASAHY",
  authDomain: "mypickz-6f809.firebaseapp.com",
  projectId: "mypickz-6f809",
  storageBucket: "mypickz-6f809.firebasestorage.app",
  messagingSenderId: "134744574180",
  appId: "1:134744574180:web:bd6370482b3548913e04f1"
};
// أ-٣ الطبقة ٤: مفتاح reCAPTCHA Enterprise (معرِّف عام كـapiKey، لا سرّ — المبدأ ٨) · يحرسه audit.js بالملفين
const MP_APPCHECK_KEY = "6Lery5EtAAAAANS-ab4HgjY76F8aLlY_V8SJWsXC";

let db = null;
let auth = null;

async function initFirebase(){
  try{
    await loadFirebaseSDK();
    if (typeof firebase === 'undefined') {
      throw new Error('Scripts loaded but the firebase object is missing (possibly a browser extension conflict).');
    }
    firebase.initializeApp(firebaseConfig);

    // ===== أ-٣ الطبقة ٤: App Check — وضع مراقبة (الإنفاذ من لوحة Firebase بشرطين: verified≈١٠٠٪ + Blaze) =====
    // TTL = يوم واحد وApp risk = 0.5 يُضبطان باللوحة لا هنا. الفشل صامت دائمًا ولا يُسجَّل بمصيدة الأخطاء.
    /* هـ (r81 · قرار المالك ١٥ أكتوبر): App Check موقوفة مؤقتًا — كانت في وضع المراقبة (لا تحمي شيئًا بعد) وجلب شهادتها عبر reCAPTCHA يقف أمام كل قراءة حين يتعثر على iOS؛ تُعاد عند الإنفاذ بقياس. ?withcheck=1 يعيد تفعيلها لهذه الجلسة للمقارنة */
    const __withCheck = /[?&]withcheck=1/.test(location.search) || (function(){ try{ return sessionStorage.getItem('mp_withcheck') === '1'; }catch(_){ return false; } })();
    try{ if (/[?&]withcheck=1/.test(location.search)) sessionStorage.setItem('mp_withcheck', '1'); }catch(_){}
    try{
      if (firebase.appCheck && __withCheck){
        firebase.appCheck().activate(
          new firebase.appCheck.ReCaptchaEnterpriseProvider(MP_APPCHECK_KEY),
          true /* تجديد تلقائي للشهادة */
        );
        if (typeof logTiming === 'function') logTiming('App Check activated (Enterprise, monitor mode)');
        try{ const __t0 = performance.now(); firebase.appCheck().getToken(false).then(function(){ if (typeof logTiming === 'function') logTiming('[NET] App Check token in ' + Math.round(performance.now() - __t0) + 'ms'); }, function(e){ if (typeof logTiming === 'function') logTiming('[NET] App Check token FAILED after ' + Math.round(performance.now() - __t0) + 'ms · ' + ((e && (e.code || e.message)) || e)); }); }catch(_){} /* د-٥ */
      } else if (typeof logTiming === 'function') logTiming('[NET] App Check OFF (paused until enforcement · ?withcheck=1 to compare)');
    }catch(_){ /* صامت */ }
    try{ if (typeof __mpFsDebug === 'function') __mpFsDebug(firebase); }catch(_){} /* هـ-٢: نسخة الاختبار (91-timing) تفعّل سجل Firestore الداخلي وتلتقط أسطره المهمة في لوحة TIMING */
    db = firebase.firestore();
    /* هـ: قناة Firestore بالنقل الطويل — العلاج القياسي لتوقف WebChannel على Safari/iOS (قراءات تتأخر ٣٠ ثانية).
       هـ-٦ (السبب الجذري المثبَت من مصدر المكتبة 10.12.2): لم يُطبَّق هذا الإعداد قط منذ هـ — طبقة compat مع merge:true تدمج الإعدادات الحالية (وفيها experimentalAutoDetectLongPolling=true افتراضيًا منذ 9.22) ثم يرفض المنشئ الجمع بين force وautoDetect برسالة «cannot be used together» (firestore-compat/src/api/database.ts:200-209 · firestore/src/lite-api/settings.ts:151-156)؛ كان الخطأ يُلتقط هنا ويُكتب سطرًا مدفونًا والسطر الأصفر يقول «transport ?». العلاج: autoDetect=false صراحةً، ثم قراءة الإعداد المطبَّق فعلًا والتصريح به في السطر الأصفر */
    try{
      db.settings({ experimentalForceLongPolling: true, experimentalAutoDetectLongPolling: false, experimentalLongPollingOptions: { timeoutSeconds: 10 }, merge: true });
      let __applied = null; try{ const __d = db._delegate; const __s = (__d && typeof __d._getSettings === 'function') ? __d._getSettings() : null; if (__s) __applied = (__s.experimentalForceLongPolling === true && __s.experimentalAutoDetectLongPolling === false && __s.experimentalLongPollingOptions && __s.experimentalLongPollingOptions.timeoutSeconds === 10); }catch(_){}
      if (typeof logTiming === 'function') logTiming('[NET] Firestore transport: long polling · request timeout 10s · ' + (__applied === true ? 'verified' : (__applied === false ? 'NOT VERIFIED (settings read back differ)' : 'applied (not read back)')));
    }catch(e){ if (typeof logTiming === 'function') logTiming('[NET] long polling not applied · ' + (e && e.message)); }
    auth = firebase.auth();
  }catch(e){
    const dbg = document.getElementById('debugBanner');
    dbg.style.display = 'block';
    dbg.style.direction = 'ltr';
    dbg.textContent = '⚠️ Firebase load/init failed: ' + e.message;
  }
}

