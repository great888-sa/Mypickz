// MyPickz — workers/backup/src/index.js
// r100-و (ق١١-٠٣-٠٩): نسخة احتياطية يومية من Firestore إلى R2 — قراءة فقط عبر REST بحساب خدمة محدود · كل مجموعة جذرية ملفَّ JSON بصيغة REST (قابلة للاستعادة بـbatchWrite)
// الحارس: سقف القراءات لكل جولة (MAX_DOCS) — إن تجاوزته المجموعات تتوقف الجولة وتُسجَّل FAILED ويُرسَل بريد؛ لا نسخة تفاضلية (ليس لكل مستند updatedAt — التفاضل يُسقط مستندات صامتًا)
'use strict';

const PROJECT = 'mypickz-6f809';
const DB = 'projects/' + PROJECT + '/databases/(default)';
const BASE = 'https://firestore.googleapis.com/v1/' + DB + '/documents';
const PAGE = 300;                 // مستندات لكل صفحة
const MAX_DOCS = 15000;           // سقف قراءات الجولة (الحصة اليومية ٥٠k — نترك الباقي للتطبيق)
const KEEP_DAYS = 30;             // النسخ المحفوظة
const ALLOWED_ORIGINS = ['https://mypickz.app', 'https://test.mypickz.app'];

function b64url(bytes){ let s = ''; const u = new Uint8Array(bytes); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function pemToDer(pem){ const b = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, ''); const bin = atob(b); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer; }

/* رمز وصول بحساب الخدمة: JWT RS256 → oauth2 token (نطاق datastore للقراءة) */
async function accessToken(env){
  const sa = JSON.parse(env.FIREBASE_SA_KEY || '{}'); if (!sa.client_email || !sa.private_key) throw new Error('FIREBASE_SA_KEY missing');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64url(new TextEncoder().encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(header + '.' + claim));
  const jwt = header + '.' + claim + '.' + b64url(sig);
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt) });
  if (!res.ok) throw new Error('token ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json(); if (!j.access_token) throw new Error('token: no access_token'); return j.access_token;
}

async function gjson(url, token, init){ const res = await fetch(url, Object.assign({ headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }, init || {})); if (!res.ok) throw new Error('firestore ' + res.status + ' ' + (await res.text()).slice(0, 200)); return res.json(); }

/* المجموعات الجذرية — كلها مسطّحة في MyPickz (القواعد: لا مجموعات فرعية) */
async function listCollections(token){ const out = []; let pageToken = ''; do { const j = await gjson(BASE + ':listCollectionIds', token, { method: 'POST', body: JSON.stringify(pageToken ? { pageSize: 100, pageToken: pageToken } : { pageSize: 100 }) }); (j.collectionIds || []).forEach(function(c){ out.push(c); }); pageToken = j.nextPageToken || ''; } while (pageToken); return out.sort(); }

/* عدّ المجموعة قبل قراءتها: استعلام تجميعي count = قراءة واحدة لكل ١٠٠٠ مدخل — فالحارس يقرّر قبل أن يُنفق شيئًا */
async function countCollection(token, name){ const j = await gjson(BASE + ':runAggregationQuery', token, { method: 'POST', body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: name }] }, aggregations: [{ alias: 'n', count: {} }] } }) }); const row = (Array.isArray(j) ? j : [j]).find(function(r){ return r && r.result && r.result.aggregateFields; }); const v = row ? row.result.aggregateFields.n : null; return v ? parseInt(v.integerValue || '0', 10) : 0; }
/* مستندات مجموعة بصيغة REST كما هي (lossless) — الصفحة مقصوصة على ما بقي من الميزانية */
async function dumpCollection(token, name, budget){ const docs = []; let pageToken = ''; do { const left = MAX_DOCS - budget.used; if (left <= 0) throw new Error('budget exceeded at ' + name + ' (' + budget.used + ' >= ' + MAX_DOCS + ')'); const j = await gjson(BASE + '/' + encodeURIComponent(name) + '?pageSize=' + Math.min(PAGE, left) + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''), token); (j.documents || []).forEach(function(d){ docs.push(d); }); budget.used += (j.documents || []).length; pageToken = j.nextPageToken || ''; } while (pageToken); return docs; }

function dayKey(d){ return (d || new Date()).toISOString().slice(0, 10); }

