import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
fn="""// ---------- goal replay (offline): ring buffer of the last ~7 s at 20 Hz, played back once at 0.6x from a low camera behind the net ----------
function recTick(dt){if(G.net||G.rp||G.attract)return;G.rt=(G.rt||0)+dt;if(G.rt<.05)return;G.rt-=.05;const R=G.rec||(G.rec=[]),pl=[];
 for(const t of [H1,A1]){for(const p of onIce(t))pl.push([p,p.x,p.y,p.vx,p.vy,p.fa||0,p.stun||0]);const g=t.goalie;if(g)pl.push([g,g.x,g.y,g.vx||0,g.vy||0,g.fa||0,0])}
 R.push({px:puck.x,py:puck.y,pvx:puck.vx,pvy:puck.vy,pl});if(R.length>150)R.shift()}
function startReplay(){const fr=G.rpPend;G.rpPend=null;if(!fr||fr.length<20){G.pause=.05;return}
 const save=[],seen=new Set();for(const f of fr)for(const e of f.pl)if(!seen.has(e[0])){seen.add(e[0]);const p=e[0];save.push([p,p.x,p.y,p.vx,p.vy,p.fa,p.on])}
 G.rp={fr,t:0,gx:G.rpGX,save,pw:puck.owner,ps:[puck.x,puck.y,puck.vx,puck.vy],skip:0};puck.owner=null;document.body.classList.add('replay')}
function tickReplay(dt){const r=G.rp;r.t+=dt*.6;const f=r.t/.05,i=Math.floor(f);if(r.skip||i>=r.fr.length-1){endReplay();return}const a=f-i,A=r.fr[i],B=r.fr[i+1];
 puck.x=A.px+(B.px-A.px)*a;puck.y=A.py+(B.py-A.py)*a;puck.vx=A.pvx;puck.vy=A.pvy;
 for(let k=0;k<A.pl.length;k++){const e=A.pl[k],q=B.pl[k],p=e[0];if(!q||q[0]!==p)continue;p.x=e[1]+(q[1]-e[1])*a;p.y=e[2]+(q[2]-e[2])*a;p.vx=e[3];p.vy=e[4];let d=q[5]-e[5];while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;p.fa=e[5]+d*a;p.on=true}}
function endReplay(){const r=G.rp;G.rp=null;document.body.classList.remove('replay');for(const s of r.save){const p=s[0];p.x=s[1];p.y=s[2];p.vx=s[3];p.vy=s[4];p.fa=s[5];p.on=s[6]}puck.x=r.ps[0];puck.y=r.ps[1];puck.vx=r.ps[2];puck.vy=r.ps[3];puck.owner=r.pw;G.rec=[];G.pause=.05}
"""
g=rep(g,"function callPenalty(t,p,why){",fn+"function callPenalty(t,p,why){",'fns')
# record on goal
g=rep(g,"let ast=null;if(shooter&&G.lp","if(!G.net&&G.rec&&G.rec.length>20&&!G.ot){G.rpPend=G.rec.slice();G.rpGX=t.opp.ownGX}let ast=null;if(shooter&&G.lp",'goal')
# playback hooks
g=rep(g,"if(G.pause>0){G.pause-=dt;if(G.fight)tickFight(dt);","if(G.rp){tickReplay(dt);return}\n if(G.pause>0){G.pause-=dt;if(G.pause<=0&&G.rpPend&&!G.over){startReplay();return}if(G.fight)tickFight(dt);",'hooks')
g=rep(g,"else if(!f.dropped)dropPuck()}return}","else if(!f.dropped)dropPuck()}return}\n recTick(dt);",'rec')
g=rep(g,"#end{display:none;","body.replay #rpl{display:block}#rpl{display:none;position:fixed;left:14px;top:62px;z-index:8;background:#c8202a;color:#fff;font:900 14px system-ui;letter-spacing:.16em;padding:5px 12px;border-radius:6px}\n#end{display:none;",'css')
g=rep(g,'<div id="end">','<div id="rpl">INSTANT REPLAY &middot; tap to skip</div><div id="end">','dom')
g=rep(g,"addEventListener('keydown',e=>{","addEventListener('pointerdown',()=>{if(G&&G.rp)G.rp.skip=1});\naddEventListener('keydown',e=>{if(G&&G.rp)G.rp.skip=1;",'skip')
open('game.html','w',encoding='utf-8').write(g)
r=open('r3d.js',encoding='utf-8').read()
old="R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36}"
assert r.count(old)==1
r=r.replace("else{R.cam.position.set(R.cx*.93+(Math.random()-.5)*sk,hgt+(Math.random()-.5)*sk,R.cz*.5+dist);R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36}",
 "else{R.zk=(R.zk||0)+(clamp((Math.abs(R.cx)-45)/40,0,1)-(R.zk||0))*Math.min(1,dt*2.5);const zf=1-.16*R.zk,hf=1-.1*R.zk;R.cam.position.set(R.cx*.93+(Math.random()-.5)*sk,hgt*hf+(Math.random()-.5)*sk,R.cz*.5+dist*zf);R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36}",1)
old2=" if(R.cam.fov!==R.pfov){R.cam.updateProjectionMatrix();R.pfov=R.cam.fov}"
assert r.count(old2)==1
r=r.replace(old2," if(G.rp){const gx=G.rp.gx-W/2,sg=gx<0?-1:1,pz=puck.y-H/2;R.cam.position.set(gx+sg*15,5.5,pz*.4);R.cam.lookAt(puck.x-W/2,1,pz);R.cam.fov=asp<1?62:50}\n"+old2,1)
open('r3d.js','w',encoding='utf-8').write(r)
print('ok')
