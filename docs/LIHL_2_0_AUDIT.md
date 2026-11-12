# LIHL 2.0 audit (2026-11-11)

Method: code read (game.html, r3d.js, skater3d.js, skater_pose.js, anim_*.js, net.js, server/) plus headless Node runs. The browser tool was unavailable, so nothing visual was observed. Items marked (UNVERIFIED) are inferred from code only. No existing file was edited and nothing was deployed. Units: feet, rink W=200 H=85, MY=42.5, net mouth y 37.5..47.5, goal line x=11 / 189. Sim steps at dt=1/30 on the server and at the render dt (up to 0.05) in single player.

## 0. Test results

| Test | Result |
|---|---|
| test_allteams.js | 26 teams checked, 0 failures |
| test_feel.js | passFound 1.00, tap shots on target 59.5%, hard shots on target 54% (hard is worse than tap) |
| test_sim.js (2 scripted humans, 2 min periods) | 1-2 final in OT, 47 vs 48 shots, 4 saves, avg snapshot 786 B (max 1061), ~23 KB/s per client at 30 Hz, 0.24 ms CPU per tick |
| test_net.js | all steps OK (create, join, ready, play, drop, rejoin, chat) |
| test_net2.js | all PASS printed (origin list, quick match, full game to FINAL in 37 s, rematch, reconnect, CPU takeover) |

Own measurement scripts (scratchpad, AI vs AI, 6 games x 3 periods x 5:00, 99.5 game-minutes): `C:\T\claude\C--Users-Quantum\b134f0b7-02bd-4d26-a138-237a8b2e07d6\scratchpad\measure.js`, `ai2.js`, `goals.js`, `gtrace.js`. They wrap shoot/pass/goal/stopPlay in the vm context, so they do not change any game file.

| Metric (AI vs AI) | Value | Read |
|---|---|---|
| Shots per game-minute (both teams) | 3.92 | about 59 shots per 15 min game |
| Goals per game-minute | 1.02 | about 15 goals per game; observed finals 15-6 (H-A), 20-4, 12-3, 9-6 |
| Goals per shot | 0.26 | far above a realistic 0.10 |
| Save percentage | 0.588 | goalies are the weak point (section 3) |
| Shots on target | 69% | |
| Pass completion | 98% (1865 of 1908) | passes are almost never contested |
| Passes per minute | 19.7 | |
| Possession segments per minute | 51; median 0.77 s, p90 1.97 s | puck changes hands constantly |
| Direct steals per minute | 28.5 | carrier loses puck about every 2 s |
| Loose puck share | 18% | possession H 40%, A 42% |
| Players with speed under 3 during live play | 0.000 for every slot | nobody stands still; the "5.7% still" figure is faceoff dead time |
| Avg skater speed ft/s | C 20.7, LW 19.2, RW 18.7, LD 18.1, RD 17.8 | defencemen run as much as forwards |
| Shots by slot | C 221, LW 88, RW 66, LD 32, RD 21 | the centre takes 52% of all shots |
| Line changes per minute (both teams) | 2.88 | |
| Penalties per game-minute | 0.39 | each lasts 120 s; about 35% of all time has a team shorthanded |
| Whistles over 99 min | goalie freeze 45, icing 17, offside 9 | |
| Avg stamina | 0.887 | fatigue barely matters |

## 1. Skating and body animation (anim_ctrl.js, skater_pose.js, anim_rig.js, skater3d.js)

Architecture is good: pose is layered (skating pose, event offsets, two hand IK, free stick). The problems are in the gait model and in glue between the sim and the animation.

### Findings with evidence

