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
    try{
      if (firebase.appCheck){
        firebase.appCheck().activate(
          new firebase.appCheck.ReCaptchaEnterpriseProvider(MP_APPCHECK_KEY),
          true /* تجديد تلقائي للشهادة */
        );
        if (typeof logTiming === 'function') logTiming('App Check activated (Enterprise, monitor mode)');
      }
    }catch(_){ /* صامت */ }
    db = firebase.firestore();
    auth = firebase.auth();
  }catch(e){
    const dbg = document.getElementById('debugBanner');
    dbg.style.display = 'block';
    dbg.style.direction = 'ltr';
    dbg.textContent = '⚠️ Firebase load/init failed: ' + e.message;
  }
}

