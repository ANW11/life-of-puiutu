// Border War — drawing: a painted terrain layer (cached), buildings drawn by hand in code,
// the game's own sprites for units, fog of war, effects and the minimap.
'use strict';
const TEAM = ['#4fa8ff', '#ff5b4d', '#d9c25a', '#bbbbbb'];
const TEAM_RGB = ['79,168,255', '255,91,77', '217,194,90', '187,187,187'];
// colours are yours vs theirs: you are always blue, whoever you play
function teamOf(owner) { return owner === ME ? 0 : owner === 1 - ME ? 1 : owner; }
const IMG = {};
function img(src) { let i = IMG[src]; if (!i) { i = IMG[src] = new Image(); i.src = src; } return i; }
function ready(i) { return i && i.complete && i.naturalWidth > 0; }
// ── optional hand-made art: drop PNGs into rts/art/ and they replace the drawn-in-code versions ──
const ART_NAMES = ['den', 'cottage', 'yard', 'scratch', 'pride', 'cattower', 'burrow', 'nest', 'warren', 'junkforge', 'pit', 'spiketower', 'exchange',
  'tree_pine', 'tree_oak', 'tree_pine2', 'tree_oak2', 'rock', 'rock2', 'stump', 'pond', 'grass', 'dirt', 'water', 'scaffold',
  'courier_walk0', 'courier_walk1', 'courier_walk2', 'courier_walk3', 'courier_work', 'courier_carry',
  'scavenger_walk0', 'scavenger_walk1', 'scavenger_walk2', 'scavenger_walk3', 'scavenger_work', 'scavenger_carry',
  'burrow_hall', 'item_mouse', 'item_carrot', 'res_fish', 'res_wood', 'res_coin',
  'item_goldbanana', 'item_potion', 'item_mana', 'item_claws', 'item_collar', 'item_bell', 'item_heart', 'item_scroll'];
const ART = {};
function loadArt() {
  return Promise.all(ART_NAMES.map(n => new Promise(res => { const i = new Image(); i.onload = () => { ART[n] = i; res(); }; i.onerror = () => res(); i.src = 'rts/art/' + n + '.png'; })));
}
function art(n) { return ART[n] || null; }
function preload() {
  for (const k in SPR) { const s = SPR[k]; s.walk.forEach(img); if (s.atk) img(s.atk); if (s.idle) img(s.idle); }
  for (const k in PROJ_IMG) img(PROJ_IMG[k]); for (const k in ICON_IMG) img(ICON_IMG[k]); for (const k in FX_IMG) img(FX_IMG[k]);
}