1. **No foot planting or recovery phase.** `SK.skatePose` (skater_pose.js:2-16) drives each leg with `pl = max(0, sin(ph)) * push`. Each leg pushes for half a cycle and sits at the base crouch for the other half. There is no leg lift or swing-through, so the recovering foot never leaves the ice and legs read as scissoring rather than stride and recovery. `SK.ground` (skater_pose.js:18-23) only lowers the whole root to the lowest ankle bone, no horizontal foot lock, no toe/blade offset, so push-off height changes are absorbed by pelvis bob.
2. **Foot always flat, ankle never flexes.** `pose['foot_'+sd] = {p:0, y:beta..., r:edge...}` (anim_ctrl.js:124-129) uses a world pitch of 0 for both feet at all times. Edge roll is only `SK.rollLeft*lean*0.55`. The push foot never goes onto an inside edge and the heel never lifts, so the push looks like sliding.
3. **Stride rate is a function of speed only, not of acceleration.** anim_ctrl.js:57: `ph += dt*(2.2 + sp*0.13)`. At sp 5 ft/s the cycle runs 0.45 Hz, at 40 ft/s 1.18 Hz. Phase freezes when `sp <= 1.2` and resumes with the old random phase, so the first push after a standstill starts from an arbitrary leg. Push amplitude `acc*1.15 + 0.12*sp` (skater_pose.js:4) means a cruising skater at constant speed has about 12% push, which is correct for a glide but is not distinguished from a cut or crossover in the legs.
4. **Weight transfer is tiny and rotation-only.** anim_ctrl.js:130: pelvis roll sway is 0.07 rad (4 degrees) times speed. There is no lateral pelvis or COM shift over the stance foot, only roll, so the body does not visibly load the planted leg.
5. **`back` flag is a hard boolean.** skater_pose.js:4-6 and anim_ctrl.js:131 pass `p.back` straight into crouch, lean (`up = -.18`) and arm roll. The sim flips `p.back` on `abs(diff) > 2.3 && sp < mx*.6` (game.html:380-384). Crossing that boundary pops the crouch and torso lean in one frame (phase also negated by `-0.55` at anim_ctrl.js:57, so the leg cycle reverses instantly).
6. **Turn rate at a standstill is about 900 degrees per second.** game.html:383: `om = (2.5 + 11*max(0, 1-sp/mx))*ag`, with `ag` 0.7-1.3 (x1.22 if controlled). A stopped skater snaps to any heading in about 0.2 s. The pivot layer (anim_ctrl.js:122-123, 8 rad/s step phase) cannot keep up, and `m.ang` in r3d.js:128 smooths facing with `dt*9` (about 110 ms lag) so the model lags the sim facing on every spin.
7. **Hockey stop is a whole-model yaw, not a skate action.** anim_ctrl.js:138: `m.inner.rotation.y = PI/2 + S.stop*stopSide*1.15`. Trigger `an.dec > 60 && sp > 14 && vf > 6` (line 53). In online play velocity updates at 30 Hz but the renderer runs at 60 Hz, so per-frame decel alternates between 0 and 2x the true value. With a true braking decel of 48 ft/s^2 (game.html:386 `vf-48*dt`) the spikes pass the 60 threshold even after the 14/s smoothing, so false stops are likely online (UNVERIFIED). Fix at the source: derive decel from the interpolated position, or from a velocity the net layer interpolates (net.js:135 copies `p.vx` from the newer snapshot unlerped).
8. **Arm swing is almost absent by design.** Both hands stay on the stick (IK, anim_ctrl.js:196-206). Only while sprinting without the puck does the bottom hand lerp to a pole point with `sin(ph+PI)*0.3*s01` (line 187). Top hand never swings. This is hockey-correct for stickhandling but a sprint looks one-armed. Amplitude is also tied to speed, not stride.
9. **Event transitions are additive and eased, which is good, but blend-in is 0.09 s** (`_es(u/0.09)`, line 98) and blend-out is baked into each curve's end. A shot started while `S.charge` is non-zero adds both (lines 100-101); stacking of charge windup and shot event yaw can exceed the 1.3 clamp at line 112 and visibly saturate.
10. **Stick is rate-limited, puck is not.** Blade target is low-passed at 20-34/s (anim_ctrl.js:166-168) but the puck is glued 4 ft ahead of the carrier (game.html:432). The render swaps to `heelW` only if within 1.2 of the sim puck (r3d.js:145), so on sharp turns the blade lags and the puck is drawn at the sim position, not the blade.
11. **Mobile LOD.** anim_ctrl.js:37: non-key players update every second frame with accumulated dt. Cheap and fine, but (a) the pose steps at 30 fps while root motion is 60 fps, (b) `AR.cal` finger calibration is skipped (line 220) so grips are open, (c) there is no distance LOD at all: 12 skaters x about 4 full-skeleton `updateMatrixWorld(true)` traversals per frame (head look line 113, after `setPose` line 144, `SK.ground` line 19, plus `getWorldPosition` calls inside every `AR.pos`). The head-look call at line 113 reads matrices set last frame and could be dropped.
12. **Line changes teleport.** `applyUnit` (game.html:295-300) copies the outgoing player's x,y,vx,vy onto the incoming player on the same tick. Five skins swap in place with no skating to the bench.

