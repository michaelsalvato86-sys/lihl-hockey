'use strict';
// Goalie behaviour: arc positioning, reaction delay, speed/accel bound, post hugging, save type vs height, butterfly recovery, rating separation.
const vm = require('vm'); const { createSim } = require('./sim_host');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('FAIL: ' + m); } else console.log('ok: ' + m); };
function fresh() { const s = createSim(); s.start({ home: 0, away: 3, plen: 180 }); for (let i = 0; i < 5; i++) s.tick(); return s; }
const R = (s, code) => vm.runInContext(code, s.ctx);
function isolate(s) { R(s, 'G.pause=0;G.fo=null;puck.owner=null;puck.shot=null;puck.vx=0;puck.vy=0;for(const t of [H1,A1])for(const p of onIce(t)){p.x=W/2;p.y=5;p.vx=0;p.vy=0;p.act=null}'); }

// 1 arc: goalie moves toward the puck side but stays inside the posts, depth from distance
{ const s = fresh(); isolate(s);
  const r = JSON.parse(R(s, `(function(){const t=H1,g=t.goalie;const out=[];for(const yo of [-14,-6,0,6,14]){g.y=MY;puck.x=t.ownGX+t.dir*50;puck.y=MY+yo;puck.vx=0;puck.vy=0;puck.owner=null;puck.shot=null;for(let i=0;i<60;i++){step(1/30);puck.x=t.ownGX+t.dir*50;puck.y=MY+yo;puck.vx=0;puck.vy=0;for(const q of onIce(A1)){q.x=W/2;q.y=5}for(const q of onIce(H1)){q.x=W/2;q.y=5}}out.push([yo,g.y-MY,Math.abs(g.x-t.ownGX)])}return JSON.stringify(out)})()`));
  ok(r.every(([yo, gy]) => Math.abs(gy) <= 4.45), 'goalie stays inside posts on the arc');
  ok(r[4][1] > r[3][1] && r[3][1] > 0.3 && r[0][1] < r[1][1] && r[1][1] < -0.3 && Math.abs(r[2][1]) < 0.5, 'goalie shades toward puck side, monotonic');
  ok(r.every(([, , d]) => d > 3 && d < 5), 'goalie depth in 3..5 units off the line'); }
// 2 post: low angle shot hugs the near post
{ const s = fresh(); isolate(s);
  const gy = +R(s, `(function(){const t=H1,g=t.goalie;g.y=MY;for(let i=0;i<90;i++){step(1/30);puck.x=t.ownGX+t.dir*8;puck.y=MY+20;puck.vx=0;puck.vy=0;puck.owner=null;puck.shot=null;for(const q of [...onIce(H1),...onIce(A1)]){q.x=W/2;q.y=5}}return g.y-MY})()`);
  ok(gy > 3.7 && gy <= 4.45, 'low-angle shot: goalie hugs near post (' + gy.toFixed(2) + ')'); }
// 3 reaction delay on a new shot >= 0.1 s, rating scaled
{ const s = fresh(); isolate(s);
  let r = JSON.parse(R(s, `(function(){const t=H1,g=t.goalie,o=[];for(const gl of [.38,.78]){g.gl=gl;puck.sid=(puck.sid||0)+1;puck.shot=A1.roster[0];puck.x=t.ownGX+t.dir*40;puck.y=MY;puck.vx=-t.dir*90;puck.vy=0;goalieStep(t,1/30);o.push(g.react)}puck.shot=null;return JSON.stringify(o)})()`));
  r = r.map(x => x + 1 / 30); ok(r[0] >= 0.0999 && r[1] >= 0.0999, 'reaction delay >= 0.1 s (' + r.map(x => x.toFixed(3)) + ')'); ok(r[0] > r[1], 'worse goalie reacts slower'); }
