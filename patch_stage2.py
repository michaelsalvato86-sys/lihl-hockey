import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()
q = open('skater_pose.js', encoding='utf-8').read()
css = open('ui_style.css', encoding='utf-8').read()
body = open('ui_body.html', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:90]
    return txt.replace(a, b, 1)


# ===== game.html: style + markup =====
s0 = g.index('<style>'); s1 = g.index('</style>') + len('</style>')
g = g[:s0] + '<style>\n' + css + '\n</style>' + g[s1:]
b0 = g.index('<canvas id="c"></canvas>'); b1 = g.index('<script src="three.min.js">')
g = g[:b0] + body + '\n' + g[b1:]
g = rep(g, '<script>\nconst ROSTER=', '<script src="audio.js"></script>\n<script>\nconst ROSTER=', 'audio tag')
g = rep(g, '</script></body></html>', '</script>\n<script src="menu.js"></script></body></html>', 'menu tag')
g = rep(g, "const qs=new URLSearchParams(location.search),SPEED=+qs.get('speed')||1;",
        "const qs=new URLSearchParams(location.search),SPEED=+qs.get('speed')||1;\nconst MOBILE=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)<900)||qs.get('mobile')==='1';", 'MOBILE')

# ===== game.html: newGame(att), handlers =====
g = rep(g, "function newGame(){", "function newGame(att){", 'newGame')
g = rep(g, "$('menu').style.display='none';$('end').style.display='none';$('ctl').style.display=G.hum?'block':'none';",
        "if(!att){$('menu').style.display='none'}G.attract=!!att;$('end').style.display='none';$('ctl').style.display=(G.hum&&!att)?'block':'none';", 'newGame ui')
g = rep(g, "$('na').style.borderBottom='3px solid '+A1.color;$('nh').style.borderBottom='3px solid '+H1.color;",
        "document.documentElement.style.setProperty('--ca',A1.color);document.documentElement.style.setProperty('--ch',H1.color);", 'css vars')
g = rep(g, "$('go').onclick=newGame;$('again').onclick=()=>{$('end').style.display='none';$('menu').style.display='flex'};", "", 'old handlers')
old_load = "addEventListener('load',()=>{if(typeof init3D==='function')init3D();if(THREE_OK&&typeof SK!=='undefined'&&!qs.get('procedural')){const b=$('go');b.disabled=true;b.textContent='LOADING PLAYERS...';SK.load(()=>{b.disabled=false;b.textContent='START';if(qs.get('auto'))b.click()})}else if(qs.get('auto'))$('go').click()});"
new_load = "addEventListener('load',()=>{if(typeof init3D==='function')init3D();const done=()=>{if(window.onReady)window.onReady();if(qs.get('auto'))setTimeout(()=>$('go').click(),300)};if(THREE_OK&&typeof SK!=='undefined'&&!qs.get('procedural')){const b=$('go');b.disabled=true;b.textContent='LOADING...';SK.load(done)}else done()});"
g = rep(g, old_load, new_load, 'load handler')

# ===== banners =====
b0 = g.index("function showBanner(im,a,b,secs,col){")
b1 = g.index("banT=secs}", b0) + len("banT=secs}")
g = g[:b0] + ("function showBanner(im,a,b,secs,col){const e=$('banner');$('bi').src=im||'';$('bi').style.display=(col&&im)?'block':'none';$('bt1').textContent=a;$('bt2').textContent=b;"
              "e.style.setProperty('--bc',col||'#2a6fd6');e.className=col?'goal':'evt';e.style.display='flex';void e.offsetWidth;e.classList.add('pop');banT=secs}") + g[b1:]
g = rep(g, "showBanner(shooter&&shooter.img,`GOAL ${t.abbr}!`,shooter?`${shooter.num!=null?'#'+shooter.num+' ':''}${shooter.name} (${shooter.rating})`:'',2.6,t.color);shakeT=.7;",
        "showBanner(shooter&&shooter.img,'GOAL',shooter?`${shooter.num!=null?'#'+shooter.num+' ':''}${shooter.name} \\u00b7 ${t.name}`:t.name,2.6,t.color);shakeT=.7;G.cele={p:shooter,t:2.6};if(shooter)shooter.celeb=2.6;G.gfx={d:t.dir>0?-1:1,t:3.2};G.excite=1;AU.sfx('horn');AU.crowd(1);AU.speak('Goal! '+(shooter?shooter.name:t.name));", 'goal fx')
