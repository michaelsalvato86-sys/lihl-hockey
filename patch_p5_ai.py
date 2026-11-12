import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
fns="""// ---------- Mega Pass 5: situation awareness, forecheck modes, coverage, shot quality ----------
function posture(t){const d=G.score[t===H1?0:1]-G.score[t===H1?1:0],late=G.period>=3&&G.clock<G.plen*.4;return late&&d!==0?(d<0?1:-1):0}
function fcMode(t){const po=posture(t);return po>0?'agg':po<0?'cons':(t.fcPref||'std')}
function laneClear(p,tx,ty){let m=9e9;for(const o of onIce(p.team.opp)){const sx=tx-p.x,sy=ty-p.y,l2=sx*sx+sy*sy||1,tt=clamp(((o.x-p.x)*sx+(o.y-p.y)*sy)/l2,0,1),dd=hyp(p.x+sx*tt-o.x,p.y+sy*tt-o.y);if(dd<m)m=dd}return m}
function shotQ(p,dg,rd){const t=p.team,gk=t.opp.goalie,lane=laneClear(p,t.oppGX,MY);let q=1-dg/rd;if(Math.abs(p.y-MY)<14&&dg<40)q+=.18;if(lane<3)q*=.5;if(Math.abs(gk.y-MY)>2.5)q+=.1;for(const m of onIce(t))if(m!==p&&hyp(m.x-t.oppGX,m.y-MY)<14){if(dg>30)q+=.08;break}q+=.08*posture(t)+.04*(p.shot-.5);return clamp(q,0,1)}
// defensive coverage: a non-pressing defender picks up the dangerous opponent nearest to him, goal side, instead of drifting to a fixed spot
function cover(p){const t=p.team,o=t.opp;let tgt=null,bd=9e9;for(const q of onIce(o)){if(q===puck.owner)continue;if(hyp(q.x-t.ownGX,q.y-MY)>56)continue;let mine=null,md=9e9;for(const m of onIce(t)){if(t.rank.get(m)<=1)continue;const dd=hyp(m.x-q.x,m.y-q.y);if(dd<md){md=dd;mine=m}}if(mine===p&&md<bd){bd=md;tgt=q}}
 if(tgt){go(p,tgt.x+(t.ownGX-tgt.x)*.3,tgt.y+(MY-tgt.y)*.3,.95);return}formation(p,'def')}
"""
g=rep(g,"function carry(p,dt){",fns+"function carry(p,dt){",'fns')
g=rep(g,"if(dg<rd&&(Math.random()<rm*(.05+.11*(1-dg/rd))||(press<6&&Math.random()<.08*rm))){aiWind(p);return}",
        "if(dg<rd){const q=shotQ(p,dg,rd);if(Math.random()<rm*(.03+.22*q*q)||(press<6&&q>.25&&Math.random()<.1*rm)){aiWind(p);return}}",'shot sel')
g=rep(g,"if(best&&pass(p,(best.x-p.x),(best.y-p.y)))return}","if(best&&pass(p,(best.x+best.vx*.3-p.x),(best.y+best.vy*.3-p.y)))return}",'lead')
g=rep(g,"else if(rk===1&&hyp(own.x-p.x,own.y-p.y)<32)go(p,own.x+(t.ownGX-own.x)*.22,own.y+(MY-own.y)*.3,.9);else formation(p,'def')}",
        "else{const fc=fcMode(t),atk=t.dir*(own.x-t.oppGX)>-62,near=hyp(own.x-p.x,own.y-p.y);if(rk===1&&(fc==='two'||(fc==='agg'&&atk)||(near<32&&fc!=='cons')))go(p,own.x+(t.ownGX-own.x)*.22,own.y+(MY-own.y)*.3,fc==='std'?.9:1);else cover(p)}}",'defense')
# faceoff: a real draw. The winner's center pulls the puck back toward his side; some draws are scrambles
g=rep(g,"puck.vx=puck.vy=0;puck.owner=null;if(w){puck.owner=w;puck.last=w}if(c1)AE(c1,'draw');",
        "puck.vx=puck.vy=0;puck.owner=null;if(w){puck.last=w;if(Math.random()<.22){puck.vx=rnd(-14,14);puck.vy=rnd(-14,14);puck.cool=0}else{const bk=-w.team.dir;puck.vx=bk*rnd(26,40);puck.vy=rnd(-14,14);puck.cool=.12}}if(c1)AE(c1,'draw');",'faceoff')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
