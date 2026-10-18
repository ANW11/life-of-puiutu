# Life of Puiutu: remove stray specks from the bird frames (mobs/birds/) — bits of old motion
# lines left floating by the beak and over the head. Keeps the bird (the biggest connected
# shape) and anything big enough to be part of it; drops small islands not touching it.
import sys, glob
from PIL import Image
from collections import deque
def clean(path, keep_frac=0.03, solid=110):
    im=Image.open(path).convert('RGBA'); w,h=im.size; px=im.load()
    # the shapes are found on solid pixels only: a faint anti-aliased halo would otherwise glue a
    # stray speck to the bird
    lab=[[0]*w for _ in range(h)]; comps=[]
    for y in range(h):
        for x in range(w):
            if px[x,y][3]>solid and not lab[y][x]:
                n=len(comps)+1; q=deque([(x,y)]); lab[y][x]=n; pts=[]
                while q:
                    a,b=q.popleft(); pts.append((a,b))
                    for dx in(-1,0,1):
                        for dy in(-1,0,1):
                            xx,yy=a+dx,b+dy
                            if 0<=xx<w and 0<=yy<h and not lab[yy][xx] and px[xx,yy][3]>solid: lab[yy][xx]=n; q.append((xx,yy))
                comps.append(pts)
    if not comps: return 0
    big=max(len(c) for c in comps); gone=0; keep=set()
    for c in comps:
        if len(c)<big*keep_frac:
            for a,b in c: px[a,b]=(0,0,0,0); gone+=1
        else: keep.update(c)
    # the faint halo stays only where it hugs a kept shape (within 2px); elsewhere it is dust
    for y in range(h):
        for x in range(w):
            a=px[x,y][3]
            if 0<a<=solid and not any((x+dx,y+dy) in keep for dx in range(-2,3) for dy in range(-2,3)):
                px[x,y]=(0,0,0,0); gone+=1
    im.save(path); return gone
# The old motion lines by the beak are neutral grey (r=g=b) and start at the bird's edge, so they
# are glued to it. Walk in from the outside through neutral-grey pixels: whatever small patch that
# reaches is a streak, not feathers (the pigeons' feathers are tinted, never flat grey).
def streaks(path, maxsize=600):
    im=Image.open(path).convert('RGBA'); w,h=im.size; px=im.load()
    def grey(x,y):
        r,g,b,a=px[x,y]; return a>0 and max(r,g,b)-min(r,g,b)<=8 and 110<=max(r,g,b)<=215
    seen=set(); gone=0
    for y in range(h):
        for x in range(w):
            if (x,y) in seen or not grey(x,y): continue
            if not any(0<=x+dx<w and 0<=y+dy<h and px[x+dx,y+dy][3]==0 for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): continue
            q=deque([(x,y)]); seen.add((x,y)); patch=[]
            while q:
                a,b=q.popleft(); patch.append((a,b))
                for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                    xx,yy=a+dx,b+dy
                    if 0<=xx<w and 0<=yy<h and (xx,yy) not in seen and grey(xx,yy): seen.add((xx,yy)); q.append((xx,yy))
            if len(patch)<=maxsize:
                for a,b in patch: px[a,b]=(0,0,0,0); gone+=1
    im.save(path); return gone
if len(sys.argv)>2 and sys.argv[2]=='streaks':
    for f in sorted(glob.glob(sys.argv[1]+'/pigeon_v[1259]_*.png')):
        n=streaks(f)
        if n: print(f.split('/')[-1], 'streak px', n)
    sys.exit()
for f in sorted(glob.glob(sys.argv[1]+'/*.png')):
    n=clean(f)
    if n: print(f.split('/')[-1], 'removed', n)
