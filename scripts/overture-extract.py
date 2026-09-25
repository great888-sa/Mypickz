# MyPickz — scripts/overture-extract.py v3 (ز-١-ج-١ v1.2): استخراج أماكن Overture (CDLA) بالدولة كاملة أو بقائمة مدن → ملفات مقسَّمة بخلايا جغرافية (٠٫١° ≈ ١١ كم)
# الإصدار مثبَّت بملف scripts/eval/overture-release.txt (يُرفع بسير الفحص الشهري فقط) · يقرأ taxonomy.primary وإن غاب يسقط إلى categories.primary
# التشغيل: python scripts/overture-extract.py --regions first_market,europe,usa | --countries SA,BH | --cities <list.json> [ids...]
# المخرج: scripts/eval/cells/<cell>/part-*.jsonl (سطر لكل مكان) — تُفهرَس بـ overture-index.mjs
import duckdb, json, os, sys, re, math, urllib.request
def arg(name, default=''):
    a = [x for x in sys.argv if x.startswith('--' + name + '=')]; return a[0].split('=', 1)[1] if a else default
release = os.environ.get('OVERTURE_RELEASE', '').strip() or open('scripts/eval/overture-release.txt').read().strip()
print('overture release (pinned):', release)
cb = json.load(open('scripts/eval/country-bbox.json', encoding='utf-8'))
boxes = []  # (label, x0, y0, x1, y1)
regions = [r for r in arg('regions').split(',') if r]
countries = [c for c in arg('countries').split(',') if c]
for r in regions: countries += cb['regions'].get(r, [])
for cc in countries:
    b = cb['bbox'].get(cc)
    if b: boxes.append((cc, b[0], b[1], b[2], b[3]))
    else: print('no bbox for', cc)
cities_file = arg('cities')
if cities_file:
    only = set(a for a in sys.argv[1:] if not a.startswith('--'))
    for c in json.load(open(cities_file, encoding='utf-8'))['cities']:
        if only and str(c['id']) not in only: continue
        r = max(6, min(25, 6 + 19 * math.log10(max(c.get('p', 0), 10000) / 10000) / 3)); dlat = r / 111.0; dlng = r / (111.0 * max(0.2, math.cos(math.radians(c['lat']))))
        boxes.append((str(c['id']), c['lng'] - dlng, c['lat'] - dlat, c['lng'] + dlng, c['lat'] + dlat))
if not boxes: print('nothing to extract'); sys.exit(0)
con = duckdb.connect(); con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2'; SET threads=4; SET memory_limit='5GB';")
src = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*.parquet"
out = 'scripts/eval/cells'; os.makedirs(out, exist_ok=True)
def run(label, x0, y0, x1, y1):
    for cat_expr in ["taxonomy.primary", "categories.primary"]:  # الجديد أولًا ثم القديم
        q = f"""
          COPY (
            SELECT id, names.primary AS name, names.common AS common, {cat_expr} AS cat,
                   ST_Y(geometry) AS lat, ST_X(geometry) AS lng,
                   addresses[1].freeform AS addr, addresses[1].locality AS locality,
                   'c' || CAST(CAST(floor(ST_Y(geometry) * 10) AS INTEGER) AS VARCHAR) || '_' || CAST(CAST(floor(ST_X(geometry) * 10) AS INTEGER) AS VARCHAR) AS cell
            FROM read_parquet('{src}', hive_partitioning=1)
            WHERE bbox.xmin >= {x0} AND bbox.xmax <= {x1} AND bbox.ymin >= {y0} AND bbox.ymax <= {y1}
          ) TO '{out}' (FORMAT JSON, PARTITION_BY (cell), APPEND, FILENAME_PATTERN '{label}_{{uuid}}')
        """
        try:
            con.execute(q); n = con.execute(f"SELECT count(*) FROM read_parquet('{src}', hive_partitioning=1) WHERE bbox.xmin >= {x0} AND bbox.xmax <= {x1} AND bbox.ymin >= {y0} AND bbox.ymax <= {y1}").fetchone()[0]
            print(label.ljust(10), 'places', n, '· cat field:', cat_expr); return n
        except Exception as e:
            msg = str(e)
            if 'taxonomy' in cat_expr and ('taxonomy' in msg or 'Binder' in msg): continue
            print(label, 'ERROR', msg[:200]); return -1
    return -1
total = 0
for b in boxes:
    n = run(*b); total += max(n, 0)
json.dump({'release': release, 'boxes': [b[0] for b in boxes], 'places': total}, open(out + '/_extract.json', 'w'))
print('DONE total places', total)
