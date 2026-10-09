// ===== إلزامية الاسم المستعار ١٠٠٪ (أ-٢ الدفعة ٢) =====
// المصدر الوحيد للفحص: يُستدعى من onAuthStateChanged بعد تحميل userLists — يغطي تسجيل الدخول واستعادة الجلسة (تحديث الصفحة)
// معًا، فيسدّ ثغرة "سجّل ← حدّث الصفحة ← دخل بلا اسم". لا يعمل عند فشل الشبكة (يعود تلقائيًا بالتحميل التالي).
async function enforceNickname(){
  if (!currentUser) return;
  if (signUpInProgress){ logTiming('[NICK] skip: signUpInProgress'); return; }      // التسجيل يحجز الاسم بنفسه — لا نافذة زائفة أثناء ذلك
  if (userListLoadFailed){ logTiming('[NICK] skip: userLists read failed'); return; }    // تعذّر التحقق شبكيًا — لا نحبس المستخدم بخطأ مؤقت
  if (userListData.nickname){ logTiming('[NICK] ok: nickname="' + userListData.nickname + '"'); updateUserUI(); if (!signUpInProgress) runOnboardingIfNeeded(); return; } // خ١: الشارة بعد الاسم · خ١-ب: النبذة والوجهة مرة واحدة
  if (nicknameFlowActive){ logTiming('[NICK] skip: flow already active'); return; }
  logTiming('[NICK] ⚠️ no nickname on server → prompting');
  nicknameFlowActive = true;
  try{
    showToast('Welcome — please choose a username to continue');
    let ok = false;
    while (!ok && currentUser){
      ok = await chooseNickname();
    }
  } finally { nicknameFlowActive = false; updateUserUI(); } // خ١: الشارة بعد اختيار الاسم
}

async function doSignIn(){
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  if (!email || !pass){
    errEl.textContent = 'Enter email and password';
    return;
  }
  try{
    await mpData.auth.signIn(email, pass);
    // فحص الاسم المستعار لم يعد هنا — صار موحَّدًا في onAuthStateChanged (يغطي الدخول واستعادة الجلسة معًا، أ-٢ الدفعة ٢)
    closeAuthModal(true);
    showToast('Welcome ✓');
  }catch(e){
    errEl.textContent = authErrorMessage(e);
  }
}
function authErrorMessage(e){
  const code = e && e.code || '';
  if (code.includes('email-already-in-use')) return 'This email is already registered — try logging in';
  if (code.includes('invalid-email')) return 'Invalid email format';
  if (code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-credential')) return 'Incorrect email or password';
  if (code.includes('weak-password')) return 'Weak password — 6+ characters required';
  if (code.includes('too-many-requests')) return 'Too many attempts — wait a bit and try again';
  return 'Something went wrong, try again';
}

async function doForgotPassword(){
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  if (!email){
    errEl.style.color = 'var(--danger)';
    errEl.textContent = 'Enter your email in the field above, then tap "Forgot password?"';
    return;
  }
  errEl.style.color = 'var(--ink-strong)';
  errEl.textContent = 'Sending...';
  try{
    await mpData.auth.sendReset(email);
    errEl.style.color = 'var(--saffron)';
    errEl.textContent = 'Reset link sent to your email ✓ Check your inbox (and spam)';
  }catch(e){
    errEl.style.color = 'var(--danger)';
    if ((e.code||'').includes('invalid-email')) errEl.textContent = 'Invalid email format';
    else errEl.textContent = 'Could not send — make sure the email is correct and try again';
  }
}
function doSignOut(){
  mpData.auth.signOut();
  showToast('Logged out');
}



// ٢/أ: لون حتمي مشتق من الاسم المستعار — الشارة نفسها بكل مكان (الشريط، نافذة الحساب، ولاحقًا ترويسة "حسابي")
const AV_COLORS = ['#3D5A80','#6B4E71','#4A6D7C','#5B6B3A','#7A4F3A','#3F6B5E','#5C5A8A','#7A5C2E']; // v1.37: لوحة الشارة الثمانية — لا زعفران ولا لون خطر
function avatarColor(name){
  let h = 0; for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
// v1.37 — الشارة تعلن الإيقاف (القرار ٢٠٢٦-٠٨-٣١-٠٧): إطار خطر ليلي رفيع ونص الحالة؛ الحرفان باقيان
function refreshSuspendedBadge(){
  const chip = document.getElementById('accountChipBtn'), sus = document.getElementById('accountChipSus');
  if (!chip || !sus) return;
  const on = !!(currentUser && currentUserSuspended);
  chip.classList.toggle('suspended', on);
  sus.style.display = on ? '' : 'none';
}
function avatarInitials(name){
  const n = String(name || '').trim();
  return n ? n.slice(0, 2) : '··';
}
function updateUserUI(){ /* r74b-٣: الكتلة الخفية الموروثة (شاشة الدليل) حُذفت — كانت تحمل أيقونة الزر القديم ولافتته ولافتة الزائر التي اعتمد عليها شرط الخروج المبكر هنا؛ الشارة بالشريط العلوي هي الواجهة الوحيدة للحساب */
  const chipBtn = document.getElementById('accountChipBtn');
  if (currentUser){
    closeGate();
    const gchip = document.getElementById('guestChipBtn'); if (gchip) gchip.style.display = 'none';
    if (chipBtn){
      chipBtn.style.display = '';
      const nick = userListData.nickname || '';
      const av = document.getElementById('accountChipAv');
      av.textContent = avatarInitials(nick);
      av.style.background = avatarColor(nick);
      document.getElementById('accountChipLabel').textContent = nick || 'Account';
      refreshSuspendedBadge();
    }
  } else {
    if (chipBtn) chipBtn.style.display = 'none';
    const gchip2 = document.getElementById('guestChipBtn'); if (gchip2) gchip2.style.display = '';
    addrLoaded = false; addrData = {}; addrCities = []; closeChipMenu();
    // الخروج يعيد البوابة ولا يترك بيانات الحساب السابق معروضة (البوابة إلزامية — القرار ٢٠٢٦-٠٨-١٦-٠٨)
    activeTripId = null; activeTripAdded = []; activeTripAddedRefs = [];
    const atb = document.getElementById('activeTripBar'); if (atb) atb.classList.remove('show');
    userTrips = []; sharedTrips = []; tripsLoaded = false; currentTripId = null;
    sharedCityLists = []; myCityListData = null; myCityListLoadedFor = null;
    listBookmarksMap = null; tripSavesMap = null; viewingUserUid = null; plPanel = null; addrPanel = null;
    document.querySelectorAll('.modal-backdrop.show').forEach(function(b){ if (b.id !== 'authBackdrop') b.classList.remove('show'); });
    openGate();
  }
}

