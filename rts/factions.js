// Border War — what makes the two sides play differently. The numbers live in FACTION_RULES (data.js).
//   Rats, the swarm: cheap units that hatch in pairs, heal themselves out of combat, and travel
//     underground — a rat going far dives into the nearest Nest and comes out of the one nearest
//     where it is going.
//   Cats, the few: dearer, stronger units with a fur shield that soaks up hits and refills after
//     a fight, slower healing, and morale — every enemy that falls near them makes them a little
//     faster and fiercer for a few seconds (it stacks, and it keeps even if they fall back).
'use strict';
function facRules(u) { const p = G.players[u.owner]; return p && FACTION_RULES[p.faction]; }

// called once per unit per tick, before anything else
function factionTick(u, dt) {
  const R = facRules(u); if (!R) return;
  const quiet = G.time - (u.combatT || -99);
  if (quiet > R.regenAfter && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * R.regen * dt);
  if (R.shield) {
    u.maxShield = Math.round(u.maxHp * R.shield); if (u.shield === undefined) u.shield = u.maxShield;
    if (quiet > R.shieldAfter && u.shield < u.maxShield) u.shield = Math.min(u.maxShield, u.shield + u.maxShield / R.shieldFill * dt);
  }
  if (u.morale && !u.buffs.morale) u.morale = 0;
}
// the shield takes what it can of a hit; returns what gets through to health
function shieldAbsorb(t, dmg) {
  if (!t.shield || t.shield <= 0) return dmg;
  const took = Math.min(t.shield, dmg); t.shield -= took; return dmg - took;
}
// an enemy fell: every cat of the side that killed it, close by, takes heart
function moraleOnKill(t, killer) {
  if (!t.isUnit || killer < 0 || killer > 1 || t.owner === killer) return;
  const R = FACTION_RULES[G.players[killer].faction]; if (!R || !R.morale) return; const M = R.morale;
  for (const e of G.ents) if (!e.dead && e.isUnit && e.owner === killer && !e.def.worker && dist(e, t) < M.radius) {
    e.morale = Math.min(M.max, (e.morale || 0) + 1); e.buffs.morale = G.time + M.dur; }
}
function moraleMul(u, k) { const R = facRules(u); return u.morale && R && R.morale ? 1 + R.morale[k] * u.morale : 1; }

// ── tunnels ──
// when a rat gets a far move, see if going through the Nests is quicker than walking
function tunnelPlan(u, o) {
  o.tunChecked = true;
  const R = facRules(u); if (!R || !R.tunnelDelay || u.def.worker) return;
  const nests = G.ents.filter(e => !e.dead && e.owner === u.owner && e.isBuilding && e.built && e.kind === 'nest'); if (nests.length < 2) return;
  const goal = { x: o.x, y: o.y }, near = p => nests.reduce((a, b) => dist(a, p) <= dist(b, p) ? a : b);
  const A = near(u), B = near(goal); if (A === B) return;
  const direct = dist(u, goal), via = dist(u, A) + dist(B, goal) + R.tunnelDelay * uSpeed(u) + 2;
  if (via < direct * 0.75) o.tun = { a: A.id, b: B.id };
}
// walking to the entrance; true while the tunnel still has this unit's attention
function tunnelStep(u, o, dt) {
  const A = G.byId.get(o.tun.a), B = G.byId.get(o.tun.b);
  if (!A || A.dead || !B || B.dead) { o.tun = null; u.path = null; return false; }
  if (edgeDist(u, A) > 0.6) { moveTo(u, A.x, A.y, dt, 0.1); return true; }
  u.tun = { b: B.id, out: G.time + FACTION_RULES.rats.tunnelDelay, gx: o.x, gy: o.y }; o.tun = null; u.path = null; u.moving = false;
  G.fx.push({ k: 'poof', x: u.x, y: u.y, t: G.time, big: 0.5 });
  return true;
}
// underground: nobody sees it or hits it; it comes up beside the far Nest, on the side facing its goal
function tunnelWait(u) {
  if (u.tun.net) { u.moving = false; return true; }   // waiting in the network until someone unloads it
  if (G.time < u.tun.out) { u.moving = false; return true; }
  const B = G.byId.get(u.tun.b), goal = { x: u.tun.gx, y: u.tun.gy }; u.tun = null;
  if (B && !B.dead) {
    let best = null, bd = 1e9;
    for (let y = B.ty - 1; y <= B.ty + B.size; y++) for (let x = B.tx - 1; x <= B.tx + B.size; x++) {
      if (!G.map.passable(x, y)) continue; const d = Math.hypot(x + 0.5 - goal.x, y + 0.5 - goal.y); if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; } }
    if (best) { u.x = best.x; u.y = best.y; }
  }
  u.path = null; G.fx.push({ k: 'poof', x: u.x, y: u.y, t: G.time, big: 0.5 });
  return false;
}
// the supply one entry of a production queue holds (a pair needs room for two)
function qSup(kind) { const d = UNITS[kind]; return (d.sup || 0) * (d.pair ? 2 : 1); }

// ── the tunnel network, Nydus-style: send units into any Nest to wait underground, let them all
//    out at whichever Nest you choose. Right-click a Nest (or press Load on it) to go in.
function netUnits(p) { return G.ents.filter(e => !e.dead && e.owner === p && e.tun && e.tun.net); }
function enterNetStep(u, o, dt) {
  const N = G.byId.get(o.nest);
  if (!N || N.dead || !N.built || N.owner !== u.owner) { nextOrder(u); return; }
  if (edgeDist(u, N) > 0.6) { moveTo(u, N.x, N.y, dt, 0.1); return; }
  u.tun = { net: true }; u.order = null; u.queue = []; u.path = null; u.moving = false; u.working = false;
  G.fx.push({ k: 'poof', x: u.x, y: u.y, t: G.time, big: 0.5 });
}
// Load: every fighting unit of yours near this Nest walks in
function loadNest(N) {
  let n = 0; for (const u of G.ents) if (!u.dead && u.isUnit && u.owner === N.owner && !u.tun && !u.def.worker && dist(u, N) < 8) { setOrder(u, { type: 'enter', nest: N.id }); n++; }
  return n;
}
// Unload: everyone in the network comes up around this Nest
function unloadNest(N) {
  const us = netUnits(N.owner); if (!us.length) return 0;
  const ring = []; for (let y = N.ty - 2; y <= N.ty + N.size + 1; y++) for (let x = N.tx - 2; x <= N.tx + N.size + 1; x++) if (G.map.passable(x, y)) ring.push({ x: x + 0.5, y: y + 0.5 });
  ring.sort((a, b) => dist(a, N) - dist(b, N));
  us.forEach((u, i) => { const s = ring[i % Math.max(1, ring.length)] || { x: N.x, y: N.ty + N.size + 0.5 };
    u.x = s.x + (i >= ring.length ? 0.2 : 0); u.y = s.y; u.tun = null; u.path = null; u.combatT = G.time - 99;
    G.fx.push({ k: 'poof', x: u.x, y: u.y, t: G.time, big: 0.5 }); });
  say(N.owner, us.length + ' unit' + (us.length > 1 ? 's' : '') + ' came up out of the tunnels.', '#bfe8a8');
  return us.length;
}
// the last Nest gone: nobody is left down there, they scramble out where it stood
function nestLost(N) {
  if (N.kind !== 'nest' || !netUnits(N.owner).length) return;
  if (G.ents.some(e => !e.dead && e !== N && e.owner === N.owner && e.kind === 'nest' && e.built)) return;
  unloadNest(N);
}
