#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  gen_minecart_sprites.py — genereaza cu GPT (gpt-image-1) sprite-urile pentru minecart:
#
#    duck   : poza "aplecat" pentru Puiutu si pentru fiecare skin
#             -> puiutu/duck.png, skins/frames/<skin>/duck.png
#    carts  : caruciorul de pe liniile laterale, la unghiul sinelor
#             -> cart_game/left_v2.png, cart_game/right_v2.png
#
#  Cheia: pune  OPENAI_API_KEY=...  in .env (langa acest fisier). Apoi:
#     python3 gen_minecart_sprites.py duck            # toate pisicile
#     python3 gen_minecart_sprites.py duck calico     # doar un skin (sau "puiutu")
#     python3 gen_minecart_sprites.py carts
#  Fiecare rezultat e pus pe ACELASI canvas ca sprite-ul idle al pisicii (aceeasi marime,
#  aceeasi linie a labutelor), deci jocul il foloseste direct, fara alte setari.
#  Originalul GPT se pastreaza langa el ca *_raw.png, ca sa poti alege/repeta.
# ─────────────────────────────────────────────────────────────────────────────
import os, sys, io, json, base64, glob, uuid, urllib.request
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))

def api_key():
    k = os.environ.get('OPENAI_API_KEY')
    if not k and os.path.isfile(os.path.join(ROOT, '.env')):
        for line in open(os.path.join(ROOT, '.env')):
            if line.strip().startswith('OPENAI_API_KEY='):
                k = line.split('=', 1)[1].strip().strip('"\'')
    if not k: sys.exit('Lipseste OPENAI_API_KEY (in .env sau in mediu).')
    return k

def edit(images, prompt, size='1024x1024'):
    """POST /v1/images/edits with one or more reference images; returns a PIL RGBA image."""
    b = uuid.uuid4().hex; body = io.BytesIO()
    def field(name, val):
        body.write(f'--{b}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{val}\r\n'.encode())
    for k, v in (('model', 'gpt-image-1'), ('prompt', prompt), ('size', size),
                 ('background', 'transparent'), ('quality', 'high'), ('n', '1')):
        field(k, v)
    for im in images:
        buf = io.BytesIO(); im.save(buf, 'PNG')
        body.write(f'--{b}\r\nContent-Disposition: form-data; name="image[]"; filename="ref.png"\r\n'
                   f'Content-Type: image/png\r\n\r\n'.encode())
        body.write(buf.getvalue()); body.write(b'\r\n')
    body.write(f'--{b}--\r\n'.encode())
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body.getvalue(),
        headers={'Authorization': 'Bearer ' + api_key(), 'Content-Type': f'multipart/form-data; boundary={b}'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: data = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit('OpenAI: %s %s' % (e.code, e.read().decode()[:400]))
    return Image.open(io.BytesIO(base64.b64decode(data['data'][0]['b64_json']))).convert('RGBA')

def bbox(im, thr=40):
    a = np.array(im)[..., 3] > thr; ys, xs = np.where(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def fit_like(gen, ref):
    """Put `gen` on `ref`'s canvas: same width of cat, centred on it, paws on the same line."""
    gx0, gy0, gx1, gy1 = bbox(gen); rx0, ry0, rx1, ry1 = bbox(ref)
    cat = gen.crop((gx0, gy0, gx1, gy1))
    k = (rx1 - rx0) / cat.width                       # same body width as the idle cat
    cat = cat.resize((max(1, round(cat.width * k)), max(1, round(cat.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', ref.size, (0, 0, 0, 0))
    cx = (rx0 + rx1) // 2
    out.alpha_composite(cat, (max(0, cx - cat.width // 2), max(0, ry1 - cat.height)))
    return out

DUCK_PROMPT = (
    "This is a game sprite of a cat sitting. Redraw THE SAME cat — identical pixel-art style, "
    "identical colours, fur pattern, markings and outline — but DUCKING: crouched as low as it can, "
    "body flattened to the ground, head pulled down between the shoulders, ears folded flat back, "
    "eyes squeezed half shut, tail wrapped tight. Same viewing angle (facing the viewer, slightly to "
    "the side). The pose should be about half as tall as the sitting pose. Only the cat, centred, "
    "full body visible, transparent background, no shadow, no text.")

def cats():
    out = [('puiutu', os.path.join(ROOT, 'puiutu/sprite_puiutu.png'), os.path.join(ROOT, 'puiutu/duck.png'))]
    for d in sorted(glob.glob(os.path.join(ROOT, 'skins/frames/*/idle.png'))):
        sk = os.path.basename(os.path.dirname(d))
        out.append((sk.replace('skin_', ''), d, os.path.join(os.path.dirname(d), 'duck.png')))
    return out

def do_duck(only=None):
    for name, src, dst in cats():
        if only and name != only: continue
        ref = Image.open(src).convert('RGBA')
        print('duck:', name, '...', flush=True)
        gen = edit([ref], DUCK_PROMPT, '1536x1024' if ref.width > ref.height * 1.3 else '1024x1024')
        gen.save(dst.replace('.png', '_raw.png'))
        fit_like(gen, ref).save(dst)
        print('   ->', os.path.relpath(dst, ROOT))

CART_PROMPT = (
    "Reference 1: a wooden mine cart seen straight from behind. Reference 2: the same cart, turned. "
    "Reference 3: a guide — two rails drawn as lines, running away from the viewer up and to the {dir}. "
    "Draw THE SAME cart (same wood, iron bands, spoked wheels, pixel-art style and palette as references "
    "1 and 2) standing ON the two rails of reference 3, rolling away along them: its long side runs "
    "exactly parallel to the rails, its wheels sit on the rails, and it is seen from behind and above so "
    "the empty tub is visible. Match the guide's angle precisely — the cart is turned much less than in "
    "reference 2. Output only the cart: no rails, no lines, no shadow, no text, transparent background.")

def rail_guide(mirror):
    """The side lane's two rails as the game projects them (right lane; mirrored for the left), on a
    1536x1024 canvas at the scale a cart sprite is drawn: inner rail leans 0.53 px/px, outer 0.90."""
    from PIL import ImageDraw
    g = Image.new('RGBA', (1536, 1024), (255, 255, 255, 255)); d = ImageDraw.Draw(g)
    for x0, m in ((470, 0.531), (1180, 0.897)):
        y0, y1 = 1000, 420                              # just the stretch under the cart
        d.line([(x0, y0), (x0 - m * (y0 - y1), y1)], fill=(40, 40, 40, 255), width=14)
    return g.transpose(Image.FLIP_LEFT_RIGHT) if mirror else g

def do_carts():
    back = Image.open(os.path.join(ROOT, 'cart_game/cart_final.png')).convert('RGBA')
    for side, ref, dst, d in (('L', 'cart_game/left.png', 'cart_game/left_v2.png', 'right'),
                              ('R', 'cart_game/right.png', 'cart_game/right_v2.png', 'left')):
        print('cart', side, '...', flush=True)
        r2 = Image.open(os.path.join(ROOT, ref)).convert('RGBA')
        gen = edit([back, r2, rail_guide(side == 'L')], CART_PROMPT.format(dir=d), '1536x1024')
        gen.save(os.path.join(ROOT, dst.replace('.png', '_raw.png')))
        fit_like(gen, r2).save(os.path.join(ROOT, dst))
        print('   ->', dst)

if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else ''
    if what == 'duck': do_duck(sys.argv[2] if len(sys.argv) > 2 else None)
    elif what == 'carts': do_carts()
    else: print(__doc__ or 'usage: gen_minecart_sprites.py duck [skin] | carts')
