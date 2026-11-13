const path = require('path'), fs = require('fs');
'use strict';
/* LIHL Hockey multiplayer server.
   - Server-authoritative: runs the real game simulation (sim_host.js) at 30 Hz per room; clients only send inputs.
   - Rooms with codes (LIHL-XXXX), invite links, public list, quick-match queue, reconnect grace period, CPU takeover.
   - No secrets, no database. Configure with env vars: PORT, ALLOWED_ORIGINS (comma list), GRACE_MS, MAX_ROOMS. */
const http = require('http'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { createSim } = require('./sim_host');

const PORT = +process.env.PORT || 8090;
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const GRACE_MS = +process.env.GRACE_MS || 45000;
const MAX_ROOMS = +process.env.MAX_ROOMS || 40;
const RB_MS = +process.env.RB_MS || 8000; // hard cap of the goal replay break (see docs/ONLINE_REPLAY_PROTOCOL.md)
const TICK_MS = 1000 / 30;
const CHAT = ['Good game', 'Nice shot', 'Nice save', 'Ready?', 'Rematch?', 'One moment'];
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// team list from the shipped game data (same file the browser loads)
const TEAMS = (() => { const s = createSim(); return s.summary(); })();

const rooms = new Map(), clients = new Map(), tokens = new Map(), queue = [];
const send = (c, o) => { try { if (c && c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); } catch (e) { } };
const clean = s => (String(s || '').replace(/[^\w \-'.]/g, '').trim().slice(0, 14)) || 'Player';
const rid = n => crypto.randomBytes(n).toString('hex');
function newCode() { for (let k = 0; k < 50; k++) { let c = 'LIHL-'; for (let i = 0; i < 4; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]; if (!rooms.has(c)) return c; } return null; }

function roomView(r, slot) {
  return { t: 'room', code: r.code, pub: r.pub, host: 0, plen: r.plen, state: r.state, you: slot, paused: !!r.paused,
    players: r.players.map(p => p ? { name: p.name, team: p.team, ready: p.ready, conn: p.conn } : null) };
}
function pushRoom(r) { r.players.forEach((p, i) => p && send(p, roomView(r, i))); r.touch = Date.now(); }

function createRoom(owner, pub) {
  if (rooms.size >= MAX_ROOMS) { send(owner, { t: 'err', m: 'Server is busy. Try again in a minute.' }); return null; }
  const code = newCode(); if (!code) return null;
  const r = { code, pub: !!pub, plen: 180, state: 'lobby', players: [null, null], sim: null, paused: false, grace: [null, null], touch: Date.now(), made: Date.now(), rematch: [false, false], autoStart: false };
  rooms.set(code, r); seat(r, owner, 0); return r;
}
function seat(r, c, slot) {
  const other = r.players[1 - slot];
  let team = Math.floor(Math.random() * TEAMS.n); if (other && other.team === team) team = (team + 1) % TEAMS.n;
  c.room = r; c.slot = slot; c.team = team; c.ready = false; c.conn = true; r.players[slot] = c; pushRoom(r);
}
function leaveRoom(c, permanent) {
  const r = c.room; if (!r) return; const slot = c.slot;
  if (r.state === 'playing' && permanent) { try { r.sim.drop(slot); } catch (e) { } send(r.players[1 - slot], { t: 'peer', left: true, slot }); }
  r.players[slot] = null; c.room = null; if (r.sim) syncRb(r); if (r.rb) rbDone(r, slot);
  if (!r.players[0] && !r.players[1]) { closeRoom(r); return; }
  if (r.state === 'lobby' || r.state === 'ended') { r.state = r.state === 'ended' ? 'ended' : 'lobby'; r.players.forEach(p => p && (p.ready = false)); }
  pushRoom(r);
}
/* Goal replay break. Only used when every connected player said hello with caps.replay.
   server -> client {t:'rb', ms}   : sim is paused, play your local replay (max ms)
   client -> server {t:'rbdone', skip}: finished or skipped
   server -> client {t:'rbend'}    : break over, snapshots resume (faceoff) */
function rbCapable(r) { const ps = r.players.filter(p => p && p.conn); return ps.length > 0 && ps.every(p => p.caps && p.caps.replay); }
function syncRb(r) { if (!r.sim) return; const v = rbCapable(r) ? 1 : 0; if (r.rbFlag !== v) { r.rbFlag = v; r.sim.rbOn(v); } }
function rbBegin(r) {
  if (r.rb) return; r.rb = { done: [false, false], timer: setTimeout(() => rbEnd(r), RB_MS) };
  r.players.forEach((p, i) => { if (p && p.conn) send(p, { t: 'rb', ms: RB_MS }); else r.rb.done[i] = true; });
}
function rbDone(r, slot) { if (!r.rb) return; r.rb.done[slot] = true; if (r.players.every((p, i) => !p || !p.conn || r.rb.done[i])) rbEnd(r); }
function rbEnd(r) { if (!r.rb) return; clearTimeout(r.rb.timer); r.rb = null; if (r.sim) r.sim.rbResume(); r.players.forEach(p => send(p, { t: 'rbend' })); r.touch = Date.now(); }
function closeRoom(r) { if (r.rb) clearTimeout(r.rb.timer); clearTimeout(r.grace[0]); clearTimeout(r.grace[1]); rooms.delete(r.code); r.sim = null; }

function startGame(r, rejoinOnly) {
  if (!r.sim || !rejoinOnly) {
    r.sim = createSim();
    const [a, b] = r.players; r.sim.start({ home: a.team, away: b.team, plen: r.plen });
    r.sim.human(0); r.sim.human(1); r.state = 'playing'; r.rematch = [false, false]; r.paused = false; r.rb = null; r.rbFlag = undefined; r.t0 = Date.now(); track('game_start', { room: r.code, n: r.players.map(p => p && p.name).join(' vs '), teams: a.team + '-' + b.team, plen: r.plen });
  }
  syncRb(r);
  r.players.forEach((p, i) => p && send(p, { t: 'start', home: r.players[0].team, away: r.players[1].team, plen: r.plen, side: i, rejoin: !!rejoinOnly, names: [r.players[0].name, r.players[1].name] }));
  if (rejoinOnly) { let ev = []; try { ev = r.sim.rejoinEv(); } catch (e) { } if (ev.length) r.players.forEach(p => p && send(p, { t: 'evx', ev })); } // celebration in progress survives a reconnect
  pushRoom(r);
}
function maybeStart(r) {
  if (r.state !== 'lobby' && r.state !== 'ended') return;
  const [a, b] = r.players; if (!a || !b || !a.ready || !b.ready || a.team === b.team) return;
  let n = 3; r.state = 'countdown'; pushRoom(r);
  const iv = setInterval(() => {
    if (!rooms.has(r.code) || !r.players[0] || !r.players[1]) { clearInterval(iv); if (rooms.has(r.code)) { r.state = 'lobby'; pushRoom(r); } return; }
    r.players.forEach(p => send(p, { t: 'cd', n }));
    if (n-- <= 0) { clearInterval(iv); startGame(r, false); }
  }, 1000);
}

function disconnect(c) {
  clients.delete(c.id); const qi = queue.indexOf(c); if (qi >= 0) queue.splice(qi, 1);
  const r = c.room; if (!r) { tokens.delete(c.token); return; }
  c.conn = false; c.ws = null;
  if (r.state === 'playing') {
    if (r.rb) rbDone(r, c.slot);
    r.paused = true; send(r.players[1 - c.slot], { t: 'peer', conn: false, grace: GRACE_MS });
    r.grace[c.slot] = setTimeout(() => {
      if (c.conn) return; tokens.delete(c.token); leaveRoom(c, true);
      if (r.sim && rooms.has(r.code)) { const alive = r.players.some(p => p && p.conn); r.paused = !alive; if (!alive) closeRoom(r); }
    }, GRACE_MS);
  } else {
    r.grace[c.slot] = setTimeout(() => { if (!c.conn) { tokens.delete(c.token); leaveRoom(c, true); } }, 20000);
  }
  pushRoom(r);
}

function tryMatch() {
  while (queue.length >= 2) {
    const a = queue.shift(), b = queue.shift(); if (!a.ws || !b.ws) { if (a.ws) queue.unshift(a); if (b.ws) queue.unshift(b); continue; }
    const r = createRoom(a, false); if (!r) return; seat(r, b, 1);
    let ta = Math.floor(Math.random() * TEAMS.n), tb = (ta + 1 + Math.floor(Math.random() * (TEAMS.n - 1))) % TEAMS.n; a.team = ta; b.team = tb; a.ready = b.ready = true;
    pushRoom(r); r.players.forEach(p => send(p, { t: 'matched', code: r.code })); maybeStart(r);
  }
}

// ---------------- player tracking (no raw IPs stored; display names only) ----------------
const STATS_DIR = process.env.STATS_DIR || '', ADMIN_KEY = process.env.ADMIN_KEY || '', SALT = process.env.STATS_SALT || 'lihl';
const TR = { started: Date.now(), conns: 0, games: 0, finished: 0, days: new Map(), recent: [] };
function ipOf(req) { const x = (req.headers['x-forwarded-for'] || '').split(',')[0].trim(); const a = req.socket.remoteAddress || ''; return (a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1') && x ? x : a; }
function pid(ip) { return crypto.createHash('sha256').update(SALT + ip).digest('hex').slice(0, 10); }
function dayKey(t) { return new Date(t).toISOString().slice(0, 10); }
function track(ev, o) {
  if (o && o.room) { const lr = rooms.get(o.room); if (lr && lr.players.some(p => p && p.lt)) return; } // load-test rooms never count
  const t = Date.now(), rec = Object.assign({ t, ev }, o); TR.recent.push(rec); if (TR.recent.length > 200) TR.recent.shift();
  const dk = dayKey(t); let d = TR.days.get(dk); if (!d) { d = { visitors: new Set(), mobile: 0, desktop: 0, games: 0, finished: 0, names: new Set() }; TR.days.set(dk, d); }
  if (ev === 'conn') { TR.conns++; d.visitors.add(o.p); if (o.m) d.mobile++; else d.desktop++; }
  if (ev === 'name' && o.n) d.names.add(o.n);
  if (ev === 'game_start') { TR.games++; d.games++; }
  if (ev === 'game_end') { TR.finished++; d.finished++; }
  if (STATS_DIR) { try { fs.mkdirSync(STATS_DIR, { recursive: true }); fs.appendFile(path.join(STATS_DIR, 'events.jsonl'), JSON.stringify(rec) + '\n', () => { }); } catch (e) { } }
}
function statsJson() {
  const days = {}; for (const [k, d] of TR.days) days[k] = { visitors: d.visitors.size, mobile: d.mobile, desktop: d.desktop, gamesStarted: d.games, gamesFinished: d.finished, names: [...d.names].slice(0, 60) };
  return { uptimeMin: Math.round((Date.now() - TR.started) / 60000), onlineNow: clients.size, inRooms: [...rooms.values()].reduce((n, r) => n + r.players.filter(p => p && p.conn).length, 0), roomsOpen: rooms.size, playing: [...rooms.values()].filter(r => r.state === 'playing').length, queued: queue.length, connectionsSinceStart: TR.conns, gamesSinceStart: TR.games, days, recent: TR.recent.slice(-40) };
}
function adminPage(res, u) {
  const key = (u.searchParams.get('key') || '');
  if (!ADMIN_KEY || key.length !== ADMIN_KEY.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_KEY))) { res.writeHead(404); return res.end(); }
  const j = statsJson();
  if (u.pathname === '/admin/stats') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify(j)); }
  const rows = Object.keys(j.days).sort().reverse().map(k => { const d = j.days[k]; return '<tr><td>' + k + '</td><td>' + d.visitors + '</td><td>' + d.mobile + '/' + d.desktop + '</td><td>' + d.gamesStarted + '</td><td>' + d.gamesFinished + '</td></tr>'; }).join('');
  const rec = j.recent.slice().reverse().map(r => '<div>' + new Date(r.t).toLocaleTimeString() + ' ' + r.ev + ' ' + (r.n || r.p || '') + (r.teams ? ' ' + r.teams : '') + (r.sc ? ' ' + r.sc : '') + '</div>').join('');
  res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
  res.end('<!doctype html><meta name=viewport content="width=device-width"><title>LIHL players</title><body style="font:15px system-ui;background:#0b1220;color:#e8eef8;padding:16px"><h2>LIHL players</h2><p><b>' + j.onlineNow + '</b> online now, <b>' + j.playing + '</b> games live, <b>' + j.queued + '</b> in queue, up ' + j.uptimeMin + ' min</p><table border=1 cellpadding=6 style="border-collapse:collapse"><tr><th>day (UTC)<th>visitors<th>mobile/desktop<th>games started<th>finished</tr>' + rows + '</table><h3>Recent</h3><div style="font:13px monospace">' + rec + '</div><script>setTimeout(()=>location.reload(),15000)</script>');
}
// ---------------- websocket ----------------
const WEB = process.env.LIHL_WEB ? path.resolve(process.env.LIHL_WEB) : null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/admin')) { let u; try { u = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); } return adminPage(res, u); }
  if (WEB && req.url !== '/health') {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(WEB, u);
    if (f.startsWith(WEB + path.sep) && !u.includes('/server/') && !u.includes('/.git') && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' }); return fs.createReadStream(f).pipe(res); }
  }
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); } else { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('LIHL Hockey multiplayer server\n'); } });
const wss = new WebSocketServer({ server, maxPayload: 2048, verifyClient: (info, cb) => { const o = info.origin || ''; if (ORIGINS.length && !ORIGINS.includes(o)) return cb(false, 403, 'origin not allowed'); cb(true); } });

