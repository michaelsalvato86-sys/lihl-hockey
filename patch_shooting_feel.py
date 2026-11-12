import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:100]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
# aim: with no stick input, a human shot goes to the goalie-far corner; with input, mostly your aim plus a little assist
g = rep(g, "else{const ay=hum&&im>.3?MY+clamp(iy,-1,1)*4.5:MY+rnd(-4,4);ang=Math.atan2(ay-p.y,t.oppGX-p.x)}",
        "else{const gk=t.opp.goalie,farY=clamp(MY-(gk.y-MY)*.9+((gk.y>=MY)?-2.4:2.4),MY-4.2,MY+4.2),ay=hum?(im>.3?.7*(MY+clamp(iy,-1,1)*4.2)+.3*farY:farY):MY+rnd(-4,4);ang=Math.atan2(ay-p.y,t.oppGX-p.x)}", 'aim')
# human aim error smaller
g = rep(g, "*(hum?.58:dkf(p.team,'shot'))", "*(hum?.42:dkf(p.team,'shot'))", 'error')
# shot blocks were far too frequent
g = rep(g, "if(dd<2.6&&Math.random()<.18+.4*o.def){", "if(dd<2.4&&Math.random()<.09+.24*o.def){", 'blocks')
open('game.html', 'w', encoding='utf-8').write(g)

t = open('server/test_feel.js', encoding='utf-8').read()
t = t.replace("out.tapOnTarget < 0.5 || out.tapOnTarget > 0.8", "out.tapOnTarget < 0.55 || out.tapOnTarget > 0.92").replace("50-80% on-target band", "55-92% on-target band")
open('server/test_feel.js', 'w', encoding='utf-8').write(t)
print('ok')
