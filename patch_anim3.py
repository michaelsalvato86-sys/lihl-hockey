import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
c = open('anim_ctrl.js', encoding='utf-8').read()
r = open('anim_rig.js', encoding='utf-8').read()
s3 = open('skater3d.js', encoding='utf-8').read()
rt = open('r3d.js', encoding='utf-8').read()
tt = open('anim_test.html', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:90]
    return txt.replace(a, b, 1)


# =============== skater3d.js: finger curl support in setPose ===============
s3 = rep(s3, "    let wq = W[name] || (W[name] = new THREE.Quaternion());\n    if (t) {",
         "    let wq = W[name] || (W[name] = new THREE.Quaternion());\n    if (t && t.c) { const lq = SK.restW[name].clone(); if (pn) lq.premultiply(qc.copy(SK.restW[pn]).invert()); qa.setFromAxisAngle(t.c.v, t.c.a); lq.multiply(qa); b.quaternion.copy(lq); if (Wp) wq.copy(Wp).multiply(lq); else wq.copy(lq); continue; }\n    if (t) {", 'setPose curl')

# =============== anim_rig.js: hand orientation, finger curl, merged 2-mesh stick ===============
r = rep(r, "  AR.ready = true;\n};",
        """  AR.hb = {}; AR.cal = null;
  for (const s of ['l', 'r']) {
    const hp = SK.restP['hand_' + s], a = SK.restP['middle_01_' + s].clone().sub(hp).normalize(), b = SK.restP['thumb_01_' + s].clone().sub(hp); b.addScaledVector(a, -b.dot(a)).normalize();
    const c = new THREE.Vector3().crossVectors(a, b); AR.hb[s] = { Minv: new THREE.Matrix4().makeBasis(a, b, c).invert() };
  }
  AR.mm2 = new THREE.Matrix4(); AR.qR = new THREE.Quaternion(); AR.ax = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  AR.curlAng = { index: [0.95, 1.15, 0.8], middle: [0.95, 1.15, 0.8], ring: [0.95, 1.15, 0.8], pinky: [0.95, 1.15, 0.8], thumb: [0.5, 0.55, 0.4] };
  AR.ready = true;
};

/* wrist: orient the hand so the fingers wrap around the shaft (thumb along the shaft toward the blade) */
AR.hand = function (m, s, shaft, inward, pose) {
  const a = AR.t.a.crossVectors(shaft, SK.U); if (a.lengthSq() < 1e-6) a.set(1, 0, 0); a.normalize(); if (a.dot(inward) < 0) a.negate();
  const b = AR.t.b.copy(shaft).addScaledVector(a, -shaft.dot(a)).normalize(), c = AR.t.c.crossVectors(a, b);
  AR.mm.makeBasis(a, b, c); AR.mm2.multiplyMatrices(AR.mm, AR.hb[s].Minv); AR.qR.setFromRotationMatrix(AR.mm2);
  const q = m.an.q['hand_' + s] || (m.an.q['hand_' + s] = new THREE.Quaternion()); q.copy(AR.qR).multiply(SK.restW['hand_' + s]);
  pose['hand_' + s] = { q };
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
};""", 'AR.init hands')
# stick: shaft + (blade+tape merged) = 2 draw calls per stick
a0 = r.index("  const shaft = new THREE.Mesh(new THREE.BoxGeometry(goalie ? 0.06 : 0.045, 1, goalie ? 0.04 : 0.032), shaftMat);")
a1 = r.index("  m.stick = {", a0)
r = r[:a0] + """  const shaft = new THREE.Mesh(new THREE.BoxGeometry(goalie ? 0.06 : 0.045, 1, goalie ? 0.04 : 0.032), shaftMat);
  const bg = new THREE.BoxGeometry(0.03, goalie ? 0.2 : 0.11, goalie ? 0.55 : 0.34), tg = new THREE.BoxGeometry(0.036, 0.028, goalie ? 0.5 : 0.31); tg.translate(0, (goalie ? 0.1 : 0.055) * 0.9, 0);
  const col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  col(bg, new THREE.Color(goalie ? 0xd9d9d9 : 0x1c1f25)); col(tg, new THREE.Color(0xf2f2f2));
  const P = [], N = [], C = [], I = []; for (const g of [bg, tg]) { const base = P.length / 3; for (let i = 0; i < g.attributes.position.count; i++) { P.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)); N.push(g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i)); C.push(g.attributes.color.getX(i), g.attributes.color.getY(i), g.attributes.color.getZ(i)); } for (const k of g.index.array) I.push(k + base); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); mg.setIndex(I);
  const blade = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  shaft.frustumCulled = blade.frustumCulled = false;
  m.root.add(shaft); m.root.add(blade);
""" + r[a1:]
r = rep(r, "  m.stick = { shaft, blade, tape, knob, goalie,", "  m.stick = { shaft, blade, goalie,", 'stick obj')
r = rep(r, "  st.knob.quaternion.copy(st.shaft.quaternion); st.knob.position.copy(T).addScaledVector(dir, -0.1);\n", "", 'knob')
r = rep(r, "  st.tape.quaternion.copy(st.blade.quaternion); st.tape.position.copy(st.blade.position); st.tape.position.y += hh * 0.9;\n", "", 'tape')

