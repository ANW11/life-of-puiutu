// ════════════════════════════════════════════════════════════════════════════════════════
//  Life of Puiutu: DLC "Shadow of the Old Ones"
//  Lives entirely in dlc/old_ones/ (this script + art/). The base game never names these files:
//  it loads this script only when the DLC is part of the build (PUIUTU_DLC_LIST) and only calls
//  the hooks registered at the bottom (areas, drawCine) when dlcOwned('old_ones').
//  Everything here runs inside the base game's page and uses its globals (S, HUB, g, VW, VH,
//  LT, toast, save, decorImg, cineStart, drawCat, CATS, SFX, roundRectPath, enterArea, AREAS…).
// ════════════════════════════════════════════════════════════════════════════════════════
//──────── DLC: SHADOW OF THE OLD ONES — the vault, the old stairs, the City of Fangs ────────
// The wheel vault in the Lower Archive answers Seby's purple crystal. Behind it a stair cut for
// saber-toothed cats goes down to their dead city. The first time, the crystal opens the wheel
// (a short scene); every time after, walking in plays the descent and then the reveal.
const OLD_ART='dlc/old_ones/art/';
const OLD_STAIRS_IMG=OLD_ART+'old_stairwell.png?v=4', OLD_REVEAL_IMG=OLD_ART+'old_city_reveal.png?v=2';
// Puiutu's way down the stairwell picture (its own pixels, 1536x1024): out of the library door,
// the long flight to the right, the landing with the candles, the second flight back to the left
// (on its treads, read off the picture), and onto the flat slab at its foot. He never walks the
// boulders: from the slab the camera looks across to the purple mouth of the cavern instead.
// [x, y, stairs] : stairs = he hops down step by step on the way TO this point
const OLD_STAIRS_PATH=[[150,250],[1160,672,1],[1198,672],[960,718,1],[760,778,1],[560,838,1],[372,900,1],[300,924]];
const OLD_CAVE_MOUTH=[1380,900], OLD_LOOK_MS=1700, OLD_FADE_MS=900;   // the look across, then the fade
function oldVaultOpen(){
  const W=()=>HUB.worldW, C=()=>HUB.cine, sub=(t)=>{ if(C()) C().sub = t ? {text:t, t0:Date.now()} : null; };
  const open=()=>{ S.oldOnesOpen=true; save(); };
  const steps=[
    {cam:()=>0.80*W(), ms:900, do:()=>{ SFX.pad&&[110,164.81,220].forEach((f,i)=>SFX.pad(f,4,i?0.012:0.02,0,'sine')); }},
    {ms:2800, do:()=>{ C().vaultGlowAt=Date.now(); sub(LT('The purple crystal hums. The stones on the wheel answer it.','Cristalul mov vibrează. Pietrele de pe roată îi răspund.')); }},
    {ms:2400, do:()=>{ sub(LT('Something very heavy moves inside the wall.','Ceva foarte greu se mișcă în perete.'));
      if(SFX.tone) for(let i=0;i<6;i++) SFX.tone(55+i*3,0.35,'sawtooth',0.03,i*0.3); }},
    {ms:1300, do:()=>{ sub(null); open(); C().flashAt=Date.now(); }},
    {ms:3400, do:()=>sub(LT('Behind it, stairs. Older than the library. Older than the city.','În spate, scări. Mai vechi decât biblioteca. Mai vechi decât orașul.'))},
    {ms:500, do:()=>sub(null)},
  ];
  [OLD_STAIRS_IMG, OLD_REVEAL_IMG].forEach(decorImg);   // ready before the way down
  if(!cineStart('oldvault', steps)) open();             // seen before (or Free Play replays): just open it
}
function oldStairsDescent(){
  [OLD_STAIRS_IMG, OLD_REVEAL_IMG].forEach(decorImg);
  const P=OLD_STAIRS_PATH; let L=0; const seg=[];
  for(let i=1;i<P.length;i++){ const d=Math.hypot(P[i][0]-P[i-1][0], P[i][1]-P[i-1][1]); seg.push({a:P[i-1], b:P[i], s:L, d, stair:!!P[i][2]}); L+=d; }
  const walkMs=L/0.23;                                   // ~230 picture pixels a second
  HUB.descent={t0:Date.now(), seg, len:L, walkMs, revealMs:8800, subAt:[0.04,0.36,0.68], subI:0, done:false};
  const go=()=>{ HUB.descent=null;
    if(typeof AREA_LVL==='object' && !AREA_LVL.smilodon) AREA_LVL.smilodon=8;
    if(AREAS.smilodon) enterArea('smilodon', false);
    else toast(LT('The City of Fangs is still being built. Soon.','Orașul Colților încă se construiește. În curând.')); };
  cineStart('olddescent', [ {until:()=>HUB.descent && HUB.descent.done}, {ms:20, do:()=>setTimeout(go, 40)} ], true);
}
function oldDescentPos(k){
  const D=HUB.descent, at=k*D.len;
  for(const sg of D.seg){ if(at<=sg.s+sg.d || sg===D.seg[D.seg.length-1]){
    const u=Math.max(0,Math.min(1,(at-sg.s)/sg.d)), x=sg.a[0]+(sg.b[0]-sg.a[0])*u, y=sg.a[1]+(sg.b[1]-sg.a[1])*u;
    const hop=sg.stair ? Math.abs(Math.sin((at-sg.s)/72*Math.PI))*13 : 0;   // one hop per tread on a flight; a landing is just a trot
    return {x, y, hop, facing: sg.b[0]<sg.a[0]?-1:1, dist:at}; } }
}
function drawOldDescent(){
  const D=HUB.descent; if(!D) return; const now=Date.now(), t=now-D.t0;
  const ok=im=>im&&im.complete&&im.naturalWidth;
  g.save(); g.fillStyle='#07040c'; g.fillRect(0,0,VW,VH);
  if(t < D.walkMs+OLD_LOOK_MS){
    const k=Math.min(1,t/D.walkMs), im=decorImg(OLD_STAIRS_IMG);
    // the lines on the way down, one per flight
    if(D.subI<D.subAt.length && k>=D.subAt[D.subI] && HUB.cine){
      const L=[LT('The steps were cut for paws four times his size.','Treptele fuseseră tăiate pentru labe de patru ori mai mari decât ale lui.'),
               LT('On the walls, great cats hunted things with too many legs.','Pe pereți, pisici uriașe vânau lucruri cu prea multe picioare.'),
               LT('Further down, the crystals in the rock glowed on their own.','Mai jos, cristalele din piatră luminau singure.')];
      HUB.cine.sub={text:L[D.subI], t0:now}; D.subI++; }
    if(HUB.cine && HUB.cine.sub && now-HUB.cine.sub.t0>3600) HUB.cine.sub=null;
    if(ok(im)){
      // landscape, filling the screen: a touch of zoom so the camera can follow him down
      const s=Math.max(VW/im.naturalWidth, VH/im.naturalHeight)*1.12;
      const w=im.naturalWidth*s, h=im.naturalHeight*s, p=oldDescentPos(k);
      // once he is down, the camera drifts from him to the cavern's mouth
      const lk=Math.max(0,Math.min(1,(t-D.walkMs)/OLD_LOOK_MS)), le=lk*lk*(3-2*lk);
      const fx=p.x+(OLD_CAVE_MOUTH[0]-p.x)*le, fy=p.y+(OLD_CAVE_MOUTH[1]-p.y)*le;
      const ox = Math.min(0,Math.max(VW-w, VW/2-fx*s));
      const oy = Math.min(0,Math.max(VH-h, VH*0.55-fy*s));
      g.imageSmoothingEnabled=false; g.drawImage(im, ox, oy, w, h);
      const cx=ox+p.x*s, cy=oy+p.y*s;
      // it gets darker the deeper he goes; a little light stays round him
      // the light follows what the camera looks at: him, then the cavern's purple mouth
      const lx=ox+fx*s, ly=oy+fy*s-30;
      const dark=0.12+0.38*k-0.25*le, gr=g.createRadialGradient(lx,ly,40,lx,ly,Math.max(VW,VH)*0.75);
      gr.addColorStop(0,'rgba(6,3,14,0)'); gr.addColorStop(1,'rgba(6,3,14,'+(dark+0.3)+')');
      g.fillStyle=gr; g.fillRect(0,0,VW,VH);
      g.fillStyle='rgba(6,3,14,'+(dark*0.5)+')'; g.fillRect(0,0,VW,VH);
      const walking=t<D.walkMs;
      drawCat(g, cx, cy-(walking?p.hop*s:0), p.facing, walking?p.dist*0.045:0, CATS.puiutu, {scale:(62*s)/74, moving:walking});
    }
    if(t<700){ g.fillStyle='rgba(7,4,12,'+(1-t/700)+')'; g.fillRect(0,0,VW,VH); }
    const fadeAt=D.walkMs+OLD_LOOK_MS-OLD_FADE_MS;
    if(t>fadeAt){ g.fillStyle='rgba(7,4,12,'+Math.min(1,(t-fadeAt)/OLD_FADE_MS)+')'; g.fillRect(0,0,VW,VH); }
  } else {
    // the last step opens onto a ledge over the cavern: the City of Fangs
    const rt=t-(D.walkMs+OLD_LOOK_MS), im=decorImg(OLD_REVEAL_IMG);
    if(HUB.cine) HUB.cine.sub=null;
    if(ok(im)){
      // full screen: it starts close on the ledge and slowly pulls back over the city
      const e=Math.min(1,rt/D.revealMs), ease=e<0.5?2*e*e:1-Math.pow(-2*e+2,2)/2;
      const s=Math.max(VW/im.naturalWidth, VH/im.naturalHeight)*(1.22-0.2*ease);
      const w=im.naturalWidth*s, h=im.naturalHeight*s;
      const ox=Math.min(0,Math.max(VW-w, VW*0.5-w*(0.38+0.14*ease))), oy=Math.min(0,Math.max(VH-h, VH*0.5-h*0.55));
      g.imageSmoothingEnabled=false; g.drawImage(im, ox, oy, w, h);
    }
    const ta=Math.max(0,Math.min(1,(rt-1400)/900))*Math.max(0,Math.min(1,(D.revealMs-600-rt)/700));
    if(ta>0){
      g.globalAlpha=ta; g.textAlign='center';
      const t1=LT('SHADOW OF THE OLD ONES','UMBRA CELOR VECHI'), t2=LT('Chapter I: The City of Fangs','Capitolul I: Orașul Colților');
      g.font='bold 54px "Jersey 10"'; const w1=g.measureText(t1).width; g.font='bold 24px "Jersey 10"'; const w2=g.measureText(t2).width;
      const bw=Math.max(w1,w2)+64, by=VH*0.16;
      g.fillStyle='rgba(0,0,0,.6)'; roundRectPath(VW/2-bw/2, by-50, bw, 96, 14); g.fill();
      g.fillStyle='#ffe7b0'; g.font='bold 54px "Jersey 10"'; g.fillText(t1, VW/2, by);
      g.fillStyle='#d9c2ff'; g.font='bold 24px "Jersey 10"'; g.fillText(t2, VW/2, by+32);
      g.globalAlpha=1; }
    if(rt<900){ g.fillStyle='rgba(7,4,12,'+(1-rt/900)+')'; g.fillRect(0,0,VW,VH); }
    if(rt>D.revealMs-700){ g.fillStyle='rgba(7,4,12,'+Math.min(1,(rt-(D.revealMs-700))/700)+')'; g.fillRect(0,0,VW,VH); }
    if(rt>=D.revealMs) D.done=true;
  }
  g.restore();
}
// while the crystal wakes the wheel: a purple pulse over the vault
function drawOldVaultGlow(){
  const C=HUB.cine; if(!C || !C.vaultGlowAt || curArea!=='librarylower') return;
  const t=Date.now()-C.vaultGlowAt, a=Math.min(1,t/900)*(0.6+0.4*Math.sin(t*0.012));
  const gx=0.924*HUB.worldW-HUB.camx, gy=0.43*VH, R=150+Math.min(1,t/3000)*80;
  g.save(); g.globalCompositeOperation='lighter';
  const gr=g.createRadialGradient(gx,gy,6,gx,gy,R); gr.addColorStop(0,'rgba(190,110,255,'+(0.75*a)+')'); gr.addColorStop(1,'rgba(120,40,255,0)');
  g.fillStyle=gr; g.beginPath(); g.arc(gx,gy,R,0,7); g.fill(); g.restore();
}

