import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()


def rep(a, b, tag):
    global g
    assert g.count(a) == 1, tag + ' count=%d: ' % g.count(a) + a[:90]
    g = g.replace(a, b, 1)


i0 = g.index("const ht=G.hum;ctl=null;if(ht){")
i1 = g.index("else aiPlayer(p,dt);", i0) + len("else aiPlayer(p,dt);")
new = """const HUM=G.humans||[];ctl=null;
 for(const hc of HUM){const ht=hc.team;hc.ctlT-=dt;const L=onIce(ht);
  if(puck.owner&&puck.owner.team===ht)hc.ctl=puck.owner;else{hc.ctl=hc.sel&&hc.sel.on&&hc.ctlT>0?hc.sel:L.slice().sort((a,b)=>hyp(a.x-puck.x,a.y-puck.y)-hyp(b.x-puck.x,b.y-puck.y))[0];if(hc.ctl!==hc.sel){hc.sel=hc.ctl;hc.ctlT=.4}}
  if(puck.owner&&puck.owner.team===ht)hc.sel=hc.ctl;
  hc.I=hc.local?readLocal():hc.take()}
 if(HUM[0])ctl=HUM[0].ctl;
 for(const t of [H1,A1])for(const p of onIce(t)){
  const hc=HUM.find(h=>h.ctl===p);p.isCtl=!!hc;
  if(hc){const I=hc.I,nx=I.nx,ny=I.ny,ht=hc.team;p.dvx=nx;p.dvy=ny;
   if(I.sh){if(puck.owner===p)shoot(p,nx,ny,true,I.pw||.5);else{p.burst=.45}}
   if(I.hit){p.burst=.5;p.hitT=.55}
   if(I.sw&&puck.owner!==p){const L=onIce(ht).filter(q=>q!==p).sort((a,b)=>hyp(a.x-puck.x,a.y-puck.y)-hyp(b.x-puck.x,b.y-puck.y));if(L[0]){hc.sel=L[0];hc.ctlT=1.2;if(hc.local){noteT=.9;noteTxt='CONTROL: '+L[0].name.split(' ').pop()}}}
   if(I.ps){if(puck.owner===p)pass(p,nx,ny);else{const L=onIce(ht).filter(q=>q!==p).sort((a,b)=>hyp(a.x-puck.x,a.y-puck.y)-hyp(b.x-puck.x,b.y-puck.y));if(L[0]){hc.sel=L[0];hc.ctlT=1.2}}}}
  else aiPlayer(p,dt);"""
g = g[:i0] + new + g[i1:]

readlocal = """function readLocal(){const ix=input.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),iy=input.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0),im=hyp(ix,iy),nx=im>1?ix/im:ix,ny=im>1?iy/im:iy;
 const sh=input.shoot,ps=input.pass||keys.e,hit=input.hit||keys.q,sw=input.sw||keys.r,pw=input.pw;input.shoot=0;input.pass=0;input.hit=0;input.sw=0;keys.e=false;keys.q=false;keys.r=false;return{nx,ny,sh,ps,hit,sw,pw}}
function mkRemote(team){const hc={team,local:false,ctlT:0,sel:null,ctl:null,inp:{x:0,y:0},ev:{sh:0,ps:0,hit:0,sw:0,pw:.5}};
 hc.take=()=>{const x=+hc.inp.x||0,y=+hc.inp.y||0,im=hyp(x,y),nx=im>1?x/im:x,ny=im>1?y/im:y,e=hc.ev,I={nx,ny,sh:e.sh,ps:e.ps,hit:e.hit,sw:e.sw,pw:e.pw};e.sh=e.ps=e.hit=e.sw=0;return I};return hc}
function step(dt){"""
rep("function step(dt){", readlocal, 'readLocal')
rep("goals:[],shots:[0,0],saves:[0,0]};", "goals:[],shots:[0,0],saves:[0,0]};G.humans=G.hum?[{team:G.hum,local:true,ctlT:0,sel:null,ctl:null}]:[];", 'humans')
open('game.html', 'w', encoding='utf-8').write(g)
print('ok')
