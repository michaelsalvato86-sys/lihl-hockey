import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
g=rep(g,"ang+=(Math.random()-.5)*((1-p.shot)*.5+dg/260)*(1.25-.5*(1-pw))*(hum?.42:dkf(p.team,'shot'))*(1+(1-(p.st===undefined?1:p.st))*.5);const sp=(80+70*p.shot)*(.62+.45*pw);",
 "const kd0=pw>.85?'slap':pw<.6?'snap':'wrist',km=kd0==='snap'?{e:.78,s:.9}:kd0==='slap'?{e:1.25,s:1.1}:{e:1,s:1},bh=Math.cos(p.fa-toG)<-.15?{e:1.25,s:.78}:{e:1,s:1};ang+=(Math.random()-.5)*((1-p.shot)*.5+dg/260)*(1.25-.5*(1-pw))*(hum?.42:dkf(p.team,'shot'))*(1+(1-(p.st===undefined?1:p.st))*.5)*km.e*bh.e;const sp=(80+70*p.shot)*(.62+.45*pw)*km.s*bh.s;",'kinds')
# stick/puck connection: the puck rides on the blade with a springy lag and a stickhandling sway instead of snapping to a fixed point
g=rep(g,"puck.x=o.x+Math.cos(o.fa)*4;puck.y=o.y+Math.sin(o.fa)*4;puck.vx=o.vx;puck.vy=o.vy;",
 "{const sw=Math.sin(G.clock*7+(o.slot||0))*Math.min(1.2,hyp(o.vx,o.vy)/28),tx=o.x+Math.cos(o.fa)*4-Math.sin(o.fa)*sw,ty=o.y+Math.sin(o.fa)*4+Math.cos(o.fa)*sw,k=Math.min(1,dt*26);if(hyp(tx-puck.x,ty-puck.y)>9){puck.x=tx;puck.y=ty}else{puck.x+=(tx-puck.x)*k;puck.y+=(ty-puck.y)*k}}puck.vx=o.vx;puck.vy=o.vy;",'carry')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
