/* Goalie animation controller: ready stance, lateral shuffle, T-push, butterfly drop/recovery,
   glove / blocker / pad / stick saves, covering the puck, reaction to a goal. Driven by real save events. */
(function () {
  'use strict';
  const GOAL = { ready: false, dur: { save: 1.05, cover: 1.6, goalagainst: 2.3 } };
  const KD = { butterfly: 1.25, glove: 1.05, blocker: 1.05, stick: 1.0, pad: 1.1 };       // per save kind duration (hold + recovery)
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)), es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const kf = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
  const V = () => new THREE.Vector3();
  const X = { O: V(), Fb: V(), Sb: V(), Tt: V(), Tg: V(), Hl: V(), bd: V(), pole: V(), tmp: V(), sh: V(), pu: V() };
  const BF_SAVE = [[0, 0], [0.14, 1], [0.58, 1], [0.8, 0.45], [1.25, 0]], BF_COVER = [[0, 0], [0.18, 1], [1.15, 1], [1.35, 0.5], [1.6, 0]];
  const RCH = [[0, 0], [0.1, 1], [0.62, 1], [1.05, 0]], PADK = [[0, 0], [0.12, 1], [0.5, 1], [1.1, 0]], GA = [[0, 0], [0.35, 1], [1.2, 1], [2.3, 0]];
  const NAMES = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r'];
  const hash = n => { let x = (n | 0) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  GOAL.init = function () { GOAL.ready = true; };
  function at(out, f, s, h, iceY) { out.copy(X.O).addScaledVector(X.Fb, f).addScaledVector(X.Sb, s); out.y = iceY + h; return out; }

  GOAL.apply = function (m, g, c, dt) {
    dt = Math.min(dt, 0.05);
    const an = m.ga || (m.ga = { prevY: g.y, vy: 0, lat: 0, ph: 0, ev: null, evId: 0, q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion() }, state: 'ready', hold: 0, br: 0, hy: 0, hp: 0, pose: {}, v: null });
    if (!an.v) { const id = g.id != null ? g.id : 1; an.v = { br: 1.3 + 0.5 * hash(id * 7 + 1), ba: 0.7 + 0.6 * hash(id * 7 + 2), wide: (hash(id * 7 + 3) - 0.5) * 0.1, gh: (hash(id * 7 + 4) - 0.5) * 0.1, tilt: (hash(id * 7 + 5) - 0.5) * 0.08, slow: 0.85 + 0.3 * hash(id * 7 + 6) }; an.br = hash(id) * 6.28; for (const n of NAMES) an.pose[n] = { p: 0, r: 0, y: 0 }; }
    m.an = m.an || an; m.an.q = an.q; // AR.arm writes into m.an.q
    const dir = g.team ? g.team.dir : 1;
    // lateral speed from real goalie motion
    const vy = (g.y - an.prevY) / Math.max(dt, 1e-3); an.prevY = g.y; an.vy += (vy - an.vy) * (1 - Math.exp(-12 * dt));
    const latT = cl(-an.vy * dir / 25, -1, 1); an.lat += (latT - an.lat) * (1 - Math.exp(-10 * dt));
    an.ph += dt * (3 + Math.abs(an.lat) * 8);
    // events (per kind duration)
    if (g.ae && g.ae.id !== an.evId) { an.evId = g.ae.id; const dd = g.ae.d || {}; an.ev = { k: g.ae.k, t: 0, d: dd, dur: (g.ae.k === 'save' && KD[dd.kind]) || GOAL.dur[g.ae.k] || 1 }; }
    if (an.ev) { an.ev.t += dt; if (an.ev.t > an.ev.dur) an.ev = null; }
    const ek = an.ev ? an.ev.k : '', u = an.ev ? an.ev.t : 0, d = an.ev ? an.ev.d : {}, v = an.v;
    const kind = ek === 'save' ? d.kind : ek === 'cover' ? 'butterfly' : '';
    const sideS = d.side === 'l' ? 1 : -1;                                 // + = goalie's left
    const bf = kind === 'butterfly' ? (ek === 'cover' ? kf(u, BF_COVER) : kf(u, BF_SAVE)) : 0;
    const reach = (kind === 'glove' || kind === 'blocker' || kind === 'stick') ? kf(u, RCH) : 0;
    const padk = kind === 'pad' ? kf(u, PADK) : 0;
    const slump = ek === 'goalagainst' ? kf(u / v.slow, GA) : 0;
    const dip = ek === 'goalagainst' ? kf(u, [[0, 0], [0.18, 1], [0.7, 0.3], [1.4, 0]]) : 0;   // quick head drop before the shoulders sag
    const rise = kind === 'butterfly' ? bf * (1 - bf) * 4 : 0;               // 0..1 mid-transition: drives the push back up to the feet
    const tp = Math.max(0, (Math.abs(an.lat) - 0.55) / 0.45);               // T-push when travelling fast
    const SKm = SK, pose = an.pose, aL = Math.abs(an.lat), calm = 1 - Math.min(1, aL * 2 + bf + reach + padk + slump);
    an.br += dt * v.br * (1 + 0.6 * aL);
    const brs = Math.sin(an.br) * v.ba * calm;                              // breathing, only while settled
    const P = (n, p_, r_, y_) => { const o = pose[n]; o.p = p_; o.r = r_; o.y = y_ || 0; };
    // ---------- legs / torso ----------
    const sw = Math.sin(an.ph), sh = Math.min(1, aL * 2);
    for (const sd of ['l', 'r']) {
      const leadsT = (sd === 'l') === (an.lat > 0), trail = tp > 0 && !leadsT ? tp : 0, kick = (kind === 'pad' && (sd === 'l') === (sideS > 0)) ? padk : 0;
      // shuffle: lead leg steps out then trail leg closes the gap (opposite phase), so legs are never both wide
      const gait = (leadsT ? Math.max(0, sw) : Math.max(0, -sw)) * 0.1 * sh;
      const th = -0.88 - 0.32 * bf + 0.6 * trail - 0.65 * kick - 0.03 * brs - 0.1 * slump * 0.3;
      const ab = 0.26 + v.wide + 0.78 * bf + 0.6 * trail + 0.14 * (leadsT ? aL : 0) + gait + 0.85 * kick;
      P('thigh_' + sd, th, SKm.abd[sd] * ab); P('calf_' + sd, 0.5 + 0.42 * bf - 0.7 * trail - 0.2 * kick + 0.04 * brs, SKm.abd[sd] * ab);
      P('foot_' + sd, 0.0, 0);
    }
    const lean = SKm.rollLeft * (0.12 * an.lat + 0.18 * reach * sideS + 0.14 * padk * sideS + 0.16 * Math.sin(an.ph * 0.5) * 0 + v.tilt * calm - 0.06 * slump);
    const fwd = 0.05 * rise;                                               // chest drives forward as he pushes back up
    P('pelvis', 0.26 - 0.1 * bf + 0.1 * slump - 0.02 * brs, lean * 0.5);
    P('spine_01', 0.34 - 0.22 * bf + 0.12 * slump + 0.02 * brs - fwd, lean * 0.4);
    P('spine_02', 0.42 - 0.3 * bf + 0.15 * slump + 0.025 * brs - fwd, lean * 0.4);
    P('spine_03', 0.46 - 0.34 * bf + 0.2 * slump + 0.03 * brs, lean * 0.3);
    // head tracks the puck (smoothed) so eyes stay on it; drops on a goal against
    X.pu.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.pu);
    const hyT = cl(Math.atan2(X.pu.dot(SK.Ld), Math.max(3, X.pu.dot(SK.F))), -0.7, 0.7) * (ek === 'goalagainst' ? 0.2 : 1);
    an.hy += (hyT - an.hy) * (1 - Math.exp(-6 * dt));
    P('neck_01', 0.2 + 0.2 * slump + 0.25 * dip - 0.05 * bf, 0, an.hy * 0.4); P('Head', -0.2 + 0.45 * slump + 0.3 * dip - 0.1 * bf + 0.02 * brs, 0, an.hy * 0.6 + (ek === 'goalagainst' ? Math.sin(u * 5) * 0.12 * slump : 0));
    SK.setPose(m, pose); SK.ground(m); m.g.updateMatrixWorld(true);
    const iceY = -m.root.position.y; AR.pos(m, 'pelvis', X.O); X.O.y = iceY; X.Fb.copy(SK.F); X.Sb.copy(SK.Ld);
    X.tmp.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.tmp); const ps = X.tmp.sub(X.O).dot(X.Sb);
    // ---------- arms: glove (left), blocker + stick (right) ----------
    const hh = d.h != null ? d.h / 2 : 0.5;
    // blocker hand / stick: top hand anchored, paddle on the ice in front; follows the puck side slightly
    let sTarget = cl(ps * 0.15, -0.35, 0.35) * 0.0 - 0.12; const stickSwing = kind === 'stick' ? sideS * 0.95 * reach : 0;
    at(X.Tt, 0.42, -0.26 + (kind === 'blocker' ? sideS * -0.0 : 0) + (kind === 'blocker' ? sideS * 0.55 * reach : 0), 0.62 + (kind === 'blocker' ? (0.25 + 0.5 * hh) * reach : 0) - 0.1 * bf, iceY);
    at(X.Hl, 1.0, sTarget + stickSwing + (kind === 'blocker' ? sideS * 0.5 * reach : 0), 0.03, iceY);
    X.tmp.copy(X.Hl).sub(X.Tt); const sl = cl(X.tmp.length(), 0.9, 1.5); X.tmp.normalize(); X.Hl.copy(X.Tt).addScaledVector(X.tmp, sl);
    X.bd.set(X.tmp.x, 0, X.tmp.z).normalize();
    // glove hand: up and out in the ready stance, snaps to the puck on a glove save
    const gx = 0.5 + (kind === 'glove' ? sideS * 0.3 * reach : 0), gh = 0.95 + v.gh + (kind === 'glove' ? (0.1 + 0.55 * hh) * reach : 0) - 0.25 * bf + 0.1 * Math.sin(an.ph) * Math.abs(an.lat);
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
