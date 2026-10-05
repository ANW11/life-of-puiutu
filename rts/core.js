// Border War — the simulation: entities, orders, economy, combat, heroes, fog of war.
// Positions are in tiles (floats); a unit at (3.5, 7.5) stands in the middle of tile (3,7).
'use strict';
const P_HUMAN = 0, P_AI = 1, P_CREEP = 2, P_NEUTRAL = 3;
let G = null;
// whose eyes the screen is: 0 alone or as host, 1 when you joined a friend's game
let ME = 0;

function rnd(a, b) { return a + Math.random() * (b - a); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ── a new game ──
function newGame(opt) {
  const map = new GameMap(opt.size || 80, opt.seed || ((Math.random() * 1e9) | 0));
  G = { map, n: map.n, time: 0, ents: [], byId: new Map(), nextId: 1, proj: [], fx: [], clouds: [], items: [],
        msgs: [], alerts: [], over: null, opt, events: { migration: false }, floods: [], rain: null };
  const fac = [opt.faction, opt.faction === 'cats' ? 'rats' : 'cats'];
  G.players = [0, 1].map(i => ({ id: i, faction: fac[i], fish: 500, wood: 200, supUsed: 0, supCap: 0,
    up: { weap: 0, arm: 0, catnip: 0, scurry: 0 }, ai: i === P_AI, researching: {},
    stats: { trained: 0, killed: 0, lost: 0, fish: 0, wood: 0, built: 0 } }));
  G.players.push({ id: P_CREEP, faction: 'creep', up: { weap: 0, arm: 0 } }, { id: P_NEUTRAL, faction: 'neutral', up: { weap: 0, arm: 0 } });
  // fog for the human player
  G.vis = new Uint8Array(G.n * G.n); G.seen = new Uint8Array(G.n * G.n); G.visT = 0;
  // bases
  // player 1's base is player 0's turned half a circle, to the tile — so neither start is better
  const n = map.n, s0 = map.starts[0], mir = (x, y, size) => [n - x - size, n - y - size];
  const layout = { hall: [s0.x - 2, s0.y - 2], fish: [map.homeFish.x, map.homeFish.y] };   // a pond is 3×3
  for (const p of [0, 1]) {
    const fac = G.players[p].faction, H = p ? mir(...layout.hall, 4) : layout.hall, F = p ? mir(...layout.fish, 3) : layout.fish;
    spawnBuilding(HALL[fac], p, H[0], H[1], true);
    const fs = spawnFish(F[0], F[1], 8000);   // runs low around minute eight or nine: time to expand
    const tc = map.toCenter;   // the workers start between the hall and the pond
    for (let i = 0; i < 5; i++) { let x = s0.x + 0.5 + tc.x * 3 + ((i % 3) - 1) * 0.7, y = s0.y + 0.5 + tc.y * 3 + ((i / 3 | 0) - 0.5) * 0.8; if (p) { x = n - x; y = n - y; }
      orderGather(spawnUnit(WORKER[fac], p, x, y), fs); }
  }
  // expansions and their fish
  for (const e of map.expos) spawnFish(e.x - 1, e.y - 1, 5000);
  // the Exchange
  spawnBuilding('exchange', P_NEUTRAL, map.center.x - 1, map.center.y - 1, true).stock = { snout: 1, mechboar: 1, merlin: 1 };
  // creep camps (mirrored pairs get the same camp so it stays fair)
  const pick = {}; for (const site of map.creepSites) {
    const key = site.tier + ':' + Math.round(Math.min(site.x, G.n - 1 - site.x)) + Math.round(Math.min(site.y, G.n - 1 - site.y));
    const options = CAMPS.filter(c => c.tier === site.tier);
    const camp = pick[key] || (pick[key] = options[(Math.random() * options.length) | 0]);
    camp.units.forEach((k, i) => { const a = i / camp.units.length * Math.PI * 2;
      const u = spawnUnit(k, P_CREEP, site.x + 0.5 + Math.cos(a) * 1.2, site.y + 0.5 + Math.sin(a) * 1.2);
      u.home = { x: u.x, y: u.y }; u.camp = site; u.facing = Math.random() < 0.5 ? -1 : 1; });
    site.tierLoot = camp.tier;
  }
  recalcSupply(); updateVision();      // the fog lifts around your base from the first frame
  return G;
}

// ── entities ──
function addEnt(e) { e.id = G.nextId++; G.ents.push(e); G.byId.set(e.id, e); return e; }
function spawnUnit(kind, owner, x, y) {
  const d = UNITS[kind];
  const u = addEnt({ kind, def: d, owner, x, y, r: d.r, hp: d.hp, maxHp: d.hp, isUnit: true, facing: owner === P_AI ? -1 : 1,
    order: null, queue: [], path: null, atkCD: Math.random() * 0.5, anim: Math.random() * 10, buffs: {}, carry: null,
    level: d.hero ? 1 : 0, xp: 0, mana: d.mana || 0, maxMana: d.mana || 0, cds: {}, items: [], swing: 0 });
  if (d.hero) { G.players[owner].hero = u.id; }
  return u;
}
function spawnBuilding(kind, owner, tx, ty, done) {
  const d = BUILDINGS[kind];
  const b = addEnt({ kind, def: d, owner, tx, ty, size: d.size, x: tx + d.size / 2, y: ty + d.size / 2, r: d.size * 0.5,
    hp: done ? d.hp : d.hp * 0.1, maxHp: d.hp, isBuilding: true, built: !!done, progress: done ? 1 : 0, prodQ: [], rally: null, atkCD: 0 });
  G.map.setBlock(tx, ty, d.size, true);
  return b;
}
function spawnFish(tx, ty, amount) {
  const f = addEnt({ kind: 'fishspot', owner: P_NEUTRAL, tx, ty, size: 3, x: tx + 1.5, y: ty + 1.5, r: 1.5, isRes: true, amount, max: amount, hp: 1, maxHp: 1 });
  G.map.setBlock(tx, ty, 3, true);
  return f;
}
// a town hall keeps its distance from the fish: dropped right on a pond, every trip would be one
// step long and the economy would run away. Counted in empty tiles between the two footprints.
const HALL_POND_GAP = 3;
function pondGap(tx, ty, size) {
  let g = Infinity;
  for (const f of G.ents) { if (f.dead || !f.isRes) continue;
    const gx = Math.max(f.tx - (tx + size), tx - (f.tx + f.size), 0), gy = Math.max(f.ty - (ty + size), ty - (f.ty + f.size), 0);
    g = Math.min(g, Math.max(gx, gy)); }
  return g;
}
function tooCloseToFish(kind, tx, ty) { const d = BUILDINGS[kind]; return !!d.hall && pondGap(tx, ty, d.size) < HALL_POND_GAP; }
function placeOk(kind, tx, ty, units) { return G.map.canPlace(tx, ty, BUILDINGS[kind].size, units) && !tooCloseToFish(kind, tx, ty); }
const TOO_CLOSE_MSG = 'Town halls must stand at least ' + HALL_POND_GAP + ' tiles from a fishing pond.';
function removeEnt(e) {
  e.dead = true; G.byId.delete(e.id);
  if (e.isBuilding || e.isRes) G.map.setBlock(e.tx, e.ty, e.size, false);
}
function enemyOf(a, b) {
  if (a === b) return false; if (a === P_NEUTRAL || b === P_NEUTRAL) return false;
  return true;   // players vs each other, everyone vs creeps
}
function playerHalls(p) { return G.ents.filter(e => !e.dead && e.owner === p && e.isBuilding && e.built && e.def.hall); }

// ── stats with upgrades, levels, items and buffs ──
function itemBonus(u, k) { let s = 0; for (const it of u.items) { const p = ITEMS[it].pass; if (p && p[k]) s += p[k]; } return s; }
function uDmg(u) { const d = u.def, pl = G.players[u.owner], up = (pl.up.weap || 0) * 2, lv = u.level ? (u.level - 1) * 3 : 0;
  return (rnd(d.dmg[0], d.dmg[1]) + up + lv + itemBonus(u, 'dmg')) * moraleMul(u, 'dmg'); }
function uArmor(u) { if (u.isBuilding) return u.def.armor; const pl = G.players[u.owner];
  return u.def.armor + (pl.up.arm || 0) * 1.5 + (u.level ? (u.level - 1) * 0.4 : 0) + itemBonus(u, 'armor') + (u.buffs.ward ? 3 : 0); }
function uSpeed(u) { let s = u.def.speed + itemBonus(u, 'speed');
  if (G.players[u.owner].up && G.players[u.owner].up.scurry && (u.kind === 'ratsoldier' || u.kind === 'scavenger')) s *= 1.15;
  if (u.buffs.frenzy) s *= 1.2; if (u.buffs.slow) s *= 0.7; return s * moraleMul(u, 'speed'); }
function uRange(u) { let r = u.def.range; if (u.kind === 'slinger' && G.players[u.owner].up.catnip) r += 1.5; return r; }
function uCd(u) { return u.def.cd * (u.buffs.frenzy ? 0.65 : 1) / (1 + itemBonus(u, 'aspd')); }
function uMaxHp(u) { return u.def.hp + (u.level ? (u.level - 1) * 70 : 0) + itemBonus(u, 'hp'); }

// ── supply ──
function recalcSupply() {
  for (const p of [0, 1]) { const pl = G.players[p]; let cap = 0, used = 0;
    for (const e of G.ents) { if (e.dead || e.owner !== p) continue;
      if (e.isBuilding && e.built && e.def.supply) cap += e.def.supply;
      if (e.isUnit) used += e.def.sup || 0;
      if (e.isBuilding) for (const q of e.prodQ) if (q.unit) used += qSup(q.unit); }
    pl.supCap = Math.min(80, cap); pl.supUsed = used; }
}
function canAfford(p, cost) { const pl = G.players[p]; return pl.fish >= (cost.f || 0) && pl.wood >= (cost.w || 0); }
function pay(p, cost) { const pl = G.players[p]; pl.fish -= cost.f || 0; pl.wood -= cost.w || 0; }
function refund(p, cost, k = 1) { const pl = G.players[p]; pl.fish += Math.round((cost.f || 0) * k); pl.wood += Math.round((cost.w || 0) * k); }
function hasBuilt(p, kind) { return G.ents.some(e => !e.dead && e.owner === p && e.isBuilding && e.built && e.kind === kind); }
function reqMet(p, def) { return !def.req || def.req.every(k => hasBuilt(p, k)); }
// messages are tagged with the player they are for; each screen shows its own (the host sends the guest theirs)
function say(p, text, col) { if (p === 0 || p === 1) G.msgs.push({ p, text, col: col || '#ffe7b0', t: G.time, id: (G.msgId = (G.msgId || 0) + 1) }); }

// ── orders ── (queue = shift-queued orders)
function setOrder(u, o, queue) {
  if (u.dead || u.isBuilding) return;
  if (queue && u.order) { u.queue.push(o); return; }
  if (u.order && u.order.type === 'build' && u.order.site && !u.order.started) refund(u.owner, BUILDINGS[u.order.kind].cost);
  u.order = o; u.queue = []; u.path = null; u.repath = 0; u.target = null; u.gatherT = 0;
  if (o && o.type === 'build') { /* paid on order */ }
}
function nextOrder(u) { u.order = u.queue.length ? u.queue.shift() : null; u.path = null; u.target = null; }
function orderMove(u, x, y, q) { setOrder(u, { type: 'move', x, y }, q); }
function orderAMove(u, x, y, q) { setOrder(u, { type: 'amove', x, y }, q); }
function orderAttack(u, t, q) { setOrder(u, { type: 'attack', target: t.id }, q); }
function orderGather(u, res, q) { if (!u.def.worker) return; setOrder(u, { type: 'gather', res: res.id }, q); }
function orderChop(u, tx, ty, q) { if (!u.def.worker) return; setOrder(u, { type: 'chop', tx, ty }, q); }
function orderHold(u) { setOrder(u, { type: 'hold', x: u.x, y: u.y }); }
function orderStop(u) { setOrder(u, null); }
function orderBuild(u, kind, tx, ty, q) {
  const d = BUILDINGS[kind]; if (!canAfford(u.owner, d.cost)) { say(u.owner, 'Not enough ' + (G.players[u.owner].fish < d.cost.f ? 'fish' : 'wood') + '.', '#ff9a8a'); return false; }
  if (!G.map.canPlace(tx, ty, d.size)) { say(u.owner, "Can't build there.", '#ff9a8a'); return false; }
  if (tooCloseToFish(kind, tx, ty)) { say(u.owner, TOO_CLOSE_MSG, '#ff9a8a'); return false; }
  if (u.order && (u.order.type === 'gather' || u.order.type === 'chop')) u.prevWork = Object.assign({}, u.order, { phase: 'go' });
  pay(u.owner, d.cost); setOrder(u, { type: 'build', kind, tx, ty, site: true, started: false }, q); return true;
}
function orderPickup(u, item) { setOrder(u, { type: 'pickup', item }); }

// a smart right-click: what a unit should do with whatever is under the cursor
function smartOrder(u, x, y, ent, tree, q) {
  if (ent && !ent.dead) {
    if (ent.isRes && u.def.worker) return orderGather(u, ent, q);
    if (ent.isBuilding && ent.owner === u.owner && !ent.built && u.def.worker) return setOrder(u, { type: 'repairbuild', target: ent.id }, q);
    if (ent.isBuilding && ent.owner === u.owner && ent.kind === 'nest' && ent.built && !u.def.worker) return setOrder(u, { type: 'enter', nest: ent.id }, q);
    if (ent.isBuilding && ent.owner === u.owner && ent.def.hall && u.carry) return setOrder(u, { type: 'return' }, q);
    if (enemyOf(u.owner, ent.owner) && ent.owner !== P_NEUTRAL) return orderAttack(u, ent, q);
  }
  if (tree && u.def.worker) return orderChop(u, tree.x, tree.y, q);
  const it = G.items.find(i => Math.hypot(i.x - x, i.y - y) < 0.7);
  if (it && u.def.hero) return orderPickup(u, it);
  orderMove(u, x, y, q);
}

// a group moving to one point spreads out on arrival instead of piling up
function groupOrder(units, fn, x, y) {
  const n = units.length; if (!n) return;
  if (n === 1) return fn(units[0], x, y);
  const cx = units.reduce((s, u) => s + u.x, 0) / n, cy = units.reduce((s, u) => s + u.y, 0) / n;
  const cols = Math.ceil(Math.sqrt(n)), gap = 0.95;
  // keep each unit's place relative to the group if they are already together, else make a block
  const spread = Math.max(...units.map(u => Math.hypot(u.x - cx, u.y - cy)));
  units.forEach((u, i) => {
    let ox, oy; if (spread < 4) { ox = u.x - cx; oy = u.y - cy; }
    else { ox = (i % cols - (cols - 1) / 2) * gap; oy = (((i / cols) | 0) - (Math.ceil(n / cols) - 1) / 2) * gap; }
    let tx = x + ox, ty = y + oy;
    if (!G.map.passable(Math.floor(tx), Math.floor(ty))) { tx = x; ty = y; }
    fn(u, tx, ty);
  });
}

// ── production ──
function trainUnit(b, kind) {
  const d = UNITS[kind], pl = G.players[b.owner];
  if (!b.built || b.prodQ.length >= 5) return false;
  if (d.req && !reqMet(b.owner, d)) { say(b.owner, 'Requires ' + d.req.map(r => BUILDINGS[r].name).join(', ') + '.', '#ff9a8a'); return false; }
  if (d.hero && (pl.hero && G.byId.get(pl.hero) || b.prodQ.some(q => q.unit && UNITS[q.unit].hero) || pl.heroDead)) { say(b.owner, 'You already have a hero.', '#ff9a8a'); return false; }
  if (!canAfford(b.owner, d.cost)) { say(b.owner, 'Not enough ' + (pl.fish < d.cost.f ? 'fish' : 'wood') + '.', '#ff9a8a'); return false; }
  if (pl.supUsed + qSup(kind) > pl.supCap) { say(b.owner, 'Not enough supply — build more ' + (pl.faction === 'cats' ? 'Cottages' : 'Nests') + '.', '#ff9a8a'); return false; }
  pay(b.owner, d.cost); b.prodQ.push({ unit: kind, t: 0, total: d.time }); recalcSupply(); return true;
}
function reviveHero(b) {
  const pl = G.players[b.owner], h = pl.heroDead; if (!h || b.prodQ.some(q => q.revive)) return false;
  const cost = { f: 150 + 40 * h.level, w: 0 }; if (!canAfford(b.owner, cost)) { say(b.owner, 'Not enough fish.', '#ff9a8a'); return false; }
  pay(b.owner, cost); b.prodQ.push({ revive: true, t: 0, total: 20 + 4 * h.level, cost }); return true;
}
function research(b, up) {
  const pl = G.players[b.owner], U = UPGRADES[up], lvl = pl.up[up] || 0;
  if (lvl >= U.levels.length || pl.researching[up] || !b.built || b.prodQ.length >= 5) return false;
  const c = U.levels[lvl]; if (!canAfford(b.owner, c)) { say(b.owner, 'Not enough ' + (pl.fish < c.f ? 'fish' : 'wood') + '.', '#ff9a8a'); return false; }
  pay(b.owner, c); pl.researching[up] = true; b.prodQ.push({ up, t: 0, total: c.time, cost: c }); return true;
}
function cancelQueue(b, i) {
  const q = b.prodQ[i]; if (!q) return; b.prodQ.splice(i, 1);
  if (q.unit) refund(b.owner, UNITS[q.unit].cost); if (q.up) { refund(b.owner, q.cost); delete G.players[b.owner].researching[q.up]; }
  if (q.revive) refund(b.owner, q.cost);
  recalcSupply();
}
function hireMerc(ex, kind, p) {
  const d = UNITS[kind], pl = G.players[p];
  const deal = EV.deal(ex, kind), cost = deal ? { f: deal.f, w: deal.w } : d.cost;
  if (!ex.stock[kind] && !deal) { say(p, 'Out of stock — the pigs restock in a while.', '#ff9a8a'); return false; }
  if (!G.ents.some(e => !e.dead && e.owner === p && e.isUnit && dist(e, ex) < 7)) { say(p, 'Bring a unit next to the Exchange first.', '#ff9a8a'); return false; }
  if (!canAfford(p, cost)) { say(p, 'Not enough ' + (pl.fish < cost.f ? 'fish' : 'wood') + '.', '#ff9a8a'); return false; }
  if (pl.supUsed + d.sup > pl.supCap) { say(p, 'Not enough supply.', '#ff9a8a'); return false; }
  pay(p, cost);
  if (deal) EV.dealTaken(ex, p); else { ex.stock[kind]--; ex.restock = ex.restock || {}; ex.restock[kind] = G.time + 120; }
  const u = spawnUnit(kind, p, ex.x + (p === 0 ? -2.2 : 2.2), ex.y + (p === 0 ? 2.2 : -2.2)); G.players[p].stats.trained++;
  recalcSupply(); say(p, d.name + ' hired.', '#ffd36b'); return u;
}
function updateBuilding(b, dt) {
  const pl = G.players[b.owner];
  if (b.kind === 'exchange') { if (b.restock) for (const k in b.restock) if (G.time > b.restock[k]) { b.stock[k] = 1; delete b.restock[k]; } return; }
  if (!b.built) return;
  if (b.prodQ.length) {
    const q = b.prodQ[0];
    if (q.unit && UNITS[q.unit].sup && pl.supUsed > pl.supCap) { /* waits for supply */ }
    else q.t += dt * (pl.ai ? AI_LEVELS[G.opt.level].income ** 0.5 : 1);
    if (q.t >= q.total) {
      b.prodQ.shift();
      if (q.unit) { const sp = exitSpot(b);
        for (let k = 0; k < (UNITS[q.unit].pair ? 2 : 1); k++) {   // rat soldiers hatch two at a time
          const u = spawnUnit(q.unit, b.owner, sp.x + k * 0.5, sp.y + k * 0.3); pl.stats.trained++;
          if (b.rally) { if (b.rally.res && u.def.worker) orderGather(u, b.rally.res); else if (b.rally.tree && u.def.worker) orderChop(u, b.rally.tree.x, b.rally.tree.y); else orderMove(u, b.rally.x, b.rally.y); } }
        say(b.owner, UNITS[q.unit].name + ' ready.', '#bfe8a8'); }
      if (q.up) { pl.up[q.up] = (pl.up[q.up] || 0) + 1; delete pl.researching[q.up]; say(b.owner, UPGRADES[q.up].name + ' researched.', '#bfe8a8'); }
      if (q.revive) { const h = pl.heroDead; pl.heroDead = null; const sp = exitSpot(b); const u = spawnUnit(HERO[pl.faction], b.owner, sp.x, sp.y);
        u.level = h.level; u.xp = h.xp; u.items = h.items; u.maxHp = uMaxHp(u); u.hp = u.maxHp; u.maxMana = u.def.mana + (u.level - 1) * 25; u.mana = u.maxMana;
        say(b.owner, 'Your hero has returned.', '#ffd36b'); }
      recalcSupply();
    }
  }
  if (b.def.tower) {
    b.atkCD -= dt; if (b.atkCD <= 0) {
      const tg = nearestEnemy(b, b.def.tower.range + b.size / 2);
      if (tg) { b.atkCD = b.def.tower.cd; fireProj(b, tg, rnd(...b.def.tower.dmg) + (pl.up.weap || 0) * 2, b.def.tower.proj); }
    }
  }
}
function exitSpot(b) {
  const sides = []; for (let i = -1; i <= b.size; i++) sides.push([b.tx + i, b.ty + b.size], [b.tx + i, b.ty - 1], [b.tx - 1, b.ty + i], [b.tx + b.size, b.ty + i]);
  const goal = b.rally || G.map.center;   // out of the door that faces the middle
  sides.sort((a, c) => Math.hypot(a[0] - goal.x, a[1] - goal.y) - Math.hypot(c[0] - goal.x, c[1] - goal.y));
  for (const [x, y] of sides) if (G.map.passable(x, y)) return { x: x + 0.5, y: y + 0.5 };
  return { x: b.x, y: b.ty + b.size + 0.5 };
}

// ── targeting ──
function nearestEnemy(from, range, filter) {
  let best = null, bd = range;
  for (const e of G.ents) {
    if (e.dead || e.isRes || e.tun || !enemyOf(from.owner, e.owner) || e.owner === P_NEUTRAL) continue;
    if (from.owner === P_CREEP && e.owner === P_CREEP) continue;
    if (filter && !filter(e)) continue;
    const d = dist(from, e) - (e.isBuilding ? e.size * 0.5 : e.r);
    // prefer things that fight back over walls and workers
    const pen = e.isBuilding ? (e.def.tower ? 0.5 : 3) : (e.def.worker ? 1 : 0);
    if (d + pen < bd) { bd = d + pen; best = e; }
  }
  return best;
}
// gap between two bodies; buildings and fishing spots are squares, so measure to their edge
function edgeDist(u, t) {
  if (t.isBuilding || t.isRes) { const dx = Math.max(t.tx - u.x, 0, u.x - (t.tx + t.size)), dy = Math.max(t.ty - u.y, 0, u.y - (t.ty + t.size)); return Math.hypot(dx, dy) - u.r; }
  return dist(u, t) - t.r - u.r; }

// ── movement ──
function moveTo(u, x, y, dt, stopAt = 0.15) {
  const sameGoal = u.pathGoal && Math.abs(u.pathGoal.x - x) < 0.01 && Math.abs(u.pathGoal.y - y) < 0.01;
  if (!u.path && sameGoal && G.time - (u.pathT || -9) < 0.7) {
    // already searched for this spot a moment ago and arrived as close as the map allows: just lean in
    const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy), sp = uSpeed(u) * dt * 0.5;
    if (d < 0.05) return true; u.x += dx / d * Math.min(sp, d); u.y += dy / d * Math.min(sp, d); return false;
  }
  if (!u.path || !sameGoal || G.time > u.repath) {
    u.path = G.map.findPath(u.x, u.y, x, y) || [{ x, y }]; u.pathGoal = { x, y }; u.repath = G.time + 4 + Math.random(); u.pathT = G.time;
  }
  const wp = u.path[0]; if (!wp) return true;
  const dx = wp.x - u.x, dy = wp.y - u.y, d = Math.hypot(dx, dy), sp = uSpeed(u) * dt;
  const last = u.path.length === 1;
  if (d <= Math.max(sp, last ? stopAt : 0.2)) { if (last) { u.path = null; u.moving = false; return true; } u.path.shift(); return false; }
  u.x += dx / d * Math.min(sp, d); u.y += dy / d * Math.min(sp, d); u.moving = true;
  if (Math.abs(dx) > 0.05) u.facing = dx < 0 ? -1 : 1;
  // stuck behind a crowd for too long: path again
  u.stuckT = (u.stuckT || 0) + dt; if (u.lastPos && Math.hypot(u.x - u.lastPos.x, u.y - u.lastPos.y) > 0.4) { u.lastPos = { x: u.x, y: u.y }; u.stuckT = 0; }
  if (!u.lastPos) u.lastPos = { x: u.x, y: u.y };
  if (u.stuckT > 2.5) { u.stuckT = 0; u.repath = 0; if (last && Math.hypot(x - u.x, y - u.y) < 2) { u.path = null; u.moving = false; return true; } }
  return false;
}
function faceTo(u, t) { if (Math.abs(t.x - u.x) > 0.05) u.facing = t.x < u.x ? -1 : 1; }

