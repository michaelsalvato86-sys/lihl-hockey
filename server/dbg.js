const { createSim } = require('./sim_host');
for (const humans of [0, 2]) {
  const sim = createSim(); sim.start({ home: 1, away: 2, plen: 180 });
  if (humans) { sim.human(0); sim.human(1); }
  let t = 0, g = 0, evs = {};
  while (!sim.over() && t < 60000) { const o = JSON.parse(sim.tick()); for (const e of o.ev) { evs[e.e + (e.n || '')] = (evs[e.e + (e.n || '')] || 0) + 1; } t++; }
  console.log('humans', humans, JSON.stringify(sim.score()), 'ticks', t, JSON.stringify(evs));
}
