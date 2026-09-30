# MyPickz — scripts/divisions-extract.py (خ-٤ · الحي من الموضع): حدود الأحياء والبلدات من Overture Divisions (الإصدار المثبَّت) لكل دولة → خلايا ٠٫٥° مضغوطة div/<CC>/<cell>.json.gz = [{n, t, ring:[[lng,lat],…]}] (مبسَّطة)
# التشغيل: python scripts/divisions-extract.py --countries=SA,BH | --regions=first_market,europe,usa
import duckdb, json, os, sys, gzip, math
def arg(name, default=''):
    a = [x for x in sys.argv if x.startswith('--' + name + '=')]; return a[0].split('=', 1)[1] if a else default
release = open('scripts/eval/overture-release.txt').read().strip(); print('release', release)
cb = json.load(open('scripts/eval/country-bbox.json', encoding='utf-8'))
ccs = [c for c in arg('countries').split(',') if c]
for r in [x for x in arg('regions').split(',') if x]: ccs += cb['regions'].get(r, [])
con = duckdb.connect(); con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2'; SET threads=4; SET memory_limit='5GB';")
src = f"s3://overturemaps-us-west-2/release/{release}/theme=divisions/type=division_area/*.parquet"
report = {}
for cc in ccs:
    b = cb['bbox'].get(cc)
    if not b: print(cc, 'no bbox'); continue
    out = f'scripts/eval/r2/div/{cc}'; os.makedirs(out, exist_ok=True)
    q = f"""SELECT names.primary AS n, subtype AS t, ST_AsGeoJSON(ST_Simplify(geometry, 0.0004)) AS g FROM read_parquet('{src}', hive_partitioning=1)
            WHERE country = '{cc}' AND subtype IN ('locality','neighborhood','microhood','macrohood','localadmin') AND bbox.xmin >= {b[0]} AND bbox.xmax <= {b[2]} AND bbox.ymin >= {b[1]} AND bbox.ymax <= {b[3]}"""
    try:
        diag = con.execute(f"SELECT subtype, count(*) FROM read_parquet('{src}', hive_partitioning=1) WHERE country = '{cc}' GROUP BY subtype ORDER BY 2 DESC").fetchall()
        print(cc, 'division areas by subtype (no bbox filter):', diag)
        rows = con.execute(q).fetchall()
    except Exception as e: print(cc, 'ERROR', str(e)[:300]); continue
    cells = {}; n = 0
    for name, t, g in rows:
        if not name or not g: continue
        try: geo = json.loads(g)
        except Exception: continue
        polys = [geo['coordinates']] if geo['type'] == 'Polygon' else (geo['coordinates'] if geo['type'] == 'MultiPolygon' else [])  # كل مضلع = [حلقة خارجية، ثقوب…]
        for poly in polys:
            ring = poly[0] if poly else []  # الحلقة الخارجية
            if len(ring) < 4: continue
            ring = [[round(x, 5), round(y, 5)] for x, y in ring]
            lngs = [p[0] for p in ring]; lats = [p[1] for p in ring]
            for cy in range(math.floor(min(lats) * 2), math.floor(max(lats) * 2) + 1):
                for cx in range(math.floor(min(lngs) * 2), math.floor(max(lngs) * 2) + 1):
                    cells.setdefault(f'd{cy}_{cx}', []).append({'n': name[:60], 't': t, 'ring': ring})
            n += 1
    size = 0
    for k, arr in cells.items():
        data = gzip.compress(json.dumps(arr, ensure_ascii=False).encode()); size += len(data); open(f'{out}/{k}.json.gz', 'wb').write(data)
    json.dump({'cc': cc, 'areas': n, 'cells': len(cells), 'mb': round(size / 1048576, 1), 'release': release}, open(f'{out}/manifest.json', 'w'))
    report[cc] = {'areas': n, 'cells': len(cells), 'mb': round(size / 1048576, 1)}
    print(cc.ljust(4), 'areas', str(n).rjust(7), 'cells', str(len(cells)).rjust(5), 'mb', round(size / 1048576, 1))
os.makedirs('scripts/eval/r2/div', exist_ok=True); json.dump(report, open('scripts/eval/r2/div/report.json', 'w'))
print('DONE', len(report), 'countries', round(sum(v['mb'] for v in report.values()), 1), 'MB')
