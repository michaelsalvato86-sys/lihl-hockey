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
})();
