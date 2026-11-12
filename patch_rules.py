import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
r = open('r3d.js', encoding='utf-8').read()


def gg(a, b):
    global g
    assert g.count(a) == 1, ('game count %d: ' % g.count(a)) + a[:90]
    g = g.replace(a, b, 1)


def rr(a, b):
    global r
    assert r.count(a) == 1, ('r3d count %d: ' % r.count(a)) + a[:90]
    r = r.replace(a, b, 1)


# ---------- faceoff system ----------
i0 = g.index("function faceoff(first){")
i1 = g.index("// ---------- banner ----------")
faceoff = """function faceoff(){G.fo={x:W/2,y:MY,set:false};G.pause=.01}
function stopPlay(x,y,secs,why,sub){G.fo={x,y,set:false};G.pause=secs;puck.owner=null;puck.vx=puck.vy=0;puck.shot=null;puck.target=null;puck.rel=null;if(G.ev)G.ev[why]=(G.ev[why]||0)+1;if(why)showBanner(null,why,sub||'',secs,null)}
function setupFaceoff(){const f=G.fo;puck.x=f.x;puck.y=f.y;puck.vx=puck.vy=0;puck.owner=null;puck.shot=null;puck.target=null;puck.rel=null;
 for(const t of [H1,A1]){t.needUnit=true;updateUnit(t);const d=t.dir,P={C:[-3.5,0],LW:[-13,-19],RW:[-13,19],LD:[-30,-12],RD:[-30,12]};
  for(const s of SL){const p=t.seats[s];if(!p)continue;p.x=clamp(f.x+d*P[s][0],12,W-12);p.y=clamp(f.y+P[s][1],6,H-6);p.vx=p.vy=0;p.stun=0;p.burst=0;p.fa=d>0?0:Math.PI}
  t.goalie.y=MY;t.goalie.x=t.ownGX+t.dir*3.5}}
function dropPuck(){const f=G.fo,c1=H1.seats.C,c2=A1.seats.C;let w=null;if(c1&&c2){const a=c1.chk+c1.pass,b=c2.chk+c2.pass;w=Math.random()<clamp(.5+(a-b)*.6,.25,.75)?c1:c2}else w=c1||c2;
 puck.vx=puck.vy=0;puck.owner=null;if(w){puck.owner=w;puck.last=w}f.dropped=true}
function clearPuck(p){const t=p.team,ty=p.y<MY?6:H-6,ang=Math.atan2(ty-p.y,t.oppGX-p.x),sp=62+25*p.shot;puck.owner=null;puck.vx=Math.cos(ang)*sp;puck.vy=Math.sin(ang)*sp;puck.x=p.x+Math.cos(ang)*4.2;puck.y=p.y+Math.sin(ang)*4.2;puck.last=p;puck.cool=.4;puck.shot=null;puck.rel={team:t,x:p.x};p.aiT=.6}
function checkRules(px){const r=puck.rel;
 if(r&&!puck.owner){const t=r.team,own=t.dir*(r.x-W/2)<0,gl=t.oppGX,cross=t.dir>0?(px<gl&&puck.x>=gl):(px>gl&&puck.x<=gl);
  if(own&&cross&&!(puck.y>NY[0]&&puck.y<NY[1])&&t.pen.length<=t.opp.pen.length){stopPlay(t.dir>0?31:169,puck.y<MY?22:63,1.8,'ICING',t.abbr+' faceoff in their zone');return true}}
 const lt=puck.last;if(lt&&!puck.owner){const t=lt.team,bl=t.dir>0?125:75,cr=t.dir>0?(px<bl&&puck.x>=bl):(px>bl&&puck.x<=bl);
  if(cr)for(const p of onIce(t)){if(p!==lt&&t.dir*(p.x-bl)>4){stopPlay(t.dir>0?120:80,puck.y<MY?22:63,1.8,'OFFSIDE',p.name.split(' ').pop()+' was in early');return true}}}
 return false}
"""
g = g[:i0] + faceoff + g[i1:]

gg("G={period:1,plen:+$('ml').value,clock:+$('ml').value,score:[0,0],pause:0.01,", "G={ev:{},period:1,plen:+$('ml').value,clock:+$('ml').value,score:[0,0],pause:0.01,")
gg("if(G.pause>0){G.pause-=dt;if(G.pause<=0)faceoff();return}",
   "if(G.pause>0){G.pause-=dt;if(G.pause<=0){const f=G.fo;if(!f.set){setupFaceoff();f.set=true;G.pause=.9}else if(!f.dropped)dropPuck()}return}")
