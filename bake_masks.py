#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  bake_masks.py — re-genereaza grilele de walkability incastrate in joc.
#
#  De ce: jocul citeste mastile (.png) cu canvas.getImageData(), care merge DOAR
#  peste http:// (server). La dublu-click pe fisier (file://) browserul blocheaza
#  getImageData, deci masca ar fi ignorata. Ca sa mearga si la file://, jocul are
#  o grila "baked" (RLE) incastrata in HTML, folosita ca fallback.
#
#  Cand sa rulezi: DE FIECARE DATA dupa ce repictezi o masca (park_mask.png sau
#  "mask tower garden.png"), ruleaza:   python3 bake_masks.py
#  (pe server, masca live e oricum citita la zi; asta tine file:// sincronizat.)
# ─────────────────────────────────────────────────────────────────────────────
import re, json, os
from PIL import Image

HTML  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'life_of_puiutu_game.html')
GW, GH = 700, 234                 # grila ~3px/celula, aspect ~3.0
CH = '.ygrpbo'                    # 0 block 1 yellow 2 green 3 red 4 purple 5 blue 6 orange

def classify(r, g, b, a):
    if a < 40: return 0
    if r > 210 and g > 210 and b < 180: return 1            # yellow
    if g > 110 and (g - r) > 40 and (g - b) > 40: return 2  # green
    if b > 170 and (b - r) > 100 and (b - g) > 60: return 5 # blue (library floor)
    if r > 90 and b > 90 and (r - g) > 40 and (b - g) > 40: return 4  # purple
    if r > 190 and 120 < g < 205 and b < 110 and (g - b) > 50: return 6  # orange (library stairs)
    if r > 120 and (r - g) > 55 and (r - b) > 45: return 3  # red
    return 0

def bake(fn):
    im = Image.open(fn).convert('RGBA'); W, H = im.size; px = im.load()
    cells = []
    for gy in range(GH):
        y = min(H - 1, int((gy + 0.5) / GH * H))
        for gx in range(GW):
            x = min(W - 1, int((gx + 0.5) / GW * W))
            cells.append(classify(*px[x, y]))
    out = []; i = 0; n = len(cells)
    while i < n:
        j = i
        while j < n and cells[j] == cells[i]: j += 1
        out.append(str(j - i) + CH[cells[i]]); i = j
    return ''.join(out)

def main():
    src = open(HTML).read()
    masks = sorted(set(re.findall(r"mask:'([^']+)'", src)))
    if not masks:
        print('Nu am gasit nicio masca in HTML.'); return
    parts = []
    for m in masks:
        if not os.path.isfile(m):
            print('  ! lipseste fisierul:', m); continue
        rle = bake(m)
        parts.append(json.dumps(m) + ':{w:%d,h:%d,rle:%s}' % (GW, GH, json.dumps(rle)))
        print('  baked %-26s %5d chars' % (m, len(rle)))
    const = 'const MASK_BAKED={' + ', '.join(parts) + '};'
    new, n = re.subn(r'const MASK_BAKED=\{.*?\};', const, src, count=1)
    if n != 1:
        print('EROARE: nu am gasit linia "const MASK_BAKED=...;" in HTML.'); return
    open(HTML, 'w').write(new)
    print('OK — grilele baked au fost actualizate in', os.path.basename(HTML))

if __name__ == '__main__':
    main()
