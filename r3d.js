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
 ln(100,'#c8283a',1);ln(11,'#c8283a',.2);ln(189,'#c8283a',.2);ln(75,'#1f5fc8',1);ln(125,'#1f5fc8',1);
 x.strokeStyle='#c8283a';x.lineWidth=2.5;x.fillStyle='#c8283a';
 for(const[a,b]of[[31,22],[31,63],[169,22],[169,63]]){x.beginPath();x.arc(a*k,b*k,150,0,7);x.stroke();x.beginPath();x.arc(a*k,b*k,10,0,7);x.fill()}
 x.strokeStyle='#1f5fc8';x.beginPath();x.arc(1000,425,150,0,7);x.stroke();x.fillStyle='#1f5fc8';x.beginPath();x.arc(1000,425,10,0,7);x.fill();
 x.fillStyle='rgba(120,190,240,.5)';x.strokeStyle='#c8283a';x.lineWidth=2.5;
 for(const[gx,d]of[[11,1],[189,-1]]){x.beginPath();x.arc(gx*k,425,60,d>0?-Math.PI/2:Math.PI/2,d>0?Math.PI/2:1.5*Math.PI);x.closePath();x.fill();x.stroke()}
 const t=new THREE.CanvasTexture(c);t.anisotropy=8;R3.iceCtx=x;R3.iceTex=t;return t}
function bx(w,h,d,mat,x,y,z,par){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(par)par.add(m);return m}
function sph(r,mat,x,y,z,par,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);if(par)par.add(m);return m}
const isLt=c=>{const k=new THREE.Color(c);return .3*k.r+.59*k.g+.11*k.b>.62};
function lerpA(a,b,k){const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*k}
function backTex(p){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=p.team.color;x.fillRect(0,0,128,128);
 x.fillStyle='rgba(255,255,255,.9)';x.fillRect(0,92,128,9);x.fillRect(0,106,128,5);
 const lt=(()=>{const c=new THREE.Color(p.team.color);return .3*c.r+.59*c.g+.11*c.b>.62})();x.fillStyle=lt?'#111':'#fff';x.textAlign='center';x.textBaseline='middle';const nm=p.name.split(' ').pop().toUpperCase();x.font=`bold ${nm.length>8?17:22}px sans-serif`;x.fillText(nm,64,24);
 x.font='bold 62px sans-serif';x.fillText(p.num!=null?String(p.num):'',64,62);return new THREE.CanvasTexture(c)}
function sideTex(p){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=p.team.color;x.fillRect(0,0,128,128);const cc=new THREE.Color(p.team.color),lt=.3*cc.r+.59*cc.g+.11*cc.b>.62;
 x.fillStyle=lt?'rgba(0,0,0,.55)':'rgba(255,255,255,.9)';x.fillRect(0,100,128,8);x.fillRect(0,112,128,4);x.fillStyle=lt?'#111':'#fff';x.textAlign='center';x.textBaseline='middle';x.font='bold 78px sans-serif';x.fillText(p.num!=null?String(p.num):'',64,52);return new THREE.CanvasTexture(c)}