// ── Zone 1: the City of Fangs (hub) ──
// One wide map (2576x1024), two halves stitched: the foot of the Old Stairs and the abandoned camp on
// the left, the mural wall, two sphinx statues either side of the avenue, the skull mosaic and a
// plain ring mosaic, the pigs' survey camp, the sealed Forge Gate, the broken stair to the black sea.
// Walk mask: city_of_fangs_walk.png (yellow), drawn by ref/make_city_mask.py.
const OLD_CITY_W=2576, OLD_CITY_H=1024, ofx=x=>x/OLD_CITY_W, ofy=y=>y/OLD_CITY_H;
function oldCityArea(){
  return {
    name:'City of Fangs', theme:'cave', mode:'topdown',
    hub:{
      music:'ruins',
      img:OLD_ART+'city_of_fangs.png?v=14', mask:OLD_ART+'city_of_fangs_walk.png?v=2', maskWalk:'yellow',
      walkTop:0.38, walkBot:0.87, scaleFar:0.76, scaleNear:1.00,
      spawn:{xf:0.0546, yf:0.4032},                             // the top of the Old Stairs (placed in game)
      // Pip, the Organization's junior surveyor, by the tent; Old Ash, an old cat, on the bedroll by the fire
      staff:[
        {img:'old_pip', xf:ofx(1880), yf:ofy(728), h:118, face:-1, r:110, name:'Pip', talkFn:pipTalk,
         lines:[LT('Oh! You are not a supervisor. Good. I mean, hello.','Oh! Nu ești supervizor. Bine. Adică, bună ziua.'),
                LT('Junior Surveyor Pip, Organization field office. They said ten minutes. That was three days ago.','Topograf stagiar Pip, biroul de teren al Organizației. Mi-au zis zece minute. Asta a fost acum trei zile.'),
                LT('Everything down here is bank property now. It says so on the crates. I stamped them myself.','Tot ce e aici jos e acum proprietatea băncii. Scrie pe lăzi. Le-am ștampilat eu.'),
                LT('Please do not touch the statue core. It is logged. Logged things are very important.','Vă rog nu atingeți miezul statuii. E înregistrat. Lucrurile înregistrate sunt foarte importante.')]},
        {img:'old_ash', xf:ofx(195), yf:ofy(790), h:70, face:1, r:150, name:'Old Ash', talkFn:ashTalk,
         lines:[LT('Mrrr. Another one from upstairs. Mind the fire, it is the only warm thing for a mile.','Mrrr. Încă unul de sus. Ai grijă la foc, e singurul lucru cald pe o milă.'),
                LT('I came down after a mouse. That was a long time ago. The mouse got away. I stayed.','Am coborât după un șoarece. A fost demult. Șoarecele a scăpat. Eu am rămas.'),
                LT('Up there they fight about whose flag is on the wall. Down here the walls belong to somebody nobody remembers.','Acolo sus se ceartă al cui steag e pe zid. Aici jos zidurile sunt ale cuiva de care nu-și mai amintește nimeni.'),
                LT('The big cats carved everything. Look at the pictures on the walls. Read them slowly.','Pisicile mari au sculptat tot. Uită-te la imaginile de pe pereți. Citește-le încet.')]},
      ],
      doors:[
        {xf:0.0666, yf:0.4354, r:80, glowXf:0.0441, glowYf:0.2751, glowR:80, glowRGB:'255,200,120',
         to:'librarylower', label:'Up the Old Stairs', icon:'', toSpawn:{xf:0.90, yf:0.68}},
        // the Forge Gate: three round sockets, three Fang Cores (one from the rats, the cats, the pigs)
        {xf:ofx(2290), yf:ofy(490), r:110, glowXf:ofx(2296), glowYf:ofy(240), glowR:110, glowRGB:'170,90,255', icon:'',
         glowIf(){ return S.oldGateOpen || oldCoresHeld()>0; },
         labelFn(){ return S.oldGateOpen ? LT('The Forges','Forjele') : LT('Set the Fang Core','Pune Fang Core'); },
         nearFn(){ if(S.oldGateOpen || oldCoresHeld()>0) return;
           if(HUB._blockedDoor!==this){ HUB._blockedDoor=this; const n=oldSocketed().length;
             toast(n ? LT(n+' of the 3 sockets glow. The others wait for their cores.',n+' din cele 3 locașuri strălucesc. Celelalte își așteaptă miezurile.')
                     : LT('Three round sockets in the gate, all empty. Something the size of a fist went in each.','Trei locașuri rotunde în poartă, toate goale. În fiecare intra ceva cât un pumn.')); }
           return 'skip'; },
         useFn(){ if(!S.oldGateOpen) oldGateScene(); else toast(LT('The Forges are still being built. Soon.','Forjele încă se construiesc. În curând.')); }},
        // the far end of the plaza: the long avenue between the two sphinxes
        {xf:0.5673, yf:0.4798, r:95, glowXf:0.5709, glowYf:0.3954, glowR:159, glowRGB:'255,200,120', icon:'',
         to:'fangavenue', label:'The Avenue of Fangs', toSpawn:{xf:0.0396, yf:0.6627}},
        // three purple crystal clusters Pip needs as samples (only once he has asked)
        ...OLD_SHARDS.map((p,i)=>({xf:ofx(p[0]), yf:ofy(p[1]), r:95, glowXf:ofx(p[0]), glowYf:ofy(p[1]-30), glowR:46, glowRGB:'190,120,255', icon:'',
          labelFn(){ return LT('Chip off a crystal sample','Desprinde o mostră de cristal'); },
          glowIf(){ return S.oldPipQuest==='on' && !(S.oldShards||[]).includes(i); },
          nearFn(){ return (S.oldPipQuest==='on' && !(S.oldShards||[]).includes(i)) ? undefined : 'skip'; },
          useFn(){ S.oldShards=(S.oldShards||[]).concat(i); save(); updateQuestHUD();
            SFX.tone&&SFX.tone(1180,0.12,'triangle',0.04);
            toast(LT('A crystal sample for Pip ('+S.oldShards.length+'/3)','O mostră de cristal pentru Pip ('+S.oldShards.length+'/3)')); }})),
        // Whisk's pack, left behind at the camp by the stairs
        {xf:ofx(262), yf:ofy(752), r:70, glowXf:ofx(262), glowYf:ofy(735), glowR:42, glowRGB:'255,210,140', icon:'',
         labelFn(){ return LT('A rat-sized pack','Un rucsac de șobolan'); },
         glowIf(){ return !S.oldPack; },
         nearFn(){ return S.oldPack ? 'skip' : undefined; },
         useFn(){ S.oldPack=true; if(!S.items.includes('old_pack')) S.items.push('old_pack'); save(); syncHUD(); updateQuestHUD();
           toast(LT('A tiny pack: a crust of cheese, a spare sock, a letter never sent.','Un rucsac mic: o coajă de brânză, o șosetă de rezervă, o scrisoare netrimisă.')); }},
      ],
    },
    platforms:[], npcs:[],
  };
}

