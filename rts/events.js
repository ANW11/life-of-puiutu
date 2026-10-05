// Border War — things that happen on the map whatever the two armies are doing. Each one is
// worth fighting over and turns up away from both bases, so the armies meet in the middle of
// the game instead of only at the very end. Every event is announced 30 seconds ahead.
//   · the Coon crosses the woods with a sack of bananas: bring him down for his treasure
//   · Agent Snout has a special offer at the Pig Exchange: half price, first come first served
//   · rain: puddles fill with fish, and floods cut some of the roads until it stops
// Only the game that runs the rules (alone, or the host) calls EV.tick; the guest sees the results.
'use strict';
const EV_WARN = 30;
const EV_PLAN = [   // first time, then every `every` seconds
  { k: 'coon', at: 390, every: 600 },
  { k: 'deal', at: 540, every: 360 },
  { k: 'rain', at: 780, every: 600, dur: 100 },
];
const EV = {
  init() { G.events.next = EV_PLAN.map(p => ({ k: p.k, t: p.at, warned: false })); G.floods = []; G.rain = null; },
  tick() {
    const E = G.events; if (!E.next) this.init();
    for (const n of E.next) {
      if (!n.warned && G.time > n.t - EV_WARN) { n.warned = true; this.warn(n.k); }
      if (G.time > n.t) { n.t += EV_PLAN.find(p => p.k === n.k).every; n.warned = false; this[n.k + 'Start'](); }
    }
    this.coonTick(); this.dealTick(); this.rainTick();
  },
  both(text, col, at) { for (const p of [0, 1]) { say(p, text, col); if (at) G.alerts.push({ p, x: at.x, y: at.y, t: G.time }); } },
  warn(k) {
    if (k === 'coon') this.both('Rustling at the edge of the woods… the Coon is coming with a sack of bananas.', '#ffd36b');
    if (k === 'deal') this.both('Agent Snout is preparing a special offer at the Pig Exchange…', '#f2b8c6');
    if (k === 'rain') this.both('Dark clouds are gathering over the border woods…', '#8fd8ff');
  },
  // the line through the middle that both bases are equally far from (the map is mirrored through its centre)
  sideAxis() { const tc = G.map.toCenter; return { x: -tc.y, y: tc.x }; },

  // ── the Coon: walks in from one side, across the middle and out the other ──
  coonStart() {
    if (G.ents.some(e => !e.dead && e.kind === 'coon')) return;
    const n = G.n, c = G.map.center, s = this.sideAxis(), far = n * 0.42, dir = Math.random() < 0.5 ? 1 : -1;
    // as far out along the line as you can still walk to the middle from (a river may cut off the very edge)
    const reach = this.reach(c.x, c.y + 3);
    const at = (k) => { for (let f = far; f > 6; f -= 2) { const x = clamp(Math.round(c.x + s.x * f * k), 3, n - 4), y = clamp(Math.round(c.y + s.y * f * k), 3, n - 4);
        const p = G.map.nearestPassable(x, y, 6); if (p && reach[G.map.idx(p.x, p.y)]) return p; } return { x: c.x, y: c.y + 3 }; };
    const a = at(dir), b = at(-dir);
    const u = spawnUnit('coon', P_CREEP, a.x + 0.5, a.y + 0.5);
    const mid = G.map.nearestPassable(c.x, c.y, 6) || c;   // the Exchange stands on the very centre
    u.ev = { way: [{ x: mid.x + 0.5, y: mid.y + 0.5 }, { x: b.x + 0.5, y: b.y + 0.5 }], angryT: -99, best: 1e9, bestT: G.time };
    u.facing = b.x > a.x ? 1 : -1;
    this.both('The Coon is crossing the border woods! Whoever brings him down gets his treasure.', '#ffd36b', u);
  },
  coonTick() {
    const u = G.ents.find(e => !e.dead && e.kind === 'coon'); if (!u) return;
    // hit lately: he stops and throws bananas at whoever is closest, then goes on his way
    if (G.time - (u.hitT || -99) < 0.1) u.ev.angryT = G.time;
    const angry = G.time - u.ev.angryT < 5;
    if (angry) u.ev.bestT = G.time;   // a fight is not being stuck
    if (angry && !(u.order && u.order.type === 'attack')) { const t = nearestEnemy(u, 7); if (t) { setOrder(u, { type: 'attack', target: t.id, auto: true, from: { x: u.x, y: u.y } }); return; } }
    if (!angry && u.order && u.order.type === 'attack') u.order = null;
    if (u.order && u.order.type === 'attack') return;
    const w = u.ev.way[0];
    if (!w) { removeEnt(u); this.both('The Coon got away with his bananas.', '#ffcf8a'); return; }
    const d = Math.hypot(u.x - w.x, u.y - w.y), next = () => { u.ev.way.shift(); u.ev.best = 1e9; u.ev.bestT = G.time; u.order = null; };
    if (d < u.ev.best - 0.5) { u.ev.best = d; u.ev.bestT = G.time; }
    if (d < 1.5) return next();
    // not getting any closer: look for another way round; still stuck after a while, give that point up
    if (G.time - u.ev.bestT > 6) { u.path = null; u.repath = 0; if (G.time - u.ev.bestT > 20) return next(); }
    if (!u.order) setOrder(u, { type: 'move', x: w.x, y: w.y });
  },
  onKill(t, killer) {
    if (t.kind !== 'coon') return;
    G.items.push({ id: 'goldbanana', x: t.x, y: t.y });
    const pool = ITEM_TIERS[2]; G.items.push({ id: pool[(Math.random() * pool.length) | 0], x: t.x + 0.8, y: t.y + 0.4 });
    if (killer === 0 || killer === 1) { say(killer, 'You brought down the Coon! His treasure lies where he fell.', '#ffd36b'); say(1 - killer, 'The enemy brought down the Coon.', '#ff9a8a'); }
    else this.both('The Coon has fallen.', '#ffd36b');
  },

  // ── Snout's special offer: one mercenary at half price, for whoever gets there first ──
  dealStart() {
    const ex = G.ents.find(e => !e.dead && e.kind === 'exchange'); if (!ex) return;
    const kind = Math.random() < 0.6 ? 'mechboar' : Math.random() < 0.5 ? 'merlin' : 'snout', c = UNITS[kind].cost;
    ex.deal = { kind, f: Math.round(c.f / 2), w: Math.round(c.w / 2), until: G.time + 75 };
    this.both('Agent Snout has a special offer at the Pig Exchange: ' + UNITS[kind].name + ' at half price. First come, first served!', '#f2b8c6', ex);
  },
  dealTick() {
    const ex = G.ents.find(e => !e.dead && e.kind === 'exchange');
    if (ex && ex.deal && G.time > ex.deal.until) { ex.deal = null; this.both("Snout's special offer has expired.", '#bbbbbb'); }
  },
  // hireMerc asks: is there a deal on this one? (then it doesn't need stock)
  deal(ex, kind) { return ex.deal && ex.deal.kind === kind && G.time < ex.deal.until ? ex.deal : null; },
  dealTaken(ex, p) { ex.deal = null; say(p, "You snapped up Snout's special offer.", '#ffd36b'); say(1 - p, "The enemy snapped up Snout's special offer.", '#ff9a8a'); },

  // ── rain: floods on the roads between the bases, and puddles full of fish ──
  rainStart() {
    const dur = EV_PLAN.find(p => p.k === 'rain').dur; G.rain = { t0: G.time, until: G.time + dur };
    const M = G.map, n = G.n, s0 = M.starts[0], s1 = M.starts[1];
    const keyPlaces = [s1, M.center, ...M.expos]; for (const e of G.ents) if (!e.dead && e.isBuilding && e.def.hall) keyPlaces.push({ x: Math.floor(e.x), y: Math.floor(e.y) });
    const far = (x, y, r) => [s0, s1, M.center, ...M.expos].every(p => Math.hypot(p.x - x, p.y - y) > r);
    const free = (x, y, sz) => M.canPlace(x, y, sz, G.ents) && !G.items.some(i => i.x > x - 1 && i.x < x + sz + 1 && i.y > y - 1 && i.y < y + sz + 1);
    // floods: road tiles out in the open; each comes with its mirror, and the map must stay connected
    const count = r => { let c = 0; for (let i = 0; i < r.length; i++) c += r[i]; return c; }, open0 = count(this.reach(s0.x, s0.y));
    const roads = []; for (let y = 3; y < n / 2; y++) for (let x = 3; x < n - 4; x++) if (M.terr(x, y) === T_DIRT && far(x, y, Math.max(9, n * 0.15))) roads.push({ x, y });
    for (let tries = 0; tries < 60 && G.floods.length < 4 && roads.length; tries++) {
      const r = roads[(Math.random() * roads.length) | 0], a = { tx: r.x - 1, ty: r.y - 1, s: 3 }, b = { tx: n - 3 - a.tx, ty: n - 3 - a.ty, s: 3 };
      if (!free(a.tx, a.ty, 3) || !free(b.tx, b.ty, 3) || G.floods.some(f => Math.hypot(f.tx - a.tx, f.ty - a.ty) < 10)) continue;
      M.setBlock(a.tx, a.ty, 3, true); M.setBlock(b.tx, b.ty, 3, true);
      // a flood may make you walk round, never shut anyone in: only its own tiles may drop out of reach
      const reach = this.reach(s0.x, s0.y), lost = open0 - count(reach) - 9 * (G.floods.length + 2);
      if (lost <= 0 && keyPlaces.every(p => reach[M.idx(p.x, p.y)] || !M.walkTerr(p.x, p.y))) G.floods.push(a, b);
      else { M.setBlock(a.tx, a.ty, 3, false); M.setBlock(b.tx, b.ty, 3, false); }
    }
    // puddles: a pair of small fishing spots out in the wilds, away from every base
    const lane = M.lane;
    for (let tries = 0; tries < 80; tries++) {
      const x = Math.round(lane.x + rnd(-8, 8)) - 1, y = Math.round(lane.y + rnd(-8, 8)) - 1, mx = n - 3 - x, my = n - 3 - y;
      if (!far(x + 1, y + 1, 10) || !free(x, y, 3) || !free(mx, my, 3)) continue;
      for (const [px, py] of [[x, y], [mx, my]]) { const f = spawnFish(px, py, 800); f.puddle = true; }
      break;
    }
    for (const u of G.ents) if (!u.dead && u.isUnit) u.path = null;   // everyone finds their way round the water
    if (G.floods.length) this.both('Rain! Puddles fill with fish, but floods cut some of the roads.', '#8fd8ff', { x: G.floods[0].tx + 1.5, y: G.floods[0].ty + 1.5 });
    else this.both('Rain! Puddles fill with fish out in the wilds.', '#8fd8ff');
  },
  rainTick() {
    if (G.rain && G.time > G.rain.until) {
      const had = G.floods.length; for (const f of G.floods) G.map.setBlock(f.tx, f.ty, f.s, false);
      G.floods = []; G.rain = null; G.dryAt = G.time + 60;
      for (const u of G.ents) if (!u.dead && u.isUnit) u.path = null;
      this.both(had ? 'The rain stops. The floods drain away.' : 'The rain stops.', '#8fd8ff');
    }
    if (G.dryAt && G.time > G.dryAt) { G.dryAt = 0; let any = false;
      for (const f of G.ents) if (!f.dead && f.isRes && f.puddle) { removeEnt(f); any = true; }
      if (any) this.both('The rain puddles have dried up.', '#bbbbbb'); }
  },
  // which tiles can be walked to from (x, y) with the floods in the way; buildings don't count
  // as walls here (units walk round them), only terrain and water
  reach(sx, sy) {
    const M = G.map, n = G.n, built = new Uint8Array(n * n);
    for (const e of G.ents) if (!e.dead && (e.isBuilding || e.isRes)) for (let y = e.ty; y < e.ty + e.size; y++) for (let x = e.tx; x < e.tx + e.size; x++) if (M.inside(x, y)) built[M.idx(x, y)] = 1;
    const seen = new Uint8Array(n * n), q = [M.idx(sx, sy)]; seen[q[0]] = 1;
    while (q.length) { const i = q.pop(), x = i % n, y = (i / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!M.inside(nx, ny)) continue; const j = ny * n + nx;
        if (!seen[j] && M.walkTerr(nx, ny) && (!M.block[j] || built[j])) { seen[j] = 1; q.push(j); } } }
    return seen;
  },
};
