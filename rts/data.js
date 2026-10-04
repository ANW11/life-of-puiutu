// Life of Puiutu — Border War (RTS minigame). Game data: factions, units, buildings, upgrades,
// hero abilities, items, creeps. Everything balanced around a 32px tile; ranges and sight in tiles.
'use strict';
const TILE = 32;

// ── sprites: frames + how the art sits (which way it faces, how tall it is drawn in world px) ──
const SPR = {
  cat_courier:   { walk: [0,1,2,3,4,5].map(i => `army/frames/cat_emissary_walk${i}.png?v=2`), atk: 'army/frames/cat_emissary_atk.png?v=2', h: 34 },
  cat_soldier:   { walk: [0,1,2,3].map(i => `army/frames/cat_soldier_walk${i}.png?v=2`), atk: 'army/frames/cat_soldier_atk.png?v=2', h: 42 },
  cat_slinger:   { walk: [0,1,2,3,4,5].map(i => `skins/frames/skin_calico/f${i}.png`), idle: 'skins/frames/skin_calico/idle.png', h: 32 },
  cat_lion:      { walk: [0,1,2,3,4].map(i => `mobs/lion/walk${i}.png`), atk: 'mobs/lion/roar.png', idle: 'mobs/lion/idle.png', h: 66 },
  cat_commander: { walk: [0,1,2,3,4].map(i => `army/frames/cat_commander_walk${i}.png?v=2`), atk: 'army/frames/cat_commander_atk.png?v=2', h: 54 },
  rat_scavenger: { walk: [0,1,2,3,4,5].map(i => `army/frames/rat_emissary_walk${i}.png?v=2`), atk: 'army/frames/rat_emissary_atk.png?v=2', h: 32 },
  rat_soldier:   { walk: [0,1,2,3].map(i => `army/frames/rat_soldier_walk${i}.png?v=2`), atk: 'army/frames/rat_soldier_atk.png?v=2', h: 30, faceLeft: true, atkFaceRight: true },
  rat_bandit:    { walk: ['mobs/coon_walk0.png', 'mobs/coon_walk1.png'], atk: 'mobs/coon_throw.png', h: 36 },
  rat_lobster:   { walk: ['mobs/seby/s1.png', 'mobs/seby/s2.png', 'mobs/seby/s3.png', 'mobs/seby/s2.png'], atk: 'mobs/seby/s4.png', h: 76 },   // Seby's brood
  merlin:        { walk: ['npcs/merlin_npc.png'], h: 46, wobble: true },
  rat_commander: { walk: [0,1,2,3].map(i => `army/frames/rat_commander_walk${i}.png?v=2`), atk: 'army/frames/rat_commander_atk.png?v=2', h: 34 },
  cat_herald:    { walk: [0,1,2,3,4,5].map(i => `army/frames/cat_emissary_walk${i}.png?v=2`), atk: 'army/frames/cat_emissary_atk.png?v=2', h: 36 },
  rat_saboteur:  { walk: [0,1,2,3,4,5].map(i => `army/frames/rat_emissary_walk${i}.png?v=2`), atk: 'army/frames/rat_emissary_atk.png?v=2', h: 36 },
  pig_snout:     { walk: [0,1,2,3,4,5].map(i => `army/frames/pig_agent_walk${i}.png?v=2`), atk: 'army/frames/pig_agent_atk.png?v=2', h: 40 },
  mech_boar:     { walk: ['mobs/mechboar_frames/idle.png', 'mobs/mechboar_frames/walk1.png'], atk: 'mobs/mechboar_frames/attack.png', h: 76 },
  cr_pigeon:     { walk: ['mobs/enemy_pigeon.png'], h: 30, wobble: true },
  cr_pigeon_b:   { walk: ['mobs/pigeon_v3.png'], h: 34, wobble: true },
  cr_pigeon_w:   { walk: ['mobs/pigeon_v9.png'], h: 40, wobble: true },
  cr_duck:       { walk: ['mobs/enemy_duck.png'], h: 34, wobble: true },
  cr_raccoon:    { walk: ['mobs/enemy_raccoon.png'], h: 48, wobble: true },
  cr_isopod:     { walk: ['mobs/deepsea_isopod.png'], h: 40, wobble: true },
};
const PROJ_IMG = { hairball: 'fx/hairball_ball.png', banana: 'mobs/coon_banana.png', bomb_cat: 'spells/catnip.png', bomb_rat: 'spells/crystalspikes.png' };

