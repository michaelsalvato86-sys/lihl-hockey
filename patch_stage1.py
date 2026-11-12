import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
q = open('skater_pose.js', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:90]
    return txt.replace(a, b, 1)


# ---------- stick planting (two-pass pose) ----------
q += """
SK.apply = function (m, pose) {
  SK.setPose(m, pose); SK.ground(m);
  if (pose.hand_r) {
    m.byName.hand_r.getWorldPosition(SK._v); m.inner.worldToLocal(SK._v);
    const S = SK.stick, sin = Math.max(0.35, Math.min(0.97, (SK._v.y - 0.02) / S.L));
    pose.hand_r.p = Math.asin(sin) - S.phi0; SK.setPose(m, pose);
  }
};
"""
# left hand reaches the shaft, arms stronger
q = rep(q, "upperarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : 1), p: -.45 }, lowerarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : 1), p: -1.35 },",
        "upperarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : .72), p: -.62 }, lowerarm_l: { o: 'rp', r: SK.armRoll.l * (back ? .8 : .6), p: -1.25 },", 'arm l')
q = rep(q, "tp: -(.45 + .55 * crouch) + .55 * pu, tr: SK.abd[s] * (.1 + .55 * pu + (back ? .12 : 0))", "tp: -(.5 + .55 * crouch) + .7 * pu, tr: SK.abd[s] * (.12 + .72 * pu + (back ? .12 : 0))", 'stride')
q = rep(q, "crouch = (back ? .38 : .5) + .25 * sp + .18 * Math.abs(turn || 0);", "crouch = (back ? .4 : .56) + .25 * sp + .2 * Math.abs(turn || 0);", 'crouch')

# ---------- r3d: camera, apply(), fx ----------
a = "SK.setPose(m,SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back));SK.ground(m)}"
r = rep(r, a, "SK.apply(m,SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back))}", 'apply')
c0 = r.index("const tx=clamp(puck.x-W/2+puck.vx*.3")
c1 = r.index("R.cam.updateProjectionMatrix();", c0) + len("R.cam.updateProjectionMatrix();")
cam = ("const fp=ctl?{x:puck.x+(ctl.x-puck.x)*.4,y:puck.y+(ctl.y-puck.y)*.4}:puck;"
       "const tx=clamp(fp.x-W/2+puck.vx*.2,-84,84),tz=clamp(fp.y-H/2+puck.vy*.1,-34,34);"
       "R.cx+=(tx-R.cx)*Math.min(1,dt*4.2);R.cz+=(tz-R.cz)*Math.min(1,dt*4.2);"
       "const asp=innerWidth/innerHeight,spd=Math.min(1,hyp(puck.vx,puck.vy)/90),hgt=(asp<1?40:23)+spd*4,dist=(asp<1?56:38)+spd*8;"
       "const sk=shakeT>0?shakeT*1.4:0;R.cam.position.set(R.cx*.93+(Math.random()-.5)*sk,hgt+(Math.random()-.5)*sk,R.cz*.5+dist);"
       "R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36;R.cam.updateProjectionMatrix();")
r = r[:c0] + cam + r[c1:]

r = rep(r, "sc.add(R3.arrow);",
        "sc.add(R3.arrow);\n"
        " R3.streak=new THREE.Mesh(new THREE.CylinderGeometry(.3,.02,1,8,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));R3.streak.visible=false;sc.add(R3.streak);\n"
        " R3.pline=new THREE.Mesh(new THREE.BoxGeometry(1,.12,.4),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));R3.pline.visible=false;sc.add(R3.pline);\n"
        " R3.pring=new THREE.Mesh(new THREE.RingGeometry(2.2,3.1,28),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));R3.pring.rotation.x=-Math.PI/2;R3.pring.visible=false;sc.add(R3.pring);", 'fx objs')
fx = """{const sp=hyp(puck.vx,puck.vy),st=R.streak;
 if(!puck.owner&&sp>55){const len=Math.min(14,sp*.11),dx=puck.vx/sp,dz=puck.vy/sp;st.visible=true;st.material.opacity=clamp((sp-55)/80,0,.75);st.scale.set(1,len,1);st.position.set(puck.x-W/2-dx*len/2,.3,puck.y-H/2-dz*len/2);st.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-dx,0,-dz))}else st.visible=false;
 const pf=G.passFx;if(pf&&pf.t>0){pf.t-=dt;const k=clamp(pf.t/.4,0,1),ax=pf.x1-W/2,az=pf.y1-H/2,bx=pf.x2-W/2,bz=pf.y2-H/2,L=Math.hypot(bx-ax,bz-az);R.pline.visible=true;R.pline.position.set((ax+bx)/2,.35,(az+bz)/2);R.pline.scale.set(L,1,1);R.pline.rotation.y=-Math.atan2(bz-az,bx-ax);R.pline.material.opacity=.55*k;R.pring.visible=true;R.pring.position.set(bx,.12,bz);R.pring.scale.setScalar(1+(1-k)*.8);R.pring.material.opacity=.8*k}else{R.pline.visible=false;R.pring.visible=false}}
 """
r = rep(r, "if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;", fx + "if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;", 'fx update')

# ---------- passing ----------
p0 = g.index("if(!best)return false;const lx=best.x+best.vx*.3")
p1 = g.index("(1-p.pass)*.25;", p0) + len("(1-p.pass)*.25;")
newpass = ("if(!best)return false;const d0=hyp(best.x-p.x,best.y-p.y)||1,sp=clamp(80+d0*1.5,90,155)*(.92+.18*p.pass);let lx=best.x,ly=best.y;"
           "for(let k=0;k<3;k++){const dd=hyp(lx-p.x,ly-p.y),tt=dd/sp;lx=clamp(best.x+best.vx*tt*.95,8,W-8);ly=clamp(best.y+best.vy*tt*.95,3,H-3)}"
           "let a=Math.atan2(ly-p.y,lx-p.x)+(Math.random()-.5)*(1-p.pass)*.1;G.passFx={x1:p.x,y1:p.y,x2:best.x,y2:best.y,t:.4};")
g = g[:p0] + newpass + g[p1:]
g = rep(g, "const f=Math.exp(-.45*dt);", "const f=Math.exp(-(puck.target?.22:.45)*dt);", 'friction')
g = rep(g, "if(hyp(puck.vx,puck.vy)<105)for(const p of all)", "if(hyp(puck.vx,puck.vy)<(puck.target?200:105))for(const p of all)", 'pickup speed')
g = rep(g, "r=4.2+(p===puck.target?3:0)", "r=4.2+(p===puck.target?4:0)", 'pickup radius')

open('game.html', 'w', encoding='utf-8').write(g)
open('skater_pose.js', 'w', encoding='utf-8').write(q)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