async function prune(env){ /* يُبقي آخر KEEP_DAYS يومًا — بادئات dated/ */ const list = await env.BACKUPS.list({ prefix: 'daily/', delimiter: '/' }); const days = (list.delimitedPrefixes || []).map(function(p){ return p.replace(/^daily\//, '').replace(/\/$/, ''); }).sort(); const old = days.slice(0, Math.max(0, days.length - KEEP_DAYS)); let removed = 0; for (const d of old){ let cursor; do { const objs = await env.BACKUPS.list({ prefix: 'daily/' + d + '/', cursor: cursor }); for (const o of objs.objects){ await env.BACKUPS.delete(o.key); removed++; } cursor = objs.truncated ? objs.cursor : undefined; } while (cursor); } return { pruned: old, removed: removed }; }

async function runBackup(env){
  const started = Date.now(); const day = dayKey(); const record = { ok: false, day: day, at: new Date().toISOString(), collections: [], docs: 0, chars: 0, ms: 0, why: '' };
  try{
    const token = await accessToken(env); const names = await listCollections(token); const budget = { used: 0 };
    const counts = {}; let total = 0; for (const name of names){ counts[name] = await countCollection(token, name); total += counts[name]; } record.expected = total; if (total > MAX_DOCS) throw new Error('budget: ' + total + ' documents > ' + MAX_DOCS + ' — nothing read; raise MAX_DOCS or split the backup'); /* الحارس قبل أي قراءة مستندات */
    for (const name of names){ const docs = await dumpCollection(token, name, budget); const body = JSON.stringify({ collection: name, day: day, count: docs.length, documents: docs }); await env.BACKUPS.put('daily/' + day + '/' + name + '.json', body, { httpMetadata: { contentType: 'application/json' } }); record.collections.push({ name: name, count: docs.length, chars: body.length }); record.docs += docs.length; record.chars += body.length; }
    record.ok = true; record.ms = Date.now() - started;
    await env.BACKUPS.put('daily/' + day + '/manifest.json', JSON.stringify(record), { httpMetadata: { contentType: 'application/json' } });
    try{ record.prune = await prune(env); }catch(e){ record.pruneError = String(e && e.message || e); }
  }catch(e){ record.ok = false; record.why = String(e && e.message || e).slice(0, 300); record.ms = Date.now() - started; }
  try{ await env.BACKUPS.put(record.ok ? 'latest.json' : 'latest-failure.json', JSON.stringify(record), { httpMetadata: { contentType: 'application/json' } }); }catch(e){ record.statusWriteError = String(e && e.message || e); } /* آخر نجاح لا يُمحى بفشل */
  if (!record.ok) await sendAlert(env, record);
  return record;
}

async function sendAlert(env, record){
  if (!env.EMAIL || !env.ALERT_TO) return;
  try{ await env.EMAIL.send({ from: 'alerts@mypickz.app', to: env.ALERT_TO, subject: '[MyPickz] Backup FAILED — ' + record.day, text: 'MyPickz daily backup failed at ' + record.at + ' (UTC)\n\n' + record.why + '\n\nDone before failing: ' + record.collections.map(function(c){ return c.name + ' ' + c.count; }).join(', ') + '\n\nStatus: https://backup.mypickz.app/status (failures: latest-failure.json in the bucket)' }); }
  catch(e){ console.log('email send failed: ' + String(e && e.message || e)); }
}

function cors(origin){ const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]; return { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }; }

export default {
  async scheduled(controller, env, ctx){ ctx.waitUntil(runBackup(env)); },
  async fetch(request, env){
    const url = new URL(request.url); const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === '/status' && request.method === 'GET'){ /* عام: الحالة والعدد الإجمالي فقط — لا أسماء مجموعات ولا نصوص أخطاء */ const pick = function(r){ return r ? { ok: r.ok, day: r.day, at: r.at, docs: r.docs, expected: r.expected, ms: r.ms, failed: r.ok ? undefined : true } : null; }; const ok = await env.BACKUPS.get('latest.json'); const bad = await env.BACKUPS.get('latest-failure.json'); const lastOk = ok ? pick(JSON.parse(await ok.text())) : null; const lastFail = bad ? pick(JSON.parse(await bad.text())) : null; return new Response(JSON.stringify({ lastOk: lastOk, lastFailure: lastFail, note: lastOk ? undefined : 'no successful backup recorded yet' }), { status: 200, headers: cors(origin) }); }
    return new Response('MyPickz backup', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
};