function mkSkater(p,goalie){const g=new THREE.Group(),col=new THREE.Color(p.team.color);
 const jersey=new THREE.MeshStandardMaterial({color:col,roughness:.6}),dark=new THREE.MeshStandardMaterial({color:0x12161d,roughness:.75}),
  skin=new THREE.MeshStandardMaterial({color:0xd9a77f,roughness:.8}),white=new THREE.MeshStandardMaterial({color:0xf2f2f2,roughness:.55}),
  helm=new THREE.MeshStandardMaterial({color:goalie?0xf2f2f2:0x15181d,roughness:.35}),visor=new THREE.MeshStandardMaterial({color:0x223344,transparent:true,opacity:.55,roughness:.1}),
  pants=new THREE.MeshStandardMaterial({color:col.clone().multiplyScalar(.55),roughness:.7}),back=new THREE.MeshStandardMaterial({map:backTex(p),roughness:.6});
 
 const sideM=new THREE.MeshStandardMaterial({map:sideTex(p),roughness:.6});
 const fc=document.createElement('canvas');fc.width=fc.height=128;const fx=fc.getContext('2d'),ftex=new THREE.CanvasTexture(fc),lt0=isLt(p.team.color);const m={g,legs:[],arms:[],ph:Math.random()*6};
 m.front={done:false,draw(){fx.fillStyle=p.team.color;fx.fillRect(0,0,128,128);fx.fillStyle=lt0?'rgba(0,0,0,.5)':'rgba(255,255,255,.85)';fx.fillRect(0,100,128,8);fx.fillRect(0,112,128,4);const lg=img(p.team.icon);if(lg){const s2=Math.min(88/lg.naturalWidth,88/lg.naturalHeight),w=lg.naturalWidth*s2,h=lg.naturalHeight*s2;fx.drawImage(lg,64-w/2,50-h/2,w,h);this.done=true}ftex.needsUpdate=true}};m.front.draw();
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
  for(const z of[-.85,.85]){const lg=new THREE.Group();lg.position.set(0,2.2,z);bx(1.05,1.5,1.05,pants,0,-.5,0,lg);bx(.8,1.6,.85,white,.1,-1.7,0,lg);bx(.9,.45,.9,dark,.1,-1.15,.0,lg);bx(1.7,.55,.85,dark,.35,-2.45,0,lg);bx(2.1,.12,.3,white,.4,-2.8,0,lg);g.add(lg);m.legs.push(lg)}
  for(const z of[-2.0,2.0]){const ar=new THREE.Group();ar.position.set(0,5.4,z);bx(.8,1.6,.8,jersey,0,-.8,0,ar);bx(.7,1.2,.7,dark,.1,-2.0,0,ar);bx(.85,.8,.9,dark,.15,-2.7,0,ar);body.add(ar);m.arms.push(ar)}
  sph(1.0,helm,0,6.45,0,body,1.05,.95,1.05);bx(.35,.6,1.25,visor,.85,6.3,0,body);bx(.3,.4,.9,skin,.78,5.9,0,body);
  const st=bx(5.4,.2,.3,dark,2.6,.35,1.0,g);st.rotation.z=-.05;bx(.9,.14,.55,white,5.2,.1,1.0,g)}
 const bd=new THREE.Mesh(new THREE.CircleGeometry(2.6,16),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3}));bd.rotation.x=-Math.PI/2;bd.position.y=.04;g.add(bd);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false}));sp.position.set(0,goalie?10.6:9.7,0);sp.scale.set(4.6,5.75,1);g.add(sp);m.badge=sp;m.done=false;
 R3.sc.add(g);return m}
