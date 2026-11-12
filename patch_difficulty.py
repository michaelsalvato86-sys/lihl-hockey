import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
# difficulty model: only changes the computer-controlled team (and gives the human goalie a small help on Easy)
g = rep(g, "let PAUSED=false;", """let DIFFV='normal';try{DIFFV=localStorage.getItem('lihl_diff')||'normal'}catch(e){}
function setDiff(v){DIFFV=v;try{localStorage.setItem('lihl_diff',v)}catch(e){}if(G&&!G.net)G.diff=v}
const DIFFK={easy:{spd:.84,shot:1.8,save:-.12,chk:.5,gk:.88},normal:{spd:1,shot:1,save:0,chk:1,gk:1},hard:{spd:1.07,shot:.7,save:.05,chk:1.3,gk:1.05}};
function dkf(t,k){const D=DIFFK[(G&&G.diff)||'normal']||DIFFK.normal;if(!G||!G.hum||G.net)return k==='save'?0:1;if(t===G.hum)return k==='save'?-D.save*.6:1;return D[k]}
let PAUSED=false;""", 'diff vars')
g = rep(g, "const mx=(24+20*p.spd)*", "const mx=(24+20*p.spd)*dkf(p.team,'spd')*", 'speed')
g = rep(g, "*(hum?.58:1)", "*(hum?.58:dkf(p.team,'shot'))", 'shot')
g = rep(g, "ps=ps0*clamp(1-(dy-reach*.6)/(reach*.9),0,1);", "ps=clamp(ps0+dkf(t,'save'),.3,.98)*clamp(1-(dy-reach*.6)/(reach*.9),0,1);", 'save')
g = rep(g, "Math.random()<dt*.35*(.5+p.chk)", "Math.random()<dt*.35*(.5+p.chk)*dkf(p.team,'chk')", 'ai check')
g = rep(g, "const rate=1.0*(.3+d.chk)/(.3+(c.pass+c.spd)/2);", "const rate=1.0*dkf(d.team,'chk')*(.3+d.chk)/(.3+(c.pass+c.spd)/2);", 'poke')
g = rep(g, "G={ev:{},", "G={diff:DIFFV,ev:{},", 'G diff')
# the goalie reaction speed (computer goalie slower on Easy)
g = rep(g, "(30+16*g.gl)*dt", "(30+16*g.gl)*dkf(t,'gk')*dt", 'goalie speed')
# menu control
g = rep(g, '<div class="seg" id="segL"></div>', '<div class="seg" id="segL"></div><div class="seg" id="segD"></div>', 'seg html')
g = rep(g, '<label>Camera <select id="pzView">', '<label>Difficulty <select id="pzDiff"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label>\n <label>Camera <select id="pzView">', 'pause select')
g = rep(g, "document.getElementById('pzView').value=VIEWM;", "document.getElementById('pzView').value=VIEWM;document.getElementById('pzDiff').value=DIFFV;", 'pause value')
g = rep(g, "$('pzView').onchange=e=>setView(e.target.value);", "$('pzView').onchange=e=>setView(e.target.value);$('pzDiff').onchange=e=>setDiff(e.target.value);", 'pause wire')
open('game.html', 'w', encoding='utf-8').write(g)

m = open('menu.js', encoding='utf-8').read()
m = rep(m, "    seg($('segL'), [[120, '2:00'], [180, '3:00'], [300, '5:00']], plen, v => plen = +v);",
        "    seg($('segL'), [[120, '2:00'], [180, '3:00'], [300, '5:00']], plen, v => plen = +v);\n    seg($('segD'), [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], DIFFV, v => setDiff(v));", 'menu seg')
open('menu.js', 'w', encoding='utf-8').write(m)
print('ok')
