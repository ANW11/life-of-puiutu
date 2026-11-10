# Push the Old Ones in the poster art further into the dark: inside their area every pixel is darkened
# except the glowing eyes (and the lit ruins, which are brighter than the shadows).
import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
HERE=os.path.dirname(os.path.abspath(__file__))
src=os.path.join(HERE,'dlc_old_ones_shadows_raw.png'); dst=os.path.join(HERE,'dlc_old_ones_shadows_dark.png')
K=float(sys.argv[1]) if len(sys.argv)>1 else 0.32
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(float); H,W=a.shape[:2]
P=[(100,250),(1024,250),(1024,770),(940,770),(880,740),(760,735),(700,700),(450,700),(430,620),(330,560),(270,520),(210,500),(150,485),(100,430)]
reg=Image.new('L',(W,H),0); ImageDraw.Draw(reg).polygon(P,fill=255); reg=np.asarray(reg.filter(ImageFilter.GaussianBlur(14)))/255.0
R,G,B=a[...,0],a[...,1],a[...,2]; L=0.3*R+0.59*G+0.11*B
eyes=((R>170)&(R-B>50)&(R-G>40)) | ((B>190)&(R>140)&(G<120)&(L>120))          # orange-red eyes, the purple crystal eye
eyes=ndimage.binary_dilation(eyes,iterations=2)
keep=np.clip(ndimage.gaussian_filter(eyes.astype(float),2.0)*1.6,0,1)
lit=np.clip((L-115)/40,0,1)                                                       # lit stone of the ruins stays
f=1-reg*(1-K)*(1-np.maximum(keep,lit))
out=a*f[...,None]
Image.fromarray(out.clip(0,255).astype(np.uint8)).save(dst); print('ok')
