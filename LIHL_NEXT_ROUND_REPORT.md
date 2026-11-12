# LIHL Hockey: next round report (2026-11-12)

Honest status of this round. Ratings are my own estimate of how complete and how good each area is, not a measure of how much code was written. "Seen" means a rendered frame was inspected; "not seen in a live match" means nobody has played it yet.

## 1. What was wrong (found in the audit, docs/LIHL_2_0_AUDIT.md)
- Skaters barely strode while cruising (push amplitude was tied to acceleration only), stood upright, and had no foot lift.
- Checks only produced a pose at the instant of contact. No wind-up, no miss, no board check, no victim reaction scaled by the hit.
- Shots and passes had thin, similar poses. One-timers were only a label.
- Passes always completed and could not be intercepted; the goalie chased the puck's current position so 74 percent of goals were deterministic misses; two defenders pressed the carrier; penalties and shifts did not scale with period length; ratings changed speed by about 4 percent.
- Line changes happened in place, so nothing visible changed. Teams never switched sides. Phone layouts (menus, lobby, scoreboard) were broken.

## 2. What was changed

### Animation (anim_ctrl.js, skater_pose.js, anim_goalie.js, skater3d.js)
- Constant alternating stride while moving, foot lift on the recovery leg, toe-off pitch on the push leg, more forward lean and knee bend, weight sway keyed to the stride, smoothed backward-skating blend, stop trigger smoothed so one-frame online spikes do not fire it, phase restart on first push.
- Backskating has its own pose (wide C-cut, deep knees, upright torso, stick in front) and a side shuffle for lateral defence.
- Shots: wrist, snap, slap, one-timer, backhand variant with different stance, wind-up, hand positions and follow-through; blade aimed at the puck at release. Passing: forehand and backhand sweep. Receiving: blade tracks the puck, cushion, hand-off to stickhandling. One-timer pre-load while a pass arrives.
- Checks: wind-up (coil, drop), drive through with shoulder rotation, missed check overshoot, victim jolt scaled by power along the hit direction, brace when an opponent closes, board check held against the boards, stagger, fall and getting-up recovery. Poke check and stick lift are distinct.
- Goalies: breathing, head tracking, staged butterfly recovery, glove/blocker/pad/stick variants with holds, cover pose, goal-against slump, per-goalie variation.
- Costumes (cosmetic): kangaroo, pope, wrench, pimp hat (costumes.js). Jerseys no longer spongy up close (bump 0.1 to 0.018).

### Hockey interactions and gameplay (game.html)
- New events: hitwind, hitmiss, check/checked with power, board and direction, shotwind for computer shots.
- Checks lock on to the nearest opponent, power and puck loss depend on check vs defence ratings, fewer cheap interference calls. Real one-timers: press SHOOT while a pass is on its way and the shot fires as the puck arrives.
- Passes always find a receiver, with a HUD ring; lane interception along the pass path; a carrier keeps the puck 0.9 s; pass leaves the stick instead of jumping 4 ft.
- Human shots have tighter aim error (misses still possible). Posts and crossbar. Penalties scale with period length. Teams switch sides each period. Line changes enter from the bench.
- Ratings now matter: top speed, shot, pass and check scale much more with rating (a 51 average team is about 14 percent faster than a 31 average team). Fatigue now affects accuracy and check strength.
- Puck physics: lower loose friction, tips and deflections, save-aware rebounds, shot quality model (distance, angle, speed, screens), goalie tracks the shot crossing point, standstill turn cap.
- AI: second defender covers the lane, wingers support the carrier, role-based shot odds (centre share of shots 52 to 34 percent), computer shots now wind up for 0.22 s and cancel if the puck is lost.
- Difficulty: Easy / Normal / Hard (computer team only; online always Normal).

### Presentation, audio, UI
- Four cameras plus the side view: up and down, behind the play, behind the net, wide arena; the controls follow the camera; CAM button; settings in pause.
- Pause with settings (camera, difficulty, announcers). Goal celebrations (teammates skate to the scorer). Scoreboard YOU marker, "YOU CONTROL" in team select, status boxes match the scoreboard.
- Commentary rewritten: situation aware (chance, breakaway, big save, rebound, power play, penalty, tying / go-ahead / winning goals), no repeats within the last 6 lines, global talk budget, 14 lines per situation plus a 62-line general pool per mode, American voice preference, St. Beer line for Justin Faithfull. Audio: crowd swell, goal horn and sting, speed-based skate hiss, stick and board sounds, post ping.
- Phone: portrait menu, lobby layouts, landscape prompt and lock, PWA manifest for iPhone fullscreen, double-tap zoom blocked.

