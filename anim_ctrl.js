(function () {
/* Skater animation controller.
   Input: real gameplay state (velocity, accel, turn rate, possession, puck position, nearest opponent, faceoff stance)
   plus sim events (shot, pass, recv, check, checked, poke, fall, draw, gain, celebrate).
   Output: leg/torso pose (skating layer), two-hand stick placement with arm IK (stick layer), event layers, blending.
   Nothing here changes gameplay or physics. */
'use strict';
const ANIM = { ready: false, debug: false, dur: { shot: 0.55, pass: 0.65, recv: 0.9, check: 0.85, checked: 1.0, poke: 0.45, fall: 1.7, draw: 0.5, gain: 0.25, hitwind: 0.75, hitmiss: 0.9 } };
const _hv = (id, k) => { let h = (((id | 0) * 2654435761) ^ (k * 40503)) >>> 0; h = ((h ^ (h >>> 15)) * 2246822519) >>> 0; return (h % 10000) / 10000; };
const _cl = (v, a, b) => Math.max(a, Math.min(b, v));
const _es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const _sm = (o, k, t, r, dt) => { o[k] += (t - o[k]) * (1 - Math.exp(-r * dt)); };
const kf = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * _es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const V3 = () => new THREE.Vector3();
const X = { Fb: V3(), Sb: V3(), O: V3(), P: V3(), Th: V3(), Bt: V3(), Tt: V3(), Tb: V3(), Ttw: V3(), Tbw: V3(), Hl: V3(), bd: V3(), pole: V3(), tmp: V3(), sh: V3(), pu: V3(), op: V3(), q: new THREE.Quaternion() };

ANIM.init = function () { ANIM.YL = SK.Ld.x > 0 ? 1 : -1; ANIM.ready = true; };

ANIM.make = function (m, p) {
  const id = p.id | 0;
  m.an = {
    ph: _hv(id, 7) * 6, tHand: _hv(id, 8) * 6, evId: 0, ev: null, prevVf: 0, dec: 0, cush: 0, recvT: 0, fall: null,
    v: { stride: 0.94 + 0.12 * _hv(id, 1), crouch: -0.04 + 0.08 * _hv(id, 2), sway: 0.7 + 0.6 * _hv(id, 3), carry: 0.8 + 0.4 * _hv(id, 4), topR: _hv(id, 5) > 0.5, stopSide: _hv(id, 6) > 0.5 ? 1 : -1, wind: 0.85 + 0.3 * _hv(id, 9) },
    s: { pivot: 0, carry: 0, free: 0, stop: 0, crouch: 0.5, faceoff: 0, recv: 0, prot: 0, yaw: 0, lean: 0, acc: 0, charge: 0, flail: 0, back: 0, pre: 0, brace: 0, lunge: 0, shuf: 0, drive: 0, plant: 0, load: 0, fat: 0 },
    q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion(), hand_l: new THREE.Quaternion(), hand_r: new THREE.Quaternion() }, pivPh: 0,
    state: 'ready', metrics: null, gainT: 9, od: -1, clos: 0, pfv: 3, psv: 0
  };
  return m.an;
};

// body-frame point -> root space. f forward, s left, h height above the ice
function at(out, f, s, h, iceY) { out.copy(X.O).addScaledVector(X.Fb, f).addScaledVector(X.Sb, s); out.y = iceY + h; return out; }

ANIM.apply = function (m, p, c, dt) {
  const an = m.an || ANIM.make(m, p), S = an.s, V = an.v, YL = ANIM.YL;
  if (SK.mobile() && !c.key) { an.lodAcc = (an.lodAcc || 0) + dt; an.lodSkip = !an.lodSkip; if (an.lodSkip && an.state) return; dt = an.lodAcc; an.lodAcc = 0; }
  dt = Math.min(dt, 0.05);
  // ---------- 0. events ----------
  if (p.ae && p.ae.id !== an.evId) {
    an.evId = p.ae.id; const k = p.ae.k, d = p.ae.d || {};
    if (k === 'recv') an.recvT = 0.9; else if (k === 'gain') { an.cush = 0.35; an.cq = ({ difficult: 1.6, bobble: 2.2, deflect: 2.4, miss: 2.8 })[d.q] || 1; an.recvT = 0; an.gainT = 0; } else if (k === 'fall') an.fall = { t: 0, side: d.side || 1 };
    else {
      const rel0 = d.rel || 0, sd0 = V.topR ? -1 : 1, kd = d.kind, hk = k === 'hitwind' || k === 'check' || k === 'hitmiss' || k === 'checked';
      let dr = 0; if (typeof d.dir === 'number') dr = -wrapA(d.dir - (p.fa || 0)); else if (d.dir && d.dir.x !== undefined) dr = -wrapA(Math.atan2(d.dir.y, d.dir.x) - (p.fa || 0));   // victim push direction relative to heading, +left
      an.ev = { k, t: 0, d, dur: (k === 'shot' ? ({ wrist: 0.6, snap: 0.4, slap: 0.9, onetimer: 0.65 }[kd] || 0.6) : k === 'poke' && Math.hypot(an.pfv, an.psv) < 1.9 ? 0.55 : ANIM.dur[k] || 0.5),
        bk: ((k === 'shot' && (kd === 'wrist' || kd === 'snap')) || k === 'pass') ? _es((rel0 * sd0 - 0.35) / 0.5) : 0, sub: (k === 'poke' && Math.hypot(an.pfv, an.psv) < 1.9) ? 1 : 0,
        hf: an.pfh === undefined ? an.pfv : an.pfh, hs: an.psh === undefined ? an.psv : an.psh, br: hk ? S.brace : 0, pw: d.power !== undefined ? _cl(d.power, 0, 1) : (k === 'check' ? 0.6 : 0.5), board: !!d.board, dr: dr };
    }
  }
  if (an.ev) { an.ev.t += dt; if (an.ev.t > an.ev.dur) an.ev = null; }
  if (an.recvT > 0) an.recvT -= dt; if (an.cush > 0) an.cush -= dt; an.gainT += dt;
  if (an.fall) { an.fall.t += dt; if (an.fall.t > ANIM.dur.fall) an.fall = null; }
  const ek = an.ev ? an.ev.k : '', u = an.ev ? an.ev.t : 0, ed = an.ev ? an.ev.d : null;

  // ---------- 1. motion terms ----------
  // A4: decel from vf smoothed over ~40 ms, and the stop must hold for 35 ms (2+ frames) (online snapshot jitter cannot trigger it)
  const sp = c.speed, s01 = Math.min(1, sp / 36);
  if (an.vfs === undefined) an.vfs = c.vf;
  const vfPrev = an.vfs; _sm(an, 'vfs', c.vf, 26, dt);
  const decel = (vfPrev - an.vfs) / Math.max(dt, 1e-3);
  _sm(an, 'dec', Math.max(0, decel), 26, dt);
  an.stopHold = (an.dec > 55 && sp > 14 && an.vfs > 6) ? (an.stopHold || 0) + dt : 0;
  const stp = +p.stp > 0 ? _cl(+p.stp, 0, 1) : 0;                 // sim stop intensity (Agent A), 0 if absent
  const stopT = (an.stopHold > 0.035 || (stp > 0.3 && sp > 8)) ? 1 : 0; _sm(S, 'stop', stopT, stopT ? 22 : 5, dt);
  an.spray = S.stop * _cl(sp / 18, 0, 1) * Math.max(0.5, stp);   // render hook: ice spray intensity 0..1 (nothing consumes it yet)
  const turn = p.turn || 0, xo = _cl((Math.abs(turn) - 1.4) / 1.2, 0, 1) * (sp > 10 ? 1 : 0);
  const edgeIn = typeof p.edge === 'number' && isFinite(p.edge) ? _cl(p.edge, -1, 1) : null;   // sim edge (-1..1, same sign as turn); fallback derives from turn
  _sm(S, 'lean', -(edgeIn !== null ? _cl(edgeIn * 0.8, -0.8, 0.8) * Math.min(1, sp / 12) : _cl(turn * 0.11 * Math.min(1, sp / 18), -0.8, 0.8)), 9, dt);
  _sm(S, 'acc', p.acc01 || 0, 10, dt);
  _sm(S, 'back', p.back ? 1 : 0, 8, dt);                  // A2: back flag as a 0..1 blend
  // drive: are the legs working? coasting (no accel input and slowing) lets the stride freeze; cruising / accelerating / backing keeps it going
  const fatI = _cl(+p.fat || 0, 0, 1); _sm(S, 'fat', fatI, 2, dt);
  const coast = ((p.acc01 || 0) < 0.05 && an.dec > 1.2 && !p.back && sp > 1.2) ? 1 : 0;
  _sm(S, 'drive', sp > 1.2 && !coast ? 1 : 0, coast ? 5 : 9, dt);
  if (sp > 1.2) {
    if (an.still) { if (S.drive < 0.05) an.ph = 0; an.still = false; }   // A3: first push from standstill starts the cycle at 0 (only once the legs have settled, so no pop)
    const boost = 1 + 0.25 * _cl(((p.acc01 || 0) - 0.3) / 0.4, 0, 1);   // A3: faster cadence while accelerating
    const simPh = typeof p.ph === 'number' && isFinite(p.ph);      // sim stride phase (radians) when available, else integrate from speed
    if (simPh) an.ph = p.ph * (ANIM.simPhScale || 1);
    else an.ph += dt * (2.2 + sp * 0.13) * V.stride * boost * (1 - 0.18 * S.fat) * (1 - 1.55 * S.back) * S.drive * S.drive;
  } else an.still = true;
  an.tHand += dt * (7 + 4 * s01);
  const sgn = V.topR ? -1 : 1;                         // lateral side of the stick (left = +1)
  _sm(S, 'carry', c.hasPuck ? 1 : 0, 9, dt);
  _sm(S, 'faceoff', c.faceoff ? 1 : 0, 7, dt);
  _sm(S, 'recv', an.recvT > 0 && !c.hasPuck ? 1 : 0, 9, dt);
  const sprintT = (s01 > 0.62 && !c.hasPuck && !ek && !an.recvT && !c.faceoff) ? 1 : 0;
  const freeT = Math.max(sprintT, ek === 'poke' && !an.ev.sub ? kf(u, [[0, 0], [0.08, 1], [0.36, 1], [0.45, 0]]) : 0);
  _sm(S, 'free', freeT, 7, dt);
  if (ek === 'shot') S.charge = Math.max(0, S.charge - dt / 0.14 * Math.max(S.charge, 0.0001) * 0.9 - dt * 2.2); else _sm(S, 'charge', c.charge || 0, 14, dt);
  const protT = (c.hasPuck && c.opp && c.opp.d < 9 && !ek) ? 1 : 0; _sm(S, 'prot', protT, 6, dt);
  // opponent closing speed -> brace (he comes at me / I carry) or lunge (I close on him without the puck); incoming pass -> shot preload
  const od = c.opp ? c.opp.d : 99; if (an.od < 0) an.od = od; _sm(an, 'clos', _cl((an.od - od) / Math.max(dt, 1e-3), -200, 200), 12, dt); an.od = od;
  const closing = od < 12 && an.clos > 30 && !an.fall, aggressor = !c.hasPuck && c.vf > 14 && Math.abs(c.opp ? c.opp.s : 9) < 4.5;
  const braceT = (closing && !aggressor && (!ek || ek === 'hitmiss')) ? _cl((an.clos - 25) / 45, 0, 1) : 0; _sm(S, 'brace', braceT, braceT ? 14 : 5, dt);
  const lungeT = (!ek && !an.fall && !c.hasPuck && od < 9 && c.vf > 14 && an.clos > 6 && aggressor) ? 1 : 0; _sm(S, 'lunge', lungeT, 8, dt);
  const preT = (an.recvT > 0 && !c.hasPuck && !ek && an.pfv > 0.6 && an.pfv < 9 && Math.abs(an.psv) < 3) ? 0.4 : 0; _sm(S, 'pre', preT, 12, dt);
  const shufT = (!ek && sp > 7 && Math.abs(c.vf) < 9 && Math.abs(c.vlat || 0) > 6) ? _cl((Math.abs(c.vlat) - 6) / 9, 0, 1) : 0; _sm(S, 'shuf', shufT, 8, dt);

  // ---------- 2. event layer (additive offsets, all smooth keyframe curves). Phases per action: anticipation -> contact -> follow-through/recovery ----------
  let eStance = 0, eYaw = 0, eBf = 0, eBs = 0, eBh = 0, eHh = 0, eCr = 0, ePitch = 0, eHead = 0, eHandPull = 0, eWeight = 0, eRoll = 0, cw = 0, cwL = 0;
  const evx = an.ev, rel = ed && ed.rel != null ? ed.rel : (an.relHit || 0), relS = Math.sin(rel), relC = _cl(rel, -1, 1), bkE = evx ? evx.bk : 0, fw = 1 - 2 * bkE;   // rel: target direction, +left, relative to heading; fw: +1 forehand, -1 backhand
  if (ek === 'hitwind' || ek === 'check' || ek === 'hitmiss') an.relHit = rel;
  if (ek === 'shot') {
    const kd = ed.kind, w = V.wind, D = evx.dur;
    if (kd === 'slap' || kd === 'onetimer') {
      // big windup (carried in by the charge / one-timer preload), blade meets the puck at ~70 ms, long high follow-through, hips open, weight onto the front leg
      const A = kd === 'slap' ? 1 : 0.85;
      cw = kf(u, [[0, 0], [0.07, 1], [0.13, 0]]);
      eYaw = sgn * kf(u, [[0, -1.0], [0.07, 0.2], [0.2, 0.95], [0.45, 0.8], [D, 0]]) * A * w; eBf = kf(u, [[0, -0.95], [0.07, 0], [0.2, 0.8], [0.45, 0.5], [D, 0]]) * A;
      eBh = kf(u, [[0, 1.15], [0.07, 0.0], [0.22, 0.7], [0.5, 0.95], [D, 0]]) * A; eHh = kf(u, [[0, 0.62], [0.07, 0.0], [0.22, 0.42], [0.5, 0.42], [D, 0]]) * A; eCr = kf(u, [[0, 0.45], [0.3, 0.2], [D, 0]]); eStance = 0.35 * kf(u, [[0, 1], [0.55, 0.7], [D, 0]]);
      eWeight = kf(u, [[0, -1], [0.07, 0.2], [0.22, 1.1], [0.6, 0.6], [D, 0]]); eRoll = -relS * 0.12 * kf(u, [[0, 0], [0.2, 1], [D, 0]]); eHandPull = -0.06 * kf(u, [[0, 0], [0.25, 1], [D, 0]]);
    } else {
      // wrist: puck rolls along the blade through a long sweep (blade stays on it for ~80 ms), wrists snap up in the follow-through. snap: no windup, short and quick. backhand: puck on the off side, shoulders open the other way, quick lift
      const snap = kd === 'snap', sc = snap ? 0.6 : 1, A = snap ? 0.55 : 0.8;
      cw = snap ? kf(u, [[0, 1], [0.05, 1], [0.1, 0]]) : kf(u, [[0, 1], [0.08, 1], [0.16, 0]]);
      eYaw = sgn * fw * (snap ? kf(u, [[0, -0.12], [0.03, -0.1], [0.14, 0.3], [0.3, 0.2], [D, 0]]) : kf(u, [[0, -0.3], [0.04, -0.3], [0.2, 0.5], [0.38, 0.35], [D, 0]])) * A * w;
      eBf = kf(u, [[0, 0], [0.05, 0], [0.2, 0.5], [0.38, 0.3], [D, 0]]) * sc; eBh = kf(u, [[0, 0], [0.06, 0.02], [0.22, 0.3], [0.38, 0.3], [D, 0]]) * (snap ? 0.4 : 1) * (1 + 0.45 * bkE);
      eHh = 0.05 * kf(u, [[0, 0], [0.2, 1], [D, 0]]) - 0.05 * bkE; eCr = (snap ? 0.1 : 0.2) * kf(u, [[0, 1], [0.35, 0.5], [D, 0]]) + 0.12 * bkE;
      eWeight = sc * fw * kf(u, [[0, -1], [0.12, 1], [0.5, 0.4], [D, 0]]); eRoll = -relS * 0.1 * sc * kf(u, [[0, 0], [0.2, 1], [D, 0]]);
      eBs += sgn * 0.3 * bkE * kf(u, [[0, 0], [0.1, 0], [0.25, 1], [0.5, 0.5], [D, 0]]) - sgn * 0.12 * bkE; ePitch += 0.18 * bkE * kf(u, [[0, 1], [0.4, 1], [D, 0]]);
      eHandPull = (snap ? 0.04 : 0.1) * kf(u, [[0, 1], [0.15, 0], [D, 0]]);
    }
    const uu = u / D;
    eYaw += _cl(rel, -0.6, 0.6) * kf(uu, [[0, 0], [0.12, 1], [0.6, 0.6], [1, 0]]); eBs += relS * 0.35 * kf(uu, [[0, 0], [0.15, 1], [1, 0]]); ePitch += 0.1 * kf(uu, [[0, 0], [0.2, 1], [1, 0]]);
  } else if (ek === 'pass') {
    // sweep: blade starts on the puck, drags across the body, pushes through toward the receiver, hands follow, head looks at the target. backhand: crossed to the off side first
    const sw = kf(u, [[0, 0], [0.05, 0], [0.17, 1], [0.35, 0.8], [0.65, 0]]), rc = _cl(rel, -1.3, 1.3);
    cw = kf(u, [[0, 1], [0.06, 1], [0.14, 0]]);
    eYaw = sgn * fw * kf(u, [[0, -0.2], [0.12, 0.3], [0.3, 0.25], [0.65, 0]]) * V.wind + _cl(rel, -0.7, 0.7) * kf(u, [[0, 0], [0.14, 1], [0.38, 0.8], [0.65, 0]]);
    eBf = (0.3 + 0.35 * Math.cos(rc)) * sw; eBs = Math.sin(rc) * 0.7 * sw - sgn * 0.2 * bkE * kf(u, [[0, 1], [0.1, 0.5], [0.2, 0]]); eBh = 0.06 * sw + 0.04 * bkE * sw;
    eHandPull = kf(u, [[0, 0.1], [0.1, 0.1], [0.17, -0.12], [0.4, -0.05], [0.65, 0]]); eRoll = relS * 0.1 * sw; eWeight = 0.7 * kf(u, [[0, -0.6], [0.12, 1], [0.65, 0]]); eCr = 0.08 * kf(u, [[0, 1], [0.65, 0]]);
    eHead = _cl(rel, -0.9, 0.9) * kf(u, [[0, 0.5], [0.14, 1], [0.5, 0.7], [0.65, 0]]);
  } else if (ek === 'hitwind') {
    // anticipation: coil toward the target, drop and load the back leg, stick tucked to the body
    const W = kf(u, [[0, 0], [0.3, 1], [1, 1]]);
    eYaw = 0.5 * relC * W; ePitch = 0.4 * W; eRoll = relS * 0.25 * W; eCr = 0.3 * W; eHandPull = 0.2 * W; eBf = -0.4 * W; eBh = 0.5 * W; eWeight = -0.5 * W; eStance = 0.15 * W; eHead = _cl(rel, -0.9, 0.9) * W;
  } else if (ek === 'check') {
    // drive: starts from the wind-up pose, shoulder and torso rotate through the target, weight to the front leg, visible contact lean, then recovery
    const pk = 0.7 + 0.5 * evx.pw + (evx.board ? 0.12 : 0), L = kf(u, [[0, 0.5], [0.07, 1], [0.35, 0.9], [0.62, 0.35], [0.85, 0]]);
    eYaw = relC * 1.15 * L * pk; ePitch = (0.45 + (evx.board ? 0.12 : 0)) * L * pk + 0.1 * kf(u, [[0, 0], [0.07, 1], [0.85, 0]]); eRoll = relS * 0.5 * L * pk; eCr = 0.38 * kf(u, [[0, 0.8], [0.4, 0.7], [0.85, 0]]); eStance = 0.25 * L; eWeight = kf(u, [[0, -0.5], [0.07, 1.1], [0.45, 0.8], [0.85, 0]]);
    eBf = -0.4 * kf(u, [[0, 1], [0.1, 1], [0.5, 0.8], [0.85, 0]]); eBh = 0.75 * kf(u, [[0, 0.7], [0.1, 1], [0.5, 0.9], [0.85, 0]]); eHandPull = 0.25 * L; eHead = _cl(rel, -0.9, 0.9) * kf(u, [[0, 1], [0.5, 0.8], [0.85, 0]]);
  } else if (ek === 'hitmiss') {
    // overshoot: carried past the target, off balance, arms out, then regain the stance
    const L = kf(u, [[0, 0.6], [0.15, 1], [0.5, 0.35], [0.9, 0]]), wob = Math.sin(u * 11) * Math.exp(-u * 2.2);
    eYaw = relC * 1.0 * L; ePitch = 0.4 * kf(u, [[0, 1], [0.2, 1.3], [0.55, 0.3], [0.9, 0]]); eRoll = relS * 0.35 * L + wob * 0.28; eCr = 0.3 * L; eWeight = kf(u, [[0, 0.3], [0.15, 1], [0.9, 0]]); eStance = 0.3 * L; eHandPull = 0.1 * L;
    eBf = -0.25 * L; eBh = 0.4 * L;
    _sm(S, 'flail', 0.55 * kf(u, [[0, 0], [0.12, 1], [0.6, 0.5], [0.85, 0]]), 14, dt);
  } else if (ek === 'checked') {
    // victim: jolt along the push direction (pitch/lean), whip of the head, stagger wobble, arms fly out; scaled by power, braced hits are absorbed, board hits press the body into the wall
    const pw = _cl(evx.pw, 0.2, 1) * (1 - 0.45 * evx.br), hasDir = typeof ed.dir === 'number' || (ed.dir && ed.dir.x !== undefined), cd = hasDir ? Math.cos(evx.dr) : -0.7, sdv = hasDir ? Math.sin(evx.dr) : (ed.side || 1) * 0.7, bd = evx.board ? 1 : 0;
    const R = bd ? kf(u, [[0, 1], [0.3, 1], [0.7, 0.55], [1, 0]]) : kf(u, [[0, 1], [0.14, 1], [0.5, 0.25], [1, 0]]), stag = Math.sin(u * 13) * Math.exp(-u * 2.4);
    ePitch = 0.6 * pw * cd * R + 0.18 * pw * kf(u, [[0.3, 0], [0.55, 1], [1, 0]]); eYaw = sdv * 0.7 * pw * R; eRoll = sdv * (0.5 + 0.25 * bd) * pw * R + 0.18 * pw * stag; eHead = -sdv * 0.8 * pw * R;
    eCr = (0.3 + 0.2 * bd) * pw * kf(u, [[0, 0.4], [0.2, 1], [0.6, 0.7], [1, 0]]); eStance = 0.3 * pw * R; eBf = -0.2 * bd * R; eWeight = 0.5 * pw * stag; eHandPull = 0.1 * pw * R;
    _sm(S, 'flail', pw * (1 - 0.6 * bd) * kf(u, [[0, 0], [0.08, 1], [0.6, 0.5], [0.85, 0]]), 20, dt);
  } else if (ek === 'poke') {
    if (evx.sub) {
      // stick lift: both hands stay on, blade slides under the carrier's stick then snaps up
      cwL = kf(u, [[0, 0], [0.1, 1], [0.22, 1], [0.36, 0]]);
      eBh = 0.5 * kf(u, [[0, 0], [0.1, 0], [0.24, 1], [0.34, 0.6], [0.55, 0]]); eBf = 0.12 * kf(u, [[0, 0], [0.2, 1], [0.55, 0]]); eHh = 0.1 * kf(u, [[0, 0], [0.12, 0], [0.26, 1], [0.55, 0]]); ePitch = 0.15 * kf(u, [[0, 0], [0.1, 1], [0.55, 0]]);
      eYaw = _cl(rel, -0.5, 0.5) * kf(u, [[0, 0], [0.1, 1], [0.55, 0]]); eCr = 0.12 * kf(u, [[0, 0], [0.1, 1], [0.55, 0]]); eWeight = 0.4 * kf(u, [[0, 0], [0.1, 1], [0.55, 0]]);
    } else {
      // poke: lunge, one hand off the stick, blade shoots out at full reach, then pulls back
      cwL = kf(u, [[0, 0], [0.1, 1], [0.26, 1], [0.45, 0]]);
      eBf = 0.35 * kf(u, [[0, 0], [0.1, 1], [0.26, 1], [0.45, 0]]); ePitch = 0.34 * kf(u, [[0, 0], [0.1, 1], [0.3, 0.8], [0.45, 0]]); eYaw = _cl(rel, -0.5, 0.5) * kf(u, [[0, 0], [0.1, 1], [0.45, 0]]); eCr = 0.25 * kf(u, [[0, 0], [0.1, 1], [0.45, 0]]);
      eHandPull = -0.1 * kf(u, [[0, 0], [0.1, 1], [0.26, 1], [0.45, 0]]); eWeight = kf(u, [[0, 0], [0.1, 1], [0.3, 0.8], [0.45, 0]]); eStance = 0.2 * kf(u, [[0, 0], [0.1, 1], [0.45, 0]]);
    }
  } else if (ek === 'draw') {
    eBf = -0.55 * kf(u, [[0, 0], [0.12, 1], [0.3, 0.4], [0.5, 0]]); eYaw = sgn * 0.3 * kf(u, [[0, 0], [0.12, 1], [0.5, 0]]); eHandPull = 0.2 * kf(u, [[0, 0], [0.12, 1], [0.5, 0]]);
  }
  if (ek) { const ein = (ek === 'check' || ek === 'checked' || ek === 'hitmiss') ? _es(u / 0.035) : _es(u / 0.09); eYaw *= ein; eBf *= ein; eBs *= ein; eBh *= ein; eHh *= ein; eCr *= ein; ePitch *= ein; eHead *= ein; eHandPull *= ein; eWeight *= ein; eRoll *= ein; eStance *= ein; }
  if (ek !== 'checked' && ek !== 'hitmiss' && !an.fall) _sm(S, 'flail', 0, 8, dt);
  // charging a shot (human) or preloading a one-timer while the pass arrives: visible windup before the release
  const ch = Math.max(S.charge, S.pre);
  if (ch > 0.02) { const slap = _es((S.charge - 0.62) / 0.3); eYaw += sgn * (-0.3 - 0.7 * slap) * ch * V.wind; eBf += (-0.35 - 0.6 * slap) * ch; eBh += (0.15 + 1.0 * slap) * ch; eHh += 0.6 * slap * ch; eCr += 0.15 * ch + 0.25 * slap * ch; eStance += 0.3 * slap * ch + 0.15 * S.pre; eWeight -= 0.5 * ch; }
  // receiving: cushion the puck (hands give, blade drifts back with it), then hand off into stickhandling
  const cush = an.cush > 0 ? kf(an.cush / 0.35, [[0, 0], [0.5, 1], [1, 0.3]]) : 0; { const cq = an.cq || 1; eHandPull += 0.16 * cush * cq; eBf -= 0.2 * cush * (cq > 2 ? -1.2 : 1) * Math.min(cq, 2); eHh -= 0.04 * cush * cq; }
  // incoming pass on the off side (backhand reception): shoulders turn to the puck, hands a touch lower
  if (S.recv > 0.01) { const rb = _es((-an.psv * sgn - 0.2) / 0.5); eYaw += _cl(Math.atan2(an.psv, Math.max(an.pfv, 0.5)), -0.6, 0.6) * 0.6 * S.recv; eHh -= 0.06 * rb * S.recv; eCr += 0.08 * S.recv; }
  // opponent bearing down: brace (low, wide, shoulder turned in, elbows tucked) / checker closing: lunge posture
  if (S.brace > 0.01) { const os = c.opp && c.opp.s > 0 ? 1 : -1; eCr += 0.25 * S.brace; eStance += 0.25 * S.brace; ePitch += 0.2 * S.brace; eYaw += os * 0.5 * S.brace; eHandPull += 0.1 * S.brace; eHh += 0.04 * S.brace; eRoll += os * 0.12 * S.brace; }
  if (S.lunge > 0.01) { const os = c.opp && c.opp.s > 0 ? 1 : -1; eCr += 0.12 * S.lunge; ePitch += 0.16 * S.lunge; eYaw += os * 0.25 * S.lunge; eBh += 0.2 * S.lunge; eHandPull += 0.08 * S.lunge; }
  // fall layer extras: legs buckle, then a visible getting-up phase (hands to ice, knees, push up)
  if (an.fall) { const ft = an.fall.t; eCr += 0.5 * kf(ft, [[0, 0], [0.25, 0.3], [0.9, 0.3], [1.2, 1], [1.6, 0.3], [1.7, 0]]); ePitch += 0.45 * kf(ft, [[0, 0], [0.9, 0], [1.2, 1], [1.7, 0]]); _sm(S, 'flail', kf(ft, [[0, 0.3], [0.1, 1], [0.9, 0.6], [1.2, 0.9], [1.7, 0]]), 14, dt); }

  // ---------- 3. stances ----------
  let crouch = _cl(0.5 + 0.06 * S.stop + 0.25 * S.faceoff + eCr + V.crouch + 0.15 * S.prot + 0.12 * S.shuf + (c.vis ? 0.16 : 0), 0, 1.2);
  _sm(S, 'crouch', crouch, 10, dt); crouch = S.crouch;
  const yawTurn = _cl(turn * 0.06 * Math.min(1, sp / 16), -0.35, 0.35) * YL * -1;     // shoulders lead the turn
  const protSide = c.opp ? (c.opp.s > 0 ? 1 : -1) : 0;
  const yawTotal = _cl(yawTurn + YL * eYaw + YL * protSide * 0.5 * S.prot + YL * sgn * 0.25 * S.faceoff, -1.3, 1.3);
  _sm(S, 'yaw', yawTotal, 16, dt);

  // ---------- 4. base pose: legs + torso (existing skating layer) + modifiers ----------
  const lean = S.lean;
  const pose = SK.skatePose(m, an.ph, s01, lean, S.acc, S.back, S.drive * (1 - 0.25 * S.fat));
  for (const k of ['upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'hand_r']) delete pose[k];
  const ex = crouch - 0.5 + 0.1 + 0.28 * S.stop;                                    // extra flexion beyond the skating pose
  for (const sd of ['l', 'r']) { pose['thigh_' + sd].p -= 0.5 * ex; pose['calf_' + sd].p += 0.45 * ex; }
  // weight transfer: front leg (opposite the stick hand) loads when eWeight > 0, the back leg drives; negative = loaded onto the back leg
  { const fr = sgn > 0 ? 'r' : 'l', rr = fr === 'l' ? 'r' : 'l'; pose['thigh_' + fr].p -= 0.15 * eWeight; pose['calf_' + fr].p += 0.2 * eWeight; pose['thigh_' + rr].p += 0.1 * eWeight; pose['calf_' + rr].p -= 0.15 * eWeight; }
  // backskating: hips open toward the travel direction, legs follow with a wide C-cut (toes alternate), torso stays square to the attacker
  const bkA = S.back, hipOpen = 0.5 * bkA * V.stopSide * YL, lobeL = Math.max(0, Math.sin(an.ph)) * S.drive, lobeR = Math.max(0, -Math.sin(an.ph)) * S.drive;
  for (const sd of ['l', 'r']) {
    pose['thigh_' + sd].r += SK.abd[sd] * eStance;
    if (bkA > 0.01) { const lobe = sd === 'l' ? lobeL : lobeR; pose['thigh_' + sd].y = hipOpen * 0.9 + SK.abd[sd] * (0.12 + 0.4 * lobe) * bkA; pose['calf_' + sd].y = pose['thigh_' + sd].y; }
    pose['calf_' + sd].r = pose['thigh_' + sd].r;
  }
  // defensive side shuffle: square to the play, wide base, trailing leg pushes, lead leg steps across
  if (S.shuf > 0.01) { const mv = (c.vlat || 0) > 0; for (const sd of ['l', 'r']) { const trail = (sd === 'r') === mv, lift = Math.max(0, Math.sin(an.ph + (sd === 'l' ? 0 : Math.PI))) * S.shuf;
    pose['thigh_' + sd].r += SK.abd[sd] * (trail ? 0.38 : 0.1) * S.shuf; pose['calf_' + sd].r = pose['thigh_' + sd].r; pose['thigh_' + sd].p -= 0.2 * lift; pose['calf_' + sd].p += 0.3 * lift; } }
  // pivot: low speed, fast heading change: alternating steps that rotate the skates toward the turn
  const pivT = (sp < 9 && Math.abs(turn) > 1.9 && !an.fall) ? 1 : 0; _sm(S, 'pivot', pivT, 10, dt); an.pivPh += dt * 8 * S.pivot;
  const beta = sp > 4 ? (1 - S.shuf) * _cl(Math.atan2(c.vlat || 0, Math.max(c.vf, 2)) * YL * 0.85, -0.6, 0.6) : 0, edge = SK.rollLeft * lean * 0.55;
  for (const sd of ['l', 'r']) {
    const lift = Math.max(0, Math.sin(an.pivPh + (sd === 'l' ? 0 : Math.PI))) * S.pivot;
    pose['thigh_' + sd].p -= 0.35 * lift; pose['calf_' + sd].p += 0.5 * lift;
    pose['foot_' + sd] = { p: pose['foot_' + sd].p, y: beta * (1 - S.stop) - Math.sign(turn || 1) * YL * 0.5 * lift + (pose['thigh_' + sd].y || 0) * (0.6 + 0.3 * S.back), r: edge - pose['thigh_' + sd].r * 0.35 };
  }
  if (xo > 0) for (const sd of ['l', 'r']) { const outside = (sd === 'l') === (lean < 0); if (outside) { pose['thigh_' + sd].r *= (1 - 1.9 * xo); pose['calf_' + sd].r = pose['thigh_' + sd].r; } }
  const sway = Math.sin(an.ph) * S.drive * 0.12 * s01 * V.sway * SK.rollLeft;   // A5: load the stance leg
  pose.pelvis.r += SK.rollLeft * V.stopSide * YL * 0.22 * S.stop + sway - SK.rollLeft * 0.08 * eWeight + SK.rollLeft * (eRoll + (c.vlat > 0 ? 1 : -1) * 0.14 * S.shuf) * 0.4; { const rr = SK.rollLeft * (eRoll + (c.vlat > 0 ? 1 : -1) * 0.14 * S.shuf) * 0.2; pose.spine_01.r += rr; pose.spine_02.r += rr; pose.spine_03.r += rr; } pose.spine_01.r -= sway * 0.5; pose.spine_02.r -= sway * 0.7; pose.spine_03.r -= sway * 0.7;
  const pit = ePitch + 0.4 * S.faceoff - 0.22 * S.stop + 0.35 * S.acc * (1 - s01) * S.drive; pose.pelvis.p += 0.2 * pit + 0.08 * ex; pose.spine_01.p += 0.35 * pit; pose.spine_02.p += 0.35 * pit; pose.spine_03.p += 0.35 * pit + 0.1 * S.faceoff;
  const Y = S.yaw; pose.pelvis.y = Y * 0.25 + hipOpen; pose.spine_01.y = Y * 0.5 + hipOpen * 0.5; pose.spine_02.y = Y * 0.8; pose.spine_03.y = Y;
  // head: looks at the puck / the target, kept level against the body twist
    pose.neck_01.y = -Y * 0.3 + eHead * 0.4 * YL; pose.Head.y = -Y * 0.35 + eHead * 0.5 * YL; pose.Head.p = -0.1 + 0.3 * S.faceoff - 0.4 * ePitch;
  // whole-model yaw for the hockey stop (skates turn across the direction of travel)
  m.inner.rotation.y = Math.PI / 2 + S.stop * V.stopSide * 1.15;

  // fall layer: rotate the whole body about the forward axis, then recover
  let fallA = 0;
  if (an.fall) { const t = an.fall.t, side = an.fall.side; fallA = side * kf(t, [[0, 0], [0.28, 1.3], [0.9, 1.3], [1.5, 0.35], [1.7, 0]]); for (const sd of ['l', 'r']) { pose['thigh_' + sd].r *= 1.0 + 1.5 * Math.abs(fallA); } }
  m.root.rotation.z = fallA;

  // ---------- 5. pass 1: legs/torso into the skeleton, ground contact, read shoulders ----------
  SK.setPose(m, pose); SK.ground2(m); m.g.updateMatrixWorld(true);
  { // ---- legs IK: add push-off / recovery swing / backward placement / turn loading, plant the feet when (nearly) still, keep the blades on the ice ----
    const ice0 = -m.root.position.y, Fq = X.Fb.copy(SK.F).applyAxisAngle(SK.U, pose.pelvis.y || 0), Lq = X.Sb.copy(SK.Ld).applyAxisAngle(SK.U, pose.pelvis.y || 0);
    const slow = 1 - _es((sp - 2.5) / 3.5); _sm(S, 'plant', slow * (an.fall ? 0 : 1) * (1 - S.pivot), slow > S.plant ? 12 : 30, dt);
    const bk = S.back, dv = S.drive, sl = Math.sin(an.ph), accP = 0.6 + 0.4 * S.acc, outsideL = lean < 0 ? 1 : -1;   // lean<0 : left turn (outside = right leg)
    _sm(S, 'load', _cl(Math.abs(lean) / 0.8, 0, 1), 8, dt);
    an.legD = an.legD || { l: new THREE.Vector3(), r: new THREE.Vector3() };
    for (const sd of ['l', 'r']) {
      const lobe = Math.max(0, sd === 'l' ? sl : -sl) * dv, other = Math.max(0, sd === 'l' ? -sl : sl) * dv, out = sd === 'l' ? 1 : -1;   // push lobe / recovery lobe
      const d = an.legD[sd].set(0, 0, 0), k = Math.min(1, sp * 0.25);
      // forward: push leg drives back and out (diagonal C-cut), recovery leg swings forward under the body; backward skating mirrors the push
      d.addScaledVector(Fq, k * (-0.075 * lobe * accP * (1 - 2 * bk) + 0.07 * other * (1 - 2 * bk)));
      d.addScaledVector(Lq, out * k * (0.005 * lobe * accP * (1 + 0.8 * bk) - 0.003 * other));
      d.y += k * 0.07 * other * (1 - 0.5 * bk);                        // recovery foot clears the ice
      // turn: loaded outside leg is pushed wide and the inside foot tucks under
      const isOut = (sd === 'r') === (outsideL > 0);
      d.addScaledVector(Lq, out * S.load * (isOut ? 0.05 : -0.04) * k);
      // hockey stop: front foot ahead, back foot trailing, both a little wider
      d.addScaledVector(Fq, S.stop * (sd === (V.stopSide > 0 ? 'l' : 'r') ? 0.07 : -0.05)); d.addScaledVector(Lq, out * 0.04 * S.stop);
      d.pw = S.plant;
    }
    AR.legs(m, an, pose, an.legD, ice0);
    SK.setPose(m, pose); SK.ground2(m); m.g.updateMatrixWorld(true);
  }
  const iceY = -m.root.position.y;
  AR.pos(m, 'pelvis', X.O); X.O.y = iceY;
  const Yb = pose.spine_02.y; X.Fb.copy(SK.F).applyAxisAngle(SK.U, Yb); X.Sb.copy(SK.Ld).applyAxisAngle(SK.U, Yb);
  X.pu.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.pu);
  const pf = X.tmp.copy(X.pu).sub(X.O).dot(X.Fb), ps = X.tmp.copy(X.pu).sub(X.O).dot(X.Sb); an.pfv = pf; an.psv = ps; X.tmp.copy(X.pu).sub(X.O); an.pfh = X.tmp.dot(SK.F); an.psh = X.tmp.dot(SK.Ld);   // puck in the heading frame (survives torso twist)

  // ---------- 6. stick targets (blade) ----------
  let bf = 1.26 + 0.05 * Math.sin(an.ph) * s01, bs = 0.22 * sgn + 0.06 * Math.sin(an.ph) * s01 * sgn, bh = 0.03;
  { const bsf = Math.max(S.back, S.shuf); bf += 0.16 * bsf; bs += (0.1 * sgn - bs) * 0.55 * bsf; }   // stick out in front, near the centre line
  // carrying: blade follows the real puck with a stickhandling dangle (puck itself is never moved)
  if (S.carry > 0.01) {
    const dang = Math.sin(an.tHand) * 0.2 * V.carry * (1 - 0.5 * s01) * (1 - 0.7 * S.prot) * (0.2 + 0.8 * _es(an.gainT / 0.45)), cf = _cl(pf, 0.7, 1.5), cs = _cl(ps + dang - 0.38 * protSide * S.prot, -0.9, 0.9);
    bf = _cl(bf + (cf - bf) * S.carry, 0.5, 1.6); bs = bs + (cs - bs) * S.carry;
  }
  if (S.recv > 0.01) { const rf = _cl(pf, 0.5, 1.7), rs = _cl(ps, -1.0, 1.0); bf += (rf - bf) * S.recv; bs += (rs - bs) * S.recv; }
  if (cwL > 0.001) { bf += (_cl(pf, 0.8, 1.75) - bf) * cwL; bs += (_cl(ps, -0.9, 0.9) - bs) * cwL; }   // poke / lift: reach for the live puck
  if (S.faceoff > 0.01) { bf += (0.78 - bf) * S.faceoff; bs += (0.05 * sgn - bs) * S.faceoff; }
  if (cw > 0.001) { X.tmp.copy(SK.F).multiplyScalar(evx.hf).addScaledVector(SK.Ld, evx.hs); bf += (_cl(X.tmp.dot(X.Fb), 0.45, 1.6) - bf) * cw; bs += (_cl(X.tmp.dot(X.Sb), -0.9, 0.9) - bs) * cw; }   // contact: the blade meets the puck where it was at release
  bf += eBf; bs += eBs; bh += eBh;
  { // the blade can only move so fast: low-pass the target (a pass arriving at speed must not teleport the stick)
    const F = an.F || (an.F = { bf, bs, bh }), r = ek ? (ek === 'shot' && u < 0.14 && cw > 0 ? 75 : 34) : 20, k = 1 - Math.exp(-r * dt); F.bf += (bf - F.bf) * k; F.bs += (bs - F.bs) * k; F.bh += (bh - F.bh) * k; bf = F.bf; bs = F.bs; bh = F.bh;
  }
  at(X.Bt, bf, bs, bh, iceY);
  // top hand anchor (belly height, forward); shaft is 1.3 m from top hand to heel at rest
  const hH = 0.82 - 0.12 * (crouch - 0.5) - 0.2 * S.faceoff + eHh;
  at(X.Th, 0.34 - eHandPull, 0.1 * sgn - 0.05 * Math.sin(an.tHand) * S.carry * sgn, hH, iceY);
  // hands slide so the blade reaches the target: top hand moves at most 0.24 m from its anchor
  X.tmp.copy(X.Bt).sub(X.Th); const dist = X.tmp.length(); X.tmp.multiplyScalar(1 / (dist || 1));
  X.Tt.copy(X.Bt).addScaledVector(X.tmp, -AR.Lg); X.Tt.sub(X.Th); const ol = X.Tt.length(); const lim = 0.24 + 0.55 * _cl(eHh / 0.5, 0, 1); if (ol > lim) X.Tt.multiplyScalar(lim / ol); X.Tt.add(X.Th);
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
    at(X.Tt, 0.02, 0.15 * lt0, 1.62 + wob, iceY); at(X.Tb, 0.02, -0.15 * lt0, 1.62 - wob, iceY);
    X.tmp.copy(X.Tb).sub(X.Tt).normalize(); X.Hl.copy(X.Tt).addScaledVector(X.tmp, 1.25); X.bd.copy(X.tmp);
  }
  // ---------- 7. arm IK, second pass ----------
  const lb = botSide === 'l' ? 1 : -1, lt = topSide === 'l' ? 1 : -1;
  X.pole.set(0, 0, 0).addScaledVector(X.Sb, lt * 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2);
  X.sh.copy(X.Hl).sub(X.Tt).normalize();                      // shaft direction toward the blade
  X.tmp.copy(X.Sb).multiplyScalar(-lt); AR.hand(m, topSide, X.sh, X.tmp, pose); X.Ttw.copy(X.Tt).sub(AR.palmV[topSide]);   // wrist target: palm (not wrist) sits on the shaft
  X.tmp.copy(X.Sb).multiplyScalar(-lb); AR.hand(m, botSide, X.sh, X.tmp, pose); X.Tbw.copy(X.Tb).sub(AR.palmV[botSide]);
  AR.arm(m, topSide, X.Ttw, X.pole, pose);
  X.pole.set(0, 0, 0).addScaledVector(X.Sb, lb * 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2);
  AR.arm(m, botSide, X.Tbw, X.pole, pose);
  // celebration: arms overhead (classic skating celebration), stick held low in the top hand
  if (!SK.mobile() && AR.cal) { const kc = 0.85 * (1 - S.free * 0.0); AR.curl(pose, topSide, kc); AR.curl(pose, botSide, kc * (1 - 0.6 * Math.max(S.free, S.flail))); }
  SK.setPose(m, pose);
  AR.placeStick(m, X.Tt, X.Hl, X.bd);
  if (!SK.mobile() && !AR.cal) { AR.cal = {}; m.g.updateMatrixWorld(true); AR.cal[topSide] = AR.calibrate(m, topSide, X.Tt, X.sh); AR.cal[botSide] = AR.calibrate(m, botSide, X.Tb, X.sh); }
  m.stick.shaft.visible = m.stick.blade.visible = !m.wrench;
  // visual puck: sits on the blade while carried (render-only; the simulated puck is untouched)
  if (S.carry > 0.8 && !ek) { X.pu.copy(X.Hl).addScaledVector(X.bd, 0.2); X.pu.y = iceY + 0.02; an.heelOk = true; if (!an.heelW) an.heelW = V3(); an.heelW.copy(X.pu); m.root.localToWorld(an.heelW); } else an.heelOk = false;

  // ---------- 8. state label (for tests and debugging) ----------
  an.state = c.celeb ? 'celebrating' : S.pivot > 0.5 ? 'pivoting' : an.fall ? 'falling' : ek === 'checked' ? 'getting_checked' : ek === 'check' ? 'body_check' : ek === 'hitwind' ? 'hit_windup' : ek === 'hitmiss' ? 'hit_miss' : ek === 'shot' ? (bkE > 0.5 ? 'shot_backhand' : 'shot_' + (ed.kind || 'wrist')) : ek === 'pass' ? 'passing' : ek === 'poke' ? (evx.sub ? 'stick_lift' : 'poke_check') : ek === 'draw' ? 'faceoff_draw'
    : c.faceoff ? 'faceoff_stance' : S.stop > 0.5 ? 'stopping' : S.recv > 0.5 ? 'receiving_pass' : S.charge > 0.1 ? 'preparing_shot' : S.shuf > 0.5 ? 'side_shuffle' : S.brace > 0.5 ? 'bracing' : p.back ? 'backward_skating' : S.carry > 0.6 ? (S.prot > 0.5 ? 'protecting_puck' : 'stickhandling')
      : xo > 0.4 ? 'crossover_turn' : Math.abs(turn) > 1.2 ? (turn > 0 ? 'turning_right' : 'turning_left') : sp < 1 ? 'ready' : S.acc > 0.5 ? 'accelerating' : s01 > 0.8 ? 'sprint_skating' : S.acc < 0.15 && s01 > 0.3 ? 'gliding' : 'skating';
  if (ANIM.debug) { m.g.updateMatrixWorld(true); an.metrics = ANIM.measure(m, X.Tt, X.Tb, topSide, botSide, iceY); }
};

// joint/stick assertions for the test harness
ANIM.measure = function (m, Tt, Tb, topSide, botSide, iceY) {
  const a = V3(), b = V3(), tp = V3(); const palm = (s, out) => { out.set(0, 0, 0); for (const f of ['index', 'middle', 'ring', 'pinky']) { AR.pos(m, f + '_01_' + s, tp); out.add(tp); } return out.multiplyScalar(0.25); }; palm(topSide, a); palm(botSide, b);
  const st = m.stick, dir = st.dir, off = (h, T) => { const w = h.clone().sub(T); const along = w.dot(dir), perp = w.clone().addScaledVector(dir, -along); return perp.length(); };
  const fl = (s) => { if (!AR.cal || !AR.cal[s]) return -1; const tp = V3(); AR.pos(m, 'index_04_leaf_' + s, tp); const w = tp.clone().sub(s === topSide ? Tt : Tb); return w.addScaledVector(dir, -w.dot(dir)).length(); };
  return { gripHeight: Tt.y - iceY, fingerTop: fl(topSide), fingerBot: fl(botSide), topHandToGrip: a.distanceTo(Tt), botHandToGrip: b.distanceTo(Tb), topHandOffShaft: off(a, Tt), botHandOffShaft: off(b, Tt), bladeHeight: st.heel.y - iceY, handsApart: a.distanceTo(b) };
};

window.ANIM = ANIM;
})();
