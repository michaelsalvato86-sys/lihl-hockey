# Animation audit (before the overhaul), 2026-11-11

## What the players are
- Skinned humanoid (Quaternius Universal Base Characters, CC0): a real 65-bone rig with pelvis, 3 spine bones, neck, head,
  clavicles, upper arms, lower arms (elbows), hands (wrists) + fingers, thighs, calves (knees), feet (ankles), balls (toes).
  Every joint is independently controllable. No facial rig is used.
- Clothing, gear, helmet, skates and decals are built from the body mesh and merged into 4 draw calls per player.

## How they are animated today (skater_pose.js, skater3d.js, r3d.js)
- Pose is set by ABSOLUTE world orientations (pitch about the lateral axis, roll about the forward axis). There is no yaw
  (torso twist) and no inverse kinematics.
- Legs: alternating push/glide driven by speed and acceleration. Torso lean into turns. Backskate stance.
- Arms: fixed hanging pose with two constant angles. They do not follow the stick, do not swing, do not react to anything.
- Stick: rigid geometry skinned to the RIGHT hand only. The left hand is not attached. The blade is kept near the ice by
  re-pitching the right hand every frame (a hack). It never moves for stickhandling, passing, shooting or checking.
- Puck: independent object (correct). It sits at a fixed offset in front of the carrier with no visual link to the blade.
- Events (shots, passes, checks, saves, faceoffs) do NOT drive any animation. Only the goal celebration does.
- Goalie: one static crouch with pads; it only slides sideways. No saves, no butterfly, no recovery.
- Faceoffs: players stand in the skating pose.
- 2D fallback: separate renderer, unaffected.

## Deficiencies (confirmed)
1. Arms static; no elbows/wrists in use; left hand not on the stick.
2. No state machine; no blending between behaviours.
3. No torso yaw, so no shoulder/hip rotation for passes, shots or checks.
4. Stick not driven by hands; no stickhandling; blade/puck unrelated.
5. No pass/receive/shot/check/poke/fall animations.
6. Goalie has no save animations.
7. No per-player variation (all identical, same handedness).
8. No animation test harness.

## Plan
1. Rig: add yaw and direct-quaternion control to the pose system, add two-bone arm IK, replace the skinned stick by a
   free stick object driven by BOTH hands (top hand grip + bottom hand slides on the shaft). (anim_rig.js)
2. Controller: one state machine fed by real gameplay (velocity, accel, turn rate, possession, puck position, nearest
   opponent, faceoff state) and by sim events (AE hooks: shot, pass, receive, check, checked, poke, save, drop). (anim_ctrl.js)
3. Skating layer (crossover, stop, weight transfer), stickhandling layer, pass/shot layer, defensive layer, faceoff.
4. Goalie controller with real saves. (anim_goalie.js)
5. Deterministic per-player variation (handedness, stride, posture).
6. Test mode with scripted scenarios, joint assertions and screenshots. (anim_test.html)
7. Multiplayer: animation events travel as server events; positions/puck stay authoritative on the server.
