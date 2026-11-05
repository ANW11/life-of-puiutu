# Builds art/coin_spin.webp: an 8-frame 360 spin from the 5 poses in ui/goldcoin.png.
import os
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(R, 'ui/goldcoin.png')).convert('RGBA')
a = np.array(im)[:, :, 3] > 40
lab, n = ndimage.label(a)
boxes = sorted(ndimage.find_objects(lab), key=lambda s: s[1].start)
crops = [im.crop((s[1].start, s[0].start, s[1].stop, s[0].stop)) for s in boxes]
edge, three_a, front, three_b, front2 = crops   # left to right on the sheet
seq = [front, three_a, edge, three_b, front2, ImageOps.mirror(three_b), ImageOps.mirror(edge), ImageOps.mirror(three_a)]
S = 160
H = max(c.height for c in crops)
sheet = Image.new('RGBA', (S * len(seq), S), (0, 0, 0, 0))
for i, c in enumerate(seq):
    k = (S - 8) / H
    c = c.resize((max(1, round(c.width * k)), round(c.height * k)), Image.LANCZOS)
    sheet.paste(c, (i * S + (S - c.width) // 2, (S - c.height) // 2), c)
sheet.save(os.path.join(R, 'site/art/coin_spin.webp'), 'WEBP', quality=92)
print('frames', len(seq))
