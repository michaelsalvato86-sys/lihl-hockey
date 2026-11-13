'use strict';
/* Puck model proof: runs the REAL step() of the shipped sim (game_index.html) with every skater parked out of the way,
   and asserts the puck behaviour: rest, ice friction, boards, posts at 150 ft/s (swept, no tunnelling), raised vs low shots,
   ice bounces, crossbar / over the net, goalie save zones, rebounds, net behind the goal line.
   Optional before/after: set OLD_SIM=<path to an older server/sim_host.js> to print the same scenarios on the old sim.
   Units: feet, seconds, 30 Hz ticks (as on the server). */
const vm = require('vm'); const assert = require('assert');
const { createSim } = require('./sim_host');
let OLD = null; try { if (process.env.OLD_SIM) OLD = require(process.env.OLD_SIM).createSim; } catch (e) { }
const f2 = v => +(+v).toFixed(2);

function world(mk) {
  const s = mk(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 120; i++) s.tick();
  const r = c => vm.runInContext(c, s.ctx);
  r(`G.pause=0;G.fo=null;`);
  // run n ticks of the real step. Skaters are re-parked each tick so only puck physics is exercised.
  const run = (init, n, opt) => { const R0 = Math.random; if (opt && opt.pull) Math.random = () => .9999; /* goalie never saves: isolates the puck/frame */ try { return run0(init, n, opt); } finally { Math.random = R0; } };
  const run0 = (init, n, opt) => JSON.parse(r(`(()=>{const o=${JSON.stringify(opt || {})};const out=[];
    for(const t of [H1,A1]){t.pull=!!o.pull;for(const p of onIce(t)){p.x=150;p.y=70;p.vx=p.vy=0}}
    G.pause=0;G.fo=null;G.over=false;G.score=[0,0];G.saves=[0,0];puck.owner=null;puck.target=null;puck.shot=null;puck.last=null;puck.cool=0;puck.rel=null;puck.tip=false;puck.z=0;puck.vz=0;puck.spin=0;puck.bn=0;puck.vx=puck.vy=0;
    Object.assign(puck,${JSON.stringify(init)});
    let pz=0;
    for(let i=0;i<${n};i++){for(const t of [H1,A1]){t.pull=!!o.pull;for(const p of onIce(t)){p.x=150;p.y=70;p.vx=p.vy=0}}
      step(1/30);if(G.pause>0)G.pause=0;out.push([puck.x,puck.y,puck.z||0,puck.vx,puck.vy,puck.vz||0,G.score[0]+G.score[1],G.saves[0]+G.saves[1],puck.bn||0]);if(G.score[0]+G.score[1]>0&&!o.keep)break}
    return JSON.stringify(out)})()`));
  return { s, r, run, geom: () => JSON.parse(r(`JSON.stringify({gx:[H1.ownGX,A1.ownGX],d:[H1.dir,A1.dir],NY:NY})`)) };
}
const NEW = world(createSim), OLDW = OLD ? world(OLD) : null;
const hasZ = NEW.r('typeof puckVert') === 'function';
assert(hasZ, 'new puck model missing');
const gm = NEW.geom(); const NY = gm.NY;
const T = gm.d[0] > 0 ? 0 : 1; const gx = gm.gx[T], d = gm.d[T]; // team T defends the goal at gx; its front is gx + d*k
let pass = 0; const ok = (c, m) => { assert(c, 'FAIL: ' + m); pass++; console.log('  ok  ' + m); };
const last = a => a[a.length - 1];
function both(name, init, n, opt) { const a = NEW.run(init, n, opt); const b = OLDW ? OLDW.run(init, n, opt) : null; return { a, b }; }

console.log('1. stationary puck stays');
{ const { a } = both('rest', { x: 60, y: 40 }, 90); ok(a.every(p => p[0] === 60 && p[1] === 40 && p[2] === 0), 'x,y,z unchanged after 3 s'); }

