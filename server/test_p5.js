'use strict';
// Mega Pass 5 situational tests. Each scenario prints a measured result; --assert fails on a violated expectation.
const { createSim } = require('./sim_host'); const vm = require('vm');
const ev = (s, c) => vm.runInContext(c, s.ctx);
let fails = 0; const ck = (n, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + ' ' + (d || '')); if (!ok) fails++; };
// 1. subs integrity: no missing, duplicated or invisible skaters over 26 games
let bad = 0, samples = 0;
for (let k = 0; k < 26; k++) {
  const s = createSim(); s.start({ home: k, away: (k + 9) % 26, plen: 120 });
  for (let i = 0; i < 30 * 400 && !s.over(); i++) {
    s.tick(); if (i % 15) continue;
    const r = JSON.parse(ev(s, `JSON.stringify([H1,A1].map(t=>{const L=onIce(t);return{n:L.length,u:new Set(L).size,off:L.filter(p=>!p.on).length,ex:act(t).length,nu:t.needUnit,pz:G.pause>0,ld:!!t.seats.LD,rd:!!t.seats.RD}}))`));
    for (const t of r) { samples++; if (!t.nu && (t.n !== t.ex || t.u !== t.n || t.off || !t.ld || !t.rd)) bad++; }
  }
}
ck('subs integrity (no missing/duplicate/invisible skaters)', bad / samples < 0.002, bad + '/' + samples);
// 2. posture: trailing late pushes harder than leading late
const s2 = createSim(); s2.start({ home: 0, away: 9, plen: 120 });
ev(s2, 'G.period=3;G.clock=G.plen*.2;G.score=[0,2]');
const a = ev(s2, '[posture(H1),posture(A1),fcMode(H1),fcMode(A1)]');
ck('late trailing = aggressive forecheck, leading = conservative', a[0] === 1 && a[1] === -1 && a[2] === 'agg' && a[3] === 'cons', JSON.stringify(a));
// 3. shot selection: a blocked far shot has lower quality than a clear slot shot
const s3 = createSim(); s3.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 90; i++) s3.tick();
const q = ev(s3, `(()=>{const p=H1.seats.C,t=H1;p.x=t.oppGX-t.dir*20;p.y=MY;const near=shotQ(p,20,52);p.x=t.oppGX-t.dir*50;p.y=14;const far=shotQ(p,hyp(t.oppGX-p.x,MY-p.y),52);return[near,far]})()`);
ck('slot shot quality > wide point shot quality', q[0] > q[1] + .15, JSON.stringify(q.map(x => +x.toFixed(2))));
// 4. faceoff draws are contests (not always the same team, some scrambles)
const s4 = createSim(); let w = [0, 0, 0];
for (let i = 0; i < 200; i++) { s4.start({ home: 0, away: 9, plen: 120 }); for (let j = 0; j < 150; j++) s4.tick(); const r = ev(s4, '[puck.owner?puck.owner.team===H1?0:1:2]'); w[r[0]]++; }
ck('faceoff outcomes mixed', w[0] > 25 && w[1] > 25, JSON.stringify(w));
// 5. defensive coverage: with the puck carried by the away team, a non-pressing home defender goes goal-side of a dangerous opponent
const s5 = createSim(); s5.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 60; i++) s5.tick();
const c = ev(s5, `(()=>{const t=H1,o=A1;const own=o.seats.C;puck.owner=own;own.x=t.ownGX-t.dir*40;own.y=MY;const q=o.seats.LW;q.x=t.ownGX-t.dir*18;q.y=MY+10;t.rank=new Map(onIce(t).map((p,i)=>[p,i]));let moved=0;for(const p of onIce(t)){if(t.rank.get(p)>1){cover(p);if(p.dvx||p.dvy)moved++}}return moved})()`);
ck('non-pressing defenders move to cover', c >= 1, String(c));

