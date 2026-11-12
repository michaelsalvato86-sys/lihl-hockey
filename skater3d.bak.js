/* Real-model skater for LIHL Hockey.
   Model: Quaternius "Universal Base Characters" (CC0). Skeleton is driven by ABSOLUTE world orientations
   (pitch/roll about the model's own forward axis) so no per-bone axis guessing is needed.
   Clothing/gear is built from the body mesh itself (same skin weights) so it deforms with the skeleton. */
const SK = { ready: false, failed: false, S: 3.28 /* metres -> game feet */ };
const _V = () => new THREE.Vector3(), _Q = () => new THREE.Quaternion();

SK.load = function (cb) {
  try {
    new THREE.GLTFLoader().load('models/Superhero_Male_FullBody.gltf', g => {
      try { SK.init(g); SK.ready = true; } catch (e) { console.log('SK init failed', e); SK.failed = true; }
      if (cb) cb();
    }, undefined, e => { console.log('SK load failed', e); SK.failed = true; if (cb) cb(); });
  } catch (e) { console.log('SK loader missing', e); SK.failed = true; }
};

SK.init = function (g) {
  const sc = g.scene; SK.tpl = sc; sc.updateMatrixWorld(true);
  let body = null; sc.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  SK.body = body; const bones = body.skeleton.bones; SK.names = bones.map(b => b.name);
  // rest world quaternions / positions in model space (scene root assumed identity)
  const wq = n => { const q = _Q(); const ch = []; for (let o = n; o && o !== sc; o = o.parent) ch.push(o); for (let i = ch.length - 1; i >= 0; i--) q.multiply(ch[i].quaternion); return q; };
  SK.restW = {}; SK.restP = {}; SK.parent = {};
  bones.forEach(b => { SK.restW[b.name] = wq(b); const v = _V(); b.getWorldPosition(v); SK.restP[b.name] = v; SK.parent[b.name] = (b.parent && b.parent.isBone) ? b.parent.name : null; });
  // axes: up, forward (toe direction), pitch axis A = U x F
  SK.U = new THREE.Vector3(0, 1, 0);
  const F = SK.restP.ball_l.clone().sub(SK.restP.foot_l); F.y = 0; F.normalize(); SK.F = F;
  SK.A = new THREE.Vector3().crossVectors(SK.U, F).normalize();
  SK.leftSign = Math.sign(SK.A.dot(SK.restP.thigh_l.clone().sub(SK.restP.thigh_r))) || 1;
  // order bones parents-first
  const order = []; const seen = new Set();
  const visit = b => { if (seen.has(b.name)) return; if (SK.parent[b.name]) visit(bones.find(x => x.name === SK.parent[b.name])); seen.add(b.name); order.push(b.name); };
  bones.forEach(visit); SK.order = order;
  SK.footRestY = Math.min(SK.restP.foot_l.y, SK.restP.foot_r.y);
  // left direction, arm-hang rolls and leg-abduction signs
  const Ld = SK.restP.thigh_l.clone().sub(SK.restP.thigh_r); Ld.y = 0; Ld.normalize(); SK.Ld = Ld;
  const frontal = v => { const w = v.clone(); w.addScaledVector(SK.F, -w.dot(SK.F)); return w.normalize(); };
  const D = new THREE.Vector3(0, -1, 0), armDir = s => frontal(SK.restP['hand_' + s].clone().sub(SK.restP['upperarm_' + s]));
  const signedAng = (v, tgt) => { const c = new THREE.Vector3().crossVectors(v, tgt); return Math.atan2(c.dot(SK.F), v.dot(tgt)); };
  SK.armRoll = { l: signedAng(armDir('l'), D), r: signedAng(armDir('r'), D) }; // rotation about +F that makes the arm hang straight down
  SK.abd = { l: D.clone().applyAxisAngle(SK.F, .3).dot(Ld) > 0 ? 1 : -1 }; SK.abd.r = -SK.abd.l; // + about F moves leg outward
  SK.rollLeft = (Ld.x < 0) ? 1 : -1; // + roll about F leans the top toward -X
  const tl = new THREE.TextureLoader(); const lt = f => { const t = tl.load('models/' + f); t.flipY = false; return t; };
  SK.tex = { light: lt('T_Superhero_Male_Ligh.png'), dark: lt('T_Superhero_Male_Dark.png') };
  SK.buildRegions(body);
};

