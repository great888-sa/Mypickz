// MyPickz — tests/ui-parity.js (r110-ب · ق١١-١١-٠٢ · ١١ نوفمبر ٢٠٢٦): جدول تطابق الواجهة بين شكلَي محرّر الخطة
// الصنف الذي كشفته ملاحظات المالك (١١ نوفمبر ٠٢:٠٢ — باب الإضافة في موضعين مختلفين · Add again ظاهر في مسار ومخفي في الآخر · زر بالاسم نفسه بسلوك آخر):
//   مصفوفة الخطة (plan-matrix.js) تحرس *بيانات* الشكلين، ولم يكن شيء يحرس *تطابق واجهتهما*. هذا الجدول هو المرجع الواحد:
//   يقرؤه التدقيق §41 (الكود يرسم من القطع المشتركة وبهذه الأسماء وهذا الترتيب) وتقرؤه محطة «r110-ب · التطابق» في الرحلة (ما يُرسم فعلًا يطابقه).
// كل صف: المفتاح · الاسم الظاهر · معالج كل شكل — أو «سبب» مكتوب حين لا ينطبق على شكل (نصّ عربي بدل اسم دالة).
// الشكلان: city = يوم داخل المدينة (فترات، يرتّبه المحرّك) · linear = مسار خطّي (محطات بترتيب المستخدم: رحلة يوم، أو يوم خطّي داخل رحلة).
'use strict';
const ROW = [ /* أفعال صف المحطة — بترتيب رسمها في tbRowActs */
  { key: 'promote', label: '⇄', city: 'tbPromote', linear: 'لا بدائل في المسار الخطّي — الاختيار بين مكانين يُعرض Options بعد الحفظ', when: 'alt' },
  { key: 'up', label: '▲', city: 'tbNudge', linear: 'tbDTMove', when: 'siblings' },
  { key: 'down', label: '▼', city: 'tbNudge', linear: 'tbDTMove', when: 'siblings' },
  { key: 'move', label: 'Move', city: 'tbMove', linear: 'tbMove', linearWhen: 'multi', linearElse: 'خطة يوم واحد — لا يوم آخر يُنقل إليه' },
  { key: 'edit', label: '✎ Edit', city: 'tbStopSheet', linear: 'tbStopSheet', when: 'typed' },
  { key: 'alert', label: '⚠ Alert', city: 'tbAlert', linear: 'التنبيه لا موضع له في صف المسار الخطّي ولا في عرضه — فرق قائم مسمّى (r110)', when: 'saved' },
  { key: 'optional', label: 'optional', city: 'داخل المدينة يُعبَّر عن الاختياري بالبدائل (Options) لا بعلامة', linear: 'tbDTToggleOptional' },
  { key: 'again', label: 'Add again', city: 'tbAgain', linear: 'tbDTAddAgain', when: 'notAlt' },
  { key: 'remove', label: '✕', city: 'tbRemove', linear: 'tbDTRemove' },
];
const DOORS = [ /* أبواب الإضافة — الموضع نفسه والاسم نفسه في الشكلين */
  { key: 'chip', label: '＋ Add places', renderer: 'tbAddChipHtml', where: 'أول شرائح أعلى المحرّر', handler: 'tbOpenPick' },
  { key: 'door', label: '＋ Add places', renderer: 'tbAddDoorHtml', where: 'باب عريض تحت آخر محطة', handler: 'tbOpenPick' },
  { key: 'setup', label: 'Pick places in', renderer: null, where: 'Setup — قبل البناء وبعده', handler: 'tbOpenPick' },
  { key: 'saved', label: '＋ Add places', renderer: null, where: 'العرض المحفوظ بجوار ✏️ Edit — يفتح التحرير والمنتقي مفتوح', handler: 'openTripBuilder' },
];
/* اسم معالج صف يظهر في راسم غير tbRowActs — كل موضع بسببه (يقرؤه التدقيق §41: ما ليس هنا يُحمرّ) */
const STATIC_OUTSIDE = { tbDraftHtml: { tbMove: 'صينية «No day yet»: المكان بلا يوم ليس صف محطة — زره الوحيد Move يسأل اليوم والفترة' } };
/* ما يُرسم في شاشة المحرّر (المرحلة ٢) خارج شريط أفعال الصف — «حدث:معالج» بسببه. تقيسه محطة «r110 · المراجعة المستقلة ب» على الشاشة المرسومة:
   زر جديد في المحرّر إمّا يدخل الشريط (tbRowActs، فيظهر في الشكلين) أو يُسمّى هنا لشكله بسببه — وإلا احمرّت المحطة. (كان زر يُضاف في راسم شكل واحد يمرّ بلا حارس.) */
