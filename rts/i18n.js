// Border War — Romanian. The language comes from Life of Puiutu: the iframe is opened with
// ?lang=ro, and when the page is opened on its own it reads the main game's save.
// Names and descriptions in data.js are swapped once at load; everything else (menus, tips,
// messages, canvas labels) goes through T() at the moment it reaches the screen.
'use strict';
const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang'); if (q) return q === 'ro' ? 'ro' : 'en';
  try { const s = JSON.parse(localStorage.getItem('puiutu_save') || '{}'); return s.lang === 'ro' ? 'ro' : 'en'; } catch (e) { return 'en'; }
})();
const RO = {
  // ── shell ──
  'Border War — Life of Puiutu': 'Războiul de la graniță — Viața lui Puiutu',
  'Border War': 'Războiul de la graniță',
  'Hero': 'Erou', 'Army': 'Armată', 'Idle': 'Liberi', 'Music': 'Muzică', 'Muted': 'Fără sunet', 'Menu': 'Meniu',
  'Select hero (F1)': 'Selectează eroul (F1)', 'Select army (F2)': 'Selectează armata (F2)', 'Idle worker (F3)': 'Muncitor liber (F3)',
  'Music on/off': 'Muzică pornită/oprită', 'Menu (F10)': 'Meniu (F10)', 'CODE': 'COD',
  'The border woods, a few fishing ponds, and two armies who both think they own them. Build a base, raise an army and a hero, and drive the other side off the map.':
    'Pădurea de la graniță, câteva iazuri cu pește și două armate care cred amândouă că sunt ale lor. Construiește o bază, ridică o armată și un erou și alungă tabăra cealaltă de pe hartă.',
  'Your side': 'Tabăra ta',
  'The Feline Union': 'Uniunea Felină', 'The Rat Federation': 'Federația Șobolanilor',
  'the Feline Union': 'Uniunea Felină', 'the Rat Federation': 'Federația Șobolanilor',
  'Cats: sturdy soldiers, hairball slingers, royal lions': 'Pisici: soldați rezistenți, aruncători de ghemuri, lei regali',
  "Rats: cheap and fast, banana bandits, Seby's crayfish": 'Șobolani: ieftini și rapizi, bandiți cu banane, racii lui Seby',
  'Play with a friend': 'Joacă cu un prieten', 'Host a game': 'Creează un joc', 'Join': 'Intră',
  'Back to playing the AI': 'Înapoi la jocul contra calculatorului',
  'Opponent': 'Adversar', 'Easy': 'Ușor', 'Takes it slow': 'O ia încet', 'Normal': 'Normal', 'A fair fight': 'O luptă corectă',
  'Hard': 'Greu', 'Gathers faster, attacks sooner': 'Adună mai repede, atacă mai devreme',
  'Surprise me': 'Surprinde-mă', 'A random personality': 'O personalitate la întâmplare',
  'Rusher': 'Grăbitul', 'Early pressure': 'Presiune devreme', 'Boomer': 'Expansionistul', 'Expands, big late army': 'Se extinde, armată mare târziu',
  'Turtle': 'Țestoasa', 'Towers and heavy units': 'Turnuri și unități grele',
  'Map': 'Hartă', 'Small': 'Mică', 'Quick games': 'Jocuri rapide', 'Medium': 'Medie', 'Room to expand': 'Loc de extindere',
  'Large': 'Mare', 'Long evenings': 'Seri lungi', 'Start': 'Start', 'How to play': 'Cum se joacă', 'Back to Puiutu Land': 'Înapoi în Ținutul lui Puiutu',
  'Workers gather': 'Muncitorii adună', 'fish': 'pește', 'wood': 'lemn',
  '(from the ponds) and': '(din iazuri) și',
  '(from the trees) and bring it to your town hall. Spend it on buildings, units, upgrades and your hero. Houses give supply. Neutral camps guard the expansions: kill them for fish, hero experience and items. The Pig Exchange in the middle hires mercenaries to anyone who brings a unit close. Destroy every enemy building to win.':
    '(din copaci) și le duc la primăria ta. Cheltuiește-le pe clădiri, unități, îmbunătățiri și pe erou. Casele dau provizii. Taberele neutre păzesc extinderile: învinge-le pentru pește, experiență pentru erou și obiecte. Bursa Porcilor din mijloc închiriază mercenari oricui aduce o unitate aproape. Distruge fiecare clădire inamică ca să câștigi.',
  'Mouse & keyboard': 'Mouse și tastatură', 'Left click / drag': 'Clic stânga / tragere',
  'select / box-select (Shift adds, double-click selects all of a type)': 'selectează / selectează cu un dreptunghi (Shift adaugă, dublu clic selectează toate de un tip)',
  'Right click': 'Clic dreapta', 'move, attack, gather, or set a rally point': 'mută, atacă, adună sau pune un punct de adunare',
  'A then click': 'A apoi clic', 'attack-move: fight everything on the way': 'atac în mers: luptă cu tot ce întâlnești',
  'stop / hold position': 'oprește / ține poziția', 'build menu (worker selected)': 'meniul de construcții (cu un muncitor selectat)',
  'hero abilities; in buildings, train units': 'abilitățile eroului; în clădiri, antrenează unități',
  'make / select control groups (twice to jump there)': 'creează / selectează grupuri (de două ori ca să sari acolo)',
  'hero, whole army, next idle worker': 'eroul, toată armata, următorul muncitor liber',
  'Space': 'Spațiu', 'jump to the last alert': 'sari la ultima alertă',
  'Arrows, screen edge, middle drag': 'Săgeți, marginea ecranului, tragere cu rotița',
  'move the camera; wheel zooms': 'mută camera; rotița face zoom', 'move the camera; wheel scrolls': 'mută camera; rotița derulează',
  'F10 / Esc': 'F10 / Esc', 'menu (Esc also cancels)': 'meniu (Esc și anulează)',
  'Touch': 'Atingere', 'Tap': 'Atinge', 'select your unit, or order the selected ones (move / attack / gather)': 'selectează unitatea sau dă ordine celor selectate (mută / atacă / adună)',
  'Drag': 'Trage', 'move the camera; two fingers zoom': 'mută camera; două degete fac zoom', 'Hold, then drag': 'Ține apăsat, apoi trage',
  'box-select': 'selectare cu dreptunghi', 'Hero / Army / Idle': 'Erou / Armată / Liberi', 'quick selection buttons at the top': 'butoanele de selecție rapidă de sus',
  'Got it': 'Am înțeles', 'Paused': 'Pauză', 'Game speed': 'Viteza jocului', 'Slow': 'Încet', 'Fast': 'Repede',
  'Resume': 'Continuă', 'Surrender': 'Capitulează', 'Quit': 'Ieși', 'Victory': 'Victorie', 'Defeat': 'Înfrângere',
  'Play again': 'Joacă din nou', 'Back': 'Înapoi',
  'Waiting for host…': 'Se așteaptă gazda…', 'Start vs friend': 'Start contra prietenului', 'Waiting for friend…': 'Se așteaptă prietenul…',
  'To play a friend, open the game from its online link (not straight from the file).': 'Ca să joci cu un prieten, deschide jocul de pe linkul online (nu direct din fișier).',
  'Type the 4-letter code your friend sees.': 'Scrie codul de 4 litere pe care îl vede prietenul tău.',
  'vs friends': 'contra prietenilor',
  'Your workers are already fishing. Select one and press B to build — houses first, then a Training Yard.': 'Muncitorii tăi pescuiesc deja. Selectează unul și apasă B ca să construiești — întâi case, apoi o Curte de antrenament.',
  'You are playing your friend. Good luck.': 'Joci contra prietenului tău. Baftă.',
  'You are playing your friend. Your workers are already fishing — press B with one selected to build.': 'Joci contra prietenului tău. Muncitorii tăi pescuiesc deja — selectează unul și apasă B ca să construiești.',
  'Your friend left.': 'Prietenul tău a plecat.',
  'Time': 'Timp', 'Units trained': 'Unități antrenate', 'Kills': 'Victime', 'Fish / wood gathered': 'Pește / lemn adunat', 'Buildings raised': 'Clădiri ridicate', 'Reward': 'Răsplată',
  'Could not reach the server.': 'Nu s-a putut contacta serverul.', 'The connection to the server was lost.': 'S-a pierdut conexiunea cu serverul.',
  'Opening a room…': 'Se deschide o cameră…', 'Your friend is here. Pick your side and press Start.': 'Prietenul tău e aici. Alege-ți tabăra și apasă Start.',
  'Joined! Waiting for your friend to start the game…': 'Ai intrat! Se așteaptă ca prietenul tău să pornească jocul…',
  'Something went wrong.': 'Ceva n-a mers.', 'Your friend left the game.': 'Prietenul tău a părăsit jocul.',
  'No such room.': 'Nu există camera asta.', 'That room is full.': 'Camera e plină.',
  // ── messages ──
  "Can't build there.": 'Nu poți construi acolo.', "Can't build there any more.": 'Nu mai poți construi acolo.',
  'You already have a hero.': 'Ai deja un erou.', 'Not enough fish.': 'Nu ai destul pește.', 'Not enough wood.': 'Nu ai destul lemn.',
  'Not enough supply.': 'Nu ai destule provizii.', 'Not enough mana.': 'Nu ai destulă mana.', 'Not ready yet.': 'Încă nu e gata.',
  'Out of stock — the pigs restock in a while.': 'Stoc epuizat — porcii aduc marfă nouă în curând.',
  'Bring a unit next to the Exchange first.': 'Adu întâi o unitate lângă Bursă.',
  'Your hero has returned.': 'Eroul tău s-a întors.', 'Your base is under attack!': 'Baza ta e atacată!', 'Your forces are under attack!': 'Trupele tale sunt atacate!',
  'Your hero has fallen.': 'Eroul tău a căzut.', 'The enemy hero has fallen!': 'Eroul inamic a căzut!',
  'A fishing spot has run dry.': 'Un loc de pescuit a secat.', 'Inventory full.': 'Inventarul e plin.',
  'Rustling at the edge of the woods… the Coon is coming with a sack of bananas.': 'Foșnește ceva la marginea pădurii… vine Coon cu un sac de banane.',
  'Agent Snout is preparing a special offer at the Pig Exchange…': 'Agentul Râtan pregătește o ofertă specială la Bursa Porcilor…',
  'Dark clouds are gathering over the border woods…': 'Se adună nori negri peste pădurea de la graniță…',
  'The Coon is crossing the border woods! Whoever brings him down gets his treasure.': 'Coon traversează pădurea de la graniță! Cine îl doboară primește comoara lui.',
  'The Coon got away with his bananas.': 'Coon a scăpat cu bananele lui.',
  'You brought down the Coon! His treasure lies where he fell.': 'L-ai doborât pe Coon! Comoara lui e acolo unde a căzut.',
  'The enemy brought down the Coon.': 'Inamicul l-a doborât pe Coon.', 'The Coon has fallen.': 'Coon a căzut.',
  "Snout's special offer has expired.": 'Oferta specială a lui Râtan a expirat.',
  "You snapped up Snout's special offer.": 'Ai prins oferta specială a lui Râtan.',
  "The enemy snapped up Snout's special offer.": 'Inamicul a prins oferta specială a lui Râtan.',
  'Rain! Puddles fill with fish, but floods cut some of the roads.': 'Plouă! Bălțile se umplu de pește, dar inundațiile taie unele drumuri.',
  'The rain stops. The floods drain away.': 'Ploaia se oprește. Apele se retrag.',
  'Rain! Puddles fill with fish out in the wilds.': 'Plouă! Bălțile din sălbăticie se umplu de pește.', 'The rain stops.': 'Ploaia se oprește.',
  'The rain puddles have dried up.': 'Bălțile de la ploaie au secat.',
  'A fish migration! Rich new fishing spots have appeared on the side lanes.': 'Migrație de pești! Pe drumurile laterale au apărut locuri de pescuit bogate.',
  'No idle workers.': 'Niciun muncitor liber.',
  'Town halls must stand at least 3 tiles from a fishing pond.': 'Primăriile trebuie să stea la cel puțin 3 pătrățele de o baltă cu pește.',
  // ── command card ──
  'Tap where to build': 'Atinge unde să construiești', 'Click to place · Shift keeps placing · Right click cancels': 'Clic ca să plasezi · Shift continuă plasarea · Clic dreapta anulează',
  'Move': 'Mută', 'Walk there, ignoring enemies.': 'Mergi acolo, ignorând inamicii.', 'Tap where to move': 'Atinge unde să mergi', 'Click where to move': 'Clic unde să mergi',
  'Stop': 'Oprește', 'Hold position': 'Ține poziția', 'Stay put and fight only what comes in range.': 'Stai pe loc și luptă doar cu ce ajunge în raza ta.',
  'Attack': 'Atacă', 'Attack-move: fight everything on the way.': 'Atac în mers: luptă cu tot ce întâlnești.',
  'Tap a target or a place': 'Atinge o țintă sau un loc', 'Click a target or a place to attack-move': 'Clic pe o țintă sau un loc pentru atac în mers',
  'Build': 'Construiește', 'Choose a building.': 'Alege o clădire.', 'Return cargo': 'Du încărcătura', 'Done': 'Gata', 'Cancel last': 'Anulează ultima',
  'Set rally point': 'Punct de adunare', 'Where new units go. Right-click also sets it.': 'Unde merg unitățile noi. Și clic dreapta îl setează.',
  'Click the rally point': 'Clic pe punctul de adunare', 'Cancel construction': 'Anulează construcția', 'Refunds 75%.': 'Returnează 75%.',
  'Tap a unit to select it. Hold and drag to select many.': 'Atinge o unitate ca s-o selectezi. Ține apăsat și trage ca să selectezi mai multe.',
  'Select a unit or building. Drag a box to select many.': 'Selectează o unitate sau o clădire. Trage un dreptunghi ca să selectezi mai multe.',
  'Rich Fishing Spot': 'Loc de pescuit bogat', 'Fishing Spot': 'Loc de pescuit',
  'Workers fish here and carry it to your town hall.': 'Muncitorii pescuiesc aici și duc peștele la primărie.',
  'Yours': 'Al tău', 'Enemy': 'Inamic', 'Neutral hostile': 'Neutru ostil', 'Neutral': 'Neutru', 'Melee': 'Corp la corp', 'ITEMS': 'OBIECTE',
  'empty slot': 'slot gol', 'experience': 'experiență', 'click to cancel': 'clic ca să anulezi',
  'Esc': 'Esc', 'Tab': 'Tab',
};
// unit, building, upgrade, ability and item names, and their descriptions
const RO_DATA = {
  'Normal': 'Normal', 'Piercing': 'Perforant', 'Siege': 'Asediu', 'Magic': 'Magic', 'Hero': 'Erou', 'Light': 'Ușor', 'Medium': 'Mediu',
  'Heavy': 'Greu', 'Fortified': 'Fortificat', 'Unarmoured': 'Neblindat',
  'Courier': 'Curier', 'Gathers fish and wood, builds.': 'Adună pește și lemn, construiește.',
  'Cat Soldier': 'Soldat pisică', 'Sturdy melee infantry in chain mail.': 'Infanterie rezistentă de corp la corp, în zale.',
  'Hairball Slinger': 'Aruncător de ghemuri', 'Ranged. Lobs hairballs from behind the line.': 'La distanță. Aruncă ghemuri de blană din spatele liniei.',
  'Royal Lion': 'Leu regal', 'Heavy. Its roaring bite hits everything next to the target.': 'Greu. Mușcătura lui lovește tot ce e lângă țintă.',
  'Cat Commander': 'Comandant pisică', 'Hero. Grows stronger with every level.': 'Erou. Devine mai puternic cu fiecare nivel.',
  'Scavenger': 'Scormonitor', 'Gathers fish and wood, builds. Cheap and quick.': 'Adună pește și lemn, construiește. Ieftin și rapid.',
  'Rat Soldier': 'Soldat șobolan', 'Fast, cheap melee. Never alone.': 'Rapid, ieftin, corp la corp. Niciodată singur.',
  'Fast, cheap melee. Never alone: they hatch two at a time.': 'Rapid, ieftin, corp la corp. Niciodată singur: ies câte doi deodată.',
  '+8 supply. Tunnels: Load sends nearby units underground, Unload brings them all up at any Nest. Rats going far also take the tunnels on their own.': '+8 provizii. Tuneluri: Încarcă trimite unitățile din jur sub pământ, Descarcă le scoate pe toate la orice cuib. Șobolanii care merg departe folosesc și singuri tunelurile.',
  'Cats: few but elite — fur shields, morale from every win': 'Pisici: puține, dar de elită — scut de blană, moral din fiecare victorie',
  'Rats: a swarm — hatch in pairs, heal fast, tunnel between Nests': 'Șobolani: un roi — ies în perechi, se vindecă repede, tuneluri între cuiburi',
  'fur shield': 'scut de blană', 'Fur shield': 'Scut de blană', 'Morale': 'Moral', 'Pairs': 'Perechi', 'Regeneration': 'Regenerare', 'Tunnels': 'Tuneluri', 'Load': 'Încarcă', 'Unload': 'Descarcă', 'No units near this Nest.': 'Nicio unitate lângă acest cuib.', 'Nobody is in the tunnels.': 'Nu e nimeni în tuneluri.',
  'Every fighting unit of yours near this Nest goes down into the tunnels. (Right-clicking a Nest with units selected does the same.)': 'Toate unitățile tale de luptă de lângă acest cuib coboară în tuneluri. (Clic dreapta pe un cuib cu unități selectate face la fel.)',
  'Everyone in the tunnels comes up here, at this Nest.': 'Toți cei din tuneluri ies aici, la acest cuib.', 'Drop': 'Aruncă',
  'Banana Bandit': 'Bandit cu banane', 'Ranged. A raccoon on the payroll, armed with fruit.': 'La distanță. Un raton plătit, înarmat cu fructe.',
  'Herald': 'Herald', 'Advanced. Lobs catnip bombs from far away: slow, but walls and towers crumble. Hits everything around the target.':
    'Avansat. Aruncă bombe cu iarba-pisicii de departe: lent, dar zidurile și turnurile se prăbușesc. Lovește tot ce e în jurul țintei.',
  'Saboteur': 'Sabotor', 'Advanced. Throws crystal charges from far away: slow, but walls and towers crumble. Hits everything around the target.':
    'Avansat. Aruncă încărcături de cristal de departe: lent, dar zidurile și turnurile se prăbușesc. Lovește tot ce e în jurul țintei.',
  "Seby's Crayfish": 'Racul lui Seby', "Heavy. One of Queen Seby's brood: slow, armoured, hard to kill.": 'Greu. Unul din puii Reginei Seby: lent, blindat, greu de ucis.',
  'Rat Commander': 'Comandant șobolan',
  'Agent Snout': 'Agentul Râtan', 'Mercenary. Sees far; his invoices slow what they hit.': 'Mercenar. Vede departe; facturile lui încetinesc ce lovesc.',
  'Mech Boar': 'Mistrețul Mecanic', 'Mercenary siege engine. The third eye on its forehead fires a violet beam that burns through everything in its line.':
    'Mașină de asediu mercenară. Al treilea ochi din frunte trage o rază violet care arde tot ce îi stă în cale.',
  'Merlin': 'Merlin', 'Mercenary wizard. Throws spells, and every few seconds heals the most hurt ally near him.': 'Vrăjitor mercenar. Aruncă vrăji și, la câteva secunde, vindecă cel mai rănit aliat din apropiere.',
  'Swarm Rat': 'Șobolan din roi', 'Summoned. Gone in a while.': 'Chemat. Dispare după un timp.',
  'Pigeon': 'Porumbel', 'Bruiser Pigeon': 'Porumbel bătăuș', 'Elder Pigeon': 'Porumbel bătrân', 'Angry Duck': 'Rață furioasă',
  'Wild Raccoon': 'Raton sălbatic', 'Deep Isopod': 'Izopod de adânc',
  'The Coon': 'Coon', 'Golden Banana': 'Banana de aur', "The Coon's treasure: +8 damage, +200 health, +0.3 move speed.": 'Comoara lui Coon: +8 daune, +200 viață, +0,3 viteză.',
  'Union Hall': 'Sala Uniunii', 'Town hall. Fish and wood are brought here.': 'Primăria. Aici se aduc peștele și lemnul.', 'Town hall. Fish and wood are brought here. Shoots at enemies that come close.': 'Primăria. Aici se aduc peștele și lemnul. Trage în inamicii care se apropie.',
  'Cottage': 'Căsuță', '+8 supply.': '+8 provizii.', 'Training Yard': 'Curte de antrenament',
  'Trains Soldiers, Slingers and (with a Scratching Post) Heralds.': 'Antrenează soldați, aruncători și (cu un Stâlp de zgâriat) heralzi.',
  'Scratching Post': 'Stâlp de zgâriat', 'Researches upgrades.': 'Cercetează îmbunătățiri.',
  'Pride Rock': 'Stânca Mândriei', 'Where the Royal Lions answer the call.': 'Unde leii regali răspund la chemare.',
  'Watch Tower': 'Turn de pază', 'Defensive tower.': 'Turn de apărare.',
  'Great Burrow': 'Marea Vizuină', 'Nest': 'Cuib', 'Warren': 'Galerie',
  'Trains Rat Soldiers, Banana Bandits and (with a Junk Forge) Saboteurs.': 'Antrenează soldați șobolani, bandiți cu banane și (cu o Forjă de fiare vechi) sabotori.',
  'Junk Forge': 'Forjă de fiare vechi', 'Crayfish Pit': 'Groapa racilor', "Where Seby's Crayfish are raised.": 'Unde sunt crescuți racii lui Seby.',
  'Spike Tower': 'Turn cu țepi', 'Pig Exchange': 'Bursa Porcilor',
  'The Organization sells to both sides. Bring a unit close to hire.': 'Organizația vinde ambelor tabere. Adu o unitate aproape ca să angajezi.',
  'Sharpened Claws': 'Gheare ascuțite', '+2 attack damage for all units per level.': '+2 daune la atac pentru toate unitățile, pe nivel.',
  'Thicker Fur': 'Blană mai deasă', '+1.5 armour for all units per level.': '+1,5 armură pentru toate unitățile, pe nivel.',
  'Catnip Stash': 'Rezervă de iarba-pisicii', 'Slingers +1.5 range, Couriers carry +3 wood.': 'Aruncători +1,5 rază, curierii cară +3 lemn.',
  'Scurry': 'Fugă mărunță', 'Rat Soldiers and Scavengers move 15% faster.': 'Soldații șobolani și scormonitorii se mișcă cu 15% mai repede.',
  'Thunderpaw': 'Laba tunetului', 'Slams the ground: damage and a short stun around the point.': 'Lovește pământul: daune și o amețeală scurtă în jurul punctului.',
  'Purr Ward': 'Scut de tors', 'Nearby allies heal over time and gain armour.': 'Aliații din apropiere se vindecă treptat și primesc armură.',
  'Nine Lives': 'Nouă vieți', 'Ultimate. For 7 seconds, nearby allies cannot die.': 'Supremă. Timp de 7 secunde, aliații din apropiere nu pot muri.',
  'Plague Cloud': 'Nor de ciumă', 'A sickly cloud that eats at everything inside it.': 'Un nor bolnăvicios care roade tot ce e în el.',
  'Frenzy': 'Frenezie', 'Nearby allies attack and move faster.': 'Aliații din apropiere atacă și se mișcă mai repede.',
  'Swarm Call': 'Chemarea roiului', 'Ultimate. Six Swarm Rats burst from the ground for 30 seconds.': 'Supremă. Șase șobolani din roi țâșnesc din pământ pentru 30 de secunde.',
  'Healing Salmon': 'Somon vindecător', 'Restores 400 health.': 'Reface 400 de viață.', 'Moon Milk': 'Lapte de lună', 'Restores 150 mana.': 'Reface 150 de mana.',
  'Claws of Attack': 'Gheare de atac', '+6 attack damage.': '+6 daune la atac.', 'Iron Collar': 'Zgardă de fier', '+3 armour.': '+3 armură.',
  'Swift Bell': 'Clopoțel iute', '+0.5 move speed.': '+0,5 viteză de mișcare.', 'Lion Heart': 'Inimă de leu', '+250 max health.': '+250 viață maximă.',
  'Scroll of Rally': 'Sulul adunării', 'Heals nearby allies for 250.': 'Vindecă aliații din apropiere cu 250.',
  'Yarn Mouse': 'Șoricel de lână', 'A toy to chase: attacks 15% faster.': 'O jucărie de fugărit: atacuri cu 15% mai rapide.',
  'Rope Carrot': 'Morcov de sfoară', 'Something to chew on: +4 health per second.': 'Ceva de ronțăit: +4 viață pe secundă.',
  'Rusher': 'Grăbitul', 'Boomer': 'Expansionistul', 'Turtle': 'Țestoasa', 'Easy': 'Ușor', 'Normal': 'Normal', 'Hard': 'Greu',
};
Object.assign(RO, RO_DATA, { 'Medium': 'Medie' });   // the map size; the armour type keeps 'Mediu'
const _MS = { fish: 'pește', wood: 'lemn', 'fish.': 'pește.', 'wood.': 'lemn.' };
const RO_PAT = [
  [/^Not enough (fish|wood)\.$/, m => 'Nu ai destul ' + _MS[m[1]] + '.'],
  [/^Not enough supply — build more (Cottages|Nests)\.$/, m => 'Nu ai destule provizii — construiește mai multe ' + (m[1] === 'Cottages' ? 'căsuțe' : 'cuiburi') + '.'],
  [/^Requires (.+)\.$/, m => 'Necesită ' + m[1] + '.'],
  [/^(.+) Requires: (.+)\.$/, m => T(m[1]) + ' Necesită: ' + m[2] + '.'],
  [/^Agent Snout has a special offer at the Pig Exchange: (.+) at half price\. First come, first served!$/, m => 'Agentul Râtan are o ofertă specială la Bursa Porcilor: ' + T(m[1]) + ' la jumătate de preț. Primul venit, primul servit!'],
  [/^Special offer: (.+) at half price — (\d+)s left$/, m => 'Ofertă specială: ' + T(m[1]) + ' la jumătate de preț — ' + m[2] + 's rămase'],
  [/^½ PRICE · (\d+)s$/, m => '½ PREȚ · ' + m[1] + 's'],
  [/^Morale (\d) — faster and fiercer$/, m => 'Moral ' + m[1] + ' — mai rapid și mai fioros'],
  [/^Your last town hall has fallen! Raise a new one within (\d+) seconds or the war is lost\.$/, m => 'Ultima ta primărie a căzut! Ridică una nouă în ' + m[1] + ' de secunde sau ai pierdut războiul.'],
  [/^The enemy has no town hall left\. Hold them off for (\d+) seconds and the war is yours\.$/, m => 'Inamicul nu mai are primărie. Ține-l în frâu ' + m[1] + ' de secunde și războiul e al tău.'],
  [/^(\d+) seconds left to raise a town hall!$/, m => 'Mai ai ' + m[1] + ' de secunde să ridici o primărie!'],
  [/^In the tunnels: (\d+)$/, m => 'În tuneluri: ' + m[1]],
  [/^(\d+) units? came up out of the tunnels\.$/, m => m[1] + (m[1] === '1' ? ' unitate a ieșit' : ' unități au ieșit') + ' din tuneluri.'],
  [/^(.+) hired\.$/, m => T(m[1]) + ' angajat.'],
  [/^(.+) ready\.$/, m => T(m[1]) + ' e gata.'],
  [/^(.+) researched\.$/, m => T(m[1]) + ' cercetat.'],
  [/^(.+) complete\.$/, m => T(m[1]) + ' terminat.'],
  [/^(.+) reached level (\d+)!$/, m => T(m[1]) + ' a ajuns la nivelul ' + m[2] + '!'],
  [/^New ability: (.+) \((\w)\)$/, m => 'Abilitate nouă: ' + T(m[1]) + ' (' + m[2] + ')'],
  [/^Picked up (.+)\.$/, m => 'Ai luat ' + T(m[1]) + '.'],
  [/^(.+) is always working while your hero carries it: (.+?)( \(✕ to drop it\))?$/, m => T(m[1]) + ' funcționează tot timpul cât îl poartă eroul: ' + T(m[2]) + (m[3] ? ' (✕ ca să-l arunci)' : '')],
  [/^Group (\d) set$/, m => 'Grupul ' + m[1] + ' setat'],
  [/^Hire (.+)$/, m => 'Angajează: ' + T(m[1])],
  [/^Train (.+)$/, m => 'Antrenează: ' + T(m[1])],
  [/^(.+) \(level (\d+)\)$/, m => T(m[1]) + ' (nivelul ' + m[2] + ')'],
  [/^Revive hero \(level (\d+)\)$/, m => 'Readu eroul (nivelul ' + m[1] + ')'],
  [/^(\d+) mana · (\d+)s cooldown$/, m => m[1] + ' mana · ' + m[2] + 's reîncărcare'],
  [/^Unlocks at level (\d+)\.$/, m => 'Se deblochează la nivelul ' + m[1] + '.'],
  [/^(Tap|Click) where to cast (.+)$/, m => (m[1] === 'Tap' ? 'Atinge' : 'Clic') + ' unde să lansezi ' + T(m[2])],
  [/^(\d+) (fish|wood)(?:, (\d+) supply)?(?: · (\d+)s)?$/, m => m[1] + ' ' + _MS[m[2]] + (m[3] ? ', ' + m[3] + ' provizii' : '') + (m[4] ? ' · ' + m[4] + 's' : '')],
  [/^,\s*(\d+) supply$/, m => ', ' + m[1] + ' provizii'],
  [/^,\s*(\d+) supply · (\d+)s$/, m => ', ' + m[1] + ' provizii · ' + m[2] + 's'],
  [/^(.+) \(one hero at a time\)$/, m => T(m[1]) + ' (un singur erou o dată)'],
  [/^([^\s·]+) attack · ([^\s·]+) armour( ·)?$/, m => 'atac ' + T(m[1]).toLowerCase() + ' · armură ' + T(m[2]).toLowerCase() + (m[3] || '')],
  [/^needs (.+)$/, m => 'necesită ' + m[1]],
  [/^(\d+) fish left$/, m => m[1] + ' pește rămas'],
  [/^Damage (\S+) ([^\s·]+) · Armour (\S+) ([^\s·]+) · (.+)$/, m => 'Daune ' + m[1] + ' ' + T(m[2]).toLowerCase() + ' · Armură ' + m[3] + ' ' + T(m[4]).toLowerCase() + ' · ' + T(m[5])],
  [/^Range (\S+)$/, m => 'Rază ' + m[1]],
  [/^(.+): (.+) \(click to use\)( — right click or ✕ to drop)?$/, m => T(m[1]) + ': ' + T(m[2]) + ' (clic ca să folosești)' + (m[3] ? ' — clic dreapta sau ✕ ca să-l arunci' : '')],
  [/^(.+): (.+) \(always on\)( — right click or ✕ to drop)?$/, m => T(m[1]) + ': ' + T(m[2]) + ' (mereu activ)' + (m[3] ? ' — clic dreapta sau ✕ ca să-l arunci' : '')],
  [/^Carrying (\d+) (fish|wood)$/, m => 'Cară ' + m[1] + ' ' + _MS[m[2]]],
  [/^Under construction — (\d+)%$/, m => 'În construcție — ' + m[1] + '%'],
  [/^Provides (\d+) supply$/, m => 'Oferă ' + m[1] + ' provizii'],
  [/^In stock: Agent Snout (.), Mech Boar (.), Merlin (.)$/, m => 'În stoc: Agentul Râtan ' + m[1] + ', Mistrețul Mecanic ' + m[2] + ', Merlin ' + m[3]],
  [/^Your record — (.+)$/, m => 'Recordul tău — ' + m[1].replace(/vs friends/g, 'contra prietenilor').replace(/(\d+)W \/ (\d+)L/g, '$1V / $2Î')],
  [/^Opponent: (.+)\. Good luck\.$/, m => 'Adversar: ' + T(m[1]) + '. Baftă.'],
  [/^(.*?)\s*The field is yours\.$/, m => (m[1] ? T(m[1]) + ' ' : '') + 'Câmpul e al tău.'],
  [/^(Your opponent surrendered\. |The border woods are yours\. |You withdrew from the field\. |Your last building has fallen\. |Without a town hall, your side scattered\. |Without a town hall, the enemy scattered\. )(.+)$/, m =>
    ({ 'Your opponent surrendered. ': 'Adversarul tău a capitulat. ', 'The border woods are yours. ': 'Pădurea de la graniță e a ta. ',
       'You withdrew from the field. ': 'Te-ai retras de pe câmp. ', 'Without a town hall, your side scattered. ': 'Fără primărie, tabăra ta s-a risipit. ', 'Without a town hall, the enemy scattered. ': 'Fără primărie, inamicul s-a risipit. ', 'Your last building has fallen. ': 'Ultima ta clădire a căzut. ' })[m[1]] + T(m[2])],
  [/^Your friend played (.+)\.$/, m => 'Prietenul tău a jucat cu ' + T(m[1]) + '.'],
  [/^The (.+?) played (.+)\.$/, m => T(m[1].charAt(0).toUpperCase() + m[1].slice(1)) + ' a jucat cu ' + T(m[2]) + '.'],
  [/^(\d+) \(enemy (\d+)\)$/, m => m[1] + ' (inamic ' + m[2] + ')'],
  [/^\+(\d+) coins, \+(\d+) XP in Puiutu Land$/, m => '+' + m[1] + ' monede, +' + m[2] + ' XP în Ținutul lui Puiutu'],
  [/^Looking for room (\w+)…$/, m => 'Se caută camera ' + m[1] + '…'],
  [/^Room code:$/, m => 'Codul camerei:'],
  [/^— tell your friend to join with it\. Waiting…$/, m => '— spune-i prietenului tău să intre cu el. Se așteaptă…'],
];
function T(s) {
  if (LANG !== 'ro' || typeof s !== 'string' || !s) return s;
  if (RO[s] !== undefined) return RO[s];
  const tr = s.trim(); if (!tr || !/[A-Za-z]/.test(tr)) return s;
  if (tr !== s && RO[tr] !== undefined) return s.replace(tr, RO[tr]);
  for (const [re, f] of RO_PAT) { const m = tr.match(re); if (m) { const out = f(m); return tr === s ? out : s.replace(tr, out); } }
  return s;
}
if (LANG === 'ro') {
  document.documentElement.lang = 'ro';
  // data.js is already loaded: swap the names and descriptions in place
  const tr = o => { for (const k in o) { const d = o[k]; if (typeof d === 'string') o[k] = RO_DATA[d] || d; else if (d) { if (d.name) d.name = RO_DATA[d.name] || d.name; if (d.desc) d.desc = RO_DATA[d.desc] || d.desc; } } };
  [UNITS, BUILDINGS, UPGRADES, ABILITIES, ITEMS, AI_STYLES, AI_LEVELS, TYPE_NAME].forEach(o => { try { tr(o); } catch (e) {} });
  // canvas labels
  const P = CanvasRenderingContext2D.prototype, fT = P.fillText, sT = P.strokeText, mT = P.measureText;
  P.fillText = function (t, ...a) { return fT.call(this, typeof t === 'string' ? T(t) : t, ...a); };
  P.strokeText = function (t, ...a) { return sT.call(this, typeof t === 'string' ? T(t) : t, ...a); };
  P.measureText = function (t) { return mT.call(this, typeof t === 'string' ? T(t) : t); };
  // the page: text nodes and the attributes people read
  const node = n => { const v = n.nodeValue; if (!v || !v.trim()) return; const p = n.parentNode; if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return; const t = T(v); if (t !== v) n.nodeValue = t; };
  const attrs = e => { for (const a of ['title', 'placeholder']) { const v = e.getAttribute && e.getAttribute(a); if (v) { const t = T(v); if (t !== v) e.setAttribute(a, t); } } };
  const walk = root => { if (root.nodeType === 3) { node(root); return; } const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) node(n);
    if (root.querySelectorAll) { attrs(root); root.querySelectorAll('[title],[placeholder]').forEach(attrs); } };
  const start = () => { walk(document.body); document.title = T(document.title);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') node(m.target); else if (m.type === 'attributes') attrs(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder'] }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
