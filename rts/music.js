// Border War — music. The game's own boss and slum themes (copied from life_of_puiutu_game.html,
// unchanged), played on shuffle. They were written for a live fight and look at the boss to decide
// what to play, so here they get a stand-in "boss" that is always mid-battle.
'use strict';
const S = { musicOn: (() => { try { const v = JSON.parse(localStorage.getItem('puiutu_save') || '{}'); return v.musicOn !== false; } catch (e) { return true; } })() };
const SFX = {
  ctx: null,
  ac() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  tone(freq, dur, type = 'square', vol = 0.05, when = 0) { if (!S.musicOn) return; const c = this.ac(); if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); },
  pad(freq, dur, vol, when = 0, type = 'sine') { if (!S.musicOn) return; const c = this.ac(); if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.8, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); },
};
const MUSIC = { start() {}, stop() {} };
// the stand-ins: every arena flag on, and a boss that never stops fighting
const A = { hub: { slumMusic: true, mechboar: true, sebyMusic: true, catMusic: true } };
const HUB = { boss: { stage: 'fight', state: '', phase2: false, introShown: true, defeated: false },
              abyss: { state: 'fight', headHp: 1, headMax: 1 } };

const BOSS_MUSIC={
  timer:null, step:0,
  roots:[73.42, 58.27, 65.41, 55.00],            // D2 · Bb1 · C2 · A1 (bass roots)
  chords:[
    [146.83,174.61,220.00,293.66],               // Dm
    [116.54,174.61,233.08,293.66],               // Bb
    [130.81,164.81,196.00,261.63],               // C
    [110.00,130.81,164.81,220.00],               // Am
  ],
  start(){
    if(this.timer||!S.musicOn) return;
    const bar=()=>{
      const ab=HUB.abyss;
      // only while actively fighting; once it sinks/dies (or you leave) fade back to the calm theme
      if(!S.musicOn || !ab || ab.state==='dead' || ab.state==='sinking'){ this.stop(); MUSIC.start(); return; }
      if(!SFX.ac()) return;
      const ci=this.step%4, ch=this.chords[ci], root=this.roots[ci];
      const enraged = ab.headHp < ab.headMax*0.5;
      ch.forEach((f,i)=> SFX.pad(f, 1.9, i===0?0.032:0.018, 0, 'sawtooth'));   // dark sustained chord
      for(let b=0;b<8;b++) SFX.pad(root, 0.18, 0.055, b*0.25, 'square');        // pulsing eighth-note bass
      SFX.tone(55,0.20,'sine',0.10,0); SFX.tone(55,0.20,'sine',0.09,1.0);       // low drum thuds (beats 1 & 3)
      const notes=enraged?16:8, st=2.0/notes;                                    // driving lead arpeggio
      for(let n=0;n<notes;n++) SFX.pad(ch[n%ch.length]*2, 0.14, 0.013, n*st, 'triangle');
      this.step++;
    };
    bar(); this.timer=setInterval(bar, 2000);
  },
  stop(){ if(this.timer){ clearInterval(this.timer); this.timer=null; } }
};

