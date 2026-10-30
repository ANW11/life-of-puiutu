# Rebuild ui/forge/px/*.png (NomNom's wares on one 64px pixel grid). Run from the project root: python3 gen_forge_px.py
# Bring every counter item to ONE pixel grid: trim, rotate if asked, downscale so the longest
# side is GRID-2 px, hard alpha, a small palette, then pad onto a GRIDxGRID canvas, bottom-aligned
# (so they all stand on the counter). Shown with image-rendering:pixelated, every item ends up
# with the same on-screen pixel size.
from PIL import Image
import numpy as np, os, sys
GRID=64
SRC={
 'broth':'ui/forge/broth.png','tonic':'rts/art/item_potion.png','moonmilk':'rts/art/item_mana.png',
 'fury':'ui/forge/fury.png','ironfur':'ui/forge/ironfur.png','lucky':'ui/forge/lucky.png','phoenix':'ui/forge/phoenix.png',
 'forge_claws':'ui/forge/claws.png','forge_collar':'ui/forge/collar.png','forge_bell':'ui/forge/bell.png',
 'trick_dbljump':'ui/forge/dbljump.png','trick_speed':'ui/forge/speed.png',
 'charm_carrot':'rts/art/item_carrot.png','charm_bell':'rts/art/item_bell.png','charm_mouse':'rts/art/item_mouse.png',
 'charm_heart':'ui/forge/heart_chain_hi.png' if os.path.exists('ui/forge/heart_chain_hi.png') else 'rts/art/item_heart.png','charm_goldbanana':'ui/forge/goldbanana_hi.png',
 # the beach: Old Shelly's fossils and beachcombing finds
 **{'fossil_'+n:'ui/beach/'+n+'.png' for n in ['ammonite','sharktooth','fishbones','crabclaw','trilobite','whalerib','serpent','catskull']},
 **{'beach_'+n:'ui/beach/'+n+'.png' for n in ['conch','scallop','snail','starfish','pearl','crab','bottle']},
 # the Merchant at the castle gate
 'mixedherb':'ui/tailor/items/mixedherb.png','goldegg':'ui/tailor/items/goldegg.png',
 'merch_yellowherb':'ui/tailor/items/yellowherb.png','merch_blueherb':'ui/tailor/items/blueherb.png',
 'merch_case':'ui/tailor/items/case.png','charm_keychain':'ui/tailor/items/keychain.png',
}
def trim(im):
    a=np.array(im)[...,3]; ys,xs=np.where(a>20); return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def lie_flat(im):
    # rotate so the long axis is horizontal (principal axis of the opaque pixels)
    a=np.array(im)[...,3]>40; ys,xs=np.nonzero(a); xs=xs-xs.mean(); ys=ys-ys.mean()
    cov=np.cov(np.vstack([xs,ys])); w,v=np.linalg.eigh(cov); vx,vy=v[:,1]
    ang=np.degrees(np.arctan2(vy,vx))
    out=im.rotate(ang,resample=Image.BICUBIC,expand=True)
    return out
# items drawn bigger than the rest (lying-flat things that would otherwise shrink to a speck). Their
# grid grows by the same factor, so their pixels stay the same size on screen as everyone else's.
SIZE={'charm_heart':1.6}
# turned so they lie naturally on a shelf (degrees, counter-clockwise)
ROT={'fossil_trilobite':-55.4,'fossil_sharktooth':90}   # trilobite: long axis level with the plank, head to the right
os.makedirs('ui/forge/px',exist_ok=True)
META={}
def ground_sink(tile):
    # The row an item actually rests on: the lowest row (in the bottom third) that is at least half as
    # wide as the widest row there. A bell's ribbon tail or a mouse's tail hang lower, but they are
    # thin — the rim / the body is what touches the blanket. Returns how far below that row the
    # picture still reaches, as a fraction of the tile, so the game can sink it by that much.
    a=np.array(tile)[...,3]>0; rows=np.where(a.any(1))[0]; t,b=rows.min(),rows.max()
    band=range(b,max(t,b-int((b-t)*0.35))-1,-1)
    span=lambda y:(np.ptp(np.where(a[y])[0])+1) if a[y].any() else 0
    mx=max(span(y) for y in band)
    g=next(y for y in band if span(y)>=0.5*mx)
    return round((b-g)/tile.height,4)
for key,src in SRC.items():
    if not os.path.exists(src): print('missing',src); continue
    im=trim(Image.open(src).convert('RGBA'))
    if key in ROT: im=trim(im.rotate(ROT[key],resample=Image.NEAREST,expand=True))
    if key=='charm_carrot':
        im=trim(lie_flat(im))
        if np.array(im)[:, :im.width//3, 3].sum() < np.array(im)[:, -im.width//3:, 3].sum(): pass
    G=round(GRID*SIZE.get(key,1)); n=G-2; s=n/max(im.size)
    sm=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
    a=np.array(sm); alpha=a[...,3]
    rgb=Image.fromarray(a[...,:3]).quantize(colors=40,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
    hard=alpha>110
    # drop specks: opaque pixels with at most one opaque neighbour (magenta-fringe leftovers that
    # float under an item and throw off where it rests)
    for _ in range(2):
        pad=np.pad(hard,1); nb=sum(np.roll(np.roll(pad,dy,0),dx,1) for dy in (-1,0,1) for dx in (-1,0,1) if dy or dx)[1:-1,1:-1]
        hard=hard&(nb>=2)
    # …and any detached island smaller than 3% of the item (a stray chip floating beside a shell,
    # a dot under a fossil) — keep only what is part of the drawing
    lab=np.zeros(hard.shape,int); comps=[]; k=0
    for y0,x0 in zip(*np.nonzero(hard)):
        if lab[y0,x0]: continue
        k+=1; st=[(y0,x0)]; lab[y0,x0]=k; n=0
        while st:
            y,x=st.pop(); n+=1
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx=y+dy,x+dx
                    if 0<=ny<hard.shape[0] and 0<=nx<hard.shape[1] and hard[ny,nx] and not lab[ny,nx]: lab[ny,nx]=k; st.append((ny,nx))
        comps.append(n)
    if comps:
        big=max(comps); keep=[i+1 for i,n in enumerate(comps) if n>=max(6,0.03*big)]
        hard=np.isin(lab,keep)
    out=np.dstack([np.array(rgb),np.where(hard,255,0).astype('uint8')])
    tile=Image.new('RGBA',(G,G),(0,0,0,0)); t=Image.fromarray(out)
    tile.paste(t,((G-t.width)//2,G-t.height),t)          # flush with the bottom: the base touches the ground
    tile.save('ui/forge/px/'+key+'.png'); META[key]={'sink':ground_sink(tile),'size':SIZE.get(key,1)}; print(key,t.size,'sink',META[key])
# hand the sink values to the game (between the PXMETA markers in life_of_puiutu_game.html)
import json, re
H='life_of_puiutu_game.html'; h=open(H,encoding='utf-8').read()
h=re.sub(r'/\*PXMETA\*/.*?/\*PXMETA\*/', '/*PXMETA*/'+json.dumps(META,separators=(',',':'))+'/*PXMETA*/', h, flags=re.S)
open(H,'w',encoding='utf-8').write(h)
