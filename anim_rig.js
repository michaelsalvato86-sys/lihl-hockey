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
  AR.hb = {}; AR.cal = null; AR.palm = {}; AR.palmV = { l: new THREE.Vector3(), r: new THREE.Vector3() };
  for (const s of ['l', 'r']) {
    const hp = SK.restP['hand_' + s], a = SK.restP['middle_01_' + s].clone().sub(hp).normalize(), b = SK.restP['thumb_01_' + s].clone().sub(hp); b.addScaledVector(a, -b.dot(a)).normalize();
    const c = new THREE.Vector3().crossVectors(a, b); AR.hb[s] = { Minv: new THREE.Matrix4().makeBasis(a, b, c).invert() };
    AR.palm[s] = ['index', 'middle', 'ring', 'pinky'].reduce((acc, f) => acc.add(SK.restP[f + '_01_' + s]), new THREE.Vector3()).multiplyScalar(0.25).sub(hp);
  }
  AR.mm2 = new THREE.Matrix4(); AR.qR = new THREE.Quaternion(); AR.ax = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  AR.curlAng = { index: [0.95, 1.15, 0.8], middle: [0.95, 1.15, 0.8], ring: [0.95, 1.15, 0.8], pinky: [0.95, 1.15, 0.8], thumb: [0.5, 0.55, 0.4] };
  AR.llen = {}; AR.ballOff = {}; AR.ballRestY = Math.min(SK.restP.ball_l.y, SK.restP.ball_r.y);
  for (const s of ['l', 'r']) {
    const th = 'thigh_' + s, ca = 'calf_' + s, ft = 'foot_' + s;
    AR.llen[s] = { l1: SK.restP[th].distanceTo(SK.restP[ca]), l2: SK.restP[ca].distanceTo(SK.restP[ft]) };
    AR.dir[th] = SK.restP[ca].clone().sub(SK.restP[th]).normalize();
    AR.dir[ca] = SK.restP[ft].clone().sub(SK.restP[ca]).normalize();
  }
  AR.ready = true;
};

/* wrist: orient the hand so the fingers wrap around the shaft (thumb along the shaft toward the blade) */
AR.hand = function (m, s, shaft, inward, pose) {
  const a = AR.t.a.crossVectors(shaft, SK.U); if (a.lengthSq() < 1e-6) a.set(1, 0, 0); a.normalize(); if (a.dot(inward) < 0) a.negate();
  const b = AR.t.b.copy(shaft).addScaledVector(a, -shaft.dot(a)).normalize(), c = AR.t.c.crossVectors(a, b);
  AR.mm.makeBasis(a, b, c); AR.mm2.multiplyMatrices(AR.mm, AR.hb[s].Minv); AR.qR.setFromRotationMatrix(AR.mm2);
  const q = m.an.q['hand_' + s] || (m.an.q['hand_' + s] = new THREE.Quaternion()); q.copy(AR.qR).multiply(SK.restW['hand_' + s]);
  pose['hand_' + s] = { q }; AR.palmV[s].copy(AR.palm[s]).applyQuaternion(AR.qR);
};
/* fingers curl around the shaft. The bend axis/sign of this rig is found once by trial: whichever candidate brings the fingertip closest to the shaft */
AR.calibrate = function (m, side, grip, shaft) {
  const tip = 'index_04_leaf_' + side, b = m.byName['index_01_' + side], t = AR.t.d, q0 = b.quaternion.clone(); let best = null, bd = 1e9;
  const q = new THREE.Quaternion();
  for (const k of ['x', 'y', 'z']) for (const sg of [1, -1]) {
    q.setFromAxisAngle(AR.ax[k], sg * 0.7); b.quaternion.copy(q0).multiply(q); m.g.updateMatrixWorld(true); AR.pos(m, tip, t);
    const w = AR.t.e.copy(t).sub(grip), d = w.addScaledVector(shaft, -w.dot(shaft)).length(); if (d < bd) { bd = d; best = { v: AR.ax[k], sg }; }
  }
  b.quaternion.copy(q0); m.g.updateMatrixWorld(true); return best;
};
AR.curl = function (pose, side, k) {
  const c = AR.cal && AR.cal[side]; if (!c) return;
  for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) for (let j = 0; j < 3; j++) pose[f + '_0' + (j + 1) + '_' + side] = { c: { v: c.v, a: c.sg * AR.curlAng[f][j] * k } };
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


/* ---------- legs: two-bone hip-knee-ankle IK, ice contact, planted-foot hold ----------
   Runs after the FK skating pose (pass 1). The FK ankle and knee are the starting point (so the knee bends the way the FK pose bent it);
   D[s] = {x,y,z (root-space offset of the ankle target), pw (plant weight 0..1)}. Output: world quaternions for thigh/calf in pose (foot keeps its FK blade orientation).
   Returns per-leg { reach: unreachable metres, lift: metres raised to keep the blade off the ice }. */
