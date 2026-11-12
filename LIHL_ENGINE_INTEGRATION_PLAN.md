# LIHL engine integration plan (2026-11-12)

Principle: keep the engine and the server-authoritative simulation. Add small, dependency-free pieces, prove each with a measurement, integrate one at a time.

| # | Integration | Replaces or improves | Files | Protocol change | Dependency | Cost | Risk | Test |
|---|---|---|---|---|---|---|---|---|
| 1 | Edge-radius turning, grip budget, real hockey stop, stride phase | `skate()` momentum feel | game.html, anim_ctrl.js | send `edge`, `ph` per skater (small) | none | negligible | changes control feel; needs phone play test | poc_skate.js metrics, test_feel, play session |
| 2 | Foot IK (extend two-bone IK to legs) | feet sliding on ice | anim_rig.js, skater_pose.js | none | none | low | rig quirks | anim harness, rendered frames |
| 3 | Spring hit-reaction layer, stumble, get-up | rigid fall keyframes | anim_ctrl.js | none (uses existing check events) | none | low | none to authority | anim harness |
| 4 | Swept-circle puck with height, restitution, blade contact events | dice-roll blocks and tips | game.html | puck z in snapshot | none | low | balance changes | measure_flow, measure_goalie |
| 5 | Goalie arc and reaction delay | one-axis goalie | game.html | goalie x in snapshot (already sent) | none | negligible | balance | measure_goalie |
| 6 | Shadow maps, HDRI env on MeshPhysicalMaterial, SMAA | blob shadows, fake reflections | r3d.js, index/game script tags | none | three.js example scripts (MIT) | medium on phones | frame rate | quality guard, FPS readout |
| 7 | Reflector ice (desktop only) | fake cube map | r3d.js | none | three.js Reflector | medium | desktop only | FPS |
| 8 | Quaternius clips via one AnimationMixer layer | procedural-only falls | anim_rig.js, assets | none | glTF-Transform (build time) | low | bone-name mismatch unverified | harness |

Authoritative physics stays on the server for every item; clients only add cosmetic channels. No new physics engine is recommended now (see docs/research/04 and 05). If an engine is ever needed for the puck, planck.js (MIT, pure JS) is the candidate, run identically in the server vm, with a determinism hash test.

Order: 1, 4, 5, 3, 2, 6, 7, 8. Nothing here has been integrated.
