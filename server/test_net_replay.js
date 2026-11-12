'use strict';
// Online goal replay break: break start, skip, timeout, disconnect during break, legacy client (no caps) unchanged.
process.env.PORT = process.env.PORT || '8092'; process.env.RB_MS = '2500';
const WebSocket = require('ws');
const { server, _rooms } = require('./server');
const PORT = +process.env.PORT, sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function client(name, caps) {
  const c = { name, msgs: [], snaps: 0, last: null, token: null, rb: 0, rbend: 0, tRb: 0, tEnd: 0 };
  c.open = () => new Promise(res => { c.ws = new WebSocket('ws://localhost:' + PORT);
    c.ws.on('open', () => { c.ws.send(JSON.stringify({ t: 'hello', name, token: c.token, caps })); res(); });
    c.ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'welcome') c.token = m.token;
      if (m.t === 's') { c.snaps++; c.last = m.s; } else if (m.t === 'rb') { c.rb++; c.tRb = Date.now(); c.rbSnap = c.last; } else if (m.t === 'rbend') { c.rbend++; c.tEnd = Date.now(); } else c.msgs.push(m); }); });
  c.send = o => c.ws.send(JSON.stringify(o)); c.find = t => [...c.msgs].reverse().find(m => m.t === t); return c;
}
async function room(a, b) {
  await a.open(); await b.open(); await sleep(100); a.send({ t: 'create', pub: false }); await sleep(100);
  const code = a.find('room').code; b.send({ t: 'join', code }); await sleep(100);
  a.send({ t: 'plen', v: 120 }); a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true }); await sleep(4500); return _rooms.get(code);
}
const goal = r => require('vm').runInContext('goal(H1,onIce(H1)[0])', r.sim.ctx);
const score = r => r.sim.score().sc.join('-');
async function until(f, ms) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(40); } return false; }
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const a = client('Alice', { replay: 1 }), b = client('Bob', { replay: 1 }); const r = await room(a, b);
  for (let i = 0; i < 30; i++) { a.send({ t: 'in', x: 1, y: 0 }); await sleep(33); }
  // 1) goal -> break -> skip both -> resume
  goal(r); ok(score(r) === '1-0', 'goal scored 1-0');
  ok(await until(() => a.rb && b.rb, 6000), 'both got rb after the goal celebration pause');
  const kA = a.last.k, cl = a.last.c; await sleep(600);
  ok(a.last.k === kA && b.last.k === kA, 'no snapshots during break (sim paused)'); ok(a.last.sc.join('-') === '1-0' && score(r) === '1-0', 'score unchanged during break');
  a.send({ t: 'rbdone', skip: 1 }); await sleep(300); ok(!a.rbend && !b.rbend, 'one skip does not end the break');
  b.send({ t: 'rbdone', skip: 0 }); ok(await until(() => a.rbend && b.rbend, 1000), 'both done -> rbend');
  await sleep(500); ok(a.last.k > kA, 'snapshots resume'); ok(Math.abs(a.last.c - cl) < 0.6, 'clock continuous across break (' + cl + ' -> ' + a.last.c + ')'); ok(score(r) === '1-0', 'score still 1-0');
  // 2) hard timeout
  a.rb = b.rb = a.rbend = b.rbend = 0; goal(r); ok(await until(() => a.rb && b.rb, 6000), 'second break');
  ok(await until(() => a.rbend && b.rbend, 4000), 'timeout ends break'); ok(Math.abs(a.tEnd - a.tRb - 2500) < 400, 'timeout about RB_MS (' + (a.tEnd - a.tRb) + ' ms)');
  // 3) disconnect during break (Bob), Alice done -> break ends; Bob reconnects
  a.rb = b.rb = a.rbend = b.rbend = 0; goal(r); ok(await until(() => a.rb && b.rb, 6000), 'third break');
  b.ws.close(); await sleep(200); a.send({ t: 'rbdone' }); ok(await until(() => a.rbend, 1500), 'break ends when the only connected player is done');
  const kk = a.last.k; await sleep(300); ok(a.last.k === kk, 'sim stays paused while Bob is away');
  await b.open(); await sleep(500); ok(b.find('start') && b.find('start').rejoin, 'Bob rejoin start'); ok(await until(() => a.last.k > kk, 1500), 'game resumes after reconnect'); ok(score(r) === '3-0', 'score 3-0');
  // 3b) reconnect during a break
  a.rb = b.rb = a.rbend = b.rbend = 0; goal(r); ok(await until(() => a.rb && b.rb, 6000), 'fourth break');
  b.ws.close(); await sleep(200); await b.open(); await sleep(300); a.send({ t: 'rbdone' }); ok(await until(() => a.rbend && b.rbend, 2000), 'reconnected player does not hold the break');
  await sleep(300); ok(a.last.k > 0 && score(r) === '4-0', 'score 4-0');
  // 4) legacy client (no caps): old behavior, no rb at all
  const c = client('Cat', null), d = client('Dan', { replay: 1 }); const r2 = await room(c, d);
  goal(r2); await sleep(5500); ok(!c.rb && !d.rb, 'no rb when a client lacks caps.replay'); ok(c.last.k > 0 && d.snaps > 100, 'legacy room keeps ticking through the goal');
  const k2 = c.last.k; await sleep(300); ok(c.last.k > k2, 'legacy room not paused');
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
