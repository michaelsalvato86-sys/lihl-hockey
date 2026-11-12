/* Real-model skater for LIHL Hockey.
   Model: Quaternius "Universal Base Characters" (CC0). Skeleton is driven by ABSOLUTE world orientations
   (pitch/roll about the model's own forward axis). Clothing and gear are built from the body mesh itself (same skin
   weights) and MERGED into few draw calls: body + clothing + gear + decals (+ eyes on desktop). */
const SK = { ready: false, failed: false, S: 3.28 /* metres -> game feet */ };
const _V = () => new THREE.Vector3(), _Q = () => new THREE.Quaternion();
SK.mobile = () => (typeof MOBILE !== 'undefined' && MOBILE);

SK.load = function (cb) {
  try {
    new THREE.GLTFLoader().load('models/Superhero_Male_FullBody.gltf', g => {
      try { SK.init(g); SK.ready = true; } catch (e) { console.log('SK init failed', e); SK.failed = true; }
      if (cb) cb();
    }, undefined, e => { console.log('SK load failed', e); SK.failed = true; if (cb) cb(); });
  } catch (e) { console.log('SK loader missing', e); SK.failed = true; if (cb) cb(); }
};

SK.init = function (g) {
  const sc = g.scene; SK.tpl = sc; sc.updateMatrixWorld(true);
  let body = null; sc.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  SK.body = body; const bones = body.skeleton.bones; SK.names = bones.map(b => b.name);
  const wq = n => { const q = _Q(); const ch = []; for (let o = n; o && o !== sc; o = o.parent) ch.push(o); for (let i = ch.length - 1; i >= 0; i--) q.multiply(ch[i].quaternion); return q; };
  SK.restW = {}; SK.restP = {}; SK.parent = {};
  bones.forEach(b => { SK.restW[b.name] = wq(b); const v = _V(); b.getWorldPosition(v); SK.restP[b.name] = v; SK.parent[b.name] = (b.parent && b.parent.isBone) ? b.parent.name : null; });
  SK.U = new THREE.Vector3(0, 1, 0);
  const F = SK.restP.ball_l.clone().sub(SK.restP.foot_l); F.y = 0; F.normalize(); SK.F = F;
  SK.A = new THREE.Vector3().crossVectors(SK.U, F).normalize();
  const order = []; const seen = new Set();
  const visit = b => { if (seen.has(b.name)) return; if (SK.parent[b.name]) visit(bones.find(x => x.name === SK.parent[b.name])); seen.add(b.name); order.push(b.name); };
  bones.forEach(visit); SK.order = order;
  SK.footRestY = Math.min(SK.restP.foot_l.y, SK.restP.foot_r.y);
  const Ld = SK.restP.thigh_l.clone().sub(SK.restP.thigh_r); Ld.y = 0; Ld.normalize(); SK.Ld = Ld;
  const frontal = v => { const w = v.clone(); w.addScaledVector(SK.F, -w.dot(SK.F)); return w.normalize(); };
  const D = new THREE.Vector3(0, -1, 0), armDir = s => frontal(SK.restP['hand_' + s].clone().sub(SK.restP['upperarm_' + s]));
  const signedAng = (v, tgt) => { const c = new THREE.Vector3().crossVectors(v, tgt); return Math.atan2(c.dot(SK.F), v.dot(tgt)); };
  SK.armRoll = { l: signedAng(armDir('l'), D), r: signedAng(armDir('r'), D) };
  SK.abd = { l: D.clone().applyAxisAngle(SK.F, .3).dot(Ld) > 0 ? 1 : -1 }; SK.abd.r = -SK.abd.l;
  SK.rollLeft = (Ld.x < 0) ? 1 : -1;
  const tl = new THREE.TextureLoader(); const lt = f => { const t = tl.load('models/' + f); t.flipY = false; return t; };
  SK.tex = { light: lt('T_Superhero_Male_Ligh.png'), dark: lt('T_Superhero_Male_Dark.png') };
  { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 700; i++) { const v = 100 + Math.random() * 60; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
    SK.fabric = new THREE.CanvasTexture(c); SK.fabric.wrapS = SK.fabric.wrapT = THREE.RepeatWrapping; SK.fabric.repeat.set(10, 10); }
  SK.stick = { L: 1.62, phi0: Math.atan2(0.8, 0.6) }; // metres; stick angle below horizontal at rest (rad)
  SK.buildRegions(body);
  SK.gear = {};
  if (window.AR) AR.init();
  if (window.ANIM) ANIM.init();
  if (window.GOAL) GOAL.init();
};

