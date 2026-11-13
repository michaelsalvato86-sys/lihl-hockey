/* Test additions for anim_shots.js. Loaded only by anim_test.html. Defines scenarios (merged into AT.sc) and AT.shotsChecks(chk). */
window.ANIM_SHOTS_TEST = function (AT, chk) {
'use strict';
const dt = 1 / 60;
const sgOf = () => (AT.m && AT.m.an && AT.m.an.v.topR) ? -1 : 1;
// shot with the real act path: windup act, then the event at release with the puck leaving
const shotAct = (T, d, y0) => (t, p, c, pk) => { p.vx = 16; p.vy = 0; p.y = y0 || 0; p.acc01 = .2; pk.y = p.y; c.charge = 0;
  if (t < T) { c.hasPuck = true; pk.x = p.x + 4; p.act = { k: 'shot', t: T - t, T }; } else { p.act = null; c.hasPuck = false; if (!p.ae) { p.ae = { id: 1, k: 'shot', d: Object.assign({}, d, { a: d.a === 'bh' ? -.9 * sgOf() : d.a }) }; AT.relPk = { x: pk.x, y: pk.y }; } pk.x += (t - T) * 100; } };
const passAct = (T, d, y0, chg) => (t, p, c, pk) => { p.vx = 20; p.vy = 0; p.y = y0 === undefined ? 40 : y0; p.acc01 = .3; pk.y = p.y; c.charge = chg || 0;
  if (t < T) { c.hasPuck = true; pk.x = p.x + 4; p.act = { k: 'pass', t: T - t, T }; } else { p.act = null; c.hasPuck = false; if (!p.ae) { p.ae = { id: 1, k: 'pass', d: Object.assign({}, d, { a: d.a === 'bh' ? -.9 * sgOf() : d.a }) }; AT.relPk = { x: pk.x, y: pk.y }; } pk.x += (t - T) * 60; } };
// reception: puck arrives at (px,py) relative to the skater at t=.3, event gain with payload g, then it is carried
const gainSc = (g, px, py, pz) => (t, p, c, pk) => { p.vx = 14; p.vy = 0; p.acc01 = .2;
  if (t < .3) { pk.x = p.x + px * (1 - (.3 - t)); pk.y = p.y + py; if (t < .02 && !p.ae) p.ae = { id: 1, k: 'recv', d: {} }; } else { pk.x = p.x + px; pk.y = p.y + py; if (t >= .3 && p.ae && p.ae.id === 1) p.ae = { id: 2, k: 'gain', d: Object.assign({}, g) }; if (t > .5) { c.hasPuck = true; pk.x = p.x + 4; pk.y = p.y; } } };
const carryOpp = (d0, os, vx) => (t, p, c, pk) => { p.vx = vx || 22; p.vy = 0; p.acc01 = .4; c.hasPuck = true; pk.x = p.x + 4; pk.y = p.y; c.opp.d = Math.max(3.5, d0 - t * 20); c.opp.s = os; };
const SC = {
  sh_quick: shotAct(.06, { kind: 'snap', pw: .3, a: -.2, z: 0 }), sh_backhand: shotAct(.09, { kind: 'wrist', pw: .7, a: 'bh', z: 0 }), sh_volley: shotAct(.09, { kind: 'wrist', pw: .7, a: .3, z: .8 }),
  ps_saucer: passAct(.12, { a: -.3, len: 90, sp: 140 }), ps_drop: passAct(.12, { a: 2.6, len: 30, sp: 100 }), ps_slap: passAct(.12, { a: -.3, len: 62, sp: 130 }, 40, .8), ps_onehand: passAct(.12, { a: -.3, len: 18, sp: 100 }),
  ps_bank: passAct(.12, { a: 0, len: 40, sp: 110 }, 4), ps_backhand: passAct(.12, { a: 'bh', len: 40, sp: 110 }),
  rc_glove: gainSc({ q: 'clean', z: 2.2, sp: 60 }, 4, 0), rc_tip: gainSc({ q: 'deflect', z: 0, sp: 80 }, 4, 0), rc_cradle: gainSc({ q: 'bobble', z: .5, sp: 50 }, 4, 0),
  rc_kick: gainSc({ q: 'difficult', z: 0, sp: 70 }, -4, 1), rc_reach: gainSc({ q: 'clean', z: 0, sp: 60 }, 5, -8), rc_backhand: gainSc({ q: 'clean', z: 0, sp: 60 }, 5, 4.5),
  pk_dive: (t, p, c, pk) => { p.vx = 18; p.vy = 0; p.acc01 = .3; pk.x = p.x + 12; pk.y = p.y + 1; if (t >= .2 && !p.ae) p.ae = { id: 1, k: 'poke', d: { a: .1 } }; },
  dk_fb: carryOpp(15, 4), dk_toe: carryOpp(11, 4), dk_btl: carryOpp(8, 0), dk_spin: carryOpp(7.5, 0, 14),
  stick_battle: (t, p, c, pk) => { p.vx = 4; p.vy = 0; p.acc01 = .1; pk.x = p.x + 7; pk.y = p.y + 2; c.opp.d = 5; c.opp.s = 2; }
};
Object.assign(AT.sc, SC);
AT.shotScen = [
  ['sh_quick', 'shot_quick', 0, 1], ['sh_backhand', 'shot_backhand', 1, 1], ['sh_volley', 'shot_volley', 1, 1],
  ['ps_saucer', 'pass_saucer', 1, 1], ['ps_drop', 'pass_drop', 0, 1], ['ps_slap', 'pass_slap', 1, 1], ['ps_onehand', 'pass_onehand', 0, 1], ['ps_bank', 'pass_bank', 0, 1], ['ps_backhand', 'pass_backhand', 1, 1],
  ['rc_glove', 'recv_glove', 0, 0], ['rc_tip', 'recv_tip', 0, 0], ['rc_cradle', 'recv_cradle', 1, 0], ['rc_kick', 'recv_kick', 0, 0], ['rc_reach', 'recv_reach', 0, 0], ['rc_backhand', 'recv_backhand', 1, 0],
  ['pk_dive', 'poke_dive', 1, 0], ['dk_fb', 'deke_forehand_backhand', 0, 0], ['dk_toe', 'deke_toe_drag', 0, 0], ['dk_btl', 'deke_between_legs', 0, 0], ['dk_spin', 'deke_spin', 0, 0], ['stick_battle', 'stick_battle', 1, 0]];
{
  const vp = new THREE.Vector3(), w = new THREE.Vector3();
  AT.shotRes = {};
  for (const [n, label, raised, rel] of AT.shotScen) {
    const r = AT.run(n, 1.6), seq = r.seq.map(s => s.replace(/^[0-9.]+:/, ''));
    AT.shotRes[n] = { seq: r.seq.join('>'), maxBlade: +r.maxBlade.toFixed(2), maxSnap: +r.maxSnap.toFixed(2) };
    chk(n + ' picks ' + label, seq.includes(label) || AT.m.an.sxv === label, 'got ' + r.seq.join('>'));
    chk(n + ' top hand on stick', r.maxHandOff < 0.02, 'off ' + r.maxHandOff.toFixed(3));
    chk(n + ' no stick snap', r.maxSnap < 0.6, 'snap ' + r.maxSnap.toFixed(2));
    chk(n + ' blade at ice or raised as expected', raised ? r.maxBlade > 0.05 : r.maxBlade < 0.5, 'blade ' + r.maxBlade.toFixed(2));
    const P = AT.legStats(AT.sc[n], 1.8); chk(n + ' no pop (deg/frame)', P.maxDeg < AT.popMax, P.maxDeg.toFixed(1) + ' ' + P.worst + ' @' + P.worstT.toFixed(2));
    if (rel) { // the puck leaves on the blade contact frame
      AT.spawn(false); ANIM.debug = true; AT.relPk = null; let rl = -1, gap = 9;
      for (let t = 0; t <= 1.0; t += dt) { AT.step(AT.sc[n], t, dt); if (AT.relPk && rl < 0) { rl = t; const st = AT.m.stick; vp.set(AT.relPk.x, .22, AT.relPk.y); AT.m.root.worldToLocal(vp); for (let k = 0; k <= 3; k++) { w.copy(st.heel).addScaledVector(st.dir, k * .1); gap = Math.min(gap, w.distanceTo(vp)); } } }
      AT.shotRes[n].gap = +gap.toFixed(2); chk(n + ' blade on puck at release frame', rl >= 0 && gap < 0.15, 'gap ' + gap.toFixed(2));
    }
  }
  // spin returns to exactly zero and the visual puck stays near the blade through a deke
  { AT.spawn(false); ANIM.debug = true; let mx = 0, last = 1; for (let t = 0; t <= 2; t += dt) { AT.step(AT.sc.dk_spin, t, dt); mx = Math.max(mx, Math.abs(AT.m.root.rotation.y)); last = AT.m.root.rotation.y; }
    chk('spin-o-rama turns a full circle then returns to 0', mx > 1 && Math.abs(last) < 1e-6, 'max ' + mx.toFixed(2) + ' end ' + last.toFixed(3)); }
  // variants differ from each other (distinct blade/hand paths among the 5 recv and 4 pass types)
  { const sig = n => { AT.spawn(false); ANIM.debug = true; const o = []; const v = new THREE.Vector3(); for (let t = 0; t <= .9; t += dt) { AT.step(AT.sc[n], t, dt); if (Math.abs(t * 10 - Math.round(t * 10)) < 0.02) { AT.m.byName.hand_l.getWorldPosition(v); o.push(v.x, v.y, v.z); AT.m.byName.hand_r.getWorldPosition(v); o.push(v.x, v.y, v.z); o.push(AT.m.stick.heel.x, AT.m.stick.heel.y, AT.m.stick.heel.z); } } return o; };
    const names = ['rc_glove', 'rc_tip', 'rc_cradle', 'rc_kick', 'rc_reach', 'rc_backhand'], S = names.map(sig); let mn = 9, pr = '';
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) { const d = S[i].reduce((a, x, k) => a + Math.abs(x - S[j][k]), 0) / S[i].length; if (d < mn) { mn = d; pr = names[i] + '/' + names[j]; } }
    chk('reception variants have distinct poses (mean abs diff)', mn > 0.01, mn.toFixed(3) + ' ' + pr); }
}
};
