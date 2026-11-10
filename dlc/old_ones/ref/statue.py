import numpy as np
from PIL import Image, ImageDraw, ImageFilter
src='dlc/old_ones/ref/city_of_fangs_v1.png'
im=Image.open(src).convert('RGB'); A=np.asarray(im).copy()
OX,OY=1600,60
old=[(50,445),(50,250),(55,200),(58,95),(100,45),(215,30),(300,85),(400,140),(450,200),(462,250),(462,445)]
L=[(40,445),(40,262),(60,258),(62,215),(85,170),(140,120),(200,80),(245,40),(265,22),(300,30),(350,40),(395,65),(412,85),(405,130),(395,165),(420,195),(460,230),(480,255),(480,262),(480,445)]   # 497: the whole of the near brazier, so the seam falls on plain floor
new=[(525-u,v) for u,v in L]
W,H=im.size
m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m)
for poly in (old,new): d.polygon([(x+OX,y+OY) for x,y in poly],fill=255)
m=m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
M=np.asarray(m).astype(float)[...,None]/255
# mirrored source: target x <- original 2885-x
mir=A.copy(); xs=np.arange(1560,2180); mir[:,xs]=A[:,2885-xs]
out=(A*(1-M)+mir*M).clip(0,255).astype(np.uint8)
Image.fromarray(out).save('/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad/city_statue.png')
Image.fromarray(out).crop((1560,40,2160,560)).save('/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad/statue_check.png')
