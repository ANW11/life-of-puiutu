# Fits the ChatGPT pixel-art skin redraws (site/art_src/skin_<id>.png) into 720x1290 game cards.
# The redraws are already pixel art (blocks ~8px, not on an exact grid), so they are only cropped,
# scaled to fit and given a hard alpha edge; no re-gridding, which muddies the colours.
import os, sys
import numpy as np
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 720, 1290

def card(n):
    im = Image.open(os.path.join(R, f'site/art_src/skin_{n}.png')).convert('RGBA')
    a = np.array(im); a[..., 3] = np.where(a[..., 3] > 110, 255, 0); im = Image.fromarray(a)
    im = im.crop(im.getbbox())
    s = min(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    a = np.array(im); a[..., 3] = np.where(a[..., 3] > 128, 255, 0); im = Image.fromarray(a)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.alpha_composite(im, ((W - im.width) // 2, (H - im.height) // 2))
    out.save(os.path.join(R, f'skins/cards/skin_{n}_big.webp'), 'WEBP', quality=90)
    out.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(R, f'skins/cards/skin_{n}.webp'), 'WEBP', quality=90)
    m = np.array(out)[..., 3] > 128; ys, xs = np.nonzero(m)
    print(n, 'trim', [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1])

for n in (sys.argv[1:] or ['scottish', 'ragdoll']):
    card(n)