// ── damage types, Warcraft-style: what an attack is good and bad against ──
// rows: attack type; columns: armour type. Multiplies the damage before armour is taken off.
const DMG_TABLE = {
  normal: { light: 1.0,  medium: 1.5,  heavy: 1.0, fortified: 0.7,  hero: 1.0, unarmored: 1.0 },
  pierce: { light: 2.0,  medium: 0.75, heavy: 1.0, fortified: 0.35, hero: 0.5, unarmored: 1.5 },
  siege:  { light: 1.0,  medium: 0.5,  heavy: 1.0, fortified: 1.5,  hero: 0.5, unarmored: 1.5 },
  magic:  { light: 1.25, medium: 0.75, heavy: 2.0, fortified: 0.35, hero: 0.5, unarmored: 1.0 },
  hero:   { light: 1.0,  medium: 1.0,  heavy: 1.0, fortified: 0.5,  hero: 1.0, unarmored: 1.0 },
};
const TYPE_NAME = { normal: 'Normal', pierce: 'Piercing', siege: 'Siege', magic: 'Magic', hero: 'Hero', light: 'Light', medium: 'Medium', heavy: 'Heavy', fortified: 'Fortified', unarmored: 'Unarmoured' };
const ICON_IMG = {
  thunderpaw: 'spells/thunderpaw.png', purrward: 'spells/purrward.png', ninelives: 'spells/ninelives.png',
  catnip: 'spells/catnip.png', zoomies: 'spells/zoomies.png', spikes: 'spells/crystalspikes.png',
  fishstorm: 'spells/fishstorm.png', hairball: 'spells/hairball.png',
};
const FX_IMG = { cloud: 'fx/catnip_cloud.png', impact: 'fx/impact_sheet.png', burst: 'fx/burst_sheet.png' };

