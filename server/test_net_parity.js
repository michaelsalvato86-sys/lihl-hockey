'use strict';
// Multiplayer parity: two ws bot clients in one room; both must receive the same sim events (id, kind, player, sim tick) in the same order,
// no duplicates, goal events with a goal number, and a mid-play reconnect / a disconnect during the replay break must leave both consistent.
process.env.PORT = process.env.PORT || '8397'; process.env.RB_MS = '2500'; process.env.GRACE_MS = '8000';
const WebSocket = require('ws');
const { server, _rooms } = require('./server');
const PORT = +process.env.PORT, sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function client(name) {
  const c = { name, msgs: [], log: [], token: null, k: -1, snaps: 0, rb: 0, rbend: 0, evx: [] };
  c.open = () => new Promise(res => { c.ws = new WebSocket('ws://localhost:' + PORT);
    c.ws.on('open', () => { c.ws.send(JSON.stringify({ t: 'hello', name, token: c.token, caps: { replay: 1 } })); res(); });
    c.ws.on('message', d => { const m = JSON.parse(d);
      if (m.t === 'welcome') c.token = m.token;
      else if (m.t === 's') { c.snaps++; c.k = m.s.k; for (const e of m.ev) if (e.e === 'ae' || e.e === 'goal') c.log.push({ e: e.e, i: e.i, n: e.n, p: e.p, k: e.k, tm: e.tm, tick: m.s.k, c: m.s.c }); }
      else if (m.t === 'rb') { c.rb++; c.send({ t: 'rbdone', skip: 1 }); } else if (m.t === 'rbend') c.rbend++;
      else if (m.t === 'evx') c.evx.push(m); else c.msgs.push(m); });
    c.ws.on('close', () => { c.closed = true; }); });
  c.send = o => { try { c.ws.send(JSON.stringify(o)); } catch (e) { } }; c.find = t => [...c.msgs].reverse().find(m => m.t === t); return c;
}
const goal = r => require('vm').runInContext('goal(H1,onIce(H1)[0])', r.sim.ctx);
async function until(f, ms) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(40); } return false; }
function play(a, b, ms, seed) { let s = seed || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; const t0 = Date.now();
  return (async () => { while (Date.now() - t0 < ms) { for (const c of [a, b]) c.send({ t: 'in', x: rnd() * 2 - 1, y: rnd() * 2 - 1, sh: rnd() < .06 ? 1 : 0, pw: rnd(), ps: rnd() < .08 ? 1 : 0, hit: rnd() < .05 ? 1 : 0, sw: 0, vs: 0 }); await sleep(33); } })(); }
const sig = e => e.e + ':' + (e.i || e.n) + ':' + e.p + ':' + e.k + ':' + e.tick;
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const a = client('Alice'), b = client('Bob'); await a.open(); await b.open(); await sleep(100);
  a.send({ t: 'create', pub: false }); await sleep(100); const code = a.find('room').code; b.send({ t: 'join', code }); await sleep(100);
  a.send({ t: 'plen', v: 120 }); a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true }); await sleep(4500); const r = _rooms.get(code);
  // 1) 25 s of scripted play, both connected the whole time
  await play(a, b, 25000, 7);
  ok(a.log.length > 40, 'alice saw sim events (' + a.log.length + ')');
  ok(a.log.map(sig).join('|') === b.log.map(sig).join('|'), 'identical event log (kind, id, player, sim tick, order) on both clients: ' + a.log.length + ' vs ' + b.log.length);
  const ids = a.log.filter(e => e.e === 'ae').map(e => e.i); ok(new Set(ids).size === ids.length, 'no duplicate ae ids in a stream');
  ok(ids.every((v, j) => j === 0 || v !== ids[j - 1]), 'ids carried from the sim (non-zero): ' + ids.slice(0, 3).join(','));
  ok(ids.every(v => v > 0), 'every ae has a server id');
  ok(a.log.every((e, j) => j === 0 || e.tick >= a.log[j - 1].tick), 'sim ticks non-decreasing');
  const kinds = {}; a.log.forEach(e => kinds[e.e === 'ae' ? e.k : 'goal'] = 1); console.log('kinds seen: ' + Object.keys(kinds).join(','));
  // 2) goal -> celebration: reconnect Bob mid-celebration -> start(rejoin) + evx(goal) and logs agree after
  const n0 = a.log.length; goal(r); await until(() => a.log.length > n0, 1500);
  const g = a.log.filter(e => e.e === 'goal'); ok(g.length >= 1 && g[g.length - 1].n >= 1, 'goal event carries goal number n=' + (g.length ? g[g.length - 1].n : '?'));
  b.ws.close(); await sleep(300); b.msgs.length = 0; await b.open(); await sleep(400);
  const st = b.find('start'); ok(st && st.rejoin === true, 'bob rejoin start'); ok(b.evx.length >= 1 && b.evx[0].ev[0].e === 'goal', 'celebration state resent after reconnect (evx goal n=' + (b.evx[0] && b.evx[0].ev[0].n) + ')');
  // 3) break: after the pause the room enters rb. Bob disconnects during the break; alice must still get rbend; Bob rejoins and is consistent.
  ok(await until(() => a.rb >= 1, 6000), 'alice got rb after the goal');
  b.ws.close(); await sleep(200);
  ok(await until(() => a.rbend >= 1, 6000), 'alice got rbend even though bob dropped during the break');
  await b.open(); await sleep(500); ok(b.find('start') && b.find('start').rejoin, 'bob rejoined after the break');
  const kA = a.k; await play(a, b, 6000, 11); ok(a.k > kA + 100 && b.k > kA + 100, 'sim running for both after the break (a.k=' + a.k + ' b.k=' + b.k + ')');
  // logs after bob's rejoin must match from the first tick bob has seen
  const t0 = b.log.length ? b.log[b.log.length - 1].tick : 0; const first = b.log.find(e => e.tick > kA + 5);
  const la = a.log.filter(e => first && e.tick >= first.tick).map(sig).join('|'), lb = b.log.filter(e => first && e.tick >= first.tick).map(sig).join('|');
  ok(!!first && la === lb, 'logs agree again after the reconnect (' + (la.split('|').length) + ' events)');
  const ids2 = a.log.filter(e => e.e === 'ae').map(e => e.i); ok(new Set(ids2).size === ids2.length, 'no duplicate ae ids across the whole run (ids stay unique after reconnect)');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); a.ws.close(); b.ws.close(); server.close(); setTimeout(() => process.exit(fails ? 1 : 0), 300);
})().catch(e => { console.error(e); process.exit(2); });
