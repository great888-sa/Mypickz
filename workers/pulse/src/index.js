// MyPickz — workers/pulse/src/index.js
// أ-٣ الطبقة ٢ "النبضة": فحص حي كل ساعة للإنتاج والاختبار — جلب النص فقط (لا تنفيذ سكربت ⇒ لا تُحتسب زيارة).
// يكتب نتيجة كل جولة بـKV، ويرسل بريدًا عند الفشل (بعد إعادة محاولة داخلية)، ويعرض الحالة على GET /status.
'use strict';

const TARGETS = [
  {
    name: 'prod',
    url: 'https://mypickz.app/',
    must: ['function initFirebase', 'function loadCity', 'function openAuthModal', 'projectId: "mypickz-6f809"']
  },
  {
    name: 'test',
    url: 'https://test.mypickz.app/index-debug-test.html',
    must: ['function initFirebase', 'function loadCity', 'function openAuthModal', 'projectId: "mypickz-6f809"', 'BUILD:']
  }
];
const MIN_BYTES = 999999999; // TEMP: force failure to test email path — يُعاد إلى 100000 بعد الاختبار
const ATTEMPTS = 2;            // إعادة محاولة داخلية واحدة قبل الحكم بالفشل (تفادي الإنذار الزائف)
const RETRY_DELAY_MS = 10000;
const KV_KEY = 'pulse:last';
const ALLOWED_ORIGINS = ['https://mypickz.app', 'https://test.mypickz.app'];

async function checkOnce(t){
  const started = Date.now();
  const res = await fetch(t.url, { headers: { 'User-Agent': 'MyPickz-Pulse/1.0' }, cf: { cacheTtl: 0, cacheEverything: false } });
  const ms = Date.now() - started;
  if (res.status !== 200) return { ok: false, name: t.name, ms, why: 'HTTP ' + res.status };
  const text = await res.text();
  if (text.length < MIN_BYTES) return { ok: false, name: t.name, ms, why: 'body too small (' + text.length + ' bytes)' };
  const missing = t.must.filter(s => !text.includes(s));
  if (missing.length) return { ok: false, name: t.name, ms, why: 'missing: ' + missing.join(', ') };
  return { ok: true, name: t.name, ms, why: '' };
}

async function checkWithRetry(t){
  let last = null;
  for (let i = 0; i < ATTEMPTS; i++) {
    try { last = await checkOnce(t); }
    catch (e) { last = { ok: false, name: t.name, ms: 0, why: 'fetch error: ' + String(e && e.message || e).slice(0, 120) }; }
    if (last.ok) return last;
    if (i < ATTEMPTS - 1) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
  }
  return last;
}

async function runPulse(env){
  const results = [];
  for (const t of TARGETS) results.push(await checkWithRetry(t));   // تسلسلي — لا توازٍ، لتقليل الاستدعاءات الفرعية
  const ok = results.every(r => r.ok);
  const record = { ok, at: new Date().toISOString(), results };
  // كتابة واحدة فقط لكل جولة (حد KV المجاني ١٠٠٠/يوم — نستهلك ٢٤)
  await env.PULSE_KV.put(KV_KEY, JSON.stringify(record));
  if (!ok) await sendAlert(env, record);
  return record;
}

async function sendAlert(env, record){
  if (!env.EMAIL || !env.ALERT_TO) return; // لو الربط غير مضبوط: الأثر بـKV يكفي، ولا ننهار
  const lines = record.results.map(r => (r.ok ? 'OK   ' : 'FAIL ') + r.name + '  ' + r.ms + 'ms  ' + r.why).join('\n');
  try {
    await env.EMAIL.send({
      from: 'alerts@mypickz.app',
      to: env.ALERT_TO,
      subject: '[MyPickz] Pulse FAILED — ' + record.results.filter(r => !r.ok).map(r => r.name).join(', '),
      text: 'MyPickz pulse check failed at ' + record.at + ' (UTC)\n\n' + lines + '\n\nStatus: https://pulse.mypickz.app/status'
    });
  } catch (e) {
    // فشل البريد لا يُسقط الجولة — الأثر مكتوب بـKV والبطاقة تُظهره
    console.log('email send failed: ' + String(e && e.message || e));
  }
}

function cors(origin){
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
}

export default {
  async scheduled(controller, env, ctx){
    ctx.waitUntil(runPulse(env));
  },
  async fetch(request, env){
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === '/status' && request.method === 'GET') {
      const raw = await env.PULSE_KV.get(KV_KEY);
      return new Response(raw || JSON.stringify({ ok: null, at: null, results: [], note: 'no pulse recorded yet' }), { status: 200, headers: cors(origin) });
    }
    return new Response('MyPickz pulse', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
};