### Prioritized code-level fixes (animation)

| # | Fix | Where | Effort |
|---|---|---|---|
| A1 | Add a recovery swing: when a leg is not pushing, lift the foot (extra thigh/calf flexion up to about 0.35 rad, scaled by speed) and pull it under the body; make the push leg heel-up via foot pitch | skater_pose.js:6-12, anim_ctrl.js:124-129 | M |
| A2 | Smooth `back` into a 0..1 value (`S.back`, rate about 8/s) and use it in `skatePose` | anim_ctrl.js:131, skater_pose.js:4-6 | S |
| A3 | Tie phase rate to acceleration: when `acc01 > 0.3` run the cycle at up to 1.5x, restart phase at 0 on the first push from standstill (match the leg that is already forward) | anim_ctrl.js:57 | S |
| A4 | Decel for the stop trigger from smoothed vf over 100 ms or from interpolated positions; raise the threshold for online | anim_ctrl.js:52-53, net.js:135 | S |
| A5 | Weight shift: translate pelvis laterally 0.05 m over the stance leg, keyed to `sin(ph)`; raise sway to 0.12 rad | anim_ctrl.js:130 | S |
| A6 | Standstill turn: cap yaw rate at standstill in the sim to about 7 rad/s, or add a 0.15 s pivot lead before the model faces the new heading (client only) | game.html:383 (sim change affects MP) or r3d.js:128 | S/M |
| A7 | Upper arm counter-swing during sprint with top hand shaft-rotation (small) | anim_ctrl.js:185-190 | M |
| A8 | Line change visuals: incoming skaters enter from the bench side, outgoing glide to the boards (visual only, keep sim swap) | r3d.js plus game.html applyUnit | M |
| A9 | Drop redundant `updateMatrixWorld(true)` calls, cache bone world positions per frame, skip fingers on mobile entirely | anim_ctrl.js:113,144, skater_pose.js:18-22 | S |
| A10 | Render puck on the blade only while carried and never gate on 1.2 ft; ease the sim puck toward the blade instead | r3d.js:145 | S |

## 2. Puck physics, passing and shooting (game.html)

### Findings

1. **Carried puck is rigid.** game.html:432: `puck.x = o.x + cos(o.fa)*4`. There is no stickhandling lag, no puck-vs-skate separation, no way to knock it loose except the probabilistic poke. Possession changes are rolls: game.html:446 `rate = 1.25*(.3+d.chk)/(.3+(c.pass+c.spd)/2)`, rolled every tick for every defender within 4.8 ft (`Math.random() < rate*dt`). With two defenders always converging (section 4) the carrier loses the puck about every 0.8 s on average. Measured 28.5 steals per minute and median possession of 0.77 s.
2. **Friction is heavy and the same for everything.** game.html:433: `exp(-0.45*dt)` loose, `exp(-0.22*dt)` pass in flight, so a loose puck loses 36% of its speed per second. Real ice is closer to 5-10%. Dump-ins and clears die quickly and boards bounces use 0.6-0.7 restitution (lines 433, 437).
3. **Pickup radius is generous and passes tunnel by design.** Radius `4.2` (+4 for the intended target), speed gate `< 105` (`< 200` for the target) at line 442. Combined with a nearest-in-radius rule, a pass reaches its target 98% of the time. Lane interception in `passTarget` (line 334-338) is only used to score targets, it never actually blocks anything: an opponent in the lane only matters if he happens to be within 4.2 ft of the puck at that tick and the puck is under 105 ft/s. Passes are 90-170 ft/s (line 340), so opponents cannot pick off a pass at all unless it has slowed.
4. **Shot speed and accuracy.** `sp = (80+70*shot)*(.62+.45*pw)` (line 331), range about 50-160 ft/s. Error `(1-shot)*.5 + dist/260` scaled by `(1.25-.5*(1-pw))*(hum?.58:1)`. Hard shots (pw above 0.85, "slap") add error without any benefit besides speed: measured 54% on target for hard vs 59.5% for tap (test_feel). Goalie save probability does not depend on shot speed, only on the shooter's `shot` attribute (line 437), so a slap and a wrister are equal threats.
5. **One-timers are only a label.** `shoot()` classifies `onetimer` when `p.recvAt - G.clock` is within 0.7 s (line 331) but the human shot input only fires if `puck.owner === p` (line 420: `else{p.burst=.45}`). Pressing shoot while a pass is in flight just makes the player sprint. No speed, accuracy or timing bonus, and a true one-time (shoot a puck that is not yet owned) is impossible.
6. **Deflections and blocks are a single dice roll.** Lines 332-333: any opponent within 2.6 ft of the shot line and 5-26 ft from the shooter blocks with `0.18 + 0.4*def`, and the puck is rerouted to a random angle at 10-30 ft/s. There are no tips, no deflections that keep the shot alive, no screens (a skater in front of the goalie has no effect on save probability).
7. **No posts, no crossbar, no net collision.** The 'post' sfx exists (audio.js:39) but is never called. A shot with y outside 37.5..47.5 just slides to the boards. Skaters and pucks pass through the net and goalie bodies. Behind-the-net passes work through the cage.
8. **Auto-shoot at the goal line.** game.html:432: an owner within 6 ft of the goal line x and inside the net y range fires automatically (`shoot(o,0,0,false)`), including wrap-around attempts.
9. **Frame-rate dependence in single player.** The loop steps with the render dt (game.html:488, up to 0.05 s) while the server uses 1/30. A 150 ft/s shot moves 7.5 ft per step at the largest dt. Goal crossing uses previous x (line 433) so it is safe, but pickup (4.2 ft radius) and block logic are sampled per step. Tuning done on the server's 30 Hz does not match 60 Hz single player. All randomness is `Math.random()` (14 call sites in game.html), so tests cannot be seeded.

