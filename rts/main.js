// Border War — menus, the game loop, and talking to Life of Puiutu when it runs inside it.
'use strict';
const Main = {
  opt: { faction: 'cats', level: 'normal', style: 'random', size: 80 }, paused: true, speed: 1, last: 0, acc: 0, ended: false,
  init() {
    preload(); R.init($('view')); UI.init();
    window.addEventListener('resize', () => { R.resize(); if (G) R.clampCam(UI.viewH()); });
    const pick = (id, key, num) => $(id).querySelectorAll('.ch').forEach(c => c.onclick = () => {
      $(id).querySelectorAll('.ch').forEach(x => x.classList.remove('on')); c.classList.add('on'); this.opt[key] = num ? +c.dataset.v : c.dataset.v; sfx('click'); });
    pick('facPick', 'faction'); pick('lvlPick', 'level'); pick('stylePick', 'style'); pick('sizePick', 'size', true);
    $('speedPick').querySelectorAll('.ch').forEach(c => c.onclick = () => { $('speedPick').querySelectorAll('.ch').forEach(x => x.classList.remove('on')); c.classList.add('on'); this.speed = +c.dataset.v; });
    $('startBtn').onclick = () => this.start();
    $('helpBtn').onclick = $('helpBtn2').onclick = () => $('helpOv').classList.add('show');
    $('helpClose').onclick = () => $('helpOv').classList.remove('show');
    $('resumeBtn').onclick = () => this.togglePause(false);
    $('qMenu').onclick = () => this.togglePause(true);
    const mb = $('qMusic'), showMusic = () => { mb.style.opacity = S.musicOn ? 1 : 0.45; mb.textContent = S.musicOn ? 'Music' : 'Muted'; };
    mb.onclick = () => { Jukebox.toggle(); showMusic(); }; showMusic();
    $('surrenderBtn').onclick = () => { if (G && !G.over) { CMD.exec({ t: 'surrender' }); this.togglePause(false); } };
    // playing a friend
    NET.onStatus = (text, ready) => { $('mpStatus').innerHTML = text; $('startBtn').disabled = NET.role === 'host' && !NET.peer; $('startBtn').textContent = NET.role === 'guest' ? 'Waiting for host…' : NET.role === 'host' ? (NET.peer ? 'Start vs friend' : 'Waiting for friend…') : 'Start'; };
    if (!NET.available()) { $('mpBox').innerHTML = '<p style="font-size:13px;opacity:.75">To play a friend, open the game from its online link (not straight from the file).</p>'; }
    else {
      $('hostBtn').onclick = () => { NET.leave(); NET.host(); this.mpMode(true); };
      $('joinBtn').onclick = () => { const c = $('codeIn').value.trim(); if (c.length < 4) { $('mpStatus').textContent = 'Type the 4-letter code your friend sees.'; return; } NET.leave(); NET.join(c); this.mpMode(true); };
      $('soloBtn').onclick = () => { NET.leave(); this.mpMode(false); NET.onStatus('', false); };
    }
    $('quitBtn').onclick = $('quitBtn2').onclick = () => this.quit();
    if (window.parent !== window) { $('backBtn').style.display = ''; $('backBtn').onclick = () => window.parent.postMessage({ type: 'borderwar-close' }, '*'); }
    $('againBtn').onclick = () => { $('endOv').classList.remove('show'); $('startOv').classList.add('show'); this.showRecord(); };
    this.showRecord();
    requestAnimationFrame(t => this.frame(t));
  },
  record() { try { return JSON.parse(localStorage.getItem('borderwar_record') || '{}'); } catch (e) { return {}; } },
  showRecord() { const r = this.record(), parts = [];
    for (const l of ['easy', 'normal', 'hard', 'friend']) if (r[l]) parts.push((l === 'friend' ? 'vs friends' : AI_LEVELS[l].name) + ': ' + (r[l].w || 0) + 'W / ' + (r[l].l || 0) + 'L');
    $('record').textContent = parts.length ? 'Your record — ' + parts.join(' · ') : ''; },
  // in a game with a friend the opponent settings make no sense; hide them
  mpMode(on) { document.querySelectorAll('.soloOnly').forEach(el => el.style.display = on ? 'none' : ''); $('soloBtn').style.display = on ? '' : 'none'; },
  start() {
    if (NET.role === 'guest') return;
    if (NET.role === 'host' && !NET.peer) return;
    const o = Object.assign({}, this.opt, { seed: (Math.random() * 1e9) | 0 });
    if (o.style === 'random') o.style = ['rusher', 'boomer', 'turtle'][(Math.random() * 3) | 0];
    if (!this.artReady) { $('startBtn').textContent = 'Loading…'; loadArt().then(() => { this.artReady = true; $('startBtn').textContent = 'Start'; this.start(); }); return; }
    ME = 0; if (NET.role === 'host') o.mp = true;
    newGame(o); if (!o.mp) AI.init(P_AI, o.style, o.level); else { G.players[1].ai = false; NET.startHost(); }
    R.buildTerrain(); R.cam.z = IS_TOUCH ? 1.05 : 1.3;
    const s = G.map.starts[0]; R.centerOn(s.x + 2, s.y - 2, UI.viewH());
    UI.setSel([]); UI.groups = {}; UI.pings = []; this.ended = false; this.acc = 0;
    $('startOv').classList.remove('show'); this.paused = false; sfx('done');
    if (!Jukebox.cur) Jukebox.play();
    G.msgs.push({ text: 'Your workers are already fishing. Select one and press B to build — houses first, then a Training Yard.', col: '#ffe7b0', t: 0 });
    G.msgs.push({ text: o.mp ? 'You are playing your friend. Good luck.' : 'Opponent: ' + AI_LEVELS[o.level].name + '. Good luck.', col: '#bbb', t: 0.01 });
  },
  // the guest builds its copy of the world from what the host sent: the same terrain, no game logic
  startGuest(d) {
    const go = () => {
      ME = 1; const o = d.opt, map = new GameMap(o.size, o.seed), bin = atob(d.terrain);
      for (let i = 0; i < bin.length; i++) map.t[i] = bin.charCodeAt(i);
      map.block.fill(0);
      G = { map, n: map.n, time: 0, ents: [], byId: new Map(), nextId: 1, proj: [], fx: [], clouds: [], items: [], msgs: [], alerts: [], over: null, opt: o, events: {}, floods: [], rain: null };
      G.players = d.factions.map((f, i) => ({ id: i, faction: f, fish: 0, wood: 0, supUsed: 0, supCap: 0, up: {}, researching: {}, stats: {} }));
      G.players.push({ id: P_CREEP, faction: 'creep', up: {} }, { id: P_NEUTRAL, faction: 'neutral', up: {} });
      G.vis = new Uint8Array(G.n * G.n); G.seen = new Uint8Array(G.n * G.n); G.visT = 0;
      R.buildTerrain(); R.cam.z = IS_TOUCH ? 1.05 : 1.3;
      const s = map.starts[1]; R.centerOn(s.x - 2, s.y + 2, UI.viewH());
      UI.setSel([]); UI.groups = {}; UI.pings = []; this.ended = false; this.acc = 0;
      $('startOv').classList.remove('show'); this.paused = false; sfx('done');
      if (!Jukebox.cur) Jukebox.play();
      say(1, 'You are playing your friend. Your workers are already fishing — press B with one selected to build.', '#ffe7b0');
    };
    if (!this.artReady) { loadArt().then(() => { this.artReady = true; go(); }); } else go();
  },
  togglePause(on) {
    // against a friend the menu opens but the battle goes on (pausing one side would pause both)
    if (!G || G.over) return; this.paused = on === undefined ? !this.paused : on;
    $('pauseOv').classList.toggle('show', this.paused); $('helpOv').classList.remove('show');
  },
  quit() {
    NET.leave(); this.mpMode(false);
    if (window.parent !== window) window.parent.postMessage({ type: 'borderwar-close' }, '*');
    else { $('pauseOv').classList.remove('show'); $('endOv').classList.remove('show'); $('startOv').classList.add('show'); this.paused = true; G = null; }
  },
  end() {
    this.ended = true; const win = G.over.winner === ME, mp = !!G.opt.mp || NET.role === 'guest', lvl = mp ? 'friend' : G.opt.level, r = this.record();
    r[lvl] = r[lvl] || { w: 0, l: 0 }; if (win) r[lvl].w++; else r[lvl].l++; try { localStorage.setItem('borderwar_record', JSON.stringify(r)); } catch (e) {}
    const mult = { easy: 1, normal: 2, hard: 3, friend: 3 }[lvl], coins = win ? 60 * mult : 15, xp = win ? 120 * mult : 40;
    const t = G.over.t | 0, mm = (t / 60 | 0) + ':' + String(t % 60).padStart(2, '0');
    $('endTitle').textContent = win ? 'Victory' : 'Defeat';
    const foe = G.players[1 - ME].faction === 'cats' ? 'the Feline Union' : 'the Rat Federation';
    $('endText').textContent = G.over.left ? (G.over.why || 'Your friend left.') + ' The field is yours.'
      : (win ? (G.over.surrender ? 'Your opponent surrendered. ' : G.over.nohall ? 'Without a town hall, the enemy scattered. ' : 'The border woods are yours. ') : G.over.surrender ? 'You withdrew from the field. ' : G.over.nohall ? 'Without a town hall, your side scattered. ' : 'Your last building has fallen. ')
        + (mp ? 'Your friend played ' + foe + '.' : 'The ' + AI_STYLES[G.opt.style].name.toLowerCase() + ' played ' + foe + '.');
    const a = G.players[ME].stats || {}, b = G.players[1 - ME].stats || {};
    $('endStats').innerHTML = '<b>Time</b><span>' + mm + '</span><b>Units trained</b><span>' + a.trained + ' (enemy ' + b.trained + ')</span><b>Kills</b><span>' + a.killed + ' (enemy ' + b.killed + ')</span>'
      + '<b>Fish / wood gathered</b><span>' + a.fish + ' / ' + a.wood + '</span><b>Buildings raised</b><span>' + a.built + '</span>'
      + (window.parent !== window ? '<b>Reward</b><span>+' + coins + ' coins, +' + xp + ' XP in Puiutu Land</span>' : '');
    $('endOv').classList.add('show'); sfx(win ? 'win' : 'lose');
    if (window.parent !== window) window.parent.postMessage({ type: 'borderwar-result', win, coins, xp, level: lvl }, '*');
  },
  frame(t) {
    requestAnimationFrame(tt => this.frame(tt));
    const realDt = Math.min(0.1, (t - (this.last || t)) / 1000); this.last = t;
    if (!G) return;
    if (NET.role === 'guest') NET.guestTick(realDt);                     // the friend's copy: just follows the host
    else if ((!this.paused || G.opt.mp) && !G.over) {
      // against a friend the speed stays at normal for both, and nobody can freeze the other
      this.acc += realDt * (G.opt.mp ? 1 : this.speed); const STEP = 1 / 30; let n = 0;
      while (this.acc >= STEP && n < 6) { stepGame(STEP); if (!G.opt.mp) AI.update(STEP); this.acc -= STEP; n++; }
    }
    if (NET.role === 'host') NET.hostTick(realDt);
    const myAlerts = G.alerts.filter(a => a.p === undefined || a.p === ME);
    if (myAlerts.length && myAlerts[myAlerts.length - 1].t > (this.lastAlertSfx || -1)) { this.lastAlertSfx = myAlerts[myAlerts.length - 1].t; sfx('alert'); }
    if (G.over && !this.ended) this.end();
    UI.update(realDt); R.draw(UI); R.drawMini($('mini'), UI.viewH());
  },
};
Main.init();
