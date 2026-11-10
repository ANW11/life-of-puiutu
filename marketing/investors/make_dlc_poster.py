# DLC poster for the investor deck: ChatGPT key art + the game logo + the DLC title.
# Writes a 3:2 poster and a 16:9 slide version, both at 2x (pixel-doubled, stays crisp).
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(os.path.dirname(HERE))
F=os.path.join(ROOT,'marketing/reels/fonts')
art=Image.open(os.path.join(HERE,'dlc_old_ones_keyart_raw.png')).convert('RGBA')
logo=Image.open(os.path.join(ROOT,'site/art/logo.webp')).convert('RGBA')

def text_outlined(d,xy,txt,font,fill,outline,ow):
    x,y=xy
    for dx in range(-ow,ow+1):
        for dy in range(-ow,ow+1):
            if dx*dx+dy*dy<=ow*ow: d.text((x+dx,y+dy),txt,font=font,fill=outline)
    d.text((x,y),txt,font=font,fill=fill)

def compose(base, top):
    im=base.copy(); W,H=im.size
    # soft dark corner so the title reads over the cave ceiling
    sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).ellipse((330,-260+top,1060,400+top),fill=150)
    sh=sh.filter(ImageFilter.GaussianBlur(70))
    im=Image.composite(Image.new('RGBA',(W,H),(12,6,20,255)),im,sh)
    d=ImageDraw.Draw(im)
    X0=470
    lw=380; lg=logo.resize((lw,int(logo.height*lw/logo.width)),Image.LANCZOS)
    im.alpha_composite(lg,(X0+(470-lw)//2,top+26))
    y=top+26+lg.height+4
    def cx(txt,font): return X0+(470-d.textlength(txt,font=font))/2
    big=ImageFont.truetype(os.path.join(F,'Silkscreen-Bold.ttf'),46)
    text_outlined(d,(cx('SHADOW OF',big),y),'SHADOW OF',big,(214,186,255),(26,10,40),4)
    text_outlined(d,(cx('THE OLD ONES',big),y+52),'THE OLD ONES',big,(214,186,255),(26,10,40),4)
    tag=ImageFont.truetype(os.path.join(F,'Jersey10-Regular.ttf'),34)
    t='FIRST DLC  ·  IN DEVELOPMENT'
    tw=d.textlength(t,font=tag); bx,by=X0+(470-tw-28)/2,y+120
    d.rounded_rectangle((bx,by,bx+tw+28,by+42),12,fill=(20,12,28,200),outline=(255,231,176,160),width=2)
    d.text((bx+14,by+4),t,font=tag,fill=(255,231,176))
    return im

W,H=art.size
poster=compose(art,0)
poster.convert('RGB').resize((W*2,H*2),Image.NEAREST).save(os.path.join(HERE,'dlc_old_ones_poster.png'))
y0=120; slide=compose(art.crop((0,y0,W,y0+864)),0)
slide.convert('RGB').resize((W*2,864*2),Image.NEAREST).save(os.path.join(HERE,'dlc_old_ones_slide_16x9.png'))
print('ok')