### Fixes

| # | Fix | Where | Effort |
|---|---|---|---|
| P1 | Lower loose-puck friction to about 0.12/s (keep pass flight at 0.08), retune clear speeds | game.html:433 | S |
| P2 | Poke rate: single defender roll with a 0.4 s cooldown per defender and a requirement that the defender is within a stick-length cone in front of the carrier; cap steals so the carrier keeps the puck at least 1.2 s | game.html:446 | M |
| P3 | Real lane interception: test every opponent against the pass segment each tick (not just a 4.2 ft disc) with a stick reach of about 5 ft for pass speeds up to 130 ft/s | game.html:442 | M |
| P4 | Real one-timers: let a human shoot while `puck.target === p`; apply timing window bonus to speed and accuracy | game.html:420, 331 | M |
| P5 | Shot quality model for goalie saves: use distance, angle, speed, shooter attribute, and a screen penalty (skaters within 3 ft of the goalie line); slap should be faster but less accurate | game.html:437 | M |
| P6 | Posts and crossbar: reflect the puck when it crosses the goal line within 0.4 ft of the post y (37.5 / 47.5), play 'post' sfx | game.html:433-437 | S |
| P7 | Tips and deflections: skaters in the shot lane within 3 ft can redirect (keep speed) instead of the random kill | game.html:332-333 | M |
| P8 | Fixed-step sim loop in single player (accumulator at 1/30 with render interpolation) so single player matches the server | game.html:488 | M |
| P9 | Seeded RNG (mulberry32 in `G`) used by every `Math.random()` in game.html, so tests and replays are deterministic | game.html | M |

## 3. Goalie behaviour (game.html:437-440, 450-451; anim_goalie.js)

### Findings (measured, goals.js and gtrace.js)

