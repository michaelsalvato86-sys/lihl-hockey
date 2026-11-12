import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()
n = open('net.js', encoding='utf-8').read()
sh = open('server/sim_host.js', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:90]
    return txt.replace(a, b, 1)


# ===================== game.html: animation events =====================
g = rep(g, "const goalPos=t=>[t.oppGX,MY];",
        "function AE(p,k,d){if(!p)return;p.ae={id:(G.aeid=(G.aeid||0)+1),k:k,d:d||{}};if(window.AEHOOK)AEHOOK(p,k,d||{})}\nconst goalPos=t=>[t.oppGX,MY];", 'AE')
g = rep(g, "const sp=(80+70*p.shot)*(.62+.45*pw);",
        "const sp=(80+70*p.shot)*(.62+.45*pw);AE(p,'shot',{kind:pw>.85?'slap':(p.recvAt!==undefined&&p.recvAt-G.clock>=0&&p.recvAt-G.clock<.7)?'onetimer':pw<.45?'snap':'wrist',a:ang});", 'AE shot')
g = rep(g, "G.passFx={x1:p.x,y1:p.y,x2:best.x,y2:best.y,t:.4};AU.sfx('pass');",
        "G.passFx={x1:p.x,y1:p.y,x2:best.x,y2:best.y,t:.4};AU.sfx('pass');AE(p,'pass',{a:a});AE(best,'recv',{});", 'AE pass')
g = rep(g, "if(bd){puck.owner=bd;puck.target=null;puck.shot=null;puck.last=bd}",
        "if(bd){if(puck.target===bd)bd.recvAt=G.clock;AE(bd,'gain');puck.owner=bd;puck.target=null;puck.shot=null;puck.last=bd}", 'AE gain')
g = rep(g, "shakeT=.3;AU.sfx('hit');G.excite=Math.max(G.excite||0,.4);",
        "shakeT=.3;AU.sfx('hit');G.excite=Math.max(G.excite||0,.4);{const pw=Math.min(1,hyp(h.vx-v.vx,h.vy-v.vy)/50);AE(h,'check',{a:Math.atan2(v.y-h.y,v.x-h.x)});AE(v,'checked',{power:pw,side:(Math.floor(G.clock*7)%2)?1:-1});if(pw>.65&&Math.random()<.45)AE(v,'fall',{side:(Math.floor(G.clock*5)%2)?1:-1})}", 'AE hit')
g = rep(g, "puck.owner=d;puck.last=d;c.stun=.6;d.stun=.15;puck.cool=.2;break}",
        "puck.owner=d;puck.last=d;c.stun=.6;d.stun=.15;puck.cool=.2;AE(d,'poke',{a:Math.atan2(c.y-d.y,c.x-d.x)});break}", 'AE poke')
g = rep(g, "puck.vx=puck.vy=0;puck.owner=null;if(w){puck.owner=w;puck.last=w}f.dropped=true}",
        "puck.vx=puck.vy=0;puck.owner=null;if(w){puck.owner=w;puck.last=w}if(c1)AE(c1,'draw');if(c2)AE(c2,'draw');f.dropped=true}", 'AE draw')
g = rep(g, "AU.sfx('save');noteT=1.2;noteTxt='SAVE '+g.name",
        "{const dyy=puck.y-g.y,hh=Math.floor(Math.abs(puck.x*7+puck.y*13+G.clock*5))%3,sd=(dyy*(t.dir>0?-1:1))>0?'l':'r';const kk=Math.abs(dyy)>3.2?'pad':hh===0?'butterfly':hh===2&&Math.abs(dyy)<1.2?'stick':sd==='l'?'glove':'blocker';AE(g,'save',{kind:kk,side:sd,dy:dyy,h:hh})}AU.sfx('save');noteT=1.2;noteTxt='SAVE '+g.name", 'AE save')
g = rep(g, "stopPlay(t.dir>0?31:169,puck.y<MY?22:63,1.6,'WHISTLE','Goalie freezes the puck');return",
        "AE(g,'cover');stopPlay(t.dir>0?31:169,puck.y<MY?22:63,1.6,'WHISTLE','Goalie freezes the puck');return", 'AE cover')
g = rep(g, "function goal(t,shooter){if(G.over)return;const idx=t===H1?0:1;G.score[idx]++;",
        "function goal(t,shooter){if(G.over)return;const idx=t===H1?0:1;G.score[idx]++;AE(t.opp.goalie,'goalagainst');", 'AE goal')
g = rep(g, '<script src="skater_pose.js"></script>', '<script src="skater_pose.js"></script><script src="anim_rig.js"></script><script src="anim_ctrl.js"></script><script src="anim_goalie.js"></script>', 'scripts')

