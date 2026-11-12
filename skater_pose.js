/* Procedural skating pose + ground contact for SK skaters. */
SK.skatePose = function (m, ph, sp, turn, acc, back) {
  acc = acc || 0;
  const push = back ? Math.min(1, .25 + sp) : Math.min(1, acc * 1.15 + .12 * sp), crouch = (back ? .38 : .5) + .25 * sp + .18 * Math.abs(turn || 0);
  const pl = Math.max(0, Math.sin(ph)) * push, pr = Math.max(0, Math.sin(ph + Math.PI)) * push, lean = turn || 0, up = back ? -.18 : 0;
  const leg = (s, pu) => ({ tp: -(.45 + .55 * crouch) + .55 * pu, tr: SK.abd[s] * (.1 + .55 * pu + (back ? .12 : 0)), cp: .12 + .55 * crouch * (1 - .6 * pu) + .1 * pu });
  const L = leg('l', pl), R = leg('r', pr), rl = SK.rollLeft * lean;
  return {
    pelvis: { p: .15 + .1 * sp + up * .6, r: rl * .45 }, spine_01: { p: .26 + .1 * sp + up, r: rl * .4 }, spine_02: { p: .32 + .1 * sp + up, r: rl * .4 }, spine_03: { p: .36 + .1 * sp + up, r: rl * .4 },
    neck_01: { p: .12 }, Head: { p: -.1 },
    thigh_l: { p: L.tp, r: L.tr }, calf_l: { p: L.cp, r: L.tr }, foot_l: { p: 0 },
    thigh_r: { p: R.tp, r: R.tr }, calf_r: { p: R.cp, r: R.tr }, foot_r: { p: 0 },
    upperarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : 1), p: -.45 }, lowerarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : 1), p: -1.35 },
    upperarm_r: { o: 'rp', r: SK.armRoll.r * (back ? .8 : 1), p: -.45 }, lowerarm_r: { o: 'rp', r: SK.armRoll.r * (back ? .8 : 1), p: -1.35 }, hand_r: { p: 0 }
  };
};
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
