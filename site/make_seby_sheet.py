# Packs Seby's walk + claw frames into one sheet: frames 0-5 walk, 6-7 claw snap.
import os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = [f'walk{i}' for i in range(6)] + ['claw0', 'claw1']
fr = [Image.open(os.path.join(R, 'mobs/seby/anim', n + '.png')).convert('RGBA') for n in names]
W, H = fr[0].size; h = 160; w = round(W * h / H)
s = Image.new('RGBA', (w * len(fr), h), (0, 0, 0, 0))
for i, f in enumerate(fr): s.paste(f.resize((w, h), Image.LANCZOS), (i * w, 0))
s.save(os.path.join(R, 'site/art/seby_sheet.webp'), 'WEBP', quality=90)
print('seby frame', w, 'x', h)
