#!/usr/bin/env python3
"""Build the web version of Life of Puiutu for Cloudflare Pages.

    python3 build_web.py            # writes web_build/
    python3 build_web.py --demo     # writes web_build_demo/: the website demo (see DEMO in the game)
    python3 build_web.py --dlc old_ones   # also ship a DLC (dlc/old_ones/); repeat --dlc for more
    npx wrangler pages deploy web_build --project-name puiutu

What it does:
  - copies only what the game loads (no android-app, drafts, art proposals,
    backups, Python scripts or the multiplayer server)
  - life_of_puiutu_game.html becomes index.html, with multiplayer switched off
  - re-encodes PNG/JPEG art as WebP but keeps the original file names, so every
    path in the code (including the ones built at runtime) still works; browsers
    pick the image format from the file's bytes, not its extension.
    Masks and pixel art are encoded lossless so collision and pixel colors stay
    exact; everything else is lossy at high quality.
  - adds a _headers file for Cloudflare caching
  - DLCs (dlc/<id>/) are left out unless named with --dlc <id>; the page's PUIUTU_DLC_LIST is
    rewritten to exactly the DLCs in the build, so a build without one never even asks for it
  - with --demo: sets window.PUIUTU_DEMO, leaves out Border War and the maps of every area the
    demo does not reach, and minifies the game's scripts (no comments, short local names)
"""
import os, re, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

SRC = os.path.dirname(os.path.abspath(__file__))
DEMO = '--demo' in sys.argv
# DLCs to ship: --dlc <id> (repeatable). Never in the demo.
DLCS = [] if DEMO else [sys.argv[i + 1] for i, a in enumerate(sys.argv[:-1]) if a == '--dlc']
for _d in DLCS:
    if not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dlc', _d, _d + '.js')):
        sys.exit('no such DLC: dlc/%s/%s.js' % (_d, _d))
OUT = os.path.join(SRC, 'web_build_demo' if DEMO else 'web_build')
# the areas the demo reaches (keep in sync with DEMO_AREAS in the game)
DEMO_AREAS = {'garden', 'towergarden', 'library', 'beach', 'cave', 'sebyboss'}
# map files of locked areas that are named outside buildAreas() (masks with spaces in the name, …)
LOCKED_WORDS = ('ratking', 'sewer', 'slum', 'city', 'castle', 'throne', 'bank', 'abyss', 'ocean',
                'finalarena', 'library_lower', 'organization')
# the late bosses never appear in the demo: their sprites stay out of it, so nobody can dig them up
DEMO_SKIP_DIRS = {'mobs/catking', 'mobs/ratking', 'mobs/lion', 'mobs/MechBoar', 'mobs/mechboar_frames'}
TERSER = ['npx', '--yes', 'terser@5.31.0', '--ecma', '2020', '--compress', 'passes=2', '--mangle']

ASSET_DIRS = ['Phone', 'army', 'cart_game', 'circuit', 'colorsort', 'fishing',
              'fruitmerge', 'fx', 'gacha', 'maps', 'mobs', 'npcs', 'props',
              'puiutu', 'rts', 'skins', 'spells', 'ui']
SKIP_DIRS = {'skins/art proposals', 'spells/src',
             'fishing/_orig_backup', 'cart_game/gpt_refs'}
# folders whose loose files are all named literally in the code: keep only the referenced ones
LITERAL_ONLY = {'maps', 'skins'}
ASSET_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.webm', '.mp4',
             '.mp3', '.ogg', '.wav', '.m4a', '.json', '.js', '.css',
             '.ttf', '.otf', '.woff', '.woff2', '.svg'}
MIN_BYTES = 24 * 1024          # smaller images are not worth re-encoding
LIMIT = 25 * 1024 * 1024       # Cloudflare Pages max file size


def lossless(rel):
    n = rel.lower()
    return 'mask' in n or '/px/' in n or n.startswith('circuit/')


def area_maps(game):
    """maps/... files named inside each area of buildAreas(): {area: {file names}}"""
    body = game[game.index('function buildAreas(){'):]
    body = body[:body.index('\n}\n')]
    out, cur = {}, None
    for line in body.split('\n'):
        m = re.match(r'^    (\w+):\{', line)
        if m: cur = m.group(1)
        if cur:
            out.setdefault(cur, set()).update(re.findall(r'maps/([\w.-]+)', line))
    return out