const SLUM_MUSIC={
  timer:null, step:0, bus:null, noise:null, curve:null, gain:0.36,
  B:60/140,                                        // one beat; a bar is 4 of them
  roots:[82.41, 65.41, 73.42, 61.74],              // E2 · C2 · D2 · B1
  chords:[
    [164.81,196.00,246.94],                        // Em
    [130.81,164.81,196.00],                        // C
    [146.83,185.00,220.00],                        // D
    [123.47,155.56,185.00],                        // B
  ],
  lead:[                                           // eighth notes, 0 = rest
    [659.25,0,659.25,783.99, 739.99,0,659.25,587.33],
    [659.25,0,659.25,783.99, 1046.50,0,987.77,783.99],
    [739.99,0,739.99,880.00, 1174.66,0,880.00,739.99],
    [622.25,0,739.99,987.77, 880.00,0,739.99,622.25],
  ],
  out(c){
    if(!this.bus){
      const comp=c.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=6; comp.connect(c.destination);
      this.bus=c.createGain(); this.bus.gain.value=this.gain; this.bus.connect(comp);
      const len=c.sampleRate, buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      this.noise=buf;
      const n=1024, cv=new Float32Array(n);
      for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; cv[i]=Math.tanh(x*3.2); }
      this.curve=cv;
    }
    return this.bus;
  },
  env(c,t,v,a,d){ const g=c.createGain(); g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(v,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); return g; },
  kick(c,t,v){ const o=c.createOscillator(), g=this.env(c,t,v,0.004,0.32);
    o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(42,t+0.12);
    o.connect(g); g.connect(this.out(c)); o.start(t); o.stop(t+0.4); },
  hiss(c,t,v,dur,type,freq,q){ const s=c.createBufferSource(), f=c.createBiquadFilter(), g=this.env(c,t,v,0.002,dur);
    s.buffer=this.noise; f.type=type; f.frequency.value=freq; f.Q.value=q||0.7;
    s.connect(f); f.connect(g); g.connect(this.out(c)); s.start(t); s.stop(t+dur+0.05); },
  snare(c,t,v){ this.hiss(c,t,v,0.18,'bandpass',1800,0.8);
    const o=c.createOscillator(), g=this.env(c,t,v*0.6,0.002,0.09); o.type='triangle'; o.frequency.value=190;
    o.connect(g); g.connect(this.out(c)); o.start(t); o.stop(t+0.15); },
  clang(c,t,v){                                    // the anvil: inharmonic partials, long ring
    const f=c.createBiquadFilter(), g=this.env(c,t,v,0.002,1.1); f.type='bandpass'; f.frequency.value=2400; f.Q.value=1.2;
    f.connect(g); g.connect(this.out(c));
    [523,1131,1689,2253].forEach(fr=>{ const o=c.createOscillator(); o.type='square'; o.frequency.value=fr;
      o.connect(f); o.start(t); o.stop(t+1.2); });
    this.hiss(c,t,v*0.8,0.08,'highpass',3000);
  },
  bass(c,t,fr,dur,v){                              // two detuned saws through a fuzz and a closing filter
    const ws=c.createWaveShaper(), f=c.createBiquadFilter(), g=this.env(c,t,v,0.005,dur);
    ws.curve=this.curve; f.type='lowpass'; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(220,t+dur);
    ws.connect(f); f.connect(g); g.connect(this.out(c));
    [1,1.006].forEach(m=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr*m;
      o.connect(ws); o.start(t); o.stop(t+dur+0.05); });
  },
  stab(c,t,ch,v){                                  // brass: bright attack, filter falls shut
    const f=c.createBiquadFilter(), g=this.env(c,t,v,0.01,0.34); f.type='lowpass';
    f.frequency.setValueAtTime(2600,t); f.frequency.exponentialRampToValueAtTime(420,t+0.3);
    f.connect(g); g.connect(this.out(c));
    ch.forEach(fr=>[1,1.004].forEach(m=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr*2*m;
      o.connect(f); o.start(t); o.stop(t+0.4); }));
  },
  choir(c,t,ch,dur,v){                             // "aah": detuned saws through the vowel's formant
    const f=c.createBiquadFilter(), g=c.createGain(); f.type='bandpass'; f.frequency.value=750; f.Q.value=2.2;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+dur*0.35);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    f.connect(g); g.connect(this.out(c));
    ch.forEach(fr=>[0.996,1.004].forEach(m=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr*2*m;
      o.connect(f); o.start(t); o.stop(t+dur+0.05); }));
  },
  tone(c,t,fr,dur,v){ const f=c.createBiquadFilter(), g=this.env(c,t,v,0.01,dur); f.type='lowpass'; f.frequency.value=3200;
    f.connect(g); g.connect(this.out(c));
    [['square',1],['sawtooth',1.005]].forEach(([ty,m])=>{ const o=c.createOscillator(); o.type=ty; o.frequency.value=fr*m;
      o.connect(f); o.start(t); o.stop(t+dur+0.05); }); },
  start(){
    if(this.timer||!S.musicOn) return;
    const bar=()=>{
      if(!S.musicOn || !A || !A.hub || !A.hub.slumMusic){ this.stop(); return; }
      const c=SFX.ac(); if(!c) return;
      this.out(c);
      const t0=c.currentTime+0.05, e=this.B/2, ci=this.step%4, root=this.roots[ci], ch=this.chords[ci];
      const lead=Math.floor(this.step/4)%2===1;
      for(let k=0;k<8;k++){
        const t=t0+k*e;
        if(k===0||k===3||k===4||k===6) this.kick(c,t,0.24);
        if(k===2||k===6) this.snare(c,t,0.11);
        this.hiss(c,t,0.022,0.035,'highpass',7000);
        this.bass(c,t,(k===2||k===6)?root*2:root,e*0.9,0.06);   // the gallop
      }
      if(this.step%2===0) this.clang(c,t0,0.05);
      this.stab(c,t0,ch,0.035); this.stab(c,t0+e*3,ch,0.03);
      this.choir(c,t0,ch,this.B*4,0.02);
      if(lead) this.lead[ci].forEach((fr,k)=>{ if(fr) this.tone(c,t0+k*e,fr,e*0.95,0.03); });
      this.step++;
    };
    bar(); this.timer=setInterval(bar, this.B*4*1000);
  },
  stop(){ if(this.timer){ clearInterval(this.timer); this.timer=null; } }
};
// ── The Hangar: the Mech Boar's war theme ──
// Everything the slum groove is not: 170bpm, E Phrygian (the F a half step above E is the
// menace), double-kick sixteenths, palm-muted chugs under open distorted power chords, a full
// choir an octave up, timpani and a crash on every round. The 4th bar goes to Bb, a tritone
// from E, before it falls back. The lead never stops; under half HP it doubles an octave up,
// the snare goes to blast beats, and while the third eye charges a riser climbs under it.
// Before the machine wakes there is only a heartbeat, a drone and a choir breathing in.
const MECH_MUSIC=Object.assign(Object.create(SLUM_MUSIC),{
  timer:null, step:0, bus:null, noise:null, curve:null, gain:0.30,
  B:60/170,
  roots:[82.41, 82.41, 87.31, 116.54],             // E · E · F · Bb (power-chord roots)
  chords:[                                         // choir, an octave above the guitars
    [329.63,392.00,493.88],                        // Em
    [329.63,392.00,493.88],                        // Em
    [349.23,440.00,523.25],                        // F
    [293.66,349.23,466.16],                        // Bb
  ],
  lead:[                                           // sixteenth-note grid, 0 = rest/hold
    [659.25,0,0,0, 698.46,0,659.25,0, 587.33,0,0,0, 659.25,0,0,0],
    [783.99,0,0,0, 698.46,0,659.25,0, 698.46,0,587.33,0, 523.25,0,0,0],
    [698.46,0,0,0, 659.25,0,698.46,0, 783.99,0,0,0, 880.00,0,0,0],
    [932.33,0,0,0, 880.00,0,783.99,0, 698.46,0,659.25,0, 622.25,0,587.33,0],
  ],
  // distorted power chord: root, fifth, octave through hard fuzz. `mute` = palm-muted chug
  power(c,t,fr,dur,v,mute){
    const ws=c.createWaveShaper(), f=c.createBiquadFilter(), g=this.env(c,t,v,0.004,dur);
    if(!this.fuzz){ const n=1024, cv=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; cv[i]=Math.tanh(x*9); } this.fuzz=cv; }
    ws.curve=this.fuzz; f.type='lowpass'; f.frequency.value=mute?700:2600; f.Q.value=mute?2:0.8;
    ws.connect(f); f.connect(g); g.connect(this.out(c));
    [1,1.5,2].forEach((m,i)=>[0.997,1.003].forEach(d=>{ const o=c.createOscillator(); o.type='sawtooth';
      o.frequency.value=fr*m*d; o.connect(ws); o.start(t); o.stop(t+dur+0.05); }));
  },
  crash(c,t,v){ this.hiss(c,t,v,1.4,'highpass',5000); this.hiss(c,t,v*0.6,0.6,'bandpass',9000,1.5); },
  timpani(c,t,fr,v){ const o=c.createOscillator(), g=this.env(c,t,v,0.006,0.9);
    o.type='sine'; o.frequency.setValueAtTime(fr*1.6,t); o.frequency.exponentialRampToValueAtTime(fr,t+0.08);
    o.connect(g); g.connect(this.out(c)); o.start(t); o.stop(t+1); },
  riser(c,t,dur,v){ const s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
    s.buffer=this.noise; s.loop=true; f.type='bandpass'; f.Q.value=4;
    f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(7000,t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+dur*0.95); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f); f.connect(g); g.connect(this.out(c)); s.start(t); s.stop(t+dur+0.05); },
  lead2(c,t,fr,dur,v){                             // a screaming saw lead with vibrato
    const f=c.createBiquadFilter(), g=this.env(c,t,v,0.012,dur), lfo=c.createOscillator(), lg=c.createGain();
    f.type='lowpass'; f.frequency.value=4200; lfo.frequency.value=6; lg.gain.value=fr*0.012;
    lfo.connect(lg); f.connect(g); g.connect(this.out(c));
    [1,1.007].forEach(m=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr*m;
      lg.connect(o.frequency); o.connect(f); o.start(t); o.stop(t+dur+0.05); });
    lfo.start(t); lfo.stop(t+dur+0.05); },
  start(){
    if(this.timer||!S.musicOn) return;
    const bar=()=>{
      const b=HUB.boss;
      if(!S.musicOn || !A || !A.hub || !A.hub.mechboar || !b || b.defeated){ this.stop(); return; }
      const c=SFX.ac(); if(!c) return;
      this.out(c);
      const t0=c.currentTime+0.05, x=this.B/4, bl=this.B*4, ci=this.step%4, root=this.roots[ci], ch=this.chords[ci];
      if(b.stage==='idle'){                        // asleep: a heartbeat, a drone, a choir breathing in
        this.woke=false;
        this.kick(c,t0,0.16); this.kick(c,t0+this.B*0.45,0.10);
        this.kick(c,t0+this.B*2,0.16); this.kick(c,t0+this.B*2.45,0.10);
        this.bass(c,t0,41.2,bl,0.05);
        this.choir(c,t0,[164.81,174.61],bl,0.016);  // E against F: it is not resting
        this.step++; return;
      }
      if(b.stage==='wake'){                        // the hit when its eye comes on, then it hums and waits
        if(!this.woke){ this.woke=true;
          this.crash(c,t0,0.09); this.timpani(c,t0,82.41,0.3); this.power(c,t0,82.41,bl,0.05,false);
          this.choir(c,t0,this.chords[0],bl,0.03); this.riser(c,t0,bl,0.05); }
        else { this.kick(c,t0,0.14); this.kick(c,t0+this.B*2,0.14); this.power(c,t0,82.41,bl*0.9,0.025,true);
          this.choir(c,t0,[329.63,349.23],bl,0.02); }
        this.step=0; return;
      }
      const hot=!!b.phase2;
      if(ci===0){ this.crash(c,t0,0.08); this.timpani(c,t0,82.41,0.28); }
      if(b.state==='special') this.riser(c,t0,bl,0.06);
      const accents=[0,3,6,10,12];                 // where the open chords ring over the chug
      for(let k=0;k<16;k++){
        const t=t0+k*x;
        this.kick(c,t,k%4===0?0.26:0.14);          // double kick, every sixteenth
        if(k===4||k===12) this.snare(c,t,0.13);
        if(hot && k%2===0 && k!==4 && k!==12) this.snare(c,t,0.06);   // blast
        if(k%2===0) this.hiss(c,t,0.02,0.03,'highpass',8000);
        if(accents.includes(k)) this.power(c,t,root,x*(k===12?4:2.6),0.05,false);
        else this.power(c,t,root,x*0.7,0.03,true);
      }
      this.choir(c,t0,ch,bl,0.034);
      this.stab(c,t0,ch.map(f=>f/2),0.04);
      if(ci===3) this.timpani(c,t0+x*12,58.27,0.22);
      const L=this.lead[ci];
      L.forEach((fr,k)=>{ if(!fr) return;
        let n=1; while(k+n<16 && !L[k+n]) n++;     // hold through the rests
        this.lead2(c,t0+k*x,fr,x*n*0.95,0.026);
        if(hot) this.lead2(c,t0+k*x,fr*2,x*n*0.95,0.016);   // the octave doubling
      });
      this.step++;
    };
    bar(); this.timer=setInterval(bar, this.B*4*1000);
  },
  // the last note: crash, timpani and a power chord left to ring out, then the room goes quiet
  finale(){
    this.stop(); if(!S.musicOn) return; const c=SFX.ac(); if(!c) return;
    const t=c.currentTime+0.05; this.out(c);
    this.crash(c,t,0.1); this.timpani(c,t,82.41,0.32); this.clang(c,t,0.06);
    this.power(c,t,82.41,3.4,0.06,false); this.choir(c,t,this.chords[0],3.8,0.03);
  }
});

