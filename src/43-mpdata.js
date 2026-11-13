/* =========================================================
   0.8) mpData — نواة طبقة العزل · تأسيس ٢٥ أغسطس ٢٠٢٦
   كل نداء منصة جديد يمر من هنا؛ لا نوع من أنواع المزوّد يخرج من الوحدة.
   النطاق: المفكرات والحفوظ وعدّاداتها (v1.40 — القرار ٠٩) والمصادقة والقوائم والرحلات — يتسع بكل دفعة.
   الوحدة لا تعرف الواجهة ولا تعرض رسائل؛ الأخطاء تُرمى للمستدعي كما هي.
   ========================================================= */
/* r105-ج (ق١١-٠٦-٠١ · الاقتراح الثالث): سطر رؤية موحّد في الشريط — VIS · <city> · public|private · shared N · <event> — يصدر عند الختم (الحفظ) والإصلاح (التحميل) والتركيب عند المشاهد؛ هو السطر الذي كان سيكشف عطل مونترو من أول نظرة */
function mpVisLine(cityId, flags, event){ try{ logTiming('VIS · ' + cityId + ' · ' + (flags && flags.public === true ? 'public' : 'private') + ' · shared ' + ((flags && Array.isArray(flags.sharedWith)) ? flags.sharedWith.length : 0) + ' · ' + event); }catch(_){} }
const mpData = (function(){
  const inc = function(n){ return firebase.firestore.FieldValue.increment(n); };
  function listDerived(data, verified){ /* r118-ب (ك-١ · قرار ١١ أكتوبر r75a): ★ علامة على المكان لكل مستخدم؛ الحقل المشتق hasTop يُكتب صحيحًا فقط لمنتقٍ موثَّق على قائمة عامة — القاعدة لا تقبل غيره، وكان يُكتب لكل من وضع ★ فيُرفض حفظ مدينته كلها */ // r72m (M4.25): hasTop · geoSources · flagsUsed من أماكن القائمة — تُكتب مع الحفظ، وتُحدَّث كلما تغيّرت الأماكن
    const cats = (data && data.categories && typeof data.categories === 'object') ? data.categories : null; if (!cats) return {};
    let hasTop = false; const geo = {}, flags = {};
    Object.keys(cats).forEach(function(k){ ((cats[k] && cats[k].places) || []).forEach(function(pl){ if (!pl) return; if (pl.topPlace === true) hasTop = true; if (pl.geo && pl.geo.source) geo[pl.geo.source] = true; (pl.flags || []).forEach(function(f){ flags[f] = true; }); }); });
    return { hasTop: hasTop && data.public === true && verified === true, geoSources: Object.keys(geo), flagsUsed: Object.keys(flags) };
  }
  const del = function(){ return firebase.firestore.FieldValue.delete(); };
  const col = function(name){ return db.collection(name); };
  // القرار ١٢: رفض النقص عند الصفر (الأرضية بالقواعد ٣٫٦) يُبتلع — السحب تم والعدّاد صفر؛ غيره يُرمى
  /* ═══ r118-و (ك-٧ · ص-٩ · ك-١٦ · ق١١-١٢-٠٢ · ق١١-١٢-٠٧): مستند ليس لي يُطبَّع عند القراءة ═══
     القواعد تضمن نوع الحقول العليا (v3.17 ٧) ولا تمرّ على عناصر المصفوفات، والمستندات السابقة لها قد تحمل أي شيء؛ ومن يكتب مباشرة يكتب ما شاء.
     فالقارئ لا يثق: حقل بنوع خاطئ يُعامل غائبًا · مدخل معطوب يُتجاوز · والاسم المعروض لا يُعرض حتى يثبت أن سجله في nicknames لصاحب المستند (البند ١٤ سُحب من القواعد: lower() فيها لا يطابق toLowerCase هنا — فالتحقق كله هنا بتحويل واحد).
     مستند واحد مشوَّه كان يُسقط Community لكل المستخدمين (index:[null] · nickname:5 · plan.days:[{}] · picks:5). */
  const GEO_SRC_OK = ['user_pin', 'fsq', 'overture', 'osm', 'user_paste'];
  const isObj = function(x){ return !!x && typeof x === 'object' && !Array.isArray(x); };
  const strOrDrop = function(o, keys){ keys.forEach(function(k){ if (k in o && o[k] != null && typeof o[k] !== 'string') delete o[k]; }); };
  const sanePlace = function(p){ if (!isObj(p)) return null; const o = Object.assign({}, p); strOrDrop(o, ['id', 'name', 'url', 'area', 'note', 'phone', 'town', 'addr', 'openId']);
    if ('picks' in o && !Array.isArray(o.picks)) delete o.picks; if ('flags' in o){ if (!Array.isArray(o.flags)) delete o.flags; else o.flags = o.flags.filter(function(f){ return typeof f === 'string'; }); }
    if ('geo' in o){ const g = o.geo; if (!isObj(g) || typeof g.lat !== 'number' || typeof g.lng !== 'number' || (g.source != null && GEO_SRC_OK.indexOf(g.source) < 0)) delete o.geo; } /* مصدر غريب كان ينتقل إلى من يحفظ المكان فيُرفض حفظ مدينته (geoSourcesOk) */
    return (o.name || o.url) ? o : null; };
  const sanePlaces = function(list){ return (Array.isArray(list) ? list : []).map(sanePlace).filter(Boolean); };
  const saneParent = function(d){ if (!isObj(d)) return d; const o = Object.assign({}, d); strOrDrop(o, ['cityName', 'cityId', 'ownerId', 'country']); if ('nickname' in o && typeof o.nickname !== 'string') o.nickname = null;
    if ('index' in o) o.index = (Array.isArray(o.index) ? o.index : []).filter(function(e){ return isObj(e) && typeof e.catId === 'string' && !!e.catId; }).map(function(e){ return (typeof e.name === 'string' && (e.id == null || typeof e.id === 'string')) ? e : Object.assign({}, e, { name: typeof e.name === 'string' ? e.name : '', id: typeof e.id === 'string' ? e.id : '' }); });
    if ('sharedWith' in o && !Array.isArray(o.sharedWith)) o.sharedWith = []; if ('sharedWithNames' in o && !isObj(o.sharedWithNames)) o.sharedWithNames = {}; return o; };
  const saneTrip = function(t){ if (!isObj(t)) return t; const o = Object.assign({}, t); delete o.ownerName; /* اسم صاحب الرحلة من ملفه دائمًا — المخزَّن فيها يكتبه من شاء */
    strOrDrop(o, ['title', 'cityName', 'customLabel', 'cityId', 'ownerId']); if ('sharedWith' in o && !Array.isArray(o.sharedWith)) o.sharedWith = []; if ('cities' in o) o.cities = (Array.isArray(o.cities) ? o.cities : []).filter(isObj);
    if ('plan' in o && o.plan != null){ if (!isObj(o.plan)) delete o.plan; else { const p = Object.assign({}, o.plan); p.days = (Array.isArray(p.days) ? p.days : []).filter(isObj); if ('tray' in p && !Array.isArray(p.tray)) p.tray = []; o.plan = p; try{ if (typeof tripPlanNormalize === 'function') tripPlanNormalize(o.plan); }catch(_){ delete o.plan; } } }
    if ('dayRoutes' in o && !isObj(o.dayRoutes) && !Array.isArray(o.dayRoutes)) delete o.dayRoutes; return o; };
  const saneProfile = function(d){ if (!isObj(d)) return d; const o = Object.assign({}, d); if ('nickname' in o && typeof o.nickname !== 'string') o.nickname = null; strOrDrop(o, ['tagline', 'bio', 'contactUrl']);
    if ('contact' in o && !(isObj(o.contact) && typeof o.contact.type === 'string' && typeof o.contact.value === 'string')) delete o.contact; if ('publicCityIds' in o) o.publicCityIds = (Array.isArray(o.publicCityIds) ? o.publicCityIds : []).filter(function(x){ return typeof x === 'string'; }); return o; };
  /* التحقق من الاسم المعروض (ق١١-١٢-٠٧): قراءة واحدة لكل اسم في الجلسة. غير المسجَّل لصاحب المستند يصير null (الواجهة تعرض «user»). فشل القراءة نفسها (شبكة) لا يُسقط الاسم — المتحايل لا يملك شبكة المشاهد. */
  const nickSeen = {};
  const nickOwner = function(name){ const key = String(name).trim().toLowerCase(); if (!key) return Promise.resolve(null); if (!nickSeen[key]) nickSeen[key] = col('nicknames').doc(key).get().then(function(d){ return d.exists ? ((d.data() || {}).uid || '') : ''; }, function(){ delete nickSeen[key]; return null; }); return nickSeen[key]; };
  const saneNames = async function(items){ /* items: [{ uid, obj }] — obj.nickname يُتحقَّق منه */ const mine = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null; let dropped = 0;
    await Promise.all((items || []).map(async function(it){ const o = it && it.obj; if (!o || typeof o.nickname !== 'string' || !o.nickname || !it.uid || it.uid === mine) return; const owner = await nickOwner(o.nickname); if (owner === null) return; if (owner !== it.uid){ o.nickname = null; o._nickUnverified = true; dropped++; } }));
    if (dropped) try{ logTiming('NAMES · ' + dropped + ' shown name(s) not registered to their owner — shown as user'); }catch(_){} return items; };
  /* r118-ج (ك-٢): عدّادات يحرّكها الآخرون — لا تُرسل في كتابة المالك أبدًا. كانت تُرسل كما حُمّلت، فإن تغيّر أحدها بفعل زائر رأت القاعدة أن المالك «غيّر العدّاد» ورفضت الحفظ كله حتى إعادة التحميل. */
  const OWNER_COUNTER_KEYS = ['favoriteCount', 'bookmarkCount', 'viewCount', 'copyCount', 'saveCount'];
  const stripCounters = function(d){ OWNER_COUNTER_KEYS.forEach(function(k){ delete d[k]; }); return d; };
  /* ═══ الدفعة ٢ (قواعد v3.17 ١١ · ك-٤ · ك-٥ · ص-٧ · ص-٨): باب واحد لكل سجل مربوط بعدّاده — المفكرة · حفظ الرحلة · نسخ القائمة والرحلة · المتابعة ═══
     القاعدة: السجل يُنشأ فقط مع +١ على عدّاده بالطلب نفسه، ويُحذف فقط مع −١ به، أو وحده حين لا عدّاد يُنقص (المصدر حُذف · العدّاد عند الصفر · المصدر لم يعد عامًّا ولا مشارَكًا معي · صاحب السجل موقوف).
     الباب يحاول الدفعة المربوطة أولًا. عند رفضها يقرأ ولا يخمّن: سجلي ثم المصدر؛ ثم إعادة واحدة بقيمة صريحة إن كان العدّاد قائمًا (ظهور increment لقاعدة السجل مقيس على المحرّك الرسمي لا على الخادم الحي)، وإلا السجل وحده.
     ما ترفضه القاعدة بعد ذلك يُرمى للمستدعي كما هو. كان swallowFloor يعيد «نجح» على كل رفض نقص: يزول السجل من الشاشة وهو باقٍ على الخادم (ك-٤).
     s: { rec · src · field · data() · mirror(b, on) أو null · open(بيانات المصدر) ⇒ هل يُعدّ لي عليه }
     on ⇒ 'counted' · 'already' (سجلي قائم — لا عدّ ثانٍ). off ⇒ 'uncounted' · 'released' (السجل وحده) · 'none' (لا سجل لي). */
  const selfUid = function(){ return (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null; };
  const denied = function(e){ return !!e && e.code === 'permission-denied'; };
  const soft = function(e){ return !!e && (e.code === 'permission-denied' || e.code === 'not-found'); }; /* رفض القاعدة، أو مصدر غاب بين القراءة والكتابة (العدّاد يُكتب بـupdate: لا يُنشئ مصدرًا غائبًا) */
  let ownerProbe = null; /* المراجعة الثانية: علم الصفحة isOwner يبقى false إن فشلت قراءة settings/app عند الإقلاع، والقواعد ما زالت تعامل الحساب مالكًا — حين لا يُعرف المالك يُسأل مرة في الجلسة */
  const bossNow = async function(){ try{ if (typeof isOwner !== 'undefined' && isOwner === true) return true; if (typeof ownerUid !== 'undefined' && ownerUid) return false; const me = selfUid(); if (!me) return false;
      if (!ownerProbe || ownerProbe.me !== me) ownerProbe = { me: me, p: col('settings').doc('app').get().then(function(d){ return d.exists ? ((d.data() || {}).ownerUid || null) : null; }) };
      return (await ownerProbe.p) === me; }catch(_){ ownerProbe = null; return false; } }; /* مالك التطبيق: القواعد تقبل كتاباته كلها (isOwner()) — فلا رفض يُبنى عليه؛ بابه يقرأ قبل أن يكتب (المراجعة المستقلة: كان يُنقص عدّادًا بلا سجل، وينزل به تحت الصفر، وينشئ ملفًّا شبحًا) */
  const kv = function(k, v){ const o = {}; o[k] = v; return o; };
  const pick = function(e, x){ return (x && !soft(x)) ? x : (e || x); }; /* خطأ لاحق غير الرفض (انقطاع) يُرمى هو — لا يُقال «لا صلاحية» لما تنفعه إعادة المحاولة (المراجعة الثانية) */
  const mirrorDirty = function(s){ try{ if (s.uid && typeof localStorage !== 'undefined' && localStorage) localStorage.setItem('mp_mirror_dirty_' + s.uid, '1'); }catch(_){ } }; /* المرآة لم تُكتب (الموقوف لا يكتب مستنده): علامة على الجهاز — تُطابَق عند التحميل (mpMirrorReconcile) */
  const mirrorAlone = async function(s, on){ if (!s.mirror) return; try{ const b = db.batch(); s.mirror(b, on); await b.commit(); }catch(_){ if (!on) mirrorDirty(s); } }; /* المرآة فهرس في مستندي — إصلاحها لا يُسقط الفعل */
  const recExists = function(s){ return s.exists ? s.exists() : s.rec.get().then(function(d){ return d.exists; }); };
  const srcRead = async function(s){ try{ const d = await s.src.get(); return d.exists ? (d.data() || {}) : null; }catch(e){ if (!denied(e)) throw e; return null; } }; /* null = غير موجود أو لا يُقرأ لي (حُذف · لم يعد عامًّا ولا مشارَكًا معي) — حالة إطلاق. غير الرفض (انقطاع) يُرمى: لا يُحكم على ما لم يُقرأ */
  const recAlone = async function(s){ /* السجل وحده: القاعدة تقبله في حالات الإطلاق الأربع فقط — في غيرها ترفضه فيُرمى رفضها (السجل باقٍ والمستدعي يعرف) */
    try{ const b = db.batch(); b.delete(s.rec); if (s.mirror) s.mirror(b, false); await b.commit(); }
    catch(e){ if (!denied(e) || !s.mirror) throw e; await s.rec.delete(); mirrorDirty(s); } /* الموقوف لا يكتب مرآته: السجل بطلبه وحده (حق الانسحاب) */
    return 'released'; };
  const boundOn = async function(s){
    const put = function(v){ const b = db.batch(); b.set(s.rec, s.data()); b.update(s.src, kv(s.field, v)); if (s.mirror) s.mirror(b, true); return b.commit(); };
    const look = async function(e){ /* يقرأ ولا يخمّن: سجلي ثم المصدر. e = الرفض الأصلي (يُرمى هو إن لم تُجب القراءة) */
      let mine = false, src = null;
      try{ mine = await recExists(s); }catch(x){ throw pick(e, x); }
      if (mine){ await mirrorAlone(s, true); return { state: 'already' }; }
      try{ src = await srcRead(s); }catch(x){ throw pick(e, x); }
      if (!src) throw e || Object.assign(new Error('source not found'), { code: 'not-found' });
      if (!s.open(src)){ const x = e || Object.assign(new Error('source is not open'), { code: 'permission-denied' }); try{ x.mpClosed = true; }catch(_){ } throw x; } /* المصدر قائم لكنه لا يُعدّ لي عليه (ليس عامًّا · لا محتوى عامًّا لصاحب الملف) — المستدعي يقول ذلك بنصّه */
      return { n: Number(src[s.field]) || 0 }; };
    const twice = async function(n, e0){ try{ await put(n + 1); return 'counted'; }catch(x){ throw pick(e0, x); } }; /* إعادة واحدة بقيمة صريحة */
    if (await bossNow()){ const r0 = await look(null); if (r0.state) return r0.state; try{ await put(inc(1)); return 'counted'; }catch(e){ if (!soft(e)) throw e; return twice(r0.n, e); } } /* قاعدة إنشاء السجل بلا استثناء للمالك: الإعادة الصريحة له أيضًا */
    try{ await put(inc(1)); return 'counted'; }
    catch(e){ if (!soft(e)) throw e; const r = await look(e); if (r.state) return r.state; return twice(r.n, e); }
  };
  const boundOff = async function(s){
    const take = function(v){ const b = db.batch(); b.delete(s.rec); b.update(s.src, kv(s.field, v)); if (s.mirror) s.mirror(b, false); return b.commit(); };
    const look = async function(e){ /* ⇒ { state: 'none' } أو { n }: ما يُنقَص فعلًا على المصدر (٠ = لا عدّاد يُنقص: غائب · لا يُقرأ · لم يعد مفتوحًا لي · عند الصفر) */
      let mine = false; try{ mine = await recExists(s); }catch(x){ throw pick(e, x); }
      if (!mine){ await mirrorAlone(s, false); return { state: 'none' }; } /* لا سجل لي: المرآة وحدها تُصحَّح */
      const src = await srcRead(s);
      return { n: (src && s.open(src)) ? Math.max(0, Number(src[s.field]) || 0) : 0 }; };
    if (await bossNow()){ const r0 = await look(null); if (r0.state) return r0.state; if (r0.n > 0){ await take(inc(-1)); return 'uncounted'; } return recAlone(s); } /* حذف المالك تقبله القواعد دائمًا (isOwner() في قاعدتَي السجل والعدّاد) — لا إعادة تلزمه هنا، بخلاف الإنشاء */
    try{ await take(inc(-1)); return 'uncounted'; }
    catch(e){ if (!soft(e)) throw e; const r = await look(e); if (r.state) return r.state;
      if (r.n > 0){ try{ await take(r.n - 1); return 'uncounted'; }catch(e3){ if (!soft(e3)) throw e3; } }
      return recAlone(s); }
  };
  const openDoc = function(uid){ return function(d){ return d.public === true || (Array.isArray(d.sharedWith) && d.sharedWith.indexOf(uid) >= 0); }; };
  const countable = function(d){ return d.hasAnyPublicContent === true || d.verified === true; };
  const tsNow = function(){ return firebase.firestore.FieldValue.serverTimestamp(); };
  const bmSpec = function(uid, listId, noMirror){ return { uid: uid, rec: col('listBookmarks').doc(uid + '__' + listId), src: col('userCityLists').doc(listId), field: 'bookmarkCount', data: function(){ return { at: tsNow() }; }, open: openDoc(uid),
    mirror: noMirror ? null : function(b, on){ const m = { listBookmarkIds: {} }; m.listBookmarkIds[listId] = on ? true : del(); b.set(col('userLists').doc(uid), m, { merge: true }); } }; }; /* ر٥٨: مرآة المعرّفات بمستندي — الاستعلام على السجلات غير مُثبَت بالقواعد قصدًا */
  const tsSpec = function(uid, tripId, noMirror){ return { uid: uid, rec: col('tripSaves').doc(uid + '__' + tripId), src: col('trips').doc(tripId), field: 'saveCount', data: function(){ return { at: tsNow() }; }, open: openDoc(uid),
    mirror: noMirror ? null : function(b, on){ const m = { tripSaveIds: {} }; m.tripSaveIds[tripId] = on ? true : del(); b.set(col('userLists').doc(uid), m, { merge: true }); } }; };
  const cpSpec = function(uid, kind, docKey){ return { rec: col('copies').doc(uid + '__' + docKey), src: col(kind === 'trip' ? 'trips' : 'userCityLists').doc(docKey), field: 'copyCount', data: function(){ return { uid: uid, kind: kind, docKey: docKey, at: tsNow() }; }, open: openDoc(uid), mirror: null }; };
  const flSpec = function(uid, curatorUid, noMirror){ return { uid: uid, rec: col('follows').doc(uid + '_' + curatorUid), src: col('communityProfiles').doc(curatorUid), field: 'followerCount', data: function(){ return { followerUid: uid, curatorUid: curatorUid, at: tsNow() }; }, open: countable,
    exists: function(){ return col('follows').where('followerUid', '==', uid).where('curatorUid', '==', curatorUid).get({ source: 'server' }).then(function(q){ let n = 0; q.forEach(function(d){ if (d.id === uid + '_' + curatorUid) n++; }); return n > 0; }); }, /* سجل المتابعة الغائب لا يُقرأ بمعرّفه (قاعدته تقرأ بياناته)، ورفض القراءة لا يثبت الغياب: الوجود يُسأل باستعلام يثبته شرط القاعدة — مساواتان بلا فهرس مركَّب، من الخادم (استعلام بلا شبكة يعود فارغًا من الذاكرة). سجل بمعرّف خارج الصيغة ليس سجل هذا الباب (يُحذف عند حذف الحساب). */
    mirror: noMirror ? null : function(b, on){ b.set(col('userLists').doc(uid), { following: on ? firebase.firestore.FieldValue.arrayUnion(curatorUid) : firebase.firestore.FieldValue.arrayRemove(curatorUid) }, { merge: true }); } }; };
  return {
    sane: { place: sanePlace, places: sanePlaces, parent: saneParent, trip: saneTrip, profile: saneProfile, names: saneNames, forgetNames: function(){ Object.keys(nickSeen).forEach(function(k){ delete nickSeen[k]; }); } }, /* r118-و */
    // v1.40 · القرار  ٦٩: مفكرة المكان توثيقيًّا داخل مستند المستخدم الخاص (لا عدّاد) — حقل placeBookmarks بـuserLists
    bookmarks: {
      setPlace: function(uid, pid, data){
        const patch = { placeBookmarks: {} };
        patch.placeBookmarks[pid] = (data === null) ? del() : data;
        return col('userLists').doc(uid).set(patch, { merge: true });
      },
      // مفكرة القائمة — سجل listBookmarks/{uid}__{listId} + عدّاد bookmarkCount مربوطًا بدفعة ذرّية واحدة (قواعد ٣٫٨)
      // بطاقة المصفوفة: الحقل الوحيد at والهوية بالمعرّف {uid}__{listId} — لا حقول تُستعلم («كم لا مَن»)
      toggleList: function(uid, ownerUid, cityId, on, o){ /* الدفعة ٢: من الباب الواحد — يعيد حال ما جرى (counted · already · uncounted · released · none)؛ o.noMirror: حذف الحساب (المستند الأم يُحذف بعدها) */
        const s0 = bmSpec(uid, ownerUid + '_' + cityId, !!(o && o.noMirror)); return on ? boundOn(s0) : boundOff(s0);
      }
    },
    // حفظ الرحلة — سجل tripSaves/{uid}__{tripId} + عدّاد saveCount مربوطًا (قواعد ٣٫٨)
    tripSaves: {
      // بطاقة المصفوفة: «بنفس أحكام سجل المفكرة حرفيًّا» — الحقل الوحيد at
      toggle: function(uid, tripId, on, o){ /* الدفعة ٢: من الباب الواحد (كالمفكرة حرفيًّا) */
        const s0 = tsSpec(uid, tripId, !!(o && o.noMirror)); return on ? boundOn(s0) : boundOff(s0);
      },
      // ر٦١ (التسوية): مفكرة رحلتك الذاتية — خريطة بمستندك، بلا عدّاد وبلا سجل (نمط مفكرة المكان)
      setSelf: function(uid, tripId, on){
        const patch = { tripSelfBookmarks: {} };
        patch.tripSelfBookmarks[tripId] = on ? true : firebase.firestore.FieldValue.delete();
        return col('userLists').doc(uid).set(patch, { merge: true });
      }
    },
    placeCounts: {
      // v1.40 · القرار ٠٩: placeFavoriteCounts دلالتها عدّاد الحفظ (saved by) — كاتبها فعل Save بالمرحلة الثالثة
      top: async function(limit){
        const snap = await col('placeFavoriteCounts').orderBy('count', 'desc').limit(limit || 30).get();
        const rows = []; snap.forEach(function(doc){ const d = doc.data(); if (d && d.count > 0) rows.push(d); }); return rows;
      },
      /* r116-أ (ق١١-١١-١٢): عدّادات مدينة واحدة — مساواة على city بلا ترتيب في الاستعلام (لا فهرس جديد)، والترتيب بالعدد هنا. السقف ١٠٠ مستند: مدينة تجاوزته تعطي عيّنة لا القمة (حدّ معلن). */
      inCity: async function(cityId){
        const snap = await col('placeFavoriteCounts').where('city', '==', String(cityId)).limit(100).get();
        const rows = []; snap.forEach(function(doc){ const d = doc.data(); if (d && d.count > 0 && d.url) rows.push({ name: String(d.name || ''), url: String(d.url), count: d.count }); });
        rows.sort(function(a, b){ return (b.count - a.count) || a.name.localeCompare(b.name); }); return rows;
      },
      /* r117-أ (ق١١-١١-١٥ · ق١١-١١-١٨ · قواعد v3.16): العدّاد مربوط بسجل صاحبه copies/<uid>__p_<docId> في الاتجاهين — +١ يُقبل فقط حين يُنشأ السجل بالدفعة نفسها، و−١ فقط حين يُحذف بها؛ والسجل لا يُنشأ ولا يُحذف إلا مع حركة عدّاده (كان bump: كتابة حرّة يزوّرها أي مسجَّل زيادةً ونقصًا).
         bind ⇒ true: عُدّ الآن · false: سجلي قائم (عُدّت من قبل — الحافظ الواحد لا يُعدّ مرتين). unbind ⇒ true: نقص وحُذف سجلي · false: لا سجل لي أو لا عدّاد يُنقص.
         الحركة تُكتب أولًا بـincrement؛ فإن رُفضت والعدّاد قائم تُعاد مرة بقيمة صريحة (المقروء ±١): قاعدة السجل تقرأ العدّاد بعد الطلب (getAfter)، وظهور increment لها لم يُقَس على الخادم الحي — القيمة الصريحة تُرى يقينًا. */
      bind: async function(uid, docId, name, url, city){
        const rec = col('copies').doc(uid + '__p_' + docId), ref = col('placeFavoriteCounts').doc(docId);
        const put = function(fill){ const b = db.batch(); b.set(rec, { uid: uid, kind: 'place', docKey: 'p_' + docId, at: firebase.firestore.FieldValue.serverTimestamp() }); fill(b); return b.commit(); };
        for (let round = 0; ; round++){
          try{ await put(function(b){ b.update(ref, { count: inc(1) }); }); return true; }
          catch(e){
            // الدفعة تُرفض في حالين مشروعتين: سجلي قائم (عُدّت من قبل) أو العدّاد غائب (المنصة تقيّم القاعدة قبل الوجود ⇒ permission-denied لا "غير موجود"). قراءتان معًا على مسار الفشل وحده.
            const got = await Promise.all([rec.get(), ref.get()]);
            if (got[0].exists) return false;
            if (got[1].exists){ const n = Number((got[1].data() || {}).count) || 0; try{ await put(function(b){ b.update(ref, { count: n + 1 }); }); return true; }catch(e1){ throw e; } } /* العدّاد قائم ولا سجل لي: محاولة واحدة بقيمة صريحة ثم الخطأ الأصلي */
          }
          /* العدّاد يحمل مدينته عند إنشائه (معرّف المعجم أو الجزيرة فقط — r116-أ). قواعد أقدم لم تُنشر بعدها النشرة ترفض الحقل: يُنشأ بلا مدينة كما كان، فلا يضيع العدّ. */
          const withCity = (city && /^(\d{3,9}|i_[a-z0-9_]{2,30})$/.test(String(city)));
          try{
            if (withCity){ try{ await put(function(b){ b.set(ref, { name: name, url: url, count: 1, city: String(city) }); }); return true; }catch(e2){ if (!e2 || e2.code !== 'permission-denied') throw e2; } }
            await put(function(b){ b.set(ref, { name: name, url: url, count: 1 }); }); return true;
          }catch(e3){ if (round) throw e3; /* حافظ آخر سبقني إلى إنشاء العدّاد بين قراءتي وكتابتي: جولة ثانية واحدة بالتحديث */ }
        }
      },
      has: async function(uid, docId){ return (await col('copies').doc(uid + '__p_' + docId).get()).exists; }, /* سجلي على هذا العدّاد قائم؟ (قراءة بالمعرّف) */
      unbind: async function(uid, docId){
        const rec = col('copies').doc(uid + '__p_' + docId), ref = col('placeFavoriteCounts').doc(docId);
        if (!(await rec.get()).exists) return false;
        const take = function(v){ const b = db.batch(); b.delete(rec); b.update(ref, { count: v }); return b.commit(); };
        if (await bossNow()){ const s0 = await ref.get(); if (!s0.exists || (Number((s0.data() || {}).count) || 0) <= 0){ await rec.delete(); return false; } } /* مالك التطبيق: القاعدة تقبل نقصه تحت الصفر — يُقرأ العدّاد قبل الكتابة (المراجعة المستقلة · شقيق) */
        const soft = function(e){ return !!e && (e.code === 'permission-denied' || e.code === 'not-found'); }; /* رفض القاعدة أو غياب العدّاد — غيرهما (شبكة) يُرمى ليُعاد لاحقًا */
        try{ await take(inc(-1)); return true; }
        catch(e){ if (!soft(e)) throw e;
          const snap = await ref.get(); const n = snap.exists ? (Number((snap.data() || {}).count) || 0) : 0;
          if (snap.exists && n > 0){ await take(n - 1); return true; } /* العدّاد قائم وفوق الصفر: محاولة واحدة بقيمة صريحة — إن رُفضت يُرمى الخطأ والسجل باقٍ */
          await rec.delete(); return false; } /* العدّاد غائب أو عند الصفر: السجل يُحذف وحده (القاعدة تقبله) — يتيمٌ باقٍ كان سيمنع عدّي من جديد */
      }
    },
    mirrors: { /* الدفعة ٢ (ص-٧): مطابقة مرايا مستندي بسجلاتي — للموقوف الذي سحب ولم يستطع كتابة مرآته. قراءة بالمعرّف لكل مدخل؛ سجل المتابعة الغائب يُرفض (قاعدته تقرأ بياناته) فالرفض على معرّفي = غائب. */
      gone: async function(uid, ul){ /* قراءة بالمعرّف لكل مدخل مفكرة وحفظ (الغائب يُقرأ «غير موجود» لصاحب بادئته) · والمتابعات باستعلام واحد يثبته شرط القاعدة (سجلها الغائب لا يُقرأ بمعرّفه، ورفض القراءة لا يثبت الغياب). أي خطأ يُرمى: لا يُسقط مدخل لم يثبت غياب سجله. */
        const out = { lists: [], trips: [], follows: [] }; const ex = async function(c, id){ return (await col(c).doc(id).get()).exists; };
        const lids = Object.keys((ul && ul.listBookmarkIds) || {}).filter(function(id){ return ul.listBookmarkIds[id]; }), tids = Object.keys((ul && ul.tripSaveIds) || {}).filter(function(id){ return ul.tripSaveIds[id]; }), fol = (ul && Array.isArray(ul.following)) ? ul.following : [];
        const got = await Promise.all([Promise.all(lids.map(function(id){ return ex('listBookmarks', uid + '__' + id); })), Promise.all(tids.map(function(id){ return ex('tripSaves', uid + '__' + id); })),
          fol.length ? col('follows').where('followerUid', '==', uid).get({ source: 'server' }).then(function(q){ const have = {}; q.forEach(function(d){ const c = String(((d.data() || {}).curatorUid) || ''); if (d.id === uid + '_' + c) have[c] = true; }); return have; }) : Promise.resolve({})]);
        lids.forEach(function(id, i){ if (!got[0][i]) out.lists.push(id); }); tids.forEach(function(id, i){ if (!got[1][i]) out.trips.push(id); }); fol.forEach(function(c){ if (!got[2][c]) out.follows.push(c); });
        out.checked = lids.length + tids.length + fol.length; return out;
      },
      drop: function(uid, gone){ const m = {}; if (gone.lists.length){ m.listBookmarkIds = {}; gone.lists.forEach(function(id){ m.listBookmarkIds[id] = del(); }); } if (gone.trips.length){ m.tripSaveIds = {}; gone.trips.forEach(function(id){ m.tripSaveIds[id] = del(); }); }
        if (gone.follows.length) m.following = firebase.firestore.FieldValue.arrayRemove.apply(null, gone.follows); return col('userLists').doc(uid).set(m, { merge: true }); }
    },
    userLists: {
      remove: function(uid){ return col('userLists').doc(uid).delete(); },
      merge: function(uid, data){ return col('userLists').doc(uid).set(data, { merge: true }); },
      /* و-١: قراءة الهوية من الخادم حصرًا — حين تتعثّر القناة ترفض (unavailable) بدل أن تعود بمستند فارغ من الذاكرة (firestore_client.ts ٧٥٧–٧٩٤)، فلا يظهر المستخدم القائم كأنه جديد (نافذة الاسم · الدليل) */
      getServer: function(uid){ return col('userLists').doc(uid).get({ source: 'server' }); },
      // خ٢: فهرس المدن التي فيها عناوين خاصة — قراءة واحدة بدل مسح المدن كلها
      addPrivateCity: function(uid, cityId){ return col('userLists').doc(uid).set({ privateCities: firebase.firestore.FieldValue.arrayUnion(cityId) }, { merge: true }); }
    },
    users: {
      all: async function(){ const snap = await col('users').get(); const rows = []; snap.forEach(function(d){ rows.push({ uid: d.id, ...d.data() }); }); return rows; }, // ر٧٢-أ-١ب (المالك)
      remove: function(uid){ return col('users').doc(uid).delete(); }, // ر٥٩
      flag: function(uid, field){
        const d = {}; d[field] = true;
        return col('users').doc(uid).set(d, { merge: true });
      },
      merge: function(uid, data){ return col('users').doc(uid).set(data, { merge: true }); },
      get: function(uid){ return col('users').doc(uid).get(); } /* ر٧٣-أب (٢) */
    },
    lists: {
      // v1.40 · ق٣-٠٧: favoriteCount مجمّد بالقواعد ٣٫٨ — لا كاتب له بالكود
      // عدّاد مشاهدات القائمة (ق٠١-١٩ — فُتح بـ٣٫٨): زائر يفتح قائمة شخص
      bumpView: function(ownerUid, cityId){
        if (selfUid() === ownerUid) return Promise.resolve(false); /* الدفعة ٢ (ك-١١): صاحبها لا يُعدّ — القاعدة ترفضه، فلا يُرسل */
        return col('userCityLists').doc(ownerUid + '_' + cityId).update({ viewCount: inc(1) }).catch(function(){}); /* update: لا يُنشئ مستندًا غائبًا (القاعدة تقبل إنشاء مالك التطبيق — شقيق الملف الشبح) */
      }
    },
    listDerived: listDerived, // r72m: مُصدَّرة للمحاكاة
    ownerForget: function(){ ownerProbe = null; }, /* تبدّل الحساب: سؤال «أأنا المالك؟» يُعاد */
    fieldInc: function(n){ return inc(n); }, /* ر٧٣-أب (٢) */
    fieldDelete: function(){ return firebase.firestore.FieldValue.delete(); }, // ر٧٢-أ-١ح: حذف حقل عبر الطبقة (تنظيف الآثار)
    copies: { // r72m (M4.25 ٤): سجل النسخ بإسناد — +١ على المصدر بوجود السجل
      record: function(uid, kind, docKey){ return boundOn(cpSpec(uid, kind, docKey)); }, /* الدفعة ٢: من الباب الواحد — 'counted' أو 'already' (ناسخ واحد = واحد مهما كرّر) */
      removeMine: async function(uid){ /* r72t (M4.26 ٢) · r117-أ · الدفعة ٢ (قواعد v3.17 ١١): كل سجل مربوط يُطلق من بابه وبطلبه — سجل حفظ المكان (docKey = p_<معرّف العدّاد>) بـunbind، وسجل نسخ القائمة والرحلة بالباب الواحد (−١ على مصدره، أو السجل وحده حين لا عدّاد يُنقص)؛ فرفض واحد لا يُسقط البقية. كانت سجلات القائمة والرحلة تُحذف دفعات ١٥ بلا عدّاد: القاعدة ترفض الدفعة كلها لسجل واحد مربوط. سجل نسخ المكان المفرد (إسناد بلا عدّاد) يُحذف دفعات صغيرة كما كان. يعيد عدد ما بقي مرفوضًا. */
        const snap = await col('copies').where('uid', '==', uid).get(); const plain = [], saved = [], bound = []; let left = 0;
        snap.forEach(function(d){ const x = d.data() || {}; const k = String(x.docKey || '');
          if (/^p_[a-f0-9]{16}$/.test(k) && d.id === uid + '__' + k) saved.push(k.slice(2));
          else if ((x.kind === 'list' || x.kind === 'trip') && d.id === uid + '__' + k) bound.push({ kind: x.kind, key: k });
          else plain.push(d.id); });
        for (const id of saved){ try{ await mpData.placeCounts.unbind(uid, id); }catch(_){ left++; } }
        for (const r of bound){ try{ await boundOff(cpSpec(uid, r.kind, r.key)); }catch(_){ left++; } }
        for (let i = 0; i < plain.length; i += 15){ const b = db.batch(); plain.slice(i, i + 15).forEach(function(id){ b.delete(col('copies').doc(id)); }); try{ await b.commit(); }catch(_){ left += Math.min(15, plain.length - i); } }
        return left;
      },
      recordOnly: function(uid, kind, docKey){ return col('copies').doc(uid + '__' + docKey).set({ uid: uid, kind: kind, docKey: docKey, at: firebase.firestore.FieldValue.serverTimestamp() }); }, // ز-١-ب: نسخ المكان — سجل بلا عدّاد (العدّاد للقائمة والرحلة)
      unrecord: function(uid, kind, docKey){ return boundOff(cpSpec(uid, kind, docKey)); } /* r72t (M4.26 ١ — قرار المالك «لحظي») · الدفعة ٢: من الباب الواحد — 'uncounted' · 'released' · 'none' */
    },
    profiles: {
      curators: async function(limit){ // ر٧٢-أ-١: الدليل — الملفات العامة الموثَّقة (verified يكتبه المالك حصرًا — M4.12)
        const snap = await col('communityProfiles').where('verified', '==', true).limit(limit || 200).get();
        const rows = []; snap.forEach(function(d){ rows.push(saneProfile({ uid: d.id, ...d.data() })); }); await saneNames(rows.map(function(r){ return { uid: r.uid, obj: r }; })); return rows; /* r118-و */
      },
      get: async function(uid){ const d = await col('communityProfiles').doc(uid).get(); if (!d.exists) return null; const r = saneProfile({ uid: uid, ...d.data() }); await saneNames([{ uid: uid, obj: r }]); return r; }, /* r118-و */ // ر٦٥: قراءة ملف واحد (صيد طبقة الشاشة)
      merge: function(uid, data){ return col('communityProfiles').doc(uid).set(data, { merge: true }); },
      remove: function(uid){ return col('communityProfiles').doc(uid).delete(); }
    },
    // ر٥٩ — الحذف التسلسلي: متابعاتي (القراءة بشرط حقل المتابع — استعلام قابل للإثبات)
    follows: {
      set: async function(followerUid, curatorUid, on, o){ /* الدفعة ٢ (قواعد v3.17 ١١ · ق٣-١): من الباب الواحد — المتابعة معدودة دائمًا: القاعدة تقبلها فقط لمن له محتوى عام أو موثَّق، والصفة تُقرأ من ملفه نفسه عند الرفض (كانت تُؤخذ من قائمة المنتقين المحمَّلة: من ليس فيها تُسجَّل متابعته بلا عدّ ولو كان ملفه عامًّا). يعيد { state, counter }: counter ⇒ العدّاد تحرّك الآن. */
        const s0 = flSpec(followerUid, curatorUid, !!(o && o.noMirror)); const state = on ? await boundOn(s0) : await boundOff(s0);
        return { state: state, counter: state === 'counted' || state === 'uncounted' };
      },
      followersOf: async function(curatorUid, limit){ const snap = await col('follows').where('curatorUid', '==', curatorUid).limit(limit || 50).get(); const ids = []; snap.forEach(function(d){ ids.push(d.data().followerUid); }); return ids; }, // للمنتقي عن نفسه (القواعد: الطرفان)
      releaseMine: async function(uid){ /* الدفعة ٢: حذف الحساب — كل متابعة تُطلق من الباب (−١ على عدّاد المتابَع، أو السجل وحده حين لا عدّاد يُنقص). كان يحذف السجلات وحدها: القاعدة v3.17 ترفضه والعدّاد فوق الصفر، فيبقى الحساب المحذوف معدودًا. يعيد عدد ما بقي مرفوضًا. */
        const snap = await col('follows').where('followerUid', '==', uid).get(); const ids = []; let left = 0;
        const stray = []; snap.forEach(function(d){ const c = String(((d.data() || {}).curatorUid) || ''); if (c && d.id === uid + '_' + c) ids.push(c); else stray.push(d.id); });
        for (const c of ids){ try{ await boundOff(flSpec(uid, c, true)); }catch(_){ left++; } }
        for (const id of stray){ try{ await col('follows').doc(id).delete(); }catch(_){ left++; } } /* سجل بمعرّف خارج الصيغة (قبل v3.17): لا عدّاد يُعرف له — يُحذف وحده إن قبلته القاعدة */
        return left;
      }
    },
    // ٢/أ (٢٦ أغسطس): المصادقة عبر النواة — لا نداء مصادقة مباشرًا خارجها (الحارس يعدّها بسقف صفر)
    cityNotes: { // r72p (M4.25 ٦): رأي المنتقي بالمدينة
      get: async function(uid, cityId){ const d = await col('curatorCityNotes').doc(uid + '__' + cityId).get(); return d.exists ? d.data() : null; },
      save: function(uid, cityId, data){ return col('curatorCityNotes').doc(uid + '__' + cityId).set(Object.assign({ uid: uid, cityId: cityId, updatedAt: Date.now() }, data)); },
      removeMine: async function(uid){ /* الدفعة ٢ (بقايا حذف الحساب): رأيي في المدن كان يبقى مقروءًا لكل مسجَّل بعد حذف حسابي */
        const snap = await col('curatorCityNotes').where('uid', '==', uid).get(); const ids = []; snap.forEach(function(d){ if (String(d.id).split('__')[0] === uid) ids.push(d.id); });
        for (let i = 0; i < ids.length; i += 15){ const b = db.batch(); ids.slice(i, i + 15).forEach(function(id){ b.delete(col('curatorCityNotes').doc(id)); }); await b.commit(); }
        return ids.length;
      }
    },
    requests: { // r72p (M4.25 ٧): طلب الصيرورة
      mine: async function(uid){ const d = await col('curatorRequests').doc(uid).get(); return d.exists ? d.data() : null; },
      create: function(uid, text){ return col('curatorRequests').doc(uid).set({ uid: uid, text: text, at: Date.now(), status: 'pending' }); },
      all: async function(){ const snap = await col('curatorRequests').get(); const rows = []; snap.forEach(function(d){ rows.push({ id: d.id, ...d.data() }); }); return rows; },
      setStatus: function(uid, status){ return col('curatorRequests').doc(uid).update({ status: status }); },
      removeMine: function(uid){ return col('curatorRequests').doc(uid).delete(); }, // r72t (M4.26 ٢)
      again: function(uid, text){ return col('curatorRequests').doc(uid).update({ status: 'pending', text: text, at: Date.now() }); } /* r118-ط (ص-١٠ · قواعد v3.17 ١٣): المرفوض يعيد طلبه بعد أسبوع بتعديل مستنده */
    },
    reports: { // r72p (M4.25 ٧): البلاغات
      create: function(by, kind, docKey, reason){ const rec = { by: by, kind: kind, reason: reason || '', at: Date.now() }; if (kind !== 'app') rec.docKey = docKey; return col('reports').doc('r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)).set(rec); }, // r72t: app بلا docKey
      all: async function(){ const snap = await col('reports').get(); const rows = []; snap.forEach(function(d){ rows.push({ id: d.id, ...d.data() }); }); return rows; },
      remove: function(id){ return col('reports').doc(id).delete(); },
      removeMine: async function(uid){ /* r72t (M4.26 ٢) · الدفعة ٢ (قواعد v3.17 ١٢ — القراءة لصاحب البلاغ: الاستعلام كان مرفوضًا فتبقى بلاغاتي كلها): دفعات ١٥ (القاعدة تقرأ لكل حذف) */
        const snap = await col('reports').where('by', '==', uid).get(); const ids = []; snap.forEach(function(d){ ids.push(d.id); });
        for (let i = 0; i < ids.length; i += 15){ const b = db.batch(); ids.slice(i, i + 15).forEach(function(id){ b.delete(col('reports').doc(id)); }); await b.commit(); }
        return ids.length;
      }
    },
    auth: {
      sendVerification: function(){ return auth.currentUser ? auth.currentUser.sendEmailVerification() : Promise.reject(new Error('no user')); }, // r72p (١٠)
      signIn: function(email, pass){ return auth.signInWithEmailAndPassword(email, pass); },
      signUp: function(email, pass){ return auth.createUserWithEmailAndPassword(email, pass); },
      sendReset: function(email){ return auth.sendPasswordResetEmail(email); },
      signOut: function(){ return auth.signOut(); },
      deleteSelf: function(){ return auth.currentUser.delete(); }, // ر٥٩ — خاتمة التتالي (بعد إعادة التوثيق)
      onChange: function(cb){ return auth.onAuthStateChanged(cb); },
      // تأكيد الهوية بكلمة السر (المسار الأول) — المسار الثاني (المزوّد) يُضاف بـ٢/و
      reauthWithPassword: function(pass){
        const u = auth.currentUser;
        if (!u || !u.email) return Promise.reject(new Error('no-user'));
        const cred = firebase.auth.EmailAuthProvider.credential(u.email, pass);
        return u.reauthenticateWithCredential(cred);
      }
    },
    // v3.6 (القرار ٣-ب): المجموعة الخاصة — قراءتها وكتابتها لصاحبها وحده
    privatePlaces: {
      get: async function(uid, cityId){
        const d = await col('userPrivatePlaces').doc(uid + '_' + cityId).get();
        return d.exists ? (d.data().categories || {}) : {};
      },
      save: function(uid, cityId, categories){
        return col('userPrivatePlaces').doc(uid + '_' + cityId).set({ categories: categories, updatedAt: Date.now() }, { merge: true });
      },
      // خ٢: استبدال تصنيف كاملًا (لحذف عنوان) — الكتابة بمسار منقوط تستبدل المصفوفة لا تدمجها
      setCategory: function(uid, cityId, catId, entry){ /* r118-أ (خ-٣ — مقيس على المحرّك ١٢ نوفمبر: IS WIPED): كانت تكتب categories: {} بالدمج ثم تحدّث — والخريطة الفارغة في الدمج تستبدل الحقل كله، فتُمسح بقية التصنيفات الخاصة للمدينة.
           الآن كتابة واحدة بالدمج تحمل التصنيف المعنيّ وحده: مفتاحا مدخله (active · places) قيمتان ورقيتان فتُستبدلان، والمصفوفة تُستبدل ولا تُدمج — وما سواه لا يُمسّ. */
        const c = {}; c[catId] = { active: !(entry && entry.active === false), places: (entry && Array.isArray(entry.places)) ? entry.places : [] };
        return col('userPrivatePlaces').doc(uid + '_' + cityId).set({ categories: c, updatedAt: Date.now() }, { merge: true });
      },
      // خ٥/r18: حذف المستند الخاص لمدينة عند حذفها نهائيًا
      remove: function(uid, cityId){
        return col('userPrivatePlaces').doc(uid + '_' + cityId).delete();
      }
    },
    nicknames: { // خ٥/م٢-ب (هجرة انتهازية — التصور المعتمد): قراءة اسم مستعار للمشاركة بالاسم
      get: function(key){ return col('nicknames').doc(key).get(); },
      set: function(key, data){ return col('nicknames').doc(key).set(data); }, /* ر٧٣-أب (٢) */
      remove: function(key){ return col('nicknames').doc(key).delete(); }, // ر٥٩ (نشرة التنظيف: حذف ذاتي بحقل الهوية)
      /* r118-و (ق١١-١٢-٠٧): سجل اسمي قائم وصحيح — القارئ عند غيري لا يعرض اسمًا بلا سجل لصاحبه، فحساب قديم نقص سجله يظهر «user» حتى يُكمَّل. يُنادى عند الدخول وعند إعادة حفظ الاسم نفسه.
         يعيد: ok (قائم لي) · created (كان غائبًا) · fixed (لي بحقل ناقص) · conflict (لغيري — لا يُمسّ؛ صاحب الحساب يختار اسمًا آخر). */
      ensure: async function(uid, nickname){ const name = String(nickname || '').trim(); if (!uid || !name) return 'none'; const key = name.toLowerCase(); const d = await col('nicknames').doc(key).get(); if (!d.exists){ await col('nicknames').doc(key).set({ uid: uid, nickname: name }); delete nickSeen[key]; return 'created'; } const x = d.data() || {}; if (x.uid !== uid) return 'conflict'; if (x.nickname !== name){ await col('nicknames').doc(key).set({ uid: uid, nickname: name }); return 'fixed'; } return 'ok'; }
    },
    cityLists: { // r72t (M4.26 · أ-١٤): التقسيم — الأم فهرسًا + مستند لكل تصنيف؛ الطبقة تعيد الشكل القديم (categories) لكل الواجهات · انتقالي: مستند قديم بلا splitV يُقرأ كما هو
      _compose: async function(parent, id){ // الأم (+ الفرعية إن كانت مقسَّمة) → مستند بالشكل القديم — r72u: الاستعلام يثبت شرط القراءة (قاعدة Firestore: لا استعلام على قوائم الآخرين بلا قيد public/sharedWith)
        if (!parent) return null; if (parent.cityId && parent.cityName) rememberCity(parent.cityId, parent.cityName, parent.country); if (parent.splitV !== 1){ if (parent.categories) mpFixAreaPlaces(parent.categories); return parent; } // ب-٦
        const me = currentUser && currentUser.uid; let q = col('userCityListCats').where('ownerId', '==', parent.ownerId).where('cityId', '==', parent.cityId);
        if (parent.ownerId !== me && !isOwner){ if (parent.public === true) q = q.where('public', '==', true); else if (me && (parent.sharedWith || []).indexOf(me) >= 0) q = q.where('sharedWith', 'array-contains', me); else return Object.assign({}, parent, { categories: {} }); }
        logTiming('[DATA] compose ' + parent.cityId + ' · cats query…'); const snap = await q.get(); logTiming('[DATA] compose ' + parent.cityId + ' · ' + snap.size + ' cats'); /* هـ-٨ */
        const cats = {}; const visStale = []; const pPub = parent.public === true, pShared = mpData.cityLists._sharedKey(parent.sharedWith);
        snap.forEach(function(d){ const c = d.data(); if (!c || typeof c.catId !== 'string') return; cats[c.catId] = { active: c.active !== false, places: parent.ownerId === me ? (c.places || []) : sanePlaces(c.places) /* r118-و */ }; if (parent.ownerId === me && ((c.public === true) !== pPub || mpData.cityLists._sharedKey(c.sharedWith) !== pShared)) visStale.push(d.id); }); /* r104 (ق١١-٠٦-٠١): للمالك — التصنيفات التي يخالف علمها الأم تُعاد للمُحمِّل ليصلحها */
        const out = Object.assign({}, parent, { categories: mpFixAreaPlaces(cats) }); // ب-٦
        if (visStale.length) out._visStale = visStale;
        if (!snap.size && Array.isArray(parent.index) && parent.index.length) out._unreadable = true; /* r104: الأم تقول إن فيها أماكن والاستعلام عاد صفرًا — التصنيفات غير مقروءة لهذا الحساب (لا «لا أماكن») */
        if (parent.ownerId !== me) mpVisLine(parent.cityId, parent, 'viewer · ' + snap.size + '/' + mpData.cityLists._indexCats(parent) + ' cats' + (out._unreadable ? ' · UNREADABLE' : (snap.size < mpData.cityLists._indexCats(parent) ? ' · PARTIAL' : ''))); /* r105-ج */
        else if (visStale.length) mpVisLine(parent.cityId, parent, 'owner · ' + visStale.length + '/' + snap.size + ' cats out of step');
        return out;
      },
      _indexCats: function(parent){ const seen = {}; (parent && Array.isArray(parent.index) ? parent.index : []).forEach(function(e){ if (e && e.catId) seen[e.catId] = 1; }); return Object.keys(seen).length; }, /* r105-ج: عدد التصنيفات التي يذكرها الفهرس */
      composeRow: function(row){ /* r105-ب (قياس): صف الفهرس (من publicByOwner/getIndex) يحمل الأم كاملة — التركيب منه يوفّر قراءة الأم الثانية عند فتح المدينة */ if (!row || row.splitV !== 1 || !row.ownerId || !row.cityId) return null; const parent = Object.assign({}, row); delete parent.categories; delete parent._indexOnly; return mpData.cityLists._compose(parent, row.ownerId + '_' + row.cityId); },
      _indexOf: function(categories){ const ix = []; Object.keys(categories || {}).forEach(function(k){ (((categories[k] || {}).places) || []).forEach(function(p){ if (!p || !(p.name || p.url)) return; const o = { id: p.id || '', name: p.name || '', catId: k }; if (p.topPlace === true) o.top = true; if (p.topAt || p.updatedAt) o.at = p.topAt || p.updatedAt; if (p.updatedAt) o.up = p.updatedAt; /* خ-٦: ختم التعديل وحده — Latest يقرؤه من الفهرس (قرار r73y: المعدَّل لا Top) */ ix.push(o); }); }); return ix; },
      _fromIndex: function(parent){ // للشاشات الجماعية: categories مصغَّرة من الفهرس (اسم · معرّف · top · at) بلا قراءة فرعية
        parent = saneParent(parent); /* r118-و */ if (parent && parent.cityId && parent.cityName) rememberCity(parent.cityId, parent.cityName, parent.country);
        if (!parent || parent.splitV !== 1) return parent; const cats = {}; (parent.index || []).forEach(function(e){ (cats[e.catId] = cats[e.catId] || { active: true, places: [] }).places.push({ id: e.id, name: e.name, topPlace: e.top === true, topAt: e.at, updatedAt: e.up, _index: true }); });
        return Object.assign({}, parent, { categories: cats, _indexOnly: true });
      },
      publicLists: async function(){ // ر٦١ (السوق): القوائم العامة — بالفهرس (لا قراءة فرعية)
        const snap = await col('userCityLists').where('public', '==', true).limit(100).get();
        const rows = []; snap.forEach(function(d){ try{ rows.push(mpData.cityLists._fromIndex({ id: d.id, ...d.data() })); }catch(e){ try{ logTiming('SANE · list ' + d.id + ' skipped · ' + e); }catch(_){} } }); await saneNames(rows.map(function(r){ return { uid: r.ownerId, obj: r }; })); return rows; /* r118-و: مستند لا يُقرأ يُتجاوز والباقي يُعرض · الاسم المعروض مُتحقَّق منه */
      },
      getIndex: async function(uid, cityId){ const d = await col('userCityLists').doc(uid + '_' + cityId).get(); return d.exists ? mpData.cityLists._fromIndex(d.data()) : null; }, /* خ-٦: الأم وحدها (الفهرس) — للشاشات الجماعية قبل فتح المدينة */
      catDoc: async function(uid, cityId, catId){ const d = await col('userCityListCats').doc(uid + '_' + cityId + '_' + catId).get(); if (!d.exists) return null; const c = d.data(); const mineC = (typeof currentUser !== 'undefined' && currentUser && currentUser.uid === uid); return { active: c.active !== false, places: mineC ? (c.places || []) : sanePlaces(c.places) /* r118-و */ }; }, /* خ-٦: مستند تصنيف واحد — Latest والبحث يقرآن المعنيّ فقط لا المدينة كلها */
      get: async function(uid, cityId){ const d = await col('userCityLists').doc(uid + '_' + cityId).get(); return d.exists ? mpData.cityLists._compose(d.data(), d.id) : null; },
      save: async function(uid, cityId, data, opts){ // r72m: المشتقات · r72t: الفرعية + الفهرس بدفعة ذرّية؛ الأم بلا categories · r100-أ: opts.onlyCats = مفاتيح الفرعية التي تُكتب (الأم تُكتب دائمًا بفهرسها الكامل)
        const id = uid + '_' + cityId; const cats = (data && data.categories) || null; const parent = stripCounters(Object.assign({}, data, listDerived(data, (typeof mpIsVerified === 'function') ? mpIsVerified(uid) === true : false))); /* r118-ب · r118-ج */ const only = opts && Array.isArray(opts.onlyCats) ? opts.onlyCats : null;
        if (!cats){ return col('userCityLists').doc(id).set(parent, { merge: true }); }
        delete parent.categories; parent.index = mpData.cityLists._indexOf(cats); parent.splitV = 1;
        const isPublic = data.public === true; const shared = data.sharedWith || [];
        /* r104 (ق١١-٠٦-٠١ · السبب الجذري لعطل مونترو): منذ r100-أ تُكتب التصنيفات المتغيّرة وحدها، و🌐/المشاركة لا يغيّران تصنيفًا — فبقيت نسخة شرط القراءة بالفرعية خاصة بينما الأم عامة (والعكس عند الإلغاء).
           opts.syncVis: مستندات التصنيفات القائمة التي لن تُكتب كاملة تأخذ العلمين في الدفعة نفسها (ذرّيًّا مع الأم) — قراءة واحدة بالاستعلام قبل الدفعة. */
        let visDocs = []; if (opts && opts.syncVis && only){ const vs = await col('userCityListCats').where('ownerId', '==', uid).where('cityId', '==', cityId).get(); vs.forEach(function(d){ if (only.indexOf(String(d.id).slice(id.length + 1)) < 0) visDocs.push(d.id); }); }
        const b = db.batch(); b.set(col('userCityLists').doc(id), Object.assign({}, parent, { categories: del() }), { merge: true });
        Object.keys(cats).forEach(function(k){ if (only && only.indexOf(k) < 0) return; const e = cats[k] || {}; b.set(col('userCityListCats').doc(id + '_' + k), { ownerId: uid, cityId: cityId, catId: k, public: isPublic, sharedWith: shared, active: e.active !== false, places: (e.places || []).filter(function(p){ return p && (p.name || p.url); }), updatedAt: Date.now() }); });
        visDocs.forEach(function(docId){ b.set(col('userCityListCats').doc(docId), { public: isPublic, sharedWith: shared }, { merge: true }); });
        await b.commit(); if (opts && opts.syncVis && only) mpVisLine(cityId, data, 'stamped · ' + (visDocs.length + only.length) + '/' + (visDocs.length + only.length) + ' cats'); return { visCats: visDocs.length }; /* r105-ج */
      },
      _sharedKey: function(arr){ return (Array.isArray(arr) ? arr.map(String).slice().sort() : []).join(','); }, /* r104: مقارنة sharedWith بلا اعتبار للترتيب */
      repairVisibility: async function(docIds, isPublic, shared){ /* r104: العلاج الذاتي عند تحميل قائمتي — المعرّفات جاءت من القراءة نفسها (لا قراءة إضافية) · دفعة واحدة */
        const b = db.batch(); (docIds || []).forEach(function(docId){ b.set(col('userCityListCats').doc(docId), { public: isPublic === true, sharedWith: Array.isArray(shared) ? shared : [] }, { merge: true }); }); return b.commit();
      },
      dropCategoryKeys: async function(uid, cityId, keys){ // ر٧٠ط · r72t: حذف الفرعيات القديمة
        /* r118-ط (ص-٤ · مقيس R2-10a): حذف مستند تصنيف غير موجود مرفوض (القاعدة تقرأ بياناته)، فكانت الدفعة كلها تسقط عند كل حفظ لقائمة قديمة لم تُقسَّم — «Not saved» كاذبة. يُحذف الموجود فقط (استعلام صاحبها عن تصنيفات المدينة — مقيس: مقبول). */
        const id = uid + '_' + cityId; const snap = await col('userCityListCats').where('ownerId', '==', uid).where('cityId', '==', cityId).get(); const b = db.batch(); let n = 0; snap.forEach(function(d){ if (keys.indexOf(String(d.id).slice(id.length + 1)) >= 0){ b.delete(col('userCityListCats').doc(d.id)); n++; } }); if (!n) return; return b.commit();
      },
      remove: async function(uid, cityId){ // خ٥/م٢-ب · r72t: الأم وفرعياتها بدفعة
        /* r118-ط (ص-٤ · مقيس R2-10b): حذف أم غير موجودة مرفوض — «Clear my list (0)» كان يدور بلا نهاية. تُقرأ الأم (قراءة الغائب لصاحب البادئة مسموحة) وتُحذف إن وُجدت؛ ولا شيء يُحذف = منجَز. */
        const id = uid + '_' + cityId; const snap = await col('userCityListCats').where('ownerId', '==', uid).where('cityId', '==', cityId).get(); const par = await col('userCityLists').doc(id).get(); const b = db.batch(); let n = 0; snap.forEach(function(d){ b.delete(col('userCityListCats').doc(d.id)); n++; }); if (par.exists){ b.delete(col('userCityLists').doc(id)); n++; } if (!n) return; return b.commit();
      },
      byOwner: function(uid){ return col('userCityLists').where('ownerId', '==', uid).get(); },
      removeOrphanCats: async function(uid){ /* الدفعة ٢ (بقايا حذف الحساب): مستندات تصنيف بقيت بعد حذف المدن المعروفة (مدينة زالت أمها · فهرس ناقص) — باستعلام صاحبها (مقيس: مقبول) */
        const snap = await col('userCityListCats').where('ownerId', '==', uid).get(); const ids = []; snap.forEach(function(d){ ids.push(d.id); });
        for (let i = 0; i < ids.length; i += 15){ const b = db.batch(); ids.slice(i, i + 15).forEach(function(id){ b.delete(col('userCityListCats').doc(id)); }); await b.commit(); }
        return ids.length;
      },
      holdAll: async function(uid, hold, opts){ /* r109-ب (ق١١-١٠-٠٥ — قياس: بعد الإيقاف القائمة الأم مخفية ومستند تصنيفها `public: true` واستعلام حساب آخر يعيد المكان): الإيقاف كامل — كل قائمة وكل مستند تصنيف تحتها في الكتابة نفسها. الأم تحفظ ما كان (publicHeld · sharedWithHeld) والتصنيفات تتبع الأم دائمًا (r104) فلا تحتاج حفظًا خاصًّا: عند الرفع تأخذ علمَي الأم المستعادَين. تكرار الإيقاف على موقوف لا يمحو المحفوظ. opts.onlyOutOfStep: يكتب ما يخالف وحده (علاج حساب أُوقف قبل هذه الدفعة). */
        const ps = await col('userCityLists').where('ownerId', '==', uid).get(); const cs = await col('userCityListCats').where('ownerId', '==', uid).get();
        const only = !!(opts && opts.onlyOutOfStep); const pOps = [], cOps = []; const flags = {}; let nL = 0, nC = 0;
        ps.forEach(function(doc){ const d = doc.data() || {}; const u = { suspended: hold }; let write = true;
          if (hold){ if (d.suspended === true){ flags[doc.id] = { public: false, sharedWith: [] }; write = d.public === true || (Array.isArray(d.sharedWith) && d.sharedWith.length > 0); if (write){ u.public = false; u.sharedWith = []; } else return; }
            else { u.sharedWithHeld = Array.isArray(d.sharedWith) ? d.sharedWith : []; u.sharedWith = []; u.publicHeld = d.public === true; u.public = false; flags[doc.id] = { public: false, sharedWith: [] }; } }
          else { if (d.suspended !== true){ flags[doc.id] = { public: d.public === true, sharedWith: Array.isArray(d.sharedWith) ? d.sharedWith : [] }; return; } /* المراجعة: الرفع على غير محتجز (إعادة بعد فشل جزئي · ضغطتان) لا يكتب «خاصة» فوق قائمة عادت — تصنيفاتها تتبع علمَيها الحاليين */
            u.sharedWith = Array.isArray(d.sharedWithHeld) ? d.sharedWithHeld : (Array.isArray(d.sharedWith) ? d.sharedWith : []); u.sharedWithHeld = del(); u.public = d.publicHeld === true; u.publicHeld = del(); flags[doc.id] = { public: u.public, sharedWith: u.sharedWith }; }
          nL++; pOps.push([col('userCityLists').doc(doc.id), u]); });
        cs.forEach(function(doc){ const d = doc.data() || {}; const f = flags[uid + '_' + d.cityId] || { public: false, sharedWith: [] }; /* تصنيف بلا أم يُخفى */
          const same = (d.public === true) === (f.public === true) && mpData.cityLists._sharedKey(d.sharedWith) === mpData.cityLists._sharedKey(f.sharedWith); if (only && same) return; nC++; cOps.push([col('userCityListCats').doc(doc.id), { public: f.public === true, sharedWith: f.sharedWith || [] }]); });
        const ops = hold ? cOps.concat(pOps) : pOps.concat(cOps); /* المراجعة: عند الإيقاف التصنيفات أولًا، وعند الرفع الأمهات أولًا — انقطاع بين دفعتين يترك تصنيفًا خاصًّا تحت أم عامة (لا يُقرأ؛ يعالجه تحميل صاحبها أو إعادة المحاولة) ولا يترك أبدًا تصنيفًا عامًّا تحت أم مخفية */
        for (let i = 0; i < ops.length; i += 400){ const b = db.batch(); ops.slice(i, i + 400).forEach(function(o){ b.set(o[0], o[1], { merge: true }); }); await b.commit(); }
        if (ops.length) try{ logTiming('VIS · account ' + uid + ' · ' + (hold ? 'held' : 'restored') + ' · ' + nL + ' lists · ' + nC + ' category docs' + (only ? ' (out of step only)' : '')); }catch(_){}
        return { lists: nL, cats: nC };
      },
      sharedWith: function(uid){ return col('userCityLists').where('sharedWith', 'array-contains', uid).get(); }, /* ر٧٣-أب (٢) */
      publicByOwnerRaw: function(uid){ return col('userCityLists').where('ownerId', '==', uid).where('public', '==', true).get(); },
      setNicknameAll: async function(uid, nickname){ const snap = await col('userCityLists').where('ownerId', '==', uid).get(); const b = db.batch(); snap.forEach(function(d){ b.update(d.ref, { nickname: nickname }); }); return b.commit(); }, /* ر٧٣-أب (٢) */
      publicByOwner: async function(uid){ const snap = await col('userCityLists').where('ownerId', '==', uid).where('public', '==', true).get(); const rows = []; snap.forEach(function(d){ try{ rows.push(mpData.cityLists._fromIndex(d.data())); }catch(e){ try{ logTiming('SANE · list ' + d.id + ' skipped · ' + e); }catch(_){} } }); await saneNames(rows.map(function(r){ return { uid: r.ownerId, obj: r }; })); return rows; }, // ر٧٢-أ-١هـ · r72t: بالفهرس · r118-و
    },
    geo: { // ز-١-ب/ج: عامل الأماكن (places.mypickz.app) — بلا مفتاح · لا إحداثيات من جوجل أبدًا (الثابت السابع) · مهلة ٦ ثوانٍ
      base: 'https://places.mypickz.app',
      _get: async function(path){ const ac = (typeof AbortController === 'function') ? new AbortController() : null; const t = ac ? setTimeout(function(){ ac.abort(); }, 6000) : null; try{ const r = await fetch(mpData.geo.base + path, ac ? { signal: ac.signal } : {}); if (!r.ok) throw new Error('geo ' + r.status); return await r.json(); } finally { if (t) clearTimeout(t); } },
      resolve: function(url){ return mpData.geo._get('/resolve?url=' + encodeURIComponent(url)); },
      ccOf: function(cityId){ const c = allCities().find(function(x){ return x.id === cityId; }); return c && c.country ? plCountryCode(c.country) : ''; },
      match: function(cityId, name, addr, g){ return mpData.geo._get('/match?city=' + encodeURIComponent(cityId || '') + '&cc=' + encodeURIComponent(mpData.geo.ccOf(cityId)) + '&lat=' + (g ? g.lat : '') + '&lng=' + (g ? g.lng : '') + '&r=' + (g ? g.r : 12) + '&name=' + encodeURIComponent(name || '') + '&addr=' + encodeURIComponent(addr || '')); },
      area: async function(cityId, lat, lng){ const r = await mpData.geo.areaInfo(cityId, lat, lng); return r.area; }, // خ-٤: الحي من الموضع (حدود Overture بمخزننا)
      areaInfo: async function(cityId, lat, lng){ try{ const r = await mpData.geo._get('/area?cc=' + encodeURIComponent(mpData.geo.ccOf(cityId)) + '&lat=' + lat + '&lng=' + lng); return { area: (r && r.area) || '', type: (r && r.type) || '', chain: Array.isArray(r && r.chain) ? r.chain.map(String) : [], noData: !!(r && r.noData), err: false }; }catch(_){ return { area: '', type: '', chain: [], noData: false, err: true }; } }, /* r96 (ق١٠-٣٠-٠٣): السلسلة (حتى ثلاثة مستويات، الأصغر أولًا) تُمرَّر كما يعيدها العامل */ /* r87-4b: الجواب كاملًا — لتفريق «لا ملف حدود» عن «خارج كل مضلّع» عن الخطأ */
      matchBatch: async function(cityId, items, g){ const ac = (typeof AbortController === 'function') ? new AbortController() : null; const t = ac ? setTimeout(function(){ ac.abort(); }, 45000) : null; try{ const r = await fetch(mpData.geo.base + '/match-batch', Object.assign({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: cityId || '', cc: mpData.geo.ccOf(cityId), lat: g ? g.lat : null, lng: g ? g.lng : null, r: g ? g.r : 12, items: items }) }, ac ? { signal: ac.signal } : {})); if (!r.ok) throw new Error('geo ' + r.status); return await r.json(); } finally { if (t) clearTimeout(t); } } // خ-٢: دفعة حتى ٥٠ اسمًا بمهلة ٤٥ ثانية
    },
    identity: { // v3.11: سجل هوية الأماكن — موضع مصدَّق يتراكم (أول مثبِّت يخدم الباقين)
      keyOf: function(cityId, name){ return 'k' + hashUrl(String(cityId || '') + '|' + pickerNormalize(name || '')); },
      getMany: async function(keys){ /* ر٧٣-أب (١): ١٠ مفاتيح بقراءة واحدة · المجموعات بالتوازي · مهلة ٨ ث · إن فشل الاستعلام يعود إلى القراءة المفردة */ const out = {}; const ks = (keys || []).filter(Boolean); const chunks = []; for (let i = 0; i < ks.length; i += 10) chunks.push(ks.slice(i, i + 10));
        const withTimeout = function(p, ms){ return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('identity timeout')); }, ms); })]); };
        await Promise.all(chunks.map(async function(chunk){ try{ const snap = await withTimeout(col('placeIdentity').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get(), 8000); snap.forEach(function(d){ out[d.id] = d.data(); }); }catch(e){ mpSwallow(e, 'identity.getMany'); await Promise.all(chunk.map(async function(k){ try{ const d = await withTimeout(col('placeIdentity').doc(k).get(), 8000); if (d.exists) out[k] = d.data(); }catch(_){} })); } }));
        return out; },
      get: async function(key){ const d = await col('placeIdentity').doc(key).get(); return d.exists ? d.data() : null; },
      put: function(key, rec){ return col('placeIdentity').doc(key).set(rec); }
    },

    analytics: { /* ر٧٣-أب (٢): الزيارات · دفعة الزيادات (mpTrack) · قراءة مستند · أحداث يوم (الإدارة) */
      bumpVisits: function(){ return col('analytics').doc('visits').set({ count: inc(1) }, { merge: true }); },
      batchInc: function(entries){ const b = db.batch(); entries.forEach(function(e){ const seg = e[0].split('/'); b.set(col(seg[0]).doc(seg[1]), e[1], { merge: true }); }); return b.commit(); },
      getDoc: async function(id){ const d = await col('analytics').doc(id).get(); return d.exists ? d.data() : null; },
      byPrefix: function(prefix, limit){ return col('analytics').orderBy(firebase.firestore.FieldPath.documentId()).startAt(prefix).endAt(prefix + '\uf8ff').limit(limit || 50).get(); },
      /* r116-ب (لوحة المالك): مدى أيام لنوع واحد (events · hours · sources · sessions) باستعلام واحد على معرّف المستند — المعرّف يبدأ بالنوع ثم اليوم. يعيد [{ id, day, rest, data }] و partial حين بلغ السقف. للمالك وحده (القواعد). */
      range: async function(kind, fromDay, toDay, limit){ const cap = limit || 200; const snap = await col('analytics').orderBy(firebase.firestore.FieldPath.documentId()).startAt(kind + '_' + fromDay).endAt(kind + '_' + toDay + '\uf8ff').limit(cap).get();
        const rows = []; snap.forEach(function(doc){ const m = /^([a-z]+)_(\d{4}-\d{2}-\d{2})(?:__(.*))?$/.exec(doc.id); if (!m || m[1] !== kind) return; rows.push({ id: doc.id, day: m[2], rest: m[3] || '', data: doc.data() || {} }); }); rows.partial = snap.size >= cap; return rows; }
    },
    dailyStats: { bump: function(day, fields){ return col('dailyStats').doc(day).set(fields, { merge: true }); },
      /* r116-ب: أيام النشاط بمدى واحد على معرّف المستند (اليوم) — للمالك وحده */
      range: async function(fromDay, toDay){ const snap = await col('dailyStats').orderBy(firebase.firestore.FieldPath.documentId()).startAt(fromDay).endAt(toDay).limit(40).get(); const out = {}; snap.forEach(function(doc){ if (/^\d{4}-\d{2}-\d{2}$/.test(doc.id) && doc.id >= fromDay && doc.id <= toDay) out[doc.id] = doc.data() || {}; }); return out; } },
    stats: { /* ب-٢-١ (My stats): قراءات مفردة متوازية — القواعد تثبت القراءة المفردة لصاحبها/المالك ولا تثبت الاستعلام بالمدى (القسمان ٤-هـ · ٤-ح) · الغائب = {} */
      _day: function(d){ return new Date(d).toISOString().slice(0, 10); },
      _days: function(n){ const out = []; const t = Date.now(); for (let i = 0; i < (n || 30); i++) out.push(mpData.stats._day(t - i * 86400000)); return out; }, // اليوم أولًا
      _get: async function(coll, id){ try{ const d = await col(coll).doc(id).get(); return d.exists ? (d.data() || {}) : {}; }catch(e){ mpSwallow(e, 'stats ' + coll); return {}; } },
      listDoc: function(listId){ return mpData.stats._get('stats_lists', listId); },
      tripDoc: function(tripId){ return mpData.stats._get('stats_trips', tripId); },
      listDays: async function(listId, n){ const days = mpData.stats._days(n); const rows = await Promise.all(days.map(function(d){ return mpData.stats._get('stats_lists', listId + '__' + d); })); return days.map(function(d, i){ return Object.assign({ day: d }, rows[i]); }); },
      curatorDays: async function(uid, n){ const days = mpData.stats._days(n); const rows = await Promise.all(days.map(function(d){ return mpData.stats._get('stats_curators', uid + '__' + d); })); return days.map(function(d, i){ return Object.assign({ day: d }, rows[i]); }); },
      /* r116-ح (ق١١-١١-١٣): كنس بقايا العدّ من جهة المالك — صفحة معرّفات مرتّبة تبدأ من مؤشّر · وجود المستند الأب بقراءة مفردة (الرفض يُرمى ولا يُقرأ «غائبًا») · حذف مستند عدّ واحد. القواعد: القراءة والحذف لمالك التطبيق. */
      pageIds: async function(coll, fromId, limit){ let q = col(coll).orderBy(firebase.firestore.FieldPath.documentId()); if (fromId) q = q.startAt(fromId); const snap = await q.limit(limit || 100).get(); const ids = []; snap.forEach(function(d){ ids.push(d.id); }); return ids; },
      parentExists: async function(coll, id){ const d = await col(coll).doc(id).get(); return d.exists === true; },
      remove: function(coll, id){ return col(coll).doc(id).delete(); },
      /* r116-ب: أيام مدينة واحدة بمدى واحد على معرّف المستند (المدينة__اليوم) — للمالك وحده */
      cityRange: async function(cityId, fromDay, toDay){ const pre = String(cityId) + '__'; const snap = await col('stats_cities').orderBy(firebase.firestore.FieldPath.documentId()).startAt(pre + fromDay).endAt(pre + toDay).limit(40).get(); const sum = { open: 0, place_added: 0, trip_built: 0 }; snap.forEach(function(doc){ if (doc.id.indexOf(pre) !== 0) return; const d = doc.data() || {}; Object.keys(sum).forEach(function(k){ if (typeof d[k] === 'number') sum[k] += d[k]; }); }); return sum; },
      placesOf: async function(listId, hexes){ const out = {}; await Promise.all((hexes || []).map(async function(h){ out[h] = await mpData.stats._get('stats_places', listId + '__' + h); })); return out; }
    },
    statsUsers: { bumpUsers: function(){ return col('stats').doc('users').set({ count: inc(1) }, { merge: true }); } }, /* ب-٢-١: كان المفتاح stats — انتقل ليحمل stats قرّاء الإحصاء (مفتاح مكرر بالكائن يطغى آخره) */
    communityProfiles: { set: function(uid, payload){ return col('communityProfiles').doc(uid).set(Object.assign({ displayName: del() }, payload), { merge: true }); }, /* r118-هـ (ك-٦ · مقيس R2-9a/9b): ملف قديم ما زال يحمل displayName تُرفض كل كتابة عليه (القاعدة تفحص صورة المستند كلها) — كتابة صاحبه تحذف الحقل في الطلب نفسه؛ على ملف لا يحمله الحذف بلا أثر */ bumpView: function(uid){ if (selfUid() === uid) return Promise.resolve(false); /* الدفعة ٢ (ك-١١ · قواعد v3.17 ٣): صاحب الملف لا يحرّك مشاهداته — كان الطلب يُرسل ويُرفض صامتًا */ return col('communityProfiles').doc(uid).update({ viewCount: inc(1) }); }, /* update: ملف غائب لا يُنشأ بمشاهدة (المراجعة الثانية: مالك التطبيق كان ينشئ ملفًّا شبحًا يحمل viewCount وحده) */ withPublic: function(){ return col('communityProfiles').where('hasAnyPublicContent', '==', true).get(); } },
    settings: { // ر٧٠ط-٢: قالب التصنيفات (المالك)
      app: async function(){ const d = await col('settings').doc('app').get(); return d.exists ? d.data() : null; }, /* ر٧٣-أب (٢) */
      mergeApp: function(data){ return col('settings').doc('app').set(data, { merge: true }); },
      watchApp: function(cb, err){ return col('settings').doc('app').onSnapshot(cb || function(){}, err || function(){}); }, /* هـ-٥: مستمع دائم يبقي قناة Firestore مفتوحة طوال الجلسة — بلا قراءات إضافية ما لم يتغير المستند */
      getCategoryTemplate: async function(){ const d = await col('settings').doc('category-template').get(); return d.exists ? d.data() : null; },
      rulesVersion: async function(){ const d = await col('settings').doc('app').get(); return d.exists ? (d.data().rulesVersion || '') : ''; }, // r72t (M4.26 ٧)
      saveCategoryTemplate: function(data){ return col('settings').doc('category-template').set(data, { merge: true }); }, /* ر٧٣-أب (١): الحفظ عبر الطبقة (كان نداءً مباشرًا) */
      resetCategoryTemplate: function(){ return col('settings').doc('category-template').set({ customItems: [], sectionOverrides: {}, itemOrder: {}, itemOverrides: {}, catsV: CATS_VERSION }); }
    },
    trips: {
      // ر٥٦: استفتاء الأصل الحي للرحلة المحفوظة (متصفح Bookmarked trips)
      getDoc: function(tripId){ return col('trips').doc(tripId).get(); },
      bumpView: function(tripId){ return col('trips').doc(tripId).update({ viewCount: inc(1) }); }, // r72t (M4.26 ٣): مشاهدة من غير المالك
      publicTrips: async function(){
        const snap = await col('trips').where('public', '==', true).limit(100).get();
        const rows = []; snap.forEach(function(d){ rows.push(saneTrip({ id: d.id, ...d.data() })); }); return rows; /* r118-و */
      },
      remove: function(tripId){ /* r118-ط (ص-٤ · مقيس R2-10c): حذف رحلة غير موجودة مرفوض (وقراءتها كذلك). عند الرفض يُسأل استعلام رحلاتي: إن لم تكن فيه فهي غير موجودة = منجَز؛ وإن كانت فالرفض حقيقي ويُرمى. */
        return col('trips').doc(tripId).delete().catch(async function(e){ if (!(e && e.code === 'permission-denied') || typeof currentUser === 'undefined' || !currentUser) throw e; const snap = await col('trips').where('ownerId', '==', currentUser.uid).get(); let there = false; snap.forEach(function(d){ if (d.id === tripId) there = true; }); if (there) throw e; }); },
      byOwner: function(uid){ return col('trips').where('ownerId', '==', uid).get(); },
      sharedWith: function(uid){ return col('trips').where('sharedWith', 'array-contains', uid).get(); }, /* ر٧٣-أب (٢) */
      save: function(trip, extra){ return col('trips').doc(trip.id).set(stripCounters(Object.assign({}, trip, extra || {})), { merge: true }); }, /* r118-ج: الرحلة تُرسل بلا عدّاداتها */
      publicByOwner: async function(uid){ const snap = await col('trips').where('ownerId', '==', uid).where('public', '==', true).get(); const rows = []; snap.forEach(function(d){ rows.push(saneTrip({ id: d.id, ...d.data() })); }); return rows; } /* r118-و */ // ر٧٢-أ-١ (إعادة البناء): رحلاته العامة لصفحة المنتقي
    },
    suspensions: {
      allIds: async function(){ const snap = await col('suspensions').get(); const ids = new Set(); snap.forEach(function(d){ ids.add(d.id); }); return ids; }, // ر٧٢-أ-١ب (المالك)
      set: function(uid, data){ return col('suspensions').doc(uid).set(data); },
      get: function(uid){ return col('suspensions').doc(uid).get(); }, /* ر٧٣-أب (٢) */
      remove: function(uid){ return col('suspensions').doc(uid).delete(); }
    },
    // القرار ١ (٢٦ أغسطس): الإيقاف احتجاز كامل (العام + المشاركة بالاسم)، والرفع استعادة كاملة — البوابة البشرية هي قرار الرفع
    holdOrRestore: async function(snap, hold){
      if (snap.empty) return;
      const ops = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (!hold && !(d && d.suspended === true)) return; /* r109-ب (المراجعة): الرفع على غير محتجز لا يكتب «خاصة» فوق ما عاد */
        if (hold && d && d.suspended === true) return; /* r109-ب: تكرار الإيقاف على موقوف لا يمحو ما حُفظ للرفع (publicHeld · sharedWithHeld) */
        const u = { suspended: hold };
        if (hold){
          u.sharedWithHeld = Array.isArray(d.sharedWith) ? d.sharedWith : [];
          u.sharedWith = [];
          u.publicHeld = d.public === true;
          u.public = false;
        } else {
          u.sharedWith = Array.isArray(d.sharedWithHeld) ? d.sharedWithHeld : (Array.isArray(d.sharedWith) ? d.sharedWith : []);
          u.sharedWithHeld = del();
          u.public = d.publicHeld === true;
          u.publicHeld = del();
        }
        ops.push([doc.ref, u]);
      });
      for (let i = 0; i < ops.length; i += 400){ const batch = db.batch(); ops.slice(i, i + 400).forEach(function(o){ batch.update(o[0], o[1]); }); await batch.commit(); } /* r109-ب: دفعات من ٤٠٠ (حدّ Firestore ٥٠٠) */
    }
  };
})();

