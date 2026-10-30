#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  gen_fruit_shapes.py — recalculeaza coliziunile fructelor din Fruit Merge (MG_SHAPES)
#  din conturul PNG-urilor din fruitmerge/. Fiecare fruct = cateva cercuri impachetate in
#  silueta lui, in unitati de r, fata de centrul sprite-ului (jocul deseneaza sprite-ul cu
#  latura mare = 2.12*r). Scrie linia noua direct in life_of_puiutu_game.html.
#     python3 gen_fruit_shapes.py
# ─────────────────────────────────────────────────────────────────────────────
import os, re, json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.abspath(__file__))
KEYS = ['blueberry','cherries','strawberry','lemon','orange','apple','pear','banana','grapes','pineapple','watermelon']
SPAN = 2.12          # the sprite's longer side, in units of r (mgDrawFruit)
RES = 72             # mask resolution along the longer side
MAX_CIRCLES, STOP = 6, 0.08

def shape(path):
    im = Image.open(path).convert('RGBA'); w, h = im.size
    s = RES / max(w, h); mw, mh = max(1, round(w * s)), max(1, round(h * s))
    mask = np.array(im.resize((mw, mh), Image.LANCZOS))[..., 3] > 110
    mask = ndimage.binary_opening(mask, iterations=1)          # thin stems and leaf tips don't collide
    unit = SPAN / max(mw, mh)                                   # mask px -> r units
    edt = ndimage.distance_transform_edt(mask)
    ys, xs = np.nonzero(mask); total = len(xs)
    uncovered = mask.copy(); circles = []
    yy, xx = np.mgrid[0:mh, 0:mw]
    for _ in range(MAX_CIRCLES):
        if uncovered.sum() < STOP * total: break
        cand = np.nonzero(edt > 1.5)
        best = None
        for cy, cx in zip(*cand):
            R = edt[cy, cx]
            y0, y1, x0, x1 = max(0, int(cy-R)), min(mh, int(cy+R)+1), max(0, int(cx-R)), min(mw, int(cx+R)+1)
            gain = uncovered[y0:y1, x0:x1]
            sy, sx = np.mgrid[y0:y1, x0:x1]
            score = (gain & ((sy-cy)**2 + (sx-cx)**2 <= R*R)).sum()
            if best is None or score > best[0]: best = (score, cy, cx, R)
        if not best or best[0] < 0.02 * total: break
        _, cy, cx, R = best
        uncovered &= (yy-cy)**2 + (xx-cx)**2 > R*R
        circles.append([round((cx + 0.5 - mw/2) * unit, 3), round((cy + 0.5 - mh/2) * unit, 3), round(R * unit, 3)])
    return circles

shapes = []
for k in KEYS:
    c = shape(os.path.join(ROOT, 'fruitmerge', 'fruit_%s.png' % k)); shapes.append(c)
    print('%-11s %d circles' % (k, len(c)))
html = os.path.join(ROOT, 'life_of_puiutu_game.html')
s = open(html, encoding='utf-8').read()
s, n = re.subn(r'^const MG_SHAPES=.*;$', 'const MG_SHAPES=' + json.dumps(shapes, separators=(',', ':')) + ';', s, flags=re.M)
if n != 1: raise SystemExit('MG_SHAPES line not found')
open(html, 'w', encoding='utf-8').write(s)
print('MG_SHAPES updated')
