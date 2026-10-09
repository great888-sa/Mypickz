(async function init(){
  await initFirebase();
  logTiming('Firebase SDK loaded + initialized');
  // الطلبات دي مستقلة عن بعض — نشغلها بالتوازي بدل التتابع، يقلل وقت التحميل بشكل ملموس
  await Promise.all([
    loadOwnerUid(),
    loadCategoryTemplate()
  ]); /* ر٧٣-أب (١): الدليل الموروث ومحمّلاته أُزيلت — المدن من المعجم بـ«مدني» */
  logTiming('Initial app data loaded (ownerUid, categories)');
  if (auth) {
    mpData.auth.onChange(async (user) => {
      logTiming('onAuthStateChanged fired (auth state known)'); document.body.classList.remove('auth-pending'); // r72s: الشاشات تظهر بعد معرفة الحالة — البوابة أولًا للزائر
      if (!user || !currentUser || user.uid !== currentUser.uid) resetSessionState(); // r72n (ملاحظة المالك ٣): لا أثر لحساب سابق قبل تحميل الجديد
      currentUser = user;
      updateUserUI();
      syncOwnerMode(); // وضع المالك يتحدد هنا حصرًا: تطابق uid مع settings/app.ownerUid
      const tasks = [loadUserList(), registerUserRecord(), loadUserTrips(), loadSharedCityLists()]; // v1.40: مفكرات الأماكن تأتي مع userLists (placeBookmarks)
      if (isOwner) tasks.push(linkOwnerUid());
      await Promise.all(tasks);
      await syncCitiesFromMyLists(); // ز-١-ج-٢: «مدني» يشمل كل مدينة لي فيها قائمة (مثل قوائم الدليل المهاجَرة بمعرّف المعجم)
      logTiming('User data loaded (bookmarks, My List, Trips) — login features ready');
      resolveAuthReady();
      if (currentTab === 'Places') renderPlacesBody(); // خ٥/م٢-ج: أول تحميل واستعادة الجلسة والدخول والخروج — الوجهة الجديدة تتحدث مع كل تغيّر حالة
      enforceNickname(); // لا ننتظرها — تعمل فوق المحتوى الظاهر
    });
  } else {
    resolveAuthReady(); // ما فيش Firebase أصلًا — منعرقلش أي حاجة
  }
  captureShareParam(); // r70q: اختصار iOS
  if (!introSeenLocally()){ helpExpanded = false; helpOpenIndex = -1; openHelpModal(); } // ر٧٠س-٣ (أ-١٢-٢): النبذة عند أول فتح تُفتح فورًا لا بعد اكتمال المصادقة (كانت تتأخر)
  trackVisit(); // لا ننتظرها، ما نأخر تحميل الصفحة
  mpTrack.captureSource();
  logTiming('Main screen ready');
  // نافذة تسجيل مبكرة: تظهر تلقائيًا للزائر غير المسجّل، مع محتوى المدينة ظاهر بالخلفية كسياق تحفيزي
  authReadyPromise.then(() => {
    if (!currentUser) {
      // حارس: لو فتح الزائر النافذة بنفسه وبدأ الكتابة قبل اكتمال التحميل، لا نعيد فتحها (كانت تمسح الإيميل/كلمة السر المُدخَلة)
      if (!document.getElementById('authBackdrop').classList.contains('show')) openGate(); // خ١-ب: البوابة (المشهد ١)
      if (document.getElementById('helpBackdrop').classList.contains('show')) renderHelpModal(); // ر٧٠س-٣: النبذة فُتحت مبكرًا — يُحدَّث زرها بحسب الحالة
    }
  });
})();
