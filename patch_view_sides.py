import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:80]
    return s.replace(a, b, 1)


# smaller cape for the pope
s = open('skater3d.js', encoding='utf-8').read()
s = rep(s, "cape.scale(hr * 2.7, hr * 1.7, hr * 2.2); cape.translate(hc.x, hc.y - hr * 1.75, hc.z);", "cape.scale(hr * 2.3, hr * 0.95, hr * 1.9); cape.translate(hc.x, hc.y - hr * 1.65, hc.z);", 'cape')
s = rep(s, "trim.scale(hr * 2.7, hr * 2.2, hr * 1); trim.translate(hc.x, hc.y - hr * 1.75, hc.z);", "trim.scale(hr * 2.3, hr * 1.9, hr * 1); trim.translate(hc.x, hc.y - hr * 1.65, hc.z);", 'trim')
open('skater3d.js', 'w', encoding='utf-8').write(s)

g = open('game.html', encoding='utf-8').read()

# ---- teams switch sides each period (P1 original, P2 swapped, P3 original, OT stays as P3)
g = rep(g, "G.period++;G.clock=G.plen;showBanner(null,`END OF PERIOD ${G.period-1}`,'',1.6);faceoff()}",
        "G.period++;G.clock=G.plen;swapSides(G.period===2);showBanner(null,`END OF PERIOD ${G.period-1}`,'Teams switch sides',1.8);faceoff()}", 'period')
g = rep(g, "function curIn(){",
        "function swapSides(want){if(!G||!H1||!A1||!!G.swapped===!!want)return;G.swapped=!!want;for(const t of [H1,A1]){t.dir=-t.dir;const o=t.ownGX;t.ownGX=t.oppGX;t.oppGX=o}puck.rel=null}\nlet VIEWV=false;try{VIEWV=localStorage.getItem('lihl_view')==='v'}catch(e){}\nfunction setView(v){VIEWV=!!v;try{localStorage.setItem('lihl_view',v?'v':'s')}catch(e){}}\nfunction vin(x,y){return VIEWV?[-y,x]:[x,y]}\nfunction curIn(){", 'swap')
# input follows the camera: screen-up = toward the far end in the vertical view
g = rep(g, "function curIn(){return[input.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),input.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)]}",
        "function curIn(){return vin(input.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),input.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0))}", 'curIn')
g = rep(g, "function readLocal(){const ix=input.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),iy=input.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0),im=hyp(ix,iy)",
        "function readLocal(){const[ix,iy]=curIn(),im=hyp(ix,iy)", 'readLocal')
# settings: camera view
a = ' <label>Announcers <select id="setAnn">'
g = rep(g, a, ' <label>Camera <select id="setView"><option value="s">Side view</option><option value="v">Up and down view</option></select></label>\n' + a, 'setting')
# V key toggles the view
g = rep(g, "addEventListener('keydown',e=>{if(e.key==='Tab')", "addEventListener('keydown',e=>{if((e.key==='v'||e.key==='V')&&!/INPUT|SELECT/.test((e.target||{}).tagName)){setView(!VIEWV);const s=$('setView');if(s)s.value=VIEWV?'v':'s';return}if(e.key==='Tab')", 'vkey')
open('game.html', 'w', encoding='utf-8').write(g)

m = open('menu.js', encoding='utf-8').read()
a = "  if ($('setCol') && window.ANN) {"
m = rep(m, a, "  if ($('setView')) { $('setView').value = VIEWV ? 'v' : 's'; $('setView').onchange = e => setView(e.target.value === 'v'); }\n" + a, 'menu')
open('menu.js', 'w', encoding='utf-8').write(m)

r = open('r3d.js', encoding='utf-8').read()
a = "const sk=shakeT>0?shakeT*1.4:0;R.cam.position.set(R.cx*.93+(Math.random()-.5)*sk,hgt+(Math.random()-.5)*sk,R.cz*.5+dist);R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36;R.cam.updateProjectionMatrix();"
assert r.count(a) == 1
b = ("const sk=shakeT>0?shakeT*1.4:0;if(VIEWV){R.cam.position.set(R.cx-(asp<1?24:20)+(Math.random()-.5)*sk,(asp<1?54:44)+spd*4+(Math.random()-.5)*sk,R.cz*.9);R.cam.lookAt(R.cx+(asp<1?30:22),0,R.cz*.9);R.cam.fov=asp<1?54:44;R.cam.updateProjectionMatrix()}else{"
     "R.cam.position.set(R.cx*.93+(Math.random()-.5)*sk,hgt+(Math.random()-.5)*sk,R.cz*.5+dist);R.cam.lookAt(R.cx,1.5,R.cz*.75);R.cam.fov=asp<1?52:36;R.cam.updateProjectionMatrix()}")
r = r.replace(a, b, 1)
open('r3d.js', 'w', encoding='utf-8').write(r)

n = open('net.js', encoding='utf-8').read()
a = "G.clock = S.c; G.period = S.pd;"
n = rep(n, a, "G.clock = S.c; G.period = S.pd; swapSides(S.pd === 2);", 'net')
open('net.js', 'w', encoding='utf-8').write(n)
print('ok')
