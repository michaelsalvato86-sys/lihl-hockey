import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def rep(s,a,b,tag=''):
    assert s.count(a)==1, tag+' count=%d: '%s.count(a)+a[:90]
    return s.replace(a,b,1)
g=open('game.html',encoding='utf-8').read()
pad="""// gamepad (standard mapping): left stick skate, A or right trigger shoot (hold to charge), X or left trigger pass, B or right bumper hit, Y change player, left bumper vision control
const GP={x:0,y:0,vis:false,prev:[]};
function pollPad(){const gp=(navigator.getGamepads?navigator.getGamepads():[])[0];if(!gp||!gp.connected){GP.x=GP.y=0;GP.vis=false;return}
 const dz=v=>Math.abs(v)<.2?0:(v-Math.sign(v)*.2)/.8;GP.x=dz(gp.axes[0]||0);GP.y=dz(gp.axes[1]||0);const b=i=>!!(gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>.5)),pr=GP.prev;
 const dn=[b(0)||b(7),b(2)||b(6),b(1)||b(5),b(3)],ed=i=>dn[i]&&!pr[i];GP.vis=b(4);
 if(dn[0]&&!pr[0]&&!input.sd)input.sd=performance.now();if(!dn[0]&&pr[0]&&typeof rel==='function')rel();
 if(ed(1))input.pass=1;if(ed(2))input.hit=1;if(ed(3))input.sw=1;GP.prev=dn}
"""
g=rep(g,"function curIn(){",pad+"function curIn(){",'pad')
g=rep(g,"function curIn(){return vin(input.x+(keys.d","function curIn(){return vin(input.x+GP.x+(keys.d",'x')
g=rep(g,"-(keys.w||keys.ArrowUp?1:0))}","-(keys.w||keys.ArrowUp?1:0)+GP.y)}",'y') if False else g
g=rep(g,"input.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0))}","input.y+GP.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0))}",'y2')
g=rep(g,"function readLocal(){const[ix,iy]=curIn()","function readLocal(){pollPad();const[ix,iy]=curIn()",'poll')
g=rep(g,"vs:input.vis||keys.shift||keys.Shift}}","vs:input.vis||keys.shift||keys.Shift||GP.vis}}",'vs')
open('game.html','w',encoding='utf-8').write(g)
print('ok')