# =============== anim_ctrl.js ===============
c = rep(c, "    q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion() },",
        "    q: { upperarm_l: new THREE.Quaternion(), lowerarm_l: new THREE.Quaternion(), upperarm_r: new THREE.Quaternion(), lowerarm_r: new THREE.Quaternion(), hand_l: new THREE.Quaternion(), hand_r: new THREE.Quaternion() }, pivPh: 0,", 'make q')
c = rep(c, "s: { carry: 0, free: 0, stop: 0,", "s: { pivot: 0, carry: 0, free: 0, stop: 0,", 'make s')
# mobile level of detail: non-key skaters update every other frame
c = rep(c, "  dt = Math.min(dt, 0.05);\n  // ---------- 0. events ----------",
        "  if (SK.mobile() && !c.key) { an.lodAcc = (an.lodAcc || 0) + dt; an.lodSkip = !an.lodSkip; if (an.lodSkip && an.state) return; dt = an.lodAcc; an.lodAcc = 0; }\n  dt = Math.min(dt, 0.05);\n  // ---------- 0. events ----------", 'lod')
# slap vs wrist: much bigger, clearly different mechanics
c = rep(c, "eYaw = sgn * kf(uu, [[0, -0.9], [0.1, 0.85], [0.4, 0.7], [1, 0]]) * A * w; eBf = kf(uu, [[0, -0.75], [0.1, 0.7], [0.45, 0.45], [1, 0]]) * A;\n      eBh = kf(uu, [[0, 0.9], [0.09, 0.0], [0.22, 0.55], [0.5, 0.8], [1, 0]]) * A; eHh = kf(uu, [[0, 0.5], [0.12, -0.04], [0.45, 0.3], [1, 0]]) * A; eCr = kf(uu, [[0, 0.3], [0.3, 0.12], [1, 0]]);",
        "eYaw = sgn * kf(uu, [[0, -1.0], [0.1, 0.95], [0.4, 0.8], [1, 0]]) * A * w; eBf = kf(uu, [[0, -0.95], [0.1, 0.8], [0.45, 0.5], [1, 0]]) * A;\n      eBh = kf(uu, [[0, 1.15], [0.09, 0.0], [0.22, 0.7], [0.5, 0.95], [1, 0]]) * A; eHh = kf(uu, [[0, 0.62], [0.12, -0.04], [0.45, 0.42], [1, 0]]) * A; eCr = kf(uu, [[0, 0.45], [0.3, 0.2], [1, 0]]); eStance = 0.3 * kf(uu, [[0, 1], [0.6, 0.7], [1, 0]]);",
        'slap curve')
c = rep(c, "      eBh = kf(uu, [[0, 0], [0.22, 0.06], [0.4, 0.3], [1, 0]]) * A; eHh = kf(uu, [[0, 0.04], [0.3, 0.1], [1, 0]]) * A; eCr = kf(uu, [[0, 0.2], [0.35, 0.1], [1, 0]]);",
        "      eBh = kf(uu, [[0, 0], [0.22, 0.04], [0.4, 0.2], [1, 0]]) * A; eHh = kf(uu, [[0, 0.02], [0.3, 0.06], [1, 0]]) * A; eCr = kf(uu, [[0, 0.2], [0.35, 0.1], [1, 0]]); eBs += -sgn * 0.3 * kf(uu, [[0, 0.5], [0.22, -0.4], [0.55, 0]]);", 'wrist curve')
c = rep(c, "let eYaw = 0, eBf = 0,", "let eStance = 0, eYaw = 0, eBf = 0,", 'eStance decl')
c = rep(c, "if (ch > 0.02) { const slap = _es((ch - 0.62) / 0.3); eYaw += sgn * (-0.3 - 0.4 * slap) * ch * V.wind; eBf += (-0.35 - 0.4 * slap) * ch; eBh += (0.15 + 0.7 * slap) * ch; eHh += 0.35 * slap * ch; eCr += 0.15 * ch; }",
        "if (ch > 0.02) { const slap = _es((ch - 0.62) / 0.3); eYaw += sgn * (-0.3 - 0.7 * slap) * ch * V.wind; eBf += (-0.35 - 0.6 * slap) * ch; eBh += (0.15 + 1.0 * slap) * ch; eHh += 0.6 * slap * ch; eCr += 0.15 * ch + 0.25 * slap * ch; eStance += 0.3 * slap * ch; }", 'charge')
