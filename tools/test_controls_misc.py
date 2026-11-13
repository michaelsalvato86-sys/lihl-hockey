"""Emulation checks: portrait rotate overlay, gamepad mapping/dead zone/edge repeat, ?q= override, tier downgrade keeps controls."""
import sys
from playwright.sync_api import sync_playwright
base = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8142')
fails = []
def chk(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
with sync_playwright() as p:
    br = p.chromium.launch()
    # portrait
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=3, user_agent=UA)
    pg = ctx.new_page(); pg.goto(base + '/index.html?mobile=1&q=mob'); pg.wait_for_function("typeof newGame==='function'"); pg.wait_for_timeout(1200)
    pg.evaluate("document.getElementById('go').click()"); pg.wait_for_timeout(1500)
    chk(pg.evaluate("getComputedStyle(document.getElementById('rot')).display")=='flex', 'portrait 390x844: rotate overlay shown in game')
    ctx.close()
    for q in ('high', 'std', 'mob', 'low'):
        ctx = br.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, user_agent=UA)
        pg = ctx.new_page(); pg.goto(base + f'/index.html?mobile=1&q={q}'); pg.wait_for_function("typeof newGame==='function'"); pg.wait_for_timeout(1500)
        pg.evaluate("document.getElementById('go').click()"); pg.wait_for_timeout(2000)
        t = pg.evaluate("R3&&R3.tier")
        chk(t == q, f'?q={q} -> R3.tier={t}')
        if q == 'high':
            # hold the stick, force a downgrade, controls/state must survive
            pg.evaluate("input.x=.8;input.y=.2;input.vis=true;G.__mark=123")
            for tier in ('std', 'mob', 'low'):
                pg.evaluate(f"gfxApply('{tier}')"); pg.wait_for_timeout(200)
            st = pg.evaluate("({x:input.x,y:input.y,vis:input.vis,mark:G.__mark,ctl:getComputedStyle(document.getElementById('ctl')).display,tier:R3.tier})")
            chk(st['x'] == .8 and st['y'] == .2 and st['vis'] and st['mark'] == 123 and st['ctl'] == 'block' and st['tier'] == 'low', f'downgrade keeps input/state/controls {st}')
            pg.evaluate("input.x=0;input.y=0;input.vis=false")
        ctx.close()
    # gamepad
    ctx = br.new_context(viewport={'width': 844, 'height': 390}, user_agent=UA)
    pg = ctx.new_page(); pg.goto(base + '/index.html?mobile=1&q=low'); pg.wait_for_function("typeof newGame==='function'"); pg.wait_for_timeout(1200)
    pg.evaluate("document.getElementById('go').click()"); pg.wait_for_timeout(1500)
    pg.evaluate("""window.__gp={connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__gp]""")
    def run(ax, btn, expr):
        return pg.evaluate("([a,b,e])=>{if(a)window.__gp.axes=a;window.__gp.buttons.forEach((x,i)=>{x.pressed=!!(b&&b.includes(i));x.value=x.pressed?1:0});pollPad();return eval(e)}", [ax, btn, expr])
    pg.evaluate("window.__run=0")
    chk(run([.15,-.1],[],"GP.x==0&&GP.y==0"), 'dead zone .2 swallows .15 drift')
    chk(abs(run([1,0],[],"GP.x")-1)<1e-6, 'full deflection = 1.0 (rescaled)')
    chk(run([0,0],[2],"input.pass")==1, 'X(2) -> pass')
    chk(pg.evaluate("()=>{input.pass=0;pollPad();return input.pass}")==0, 'held X does not repeat pass')
    run(None,[],"0")
    chk(run(None,[1],"input.hit")==1, 'B(1) -> hit')
    run(None,[],"0")
    chk(run(None,[3],"input.sw")==1, 'Y(3) -> change')
    chk(run(None,[4],"GP.vis"), 'LB(4) -> vision')
    run(None,[],"0")
    chk(run(None,[0],"!!input.sd"), 'A(0) press starts shot charge')
    chk(run(None,[],"input.shoot")==1, 'A release fires shot')
    ctx.close(); br.close()
print('FAILS', len(fails)); sys.exit(1 if fails else 0)
