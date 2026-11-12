# LIHL server load test

Tool: `server/loadtest.js` (local only, it spawns its own server on 127.0.0.1:8199).

    set NODE_PATH=<dir containing ws>      (only if server/node_modules is missing)
    node server/loadtest.js --rooms 1,2,4,8,16,24,32 --secs 40 --affinity 30 --heap 300

Each room = 2 bots (user-agent `LIHL-LOADTEST`, so the server ignores them in /admin stats: conn, name, game_start, game_end). Bots create/join, pick teams, ready, then send ~30 `in` msgs/s each (random-walk movement, ~3% shots, ~3% passes, ~2% hits). The server runs as `node --max-old-space-size=300 -r loadtest.js server.js`; the preload probe (LT_PROBE=1) reports once per second: process.cpuUsage, RSS, heap, event-loop delay (perf_hooks), setInterval(8ms) drift, and sim tick duration (wrapped `sim.tick`). Bots report snapshot rate, interval p50/p99, jitter (stddev) and bytes/s.

## Measured (dev PC, Windows 11, Node 24, server pinned to ONE core, 32-logical-core box shared with other jobs, 40 s per row)

| rooms | cpu/room (core-s/s) | cpu total | tick ms avg/max | ELD p99 ms | RSS MB | heap MB | snap/s/bot | snap iv p50/p99 ms | KB/s/client |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.024 | 0.02 | 0.36/0.9 | 30 | 72 | 11 | 30.0 | 31/48 | 24.9 |
| 2 | 0.179 (noise) | 0.36 | 0.44/1.3 | 21 | 74 | 13 | 30.0 | 32/48 | 24.2 |
| 4 | 0.048 | 0.19 | 0.44/5.4 | 43 | 79 | 17 | 29.9 | 31/49 | 24.3 |
| 8 | 0.025 | 0.20 | 0.42/23 | 51 | 90 | 22 | 29.9 | 31/55 | 24.0 |
| 16 | 0.025 | 0.40 | 0.53/89 | 59 | 114 | 34 | 30.0 | 31/65 | 24.3 |
| 24 | 0.021 | 0.50 | 0.51/46 | 105 | 150 | 56 | 30.0 | 32/72 | 24.1 |
| 32 | 0.021 | 0.66 | 0.51/34 | 214 | 160 | 60 | 29.9 | 32/77 | 24.1 |

Notes on noise: this PC was busy with other jobs and Windows timers tick at about 15 ms, so ELD p99 of 20-60 ms appears even at 1 room (the bot process shows the same ~17 ms). The N=2 and N=4 cpu rows include scheduler noise; steady state is 0.021-0.025 core per room. Treat ELD below about 60 ms as floor noise on this host, not server load.

## What it says
- Steady cost: about **0.022 core per running room** (2 players) on this PC, of which the sim tick is 0.4-0.5 ms x 30 Hz = ~0.014 core; the rest is ws send/receive and JSON.
- Memory: ~60 MB base + ~3 MB per room (160 MB RSS at 32 rooms, under a 300 MB heap cap). Not the bottleneck on 1 GB.
- Bandwidth: ~24 KB/s (about 0.2 Mbit/s) per client down, tiny up. 32 rooms = ~1.6 MB/s = ~13 Mbit/s. Not a bottleneck on Oracle (hundreds of Mbit/s).
- Snapshot delivery stays at 30/s per client up to 32 rooms, with interval p99 77 ms.
- **First bottleneck: CPU**, and specifically the fact that the server is a single Node thread (one core max, regardless of OCPU count).

## Capacity estimates (assumptions, NOT production measurements)
Assumption A: Oracle E2.1.Micro sustained share = 1/8 of a core (0.125). Assumption B: its core is 2x slower than this dev PC (unknown; AMD EPYC at about 2 GHz vs a modern desktop core; if wrong, scale linearly). Plan to use at most 70% of the budget so event-loop delay stays low.

- Micro: 0.125 x 0.70 / (0.022 x 2) = **about 2 rooms (4 players)** safe. If the core were as fast as this PC, about 4 rooms. Bursting above 1/8 is possible but throttled when sustained, so do not count on it. Real-world: run `loadtest.js --rooms 2,4 ` on the actual instance (loopback, so no network exposure) to confirm.
- ARM A1 (4 OCPU, 24 GB): one Node process uses one core. Assume Neoverse N1 about 1.5x slower than this PC: 0.033 core/room, 70% of one core = **about 20 rooms (40 players) per process**. To use the other cores, run several server processes on different ports (needs a front router or separate URLs per process); 4 processes would give about 80 rooms. RAM is irrelevant at this scale. Also `MAX_ROOMS` defaults to 40 and caps rooms per process.
- 40 concurrent rooms would load one dev-PC core to roughly 0.9, so MAX_ROOMS=40 is not safe for a single process on any slow core; lower it to match the above (about 2-3 on the micro).

## Optimizations reviewed
- Already present: paused rooms skip tick and send; the snapshot string is built once per tick and shared by both players; no per-message deflate; sim ticks stop when a room is not `playing`.
- Possible later (not done, not safe to rush): send only to connected players is already done; lowering the broadcast rate to 20 Hz for the micro would cut ~1/3 of ws send cost but changes the feel and needs net.js interpolation changes; moving rooms into worker_threads for multi-core on ARM.