/* ---------- clothing built from the body skin weights, merged into ONE geometry ---------- */
SK.regionOf = function (name) {
  if (/^(spine_0[123]|clavicle_|upperarm_)/.test(name)) return 'jersey';
  if (/^(pelvis|thigh_)/.test(name)) return 'pants';
  if (/^calf_/.test(name)) return 'socks';
  if (/^(hand_|index_|middle_|ring_|pinky_|thumb_)/.test(name)) return 'gloves';
  if (/^(foot_|ball_)/.test(name)) return 'skates';
  return null;
};
SK.buildRegions = function (body) {
  const geo = body.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, uvA = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index.array;
  const bn = body.skeleton.bones, n = pos.count, reg = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const acc = {}; for (let k = 0; k < 4; k++) { const w = sw.array[i * 4 + k]; if (w <= 0) continue; const r = SK.regionOf(bn[si.array[i * 4 + k]].name); if (r) acc[r] = (acc[r] || 0) + w; }
    let best = null, bw = 0.3; for (const r in acc) if (acc[r] > bw) { bw = acc[r]; best = r; } reg[i] = best;
  }
  const off = { jersey: 0.022, pants: 0.02, socks: 0.013, gloves: 0.014, skates: 0.012 }, rid = { jersey: 0, pants: 1, socks: 2, gloves: 3, skates: 4 };
  const P = [], N = [], U = [], SI = [], SW = [], R = [], I = [];
  SK.jv = []; SK.pv = [];
  for (const r of Object.keys(off)) {
    const map = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      if (reg[idx[t]] !== r || reg[idx[t + 1]] !== r || reg[idx[t + 2]] !== r) continue;
      for (let k = 0; k < 3; k++) {
        const v = idx[t + k]; let j = map.get(v);
        if (j === undefined) {
          j = P.length / 3; map.set(v, j);
          P.push(pos.getX(v) + nor.getX(v) * off[r], pos.getY(v) + nor.getY(v) * off[r], pos.getZ(v) + nor.getZ(v) * off[r]); N.push(nor.getX(v), nor.getY(v), nor.getZ(v)); U.push(uvA.getX(v), uvA.getY(v));
          for (let q = 0; q < 4; q++) { SI.push(si.array[v * 4 + q]); SW.push(sw.array[v * 4 + q]); }
          R.push(rid[r]);
          if (r === 'jersey') SK.jv.push(pos.getX(v), pos.getY(v), pos.getZ(v)); else if (r === 'pants') SK.pv.push(pos.getX(v), pos.getY(v), pos.getZ(v));
        }
        I.push(j);
      }
    }
  }
  const C = SK.cloth = {};
  C.position = new THREE.BufferAttribute(new Float32Array(P), 3); C.normal = new THREE.BufferAttribute(new Float32Array(N), 3); C.uv = new THREE.BufferAttribute(new Float32Array(U), 2);
  C.skinIndex = new THREE.BufferAttribute(new Uint16Array(SI), 4); C.skinWeight = new THREE.BufferAttribute(new Float32Array(SW), 4);
  C.index = new THREE.BufferAttribute(new Uint32Array(I), 1); C.rid = new Uint8Array(R);
  const hb = bn.findIndex(b => b.name === 'Head'); let hx = 0, hy = 0, hz = 0, hc = 0, hmaxY = -1e9;
  for (let i = 0; i < n; i++) {
    let w = 0; for (let k = 0; k < 4; k++) if (si.array[i * 4 + k] === hb) w += sw.array[i * 4 + k];
    if (w > 0.6) { hx += pos.getX(i); hy += pos.getY(i); hz += pos.getZ(i); hc++; hmaxY = Math.max(hmaxY, pos.getY(i)); }
  }
  SK.head = { c: new THREE.Vector3(hx / hc, hy / hc, hz / hc), top: hmaxY };
  const jv = SK.jv, yc = SK.restP.spine_02.y + (SK.restP.spine_03.y - SK.restP.spine_02.y) * 0.75;
  let zf = -1e9, zb = 1e9; for (let i = 0; i < jv.length; i += 3) if (Math.abs(jv[i]) < 0.2 && Math.abs(jv[i + 1] - yc) < 0.2) { zf = Math.max(zf, jv[i + 2]); zb = Math.min(zb, jv[i + 2]); }
  SK.dec = { yc, zf, zb };
  let jmin = 1e9, pmax = -1e9; for (let i = 0; i < jv.length; i += 3) jmin = Math.min(jmin, jv[i + 1]); const pv = SK.pv; for (let i = 0; i < pv.length; i += 3) pmax = Math.max(pmax, pv[i + 1]);
  const yw = (jmin + pmax) / 2; let rx = 0, zmin = 1e9, zmax = -1e9;
  for (let i = 0; i < jv.length; i += 3) if (Math.abs(jv[i + 1] - yw) < 0.07) { rx = Math.max(rx, Math.abs(jv[i])); zmin = Math.min(zmin, jv[i + 2]); zmax = Math.max(zmax, jv[i + 2]); }
  for (let i = 0; i < pv.length; i += 3) if (Math.abs(pv[i + 1] - yw) < 0.07) { rx = Math.max(rx, Math.abs(pv[i])); zmin = Math.min(zmin, pv[i + 2]); zmax = Math.max(zmax, pv[i + 2]); }
  SK.belt = { y: yw, rx: rx + 0.035, rz: (zmax - zmin) / 2 + 0.035, zc: (zmax + zmin) / 2 };
};

