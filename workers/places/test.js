// اختبارات وحدة لمنطق المطابقة وحل الروابط (بلا شبكة) — تعمل بالناشر قبل النشر
import { decide, toks, bucketOf, nameSim } from './src/match.js';
import { cellsAroundForTest } from './src/index.js';
let fails = 0; const ok = (n, c, why) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n + (c ? '' : '  →  ' + (why || ''))); if (!c) fails++; };
const C = [{ id: 'ovt:1', name: 'Dalmata', addr: '8 Rue Tiquetonne', locality: 'Paris', lat: 48.865, lng: 2.348 }, { id: 'ovt:2', name: 'Dalmata Pizza', addr: '21 Rue de Charonne', locality: 'Paris', lat: 48.853, lng: 2.375 }, { id: 'ovt:3', name: 'Le Peloton Café', addr: '17 Rue du Pont Louis-Philippe', locality: 'Paris', lat: 48.855, lng: 2.356 }];
ok('auto: name + address decide with certainty', (decide('Dalmata', '8 Rue Tiquetonne, 75002 Paris', C).auto || {}).id === 'ovt:1');
const amb = decide('Dalmata', '', C); ok('ambiguous: same name, two places, no address → no auto, ≤3 candidates', !amb.auto && amb.candidates.length >= 2);
ok('none: unrelated name → no candidates', decide('Em Sherif', '', C).candidates.length === 0);
ok('arabic normalization: «شيفز برجر | Chef\'s Burger» matches Chef\'s Burger', nameSim("شيفز برجر | Chef's Burger", { name: "Chef's Burger", names: [] }) >= 0.9);
ok('city tokens ignored: «Bâoli Dubai» → tokens without dubai', !toks('Bâoli Dubai').has('dubai'));
ok('no address in request: exact name → auto (score = name only, ≥ 0.9)', (decide('Le Peloton Café', '', C).auto || {}).id === 'ovt:3');
ok('bucketOf is stable 2-hex', /^[0-9a-f]{2}$/.test(bucketOf('dalmata')) && bucketOf('dalmata') === bucketOf('dalmata'));
const cells = cellsAroundForTest(24.7136, 46.6753, 12); ok('cells around Riyadh center r=12km: includes c247_466 and is bounded', cells.includes('c247_466') && cells.length >= 9 && cells.length <= 81, cells.length + ' cells');
console.log(fails ? ('FAILED ' + fails) : 'ALL PASS'); process.exit(fails ? 1 : 0);