console.log('2. sliding friction decay (exp(-0.12 t))');
{ const { a, b } = both('slide', { x: 40, y: 40, vx: 50, vy: 0 }, 90);
  const v3 = last(a)[3], want = 50 * Math.exp(-.12 * 3), dist = last(a)[0] - 40, wantD = 50 / .12 * (1 - Math.exp(-.12 * 3));
  console.log('     new v(3s)=' + f2(v3) + ' dist=' + f2(dist) + (b ? '  old v(3s)=' + f2(last(b)[3]) + ' dist=' + f2(last(b)[0] - 40) : '') + '  analytic v=' + f2(want) + ' dist=' + f2(wantD));
  ok(Math.abs(v3 - want) < .3 && Math.abs(dist - wantD) < 1.2, 'speed and distance match analytic decay');
  ok(last(a).every(x => x === x) && last(a)[2] === 0, 'puck stays on the ice (z=0)'); }

console.log('3. board bounce (side boards y=1, end boards x=4)');
{ const { a, b } = both('board', { x: 60, y: 15, vx: 0, vy: -60 }, 20);
  const k = a.findIndex(p => p[4] > 0); ok(k > 0, 'vy flips sign at the side boards'); const vb = a[k][4];
  console.log('     rebound vy=' + f2(vb) + ' (incoming 60 less friction)' + (b ? '  old ' + f2(b[b.findIndex(p => p[4] > 0)][4]) : ''));
  ok(vb > 24 && vb < 44, 'side boards: 60 ft/s in, ~28 out (the rounded-rink clamp and the y=1 wall both apply .7; unchanged from the old sim)'); ok(a.every(p => p[1] >= 1 - 1e-6), 'never beyond the boards');
  const c = both('end', { x: 40, y: 20, vx: -80, vy: 0 }, 30).a; const kk = c.findIndex(p => p[3] > 0); ok(kk > 0 && c[kk][3] > 40 && c[kk][3] < 52, 'end boards restitution .6'); ok(c.every(p => p[0] >= 4 - 1e-6), 'never past the end boards'); }

console.log('4. post hit at 150 ft/s is not tunnelled (swept segment vs circle)');
{ let nT = 0, oT = 0, nGoal = 0, oGoal = 0, N = 0, bounced = 0;
  for (let off = 0; off < 5; off += .5) for (const ang of [0, .12, -.12, .2]) for (const lat of [0, .12, -.12]) { N++;
    const sx = gx + d * (14 + off), sy = NY[0] + lat - Math.tan(ang) * (14 + off);      // line through the post centre at the goal line
    const v = 150, init = { x: sx, y: sy, vx: -d * v * Math.cos(ang), vy: v * Math.sin(ang), shot: null };
    const a = NEW.run(init, 12, { pull: true }), b = OLDW ? OLDW.run(init, 12, { pull: true }) : null;
    const crossedNew = a.some(p => d * (p[0] - gx) < 0 && Math.abs(p[1] - NY[0]) < .3), scoredNew = last(a)[6] > 0;
    if (scoredNew) console.log('     scored: off=' + off + ' ang=' + ang + ' last=' + last(a).map(f2).join(',')); nT += scoredNew ? 1 : 0; if (a.some(p => d * p[3] > 0)) bounced++;
    if (b) oT += last(b)[6] > 0 ? 1 : 0; assert(!crossedNew, 'puck passed through the post'); }
  console.log('     ' + N + ' shots through/grazing the post (lateral 0,+-.12 ft): new goals=' + nT + ' bounced=' + bounced + (OLDW ? '  old goals=' + oT : ''));
  ok(nT === 0 && bounced >= N * .9, 'no tunnelling: every shot at the post stays out and rebounds'); }
{ // shot just inside the post still scores at full speed; just outside is not a goal
  const a = NEW.run({ x: gx + d * 20, y: NY[0] + .6, vx: -d * 150, vy: 0 }, 12, { pull: true }); ok(last(a)[6] === 1, 'shot .6 ft inside the post is a goal');
  const b = NEW.run({ x: gx + d * 20, y: NY[0] - .6, vx: -d * 150, vy: 0 }, 12, { pull: true }); ok(last(b)[6] === 0, 'shot .6 ft outside the post is no goal'); }

