// Border War — playing a friend. The host's browser runs the one real game; the guest sends
// its orders over and gets the state back a few times a second, and draws it smoothly in
// between. Nothing has to be deterministic, so a Chrome player and a Safari player stay in sync.
// Both talk through the game's own server (/ws), which pairs them by a four-letter room code.
'use strict';
const NET = {
  ws: null, role: null, code: null, peer: false, onStatus: null, snapT: 0, sentT: -1, sentMsg: 0, sentFell: 0,
  available() { return location.protocol === 'http:' || location.protocol === 'https:'; },
  status(text, ready) { if (this.onStatus) this.onStatus(text, ready); },
  connect(then) {
    if (this.ws && this.ws.readyState === 1) { then(); return; }
    try { this.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); }
    catch (e) { this.status('Could not reach the server.'); return; }
    this.ws.onopen = () => then();
    this.ws.onerror = () => this.status('Could not reach the server.');
    this.ws.onclose = () => { if (this.role) this.lost('The connection to the server was lost.'); this.ws = null; };
    this.ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onMsg(m); };
  },
  host() { this.role = 'host'; this.peer = false; this.connect(() => this.raw({ type: 'rts_host' })); this.status('Opening a room…'); },
  join(code) { this.role = 'guest'; this.peer = false; this.connect(() => this.raw({ type: 'rts_join', code: code.toUpperCase().trim() })); this.status('Looking for room ' + code.toUpperCase() + '…'); },
  leave() { if (this.ws) { try { this.raw({ type: 'rts_leave' }); this.ws.close(); } catch (e) {} } this.ws = null; this.role = null; this.peer = false; this.code = null; },
  raw(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  send(d) { this.raw({ type: 'rts', d }); },
  onMsg(m) {
    if (m.type === 'rts_room') { this.code = m.code; this.status('Room code: <b>' + m.code + '</b> — tell your friend to join with it. Waiting…'); }
    if (m.type === 'rts_peer') { this.peer = true; this.status('Your friend is here. Pick your side and press Start.', true); }
    if (m.type === 'rts_joined') { this.peer = true; this.status('Joined! Waiting for your friend to start the game…'); }
    if (m.type === 'rts_error') { this.status(m.msg || 'Something went wrong.'); this.role = null; }
    if (m.type === 'rts_left') this.lost('Your friend left the game.');
    if (m.type === 'rts' && m.d) {
      const d = m.d;
      if (this.role === 'host' && d.k === 'cmd') runCmd(d.c, 1);
      if (this.role === 'guest' && d.k === 'start') Main.startGuest(d);
      if (this.role === 'guest' && d.k === 'snap' && G) this.apply(d);
    }
  },
  lost(why) {
    const wasPlaying = G && !G.over && this.role;
    this.peer = false;
    if (wasPlaying) { G.over = { winner: ME, t: G.time, left: true, why }; }
    else this.status(why);
  },

  // ── host: the game starts, then a snapshot goes out ~7 times a second ──
  startHost() {
    const n = G.n, bin = String.fromCharCode.apply(null, Array.from(G.map.t));
    this.send({ k: 'start', opt: G.opt, terrain: btoa(bin), factions: G.players.slice(0, 2).map(p => p.faction) });
    this.snapT = 0; this.sentT = -1; this.sentMsg = 0; this.sentFell = 0;
  },
  hostTick(dt) {
    if (this.role !== 'host' || !this.peer || !G) return;
    this.snapT -= dt; if (this.snapT > 0 && !G.over) return; this.snapT = 1 / 7;
    this.send(this.snapshot());
  },
  snapshot() {
    const r2 = v => Math.round(v * 100) / 100, ents = [];
    for (const e of G.ents) { if (e.dead) continue;
      if (e.isUnit) ents.push({ i: e.id, k: e.kind, o: e.owner, x: r2(e.x), y: r2(e.y), h: Math.round(e.hp), mh: Math.round(e.maxHp), f: e.facing,
        m: e.moving ? 1 : 0, w: e.working ? 1 : 0, s: e.swing > 0 ? r2(e.swing) : 0, sd: r2(e.swingDur || 0), sr: e.swingRanged ? 1 : 0,
        c: e.carry ? [e.carry.type, e.carry.amt] : 0, lv: e.level, xp: Math.round(e.xp), mn: Math.round(e.mana), mm: e.maxMana,
        it: e.items.length ? e.items : 0, cd: Object.keys(e.cds).length ? e.cds : 0, b: Object.keys(e.buffs).length ? e.buffs : 0,
        or: e.order ? e.order.type : 0, ht: e.hitT ? r2(e.hitT) : 0,
        sh: e.maxShield ? Math.round(e.shield) : 0, ms: e.maxShield || 0, mo: e.morale || 0, hd: e.tun ? 1 : 0 });
      else if (e.isBuilding) ents.push({ i: e.id, k: e.kind, o: e.owner, B: 1, tx: e.tx, ty: e.ty, h: Math.round(e.hp), mh: e.maxHp, bu: e.built ? 1 : 0, pr: r2(e.progress),
        q: e.prodQ.length ? e.prodQ.map(q => ({ unit: q.unit, up: q.up, revive: q.revive, t: r2(q.t), total: q.total })) : 0,
        ra: e.rally ? { x: r2(e.rally.x), y: r2(e.rally.y) } : 0, st: e.stock || 0, dl: e.deal || 0, ht: e.hitT ? r2(e.hitT) : 0 });
      else if (e.isRes) ents.push({ i: e.id, k: 'fishspot', o: e.owner, R: 1, tx: e.tx, ty: e.ty, am: e.amount, mx: e.max, ri: e.rich ? 1 : 0 });
    }
    const fell = G.map.felled.slice(this.sentFell); this.sentFell = G.map.felled.length;
    const msgs = G.msgs.filter(m => m.p === 1 && m.id > this.sentMsg); if (msgs.length) this.sentMsg = msgs[msgs.length - 1].id;
    const snap = { k: 'snap', t: r2(G.time), ents, fell,
      pl: G.players.slice(0, 2).map(p => ({ faction: p.faction, fish: p.fish, wood: p.wood, supUsed: p.supUsed, supCap: p.supCap, up: p.up, researching: p.researching, hero: p.hero, heroDead: p.heroDead, stats: p.stats, inNet: netUnits(p.id).length })),
      proj: G.proj.map(p => ({ x: r2(p.x), y: r2(p.y), t: p.t, kind: p.kind, sp: p.sp })),
      fx: G.fx.filter(f => f.t > this.sentT).map(f => Object.assign({}, f)),
      cl: G.clouds.map(c => ({ x: c.x, y: c.y, r: c.r, until: c.until })), items: G.items,
      msgs: msgs.map(m => ({ text: m.text, col: m.col })), rn: G.rain || 0, fd: G.floods || [], al: G.alerts.filter(a => a.p === 1 && a.t > this.sentT), over: G.over };
    this.sentT = G.time; return snap;
  },

  // ── guest: take the host's word for everything, glide between the updates ──
  apply(d) {
    G.time = d.t;
    d.pl.forEach((p, i) => Object.assign(G.players[i], p));
    const seen = new Set();
    for (const s of d.ents) {
      seen.add(s.i); let e = G.byId.get(s.i);
      if (!e) {
        if (s.B) { const def = BUILDINGS[s.k]; e = { id: s.i, kind: s.k, def, owner: s.o, isBuilding: true, tx: s.tx, ty: s.ty, size: def.size, x: s.tx + def.size / 2, y: s.ty + def.size / 2, r: def.size / 2, prodQ: [] };
          G.map.setBlock(s.tx, s.ty, def.size, true); }
        else if (s.R) { e = { id: s.i, kind: 'fishspot', owner: s.o, isRes: true, tx: s.tx, ty: s.ty, size: 3, x: s.tx + 1.5, y: s.ty + 1.5, r: 1.5, hp: 1, maxHp: 1 }; G.map.setBlock(s.tx, s.ty, 3, true); }
        else { const def = UNITS[s.k]; e = { id: s.i, kind: s.k, def, owner: s.o, isUnit: true, x: s.x, y: s.y, r: def.r, anim: Math.random() * 10, buffs: {}, cds: {}, items: [], swing: 0, queue: [] }; }
        G.ents.push(e); G.byId.set(e.id, e);
      }
      e.owner = s.o; e.hp = s.h; e.maxHp = s.mh; if (s.ht) e.hitT = s.ht;
      if (e.isUnit) { e.tgx = s.x; e.tgy = s.y; e.facing = s.f; e.moving = !!s.m; e.working = !!s.w; if (s.s) { e.swing = s.s; e.swingDur = s.sd; e.swingRanged = !!s.sr; }
        e.carry = s.c ? { type: s.c[0], amt: s.c[1] } : null; e.level = s.lv; e.xp = s.xp; e.mana = s.mn; e.maxMana = s.mm;
        e.items = s.it || []; e.cds = s.cd || {}; e.buffs = s.b || {}; e.order = s.or ? { type: s.or } : null;
        e.shield = s.sh; e.maxShield = s.ms; e.morale = s.mo; e.tun = s.hd ? {} : null; }
      if (e.isBuilding) { e.built = !!s.bu; e.progress = s.pr; e.prodQ = s.q || []; e.rally = s.ra || null; if (s.st) e.stock = s.st; e.deal = s.dl || null; }
      if (e.isRes) { e.amount = s.am; e.max = s.mx; e.rich = !!s.ri; }
    }
    for (const e of G.ents) if (!e.dead && !seen.has(e.id)) { e.dead = true; G.byId.delete(e.id); if (e.isBuilding || e.isRes) G.map.setBlock(e.tx, e.ty, e.size, false); }
    G.ents = G.ents.filter(e => !e.dead);
    for (const i of d.fell) { G.map.t[i] = T_STUMP; G.map.dirty.push(i); }
    G.proj = d.proj; G.clouds = d.cl; G.items = d.items; G.rain = d.rn || null;
    // floods come and go with the rain: lift the old water off the map, put the new down
    const fk = JSON.stringify(d.fd || []); if (fk !== this.floodKey) { this.floodKey = fk;
      for (const f of G.floods || []) G.map.setBlock(f.tx, f.ty, f.s, false); G.floods = d.fd || []; for (const f of G.floods) G.map.setBlock(f.tx, f.ty, f.s, true); }
    for (const f of d.fx) G.fx.push(f);
    for (const m of d.msgs) say(1, m.text, m.col);
    for (const a of d.al) G.alerts.push(a);
    if (d.over && !G.over) G.over = d.over;
  },
  guestTick(dt) {
    if (this.role !== 'guest' || !G || G.over) return;
    G.time += dt;
    const k = 1 - Math.exp(-dt * 10);
    for (const e of G.ents) { if (!e.isUnit) continue; e.anim += dt; if (e.swing > 0) e.swing -= dt;
      if (e.tgx !== undefined) { const dx = e.tgx - e.x, dy = e.tgy - e.y; if (Math.hypot(dx, dy) > 3) { e.x = e.tgx; e.y = e.tgy; } else { e.x += dx * k; e.y += dy * k; } } }
    for (const p of G.proj) { const t = G.byId.get(p.t); if (!t) continue; const dx = t.x - p.x, dy = t.y - 0.4 - p.y, d = Math.hypot(dx, dy); if (d > 0.05) { const s = Math.min(d, p.sp * dt); p.x += dx / d * s; p.y += dy / d * s; p.ang = Math.atan2(dy, dx); } }
    G.fx = G.fx.filter(f => G.time - f.t < 2.2);
    G.visT -= dt; if (G.visT <= 0) { G.visT = 0.2; updateVision(); }
  },
};
