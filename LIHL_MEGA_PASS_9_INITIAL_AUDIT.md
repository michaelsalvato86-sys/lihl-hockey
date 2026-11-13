# LIHL Mega Pass 8 + 9 initial audit (2026-11-13)

Branch mega-pass-9, HEAD at start 82bbec6 (mega-pass-7 plus backlog). Working tree clean. Production: https://lihl.duckdns.org (Oracle Always Free, 1 vCPU 1 GB, MAX_ROOMS 3). Fly app is a dormant backup. Hosting, DNS, Pages redirect and config.js are out of scope.

## Baseline (before any Pass 8/9 change)
- test_allteams 26 teams 0 failures; test_net, test_net2, test_reconnect_stale, test_ratings, test_goalie, test_replay, test_net_replay, poc_skate, poc_puck (28 asserts), test_feel --assert all pass.
- test_p5: three runs, no FAIL lines this time (it has a known flaky forecheck/tired-line check that failed on some earlier runs).
- test_sim: average snapshot 849 bytes, max 1334, about 25 KB/s at 30 Hz, 0.18 ms per tick.
- measure_goalie (4 games each): goals per shot 0.186, 0.176, 0.207. measure_flow: 9 goals per game (4 games, noisy; earlier 7, 10.5).
- Animation harness: 838 of 838 (last verified on mega-pass-7 merge).

## Known state going in (from Pass 7 reports; the event inventory is Agent A's first task)
- Wired into the live game and verified in the real page: SKATE2 skating, puck z, goalie arc, replay (offline and online break), ref, announcer clips, tracking.
- Animation modules merged but only harness-verified or partially wired: anim_celebrate.js (online hook and win pose offline only), anim_hits.js (many variants numeric only), anim_shots.js (saucer is spin only, no lift), goalie variants (goal-against, cover and bench trip events not emitted by the real game).
- Online parity gaps: celebrations and win pose, goalie windup flag only (not save kind detail), two-client event parity untested beyond net tests.
- Graphics: reflection swim not diagnosed, ice markings pale, no physical device test.
- Balance: small samples only (4 games).

## Defects this pass targets
See LIHL_MEGA_PASS_9_REPORT.md when written. Priorities: event system and wiring, real saucer and backhand reception, online event parity, balance study with large samples, reflection swim root cause, then body mechanics, controls and visual QA.
