/* 3D renderer for LIHL Hockey (Three.js r128). Reads sim state from game.html globals. */
let THREE_OK=false,R3={};
const RR=12;
function perim(w,h,r,n){const pts=[];const cs=[[r,r,Math.PI,1.5*Math.PI],[w-r,r,1.5*Math.PI,2*Math.PI],[w-r,h-r,0,.5*Math.PI],[r,h-r,.5*Math.PI,Math.PI]];
 for(const[cx0,cy0,a0,a1]of cs)for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push([cx0+Math.cos(a)*r,cy0+Math.sin(a)*r])}return pts}
function iceTex(){const c=document.createElement('canvas');c.width=2000;c.height=850;const x=c.getContext('2d'),k=10;
 const gr=x.createLinearGradient(0,0,0,850);gr.addColorStop(0,'#e4f1f9');gr.addColorStop(.5,'#f2f9fd');gr.addColorStop(1,'#e1eef6');x.fillStyle=gr;x.fillRect(0,0,2000,850);
 for(let i=0;i<900;i++){x.fillStyle=`rgba(150,185,205,${Math.random()*.09})`;x.fillRect(Math.random()*2000,Math.random()*850,rnd(30,320),1.4)}
 const ln=(x1,col,w)=>{x.fillStyle=col;x.fillRect(x1*k-w*k/2,0,w*k,850)};
 x.fillStyle='rgba(31,95,200,.16)';x.font='bold 170px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('LIHL',1000,425);
 ln(100,'#d0243a',1.25);ln(11,'#c8283a',.2);ln(189,'#c8283a',.2);ln(75,'#2468d8',1.4);ln(125,'#2468d8',1.4);
 x.strokeStyle='#bd1f31';x.lineWidth=4;x.fillStyle='#bd1f31';
 for(const[a,b]of[[31,22],[31,63],[169,22],[169,63]]){x.beginPath();x.arc(a*k,b*k,150,0,7);x.stroke();x.beginPath();x.arc(a*k,b*k,10,0,7);x.fill()}
 for(const[a,b]of[[80,22],[80,63],[120,22],[120,63]]){x.fillStyle='#bd1f31';x.beginPath();x.arc(a*k,b*k,10,0,7);x.fill()}
 x.strokeStyle='#1f5fc8';x.beginPath();x.arc(1000,425,150,0,7);x.stroke();x.fillStyle='#1f5fc8';x.beginPath();x.arc(1000,425,10,0,7);x.fill();
 x.fillStyle='rgba(120,190,240,.5)';x.strokeStyle='#c8283a';x.lineWidth=2.5;
 for(const[gx,d]of[[11,1],[189,-1]]){x.beginPath();x.arc(gx*k,425,60,d>0?-Math.PI/2:Math.PI/2,d>0?Math.PI/2:1.5*Math.PI);x.closePath();x.fill();x.stroke()}
 const t=new THREE.CanvasTexture(c);t.anisotropy=8;R3.iceCtx=x;R3.iceTex=t;return t}