### Performance (r3d.js)
- Ice texture uploads only after a trail stroke (mobile never), jumbotron redraws only on change, one projection update per frame, puck eased onto the blade. Measured: draw3D CPU unchanged on desktop (4.57 to 4.63 ms), mobile 3.70 to 3.56 ms. Draw calls and triangles unchanged.

## 3. Files modified
game.html, menu.js, net.js, r3d.js, skater3d.js, skater_pose.js, anim_ctrl.js, anim_goalie.js, announcer.js, audio.js, costumes.js (new), server/server.js, server/sim_host.js (via build), tools/protect.js, tools/build_league.py, data/league.json, manifest.json, anim_test.html, new server tests, docs.

## 4. Test results
- Animation harness (anim_test.html): 197 of 197 assertions pass (157 original plus 40 for the new actions).
- Node tests in server/: test_allteams (26 teams, 0 failures), test_net, test_net2, test_reconnect_stale, test_ratings, test_feel, measure_flow (4 games: goals per game 5.3 to 8, steals per minute about 13.5, interceptions about 13 percent), measure_goalie (goals per shot 0.18 to 0.25, varies by run).
- Live checks after each deploy: files identical to the build, health 200, two-client online match with the new teams, stale-socket reconnect.
- Rendered frames inspected: skating, wrist/slap/backhand, check wind-up vs drive, backskate, shuffle, goalie butterfly/glove/goal-against, costumes, up-and-down and behind-the-net cameras, pause screen, lobby layouts, menu.

## 5. Not tested / not seen
- Nothing new has been played in a full live match by me. Board check, missed hit, brace, stick lift, goalie pad and stick saves, head tracking direction, recovery frames at several times were not looked at.
- Wind-up for computer shots shows only offline (the server does not send the wind-up timer to clients); online clients see the shot at release.
- Mobile portrait camera checked by projection only. No real phone or real iPhone fullscreen test. No audio or speech was actually heard.
- Multiplayer synchronization of the new animations relies on the existing event stream (works in tests) but was not watched with two people.

## 6. Remaining problems (honest)
- No action buffering and no review of player switching were done. Controls are unchanged apart from the new HIT lock-on and one-timer.
- Snow spray on hockey stops, visible skate marks, replay cameras, bench presentation, ice and boards upgrades, equipment detail upgrades: not done.
- Outgoing line-change players still vanish instead of skating to the bench. PP and PK structures (umbrella, box) not done.
- Passing is still mostly auto-targeted; receiving a pass animation exists but puck pickup is still an automatic radius.
- Goal rate varies run to run (about 5 to 10 per game), balance is not finished.
- Jersey and equipment visuals are still simple vertex-colored geometry.

## 7. Completion ratings (0 to 100, honest)
| Area | Rating | Note |
|---|---|---|
| Skating and backskating animation | 55 | Stride, foot lift, back pose, shuffle done; not seen at game speed |
| Shooting animations | 55 | Distinct types exist; AI wind-up offline only |
| Passing and receiving | 45 | Poses exist; pickup logic still automatic |
| One-timers | 50 | Mechanic and pre-load work; needs play-testing |
| Checking and physical play | 55 | Events and animation built; board check and recovery not seen in play |
| Falls and recovery | 40 | Basic fall/get-up only |
| Player control and responsiveness | 35 | No buffering, switching not reviewed |
| Puck physics | 60 | Friction, rebounds, tips, posts; no spin |
| Computer AI | 50 | Lane cover, support, shot roles; no PP/PK structures |
| Goalies (behaviour and animation) | 55 | Better saves and poses; head tracking untested |
| Graphics and arena | 30 | Costumes, softer jerseys, crowd tweak, edge smoothing; rink unchanged |
| Camera and broadcast | 55 | Five views; no replays |
| Commentary and audio | 55 | Much more varied; never heard |
| Performance | 35 | Fewer uploads; draw calls unchanged; not profiled on a real phone |
| Multiplayer protection | 85 | All existing tests pass, live checks pass |
| Phone layout | 60 | Menus and lobby fixed; real-device testing missing |
