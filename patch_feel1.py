import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:80]
    return s.replace(a, b, 1)


# ---- shooting: humans get much tighter aim error; quick tap = real wrist shot
g = rep(g, "ang+=(Math.random()-.5)*((1-p.shot)*.5+dg/260)*(1.25-.5*(1-pw));",
        "ang+=(Math.random()-.5)*((1-p.shot)*.5+dg/260)*(1.25-.5*(1-pw))*(hum?.3:1);", 'spread')
g = rep(g, "kind:pw>.85?'slap':(p.recvAt!==undefined&&p.recvAt-G.clock>=0&&p.recvAt-G.clock<.7)?'onetimer':pw<.45?'snap':'wrist'",
        "kind:pw>.85?'slap':(p.recvAt!==undefined&&p.recvAt-G.clock>=0&&p.recvAt-G.clock<.7)?'onetimer':pw<.6?'snap':'wrist'", 'kind')
g = rep(g, "input.pw=clamp((performance.now()-input.sd)/700,.25,1)", "input.pw=clamp((performance.now()-input.sd)/520,.5,1)", 'charge')

# ---- passing: always finds a receiver; reads stick direction, then open lanes, then facing
old_start = g.index("function pass(p,ix,iy){")
old_end = g.index("if(!best)return false;", old_start)
new = """function passTarget(p,ix,iy){const t=p.team,im=hyp(ix,iy),has=im>.3,fa=p.fa||0,ax=has?ix/im:Math.cos(fa),ay=has?iy/im:Math.sin(fa),opp=onIce(t.opp);let best=null,bs=-99;
 for(const m of onIce(t)){if(m===p||m.box)continue;const dx=m.x-p.x,dy=m.y-p.y,d=hyp(dx,dy)||1,dot=(dx*ax+dy*ay)/d;
  let lane=0;for(const o of opp){const rx=o.x-p.x,ry=o.y-p.y,al=(rx*dx+ry*dy)/d;if(al<3||al>d)continue;const off=Math.abs(rx*dy-ry*dx)/d;if(off<4)lane+=(4-off)/4}
  const s=dot*(has?3:1.6)-d/220-lane*.9+(d<14?-.6:0);if(s>bs){bs=s;best=m}}
 return best}
function pass(p,ix,iy){const t=p.team;let best=passTarget(p,ix,iy);
 """
g = g[:old_start] + new + g[old_end:]
# curIn helper (same math as readLocal) so the HUD can preview the pass target
g = rep(g, "function readLocal(){", "function curIn(){return[input.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),input.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)]}\nfunction readLocal(){", 'curIn')

# ---- r3d: ring under the player the pass would go to
r = rep(r, "if(!ctl){R.ring.visible=false;R.arrow.visible=false}",
        "if(!ctl){R.ring.visible=false;R.arrow.visible=false}\n  {if(!R.ptg){R.ptg=new THREE.Mesh(new THREE.RingGeometry(2.4,3.2,28),new THREE.MeshBasicMaterial({color:0x7dffb0,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));R.ptg.rotation.x=-Math.PI/2;R.ptg.position.y=.07;R.scene.add(R.ptg)}\n   let tg=null;if(ctl&&puck.owner===ctl&&!G.over&&G.pause<=0){const ci=curIn();tg=passTarget(ctl,ci[0],ci[1])}\n   if(tg){R.ptg.visible=true;R.ptg.position.x=tg.x-W/2;R.ptg.position.z=tg.y-H/2;R.ptg.scale.setScalar(1+.1*Math.sin(performance.now()/130))}else R.ptg.visible=false}", 'ring')
open('game.html', 'w', encoding='utf-8').write(g)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
