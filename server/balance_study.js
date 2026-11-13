'use strict';
/* Balance study: many seeded AI-vs-AI games in the real Node sim, with per-behavior switches applied as TEXT TRANSFORMS
   of the built sim source (game.html itself carries no flags). Usage:
     node server/balance_study.js run  --cfg base,noOT,... --games 200 --plen 180 --workers 12 --out results.json
     node server/balance_study.js report --in results.json [--base base]
   Configs: base | noOT | noSlot | slotShort | noCrash | noScreen | noAI (all five off) | old79 | old1b (whole older builds; needs BAL_OLD79 / BAL_OLD1B file paths)
   Randomness: Math.random is replaced by a seeded mulberry32 per game (seed = game index), so every config sees the same
   seeds and pairings; games still diverge after the first differing decision. Wall time is not used anywhere. */
const fs = require('fs'), path = require('path'), cp = require('child_process');

// ---------------- configuration transforms (applied to the sim source text) ----------------
const T = {
  noOT: s => rep(s, "if(puck.target===p&&!(p.oneT>0)&&!p.goalie){", "if(false&&puck.target===p&&!(p.oneT>0)&&!p.goalie){"),
  noSlot: s => rep(s, "if(fb&&Math.random()<.35&&pass(", "if(false&&fb&&Math.random()<.35&&pass("),
  slotShort: s => rep(s, "if(gm>40||gm<4||d*(gx-m.x)<6||Math.abs(m.y-MY)>16)continue;", "if(gm>20||gm<4||d*(gx-m.x)<6||Math.abs(m.y-MY)>16)continue;"),
  noCrash: s => rep(s, "if(!ow&&puck.last&&puck.last.team===t&&hyp(puck.x-t.oppGX,puck.y-MY)<32&&", "if(false&&!ow&&puck.last&&puck.last.team===t&&hyp(puck.x-t.oppGX,puck.y-MY)<32&&"),
  noScreen: s => rep(s, "if((s==='LW'||s==='RW')&&s===(puck.y>MY?'LW':'RW')){m[0]=-8;", "if(false&&(s==='LW'||s==='RW')&&s===(puck.y>MY?'LW':'RW')){m[0]=-8;"),
};
function rep(s, a, b) { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('transform anchor not unique/found: ' + a.slice(0, 50)); return s.replace(a, () => b); }
function applyCfg(src, cfg) {
  if (cfg === 'base') return src;
  if (cfg === 'noAI') { for (const k of ['noOT', 'noSlot', 'noCrash', 'noScreen']) src = T[k](src); return src; }
  if (cfg === 'old79' || cfg === 'old1b') return fs.readFileSync(process.env[cfg === 'old79' ? 'BAL_OLD79' : 'BAL_OLD1B'], 'utf8');
  if (!T[cfg]) throw new Error('unknown cfg ' + cfg);
  return T[cfg](src);
}

// ---------------- in-sim instrumentation (runs inside the vm context after load) ----------------
const INSTR = `
var BAL = { shots: [], goals: [], passes: [], gain: [], pk: 0 };
function _el(){ return (G.period - 1) * G.plen + (G.plen - G.clock) + (G.ot ? 0 : 0); }
var _ae = AEHOOK;
AEHOOK = function(p, k, d){
  _ae(p, k, d);
  var tm = p && p.team ? (p.team === H1 ? 0 : 1) : -1;
  if (k === 'shot') { var t = p.team, dg = hyp(t.oppGX - p.x, MY - p.y);
    BAL.shots.push({ tm: tm, x: p.x, y: p.y, dg: dg, gl: Math.abs(t.oppGX - p.x), dy: Math.abs(p.y - MY), kind: d.kind, t: _el(), per: G.period, slot: p.slot, pw: d.pw }); }
  else if (k === 'pass') BAL.passes.push({ tm: tm, t: _el(), res: 0 });
  else if (k === 'gain') BAL.gain.push({ tm: tm, q: d.q, t: _el() });
  else if (k === 'poke') { BAL.pk++; BAL.gain.push({ tm: tm, q: 'poke', t: _el() }); }
};
var _g2 = goal;
goal = function(t, s){ var tm = t === H1 ? 0 : 1; var ls = null; for (var i = BAL.shots.length - 1; i >= 0; i--) if (BAL.shots[i].tm === tm) { ls = BAL.shots[i]; break; }
  BAL.goals.push({ tm: tm, t: _el(), per: G.period, ot: !!G.ot, sh: ls ? BAL.shots.indexOf(ls) : -1, age: ls ? _el() - ls.t : 99 }); _g2(t, s); };
`;

