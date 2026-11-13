'use strict';
// Lobby jersey choice over real WebSockets: the choice is a small int per player, the server validates it against the team's own slots,
// the opponent sees it, and the SERVER resolves a colour clash deterministically (visitor goes to away) in room.jr and in the start message.
process.env.PORT = process.env.PORT || '8093';
const WebSocket = require('ws'); const { server } = require('./server'); const PORT = +process.env.PORT, sleep = ms => new Promise(r => setTimeout(r, ms));
function client(name) { const c = { msgs: [], token: null }; c.open = () => new Promise(res => { c.ws = new WebSocket('ws://localhost:' + PORT); c.ws.on('open', () => { c.ws.send(JSON.stringify({ t: 'hello', name })); res(); }); c.ws.on('message', d => { const m = JSON.parse(d); if (m.t !== 's') c.msgs.push(m); }); }); c.send = o => c.ws.send(JSON.stringify(o)); c.find = t => [...c.msgs].reverse().find(m => m.t === t); return c; }
let fails = 0; const ok = (n, v, x) => { console.log((v ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!v) fails++; };
(async () => {
  await new Promise(r => server.listen(PORT, r)); const a = client('Alice'), b = client('Bob'); await a.open(); await b.open(); await sleep(150);
  const T = a.find('welcome').teams, wsk = T.findIndex(t => t.abbr === 'WSK'), none = T.findIndex(t => t.abbr === 'QF');
  ok('27 teams, WSK present with home/away/alt', T.length === 27 && wsk >= 0 && JSON.stringify(T[wsk].jn) === '[0,1,2]', T[wsk] && T[wsk].jn);
  ok('QF has home+away only (the observed-loaner entry is never offered; only WSK has alt)', JSON.stringify(T[none].jn) === '[0,1]', T[none].jn);
  a.send({ t: 'create' }); await sleep(150); const code = a.find('room').code; b.send({ t: 'join', code }); await sleep(150);
  // both on Whiskey Stick is blocked; use WSK (home black) vs an all-black team? pick WSK vs OTL/BREW whichever has a dark home
  const dark = T.findIndex(t => t.abbr === 'BREW'); a.send({ t: 'team', idx: wsk }); b.send({ t: 'team', idx: dark }); await sleep(200);
  a.send({ t: 'jer', v: 2 }); await sleep(150); let r = b.find('room');
  ok('opponent sees host jersey choice (alt = 2)', r.players[0].jer === 2, r.players[0].jer);
  b.send({ t: 'jer', v: 7 }); await sleep(100); b.send({ t: 'jer', v: -1 }); await sleep(100); b.send({ t: 'jer', v: 1.5 }); await sleep(100); r = a.find('room');
  ok('out of range / non-int jersey values rejected', r.players[1].jer === 0, r.players[1].jer);
  a.send({ t: 'team', idx: none }); await sleep(150); r = b.find('room');
  ok('team without that slot falls back to home (0)', r.players[0].jer === 0, r.players[0].jer);
  // clash: Whiskey Stick (black) home vs BREW (black) visitor chosen home -> server flips the visitor to away; jr is [homeSlot, awaySlot, auto]
  a.send({ t: 'team', idx: wsk }); await sleep(120); a.send({ t: 'jer', v: 0 }); await sleep(120); b.send({ t: 'jer', v: 0 }); await sleep(150); r = a.find('room');
  ok('clash resolved by the server: visitor goes to away', r.jr && r.jr[0] === 0 && r.jr[1] === 1 && r.jr[2] === 1, r.jr);
  b.send({ t: 'jer', v: 1 }); await sleep(150); r = a.find('room'); ok('no clash when visitor already chose away: no auto flag', r.jr && r.jr[1] === 1 && r.jr[2] === 0, r.jr);
  b.send({ t: 'jer', v: 0 }); await sleep(120); a.send({ t: 'plen', v: 5 }); a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true }); await sleep(4500);
  const sa = a.find('start'), sb = b.find('start');
  ok('start message carries the resolved jerseys, identical for both clients', sa && sb && JSON.stringify(sa.jer) === '[0,1]' && JSON.stringify(sb.jer) === '[0,1]', sa && sa.jer);
  console.log(fails ? 'JERSEY LOBBY FAILED' : 'JERSEY LOBBY PASSED'); process.exit(fails ? 1 : 0);
})();