// ── units ──
// hp, armor, dmg [min,max], range (tiles; ≤1.2 is melee), cd (s between attacks), speed (tiles/s),
// sight (tiles), cost {f: fish, w: wood}, sup (supply), time (s), r (body radius, tiles)
const UNITS = {
  // the Feline Union (cats)
  courier:   { name: 'Courier', faction: 'cats', spr: 'cat_courier', worker: true, hp: 220, armor: 0, dmg: [5, 7], range: 1, cd: 1.4, speed: 2.6, sight: 7, cost: { f: 75, w: 0 }, sup: 1, time: 13, r: 0.32, desc: 'Gathers fish and wood, builds.' },
  soldier:   { name: 'Cat Soldier', faction: 'cats', spr: 'cat_soldier', hp: 440, armor: 2, dmg: [13, 16], range: 1, cd: 1.25, speed: 2.8, sight: 8, cost: { f: 125, w: 0 }, sup: 2, time: 17, r: 0.36, atk: 'normal', arm: 'medium', desc: 'Sturdy melee infantry in chain mail.' },
  slinger:   { name: 'Hairball Slinger', faction: 'cats', spr: 'cat_slinger', hp: 280, armor: 0, dmg: [16, 19], range: 5.5, cd: 1.5, speed: 2.9, sight: 9, cost: { f: 125, w: 20 }, sup: 2, time: 20, r: 0.32, proj: 'hairball', atk: 'pierce', arm: 'light', desc: 'Ranged. Lobs hairballs from behind the line.' },
  lion:      { name: 'Royal Lion', faction: 'cats', spr: 'cat_lion', hp: 1150, armor: 3, dmg: [30, 38], range: 1.3, cd: 1.6, speed: 2.5, sight: 9, cost: { f: 270, w: 110 }, sup: 5, time: 34, r: 0.62, splash: 0.9, atk: 'normal', arm: 'heavy', desc: 'Heavy. Its roaring bite hits everything next to the target.' },
  catcmd:    { name: 'Cat Commander', faction: 'cats', spr: 'cat_commander', hero: true, hp: 650, armor: 3, dmg: [22, 28], range: 1.1, cd: 1.4, speed: 2.9, sight: 10, cost: { f: 425, w: 100 }, sup: 5, time: 38, r: 0.44, mana: 220, atk: 'hero', arm: 'hero', abilities: ['thunderpaw', 'purrward', 'ninelives'], desc: 'Hero. Grows stronger with every level.' },
  // the Rat Federation (rats)
  scavenger: { name: 'Scavenger', faction: 'rats', spr: 'rat_scavenger', worker: true, hp: 190, armor: 0, dmg: [5, 6], range: 1, cd: 1.3, speed: 2.8, sight: 7, cost: { f: 65, w: 0 }, sup: 1, time: 11, r: 0.3, desc: 'Gathers fish and wood, builds. Cheap and quick.' },
  ratsoldier:{ name: 'Rat Soldier', faction: 'rats', spr: 'rat_soldier', hp: 340, armor: 1, dmg: [11, 13], range: 1, cd: 1.15, speed: 3.0, sight: 8, cost: { f: 115, w: 0 }, sup: 2, time: 16, r: 0.34, atk: 'normal', arm: 'medium', desc: 'Fast, cheap melee. Never alone.' },
  bandit:    { name: 'Banana Bandit', faction: 'rats', spr: 'rat_bandit', hp: 300, armor: 0, dmg: [16, 19], range: 5, cd: 1.6, speed: 2.8, sight: 9, cost: { f: 130, w: 25 }, sup: 2, time: 20, r: 0.34, proj: 'banana', atk: 'pierce', arm: 'light', desc: 'Ranged. A raccoon on the payroll, armed with fruit.' },
  herald:    { name: 'Herald', faction: 'cats', spr: 'cat_herald', hp: 320, armor: 0, dmg: [38, 46], range: 7, cd: 3.0, speed: 2.3, sight: 9, cost: { f: 165, w: 70 }, sup: 3, time: 26, r: 0.34, proj: 'bomb_cat', splashR: 1.3, atk: 'siege', arm: 'medium', req: ['scratch'], desc: 'Advanced. Lobs catnip bombs from far away: slow, but walls and towers crumble. Hits everything around the target.' },
  saboteur:  { name: 'Saboteur', faction: 'rats', spr: 'rat_saboteur', hp: 300, armor: 0, dmg: [38, 46], range: 7, cd: 3.0, speed: 2.4, sight: 9, cost: { f: 160, w: 70 }, sup: 3, time: 24, r: 0.34, proj: 'bomb_rat', splashR: 1.3, atk: 'siege', arm: 'medium', req: ['junkforge'], desc: 'Advanced. Throws crystal charges from far away: slow, but walls and towers crumble. Hits everything around the target.' },
  lobster:   { name: "Seby's Crayfish", faction: 'rats', spr: 'rat_lobster', hp: 1300, armor: 4, dmg: [27, 33], range: 1.3, cd: 1.7, speed: 2.1, sight: 8, cost: { f: 260, w: 120 }, sup: 5, time: 34, r: 0.75, atk: 'normal', arm: 'heavy', desc: 'Heavy. One of Queen Seby\'s brood: slow, armoured, hard to kill.' },
  ratcmd:    { name: 'Rat Commander', faction: 'rats', spr: 'rat_commander', hero: true, hp: 600, armor: 2, dmg: [21, 26], range: 1.1, cd: 1.2, speed: 3.1, sight: 10, cost: { f: 425, w: 100 }, sup: 5, time: 38, r: 0.42, mana: 220, atk: 'hero', arm: 'hero', abilities: ['plague', 'frenzy', 'swarmcall'], desc: 'Hero. Grows stronger with every level.' },
  // mercenaries (the Organization) — hired at the Pig Exchange
  snout:     { name: 'Agent Snout', faction: 'pigs', spr: 'pig_snout', hp: 520, armor: 1, dmg: [18, 22], range: 4.5, cd: 1.5, speed: 2.9, sight: 12, cost: { f: 200, w: 40 }, sup: 3, time: 0, r: 0.4, proj: 'coin', atk: 'pierce', arm: 'medium', desc: 'Mercenary. Sees far; his invoices slow what they hit.', slowOnHit: true },
  mechboar:  { name: 'Mech Boar', faction: 'pigs', spr: 'mech_boar', hp: 1900, armor: 4, dmg: [52, 62], range: 6, cd: 2.6, speed: 1.9, sight: 9, cost: { f: 600, w: 240 }, sup: 7, time: 0, r: 0.75, atk: 'siege', arm: 'heavy', beam: true, desc: 'Mercenary siege engine. The third eye on its forehead fires a violet beam that burns through everything in its line.' },
  merlin:    { name: 'Merlin', faction: 'pigs', spr: 'merlin', hp: 480, armor: 1, dmg: [14, 18], range: 5, cd: 1.7, speed: 2.6, sight: 10, cost: { f: 240, w: 80 }, sup: 4, time: 0, r: 0.4, proj: 'magic', healer: true, atk: 'magic', arm: 'light', desc: 'Mercenary wizard. Throws spells, and every few seconds heals the most hurt ally near him.' },
  swarmrat:  { name: 'Swarm Rat', faction: 'rats', spr: 'rat_soldier', hp: 180, armor: 0, dmg: [8, 10], range: 1, cd: 1.0, speed: 3.2, sight: 7, cost: { f: 0, w: 0 }, sup: 0, time: 0, r: 0.3, summon: true, desc: 'Summoned. Gone in a while.' },
  // neutral creeps
  pigeon:    { name: 'Pigeon', faction: 'creep', spr: 'cr_pigeon', hp: 200, armor: 0, dmg: [7, 9], range: 1, cd: 1.2, speed: 2.6, sight: 6, r: 0.3, bounty: 12, xp: 25 },
  pigeonb:   { name: 'Bruiser Pigeon', faction: 'creep', spr: 'cr_pigeon_b', hp: 380, armor: 1, dmg: [12, 15], range: 1, cd: 1.3, speed: 2.6, sight: 6, r: 0.34, bounty: 22, xp: 45 },
  pigeonw:   { name: 'Elder Pigeon', faction: 'creep', spr: 'cr_pigeon_w', hp: 650, armor: 2, dmg: [20, 25], range: 4, cd: 1.6, speed: 2.4, sight: 7, r: 0.4, bounty: 45, xp: 90, proj: 'feather', atk: 'pierce', arm: 'light' },
  duck:      { name: 'Angry Duck', faction: 'creep', spr: 'cr_duck', hp: 320, armor: 1, dmg: [10, 13], range: 1, cd: 1.2, speed: 2.5, sight: 6, r: 0.34, bounty: 18, xp: 35 },
  raccoon:   { name: 'Wild Raccoon', faction: 'creep', spr: 'cr_raccoon', hp: 820, armor: 2, dmg: [24, 30], range: 1.1, cd: 1.5, speed: 2.4, sight: 7, r: 0.48, bounty: 55, xp: 120 },
  isopod:    { name: 'Deep Isopod', faction: 'creep', spr: 'cr_isopod', hp: 1300, armor: 5, dmg: [30, 38], range: 1.2, cd: 1.8, speed: 2.0, sight: 7, r: 0.55, bounty: 90, xp: 200, arm: 'heavy' },
};

