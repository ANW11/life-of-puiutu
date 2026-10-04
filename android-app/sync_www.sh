#!/bin/sh
# Copy the game and the art it loads into www/ (what the APK ships). Run from android-app/.
set -e
SRC=..
mkdir -p www
rsync -a --delete --delete-excluded \
  --exclude "art proposals/" --exclude "*.backup.*" --exclude ".DS_Store" \
  "$SRC/life_of_puiutu_game.html" "$SRC/manifest.json" "$SRC/rts.html" "$SRC/rts" \
  "$SRC/maps" "$SRC/mobs" "$SRC/npcs" "$SRC/army" "$SRC/puiutu" "$SRC/props" "$SRC/spells" \
  "$SRC/ui" "$SRC/fx" "$SRC/skins" "$SRC/fishing" "$SRC/circuit" "$SRC/colorsort" \
  "$SRC/fruitmerge" "$SRC/gacha" "$SRC/cart_game" "$SRC/Phone" \
  www/
cp www/life_of_puiutu_game.html www/index.html
echo "www/ ready: $(du -sh www | cut -f1)"
