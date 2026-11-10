# The DLC title screen background: ChatGPT art (ref/menu_bg_raw.png) with the Old Ones pushed into the dark,
# only their eyes and the lit ruins keep their light. Writes art/menu_bg.jpg.
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
HERE=os.path.dirname(os.path.abspath(__file__)); ART=os.path.join(os.path.dirname(HERE),'art')
K=1.0   # 1.0 = the Old Ones as drawn (the user wants them visible on the menu); lower darkens them
a=np.asarray(Image.open(os.path.join(HERE,'menu_bg_raw.png')).convert('RGB')).astype(float); H,W=a.shape[:2]
regs=[[(150,0),(420,0),(440,220),(340,265),(230,265),(150,240)],                                   # the Weaver
      [(640,0),(1340,0),(1536,200),(1536,505),(1450,530),(1290,535),(1180,480),(1050,505),(790,505),(740,420),(690,300)]]   # the Sleeper, trilobite, sea scorpion
m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m)
for p in regs: d.polygon(p,fill=255)
reg=np.asarray(m.filter(ImageFilter.GaussianBlur(40)))/255.0
R,G,B=a[...,0],a[...,1],a[...,2]; L=0.3*R+0.59*G+0.11*B
eyes=((R>170)&(R-B>50)&(R-G>40)) | ((B>190)&(R>140)&(G<120)&(L>120))
eyes=ndimage.binary_dilation(eyes,iterations=2)
keep=np.clip(ndimage.gaussian_filter(eyes.astype(float),2.0)*1.6,0,1)
lit=np.clip((L-115)/40,0,1)
f=1-reg*(1-K)*(1-np.maximum(keep,lit))
Image.fromarray((a*f[...,None]).clip(0,255).astype(np.uint8)).save(os.path.join(ART,'menu_bg.jpg'),quality=90)
print('ok')
