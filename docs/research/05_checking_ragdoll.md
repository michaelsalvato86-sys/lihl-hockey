# 05 Checking, hit reactions, ragdoll (research, 2026-11-12)

Context from repo: checking lives in game.html (hitwind -> hitcommit -> contact loop); anim_ctrl.js has an event layer (AE(player,'hitwind'|'fall',...)) of additive smooth keyframe offsets, procedural, no mixer clips. That is already the right architecture for "server decides, client plays reaction".

## Candidates
| Name / URL | License | Last push | Compat | Solves | Effort | Verdict |
|---|---|---|---|---|---|---|
| Rapier (JS) https://github.com/dimforge/rapier (JS bindings repo https://github.com/dimforge/rapier.js, now archived into main repo TS dir) | Apache-2.0 | rapier 2026-11-01; rapier.js 2026-07-12 | WASM, framework agnostic, works with r128 (no three coupling). Has joints, motors. ~1-2 MB wasm | Real ragdoll / active ragdoll (motorized joints) | High | Study only; adapt only if cosmetic ragdoll is wanted |
| cannon-es https://github.com/pmndrs/cannon-es | MIT | 2024-01-06 | Pure JS, small, no wasm, r128 fine. Constraints (hinge, cone-twist) exist | Cheap cosmetic ragdoll of 1-2 fallen skaters | Medium | Adapt (if physics needed at all); stale but stable |
| ammo.js https://github.com/kripken/ammo.js | zlib-style Bullet license (GitHub says NOASSERTION, README says zlib) | 2026-09-22 | Large wasm, clunky API; three r128 had ammo examples | Full soft/rigid, overkill | High | Reject |
| mattvb91/rapierjs-ragdoll https://github.com/mattvb91/rapierjs-ragdoll | NONE (no LICENSE file; all rights reserved) | 2026-05-10 | three + Rapier + TS/Vite, passive ragdoll mapped to bones (23 stars) | Reference for body-part-to-bone mapping | Low to read | Study only. Cannot copy code |
| ErdongChen-Andrew/CharacterControl https://github.com/ErdongChen-Andrew/CharacterControl (fork seen: Daudxu/CharacterControl-threejs, MIT) | MIT | upstream 2025-07-13 | React Three Fiber + react-three-rapier, REJECT for vanilla r128 | Capsule controller; reportedly self-rights after hit | n/a | Reject (framework mismatch), idea only |
| three.js r128 examples/jsm/animation (CCDIKSolver.js, MMDPhysics.js) https://github.com/mrdoob/three.js/tree/r128/examples/jsm/animation | MIT | r128 frozen | Native to your version. CCDIKSolver for reaching/leaning limbs; MMDPhysics is ammo-bound | Procedural head/arm lean toward hit | Low-Med | CCDIK: use directly if skeleton ever added; MMDPhysics: reject |
| Three.js AnimationUtils.makeClipAdditive + AnimationMixer (built in r128) | MIT | n/a | Native | Authored additive flinch layered on locomotion | Low | Use directly, only if you author clips; your AE layer already does the equivalent procedurally |

Open source sports/fighting implementations: I did not find a maintained, permissively licensed JS hockey or fighting game with transferable hit-reaction code. Searches only returned the repos above and a forum thread (https://discourse.threejs.org/t/active-ragdoll-physics/67247) recommending blending authored animation with ragdoll, and a tutorial https://dev.to/mattvb91/realistic-ragdoll-physics-in-threejs-1pko (companion to the unlicensed repo).

## Key question: can reactions get richer on the client without moving authority?
Yes. Pattern (industry standard, "animation-driven hit reactions"):
1. Server alone resolves hit outcome (who, power, direction, fall yes/no) and already ships it in the snapshot/event.
2. Client turns that into a short-lived, purely visual reaction state with inputs (impulse vector, magnitude, seed). It never writes back to sim position, velocity, or puck ownership.
3. Reaction = damped spring on a few cosmetic channels: torso lean/twist away from impulse, head whip, shoulder dip, knee buckle, arms flail, plus a short visual-only slide offset that decays. Critically damped spring (x'' = -k x - c x') is deterministic enough, cheap, and stable.
4. Falls: play the existing 'fall' event, add a pre-fall stumble phase (spring lean builds for 0.2-0.4s before server-confirmed down) and a procedural get-up (kneel, push up) in the event layer. Reconcile: when server says player is up/active, ease any residual visual offset to zero over 0.15s so desync can never persist.
5. Optionally a cosmetic cannon-es/Rapier ragdoll for only fallen/injured skaters, spawned from the server fall event, discarded on rejoin. Never feed it back. Risks: frame cost with 10 skaters, ragdoll popping on recovery, extra dependency. Probably not worth it versus springs.
Multiplayer risk is near zero as long as reaction state is derived from replicated events and is one-way (render only), with a hard timeout. Different clients may look slightly different mid-reaction; acceptable.

## Top 3 recommendations
1. Adapt, no library: add a damped-spring "reaction" channel to anim_ctrl.js (hitReact event with impulse vector + magnitude), triggered on the receiver by hitcommit data. Add attacker-side follow-through and a brief receiver stumble before 'fall'. Effort: low-medium, highest payoff, zero dependency.
2. Procedural get-up and board-hit variants in the same AE layer (kneel/push-up phases; board impact = squashed torso, rebound lean away from wall). Effort low. Use the same spring helper.
3. Defer physics engines. If a cosmetic ragdoll for injuries/fights is later wanted, prototype with cannon-es (MIT, pure JS, r128-safe) behind a feature flag; read rapierjs-ragdoll for bone mapping ideas only (no license, do not copy). Rapier is the upgrade path if cannon-es proves too weak.

## Could not verify
- Actual contents/quality of rapierjs-ragdoll and CharacterControl code (read only metadata and a search summary).
- LICENSE file text for ammo.js (API reported NOASSERTION; zlib per recollection, unconfirmed). Rapier/cannon-es/three licenses taken from GitHub API SPDX, not the LICENSE text.
- Whether Rapier WASM builds load cleanly beside r128 on your host and target mobile perf; no benchmark done.
- Existence of any suitable open-source hockey or fighting game; the search was shallow (one search round).
- I only grepped game.html/anim_ctrl.js; did not read the full contact loop or how the snapshot carries hit data.