const R = {
  cv: null, ctx: null, cam: { x: 0, y: 0, z: 1 }, dpr: 1, W: 0, H: 0,
  terrain: null, mini: null, fogCv: null,
  init(cv) { this.cv = cv; this.ctx = cv.getContext('2d'); this.resize(); },
  resize() { const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height; this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr); },
  // world (tiles) ↔ screen (css px)
  toScreen(x, y) { return [(x * TILE - this.cam.x) * this.cam.z, (y * TILE - this.cam.y) * this.cam.z]; },
  toWorld(sx, sy) { return [(sx / this.cam.z + this.cam.x) / TILE, (sy / this.cam.z + this.cam.y) / TILE]; },
  clampCam(viewH) { const n = G.n * TILE, vw = this.W / this.cam.z, vh = (viewH || this.H) / this.cam.z;
    this.cam.x = clamp(this.cam.x, -40, n - vw + 40); this.cam.y = clamp(this.cam.y, -40, n - vh + 40); },
  centerOn(x, y, viewH) { this.cam.x = x * TILE - this.W / this.cam.z / 2; this.cam.y = y * TILE - (viewH || this.H) / this.cam.z / 2; this.clampCam(viewH); },

  // ── terrain: painted once, patched when a tree falls ──
  buildTerrain() {
    this.tint = null; this.makeLayers();
    const n = G.n, c = document.createElement('canvas'); c.width = c.height = n * TILE; this.terrain = c;
    this.paintRegion(0, 0, n - 1, n - 1);
    const m = document.createElement('canvas'); m.width = m.height = n; this.mini = m; this.paintMini();
    this.fogCv = document.createElement('canvas'); this.fogCv.width = this.fogCv.height = n; this.fogImg = this.fogCv.getContext('2d').createImageData(n, n);
  },
  paintMini() { const g = this.mini.getContext('2d'), n = G.n, d = g.createImageData(n, n);
    const col = [[86, 140, 64], [52, 104, 168], [34, 84, 40], [120, 116, 110], [150, 122, 80], [104, 132, 66]];
    for (let i = 0; i < n * n; i++) { const c = col[G.map.t[i]]; d.data[i * 4] = c[0]; d.data[i * 4 + 1] = c[1]; d.data[i * 4 + 2] = c[2]; d.data[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0); },
  patchTerrain() {
    if (!G.map.dirty.length) return; const n = G.n;
    for (const i of G.map.dirty) { const x = i % n, y = (i / n) | 0; this.paintRegion(x - 2, y - 4, x + 2, y + 1); }
    G.map.dirty.length = 0; this.paintMini();
  },
  paintRegion(x0, y0, x1, y1) {
    const g = this.terrain.getContext('2d'), n = G.n, M = G.map;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(n - 1, x1); y1 = Math.min(n - 1, y1);
    g.save(); g.beginPath(); g.rect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE); g.clip();
    // grass everywhere, with broad soft patches of colour instead of a chequerboard
    g.fillStyle = art('grass') ? g.createPattern(art('grass'), 'repeat') : '#5f9a45'; g.fillRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);
    if (!this.tint) this.makeTint();
    g.imageSmoothingEnabled = true; g.drawImage(this.tint, 0, 0, n, n, -TILE / 2, -TILE / 2, n * TILE + TILE, n * TILE + TILE);
    const X0 = x0 - 2, Y0 = y0 - 2, X1 = x1 + 2, Y1 = y1 + 2;
    const each = fn => { for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) if (M.inside(x, y)) fn(x, y, M.terr(x, y), M.deco[M.idx(x, y)]); };
    const blob = (x, y, d, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x * TILE + 16 + (d % 5 - 2), y * TILE + 16 + ((d >> 3) % 5 - 2), r, 0, 7); g.fill(); };
    // grass blades and flowers
    each((x, y, t, d) => { if (t !== T_WATER && t !== T_DIRT) this.blades(g, x, y, d, true); });
    // paths and lakes: smooth shapes cut once from the tile grid (see makeLayers)
    for (const L of this.layers) g.drawImage(L, 0, 0);
    each((x, y, t, d) => { if (t === T_DIRT) this.blades(g, x, y, d, false); });
    each((x, y, t, d) => { if (t === T_WATER && d % 4 === 0) { g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x * TILE + (d % 18) + 2, y * TILE + 10 + (d % 11), 9, 2); } });
    // trees and rocks, back to front, including the ones below whose crowns reach up into the region
    for (let y = y0 - 1; y <= y1 + 5; y++) for (let x = x0 - 2; x <= x1 + 2; x++) if (M.inside(x, y)) { const t = M.terr(x, y);
      if (t === T_TREE) this.tree(g, x, y); else if (t === T_ROCK) this.rock(g, x, y); else if (t === T_STUMP) this.stump(g, x, y); }
    g.restore();
  },
  // Each layer: a one-pixel-per-tile mask, blown up with smoothing and cut at a threshold —
  // the bilinear ramps between tiles turn into soft, rounded outlines instead of squares.
  makeLayers() {
    const n = G.n, N = n * TILE, M = G.map;
    const layer = (test, cut, soft, paint) => {
      const m = document.createElement('canvas'); m.width = m.height = n; const mg = m.getContext('2d'), md = mg.createImageData(n, n);
      for (let i = 0; i < n * n; i++) { md.data[i * 4 + 3] = test(i % n, (i / n) | 0) ? 255 : 0; }
      mg.putImageData(md, 0, 0);
      const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(m, 0, 0, N, N);
      const id = g.getImageData(0, 0, N, N), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const a = d[i + 3], k = Math.max(0, Math.min(1, (a - cut) / soft)); d[i + 3] = k * 255; }
      g.putImageData(id, 0, 0);
      g.globalCompositeOperation = 'source-in'; paint(g, N); return c;
    };
    const water = (x, y) => M.terr(x, y) === T_WATER;
    this.layers = [
      layer((x, y) => M.terr(x, y) === T_DIRT, 112, 18, (g, N) => { g.fillStyle = art('dirt') ? g.createPattern(art('dirt'), 'repeat') : '#9a7a50'; g.fillRect(0, 0, N, N); }),
      layer(water, 70, 14, (g, N) => { g.fillStyle = '#d6c58c'; g.fillRect(0, 0, N, N); }),
      layer(water, 100, 10, (g, N) => { g.fillStyle = '#e8f2f4'; g.fillRect(0, 0, N, N); }),
      layer(water, 116, 14, (g, N) => { g.fillStyle = art('water') ? g.createPattern(art('water'), 'repeat') : '#3a72b4'; g.fillRect(0, 0, N, N); }),
      layer(water, 190, 40, (g, N) => { g.fillStyle = '#31659e'; g.fillRect(0, 0, N, N); }),
    ];
  },
  makeTint() { const n = G.n, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), d = g.createImageData(n, n);
    const nz = makeNoise(mulberry(G.map.seed + 7), 6), nz2 = makeNoise(mulberry(G.map.seed + 9), 2.5);
    for (let i = 0; i < n * n; i++) { const x = i % n, y = (i / n) | 0, v = nz(x, y) * 0.7 + nz2(x, y) * 0.3, warm = v > 0.5;
      d.data[i * 4] = warm ? 150 : 40; d.data[i * 4 + 1] = warm ? 175 : 95; d.data[i * 4 + 2] = warm ? 70 : 35; d.data[i * 4 + 3] = Math.abs(v - 0.5) * 120; }
    g.putImageData(d, 0, 0); this.tint = c; },
  blades(g, x, y, d, grassy) {
    const px = x * TILE, py = y * TILE; let s = d * 7919 + x * 131 + y * 17 + 1; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < 6; k++) { g.fillStyle = grassy ? (r() < 0.5 ? 'rgba(30,70,25,.25)' : 'rgba(170,215,110,.22)') : (r() < 0.5 ? 'rgba(70,50,30,.28)' : 'rgba(200,170,120,.28)');
      g.fillRect(px + ((r() * 30) | 0), py + ((r() * 30) | 0), 2, grassy ? 3 : 2); }
    if (grassy && d > 246) { g.fillStyle = ['#f2e36b', '#f29bd0', '#ffffff'][d % 3]; g.fillRect(px + 10 + d % 12, py + 12 + d % 9, 3, 3); }
  },
  tree(g, x, y) {
    const d = G.map.deco[G.map.idx(x, y)], cx = x * TILE + 16 + (d % 7) - 3, by = y * TILE + 28, pine = d % 5 < 3;
    const pics = (pine ? ['tree_pine', 'tree_pine2'] : ['tree_oak', 'tree_oak2']).map(art).filter(Boolean);
    if (pics.length) { const p = pics[d % pics.length], w = 64 + (d % 13), h = w * p.naturalHeight / p.naturalWidth; g.drawImage(p, cx - w / 2, by + 6 - h, w, h); return; }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx + 3, by, 14, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3a1e'; g.fillRect(cx - 3, by - 14, 6, 14);
    if (pine) { const cols = ['#24532c', '#2d6434', '#38773d'];
      for (let k = 0; k < 3; k++) { g.fillStyle = cols[k]; const w = 18 - k * 4, top = by - 16 - k * 11;
        g.beginPath(); g.moveTo(cx - w, top + 12); g.lineTo(cx, top - 10); g.lineTo(cx + w, top + 12); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(cx, by - 46); g.lineTo(cx + 8, by - 28); g.lineTo(cx, by - 30); g.fill();
    } else { const cols = ['#2e6a33', '#3a7d3c', '#4b9145'];
      [[0, -26, 15], [-9, -20, 11], [9, -20, 11], [0, -34, 10]].forEach(([ox, oy, r], k) => { g.fillStyle = cols[Math.min(2, k)]; g.beginPath(); g.arc(cx + ox, by + oy, r, 0, 7); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(cx - 4, by - 36, 5, 0, 7); g.fill(); }
  },
  rock(g, x, y) { const cx = x * TILE + 16, cy = y * TILE + 20;
    const d = G.map.deco[G.map.idx(x, y)], ps = ['rock', 'rock2'].map(art).filter(Boolean);
    if (ps.length) { const p = ps[d % ps.length], w = 34, h = w * p.naturalHeight / p.naturalWidth; g.drawImage(p, cx - w / 2, cy + 12 - h, w, h); return; }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx + 2, cy + 8, 14, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#7d7a76'; g.beginPath(); g.moveTo(cx - 14, cy + 8); g.lineTo(cx - 10, cy - 8); g.lineTo(cx + 2, cy - 13); g.lineTo(cx + 13, cy - 4); g.lineTo(cx + 14, cy + 8); g.closePath(); g.fill();
    g.fillStyle = '#9a9792'; g.beginPath(); g.moveTo(cx - 10, cy - 8); g.lineTo(cx + 2, cy - 13); g.lineTo(cx + 4, cy - 2); g.lineTo(cx - 8, cy); g.closePath(); g.fill(); },
  stump(g, x, y) { const cx = x * TILE + 16, cy = y * TILE + 20;
    if (art('stump')) { const p = art('stump'), w = 22, h = w * p.naturalHeight / p.naturalWidth; g.drawImage(p, cx - w / 2, cy + 8 - h, w, h); return; }
    g.fillStyle = '#5a3a1e'; g.beginPath(); g.ellipse(cx, cy + 2, 7, 4, 0, 0, 7); g.fill(); g.fillRect(cx - 7, cy - 2, 14, 4);
    g.fillStyle = '#b08850'; g.beginPath(); g.ellipse(cx, cy - 2, 7, 4, 0, 0, 7); g.fill(); },

  // ── one frame ──
  draw(ui) {
    const g = this.ctx, z = this.cam.z, dpr = this.dpr; this.patchTerrain();
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#0c0f0a'; g.fillRect(0, 0, this.W, this.H);
    g.setTransform(dpr * z, 0, 0, dpr * z, -this.cam.x * dpr * z, -this.cam.y * dpr * z);
    g.imageSmoothingEnabled = z < 1;
    g.drawImage(this.terrain, 0, 0);
    g.imageSmoothingEnabled = true;
    const vx0 = this.cam.x / TILE - 3, vy0 = this.cam.y / TILE - 3, vx1 = vx0 + this.W / z / TILE + 6, vy1 = vy0 + this.H / z / TILE + 6;
    const inView = e => e.x > vx0 && e.x < vx1 && e.y > vy0 && e.y < vy1;
    // things on the ground: plague clouds, selection rings, items
    for (const c of G.clouds) this.cloud(g, c);
    for (const f of G.floods || []) if (this.seenEnt({ tx: f.tx, ty: f.ty, size: f.s })) this.flood(g, f);
    for (const it of G.items) if (G.seen[Math.floor(it.y) * G.n + Math.floor(it.x)]) this.item(g, it);
    const sel = new Set(ui.sel.map(e => e.id));
    const list = G.ents.filter(e => !e.dead && !e.tun && inView(e) && (e.owner === ME || (e.isUnit ? visibleTo0(e) : this.seenEnt(e))));
    for (const e of list) if (sel.has(e.id)) this.selRing(g, e);
    if (ui.hover && !ui.hover.dead && !sel.has(ui.hover.id)) this.selRing(g, ui.hover, true);
    // the Coon walks in a pulsing red ring, so nobody loses him in the trees
    for (const e of list) if (e.kind === 'coon') { const t = performance.now() / 1000, x = e.x * TILE, y = e.y * TILE;
      g.save(); g.strokeStyle = 'rgba(255,40,40,.85)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y + 2, 34, 13, 0, 0, 7); g.stroke();
      for (let i = 0; i < 2; i++) { const k = (t * 0.8 + i / 2) % 1; g.globalAlpha = 1 - k; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + 2, 34 + k * 40, 13 + k * 16, 0, 0, 7); g.stroke(); }
      g.restore(); }
    // everything else back to front
    list.sort((a, b) => (a.y + (a.isBuilding ? a.size * 0.35 : 0)) - (b.y + (b.isBuilding ? b.size * 0.35 : 0)));
    for (const e of list) { if (e.isRes) this.fishspot(g, e); else if (e.isBuilding) this.building(g, e); else this.unit(g, e); }
    for (const e of list) if (e.isUnit || e.isBuilding) this.bars(g, e, sel.has(e.id) || ui.hover === e);
    for (const p of G.proj) this.projectile(g, p);
    for (const f of G.fx) this.effect(g, f);
    for (const e of list) if (e.deal) this.dealSign(g, e);
    // rally line for a selected building
    for (const e of ui.sel) if (e.isBuilding && e.rally && e.owner === ME) { const [x1, y1] = [e.rally.x * TILE, e.rally.y * TILE];
      g.strokeStyle = 'rgba(140,255,140,.6)'; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(e.x * TILE, e.y * TILE); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]); this.flag(g, x1, y1); }
    // command pings
    for (const p of ui.pings) { const k = (performance.now() - p.t) / 500; if (k > 1) continue;
      g.strokeStyle = p.col; g.lineWidth = 2; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(p.x * TILE, p.y * TILE, 12 * (1 - k) + 4, 6 * (1 - k) + 2, 0, 0, 7); g.stroke(); g.globalAlpha = 1; }
    // fog
    this.fog(g);
    // building placement ghost
    if (ui.place) this.ghost(g, ui.place);
    // drag box (screen space)
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (G.rain) this.rain(g);
    if (ui.box) { const b = ui.box; g.strokeStyle = '#7dff7d'; g.lineWidth = 1; g.fillStyle = 'rgba(125,255,125,.08)';
      g.fillRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0));
      g.strokeRect(Math.min(b.x0, b.x1) + 0.5, Math.min(b.y0, b.y1) + 0.5, Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); }
  },
  seenEnt(e) { const n = G.n; for (let y = e.ty; y < e.ty + e.size; y++) for (let x = e.tx; x < e.tx + e.size; x++) if (G.seen[y * n + x]) return true; return false; },
  fog(g) {
    const n = G.n, d = this.fogImg.data;
    for (let i = 0; i < n * n; i++) { d[i * 4 + 3] = G.vis[i] ? 0 : G.seen[i] ? 120 : 255; }
    const fc = this.fogCv.getContext('2d'); fc.putImageData(this.fogImg, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(this.fogCv, 0, 0, n, n, -TILE / 2, -TILE / 2, n * TILE + TILE, n * TILE + TILE);
  },

  // ── units ──
  unit(g, u) {
    const S = SPR[u.def.spr], x = u.x * TILE, y = u.y * TILE;
    let frame = S.walk[0];
    if (u.swing > 0 && S.atk) frame = S.atk;
    else if (u.moving) frame = S.walk[Math.floor(u.anim * (6 + uSpeed(u))) % S.walk.length];
    else if (S.idle) frame = S.idle;
    let im = img(frame);
    // hand-made worker art, if it's there: walk cycle, a working pose, a pose for carrying a load home
    if (u.def.worker && art(u.kind + '_walk0')) {
      const walk = [0, 1, 2, 3].map(i => art(u.kind + '_walk' + i)).filter(Boolean);
      im = (u.working || u.swing > 0) && art(u.kind + '_work') ? art(u.kind + '_work')
         : (u.carry && u.carry.type === 'f' && u.carry.amt > 0 && art(u.kind + '_carry')) ? art(u.kind + '_carry')
         : u.moving ? walk[Math.floor(u.anim * 8) % walk.length] : walk[0];
    }
    if (!ready(im)) return;
    let h = S.h * (u.def.summon ? 0.85 : 1), w = h * im.naturalWidth / im.naturalHeight;
    // hand-made worker frames share one scale (taken from the first walk frame), so the
    // upright working pose stands taller instead of being squashed to the walk height
    if (u.def.worker && art(u.kind + '_walk0')) { const k = S.h * 1.05 / art(u.kind + '_walk0').naturalHeight; h = im.naturalHeight * k; w = im.naturalWidth * k; }
    // shadow
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y + 2, Math.max(w * 0.32, 8), Math.max(h * 0.12, 4), 0, 0, 7); g.fill();
    let bob = 0, sq = 1; if (S.wobble && u.moving) { bob = Math.abs(Math.sin(u.anim * 12)) * 3; sq = 1 + Math.sin(u.anim * 24) * 0.04; }
    // a crawler (the isopod) never hops: a low ripple of legs and a slight rock while it moves
    let rock = 0; if (S.crawl && u.moving) { bob = Math.abs(Math.sin(u.anim * 28)) * 0.8; sq = 1 - Math.sin(u.anim * 28) * 0.015; rock = Math.sin(u.anim * 14) * 0.025; }
    if (u.working && !u.moving) bob = Math.abs(Math.sin(u.anim * 9)) * 2;
    // the attack, for every unit whether or not its sheet has an attack pose: melee units lunge
    // forward, lean in and leave a slash; ranged ones rock back as they throw
    const atkFrame = u.swing > 0 && S.atk && frame === S.atk;
    const faceLeft = atkFrame && S.atkFaceRight ? false : !!S.faceLeft;
    const flip = (u.facing < 0) !== faceLeft;
    let lunge = 0, tilt = 0, k = 0;
    if (u.swing > 0 && u.swingDur) { k = 1 - u.swing / u.swingDur; const p = Math.sin(Math.min(1, k * 1.6) * Math.PI);
      if (u.swingRanged) { lunge = -p * 3; tilt = -p * 0.08; } else { lunge = p * Math.min(10, w * 0.22); tilt = p * 0.16; sq = 1 - p * 0.06; } }
    g.save(); g.translate(x + lunge * u.facing, y - bob); if (flip) g.scale(-1, 1);
    // lean towards the front of the sprite (its art faces right after the flip handling)
    if (tilt) { g.translate(0, -h * 0.15); g.rotate(tilt * (faceLeft ? -1 : 1)); g.translate(0, h * 0.15); }
    if (rock) g.rotate(rock);
    if (u.buffs.stun) g.rotate(Math.sin(u.anim * 20) * 0.05);
    if (G.time - (u.hitT || -9) < 0.12) g.filter = 'brightness(2.2)';
    if (u.def.summon) g.filter = 'hue-rotate(250deg) saturate(1.4)';
    g.drawImage(im, -w / 2, -h * sq, w, h * sq);
    g.filter = 'none'; g.restore();
    // the slash: a bright arc in front of a melee attacker at the moment of the hit
    if (u.swing > 0 && !u.swingRanged && k > 0.25 && k < 0.85) { const a = 1 - Math.abs(k - 0.55) / 0.3, fx = x + u.facing * (w * 0.42 + 4), fy = y - h * 0.5, r = Math.max(10, h * 0.42);
      g.save(); g.globalAlpha = Math.max(0, a); g.strokeStyle = u.def.hero ? '#ffe9a0' : '#ffffff'; g.lineWidth = u.def.hero ? 3.5 : 2.5; g.lineCap = 'round';
      g.beginPath(); if (u.facing > 0) g.arc(fx - r * 0.6, fy, r, -1.0, 0.9); else g.arc(fx + r * 0.6, fy, r, Math.PI - 0.9, Math.PI + 1.0); g.stroke();
      g.globalAlpha = Math.max(0, a) * 0.5; g.lineWidth = 1.5; g.beginPath(); if (u.facing > 0) g.arc(fx - r * 0.75, fy, r * 0.8, -0.8, 0.7); else g.arc(fx + r * 0.75, fy, r * 0.8, Math.PI - 0.7, Math.PI + 0.8); g.stroke(); g.restore(); }
    // what it carries
    if (u.carry && u.carry.amt > 0) {
      const own = u.def.worker && art(u.kind + '_walk0');
      const showsFish = own && art(u.kind + '_carry'), showsWood = own && u.kind === 'scavenger';   // the rat already hauls a bundle of sticks
      const ic = u.carry.type === 'f' ? (showsFish ? null : art('res_fish')) : (showsWood ? null : art('res_wood'));
      if (ic) { const iw = u.carry.type === 'f' ? 16 : 15, ih = iw * ic.naturalHeight / ic.naturalWidth, cx = x - u.facing * 4, cy = y - h * 0.62;
        g.save(); g.translate(cx, cy); if (u.facing < 0) g.scale(-1, 1); g.drawImage(ic, -iw / 2, -ih / 2, iw, ih); g.restore(); } }
    // buff marks
    if (u.morale) { g.save(); g.fillStyle = '#ffcf5a'; g.strokeStyle = '#5a3a10'; g.lineWidth = 1;   // morale: a little gold chevron for each win
      for (let i = 0; i < u.morale; i++) { const cx = x - (u.morale - 1) * 4 + i * 8, cy = y - h - 6; g.beginPath(); g.moveTo(cx - 3.5, cy); g.lineTo(cx, cy - 4); g.lineTo(cx + 3.5, cy); g.lineTo(cx, cy - 2); g.closePath(); g.fill(); g.stroke(); }
      g.restore(); }
    if (u.buffs.ward) this.halo(g, x, y, '120,255,160'); if (u.buffs.frenzy) this.halo(g, x, y, '255,190,70'); if (u.buffs.ninelives) this.halo(g, x, y, '255,240,140');
    if (u.buffs.stun) { g.fillStyle = '#ffe36b'; for (let k = 0; k < 3; k++) { const a = u.anim * 5 + k * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * 10, y - h - 4 + Math.sin(a) * 3, 2.2, 0, 7); g.fill(); } }
  },
  halo(g, x, y, rgb) { g.strokeStyle = 'rgba(' + rgb + ',.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 16, 7, 0, 0, 7); g.stroke(); },
  selRing(g, e, hover) {
    const col = e.owner <= 1 ? TEAM_RGB[teamOf(e.owner)] : e.owner === P_CREEP ? '240,200,90' : '210,210,210';
    g.strokeStyle = 'rgba(' + (e.owner === ME ? '120,255,120' : e.owner === 1 - ME ? '255,110,100' : col) + ',' + (hover ? 0.45 : 0.95) + ')'; g.lineWidth = hover ? 1.5 : 2;
    if (e.isBuilding || e.isRes) { const p = 3; g.strokeRect(e.tx * TILE - p, e.ty * TILE - p, e.size * TILE + p * 2, e.size * TILE + p * 2); return; }
    g.beginPath(); g.ellipse(e.x * TILE, e.y * TILE + 1, e.r * TILE * 1.3 + 4, (e.r * TILE * 1.3 + 4) * 0.45, 0, 0, 7); g.stroke();
  },
  bars(g, e, show) {
    const dmg = e.hp < e.maxHp - 0.5 || (e.maxShield && e.shield < e.maxShield - 0.5); if (!show && !dmg && !(e.isBuilding && !e.built)) return;
    if (e.def && e.def.invuln) return;
    const top = e.isBuilding ? e.ty * TILE - 10 : e.y * TILE - SPR[e.def.spr].h - 8, w = e.isBuilding ? e.size * TILE * 0.8 : Math.max(26, e.r * TILE * 2.4), x = e.x * TILE - w / 2;
    const k = clamp(e.hp / e.maxHp, 0, 1);
    g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - 1, top - 1, w + 2, 6);
    g.fillStyle = k > 0.6 ? '#5fd35a' : k > 0.3 ? '#e8c84a' : '#e05545'; g.fillRect(x, top, w * k, 4);
    // a cat's fur shield: a pale blue strip over the health bar
    if (e.isUnit && e.maxShield) { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - 1, top - 5, w + 2, 4); g.fillStyle = '#9fd8ff'; g.fillRect(x, top - 4, w * clamp(e.shield / e.maxShield, 0, 1), 2); }
    if (e.isUnit && e.maxMana) { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - 1, top + 5, w + 2, 4); g.fillStyle = '#5aa0ff'; g.fillRect(x, top + 5, w * e.mana / e.maxMana, 3); }
    if (e.isBuilding && !e.built) { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - 1, top + 5, w + 2, 4); g.fillStyle = '#ffd36b'; g.fillRect(x, top + 5, w * e.progress, 3); }
    if (e.isBuilding && e.built && e.prodQ && e.prodQ.length && e.owner === ME) { const q = e.prodQ[0]; g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - 1, top + 5, w + 2, 4); g.fillStyle = '#9be38f'; g.fillRect(x, top + 5, w * q.t / q.total, 3); }
    if (e.isUnit && e.def.hero) { g.fillStyle = '#ffd36b'; g.font = 'bold 10px Trebuchet MS'; g.textAlign = 'center'; g.fillText(e.level, x - 7, top + 5); }
  },
  item(g, it) { const x = it.x * TILE, y = it.y * TILE, t = performance.now() / 400, I = ITEMS[it.id];
    g.fillStyle = 'rgba(255,230,140,' + (0.25 + 0.15 * Math.sin(t)) + ')'; g.beginPath(); g.ellipse(x, y + 2, 12, 5, 0, 0, 7); g.fill();
    const p = art('item_' + it.id); if (p) { g.drawImage(p, x - 11, y - 22 - Math.sin(t) * 2, 22, 22); return; }
    g.fillStyle = '#6b4a1f'; g.fillRect(x - 7, y - 10 - Math.sin(t) * 2, 14, 10); g.fillStyle = I.col; g.fillRect(x - 5, y - 8 - Math.sin(t) * 2, 10, 6); },
  cloud(g, c) { const im = img(FX_IMG.cloud), x = c.x * TILE, y = c.y * TILE, r = c.r * TILE, t = performance.now() / 1000;
    if (!ready(im)) return; g.save(); g.globalAlpha = 0.55 * Math.min(1, (c.until - G.time) / 1);
    g.filter = 'hue-rotate(60deg) saturate(1.3)';
    for (let k = 0; k < 3; k++) { const a = t * 0.6 + k * 2.1, s = r * (1.1 + 0.1 * Math.sin(t + k)); g.drawImage(im, x - s + Math.cos(a) * 6, y - s * 0.7 + Math.sin(a) * 4, s * 2, s * 1.4); }
    g.filter = 'none'; g.restore(); },
  fishspot(g, f) {
    const x = f.tx * TILE, y = f.ty * TILE, s = f.size * TILE, t = performance.now() / 1000 + f.id;
    // the pond shrinks as it is fished out (down to two thirds of its size), so you can see when to move on
    if (art('pond')) { const p = art('pond'), w = s * 1.5 * (0.65 + 0.35 * Math.min(1, f.amount / (f.max || 1))), h = w * p.naturalHeight / p.naturalWidth; g.drawImage(p, x + s / 2 - w / 2, y + s / 2 - h / 2, w, h); }
    else {
    g.fillStyle = '#d9c88f'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2 + 2, s / 2 + 3, s / 2 - 2, 0, 0, 7); g.fill();
    g.fillStyle = f.rich ? '#2f8fbf' : '#2f6faf'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2, s / 2 - 1, s / 2 - 5, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; const rr = (t * 0.6) % 1;
    g.beginPath(); g.ellipse(x + s / 2, y + s / 2, (s / 2 - 8) * rr + 4, (s / 2 - 10) * rr + 2, 0, 0, 7); g.stroke();
    g.fillStyle = '#4c8f3c'; g.beginPath(); g.ellipse(x + 12, y + s - 16, 6, 4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + s - 14, y + 16, 5, 3, 0, 0, 7); g.fill(); }
    // a fish leaps out now and then: the fishing game's own pixel-art fish, a different one each time
    const FISH_SPR = ['fishing/sprite_parrotfish.png', 'fishing/sprite_clownfish.png', 'fishing/sprite_mahimahi.png', 'fishing/sprite_pufferfish.png', 'fishing/sprite_tuna.png'];
    const cyc = t * 0.45, j = cyc % 1, which = Math.floor(cyc) + f.id;
    if (j < 0.3 && f.amount > 0) { const k = j / 0.3, fx = x + s * 0.28 + k * s * 0.44, fy = y + s * 0.5 - Math.sin(k * Math.PI) * s * 0.32;
      const im = img(f.rich ? 'fishing/sprite_tuna.png' : FISH_SPR[which % FISH_SPR.length]);
      if (ready(im)) { const w = s * 0.34, h = w * im.naturalHeight / im.naturalWidth; g.save(); g.translate(fx, fy); g.rotate(-0.7 + k * 1.4); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }
      if (k > 0.85) this.sheet(g, this.tinted(FX_IMG.impact, '#dff4ff'), 4, (k - 0.85) / 0.15 * 3.9, x + s * 0.72, y + s * 0.52, s * 0.3, 0.8); }
    // a rich spot glints gold here and there instead of wearing a ring
    if (f.rich) for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1, a = (f.id * 7 + i * 2.1) % 6.28;
      this.sheet(g, this.tinted(FX_IMG.impact, '#ffd36b'), 4, ph * 3.9, x + s / 2 + Math.cos(a) * s * 0.3, y + s / 2 + Math.sin(a) * s * 0.22, s * 0.22, 1 - ph); }
  },
  // a flooded stretch of road: brown water over the mud, rings where the rain hits it
  flood(g, f) {
    const x = (f.tx + f.s / 2) * TILE, y = (f.ty + f.s / 2) * TILE, r = f.s * TILE / 2, t = performance.now() / 1000;
    const blob = (k, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * 1.18 * k, r * 0.92 * k, 0.3, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x - r * 0.45 * k, y + r * 0.2 * k, r * 0.75 * k, r * 0.6 * k, -0.4, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + r * 0.5 * k, y - r * 0.15 * k, r * 0.7 * k, r * 0.55 * k, 0.5, 0, 7); g.fill(); };
    g.save(); blob(1.08, '#6e5434'); blob(1, '#4f6f8f'); blob(0.8, 'rgba(70,110,150,.9)');
    g.strokeStyle = 'rgba(220,235,255,.45)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const ph = (t * 0.9 + i * 0.37 + f.tx * 0.13) % 1, a = i * 2.4 + f.ty, rx = x + Math.cos(a) * r * 0.55, ry = y + Math.sin(a) * r * 0.4;
      g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(rx, ry, 2 + ph * 9, 1 + ph * 4, 0, 0, 7); g.stroke(); }
    g.restore(); },
  // the rain over the whole view (screen space): a dim blue wash and slanting streaks
  rain(g) {
    const r = G.rain, fade = Math.min(1, (G.time - r.t0) / 3, (r.until - G.time) / 3); if (fade <= 0) return;
    const t = performance.now() / 1000, W = this.W, H = this.H;
    g.save(); g.globalAlpha = fade; g.fillStyle = 'rgba(30,45,90,.4)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(215,230,255,.65)'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 220; i++) { const sp = 520 + (i * 37) % 260, x = ((i * 113.7 + t * sp * 0.35) % (W + 60)) - 30, y = ((i * 71.3 + t * sp) % (H + 40)) - 20;
      g.moveTo(x, y); g.lineTo(x - 6, y + 18); }
    g.stroke(); g.restore(); },
  // Snout's special offer: a spinning coin over the Exchange and the seconds left
  dealSign(g, e) {
    const x = e.x * TILE, y = e.ty * TILE - 26 + Math.sin(performance.now() / 300) * 3, left = Math.max(0, Math.ceil(e.deal.until - G.time));
    const sh = img('rts/art/coin_spin.png'); if (ready(sh)) this.sheet(g, sh, 5, Math.floor(performance.now() / 70) % 5, x, y, 26);
    g.save(); g.font = 'bold 12px Trebuchet MS'; g.textAlign = 'center'; g.fillStyle = '#ffe6a0'; g.shadowColor = '#000'; g.shadowBlur = 4;
    g.fillText('½ PRICE · ' + left + 's', x, y - 18); g.restore(); },
  flag(g, x, y) { g.strokeStyle = '#3a2a16'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18); g.stroke();
    g.fillStyle = '#7dff7d'; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 11, y - 14); g.lineTo(x, y - 10); g.fill(); },

  // ── buildings, drawn in code: warm timber and thatch for the cats, scrap and red cloth for the rats ──
  building(g, b) {
    const x = b.tx * TILE, y = b.ty * TILE, s = b.size * TILE, team = TEAM[teamOf(b.owner)];
    const k = b.built ? 1 : b.progress;
    g.save();
    const pic = (b.kind === 'burrow' && art('burrow_hall')) || art(b.kind);   // burrow_hall: the remade rat town hall
    if (!pic) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + s / 2 + 4, y + s - 4, s / 2, s * 0.18, 0, 0, 7); g.fill(); }
    if (!b.built) { g.globalAlpha = 0.45 + 0.55 * k; }
    if (G.time - (b.hitT || -9) < 0.1) g.filter = 'brightness(1.6)';
    if (pic) {   // hand-made art: sits on the footprint, a little wider than it, feet on the bottom edge
      const w = s * (b.def.artScale || (b.def.hall ? 1.55 : 1.45)), h = w * pic.naturalHeight / pic.naturalWidth;   // halls stand taller than their plot
      g.drawImage(pic, x + s / 2 - w / 2, y + s - h + 4, w, h);
      if (!b.built) { const sc = art('scaffold'); g.globalAlpha = 1; if (sc) g.drawImage(sc, x - 4, y + s - (s + 8) * sc.naturalHeight / sc.naturalWidth + 4, s + 8, (s + 8) * sc.naturalHeight / sc.naturalWidth); }
      // a small team flag so you can tell yours from theirs at a glance
      if (b.owner <= 1) { g.globalAlpha = 1; g.fillStyle = '#3a2a16'; g.fillRect(x + s - 6, y + s * 0.15, 2, 20); g.fillStyle = team; g.beginPath(); g.moveTo(x + s - 4, y + s * 0.15); g.lineTo(x + s + 8, y + s * 0.15 + 4); g.lineTo(x + s - 4, y + s * 0.15 + 9); g.fill(); }
      g.restore(); return;
    }
    const st = b.def.style, cat = st.startsWith('cat'), rat = st.startsWith('rat');
    const P = cat ? { wall: '#c9a06a', wallD: '#a07a48', roof: '#d9782f', roofD: '#b05a1e', trim: '#6b4a1f' }
            : rat ? { wall: '#6f6a62', wallD: '#4f4a44', roof: '#5a3b2e', roofD: '#3e281f', trim: '#2a2622' } : { wall: '#f2b8c6', wallD: '#d48aa0', roof: '#c9547a', roofD: '#9e3a5c', trim: '#5a2a3a' };
    const house = (hx, hy, hw, hh, roofH) => {
      g.fillStyle = P.wall; g.fillRect(hx, hy, hw, hh); g.fillStyle = P.wallD; g.fillRect(hx, hy + hh - 5, hw, 5);
      for (let i = 1; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(hx, hy + hh * i / 4, hw, 1); }
      g.fillStyle = P.roof; g.beginPath(); g.moveTo(hx - 5, hy + 2); g.lineTo(hx + hw / 2, hy - roofH); g.lineTo(hx + hw + 5, hy + 2); g.closePath(); g.fill();
      g.fillStyle = P.roofD; g.beginPath(); g.moveTo(hx + hw / 2, hy - roofH); g.lineTo(hx + hw + 5, hy + 2); g.lineTo(hx + hw / 2, hy + 2); g.closePath(); g.fill();
      if (rat) { g.strokeStyle = 'rgba(180,170,150,.5)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(hx + i * hw / 4, hy - roofH * (1 - Math.abs(i / 2 - 1)) * 0.8); g.lineTo(hx + i * hw / 4 + 6, hy); g.stroke(); } }
      g.fillStyle = P.trim; g.fillRect(hx + hw / 2 - 6, hy + hh - 16, 12, 16);
    };
    const banner = (bx, by) => { g.fillStyle = P.trim; g.fillRect(bx, by - 26, 2, 26); g.fillStyle = team; g.beginPath(); g.moveTo(bx + 2, by - 26); g.lineTo(bx + 14, by - 22); g.lineTo(bx + 2, by - 17); g.fill(); };
    const pad = 3;
    switch (st) {
      case 'cat_hall': case 'rat_hall':
        house(x + 10, y + s * 0.38, s - 20, s * 0.55, s * 0.36);
        g.fillStyle = P.wallD; g.fillRect(x + s - 30, y + s * 0.05, 9, s * 0.3);              // chimney / scrap pipe
        if (cat) { g.fillStyle = 'rgba(220,220,220,.5)'; const t = performance.now() / 800; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + s - 26 + Math.sin(t + i) * 3, y + s * 0.02 - i * 8 - (t * 6 % 8), 4 + i, 0, 7); g.fill(); } }
        else { g.fillStyle = '#1a1512'; g.beginPath(); g.ellipse(x + s * 0.3, y + s - 10, 12, 8, 0, 0, 7); g.fill(); }
        banner(x + 6, y + s * 0.5); banner(x + s - 8, y + s * 0.5);
        g.fillStyle = '#ffe9a8'; g.fillRect(x + 22, y + s * 0.55, 10, 10); g.fillRect(x + s - 32, y + s * 0.55, 10, 10);
        break;
      case 'cat_house': case 'rat_house': house(x + pad + 4, y + s * 0.42, s - pad * 2 - 8, s * 0.5, s * 0.34); banner(x + s - 6, y + s * 0.6); break;
      case 'cat_barracks': case 'rat_barracks':
        house(x + 8, y + s * 0.3, s * 0.55, s * 0.55, s * 0.28);
        g.strokeStyle = P.trim; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 4; i++) { g.moveTo(x + s * 0.68 + i * 7, y + s * 0.55); g.lineTo(x + s * 0.68 + i * 7, y + s - 8); } g.moveTo(x + s * 0.66, y + s * 0.62); g.lineTo(x + s - 2, y + s * 0.62); g.stroke();
        // a training dummy
        g.fillStyle = '#b08850'; g.fillRect(x + s * 0.78, y + s * 0.2, 4, 26); g.fillStyle = cat ? '#e3d0a0' : '#8a7a6a'; g.beginPath(); g.arc(x + s * 0.78 + 2, y + s * 0.2, 7, 0, 7); g.fill();
        banner(x + 4, y + s * 0.5); break;
      case 'cat_forge': case 'rat_forge':
        if (cat) { g.fillStyle = '#c8a46a'; g.fillRect(x + s / 2 - 7, y + 4, 14, s - 10); g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x + s / 2 - 7, y + 8 + i * 6); g.lineTo(x + s / 2 + 7, y + 11 + i * 6); g.stroke(); }
          g.fillStyle = '#d9782f'; g.fillRect(x + 4, y + s - 14, s - 8, 8); g.fillStyle = '#e8c84a'; g.beginPath(); g.arc(x + s / 2, y + 6, 8, 0, 7); g.fill(); }
        else { house(x + 6, y + s * 0.4, s - 12, s * 0.5, s * 0.3); g.fillStyle = '#ff7a3a'; const t = performance.now() / 200; g.globalAlpha *= 0.6 + 0.4 * Math.sin(t); g.fillRect(x + s / 2 - 5, y + s - 18, 10, 8); }
        banner(x + s - 6, y + s * 0.6); break;
      case 'cat_beast': case 'rat_beast':
        g.fillStyle = cat ? '#8a8378' : '#4a5a6a'; g.beginPath(); g.moveTo(x + 4, y + s - 6); g.lineTo(x + s * 0.2, y + s * 0.25); g.lineTo(x + s * 0.55, y + s * 0.08); g.lineTo(x + s - 6, y + s * 0.4); g.lineTo(x + s - 4, y + s - 6); g.closePath(); g.fill();
        g.fillStyle = cat ? '#a39b8f' : '#6a8aa0'; g.beginPath(); g.moveTo(x + s * 0.2, y + s * 0.25); g.lineTo(x + s * 0.55, y + s * 0.08); g.lineTo(x + s * 0.6, y + s * 0.45); g.lineTo(x + s * 0.25, y + s * 0.55); g.fill();
        if (!cat) { g.fillStyle = '#7fd3ff'; for (const [cx, cy] of [[0.3, 0.7], [0.7, 0.65], [0.5, 0.82]]) { g.beginPath(); g.moveTo(x + s * cx, y + s * cy - 12); g.lineTo(x + s * cx + 5, y + s * cy); g.lineTo(x + s * cx - 5, y + s * cy); g.fill(); } }
        else { g.fillStyle = '#e8b04a'; g.beginPath(); g.arc(x + s * 0.55, y + s * 0.6, 9, 0, 7); g.fill(); }
        banner(x + s * 0.55, y + s * 0.1); break;
      case 'cat_tower': case 'rat_tower':
        g.fillStyle = P.wallD; g.fillRect(x + s / 2 - 10, y + s * 0.3, 20, s * 0.65); g.fillStyle = P.wall; g.fillRect(x + s / 2 - 8, y + s * 0.3, 8, s * 0.65);
        g.fillStyle = P.roof; g.fillRect(x + s / 2 - 16, y + s * 0.18, 32, 10); g.beginPath(); g.moveTo(x + s / 2 - 18, y + s * 0.2); g.lineTo(x + s / 2, y - 8); g.lineTo(x + s / 2 + 18, y + s * 0.2); g.fill();
        if (rat) { g.fillStyle = '#cfcfcf'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + s / 2 - 16 + i * 10, y + s * 0.28); g.lineTo(x + s / 2 - 13 + i * 10, y + s * 0.38); g.lineTo(x + s / 2 - 19 + i * 10, y + s * 0.38); g.fill(); } }
        banner(x + s / 2 + 12, y + s * 0.22); break;
      case 'pig_exchange':
        house(x + 8, y + s * 0.35, s - 16, s * 0.55, s * 0.3);
        g.fillStyle = '#e8c84a'; g.beginPath(); g.arc(x + s / 2, y + s * 0.18, 10, 0, 7); g.fill(); g.fillStyle = '#9e7a1e'; g.font = 'bold 12px Trebuchet MS'; g.textAlign = 'center'; g.fillText('$', x + s / 2, y + s * 0.18 + 4);
        g.fillStyle = '#c9547a'; for (let i = 0; i < 5; i++) g.fillRect(x + 8 + i * (s - 16) / 5, y + s * 0.35 - 4, (s - 16) / 10, 8); break;
    }
    // scaffolding while it goes up
    if (!b.built) { g.globalAlpha = 1; g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, s - 6, s - 6);
      g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + s - 3, y + s - 3); g.moveTo(x + s - 3, y + 3); g.lineTo(x + 3, y + s - 3); g.stroke(); }
    g.restore();
  },
  ghost(g, p) {
    const d = BUILDINGS[p.kind], s = d.size * TILE, ok = G.map.canPlace(p.tx, p.ty, d.size, G.ents.filter(e => !e.dead && e.isUnit && e.owner !== ME)), near = tooCloseToFish(p.kind, p.tx, p.ty);
    if (d.hall) { g.save(); g.strokeStyle = 'rgba(255,90,70,.55)'; g.setLineDash([6, 5]); g.lineWidth = 2;   // where a hall may not reach
      for (const f of G.ents) if (!f.dead && f.isRes && Math.hypot(f.x - p.tx, f.y - p.ty) < 22) { const m = HALL_POND_GAP; g.strokeRect((f.tx - m) * TILE, (f.ty - m) * TILE, (f.size + 2 * m) * TILE, (f.size + 2 * m) * TILE); }
      g.restore(); }
    g.globalAlpha = 0.55; this.building(g, { kind: p.kind, tx: p.tx, ty: p.ty, size: d.size, def: d, owner: 0, built: true, x: p.tx + d.size / 2, y: p.ty + d.size / 2 }); g.globalAlpha = 1;
    for (let y = 0; y < d.size; y++) for (let x = 0; x < d.size; x++) { const okT = G.map.passable(p.tx + x, p.ty + y) || false;
      g.fillStyle = okT && ok && !near ? 'rgba(80,255,80,.22)' : okT && !near ? 'rgba(255,220,80,.22)' : 'rgba(255,60,60,.35)'; g.fillRect((p.tx + x) * TILE + 1, (p.ty + y) * TILE + 1, TILE - 2, TILE - 2); }
  },
  // a white pixel-art sheet (fx/) recoloured once per colour and kept
  tinted(src, col) { const key = src + col; this._tint = this._tint || {}; if (this._tint[key]) return this._tint[key];
    const im = img(src); if (!ready(im)) return null; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.globalAlpha = 0.75; g.fillRect(0, 0, c.width, c.height);
    return this._tint[key] = c; },
  // frame i of an n-frame horizontal sheet, centred on (x, y), size px wide
  sheet(g, sh, n, i, x, y, size, alpha) { if (!sh) return; const w = (sh.naturalWidth || sh.width) / n, h = sh.naturalHeight || sh.height;
    i = Math.max(0, Math.min(n - 1, i | 0)); g.save(); if (alpha != null) g.globalAlpha *= alpha; g.drawImage(sh, i * w, 0, w, h, x - size / 2, y - size * h / w / 2, size, size * h / w); g.restore(); },
  projectile(g, p) {
    const x = p.x * TILE, y = p.y * TILE, t = performance.now() / 80;
    if (PROJ_IMG[p.kind] && ready(img(PROJ_IMG[p.kind]))) { const im = img(PROJ_IMG[p.kind]), s = p.kind === 'banana' ? 12 : 11;
      const sz = p.kind.startsWith('bomb') ? 16 : s;
      g.save(); g.translate(x, y); g.rotate(t); g.drawImage(im, -sz / 2, -sz / 2, sz, sz * im.naturalHeight / im.naturalWidth); g.restore(); return; }
    // Agent Snout throws the game's own spinning gold coin
    if (p.kind === 'coin') { const sh = img('rts/art/coin_spin.png'); if (ready(sh)) { this.sheet(g, sh, 5, Math.floor(performance.now() / 70) % 5, x, y, 13); return; } }
    // Merlin's spell: a little bubble of light
    if (p.kind === 'magic') { const b = img('fx/bubble.png'); if (ready(b)) { g.save(); g.globalAlpha = 0.9; g.filter = 'hue-rotate(200deg) saturate(2)'; g.drawImage(b, x - 7, y - 7, 14, 14); g.restore(); return; } }
    // spike towers and elder pigeons fling a crystal shard
    const sh = img('fx/crystal_shard.png');
    if (ready(sh)) { g.save(); g.translate(x, y); g.rotate((p.ang || 0) + Math.PI / 2); g.drawImage(sh, -4, -6, 8, 12); g.restore(); return; }
  },
  effect(g, f) {
    const k = (G.time - f.t), x = f.x * TILE, y = f.y * TILE;
    const burst = col => col ? this.tinted(FX_IMG.burst, col) : img(FX_IMG.burst), impact = col => col ? this.tinted(FX_IMG.impact, col) : img(FX_IMG.impact);
    if (f.k === 'poof') { const d = 0.6; if (k > d) return; const big = f.big > 1 ? f.big * 0.9 : 1;
      this.sheet(g, impact(), 4, k / d * 4, x, y - 10, 46 * big, 1 - k / d * 0.5);
      this.sheet(g, burst('#e8dcc0'), 5, k / d * 5, x, y - 6, 60 * big, 0.8); }
    if (f.k === 'txt') { if (k > 1.2) return; const a = 1 - k / 1.2, yy = y - k * 20; g.save(); g.globalAlpha = a;
      if (f.coin && ready(img('rts/art/res_fish.png'))) { const fi = img('rts/art/res_fish.png'); g.drawImage(fi, x - 27, yy - 11, 20, 20 * fi.naturalHeight / fi.naturalWidth); }   // the bounty is paid in fish
      g.fillStyle = f.col; g.font = 'bold 13px Trebuchet MS'; g.textAlign = 'left'; g.shadowColor = '#000'; g.shadowBlur = 3; g.fillText(f.text, x - 6, yy); g.restore(); }
    if (f.k === 'lvl') { if (k > 1.2) return; this.sheet(g, burst('#ffd36b'), 5, k / 1.2 * 5, x, y - 20, 110, 1);
      g.save(); g.globalAlpha = 1 - k / 1.2; g.fillStyle = '#ffe6a0'; g.font = 'bold 14px Trebuchet MS'; g.textAlign = 'center'; g.shadowColor = '#000'; g.shadowBlur = 4; g.fillText('LEVEL UP', x, y - 50 - k * 15); g.restore(); }
    if (f.k === 'ring') { if (k > 0.8) return; g.save(); g.translate(x, y); g.scale(1, 0.5); this.sheet(g, burst('rgb(' + f.col + ')'), 5, k / 0.8 * 5, 0, 0, f.r * TILE * 2.4, 1); g.restore(); }
    if (f.k === 'icon') { if (k > 1) return; const im = img(ICON_IMG[f.icon]); const s = f.r * TILE * 1.6 * (0.6 + k * 0.6);
      if (ready(im)) { g.save(); g.globalAlpha = 1 - k; g.drawImage(im, x - s / 2, y - s * 0.6, s, s); g.restore(); }
      g.save(); g.translate(x, y); g.scale(1, 0.5); this.sheet(g, burst('#fff0a0'), 5, k * 5, 0, 0, f.r * TILE * 2.4, 1); g.restore(); }
    // the Mech Boar's violet beam: a hot core and a wide glow, fading out
    if (f.k === 'beam') { const d = 0.45; if (k > d) return; const a = 1 - k / d, x2 = f.x2 * TILE, y2 = f.y2 * TILE;
      g.save(); g.lineCap = 'round'; g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(170,70,255,' + 0.35 * a + ')'; g.lineWidth = 16 * a + 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = 'rgba(220,140,255,' + 0.8 * a + ')'; g.lineWidth = 6 * a + 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = 'rgba(255,240,255,' + a + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      g.restore(); this.sheet(g, this.tinted(FX_IMG.impact, '#c070ff'), 4, k / d * 4, x, y, 30, a); this.sheet(g, this.tinted(FX_IMG.impact, '#c070ff'), 4, k / d * 4, x2, y2, 36, a); }
    if (f.k === 'spark') { if (k > 0.28) return; const col = { banana: '#ffe066', hairball: '#f0e0c8', coin: '#ffd36b', spike: '#bfe8ff', melee: null }[f.kind];
      this.sheet(g, impact(col), 4, k / 0.28 * 4, x, y, f.kind === 'melee' ? 24 : 20, 1); }
  },

  // ── minimap ──
  drawMini(mc, viewH) {
    const g = mc.getContext('2d'), W = mc.width, n = G.n, k = W / n;
    g.imageSmoothingEnabled = false; g.drawImage(this.mini, 0, 0, W, W); let coon = null;
    for (const e of G.ents) { if (e.dead || e.tun) continue;
      if (e.isRes) { if (!this.seenEnt(e)) continue; g.fillStyle = e.rich ? '#ffd36b' : '#8fd8ff'; g.fillRect(e.tx * k, e.ty * k, 2 * k, 2 * k); continue; }
      // the Coon is big news: everyone can see where he is
      if (e.kind === 'coon') { coon = e; continue; }   // drawn last, over the fog
      if (e.deal) { g.strokeStyle = '#ffd36b'; g.lineWidth = 1.5; g.beginPath(); g.arc(e.x * k, e.y * k, 5 + (performance.now() / 120) % 6, 0, 7); g.stroke(); }
      if (e.owner !== ME && (e.isUnit ? !visibleTo0(e) : !this.seenEnt(e))) continue;
      g.fillStyle = e.owner === P_CREEP ? '#e8c84a' : e.owner === P_NEUTRAL ? '#f2b8c6' : TEAM[teamOf(e.owner)];
      if (e.isBuilding) g.fillRect(e.tx * k, e.ty * k, Math.max(3, e.size * k), Math.max(3, e.size * k)); else g.fillRect(e.x * k - 1.5, e.y * k - 1.5, 3, 3); }
    for (const f of G.floods || []) { g.fillStyle = '#5a86b8'; g.fillRect(f.tx * k, f.ty * k, f.s * k, f.s * k); }
    // fog over it
    g.globalAlpha = 1; const fd = this.fogCv; g.imageSmoothingEnabled = true; g.drawImage(fd, 0, 0, W, W);
    // alerts
    for (const a of G.alerts) { const t = G.time - a.t; if (t > 4 || (a.p !== undefined && a.p !== ME)) continue; g.strokeStyle = 'rgba(255,80,60,' + (1 - t / 4) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(a.x * k, a.y * k, 4 + (t * 12) % 14, 0, 7); g.stroke(); }
    // the Coon: red rings rippling out from wherever he is, fog or no fog
    if (coon) { const t = performance.now() / 1000, cx = coon.x * k, cy = coon.y * k;
      g.fillStyle = '#ff3030'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
      g.strokeStyle = '#ff3030'; for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; g.globalAlpha = 1 - q; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 4 + q * 16, 0, 7); g.stroke(); }
      g.globalAlpha = 1; }
    // camera
    const cz = this.cam.z; g.strokeStyle = '#fff'; g.lineWidth = 1;
    g.strokeRect(this.cam.x / TILE * k, this.cam.y / TILE * k, this.W / cz / TILE * k, (viewH || this.H) / cz / TILE * k);
  },
};
