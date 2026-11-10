from PIL import Image, ImageDraw
W,H=2576,1024
P=[(470,640),(520,560),(600,500),(820,495),(2090,495),(2110,465),(2470,465),(2495,540),(2400,640),(2330,730),(2250,770),(2180,790),(2100,820),(1560,830),(1500,800),(1170,790),(1100,860),(640,850),(300,850),(200,830),(170,800),(360,700)]
STAIRS=[(60,395),(255,385),(280,430),(340,470),(420,530),(470,570),(520,615),(520,680),(300,660),(270,650),(210,600),(160,540),(110,480),(65,430)]   # the Old Stairs: you arrive at the top
BLOCK=[[(1800,560),(1900,520),(2330,520),(2340,705),(1800,705)]]   # the survey camp: tent, table, crates, tripods
m=Image.new('RGB',(W,H),(0,0,0)); d=ImageDraw.Draw(m)
d.polygon(P,fill=(255,255,84)); d.polygon(STAIRS,fill=(255,255,84))
for b in BLOCK: d.polygon(b,fill=(0,0,0))
m.save('dlc/old_ones/art/city_of_fangs_walk.png')
im=Image.open('dlc/old_ones/art/city_of_fangs.png').convert('RGB')
ov=Image.blend(im,m,0.35); ov.resize((1288,512)).save('/private/tmp/claude-501/-Users-andreicraciun--claude-spares-spare-Qb4WPM/fa5d8e4d-470d-4312-9d84-2c5145f9b3bd/scratchpad/mask_prev.png')