// ── combat ──
function attackStep(u, t, dt) {
  const range = uRange(u);
  if (edgeDist(u, t) > range) { moveTo(u, t.x, t.y, dt, 0.1); return false; }
  u.path = null; u.moving = false; faceTo(u, t);
  if (u.atkCD <= 0) {
    u.atkCD = uCd(u); u.combatT = G.time; u.swing = u.swingDur = Math.min(0.45, uCd(u) * 0.45); u.swingRanged = range > 2;
    let dmg = uDmg(u);
    if (u.def.beam) beamAttack(u, t, dmg);
    else if (u.def.proj || range > 2) fireProj(u, t, dmg, u.def.proj || 'arrow');
    else { hit(u, t, dmg); G.fx.push({ k: 'spark', x: t.x, y: t.y - (t.isBuilding ? 1 : 0.45), t: G.time, kind: 'melee' }); if (u.def.splash) for (const e of G.ents) if (e !== t && !e.dead && e.isUnit && enemyOf(u.owner, e.owner) && e.owner !== P_NEUTRAL && dist(e, t) < u.def.splash) hit(u, e, dmg * 0.5); }
  }
  return true;
}
function fireProj(src, t, dmg, kind) {
  const slowArc = kind === 'banana' || kind === 'hairball' || (kind && kind.startsWith('bomb'));
  G.proj.push({ x: src.x, y: src.y - (src.isBuilding ? 1 : 0.4), t: t.id, dmg, owner: src.owner, src: src.id, kind, sp: slowArc ? 9 : 13, slow: !!(src.def && src.def.slowOnHit),
    atk: atkType(src), splash: (src.def && src.def.splashR) || 0 });
}
// the Mech Boar's third eye: a violet beam from its forehead through the target and on to its full
// range, burning everything it crosses (the target takes the full hit, the rest of the line half)
function beamAttack(u, t, dmg) {
  const x1 = u.x + u.facing * 0.85, y1 = u.y - 1.25, dx = t.x - x1, dy = (t.y - 0.4) - y1, d = Math.hypot(dx, dy) || 1;
  const reach = uRange(u) + 1.5, x2 = x1 + dx / d * reach, y2 = y1 + dy / d * reach;
  hit(u, t, dmg);
  for (const e of G.ents) { if (e === t || e.dead || e.isRes || e.owner === u.owner || e.owner === P_NEUTRAL) continue;
    const px = e.x - x1, py = (e.y - 0.4) - y1, k = (px * dx + py * dy) / (d * d) * d / reach;   // how far along the beam
    if (k < 0 || k > 1) continue; const cx = x1 + (x2 - x1) * k, cy = y1 + (y2 - y1) * k;
    if (Math.hypot(e.x - cx, e.y - 0.4 - cy) < 0.6 + (e.isBuilding ? e.size / 2 : e.r)) hit(u, e, dmg * 0.5); }
  G.fx.push({ k: 'beam', x: x1, y: y1, x2, y2, t: G.time });
}
// what kind of hit, and what kind of hide (see DMG_TABLE)
function atkType(e) { if (!e || !e.def) return 'normal'; if (e.isBuilding) return e.def.tower ? 'pierce' : 'normal'; return e.def.atk || 'normal'; }
function armType(e) { if (e.isBuilding) return 'fortified'; return (e.def && e.def.arm) || 'medium'; }
function hit(src, t, dmg, atype) {
  if (t.dead || t.tun || t.def && t.def.invuln) return;
  if (atype !== 'spell') { const row = DMG_TABLE[atype || atkType(src)]; if (row) dmg *= row[armType(t)] || 1; }   // spells ignore the table
  const a = uArmor(t), red = a >= 0 ? (a * 0.06) / (1 + a * 0.06) : 0;
  dmg = Math.max(1, dmg * (1 - red));
  if (t.isUnit) { dmg = shieldAbsorb(t, dmg); t.combatT = G.time; }
  t.hp -= dmg; t.hitT = G.time;
  if (t.buffs && t.buffs.ninelives && t.hp < 1) t.hp = 1;
  // being hit wakes up idle units, and creeps call their camp
  if (t.isUnit && src && !src.dead && src.owner !== t.owner) {
    if (!t.order && !t.def.worker) setOrder(t, { type: 'attack', target: src.id, auto: true });
    if (t.owner === P_CREEP) for (const e of G.ents) if (!e.dead && e.camp === t.camp && !e.order) setOrder(e, { type: 'attack', target: src.id, auto: true });
  }
  G.lastAlert = G.lastAlert || [-99, -99];
  if ((t.owner === 0 || t.owner === 1) && G.time - G.lastAlert[t.owner] > 10 && src && src.owner !== t.owner) {
    G.lastAlert[t.owner] = G.time; G.alerts.push({ p: t.owner, x: t.x, y: t.y, t: G.time });
    say(t.owner, t.isBuilding ? 'Your base is under attack!' : 'Your forces are under attack!', '#ff8a7a');
  }
  if (t.hp <= 0) kill(t, src);
}
function kill(t, src) {
  if (t.dead) return; removeEnt(t);
  const killer = src ? src.owner : -1;
  if (t.owner <= 1) G.players[t.owner].stats.lost++;
  if (killer >= 0 && killer <= 1) G.players[killer].stats.killed++;
  G.fx.push({ k: 'poof', x: t.x, y: t.y, t: G.time, big: t.isBuilding ? t.size : 1 });
  if (t.isUnit && t.def.hero) { const pl = G.players[t.owner]; pl.hero = null; pl.heroDead = { level: t.level, xp: t.xp, items: t.items.slice() };
    say(t.owner, 'Your hero has fallen.', '#ff8a7a'); say(1 - t.owner, 'The enemy hero has fallen!', '#bfe8a8'); }
  // bounty and experience
  if (killer === 0 || killer === 1) {
    if (t.def.bounty) { G.players[killer].fish += t.def.bounty; G.fx.push({ k: 'txt', x: t.x, y: t.y - 1, t: G.time, text: '+' + t.def.bounty, col: '#ffd36b', coin: true }); }
    const xp = t.def.xp || (t.isBuilding ? 40 : t.def.hero ? 150 + t.level * 40 : (t.def.sup || 1) * 22);
    const heroes = G.ents.filter(e => !e.dead && e.isUnit && e.def.hero && e.owner === killer && dist(e, t) < 12);
    for (const h of heroes) gainXP(h, xp / heroes.length);
  }
  // creeps drop loot when their whole camp is gone
  if (t.owner === P_CREEP && t.camp && !G.ents.some(e => !e.dead && e.camp === t.camp)) {
    const tier = t.camp.tierLoot || 0; if (Math.random() < 0.55 + tier * 0.2) { const pool = ITEM_TIERS[tier]; G.items.push({ id: pool[(Math.random() * pool.length) | 0], x: t.x, y: t.y }); }
  }
  EV.onKill(t, killer); moraleOnKill(t, killer); nestLost(t);
  if (t.isBuilding) { recalcSupply(); checkEnd(); }
  if (t.isUnit) recalcSupply();
}
function gainXP(h, xp) {
  if (h.level >= HERO_MAX) return; h.xp += xp;
  while (h.level < HERO_MAX && h.xp >= HERO_XP[h.level]) {
    h.level++; const mh = uMaxHp(h); h.hp += mh - h.maxHp; h.maxHp = mh; h.maxMana += 25; h.mana += 25;
    G.fx.push({ k: 'lvl', x: h.x, y: h.y, t: G.time });
    { say(h.owner, h.def.name + ' reached level ' + h.level + '!', '#ffd36b');
      for (const a of h.def.abilities) if (ABILITIES[a].lvl === h.level) say(h.owner, 'New ability: ' + ABILITIES[a].name + ' (' + ABILITIES[a].key + ')', '#ffd36b'); }
  }
}
function checkEnd() {
  for (const p of [0, 1]) if (!G.ents.some(e => !e.dead && e.owner === p && e.isBuilding)) { G.over = { winner: 1 - p, t: G.time }; return; }
}
// a side with no town hall left (not even one going up) has HALL_GRACE seconds to raise a new one,
// so a beaten army doesn't have to be chased down to the very last shed
const HALL_GRACE = 90;
function hallWatch() {
  for (const p of [0, 1]) { const pl = G.players[p];
    if (G.ents.some(e => !e.dead && e.owner === p && e.isBuilding && e.def.hall)) { pl.noHallAt = null; continue; }
    if (pl.noHallAt == null) { pl.noHallAt = G.time; pl.hallWarn = 0;
      say(p, 'Your last town hall has fallen! Raise a new one within ' + HALL_GRACE + ' seconds or the war is lost.', '#ff8a7a');
      say(1 - p, 'The enemy has no town hall left. Hold them off for ' + HALL_GRACE + ' seconds and the war is yours.', '#bfe8a8'); continue; }
    const left = HALL_GRACE - (G.time - pl.noHallAt);
    const warns = [60, 30, 10]; while (pl.hallWarn < warns.length && left <= warns[pl.hallWarn]) say(p, warns[pl.hallWarn++] + ' seconds left to raise a town hall!', '#ff8a7a');
    if (left <= 0) { G.over = { winner: 1 - p, t: G.time, nohall: true }; return; }
  }
}