// ── buildings ── size in tiles (square). prod: units it trains. res: upgrades it researches.
const BUILDINGS = {
  // cats
  den:        { name: 'Union Hall', faction: 'cats', hall: true, size: 4, hp: 1700, armor: 5, cost: { f: 385, w: 185 }, time: 90, supply: 12, sight: 10, prod: ['courier', 'catcmd'], style: 'cat_hall', desc: 'Town hall. Fish and wood are brought here.' },
  cottage:    { name: 'Cottage', faction: 'cats', size: 2, hp: 500, armor: 2, cost: { f: 80, w: 20 }, time: 26, supply: 8, sight: 6, style: 'cat_house', desc: '+8 supply.' },
  yard:       { name: 'Training Yard', faction: 'cats', size: 3, hp: 1100, armor: 4, cost: { f: 160, w: 60 }, time: 50, sight: 7, prod: ['soldier', 'slinger', 'herald'], req: ['den'], style: 'cat_barracks', desc: 'Trains Soldiers, Slingers and (with a Scratching Post) Heralds.' },
  scratch:    { name: 'Scratching Post', faction: 'cats', size: 2, hp: 700, armor: 3, cost: { f: 140, w: 60 }, time: 45, sight: 6, res: ['weap', 'arm', 'catnip'], req: ['yard'], style: 'cat_forge', desc: 'Researches upgrades.' },
  pride:      { name: 'Pride Rock', faction: 'cats', size: 3, hp: 1000, armor: 4, cost: { f: 180, w: 150 }, time: 60, sight: 7, prod: ['lion'], req: ['scratch'], style: 'cat_beast', desc: 'Where the Royal Lions answer the call.' },
  cattower:   { name: 'Watch Tower', faction: 'cats', size: 2, hp: 550, armor: 4, cost: { f: 90, w: 80 }, time: 40, sight: 11, tower: { dmg: [16, 20], range: 7, cd: 1.1, proj: 'hairball' }, req: ['yard'], style: 'cat_tower', desc: 'Defensive tower.' },
  // rats
  burrow:     { name: 'Great Burrow', faction: 'rats', hall: true, size: 4, hp: 1600, armor: 5, cost: { f: 370, w: 180 }, time: 90, supply: 12, sight: 10, prod: ['scavenger', 'ratcmd'], style: 'rat_hall', desc: 'Town hall. Fish and wood are brought here.' },
  nest:       { name: 'Nest', faction: 'rats', size: 2, hp: 450, armor: 1, cost: { f: 75, w: 15 }, time: 22, supply: 8, sight: 6, style: 'rat_house', desc: '+8 supply.' },
  warren:     { name: 'Warren', faction: 'rats', size: 3, hp: 1000, armor: 3, cost: { f: 150, w: 55 }, time: 45, sight: 7, prod: ['ratsoldier', 'bandit', 'saboteur'], req: ['burrow'], style: 'rat_barracks', desc: 'Trains Rat Soldiers, Banana Bandits and (with a Junk Forge) Saboteurs.' },
  junkforge:  { name: 'Junk Forge', faction: 'rats', size: 2, hp: 650, armor: 3, cost: { f: 135, w: 55 }, time: 42, sight: 6, res: ['weap', 'arm', 'scurry'], req: ['warren'], style: 'rat_forge', desc: 'Researches upgrades.' },
  pit:        { name: 'Crayfish Pit', faction: 'rats', size: 3, hp: 1050, armor: 4, cost: { f: 175, w: 150 }, time: 60, sight: 7, prod: ['lobster'], req: ['junkforge'], style: 'rat_beast', desc: "Where Seby's Crayfish are raised." },
  spiketower: { name: 'Spike Tower', faction: 'rats', size: 2, hp: 520, armor: 4, cost: { f: 85, w: 80 }, time: 38, sight: 11, tower: { dmg: [17, 21], range: 7, cd: 1.1, proj: 'spike' }, req: ['warren'], style: 'rat_tower', desc: 'Defensive tower.' },
  // neutral
  exchange:   { name: 'Pig Exchange', faction: 'neutral', size: 3, hp: 99999, armor: 99, sight: 6, style: 'pig_exchange', invuln: true, desc: 'The Organization sells to both sides. Bring a unit close to hire.' },
};

