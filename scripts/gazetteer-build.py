# MyPickz — scripts/gazetteer-build.py (ز-١-ج-١): المعجم المُثرى من GeoNames (CC BY 4.0)
# المصدر: cities500.zip (المواضع ≥ ٥٠٠ نسمة أو مقرّات إدارية حتى PPLA4 ≈ ٢٠٠ ألف) + alternateNamesV2.zip (الأسماء العربية)
# المخرجات: cities/<CC>.json (المعجم بالمستودع: [{id, n, a?, ar?, lat, lng, p}]) · scripts/eval/gaz/idx/<pp>.json (شظايا البحث بالبادئة للعامل) · scripts/eval/gaz/base-cities.json (المجموعة الأساسية للمراجعة)
import csv, io, json, os, re, sys, urllib.request, zipfile, unicodedata
from collections import defaultdict
GEO = 'https://download.geonames.org/export/dump/'
def fetch(name):
    print('download', name); data = urllib.request.urlopen(GEO + name, timeout=120).read(); z = zipfile.ZipFile(io.BytesIO(data)); inner = [n for n in z.namelist() if n.endswith('.txt')][0]; return z.read(inner).decode('utf-8')
def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower(); return re.sub(r'[^a-z0-9\u0600-\u06ff]+', ' ', s).strip()
def norm_ar(s):
    s = re.sub(r'[\u064B-\u0652]', '', str(s)); s = s.replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ة','ه').replace('ى','ي'); return re.sub(r'[^a-z0-9\u0600-\u06ff]+', ' ', s.lower()).strip()
cities = fetch('cities500.zip')
rows = []
for line in cities.split('\n'):
    if not line.strip(): continue
    f = line.split('\t')
    if len(f) < 15: continue
    gid, name, asciiname, alts, lat, lng, fclass, fcode, cc = f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8]
    pop = int(f[14] or 0)
    rows.append({'id': int(gid), 'n': name, 'asc': asciiname, 'alts': [a for a in alts.split(',') if a][:6], 'lat': round(float(lat), 4), 'lng': round(float(lng), 4), 'cc': cc, 'p': pop, 'fcode': fcode})
print('cities500 rows', len(rows))
ids = set(r['id'] for r in rows)
# الأسماء العربية من alternateNamesV2 (ملف ضخم — يُقرأ سطرًا سطرًا ويُحتفظ فقط بما يخص معجمنا)
ar = {}
try:
    alt = fetch('alternateNamesV2.zip')
    for line in alt.split('\n'):
        f = line.split('\t')
        if len(f) < 4 or f[2] != 'ar': continue
        gid = int(f[1])
        if gid in ids and (gid not in ar or f[4] == '1'): ar[gid] = f[3]
    del alt
except Exception as e:
    print('alternate names skipped:', str(e)[:120])
print('arabic names', len(ar))
by_cc = defaultdict(list)
for r in rows:
    e = {'id': r['id'], 'n': r['n'], 'lat': r['lat'], 'lng': r['lng'], 'p': r['p']}
    a = [x for x in ([r['asc']] + r['alts']) if x and x != r['n']][:4]
    if a: e['a'] = a
    if r['id'] in ar: e['ar'] = ar[r['id']]
    by_cc[r['cc']].append(e)
os.makedirs('cities', exist_ok=True)
for cc, arr in by_cc.items():
    arr.sort(key=lambda x: -x['p']); json.dump(arr, open(f'cities/{cc}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('countries', len(by_cc))
# شظايا البحث بالبادئة (حرفان من الاسم المطبَّع، لاتينيًّا وعربيًّا) — للعامل
os.makedirs('scripts/eval/gaz/idx', exist_ok=True)
idx = defaultdict(list)
for cc, arr in by_cc.items():
    for e in arr:
        keys = set()
        for nm in [e['n']] + e.get('a', []):
            k = norm(nm)[:2]
            if len(k) == 2: keys.add(k)
        if e.get('ar'):
            k = norm_ar(e['ar'])[:2]
            if len(k) == 2: keys.add(k)
        for k in keys: idx[k].append({'id': e['id'], 'n': e['n'], 'ar': e.get('ar', ''), 'cc': cc, 'lat': e['lat'], 'lng': e['lng'], 'p': e['p']})
for k, arr in idx.items():
    arr.sort(key=lambda x: -x['p']); safe = ''.join('%04x' % ord(ch) for ch in k)
    json.dump(arr[:400], open(f'scripts/eval/gaz/idx/{safe}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('prefix shards', len(idx))
# (v1.2 · قرار المالك ٢٥ سبتمبر) لا مجموعة أساسية ولا قائمة وجهات: تغطية الأماكن بالمناطق الكاملة (scripts/eval/country-bbox.json) وما عداها بالخلفي عند الطلب
print('DONE')

