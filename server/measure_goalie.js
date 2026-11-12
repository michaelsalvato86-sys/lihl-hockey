'use strict';
// Goalie regression: AI vs AI for a few simulated games; reports shots, goals, goals per shot and save percentage.
const { createSim } = require('./sim_host'); const n = createSim().summary().n;
let shots = 0, goals = 0, games = +process.argv[2] || 4;
for (let k = 0; k < games; k++) { const s = createSim(); s.start({ home: (k * 5) % n, away: (k * 5 + 9) % n, plen: 180 }); for (let i = 0; i < 30 * 600 && !s.over(); i++) s.tick(); const r = s.score(); shots += r.sh[0] + r.sh[1]; goals += r.sc[0] + r.sc[1]; }
const gps = goals / Math.max(1, shots); console.log(JSON.stringify({ games, shots, goals, goalsPerShot: +gps.toFixed(3), savePct: +(1 - gps).toFixed(3) }));
if (process.argv.includes('--assert') && (gps < 0.05 || gps > 0.2)) { console.error('FAIL: goals per shot out of 0.05-0.20'); process.exit(1); }
process.exit(0);