// the buildings each worker can raise, in command-card order
const BUILD_MENU = {
  cats: ['den', 'cottage', 'yard', 'scratch', 'pride', 'cattower'],
  rats: ['burrow', 'nest', 'warren', 'junkforge', 'pit', 'spiketower'],
};
const HALL = { cats: 'den', rats: 'burrow' };
const WORKER = { cats: 'courier', rats: 'scavenger' };
const HERO = { cats: 'catcmd', rats: 'ratcmd' };

// ── upgrades ── levels: cost per level; applies in core.js
const UPGRADES = {
  weap:   { name: 'Sharpened Claws', levels: [{ f: 120, w: 60, time: 40 }, { f: 220, w: 140, time: 55 }], desc: '+2 attack damage for all units per level.' },
  arm:    { name: 'Thicker Fur', levels: [{ f: 110, w: 80, time: 40 }, { f: 210, w: 160, time: 55 }], desc: '+1.5 armour for all units per level.' },
  catnip: { name: 'Catnip Stash', faction: 'cats', levels: [{ f: 150, w: 100, time: 45 }], desc: 'Slingers +1.5 range, Couriers carry +3 wood.' },
  scurry: { name: 'Scurry', faction: 'rats', levels: [{ f: 140, w: 100, time: 45 }], desc: 'Rat Soldiers and Scavengers move 15% faster.' },
};

// ── hero abilities ── lvl: hero level that unlocks it. Effects live in core.js (castAbility)
const ABILITIES = {
  thunderpaw: { name: 'Thunderpaw', icon: 'thunderpaw', key: 'Q', lvl: 1, mana: 75, cd: 10, range: 7, aoe: 2.4, target: 'point', desc: 'Slams the ground: damage and a short stun around the point.' },
  purrward:   { name: 'Purr Ward', icon: 'purrward', key: 'W', lvl: 3, mana: 90, cd: 20, aoe: 5, target: 'self', desc: 'Nearby allies heal over time and gain armour.' },
  ninelives:  { name: 'Nine Lives', icon: 'ninelives', key: 'R', lvl: 6, mana: 150, cd: 75, aoe: 7, target: 'self', desc: 'Ultimate. For 7 seconds, nearby allies cannot die.' },
  plague:     { name: 'Plague Cloud', icon: 'catnip', key: 'Q', lvl: 1, mana: 75, cd: 10, range: 7, aoe: 2.6, target: 'point', hue: 70, desc: 'A sickly cloud that eats at everything inside it.' },
  frenzy:     { name: 'Frenzy', icon: 'zoomies', key: 'W', lvl: 3, mana: 80, cd: 20, aoe: 5, target: 'self', desc: 'Nearby allies attack and move faster.' },
  swarmcall:  { name: 'Swarm Call', icon: 'spikes', key: 'R', lvl: 6, mana: 150, cd: 75, target: 'self', desc: 'Ultimate. Six Swarm Rats burst from the ground for 30 seconds.' },
};
const HERO_XP = [0, 200, 500, 900, 1400, 2000, 2700, 3500];   // xp needed for level 1..8
const HERO_MAX = 8;