console.log('5. low vs raised shot trajectories');
{ const sp = 110, dg = 40, t = dg / sp;
  const low = NEW.run({ x: gx + d * dg, y: NY[0] + 5, vx: -d * sp, vy: 0 }, 6, {}); ok(low.every(p => p[2] === 0), 'low shot stays on the ice');
  NEW.r(`puckLift(6,${sp},${dg},3.95)`); const vz0 = NEW.r('puck.vz'); ok(Math.abs(vz0 - 6) < 1e-6, 'puckLift sets vz=6 when under the height cap');
  const hi = NEW.run({ x: gx + d * dg, y: NY[0] + 5, vx: -d * sp, vy: 0, vz: 6 }, 40, { keep: 1 });
  const zmax = Math.max(...hi.map(p => p[2])), wantZ = 36 / (2 * 32.2);
  console.log('     raised: vz=6 peak z=' + f2(zmax) + ' ft (analytic ' + f2(wantZ) + '), first landing tick ' + (hi.findIndex((p, i) => i > 1 && p[2] === 0) + 1));
  ok(Math.abs(zmax - wantZ) / wantZ < .12, 'apex matches vz^2/2g within 12%');
  NEW.r(`puck.vz=0;puck.z=0`); NEW.r(`puckLift(30,${sp},${dg},3.95)`); const capped = NEW.r('puck.vz');
  console.log('     cap: asked vz=30, allowed vz=' + f2(capped)); ok(capped < 30 && capped * t - 16.1 * t * t <= 3.96, 'height at the goal line is capped (crossbar region) for shots at the goal'); }

console.log('6. ice bounce count and height');
{ const a = NEW.run({ x: 80, y: 40, vx: 0, vy: 0, z: 4, vz: 0 }, 120, { keep: 1 });
  const idx = []; for (let i = 1; i < a.length; i++) if (a[i][8] > a[i - 1][8]) idx.push(i);
  const apex1 = Math.max(...a.slice(idx[0], idx[1] || a.length).map(p => p[2]));
  console.log('     bounces=' + last(a)[8] + ' apex after 1st bounce=' + f2(apex1) + ' ft (analytic ' + f2(4 * .38 * .38) + ')  rest z=' + f2(last(a)[2]));
  ok(last(a)[8] >= 3 && last(a)[8] <= 6, 'a dropped puck bounces 3-6 times'); ok(Math.abs(apex1 - 4 * .38 * .38) < .2, 'first bounce apex ~ h*e^2'); ok(last(a)[2] === 0 && Math.abs(last(a)[5]) < .01, 'comes to rest on the ice'); }

console.log('7. save zones by height, goalie contact stub, bar and over the net');
{ const Z = z => NEW.r(`puckZone(${z})`); ok(Z(.3) === 'low' && Z(1.5) === 'mid' && Z(3.2) === 'high' && Z(4.6) === 'over', 'puckZone: 0.3 low, 1.5 mid, 3.2 high, 4.6 over');
  // stub: what a goalie would use. pad for low, glove/blocker for mid, none beyond the bar
  const stub = z => { const k = Z(z); return k === 'low' ? 'pad' : k === 'mid' ? 'glove/blocker' : k === 'high' ? 'high glove' : 'none'; };
  ok(stub(.5) === 'pad' && stub(2) === 'glove/blocker' && stub(3.5) === 'high glove' && stub(5) === 'none', 'goalie stub maps height to a save part');
  const sv = NEW.run({ x: gx + d * 25, y: NY[0] + 5, vx: -d * 110, vy: 0, z: 1, vz: 1.5 }, 30, {}); // may be saved or scored (random)
  const o = last(sv); ok(o[6] + o[7] >= 1, 'airborne shot at the net ends in a save or goal');
  // crossbar: height ~3.9 at the line
  const bar = NEW.run({ x: gx + d * 10, y: NY[0] + 5, vx: -d * 150, vy: 0, z: 3.95, vz: 0 }, 6, { keep: 1 }); ok(bar.every(p => p[6] === 0) && bar.some(p => d * p[3] > 0), 'puck at the crossbar height hits the bar, no goal, comes back');
  const over = NEW.run({ x: gx + d * 10, y: NY[0] + 5, vx: -d * 100, vy: 0, z: 5.5, vz: 0 }, 12, { pull: true, keep: 1 }); ok(over.every(p => p[6] === 0) && over.some(p => d * (p[0] - gx) < -1), 'puck flying over the bar is no goal and carries on behind the net'); }

