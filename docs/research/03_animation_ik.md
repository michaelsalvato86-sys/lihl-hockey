# 03 Animation and IK research (2026-11-12)

## Context found in repo
LIHL does NOT use AnimationMixer at all (grep: 0 hits in anim_ctrl.js, skater3d.js). Everything is procedural: absolute bone quaternions per frame (skater_pose.js), layered in anim_ctrl.js (skating layer, stick layer, event layers with ANIM.dur timers, seeded per-player variation), plus a custom allocation-free two-bone arm IK in anim_rig.js. Quaternius Universal Base Characters (CC0), 65 bones. So the real gaps are polish (feet, hit reactions, recovery), not a missing framework.

## Candidates
| Name / URL | License (checked) | Last commit | r128 | Solves | Effort | Verdict |
|---|---|---|---|---|---|---|
| CCDIKSolver, three.js r128 `examples/js/animation/CCDIKSolver.js` https://github.com/mrdoob/three.js (file exists at tag r128, HTTP 200) | MIT | repo active today; file frozen at r128 | Native | Multi-bone chains (spine/neck lean, stick-arm fallback) | Low | Adapt, only if you need chains beyond 2 bones. Your two-bone IK is already better for arms |
| SkeletonUtils.retarget / retargetClip, r128 `examples/js/utils/SkeletonUtils.js` (has retargetClip, confirmed) | MIT | as above | Native | Apply Mixamo/other-rig clips to Quaternius rig | Medium (bone name map, rest-pose mismatch) | Adapt for one-off baked clips |
| jsantell/THREE.IK https://github.com/jsantell/THREE.IK | MIT | 2023-03-15 (stale) | Works with old three (2018 era), likely OK | FABRIK chains, constraints | Medium | Study only. Stale, adds nothing over your two-bone |
| lo-th/fullik https://github.com/lo-th/fullik | MIT (file header says three.js authors; fine) | 2025-05-17 | Standalone math, three-independent | FABRIK, full-body-ish chains, ball joint limits | Medium | Study only / adapt for goalie spine or stick-hand |
| upf-gti/ik-threejs https://github.com/upf-gti/ik-threejs | MIT | 2026-01-12 | Not verified (likely newer three, ES modules) | CCD/FABRIK hybrid | Medium | Study only |
| gltf-transform https://github.com/donmccurdy/glTF-Transform | MIT | 2026-10-20 | N/A (offline CLI) | Merge, prune, resample, compress GLB clips; build one animations.glb | Low | Use directly (build step) |
| glTF-Blender-IO https://github.com/KhronosGroup/glTF-Blender-IO | Apache-2.0 | 2026-11-11 | N/A (exporter) | Export baked Blender actions to GLB | Low | Use directly |
| Mixamo (Adobe) https://www.mixamo.com | Adobe terms: free, royalty free in games, no redistribution of raw files as a pack | n/a | Exports FBX/DAE only, convert via Blender or FBX2glTF | Quick clips (stumble, fall, get up, hit reactions) | Medium | Use directly for reactions, license caveat below |
| Cascadeur https://cascadeur.com | Free tier is non-commercial/revenue capped (terms not re-read) | n/a | N/A | AI-assisted physics keyframing of falls and hits | High learning | Study only |
| Blender Rigify / Auto-Rig Pro | Rigify GPL (tool, output is yours); ARP paid | n/a | N/A | Retarget in Blender | Medium | Reject (SkeletonUtils is enough) |
| Motion matching in JS: no maintained three.js library found. Search turned up TFUCE/MotionMatching (no license) and unrelated RL repos | none / n/a | n/a | n/a | n/a | Very high; needs mocap database LIHL does not have | Reject |
| Rapier-based ragdoll/IK | Rapier is Apache-2.0 (not re-verified) | n/a | Needs WASM, ES modules | Physical falls | High | Reject (gameplay is deterministic/networked; physics ragdoll adds desync risk) |
| Cinevva clips tool https://app.cinevva.com/tools/animations | 260 CC0 clips (per site, unverified in detail) | n/a | GLB export | Generic clips | Low | Study only |

## Free animation packs
- Quaternius Universal Animation Library 1 and 2 (https://quaternius.itch.io/universal-animation-library): CC0, 120+ and 130+ clips, same rig family as your characters (very likely retargets with zero mapping). No hockey or skating clips advertised. Use directly for fall, get-up, stumble, celebrate, idle variants. (Compatibility with your exact rig version not verified.)
- Rokoko free 12 sports mocap clips: license not stated in results; unverified, check before use.
- Sketchfab low-poly ice skating people: license not seen; unverified.
- Hockey-specific: only paid (Flipped Normals Ice Hockey, 160 anims; CGTrader skate models). No free licensed hockey or skating pack found. Conclusion: skating, shot, check must stay procedural, which you already do.

## Concept mapping to LIHL
- State machine and blending: you already have layered timers (ANIM.dur) and exponential smoothing (_sm). Do not add AnimationMixer. If baked clips are imported, drive them with AnimationMixer only for the fall/get-up layer and crossfade quaternions into your pose output.
- Additive layers: implement by composing baked-clip deltas against clip frame 0 on top of procedural pose (small custom function; no library needed).
- Foot placement: no library; do a custom ice-contact pass (pin skate to ice height, lift swing foot, two-bone leg IK reusing anim_rig.js, which already has len/dir for arms; extend AR.init to thighs and calves). This is the best fit.
- Animation event markers: you already emit sim events. Add a small marker table per baked clip (time to event) if clips are imported.
- Hit reactions / fall-recovery: procedural flail/back/brace states exist; quality gain comes from importing 2 or 3 UAL fall and get-up clips and blending.

## Top 3 recommendations
1. Extend your own two-bone IK (anim_rig.js) to legs for skate-on-ice foot placement and stride planting. Zero dependencies, deterministic, r128 safe. Effort low to medium.
2. Import Quaternius UAL (CC0) fall, stumble, get-up and celebrate clips, merge to one GLB with gltf-transform, retarget with r128 SkeletonUtils.retargetClip, play via a single AnimationMixer layer blended into the procedural pose for fall/recovery and hit reactions.
3. Add Mixamo clips only as a gap filler (hockey stumble, hit reaction), converted via Blender (glTF-Blender-IO export), after confirming Adobe terms; keep everything else procedural. Skip all third-party IK libraries and motion matching.

## Could not verify
- Exact three.js revision of the bundled three.min.js (version string grep found nothing); r128 assumed from the brief. CCDIKSolver and SkeletonUtils were confirmed present at tag r128 only.
- THREE.IK and ik-threejs r128 runtime compatibility (not tested).
- UAL clip list, rig bone-name match with your Quaternius Base Characters, and whether UAL is distributed as GLB (reported yes by one search, not checked).
- Mixamo and Cascadeur current terms (summarized from memory, not fetched); Rokoko and Sketchfab licenses; Rapier license.
- Whether any free hockey or skating mocap exists outside the search results (none found).