/* ---------- gear geometry built from the body skin weights ---------- */
SK.regionOf = function (name) {
  if (/^(spine_0[123]|clavicle_|upperarm_)/.test(name)) return 'jersey';
  if (/^(pelvis|thigh_)/.test(name)) return 'pants';
  if (/^calf_/.test(name)) return 'socks';
  if (/^(hand_|index_|middle_|ring_|pinky_|thumb_)/.test(name)) return 'gloves';
  if (/^(foot_|ball_)/.test(name)) return 'skates';
  return null;
};
SK.buildRegions = function (body) {
  const geo = body.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index;
  const bn = body.skeleton.bones, n = pos.count, reg = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const acc = {}; for (let k = 0; k < 4; k++) { const w = sw.array[i * 4 + k]; if (w <= 0) continue; const r = SK.regionOf(bn[si.array[i * 4 + k]].name); if (r) acc[r] = (acc[r] || 0) + w; }
    let best = null, bw = 0.3; for (const r in acc) if (acc[r] > bw) { bw = acc[r]; best = r; } reg[i] = best;
  }
  const off = { jersey: 0.022, pants: 0.02, socks: 0.013, gloves: 0.014, skates: 0.012 };
  SK.geo = {};
  for (const r in off) {
    const tris = []; const a = idx.array;
    for (let t = 0; t < a.length; t += 3) { let c = 0; for (let k = 0; k < 3; k++) if (reg[a[t + k]] === r) c++; if (c >= 3) tris.push(a[t], a[t + 1], a[t + 2]); }
    if (!tris.length) continue;
    const g = new THREE.BufferGeometry(); const P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { P[i * 3] = pos.getX(i) + nor.getX(i) * off[r]; P[i * 3 + 1] = pos.getY(i) + nor.getY(i) * off[r]; P[i * 3 + 2] = pos.getZ(i) + nor.getZ(i) * off[r]; }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', nor); g.setAttribute('skinIndex', si); g.setAttribute('skinWeight', sw);
    g.setIndex(tris); SK.geo[r] = g;
  }
  // bounding info for placing decals / helmet (bind space)
  const hb = bn.findIndex(b => b.name === 'Head'); let hx = 0, hy = 0, hz = 0, hc = 0, hmaxY = -1e9;
  const tb = new THREE.Box3(); for (let i = 0; i < n; i++) {
    const wH = (() => { let w = 0; for (let k = 0; k < 4; k++) if (si.array[i * 4 + k] === hb) w += sw.array[i * 4 + k]; return w; })();
    if (wH > 0.6) { hx += pos.getX(i); hy += pos.getY(i); hz += pos.getZ(i); hc++; hmaxY = Math.max(hmaxY, pos.getY(i)); }
    if (reg[i] === 'jersey') { tb.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))); (SK.jv = SK.jv || []).push(pos.getX(i), pos.getY(i), pos.getZ(i)); }
  }
  SK.head = { c: new THREE.Vector3(hx / hc, hy / hc, hz / hc), top: hmaxY }; SK.torso = tb;
};

