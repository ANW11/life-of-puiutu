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


crisp('puiutu/sprite_puiutu.png', 'puiutu.webp')
crisp('npcs/sprite_tomy.png', 'tomy.webp', light_cut=250)
