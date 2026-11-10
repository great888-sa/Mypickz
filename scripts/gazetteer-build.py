# MyPickz — scripts/gazetteer-build.py (ز-١-ج-١ · r107-ج ق١١-١٠-٠٢): المعجم المُثرى من GeoNames (CC BY 4.0)
# المصدر: cities500.zip (المواضع ≥ ٥٠٠ نسمة أو مقرّات إدارية) + alternateNamesV2.zip (الأسماء بلغاتها وأعلامها) + countryInfo.txt (لغات كل دولة)
# المخرجات: cities/<CC>.json  [{id, n, s?, a?, ar?, lat, lng, p, r?, island?}]  ·  scripts/eval/gaz/idx/<pp>.json (شظايا البحث للعامل)  ·  scripts/eval/gaz/report.json
#
# r107-ج — لماذا أُعيد الباني (عيّنة المالك: أماكن نيويورك تُثبَّت في كلينتون، ويسكونسن):
#   كان a = أول أربعة بدائل من عمود alternatenames كيفما جاءت — أسماء تاريخية وبلغات شتى، فصار «New York» بديلًا لبلدتين ليست أيٌّ منهما نيويورك
#   وصفّ نيويورك نفسه («New York City») بلا «New York». الجديد:
#   (١) s = الأسماء القوية: ما عُلّم في alternateNamesV2 مفضَّلًا أو مختصرًا بالإنجليزية أو بلغة الدولة، غير تاريخي ولا دارج · + الاسم بلا لاحقة City حين لا يحمله صفٌّ آخر في الدولة
#       + scripts/eval/gaz-strong.json (ما ثبت بعيّنة) — التطبيق يقدّمها على a (gazNameRank: n ٤ · s ٣ · بلا City ٢ · a ١).
#   (٢) a = بدائل منقّاة: إنجليزية أو بلغة الدولة، غير تاريخية ولا دارجة، وما يساوي اسم مدينة أكبر عشر مرات في الدولة نفسها يُحذف (الضجيج نفسه).
#   (٣) بناء إضافي: صفٌّ قائم يحتفظ بمعرّفه واسمه ومركزه وسكانه — يُضاف إليه s وتُنقّى a فقط · لا صف يُحذف · الجديد يُلحق.
#   (٤) فحص سلامة قبل أي كتابة: لا صف ضاع · لا اسم/مركز تغيّر · المراسي (نيويورك تحمل New York) · لا بديل يساوي اسم مدينة أكبر — وإلا يخرج بلا كتابة (فيتوقف سير العمل قبل الإيداع).
#   (٥) alternateNamesV2 يُقرأ دفقًا (كان يُحمَّل كله في الذاكرة) · غيابه يوقف البناء (كان يُتجاوز بصمت فيخرج معجم بلا عربية) إلا مع --allow-no-alt.
#
# الاستعمال:  python scripts/gazetteer-build.py            (سير العمل Cities publish)
#             python scripts/gazetteer-build.py --dry      (يحسب ويفحص ويطبع التقرير ولا يكتب)
#             python scripts/gazetteer-build.py --selftest (عيّنة مصغّرة مضمَّنة — بلا شبكة)
import io, json, os, re, sys, tempfile, unicodedata, urllib.request, zipfile
from collections import defaultdict

GEO = 'https://download.geonames.org/export/dump/'
PSEUDO = {'link', 'post', 'iata', 'icao', 'faac', 'abbr', 'wkdt', 'unlc', 'tcid', 'phon', 'piny', 'fr_1793'}
HARD_ANCHORS = [('US', 5128581, 'New York')]  # عيّنة ثبتت بالقياس — غيابها يوقف البناء
BIG_RATIO = 10


def norm(s):  # كـ pickerNormalize في التطبيق
    s = unicodedata.normalize('NFD', str(s or '')).lower()
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)


def words(s):
    s = unicodedata.normalize('NFD', str(s or '')).lower()
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return [w for w in re.sub(r'[^a-z0-9]+', ' ', s).split() if not w.isdigit()]


