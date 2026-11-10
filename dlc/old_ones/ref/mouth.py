import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
st=Image.open('dlc/old_ones/ref/old_stairwell_cave_v1.png').convert('RGB')   # the stairwell before any city edit
city=Image.open('dlc/old_ones/art/old_city_reveal.png').convert('RGB')
view=city.crop((60,230,760,790))                   # the reveal's sphinx with the forge beside it (what you see next)
sc=300/view.height; view=view.resize((int(view.width*sc),360), Image.LANCZOS)
# far away: purple haze, a little darker, softer
v=np.asarray(view).astype(float); haze=np.array([92,44,150.])
yy=np.linspace(0,1,v.shape[0])[:,None,None]
k=0.30+0.15*(1-yy)                                   # more haze higher up (deeper into the cavern)
v=v*(1-k)+haze*k; v*=0.92
view=Image.fromarray(v.clip(0,255).astype(np.uint8))
layer=st.copy(); cx=1385                              # avenue centre lands in the middle of the arch
layer.paste(view,(1215, 660))   # far off through the arch
m=Image.new('L',st.size,0); d=ImageDraw.Draw(m)
d.polygon([(1232,935),(1232,770),(1262,712),(1322,688),(1420,684),(1500,700),(1536,708),(1536,935)],fill=255)
m=m.filter(ImageFilter.GaussianBlur(9))
# keep the stalactites on the arch and the purple stream at the bottom: fade the mask there
M=np.asarray(m).astype(float)
yy=np.arange(st.height)[:,None]
M*=np.clip((yy-700)/60,0,1)*np.clip((955-yy)/50,0,1)
out=Image.composite(layer,st,Image.fromarray(M.clip(0,255).astype(np.uint8)))
# a soft purple glow breathing out of the opening
o=np.asarray(out).astype(float); g=np.zeros(o.shape[:2]); Y,X=np.mgrid[0:st.height,0:st.width]
g=np.exp(-(((X-1390)/220)**2+((Y-860)/170)**2))*0.18
o=o+(np.array([150,70,230.])-o)*g[...,None]*0.6
Image.fromarray(o.clip(0,255).astype(np.uint8)).save('dlc/old_ones/art/old_stairwell.png')
Image.open('dlc/old_ones/art/old_stairwell.png').crop((1000,500,1536,1024)).save('/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad/mouth_check.png')
