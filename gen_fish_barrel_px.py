#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  gen_fish_barrel_px.py — deseneaza pixel cu pixel butoiul de pescuit de pe doc
#  (fishing/barell_overworld.png), cu paleta si marimea pixelilor din 'maps/beach final.png':
#  maro desaturat, contur maro inchis (nu negru), cercuri de fier mate, apa cu o coada de peste,
#  undita sprijinita in butoi cu pluta rosie.
#     python3 gen_fish_barrel_px.py
#  Originalul vechi e pastrat in fishing/_orig_backup/.
# ─────────────────────────────────────────────────────────────────────────────
import os, math, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'fishing', '_orig_backup', 'barell_overworld_px.png')   # the game uses the ChatGPT version; this is the hand-drawn alternative
UP = 8                          # upscale factor (nearest), the game scales it down to ~92px tall

# palette sampled from the dock planks / posts in beach final.png
OUTL = (57, 43, 35)
WOOD = [(78, 59, 46), (100, 75, 57), (125, 94, 72), (143, 109, 82), (168, 132, 98), (190, 156, 118)]
IRON = [(64, 60, 58), (88, 84, 80), (116, 110, 102), (146, 140, 128)]
WATER = [(46, 66, 76), (64, 92, 104), (98, 128, 138), (176, 200, 198)]
FISH = [(118, 92, 66), (168, 128, 86), (206, 168, 116)]
ROD = [(98, 68, 42), (150, 108, 64), (192, 150, 98)]
LINE = (214, 206, 186)
RED, REDL, WHITE = (178, 62, 50), (214, 104, 86), (232, 224, 206)

W, H = 50, 54
CX = 29.0                       # barrel centre (room on the left for the rod tip and bobber)
R0, RB = 16.0, 14.4             # radius at the rim / at the foot (a tub tapers a little)
TOP, BOT = 26.0, 46.0           # rim / foot ellipse centres
RY0, RYB = 4.6, 3.8             # ellipse half-heights (3/4 top-down view)

px = {}
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[(x, y)] = c

def ell(x, y, cx, cy, rx, ry):
    fx = (x + 0.5 - cx) / rx; fy = (y + 0.5 - cy) / ry
    return fx * fx + fy * fy <= 1

def side_t(y):
    return max(0.0, min(1.0, (y + 0.5 - TOP) / (BOT - TOP)))

# ── side of the tub: between the front arc of the rim and the front arc of the foot ──
for y in range(H):
    t = side_t(y); R = R0 + (RB - R0) * t; ry = RY0 + (RYB - RY0) * t
    for x in range(W):
        fx = (x + 0.5 - CX) / R
        if abs(fx) > 1: continue
        if y + 0.5 < TOP or y + 0.5 > BOT + RYB * math.sqrt(1 - min(1, ((x + 0.5 - CX) / RB) ** 2)): continue
        light = 0.58 - 0.5 * fx - 0.18 * t + (0.08 if abs(fx) < 0.6 else -0.08)
        i = max(0, min(5, int(round(light * 5))))
        c = WOOD[i]
        ang = math.asin(fx); ph = (ang / math.pi + 0.5) * 8          # 8 staves across the front
        if abs(ph - round(ph)) < 0.1 and abs(fx) < 0.9: c = WOOD[max(0, i - 2)]
        # hoops follow the curvature of the tub
        arc = ry * math.sqrt(max(0, 1 - fx * fx))
        for d in (5.5, 17.5):
            yy = TOP + d + arc
            if 0 <= (y + 0.5) - yy < 2.2:
                j = max(0, min(3, int(round((0.55 - 0.55 * fx) * 3))))
                c = IRON[j] if (y + 0.5) - yy < 1.1 else IRON[max(0, j - 2)]
        put(x, y, c)

