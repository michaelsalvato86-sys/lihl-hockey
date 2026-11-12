import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
fn="""function maxPen(t,p,why,secs){if(!p||p.box)return;p.box=true;p.on=false;if(puck.owner===p)puck.owner=null;t.pen.push({p,t:secs,why});t.needUnit=true}
function tryFightInj(h,v,pw,brd){
 if(G.over||G.pause>0||G.fight)return;const ht=h.team,vt=v.team;
 // injury: a hard hit can knock the victim out for the rest of the game (never the last healthy skaters)
 if(pw>.5&&Math.random()<.045*pw&&vt.roster.filter(q=>!q.box&&!q.goalie).length>6){v.box=true;v.inj=true;v.on=false;if(puck.owner===v)puck.owner=null;vt.needUnit=true;AE(v,'fall',{side:1});if(window.ANN&&ANN.injury)ANN.injury(v);showBanner(v.img,'INJURY '+vt.abbr,v.name+' is hurt and leaves the game',2.2);G.injuries=(G.injuries||0)+1;return}
 // fight: after a big hit, the victim may drop the gloves (chance grows with the hitter's check rating and the hit power)
 if(pw>.45&&(G.nfights||0)<3&&!h.box&&!v.box&&!h.inj&&!v.inj&&ht.pen.length<2&&vt.pen.length<2&&Math.random()<.04+.1*h.chk*pw){
  G.nfights=(G.nfights||0)+1;const fx=v.x<66?31:v.x>134?169:100,fy=v.y<MY?22:63;stopPlay(fx,fy,4.6,'FIGHT',h.name.split(' ').pop()+' vs '+v.name.split(' ').pop());
  G.fight={a:h,b:v,t:4.2,ph:0,hits:0,sc:0};const mx=(h.x+v.x)/2,my=(h.y+v.y)/2;h.x=mx-2.5;v.x=mx+2.5;h.y=v.y=my;h.fa=0;v.fa=Math.PI;h.vx=h.vy=v.vx=v.vy=0}
}
function tickFight(dt){const f=G.fight;if(!f)return;f.t-=dt;f.ph-=dt;const a=f.a,b=f.b;a.vx=a.vy=b.vx=b.vy=0;
 if(f.t>.8&&f.ph<=0){f.ph=.42;f.hits++;const aw=Math.random()<.5+.5*(a.chk-b.chk);const w=aw?a:b,l=aw?b:a;f.sc+=aw?1:-1;AE(w,'check',{a:Math.atan2(l.y-w.y,l.x-w.x),board:false,power:.45});AE(l,'checked',{power:.35,board:false,dir:Math.atan2(l.y-w.y,l.x-w.x),side:aw?1:-1,from:'front'});shakeT=.15;AU.sfx('hit')}
 if(f.t<=0){const w=f.sc>=0?a:b,l=w===a?b:a;AE(l,'fall',{side:1});showBanner(w.img,'FIGHT','Decision: '+w.name.split(' ').pop(),1.4);maxPen(w.team,w,'Fighting',(G.plen||180)*.33<45?45:Math.round((G.plen||180)*.33/15)*15);maxPen(l.team,l,'Fighting',(G.plen||180)*.33<45?45:Math.round((G.plen||180)*.33/15)*15);G.fight=null}}
"""
g=rep(g,"function callPenalty(t,p,why){",fn+"function callPenalty(t,p,why){",'fns')
g=rep(g,"if(brd){v.stun+=.3;shakeT=.45}","tryFightInj(h,v,pw,brd);if(brd){v.stun+=.3;shakeT=.45}",'hook')
g=rep(g,"if(G.pause>0){G.pause-=dt;for(const t0 of","if(G.pause>0){G.pause-=dt;if(G.fight)tickFight(dt);for(const t0 of",'pause')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
