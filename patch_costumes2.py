import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('skater3d.js', encoding='utf-8').read()

# ---------------- kangaroo ----------------
i = s.index("SK.addRoo = function (body, par) {")
j = s.index("\n/* ---------- novelty: Justin", i)
roo = r"""SK.addRoo = function (body, par) {
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
"""
s = s[:i] + roo + s[j:]

# ---------------- pope ----------------
i = s.index("SK.addSaint = function (body, par) {")
j = s.index("SK.wrenchify", i)
pope = r"""SK.addSaint = function (body, par) {
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
  const cape = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); cape.scale(hr * 2.7, hr * 1.7, hr * 2.2); cape.translate(hc.x, hc.y - hr * 1.75, hc.z); parts.push({ geo: cape, bone: 'spine_03', key: 'red' });
  const trim = new THREE.TorusGeometry(1, 0.05, 6, 24); trim.rotateX(Math.PI / 2); trim.scale(hr * 2.7, hr * 2.2, hr * 1); trim.translate(hc.x, hc.y - hr * 1.75, hc.z); parts.push({ geo: trim, bone: 'spine_03', key: 'gold' });
  const M = SK.mergeParts(parts), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(M.P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(M.N, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(M.SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(M.SW, 4)); g.setIndex(new THREE.BufferAttribute(M.I, 1));
  const cols = { gold: new THREE.Color(0xe8b923), halo: new THREE.Color(0xfff2a0), white: new THREE.Color(0xf8f5ee), red: new THREE.Color(0xb3121c) }, ca = new Float32Array(M.K.length * 3);
  for (let k = 0; k < M.K.length; k++) { const c = cols[M.keys[M.K[k]]] || cols.gold; ca[k * 3] = c.r; ca[k * 3 + 1] = c.g; ca[k * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2, emissive: 0x3a2e00, skinning: true, side: THREE.DoubleSide })); mesh.frustumCulled = false; par.add(mesh); mesh.bind(body.skeleton, body.bindMatrix);
};
"""
s = s[:i] + pope + s[j:]

# jersey colours
a = "const pope = p.name === 'Justin Faithfull'; if (pope) { col.set(0xf6f3ec); acc.set(0xe8b923); }"
assert s.count(a) == 1
s = s.replace(a, "const pope = p.name === 'Justin Faithfull', roo = p.name === 'Joe Faithfull'; if (pope) { col.set(0xf8f5ee); acc.set(0xf8f5ee); } if (roo) { col.set(0xb5733a); acc.set(0xf0d9b0); }", 1)
a = "pope ? SK.col('#f6f3ec', 1.1, 0.5) : SK.col(p.team.color, 1.1, 0.5)"
assert s.count(a) == 1
s = s.replace(a, "pope ? SK.col('#f8f5ee', 1.1, 0.5) : roo ? SK.col('#8a5226', 1.1, 0.5) : SK.col(p.team.color, 1.1, 0.5)", 1)
open('skater3d.js', 'w', encoding='utf-8').write(s)
print('costumes ok')