function bx(w,h,d,mat,x,y,z,par){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(par)par.add(m);return m}
function sph(r,mat,x,y,z,par,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);if(par)par.add(m);return m}
const isLt=c=>{const k=new THREE.Color(c);return .3*k.r+.59*k.g+.11*k.b>.62};
function lerpA(a,b,k){const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*k}
function accOf(p){const t=p.team;if(t._acc)return t._acc;let a=t.accent||'#ffffff';const f=h=>{const c=new THREE.Color(h);return[c.r*255,c.g*255,c.b*255]};const x=f(t.color),y=f(a);if(Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1])+Math.abs(x[2]-y[2])<140)a=isLt(t.color)?'#111111':'#ffffff';t._acc=a;return a}
function noise(x,n){for(let i=0;i<n;i++){x.fillStyle=Math.random()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.05)';x.fillRect(Math.random()*128,Math.random()*128,2,2)}}
function outlined(x,txt,px,py,fill,line){x.lineJoin='round';x.lineWidth=7;x.strokeStyle=line;x.strokeText(txt,px,py);x.fillStyle=fill;x.fillText(txt,px,py)}
function backTex(p){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=p.team.color;x.fillRect(0,0,128,128);const ac=accOf(p),lt=isLt(p.team.color),tc=lt?'#111':'#fff',oc=lt?'#fff':'#111';
 x.fillStyle=ac;x.fillRect(0,108,128,6);x.fillRect(0,118,128,4);x.textAlign='center';x.textBaseline='middle';
 const nm=p.name.split(' ').pop().toUpperCase();x.font='bold '+(nm.length>9?15:nm.length>7?19:24)+'px sans-serif';outlined(x,nm,64,20,tc,oc);
 x.font='bold 76px sans-serif';outlined(x,p.num!=null?String(p.num):'',64,68,tc,oc);noise(x,260);return new THREE.CanvasTexture(c)}
function sideTex(p){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=p.team.color;x.fillRect(0,0,128,128);const ac=accOf(p),lt=isLt(p.team.color);
 x.fillStyle=ac;x.fillRect(0,108,128,6);x.fillRect(0,118,128,4);x.fillRect(0,0,128,5);x.textAlign='center';x.textBaseline='middle';x.font='bold 84px sans-serif';outlined(x,p.num!=null?String(p.num):'',64,56,lt?'#111':'#fff',lt?'#fff':'#111');noise(x,260);return new THREE.CanvasTexture(c)}
function miniTex(p){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const im=img(p.img);x.beginPath();x.arc(64,64,60,0,7);x.fillStyle=p.team.color;x.fill();
 if(im){x.save();x.beginPath();x.arc(64,64,52,0,7);x.clip();x.drawImage(im,12,12,104,104);x.restore()}else{x.fillStyle=isLt(p.team.color)?'#111':'#fff';x.font='bold 50px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(initials(p.name),64,68)}
 x.lineWidth=7;x.strokeStyle='#fff';x.beginPath();x.arc(64,64,58,0,7);x.stroke();return{tx:new THREE.CanvasTexture(c)}}
function mkSkater(p,goalie){const g=new THREE.Group(),col=new THREE.Color(p.team.color);
 const accM=new THREE.MeshStandardMaterial({color:new THREE.Color(accOf(p)),roughness:.55}),jersey=new THREE.MeshStandardMaterial({color:col,roughness:.5}),dark=new THREE.MeshStandardMaterial({color:0x12161d,roughness:.75}),
  skin=new THREE.MeshStandardMaterial({color:0xd9a77f,roughness:.8}),white=new THREE.MeshStandardMaterial({color:0xf2f2f2,roughness:.55}),
  helm=new THREE.MeshStandardMaterial({color:goalie?0xf2f2f2:col.clone().multiplyScalar(.55),roughness:.35}),visor=new THREE.MeshStandardMaterial({color:0x223344,transparent:true,opacity:.55,roughness:.1}),
  pants=new THREE.MeshStandardMaterial({color:col.clone().multiplyScalar(.55),roughness:.7}),back=new THREE.MeshStandardMaterial({map:backTex(p),roughness:.6});
 
 const sideM=new THREE.MeshStandardMaterial({map:sideTex(p),roughness:.6});
 const fc=document.createElement('canvas');fc.width=fc.height=128;const fx=fc.getContext('2d'),ftex=new THREE.CanvasTexture(fc),lt0=isLt(p.team.color);const m={g,legs:[],arms:[],ph:Math.random()*6};
 m.front={done:false,draw(){const ac=accOf(p);fx.fillStyle=p.team.color;fx.fillRect(0,0,128,128);fx.fillStyle=ac;fx.fillRect(0,108,128,6);fx.fillRect(0,118,128,4);fx.textAlign='center';fx.textBaseline='middle';fx.font='bold 40px sans-serif';
  if(p.num!=null)outlined(fx,String(p.num),64,90,lt0?'#111':'#fff',lt0?'#fff':'#111');const lg=img(p.team.icon);if(lg){const s2=Math.min(74/lg.naturalWidth,62/lg.naturalHeight),w=lg.naturalWidth*s2,h=lg.naturalHeight*s2;fx.drawImage(lg,64-w/2,38-h/2,w,h);this.done=true}else if(!p.team.icon)this.done=true;noise(fx,200);ftex.needsUpdate=true}};m.front.draw();
 const frontM=new THREE.MeshStandardMaterial({map:ftex,roughness:.6}),torsoMats=[frontM,back,jersey,jersey,sideM,sideM];
 const body=new THREE.Group();g.add(body);m.body=body;
 if(goalie){const tm=new THREE.Mesh(new THREE.BoxGeometry(2.6,3.4,3.7),torsoMats);tm.position.set(0,4.3,0);body.add(tm);
  bx(1.5,3.2,1.3,white,.2,1.7,-1,g);bx(1.5,3.2,1.3,white,.2,1.7,1,g);bx(1.7,.5,1.5,white,.3,3.4,-1,g);bx(1.7,.5,1.5,white,.3,3.4,1,g);
  bx(.9,2.8,.6,white,1.1,1.8,-1.9,g);bx(.9,2.8,.6,white,1.1,1.8,1.9,g);bx(.7,1.2,.5,dark,1.2,4.4,-2.3,body);bx(1.1,2.2,1.8,dark,1.2,3.8,2.2,body);
  sph(1.15,helm,.1,6.6,0,body);bx(.5,1.1,1.5,dark,1.0,6.4,0,body);bx(3.2,.2,.35,white,2.5,.2,.5,g)}
 else{const tm=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.8,3.2),torsoMats);tm.position.set(0,4.2,0);body.add(tm);
  bx(2.5,.35,3.35,white,0,3.0,0,body);
  sph(1.05,jersey,0,5.45,-1.95,body,.9,.8,1);sph(1.05,jersey,0,5.45,1.95,body,.9,.8,1);
  bx(2.0,1.4,2.8,pants,0,2.55,0,body);
  for(const z of[-.85,.85]){const lg=new THREE.Group();lg.position.set(0,2.2,z);bx(1.05,1.5,1.05,pants,0,-.5,0,lg);bx(.8,1.6,.85,accM,.1,-1.7,0,lg);bx(.9,.45,.9,dark,.1,-1.15,.0,lg);bx(1.7,.55,.85,dark,.35,-2.45,0,lg);bx(2.1,.12,.3,white,.4,-2.8,0,lg);g.add(lg);m.legs.push(lg)}
  for(const z of[-2.0,2.0]){const ar=new THREE.Group();ar.position.set(0,5.4,z);bx(.8,1.6,.8,jersey,0,-.8,0,ar);bx(.9,.3,.9,accM,0,-1.2,0,ar);bx(.7,1.2,.7,dark,.1,-2.0,0,ar);bx(.85,.8,.9,accM,.15,-2.7,0,ar);body.add(ar);m.arms.push(ar)}
  sph(1.0,helm,0,6.45,0,body,1.05,.95,1.05);bx(.35,.6,1.25,visor,.85,6.3,0,body);bx(.3,.4,.9,skin,.78,5.9,0,body);
  const st=bx(5.4,.2,.3,dark,2.6,.35,1.0,g);st.rotation.z=-.05;bx(.9,.14,.55,white,5.2,.1,1.0,g)}
 const bd=new THREE.Mesh(new THREE.CircleGeometry(2.6,16),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3}));bd.rotation.x=-Math.PI/2;bd.position.y=.04;g.add(bd);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));sp.position.set(0,goalie?10.6:9.7,0);sp.scale.set(4.6,5.75,1);g.add(sp);m.badge=sp;m.done=false;
 R3.sc.add(g);return m}