// ---------------- worker: runs games [a, b) of one config and prints per-game records as JSON ----------------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function worker(cfg, a, b, plen) {
  const HTMLP = path.join(__dirname, 'game_index.html'), rf = fs.readFileSync;
  fs.readFileSync = function (p, ...r) { const o = rf.call(fs, p, ...r); if (typeof p === 'string' && path.resolve(p) === path.resolve(HTMLP) && typeof o === 'string') return applyCfg(o, cfg); return o; };
  const { createSim } = require('./sim_host'); fs.readFileSync = rf;
  const vm = require('vm'), nT = createSim().summary().n, out = [];
  for (let k = a; k < b; k++) {
    Math.random = mulberry32((k + (+process.env.BAL_SEED_OFFSET || 0)) * 7919 + 13);
    const home = (k * 7 + 3) % nT; let away = (k * 11 + 5 + ((k / nT) | 0)) % nT; if (away === home) away = (away + 1) % nT;
    const s = createSim(); s.start({ home, away, plen });
    vm.runInContext(INSTR, s.ctx);
    let ticks = 0; const lim = 30 * (plen * 4 + 400);
    while (!s.over() && ticks < lim) { vm.runInContext('G.tick++;step(1/30);EVQ.length=0', s.ctx); ticks++; }
    out.push(summarize(s, vm, home, away, k, ticks, ticks >= lim));
  }
  process.stdout.write('@@' + JSON.stringify(out) + '\n');
}
function summarize(s, vm, home, away, seed, ticks, timeout) {
  const B = JSON.parse(vm.runInContext('JSON.stringify(BAL)', s.ctx)), st = s.stats();
  const goals = B.goals, shots = B.shots, g = [0, 0, 0, 0, 0]; let gt = 0, gOT = 0;
  for (const x of goals) { g[Math.min(4, x.per) - 1 + (x.per >= 4 ? 0 : 0)]++; gt++; }
  // pass outcomes: resolve each pass at the next gain/poke event within 4 s
  let pc = 0, pi = 0, pu = 0; const gn = B.gain;
  for (const p of B.passes) { const e = gn.find(q => q.t >= p.t && q.t - p.t < 4); if (!e) { pu++; continue; } if (e.tm === p.tm && e.q !== 'miss' && e.q !== 'deflect' && e.q !== 'poke') pc++; else if (e.tm !== p.tm) pi++; else pu++; }
  // turnovers: possession-team changes between consecutive clean gains/pokes
  let to = 0, last = -1; for (const q of gn) { if (q.q === 'miss' || q.q === 'deflect') continue; if (last >= 0 && q.tm !== last) to++; last = q.tm; }
  const kinds = { wrist: 0, snap: 0, slap: 0, onetimer: 0 }; for (const x of shots) kinds[x.kind] = (kinds[x.kind] || 0) + 1;
  const loc = [0, 0, 0, 0, 0]; for (const x of shots) loc[x.dg < 10 ? 0 : x.dg < 20 ? 1 : x.dg < 30 ? 2 : x.dg < 45 ? 3 : 4]++;
  let reb = 0, rebG = 0, otG = 0, tapG = 0, tapS = 0, lowAngleS = 0, lowAngleG = 0;
  for (let i = 0; i < shots.length; i++) {
    const x = shots[i]; let isReb = false;
    for (let j = i - 1; j >= 0; j--) { const y = shots[j]; if (x.t - y.t > 3) break; if (y.tm === x.tm && x.t - y.t > 0.0) { isReb = true; break; } }
    x.reb = isReb; if (isReb) reb++; if (x.gl <= 10) tapS++;
    if (x.dy > x.gl * 1.2 && x.gl > 5) lowAngleS++;
  }
  for (const x of goals) { const sh = shots[x.sh]; if (!sh || x.age > 3) continue; if (sh.kind === 'onetimer') otG++; if (sh.reb) rebG++; if (sh.gl <= 10) tapG++; if (sh.dy > sh.gl * 1.2 && sh.gl > 5) lowAngleG++; }
  const sc = JSON.parse(vm.runInContext('JSON.stringify(G.score)', s.ctx));
  const nsh = shots.length;
  return { seed, home, away, ticks, timeout, goals: gt, gH: sc[0], gA: sc[1], gP: g, ot: goals.some(x => x.ot) ? 1 : 0,
    shots: nsh, shotsG: st.sh[0] + st.sh[1], saves: st.sv[0] + st.sv[1], passes: B.passes.length, pc, pi, pu, to, pokes: B.pk,
    k_wrist: kinds.wrist, k_snap: kinds.snap, k_slap: kinds.slap, k_one: kinds.onetimer, g_one: otG, reb, g_reb: rebG, tapS, g_tap: tapG,
    laS: lowAngleS, g_la: lowAngleG, l0: loc[0], l1: loc[1], l2: loc[2], l3: loc[3], l4: loc[4],
    pim: st.p[0] + st.p[1], poss0: st.o[0], poss1: st.o[1], fow0: st.f[0], fow1: st.f[1], hits: st.h[0] + st.h[1], goalsHome: sc[0] };
}

