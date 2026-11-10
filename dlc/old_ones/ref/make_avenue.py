# The Avenue of Fangs: the right image was made by extending the left one (its left half repeats the
# left image's right half), so the two overlap by 768 px; they are joined along the least-different
# path through that overlap, so there is no visible seam.
import numpy as np
from PIL import Image, ImageFilter
L=np.asarray(Image.open('dlc/old_ones/ref/avenue_left_src.png').convert('RGB')).astype(float)
R=np.asarray(Image.open('dlc/old_ones/ref/avenue_right_src.png').convert('RGB')).astype(float)
dx=768; H,W=L.shape[:2]; ov=W-dx; a=L[:,dx:]; b=R[:,:ov]
cost=np.abs(a-b).sum(2); cost[:,:60]+=1e5; cost[:,ov-60:]+=1e5
acc=cost.copy(); back=np.zeros_like(cost,dtype=int)
for y in range(1,H):
    p=acc[y-1]; l=np.r_[np.inf,p[:-1]]; r=np.r_[p[1:],np.inf]; st=np.vstack([l,p,r]); k=st.argmin(0)
    acc[y]+=st[k,np.arange(ov)]; back[y]=k-1+np.arange(ov)
x=int(acc[-1].argmin()); seam=np.zeros(H,int)
for y in range(H-1,-1,-1): seam[y]=x; x=back[y,x]
m=np.zeros((H,ov))
for y in range(H): m[y,seam[y]:]=1
m=np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float)[...,None]/255
out=np.zeros((H,dx+R.shape[1],3)); out[:,:dx]=L[:,:dx]; out[:,dx:W]=a*(1-m)+b*m; out[:,W:]=R[:,ov:]
Image.fromarray(out.clip(0,255).astype(np.uint8)).save('dlc/old_ones/art/fang_avenue.png')
print(out.shape, 'seam', dx+seam.min(), dx+seam.max())
