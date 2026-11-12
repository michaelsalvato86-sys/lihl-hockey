'use strict';
/* LIHL load test. Local only: spawns its own server child on localhost.
   Usage: node loadtest.js [--rooms 1,2,4,8] [--secs 40] [--affinity 1] [--heap 300] [--port 8199]
   Orchestrator mode (default): spawns `node --max-old-space-size=H -r loadtest.js server.js` (LT_PROBE=1) and
   runs N pairs of bots (user-agent LIHL-LOADTEST, ignored by server stats) over ws.
   Probe mode (LT_PROBE=1, preloaded into the server): reports cpu, rss, event-loop delay, and sim tick cost over IPC once a second. */
const path = require('path');

if (process.env.LT_PROBE) {
  // ---- probe, runs inside the server process ----
  const { monitorEventLoopDelay, performance } = require('perf_hooks');
  const sh = require('./sim_host'); const orig = sh.createSim;
  let tickNs = 0, ticks = 0, maxTickMs = 0;
  sh.createSim = function () {
    const s = orig.apply(this, arguments); const t = s.tick;
    s.tick = function () { const a = process.hrtime.bigint(); const r = t.apply(this, arguments); const d = Number(process.hrtime.bigint() - a); tickNs += d; ticks++; if (d / 1e6 > maxTickMs) maxTickMs = d / 1e6; return r; };
    return s;
  };
  const h = monitorEventLoopDelay({ resolution: 5 }); h.enable();
  let lastFire = performance.now(), maxDrift = 0;
  setInterval(() => { const n = performance.now(); const d = n - lastFire - 8; if (d > maxDrift) maxDrift = d; lastFire = n; }, 8).unref();
  setInterval(() => {
    const cu = process.cpuUsage(), m = process.memoryUsage();
    if (process.send) process.send({ cpuUs: cu.user + cu.system, rss: m.rss, heap: m.heapUsed, eldMean: h.mean / 1e6, eldP99: h.percentile(99) / 1e6, eldMax: h.max / 1e6, drift: maxDrift, tickMs: ticks ? tickNs / ticks / 1e6 : 0, tickMax: maxTickMs, ticks });
    h.reset(); maxDrift = 0; tickNs = 0; ticks = 0; maxTickMs = 0;
  }, 1000).unref();
  return;
}

