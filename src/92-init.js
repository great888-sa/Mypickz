(async function init(){
  await initFirebase();
  logTiming('Firebase SDK loaded + initialized');
  /* هـ-٥ (التحليل الجذري): مكتبة Firestore تغلق قناة الاستماع بعد ٦٠ ثانية بلا أهداف نشطة، وأول طلب بعدها يفتح قناة جديدة — وعلى iOS/Safari قد ينتظر فتحها ~٣٠ ثانية (اتصال ميت صامت). مستمع دائم على settings/app يُبقي هدفًا نشطًا فلا تُغلق القناة ولا تُعاد؛ كلفته قراءة واحدة بالجلسة */
  try{ mpData.settings.watchApp(function(){}, function(e){ if (typeof logTiming === 'function') logTiming('[NET] keep-alive listener error · ' + ((e && e.code) || e)); }); if (typeof logTiming === 'function') logTiming('[NET] keep-alive listener on settings/app'); }catch(e){ if (typeof logTiming === 'function') logTiming('[NET] keep-alive listener not started · ' + (e && e.message)); }
  // الطلبات دي مستقلة عن بعض — نشغلها بالتوازي بدل التتابع، يقلل وقت التحميل بشكل ملموس
  await Promise.all([
    loadOwnerUid(),
    loadCategoryTemplate()
  ]); /* ر٧٣-أب (١): الدليل الموروث ومحمّلاته أُزيلت — المدن من المعجم بـ«مدني» */
  logTiming('Initial app data loaded (ownerUid, categories)');
  if (auth) {
    mpData.auth.onChange(async (user) => {
      logTiming('onAuthStateChanged fired (auth state known) · ' + (user ? 'signed-in' : 'guest')); /* غ-١: الحدث يُسجَّل للزائر والمستخدم — الكلمة تميّزهما في السطر الأصفر (ق١٠-١٦-٠٣) */ document.body.classList.remove('auth-pending'); // r72s: الشاشات تظهر بعد معرفة الحالة — البوابة أولًا للزائر
      if (!user || !currentUser || user.uid !== currentUser.uid) resetSessionState(); // r72n (ملاحظة المالك ٣): لا أثر لحساب سابق قبل تحميل الجديد
      currentUser = user; if (user) mpHadUser = true; /* r115-ب */ try{ mpCardArrivalCount(); }catch(_){} /* r116-هـ: وصول برمز بطاقة يُعدّ الآن — بعد معرفة من الداخل وقبل أن يُستهلك الوصول */
      updateUserUI();
      syncOwnerMode(); // وضع المالك يتحدد هنا حصرًا: تطابق uid مع settings/app.ownerUid
      const tasks = [loadUserList(), registerUserRecord(), loadUserTrips(), loadSharedCityLists()]; // v1.40: مفكرات الأماكن تأتي مع userLists (placeBookmarks)
      if (isOwner) tasks.push(linkOwnerUid());
      await Promise.all(tasks);
      await syncCitiesFromCityLists(); // ز-١-ج-٢: «مدني» يشمل كل مدينة لي فيها قائمة (مثل قوائم الدليل المهاجَرة بمعرّف المعجم)
      logTiming('User data loaded (bookmarks, My List, Trips) — login features ready');
      resolveAuthReady();
      if (user){ try{ await mpSharerInit(); mpArrivalOpen(); }catch(_){} try{ mpShareInOpen(); }catch(_){} } /* r115-د (٥): رمز المشارك جاهز · والرابط يفتح محتواه بعد الدخول */
      try{ if (currentTab === 'Community') renderCommunityModal(); else if (currentTab === 'Curators') renderCuratorsBody(); else if (currentTab === 'Trips') renderTripsBody(); }catch(_){} /* r119: شاشة رُسمت قبل اكتمال تحميل الحساب تُعاد الآن بحاله (التمييز · الحفظ · المتابعة) */
      if (currentTab === 'Places') renderPlacesBody(); // خ٥/م٢-ج: أول تحميل واستعادة الجلسة والدخول والخروج — الوجهة الجديدة تتحدث مع كل تغيّر حالة
      enforceNickname(); // لا ننتظرها — تعمل فوق المحتوى الظاهر
    });
  } else {
    resolveAuthReady(); // ما فيش Firebase أصلًا — منعرقلش أي حاجة
  }
  captureShareParam(); // r70q: اختصار iOS
  if (!introSeenLocally()){ helpView = null; helpOpenTopic = ''; openHelpModal(); } // ر٧٠س-٣ (أ-١٢-٢): النبذة عند أول فتح تُفتح فورًا لا بعد اكتمال المصادقة (كانت تتأخر)
  trackVisit(); // لا ننتظرها، ما نأخر تحميل الصفحة
  mpTrack.captureSource(); try{ mpArrivalCapture(); }catch(_){} try{ mpShareInCapture(); }catch(_){} /* r116-ز: بعد قراءة معاملات الوصول — يلتقط المشارَك وينظّف العنوان */ try{ mpTrack.carryLoad(); }catch(_){} /* r115-د (١): ما بقي من عدّ الاستيراد على الجهاز يُرسل الآن */
  logTiming('Main screen ready');
  // نافذة تسجيل مبكرة: تظهر تلقائيًا للزائر غير المسجّل، مع محتوى المدينة ظاهر بالخلفية كسياق تحفيزي
  authReadyPromise.then(() => {
    if (!currentUser) {
      // حارس: لو فتح الزائر النافذة بنفسه وبدأ الكتابة قبل اكتمال التحميل، لا نعيد فتحها (كانت تمسح الإيميل/كلمة السر المُدخَلة)
      if (!document.getElementById('authBackdrop').classList.contains('show')) openGate(); else if (document.getElementById('authBackdrop').classList.contains('gate-mode')) gateSeen(); // خ١-ب: البوابة (المشهد ١) · r115 (مراجعة مستقلة): بوابة فُتحت قبل معرفة حال الدخول (إغلاق النبذة مبكرًا) لم تكن تُعدّ
      if (document.getElementById('helpBackdrop').classList.contains('show')) renderHelpModal(); // ر٧٠س-٣: النبذة فُتحت مبكرًا — يُحدَّث زرها بحسب الحالة
    }
  });
})();