AR.legs = function (m, an, pose, D, iceY) {
  const out = an.legRes || (an.legRes = { l: { reach: 0, lift: 0 }, r: { reach: 0, lift: 0 } }), q = an.q, pl = an.plant || (an.plant = { l: { on: false, w: new THREE.Vector3() }, r: { on: false, w: new THREE.Vector3() } });
  const H = AR.t.d, K = AR.t.e, A = AR.t.f, T = AR.t.g, Bo = AR.t.h, P = AR.t.i, W = AR.t.j;
  for (const s of ['l', 'r']) {
    const th = 'thigh_' + s, ca = 'calf_' + s, L = AR.llen[s], d = D[s], r = out[s];
    AR.pos(m, th, H); AR.pos(m, ca, K); AR.pos(m, 'foot_' + s, A); AR.pos(m, 'ball_' + s, Bo); Bo.sub(A);
    P.copy(K).sub(H);                                            // pole = FK knee direction
    T.copy(A).add(d);
    // planted foot: hold its world xz while the skater is (nearly) still
    const st = pl[s];
    if (d.pw > 0.5 && !st.on) { W.copy(A); m.root.localToWorld(W); st.w.copy(W); st.on = true; } else if (d.pw < 0.25) st.on = false;
    if (st.on) { W.copy(st.w); m.root.worldToLocal(W); T.x += (W.x - T.x) * d.pw; T.z += (W.z - T.z) * d.pw; }
    // ice contact: ankle and toe-ball may not sink below their rest heights above the ice
    const minA = iceY + SK.footRestY, minB = iceY + AR.ballRestY;
    let lift = Math.max(0, minA - T.y, minB - (T.y + Bo.y)); r.lift = lift; T.y += lift;
    const e = AR.elbow(H, T, L.l1, L.l2, P, AR.t.a2 || (AR.t.a2 = new THREE.Vector3()));
    r.reach = Math.max(0, H.distanceTo(T) - (L.l1 + L.l2));
    const d1 = AR.t.b2 || (AR.t.b2 = new THREE.Vector3()), d2 = AR.t.c2 || (AR.t.c2 = new THREE.Vector3());
    d1.copy(e).sub(H).normalize(); q[th] = q[th] || new THREE.Quaternion(); AR.qa.setFromUnitVectors(AR.dir[th], d1); q[th].copy(AR.qa).multiply(SK.restW[th]);
    // if the leg is fully stretched the ankle lands short of T along the line; calf still points at T
    d2.copy(T).sub(e).normalize(); q[ca] = q[ca] || new THREE.Quaternion(); AR.qa.setFromUnitVectors(AR.dir[ca], d2); q[ca].copy(AR.qa).multiply(SK.restW[ca]);
    pose[th] = { q: q[th] }; pose[ca] = { q: q[ca] };
  }
  return out;
};

/* ---------- the stick: a free object. Shaft + blade + tape, in root space ---------- */
AR.makeStick = function (m) {
  const goalie = m.goalie, shaftMat = new THREE.MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.45, metalness: 0.25 }),
    bladeMat = new THREE.MeshStandardMaterial({ color: goalie ? 0xd9d9d9 : 0x1c1f25, roughness: 0.5 }), tapeMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(goalie ? 0.06 : 0.045, 1, goalie ? 0.04 : 0.032), shaftMat);
  const bg = new THREE.BoxGeometry(0.03, goalie ? 0.2 : 0.11, goalie ? 0.55 : 0.34), tg = new THREE.BoxGeometry(0.036, 0.028, goalie ? 0.5 : 0.31); tg.translate(0, (goalie ? 0.1 : 0.055) * 0.9, 0);
  const col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  col(bg, new THREE.Color(goalie ? 0xd9d9d9 : 0x1c1f25)); col(tg, new THREE.Color(0xf2f2f2));
  const P = [], N = [], C = [], I = []; for (const g of [bg, tg]) { const base = P.length / 3; for (let i = 0; i < g.attributes.position.count; i++) { P.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)); N.push(g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i)); C.push(g.attributes.color.getX(i), g.attributes.color.getY(i), g.attributes.color.getZ(i)); } for (const k of g.index.array) I.push(k + base); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); mg.setIndex(I);
  const blade = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  shaft.frustumCulled = blade.frustumCulled = false;
  m.root.add(shaft); m.root.add(blade);
  m.stick = { shaft, blade, goalie, heel: new THREE.Vector3(), dir: new THREE.Vector3(0, -1, 0), bd: new THREE.Vector3(0, 0, 1) };
};

/* Place the stick: top hand at T, blade heel at Hl (on the ice), blade extends along bladeDir (horizontal) */
AR.placeStick = function (m, T, Hl, bladeDir) {
  const st = m.stick, dir = AR.t.h.copy(Hl).sub(T), len = dir.length() || 1; dir.multiplyScalar(1 / len);
  const x = AR.t.i, z = AR.t.j, bd = bladeDir;
  // shaft: local Y along dir, spans from 0.12 above the top hand to the heel
  x.crossVectors(dir, bd); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); z.crossVectors(x, dir);
  AR.mm.makeBasis(x, dir, z); st.shaft.quaternion.setFromRotationMatrix(AR.mm);
  st.shaft.scale.set(1, len + 0.12, 1); st.shaft.position.copy(T).addScaledVector(dir, (len - 0.12) / 2);
  // blade: horizontal, resting on the ice at the heel
  const up = AR.t.a.set(0, 1, 0); x.crossVectors(up, bd).normalize(); AR.mm.makeBasis(x, up, bd); st.blade.quaternion.setFromRotationMatrix(AR.mm);
  const off = st.goalie ? 0.28 : 0.17, hh = st.goalie ? 0.1 : 0.055;
  st.blade.position.copy(Hl).addScaledVector(bd, off); st.blade.position.y += hh;
  st.heel.copy(Hl); st.dir.copy(dir); st.bd.copy(bd);
};

window.AR = AR;
})();
