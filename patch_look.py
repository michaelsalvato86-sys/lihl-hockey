import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
r = open('r3d.js', encoding='utf-8').read()
g = open('game.html', encoding='utf-8').read()


def rr(a, b):
    global r
    assert a in r, 'r3d: ' + a[:80]
    r = r.replace(a, b, 1)


def gg(a, b):
    global g
    assert a in g, 'game: ' + a[:80]
    g = g.replace(a, b, 1)


# ---------- jersey textures ----------
i0 = r.index("function backTex(p){")
i1 = r.index("function mkSkater(p,goalie){")
new_tex = """function accOf(p){const t=p.team;if(t._acc)return t._acc;let a=t.accent||'#ffffff';const f=h=>{const c=new THREE.Color(h);return[c.r*255,c.g*255,c.b*255]};const x=f(t.color),y=f(a);if(Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1])+Math.abs(x[2]-y[2])<140)a=isLt(t.color)?'#111111':'#ffffff';t._acc=a;return a}
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
"""
r = r[:i0] + new_tex + r[i1:]

# remove the old standalone sideTex (it sat before mkSkater, already replaced by slice above) - nothing more to do

# ---------- front of jersey ----------
j0 = r.index("m.front={done:false,draw(){")
j1 = r.index("m.front.draw();")
front = """m.front={done:false,draw(){const ac=accOf(p);fx.fillStyle=p.team.color;fx.fillRect(0,0,128,128);fx.fillStyle=ac;fx.fillRect(0,108,128,6);fx.fillRect(0,118,128,4);fx.textAlign='center';fx.textBaseline='middle';fx.font='bold 40px sans-serif';
  if(p.num!=null)outlined(fx,String(p.num),64,90,lt0?'#111':'#fff',lt0?'#fff':'#111');const lg=img(p.team.icon);if(lg){const s2=Math.min(74/lg.naturalWidth,62/lg.naturalHeight),w=lg.naturalWidth*s2,h=lg.naturalHeight*s2;fx.drawImage(lg,64-w/2,38-h/2,w,h);this.done=true}else if(!p.team.icon)this.done=true;noise(fx,200);ftex.needsUpdate=true}};"""
r = r[:j0] + front + r[j1:]

# ---------- materials / silhouette ----------
rr("const jersey=new THREE.MeshStandardMaterial({color:col,roughness:.6}),",
   "const accM=new THREE.MeshStandardMaterial({color:new THREE.Color(accOf(p)),roughness:.55}),jersey=new THREE.MeshStandardMaterial({color:col,roughness:.5}),")
rr("helm=new THREE.MeshStandardMaterial({color:goalie?0xf2f2f2:0x15181d,roughness:.35})",
   "helm=new THREE.MeshStandardMaterial({color:goalie?0xf2f2f2:col.clone().multiplyScalar(.55),roughness:.35})")
rr("bx(.8,1.6,.85,white,.1,-1.7,0,lg)", "bx(.8,1.6,.85,accM,.1,-1.7,0,lg)")
rr("bx(.85,.8,.9,dark,.15,-2.7,0,ar)", "bx(.85,.8,.9,accM,.15,-2.7,0,ar)")
rr("bx(.8,1.6,.8,jersey,0,-.8,0,ar);", "bx(.8,1.6,.8,jersey,0,-.8,0,ar);bx(.9,.3,.9,accM,0,-1.2,0,ar);")

# ---------- badges ----------
rr("if(!m.done){const b=badgeTex(p);m.badge.material.map=b.tx;m.badge.material.needsUpdate=true;m.done=b.hasImg||!p.img}return m}",
   "if(!m.done){const b=badgeTex(p),mi=miniTex(p);m.txF=b.tx;m.txM=mi.tx;m.badge.material.map=b.tx;m.badge.material.needsUpdate=true;m.done=b.hasImg||!p.img}return m}")
