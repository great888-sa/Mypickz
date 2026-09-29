// MyPickz — workers/places/src/tiles.js (خ-١): خلفية الخريطة من مخزننا — ملفات PMTiles لكل دولة (Protomaps · ODbL) على R2، تُقرأ بطلبات مدى
// دوال صرفة (تُختبر بلا شبكة): مسار البلاطة · إحداثيات مركزها · اختيار ملفات الدول التي تحويها
export function parseTilePath(pathname){ const m = /^\/tiles\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.mvt$/.exec(pathname); if (!m) return null; const z = +m[1], x = +m[2], y = +m[3]; const n = Math.pow(2, z); if (z > 20 || x < 0 || y < 0 || x >= n || y >= n) return null; return { z, x, y }; }
export function tileCenter(z, x, y){ const n = Math.pow(2, z); const lng = (x + 0.5) / n * 360 - 180; const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / n))); return { lat: latRad * 180 / Math.PI, lng }; }
export function countriesFor(lat, lng, bboxes){ // كل الدول التي يقع المركز داخل حدودها (الحدود سخية ومتداخلة) — الأصغر مساحة أولًا
  return Object.keys(bboxes).filter(cc => { const b = bboxes[cc]; return lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3]; }).sort((a, b) => area(bboxes[a]) - area(bboxes[b]));
}
function area(b){ return (b[2] - b[0]) * (b[3] - b[1]); }
export class R2Source { // مصدر PMTiles من R2: getBytes(offset, length) → ArrayBuffer
  constructor(bucket, key){ this.bucket = bucket; this.key = key; }
  getKey(){ return this.key; }
  async getBytes(offset, length){ const obj = await this.bucket.get(this.key, { range: { offset, length } }); if (!obj) throw new Error('missing ' + this.key); const data = await obj.arrayBuffer(); return { data, etag: obj.httpEtag, cacheControl: 'public, max-age=86400' }; }
}
