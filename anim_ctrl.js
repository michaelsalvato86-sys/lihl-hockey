(function () {
/* Skater animation controller.
   Input: real gameplay state (velocity, accel, turn rate, possession, puck position, nearest opponent, faceoff stance)
   plus sim events (shot, pass, recv, check, checked, poke, fall, draw, gain, celebrate).
   Output: leg/torso pose (skating layer), two-hand stick placement with arm IK (stick layer), event layers, blending.
   Nothing here changes gameplay or physics. */
'use strict';
const ANIM = { ready: false, debug: false, dur: { shot: 0.55, pass: 0.62, recv: 0.9, check: 0.65, checked: 0.8, poke: 0.45, fall: 1.7, draw: 0.5, gain: 0.25 } };
const _hv = (id, k) => { let h = (((id | 0) * 2654435761) ^ (k * 40503)) >>> 0; h = ((h ^ (h >>> 15)) * 2246822519) >>> 0; return (h % 10000) / 10000; };
const _cl = (v, a, b) => Math.max(a, Math.min(b, v));
const _es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const _sm = (o, k, t, r, dt) => { o[k] += (t - o[k]) * (1 - Math.exp(-r * dt)); };
const kf = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * _es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const V3 = () => new THREE.Vector3();
const X = { Fb: V3(), Sb: V3(), O: V3(), P: V3(), Th: V3(), Bt: V3(), Tt: V3(), Tb: V3(), Hl: V3(), bd: V3(), pole: V3(), tmp: V3(), sh: V3(), pu: V3(), op: V3(), q: new THREE.Quaternion() };

ANIM.init = function () { ANIM.YL = SK.Ld.x > 0 ? 1 : -1; ANIM.ready = true; };

ANIM.make = function (m, p) {
  const id = p.id | 0;
  m.an = {
    ph: _hv(id, 7) * 6, tHand: _hv(id, 8) * 6, evId: 0, ev: null, prevVf: 0, dec: 0, cush: 0, recvT: 0, fall: null,
    v: { stride: 0.94 + 0.12 * _hv(id, 1), crouch: -0.04 + 0.08 * _hv(id, 2), sway: 0.7 + 0.6 * _hv(id, 3), carry: 0.8 + 0.4 * _hv(id, 4), topR: _hv(id, 5) > 0.5, stopSide: _hv(id, 6) > 0.5 ? 1 : -1, wind: 0.85 + 0.3 * _hv(id, 9) },
    s: { carry: 0, free: 0, stop: 0, crouch: 0.5, faceoff: 0, recv: 0, prot: 0, yaw: 0, lean: 0, acc: 0, charge: 0, flail: 0 },
    q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion() },
    state: 'ready', metrics: null
  };
  return m.an;
};

// body-frame point -> root space. f forward, s left, h height above the ice
function at(out, f, s, h, iceY) { out.copy(X.O).addScaledVector(X.Fb, f).addScaledVector(X.Sb, s); out.y = iceY + h; return out; }

ANIM.apply = function (m, p, c, dt) {
  const an = m.an || ANIM.make(m, p), S = an.s, V = an.v, YL = ANIM.YL;
  dt = Math.min(dt, 0.05);
  // ---------- 0. events ----------
  if (p.ae && p.ae.id !== an.evId) {
    an.evId = p.ae.id; const k = p.ae.k, d = p.ae.d || {};
    if (k === 'recv') an.recvT = 0.9; else if (k === 'gain') { an.cush = 0.25; an.recvT = 0; } else if (k === 'fall') an.fall = { t: 0, side: d.side || 1 };
    else an.ev = { k, t: 0, d, dur: (k === 'shot' ? ({ wrist: 0.55, snap: 0.38, slap: 0.85, onetimer: 0.6 }[d.kind] || 0.55) : ANIM.dur[k] || 0.5) };
  }
  if (an.ev) { an.ev.t += dt; if (an.ev.t > an.ev.dur) an.ev = null; }
  if (an.recvT > 0) an.recvT -= dt; if (an.cush > 0) an.cush -= dt;
  if (an.fall) { an.fall.t += dt; if (an.fall.t > ANIM.dur.fall) an.fall = null; }
  const ek = an.ev ? an.ev.k : '', u = an.ev ? an.ev.t : 0, ed = an.ev ? an.ev.d : null;

  // ---------- 1. motion terms ----------
  const sp = c.speed, s01 = Math.min(1, sp / 36), decel = (an.prevVf - c.vf) / Math.max(dt, 1e-3); an.prevVf = c.vf;
  _sm(an, 'dec', Math.max(0, decel), 14, dt);
  const stopT = (an.dec > 60 && sp > 14 && c.vf > 6) ? 1 : 0; _sm(S, 'stop', stopT, stopT ? 14 : 5, dt);
  const turn = p.turn || 0, xo = _cl((Math.abs(turn) - 1.4) / 1.2, 0, 1) * (sp > 10 ? 1 : 0);
  _sm(S, 'lean', -_cl(turn * 0.11 * Math.min(1, sp / 18), -0.8, 0.8), 9, dt);
  _sm(S, 'acc', p.acc01 || 0, 10, dt);
  an.ph += (sp > 1.2 ? dt * (2.2 + sp * 0.13) * V.stride * (p.back ? -0.55 : 1) : 0);
  an.tHand += dt * (7 + 4 * s01);
  const sgn = V.topR ? -1 : 1;                         // lateral side of the stick (left = +1)
  _sm(S, 'carry', c.hasPuck ? 1 : 0, 9, dt);
  _sm(S, 'faceoff', c.faceoff ? 1 : 0, 7, dt);
  _sm(S, 'recv', an.recvT > 0 && !c.hasPuck ? 1 : 0, 9, dt);
  const sprintT = (s01 > 0.62 && !c.hasPuck && !ek && !an.recvT && !c.faceoff) ? 1 : 0;
  const freeT = Math.max(sprintT, ek === 'poke' ? kf(u, [[0, 0], [0.08, 1], [0.36, 1], [0.45, 0]]) : 0, (ek === 'check' ? 0.0 : 0));
  _sm(S, 'free', freeT, 7, dt);
  if (ek === 'shot') S.charge = Math.max(0, S.charge - dt / 0.14 * Math.max(S.charge, 0.0001) * 0.9 - dt * 2.2); else _sm(S, 'charge', c.charge || 0, 14, dt);
  const protT = (c.hasPuck && c.opp && c.opp.d < 9 && !ek) ? 1 : 0; _sm(S, 'prot', protT, 6, dt);

  // ---------- 2. event layer (additive offsets, all smooth keyframe curves) ----------
  let eYaw = 0, eBf = 0, eBs = 0, eBh = 0, eHh = 0, eCr = 0, ePitch = 0, eHead = 0, eHandPull = 0, eWeight = 0;
  const rel = ed && ed.rel != null ? ed.rel : 0, relS = Math.sin(rel);   // rel: target direction, +left, relative to heading
  if (ek === 'shot') {
    const kd = ed.kind, A = kd === 'slap' ? 1 : kd === 'onetimer' ? 0.8 : kd === 'snap' ? 0.55 : 0.8, w = V.wind, D = an.ev.dur, uu = u / D;
    if (kd === 'slap' || kd === 'onetimer') {
      eYaw = sgn * kf(uu, [[0, -0.9], [0.1, 0.85], [0.4, 0.7], [1, 0]]) * A * w; eBf = kf(uu, [[0, -0.75], [0.1, 0.7], [0.45, 0.45], [1, 0]]) * A;
      eBh = kf(uu, [[0, 0.9], [0.09, 0.0], [0.22, 0.55], [0.5, 0.8], [1, 0]]) * A; eHh = kf(uu, [[0, 0.5], [0.12, -0.04], [0.45, 0.3], [1, 0]]) * A; eCr = kf(uu, [[0, 0.3], [0.3, 0.12], [1, 0]]);
    } else {
      eYaw = sgn * kf(uu, [[0, -0.35], [0.18, 0.45], [0.5, 0.35], [1, 0]]) * A * w; eBf = kf(uu, [[0, -0.5], [0.2, 0.55], [0.55, 0.25], [1, 0]]) * A;
      eBh = kf(uu, [[0, 0], [0.22, 0.06], [0.4, 0.3], [1, 0]]) * A; eHh = kf(uu, [[0, 0.04], [0.3, 0.1], [1, 0]]) * A; eCr = kf(uu, [[0, 0.2], [0.35, 0.1], [1, 0]]);
    }
    eYaw += _cl(rel, -0.6, 0.6) * kf(uu, [[0, 0], [0.12, 1], [0.6, 0.6], [1, 0]]); eBs = relS * 0.35 * kf(uu, [[0, 0], [0.15, 1], [1, 0]]); ePitch = 0.1 * kf(uu, [[0, 0], [0.2, 1], [1, 0]]); eWeight = kf(uu, [[0, -1], [0.15, 1], [1, 0]]);
  } else if (ek === 'pass') {
    eYaw = sgn * kf(u, [[0, -0.2], [0.12, 0.3], [0.3, 0.25], [0.62, 0]]) * V.wind + _cl(rel, -0.7, 0.7) * kf(u, [[0, 0], [0.14, 1], [0.38, 0.8], [0.62, 0]]);
    eBf = kf(u, [[0, -0.25], [0.14, 0.5], [0.32, 0.45], [0.62, 0]]); eBs = relS * 0.5 * kf(u, [[0, 0], [0.14, 1], [0.4, 0.8], [0.62, 0]]); eBh = 0.1 * kf(u, [[0, 0], [0.25, 1], [0.62, 0]]);
    eHead = _cl(rel, -0.9, 0.9) * kf(u, [[0, 0.5], [0.14, 1], [0.5, 0.7], [0.62, 0]]); eHandPull = 0.12 * kf(u, [[0, 0], [0.14, 1], [0.4, 0.5], [0.62, 0]]);
  } else if (ek === 'check') {
    eBh = kf(u, [[0, 0.05], [0.08, 0.75], [0.42, 0.75], [0.65, 0]]); eBf = -0.35 * kf(u, [[0, 0], [0.1, 1], [0.45, 1], [0.65, 0]]); eCr = 0.35 * kf(u, [[0, 0.3], [0.3, 1], [0.65, 0]]);
    ePitch = kf(u, [[0, 0.15], [0.1, 0.4], [0.42, 0.35], [0.65, 0]]); eYaw = _cl(rel, -0.9, 0.9) * kf(u, [[0, 0.2], [0.12, 1], [0.45, 0.8], [0.65, 0]]); eHandPull = 0.2 * kf(u, [[0, 0], [0.1, 1], [0.45, 1], [0.65, 0]]);
  } else if (ek === 'checked') {
    const pw = _cl(ed.power || 0.5, 0.2, 1), d = (ed.side || 1);
    ePitch = -0.55 * pw * kf(u, [[0, 0.3], [0.15, 1], [0.8, 0]]); eYaw = d * 0.6 * pw * kf(u, [[0, 0], [0.15, 1], [0.8, 0]]); eCr = 0.25 * kf(u, [[0, 0], [0.2, 1], [0.8, 0]]);
    _sm(S, 'flail', pw * kf(u, [[0, 0], [0.1, 1], [0.7, 0.4], [0.8, 0]]), 20, dt);
  } else if (ek === 'poke') {
    eBf = 0.35 * kf(u, [[0, 0], [0.1, 1], [0.26, 1], [0.45, 0]]); ePitch = 0.28 * kf(u, [[0, 0], [0.1, 1], [0.3, 0.8], [0.45, 0]]); eYaw = _cl(rel, -0.5, 0.5) * kf(u, [[0, 0], [0.1, 1], [0.45, 0]]); eCr = 0.15 * kf(u, [[0, 0], [0.1, 1], [0.45, 0]]);
  } else if (ek === 'draw') {
    eBf = -0.55 * kf(u, [[0, 0], [0.12, 1], [0.3, 0.4], [0.5, 0]]); eYaw = sgn * 0.3 * kf(u, [[0, 0], [0.12, 1], [0.5, 0]]); eHandPull = 0.2 * kf(u, [[0, 0], [0.12, 1], [0.5, 0]]);
  }
  if (ek) { const ein = _es(u / 0.09); eYaw *= ein; eBf *= ein; eBs *= ein; eBh *= ein; eHh *= ein; eCr *= ein; ePitch *= ein; eHead *= ein; eHandPull *= ein; eWeight *= ein; }
  if (!ek || ek !== 'checked') _sm(S, 'flail', 0, 8, dt);
  // charging a shot (human): visible windup before the release
  const ch = S.charge;
  if (ch > 0.02) { const slap = _es((ch - 0.62) / 0.3); eYaw += sgn * (-0.3 - 0.4 * slap) * ch * V.wind; eBf += (-0.35 - 0.4 * slap) * ch; eBh += (0.15 + 0.7 * slap) * ch; eHh += 0.35 * slap * ch; eCr += 0.15 * ch; }
  // receiving: cushion the puck (hands give)
  const cush = an.cush > 0 ? kf(an.cush / 0.25, [[0, 0], [0.5, 1], [1, 0.3]]) : 0; eHandPull += 0.16 * cush;

  // ---------- 3. stances ----------
  let crouch = _cl(0.5 + 0.06 * S.stop + 0.25 * S.faceoff + eCr + V.crouch + 0.15 * S.prot, 0, 1.2);
  _sm(S, 'crouch', crouch, 10, dt); crouch = S.crouch;
  const yawTurn = _cl(turn * 0.06 * Math.min(1, sp / 16), -0.35, 0.35) * YL * -1;     // shoulders lead the turn
  const protSide = c.opp ? (c.opp.s > 0 ? 1 : -1) : 0;
  const yawTotal = _cl(yawTurn + YL * eYaw + YL * protSide * 0.5 * S.prot + YL * sgn * 0.25 * S.faceoff, -1.3, 1.3);
  _sm(S, 'yaw', yawTotal, 16, dt);

  // ---------- 4. base pose: legs + torso (existing skating layer) + modifiers ----------
  const lean = S.lean;
  const pose = SK.skatePose(m, an.ph, s01, lean, S.acc, p.back);
  for (const k of ['upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'hand_r']) delete pose[k];
  const ex = crouch - 0.5 + 0.1;                                    // extra flexion beyond the skating pose
  for (const sd of ['l', 'r']) { pose['thigh_' + sd].p -= 0.5 * ex; pose['calf_' + sd].p += 0.45 * ex; }
  if (xo > 0) for (const sd of ['l', 'r']) { const outside = (sd === 'l') === (lean < 0); if (outside) { pose['thigh_' + sd].r *= (1 - 1.9 * xo); pose['calf_' + sd].r = pose['thigh_' + sd].r; } }
  const sway = Math.sin(an.ph) * 0.07 * s01 * V.sway * SK.rollLeft;
  pose.pelvis.r += sway - SK.rollLeft * 0.08 * eWeight; pose.spine_01.r -= sway * 0.5; pose.spine_02.r -= sway * 0.7; pose.spine_03.r -= sway * 0.7;
  const pit = ePitch + 0.4 * S.faceoff + 0.06 * S.stop; pose.pelvis.p += 0.2 * pit + 0.08 * ex; pose.spine_01.p += 0.35 * pit; pose.spine_02.p += 0.35 * pit; pose.spine_03.p += 0.35 * pit + 0.1 * S.faceoff;
  const Y = S.yaw; pose.pelvis.y = Y * 0.25; pose.spine_01.y = Y * 0.5; pose.spine_02.y = Y * 0.8; pose.spine_03.y = Y;
  // head: looks at the puck / the target, kept level against the body twist
  X.pu.set(c.puckW.x, c.puckW.y, c.puckW.z); m.g.updateMatrixWorld(true); m.root.worldToLocal(X.pu);
    pose.neck_01.y = -Y * 0.3 + eHead * 0.4 * YL; pose.Head.y = -Y * 0.35 + eHead * 0.5 * YL; pose.Head.p = -0.1 + 0.3 * S.faceoff - 0.4 * ePitch;
  // whole-model yaw for the hockey stop (skates turn across the direction of travel)
  m.inner.rotation.y = Math.PI / 2 + S.stop * V.stopSide * 1.15;

  // fall layer: rotate the whole body about the forward axis, then recover
  let fallA = 0;
  if (an.fall) { const t = an.fall.t, side = an.fall.side; fallA = side * kf(t, [[0, 0], [0.28, 1.3], [0.9, 1.3], [1.5, 0.35], [1.7, 0]]); for (const sd of ['l', 'r']) { pose['thigh_' + sd].r *= 1.0 + 1.5 * Math.abs(fallA); } }
  m.root.rotation.z = fallA;

  // ---------- 5. pass 1: legs/torso into the skeleton, ground contact, read shoulders ----------
  SK.setPose(m, pose); SK.ground(m); m.g.updateMatrixWorld(true);
  const iceY = -m.root.position.y;
  AR.pos(m, 'pelvis', X.O); X.O.y = iceY;
  const Yb = pose.spine_02.y; X.Fb.copy(SK.F).applyAxisAngle(SK.U, Yb); X.Sb.copy(SK.Ld).applyAxisAngle(SK.U, Yb);
  X.pu.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.pu);
  const pf = X.tmp.copy(X.pu).sub(X.O).dot(X.Fb), ps = X.tmp.copy(X.pu).sub(X.O).dot(X.Sb);

  // ---------- 6. stick targets (blade) ----------
  let bf = 1.26 + 0.05 * Math.sin(an.ph) * s01, bs = 0.22 * sgn + 0.06 * Math.sin(an.ph) * s01 * sgn, bh = 0.03;
  // carrying: blade follows the real puck with a stickhandling dangle (puck itself is never moved)
  if (S.carry > 0.01) {
    const dang = Math.sin(an.tHand) * 0.2 * V.carry * (1 - 0.5 * s01) * (1 - 0.7 * S.prot), cf = _cl(pf, 0.7, 1.5), cs = _cl(ps + dang - 0.38 * protSide * S.prot, -0.9, 0.9);
    bf = _cl(bf + (cf - bf) * S.carry, 0.5, 1.6); bs = bs + (cs - bs) * S.carry;
  }
  if (S.recv > 0.01) { const rf = _cl(pf, 0.5, 1.7), rs = _cl(ps, -1.0, 1.0); bf += (rf - bf) * S.recv; bs += (rs - bs) * S.recv; }
  if (ek === 'poke') { const k = kf(u, [[0, 0], [0.1, 1], [0.26, 1], [0.45, 0]]); bf += (_cl(pf, 0.8, 1.75) - bf) * k; bs += (_cl(ps, -0.9, 0.9) - bs) * k; }
  if (S.faceoff > 0.01) { bf += (0.78 - bf) * S.faceoff; bs += (0.05 * sgn - bs) * S.faceoff; }
  bf += eBf; bs += eBs; bh += eBh;
  { // the blade can only move so fast: low-pass the target (a pass arriving at speed must not teleport the stick)
    const F = an.F || (an.F = { bf, bs, bh }), r = ek ? 34 : 20, k = 1 - Math.exp(-r * dt); F.bf += (bf - F.bf) * k; F.bs += (bs - F.bs) * k; F.bh += (bh - F.bh) * k; bf = F.bf; bs = F.bs; bh = F.bh;
  }
  at(X.Bt, bf, bs, bh, iceY);
  // top hand anchor (belly height, forward); shaft is 1.3 m from top hand to heel at rest
  const hH = 0.82 - 0.12 * (crouch - 0.5) - 0.2 * S.faceoff + eHh;
  at(X.Th, 0.34 - eHandPull, 0.1 * sgn - 0.05 * Math.sin(an.tHand) * S.carry * sgn, hH, iceY);
  // hands slide so the blade reaches the target: top hand moves at most 0.24 m from its anchor
  X.tmp.copy(X.Bt).sub(X.Th); const dist = X.tmp.length(); X.tmp.multiplyScalar(1 / (dist || 1));
  X.Tt.copy(X.Bt).addScaledVector(X.tmp, -AR.Lg); X.Tt.sub(X.Th); const ol = X.Tt.length(); if (ol > 0.24) X.Tt.multiplyScalar(0.24 / ol); X.Tt.add(X.Th);
  // keep the top hand within arm's reach of its shoulder so the stick can never detach
  const topSide = V.topR ? 'r' : 'l', botSide = V.topR ? 'l' : 'r', Lr = AR.len[topSide].l1 + AR.len[topSide].l2 - 0.03;
  AR.pos(m, 'upperarm_' + topSide, X.sh); X.tmp.copy(X.Tt).sub(X.sh); const dl = X.tmp.length(); if (dl > Lr) X.Tt.copy(X.sh).addScaledVector(X.tmp, Lr / dl);
  // heel: blade target, but the stick can only telescope within a sane range of the real length
  X.tmp.copy(X.Bt).sub(X.Tt); let sl = X.tmp.length(); X.tmp.multiplyScalar(1 / (sl || 1)); sl = _cl(sl, 1.0, 1.5); X.Hl.copy(X.Tt).addScaledVector(X.tmp, sl);
  X.bd.set(X.tmp.x, 0, X.tmp.z); if (X.bd.lengthSq() < 1e-4) X.bd.copy(X.Fb); X.bd.normalize();
  // bottom hand slides on the shaft (0.46 m below the top hand); released while sprinting / poking: free swing
  { // bottom hand slides along the shaft only as far as its arm can reach
    AR.pos(m, 'upperarm_' + botSide, X.sh); const Lb = AR.len[botSide].l1 + AR.len[botSide].l2 - 0.03; let dd = 0.46 - 0.05 * S.faceoff;
    for (let i = 0; i < 6; i++) { X.Tb.copy(X.Tt).addScaledVector(X.tmp, dd); if (X.Tb.distanceTo(X.sh) <= Lb || dd <= 0.14) break; dd -= 0.055; }
  }
  if (S.free > 0.01 || S.flail > 0.01) {
    const sw = Math.sin(an.ph + Math.PI) * 0.3 * s01; at(X.pole, 0.12 + sw, -0.3 * sgn, 0.78, iceY);
    if (ek === 'poke') at(X.pole, -0.25, -0.3 * sgn, 0.9, iceY);
    const k = Math.max(S.free, S.flail); X.Tb.lerp(X.pole, k);
    if (S.flail > 0.01) { at(X.pole, 0.1, -0.75 * sgn, 1.0 + 0.2 * Math.sin(an.tHand * 2), iceY); X.Tb.lerp(X.pole, S.flail); }
  }
  if (c.celeb) {
    const lt0 = V.topR ? -1 : 1, wob = Math.sin(performance.now() / 110) * 0.05;
    at(X.Tt, 0.02, 0.15 * lt0, 1.7 + wob, iceY); at(X.Tb, 0.02, -0.15 * lt0, 1.7 - wob, iceY);
    X.tmp.copy(X.Tb).sub(X.Tt).normalize(); X.Hl.copy(X.Tt).addScaledVector(X.tmp, 1.25); X.bd.copy(X.tmp);
  }
  // ---------- 7. arm IK, second pass ----------
  const lb = botSide === 'l' ? 1 : -1, lt = topSide === 'l' ? 1 : -1;
  X.pole.set(0, 0, 0).addScaledVector(X.Sb, lt * 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2);
  AR.arm(m, topSide, X.Tt, X.pole, pose);
  X.pole.set(0, 0, 0).addScaledVector(X.Sb, lb * 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2);
  AR.arm(m, botSide, X.Tb, X.pole, pose);
  // celebration: arms overhead (classic skating celebration), stick held low in the top hand
  SK.setPose(m, pose);
  AR.placeStick(m, X.Tt, X.Hl, X.bd);
  m.stick.shaft.visible = m.stick.blade.visible = m.stick.tape.visible = m.stick.knob.visible = true;
  // visual puck: sits on the blade while carried (render-only; the simulated puck is untouched)
  if (S.carry > 0.8 && !ek) { X.pu.copy(X.Hl).addScaledVector(X.bd, 0.2); X.pu.y = iceY + 0.02; an.heelOk = true; if (!an.heelW) an.heelW = V3(); an.heelW.copy(X.pu); m.root.localToWorld(an.heelW); } else an.heelOk = false;

  // ---------- 8. state label (for tests and debugging) ----------
  an.state = c.celeb ? 'celebrating' : an.fall ? 'falling' : ek === 'checked' ? 'getting_checked' : ek === 'check' ? 'body_check' : ek === 'shot' ? 'shot_' + (ed.kind || 'wrist') : ek === 'pass' ? 'passing' : ek === 'poke' ? 'poke_check' : ek === 'draw' ? 'faceoff_draw'
    : c.faceoff ? 'faceoff_stance' : S.stop > 0.5 ? 'stopping' : S.recv > 0.5 ? 'receiving_pass' : S.charge > 0.1 ? 'preparing_shot' : p.back ? 'backward_skating' : S.carry > 0.6 ? (S.prot > 0.5 ? 'protecting_puck' : 'stickhandling')
      : xo > 0.4 ? 'crossover_turn' : Math.abs(turn) > 1.2 ? (turn > 0 ? 'turning_right' : 'turning_left') : sp < 1 ? 'ready' : S.acc > 0.5 ? 'accelerating' : s01 > 0.8 ? 'sprint_skating' : S.acc < 0.15 && s01 > 0.3 ? 'gliding' : 'skating';
  if (ANIM.debug) { m.g.updateMatrixWorld(true); an.metrics = ANIM.measure(m, X.Tt, X.Tb, topSide, botSide, iceY); }
};

// joint/stick assertions for the test harness
ANIM.measure = function (m, Tt, Tb, topSide, botSide, iceY) {
  const a = V3(), b = V3(); AR.pos(m, 'hand_' + topSide, a); AR.pos(m, 'hand_' + botSide, b);
  const st = m.stick, dir = st.dir, off = (h, T) => { const w = h.clone().sub(T); const along = w.dot(dir), perp = w.clone().addScaledVector(dir, -along); return perp.length(); };
  return { topHandToGrip: a.distanceTo(Tt), botHandToGrip: b.distanceTo(Tb), topHandOffShaft: off(a, Tt), botHandOffShaft: off(b, Tt), bladeHeight: st.heel.y - iceY, handsApart: a.distanceTo(b) };
};

window.ANIM = ANIM;
})();