// ── hero abilities ──
function canCast(h, a) { const A = ABILITIES[a]; return h.level >= A.lvl && h.mana >= A.mana && !(h.cds[a] > G.time) && !h.buffs.stun; }
function castAbility(h, a, x, y) {
  const A = ABILITIES[a]; if (!canCast(h, a)) return false;
  if (A.target === 'point' && Math.hypot(x - h.x, y - h.y) > A.range) { setOrder(h, { type: 'cast', a, x, y }); return true; }
  h.mana -= A.mana; h.cds[a] = G.time + A.cd; h.swing = h.swingDur = 0.45; h.swingRanged = false;
  const lv = h.level, allies = r => G.ents.filter(e => !e.dead && e.isUnit && e.owner === h.owner && dist(e, h) < r);
  const foesAt = (px, py, r) => G.ents.filter(e => !e.dead && !e.isRes && e.owner !== h.owner && e.owner !== P_NEUTRAL && Math.hypot(e.x - px, e.y - py) < r + (e.r || 0));
  if (a === 'thunderpaw') { for (const e of foesAt(x, y, A.aoe)) { hit(h, e, 75 + lv * 16, 'spell'); if (e.isUnit) e.buffs.stun = G.time + 1.8; }
    G.fx.push({ k: 'icon', icon: 'thunderpaw', x, y, t: G.time, r: A.aoe }); }
  if (a === 'purrward') { for (const e of allies(A.aoe)) e.buffs.ward = G.time + 10; G.fx.push({ k: 'ring', x: h.x, y: h.y, t: G.time, r: A.aoe, col: '120,255,160' }); }
  if (a === 'ninelives') { for (const e of allies(A.aoe)) e.buffs.ninelives = G.time + 7; G.fx.push({ k: 'icon', icon: 'ninelives', x: h.x, y: h.y, t: G.time, r: A.aoe }); }
  if (a === 'plague') { G.clouds.push({ x, y, r: A.aoe, until: G.time + 6, dps: 12 + lv * 2.5, owner: h.owner, src: h.id }); }
  if (a === 'frenzy') { for (const e of allies(A.aoe)) e.buffs.frenzy = G.time + 10; G.fx.push({ k: 'ring', x: h.x, y: h.y, t: G.time, r: A.aoe, col: '255,200,80' }); }
  if (a === 'swarmcall') { for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2, s = spawnUnit('swarmrat', h.owner, h.x + Math.cos(ang) * 1.4, h.y + Math.sin(ang) * 1.4);
      s.expire = G.time + 30; if (h.order && h.order.target) setOrder(s, { type: 'attack', target: h.order.target }); }
    G.fx.push({ k: 'ring', x: h.x, y: h.y, t: G.time, r: 3, col: '200,120,255' }); }
  if (h.order && h.order.type === 'cast') nextOrder(h);
  return true;
}
// put an item down at the hero's feet (anyone's hero can pick it up again)
function dropItem(h, slot) {
  const id = h.items[slot]; if (!id) return;
  h.items.splice(slot, 1); G.items.push({ id, x: h.x + h.facing * 0.7, y: h.y + 0.5 });
  const mh = uMaxHp(h); h.maxHp = mh; h.hp = Math.min(h.hp, mh);
}
function useItem(h, slot) {
  const id = h.items[slot]; if (!id) return; const I = ITEMS[id]; if (!I.use) return;
  if (I.use === 'heal') h.hp = Math.min(h.maxHp, h.hp + 400);
  if (I.use === 'mana') h.mana = Math.min(h.maxMana, h.mana + 150);
  if (I.use === 'rally') for (const e of G.ents) if (!e.dead && e.isUnit && e.owner === h.owner && dist(e, h) < 6) e.hp = Math.min(e.maxHp, e.hp + 250);
  h.items.splice(slot, 1); G.fx.push({ k: 'ring', x: h.x, y: h.y, t: G.time, r: I.use === 'rally' ? 6 : 1.2, col: '255,160,160' });
}

