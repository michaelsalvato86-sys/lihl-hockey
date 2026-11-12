import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()

# ---- one-timers: press SHOOT while a pass is on its way to you; the shot fires the moment the puck arrives
g = rep(g, "   if(I.sh){if(puck.owner===p)shoot(p,nx,ny,true,I.pw||.5);else{p.burst=.45}}",
        "   if(I.sh){if(puck.owner===p)shoot(p,nx,ny,true,I.pw||.5);else if(puck.target===p&&hyp(puck.x-p.x,puck.y-p.y)<46){p.oneT=.9;p.oneI={nx,ny,pw:Math.max(.62,I.pw||.5)}}else{p.burst=.45}}", 'onetimer input')
g = rep(g, "AE(bd,'gain');puck.owner=bd;puck.target=null;puck.shot=null;puck.last=bd}",
        "AE(bd,'gain');puck.owner=bd;puck.target=null;puck.shot=null;puck.last=bd;if(bd.oneT>0){const q=bd.oneI||{nx:0,ny:0,pw:.7};bd.oneT=0;shoot(bd,q.nx,q.ny,true,q.pw);puck.vx*=1.12;puck.vy*=1.12;noteT=1;noteTxt='ONE-TIMER!'}}", 'onetimer pickup')
g = rep(g, "p.burst=Math.max(0,p.burst-dt);", "p.burst=Math.max(0,p.burst-dt);p.oneT=Math.max(0,(p.oneT||0)-dt);", 'oneT decay')

# ---- checking: lunge toward the target, power from ratings, carriers do not always lose the puck, fewer cheap penalties
g = rep(g, "   if(I.hit){p.burst=.5;p.hitT=.55}",
        "   if(I.hit){p.burst=.5;p.hitT=.6;{let bt=null,bdist=17;for(const o of onIce(p.team.opp)){const dd=hyp(o.x-p.x,o.y-p.y)-(puck.owner===o?4:0);if(dd<bdist){bdist=dd;bt=o}}if(bt){const dd=hyp(bt.x-p.x,bt.y-p.y)||1;p.vx+=(bt.x-p.x)/dd*12;p.vy+=(bt.y-p.y)/dd*12}}}", 'hit lunge')
g = rep(g, "if(d<4.2){const was=puck.owner===v;const ux=(v.x-h.x)/(d||1),uy=(v.y-h.y)/(d||1);v.vx+=ux*30;v.vy+=uy*30;v.stun=1.1;h.stun=.25;h.hitT=0;if(was){puck.owner=null;",
        "if(d<5.4){const was=puck.owner===v;const ux=(v.x-h.x)/(d||1),uy=(v.y-h.y)/(d||1);const kb=16+24*h.chk-8*v.def;v.vx+=ux*kb;v.vy+=uy*kb;v.stun=.6+.9*h.chk;h.stun=.25;h.hitT=0;if(was&&Math.random()<clamp(.55+.5*(h.chk-v.def),.25,.95)){puck.owner=null;", 'hit core')
g = rep(g, "if(!was&&Math.random()<.3)callPenalty(t,h,'Interference');break}", "if(!was&&Math.random()<.1)callPenalty(t,h,'Interference');break}", 'interference')

# ---- smoother pass release: the puck leaves from the stick instead of jumping 4 ft ahead
i = g.index("function pass(p,ix,iy){")
j = g.index("puck.target=best;", i)
seg = g[i:j]
assert seg.count("puck.x=p.x+Math.cos(a)*4.2;puck.y=p.y+Math.sin(a)*4.2;") == 1
seg = seg.replace("puck.x=p.x+Math.cos(a)*4.2;puck.y=p.y+Math.sin(a)*4.2;", "puck.x=p.x+Math.cos(a)*1.6;puck.y=p.y+Math.sin(a)*1.6;")
g = g[:i] + seg + g[j:]
open('game.html', 'w', encoding='utf-8').write(g)

# ---- crowd: heads sized to the bodies, denser stands
r = open('r3d.js', encoding='utf-8').read()
r = rep(r, "uSize:{value:2.9}", "uSize:{value:2.2}", 'crowd size')
r = rep(r, "for(let j=0;j<(MOBILE?4:9);j++){const t=j/(MOBILE?4:9)", "for(let j=0;j<(MOBILE?5:13);j++){const t=j/(MOBILE?5:13)", 'crowd density')
r = rep(r, "gl_PointSize=clamp(uPx*uSize/(-mv.z),2.0,90.0);", "gl_PointSize=clamp(uPx*uSize/(-mv.z),3.0,70.0);", 'crowd pt')
# edges: multisampled composer target so player edges are smooth when bloom is on
r = rep(r, "new THREE.EffectComposer(r)", "new THREE.EffectComposer(r,(()=>{try{const pr=r.getPixelRatio(),t=new THREE.WebGLMultisampleRenderTarget(Math.floor(innerWidth*pr),Math.floor(innerHeight*pr),{format:THREE.RGBAFormat});t.samples=4;return t}catch(e){return undefined}})())", 'msaa')
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