// 6. play statistics over several full games: breakouts, support, shot vs pass choice, battles, rebounds, line changes
{ let outlets = 0, shots = 0, offPass = 0, battles = 0, saves = 0, rebShots = 0, chg = 0, supD = [], wingD = [], blueBad = 0, blueN = 0, sec = 0, games = 6;
  for (let k = 0; k < games; k++) {
    const s = createSim(); s.start({ home: k * 3, away: k * 3 + 7, plen: 150 }); let lastSave = -9;
    for (let i = 0; i < 30 * 450 && !s.over(); i++) {
      const o = JSON.parse(s.tick()); sec += 1 / 30;
      for (const e of o.ev) { if (e.e === 'ae' && e.k === 'pass') { const d = JSON.parse(ev(s, `(()=>{const p=puck.last;return JSON.stringify(p?{x:p.x,own:p.team.ownGX,dir:p.team.dir,sl:p.slot}:{})})()`)); if (d.sl && (d.sl === 'LD' || d.sl === 'RD') && Math.abs(d.x - d.own) < 45) outlets++; else offPass++; } else if (e.e === 'ae' && e.k === 'shot') { shots++; if (sec - lastSave < 2) rebShots++; } else if (e.e === 'ae' && e.k === 'save') { saves++; lastSave = sec; } }
      if (i % 30 === 0) { const r = JSON.parse(ev(s, `(()=>{const out=[];const t=puck.owner&&puck.owner.team;if(!t)return JSON.stringify(out);const c=t.seats.C,cr=puck.owner;const inO=t.dir*(puck.x-t.oppGX)>-62;if(inO){for(const sl of ['LW','RW']){const w=t.seats[sl];if(w&&w!==cr){let m=99;for(const q of onIce(t.opp))m=Math.min(m,hyp(q.x-w.x,q.y-w.y));out.push(['w',m])}}if(c&&c!==cr)out.push(['c',hyp(c.x-cr.x,c.y-cr.y)]);for(const sl of ['LD','RD']){const d=t.seats[sl];if(d&&d!==cr)out.push(['d',t.dir*(d.x-125*(t.dir>0?1:0)-75*(t.dir>0?0:1))])}}return JSON.stringify(out)})()`)); for (const [k2, v] of r) { if (k2 === 'w') wingD.push(v); else if (k2 === 'c') supD.push(v); else { blueN++; if (v > 6) blueBad++; } } }
    }
    battles += +ev(s, 'G.battles||0'); chg += +ev(s, 'G.lineChanges||0');
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  ck('defensemen make outlet passes from their zone', outlets / games > 3, (outlets / games).toFixed(1) + ' per game');
  ck('AI passes in the offensive zone more than it shoots', offPass > shots * .6, 'passes ' + offPass + ' shots ' + shots);
  ck('winger space from nearest defender (offensive zone)', avg(wingD) > 6, avg(wingD).toFixed(1) + ' ft');
  ck('center supports the carrier in the offensive zone', avg(supD) < 45, avg(supD).toFixed(1) + ' ft');
  ck('defensemen stay at the blue line (offensive zone)', blueN === 0 || blueBad / blueN < .6, (blueBad / Math.max(1, blueN)).toFixed(2) + ' beyond 6 ft over');
  ck('contested puck and board battles occur', battles / games > 2, (battles / games).toFixed(1) + ' per game');
  ck('rebound shots follow saves', saves === 0 || rebShots / saves > .02, 'rebound shots ' + rebShots + ' of ' + saves + ' saves');
}
// 7. goalie follows a cross-crease pass before the shot, not before the pass
{ const s = createSim(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 90; i++) s.tick();
  const r = ev(s, `(()=>{const t=H1,g=t.goalie;puck.owner=null;puck.shot=null;const a=A1.seats.C;puck.last=a;puck.target=A1.seats.LW;puck.x=t.ownGX+t.dir*20;puck.y=MY-12;puck.vx=0;puck.vy=60;g.y=MY;const y0=g.y;for(let i=0;i<30;i++){puck.y+=2;puck.vy=60;step(1/60)}return[y0,g.y]})()`);
  ck('goalie tracks a pass across the crease', Math.abs(r[1] - r[0]) > .3, JSON.stringify(r.map(x => +x.toFixed(2)))); }
// 8. tired line changes at a sensible time, never in own danger zone with the puck (3 trials, random whistles can interfere)
{ let near = 0, far = 0; for (let k = 0; k < 3; k++) { const s = createSim(); s.start({ home: k, away: 9, plen: 150 }); for (let i = 0; i < 300; i++) s.tick();
  const r = ev(s, `(()=>{const t=H1;for(const q of onIce(t))q.st=.4;t.shiftT=20;t.needUnit=false;puck.owner=null;puck.x=t.ownGX+t.dir*20;const f0=onIce(t).map(p=>p.name).join();for(let i=0;i<120;i++)step(1/60);const nr=onIce(t).map(p=>p.name).join()===f0;puck.x=W/2;for(let i=0;i<300;i++)step(1/60);return[nr,onIce(t).map(p=>p.name).join()!==f0]})()`); near += r[0] ? 1 : 0; far += r[1] ? 1 : 0; }
  ck('tired line stays on in own zone, changes elsewhere', near >= 2 && far >= 2, near + '/3 stayed, ' + far + '/3 changed'); }
// 9. forecheck modes change how many players pressure the carrier
{ const s = createSim(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 90; i++) s.tick();
  const res = {}; for (const m of ['cons', 'std', 'agg', 'two']) res[m] = ev(s, `(()=>{const t=H1,o=A1;t.fcPref='${m}';G.score=[0,0];const own=o.seats.C;puck.owner=own;own.x=t.oppGX-t.dir*20;own.y=MY;puck.x=own.x;puck.y=own.y;t.rank=new Map(onIce(t).map((p,i)=>[p,i]));let n=0;for(const p of onIce(t)){p.dvx=p.dvy=0;aiPlayer(p,1/60);const dx=own.x-p.x,dy=own.y-p.y,d=hyp(dx,dy)||1;if((p.dvx*dx+p.dvy*dy)/d>.8)n++}return n})()`);
  ck('forecheck modes change pressure (agg or two > cons)', res.agg >= res.cons && res.two >= res.std && (res.agg + res.two) > (res.cons + res.std), JSON.stringify(res)); }
console.log(fails ? 'FAILED ' + fails : 'p5 tests pass'); process.exit(fails ? 1 : 0);