// ---------------- statistics ----------------
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
function sd(a) { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / Math.max(1, a.length - 1)); }
function ms(a) { const m = mean(a), se = sd(a) / Math.sqrt(a.length); return { m, se, lo: m - 1.96 * se, hi: m + 1.96 * se, n: a.length }; }
function ratio(R, num, den) { // ratio of sums with delta-method SE across games
  const n = R.length, x = R.map(r => r[den]), y = R.map(r => r[num]), sx = x.reduce((a, b) => a + b, 0), sy = y.reduce((a, b) => a + b, 0), r = sy / Math.max(1, sx), xb = sx / n;
  let v = 0; for (let i = 0; i < n; i++) v += (y[i] - r * x[i]) ** 2; v /= (n - 1); const se = Math.sqrt(v / n) / Math.max(1e-9, xb);
  return { m: r, se, lo: r - 1.96 * se, hi: r + 1.96 * se, n };
}
const col = (R, k) => R.map(r => typeof k === 'function' ? k(r) : r[k]);
const METRICS = [ // [label, kind, spec]
  ['goals/game', 'm', 'goals'], ['shots/game', 'm', 'shots'], ['shoot% (goals/shot)', 'r', ['goals', 'shots']], ['saves/game', 'm', 'saves'],
  ['save% (sv/(sv+g))', 'f', r => r.saves / Math.max(1, r.saves + r.goals), ['sv', 'g']], ['pass compl.', 'r', ['pc', 'passes']], ['pass intercept', 'r', ['pi', 'passes']], ['passes/game', 'm', 'passes'],
  ['one-timers/game', 'm', 'k_one'], ['1T share of shots', 'r', ['k_one', 'shots']], ['1T goals/game', 'm', 'g_one'], ['1T conv (g/shot)', 'r', ['g_one', 'k_one']],
  ['rebound shots/game', 'm', 'reb'], ['rebound goals/game', 'm', 'g_reb'], ['tap-in shots/game', 'm', 'tapS'], ['tap-in goals/game', 'm', 'g_tap'], ['tap-in conv', 'r', ['g_tap', 'tapS']],
  ['poor-angle shots/game', 'm', 'laS'], ['poor-angle conv', 'r', ['g_la', 'laS']],
  ['loc <10ft /g', 'm', 'l0'], ['loc 10-20 /g', 'm', 'l1'], ['loc 20-30 /g', 'm', 'l2'], ['loc 30-45 /g', 'm', 'l3'], ['loc 45+ /g', 'm', 'l4'],
  ['wrist/g', 'm', 'k_wrist'], ['snap/g', 'm', 'k_snap'], ['slap/g', 'm', 'k_slap'], ['turnovers/game', 'm', 'to'], ['pokes/game', 'm', 'pokes'],
  ['penalties/game', 'm', 'pim'], ['home poss share', 'f2', r => r.poss0 / Math.max(1, r.poss0 + r.poss1)], ['home faceoff win%', 'f2', r => r.fow0 / Math.max(1, r.fow0 + r.fow1)],
  ['hits/game', 'm', 'hits'], ['home goals', 'm', 'gH'], ['away goals', 'm', 'gA'], ['goals P1', 'p', 0], ['goals P2', 'p', 1], ['goals P3', 'p', 2], ['goals OT', 'p', 3], ['OT games frac', 'm', 'ot']];
