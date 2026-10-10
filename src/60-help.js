/* =========================================================
   دليل الاستخدام (Help Guide) — نافذة ثابتة بالعربي/الإنجليزي، أقسام قابلة للطي
   ========================================================= */
let helpLang = 'en' // أ-١٢-٢: لغة الواجهة;
let helpOpenIndex = -1; let helpExpanded = false; // أ-١٢-٢: المستوى الثاني مطوي افتراضيًّا; // القسم المفتوح افتراضيًا (الأول)

const HELP_CONTENT = { // أ-١٢-٢ (نص المالك v2 المعتمد ١٦ سبتمبر — على الوضع النهائي): المستوى الأول شاشة واحدة، الثاني أقسام مطوية
  en: {
    title: 'MyPickz — one place for your places.', closeLabel: 'Close', readMore: 'Read more', readLess: 'Read less', gotIt: 'Got it — sign in',
    intro: {
      def: "One platform for four things: reaching your favorite places anywhere in the world, planning your trips, keeping your personal addresses, and exploring — and saving — other users' places and trips.",
      feats: 'Categorized on two levels · Nearby in 15-minute walks · A day route built for you · Export as a card with QR · Share with one person by name · Import your Google Maps lists · Follow curators · Your addresses, private.',
      dests: [
        ['Places', 'your favorite places, city by city, in categories. Paste a Maps link and the place fills itself in.'],
        ['Trips', 'a plan of your candidates, then a day route you can walk, with times between stops.'],
        ['Curators', 'active members whose favorites you may like: when to go, what to order, where to sit.'],
        ['Community', "other users' public lists and trips, by city and category."],
        ['Addresses', 'your personal addresses: home, work, family — never shared, never public.'] ],
      everywhere: '<b>Bookmark</b> what you like · <b>Save</b> a place or trip to your own world · <b>Export</b> a card or a message · <b>Share</b> a list, a trip, or a curator — publicly or with one person by name.',
      start: '<b>Start fast:</b> create your account, add a city, then paste your first Maps link — or import your saved Google Maps lists in one file.' },
    sections: [
      { id: 'places', h: 'Places', b: "Every place lives in one city and one sub-category (the tree is ours: cafés, dishes, cuisines, shopping, parks, squares, waterfronts, landmarks, family, stay, transport). Add a place from a Maps link: name and area fill in, the category is suggested, and the pin is placed for you — correct it with one drag. Your list shows sections you have content in, with counts. Filter by category, then sub-category. Switch <b>View: List · Nearby · Map</b> — <i>Nearby</i> groups your places into 15-minute walking clusters so you see everything around one spot." },
      { id: 'trips', h: 'Trips', b: "A trip has a <b>plan</b> — the places you're considering, by category, with a first and second option when you have more than one — and <b>day routes</b>. Tap <i>Build day route</i>, pick from the plan, and get up to three routes: shortest walk, widest variety, slowest pace. Times between stops are estimated; tap <i>Directions</i> for the exact way. Add places to a plan from any list — yours, a curator's, the community's — with the suitcase button." },
      { id: 'curators', h: 'Curators', b: "A curator's world is a showcase of their favorites, on top of their ordinary lists: cards with their own headings — <i>best time</i>, <i>what to order</i>, <i>where to sit</i> — a city card they keep updating, and <i>latest experiences</i>. Follow a curator to see what's new from them first. Browse their places and trips as they see them — read-only. Curators are invited by MyPickz or apply from their account; the badge means a space, not a rating." },
      { id: 'community', h: 'Community', b: "Other users' public lists and trips, by city — and who saved what. Filter by category and sub-category; open a list and save a place to your own — it keeps its source. Your list is private until you make it public; sharing by name with one person stays between you two." },
      { id: 'addresses', h: 'Addresses', b: 'Home, work, family, friends, clinics — your private book. Only you read it; nothing here ever appears in lists, trips, or the community. Paste from Maps, or type an address.' },
      { id: 'cards', h: 'Cards & sharing', b: "Any place, list, trip, or curator card can be exported as an image in the app's style — Arabic or English — with a QR code that opens it in MyPickz. Long lists split into several cards. Send it anywhere; whoever opens it can save what they like." },
      { id: 'import', h: 'Import', b: 'Export your saved lists from Google Maps (Takeout), upload the file, preview what will come in, choose a category per list, and import — duplicates are skipped, and what has no category lands in <i>Others</i> until you move it.' },
      { id: 'privacy', h: 'Your data & privacy', b: 'Your places are yours: download everything as an open file any time, import it back, and delete your account with all its traces. Location is used only when you tap <i>Nearest to me</i> and is never stored. Following is public to the person you follow. We use open map data with attribution and never copy from Google Maps — the link stays the door.' },
      { id: 'howto', h: 'How to copy a link & export your lists', b: '<b>A place link:</b> open the place in Google Maps → Share → Copy → back in MyPickz: ＋ Add place → Paste from Maps.<br><b>Your saved lists:</b> Google Takeout → select only "Maps (your places)" → download the file → MyPickz → Import.<br><b>On Android:</b> from Google Maps, Share → MyPickz directly.' },
      { id: 'settings', h: 'Settings', b: 'Home screen (auto or your choice) · my cities · export language · account.' },
      { id: 'home', h: 'Adding MyPickz to your Home Screen or Desktop, on mobile or computer', b: '1. Open the site in your browser (Safari or others)<br>2. Tap the Share button on mobile, or the options menu on desktop<br>3. Choose "Add to Home Screen" (mobile) or "Create Shortcut" (desktop)<br>4. Now you can open MyPickz with one tap, like any other app' }
    ]
  },
  ar: {
    title: 'MyPickz — مكان واحد لأماكنك.', closeLabel: 'إغلاق', readMore: 'المزيد', readLess: 'أقل', gotIt: 'فهمت — دخول',
    intro: {
      def: 'منصة واحدة لأربعة أشياء: الوصول إلى أماكنك المفضلة بأي مكان في العالم، تخطيط رحلاتك، حفظ عناوينك الخاصة، واستكشاف — وحفظ — أماكن المستخدمين الآخرين ورحلاتهم.',
      feats: 'مصنَّفة بمستويين · بالتقارب بنطاقات ربع ساعة · مسار يوم يُبنى لك · تصدير بطاقةً بـQR · مشاركة مع شخص بعينه بالاسم · استيراد قوائمك من خرائط جوجل · متابعة المنتقين · عناوينك خاصة.',
      dests: [
        ['الأماكن', 'أماكنك المفضلة مدينةً مدينة بالتصنيفات؛ الصق رابط الخرائط فيُملأ المكان بنفسه.'],
        ['الرحلات', 'خطة من مرشحيك ثم مسار يوم تمشيه بأزمنة بين المحطات.'],
        ['المنتقون', 'أعضاء نشطون قد تعجبك مفضلاتهم: متى تذهب وماذا تطلب وأين تجلس.'],
        ['المجتمع', 'قوائم المستخدمين الآخرين ورحلاتهم العامة بالمدينة والتصنيف.'],
        ['العناوين', 'عناوينك الخاصة: البيت والعمل والأهل — لا تُشارَك ولا تُنشر أبدًا.'] ],
      everywhere: '<b>تمييز</b> لما تحب · <b>حفظ</b> لمكان أو رحلة إلى عالمك · <b>تصدير</b> بطاقةً أو رسالة · <b>مشاركة</b> قائمة أو رحلة أو منتقٍ — علنًا أو مع شخص بعينه بالاسم.',
      start: '<b>ابدأ بسرعة:</b> أنشئ حسابك، أضف مدينة، ثم الصق أول رابط — أو استورد قوائمك المحفوظة بخرائط جوجل بملف واحد.' },
    sections: [
      { id: 'places', h: 'الأماكن', b: 'كل مكان بمدينة واحدة وفرعي واحد (الشجرة لنا: مقاهٍ · وجبات · مطابخ · تسوّق · حدائق · ساحات · واجهات بحرية · معالم · عائلة · إقامة · تنقل). أضف مكانًا من رابط الخرائط: يُملأ الاسم والمنطقة، ويُقترح التصنيف، ويُوضع الدبوس لك — صحّحه بسحبة. قائمتك تعرض الأقسام التي لك فيها محتوى بعدّاداتها. صفِّ بالتصنيف ثم الفرعي. بدّل العرض: قائمة · بالتقارب · خريطة — «بالتقارب» يجمع أماكنك بنطاقات مشي ربع ساعة فترى كل ما حول موضع واحد.' },
      { id: 'trips', h: 'الرحلات', b: 'للرحلة <b>خطة</b> — الأماكن التي تفكر فيها بالتصنيف، بخيار أول وثانٍ حين يتعدد — و<b>مسارات أيام</b>. اضغط «ابنِ مسار اليوم»، اختر من الخطة، واحصل على ثلاثة مسارات: الأقصر مشيًا · الأوسع تنوعًا · الأهدأ إيقاعًا. الأزمنة بين المحطات تقديرية؛ «الاتجاهات» للطريق الدقيق. أضف إلى الخطة من أي قائمة — قائمتك أو منتقٍ أو المجتمع — بزر الحقيبة.' },
      { id: 'curators', h: 'المنتقون', b: 'عالم المنتقي مساحة عرض لمفضلاته فوق قوائمه العادية: بطاقات بعناوينه — أفضل وقت · ماذا تطلب · أين تجلس — وبطاقة مدينة يحدّثها، وآخر التجارب. تابع منتقيًا ليصلك جديده أولًا. تصفّح أماكنه ورحلاته كما يراها — للعرض فقط. المنتقون يُدعون من MyPickz أو يطلبون من حسابهم؛ الشارة مساحة لا تقييم.' },
      { id: 'community', h: 'المجتمع', b: 'قوائم المستخدمين الآخرين ورحلاتهم العامة بالمدينة — ومن حفظ ماذا. صفِّ بالتصنيف والفرعي؛ افتح قائمة واحفظ مكانًا إلى قائمتك — يحتفظ بمصدره. قائمتك خاصة حتى تجعلها عامة؛ والمشاركة بالاسم مع شخص تبقى بينكما.' },
      { id: 'addresses', h: 'العناوين', b: 'البيت والعمل والأهل والأصدقاء والعيادات — دفترك الخاص. أنت وحدك تقرأه؛ لا شيء منه يظهر بالقوائم أو الرحلات أو المجتمع. الصق من الخرائط أو اكتب عنوانًا.' },
      { id: 'cards', h: 'البطاقات والمشاركة', b: 'أي مكان أو قائمة أو رحلة أو بطاقة منتقٍ تُصدَّر صورةً بهوية التطبيق — عربية أو إنجليزية — برمز QR يفتحها في MyPickz. القوائم الطويلة تنقسم بطاقات. أرسلها حيث شئت؛ من يفتحها يحفظ ما يحب.' },
      { id: 'import', h: 'الاستيراد', b: 'صدّر قوائمك المحفوظة من خرائط جوجل، ارفع الملف، عاين ما سيدخل، اختر تصنيفًا لكل قائمة، واستورد — المكرر يُتخطّى، وما بلا تصنيف يهبط في «أخرى» حتى تنقله.' },
      { id: 'privacy', h: 'بياناتك وخصوصيتك', b: 'أماكنك ملكك: نزّل كل بياناتك بملف مفتوح متى شئت، واستوردها، واحذف حسابك بكل أثره. الموقع يُستعمل عند ضغطك «الأقرب مني» فقط ولا يُخزَّن. المتابعة معلنة لمن تتابعه. نستعمل بيانات خرائط مفتوحة بنسبتها ولا ننسخ من خرائط جوجل — الرابط يبقى الباب.' },
      { id: 'howto', h: 'كيف تنسخ رابطًا وتصدّر قوائمك', b: '<b>رابط المكان:</b> افتح المكان بخرائط جوجل ← مشاركة ← نسخ ← بالتطبيق: ＋ Add place ← Paste from Maps.<br><b>قوائمك المحفوظة:</b> Google Takeout ← اختر «Maps (your places)» فقط ← نزّل الملف ← بالتطبيق: Import.<br><b>على أندرويد:</b> من خرائط جوجل، مشاركة ← MyPickz مباشرة.' },
      { id: 'settings', h: 'الإعدادات', b: 'الشاشة الرئيسية (تلقائي أو اختيارك) · مدني · لغة التصدير · الحساب.' },
      { id: 'home', h: 'إضافة MyPickz إلى سطح المكتب سواء في جهاز الجوال أو الكمبيوتر', b: '1. افتح الموقع من المتصفح (Safari أو غيره)<br>2. اضغط زر المشاركة (Share) على الجوال، أو قائمة الخيارات على الكمبيوتر<br>3. اختر "Add to Home Screen" (جوال) أو "Create Shortcut" (كمبيوتر)<br>4. الآن يمكنك فتح MyPickz بضغطة واحدة، تمامًا كأي تطبيق آخر' }
    ]
  }
};


