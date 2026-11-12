'use strict';
// Net crowding: average number of skaters within 12 ft of a goalie (excluding the puck carrier), sampled during live play.
const { createSim } = require('./sim_host'); const vm = require('vm'); const n = createSim().summary().n;
let samples = 0, sum = 0, big = 0;
for (let k = 0; k < 3; k++) { const s = createSim(); s.start({ home: (k * 5) % n, away: (k * 5 + 9) % n, plen: 180 }); for (let i = 0; i < 30 * 400 && !s.over(); i++) { s.tick(); if (i % 30 === 0) { const c = +vm.runInContext(`(()=>{let m=0;for(const t of [H1,A1]){const g=t.goalie;let c=0;for(const p of [...onIce(H1),...onIce(A1)])if(p!==puck.owner&&Math.hypot(p.x-g.x,p.y-g.y)<12)c++;m=Math.max(m,c)}return G.pause>0?0:m})()`, s.ctx); samples++; sum += c; if (c >= 4) big++; } } }
console.log(JSON.stringify({ avgSkatersNearAGoalie: +(sum / samples).toFixed(2), pctSamplesWith4Plus: +(100 * big / samples).toFixed(1) }));
