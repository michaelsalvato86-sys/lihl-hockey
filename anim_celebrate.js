(function () {
/* Goal celebrations, dejection and win celebrations (cosmetic only). All new code lives here; anim_ctrl.js has small hook calls.
   Flow: game/net call CEL.onGoal / CEL.onEnd which only set p.celeb (>0 celebrate, <0 dejected; recorded by the replay already).
   ANIM.apply -> CEL.tick builds a per-skater state an.cel on the rising edge of p.celeb; the variety is a pure hash of (scorer id, goal count),
   so every client picks the same animation. Hooks: tick (state) / body (FK adds) / ground (knees, hop) / stick / arms (IK) / visual (slide, converge). */
'use strict';
const CEL = { kinds: {}, force: null, forceMate: null, S: 0 };
const es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const ramp = (u, a, b) => es((u - a) / (b - a));
const pls = (u, a, b, c, d) => ramp(u, a, b) * (1 - ramp(u, c, d));
const hv = (a, b) => { let h = (((a | 0) * 2654435761) ^ ((b | 0) * 40503)) >>> 0; h = ((h ^ (h >>> 15)) * 2246822519) >>> 0; h = ((h ^ (h >>> 13)) * 3266489917) >>> 0; return ((h ^ (h >>> 16)) >>> 0) % 100000 / 100000; };
const lerp = (a, b, t) => a + (b - a) * t;
const V3 = () => new THREE.Vector3();
const RS = .8;   // arm reach scale (the rig's arm is 0.49 m wrist to shoulder)
const T = { a: V3(), b: V3(), c: V3(), d: V3(), pole: V3(), C: V3() };

/* ---------- situation + deterministic picks ---------- */
CEL.sit = function () {
  const s = { ot: false, diff: 0, late: false, goals: 0 };
  if (typeof G !== 'undefined' && G) { s.ot = !!G.ot; if (G.score) { s.diff = Math.abs(G.score[0] - G.score[1]); s.goals = G.score[0] + G.score[1]; } s.late = (G.period | 0) >= 3 || s.ot; }
  return s;
};
const SW = {   // scorer weights [normal, ot, blowout, close-late]
  pump: [1, .2, 2, 1], kneeslide: [1.3, 3, .3, 1.8], stickraise: [1, 2, .4, 1.4], guitar: [.8, 1, .3, .9], point: [1, .2, 2, 1], helmet: [.8, .1, 2, .8],
  glass: [.7, .2, .5, .7], jumpglide: [1, 2, .4, 1.3], lap: [.8, 2, .3, 1.2], huddle: [1.2, 3, .4, 1.6]
};
CEL.pickScorer = function (id, goals, sit) {
  const col = sit.ot ? 1 : sit.diff >= 4 ? 2 : (sit.diff <= 1 && sit.late) ? 3 : 0, names = Object.keys(SW);
  let tot = 0; for (const n of names) tot += SW[n][col];
  let r = hv(id * 131 + goals, 17) * tot; for (const n of names) { r -= SW[n][col]; if (r <= 0) return n; }
  return names[0];
};
CEL.pickMate = function (id, goals, rank, scorerKind) {
  const h = hv(id * 53 + goals, 29);
  if (scorerKind === 'huddle' || scorerKind === 'kneeslide' || scorerKind === 'jumpglide') { if (rank < 2) return 'hug'; }
  if (rank === 0) return h < .5 ? 'fistbump' : 'shoulder';
  if (rank === 1) return h < .5 ? 'shoulder' : 'fistbump';
  return ['mateCheer', 'stickTap', 'mateHelmet', 'mateCheer', 'stickTap'][(h * 5) | 0];
};
const SADS = ['sadHelmet', 'sadKnees', 'sadStick'];

/* ---------- kind specs ----------
   body(u,k,A)   A(name,p,r,y) adds an FK offset (blended by the master weight)
   arms(u,k)     {l|r:[forward, outward, up]} wrist targets relative to that shoulder (only for hands that are not on the stick)
   stick(u,k)    {top:[f,left,up],bot:[..],dir:[f,left,up]} relative to the shoulder centre; null leaves the normal stick
   vis(u,k)      {lx,lz,yaw,hop,...} cosmetic placement; knee: 0..1 kneel weight; speed: skate cycle override (default 0 = standing) */
const K = CEL.kinds;
const tall = (A, k) => { A('thigh_l', .32, 0, 0); A('thigh_r', .32, 0, 0); A('calf_l', -.3, 0, 0); A('calf_r', -.3, 0, 0); };
const wide = (A, a) => { A('thigh_l', 0, a, 0); A('thigh_r', 0, a, 0); A('calf_l', 0, a, 0); A('calf_r', 0, a, 0); };

K.pump = { dur: 2.6, role: 'scorer',
  body(u, k, A) { tall(A); const b = Math.abs(Math.sin(u * 9)) * .1; A('spine_02', -.16 - b, 0, 0); A('spine_03', -.12, 0, 0); A('Head', -.25, 0, 0); },
  stick(u, k) { const w = Math.sin(u * 9) * .06; return { top: [.05, k.ts * .18, .5 + w], bot: [.05, -k.ts * .18, .5 - w] }; } };

K.stickraise = { dur: 2.6, role: 'scorer', big: 1,
  body(u, k, A) { tall(A); wide(A, .08); A('spine_02', -.2, Math.sin(u * 6) * .08, 0); A('spine_03', -.15, 0, 0); A('Head', -.35, 0, 0); },
  stick(u, k) { const s = Math.sin(u * 7) * .1; return { top: [.05, k.ts * .3 + s, .66], dir: [.0, s * 1.5, 1] }; },   // stick thrust straight up in one fist
  arms(u, k) { const o = {}; o[k.botSide] = [.1, .3, .62 + .06 * Math.sin(u * 9)]; return o; },
  vis(u, k) { return { hop: Math.max(0, Math.sin(u * 7.5)) * .16 }; } };

K.guitar = { dur: 2.6, role: 'scorer',
  body(u, k, A) { A('thigh_l', -.1, .15, 0); A('thigh_r', -.1, .15, 0); A('calf_l', .1, .15, 0); A('calf_r', .1, .15, 0); A('spine_02', -.3 + .05 * Math.sin(u * 8), 0, 0); A('spine_03', -.25, 0, k.ts * .2); A('Head', -.1 + .1 * Math.sin(u * 8), 0, 0); },
  stick(u, k) { const st = Math.sin(u * 14) * .06; return { top: [.34, k.ts * .08, .22], bot: [.2 + st, -k.ts * .08, -.42 + st * .5] }; } };

K.point = { dur: 2.6, role: 'scorer',
  body(u, k, A) { tall(A); A('spine_02', -.1, 0, 0); A('spine_03', -.08, 0, k.bs * .35); A('Head', -.2, 0, 0); },
  stick(u, k) { const w = Math.sin(u * 8) * .07; return { top: [.18, k.ts * .16, .3 + w], dir: [.2, k.ts * .5, -.8] }; },
  arms(u, k) { const o = {}; o[k.botSide] = [.2, .52, .22 + .05 * Math.sin(u * 5)]; return o; } };

K.helmet = { dur: 2.6, role: 'scorer',
  body(u, k, A) { tall(A); A('Head', .05 + .12 * Math.sin(u * 10), 0, 0); A('spine_03', -.05, 0, 0); },
  stick(u, k) { return { top: [.2, k.ts * .16, .15], dir: [.3, k.ts * .3, -.9] }; },
  arms(u, k) { const t = pls(u, .3, .55, 1.6, 1.9), o = {}; o[k.botSide] = [lerp(.3, .12, t) + (t > .5 ? .03 * Math.sin(u * 22) : 0), lerp(.4, -.08, t), lerp(.1, .3, t)]; return o; } };

K.glass = { dur: 2.6, role: 'scorer',
  body(u, k, A) { tall(A); A('spine_02', -.05, k.bs * .22, k.bs * .5); A('spine_03', -.05, k.bs * .1, k.bs * .4); A('Head', -.1, 0, 0); },
  stick(u, k) { return { top: [.12, k.ts * .2, .52 + .05 * Math.sin(u * 9)], dir: [.1, k.ts * .5, .8] }; },
  arms(u, k) { const o = {}, hit = Math.max(0, Math.sin(u * 13)); o[k.botSide] = [.18 + hit * .26, .46 + hit * .1, .04]; return o; } };

K.kneeslide = { dur: 2.6, role: 'scorer', big: 1, knee: 1, free: 1,
  body(u, k, A) {
    const kn = ramp(u, 0, .5) * (1 - ramp(u, 1.7, 2.2));   // kneel weight
    A('thigh_l', -.1 + kn * .72, 0, 0); A('thigh_r', -.1 + kn * .72, 0, 0); A('calf_l', -.15 + kn * 1.5, 0, 0); A('calf_r', -.15 + kn * 1.5, 0, 0);
    A('pelvis', -.35 * kn, 0, 0); A('spine_01', -.15 * kn, 0, 0); A('spine_02', -.3 * kn, 0, 0); A('spine_03', -.25 * kn, 0, 0); A('Head', -.55 * kn, 0, 0);
    A('foot_l', .0, 0, 0);
  },
  stick(u, k) { const w = Math.sin(u * 6) * .08; return { top: [.05, k.ts * .5, .32 + w], dir: [.3, k.ts * .5, .8] }; },
  arms(u, k) { const o = {}, w = Math.sin(u * 6 + 1) * .08; o[k.botSide] = [.05, .5, .38 + w]; return o; },
  vis(u, k) { const t = Math.min(1, u / 1.7), d = 1 - (1 - t) * (1 - t); return { lx: 3.4 * d }; } };

K.jumpglide = { dur: 2.6, role: 'scorer', free: 1,
  body(u, k, A) {
    const air = pls(u, .15, .4, .65, .95), gl = ramp(u, .9, 1.5) * (1 - ramp(u, 2.0, 2.4));
    tall(A); A('thigh_l', .3 * air, 0, 0); A('calf_l', .5 * air, 0, 0); A('thigh_r', .35 * air, 0, 0); A('calf_r', .55 * air, 0, 0);
    A('spine_02', .25 * gl - .25 * air, 0, 0); A('spine_03', .2 * gl, 0, 0); A('Head', -.35 * gl - .2 * air, 0, 0);
    A('thigh_' + k.botSide, .55 * gl, 0, 0); A('calf_' + k.botSide, .1 * gl, 0, 0); A('pelvis', .25 * gl, 0, 0);   // free leg trails behind
  },
  stick(u, k) { return { top: [.05, k.ts * .55, .1], dir: [-.2, k.ts * .5, .7] }; },
  arms(u, k) { const o = {}, up = pls(u, .1, .3, .7, 1), w = ramp(u, .9, 1.5); o[k.botSide] = [lerp(.05, .0, w), .58, lerp(.55, .02, w) * Math.max(up, w) + .0]; return o; },
  vis(u, k) { const t = Math.min(1, u / 2.0); return { lx: 4.2 * (1 - (1 - t) * (1 - t)), hop: pls(u, .12, .36, .62, .88) * .3 }; } };

K.lap = { dur: 2.6, role: 'scorer', speed: 14,
  body(u, k, A) { A('spine_02', -.1, 0, 0); A('Head', -.25, 0, 0); },
  stick(u, k) { return { top: [.05, k.ts * .24, .6], bot: [.05, -k.ts * .24, .6] }; },
  vis(u, k) { const a = u * 1.5, R = 3.2; return { lx: R * Math.sin(a), lz: k.bs * R * (1 - Math.cos(a)), yaw: -k.bs * a * 1.0, spinFace: 1 }; } };

K.huddle = { dur: 2.6, role: 'scorer', still: 1,
  body(u, k, A) { tall(A); A('spine_02', .12 * ramp(u, .5, 1), 0, 0); A('Head', -.2 + .3 * ramp(u, .8, 1.2), 0, 0); },
  arms(u, k) { const t = ramp(u, .15, 1.0), h = {}; for (const s of ['l', 'r']) h[s] = [lerp(.1, .42, t), lerp(.5, -.2, t), lerp(.3, .12, t)]; return h; },
  stick(u, k) { return { top: [.1, k.ts * .3, -.2], dir: [-.3, k.ts * .3, -.9] }; } };

/* teammates */
K.mateCheer = { dur: 2.4, role: 'mate',
  body(u, k, A) { tall(A); A('Head', -.2, 0, 0); A('spine_02', -.1, 0, 0); },
  stick(u, k) { return { top: [.12, k.ts * .18, .15], dir: [.3, k.ts * .3, -.9] }; },
  arms(u, k) { const o = {}, w = Math.sin(u * 8 + k.h * 6) * .09; o[k.botSide] = [.1, .25, .6 + w]; return o; } };
K.mateHelmet = { dur: 2.4, role: 'mate',
  body(u, k, A) { tall(A); A('Head', .05, 0, 0); },
  stick(u, k) { return { top: [.12, k.ts * .18, .1], dir: [.3, k.ts * .3, -.9] }; },
  arms(u, k) { const o = {}, t = ramp(u, .2, .45); o[k.botSide] = [lerp(.3, .35, t) + .04 * Math.sin(u * 18), lerp(.3, -.05, t), lerp(.05, .42, t)]; return o; } };   // pats the scorer's helmet
K.stickTap = { dur: 2.4, role: 'mate',
  body(u, k, A) { tall(A); A('spine_02', .15, 0, 0); A('Head', -.1, 0, 0); },
  stick(u, k) { const b = Math.max(0, Math.sin(u * 11)); return { top: [.28, k.ts * .08, -.18 + .1 * b], bot: [.22, -k.ts * .1, -.5 + .06 * b], dir: [.95, .0, -.45 + .5 * b] }; } };
K.fistbump = { dur: 2.4, role: 'mate',
  body(u, k, A) { tall(A); A('spine_02', .1, 0, k.cs * .2); A('spine_03', .05, 0, k.cs * .3); A('Head', -.1, 0, 0); },
  stick(u, k) { return { top: [.14, k.ts * .16, .05], dir: [.3, k.ts * .3, -.9] }; },
  arms(u, k) { const o = {}, b = Math.sin(u * 10) > .6 ? .07 : 0; o[k.botSide] = [.52 + b, .02, .06]; return o; },
  vis(u, k) { return { toward: .78 * ramp(u, .1, .8), face: 1 }; } };
K.shoulder = { dur: 2.4, role: 'mate',
  body(u, k, A) { tall(A); const l = pls(u, .3, .55, 1.5, 1.8); A('spine_01', 0, k.cs * .2 * l, 0); A('spine_02', .1, k.cs * .35 * l, k.cs * -.3 * l); A('spine_03', 0, k.cs * .2 * l, 0); A('Head', -.1, 0, 0); },
  stick(u, k) { return { top: [.14, k.ts * .16, -.05], dir: [.3, k.ts * .3, -.9] }; },
  arms(u, k) { const o = {}; o[k.botSide] = [.15, .3, .22]; return o; },
  vis(u, k) { return { toward: .8 * ramp(u, .1, .7) + .07 * Math.sin(u * 9) * ramp(u, .7, .9), face: .6 }; } };
K.hug = { dur: 2.4, role: 'mate',
  body(u, k, A) { tall(A); const t = ramp(u, .4, 1); A('spine_02', .2 * t, 0, 0); A('spine_03', .12 * t, 0, 0); A('Head', -.1 + .2 * t, 0, 0); },
  arms(u, k) { const t = ramp(u, .2, 1.0), h = {}; for (const s of ['l', 'r']) h[s] = [lerp(.2, .4, t), lerp(.45, -.22, t), lerp(.3, .1, t)]; return h; },
  stick(u, k) { return { top: [.08, k.ts * .3, -.3], dir: [-.2, k.ts * .3, -.9] }; },
  vis(u, k) { return { toward: 1, face: 1, ring: 1 }; } };

/* dejected (scored-on team) */
K.sadHelmet = { dur: 2.4, role: 'sad', still: 1,
  body(u, k, A) { const br = Math.sin(u * 2.2) * .02; A('spine_01', .12, 0, 0); A('spine_02', .22 + br, 0, 0); A('spine_03', .22, 0, 0); A('neck_01', .3, 0, 0); A('Head', .75, 0, k.bs * .1); A('pelvis', -.05, 0, 0); A('thigh_l', -.12, 0, 0); A('thigh_r', -.12, 0, 0); A('calf_l', .2, 0, 0); A('calf_r', .2, 0, 0); },
  stick(u, k) { return { top: [.18, k.ts * .14, -.35], dir: [.9, k.ts * .1, -.5] }; },
  arms(u, k) { const o = {}; o[k.botSide] = [-.02, -.06, .3 + .02 * Math.sin(u * 2.2)]; return o; } };   // hand on the back of the helmet
K.sadKnees = { dur: 2.4, role: 'sad', still: 1,
  body(u, k, A) { const t = ramp(u, 0, .5); A('pelvis', .3 * t, 0, 0); A('spine_01', .3 * t, 0, 0); A('spine_02', .35 * t, 0, 0); A('spine_03', .25 * t, 0, 0); A('neck_01', .2, 0, 0); A('Head', .6 * t, 0, 0); A('thigh_l', -.25 * t, 0, 0); A('thigh_r', -.25 * t, 0, 0); A('calf_l', .35 * t, 0, 0); A('calf_r', .35 * t, 0, 0); },
  stick(u, k) { return { top: [.34, k.ts * .14, -.55], dir: [.9, k.ts * .1, -.5] }; },
  arms(u, k) { const o = {}; o[k.botSide] = [.2, .1, -.75]; return o; } };
K.sadStick = { dur: 2.4, role: 'sad', still: 1,
  body(u, k, A) { A('spine_01', .1, 0, 0); A('spine_02', .2, 0, 0); A('spine_03', .15, 0, 0); A('neck_01', .3, 0, 0); A('Head', .8, 0, 0); },
  stick(u, k) { return { top: [.34, k.ts * .05, -.12], bot: [.34, -k.ts * .05, -.34], dir: [.35, 0, -.9] }; } };

/* win celebration: stick taps on the ice, one hand acknowledging */
K.win = { dur: 6, role: 'win', still: 1,
  body(u, k, A) { tall(A); A('spine_02', .1, 0, 0); A('Head', -.15, 0, 0); },
  stick(u, k) { const b = Math.max(0, Math.sin(u * 7)); return { top: [.3, k.ts * .1, -.2 + .12 * b], dir: [.85, .0, -.5 + .55 * b] }; },
  arms(u, k) { const o = {}, w = .5 + .5 * Math.sin(u * 3); o[k.botSide] = [.12, .38, .35 + .25 * w]; return o; },
  };

/* ---------- hooks ---------- */
const kindOf = (name) => K[name] || K.pump;

// who scored (the skater the teammates celebrate with)
CEL.scorerOf = function (p) {
  if (p.cgo) return p.cgo;
  if (typeof G !== 'undefined' && G && G.cele && G.cele.p) return G.cele.p;
  return CEL.scorerP || null;
};
CEL.start = function (m, p, c, an, cv) {
  const win = cv > 4.5, sad = cv < 0, sit = CEL.sit(), goals = CEL.goalNo !== undefined ? CEL.goalNo : sit.goals, id = p.id | 0;
  const sc = CEL.scorerOf(p), scId = sc ? (sc.id | 0) : id, isSc = !sc || sc === p || (typeof G !== 'undefined' && G && G.cele && G.cele.p === p) || (!p.cgo && cv > 2.5 && !win);
  let name, rank = 0, mateGroup = [];
  if (CEL.force && isSc && !win && !sad) name = CEL.force;
  else if (cv === 0) name = 'pump';   // legacy flag only (c.celeb without p.celeb): the classic arms-up
  else if (win) name = 'win';
  else if (sad) name = CEL.sadPick || SADS[(hv(id * 7 + goals, 41) * 3) | 0];
  else if (isSc) name = CEL.pickScorer(id, goals, sit);
  else {
    const skn = CEL.force || CEL.pickScorer(scId, goals, sit);
    if (typeof onIce === 'function' && sc && sc.team) { const mates = onIce(sc.team).filter(q => q !== sc && !q.gl), d0 = (q) => Math.hypot(q.x - sc.x, q.y - sc.y); mates.sort((a, b) => d0(a) - d0(b) || (a.id | 0) - (b.id | 0)); rank = Math.max(0, mates.indexOf(p)); mateGroup = mates; }
    else rank = (hv(id, goals) * 4) | 0;
    name = CEL.forceMate || CEL.pickMate(id, goals, rank, skn);
    if (K[name].vis && K[name].vis(0, {}) && K[name].vis(0, {}).toward !== undefined && (!sc || (!p.cgo && Math.hypot(sc.x - p.x, sc.y - p.y) > 9))) name = 'mateCheer';   // too far to converge (or no scorer known): cheer in place
  }
  const sp = kindOf(name), h = hv(id * 3 + goals, 5);
  an.cel = { name, sp, u: 0, w: 0, h, rank, nMates: mateGroup.length, goals, ts: 1, bs: h < .5 ? 1 : -1, cs: 1, botSide: 'l', topSide: 'r', dur: sp.dur * (sit.ot ? 1.0 : 1), role: sp.role, hop: 0, knee: 0, vis: null, big: !!sp.big };
};
// per-frame state. Returns nothing; may override c.speed
CEL.tick = function (m, p, c, an, dt) {
  const cv = +p.celeb || 0, legacy = c.celeb && !cv, active = (cv > 0) || legacy || cv < -0.1;
  if (!CEL.S) { CEL.S = SK.S || 3; }
  if (!active) { if (an.cel) { an.cel = null; } return; }
  if (cv < -0.1) { p.celeb = cv + dt; if (p.celeb >= -0.1) p.celeb = 0; }   // dejected counts up to zero (the game only counts positive values down)
  if (an.cel && !legacy && an.cel.sad !== (cv < 0)) an.cel = null;
  if (!an.cel) { CEL.start(m, p, c, an, legacy && CEL.force ? 2.6 : cv); an.cel.sad = an.cel.role === 'sad'; }
  const k = an.cel; k.u += dt;
  const rem = legacy ? 9 : Math.abs(p.celeb);
  k.w = Math.min(1, ramp(k.u, 0, k.sp.role === 'sad' ? .5 : .28), ramp(rem, 0, .4));
  if (k.sp.speed) { c.speed = k.sp.speed; c.vf = k.sp.speed; c.vlat = 0; } else if (k.role !== 'mate' || c.speed < 3) { c.speed = 0; c.vf = 0; c.vlat = 0; }
  k.vis = k.sp.vis ? k.sp.vis(k.u, k) : null;
  k.hop = k.vis && k.vis.hop ? k.vis.hop * k.w : 0; k.noPlant = k.sp.free ? k.w : 0;
};
CEL.label = (k) => k.sad ? 'dejected' : 'celebrating';
CEL.body = function (m, p, c, an, pose, topSide, botSide) {
  const k = an.cel; if (!k.sp.body) return; const w = k.w;
  k.topSide = topSide; k.botSide = botSide; k.ts = topSide === 'l' ? 1 : -1;
  const A = (name, pp, rr, yy) => { const t = pose[name] || (pose[name] = {}); t.p = (t.p || 0) + pp * w; t.r = (t.r || 0) + (rr || 0) * w; if (yy) t.y = (t.y || 0) + yy * w; };
  k.sp.body(k.u, k, A);
};
// knees on the ice / hop: run after SK.ground2
const _kv = V3();
CEL.ground = function (m, an) {
  const k = an.cel; if (!k) return;
  if (k.sp.knee) {   // lowest allowed root height satisfying both: feet and knees above the ice
    m.inner.updateMatrixWorld(true); let mn = 1e9;
    for (const s of ['l', 'r']) { m.byName['calf_' + s].getWorldPosition(_kv); m.inner.worldToLocal(_kv); mn = Math.min(mn, _kv.y); }
    if (mn < 0.075) m.root.position.y += 0.075 - mn;   // knee joint 7.5 cm above the ice (shin guard)
  }
  if (k.hop > 0) m.root.position.y += k.hop;
};
const sh = V3(), sh2 = V3(), cc = V3();
CEL.stick = function (m, p, c, an, X, iceY, topSide, botSide, at) {
  const k = an.cel; if (!k.sp.stick) return;
  k.topSide = topSide; k.botSide = botSide; k.ts = topSide === 'l' ? 1 : -1;
  const o = k.sp.stick(k.u, k); if (!o) return;
  AR.pos(m, 'upperarm_l', sh); AR.pos(m, 'upperarm_r', sh2); cc.copy(sh).add(sh2).multiplyScalar(.5);
  const w = k.w, L = (out, a) => { T.a.copy(cc).addScaledVector(X.Fb, a[0]).addScaledVector(X.Sb, a[1]); T.a.y = cc.y + a[2]; return T.a; };
  const reach = (v, side) => { AR.pos(m, 'upperarm_' + side, sh2); T.d.copy(v).sub(sh2); const dl = T.d.length(), Lr = AR.len[side].l1 + AR.len[side].l2 - 0.04; if (dl > Lr) v.copy(sh2).addScaledVector(T.d, Lr / dl); return v; };
  const tt = reach(L(null, o.top), topSide); X.Tt.lerp(tt, w);
  if (o.bot) { const tb = reach(L(null, o.bot), botSide); X.Tb.lerp(tb, w); }
  // shaft direction toward the blade
  if (o.dir) { T.b.set(0, 0, 0).addScaledVector(X.Fb, o.dir[0]).addScaledVector(X.Sb, o.dir[1]); T.b.y = o.dir[2]; T.b.normalize(); }
  else { T.b.copy(X.Tb).sub(X.Tt); }   // 'two': blade beyond the bottom hand
  T.b.normalize(); T.c.copy(X.Tt).addScaledVector(T.b, 1.25); T.c.y = Math.max(T.c.y, iceY + 0.02);
  X.Hl.lerp(T.c, w);
  X.tmp.copy(X.Hl).sub(X.Tt).normalize(); X.bd.set(X.tmp.x, 0, X.tmp.z); if (X.bd.lengthSq() < 1e-4) X.bd.copy(X.Fb); X.bd.normalize();
};
CEL.arms = function (m, p, c, an, pose, X) {
  const k = an.cel; if (!k.sp.arms) return;
  const spec = k.sp.arms(k.u, k), w = k.w;
  for (const s of ['l', 'r']) {
    const t = spec[s]; if (!t) continue;
    const side = s === 'l' ? 1 : -1;
    AR.pos(m, 'upperarm_' + s, sh);
    T.d.copy(sh).addScaledVector(X.Fb, t[0] * RS).addScaledVector(X.Sb, side * t[1] * RS); T.d.y = sh.y + t[2] * RS;
    const std = s === k.topSide ? X.Ttw : X.Tbw; T.d.lerp(std, 1 - w);
    T.pole.set(0, 0, 0).addScaledVector(X.Sb, side * 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2);
    AR.arm(m, s, T.d, T.pole, pose);
  }
};
// cosmetic placement: slide / lap / converge on the scorer / face the scorer. g.position and rotation are reset by the renderer every frame.
CEL.visual = function (m, p, an) {
  const k = an.cel; if (!k || !k.vis && !k.sp.vis) return; const v = k.vis || {}, S = CEL.S || 3, w = k.w, g = m.g;
  const cy = Math.cos(g.rotation.y), sy = Math.sin(g.rotation.y);
  if (v.lx || v.lz) { const lx = (v.lx || 0) * w, lz = (v.lz || 0) * w; g.position.x += lx * cy + lz * sy; g.position.z += -lx * sy + lz * cy; }
  if (v.yaw) g.rotation.y += v.yaw * w;
  if (v.toward !== undefined || v.face !== undefined) {
    const sc = CEL.scorerOf(p);
    if (sc && sc !== p) {
      const dx = sc.x - p.x, dz = sc.y - p.y, d = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx);
      if (v.toward) {
        const R = v.ring ? 2.0 + .5 * (k.rank % 2) : 2.7, aa = a + Math.PI + (v.ring ? ((k.rank % 3) - 1) * .9 + (k.h - .5) * .4 : 0);
        const f = Math.min(1, v.toward) * w;
        g.position.x += (dx + Math.cos(aa) * R) * f; g.position.z += (dz + Math.sin(aa) * R) * f;
      }
      if (v.face) g.rotation.y = lerp(g.rotation.y, -a, v.face * w);
    }
  }
};
CEL.setup = function () { };

/* ---------- goalie after a goal against: head drops further, glove hand taps the pad. Post-pass over GOAL.apply (anim_goalie.js stays untouched). ---------- */
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), gp = V3(), gpole = V3();
CEL.goalie = function (m, g, c, dt) {
  const an = m.ga; if (!an || !an.ev || an.ev.k !== 'goalagainst') { if (m.cg) m.cg = 0; return; }
  const u = an.ev.t, w = Math.min(ramp(u, .15, .6), 1 - ramp(u, 1.9, 2.3)); if (w < .001) return; m.cg = 1;
  const W = SK._wq, P = SK.parent;   // root-space world quats left by the goalie's last SK.setPose
  // head and neck: chin to chest, a slow shake
  for (const [n, a] of [['neck_01', .22], ['Head', .35 + .06 * Math.sin(u * 4)]]) {
    const b = m.byName[n]; qb.copy(W[P[n]]).multiply(b.quaternion); qc.setFromAxisAngle(SK.A, a * w); qb.premultiply(qc);
    b.quaternion.copy(qa.copy(W[P[n]]).invert().multiply(qb)); W[n].copy(qb);
  }
  m.g.updateMatrixWorld(true);
  // glove hand taps the left pad (two or three taps)
  const tap = pls(u, .55, .85, 1.9, 2.2) * (0.5 + 0.5 * Math.sin(u * 11));
  AR.pos(m, 'calf_l', gp);
  gp.y += .3 - .12 * tap; gp.addScaledVector(SK.F, .18).addScaledVector(SK.Ld, .1);
  gpole.set(0, 0, 0).addScaledVector(SK.Ld, .8).addScaledVector(SK.U, -.55).addScaledVector(SK.F, -.2);
  const pose = {}; AR.arm(m, 'l', gp, gpole, pose);
  const ua = m.byName.upperarm_l, la = m.byName.lowerarm_l, qU = m.an.q.upperarm_l, qL = m.an.q.lowerarm_l;
  const lu = ua.quaternion.clone(), ll = la.quaternion.clone();
  const nu = qa.copy(W[P.upperarm_l]).invert().multiply(qU).clone(); ua.quaternion.copy(lu.slerp(nu, w));
  const nl = qb.copy(qU).invert().multiply(qL).clone(); la.quaternion.copy(ll.slerp(nl, w));
};
CEL.install = function () {
  if (!window.GOAL || GOAL._cel) return; const o = GOAL.apply; GOAL._cel = 1;
  GOAL.apply = function (m, g, c, dt) { o.call(this, m, g, c, dt); CEL.goalie(m, g, c, dt); };
};
CEL.install();

