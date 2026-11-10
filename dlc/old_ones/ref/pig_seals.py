# The bank symbol on the tent and the two crates becomes the pig Organization's seal (ChatGPT edit of
# the crop x1040..2576); only the three emblems are pasted back.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
P='dlc/old_ones/art/city_of_fangs.png'; OX=1040
cur=Image.open(P).convert('RGB'); g=Image.open('dlc/old_ones/ref/tent_seal_src.png').convert('RGB')
C=np.asarray(cur.crop((OX,0,OX+1536,1024))).astype(int); G=np.asarray(g).astype(int)
d=(np.abs(C-G).sum(2)>45).astype(np.uint8)*255
box=Image.new('L',g.size,0); bd=ImageDraw.Draw(box)
for b in [(1110,495,1245,605),(1070,650,1135,712),(1190,625,1255,690)]: bd.ellipse(b,fill=255)
m=Image.fromarray(np.minimum(np.asarray(Image.fromarray(d).filter(ImageFilter.MaxFilter(9))),np.asarray(box))).filter(ImageFilter.GaussianBlur(1.5))
full=Image.new('L',cur.size,0); full.paste(m,(OX,0)); src=cur.copy(); src.paste(g,(OX,0))
Image.composite(src,cur,full).save(P)