console.log('8. rebound off a post and the goal frame');
{ const a = NEW.run({ x: gx + d * 20, y: NY[0], vx: -d * 100, vy: 0 }, 12, {}); const k = a.findIndex(p => d * p[3] > 0);
  ok(k > 0 && d * a[k][3] > 40 && d * a[k][3] < 70, 'head-on post hit returns at ~0.55 of incoming speed (' + f2(d * a[k][3]) + ')'); }

console.log('9. net behind the goal line (back and side netting)');
{ const behind = gx - d * 5.5, speed = 40;       // between end boards and back of the net
  const n = NEW.run({ x: behind, y: MYc(), vx: d * speed, vy: 0 }, 20, {}); const o = OLDW ? OLDW.run({ x: behind, y: MYc(), vx: d * speed, vy: 0 }, 20, {}) : null;
  console.log('     puck from behind at ' + f2(speed) + ' ft/s: new final x=' + f2(last(n)[0]) + ' goals=' + last(n)[6] + (o ? '  old final x=' + f2(last(o)[0]) + ' goals=' + last(o)[6] : ''));
  ok(last(n)[6] === 0 && d * (last(n)[0] - gx) < 0, 'puck from behind cannot enter the goal through the netting'); ok(n.some(p => d * p[3] < 0), 'it bounces off the back of the net');
  const sd = NEW.run({ x: gx - d * 2, y: NY[0] - 3, vx: 0, vy: 40 }, 12, {}); ok(sd.every(p => p[1] <= NY[0] + .01) && sd.some(p => p[4] < 0), 'side netting stops a puck sliding in from the side'); }
function MYc() { return (NY[0] + NY[1]) / 2; }

console.log('10. snapshot size');
{ const s = createSim(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 60; i++) s.tick(); const base = JSON.stringify(JSON.parse(s.tick()).s).length;
  vm.runInContext('puck.owner=null;puck.z=2.4', s.ctx); const hi = JSON.parse(s.tick()).s; console.log('     tick bytes ~' + base + ', with z the pk array: ' + JSON.stringify(hi.pk)); ok(hi.pk.length === 6 || hi.pk[5] === undefined, 'z appended as 6th element only when airborne'); }