/* ---------- gear merged into one skinned geometry ---------- */
SK.mergeParts = function (parts) {
  const bn = SK.body.skeleton.bones, P = [], N = [], SI = [], SW = [], K = [], I = [], keys = [];
  for (const pt of parts) {
    const g = pt.geo, p = g.attributes.position, nn = g.attributes.normal, b = bn.findIndex(x => x.name === pt.bone), base = P.length / 3;
    let ki = keys.indexOf(pt.key); if (ki < 0) { ki = keys.length; keys.push(pt.key); }
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nn.getX(i), nn.getY(i), nn.getZ(i)); SI.push(b, 0, 0, 0); SW.push(1, 0, 0, 0); K.push(ki); }
    const ia = g.index ? g.index.array : Array.from({ length: p.count }, (_, k) => k); for (let i = 0; i < ia.length; i++) I.push(ia[i] + base);
  }
  return { P: new Float32Array(P), N: new Float32Array(N), SI: new Uint16Array(SI), SW: new Float32Array(SW), K: new Uint8Array(K), I: new Uint32Array(I), keys };
};
SK.buildGear = function (goalie) {
  const parts = [], hc = SK.head.c, hr = (SK.head.top - hc.y) * 0.86 + 0.02, ang = Math.atan2(SK.F.x, SK.F.z), F = SK.F;
  const add = (geo, bone, key) => parts.push({ geo, bone, key });
  let hg = new THREE.SphereGeometry(hr, 18, 12); hg.scale(1, 0.82, 1.02); hg.translate(hc.x, hc.y + hr * 0.3, hc.z - hr * 0.1); add(hg, 'Head', 'helmet');
  const vg = new THREE.BoxGeometry(goalie ? 0.2 : 0.17, goalie ? 0.17 : 0.06, 0.05); vg.rotateY(ang); vg.translate(hc.x + F.x * hr * 0.86, hc.y + hr * (goalie ? -0.02 : 0.12), hc.z + F.z * hr * 0.86); add(vg, 'Head', goalie ? 'cage' : 'visor');
  for (const sd of ['l', 'r']) {
    const fp = SK.restP['foot_' + sd], bp = SK.restP['ball_' + sd]; const bg = new THREE.BoxGeometry(0.1, 0.05, 0.36); bg.rotateY(ang); bg.translate((fp.x + bp.x) / 2, 0.025, (fp.z + bp.z) / 2); add(bg, 'foot_' + sd, 'blade');
  }
  const b = SK.belt, bgeo = new THREE.CylinderGeometry(1, 1, 0.075, 22); bgeo.scale(b.rx, 1, b.rz); bgeo.translate(0, b.y, b.zc); add(bgeo, 'spine_01', 'belt');
  if (!goalie) {
    // (stick is a separate free object, see anim_rig.js)
  } else {
    for (const sd of ['l', 'r']) {
      const th = SK.restP['thigh_' + sd], ca = SK.restP['calf_' + sd], fo = SK.restP['foot_' + sd];
      let a = new THREE.BoxGeometry(0.22, 0.58, 0.32); a.translate(th.x, (th.y + ca.y) / 2, th.z + 0.08); add(a, 'thigh_' + sd, 'pad');
      a = new THREE.BoxGeometry(0.23, 0.66, 0.34); a.translate(ca.x, (ca.y + fo.y) / 2, ca.z + 0.08); add(a, 'calf_' + sd, 'pad');
      a = new THREE.BoxGeometry(0.235, 0.06, 0.345); a.translate(ca.x, (ca.y + fo.y) / 2 + 0.18, ca.z + 0.08); add(a, 'calf_' + sd, 'padStripe');
      a = new THREE.BoxGeometry(0.235, 0.06, 0.345); a.translate(ca.x, (ca.y + fo.y) / 2 - 0.18, ca.z + 0.08); add(a, 'calf_' + sd, 'padStripe');
      a = new THREE.BoxGeometry(0.225, 0.06, 0.325); a.translate(th.x, (th.y + ca.y) / 2 + 0.1, th.z + 0.08); add(a, 'thigh_' + sd, 'padStripe');
    }
    const hl = SK.restP.hand_l, hr2 = SK.restP.hand_r;
    let a = new THREE.BoxGeometry(0.3, 0.3, 0.14); a.translate(hl.x, hl.y, hl.z); add(a, 'hand_l', 'glove');
    a = new THREE.BoxGeometry(0.38, 0.26, 0.07); a.translate(hr2.x, hr2.y, hr2.z); add(a, 'hand_r', 'blocker');
    a = new THREE.BoxGeometry(0.38, 0.05, 0.075); a.translate(hr2.x, hr2.y + 0.13, hr2.z); add(a, 'hand_r', 'padStripe');
  }
  const m = SK.mergeParts(parts);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.N, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(m.SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(m.SW, 4)); g.setIndex(new THREE.BufferAttribute(m.I, 1));
  return { g, K: m.K, keys: m.keys };
};
SK.buildDecalGeo = function () {
  const d = SK.dec, P = [], N = [], U = [], SI = [], SW = [], I = [], bi = SK.body.skeleton.bones.findIndex(b => b.name === 'spine_03');
  const quad = (w, h, y, z, flip, u0, u1) => {
    const base = P.length / 3, hw = w / 2, hh = h / 2, s = flip ? -1 : 1;
    [[-hw * s, -hh, u0, 0], [hw * s, -hh, u1, 0], [hw * s, hh, u1, 1], [-hw * s, hh, u0, 1]].forEach(v => { P.push(v[0], y + v[1], z); N.push(0, 0, flip ? -1 : 1); U.push(v[2], v[3]); SI.push(bi, 0, 0, 0); SW.push(1, 0, 0, 0); });
    if (flip) I.push(base, base + 2, base + 1, base, base + 3, base + 2); else I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  quad(0.38, 0.38, d.yc + 0.03, d.zf + 0.03, false, 0, 0.5); quad(0.56, 0.56, d.yc, d.zb - 0.035, true, 0.5, 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(U), 2)); g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(SI), 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(SW), 4)); g.setIndex(I);
  return g;
};
SK.decalTex = function (p) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), t = new THREE.CanvasTexture(c), lt = isLt(p.team.color), tc = lt ? '#111' : '#fff', oc = lt ? '#fff' : '#000';
  t.anisotropy = 4;
  const draw = () => {
    x.clearRect(0, 0, 256, 128); x.textAlign = 'center'; x.textBaseline = 'middle';
    const lg = img(p.team.icon);
    if (lg) { const s2 = Math.min(104 / lg.naturalWidth, 72 / lg.naturalHeight), w = lg.naturalWidth * s2, h = lg.naturalHeight * s2; x.save(); x.shadowColor = lt ? '#ffffff' : '#000000'; x.shadowBlur = 12; x.drawImage(lg, 64 - w / 2, 36 - h / 2, w, h); x.drawImage(lg, 64 - w / 2, 36 - h / 2, w, h); x.restore(); }
    x.font = 'bold 56px sans-serif'; if (p.num != null) outlined(x, String(p.num), 64, 101, tc, oc);
    const nm = p.name.split(' ').pop().toUpperCase();
    x.font = 'bold ' + (nm.length > 9 ? 22 : nm.length > 7 ? 27 : 33) + 'px sans-serif'; outlined(x, nm, 192, 28, tc, oc);
    x.font = 'bold 86px sans-serif'; if (p.num != null) outlined(x, String(p.num), 192, 90, tc, oc);
    t.needsUpdate = true; return !!lg || !p.team.icon;
  };
  const o = { tex: t, done: draw() }; o.draw = () => { if (!o.done) o.done = draw(); }; return o;
};