let visitCount = null;

/* عرض ملاحظة المكان — بتضيف "More/Less" تلقائيًا لو النص طويل، وتعرضه كامل من غير أي زر لو قصير */
function mpFixAreaDot(s){ s = String(s == null ? '' : s); const m = /^([.,;:!])([^\s.,;:!].*)$/.exec(s); if (!m || /[\u0600-\u06FF]/.test(s)) return s; return m[2] + m[1]; } // ب-٦ (قرار المالك): حيٌّ مهاجر كُتب في حقل يميني فجاءت نقطته أولًا → تُنقل إلى آخره؛ الحيّ وحده، اللاتيني وحده، علامة واحدة
function mpFixAreaPlaces(cats){ Object.keys(cats || {}).forEach(function(k){ (((cats[k] || {}).places) || []).forEach(function(p){ if (p && typeof p.area === 'string'){ const f = mpFixAreaDot(p.area); if (f !== p.area) p.area = f; } }); }); return cats; }
function mpStripBidi(str){ return String(str == null ? '' : str).replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, ''); } // ب-٥: علامات الاتجاه الخفية (تأتي مع النص المستورد) تقلب «7th arr.» إلى «.7th arr»
function escapeHtml(str){
  return mpStripBidi(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
async function loadVisitCount(){
  try{
    const __v = await mpData.analytics.getDoc('visits');
    visitCount = __v ? (__v.count || 0) : 0;
  }catch(e){ visitCount = null; }
}


// يفحص كل الأماكن بكائن links ويولّد معرّفًا لأي مكان قديم بلا معرّف (بأثر رجعي) — يُرجع true لو أي تغيير صار
function backfillPlaceIds(linksObj){
  let changed = false;
  Object.keys(linksObj || {}).forEach(subcatId => {
    const entry = linksObj[subcatId];
    if (!entry || !Array.isArray(entry.places)) return;
    entry.places.forEach(p => {
      if (!p.id){ p.id = generatePlaceId(); changed = true; }
    });
  });
  return changed;
}







async function loadOwnerUid(){
  try{
    const __t0 = performance.now(); const __app = await mpData.settings.app(); if (typeof logTiming === 'function') logTiming('[NET] first Firestore read (settings/app) in ' + Math.round(performance.now() - __t0) + 'ms'); /* د-٥ */
    ownerUid = __app ? (__app.ownerUid || null) : null;
  }catch(e){ ownerUid = null; }
}

// ===== وضع المالك (إعادة تصميم أ-٢، ١٦ أغسطس ٢٠٢٦) =====
// الصلاحية = تطابق currentUser.uid مع settings/app.ownerUid فقط. لا كلمة مرور، لا إيماءة، لا ?key=.
// "Hide/Show Tools" تفضيل عرض محلي بحت (localStorage) — لا يمس isOwner ولا الصلاحية الفعلية،
// فالحَكَم الحقيقي هو قواعد Firestore على الخادم.
const OWNER_TOOLS_HIDDEN_KEY = 'mypickz_owner_tools_hidden';



// تُستدعى من onAuthStateChanged بعد معرفة currentUser
function syncOwnerMode(){
  const wasOwner = isOwner;
  isOwner = !!(currentUser && ownerUid && currentUser.uid === ownerUid);
  if (isOwner && categoryTemplateStale) resetStaleCategoryTemplate(); // ر٧٠ط-٢
  if (wasOwner !== isOwner && typeof renderPlacesBody === 'function' && currentTab === 'Places') renderPlacesBody(); /* ر٧٣-أب (١): لا دليل موروثًا — الشاشة الحية تُعاد وحدها */
}


// يربط حساب Firebase الحالي كمالك معتمد لو لم يكن settings/app.ownerUid مربوطًا بعد (شبكة أمان للربط الأولي)
async function linkOwnerUid(){
  if (!currentUser) return;
  try{
    const __app2 = await mpData.settings.app();
    const savedUid = __app2 ? __app2.ownerUid : null;
    if (savedUid && savedUid !== currentUser.uid) return; // مالك مربوط أصلًا بحساب آخر — لا نلمسه تلقائيًا
    /* r118-ح (ق١١-١٢-٠١): بريد المالك لا يُكتب في settings/app (مستند مقروء للجميع) — لا كود ولا قاعدة يقرؤه؛ والحقل القائم يُحذف عند أول دخول للمالك. الكتابة فقط عند الربط الأول أو لحذف الحقل. */
    if (savedUid && !(__app2 && ('ownerEmail' in __app2))){ ownerUid = currentUser.uid; return; }
    await mpData.settings.mergeApp({ ownerUid: currentUser.uid, ownerEmail: mpData.fieldDelete() });
    ownerUid = currentUser.uid;
  }catch(e){ /* صامت */ }
}

/* ═══ r109 (المراجعة · مانع): باب واحد للكتابات التي يعرضها السوق — بعد نجاح كل واحدة يُخبَر المجتمع (cmWrote) فيُسقط من ذاكرة جلسته ما لم يعد يُصدَّق. الجدول هو المرجع: كتابة جديدة على trips / userCityLists / userCityListCats / communityProfiles تُضاف هنا (تدقيق §38 يوقف البناء إن غابت). المشاهدات (bumpView ×3) وعدّاد المتابعين (follows.set) خارجه قصدًا: لا يغيّران ما يظهر ولا من يظهر، وعدّادهما يلحق مع القراءة التالية. ═══ */
const MP_MARKET_WRITES = [
  ['bookmarks', 'toggleList', function(a){ return ['lists', a[1] + '_' + a[2], true, a[1]]; }],
  ['tripSaves', 'toggle', function(a){ return ['trips', a[1], true, null]; }],
  ['copies', 'record', function(a){ return [a[1] === 'trip' ? 'trips' : 'lists', a[2], true, null]; }],
  ['copies', 'unrecord', function(a){ return [a[1] === 'trip' ? 'trips' : 'lists', a[2], true, null]; }],
  ['copies', 'removeMine', function(){ return ['all', '', true, null]; }],
  ['profiles', 'merge', function(a){ return ['users', a[0], true, a[0]]; }],
  ['profiles', 'remove', function(a){ return ['users', a[0], true, a[0]]; }],
  ['communityProfiles', 'set', function(a){ return ['users', a[0], true, a[0]]; }],
  ['cityLists', 'save', function(a){ return ['lists', a[0] + '_' + a[1], !!(a[2] && a[2].public === true), a[0]]; }],
  ['cityLists', 'repairVisibility', function(a){ return ['lists', '', false, String((a[0] || [])[0] || '').split('_')[0]]; }],
  ['cityLists', 'dropCategoryKeys', function(a){ return ['lists', a[0] + '_' + a[1], false, a[0]]; }],
  ['cityLists', 'remove', function(a){ return ['lists', a[0] + '_' + a[1], false, a[0]]; }],
  ['cityLists', 'removeOrphanCats', function(a){ return ['lists', '', false, a[0]]; }],
  ['cityLists', 'setNicknameAll', function(a){ return ['lists', '', true, a[0]]; }],
  ['trips', 'save', function(a){ return ['trips', a[0] && a[0].id, !!(a[0] && a[0].public === true), (a[1] && a[1].ownerId) || (a[0] && a[0].ownerId) || null]; }],
  ['trips', 'remove', function(a){ return ['trips', a[0], false, null]; }],
  ['', 'holdOrRestore', function(){ return ['all', '', true, null]; }],
  ['cityLists', 'holdAll', function(){ return ['all', '', true, null]; }]
];
MP_MARKET_WRITES.forEach(function(w){ const o = w[0] ? mpData[w[0]] : mpData, f = o && o[w[1]]; if (typeof f !== 'function') return;
  o[w[1]] = function(){ const a = arguments; return Promise.resolve(f.apply(this, a)).then(function(v){ try{ if (typeof cmWrote === 'function') cmWrote.apply(null, w[2](a)); }catch(_){} return v; }); }; });
