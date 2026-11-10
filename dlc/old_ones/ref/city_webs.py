# Lift only the pale web threads out of a ChatGPT edit of the city crop (x 520..2056) and paste them on the map.
import sys, numpy as np
from PIL import Image
src, web, dst = sys.argv[1:4]
m=Image.open(src).convert('RGB'); a=np.asarray(m).copy()
w=np.asarray(Image.open(web).convert('RGB').resize((1536,1024),Image.NEAREST)).astype(int)
o=a[:,520:2056].astype(int)
mx=w.max(2); mn=w.min(2); omx=o.max(2)
mask=(mx>165)&((mx-mn)<70)&(mx-omx>45)
reg=np.zeros_like(mask); reg[0:270,880:1536]=True      # avenue opening, stalactites, right statue head
mask&=reg
# skip fire/crystal glints: webs are thin, drop big blobs
from scipy import ndimage
lab,n=ndimage.label(mask)
sizes=ndimage.sum(mask,lab,range(1,n+1))
keep=np.zeros(n+1,bool); keep[1:]=sizes>=3
mask=keep[lab]
print('web px',mask.sum())
sub=a[:,520:2056]; sub[mask]=(w[mask]*0.85+np.array([150,140,165])*0.15).astype(np.uint8)
Image.fromarray(a).save(dst)
