# Turns the ChatGPT skin redraws (site/art_src/skin_<id>.png) into game cards that match the
# chunky pixel grid of the other cards: ~7px blocks at 720 wide, limited palette, hard alpha.
import os, sys
import numpy as np
from PIL import Image, ImageFilter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK, W, H = 7, 720, 1290

def card(n, margin=0.04):
    im = Image.open(os.path.join(R, f'site/art_src/skin_{n}.png')).convert('RGBA')
    a = np.array(im); a[..., 3] = np.where(a[..., 3] > 30, a[..., 3], 0); im = Image.fromarray(a)
    im = im.crop(im.getbbox())
    gw, gh = W // BLOCK, H // BLOCK                      # the pixel grid
    s = min(gw * (1 - margin) / im.width, gh * (1 - margin) / im.height)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))   # keep outlines through the shrink
    small = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.BOX)
    sa = np.array(small); alpha = sa[..., 3] > 110
    px = np.dstack([sa[..., :3], np.where(alpha, 255, 0).astype('uint8')])
    grid = Image.new('RGBA', (gw, gh), (0, 0, 0, 0))
    grid.alpha_composite(Image.fromarray(px), ((gw - small.width) // 2, (gh - small.height) // 2))
    big = grid.resize((gw * BLOCK, gh * BLOCK), Image.NEAREST)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.alpha_composite(big, ((W - big.width) // 2, (H - big.height) // 2))
    out.save(os.path.join(R, f'skins/cards/skin_{n}_big.webp'), 'WEBP', lossless=True)
    out.resize((W // 2, H // 2), Image.NEAREST).save(os.path.join(R, f'skins/cards/skin_{n}.webp'), 'WEBP', lossless=True)
    m = np.array(out)[..., 3] > 128; ys, xs = np.nonzero(m)
    print(n, 'trim', [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
          os.path.getsize(os.path.join(R, f'skins/cards/skin_{n}_big.webp')) // 1024, 'KB')

for n in (sys.argv[1:] or ['scottish', 'ragdoll']):
    card(n)