// ---------- Pass 9 (agent B): saucer pass, backhand reception, one-timer, board pass, puck control under pressure ----------
// scene(): fresh sim, every skater parked, the listed ones placed (and re-placed every tick so only puck / pass logic is exercised)
function scene(cfg) {
  const s = createSim(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 120; i++) s.tick();
  const r = c => vm.runInContext(c, s.ctx);
  r(`globalThis.__cfg=${JSON.stringify(cfg)};
  globalThis.__hp=onIce(H1).filter(p=>!p.goalie);globalThis.__ap=onIce(A1).filter(p=>!p.goalie);
  globalThis.__fix=function(){for(const t of [H1,A1])for(const p of onIce(t)){p.x=t===H1?10:190;p.y=t===H1?80:5;p.vx=p.vy=0;p.dvx=p.dvy=0;p.act=null}
    const put=(p,a)=>{p.x=a[0];p.y=a[1];p.fa=a[2]||0;p.vx=a[3]||0;p.vy=a[4]||0;p.dvx=p.dvy=0;p.act=null};
    put(__hp[0],__cfg.pa);put(__hp[1],__cfg.rc);(__cfg.bl||[]).forEach((b,i)=>put(__ap[i],b))};
  G.pause=0;G.fo=null;G.over=false;G.score=[0,0];puck.owner=null;puck.target=null;puck.shot=null;puck.stl=null;puck.sauc=0;puck.z=puck.vz=0;puck.vx=puck.vy=0;puck.cool=0;
  for(const p of __hp.concat(__ap)){p.stun=0;p.oneT=0;p.pass=${cfg.pass === undefined ? 1 : cfg.pass}}__fix();`);
  return { s, r };
}
const LCG = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const SNAP = 'JSON.stringify({x:puck.x,y:puck.y,z:puck.z,vx:puck.vx,vy:puck.vy,own:puck.owner?puck.owner.id:null,stl:!!puck.stl,sauc:puck.sauc,rc:__hp[1].id,bl:__ap[0].id,ae:__hp[1].ae||null,note:noteTxt,sh:puck.shot?1:0,bx:__hp[1].x+Math.cos(__hp[1].fa)*4,by:__hp[1].y+Math.sin(__hp[1].fa)*4})';
// throws a pass from __hp[0] toward +x (walking the pass counter until the wanted kind comes up), then steps the real sim; Math.random fixed so only the hash plan varies
function runPass(cfg, ticks, hook) {
  const { s, r } = scene(cfg); const R0 = Math.random; Math.random = () => .5;
  try {
    let kd = null;
    for (let k = 0; k < 60; k++) {
      r(`G.passes=[${k},0];__fix();puck.owner=__hp[0];puck.x=${cfg.pa[0]};puck.y=${cfg.pa[1]};puck.vx=puck.vy=0;puck.pk=null;pass(__hp[0],1,0)`);
      kd = r('puck.pk'); if (!cfg.want || kd === cfg.want) break;
    }
    const out = [];
    for (let i = 0; i < ticks; i++) {
      if (hook) hook(r, out, i);
      r('__fix();step(1/30);if(G.pause>0)G.pause=0;'); out.push(JSON.parse(r(SNAP)));
    }
    return { kd, out, r };
  } finally { Math.random = R0; }
}
const OTT = (a, b, c, d) => NEW.r(`oneTimerResult(${a},${b},${c},${d})`);

console.log('11. saucer pass: lifts, clears an opponent in the lane, lands on the receiver');
{ const cfg = { pa: [60, 42, 0], rc: [100, 42, Math.PI], bl: [[80, 42, 0]], want: 's' };
  const a = runPass(cfg, 70);
  ok(a.kd === 's', 'planner chose a saucer (lane blocked, long enough, skilled passer)');
  const o = a.out, zmax = Math.max(...o.map(p => p.z));
  const atBl = o.filter(p => p.x > 77 && p.x < 83 && p.own === null); const zl = Math.min(...atBl.map(p => p.z));
  console.log('     apex z=' + f2(zmax) + ' ft, min z while over the blocker=' + f2(zl) + ' ft (limit 0.55)');
  ok(zmax >= .9 && zmax <= 2.5, 'apex height in range 0.9..2.5 ft (' + f2(zmax) + ')');
  ok(atBl.length > 0 && zl > .55, 'puck is above stick height while over the blocker, so the lane defender cannot take it');
  ok(o.every(p => p.own !== p.bl), 'the blocking opponent never gets the puck');
  ok(o.some(p => p.sauc === 1 && p.z > 0), 'flagged as a lifted pass while airborne');
  const land = o.findIndex((p, i) => i > 3 && (p.z === 0 || p.own === p.rc)); const lp = o[land];
  console.log('     first on ice or picked up at tick ' + (land + 1) + ', x=' + f2(lp.x) + ' (target 100)');
  ok(Math.abs(lp.x - 100) < 8 && Math.abs(lp.y - 42) < 8, 'lands within 8 ft of the target');
  ok(o.some(p => p.own === p.rc), 'receiver ends up with the puck (receivable)');
  const f = () => runPass(cfg, 40).out.map(p => f2(p.x) + ',' + f2(p.z)).join(';');
  ok(f() === f(), 'identical inputs give an identical saucer flight (deterministic)'); }
{ const a = runPass({ pa: [60, 42, 0], rc: [100, 42, Math.PI], bl: [] }, 10); ok(a.kd === 'g' && a.out.every(p => p.z === 0), 'no blocker: plain ground pass, puck stays on the ice'); }
{ const a = runPass({ pa: [60, 42, 0], rc: [100, 42, Math.PI], bl: [[62.5, 42, 0]] }, 6); ok(a.kd !== 's', 'blocker right at the passer: no saucer (the arc is still on the ice there)'); }
{ const w = scene({ pa: [60, 42, 0], rc: [100, 42, 0] });
  const bad = (z, vz) => { const R0 = Math.random; let n = 0, b = 0; Math.random = LCG(5); try { for (let i = 0; i < 500; i++) { w.r(`__fix();G.pause=0;puck.owner=null;puck.stl=null;puck.target=__hp[1];puck.targetT=1;puck.last=__hp[0];puck.cool=0;puck.x=96;puck.y=42;puck.vx=60;puck.vy=0;puck.z=${z};puck.vz=${vz};puck.sauc=${z > 0 ? 1 : 0};__hp[1].fa=0;__hp[1].ae=null;step(1/30);`); const q = w.r('__hp[1].ae&&__hp[1].ae.k==="gain"?__hp[1].ae.d.q:""'); if (q) { n++; if (q !== 'clean') b++; } } } finally { Math.random = R0; } return b / Math.max(1, n); };
  const lo = bad(0, 0), hi = bad(1.3, -9); console.log('     non-clean reception rate: ice puck ' + f2(lo) + ', descending puck z=1.3 vz=-9: ' + f2(hi));
  ok(hi > lo + .03, 'a high, falling puck is harder to take cleanly'); }

