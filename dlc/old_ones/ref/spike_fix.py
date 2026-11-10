# The hanging stone spike behind the right sphinx: the mirror paste had cut it with a soft seam.
# Put the whole original spike back, crisp, in front of the sphinx's back (the user likes it there).
from PIL import Image, ImageDraw, ImageFilter
P='dlc/old_ones/art/city_of_fangs.png'
cur=Image.open(P).convert('RGB'); v1=Image.open('dlc/old_ones/ref/city_of_fangs_v1.png').convert('RGB')
m=Image.new('L',cur.size,0); ImageDraw.Draw(m).polygon([(1999,122),(2058,122),(2031,264),(2025,264)],fill=255)
m=m.filter(ImageFilter.MaxFilter(3))          # keep its dark outline, hard edge (no blur)
Image.composite(v1,cur,m).save(P)
# and the mirrored copy's sliver just right of its tip: cover it with the sphinx's back beside it
import numpy as np
im=np.asarray(Image.open(P).convert('RGB')).astype(int); out=im.copy(); V0=np.asarray(v1).astype(int)
for y in range(222,276):
    for x in range(2034,2047):
        top=236+(x-2030)*0.8                       # the top of the sphinx's back here
        out[y,x]= V0[y,x] if y<top else im[y,x+16]   # above: the cave wall as it was; below: more of the back
Image.fromarray(out.astype(np.uint8)).save(P)
