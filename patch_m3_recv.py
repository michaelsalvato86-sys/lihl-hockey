import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
old=g[g.index("  if(bd){if(puck.target===bd)bd.recvAt=G.clock;AE(bd,'gain');"):]
old=old[:old.index("\n")]
new="""  if(bd){const isP=puck.target===bd,sp0=hyp(puck.vx,puck.vy),ot=bd.oneT>0;if(isP)bd.recvAt=G.clock;
   // the blade has to meet the puck: outcome depends on puck speed, angle to the stick, skill, and whether the player is stunned
   let ang=Math.atan2(puck.y-bd.y,puck.x-bd.x)-bd.fa;while(ang>Math.PI)ang-=2*Math.PI;while(ang<-Math.PI)ang+=2*Math.PI;
   const q=sp0/170+(Math.abs(ang)>1.7?.3:0)+(bd.stun>0?.35:0),pc=clamp(.97-q*.5+(bd.pass-.5)*.28+(bd.isCtl?.06:0),.3,.98);let out='clean';
   if(!ot&&Math.random()>pc){const r=Math.random();out=r<.42?'bobble':r<.62?'difficult':r<.82?'deflect':'miss'}
   if(out==='miss'||out==='deflect'){const a0=Math.atan2(puck.vy,puck.vx)+(out==='deflect'?rnd(-.9,.9):rnd(-.12,.12)),s1=sp0*(out==='deflect'?.6:.92);puck.vx=Math.cos(a0)*s1;puck.vy=Math.sin(a0)*s1;puck.last=bd;puck.cool=out==='miss'?.4:.28;puck.target=null;AE(bd,'gain',{q:out});noteT=.8;noteTxt=out==='miss'?'MISSED THE PASS':'DEFLECTED'}
   else{AE(bd,'gain',{q:out});bd.gainT=G.clock;puck.owner=bd;puck.target=null;puck.shot=null;puck.last=bd;
    if(out==='bobble'){puck.owner=null;puck.vx=bd.vx*.5+rnd(-16,16);puck.vy=bd.vy*.5+rnd(-16,16);puck.cool=.3;noteT=.8;noteTxt='BOBBLED'}
    else if(out==='difficult'){bd.stun=Math.max(bd.stun,.28)}
    if(ot&&puck.owner===bd){const q2=bd.oneI||{nx:0,ny:0,pw:.7},age=G.clock-(bd.oneP||G.clock);bd.oneT=0;const early=age>.62,tight=age<.34;if(!early&&Math.random()<clamp(.9-(sp0-100)/190,.4,.93)){shoot(bd,q2.nx,q2.ny,true,q2.pw);const m=tight?1.15:1.05;puck.vx*=m;puck.vy*=m;noteT=1;noteTxt='ONE-TIMER!'}else{noteT=1;noteTxt='ONE-TIMER MISSED'}}}}}"""
g=g.replace(old,new,1)
g=rep(g,"p.oneT=.9;p.oneI=","p.oneT=.9;p.oneP=G.clock;p.oneI=",'oneP')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