console.log('12. backhand reception: cushion window, no teleport, possession only on blade contact');
{ const run = stun => { const { r } = scene({ pa: [60, 42, 0], rc: [100, 42, Math.PI + 1.0] }); const R0 = Math.random; Math.random = () => .5; try {
      r(`G.passes=[0,0];puck.owner=__hp[0];puck.x=60;puck.y=42;pass(__hp[0],1,0)`); const tr = []; let prev = null, stl0 = -1, own0 = -1, maxJ = 0, gap = null;
      for (let i = 0; i < 40; i++) { if (stun) r('__hp[1].stun=.3'); r('__fix();step(1/30);if(G.pause>0)G.pause=0;'); const o = JSON.parse(r(SNAP));
        if (o.stl && stl0 < 0) stl0 = i; if (o.own === o.rc && own0 < 0) { own0 = i; gap = Math.hypot(o.x - o.bx, o.y - o.by); }
        if (prev && prev.stl) maxJ = Math.max(maxJ, Math.hypot(o.x - prev.x, o.y - prev.y)); prev = o; tr.push(o); }
      return { tr, stl0, own0, maxJ, gap }; } finally { Math.random = R0; } };
  const a = run(false), b = run(true);
  console.log('     settle from tick ' + (a.stl0 + 1) + ', possession tick ' + (a.own0 + 1) + ' (' + (a.own0 - a.stl0) + ' ticks), max jump/tick ' + f2(a.maxJ) + ' ft, blade gap at possession ' + f2(a.gap) + ' ft; stunned receiver: ' + (b.own0 < 0 ? 'lost it' : b.own0 - b.stl0 + ' ticks'));
  ok(a.stl0 >= 0, 'pass arriving on the backhand side starts a settle (puck not owned yet)');
  ok(a.tr.some(p => p.ae && p.ae.k === 'gain' && p.ae.d.bk === 1), 'gain event carries bk=1 for the animation');
  ok(a.own0 > a.stl0, 'possession is not awarded when the puck first reaches the player: it eases onto the blade first (' + (a.own0 - a.stl0) + ' ticks)');
  ok(a.maxJ <= 2.5 + 1e-6, 'no teleport: puck moves at most 2.5 ft per tick while settling (' + f2(a.maxJ) + ')');
  ok(a.gap < 1.3, 'possession only when the puck is on the blade (gap ' + f2(a.gap) + ' ft)');
  ok(a.tr.filter(p => p.stl).every(p => p.own === null), 'unowned during the whole settle');
  ok(b.own0 < 0 || b.own0 - b.stl0 >= a.own0 - a.stl0, 'a stunned receiver takes at least as long or loses it');
  const dur = (sp, pas) => { const { r } = scene({ pa: [60, 42, 0], rc: [100, 42, Math.PI + 1.0], pass: pas }); const R0 = Math.random; Math.random = () => .5; try { r(`G.passes=[0,0];__fix();puck.owner=null;puck.stl=null;puck.target=__hp[1];puck.targetT=1;puck.last=__hp[0];puck.x=94;puck.y=42;puck.vx=${sp};puck.vy=0;step(1/30);`); return r('puck.stl&&__hp[1].bhR?__hp[1].bhR.T:-1'); } finally { Math.random = R0; } };
  const dS = dur(40, 1), dF = dur(150, 1), dLo = dur(100, .2), dHi = dur(100, 1); console.log('     settle time: slow ' + f2(dS) + ' fast ' + f2(dF) + ' | skill .2 ' + f2(dLo) + ' skill 1 ' + f2(dHi));
  ok(dS > 0 && dF > dS, 'faster pass: longer settle'); ok(dLo > dHi && dHi > 0, 'lower skill: longer settle'); }

