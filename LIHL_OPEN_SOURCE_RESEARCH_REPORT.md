# LIHL open source research report (2026-11-12)

Seven research agents searched GitHub and the web; their full reports (tables, links, what they could not verify) are in docs/research/01 to 07. Licenses were read from GitHub metadata or LICENSE files as noted in each report; several are marked unverified there. Status labels: Research completed. Source code inspected: only where a report says so (most candidates were judged from metadata and READMEs). Library tested: none. Integrated: none.

## Headline findings
1. There is no open source 3D ice hockey game with reusable skater physics (docs/research/07). The one maintained game, wolfrats/hockey (Godot, GPL-3.0), is study only. Leaked or decompiled projects (historicalsource/open-ice, Mhopkinsinc/NHLHockey) were rejected.
2. No usable ice-skating controller or motion-matching library exists for this stack (02, 03). LIHL should write its own edge, stride and stop model.
3. A physics engine is not what LIHL's puck needs; contact rules driven by animation events are (04).
4. Hit reactions can be made richer client-side with damped springs, with the server still deciding outcomes (05).

## Shortlist by category
A. Directly reusable
- three.js r128 Reflector, shadow maps, SMAAPass, AfterimagePass, MeshPhysicalMaterial clearcoat (MIT, in the three.js examples): ice reflection, shadows, anti-aliasing. (01)
- Poly Haven CC0 HDRIs and textures (CC0): environment maps, knit normal maps. (01)
- glTF-Transform (MIT) and Blender glTF-Blender-IO (Apache-2.0): offline animation asset pipeline. (03)
- Quaternius Universal Animation Library (CC0, per the vendor site): fall, stumble, get-up and celebrate clips. (03)

B. Adapt
- Yuka (MIT, github.com/Mugen87/yuka): interpose and pursuit steering math for the goalie and defenders. (06)
- planck.js (MIT) only if a real engine is ever required for the puck. (04)
- MortimerGoro/AirHockeyWebGL and dweis/verold-airhockey (MIT): puck and board bounce code. (07)

C. Study only
- wolfrats/hockey (GPL-3.0), helios-base (MIT, C++ formation ideas), librcsc (LGPL), otterpuck (MIT, not inspected), Rapier (Apache-2.0), cannon-es (MIT), THREE.IK, fullik, ik-threejs (MIT), drei MeshReflectorMaterial (MIT).

D. Asset tools: Blender, glTF-Transform, Quaternius, Kenney (CC0 per their sites). No free hockey or skating animation pack was found.

E. Rejected: GMTurbo/Hockey and PuckOff (no license), ZenGM (license forbids playable forks), ski (GPL), ammo.js and MMDPhysics (heavy), pmndrs/postprocessing and three.quarks (need newer three and a bundler), Horde and WebGPURenderer (not r128), ragdoll repos without licenses.

## Per-area recommendation
Skating: write an edge-radius turning model, grip budget, stride phase and real hockey stop ourselves (about 60 lines, no dependency). Animation: extend the existing two-bone IK to legs for foot placement; add a spring based hit-reaction layer; optionally import Quaternius clips through one AnimationMixer layer. Puck: swept-circle integrator with height, restitution and blade contact driven by animation events; no engine. Checks: damped-spring cosmetic reactions on the client. Goalie and AI: arc positioning, reaction delay, situation based formation blending, support-spot scoring (algorithms from Yuka and RoboCup agent2d, ported by hand). Rendering: shadow maps plus HDRI on MeshPhysicalMaterial, then Reflector ice, then SMAA.
