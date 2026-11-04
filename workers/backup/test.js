// MyPickz — workers/backup/test.js: اختبار محلي بلا شبكة — token (RS256 حقيقي بمفتاح مولَّد) · المجموعات · الصفحات · R2 · الحارس · التقليم · البريد
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const mod = await import('./src/index.js');
const w = mod.default;

const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey);
const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(pkcs8).toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
const SA = JSON.stringify({ client_email: 'backup@mypickz-6f809.iam.gserviceaccount.com', private_key: pem });

function mkR2(){ const store = new Map(); return { store, put: async (k, v) => { store.set(k, String(v)); }, get: async (k) => store.has(k) ? { text: async () => store.get(k) } : null, delete: async (k) => { store.delete(k); }, list: async (o) => { const keys = [...store.keys()].filter(k => k.startsWith(o.prefix || '')); if (o.delimiter){ const set = new Set(); keys.forEach(k => { const rest = k.slice(o.prefix.length); const i = rest.indexOf('/'); if (i >= 0) set.add(o.prefix + rest.slice(0, i + 1)); }); return { objects: [], delimitedPrefixes: [...set], truncated: false }; } return { objects: keys.map(k => ({ key: k })), truncated: false }; } }; }

let verifiedJwt = false; const calls = [];
function mkFetch(docsPerCol){ return async (url, init) => { calls.push(url);
  if (url.startsWith('https://oauth2.googleapis.com/token')){ const body = String(init.body); const jwt = decodeURIComponent(body.split('assertion=')[1]); const [h, c, s] = jwt.split('.'); const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', kp.publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'), new TextEncoder().encode(h + '.' + c)); verifiedJwt = ok; const claim = JSON.parse(Buffer.from(c.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); if (claim.scope !== 'https://www.googleapis.com/auth/datastore') return new Response('bad scope', { status: 400 }); return new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 }); }
  if (!init || !init.headers || init.headers.Authorization !== 'Bearer tok') return new Response('unauthorized', { status: 401 });
  if (url.endsWith(':listCollectionIds')) return new Response(JSON.stringify({ collectionIds: Object.keys(docsPerCol) }), { status: 200 });
  if (url.endsWith(':runAggregationQuery')){ const q = JSON.parse(init.body); const name = q.structuredAggregationQuery.structuredQuery.from[0].collectionId; return new Response(JSON.stringify([{ result: { aggregateFields: { n: { integerValue: String(docsPerCol[name] || 0) } } } }]), { status: 200 }); }
  const m = /documents\/([^?]+)\?pageSize=(\d+)(?:&pageToken=(\d+))?/.exec(url); if (!m) return new Response('nf', { status: 404 });
  const name = decodeURIComponent(m[1]), page = +m[2], from = +(m[3] || 0); const n = docsPerCol[name]; const docs = []; for (let i = from; i < Math.min(n, from + page); i++) docs.push({ name: 'projects/mypickz-6f809/databases/(default)/documents/' + name + '/d' + i, fields: { v: { integerValue: String(i) } } });
  const out = { documents: docs }; if (from + page < n) out.nextPageToken = String(from + page); return new Response(JSON.stringify(out), { status: 200 }); }; }

let fails = 0; const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fails++; };

// ١ · جولة ناجحة: مجموعتان · ٦٥٠ مستندًا على ٣ صفحات · manifest · latest · لا بريد
{ globalThis.fetch = mkFetch({ users: 650, trips: 3 }); const r2 = mkR2(); const mails = []; const env = { FIREBASE_SA_KEY: SA, BACKUPS: r2, EMAIL: { send: async (m) => { mails.push(m); } }, ALERT_TO: 'o@x' };
  let done; await w.scheduled({}, env, { waitUntil: (p) => { done = p; } }); const rec = await done;
  check(verifiedJwt, 'JWT RS256 signed with the service account key and verified');
  check(rec.ok === true && rec.docs === 653 && rec.collections.length === 2, 'run ok · 653 docs · 2 collections: ' + JSON.stringify(rec.collections));
  const users = JSON.parse(r2.store.get('daily/' + rec.day + '/users.json')); check(users.count === 650 && users.documents.length === 650 && users.documents[649].name.endsWith('/users/d649'), 'users.json holds all 650 documents across 3 pages (REST format kept)');
  check(r2.store.has('daily/' + rec.day + '/manifest.json') && r2.store.has('latest.json'), 'manifest + latest written');
  check(calls.filter(u => /documents\/users\?/.test(u)).length === 3, 'users paged 3 times (300 · 300 · 50)');
  check(mails.length === 0, 'no alert on success');
  check(rec.expected === 653, 'count-first: expected 653 from the aggregation (1 read per 1000)');
  const res = await w.fetch(new Request('https://backup.mypickz.app/status', { headers: { Origin: 'https://mypickz.app' } }), env); const st = await res.json(); check(st.lastOk && st.lastOk.ok === true && st.lastOk.docs === 653 && !JSON.stringify(st).includes('integerValue') && !JSON.stringify(st).includes('users'), '/status returns totals only — no data, no collection names');
}
// ٢ · الحارس: ٢٠٠٠٠ مستند > السقف → FAILED قبل أي قراءة · بريد · latest-failure · لا manifest لليوم
{ calls.length = 0; globalThis.fetch = mkFetch({ huge: 20000 }); const r2 = mkR2(); const mails = []; const env = { FIREBASE_SA_KEY: SA, BACKUPS: r2, EMAIL: { send: async (m) => { mails.push(m); } }, ALERT_TO: 'o@x' };
  let done; await w.scheduled({}, env, { waitUntil: (p) => { done = p; } }); const rec = await done;
  check(rec.ok === false && /budget: 20000 documents > 15000/.test(rec.why) && calls.filter(u => /documents\/huge\?/.test(u)).length === 0, 'budget guard decides before reading any document: ' + rec.why);
  check(mails.length === 1 && /Backup FAILED/.test(mails[0].subject), 'alert mail sent once');
  check(!r2.store.has('daily/' + rec.day + '/manifest.json') && !r2.store.has('latest.json') && JSON.parse(r2.store.get('latest-failure.json')).ok === false, 'no manifest for the failed day · failure recorded apart (latest.json untouched)');
}
// ٣ · التقليم: ٣٣ يومًا محفوظة → تبقى ٣٠
{ globalThis.fetch = mkFetch({ users: 2 }); const r2 = mkR2(); for (let i = 1; i <= 33; i++){ const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); r2.store.set('daily/' + d + '/users.json', '{}'); r2.store.set('daily/' + d + '/manifest.json', '{}'); }
  const env = { FIREBASE_SA_KEY: SA, BACKUPS: r2 }; let done; await w.scheduled({}, env, { waitUntil: (p) => { done = p; } }); const rec = await done;
  const days = new Set([...r2.store.keys()].filter(k => k.startsWith('daily/')).map(k => k.split('/')[1]));
  check(rec.ok && days.size === 30 && rec.prune.pruned.length === 4 && rec.prune.removed === 8, 'prune keeps 30 days (34 → 30 · 8 objects removed)');
}
// ٤ · سرّ مفقود → FAILED بسبب واضح
{ const r2 = mkR2(); const env = { FIREBASE_SA_KEY: '', BACKUPS: r2 }; let done; await w.scheduled({}, env, { waitUntil: (p) => { done = p; } }); const rec = await done; check(rec.ok === false && /FIREBASE_SA_KEY missing/.test(rec.why), 'missing secret reported plainly'); }
console.log(fails ? '❌ BACKUP TESTS FAILED (' + fails + ')' : '✅ BACKUP TESTS PASSED');
process.exit(fails ? 1 : 0);
