import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:100]
    return s.replace(a, b, 1)


n = open('net.js', encoding='utf-8').read()
# adaptive interpolation buffer: follows the measured snapshot jitter (100 to 230 ms)
n = rep(n, "    const now = performance.now(); NET.buf.push({ rt: now, s: m.s }); if (NET.buf.length > 40) NET.buf.shift();",
        "    const now = performance.now(); NET.buf.push({ rt: now, s: m.s }); if (NET.buf.length > 40) NET.buf.shift();\n    if (NET.lastSnap) { const gp = now - NET.lastSnap; NET.gm = (NET.gm || 33) * .95 + gp * .05; NET.gd = (NET.gd || 5) * .95 + Math.abs(gp - NET.gm) * .05; NET.delay = Math.max(100, Math.min(230, 66 + 4 * NET.gd)); } NET.lastSnap = now;", 'jitter')
n = rep(n, "p.textContent = NET.ping + ' ms'; }", "p.textContent = NET.ping + ' ms \\u00b7 ' + Math.round(NET.fps || 0) + ' fps'; }", 'ui')
n = rep(n, "    const buf = NET.buf; if (!buf.length) return; const rt = performance.now() - NET.delay;",
        "    { const nw = performance.now(); if (NET.fT) NET.fps = (NET.fps || 60) * .92 + (1000 / Math.max(4, nw - NET.fT)) * .08; NET.fT = nw; }\n    const buf = NET.buf; if (!buf.length) return; const rt = performance.now() - NET.delay;", 'fps')
open('net.js', 'w', encoding='utf-8').write(n)

r = open('r3d.js', encoding='utf-8').read()
r = rep(r, " sc.add(new THREE.Points(hg,R3.crowdMat));", " R3.crowdPts=new THREE.Points(hg,R3.crowdMat);sc.add(R3.crowdPts);", 'crowd handle')
a = "function draw3D(dt){const R=R3,all=[];"
assert r.count(a) == 1
r = r.replace(a, a + "{const np=performance.now();if(R.pt){R.pe=(R.pe||16)*.96+(np-R.pt)*.04}R.pt=np;if((R.pf=(R.pf||0)+1)%90===0&&R.pe){const lv=R.pe>36?2:R.pe>25?1:(R.pe<19?0:(R.pl||0));if(lv!==R.pl){R.pl=lv;const base=Math.min(devicePixelRatio||1,MOBILE?1.25:2),pr=lv===2?.75:lv===1?Math.min(base,1):base;R.r.setPixelRatio(pr);R.r.setSize(innerWidth,innerHeight,false);if(R.crowdPts)R.crowdPts.visible=lv===0}}}", 1)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