function setHelpLang(lang){ /* ب-٢-٢-أ٢ (v3 · ١٤): مبدّل اللغة شريحتان مقطعيتان تحت رأس القشرة */
  helpLang = lang;
  document.getElementById('helpLangArBtn').classList.toggle('on', lang === 'ar');
  document.getElementById('helpLangEnBtn').classList.toggle('on', lang === 'en');
  renderHelpModal();
}

function toggleHelpSection(i){
  helpOpenIndex = (helpOpenIndex === i) ? -1 : i;
  renderHelpModal();
}

function renderHelpModal(){
  const data = HELP_CONTENT[helpLang];
  const dir = helpLang === 'ar' ? 'rtl' : 'ltr'; const al = helpLang === 'ar' ? 'right' : 'left';
  document.getElementById('helpTitle').textContent = data.title;
  const wrap = document.getElementById('helpSections');
  wrap.style.direction = dir; wrap.style.textAlign = al;
  const it = data.intro;
  let h = '<div class="help-l1" style="font-size:13px; line-height:1.75;">'
    + '<p style="margin:0 0 8px;">' + it.def + '</p>'
    + '<p class="help-feats" style="margin:0 0 10px; font-size:11.5px; font-weight:700; color:var(--saffron);">' + it.feats + '</p>'
    + '<ul style="margin:0 0 10px; padding-inline-start:18px;">' + it.dests.map(function(d){ return '<li style="margin:2px 0;"><b>' + d[0] + '</b> — ' + d[1] + '</li>'; }).join('') + '</ul>'
    + '<p style="margin:0 0 8px;">' + it.everywhere + '</p>'
    + '<p style="margin:0 0 10px;">' + it.start + '</p></div>'
    + '<button type="button" class="btn btn-ghost" style="margin:0 0 10px; padding:7px 14px; font-size:12px;" onclick="helpExpanded = !helpExpanded; renderHelpModal();">' + (helpExpanded ? data.readLess + ' <span class="arr">⌃</span>' : data.readMore + ' <span class="arr">⌄</span>') + '</button>';
  if (helpExpanded){
    h += data.sections.map((sec, i) => `
    <div style="border:1px solid var(--line); border-radius:10px; margin-bottom:8px; overflow:hidden; background:var(--ivory-bright);" id="help_sec_${sec.id}">
      <button type="button" onclick="toggleHelpSection(${i})" style="width:100%; text-align:${al}; background:var(--ivory-bright); border:none; padding:11px 14px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; color:var(--ink); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
        <span>${sec.h}</span><span style="font-size:11px; color:var(--brass);">${helpOpenIndex===i ? '▲' : '▼'}</span>
      </button>
      ${helpOpenIndex===i ? `<div style="padding:12px 14px; font-size:12.5px; line-height:1.9; color:var(--ink);">${sec.b}</div>` : ''}
    </div>`).join('');
  }
  wrap.innerHTML = h;
  wrap.innerHTML += '<div class="chipgrid c3" style="margin-top:6px;"><button type="button" class="pl-src" onclick="closeHelpModal(); copyLink();">🔗 Copy link</button><button type="button" class="pl-src" onclick="closeHelpModal(); showQR();">🀄 QR</button><a class="pl-src" href="mailto:mypickz.app@gmail.com?subject=MyPickz%20Feedback">✉️ Contact us</a></div>'; // ر٧٢-أ-١: «Share the app» داخل Help (المرجع §٧)
  const cb = document.getElementById('helpCloseBtn'); cb.textContent = currentUser ? data.closeLabel : data.gotIt; // أ-١٢-٢: للزائر «Got it — sign in»
}
function openHelpFor(tab){ // أ-١٢-٢: زر «؟» يفتح النبذة على قسم الوجهة الحالية
  const map = { Places: 'places', Trips: 'trips', Curators: 'curators', Community: 'community', Addresses: 'addresses' }; const id = map[tab] || null;
  helpExpanded = !!id; helpOpenIndex = id ? HELP_CONTENT[helpLang].sections.findIndex(function(x){ return x.id === id; }) : -1;
  openHelpModal(); if (id){ const el = document.getElementById('help_sec_' + id); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); }
}
const INTRO_SEEN_KEY = 'mypickz_intro_seen'; // أ-١٢-٢: علم محلي — أول فتح للرابط (الزائر يقرأ النبذة فقط ثم البوابة)
function introSeenLocally(){ try{ return localStorage.getItem(INTRO_SEEN_KEY) === '1'; }catch(e){ return true; } }
function markIntroSeen(){ try{ localStorage.setItem(INTRO_SEEN_KEY, '1'); }catch(e){} }
function openHelpModal(){
  if (helpOpenIndex === -1 && !helpExpanded) helpExpanded = false; // المستوى الأول أولًا
  renderHelpModal();
  document.getElementById('helpLangArBtn').classList.toggle('on', helpLang === 'ar');
  document.getElementById('helpLangEnBtn').classList.toggle('on', helpLang === 'en');
  const bk = document.getElementById('helpBackBtn'); if (bk) bk.classList.toggle('hidden', !window.__mpFromDrawer); /* ب-٢-٢-أ٢: Back يظهر حين تُفتح من الدرج فقط (من «؟» أو أول فتح: ✕ وزر الإغلاق) */
  document.getElementById('helpBackdrop').classList.add('show');
}
function closeHelpModal(){
  document.getElementById('helpBackdrop').classList.remove('show');
  if (!currentUser){ markIntroSeen(); if (!document.getElementById('authBackdrop').classList.contains('show')) openGate(); } // أ-١٢-٢: الزائر: النبذة ثم البوابة
}
// نبذة دليل الاستخدام تُفتح تلقائيًا مرة واحدة: فور إنشاء الحساب الجديد فقط (قرار المالك ١٧ أغسطس).
// كانت تفتح عند تحميل الصفحة لأي مسجَّل مرة بالجهاز (علم محلي) — أثرها العملي: تظهر بعد التحديث لا بعد التسجيل.
function openHelpAfterSignUp(){
  try{ runOnboardingIfNeeded(); }catch(e){}
}

