// MyPickz — scripts/resolve-eval.mjs (ز-١): قياس حل الروابط عبر العامل الحي places.mypickz.app/resolve — يقارن الاسم المستخرج بالاسم المعروف
// التشغيل: node scripts/resolve-eval.mjs [--base=https://places.mypickz.app] [--limit=150]
import fs from 'fs';
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const BASE = arg('base', 'https://places.mypickz.app'), LIMIT = parseInt(arg('limit', '0'), 10);
const norm = s => String(s || '').toLowerCase().replace(/[’'`´®™]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = s => new Set(norm(s).split(' ').filter(Boolean));
const sim = (a, b) => { const A = toks(a), B = toks(b); if (!A.size || !B.size) return 0; const inter = [...A].filter(t => B.has(t)).length; return inter / Math.min(A.size, B.size); };
const sample = JSON.parse(fs.readFileSync('scripts/eval/resolve-sample.json', 'utf8')).sample.slice(0, LIMIT || undefined);
const out = { ok: 0, partial: 0, empty: 0, wrong: 0, error: 0, bySrc: {}, rows: [] }; const t0 = Date.now();
for (const p of sample){
  const b = out.bySrc[p.src] = out.bySrc[p.src] || { n: 0, ok: 0, partial: 0, empty: 0, wrong: 0, error: 0 }; b.n++;
  let res; try{ const r = await fetch(BASE + '/resolve?url=' + encodeURIComponent(p.url)); res = await r.json(); }catch(e){ out.error++; b.error++; out.rows.push({ src: p.src, name: p.name, verdict: 'error' }); continue; }
  const got = res.name || ''; const s = sim(p.name.split('|')[0], got);
  let v = !got ? 'empty' : s >= 0.99 ? 'ok' : s >= 0.5 ? 'partial' : 'wrong'; out[v]++; b[v]++;
  out.rows.push({ src: p.src, name: p.name, got, addr: res.addr || '', verdict: v, sim: +s.toFixed(2) });
  await new Promise(r => setTimeout(r, 400));
}
const n = sample.length, pct = x => (100 * x / n).toFixed(1) + '%';
console.log('RESOLVE-EVAL · n=' + n + ' · ok ' + out.ok + ' (' + pct(out.ok) + ') · partial ' + out.partial + ' · empty ' + out.empty + ' · wrong ' + out.wrong + ' · error ' + out.error + ' · ' + Math.round((Date.now() - t0) / 1000) + 's');
Object.keys(out.bySrc).forEach(k => { const b = out.bySrc[k]; console.log('  ' + k.padEnd(6) + ' n=' + String(b.n).padStart(3) + '  ok ' + String(b.ok).padStart(3) + '  partial ' + String(b.partial).padStart(2) + '  empty ' + String(b.empty).padStart(2) + '  wrong ' + String(b.wrong).padStart(2) + '  error ' + b.error); });
out.rows.filter(r => r.verdict !== 'ok').slice(0, 25).forEach(r => console.log('  ' + r.verdict.padEnd(7) + ' | ' + r.name.slice(0, 40).padEnd(40) + ' → ' + (r.got || '').slice(0, 50)));
fs.writeFileSync('scripts/eval/resolve-report.json', JSON.stringify(out, null, 1));
const pass = (out.ok + out.partial) / n >= 0.85 && out.wrong / n <= 0.03;
console.log(pass ? 'VERDICT: PASS (name found ≥ 85% · wrong ≤ 3%)' : 'VERDICT: FAIL');