// ── workers ──
function nearestHall(u) { let best = null, bd = 1e9; for (const h of playerHalls(u.owner)) { const d = dist(u, h); if (d < bd) { bd = d; best = h; } } return best; }
function workerStep(u, dt) {
  const o = u.order;
  // carrying something and told to gather: bring it home first
  if (o.type === 'return' || (u.carry && u.carry.amt > 0 && o.phase === 'return')) {
    const hall = nearestHall(u); if (!hall) { u.order = null; return; }
    if (edgeDist(u, hall) > 0.45) { moveTo(u, hall.x, hall.y, dt, 0.1); return; }
    const pl = G.players[u.owner], k = pl.ai ? AI_LEVELS[G.opt.level].income : 1;
    if (u.carry) { const amt = Math.round(u.carry.amt * k); if (u.carry.type === 'f') { pl.fish += amt; pl.stats.fish += amt; } else { pl.wood += amt; pl.stats.wood += amt; } }
    u.carry = null;
    if (o.type === 'return') { nextOrder(u); return; }
    o.phase = 'go'; u.path = null; return;
  }
  if (o.type === 'gather') {
    const res = G.byId.get(o.res);
    if (!res || res.dead) { const alt = nearestFish(u, 14); if (alt) { o.res = alt.id; return; } u.order = null; return; }
    if (u.carry && u.carry.type === 'f' && u.carry.amt >= ECON.carry) { o.phase = 'return'; return; }
    if (edgeDist(u, res) > 0.5) { moveTo(u, res.x, res.y, dt, 0.1); u.gatherT = 0; return; }
    u.moving = false; faceTo(u, res); u.gatherT += dt; u.working = true;
    if (u.gatherT >= ECON.fishTime) { u.gatherT = 0; const got = Math.min(ECON.carry, res.amount); res.amount -= got; u.carry = { type: 'f', amt: got }; o.phase = 'return';
      if (res.amount <= 0) { removeEnt(res); say(u.owner, 'A fishing spot has run dry.', '#ffcf8a'); } }
    return;
  }
  if (o.type === 'chop') {
    if (u.carry && u.carry.type === 'w' && u.carry.amt >= carryWood(u)) { o.phase = 'return'; return; }
    if (!G.map.isTree(o.tx, o.ty)) { const t = G.map.nearestTree(o.tx + 0.5, o.ty + 0.5, 12); if (!t) { u.order = null; return; } o.tx = t.x; o.ty = t.y; u.path = null; }
    const cx = o.tx + 0.5, cy = o.ty + 0.5, d = Math.hypot(cx - u.x, cy - u.y);
    if (d > 1.15) { moveTo(u, cx, cy, dt, 0.05); u.gatherT = 0;
      // the path ends next to the tree; if we cannot get any closer, pick another tree
      if (!u.path && d > 1.6) { u.chopFail = (u.chopFail || 0) + 1; if (u.chopFail > 3) { const t = G.map.nearestTree(u.x, u.y, 12, (x, y) => x === o.tx && y === o.ty); if (t) { o.tx = t.x; o.ty = t.y; } u.chopFail = 0; } }
      return; }
    u.chopFail = 0; u.moving = false; faceTo(u, { x: cx, y: cy }); u.gatherT += dt; u.working = true;
    if (u.gatherT >= ECON.woodTime) { u.gatherT = 0; const got = G.map.chop(o.tx, o.ty, carryWood(u)); u.carry = { type: 'w', amt: (u.carry && u.carry.type === 'w' ? u.carry.amt : 0) + got }; if (u.carry.amt > 0) o.phase = 'return'; }
    return;
  }
}
function carryWood(u) { return ECON.carry + (G.players[u.owner].up.catnip ? 3 : 0); }
function nearestFish(u, r) { let best = null, bd = r; for (const e of G.ents) if (!e.dead && e.isRes && dist(u, e) < bd) { bd = dist(u, e); best = e; } return best; }

