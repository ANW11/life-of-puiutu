# Rebuilds site/art from the game's own files (and the ChatGPT key art in site/art_src).
# Run from anywhere: python3 site/build_assets.py
import os
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(R, 'site', 'art')
os.makedirs(A, exist_ok=True)


def put(src, name, maxw=None, q=88):
    im = Image.open(os.path.join(R, src))
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if maxw and max(im.size) > maxw:
        im.thumbnail((maxw, maxw), Image.LANCZOS)
    im.save(os.path.join(A, name), 'WEBP', quality=q, method=6)


# characters and props
for src, name in [
    ('mobs/lion/idle.png', 'lion'), ('mobs/ratking/risen.png', 'ratking'),
    
    ('npcs/sprite_nomnom.png', 'nomnom'), ('fishing/puiutu_reel.png', 'fisher'), ('ui/purple_crystal.png', 'crystal'),
    ('ui/evidence/seal_union.png', 'seal_union'), ('ui/evidence/seal_rats.png', 'seal_rats'), ('ui/evidence/seal_pigs.png', 'seal_pigs'),
]:
    put(src, name + '.webp', 600)
put('fishing/sprite_parrotfish.png', 'parrotfish.webp', 140, q=90)

# logo: crop to its visible pixels
logo = Image.open(os.path.join(R, 'ui/title_pixel.png')).convert('RGBA')
logo = logo.crop(logo.getbbox()); logo.thumbnail((1000, 1000), Image.LANCZOS)
logo.save(os.path.join(A, 'logo.webp'), 'WEBP', quality=92)
Image.open(os.path.join(R, 'ui/favicon-32.png')).save(os.path.join(A, 'favicon.png'))
Image.open(os.path.join(R, 'ui/favicon-32.png')).save(os.path.join(R, 'site', 'favicon.ico'))

# all 13 skin cards
for c in ['calico', 'abyssinian', 'siamese', 'british', 'mainecoon', 'angora', 'sphynx', 'russianblue',
          'american', 'goldbengal', 'silvbengal', 'scottish', 'ragdoll']:
    put(f'skins/cards/skin_{c}_big.webp', f'skin_{c}.webp', 640)

# world gallery: only maps the game currently loads
for src, name in [
    ('maps/city_v2.png', 'w_city'), ('maps/tower_garden_v2.png', 'w_garden'), ('maps/beach_v2.png', 'w_beach'),
    ('maps/library_v3.png', 'w_library'), ('maps/castleentrance.png', 'w_castle'), ('maps/slum2_v2.png', 'w_slum'),
    ('maps/sebybossfight.png', 'w_seby'), ('maps/throneroom_catking.png', 'w_throne'), ('maps/ratkingroom.png', 'w_ratking'),
    ('maps/abyss.png', 'w_abyss'),
]:
    put(src, name + '.webp', 1800, q=82)
put('ui/menu_sunset.jpg', 'sunset.webp', 1920, q=82)

# ChatGPT key art: hero.png (shadow kings poster), secret.png (the lab under the bank)
for f in os.listdir(os.path.join(R, 'site', 'art_src')):
    put(os.path.join('site', 'art_src', f), os.path.splitext(f)[0] + '.webp', 2000, q=86)

# animated sprite sheets
for script in ['make_puiutu_crisp.py', 'make_coin_spin.py', 'make_walk_sheets.py', 'make_seby_sheet.py']:
    exec(open(os.path.join(R, 'site', script)).read())
print(len(os.listdir(A)), 'files in site/art')