def core(s):  # كـ gazCore في التطبيق: الاسم بلا لاحقة City
    w = words(s)
    while len(w) > 1 and w[-1] == 'city':
        w.pop()
    return ' '.join(w)


def norm_ar(s):
    s = re.sub(r'[ً-ْ]', '', str(s))
    s = s.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^a-z0-9؀-ۿ]+', ' ', s.lower()).strip()


def open_source(name, src):
    """يعيد كائنًا يُقرأ سطرًا سطرًا (دفقًا) — من مجلد محلي (--src) أو من GeoNames."""
    txt = name.replace('.zip', '.txt')
    if src:
        p = os.path.join(src, txt)
        return open(p, encoding='utf-8') if os.path.exists(p) else None
    print('download', name, flush=True)
    data = urllib.request.urlopen(GEO + name, timeout=300).read()
    if not name.endswith('.zip'):
        return io.StringIO(data.decode('utf-8'))
    z = zipfile.ZipFile(io.BytesIO(data))
    return io.TextIOWrapper(z.open(pick_member([(i.filename, i.file_size) for i in z.infolist()], txt)), encoding='utf-8')


def pick_member(members, want):
    """الملف المقصود داخل الأرشيف: باسمه، وإلا أكبر ملف نصي. (alternateNamesV2.zip يحمل معه iso-languagecodes.txt —
    «أول ملف .txt» كان يلتقطه أحيانًا فيخرج المعجم بلا أسماء عربية ولا أعلام؛ المراجعة المستقلة.)"""
    names = [n for n, _ in members]
    if want in names:
        return want
    txts = sorted([(size, n) for n, size in members if n.endswith('.txt') and 'readme' not in n.lower()], reverse=True)
    if not txts:
        raise SystemExit('no .txt member in the archive for ' + want)
    return txts[0][1]


def dedupe(names, taken):
    out = []
    for x in names:
        k = norm(x)
        if len(k) < 2 or k in taken:
            continue
        taken.add(k)
        out.append(x)
    return out


KEY_ORDER = ['id', 'n', 'lat', 'lng', 'p', 's', 'a', 'ar', 'r', 'island']


def ordered(e):  # ترتيب مفاتيح ثابت — بناء ثانٍ على ناتجه لا يغيّر حرفًا
    return {k: e[k] for k in KEY_ORDER + [k for k in e if k not in KEY_ORDER] if k in e}


