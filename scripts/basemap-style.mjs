// MyPickz — scripts/basemap-style.mjs (خ-١): يولّد أسلوبَي MapLibre (light · dark) من حزمة Protomaps basemaps بمصادرنا وأصولنا — العناوين بعلامة {ORIGIN} يستبدلها العامل
import fs from 'fs';
import { layers, namedFlavor } from '@protomaps/basemaps';
for (const flavor of ['light', 'dark']){
  const style = { version: 8, name: 'MyPickz ' + flavor, glyphs: '{ORIGIN}/tiles/assets/fonts/{fontstack}/{range}.pbf', sprite: '{ORIGIN}/tiles/assets/sprites/v4/' + flavor,
    sources: { protomaps: { type: 'vector', tiles: ['{ORIGIN}/tiles/{z}/{x}/{y}.mvt'], minzoom: 0, maxzoom: 14, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://protomaps.com">Protomaps</a>' } },
    layers: layers('protomaps', namedFlavor(flavor), { lang: 'en' }) };
  fs.mkdirSync('scripts/eval/basemap', { recursive: true }); fs.writeFileSync('scripts/eval/basemap/style-' + flavor + '.json', JSON.stringify(style)); console.log('style-' + flavor + '.json', style.layers.length, 'layers');
}
