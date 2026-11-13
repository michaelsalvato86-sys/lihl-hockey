(function () {
/* Physical play animation: checks, hits, board checks, fouls, falls and getting up, dazed reactions, fights.
   Everything here is cosmetic. It reads sim events (check, checked, fall, poke, plus fight state G.fight and penalties) and adds layers on top of
   anim_ctrl (channel offsets, joint offsets, hand targets, root roll/pitch). The hitter and the victim pick the same class from the shared event data
   (power, board, net-front), both clocks start at contact, so the two animations line up in time and direction. No authoritative state is written. */
'use strict';
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const K = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
const hv = (id, k) => { let h = (((id | 0) * 2654435761) ^ (k * 40503)) >>> 0; h = ((h ^ (h >>> 15)) * 2246822519) >>> 0; return (h % 10000) / 10000; };
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const HITS = window.HITS = { on: true, dbg: false };
const ANIM = window.ANIM;

/* ---------- extra fall types (roll/pitch curves as in ANIM.FALLS; gu = getting-up style, gs = time the getting up starts) ---------- */
const F = ANIM && ANIM.FALLS;
if (F) {
  Object.assign(F, {
    trip: { dur: 2.3, roll: [[0, 0], [2.3, 0]], pitch: [[0, 0], [0.14, 0.55], [0.3, 1.44], [1.2, 1.44], [1.7, 0.7], [2.3, 0]], amp: 0.9, sag: 0, lie: 1, gu: 'stomach', gs: 1.2, kick: 1 },
    hipflip: { dur: 2.1, roll: [[0, 0], [0.28, 1.3], [0.4, 1.3], [1.1, 1.3], [1.7, 0.45], [2.1, 0]], pitch: [[0, 0], [0.2, -0.3], [1.1, -0.3], [2.1, 0]], amp: 1, sag: 0, gu: 'side', gs: 1.1, kick: 0.9 },
    crumple: { dur: 2.4, roll: [[0, 0], [2.4, 0]], pitch: [[0, 0], [0.25, -0.5], [0.7, -1.25], [1.4, -1.25], [1.9, -0.45], [2.4, 0]], amp: 0.85, sag: 0.4, gu: 'back', gs: 1.4 },
    bounce: { dur: 1.9, roll: [[0, 0], [0.1, 0.5], [0.3, -0.3], [0.55, 0.3], [1.1, 0.1], [1.9, 0]], pitch: [[0, 0], [0.1, 0.45], [0.3, -0.45], [0.5, 0.2], [0.9, 0.45], [1.9, 0]], amp: 0.8, sag: 0.8, gu: 'knees', gs: 1.0 },
    slump: { dur: 2.2, roll: [[0, 0], [0.2, 0.5], [0.8, 0.6], [1.6, 0.2], [2.2, 0]], pitch: [[0, 0], [0.2, 0.3], [0.6, 0.35], [1.4, 0.3], [2.2, 0]], amp: 0.7, sag: 1.2, gu: 'knees', gs: 1.3 },
    wrestle: { dur: 2.0, roll: [[0, 0], [0.4, 0.6], [1.3, 0.6], [2.0, 0]], pitch: [[0, 0], [0.4, 0.65], [1.3, 0.65], [2.0, 0]], amp: 0.7, sag: 1, gu: 'knees', gs: 1.2 },
    stagger: { dur: 1.5, roll: [[0, 0], [0.12, 0.3], [0.4, -0.25], [0.7, 0.2], [1.0, -0.1], [1.5, 0]], pitch: [[0, 0], [0.15, 0.5], [0.6, 0.35], [1.5, 0]], amp: 0.45, sag: 0.2, gu: 'stumble', gs: 0.8 }
  });
  // existing kinds get a getting-up style too (cosmetic extras on top of their curves)
  Object.assign(F.side, { gu: 'side', gs: 1.0 }); Object.assign(F.fwd, { gu: 'stomach', gs: 1.0 }); Object.assign(F.back, { gu: 'back', gs: 1.0 }); Object.assign(F.knees, { gu: 'knees', gs: 0.9 });
}
if (ANIM) Object.assign(ANIM.dur, { hookv: 0.9, holdv: 1.3, slashv: 0.7, liftv: 0.7, interfv: 0.8, punch: 0.5, punched: 0.55 });

/* ---------- class selection (hitter and victim use the same inputs, so they agree) ---------- */
function nearNet(p) {
  try { if (typeof W === 'undefined' || !p || p.x === undefined) return false; return (p.x < GX + 16 || p.x > W - GX - 16) && Math.abs(p.y - MY) < 15; } catch (e) { return false; }
}
HITS.nearNet = nearNet;
HITS.pick = function (d, p) {
  if (d.cls) return d.cls;
  const pw = d.power === undefined ? 0.6 : d.power, bd = !!d.board, r = hv(Math.round(pw * 997), bd ? 3 : 5), nf = d.nf !== undefined ? d.nf : false;
  let cls;
  if (bd) cls = (pw > 0.82 && r > 0.6) ? 'crosscheck' : (nf ? 'netshove' : 'board');
  else if (nf && pw < 0.75) cls = 'netshove';
  else if (pw < 0.3) cls = 'bump';
  else if (pw < 0.55) cls = r < 0.5 ? 'shoulder' : 'hip';
  else if (pw < 0.8) cls = r < 0.15 ? 'elbow' : r < 0.5 ? 'hip' : 'openice';
  else cls = r < 0.1 ? 'elbow' : 'openice';
  d.cls = cls; return cls;
};
HITS.classes = ['bump', 'shoulder', 'hip', 'openice', 'board', 'crosscheck', 'elbow', 'netshove'];
const DUR = { bump: [0.6, 0.8], shoulder: [0.85, 1.0], hip: [0.9, 1.15], openice: [1.0, 1.3], board: [1.25, 1.7], crosscheck: [1.0, 1.25], elbow: [0.85, 1.15], netshove: [0.95, 1.0], punch: [0.5, 0.55] };

/* ---------- variants. Each returns channel offsets (see apply). c: pw, rc (target dir clipped), rs (sin), cd/sd (victim push cos/sin), bd, from, ph (hitter reach side) ---------- */
const HIT = {
  bump: (u, c) => { const L = K(u, [[0, 0.6], [0.1, 1], [0.4, 0.3], [0.6, 0]]); return { hands: { L: [0.72, 0.28, 1.2], k: 0.8 * L }, yaw: c.rc * 0.5 * L, pitch: 0.18 * L, roll: c.rs * 0.2 * L, wt: 0.6 * L, hp: 0.15 * L, cr: 0.1 * L, head: c.rc * 0.6 * L }; },
  shoulder: (u, c) => { const L = K(u, [[0, 0.5], [0.08, 1], [0.35, 0.8], [0.7, 0]]); return { hands: { L: [0.42, 0.3, 1.42], R: [0.42, -0.3, 1.42], k: 0.85 * L }, yaw: c.rc * 0.9 * L * (0.7 + 0.4 * c.pw), roll: c.rs * 0.45 * L, pitch: 0.3 * L, cr: 0.3 * L, wt: L, st: 0.2 * L, hp: 0.3 * L, bf: -0.25 * L, head: c.rc * 0.7 * L }; },
  hip: (u, c) => { const L = K(u, [[0, 0.4], [0.09, 1], [0.4, 0.8], [0.85, 0]]); return { yaw: -c.rc * 0.7 * L, roll: c.rs * 0.6 * L, pitch: 0.08 * L, cr: 0.4 * L, st: 0.4 * L, wt: 0.8 * L, hp: 0.25 * L, bh: 0.3 * L, head: c.rc * 0.9 * L, J: { pelvis: { y: -c.rc * 0.35 * L } } }; },
  openice: (u, c) => {
    const L = K(u, [[0, 0.5], [0.07, 1], [0.4, 0.85], [0.8, 0.2], [1.0, 0]]), o = { yaw: c.rc * 1.2 * L * c.pwf, roll: c.rs * 0.55 * L, pitch: 0.55 * L * c.pwf, cr: 0.5 * L, st: 0.3 * L, bf: -0.5 * L, wt: 1.2 * L, hp: 0.25 * L, bh: 0.7 * L, head: c.rc * 0.8 * L, rp: 0.1 * K(u, [[0, 0], [0.1, 1], [0.6, 0.3], [1, 0]]) };
    if (c.from === 'behind') { o.pitch = 0.8 * L; o.hands = { L: [0.85, 0.25, 1.35], R: [0.85, -0.25, 1.32], k: K(u, [[0, 0.4], [0.08, 1], [0.5, 0.8], [1, 0]]) }; }
    else if (c.from === 'front') { o.yaw *= 0.45; o.st += 0.2 * L; o.cr += 0.1 * L; o.J = { Head: { p: 0.25 * L } }; }
    else { o.bs = c.sg * 0.3 * L; o.hh = 0.1 * L; }
    return o;
  },
  board: (u, c) => { const L = K(u, [[0, 0.5], [0.1, 1], [0.75, 1], [1.2, 0]]); return { yaw: c.rc * 0.7 * L, pitch: 0.7 * L, roll: c.rs * 0.3 * L, cr: 0.45 * L, st: 0.35 * L, wt: L, bf: -0.35 * L, hp: 0.2 * L, head: c.rc * 0.6 * L, hands: { L: [0.6, 0.22, 1.05], R: [0.6, -0.22, 1.02], k: K(u, [[0, 0], [0.08, 1], [0.8, 1], [1.2, 0]]) } }; },
  crosscheck: (u, c) => { const f = 0.45 + 0.5 * K(u, [[0, 0], [0.08, 1], [0.5, 0.7], [0.9, 0]]), k = K(u, [[0, 0.5], [0.05, 1], [0.6, 1], [0.95, 0]]); return { yaw: c.rc * 0.4 * k, pitch: 0.35 * k, cr: 0.3 * k, st: 0.3 * k, wt: k, head: c.rc * 0.5 * k, hands: { L: [f, 0.42, 1.38], R: [f + 0.05, -0.38, 1.36], k, cross: 1 } }; },
  elbow: (u, c) => { const k = K(u, [[0, 0.5], [0.07, 1], [0.4, 0.7], [0.8, 0]]); return { yaw: c.rc * 1.3 * k, pitch: 0.25 * k, roll: c.rs * 0.3 * k, cr: 0.2 * k, wt: 0.8 * k, head: c.rc * 0.5 * k, hands: { L: [0.28, 0.15 + 0.2 * k, 1.52], R: [0.3, -0.4, 1.3], k } }; },
  netshove: (u, c) => { const k = K(u, [[0, 0.5], [0.08, 1], [0.6, 0.8], [0.95, 0]]); return { yaw: c.rc * 0.5 * k, pitch: 0.4 * k, cr: 0.3 * k, st: 0.25 * k, wt: k, bf: -0.2 * k, head: c.rc * 0.5 * k, hands: { L: [0.9 + 0.1 * k, 0.28, 1.25], k: k * 0.9 } }; }
};
const VIC = {
  bump: (u, c) => ({ pitch: 0.25 * c.pw * c.cd * K(u, [[0, 1], [0.2, 0.4], [0.6, 0]]) + 0.1, roll: 0.3 * c.sd * K(u, [[0, 1], [0.25, 0.3], [0.7, 0]]), head: -0.5 * c.sd * K(u, [[0, 1], [0.4, 0]]), wt: 0.4 * K(u, [[0, 1], [0.4, 0]]), hp: 0.1, yaw: 0.2 * c.sd * K(u, [[0, 1], [0.5, 0]]) }),
  shoulder: (u, c) => { const R = K(u, [[0, 1], [0.14, 1], [0.5, 0.25], [1, 0]]), g = Math.sin(u * 13) * Math.exp(-u * 2.4); return { yaw: c.sd * 0.8 * c.pw * R, roll: c.sd * 0.6 * c.pw * R + 0.18 * g, pitch: 0.4 * c.pw * c.cd * R, head: -c.sd * 0.9 * R, fl: 0.5 * R, cr: 0.3 * R, st: 0.3 * R, wt: 0.5 * g, J: { thigh_l: { p: -0.4 * g }, thigh_r: { p: 0.4 * g } } }; },
  hip: (u, c) => { const R = K(u, [[0, 0], [0.12, 1], [0.45, 0.6], [1.1, 0]]); return { rr: c.sd * 0.8 * c.pw * R, roll: c.sd * 0.3 * R, pitch: -0.2 * R, head: -c.sd * R, fl: R, cr: 0.35 * R, yaw: -c.sd * 0.4 * R, J: { thigh_l: { p: -0.55 * R }, thigh_r: { p: -0.55 * R }, calf_l: { p: 0.5 * R }, calf_r: { p: 0.5 * R } } }; },
  openice: (u, c) => {
    const R = K(u, [[0, 1], [0.16, 1], [0.6, 0.3], [1.3, 0]]), g = Math.sin(u * 12) * Math.exp(-u * 2.2), o = { yaw: c.sd * 0.9 * c.pw * R, roll: c.sd * 0.8 * c.pw * R + 0.16 * g, pitch: 0.5 * c.pw * c.cd * R, head: -c.sd * 0.9 * R, fl: R, cr: 0.45 * R, st: 0.3 * R, wt: 0.5 * g, J: { thigh_l: { p: -0.45 * g }, thigh_r: { p: 0.45 * g } } };
    if (c.from === 'behind') { o.pitch = 0.95 * c.pw * R; o.J.Head = { p: -0.55 * R }; o.rp = 0.15 * R; }
    else if (c.from === 'front') { o.pitch = -0.85 * c.pw * R; o.cr += 0.2 * R; o.J.Head = { p: -0.5 * R }; o.rp = -0.15 * R; }
    return o;
  },
  board: (u, c) => {
    const P = K(u, [[0, 0], [0.07, 1], [0.35, 1], [0.6, -0.5], [0.95, 0.2], [1.5, 0]]), sg = c.cd >= 0 ? 1 : -1, rat = Math.sin(u * 34) * Math.exp(-u * 4), hit = K(u, [[0, 0], [0.07, 1], [0.4, 0.7], [0.8, 0]]);
    return { pitch: 0.75 * c.pwf * P * sg, rp: 0.12 * P * sg, rr: 0.06 * rat, roll: c.sd * 0.4 * hit, yaw: c.sd * 0.4 * hit, head: -0.9 * hit * (c.sd || 1) * 0.6, cr: 0.35 * hit, st: 0.25 * hit, fl: 0.6 * hit, J: { Head: { p: -0.4 * hit * rat0(u) } }, hands: { L: [0.7, 0.35, 1.5], R: [0.7, -0.35, 1.5], k: K(u, [[0, 0], [0.1, 0.85], [0.5, 0.85], [1.0, 0]]) } };
  },
  crosscheck: (u, c) => { const R = K(u, [[0, 1], [0.15, 1], [0.6, 0.35], [1.25, 0]]), g = Math.sin(u * 10) * Math.exp(-u * 2.2); return { pitch: -0.5 * c.pw * R, rp: -0.1 * R, yaw: c.sd * 0.3 * R, roll: 0.2 * g, head: -0.5 * R, fl: R, cr: 0.35 * R, wt: -0.6 * R, J: { thigh_l: { p: -0.5 * g }, thigh_r: { p: 0.5 * g }, Head: { p: -0.35 * R } } }; },
  elbow: (u, c) => { const R = K(u, [[0, 0], [0.06, 1], [0.5, 0.5], [1.1, 0]]); return { head: -c.sd * 0.8 * R, yaw: c.sd * 0.6 * R, pitch: -0.2 * R, roll: c.sd * 0.4 * R, fl: 0.7 * R, cr: 0.25 * R, J: { Head: { y: -c.sd * 0.4 * R } }, hands: { L: [0.45, 0.1, 1.62], k: K(u, [[0, 0], [0.1, 0.9], [0.6, 0.7], [1.1, 0]]) } }; },
  netshove: (u, c) => { const R = K(u, [[0, 1], [0.15, 1], [0.6, 0.3], [1, 0]]), g = Math.sin(u * 11) * Math.exp(-u * 2.5); return { pitch: 0.35 * c.pw * c.cd * R + 0.1 * R, yaw: c.sd * 0.4 * R, roll: 0.15 * g, fl: 0.3 * R, cr: 0.25 * R, st: 0.2 * R, head: -0.4 * c.sd * R, bf: 0.4 * R, hh: -0.2 * R, hp: -0.1 * R, J: { thigh_l: { p: -0.3 * g }, thigh_r: { p: 0.3 * g } }, hands: { L: [0.55, 0.5, 1.05], k: 0.7 * R } }; },
  hookv: (u, c) => { const R = K(u, [[0, 0], [0.1, 1], [0.5, 0.4], [0.85, 0]]); return { pitch: -0.45 * R, head: -0.3 * R, yaw: c.sd * 0.3 * R, fl: 0.6 * R, cr: 0.2 * R, wt: -0.8 * R, J: { thigh_l: { p: 0.3 * R }, calf_l: { p: -0.2 * R } } }; },
  holdv: (u, c) => { const R = K(u, [[0, 0], [0.15, 1], [1.0, 1], [1.3, 0]]), s = Math.sin(u * 9); return { yaw: c.sd * 1.0 * R, roll: c.sd * 0.3 * R + 0.12 * s * R, pitch: 0.15 * R, cr: 0.3 * R, st: 0.3 * R, wt: -0.6 * R, head: -c.sd * 0.5 * R, fl: 0.4 * R, hands: { L: [0.5, 0.6 * (c.sd || 1), 1.2], k: 0.7 * R } }; },
  slashv: (u, c) => { const R = K(u, [[0, 0], [0.06, 1], [0.35, 0.6], [0.7, 0]]); return { hh: 0.5 * K(u, [[0, 0], [0.05, 1], [0.3, 0.2], [0.7, 0]]), hp: -0.1 * R, head: c.sd * 0.5 * R, pitch: 0.15 * R, roll: c.sd * 0.15 * R, fl: R, cr: 0.15 * R }; },
  liftv: (u, c) => { const R = K(u, [[0, 0], [0.06, 1], [0.25, 0.4], [0.5, 0]]); return { bh: 0.9 * R, hp: -0.15 * R, fl: 0.5 * R, pitch: 0.12 * R, bf: 0.15 * R, hh: 0.25 * R, head: -0.3 * R }; },
  interfv: (u, c) => { const R = K(u, [[0, 1], [0.15, 1], [0.6, 0.3], [0.8, 0]]), g = Math.sin(u * 12) * Math.exp(-u * 2.4); return { yaw: c.sd * 0.7 * R, roll: c.sd * 0.4 * R + 0.1 * g, pitch: 0.2 * R * c.cd, head: -c.sd * 0.6 * R, fl: 0.4 * R, cr: 0.2 * R, st: 0.2 * R }; }
};
function rat0(u) { return Math.sin(u * 30) * Math.exp(-u * 4); }

/* ---------- fights ---------- */
function fightInfo(p) {
  if (p.fx) return p.fx;
  try { const f = (typeof G !== 'undefined' && G) ? G.fight : null; if (f && (f.a === p || f.b === p)) { const foe = f.a === p ? f.b : f.a; return { mode: 'fight', t: f.t, e: 4.2 - f.t, foe, win: (f.sc >= 0) === (f.a === p) }; } } catch (e) { }
  return null;
}
HITS.fightInfo = fightInfo;
// hand targets for a fight phase. e: seconds since the start. ret: {L,R,k, drop}
function fightPose(F, hx, ev, u, ek, dt, c) {
  const e = F.e, t = F.t, o = { yaw: 0, pitch: 0, roll: 0, cr: 0, st: 0, wt: 0, head: 0, hh: 0, fl: -1, J: {}, hands: null, label: 'fight' };
  const sway = Math.sin(e * 5.2 + hx.fp) , sw2 = Math.cos(e * 3.7 + hx.fp);
  const gl = es(e / 1.1), ground = K(e, [[2.7, 0], [3.4, 1]]), sep = K(e, [[3.4, 0], [3.65, 1]]);
  o.yaw = 0.25 * gl; o.cr = 0.35 * gl + 0.4 * ground; o.st = 0.35 * gl; o.pitch = 0.25 * gl + 0.4 * ground; o.head = 0.2 * sway * gl;
  o.hh = 0;
  // guard / grab: left hand holds the jersey at the shoulder, right hand cocked back; both arms tangle when wrestling to the ice; pinned and straining when the linesmen hold them
  let L = [0.78, 0.18, 1.42], R = [0.1, -0.38, 1.28], k = gl;
  if (ground > 0.01) { L = [0.8, 0.3 + 0.08 * sway, 1.22 - 0.1 * ground]; R = [0.8, -0.3 - 0.08 * sway, 1.2 - 0.1 * ground]; }
  if (sep > 0.01) { L = [0.12, 0.5, 1.0]; R = [0.12, -0.5, 1.0]; o.pitch += 0.25 * sep * (0.5 + 0.5 * Math.sin(e * 9)); o.yaw += 0.3 * sep * Math.sin(e * 7); o.roll += 0.2 * sep * Math.sin(e * 8 + 1); }
  // rhythmic pulling and pushing while holding on
  o.roll += 0.14 * sway * gl * (1 - sep); o.pitch += 0.1 * sw2 * gl * (1 - ground);
  o.J = { thigh_l: { p: -0.15 * sway * gl }, thigh_r: { p: 0.15 * sway * gl } };
  // punch / punched (sim 'check' / 'checked' events during the fight)
  if (ek === 'check' && ev) {
    const hand = (ev.id0 & 1) ? 'L' : 'R', s = (hand === 'R' ? -1 : 1), w = K(u, [[0, 0], [0.12, -0.3], [0.2, 1], [0.32, 0.6], [0.5, 0]]), wind = K(u, [[0, 0], [0.12, 1], [0.2, 0], [0.5, 0]]);
    const pa = hand === 'R' ? [0.1 + 1.15 * w, -0.38 + 0.38 * w + 0.15 * wind, 1.28 + 0.12 * w + 0.2 * wind] : [0.1 + 1.15 * w, 0.38 - 0.4 * w - 0.15 * wind, 1.28 + 0.12 * w + 0.2 * wind];
    if (hand === 'R') R = pa; else L = pa;
    o.yaw += -s * (-0.9 * wind + 0.8 * w) * 0.45; o.pitch += 0.25 * w; o.wt += w; o.roll += s * 0.25 * w; o.cr += 0.1; o.label = 'fight_punch'; k = 1;
  } else if (ek === 'checked' && ev) {
    const r = K(u, [[0, 0], [0.09, 1], [0.15, 1], [0.55, 0]]), s = ev.sd || 1;
    o.head -= s * 1.0 * r; o.pitch -= 0.3 * r; o.roll += s * 0.35 * r; o.cr += 0.15 * r; o.yaw -= s * 0.5 * r; o.label = 'fight_punched';
  }
  o.hands = { L, R, k: cl(k, 0, 1) }; if (sep > 0.01) o.label = 'fight_held';
  if (ground > 0.2 && sep < 0.5) o.label = 'fight_wrestle';
  o.drop = e > 0.05; o.dropK = es((e - 0.05) / 0.35);
  return o;
}
// linesman / escort pose: arms out to hold the fighter, leaning back with a pull
function linePose(F, hx, dt) {
  const e = F.e, hold = K(F.e, [[3.0, 0], [3.4, 1], [4.3, 1], [4.7, 0.7]]);
  return { yaw: 0.2 * hold, pitch: 0.3 * hold, cr: 0.3 * hold, st: 0.3 * hold, wt: -0.4 * hold, hands: { L: [0.62, 0.28, 1.3], R: [0.62, -0.28, 1.3], k: hold }, J: {}, label: 'linesman_hold', fl: -1 };
}

/* ---------- getting up. t: seconds into the fall; adds posture details to the base roll/pitch curves ---------- */
function getUp(an, hx, o) {
  const hxJ = hx.J;
  const f = an.fall, cf = f.cfg; if (!cf.gu) return;
  const J = (n, a, v) => { const q = (hxJ[n] = hxJ[n] || {}); q[a] = (q[a] || 0) + v; };
  const t = f.t, gs = cf.gs || 1, g = cl((t - gs) / Math.max(0.2, cf.dur - gs), 0, 1);
  if (cf.kick && t < 0.7) { const kk = K(t, [[0, 0], [0.18, 1], [0.7, 0]]) * cf.kick; J('thigh_l', 'p', 0.9 * kk); J('calf_l', 'p', 0.9 * kk); J('thigh_r', 'p', -0.4 * kk); }
  const sidn = f.side >= 0 ? 'l' : 'r', oth = sidn === 'l' ? 'r' : 'l';
  const bell = K(g, [[0, 0], [0.35, 1], [0.7, 0.7], [1, 0]]);
  if (g > 0 || t >= gs) {
    if (cf.gu === 'knees') { J('thigh_' + sidn, 'p', -0.6 * bell); J('calf_' + sidn, 'p', 0.8 * bell); J('thigh_' + oth, 'p', 0.15 * bell); o.hh -= 0.15 * bell; o.pitch += 0.1 * bell; hx.label = 'getup_knees'; }
    else if (cf.gu === 'stomach') { o.hh -= 0.5 * bell; o.bf += 0.35 * bell; o.pitch -= 0.08 * bell; J('Head', 'p', -0.35 * bell); J('thigh_' + sidn, 'p', -0.7 * bell); J('calf_' + sidn, 'p', 0.9 * bell); hx.label = 'getup_stomach'; }
    else if (cf.gu === 'back') { o.hp += 0.2 * bell; o.hh -= 0.3 * bell; o.pitch += 0.35 * bell; J('thigh_l', 'p', -0.5 * bell); J('thigh_r', 'p', -0.5 * bell); J('calf_l', 'p', 0.6 * bell); J('calf_r', 'p', 0.6 * bell); hx.label = 'getup_back'; }
    else if (cf.gu === 'side') { o.hh -= 0.3 * bell; o.roll += 0.2 * bell * f.side; J('thigh_' + sidn, 'p', -0.9 * bell); J('calf_' + sidn, 'p', 1.1 * bell); hx.label = 'getup_side'; }
    else if (cf.gu === 'stumble') { hx.label = 'getup_stumble'; }
    // a stumble right after standing: skate catches, arms flail, regain balance
    if (cf.gu === 'stumble' || f.stum || (hv(an.evId | 0, 77) < 0.35 && g > 0.7)) { const sg = cl((g - 0.65) / 0.35, 0, 1), s = 0.45 * Math.sin(sg * 5) * Math.exp(-sg * 2.5) * (sg > 0 ? 1 : 0); o.roll += 0.28 * s; J('thigh_' + oth, 'p', -0.5 * Math.abs(s)); J('calf_' + oth, 'p', 0.5 * Math.abs(s)); hx.fl = Math.max(hx.fl, 0.7 * Math.abs(s)); if (Math.abs(s) > 0.3) hx.label = 'getup_stumble'; }
  }
}

/* ---------- main layer ---------- */
const NEW = () => ({ yaw: 0, bf: 0, bs: 0, bh: 0, hh: 0, cr: 0, st: 0, pitch: 0, roll: 0, head: 0, hp: 0, wt: 0 });
HITS.layer = function (an, p, c, dt, ek, evx, sgn) {
  if (!HITS.on) return null;
  const hx = an.hx || (an.hx = { fp: hv(p.id | 0, 91) * 6, k: 0, drop: 0, J: {}, rr: 0, rp: 0, label: '', daze: 0, dzT: 0, hands: null, stickW: null, sk: 0, stk: null });
  hx.J = {}; hx.rr = 0; hx.rp = 0; hx.label = ''; hx.hands = null; hx.fl = -1;
  const F0 = fightInfo(p);
  const o = NEW(); let any = false;
  const add = r => { if (!r) return; any = true; for (const k in r) { if (k === 'J') { for (const n in r.J) { const q = (hx.J[n] = hx.J[n] || {}); for (const a in r.J[n]) q[a] = (q[a] || 0) + r.J[n][a]; } } else if (k === 'rr') hx.rr += r.rr; else if (k === 'rp') hx.rp += r.rp; else if (k === 'fl') hx.fl = Math.max(hx.fl, r.fl); else if (k === 'hands') hx.hands = r.hands; else if (k === 'label') hx.label = r.label; else if (k === 'drop' || k === 'dropK') hx[k] = r[k]; else if (k in o) o[k] += r[k]; } };
  // event: choose class once, set the event length to the class length
  let ev = null, u = 0;
  if (evx && (ek === 'check' || ek === 'checked' || VIC[ek])) {
    if (!evx.cls) {
      const d = evx.d || {};
      if (F0 && F0.mode === 'fight' && (ek === 'check' || ek === 'checked')) { evx.cls = ek === 'check' ? 'punch' : 'punched'; evx.id0 = (p.ae && p.ae.id) | 0; }
      else if (ek === 'check' || ek === 'checked') { evx.cls = HITS.pick(d, p); }
      else evx.cls = ek;
      const dd = DUR[evx.cls]; if (dd) evx.dur = dd[ek === 'check' || evx.cls === 'punch' ? 0 : 1];
      if (ek === 'checked') {
        const pw = evx.pw !== undefined ? evx.pw : 0.6;
        if (!F0 && (pw > 0.7 || (evx.board && pw > 0.5) || evx.cls === 'elbow') && hv(p.id | 0, (p.ae && p.ae.id) | 0) < 0.75) hx.daze = 1.9, hx.dzT = 0;
      }
    }
    ev = evx; u = evx.t;
    const d = evx.d || {}, pw = cl(evx.pw !== undefined ? evx.pw : (ek === 'checked' ? 0.6 : 0.6), 0.1, 1);
    const hasDir = typeof d.dir === 'number' || (d.dir && d.dir.x !== undefined), dr = evx.dr || 0;
    const rel = typeof d.rel === 'number' ? d.rel : (an.relHit || 0);
    const cc = { pw, pwf: 0.7 + 0.5 * pw, rc: cl(rel, -1, 1), rs: Math.sin(rel), sg: sgn, cd: hasDir ? Math.cos(dr) : -0.7, sd: hasDir ? Math.sin(dr) : (d.side || 1) * 0.7, bd: !!evx.board, from: d.from };
    ev.sd = cc.sd;
    const ein = es(u / 0.1), scl = r => { if (!r) return null; const q = {}; for (const k in r) { if (k === 'J') { q.J = {}; for (const n in r.J) { q.J[n] = {}; for (const a in r.J[n]) q.J[n][a] = r.J[n][a] * ein; } } else if (k === 'hands') { q.hands = Object.assign({}, r.hands, { k: r.hands.k * ein }); } else q[k] = r[k] * ein; } return q; };
    if (evx.cls === 'punch' || evx.cls === 'punched') { /* handled in fight pose */ }
    else if (ek === 'check') { add(scl(HIT[evx.cls] && HIT[evx.cls](u, cc))); hx.label = 'hit_' + evx.cls; }
    else { add(scl(VIC[evx.cls] && VIC[evx.cls](u, cc))); hx.label = 'hit_' + evx.cls + '_victim'; }
  }
  // fight
  if (F0) {
    any = true;
    let fo;
    if (F0.mode === 'line' || F0.mode === 'escort') fo = linePose(F0, hx, dt); else fo = fightPose(F0, hx, ev, u, ek, dt, c);
    // fight layer replaces the generic hit layer for the punches
    if (ev && (evx.cls === 'punch' || evx.cls === 'punched')) { /* fo already includes it */ }
    const ein = 1;
    for (const k in o) if (fo[k] !== undefined) o[k] += fo[k];
    if (fo.J) { for (const n in fo.J) { const q = (hx.J[n] = hx.J[n] || {}); for (const a in fo.J[n]) q[a] = (q[a] || 0) + fo.J[n][a]; } }
    if (fo.hands) hx.hands = fo.hands; if (fo.fl >= 0) hx.fl = Math.max(hx.fl, fo.fl);
    hx.label = fo.label; hx.fightOn = true;
    hx.drop = fo.drop ? 1 : 0; hx.dropK = fo.dropK || 0;
    if (F0.mode === 'fight') { hx.fFoe = F0.foe; }
  } else { hx.fightOn = false; hx.drop = 0; }
  // dazed after a big hit: head shake, loose legs, hands low, drive reduced
  if (hx.daze > 0 && !an.fall && !F0) {
    hx.dzT += dt; hx.daze -= dt; const z = K(hx.daze, [[0, 0], [0.5, 1], [1.9, 1]]), s = hx.dzT;
    any = true; o.head += 0.55 * z * Math.sin(s * 8) * Math.exp(-s * 0.5); o.roll += 0.18 * z * Math.sin(s * 3.1); o.cr += 0.2 * z; o.hh -= 0.12 * z; o.st += 0.25 * z; o.pitch += 0.12 * z;
    hx.J.Head = hx.J.Head || {}; hx.J.Head.y = (hx.J.Head.y || 0) + 0.35 * z * Math.sin(s * 8) * Math.exp(-s * 0.5); an.s.drive *= 1 - 0.55 * z;
    if (!ev) hx.label = 'dazed';
  }
  // getting up and fall extras
  if (an.fall) { any = true; getUp(an, hx, o); }
  // hands blend (smoothed so overrides fade in and out)
  const hk = hx.hands ? hx.hands.k : 0; hx.k += (hk - hx.k) * (1 - Math.exp(-(hk > hx.k ? 20 : 12) * dt));
  if (hx.hands) hx.last = hx.hands;
  if (hx.fl >= 0) { const S = an.s; S.flail += (hx.fl - S.flail) * (1 - Math.exp(-14 * dt)); }
  if (an.fall) { o.cr = Math.min(o.cr, 0); o.st = Math.min(o.st, 0); }
  // head: low-pass (the existing hit layer already snaps it), so the sum never pops
  { const jh = hx.J.Head || {}, hs = hx.hs || (hx.hs = { h: 0, p: 0, y: 0 }), kh = 1 - Math.exp(-9 * dt); hs.h += (o.head - hs.h) * kh; hs.p += ((jh.p || 0) - hs.p) * kh; hs.y += ((jh.y || 0) - hs.y) * kh; o.head = hs.h; hx.J.Head = { p: hs.p, y: hs.y }; if (!any && Math.abs(hs.h) + Math.abs(hs.p) + Math.abs(hs.y) > 0.01) any = true; }
  // deep crouch makes the leg IK flip (pop): keep the total crouch below the safe limit unless the body is on the ice anyway
  if (!an.fall) o.wt = Math.max(-0.5, Math.min((ek === 'check' || ek === 'checked') ? 0 : 0.3, o.wt));
  if (!an.fall) o.st = Math.min(o.st, (ek === 'check' || ek === 'checked') ? 0 : 0.15);   // wide stance on top of the existing one flips the leg IK as well
  if (!an.fall && o.cr > 0) o.cr = Math.min(o.cr, Math.max(0, 0.58 - an.s.crouch));
  if (!any && hx.k < 0.01 && !hx.stickW) return null;
  return o;
};

/* ---------- pose hook: joint offsets and root roll/pitch ---------- */
HITS.pose = function (an, m, pose, dt) {
  const hx = an.hx; if (!hx) return null;
  for (const n in hx.J) { const q = (pose[n] = pose[n] || {}); for (const a in hx.J[n]) { if (a === 'q') continue; q[a] = (q[a] || 0) + hx.J[n][a]; } }
  if (!hx.rr && !hx.rp) return null;
  return { roll: hx.rr, pitch: hx.rp };
};

/* ---------- hands hook: fist / grab / cross-check targets, dropped stick. Runs before arm IK. ---------- */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
function at(X, out, f, s, h, iceY) { out.copy(X.O).addScaledVector(X.Fb, f).addScaledVector(X.Sb, s); out.y = iceY + h; return out; }
HITS.hands = function (an, m, X, iceY, topSide, botSide, dt) {
  const hx = an.hx; if (!hx) return;
  hx.place = false; if (!hx.pT) { hx.pT = new THREE.Vector3(); hx.pH = new THREE.Vector3(); }
  if (hx.k > 0.01 && hx.last) {
    const H = hx.last, k = hx.k, topL = topSide === 'l', tl = topL ? H.L : H.R, tb = topL ? H.R : H.L;   // Left = +side (Sb); Tt = top-hand side
    const AR = window.AR, reach = (T, side) => { AR.pos(m, 'upperarm_' + side, _d); const Lr = AR.len[side].l1 + AR.len[side].l2 - 0.1; _e.copy(T).sub(_d); const dl = _e.length(); if (dl > Lr) T.copy(_d).addScaledVector(_e, Lr / dl); };
    if (tl) { at(X, _a, tl[0], tl[1], tl[2], iceY); reach(_a, topSide); X.Tt.lerp(_a, k); }
    if (tb) { at(X, _b, tb[0], tb[1], tb[2], iceY); reach(_b, botSide); X.Tb.lerp(_b, k); }
    if (tl && tb) { _c.copy(X.Tb).sub(X.Tt); if (_c.lengthSq() > 1e-4) { _c.normalize(); X.Hl.copy(X.Tt).addScaledVector(_c, 1.25); X.bd.copy(X.Fb); } }
  }
  const keep = hx.stickW && hx.ghostKeep;
  if (hx.drop || keep) {   // dropped stick: falls from the hand to the ice, then stays where it landed (world anchored)
    if (!hx.stickW) {
      const kk = hx.dropK; at(X, _a, -0.2, 0.75, 0.05, iceY); at(X, _b, 0.95, 0.9, 0.05, iceY);
      if (!hx.dT) { hx.dT = X.Tt.clone(); hx.dH = X.Hl.clone(); }
      if (kk < 1) { hx.pT.copy(hx.dT).lerp(_a, kk); hx.pH.copy(hx.dH).lerp(_b, kk); }
      else { hx.pT.copy(_a); hx.pH.copy(_b); hx.stickW = { t: m.root.localToWorld(hx.pT.clone()), h: m.root.localToWorld(hx.pH.clone()) }; }
    }
    hx.place = true;
  } else if (hx.stickW) { hx.stickW = null; hx.dT = hx.dH = null; }
  else hx.dT = hx.dH = null;
};
// replaces AR.placeStick when the stick lies on the ice. returns true if handled
HITS.place = function (an, m, X) {
  const hx = an.hx; if (!hx || !hx.place || !hx.pT) return false;
  let T, H;
  if (hx.stickW) { T = _a.copy(hx.stickW.t); H = _b.copy(hx.stickW.h); m.root.worldToLocal(T); m.root.worldToLocal(H); }
  else { T = hx.pT; H = hx.pH; }
  _c.copy(H).sub(T); _c.y = 0; if (_c.lengthSq() < 1e-4) _c.set(1, 0, 0); _c.normalize();
  const bdv = new THREE.Vector3(-_c.z, 0, _c.x);
  window.AR.placeStick(m, T, H, bdv.lengthSq() ? bdv : X.Fb);
  return true;
};

/* ---------- fall kind selection (null = leave to the existing logic) ---------- */
HITS.fallKind = function (p, d, sp0, h, an) {
  if (d.kind) return null;
  if (d.wrestle) return 'wrestle';
  const pw = d.power; if (pw === undefined) return null;
  if (d.board) return pw > 0.55 ? (h > 0.5 ? 'slump' : 'bounce') : null;
  if (d.from === 'front' && pw > 0.8) return 'crumple';
  if (d.from === 'side' && pw > 0.7 && h < 0.5) return 'hipflip';
  if (sp0 > 22 && pw > 0.6 && d.from !== 'behind' && h > 0.8) return 'stagger';
  return null;
};

/* ---------- sim hooks (host side): pair the hitter's and victim's events, fouls, poke lift, fight falls ---------- */
const sg2 = () => (typeof G !== 'undefined' && G) ? G : null;
HITS.onEvent = function (p, k, d) {
  const g = sg2(); if (!g || !p || !d) return;
  if (k === 'check') { HITS.lastCk = { p, d, id: g.aeid }; d.nf = nearNet(p); }
  else if (k === 'checked') { const l = HITS.lastCk; if (l && g.aeid - l.id <= 2) { l.d.from = d.from; d.nf = l.d.nf || nearNet(p); l.d.nf = d.nf; } else d.nf = nearNet(p); }
  else if (k === 'fall') { const f = g.fight; if (f && (f.a === p || f.b === p)) d.wrestle = true; }
  else if (k === 'poke') {
    try { const o = puck.owner; if (o && o.team !== p.team && Math.hypot(o.x - p.x, o.y - p.y) < 16) HITS.emit(o, 'liftv', { a: Math.atan2(p.y - o.y, p.x - o.x), dir: Math.atan2(o.y - p.y, o.x - p.x), side: 1 }); } catch (e) { }
  }
};
HITS.emit = function (p, k, d) { if (typeof AE === 'function') AE(p, k, d); };
// penalty called on `p` (team t): the nearest opponent shows the matching foul reaction
HITS.pen = function (t, p, why) {
  try {
    if (!p || !t || !t.opp) return; let best = null, bd = 1e9;
    for (const q of onIce(t.opp)) { if (q.box || q.on === false) continue; const dd = Math.hypot(q.x - p.x, q.y - p.y); const pri = (typeof puck !== 'undefined' && puck.owner === q) ? 6 : 0; if (dd - pri < bd) { bd = dd - pri; best = q; } }
    if (!best || bd > 20) return;
    const a = Math.atan2(p.y - best.y, p.x - best.x), side = (Math.floor((p.id | 0) + best.id | 0) % 2) ? 1 : -1, dir = Math.atan2(best.y - p.y, best.x - p.x);
    if (why === 'Tripping') HITS.emit(best, 'fall', { side, kind: 'trip', power: 0.6, from: 'behind', dir });
    else if (why === 'Hooking') HITS.emit(best, 'hookv', { a, dir, side });
    else if (why === 'Holding') HITS.emit(best, 'holdv', { a, dir, side });
    else if (why === 'Slashing') HITS.emit(best, 'slashv', { a, dir, side });
    else if (why === 'Interference') HITS.emit(best, 'interfv', { a, dir, side, power: 0.5 });
  } catch (e) { }
};

/* Online: the server sim has no HITS, so callPenalty never reached HITS.pen there. The client reads the penalty banner the server already sends
   ("PENALTY ABBR" / "Name - Why - m:ss") and plays the same victim reaction locally (cosmetic, no server code, no extra bytes). */
HITS.penBanner = function (a, b) {
  try {
    const g = sg2(); if (!g || typeof a !== 'string' || typeof b !== 'string') return false;
    const m = /^PENALTY\s+(\S+)/.exec(a); if (!m) return false;
    const parts = b.split(' - '); if (parts.length < 3) return false;
    const why = parts[parts.length - 2], name = parts.slice(0, -2).join(' - ');
    for (const t of [H1, A1]) {
      if (!t || t.abbr !== m[1] || !t.roster) continue;
      const p = t.roster.find(q => q.name === name); if (!p) continue;
      if ((g.aeid || 0) < 1000000) g.aeid = 1000000;   // local ids stay clear of server ids
      HITS.pen(t, p, why); return true;
    }
  } catch (e) { }
  return false;
};

/* ---------- render hook: linesmen and the walk to the box (called once per frame from r3d refDraw) ---------- */
HITS.fx = { lines: [], ghosts: [] };
HITS.lines = function (R, dt) {
  const g = sg2(); if (!g || typeof SK === "undefined" || !SK.makeShowman || typeof meshFor !== 'function') return;
  dt = Math.min(dt, 0.05); const fx = HITS.fx, f = g.fight, now = fx.now = (fx.now || 0) + dt;
  if (f && !fx.cur) { fx.cur = { a: f.a, b: f.b, x: (f.a.x + f.b.x) / 2, y: f.a.y, t0: now }; fx.ln = fx.ln || [0, 1].map(i => HITS.mkLine(R, i)); for (const l of fx.ln) { if (l) { l.p.x = l.sx = fx.cur.x + (l.i ? 30 : -30); l.p.y = l.sy = fx.cur.y < 42.5 ? 3 : 82; l.m.g.visible = true; } } }
  if (fx.cur && !f && !fx.cur.ended) { // fight over: fighters walk to the box with a linesman each
    const c0 = fx.cur; c0.ended = true; c0.tEnd = now; const side = c0.y < 42.5 ? 5 : 80;
    fx.ghosts = [c0.a, c0.b].map((q, i) => { const px = c0.x + (i ? 2 : -2); const gp = Object.create(q); gp.x = px; gp.y = c0.y; gp.vx = gp.vy = 0; gp.fa = i ? Math.PI : 0; gp.fx = { mode: 'escort', t: -0.5, e: 4.2, foe: null }; gp.sx = px; gp.sy = c0.y; gp.bx = 100 + (i ? 7 : -7); gp.by = side; gp.q = q; return gp; });
  }
  const c0 = fx.cur;
  if (c0 && !c0.ended && f) {
    const e = 4.2 - f.t; fx.ln.forEach((l, i) => { if (!l) return; const fi = i ? f.b : f.a, ap = es(cl(e / 3.6, 0, 1)), tx = fi.x + (i ? 1.9 : -1.9), ty = fi.y + (c0.y < 42.5 ? 2.0 : -2.0); const nx = l.sx + (tx - l.sx) * ap, ny = l.sy + (ty - l.sy) * ap; HITS.moveLine(l, nx, ny, Math.atan2(fi.y - ny, fi.x - nx), dt, { mode: 'line', t: f.t, e }, 1); });
  }
  if (c0 && c0.ended) {
    const el = now - c0.tEnd, dur = 3.2;
    if (el < dur) {
      for (const gp of fx.ghosts) {
        const q = gp.q, dx = gp.bx - gp.sx, dy = gp.by - gp.sy, len = Math.hypot(dx, dy) || 1, pr = es(cl(el / (len / 11), 0, 1)), nx = gp.sx + dx * pr, ny = gp.sy + dy * pr;
        const m = meshFor(q); const vx = (nx - gp.x) / dt, vy = (ny - gp.y) / dt; gp.x = nx; gp.y = ny; gp.vx = vx; gp.vy = vy; const sp = Math.hypot(vx, vy); if (sp > 2) gp.fa = Math.atan2(vy, vx);
        gp.acc01 = pr < 0.9 ? 0.5 : 0; gp.turn = 0; gp.ae = null;
        const ci = { puckW: { x: 0, y: 0.22, z: 0 }, opp: { d: 99, s: 0 }, vis: false, speed: sp, vf: sp, vlat: 0, hasPuck: false, key: false, faceoff: false, celeb: false, charge: 0 };
        m.g.visible = true; m.g.position.set(gp.x - W / 2, 0, gp.y - H / 2); m.g.rotation.y = -gp.fa; if (m.blob) m.blob.visible = false;
        if (m.an && m.an.hx) m.an.hx.ghostKeep = true; gp.fx = { mode: 'fight', t: -el, e: 4.2 + el, foe: null };
        ANIM.apply(m, gp, ci, dt);
      }
      fx.ln.forEach((l, i) => { if (!l) return; const gp = fx.ghosts[i]; const lx = gp.x - 2.2 * Math.cos(gp.fa), ly = gp.y + (c0.y < 42.5 ? 2.2 : -2.2); HITS.moveLine(l, lx, ly, gp.fa, dt, { mode: 'escort', t: 0.2, e: 5 }, 1); });
    } else {
      for (const gp of fx.ghosts) { const m = R.meshes && R.meshes.get(gp.q); if (m) { if (m.an && m.an.hx) { m.an.hx.ghostKeep = false; m.an.hx.stickW = null; } m.g.visible = false; } }
      for (const l of fx.ln) if (l) l.m.g.visible = false; fx.cur = null; fx.ghosts = [];
    }
  }
};
HITS.mkLine = function (R, i) {
  try {
    const p = { id: 9100 + i, name: 'Linesman', num: null, img: null, gl: false, back: false, box: false, team: { color: '#f4f4f4', accent: '#111111', dir: 1, name: 'REF' }, x: 100, y: 5, vx: 0, vy: 0, fa: 0, vis: 0, turn: 0, acc01: 0 };
    const m = SK.makeShowman(p); R.sc.add(m.g); m.inner.rotation.y = Math.PI / 2; m.g.visible = false;
    return { p, m, c: { puckW: { x: 0, y: 0.22, z: 0 }, opp: { d: 99, s: 0 }, vis: false, speed: 0, vf: 0, vlat: 0, hasPuck: false, key: false, faceoff: false, celeb: false, charge: 0 }, i, sx: 100, sy: 5 };
  } catch (e) { return null; }
};
HITS.moveLine = function (l, nx, ny, fa, dt, fx, vis) {
  const p = l.p, c = l.c, m = l.m; p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt; p.x = nx; p.y = ny; const sp = Math.hypot(p.vx, p.vy);
  const ta = sp > 3 ? Math.atan2(p.vy, p.vx) : fa; let da = wrapA(ta - p.fa); p.fa += da * Math.min(1, dt * 6); p.acc01 = sp > 3 ? 0.5 : 0; p.fx = fx;
  const ch = Math.cos(p.fa), sn = Math.sin(p.fa); c.speed = sp; c.vf = p.vx * ch + p.vy * sn; c.vlat = p.vx * sn - p.vy * ch;
  m.g.visible = true; m.g.position.set(p.x - W / 2, 0, p.y - H / 2); m.g.rotation.y = -p.fa; ANIM.apply(m, p, c, dt);
};

// chain the sim event hook (announcer installs window.AEHOOK first when it loads before this file)
{ const prev = window.AEHOOK; window.AEHOOK = function (p, k, d) { if (prev) prev(p, k, d); try { HITS.onEvent(p, k, d); } catch (e) { } }; }
})();