1. **The goalie chases the puck's current y, not the shot's crossing point.** game.html:451: `ty = clamp(puck.y, MY-9, MY+9)`, move limit `(30+16*gl)*dt` (about 1.2 ft per 1/30 tick). It never predicts. Any angled shot defeats it, and a straight shot is trivially saved. gtrace.js example: shot from y=51 aimed at 41: puck y goes 45.9, 43.5, 41.1 across three ticks while the goalie goes 49.8, 48.6, 47.3 (dy about 6.2 at the line).
2. **Saves are a die roll gated by a lateral reach.** Line 437: `ps = dy < reach ? clamp(.885 + .14*(gl-.5) - .35*(shooter.shot-.5), .6, .97) : 0` with `reach = 4.2 + 3.2*gl` (5.4-6.7 ft). In 107 goals, **79 (74%) had dy >= reach**, i.e. 0% save chance. Only 28 goals came from a failed 12% roll. Save percentage overall is 0.588.
3. **Save happens at the goal line, goalie stands in front of it.** Goalie x is `ownGX + dir*clamp(3.2 + 1.5(if puck within 40), 3, 5)` (line 451) so about 4.7 ft out, but the check fires at the line (line 436). The saved puck is moved to `gx + dir*4` (line 437), so it visibly passes the goalie body, then rewinds about 4.7 ft. At 110 ft/s the passing time is about 0.04 s so it reads as a glitch at most; it also means the goalie never "makes contact".
4. **Rebounds ignore the save type.** Direction `(dir>0 ? 0 : PI) + rnd(-1.0, 1.0)` rad, speed `rnd(12,34)` (line 437), shooter cooldown 0.5 s, then up to 4.2 ft radius pickup by anyone. 30% of saves freeze the puck (line 437, `AE(g,'cover')`), measured 45 goalie freeze whistles in 99 min. The save kind (`pad`, `butterfly`, `stick`, `glove`, `blocker`) is chosen by a position hash after the roll, independent of physics.
5. **Goalie has no depth play or puck-handling.** x is a function of the puck distance only. No cut-off of angles, no poke-check, no play-the-puck behind the net, no stick save on a pass lane, no awareness of a cross-ice pass.
6. **Animation is event-driven only** (anim_goalie.js:23): the dive plays after the sim already decided. Lateral shuffle is derived from the sim `g.y` velocity (line 19) which is correct for T-push. During a goal against the slump plays for 1.3 s but nothing reacts to the goal before the puck crosses.

### Fixes

| # | Fix | Where | Effort |
|---|---|---|---|
| G1 | Track the predicted crossing y: extrapolate the puck to the goalie's x for `puck.shot` and chase that with the existing speed limit | game.html:451 | S |
| G2 | Replace the binary reach gate with a smooth falloff `ps *= clamp(1 - (dy-reach*0.6)/(reach*0.8), 0, 1)` so far shots are saveable but harder | game.html:437 | S |
| G3 | Rebounds: direction away from the net biased toward the shot side, speed scaled by shot speed, `glove` and `butterfly` freeze more, `pad` kicks out to the corners | game.html:437 | M |
| G4 | Move the save check to the goalie's body plane (goalie x, not the goal line) and keep the puck at the pads; keeps the shot reading right | game.html:436 | M |
| G5 | Goalie angle play (depth 3-5 ft based on shooter distance) and a simple poke or glove on dumped pucks | game.html:451 | M |

Target: save% of 0.88-0.92 with goals per shot 0.09-0.12. Goalie fixes alone would drop goals per game from about 15 to about 6-7 per 15 minutes.

## 4. Player AI (game.html:344-369, 287-304)

### Findings (measured)

