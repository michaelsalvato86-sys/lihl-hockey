/* Goalie animation controller: ready stance, lateral shuffle, T-push, butterfly drop/recovery,
   glove / blocker / pad / stick saves, covering the puck, reaction to a goal. Driven by real save events. */
(function () {
  'use strict';
  const GOAL = { ready: false, dur: { save: 0.95, cover: 1.2, goalagainst: 1.3 } };
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)), es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const kf = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
  const V = () => new THREE.Vector3();
  const X = { O: V(), Fb: V(), Sb: V(), Tt: V(), Tg: V(), Hl: V(), bd: V(), pole: V(), tmp: V(), sh: V() };
  GOAL.init = function () { GOAL.ready = true; };
  function at(out, f, s, h, iceY) { out.copy(X.O).addScaledVector(X.Fb, f).addScaledVector(X.Sb, s); out.y = iceY + h; return out; }

  GOAL.apply = function (m, g, c, dt) {
    dt = Math.min(dt, 0.05);
    const an = m.ga || (m.ga = { prevY: g.y, vy: 0, lat: 0, ph: 0, ev: null, evId: 0, q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion() }, state: 'ready', hold: 0 });
    m.an = m.an || an; m.an.q = an.q; // AR.arm writes into m.an.q
    const dir = g.team ? g.team.dir : 1;
    // lateral speed from real goalie motion
    const vy = (g.y - an.prevY) / Math.max(dt, 1e-3); an.prevY = g.y; an.vy += (vy - an.vy) * (1 - Math.exp(-12 * dt));
    const latT = cl(-an.vy * dir / 25, -1, 1); an.lat += (latT - an.lat) * (1 - Math.exp(-10 * dt));
    an.ph += dt * (3 + Math.abs(an.lat) * 8);
    // events
    if (g.ae && g.ae.id !== an.evId) { an.evId = g.ae.id; an.ev = { k: g.ae.k, t: 0, d: g.ae.d || {}, dur: GOAL.dur[g.ae.k] || 0.9 }; }
    if (an.ev) { an.ev.t += dt; if (an.ev.t > an.ev.dur) an.ev = null; }
    const ek = an.ev ? an.ev.k : '', u = an.ev ? an.ev.t : 0, d = an.ev ? an.ev.d : {};
    const kind = ek === 'save' ? d.kind : ek === 'cover' ? 'butterfly' : '';
    const sideS = d.side === 'l' ? 1 : -1;                                 // + = goalie's left
    const bf = kind === 'butterfly' ? (ek === 'cover' ? kf(u, [[0, 0], [0.18, 1], [0.9, 1], [1.2, 0]]) : kf(u, [[0, 0], [0.16, 1], [0.6, 1], [0.95, 0]])) : 0;
    const reach = (kind === 'glove' || kind === 'blocker' || kind === 'stick') ? kf(u, [[0, 0], [0.1, 1], [0.5, 1], [0.92, 0]]) : 0;
    const padk = kind === 'pad' ? kf(u, [[0, 0], [0.12, 1], [0.45, 1], [0.9, 0]]) : 0;
    const slump = ek === 'goalagainst' ? kf(u, [[0, 0], [0.25, 1], [0.9, 1], [1.3, 0]]) : 0;
    const tp = Math.max(0, (Math.abs(an.lat) - 0.55) / 0.45);               // T-push when travelling fast
    const SKm = SK;
    // ---------- legs / torso ----------
    const pose = {};
    for (const sd of ['l', 'r']) {
      const leadsT = (sd === 'l') === (an.lat > 0), trail = tp > 0 && !leadsT ? tp : 0, kick = (kind === 'pad' && (sd === 'l') === (sideS > 0)) ? padk : 0;
      const shuf = Math.sin(an.ph + (sd === 'l' ? 0 : Math.PI)) * 0.1 * Math.min(1, Math.abs(an.lat) * 2);
      const th = -0.88 - 0.32 * bf + 0.6 * trail - 0.65 * kick, ab = 0.26 + 0.78 * bf + 0.6 * trail + 0.14 * (leadsT ? Math.abs(an.lat) : 0) + shuf + 0.85 * kick;
      pose['thigh_' + sd] = { p: th, r: SKm.abd[sd] * ab }; pose['calf_' + sd] = { p: 0.5 + 0.42 * bf - 0.7 * trail - 0.2 * kick, r: SKm.abd[sd] * ab }; pose['foot_' + sd] = { p: 0 };
    }
    const lean = SKm.rollLeft * (0.12 * an.lat + 0.18 * reach * sideS + 0.14 * padk * sideS);
    pose.pelvis = { p: 0.26 - 0.1 * bf + 0.1 * slump, r: lean * 0.5 }; pose.spine_01 = { p: 0.34 - 0.22 * bf + 0.12 * slump, r: lean * 0.4 }; pose.spine_02 = { p: 0.42 - 0.3 * bf + 0.15 * slump, r: lean * 0.4 }; pose.spine_03 = { p: 0.46 - 0.34 * bf + 0.2 * slump, r: lean * 0.3 };
    pose.neck_01 = { p: 0.2 + 0.2 * slump }; pose.Head = { p: -0.2 + 0.45 * slump };
    SK.setPose(m, pose); SK.ground(m); m.g.updateMatrixWorld(true);
    const iceY = -m.root.position.y; AR.pos(m, 'pelvis', X.O); X.O.y = iceY; X.Fb.copy(SK.F); X.Sb.copy(SK.Ld);
    X.tmp.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.tmp); const ps = X.tmp.clone().sub(X.O).dot(X.Sb);
    // ---------- arms: glove (left), blocker + stick (right) ----------
    const hh = d.h != null ? d.h / 2 : 0.5;
    // blocker hand / stick: top hand anchored, paddle on the ice in front; follows the puck side slightly
    let sTarget = cl(ps * 0.15, -0.35, 0.35) * 0.0 - 0.12; const stickSwing = kind === 'stick' ? sideS * 0.95 * reach : 0;
    at(X.Tt, 0.42, -0.26 + (kind === 'blocker' ? sideS * -0.0 : 0) + (kind === 'blocker' ? sideS * 0.55 * reach : 0), 0.62 + (kind === 'blocker' ? (0.25 + 0.5 * hh) * reach : 0) - 0.1 * bf, iceY);
    at(X.Hl, 1.0, sTarget + stickSwing + (kind === 'blocker' ? sideS * 0.5 * reach : 0), 0.03, iceY);
    X.tmp.copy(X.Hl).sub(X.Tt); const sl = cl(X.tmp.length(), 0.9, 1.5); X.tmp.normalize(); X.Hl.copy(X.Tt).addScaledVector(X.tmp, sl);
    X.bd.set(X.tmp.x, 0, X.tmp.z).normalize();
    // glove hand: up and out in the ready stance, snaps to the puck on a glove save
    const gx = 0.5 + (kind === 'glove' ? sideS * 0.3 * reach : 0), gh = 0.95 + (kind === 'glove' ? (0.1 + 0.55 * hh) * reach : 0) - 0.25 * bf + 0.1 * Math.sin(an.ph) * Math.abs(an.lat);
    at(X.Tg, 0.5 + 0.12 * reach, gx * 1 + (kind === 'glove' && sideS < 0 ? -0.0 : 0), gh, iceY);
    if (kind === 'glove') { X.Tg.copy(X.O).addScaledVector(X.Fb, 0.55).addScaledVector(X.Sb, 0.45 + sideS * 0.4 * reach); X.Tg.y = iceY + 0.95 + (0.1 + 0.55 * hh) * reach; }
    const Lt = AR.len.r.l1 + AR.len.r.l2 - 0.03; AR.pos(m, 'upperarm_r', X.sh); X.tmp.copy(X.Tt).sub(X.sh); const dl = X.tmp.length(); if (dl > Lt) X.Tt.copy(X.sh).addScaledVector(X.tmp, Lt / dl);
    X.pole.set(0, 0, 0).addScaledVector(X.Sb, -0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2); AR.arm(m, 'r', X.Tt, X.pole, pose);
    X.pole.set(0, 0, 0).addScaledVector(X.Sb, 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2); AR.arm(m, 'l', X.Tg, X.pole, pose);
    SK.setPose(m, pose); AR.placeStick(m, X.Tt, X.Hl, X.bd);
    an.state = ek === 'goalagainst' ? 'goalie_goal_against' : ek === 'cover' ? 'goalie_cover' : kind === 'butterfly' ? 'goalie_butterfly' : kind === 'glove' ? 'goalie_glove_save' : kind === 'blocker' ? 'goalie_blocker_save' : kind === 'pad' ? 'goalie_pad_save' : kind === 'stick' ? 'goalie_stick_save' : tp > 0.3 ? 'goalie_t_push' : Math.abs(an.lat) > 0.15 ? 'goalie_shuffle' : 'goalie_ready';
    m.an.state = an.state;
    if (window.ANIM && ANIM.debug) { an.metrics = { stickHeelHeight: m.stick.heel.y - iceY }; m.an.metrics = an.metrics; }
  };
  window.GOAL = GOAL;
})();
