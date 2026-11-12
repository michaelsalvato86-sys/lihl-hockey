# LIHL Mega Pass 6 initial audit (2026-11-12)

Repository: michaelsalvato86-sys/lihl-hockey (local copy C:\Users\Quantum\rec-hockey). Work branch mega-pass-6, started from master at b397391 (= mega-pass-5 merged). GitHub `main` holds the merged work plus the Pages redirect index.html; development branches are mega-pass-2, 5 and 6.

## Architecture
Vanilla JS, no bundler. game.html (~86 KB) is the monolith: simulation (fixed step, `step(dt)`), AI, UI, input. build.py injects it into index.html and server/game_index.html (server copy of the sim). r3d.js: three.js r128 renderer, camera, crowd, ice, particles. skater3d.js + costumes.js: player models. skater_pose.js, anim_ctrl.js, anim_rig.js, anim_goalie.js: procedural pose, event driven animation, GLTF rig with arm IK, goalie. net.js: client networking (30 Hz snapshots, adaptive interpolation, event queue). server/server.js + sim_host.js: Node WebSocket server, runs the same game script in a vm, authoritative. deploy/ is the Fly bundle (copy of server files plus protected web/ build from tools/protect.js; server/ is canonical). Fly.io, region iad, shared-cpu-1x.

## Input
Touch: left stick plus SHOOT (hold to charge), PASS, HIT, CHANGE, CAM, VIS (new). Keyboard: WASD/arrows, space shoot, E pass, Q hit, R/Tab switch, Shift vision, V camera. Gamepad (new): standard mapping. All feed `readLocal()`; online sends the same fields at 30 Hz.

## AI
Role formations (`formation`), carry logic with shot quality, lane-checked passes with lead (`carry`), forecheck modes and goal-side coverage (`aiPlayer`, `cover`), posture by score and time, fatigue-driven line changes, difficulty scaling (`dkf`).

## Animation
Procedural: pose per frame from velocity, turn, events. Event driven (AE): shot/pass wind-up, hitwind/hitcommit/hitmiss/check/checked (with direction), gain (reception outcome), fall, poke, draw, goalie save kinds. States exposed by name in anim_ctrl.js.

## Previous work verified in code
Pass 3 to 5 features exist (see reports). Tests: test_allteams, test_net, test_net2, test_reconnect_stale, test_ratings, test_feel, test_sim, test_p5, measure_flow, measure_goalie; animation harness 197 of 197.

## Dead code and cleanup
game_tmp.html and skater3d.bak.js were stray files: removed in this pass. deploy/ duplicates server files; server/ is canonical.

## Contradictions with the second brief
It says TAPE_TO_TAPE_RESEARCH.md and LIHL_2_0_AUDIT.md exist: they do (docs/). It asks for features that already exist (one-timer timing, shot blocking, pass lane assist, posture by score, ice spray, difficulty selector, scorebug); those were adopted, not rebuilt.

## Biggest live problem
Fly trial machine limit: the server is stopped every 5 minutes until a card is added (see report).

## Plan and gaps (impact per effort)
Done in this pass: vision control, gamepad, PWA shell, season mode, rebound direction intent, assists. Not done: goal replay (needs a recorded-transform playback path in the renderer), pulling the goalie (needs a sixth skater in the seat model), scorebug redesign, crowd profiling on a phone, remaining Pass 6 animation items.
