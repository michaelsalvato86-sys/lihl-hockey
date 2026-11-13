# LIHL Mega Pass 7 report (2026-11-12)

Branch mega-pass-7. Labels: E existed, M modified, N new, AT automated tested, VT visually tested (rendered frame looked at), I integrated, X not tested or incomplete. Nobody played the game on a real device, so feel is unverified everywhere.

| Feature | Status | Commit |
|---|---|---|
| AI one-timers, slot feeds, tap-ins, net-front crash for rebounds and screens | N, AT (about 25 percent of shots were one-timers in 6 sims before the pass rate was lowered, not re-measured), I | 1b97238 |
| Edge-radius turning, grip budget, real hockey stop (speed scaled, 27 ft from 40 ft/s), stride phase, crossover flag | M, AT (poc_skate asserts, rejects a turn-around as a stop), I behind SKATE2 flag, VT only through animation frames | 0aab01a |
| Leg IK, ground contact, stride freeze when coasting, stop pose | N, AT (harness), VT (forward, backward, turn, stop frames), I | 6cdfa5f |
| Ice spray driven by stop and slip, sent to remote clients (packed int per player, +4.9 percent snapshot) | N, AT, VT (forced on a paused skater only), I | 475ba4a |
| Stickhandling (puck rolls on blade), pickup settle, protection lean | N, AT, VT (carry top view), I | 475ba4a |
| Shot and pass release synced to blade contact (gap 0.04 to 0.09 vs 0.15 limit) | M, AT, VT (slap release frame), I | 475ba4a |
| One-timer ready stance and miss reaction (distinct states) | N, AT, VT, I | 475ba4a |
| Six fall types, damped-spring hit reactions (cosmetic) | N, AT, VT (forward, back, board, knees), I | 475ba4a |
| Puck height, vz, bounce, swept posts, crossbar, rear netting, ice shadow, z in snapshot (+0.6 percent) | N, AT (poc_puck 28 asserts), I | bd8d013 |
| Goalie arc, reaction delay >= 0.1 s, post hug, accel limit, save kind by height, butterfly recovery | M, AT (test_goalie), I | 5c5246d |
| Goalie animation per save kind, anticipation, reach to puck height, RVH | M, AT, VT (7 frames; RVH and second reaction numeric only), I | fc239e4 |
| Glossy ice, PMREM env, one shadow light, r128 Reflector (high tier), tiers with FPS auto-downgrade | M and N, AT, VT, I | 09617a9 |
| Camera tracking, anticipation, faceoff and net zoom, eased celebration, follow replay camera | M, AT (replay data), VT (faceoff, play, goal zoom, replay) | 9b7967a |
| Replay records all skaters, puck z, animation fields; draws only recorded players | M, AT (test_replay, 1188 comparisons, 0 mismatches) | 9b7967a |

## Test results on the merged tree
test_allteams 26 teams 0 failures; test_net, test_net2, test_reconnect_stale, test_ratings, test_goalie, test_replay, poc_skate, poc_puck, test_feel --assert pass; animation harness 339 of 339; test_sim average snapshot 853 bytes (was 811), 0.23 ms per tick (was 0.16). test_p5 has one flaky check (forecheck pressure count or tired line) that fails on some runs of unchanged code, kept as is.
Balance: goals per shot 0.18 (target 0.14 to 0.21); measure_flow goals per game 10.5 on a 4 game run, higher than the earlier 7, noisy and not investigated.

## Not done or not verified
- Not played on a phone or desktop by a person; nothing on Safari or iOS.
- Online replay (server keeps playing after a goal).
- Backward hockey stop; weight shift over the stance leg; locked planted feet during a fast stop; saucer pass; backhand reception.
- Quaternius clips: license is CC0 per vendor but bone names unverified, none imported.
- Spray contrast on white ice is low; fall_stumble, wrist_act frames and the networked shotwind path were not looked at.
- Goalie windup anticipation works only offline; online clients see the puck approach only.
- Graphics: ice markings still pale, no tone mapping, reflections swim during fast camera moves.
- measure_flow goals per game rose; the cause (new AI plays, goalie, puck) was not isolated.

## Addendum: animation batch (2026-11-13)
Merged branches p7-celeb, p7-hits, p7-shots, p7-saves into mega-pass-7. Animation harness 838 of 838, 0 fails; server tests pass (test_p5 not rerun); in-game run of 4,200 steps with draws, no script errors.
- Celebrations (anim_celebrate.js): 10 scorer, 6 teammate, 3 scored-on poses, win pose, goalie after goal against. Picked by hash of scorer and goal count. Online hook and replay of celebrations not exercised; win pose offline only.
- Hits and fights (anim_hits.js): 8 hit classes, 5 foul reactions, 7 new fall types, getting-up styles, dazed state, fights with linesmen and box walk. Many variants only numerically checked (not viewed): hook, hold, slash, lift, interference, bump, shoulder, net shove, crumple, bounce, slump, stagger. Glass rattle is the victim only.
- Shots and passes (anim_shots.js): 21 variants (snap, backhand, volley, saucer, slap-pass, one-hand, drop, board, receptions, dekes, spin-o-rama, diving poke). Between-the-legs and skate kick only approximate; saucer is puck spin only.
- Goalie (anim_goalie.js): stack, split, VH, butterfly slide, glove squeeze, paddle, scramble, poke, cover, dead-time idles, glove pump, screen peek, play the puck. Goal-against and cover events are not emitted by the real game, bench trip is test-only, poke is a pose.
- Not played by a person, not tested on a phone. Goals per shot in measure_goalie runs: 0.175 to 0.216 (target 0.15 to 0.25, noisy).