gg("G.pause=2.6;G.pendingFace=true;", "G.pause=2.6;G.fo={x:W/2,y:MY,set:false};")

# ---------- puck release tracking ----------
gg("puck.shot=p;puck.last=p;puck.cool=.35;p.aiT=.5;", "puck.shot=p;puck.last=p;puck.cool=.35;p.aiT=.5;puck.rel={team:t,x:p.x};")
gg("puck.target=best;puck.targetT=1.4;puck.last=p;puck.cool=.3;puck.shot=null;return true}", "puck.target=best;puck.targetT=1.4;puck.last=p;puck.cool=.3;puck.shot=null;puck.rel={team:t,x:p.x};return true}")
gg("if(puck.owner){const o=puck.owner;", "if(puck.owner){const o=puck.owner;puck.rel=null;")
gg("puck.shot=null;puck.cool=.3;noteT=1;noteTxt='BLOCKED by '", "puck.shot=null;puck.rel=null;puck.cool=.3;noteT=1;noteTxt='BLOCKED by '")
gg("puck.shot=null;puck.cool=.5;G.saves[t===H1?0:1]++;noteT=1.2;noteTxt='SAVE '+g.name+(sp?' on '+sp.name:'')",
   "puck.shot=null;puck.rel=null;puck.cool=.5;G.saves[t===H1?0:1]++;noteT=1.2;noteTxt='SAVE '+g.name+(sp?' on '+sp.name:'');if(Math.random()<.3){stopPlay(t.dir>0?31:169,puck.y<MY?22:63,1.6,'WHISTLE','Goalie freezes the puck');return}")
gg("const L=t=>t.dir>0?puck.x<4:puck.x>W-4;", "if(checkRules(px))return;const L=t=>t.dir>0?puck.x<4:puck.x>W-4;")

# ---------- AI: clears and offside discipline ----------
gg("p.aiT-=dt;if(p.aiT<=0&&G.hum!==t||p.aiT<=0&&p!==ctl){",
   "if(d*(p.x-t.ownGX)<38&&press<8&&Math.random()<dt*1.1){clearPuck(p);return}\n p.aiT-=dt;if(p.aiT<=0&&G.hum!==t||p.aiT<=0&&p!==ctl){")
gg("ax=clamp(puck.x+d*o,28,172);", "ax=clamp(puck.x+d*o,28,172);{const bl=d>0?125:75;if(d*(puck.x-bl)<0)ax=d>0?Math.min(ax,bl-5):Math.max(ax,bl+5)}")

# ---------- fatigue ----------
gg("const mx=(26+15*p.spd)*(puck.owner===p?.93:1)", "const mx=(26+15*p.spd)*(.78+.22*(p.st===undefined?1:p.st))*(puck.owner===p?.93:1)")
gg("skate(p,dt,mx);", "skate(p,dt,mx);p.st=clamp((p.st===undefined?1:p.st)-dt*.013*(hyp(p.vx,p.vy)/(26+15*p.spd))*(p===puck.owner?1.1:1),0,1);")
gg("t.shiftT+=dt;if(t.pen.length||t.opp.pen.length)t.ppT+=dt;else t.ppT=0;updateUnit(t);",
   "t.shiftT+=dt;for(const q of t.roster)if(!q.on)q.st=Math.min(1,(q.st===undefined?1:q.st)+dt*.03);{const sk=onIce(t);if(sk.length&&sk.reduce((s,q)=>s+(q.st===undefined?1:q.st),0)/sk.length<.55&&t.shiftT%40>8&&!(puck.owner&&puck.owner.team===t))t.shiftT=(Math.floor(t.shiftT/40)+1)*40}\n  if(t.pen.length||t.opp.pen.length)t.ppT+=dt;else t.ppT=0;updateUnit(t);")
gg("`<br>BOX ${fm(e.t)} ${e.p.name.split(' ').pop()}`;", "`<br>BOX ${fm(e.t)} ${e.p.name.split(' ').pop()}`;if(ctl&&ctl.team===t)s+=`<br>STAM ${Math.round((ctl.st===undefined?1:ctl.st)*100)}%`;")

# ---------- neutral zone dots on the ice ----------
rr("x.strokeStyle='#1f5fc8';x.beginPath();x.arc(1000,425,150,0,7);x.stroke();",
   "for(const[a,b]of[[80,22],[80,63],[120,22],[120,63]]){x.fillStyle='#bd1f31';x.beginPath();x.arc(a*k,b*k,10,0,7);x.fill()}\n x.strokeStyle='#1f5fc8';x.beginPath();x.arc(1000,425,150,0,7);x.stroke();")

open('game.html', 'w', encoding='utf-8').write(g)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
