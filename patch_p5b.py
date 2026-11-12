import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
# forecheck preference: user's team uses the menu choice, AI teams get a coaching personality
g=rep(g,"function fcMode(t){const po=posture(t);return po>0?'agg':po<0?'cons':(t.fcPref||'std')}",
 "function fcMode(t){const po=posture(t);if(po)return po>0?'agg':'cons';if(t.fcPref)return t.fcPref;if(G&&G.hum===t)return 'std';let h=0;for(const c of t.abbr)h+=c.charCodeAt(0);return['std','std','agg','two','cons'][h%5]}",'fc')
g=rep(g," <label>Camera <select id=\"pzView\">"," <label>Forecheck <select id=\"pzFc\"><option value=\"std\">Standard</option><option value=\"cons\">Conservative</option><option value=\"agg\">Aggressive</option><option value=\"two\">Two player pressure</option></select></label>\n <label>Camera <select id=\"pzView\">",'html')
g=rep(g,"document.getElementById('pzDiff').value=DIFFV;","document.getElementById('pzDiff').value=DIFFV;{const fe=document.getElementById('pzFc');fe.value=(G.hum&&G.hum.fcPref)||'std';fe.disabled=!!G.net;fe.onchange=()=>{if(G&&G.hum&&!G.net)G.hum.fcPref=fe.value}}",'pause')
# fatigue: never change lines while the puck is in our own danger zone
g=rep(g,"t.shiftT%40>8&&!(puck.owner&&puck.owner.team===t))t.shiftT=","t.shiftT%40>8&&Math.abs(puck.x-t.ownGX)>50&&!(puck.owner&&puck.owner.team===t))t.shiftT=",'fatigue')
# contested pickups: strength, balance and fatigue decide who wins a loose-puck battle; winners can knock it loose, losers get bumped on the boards
g=rep(g,"function pickCtl(hc,L){","""function contestPick(bd,all){if(puck.target===bd||bd.oneT>0)return bd;let c=null;for(const o of all){if(o===bd||o.team===bd.team||o.box)continue;if(hyp(o.x-puck.x,o.y-puck.y)<5.2){c=o;break}}if(!c)return bd;
 const f=q=>(q.chk+q.def)*.5+.25*(q.st===undefined?1:q.st)+.1*q.spd,sb=f(bd),so=f(c),win=Math.random()<clamp(.5+(sb-so)*.9,.2,.8)?bd:c,los=win===bd?c:bd,brd=puck.y<7||puck.y>H-7||puck.x<GX+5||puck.x>W-GX-5;
 if(brd&&Math.random()<.6){los.stun=Math.max(los.stun,.3);G.battles=(G.battles||0)+1}
 if(Math.random()<.4){const a=Math.random()*6.283;puck.vx=Math.cos(a)*rnd(14,26);puck.vy=Math.sin(a)*rnd(14,26);puck.cool=.18;puck.last=los;noteT=.8;noteTxt=brd?'BOARD BATTLE':'PUCK BATTLE';G.battles=(G.battles||0)+1;return null}
 return win}
function pickCtl(hc,L){""",'contest')
g=rep(g,"  if(bd){const isP=puck.target===bd,","  if(bd)bd=contestPick(bd,all);if(bd){const isP=puck.target===bd,",'use')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
