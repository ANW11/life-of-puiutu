# Life of Puiutu: build the parchment world map. usage: python3 gen_parchment_map.py <work dir> <repo root>
# <work dir>/mapgen needs parchment_clean.png (ChatGPT drawing, no banners), parchment_v1.png (colour
# reference), skel_shot_cut.png and lib_banner_cut.png; then crop to 16:9 into maps/worldmap_parchment.png.
# the parchment world map: ChatGPT's clean drawing, in the first draft's colours, with the game's
# own Border War banners and the beach's own whale skeleton laid on top
import sys
import numpy as np
from PIL import Image, ImageCms, ImageFilter
SP=sys.argv[1]; ROOT=sys.argv[2]
srgb=ImageCms.createProfile('sRGB'); lab=ImageCms.createProfile('LAB')
to_lab=ImageCms.buildTransform(srgb,lab,'RGB','LAB'); to_rgb=ImageCms.buildTransform(lab,srgb,'LAB','RGB')
def L(img):
    a=np.asarray(ImageCms.applyTransform(img.convert('RGB'),to_lab))
    return np.dstack([a[...,0].astype(np.float32), a[...,1:].view(np.int8).astype(np.float32)])
def RGB(x):
    l=x[...,0].clip(0,255).astype(np.uint8); ab=x[...,1:].clip(-128,127).astype(np.int8).view(np.uint8)
    return ImageCms.applyTransform(Image.frombytes('LAB',(l.shape[1],l.shape[0]),np.dstack([l,ab]).tobytes()),to_rgb)
# 1) colours of the first draft
ref=L(Image.open(SP+'/mapgen/parchment_v1.png')); src=L(Image.open(SP+'/mapgen/parchment_clean.png'))
for c in range(3): src[...,c]=(src[...,c]-src[...,c].mean())/(src[...,c].std()+1e-6)*ref[...,c].std()+ref[...,c].mean()
out=RGB(src).convert('RGBA')
# clear the stones on the lower right of the beach: the skeleton lies there
arr=np.asarray(out.convert('RGB')).astype(np.float32)
sx0,sy0,sx1,sy1=384,402,462,474
reg=arr[sy0:sy1,sx0:sx1]; sandc=np.median(reg.reshape(-1,3),0)
st=np.abs(reg-sandc).sum(-1)>40
st=np.asarray(Image.fromarray((st*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)))>0
hole=np.zeros(arr.shape[:2],bool); hole[sy0:sy1,sx0:sx1]=st
hole[:,460:]&=False
fill=arr.copy(); fill[hole]=sandc
for _ in range(500):
    avg=(np.roll(fill,1,0)+np.roll(fill,-1,0)+np.roll(fill,1,1)+np.roll(fill,-1,1))/4; fill[hole]=avg[hole]