function metric(R, M) {
  const [, kind, spec, fn] = M;
  if (kind === 'm') return ms(col(R, spec));
  if (kind === 'r') return ratio(R, spec[0], spec[1]);
  if (kind === 'f') return ms(col(R, spec)); // per-game ratio, mean of ratios
  if (kind === 'f2') return ms(col(R, spec));
  if (kind === 'p') return ms(col(R, r => r.gP[spec] || 0));
}
const f3 = x => (Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(2) : x.toFixed(3));
function diffZ(a, b) { return (a.m - b.m) / Math.sqrt(a.se * a.se + b.se * b.se); }

// ---------------- orchestrator ----------------
function arg(n, d) { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; }
async function runCfg(cfg, games, plen, workers) {
  const per = Math.ceil(games / workers), jobs = [];
  for (let w = 0; w < workers; w++) { const a = w * per, b = Math.min(games, a + per); if (a >= b) break; jobs.push(new Promise((res, rej) => {
    const c = cp.spawn(process.execPath, [__filename, 'worker', cfg, String(a), String(b), String(plen)], { env: process.env }); let o = '', e = '';
    c.stdout.on('data', d => o += d); c.stderr.on('data', d => e += d);
    c.on('close', code => { const i = o.indexOf('@@'); if (code !== 0 || i < 0) return rej(new Error(cfg + ' worker failed: ' + e.slice(0, 500))); res(JSON.parse(o.slice(i + 2))); }); })); }
  return [].concat(...await Promise.all(jobs));
}
function table(res, base) {
  const cfgs = Object.keys(res), L = [];
  L.push('| metric | ' + cfgs.map(c => c + ' (n=' + res[c].length + ')').join(' | ') + ' |'); L.push('|' + '---|'.repeat(cfgs.length + 1));
  for (const M of METRICS) { const row = cfgs.map(c => { const x = metric(res[c], M); let z = ''; if (base && c !== base && res[base]) { const zz = diffZ(x, metric(res[base], M)); if (Math.abs(zz) >= 2.8) z = ' **z=' + zz.toFixed(1) + '**'; } return f3(x.m) + ' +-' + f3(1.96 * x.se) + z; });
    L.push('| ' + M[0] + ' | ' + row.join(' | ') + ' |'); }
  return L.join('\n');
}
if (process.argv[2] === 'worker') worker(process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]);
else if (process.argv[2] === 'run') (async () => {
  const cfgs = arg('cfg', 'base').split(','), games = +arg('games', 200), plen = +arg('plen', 180), workers = +arg('workers', 8), outp = arg('out', 'balance_results.json');
  let res = {}; try { res = JSON.parse(fs.readFileSync(outp, 'utf8')); } catch (e) { }
  for (const c of cfgs) { const t0 = Date.now(); res[c] = await runCfg(c, games, plen, workers); fs.writeFileSync(outp, JSON.stringify(res)); console.error(c, games, 'games', ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
  console.log(table(res, cfgs.includes('base') ? 'base' : cfgs[0]));
})().catch(e => { console.error(e); process.exit(1); });
else if (process.argv[2] === 'report') { const res = JSON.parse(fs.readFileSync(arg('in'), 'utf8')); console.log(table(res, arg('base', 'base'))); }
module.exports = { runCfg, ms, ratio, metric, METRICS, mulberry32, applyCfg, INSTR, summarize, T };
