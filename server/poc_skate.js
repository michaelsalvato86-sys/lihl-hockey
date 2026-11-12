'use strict';
// Skating numeric test: runs the REAL skate() from game.html in the sim vm, OLD (SKATE2=false) vs NEW (SKATE2=true).
// Prints a before/after table and asserts on the NEW model. Exit code 1 on any failed assertion.
const { createSim } = require('./sim_host'); const vm = require('vm');
const s = createSim(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 90; i++) s.tick();
const MX = 40;
function scen(flag, MX) {
  SKATE2 = flag; const dt = 1 / 60, p = H1.seats.C, O = {};
  const reset = (vx, vy, fa, carry) => { p.x = 100; p.y = MY; p.vx = vx; p.vy = vy; p.fa = fa; p.vis = false; p.box = false; p.spd = .5; p.isCtl = false; p.stpOn = false; p.stp = 0; p.ph = 0; p.turn = 0; puck.owner = carry ? p : null; p.dvx = p.dvy = 0 };
  const step = (ix, iy) => { p.dvx = ix; p.dvy = iy; skate(p, dt, MX); p.x += p.vx * dt; p.y += p.vy * dt };
  const spd = () => Math.hypot(p.vx, p.vy);
  // accel
  reset(0, 0, 0); let t = 0; for (; t < 8; t += dt) { step(1, 0); if (spd() > MX * .9) break } O.t90 = +t.toFixed(2);
  // coast from MX
  reset(MX, 0, 0); let x0 = p.x; t = 0; for (; t < 20; t += dt) { step(0, 0); if (spd() < 2) break } O.coastT = +t.toFixed(2); O.coastD = +(p.x - x0).toFixed(1);
  // hockey stop from v (hold reverse input 4 s)
  for (const v of [15, 25, 40]) {
    reset(v, 0, 0); x0 = p.x; let T = -1, minS = 1e9, maxSpAfter = 0, angMax = 0, ph0 = 0, stpMax = 0, spray = false, phAtStop = 0;
    for (t = 0; t < 4; t += dt) { step(-1, 0); const sv = spd(); if (sv < minS) minS = sv; if (T < 0 && sv < 2) { T = t; O['stopD' + v] = +(p.x - x0).toFixed(1); } if (T < 0 && sv > 4) { const a = Math.abs(wrapA(Math.atan2(p.vy, p.vx) - p.fa)); if (a > angMax) angMax = a } stpMax = Math.max(stpMax, p.stp || 0); if (p.spray) spray = true }
    O['stopT' + v] = T < 0 ? 99 : +T.toFixed(2); O['stopMin' + v] = +minS.toFixed(2); O['stopAng' + v] = +angMax.toFixed(2); O['stopStp' + v] = +stpMax.toFixed(2); O['stopSpray' + v] = spray;
  }
  // BACKWARD hockey stop: travelling backward (facing +x, moving -x), input hard forward (opposes travel)
  for (const v of [14, 17, 20]) {
    reset(-v, 0, 0); x0 = p.x; let T = -1, minS = 1e9, angMax = 3.14, stpMax = 0, spray = false, nStp = 0;
    for (t = 0; t < 4; t += dt) { step(1, 0); const sv = spd(); if (sv < minS) minS = sv; if (T < 0 && sv < 2) { T = t; O['bstopD' + v] = +(x0 - p.x).toFixed(1); } if (T < 0 && sv > 4) { const a = Math.abs(wrapA(Math.atan2(p.vy, p.vx) - p.fa)); if (Math.abs(a - Math.PI / 2) < Math.abs(angMax - Math.PI / 2)) angMax = a; const lat = Math.abs(-p.vx * Math.sin(p.fa) + p.vy * Math.cos(p.fa)); O['bLat' + v] = Math.max(O['bLat' + v] || 0, +lat.toFixed(1)) } stpMax = Math.max(stpMax, p.stp || 0); if (p.spray) spray = true }
    O['bstopT' + v] = T < 0 ? 99 : +T.toFixed(2); O['bstopMin' + v] = +minS.toFixed(2); O['bstopAng' + v] = +angMax.toFixed(2); O['bstopStp' + v] = +stpMax.toFixed(2); O['bstopSpray' + v] = spray;
  }
  // 90 degree turn at speed (input perpendicular held): arc length / angle, time, peak lateral slip
  for (const v of [15, 25, 40]) {
    reset(v, 0, 0); let L = 0, pk = 0, tt = 0, ok = false; for (; tt < 5; tt += dt) { const sx = p.x, sy = p.y; step(0, 1); L += Math.hypot(p.x - sx, p.y - sy); const fx = Math.cos(p.fa), fy = Math.sin(p.fa); pk = Math.max(pk, Math.abs(-p.vx * fy + p.vy * fx)); if (Math.atan2(p.vy, p.vx) > Math.PI / 2 * .95) { ok = true; break } }
    O['turnR' + v] = ok ? +(L / (Math.PI / 2 * .95)).toFixed(1) : 99; O['turnT' + v] = +tt.toFixed(2); O['slip' + v] = +pk.toFixed(1); O['turnEnd' + v] = +spd().toFixed(1);
  }
  // 180 pivot with puck from rest and at 10 ft/s
  for (const v of [0, 10]) { reset(v, 0, 0, true); let tt = 0; for (; tt < 4; tt += dt) { step(-1, 0); if (Math.abs(wrapA(p.fa - Math.PI)) < .15) break } O['pivT' + v] = +tt.toFixed(2); O['pivSp' + v] = +spd().toFixed(1) }
  // fwd to back (no puck) from 10 ft/s fwd; back to fwd from 10 ft/s back
  reset(10, 0, 0); t = 0; for (; t < 4; t += dt) { step(-1, 0); if (p.vx < -3) break } O.f2b = +t.toFixed(2);
  reset(-10, 0, 0); t = 0; for (; t < 4; t += dt) { step(1, 0); if (p.vx > 3) break } O.b2f = +t.toFixed(2);
  // lateral movement: from rest, input straight up (facing +x); how far sideways drift vs time to move 10 ft
  reset(0, 0, 0); let y0 = p.y; t = 0; for (; t < 5; t += dt) { step(0, 1); if (Math.abs(p.y - y0) > 10) break } O.lat10 = +t.toFixed(2);
  // stride phase: advances skating, frozen while coasting
  reset(30, 0, 0); let acc = 0, pl = p.ph; for (let i = 0; i < 60; i++) { step(1, 0); acc += (p.ph - pl + 6.2832) % 6.2832; pl = p.ph } O.phSkate = +acc.toFixed(2); const pa = p.ph; for (let i = 0; i < 60; i++)step(0, 0); O.phCoastDelta = +Math.abs(p.ph - pa).toFixed(3);
  return JSON.stringify(O);
}
const run = f => JSON.parse(vm.runInContext(`(${scen})(${f},${MX})`, s.ctx));
const A = run(false), B = run(true); vm.runInContext('SKATE2=true', s.ctx);
const keys = Object.keys(B); console.log('metric'.padEnd(16) + 'OLD'.padEnd(10) + 'NEW');
for (const k of keys) console.log(k.padEnd(16) + String(A[k]).padEnd(10) + String(B[k]));
// --- assertions on NEW ---
let bad = 0; const chk = (c, m) => { if (!c) { bad++; console.error('FAIL: ' + m) } };
// stop checker, reusable so a fake "just turn around" stop is shown to FAIL it
const stopOk = (T, minS, D, v) => T > 0 && T < 3 && minS < 2 && D > 0.5;
chk(!stopOk(99, 25, 60, 25), 'checker must reject a skater who just turns around and keeps skating');
for (const v of [15, 25, 40]) { chk(stopOk(B['stopT' + v], B['stopMin' + v], B['stopD' + v], v), 'hockey stop ' + v + ' must end with speed < 2 within 3s: T=' + B['stopT' + v]); chk(B['stopStp' + v] > .5, 'p.stp must engage at ' + v); chk(B['stopAng' + v] > 1.2 && B['stopAng' + v] < 1.95, 'body ~90deg across travel at ' + v + ': ' + B['stopAng' + v]) }
chk(B.stopT40 >= 0.9, 'no instant stop from 40 ft/s: ' + B.stopT40); chk(B.stopD40 >= 15, 'stop distance from 40 too short: ' + B.stopD40);
chk(B.stopT15 < B.stopT25 && B.stopT25 < B.stopT40, 'stop time must scale with speed'); chk(B.stopD15 < B.stopD25 && B.stopD25 < B.stopD40, 'stop distance must scale with speed');
chk(B.stopSpray40 === true, 'spray flag at 40'); chk(B.stopSpray15 === true || B.stopSpray15 === false, '');
// backward hockey stop: must stop (not just turn around), body across travel, speed-scaled distance, spray
for (const v of [14, 17, 20]) { chk(stopOk(B['bstopT' + v], B['bstopMin' + v], B['bstopD' + v], v), 'backward stop ' + v + ' must end with speed < 2 within 3s: T=' + B['bstopT' + v]); chk(B['bstopStp' + v] > .5, 'p.stp must engage on backward stop ' + v); chk(B['bstopAng' + v] > 1.2 && B['bstopAng' + v] < 1.95, 'backward stop body ~90deg across travel at ' + v + ': ' + B['bstopAng' + v]); chk(B['bLat' + v] > 6, 'backward stop must have lateral slip (not a turn-around): ' + B['bLat' + v]) }
chk(B.bstopD14 < B.bstopD17 && B.bstopD17 < B.bstopD20, 'backward stop distance must scale with speed: ' + [B.bstopD14, B.bstopD17, B.bstopD20]); chk(B.bstopT14 < B.bstopT20, 'backward stop time scales'); chk(B.bstopSpray20 === true, 'spray flag on backward stop at 20');
chk(B.bstopD20 > 5, 'no instant backward stop: ' + B.bstopD20);
// SKATE2=false must not latch the stop
chk(A.bstopStp20 === 0, 'old model (SKATE2=false) has no stop latch: ' + A.bstopStp20);
chk(B.turnR15 < B.turnR25 && B.turnR25 < B.turnR40, 'turn radius must grow with speed: ' + [B.turnR15, B.turnR25, B.turnR40]); chk(B.turnR40 >= 1.5 * B.turnR15, 'radius growth too small');
chk(B.slip40 > 2, 'grip budget: expected lateral slip at 40 during a hard turn: ' + B.slip40); chk(B.slip40 > B.slip15, 'slip must grow with speed');
chk(B.turnEnd40 > 14, 'a 90 degree carve at 40 must not be a stop: ' + B.turnEnd40);
chk(B.t90 > 1 && B.t90 < 4, 'time to 90% speed: ' + B.t90); chk(B.coastT > 4, 'coast should glide: ' + B.coastT);
chk(B.pivT0 < 1 && B.pivT10 < 1.2, 'pivot too slow'); chk(B.f2b < 1.5 && B.b2f < 1.5, 'fwd/back transitions too slow'); chk(B.lat10 < 3, 'lateral move too slow');
chk(B.phSkate > 5 && B.phCoastDelta < .001, 'stride phase must advance only when skating');
console.log(bad ? bad + ' FAILED' : 'poc_skate: all assertions passed'); process.exit(bad ? 1 : 0);
