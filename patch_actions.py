import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def rep(s, a, b, tag=''):
    assert s.count(a) == 1, tag + ' count=%d: ' % s.count(a) + a[:100]
    return s.replace(a, b, 1)


g = open('game.html', encoding='utf-8').read()

# ---------- unified action system: the player performs a wind-up, the puck is released at the contact moment ----------
g = rep(g, "function aiWind(p){if(p.shotQ>0)return;p.shotQ=.22;p.aiT=.5;AE(p,'shotwind',{kind:'wrist'})}",
        """function startAct(p,k,T,a){if(p.act||p.stun>.35)return false;p.act={k,t:T,T,a};AE(p,k==='shot'?'shotwind':'passwind',{kind:a.kind||'',t:T});return true}
function tickAct(p,dt){const c=p.act;if(!c)return;c.t-=dt;if(p.stun>.35||puck.owner!==p||G.over){p.act=null;AE(p,'actcancel',{});return}if(c.t<=0){p.act=null;if(c.k==='shot')shoot(p,c.a.nx,c.a.ny,c.a.hum,c.a.pw);else pass(p,c.a.nx,c.a.ny)}}
function aiWind(p){if(startAct(p,'shot',.2,{nx:0,ny:0,hum:false,pw:.8,kind:'wrist'}))p.aiT=.5}""", 'startAct')
g = rep(g, "if(p.shotQ>0){p.shotQ-=dt;if(p.shotQ<=0){p.shotQ=0;if(puck.owner===p&&!G.over)shoot(p,0,0,false)}}", "tickAct(p,dt);", 'tick')

# ---------- human input: buffering + wind-up actions + one-timer difficulty ----------
a = "   if(I.sh){if(puck.owner===p)shoot(p,nx,ny,true,I.pw||.5);else if(puck.target===p&&hyp(puck.x-p.x,puck.y-p.y)<46){p.oneT=.9;p.oneI={nx,ny,pw:Math.max(.62,I.pw||.5)}}else{p.burst=.45}}"
b = """   let sh=I.sh,ps=I.ps,hit=I.hit,pw0=I.pw;const blocked=!!p.act||p.stun>.25;
   if(hc.buf){hc.buf.t-=dt;if(!blocked){sh=sh||hc.buf.sh;ps=ps||hc.buf.ps;hit=hit||hc.buf.hit;pw0=pw0||hc.buf.pw;hc.buf=null}else if(hc.buf.t<=0)hc.buf=null}
   if((sh||ps||hit)&&blocked){hc.buf={sh,ps,hit,pw:pw0,t:.35};sh=ps=hit=0}
   if(sh){if(puck.owner===p){const pw=pw0||.5;startAct(p,'shot',pw>.85?.26:pw<.6?.09:.14,{nx,ny,hum:true,pw,kind:pw>.85?'slap':pw<.6?'snap':'wrist'})}else if(puck.target===p&&hyp(puck.x-p.x,puck.y-p.y)<46){p.oneT=.9;p.oneI={nx,ny,pw:Math.max(.62,pw0||.5)};AE(p,'otwind',{eta:hyp(puck.x-p.x,puck.y-p.y)/Math.max(20,hyp(puck.vx,puck.vy))})}else{p.burst=.45}}"""
g = rep(g, a, b, 'human shoot')
g = rep(g, "   if(I.hit){p.burst=.5;", "   if(hit){p.burst=.5;", 'hit var')
g = rep(g, "   if(I.ps){if(puck.owner===p)pass(p,nx,ny);else{", "   if(ps){if(puck.owner===p)startAct(p,'pass',.07,{nx,ny});else{", 'pass var')

# one-timer: a hard or awkward pass can be missed (you then simply receive it)
g = rep(g, "if(bd.oneT>0){const q=bd.oneI||{nx:0,ny:0,pw:.7};bd.oneT=0;shoot(bd,q.nx,q.ny,true,q.pw);puck.vx*=1.12;puck.vy*=1.12;noteT=1;noteTxt='ONE-TIMER!'}",
        "if(bd.oneT>0){const q=bd.oneI||{nx:0,ny:0,pw:.7},sp0=hyp(puck.vx,puck.vy);bd.oneT=0;if(Math.random()<clamp(.9-(sp0-100)/190,.4,.93)){shoot(bd,q.nx,q.ny,true,q.pw);puck.vx*=1.12;puck.vy*=1.12;noteT=1;noteTxt='ONE-TIMER!'}else{noteT=1;noteTxt='ONE-TIMER MISSED'}}", 'one-timer')

# ---------- checking: a visible coil before contact (contact is allowed after 0.16 s) ----------
g = rep(g, "h.hitT-=dt;for(const v of onIce(t.opp)){", "h.hitT-=dt;if(h.hitT<=.44)for(const v of onIce(t.opp)){", 'check windup')

# ---------- smarter player switching: closing speed counts, not only distance ----------
g = rep(g, "function startAct(p,k,T,a){", "function swS(q){const dx=puck.x-q.x,dy=puck.y-q.y,d=hyp(dx,dy)||1;return d-.35*(q.vx*dx+q.vy*dy)/d+(q.box?99:0)}\nfunction startAct(p,k,T,a){", 'swS')
g = rep(g, "hc.ctl=hc.sel&&hc.sel.on&&hc.ctlT>0?hc.sel:L.slice().sort((a,b)=>hyp(a.x-puck.x,a.y-puck.y)-hyp(b.x-puck.x,b.y-puck.y))[0];", "hc.ctl=hc.sel&&hc.sel.on&&hc.ctlT>0?hc.sel:L.slice().sort((a,b)=>swS(a)-swS(b))[0];", 'switch auto')
g = rep(g, "if(I.sw&&puck.owner!==p){const L=onIce(ht).filter(q=>q!==p).sort((a,b)=>hyp(a.x-puck.x,a.y-puck.y)-hyp(b.x-puck.x,b.y-puck.y));", "if(I.sw&&puck.owner!==p){const L=onIce(ht).filter(q=>q!==p).sort((a,b)=>swS(a)-swS(b));", 'switch manual')
open('game.html', 'w', encoding='utf-8').write(g)

# ---------- renderer: wind-up progress drives the stance/stick (human and AI, offline and online) ----------
r = open('r3d.js', encoding='utf-8').read()
a = "c.charge=(p===ctl&&typeof input!=='undefined'&&input.sd)?Math.min(1,(performance.now()-input.sd)/700):(p.shotQ>0?Math.min(1,(1-p.shotQ/.22))*.8:0);"
assert r.count(a) == 1
r = r.replace(a, "if(G.net&&p.act){p.act.t-=dt;if(p.act.t<=0)p.act=null}c.charge=(p===ctl&&typeof input!=='undefined'&&input.sd)?Math.min(1,(performance.now()-input.sd)/700):(p.act&&p.act.k==='shot'?Math.min(1,1-p.act.t/p.act.T)*(p.act.T>.2?1:.8):0);", 1)
open('r3d.js', 'w', encoding='utf-8').write(r)

n = open('net.js', encoding='utf-8').read()
a = "q.ae = { id: (G.aeid = (G.aeid || 0) + 1), k: e.k, d: e.d || {} };"
assert n.count(a) == 1
n = n.replace(a, a + " if (e.k === 'shotwind') { const T = (e.d && e.d.t) || .2; q.act = { k: 'shot', t: T, T }; } else if (e.k === 'actcancel' || e.k === 'shot' || e.k === 'passwind') q.act = null;", 1)
open('net.js', 'w', encoding='utf-8').write(n)
print('ok')
