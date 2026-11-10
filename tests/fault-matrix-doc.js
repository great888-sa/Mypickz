// MyPickz — tests/fault-matrix-doc.js (r99): يولّد وثيقة مصفوفة الإفشال من tests/fault-matrix.json — المنطبق بخلاياه، وسطر «غير منطبق» بسببه تحت كل قدرة
// node tests/fault-matrix-doc.js > "docs/MyPickz-مصفوفة-الإفشال.md"
'use strict';
const fs = require('fs'), path = require('path');
const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'fault-matrix.json'), 'utf8'));
const MODE_AR = { network: 'شبكة مقطوعة', permission: 'إذن مرفوض', partial: 'بيانات ناقصة', bad: 'إدخال فاسد', concurrency: 'تزامن', stale: 'حالة متقادمة' };
const J_AR = { A: 'A رسالة', B: 'B بيانات', C: 'C رجوع', D: 'D أثر' };
const byKey = {}; m.cells.forEach(c => { byKey[c.cap + '/' + c.mode] = c; });
let out = '# MyPickz — مصفوفة الإفشال · v1.11 · r105 (ق١١-٠٩-٠١) — قدرة جديدة trips.optionSwap: التبديل بين الخيارات في Day route بعد الحفظ (٦ خضراء) · r104: places.publish · لا خلية حمراء جديدة؛ لم يبقَ إلا خليتا القرار (الرسائل في د · الإدخال في ج · التزامن في ب · العائلتان ١ و٥ في أ)\n\n';
out += '**المصدر:** تُولَّد من `tests/fault-matrix.json` الذي تكتبه محطة r99 في المسار عند كل تشغيل (`node tests/fault-matrix-doc.js`) — لا تُحرَّر باليد.\n';
out += '**البناء:** `' + m.build + '` · **التاريخ:** ' + m.at + ' · **الخلايا:** ' + m.cells.length + ' = ' + m.groups.reduce((a, g) => a + g.caps.length, 0) + ' قدرة × ' + m.modes.length + ' أنماط · **منطبقة:** ' + (m.ok + m.reds) + ' · **خضراء:** ' + m.ok + ' · **حمراء:** ' + m.reds + ' · **غير منطبقة:** ' + m.na + '\n\n';
out += '## كيف تقرأ\n- **الأنماط:** شبكة مقطوعة (كل نداء يرفض) · إذن مرفوض · بيانات ناقصة (المستند بلا حقوله المركّبة) · إدخال فاسد (فارغ · ٥٠٠٠ حرف · HTML · روابط غير Google) · تزامن (الفعل مرتين معًا) · حالة متقادمة (المخزن تغيّر بعد التحميل — علامة على كل مستند؛ ضياعها = كتابة عمياء).\n';
out += '- **الأحكام:** A رسالة مفهومة (toast/ورقة/خانة خطأ غير فارغة وبلا رمز خام) · B لا فقد بيانات (المخزن والذاكرة) · C طريق رجوع (لا نافذة بلا إغلاق · لا Loading… معلّق · لا تعليق فوق ٦ ثوانٍ) · D أثر في NET/Diag (logTiming أو mpSwallow).\n';
out += '- **الخلية:** ✅ كل الأحكام المنطبقة صحيحة · 🔴 + حروف الأحكام الساقطة · «—» غير منطبق (السبب في سطر القدرة). أحكام كل نمط: network/permission ABCD · partial BC · bad ABC · concurrency BC · stale BC.\n';
out += '- **المصفوفة ترصد ولا تصلح** (قرار المالك ١٠:٣٠): الحُمر تُعرض للاعتماد ثم تُصلح في r100؛ الحارس §35 يمنع زيادتها ويطلب خفض الأساس حين تُغلق.\n\n';
for (const g of m.groups){
  out += '## ' + g.name + ' (' + g.caps.length + ')\n| القدرة | ' + m.modes.map(x => MODE_AR[x]).join(' | ') + ' |\n|---|' + m.modes.map(() => '---').join('|') + '|\n';
  const naLines = [];
  for (const cap of g.caps){
    const row = m.modes.map(mode => { const c = byKey[cap.id + '/' + mode] || {}; if (c.na){ return '—'; } if (!c.v) return '?'; return c.v === 'ok' ? '✅' : '🔴 ' + c.v.slice(2); });
    out += '| `' + cap.id + '` ' + cap.name + ' | ' + row.join(' | ') + ' |\n';
    const nas = m.modes.filter(mode => (byKey[cap.id + '/' + mode] || {}).na).map(mode => MODE_AR[mode] + ' (' + byKey[cap.id + '/' + mode].na + ')');
    if (nas.length) naLines.push('`' + cap.id + '`: ' + nas.join(' · '));
  }
  if (naLines.length) out += '\nغير منطبق — ' + naLines.join(' · ') + '\n';
  const reds = m.cells.filter(c => c.group === g.id && c.v && c.v !== 'ok');
  if (reds.length){ out += '\n**الحُمر (' + reds.length + '):**\n'; reds.forEach(c => { out += '- `' + c.cap + '` × ' + MODE_AR[c.mode] + ' → ' + c.v.slice(2).split('').map(j => J_AR[j]).join(' · ') + (c.why ? ' — ' + c.why : '') + (c.detail && c.detail.text ? ' — النص: «' + c.detail.text.slice(0, 100) + '»' : '') + (c.detail && c.detail.thrown ? ' — رُمي: ' + c.detail.thrown : '') + '\n'; }); }
  out += '\n';
}
/* ترتيب الاعتماد: فقد البيانات ← لا رجوع ← الرسالة ← الأثر */
const sev = c => (c.v.indexOf('B') >= 0 ? 0 : c.v.indexOf('C') >= 0 ? 1 : c.v.indexOf('A') >= 0 ? 2 : 3);
const reds = m.cells.filter(c => c.v && c.v !== 'ok').sort((a, b) => sev(a) - sev(b));
out += '## الحُمر مرتّبة للاعتماد (' + reds.length + ') — فقد البيانات ← لا رجوع ← الرسالة ← الأثر\n| # | القدرة | النمط | الساقط | السبب |\n|---|---|---|---|---|\n';
reds.forEach((c, i) => { out += '| ' + (i + 1) + ' | `' + c.cap + '` | ' + MODE_AR[c.mode] + ' | ' + c.v.slice(2) + ' | ' + (c.why || '').replace(/\|/g, '/') + ' |\n'; });
process.stdout.write(out);
