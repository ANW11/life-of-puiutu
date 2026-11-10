# The open vault: the ORIGINAL frame, rail and wall, with the generated tunnel + stairs inside the
# bronze ring only. The generated interior is sheared so its step edges run parallel to the wall and
# the bronze rail (they slope down to the right, ~K), and dropped so its own rail hides under ours.
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
S='/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad'
K=float(sys.argv[1]) if len(sys.argv)>1 else 0.22
o=Image.open(S+'/vault_crop.png').convert('RGB'); g0=Image.open(S+'/gen_rs.png').convert('RGB')
cx=452
# shear: a pixel at x moves down by K*(x-cx); inverse map for Image.transform (AFFINE takes output->input)
g=g0.transform(g0.size, Image.AFFINE, (1,0,0, -K,1,K*cx), resample=Image.NEAREST)
g=Image.fromarray(np.roll(np.asarray(g),34,axis=0))
m=Image.new('L',o.size,0); d=ImageDraw.Draw(m)
top,rx,cy=222,158,405
d.ellipse((cx-rx,top,cx+rx,cy+(cy-top)),fill=255)
d.polygon([(cx-rx,cy),(cx+rx,cy),(cx+rx,756),(cx-rx,652)],fill=255)
m=m.filter(ImageFilter.GaussianBlur(1.5))
comp=Image.composite(g,o,m)
full=Image.open('maps/library_lower_v2.png').convert('RGB'); full.paste(comp,(2880,0))
full.save('dlc/old_ones/art/library_lower_open.png', optimize=True)
full.crop((2880+150,100,2880+736,860)).resize((440,570)).save(S+'/vault_check.png')
