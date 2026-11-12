import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
# stat tracking (sim side, so online games get it too)
g=rep(g,"goals:[],shots:[0,0],saves:[0,0]};","goals:[],shots:[0,0],saves:[0,0],hits:[0,0],pims:[0,0],fow:[0,0],passes:[0,0],poss:[0,0],pst:{}};",'init')
g=rep(g,"function shoot(p,ix,iy,hum,pw){pw=pw||.8;","function pst(p){const s=G.pst||(G.pst={});return s[p.name]||(s[p.name]={n:p.name,t:p.team===H1?0:1,g:0,s:0,sv:0,h:0,num:p.num,goalie:!!p.goalie})}\nfunction shoot(p,ix,iy,hum,pw){pw=pw||.8;pst(p).s++;",'shoot')
g=rep(g,"function goal(t,shooter){if(G.over)return;const idx=t===H1?0:1;G.score[idx]++;","function goal(t,shooter){if(G.over)return;const idx=t===H1?0:1;G.score[idx]++;if(G.goals)G.goals.push({t:idx,name:shooter?shooter.name:t.name,num:shooter?shooter.num:null,per:G.period,clk:G.clock,ot:!!G.ot});if(shooter)pst(shooter).g++;",'goal')
g=rep(g,"G.saves[t===H1?0:1]++;AE(g,'save'","G.saves[t===H1?0:1]++;pst(g).sv++;AE(g,'save'",'saves')
g=rep(g,"function tryFightInj(h,v,pw,brd){","function tryFightInj(h,v,pw,brd){G.hits[h.team===H1?0:1]++;pst(h).h++;",'hits')
g=rep(g,"function callPenalty(t,p,why){if(t.pen.length>=2||!p||p.box)return;","function callPenalty(t,p,why){if(t.pen.length>=2||!p||p.box)return;G.pims[t===H1?0:1]++;",'pims')
g=rep(g,"function maxPen(t,p,why,secs){if(!p||p.box)return;","function maxPen(t,p,why,secs){if(!p||p.box)return;G.pims[t===H1?0:1]++;",'pims2')
g=rep(g,"if(w){puck.last=w;if(Math.random()<.22){","if(w){G.fow[w.team===H1?0:1]++;puck.last=w;if(Math.random()<.22){",'fow')
g=rep(g,"puck.cool=.3;puck.shot=null;puck.rel={team:t,x:p.x};return true}","puck.cool=.3;puck.shot=null;puck.rel={team:t,x:p.x};G.passes[t===H1?0:1]++;return true}",'passes')
g=rep(g,"if(puck.cool>0)puck.cool-=dt;","if(puck.owner&&G.poss&&!G.pause)G.poss[puck.owner.team===H1?0:1]+=dt;if(puck.cool>0)puck.cool-=dt;",'poss')
# post-game summary
fin="""function summaryHTML(){const L=[],fm2=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'),ab=[H1.abbr,A1.abbr],pc=G.poss[0]+G.poss[1]||1;
 L.push('<div class="sum">');
 if(G.goals&&G.goals.length){L.push('<div class="sg"><b>SCORING</b>');for(const q of G.goals)L.push('<div>'+(q.ot?'OT':'P'+q.per)+' '+fm2(q.clk)+' &middot; '+ab[q.t]+' &middot; '+(q.num!=null?'#'+q.num+' ':'')+q.name+'</div>');L.push('</div>')}
 const row=(n,a,b)=>'<tr><td>'+a+'</td><th>'+n+'</th><td>'+b+'</td></tr>';
 L.push('<table class="st"><tr><td><b>'+ab[0]+'</b></td><th></th><td><b>'+ab[1]+'</b></td></tr>'+row('SHOTS',G.shots[0],G.shots[1])+row('SAVES',G.saves[0],G.saves[1])+row('HITS',G.hits[0],G.hits[1])+row('PASSES',G.passes[0],G.passes[1])+row('FACEOFFS WON',G.fow[0],G.fow[1])+row('PENALTY MIN',G.pims[0],G.pims[1])+row('POSSESSION',Math.round(100*G.poss[0]/pc)+'%',Math.round(100*G.poss[1]/pc)+'%')+'</table>');
 const st=Object.values(G.pst||{}).map(p=>({p,v:p.g*3+p.s*.25+p.sv*.12+p.h*.15})).sort((a,b)=>b.v-a.v).slice(0,3);
 if(st.length){L.push('<div class="sg"><b>THREE STARS</b>');st.forEach((x,i)=>{const p=x.p;L.push('<div>'+'\u2605'.repeat(3-i)+' '+p.name+' ('+ab[p.t]+') '+(p.goalie?p.sv+' saves':p.g+' G, '+p.s+' SOG, '+p.h+' hits')+'</div>')});L.push('</div>')}
 L.push('</div>');return L.join('')}
"""
g=rep(g,"function finish(){",fin+"function finish(){",'fin')
g=rep(g,"$('end').style.display='flex'}","try{let se=$('esum');if(!se){se=document.createElement('div');se.id='esum';$('es').after(se)}se.innerHTML=summaryHTML()}catch(e){}$('end').style.display='flex'}",'endshow')
g=rep(g,"#end{display:none;","#esum .sum{display:flex;flex-direction:column;gap:12px;max-width:min(92vw,460px);max-height:48vh;overflow:auto;font-size:13px;text-align:left}#esum .sg{display:flex;flex-direction:column;gap:3px;background:rgba(255,255,255,.06);border-radius:10px;padding:8px 12px}#esum .sg b{letter-spacing:.12em;font-size:11px;opacity:.7}#esum .st{width:100%;border-collapse:collapse;background:rgba(255,255,255,.06);border-radius:10px}#esum .st td,#esum .st th{padding:4px 10px;text-align:center;font-weight:600}#esum .st th{font-size:11px;opacity:.7;letter-spacing:.1em}\n#end{display:none;",'css')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
