import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('skater3d.js', encoding='utf-8').read()
q = open('skater_pose.js', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:80]
    return txt.replace(a, b, 1)


s = rep(s, "  // stick (bound to right hand)\n  {", "  // stick (bound to right hand)\n  if (!opts.goalie) {", 'stick')
s = rep(s, "color: col.clone().multiplyScalar(.55), roughness: .35, skinning: true }));\n  helm.frustumCulled",
        "color: opts.goalie ? 0xf2f2f2 : col.clone().multiplyScalar(.55), roughness: .35, skinning: true }));\n  helm.frustumCulled", 'helm')
goalie_gear = r"""
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
"""
s = rep(s, "  let m_fd, m_bd;", goalie_gear + "  let m_fd, m_bd;", 'gear')
s = rep(s, "SK.make = function (p, opts) {\n  opts = opts || {};", "SK.make = function (p, opts) {\n  opts = opts || {};", 'noop')

q += """
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
"""
r = rep(r, "function mkReal(p){const m=SK.make(p);", "function mkReal(p){const m=SK.make(p,{goalie:!!p.gl});", 'mkReal')
r = rep(r, "m=(SK.ready&&!p.gl)?mkReal(p):mkSkater(p,!!p.gl)", "m=SK.ready?mkReal(p):mkSkater(p,!!p.gl)", 'meshFor')
r = rep(r, "if(m.real){const sp01=Math.min(1,sp/34);",
        "if(m.real&&p.gl){SK.setPose(m,SK.goaliePose(m,performance.now()/1000));SK.ground(m)}else if(m.real){const sp01=Math.min(1,sp/34);", 'draw')
open('skater3d.js', 'w', encoding='utf-8').write(s)
open('skater_pose.js', 'w', encoding='utf-8').write(q)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
