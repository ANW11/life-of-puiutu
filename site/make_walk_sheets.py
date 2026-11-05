# Packs Puiutu's run frames and Rocky's walk frames into horizontal sheets for CSS steps().
import os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sheet(paths, out, h):
    fr = [Image.open(os.path.join(R, p)).convert('RGBA') for p in paths]
    W = max(f.width for f in fr); H = max(f.height for f in fr)
    s = Image.new('RGBA', (W * len(fr), H), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.paste(f, (i * W + (W - f.width) // 2, H - f.height), f)
    k = h / H; s = s.resize((round(s.width * k), h), Image.LANCZOS)
    s.save(os.path.join(R, 'site/art', out), 'WEBP', quality=90)
    print(out, len(fr), 'frames, frame', round(W * k), 'x', h)
sheet([f'puiutu/runf_{i}.png' for i in range(6)], 'run_sheet.webp', 168)
sheet([f'npcs/rocky_new/walk{i}.png' for i in range(4)], 'rocky_sheet.webp', 160)
sheet([f'army/frames/snout_walk{i}.png' for i in range(6)], 'snout_sheet.webp', 140)
