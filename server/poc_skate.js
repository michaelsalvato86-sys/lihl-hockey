'use strict';
// Proof of concept: current skate() versus a prototype with edge-radius turning, a grip budget and a real hockey stop
// (ideas from docs/research/02_skating.md). Measures time to speed, stop distance, turn radius at speed, and backskate entry.
// The prototype is NOT integrated into the game; this only compares the numbers.
const { createSim } = require('./sim_host'); const vm = require('vm');
const s = createSim(); s.start({ home: 0, away: 9, plen: 120 }); for (let i = 0; i < 90; i++) s.tick();
const cur = (name, setup) => JSON.parse(vm.runInContext(`(()=>{const p=H1.seats.C;p.x=60;p.y=MY;p.vx=p.vy=0;p.fa=0;p.vis=false;p.box=false;puck.owner=null;${setup};})()`, s.ctx));
const run = code => vm.runInContext(code, s.ctx);
const MX = 40, dt = 1 / 60;
// --- current implementation ---
const A = JSON.parse(run(`(()=>{const p=H1.seats.C;const o={};p.x=60;p.y=MY;p.vx=p.vy=0;p.fa=0;p.dvx=1;p.dvy=0;let t=0;for(;t<6;t+=1/60){skate(p,1/60,${MX});p.x+=p.vx/60;if(Math.hypot(p.vx,p.vy)>${MX}*.9)break}o.t90=+t.toFixed(2);
 // stop: release input at full speed
 p.dvx=0;p.dvy=0;let x0=p.x,ts=0;for(;ts<8;ts+=1/60){skate(p,1/60,${MX});p.x+=p.vx/60;if(Math.hypot(p.vx,p.vy)<2)break}o.stopT=+ts.toFixed(2);o.stopD=+(p.x-x0).toFixed(1);
 // hard reverse input at speed (hockey stop style)
 p.vx=${MX};p.vy=0;p.fa=0;p.dvx=-1;p.dvy=0;x0=p.x;ts=0;for(;ts<8;ts+=1/60){skate(p,1/60,${MX});p.x+=p.vx/60;if(Math.hypot(p.vx,p.vy)<2)break}o.revStopT=+ts.toFixed(2);o.revStopD=+(p.x-x0).toFixed(1);
 // turn radius at speed: full speed then 90 degree input
 p.vx=${MX};p.vy=0;p.fa=0;p.dvx=0;p.dvy=1;let px=p.x,py=p.y,tt=0,maxd=0;for(;tt<3;tt+=1/60){skate(p,1/60,${MX});p.x+=p.vx/60;p.y+=p.vy/60;if(Math.abs(p.fa-Math.PI/2)<.1)break}o.turn90T=+tt.toFixed(2);o.turn90Dx=+(p.x-px).toFixed(1);o.turn90Dy=+(p.y-py).toFixed(1);return JSON.stringify(o)})()`));
// --- prototype: edge radius turning with grip budget and hard-edge stop ---
function skate2(p, dt, mx, inp) {
  const des = Math.min(1, Math.hypot(inp.x, inp.y)), fx = Math.cos(p.fa), fy = Math.sin(p.fa);
  let vf = p.vx * fx + p.vy * fy, vl = -p.vx * fy + p.vy * fx;
  const ta = Math.atan2(inp.y, inp.x); let diff = ta - p.fa; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
  if (des > .08) {
    const sp = Math.hypot(p.vx, p.vy);
    if (Math.abs(diff) > 2.0 && sp > 14) {          // hockey stop: hard edge, big lateral drag, little turning
      const grip = Math.exp(-14 * dt); vf *= Math.exp(-3.2 * dt); vl *= grip;
    } else {
      const Rmin = 3.2 + 0.11 * Math.max(0, vf), edge = Math.max(-1, Math.min(1, diff / 0.9));
      const yaw = (Math.abs(vf) > 1 ? vf : 6) / (Rmin / Math.max(.15, Math.abs(edge)));
      p.fa += Math.sign(edge) * Math.min(Math.abs(yaw), 9) * dt;
      const tgt = des * mx * (.55 + .45 * Math.cos(diff)), a = (36 * (1 - Math.pow(Math.max(0, Math.min(1, vf / mx)), 1.4)) + 6);
      vf = vf < tgt ? Math.min(tgt, vf + a * dt) : Math.max(tgt, vf - 48 * dt);
      vl *= Math.exp(-(4 + 9 * (1 - Math.min(1, sp / mx))) * dt);
    }
  } else { vf *= Math.exp(-.6 * dt); vl *= Math.exp(-6 * dt); }
  const fx2 = Math.cos(p.fa), fy2 = Math.sin(p.fa); p.vx = vf * fx2 - vl * fy2; p.vy = vf * fy2 + vl * fx2;
}
const B = {}; { const p = { x: 60, y: 0, vx: 0, vy: 0, fa: 0 }; let t = 0; for (; t < 6; t += 1 / 60) { skate2(p, dt, MX, { x: 1, y: 0 }); p.x += p.vx * dt; if (Math.hypot(p.vx, p.vy) > MX * .9) break; } B.t90 = +t.toFixed(2);
  p.vx = MX; p.vy = 0; p.fa = 0; let x0 = p.x, ts = 0; for (; ts < 8; ts += 1 / 60) { skate2(p, dt, MX, { x: 0, y: 0 }); p.x += p.vx * dt; if (Math.hypot(p.vx, p.vy) < 2) break; } B.stopT = +ts.toFixed(2); B.stopD = +(p.x - x0).toFixed(1);
  p.vx = MX; p.vy = 0; p.fa = 0; x0 = p.x; ts = 0; for (; ts < 8; ts += 1 / 60) { skate2(p, dt, MX, { x: -1, y: 0 }); p.x += p.vx * dt; if (Math.hypot(p.vx, p.vy) < 2) break; } B.revStopT = +ts.toFixed(2); B.revStopD = +(p.x - x0).toFixed(1);
  p.vx = MX; p.vy = 0; p.fa = 0; let px = p.x, py = p.y, tt = 0; for (; tt < 3; tt += 1 / 60) { skate2(p, dt, MX, { x: 0, y: 1 }); p.x += p.vx * dt; p.y += p.vy * dt; if (Math.abs(p.fa - Math.PI / 2) < .1) break; } B.turn90T = +tt.toFixed(2); B.turn90Dx = +(p.x - px).toFixed(1); B.turn90Dy = +(p.y - py).toFixed(1); }
console.log('current  ', JSON.stringify(A)); console.log('prototype', JSON.stringify(B));
