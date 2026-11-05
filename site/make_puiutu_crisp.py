# Cleans the light fringe off small pixel sprites and scales them 4x nearest-neighbour.
import os
import numpy as np
from PIL import Image
from scipy import ndimage
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def crisp(src, name, light_cut=150):
    im = np.array(Image.open(os.path.join(R, src)).convert('RGBA')).astype(int)
    a = im[..., 3]
    solid = a > 40
    for _ in range(2):  # peel light/half-transparent pixels touching the outside, twice
        outside = ~ndimage.binary_fill_holes(solid)
        edge = solid & ndimage.binary_dilation(outside)
        light = im[..., :3].mean(-1) > light_cut
        peel = edge & (light | (a < 200))
        solid &= ~peel
    im[..., 3] = np.where(solid, 255, 0)
    out = Image.fromarray(im.astype('uint8'))
    out = out.crop(out.getbbox())
    out = out.resize((out.width * 4, out.height * 4), Image.NEAREST)
    out.save(os.path.join(R, 'site/art', name), 'WEBP', lossless=True)
    print(name, out.size)


crisp('npcs/sprite_tomy.png', 'tomy.webp', light_cut=250)


def hd_cutout(src, name, h=700):
    """ChatGPT redraw at higher res: keep only the main shape, crop, save."""
    from scipy import ndimage as nd
    im = np.array(Image.open(os.path.join(R, src)).convert('RGBA'))
    m = im[..., 3] > 40
    lab, n = nd.label(nd.binary_dilation(m, iterations=2))
    keep = lab == (np.argmax(nd.sum(m, lab, range(1, n + 1))) + 1)
    im[..., 3] = np.where(keep & m, im[..., 3], 0)
    out = Image.fromarray(im)
    out = out.crop(out.getbbox())
    out = out.resize((round(out.width * h / out.height), h), Image.LANCZOS)
    out.save(os.path.join(R, 'site/art', name), 'WEBP', quality=92)
    print(name, out.size)


hd_cutout('site/art_src/puiutu_hd.png', 'puiutu.webp')


def card_cutout(src, name, w=360):
    """Regenerated skin card: drop faint alpha, crop to content, resize to the other cards' width."""
    im = np.array(Image.open(os.path.join(R, src)).convert('RGBA'))
    im[..., 3] = np.where(im[..., 3] > 30, im[..., 3], 0)
    out = Image.fromarray(im)
    out = out.crop(out.getbbox())
    out = out.resize((w, round(out.height * w / out.width)), Image.LANCZOS)
    out.save(os.path.join(R, 'site/art', name), 'WEBP', quality=90)
    print(name, out.size)


# site deck copies of the pixelated game cards (made by make_skin_cards.py)
for _card in ['scottish', 'ragdoll']:
    _im = Image.open(os.path.join(R, f'skins/cards/skin_{_card}_big.webp')).convert('RGBA')
    _im = _im.crop(_im.getbbox())
    _im.resize((360, round(_im.height * 360 / _im.width)), Image.NEAREST).save(os.path.join(R, 'site/art', f'skin_{_card}.webp'), 'WEBP', lossless=True)
