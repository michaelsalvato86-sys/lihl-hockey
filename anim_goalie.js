/* Goalie animation controller: ready stance, lateral shuffle, T-push, butterfly drop/recovery,
   glove / blocker / pad / stick saves, covering the puck, reaction to a goal. Driven by real save events.
   Pass 7 saves: save VARIANTS derived from the same event data (kind, side, dy, h, rc), stoppage idles,
   goal / save reactions, poke check, play-the-puck, bench trip. Cosmetic only; no sim data is changed. */
(function () {
  'use strict';
  const GOAL = { ready: false, dur: { save: 1.05, cover: 1.6, goalagainst: 2.3 } };
  const ENV = { butterfly: { up: 0.14, hold: 0.3 }, pad: { up: 0.12, hold: 0.25 }, glove: { up: 0.14, hold: 0.28 }, blocker: { up: 0.14, hold: 0.28 }, stick: { up: 0.1, hold: 0.25 } };   // drop/reach time + hold; recovery = sim g.recov
  const LV = { butterfly: 'bf', pad: 'pd', glove: 'gl', blocker: 'bl', stick: 'sk' };
  // variant table: ch = pose channel, up/hold/rec seconds (recAdd = extra on top of the sim recovery for save variants), keep = base kind pose stays, st = state name
  const VD = {
    stack:    { ch: 'stk', up: 0.3, hold: 0.32, recAdd: 0.15, st: 'goalie_stack_pads' },
    split:    { ch: 'spl', up: 0.45, hold: 0.36, recAdd: 0.3, st: 'goalie_split_save' },
    vh:       { ch: 'vh', up: 0.15, hold: 0.3, recAdd: 0.1, st: 'goalie_post_slide_vh' },
    bslide:   { ch: 'bsl', up: 0.14, hold: 0.32, recAdd: 0.1, keep: 1, st: 'goalie_butterfly_slide' },
    paddle:   { ch: 'pdl', up: 0.12, hold: 0.28, recAdd: 0.15, keep: 1, st: 'goalie_paddle_down' },
    squeeze:  { ch: 'sq', up: 0.22, hold: 0.55, recAdd: 0.2, keep: 1, st: 'goalie_glove_squeeze' },
    scramble: { ch: 'scr', up: 0.14, hold: 0.22, recAdd: 0.25, keep: 1, bump: 1, st: 'goalie_scramble' },
    poke:     { ch: 'pok', up: 0.2, hold: 0.42, rec: 0.34, st: 'goalie_poke_check' },
    cover:    { ch: 'cov', up: 0.25, hold: 1.0, rec: 0.35, st: 'goalie_cover' },
    adjust:   { ch: 'adj', up: 0.55, hold: 0.9, rec: 0.4, st: 'goalie_adjust_mask' },
    sip:      { ch: 'sip', up: 0.4, hold: 1.1, rec: 0.45, st: 'goalie_water_bottle' },
    stretch:  { ch: 'str', up: 0.6, hold: 1.6, rec: 0.6, st: 'goalie_stretch' },
    shake:    { ch: 'shk', up: 0.2, hold: 1.2, rec: 0.3, st: 'goalie_shake_out' },
    tap:      { ch: 'tap', up: 0.25, hold: 1.3, rec: 0.3, st: 'goalie_tap_pads' },
    bang:     { ch: 'bng', up: 0.25, hold: 1.5, rec: 0.55, st: 'goalie_bang_post' },
    pump:     { ch: 'pmp', up: 0.28, hold: 0.85, rec: 0.3, st: 'goalie_glove_pump' },
    peek:     { ch: 'pek', up: 0.3, hold: 1.0, rec: 0.3, st: 'goalie_peek' },
    play:     { ch: 'plr', up: 0.3, hold: 1.8, rec: 0.4, st: 'goalie_play_puck' },
    pull:     { ch: 'skt', up: 0.5, hold: 1.4, rec: 0.3, st: 'goalie_skate_bench' },
    return_:  { ch: 'skt', up: 0.5, hold: 1.4, rec: 0.3, st: 'goalie_skate_return' }
  };
  GOAL.VD = VD;
  const CH = ['bf', 'gl', 'bl', 'sk', 'pd', 'ant', 'rvh', 'stk', 'spl', 'vh', 'bsl', 'pdl', 'sq', 'scr', 'pok', 'cov', 'adj', 'sip', 'str', 'shk', 'tap', 'bng', 'pmp', 'pek', 'plr', 'skt'];
  const RT = { stk: 4, spl: 3, vh: 8, scr: 9, skt: 6, pok: 9, str: 6, bsl: 9, pdl: 9, sq: 10, cov: 9, adj: 8, sip: 8, shk: 8, tap: 8, bng: 8, pmp: 9, pek: 6, plr: 7 };   // per-second level limits for the big new poses
  const AF = 14;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)), es = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const kf = (u, P) => { if (u <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * es((u - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
  const V = () => new THREE.Vector3();
  const X = { O: V(), Fb: V(), Sb: V(), Tt: V(), Tg: V(), Hl: V(), bd: V(), pole: V(), tmp: V(), sh: V(), pu: V(), al: V(), hd: V(), ft: V() };
  const BF_SAVE = [[0, 0], [0.14, 1], [0.58, 1], [0.8, 0.45], [1.25, 0]], BF_COVER = [[0, 0], [0.18, 1], [1.15, 1], [1.35, 0.5], [1.6, 0]];
  const RCH = [[0, 0], [0.1, 1], [0.62, 1], [1.05, 0]], PADK = [[0, 0], [0.12, 1], [0.5, 1], [1.1, 0]], GA = [[0, 0], [0.35, 1], [1.2, 1], [2.3, 0]];
  const NAMES = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r'];
  const hash = n => { let x = (n | 0) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  GOAL.init = function () { GOAL.ready = true; };
  function at(out, f, s, h, iceY) { out.copy(X.O).addScaledVector(X.Fb, f).addScaledVector(X.Sb, s); out.y = iceY + h; return out; }
  const envW = (u, up, hold, rec) => u < up ? es(u / up) : u < up + hold ? 1 : 1 - es((u - up - hold) / Math.max(rec, 0.05));

  // pick the save variant from the real event data (kind, dy = lateral travel, h, z); deterministic per event id
  GOAL.derive = function (kd, dd, id) {
    const ady = Math.abs(dd.dy != null ? dd.dy : 1), r = hash(id * 31 + 7), h = dd.h != null ? dd.h : 0.5;
    if (kd === 'butterfly') return ady >= 0.8 && r < 0.6 ? 'bslide' : ady >= 0.5 && r > 0.88 ? 'scramble' : '';
    if (kd === 'pad') return ady > 3.2 ? (r < 0.55 ? 'stack' : 'split') : ady > 1.9 ? (r < 0.4 ? 'vh' : r > 0.85 ? 'scramble' : '') : '';
    if (kd === 'glove') return r < 0.45 && h < 1.9 ? 'squeeze' : '';
    if (kd === 'stick') return h < 0.15 && r < 0.6 ? 'paddle' : '';
    return '';
  };
  function mkEv(an, k, dd, id) {
    const kd = k === 'save' ? dd.kind : '';
    let vr = '';
    if (k === 'save') vr = dd.v != null ? dd.v : GOAL.derive(kd, dd, id);
    else if (k === 'idle') vr = dd.v || 'shake';
    else if (k === 'goalagainst') vr = dd.v != null ? dd.v : (['', 'bang', 'tap'])[Math.floor(hash(id * 17 + 3) * 3)];
    else if (k === 'return') vr = 'return_';
    else if (VD[k]) vr = k;
    if (vr === 'slump') vr = '';
    const Vd = VD[vr] || null, bfp = kd === 'butterfly' || kd === 'pad';
    const rc = dd.rc != null ? dd.rc : (bfp ? 0.55 : 0.2);
    const T = ENV[kd] || null, baseRec = Math.max(bfp ? rc : 0.3, 0.05);
    const ev = { k, t: 0, d: dd, rc, T, vr, V: Vd, l0: Object.assign({}, an.lv), baseRec };
    if (T) { ev.up = T.up; ev.hold = T.hold; ev.rec = baseRec; ev.dur = T.up + T.hold + baseRec; }
    else ev.dur = GOAL.dur[k] || 1;
    if (Vd) {
      ev.vup = Vd.up; ev.vhold = Vd.hold; ev.vrec = Vd.rec != null ? Vd.rec : baseRec + (Vd.recAdd || 0);
      if (k === 'goalagainst') { ev.vup = 0.25; ev.vhold = 1.5; ev.vrec = 0.55; }
      else if (k === 'cover') { ev.dur = Math.max(ev.dur, ev.vup + ev.vhold + ev.vrec); }
      ev.dur = Math.max(ev.dur, ev.vup + ev.vhold + ev.vrec);
      if (!T && k !== 'goalagainst') ev.dur = ev.vup + ev.vhold + ev.vrec;
      if (Vd.ch === 'skt' && dd.dur) { ev.vhold = Math.max(0.2, dd.dur - ev.vup - ev.vrec); ev.dur = dd.dur; }
    }
    return ev;
  }

  // world flags (stoppage / screen / puck close behind the net). Tests pass c.gw instead of the real game globals.
  function worldFlags(g, c, dir) {
    if (c.gw) return c.gw;
    const w = { stop: false, scr: false, near: false };
    try {
      if (typeof G !== 'undefined' && G) { w.stop = (G.pause > 0) || !!(G.fo && G.fo.set && !G.fo.dropped); }
      if (typeof puck !== 'undefined' && puck && typeof H1 !== 'undefined' && typeof onIce === 'function' && g.x != null) {
        const px = (puck.x - g.x) * dir, py = puck.y - g.y;
        if (px > 25) for (const t of [H1, A1]) for (const s of onIce(t)) { const sx = (s.x - g.x) * dir, sy = s.y - g.y; if (sx > 2 && sx < px - 6 && Math.abs(sy - py * sx / px) < 2.2) { w.scr = true; break; } }
      }
    } catch (e) { }
    return w;
  }

  GOAL.apply = function (m, g, c, dt) {
    dt = Math.min(dt, 0.05);
    const lv0 = {}; for (const k of CH) lv0[k] = 0;
    const an = m.ga || (m.ga = { prevY: g.y, vy: 0, lat: 0, ph: 0, ev: null, evId: 0, q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion() }, state: 'ready', hold: 0, br: 0, hy: 0, hp: 0, pose: {}, v: null, lv: lv0, sd: { gl: 1, bl: -1, sk: -1, pd: 1 }, sdk: { gl: 1, bl: -1, sk: -1, pd: 1 }, hS: 0.5, hT: 0.5, pf: 0, rvhSd: 1, vsS: 1, vsT: 1, idleT: 0, idleN: 0, cd: 0, pumpAfter: 0, skp: 0, shp: 0, tpp: 0, pkp: 0, plp: 0, sipP: 0, offX: 0, offZ: 0, lastEnd: 9, covT: 0, plrT: 0, pekT: 0, pokCd: 0 });
    if (!an.v) { const id = g.id != null ? g.id : 1; an.v = { br: 1.3 + 0.5 * hash(id * 7 + 1), ba: 0.7 + 0.6 * hash(id * 7 + 2), wide: (hash(id * 7 + 3) - 0.5) * 0.1, gh: (hash(id * 7 + 4) - 0.5) * 0.1, tilt: (hash(id * 7 + 5) - 0.5) * 0.08, slow: 0.85 + 0.3 * hash(id * 7 + 6), id }; an.br = hash(id) * 6.28; for (const n of NAMES) an.pose[n] = { p: 0, r: 0, y: 0 }; }
    m.an = m.an || an; m.an.q = an.q; // AR.arm writes into m.an.q
    if (!an.bottle && m.byName && m.byName.hand_l) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xe8f2ff })); b.visible = false; m.byName.hand_l.add(b); an.bottle = b; }
    const dir = g.team ? g.team.dir : 1;
    // lateral speed from real goalie motion
    const vy = (g.y - an.prevY) / Math.max(dt, 1e-3); an.prevY = g.y; an.vy += (vy - an.vy) * (1 - Math.exp(-12 * dt));
    const latT = cl(-an.vy * dir / 25, -1, 1); an.lat += (latT - an.lat) * (1 - Math.exp(-10 * dt));
    an.ph += dt * (3 + Math.abs(an.lat) * 8);
    // events: save kinds carry hold + recovery (rc = sim g.recov) so the rise matches the sim's slowed recovery
    if (g.ae && g.ae.id !== an.evId && window.AEV && !AEV.admit(an, g, g.ae.k, g.ae.d || {}, 'g')) an.evId = g.ae.id;   // priority / interruption table (anim_events.js)
    if (g.ae && g.ae.id !== an.evId) { an.evId = g.ae.id; const dd = g.ae.d || {}; an.ev = mkEv(an, g.ae.k, dd, g.ae.id); const ev = an.ev, kd = g.ae.k === 'save' ? dd.kind : '';
      if (kd) { const lk = LV[kd]; an.sdk[lk] = dd.side === 'l' ? 1 : -1; if (an.lv[lk] < 0.15) an.sd[lk] = an.sdk[lk]; an.hT = dd.h != null ? cl(dd.h / 2, 0, 1) : 0.5; }
      if (dd.side) an.vsT = dd.side === 'l' ? 1 : -1; else if (ev.V && !kd) an.vsT = hash(g.ae.id * 5 + 1) < 0.5 ? 1 : -1;
      if (g.ae.k === 'save') an.pumpAfter = !dd.v && hash(g.ae.id * 53 + 11) < 0.2 && (kd === 'glove' || kd === 'blocker' || kd === 'butterfly') ? 1 : 0;
      an.pkp = 0; an.tpp = 0; }
    if (an.ev) { an.ev.t += dt; if (an.ev.t > an.ev.dur) { const e = an.ev; an.ev = null; an.lastEnd = 0; if (e.k === 'save' && an.pumpAfter) { an.pumpAfter = 0; an.ev = mkEv(an, 'pump', {}, an.evId * 3 + 1); an.vsT = an.vsT; } } }
    an.lastEnd += dt; an.pokCd = Math.max(0, an.pokCd - dt);
    // puck in goalie frame: anticipation (wind-up / incoming shot), post-hug (RVH), screen / cover / play-the-puck triggers
    X.pu.set(c.puckW.x, c.puckW.y, c.puckW.z); m.root.worldToLocal(X.pu);
    const ws = m.root.getWorldScale(X.tmp).x || 1, pf = X.pu.dot(SK.F) * ws, pl = X.pu.dot(SK.Ld) * ws, vf = an.pfOk ? (pf - an.pf) / Math.max(dt, 1e-3) : 0, vl = an.pfOk ? (pl - an.pl) / Math.max(dt, 1e-3) : 0; an.pf = pf; an.pl = pl; an.pfOk = true;
    const pspd = Math.hypot(vf, vl), wf = worldFlags(g, c, dir);
    if (!an.ev) {   // auto behaviours when nothing else is running
      const calmNow = Math.abs(an.lat) < 0.15 && an.lastEnd > 0.4;
      // (the poke check used to start here whenever the puck was near; it now only plays from the sim's poke event, see game.html goalieStep)
      if (calmNow && wf.stop) { an.idleT += dt; if (an.idleT > 1.1 + 1.4 * hash(an.v.id + an.idleN * 3)) { an.idleT = 0; const L = ['adjust', 'sip', 'stretch', 'shake', 'tap']; an.ev = mkEv(an, 'idle', { v: L[(an.idleN++ + Math.floor(hash(an.v.id) * 5)) % 5] }, an.evId * 9 + an.idleN); an.vsT = hash(an.idleN * 13 + an.v.id) < 0.5 ? 1 : -1; } }
      else if (calmNow && pf > 110 && pspd < 40) { an.idleT += dt * 0.35; if (an.idleT > 7) { an.idleT = 0; const L = ['shake', 'tap', 'adjust']; an.ev = mkEv(an, 'idle', { v: L[(an.idleN++) % 3] }, an.evId * 9 + an.idleN); } }
      else if (!wf.stop) an.idleT = Math.max(0, an.idleT - dt);
    }
    const ek = an.ev ? an.ev.k : '', u = an.ev ? an.ev.t : 0, d = an.ev ? an.ev.d : {}, v = an.v, lv = an.lv;
    const kind = ek === 'save' ? d.kind : ek === 'cover' ? 'butterfly' : '';
    // level targets (0..1) per pose family; a new event starts from the previous levels (no snap on rebound / second save)
    const tg = {}; for (const k of CH) if (k !== 'ant' && k !== 'rvh') tg[k] = 0;
    const EV = an.ev, VV = EV && EV.V;
    if (ek === 'cover') tg.bf = kf(u, BF_COVER);
    else if (ek === 'save' && EV.T) { const T = EV.T; tg[LV[kind]] = (VV && VV.keep || !VV) ? envW(u, T.up, T.hold, EV.rec) : 0; }
    if (VV) {
      let w;
      if (VV.bump) { const x0 = EV.vup + EV.vhold; w = u < x0 ? 0 : Math.sin(Math.PI * cl((u - x0) / Math.max(EV.vrec, 0.05), 0, 1)); }
      else w = envW(u, EV.vup, EV.vhold, EV.vrec);
      tg[VV.ch] = w;
      if (VV.ch === 'sip' || VV.ch === 'tap' || VV.ch === 'bng') an.vsT = an.vsT;
    }
    // auto channels without an event: cover the puck on a whistle, play it behind the net, peek over a screen
    const noEv = !an.ev || ek === 'idle';
    const covT = !an.ev && wf.stop && Math.abs(pf) < 7 && Math.abs(pl) < 6 && pspd < 4 ? 1 : 0;
    const plrT = !an.ev && !wf.stop && pf < -3.5 && Math.hypot(pf, pl) < 18 && pspd < 10 ? 1 : 0;
    const pekT = !an.ev && wf.scr && !wf.stop && Math.abs(an.lat) < 0.2 ? 1 : 0;
    an.covT += cl(covT - an.covT, -6 * dt, 6 * dt); an.plrT += cl(plrT - an.plrT, -4 * dt, 4 * dt); an.pekT += cl(pekT - an.pekT, -5 * dt, 5 * dt);
    tg.cov = Math.max(tg.cov, an.covT); tg.plr = Math.max(tg.plr, an.plrT); tg.pek = Math.max(tg.pek, an.pekT);
    if (an.covT > 0.3) tg.bf = Math.max(tg.bf, an.covT);
    if (ek === 'cover' || an.covT > 0) { const cw = ek === 'cover' ? tg.cov : an.covT; tg.cov = Math.max(tg.cov, cw); }
    if (an.ev) { const w = 1 - es(u / 0.18); for (const k in tg) if (k !== 'cov' && k !== 'plr' && k !== 'pek') tg[k] = Math.min(1, tg[k] + (an.ev.l0[k] || 0) * w); }
    for (const k in tg) lv[k] += cl(tg[k] - lv[k], -(RT[k] || 14) * dt, (RT[k] || 14) * dt);
    for (const k in an.sdk) an.sd[k] += (an.sdk[k] - an.sd[k]) * (1 - Math.exp(-16 * dt));
    an.vsS += (an.vsT - an.vsS) * (1 - Math.exp(-14 * dt));
    an.hS += (an.hT - an.hS) * (1 - Math.exp(-18 * dt));
    const bf = lv.bf, gl = lv.gl, bl = lv.bl, sk = lv.sk, padk = lv.pd, reach = Math.max(gl, bl, sk);
    const stk = lv.stk, spl = lv.spl, vh = lv.vh, bsl = lv.bsl, pdl = lv.pdl, sq = lv.sq, scr = lv.scr, pok = lv.pok, cov = lv.cov, adj = lv.adj, sip = lv.sip, str = lv.str, shk = lv.shk, tap = lv.tap, bng = lv.bng, pmp = lv.pmp, pek = lv.pek, plr = lv.plr, skt = lv.skt;
    const varSum = stk + spl + vh + bsl + pdl + sq + scr + pok + cov + adj + sip + str + shk + tap + bng + pmp + pek + plr + skt;
    const slump = ek === 'goalagainst' ? kf(u / v.slow, GA) : 0;
    const dip = ek === 'goalagainst' ? kf(u, [[0, 0], [0.18, 1], [0.7, 0.3], [1.4, 0]]) : 0;   // quick head drop before the shoulders sag
    const kick = ek === 'save' ? kf(u, [[0, 0], [0.04, 1], [0.22, 0]]) : 0;   // rebound recoil: chest rocks back as the puck leaves
    const rise = bf * (1 - bf) * 4;                                          // 0..1 mid-transition: drives the push back up to the feet
    const tp = Math.max(0, (Math.abs(an.lat) - 0.55) / 0.45);               // T-push when travelling fast
    const incoming = vf < -30 && pf > 0 && pf < 90 ? 0.75 : 0, wind = g.windT > 0 ? 1 : 0;
    const antT = ek ? 0 : Math.max(wind, incoming);
    lv.ant += cl(antT - lv.ant, -7 * dt, 7 * dt);
    const rvhT = ek || varSum > 0.1 ? 0 : cl((Math.abs(pl) / Math.max(2, pf) - 1.2) / 0.8, 0, 1) * (pf < 36 ? 1 : 0);
    if (rvhT > 0.2) an.rvhSd = pl > 0 ? 1 : -1;
    lv.rvh += cl(rvhT - lv.rvh, -5 * dt, 5 * dt);
    const ant = lv.ant, rvh = lv.rvh;
    const SKm = SK, pose = an.pose, aL = Math.abs(an.lat), calm = 1 - Math.min(1, aL * 2 + bf + reach + padk + slump + rvh + ant * 0.5 + varSum);
    an.br += dt * v.br * (1 + 0.6 * aL);
    an.skp += dt * (skt > 0.1 ? 9 : 0); an.shp += dt * 28; an.tpp += dt * 6.5; an.pkp += dt * 3.2; an.plp += dt * (plr > 0.1 ? 0.8 : 0);
    const brs = Math.sin(an.br) * v.ba * calm;                              // breathing, only while settled
    const P = (n, p_, r_, y_) => { const o = pose[n]; o.p = p_; o.r = r_; o.y = y_ || 0; };
    const sv = an.vsS, sideLeg = sv >= 0 ? 'l' : 'r';
    // ---------- legs / torso ----------
    const sw = Math.sin(an.ph), sh = Math.min(1, aL * 2), dyN = d.dy != null ? cl(Math.abs(d.dy) / 4, 0, 1) : 0.5;
    for (const sd of ['l', 'r']) {
      const leadsT = (sd === 'l') === (an.lat > 0), trail = tp > 0 && !leadsT ? tp : 0, sgn = sd === 'l' ? 1 : -1;
      const kk = padk * (sgn === (an.sdk.pd > 0 ? 1 : -1) ? 1 : 0) * (0.7 + 0.3 * dyN), bfl = bf + 0.6 * pdl * (1 - bf) + (sgn === an.rvhSd ? 0.85 * rvh : 0), set = ant;
      const gait = (leadsT ? Math.max(0, sw) : Math.max(0, -sw)) * 0.1 * sh;
      let th = -0.88 - 0.32 * bfl - 0.1 * set + 0.6 * trail - 0.65 * kk - 0.03 * brs - 0.1 * slump * 0.3;
      let A = SKm.abd[sd] * (0.26 + v.wide + 0.78 * bfl + 0.06 * set + 0.6 * trail + 0.14 * (leadsT ? aL : 0) + gait + 0.85 * kk + 0.25 * bsl * (sd === sideLeg ? 1 : 0));
      let cf = 0.5 + 0.42 * bfl + 0.12 * set - 0.7 * trail - 0.2 * kk + 0.04 * brs;
      const near = sd === sideLeg, ad = SKm.abd[sd], ph = an.skp + (sd === 'l' ? 0 : Math.PI);
      const mx = (w, t, a, c_) => { if (w > 0.001) { th += (t - th) * w; A += (a - A) * w; cf += (c_ - cf) * w; } };
      mx(stk, -0.5, SKm.abd[sideLeg] * (near ? 1.2 : 0.85), 0.2);
      mx(spl, -0.1, ad * 1.5, 0.08);
      mx(vh, near ? -0.5 : -1.2, ad * (near ? 0.25 : 1.05), near ? 0.3 : 0.95);
      mx(scr, near ? -1.4 : -0.6, ad * 0.35, near ? 1.5 : 1.3);
      mx(pok, near ? -1.35 : 0.3, ad * (near ? 0.2 : 0.15), near ? 1.0 : 0.15);
      mx(str, near ? -0.3 : -1.05, ad * (near ? 1.25 : 0.4), near ? 0.05 : 1.0);
      mx(skt, -0.4 + 0.45 * Math.sin(ph), ad * 0.2, 0.35 + 0.4 * Math.max(0, Math.cos(ph)));
      mx(plr, -0.78, ad * 0.45, 0.6);
      mx(cov, -1.2, ad * 1.0, 1.0);
      P('thigh_' + sd, th, A); P('calf_' + sd, cf, A);
      P('foot_' + sd, 0.0, 0);
    }
    const lean = SKm.rollLeft * (0.12 * an.lat + 0.18 * (gl * an.sd.gl + bl * an.sd.bl + sk * an.sd.sk) + 0.14 * padk * an.sd.pd + 0.2 * rvh * an.rvhSd + v.tilt * calm - 0.06 * slump
      + sv * (0.75 * stk + 0.35 * str + 0.22 * bsl + 0.32 * vh + 0.1 * pdl + 0.1 * scr) + 0.14 * pek * Math.sin(an.pkp) + 0.06 * tap * Math.sin(an.tpp));
    const fwd = 0.05 * rise + 0.05 * Math.abs(an.lat), sq_ = 0.12 * ant, kb = -0.09 * kick;   // lean into the slide, set forward when squared up, rock back on the save
    const tor = 0.25 * cov + 0.5 * scr + 0.45 * pok + 0.12 * sq + 0.3 * skt + 0.14 * spl + 0.08 * plr + 0.1 * pdl + 0.12 * str - 0.12 * sip - 0.12 * pmp - 0.06 * shk + 0.06 * Math.abs(Math.sin(an.shp * 0.5)) * shk + 0.1 * pek;
    const yaw = 0.18 * plr * sv, torY = yaw * 1;
    P('pelvis', 0.26 - 0.1 * bf + 0.1 * slump - 0.02 * brs + 0.04 * ant + tor * 0.15, lean * 0.5, an.hy * 0.15 * ant + torY * 0.3);
    P('spine_01', 0.34 - 0.22 * bf + 0.12 * slump + 0.02 * brs - fwd + sq_ * 0.6 + kb + tor * 0.35, lean * 0.4, an.hy * 0.15 * ant + torY);
    P('spine_02', 0.42 - 0.3 * bf + 0.15 * slump + 0.025 * brs - fwd + sq_ * 0.8 + kb + tor * 0.4, lean * 0.4, an.hy * 0.2 * ant + torY);
    P('spine_03', 0.46 - 0.34 * bf + 0.2 * slump + 0.03 * brs + sq_ + kb + tor * 0.3, lean * 0.3, torY);
    // head tracks the puck (smoothed) so eyes stay on it; drops on a goal against
    const hyT = cl(Math.atan2(pl, Math.max(3, pf)), -0.7, 0.7) * (ek === 'goalagainst' ? 0.2 : 1) * (1 - 0.7 * Math.max(adj, sip, str));
    an.hy += (hyT - an.hy) * (1 - Math.exp(-6 * dt));
    P('neck_01', 0.2 + 0.2 * slump + 0.25 * dip - 0.05 * bf - 0.12 * sip + 0.1 * cov + 0.08 * scr, 0.12 * pek * Math.sin(an.pkp + 1) - 0.1 * str * sv, an.hy * 0.4);
    P('Head', -0.2 + 0.45 * slump + 0.3 * dip - 0.1 * bf + 0.02 * brs - 0.28 * sip + 0.25 * cov + 0.1 * tap + 0.1 * bng - 0.1 * pmp + 0.1 * pek, 0.22 * pek * Math.sin(an.pkp + 1) - 0.2 * str * sv, an.hy * 0.6 + (ek === 'goalagainst' ? Math.sin(u * 5) * 0.12 * slump : 0));
    SK.setPose(m, pose); SK.ground(m); m.g.updateMatrixWorld(true);
    const iceY = -m.root.position.y; AR.pos(m, 'pelvis', X.O); X.O.y = iceY; X.Fb.copy(SK.F); X.Sb.copy(SK.Ld);
    // ---------- arms: glove (left), blocker + stick (right) ----------
    const hY = 0.15 + an.hS * 1.45, dyL = d.dy != null ? cl(Math.abs(d.dy) / 4, 0, 1) : 0.5;   // target hand height above ice (puck height h), lateral reach grows with distance
    const sTarget = -0.12;
    at(X.Tt, 0.42 - 0.1 * bl, -0.26 + an.sd.bl * 0.55 * bl * (0.8 + 0.2 * dyL), 0, iceY); X.Tt.y = iceY + (0.62 - 0.1 * bf + 0.05 * ant) * (1 - bl) + hY * bl;
    at(X.Hl, 1.0, sTarget + an.sd.sk * 0.95 * sk + an.sd.bl * 0.5 * bl, 0.03, iceY);
    // glove hand: up and out in the ready stance (higher when set), snaps to the puck height and side on a glove save
    const gRest = 0.95 + v.gh - 0.25 * bf + 0.1 * ant + 0.1 * Math.sin(an.ph) * Math.abs(an.lat);
    at(X.Tg, 0.5 + 0.12 * gl + 0.05 * ant, (0.5 + 0.06 * ant) * (1 - gl) + (0.45 + an.sd.gl * (an.sd.gl > 0 ? 0.3 + 0.1 * dyL : 0.17)) * gl, 0, iceY);
    X.Tg.y = iceY + gRest * (1 - gl) + hY * gl;
    { const hr = 0.55 * spl + 0.3 * stk + 0.15 * vh; if (hr > 0) { X.Tt.y -= hr; X.Tg.y -= hr; X.Hl.y = Math.max(iceY + 0.03, X.Hl.y - hr); } }   // body drops, hands follow
    // ---- variant hand targets (blend toward each pose's own targets) ----
    const al = X.al, ht = (w, f, s, h) => at(al, f, s, h, iceY);
    if (sq > 0.001) { ht(sq, 0.66, 0.28 * an.sd.gl, 1.05); X.Tg.lerp(al, sq); }
    if (cov > 0.001) { ht(0, 0.78, 0.2, 0.12); X.Tg.lerp(al, cov); ht(0, 0.78, -0.2, 0.12); X.Tt.lerp(al, cov); ht(0, 1.1, -0.55, 0.03); X.Hl.lerp(al, cov); }
    if (stk > 0.001) { ht(0, 0.5, 0.45, 0.62); X.Tg.lerp(al, stk * 0.8); ht(0, 0.42, -0.3, 0.45); X.Tt.lerp(al, stk * 0.8); }
    if (adj > 0.001) { AR.pos(m, 'Head', X.hd); al.copy(X.hd).addScaledVector(X.Fb, 0.2); al.y -= 0.03; X.Tg.lerp(al, adj); ht(0, 0.5, -0.1, 0.55); X.Tt.lerp(al, adj * 0.5); }
    if (sip > 0.001) { AR.pos(m, 'Head', X.hd); al.copy(X.hd).addScaledVector(X.Fb, 0.19); al.y -= 0.13; X.Tg.lerp(al, sip); }
    if (an.bottle) an.bottle.visible = sip > 0.2;
    if (shk > 0.001) { const w = Math.sin(an.shp * 0.9) * 0.18; ht(0, 0.15, 0.6, 0.72 + w); X.Tg.lerp(al, shk); ht(0, 0.15, -0.6, 0.72 - w); X.Tt.lerp(al, shk); ht(0, 0.8, -0.2, 0.03); X.Hl.lerp(al, shk); }
    if (tap > 0.001) { ht(0, 0.55, 0.5 * Math.sin(an.tpp), 0.03 + 0.1 * Math.abs(Math.cos(an.tpp))); X.Hl.lerp(al, tap); ht(0, 0.4, -0.2, 0.55); X.Tt.lerp(al, tap * 0.6); }
    if (bng > 0.001) { const wd = kf(u, [[0, 0], [0.5, 1], [0.75, 1], [1.0, 0]]), sl_ = kf(u, [[0, 0], [0.5, 0], [1.3, 1], [1.6, 1], [2.1, 0]]);
      ht(0, 0.7, sv * (0.3 + 0.65 * sl_), 0.03 + 0.7 * wd * (1 - sl_)); X.Hl.lerp(al, bng); ht(0, 0.5, -0.1 + sv * 0.2 * sl_, 0.75 + 0.3 * wd * (1 - sl_)); X.Tt.lerp(al, bng * 0.8); }
    if (pmp > 0.001) { const pm = 0.5 - 0.5 * Math.cos(Math.min(u, 1.0) * Math.PI * 2 * 2.2); ht(0, 0.6, 0.62, 1.3 + 0.35 * pm); X.Tg.lerp(al, pmp); }
    if (pek > 0.001) { ht(0, 0.45, 0.5, 1.65); X.Tg.lerp(al, pek * 0.8); }
    if (pdl > 0.001) { ht(0, 1.25, sv * 1.35, 0.03); X.Hl.lerp(al, pdl); ht(0, 0.65, -0.15, 0.4); X.Tt.lerp(al, pdl); }
    if (scr > 0.001) { ht(0, 0.85, 0.35, 0.12); X.Tg.lerp(al, scr); ht(0, 0.85, -0.35, 0.12); X.Tt.lerp(al, scr); ht(0, 1.1, -0.7, 0.03); X.Hl.lerp(al, scr * 0.7); }
    if (pok > 0.001) { const sw_ = kf(u, [[0, -1], [0.2, -1], [0.45, 1], [0.8, 1]]); ht(0, 1.55, -0.3 + 0.9 * sw_, 0.03); X.Hl.lerp(al, pok); ht(0, 1.0, -0.1, 0.5); X.Tt.lerp(al, pok); ht(0, 0.7, 0.6, 0.9); X.Tg.lerp(al, pok); }
    if (str > 0.001) { AR.pos(m, 'foot_' + sideLeg, X.ft); al.copy(X.ft); al.y += 0.1; X.Tg.lerp(al, str * (sv > 0 ? 1 : 0)); ht(0, 0.5, -0.4, 0.6); if (sv < 0) X.Tt.lerp(X.ft, 0); }
    if (plr > 0.001) { const x_ = an.plp % 1.4, sw2 = kf(x_, [[0, 0.5], [0.6, 0.5], [0.8, -1.0], [1.0, -1.0], [1.4, 0.5]]); ht(0, 0.95, sw2, 0.03); X.Hl.lerp(al, plr); ht(0, 0.55, -0.35, 0.45); X.Tt.lerp(al, plr); ht(0, 0.5, 0.5, 0.9); X.Tg.lerp(al, plr * 0.7); }
    if (skt > 0.001) { const sa = Math.sin(an.skp); ht(0, 0.3 + 0.25 * sa, 0.55, 0.95); X.Tg.lerp(al, skt); ht(0, 0.35, -0.3, 0.85); X.Tt.lerp(al, skt); ht(0, 0.9, -0.25, 0.03); X.Hl.lerp(al, skt * 0.8); }
    // low-pass the three hand targets in pelvis space so IK never jumps between poses (arm joints stay under the per-frame limit)
    { const fl = an.fl || (an.fl = {}); for (const [nm, T] of [['tg', X.Tg], ['tt', X.Tt], ['hl', X.Hl]]) { X.tmp.copy(T).sub(X.O); const kk = 1 - Math.exp(-(nm === 'hl' ? AF * 0.5 : AF) * dt), cur = [X.tmp.dot(X.Fb), X.tmp.dot(X.Sb), T.y - iceY], q = fl[nm]; if (!q) fl[nm] = cur; else { for (let i = 0; i < 3; i++) q[i] += (cur[i] - q[i]) * kk; } const r = fl[nm]; T.copy(X.O).addScaledVector(X.Fb, r[0]).addScaledVector(X.Sb, r[1]); T.y = iceY + r[2]; } }
    X.tmp.copy(X.Hl).sub(X.Tt); const sl = cl(X.tmp.length(), 0.9, 1.5); X.tmp.normalize(); X.Hl.copy(X.Tt).addScaledVector(X.tmp, sl);
    X.bd.set(X.tmp.x, 0, X.tmp.z).normalize();
    const Lt = AR.len.r.l1 + AR.len.r.l2 - 0.03; AR.pos(m, 'upperarm_r', X.sh); X.tmp.copy(X.Tt).sub(X.sh); const dl = X.tmp.length(); if (dl > Lt) X.Tt.copy(X.sh).addScaledVector(X.tmp, Lt / dl);
    X.pole.set(0, 0, 0).addScaledVector(X.Sb, -0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2); AR.arm(m, 'r', X.Tt, X.pole, pose);
    X.pole.set(0, 0, 0).addScaledVector(X.Sb, 0.8).addScaledVector(SK.U, -0.55).addScaledVector(X.Fb, -0.2); AR.arm(m, 'l', X.Tg, X.pole, pose);
    SK.setPose(m, pose); AR.placeStick(m, X.Tt, X.Hl, X.bd);
    // bench trip: slide the whole model toward / away from the bench and face the way it is going (world offset, set fresh every frame by the caller)
    if (skt > 0.001 && an.ev && an.ev.V && an.ev.V.ch === 'skt') {
      const e = an.ev, dx = e.d.dx != null ? e.d.dx : -8 * dir, dz = e.d.dz != null ? e.d.dz : 34, tt = cl(u / e.dur, 0, 1), pr = es(tt), f_ = e.k === 'return' ? 1 - pr : pr;
      m.g.position.x += dx * f_; m.g.position.z += dz * f_;
      const ang = e.k === 'return' ? Math.atan2(-dz, -dx) : Math.atan2(dz, dx), base = m.g.rotation.y; let df = -ang - base; df = Math.atan2(Math.sin(df), Math.cos(df)); m.g.rotation.y = base + df * es(Math.min(1, skt));
      an.offFrac = f_;
    } else an.offFrac = 0;
    // state label: variant name wins, then the base kind
    let st = ek === 'goalagainst' ? (VV ? VV.st : 'goalie_goal_against') : ek === 'cover' ? 'goalie_cover' : VV && ek !== 'goalagainst' ? VV.st : kind === 'butterfly' ? 'goalie_butterfly' : kind === 'glove' ? 'goalie_glove_save' : kind === 'blocker' ? 'goalie_blocker_save' : kind === 'pad' ? 'goalie_pad_save' : kind === 'stick' ? 'goalie_stick_save' : '';
    if (!st) { const best = [['cov', 'goalie_cover'], ['plr', 'goalie_play_puck'], ['pek', 'goalie_peek']].filter(x => lv[x[0]] > 0.5)[0]; st = best ? best[1] : tp > 0.3 ? 'goalie_t_push' : Math.abs(an.lat) > 0.15 ? 'goalie_shuffle' : 'goalie_ready'; }
    an.state = st;
    m.an.state = an.state;
    if (window.ANIM && ANIM.debug) { an.metrics = { stickHeelHeight: m.stick.heel.y - iceY, lv: Object.assign({}, lv), gloveY: X.Tg.y - iceY, blockerY: X.Tt.y - iceY, tgtY: hY, ev: ek ? { k: kind, vr: an.ev.vr, rc: an.ev.rc, dur: an.ev.dur, t: u } : null, offFrac: an.offFrac }; m.an.metrics = an.metrics; }
  };
  window.GOAL = GOAL;
})();