function buildStep(u, dt) {
  const o = u.order, d = BUILDINGS[o.kind];
  if (o.type === 'repairbuild') { const b = G.byId.get(o.target); if (!b || b.dead || b.built) { nextOrder(u); return; } return constructStep(u, b, dt); }
  if (!o.started) {
    const cx = o.tx + d.size / 2, cy = o.ty + d.size / 2;
    if (Math.max(Math.abs(u.x - cx), Math.abs(u.y - cy)) > d.size / 2 + 0.8) { moveTo(u, cx, cy, dt, 0.1); return; }
    if (!placeOk(o.kind, o.tx, o.ty)) { refund(u.owner, d.cost); say(u.owner, "Can't build there any more.", '#ff9a8a'); nextOrder(u); return; }
    const b = spawnBuilding(o.kind, u.owner, o.tx, o.ty, false); b.builder = u.id; o.started = true; o.bid = b.id; G.players[u.owner].stats.built++;
    // anyone standing on the plot steps off it
    for (const e of G.ents) if (!e.dead && e.isUnit && e !== u && e.x > o.tx - 0.3 && e.x < o.tx + d.size + 0.3 && e.y > o.ty - 0.3 && e.y < o.ty + d.size + 0.3) { const p = G.map.nearestPassable(Math.floor(e.x), Math.floor(e.y), 6); if (p) { e.x = p.x + 0.5; e.y = p.y + 0.5; } }
    const p = G.map.nearestPassable(Math.floor(u.x), Math.floor(u.y), 6); if (p && !G.map.passable(Math.floor(u.x), Math.floor(u.y))) { u.x = p.x + 0.5; u.y = p.y + 0.5; }
  }
  const b = G.byId.get(o.bid); if (!b || b.dead) { nextOrder(u); return; }
  constructStep(u, b, dt);
}
function constructStep(u, b, dt) {
  if (edgeDist(u, b) > 0.6) { moveTo(u, b.x, b.y, dt, 0.1); return; }
  u.moving = false; u.working = true; faceTo(u, b);
  const d = b.def, k = G.players[u.owner].ai ? AI_LEVELS[G.opt.level].income ** 0.5 : 1;
  const step = dt / d.time * k; b.progress = Math.min(1, b.progress + step); b.hp = Math.min(b.maxHp, b.hp + d.hp * 0.9 * step);
  if (b.progress >= 1) { b.built = true; recalcSupply(); say(b.owner, d.name + ' complete.', '#bfe8a8');
    // a hall finished at an expansion: go straight back to work on its fish
    nextOrder(u); if (!u.order && d.hall) { const f = nearestFish(u, 8); if (f) orderGather(u, f); }
    if (!u.order && u.prevWork) { const w = u.prevWork; u.prevWork = null; if (w.type === 'gather' && G.byId.get(w.res)) setOrder(u, { type: 'gather', res: w.res }); else if (w.type === 'chop') setOrder(u, { type: 'chop', tx: w.tx, ty: w.ty }); } }
}