/* ---------- build one skater ---------- */
SK.col = function (hex, s, l) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, Math.min(1, h.s * s), Math.min(0.92, h.l * l)); return c; };
SK.make = function (p, opts) {
  opts = opts || {}; const MOB = SK.mobile();
  const root = THREE.SkeletonUtils.clone(SK.tpl); let body = null;
  root.traverse(o => { if (o.isSkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
  if (MOB) root.traverse(o => { if (o.isSkinnedMesh && o !== body) o.visible = false; });
  const par = body.parent;
  const col = SK.col(p.team.color, 1.18, 1.0), acc = new THREE.Color(accOf(p)), dark = new THREE.Color(0x11151c);
  const pope = p.name === 'Justin Faithfull', roo = p.name === 'Joe Faithfull'; if (pope) { col.set(0xf8f5ee); acc.set(0xf8f5ee); } if (roo) { col.set(0xb5733a); acc.set(0xf0d9b0); }
  const tone = ((((p.id | 0) * 2654435761) >>> 0)) % 3;
  const bodyMat = body.material.clone(); if (SK.tex) bodyMat.map = SK.tex[tone === 0 ? 'light' : 'dark'] || bodyMat.map; if (tone === 2) bodyMat.color = new THREE.Color(0xd8b08f);
  body.material = bodyMat;
  const C = SK.cloth, cg = new THREE.BufferGeometry();
  cg.setAttribute('position', C.position); cg.setAttribute('normal', C.normal); cg.setAttribute('uv', C.uv); cg.setAttribute('skinIndex', C.skinIndex); cg.setAttribute('skinWeight', C.skinWeight); cg.setIndex(C.index);
  const table = [col, pope ? SK.col('#f8f5ee', 1.1, 0.5) : roo ? SK.col('#8a5226', 1.1, 0.5) : SK.col(p.team.color, 1.1, 0.5), acc, acc, dark], ca = new Float32Array(C.rid.length * 3);
  for (let i = 0; i < C.rid.length; i++) { const c = table[C.rid[i]]; ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
  cg.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  const cmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, skinning: true });
  if (!MOB) { cmat.bumpMap = SK.fabric; cmat.bumpScale = 0.018; }
  const cloth = new THREE.SkinnedMesh(cg, cmat); cloth.frustumCulled = false; par.add(cloth); cloth.bind(body.skeleton, body.bindMatrix);
  const gk = opts.goalie ? 'g' : 's'; if (!SK.gear[gk]) SK.gear[gk] = SK.buildGear(!!opts.goalie); const G0 = SK.gear[gk];
  const gg = new THREE.BufferGeometry(); ['position', 'normal', 'skinIndex', 'skinWeight'].forEach(k => gg.setAttribute(k, G0.g.attributes[k])); gg.setIndex(G0.g.index);
  const gcol = { helmet: opts.goalie ? new THREE.Color(0xf2f2f2) : SK.col(p.team.color, 1.1, 0.55), visor: new THREE.Color(0x1b2330), cage: new THREE.Color(0x20252d), blade: new THREE.Color(0xcfd5dc), stick: new THREE.Color(0x24272e), tape: new THREE.Color(0xf4f4f4), belt: acc, pad: new THREE.Color(0xf4f4f4), padStripe: acc, glove: SK.col(p.team.color, 1.1, 0.65), blocker: new THREE.Color(0xf4f4f4) };
  const ga = new Float32Array(G0.K.length * 3); for (let i = 0; i < G0.K.length; i++) { const c = gcol[G0.keys[G0.K[i]]] || dark; ga[i * 3] = c.r; ga[i * 3 + 1] = c.g; ga[i * 3 + 2] = c.b; }
  gg.setAttribute('color', new THREE.BufferAttribute(ga, 3));
  const gear = new THREE.SkinnedMesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.15, skinning: true })); gear.frustumCulled = false; par.add(gear); gear.bind(body.skeleton, body.bindMatrix);
  if (!SK.decalGeo) SK.decalGeo = SK.buildDecalGeo();
  const dt = SK.decalTex(p);
  const dm = new THREE.SkinnedMesh(SK.decalGeo, new THREE.MeshBasicMaterial({ map: dt.tex, transparent: true, depthWrite: false, skinning: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  dm.frustumCulled = false; par.add(dm); dm.bind(body.skeleton, body.bindMatrix);
  if (!opts.goalie && p.name === 'Joe Faithfull') SK.addRoo(body, par);
  if (!opts.goalie && p.name === 'Justin Faithfull') SK.addSaint(body, par);
  const m = { real: true, fdec: dt, g: new THREE.Group(), root, body, bones: body.skeleton.bones, byName: {}, ph: Math.random() * 6 };
  m.bones.forEach(b => m.byName[b.name] = b);
  m.inner = new THREE.Group(); m.inner.scale.setScalar(SK.S); m.inner.add(root); m.g.add(m.inner);
  m.goalie = !!opts.goalie; if (window.AR && AR.ready) AR.makeStick(m);
  if (!opts.goalie && p.name === 'Raffi Minassian') SK.wrenchify(m);
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return m;
};


/* ---------- novelty costume: kangaroo ears, snout and tail (cosmetic only, rest-pose geometry skinned to the head and hips) ---------- */
SK.addRoo = function (body, par) {
  const hc = SK.head.c, hr = (SK.head.top - hc.y) * 0.86 + 0.02, F = SK.F.clone().normalize(), R = new THREE.Vector3(0, 1, 0).cross(F).normalize(), parts = [];
  const basis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(R.clone(), new THREE.Vector3(0, 1, 0), F.clone()));
  const blob = (rx, ry, rz, pos, rotZ, rotX, bone, key) => {
    const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz);
    const q = basis.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, 0, rotZ)));
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); g.translate(pos.x, pos.y, pos.z); parts.push({ geo: g, bone, key });
  };
  for (const sd of [-1, 1]) {
    const base = new THREE.Vector3(hc.x, hc.y + hr * 1.0, hc.z).addScaledVector(R, sd * hr * 0.62).addScaledVector(F, -hr * 0.05);
    blob(hr * 0.42, hr * 1.55, hr * 0.2, base.clone().add(new THREE.Vector3(0, hr * 1.15, 0)), -sd * 0.28, 0, 'Head', 'roo');
    blob(hr * 0.24, hr * 1.1, hr * 0.12, base.clone().add(new THREE.Vector3(0, hr * 1.1, 0)).addScaledVector(F, hr * 0.12), -sd * 0.28, 0, 'Head', 'rooIn');
  }
  const sn = new THREE.Vector3(hc.x, hc.y - hr * 0.2, hc.z).addScaledVector(F, hr * 1.0);
  blob(hr * 0.62, hr * 0.5, hr * 0.85, sn, 0, 0.18, 'Head', 'roo');
  blob(hr * 0.2, hr * 0.17, hr * 0.17, sn.clone().addScaledVector(F, hr * 0.78).add(new THREE.Vector3(0, hr * 0.14, 0)), 0, 0, 'Head', 'rooNose');
  const b = SK.belt, tb = new THREE.Vector3(0, b.y - 0.06, b.zc).addScaledVector(F, -b.rz * 0.85);
  const tg = new THREE.CylinderGeometry(0.06, 0.17, 0.95, 12); tg.translate(0, 0.475, 0);
  const td = F.clone().multiplyScalar(-1).add(new THREE.Vector3(0, -0.85, 0)).normalize();
  tg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), td))); tg.translate(tb.x, tb.y, tb.z); parts.push({ geo: tg, bone: 'spine_01', key: 'roo' });
  const M = SK.mergeParts(parts), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(M.P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(M.N, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(M.SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(M.SW, 4)); g.setIndex(new THREE.BufferAttribute(M.I, 1));
  const cols = { roo: new THREE.Color(0xb5733a), rooIn: new THREE.Color(0xf2b6a8), rooNose: new THREE.Color(0x1a1010) }, ca = new Float32Array(M.K.length * 3);
  for (let k = 0; k < M.K.length; k++) { const c = cols[M.keys[M.K[k]]] || cols.roo; ca[k * 3] = c.r; ca[k * 3 + 1] = c.g; ca[k * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, skinning: true })); mesh.frustumCulled = false; par.add(mesh); mesh.bind(body.skeleton, body.bindMatrix);
};