function badgeTex(p){const c=document.createElement('canvas');c.width=160;c.height=200;const x=c.getContext('2d');const im=img(p.img);
 x.beginPath();x.arc(80,76,70,0,7);x.fillStyle=p.team.color;x.fill();
 if(im){x.save();x.beginPath();x.arc(80,76,62,0,7);x.clip();x.drawImage(im,18,14,124,124);x.restore()}else{x.fillStyle='#fff';x.font='bold 60px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(p.gl?'G':initials(p.name),80,80)}
 x.lineWidth=7;x.strokeStyle=p.gl?'#ffd166':'#fff';x.beginPath();x.arc(80,76,70,0,7);x.stroke();
 const nm=(p.gl?'G ':'')+p.name.split(' ').pop();x.font='bold 30px sans-serif';const tw=Math.min(156,x.measureText(nm).width+22);x.fillStyle='rgba(8,14,24,.85)';x.beginPath();x.roundRect?x.roundRect(80-tw/2,150,tw,40,12):x.rect(80-tw/2,150,tw,40);x.fill();
 x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(nm,80,171,150);
 return{tx:new THREE.CanvasTexture(c),hasImg:!!im}}
function meshFor(p){let m=R3.meshes.get(p);if(!m){m=mkSkater(p,!!p.gl);R3.meshes.set(p,m)}if(!m.front.done)m.front.draw();
 if(!m.done){const b=badgeTex(p);m.badge.material.map=b.tx;m.badge.material.needsUpdate=true;m.done=b.hasImg||!p.img}return m}
function init3D(){try{if(!window.THREE||qs.get('2d'))return;
 const c3=document.createElement('canvas');c3.id='c3';c3.style.cssText='position:fixed;inset:0;width:100%;height:100%;display:block';document.body.insertBefore(c3,cv);
 const r=new THREE.WebGLRenderer({canvas:c3,antialias:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setSize(innerWidth,innerHeight,false);
 const sc=new THREE.Scene();sc.background=new THREE.Color(0x05080e);sc.fog=new THREE.Fog(0x05080e,150,360);
 const cam=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,1,700);R3={r,sc,cam,meshes:new Map(),c3,cx:0,cz:30,fr:0};r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.25;if(innerWidth>800&&THREE.EffectComposer){R3.composer=new THREE.EffectComposer(r);R3.composer.addPass(new THREE.RenderPass(sc,cam));R3.composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.45,.5,.9))}
 sc.add(new THREE.HemisphereLight(0xcfe6ff,0x1a2230,.8));
 for(const[x,z]of[[-60,-10],[60,-10],[0,30],[0,-30]]){const d=new THREE.PointLight(0xffffff,.22,170,1.4);d.position.set(x,60,z);sc.add(d)}
 const dl=new THREE.DirectionalLight(0xffffff,.5);dl.position.set(30,80,50);sc.add(dl);
 const pts=perim(W,H,RR,10),sh=new THREE.Shape();pts.forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1]));
 const ig=new THREE.ShapeGeometry(sh);const pos=ig.attributes.position,uv=ig.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/W,1-pos.getY(i)/H);
 ig.rotateX(Math.PI/2);ig.translate(-W/2,0,-H/2);
 sc.add(new THREE.Mesh(ig,new THREE.MeshStandardMaterial({map:iceTex(),roughness:.42,metalness:.0,side:THREE.DoubleSide})));
 const bc=document.createElement('canvas');bc.width=1024;bc.height=96;const bxx=bc.getContext('2d');bxx.fillStyle='#0f2f6b';bxx.fillRect(0,0,1024,96);bxx.fillStyle='#fff';bxx.font='bold 54px sans-serif';bxx.textAlign='center';bxx.textBaseline='middle';bxx.fillText('LONG ISLAND HOCKEY LEAGUE',512,50);bxx.fillStyle='#4fd1c5';bxx.fillRect(0,0,1024,6);bxx.fillRect(0,90,1024,6);
 const white=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(bc),roughness:.5}),cap=new THREE.MeshStandardMaterial({color:0x1b4f9c}),kick=new THREE.MeshStandardMaterial({color:0xf0c040}),
  glass=new THREE.MeshStandardMaterial({color:0xbfe6ff,transparent:true,opacity:.13,roughness:.05,side:THREE.DoubleSide,depthWrite:false});
 const bp=perim(W,H,RR,8);for(let i=0;i<bp.length;i++){const a=bp[i],b=bp[(i+1)%bp.length],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz);if(L<.01)continue;
  const g=new THREE.Group();g.position.set((a[0]+b[0])/2-W/2,0,(a[1]+b[1])/2-H/2);g.rotation.y=-Math.atan2(dz,dx);
  bx(L+.1,3.6,.7,white,0,1.8,.35,g);bx(L+.1,.3,.9,cap,0,3.7,.35,g);bx(L+.1,.7,.8,kick,0,.35,.38,g);bx(L+.1,6.5,.1,glass,0,7,.5,g);sc.add(g)}
 const red=new THREE.MeshStandardMaterial({color:0xcc1f2f,roughness:.5}),net=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.35,side:THREE.DoubleSide});
 for(const d of[1,-1]){const g=new THREE.Group();g.position.set((d>0?GX:W-GX)-W/2,0,0);
  for(const z of[-5,5])bx(.35,4,.35,red,-d*.2,2,z,g);bx(.35,.35,10.35,red,-d*.2,4,0,g);bx(4,3.9,10,net,-d*2.2,2,0,g);bx(.2,.2,10,red,-d*4.2,.1,0,g);for(const z of[-5,5])bx(4.2,.2,.2,red,-d*2.2,.1,z,g);sc.add(g)}
 const per=perim(W+22,H+22,RR+11,8),rows=8,heads=[],bodies=[],tcols=Object.values(ROSTER.teams).map(t=>new THREE.Color(t.color||'#445'));
 const AT=document.createElement('canvas');AT.width=AT.height=1536;const ax=AT.getContext('2d');ax.fillStyle='#556';ax.fillRect(0,0,1536,1536);const atex=new THREE.CanvasTexture(AT);
 const faces=ROSTER.players.filter(p=>p.photo).slice(0,144);faces.forEach((p,i)=>{const im2=new Image();im2.onload=()=>{ax.drawImage(im2,(i%12)*128,Math.floor(i/12)*128,128,128);atex.needsUpdate=true};im2.src=p.photo});
 const stepM=new THREE.MeshStandardMaterial({color:0x1b212b,roughness:.9}),stepI=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stepM,per.length*rows),dm=new THREE.Object3D();let si=0;
 for(let k=0;k<rows;k++)for(let i=0;i<per.length;i++){const a=per[i],b=per[(i+1)%per.length],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz),push=k*3.4+4.5,mx=(a[0]+b[0])/2-(W+22)/2,mz=(a[1]+b[1])/2-(H+22)/2;
  for(let j=0;j<9;j++){const t=j/9,ox=a[0]+dx*t-(W+22)/2,oz=a[1]+dz*t-(H+22)/2,px=ox+(ox>0?1:-1)*push*.85,pz=oz+(oz>0?1:-1)*push*.85,py=3.5+k*3.0;heads.push([px,py+2.3,pz]);bodies.push([px,py,pz,tcols[(Math.random()*tcols.length)|0]])}
  dm.position.set(mx+(mx>0?1:-1)*push*.85,(3+k*3)/2-.5,mz+(mz>0?1:-1)*push*.85);dm.rotation.set(0,-Math.atan2(dz,dx),0);dm.scale.set(L+.3,3+k*3,3.4);dm.updateMatrix();stepI.setMatrixAt(si++,dm.matrix)}
 sc.add(stepI);
 const bi=new THREE.InstancedMesh(new THREE.BoxGeometry(2.1,2.6,1.5),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9}),bodies.length),d2=new THREE.Object3D();
 bodies.forEach((b,i)=>{d2.position.set(b[0],b[1],b[2]);d2.lookAt(0,b[1],0);d2.updateMatrix();bi.setMatrixAt(i,d2.matrix);bi.setColorAt(i,b[3])});sc.add(bi);
 const hp=new Float32Array(heads.length*3),hc=new Float32Array(heads.length);heads.forEach((h,i)=>{hp.set(h,i*3);hc[i]=Math.floor(Math.random()*Math.max(1,faces.length))});
 const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(hp,3));hg.setAttribute('cell',new THREE.BufferAttribute(hc,1));
 R3.crowdMat=new THREE.ShaderMaterial({uniforms:{uMap:{value:atex},uPx:{value:700},uSize:{value:2.9}},
  vertexShader:'attribute float cell;varying float vC;uniform float uPx;uniform float uSize;void main(){vC=cell;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(uPx*uSize/(-mv.z),2.0,90.0);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform sampler2D uMap;varying float vC;void main(){vec2 uv=gl_PointCoord;if(length(uv-0.5)>0.5)discard;float col=mod(vC,12.0);float row=floor(vC/12.0);vec2 o=vec2(col,11.0-row)/12.0;vec2 p=o+vec2(uv.x,1.0-uv.y)/12.0;gl_FragColor=vec4(texture2D(uMap,p).rgb*0.78,1.0);}'});
 sc.add(new THREE.Points(hg,R3.crowdMat));
 const lm=new THREE.MeshBasicMaterial({color:0xffffff});for(let i=0;i<30;i++){const a=i/30*Math.PI*2;bx(5,1,5,lm,Math.cos(a)*(W/2+40),78,Math.sin(a)*(H/2+40),sc)}
 const jc=document.createElement('canvas');jc.width=1024;jc.height=512;R3.jx=jc.getContext('2d');R3.jtex=new THREE.CanvasTexture(jc);bx(32,16,14,new THREE.MeshBasicMaterial({map:R3.jtex}),0,52,0,sc);bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),-12,68,0,sc);bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),12,68,0,sc);
 const bowl=new THREE.Mesh(new THREE.CylinderGeometry(190,190,70,32,1,true),new THREE.MeshBasicMaterial({color:0x090d14,side:THREE.BackSide}));bowl.position.y=25;sc.add(bowl);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({color:0x0c1119,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.2;sc.add(floor);
 R3.puck=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.38,16),new THREE.MeshStandardMaterial({color:0x050505,roughness:.4}));sc.add(R3.puck);
 R3.ring=new THREE.Mesh(new THREE.RingGeometry(3.3,4.4,32),new THREE.MeshBasicMaterial({color:0xffe27a,side:THREE.DoubleSide,transparent:true,opacity:.95}));const ag=new THREE.ConeGeometry(1.2,2.6,4);ag.rotateX(Math.PI);R3.arrow=new THREE.Mesh(ag,new THREE.MeshBasicMaterial({color:0xffe27a}));sc.add(R3.arrow);R3.ring.rotation.x=-Math.PI/2;R3.ring.position.y=.1;sc.add(R3.ring);
 addEventListener('resize',()=>{if(R3.composer)R3.composer.setSize(innerWidth,innerHeight);r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
 cv.style.display='none';THREE_OK=true}catch(e){console.log('3D init failed',e);THREE_OK=false}}
