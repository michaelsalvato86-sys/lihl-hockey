'use strict';
// Rating must matter: a higher-rated team must have a clearly higher average top speed and shot skill.
const vm = require('vm'); const { createSim } = require('./sim_host'); const s = createSim(); const T = s.summary().teams;
const aj = T.findIndex(t => t.abbr === 'AJ'), otl = T.findIndex(t => t.abbr === 'OTL'); s.start({ home: aj, away: otl, plen: 120 }); for (let i = 0; i < 5; i++) s.tick();
const r = JSON.parse(vm.runInContext(`JSON.stringify([H1,A1].map(t=>({a:t.abbr,rating:t.roster.reduce((x,p)=>x+p.rating,0)/t.roster.length,spd:t.roster.reduce((x,p)=>x+24+20*p.spd,0)/t.roster.length,shot:t.roster.reduce((x,p)=>x+p.shot,0)/t.roster.length})))`, s.ctx));
const [lo, hi] = r[0].rating < r[1].rating ? r : [r[1], r[0]]; const gap = hi.spd / lo.spd - 1;
console.log(JSON.stringify({ lo: lo.a, hi: hi.a, speedGapPct: +(gap * 100).toFixed(1), shotGap: +(hi.shot - lo.shot).toFixed(2) }));
if (gap < 0.08 || hi.shot - lo.shot < 0.08) { console.error('FAIL: rating gap does not show in speed/shot'); process.exit(1); }
console.log('rating tests pass'); process.exit(0);