/* ---------- game hooks (set p.celeb only; replay and net record it already) ---------- */
CEL.onGoal = function (t, shooter, onIceFn, goalsNow) {
  CEL.scorerP = shooter || null; CEL.goalNo = goalsNow;
  if (!t || !t.opp || !onIceFn) return;
  for (const q of onIceFn(t.opp)) if (q && !q.gl) q.celeb = -2.4;
};
CEL.onEnd = function (winT, loseT, onIceFn, ot) {
  if (ot) return;   // the overtime winner keeps the goal celebration
  if (winT && onIceFn) for (const q of onIceFn(winT)) if (q && !q.gl && !(q.celeb > 0.6)) q.celeb = 6.5;
  if (loseT && onIceFn) for (const q of onIceFn(loseT)) if (q && !q.gl) q.celeb = -4;
};

/* ---------- test harness support (anim_test.html) ---------- */
CEL.scen = function () {
  const o = {}, T0 = { l: 0 };
  const run = (kind, role) => (t, p, c) => {
    CEL.force = role === 'mate' ? null : kind; CEL.forceMate = role === 'mate' ? kind : null; CEL.goalNo = 3; CEL.scorerP = { x: p.x + 7, y: p.y + 3, id: 99, team: null };
    p.vx = 0; p.vy = 0; const d = K[kind].dur;
    if (role === 'sad') { CEL.force = null; CEL.sadPick = kind; p.celeb = t < .03 ? -d : p.celeb; } else if (role === 'win') p.celeb = Math.max(0, 6.5 - t); else p.celeb = Math.max(0, d - t);
    c.celeb = p.celeb > 0; };
  for (const n in K) if (n !== 'win' || true) o['cel_' + n] = run(n, K[n].role);
  return o;
};
/* ---------- checks for anim_test.html: AT.assertAll calls CEL.checks(AT, scenarios, chk) ---------- */
CEL.checks = function (AT, sc_, chk) {
  const dt = 1 / 60, names = Object.keys(K), v = V3();
  for (const n of names) {
    const sp = K[n], sn = 'cel_' + n, d = sp.dur, role = sp.role;
    const R = AT.legStats(sc_[sn], d + 1.0);
    chk(sn + ' no pop (max joint deg/frame)', R.maxDeg < AT.popMax, R.maxDeg.toFixed(1) + ' ' + R.worst + ' @' + R.worstT.toFixed(2));
    chk(sn + ' ice contact (ankle and toe not below ice)', R.minAnkle > -0.012 && R.minBall > -0.012, R.minAnkle.toFixed(3) + ' ' + R.minBall.toFixed(3));
    AT.spawn(false); ANIM.debug = true; let on = 0, tot = 0, kmin = 9, label = '', last = '', maxHop = 0;
    for (let t = 0; t <= d + 1.0; t += dt) {
      AT.step(sc_[sn], t, dt); const an = AT.m.an; last = an.state;
      if (t > .45 && t < d - .5) { tot++; if (an.state === (role === 'sad' ? 'dejected' : 'celebrating')) on++; }
      if (an.cel && an.cel.sp.knee && an.cel.w > .5) { AT.m.inner.updateMatrixWorld(true); for (const s of ['l', 'r']) { AT.m.byName['calf_' + s].getWorldPosition(v); AT.m.inner.worldToLocal(v); kmin = Math.min(kmin, v.y); } }
    }
    chk(sn + ' holds its state for the duration', tot > 10 && on === tot, on + '/' + tot);
    chk(sn + ' recovers to normal skating state', last !== 'celebrating' && last !== 'dejected' && !AT.m.an.cel, 'final ' + last);
    if (sp.knee) chk(sn + ' knees stay above the ice (m above ice)', kmin > 0.03 && kmin < 0.2, kmin.toFixed(3));
  }
  // distinct looks: hand/head/pelvis signature per kind at 1.0 s
  { const sig = {}; for (const n of names) { if (K[n].role !== 'scorer') continue; AT.run('cel_' + n, 1.0); const m = AT.m, o = []; m.inner.updateMatrixWorld(true); for (const b of ['hand_l', 'hand_r', 'Head', 'pelvis', 'calf_l']) { AR.pos(m, b, v); o.push(v.x, v.y, v.z); } sig[n] = o; }
    let mn = 9, pr = ''; const ks = Object.keys(sig); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const dd = sig[ks[i]].reduce((q, x, a) => q + Math.abs(x - sig[ks[j]][a]), 0); if (dd < mn) { mn = dd; pr = ks[i] + '/' + ks[j]; } }
    AT.celSig = { min: mn, pair: pr }; chk('celebration kinds differ pairwise (min L1 of hand/head/pelvis/knee, m)', mn > 0.25, mn.toFixed(2) + ' ' + pr); }
  // deterministic, weighted picks
  { const sit = { ot: false, diff: 1, late: false, goals: 0 }, a = [], b = []; for (let g = 0; g < 300; g++) { a.push(CEL.pickScorer(7 + (g % 11), g, sit)); b.push(CEL.pickScorer(7 + (g % 11), g, sit)); }
    chk('scorer pick is deterministic (same inputs, same kind)', a.join() === b.join(), ''); const seen = new Set(a); chk('scorer pick covers all ' + Object.keys(SW).length + ' celebrations', seen.size === Object.keys(SW).length, seen.size + '');
    const ot = { ot: true, diff: 1, late: true, goals: 0 }, big = new Set(['kneeslide', 'huddle', 'jumpglide', 'lap', 'stickraise']); let nb = 0; for (let g = 0; g < 300; g++) if (big.has(CEL.pickScorer(7 + (g % 11), g, ot))) nb++;
    let nb0 = 0; for (let g = 0; g < 300; g++) if (big.has(CEL.pickScorer(7 + (g % 11), g, sit))) nb0++;
    chk('overtime winner gets the big celebrations (share, ot vs normal)', nb / 300 > 0.8 && nb / 300 > nb0 / 300 + .2, (nb / 3).toFixed(0) + '% vs ' + (nb0 / 3).toFixed(0) + '%');
    const mk = []; for (let g = 0; g < 100; g++) mk.push(CEL.pickMate(20 + g % 5, g, g % 5, 'pump')); chk('teammate picks are varied', new Set(mk).size >= 5, new Set(mk).size + ''); }
  // goalie after a goal against: slump, head down, pad tap, no pop
  { const GS = window.GS; if (GS && GS.g_goal) { AT.spawn(true); ANIM.debug = true; const nm = ['pelvis', 'spine_01', 'spine_03', 'Head', 'neck_01', 'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'thigh_l', 'calf_l'], prev = {}, cur = new THREE.Quaternion(), rq = new THREE.Quaternion(); let mx = 0, w = '', head = 0, hd0 = 0; const hv_ = new THREE.Vector3();
      for (let t = 0; t <= 2.6; t += dt) { AT.step(GS.g_goal, t, dt); AT.m.inner.updateMatrixWorld(true); if (t > .05) for (const n of nm) { AT.m.byName[n].getWorldQuaternion(cur); AT.m.root.getWorldQuaternion(rq); cur.premultiply(rq.invert()); if (prev[n]) { const dg = 2 * Math.acos(Math.min(1, Math.abs(prev[n].dot(cur)))) * 180 / Math.PI; if (dg > mx) { mx = dg; w = n + '@' + t.toFixed(2); } } (prev[n] || (prev[n] = new THREE.Quaternion())).copy(cur); }
        if (t > 1.2 && t < 1.3) { AR.pos(AT.m, 'hand_l', hv_); head = hv_.y; } }
      chk('goalie goal-against (slump, head down, pad tap) max joint deg/frame', mx < AT.gPopMax, mx.toFixed(1) + ' ' + w); } }
};
window.CEL = CEL;
})();
