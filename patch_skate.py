import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()


def gg(a, b):
    global g
    assert a in g, 'game: ' + a[:80]
    g = g.replace(a, b, 1)


def rr(a, b):
    global r
    assert a in r, 'r3d: ' + a[:80]
    r = r.replace(a, b, 1)


skate = """function skate(p,dt,mx){const dx=p.dvx||0,dy=p.dvy||0,des=Math.min(1,hyp(dx,dy)),sp=hyp(p.vx,p.vy);if(p.fa===undefined)p.fa=0;
 const ag=.7+.6*p.spd;let diff=0;
 if(des>.08){const ta=Math.atan2(dy,dx);diff=((ta-p.fa+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  const om=(5+11*Math.max(0,1-sp/mx))*ag,st=clamp(diff,-om*dt,om*dt);p.fa+=st;p.turn=st/dt}else p.turn=0;
 const fx=Math.cos(p.fa),fy=Math.sin(p.fa);let vf=p.vx*fx+p.vy*fy,vsx=p.vx-vf*fx,vsy=p.vy-vf*fy;
 if(des>.08){const al=Math.cos(diff);
  if(al>.35){const tgt=des*mx*(.55+.45*al);if(vf<tgt)vf=Math.min(tgt,vf+85*ag*dt);else vf=Math.max(tgt,vf-60*dt)}
  else vf=Math.max(0,vf-110*dt)}
 else vf*=Math.exp(-1.3*dt);
 const grip=Math.exp(-(6+8*(1-Math.min(1,sp/mx)))*dt);vsx*=grip;vsy*=grip;
 p.vx=vf*fx+vsx;p.vy=vf*fy+vsy;const s2=hyp(p.vx,p.vy);if(s2>mx*1.15){const k=mx*1.15/s2;p.vx*=k;p.vy*=k}}
function step(dt){"""
gg("function step(dt){", skate)
gg("const k=Math.min(1,dt*3.6);p.vx+=((p.dvx||0)*mx-p.vx)*k;p.vy+=((p.dvy||0)*mx-p.vy)*k;p.x=clamp(p.x+p.vx*dt,7,W-7);p.y=clamp(p.y+p.vy*dt,2.5,H-2.5);\n  if(hyp(p.vx,p.vy)>3)p.fa=Math.atan2(p.vy,p.vx)}",
   "skate(p,dt,mx);p.x=clamp(p.x+p.vx*dt,7,W-7);p.y=clamp(p.y+p.vy*dt,2.5,H-2.5)}")

# lean into turns and stride tied to speed
rr("m.legs.forEach((l,i)=>l.rotation.z=(i?sw:-sw));m.arms.forEach((a,i)=>a.rotation.z=(i?-sw:sw)*.7);m.body.rotation.z=-.16*k;",
   "m.legs.forEach((l,i)=>l.rotation.z=(i?sw:-sw));m.arms.forEach((a,i)=>a.rotation.z=(i?-sw:sw)*.7);m.bank=(m.bank||0)+(clamp((p.turn||0)*.045*k,-.5,.5)-(m.bank||0))*Math.min(1,dt*8);m.body.rotation.z=-.16*k;m.body.rotation.x=p.gl?0:m.bank;")
open('game.html', 'w', encoding='utf-8').write(g)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