function draw3D(dt){const R=R3,all=[];for(const t of[H1,A1]){all.push(t.goalie);for(const s of SL)if(t.seats[s])all.push(t.seats[s])}
 for(const[p,m]of R.meshes)m.g.visible=false;
 for(const p of all){const m=meshFor(p);m.g.visible=true;m.g.position.set(p.x-W/2,0,p.y-H/2);
  let fa;if(p.gl){const out=p.team.dir>0?0:Math.PI,toP=Math.atan2(puck.y-p.y,puck.x-p.x);fa=out+clamp(lerpA(out,toP,1)-out,-1.1,1.1)}else fa=p.fa;
  const sp=p.gl?0:hyp(p.vx,p.vy);m.ang=m.ang===undefined?fa:lerpA(m.ang,fa,Math.min(1,dt*9));m.g.rotation.y=-m.ang;
  m.ph+=sp*dt*.32;const k=Math.min(1,sp/32),sw=Math.sin(m.ph)*.75*k;
  m.legs.forEach((l,i)=>l.rotation.z=(i?sw:-sw));m.arms.forEach((a,i)=>a.rotation.z=(i?-sw:sw)*.7);m.body.rotation.z=-.16*k;
  if(p.gl)m.body.position.y=-.3+Math.sin(performance.now()/400)*.08;
  if(!p.gl&&sp>9&&R.iceCtx){const m2=m;if(m2.lx!==undefined){R.iceCtx.strokeStyle='rgba(120,150,175,.22)';R.iceCtx.lineWidth=2.2;R.iceCtx.beginPath();R.iceCtx.moveTo(m2.lx*10,m2.ly*10);R.iceCtx.lineTo(p.x*10,p.y*10);R.iceCtx.stroke()}m2.lx=p.x;m2.ly=p.y}else{m.lx=undefined}
  if(p===ctl){const tt=performance.now()/1000;R.ring.visible=true;R.ring.position.x=p.x-W/2;R.ring.position.z=p.y-H/2;R.ring.scale.setScalar(1+.12*Math.sin(tt*6));R.arrow.visible=true;R.arrow.position.set(p.x-W/2,15.2+Math.sin(tt*5)*.6,p.y-H/2);R.arrow.rotation.y=tt*2}}
 if(!ctl){R.ring.visible=false;R.arrow.visible=false}
 R.puck.position.set(puck.x-W/2,.22,puck.y-H/2);
 const tx=clamp(puck.x-W/2+puck.vx*.3,-78,78),tz=clamp(puck.y-H/2+puck.vy*.15,-30,30);
 R.cx+=(tx-R.cx)*Math.min(1,dt*3);R.cz+=(tz-R.cz)*Math.min(1,dt*3);
 const asp=innerWidth/innerHeight,hgt=asp<1?62:46,dist=asp<1?88:74;
 R.cam.position.set(R.cx*.95,hgt,R.cz*.45+dist);R.cam.lookAt(R.cx,0,R.cz*.7);R.cam.fov=asp<1?55:40;R.cam.updateProjectionMatrix();
 if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;
 if(R.crowdMat)R.crowdMat.uniforms.uPx.value=R.r.domElement.height/(2*Math.tan(R.cam.fov*Math.PI/360));
 if(R.fr%12===0&&R.jx){const x=R.jx,w=1024,h=512;const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b1d3a');gr.addColorStop(1,'#050a14');x.fillStyle=gr;x.fillRect(0,0,w,h);x.textAlign='center';x.textBaseline='middle';x.font='bold 120px sans-serif';
  x.fillStyle=H1.color;x.fillText(H1.abbr,200,150);x.fillStyle=A1.color;x.fillText(A1.abbr,824,150);x.fillStyle='#fff';x.font='bold 230px sans-serif';x.fillText(G.score[0],200,340);x.fillText(G.score[1],824,340);x.font='bold 110px sans-serif';x.fillText(fm(G.clock),512,220);x.font='bold 60px sans-serif';x.fillStyle='#4fd1c5';x.fillText(G.ot?'OT':['','1ST','2ND','3RD'][G.period],512,330);x.fillText('LIHL',512,430);R.jtex.needsUpdate=true}
 if(R.composer)R.composer.render();else R.r.render(R.sc,R.cam)}
