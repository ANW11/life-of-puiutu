# Portrait DLC poster (foreshadowing: the Old Ones as shadows over the city) for the investor deck.
# Art: dlc_old_ones_shadows_dark.png (from darken_shadows.py), title: dlc_old_ones_title.png (pixel-art title,
# black keyed out), plus the game logo. Written at 2x, pixel-doubled.
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(os.path.dirname(HERE))
F=os.path.join(ROOT,'marketing/reels/fonts')
im=Image.open(os.path.join(HERE,'dlc_old_ones_shadows_dark.png')).convert('RGBA'); W,H=im.size
logo=Image.open(os.path.join(ROOT,'site/art/logo.webp')).convert('RGBA')
title=Image.open(os.path.join(HERE,'dlc_old_ones_title.png')).convert('RGBA')
lw=250; lg=logo.resize((lw,int(logo.height*lw/logo.width)),Image.LANCZOS)
im.alpha_composite(lg,((W-lw)//2,14))
tw=760; tt=title.resize((tw,int(title.height*tw/title.width)),Image.LANCZOS)
# a soft violet glow behind the title so it lifts off the dark
gl=Image.new('RGBA',(W,H),(0,0,0,0)); sil=Image.new('RGBA',tt.size,(150,60,220,150)); sil.putalpha(tt.getchannel('A').point(lambda v:int(v*0.6)))
gl.alpha_composite(sil,((W-tw)//2,14+lg.height-6)); im.alpha_composite(gl.filter(ImageFilter.GaussianBlur(16)))
ty=14+lg.height-6; im.alpha_composite(tt,((W-tw)//2,ty))
d=ImageDraw.Draw(im); tag=ImageFont.truetype(os.path.join(F,'Jersey10-Regular.ttf'),26); t='IN DEVELOPMENT'
w=d.textlength(t,font=tag); bx,by=(W-w-24)/2,ty+tt.height+6
d.rounded_rectangle((bx,by,bx+w+24,by+32),10,fill=(20,12,28,210),outline=(255,231,176,140),width=2)
d.text((bx+12,by+2),t,font=tag,fill=(255,231,176))
im.convert('RGB').resize((W*2,H*2),Image.NEAREST).save(os.path.join(HERE,'dlc_old_ones_shadows_poster.png'))
print('ok')
