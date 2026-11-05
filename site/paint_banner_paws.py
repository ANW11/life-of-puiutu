# Replaces the fleur-de-lis that ChatGPT drew on the hero banners with the Union's gold paw.
import os, sys
import numpy as np
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'site/art_src/hero.png')
im = np.array(Image.open(src).convert('RGB')).astype(int)
PAW = ["..XX..XX..",
       "..XX..XX..",
       "XX......XX",
       "XX......XX",
       "...XXXX...",
       "..XXXXXX..",
       ".XXXXXXXX.",
       ".XXXXXXXX.",
       "..XXXXXX.."]
# (centre x, centre y, half-size of the area to clean, paw pixel size)
BANNERS = [(119, 671, 9, 1.5), (291, 725, 7, 1.1), (1328, 736, 7, 1.1), (1660, 657, 9, 1.5)]
for cx, cy, r, k in BANNERS:
    y0, y1, x0, x1 = cy - r, cy + r + 1, cx - r, cx + r + 1
    reg = im[y0:y1, x0:x1]
    gold = (reg[..., 0] > reg[..., 2] + 25) & (reg[..., 0] > 110)
    blue = reg[~gold]
    blue = blue[blue[..., 2] > blue[..., 0]]          # banner cloth only
    fill = np.median(blue, axis=0) if len(blue) else np.array([60, 60, 140])
    goldc = np.percentile(reg[gold], 80, axis=0) if gold.any() else np.array([235, 170, 70])
    reg[gold] = fill
    h, w = len(PAW), len(PAW[0])
    for py in range(int(h * k) + 1):
        for px in range(int(w * k) + 1):
            row, col = int(py / k), int(px / k)
            if row < h and col < w and PAW[row][col] == 'X':
                y, x = cy - int(h * k / 2) + py, cx - int(w * k / 2) + px
                im[y, x] = goldc
Image.fromarray(im.clip(0, 255).astype('uint8')).save(src)
print('painted', len(BANNERS), 'banners')
