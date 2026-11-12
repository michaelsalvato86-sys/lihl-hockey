import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:90]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()

# ---- goal celebrations: teammates skate to the scorer with arms up while the crowd and camera react
g = rep(g, "G.cele={p:shooter,t:2.6};if(shooter)shooter.celeb=2.6;",
        "G.cele={p:shooter,t:2.6};if(shooter){shooter.celeb=2.6;for(const m of onIce(t))if(m!==shooter){m.celeb=2.4;m.cgo=shooter}}", 'goal cele')
g = rep(g, "if(G.pause>0){G.pause-=dt;if(G.pause<=0){",
        "if(G.pause>0){G.pause-=dt;for(const t0 of [H1,A1])for(const p of onIce(t0)){if(p.cgo&&p.celeb>0){const dx=p.cgo.x-p.x,dy=p.cgo.y-p.y,d=hyp(dx,dy);if(d>5.5){p.vx=dx/d*26;p.vy=dy/d*26;p.x+=p.vx*dt;p.y+=p.vy*dt;p.fa=Math.atan2(dy,dx)}else{p.vx*=.8;p.vy*=.8}p.celeb-=dt*.4}else if(p.cgo){p.cgo=null}}if(G.pause<=0){", 'cele move')

# ---- checking: lock onto the target when HIT is pressed, longer reach on the locked target
g = rep(g, "if(bt){const dd=hyp(bt.x-p.x,bt.y-p.y)||1;", "if(bt){p.hitTgt=bt;const dd=hyp(bt.x-p.x,bt.y-p.y)||1;", 'hit lock')
g = rep(g, "if(d<5.4){const was=puck.owner===v;", "if(d<(h.hitTgt===v?7.4:5.4)){const was=puck.owner===v;", 'hit reach')

# ---- pause
g = rep(g, "else for(let i=0;i<n;i++)step(dt*(SPEED<1?SPEED:1));", "else if(!PAUSED)for(let i=0;i<n;i++)step(dt*(SPEED<1?SPEED:1));", 'loop')
g = rep(g, "function swapSides(want){", """let PAUSED=false;
function togglePause(force){if(!G||G.over||G.attract||document.getElementById('menu').style.display!=='none')return;const o=document.getElementById('pz'),on=force!==undefined?force:o.style.display==='none';if(on){document.getElementById('pzView').value=VIEWM;if(window.ANN){document.getElementById('pzAnn').value=ANN.mode;document.getElementById('pzCol').value=ANN.col}document.getElementById('pzNote').textContent=G.net?'Online match: the game keeps running for your opponent.':'Game paused.'}o.style.display=on?'flex':'none';PAUSED=!!on&&!G.net}
function swapSides(want){""", 'pause fn')
g = rep(g, '<div id="rot">', """<div id="pz" style="display:none"><div class="card"><h3>PAUSED</h3><p id="pzNote"></p>
 <label>Camera <select id="pzView"><option value="s">Side view (broadcast)</option><option value="v">Up and down</option><option value="b">Behind the play</option><option value="w">Wide arena</option></select></label>
 <label>Announcers <select id="pzAnn"><option value="pro">Professional Broadcast</option><option value="locker">Locker Room</option><option value="off">Off</option></select></label>
 <label>Color commentator <select id="pzCol"><option value="f">Female voice</option><option value="m">Male voice</option><option value="off">Off</option></select></label>
 <div class="row"><button id="pzGo" class="go">RESUME</button><button id="pzQuit">QUIT TO MENU</button></div></div></div>
<div id="rot">""", 'pause html')
g = rep(g, '<div class="btn" id="bcam">CAM</div>', '<div class="btn" id="bcam">CAM</div><div class="btn" id="bpz">II</div>', 'pause btn')
g = rep(g, "$('bcam').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();nextView()});",
        "$('bcam').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();nextView()});$('bpz').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();togglePause(true)});$('pzGo').onclick=()=>togglePause(false);$('pzQuit').onclick=()=>location.reload();$('pzView').onchange=e=>setView(e.target.value);$('pzAnn').onchange=e=>window.ANN&&ANN.setMode(e.target.value);$('pzCol').onchange=e=>window.ANN&&ANN.setCol(e.target.value);", 'pause wire')
g = rep(g, "addEventListener('keydown',e=>{if((e.key==='v'", "addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='p'||e.key==='P'){e.preventDefault();togglePause();return}if((e.key==='v'", 'pause key')
css = """#pz{position:fixed;inset:0;z-index:40;background:#050a14e8;align-items:center;justify-content:center;color:#fff}#pz .card{background:linear-gradient(180deg,#121d31,#080e1a);border-top:5px solid #cfd8e6;padding:20px 26px;max-width:460px;width:88vw;max-height:88vh;overflow:auto}#pz h3{margin:0 0 6px;letter-spacing:5px;font-size:26px}#pz p{margin:0 0 10px;opacity:.75;font-size:13px}#pz label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0;font-size:15px;letter-spacing:1px}#pz select{background:#0e1626;color:#fff;border:1px solid #3a4a66;padding:8px;font-size:14px;max-width:62%}#pz .row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}#pz button{padding:12px 18px;font-weight:800;letter-spacing:2px;background:#1a2640;color:#fff;border:1px solid #3a4a66;cursor:pointer}#pz button.go{background:linear-gradient(180deg,#f4f7fa,#b7c1cd);color:#0a1220;flex:1}
#bpz{position:fixed;right:130px;top:10px;left:auto;bottom:auto;width:46px;height:34px;border-radius:9px;font-size:13px;padding:0;display:flex;align-items:center;justify-content:center;opacity:.85}
"""
k = g.index('</style>', g.index('#rot{display:none'))
g = g[:k] + css + g[k:]
open('game.html', 'w', encoding='utf-8').write(g)

n = open('net.js', encoding='utf-8').read()
n = rep(n, "G.cele = { p: p, t: 2.6 }; if (p) p.celeb = 2.6;", "G.cele = { p: p, t: 2.6 }; if (p) { p.celeb = 2.6; for (const m of onIce(t)) if (m !== p) m.celeb = 2.4; }", 'net cele')
open('net.js', 'w', encoding='utf-8').write(n)
print('ok')