// ── one unit, one tick ──
function updateUnit(u, dt) {
  u.anim += dt; if (u.swing > 0) u.swing -= dt; u.atkCD -= dt; u.working = false;
  for (const k in u.buffs) if (u.buffs[k] < G.time) delete u.buffs[k];
  if (u.expire && G.time > u.expire) { removeEnt(u); recalcSupply(); return; }
  if (u.tun && tunnelWait(u)) return;
  factionTick(u, dt);
  if (u.def.hero) { u.hp = Math.min(u.maxHp, u.hp + dt * (0.6 + u.level * 0.15)); u.mana = Math.min(u.maxMana, u.mana + dt * (0.9 + u.level * 0.1)); }
  if (u.buffs.ward) u.hp = Math.min(u.maxHp, u.hp + 12 * dt);
  if (u.items.length) { const rg = itemBonus(u, 'regen'); if (rg) u.hp = Math.min(u.maxHp, u.hp + rg * dt); }
  if (u.buffs.stun) { u.moving = false; return; }
  // Merlin: every few seconds, mend the most hurt friend nearby
  if (u.def.healer) { u.healT = (u.healT || 0) - dt; if (u.healT <= 0) { u.healT = 0.5; let best = null, bd = 0;
      for (const e of G.ents) if (!e.dead && e.isUnit && e.owner === u.owner && dist(e, u) < 6 && e.maxHp - e.hp > 25) { const lack = (e.maxHp - e.hp) / e.maxHp; if (lack > bd) { bd = lack; best = e; } }
      if (best) { const amt = Math.min(55, best.maxHp - best.hp); best.hp += amt; u.healT = 3.5; u.swing = u.swingDur = 0.4; u.swingRanged = true; faceTo(u, best);
        G.fx.push({ k: 'ring', x: best.x, y: best.y, t: G.time, r: 0.9, col: '120,255,150' }, { k: 'txt', x: best.x, y: best.y - 1.2, t: G.time, text: '+' + Math.round(amt), col: '#9cff9c' }); } } }
  // creeps: back to camp when they stray, and heal there
  if (u.owner === P_CREEP) {
    if (u.home && Math.hypot(u.x - u.home.x, u.y - u.home.y) > 8 && !(u.order && u.order.leash)) { setOrder(u, { type: 'move', x: u.home.x, y: u.home.y, leash: true }); }
    if (!u.order && u.home) { u.hp = Math.min(u.maxHp, u.hp + 6 * dt); if (Math.hypot(u.x - u.home.x, u.y - u.home.y) > 0.4) moveTo(u, u.home.x, u.home.y, dt); else u.moving = false; }
  }
  const o = u.order;
  if (!o) { u.moving = false; autoAcquire(u, dt); return; }
  switch (o.type) {
    case 'move':
      if (o.leash) u.hp = Math.min(u.maxHp, u.hp + 20 * dt);
      if (!o.tunChecked) tunnelPlan(u, o); if (o.tun && tunnelStep(u, o, dt)) break;
      if (moveTo(u, o.x, o.y, dt)) nextOrder(u); break;
    case 'amove': {
      if (!o.tunChecked) tunnelPlan(u, o); if (o.tun && tunnelStep(u, o, dt)) break;
      u.scanT = (u.scanT || 0) - dt;
      if (u.scanT <= 0) { u.scanT = 0.3; const e = nearestEnemy(u, u.def.sight * 0.85); if (e) { u.queue.unshift(o); u.order = { type: 'attack', target: e.id, auto: true, from: { x: u.x, y: u.y } }; u.path = null; break; } }
      if (moveTo(u, o.x, o.y, dt)) nextOrder(u); break; }
    case 'attack': {
      const t = G.byId.get(o.target);
      if (!t || t.dead || t.tun) { nextOrder(u); if (!u.order) autoAcquire(u, dt, true); break; }
      // auto-acquired fights don't chase forever
      if (o.auto && o.from && Math.hypot(u.x - o.from.x, u.y - o.from.y) > 12) { nextOrder(u); break; }
      if (o.auto && u.scanT !== undefined) { u.scanT -= dt; if (u.scanT <= 0) { u.scanT = 0.6; if (t.isBuilding) { const e = nearestEnemy(u, u.def.sight * 0.7, x => x.isUnit); if (e) { o.target = e.id; break; } } } }
      attackStep(u, t, dt); break; }
    case 'hold': { u.moving = false; const e = nearestEnemy(u, Math.max(uRange(u), 1) + 0.3); if (e) { faceTo(u, e); if (edgeDist(u, e) <= uRange(u)) attackStep(u, e, dt); } break; }
    case 'gather': case 'chop': case 'return':
      if (o.phase === 'return' || o.type === 'return') { const hall = nearestHall(u); if (!hall) { u.order = null; break; } }
      workerStep(u, dt); break;
    case 'build': case 'repairbuild': buildStep(u, dt); break;
    case 'enter': enterNetStep(u, o, dt); break;
    case 'cast': { const A = ABILITIES[o.a]; if (Math.hypot(o.x - u.x, o.y - u.y) > A.range) moveTo(u, o.x, o.y, dt); else { u.path = null; castAbility(u, o.a, o.x, o.y); if (u.order === o) nextOrder(u); } break; }
    case 'pickup': { const it = o.item; if (!G.items.includes(it)) { nextOrder(u); break; }
      if (Math.hypot(it.x - u.x, it.y - u.y) > 0.6) { moveTo(u, it.x, it.y, dt, 0.05); break; }
      if (u.items.length < 3) { u.items.push(it.id); G.items.splice(G.items.indexOf(it), 1); const mh = uMaxHp(u); u.hp += mh - u.maxHp; u.maxHp = mh; say(u.owner, 'Picked up ' + ITEMS[it.id].name + '.', '#ffd36b'); }
      else say(u.owner, 'Inventory full.', '#ff9a8a');
      nextOrder(u); break; }
    default: u.order = null;
  }
}
function autoAcquire(u, dt, now) {
  if (u.def.worker) return;
  u.scanT = (u.scanT || 0) - dt; if (u.scanT > 0 && !now) return; u.scanT = 0.4;
  const range = u.owner === P_CREEP ? 5 : Math.max(u.def.sight * 0.75, uRange(u) + 0.5);
  const e = nearestEnemy(u, range); if (e) u.order = { type: 'attack', target: e.id, auto: true, from: { x: u.x, y: u.y } };
}

