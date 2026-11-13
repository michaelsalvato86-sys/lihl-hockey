# LIHL engine and multiplayer architecture comparison (Mega Pass 10, Agent E)

Written 2026-11-13 in worktree p10-arch. Research only: no code, hosting, account or deployment was changed. LIHL_MEGA_PASS_10_INITIAL_AUDIT.md did not exist in this worktree when I started, so it was not read; everything below is based on the repo files named in the brief plus web research.

Conventions: **[V]** = verified in this repo by reading code or data. **[S]** = from a web source (URL listed in section 14, all fetched 2026-11-13, mostly third-party aggregators, not the vendors' own price pages). **[U]** = unverified: my own knowledge or an assumption. Every price carries "(2026-11-13, source)". Re-check any price on the vendor page before you spend money.

## 0. Blunt answers first

1. **Should the whole game move to Unreal?** No, not now. A full rewrite (option 4) is roughly 18 to 30 person-months of work [U, assumptions in section 10], would replace a sim that has been balance-tested and parity-tested over 9 passes, and would drop the thing that makes LIHL cheap to reach: tap a link, play on a phone. The expected gain (visuals) can be had far cheaper by upgrading the renderer (three.js r128 from 2021 to current) and by putting an optional Unreal rendering client on the existing server later.
2. **Should the browser game be retained?** Yes. It is the distribution channel (phones, no install, free hosting at $0/month). Every Unreal option except pure native adds cost per player or a second client to maintain; none replaces "open a link".
3. **Can data and sim services be shared?** Yes, and this is the key architectural move. The Node server is already authoritative, runs the real sim headless, and speaks a small JSON protocol (30 Hz snapshots, id-stamped animation events). A second client (Unreal, Godot, anything with a websocket) can render the same matches. The sim, rosters, matchmaking, replay-break protocol, stats and any future season data stay in one place. What can NOT be shared is bit-exact determinism with a C++ port (section 9.9), so do not plan on two sims.
4. **Recommended path:** keep browser + Node as the product (option 1 and 5), spend Pass 10 and 11 on the renderer upgrade and a documented, versioned client protocol, then build a time-boxed Unreal rendering-client prototype (option 3) on a Windows PC to learn whether Unreal visuals/animation are worth a second client. Decide on Pixel Streaming only after that, because streaming cost is a per-player-hour bill (section 7).

## 1. What LIHL is today (verified facts that drive everything below)

- **Sim** [V]: the inline script of the shipped game page (`server/game_index.html`, about 176 KB including the roster blob) is run headless in a Node `vm` context with a permissive DOM stub (`server/sim_host.js`). One vm context per room. The browser never decides goals, possession, penalties or the clock. This means the sim is not a clean module: it is the browser game's own script with its rendering calls stubbed. Any port to C++ is a port of that script's logic, not of a library.
- **Server** [V] (`server/server.js`, 239 lines, one dependency `ws`): rooms with codes `LIHL-XXXX`, public list, quick-match queue (2 players), 30 Hz tick (`TICK_MS = 1000/30`), reconnect grace 45 s via a per-session token, CPU takeover on drop, chat presets, rematch, jersey choice (0 home / 1 away / 2 alt, server resolves colour clashes), `MAX_ROOMS` default 40 (the Oracle script sets 3), replay break protocol.
- **Identity** [V]: no accounts and no database. A client gets a random 16-hex `token` in `welcome`, stored in `sessionStorage`; the display name is sanitized to 14 chars. The tracking id is a salted SHA-256 of the IP, truncated. Stats (`events.jsonl`, `/admin/stats`) are visitor analytics, not player statistics.
- **Snapshot** [V] (`netSnap` in sim_host.js): JSON object `{k tick, c clock, pd period, ot, sc[2], sh[2], pa pause, fo faceoff, ov over, pk puck [x,y,vx,vy,ownerId,(z)], t[2] teams, nt note, hc human controllers, rb replay-break flag}`. Each team: `s` seat ids, `pl` per skater `[id,x,y,vx,vy,facing,turn,acc01,back,stamina,skq]` where `skq` is one packed int (edge 3 bits, stop 3 bits, flags 2 bits, stride phase 5 bits), `g` goalie `[x,y,(1 while winding up)]`, `pu` goalie pulled, `pen` penalties `[id, timeLeft]`, `lb` label. Average 833 bytes, 0.17 ms per tick [S: LIHL_MEGA_PASS_9_REPORT.md], about 24 KB/s per client downstream [V: docs/LOAD_TEST.md].
- **Player id on the wire** [V]: `pidOf(p) = teamIndex*100 + rosterIndex` (99 if not in roster, -1 none). This is a within-match index, not the league player id.
- **Events** [V]: snapshot `ev` entries `{e:'ae', i:<sim event id>, p, k, d}`, `{e:'goal', n, tm, p, k}`, `{e:'bn',...}` banner, `{e:'sfx', n}`. Table of 31 animation events in `anim_events.js` (`AEV.EVENTS`, with who, class, payload fields `d`, animation labels, priority table, dedupe rules). Clients apply each event once, at interpolated snapshot time, drop non-goal events more than 0.7 s late.
- **Client** [V] (`net.js`): interpolation buffer with 110 ms delay (`NET.delay`), ring of last 200 snapshots for replay, reconnect with token, input messages `in` at about 30/s (`x,y,sh,pw,ps,hit,sw,vs`); no client-side prediction of the player's own skater beyond that interpolation delay.
- **Replay** [V] (`docs/ONLINE_REPLAY_PROTOCOL.md`): the server pauses the room after a goal celebration (`rb`), clients replay from their own snapshot ring at 0.6x for about 4.7 s, `rbdone`/`rbend`, 8 s hard cap. No server-side recording exists, so there is no saved-replay or after-the-fact highlight.
- **Data** [V]: `data/roster.json`: 27 teams, 385 players, each `{id, name, rating, band, photo, teams[], num}` plus 3 jersey templates per team; `goalies.json` with gp/gaa; `league.json`. **Only one rating number per player exists.** The sim derives attributes in `attrs(p)`: `r = .3 + .65*clamp((rating-20)/45)` plus a per-attribute jitter `((hash(id+key)%100)/100 - .5)*.22`. Goalies map rating to a save level.
- **Randomness** [V]: 41 `Math.random()` calls in the sim and no seed. Matches are not reproducible from inputs.
- **Season mode** [V]: none in this build (no `season` hits in the shipped sim, server has no persistence). Season/stats/player accounts are all future work in every option.
- **Renderer** [V]: `three.min.js` carries a 2021 license header (r128 class, consistent with Pass 9 notes about r128 per-material tone mapping). Models are about 3.7 MB (one Quaternius CC0 base mesh plus procedural rig). The animation stack is procedural (`anim_rig.js`, `anim_ctrl.js`, IK) with 31 event ids.
- **Hosting** [V: docs/ORACLE_FREE_HOSTING.md, LOAD_TEST.md]: Docker + Caddy on an Oracle Always Free VM; measured about 0.022 core per running room on a dev PC, about 60 MB base + 3 MB per room, 0.2 Mbit/s per client.

The user states the current Oracle VM is the 1 GB micro (VM.Standard.E2.1.Micro). I treat that as given.

## 2. The options in one table

| # | Option | Visual ceiling | Hockey animation | Server authority | Browser | Phone | Dev effort (person-months, [U]) | Run cost per month |
|---|---|---|---|---|---|---|---|---|
| 1 | Keep browser game, keep improving three.js | Medium to good (PBR, shadows, WebGPU) | Procedural rig, no mocap pipeline | Node sim (exists) | Yes | Yes (best) | Continuous, about 1 to 2 per pass | $0 |
| 2 | Separate native Unreal game (offline, no online) | Highest | Best (mocap, Control Rig, Motion Matching) | none | No | Hard | 12 to 18 | $0 |
| 3 | Unreal rendering client over existing JS sim server | Highest | Best, driven by our event ids | Node sim (kept) | Only via Pixel Streaming | Android ok, iOS costly | 6 to 10 for a polished client | $0 to $6 native; PS bill per section 7 |
| 4 | Unreal for everything (UE dedicated server, rewrite sim) | Highest | Best | UE server | Only via Pixel Streaming | Android ok, iOS costly | 18 to 30 | $20 to $60 servers + distribution |
| 5 | Browser game kept alongside Unreal | n/a | n/a | One sim shared (needs option 3) or two sims (option 4) | Yes | Yes | adds 15 to 25 percent upkeep on top of whichever | $0 plus the Unreal side |

Effort numbers assume: 1 experienced Unreal C++ developer, 1 technical animator, part-time art support, existing JS sim as the spec, no console, no AAA fidelity. See section 10 for the build-up.

## 3. Option notes

### Option 1: browser game, improve three.js
- Cheapest visual win available: the bundled three.js is from 2021. Current release is r187 (npm 0.187.0, 2026-10-30) [S: utsubo.com]. `three/webgpu` has shipped `WebGPURenderer` with WebGL2 fallback since r171 (2024-11-29) [S]; Safari 26 ships WebGPU on iOS 26 and macOS 26 [S: Wikipedia], older iOS gets WebGL2 only. WebGPU is a Candidate Recommendation, and R3F support is incomplete [S]; we do not use R3F.
- Costs of upgrade [U]: our custom `Reflector.js`, `EffectComposer` passes, `GLTFLoader` and `SkeletonUtils` copies are r128 vintage and will need replacing; tone-mapping behavior changed (Pass 9 already patched double tone mapping). Expect 1 to 2 person-months including visual regression capture. Keep WebGL2 as the default path; add WebGPU behind a flag.
- Ceiling: it will not match Unreal for hair, cloth, skin, Nanite arenas, Lumen lighting or hockey-grade mocap (Pass 9 reports backward skating still reads as a squat on some frames). It can look like a good stylized sports game, not an NHL broadcast.

### Option 2: separate native Unreal game
- Highest quality, no server cost, but throws away online play unless rebuilt; the sim must be re-implemented (section 9.9). Distribution is a download, which is wrong for a rec-league audience that arrives from a link or QR code.
- Only sensible if the product becomes a paid PC game. Not the LIHL goal.

### Option 3: Unreal rendering client over the existing JS sim server (the bridge)
What the bridge needs:
1. **WebSocket client in UE.** UE ships a WebSockets module (`IWebSocket`) [U, from Epic API knowledge]; it speaks text frames, so the existing JSON works unchanged. TLS to `wss://` is supported. Use FJsonObject/FJsonSerializer, or a binary format later.
2. **Protocol:** `hello` (with `caps:{replay:1}` plus a new `client:'ue'`, `proto:N`), `welcome` (token, name, teams), room/lobby messages, `start`, then snapshots and `ev`. Needs a **versioned protocol document** (the repo has only the replay doc). The snapshot is currently an object with positional arrays, which is fine to parse but brittle: add `proto` version and a `schema` doc before a second client exists. Also needed: the field "sim unit to meters" (x,y axes, facing sign, puck z), which I did not verify; define it in the doc.
3. **Interpolation:** port `net.js` logic: buffer snapshots by tick `k`, render at `now - 110 ms`, ignore non-newer ticks, extrapolate briefly. Replay ring of 200 snapshots re-fed through the same path gives replays for free, matching the existing `rb` protocol exactly.
4. **Animation events:** map `AEV.EVENTS` ids to Animation Montages / state machine transitions. The sim id `i` seeds variant choice (goalie side, pump, celebration pick), so UE must hash the same id the same way for both players to see the same variant. Dedupe by id and the 0.7 s late-drop rule carry over. The 31 events plus 3 state-driven celebration states are the whole animation API.
5. **Skater pose inputs from snapshot:** position, velocity, facing, `turn`, `acc01`, `back`, stamina, packed edge/stop/flags/phase. This is enough to drive a locomotion blend space and foot IK. It is NOT enough for stick position, upper body lean or head look; either the client derives those (as the three.js client does today) or the snapshot grows fields (cost: bytes).
6. **Server stays authoritative:** input messages unchanged. UE sends `in`. No prediction beyond interpolation is required for parity with today's feel; adding local prediction for the controlled skater is a later improvement in either client.
7. **Node sim on Oracle:** unchanged. The UE client is just another websocket client. The server's `tracking` should record `client` type.
- Gap: the bridge needs a **UE project, art, UI, input (gamepad/keyboard), audio and packaging** regardless of the network layer. Networking is the small part; animation and art are most of the cost.
- Gap: lobby, jersey choice, chat, rematch, reconnect, and replay-break all work unchanged if the protocol is followed.

### Option 4: Unreal for everything
- **Dedicated server with replication:** UE dedicated server needs a **source build** of the engine to produce the Server target [U], plus a Linux cross-compile toolchain from Windows [U]. Actors (skater, puck, goalie) replicate with Iris (the new replication system; production status in 5.7 is unverified [U]) or classic replication. Puck at 30 Hz needs custom replication and likely a fixed tick.
- **Mover / Network Prediction:** Epic's Mover plugin (the successor to Character Movement for custom movement) and Network Prediction are experimental/beta as of my knowledge [U]; hockey skating (edge-radius turning, grip budget, hockey stop) is custom movement, so Mover is the intended fit but would add risk. The alternative, a fixed-step custom sim in C++ with snapshot replication (essentially what Node does now), is more predictable.
- **GAS (Gameplay Ability System):** fits shots, hits, passes, poke checks as abilities with cooldowns and cost (stamina) and gives replication of tags/attributes. It is heavy for a 2-player sports sim; a plain state machine is simpler. Treat GAS as optional.
- **Matchmaking, accounts, stats storage:** Unreal gives none of these as a hosted product; you add Epic Online Services, Steam, PlayFab, Nakama or your own backend [U]. That means rebuilding what `server.js` already does (rooms, codes, queue, reconnect, chat) in a different stack.
- **Rewrite scope:** sim (skating, puck physics, passing, shooting, goalie, hits, fights, penalties, face-offs, AI of 10 skaters + 2 goalies, line changes, goalie pull), the replay-break protocol, stats, rosters and attribute derivation, jerseys, announcer line logic. Roughly 115 KB of dense JS [U: estimate from file size minus roster blob], with 9 passes of tuning embedded in magic numbers.
- Unique upsides: UE-native replay (DemoNetDriver), spectators, UE tooling for crowds and cameras, one language on server and client (C++), console path.
- Unique downsides: losing the browser/phone reach, high cost to re-tune balance (Pass 8/9 balance studies would have to be redone against a new sim), and engineering time that does not produce new game features for most of a year.

### Option 5: keep the browser game alongside Unreal
- With option 3 this is cheap: both clients talk to the same sim. The browser client remains the "everyone" path, Unreal is the "premium" path. Upkeep is the protocol contract (any new snapshot field or event must be implemented twice) and visual parity of the event table (31 events x 2 clients).
- With option 4 it is expensive: two sims that drift. Do not do this; a rule difference between browser and Unreal would make cross-play unfair.

## 4. Other engines (one page)

| Engine | License / cost [S unless noted] | Visuals | Hockey animation | Physics / multiplayer | Browser | Mobile | Dev speed for us | Real advantage for LIHL |
|---|---|---|---|---|---|---|---|---|
| Godot 4 | MIT, free [U] | Good (Vulkan forward+), well below UE5 | AnimationTree, IK nodes; fine, no mocap tooling comparable to UE [U] | Built-in high-level multiplayer (ENet, WebSocket, WebRTC) and Jolt physics option [U] | Web export exists, with threading/cross-origin-isolation caveats and larger downloads than three.js [U] | Android and iOS export [U] | Fast; GDScript | Best "second client" for a small team: free, small, websocket client is trivial, could reuse the same Node server (as option 3, without the royalty or the 40 GB toolchain). iOS still needs a Mac. |
| Unity 6 | Personal free below $200k revenue/funding; Pro $2,310 per seat per year (2026-11-13, tech-insider.org, third-party); runtime fee cancelled 2024-09-12 [S] | Good (URP/HDRP) | Good; mocap pipeline is mature | Netcode for GameObjects / Entities, dedicated server builds; Unity Gaming Services (matchmaking, lobbies) are hosted options [U] | WebGL export, large builds, no multithreading, mobile browser support is weak [U] | Best mobile tooling [U] | Fast; C# | Best mobile native story and hosted matchmaking. But not better than three.js on the web, not better than UE in AAA visuals, and Unity's trust cost remains. |
| Bevy | MIT/Apache, free | Capable but young; no editor | Animation graph is immature; weakest here [U] | Rust; networking via community crates (lightyear, renet) [U] | WASM/WebGL2/WebGPU works [U] | Android and iOS possible but rough [U] | Slow for art-heavy work | Only advantage: one Rust codebase for server and client sim (shared deterministic sim). High cost; poor fit for a team that does not already write Rust. |
| O3DE | Apache 2.0, free [U] | Atom renderer, AAA-leaning | Emotion FX, adequate | Built-in multiplayer (Netcode, Multiplayer Gem) [U] | None | Weak [U] | Slow; small community [U] | None for LIHL; skip. |
| three.js + WebGPU (r16x+, current r187) | MIT, free | Good: PBR, TSL node materials, compute, GPU skinning | Procedural/GLTF clips; we already own it | Our Node server | Native | Yes; WebGPU on Safari 26+/Chrome, WebGL2 fallback | Already ours | Zero migration, free hosting, instant play. Ceiling lower than UE. This is the default. |

Verdict: no engine other than Unreal has a visual advantage worth a rewrite. Godot is the only one worth a second look, and only as a cheaper alternative to Unreal for the "native client over the same server" idea.

## 5. Evaluation matrix across the requested dimensions

| Dimension | 1 Browser three.js | 2 Native UE | 3 UE client + Node sim | 4 UE everything | 5 Browser + UE |
|---|---|---|---|---|---|
| Server-authoritative sim | Yes, exists (Node vm) | No | Yes, same | Yes, new C++ | Yes if 3, split if 4 |
| Dedicated servers | Node room process | n/a | Node room process | UE dedicated server per match or multi-match | Node (and UE if 4) |
| Replication | Custom JSON snapshots 30 Hz | n/a | Same | Iris / classic replication, custom puck | Mixed |
| Client prediction | None beyond 110 ms interpolation (feels laggy on high ping; improvement is cheap) | n/a | Same; can add in UE | Mover/Network Prediction (risky) or custom | Per client |
| Interpolation | Yes `net.js` | n/a | Reimplement | Engine-provided for characters; custom for puck | Per client |
| Reconnection | Yes token + 45 s grace | n/a | Same server logic, new client code | Rebuild (Online Subsystem session reconnect) | Per sim |
| Matchmaking | Yes room codes, public list, 2-player queue | n/a | Same | Rebuild (EOS/Steam/PlayFab/custom) | Per sim |
| Replay | Client ring of 200 snapshots + `rb` protocol | UE replay system | Reuse snapshot ring in UE | DemoNetDriver, plus new rb protocol | Per sim |
| Player identity | Session token + display name only | Local profile | Same, to be improved with accounts | Needs accounts (EOS/Steam) | Needs shared account to make sense |
| Season mode | None today | Would be local | Server-side service on Node (shared) | Server-side C++/backend | Needs shared service; do it once, outside the sim |
| Statistics | `G.pst` per match in memory + analytics only | Local | Add results endpoint, shared | Rebuild | Shared service |
| Hosting cost | $0 now | $0 | $0 to about $6/month | $20 to $60/month plus distribution | Sum |
| Deployment complexity | Docker + Caddy, `git pull`-sized | Installer/store builds | Same server + UE packaging per platform | UE build farm + server fleet | Both |
| Browser access | Native | None (UE5 has no WebGL export since 4.24 [U]) | Pixel Streaming only | Pixel Streaming only | Browser client native |
| Windows | Browser | Yes | Yes | Yes | Yes |
| Android | Browser (works today) | Yes (UE supports, $25 one time Play fee [S]) | Yes | Yes | Yes |
| iOS | Browser (works; Safari 26 WebGPU) | Needs Mac for Xcode build/sign [U]; $99/yr Apple Developer [S]; App Review | Same | Same | Browser avoids all of it |
| Console | no | Needs approved dev programs per platform, NDA tooling [U]; not realistic for a rec-league game | no | no | no |

## 6. Hosting prices (all dated 2026-11-13)

All from third-party search results, not vendor pages [S]. Verify before buying.

| Provider | Item | Price | Source |
|---|---|---|---|
| Oracle Cloud | Always Free E2.1.Micro (AMD, 1/8 OCPU burst, 1 GB), up to 2 per account | $0 | docs.oracle.com resourceref; braindetox/space-node summaries |
| Oracle Cloud | Always Free Ampere A1 | Now 2 OCPU + 12 GB total (was 4 + 24); effective date sources disagree (2026-06-15 vs 2026-08-18); exceeding it can disable all A1 and delete after 30 days; idle reclaim (CPU 95th percentile, network all under 20% over 7 days) reported by third parties, unverified | linuxiac.com, labmemo.com, oracommit.blogspot.com |
| Hetzner Cloud | CX23 (2 vCPU, 4 GB, 40 GB, 20 TB traffic) | €5.49/month (2026-06-15 increase from €3.99, which was up from €2.99); about €5.99 with IPv4, sources conflict | northflank, byteiota, comparedge |
| Hetzner Cloud | CPX22 (2 vCPU shared AMD, 80 GB) | €19.49/month (June), €7.99 in April | byteiota, northflank |
| AWS EC2 | g4dn.xlarge (1x T4, 16 GB GPU) on-demand us-east-1 Linux | $0.526/h, about $384/month | doit.com, devzero.io (dated 2026-11-10) |
| AWS EC2 | g5.xlarge (1x A10G, 24 GB) | $1.006/h, about $734/month | doit.com, ec2calc.cloud |
| AWS EC2 | g6.xlarge (1x L4, 24 GB) | about $0.805/h; reserved 1Y $0.624; spot about $0.23 (167/month) | holori, devzero |
| GCP | g2-standard-4 (1x L4) | $0.705/h on-demand, $0.323 spot (another article says about $0.59, conflict) | getdeploying, qovery |
| Azure | NV6ads A10 v5 | $0.454/h East US (this is a fractional A10, a sixth, 4 GB VRAM [U]; too small for UE5 at 1080p) | devzero |
| AWS GameLift | c6a.4xlarge (16 vCPU, 32 GB) | about $0.741/h; AWS's own example estimates 4 UE5 sessions per instance (their heavy example) | aws.amazon.com/gamelift/servers/pricing |
| Gameye (managed game servers) | 1 vCPU:2 GB | $0.07 per vCPU-hour, egress included | gameye.com |
| Edgegap | per vCPU | $0.00115 per vCPU-minute (= $0.069/h), + $0.10/GB egress | edgegap.com |
| Windows licensing | | AWS says Windows can make instances nearly 2x Linux | aws.amazon.com/gamelift pricing |
| Egress | AWS internet egress | about $0.05 to $0.09/GB depending on tier | search summary, game-ace.com |
| Unreal | Engine license | Free; 5% royalty on lifetime gross revenue above $1,000,000 per product; Epic Games Store sales royalty-free (one source says 3.5% for "Launch Everywhere", conflicting) | unrealengine.com/license, 300mind.studio |
| Apple | Developer Program | $99 per year | multiple blogs |
| Google | Play Console | $25 one time | multiple blogs |
| Unity | Pro | $2,310 per seat per year | tech-insider.org |

Windows dedicated servers are worse in every dimension for us (licensing roughly doubles cost [S], heavier OS). Per-instance cost for a Linux UE dedicated server is not published anywhere I could find; AWS's GameLift example (4 UE5 sessions per 16 vCPU box, about $0.185 per session-hour) is for a heavy general session, not a 2-player hockey match. For hockey I assume 1 to 2 matches per vCPU after tuning [U], which means $0.01 to $0.07 per match-hour on Gameye/Edgegap-type rates. A load test of a real UE server build is the only way to know.

## 7. Cost scenarios

### (c) Current JS stack, as is
- **$0/month**: Oracle E2.1.Micro, duckdns/sslip.io name, Caddy certificates [V: ORACLE doc].
- **Capacity**: measured 0.022 core per room on a fast desktop core [V: LOAD_TEST.md]. The micro is 1/8 OCPU burstable; assuming it behaves like 0.1 to 0.2 of a desktop core under load [U], about 4 to 8 simultaneous rooms. `MAX_ROOMS=3` set by oracle_setup.sh is consistent with that. Memory: 60 MB base + 3 MB per room fits in 1 GB. Bandwidth: 24 KB/s per client downstream; a player-hour is about 86 MB, 20 TB traffic would cover about 230,000 player-hours (on a Hetzner plan; Oracle's free outbound limit is 10 TB/month [U]).
- **If it outgrows the micro**: Hetzner CX23 at €5.49/month (2026-11-13, [S]) has 2 vCPU and 4 GB. By the load test table that comfortably runs more than 30 rooms (60 players); confirm on that VM.
- **Risk**: Oracle idle-reclaim and the A1 reduction [S]; the micro is not part of the cut, but verify the account stays "Always Free".

### (a) Windows native client with a dedicated server on a small Linux VM
Two versions:
- **a1: Unreal client + our Node server (option 3):** server cost is the same as (c): $0 on the micro or €5.49 on Hetzner. Extra costs: Steam Direct fee ($100 per app [U]) or itch.io ($0) distribution, optional code signing certificate ($100 to $400/year [U]), no royalty until $1M lifetime gross [S]. Infrastructure total: **$0 to $6/month**.
- **a2: Unreal client + Unreal dedicated server (option 4):** Linux server on Hetzner 4 vCPU class. Hetzner CPX22 (2 vCPU) is €19.49/month [S]; a 4 vCPU 8 GB plan is probably €10 to €40 depending on CX/CPX line [U, not found in search]. Assume 8 to 20 concurrent 2-player matches [U, needs load test]. Infrastructure total: **about $20 to $60/month** for up to a few dozen concurrent players, plus a Windows build machine (can be your own PC; CI runner optional).
- Neither fits on the Oracle micro: a UE dedicated server needs more than 1 GB and more CPU [U]. a1 does not need UE on the server at all.

### (b) Pixel Streaming
Pixel Streaming runs the Unreal client on a GPU server and streams video to a browser (WebRTC). Facts and assumptions:
- **One UE instance per player**: Epic's plugin is designed mainly for one application per user, and Epic recommends one UE instance per GPU to avoid encoder bottlenecks [S: forums.unrealengine.com]. Density is not published. A vendor estimates 2 to 4 streams per L40S and 4 to 8 per RTX PRO 6000 at 1080p60 [S: 10n.tech]; blogs assume 1 to 3 per T4/A10G [S: game-ace, strayspark]. I use **1 stream per GPU (conservative, g5.xlarge A10G)** and **2 streams per GPU (optimistic, L4)**. Both are assumptions to be load tested.
- **Latency:** sources cite under 100 ms round trip on LAN and under 150 ms internet as acceptable [S: abratabia, inknalgorithm]. For LIHL the stream adds encode + network + decode on top of the game's own 33 ms tick + 110 ms interpolation, so button-to-photon for a shot is likely 150 to 300 ms [U]. That is tolerable for a casual sim and painful for a skill-based sports game. Two players on different coasts must each stream from a region near them.
- **Cold start:** an Unreal instance takes minutes to start, so a warm pool is needed [S: strayspark]. A pool of 2 g5.xlarge always on is about $1,469/month ($734 each, [S]).
- **Egress:** 1080p at about 10 Mbit/s [U] is about 4.5 GB per stream-hour, about $0.41 at $0.09/GB [S range 0.05 to 0.09].

Cost per concurrent stream-hour: A10G 1 per GPU: $1.006 + 0.41 = **about $1.41**. L4 2 per GPU: $0.805 / 2 + 0.41 = **about $0.81**. Vendor-managed offerings quote about $0.50 to $1.08 per stream-hour [S: strayspark, forum post; promotional]. All numbers 2026-11-13.

| Peak concurrent players | GPU instances (A: 1/GPU g5 / B: 2/GPU g6) | $/hour at peak, A | $/hour at peak, B | Month if peak load runs 3 h/day (90 h) A / B | 24/7 warm floor extra |
|---|---|---|---|---|---|
| 10 | 10 / 5 | $14.1 (10.06 + 4.05) | $8.1 (4.03 + 4.05) | $1,270 / $730 | add about $1,470 for 2 warm g5 around the clock |
| 50 | 50 / 25 | $70.6 | $40.4 | $6,350 / $3,640 | same |
| 200 | 200 / 100 | $282 | $161 | $25,400 / $14,500 | same |

Autoscaling makes real bills lower than "everyone at peak", but only if instance start time (minutes) is hidden; a 200-player peak is plausible for a rec-league promo night, not a steady state. Add 5 to 15% for a signaling/matchmaker VM, storage and IPv4 [U]. To compare: our current stack serves 200 peak players at about 2 to 3 server cores (200 x 0.011 core per player from the load test) and about 5 MB/s, roughly $6 to $20 per month [derived from V numbers].

Windows vs Linux GPU instances: Windows adds licensing (about 2x per AWS [S]); Linux Pixel Streaming works but with fewer tutorials and driver pitfalls [S: eagle3dstreaming blog]. Use Linux if the engine build allows.

### Summary of monthly infrastructure

| Scenario | Monthly |
|---|---|
| (c) Current JS stack on Oracle micro | $0 (est. about $6 on Hetzner if outgrown) |
| (a1) Windows UE client over Node server | $0 to $6 |
| (a2) Windows UE client + UE Linux dedicated server | about $20 to $60 (estimate) |
| (b) Pixel Streaming, 10 peak | about $730 to $1,270 for 3 h/day peak + warm pool; $1,470+ if kept warm 24/7 |
| (b) Pixel Streaming, 50 peak | about $3,640 to $6,350 |
| (b) Pixel Streaming, 200 peak | about $14,500 to $25,400 |

## 8. Browser access and platforms in detail

- **Browser:** UE5 has no WebGL/HTML5 export [U: removed after 4.24]. The only route to a browser is Pixel Streaming. Pixel Streaming 2 (WebRTC, new in the 5.4+ line [S: abratabia]) works in desktop Chrome/Edge/Safari and phones, and every minute costs a GPU.
- **Windows:** straightforward; package from Windows; distribute through Steam, Epic or itch; the GPU minimum for UE5 titles excludes older integrated graphics, which is a real audience cut for a rec-hockey crowd [U].
- **Android:** supported; need Android Studio/NDK/JDK; mobile renderer (no Lumen/Nanite on mobile in my knowledge [U]), so the visual gain over a good three.js game on phones is smaller than on desktop. Package size is large vs a link (UE mobile baseline is typically 100 MB or more [U]). Play fee $25 one time [S].
- **iOS:** Apple Developer $99/year [S]; Xcode requires macOS; Unreal can remote-build from Windows to a Mac on the network, but a Mac (or Mac cloud) is still required, plus provisioning profiles, signing certificates, TestFlight and App Review [U, verify in Epic docs]. A browser game on iOS needs none of that.
- **Console:** requires platform holder developer approval and console-specific engine source (via Epic's NDA tooling) [U]. Out of scope for LIHL.

## 9. DATA COMPATIBILITY AND INTEGRATION PLAN

### 9.1 What stays authoritative, what gets rewritten

| System | Option 3 (UE client over Node) | Option 4 (UE everything) |
|---|---|---|
| Game sim (skating, puck, AI, penalties, clock, goalie) | Node, unchanged (authoritative) | Rewritten in C++ (or Blueprint, not recommended) |
| Rooms, matchmaking, reconnect, chat, jersey choice | Node, unchanged | Rebuilt on UE sessions + backend |
| Rosters, teams, jerseys, league data | JSON files, owned by Node/data pipeline; UE imports | Same JSON imported into DataTables; backend still needed for updates from lihockey.org |
| Attribute derivation (`attrs(p)`) | Stays in JS sim; UE never needs it except for UI cards | Ported to C++ |
| Stats and season | New Node service, shared | Backend rebuilt, or the same Node service called via HTTP from UE server |
| Replay | Client ring (both clients) | UE replay system |
| Rendering, animation, audio, UI, input | UE client new; browser client unchanged | UE only |

### 9.2 JSON team/player/roster data to UE DataTables
- Source of truth stays `data/*.json` (and the pipeline that scrapes lihockey.org [U]). A small Node script `tools/export_ue_data.js` writes UE-friendly files: `teams.csv` or JSON, `players.csv`, `jerseys.csv`. UE imports CSV/JSON into DataTables via the editor importer or at runtime from the server's `welcome.teams` (which already sends `TEAMS.teams` summary: abbr, name, color, n, jn).
- Row structs: `FLihlTeam {TeamIndex, Id, Abbr, Name, Div, Color, Accent, IconPath}`, `FLihlPlayer {PlayerId, Name, Rating, Band, Number, TeamIds[], PhotoUrl}`, `FLihlJersey {TeamIndex, Slot(0/1/2), Base, Trim, Number, Sleeve, Stripe, LogoPath}`.
- **Attribute conversion:** the data holds **one rating per player**; all other attributes are derived in the sim by `attrs()`. Two choices: (1) export derived values from the Node sim (call `attrs` for every player once and write `players_attrs.csv`: reproducible, no C++ port needed for option 3); (2) port the hash and formula (option 4; the hash function `hash(id+k)` must be copied bit for bit or attributes differ). I recommend (1) in all cases because it also freezes the numbers for the UI.
- **Versioning:** server includes `dataVersion` (hash of roster.json and the sim build) in `welcome`; UE refuses to run with a stale DataTable and prompts an update. Without this a roster change would silently desync art mappings (jersey slots, numbers).
- **Index drift risk:** the wire player id is `teamIndex*100 + rosterIndex`, where the roster order is the sim's lines order [V]. If the roster order changes, the id->player mapping changes. Add a `players` array to `start` (or send `roster hash`) so the client maps wire ids to league ids from the server, not from its own copy.
- **Rights note:** player photos are hotlinked from assets.lihockey.org [V]; shipping them inside a store-distributed UE game or a streamed stream needs the league's permission [U].

### 9.3 Game event schema (anim_events.js)
- Wire: `{e:'ae', i:<id>, p:<wire player id>, k:<animation kind>, d:<payload>}`; goal `{e:'goal', n, tm, p, k:<tick>}`; banner `{e:'bn', im, a, b, secs, col}`; sound `{e:'sfx', n}`.
- Action: freeze `AEV.EVENTS` as a **JSON schema file** (`docs/protocol/events.schema.json`, generated from anim_events.js: key, who s/g, class, priority, payload field list, animation labels). UE imports it into a DataTable `DT_AnimEvents` mapping each key to a Montage/State and a priority. The same table drives interruption rules in both clients (the priority numbers in `AEV.PRIO`).
- Payload specifics to document: `shot {kind,pw,a,z,len}`, `pass {a,len,sp}`, `check/checked {a,board,power,from,nf}`, `fall {side,kind,power,from,dir,board,wrestle}`, `save {kind,side,dy,h,rc,z}`, `pull/return {dx,dz,dur}`, foul victims `{a,dir,side,(power)}`. Angles are radians in sim space [U]; this must be confirmed and written down.
- Unknown-event rule: a client must ignore unknown `k` (forward compat). Today the browser client may throw on unknown ids [U, not checked]; test this before shipping a second client.

### 9.4 Simulation state and snapshot format
- Keep the JSON snapshot for the bridge (24 KB/s is fine). Document each field's unit, sign and range in a spec file; add `proto` version.
- Optional later: binary snapshot (about 3 to 4x smaller) once a second client is stable, to cut egress on paid hosting; JSON is easier to debug and is what the tests (`test_net_parity.js`) compare.
- UE must handle: ticks `k` that skip or repeat, pause (`pa`), faceoff set (`fo`), replay break flag (`rb`), `hc` (which skater each human controls), penalty list, goalie pulled, note text `nt`.
- Missing for good UE animation: stick angle, head look, shot target, skate edge side. Add only if the UE prototype shows it is needed.

### 9.5 Player identity
- Today: no account. For UE client parity, keep the token flow (stored in a config file instead of `sessionStorage`).
- For season mode and cross-client stats you need real identity. Options: (1) lightweight account (email magic link or Google/Apple sign-in) in Node, tying a stable `playerId` to the token; (2) Steam/EOS ids for the native client only (does not help browser users). I recommend (1), because the browser is the main channel. This is a prerequisite for statistics and season, in every option.
- Privacy: the existing tracking hashes IPs with a salt [V]; keep that; do not store raw IPs; kids may be on the league, so apply the platform children's rules (COPPA/Apple kids rules) [U] before adding accounts.

### 9.6 Animation event ids
- The sim's own `p.ae.id` is the stable id [V] and seeds variants (goalie side, pump, celebration pick) via a hash. The UE client must use the same hash on the id, or both players will see different variants. The hash function lives in the browser anim code; export it as a spec plus test vectors (input id to variant index) in `docs/protocol/`.
- Dedupe table: client keeps last N ids (browser uses dedupe by `ae` id and goal number).

### 9.7 Replay data
- Option 3: the UE client keeps the same ring of the last 200 snapshots, and plays it through the same interpolator at 0.6x; protocol messages `rb`, `rbdone`, `rbend` unchanged [V].
- Saved/after-match replays (not present today): add server-side recording of snapshots (a room's 30 Hz stream is about 833 B x 30 = 25 KB/s, about 4.5 MB for a 3-minute period set; 180 s period x 3 = 9 min of play is about 13 MB uncompressed, 2 to 3 MB gzipped [derived]). Store per match for N days, serve to both clients. This is cheap and works for both clients; do it in Node, not in a client.
- Option 4: DemoNetDriver replay is a different format, not readable by the browser.

### 9.8 Match results and statistics round trip
- Today: stats live in `G.hits, pims, fow, passes, poss, goals, pst, saves, shots` [V] shown in the end screen and sent to analytics as `game_end`.
- Add to the server: on `ov` (game over) write a **match result record** `{matchId, ts, home, away, score, shots, plen, ot, players[{leagueId, g, a, s, sv, h, pim}], clientTypes, token ids}` to a SQLite file (or append-only `matches.jsonl` as a start, same as `events.jsonl`), then derive season tables from it. Expose `GET /api/standings`, `/api/player/:id`, `/api/match/:id`; both clients call these. Nothing in this needs Unreal.
- A UE client can POST nothing: the server writes the record. Never let a client submit results.

### 9.9 Sim determinism between Node and a C++ port
- **The Node sim is not deterministic** [V]: 41 uses of unseeded `Math.random()`; floating point is IEEE double in JS; C++ in UE uses float for most gameplay vectors (double in LWC-based transforms) and may use fused multiply-add and different `sin/cos/atan2/hypot` implementations. Even with the same seed, a port will diverge within seconds. The two implementations can be made **statistically equivalent**, not identical.
- Consequences: (1) no lockstep or rollback between a JS and a C++ client; (2) no sharing replays across sims; (3) cross-play only works if every client talks to the same authoritative sim.
- Acceptance method for any port: seed the JS sim (replace `Math.random` by a seeded PRNG behind a flag), record golden input scripts and per-tick traces, port to C++ using the same PRNG, compare statistically (the existing `balance_study.js` of 400 games and 10 metrics, `measure_flow.js`, `measure_goalie.js`) rather than per-tick. Define tolerances before starting.
- This reinforces option 3: keep one sim.

## 10. What a full migration (option 4) realistically requires

Assumptions [U]: one senior Unreal C++ developer, one technical animator, an artist part time, the JS code as the spec, target Windows + Android + dedicated Linux server, no console, existing feature parity before new features. Estimates are person-months.

| Work package | Person-months |
|---|---|
| UE project, build pipeline, source build for dedicated server, Linux cross-compile, CI | 1 to 2 |
| Sim port: skating, puck, passing/shooting, goalie, hits, fights, penalties, faceoffs, line changes, AI, clock | 4 to 7 |
| Replication (Iris or custom), server tick, interpolation, prediction, reconnection | 2 to 4 |
| Matchmaking, sessions, accounts, chat, jerseys, lobby UI, replay break | 2 to 3 |
| Animation: locomotion blend space, foot IK, ~31 event montages, goalie set, celebrations, mocap/retarget or purchased packs | 3 to 6 |
| Art: rink/arena, 27 team jerseys, crowd, VFX, lighting, audio hookup | 2 to 4 |
| Stats, results service, season/standings, admin | 1 to 2 |
| Re-tuning balance (redo Pass 8/9 studies), QA, performance on Android, packaging, stores | 3 to 5 |
| **Total** | **18 to 33** (call it 18 to 30) |

At one developer working solo with an AI assistant, a realistic calendar time is 24 to 40 months [U]; with two experienced people it is 10 to 16 months. Skills needed: Unreal C++ with networking, animation (Control Rig, IK, retargeting, Motion Matching), backend, release engineering for Android (and iOS with a Mac). Tools: Unreal Engine (source build), Visual Studio 2022, Rider optional, Android Studio/NDK, Xcode on a Mac, an animation source (Mixamo-type or mocap, license-checked), Perforce or Git LFS for assets (UE projects reach tens of GB).

Option 3 for comparison (UE rendering client only): about 6 to 10 person-months for a polished Windows+Android client; the first playable (one rink, one rig, 10 core events, interpolation, controller input) is about 6 to 10 weeks for someone who knows UE [U].

## 11. Risk table

| Risk | Option(s) | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Rewrite never reaches parity; balance regressions; sim bugs fixed in JS no longer apply | 4 | High | High | Do not do it; if forced, seed JS, golden traces, statistical acceptance |
| Pixel Streaming bills scale linearly with players ($0.8 to $1.4 per stream-hour) | 3/4 with PS | High | High | Do not use PS for the open public; limit to demos or an invite-only premium; use L4 2/GPU if density is verified |
| Input latency over PS makes timing-based play unfair | PS | Medium | High | Test with real users; keep browser client as primary |
| UE client on mid-range phones performs worse than three.js | 3/4 on Android/iOS | Medium | Medium | Prototype on 2 real phones before committing |
| iOS release needs Mac, signing, App Review; kids league may trigger extra rules | 3/4 on iOS | High | Medium | Skip iOS native; serve iOS through the browser game |
| Two clients drift on event semantics (31 events x 2) | 3/5 | Medium | Medium | Frozen schema + test vectors + parity bots (extend test_net_parity.js to the UE client's decoder) |
| Oracle micro too small for growth; free tier changes (A1 cut, idle reclaim) | all | Medium | Low | Move to Hetzner CX23 (€5.49) when needed; Dockerfile already portable |
| JS sim cannot be shared bit-exact with C++ | 3 to 4 | Certain | Medium | Single authoritative sim (option 3) |
| UE dedicated server needs source build + Linux cross-compile; Iris/Mover immaturity | 4 | Medium | Medium | Prototype server on one machine first |
| Photo/rights for league players shipped in stores | native | Medium | Medium | Get league permission; strip photos from store builds if unsure |
| Staffing: single maintainer | all | High | High | Prefer fewer moving parts; document protocol |
| UE royalty and fee changes | UE | Low | Low | 5% above $1M lifetime gross [S]; LIHL is far below |
| Visual benefit unproven | 3/4 | Medium | Medium | Time-boxed prototype with a go/no-go on a recorded match |

## 12. Recommended path (phased)

**Phase 0 (this pass, 0 cost):** Freeze the client contract.
- Write `docs/protocol/PROTOCOL.md`, `events.schema.json` (generated from `AEV.EVENTS`), snapshot field spec with units, id variant hash test vectors.
- Add `proto` and `dataVersion` to `welcome`/`start`. Make the browser client ignore unknown events.
- Add a seeded PRNG flag to the sim (needed for any future port and for regression tests).

**Phase 1 (1 to 2 pass-equivalents):** Upgrade the browser renderer: three.js r128 to the current release behind a feature flag, WebGL2 default, WebGPU optional (Safari 26+). Fix the animation items from Pass 9 (backward skating). This is the highest visual return per dollar. Add server result records, standings and an accounts-lite identity.

**Phase 2 (6 to 10 weeks, optional, needs a Windows PC with a recent GPU, not the Oracle VM):** Unreal prototype client (option 3): websocket + interpolation + 10 core events + one rig + one rink. Go/no-go criteria: (a) both players see the same events as the browser parity test; (b) animation noticeably better than the upgraded three.js on the same recorded match; (c) Windows frame rate and package size acceptable. If no-go, you lose about 2 months, not a rewrite.

**Phase 3 (only if Phase 2 is a go):** Native Windows and Android UE client released alongside the browser client (option 5 on option 3). Server infrastructure stays the Node room server, possibly moved from the micro to Hetzner CX23 (€5.49/month, [S]). Evaluate a small, invite-only Pixel Streaming pool only for demo/kiosk uses (league night TV, a promo), sized with real density numbers from your own test.

**Phase 4 (optional, only with proof of demand and money):** Season/stats/accounts maturity, saved replays, spectators in Node; revisit whether a UE-native dedicated server makes sense. I would not.

## 13. Open questions I could not answer from the repo or the web

- Sim units and axes (feet vs meters, x/y orientation); needs a read of the sim's rink constants.
- Whether the browser client ignores unknown AE kinds; needs a test.
- Real UE5 server cost per 2-player match; needs a profiled build.
- Real Pixel Streaming density on T4/A10G/L4 at 1080p60 for our scene; needs a test.
- Whether Mover, Network Prediction and Iris are production-ready in the current UE release (5.7 status unconfirmed).
- Oracle Always Free micro capacity under load on the actual VM; the load test was on a dev PC.
- Whether league photos can be redistributed in a store build.
- Hetzner 4 vCPU plan prices after the June 2026 increase; not found.

## 14. Sources (all accessed 2026-11-13; third-party unless noted)

- AWS g4dn/g5 prices: https://www.doit.com/compute/compute/aws/us-east-1/g5.xlarge, https://www.doit.com/compute/compute/aws/us-east-1/g4dn.xlarge, https://www.devzero.io/instances/aws/g5.xlarge, https://ec2calc.cloud/instances/g5.xlarge, https://www.opslyft.com/blog/aws-gpu-pricing
- AWS g6 / GCP g2 / Azure NV6ads: https://calculator.holori.com/aws/ec2/g6.xlarge, https://www.devzero.io/instances/aws/g6.xlarge, https://getdeploying.com/gpus/nvidia-l4, https://www.qovery.com/blog/gpu-pricing-comparison-method-aws-gcp-azure-scaleway-2026, https://www.devzero.io/instances/azure/Standard_NV6ads_A10_v5
- Hetzner: https://northflank.com/blog/hetzner-cloud-server-price-increases, https://byteiota.com/hetzner-june-2026-price-shock/, https://comparedge.com/tools/hetzner/pricing
- Oracle Always Free: https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm, https://linuxiac.com/?p=214114, https://oracommit.blogspot.com/2026/02/understanding-oci-always-free-compute.html, https://labmemo.com/?p=55273
- AWS GameLift pricing: https://aws.amazon.com/gamelift/servers/pricing/; Gameye https://gameye.com/unreal-engine/; Edgegap https://edgegap.com/integration/unreal-engine
- Pixel Streaming: https://forums.unrealengine.com/t/using-pixel-streaming-2-for-web-service-client-isolation-and-performance-questions/2496269, https://forums.unrealengine.com/t/best-setup-for-running-multiple-avatars-with-pixel-streaming-50-500-users/2636562, https://www.strayspark.studio/blog/pixel-streaming-ue5-cloud-gaming-demo, https://game-ace.com/blog/unreal-engine-pixel-streaming/, https://10n.tech/solutions/pixel-streaming/, https://www.abratabia.com/unreal-engine/pixel-streaming-setup.php, https://www.eagle3dstreaming.com/maximizing-performance-linux-for-enterprise-unreal-engine-pixel-streaming
- Unreal license: https://www.unrealengine.com/license (via search snippet; page may be an old snapshot), https://300mind.studio/blog/unreal-engine-licensing-royalties/
- Unity: https://unity.com/releases/unity-6, https://tech-insider.org/unity-vs-unreal-vs-godot-2026/
- three.js / WebGPU: https://www.utsubo.com/blog/threejs-2026-what-changed, https://www.utsubo.com/blog/webgpu-threejs-migration-guide, https://en.wikipedia.org/wiki/WebGPU
- Apple/Google fees: https://magora-systems.com/apple-developer-fee/, https://ambsandigital.com/?p=11104, https://playcode.io/blog/how-much-does-it-cost-to-publish-an-app
- Repo files: LIHL_MEGA_PASS_9_REPORT.md, docs/ONLINE_REPLAY_PROTOCOL.md, docs/LOAD_TEST.md, docs/ORACLE_FREE_HOSTING.md, server/server.js, server/sim_host.js, net.js, anim_events.js, data/roster.json, three.min.js header.

Godot, Bevy and O3DE rows, Unreal source-build/Mac/console requirements, Mover/Iris status and UE mobile limits come from my own knowledge (cutoff June 2026) and were not re-verified on the web.
