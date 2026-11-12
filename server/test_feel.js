'use strict';
// Gameplay-feel regression: how often does a human pass find a receiver, and how many human shots are on target?
const vm = require('vm');
const { createSim } = require('./sim_host');
const sim = createSim();
const sum = sim.summary();
sim.start({ home: 0, away: 1, plen: 120 });
for (let i = 0; i < 90; i++) sim.tick();
const out = vm.runInContext(`(function(){
  const t=H1, p=onIce(t)[0]; for(const o of onIce(t.opp)){o.x=100;o.y=3;o.vx=o.vy=0}
  let ok=0,N=400,miss=0;
  for(let i=0;i<N;i++){
    p.x=60+Math.random()*80;p.y=15+Math.random()*55;p.fa=Math.random()*6.28;
    const mates=onIce(t).filter(m=>m!==p);let k=0;for(const m of mates){m.x=20+Math.random()*160;m.y=8+Math.random()*70;m.vx=m.vy=0;k++}
    const a=Math.random()*6.28,im=Math.random()<.35?0:1;
    puck.owner=p;const r=pass(p,Math.cos(a)*im,Math.sin(a)*im);if(r)ok++;else miss++;
  }
  const gx=t.oppGX,dir=t.dir;let on=0,M=600,tap=0;
  for(const pw of [.5,.9]){let o2=0;
   for(let i=0;i<M;i++){p.x=gx-dir*(30+Math.random()*50);p.y=42.5+(Math.random()-.5)*30;puck.owner=p;shoot(p,0,0,true,pw);
    if(puck.vx*dir>0){const tt=(gx-puck.x)/puck.vx,y=puck.y+puck.vy*tt;if(y>37.5&&y<47.5)o2++}}
   if(pw===.5)tap=o2/M;else on=o2/M}
  return {passFound:ok/N,passFail:miss/N,tapOnTarget:tap,hardOnTarget:on};
})()`, sim.ctx);
console.log(JSON.stringify(out));
if (process.argv.includes('--assert')) {
  if (out.passFail > 0.001) { console.error('FAIL: pass found no receiver'); process.exit(1); }
  if (out.tapOnTarget < 0.55 || out.tapOnTarget > 0.92) { console.error('FAIL: tap shots out of the 55-92% on-target band (misses must stay possible)', out.tapOnTarget); process.exit(1); }
  console.log('feel tests pass');
}
process.exit(0);
