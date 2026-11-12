# LIHL Mega Pass 6 report (2026-11-12)

Starting branch: master (merged mega-pass-5), starting commit b397391. Work branch: mega-pass-6. Honest status: almost none of the Pass 6 brief was done; the time went into finding why live play was laggy.

## Root cause of "super laggy, connection issues" (found, not fixed)
`flyctl logs` shows: "Trial machine stopping. To run for longer than 5m0s, add a credit card". The Fly account is still on the free trial, so the server machine is stopped every 5 minutes. Rooms live in memory, so each stop ends the match for everyone and players have to rejoin on a cold machine. Measured instead: network connect time to Fly is 36 to 60 ms, server tick cost is 0.14 ms average (max 2.3 ms), snapshot size is 737 bytes. So the server is not slow; it is being switched off.
Fix options (owner decision): add a card to the Fly account (this one small machine costs a few dollars a month, less with auto-stop), or host elsewhere. Nothing in the code can remove the trial limit.

## Audit findings (Pass 6 areas that already exist)
- Skating: acceleration curve, speed-dependent turn rate, lateral edge grip, coasting decay, backskating with pivot threshold, carrier slowdown. Already momentum based.
- Animation: shot (wrist, snap, slap, backhand), pass sweep, check/hitwind/hitmiss/checked, fall, poke, stick lift, faceoff draw, goalie saves, receive cushion scaled by outcome, state names per action.
- Gameplay events tied to animation markers: shot and pass release at contact (action system), check lunge at the commitment marker, reception outcomes, one-timer timing, fights, injuries, post-game summary.
- Multiplayer: server authoritative at 30 Hz, events mirrored to clients, reconnect with grace period.

## Done this pass
- Ice spray on hard braking (r3d.js). Implemented; not visually verified (a headless close-up showed no visible spray).
- Vision control: hold Shift, the VIS button (toggle on touch), or left bumper on a pad. Strafe movement, facing tracks the net with the puck or the puck without it, hunched stance. Automated tested (backpedals facing the net, no snap on release). Sent over the network and applied by the server. Not visually verified.
- Gamepad support (standard mapping). Automated tested with a mocked pad; not tried on a real controller.
- PWA: service worker (network first for code, cache first for models and data, never photos), add-to-home-screen hint on the second mobile visit. Registration verified locally; offline behavior not tested.
- Season mode (menu: Season): round robin vs every team, simulated results for other teams, standings table, G/A/P for your team, saved in the browser. Assists are now tracked and shown in the scoring list. Visually verified at phone landscape size.
- Goalie rebounds are pushed toward the corners. Goals per shot still 0.15 to 0.18.
- Removed stray game_tmp.html and skater3d.bak.js.
- Subs fix, post-game summary, skating sound setting, forecheck menu (earlier today).

- Instant goal replay (offline only): last 5 s recorded at 20 Hz, played once at 0.6x from a low camera behind the net, tap to skip. Automated tested (starts after the goal pause, ends, play resumes, no replay on the server); camera position checked numerically; not visually confirmed behind the net. Players who changed lines before the goal may not appear in the replay.
- Goalie pull: last 2:00 of the third, trailing by one or two, the goalie leaves and a sixth skater joins; empty net scores; returns on a tie or lead. Automated tested (6 of 6 pulls and returns, no duplicate skaters); network snapshot carries the pull flag; not visually verified.
- Side camera zooms tighter near the nets (smoothed). Not visually verified.

## Not done (second brief)
Scorebug redesign, crowd profiling on a phone, mobile layout audit on real devices.

## Not done (first brief)
Unified animation state machine rewrite, crossovers, hockey-stop animation pose, pivots, stickhandling visuals, puck pickup animation, one-timer animation rework, fall and getup sequence rework, goalie butterfly and recovery rework, AI reactions, faceoff presentation, goal celebration and camera work, rink and puck visuals, audio sync, mobile and input pass, performance profiling. Not tested visually: everything except the frames named above.

## Tests
test_allteams 26 of 26, net, net2, reconnect, ratings, feel, p5 pass; animation harness 197 of 197; flow 6.8 goals per game.

## Recommended next pass
1. Resolve the Fly trial limit first; nothing online is playable past 5 minutes otherwise.
2. A play session on phones with the FPS and ping readout, then fix what the numbers show.
3. Then the animation pieces above in this order: hockey stop and crossover poses, puck pickup, goalie recovery.