// ── The Forge Gate: three Fang Cores, one from each side ──
// Rats: Whisk, a deserter hiding by the mural wall, dug one out of a tunnel; he wants his pack back.
// Cats: Old Ash has been sleeping on one (the warmest stone down here); a fish broth or 30 fish buys it.
// Pigs: Pip logged one as bank property; Agent Snout's Survey Badge, or the word "supervisor", frees it.
const OLD_CORE_IDS=['old_core_purple','old_core_pig','old_core_rat'];   // purple (the tarantula's eye), orange (Pip), green (Whisk)
const OLD_SHARDS=[[410,470],[1570,860],[2440,790]];                     // the crystal clusters Pip wants samples from (map pixels)
function oldSocketed(){ return S.oldSocketed || (S.oldGateOpen ? OLD_CORE_IDS.slice() : []); }    // cores already set in the gate
function oldHasCore(id){ return S.items.includes(id) || oldSocketed().includes(id); }               // ever got it (carried or set)
function oldCoresHeld(){ return OLD_CORE_IDS.filter(id=>S.items.includes(id)).length; }            // carried, not yet set
function oldGiveCore(id, msgEn, msgRo){
  if(!S.items.includes(id)) S.items.push(id); save(); syncHUD();
  SFX.tone&&[523,659,784].forEach((f,i)=>SFX.tone(f,0.18,'triangle',0.04,i*0.09));
  const n=OLD_CORE_IDS.filter(oldHasCore).length;
  toast(LT(msgEn+' ('+n+'/3 Fang Cores)', msgRo+' ('+n+'/3 Fang Cores)'));
}
function oldRegisterItems(){
  if(typeof SHOP!=='object' || SHOP.some(i=>i.id==='old_core_rat')) return;
  SHOP.push(
    {id:'old_core_purple',emoji:'',img:OLD_ART+'core_purple.png',name:'Fang Core (Purple)',desc:'It was the eye of a giant spider. It still looks at things.',price:99999,type:'key',trophy:true},
    {id:'old_core_rat',emoji:'',img:OLD_ART+'core_green.png',name:'Fang Core (Green)',desc:'Dug out of a collapsing tunnel by a rat who ran from the war.',price:99999,type:'key',trophy:true},
    {id:'old_core_pig',emoji:'',img:OLD_ART+'core_orange.png',name:'Fang Core (Pig)',desc:'Logged as bank property. Signed out in a hurry.',price:99999,type:'key',trophy:true},
    {id:'old_pack',emoji:'',img:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="8" y="9" width="16" height="18" fill="#2a1a10"/><rect x="9" y="10" width="14" height="16" fill="#7a5a34"/><rect x="11" y="6" width="10" height="5" fill="#2a1a10"/><rect x="12" y="7" width="8" height="3" fill="#5a4024"/><rect x="9" y="15" width="14" height="3" fill="#5a4024"/><rect x="15" y="16" width="2" height="2" fill="#e8c060"/></svg>'),name:'Rat-sized Pack',desc:'Cheese, a sock, a letter home that was never sent.',price:99999,type:'key',trophy:true});
}
// dialogue faces: square crops around each head (the full sprites are too wide or too tall for the round portrait)
const OLD_FACES={}; ['pip','old_ash','whisk'].forEach(n=>{ const im=new Image(); im.src=OLD_ART+'npc/'+n+'_face.png?v=2'; OLD_FACES[n]=im; });
const OLD_FACE=(k)=>OLD_FACES[{old_pip:'pip',old_ash:'old_ash',old_whisk:'whisk'}[k]]||PIG_IMG[k];
function oldSay(name, img, lines, then, bg){ sayLines(name, lines, {img:OLD_FACE(img), bg:bg||'#1b2433', tone:340, then}); }
function pipTalk(s){
  if(oldHasCore('old_core_pig')){ oldSay('Pip','old_pip',[LT('I have filed a report saying nothing happened. Please make it true.','Am depus un raport că nu s-a întâmplat nimic. Vă rog să fie adevărat.')]); return; }
  const give=()=>{ S.oldPipQuest='done'; oldGiveCore('old_core_pig','Pip hands over the orange core, and nearly his hat.','Pip îți dă miezul portocaliu, și aproape și casca.'); updateQuestHUD(); };
  if(S.items.includes('snoutbadge')){
    oldSay('Pip','old_pip',[LT('Is that a Survey Badge? Agent Snout\'s badge?','Aia e o insignă de topograf? Insigna agentului Snout?'),
      LT('Then you are cleared for removal of bank property. Sign here. And here. Initial here.','Atunci ești autorizat să ridici proprietatea băncii. Semnează aici. Și aici. Inițiale aici.'),
      LT('Take it. Please. It hums at night.','Ia-l. Te rog. Bâzâie noaptea.')], give);
    return; }
  const have=(S.oldShards||[]).length;
  if(S.oldPipQuest==='on' && have>=3){
    oldSay('Pip','old_pip',[LT('Three samples! Clean ones! The report is complete.','Trei mostre! Curate! Raportul e complet.'),
      LT('Logged property may be exchanged for samples of equal value. That is in the rules. I think it is in the rules.','Proprietatea înregistrată poate fi schimbată pe mostre de valoare egală. Așa scrie în regulament. Cred că așa scrie.'),
      LT('The orange core is yours. If anyone asks, it was a fair trade.','Miezul portocaliu e al tău. Dacă întreabă cineva, a fost un schimb cinstit.')], give);
    return; }
  if(S.oldPipQuest==='on'){
    oldSay('Pip','old_pip',[LT('Three crystal samples, from the clusters around the plaza. You have '+have+'.','Trei mostre de cristal, din grămezile din jurul pieței. Ai '+have+'.'),
      LT('I would go myself, but I am not allowed past the tent. Regulations.','Aș merge eu, dar n-am voie să trec de cort. Regulament.')]);
    return; }
  oldSay('Pip','old_pip',s.lines.concat([
    LT('The office wants three crystal samples for the report. Without them nobody comes to get me.','Biroul vrea trei mostre de cristal pentru raport. Fără ele nu vine nimeni după mine.'),
    LT('Bring me three, and I will sign the orange core over to you. Fair exchange. Very official.','Adu-mi trei și îți trec miezul portocaliu pe numele tău. Schimb cinstit. Foarte oficial.')]),
    ()=>{ S.oldPipQuest='on'; save(); updateQuestHUD(); toast(LT('New quest: crystal samples for Pip','Quest nou: mostre de cristal pentru Pip')); });
}
function ashTalk(s){
  if(!S.oldAshMet){ S.oldAshMet=true; save();
    oldSay('Old Ash','old_ash',s.lines.concat([LT('The little pack by the fire? A rat left it. Ran off down the long avenue. Smelled of cheese and panic.','Rucsacul mic de lângă foc? L-a lăsat un șobolan. A fugit pe bulevardul lung. Mirosea a brânză și a panică.')])); return; }
  oldSay('Old Ash','old_ash',[LT('Still here? The fire is warm, the floor is cold. Pick one.','Tot aici? Focul e cald, podeaua e rece. Alege.'),
    LT('The rat went down the avenue, past the big cats. He hides in the dark bits of the wall.','Șobolanul a luat-o pe bulevard, pe lângă pisicile mari. Se ascunde în colțurile întunecate ale zidului.')]);
}
function whiskTalk(s){
  if(oldHasCore('old_core_rat')){ oldSay('Whisk','old_whisk',[LT('I am not going back up. Not to them. Maybe I will stay with the old cat. He does not shout.','Nu mă mai întorc sus. Nu la ei. Poate rămân cu motanul bătrân. El nu țipă.')],null,'#2a1210'); return; }
  if(S.items.includes('old_pack')){
    oldSay('Whisk','old_whisk',[LT('My pack! You brought my pack. The letter is still in it.','Rucsacul meu! Mi-ai adus rucsacul. Scrisoarea e încă în el.'),
      LT('Here. The stone. They would have put it on a spear. I would rather it went in a door.','Poftim. Piatra. Ar fi pus-o pe o suliță. Mai bine să intre într-o ușă.')],
      ()=>{ S.items=S.items.filter(i=>i!=='old_pack'); S.oldWhiskDone=true; updateQuestHUD(); oldGiveCore('old_core_rat','Whisk gives you the green core with both paws.','Whisk îți dă miezul verde cu ambele labe.'); },'#2a1210');
    return; }
  if(!S.oldTarantulaDown){ oldSay('Whisk','old_whisk',[LT('Shh! Not now! It lives up there, in the roof. It comes down when it hears feet.','Ssst! Nu acum! Trăiește acolo sus, în tavan. Coboară când aude pași.')],null,'#2a1210'); return; }
  if(!S.oldWhiskMet){ S.oldWhiskMet=true; save(); updateQuestHUD(); }
  oldSay('Whisk','old_whisk',[LT('Do not shout. Please. Are they still looking for me up there?','Nu țipa. Te rog. Încă mă caută acolo sus?'),
    LT('I dug this out of the old tunnel. Then the tunnel moved. I ran, and left my pack at the camp by the stairs.','Am scos asta din tunelul vechi. Apoi tunelul s-a mișcat. Am fugit și mi-am lăsat rucsacul la tabăra de lângă scări.'),
    LT('I cannot go back there. The old cat is there. Cats eat rats, everybody says so.','Nu pot să mă întorc acolo. E motanul bătrân acolo. Pisicile mănâncă șobolani, toată lumea zice.')],null,'#2a1210');
}
// the three sockets in the gate (map pixels) and the scene that fills them
const OLD_SOCKETS=[[2216,312],[2296,215],[2382,312]];   // the centres of the three bronze rings (measured on the map)
const OLD_SOCKET_ORB=[['core_purple','170,90,255'],['core_orange','255,150,40'],['core_green','70,230,110']];   // spider, pig, rat
const OLD_ORB_IMG={}; OLD_SOCKET_ORB.forEach(([f])=>{ const im=new Image(); im.src=OLD_ART+f+'.png?v=1'; OLD_ORB_IMG[f]=im; });
function drawOldGate(){
  const G=HUB.oldGate, now=Date.now();
  if(G && now>G.until) HUB.oldGate=null;                                       // scene skipped or over
  const set=oldSocketed(), hide=(HUB.oldGate&&HUB.oldGate.hide)||[];
  const idx=OLD_CORE_IDS.map((id,i)=>(set.includes(id)&&!hide.includes(id))?i:-1).filter(i=>i>=0);
  if(!idx.length && !HUB.oldGate) return;
  const W=HUB.worldW, k=W/OLD_CITY_W;
  g.save(); g.globalCompositeOperation='lighter';
  idx.forEach(i=>{ const [x,y]=OLD_SOCKETS[i], [f,rgb]=OLD_SOCKET_ORB[i], sx=x*k-HUB.camx, sy=y/OLD_CITY_H*VH, R=30*k*(1+0.08*Math.sin(now*0.005+i));
    const gr=g.createRadialGradient(sx,sy,2,sx,sy,R*2.4); gr.addColorStop(0,'rgba('+rgb+',.75)'); gr.addColorStop(0.4,'rgba('+rgb+',.4)'); gr.addColorStop(1,'rgba('+rgb+',0)');
    g.fillStyle=gr; g.beginPath(); g.arc(sx,sy,R*2.4,0,7); g.fill(); });
  g.globalCompositeOperation='source-over'; g.imageSmoothingEnabled=false;
  idx.forEach(i=>{ const im=OLD_ORB_IMG[OLD_SOCKET_ORB[i][0]]; if(!(im&&im.complete&&im.naturalWidth)) return;   // the orb itself, sitting in its socket
    const [x,y]=OLD_SOCKETS[i], sx=x*k-HUB.camx, sy=y/OLD_CITY_H*VH, h=54*k, w=im.naturalWidth/im.naturalHeight*h;
    g.drawImage(im, sx-w/2, sy-h*0.41, w, h); });   // the sphere sits at 41% of the sprite's height, claws below
  g.globalCompositeOperation='lighter';
  if(HUB.oldGate && HUB.oldGate.flashAt){ const t=now-HUB.oldGate.flashAt; if(t<900){ g.fillStyle='rgba(200,150,255,'+(0.6*(1-t/900))+')'; g.fillRect(0,0,VW,VH); } }
  g.restore();
}
// set every core you carry into its socket; the third one opens the gate
function oldGateScene(){
  const W=()=>HUB.worldW, C=()=>HUB.cine, sub=(t)=>{ if(C()) C().sub = t ? {text:t, t0:Date.now()} : null; };
  const going=OLD_CORE_IDS.filter(id=>S.items.includes(id)); if(!going.length) return;
  // the save changes now, so skipping the scene can't lose a core; the scene only reveals them one by one
  S.oldSocketed=OLD_CORE_IDS.filter(id=>oldSocketed().includes(id)||going.includes(id));
  S.items=S.items.filter(i=>!OLD_CORE_IDS.includes(i));
  const opens=S.oldSocketed.length===3; if(opens) S.oldGateOpen=true;
  save(); syncHUD();
  const ding=(i)=>SFX.tone&&SFX.tone([392,494,587][i],0.4,'triangle',0.05);
  const SAY={old_core_purple:LT('The spider\'s eye clicks into place.','Ochiul păianjenului intră cu un clic.'),
             old_core_pig:LT('The pig\'s core clicks into place.','Miezul porcului intră cu un clic.'),
             old_core_rat:LT('The rat\'s core clicks into place.','Miezul șobolanului intră cu un clic.')};
  const steps=[{cam:()=>ofx(2296)*W(), ms:900}];
  going.forEach(id=>steps.push({ms:1200, do:()=>{ const G=HUB.oldGate; if(G) G.hide=G.hide.filter(h=>h!==id); ding(OLD_CORE_IDS.indexOf(id)); sub(SAY[id]); }}));
  if(opens) steps.push(
    {ms:2600, do:()=>{ if(HUB.oldGate) HUB.oldGate.flashAt=Date.now(); if(SFX.tone) for(let i=0;i<6;i++) SFX.tone(60+i*4,0.4,'sawtooth',0.03,i*0.25);
      sub(LT('Three hands, one door. Something deep in the wall starts to turn.','Trei mâini, o singură ușă. Ceva adânc în zid începe să se rotească.')); }},
    {ms:3200, do:()=>sub(LT('The Forge Gate is open.','Poarta Forjei e deschisă.'))});
  else { const n=S.oldSocketed.length;
    steps.push({ms:2200, do:()=>sub(LT(n+' of 3. The gate hums, and waits for the rest.',n+' din 3. Poarta vibrează și îi așteaptă pe ceilalți.'))}); }
  steps.push({ms:400, do:()=>sub(null)});
  const total=steps.reduce((a,st)=>a+(st.ms||0),0);
  HUB.oldGate={hide:going.slice(), flashAt:0, until:Date.now()+total+500};
  if(!cineStart('oldgate', steps, true)) HUB.oldGate=null;
}

// ── The Weaver: a giant tarantula on the Avenue of Fangs ──
// It lives in the hole in the roof and drops on its thread when you walk down the avenue.
// Its thick hair blunts claws (half damage). The braziers are the trick: bait its lunge into a lit
// brazier and it gets singed, stunned, and takes double damage while it reels (that brazier goes
// out for a while). It spits silk where you stand: the patches slow you, and burn away near a fire.
// Below half health it also climbs back up its thread and slams down where you stand.
// Frames: art/boss/tar_0..4 (walk A, walk B, rear, lunge, curled).
const OLD_TAR_IMG=[0,1,2,3,4].map(i=>{ const im=new Image(); im.src=OLD_ART+'boss/tar_'+i+'.png?v=2'; return im; });
const OLD_TAR_H=270;                                     // height on screen at scale 1 (it is big)
const OLD_TAR_NAME=()=>LT('The Weaver','Țesătoarea');
let OLD_AV_BRAZ=[[235,550],[770,550],[1300,550],[1830,550],[235,800],[770,800],[1300,800],[1845,800]];   // both rows, at the pedestal's foot                                      // the avenue's braziers, map pixels (set with the map)
const oldBrazW=()=>OLD_AV_BRAZ.map(([x,y])=>({x:x/OLD_AV_W*HUB.worldW, y:y/OLD_AV_H*VH}));
// every heavy landing shakes stones loose: some fall on you, the rest around the avenue
function oldRockfall(b,now,n){ const c=HUB.cat, band=hubBand();
  for(let i=0;i<n;i++){ const onYou=i<2, x=onYou ? c.x+(Math.random()-0.5)*120 : c.x+(Math.random()-0.5)*VW*0.9;
    const y=onYou ? c.y+(Math.random()-0.5)*50 : band.top+Math.random()*(band.bot-band.top);
    b.rocks.push({x, y, r:70, t0:now, landAt:now+1100+i*180}); } }
const OLD_TARANTULA={
  init(b,H){ b.state = S.oldTarantulaDown ? 'down' : 'hidden'; b.lift=b.state==='hidden'?1:0; b.facing=-1; b.phase=0;
    b.webs=[]; b.spits=[]; b.rocks=[]; b.brazOut=OLD_AV_BRAZ.map(()=>0); b.nextSpit=0; b.hinted=false;
    if(S.oldTarantulaDown){ b.defeated=true; b.hp=0; } },
  update(b,now){
    const c=HUB.cat;
    // silk slows you: damp this frame's step while you stand in a patch
    if(b.prevCat && b.webs.some(w=>Math.hypot(c.x-w.x,(c.y-w.y)*1.4)<w.r)){ c.x=b.prevCat.x+(c.x-b.prevCat.x)*0.4; c.y=b.prevCat.y+(c.y-b.prevCat.y)*0.4; }
    b.prevCat={x:c.x,y:c.y};
    // stones shaken loose from the roof: a warning circle, then they land
    b.rocks=(b.rocks||[]).filter(r=>{ if(now<r.landAt) return true;
      if(!r.hit){ r.hit=true; r.doneAt=now+500; SFX.tone&&SFX.tone(90,0.15,'square',0.04);
        if(Math.hypot(c.x-r.x,(c.y-r.y)*1.3)<r.r) hubHurtPlayer(now, rnd(10,15), '#d8c8a8', r.x, r.y, 22); }
      return now<r.doneAt; });
    // silk burns near a lit brazier, and fades
    const BZ=oldBrazW();
    b.webs=b.webs.filter(w=>{ if(now>w.until) return false;
      if(!w.burnAt && BZ.some((z,i)=>now>b.brazOut[i] && Math.hypot(w.x-z.x,w.y-z.y)<170)) w.burnAt=now+1200;
      return !(w.burnAt && now>w.burnAt); });
    // globs in flight become patches
    b.spits=b.spits.filter(sp=>{ if(now<sp.landAt) return true; b.webs.push({x:sp.x,y:sp.y,r:80,until:now+8000}); return false; });
    const dx=c.x-b.x, dy=c.y-b.y, dist=Math.hypot(dx,dy);
    if(b.state==='down' || b.defeated) return;
    if(b.state==='hidden'){
      if(c.x > b.x-VW*0.42){ b.state='drop'; b.t0=now; SFX.tone&&SFX.tone(110,0.6,'sawtooth',0.04);
        toast(LT('Something is coming down on a thread...','Ceva coboară pe un fir...')); }
      return; }
    if(b.state==='drop'){
      const k=Math.min(1,(now-b.t0)/1700); b.lift=1-k*k;
      if(k>=1){ b.lift=0; b.state='walk'; b.nextAtk=now+1300; b.nextSpit=now+2600; SFX.tone&&SFX.tone(70,0.3,'square',0.06); HUB.shakeUntil=now+350; oldRockfall(b,now,4);
        if(!b.hinted){ b.hinted=true; setTimeout(()=>toast(LT('Its thick hair blunts your claws. The braziers burn bright though...','Blana groasă îți tocește ghearele. Dar brazierele ard puternic...')),900); } }
      return; }
    if(b.state==='stunned'){ if(now>b.stunUntil){ b.state='walk'; b.nextAtk=now+900; } return; }
    if(Math.abs(dx)>40 && b.state!=='lunge') b.facing=dx<0?-1:1;
    b.phase2=b.hp<=b.maxHp*0.5;
    const sp=b.phase2?2.4:1.7;
    if(b.state==='walk'){
      if(dist>120){ hubBossMove(b, dx/dist*sp, dy/dist*sp*0.8); b.phase+=0.1; b.moving=true; } else b.moving=false;
      if(now>b.nextSpit){ b.nextSpit=now+(b.phase2?3200:4600);               // a glob of silk where you stand
        b.spits.push({fx:b.x, fy:b.y-OLD_TAR_H*hubScale(b.y)*0.5, x:c.x, y:c.y, t0:now, landAt:now+750});
        SFX.tone&&SFX.tone(520,0.12,'triangle',0.035); }
      if(now>b.nextAtk){
        if(b.phase2 && Math.random()<0.4){ b.state='climb'; b.t0=now; }
        else if(dist<380){ b.state='rear'; b.t0=now; b.stomp=Math.random()<0.35; SFX.tone&&SFX.tone(240,0.15,'sawtooth',0.04); }
        else b.nextAtk=now+400;
      }
      if(dist<100 && now>(b.touchAt||0)){ b.touchAt=now+900; hubHurtPlayer(now, rnd(b.kind.cdmg[0],b.kind.cdmg[1])-4, '#c08cff', b.x, b.y, 16); }
      return; }
    if(b.state==='rear'){                                // up on its back legs: the tell, then it commits to a line
      if(now-b.t0>(b.phase2?520:700) && b.stomp){ b.stomp=false; b.state='walk'; b.nextAtk=now+1400;   // slams its legs down instead
        SFX.tone&&SFX.tone(70,0.3,'square',0.07); HUB.shakeUntil=now+400; oldRockfall(b,now,b.phase2?6:4);
        if(Math.hypot(dx,dy)<150) hubHurtPlayer(now, rnd(b.kind.cdmg[0],b.kind.cdmg[1]), '#c08cff', b.x, b.y, 30); return; }
      if(now-b.t0>(b.phase2?520:700)){ b.state='lunge'; b.t0=now; b.la=Math.atan2(dy,dx); b.hitDone=false; } return; }
    if(b.state==='lunge'){
      const k=(now-b.t0)/420; hubBossMove(b, Math.cos(b.la)*14*(1-k*0.6), Math.sin(b.la)*10*(1-k*0.6));
      if(!b.hitDone && Math.hypot(c.x-b.x,c.y-b.y)<130){ b.hitDone=true; hubHurtPlayer(now, rnd(b.kind.cdmg[0],b.kind.cdmg[1]), '#c08cff', b.x, b.y, 30); }
      // ran into a lit brazier: singed
      const i=BZ.findIndex((z,j)=>now>b.brazOut[j] && Math.hypot(b.x-z.x,(b.y-z.y)*1.3)<110);
      if(i>=0){ b.brazOut[i]=now+15000; b.state='stunned'; b.stunUntil=now+3200; b.singedAt=now;
        floatText(b.x,b.y-OLD_TAR_H*hubScale(b.y)-20,LT('SINGED!','PÂRLITĂ!'),'#ffb347');
        SFX.tone&&[180,140,100].forEach((f,j)=>SFX.tone(f,0.2,'sawtooth',0.05,j*0.08)); HUB.shakeUntil=now+300; return; }
      if(k>=1){ b.state='walk'; b.nextAtk=now+(b.phase2?1000:1500); } return; }
    if(b.state==='climb'){ const k=Math.min(1,(now-b.t0)/600); b.lift=k; if(k>=1){ b.state='aim'; b.t0=now; } return; }
    if(b.state==='aim'){ b.x+=(c.x-b.x)*0.08; b.y+=(c.y-b.y)*0.08; if(now-b.t0>1000){ b.state='slam'; b.t0=now; } return; }
    if(b.state==='slam'){
      const k=Math.min(1,(now-b.t0)/260); b.lift=1-k;
      if(k>=1){ b.lift=0; SFX.tone&&SFX.tone(60,0.35,'square',0.07); HUB.shakeUntil=now+400; oldRockfall(b,now,b.phase2?7:5);
        if(Math.hypot(c.x-b.x,c.y-b.y)<160) hubHurtPlayer(now, rnd(b.kind.cdmg[0]+4,b.kind.cdmg[1]+6), '#c08cff', b.x, b.y, 36);
        b.state='walk'; b.nextAtk=now+1500; } return; }
  },
  hit(b,dmg,now,col,near){
    if(b.defeated || !['walk','rear','lunge','stunned'].includes(b.state) || b.lift>0.2) return 0;
    const H=OLD_TAR_H*hubScale(b.y);
    if(!near(b.x, b.y-H*0.35, H*0.3)) return 0;
    const d = b.state==='stunned' ? dmg*2 : Math.max(1,Math.round(dmg*0.5));   // hair blunts claws; a singed spider is wide open
    b.hp-=d; b.hitFlash=now; floatText(b.x,b.y-H-10,'-'+d, b.state==='stunned'?'#ffb347':col);
    if(b.hp<=0) oldTarantulaDown(b,now);
    syncHUD(); save(); return 1;
  },
  draw(g,b){
    const now=Date.now(), BZ=oldBrazW();
    // the braziers it has knocked out: dark smoke over the bowl until they relight
    BZ.forEach((z,i)=>{ if(now<(b.brazOut||[])[i]){ const sx=z.x-HUB.camx, sy=z.y-62*hubScale(z.y);
      g.save(); g.fillStyle='rgba(20,14,26,.85)'; g.beginPath(); g.ellipse(sx,sy,26*hubScale(z.y),20*hubScale(z.y),0,0,7); g.fill();
      g.fillStyle='rgba(160,150,170,.35)'; for(let k=0;k<3;k++){ const t=(now/900+k/3)%1; g.beginPath(); g.arc(sx+Math.sin(t*6+k)*6, sy-t*40, 6+t*8,0,7); g.fill(); }
      g.restore(); } });
    // silk on the floor
    for(const w of (b.webs||[])){ const sx=w.x-HUB.camx, burn=w.burnAt?Math.max(0,(w.burnAt-now)/1200):1;
      g.save(); g.globalAlpha=0.75*burn*Math.min(1,(w.until-now)/800); g.strokeStyle=w.burnAt?'#ffb060':'#e9e4f2'; g.lineWidth=2;
      for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; g.beginPath(); g.moveTo(sx,w.y); g.lineTo(sx+Math.cos(a)*w.r, w.y+Math.sin(a)*w.r*0.55); g.stroke(); }
      for(const rr of [0.35,0.65,0.95]){ g.beginPath(); g.ellipse(sx,w.y,w.r*rr,w.r*rr*0.55,0,0,7); g.stroke(); }
      g.restore(); }
    // falling stones: a red circle that fills up, then the stone drops and cracks
    for(const r of (b.rocks||[])){ const sx=r.x-HUB.camx, t=Math.min(1,(now-r.t0)/(r.landAt-r.t0));
      g.save();
      if(!r.hit){ g.strokeStyle='rgba(255,90,70,.85)'; g.lineWidth=2; g.beginPath(); g.ellipse(sx,r.y,r.r,r.r*0.5,0,0,7); g.stroke();
        g.fillStyle='rgba(255,70,50,'+(0.12+0.25*t)+')'; g.beginPath(); g.ellipse(sx,r.y,r.r*t,r.r*0.5*t,0,0,7); g.fill();
        if(t>0.6){ const fy=r.y-(1-(t-0.6)/0.4)*VH*0.8; g.fillStyle='#6d5a6e'; g.strokeStyle='#241a28'; g.lineWidth=2;
          g.beginPath(); g.moveTo(sx-16,fy); g.lineTo(sx-6,fy-20); g.lineTo(sx+14,fy-14); g.lineTo(sx+18,fy+4); g.lineTo(sx,fy+14); g.closePath(); g.fill(); g.stroke(); } }
      else { const k=(r.doneAt-now)/500; g.globalAlpha=Math.max(0,k); g.fillStyle='#5a4a5c';
        for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; g.fillRect(sx+Math.cos(a)*r.r*(1-k)*0.8-4, r.y+Math.sin(a)*r.r*0.4*(1-k)-4, 8, 8); } }
      g.restore(); }
    // globs in the air, with a warning circle where they land
    for(const sp of (b.spits||[])){ const t=Math.min(1,(now-sp.t0)/(sp.landAt-sp.t0)), x=sp.fx+(sp.x-sp.fx)*t, y=sp.fy+(sp.y-sp.fy)*t-Math.sin(t*Math.PI)*120;
      g.save(); g.strokeStyle='rgba(233,228,242,.6)'; g.setLineDash([6,6]); g.beginPath(); g.ellipse(sp.x-HUB.camx,sp.y,80,44,0,0,7); g.stroke(); g.setLineDash([]);
      g.fillStyle='#efeaf7'; g.beginPath(); g.arc(x-HUB.camx,y,9,0,7); g.fill(); g.restore(); }
    if(b.state==='hidden') return;
    const sc=hubScale(b.y), sx=b.x-HUB.camx, H=OLD_TAR_H*sc;
    // frame 4 is only the defeated pose (eye gone); everything else uses the walk/attack frames
    const fr = (b.state==='down'||b.defeated) ? 4 : b.state==='rear' ? 2 : b.state==='lunge' ? 3
             : (b.moving ? Math.floor(b.phase)%2 : 0);
    const im=OLD_TAR_IMG[fr]; const lift=(b.lift||0)*(b.y+60);
    g.save(); const sh=1-(b.lift||0)*0.6; g.globalAlpha=0.35+(b.state==='aim'?0.25*Math.sin(now*0.02):0);
    g.fillStyle='#000'; g.beginPath(); g.ellipse(sx,b.y,H*0.75*sh,H*0.16*sh,0,0,7); g.fill(); g.restore();
    if(lift>2 || b.state==='drop'){ g.save(); g.strokeStyle='rgba(230,220,255,.55)'; g.lineWidth=2; g.beginPath(); g.moveTo(sx,0); g.lineTo(sx,b.y-lift-H*0.6); g.stroke(); g.restore(); }
    if(im.complete && im.naturalWidth){
      const w=im.naturalWidth/im.naturalHeight*H;
      g.save(); g.translate(sx, b.y-lift); if(b.facing>0) g.scale(-1,1); g.imageSmoothingEnabled=false;
      if(b.defeated) g.filter='brightness(0.75)';
      else if(b.state==='stunned') g.filter='brightness(1.25) sepia(0.5)';
      g.drawImage(im, -w/2, -H, w, H); g.restore();
      if(now-(b.hitFlash||0)<110){ g.save(); g.globalAlpha=.45; g.globalCompositeOperation='lighter'; g.fillStyle='#fff';
        g.beginPath(); g.ellipse(sx,b.y-lift-H*0.45,w*0.4,H*0.4,0,0,7); g.fill(); g.restore(); }
    }
    if(b.state==='stunned'){                              // singed: little flames and dizzy stars over it
      g.save(); g.font='bold 20px "Jersey 10"'; g.textAlign='center';
      for(let k=0;k<3;k++){ const a=now*0.005+k*2.1; g.fillStyle=k%2?'#ffb347':'#fff3a0'; g.fillText('*', sx+Math.cos(a)*H*0.35, b.y-H*0.95+Math.sin(a)*10); }
      g.restore(); }
    if(!b.defeated && b.state!=='drop' && (b.lift||0)<0.5)
      drawBossPlate(sx, b.y-H-24, OLD_TAR_NAME(), Math.max(0,b.hp/b.maxHp), b.phase2?'#e070ff':'#a64dff', '#24102e');
  },
};
function oldTarantulaDown(b,now){
  b.defeated=true; b.hp=0; b.state='down'; b.lift=0; const k=b.kind;
  S.coins+=k.coins; addXP(k.xp); S.totalDefeats=(S.totalDefeats||0)+1; S.oldTarantulaDown=true; save();
  SFX.seq&&SFX.seq([392,330,262,196],'triangle',0.06);
  toast(LT('The Weaver folds its legs and goes still. Asleep, not dead.','Țesătoarea își strânge picioarele și rămâne nemișcată. Doarme, nu e moartă.'));
  setTimeout(()=>oldGiveCore('old_core_purple','Its purple eye comes loose and rolls to your paws.','Ochiul mov i se desprinde și se rostogolește la labele tale.'), 1600);
}

