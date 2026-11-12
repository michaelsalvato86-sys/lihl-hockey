# 01 Rendering and presentation research (LIHL Hockey)

Date: 2026-11-12. Scope: lift visuals without replacing the engine (three.js r128, script tags).

## What r3d.js already does
- MeshStandardMaterial everywhere; ACES tone mapping, exposure 1.25.
- Desktop only: EffectComposer with 4x MSAA target plus UnrealBloomPass.
- Ice: canvas texture as map and emissiveMap, 128px CubeCamera env map of fake light bars (intensity .45). No true planar reflection.
- Glass: one transparent MeshStandard at opacity .13. Crowd: InstancedMesh bodies plus Points heads. Ice spray: 240 Points. Blob shadows only, no shadow maps.

## Candidates

| Name / URL | License (verified how) | Last push | r128 fit | Solves | Effort | Perf cost | Verdict |
|---|---|---|---|---|---|---|---|
| three.js Reflector, examples/js/objects/Reflector.js at tag r128. https://github.com/mrdoob/three.js | MIT (LICENSE read, 2010-2026 three.js authors) | 2026-11-12 | Native: THREE.Reflector global via script tag. Options: color, textureWidth/Height, clipBias, custom shader. No blur. | Real skater, net and board reflections on ice | Low-med: ice mesh becomes semi-transparent over it | One extra scene render per frame; use half-res target; skip on mobile | Use directly (desktop), add blur/fresnel via custom shader |
| drei MeshReflectorMaterial. https://github.com/pmndrs/drei (src/core/MeshReflectorMaterial.tsx) | MIT (GitHub API spdx only) | 2026-10-21 | React/R3F, modern three; not drop-in | Blurry, roughness-aware glossy ice look | Med-high to port shader chunks | Reflector plus blur | Study only |
| three.js r128 postprocessing passes (SMAAPass, AfterimagePass, SSAOPass). https://github.com/mrdoob/three.js | MIT | 2026-11-12 | Native; SMAAPass file read, exposes THREE.SMAAPass. No official per-object motion blur | SMAA instead of heavy 4x MSAA target; Afterimage for replay blur feel | Low | SMAA low; SSAO high | Use directly: SMAA, Afterimage (replays only). Reject SSAO as default |
| three.js built-in shadow maps (r128) | MIT | same | Native | Real skater and net shadows instead of blob circles | Low-med: one light, fitted shadow camera, PCFSoft 1024-2048 | Medium; casters limited to skaters and nets | Use directly (desktop quality toggle) |
| pmndrs/postprocessing. https://github.com/pmndrs/postprocessing | Zlib (API spdx only; raw LICENSE URL 404) | 2026-11-01 | Needs much newer three plus bundler | Better bloom, SMAA, effect merging | High | Lower than stock | Reject now |
| three.quarks. https://github.com/Alchemist0823/three.quarks | MIT (LICENSE read, Forrest Sun 2019) | 2026-05-21 | ES module, modern three | Rich spray, confetti, goal VFX | High | Medium | Reject (version); study emitter model |
| Own Points spray, upgraded | our code | n/a | Native | Better ice spray on stops and shots | Low: soft-sprite ShaderMaterial, size/alpha over life, 400-600 pts | Negligible | Adapt (best value) |
| agargaro/octahedral-impostor. https://github.com/agargaro/octahedral-impostor | MIT (API spdx only) | 2025-11-03 | Modern three | Impostor LOD for huge crowds | High | Low | Study only (crowd already instanced) |
| Strange-tech/100kTrees. https://github.com/Strange-tech/100kTrees | MIT (API spdx only) | 2023-04-22 (stale) | Unknown | Two-level instanced LOD pattern | n/a | n/a | Study only |
| sweriko/Horde. https://github.com/sweriko/Horde | MIT (API spdx only) | 2025-10-16 | WebGPU/TSL only | Impostor crowd demo | n/a | n/a | Reject for r128 |
| Poly Haven HDRIs/textures. https://polyhaven.com/license | CC0 (license page read, no attribution) | live | r128 RGBELoader plus PMREMGenerator, or bake into CubeRenderTarget | Real arena HDRI env for ice, helmets, visors, glass; knit normal maps | Low | Load time only; use 1k-2k | Use directly (assets only; confirm per-asset CC0) |
| three.js WebGPURenderer plus TSL. https://threejs.org/manual/en/webgpurenderer | MIT | live | Not in r128; needs modules and modern three | Compute particles, node materials | Very high (renderer and shader rewrite) | n/a | Reject for now |

## Material and presentation notes (no new dependency)
- Ice: MeshPhysicalMaterial (clearcoat exists in r128) with low roughness near camera, mixed with Reflector output.
- Helmets and visors: MeshPhysicalMaterial, clearcoat about .6, shared env map. Transmission is not available in r128, so keep alpha visors with high envMapIntensity and a gradient tint.
- Jerseys: add a low-scale CC0 knit normal map.
- Boards and glass: env map reflections on kick plates; thin emissive top rail on glass instead of more transparency layers.
- Arena lights: replace the 30 box emitters with a few SpotLights; fake beams with additive cone meshes (depthWrite off); one shadow caster only.
- Crowd: already instanced. Add instanceColor, time-uniform vertex bob (no CPU cost) and goal-cheer scaling. Impostors not needed at this scale.
- Motion blur: no good per-object option in r128; AfterimagePass at low damp on replays and goal cams only.

## Top 3 recommendations
1. Real shadows plus a Poly Haven HDRI env map on MeshPhysicalMaterial (ice, helmets, visors). Largest look gain, lowest risk, all native r128, CC0 assets.
2. THREE.Reflector under a semi-transparent glossy ice layer, desktop only, with blur/fresnel custom shader modeled on drei's approach, half-res, behind a quality setting.
3. Replace the 4x MSAA target with SMAAPass; upgrade Points spray to a soft-sprite ShaderMaterial; add GPU-side crowd bob. Cheap and mobile-safe.

## Could not verify
- LICENSE files for drei, postprocessing, octahedral-impostor, 100kTrees and Horde: spdx from GitHub API only (postprocessing raw LICENSE returned 404). Read the file before copying code.
- Whether the local three.min.js plus lib/ contains Reflector, SMAAPass or AfterimagePass: r3d.js guards on THREE.EffectComposer; the r128 example files would need adding as script tags. Not tested.
- WebGPU browser support (Safari and Firefox versions) conflicts across secondary sources; only the WebGL2 fallback is from the official manual.
- No frame-time measurements; all performance costs are estimates.
- Poly Haven is CC0 site-wide per its license page, but no specific asset was chosen or checked.
