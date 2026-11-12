# Pass 7 graphics (Agent E, branch p7-gfx)

Files: r3d.js (materials, lights, tiers), lib/Reflector.js (new, lazy loaded). costumes.js untouched (novelty hat only, nothing to change).
Reflector.js = three r128 examples/js/objects/Reflector.js, unmodified, MIT (three.js r128 LICENSE). Loaded only on the high tier via a script tag injected from r3d.js, so game.html and the service worker list were not touched (sw.js should add lib/Reflector.js if offline high tier is wanted).

## What changed
- Ice: roughness .18, tint, emissive cut .32 -> .05 (it flattened shadows), PMREM environment from a light-panel scene (`scene.environment`, replaces the old cube camera), skate marks moved to a separate transparent overlay plane (base texture now static, marks cheap to upload, desktop only as before).
- One directional shadow light, ortho +-60 ft, follows the point the camera looks at on the ice, snapped to light-space texels (no shimmer). PCFSoft, bias -.0004, normalBias .06. Casters: skater/goalie meshes and puck. Not crowd. Map: high 2048, std 1024, mob 512, low off (blob shadows return).
- Reflector: ice-shaped, 512x288, rendered every 2nd frame, additive k=.075, hides crowd, badges, ring, ice during the mirrored pass. High tier only. Shadows are not recomputed in the mirrored pass.
- Fabric materials (vertexColors, rough<=.5) roughened to .68 with envMapIntensity .5 so jerseys are not plastic; gear keeps its sheen. Crowd bodies get per-instance colour and brightness variation.
- Tiers: high (desktop, >800px, composer) / std / mob / low. `?q=high|std|mob|low` locks a tier (manual override), `gfxQuality('auto')` unlocks. Auto downgrade: frame EMA >25 ms on two consecutive 90-frame checks after frame 300 (high>std>low, mob>low), then the old pixel-ratio guard continues. Frame samples capped at 80 ms so a hidden tab does not trigger a downgrade.

## Numbers (RX 6900 XT, 1280x720 desktop, 844x390 mobile emulation, median of 3 runs x 60 frames, gl.finish per frame)
| tier | calls | tris | ms/frame |
|---|---|---|---|
| before desktop | 168 | 335k | 3.3 |
| high | 291 | 764k | 7.8 |
| std | 232 | 621k | 4.4 |
| before mobile | 129 | 276k | 4.1 |
| mob | 178 | 541k | 3.4 |
| low | 116 | 276k | 5.0 (noise; same geometry as before) |
Reflector + shadows roughly double the cost on high. This GPU is far faster than any target phone, so only the ratios mean anything. Shadow pass doubles skater triangles (skater meshes are the heavy part, ~25k tris each); a shadow-only low-poly proxy would be the next saving.
Auto downgrade verified by forcing slow frames: high>std>low.

## Looked at (screenshots actually viewed)
before desktop, after high, after std, after high without reflector, after mob (844x390). Not viewed: low tier image, replay camera, goalie cam. After high: glossy ice with skater reflections and ceiling-light glints, soft shadows; lines are still pale (composer path has no tone mapping, so the scene clips bright; a tone-map pass would be the real fix, not done). Shadows on the very bright ice are subtle. This is a clear improvement in glossiness, not "realistic".

## Not verified
No phone. No Safari/iOS (PMREM half-float, Reflector RGB target). No long-session memory/leak check. Reflection swims slightly during fast camera moves because it updates every 2nd frame. Camera code untouched, so shadow follow uses the camera's last-frame ray.
