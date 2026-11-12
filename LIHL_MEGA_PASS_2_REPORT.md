# LIHL Mega Pass 2 report (2026-11-12)

This extends LIHL_NEXT_ROUND_REPORT.md. Ratings are my honest estimate of demonstrated results, not code volume. "Seen" = a rendered frame was inspected. Nothing here has been judged in a full live match by me.

## Root causes found
1. Gameplay led, animation followed: the puck left the stick the instant a button was pressed, and the shot animation played afterwards. Checks only had a pose at the instant of contact.
2. No input buffering: presses during a shot, pass or after being hit were simply lost.
3. Controls: a standstill turn-rate cap applied to the human player too; auto player switching chose by distance only and could flip.
4. Goalie could slide 9 ft off center (net mouth is 10 ft wide) so he stood outside the posts; shots were blocked ~38 percent per defender in the lane; a stationary human shot aimed at a random spot in the net.
5. Auto line changes ran on a 40 s timer for both teams at once and swapped out the puck carrier after 9 s, dropping the puck.
6. Computer defenders got a 35 percent speed burst on lunges while the carrier was slowed, so breakaways were run down.

## Architecture changes
- Unified action system in game.html (`startAct` / `tickAct`): an action has a wind-up phase, the gameplay event (`shoot()` / `pass()`) fires at the contact marker, and it cancels if the player is stunned or loses the puck. Wind-up times: snap 0.06 s, wrist 0.09 s, slap 0.17 s, pass 0.035 s; AI shot 0.2 s. The same code runs in the multiplayer server; clients get `shotwind` / `actcancel` events and animate the same wind-up (r3d.js, net.js).
- Input buffering: a press made while blocked (mid-action or stunned) is kept 0.35 s and executed when possible.
- Events: hitwind, hitmiss, check/checked (power, board, direction), shotwind, passwind, otwind, actcancel.
- Checks have a minimum 0.16 s coil before contact; one-timers can be fumbled (fast passes) and then simply received.

## Fixes by area (visibly checked areas marked)
- Shooting: tighter human aim error, far-corner aim when no stick input, far fewer blocks, windup then release. On-target taps about 74 percent in the headless test.
- Passing: always finds a receiver, ring on screen, lane interception, 0.035 s wind-up.
- One timers: press SHOOT while a pass is coming; fires at arrival (+12 percent speed) or is missed on a hard pass.
- Checking: lock-on lunge, windup before contact, power by ratings, brace, board check events. (Animation frames seen in the test harness; not in a live match.)
- Skating / backskating: stride, foot lift, back-pose blend, side shuffle (seen in harness frames). Human-controlled player has full turn rate and a 6 percent speed edge; carrier slowdown 3 percent; computer lunge burst 16 percent.
- Player switching: stays on the current player unless another is clearly closer (5 ft margin).
- Goalie: stays between the posts (max 4.4 ft from center), reach 3.7 + 2.8 x skill, leans with the carrier's sideways movement and is slow to reverse (verified with a scripted deke: about 6 ft out of position for half a second).
- AI: lane-covering second defender, winger support, a winger crashes the net on the far side, skater spacing and crease keep-out, line changes never while a team has the puck, staggered between teams.
- Camera: jumbotron hidden in all non-side cameras; up-and-down and behind-the-net views reframed.

## Files modified
game.html, r3d.js, net.js, skater_pose.js, anim_ctrl.js, anim_goalie.js, announcer.js, audio.js, menu.js, costumes.js, skater3d.js, server tests, docs.

## Automated results
- Node tests: test_allteams (26 teams), test_net, test_net2, test_reconnect_stale, test_ratings, test_feel, measure_flow (goals per game 4.5 to 8, steals per minute about 13), measure_goalie (goals per shot about 0.14), measure_crowd.
- Animation harness: 197 of 197 (earlier run; not re-run after the latest game.html changes since they do not touch animation files).
- Live checks after each deploy.

## Visual inspection actually performed
Skating, shots, check windup vs drive, backskate, shuffle, goalie poses, costumes, cameras, pause, lobby, wind-up frame during a slap shot (hold then release, puck leaves at 0.26 s in the earlier test). Not inspected: board check, missed hit, brace, stick lift in a live game; mobile feel; any audio.

## Ratings (0 to 100)
| Area | Rating |
|---|---|
| Action system (event at contact) | 60 |
| Shooting | 55 |
| Passing and receiving | 45 |
| One timers | 50 |
| Checking | 50 |
| Skating / backskating | 55 |
| Player control and switching | 45 |
| Goalie | 55 |
| AI | 50 |
| Graphics and arena | 30 |
| Camera and broadcast | 55 |
| Performance | 35 |

## Prioritized unfinished work
1. Play-test the five actions on a real phone and fix what feels wrong (shooting, controls).
2. Real receiving: puck pickup is still an automatic radius, not an animated catch.
3. Rules of hockey: goalie interference, delayed penalties, shootout, 3-on-3 overtime.
4. Outgoing line-change players skating to the bench; PP/PK formations.
5. Arena: skate marks, boards and glass, benches, replays, snow spray on stops.
6. Balance: goals per game varies 4.5 to 8.