// ── Queen Seby's Lair: the Ancient One's theme ──
// Crystal and ceremony, not machinery: D harmonic minor at 104bpm, Dm · Bb · Gm · A — the A
// major is what makes it sound old. Glass bells run arpeggios high over a choir and a low drone,
// with timpani on a slow "ta-dum" like a court drum. A royal melody walks in every other round.
// Before she stirs only the drone and a few bells; enraged, the bells double, a snare joins, the
// melody never stops and doubles an octave up, and every round opens on a crystal cracking.
const SEBY_MUSIC=Object.assign(Object.create(MECH_MUSIC),{
  timer:null, step:0, bus:null, noise:null, curve:null, fuzz:null, gain:0.32,
  B:60/104,
  roots:[73.42, 58.27, 49.00, 55.00],                // D · Bb · G · A (drone)
  chords:[
    [146.83,174.61,220.00],                          // Dm
    [116.54,146.83,174.61],                          // Bb
    [98.00,116.54,146.83],                           // Gm
    [110.00,138.59,164.81],                          // A
  ],
  melody:[                                           // quarter notes, 0 = hold
    [440.00,0,349.23,329.63],
    [587.33,0,523.25,466.16],
    [466.16,440.00,392.00,0],
    [554.37,0,659.25,440.00],
  ],
  // a glass bell: a sine and its inharmonic glass partial, struck and left to ring
  bell(c,t,fr,dur,v){
    const g1=this.env(c,t,v,0.004,dur), g2=this.env(c,t,v*0.3,0.003,dur*0.45);
    g1.connect(this.out(c)); g2.connect(this.out(c));
    const o1=c.createOscillator(), o2=c.createOscillator(); o1.type='sine'; o2.type='sine';
    o1.frequency.value=fr; o2.frequency.value=fr*2.76;
    o1.connect(g1); o2.connect(g2); o1.start(t); o2.start(t); o1.stop(t+dur+0.05); o2.stop(t+dur+0.05);
  },
  start(){
    if(this.timer||!S.musicOn) return;
    const bar=()=>{
      const b=HUB.boss;
      if(!S.musicOn || !A || !A.hub || !A.hub.sebyMusic || !b || b.defeated){ this.stop(); return; }
      const c=SFX.ac(); if(!c) return;
      this.out(c);
      const t0=c.currentTime+0.05, x=this.B/4, bl=this.B*4, ci=this.step%4, root=this.roots[ci], ch=this.chords[ci];
      const arp=[ch[0]*4, ch[1]*4, ch[2]*4, ch[0]*8];  // the bells, two octaves up
      if(!b.introShown){                               // asleep in the circle: drone and a few bells
        this.bass(c,t0,root,bl,0.05); this.choir(c,t0,ch,bl,0.024);
        [0,6,11].forEach((k,i)=>this.bell(c,t0+k*x,arp[(this.step+i)%4],1.6,0.032));
        this.step++; return;
      }
      const hot=!!b.phase2;
      if(ci===0){ if(hot) this.clang(c,t0,0.04); else this.bell(c,t0,arp[3]*2,2.4,0.03); }   // a crystal cracks / chimes
      this.bass(c,t0,root,bl*0.95,0.045);
      this.choir(c,t0,ch,bl,0.03);
      this.timpani(c,t0,root*2,0.24); this.timpani(c,t0+x*6,root*2,0.16);                  // ta — dum
      this.timpani(c,t0+x*8,root*2,0.2);
      if(hot){ this.timpani(c,t0+x*12,root*2,0.16); this.timpani(c,t0+x*14,root*2,0.12);
               this.snare(c,t0+x*4,0.08); this.snare(c,t0+x*12,0.08); }
      for(let k=0;k<16;k+=(hot?1:2)){                                                        // the crystal run
        const seq=[0,1,2,3,2,1,0,1], f=arp[seq[(k/(hot?1:2))%8|0]];
        this.bell(c,t0+k*x, f, hot?0.5:0.8, hot?0.016:0.022);
        if(k%4===2) this.hiss(c,t0+k*x,0.012,0.03,'highpass',9000);
      }
      if(hot || Math.floor(this.step/4)%2===1){                                              // the queen's melody
        const M=this.melody[ci];
        M.forEach((fr,k)=>{ if(!fr) return; let n=1; while(k+n<4 && !M[k+n]) n++;
          this.lead2(c,t0+k*this.B, fr, this.B*n*0.95, 0.018);
          if(hot) this.lead2(c,t0+k*this.B, fr*2, this.B*n*0.95, 0.010); });
      }
      this.step++;
    };
    bar(); this.timer=setInterval(bar, this.B*4*1000);
  },
  // she falls: the bells come down the scale, the choir holds, one last drum
  finale(){
    this.stop(); if(!S.musicOn) return; const c=SFX.ac(); if(!c) return;
    const t=c.currentTime+0.05; this.out(c);
    [1760,1318.5,1174.66,880,698.46,587.33,440].forEach((f,i)=>this.bell(c,t+i*0.16,f,2.2,0.03));
    this.timpani(c,t,73.42*2,0.3); this.choir(c,t,this.chords[0],3.8,0.03); this.bass(c,t,73.42,3.2,0.05);
  }
});

