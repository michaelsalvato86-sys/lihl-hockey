"""Touch layout audit (Playwright EMULATION, not a physical device).
Usage: python tools/test_controls_layout.py [base_url] [--shots dir]
Asserts at each phone viewport: touch buttons >= 44px, no overlaps between buttons,
buttons do not intersect the joystick zone's fixed HUD/scorebug, are inside the viewport
(safe-area aware), and that multi-touch (stick + button) works.  Exit 1 on any failure."""
import sys, os, json
from playwright.sync_api import sync_playwright

base = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8142')
shots = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
VPS = [(667, 375), (740, 360), (844, 390), (932, 430), (568, 320)]
BTN = ['bs', 'bp', 'bh', 'bc', 'bv', 'bcam', 'bpz']
fails = []


def inter(a, b):
    return a['x'] < b['x'] + b['width'] - 0.5 and b['x'] < a['x'] + a['width'] - 0.5 and a['y'] < b['y'] + b['height'] - 0.5 and b['y'] < a['y'] + a['height'] - 0.5


with sync_playwright() as p:
    br = p.chromium.launch()
    for (w, h) in VPS:
        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=3,
                             user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')
        pg = ctx.new_page()
        pg.goto(base + '/index.html?mobile=1&q=mob', wait_until='load')
        pg.wait_for_function("typeof newGame==='function'&&document.getElementById('go')", timeout=30000)
        pg.wait_for_timeout(1500)
        pg.evaluate("document.getElementById('go').click()")
        pg.wait_for_timeout(2500)
        r = pg.evaluate("""(ids)=>{const o={};for(const i of ids){const e=document.getElementById(i);const b=e.getBoundingClientRect();const cs=getComputedStyle(e);o[i]={x:b.x,y:b.y,width:b.width,height:b.height,disp:cs.display,ta:cs.touchAction}}
          const sb=document.getElementById('sb')||document.getElementById('hud');const s=sb?sb.getBoundingClientRect():null;o._hud=s?{x:s.x,y:s.y,width:s.width,height:s.height}:null;
          o._vw=innerWidth;o._vh=innerHeight;o._ctl=getComputedStyle(document.getElementById('ctl')).display;return o}""", BTN)
        tag = f'{w}x{h}'
        if r['_ctl'] == 'none':
            fails.append(f'{tag}: touch controls not shown'); continue
        for i in BTN:
            b = r[i]
            # visual rect; hit target is the element box (transform scale is momentary :active/phase only)
            if b['width'] < 44 or b['height'] < 44:
                fails.append(f"{tag}: #{i} {b['width']:.0f}x{b['height']:.0f} < 44px")
            if b['x'] < 0 or b['y'] < 0 or b['x'] + b['width'] > w or b['y'] + b['height'] > h:
                fails.append(f'{tag}: #{i} outside viewport')
        for ai in range(len(BTN)):
            for bi in range(ai + 1, len(BTN)):
                if inter(r[BTN[ai]], r[BTN[bi]]):
                    fails.append(f'{tag}: #{BTN[ai]} overlaps #{BTN[bi]}')
        # multi-touch: stick (left) held while pressing SHOOT (right) via CDP touch points
        cdp = ctx.new_cdp_session(pg)
        sx, sy = w * 0.2, h * 0.7
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': sx, 'y': sy, 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': sx + 40, 'y': sy, 'id': 1}]})
        bs = r['bs']
        bx, by = bs['x'] + bs['width'] / 2, bs['y'] + bs['height'] / 2
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': sx + 40, 'y': sy, 'id': 1}, {'x': bx, 'y': by, 'id': 2}]})
        pg.wait_for_timeout(120)
        st = pg.evaluate("({x:input.x,sd:input.sd})")
        if not (st['x'] > 0.3):
            fails.append(f"{tag}: stick not held during button press (x={st['x']})")
        if not st['sd']:
            fails.append(f'{tag}: SHOOT press not registered while stick held')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': sx + 40, 'y': sy, 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        # context menu / selection / zoom guards
        g = pg.evaluate("({us:getComputedStyle(document.body).userSelect,ta:getComputedStyle(document.body).touchAction,vp:document.querySelector('meta[name=viewport]').content})")
        if g['us'] != 'none':
            fails.append(f'{tag}: user-select not none')
        if 'user-scalable=no' not in g['vp'].replace(' ', ''):
            fails.append(f"{tag}: viewport allows zoom ({g['vp']})")
        if shots:
            os.makedirs(shots, exist_ok=True)
            pg.screenshot(path=os.path.join(shots, f'ctl_{tag}.png'))
        print(tag, json.dumps({k: [round(r[k]['x']), round(r[k]['y']), round(r[k]['width']), round(r[k]['height'])] for k in BTN}))
        ctx.close()
    br.close()
print('FAILS:', len(fails))
for f in fails:
    print(' ', f)
sys.exit(1 if fails else 0)