// ── items ── dropped by creeps. pass: passive bonus while carried; use: consumed
const ITEMS = {
  potion:  { name: 'Healing Salmon', col: '#ff7a6a', use: 'heal', desc: 'Restores 400 health.' },
  mana:    { name: 'Moon Milk', col: '#7ab8ff', use: 'mana', desc: 'Restores 150 mana.' },
  claws:   { name: 'Claws of Attack', col: '#ffd36b', pass: { dmg: 6 }, desc: '+6 attack damage.' },
  collar:  { name: 'Iron Collar', col: '#c8ccd8', pass: { armor: 3 }, desc: '+3 armour.' },
  bell:    { name: 'Swift Bell', col: '#9be38f', pass: { speed: 0.5 }, desc: '+0.5 move speed.' },
  heart:   { name: 'Lion Heart', col: '#ff9ad2', pass: { hp: 250 }, desc: '+250 max health.' },
  scroll:  { name: 'Scroll of Rally', col: '#e8d6a8', use: 'rally', desc: 'Heals nearby allies for 250.' },
  mouse:   { name: 'Yarn Mouse', col: '#a8f04a', pass: { aspd: 0.15 }, desc: 'A toy to chase: attacks 15% faster.' },
  carrot:  { name: 'Rope Carrot', col: '#ff8a3a', pass: { regen: 4 }, desc: 'Something to chew on: +4 health per second.' },
};
const ITEM_TIERS = [['potion', 'mana', 'scroll', 'carrot'], ['claws', 'collar', 'bell', 'mouse'], ['heart', 'claws', 'collar', 'mouse']];

// ── creep camps ── picked at random per site; tier sets the loot
const CAMPS = [
  { tier: 0, units: ['pigeon', 'pigeon', 'duck'] },
  { tier: 0, units: ['duck', 'duck', 'pigeon'] },
  { tier: 0, units: ['pigeonb', 'pigeon', 'pigeon'] },
  { tier: 1, units: ['pigeonb', 'pigeonb', 'duck', 'pigeon'] },
  { tier: 1, units: ['raccoon', 'duck', 'pigeon'] },
  { tier: 1, units: ['pigeonw', 'pigeonb', 'pigeon'] },
  { tier: 2, units: ['raccoon', 'raccoon', 'pigeonw'] },
  { tier: 2, units: ['isopod', 'pigeonb', 'pigeonb'] },
  { tier: 2, units: ['isopod', 'raccoon', 'duck', 'duck'] },
];

// ── AI personalities and difficulty ──
const AI_STYLES = {
  rusher:  { name: 'Rusher',  firstAttack: 210, attackValue: 900,  workers: 14, expandAt: 900, mix: { melee: 0.62, ranged: 0.3, heavy: 0.0, siege: 0.08 }, towers: 0, heavyAfter: 600 },
  boomer:  { name: 'Boomer',  firstAttack: 480, attackValue: 2200, workers: 22, expandAt: 330, mix: { melee: 0.36, ranged: 0.3, heavy: 0.22, siege: 0.12 }, towers: 1, heavyAfter: 420 },
  turtle:  { name: 'Turtle',  firstAttack: 560, attackValue: 2600, workers: 18, expandAt: 600, mix: { melee: 0.3, ranged: 0.3, heavy: 0.25, siege: 0.15 }, towers: 4, heavyAfter: 360 },
};
const AI_LEVELS = {
  easy:   { name: 'Easy',   income: 0.8,  think: 1.6, micro: false, attackMul: 1.25 },
  normal: { name: 'Normal', income: 1.0,  think: 0.9, micro: true,  attackMul: 1.0 },
  hard:   { name: 'Hard',   income: 1.25, think: 0.5, micro: true,  attackMul: 0.85 },
};