// ── The Throne Hall: the Cat King's battle theme ──
// A royal war march, not a lullaby: D minor at 138bpm, Dm · Bb · C · A — the A major pulls it
// back to D every round. Strings saw a sixteenth-note ostinato underneath, timpani gallop,
// low brass hits the accents, a full choir, and horns carry a heroic tune doubled at the octave.
// The lion being summoned is a swell; the lion cracking is one great hit. When the King has to
// fight himself it turns frantic: strings doubled, snare on every eighth, the tune high and fast.
const CAT_MUSIC=Object.assign(Object.create(SEBY_MUSIC),{
  timer:null, step:0, bus:null, noise:null, curve:null, fuzz:null, gain:0.20,   // dense: kept under the Hangar's theme
  B:60/138,
  roots:[73.42, 58.27, 65.41, 55.00],                // D · Bb · C · A
  chords:[
    [146.83,174.61,220.00],                          // Dm
    [116.54,146.83,174.61],                          // Bb
    [130.81,164.81,196.00],                          // C
    [110.00,138.59,164.81],                          // A
  ],
  theme:[                                            // eighth notes, 0 = hold
    [587.33,0,587.33,698.46, 880.00,0,783.99,698.46],
    [698.46,0,587.33,0,      466.16,0,523.25,587.33],
    [659.25,0,523.25,659.25, 783.99,0,698.46,659.25],
    [659.25,0,554.37,0,      440.00,0,0,0],
  ],
  // staccato strings: three detuned saws, bright, short
  strings(c,t,fr,dur,v){ const f=c.createBiquadFilter(), g=this.env(c,t,v,0.006,dur); f.type='lowpass'; f.frequency.value=2400;
    f.connect(g); g.connect(this.out(c));
    [0.995,1,1.006].forEach(m=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr*m; o.connect(f); o.start(t); o.stop(t+dur+0.05); }); },
  // a warm horn: saw + square, darker filter, a little swell into the note
  horn(c,t,fr,dur,v){ const f=c.createBiquadFilter(), g=c.createGain(); f.type='lowpass';
    f.frequency.setValueAtTime(700,t); f.frequency.linearRampToValueAtTime(1700,t+Math.min(0.12,dur*0.5));
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.04); g.gain.setValueAtTime(v,t+dur*0.8); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    f.connect(g); g.connect(this.out(c));
    [['sawtooth',1],['square',1.004],['sawtooth',0.5]].forEach(([ty,m])=>{ const o=c.createOscillator(); o.type=ty; o.frequency.value=fr*m; o.connect(f); o.start(t); o.stop(t+dur+0.05); }); },
  start(){
    if(this.timer||!S.musicOn) return;
    const bar=()=>{
      const b=HUB.boss;
      if(!S.musicOn || !A || !A.hub || !A.hub.catMusic || !b || b.defeated){ this.stop(); return; }
      const c=SFX.ac(); if(!c) return;
      this.out(c);
      const t0=c.currentTime+0.05, e=this.B/2, x=this.B/4, bl=this.B*4, ci=this.step%4, root=this.roots[ci], ch=this.chords[ci];
      const Th=this.theme[ci];
      const line=(mult,fn)=>Th.forEach((fr,k)=>{ if(!fr) return; let n=1; while(k+n<8 && !Th[k+n]) n++; fn(t0+k*e, fr*mult, e*n); });
      const ost=[root*2, root*3, root*4, root*3];                // the string figure
      if(b.stage==='idle'){                                      // the hall, waiting: a drone, a choir, a far drum
        this.bass(c,t0,root,bl,0.05); this.choir(c,t0,ch,bl,0.03);
        this.timpani(c,t0,root*2,0.14); this.timpani(c,t0+this.B*2.5,root*2,0.1);
        this.step++; return;
      }
      if(b.stage==='summon'){                                    // the lion condensing: a swell
        this.riser(c,t0,bl,0.07); this.choir(c,t0,ch,bl,0.04); this.bass(c,t0,root,bl,0.05);
        for(let k=0;k<16;k++) this.timpani(c,t0+k*x,root*2,0.05+k*0.012);
        this.step++; return;
      }
      if(b.stage==='crack'){                                     // the lion breaking: one great hit, held
        this.crash(c,t0,0.1); this.timpani(c,t0,root*2,0.34); this.stab(c,t0,ch.map(f=>f/2),0.06);
        this.choir(c,t0,ch,bl,0.045); this.bass(c,t0,root,bl,0.06);
        this.step++; return;
      }
      const frantic = b.stage==='cat';
      // strings ostinato
      for(let k=0;k<16;k++){ this.strings(c,t0+k*x, ost[k%4], x*0.6, frantic?0.022:0.018);
        if(frantic) this.strings(c,t0+k*x, ost[k%4]*2, x*0.5, 0.012); }
      // drums: gallop timpani, kick on the beat, snare on 2 & 4 (every eighth when frantic)
      [0,3,4,8,11,12].forEach(k=>this.timpani(c,t0+k*x,root*2,k%4===0?0.24:0.15));
      if(frantic) for(let k=1;k<16;k+=2) this.timpani(c,t0+k*x,root*2,0.1);
      for(let k=0;k<4;k++) this.kick(c,t0+k*this.B,0.2);
      if(frantic) for(let k=0;k<8;k++) this.snare(c,t0+k*e,k%2?0.05:0.09);
      else { this.snare(c,t0+this.B,0.1); this.snare(c,t0+this.B*3,0.1); }
      if(ci===0 || (!frantic && ci===2)) this.crash(c,t0,0.07);
      this.bass(c,t0,root,bl*0.95,0.055);
      if(!frantic){ this.stab(c,t0,ch.map(f=>f/2),0.05); this.stab(c,t0+e*3,ch.map(f=>f/2),0.04);   // low brass
                    this.choir(c,t0,ch,bl,0.04); }
      // the tune: horns doubled at the octave — or, when frantic, the same tune high and biting
      if(frantic) line(2,(t,f,d)=>this.lead2(c,t,f,d*0.9,0.022));
      else line(1,(t,f,d)=>{ this.horn(c,t,f,d*0.95,0.034); this.horn(c,t,f/2,d*0.95,0.022); });
      this.step++;
    };
    bar(); this.timer=setInterval(bar, this.B*4*1000);
  },
  // asleep in the big chair: the horns sag down three notes, a last drum, the choir lets go
  finale(){
    this.stop(); if(!S.musicOn) return; const c=SFX.ac(); if(!c) return;
    const t=c.currentTime+0.05; this.out(c);
    [[587.33,0],[523.25,0.5],[440.00,1.0]].forEach(([f,dt])=>{ this.horn(c,t+dt,f,0.48,0.032); this.horn(c,t+dt,f/2,0.48,0.02); });
    this.timpani(c,t+1.0,73.42*2,0.26); this.choir(c,t+1.0,this.chords[0],3.4,0.035); this.bass(c,t+1.0,73.42,3.0,0.05);
  }
});


