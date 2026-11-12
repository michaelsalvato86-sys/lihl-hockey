import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('skater3d.js', encoding='utf-8').read()


def rep(a, b, tag):
    global s
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    s = s.replace(a, b, 1)


# setPose: yaw (about U) and direct world quaternion control
rep("""    if (t) {
      qa.setFromAxisAngle(SK.A, t.p || 0); qb.setFromAxisAngle(SK.F, t.r || 0);
      if (t.o === 'rp') wq.copy(qa).multiply(qb).multiply(SK.restW[name]); else wq.copy(qb).multiply(qa).multiply(SK.restW[name]);""",
    """    if (t) {
      if (t.q) wq.copy(t.q);
      else {
        qa.setFromAxisAngle(SK.A, t.p || 0); qb.setFromAxisAngle(SK.F, t.r || 0);
        if (t.o === 'rp') wq.copy(qa).multiply(qb).multiply(SK.restW[name]); else wq.copy(qb).multiply(qa).multiply(SK.restW[name]);
        if (t.y) { qc.setFromAxisAngle(SK.U, t.y); wq.premultiply(qc); }
      }""", 'setPose')
# stick is now a free object driven by both hands (anim_rig.js): remove it from the skinned gear for skaters
a0 = s.index("  if (!goalie) {\n    // stick: thick shaft")
a1 = s.index("  } else {\n    for (const sd of ['l', 'r']) {", a0)
s = s[:a0] + "  if (!goalie) {\n    // (stick is a separate free object, see anim_rig.js)\n" + s[a1:]
rep("  SK.buildRegions(body);\n  SK.gear = {};", "  SK.buildRegions(body);\n  SK.gear = {};\n  if (window.AR) AR.init();\n  if (window.ANIM) ANIM.init();", 'AR.init')
# every skater/goalie gets a free stick object
rep("  m.inner = new THREE.Group(); m.inner.scale.setScalar(SK.S); m.inner.add(root); m.g.add(m.inner);",
    "  m.inner = new THREE.Group(); m.inner.scale.setScalar(SK.S); m.inner.add(root); m.g.add(m.inner);\n  m.goalie = !!opts.goalie; if (window.AR && AR.ready) AR.makeStick(m);", 'stick obj')
open('skater3d.js', 'w', encoding='utf-8').write(s)
print('ok')