// ── units don't stack: a cheap spatial hash pushes overlapping bodies apart ──
function separate() {
  const cell = 2, grid = new Map(); const units = G.ents.filter(e => !e.dead && e.isUnit && !e.tun);
  for (const u of units) { const k = ((u.x / cell) | 0) * 1000 + ((u.y / cell) | 0); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(u); }
  for (const u of units) {
    const cx = (u.x / cell) | 0, cy = (u.y / cell) | 0;
    for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const a = grid.get(gx * 1000 + gy); if (!a) continue;
      for (const v of a) { if (v.id <= u.id) continue;
        if ((u.kind === 'coon' || v.kind === 'coon') && u.owner === v.owner) continue;   // the Coon walks straight through the camps
        const dx = v.x - u.x, dy = v.y - u.y, d = Math.hypot(dx, dy), min = (u.r + v.r) * 0.9;
        if (d < min && d > 0.0001) {
          // workers at work slide through each other, like in the real thing
          if ((u.working && v.def.worker) || (v.working && u.def.worker)) continue;
          const push = (min - d) / 2, nx = dx / d, ny = dy / d;
          const wu = u.moving || !v.moving ? 1 : 0.3, wv = v.moving || !u.moving ? 1 : 0.3;
          u.x -= nx * push * wu; u.y -= ny * push * wu; v.x += nx * push * wv; v.y += ny * push * wv;
        } else if (d <= 0.0001) { u.x += 0.05; }
      }
    }
  }
  // and nobody stands inside a wall, a tree or a building
  for (const u of units) {
    if (!G.map.passable(Math.floor(u.x), Math.floor(u.y))) {
      const p = G.map.nearestPassable(Math.floor(u.x), Math.floor(u.y), 5); if (p) { const tx = p.x + 0.5, ty = p.y + 0.5, d = Math.hypot(tx - u.x, ty - u.y); const k = Math.min(1, 0.25 / Math.max(d, 0.01)); u.x += (tx - u.x) * Math.max(k, 0.2); u.y += (ty - u.y) * Math.max(k, 0.2); }
    }
    u.x = clamp(u.x, 1, G.n - 1); u.y = clamp(u.y, 1, G.n - 1);
  }
}