// ── Zone 1b: the Avenue of Fangs ──
// The long avenue between the two sphinxes, 2304x1024: the Weaver's lair (cocoons, webs, a shaft of light from the roof onto the skull mosaic), extended to the right and joined on the overlap (ref/make_avenue.py).
// Arcades and braziers along it; Whisk hides in the alcove with the crumbs; at the far end a fallen
// sphinx head blocks the way on (later content). Walk mask: ref/make_avenue_mask.py.
const OLD_AV_W=2304, OLD_AV_H=1024, avx=x=>x/OLD_AV_W, avy=y=>y/OLD_AV_H;
function oldAvenueArea(){
  return {
    name:'Avenue of Fangs', theme:'cave', mode:'topdown',
    hub:{
      music:'ruins',
      img:OLD_ART+'fang_avenue.png?v=8', mask:OLD_ART+'fang_avenue_walk.png?v=7', maskWalk:'yellow',
      walkTop:0.55, walkBot:0.84, scaleFar:0.86, scaleNear:1.00,
      spawn:{xf:0.0396, yf:0.6627},                              // placed in game
      boss:{xf:0.3414, yf:0.662, dlc:OLD_TARANTULA, kind:{hp:520, cdmg:[11,17], xp:520, coins:180}},
      staff:[
        {img:'old_whisk', xf:avx(1545), yf:avy(575), h:62, face:-1, r:130, name:'Whisk', talkFn:whiskTalk, lines:[]},
      ],
      doors:[
        {xf:0.0413, yf:0.6749, r:90, glowXf:0.0488, glowYf:0.6424, glowR:80, glowRGB:'255,200,120', icon:'',
         to:'smilodon', label:'Back to the plaza', toSpawn:{xf:0.5673, yf:0.54}},
        {xf:avx(1950), yf:avy(600), r:150, icon:'',
         nearFn(){ if(HUB._blockedDoor!==this){ HUB._blockedDoor=this;
           toast(LT('A fallen stone head blocks the avenue. Purple light leaks through the cracks behind it.','Un cap de piatră prăbușit blochează bulevardul. Lumină mov se strecoară prin crăpăturile din spatele lui.')); }
           return 'skip'; }},
      ],
    },
    platforms:[], npcs:[],
  };
}