function badgeTex(p){const c=document.createElement('canvas');c.width=160;c.height=200;const x=c.getContext('2d');const im=img(p.img);
 x.beginPath();x.arc(80,76,70,0,7);x.fillStyle=p.team.color;x.fill();
 if(im){x.save();x.beginPath();x.arc(80,76,62,0,7);x.clip();x.drawImage(im,18,14,124,124);x.restore()}else{x.fillStyle='#fff';x.font='bold 60px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(p.gl?'G':initials(p.name),80,80)}
 x.lineWidth=7;x.strokeStyle=p.gl?'#ffd166':'#fff';x.beginPath();x.arc(80,76,70,0,7);x.stroke();
 const nm=(p.gl?'G ':'')+p.name.split(' ').pop()+(p.gl||p.rating==null?'':' '+(p.rating|0));x.font='bold 30px sans-serif';const tw=Math.min(156,x.measureText(nm).width+22);x.fillStyle='rgba(8,14,24,.85)';x.beginPath();x.roundRect?x.roundRect(80-tw/2,150,tw,40,12):x.rect(80-tw/2,150,tw,40);x.fill();
 x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(nm,80,171,150);
 return{tx:new THREE.CanvasTexture(c),hasImg:!!im}}
function mkReal(p){const m=SK.make(p,{goalie:!!p.gl});R3.sc.add(m.g);m.inner.rotation.y=Math.PI/2;
 const bd=new THREE.Mesh(new THREE.CircleGeometry(2.6,16),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3}));bd.rotation.x=-Math.PI/2;bd.position.y=.04;m.g.add(bd);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));sp.position.set(0,9.7,0);sp.scale.set(4.6,5.75,1);m.g.add(sp);m.badge=sp;m.done=false;
 m.front={done:true,draw(){}};m.legs=[];m.arms=[];m.body={rotation:{x:0,z:0},position:{y:0}};return m}
function meshFor(p){let m=R3.meshes.get(p);if(!m){m=SK.ready?mkReal(p):mkSkater(p,!!p.gl);R3.meshes.set(p,m)}if(!m.front.done)m.front.draw();if(m.fdec)m.fdec.draw();
 if(!m.done){const b=badgeTex(p),mi=miniTex(p);m.txF=b.tx;m.txM=mi.tx;m.badge.material.map=b.tx;m.badge.material.needsUpdate=true;m.done=b.hasImg||!p.img}return m}
