# MyPickz — tests/tools/pair.py (r110 · ١١ نوفمبر ٢٠٢٦): يضع لقطتين جنبًا إلى جنب بعنوان فوق كلٍّ — لعرض شكلَي المحرّر معًا قبل الرفع.
# الاستعمال:  python3 tests/tools/pair.py out.png left.png "عنوان اليسار" right.png "عنوان اليمين"      (يحتاج Pillow في بيئة المنفِّذ)
import sys
from PIL import Image, ImageDraw, ImageFont

def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

def main():
    out, lp, lt, rp, rt = sys.argv[1:6]
    a, b = Image.open(lp).convert('RGB'), Image.open(rp).convert('RGB')
    h = max(a.height, b.height); gap, head = 24, 76
    im = Image.new('RGB', (a.width + b.width + gap * 3, h + head + gap), (15, 27, 42))
    d = ImageDraw.Draw(im); f = font(34)
    d.text((gap, 22), lt, fill=(226, 154, 46), font=f); d.text((a.width + gap * 2, 22), rt, fill=(226, 154, 46), font=f)
    im.paste(a, (gap, head)); im.paste(b, (a.width + gap * 2, head))
    im.save(out, optimize=True)
    print(out, im.size)

if __name__ == '__main__':
    main()