// ── The ruins of the smilodons: the DLC's own theme (areas with music:'ruins') ──
// D Hijaz (D Eb F# G A Bb C), the old mode of a lost desert city, one bar of four seconds:
// D · Eb · D · Cm. A drone and a low choir hold the hall, a hand drum keeps "dum . tek tek",
// an oud-like pluck walks the scale, and every other pass a wooden flute sings the tune.
// Crystals chime, water drips, and everything rings back off the stone (a long echo on the bus).
// Built on first use: this script loads before the base game's instruments (PLACE_SOUND) exist.
let RUINS_MUSIC=null;
function oldRuinsMusic(){ if(RUINS_MUSIC) return RUINS_MUSIC; RUINS_MUSIC=Object.assign(Object.create(PLACE_SOUND),{ timer:null, step:0, bus:null, noise:null, curve:null, fuzz:null, gain:0.6,
  roots:[73.42, 77.78, 73.42, 65.41],                                          // D2 · Eb2 · D2 · C2
  chords:[[146.83,185.00,220.00],[155.56,196.00,233.08],[146.83,185.00,220.00],[130.81,155.56,196.00]],
  oud:[[293.66,369.99,440.00,311.13,293.66,220.00],[311.13,392.00,466.16,392.00,369.99,311.13],
       [293.66,311.13,369.99,392.00,369.99,311.13],[261.63,311.13,392.00,311.13,293.66,261.63]],
  tune:[[440.00,587.33,622.25,739.99],[783.99,0,739.99,622.25],[739.99,622.25,587.33,0],[523.25,622.25,587.33,0]],
  out(c){                                                                     // the stone hall: a long, darkening echo
    if(!this.bus){ PLACE_SOUND.out.call(this,c);
      const d=c.createDelay(1.5), fb=c.createGain(), lp=c.createBiquadFilter(), wet=c.createGain();
      d.delayTime.value=0.47; fb.gain.value=0.42; lp.type='lowpass'; lp.frequency.value=1600; wet.gain.value=0.45;
      this.bus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(c.destination); }
    return this.bus; },
  dum(c,t,v){ this.timpani(c,t,98,v); },                                      // the frame drum's deep stroke
  tek(c,t,v){ this.hiss(c,t,v,0.06,'bandpass',2600,1.4); },                   // the rim
  start(){ this.loop('ruins', 4, function(c,t){
    const i=this.step%4, root=this.roots[i], ch=this.chords[i], B=1;
    this.pad(c,t,73.42,4.6,0.03); this.pad(c,t,110,4.6,0.016);              // the drone never leaves D
    this.bass(c,t,root,3.8,0.022); this.choir(c,t,ch,4.2,0.016);
    // dum . tek tek | dum tek . tek  (the second drum bar answers the first)
    const pat = this.step%2 ? [[0,'d'],[1,'t'],[1.5,'d'],[3,'t']] : [[0,'d'],[2,'t'],[2.5,'t'],[3.5,'t']];
    if(this.step>=2) pat.forEach(([b,k])=> k==='d' ? this.dum(c,t+b*B,0.11) : this.tek(c,t+b*B,0.03));
    this.oud[i].forEach((f,k)=>{ if(Math.random()<0.8) this.pluck(c,t+k*(B*2/3),f,1.4,0.016); });
    if(Math.floor(this.step/4)%2===1) this.tune[i].forEach((f,k)=>{ if(f) this.flute(c,t+k*B,f,k===3||!this.tune[i][k+1]?1.9:1.05,0.026); });
    if(Math.random()<0.5) this.bell(c,t+1+Math.random()*2,[1174.66,1479.98,1760.00][this.step%3],2.6,0.012);   // a crystal answers
    for(let d=0;d<2;d++) if(Math.random()<0.5) this.drip(c,t+Math.random()*4,0.016);
    this.wind(c,t,5,0.012,200,600);
  }); } });
  return RUINS_MUSIC; }

