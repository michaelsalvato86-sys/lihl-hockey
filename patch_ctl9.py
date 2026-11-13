import re
P = 'game.html'
NL=chr(13)+chr(10)
s = open(P, encoding='utf-8', newline='').read().replace(NL, chr(10))
assert 'dbl=' not in s
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a[:60], s.count(a))
    s = s.replace(a, b)


# 1. top-right control stack: sound / cam / pause, all >=44px, no overlap, safe-area aware
rep("#snd{position:fixed;right:10px;top:10px;z-index:6;width:38px;height:34px;padding:0;font-size:16px;display:none;text-align:center;line-height:32px}",
    "#snd{position:fixed;right:max(6px,env(safe-area-inset-right));top:max(6px,env(safe-area-inset-top));z-index:6;width:44px;height:44px;box-sizing:border-box;padding:0;font-size:16px;display:none;text-align:center;line-height:40px}")
rep("#bcam{position:fixed;right:70px;top:10px;left:auto;bottom:auto;width:64px;height:44px;border-radius:9px;font-size:12px;padding:0;display:flex;align-items:center;justify-content:center;opacity:.85}",
    "#bcam{position:fixed;right:max(6px,env(safe-area-inset-right));top:calc(max(6px,env(safe-area-inset-top)) + 50px);left:auto;bottom:auto;width:44px;height:44px;box-sizing:border-box;letter-spacing:0;border-radius:9px;font-size:11px;padding:0;display:flex;align-items:center;justify-content:center;opacity:.85}")
rep("#bpz{position:fixed;right:130px;top:10px;left:auto;bottom:auto;width:46px;height:34px;border-radius:9px;font-size:13px;padding:0;display:flex;align-items:center;justify-content:center;opacity:.85}",
    "#bpz{position:fixed;right:max(6px,env(safe-area-inset-right));top:calc(max(6px,env(safe-area-inset-top)) + 100px);left:auto;bottom:auto;width:44px;height:44px;box-sizing:border-box;letter-spacing:0;border-radius:9px;font-size:13px;padding:0;display:flex;align-items:center;justify-content:center;opacity:.85}\n"
    "body.tc #sr{right:60px}\nbody.tc #iosHint,body.tc #a2hs{display:none!important}\n#bc{right:56px}\n"
    "#ctl,#ctl .btn{touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}\n"
    "#jz{left:env(safe-area-inset-left)}#bs,#bp,#bh,#bc,#bv{margin-right:env(safe-area-inset-right);margin-bottom:env(safe-area-inset-bottom)}\n"
    "@media (max-height:340px){#bs{width:92px;height:92px;font-size:17px}#bp{right:128px;width:68px;height:68px}#bh{right:140px;bottom:100px;width:60px;height:60px}#bc{right:64px;bottom:124px;width:66px;height:66px;font-size:11px}#bv{right:208px;width:56px;height:56px}}")

# 2. mark touch layout active so the info panel steps aside
rep("$('ctl').style.display=(G.hum&&!att)?'block':'none';", "$('ctl').style.display=(G.hum&&!att)?'block':'none';document.body.classList.toggle('tc',!!(G.hum&&!att));")

# 3. double tap protection (same action within 140 ms ignored) + no context menu
rep("$('bh').addEventListener('pointerdown',e=>{e.preventDefault();input.hit=1});$('bc').addEventListener('pointerdown',e=>{e.preventDefault();input.sw=1});",
    "const dbl=(k,f)=>{let t=0;return e=>{e.preventDefault();const n=performance.now();if(n-t<140)return;t=n;f()}};$('bh').addEventListener('pointerdown',dbl('h',()=>{input.hit=1}));$('bc').addEventListener('pointerdown',dbl('c',()=>{input.sw=1}));")
rep("$('bp').addEventListener('pointerdown',e=>{e.preventDefault();input.pass=1});",
    "$('bp').addEventListener('pointerdown',dbl('p',()=>{input.pass=1}));document.addEventListener('contextmenu',e=>{if(!/^(INPUT|SELECT|TEXTAREA)$/.test((e.target||{}).tagName))e.preventDefault()});")

# 4. help text matches real behaviour
a = s.index('<div class="modal" id="mhelp">')
b = s.index('</table>', a)
new = '''<div class="modal" id="mhelp"><div class="card"><h3>CONTROLS</h3><table>
 <tr><td>Skate</td><td>WASD / Arrow keys, left thumb stick, or gamepad left stick</td></tr>
 <tr><td>Shoot</td><td>Hold SPACE to charge, release to shoot: tap = snap, hold = slap (SHOOT button, gamepad A or right trigger). Without the puck, SHOOT = sprint burst, or a one-timer if a pass is coming to you</td></tr>
 <tr><td>Pass</td><td>E, PASS button, gamepad X or left trigger. Aim with the stick. Without the puck it picks the nearest teammate</td></tr>
 <tr><td>Body check</td><td>Q, HIT button, gamepad B or right bumper</td></tr>
 <tr><td>Change player</td><td>R or TAB, CHANGE button, gamepad Y</td></tr>
 <tr><td>Vision control</td><td>Hold SHIFT, toggle VIS button, hold gamepad left bumper</td></tr>
 <tr><td>Camera</td><td>V or CAM button</td></tr>
 <tr><td>Pause</td><td>ESC or P, II button</td></tr>
 <tr><td>Penalties</td><td>Hooking, tripping, slashing, holding, interference: 2:00 minors, power plays and penalty kills are automatic</td></tr>
 <tr><td>Rules</td><td>Faceoffs, icing, offside, line changes, fatigue, goalie pulls: all automatic</td></tr>
 '''
s = s[:a] + new + s[b:]
NL = chr(13) + chr(10)
LF = chr(10)
open(P, 'w', encoding='utf-8', newline='').write(s.replace(LF, NL))
for dst in ('index.html', 'server/game_index.html'):
    d = open(dst, encoding='utf-8', newline='').read().replace(NL, LF).split(LF)
    g = s.split(LF)
    i = next(k for k, l in enumerate(g) if l.startswith('const ROSTER=null;//ROSTER'))
    j = next(k for k, l in enumerate(d) if l.startswith('const ROSTER='))
    g[i] = d[j]
    open(dst, 'w', encoding='utf-8', newline='').write(LF.join(g).replace(LF, NL))
print('ok')
