import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
# AI shots wind up for 0.22 s (and cancel if the puck is lost), so the animation can show a real preparation
a = "shoot(p,0,0,false);return}"
assert g.count(a) == 2, g.count(a)
g = g.replace(a, "aiWind(p);return}")
g = rep(g, "function shoot(p,ix,iy,hum,pw){", "function aiWind(p){if(p.shotQ>0)return;p.shotQ=.22;p.aiT=.5;AE(p,'shotwind',{kind:'wrist'})}\nfunction shoot(p,ix,iy,hum,pw){", 'aiWind')
g = rep(g, "p.oneT=Math.max(0,(p.oneT||0)-dt);", "p.oneT=Math.max(0,(p.oneT||0)-dt);if(p.shotQ>0){p.shotQ-=dt;if(p.shotQ<=0){p.shotQ=0;if(puck.owner===p&&!G.over)shoot(p,0,0,false)}}", 'process')
# fatigue now matters: shot accuracy and check strength
g = rep(g, "*(hum?.58:dkf(p.team,'shot'))", "*(hum?.58:dkf(p.team,'shot'))*(1+(1-(p.st===undefined?1:p.st))*.5)", 'fatigue shot')
g = rep(g, "const kb=16+24*h.chk-8*v.def;", "const kb=(16+24*h.chk-8*v.def)*(.75+.25*(h.st===undefined?1:h.st));", 'fatigue check')
open('game.html', 'w', encoding='utf-8').write(g)

r = open('r3d.js', encoding='utf-8').read()
r = rep(r, "c.charge=(p===ctl&&typeof input!=='undefined'&&input.sd)?Math.min(1,(performance.now()-input.sd)/700):0;",
        "c.charge=(p===ctl&&typeof input!=='undefined'&&input.sd)?Math.min(1,(performance.now()-input.sd)/700):(p.shotQ>0?Math.min(1,(1-p.shotQ/.22))*.8:0);", 'charge')
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
