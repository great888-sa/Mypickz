// MyPickz — scripts/basemap-style.mjs (خ-١): يولّد أسلوبَي MapLibre (light · dark) من حزمة Protomaps basemaps بمصادرنا وأصولنا — العناوين بعلامة {ORIGIN} يستبدلها العامل
import fs from 'fs';
import { layers, namedFlavor } from '@protomaps/basemaps';
for (const flavor of ['light', 'dark']){
  const style = { version: 8, name: 'MyPickz ' + flavor, glyphs: '{ORIGIN}/tiles/assets/fonts/{fontstack}/{range}.pbf', sprite: '{ORIGIN}/tiles/assets/sprites/v4/' + flavor,
    sources: { protomaps: { type: 'vector', tiles: ['{ORIGIN}/tiles/{z}/{x}/{y}.mvt'], minzoom: 0, maxzoom: 14, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://protomaps.com">Protomaps</a>' } },
    layers: layers('protomaps', namedFlavor(flavor), { lang: 'en' }) };
  // خ-٣ (ملاحظة المالك: وضوح الشوارع الداخلية): الطرق الصغيرة أعرض وأغمق من المستوى ١٤، وأسماء الشوارع من ١٥
  const zoomWidth = (base) => ['interpolate', ['exponential', 1.6], ['zoom'], 12, base, 14, base * 2.2, 16, base * 4.5, 18, base * 9];
  style.layers.forEach(l => { const id = String(l.id || '');
    if (l.type === 'line' && /roads_(minor|service|other|residential|tertiary)/.test(id) && !/casing|tunnel|bridge_label/.test(id)){ l.paint = l.paint || {}; l.paint['line-width'] = zoomWidth(id.includes('service') ? 0.6 : 1.0); l.paint['line-color'] = flavor === 'light' ? '#c8c2b8' : (l.paint['line-color'] || '#444'); }
    if (l.type === 'symbol' && /roads_labels/.test(id)){ l.minzoom = Math.min(l.minzoom || 15, 15); l.paint = l.paint || {}; if (flavor === 'light'){ l.paint['text-color'] = '#3b3b3b'; l.paint['text-halo-color'] = '#ffffff'; l.paint['text-halo-width'] = 1.6; } } });
  fs.mkdirSync('scripts/eval/basemap', { recursive: true }); fs.writeFileSync('scripts/eval/basemap/style-' + flavor + '.json', JSON.stringify(style)); console.log('style-' + flavor + '.json', style.layers.length, 'layers');
}