const OUTSIDE = {
  both: {
    'click:tbClose': 'Cancel في التذييل', 'click:tbSaveDraft': 'Save as draft في التذييل', 'click:tbApprove': 'Approve / Done في التذييل',
    'click:tbOpenPick': 'بابا الإضافة (الشريحة والباب العريض)', 'click:TB.stage': 'شريحة Setup', 'click:tbUndo': 'شريحة ↶ Undo',
    'change:tbSetTripName': 'خانة اسم الخطة', 'input:mpLenShow': 'عدّاد طول الاسم',
  },
  city: {
    'click:tbPickDay': 'شرائح الأيام', 'click:tbVersion': 'شرائح الإيقاع (Calm · Balanced · Full)', 'click:tbVersionSheet': 'ورقة الإيقاع حين تضيق الشرائح',
    'click:tbRestAdd': 'إضافة استراحة بعد فترة — الفترات للمدينة وحدها', 'click:tbRestRemove': 'حذف الاستراحة', 'click:tripAltsOpen': 'طيّ البدائل وفتحها — البدائل للمدينة وحدها',
    'click:tbMove': 'صينية «No day yet»: وضع مكان بلا يوم', 'click:tbArrangeStart': 'الصينية: Arrange it myself', 'click:tbAutoFill': 'الصينية: Auto-fill the rest',
  },
  linear: {
    'click:tbSetOrder': 'ترتيب المسار (My order · Nearest first)', 'click:tbDTEndSheet': 'نقطة النهاية (＋ End point)', 'change:tbDTTime': 'وقت الانطلاق',
    'change:tbDTStay': 'مدة البقاء في المحطة — خانة لا زر', 'change:tbDTLegMin': 'دقائق الرِّجل', 'change:tbDTLegMode': 'وسيلة الرِّجل', 'change:tbDTLegNote': 'ملاحظة الرِّجل',
  },
};
function outsideAllowed(shape){ return Object.assign({}, OUTSIDE.both, OUTSIDE[shape] || {}); }
const isFn = v => /^[A-Za-z_$][\w$]*$/.test(String(v || ''));
/* ما يُتوقع رسمه لصف بحسب السياق: shape 'city'|'linear' · kind 'saved'|'typed' · alt · siblings (أكثر من محطة) · multi (رحلة متعددة الأيام) */
function expectLabels(c){
  return ROW.filter(function(r){
    const h = c.shape === 'linear' ? r.linear : r.city; if (!isFn(h)) return false;
    if (c.alt && (r.key === 'up' || r.key === 'down' || r.key === 'again')) return false;
    if (r.when === 'alt' && !c.alt) return false;
    if (r.when === 'siblings' && !c.siblings) return false;
    if (r.when === 'typed' && c.kind !== 'typed') return false;
    if (r.when === 'saved' && c.kind !== 'saved') return false;
    if (c.shape === 'linear' && r.linearWhen === 'multi' && !c.multi) return false;
    return true;
  }).map(function(r){ return r.label; });
}
/* المعالج المتوقَّع لكل زر مرسوم في السياق نفسه — الطفرة u24: زر بمعالج الشكل الآخر يُرسم بالاسم الصحيح ولا يعمل */
function expectHandlers(c){ const labels = expectLabels(c); return ROW.filter(function(r){ return labels.indexOf(r.label) >= 0; }).map(function(r){ return c.shape === 'linear' ? r.linear : r.city; }); }
module.exports = { ROW, DOORS, STATIC_OUTSIDE, OUTSIDE, outsideAllowed, isFn, expectLabels, expectHandlers };
