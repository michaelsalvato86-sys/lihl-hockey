import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('game.html', encoding='utf-8').read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

# button + layout
rep('<div class="btn" id="bh">HIT</div>', '<div class="btn" id="bh">HIT</div><div class="btn" id="bc">CHANGE</div>')
layout = """
/* NHL94-style layout: SHOOT big bottom-right, PASS left of it, HIT above PASS, CHANGE above SHOOT */
#bs{right:22px;bottom:26px}
#bp{right:145px;bottom:26px}
#bh{right:150px;bottom:122px;width:70px;height:70px;font-size:15px}
#bc{right:30px;bottom:150px;width:84px;height:84px;font-size:13px;letter-spacing:.3px;background:linear-gradient(160deg,#93c5fd,#3b82f6);color:#0b1b3a}
"""
rep('</style>', layout + '</style>')

# switch logic
rep("const hitNow=input.hit||keys.q;input.hit=hitNow?1:0;keys.q=false;",
    "const hitNow=input.hit||keys.q;input.hit=hitNow?1:0;keys.q=false;const swNow=input.sw||keys.r;input.sw=0;keys.r=false;")
rep("if(input.hit){p.burst=.5;p.hitT=.55}",
    "if(input.hit){p.burst=.5;p.hitT=.55}\n   if(swNow&&puck.owner!==p){const L=onIce(ht).filter(q=>q!==p).sort((a,b)=>hyp(a.x-puck.x,a.y-puck.y)-hyp(b.x-puck.x,b.y-puck.y));if(L[0]){G.sel=L[0];G.ctlT=1.2;noteT=.9;noteTxt='CONTROL: '+L[0].name.split(' ').pop()}}")
rep("$('bh').addEventListener('pointerdown',e=>{e.preventDefault();input.hit=1});",
    "$('bh').addEventListener('pointerdown',e=>{e.preventDefault();input.hit=1});$('bc').addEventListener('pointerdown',e=>{e.preventDefault();input.sw=1});")
rep("addEventListener('keydown',e=>{if(e.key===' '){",
    "addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();input.sw=1;return}if(e.key===' '){")
rep("E pass, Q hit. HIT = body check.", "E pass, Q hit, R or Tab = change player. CHANGE button = switch to the nearest teammate (when you have no puck).")
open('game.html', 'w', encoding='utf-8').write(s)
print('ok')
