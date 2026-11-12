import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
# vision control: strafe movement, facing tracks the puck (defense) or the net (offense)
g=rep(g,"function skate(p,dt,mx){const dx=p.dvx||0,dy=p.dvy||0,des=Math.min(1,hyp(dx,dy)),sp=hyp(p.vx,p.vy);if(p.fa===undefined)p.fa=0;",
"function skate(p,dt,mx){const dx=p.dvx||0,dy=p.dvy||0,des=Math.min(1,hyp(dx,dy)),sp=hyp(p.vx,p.vy);if(p.fa===undefined)p.fa=0;\n if(p.vis&&!p.box){const off=puck.owner&&puck.owner.team===p.team,tx=off?p.team.oppGX:puck.x,ty=off?MY:puck.y,ta=Math.atan2(ty-p.y,tx-p.x);p.fa+=clamp(wrapA(ta-p.fa),-9*dt,9*dt);const k=Math.min(1,dt*(des>.08?5:2.6)),m2=mx*.86;p.vx+=(dx*m2-p.vx)*k;p.vy+=(dy*m2-p.vy)*k;p.turn=0;p.back=(p.vx*Math.cos(p.fa)+p.vy*Math.sin(p.fa))<-3;p.acc01=des*.35;return}",'skate')
g=rep(g,"return{nx,ny,sh,ps,hit,sw,pw}}","return{nx,ny,sh,ps,hit,sw,pw,vs:input.vis||keys.shift||keys.Shift}}",'read')
g=rep(g,"ev:{sh:0,ps:0,hit:0,sw:0,pw:.5}};","ev:{sh:0,ps:0,hit:0,sw:0,pw:.5}};",'noop') if False else g
g=rep(g,"I={nx,ny,sh:e.sh,ps:e.ps,hit:e.hit,sw:e.sw,pw:e.pw};","I={nx,ny,sh:e.sh,ps:e.ps,hit:e.hit,sw:e.sw,pw:e.pw,vs:hc.inp.vs};",'take')
g=rep(g,"if(hc){const I=hc.I,nx=I.nx,ny=I.ny,ht=hc.team;p.dvx=nx;p.dvy=ny;","if(hc){const I=hc.I,nx=I.nx,ny=I.ny,ht=hc.team;p.dvx=nx;p.dvy=ny;p.vis=!!I.vs;",'flag')
# clear the flag for players no longer controlled
g=rep(g,"const hc=HUM.find(h=>h.ctl===p);p.isCtl=!!hc;","const hc=HUM.find(h=>h.ctl===p);p.isCtl=!!hc;if(!hc)p.vis=false;",'clr')
# mobile button (toggle)
g=rep(g,'<div class="btn" id="bc">CHANGE</div>','<div class="btn" id="bc">CHANGE</div><div class="btn" id="bv">VIS</div>','btn html')
g=rep(g,"#bc{right:30px;bottom:150px;width:84px;height:84px;font-size:12px}","#bc{right:30px;bottom:150px;width:84px;height:84px;font-size:12px}\n#bv{right:236px;bottom:24px;width:68px;height:68px;font-size:13px}#bv.on{box-shadow:0 0 0 3px #6cf,0 0 16px #6cf;border-color:#6cf}",'btn css')
g=rep(g,"const rel=()=>{if(input.sd){","$('bv').addEventListener('pointerdown',e=>{e.preventDefault();input.vis=!input.vis;$('bv').classList.toggle('on',!!input.vis)});\nconst rel=()=>{if(input.sd){",'btn js')
# goalie rebound intention: kick rebounds toward the corner (away from the slot) instead of straight out
g=rep(g,"{const sh=clamp((puck.ss||110)/110,.7,1.35);s3*=sh;","{const cs=puck.y>MY?1:-1,fw0=(t.dir>0?0:Math.PI);a=a+clamp(wrapA(Math.atan2(cs*.9,t.dir*.6)-a),-.9,.9)*(kk==='pad'||kk==='blocker'?.55:.35);const sh=clamp((puck.ss||110)/110,.7,1.35);s3*=sh;",'rebound')
open('game.html','w',encoding='utf-8').write(g)
n=open('net.js',encoding='utf-8').read()
n=rep(n,"hit: I.hit ? 1 : 0, sw: I.sw ? 1 : 0 }); }","hit: I.hit ? 1 : 0, sw: I.sw ? 1 : 0, vs: I.vs ? 1 : 0 }); }",'net')
open('net.js','w',encoding='utf-8').write(n)
s=open('server/sim_host.js',encoding='utf-8').read()
s=rep(s,"if(m.sw) h.ev.sw=1; }","if(m.sw) h.ev.sw=1; h.inp.vs=m.vs?1:0; }",'sim')
open('server/sim_host.js','w',encoding='utf-8').write(s)
r=open('r3d.js',encoding='utf-8').read()
r=rep(r,"c.speed=sp;","c.vis=!!p.vis;c.speed=sp;",'r3d')
open('r3d.js','w',encoding='utf-8').write(r)
a=open('anim_ctrl.js',encoding='utf-8').read()
a=rep(a,"V.crouch + 0.15 * S.prot + 0.12 * S.shuf, 0, 1.2);","V.crouch + 0.15 * S.prot + 0.12 * S.shuf + (c.vis ? 0.16 : 0), 0, 1.2);",'anim')
open('anim_ctrl.js','w',encoding='utf-8').write(a)
print('ok')
