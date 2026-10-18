// Border War — the opponent. It plays the same game you do: same costs, same supply, no map hacks
// beyond knowing where your base started (it's a two-player map; everyone knows).
// Each game it picks a personality (Rusher / Boomer / Turtle), which changes its build, its
// timing and its army, so no two evenings play the same.
'use strict';
const AI = {
  init(p, style, level) {
    this.p = p; this.style = AI_STYLES[style]; this.styleId = style; this.lv = AI_LEVELS[level];
    this.t = 0; this.state = 'build'; this.attackWave = 0; this.lastAttack = -999; this.creepT = 0; this.towersBuilt = 0;
    this.home = G.map.starts[p]; this.enemyHome = G.map.starts[1 - p];
    const tc = G.map.toCenter, sgn = p === 1 ? -1 : 1;   // a little way out from home, towards the middle
    this.rally = { x: this.home.x + tc.x * 7 * sgn, y: this.home.y + tc.y * 7 * sgn };
    this.army = new Set(); this.attackForce = null; this.creepTarget = null; this.strike = null; this.fwdT = -999;
  },
  fac() { return G.players[this.p].faction; },
  mine(f) { return G.ents.filter(e => !e.dead && e.owner === this.p && (!f || f(e))); },
  count(kind, incl = true) { let c = 0; for (const e of G.ents) if (!e.dead && e.owner === this.p && e.kind === kind && (incl || !e.isBuilding || e.built)) c++;
    for (const e of G.ents) if (!e.dead && e.owner === this.p && e.isUnit && e.order && e.order.type === 'build' && e.order.kind === kind && !e.order.started) c++;
    for (const e of G.ents) if (!e.dead && e.owner === this.p && e.isBuilding) for (const q of e.prodQ) if (q.unit === kind) c++;
    return c; },
  value(units) { let v = 0; for (const u of units) v += (u.def.cost ? (u.def.cost.f + u.def.cost.w) / (u.def.pair ? 2 : 1) : 150) * ((u.hp + (u.shield || 0)) / (u.maxHp + (u.maxShield || 0))); return v; },

  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = this.lv.think * (0.8 + Math.random() * 0.4);
    const pl = G.players[this.p];
    this.reserve = { f: 0, w: 0 };        // what the next big purchase needs; the army waits for it
    this.economy(pl); this.supply(pl); this.nests(pl); this.heroBuy(pl); this.buildings(pl); this.production(pl); this.research(pl);
    this.heroLogic(pl); this.military(pl); this.mercs(pl);
  },

  // ── workers: train them, and keep them all busy (about five on each fish, the rest on wood) ──
  economy(pl) {
    const fac = this.fac(), halls = playerHalls(this.p), workers = this.mine(e => e.isUnit && e.def.worker);
    const want = Math.min(this.style.workers * Math.max(1, halls.length * 0.8), 32);
    // fish wants about five a spot; wood wants a few, more when it's running short
    const spots = G.ents.filter(e => !e.dead && e.isRes && halls.some(h => dist(e, h) < 9)).length;
    const woodWant = pl.wood > 900 ? 2 : pl.wood > 400 ? 4 : 6;
    const wantAll = Math.min(want, spots * 5 + woodWant + 1);
    for (const h of halls) if (this.count(WORKER[fac]) < wantAll && h.prodQ.length < 2 && !h.prodQ.some(q => q.unit === WORKER[fac])) trainUnit(h, WORKER[fac]);
    const fishers = new Map(); for (const w of workers) if (w.order && w.order.type === 'gather') fishers.set(w.order.res, (fishers.get(w.order.res) || 0) + 1);
    for (const w of workers) {
      if (w.order) continue;
      // fish spot near one of our halls that still wants hands
      let spot = null; for (const h of halls) { for (const e of G.ents) if (!e.dead && e.isRes && dist(e, h) < 9 && (fishers.get(e.id) || 0) < 5) { spot = e; break; } if (spot) break; }
      if (spot) { orderGather(w, spot); fishers.set(spot.id, (fishers.get(spot.id) || 0) + 1); continue; }
      const hall = halls[0] || w; const t = G.map.nearestTree(hall.x, hall.y, 20); if (t) orderChop(w, t.x, t.y);
    }
    // too much wood and hungry for fish: move a woodcutter to the water (up to 7 a spot)
    if (pl.wood > 700 && pl.fish < 400) {
      const cutter = workers.find(w => w.order && w.order.type === 'chop' && !w.carry);
      let spot = null; for (const h of halls) for (const e of G.ents) if (!e.dead && e.isRes && dist(e, h) < 9 && (fishers.get(e.id) || 0) < 7) spot = e;
      if (cutter && spot) orderGather(cutter, spot);
    }
    // and the other way: out of wood with fish to spare
    if (pl.wood < 150 && pl.fish > 500) {
      const fisher = workers.find(w => w.order && w.order.type === 'gather' && !w.carry);
      const hall = halls[0]; const t = hall && G.map.nearestTree(hall.x, hall.y, 20);
      if (fisher && t) orderChop(fisher, t.x, t.y);
    }
  },
  supply(pl) {
    const fac = this.fac(), house = BUILD_MENU[fac][1];
    const building = this.mine(e => e.isUnit && e.order && e.order.type === 'build' && e.order.kind === house).length + this.mine(e => e.isBuilding && e.kind === house && !e.built).length;
    const prod = this.mine(e => e.isBuilding && e.built && e.def.prod).length;
    if (pl.supCap < SUPPLY_MAX && pl.supCap - pl.supUsed < 3 + prod * 2 && building < (pl.supUsed > 30 ? 2 : 1)) this.build(house, false, this.nestless());
  },
  // ── rats: the tunnels only help if there is a Nest at both ends ──
  // a base of ours with no Nest by it (built or going up), so the next one goes there
  nestless() {
    if (this.fac() !== 'rats') return null;
    const nests = this.mine(e => e.kind === 'nest'), sites = this.mine(e => e.isUnit && e.order && e.order.type === 'build' && e.order.kind === 'nest');
    return playerHalls(this.p).find(h => !nests.some(n => dist(n, h) < 11) && !sites.some(w => Math.hypot(w.order.tx - h.x, w.order.ty - h.y) < 11)) || null;
  },
  // one Nest out towards the enemy: the army goes down at home and comes up there
  forwardNest() {
    const far = dist(this.home, this.enemyHome);
    return this.mine(e => e.kind === 'nest' && e.built).find(n => dist(n, this.enemyHome) < far * 0.72) || null;
  },
  nests(pl) {
    if (this.fac() !== 'rats' || G.time < 210 || !hasBuilt(this.p, BUILD_MENU.rats[2])) return;
    if (this.mine(e => e.kind === 'nest').some(n => dist(n, this.enemyHome) < dist(this.home, this.enemyHome) * 0.72)) return;   // there, or going up
    if (this.mine(e => e.isUnit && e.order && e.order.type === 'build' && e.order.kind === 'nest' && e.order.fwd).length) return;
    if (G.time - this.fwdT < 60 || pl.fish < 120) return;
    this.fwdT = G.time;
    const k = 0.45, at = { x: this.home.x + (this.enemyHome.x - this.home.x) * k, y: this.home.y + (this.enemyHome.y - this.home.y) * k };
    const d = BUILDINGS.nest, foes = G.ents.filter(e => !e.dead && e.isUnit && e.owner !== this.p);
    for (let r = 0; r <= 9; r++) for (let a = 0; a < (r ? 16 : 1); a++) {
      const ang = a / 16 * Math.PI * 2, x = Math.round(at.x + Math.cos(ang) * r - d.size / 2), y = Math.round(at.y + Math.sin(ang) * r - d.size / 2);
      if (!placeOk('nest', x, y, foes)) continue;
      const b = this.builder({ x, y }); if (b && orderBuild(b, 'nest', x, y)) { b.order.fwd = true; return; }
      return;
    }
  },
  // everyone still underground comes up at the Nest closest to where they're needed
  surface(near) {
    if (this.fac() !== 'rats' || !netUnits(this.p).length) return;
    const nests = this.mine(e => e.kind === 'nest' && e.built); if (!nests.length) return;
    unloadNest(nests.sort((a, b) => dist(a, near) - dist(b, near))[0]);
  },
  // the build order: what to raise next, depending on personality and how far into the game we are
  buildings(pl) {
    const fac = this.fac(), M = BUILD_MENU[fac], [hall, , barracks, forge, beast, tower] = M, T = G.time, s = this.style;
    const workers = this.mine(e => e.isUnit && e.def.worker).length;
    if (this.count(barracks) < 1 && workers >= (this.styleId === 'rusher' ? 6 : 8)) return this.build(barracks);
    if (this.count(barracks) < 2 && T > (this.styleId === 'rusher' ? 200 : 520) && pl.fish > 250) return this.build(barracks);
    // fish piling up: more places to spend it (the rats' cheap swarm needs this most)
    if (this.count(barracks) < 4 && hasBuilt(this.p, barracks) && pl.fish > 700 && T > 240) return this.build(barracks);
    if (this.count(forge) < 1 && hasBuilt(this.p, barracks) && T > (this.styleId === 'rusher' ? 380 : 230)) { if (!this.build(forge) && !this.reserve.f) this.reserve = BUILDINGS[forge].cost; return; }
    if (this.count(beast) < 1 && hasBuilt(this.p, forge) && T > s.heavyAfter) { if (!this.build(beast) && !this.reserve.f) this.reserve = BUILDINGS[beast].cost; return; }
    if (this.count(tower) < s.towers && hasBuilt(this.p, barracks) && T > 180 && pl.wood > 120) return this.build(tower, true);
    // expand: by the clock, or when the home fish runs low
    const homeFish = G.ents.filter(e => !e.dead && e.isRes && dist(e, this.home) < 10).reduce((a, e) => a + e.amount, 0);
    const wantHall = (this.count(hall) < 2 && (T > s.expandAt || homeFish < 2200)) || (this.count(hall) < 3 && (T > s.expandAt + 420 || homeFish < 600));
    if (wantHall) { if (!this.expand(hall) && !this.reserve.f) this.reserve = BUILDINGS[hall].cost; return; }
  },
  production(pl) {
    const fac = this.fac(), mix = this.style.mix, T = G.time;
    const units = fac === 'cats' ? { melee: 'soldier', ranged: 'slinger', heavy: 'lion', siege: 'herald' } : { melee: 'ratsoldier', ranged: 'bandit', heavy: 'lobster', siege: 'saboteur' };
    const army = this.mine(e => e.isUnit && !e.def.worker && !e.def.hero);
    const have = { melee: 0, ranged: 0, heavy: 0, siege: 0 }; for (const u of army) for (const k in units) if (u.kind === units[k]) have[k]++;
    const total = Math.max(1, army.length);
    for (const b of this.mine(e => e.isBuilding && e.built && e.def.prod && !e.def.hall)) {
      if (b.prodQ.length >= (pl.fish > 500 ? 4 : 2)) continue;
      // keep some fish back for the next building in the order
      if (pl.fish < 150 && T > 120 && this.count(BUILD_MENU[fac][2]) < 2) continue;
      let pick = null, gap = -1;
      for (const k in units) { if (!b.def.prod.includes(units[k]) || !reqMet(this.p, UNITS[units[k]])) continue; if (k === 'heavy' && T < this.style.heavyAfter) continue;
        const g = (mix[k] || 0.05) - have[k] / total; if (g > gap) { gap = g; pick = units[k]; } }
      if (pick && this.spare(UNITS[pick].cost) && trainUnit(b, pick)) have[Object.keys(units).find(k => units[k] === pick)]++;
    }
  },
  research(pl) {
    if (G.time < 300 || pl.fish < 300 || this.reserve.f) return;
    for (const b of this.mine(e => e.isBuilding && e.built && e.def.res)) { if (b.prodQ.length) continue;
      for (const up of b.def.res) { const U = UPGRADES[up]; if (U.faction && U.faction !== this.fac()) continue; if ((pl.up[up] || 0) < U.levels.length && research(b, up)) break; } }
  },

  heroBuy(pl) {
    const fac = this.fac(), halls = playerHalls(this.p); if (!halls.length) return;
    if (!hasBuilt(this.p, BUILD_MENU[fac][2]) && G.time < 150) return;
    const h0 = halls[0];
    if (pl.heroDead) { if (!h0.prodQ.some(q => q.revive)) { if (!reviveHero(h0)) this.reserve = { f: 150 + 40 * pl.heroDead.level, w: 0 }; } return; }
    if (!pl.hero && !h0.prodQ.some(q => q.unit === HERO[fac])) { if (!trainUnit(h0, HERO[fac])) this.reserve = UNITS[HERO[fac]].cost; }
  },
  // can the army spend this without eating into what we're saving for?
  spare(cost) { const pl = G.players[this.p]; return pl.fish - (cost.f || 0) >= this.reserve.f && pl.wood - (cost.w || 0) >= this.reserve.w; },
  // find a place for a building near home, leaving a lane open between the hall and its fish
  build(kind, forward, anchor) {
    const d = BUILDINGS[kind]; if (!canAfford(this.p, d.cost) || !reqMet(this.p, d)) return false;
    const halls = playerHalls(this.p); if (!halls.length) return false;
    const hall = anchor || halls[0], fish = G.ents.filter(e => !e.dead && e.isRes && dist(e, hall) < 10);
    const toward = forward ? { x: this.enemyHome.x - hall.x, y: this.enemyHome.y - hall.y } : null;
    const spots = [];
    for (let r = 4; r <= 13; r++) for (let a = 0; a < 24; a++) {
      const ang = a / 24 * Math.PI * 2 + r, x = Math.round(hall.x + Math.cos(ang) * r - d.size / 2), y = Math.round(hall.y + Math.sin(ang) * r - d.size / 2);
      if (!G.map.canPlace(x - 1, y - 1, d.size + 2, G.ents.filter(e => !e.dead && e.isUnit && e.owner !== this.p))) continue;
      const cx = x + d.size / 2, cy = y + d.size / 2;
      if (fish.some(f => { const t = ((cx - hall.x) * (f.x - hall.x) + (cy - hall.y) * (f.y - hall.y)) / (dist(f, hall) ** 2); const px = hall.x + (f.x - hall.x) * t, py = hall.y + (f.y - hall.y) * t; return t > -0.2 && t < 1.2 && Math.hypot(cx - px, cy - py) < d.size / 2 + 1.6; })) continue;
      let score = r; if (toward) { const l = Math.hypot(toward.x, toward.y); score -= ((cx - hall.x) * toward.x + (cy - hall.y) * toward.y) / l * 0.8; }
      spots.push({ x, y, score });
    }
    if (!spots.length) return false; spots.sort((a, b) => a.score - b.score);
    const s = spots[Math.min(spots.length - 1, (Math.random() * 3) | 0)];
    const builder = this.builder(s); if (!builder) return false;
    return orderBuild(builder, kind, s.x, s.y);
  },
  expand(kind) {
    const d = BUILDINGS[kind]; if (!canAfford(this.p, d.cost)) return false;
    // the free expansion closest to home that no enemy hall already sits on
    const opts = G.map.expos.filter(e => !G.ents.some(b => !b.dead && b.isBuilding && b.def.hall && dist(b, e) < 8))
      .filter(e => !this.mine(u => u.isUnit && u.order && u.order.type === 'build' && u.order.kind === kind).length)
      .sort((a, b) => dist(a, this.home) - dist(b, this.home));
    const e = opts[0]; if (!e) return false;
    // creeps still guard it? clear them first
    const guards = G.ents.filter(c => !c.dead && c.owner === P_CREEP && c.camp && dist(c, e) < 7);
    if (guards.length) { this.creepTarget = guards[0].camp; guards[0].camp.forExpo = true; return false; }
    for (let r = 5; r <= 10; r++) for (let a = 0; a < 16; a++) {
      const ang = a / 16 * Math.PI * 2, x = Math.round(e.x + Math.cos(ang) * r - 2), y = Math.round(e.y + Math.sin(ang) * r - 2);
      if (placeOk(kind, x, y)) { const b = this.builder({ x, y }); if (b) return orderBuild(b, kind, x, y); }
    }
    return false;
  },
  builder(near) {
    const ws = this.mine(e => e.isUnit && e.def.worker && !(e.order && (e.order.type === 'build' || e.order.type === 'repairbuild')));
    if (!ws.length) return null;
    ws.sort((a, b) => ((a.order && a.order.type === 'chop') ? -3 : 0) + (a.carry ? 2 : 0) + dist(a, near) * 0.1 - (((b.order && b.order.type === 'chop') ? -3 : 0) + (b.carry ? 2 : 0) + dist(b, near) * 0.1));
    return ws[0];
  },

  // ── the hero: creeps early for levels and items, fights with the army later, knows when to run ──
  heroLogic(pl) {
    const h = pl.hero && G.byId.get(pl.hero); if (!h || h.dead) return;
    // drink, run, cast
    if (h.hp < h.maxHp * 0.35) { const pot = h.items.findIndex(i => ITEMS[i].use === 'heal'); if (pot >= 0) useItem(h, pot);
      else if (h.hp < h.maxHp * 0.22 && !(h.order && h.order.type === 'move' && h.order.flee)) { setOrder(h, { type: 'move', x: this.home.x, y: this.home.y, flee: true }); return; } }
    if (this.lv.micro || Math.random() < 0.5) this.cast(h);
    // loot on the ground nearby
    const it = G.items.find(i => Math.hypot(i.x - h.x, i.y - h.y) < 8);
    // the Coon's treasure is worth more than anything in the bag: put the cheapest thing down for it
    if (it && it.id === 'goldbanana' && h.items.length >= 3 && !h.items.includes('goldbanana')) { const k = h.items.findIndex(i => ITEMS[i].use) >= 0 ? h.items.findIndex(i => ITEMS[i].use) : 0;
      dropItem(h, k); }
    if (it && h.items.length < 3 && !(h.order && h.order.type === 'pickup')) { orderPickup(h, it); return; }
    if (h.order && h.order.flee) { if (h.hp > h.maxHp * 0.7) h.order = null; return; }
  },
  cast(h) {
    const abil = h.def.abilities, foes = G.ents.filter(e => !e.dead && e.isUnit && e.owner !== this.p && e.owner !== P_NEUTRAL && dist(e, h) < 9);
    if (!foes.length) return;
    // the ultimate when the fight is big
    const ult = abil[2]; if (canCast(h, ult) && foes.length >= 5) { castAbility(h, ult, h.x, h.y); return; }
    const q = abil[0]; if (canCast(h, q)) {
      let best = null, bn = 0; for (const f of foes) { const n = foes.filter(g => dist(g, f) < ABILITIES[q].aoe).length; if (n > bn) { bn = n; best = f; } }
      if (best && (bn >= 3 || (bn >= 1 && best.def.hero))) { castAbility(h, q, best.x, best.y); return; }
    }
    const w = abil[1]; if (canCast(h, w)) { const allies = G.ents.filter(e => !e.dead && e.isUnit && e.owner === this.p && dist(e, h) < 5).length; if (allies >= 3) castAbility(h, w, h.x, h.y); }
  },

  // ── the army ──
  military(pl) {
    const army = this.mine(e => e.isUnit && !e.def.worker && !e.def.summon);
    const hero = pl.hero && G.byId.get(pl.hero);
    // 1. defend: anything hostile near our buildings gets everybody's attention
    const ours = this.mine(e => e.isBuilding);
    let threat = null; for (const e of G.ents) { if (e.dead || !e.isUnit || e.owner === this.p || e.owner === P_NEUTRAL || e.owner === P_CREEP) continue;
      if (ours.some(b => dist(b, e) < 13)) { threat = e; break; } }
    if (threat) { this.strike = null; this.surface(threat); this.state = 'defend'; for (const u of army) if (!(u.order && u.order.type === 'attack' && !u.order.auto) && !(u.order && u.order.flee)) orderAMove(u, threat.x, threat.y); return; }
    if (this.state === 'defend') { this.state = 'build'; for (const u of army) if (!u.order || u.order.type === 'amove') orderMove(u, this.rally.x, this.rally.y); }
    // 2. an attack in progress: push on, or fall back if it's going badly
    if (this.state === 'attack') {
      const force = army.filter(u => this.attackForce.has(u.id));
      if (this.strike) {   // the army is going down at home: once everyone's in (or it's taking too long), up at the forward Nest
        const F = G.byId.get(this.strike.to), walking = force.filter(u => u.order && u.order.type === 'enter').length;
        if (walking && G.time - this.strike.t0 < 15 && F && !F.dead) return;
        this.strike = null; const t = this.enemyTarget();
        if (F && !F.dead) unloadNest(F); else this.surface(t || this.home);
        if (t) for (const u of force) if (!u.tun) orderAMove(u, t.x, t.y);
        return;
      }
      const v = this.value(force);
      if (v < this.attackStart * 0.35) { this.state = 'build'; this.surface(this.rally); for (const u of force) orderMove(u, this.rally.x, this.rally.y); this.lastAttack = G.time; return; }
      const target = this.enemyTarget(); if (!target) return;
      for (const u of force) if (!u.order || (u.order.type === 'move' && !u.order.flee)) orderAMove(u, target.x, target.y);
      // reinforcements walk out to join
      for (const u of army) if (!this.attackForce.has(u.id) && !u.order && G.time - this.lastAttack > 30) { this.attackForce.add(u.id); orderAMove(u, target.x, target.y); }
      return;
    }
    // 3. the Coon walks past: worth a fight if he comes our side of the map and the army can take him
    const coon = G.ents.find(e => !e.dead && e.kind === 'coon');
    // (not while he walks past the big camps by the Exchange: that fight costs more than he's worth)
    const byCamps = coon && G.ents.some(c => !c.dead && c.owner === P_CREEP && c.camp && dist(c, coon) < 6);
    if (coon && !byCamps && army.length >= 6 && this.value(army) > 1400 && dist(coon, this.home) < dist(coon, this.enemyHome) + 10) {
      for (const u of army) if (!u.order || u.order.type === 'move' || u.order.type === 'amove') orderAMove(u, coon.x, coon.y);
      return; }
    // 4. creeping with the hero and a few units while the army grows (or clearing a camp off an expansion we want)
    const clearing = this.creepTarget && this.creepTarget.forExpo && G.ents.some(c => !c.dead && c.camp === this.creepTarget);
    if (hero && G.time > 90 && (clearing || G.time < this.style.firstAttack * this.lv.attackMul + 120)) {
      const camp = this.creepTarget && G.ents.some(c => !c.dead && c.camp === this.creepTarget) ? this.creepTarget : this.pickCamp(hero, army.length);
      this.creepTarget = camp;
      if (camp && army.length >= 3 && hero.hp > hero.maxHp * 0.6) { for (const u of army) if (!u.order || u.order.type === 'move') orderAMove(u, camp.x + 0.5, camp.y + 0.5); return; }
    }
    // idle troops wait at the rally point (and nobody is left underground by accident)
    if (!this.strike) this.surface(this.rally);
    for (const u of army) if (!u.order && Math.hypot(u.x - this.rally.x, u.y - this.rally.y) > 5) orderMove(u, this.rally.x + rnd(-2, 2), this.rally.y + rnd(-2, 2));
    // 5. time to attack?
    const v = this.value(army), T = G.time, mul = this.lv.attackMul;
    const ready = T > this.style.firstAttack * mul && (v > this.style.attackValue * mul * (1 + this.attackWave * 0.25) || pl.supUsed >= SUPPLY_MAX - 10) && T - this.lastAttack > 60;
    if (ready && army.length >= 4) { this.state = 'attack'; this.attackWave++; this.attackForce = new Set(army.map(u => u.id)); this.attackStart = v;
      const t = this.enemyTarget(); if (!t) return;
      const F = this.fac() === 'rats' && this.forwardNest(), H = F && this.mine(e => e.kind === 'nest' && e.built && e !== F).sort((a, b) => dist(a, this.rally) - dist(b, this.rally))[0];
      if (F && H && dist(H, this.rally) < 14 && dist(F, t) < dist(this.rally, t) * 0.8) {
        for (const u of army) if (!u.tun) setOrder(u, { type: 'enter', nest: H.id });
        this.strike = { to: F.id, t0: G.time }; return; }
      for (const u of army) orderAMove(u, t.x, t.y); }
  },
  pickCamp(hero, n) {
    const camps = [...new Set(G.ents.filter(e => !e.dead && e.owner === P_CREEP && e.camp).map(e => e.camp))];   // (the Coon has no camp)
    const maxTier = hero.level >= 4 && n >= 6 ? 2 : hero.level >= 2 && n >= 4 ? 1 : 0;
    return camps.filter(c => (c.tierLoot || 0) <= maxTier).sort((a, b) => Math.hypot(a.x - this.home.x, a.y - this.home.y) - Math.hypot(b.x - this.home.x, b.y - this.home.y))[0] || null;
  },
  enemyTarget() {
    const foes = G.ents.filter(e => !e.dead && e.isBuilding && e.owner === 1 - this.p);
    if (!foes.length) return null;
    const ref = this.attackForce && this.attackForce.size ? (() => { const f = [...this.attackForce].map(i => G.byId.get(i)).filter(Boolean); return f.length ? { x: f[0].x, y: f[0].y } : this.home; })() : this.home;
    foes.sort((a, b) => dist(a, ref) - dist(b, ref)); return foes[0];
  },
  // late game: a Mech Boar when the army walks past the Exchange with money to spare
  mercs(pl) {
    // Snout's special offer: send someone over if we can pay, buy it when they get there
    const exd = G.ents.find(e => !e.dead && e.kind === 'exchange');
    if (exd && exd.deal && canAfford(this.p, exd.deal) && pl.supUsed + UNITS[exd.deal.kind].sup <= pl.supCap) {
      if (this.mine(e => e.isUnit && dist(e, exd) < 7).length) { const u = hireMerc(exd, exd.deal.kind, this.p); if (u) orderMove(u, this.rally.x, this.rally.y); return; }
      const runner = this.mine(e => e.isUnit && !e.def.worker && !e.def.hero).sort((a, b) => dist(a, exd) - dist(b, exd))[0];
      if (runner && !(runner.order && runner.order.deal)) setOrder(runner, { type: 'move', x: exd.x, y: exd.y + 2.5, deal: true });
    }
    if (G.time < 480 || pl.fish < 600) return;
    const ex = G.ents.find(e => !e.dead && e.kind === 'exchange'); if (!ex) return;
    const near = this.mine(e => e.isUnit && dist(e, ex) < 7); if (!near.length) return;
    const kind = pl.wood > 200 && ex.stock.mechboar ? 'mechboar' : ex.stock.merlin && pl.wood > 80 && Math.random() < 0.6 ? 'merlin' : ex.stock.snout ? 'snout' : null;
    if (kind) { const u = hireMerc(ex, kind, this.p); if (u && this.state === 'attack') { this.attackForce.add(u.id); const t = this.enemyTarget(); if (t) orderAMove(u, t.x, t.y); } }
  },
};