// ── fog of war, for the human player ──
function updateVision() {
  const n = G.n, vis = G.vis; vis.fill(0);
  for (const e of G.ents) {
    if (e.dead || e.owner !== ME) continue; if (e.isBuilding && !e.built && e.progress < 0.05) continue;
    const r = (e.def.sight || 7) * (G.rain ? 0.8 : 1), cx = e.x, cy = e.y, r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(n - 1, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(n - 1, Math.ceil(cx + r)); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r2) { vis[y * n + x] = 1; G.seen[y * n + x] = 1; }
      }
  }
}
function visibleTo0(e) { if (e.owner === ME) return true; const n = G.n;
  if (e.isBuilding || e.isRes) { for (let y = e.ty; y < e.ty + e.size; y++) for (let x = e.tx; x < e.tx + e.size; x++) if (G.vis[y * n + x]) return true; return false; }
  const x = Math.floor(e.x), y = Math.floor(e.y); return x >= 0 && y >= 0 && x < n && y < n && G.vis[y * n + x] === 1; }

// ── the tick ──
function stepGame(dt) {
  if (G.over) return;
  G.time += dt;
  for (const e of G.ents) { if (e.dead) continue; if (e.isUnit) updateUnit(e, dt); else if (e.isBuilding) updateBuilding(e, dt); }
  separate();
  // projectiles home in on their target
  for (const p of G.proj) {
    const t = G.byId.get(p.t); if (!t || t.dead) { p.done = true; continue; }
    const tx = t.x, ty = t.y - (t.isBuilding ? 0.8 : 0.4), dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), s = p.sp * dt;
    if (d <= s + 0.2) { p.done = true; const psrc = G.byId.get(p.src) || { owner: p.owner, dead: true }; hit(psrc, t, p.dmg, p.atk); if (p.slow && t.isUnit) t.buffs.slow = G.time + 2.5;
      // a bomb hits everything around where it lands
      if (p.splash) { for (const e of G.ents) if (e !== t && !e.dead && !e.isRes && e.owner !== p.owner && e.owner !== P_NEUTRAL && Math.hypot(e.x - tx, e.y - ty) < p.splash + (e.isBuilding ? e.size / 2 : 0)) hit(psrc, e, p.dmg * 0.5, p.atk);
        G.fx.push({ k: 'poof', x: tx, y: ty + 0.4, t: G.time, big: 1.4 }); }
      G.fx.push({ k: 'spark', x: tx, y: ty, t: G.time, kind: p.kind }); }
    else { p.x += dx / d * s; p.y += dy / d * s; p.ang = Math.atan2(dy, dx); }
  }
  G.proj = G.proj.filter(p => !p.done);
  // plague clouds tick
  for (const c of G.clouds) { const src = G.byId.get(c.src) || { owner: c.owner, dead: true };
    for (const e of G.ents) if (!e.dead && !e.isRes && e.owner !== c.owner && e.owner !== P_NEUTRAL && Math.hypot(e.x - c.x, e.y - c.y) < c.r + (e.r || 0)) hit(src, e, c.dps * dt, 'spell'); }
  G.clouds = G.clouds.filter(c => c.until > G.time);
  G.fx = G.fx.filter(f => G.time - f.t < 2.2);
  // dead bodies leave the list now and then
  if (((G.time * 10) | 0) % 50 === 0) G.ents = G.ents.filter(e => !e.dead);
  G.visT -= dt; if (G.visT <= 0) { G.visT = 0.2; updateVision(); }
  // mid-game event: a fish migration brings two rich spots to the side lanes
  if (!G.events.migration && G.time > 600) { G.events.migration = true;
    const L = G.map.lane, spots = [[L.x - 1, L.y - 1], [G.n - 3 - (L.x - 1), G.n - 3 - (L.y - 1)]];
    for (const [x, y] of spots) if (G.map.canPlace(x, y, 3, G.ents)) { const f = spawnFish(x, y, 3000); f.rich = true; }
    for (const p of [0, 1]) { say(p, 'A fish migration! Rich new fishing spots have appeared on the side lanes.', '#8fd8ff'); G.alerts.push({ p, x: L.x, y: L.y, t: G.time }); } }
  EV.tick(); hallWatch();
  if (G.msgs.length > 6) G.msgs.splice(0, G.msgs.length - 6);
}

// ── commands ──
// Every order from the HUD goes through here. Alone, or as the host, it runs straight away;
// as the guest it is sent to the host, who runs it on the one true game. Either way it is
// checked against the player it came from, so nobody can order around units that aren't theirs.
const CMD = {
  exec(c) { if (typeof NET !== 'undefined' && NET.role === 'guest') { NET.send({ k: 'cmd', c }); return true; } return runCmd(c, ME); },
};
function runCmd(c, p) {
  if (!G || G.over) return false;
  const own = id => { const e = G.byId.get(id); return e && !e.dead && e.owner === p ? e : null; };
  const units = () => (c.ids || []).map(own).filter(e => e && e.isUnit);
  const any = id => { const e = G.byId.get(id); return e && !e.dead ? e : null; };
  switch (c.t) {
    case 'smart': { const us = units(), ent = c.ent ? any(c.ent) : null;
      if (ent || c.tree) for (const u of us) smartOrder(u, c.x, c.y, ent, c.tree, c.shift);
      else groupOrder(us, (u, x, y) => smartOrder(u, x, y, null, null, c.shift), c.x, c.y); return true; }
    case 'group': groupOrder(units(), (u, x, y) => (c.mode === 'amove' ? orderAMove : orderMove)(u, x, y, c.shift), c.x, c.y); return true;
    case 'attack': { const t = any(c.ent); if (t) for (const u of units()) orderAttack(u, t, c.shift); return true; }
    case 'stop': for (const u of units()) orderStop(u); return true;
    case 'hold': for (const u of units()) orderHold(u); return true;
    case 'ret': for (const u of units()) if (u.carry) setOrder(u, { type: 'return' }); return true;
    case 'build': { const w = own(c.id); return !!(w && w.def.worker && BUILDINGS[c.kind] && BUILDINGS[c.kind].faction === G.players[p].faction && orderBuild(w, c.kind, c.tx, c.ty, c.shift)); }
    case 'train': { const b = own(c.b); return !!(b && b.isBuilding && b.def.prod && b.def.prod.includes(c.kind) && trainUnit(b, c.kind)); }
    case 'revive': { const b = own(c.b); return !!(b && b.def.hall && reviveHero(b)); }
    case 'research': { const b = own(c.b); return !!(b && b.def.res && b.def.res.includes(c.up) && research(b, c.up)); }
    case 'cancelq': { const b = own(c.b); if (b) cancelQueue(b, c.i); return true; }
    case 'cancelb': { const b = own(c.b); if (b && b.isBuilding && !b.built) { refund(p, b.def.cost, 0.75); kill(b, null); } return true; }
    case 'rally': { const res = c.res ? any(c.res) : null;
      for (const id of c.ids || []) { const b = own(id); if (b && b.isBuilding && b.def.prod) b.rally = res ? { x: res.x, y: res.y, res } : c.tree ? { x: c.tree.x + 0.5, y: c.tree.y + 0.5, tree: c.tree } : { x: c.x, y: c.y }; } return true; }
    case 'cast': { const h = own(c.h); return !!(h && h.def.hero && h.def.abilities.includes(c.a) && castAbility(h, c.a, c.x, c.y)); }
    case 'use': { const h = own(c.h); if (h && h.def.hero) useItem(h, c.slot); return true; }
    case 'drop': { const h = own(c.h); if (h && h.def.hero) dropItem(h, c.slot); return true; }
    case 'hire': { const ex = any(c.ex); return !!(ex && ex.kind === 'exchange' && UNITS[c.kind] && UNITS[c.kind].faction === 'pigs' && hireMerc(ex, c.kind, p)); }
    case 'load': { const b = own(c.b); return !!(b && b.kind === 'nest' && b.built && loadNest(b)); }
    case 'unload': { const b = own(c.b); return !!(b && b.kind === 'nest' && b.built && unloadNest(b)); }
    case 'surrender': if (!G.over) G.over = { winner: 1 - p, t: G.time, surrender: true }; return true;
  }
  return false;
}