/* ---------- novelty: Justin Faithfull = beer pope (mitre + halo), Raffi Minassian = a wrench instead of a body (cosmetic only) ---------- */
SK.addSaint = function (body, par) {
  const hc = SK.head.c, hr = (SK.head.top - hc.y) * 0.86 + 0.02, F = SK.F.clone().normalize(), parts = [], top = SK.head.top;
  const orient = g => { g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.atan2(F.x, F.z))); return g; };
  const band = new THREE.CylinderGeometry(hr * 0.92, hr * 0.92, hr * 0.3, 18); band.translate(hc.x, top + hr * 0.1, hc.z); parts.push({ geo: band, bone: 'Head', key: 'gold' });
  const w = hr * 1.05, h = hr * 3.1, sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.quadraticCurveTo(-w * 1.05, h * 0.62, 0, h); sh.quadraticCurveTo(w * 1.05, h * 0.62, w, 0); sh.lineTo(-w, 0);
  const mg = new THREE.ExtrudeGeometry(sh, { depth: hr * 0.9, bevelEnabled: true, bevelSize: hr * 0.08, bevelThickness: hr * 0.08, bevelSegments: 2, curveSegments: 10 });
  mg.translate(0, 0, -hr * 0.45); orient(mg); mg.translate(hc.x, top + hr * 0.22, hc.z); parts.push({ geo: mg, bone: 'Head', key: 'white' });
  const st = new THREE.BoxGeometry(hr * 0.34, h * 0.78, hr * 1.1); orient(st); st.translate(hc.x, top + hr * 0.25 + h * 0.4, hc.z); parts.push({ geo: st, bone: 'Head', key: 'gold' });
  const cr = new THREE.BoxGeometry(hr * 0.14, hr * 0.62, hr * 1.14); orient(cr); cr.translate(hc.x, top + hr * 0.25 + h * 0.2, hc.z); parts.push({ geo: cr, bone: 'Head', key: 'red' });
  for (const sd of [-1, 1]) { const lp = new THREE.BoxGeometry(hr * 0.28, hr * 1.5, hr * 0.06); lp.translate(sd * hr * 0.35, -hr * 0.6, -hr * 0.95); orient(lp); lp.translate(hc.x, top, hc.z); parts.push({ geo: lp, bone: 'Head', key: 'white' }); }
  const halo = new THREE.TorusGeometry(hr * 1.5, hr * 0.09, 8, 28); halo.rotateX(Math.PI / 2); halo.translate(hc.x, top + hr * 3.7, hc.z); parts.push({ geo: halo, bone: 'Head', key: 'halo' });
  const cape = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); cape.scale(hr * 2.3, hr * 0.95, hr * 1.9); cape.translate(hc.x, hc.y - hr * 1.65, hc.z); parts.push({ geo: cape, bone: 'spine_03', key: 'red' });
  const trim = new THREE.TorusGeometry(1, 0.05, 6, 24); trim.rotateX(Math.PI / 2); trim.scale(hr * 2.3, hr * 1.9, hr * 1); trim.translate(hc.x, hc.y - hr * 1.65, hc.z); parts.push({ geo: trim, bone: 'spine_03', key: 'gold' });
  const M = SK.mergeParts(parts), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(M.P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(M.N, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(M.SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(M.SW, 4)); g.setIndex(new THREE.BufferAttribute(M.I, 1));
  const cols = { gold: new THREE.Color(0xe8b923), halo: new THREE.Color(0xfff2a0), white: new THREE.Color(0xf8f5ee), red: new THREE.Color(0xb3121c) }, ca = new Float32Array(M.K.length * 3);
  for (let k = 0; k < M.K.length; k++) { const c = cols[M.keys[M.K[k]]] || cols.gold; ca[k * 3] = c.r; ca[k * 3 + 1] = c.g; ca[k * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2, emissive: 0x3a2e00, skinning: true, side: THREE.DoubleSide })); mesh.frustumCulled = false; par.add(mesh); mesh.bind(body.skeleton, body.bindMatrix);
};
SK.wrenchify = function (m) {
  m.g.traverse(o => { if (o.isMesh || o.isSkinnedMesh) o.visible = false; });
  // a short combination wrench: open-end jaw on top, 12-point ring on the bottom, satin chrome (reference photo from the league admin)
  const mat = new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.38, metalness: 0.25, emissive: 0x2b323b }), w = new THREE.Group();
  const R = 0.34, cy = 1.5, hw = 0.1, nw = 0.15, ny = cy + 0.06, sh = new THREE.Shape(), pts = [];
  pts.push([hw, 0.45], [hw, cy - Math.sqrt(R * R - hw * hw)]);
  const a0 = Math.asin(hw / R) - Math.PI / 2, a1 = Math.acos(nw / R), a2 = Math.PI - Math.acos(nw / R), a3 = Math.PI + (Math.PI / 2 - Math.asin(hw / R));
  for (let a = -(Math.PI / 2 - Math.asin(hw / R)); a <= a1; a += 0.12) pts.push([R * Math.cos(a), cy + R * Math.sin(a)]);
  pts.push([nw, ny], [-nw, ny]);
  for (let a = a2; a <= Math.PI + (Math.PI / 2 - Math.asin(hw / R)) + 0.001; a += 0.12) pts.push([R * Math.cos(a), cy + R * Math.sin(a)]);
  pts.push([-hw, cy - Math.sqrt(R * R - hw * hw)], [-hw, 0.45]);
  sh.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) sh.lineTo(pts[k][0], pts[k][1]);
  const ext = { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 12 };
  const head = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, ext), mat); head.position.z = -0.05; w.add(head);
  const ring = new THREE.Shape(); ring.absarc(0, 0.34, 0.3, 0, Math.PI * 2, false); const hole = new THREE.Path();
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r = k % 2 ? 0.2 : 0.17; if (k === 0) hole.moveTo(r * Math.cos(a), 0.34 + r * Math.sin(a)); else hole.lineTo(r * Math.cos(a), 0.34 + r * Math.sin(a)); } hole.closePath(); ring.holes.push(hole);
  const rg = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, ext), mat); rg.position.z = -0.05; w.add(rg);
  const F = SK.F.clone().normalize(); w.rotation.y = Math.atan2(F.x, F.z) + Math.PI / 2;
  w.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); m.inner.add(w); m.wrench = w;
};

