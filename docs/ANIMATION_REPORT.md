# Animation overhaul report, 2026-11-11 (local only, NOT published)

## Files
- NEW anim_rig.js (two-bone arm IK, free stick object placed from both hands)
- NEW anim_ctrl.js (skater state machine, skating/stickhandling/pass/shot/check/poke/fall/faceoff/celebration layers, variation)
- NEW anim_goalie.js (goalie controller)
- NEW anim_test.html (test environment: 35 scripted scenarios, joint/stick assertions, frame renderer, 5 camera views)
- NEW docs/ANIMATION_AUDIT.md (before state)
- CHANGED skater3d.js (yaw + direct quaternion control in the pose system, stick removed from skinned gear, free stick per player)
- CHANGED skater_pose.js (unchanged logic, still the base leg/torso layer), r3d.js (drives the controllers, puck sits on the blade visually)
- CHANGED game.html (AE() sim events: shot kinds, pass, receive, gain, check, checked, fall, poke, faceoff draw, save kinds, cover, goal against)
- CHANGED net.js, server/sim_host.js (animation events and faceoff stance travel from the server)

## Rig
Existing 65 bone Quaternius rig already has independent shoulders, upper arms, elbows (lowerarm), wrists (hand), hips, knees, ankles.
New: torso yaw (twist), direct world quaternion control, two-bone IK for both arms with an elbow pole vector, hand targets on a free
stick (top hand grip, bottom hand slides along the shaft within arm reach). The stick is no longer glued to one hand.

## Systems
State machine (labels): ready, skating, accelerating, sprint_skating, gliding, backward_skating, turning_left/right, crossover_turn, stopping,
stickhandling, protecting_puck, receiving_pass, preparing_shot, shot_wrist/snap/slap/onetimer, passing, poke_check, body_check,
getting_checked, falling, faceoff_stance, faceoff_draw, celebrating, and goalie_ready/shuffle/t_push/butterfly/glove/blocker/pad/stick/cover/goal_against.
Blending: first order smoothing of all weights, event offsets ramp in over 90 ms, blade target is low passed, charge decays into the release.
Variation (deterministic from player id): handedness (which hand is on top), stride tempo, posture, sway, windup size, puck handling amplitude, stop side.
The simulated puck is never moved by animation. While carried, only the RENDERED puck sits on the blade (within 0.35 m of the real one).

## Tests
- anim_test.html: AT.assertAll() runs 140 assertions over 25 skater and 10 goalie scenarios (expected states, top hand on grip < 2 cm,
  bottom hand on shaft, blade on ice except deliberate lifts, no stick teleport > 0.6 m per frame at 60 fps). Result: 140/140 pass.
- Real game: 1800 sim frames with rendering, no errors, 30 distinct animation states observed in normal play.
- Fallbacks: ?procedural=1 and ?2d=1 both run without errors. Server: test_sim, test_net, test_net2 all pass.
- Performance: animation CPU about 0.9 ms per frame for all visible skaters (software GL screenshots are slow; real GPUs are not the limit).

## Visual checks done (screenshots saved from the test page)
stickhandling, wrist shot, slap strike, body check, fall, faceoff stance, goalie butterfly, plus the in game broadcast view.

## Known gaps (be honest)
- Slap and wrist shots differ mostly in height and yaw; from the broadcast camera they are not dramatically different.
- No true pivot step or skate edge model; crossovers and stops are approximations (stop = body yaw across travel, no ice spray).
- No foot locking IK: feet are driven by the stride cycle, so slight foot slide at some speeds is possible. Not measured.
- Wrist roll and fingers are not controlled; hands inherit the forearm.
- Goalie save type is picked from simple shot geometry; no distinct rebound control.
- Phone performance untested. Only 4 draw calls per skater plus a stick (4 small meshes).
- Not published. Needs Michael's approval.

## Update 2026-11-11: gap fixes and acceptance results

Automated acceptance (`anim_test.html`, `AT.assertAll()`): **157 of 157 assertions pass** (25 skater and 10 goalie scenarios).

Measured results:
- Wrist vs slap shot: grip travel 0.90 m vs 1.46 m, blade travel 0.18 m vs 0.97 m. The two are clearly distinct.
- Blade slip while skating: 0.01 to 0.05 ft/s (negligible foot sliding).
- Edge banking on turns: about +0.099 rad (left) and -0.104 rad (right).
- Pivot state is reached on tight low-speed turns.
- Hands: palm placed on the shaft, fingertips about 4 cm from the shaft.
- Stick is two merged meshes (fewer draw calls). Mobile LOD skips every other animation frame for non-controlled players.
- Animation CPU cost about 0.9 ms per frame on desktop.

Known limitations (honest):
- Passing tests do not prove it looks good. Visual checks were done on screenshots only, not on a real broadcast of a full match.
- Phone frame rate is NOT yet measured on a real device. Only the LOD logic exists.
- Multiplayer uses no client prediction, so animation is driven by snapshots with about 110 ms interpolation delay.
- Style is stylized 2000s-era browser 3D, not NHL-27 fidelity.