1. **Double teaming drives the turnover rate.** aiPlayer (line 366): `rk===0` chases the carrier with lead 0.25, and `rk===1` within 32 ft goes to `own.x, own.y` as well (the expression `own.x-(own.x-t.ownGX)*.0+t.dir*0` is `own.x`). Both are inside the 4.8 ft poke range most of the time, which doubles the steal rate. This is the direct cause of 28.5 steals per minute.
2. **Offence is fixed offsets from the puck.** `formation(p,'off')` (line 344-348) places slots by hardcoded offsets from `puck.x` (C +14, wings +22, D -14) and fixed y lanes (20/65/30/55) with only 20-30% puck tracking. No support triangle around the carrier, no screen/net-front role, no cycle, no passing outlet seeking. Result: centre takes 52% of all shots (221 of 428), defence only 12%.
3. **Defence is a fixed zone** (line 349-350): x = own goal + clamp(dist*factor, 13, 62), y lanes by slot. No man or gap coverage, no covering the high slot when a D pinches, no backchecking priority. A loose puck sends the two nearest (`rk<=1`) and leaves three on formation (line 365).
4. **Carrier decisions are random timers.** `carry` (line 351-362) decides every 0.25-0.6 s; shoot chance `0.05 + 0.11*(1 - dg/38)` inside 38 ft, 1.2% per decision from far; pass chance 65% when pressured and under 13 ft. Pass completion is 98% so the AI has no reason to keep the puck. Avg shot distance 35.8 ft.
5. **No standing still.** Idle fraction is 0.000 for every slot during live play. The one place players stand is the faceoff (setupFaceoff, line 310-313, `vx=vy=0`).
6. **Line changes** (curKey, line 287): shift length is a fixed 40 s of `shiftT` regardless of period length, with PP units alternating every 60 s. Changes happen at any moment, even mid-play (the hold only applies if the team has the puck during the first 9 s of a shift, line 302). 2.88 changes per minute across both teams. They teleport (section 1, item 12).
7. **Fatigue is nearly cosmetic.** `mx *= .78 + .22*st` (line 425) so empty stamina costs 22% top speed; stamina drains `0.0075/s` at full speed (line 425) and recovers at 0.03/s on the bench. Average 0.887. Nothing else uses `st` (no accuracy, no pass or check effects).
8. **Penalties are not scaled.** `t:120` seconds always (line 308). With 3 minute periods, a single minor takes two thirds of a period. Rate is 0.39 per game-minute and about 35% of all time has a team shorthanded. Penalty chance per defender within 4.8 ft of the carrier: `0.011*dt*...*(1+0.3*chk)` (line 447); interference on 30% of hits without the puck (line 449). Penalty ends on any goal against that team (goal(), line 375).
9. **PP/PK.** PP units are sorted by `shot+pass` (line 291), PK by `def+spd`. PK team plays 4 skaters via `act()` (line 293), PP has 5. No PP set plays, no PK box shape: both use the same formation functions, so PP produces 79 shots vs 68 on the PK in the sample, almost no advantage (PP shots per team-minute is within noise of even strength).
10. **Blowouts.** Scores like 20-4 and 12-3 occurred in 6 games. Rating compresses to `0.5 + (r0-0.3)*0.2` (game.html:257), but the goalie rating spread (gl .38-.78) and the dy>=reach goal rule amplify any positional edge.

### Fixes

| # | Fix | Where | Effort |
|---|---|---|---|
| AI1 | Only `rk===0` presses; `rk===1` becomes a lane/support role (angles the pass or covers the high slot) | game.html:366 | S |
| AI2 | Support triangle for offence: two support slots at +/-35 degrees behind the carrier at 14-20 ft, one net-front, D at the blue line; slot assignment by nearest | game.html:344-348 | M |
| AI3 | Scale penalty length and shift length by `plen` (for example `120 * plen/300`, shift `40 * plen/180`) | game.html:308, 287 | S |
| AI4 | Change on the fly only when the puck is out of the zone or on a dead puck; skating exit for outgoing | game.html:300-303 | M |
| AI5 | Link fatigue to accuracy and check strength; stamina drain by sprint only | game.html:425 | S |
| AI6 | Role-specific shot odds (D shoots from the point, wings shoot from the circles), reduce C monopoly | game.html:355 | S |
| AI7 | PP and PK structures: umbrella or 1-3-1 offset targets for PP, box for PK | game.html:344-350 | M |

## 5. Camera, arena, audio, UI (quick findings)

1. **Camera** (r3d.js:146-148): fov is set to 40/60 then overwritten to 36/52 every frame and `updateProjectionMatrix()` runs twice per frame. Position uses `Math.random()` for shake. Away team (dir -1) plays right to left but the camera is the same for both; online away players see the attack going the wrong way (UNVERIFIED, check with a second client). Goal cam allocates a new `Vector3` per frame during the celebration.
2. **Ice texture re-upload** (r3d.js:155): the 2000x850 canvas is flagged `needsUpdate` every 5th frame for skate trails (about 6.8 MB GPU upload 12 times per second). Mobile skips trails (line 139) but the upload still runs every 5 frames. Make it conditional on trail drawing.
3. **Jumbotron** redraws a 1024x512 canvas every 12 frames (r3d.js:157), another upload. Redraw only on score or clock-second change.
4. **Crowd** is a point-sprite bed with face atlas (good), but the crowd bed volume only reacts to goals (`AU.crowd`) and the per-shot excitement is not wired (audio.js:26). `puck` and `post` sfx are defined (audio.js:36,39) but never played; the only skate sound is a single hiss that follows the controlled player (game.html:476 `AU.skate`).
5. **Announcer** (announcer.js): events come from the same `AEHOOK`, so it works online. Line selection is random with no repeat memory across games (UNVERIFIED), uses browser speech.
6. **Camera and HUD** show STAM only for the controlled player and a fixed 4-slot unit label. There is no shot meter, no offside or icing replay cue, and mobile HUD hides `bt` test penalty button only by CSS.
7. **Mobile**: pixel ratio capped at 1.25, 4 crowd rows, no composer, no cube map (r3d.js:77-102). Skinned gear meshes are hidden on mobile (skater3d.js:182), so only the body and cloth draw.