/* ---------- build one skater ---------- */
SK.rigid = function (geo, bone, mat) { // helper: geometry in bind space, 100% weighted to `bone`
  const c = geo.attributes.position.count, si = new Uint16Array(c * 4), sw = new Float32Array(c * 4);
  for (let i = 0; i < c; i++) { si[i * 4] = bone; sw[i * 4] = 1; }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return new THREE.SkinnedMesh(geo, mat);
};
SK.make = function (p, opts) {
  opts = opts || {};
  const root = THREE.SkeletonUtils.clone(SK.tpl); let body = null;
  root.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  const bones = body.skeleton.bones, bi = n => bones.findIndex(b => b.name === n), par = body.parent;
  const col = new THREE.Color(p.team.color), acc = new THREE.Color(accOf(p));
  const dark = new THREE.Color(0x11151c);
  // skin tone texture variety
  const tone = ((p.id * 2654435761) >>> 0) % 3;
  const bodyMat = body.material.clone();
  if (SK.tex) bodyMat.map = SK.tex[tone === 0 ? 'light' : 'dark'] || bodyMat.map;
  if (tone === 2) bodyMat.color = new THREE.Color(0xd8b08f);
  body.material = bodyMat;
  const mats = {
    jersey: new THREE.MeshStandardMaterial({ color: col, roughness: .55, skinning: true }),
    pants: new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(.5), roughness: .6, skinning: true }),
    socks: new THREE.MeshStandardMaterial({ color: acc, roughness: .6, skinning: true }),
    gloves: new THREE.MeshStandardMaterial({ color: acc, roughness: .6, skinning: true }),
    skates: new THREE.MeshStandardMaterial({ color: dark, roughness: .4, skinning: true })
  };
  for (const r in SK.geo) { const m = new THREE.SkinnedMesh(SK.geo[r], mats[r]); m.frustumCulled = false; par.add(m); m.bind(body.skeleton, body.bindMatrix); }
  // helmet (sphere around the head, bound to Head)
  const hc = SK.head.c, hr = (SK.head.top - hc.y) * 0.86 + 0.02;
  const hg = new THREE.SphereGeometry(hr, 18, 12); hg.scale(1, 0.82, 1.02); hg.translate(hc.x, hc.y + hr * 0.3, hc.z - hr * 0.1);
  const helm = SK.rigid(hg, bi('Head'), new THREE.MeshStandardMaterial({ color: opts.goalie ? 0xf2f2f2 : col.clone().multiplyScalar(.55), roughness: .35, skinning: true }));
  helm.frustumCulled = false; par.add(helm); helm.bind(body.skeleton, body.bindMatrix);
  // skate blades
  for (const side of ['l', 'r']) {
    const fp = SK.restP['foot_' + side], bp = SK.restP['ball_' + side];
    const bg = new THREE.BoxGeometry(0.1, 0.05, 0.36); // length along local Z then rotate to F
    const ang = Math.atan2(SK.F.x, SK.F.z); bg.rotateY(ang); bg.translate((fp.x + bp.x) / 2, 0.025, (fp.z + bp.z) / 2);
    const bl = SK.rigid(bg, bi('foot_' + side), new THREE.MeshStandardMaterial({ color: 0xcfd5dc, metalness: .6, roughness: .3, skinning: true }));
    bl.frustumCulled = false; par.add(bl); bl.bind(body.skeleton, body.bindMatrix);
  }
  // stick (bound to right hand)
  if (!opts.goalie) {
    const hp = SK.restP.hand_r, d0 = SK.F.clone().multiplyScalar(0.62).addScaledVector(SK.U, -0.78).normalize();
    const L = 1.45, sg = new THREE.BoxGeometry(0.03, L, 0.03); // along Y
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d0.clone().negate()); // blade end downward-forward
    sg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); sg.translate(hp.x + d0.x * L / 2, hp.y + d0.y * L / 2, hp.z + d0.z * L / 2);
    const st = SK.rigid(sg, bi('hand_r'), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: .5, skinning: true }));
    st.frustumCulled = false; par.add(st); st.bind(body.skeleton, body.bindMatrix);
  }

  if (opts.goalie) {
    const wm = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .6, skinning: true });
    const addBox = (w, h, d, cx, cy, cz, bone, mat) => { const bg = new THREE.BoxGeometry(w, h, d); bg.translate(cx, cy, cz); const mm = SK.rigid(bg, bi(bone), mat); mm.frustumCulled = false; par.add(mm); mm.bind(body.skeleton, body.bindMatrix); };
    for (const sd of ['l', 'r']) {
      const th = SK.restP['thigh_' + sd], ca = SK.restP['calf_' + sd], fo = SK.restP['foot_' + sd];
      addBox(0.2, 0.55, 0.3, th.x, (th.y + ca.y) / 2, th.z + 0.08, 'thigh_' + sd, wm);
      addBox(0.2, 0.62, 0.3, ca.x, (ca.y + fo.y) / 2, ca.z + 0.08, 'calf_' + sd, wm);
    }
    const hl = SK.restP.hand_l, hr2 = SK.restP.hand_r;
    addBox(0.26, 0.26, 0.14, hl.x, hl.y, hl.z, 'hand_l', new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(.6), roughness: .6, skinning: true }));
    addBox(0.34, 0.24, 0.07, hr2.x, hr2.y, hr2.z, 'hand_r', wm);
  }
  let m_fd, m_bd;
  // chest / back decals (logo + number front, name + number back), bound to spine_03
  {
    const jv = SK.jv, yc = SK.restP.spine_02.y + (SK.restP.spine_03.y - SK.restP.spine_02.y) * 0.75;
    let zf = -1e9, zb = 1e9; for (let i = 0; i < jv.length; i += 3) if (Math.abs(jv[i]) < 0.2 && Math.abs(jv[i + 1] - yc) < 0.2) { zf = Math.max(zf, jv[i + 2]); zb = Math.min(zb, jv[i + 2]); }
    const mk = (w, h, y, z, flip, tex) => {
      const pg = new THREE.PlaneGeometry(w, h); if (flip) pg.rotateY(Math.PI); pg.translate(0, y, z + (flip ? -0.035 : 0.03));
      const mm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, skinning: true, polygonOffset: true, polygonOffsetFactor: -2 });
      const sm = SK.rigid(pg, bi('spine_03'), mm); sm.frustumCulled = false; par.add(sm); sm.bind(body.skeleton, body.bindMatrix); return sm;
    };
    m_fd = SK.frontTex(p); m_bd = SK.backTex(p);
    mk(0.30, 0.30, yc + 0.03, zf, false, m_fd.tex); mk(0.46, 0.46, yc + 0.0, zb, true, m_bd.tex);
  }
  const m = { real: true, fdec: m_fd, bdec: m_bd, g: new THREE.Group(), root, body, bones, byName: {}, ph: Math.random() * 6, st: { pitch: 0 } };
  bones.forEach(b => m.byName[b.name] = b);
  m.inner = new THREE.Group(); m.inner.scale.setScalar(SK.S); m.inner.add(root); m.g.add(m.inner);
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return m;
};

