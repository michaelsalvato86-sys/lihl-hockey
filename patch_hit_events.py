import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
# press: wind-up event + live flag
g = rep(g, "if(I.hit){p.burst=.5;p.hitT=.6;", "if(I.hit){p.burst=.5;p.hitT=.6;p.hitLive=1;p.hitHit=0;", 'press')
g = rep(g, "if(bt){p.hitTgt=bt;const dd=hyp(bt.x-p.x,bt.y-p.y)||1;",
        "AE(p,'hitwind',{a:bt?Math.atan2(bt.y-p.y,bt.x-p.x):(p.fa||0),d:bt?hyp(bt.x-p.x,bt.y-p.y):99});if(bt){p.hitTgt=bt;const dd=hyp(bt.x-p.x,bt.y-p.y)||1;", 'wind')
# contact: mark as landed, board checks, richer events
g = rep(g, "h.stun=.25;h.hitT=0;", "h.stun=.25;h.hitT=0;h.hitHit=1;", 'landed')
g = rep(g, "AE(h,'check',{a:Math.atan2(v.y-h.y,v.x-h.x)});AE(v,'checked',{power:pw,side:(Math.floor(G.clock*7)%2)?1:-1});",
        "const brd=v.y<7||v.y>H-7||v.x<GX+5||v.x>W-GX-5;AE(h,'check',{a:Math.atan2(v.y-h.y,v.x-h.x),board:brd,power:pw});AE(v,'checked',{power:pw,board:brd,dir:Math.atan2(uy,ux),side:(Math.floor(G.clock*7)%2)?1:-1});if(brd){v.stun+=.3;shakeT=.45}", 'events')
# miss detection
g = rep(g, "callPenalty(t,h,'Interference');break}}}}", "callPenalty(t,h,'Interference');break}}}if(h.hitLive&&h.hitT<=0){h.hitLive=0;if(!h.hitHit)AE(h,'hitmiss',{})}}", 'miss')
open('game.html', 'w', encoding='utf-8').write(g)
print('ok')
