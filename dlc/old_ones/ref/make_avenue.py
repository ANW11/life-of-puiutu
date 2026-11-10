# The Avenue of Fangs: two ChatGPT halves side by side (the right one continues the left one's edge,
# no overlap), the seam softened over a few pixels.
import numpy as np
from PIL import Image, ImageFilter
L=Image.open('dlc/old_ones/ref/avenue_left_src.png').convert('RGB'); R=Image.open('dlc/old_ones/ref/avenue_right_src.png').convert('RGB')
W=L.width+R.width; out=Image.new('RGB',(W,1024)); out.paste(L,(0,0)); out.paste(R,(L.width,0))
band=out.crop((L.width-10,0,L.width+10,1024)).filter(ImageFilter.BoxBlur(3)); out.paste(band,(L.width-10,0))
out.save('dlc/old_ones/art/fang_avenue.png')