wss.on('connection', (ws, req) => {
  { const ua = String((req && req.headers && req.headers['user-agent']) || ''); ws.__tr = { p: pid(ipOf(req)), m: /Mobi|Android|iPhone|iPad/i.test(ua) }; ws.__lt = ua.startsWith('LIHL-LOADTEST'); if (!ws.__lt) track('conn', ws.__tr); }
  const c = { id: rid(6), ws, name: 'Player', token: null, room: null, slot: 0, team: 0, ready: false, conn: true, msgs: 0, strikes: 0, lt: !!ws.__lt };
  ws.on('message', data => {
    if (++c.msgs > 90) { /* per-second limiter below */ }
    let m; try { m = JSON.parse(data); } catch (e) { return; } if (!m || typeof m.t !== 'string') return;
    handle(c, m);
  });
  ws.on('close', () => { if (c.token) disconnect(c); else clients.delete(c.id); });
  ws.on('error', () => { });
});
setInterval(() => { for (const c of clients.values()) { if (c.msgs > 120) { c.strikes++; if (c.strikes > 3 && c.ws) c.ws.close(); } else c.strikes = Math.max(0, c.strikes - 1); c.msgs = 0; } }, 1000);

function handle(c, m) {
  if (m.t === 'ping') return send(c, { t: 'pong', ts: m.ts });
  if (m.t === 'hello') {
    const old = m.token && tokens.get(String(m.token));
    if (old && old.room) { // reconnect (also when the old socket has not been detected as dead yet)
      if (old.conn && old.ws && old.ws !== c.ws) { try { old.ws.removeAllListeners('close'); old.ws.removeAllListeners('message'); old.ws.terminate(); } catch (e) { } old.conn = false; }
      clearTimeout(old.room.grace[old.slot]); old.ws = c.ws; old.conn = true; old.name = clean(m.name || old.name); old.caps = { replay: !!(m.caps && m.caps.replay) }; if (old.room.rb) old.room.rb.done[old.slot] = true; clients.delete(c.id); c.ws.__c = old;
      c.ws.removeAllListeners('message'); c.ws.removeAllListeners('close');
      c.ws.on('message', d => { let mm; try { mm = JSON.parse(d); } catch (e) { return; } if (mm && typeof mm.t === 'string') { old.msgs++; handle(old, mm); } });
      c.ws.on('close', () => disconnect(old)); clients.set(old.id, old);
      send(old, { t: 'welcome', id: old.id, token: old.token, name: old.name, teams: TEAMS.teams, back: true });
      const r = old.room; send(r.players[1 - old.slot], { t: 'peer', conn: true });
      if (r.state === 'playing') { r.paused = !(r.players[0] && r.players[0].conn && r.players[1] && r.players[1].conn); startGame(r, true); } else pushRoom(r);
      return;
    }
    c.name = clean(m.name); c.caps = { replay: !!(m.caps && m.caps.replay) }; c.token = rid(16); tokens.set(c.token, c); clients.set(c.id, c); c.p = c.ws && c.ws.__tr && c.ws.__tr.p; if (!c.lt) track('name', { p: c.p, n: c.name });
    return send(c, { t: 'welcome', id: c.id, token: c.token, name: c.name, teams: TEAMS.teams });
  }
  if (!c.token) return;
  const r = c.room;
  switch (m.t) {
    case 'name': c.name = clean(m.name); if (r) pushRoom(r); break;
    case 'create': if (r) break; createRoom(c, !!m.pub); break;
    case 'join': {
      if (r) break; const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9); const t = rooms.get(code);
      if (!t) return send(c, { t: 'err', m: 'Room not found. Check the code.' });
      if (t.state === 'playing' || t.state === 'countdown') return send(c, { t: 'err', m: 'That game has already started.' });
      if (t.players[0] && t.players[1]) return send(c, { t: 'err', m: 'That room is full.' });
      seat(t, c, t.players[0] ? 1 : 0); break;
    }
    case 'list': send(c, { t: 'list', rooms: [...rooms.values()].filter(x => x.pub && x.state === 'lobby' && (!x.players[0] || !x.players[1])).slice(0, 20).map(x => ({ code: x.code, host: (x.players[0] || x.players[1]).name, team: (x.players[0] || x.players[1]).team })) }); break;
    case 'queue': if (r || queue.includes(c)) break; queue.push(c); send(c, { t: 'queued', n: queue.length }); tryMatch(); break;
    case 'unqueue': { const i = queue.indexOf(c); if (i >= 0) queue.splice(i, 1); send(c, { t: 'unqueued' }); break; }
    case 'team': if (!r || (r.state !== 'lobby' && r.state !== 'ended')) break; { const i = Math.floor(+m.idx); if (!(i >= 0 && i < TEAMS.n)) break; const o = r.players[1 - c.slot]; if (o && o.team === i) return send(c, { t: 'err', m: 'That team is already taken by your opponent.' }); c.team = i; c.ready = false; pushRoom(r); } break;
    case 'ready': if (!r || (r.state !== 'lobby' && r.state !== 'ended')) break; c.ready = !!m.v; pushRoom(r); maybeStart(r); break;
    case 'plen': if (!r || c.slot !== 0 || r.state === 'playing') break; if ([120, 180, 300].includes(+m.v) || (process.env.LIHL_TEST && +m.v >= 5 && +m.v <= 60)) { r.plen = +m.v; r.players.forEach(p => p && (p.ready = false)); pushRoom(r); } break;
    case 'leave': if (r) { clearTimeout(r.grace[c.slot]); leaveRoom(c, true); } break;
    case 'in': if (r && r.state === 'playing' && !r.paused && !r.rb && r.sim) r.sim.input(c.slot, m); break;
    case 'rbdone': if (r) rbDone(r, c.slot); break;
    case 'chat': if (r) { const i = Math.floor(+m.i); if (i >= 0 && i < CHAT.length) r.players.forEach(p => send(p, { t: 'chat', from: c.slot, name: c.name, i })); } break;
    case 'rematch': if (r && r.state === 'ended') { r.rematch[c.slot] = true; r.players.forEach(p => send(p, { t: 'rematch', slot: c.slot })); if (r.rematch[0] && r.rematch[1]) { r.players.forEach(p => p && (p.ready = true)); startGame(r, false); } } break;
  }
}

