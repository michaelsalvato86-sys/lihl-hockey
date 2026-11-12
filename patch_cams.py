import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:80]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()
g = rep(g, "let VIEWV=false;try{VIEWV=localStorage.getItem('lihl_view')==='v'}catch(e){}\nfunction setView(v){VIEWV=!!v;try{localStorage.setItem('lihl_view',v?'v':'s')}catch(e){}}\nfunction vin(x,y){return VIEWV?[-y,x]:[x,y]}",
        "let VIEWM='s';try{VIEWM=localStorage.getItem('lihl_cam')||'s'}catch(e){}\nfunction setView(m){VIEWM=m===true?'v':m===false?'s':m;try{localStorage.setItem('lihl_cam',VIEWM)}catch(e){}const s=document.getElementById('setView');if(s)s.value=VIEWM}\nconst VIEWS=['s','v','b','w'];function nextView(){setView(VIEWS[(VIEWS.indexOf(VIEWM)+1)%VIEWS.length]);if(typeof showBanner==='function')showBanner(null,'CAMERA',{s:'Side view',v:'Up and down',b:'Behind the play',w:'Wide arena'}[VIEWM],1)}\nfunction myDir(){const t=G&&(G.hum||(G.humans&&G.humans[0]&&G.humans[0].team));return t?t.dir:1}\nfunction vin(x,y){if(VIEWM==='v'||VIEWM==='b'){return myDir()>0?[-y,x]:[y,-x]}return[x,y]}", 'vars')
g = rep(g, "{setView(!VIEWV);const s=$('setView');if(s)s.value=VIEWV?'v':'s';return}", "{nextView();return}", 'vkey')
g = rep(g, '<option value="s">Side view</option><option value="v">Up and down view</option>', '<option value="s">Side view (broadcast)</option><option value="v">Up and down</option><option value="b">Behind the play</option><option value="w">Wide arena</option>', 'select')
g = rep(g, '<div class="btn" id="bc">CHANGE</div>', '<div class="btn" id="bc">CHANGE</div><div class="btn" id="bcam">CAM</div>', 'btn')
g = rep(g, "$('bc').addEventListener('pointerdown',e=>{e.preventDefault();input.sw=1});", "$('bc').addEventListener('pointerdown',e=>{e.preventDefault();input.sw=1});$('bcam').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();nextView()});", 'handler')
css = "#bcam{position:fixed;right:70px;top:10px;left:auto;bottom:auto;width:52px;height:34px;border-radius:9px;font-size:12px;padding:0;display:flex;align-items:center;justify-content:center;opacity:.85}\n"
k = g.index('</style>', g.index('#rot{display:none'))
g = g[:k] + css + g[k:]
open('game.html', 'w', encoding='utf-8').write(g)

m = open('menu.js', encoding='utf-8').read()
m = rep(m, "if ($('setView')) { $('setView').value = VIEWV ? 'v' : 's'; $('setView').onchange = e => setView(e.target.value === 'v'); }", "if ($('setView')) { $('setView').value = VIEWM; $('setView').onchange = e => setView(e.target.value); }", 'menu')
open('menu.js', 'w', encoding='utf-8').write(m)

r = open('r3d.js', encoding='utf-8').read()
a = r[r.index("if(VIEWV){R.cam.position.set("): r.index("}else{R.cam.position.set(R.cx*.93")]
b = ("if(VIEWM!=='s'){const ud=myDir();if(VIEWM==='v'){R.cam.position.set(R.cx-ud*(asp<1?24:20)+(Math.random()-.5)*sk,(asp<1?58:50)+spd*4+(Math.random()-.5)*sk,R.cz*.9);R.cam.lookAt(R.cx+ud*(asp<1?30:26),0,R.cz*.9);R.cam.fov=asp<1?56:46}"
     "else if(VIEWM==='b'){R.cam.position.set(R.cx-ud*(asp<1?34:30)+(Math.random()-.5)*sk,(asp<1?20:15)+spd*2,R.cz*.85);R.cam.lookAt(R.cx+ud*34,1.2,R.cz*.85);R.cam.fov=asp<1?60:50}"
     "else{R.cam.position.set(0+(Math.random()-.5)*sk,asp<1?96:78,asp<1?46:56);R.cam.lookAt(0,0,2);R.cam.fov=asp<1?62:40}R.cam.updateProjectionMatrix()")
r = r.replace(a, b, 1)
open('r3d.js', 'w', encoding='utf-8').write(r)
print('ok')
