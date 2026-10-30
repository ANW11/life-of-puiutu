#!/usr/bin/env python3
"""Build the web version of Life of Puiutu for Cloudflare Pages.

    python3 build_web.py            # writes web_build/
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
"""
import os, re, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SRC, 'web_build')

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


def main():
    texts = [open(os.path.join(SRC, f), encoding='utf-8').read()
             for f in ['life_of_puiutu_game.html', 'rts.html']]
    texts += [open(os.path.join(SRC, 'rts', f), encoding='utf-8').read()
              for f in os.listdir(os.path.join(SRC, 'rts')) if f.endswith('.js')]
    corpus = '\n'.join(texts)

    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    files = []
    for top in ASSET_DIRS:
        for root, dirs, names in os.walk(os.path.join(SRC, top)):
            rel_root = os.path.relpath(root, SRC)
            dirs[:] = [d for d in dirs
                       if os.path.join(rel_root, d) not in SKIP_DIRS
                       and not d.startswith(('_', '.')) and 'backup' not in d.lower()]
            for n in names:
                ext = os.path.splitext(n)[1].lower()
                if ext not in ASSET_EXT or n.startswith('.') or '.backup.' in n:
                    continue
                if rel_root in LITERAL_ONLY and n not in corpus:
                    continue
                files.append(os.path.join(rel_root, n))

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
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
    shutil.copy2(os.path.join(SRC, 'rts.html'), OUT)

    sw = open(os.path.join(SRC, 'sw.js'), encoding='utf-8').read()
    sw = sw.replace("'./life_of_puiutu_game.html'", "'./index.html'")
    sw = re.sub(r"const CACHE = '[^']*';", "const CACHE = 'puiutu-web-v1';", sw)
    open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)

    man = open(os.path.join(SRC, 'manifest.json'), encoding='utf-8').read()
    man = man.replace('"./life_of_puiutu_game.html"', '"./"')
    man = man.replace(' — ', ', ').replace(', and play with friends', ' and play')
    open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8').write(man)

    open(os.path.join(OUT, '_headers'), 'w').write(
        "/*\n  X-Content-Type-Options: nosniff\n\n"
        "/index.html\n  Cache-Control: no-cache\n\n"
        "/sw.js\n  Cache-Control: no-cache\n\n"
        "/*.png\n  Cache-Control: public, max-age=3600, stale-while-revalidate=604800\n\n"
        "/*.jpeg\n  Cache-Control: public, max-age=3600, stale-while-revalidate=604800\n\n"
        "/*.jpg\n  Cache-Control: public, max-age=3600, stale-while-revalidate=604800\n")

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