function init3D(){try{if(!window.THREE||qs.get('2d'))return;
 const c3=document.createElement('canvas');c3.id='c3';c3.style.cssText='position:fixed;inset:0;width:100%;height:100%;display:block';document.body.insertBefore(c3,cv);
 const r=new THREE.WebGLRenderer({canvas:c3,antialias:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio||1,MOBILE?1.25:2));r.setSize(innerWidth,innerHeight,false);
 const sc=new THREE.Scene();sc.background=new THREE.Color(0x05080e);sc.fog=new THREE.Fog(0x05080e,150,360);
 const cam=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,1,700);R3={r,sc,cam,meshes:new Map(),c3,cx:0,cz:30,fr:0};r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.25;if(innerWidth>800&&!MOBILE&&THREE.EffectComposer){R3.composer=new THREE.EffectComposer(r,(()=>{try{const pr=r.getPixelRatio(),t=new THREE.WebGLMultisampleRenderTarget(Math.floor(innerWidth*pr),Math.floor(innerHeight*pr),{format:THREE.RGBAFormat});t.samples=4;return t}catch(e){return undefined}})());R3.composer.addPass(new THREE.RenderPass(sc,cam));R3.composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.45,.5,.9))}
 sc.add(new THREE.HemisphereLight(0xcfe6ff,0x1a2230,.6));
 for(const[x,z]of[[-60,-10],[60,-10],[0,30],[0,-30]]){const d=new THREE.PointLight(0xffffff,.22,170,1.4);d.position.set(x,60,z);sc.add(d)}
 const dl=new THREE.DirectionalLight(0xffffff,.85);dl.position.set(30,80,50);sc.add(dl);
 const pts=perim(W,H,RR,10),sh=new THREE.Shape();pts.forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1]));
 const ig=new THREE.ShapeGeometry(sh);const pos=ig.attributes.position,uv=ig.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/W,1-pos.getY(i)/H);
 ig.rotateX(Math.PI/2);ig.translate(-W/2,0,-H/2);
 const iceMat=new THREE.MeshStandardMaterial({map:(R3.itx=iceTex()),emissiveMap:R3.itx,emissive:0xffffff,emissiveIntensity:.32,roughness:.3,metalness:.0,side:THREE.DoubleSide});sc.add(new THREE.Mesh(ig,iceMat));
 if(!MOBILE){const cr=new THREE.WebGLCubeRenderTarget(128),cc=new THREE.CubeCamera(1,600,cr),es=new THREE.Scene();es.background=new THREE.Color(0x0a1220);const lm=new THREE.MeshBasicMaterial({color:0xffffff});for(let i=0;i<16;i++){const a=i/16*Math.PI*2,m2=new THREE.Mesh(new THREE.BoxGeometry(22,1,7),lm);m2.position.set(Math.cos(a)*80,70,Math.sin(a)*46);m2.lookAt(0,0,0);es.add(m2)}cc.position.set(0,6,0);cc.update(r,es);iceMat.envMap=cr.texture;iceMat.envMapIntensity=.45}
 const bc=document.createElement('canvas');bc.width=1024;bc.height=96;const bxx=bc.getContext('2d');bxx.fillStyle='#0f2f6b';bxx.fillRect(0,0,1024,96);bxx.fillStyle='#fff';bxx.font='bold 54px sans-serif';bxx.textAlign='center';bxx.textBaseline='middle';bxx.fillText('LONG ISLAND HOCKEY LEAGUE',512,50);bxx.fillStyle='#4fd1c5';bxx.fillRect(0,0,1024,6);bxx.fillRect(0,90,1024,6);
 const white=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(bc),roughness:.5}),cap=new THREE.MeshStandardMaterial({color:0x1b4f9c}),kick=new THREE.MeshStandardMaterial({color:0xf0c040}),
  glass=new THREE.MeshStandardMaterial({color:0xbfe6ff,transparent:true,opacity:.13,roughness:.05,side:THREE.DoubleSide,depthWrite:false});
 const bp=perim(W,H,RR,8);for(let i=0;i<bp.length;i++){const a=bp[i],b=bp[(i+1)%bp.length],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz);if(L<.01)continue;
  const g=new THREE.Group();g.position.set((a[0]+b[0])/2-W/2,0,(a[1]+b[1])/2-H/2);g.rotation.y=-Math.atan2(dz,dx);
  bx(L+.1,3.6,.7,white,0,1.8,.35,g);bx(L+.1,.3,.9,cap,0,3.7,.35,g);bx(L+.1,.7,.8,kick,0,.35,.38,g);bx(L+.1,6.5,.1,glass,0,7,.5,g);sc.add(g)}R3.capMat=cap;
 const red=new THREE.MeshStandardMaterial({color:0xcc1f2f,roughness:.5}),net=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.35,side:THREE.DoubleSide});
 for(const d of[1,-1]){const g=new THREE.Group();g.position.set((d>0?GX:W-GX)-W/2,0,0);
  for(const z of[-5,5])bx(.35,4,.35,red,-d*.2,2,z,g);bx(.35,.35,10.35,red,-d*.2,4,0,g);bx(4,3.9,10,net,-d*2.2,2,0,g);bx(.2,.2,10,red,-d*4.2,.1,0,g);for(const z of[-5,5])bx(4.2,.2,.2,red,-d*2.2,.1,z,g);const bk=new THREE.Mesh(new THREE.SphereGeometry(.85,12,8),new THREE.MeshBasicMaterial({color:0x3a0508}));bk.position.set(-d*2,5.4,0);g.add(bk);(R3.nets=R3.nets||[]).push({g,d,bk});sc.add(g)}
 const per=perim(W+22,H+22,RR+11,8),rows=MOBILE?4:8,heads=[],bodies=[],tcols=Object.values(ROSTER.teams).map(t=>new THREE.Color(t.color||'#445'));
 const AT=document.createElement('canvas');AT.width=AT.height=1536;const ax=AT.getContext('2d');ax.fillStyle='#556';ax.fillRect(0,0,1536,1536);const atex=new THREE.CanvasTexture(AT);
 const faces=ROSTER.players.filter(p=>p.photo).slice(0,144);faces.forEach((p,i)=>{const im2=new Image();im2.onload=()=>{ax.drawImage(im2,(i%12)*128,Math.floor(i/12)*128,128,128);atex.needsUpdate=true};im2.src=p.photo});
 const stepM=new THREE.MeshStandardMaterial({color:0x1b212b,roughness:.9}),stepI=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stepM,per.length*rows),dm=new THREE.Object3D();let si=0;
 for(let k=0;k<rows;k++)for(let i=0;i<per.length;i++){const a=per[i],b=per[(i+1)%per.length],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz),push=k*3.4+4.5,mx=(a[0]+b[0])/2-(W+22)/2,mz=(a[1]+b[1])/2-(H+22)/2;
  for(let j=0;j<(MOBILE?5:13);j++){const t=j/(MOBILE?5:13),ox=a[0]+dx*t-(W+22)/2,oz=a[1]+dz*t-(H+22)/2,px=ox+(ox>0?1:-1)*push*.85,pz=oz+(oz>0?1:-1)*push*.85,py=3.5+k*3.0;heads.push([px,py+2.3,pz]);bodies.push([px,py,pz,tcols[(Math.random()*tcols.length)|0]])}
  dm.position.set(mx+(mx>0?1:-1)*push*.85,(3+k*3)/2-.5,mz+(mz>0?1:-1)*push*.85);dm.rotation.set(0,-Math.atan2(dz,dx),0);dm.scale.set(L+.3,3+k*3,3.4);dm.updateMatrix();stepI.setMatrixAt(si++,dm.matrix)}
 sc.add(stepI);
 const bi=new THREE.InstancedMesh(new THREE.BoxGeometry(2.1,2.6,1.5),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9}),bodies.length),d2=new THREE.Object3D();
 bodies.forEach((b,i)=>{d2.position.set(b[0],b[1],b[2]);d2.lookAt(0,b[1],0);d2.updateMatrix();bi.setMatrixAt(i,d2.matrix);bi.setColorAt(i,b[3])});sc.add(bi);
 const hp=new Float32Array(heads.length*3),hc=new Float32Array(heads.length);heads.forEach((h,i)=>{hp.set(h,i*3);hc[i]=Math.floor(Math.random()*Math.max(1,faces.length))});
 const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(hp,3));hg.setAttribute('cell',new THREE.BufferAttribute(hc,1));
 R3.crowdMat=new THREE.ShaderMaterial({uniforms:{uMap:{value:atex},uPx:{value:700},uSize:{value:2.2},uT:{value:0},uEx:{value:.08}},
  vertexShader:'attribute float cell;varying float vC;uniform float uPx;uniform float uSize;uniform float uT;uniform float uEx;void main(){vC=cell;vec3 q=position;q.y+=abs(sin(uT*6.0+position.x*2.7+position.z*1.9))*0.55*uEx;vec4 mv=modelViewMatrix*vec4(q,1.0);gl_PointSize=clamp(uPx*uSize/(-mv.z),3.0,70.0);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform sampler2D uMap;varying float vC;void main(){vec2 uv=gl_PointCoord;if(length(uv-0.5)>0.5)discard;float col=mod(vC,12.0);float row=floor(vC/12.0);vec2 o=vec2(col,11.0-row)/12.0;vec2 p=o+vec2(uv.x,1.0-uv.y)/12.0;gl_FragColor=vec4(texture2D(uMap,p).rgb*0.78,1.0);}'});
 R3.crowdPts=new THREE.Points(hg,R3.crowdMat);sc.add(R3.crowdPts);
 const lm=new THREE.MeshBasicMaterial({color:0xffffff});for(let i=0;i<30;i++){const a=i/30*Math.PI*2;bx(5,1,5,lm,Math.cos(a)*(W/2+40),78,Math.sin(a)*(H/2+40),sc)}
 const jc=document.createElement('canvas');jc.width=1024;jc.height=512;R3.jx=jc.getContext('2d');R3.jtex=new THREE.CanvasTexture(jc);R3.jbs=[bx(32,16,14,new THREE.MeshBasicMaterial({map:R3.jtex}),0,52,0,sc),bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),-12,68,0,sc),bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),12,68,0,sc)];
 const bowl=new THREE.Mesh(new THREE.CylinderGeometry(190,190,70,32,1,true),new THREE.MeshBasicMaterial({color:0x090d14,side:THREE.BackSide}));bowl.position.y=25;sc.add(bowl);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({color:0x0c1119,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.2;sc.add(floor);
 R3.puck=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.38,16),new THREE.MeshStandardMaterial({color:0x050505,roughness:.4}));sc.add(R3.puck);
 R3.ring=new THREE.Mesh(new THREE.RingGeometry(3.3,4.4,32),new THREE.MeshBasicMaterial({color:0xffe27a,side:THREE.DoubleSide,transparent:true,opacity:.95}));const ag=new THREE.ConeGeometry(1.2,2.6,4);ag.rotateX(Math.PI);R3.arrow=new THREE.Mesh(ag,new THREE.MeshBasicMaterial({color:0xffe27a}));sc.add(R3.arrow);
 R3.streak=new THREE.Mesh(new THREE.CylinderGeometry(.3,.02,1,8,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));R3.streak.visible=false;sc.add(R3.streak);
 R3.pline=new THREE.Mesh(new THREE.BoxGeometry(1,.12,.4),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));R3.pline.visible=false;sc.add(R3.pline);
 R3.pring=new THREE.Mesh(new THREE.RingGeometry(2.2,3.1,28),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));R3.pring.rotation.x=-Math.PI/2;R3.pring.visible=false;sc.add(R3.pring);R3.ring.rotation.x=-Math.PI/2;R3.ring.position.y=.1;sc.add(R3.ring);
 addEventListener('resize',()=>{if(R3.composer)R3.composer.setSize(innerWidth,innerHeight);r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
 cv.style.display='none';THREE_OK=true}catch(e){console.log('3D init failed',e);THREE_OK=false}}
