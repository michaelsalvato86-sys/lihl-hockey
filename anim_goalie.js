/* Goalie animation controller: ready stance, lateral shuffle, T-push, butterfly drop/recovery,
   glove / blocker / pad / stick saves, covering the puck, reaction to a goal. Driven by real save events. */
(function () {
  'use strict';
  const GOAL = { ready: false, dur: { save: 1.05, cover: 1.6, goalagainst: 2.3 } };
  const ENV = { butterfly: { up: 0.14, hold: 0.3 }, pad: { up: 0.12, hold: 0.25 }, glove: { up: 0.14, hold: 0.28 }, blocker: { up: 0.14, hold: 0.28 }, stick: { up: 0.1, hold: 0.25 } };   // drop/reach time + hold; recovery = sim g.recov
  const LV = { butterfly: 'bf', pad: 'pd', glove: 'gl', blocker: 'bl', stick: 'sk' };
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
    const an = m.ga || (m.ga = { prevY: g.y, vy: 0, lat: 0, ph: 0, ev: null, evId: 0, q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion() }, state: 'ready', hold: 0, br: 0, hy: 0, hp: 0, pose: {}, v: null, lv: { bf: 0, gl: 0, bl: 0, sk: 0, pd: 0, ant: 0, rvh: 0 }, sd: { gl: 1, bl: -1, sk: -1, pd: 1 }, sdk: { gl: 1, bl: -1, sk: -1, pd: 1 }, hS: 0.5, hT: 0.5, pf: 0, rvhSd: 1 });
    if (!an.v) { const id = g.id != null ? g.id : 1; an.v = { br: 1.3 + 0.5 * hash(id * 7 + 1), ba: 0.7 + 0.6 * hash(id * 7 + 2), wide: (hash(id * 7 + 3) - 0.5) * 0.1, gh: (hash(id * 7 + 4) - 0.5) * 0.1, tilt: (hash(id * 7 + 5) - 0.5) * 0.08, slow: 0.85 + 0.3 * hash(id * 7 + 6) }; an.br = hash(id) * 6.28; for (const n of NAMES) an.pose[n] = { p: 0, r: 0, y: 0 }; }
    m.an = m.an || an; m.an.q = an.q; // AR.arm writes into m.an.q
    const dir = g.team ? g.team.dir : 1;
    // lateral speed from real goalie motion
    const vy = (g.y - an.prevY) / Math.max(dt, 1e-3); an.prevY = g.y; an.vy += (vy - an.vy) * (1 - Math.exp(-12 * dt));
    const latT = cl(-an.vy * dir / 25, -1, 1); an.lat += (latT - an.lat) * (1 - Math.exp(-10 * dt));
    an.ph += dt * (3 + Math.abs(an.lat) * 8);
    // events: save kinds carry hold + recovery (rc = sim g.recov) so the rise matches the sim's slowed recovery
    if (g.ae && g.ae.id !== an.evId) { an.evId = g.ae.id; const dd = g.ae.d || {}, kd = g.ae.k === 'save' ? dd.kind : '', rc = dd.rc != null ? dd.rc : (kd === 'butterfly' || kd === 'pad' ? 0.55 : 0.2), T = ENV[kd] || null;
      an.ev = { k: g.ae.k, t: 0, d: dd, rc, T, dur: T ? T.up + T.hold + Math.max(kd === 'butterfly' || kd === 'pad' ? rc : 0.3, 0.05) : (GOAL.dur[g.ae.k] || 1), l0: Object.assign({}, an.lv) };
      if (kd) { const lk = LV[kd]; an.sdk[lk] = dd.side === 'l' ? 1 : -1; if (an.lv[lk] < 0.15) an.sd[lk] = an.sdk[lk]; an.hT = dd.h != null ? cl(dd.h / 2, 0, 1) : 0.5; } }
    if (an.ev) { an.ev.t += dt; if (an.ev.t > an.ev.dur) an.ev = null; }
    const ek = an.ev ? an.ev.k : '', u = an.ev ? an.ev.t : 0, d = an.ev ? an.ev.d : {}, v = an.v, lv = an.lv;
    const kind = ek === 'save' ? d.kind : ek === 'cover' ? 'butterfly' : '';
    // level targets (0..1) per pose family; a new event starts from the previous levels (no snap on rebound / second save)
    const tg = { bf: 0, gl: 0, bl: 0, sk: 0, pd: 0 };
    if (ek === 'cover') tg.bf = kf(u, BF_COVER);
    else if (ek === 'save' && an.ev.T) { const T = an.ev.T, rec = Math.max(kind === 'butterfly' || kind === 'pad' ? an.ev.rc : 0.3, 0.05); tg[LV[kind]] = u < T.up ? es(u / T.up) : u < T.up + T.hold ? 1 : 1 - es((u - T.up - T.hold) / rec); }
    if (an.ev) { const w = 1 - es(u / 0.18); for (const k in tg) tg[k] = Math.min(1, tg[k] + an.ev.l0[k] * w); }
    for (const k in tg) lv[k] += cl(tg[k] - lv[k], -14 * dt, 14 * dt);
    for (const k in an.sdk) an.sd[k] += (an.sdk[k] - an.sd[k]) * (1 - Math.exp(-16 * dt));
    an.hS += (an.hT - an.hS) * (1 - Math.exp(-18 * dt));
    const bf = lv.bf, gl = lv.gl, bl = lv.bl, sk = lv.sk, padk = lv.pd, reach = Math.max(gl, bl, sk);
    const slump = ek === 'goalagainst' ? kf(u / v.slow, GA) : 0;
    const dip = ek === 'goalagainst' ? kf(u, [[0, 0], [0.18, 1], [0.7, 0.3], [1.4, 0]]) : 0;   // quick head drop before the shoulders sag
    const kick = ek === 'save' ? kf(u, [[0, 0], [0.04, 1], [0.22, 0]]) : 0;   // rebound recoil: chest rocks back as the puck leaves
    const rise = bf * (1 - bf) * 4;                                          // 0..1 mid-transition: drives the push back up to the feet
    const tp = Math.max(0, (Math.abs(an.lat) - 0.55) / 0.45);               // T-push when travelling fast
    // puck in goalie frame: anticipation (wind-up / incoming shot) and post-hug (RVH) when the puck is beside or behind the crease
    X.pu.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.pu);
    const ws = m.root.getWorldScale(X.tmp).x || 1, pf = X.pu.dot(SK.F) * ws, pl = X.pu.dot(SK.Ld) * ws, vf = an.pfOk ? (pf - an.pf) / Math.max(dt, 1e-3) : 0; an.pf = pf; an.pfOk = true;
    const incoming = vf < -30 && pf > 0 && pf < 90 ? 0.75 : 0, wind = g.windT > 0 ? 1 : 0;
    const antT = ek ? 0 : Math.max(wind, incoming);
    lv.ant += cl(antT - lv.ant, -7 * dt, 7 * dt);
    const rvhT = ek ? 0 : cl((Math.abs(pl) / Math.max(2, pf) - 1.2) / 0.8, 0, 1) * (pf < 36 ? 1 : 0);
    if (rvhT > 0.2) an.rvhSd = pl > 0 ? 1 : -1;
    lv.rvh += cl(rvhT - lv.rvh, -5 * dt, 5 * dt);
    const ant = lv.ant, rvh = lv.rvh;
    const SKm = SK, pose = an.pose, aL = Math.abs(an.lat), calm = 1 - Math.min(1, aL * 2 + bf + reach + padk + slump + rvh + ant * 0.5);
    an.br += dt * v.br * (1 + 0.6 * aL);
    const brs = Math.sin(an.br) * v.ba * calm;                              // breathing, only while settled
    const P = (n, p_, r_, y_) => { const o = pose[n]; o.p = p_; o.r = r_; o.y = y_ || 0; };
    // ---------- legs / torso ----------
    const sw = Math.sin(an.ph), sh = Math.min(1, aL * 2), dyN = d.dy != null ? cl(Math.abs(d.dy) / 4, 0, 1) : 0.5;
    for (const sd of ['l', 'r']) {
      const leadsT = (sd === 'l') === (an.lat > 0), trail = tp > 0 && !leadsT ? tp : 0, sgn = sd === 'l' ? 1 : -1;
      const kk = padk * (sgn === (an.sdk.pd > 0 ? 1 : -1) ? 1 : 0) * (0.7 + 0.3 * dyN), bfl = bf + (sgn === an.rvhSd ? 0.85 * rvh : 0), set = ant;
      const gait = (leadsT ? Math.max(0, sw) : Math.max(0, -sw)) * 0.1 * sh;
      const th = -0.88 - 0.32 * bfl - 0.1 * set + 0.6 * trail - 0.65 * kk - 0.03 * brs - 0.1 * slump * 0.3;
      const ab = 0.26 + v.wide + 0.78 * bfl + 0.06 * set + 0.6 * trail + 0.14 * (leadsT ? aL : 0) + gait + 0.85 * kk;
      P('thigh_' + sd, th, SKm.abd[sd] * ab); P('calf_' + sd, 0.5 + 0.42 * bfl + 0.12 * set - 0.7 * trail - 0.2 * kk + 0.04 * brs, SKm.abd[sd] * ab);
      P('foot_' + sd, 0.0, 0);
    }
    const lean = SKm.rollLeft * (0.12 * an.lat + 0.18 * (gl * an.sd.gl + bl * an.sd.bl + sk * an.sd.sk) + 0.14 * padk * an.sd.pd + 0.2 * rvh * an.rvhSd + v.tilt * calm - 0.06 * slump);
    const fwd = 0.05 * rise + 0.05 * Math.abs(an.lat), sq = 0.12 * ant, kb = -0.09 * kick;   // lean into the slide, set forward when squared up, rock back on the save
    P('pelvis', 0.26 - 0.1 * bf + 0.1 * slump - 0.02 * brs + 0.04 * ant, lean * 0.5, an.hy * 0.15 * ant);
    P('spine_01', 0.34 - 0.22 * bf + 0.12 * slump + 0.02 * brs - fwd + sq * 0.6 + kb, lean * 0.4, an.hy * 0.15 * ant);
    P('spine_02', 0.42 - 0.3 * bf + 0.15 * slump + 0.025 * brs - fwd + sq * 0.8 + kb, lean * 0.4, an.hy * 0.2 * ant);
    P('spine_03', 0.46 - 0.34 * bf + 0.2 * slump + 0.03 * brs + sq + kb, lean * 0.3);
    // head tracks the puck (smoothed) so eyes stay on it; drops on a goal against
    const hyT = cl(Math.atan2(pl, Math.max(3, pf)), -0.7, 0.7) * (ek === 'goalagainst' ? 0.2 : 1);
    an.hy += (hyT - an.hy) * (1 - Math.exp(-6 * dt));
    P('neck_01', 0.2 + 0.2 * slump + 0.25 * dip - 0.05 * bf, 0, an.hy * 0.4); P('Head', -0.2 + 0.45 * slump + 0.3 * dip - 0.1 * bf + 0.02 * brs, 0, an.hy * 0.6 + (ek === 'goalagainst' ? Math.sin(u * 5) * 0.12 * slump : 0));
    SK.setPose(m, pose); SK.ground(m); m.g.updateMatrixWorld(true);
    const iceY = -m.root.position.y; AR.pos(m, 'pelvis', X.O); X.O.y = iceY; X.Fb.copy(SK.F); X.Sb.copy(SK.Ld);
    // ---------- arms: glove (left), blocker + stick (right) ----------
    const hY = 0.15 + an.hS * 1.45, dyL = d.dy != null ? cl(Math.abs(d.dy) / 4, 0, 1) : 0.5;   // target hand height above ice (puck height h), lateral reach grows with distance
    const sTarget = -0.12;
    at(X.Tt, 0.42 - 0.1 * bl, -0.26 + an.sd.bl * 0.55 * bl * (0.8 + 0.2 * dyL), 0, iceY); X.Tt.y = iceY + (0.62 - 0.1 * bf + 0.05 * ant) * (1 - bl) + hY * bl;
    at(X.Hl, 1.0, sTarget + an.sd.sk * 0.95 * sk + an.sd.bl * 0.5 * bl, 0.03, iceY);
    X.tmp.copy(X.Hl).sub(X.Tt); const sl = cl(X.tmp.length(), 0.9, 1.5); X.tmp.normalize(); X.Hl.copy(X.Tt).addScaledVector(X.tmp, sl);
    X.bd.set(X.tmp.x, 0, X.tmp.z).normalize();
    // glove hand: up and out in the ready stance (higher when set), snaps to the puck height and side on a glove save
    const gRest = 0.95 + v.gh - 0.25 * bf + 0.1 * ant + 0.1 * Math.sin(an.ph) * Math.abs(an.lat);
    at(X.Tg, 0.5 + 0.12 * gl + 0.05 * ant, (0.5 + 0.06 * ant) * (1 - gl) + (0.45 + an.sd.gl * (an.sd.gl > 0 ? 0.3 + 0.1 * dyL : 0.17)) * gl, 0, iceY);
    X.Tg.y = iceY + gRest * (1 - gl) + hY * gl;
    const Lt = AR.len.r.l1 + AR.len.r.l2 - 0.03; AR.pos(m, 'upperarm_r', X.sh); X.tmp.copy(X.Tt).sub(X.sh); const dl = X.tmp.length(); if (dl > Lt) X.Tt.copy(X.sh).addScaledVector(X.tmp, Lt / dl);
    X.pole.set(0, 0, 0).addScaledVector(X.Sb, -0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2); AR.arm(m, 'r', X.Tt, X.pole, pose);
    X.pole.set(0, 0, 0).addScaledVector(X.Sb, 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2); AR.arm(m, 'l', X.Tg, X.pole, pose);
    SK.setPose(m, pose); AR.placeStick(m, X.Tt, X.Hl, X.bd);
    an.state = ek === 'goalagainst' ? 'goalie_goal_against' : ek === 'cover' ? 'goalie_cover' : kind === 'butterfly' ? 'goalie_butterfly' : kind === 'glove' ? 'goalie_glove_save' : kind === 'blocker' ? 'goalie_blocker_save' : kind === 'pad' ? 'goalie_pad_save' : kind === 'stick' ? 'goalie_stick_save' : tp > 0.3 ? 'goalie_t_push' : Math.abs(an.lat) > 0.15 ? 'goalie_shuffle' : 'goalie_ready';
    m.an.state = an.state;
    if (window.ANIM && ANIM.debug) { an.metrics = { stickHeelHeight: m.stick.heel.y - iceY, lv: Object.assign({}, lv), gloveY: X.Tg.y - iceY, blockerY: X.Tt.y - iceY, tgtY: hY, ev: ek ? { k: kind, rc: an.ev.rc, dur: an.ev.dur, t: u } : null }; m.an.metrics = an.metrics; }
  };
  window.GOAL = GOAL;
})();
