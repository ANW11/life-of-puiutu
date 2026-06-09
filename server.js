// ───────────────────────────────────────────────────────────────────────────
//  Life of Puiutu — multiplayer server
//  Serves the game files AND relays player positions + chat over WebSocket.
//  One address hosts everything. Run:  npm install && npm start
// ───────────────────────────────────────────────────────────────────────────
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// the single HTML file we serve at "/"
const INDEX = 'life_of_puiutu_game.html';

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json',
  '.mp3':'audio/mpeg', '.wav':'audio/wav', '.webp':'image/webp'
};

// ── static file server ──
const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/' + INDEX;
    // prevent directory traversal
    const safe = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    const file = path.join(ROOT, safe);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) { res.writeHead(500); res.end('Error'); }
});

// ── websocket relay ──
const wss = new WebSocketServer({ server });
let nextId = 1;
const clients = new Map(); // ws -> { id, name, last }

function broadcast(obj, exceptWs) {
  const msg = JSON.stringify(obj);
  for (const ws of wss.clients) {
    if (ws !== exceptWs && ws.readyState === 1) ws.send(msg);
  }
}

wss.on('connection', (ws) => {
  const id = 'p' + (nextId++);
  clients.set(ws, { id, name: 'Pisic', last: null });
  ws.send(JSON.stringify({ type: 'welcome', id }));
  // tell the newcomer who's already here
  for (const [other, info] of clients) {
    if (other !== ws && info.last) {
      ws.send(JSON.stringify(Object.assign({ type: 'state', id: info.id, name: info.name }, info.last)));
    }
  }

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const info = clients.get(ws); if (!info) return;

    if (m.type === 'hello') {
      info.name = (m.name || 'Pisic').slice(0, 16);
    } else if (m.type === 'state') {
      info.name = (m.name || info.name).slice(0, 16);
      info.last = { area: m.area, x: m.x, y: m.y, facing: m.facing, phase: m.phase, moving: m.moving, hat: m.hat };
      broadcast(Object.assign({ type: 'state', id: info.id, name: info.name }, info.last), ws);
    } else if (m.type === 'chat') {
      const text = String(m.text || '').slice(0, 120);
      if (text.trim()) broadcast({ type: 'chat', id: info.id, name: info.name, text }, null);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info) broadcast({ type: 'leave', id: info.id }, ws);
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log('🐾 Life of Puiutu server running on port ' + PORT);
});
