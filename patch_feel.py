import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
q = open('skater_pose.js', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()

# ---------- new skating physics ----------
i0 = g.index("function skate(p,dt,mx){")
i1 = g.index("function step(dt){")
skate = """function wrapA(a){return((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI}
function skate(p,dt,mx){const dx=p.dvx||0,dy=p.dvy||0,des=Math.min(1,hyp(dx,dy)),sp=hyp(p.vx,p.vy);if(p.fa===undefined)p.fa=0;
 const ag=(.7+.6*p.spd)*(p.isCtl?1.22:1);let diff=0,al=1,back=false;p.acc01=0;
 const vf0=p.vx*Math.cos(p.fa)+p.vy*Math.sin(p.fa);
 if(des>.08){const ta=Math.atan2(dy,dx);diff=wrapA(ta-p.fa);al=Math.cos(diff);
  back=Math.abs(diff)>2.3&&sp<mx*.6&&puck.owner!==p&&vf0<mx*.5;
  if(!back){const om=(3.2+12*Math.max(0,1-sp/mx))*ag,st=clamp(diff,-om*dt,om*dt);p.fa+=st;p.turn=st/dt}else p.turn=0}else p.turn=0;
 p.back=back;
 const fx=Math.cos(p.fa),fy=Math.sin(p.fa);let vf=p.vx*fx+p.vy*fy,vsx=p.vx-vf*fx,vsy=p.vy-vf*fy;
 if(des>.08){
  if(back){const tgt=-des*mx*.5;if(vf>tgt)vf=Math.max(tgt,vf-70*ag*dt);else vf=Math.min(tgt,vf+60*dt)}
  else if(al>.35){const tgt=des*mx*(.55+.45*al);if(vf<tgt){const a=(64*(1-Math.pow(clamp(vf/mx,0,1),1.4))+9)*ag;vf=Math.min(tgt,vf+a*dt);p.acc01=clamp(a/60,0,1)}else vf=Math.max(tgt,vf-48*dt)}
  else if(al<-.3)vf=Math.max(0,vf-115*dt);else vf*=Math.exp(-.8*dt)}
 else vf*=Math.exp(-1.0*dt);
 const grip=Math.exp(-(4+9*(1-Math.min(1,sp/mx)))*dt);{const lm=hyp(vsx,vsy);if(vf>-2)vf+=lm*(1-grip)*.4}vsx*=grip;vsy*=grip;
 if(vf>mx*1.05)vf=mx*1.05;p.vx=vf*fx+vsx;p.vy=vf*fy+vsy;const s2=hyp(p.vx,p.vy);if(s2>mx*1.15){const k=mx*1.15/s2;p.vx*=k;p.vy*=k}}
"""
g = g[:i0] + skate + g[i1:]
a = "if(p===ctl){p.dvx=nx;p.dvy=ny;"
assert g.count(a) == 1
g = g.replace(a, "p.isCtl=(p===ctl);if(p===ctl){p.dvx=nx;p.dvy=ny;", 1)

# ---------- pose: push only when accelerating, backskate stance ----------
j0 = q.index("SK.skatePose = function")
j1 = q.index("SK._v = new THREE.Vector3();")
pose = """SK.skatePose = function (m, ph, sp, turn, acc, back) {
  acc = acc || 0;
  const push = back ? Math.min(1, .25 + sp) : Math.min(1, acc * 1.15 + .12 * sp), crouch = (back ? .38 : .5) + .25 * sp + .18 * Math.abs(turn || 0);
  const pl = Math.max(0, Math.sin(ph)) * push, pr = Math.max(0, Math.sin(ph + Math.PI)) * push, lean = turn || 0, up = back ? -.18 : 0;
  const leg = (s, pu) => ({ tp: -(.45 + .55 * crouch) + .55 * pu, tr: SK.abd[s] * (.1 + .55 * pu + (back ? .12 : 0)), cp: .12 + .55 * crouch * (1 - .6 * pu) + .1 * pu });
  const L = leg('l', pl), R = leg('r', pr), rl = SK.rollLeft * lean;
  return {
    pelvis: { p: .15 + .1 * sp + up * .6, r: rl * .45 }, spine_01: { p: .26 + .1 * sp + up, r: rl * .4 }, spine_02: { p: .32 + .1 * sp + up, r: rl * .4 }, spine_03: { p: .36 + .1 * sp + up, r: rl * .4 },
    neck_01: { p: .12 }, Head: { p: -.1 },
    thigh_l: { p: L.tp, r: L.tr }, calf_l: { p: L.cp, r: L.tr }, foot_l: { p: 0 },
    thigh_r: { p: R.tp, r: R.tr }, calf_r: { p: R.cp, r: R.tr }, foot_r: { p: 0 },
    upperarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : 1), p: -.45 }, lowerarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : 1), p: -1.35 },
    upperarm_r: { o: 'rp', r: SK.armRoll.r * (back ? .8 : 1), p: -.45 }, lowerarm_r: { o: 'rp', r: SK.armRoll.r * (back ? .8 : 1), p: -1.35 }, hand_r: { p: 0 }
  };
};
"""
q = q[:j0] + pose + q[j1:]

# ---------- r3d: stride timing, lean, acceleration feed ----------
k0 = r.index("else if(m.real){const sp01")
k1 = r.index("SK.ground(m)}", k0) + len("SK.ground(m)}")
real = ("else if(m.real){const sp01=Math.min(1,sp/36);m.acc=(m.acc||0)+((p.acc01||0)-(m.acc||0))*Math.min(1,dt*10);"
        "m.rph=(m.rph||0)+(sp>1.2?dt*(2.2+sp*.13)*(p.back?-.55:1):0);"
        "const ln=-clamp((p.turn||0)*.11*Math.min(1,sp/18),-.8,.8);m.lean=(m.lean||0)+(ln-(m.lean||0))*Math.min(1,dt*9);"
        "SK.setPose(m,SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back));SK.ground(m)}")
r = r[:k0] + real + r[k1:]
open('game.html', 'w', encoding='utf-8').write(g)
open('skater_pose.js', 'w', encoding='utf-8').write(q)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