g = rep(g, "if(why)showBanner(null,why,sub||'',secs,null)}", "if(why){showBanner(null,why,sub||'',secs,null);AU.sfx('whistle')}}", 'whistle')
g = rep(g, "function endPeriod(){if(G.ot){G.over=true;return finish()}", "function endPeriod(){AU.sfx('buzzer');if(G.ot){G.over=true;return finish()}", 'buzzer')
g = rep(g, "noteT=1.1;noteTxt=h.name.split(' ').pop()+' HITS '", "shakeT=.3;AU.sfx('hit');G.excite=Math.max(G.excite||0,.4);noteT=1.1;noteTxt=h.name.split(' ').pop()+' HITS '", 'hit fx')
g = rep(g, "noteT=1.2;noteTxt='SAVE '+g.name", "AU.sfx('save');noteT=1.2;noteTxt='SAVE '+g.name", 'save fx')
g = rep(g, "function shoot(p,ix,iy,hum,pw){pw=pw||.8;", "function shoot(p,ix,iy,hum,pw){pw=pw||.8;AU.sfx('shot');", 'shot fx')
g = rep(g, "G.passFx={x1:p.x,y1:p.y,x2:best.x,y2:best.y,t:.4};", "G.passFx={x1:p.x,y1:p.y,x2:best.x,y2:best.y,t:.4};AU.sfx('pass');", 'pass fx')
g = rep(g, "$('sl').innerHTML=a;$('sr').innerHTML=b;",
        "$('sl').innerHTML=a;$('sr').innerHTML=b;"
        "{const ppT=(A1.pen.length>H1.pen.length)?[H1,A1]:(H1.pen.length>A1.pen.length)?[A1,H1]:null;let ss=`<span>SHOTS ${G.shots[1]} - ${G.shots[0]}</span>`;"
        "if(ppT){const tt=Math.min(...ppT[1].pen.map(e=>e.t));ss+=`<span class=ppx>${ppT[0].abbr} POWER PLAY ${fm(tt)}</span>`}$('sub').innerHTML=ss}"
        "AU.skate(ctl&&!G.attract?hyp(ctl.vx,ctl.vy)/36:0);", 'hud sub')

# ===== r3d.js =====
c0 = r.index("const asp=innerWidth/innerHeight,spd=Math.min(1")
c1 = r.index("R.cam.updateProjectionMatrix();", c0) + len("R.cam.updateProjectionMatrix();")
cam_old = r[c0:c1]
cam_new = ("if(G.attract){const tt=performance.now()/1000;R.cam.position.set(Math.sin(tt*.07)*62+R.cx*.3,25+Math.sin(tt*.11)*4,44+Math.cos(tt*.07)*12);R.cam.lookAt(R.cx*.6,2,0);R.cam.fov=38;R.cam.updateProjectionMatrix()}\n else{" + cam_old +
           "\n if(G.cele&&G.cele.t>0&&G.cele.p){G.cele.t-=dt;const c=G.cele,k=Math.max(0,Math.min(1,(2.6-c.t)/.5,c.t/.3)),cx0=c.p.x-W/2,cz0=c.p.y-H/2;R.cam.position.lerp(new THREE.Vector3(cx0+9,8.5,cz0+19),k);R.cam.lookAt(R.cx+(cx0-R.cx)*k,1.5+2.5*k,R.cz*.75+(cz0-R.cz*.75)*k);R.cam.fov=36-6*k;R.cam.updateProjectionMatrix()}}")
r = r[:c0] + cam_new + r[c1:]
r = rep(r, "SK.apply(m,SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back))}",
        "const ps=(p.celeb>0)?SK.celebPose(m,performance.now()/1000):SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back);if(p.celeb>0)p.celeb-=dt;SK.apply(m,ps)}", 'celeb pose')
r = rep(r, "for(const z of[-5,5])bx(4.2,.2,.2,red,-d*2.2,.1,z,g);sc.add(g)}",
        "for(const z of[-5,5])bx(4.2,.2,.2,red,-d*2.2,.1,z,g);const bk=new THREE.Mesh(new THREE.SphereGeometry(.85,12,8),new THREE.MeshBasicMaterial({color:0x3a0508}));bk.position.set(-d*2,5.4,0);g.add(bk);(R3.nets=R3.nets||[]).push({g,d,bk});sc.add(g)}", 'nets')
gfx = """if(R.nets){const gf=G.gfx;if(gf&&gf.t>0)gf.t-=dt;for(const n of R.nets){const on=gf&&gf.t>0&&gf.d===n.d;n.bk.material.color.setHex(on?(Math.floor(gf.t*8)%2?0xff1a1a:0x701010):0x3a0508);n.g.scale.x=on?1+.22*Math.max(0,Math.sin(Math.min(1,(3.2-gf.t)*2.4)*Math.PI)):1}}
 if(G.excite>0)G.excite=Math.max(0,G.excite-dt*.35);
 if(R.crowdMat){R.crowdMat.uniforms.uT.value=performance.now()/1000;R.crowdMat.uniforms.uEx.value=.08+(G.excite||0)*.9}
 """
