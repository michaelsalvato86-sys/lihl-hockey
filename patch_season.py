import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
# assists: the passer whose pass the scorer received within 5 seconds
g=rep(g,"G.passes[t===H1?0:1]++;return true}","G.passes[t===H1?0:1]++;G.lp={from:p,to:best,c:G.clock,per:G.period};return true}",'lp')
g=rep(g,"if(G.goals)G.goals.push({t:idx,name:shooter?shooter.name:t.name,num:shooter?shooter.num:null,per:G.period,clk:G.clock,ot:!!G.ot});if(shooter)pst(shooter).g++;",
"let ast=null;if(shooter&&G.lp&&G.lp.to===shooter&&G.lp.from!==shooter&&G.lp.per===G.period&&G.lp.c-G.clock<5&&G.lp.c-G.clock>=0){ast=G.lp.from;pst(ast).a=(pst(ast).a||0)+1}if(G.goals)G.goals.push({t:idx,name:shooter?shooter.name:t.name,num:shooter?shooter.num:null,per:G.period,clk:G.clock,ot:!!G.ot,a:ast?ast.name:''});if(shooter)pst(shooter).g++;",'ast')
g=rep(g,"L.push('<div>'+(q.ot?'OT':'P'+q.per)+' '+fm2(q.clk)+' &middot; '+ab[q.t]+' &middot; '+(q.num!=null?'#'+q.num+' ':'')+q.name+'</div>')","L.push('<div>'+(q.ot?'OT':'P'+q.per)+' '+fm2(q.clk)+' &middot; '+ab[q.t]+' &middot; '+(q.num!=null?'#'+q.num+' ':'')+q.name+(q.a?' (A: '+q.a.split(' ').pop()+')':'')+'</div>')",'asst show')
g=rep(g,"try{let se=$('esum');","try{if(window.onGameEnd&&!G.net)window.onGameEnd(G)}catch(e){}try{let se=$('esum');",'hook')
open('game.html','w',encoding='utf-8').write(g)
m=open('menu.js',encoding='utf-8').read()
season=open('season_snippet.js',encoding='utf-8').read()
m=rep(m,"  $('go').onclick = () => {",season+"  $('go').onclick = () => {",'season')
open('menu.js','w',encoding='utf-8').write(m)
os.remove('season_snippet.js')
print('ok')