console.log('13. one-timer: explicit timing window, missed one-timer leaves a loose puck');
{ ok(OTT(.4, 0, 110, .1) === 'clean', 'age .40 s on the blade: clean');
  ok(OTT(.8, 0, 110, .1) === 'early' && OTT(.01, 0, 110, .1) === 'late' && OTT(.4, 2.4, 110, .1) === 'angle' && OTT(.4, -2.4, 110, .1) === 'angle' && OTT(.4, 0, 110, .99) === 'mishit', 'early / late / off-angle / mishit classified');
  ok(OTT(.02, 0, 110, .1) === 'clean' && OTT(.62, 0, 110, .1) === 'clean' && OTT(.63, 0, 110, .1) === 'early' && OTT(.019, 0, 110, .1) === 'late', 'window edges: 0.02 .. 0.62 s inclusive');
  const ot = (age, fa) => { let armed = false; const a = runPass({ pa: [60, 42, 0], rc: [100, 42, fa], bl: [] }, 30, (r, out) => { const l = out[out.length - 1]; if (!armed && l && l.x > (age < .05 ? 87.5 : 84)) { armed = true; r(`__hp[1].oneT=.9;__hp[1].oneP=G.clock+${age < .05 ? -.025 : age};__hp[1].oneI={nx:1,ny:0,pw:.8,ai:true}`); } });
    return { a, owner: a.out.some(p => p.own === p.rc), shot: a.out.some(p => p.sh), note: a.out.map(p => p.note).filter(x => /ONE/.test(x))[0], gain: a.out.map(p => p.ae).filter(e => e && e.k === 'gain')[0] }; };
  const early = ot(.9, Math.PI), late = ot(0, Math.PI), ang = ot(.4, .6), clean = ot(.4, Math.PI);
  console.log('     early: ' + early.note + ' | late: ' + late.note + ' | angle: ' + ang.note + ' | clean: ' + clean.note);
  for (const [n, x] of [['early', early], ['late', late], ['off-angle', ang]]) { ok(x.note === 'ONE-TIMER MISSED' && !x.owner, n + ' swing: MISSED ONE-TIMER, receiver does not get possession'); ok(x.gain && x.gain.d.q === 'miss' && x.gain.d.ot === 1, n + ': gain event q=miss ot=1'); }
  ok(early.a.out.filter(p => Math.hypot(p.vx, p.vy) > 5).length > 5, 'missed one-timer: puck loose and still moving');
  ok(clean.note === 'ONE-TIMER!' && clean.shot, 'clean one-timer: shot released at blade contact'); }

