import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
r = open('r3d.js', encoding='utf-8').read()

def rr(a, b):
    global r
    assert a in r, a[:70]
    r = r.replace(a, b, 1)

rr("function lerpA(", "const isLt=c=>{const k=new THREE.Color(c);return .3*k.r+.59*k.g+.11*k.b>.62};\nfunction lerpA(")
rr("const sideM=new THREE.MeshStandardMaterial({map:sideTex(p),roughness:.6}),torsoMats=[jersey,back,jersey,jersey,sideM,sideM];",
"""const sideM=new THREE.MeshStandardMaterial({map:sideTex(p),roughness:.6});
 const fc=document.createElement('canvas');fc.width=fc.height=128;const fx=fc.getContext('2d'),ftex=new THREE.CanvasTexture(fc),lt0=isLt(p.team.color);const m={g,legs:[],arms:[],ph:Math.random()*6};
 m.front={done:false,draw(){fx.fillStyle=p.team.color;fx.fillRect(0,0,128,128);fx.fillStyle=lt0?'rgba(0,0,0,.5)':'rgba(255,255,255,.85)';fx.fillRect(0,100,128,8);fx.fillRect(0,112,128,4);const lg=img(p.team.icon);if(lg){const s2=Math.min(88/lg.naturalWidth,88/lg.naturalHeight),w=lg.naturalWidth*s2,h=lg.naturalHeight*s2;fx.drawImage(lg,64-w/2,50-h/2,w,h);this.done=true}ftex.needsUpdate=true}};m.front.draw();
 const frontM=new THREE.MeshStandardMaterial({map:ftex,roughness:.6}),torsoMats=[frontM,back,jersey,jersey,sideM,sideM];""")
rr("const m={g,legs:[],arms:[],ph:Math.random()*6},body=new THREE.Group();g.add(body);m.body=body;", "")
rr("if(goalie){const tm=new THREE.Mesh(", "const body=new THREE.Group();g.add(body);m.body=body;\n if(goalie){const tm=new THREE.Mesh(")
rr("function meshFor(p){let m=R3.meshes.get(p);if(!m){m=mkSkater(p,!!p.gl);R3.meshes.set(p,m)}",
   "function meshFor(p){let m=R3.meshes.get(p);if(!m){m=mkSkater(p,!!p.gl);R3.meshes.set(p,m)}if(!m.front.done)m.front.draw();")

i0 = r.index("const cg=new THREE.BoxGeometry")
i1 = r.index("im.count=n;sc.add(im);") + len("im.count=n;sc.add(im);")
crowd = """const per=perim(W+22,H+22,RR+11,8),rows=8,heads=[],bodies=[],tcols=Object.values(ROSTER.teams).map(t=>new THREE.Color(t.color||'#445'));
 const AT=document.createElement('canvas');AT.width=AT.height=1536;const ax=AT.getContext('2d');ax.fillStyle='#556';ax.fillRect(0,0,1536,1536);const atex=new THREE.CanvasTexture(AT);
 const faces=ROSTER.players.filter(p=>p.photo).slice(0,144);faces.forEach((p,i)=>{const im2=new Image();im2.onload=()=>{ax.drawImage(im2,(i%12)*128,Math.floor(i/12)*128,128,128);atex.needsUpdate=true};im2.src=p.photo});
 const stepM=new THREE.MeshStandardMaterial({color:0x1b212b,roughness:.9}),stepI=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stepM,per.length*rows),dm=new THREE.Object3D();let si=0;
 for(let k=0;k<rows;k++)for(let i=0;i<per.length;i++){const a=per[i],b=per[(i+1)%per.length],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz),push=k*3.4+4.5,mx=(a[0]+b[0])/2-(W+22)/2,mz=(a[1]+b[1])/2-(H+22)/2;
  for(let j=0;j<4;j++){const t=j/4,ox=a[0]+dx*t-(W+22)/2,oz=a[1]+dz*t-(H+22)/2,px=ox+(ox>0?1:-1)*push*.85,pz=oz+(oz>0?1:-1)*push*.85,py=3.5+k*3.0;heads.push([px,py+2.3,pz]);bodies.push([px,py,pz,tcols[(Math.random()*tcols.length)|0]])}
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
 const jc=document.createElement('canvas');jc.width=1024;jc.height=512;R3.jx=jc.getContext('2d');R3.jtex=new THREE.CanvasTexture(jc);bx(32,16,14,new THREE.MeshBasicMaterial({map:R3.jtex}),0,52,0,sc);bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),-12,68,0,sc);bx(.5,30,.5,new THREE.MeshBasicMaterial({color:0x222222}),12,68,0,sc);"""
r = r[:i0] + crowd + r[i1:]

rr("const white=new THREE.MeshStandardMaterial({color:0xf4f6f8,roughness:.5}),",
"""const bc=document.createElement('canvas');bc.width=1024;bc.height=96;const bxx=bc.getContext('2d');bxx.fillStyle='#0f2f6b';bxx.fillRect(0,0,1024,96);bxx.fillStyle='#fff';bxx.font='bold 54px sans-serif';bxx.textAlign='center';bxx.textBaseline='middle';bxx.fillText('LONG ISLAND HOCKEY LEAGUE',512,50);bxx.fillStyle='#4fd1c5';bxx.fillRect(0,0,1024,6);bxx.fillRect(0,90,1024,6);
 const white=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(bc),roughness:.5}),""")
rr("r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.25;",
   "r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.25;if(innerWidth>800&&THREE.EffectComposer){R3.composer=new THREE.EffectComposer(r);R3.composer.addPass(new THREE.RenderPass(sc,cam));R3.composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.45,.5,.9))}")
rr("addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight,false);",
   "addEventListener('resize',()=>{if(R3.composer)R3.composer.setSize(innerWidth,innerHeight);r.setSize(innerWidth,innerHeight,false);")
rr("if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;R.r.render(R.sc,R.cam)}",
"""if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;
 if(R.crowdMat)R.crowdMat.uniforms.uPx.value=R.r.domElement.height/(2*Math.tan(R.cam.fov*Math.PI/360));
 if(R.fr%12===0&&R.jx){const x=R.jx,w=1024,h=512;const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#0b1d3a');gr.addColorStop(1,'#050a14');x.fillStyle=gr;x.fillRect(0,0,w,h);x.textAlign='center';x.textBaseline='middle';x.font='bold 120px sans-serif';
  x.fillStyle=H1.color;x.fillText(H1.abbr,200,150);x.fillStyle=A1.color;x.fillText(A1.abbr,824,150);x.fillStyle='#fff';x.font='bold 230px sans-serif';x.fillText(G.score[0],200,340);x.fillText(G.score[1],824,340);x.font='bold 110px sans-serif';x.fillText(fm(G.clock),512,220);x.font='bold 60px sans-serif';x.fillStyle='#4fd1c5';x.fillText(G.ot?'OT':['','1ST','2ND','3RD'][G.period],512,330);x.fillText('LIHL',512,430);R.jtex.needsUpdate=true}
 if(R.composer)R.composer.render();else R.r.render(R.sc,R.cam)}""")
open('r3d.js', 'w', encoding='utf-8').write(r)
print('patched')
