// Border War — the map: procedural, point-symmetric (fair for both sides), and the A* pathfinder.
'use strict';
const T_GRASS = 0, T_WATER = 1, T_TREE = 2, T_ROCK = 3, T_DIRT = 4, T_STUMP = 5;

// small seeded RNG so a map can be replayed from its seed
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// smooth value noise, for forests and lakes that clump like real ones
function makeNoise(rng, cell) {
  const g = {}; const v = (x, y) => { const k = x + ',' + y; if (g[k] === undefined) g[k] = rng(); return g[k]; };
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => { const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = s(fx - x0), ty = s(fy - y0);
    const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty; };
}

class GameMap {
  constructor(n, seed) {
    this.n = n; this.seed = seed;
    this.t = new Uint8Array(n * n);      // terrain
    this.wood = new Uint16Array(n * n);  // wood left in a tree tile
    this.block = new Uint8Array(n * n);  // tiles taken by buildings / resources
    this.deco = new Uint8Array(n * n);   // per-tile variation for drawing
    this.dirty = [];                      // tiles changed since the terrain was last painted
    this.felled = [];                     // every tree cut down, in order (sent to a friend's screen)
    this.generate();
  }
  idx(x, y) { return y * this.n + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.n && y < this.n; }
  terr(x, y) { return this.inside(x, y) ? this.t[this.idx(x, y)] : T_ROCK; }
  walkTerr(x, y) { const t = this.terr(x, y); return t === T_GRASS || t === T_DIRT || t === T_STUMP; }
  passable(x, y) { return this.inside(x, y) && this.walkTerr(x, y) && !this.block[this.idx(x, y)]; }
  isTree(x, y) { return this.terr(x, y) === T_TREE; }

