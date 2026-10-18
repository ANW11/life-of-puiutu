# Life of Puiutu: cut the mine-cart "duck" pose for every cat skin out of the ChatGPT sheets
# (flat #FF00FF background) and place each one on its skin's idle canvas, at the same scale and
# baseline Puiutu's own duck.png has against his idle sprite, so drawCat swaps it in unchanged.
# usage: python3 gen_duck_frames.py <sheet1> <sheet2> <sheet3> [mainecoon.png]
import sys, glob, os
from PIL import Image
from collections import deque

def key_magenta(im):
    im=im.convert('RGBA'); px=im.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            m=min(r,b)-g                                   # how magenta it is
            if m>110: px[x,y]=(0,0,0,0); continue
            if m>40:                                        # soft fringe: fade out and take the pink back off
                k=(m-40)/70; a2=int(255*(1-k)); r=min(r,g+30); b=min(b,g+30)
                px[x,y]=(r,g,b,a2)
    return im

def blobs(im, minfrac=0.02):
    a=im.getchannel('A'); S=4; w,h=im.width//S, im.height//S
    sm=a.resize((w,h),Image.BOX).load(); seen=[[0]*w for _ in range(h)]; out=[]
    for y in range(h):
        for x in range(w):
            if sm[x,y]>40 and not seen[y][x]:
                q=deque([(x,y)]); seen[y][x]=1; x0=x1=x; y0=y1=y; n=0
                while q:
                    cx,cy=q.popleft(); n+=1; x0=min(x0,cx); x1=max(x1,cx); y0=min(y0,cy); y1=max(y1,cy)
                    for dx in(-1,0,1):
                        for dy in(-1,0,1):
                            nx,ny=cx+dx,cy+dy
                            if 0<=nx<w and 0<=ny<h and not seen[ny][nx] and sm[nx,ny]>40: seen[ny][nx]=1; q.append((nx,ny))
                out.append((n,(x0*S,y0*S,(x1+1)*S,(y1+1)*S)))
    big=max(n for n,_ in out)
    cats=[bb for n,bb in out if n>big*0.25]                 # whiskers and stray specks drop out
    return sorted(cats, key=lambda b:b[0])

skins=sorted(os.path.basename(d) for d in glob.glob('skins/frames/skin_*'))
groups=[skins[0:5],skins[5:9],skins[9:13]]
pui_idle=Image.open('puiutu/sprite_puiutu.png').convert('RGBA'); pui_duck=Image.open('puiutu/duck.png').convert('RGBA')
ib=pui_idle.getbbox(); db=pui_duck.getbbox()
W_RATIO=(db[2]-db[0])/(ib[3]-ib[1])                          # duck width per idle height (Puiutu: 0.75)
cuts={}
for gi,sheet in enumerate(sys.argv[1:4]):
    im=key_magenta(Image.open(sheet)); bbs=blobs(im)
    assert len(bbs)==len(groups[gi]), (sheet,len(bbs))
    for sk,bb in zip(groups[gi],bbs):
        pad=6; c=im.crop((max(0,bb[0]-pad),max(0,bb[1]-pad),min(im.width,bb[2]+pad),min(im.height,bb[3]+pad)))
        cuts[sk]=c.crop(c.getbbox())
if len(sys.argv)>4:                                         # a cleaner single drawing for one cat
    im=key_magenta(Image.open(sys.argv[4])); bb=blobs(im)[0]; c=im.crop(bb); cuts['skin_mainecoon']=c.crop(c.getbbox())
for sk,c in cuts.items():
    idle=Image.open(f'skins/frames/{sk}/idle.png').convert('RGBA'); b=idle.getbbox()
    tw=round(W_RATIO*(b[3]-b[1])); th=round(c.height*tw/c.width)
    d=c.resize((tw,th),Image.LANCZOS)
    canvas=Image.new('RGBA',idle.size,(0,0,0,0))
    cx=(b[0]+b[2])//2; x=max(0,min(idle.width-tw, cx-tw//2)); y=b[3]-th
    canvas.alpha_composite(d,(x,max(0,y)))
    canvas.save(f'skins/frames/{sk}/duck.png'); print(sk, idle.size, (tw,th))
