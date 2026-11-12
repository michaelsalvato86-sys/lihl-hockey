/* Procedural skating pose + ground contact for SK skaters. */
SK.skatePose = function (m, ph, sp, turn, acc, back) {
  acc = acc || 0;
  const bk = back === true ? 1 : back ? Math.max(0, Math.min(1, +back)) : 0, mx = (a, b) => a + (b - a) * bk;   // back: bool or 0..1 blend
  const pushF = Math.min(1, Math.min(1, sp * 4) * (.4 + .5 * acc) + .15 * sp), pushB = Math.min(1, .25 + sp);
  const push = mx(pushF, pushB), crouch = mx(.6, .78) + .3 * sp * (1 - .4 * bk) + .2 * Math.abs(turn || 0);   // backskating: knees well bent, not a reversed forward stride
  const sl = Math.sin(ph), pl = Math.max(0, sl) * push, pr = Math.max(0, -sl) * push, lean = turn || 0, up = -.3 * bk;   // torso upright (forward skating leans over)
  // recovery swing: the non-pushing foot lifts and tucks under the body, scaled by speed; the push leg rolls onto the toe
  const lk = Math.min(1, sp * 3) * (1 - .4 * bk), rl_ = Math.max(0, -sl) * lk, rr_ = Math.max(0, sl) * lk;
  const leg = (s, pu, rc) => ({ tp: -(.5 + .55 * crouch) + .95 * pu - .3 * rc, tr: SK.abd[s] * (.12 + (.95 + .55 * bk) * pu + .34 * bk - .25 * rc), cp: .12 + .55 * crouch * (1 - .6 * pu) + .1 * pu + .38 * rc });
  const L = leg('l', pl, rl_), R = leg('r', pr, rr_), rl = SK.rollLeft * lean, ar = (v, b) => v * mx(1, b);
  return {
    pelvis: { p: .18 + .12 * sp + up * .6, r: rl * .45 }, spine_01: { p: .3 + .18 * sp + up, r: rl * .4 }, spine_02: { p: .36 + .14 * sp + up, r: rl * .4 }, spine_03: { p: .4 + .12 * sp + up, r: rl * .4 },
    neck_01: { p: .14 }, Head: { p: -.18 - .12 * sp },
    thigh_l: { p: L.tp, r: L.tr }, calf_l: { p: L.cp, r: L.tr }, foot_l: { p: SK.toeSign*0.35 * pl - .12 * rl_ },
    thigh_r: { p: R.tp, r: R.tr }, calf_r: { p: R.cp, r: R.tr }, foot_r: { p: SK.toeSign*0.35 * pr - .12 * rr_ },
    upperarm_l: { o: 'rp', r: SK.armRoll.l * mx(.72, .8), p: -.62 }, lowerarm_l: { o: 'rp', r: SK.armRoll.l * mx(.6, .8), p: -1.25 },
    upperarm_r: { o: 'rp', r: SK.armRoll.r * mx(1, .8), p: -.45 }, lowerarm_r: { o: 'rp', r: SK.armRoll.r * mx(1, .8), p: -1.35 }, hand_r: { p: 0 }
  };
};
SK.toeSign = 1;
SK._v = new THREE.Vector3();
SK.ground = function (m) {
  m.root.position.y = 0; m.inner.updateMatrixWorld(true);
  let miny = 1e9;
  for (const n of ['foot_l', 'foot_r']) { m.byName[n].getWorldPosition(SK._v); m.inner.worldToLocal(SK._v); miny = Math.min(miny, SK._v.y); }
  m.root.position.y = SK.footRestY - miny;
};

SK.goaliePose = function (m, t) {
  const sw = Math.sin(t * 1.2) * .04, a = SK.armRoll;
  return {
    pelvis: { p: .3 }, spine_01: { p: .4 }, spine_02: { p: .45 }, spine_03: { p: .5 }, neck_01: { p: .2 }, Head: { p: -.2 },
    thigh_l: { p: -1.0, r: SK.abd.l * (.35 + sw) }, calf_l: { p: .55, r: SK.abd.l * (.35 + sw) }, foot_l: { p: 0 },
    thigh_r: { p: -1.0, r: SK.abd.r * (.35 + sw) }, calf_r: { p: .55, r: SK.abd.r * (.35 + sw) }, foot_r: { p: 0 },
    upperarm_l: { o: 'rp', r: a.l * .55, p: -.4 }, lowerarm_l: { o: 'rp', r: a.l * .55, p: -.9 },
    upperarm_r: { o: 'rp', r: a.r * .55, p: -.4 }, lowerarm_r: { o: 'rp', r: a.r * .55, p: -.9 }, hand_r: { p: 0 }
  };
};

SK.apply = function (m, pose) {
  SK.setPose(m, pose); SK.ground(m);
  if (pose.hand_r) {
    m.byName.hand_r.getWorldPosition(SK._v); m.inner.worldToLocal(SK._v);
    const S = SK.stick, sin = Math.max(0.35, Math.min(0.97, (SK._v.y - 0.02) / S.L));
    pose.hand_r.p = Math.asin(sin) - S.phi0; SK.setPose(m, pose);
  }
};

SK.celebPose = function (m, t) {
  const a = SK.armRoll, bob = Math.abs(Math.sin(t * 9)) * .12;
  return {
    pelvis: { p: .05 }, spine_01: { p: -.05 }, spine_02: { p: -.12 }, spine_03: { p: -.18 }, neck_01: { p: -.1 }, Head: { p: -.15 },
    thigh_l: { p: -.35, r: SK.abd.l * .18 }, calf_l: { p: .3, r: SK.abd.l * .18 }, foot_l: { p: 0 },
    thigh_r: { p: -.35, r: SK.abd.r * .18 }, calf_r: { p: .3, r: SK.abd.r * .18 }, foot_r: { p: 0 },
    upperarm_l: { o: 'rp', r: -a.l * .92, p: -.1 + bob }, lowerarm_l: { o: 'rp', r: -a.l * .92, p: -.2 + bob },
    upperarm_r: { o: 'rp', r: -a.r * .92, p: -.1 + bob }, lowerarm_r: { o: 'rp', r: -a.r * .92, p: -.2 + bob }, hand_r: { p: 0 }
  };
};