function draw3D(dt){const R=R3,all=[];{const np=performance.now();if(R.pt){R.pe=(R.pe||16)*.96+(np-R.pt)*.04}R.pt=np;if((R.pf=(R.pf||0)+1)%90===0&&R.pe){const lv=R.pe>36?2:R.pe>25?1:(R.pe<19?0:(R.pl||0));if(lv!==R.pl){R.pl=lv;const base=Math.min(devicePixelRatio||1,MOBILE?1.25:2),pr=lv===2?.75:lv===1?Math.min(base,1):base;R.r.setPixelRatio(pr);R.r.setSize(innerWidth,innerHeight,false);if(R.crowdPts)R.crowdPts.visible=lv===0}}}if(R.capMat&&R.capFor!==H1){R.capMat.color.set(H1.color);R.capFor=H1}if(shakeT>0)shakeT-=dt;for(const t of[H1,A1]){all.push(t.goalie);for(const s of SL)if(t.seats[s])all.push(t.seats[s])}
 for(const[p,m]of R.meshes)m.g.visible=false;
 for(const p of all){const m=meshFor(p);m.g.visible=true;m.g.position.set(p.x-W/2,0,p.y-H/2);const hi=p.gl||p===ctl||p===puck.owner;if(m.txF){m.badge.material.map=hi?m.txF:m.txM;m.badge.scale.set(hi?4.4:3.0,hi?5.5:3.0,1);m.badge.position.y=hi?(p.gl?10.6:9.9):9.0}
  let fa;if(p.gl){const out=p.team.dir>0?0:Math.PI,toP=Math.atan2(puck.y-p.y,puck.x-p.x);fa=out+clamp(lerpA(out,toP,1)-out,-1.1,1.1)}else fa=p.fa;
  const sp=p.gl?0:hyp(p.vx,p.vy);m.ang=m.ang===undefined?fa:lerpA(m.ang,fa,Math.min(1,dt*9));m.g.rotation.y=-m.ang;
  m.ph+=sp*dt*.32;const k=Math.min(1,sp/32),sw=Math.sin(m.ph)*.75*k;
  m.legs.forEach((l,i)=>l.rotation.z=(i?sw:-sw));m.arms.forEach((a,i)=>a.rotation.z=(i?-sw:sw)*.7);m.bank=(m.bank||0)+(clamp((p.turn||0)*.045*k,-.5,.5)-(m.bank||0))*Math.min(1,dt*8);m.body.rotation.z=-.16*k;m.body.rotation.x=p.gl?0:m.bank;
  if(p.gl)m.body.position.y=-.3+Math.sin(performance.now()/400)*.08;
  if(m.real&&p.gl){if(window.GOAL&&GOAL.ready){const c=m.ctx||(m.ctx={puckW:{x:0,y:.22,z:0},opp:{d:99,s:0}});c.puckW.x=puck.x-W/2;c.puckW.z=puck.y-H/2;GOAL.apply(m,p,c,dt)}else{SK.setPose(m,SK.goaliePose(m,performance.now()/1000));SK.ground(m)}}
  else if(m.real){if(window.ANIM&&ANIM.ready){const c=m.ctx||(m.ctx={puckW:{x:0,y:.22,z:0},opp:{d:99,s:0}}),fa=p.fa||0,ch=Math.cos(fa),sn=Math.sin(fa);
   c.speed=sp;c.vf=p.vx*ch+p.vy*sn;c.vlat=p.vx*sn-p.vy*ch;c.hasPuck=puck.owner===p;c.key=c.hasPuck||p===ctl||!!(m.an&&(m.an.ev||m.an.fall||m.an.recvT>0));c.faceoff=!!(G.fo&&G.fo.set&&!G.fo.dropped);c.celeb=p.celeb>0;if(G.net&&p.act){p.act.t-=dt;if(p.act.t<=0)p.act=null}c.charge=(p===ctl&&typeof input!=='undefined'&&input.sd)?Math.min(1,(performance.now()-input.sd)/700):(p.act&&p.act.k==='shot'?Math.min(1,1-p.act.t/p.act.T)*(p.act.T>.2?1:.8):0);
   c.puckW.x=puck.x-W/2;c.puckW.z=puck.y-H/2;let bd=99,bs=0;for(const o of onIce(p.team===H1?A1:H1)){const dx=o.x-p.x,dy=o.y-p.y,d=Math.hypot(dx,dy);if(d<bd){bd=d;bs=dx*sn-dy*ch}}c.opp.d=bd;c.opp.s=bs;
   if(p.ae&&p.ae.d&&p.ae.d.a!==undefined&&p.ae.d.rel===undefined)p.ae.d.rel=-wrapA(p.ae.d.a-fa);if(p.celeb>0)p.celeb-=dt;ANIM.apply(m,p,c,dt)}
  else{const sp01=Math.min(1,sp/36);m.acc=(m.acc||0)+((p.acc01||0)-(m.acc||0))*Math.min(1,dt*10);m.rph=(m.rph||0)+(sp>1.2?dt*(2.2+sp*.13)*(p.back?-.55:1):0);const ln=-clamp((p.turn||0)*.11*Math.min(1,sp/18),-.8,.8);m.lean=(m.lean||0)+(ln-(m.lean||0))*Math.min(1,dt*9);
   const ps=(p.celeb>0)?SK.celebPose(m,performance.now()/1000):SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back);if(p.celeb>0)p.celeb-=dt;SK.apply(m,ps)}}
  if(!p.gl&&!MOBILE&&sp>9&&R.iceCtx){const m2=m;if(m2.lx!==undefined){R.iceCtx.strokeStyle='rgba(120,150,175,.22)';R.iceCtx.lineWidth=2.2;R.iceCtx.beginPath();R.iceCtx.moveTo(m2.lx*10,m2.ly*10);R.iceCtx.lineTo(p.x*10,p.y*10);R.iceCtx.stroke();R.iceDirty=true}m2.lx=p.x;m2.ly=p.y}else{m.lx=undefined}
  if(p===ctl){const tt=performance.now()/1000;R.ring.visible=true;R.ring.position.x=p.x-W/2;R.ring.position.z=p.y-H/2;R.ring.scale.setScalar(1+.12*Math.sin(tt*6));R.arrow.visible=true;R.arrow.position.set(p.x-W/2,15.2+Math.sin(tt*5)*.6,p.y-H/2);R.arrow.rotation.y=tt*2}}
 if(!ctl){R.ring.visible=false;R.arrow.visible=false}
  {if(!R.ptg){R.ptg=new THREE.Mesh(new THREE.RingGeometry(2.4,3.2,28),new THREE.MeshBasicMaterial({color:0x7dffb0,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));R.ptg.rotation.x=-Math.PI/2;R.ptg.position.y=.07;R.ring.parent.add(R.ptg)}
   let tg=null;if(ctl&&puck.owner===ctl&&!G.over&&G.pause<=0){const ci=curIn();tg=passTarget(ctl,ci[0],ci[1])}
   if(tg){R.ptg.visible=true;R.ptg.position.x=tg.x-W/2;R.ptg.position.z=tg.y-H/2;R.ptg.scale.setScalar(1+.1*Math.sin(performance.now()/130))}else R.ptg.visible=false}
 R.puck.position.set(puck.x-W/2,.22,puck.y-H/2);{const om=puck.owner&&R.meshes.get(puck.owner),hw=om&&om.an&&om.an.heelOk&&om.an.heelW,P=R.puck.position;if(hw){R.pbx=hw.x-P.x;R.pbz=hw.z-P.z}R.pb=(R.pb||0)+((hw?1:0)-(R.pb||0))*Math.min(1,dt*(hw?14:9));if(R.pb>.002){P.x+=(R.pbx||0)*R.pb;P.z+=(R.pbz||0)*R.pb}else R.pb=0}
 const fp=ctl?{x:puck.x+(ctl.x-puck.x)*.4,y:puck.y+(ctl.y-puck.y)*.4}:puck;const tx=clamp(fp.x-W/2+puck.vx*.2,-84,84),tz=clamp(fp.y-H/2+puck.vy*.1,-34,34);R.cx+=(tx-R.cx)*Math.min(1,dt*4.2);R.cz+=(tz-R.cz)*Math.min(1,dt*4.2);if(G.attract){const tt=performance.now()/1000;R.cam.position.set(Math.sin(tt*.07)*62+R.cx*.3,25+Math.sin(tt*.11)*4,44+Math.cos(tt*.07)*12);R.cam.lookAt(R.cx*.6,2,0);R.cam.fov=38}
 else{const asp=innerWidth/innerHeight,spd=Math.min(1,hyp(puck.vx,puck.vy)/90),hgt=(asp<1?46:23)+spd*4,dist=(asp<1?62:38)+spd*8;const sk=shakeT>0?shakeT*1.4:0;{const vis=VIEWM==='s';if(R.jbs)for(const m of R.jbs)m.visible=vis}if(VIEWM!=='s'){const ud=myDir();if(VIEWM==='v'){const pw=puck.x-W/2,sg=pw<0?-1:1,dg=89-Math.abs(pw),sh=sg*clamp((46-dg)/20,0,1)*10;R.vsh=R.vsh===undefined?sh:R.vsh+(sh-R.vsh)*Math.min(1,dt*3);const vx=R.cx+R.vsh;R.cam.position.set(clamp(vx-ud*30,-106,106)+(Math.random()-.5)*sk,(asp<1?60:50)+spd*3+(Math.random()-.5)*sk,R.cz*.9);R.cam.lookAt(vx+ud*8,0,R.cz*.9);R.cam.fov=asp<1?56:46}
  else if(VIEWM==='n'){const gx=-ud*89,bx=gx-ud*22,pd=Math.abs(puck.x-W/2-bx),far=clamp((pd-70)/110,0,1),tz=R.cz*.8;R.nz=R.nz===undefined?tz:R.nz+(tz-R.nz)*Math.min(1,dt*3);R.cam.position.set(bx+(Math.random()-.5)*sk,(asp<1?19:14)+far*12+(Math.random()-.5)*sk,R.nz);R.cam.lookAt(gx+ud*(34+far*22),0,R.nz*.7+R.cz*.1);R.cam.fov=(asp<1?62:48)+far*8}else if(VIEWM==='b'){R.cam.position.set(R.cx-ud*(asp<1?34:30)+(Math.random()-.5)*sk,(asp<1?20:15)+spd*2,R.cz*.85);R.cam.lookAt(R.cx+ud*34,1.2,R.cz*.85);R.cam.fov=asp<1?60:50}else{R.cam.position.set(0+(Math.random()-.5)*sk,asp<1?96:78,asp<1?46:56);R.cam.lookAt(0,0,2);R.cam.fov=asp<1?62:40}}else{R.cam.position.set(R.cx*.93+(Math.random()-.5)*sk,hgt+(Math.random()-.5)*sk,R.cz*.5+dist);R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36}
 if(G.cele&&G.cele.t>0&&G.cele.p){G.cele.t-=dt;const c=G.cele,k=Math.max(0,Math.min(1,(2.6-c.t)/.5,c.t/.3)),cx0=c.p.x-W/2,cz0=c.p.y-H/2;R.cam.position.lerp(new THREE.Vector3(cx0+9,8.5,cz0+19),k);R.cam.lookAt(R.cx+(cx0-R.cx)*k,1.5+2.5*k,R.cz*.75+(cz0-R.cz*.75)*k);R.cam.fov=36-6*k}}
 if(R.cam.fov!==R.pfov){R.cam.updateProjectionMatrix();R.pfov=R.cam.fov}
 {const sp=hyp(puck.vx,puck.vy),st=R.streak;
 if(!puck.owner&&sp>55){const len=Math.min(14,sp*.11),dx=puck.vx/sp,dz=puck.vy/sp;st.visible=true;st.material.opacity=clamp((sp-55)/80,0,.75);st.scale.set(1,len,1);st.position.set(puck.x-W/2-dx*len/2,.3,puck.y-H/2-dz*len/2);st.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-dx,0,-dz))}else st.visible=false;
 const pf=G.passFx;if(pf&&pf.t>0){pf.t-=dt;const k=clamp(pf.t/.4,0,1),ax=pf.x1-W/2,az=pf.y1-H/2,bx=pf.x2-W/2,bz=pf.y2-H/2,L=Math.hypot(bx-ax,bz-az);R.pline.visible=true;R.pline.position.set((ax+bx)/2,.35,(az+bz)/2);R.pline.scale.set(L,1,1);R.pline.rotation.y=-Math.atan2(bz-az,bx-ax);R.pline.material.opacity=.55*k;R.pring.visible=true;R.pring.position.set(bx,.12,bz);R.pring.scale.setScalar(1+(1-k)*.8);R.pring.material.opacity=.8*k}else{R.pline.visible=false;R.pring.visible=false}}
 if(R.nets){const gf=G.gfx;if(gf&&gf.t>0)gf.t-=dt;for(const n of R.nets){const on=gf&&gf.t>0&&gf.d===n.d;n.bk.material.color.setHex(on?(Math.floor(gf.t*8)%2?0xff1a1a:0x701010):0x3a0508);n.g.scale.x=on?1+.22*Math.max(0,Math.sin(Math.min(1,(3.2-gf.t)*2.4)*Math.PI)):1}}
 if(G.excite>0)G.excite=Math.max(0,G.excite-dt*.35);
 if(R.crowdMat){R.crowdMat.uniforms.uT.value=performance.now()/1000;R.crowdMat.uniforms.uEx.value=.08+(G.excite||0)*.9}
 if((R.fr++%(MOBILE?36:15))===0&&R.iceTex&&R.iceDirty){R.iceTex.needsUpdate=true;R.iceDirty=false}
 if(R.crowdMat)R.crowdMat.uniforms.uPx.value=R.r.domElement.height/(2*Math.tan(R.cam.fov*Math.PI/360));
 const jsig=R.jx&&R.fr%12===0?H1.abbr+H1.color+A1.abbr+A1.color+G.score[0]+'-'+G.score[1]+'|'+fm(G.clock)+'|'+G.ot+G.period:null;
 if(jsig!==null&&jsig!==R.jsig){R.jsig=jsig;const x=R.jx,w=1024,h=512;const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b1d3a');gr.addColorStop(1,'#050a14');x.fillStyle=gr;x.fillRect(0,0,w,h);x.textAlign='center';x.textBaseline='middle';x.font='bold 120px sans-serif';
  x.fillStyle=H1.color;x.fillText(H1.abbr,200,150);x.fillStyle=A1.color;x.fillText(A1.abbr,824,150);x.fillStyle='#fff';x.font='bold 230px sans-serif';x.fillText(G.score[0],200,340);x.fillText(G.score[1],824,340);x.font='bold 110px sans-serif';x.fillText(fm(G.clock),512,220);x.font='bold 60px sans-serif';x.fillStyle='#4fd1c5';x.fillText(G.ot?'OT':['','1ST','2ND','3RD'][G.period],512,330);x.fillText('LIHL',512,430);R.jtex.needsUpdate=true}
 if(R.composer)R.composer.render();else R.r.render(R.sc,R.cam)}
