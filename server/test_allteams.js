'use strict';
// Every team must be able to start and play a few simulated seconds against another team (catches short rosters / missing goalies).
const { createSim } = require('./sim_host');
const n = createSim().summary().n; let bad = 0;
for (let i = 0; i < n; i++) {
  const s = createSim();
  try { s.start({ home: i, away: (i + 7) % n, plen: 120 }); for (let k = 0; k < 600; k++) s.tick(); }
  catch (e) { bad++; console.log('FAIL team', i, e.message); }
}
console.log(n + ' teams checked, failures: ' + bad); process.exit(bad ? 1 : 0);
