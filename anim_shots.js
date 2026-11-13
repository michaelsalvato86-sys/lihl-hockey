(function () {
/* Stick skills and shot / pass / reception variety (cosmetic only).
   Hooks into anim_ctrl.js: ANIM.shots.on (event arrives), .fx (per frame offsets), .legs (skate kick), .puckFx (puck spin / tilt).
   Variants are CHOSEN from sim event data (kind, power, puck height, length, bearing, speed) so the pose matches the puck.
   Contact rule: blade offsets are multiplied by (1 - cw) in the controller, so the blade is still on the puck on the release frame. */
'use strict';
const SH = {};
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const kf = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
const hv = (id, k) => { let h = (((id | 0) * 2654435761) ^ (k * 40503)) >>> 0; h = ((h ^ (h >>> 15)) * 2246822519) >>> 0; return (h % 10000) / 10000; };
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const E = { yaw: 0, bf: 0, bs: 0, bh: 0, hh: 0, cr: 0, pitch: 0, head: 0, hp: 0, wt: 0, roll: 0, stance: 0, free: 0, spin: 0, hand: null, kick: null, label: '', tilt: 0 };
const HAND = { f: 0, s: 0, h: 0, w: 0 }, KICK = { s: 'l', k: 0 };
SH.names = ['shot_quick', 'shot_backhand', 'shot_volley', 'pass_saucer', 'pass_drop', 'pass_slap', 'pass_onehand', 'pass_bank', 'pass_backhand', 'recv_glove', 'recv_tip', 'recv_cradle', 'recv_kick', 'recv_reach', 'recv_backhand', 'poke_dive', 'deke_forehand_backhand', 'deke_toe_drag', 'deke_between_legs', 'deke_spin', 'stick_battle'];
SH.last = null;

/* a sim event arrived for this skater: choose the variant from its data */
SH.on = function (an, p, c, k, d, V) {
  const sgn = V.topR ? -1 : 1, rel = d.rel !== undefined ? d.rel : (d.a !== undefined ? -wrapA(d.a - (p.fa || 0)) : 0), id = p.id | 0, h = hv(id, (an.evId | 0) + 3);
  let v = '', dur = 0.6, t0 = 0, link = false, extra = null;
  if (k === 'shot') {
    const kd = d.kind, bk = (kd === 'wrist' || kd === 'snap') && rel * sgn > 0.55, z = +d.z || 0;
    link = true; t0 = ({ slap: 0.07, onetimer: 0.07, wrist: 0.05, snap: 0.04 })[kd] || 0.05; dur = ({ wrist: 0.6, snap: 0.4, slap: 0.9, onetimer: 0.65 })[kd] || 0.6;
    if (bk) v = 'shot_backhand'; else if (kd === 'snap' && d.pw !== undefined && d.pw < 0.42) v = 'shot_quick'; else if (kd !== 'slap' && z > 0.5) v = 'shot_volley';
    SH.last = { t: performance.now(), tilt: (v === 'shot_backhand' ? 0.35 : v === 'shot_volley' ? 0.2 : 0), id };
  } else if (k === 'pass') {
    const len = +d.len || 0, y = p.y, Hh = typeof H === 'number' ? H : 85, nearWall = Math.min(y, Hh - y) < 9 && d.a !== undefined && Math.abs(Math.sin(d.a)) < 0.45 && len > 12 && len < 70;
    link = true; t0 = 0.05; dur = 0.65;
    if (d.kd === 's') v = 'pass_saucer'; else if (d.kd === 'b') { v = 'pass_bank'; const wl = y < Hh / 2 ? -Math.PI / 2 : Math.PI / 2; extra = { wr: -wrapA(wl - (p.fa || 0)) }; } else if (d.kd === 'd') v = 'pass_drop'; else if (Math.abs(rel) > 1.9) v = 'pass_drop'; else if (rel * sgn > 0.55) v = 'pass_backhand'; else if (nearWall) { v = 'pass_bank'; extra = { wr: -wrapA((y < Hh / 2 ? -Math.PI / 2 : Math.PI / 2) - (p.fa || 0)) }; }
    else if (len > 55 && (c.charge > 0.5 || h < 0.28)) v = 'pass_slap'; else if (len > 60 && (len > 78 || h < 0.7)) v = 'pass_saucer'; else if (len > 0 && len < 30 && (len < 22 || h < 0.5)) v = 'pass_onehand';
    SH.last = { t: performance.now(), tilt: v === 'pass_saucer' ? 0.28 : 0, id };
  } else if (k === 'gain') {
    const z = +d.z || 0, q = d.q, pf = an.pfv || 0, ps = an.psv || 0;
    dur = 0.6;
    if (q === 'miss') v = ''; else if (d.bk) { v = 'recv_backhand'; dur = 0.5; } else if (z > 1.3) { v = 'recv_glove'; extra = { z, ps }; } else if (q === 'deflect') { v = 'recv_tip'; dur = 0.45; extra = { ps }; }
    else if (q === 'bobble' || (z > 0.35 && z <= 1.3)) { v = 'recv_cradle'; dur = 0.7; } else if (q === 'difficult' && pf < 0.6) { v = 'recv_kick'; extra = { ps }; }
    else if (Math.abs(ps) > 0.95 && pf > 0.2) { v = 'recv_reach'; dur = 0.55; extra = { ps }; } else if ((d.bk || ps * sgn < -0.45) && q !== 'miss') { v = 'recv_backhand'; dur = 0.5; }
  } else if (k === 'poke') {
    if ((an.pfv || 0) > 2.1) { v = 'poke_dive'; dur = 0.6; }
  } else return;
  if (!v) return;
  an.sxv = v; an.sx = { v, t: t0, t0, dur, link, d, ex: extra, sgn, rel, big: 0 };
};

/* per-frame: returns the offsets (shared object E) or null when idle */
SH.fx = function (m, an, dt, c, p, V, ek, u) {
  if (an.fall) an.sx = null;
  if (an.sxCool > 0) an.sxCool -= dt;
  const S = an.s, sgn = V.topR ? -1 : 1;
  // carry-phase skills, chosen from the opponent bearing / distance and our own speed
  if (!an.sx && !ek && !an.fall && S.carry > 0.8 && c.hasPuck && c.opp && !(an.sxCool > 0) && c.speed > 6 && an.clos > 12 && c.opp.d > 3 && c.opp.d < 15) {
    const od = c.opp.d, os = c.opp.s, n = (an.sxN = (an.sxN | 0) + 1), h = hv(p.id | 0, n * 7 + 1);
    if (h < 0.7) {
      let v;
      if (od < 8 && Math.abs(os) < 2.5) v = h < 0.3 ? 'deke_between_legs' : (c.speed < 20 ? 'deke_spin' : 'deke_between_legs');
      else if (od < 11) v = 'deke_toe_drag'; else v = 'deke_forehand_backhand';
      an.sxv = v; an.sx = { v, t: 0, t0: 0, dur: v === 'deke_spin' ? 0.8 : 0.65, link: false, d: {}, ex: { dir: os > 0 ? -1 : 1 }, sgn, rel: 0 };
      an.sxCool = 2.6 + 2 * h;
    } else an.sxCool = 1.2;
  }
  // stick-on-stick battle: no puck on us, an opponent right on top of us, slow
  const bt = (!an.sx && !ek && !an.fall && !c.hasPuck && !an.recvT && c.opp && c.opp.d < 7 && c.speed < 13 && !c.faceoff && !c.celeb) ? 1 : 0;
  an.sxB = (an.sxB || 0) + (bt - (an.sxB || 0)) * (1 - Math.exp(-(bt ? 9 : 6) * dt)); an.sxT = (an.sxT || 0) + dt;
  const sx = an.sx;
  if (!sx && an.sxB < 0.01) return null;
  E.yaw = E.bf = E.bs = E.bh = E.hh = E.cr = E.pitch = E.head = E.hp = E.wt = E.roll = E.stance = E.free = E.spin = E.tilt = 0; E.hand = null; E.kick = null; E.label = '';
  if (an.sxB > 0.01) {
    const b = an.sxB, w = an.sxT * 9; E.bs += sgn * 0.22 * Math.sin(w) * b; E.bf += (-0.1 + 0.06 * Math.sin(w + 1)) * b; E.bh += 0.05 * (0.5 + 0.5 * Math.sin(2 * w)) * b; E.hp += 0.06 * Math.sin(w + 2) * b;
    E.cr += 0.2 * b; E.stance += 0.2 * b; E.pitch += 0.15 * b; E.roll += 0.06 * Math.sin(w * 0.5) * b; if (b > 0.5) E.label = 'stick_battle';
  }
  if (!sx) return E;
  sx.t += dt;
  const t = sx.t, D = sx.dur, v = sx.v, ein = sx.link ? es((t - sx.t0) / 0.07 + 0.15) : 1;
  if (t > D) { an.sx = null; return E.label ? E : null; }
  const R = sx.rel;
  switch (v) {
    case 'shot_quick': E.yaw = sgn * kf(t, [[0, 0], [0.08, 0.15], [0.3, 0]]); E.bh = kf(t, [[0, 0], [0.1, 0], [0.16, 0.1], [0.35, 0]]); E.cr = 0.1 * kf(t, [[0, 1], [0.35, 0]]); E.hp = 0.04 * kf(t, [[0, 1], [0.12, 0]]); E.label = 'shot_quick'; break;
    case 'shot_backhand': E.bh = kf(t, [[0, 0], [0.12, 0], [0.22, 0.22], [0.4, 0.18], [D, 0]]); E.pitch = kf(t, [[0, 0.1], [0.3, 0.2], [D, 0]]); E.cr = 0.1 * kf(t, [[0, 1], [D, 0]]); E.roll = sgn * 0.1 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.label = 'shot_backhand'; break;
    case 'shot_volley': E.cr = kf(t, [[0, 0.35], [0.2, 0.25], [D, 0]]); E.pitch = kf(t, [[0, 0.15], [0.2, 0.2], [D, 0]]); E.bh = kf(t, [[0, 0], [0.1, 0], [0.2, 0.3], [0.5, 0.35], [D, 0]]); E.stance = 0.2 * kf(t, [[0, 1], [D, 0]]); E.label = 'shot_volley'; break;
    case 'pass_saucer': E.bh = kf(t, [[0, 0], [0.12, 0], [0.24, 0.32], [0.45, 0.4], [D, 0]]); E.hh = 0.06 * kf(t, [[0, 0], [0.24, 1], [D, 0]]); E.roll = sgn * 0.12 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.cr = 0.1 * kf(t, [[0, 1], [D, 0]]); E.label = 'pass_saucer'; break;
    case 'pass_drop': E.bf = kf(t, [[0, 0], [0.14, 0], [0.28, -0.45], [0.5, -0.2], [D, 0]]); E.yaw = -cl(R, -0.7, 0.7) * 0.6 * kf(t, [[0, 0], [0.14, 1], [0.4, 0.8], [D, 0]]); E.head = cl(R, -1.4, 1.4) * 0.6 * kf(t, [[0, 0.1], [0.3, 1], [D, 0]]); E.cr = 0.15 * kf(t, [[0, 1], [D, 0]]); E.label = 'pass_drop'; break;
    case 'pass_slap': E.bh = kf(t, [[0, 0], [0.12, 0], [0.22, 0.55], [0.45, 0.45], [D, 0]]); E.bf = kf(t, [[0, 0], [0.14, 0], [0.28, 0.45], [0.5, 0.2], [D, 0]]); E.yaw = sgn * kf(t, [[0, 0], [0.15, 0.5], [0.4, 0.3], [D, 0]]); E.hh = 0.15 * kf(t, [[0, 0], [0.22, 1], [D, 0]]); E.wt = 0.6 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.cr = 0.2 * kf(t, [[0, 1], [D, 0]]); E.label = 'pass_slap'; break;
    case 'pass_onehand': E.free = kf(t, [[0, 0], [0.1, 0], [0.22, 1], [0.5, 1], [D, 0]]); E.hp = kf(t, [[0, 0], [0.15, 0], [0.25, -0.1], [D, 0]]); E.label = 'pass_onehand'; break;
    case 'pass_bank': { const wr = sx.ex.wr; E.head = cl(wr, -1.2, 1.2) * 0.8 * kf(t, [[0, 0.5], [0.2, 1], [D, 0]]); E.bs = Math.sin(wr) * 0.25 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.bf = 0.1 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.cr = 0.2 * kf(t, [[0, 1], [D, 0]]); E.hp = 0.05; E.label = 'pass_bank'; break; }
    case 'pass_backhand': E.bh = 0.15 * kf(t, [[0, 0], [0.15, 0], [0.25, 1], [D, 0]]); E.pitch = 0.1 * kf(t, [[0, 1], [D, 0]]); break;
    case 'recv_glove': { const z = cl(sx.ex.z, 0, 3.2), hp0 = 0.3 + z * 0.3048 * 1.0, w = kf(t, [[0, 0], [0.08, 1], [0.3, 1], [0.5, 0], [D, 0]]); HAND.f = 0.62 + 0.08 * kf(t, [[0, 0], [0.12, 1], [0.4, 0]]); HAND.s = -sgn * 0.12 + cl(sx.ex.ps, -0.6, 0.6) * 0.3; HAND.h = kf(t, [[0, hp0], [0.28, hp0], [0.5, 0.8]]); HAND.w = w; E.hand = HAND; E.free = w; E.pitch = 0.12 * w; E.cr = 0.15 * w; E.label = 'recv_glove'; break; }
    case 'recv_tip': E.bf = kf(t, [[0, 0.25], [0.15, 0.3], [D, 0]]); E.yaw = -sgn * 0.2 * kf(t, [[0, 1], [D, 0]]); E.cr = 0.25 * kf(t, [[0, 1], [0.3, 1], [D, 0]]); E.stance = 0.2 * kf(t, [[0, 1], [D, 0]]); E.free = kf(t, [[0, 0.7], [0.3, 0.7], [D, 0]]); E.hp = -0.1 * kf(t, [[0, 1], [D, 0]]); E.label = 'recv_tip'; break;
    case 'recv_cradle': { const o = Math.sin(t * 26) * Math.exp(-t * 4.5); E.bh = 0.09 * o; E.bf = 0.06 * o; E.hp = 0.1 * o; E.cr = 0.12 * kf(t, [[0, 1], [D, 0]]); E.label = 'recv_cradle'; break; }
    case 'recv_kick': { const kk = kf(t, [[0, 0], [0.12, 1], [0.26, 1], [0.5, 0], [D, 0]]); KICK.s = sx.ex.ps > 0 ? 'l' : 'r'; KICK.k = kk; E.kick = KICK; E.cr = 0.2 * kk; E.pitch = 0.1 * kk; E.wt = 0.5 * kk; E.label = 'recv_kick'; break; }
    case 'recv_reach': { const w = kf(t, [[0, 0], [0.1, 1], [0.35, 1], [D, 0]]); E.free = w; E.hp = -0.2 * w; E.pitch = 0.2 * w; E.roll = -Math.sign(sx.ex.ps) * 0.15 * w; E.hh = 0.15 * w; E.label = 'recv_reach'; break; }
    case 'recv_backhand': E.yaw = sgn * kf(t, [[0, -0.35], [0.25, -0.25], [D, 0]]); E.bh = 0.08 * kf(t, [[0, 1], [D, 0]]); E.cr = 0.1 * kf(t, [[0, 1], [D, 0]]); E.label = 'recv_backhand'; break;
    case 'poke_dive': E.pitch = 0.9 * kf(t, [[0, 0], [0.1, 1], [0.3, 1], [D, 0]]); E.cr = 0.7 * kf(t, [[0, 0], [0.1, 1], [0.3, 0.85], [D, 0]]); E.bf = 0.25 * kf(t, [[0, 0], [0.1, 1], [0.3, 1], [D, 0]]); E.wt = kf(t, [[0, 0], [0.1, 1], [D, 0]]); E.stance = 0.4 * kf(t, [[0, 0], [0.1, 1], [D, 0]]); break;
    case 'deke_forehand_backhand': E.bs = sgn * kf(t, [[0, 0], [0.12, 0.5], [0.32, -0.55], [0.5, 0.1], [D, 0]]); E.bf = 0.05 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.yaw = sgn * kf(t, [[0, 0], [0.15, 0.25], [0.32, -0.25], [D, 0]]); E.roll = sgn * kf(t, [[0, 0], [0.15, 0.18], [0.32, -0.18], [D, 0]]); E.cr = 0.1; E.label = v; break;
    case 'deke_toe_drag': E.bs = sgn * kf(t, [[0, 0], [0.14, 0.7], [0.34, -0.1], [0.5, 0], [D, 0]]); E.bf = kf(t, [[0, 0], [0.14, 0.1], [0.34, -0.3], [D, 0]]); E.bh = 0.05 * kf(t, [[0, 0], [0.34, 1], [D, 0]]); E.wt = -0.5 * kf(t, [[0, 0], [0.2, 1], [D, 0]]); E.cr = 0.25 * kf(t, [[0, 0], [0.15, 1], [D, 0]]); E.pitch = 0.15; E.roll = sgn * 0.15 * kf(t, [[0, 0], [0.15, 1], [0.4, -0.6], [D, 0]]); E.label = v; break;
    case 'deke_between_legs': E.bf = kf(t, [[0, 0], [0.14, -0.5], [0.3, -0.85], [0.46, -0.3], [D, 0]]); E.bs = sgn * kf(t, [[0, 0], [0.2, 0.1], [0.34, -0.3], [0.46, -0.1], [D, 0]]); E.cr = 0.35 * kf(t, [[0, 0], [0.12, 1], [0.5, 1], [D, 0]]); E.pitch = 0.2 * kf(t, [[0, 0], [0.12, 1], [D, 0]]); E.hp = 0.3 * kf(t, [[0, 0], [0.14, 1], [0.4, 1], [D, 0]]); E.label = v; break;
    case 'deke_spin': E.spin = sx.ex.dir * 2 * Math.PI * kf(t, [[0, 0], [0.1, 0.04], [0.68, 1], [D, 1]]); E.cr = 0.3 * kf(t, [[0, 0], [0.1, 1], [0.6, 1], [D, 0]]); E.pitch = 0.1; E.label = v; break;
    default: return E.label ? E : null;
  }
  // everything but the spin eases in with the base layer for the linked (shot / pass) variants
  if (sx.link) { E.yaw *= ein; E.bf *= ein; E.bs *= ein; E.bh *= ein; E.hh *= ein; E.cr *= ein; E.pitch *= ein; E.head *= ein; E.hp *= ein; E.wt *= ein; E.roll *= ein; E.stance *= ein; }
  // at the end of the root-spin the angle must be a whole turn so it vanishes without a pop
  if (v === 'deke_spin' && t >= D - 1e-3) E.spin = 0;
  return E;
};

/* skate kick: the leg on the puck side swings in and flicks the puck up onto the blade */
SH.legs = function (pose, X) {
  const k = X.kick, sd = k.s, o = sd === 'l' ? 1 : -1;
  pose['thigh_' + sd].p -= 0.45 * k.k; pose['calf_' + sd].p += 0.3 * k.k;
};

/* render hook for the puck mesh: spin about its own axis in flight, tilted on lifted shots / saucer passes */
const _q = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null, _q2 = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null, _ax = typeof THREE !== 'undefined' ? new THREE.Vector3() : null, _up = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;
SH.puckFx = function (mesh, pk) {
  const L = SH.last, now = performance.now();
  if (!L || pk.owner || now - L.t > 900 || Math.hypot(pk.vx || 0, pk.vy || 0) < 25) { if (mesh.userData.shFx) { mesh.quaternion.identity(); mesh.userData.shFx = false; } return; }
  mesh.userData.shFx = true; _q.setFromAxisAngle(_up, (now * 0.045) % 6.2832);
  if (L.tilt) { const v = Math.hypot(pk.vx, pk.vy) || 1, f = Math.max(0, 1 - (now - L.t) / 700); _ax.set(pk.vy / v, 0, -pk.vx / v); _q2.setFromAxisAngle(_ax, L.tilt * f); _q.premultiply(_q2); }
  mesh.quaternion.copy(_q);
};

ANIM.shots = SH;
})();
