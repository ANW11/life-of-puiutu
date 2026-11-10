# The DLC title screen's title: the game logo above the DLC's pixel-art title (marketing/investors/dlc_old_ones_title.png).
import os
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
logo=Image.open(os.path.join(ROOT,'site/art/logo.webp')).convert('RGBA')
t=Image.open(os.path.join(ROOT,'marketing/investors/dlc_old_ones_title.png')).convert('RGBA')
lw=1050; lg=logo.resize((lw,int(logo.height*lw/logo.width)),Image.LANCZOS)
W=t.width; H=lg.height+t.height-40
c=Image.new('RGBA',(W,H),(0,0,0,0)); c.alpha_composite(lg,((W-lw)//2,0)); c.alpha_composite(t,(0,lg.height-40))
c.resize((W//2,H//2),Image.LANCZOS).save(os.path.join(ROOT,'dlc/old_ones/art/menu_title.png')); print('ok')
