import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rd(p):
    return open(p, encoding='utf-8').read()


def wr(p, s):
    open(p, 'w', encoding='utf-8').write(s)


def rep(s, a, b):
    assert s.count(a) == 1, a[:60]
    return s.replace(a, b, 1)


g = rd('game.html')
g = rep(g, "AU.speak('Goal! '+(shooter?shooter.name:t.name));",
        "if(window.ANN&&ANN.mode!=='off')ANN.goal(shooter,t);else AU.speak('Goal! '+(shooter?shooter.name:t.name));")
g = rep(g, "showBanner(p.img,`PENALTY ${t.abbr}`", "if(window.ANN)ANN.penalty(p,why);showBanner(p.img,`PENALTY ${t.abbr}`")
g = rep(g, '<script src="audio.js"></script>', '<script src="audio.js"></script><script src="announcer.js"></script>')
wr('game.html', g)

n = rd('net.js')
n = rep(n, "if (q) q.ae = { id: (G.aeid = (G.aeid || 0) + 1), k: e.k, d: e.d || {} }; }",
        "if (q) { q.ae = { id: (G.aeid = (G.aeid || 0) + 1), k: e.k, d: e.d || {} }; if (window.ANN) ANN.ev(q, e.k, e.d || {}); } }")
n = rep(n, "AU.speak('Goal! ' + (p ? p.name : t.name));",
        "if (window.ANN && ANN.mode !== 'off') ANN.goal(p, t); else AU.speak('Goal! ' + (p ? p.name : t.name));")
wr('net.js', n)

u = rd('ui_body.html')
a = '<label><input type="checkbox" id="setSay" checked> Announcer voice (your browser\'s speech)</label>'
u = rep(u, a, a + '\n <label>Announcers <select id="setAnn"><option value="pro">Professional Broadcast</option><option value="locker">Locker Room</option><option value="off">Off</option></select></label>')
wr('ui_body.html', u)

m = rd('menu.js')
a = "  $('setSay').onchange = e => AU.say = e.target.checked;"
m = rep(m, a, a + "\n  if ($('setAnn') && window.ANN) { $('setAnn').value = ANN.mode; $('setAnn').onchange = e => ANN.setMode(e.target.value); }")
wr('menu.js', m)
print('ok')
