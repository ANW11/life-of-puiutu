// ───────────────────────────────────────────────────────────────────────────
//  Life of Puiutu — multiplayer relay on Cloudflare (Worker + one Durable Object)
//  The same protocol as play_server.py, but nobody has to host: the first player
//  who opens the site wakes the room up on Cloudflare, it sleeps when everyone leaves.
//  Deploy (from a copy of this folder OUTSIDE the repo):  npx wrangler@4 deploy
// ───────────────────────────────────────────────────────────────────────────

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 });
      return env.WORLD.get(env.WORLD.idFromName('world')).fetch(req);   // one shared world, like play_server.py
    }
    return new Response('Life of Puiutu multiplayer relay', { headers: { 'content-type': 'text/plain' } });
  },
};

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';   // Border War room codes: no I, L, O, they read like 1 and 0

export class World {
  constructor(state) {
    this.state = state;
    this.clients = new Map();   // ws -> { id, name, last }
    this.next = 1;
    this.rooms = new Map();     // code -> { host, guest }
    this.roomOf = new Map();    // ws -> code
  }

  async fetch(req) {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    this.join(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, msg) { try { ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); } catch (e) { this.drop(ws); } }

  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const ws of this.clients.keys()) if (ws !== except) this.send(ws, s);
  }

  join(ws) {
    const id = 'p' + this.next++;
    this.clients.set(ws, { id, name: 'Pisic', last: null });
    this.send(ws, { type: 'welcome', id });
    for (const [other, info] of this.clients)   // tell the newcomer who's already here
      if (other !== ws && info.last) this.send(ws, { type: 'state', id: info.id, name: info.name, ...info.last });
    ws.addEventListener('message', (ev) => this.onMessage(ws, ev.data));
    ws.addEventListener('close', () => this.drop(ws));
    ws.addEventListener('error', () => this.drop(ws));
  }

  drop(ws) {
    const info = this.clients.get(ws);
    if (!info) return;
    this.clients.delete(ws);
    this.rtsLeave(ws);
    this.broadcast({ type: 'leave', id: info.id }, ws);
  }

  onMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 20000) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const info = this.clients.get(ws); if (!info || !m) return;
    const t = m.type;
    if (typeof t === 'string' && t.startsWith('rts')) return this.rts(ws, m, raw);
    if (t === 'hello') {
      info.name = String(m.name || 'Pisic').slice(0, 16);
    } else if (t === 'state') {
      info.name = String(m.name || info.name).slice(0, 16);
      info.last = { area: m.area, x: m.x, y: m.y, facing: m.facing, phase: m.phase, moving: m.moving,
                    hat: m.hat, skin: m.skin, nx: m.nx, ny: m.ny };
      this.broadcast({ type: 'state', id: info.id, name: info.name, ...info.last }, ws);
    } else if (t === 'chat') {
      const text = String(m.text || '').slice(0, 120);
      if (text.trim()) this.broadcast({ type: 'chat', id: info.id, name: info.name, text }, null);
    }
  }

  // ── Border War rooms: two browsers paired by a 4-letter code; the relay only passes messages on ──
  partner(ws) {
    const r = this.rooms.get(this.roomOf.get(ws));
    if (!r) return null;
    return r.host === ws ? r.guest : r.host;
  }

  rtsLeave(ws) {
    const code = this.roomOf.get(ws); this.roomOf.delete(ws);
    const r = this.rooms.get(code); if (!r) return;
    const other = r.host === ws ? r.guest : r.host;
    this.rooms.delete(code);
    if (other) { this.roomOf.delete(other); this.send(other, { type: 'rts_left' }); }
  }

  rts(ws, m, raw) {
    if (m.type === 'rts_host') {
      this.rtsLeave(ws);
      let code;
      do { code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(''); }
      while (this.rooms.has(code));
      this.rooms.set(code, { host: ws, guest: null }); this.roomOf.set(ws, code);
      this.send(ws, { type: 'rts_room', code });
    } else if (m.type === 'rts_join') {
      const code = String(m.code || '').toUpperCase().slice(0, 4);
      const r = this.rooms.get(code);
      if (!r) return this.send(ws, { type: 'rts_error', msg: 'No game with code ' + code + '.' });
      if (r.guest) return this.send(ws, { type: 'rts_error', msg: 'That game is already full.' });
      this.rtsLeave(ws);
      r.guest = ws; this.roomOf.set(ws, code);
      this.send(ws, { type: 'rts_joined', code });
      this.send(r.host, { type: 'rts_peer' });
    } else if (m.type === 'rts_leave') {
      this.rtsLeave(ws);
    } else if (m.type === 'rts') {
      const other = this.partner(ws);
      if (other) this.send(other, raw);
    }
  }
}