  // ── the generator ──
  // Every map is point-symmetric (player 1's half is player 0's turned half a circle, to the tile),
  // so whatever the dice give, both sides get exactly the same. What changes from game to game:
  // where the bases sit, what the land is like (lakes, a river with fords, deep woods, open plain),
  // stone ridges that make chokepoints, how many expansions there are and where, the creep camps.
  // At the end it checks that everything can be walked to and that both bases have wood at hand.
  generate() {
    const n = this.n, rng = mulberry(this.seed), R = (a, b) => a + rng() * (b - a), pick = arr => arr[(rng() * arr.length) | 0];
    const sc = n / 80, D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    // 1. layout and land type
    this.layout = pick(['diagonal', 'diagonal', 'horizontal', 'vertical']);
    this.land = pick(['lakes', 'river', 'woods', 'open', 'river', 'lakes']);
    const off = Math.round(R(-0.12, 0.12) * n);
    const s0 = this.layout === 'diagonal' ? { x: 9, y: n - 10 } : this.layout === 'horizontal' ? { x: 9, y: Math.round(n / 2 + off) } : { x: Math.round(n / 2 + off), y: n - 10 };
    this.starts = [s0, { x: n - 1 - s0.x, y: n - 1 - s0.y }];
    this.center = { x: (n / 2) | 0, y: (n / 2) | 0 };
    const toC = { x: this.center.x - s0.x, y: this.center.y - s0.y }, tl = Math.hypot(toC.x, toC.y); toC.x /= tl; toC.y /= tl;
    this.toCenter = toC;
    // 2. raw terrain from noise, tuned per land type, for one half and mirrored
    const P = { lakes: { forest: 0.53, lake: 0.72 }, river: { forest: 0.52, lake: 0.86 }, woods: { forest: 0.43, lake: 0.84 }, open: { forest: 0.6, lake: 0.8 } }[this.land];
    const forest = makeNoise(rng, 7 + rng() * 4), lake = makeNoise(rng, 10 + rng() * 6), detail = makeNoise(rng, 3);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (x + y > n - 1 || (x + y === n - 1 && x > y)) continue;
      let t = T_GRASS;
      const f = forest(x, y) * 0.75 + detail(x, y) * 0.25, l = lake(x + 400, y + 400);
      if (l > P.lake) t = T_WATER; else if (f > P.forest) t = T_TREE; else if (detail(x + 99, y + 99) > 0.92) t = T_ROCK;
      if (Math.min(x, y, n - 1 - x, n - 1 - y) < 2) t = T_TREE;     // the woods wall the map in
      this.setT(x, y, t);
    }
    for (let i = 0; i < n * n; i++) this.deco[i] = (rng() * 255) | 0;
    // 3. a river across the middle, square to the line between the bases (the fords come from the roads)
    if (this.land === 'river') {
      const pr = { x: -toC.y, y: toC.x }, start = { x: this.center.x + pr.x * n, y: this.center.y + pr.y * n };
      let x = start.x, y = start.y, wob = 0; const steps = n * 1.5;
      for (let s = 0; s <= steps; s++) { const k = s / steps; wob += (rng() - 0.5) * 0.5; wob *= 0.93;
        x = start.x + (this.center.x - start.x) * k + toC.x * wob * 6; y = start.y + (this.center.y - start.y) * k + toC.y * wob * 6;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = Math.round(x) + dx, ty = Math.round(y) + dy;
          if (this.inside(tx, ty) && Math.min(tx, ty, n - 1 - tx, n - 1 - ty) >= 2 && (Math.abs(dx) + Math.abs(dy) < 2 || rng() < 0.4)) this.setT(tx, ty, T_WATER); } }
    }
    // 4. stone ridges: short walls of rock that funnel armies (never across a key spot; cleared below anyway)
    const ridges = (this.land === 'open' ? 4 : 2) + ((rng() * 2) | 0);
    for (let r = 0; r < ridges; r++) {
      const a = { x: R(8, n - 8), y: R(8, n - 8) }; if (D(a, s0) > D(a, this.starts[1])) { a.x = n - 1 - a.x; a.y = n - 1 - a.y; }
      if (D(a, s0) < 14 * sc || D(a, this.center) < 9 * sc) continue;
      const ang = rng() * Math.PI, len = R(6, 11) * sc;
      for (let s = 0; s <= len; s += 0.5) { const tx = Math.round(a.x + Math.cos(ang) * s), ty = Math.round(a.y + Math.sin(ang) * s);
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1]]) { const qx = tx + ox, qy = ty + oy;     // two tiles thick
          if (this.inside(qx, qy) && Math.min(qx, qy, n - 1 - qx, n - 1 - qy) >= 2 && (ox + oy === 0 || rng() < 0.75)) this.setT(qx, qy, T_ROCK); } }
    }
    // 5. expansions: 2 or 3 per side, on your own half, spread out, not crowding the middle
    const want = n >= 80 && rng() < 0.45 ? 2 : 1, ex = [];          // ponds are big and few: one or two to fight over
    for (let tries = 0; tries < 600 && ex.length < want; tries++) {
      const p = { x: Math.round(R(9, n - 10)), y: Math.round(R(9, n - 10)) };
      const d0 = D(p, s0), d1 = D(p, this.starts[1]);
      if (d0 < 16 * sc || d0 > 36 * sc || d0 > d1 - 10 * sc || D(p, this.center) < 11 * sc) continue;
      if (ex.some(e => D(e, p) < 15 * sc)) continue;
      ex.push(p);
    }
    ex.sort((a, b) => D(a, s0) - D(b, s0));
    this.expos = ex.concat(ex.map(e => ({ x: n - 1 - e.x, y: n - 1 - e.y })));
    // 6. woods behind each base (wood close to home), then clear the key places
    for (let y = s0.y - 16; y <= s0.y + 16; y++) for (let x = s0.x - 16; x <= s0.x + 16; x++) {
      if (!this.inside(x, y) || Math.min(x, y, n - 1 - x, n - 1 - y) < 2) continue; const d = Math.hypot(x - s0.x, y - s0.y);
      const ahead = (x - s0.x) * toC.x + (y - s0.y) * toC.y;
      if (d > 10.5 && d < 15.5 && ahead < 3 && detail(x * 2, y * 2) > 0.2) this.setT(x, y, T_TREE); }
    this.clear(s0.x, s0.y, 9);
    for (const e of ex) this.clear(e.x, e.y, 9);   // room for a hall at the required distance from the pond
    this.clear(this.center.x, this.center.y, 6);
    // the home fishing pond: towards the middle, a little to the side, so the way out stays open
    const side = { x: -toC.y, y: toC.x }, fc = { x: s0.x + toC.x * 6 + side.x * 3.5, y: s0.y + toC.y * 6 + side.y * 3.5 };
    this.homeFish = { x: Math.round(fc.x - 1.5), y: Math.round(fc.y - 1.5) };
    // …and as far from the hall as any hall may be from a pond (the rule in core.js: 3 clear tiles)
    for (let k = 0; k < 12; k++) { const h = this.homeFish, gx = Math.max(h.x - (s0.x + 2), (s0.x - 2) - (h.x + 3), 0), gy = Math.max(h.y - (s0.y + 2), (s0.y - 2) - (h.y + 3), 0);
      if (Math.max(gx, gy) >= 3) break; fc.x += toC.x * 0.5; fc.y += toC.y * 0.5; this.homeFish = { x: Math.round(fc.x - 1.5), y: Math.round(fc.y - 1.5) }; }
    // 7. roads: home to each expansion, each expansion and home to the middle, and one flank road
    //    across to the other side (where there is a river, that is where the fords appear)
    // one main road home → first expansion → middle; narrow paths to the others; on a river map a
    // flank path across too, so there is more than one way over the water
    const nat = ex[0];
    if (nat) { this.road(s0, nat, rng, true); this.road(nat, this.center, rng, true); } else this.road(s0, this.center, rng, true);
    for (const e of ex.slice(1)) { const from = D(e, s0) < D(e, nat) ? s0 : nat; this.road(from, e, rng, false); }
    if (this.land === 'river' && ex.length > 1) this.road(ex[ex.length - 1], { x: n - 1 - ex[0].x, y: n - 1 - ex[0].y }, rng, false);
    // 8. creep camps: guarding every expansion, a few in the wilds, two big ones by the Exchange
    this.creepSites = [];
    for (const e of ex) { const v = { x: this.center.x - e.x, y: this.center.y - e.y }, l = Math.hypot(v.x, v.y) || 1;
      this.creepSites.push({ x: Math.round(e.x + v.x / l * 3), y: Math.round(e.y + v.y / l * 3), tier: 1 }); }
    const wild = [];
    for (let tries = 0; tries < 400 && wild.length < 2 + ((rng() * 2) | 0); tries++) {
      const p = { x: Math.round(R(8, n - 9)), y: Math.round(R(8, n - 9)) };
      if (D(p, s0) > D(p, this.starts[1]) - 4 || D(p, s0) < 15 * sc || D(p, this.center) < 9 * sc) continue;
      if (ex.some(e => D(e, p) < 9 * sc) || wild.some(w => D(w, p) < 10 * sc)) continue;
      wild.push(p);
    }
    for (const w of wild) { this.clear(w.x, w.y, 3); this.creepSites.push({ x: w.x, y: w.y, tier: 0 }); }
    this.creepSites = this.creepSites.concat(this.creepSites.map(c => ({ x: n - 1 - c.x, y: n - 1 - c.y, tier: c.tier })));
    this.creepSites.push({ x: Math.round(this.center.x + side.x * 4), y: Math.round(this.center.y + side.y * 4), tier: 2 },
                         { x: Math.round(this.center.x - side.x * 4), y: Math.round(this.center.y - side.y * 4), tier: 2 });
    // the mid-game fish migration lands on the wild spot nearest the middle (and its mirror)
    this.lane = wild.slice().sort((a, b) => D(a, this.center) - D(b, this.center))[0] || { x: Math.round(this.center.x - toC.x * 12), y: Math.round(this.center.y - toC.y * 12) };
    // 9. checks: everything reachable from home, and enough wood near it
    const reach = this.flood(s0.x, s0.y);
    for (const target of [this.starts[1], this.center, ...this.expos, ...wild]) if (!reach[this.idx(target.x, target.y)]) this.road(s0, target, rng);
    let trees = 0; for (let y = s0.y - 15; y <= s0.y + 15; y++) for (let x = s0.x - 15; x <= s0.x + 15; x++) if (this.isTree(x, y)) trees++;
    if (trees < 70) for (let a = 0; a < 360; a += 4) { const r = R(11, 14), x = Math.round(s0.x - toC.x * 6 + Math.cos(a * Math.PI / 180) * r), y = Math.round(s0.y - toC.y * 6 + Math.sin(a * Math.PI / 180) * r);
      if (this.inside(x, y) && Math.min(x, y, n - 1 - x, n - 1 - y) >= 2 && Math.hypot(x - s0.x, y - s0.y) > 10 && this.terr(x, y) === T_GRASS) this.setT(x, y, T_TREE); }
    // 10. wood value of every tree
    for (let i = 0; i < n * n; i++) if (this.t[i] === T_TREE) this.wood[i] = 150;
  }
  flood(sx, sy) {
    const n = this.n, seen = new Uint8Array(n * n), q = [sy * n + sx]; seen[q[0]] = 1;
    while (q.length) { const i = q.pop(), x = i % n, y = (i / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!this.inside(nx, ny)) continue; const j = ny * n + nx;
        if (!seen[j] && this.walkTerr(nx, ny)) { seen[j] = 1; q.push(j); } } }
    return seen;
  }
  setT(x, y, t) { const n = this.n; this.t[this.idx(x, y)] = t; this.t[this.idx(n - 1 - x, n - 1 - y)] = t; }
  clear(cx, cy, r) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (!this.inside(x, y) || Math.min(x, y, this.n - 1 - x, this.n - 1 - y) < 2) continue;
      const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
      const t = this.terr(x, y);
      if (d < r - 1.5) this.setT(x, y, t === T_DIRT ? T_DIRT : T_GRASS);
      else if (t === T_WATER || t === T_TREE || t === T_ROCK) this.setT(x, y, T_GRASS);
    }
  }
  // a wobbly dirt road, three tiles wide
  road(a, b, rng, wide = true) {
    let x = a.x, y = a.y; const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 1.2); let wob = 0;
    for (let s = 0; s <= steps; s++) {
      const k = s / steps; wob += (rng() - 0.5) * 0.6; wob *= 0.9;
      x = a.x + (b.x - a.x) * k + (b.y - a.y) / steps * wob * 3; y = a.y + (b.y - a.y) * k - (b.x - a.x) / steps * wob * 3;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const tx = Math.round(x) + dx, ty = Math.round(y) + dy;
        if (!this.inside(tx, ty) || Math.min(tx, ty, this.n - 1 - tx, this.n - 1 - ty) < 2) continue;
        if (dx && dy) continue;                                   // a plus-shaped brush: a solid two-tile path
        if (!wide && (dx || dy) && rng() < 0.7) continue;         // a footpath: mostly one tile wide
        this.setT(tx, ty, (dx === 0 && dy === 0) || rng() < 0.85 ? T_DIRT : this.terr(tx, ty) === T_DIRT ? T_DIRT : T_GRASS);
      }
    }
  }
  // chop: returns wood taken; turns the tree into a stump when it runs out
  chop(x, y, amount) {
    const i = this.idx(x, y); if (this.t[i] !== T_TREE) return 0;
    const got = Math.min(amount, this.wood[i]); this.wood[i] -= got;
    if (this.wood[i] <= 0) { this.t[i] = T_STUMP; this.dirty.push(i); this.felled.push(i); }
    return got;
  }
  // nearest tree tile to a point (that has a walkable neighbour), searching outward in rings
  nearestTree(px, py, maxR = 18, avoid) {
    const cx = Math.floor(px), cy = Math.floor(py); let best = null, bd = 1e9;
    for (let r = 0; r <= maxR; r++) {
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || !this.isTree(x, y)) continue;
        if (avoid && avoid(x, y)) continue;
        if (!this.treeReachable(x, y)) continue;
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py); if (d < bd) { bd = d; best = { x, y }; }
      }
      if (best && r > bd + 1) break;
    }
    return best;
  }
  treeReachable(x, y) { for (const [dx, dy] of NB8) if (this.passable(x + dx, y + dy)) return true; return false; }

  // ── A* over the tile grid (8 directions, no cutting corners past walls) ──
  // goal not walkable → aims at the nearest walkable tile next to it.
  findPath(sx, sy, gx, gy, maxNodes = 9000) {
    const n = this.n; let x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.floor(gx), y1 = Math.floor(gy);
    if (!this.inside(x1, y1)) { x1 = Math.max(0, Math.min(n - 1, x1)); y1 = Math.max(0, Math.min(n - 1, y1)); }
    if (!this.passable(x0, y0)) { const p = this.nearestPassable(x0, y0, 4); if (p) { x0 = p.x; y0 = p.y; } }
    if (!this.passable(x1, y1)) { const p = this.nearestPassable(x1, y1, 8, x0, y0); if (!p) return null; x1 = p.x; y1 = p.y; }
    if (x0 === x1 && y0 === y1) return [{ x: gx, y: gy }];
    if (this.lineClear(x0 + 0.5, y0 + 0.5, x1 + 0.5, y1 + 0.5)) return [{ x: x1 + 0.5, y: y1 + 0.5 }];
    const N = n * n;
    if (!this._g || this._g.length !== N) { this._g = new Float32Array(N); this._from = new Int32Array(N); this._stamp = new Uint32Array(N); this._closed = new Uint32Array(N); this._run = 0; }
    const G = this._g, from = this._from, stamp = this._stamp, closed = this._closed; const run = ++this._run;
    const heap = new MinHeap(); const start = y0 * n + x0, goal = y1 * n + x1;
    const h = i => { const dx = Math.abs((i % n) - x1), dy = Math.abs(((i / n) | 0) - y1); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
    stamp[start] = run; G[start] = 0; from[start] = -1; heap.push(start, h(start));
    let bestI = start, bestH = h(start), count = 0;
    while (heap.size) {
      const cur = heap.pop(); if (closed[cur] === run) continue; closed[cur] = run;
      if (cur === goal) { bestI = cur; break; }
      if (++count > maxNodes) break;
      const cx = cur % n, cy = (cur / n) | 0;
      for (let k = 0; k < 8; k++) {
        const dx = NB8[k][0], dy = NB8[k][1], nx = cx + dx, ny = cy + dy;
        if (!this.passable(nx, ny)) continue;
        if (dx && dy && (!this.passable(cx + dx, cy) || !this.passable(cx, cy + dy))) continue;
        const ni = ny * n + nx; if (closed[ni] === run) continue;
        const ng = G[cur] + (dx && dy ? 1.4142 : 1);
        if (stamp[ni] !== run || ng < G[ni]) {
          stamp[ni] = run; G[ni] = ng; from[ni] = cur; const hh = h(ni); heap.push(ni, ng + hh * 1.05);
          if (hh < bestH) { bestH = hh; bestI = ni; }
        }
      }
    }
    // walk back (to the goal, or as close as we got)
    const tiles = []; let i = bestI; while (i !== -1 && stamp[i] === run) { tiles.push(i); if (i === start) break; i = from[i]; }
    tiles.reverse();
    // string-pull: keep only the corners we cannot see past
    const pts = []; let anchor = { x: x0 + 0.5, y: y0 + 0.5 };
    for (let k = 1; k < tiles.length; k++) {
      const p = { x: tiles[k] % n + 0.5, y: ((tiles[k] / n) | 0) + 0.5 };
      const next = k + 1 < tiles.length ? { x: tiles[k + 1] % n + 0.5, y: ((tiles[k + 1] / n) | 0) + 0.5 } : null;
      if (!next || !this.lineClear(anchor.x, anchor.y, next.x, next.y)) { pts.push(p); anchor = p; }
    }
    if (bestI === goal && pts.length) { const last = pts[pts.length - 1]; if (this.passable(Math.floor(gx), Math.floor(gy))) { last.x = gx; last.y = gy; } }
    return pts.length ? pts : null;
  }
  // walk a line in small steps; every tile it touches must be walkable
  lineClear(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), steps = Math.ceil(d * 3);
    for (let s = 1; s <= steps; s++) { const k = s / steps, x = ax + (bx - ax) * k, y = ay + (by - ay) * k;
      if (!this.passable(Math.floor(x), Math.floor(y))) return false;
      if (!this.passable(Math.floor(x + 0.3), Math.floor(y)) || !this.passable(Math.floor(x - 0.3), Math.floor(y))
        || !this.passable(Math.floor(x), Math.floor(y + 0.3)) || !this.passable(Math.floor(x), Math.floor(y - 0.3))) return false; }
    return true;
  }
  nearestPassable(x, y, maxR, towardX, towardY) {
    let best = null, bd = 1e9;
    for (let r = 1; r <= maxR; r++) {
      for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
        if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== r || !this.passable(xx, yy)) continue;
        const d = Math.hypot(xx - x, yy - y) + (towardX != null ? Math.hypot(xx - towardX, yy - towardY) * 0.01 : 0);
        if (d < bd) { bd = d; best = { x: xx, y: yy }; }
      }
      if (best) return best;
    }
    return best;
  }
  // can a building of `size` go here? (top-left tile)
  canPlace(tx, ty, size, units) {
    for (let y = ty; y < ty + size; y++) for (let x = tx; x < tx + size; x++) {
      if (!this.inside(x, y) || !this.walkTerr(x, y) || this.block[this.idx(x, y)]) return false;
    }
    if (units) for (const u of units) { if (u.dead || u.isBuilding) continue;
      if (u.x + u.r > tx && u.x - u.r < tx + size && u.y + u.r > ty && u.y - u.r < ty + size && !u.ignorePlace) return false; }
    return true;
  }
  setBlock(tx, ty, size, on) { for (let y = ty; y < ty + size; y++) for (let x = tx; x < tx + size; x++) if (this.inside(x, y)) this.block[this.idx(x, y)] = on ? 1 : 0; }
}
const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

class MinHeap {
  constructor() { this.k = []; this.p = []; this.size = 0; }
  push(k, p) { const a = this.k, b = this.p; let i = this.size++; a[i] = k; b[i] = p;
    while (i > 0) { const q = (i - 1) >> 1; if (b[q] <= p) break; a[i] = a[q]; b[i] = b[q]; i = q; } a[i] = k; b[i] = p; }
  pop() { const a = this.k, b = this.p, top = a[0], n = --this.size; if (n <= 0) return top;
    const k = a[n], p = b[n]; let i = 0;
    while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && b[c + 1] < b[c]) c++; if (b[c] >= p) break; a[i] = a[c]; b[i] = b[c]; i = c; }
    a[i] = k; b[i] = p; return top; }
}
