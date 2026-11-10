# Walk mask for the Avenue of Fangs: the paved floor between the back row of braziers and the rubble,
# minus the front row of brazier pedestals and the fallen sphinx head at the far right.
from PIL import Image, ImageDraw
W,H=3072,1024
m=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(m)
d.polygon([(0,505),(2420,505),(2560,560),(2960,560),(3060,600),(3060,830),(0,830)],fill=(255,255,84))
for x in [120,430,770,1080,1430,1690,1980,2290,2620,2940]:      # the front row: their bases block
    d.rectangle((x-42,690,x+42,745),fill=(0,0,0))
m.save('dlc/old_ones/art/fang_avenue_walk.png')
im=Image.open('dlc/old_ones/art/fang_avenue.png').convert('RGB')
Image.blend(im,m,0.3).resize((1536,512)).save('/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad/avmask.png')