/* ---------- pose ---------- */
SK._qa = _Q(); SK._qb = _Q(); SK._qc = _Q(); SK._wq = {};
SK.setPose = function (m, pose) {
  const W = SK._wq, qa = SK._qa, qb = SK._qb, qc = SK._qc;
  for (const name of SK.order) {
    const b = m.byName[name], pn = SK.parent[name], Wp = pn ? W[pn] : null; const t = pose[name];
    let wq = W[name] || (W[name] = new THREE.Quaternion());
    if (t && t.c) { const lq = SK.restW[name].clone(); if (pn) lq.premultiply(qc.copy(SK.restW[pn]).invert()); qa.setFromAxisAngle(t.c.v, t.c.a); lq.multiply(qa); b.quaternion.copy(lq); if (Wp) wq.copy(Wp).multiply(lq); else wq.copy(lq); continue; }
    if (t) {
      if (t.q) wq.copy(t.q);
      else {
        qa.setFromAxisAngle(SK.A, t.p || 0); qb.setFromAxisAngle(SK.F, t.r || 0);
        if (t.o === 'rp') wq.copy(qa).multiply(qb).multiply(SK.restW[name]); else wq.copy(qb).multiply(qa).multiply(SK.restW[name]);
        if (t.y) { qc.setFromAxisAngle(SK.U, t.y); wq.premultiply(qc); }
      }
      if (Wp) { qc.copy(Wp).invert().multiply(wq); b.quaternion.copy(qc); } else b.quaternion.copy(wq);
    } else {
      const lq = SK.restW[name].clone(); if (pn) lq.premultiply(qc.copy(SK.restW[pn]).invert());
      b.quaternion.copy(lq); if (Wp) wq.copy(Wp).multiply(lq); else wq.copy(lq);
    }
  }
};
