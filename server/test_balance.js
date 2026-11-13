'use strict';
/* Balance acceptance check: ~40 seeded AI-vs-AI games (3 x 180 s periods) in parallel child processes, asserts means of the
   per-game metrics sit inside wide ranges. Ranges come from 400 games (LIHL_MEGA_PASS_8_BALANCE_REPORT.md): each is the 400-game
   mean +- roughly 5 standard errors of a 40-game mean, so a healthy build essentially never fails by luck.
   Honesty about randomness: Math.random is seeded per game (seed = game index + --seed offset). With the default offset the run is
   deterministic, so it detects CODE changes, it does not re-sample luck. Use `--seed <n>` (or --seed random) to test fresh samples.
   Usage: node server/test_balance.js [--games 40] [--seed 0|random] [--workers 8] */
const { runCfg, ms, ratio } = require('./balance_study');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const games = +arg('games', 40), workers = +arg('workers', 8);
(async () => {
  let off = arg('seed', '0'); if (off === 'random') off = String(Math.floor(Math.random() * 1e6)); off = +off;
  const t0 = Date.now(), R = await runCfgOffset(off);
  async function runCfgOffset(o) { process.env.BAL_SEED_OFFSET = String(o); return runCfg('base', games, 180, workers); }
  const mean = f => R.reduce((a, r) => a + f(r), 0) / R.length;
  const M = [ // name, value, lo, hi
    ['goals/game', mean(r => r.goals), 6.5, 11.5], ['shots/game', mean(r => r.shots), 38, 53], ['goals per shot', ratio(R, 'goals', 'shots').m, 0.15, 0.25],
    ['save% (sv/(sv+g))', mean(r => r.saves / Math.max(1, r.saves + r.goals)), 0.55, 0.76], ['pass completion', ratio(R, 'pc', 'passes').m, 0.72, 0.84],
    ['pass interception', ratio(R, 'pi', 'passes').m, 0.05, 0.14], ['one-timer share of shots', ratio(R, 'k_one', 'shots').m, 0.12, 0.34],
    ['penalties/game', mean(r => r.pim), 2.0, 6.5], ['home possession share', mean(r => r.poss0 / (r.poss0 + r.poss1)), 0.43, 0.57], ['tap-in goals/game', mean(r => r.g_tap), 2.2, 5.5]];
  let bad = 0; console.log('balance: ' + R.length + ' games, seed offset ' + off + ', ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
  for (const [n, v, lo, hi] of M) { const ok = v >= lo && v <= hi; if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + n.padEnd(26) + v.toFixed(3) + '  [' + lo + ', ' + hi + ']'); }
  const stuck = R.filter(r => r.timeout).length; if (stuck) { bad++; console.log('FAIL ' + stuck + ' games hit the tick limit'); }
  if (bad) { console.error('FAIL balance: ' + bad + ' check(s) outside range'); process.exit(1); }
  console.log('PASS balance'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