# ===================== r3d.js: drive the animation controller =====================
a0 = r.index("if(m.real&&p.gl){SK.setPose(m,SK.goaliePose(")
a1 = r.index("SK.apply(m,ps)}", a0) + len("SK.apply(m,ps)}")
new = """if(m.real&&p.gl){if(window.GOAL&&GOAL.ready){const c=m.ctx||(m.ctx={puckW:{x:0,y:.22,z:0},opp:{d:99,s:0}});c.puckW.x=puck.x-W/2;c.puckW.z=puck.y-H/2;GOAL.apply(m,p,c,dt)}else{SK.setPose(m,SK.goaliePose(m,performance.now()/1000));SK.ground(m)}}
  else if(m.real){if(window.ANIM&&ANIM.ready){const c=m.ctx||(m.ctx={puckW:{x:0,y:.22,z:0},opp:{d:99,s:0}}),fa=p.fa||0,ch=Math.cos(fa),sn=Math.sin(fa);
   c.speed=sp;c.vf=p.vx*ch+p.vy*sn;c.hasPuck=puck.owner===p;c.faceoff=!!(G.fo&&G.fo.set&&!G.fo.dropped);c.celeb=p.celeb>0;c.charge=(p===ctl&&typeof input!=='undefined'&&input.sd)?Math.min(1,(performance.now()-input.sd)/700):0;
   c.puckW.x=puck.x-W/2;c.puckW.z=puck.y-H/2;let bd=99,bs=0;for(const o of onIce(p.team===H1?A1:H1)){const dx=o.x-p.x,dy=o.y-p.y,d=Math.hypot(dx,dy);if(d<bd){bd=d;bs=dx*sn-dy*ch}}c.opp.d=bd;c.opp.s=bs;
   if(p.ae&&p.ae.d&&p.ae.d.a!==undefined&&p.ae.d.rel===undefined)p.ae.d.rel=-wrapA(p.ae.d.a-fa);if(p.celeb>0)p.celeb-=dt;ANIM.apply(m,p,c,dt)}
  else{const sp01=Math.min(1,sp/36);m.acc=(m.acc||0)+((p.acc01||0)-(m.acc||0))*Math.min(1,dt*10);m.rph=(m.rph||0)+(sp>1.2?dt*(2.2+sp*.13)*(p.back?-.55:1):0);const ln=-clamp((p.turn||0)*.11*Math.min(1,sp/18),-.8,.8);m.lean=(m.lean||0)+(ln-(m.lean||0))*Math.min(1,dt*9);
   const ps=(p.celeb>0)?SK.celebPose(m,performance.now()/1000):SK.skatePose(m,m.rph,sp01,m.lean,m.acc,p.back);if(p.celeb>0)p.celeb-=dt;SK.apply(m,ps)}}"""
r = r[:a0] + new + r[a1:]
# puck sits on the blade while carried (render only)
r = rep(r, "R.puck.position.set(puck.x-W/2,.22,puck.y-H/2);",
        "R.puck.position.set(puck.x-W/2,.22,puck.y-H/2);{const om=puck.owner&&R.meshes.get(puck.owner);if(om&&om.an&&om.an.heelOk&&om.an.heelW){const h=om.an.heelW;if(Math.hypot(h.x-R.puck.position.x,h.z-R.puck.position.z)<1.2){R.puck.position.x=h.x;R.puck.position.z=h.z}}}", 'visual puck')

# ===================== net.js: animation events + faceoff stance from the server =====================
n = rep(n, "    else if (e.e === 'bn') showBanner(",
        "    else if (e.e === 'ae') { const q = pid2p(e.p); if (q) q.ae = { id: (G.aeid = (G.aeid || 0) + 1), k: e.k, d: e.d || {} }; }\n    else if (e.e === 'bn') showBanner(", 'net ae')
n = rep(n, "G.pause = S.pa || 0;", "G.pause = S.pa || 0; G.fo = { set: true, dropped: !S.fo };", 'net fo')

# ===================== server: ship animation events + faceoff flag =====================
sh = rep(sh, "var _goal = goal;", "AEHOOK = function(p,k,d){ EVQ.push({e:'ae', p: pidOf(p), k: k, d: d}); };\nvar _goal = goal;", 'AEHOOK')
sh = rep(sh, "pa: G.pause>0?r1(G.pause):0,", "pa: G.pause>0?r1(G.pause):0, fo: (G.fo&&G.fo.set&&!G.fo.dropped)?1:0,", 'snap fo')
open('game.html', 'w', encoding='utf-8').write(g)
open('r3d.js', 'w', encoding='utf-8').write(r)
open('net.js', 'w', encoding='utf-8').write(n)
open('server/sim_host.js', 'w', encoding='utf-8').write(sh)
print('ok')
