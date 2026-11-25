// MyPickz — tests/tools/solo.js (المحور ١ · ١٣ نوفمبر ٢٠٢٦ · ق١١-١٣-٠٥: أداة تشغّل كل محطة وحدها)
// لكل محطة في tests/journey.js: محطتا الأساس (١ · ٢) ثم المحطة وحدها — «مستقلة» إن خضرت، «تابعة» إن احمرّت (تعتمد على أثر تركته محطة قبلها).
// الغاية: محطة تابعة يُسقطها سقوط غيرها، وقد تخضرّ بفضل أثر غيرها؛ وحكم الطفرات عليها لا يُعتمد (tests/tools/mutate.js يرفضها).
// النتيجة تُكتب في tests/solo-status.json: { build, at, total, dependent: [أسماء التابعة] } — الحارس §37d في tests/audit.js يمنع زيادة التابعات ويطلب قياس كل محطة جديدة.
// الاستعمال:  node tests/tools/solo.js                 (كل المحطات — نحو ربع ساعة على معالجين: شغّله في نسختين بـ start/step)
//             node tests/tools/solo.js --new           (المحطات غير المقيسة بعدُ وحدها: ما ليس في solo-status.json)
//             node tests/tools/solo.js --part 0 2 out0.txt   (النصف الأول إلى ملف نتائج — للتشغيل المتوازي على نسختين من المستودع)
//             node tests/tools/solo.js --merge out0.txt out1.txt   (يجمع ملفات النتائج ويكتب solo-status.json)
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const STATUS = path.join(ROOT, 'tests', 'solo-status.json');
const src = fs.readFileSync(path.join(ROOT, 'tests', 'journey.js'), 'utf8').split('\n');
const names = []; src.forEach(l => { const m = l.match(/^  await must\('((?:[^'\\]|\\.)*)'/) || l.match(/^  await must\("((?:[^"\\]|\\.)*)"/); if (m) names.push(m[1]); else if (/^  await must\(/.test(l)){ console.error('solo: a station line the parser cannot name: ' + l.slice(0, 80)); process.exit(2); } });
const BASE = ['١ · ', '٢ · ']; const isBase = n => BASE.some(p => n.indexOf(p) === 0);
const buildId = (function(){ try{ return (fs.readFileSync(path.join(ROOT, 'index-debug-test.html'), 'utf8').match(/M2-ID-r\d{2,3}/) || [''])[0]; }catch(_){ return ''; } })();
const args = process.argv.slice(2);
const readStatus = () => { try{ return JSON.parse(fs.readFileSync(STATUS, 'utf8')); }catch(_){ return null; } };
const writeStatus = (res) => { /* res: { name: true|false } — يُدمج في الحالة القائمة: ما قيس الآن يحلّ محلّ القديم، وما زال اسمه من الرحلة يخرج */
  const old = readStatus() || { dependent: [], measured: [] }; const dep = new Set(old.dependent || []), meas = new Set(old.measured || []);
  Object.keys(res).forEach(n => { meas.add(n); if (res[n]) dep.delete(n); else dep.add(n); });
  const live = new Set(names); const out = { note: 'يكتبه tests/tools/solo.js — لا يُحرَّر باليد', build: buildId, at: new Date().toISOString().slice(0, 10), total: names.filter(n => !isBase(n)).length, measured: [...meas].filter(n => live.has(n)).sort(), dependent: [...dep].filter(n => live.has(n)).sort() };
  fs.writeFileSync(STATUS, JSON.stringify(out, null, 1) + '\n'); return out; };
/* المراجعة المستقلة (٧): «تابعة» = احمرّت محطة (خروج ١ وفيه سطر FAIL أو حكم الفشل). مهلة · قتل · شكل غير معروف · بيئة ناقصة = خطأ تشغيل: الأداة تتوقف ولا تكتب حالة */
const runOne = (i) => { const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'subset.js'), '--idx', String(i)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 660000 }); const t = ((r.stdout || '') + (r.stderr || '')).trim().split('\n'); const last = (t[t.length - 1] || '').slice(0, 120); const judged = t.some(l => /SUBSET (PASSED|FAILED)/.test(l) || /^FAIL  harness/.test(l)) /* سطر الحكم قد يتبعه خطأ متأخر من jsdom على stderr */; /* وسقوط الهيكل نفسه (محطة تقرأ ما لم تزرعه) حكم أحمر لا خطأ تشغيل */ if (r.status === null || r.status > 1 || !judged){ console.error('solo: RUN ERROR at station ' + i + ' (' + names[i].slice(0, 60) + ') — exit ' + r.status + ' · ' + last); process.exit(3); } return { ok: r.status === 0, last: last, first: (t.filter(l => /^FAIL/.test(l))[0] || '').slice(0, 200) }; };
if (args[0] === '--merge'){ const res = {}; args.slice(1).forEach(f => { const lines = fs.readFileSync(f, 'utf8').split('\n'); if (lines.indexOf('DONE') < 0){ console.error('solo: ' + f + ' is not complete (no DONE line)'); process.exit(2); } lines.forEach(l => { const p = l.split('\t'); if (p.length >= 3 && (p[1] === 'OK' || p[1] === 'DEP')){ const nm = names[parseInt(p[0], 10)]; if (!nm || nm.slice(0, 90) !== p[2]){ console.error('solo: ' + f + ' was measured on another journey.js (station ' + p[0] + ' is not «' + p[2].slice(0, 50) + '» here) — measure again'); process.exit(2); } res[nm] = p[1] === 'OK'; } }); }); /* المراجعة (٦): الاسم المكتوب في الملف يُطابَق باسم المحطة هنا — ملف قيس على رحلة أخرى يُرفض */ const o = writeStatus(res); console.log('solo: merged ' + Object.keys(res).length + ' · measured ' + o.measured.length + '/' + o.total + ' · dependent ' + o.dependent.length); process.exit(0); }
let start = 0, step = 1, outFile = null, onlyNew = false;
if (args[0] === '--part'){ start = parseInt(args[1], 10) || 0; step = parseInt(args[2], 10) || 1; outFile = args[3] || null; }
if (args[0] === '--new') onlyNew = true;
const known = new Set(((readStatus() || {}).measured) || []);
if (outFile && fs.existsSync(outFile)){ console.error('solo: ' + outFile + ' exists — remove it first (results are appended)'); process.exit(2); }
{ const b0 = cp.spawnSync(process.execPath, [path.join(__dirname, 'subset.js'), '--idx', String(names.findIndex(isBase))], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 660000 }); if (b0.status !== 0){ console.error('solo: the base stations alone are red — nothing can be judged (' + (((b0.stdout || '') + (b0.stderr || '')).trim().split('\n').pop() || '').slice(0, 120) + ')'); process.exit(3); } }
const res = {}; let n = 0, dep = 0;
names.forEach((name, i) => {
  if (isBase(name) || i % step !== start || (onlyNew && known.has(name))) return;
  const r = runOne(i); res[name] = r.ok; n++; if (!r.ok) dep++;
  const line = i + '\t' + (r.ok ? 'OK' : 'DEP') + '\t' + name.slice(0, 90) + (r.ok ? '' : '\t' + (r.first || r.last));
  if (outFile) fs.appendFileSync(outFile, line + '\n'); console.log(line);
});
if (outFile){ fs.appendFileSync(outFile, 'DONE\n'); console.log('solo: part ' + start + '/' + step + ' · ' + n + ' stations · dependent ' + dep + ' → ' + outFile); }
else { const o = writeStatus(res); console.log('solo: ran ' + n + ' · measured ' + o.measured.length + '/' + o.total + ' · dependent ' + o.dependent.length + ' → tests/solo-status.json'); }
