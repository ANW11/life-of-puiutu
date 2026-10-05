#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Life of Puiutu — pornește jocul online (server + tunel public Cloudflare)
#  Dublu-click pe fișier. Lasă fereastra deschisă cât vă jucați; Ctrl+C oprește.
# ─────────────────────────────────────────────────────────────────────────────
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # de aici vin cloudflared și python3
PORT=8080

echo "🐾 Opresc instanțe vechi..."
lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

echo "🐾 Pornesc serverul de joc (port $PORT)..."
PORT=$PORT python3 play_server.py > /tmp/puiutu_server.log 2>&1 &
SRV=$!
for i in $(seq 1 20); do
  curl -s -o /dev/null http://localhost:$PORT/ && break
  sleep 0.5
done
if ! curl -s -o /dev/null http://localhost:$PORT/ ; then
  echo "❌ Serverul nu a pornit. Uite ce zice:"; cat /tmp/puiutu_server.log
  read -n 1 -p "Apasă o tastă..."; exit 1
fi
echo "✅ Server pornit"

echo "🌍 Pornesc tunelul public Cloudflare..."
cloudflared tunnel --url http://localhost:$PORT > /tmp/puiutu_tunnel.log 2>&1 &
TUN=$!
URL=""
for i in $(seq 1 30); do
  URL=$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/puiutu_tunnel.log | head -1)
  [ -n "$URL" ] && break
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════"
if [ -n "$URL" ]; then
  # nu deschidem link-ul până nu există de-adevăratelea: dacă îl ceri prea devreme, Mac-ul / routerul
  # țin minte „nu există” câteva minute. Întrebăm direct DNS-ul Cloudflare, care nu strică nimic local.
  echo "⏳ Aștept să devină activ link-ul..."
  HOST=${URL#https://}
  for i in $(seq 1 60); do
    grep -q "Registered tunnel connection" /tmp/puiutu_tunnel.log && [ -n "$(dig +short "$HOST" @1.1.1.1)" ] && break
    sleep 1
  done
  sleep 3
  printf '%s' "$URL" | pbcopy
  echo "  ✅ GATA! Link-ul public (e deja copiat, dai Cmd+V):"
  echo ""
  echo "      $URL"
  echo "      $URL/rts.html   ← Border War"
  echo ""
  open "$URL"
else
  echo "  ❌ Nu am obținut link public. Uite ce zice tunelul:"
  tail -20 /tmp/puiutu_tunnel.log
fi
echo "  (Lasă fereastra deschisă. Ctrl+C oprește totul.)"
echo "════════════════════════════════════════════════════════════"

trap "echo; echo 'Opresc...'; kill $SRV $TUN 2>/dev/null; exit 0" INT TERM
wait
