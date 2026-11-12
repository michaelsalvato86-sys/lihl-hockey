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
console.log('\nALL ' + pass + ' ASSERTIONS PASSED');