// 4 speed + accel bound over real play
{ const s = fresh(); let pPa = false, maxV = 0, maxA = 0, pv = [0, 0], teleport = 0, py = null;
  for (let i = 0; i < 30 * 240 && !s.over(); i++) { const o = JSON.parse(s.tick()); const reset = o.s.pa > 0 || pPa; pPa = o.s.pa > 0; const g = [o.s.t[0].g[1], o.s.t[1].g[1]]; if (py && !reset) for (let k = 0; k < 2; k++) { const v = Math.abs(g[k] - py[k]) * 30; maxV = Math.max(maxV, v); if (Math.abs(g[k] - py[k]) > 1.6) teleport++; } py = g; }
  ok(maxV <= 48 && teleport === 0, 'max goalie speed ' + maxV.toFixed(1) + ' u/s <= 48, no teleports (' + teleport + ')'); }
// 5 save type vs height, butterfly recovery
{ const s = fresh(); isolate(s);
  const r = JSON.parse(R(s, `(function(){const t=H1,g=t.goalie,res={lo:{},hi:{}},rec=[];const sh=A1.roster[0];
   for(const [key,z] of [['lo',.1],['hi',1.4]])for(let n=0;n<160;n++){puck.sid=(puck.sid||0)+7;g.sid=puck.sid;g.react=0;g.recov=0;g.y=MY+((n%5)-2)*.5;puck.z=z;puck.vz=0;puck.shot=sh;puck.sd=25;puck.sy=MY;puck.ss=110;puck.x=t.ownGX+t.dir*.3;puck.y=g.y+((n%3)-1)*.4;puck.vx=-t.dir*90;puck.vy=0;puck.cool=0;const sv=G.saves[0];EVQ.length=0;step(1/30);const e=EVQ.find(x=>x.e==='ae'&&x.k==='save');if(e){res[key][e.d.kind]=(res[key][e.d.kind]||0)+1;if(e.d.kind==='butterfly'||e.d.kind==='pad')rec.push(g.recov)}puck.owner=null;G.pause=0;G.fo=null}
   puck.z=0;return JSON.stringify({res,rec})})()`));
  const lo = r.res.lo, hi = r.res.hi; const n = o => Object.values(o).reduce((a, b) => a + b, 0);
  const lowLow = ((lo.butterfly || 0) + (lo.pad || 0)) / Math.max(1, n(lo)), hiHigh = ((hi.glove || 0) + (hi.blocker || 0)) / Math.max(1, n(hi));
  ok(n(lo) > 20 && n(hi) > 20, 'saves recorded lo=' + n(lo) + ' hi=' + n(hi)); ok(lowLow > 0.95, 'low shots -> butterfly/pad ' + JSON.stringify(lo)); ok(hiHigh > 0.85, 'high shots -> glove/blocker ' + JSON.stringify(hi));
  ok(r.rec.length > 0 && r.rec.every(x => x >= 0.4), 'butterfly/pad recovery penalty >= 0.4 s (' + r.rec.length + ' samples)'); }
// 6 rating separation: better goalie saves more
{ const s = fresh(); isolate(s);
  const r = JSON.parse(R(s, `(function(){const t=H1,g=t.goalie,sh=A1.roster[0],o=[];for(const gl of [.38,.78]){g.gl=gl;let sv=0,N=600;for(let n=0;n<N;n++){puck.sid=(puck.sid||0)+7;g.sid=puck.sid;g.react=0;g.recov=0;g.y=MY+(n%7-3)*.9;puck.z=0;puck.shot=sh;sh.shot=.5;puck.sd=22;puck.sy=MY+(n%9-4)*1.2;puck.ss=110;puck.x=t.ownGX+t.dir*.3;puck.y=MY+(n%9-4)*1.1;puck.vx=-t.dir*90;puck.vy=0;puck.cool=0;const a=G.saves[0];step(1/30);if(G.saves[0]>a)sv++;puck.owner=null;G.pause=0;G.fo=null}o.push(sv/N)}return JSON.stringify(o)})()`));
  ok(r[1] > r[0] + 0.03, 'goalie rating separates save pct ' + r.map(x => x.toFixed(3))); }
console.log(fails ? 'goalie tests FAILED' : 'goalie tests pass'); process.exit(fails ? 1 : 0);
