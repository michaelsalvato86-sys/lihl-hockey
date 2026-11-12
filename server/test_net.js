'use strict';
// End-to-end test over real WebSockets: two clients create/join, pick teams, ready up, play, one drops and reconnects.
process.env.PORT = process.env.PORT || '8091';
const WebSocket = require('ws');
const { server } = require('./server');
const PORT = +process.env.PORT;
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function client(name) {
  const c = { name, msgs: [], snaps: 0, ev: {}, last: null, token: null };
  c.open = () => new Promise(res => {
    c.ws = new WebSocket('ws://localhost:' + PORT);
    c.ws.on('open', () => { c.ws.send(JSON.stringify({ t: 'hello', name, token: c.token })); res(); });
    c.ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'welcome') c.token = m.token; if (m.t === 's') { c.snaps++; c.last = m.s; for (const e of m.ev) c.ev[e.e] = (c.ev[e.e] || 0) + 1; } else c.msgs.push(m); });
  });
  c.send = o => c.ws.send(JSON.stringify(o));
  c.find = t => [...c.msgs].reverse().find(m => m.t === t);
  return c;
}
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const a = client('Alice'), b = client('Bob'); await a.open(); await b.open(); await sleep(150);
  a.send({ t: 'create', pub: true }); await sleep(150);
  const room = a.find('room'); log('room created', room.code, 'pub', room.pub);
  b.send({ t: 'join', code: 'LIHL-ZZZZ' }); await sleep(100); log('bad code ->', b.find('err').m);
  b.send({ t: 'list' }); await sleep(100); log('public list', JSON.stringify(b.find('list').rooms));
  b.send({ t: 'join', code: room.code }); await sleep(150); log('joined slot', b.find('room').you);
  const ta = a.find('room').players[0].team; b.send({ t: 'team', idx: ta }); await sleep(100); log('same team ->', b.find('err').m);
  a.send({ t: 'plen', v: 120 }); a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true }); await sleep(4500);
  log('start msgs', a.find('start') && 'ok', 'side a/b', a.find('start').side, b.find('start').side);
  for (let i = 0; i < 60; i++) { a.send({ t: 'in', x: 1, y: 0.2, sh: i % 20 === 0 ? 1 : 0, pw: 0.7, ps: i % 15 === 0 ? 1 : 0 }); b.send({ t: 'in', x: -1, y: -0.2, hit: i % 25 === 0 ? 1 : 0 }); await sleep(33); }
  log('snapshots a/b', a.snaps, b.snaps, 'clock', a.last.c, 'tick', a.last.k, 'controlled', JSON.stringify(a.last.hc));
  // Bob drops, then reconnects with his token
  b.ws.close(); await sleep(400); log('alice told:', JSON.stringify(a.find('peer')));
  const k0 = a.last.k; await sleep(500); log('sim paused while Bob is away (tick advanced?)', a.last.k - k0);
  await b.open(); await sleep(500); log('bob rejoin start msg', JSON.stringify({ rejoin: b.find('start').rejoin, side: b.find('start').side }), 'alice peer back', JSON.stringify(a.find('peer')));
  const k1 = a.last.k; await sleep(500); log('sim running again (ticks advanced)', a.last.k - k1);
  a.send({ t: 'chat', i: 1 }); await sleep(100); log('chat to bob', JSON.stringify(b.find('chat')));
  // inputs from a client cannot move the opponent's team: bob's side is 1; verify server only maps by socket slot
  log('events seen by alice', JSON.stringify(a.ev));
  process.exit(0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
