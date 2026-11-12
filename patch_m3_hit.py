import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
# checking: no velocity at the press; the lunge starts at the commitment marker (0.16 s into the hit)
g=rep(g,"if(bt){p.hitTgt=bt;const dd=hyp(bt.x-p.x,bt.y-p.y)||1;p.vx+=(bt.x-p.x)/dd*12;p.vy+=(bt.y-p.y)/dd*12}}}",
        "p.hitC=0;p.hitTgt=bt||null}}",'hitwind')
g=rep(g,"if(h.hitT>0){h.hitT-=dt;if(h.hitT<=.44)for(const v of onIce(t.opp)){",
        "if(h.hitT>0){h.hitT-=dt;if(!h.hitC&&h.hitT<=.44){h.hitC=1;const bt=h.hitTgt;if(bt&&bt.on!==false){const dd=hyp(bt.x-h.x,bt.y-h.y)||1;h.vx+=(bt.x-h.x)/dd*14;h.vy+=(bt.y-h.y)/dd*14;AE(h,'hitcommit',{a:Math.atan2(bt.y-h.y,bt.x-h.x)})}}if(h.hitT<=.44)for(const v of onIce(t.opp)){",'commit')
# victim reaction depends on where the hit came from relative to the facing: front, side or from behind
g=rep(g,"AE(v,'checked',{power:pw,board:brd,dir:Math.atan2(uy,ux),side:(Math.floor(G.clock*7)%2)?1:-1});",
        "{let da=Math.atan2(uy,ux)-v.fa;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;const ad=Math.abs(da),from=ad<1.0?'behind':ad>2.2?'front':'side';AE(v,'checked',{power:pw,board:brd,dir:Math.atan2(uy,ux),side:da>0?1:-1,from})}",'from')
# a missed check leaves the hitter off balance (recovery)
g=rep(g,"if(!h.hitHit)AE(h,'hitmiss',{})}}","if(!h.hitHit){AE(h,'hitmiss',{});h.stun=Math.max(h.stun,.3);h.vx*=.5;h.vy*=.5}}}",'miss')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