## 6. Multiplayer constraints (net.js, server.js, sim_host.js)

Facts: the server runs the real sim from `server/game_index.html` (built from game.html, step and shoot hash identical today), 30 Hz, one JSON snapshot per client per tick (786 B average, 1061 B max, about 23 KB/s), inputs capped at 90/s, maxPayload 2048. The client interpolates 110 ms behind (`NET.delay`, net.js:8, 145) and never predicts. Per-player tuple: `[pid, x, y, vx, vy, fa, turn, acc01, back, st]` (sim_host.js teamSnap). Events: `ae`, `sfx`, `bn`, `goal`.

Cross-cutting risks:

1. **Events are applied immediately but positions are shown 110 ms late.** net.js:107-108 calls `ev(e)` on arrival, while `positions()` renders interpolated state from `now - 110 ms` (line 145). Shot, pass, check animations and the announcer fire about 110 ms before the skater and puck show it. Fix: queue events with the snapshot timestamp and release at `rt`. Effort S. This matters for every animation fix above.
2. **Velocity is not interpolated.** net.js:135 copies `vx,vy,turn,acc01,back` from the newer snapshot, so animation inputs are stepwise at 30 Hz while the renderer is 60 Hz (see stop trigger, A4). Interpolate these between snapshots too.
3. **Snapshot lacks fields that animation wants.** Missing: `stun`, `hitT`, `burst`, `isCtl`, shot charge for the remote human, goalie facing and phase. Adding 3 numbers per player costs about 4 B each as JSON, so +60 B per tick per team, about 4% bandwidth. Charge for the opponent is best sent as an `ae` event ('charge') to avoid fields.
4. **Server load**: 0.24 ms per tick per room at current sim cost. Sim changes P2/P3/P5/G1 add per-tick loops over 10 skaters, still under 1 ms.
5. **Determinism**: server and single player share game.html but not the dt. A shared fixed step (P8) makes tuning meaningful. The server is the only authority, so any rule/physics change must be built into `server/game_index.html` (build.py) and the client at the same time. A client built from different logic than the server only affects visuals, but the `ae` event names must stay in sync.
6. **Reconnect/rejoin** re-sends 'start' and the client rebuilds the game (net.js:96-103); animations restart from rest. Acceptable.

Per proposed change:

| Change | MP risk |
|---|---|
| A1-A5, A7, A9, A10 (anim only) | None for server. Remote players rely on interpolated velocity, so do A4/net item 2 first |
| A6 (turn rate cap) | Sim change: affects all players and CPU, server rebuild required; input feel changes |
| A8 line change visuals | Client only if the sim swap stays instantaneous; sim version needs a new snapshot field or event ('shift') |
| P1, P2, P3, P5, P6, P7 | Server sim only, no protocol change; all clients inherit it; must be tested by test_feel and an AI-vs-AI measure |
| P4 one-timer | Input protocol already carries `sh`; server accepts it at any time. Needs a rule `puck.target === p` which the sim already has |
| P8 fixed step | Single player only; server already fixed |
| P9 seeded RNG | Server sim: seed per room, send seed in 'start' for replays; no gameplay change |
| G1-G5 | Server only, but add event 'save' fields (`side`, `dy`, `kind` already sent); keep names |
| AI1-AI7 | Server only; no protocol change |
| AI3 (penalty length) | Snapshot `pen` already sends remaining seconds; HUD uses them, no change |
| Event queue (net item 1) | Client only |

## 7. Ranked roadmap (15 highest impact)

Impact order combines how often the player sees the problem and how cheaply it can be fixed. Effort: S under half a day, M one to two days, L more. Risk: how likely it breaks something or needs MP coordination.

