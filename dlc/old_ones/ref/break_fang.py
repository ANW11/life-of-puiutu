# Break the front fang of the right sphinx at half its length: the stone below a jagged line is gone
# (filled with the dark mouth behind it), and the break gets a dark rough edge like split stone.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
P='dlc/old_ones/art/city_of_fangs.png'
src=Image.open(P).convert('RGB'); im=np.asarray(src).astype(int); out=im.copy()
# the lower half of the fang (with its outline), below the break
jag={x:189+[0,2,1,3,1,0,2,3,1,2,0,1,3,2,1,0,2,1,3,2,1][x-1745] for x in range(1745,1766)}
m=Image.new('L',src.size,0); d=ImageDraw.Draw(m)
d.polygon([(1745,jag[1745]),*[(x,jag[x]) for x in range(1745,1766)],(1767,200),(1766,226),(1760,226),(1748,205)],fill=255)
M=np.asarray(m.filter(ImageFilter.MaxFilter(5)))>0
# fill: the shadowed mouth right next to it, same row (it is dark and plain there)
ys,xs=np.nonzero(M)
for y,x in zip(ys,xs): out[y,x]=im[y,x+24]
# the break face: a 2px dark rough edge, with a lighter chipped pixel here and there
for x in range(1746,1765):
    y=jag[x]
    out[y,x]=[52,30,58]; out[y-1,x]=(im[y-1,x]*0.7+np.array([52,30,58])*0.3).astype(int)
    if x%4==1: out[y-2,x]=np.minimum(255,im[y-2,x]*1.12).astype(int)
Image.fromarray(out.clip(0,255).astype(np.uint8)).save(P)