// ── the shuffle: a few minutes of one theme, then another (never the same twice in a row) ──
const Jukebox = {
  tracks: [
    { name: 'The Slums', m: SLUM_MUSIC, hot: false },
    { name: 'The Slums', m: SLUM_MUSIC, hot: false },        // the street groove comes up twice as often
    { name: 'The Hangar', m: MECH_MUSIC, hot: true },
    { name: "Queen Seby's Lair", m: SEBY_MUSIC, hot: false },
    { name: 'The Throne Hall', m: CAT_MUSIC, hot: false },
    { name: 'The Dreamer in the Deep', m: BOSS_MUSIC, hot: false },
  ],
  cur: null, timer: null,
  play() { if (!S.musicOn) return; this.next(); },
  // a theme has its next bar already scheduled when it is stopped; fade its bus out so the
  // tail does not run over the next one, and only bring the next one in once it is quiet
  fadeOut(m) { m.stop(); const c = SFX.ctx; if (!c || !m.bus) return;
    const g = m.bus.gain, t = c.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.linearRampToValueAtTime(0.0001, t + 1.2); },
  fadeIn(m) { const c = SFX.ctx; if (!c || !m.bus) return; const g = m.bus.gain, t = c.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(m.gain, t); },
  next() {
    const prev = this.cur; if (prev) this.fadeOut(prev.m);
    const opts = this.tracks.filter(t => !prev || t.m !== prev.m);
    const t = opts[(Math.random() * opts.length) | 0]; this.cur = t;
    // some rounds of the boss themes come in at full fury
    HUB.boss.phase2 = t.hot && Math.random() < 0.5; HUB.abyss.headHp = Math.random() < 0.4 ? 0.3 : 1;
    clearTimeout(this.timer); clearTimeout(this.inT);
    this.inT = setTimeout(() => { if (this.cur !== t || !S.musicOn) return; for (const o of this.tracks) if (o.m !== t.m) o.m.stop();
      t.m.step = 0; this.fadeIn(t.m); t.m.start(); }, prev ? 1600 : 0);
    this.timer = setTimeout(() => this.next(), (100 + Math.random() * 80) * 1000);
  },
  stop() { clearTimeout(this.timer); clearTimeout(this.inT); this.timer = null; for (const o of this.tracks) this.fadeOut(o.m); this.cur = null; },
  toggle() { S.musicOn = !S.musicOn; if (S.musicOn) this.play(); else this.stop(); return S.musicOn; },
};