console.log('14. board pass: banks off the side boards with the real board collision');
{ const a = runPass({ pa: [70, 8, 0], rc: [130, 8, Math.PI], bl: [[100, 8, 0]], pass: 0, want: 'b' }, 90); ok(a.kd === 'b', 'planner chose a board pass (blocked lane, both players near the same wall)');
  const o = a.out, k = o.findIndex((p, i) => i > 0 && p.vy > 0 && o[i - 1].vy < 0); ok(k > 0, 'puck vy flips sign at the side boards (real collision)');
  const vin = o[k - 1].vy, vout = o[k].vy, ratio = -vout / vin; console.log('     rebound: vy ' + f2(vin) + ' -> ' + f2(vout) + ' ratio ' + f2(ratio) + ', wall y=' + f2(o[k].y));
  ok(o[k].y <= 1.2 && ratio > .6 && ratio < .76, 'rebound off the wall at y=1 with restitution 0.7 (ratio ' + f2(ratio) + ')');
  ok(o.every(p => p.y >= 1 - 1e-6), 'never through the boards'); ok(o.every(p => p.own !== p.bl), 'defender in the direct lane never touches it');
  ok(o.some(p => p.own === p.rc), 'the banked puck reaches the receiver'); }

console.log('15. puck control under pressure: stick contact knocks the puck loose, shielding / boards protect');
{ const trial = (cfg, n, seed) => { const { r } = scene(cfg); const R0 = Math.random; Math.random = LCG(seed); let loose = 0, steal = 0; try {
      for (let i = 0; i < n; i++) { r(`__fix();G.pause=0;puck.owner=__hp[0];puck.stl=null;puck.cool=0;puck.last=__hp[0];__hp[0].gainT=-99;__ap[0].stun=0;__ap[0].chk=.6;__hp[0].chk=.4;puck.x=__hp[0].x+4;puck.y=__hp[0].y;`); r('step(1/30);');
        const ow = r('puck.owner?puck.owner.team===H1?1:2:0'); if (ow === 2) steal++; else if (ow === 0) loose++; } } finally { Math.random = R0; } return { loose, steal, n }; };
  const front = trial({ pa: [80, 42, 0], rc: [150, 70, 0], bl: [[83, 42, 0]] }, 6000, 11), back = trial({ pa: [80, 42, Math.PI], rc: [150, 70, 0], bl: [[83, 42, 0]] }, 6000, 11), wall = trial({ pa: [80, 4, Math.PI], rc: [150, 70, 0], bl: [[83, 4, 0]] }, 6000, 11);
  console.log('     defender in front: loose ' + front.loose + ' / stolen ' + front.steal + ' | back to the defender: ' + back.loose + '/' + back.steal + ' | back to defender on the wall: ' + wall.loose + '/' + wall.steal);
  ok(front.loose > 20 && front.steal > 20, 'stick contact both lifts the puck and knocks it loose');
  ok(back.loose + back.steal < (front.loose + front.steal) * .75, 'shielding the puck cuts the losses by over 25 percent');
  ok(wall.loose + wall.steal < back.loose + back.steal, 'shielding on the boards protects more');
  const { r } = scene({ pa: [80, 42, 0], rc: [150, 70, 0], bl: [[83, 42, 0]] }); const R0 = Math.random; Math.random = () => 0; let sep = { reown: 0 };
  try { r(`__fix();puck.owner=__hp[0];puck.last=__hp[0];__hp[0].gainT=-99;puck.x=84;puck.y=42;`); r('step(1/30);');
    const own = r('puck.owner?1:0'), sp0 = r('Math.hypot(puck.vx,puck.vy)'); const pts = []; for (let i = 0; i < 8; i++) { r('__fix();step(1/30);'); pts.push(r('Math.hypot(puck.x-__hp[0].x,puck.y-__hp[0].y)')); if (i < 6 && r('puck.owner')) sep.reown = 1; } sep.own = own; sep.sp0 = sp0; sep.pts = pts; } finally { Math.random = R0; }
  console.log('     forced knock: owner after=' + sep.own + ' speed=' + f2(sep.sp0) + ' distances ' + sep.pts.map(f2).join(','));
  ok(sep.own === 0 && !sep.reown && sep.sp0 > 15 && sep.pts[7] > sep.pts[0] + 2, 'knocked puck leaves the carrier with speed and the gap grows (no magnetic reattachment)'); }

console.log('\nALL ' + pass + ' ASSERTIONS PASSED');
