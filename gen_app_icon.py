"""Builds every Life of Puiutu app icon from ui/icon_source.png (the square
ChatGPT painting of Puiutu in front of the sunset): PWA icons, the maskable
PWA icon, favicon, apple touch icon and the Android launcher mipmaps.

    python3 gen_app_icon.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
S = 512


def rounded(im, radius):
    m = Image.new('L', (im.width * 4, im.height * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), radius * 4, fill=255)
    out = im.copy()
    out.putalpha(m.resize(im.size, Image.LANCZOS))
    return out


def padded(icon, inner_frac):
    """Shrinks the art to inner_frac of the canvas so circle/squircle masks keep
    the ears, and fills the border with a blurred, enlarged copy of itself."""
    bg = icon.resize((S, S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(18))
    inner = round(S * inner_frac)
    small = icon.resize((inner, inner), Image.LANCZOS)
    feather = Image.new('L', (inner, inner), 0)
    f = max(4, inner // 40)
    ImageDraw.Draw(feather).rectangle((f, f, inner - 1 - f, inner - 1 - f), fill=255)
    feather = feather.filter(ImageFilter.GaussianBlur(f / 2))
    off = (S - inner) // 2
    bg.paste(small, (off, off), feather)
    return bg


def main():
    icon = Image.open(os.path.join(ROOT, 'ui', 'icon_source.png')).convert('RGB').resize((S, S), Image.LANCZOS)
    ui = os.path.join(ROOT, 'ui')
    icon.save(os.path.join(ui, 'icon-512.png'))
    icon.resize((192, 192), Image.LANCZOS).save(os.path.join(ui, 'icon-192.png'))
    # maskable safe zone is the middle 80% circle
    padded(icon, 0.84).save(os.path.join(ui, 'icon-maskable-512.png'))
    icon.resize((180, 180), Image.LANCZOS).save(os.path.join(ui, 'apple-touch-icon.png'))
    rounded(icon, 96).resize((32, 32), Image.LANCZOS).save(os.path.join(ui, 'favicon-32.png'))

    res = os.path.join(ROOT, 'android-app', 'android', 'app', 'src', 'main', 'res')
    if not os.path.isdir(res):
        return
    circle = Image.new('L', (S * 2, S * 2), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, S * 2 - 1, S * 2 - 1), fill=255)
    rnd = icon.copy()
    rnd.putalpha(circle.resize((S, S), Image.LANCZOS))
    sq = rounded(icon, 80)
    # adaptive foreground: 108dp canvas, the launcher shows roughly the middle 72dp
    adaptive = padded(icon, 84 / 108)
    sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for name, px in sizes.items():
        folder = os.path.join(res, 'mipmap-' + name)
        if not os.path.isdir(folder):
            continue
        sq.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
        rnd.resize((px, px), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_round.png'))
        fg = round(px * 108 / 48)
        adaptive.resize((fg, fg), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'))
    print('icons written')


if __name__ == '__main__':
    main()