// ── the hooks the base game calls ──
(window.PUIUTU_DLC = window.PUIUTU_DLC || {}).old_ones = {
  name: 'Shadow of the Old Ones',
  // its own music, by the hub's music: key (see zoneMusic)
  get music(){ return {ruins: oldRuinsMusic()}; },
  // owning the DLC swaps the title screen: the city with the Old Ones in the dark, the logo with the DLC's title
  menu: {bg: OLD_ART+'menu_bg.jpg?v=2', title: OLD_ART+'menu_title.png?v=2', titleWidth: 'min(40%,680px)'},
  // a fresh AREAS (start, reset): open the vault in the Lower Archive and add the DLC's areas
  areas(AREAS){
    const H=AREAS.librarylower && AREAS.librarylower.hub; if(!H) return;
    H.openIf='oldOnesOpen'; H.imgOpen=OLD_ART+'library_lower_open.png?v=4';   // the wheel rolled aside, the stairs behind it
    const i=H.doors.findIndex(d=>d.dlcTeaser==='old_ones');
    const door={xf:0.915, yf:0.668, r:105, glowXf:0.924, glowYf:0.430, glowR:96, glowRGB:'170,90,255', label:'The Old Stairs', icon:'',
      // shut until you carry Seby's crystal; with it, the wheel can be opened
      nearFn(){ if(S.oldOnesOpen || hasPurpleCrystal()) return;
        if(HUB._blockedDoor!==door){ HUB._blockedDoor=door; toast(LT('The wheel will not turn. Its purple stones are dark, as if they were waiting for something.','Roata nu se mișcă. Pietrele ei mov sunt stinse, de parcă ar aștepta ceva.')); }
        return 'skip'; },
      glowIf(){ return S.oldOnesOpen || hasPurpleCrystal(); },
      labelFn(){ return S.oldOnesOpen ? LT('The Old Stairs','Scările Vechi') : LT('Hold up the crystal','Ridică cristalul'); },
      // the first time, the crystal opens it; after that, the long way down
      useFn(){ if(!S.oldOnesOpen) oldVaultOpen(); else oldStairsDescent(); }};
    if(i>=0) H.doors[i]=door; else H.doors.push(door);
    AREAS.smilodon=oldCityArea();
    AREAS.fangavenue=oldAvenueArea();
    // the DLC's NPC faces live in the base game's staff image table
    oldRegisterItems();
    if(typeof PIG_IMG==='object') [['old_pip','pip'],['old_ash','old_ash'],['old_whisk','whisk']].forEach(([k,f])=>{ if(!PIG_IMG[k]){ const im=new Image(); im.src=OLD_ART+'npc/'+f+'.png?v=2'; PIG_IMG[k]=im; } });
    setTimeout(()=>{ if(typeof AREA_LVL==='object'){ AREA_LVL.smilodon=AREA_LVL.smilodon||8; AREA_LVL.fangavenue=AREA_LVL.fangavenue||8; } }, 0);   // AREA_LVL is declared after AREAS
  },
  drawCine(){ if(HUB.descent) drawOldDescent(); else drawOldVaultGlow(); },
  drawHub(){ if(curArea==='smilodon') drawOldGate(); },
  hudQuests(out){
    if(S.oldPipQuest==='on') out.push({key:'old_pip', name:'Pip', img:()=>OLD_FACES.pip, have:Math.min(3,(S.oldShards||[]).length), n:3, talk:true});
    if(S.oldWhiskMet && !S.oldWhiskDone) out.push({key:'old_whisk', name:'Whisk', img:()=>OLD_FACES.whisk, have:S.items.includes('old_pack')?1:0, n:1, talk:true});
  },
};
