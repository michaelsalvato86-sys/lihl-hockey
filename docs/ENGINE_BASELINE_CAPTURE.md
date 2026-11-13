# Engine baseline capture (web game vs Unreal, side by side)

Purpose: repeatable still scenes of the CURRENT three.js game, so the later Unreal prototype can be framed identically and compared. Unreal side is not built yet (Unreal is not installed on this PC); only the web side was captured.

## Fixed reference data (from the sim and r3d.js)
- Rink: 200 x 85 ft (game.html line 284). Goal lines at x=11 and x=189 ft, blue lines x=75 and 125, centre red line x=100, faceoff circles r=15 at (31,22), (31,63), (169,22), (169,63), centre (100,42.5). Goal opening y 37.5..47.5 (10 ft), crossbar 4 ft, net depth 4 ft. Corner radius 12 ft in the sim collision.
- Web world coordinates (r3d.js): x = sim x - 100, z = sim y - 42.5 (this is the same as the Unreal mapping in `LihlCoords.h` with x30.48 for cm), y up. Unreal: X = x, Y = z, Z = y, in cm.
- Camera: default broadcast follow cam is height 23 ft, distance 38 ft, FOV 40 (r3d.js line 244), looking at the focus point on the ice.
- Player scale: Quaternius-based skater models, about 6 ft tall in the web world (1 unit = 1 ft). The sim separation radius between skaters is 4.4 ft. Use the same height in Unreal (capsule 3 ft half height in the scaffold).
- Teams for the capture: the default pairing the game selects at start (Average Joes `AJ` vs Brew Crew `BAB`, see scenes.json); colors come from `Teams.csv` (`Color`, `Accent`) and jersey slots from `Jerseys.csv`.
- Lighting: the web game uses ACES filmic tone mapping, exposure 1.25, one directional light plus ambient (r3d.js line 134). In Unreal use one directional light with similar sun angle plus sky light; do not enable Lumen GI in the first matching shot (compare lighting first, then upgrade).
- Puck at centre ice, play frozen (G.pause), faceoff positions.

## Scenes (camera position in feet, look-at in feet, FOV)
| Scene | Camera (x, y up, z) | Look at | FOV | Compares |
|---|---|---|---|---|
| broadcast_side | (0, 23, 38) | (0, 0, 0) | 40 | default view, scale, lighting, ice look |
| wide_high | (0, 60, 70) | (0, 0, 0) | 40 | whole rink and stands |
| top_down | (0, 120, 0.01) | (0, 0, 0) | 40 | markings and dimensions |
| goal_end | (-55, 9, 0) | (-89, 3, 0) | 45 | goal frame, goalie scale, boards |
| skater_close | first home skater + (7, 4.5, 11) | skater + (0, 3, 0) | 38 | player model, team color, skates |

Unreal camera for a scene: location (x, z, y) * 30.48 cm in (X, Y, Z); FOV in the CineCamera horizontal vs vertical terms differs, the web FOV is VERTICAL (three.js), so convert: HFOV = 2*atan(tan(VFOV/2)*16/9) for 1280x720.

## Files
- `tools/capture_baseline.py` captures the five scenes with Python Playwright (chromium, SwiftShader software GL) into `docs/engine_baseline/*.png` + `scenes.json` (camera numbers, git hash). Run: `python tools/capture_baseline.py`. Without Playwright, set the cameras by hand with the table.
- Method: start an exhibition game, freeze with `G.pause`, override the camera in `WebGLRenderer.render`, hide the on-screen HUD and touch controls.
- Images contain cartoon models only. The script hides the floating player-photo discs and photo sprites (real people) and the rendered crowd shows as colored blocks, so no faces are committed.

## Known limits
- Captured with SwiftShader (software GL), not the RX 6900 XT: shadows and tone are the web game's quality tier `q=high`, but this is NOT a performance measure.
- In `top_down` the hanging jumbotron is still in view (the hide-high attempt did not catch it); ignore the centre box.
- The scene is frozen at a faceoff: no motion, no animation comparison. Animation comparison needs the later video capture.
- Floating hit text, HUD and scoreboard are not compared.
