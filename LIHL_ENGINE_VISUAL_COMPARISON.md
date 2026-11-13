# Engine visual comparison (Pass 10)

## Honest status
There is NO Unreal Engine build, so there is no Unreal screenshot or video and no side-by-side comparison of rendered results. Unreal Engine 5 and Visual Studio are not installed on this PC (see LIHL_MEGA_PASS_10_INITIAL_AUDIT.md). Writing a comparison that pretends otherwise would be fiction. This document defines the comparison so it can be run the day an Unreal build exists, and records the current-game baseline that was actually captured.

## What exists now
- Baseline of the current three.js game, captured with Playwright (software GL, so no performance meaning): docs/engine_baseline/broadcast_side.png, wide_high.png, top_down.png, goal_end.png, skater_close.png plus scenes.json (1280x720). They show cartoon skaters, goalie, rink markings and block crowd; the player-photo discs and avatar sprites were hidden for the capture; no faces. Known flaw: in top_down the hanging jumbotron covers the centre of the ice.
- Capture definition and script: docs/ENGINE_BASELINE_CAPTURE.md, tools/capture_baseline.py (rink dimensions from the sim, five camera positions, player scale, team colors, lighting conditions).
- Unreal side: unreal/LIHL_UE5_HOCKEY_POC is an uncompiled C++ scaffold with the same rink dimensions, ports of the skating and goalie math, and the DataTable exports. It has not been opened, compiled or run.

## Comparison plan (to run once Unreal is installed)
Same rink dimensions, the same five cameras, the same team colors (Whiskey Stick black versus Average Joes), the same skating and shooting scenarios, then score the twelve criteria below 1 to 5 by looking at frames (not by reading documents).

| Criterion | Current three.js evidence | Unreal evidence | Basis today |
|---|---|---|---|
| Player model quality | cartoon Quaternius model, about 24k triangles, vertex colors, jersey atlas | none | no Unreal frame |
| Skating realism | SKATE2 edge model plus procedural legs; backward skate still a low squat | none | |
| Body mechanics | procedural, leg IK, 3 to 5 cm weight shift | none | |
| Stick animation | two-hand IK procedural | none | |
| Puck interaction | custom puck with height, swept collision | none | |
| Shooting | blade-synced release, 21 variants | none | |
| Goalie movement | arc positioning, 20+ variants | none | |
| Shadows | one shadow light plus proxy shadows | none | |
| Ice | glossy ice, reflector every frame, painted markings | none | |
| Reflections | planar reflector on high tier | none | |
| Arena atmosphere | simple lamps and crowd blocks | none | |
| Camera presentation | broadcast camera with zoom and replay | none | |

## What the research predicts (not evidence)
LIHL_UE5_GRAPHICS_RESEARCH.md estimates Unreal would win by a large margin on global illumination, many-light arena lighting, per-character shadows and ice reflections, with frame times near our current high tier at 1080p on the RX 6900 XT (estimates only; one 1 to 2 day measurement spike is the recommended way to replace them with numbers). Character animation is the area Unreal does NOT automatically fix: there is no hockey mocap to buy (LIHL_UE5_ASSET_RESEARCH.md and LIHL_UE5_ANIMATION_RESEARCH.md).