def minify_scripts(html):
    """run every inline <script> of the page through terser"""
    def one(m):
        attrs, code = m.group(1), m.group(2)
        if 'src=' in attrs or not code.strip():
            return m.group(0)
        r = subprocess.run(TERSER, input=code, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit('terser failed: ' + r.stderr[:500])
        return '<script%s>%s</script>' % (attrs, r.stdout.strip())
    return re.sub(r'<script([^>]*)>(.*?)</script>', one, html, flags=re.S)


def main():
    texts = [open(os.path.join(SRC, f), encoding='utf-8').read()
             for f in ['life_of_puiutu_game.html', 'rts.html']]
    texts += [open(os.path.join(SRC, 'rts', f), encoding='utf-8').read()
              for f in os.listdir(os.path.join(SRC, 'rts')) if f.endswith('.js')]
    corpus = '\n'.join(texts)

    skip_maps = set()
    if DEMO:
        per = area_maps(texts[0])
        keep = set().union(*(per.get(a, set()) for a in DEMO_AREAS))
        skip_maps = set().union(*per.values()) - keep

    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    files = []
    for top in ASSET_DIRS:
        if DEMO and top == 'rts':
            continue
        for root, dirs, names in os.walk(os.path.join(SRC, top)):
            rel_root = os.path.relpath(root, SRC)
            dirs[:] = [d for d in dirs
                       if os.path.join(rel_root, d) not in SKIP_DIRS
                       and not (rel_root == 'maps' and d in skip_maps)
                       and not (DEMO and os.path.join(rel_root, d) in DEMO_SKIP_DIRS)
                       and not d.startswith(('_', '.')) and 'backup' not in d.lower()]
            for n in names:
                ext = os.path.splitext(n)[1].lower()
                if ext not in ASSET_EXT or n.startswith('.') or '.backup.' in n:
                    continue
                if rel_root in LITERAL_ONLY and n not in corpus:
                    continue
                if rel_root == 'maps' and (n in skip_maps or (DEMO and any(k in n.lower() for k in LOCKED_WORDS))):
                    continue
                files.append(os.path.join(rel_root, n))

    # a DLC ships its script and its art/, never its notes or reference pictures
    for d in DLCS:
        files.append(os.path.join('dlc', d, d + '.js'))
        for root, dirs, names in os.walk(os.path.join(SRC, 'dlc', d, 'art')):
            files += [os.path.relpath(os.path.join(root, n), SRC) for n in names
                      if os.path.splitext(n)[1].lower() in ASSET_EXT and not n.startswith('.')]

    def build(rel):
        src, dst = os.path.join(SRC, rel), os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        size = os.path.getsize(src)
        ext = os.path.splitext(rel)[1].lower()
        if ext in ('.png', '.jpg', '.jpeg') and size >= MIN_BYTES:
            tmp = dst + '.tmp.webp'
            args = (['-lossless', '-z', '6'] if lossless(rel)
                    else ['-q', '86', '-alpha_q', '100', '-m', '5', '-sharp_yuv'])
            r = subprocess.run(['cwebp', '-quiet', '-mt', '-metadata', 'none',
                                *args, src, '-o', tmp], capture_output=True)
            if r.returncode == 0 and os.path.getsize(tmp) < size * 0.9:
                os.replace(tmp, dst)
                return size, os.path.getsize(dst)
            if os.path.exists(tmp):
                os.remove(tmp)
        shutil.copy2(src, dst)
        return size, size

    with ThreadPoolExecutor(os.cpu_count() or 4) as ex:
        sizes = list(ex.map(build, files))

    # the game page: on pages.dev multiplayer goes through the Cloudflare relay (mp_worker/), see NET_RELAY
    html = texts[0]
    html, n = re.subn(r"window\.PUIUTU_DLC_LIST=\[[^\]]*\];",
                      'window.PUIUTU_DLC_LIST=%s;' % repr(DLCS).replace(' ', ''), html, count=1)
    assert n == 1, 'PUIUTU_DLC_LIST not found in the game page'
    print('DLCs in this build:', ', '.join(DLCS) or 'none')
    if DEMO:
        html = html.replace('<head>', '<head>\n<script>window.PUIUTU_DEMO=true;</script>', 1)
        html = minify_scripts(html)
        html = re.sub(r'<!--(?!\[if).*?-->', '', html, flags=re.S)      # HTML comments too
        print('demo: left out', len(skip_maps), 'map files and Border War')
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
    if not DEMO:
        shutil.copy2(os.path.join(SRC, 'rts.html'), OUT)

    sw = open(os.path.join(SRC, 'sw.js'), encoding='utf-8').read()
    sw = sw.replace("'./life_of_puiutu_game.html'", "'./index.html'")
    # a new cache name per build, so the offline copy of an old build is thrown away
    sw = re.sub(r"const CACHE = '[^']*';", "const CACHE = 'puiutu-web-%d';" % int(time.time()), sw)
    open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)

    man = open(os.path.join(SRC, 'manifest.json'), encoding='utf-8').read()
    man = man.replace('"./life_of_puiutu_game.html"', '"./"')
    man = man.replace(' — ', ', ').replace(', and play with friends', ' and play')
    open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8').write(man)

    open(os.path.join(OUT, '_headers'), 'w').write(
        "/*\n  X-Content-Type-Options: nosniff\n\n"
        "/index.html\n  Cache-Control: no-cache\n\n"
        "/sw.js\n  Cache-Control: no-cache\n\n"
        # art keeps its file name when it is redrawn, so browsers must ask every time (a cheap
        # 304 via the ETag when nothing changed); a long max-age kept showing the old sprites
        "/*.png\n  Cache-Control: public, max-age=0, must-revalidate\n\n"
        "/*.jpeg\n  Cache-Control: public, max-age=0, must-revalidate\n\n"
        "/*.jpg\n  Cache-Control: public, max-age=0, must-revalidate\n\n"
        "/*.webp\n  Cache-Control: public, max-age=0, must-revalidate\n")

    # report
    before = sum(a for a, _ in sizes); after = sum(b for _, b in sizes)
    count = sum(len(f) for _, _, f in os.walk(OUT))
    big = [(os.path.getsize(os.path.join(r, f)), os.path.join(r, f))
           for r, _, fs in os.walk(OUT) for f in fs]
    big.sort(reverse=True)
    print(f'{len(files)} assets: {before/1e6:.0f} MB -> {after/1e6:.0f} MB, {count} files in web_build/')
    print('largest:', ', '.join(f'{os.path.relpath(p, OUT)} {s/1e6:.1f} MB' for s, p in big[:3]))
    if big and big[0][0] > LIMIT:
        sys.exit('a file is over the 25 MB Cloudflare limit')


if __name__ == '__main__':
    main()
