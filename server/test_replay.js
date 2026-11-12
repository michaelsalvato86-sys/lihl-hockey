'use strict';
// Replay exactness: record a scripted goal offline (G.net=0), replay it, and compare per-frame state to the recording.
const vm = require('vm');
const { createSim } = require('./sim_host');
const sim = createSim();
sim.start({ home: 0, away: 1, plen: 120 });
const out = vm.runInContext(`(function(){
  G.net=0; G.humans=[]; G.attract=false;
  const fails=[]; let frames=0, compared=0;
  // run until the pre-goal buffer is full, then score a goal for H1 (shot from the slot into the net)
  for(let i=0;i<260;i++) step(1/30);
  const sh=onIce(H1)[0]; sh.x=H1.oppGX-H1.dir*30; sh.y=42.5; puck.owner=sh; puck.x=sh.x; puck.y=sh.y;
  for(let i=0;i<40;i++) step(1/30);
  puck.z=1.5; puck.vz=0;
  const need=G.rec.length; goal(H1, sh);
  if(!G.rpPend) return {err:'no rpPend after goal (rec='+need+')'};
  const fr=G.rpPend; let gk=0;
  // record a snapshot that includes a mutation of drive fields so they are not all zero
  const live=[...onIce(H1),...onIce(A1),H1.goalie,A1.goalie];
  startReplay();
  if(!G.rp) return {err:'replay did not start'};
  // scramble live state so any missed restoration/application shows up
  for(const p of live){p.x=-999;p.stp=7;p.ph=1;p.edge=.9}
  const n=fr.length;
  for(let i=0;i<n-1;i++){
    G.rp.t=(i+1e-6)*.05; tickReplay(0); frames++;
    const A=fr[i];
    if(Math.abs(puck.x-A.px)>1e-3||Math.abs(puck.y-A.py)>1e-3||Math.abs(puck.z-(A.pz||0))>1e-3) fails.push('puck@'+i);
    if(puck.owner!==A.po) fails.push('owner@'+i);
    const cur=G.rp.cur;
    if(cur.length!==A.pl.length) fails.push('count@'+i+' '+cur.length+' vs '+A.pl.length);
    for(const e of A.pl){ const p=e[0]; compared++;
      if(!cur.includes(p)) fails.push('missing@'+i);
      if(Math.abs(p.x-e[1])>1e-3||Math.abs(p.y-e[2])>1e-3) fails.push('pos@'+i);
      if(Math.abs(p.fa-e[5])>1e-3) fails.push('fa@'+i);
      if(Math.abs(p.stp-e[7])>1e-3||Math.abs(p.edge-e[8])>1e-3||Math.abs(p.ph-(e[9]%6.2832))>1e-3) fails.push('anim@'+i);
      if(!!p.spray!==!!e[10]) fails.push('spray@'+i);
    }
    // no extras: nothing outside cur is drawn (draw set == cur)
    const gl=A.pl.filter(e=>e[0].gl).length; if(gl!==2) fails.push('goalies@'+i+'='+gl);
    const sk=A.pl.length-gl; if(sk!==10) fails.push('skaters@'+i+'='+sk);
  }
  endReplay();
  return {frames,compared,fails:fails.slice(0,10),nfail:fails.length,live:live.length};
})()`, sim.ctx);
console.log(JSON.stringify(out));
if (out.err || out.nfail) { console.error('FAIL', out.err || out.fails); process.exit(1); }
if (out.frames < 50) { console.error('FAIL: too few frames'); process.exit(1); }
console.log('test_replay OK');
