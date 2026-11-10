# Give the City of Fangs the Avenue of Fangs palette.
# Lab space: lightness is histogram-matched to the avenue, and the colour (a,b) of every non-glowing pixel is
# replaced by the avenue's typical stone colour at that lightness, keeping a little of the original variation.
# Flames (bright orange) and crystals (saturated violet) keep their own colour.
import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
KEEP=float(sys.argv[3]) if len(sys.argv)>3 else 0.25     # share of the city's own chroma variation kept
def to_lab(rgb):
    c=rgb/255.0; c=np.where(c>0.04045,((c+0.055)/1.055)**2.4,c/12.92)
    M=np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz=np.einsum('...j,ij->...i',c,M)/np.array([0.95047,1.0,1.08883])
    f=np.where(xyz>0.008856,np.cbrt(xyz),7.787*xyz+16/116)
    return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],-1)
def to_rgb(lab):
    fy=(lab[...,0]+16)/116; fx=fy+lab[...,1]/500; fz=fy-lab[...,2]/200
    f=np.stack([fx,fy,fz],-1); xyz=np.where(f**3>0.008856,f**3,(f-16/116)/7.787)*np.array([0.95047,1.0,1.08883])
    Mi=np.array([[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]])
    c=np.einsum('...j,ij->...i',xyz,Mi); c=np.where(c>0.0031308,1.055*np.clip(c,0,None)**(1/2.4)-0.055,12.92*c)
    return (np.clip(c,0,1)*255).round().astype(np.uint8)
def glow(lab):
    ch=np.hypot(lab[...,1],lab[...,2]); hue=np.degrees(np.arctan2(lab[...,2],lab[...,1]))%360
    fire=(lab[...,0]>68)&(ch>62)&(hue>25)&(hue<95)
    crys=(ch>70)&(hue>285)&(hue<330)
    return fire|crys
c=to_lab(np.asarray(Image.open(src).convert('RGB')).astype(float))
a=to_lab(np.asarray(Image.open('dlc/old_ones/art/fang_avenue.png').convert('RGB')).astype(float))
ga,gc=glow(a),glow(c)
q=np.linspace(0,1,512)
L=np.interp(c[...,0],np.quantile(c[...,0][~gc],q),np.quantile(a[...,0][~ga],q))
# avenue stone colour per lightness bin
bins=np.arange(0,101,2); idx=np.digitize(a[...,0][~ga],bins)
ab=np.zeros((len(bins)+1,2)); last=np.array([0.,0.])
for i in range(len(bins)+1):
    s=idx==i
    if s.sum()>50: last=np.median(a[...,1:][~ga][s],0)
    ab[i]=last
tgt=ab[np.digitize(L,bins)]
own=c[...,1:]-np.median(c[...,1:][~gc],0)
out=np.empty_like(c); out[...,0]=L; out[...,1:]=tgt+own*KEEP
out[gc]=np.concatenate([L[gc][:,None],c[...,1:][gc]],1)   # glows keep their hue
Image.fromarray(to_rgb(out)).save(dst)
