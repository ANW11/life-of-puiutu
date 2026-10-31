#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  gen_map_edges.py — marginile hartii lumii ca o harta veche de aventura:
#  maps/worldmap_torn_mask.png  : alpha cu marginea rupta neregulat, colturi smulse si o mica ruptura
#  maps/worldmap_torn_burn.png  : banda arsa/patata maro de-a lungul rupturii (pusa peste harta)
#  maps/worldmap_parchment_torn.png : harta cu marginea rupta pusa direct in alpha (pe asta o afiseaza jocul)
#  Ambele au marimea maps/worldmap_parchment.png, jocul le intinde peste ea.
#     python3 gen_map_edges.py
# ─────────────────────────────────────────────────────────────────────────────
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = Image.open(os.path.join(ROOT, 'maps', 'worldmap_parchment.png')).size
rng = np.random.default_rng(7)

def noise1d(n, scales=((90, 14), (30, 6), (9, 2.5))):
    """A ragged edge profile: a few octaves of smooth random noise, in pixels."""
    out = np.zeros(n)
    for step, amp in scales:
        pts = rng.uniform(-1, 1, n // step + 3)
        out += np.interp(np.arange(n) / step, np.arange(len(pts)), pts) * amp
    return out

INSET = 22
top, bot = INSET + noise1d(W), INSET + noise1d(W)
left, right = INSET + noise1d(H), INSET + noise1d(H)
yy, xx = np.mgrid[0:H, 0:W]
inside = (yy > top[xx]) & (yy < H - bot[xx]) & (xx > left[yy]) & (xx < W - right[yy])

# torn-off corners: a ragged diagonal bite out of two corners, a small nibble out of a third
def bite(cx, cy, size, dirx, diry):
    t = (dirx * (xx - cx) + diry * (yy - cy)) / np.sqrt(2)
    along = (dirx * (xx - cx) - diry * (yy - cy)) / np.sqrt(2)
    jag = np.interp(along, np.arange(-W, W), noise1d(2 * W, ((40, 10), (12, 4), (5, 1.5))))
    return t < -(size) + jag
inside &= ~bite(0, H, 120, 1, -1)          # bottom-left: a big chunk gone
inside &= ~bite(W, 0, 90, -1, 1)           # top-right
inside &= ~bite(0, 0, 45, 1, 1)            # top-left: just a nibble
# a short tear running in from the bottom edge
tx = int(W * 0.63)
for y in range(H - 90, H):
    w = int(3 + (y - (H - 90)) * 0.06)
    x = tx + int(6 * np.sin(y / 9))
    inside[y, x - w:x + w] = False
inside = ndimage.binary_opening(inside, iterations=1)
alpha = ndimage.gaussian_filter(inside.astype(float), 0.8)
Image.fromarray((alpha * 255).astype(np.uint8)).save(os.path.join(ROOT, 'maps', 'worldmap_torn_mask.png'), optimize=True)

# a burnt, darkened band along the torn edge, fading inwards, with some blotches
dist = ndimage.distance_transform_edt(inside)
band = np.clip(1 - dist / 38, 0, 1) ** 1.6
blot = ndimage.gaussian_filter(rng.random((H, W)), 18); blot = (blot - blot.min()) / (blot.max() - blot.min())
band = np.clip(band * (0.65 + 0.7 * blot), 0, 1)
edge = np.clip(1 - dist / 3.5, 0, 1)                # a thin scorched line right at the tear
a = np.clip(band * 0.75 + edge * 0.9, 0, 1) * inside
col = np.zeros((H, W, 4), np.uint8)
col[..., 0] = (70 - 40 * edge).astype(np.uint8); col[..., 1] = (38 - 22 * edge).astype(np.uint8); col[..., 2] = (14 - 8 * edge).astype(np.uint8)
col[..., 3] = (a * 255).astype(np.uint8)
Image.fromarray(col).save(os.path.join(ROOT, 'maps', 'worldmap_torn_burn.png'), optimize=True)
m = Image.open(os.path.join(ROOT, 'maps', 'worldmap_parchment.png')).convert('RGBA'); m.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
m.save(os.path.join(ROOT, 'maps', 'worldmap_parchment_torn.png'), optimize=True)
print('maps/worldmap_torn_mask.png, maps/worldmap_torn_burn.png, maps/worldmap_parchment_torn.png', W, H)
