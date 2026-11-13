/* Novelty costumes that live outside skater3d.js (cosmetic only). Wraps SK.make and adds extra skinned geometry to the head.
   Dan Decarolis (Big Pimps) wears the giant pink pimp hat from the Big Pimps logo: fuzzy pink brim and crown, leopard-print band. */
(function () {
  if (typeof SK === 'undefined' || !SK.make) return;
  const _make = SK.make;
  SK.addPimpHat = function (body, par) {
    const hc = SK.head.c, hr = (SK.head.top - hc.y) * 0.86 + 0.02, top = SK.head.top, parts = [];
    const add = (g, key) => parts.push({ geo: g, bone: 'Head', key });
    const brim = new THREE.CylinderGeometry(hr * 3.0, hr * 3.0, hr * 0.17, 30); brim.rotateZ(0.08); brim.translate(hc.x, top + hr * 0.0, hc.z); add(brim, 'pink');
    const lip = new THREE.TorusGeometry(hr * 3.0, hr * 0.11, 8, 36); lip.rotateX(Math.PI / 2); lip.rotateZ(0.08); lip.translate(hc.x, top + hr * 0.0, hc.z); add(lip, 'fluff');
    const crown = new THREE.CylinderGeometry(hr * 1.45, hr * 1.7, hr * 1.9, 26); crown.translate(hc.x, top + hr * 0.0 + hr * 0.95, hc.z); add(crown, 'pink');
    const cap = new THREE.CylinderGeometry(hr * 1.1, hr * 1.4, hr * 0.22, 26); cap.translate(hc.x, top + hr * 0.0 + hr * 1.98, hc.z); add(cap, 'fluff');
    const dent = new THREE.CylinderGeometry(hr * 0.8, hr * 0.8, hr * 0.1, 20); dent.translate(hc.x, top + hr * 0.0 + hr * 2.06, hc.z); add(dent, 'pinkDark');
    const band = new THREE.CylinderGeometry(hr * 1.7, hr * 1.76, hr * 0.42, 26); band.translate(hc.x, top + hr * 0.0 + hr * 0.4, hc.z); add(band, 'band');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, sp = new THREE.SphereGeometry(hr * 0.17, 6, 5); sp.scale(1, 0.8, 0.4);
      sp.rotateY(-a); sp.translate(hc.x + Math.cos(a) * hr * 1.79, top + hr * 0.0 + hr * (0.4 + (i % 2 ? 0.07 : -0.07)), hc.z + Math.sin(a) * hr * 1.79); add(sp, 'spot');
    }
    const M = SK.mergeParts(parts), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(M.P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(M.N, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(M.SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(M.SW, 4)); g.setIndex(new THREE.BufferAttribute(M.I, 1));
    const cols = { pink: new THREE.Color(0xff4aa8), pinkDark: new THREE.Color(0xd62a82), fluff: new THREE.Color(0xff8cc8), band: new THREE.Color(0x1a1216), spot: new THREE.Color(0xd9a15b) }, ca = new Float32Array(M.K.length * 3);
    for (let k = 0; k < M.K.length; k++) { const c = cols[M.keys[M.K[k]]] || cols.pink; ca[k * 3] = c.r; ca[k * 3 + 1] = c.g; ca[k * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, skinning: true, side: THREE.DoubleSide })); mesh.frustumCulled = false; par.add(mesh); mesh.bind(body.skeleton, body.bindMatrix);
  };
  SK.make = function (p, opts) {
    const m = _make.call(this, p, opts);
    try { if (m && m.real && m.body && !(opts && opts.goalie) && /^dan decarolis$/i.test((p && p.name) || '')) SK.addPimpHat(m.body, m.body.parent); } catch (e) { }
    return m;
  };

/* ---------- Showman Ref: a loud 1980s pro-wrestler parody referee (cosmetic only, client-side render object, no real person). Hat, bandana, wraparound shades, mullet, fringed tie-dye jacket over referee stripes. Exactly 3 draw calls: body, cloth, costume. ---------- */
SK.makeShowman = function (p) {
  const m = SK.make(p, {}), body = m.body, par = body.parent, T = THREE;
  const hc = SK.head.c, hr = (SK.head.top - hc.y) * 0.86 + 0.02, top = SK.head.top, fz = hc.z + hr * 0.98, parts = [], P = SK.restP;
  const add = (g, bone, key) => parts.push({ geo: g, bone, key });
  const box = (w, h, d, x, y, z, ry, rz, bone, key) => { const g = new T.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); add(g, bone, key); };
  const blob = (rx, ry, rz, x, y, z, bone, key) => { const g = new T.SphereGeometry(1, 10, 8); g.scale(rx, ry, rz); g.translate(x, y, z); add(g, bone, key); };
  /* wide cowboy hat: brim curled up at the sides */
  const brim = new T.CylinderGeometry(hr * 2.7, hr * 2.7, hr * 0.1, 32, 1), bp = brim.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i); bp.setY(i, bp.getY(i) + (x * x * 1.1 - z * z * 0.25) / (hr * 2.7) * 0.22); }
  brim.translate(hc.x, top + hr * 0.05, hc.z); add(brim, 'Head', 'hat');
  const crown = new T.CylinderGeometry(hr * 1.2, hr * 1.5, hr * 1.5, 24); crown.translate(hc.x, top + hr * 0.85, hc.z); add(crown, 'Head', 'hat');
  const dent = new T.CylinderGeometry(hr * 0.5, hr * 0.9, hr * 0.2, 16); dent.translate(hc.x, top + hr * 1.55, hc.z); add(dent, 'Head', 'hatDark');
  const hb = new T.CylinderGeometry(hr * 1.53, hr * 1.57, hr * 0.34, 24); hb.translate(hc.x, top + hr * 0.38, hc.z); add(hb, 'Head', 'band');
  box(hr * 0.2, hr * 1.5, hr * 0.5, hc.x + hr * 1.5, top + hr * 1.0, hc.z, 0, -0.45, 'Head', 'feather');
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; blob(hr * 0.13, hr * 0.13, hr * 0.13, hc.x + Math.cos(a) * hr * 1.6, top + hr * 0.38, hc.z + Math.sin(a) * hr * 1.6, 'Head', 'stud'); }
  /* bandana under the hat, knot and tails at the back */
  const bd = new T.CylinderGeometry(hr * 1.06, hr * 1.1, hr * 0.5, 20, 1, true); bd.translate(hc.x, hc.y + hr * 0.62, hc.z); add(bd, 'Head', 'bandana');
  blob(hr * 0.3, hr * 0.3, hr * 0.3, hc.x, hc.y + hr * 0.6, hc.z - hr * 1.1, 'Head', 'bandana');
  box(hr * 0.22, hr * 0.8, hr * 0.06, hc.x - hr * 0.2, hc.y + hr * 0.1, hc.z - hr * 1.15, 0, 0.25, 'Head', 'bandana'); box(hr * 0.22, hr * 0.7, hr * 0.06, hc.x + hr * 0.25, hc.y + hr * 0.15, hc.z - hr * 1.15, 0, -0.3, 'Head', 'bandana');
  /* big wraparound shades */
  const sy = hc.y + hr * 0.05;
  for (const s of [-1, 1]) {
    box(hr * 0.98, hr * 0.5, hr * 0.12, hc.x + s * hr * 0.52, sy, fz, 0, 0, 'Head', 'lens');
    box(hr * 0.8, hr * 0.46, hr * 0.1, hc.x + s * hr * 1.02, sy, fz - hr * 0.42, s * -1.0, 0, 'Head', 'lens');
    box(hr * 0.07, hr * 0.07, hr * 1.1, hc.x + s * hr * 1.22, sy + hr * 0.15, hc.z - hr * 0.15, 0, 0, 'Head', 'frame');
  }
  box(hr * 2.2, hr * 0.12, hr * 0.16, hc.x, sy + hr * 0.3, fz, 0, 0, 'Head', 'frame'); box(hr * 0.26, hr * 0.14, hr * 0.14, hc.x, sy + hr * 0.05, fz, 0, 0, 'Head', 'frame');
  box(hr * 0.95, hr * 0.17, hr * 0.1, hc.x, hc.y - hr * 0.55, fz - hr * 0.02, 0, 0, 'Head', 'teeth');
  /* blond mullet */
  blob(hr * 0.95, hr * 1.35, hr * 0.5, hc.x, hc.y - hr * 0.35, hc.z - hr * 0.9, 'Head', 'hair'); blob(hr * 0.3, hr * 0.7, hr * 0.4, hc.x - hr * 1.0, hc.y + hr * 0.1, hc.z - hr * 0.2, 'Head', 'hair'); blob(hr * 0.3, hr * 0.7, hr * 0.4, hc.x + hr * 1.0, hc.y + hr * 0.1, hc.z - hr * 0.2, 'Head', 'hair');
  /* popped collar, buckle, sleeve fringe */
  const nk = P.neck_01;
  for (const s of [-1, 1]) box(0.07, 0.16, 0.015, s * 0.085, nk.y - 0.02, nk.z + 0.075, s * 0.4, s * -0.35, 'spine_03', 'collar');
  const b = SK.belt; box(0.15, 0.085, 0.025, 0, b.y, b.zc + b.rz, 0, 0, 'pelvis', 'gold');
  const fr = ['fr1', 'fr2', 'fr3'];
  for (const s of [-1, 1]) for (const seg of [['upperarm', 0.25, 0.45], ['lowerarm', 0.5, 0.68]]) {
    const bn = seg[0] + (s > 0 ? '_l' : '_r');
    for (let i = 0; i < 6; i++) for (const dz of [-0.03, 0.03]) box(0.014, 0.13, 0.014, s * (seg[1] + (seg[2] - seg[1]) * i / 5), 1.455 - 0.075, -0.065 + dz, 0, 0, bn, fr[(i + (dz > 0 ? 1 : 0)) % 3]);
  }
  const Mg = SK.mergeParts(parts), g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(Mg.P, 3)); g.setAttribute('normal', new T.BufferAttribute(Mg.N, 3));
  g.setAttribute('skinIndex', new T.BufferAttribute(Mg.SI, 4)); g.setAttribute('skinWeight', new T.BufferAttribute(Mg.SW, 4)); g.setIndex(new T.BufferAttribute(Mg.I, 1));
  const cols = { hat: 0xc98a3c, hatDark: 0x7a4a1c, band: 0xff2fd0, feather: 0x2de2ff, stud: 0xfff200, bandana: 0xe0102a, lens: 0x120a2e, frame: 0xfff200, teeth: 0xffffff, hair: 0xffd23c, collar: 0xff7a00, gold: 0xffd700, fr1: 0xff2d95, fr2: 0x2de2ff, fr3: 0xfff200 }, ca = new Float32Array(Mg.K.length * 3), cc = new T.Color();
  for (let k = 0; k < Mg.K.length; k++) { cc.set(cols[Mg.keys[Mg.K[k]]] || 0xffffff); ca[k * 3] = cc.r; ca[k * 3 + 1] = cc.g; ca[k * 3 + 2] = cc.b; }
  g.setAttribute('color', new T.BufferAttribute(ca, 3));
  const cos = new T.SkinnedMesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, skinning: true, side: T.DoubleSide })); cos.frustumCulled = false; par.add(cos); cos.bind(body.skeleton, body.bindMatrix);
  /* cloth recoloured: tie-dye jacket, open front and hem showing black/white referee stripes, black trousers */
  let cloth = null; par.traverse(o => { if (o.isSkinnedMesh && o.geometry.attributes.position === SK.cloth.position) cloth = o; });
  if (cloth) {
    const pos = SK.cloth.position, col = cloth.geometry.attributes.color.array, pal = [0xff2d95, 0x2de2ff, 0xfff200, 0x7dff2d, 0xa020ff, 0xff7a00], pelY = P.pelvis.y, hemY = P.spine_02.y;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y < pelY - 0.02) cc.set(0x15171c);
      else if (y < hemY || (Math.abs(x) < 0.13 && z > P.spine_02.z + 0.02 && y < P.neck_01.y - 0.03)) cc.set(Math.floor(x / 0.035 + 100) % 2 ? 0x111111 : 0xf6f6f6);
      else { const t = Math.sin(x * 16 + Math.sin(y * 11) * 2.2) + Math.sin(y * 13 + z * 17) + Math.sin((x + z) * 9 - y * 7); cc.set(pal[((Math.floor((t + 3) * 1.1) % 6) + 6) % 6]); }
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    cloth.geometry.attributes.color.needsUpdate = true;
  }
  /* hide everything else (eyes, gear, decal, stick, blob): the ref costs body + cloth + costume = 3 draw calls */
  m.wrench = true; /* hides the stick meshes (anim_ctrl toggles them from this flag) */
  m.keep = [body, cloth, cos]; m.g.traverse(o => { if ((o.isMesh || o.isSprite) && m.keep.indexOf(o) < 0) o.visible = false; });
  return m;
};
})();
