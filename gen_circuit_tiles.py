#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  gen_circuit_tiles.py — face piesele puzzle-ului Power Conduit (circuit/norm/*.png) din
#  foaia generata cu ChatGPT (circuit/_orig_backup/pipes_gpt_raw.png). Pastreaza centrul
#  desenat (mansonul, cotul, nodul T / cruce, sursa, prizele) si prelungeste bratele pana la
#  marginea celulei din felii de teava, ca toate piesele sa se lege exact pe mijloc.
#     python3 gen_circuit_tiles.py
# ─────────────────────────────────────────────────────────────────────────────
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'circuit', '_orig_backup', 'pipes_gpt_raw.png')
TS = 340            # tile size in sheet pixels: the pipe (~92px) is ~27% of a cell

a = np.array(Image.open(SRC).convert('RGB')).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
bgm = (r > 190) & (b > 190) & (g < 100)                       # the magenta background
alpha = np.clip(ndimage.distance_transform_edt(~bgm) / 1.5, 0, 1)
edge = alpha < 1
A = np.dstack([np.where(edge, np.minimum(r, g*0.9+10), r), g,
               np.where(edge, np.minimum(b, g*1.05+10), b), alpha*255]).clip(0, 255).astype(np.uint8)

HS = A[170:283, 120:121]; HC = 226 - 170        # 1px slice of the horizontal pipe, its centre row
VS = A[370:371, 1482:1590]; VC = 1535 - 1482    # 1px slice of the vertical pipe, its centre column
C = TS // 2

def tile(hub, centre, arms):
    x0, y0, x1, y1 = hub; cx, cy = centre
    T = np.zeros((TS, TS, 4), np.uint8)
    for d in arms:                               # arms first, from the centre to the cell edge
        if d in 'EW':
            for x in (range(C, TS) if d == 'E' else range(0, C+1)): T[C-HC:C-HC+HS.shape[0], x:x+1] = HS
        else:
            for y in (range(0, C+1) if d == 'N' else range(C, TS)): T[y:y+1, C-VC:C-VC+VS.shape[1]] = VS
    hubimg = A[y0:y1, x0:x1]; ox, oy = C-(cx-x0), C-(cy-y0)   # then the drawn hub, centred
    tx0, ty0 = max(0, ox), max(0, oy); tx1, ty1 = min(TS, ox+hubimg.shape[1]), min(TS, oy+hubimg.shape[0])
    sub = hubimg[ty0-oy:ty1-oy, tx0-ox:tx1-ox].astype(float); dst = T[ty0:ty1, tx0:tx1].astype(float)
    al = sub[..., 3:4] / 255; out = dst.copy()
    out[..., :3] = sub[..., :3]*al + dst[..., :3]*(1-al); out[..., 3:4] = np.maximum(dst[..., 3:4], sub[..., 3:4])
    T[ty0:ty1, tx0:tx1] = out.astype(np.uint8)
    return Image.fromarray(T).resize((512, 512), Image.LANCZOS)

PIECES = {   # hub crop in the sheet, the hub's pipe centre, and the arms (game BASE directions)
    'straight':  ((185, 165, 285, 290),   (233, 226),  'EW'),
    'corner':    ((545, 60, 730, 292),    (598, 226),  'NE'),
    'cross':     ((1465, 160, 1605, 295), (1535, 226), 'NESW'),
    't':         ((1030, 160, 1170, 305), (1098, 226), 'WES'),
    'source':    ((62, 505, 360, 765),    (180, 635),  'E'),
    'target':    ((530, 505, 845, 765),   (722, 635),  'W'),
    'target_on': ((955, 505, 1268, 765),  (1143, 635), 'W'),
}
for k, (hub, c, arms) in PIECES.items():
    tile(hub, c, arms).save(os.path.join(ROOT, 'circuit', 'norm', k + '.png'))
    print('circuit/norm/%s.png' % k)