c = rep(c, "if (ol > 0.24) X.Tt.multiplyScalar(0.24 / ol); X.Tt.add(X.Th);", "const lim = 0.24 + 0.55 * _cl(eHh / 0.5, 0, 1); if (ol > lim) X.Tt.multiplyScalar(lim / ol); X.Tt.add(X.Th);", 'hand clamp')
c = rep(c, "eStance", "eStance", 'noop') if False else c
# --- skate edges, blade alignment to travel direction, pivot steps ---
c = rep(c, "  if (xo > 0) for (const sd of ['l', 'r'])",
        """  for (const sd of ['l', 'r']) { pose['thigh_' + sd].r += SK.abd[sd] * eStance; pose['calf_' + sd].r = pose['thigh_' + sd].r; }
  // pivot: low speed, fast heading change: alternating steps that rotate the skates toward the turn
  const pivT = (sp < 9 && Math.abs(turn) > 1.9 && !an.fall) ? 1 : 0; _sm(S, 'pivot', pivT, 10, dt); an.pivPh += dt * 8 * S.pivot;
  const beta = sp > 4 ? _cl(Math.atan2(c.vlat || 0, Math.max(c.vf, 2)) * YL * 0.85, -0.6, 0.6) : 0, edge = SK.rollLeft * lean * 0.55;
  for (const sd of ['l', 'r']) {
    const lift = Math.max(0, Math.sin(an.pivPh + (sd === 'l' ? 0 : Math.PI))) * S.pivot;
    pose['thigh_' + sd].p -= 0.35 * lift; pose['calf_' + sd].p += 0.5 * lift;
    pose['foot_' + sd] = { p: 0, y: beta * (1 - S.stop) - Math.sign(turn || 1) * YL * 0.5 * lift, r: edge - pose['thigh_' + sd].r * 0.35 };
  }
  if (xo > 0) for (const sd of ['l', 'r'])""", 'feet')
# --- wrist + fingers (after IK, before the second pass) ---
c = rep(c, "  SK.setPose(m, pose);\n  AR.placeStick(m, X.Tt, X.Hl, X.bd);",
        """  X.sh.copy(X.Hl).sub(X.Tt).normalize();                      // shaft direction toward the blade
  X.pole.copy(X.Sb).multiplyScalar(-lt); AR.hand(m, topSide, X.sh, X.pole, pose);
  X.pole.copy(X.Sb).multiplyScalar(-lb); AR.hand(m, botSide, X.sh, X.pole, pose);
  if (!SK.mobile() && AR.cal) { const kc = 0.85 * (1 - S.free * 0.0); AR.curl(pose, topSide, kc); AR.curl(pose, botSide, kc * (1 - 0.6 * Math.max(S.free, S.flail))); }
  SK.setPose(m, pose);
  AR.placeStick(m, X.Tt, X.Hl, X.bd);
  if (!SK.mobile() && !AR.cal) { AR.cal = {}; m.g.updateMatrixWorld(true); AR.cal[topSide] = AR.calibrate(m, topSide, X.Tt, X.sh); AR.cal[botSide] = AR.calibrate(m, botSide, X.Tb, X.sh); }""", 'hands')
c = rep(c, "  m.stick.shaft.visible = m.stick.blade.visible = m.stick.tape.visible = m.stick.knob.visible = true;", "  m.stick.shaft.visible = m.stick.blade.visible = true;", 'stick vis')
c = rep(c, "an.state = c.celeb ? 'celebrating'", "an.state = c.celeb ? 'celebrating' : S.pivot > 0.5 ? 'pivoting'", 'state pivot')
c = rep(c, "return { topHandToGrip: a.distanceTo(Tt),", "const fl = (s) => { if (!AR.cal || !AR.cal[s]) return -1; const tp = V3(); AR.pos(m, 'index_04_leaf_' + s, tp); const w = tp.clone().sub(s === topSide ? Tt : Tb); return w.addScaledVector(dir, -w.dot(dir)).length(); };\n  return { gripHeight: Tt.y - iceY, fingerTop: fl(topSide), fingerBot: fl(botSide), topHandToGrip: a.distanceTo(Tt),", 'measure')

# =============== r3d.js: extra ctx fields ===============
rt = rep(rt, "c.speed=sp;c.vf=p.vx*ch+p.vy*sn;c.hasPuck=puck.owner===p;",
         "c.speed=sp;c.vf=p.vx*ch+p.vy*sn;c.vlat=p.vx*sn-p.vy*ch;c.hasPuck=puck.owner===p;c.key=c.hasPuck||p===ctl||!!(m.an&&(m.an.ev||m.an.fall||m.an.recvT>0));", 'r3d ctx')

# =============== anim_test.html: foot slip / edges / finger metrics ===============
tt = rep(tt, "c.speed=Math.hypot(p.vx,p.vy);c.vf=p.vx*Math.cos(p.fa)+p.vy*Math.sin(p.fa);",
         "c.speed=Math.hypot(p.vx,p.vy);c.vf=p.vx*Math.cos(p.fa)+p.vy*Math.sin(p.fa);c.vlat=p.vx*Math.sin(p.fa)-p.vy*Math.cos(p.fa);c.key=true;", 'test ctx')
open('anim_ctrl.js', 'w', encoding='utf-8').write(c)
open('anim_rig.js', 'w', encoding='utf-8').write(r)
open('skater3d.js', 'w', encoding='utf-8').write(s3)
open('r3d.js', 'w', encoding='utf-8').write(rt)
open('anim_test.html', 'w', encoding='utf-8').write(tt)
print('ok')
