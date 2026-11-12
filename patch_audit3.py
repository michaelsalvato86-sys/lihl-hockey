import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
# P3: real lane interception, tested along the segment the puck travelled this tick
g = rep(g, "else{const px=puck.x;puck.x+=puck.vx*dt;puck.y+=puck.vy*dt;",
        "else{const px=puck.x,py0=puck.y;puck.x+=puck.vx*dt;puck.y+=puck.vy*dt;"
        "if(puck.target&&puck.last&&!puck.owner){for(const d of onIce(puck.last.team.opp)){if(d.stun>0)continue;const sx=puck.x-px,sy=puck.y-py0,L2=sx*sx+sy*sy||1,tt=clamp(((d.x-px)*sx+(d.y-py0)*sy)/L2,0,1),qx=px+sx*tt,qy=py0+sy*tt;"
        "if(hyp(d.x-qx,d.y-qy)<3.2&&Math.random()<.16+.34*d.def){puck.owner=d;puck.target=null;puck.shot=null;puck.last=d;d.gainT=G.clock;AE(d,'gain');noteT=.9;noteTxt='INTERCEPTED BY '+d.name.split(' ').pop().toUpperCase();break}}}", 'intercept')
# P2: carrier protection, a carrier keeps the puck at least 0.9 s after gaining it
g = rep(g, "AE(bd,'gain');puck.owner=bd;", "AE(bd,'gain');bd.gainT=G.clock;puck.owner=bd;", 'gainT')
g = rep(g, "if(q<4.8&&d.stun<=0){", "if(q<4.8&&d.stun<=0&&Math.abs(G.clock-(c.gainT===undefined?1e9:c.gainT))>.9){", 'hold')
open('game.html', 'w', encoding='utf-8').write(g)

# net: align animation/sfx events with the interpolated (delayed) positions
n = open('net.js', encoding='utf-8').read()
n = rep(n, "    for (const e of m.ev) ev(e);", "    NET.evq = NET.evq || []; for (const e of m.ev) NET.evq.push({ at: now + NET.delay, e });", 'evq push')
n = rep(n, "    const buf = NET.buf; if (!buf.length) return; const rt = performance.now() - NET.delay;",
        "    { const q = NET.evq; if (q && q.length) { const nowt = performance.now(); while (q.length && q[0].at <= nowt) ev(q.shift().e); } }\n    const buf = NET.buf; if (!buf.length) return; const rt = performance.now() - NET.delay;", 'evq pop')
open('net.js', 'w', encoding='utf-8').write(n)

# mobile/desktop: far fewer 6.8 MB ice texture uploads
r = open('r3d.js', encoding='utf-8').read()
r = rep(r, "if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;", "if((R.fr++%(MOBILE?36:15))===0&&R.iceTex)R.iceTex.needsUpdate=true;", 'ice')
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
