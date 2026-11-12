import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
r=open('r3d.js',encoding='utf-8').read()
init="R3.crowdPts=new THREE.Points(hg,R3.crowdMat);sc.add(R3.crowdPts);"
r=rep(r,init,init+"{const N=240,g2=new THREE.BufferGeometry(),pa=new Float32Array(N*3);for(let i=0;i<N;i++)pa[i*3+1]=-50;g2.setAttribute('position',new THREE.BufferAttribute(pa,3));R3.sp={n:N,pa,v:new Float32Array(N*3),life:new Float32Array(N),i:0,pts:new THREE.Points(g2,new THREE.PointsMaterial({color:0xeaf6ff,size:.55,transparent:true,opacity:.75,depthWrite:false})),g:g2};R3.sp.pts.frustumCulled=false;sc.add(R3.sp.pts)}",'init')
# emit + update inside draw3D
r=rep(r,"for(const p of all){const m=meshFor(p);m.g.visible=true;m.g.position.set(p.x-W/2,0,p.y-H/2);",
 "for(const p of all){const m=meshFor(p);m.g.visible=true;m.g.position.set(p.x-W/2,0,p.y-H/2);{const S=R.sp,sp1=hyp(p.vx,p.vy);if(S){const dec=p._sp!==undefined?(p._sp-sp1)/Math.max(.004,dt):0;if(dec>85&&p._sp>24&&!p.box){const ang=Math.atan2(p.vy,p.vx)+1.57*(p.turn>0?1:-1);for(let k=0;k<3;k++){const j=S.i=(S.i+1)%S.n;S.pa[j*3]=p.x-W/2+Math.cos(ang)*.9;S.pa[j*3+1]=.25;S.pa[j*3+2]=p.y-H/2+Math.sin(ang)*.9;S.v[j*3]=Math.cos(ang)*(5+Math.random()*7)+p.vx*.25;S.v[j*3+1]=3+Math.random()*4;S.v[j*3+2]=Math.sin(ang)*(5+Math.random()*7)+p.vy*.25;S.life[j]=.5+Math.random()*.3}}p._sp=sp1}}",'emit')
r=rep(r,"function draw3D(dt){const R=R3,all=[];","function draw3D(dt){const R=R3,all=[];if(R.sp){const S=R.sp;let any=false;for(let j=0;j<S.n;j++){if(S.life[j]>0){S.life[j]-=dt;S.v[j*3+1]-=22*dt;S.pa[j*3]+=S.v[j*3]*dt;S.pa[j*3+1]=Math.max(.05,S.pa[j*3+1]+S.v[j*3+1]*dt);S.pa[j*3+2]+=S.v[j*3+2]*dt;S.v[j*3]*=.96;S.v[j*3+2]*=.96;any=true;if(S.life[j]<=0)S.pa[j*3+1]=-50}}if(any||S.dirty){S.g.attributes.position.needsUpdate=true;S.dirty=any}}",'upd')
open('r3d.js','w',encoding='utf-8').write(r)
print('ok')