def build(src=None, out='.', dry=False, allow_no_alt=False, anchors=HARD_ANCHORS, quiet=False):
    say = (lambda *a: None) if quiet else (lambda *a: print(*a, flush=True))
    # ── ١ · المواضع
    f = open_source('cities500.zip', src)
    if f is None:
        raise SystemExit('cities500 source missing')
    rows = []
    for line in f:
        c = line.rstrip('\n').split('\t')
        if len(c) < 15:
            continue
        rows.append({'id': int(c[0]), 'n': c[1], 'asc': c[2], 'alts': [a for a in c[3].split(',') if a], 'lat': round(float(c[4]), 4), 'lng': round(float(c[5]), 4), 'cc': c[8], 'p': int(c[14] or 0)})
    f.close()
    say('cities500 rows', len(rows))
    cc_of = {r['id']: r['cc'] for r in rows}
    # ── ٢ · لغات الدول
    langs = defaultdict(set)
    try:
        f = open_source('countryInfo.txt', src)
        for line in (f or []):
            if line.startswith('#'):
                continue
            c = line.rstrip('\n').split('\t')
            if len(c) > 15:
                for l in c[15].split(','):
                    if l.strip():
                        langs[c[0]].add(l.strip().split('-')[0].lower())
        if f:
            f.close()
    except Exception as e:  # بلا لغات: الإنجليزية وحدها — يُذكر في التقرير
        say('countryInfo skipped:', str(e)[:120])
    # ── ٣ · الأسماء البديلة بأعلامها (دفقًا)
    ar, strong, plain, seen_alt = {}, defaultdict(list), defaultdict(list), set()
    alt_ok = False
    try:
        f = open_source('alternateNamesV2.zip', src)
        if f is not None:
            for line in f:
                c = line.rstrip('\n').split('\t')
                if len(c) < 4:
                    continue
                try:
                    gid = int(c[1])
                except ValueError:
                    continue
                if gid not in cc_of:
                    continue
                lang, name = c[2].lower(), c[3]
                pref, short, colloq, hist = (c[4:5] == ['1']), (c[5:6] == ['1']), (c[6:7] == ['1']), (c[7:8] == ['1'])
                seen_alt.add(gid)
                if lang == 'ar':
                    if gid not in ar or pref:
                        ar[gid] = name
                    continue
                if lang in PSEUDO or hist or colloq:
                    continue
                local = lang == 'en' or lang in langs.get(cc_of[gid], ())
                if local and (pref or short):
                    strong[gid].append((0 if lang == 'en' else 1, name))
                elif local or lang == '':
                    plain[gid].append((0 if lang == 'en' else 1 if lang else 2, name))
            f.close()
            alt_ok = True
    except Exception as e:
        say('alternate names failed:', str(e)[:160])
    if not alt_ok and not allow_no_alt:
        raise SystemExit('SANITY FAILED — alternateNamesV2 unavailable; nothing written (use --allow-no-alt to build without names)')
    if alt_ok and not allow_no_alt and len(seen_alt) < 0.3 * len(rows):  # ملف خطأ أو تالف يُقرأ «بنجاح» بلا سطر صالح
        raise SystemExit('SANITY FAILED — alternate names were read for only %d of %d rows (wrong or damaged file?); nothing written' % (len(seen_alt), len(rows)))
    say('arabic names', len(ar), '· rows with flagged names', len(strong))
    # ── ٤ · الصفوف الجديدة
    try:
        extra = json.load(open(os.path.join(out, 'scripts/eval/gaz-strong.json'), encoding='utf-8'))
    except Exception:
        extra = {}
    by_cc = defaultdict(list)
    for r in rows:
        e = {'id': r['id'], 'n': r['n'], 'lat': r['lat'], 'lng': r['lng'], 'p': r['p']}
        taken = {norm(r['n'])}
        s = dedupe([x for _, x in sorted(strong.get(r['id'], []), key=lambda t: t[0])] + list(extra.get(str(r['id']), [])), taken)
        if r['id'] in seen_alt:
            a = dedupe([r['asc']] + [x for _, x in sorted(plain.get(r['id'], []), key=lambda t: t[0])], taken)[:6]
        else:  # لا بيانات أعلام لهذا الصف: الطريقة القديمة (الاسم اللاتيني + أول البدائل)
            a = dedupe([r['asc']] + r['alts'][:6], taken)[:4]
        if s:
            e['s'] = s[:6]
        if a:
            e['a'] = a
        if r['id'] in ar:
            e['ar'] = ar[r['id']]
        by_cc[r['cc']].append(e)
    try:  # الجزر — مدخلات بنصف قطر (قرار المالك: الجزر فقط)
        for a in json.load(open(os.path.join(out, 'scripts/eval/islands.json'), encoding='utf-8'))['islands']:
            e = {'id': a['id'], 'n': a['n'], 'lat': a['lat'], 'lng': a['lng'], 'p': 200000, 'r': a['r'], 'island': True}
            if a.get('a'):
                e['a'] = a['a']
            if a.get('ar'):
                e['ar'] = a['ar']
            by_cc[a['cc']].append(e)
        say('islands merged')
    except Exception as ex:
        say('islands skipped:', str(ex)[:120])
    # ── ٥ · الدمج الإضافي مع القائم: المعرّف والاسم والمركز والسكان كما هي
    report = {'countries': 0, 'rowsBefore': 0, 'rowsAfter': 0, 'newRows': 0, 'keptOnlyOld': 0, 'withStrong': 0, 'coreStrong': 0, 'aliasesDropped': 0, 'renamedInSource': 0, 'anchors': [], 'problems': []}
    final, old_all = {}, {}
    ccs = set(by_cc)
    cdir = os.path.join(out, 'cities')
    if os.path.isdir(cdir):
        ccs |= {fn[:-5] for fn in os.listdir(cdir) if re.fullmatch(r'[A-Z]{2}\.json', fn)}
    for cc in sorted(ccs):
        old = []
        p = os.path.join(cdir, cc + '.json')
        if os.path.exists(p):
            try:
                old = json.load(open(p, encoding='utf-8'))
            except Exception as ex:
                report['problems'].append(cc + ': existing file unreadable (' + str(ex)[:60] + ')')
        old_all[cc] = old
        report['rowsBefore'] += len(old)
        new_by = {e['id']: e for e in by_cc.get(cc, [])}
        merged, used = [], set()
        for o in old:
            n = new_by.get(o['id'])
            used.add(o['id'])
            if n is None:
                merged.append(dict(o))
                report['keptOnlyOld'] += 1
                continue
            e = dict(o)
            taken = {norm(o['n'])}
            src_name = [n['n']] if norm(n['n']) != norm(o['n']) else []
            if src_name:
                report['renamedInSource'] += 1
            s = dedupe(src_name + n.get('s', []), taken)
            a = dedupe(n.get('a', []), taken)
            e.pop('s', None)
            e.pop('a', None)
            if s:
                e['s'] = s[:6]
            if a:
                e['a'] = a
            if n.get('ar') and not e.get('ar'):
                e['ar'] = n['ar']
            merged.append(e)
        for e in by_cc.get(cc, []):
            if e['id'] not in used:
                merged.append(e)
                report['newRows'] += 1
        # الاسم بلا لاحقة City اسم قوي حين لا يحمله صفٌّ آخر في الدولة اسمًا له
        primary = defaultdict(int)
        for e in merged:
            primary[norm(e['n'])] += 1
        for e in merged:
            c = core(e['n'])
            if c and norm(c) != norm(e['n']) and not primary.get(norm(c)) and norm(c) not in {norm(x) for x in e.get('s', [])}:
                e['s'] = (e.get('s', []) + [' '.join(w.capitalize() for w in c.split())])[:7]
                e['a'] = [x for x in e.get('a', []) if norm(x) != norm(c)]
                if not e['a']:
                    e.pop('a')
                report['coreStrong'] += 1
        # تنقية الضجيج: بديل (أو اسم قوي) يساوي اسم مدينة أكبر عشر مرات في الدولة نفسها
        big = {}
        for e in merged:
            for x in [e['n']] + e.get('s', []):
                k = norm(x)
                if k and e['p'] > big.get(k, (0, 0))[0]:
                    big[k] = (e['p'], e['id'])
        for e in merged:
            for key in ('a', 's'):
                keep = []
                for x in e.get(key, []):
                    b = big.get(norm(x))
                    if b and b[1] != e['id'] and b[0] >= BIG_RATIO * max(e['p'], 1):
                        report['aliasesDropped'] += 1
                    else:
                        keep.append(x)
                if keep:
                    e[key] = keep
                else:
                    e.pop(key, None)
        merged.sort(key=lambda x: -x['p'])
        final[cc] = [ordered(e) for e in merged]
        merged = final[cc]
        report['rowsAfter'] += len(merged)
        report['withStrong'] += sum(1 for e in merged if e.get('s'))
    report['countries'] = len(final)
    # ── ٦ · فحص السلامة — قبل أي كتابة
    problems = report['problems']
    for cc, old in old_all.items():
        now = {e['id']: e for e in final.get(cc, [])}
        for o in old:
            e = now.get(o['id'])
            if e is None:
                problems.append('%s: row %s (%s) lost' % (cc, o['id'], o['n']))
            elif e['n'] != o['n'] or e['lat'] != o['lat'] or e['lng'] != o['lng']:
                problems.append('%s: row %s changed its name or centre' % (cc, o['id']))
    for cc, gid, name in anchors:
        e = next((x for x in final.get(cc, []) if x['id'] == gid), None)
        ok = bool(e) and norm(name) in ({norm(e['n'])} | {norm(x) for x in e.get('s', [])})
        report['anchors'].append({'cc': cc, 'id': gid, 'name': name, 'ok': ok})
        if not ok:
            problems.append('%s: anchor %s must carry “%s” as its name or a strong name' % (cc, gid, name))
    for cc, arr in final.items():
        big = {}
        for e in arr:
            for x in [e['n']] + e.get('s', []):
                k = norm(x)
                if k and e['p'] > big.get(k, (0, 0))[0]:
                    big[k] = (e['p'], e['id'])
        for e in arr:
            for x in e.get('a', []):
                b = big.get(norm(x))
                if b and b[1] != e['id'] and b[0] >= BIG_RATIO * max(e['p'], 1):
                    problems.append('%s: alias “%s” of %s still equals a far bigger city' % (cc, x, e['n']))
    if report['rowsAfter'] < report['rowsBefore']:
        problems.append('rows shrank %d → %d' % (report['rowsBefore'], report['rowsAfter']))
    say('REPORT', json.dumps({k: v for k, v in report.items() if k != 'problems'}, ensure_ascii=False))
    if problems:
        say('SANITY FAILED — nothing written:')
        for p in problems[:40]:
            say('  ·', p)
        raise SystemExit(1)
    if dry:
        say('DRY RUN — sanity passed, nothing written')
        return report, final
    # ── ٧ · الكتابة
    os.makedirs(cdir, exist_ok=True)
    for cc, arr in final.items():
        json.dump(arr, open(os.path.join(cdir, cc + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    idir = os.path.join(out, 'scripts/eval/gaz/idx')
    os.makedirs(idir, exist_ok=True)
    idx = defaultdict(list)
    for cc, arr in final.items():
        for e in arr:
            keys = set()
            for nm in [e['n']] + e.get('s', []) + e.get('a', []):
                k = ' '.join(words(nm))[:2]
                if len(k) == 2:
                    keys.add(k)
            if e.get('ar'):
                k = norm_ar(e['ar'])[:2]
                if len(k) == 2:
                    keys.add(k)
            for k in keys:
                idx[k].append({'id': e['id'], 'n': e['n'], 'ar': e.get('ar', ''), 'cc': cc, 'lat': e['lat'], 'lng': e['lng'], 'p': e['p'], **({'r': e['r'], 'island': True} if e.get('island') else {})})
    for k, arr in idx.items():
        arr.sort(key=lambda x: -x['p'])
        safe = ''.join('%04x' % ord(ch) for ch in k)
        json.dump(arr[:400], open(os.path.join(idir, safe + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(report, open(os.path.join(out, 'scripts/eval/gaz/report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    say('countries', len(final), '· prefix shards', len(idx))
    say('DONE')
    return report, final


def selftest():
    """عيّنة مصغّرة تحاكي ما قيس: نيويورك بلا «New York» وبلدتان تحملانه بديلًا — بلا شبكة."""
    def city(i, n, alts, lat, lng, cc, p):
        return '\t'.join([str(i), n, n, alts, str(lat), str(lng), 'P', 'PPL', cc, '', '', '', '', '', str(p), '', '', '', ''])

    def alt(i, gid, lang, name, pref=0, short=0, colloq=0, hist=0):
        return '\t'.join([str(i), str(gid), lang, name, '1' if pref else '', '1' if short else '', '1' if colloq else '', '1' if hist else '', '', ''])

    def make(src, with_nyc=True):
        c = [city(5248511, 'Clinton', 'New York,Clinton Junction', 42.5578, -88.8651, 'US', 2154), city(5701329, 'York', 'New York,York Center', 40.8681, -97.592, 'US', 7766), city(4544349, 'Oklahoma City', 'OKC', 35.4676, -97.5164, 'US', 681054), city(5391811, 'San Diego', 'San Diego,Sandiego', 32.7157, -117.1647, 'US', 1394928), city(3530597, 'Mexico City', 'Ciudad de Mexico', 19.4285, -99.1277, 'MX', 12294193)]
        a = [alt(1, 5248511, '', 'New York'), alt(2, 5701329, 'en', 'New York'), alt(7, 4544349, 'abbr', 'OKC'), alt(8, 3530597, 'es', 'Ciudad de México', pref=1), alt(9, 3530597, 'en', 'Mexico City', pref=1), alt(10, 5391811, 'ar', 'سان دييغو', pref=1)]
        if with_nyc:
            c.append(city(5128581, 'New York City', 'Aebura,Bandar Raya New York,Big Apple,Cathair Nua-Eabhrac,New York', 40.7143, -74.006, 'US', 8804190))
            a += [alt(3, 5128581, 'en', 'New York', short=1), alt(4, 5128581, 'en', 'Big Apple', colloq=1), alt(5, 5128581, 'en', 'New Amsterdam', hist=1), alt(6, 5128581, 'ar', 'نيويورك', pref=1), alt(11, 5128581, 'link', 'https://en.wikipedia.org/wiki/New_York_City'), alt(12, 5128581, 'ga', 'Cathair Nua-Eabhrac'), alt(13, 5128581, 'es', 'Nueva York', pref=1)]
        open(os.path.join(src, 'cities500.txt'), 'w', encoding='utf-8').write('\n'.join(c) + '\n')
        open(os.path.join(src, 'alternateNamesV2.txt'), 'w', encoding='utf-8').write('\n'.join(a) + '\n')
        open(os.path.join(src, 'countryInfo.txt'), 'w', encoding='utf-8').write('# comment\n' + '\t'.join(['US'] + [''] * 14 + ['en-US,es-US,haw,fr']) + '\n' + '\t'.join(['MX'] + [''] * 14 + ['es-MX']) + '\n')

    with tempfile.TemporaryDirectory() as tmp:
        src, out = os.path.join(tmp, 'src'), os.path.join(tmp, 'out')
        os.makedirs(src)
        os.makedirs(os.path.join(out, 'cities'))
        os.makedirs(os.path.join(out, 'scripts/eval'))
        old = [{'id': 5128581, 'n': 'New York City', 'a': ['Aebura', 'Bandar Raya New York', 'Big Apple', 'Cathair Nua-Eabhrac'], 'lat': 40.71, 'lng': -74.0, 'p': 8000000}, {'id': 5248511, 'n': 'Clinton', 'a': ['New York'], 'lat': 42.5578, 'lng': -88.8651, 'p': 2154}, {'id': 999, 'n': 'Oldtown', 'lat': 1.0, 'lng': 2.0, 'p': 10}]
        json.dump(old, open(os.path.join(out, 'cities/US.json'), 'w', encoding='utf-8'))
        make(src)
        rep, fin = build(src=src, out=out, quiet=True)
        us = {e['id']: e for e in json.load(open(os.path.join(out, 'cities/US.json'), encoding='utf-8'))}
        mx = json.load(open(os.path.join(out, 'cities/MX.json'), encoding='utf-8'))
        nyc = us[5128581]
        checks = [
            ('NYC keeps id, name, centre and population as they were', nyc['n'] == 'New York City' and nyc['lat'] == 40.71 and nyc['lng'] == -74.0 and nyc['p'] == 8000000),
            ('NYC carries “New York” as a strong name', 'New York' in nyc.get('s', [])),
            ('the Spanish preferred name of a US city is strong (a language of the country)', 'Nueva York' in nyc.get('s', [])),
            ('colloquial, historic, link and foreign-language names are not aliases of NYC', not ({'Big Apple', 'New Amsterdam', 'Aebura', 'Bandar Raya New York', 'Cathair Nua-Eabhrac'} & set(nyc.get('a', []) + nyc.get('s', [])))),
            ('NYC gets its Arabic name', nyc.get('ar') == 'نيويورك'),
            ('“New York” is no longer an alias of Clinton or York', 'New York' not in us[5248511].get('a', []) and 'New York' not in us[5701329].get('a', [])),
            ('a row only the old file had is kept', us.get(999, {}).get('n') == 'Oldtown'),
            ('new rows are appended', 5701329 in us and 4544349 in us and rep['newRows'] == 4),
            ('“Oklahoma” becomes a strong name of Oklahoma City (no other row is called so)', 'Oklahoma' in us[4544349].get('s', [])),
            ('Mexico City carries its local preferred name and “Mexico”', 'Ciudad de México' in mx[0].get('s', []) and 'Mexico' in mx[0].get('s', [])),
            ('rows stay sorted by population', [e['p'] for e in us.values()] == sorted([e['p'] for e in us.values()], reverse=True)),
            ('the report counts dropped aliases and passes the anchor', rep['aliasesDropped'] >= 2 and rep['anchors'][0]['ok'] is True and rep['rowsAfter'] == 7),
            ('search shards are written with the strong names', os.path.exists(os.path.join(out, 'scripts/eval/gaz/idx', '006e0065.json'))),
        ]
        before = open(os.path.join(out, 'cities/US.json'), encoding='utf-8').read()
        again, _ = build(src=src, out=out, quiet=True)  # البناء على ناتجه لا يغيّر شيئًا
        checks.append(('a second build over its own output changes nothing', open(os.path.join(out, 'cities/US.json'), encoding='utf-8').read() == before and again['newRows'] == 0))
        make(src, with_nyc=False)
        json.dump([e for e in json.load(open(os.path.join(out, 'cities/US.json'), encoding='utf-8')) if e['id'] != 5128581], open(os.path.join(out, 'cities/US.json'), 'w', encoding='utf-8'))
        frozen = open(os.path.join(out, 'cities/US.json'), encoding='utf-8').read()
        stopped = False
        try:
            build(src=src, out=out, quiet=True)
        except SystemExit:
            stopped = True
        checks.append(('a failed anchor stops the build and writes nothing', stopped and open(os.path.join(out, 'cities/US.json'), encoding='utf-8').read() == frozen))
        open(os.path.join(src, 'alternateNamesV2.txt'), 'w', encoding='utf-8').write('aa\tAfar\naf\tAfrikaans\n')  # شكل iso-languagecodes
        stopped = False
        try:
            build(src=src, out=out, quiet=True, anchors=[])
        except SystemExit:
            stopped = True
        checks.append(('a names file of the wrong shape stops the build (no silent gazetteer without names)', stopped and open(os.path.join(out, 'cities/US.json'), encoding='utf-8').read() == frozen))
        checks.append(('the archive member is chosen by name, then by size — never “the first .txt”', pick_member([('iso-languagecodes.txt', 130000), ('alternateNamesV2.txt', 700000000)], 'alternateNamesV2.txt') == 'alternateNamesV2.txt' and pick_member([('iso-languagecodes.txt', 130000), ('alternateNames.txt', 600000000), ('readme.txt', 9000000000)], 'alternateNamesV2.txt') == 'alternateNames.txt'))
        os.remove(os.path.join(src, 'alternateNamesV2.txt'))
        stopped = False
        try:
            build(src=src, out=out, quiet=True, anchors=[])
        except SystemExit:
            stopped = True
        checks.append(('missing alternate names stop the build instead of a silent poorer gazetteer', stopped and open(os.path.join(out, 'cities/US.json'), encoding='utf-8').read() == frozen))
    bad = [n for n, ok in checks if not ok]
    for n, ok in checks:
        print(('PASS  ' if ok else 'FAIL  ') + n)
    print('SELFTEST ' + ('PASSED' if not bad else 'FAILED') + ' — ' + str(len(checks) - len(bad)) + '/' + str(len(checks)))
    return 0 if not bad else 1


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(selftest())
    src = sys.argv[sys.argv.index('--src') + 1] if '--src' in sys.argv else None
    build(src=src, out='.', dry='--dry' in sys.argv, allow_no_alt='--allow-no-alt' in sys.argv)