// ---------------- game loop ----------------
let last = Date.now(), acc = 0;
setInterval(() => {
  const now = Date.now(); acc += now - last; last = now; if (acc > TICK_MS * 4) acc = TICK_MS * 4;
  while (acc >= TICK_MS) {
    acc -= TICK_MS;
    for (const r of rooms.values()) {
      if (r.state !== 'playing' || r.paused || r.rb || !r.sim) continue;
      let out; try { out = r.sim.tick(); } catch (e) { console.error('sim error', r.code, e); r.state = 'ended'; continue; }
      const msg = '{"t":"s",' + out.slice(1);
      for (const p of r.players) if (p && p.ws && p.ws.readyState === 1) { try { p.ws.send(msg); } catch (e) { } }
      if (out.indexOf('"rb":1') >= 0) rbBegin(r);
      if (r.sim.over()) { r.state = 'ended'; const sc = r.sim.score(); track('game_end', { room: r.code, n: r.players.map(p => p && p.name).join(' vs '), sc: JSON.stringify(sc.sc), min: Math.round((Date.now() - (r.t0 || Date.now())) / 60000) }); setTimeout(() => r.players.forEach(p => send(p, { t: 'end', ss: r.sim.stats(), sc: sc.sc, sh: sc.sh, home: r.players[0] && r.players[0].team, away: r.players[1] && r.players[1].team })), 900); r.players.forEach(p => p && (p.ready = false)); r.touch = Date.now(); }
    }
  }
}, 8);
setInterval(() => { const now = Date.now(); for (const r of [...rooms.values()]) { const idle = now - r.touch; if ((r.state === 'lobby' && idle > 30 * 60e3) || (r.state === 'ended' && idle > 10 * 60e3) || (r.state === 'playing' && idle > 3 * 3600e3)) closeRoom(r); } }, 30000);

if (require.main === module) server.listen(PORT, () => console.log(`LIHL server listening on :${PORT} (origins: ${ORIGINS.join(',') || 'any'})`));
module.exports = { server, _rooms: rooms };
