import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('skater3d.js', encoding='utf-8').read()
q = open('skater_pose.js', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()
g = open('game.html', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:80]
    return txt.replace(a, b, 1)


# ---- skater3d: helmet as a cap, jersey vertex cache, roll sign, decals ----
s = rep(s, "const hc = SK.head.c, hr = (SK.head.top - hc.y) * 1.25 + 0.03;\n  const hg = new THREE.SphereGeometry(hr, 18, 12); hg.scale(1, 0.92, 1.08); hg.translate(hc.x, hc.y + hr * 0.18, hc.z - SK.F.z * 0.0);",
        "const hc = SK.head.c, hr = (SK.head.top - hc.y) * 1.0 + 0.03;\n  const hg = new THREE.SphereGeometry(hr, 18, 12); hg.scale(1, 0.82, 1.02); hg.translate(hc.x, hc.y + hr * 0.3, hc.z - hr * 0.1);", 'helmet')
s = rep(s, "    if (reg[i] === 'jersey') tb.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));",
        "    if (reg[i] === 'jersey') { tb.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))); (SK.jv = SK.jv || []).push(pos.getX(i), pos.getY(i), pos.getZ(i)); }", 'jv')
s = rep(s, "  SK.leftSign = Math.sign", "  SK.leftSign = Math.sign", 'noop') if False else s
s = rep(s, "  const tl = new THREE.TextureLoader();", "  SK.rollLeft = (Ld.x < 0) ? 1 : -1; // + roll about F leans the top toward -X\n  const tl = new THREE.TextureLoader();", 'rollLeft')

decals = r"""
  // chest / back decals (logo + number front, name + number back), bound to spine_03
  {
    const jv = SK.jv, yc = SK.restP.spine_02.y + (SK.restP.spine_03.y - SK.restP.spine_02.y) * 0.75;
    let zf = -1e9, zb = 1e9; for (let i = 0; i < jv.length; i += 3) if (Math.abs(jv[i]) < 0.14 && Math.abs(jv[i + 1] - yc) < 0.09) { zf = Math.max(zf, jv[i + 2]); zb = Math.min(zb, jv[i + 2]); }
    const mk = (w, h, y, z, flip, tex) => {
      const pg = new THREE.PlaneGeometry(w, h); if (flip) pg.rotateY(Math.PI); pg.translate(0, y, z + (flip ? -0.006 : 0.006));
      const mm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, skinning: true, polygonOffset: true, polygonOffsetFactor: -2 });
      const sm = SK.rigid(pg, bi('spine_03'), mm); sm.frustumCulled = false; par.add(sm); sm.bind(body.skeleton, body.bindMatrix); return sm;
    };
    m_fd = SK.frontTex(p); m_bd = SK.backTex(p);
    mk(0.28, 0.28, yc + 0.02, zf, false, m_fd.tex); mk(0.34, 0.34, yc + 0.02, zb, true, m_bd.tex);
  }
"""
s = rep(s, "  const m = { real: true,", "  let m_fd, m_bd;" + decals + "  const m = { real: true, fdec: m_fd, bdec: m_bd,", 'make m')
s += r"""
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
  x.font = 'bold ' + (nm.length > 9 ? 17 : nm.length > 7 ? 21 : 26) + 'px sans-serif'; outlined(x, nm, 64, 22, lt ? '#111' : '#fff', lt ? '#fff' : '#111');
  x.font = 'bold 78px sans-serif'; outlined(x, p.num != null ? String(p.num) : '', 64, 78, lt ? '#111' : '#fff', lt ? '#fff' : '#111');
  t.needsUpdate = true; return { tex: t, done: true, draw() { } };
};
"""
q = rep(q, "pelvis: { p: .15 + .1 * sp, r: lean * .35 }, spine_01: { p: .26 + .1 * sp, r: lean * .3 }, spine_02: { p: .32 + .1 * sp, r: lean * .3 }, spine_03: { p: .36 + .1 * sp, r: lean * .3 },",
        "pelvis: { p: .15 + .1 * sp, r: SK.rollLeft * lean * .35 }, spine_01: { p: .26 + .1 * sp, r: SK.rollLeft * lean * .3 }, spine_02: { p: .32 + .1 * sp, r: SK.rollLeft * lean * .3 }, spine_03: { p: .36 + .1 * sp, r: SK.rollLeft * lean * .3 },", 'lean')

# ---- r3d: real skater path ----
r = rep(r, "function meshFor(p){let m=R3.meshes.get(p);if(!m){m=mkSkater(p,!!p.gl);R3.meshes.set(p,m)}if(!m.front.done)m.front.draw();",
        "function mkReal(p){const m=SK.make(p);R3.sc.add(m.g);m.inner.rotation.y=Math.PI/2;\n const bd=new THREE.Mesh(new THREE.CircleGeometry(2.6,16),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3}));bd.rotation.x=-Math.PI/2;bd.position.y=.04;m.g.add(bd);\n const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));sp.position.set(0,9.7,0);sp.scale.set(4.6,5.75,1);m.g.add(sp);m.badge=sp;m.done=false;\n m.front={done:true,draw(){}};m.legs=[];m.arms=[];m.body={rotation:{x:0,z:0},position:{y:0}};return m}\nfunction meshFor(p){let m=R3.meshes.get(p);if(!m){m=(SK.ready&&!p.gl)?mkReal(p):mkSkater(p,!!p.gl);R3.meshes.set(p,m)}if(!m.front.done)m.front.draw();if(m.fdec)m.fdec.draw();", 'meshFor')
r = rep(r, "if(p.gl)m.body.position.y=-.3+Math.sin(performance.now()/400)*.08;",
        "if(p.gl)m.body.position.y=-.3+Math.sin(performance.now()/400)*.08;\n  if(m.real){const sp01=Math.min(1,sp/34);m.rph=(m.rph||0)+sp*dt*.16;const ln=-clamp((p.turn||0)*.07*Math.min(1,sp/20),-.55,.55);m.lean=(m.lean||0)+(ln-(m.lean||0))*Math.min(1,dt*8);SK.setPose(m,SK.skatePose(m,m.rph,sp01,m.lean));SK.ground(m)}", 'draw real')
open('skater3d.js', 'w', encoding='utf-8').write(s)
open('skater_pose.js', 'w', encoding='utf-8').write(q)

# ---- game.html: scripts + start gating ----
g = rep(g, '<script src="r3d.js"></script>',
        '<script src="lib/GLTFLoader.js"></script><script src="lib/SkeletonUtils.js"></script><script src="skater3d.js"></script><script src="skater_pose.js"></script><script src="r3d.js"></script>', 'scripts')
g = rep(g, "addEventListener('load',()=>{if(typeof init3D==='function')init3D()});",
        "addEventListener('load',()=>{if(typeof init3D==='function')init3D();if(THREE_OK&&typeof SK!=='undefined'&&!qs.get('procedural')){const b=$('go');b.disabled=true;b.textContent='LOADING PLAYERS...';SK.load(()=>{b.disabled=false;b.textContent='START';if(qs.get('auto'))b.click()})}else if(qs.get('auto'))$('go').click()});", 'gating')
g = rep(g, "if(qs.get('auto')){$('mc').value='n';$('go').click()}", "if(qs.get('auto')){$('mc').value='n'}", 'auto')
open('game.html', 'w', encoding='utf-8').write(g)
print('ok')
