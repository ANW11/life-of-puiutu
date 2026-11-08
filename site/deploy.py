#!/usr/bin/env python3
"""Deploy the Puiutu website with the game inside it, at /play/.

    python3 site/deploy.py                 # build the demo, stage, deploy to the puiutu-site Worker
    python3 site/deploy.py --no-build      # reuse the existing web_build_demo/
    python3 site/deploy.py --stage DIR     # only stage into DIR (for a local test), no deploy

Result: the site's index.html at the root (puiutu.dev), the game at /play/.

What it does:
  - runs build_web.py --demo (the website demo -> web_build_demo/)
  - copies site/ without its sources (art_src, photos_src, *.py) into a folder OUTSIDE
    the repo, then web_build_demo/ into its play/ folder
  - moves the game's _headers under /play/ (Workers read _headers only at the root)
  - writes wrangler.jsonc + .assetsignore and runs `wrangler deploy` there; run inside
    the repo, wrangler 4 would write its own config files into the repo
"""
import argparse, os, shutil, subprocess, sys, tempfile

SITE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SITE)
GAME = os.path.join(REPO, 'web_build_demo')   # the website ships the DEMO (build_web.py --demo), not the full game
SKIP = {'art_src', 'photos_src', '__pycache__', '.wrangler', 'play'}

WRANGLER = '''{
  "name": "puiutu-site",
  "compatibility_date": "2026-11-04",
  "assets": { "directory": ".", "html_handling": "auto-trailing-slash" }
}
'''


def ignore_site(dirpath, names):
    if os.path.abspath(dirpath) != SITE:
        return [n for n in names if n == '.DS_Store']
    return [n for n in names if n in SKIP or n.endswith('.py') or n.startswith('.')]


def headers(game_headers):
    """Root _headers: the site's own (if any) plus the game's, moved under /play/."""
    out = ['/*\n  X-Content-Type-Options: nosniff\n']
    site_h = os.path.join(SITE, '_headers')
    if os.path.exists(site_h):
        out.append(open(site_h).read().strip() + '\n')
    for block in open(game_headers).read().strip().split('\n\n'):
        lines = block.split('\n')
        if lines[0] == '/*':
            continue                       # already on the whole site
        lines[0] = '/play' + lines[0]
        out.append('\n'.join(lines) + '\n')
    out.append('/play/\n  Cache-Control: no-cache\n')
    return '\n'.join(out)


def stage(dst):
    if os.path.abspath(dst).startswith(REPO + os.sep):
        sys.exit('the staging folder must be outside the repo')
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(SITE, dst, ignore=ignore_site)
    shutil.copytree(GAME, os.path.join(dst, 'play'), ignore=shutil.ignore_patterns('_headers', '.DS_Store'))
    open(os.path.join(dst, '_headers'), 'w').write(headers(os.path.join(GAME, '_headers')))
    open(os.path.join(dst, 'wrangler.jsonc'), 'w').write(WRANGLER)
    open(os.path.join(dst, '.assetsignore'), 'w').write('wrangler.jsonc\n.assetsignore\n.wrangler\n')
    count = sum(len(f) for _, _, f in os.walk(dst))
    print(f'staged {count} files in {dst}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-build', action='store_true', help='reuse the existing web_build_demo/')
    ap.add_argument('--stage', metavar='DIR', help='only stage into DIR, do not deploy')
    a = ap.parse_args()

    if not a.no_build:
        subprocess.run([sys.executable, os.path.join(REPO, 'build_web.py'), '--demo'], check=True, cwd=REPO)
    if not os.path.exists(os.path.join(GAME, 'index.html')):
        sys.exit('web_build_demo/ is missing: run without --no-build')

    if a.stage:
        stage(os.path.abspath(a.stage))
        return
    dst = os.path.join(tempfile.mkdtemp(prefix='puiutu-site-'), 'site')
    stage(dst)
    subprocess.run(['npx', '--yes', 'wrangler@4', 'deploy'], check=True, cwd=dst)
    shutil.rmtree(os.path.dirname(dst), ignore_errors=True)


if __name__ == '__main__':
    main()
