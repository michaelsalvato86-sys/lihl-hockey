# LIHL open source tech audit (2026-11-12)

Repository: michaelsalvato86-sys/lihl-hockey. Branch: mega-pass-6 (merged to main at 46e8941, later commits on mega-pass-6). Latest development is on mega-pass-6, not on `main`'s Pages redirect page.

## Current technology (read from the code)
- Rendering: three.js (bundled three.min.js, r128 assumed), custom r3d.js, ACES tone mapping, EffectComposer with 4x MSAA and bloom on desktop, a fake cube map on the ice, blob shadows only, instanced crowd bodies, 240-point ice spray, quality guard that lowers pixel ratio on slow devices.
- Players: Quaternius GLTF rig posed every frame with absolute bone quaternions (skater_pose.js, anim_ctrl.js). No AnimationMixer, no authored clips. Custom two-bone arm IK and a free two-hand stick in anim_rig.js. Goalie in anim_goalie.js.
- Physics: no physics library. Custom 2D point puck with scripted ownership, custom skating (`skate()` in game.html), proximity and rule based collisions and checks.
- Simulation: one script (game.html) runs in the browser and, unchanged, in the Node server inside a vm at a fixed step; server is authoritative, snapshots at 30 Hz, client interpolation with adaptive delay.
- Assets: models/ (3.7 MB), data/ (561 KB), photos for roster portraits.
- Tests: Node tests (server/test_*.js, measure_*.js), animation harness anim_test.html (197 assertions).

## Weaknesses relevant to this research
No stride phase, edge or lean state in skating; goalie moves on one axis only; puck has no height or spin; shots are dice-roll blocked; shadows are blobs; ice reflection is faked; no foot IK; falls and hit reactions are timed keyframes.

## Baseline performance
Server: 0.14 ms per tick average (2.3 ms max), 737 byte snapshots, network connect time to Fly about 40 to 60 ms. Client frame rate not measured on a phone (readout exists).

## Live blocker unrelated to technology
Fly trial machines are stopped every 5 minutes until a card is added.
