# Life of Puiutu: make walk/attack frames for the pigeon colours that only had one sprite.
# usage: python3 gen_pigeon_frames.py <repo root> <out dir> v3 v4 v6 v7 v8   (then copy into mobs/birds/)
# Recolour the grey pigeon's animation frames into another pigeon colour while keeping its
# markings: each frame pixel takes the colour the variant's own sprite has at the same spot
# (matched through the grey pigeon's sprite, which shares the variant's pose), shaded by how much
# brighter or darker the frame pixel is than the grey sprite there. Feet, beak and eye stay.
import sys, colorsys
from PIL import Image
root,out=sys.argv[1],sys.argv[2]
FR=['walk0','walk1','walk2','walk3','atk0','atk1']
def lum(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
def warm(p):
    h,s,v=colorsys.rgb_to_hsv(*(c/255 for c in p[:3])); return s>0.35 and (h<0.05 or h>0.88) and v>0.55   # pink feet, red eye — not a brown head
def fit(img,h):
    bb=img.getbbox(); c=img.crop(bb); return c.resize((max(1,round(c.width*h/c.height)),h), Image.BOX)
import bisect
def palette(img):
    px=[p for p in img.getdata() if p[3]>200 and not warm(p)]; px.sort(key=lum); return px
base_full=Image.open(f'{root}/mobs/pigeon_v5.png').convert('RGBA')
BL=[lum(p) for p in palette(base_full)]
def head(img):                                         # the top third of the bird: head and neck
    bb=img.getbbox(); return img.crop((bb[0]+(bb[2]-bb[0])//2, bb[1], bb[2], bb[1]+(bb[3]-bb[1])*30//100))
HBL=[lum(p) for p in palette(head(base_full))]
for v in sys.argv[3:]:
    var_full=Image.open(f'{root}/mobs/pigeon_{v}.png').convert('RGBA'); PAL=palette(var_full)
    HPAL=palette(head(var_full))
    def hrank(p):
        q=HPAL[min(len(HPAL)-1,int(bisect.bisect_left(HBL,lum(p))/len(HBL)*len(HPAL)))]; return (q[0],q[1],q[2],p[3])
    def rank(p):                                       # where the spot does not line up: match by brightness
        q=PAL[min(len(PAL)-1,int(bisect.bisect_left(BL,lum(p))/len(BL)*len(PAL)))]; return (q[0],q[1],q[2],p[3])
    for f in FR:
        fr=Image.open(f'{root}/mobs/birds/pigeon_v5_{f}.png').convert('RGBA'); bb=fr.getbbox(); H=bb[3]-bb[1]
        bs=fit(base_full,H); vs=fit(var_full,H)
        o=fr.copy(); d=o.load(); B=bs.load(); V=vs.load()
        fw=bb[2]-bb[0]
        for y in range(bb[1],bb[3]):
            for x in range(bb[0],bb[2]):
                p=d[x,y]
                if p[3]==0 or warm(p): continue
                if (y-bb[1])<H*0.30 and (x-bb[0])>fw*0.5: d[x,y]=hrank(p); continue   # the head keeps the variant's head colours
                # same relative spot, anchored at the head (right side: they face right) and the feet
                u=(x-bb[0])/fw; yy=y-bb[1]
                bx=min(bs.width-1,int(bs.width-(fw-(x-bb[0]))*bs.width/max(fw,bs.width))) if f.startswith('atk') else min(bs.width-1,int(u*bs.width))
                vx=min(vs.width-1,int(bx*vs.width/bs.width))
                b=B[bx,yy]; q=V[vx,yy]
                hb,sb,_=colorsys.rgb_to_hsv(*(c/255 for c in b[:3])); hp,spp,_=colorsys.rgb_to_hsv(*(c/255 for c in p[:3]))
                if q[3]<128 or b[3]<128 or warm(q) or (spp>0.25)!=(sb>0.25):
                    d[x,y]=rank(p); continue                   # the poses part here (wings up, head forward)
                k=max(0.65,min(1.35,(lum(p)+8)/(lum(b)+8)))    # the frame's own shading, kept gentle
                d[x,y]=tuple(max(0,min(255,round(c*k))) for c in q[:3])+(p[3],)
        o.save(f'{out}/pigeon_{v}_{f}.png')
    print('done',v)
