# Rebuild dlc/old_ones/art/city_of_fangs.png from its sources, step by step:
# v1 (stitched halves) -> right sphinx = mirror of the left one -> plain floor (no mosaics)
# -> the avenue's end border back -> the tent back (inside its outline only) -> no banner
import numpy as np, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter
S='/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad'
R='dlc/old_ones/ref/'
v1=Image.open(R+'city_of_fangs_v1.png').convert('RGB')
cur=Image.open(S+'/city_statue.png').convert('RGB')                 # step 1 (statue.py)
# step 2: the floor without mosaics (ChatGPT edit of the crop x700..2236)
orig=np.asarray(v1.crop((700,0,2236,1024))).astype(int)
g=Image.open(S+'/incoming/floor_clean_0_1794310244.png').convert('RGB'); G=np.asarray(g).astype(int)
d=(np.abs(orig-G).sum(2)>60).astype(np.uint8)*255
m=Image.fromarray(d).filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.MinFilter(9))
box=Image.new('L',g.size,0); ImageDraw.Draw(box).polygon([(60,505),(1440,505),(1440,540),(1090,540),(1090,720),(1440,720),(1440,860),(60,860)],fill=255)
mm=Image.fromarray(np.minimum(np.asarray(m),np.asarray(box))).filter(ImageFilter.GaussianBlur(5))
fm=Image.new('L',cur.size,0); fm.paste(mm,(700,0)); fp=cur.copy(); fp.paste(g,(700,0))
cur=Image.composite(fp,cur,fm)
# step 3: the avenue and its end border as they were
m=Image.new('L',cur.size,0); ImageDraw.Draw(m).rectangle((1105,380,1645,514),fill=255)
cur=Image.composite(v1,cur,m.filter(ImageFilter.GaussianBlur(3)))
# step 4: the tent, inside its outline only (the mirror paste had covered its tip)
m=Image.new('L',cur.size,0); ImageDraw.Draw(m).polygon([(2108,436),(2122,440),(2345,540),(2345,615),(1975,615),(1985,565),(2092,448)],fill=255)
C=np.asarray(cur).astype(int); V=np.asarray(v1).astype(int)
M=np.asarray(m.filter(ImageFilter.GaussianBlur(1.2))).astype(float)*(np.abs(C-V).sum(2)>30)
cur=Image.composite(v1,cur,Image.fromarray(M.clip(0,255).astype(np.uint8)))
# step 5: no banner on the pillar left of the avenue (ChatGPT edit of the same crop)
nb=Image.open(R+'map_nobanner_0_1794310658.png').convert('RGB')
m=Image.new('L',cur.size,0); ImageDraw.Draw(m).rectangle((1255,62,1332,238),fill=255)
p=cur.copy(); p.paste(nb,(700,0)); cur=Image.composite(p,cur,m.filter(ImageFilter.GaussianBlur(3)))
cur.save('dlc/old_ones/art/city_of_fangs.png')
cur.crop((1900,300,2140,540)).resize((480,480),Image.NEAREST).save(S+'/ped_fix.png')
cur.crop((1180,40,1420,360)).save(S+'/b2_fix.png')
cur.resize((1288,512)).save(S+'/city_full_prev.png')