rr("const m=meshFor(p);m.g.visible=true;m.g.position.set(p.x-W/2,0,p.y-H/2);",
   "const m=meshFor(p);m.g.visible=true;m.g.position.set(p.x-W/2,0,p.y-H/2);const hi=p.gl||p===ctl||p===puck.owner;if(m.txF){m.badge.material.map=hi?m.txF:m.txM;m.badge.scale.set(hi?4.4:3.0,hi?5.5:3.0,1);m.badge.position.y=hi?(p.gl?10.6:9.9):9.0}")

# ---------- team-colored boards, camera shake, ice lines ----------
rr("bx(L+.1,6.5,.1,glass,0,7,.5,g);sc.add(g)}", "bx(L+.1,6.5,.1,glass,0,7,.5,g);sc.add(g)}R3.capMat=cap;")
rr("const R=R3,all=[];", "const R=R3,all=[];if(R.capMat&&R.capFor!==H1){R.capMat.color.set(H1.color);R.capFor=H1}if(shakeT>0)shakeT-=dt;")
rr("R.cam.position.set(R.cx*.95,hgt,R.cz*.45+dist);",
   "const sk=shakeT>0?shakeT*1.4:0;R.cam.position.set(R.cx*.95+(Math.random()-.5)*sk,hgt+(Math.random()-.5)*sk,R.cz*.45+dist);")
rr("x.strokeStyle='#c8283a';x.lineWidth=2.5;x.fillStyle='#c8283a';", "x.strokeStyle='#bd1f31';x.lineWidth=4;x.fillStyle='#bd1f31';")

# ---------- game.html ----------
gg("t={def,side,dir:side,ownGX", "t={def,accent:def.accent,side,dir:side,ownGX")
gg("let noteT=0,noteTxt='';", "let shakeT=0,noteT=0,noteTxt='';")
gg("function showBanner(im,a,b,secs){const e=$('banner');$('bi').src=im||'';$('bi').style.display=im?'block':'none';$('bt1').textContent=a;$('bt2').textContent=b;e.style.display='flex';banT=secs}",
   "function showBanner(im,a,b,secs,col){const e=$('banner');$('bi').src=im||'';$('bi').style.display=im?'block':'none';$('bt1').textContent=a;$('bt2').textContent=b;e.style.borderColor=col||'rgba(79,209,197,.55)';e.style.boxShadow=col?'0 12px 40px rgba(0,0,0,.5),0 0 44px '+col:'';e.style.display='flex';e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');banT=secs}")
gg("showBanner(shooter&&shooter.img,`GOAL ${t.abbr}!`,shooter?`${shooter.name} (${shooter.rating})`:'',2.6);",
   "showBanner(shooter&&shooter.img,`GOAL ${t.abbr}!`,shooter?`${shooter.num!=null?'#'+shooter.num+' ':''}${shooter.name} (${shooter.rating})`:'',2.6,t.color);shakeT=.7;{const f=$('flash');f.style.background=t.color;f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}")
gg("$('na').textContent=A1.abbr;$('nh').textContent=H1.abbr;",
   "$('na').textContent=A1.abbr;$('nh').textContent=H1.abbr;$('na').style.borderBottom='3px solid '+A1.color;$('nh').style.borderBottom='3px solid '+H1.color;")
gg('<div id="banner">', '<div id="flash"></div><div id="banner">')
gg('</style>', """
#flash{position:fixed;inset:0;z-index:5;pointer-events:none;opacity:0}
#flash.go{animation:fl .6s ease-out}@keyframes fl{0%{opacity:.5}100%{opacity:0}}
#banner.pop{animation:pop .4s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{0%{transform:translateX(-50%) scale(.55);opacity:0}100%{transform:translateX(-50%) scale(1);opacity:1}}
#bt1{font-size:28px;letter-spacing:1.5px;text-transform:uppercase}
#sb b{border-bottom:3px solid transparent;padding-bottom:2px}
</style>""")

open('r3d.js', 'w', encoding='utf-8').write(r)
open('game.html', 'w', encoding='utf-8').write(g)
print('ok')