/* ---------- pose ---------- */
SK._qa = _Q(); SK._qb = _Q(); SK._qc = _Q(); SK._wq = {};
SK.setPose = function (m, pose) {
  // pose[name] = {p: pitch about A (rad, + = top forward), r: roll about F (rad), k: raw offset}
  const W = SK._wq, qa = SK._qa, qb = SK._qb, qc = SK._qc;
  for (const name of SK.order) {
    const b = m.byName[name], pn = SK.parent[name], Wp = pn ? W[pn] : null; const t = pose[name];
    let wq = W[name] || (W[name] = new THREE.Quaternion());
    if (t) {
      qa.setFromAxisAngle(SK.A, t.p || 0); qb.setFromAxisAngle(SK.F, t.r || 0);
      if (t.o === 'rp') wq.copy(qa).multiply(qb).multiply(SK.restW[name]); else wq.copy(qb).multiply(qa).multiply(SK.restW[name]);
      if (Wp) { qc.copy(Wp).invert().multiply(wq); b.quaternion.copy(qc); } else b.quaternion.copy(wq);
    } else {
      // keep rest-local rotation; follow parent
      const lq = SK.restW[name].clone(); if (pn) lq.premultiply(qc.copy(SK.restW[pn]).invert());
      b.quaternion.copy(lq); if (Wp) wq.copy(Wp).multiply(lq); else wq.copy(lq);
    }
  }
};

SK.frontTex = function (p) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), t = new THREE.CanvasTexture(c), lt = isLt(p.team.color);
  const draw = () => {
    x.clearRect(0, 0, 128, 128); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 44px sans-serif';
    if (p.num != null) outlined(x, String(p.num), 64, 100, lt ? '#111' : '#fff', lt ? '#fff' : '#111');
    const lg = img(p.team.icon); t.needsUpdate = true;
    if (lg) { const s2 = Math.min(84 / lg.naturalWidth, 70 / lg.naturalHeight), w = lg.naturalWidth * s2, h = lg.naturalHeight * s2; x.drawImage(lg, 64 - w / 2, 40 - h / 2, w, h); t.needsUpdate = true; return true; }
    return !p.team.icon;
  };
  const o = { tex: t, done: draw() }; o.draw = () => { if (!o.done) o.done = draw(); }; return o;
};
SK.backTex = function (p) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), t = new THREE.CanvasTexture(c), lt = isLt(p.team.color);
  x.textAlign = 'center'; x.textBaseline = 'middle'; const nm = p.name.split(' ').pop().toUpperCase();
  x.font = 'bold ' + (nm.length > 9 ? 19 : nm.length > 7 ? 23 : 28) + 'px sans-serif'; outlined(x, nm, 64, 46, lt ? '#111' : '#fff', lt ? '#fff' : '#111');
  x.font = 'bold 70px sans-serif'; outlined(x, p.num != null ? String(p.num) : '', 64, 98, lt ? '#111' : '#fff', lt ? '#fff' : '#111');
  t.needsUpdate = true; return { tex: t, done: true, draw() { } };
};
