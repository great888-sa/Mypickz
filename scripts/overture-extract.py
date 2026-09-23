# MyPickz — scripts/overture-extract.py (ز-١): استخراج أماكن مدن الدليل من Overture Places (بيانات مفتوحة CDLA) — مرة واحدة، بلا مفتاح ولا حصة
# المخرج: scripts/eval/overture/<city>.json — [{id, name, names[], cat, lat, lng, addr, locality}] · يعمل بالناشر (DuckDB يقرأ الملفات العامة من S3 مباشرة)
import duckdb, json, os, sys, urllib.request, re
release = os.environ.get('OVERTURE_RELEASE', '').strip()
if not release:  # اكتشاف آخر إصدار من فهرس الحاوية العامة
    xml = urllib.request.urlopen('https://overturemaps-us-west-2.s3.amazonaws.com/?prefix=release/&delimiter=/').read().decode()
    rels = sorted(set(re.findall(r'release/(\d{4}-\d{2}-\d{2}\.\d+)/', xml)))
    release = rels[-1]
print('overture release:', release)
bbox = json.load(open('scripts/eval/cities-bbox.json', encoding='utf-8')); bbox.pop('note', None)
only = [c for c in sys.argv[1:] if c in bbox] or list(bbox.keys())
con = duckdb.connect(); con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';")
src = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*.parquet"
os.makedirs('scripts/eval/overture', exist_ok=True)
for city in only:
    x0, y0, x1, y1 = bbox[city]
    q = f"""
      SELECT id, names.primary AS name, names.common AS common, categories.primary AS cat,
             ST_Y(geometry) AS lat, ST_X(geometry) AS lng,
             addresses[1].freeform AS addr, addresses[1].locality AS locality
      FROM read_parquet('{src}', hive_partitioning=1)
      WHERE bbox.xmin >= {x0} AND bbox.xmax <= {x1} AND bbox.ymin >= {y0} AND bbox.ymax <= {y1}
    """
    try:
        rows = con.execute(q).fetchall()
    except Exception as e:
        print(city, 'ERROR', str(e)[:300]); continue
    out = []
    for r in rows:
        names = []
        if r[2]:
            try: names = [v for v in (r[2].values() if isinstance(r[2], dict) else [])]
            except Exception: names = []
        out.append({'id': r[0], 'name': r[1], 'names': names, 'cat': r[3], 'lat': r[4], 'lng': r[5], 'addr': r[6] or '', 'locality': r[7] or ''})
    json.dump(out, open(f'scripts/eval/overture/{city}.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(city, len(out), 'places', round(os.path.getsize(f'scripts/eval/overture/{city}.json') / 1024), 'KB')
print('DONE')