r = rep(r, "if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;", gfx + "if((R.fr++%5)===0&&R.iceTex)R.iceTex.needsUpdate=true;", 'gfx update')
r = rep(r, "uniforms:{uMap:{value:atex},uPx:{value:700},uSize:{value:2.9}}", "uniforms:{uMap:{value:atex},uPx:{value:700},uSize:{value:2.9},uT:{value:0},uEx:{value:.08}}", 'crowd uniforms')
r = rep(r, "uniform float uSize;void main(){vC=cell;vec4 mv=modelViewMatrix*vec4(position,1.0);",
        "uniform float uSize;uniform float uT;uniform float uEx;void main(){vC=cell;vec3 q=position;q.y+=abs(sin(uT*6.0+position.x*2.7+position.z*1.9))*0.55*uEx;vec4 mv=modelViewMatrix*vec4(q,1.0);", 'crowd shader')
# mobile quality
r = rep(r, "r.setPixelRatio(Math.min(devicePixelRatio||1,2))", "r.setPixelRatio(Math.min(devicePixelRatio||1,MOBILE?1.25:2))", 'dpr')
r = rep(r, "rows=8,heads=[]", "rows=MOBILE?4:8,heads=[]", 'rows')
r = rep(r, "for(let j=0;j<9;j++){const t=j/9,ox", "for(let j=0;j<(MOBILE?4:9);j++){const t=j/(MOBILE?4:9),ox", 'heads')
r = rep(r, "if(innerWidth>800&&THREE.EffectComposer)", "if(innerWidth>800&&!MOBILE&&THREE.EffectComposer)", 'composer')
r = rep(r, "if(!p.gl&&sp>9&&R.iceCtx)", "if(!p.gl&&!MOBILE&&sp>9&&R.iceCtx)", 'trails')
# ice + lighting
old_ice = "sc.add(new THREE.Mesh(ig,new THREE.MeshStandardMaterial({map:(R3.itx=iceTex()),emissiveMap:R3.itx,emissive:0xffffff,emissiveIntensity:.3,roughness:.42,metalness:.0,side:THREE.DoubleSide})));"
new_ice = ("const iceMat=new THREE.MeshStandardMaterial({map:(R3.itx=iceTex()),emissiveMap:R3.itx,emissive:0xffffff,emissiveIntensity:.34,roughness:.3,metalness:.0,side:THREE.DoubleSide});sc.add(new THREE.Mesh(ig,iceMat));\n"
           " if(!MOBILE){const cr=new THREE.WebGLCubeRenderTarget(128),cc=new THREE.CubeCamera(1,600,cr),es=new THREE.Scene();es.background=new THREE.Color(0x0a1220);const lm=new THREE.MeshBasicMaterial({color:0xffffff});for(let i=0;i<16;i++){const a=i/16*Math.PI*2,m2=new THREE.Mesh(new THREE.BoxGeometry(22,1,7),lm);m2.position.set(Math.cos(a)*80,70,Math.sin(a)*46);m2.lookAt(0,0,0);es.add(m2)}cc.position.set(0,6,0);cc.update(r,es);iceMat.envMap=cr.texture;iceMat.envMapIntensity=.7}")
r = rep(r, old_ice, new_ice, 'ice')
r = rep(r, "new THREE.HemisphereLight(0xcfe6ff,0x1a2230,.8)", "new THREE.HemisphereLight(0xcfe6ff,0x1a2230,.6)", 'hemi')
r = rep(r, "new THREE.DirectionalLight(0xffffff,.5)", "new THREE.DirectionalLight(0xffffff,.85)", 'dir')
r = rep(r, "ln(100,'#c8283a',1);", "ln(100,'#d0243a',1.25);", 'redline')
r = rep(r, "ln(75,'#1f5fc8',1);ln(125,'#1f5fc8',1);", "ln(75,'#2468d8',1.4);ln(125,'#2468d8',1.4);", 'blue')

q += """
SK.celebPose = function (m, t) {
  const a = SK.armRoll, bob = Math.abs(Math.sin(t * 9)) * .12;
  return {
    pelvis: { p: .05 }, spine_01: { p: -.05 }, spine_02: { p: -.12 }, spine_03: { p: -.18 }, neck_01: { p: -.1 }, Head: { p: -.15 },
    thigh_l: { p: -.35, r: SK.abd.l * .18 }, calf_l: { p: .3, r: SK.abd.l * .18 }, foot_l: { p: 0 },
    thigh_r: { p: -.35, r: SK.abd.r * .18 }, calf_r: { p: .3, r: SK.abd.r * .18 }, foot_r: { p: 0 },
    upperarm_l: { o: 'rp', r: -a.l * .92, p: -.1 + bob }, lowerarm_l: { o: 'rp', r: -a.l * .92, p: -.2 + bob },
    upperarm_r: { o: 'rp', r: -a.r * .92, p: -.1 + bob }, lowerarm_r: { o: 'rp', r: -a.r * .92, p: -.2 + bob }, hand_r: { p: 0 }
  };
};
"""
open('game.html', 'w', encoding='utf-8').write(g)
open('r3d.js', 'w', encoding='utf-8').write(r)
open('skater_pose.js', 'w', encoding='utf-8').write(q)
print('ok')
