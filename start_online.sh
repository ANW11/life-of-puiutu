#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Life of Puiutu — pornește jocul online (server + tunel public Cloudflare)
#  Dublu-click sau rulează:  bash start_online.sh
#  Lasă fereastra deschisă cât timp vrei să vă jucați. Ctrl+C ca să oprești.
# ─────────────────────────────────────────────────────────────────────────────
cd "$(dirname "$0")"
PORT=8080

echo "🐾 Opresc instanțe vechi..."
lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

echo "🐾 Pornesc serverul de joc (port $PORT)..."
python3 "$(pwd)/play_server.py" > /tmp/puiutu_server.log 2>&1 &
SRV=$!
sleep 2
if ! curl -s -o /dev/null http://localhost:$PORT/ ; then
  echo "❌ Serverul nu a pornit. Vezi /tmp/puiutu_server.log"; cat /tmp/puiutu_server.log; exit 1
fi
echo "✅ Server pornit (PID $SRV)"

echo "🌍 Pornesc tunelul public Cloudflare..."
cloudflared tunnel --url http://localhost:$PORT > /tmp/puiutu_tunnel.log 2>&1 &
TUN=$!
URL=""
for i in $(seq 1 25); do
  URL=$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/puiutu_tunnel.log | head -1)
  [ -n "$URL" ] && break
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════"
if [ -n "$URL" ]; then
  echo "  ✅ GATA! Trimite acest link prietenilor din Belgia:"
  echo ""
  echo "      $URL"
  echo ""
  echo "  Fiecare deschide link-ul, își alege un nume → Play Game."
else
  echo "  ❌ Nu am obținut link public. Vezi /tmp/puiutu_tunnel.log"
fi
echo "  (Lasă această fereastră deschisă. Ctrl+C oprește totul.)"
echo "════════════════════════════════════════════════════════════"

trap "echo; echo 'Opresc...'; kill $SRV $TUN 2>/dev/null; exit 0" INT TERM
wait
