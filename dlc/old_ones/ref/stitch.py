import sys, numpy as np
from PIL import Image, ImageFilter
Lp,Rp,out,dx=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4])
L=np.asarray(Image.open(Lp).convert('RGB')).astype(float); R=np.asarray(Image.open(Rp).convert('RGB').resize((1536,1024))).astype(float)
H,W=L.shape[:2]; ov=W-dx
a=L[:,dx:]; b=R[:,:ov]
cost=np.abs(a-b).sum(2)
# keep the seam away from the overlap edges
m=40; cost[:, :m]+=1e5; cost[:, ov-m:]+=1e5
# dynamic-programming min vertical seam
acc=cost.copy(); back=np.zeros_like(cost,dtype=int)
for y in range(1,H):
    p=acc[y-1]; l=np.r_[np.inf,p[:-1]]; r=np.r_[p[1:],np.inf]
    st=np.vstack([l,p,r]); k=st.argmin(0); acc[y]+=st[k,np.arange(ov)]; back[y]=k-1+np.arange(ov)
x=int(acc[-1].argmin()); seam=np.zeros(H,int)
for y in range(H-1,-1,-1): seam[y]=x; x=back[y,x]
mask=np.zeros((H,ov)); 
for y in range(H): mask[y,seam[y]:]=1
mask=np.asarray(Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(float)[...,None]/255
blend=a*(1-mask)+b*mask
res=np.zeros((H,dx+1536,3)); res[:,:dx]=L[:,:dx]; res[:,dx:W]=blend; res[:,W:]=R[:,ov:]
Image.fromarray(res.clip(0,255).astype(np.uint8)).save(out)
print('seam x range (left coords):', dx+seam.min(), dx+seam.max(), 'size', res.shape[1], H)
