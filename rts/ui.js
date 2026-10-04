// Border War — input and HUD: selection, the command card, the info panel, mouse, keys and touch.
'use strict';
const $ = id => document.getElementById(id);
const SVG = {
  move: '<svg viewBox="0 0 24 24"><path d="M4 12h12M11 6l6 6-6 6" stroke="#bfe8ff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#ff8a7a"/></svg>',
  hold: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" fill="#ffd36b"/></svg>',
  attack: '<svg viewBox="0 0 24 24"><path d="M5 19L17 7M14 4l6 0 0 6M4 16l4 4" stroke="#ffb07a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  build: '<svg viewBox="0 0 24 24"><path d="M4 20l9-9M12 4l8 8-3 3-8-8z" stroke="#e8c88a" stroke-width="3" fill="#c9965a" stroke-linejoin="round"/></svg>',
  ret: '<svg viewBox="0 0 24 24"><path d="M6 9h12l-1 11H7z" fill="#c9965a"/><path d="M9 9V6a3 3 0 016 0v3" stroke="#e8c88a" stroke-width="2" fill="none"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M18 12H7M12 6l-6 6 6 6" stroke="#ddd" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  cancel: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#ff8a7a" stroke-width="3" stroke-linecap="round"/></svg>',
  revive: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z" fill="#ff9ad2"/></svg>',
  up: (c) => `<svg viewBox="0 0 24 24"><path d="M12 3l8 9h-5v8H9v-8H4z" fill="${c}"/></svg>`,
};
const UI = {
  sel: [], hover: null, box: null, place: null, target: null, pings: [], groups: {}, menu: 'main', sub: 0,
  tipFor: null, cardSig: '', infoSig: '', lastIdle: 0, lastClick: { t: 0, id: 0 }, edge: { x: 0, y: 0 }, touch: null,

  init() {
    const cv = $('view');
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => this.down(e));
    window.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', e => this.up(e, true));
    // no zoom on the wheel: on a touchpad two fingers just slide the map (and a pinch does nothing)
    cv.addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey) return;
      const k = e.deltaMode === 1 ? 16 : 1; R.cam.x += e.deltaX * k / R.cam.z; R.cam.y += e.deltaY * k / R.cam.z; R.clampCam(this.viewH()); }, { passive: false });
    window.addEventListener('keydown', e => this.key(e));
    window.addEventListener('keyup', e => { if (e.key.startsWith('Arrow')) this.arrows[e.key] = false; });
    document.addEventListener('mouseleave', () => { this.edge = { x: 0, y: 0 }; });
    // minimap: click/drag moves the camera, right click orders
    const mc = $('mini');
    const mini = e => { const r = mc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * G.n, (e.clientY - r.top) / r.height * G.n]; };
    mc.addEventListener('contextmenu', e => e.preventDefault());
    mc.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = mini(e);
      if (e.button === 2 || this.target) { this.command(x, y, null, null, e.shiftKey); return; }
      R.centerOn(x, y, this.viewH()); this.miniDrag = true; mc.setPointerCapture(e.pointerId); });
    mc.addEventListener('pointermove', e => { if (this.miniDrag) { const [x, y] = mini(e); R.centerOn(x, y, this.viewH()); } });
    mc.addEventListener('pointerup', () => { this.miniDrag = false; });
    $('info').addEventListener('pointerdown', ev => {
      const e = this.infoEnt; if (!e || e.dead) return;
      const slot = ev.target.closest('.slot'), q = ev.target.closest('[data-q]');
      if (slot) { ev.preventDefault(); const it = e.items[+slot.dataset.i]; if (!it) return; const I = ITEMS[it];
        if (I.use) { CMD.exec({ t: 'use', h: e.id, slot: +slot.dataset.i }); sfx('done'); }
        else this.flash(I.name + ' is always working while your hero carries it: ' + I.desc);
        this.infoSig = ''; }
      if (q) { ev.preventDefault(); CMD.exec({ t: 'cancelq', b: e.id, i: +q.dataset.q }); this.infoSig = ''; }
    });
    $('qHero').onclick = () => this.selectHero(); $('qArmy').onclick = () => this.selectArmy(); $('qIdle').onclick = () => this.idleWorker();
    this.arrows = {};
  },
  viewH() { return R.H - $('panel').offsetHeight; },
  mine(e) { return e && !e.dead && e.owner === ME; },
  setSel(list) {
    // heroes first, then fighters, then workers, then buildings — the first one drives the command card
    const rank = e => e.isUnit ? (e.def.hero ? 0 : e.def.worker ? 2 : 1) : 3;
    this.sel = list.filter(e => e && !e.dead).sort((a, b) => rank(a) - rank(b) || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0)).slice(0, 24); this.menu = 'main'; this.sub = 0; this.target = null; this.place = null; this.cardSig = ''; this.infoSig = ''; },
  primary() { const own = this.sel.filter(e => this.mine(e)); if (!own.length) return this.sel[0] || null;
    const kinds = [...new Set(own.map(e => e.kind))]; const k = kinds[this.sub % kinds.length]; return own.find(e => e.kind === k); },
  ownUnits() { return this.sel.filter(e => this.mine(e) && e.isUnit); },

  // ── what is under a screen point ──
  pick(sx, sy) {
    const [wx, wy] = R.toWorld(sx, sy); let best = null, bd = 1e9;
    for (const e of G.ents) { if (e.dead) continue;
      if (e.owner !== ME && (e.isUnit ? !visibleTo0(e) : !R.seenEnt(e))) continue;
      if (e.isUnit) { const h = SPR[e.def.spr].h / TILE; const dx = Math.abs(wx - e.x), dy = (e.y - wy);
        if (dx < Math.max(e.r, 0.35) + 0.15 && dy > -0.3 && dy < h + 0.1) { const d = dx + Math.abs(dy - h / 2) * 0.3 - (e.def.hero ? 0.2 : 0); if (d < bd) { bd = d; best = e; } } }
      else if (wx >= e.tx && wx < e.tx + e.size && wy >= e.ty - 0.6 && wy < e.ty + e.size) { const d = 5; if (d < bd) { bd = d; best = e; } }
    }
    return best;
  },
  treeAt(sx, sy) { const [wx, wy] = R.toWorld(sx, sy); let x = Math.floor(wx), y = Math.floor(wy);
    if (G.map.isTree(x, y)) return { x, y }; if (G.map.isTree(x, y + 1)) return { x, y: y + 1 }; return null; },

  // ── pointer ──
  down(e) {
    if (!G || G.over) return; e.preventDefault(); $('view').setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY;
    if (e.pointerType === 'touch') return this.touchDown(e);
    if (e.button === 1) { this.pan = { x: sx, y: sy, cx: R.cam.x, cy: R.cam.y }; return; }
    if (e.button === 2) { if (this.place || this.target) { this.place = null; this.target = null; this.hint(); return; } this.rightClick(sx, sy, e.shiftKey); return; }
    if (this.place) { this.tryPlace(e.shiftKey); return; }
    if (this.target) { this.applyTarget(sx, sy, e.shiftKey); return; }
    this.box = { x0: sx, y0: sy, x1: sx, y1: sy, shift: e.shiftKey };
  },
  move(e) {
    if (!G) return; const sx = e.clientX, sy = e.clientY; this.mx = sx; this.my = sy;
    if (e.pointerType === 'touch') return this.touchMove(e);
    if (this.pan) { R.cam.x = this.pan.cx - (sx - this.pan.x) / R.cam.z; R.cam.y = this.pan.cy - (sy - this.pan.y) / R.cam.z; R.clampCam(this.viewH()); return; }
    if (this.box) { this.box.x1 = sx; this.box.y1 = sy; }
    const vh = this.viewH(), m = 10; this.edge = { x: sx < m ? -1 : sx > R.W - m ? 1 : 0, y: sy < m ? -1 : (sy > R.H - m) ? 1 : 0 };
    if (sy > vh && sy < R.H - m) this.edge.y = 0;
    this.hover = sy < vh ? this.pick(sx, sy) : null;
    if (this.place) { const [wx, wy] = R.toWorld(sx, sy), s = BUILDINGS[this.place.kind].size; this.place.tx = Math.round(wx - s / 2); this.place.ty = Math.round(wy - s / 2); }
  },
  up(e, cancel) {
    if (!G) return;
    if (e.pointerType === 'touch') return this.touchUp(e, cancel);
    if (this.pan) { this.pan = null; return; }
    if (!this.box) return; const b = this.box; this.box = null; if (cancel) return;
    if (Math.abs(b.x1 - b.x0) < 5 && Math.abs(b.y1 - b.y0) < 5) this.clickSelect(b.x0, b.y0, b.shift);
    else this.boxSelect(b, b.shift);
  },
  clickSelect(sx, sy, shift) {
    const e = this.pick(sx, sy); const now = performance.now();
    if (!e) { if (!shift) this.setSel([]); return; }
    if (this.mine(e) && this.lastClick.id === e.id && now - this.lastClick.t < 320) {   // double click: all of that kind on screen
      const vh = this.viewH(); this.setSel(G.ents.filter(o => this.mine(o) && o.kind === e.kind && this.onScreen(o, vh))); this.lastClick.t = 0; return; }
    this.lastClick = { t: now, id: e.id };
    if (shift && this.mine(e) && this.sel.every(s => this.mine(s))) { if (this.sel.includes(e)) this.setSel(this.sel.filter(s => s !== e)); else this.setSel([...this.sel, e]); }
    else this.setSel([e]);
    sfx('click');
  },
  onScreen(e, vh) { const [sx, sy] = R.toScreen(e.x, e.y); return sx > 0 && sx < R.W && sy > 0 && sy < vh; },
  boxSelect(b, shift) {
    const [ax, ay] = R.toWorld(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1)), [bx, by] = R.toWorld(Math.max(b.x0, b.x1), Math.max(b.y0, b.y1));
    const inBox = e => e.x >= ax - 0.2 && e.x <= bx + 0.2 && e.y >= ay - 0.2 && e.y <= by + 0.8;
    let units = G.ents.filter(e => this.mine(e) && e.isUnit && inBox(e));
    if (!units.length) units = G.ents.filter(e => this.mine(e) && e.isBuilding && inBox(e)).slice(0, 1);
    if (!units.length) return;
    // a box over soldiers and workers takes the soldiers (unless it's only workers)
    if (units.some(u => !u.def.worker) && units.some(u => u.def.worker)) units = units.filter(u => !u.def.worker);
    this.setSel(shift ? [...new Set([...this.sel.filter(s => this.mine(s)), ...units])] : units); sfx('click');
  },
  rightClick(sx, sy, shift) {
    if (sy > this.viewH()) return;
    const [wx, wy] = R.toWorld(sx, sy), ent = this.pick(sx, sy), tree = !ent && this.treeAt(sx, sy);
    this.command(wx, wy, ent, tree, shift);
  },
  // the smart command, from a click on the map or minimap
  command(wx, wy, ent, tree, shift) {
    const units = this.ownUnits(), blds = this.sel.filter(e => this.mine(e) && e.isBuilding);
    if (this.target) return this.applyTargetWorld(wx, wy, ent, shift);
    if (units.length) {
      const attack = ent && ent.owner !== ME && ent.owner !== P_NEUTRAL && !ent.isRes;
      this.ping(wx, wy, attack ? '#ff6a5a' : '#7dff7d');
      CMD.exec({ t: 'smart', ids: units.map(u => u.id), x: wx, y: wy, ent: ent ? ent.id : 0, tree: tree || null, shift: !!shift });
      sfx('ack'); return;
    }
    if (blds.length) { CMD.exec({ t: 'rally', ids: blds.map(b => b.id), x: wx, y: wy, res: ent && ent.isRes ? ent.id : 0, tree: tree || null });
      this.ping(wx, wy, '#7dff7d'); sfx('ack'); }
  },
  ping(x, y, col) { this.pings.push({ x, y, col, t: performance.now() }); if (this.pings.length > 8) this.pings.shift(); },

  // ── targeting modes: attack-move, ability, rally ──
  startTarget(t) { this.target = t; this.hint(t.hint); $('view').classList.add('target'); },
  applyTarget(sx, sy, shift) { const [wx, wy] = R.toWorld(sx, sy); this.applyTargetWorld(wx, wy, this.pick(sx, sy), shift); },
  applyTargetWorld(wx, wy, ent, shift) {
    const t = this.target; this.target = null; this.hint(); $('view').classList.remove('target');
    const units = this.ownUnits();
    if (t.type === 'amove') { this.ping(wx, wy, '#ff6a5a');
      if (ent && ent.owner !== ME && ent.owner !== P_NEUTRAL && !ent.isRes) CMD.exec({ t: 'attack', ids: units.map(u => u.id), ent: ent.id, shift: !!shift });
      else CMD.exec({ t: 'group', mode: 'amove', ids: units.map(u => u.id), x: wx, y: wy, shift: !!shift }); sfx('ack'); }
    if (t.type === 'move') { this.ping(wx, wy, '#7dff7d'); CMD.exec({ t: 'group', mode: 'move', ids: units.map(u => u.id), x: wx, y: wy, shift: !!shift }); sfx('ack'); }
    if (t.type === 'cast') { const h = t.hero; if (h && !h.dead) { CMD.exec({ t: 'cast', h: h.id, a: t.a, x: wx, y: wy }); sfx('ack'); } }
    if (t.type === 'rally') { CMD.exec({ t: 'rally', ids: this.sel.filter(b => this.mine(b) && b.isBuilding).map(b => b.id), x: wx, y: wy }); }
    if (shift && t.type !== 'cast') this.startTarget(t);
  },
  hint(text) { const h = $('hint'); if (text) { h.textContent = text; h.style.display = 'block'; } else { h.style.display = 'none'; $('view').classList.remove('target'); } },
  tryPlace(shift) {
    const p = this.place, w = this.ownUnits().filter(u => u.def.worker);
    if (!w.length) { this.place = null; return; }
    // the closest worker goes (or the one already chosen)
    const d = BUILDINGS[p.kind]; w.sort((a, b) => Math.hypot(a.x - p.tx, a.y - p.ty) - Math.hypot(b.x - p.tx, b.y - p.ty));
    if (!canAfford(ME, d.cost)) { this.flash('Not enough ' + (G.players[ME].fish < d.cost.f ? 'fish.' : 'wood.')); return; }
    if (!G.map.canPlace(p.tx, p.ty, d.size)) { this.flash("Can't build there."); return; }
    if (CMD.exec({ t: 'build', id: w[0].id, kind: p.kind, tx: p.tx, ty: p.ty, shift: !!(shift && w[0].order && w[0].order.type === 'build') })) { this.ping(p.tx + d.size / 2, p.ty + d.size / 2, '#ffd36b'); sfx('ack'); if (!shift) { this.place = null; this.hint(); } }
  },

  // ── touch: tap = select / order, drag = pan, long-press drag = box, pinch = zoom ──
  touchDown(e) {
    const t = this.touch || (this.touch = { pts: new Map() });
    t.pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    if (t.pts.size === 1) { t.mode = 'tap'; t.cam = { x: R.cam.x, y: R.cam.y };
      clearTimeout(t.lp); t.lp = setTimeout(() => { if (t.mode === 'tap') { const p = [...t.pts.values()][0]; if (!p) return; t.mode = 'box'; this.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; if (navigator.vibrate) navigator.vibrate(15); } }, 380); }
    if (t.pts.size === 2) { clearTimeout(t.lp); t.mode = 'pinch'; this.box = null; const [a, b] = [...t.pts.values()]; t.d0 = Math.hypot(a.x - b.x, a.y - b.y); t.z0 = R.cam.z; t.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; t.cam = { x: R.cam.x, y: R.cam.y }; }
  },
  touchMove(e) {
    const t = this.touch; if (!t || !t.pts.has(e.pointerId)) return; const p = t.pts.get(e.pointerId); p.x = e.clientX; p.y = e.clientY;
    if (t.mode === 'tap' && Math.hypot(p.x - p.x0, p.y - p.y0) > 12) { t.mode = 'pan'; clearTimeout(t.lp); }
    if (t.mode === 'pan') { R.cam.x = t.cam.x - (p.x - p.x0) / R.cam.z; R.cam.y = t.cam.y - (p.y - p.y0) / R.cam.z; R.clampCam(this.viewH()); }
    if (t.mode === 'box') { this.box.x1 = p.x; this.box.y1 = p.y; }
    if (t.mode === 'pinch' && t.pts.size >= 2) { const [a, b] = [...t.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      const z = clamp(t.z0 * d / t.d0, 0.55, 1.8), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const wx = t.cam.x + t.mid.x / t.z0, wy = t.cam.y + t.mid.y / t.z0; R.cam.z = z; R.cam.x = wx - mid.x / z; R.cam.y = wy - mid.y / z; R.clampCam(this.viewH()); }
    if (this.place && t.mode !== 'pinch') { const [wx, wy] = R.toWorld(p.x, p.y), s = BUILDINGS[this.place.kind].size; this.place.tx = Math.round(wx - s / 2); this.place.ty = Math.round(wy - s / 2); }
  },
  touchUp(e, cancel) {
    const t = this.touch; if (!t) return; const p = t.pts.get(e.pointerId); t.pts.delete(e.pointerId); clearTimeout(t.lp);
    if (t.pts.size) { if (t.mode === 'pinch') t.mode = 'done'; return; }
    if (cancel || !p) { this.box = null; return; }
    if (t.mode === 'box' && this.box) { const b = this.box; this.box = null; this.boxSelect(b, false); return; }
    if (t.mode !== 'tap') return;
    const sx = p.x, sy = p.y;
    if (this.place) { const [wx, wy] = R.toWorld(sx, sy), s = BUILDINGS[this.place.kind].size; this.place.tx = Math.round(wx - s / 2); this.place.ty = Math.round(wy - s / 2); this.tryPlace(false); return; }
    if (this.target) { this.applyTarget(sx, sy, false); return; }
    const ent = this.pick(sx, sy), haveUnits = this.ownUnits().length > 0;
    if (ent && this.mine(ent)) {
      // a worker tapping its own unfinished building / hall: still an order; otherwise select
      if (haveUnits && ent.isBuilding && (!ent.built || (ent.def.hall && this.ownUnits().some(u => u.carry)))) { this.rightClick(sx, sy, false); return; }
      const now = performance.now(); if (this.lastClick.id === ent.id && now - this.lastClick.t < 350) { this.setSel(G.ents.filter(o => this.mine(o) && o.kind === ent.kind && this.onScreen(o, this.viewH()))); return; }
      this.lastClick = { t: now, id: ent.id }; this.setSel([ent]); sfx('click'); return; }
    if (haveUnits || this.sel.some(s => this.mine(s) && s.isBuilding)) { this.rightClick(sx, sy, false); return; }
    this.setSel(ent ? [ent] : []);
  },
  zoomAt(sx, sy, k) { const z = clamp(R.cam.z * k, 0.55, 1.8), [wx, wy] = [R.cam.x + sx / R.cam.z, R.cam.y + sy / R.cam.z]; R.cam.z = z; R.cam.x = wx - sx / z; R.cam.y = wy - sy / z; R.clampCam(this.viewH()); },

  // ── keys ──
  key(e) {
    if (!G || G.over || Main.paused) { if (e.key === 'Escape' || e.key === 'F10') { e.preventDefault(); Main.togglePause(); } return; }
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (e.key.startsWith('Arrow')) { this.arrows[e.key] = true; e.preventDefault(); return; }
    if (k === 'Escape') { e.preventDefault(); if (this.place || this.target) { this.place = null; this.target = null; this.hint(); return; } if (this.menu !== 'main') { this.menu = 'main'; this.cardSig = ''; return; } Main.togglePause(); return; }
    if (k === 'F10') { e.preventDefault(); Main.togglePause(); return; }
    if (k === 'F1') { e.preventDefault(); this.selectHero(); return; }
    if (k === 'F2') { e.preventDefault(); this.selectArmy(); return; }
    if (k === 'F3' || k === '.') { e.preventDefault(); this.idleWorker(); return; }
    if (k === ' ') { e.preventDefault(); const a = G.alerts.filter(x => x.p === undefined || x.p === ME).pop(); if (a) R.centerOn(a.x, a.y, this.viewH()); return; }
    if (k === 'Tab') { e.preventDefault(); this.sub++; this.cardSig = ''; return; }
    if (/^[0-9]$/.test(k)) { const g = +k;
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.groups[g] = this.sel.filter(s => this.mine(s)).map(s => s.id); this.flash('Group ' + g + ' set'); return; }
      const ids = this.groups[g]; if (!ids) return; const list = ids.map(i => G.byId.get(i)).filter(x => x && !x.dead);
      const now = performance.now(); if (this.lastGroup === g && now - this.lastGroupT < 350 && list.length) { R.centerOn(list[0].x, list[0].y, this.viewH()); }
      this.lastGroup = g; this.lastGroupT = now; if (list.length) this.setSel(list); return; }
    // command card hotkeys
    const card = this.cardItems(); const b = card.find(c => c && c.key === k && c.on);
    if (b) { e.preventDefault(); b.act(e.shiftKey); this.cardSig = ''; }
  },
  flash(t) { G.msgs.push({ p: ME, text: t, col: '#ddd', t: G.time }); },
  selectHero() { const h = G.players[ME].hero && G.byId.get(G.players[ME].hero); if (h) { if (this.sel.length === 1 && this.sel[0] === h) R.centerOn(h.x, h.y, this.viewH()); this.setSel([h]); } },
  selectArmy() { this.setSel(G.ents.filter(e => this.mine(e) && e.isUnit && !e.def.worker)); },
  idleWorker() { const idle = G.ents.filter(e => this.mine(e) && e.isUnit && e.def.worker && !e.order); if (!idle.length) { this.flash('No idle workers.'); return; }
    const w = idle[this.lastIdle++ % idle.length]; this.setSel([w]); R.centerOn(w.x, w.y, this.viewH()); },

  // ── the command card ──
  cardItems() {
    const slots = new Array(12).fill(null), p = this.primary(); if (!p || !this.mine(p) && p.kind !== 'exchange') return slots;
    const pl = G.players[ME], put = (i, o) => { slots[i] = o; };
    // prices with the same pictures as the top bar: a fish and a log
    const costTip = c => (c.f ? '<img class="ci" src="rts/art/res_fish.png">' + c.f + ' fish' : '') + (c.w ? (c.f ? ' &nbsp;' : '') + '<img class="ci" src="rts/art/res_wood.png">' + c.w + ' wood' : '');
    if (p.kind === 'exchange') {
      ['snout', 'mechboar', 'merlin'].forEach((k, i) => { const d = UNITS[k]; put(i, { key: 'QWE'[i], img: unitPic(k), title: 'Hire ' + d.name, tip: d.desc, cost: costTip(d.cost) + ', ' + d.sup + ' supply', n: p.stock[k] ? '' : 'out', on: true, off: !p.stock[k] || !canAfford(ME, d.cost), act: () => CMD.exec({ t: 'hire', ex: p.id, kind: k }) && sfx('done') }); });
      return slots; }
    if (p.isUnit) {
      const units = this.ownUnits();
      if (this.menu === 'build' && p.def.worker) {
        BUILD_MENU[pl.faction].forEach((k, i) => { const d = BUILDINGS[k], ok = reqMet(ME, d);
          put(i < 4 ? i : i + 0, { key: 'QWERAS'[i], bimg: k, title: d.name, tip: d.desc + (ok ? '' : ' Requires: ' + d.req.map(r => BUILDINGS[r].name).join(', ') + '.'), cost: costTip(d.cost), on: true, off: !ok || !canAfford(ME, d.cost),
            act: () => { if (!ok) { this.flash('Requires ' + d.req.map(r => BUILDINGS[r].name).join(', ') + '.'); return; } if (!canAfford(ME, d.cost)) { this.flash('Not enough ' + (pl.fish < d.cost.f ? 'fish.' : 'wood.')); return; }
              this.place = { kind: k, tx: 0, ty: 0 }; const [wx, wy] = R.toWorld(this.mx || R.W / 2, this.my || R.H / 2); this.place.tx = Math.round(wx - d.size / 2); this.place.ty = Math.round(wy - d.size / 2);
              this.hint(IS_TOUCH ? 'Tap where to build' : 'Click to place · Shift keeps placing · Right click cancels'); } }); });
        put(11, { key: 'Escape', svg: SVG.back, title: 'Back', on: true, act: () => { this.menu = 'main'; } });
        return slots; }
      put(0, { key: 'M', svg: SVG.move, title: 'Move', tip: 'Walk there, ignoring enemies.', on: true, act: () => this.startTarget({ type: 'move', hint: IS_TOUCH ? 'Tap where to move' : 'Click where to move' }) });
      put(1, { key: 'S', svg: SVG.stop, title: 'Stop', on: true, act: () => CMD.exec({ t: 'stop', ids: units.map(u => u.id) }) });
      put(2, { key: 'H', img: 'rts/art/item_collar.png', title: 'Hold position', tip: 'Stay put and fight only what comes in range.', on: true, act: () => CMD.exec({ t: 'hold', ids: units.map(u => u.id) }) });
      put(3, { key: 'A', img: 'rts/art/item_claws.png', title: 'Attack', tip: 'Attack-move: fight everything on the way.', on: true, act: () => this.startTarget({ type: 'amove', hint: IS_TOUCH ? 'Tap a target or a place' : 'Click a target or a place to attack-move' }) });
      if (p.def.worker) {
        put(8, { key: 'B', img: 'rts/art/scaffold.png', title: 'Build', tip: 'Choose a building.', on: true, act: () => { this.menu = 'build'; } });
        put(9, { key: 'C', img: 'rts/art/res_fish.png', title: 'Return cargo', on: units.some(u => u.carry), off: !units.some(u => u.carry), act: () => CMD.exec({ t: 'ret', ids: units.filter(u => u.carry).map(u => u.id) }) });
      }
      if (p.def.hero) p.def.abilities.forEach((a, i) => { const A = ABILITIES[a], lock = p.level < A.lvl, cd = Math.max(0, (p.cds[a] || 0) - G.time);
        put(4 + i + (i === 2 ? 1 : 0), { key: A.key, img: ICON_IMG[A.icon], hue: A.hue, title: A.name + (lock ? ' (level ' + A.lvl + ')' : ''), tip: A.desc, cost: A.mana + ' mana · ' + A.cd + 's cooldown',
          on: true, off: lock || p.mana < A.mana || cd > 0, cd: cd / A.cd, n: lock ? 'L' + A.lvl : '',
          act: () => { if (lock) { this.flash('Unlocks at level ' + A.lvl + '.'); return; } if (!canCast(p, a)) { this.flash(p.mana < A.mana ? 'Not enough mana.' : 'Not ready yet.'); return; }
            if (A.target === 'point') this.startTarget({ type: 'cast', a, hero: p, hint: (IS_TOUCH ? 'Tap' : 'Click') + ' where to cast ' + A.name }); else { CMD.exec({ t: 'cast', h: p.id, a }); sfx('ack'); } } }); });
      return slots;
    }
    if (p.isBuilding && p.built) {
      const keys = 'QWER';
      (p.def.prod || []).forEach((k, i) => { const d = UNITS[k];
        if (d.hero && pl.heroDead) { const c = { f: 150 + 40 * pl.heroDead.level, w: 0 }; put(i, { key: keys[i], img: 'rts/art/item_heart.png', title: 'Revive hero (level ' + pl.heroDead.level + ')', cost: costTip(c), on: true, off: !canAfford(ME, c), act: () => CMD.exec({ t: 'revive', b: p.id }) && sfx('ack') }); return; }
        const heroBlocked = d.hero && (pl.hero || p.prodQ.some(q => q.unit === k));
        const reqOk = !d.req || reqMet(ME, d), typeTip = '<div style="opacity:.8;font-size:12px">' + TYPE_NAME[d.atk || 'normal'] + ' attack · ' + TYPE_NAME[d.arm || 'medium'] + ' armour' + (reqOk ? '' : ' · <span style="color:#ff9a8a">needs ' + d.req.map(r => BUILDINGS[r].name).join(', ') + '</span>') + '</div>';
        put(i, { key: keys[i], img: unitPic(k), title: 'Train ' + d.name, tip: d.desc + (heroBlocked ? ' (one hero at a time)' : '') + typeTip, cost: costTip(d.cost) + ', ' + d.sup + ' supply · ' + d.time + 's', on: true, off: heroBlocked || !reqOk || !canAfford(ME, d.cost) || pl.supUsed + d.sup > pl.supCap,
          act: () => { if (CMD.exec({ t: 'train', b: p.id, kind: k })) sfx('ack'); } }); });
      (p.def.res || []).forEach((u, i) => { const U = UPGRADES[u]; if (U.faction && U.faction !== pl.faction) return; const lvl = pl.up[u] || 0, max = lvl >= U.levels.length, c = U.levels[Math.min(lvl, U.levels.length - 1)];
        put(i, { key: keys[i], img: { weap: 'rts/art/item_claws.png', arm: 'rts/art/item_collar.png', catnip: 'spells/catnip.png', scurry: 'spells/zoomies.png' }[u], title: U.name + (U.levels.length > 1 ? ' ' + (lvl + 1) : ''), tip: U.desc, cost: max ? 'Done' : costTip(c) + ' · ' + c.time + 's', n: max ? '✓' : '',
          on: !max, off: max || pl.researching[u] || !canAfford(ME, c), act: () => { if (CMD.exec({ t: 'research', b: p.id, up: u })) sfx('ack'); } }); });
      if (p.prodQ.length) put(11, { key: 'Escape', svg: SVG.cancel, title: 'Cancel last', on: true, act: () => CMD.exec({ t: 'cancelq', b: p.id, i: p.prodQ.length - 1 }) });
      if (p.def.prod) put(8, { key: 'Y', svg: SVG.move, title: 'Set rally point', tip: 'Where new units go. Right-click also sets it.', on: true, act: () => this.startTarget({ type: 'rally', hint: 'Click the rally point' }) });
    } else if (p.isBuilding && !p.built) put(11, { key: 'Escape', svg: SVG.cancel, title: 'Cancel construction', tip: 'Refunds 75%.', on: true, act: () => { CMD.exec({ t: 'cancelb', b: p.id }); this.setSel([]); } });
    return slots;
  },
  renderCard() {
    const items = this.cardItems(), sig = items.map(c => c ? c.title + c.off + (c.n || '') + (c.cd ? (c.cd * 10 | 0) : '') : '-').join('|') + this.menu;
    if (sig === this.cardSig) return; this.cardSig = sig; const el = $('card'); el.innerHTML = '';
    items.forEach((c, i) => { try { this.cardButton(el, c); } catch (e) { console.warn('card', e); } });
  },
  cardButton(el, c) {
    { const d = document.createElement('div'); d.className = 'cb' + (c ? (c.off ? ' off' : '') : ' empty');
      if (c) {
        if (c.img) { const im = document.createElement('img'); im.src = c.img; if (c.hue) im.style.filter = 'hue-rotate(' + c.hue + 'deg)'; d.appendChild(im); }
        else if (c.bimg) { const im = document.createElement('img'); im.src = buildingIcon(c.bimg); d.appendChild(im); }
        else if (c.svg) d.insertAdjacentHTML('beforeend', c.svg);
        d.insertAdjacentHTML('beforeend', '<span class="k">' + (c.key === 'Escape' ? 'Esc' : c.key) + '</span>' + (c.n ? '<span class="n">' + c.n + '</span>' : '') + (c.cd ? '<span class="cd" style="height:' + (c.cd * 100) + '%"></span>' : ''));
        d.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); if (IS_TOUCH) { this.showTip(c, d); clearTimeout(this.tipT); this.tipT = setTimeout(() => this.showTip(null), 1800); } c.act(ev.shiftKey); this.cardSig = ''; });
        d.addEventListener('pointerenter', () => { if (!IS_TOUCH) this.showTip(c, d); });
        d.addEventListener('pointerleave', () => { if (!IS_TOUCH) this.showTip(null); });
      }
      el.appendChild(d); }
  },
  showTip(c) { const t = $('tip'); if (!c) { t.style.display = 'none'; return; }
    t.innerHTML = '<b>' + c.title + '</b>' + (c.key && c.key !== 'Escape' ? ' <span style="opacity:.6">[' + c.key + ']</span>' : '') + (c.tip ? '<div>' + c.tip + '</div>' : '') + (c.cost ? '<div class="c">' + c.cost + '</div>' : ''); t.style.display = 'block'; },

  // ── the info panel ──
  renderInfo() {
    const el = $('info'); this.sel = this.sel.filter(e => !e.dead && (e.owner === ME || (e.isUnit ? visibleTo0(e) : true)));
    const p = this.primary(); const sel = this.sel;
    const sig = sel.map(e => e.id + ':' + Math.round(e.hp) + ':' + (e.mana | 0) + ':' + (e.level || 0) + ':' + (e.items ? e.items.join() : '') + ':' + (e.prodQ ? e.prodQ.map(q => (q.unit || q.up || 'r') + (q.t / q.total * 20 | 0)).join() : '') + ':' + (e.amount || '') + ':' + (e.progress ? (e.progress * 50 | 0) : '') + (e.stock ? JSON.stringify(e.stock) : '')).join('|') + this.sub + (p && p.isUnit ? (uDmg(p) | 0) : '');
    if (sig === this.infoSig) return; this.infoSig = sig;
    if (!sel.length) { el.innerHTML = '<div class="stats"><div class="sub">' + (IS_TOUCH ? 'Tap a unit to select it. Hold and drag to select many.' : 'Select a unit or building. Drag a box to select many.') + '</div></div>'; return; }
    if (sel.length > 1) {
      el.innerHTML = ''; const g = document.createElement('div'); g.className = 'grid';
      for (const e of sel) { const d = document.createElement('div'); d.className = 'mini'; if (e === p) d.style.borderColor = '#ffd36b';
        const k = e.hp / e.maxHp; d.innerHTML = '<img src="' + (e.isUnit ? unitPic(e.kind) : buildingIcon(e.kind)) + '"><span class="hp"><b style="width:' + (k * 100) + '%;background:' + (k > 0.6 ? '#5fd35a' : k > 0.3 ? '#e8c84a' : '#e05545') + '"></b></span>';
        d.onpointerdown = ev => { ev.preventDefault(); if (ev.shiftKey) this.setSel(this.sel.filter(s => s !== e)); else this.setSel([e]); }; g.appendChild(d); }
      el.appendChild(g); return; }
    const e = sel[0];
    if (e.isRes) { el.innerHTML = '<div class="port"><img src="rts/art/pond.png"></div><div class="stats"><h3>' + (e.rich ? 'Rich Fishing Spot' : 'Fishing Spot') + '</h3><div>' + e.amount + ' fish left</div><div class="sub">Workers fish here and carry it to your town hall.</div></div>'; return; }
    const owner = e.owner === ME ? 'Yours' : e.owner === 1 - ME ? 'Enemy' : e.owner === P_CREEP ? 'Neutral hostile' : 'Neutral';
    const pic = e.isUnit ? unitPic(e.kind) : buildingIcon(e.kind);
    let bag = '', h = '<div class="port"><img src="' + pic + '"></div><div class="stats"><h3>' + (e.def.name) + (e.isUnit && e.def.hero ? ' <span style="color:#ffd36b">Lv ' + e.level + '</span>' : '') + '</h3><div class="sub">' + owner + '</div>';
    if (!(e.def.invuln)) h += '<div>' + Math.ceil(e.hp) + ' / ' + Math.round(e.maxHp) + '</div><div class="bar"><b style="width:' + (e.hp / e.maxHp * 100) + '%;background:#5fd35a"></b></div>';
    if (e.isUnit) {
      if (e.maxMana) h += '<div class="bar"><b style="width:' + (e.mana / e.maxMana * 100) + '%;background:#5aa0ff"></b></div>';
      const d = e.def, pl = G.players[e.owner], up = (pl.up && pl.up.weap || 0) * 2 + (e.level ? (e.level - 1) * 3 : 0) + itemBonus(e, 'dmg');
      h += '<div class="sub">Damage ' + (d.dmg[0] + up) + '–' + (d.dmg[1] + up) + ' ' + TYPE_NAME[atkType(e)] + ' · Armour ' + (Math.round(uArmor(e) * 10) / 10) + ' ' + TYPE_NAME[armType(e)] + ' · ' + (uRange(e) > 2 ? 'Range ' + uRange(e) : 'Melee') + '</div>';
      if (d.hero) { const need = HERO_XP[e.level] || 0, prev = HERO_XP[e.level - 1] || 0; if (e.level < HERO_MAX) h += '<div class="bar" title="experience"><b style="width:' + ((e.xp - prev) / (need - prev) * 100) + '%;background:#c98aff"></b></div>';
        if (e.owner === ME) { bag = '<div class="bag"><div class="lbl">ITEMS</div><div class="slots">'; for (let i = 0; i < 3; i++) { const it = e.items[i]; bag += '<span class="slot' + (it && ITEMS[it].use ? ' usable' : '') + '" data-i="' + i + '" title="' + (it ? ITEMS[it].name + ': ' + ITEMS[it].desc + (ITEMS[it].use ? ' (click to use)' : ' (always on)') : 'empty slot') + '">' + (it ? '<img src="rts/art/item_' + it + '.png">' + (ITEMS[it].use ? '<b class="use">USE</b>' : '') : '') + '</span>'; } bag += '</div></div>'; } }
      if (d.worker && e.carry) h += '<div class="sub">Carrying ' + e.carry.amt + (e.carry.type === 'f' ? ' fish' : ' wood') + '</div>';
      if (d.desc && !d.hero) h += '<div class="sub">' + d.desc + '</div>';
    } else {
      if (!e.built) h += '<div class="sub">Under construction — ' + Math.round(e.progress * 100) + '%</div>';
      if (e.def.supply && e.built) h += '<div class="sub">Provides ' + e.def.supply + ' supply</div>';
      if (e.def.desc) h += '<div class="sub">' + e.def.desc + '</div>';
      if (e.kind === 'exchange') h += '<div class="sub">In stock: Agent Snout ' + (e.stock.snout ? '✓' : '—') + ', Mech Boar ' + (e.stock.mechboar ? '✓' : '—') + ', Merlin ' + (e.stock.merlin ? '✓' : '—') + '</div>';
      if (e.prodQ && e.prodQ.length && e.owner === ME) { h += '<div class="queue">'; e.prodQ.forEach((q, i) => { const src = q.unit ? unitPic(q.unit) : null;
          h += '<span class="mini" data-q="' + i + '" title="click to cancel">' + (src ? '<img src="' + src + '">' : '<img src="' + (q.revive ? 'rts/art/item_heart.png' : ({ weap: 'rts/art/item_claws.png', arm: 'rts/art/item_collar.png', catnip: 'spells/catnip.png', scurry: 'spells/zoomies.png' }[q.up])) + '">') + '<span class="hp"><b style="width:' + (i === 0 ? q.t / q.total * 100 : 0) + '%;background:#9be38f"></b></span></span>'; }); h += '</div>'; }
    }
    h += '</div>' + bag; el.innerHTML = h;
    this.infoEnt = e;
  },
  renderTop() {
    const pl = G.players[ME];
    const set = (id, v) => { const s = $(id).querySelector('span'); if (s.textContent !== v) s.textContent = v; };
    set('rFish', '' + pl.fish); set('rWood', '' + pl.wood); set('rSup', pl.supUsed + '/' + pl.supCap); $('rSup').classList.toggle('full', pl.supUsed >= pl.supCap);
    const t = G.time | 0, c = (t / 60 | 0) + ':' + String(t % 60).padStart(2, '0'); if ($('clock').textContent !== c) $('clock').textContent = c;
    $('qHero').style.display = pl.hero ? '' : 'none';
    const supIcon = 'url(rts/art/' + (pl.faction === 'rats' ? 'nest' : 'cottage') + '.png)', si = $('rSup').querySelector('i'); if (si.style.backgroundImage !== supIcon) si.style.backgroundImage = supIcon;
    // messages: the last few, fading
    const m = $('msgs'), live = G.msgs.filter(x => (x.p === undefined || x.p === ME) && G.time - x.t < 7);
    const sig = live.map(x => x.t + x.text).join(); if (sig !== this.msgSig) { this.msgSig = sig; m.innerHTML = live.map(x => '<div style="color:' + x.col + '">' + x.text + '</div>').join(''); }
  },
  update(dt) {
    // camera: arrows and the screen edge (mouse only)
    const sp = 900 * dt / R.cam.z; let dx = 0, dy = 0;
    if (this.arrows.ArrowLeft) dx -= 1; if (this.arrows.ArrowRight) dx += 1; if (this.arrows.ArrowUp) dy -= 1; if (this.arrows.ArrowDown) dy += 1;
    if (!IS_TOUCH && document.hasFocus() && !this.box && !this.pan) { dx += this.edge.x; dy += this.edge.y; }
    if (dx || dy) { R.cam.x += dx * sp; R.cam.y += dy * sp; R.clampCam(this.viewH()); }
    this.renderTop(); this.renderInfo(); this.renderCard();
  },
};
// a unit's picture for the HUD: the hand-made art when there is some, else its first walk frame
function unitPic(kind) { const a = art(kind + '_walk0'); return a ? a.src : SPR[UNITS[kind].spr].walk[0]; }
// building icons: drawn once from the same code that draws them on the map
const BICON = {};
function buildingIcon(kind) {
  if (BICON[kind]) return BICON[kind];
  // the hand-made picture itself when there is one — copying it through a canvas is refused when
  // the game runs straight from a file (file://), which used to leave the whole command card empty
  const pic = (kind === 'burrow' && art('burrow_hall')) || art(kind); if (pic) return BICON[kind] = pic.src;
  const d = BUILDINGS[kind], s = d.size * TILE, c = document.createElement('canvas'); c.width = c.height = s + 20;
  const g = c.getContext('2d'); g.translate(10, 14); R.building(g, { kind, tx: 0, ty: 0, size: d.size, def: d, owner: 0, built: true, x: d.size / 2, y: d.size / 2 });
  try { return BICON[kind] = c.toDataURL(); } catch (e) { return BICON[kind] = ''; }
}
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

// tiny sounds, made on the spot
let AC = null;
function sfx(kind) {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime, tone = (f, d, type, v, at = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d); o.connect(g); g.connect(AC.destination); o.start(t + at); o.stop(t + at + d + 0.02); };
    if (kind === 'click') tone(880, 0.05, 'triangle', 0.04);
    if (kind === 'ack') tone(520, 0.07, 'square', 0.025);
    if (kind === 'done') { tone(660, 0.1, 'triangle', 0.05); tone(990, 0.12, 'triangle', 0.05, 0.08); }
    if (kind === 'alert') { tone(220, 0.25, 'sawtooth', 0.04); tone(180, 0.3, 'sawtooth', 0.04, 0.2); }
    if (kind === 'win') [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.06, i * 0.15));
    if (kind === 'lose') [392, 330, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.06, i * 0.2));
  } catch (e) {}
}
