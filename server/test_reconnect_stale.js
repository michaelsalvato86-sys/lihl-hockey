'use strict';
// A returning player must get their seat back even if the old socket was never detected as closed (mobile network drops).
process.env.PORT = '8097';
const WebSocket = require('ws'); const { server } = require('./server'); const sl = ms => new Promise(r => setTimeout(r, ms));
function cl(n) { const c = { m: [], token: null, snaps: 0, send: o => c.ws.send(JSON.stringify(o)), f: t => [...c.m].reverse().find(x => x.t === t) };
  c.open = () => new Promise(r => { c.ws = new WebSocket('ws://localhost:8097'); c.ws.on('open', () => { c.ws.send(JSON.stringify({ t: 'hello', name: n, token: c.token })); r(); }); c.ws.on('message', d => { const m = JSON.parse(d); if (m.t === 'welcome') c.token = m.token; if (m.t === 's') c.snaps++; else c.m.push(m); }); }); return c; }
(async () => { await new Promise(r => server.listen(8097, r)); const a = cl('A'), b = cl('B'); await a.open(); await b.open(); await sl(200);
  a.send({ t: 'create', pub: false }); await sl(200); b.send({ t: 'join', code: a.f('room').code }); await sl(200); a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true }); await sl(4500);
  const first = b.ws, tok = b.token; const b2 = cl('B'); b2.token = tok; await b2.open(); await sl(600); // old socket still open
  const w = b2.f('welcome'), st = b2.f('start');
  const ok = w && w.back && st && st.rejoin && st.side === 1; console.log('stale-socket rejoin', ok ? 'PASS' : 'FAIL', JSON.stringify({ back: w && w.back, rejoin: st && st.rejoin, side: st && st.side }));
  process.exit(ok ? 0 : 1); })();
