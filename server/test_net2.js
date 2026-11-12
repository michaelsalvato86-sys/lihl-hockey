'use strict';
// Scenario tests with a short test period: quick match, full game to FINAL, rematch, host leaves (CPU takeover),
// reconnect within grace, grace expiry, and the origin allow-list.
process.env.PORT = '8092'; process.env.LIHL_TEST = '1'; process.env.GRACE_MS = '1500'; process.env.ALLOWED_ORIGINS = 'https://allowed.example';
const WebSocket = require('ws'); const { server } = require('./server');
const sleep = ms => new Promise(r => setTimeout(r, ms)); const log = (...a) => console.log(...a);
let fails = 0; const check = (name, ok, extra) => { log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) fails++; };
function client(name, origin) {
  const c = { name, msgs: [], snaps: 0, token: null, last: null };
  c.open = () => new Promise((res, rej) => { c.ws = new WebSocket('ws://localhost:8092', { origin: origin || 'https://allowed.example' });
    c.ws.on('open', () => { c.ws.send(JSON.stringify({ t: 'hello', name, token: c.token })); res(); }); c.ws.on('error', rej); c.ws.on('unexpected-response', () => rej(new Error('rejected')));
    c.ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'welcome') c.token = m.token; if (m.t === 's') { c.snaps++; c.last = m.s; } else c.msgs.push(m); }); });
  c.send = o => c.ws.send(JSON.stringify(o)); c.has = t => c.msgs.some(m => m.t === t); c.last_ = t => [...c.msgs].reverse().find(m => m.t === t); c.clear = () => { c.msgs.length = 0; c.snaps = 0; };
  return c;
}
async function until(f, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await sleep(100); } return false; }
(async () => {
  await new Promise(r => server.listen(8092, r));
  // origin allow-list
  let rejected = false; try { await client('Evil', 'https://evil.example').open(); } catch (e) { rejected = true; } check('origin allow-list rejects other sites', rejected);
  // quick match
  const a = client('Alice'), b = client('Bob'); await a.open(); await b.open(); await sleep(100);
  a.send({ t: 'queue' }); await sleep(200); check('queued waiting', a.has('queued')); b.send({ t: 'queue' });
  check('quick match pairs and starts', await until(() => a.has('start') && b.has('start'), 6000));
  const sa = a.last_('start'), sb = b.last_('start'); check('quick match gave different teams', sa.home !== sa.away, sa.home + ' vs ' + sa.away); check('sides assigned', sa.side === 0 && sb.side === 1);
  // leave that game, set up a short game by room code
  a.send({ t: 'leave' }); await sleep(300); b.send({ t: 'leave' }); await sleep(300); a.clear(); b.clear();
  a.send({ t: 'create', pub: false }); await sleep(200); const code = a.last_('room').code; b.send({ t: 'join', code }); await sleep(200);
  a.send({ t: 'plen', v: 8 }); await sleep(100); check('host sets short period (test mode)', a.last_('room').plen === 8);
  a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true });
  check('game starts after countdown', await until(() => a.has('start') && b.has('start'), 6000));
  // feed inputs while it plays
  const t0 = Date.now(); const iv = setInterval(() => { const x = Math.sin(Date.now() / 700); a.send({ t: 'in', x, y: .3, sh: Math.random() < .05 ? 1 : 0, pw: .8 }); b.send({ t: 'in', x: -x, y: -.3, hit: Math.random() < .03 ? 1 : 0 }); }, 33);
  const ended = await until(() => a.has('end') && b.has('end'), 90000); clearInterval(iv);
  check('full game reaches FINAL for both players', ended, 'in ' + ((Date.now() - t0) / 1000).toFixed(0) + 's'); const e = a.last_('end'); if (e) log('   final', JSON.stringify({ sc: e.sc, sh: e.sh }));
  // rematch
  a.clear(); b.clear(); a.send({ t: 'rematch' }); await sleep(300); check('opponent told about rematch request', b.has('rematch')); b.send({ t: 'rematch' });
  check('rematch starts a new game', await until(() => a.has('start') && b.has('start'), 4000));
  // reconnect within grace
  await sleep(500); b.ws.close(); await sleep(300); check('peer notified of disconnect', a.last_('peer') && a.last_('peer').conn === false);
  const k = a.last ? a.last.k : 0; await sleep(400); check('sim paused during disconnect', a.last.k === k);
  await b.open(); await sleep(500); check('reconnect restores the match', b.has('start') && b.last_('start').rejoin === true && b.last_('start').side === 1);
  const k2 = a.last.k; await sleep(500); check('sim resumes after reconnect', a.last.k > k2);
  // grace expiry: Bob disappears for good, Alice continues vs CPU
  b.ws.close(); await sleep(2300); check('after grace Alice is told opponent left', a.msgs.some(m => m.t === 'peer' && m.left));
  const k3 = a.last.k; await sleep(500); check('game continues vs CPU after opponent leaves', a.last.k > k3);
  // host leaves in a fresh room: guest keeps playing
  a.send({ t: 'leave' }); await sleep(300);
  const c1 = client('Cara'), c2 = client('Dan'); await c1.open(); await c2.open(); await sleep(100);
  c1.send({ t: 'create', pub: false }); await sleep(200); c2.send({ t: 'join', code: c1.last_('room').code }); await sleep(200); c1.send({ t: 'plen', v: 20 }); c1.send({ t: 'ready', v: true }); c2.send({ t: 'ready', v: true });
  await until(() => c1.has('start') && c2.has('start'), 6000); await sleep(800); c1.send({ t: 'leave' }); await sleep(500);
  check('guest told host left', c2.msgs.some(m => m.t === 'peer' && m.left)); const kk = c2.last.k; await sleep(500); check('guest keeps playing vs CPU after host leaves', c2.last.k > kk);
  log(fails ? ('\n' + fails + ' FAILED') : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST ERROR', e); process.exit(1); });
