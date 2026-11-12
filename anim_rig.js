(function () {
/* Animation rig utilities: two-bone arm IK and the free hockey stick.
   All positions here are in "root space" (the model's own metre coordinates). Allocation-free per frame. */
'use strict';
const AR = { ready: false, Lg: 1.3 };
const _v = () => new THREE.Vector3();
AR.t = { a: _v(), b: _v(), c: _v(), d: _v(), e: _v(), f: _v(), g: _v(), h: _v(), i: _v(), j: _v() };
AR.qa = new THREE.Quaternion(); AR.mm = new THREE.Matrix4();

AR.init = function () {
  AR.len = {}; AR.dir = {};
  for (const s of ['l', 'r']) {
    const ua = 'upperarm_' + s, la = 'lowerarm_' + s, ha = 'hand_' + s;
    AR.len[s] = { l1: SK.restP[ua].distanceTo(SK.restP[la]), l2: SK.restP[la].distanceTo(SK.restP[ha]) };
    AR.dir[ua] = SK.restP[la].clone().sub(SK.restP[ua]).normalize();
    AR.dir[la] = SK.restP[ha].clone().sub(SK.restP[la]).normalize();
  }
  AR.ready = true;
};

// bone position in root (model) space. Requires up to date matrixWorld.
AR.pos = function (m, name, out) { m.byName[name].getWorldPosition(out); m.root.worldToLocal(out); return out; };

// elbow position for a two-bone chain from shoulder S to target Tg, bending toward `pole`
AR.elbow = function (S, Tg, l1, l2, pole, out) {
  const u = AR.t.a.copy(Tg).sub(S), d = u.length(), dmax = l1 + l2 - 1e-3, dmin = Math.abs(l1 - l2) + 1e-3, dd = Math.min(dmax, Math.max(dmin, d));
  u.multiplyScalar(1 / (d || 1));
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const base = AR.t.b.copy(S).addScaledVector(u, a), p = AR.t.c.copy(pole); p.addScaledVector(u, -p.dot(u));
  if (p.lengthSq() < 1e-6) p.set(0, -1, 0); p.normalize();
  return out.copy(base).addScaledVector(p, h);
};

/* Solve one arm. Writes world quaternions into pose.upperarm_x / pose.lowerarm_x (persistent objects in m.an.q).
   Returns the distance the hand could NOT reach (0 = reached). */
AR.arm = function (m, s, Tg, pole, pose) {
  const ua = 'upperarm_' + s, la = 'lowerarm_' + s, S = AR.t.d, E = AR.t.e, L = AR.len[s];
  AR.pos(m, ua, S); AR.elbow(S, Tg, L.l1, L.l2, pole, E);
  const q = m.an.q, d1 = AR.t.f.copy(E).sub(S).normalize();
  AR.qa.setFromUnitVectors(AR.dir[ua], d1); q[ua].copy(AR.qa).multiply(SK.restW[ua]);
  const d2 = AR.t.g.copy(Tg).sub(E).normalize();
  AR.qa.setFromUnitVectors(AR.dir[la], d2); q[la].copy(AR.qa).multiply(SK.restW[la]);
  pose[ua] = pose[ua] || {}; pose[la] = pose[la] || {}; pose[ua].q = q[ua]; pose[la].q = q[la];
  return Math.max(0, S.distanceTo(Tg) - (L.l1 + L.l2));
};

/* ---------- the stick: a free object. Shaft + blade + tape, in root space ---------- */
AR.makeStick = function (m) {
  const goalie = m.goalie, shaftMat = new THREE.MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.45, metalness: 0.25 }),
    bladeMat = new THREE.MeshStandardMaterial({ color: goalie ? 0xd9d9d9 : 0x1c1f25, roughness: 0.5 }), tapeMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(goalie ? 0.06 : 0.045, 1, goalie ? 0.04 : 0.032), shaftMat);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, goalie ? 0.2 : 0.11, goalie ? 0.55 : 0.34), bladeMat);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, goalie ? 0.5 : 0.31), tapeMat);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.04), tapeMat);
  shaft.frustumCulled = blade.frustumCulled = tape.frustumCulled = knob.frustumCulled = false;
  m.root.add(shaft); m.root.add(blade); m.root.add(tape); m.root.add(knob);
  m.stick = { shaft, blade, tape, knob, goalie, heel: new THREE.Vector3(), dir: new THREE.Vector3(0, -1, 0), bd: new THREE.Vector3(0, 0, 1) };
};

/* Place the stick: top hand at T, blade heel at Hl (on the ice), blade extends along bladeDir (horizontal) */
AR.placeStick = function (m, T, Hl, bladeDir) {
  const st = m.stick, dir = AR.t.h.copy(Hl).sub(T), len = dir.length() || 1; dir.multiplyScalar(1 / len);
  const x = AR.t.i, z = AR.t.j, bd = bladeDir;
  // shaft: local Y along dir, spans from 0.12 above the top hand to the heel
  x.crossVectors(dir, bd); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); z.crossVectors(x, dir);
  AR.mm.makeBasis(x, dir, z); st.shaft.quaternion.setFromRotationMatrix(AR.mm);
  st.shaft.scale.set(1, len + 0.12, 1); st.shaft.position.copy(T).addScaledVector(dir, (len - 0.12) / 2);
  st.knob.quaternion.copy(st.shaft.quaternion); st.knob.position.copy(T).addScaledVector(dir, -0.1);
  // blade: horizontal, resting on the ice at the heel
  const up = AR.t.a.set(0, 1, 0); x.crossVectors(up, bd).normalize(); AR.mm.makeBasis(x, up, bd); st.blade.quaternion.setFromRotationMatrix(AR.mm);
  const off = st.goalie ? 0.28 : 0.17, hh = st.goalie ? 0.1 : 0.055;
  st.blade.position.copy(Hl).addScaledVector(bd, off); st.blade.position.y += hh;
  st.tape.quaternion.copy(st.blade.quaternion); st.tape.position.copy(st.blade.position); st.tape.position.y += hh * 0.9;
  st.heel.copy(Hl); st.dir.copy(dir); st.bd.copy(bd);
};

window.AR = AR;
})();