// ---- orchestrator ----
const { spawn, spawnSync } = require('child_process');
const { monitorEventLoopDelay } = require('perf_hooks');
let WebSocket; try { WebSocket = require('ws'); } catch (e) { WebSocket = require(path.join(process.env.NODE_PATH || '', 'ws')); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOMS = arg('rooms', '1,2,4,8,16,24,32').split(',').map(Number), SECS = +arg('secs', 40), HEAP = +arg('heap', 300), PORT = +arg('port', 8199);
const AFF = +arg('affinity', 0); // 0 = none; else core index to pin the server to (Windows), bots use the other cores
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

function pin(pid, mask) { if (process.platform !== 'win32' || !mask) return; spawnSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).ProcessorAffinity = ${mask}`]); }

function bot(name, stats) {
  const b = { name, token: null, state: 'new', code: null, snaps: 0, last: 0, t: 0, dx: 0, dy: 0 };
  b.connect = () => new Promise((res, rej) => {
    b.ws = new WebSocket('ws://127.0.0.1:' + PORT, { headers: { 'user-agent': 'LIHL-LOADTEST' } });
    b.ws.on('error', rej);
    b.ws.on('open', () => { b.ws.send(JSON.stringify({ t: 'hello', name })); });
    b.ws.on('message', d => {
      const now = performance.now(), len = d.length;
      stats.bytes += len;
      if (len > 8 && d[0] === 123 && d[6] === 115 && d[7] === 34 && d[5] === 34 && d[1] === 34 && d[2] === 116) { // {"t":"s"
        stats.snaps++; if (b.last) { stats.iv.push(now - b.last); } b.last = now; return;
      }
      let m; try { m = JSON.parse(d); } catch (e) { return; }
      if (m.t === 'welcome') { b.state = 'welcome'; res(); }
      else if (m.t === 'room') b.room = m;
      else if (m.t === 'start') b.state = 'playing';
      else if (m.t === 'err') stats.errs++;
    });
    b.ws.on('close', () => { b.state = 'closed'; });
  });
  b.send = o => { if (b.ws.readyState === 1) b.ws.send(JSON.stringify(o)); };
  b.input = () => { // ~30/s, random walk movement, occasional shots/passes/hits
    if (b.t-- <= 0) { b.t = 8 + Math.random() * 20 | 0; const a = Math.random() * 6.283, mag = Math.random() < 0.15 ? 0 : 1; b.dx = Math.cos(a) * mag; b.dy = Math.sin(a) * mag; }
    const r = Math.random();
    b.send({ t: 'in', x: +b.dx.toFixed(2), y: +b.dy.toFixed(2), sh: r < 0.03 ? 1 : 0, pw: +(0.4 + Math.random() * 0.6).toFixed(2), ps: r > 0.97 ? 1 : 0, hit: r > 0.45 && r < 0.47 ? 1 : 0 });
  };
  return b;
}

async function runN(N) {
  const env = Object.assign({}, process.env, { PORT: String(PORT), LIHL_TEST: '1', MAX_ROOMS: '200', LT_PROBE: '1' });
  const child = spawn(process.execPath, ['--max-old-space-size=' + HEAP, '-r', path.join(__dirname, 'loadtest.js'), path.join(__dirname, 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  child.stderr.on('data', d => process.stderr.write('[srv] ' + d));
  const probes = []; child.on('message', m => probes.push(Object.assign({ at: Date.now() }, m)));
  let dead = false; child.on('exit', () => { dead = true; });
  await sleep(1500);
  if (AFF) { pin(child.pid, 1 << AFF); const all = (1 << Math.min(os32(), 30)) - 1; pin(process.pid, all & ~(1 << AFF)); }
  const clientStats = { bytes: 0, snaps: 0, iv: [], errs: 0 };
  const bots = [];
  for (let i = 0; i < N; i++) {
    const a = bot('LT-A' + i, clientStats), b = bot('LT-B' + i, clientStats); bots.push(a, b);
    await a.connect(); await b.connect();
    a.send({ t: 'create', pub: false }); await sleep(60);
    const code = a.room && a.room.code; if (!code) throw new Error('no room for pair ' + i);
    b.send({ t: 'join', code }); await sleep(60);
    b.send({ t: 'team', idx: (2 * i + 1) % 30 }); a.send({ t: 'team', idx: (2 * i) % 30 }); await sleep(40);
    a.send({ t: 'ready', v: true }); b.send({ t: 'ready', v: true });
  }
  const t0 = Date.now(); while (bots.some(b => b.state !== 'playing') && Date.now() - t0 < 15000 + N * 300) await sleep(200);
  const playing = bots.filter(b => b.state === 'playing').length;
  const inputIv = setInterval(() => { for (const b of bots) if (b.state === 'playing') b.input(); }, 33);
  const eld = monitorEventLoopDelay({ resolution: 5 }); eld.enable();
  await sleep(3000); // warm up
  const w0 = Date.now(), p0 = probes.length; clientStats.bytes = 0; clientStats.snaps = 0; clientStats.iv = [];
  await sleep(SECS * 1000);
  const wall = (Date.now() - w0) / 1000, ps = probes.slice(p0);
  const botEldP99 = eld.percentile(99) / 1e6; eld.disable(); clearInterval(inputIv);
  const res = { N, playing: playing / 2, serverDead: dead, wall };
  if (ps.length >= 2) {
    const first = ps[0], lastp = ps[ps.length - 1];
    res.cpuPerRoom = (lastp.cpuUs - first.cpuUs) / 1e6 / ((lastp.at - first.at) / 1000) / Math.max(1, playing / 2); // core-seconds per wall-second per room
    res.cpuTotal = res.cpuPerRoom * Math.max(1, playing / 2);
    res.rssMB = Math.max(...ps.map(p => p.rss)) / 1048576; res.heapMB = Math.max(...ps.map(p => p.heap)) / 1048576;
    res.eldP99 = Math.max(...ps.map(p => p.eldP99)); res.eldMax = Math.max(...ps.map(p => p.eldMax)); res.driftMax = Math.max(...ps.map(p => p.drift));
    res.tickMs = ps.reduce((a, p) => a + p.tickMs, 0) / ps.length; res.tickMax = Math.max(...ps.map(p => p.tickMax));
  }
  const nb = Math.max(1, playing);
  res.snapRate = clientStats.snaps / wall / nb; res.ivP50 = pct(clientStats.iv, 0.5); res.ivP99 = pct(clientStats.iv, 0.99);
  const mean = clientStats.iv.reduce((a, x) => a + x, 0) / Math.max(1, clientStats.iv.length);
  res.jitter = Math.sqrt(clientStats.iv.reduce((a, x) => a + (x - mean) * (x - mean), 0) / Math.max(1, clientStats.iv.length));
  res.kbps = clientStats.bytes / wall / nb / 1024; res.errs = clientStats.errs; res.botEldP99 = botEldP99;
  for (const b of bots) try { b.ws.terminate(); } catch (e) { }
  child.kill(); await sleep(800);
  return res;
}
function os32() { return require('os').cpus().length; }

(async () => {
  console.log(`loadtest: secs=${SECS} heap=${HEAP}MB affinity=${AFF || 'none'} node=${process.version} cpus=${os32()}`);
  const rows = [];
  for (const N of ROOMS) {
    try { const r = await runN(N); rows.push(r); console.log(JSON.stringify(r)); } catch (e) { console.log('N=' + N + ' failed: ' + e.message); }
  }
  const f = (x, d = 2) => x === undefined ? '-' : x.toFixed(d);
  console.log('\nrooms | playing | cpu/room (core-s/s) | cpu total | tick ms avg/max | ELD p99 ms | drift max ms | RSS MB | heap MB | snap/s/bot | iv p50/p99 ms | jitter ms | KB/s/client | bot ELD p99');
  for (const r of rows) console.log([r.N, r.playing, f(r.cpuPerRoom, 4), f(r.cpuTotal, 3), f(r.tickMs, 2) + '/' + f(r.tickMax, 1), f(r.eldP99, 1), f(r.driftMax, 1), f(r.rssMB, 0), f(r.heapMB, 0), f(r.snapRate, 1), f(r.ivP50, 1) + '/' + f(r.ivP99, 1), f(r.jitter, 1), f(r.kbps, 1), f(r.botEldP99, 1)].join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