# ── the open top: rim ring, back inner wall, water ──
for y in range(H):
    for x in range(W):
        if not ell(x, y, CX, TOP, R0, RY0): continue
        fx = (x + 0.5 - CX) / R0
        if not ell(x, y, CX, TOP, R0 - 1.6, RY0 - 1.2):       # rim
            front = y + 0.5 > TOP
            put(x, y, (WOOD[5] if fx < 0.3 else WOOD[4]) if front else (WOOD[3] if fx < 0.2 else WOOD[2]))
        elif ell(x, y, CX, TOP + 1.6, R0 - 1.6, RY0 - 1.2):     # water, sitting a bit below the rim
            put(x, y, WATER[1] if fx < -0.25 else WATER[0])
        else:                                                    # back inner wall above the waterline
            put(x, y, WOOD[1] if fx > -0.3 else WOOD[2])
OX, OY = int(CX) - 23, int(TOP) - 16          # hand-placed details below are relative to this
for x, y in [(15, 17), (16, 17), (17, 18), (29, 19), (30, 19)]: put(x + OX, y + OY, WATER[2])
put(15 + OX, 16 + OY, WATER[3])

# ── outline around the tub ──
def outline(cells, col=OUTL):
    for (x, y) in cells:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in px: px[q] = col
outline(list(px))
# rim lip line: a dark seam between the rim and the side, only across the front
for x in range(W):
    fx = (x + 0.5 - CX) / R0
    if abs(fx) < 0.97:
        y = int(TOP + RY0 * math.sqrt(1 - fx * fx) + 0.5)
        if (x, y) in px and px[(x, y)] not in (OUTL,): px[(x, y)] = WOOD[1]

# ── a fish tail poking out of the water ──
tail = {(25, 14): 0, (25, 15): 1, (26, 15): 0, (24, 13): 1, (26, 13): 0, (23, 12): 2, (27, 12): 1,
        (24, 12): 1, (26, 12): 0, (25, 13): 1}
tail = {(x + OX - 8, y + OY + 1): k for (x, y), k in tail.items()}
for q, k in tail.items(): put(*q, FISH[k])
for (x, y) in tail:
    for dx, dy in ((1, 0), (-1, 0), (0, -1)):
        q = (x + dx, y + dy)
        if q not in tail: px[q] = OUTL
put(17 + OX, 17 + OY, WATER[2]); put(16 + OX, 17 + OY, WATER[3]); put(18 + OX, 17 + OY, WATER[2])   # ripple at the tail

# ── rod: a clean 1:1 diagonal, butt in the water, resting on the back rim, tip out to the upper left ──
bx, by0 = int(CX) + 7, int(TOP) + 1
rod = [(bx - k, by0 - k) for k in range(26)]
for (x, y) in rod:
    if (x, y + 1) not in rod: put(x, y + 1, OUTL)
for i, (x, y) in enumerate(rod):
    if i < 2: continue                                        # the butt end is under water
    put(x, y, ROD[0] if i < 7 else ROD[2] if i % 5 == 0 else ROD[1])
tipx, tipy = rod[-1]
for y in range(tipy + 1, tipy + 17): put(tipx, y, LINE)
by = tipy + 17
tipx -= 1
for (dx, dy), c in {(0, 0): REDL, (1, 0): RED, (0, 1): RED, (1, 1): RED, (0, 2): WHITE, (1, 2): WHITE}.items():
    put(tipx + dx, by + dy, c)
outline([(tipx + dx, by + dy) for dx in (0, 1) for dy in (0, 1, 2)])

img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for (x, y), c in px.items():
    if 0 <= x < W and 0 <= y < H: img.putpixel((x, y), c + (255,))
img = img.crop(img.getbbox())

bk = os.path.join(ROOT, 'fishing', '_orig_backup', 'barell_overworld.png')
if os.path.exists(OUT) and not os.path.exists(bk): shutil.copy(OUT, bk)
img.resize((img.width * UP, img.height * UP), Image.NEAREST).save(OUT)
print('saved', OUT, img.size)
