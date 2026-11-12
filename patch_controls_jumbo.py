import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:100]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
# faster wind-ups so shooting and passing stay instant-feeling
g = rep(g, "startAct(p,'shot',pw>.85?.26:pw<.6?.09:.14,", "startAct(p,'shot',pw>.85?.17:pw<.6?.06:.09,", 'shot times')
g = rep(g, "startAct(p,'pass',.07,{nx,ny})", "startAct(p,'pass',.035,{nx,ny})", 'pass time')
# the player you control keeps the original snappy turning; only computer players get the standstill cap
g = rep(g, "(2.5+11*Math.max(0,1-sp/mx))*ag,7.5)", "(2.5+11*Math.max(0,1-sp/mx))*ag,p.isCtl?14:7.5)", 'turn cap')
# calmer control selection: stay on your current player unless another is clearly better
g = rep(g, "function swS(q){const dx=puck.x-q.x,dy=puck.y-q.y,d=hyp(dx,dy)||1;return d-.35*(q.vx*dx+q.vy*dy)/d+(q.box?99:0)}",
        "function swS(q){const dx=puck.x-q.x,dy=puck.y-q.y,d=hyp(dx,dy)||1;return d-.12*(q.vx*dx+q.vy*dy)/d+(q.box?99:0)}\nfunction pickCtl(hc,L){let b=null,bs=1e9;for(const q of L){const s=swS(q)+(q===hc.sel?-5:0);if(s<bs){bs=s;b=q}}return b}", 'pickCtl')
g = rep(g, "hc.ctl=hc.sel&&hc.sel.on&&hc.ctlT>0?hc.sel:L.slice().sort((a,b)=>swS(a)-swS(b))[0];", "hc.ctl=hc.sel&&hc.sel.on&&hc.ctlT>0?hc.sel:pickCtl(hc,L);", 'use pickCtl')
open('game.html', 'w', encoding='utf-8').write(g)

# jumbotron hangs over center ice: hide it in every camera except the side broadcast view
r = open('r3d.js', encoding='utf-8').read()
a = "bx(32,16,14,new THREE.MeshBasicMaterial({map:R3.jtex}),0,52,0,sc);bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),-12,68,0,sc);bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),12,68,0,sc);"
assert r.count(a) == 1
r = r.replace(a, "R3.jbs=[bx(32,16,14,new THREE.MeshBasicMaterial({map:R3.jtex}),0,52,0,sc),bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),-12,68,0,sc),bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),12,68,0,sc)];", 1)
a = "if(VIEWM!=='s'){const ud=myDir();"
assert r.count(a) == 1
r = r.replace(a, "{const vis=VIEWM==='s';if(R.jbs)for(const m of R.jbs)m.visible=vis}if(VIEWM!=='s'){const ud=myDir();", 1)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
