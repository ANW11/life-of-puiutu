# Walk mask for the Avenue of Fangs (2304x1024, the user's prototype + its extension): the floor from
# under the back row of braziers down to the rubble, minus the front row's pedestals and the fallen head.
from PIL import Image, ImageDraw
W,H=2304,1024
m=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(m)
d.polygon([(0,560),(1880,560),(1930,590),(2300,590),(2300,850),(1600,850),(1530,830),(1260,830),(1220,860),(300,860),(260,830),(0,830)],fill=(255,255,84))
for x in [235,770,1300,1885]: d.rectangle((x-48,745,x+48,815),fill=(0,0,0))
m.save('dlc/old_ones/art/fang_avenue_walk.png')
im=Image.open('dlc/old_ones/art/fang_avenue.png').convert('RGB')
Image.blend(im,m,0.3).resize((1152,512)).save('/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad/avmask.png')