| Rank | Fix | Why | Effort | Risk |
|---|---|---|---|---|
| 1 | G1 + G2: goalie predicts crossing y; smooth reach falloff | 74% of goals are deterministic goalie misses; save% 0.59 | S | Low (sim only, retune with measure.js) |
| 2 | AI1: only one presser, second defender covers lanes | Halves steals (28.5 per minute), gives passing and carrying a purpose | S | Low |
| 3 | P3: real pass interception along the lane | Passes complete 98%; makes defence meaningful | M | Medium (balance) |
| 4 | P2: carrier protection (cooldown, cone, minimum hold time) | Median possession 0.77 s feels like pinball | M | Medium |
| 5 | Net event queue aligned to interpolation time | Every animation and sfx fires 110 ms early online | S | Low |
| 6 | A1: stride recovery with foot lift and toe-off | Biggest visual skating fix: legs scissor on the ice | M | Low |
| 7 | AI3: scale penalties and shifts to period length | 2:00 minor on a 3:00 period is 67% of it; 35% of time shorthanded | S | Low |
| 8 | P1: lower puck friction | Dumps and clears die early; shots lose speed | S | Medium (retune clears, icing frequency) |
| 9 | P5 + P6: shot quality model, posts/crossbar | Slap equals wrister; no near-misses or pings | M | Medium |
| 10 | A2 + A3 + A4: smooth `back`, acceleration-driven phase, robust stop trigger | Removes pops at the 2.3 rad boundary and false stops online | S | Low |
| 11 | AI2 + AI6: support triangle, role-based shooting | Centre takes 52% of shots; offence is static offsets | M | Medium |
| 12 | P4: real one-timers | A core hockey feel moment currently only a label | M | Medium (input + server) |
| 13 | A6: standstill turn-rate cap plus facing lag fix | Skaters spin 900 degrees per second | S/M | Medium (affects control feel) |
| 14 | G3 + P7: save-aware rebounds, tips and deflections | Rebounds ignore save type; blocks kill the puck | M | Medium |
| 15 | A9 + r3d.js ice/jumbotron upload gating + camera double projection | Mobile frame time: 3+ full-skeleton updates per skater, 6.8 MB upload 12x per second | S | Low |

Bundle suggestion for a first 2.0 milestone: ranks 1, 2, 5, 7, 10 and 15 are all S and low risk; run measure.js before and after to prove goals per shot (target 0.09-0.12), steals per minute (target under 10) and save% (target 0.88-0.92).

## 8. Open questions and unverified items

- All visual claims are from code. The foot sliding, stop false positives online, camera orientation for the away side and mobile frame times need a browser run.
- `server/game_index.html` is built; confirm `build.py` is run before any sim change is deployed (step and shoot hashes match game.html today).
- Rating-to-performance compression (`attrs`, game.html:257) was not tuned or measured per team; the 20-4 and 12-3 results suggest a large goalie or roster effect worth a dedicated run.

## 9. Status update 2026-11-12 (what has been done from the roadmap)
- Done: rank 1 (goalie crossing-point tracking + smooth reach falloff; goals per shot 0.24 to 0.12-0.18 in measure_goalie.js), rank 2 (second defender covers the lane), rank 7 (penalty length scales with period), A8 visual half (incoming line enters from the bench; outgoing still vanish), P6 (posts and crossbar: near-misses ping off with the post sound), stride strengthening (partial A1: constant alternating stride, more lean and knee bend), costume players on the first line, test PP debug button removed.
- Not done: ranks 3, 4, 5, 6 (foot lift and toe-off), 8, 9 (shot quality), 10 (A2-A4 smoothing), 11, 12 (real one-timers), 13, 14, 15 (mobile frame time).
- Regression checks: server/test_allteams.js, test_feel.js, test_net.js, test_net2.js, test_reconnect_stale.js, measure_goalie.js; anim_test.html 157/157.

## 10. Status update 2026-11-12 (evening)
Done since section 9: A1-A5 and A9 (skating), P1 P5 P7 G3 A6 AI2 AI6 (sim), AI5 (fatigue affects accuracy and check strength), camera framing and behind-the-net view, render upload gating, pass interception, carrier protection, AI shot wind-up (offline), check events and animations, goalie animation, commentary and audio rewrite, difficulty. Open: AI4/AI7 (PP/PK structures), A8 (outgoing line change skating off), A7 (arm counter-swing), P4 queued one-timer exact preload, P8 fixed-step single player, P9 seeded RNG, replay cameras, bench and ice visual upgrades. See LIHL_NEXT_ROUND_REPORT.md for ratings.
