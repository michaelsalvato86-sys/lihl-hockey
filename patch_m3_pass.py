import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
g=rep(g,"startAct(p,'pass',.035,{nx,ny})","startAct(p,'pass',.12,{nx,ny})",'pass time')
open('game.html','w',encoding='utf-8').write(g)
r=open('r3d.js',encoding='utf-8').read()
r=rep(r,"(p.act&&p.act.k==='shot'?Math.min(1,1-p.act.t/p.act.T)*(p.act.T>.2?1:.8):0)","(p.act&&p.act.k==='shot'?Math.min(1,1-p.act.t/p.act.T)*(p.act.T>.2?1:.8):(p.act&&p.act.k==='pass'?Math.min(1,1-p.act.t/p.act.T)*.55:0))",'charge')
open('r3d.js','w',encoding='utf-8').write(r)
n=open('net.js',encoding='utf-8').read()
n=rep(n,"else if (e.k === 'actcancel' || e.k === 'shot' || e.k === 'passwind') q.act = null;","else if (e.k === 'passwind') { const T = (e.d && e.d.t) || .12; q.act = { k: 'pass', t: T, T }; } else if (e.k === 'actcancel' || e.k === 'shot' || e.k === 'pass') q.act = null;",'net')
open('net.js','w',encoding='utf-8').write(n)
print('ok')