rng=np.random.default_rng(7); fill[hole]+=rng.normal(0,3,(hole.sum(),1))
out=Image.fromarray(fill.clip(0,255).astype(np.uint8)).convert('RGBA')
# 2) the whale skeleton from the beach, toned to this sand
sk=Image.open(SP+'/mapgen/skel_shot_cut.png').convert('RGBA')
# thicken the dark outline before shrinking 3x, or it vanishes at map size
rgb0=sk.convert('RGB'); thick=rgb0.filter(ImageFilter.MinFilter(3))
lum=np.asarray(rgb0.convert('L')).astype(np.float32); dk=(lum<150)[...,None]
mix=np.where(np.asarray(Image.fromarray(dk[...,0].astype(np.uint8)*255).filter(ImageFilter.MaxFilter(3)))[...,None]>0, np.asarray(thick), np.asarray(rgb0))
sk=Image.fromarray(np.dstack([mix,np.asarray(sk.getchannel('A'))]).astype(np.uint8))
tw=82; sk=sk.resize((tw,round(sk.height*tw/sk.width)),Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,120,2))
X,Y=388,414
a=np.asarray(sk).astype(np.float32); al=a[...,3:4]/255
here=np.asarray(out.convert('RGB').crop((X,Y,X+sk.width,Y+sk.height))).astype(np.float32)
sand_map=np.median(here.reshape(-1,3),0)
sand_shot=np.array([197,161,112],np.float32)                       # the beach sand in the screenshot
# all bone white: the pale parts become bone, the dark lines stay ink, and the sand that came
# along with the cut (warm, saturated) drops out instead of tinting the skull brown
lumk=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])
mxk=a[...,:3].max(-1); mnk=a[...,:3].min(-1); satk=(mxk-mnk)/np.maximum(mxk,1)
t=np.clip((lumk-95)/(175-95),0,1)[...,None]                          # 0 = outline, 1 = bone
BONE=np.array([246,240,226],np.float32); LINE=np.array([62,44,28],np.float32)
rgb=LINE+(BONE-LINE)*t
sandy=(satk>0.39)&(lumk>120)&(lumk<200)                              # the sand halo
a[...,3]=np.where(sandy,0,a[...,3])
out.alpha_composite(Image.fromarray(np.dstack([rgb.clip(0,255),a[...,3:]]).astype(np.uint8)),(X,Y))
# the map's own sepia (sampled from it): dark ink to pale parchment
def sepia(img, k=1.0):
    a=np.asarray(img.convert('RGBA')).astype(np.float32)
    l=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])/255.0
    l=np.clip((l-0.5)*1.45+0.55,0,1)[...,None]
    dark=np.array([52,32,14],np.float32); light=np.array([244,222,176],np.float32)
    tone=dark+(light-dark)*l
    rgb=a[...,:3]*(1-k)+tone*k
    return Image.fromarray(np.dstack([rgb,a[...,3:]]).clip(0,255).astype(np.uint8))
# 3) the Border War banners, in the map's sepia
def banner(path, cx, top, h):
    b=Image.open(path).convert('RGBA'); b=b.crop(b.getbbox())
    b=sepia(b.resize((round(b.width*h/b.height),h),Image.LANCZOS))
    sh=Image.new('RGBA',b.size,(0,0,0,0)); sh.putalpha(b.getchannel('A').point(lambda v:int(v*0.35)))   # a soft shadow on the wall
    sh=sh.filter(ImageFilter.GaussianBlur(2))
    out.alpha_composite(sh,(cx-b.width//2+3,top+3)); out.alpha_composite(b,(cx-b.width//2,top))
CAT=ROOT+'/rts/menu/Royal Blue Paw Heraldic Banner.png'; RAT=ROOT+'/rts/menu/Tattered Rat Skull War Banner.png'
banner(CAT,1290,128,132)      # over the royal castle's gate
banner(CAT, 894,452, 92)      # on the town hall, under the clock
banner(RAT,1466,388,170)      # on the rat fortress
# the wizard's banner from the library, over the castle's moon banner: drawn crisp at its size, and
# only the bit of the old banner it does not cover (the point of its swallowtail) is filled with wall
from PIL import ImageDraw
lb=sepia(Image.open(SP+'/mapgen/lib_banner_cut.png').convert('RGBA'))
h=66; lb=lb.resize((round(lb.width*h/lb.height),h),Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.0,140,1))
LX,LY=303-lb.width//2,152
old=Image.new('L',out.size,0); ImageDraw.Draw(old).polygon([(280,150),(327,150),(327,207),(303,223),(280,207)],fill=255)
cover=Image.new('L',out.size,0); cover.paste(lb.getchannel('A'),(LX,LY))
hole=(np.asarray(old)>0)&(np.asarray(cover)<200)
arr=np.asarray(out.convert('RGB')).astype(np.float32)
fill=arr.copy(); fill[hole]=arr[226:232,284:324].reshape(-1,3).mean(0)
for _ in range(300):
    avg=(np.roll(fill,1,0)+np.roll(fill,-1,0)+np.roll(fill,1,1)+np.roll(fill,-1,1))/4; fill[hole]=avg[hole]
out=Image.fromarray(fill.clip(0,255).astype(np.uint8)).convert('RGBA')
out.alpha_composite(lb,(LX,LY))
out.convert('RGB').save(SP+'/mapgen/parchment_final.png'); print('ok')
