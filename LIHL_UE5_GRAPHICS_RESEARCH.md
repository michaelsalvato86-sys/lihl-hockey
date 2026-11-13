# LIHL UE5 Graphics Research (Mega Pass 10, Agent D)

Scope: what Unreal Engine delivers that our three.js r128 renderer cannot realistically match, and what fits an RX 6900 XT. Date 2026-11-13.

Evidence labels: [V] verified from a fetched source listed at the end; [S] secondary or blog claim, not independently verified; [E] my estimate, not a measurement; [U] unverified, from general knowledge.

## 0. Honest summary of the evidence

- Real, citable RX 6900 XT numbers for UE5 Lumen/Nanite scenes are scarce. What I found: Silent Hill 2 Remake (UE5, Lumen, no HWRT) about 41 fps at native 1440p on a 6900 XT, pre-patch late 2024 (Guru3D forum reply) [V, weak: forum, old build]; DSOGaming says a 3080 beats the 6900 XT in that game and in Aphelion (UE 5.5.4) at all resolutions, no fps figure retrievable (page returned 403) [V partial]; NeoGAF early UE5 demo thread: about 50-60 fps at 1440p, 28-35 fps at 4K, HWRT Lumen "broken" at that early stage [S, 2022-era, obsolete].
- Epic does not publish per-GPU numbers. Its Lumen guide gives only console budgets: 8 ms (30 fps) and 4 ms (60 fps) at 1080p for GI + reflections + volumetric fog together; each lower scalability level costs roughly half the one above [V].
- Therefore every frame time below for LIHL is [E]. A 1-day spike on the 6900 XT must replace them before any commitment.
- UE 5.8: a stable 5.8 reportedly shipped 2026-06-17 with hotfixes (5.8.2, 5.8.4) [S, search snippet and one blog]. I could not read Epic's official 5.8 notes. Known for 5.8 [S]: MegaLights production-ready, a "lighter Lumen" path aimed at 60 fps on Switch 2 and mid PCs, improved PSO precaching, experimental MetaHuman Crowd plugin, Mesh Terrain (irrelevant), Control Rig Physics beta. Everything else below is verified for 5.7 or earlier and assumed to carry forward.

## 1. Feature by feature

### Nanite
- Static meshes: mature; huge triangle counts, automatic LOD; good for stands, rafters, boards, seats [V general].
- Skeletal meshes: Nanite skinning arrived experimentally in the 5.5-5.7 era; 5.7 uses it for foliage wind and Nanite skeletal assemblies from the Procedural Vegetation Editor [V, partial]. Nanite Foliage is Experimental in 5.7 and uses skinning rather than WPO [V]. For 12 skaters classic skeletal meshes are cheap, so do not depend on it [E].
- Masked materials work but cost more than opaque; translucent is not Nanite (glass stays traditional) [U].
- Gain for us: modelled seating bowl with thousands of unique props, no hand LOD. Three.js equivalent is instancing plus hand LODs, no cluster culling.
- RDNA2: Nanite is mostly compute based and works on RDNA2; low risk [U].

### Lumen
- Software RT (distance fields, surface cache): fastest, no HWRT needed, tracing cost independent of instance count [V]. Weak on thin walls, can leak light, poor for mirror-sharp ice reflections (reflects a simplified scene) [V general].
- Hardware RT: better quality, more expensive, rebuilds TLAS each frame, sensitive to overlapping instances, under about 100k instances for console-class performance [V]. All passes use HWRT or none [V].
- Claims of 5-15 ms extra for HWRT at 4K high-end PC [S, no GPU named]. PS5 reflection tracing, hit lighting 11.5 ms vs surface cache 2.4 ms, via Medium citing SIGGRAPH [S, unverified].
- 5.7: Lumen moving away from the SWRT "detail traces" path toward HWRT at 60 Hz; half-res integration on High saves about 0.5 ms at 1080p on console [V, Tom Looman]. Firefly filtering stronger by default (MaxRayIntensity 10), which can dull small bright emissive lights [V]. 5.7.2 fixed Lumen noise on clean surfaces [V, forum].
- RDNA2 risk: the 6900 XT has ray accelerators but noticeably lower RT throughput than comparable RTX 30 cards [U]; consistent with the 3080 beating it in UE5 Lumen titles [V]. Recommend software Lumen as default and HWRT only as an optional Ultra preset for ice.
- Indoor arena with many emissive lights: Lumen treats emissive meshes as GI sources; small bright emissives get noisy, so the usual answer is a few real rect/spot lights for the key look plus emissive ambience [U]. MegaLights (Beta in 5.7 [V], production-ready in 5.8 [S]) targets hundreds of dynamic lights with stochastic shadowing, but its RDNA2 behavior is unverified [U].

### Reflections on glossy ice (the key visual)
| Method | Quality | Cost on 6900 XT [E] | Notes |
|---|---|---|---|
| Planar reflection (UE actor, or our Reflector) | Perfect for a flat sheet, no noise | Re-renders scene, about +60-100% scene cost [U] | What we do now; legacy in UE |
| Screen-space reflections | Cheap; fails off-screen (stands behind camera) and at grazing angles | 0.5-1.5 ms | Low broadcast angle is its worst case |
| Lumen software reflections | Approximate, soft; fine for rough ice, not mirror | 2-4 ms | Default |
| Lumen HWRT reflections | Accurate, includes skaters, boards, crowd, lights | 4-8 ms at 1440p, high variance | Best look, risky on RDNA2 |
| Hybrid Lumen plus planar | Good | Sum | Extra engineering |
Recommendation: ice with roughness about 0.1-0.2 plus scratch normal map; Lumen reflections on High, software tracing on Medium, SSR on Performance.

### Virtual Shadow Maps
- Default with Nanite/Lumen; virtual high-res pages with caching of static geometry, so cost scales with moving casters and light changes [V general]. 5.7 enables VSM receiver masks for directional lights by default, about 10 MB memory [V].
- 12 moving skaters invalidate pages locally; modest cost. The expensive case is many local lights each with VSM; MegaLights marks only the pages it selects [V]. Realistic budget: one or two key lights plus MegaLights [E]. Ours today: one shadow map plus proxy blobs.

### Materials: classic PBR vs Substrate
- Substrate is production-ready in 5.7 [V]; slab based, supports clear coat, thin film, subsurface and fuzz [V general]. More shader memory and compile time [U].
- Ice: clear-coat PBR or multi-layer Substrate (rough lower slab, glossy top, subsurface milkiness). Three.js MeshPhysicalMaterial has clearcoat and transmission but no layered scattering and weak environment lighting, so ice is faked as an opaque plane plus reflector.
- Jerseys: UE fuzz/cloth shading; three.js r128 lacks sheen (added later, about r130) [U].
- RDNA2: use classic PBR for characters; Substrate only for ice if the spike shows value [E].

### Post-processing
- UE: physically based bloom (convolution bloom expensive), histogram auto exposure and local exposure, TSR, motion blur, DoF, LUT color grading, grain, vignette, flares [U].
- Tone mapping: UE5 default is an ACES-like filmic curve; other curves available (AgX/neutral, ACES 2.0 via OCIO) [U, verify in 5.8]. Our ACES pass has easy parity; UE's gain is physical exposure handling bright ice against dark stands.
- Cost: bloom + tonemap + AA about 1-2 ms at 1440p [E].

### Volumetric fog and light shafts
- Exponential Height Fog with froxel volumetric fog and light shafts from arena spots is built in, lights and shadows contribute [V general]. About 0.5-1.5 ms [E]. In three.js we fake with additive cones or write a raymarcher, without occlusion.

### Niagara
- GPU particles with depth collision, ribbons (puck trail), mesh emitters, events (goal bursts) [U]. Ice spray at a few thousand particles is well under 0.5 ms [E]. 5.7 stateless emitters cut cook overhead (about 4k saved per emitter) [V]. WebGL2 has no compute, so collided GPU sims in three.js would need custom hacks.

### Crowd
- Options: instanced meshes with vertex animation textures (cheapest), Mass Entity with instanced animation, impostors for far rows. 5.7 batched Mass observers about 20x fewer calls in CitySample [V]; 5.8 adds experimental MetaHuman Crowd, "dozens to several thousand" [S].
- A 3000-5000 seat VAT crowd about 1-2 ms [E]. Nanite does not help animated spectators; it helps static seating. three.js can do InstancedMesh with custom animation shaders, which we would build ourselves.

### Glass and boards
- Glass is translucent: no Nanite, no Lumen reflections of the glass itself except SSR/captures; Substrate adds refraction for thin glass [U]. Cost small; watch translucent overdraw with fog and many lights.

### Motion blur, DoF, broadcast camera, replays
- Cine Camera actor: focal length, aperture, DoF, exposure, shake, Sequencer-driven replay cameras; per-object motion blur works with TSR [U]. Replay System plus Sequencer; Movie Render Queue with Cinematic scalability for offline highlight quality [V for Cinematic level, rest U]. In three.js, DoF and blur are approximate post passes without object motion vectors.

### TSR and FSR on AMD
- TSR is built in and runs on any DX12 GPU; Epic's guide has Lumen at internal 1080p with TSR upsampling to 4K [V]. FSR plugins exist, FSR 3 frame generation works on RDNA2 [U]. No DLSS. TSR about 1-2 ms at 1440p output, up to about 3 ms at 4K [E].
- Suggested screen percentage: 100% at 1080p, 67-75% at 1440p, 50-58% at 4K.

### Size, compile, Editor, VRAM
- Packaged small one-arena game: 3-8 GB [E]. Editor install about 40-60 GB plus derived data [U]. 5.7 drops 128-bit base pass shaders, about 50k shaders and 15 MiB [V].
- First compile: minutes for the cold shader cache in Editor, tens of minutes for a full cook [E]; 5.8 improved PSO precaching [S]. A 5950X with 128 GB RAM is not the bottleneck [E].
- Editor viewport on the 6900 XT in a full arena: 30-60 fps at 1080p [E]; Editor 8-20 GB RAM, 6-10 GB VRAM [E].
- Runtime VRAM at 1440p about 5-8 GB, 4K about 8-12 GB (VSM pool 1-2 GB, Lumen surface cache 0.5-1 GB, Nanite pool 0.5-1 GB, textures) [E]. 16 GB is enough.

## 2. Estimated frame times: rink, 12 skaters, RX 6900 XT (all [E], NOT measurements)

Assumptions: one arena, about 3000 instanced spectators, software Lumen on High/Medium, TSR upscaling, one key light plus MegaLights/VSM, light Niagara. Scaled from Epic's 4-8 ms Lumen budget at 1080p [V], the 6900 XT being similar to or somewhat above console class in raster, and the observation that UE5 Lumen games are heavy on it (SH2 about 41 fps, about 24 ms, native 1440p, big forest scene [V weak]).

| Preset | Settings | 1080p | 1440p | 4K |
|---|---|---|---|---|
| High | Lumen SW GI and reflections, VSM, volumetric fog, TSR 100/75/58% | 8-11 ms | 11-15 ms | 18-25 ms |
| Ultra (optional) | High plus HWRT reflections, adds 3-8 ms | 13-18 ms | 17-23 ms | 28-40 ms (not recommended) |
| Medium | Lumen medium GI, SSR, cached shadows, TSR | 5-7 ms | 7-10 ms | 12-17 ms |
| Performance | no Lumen (baked or SSGI), SSR, cascaded shadows, TSR 67% | 3-4 ms | 4-6 ms | 8-11 ms |

Compare: our three.js High tier measured 8.0 ms (684k tris, 293 draw calls) in headless Chromium on a shared machine, resolution not stated [V, Pass 9 doc]. UE at 1080p High is a similar ms range with far more features; 4K costs over 2x.

## 3. RDNA2 risks and scalability recommendations

Risky: (1) Lumen HWRT; (2) MegaLights if it leans on HWRT [U]; (3) Substrate shader compile and VRAM; (4) VSM with many local lights; (5) translucent glass plus volumetric fog overdraw; (6) no DLSS, frame gen only via FSR 3; (7) driver maturity for early HWRT Lumen (2022 note, obsolete) [S].
Safe: Nanite static, software Lumen High/Medium, TSR, Niagara, instanced crowd.

Starting scalability (verify cvar names in 5.8): sg.GlobalIlluminationQuality 2-3; sg.ReflectionQuality 2-3; sg.ShadowQuality 3; r.Lumen.HardwareRayTracing 0; r.ScreenPercentage 67-75 at 1440p; volumetric fog grid pixel size 16 (8 only on High); r.Lumen.ScreenProbeGather.StochasticInterpolation 2 (half-res, about 0.5 ms on console) [V]; r.MegaLights.DownsampleMode half-res checkerboard if MegaLights is used [V].

## 4. What UE gives that three.js cannot realistically match, ranked for hockey

1. Realistic ice: layered material plus Lumen/HWRT reflections that include moving skaters and arena lights.
2. Dynamic GI from many arena lights and emissive boards (Lumen, MegaLights).
3. Virtual shadow maps for crisp character shadows.
4. Cine camera, TSR, physical exposure and DoF for a broadcast look; Sequencer replays.
5. Niagara GPU particles with collision.
6. Mass/instanced crowd with LOD and animation pipeline.
7. Nanite for stands and props without LOD authoring.
WebGL2 has no compute shaders; WebGPU would allow some of this, but nothing like Lumen or Nanite exists in three.js [U].

## 5. Quality table: current renderer vs UE5 on 6900 XT

| Feature | Current three.js r128 | UE 5.7/5.8 | Gap |
|---|---|---|---|
| Ice reflections | Planar Reflector each frame (high tier) | Lumen SW/HW, planar or SSR | Large: lights, roughness blur |
| Shadows | one shadow map plus proxy blobs | VSM, per character | Large |
| GI / ambient | ambient plus fakes | Lumen GI | Very large |
| Many lights | few | MegaLights, emissive GI | Very large |
| Materials | MeshStandard/Physical | Substrate or PBR, clear coat, fuzz, SSS | Medium (ice), large (cloth) |
| Tone mapping | ACES pass | Filmic/AgX plus auto and local exposure | Small to medium |
| Bloom, DoF, motion blur | simple bloom | full cinematic stack | Medium |
| Volumetrics | fake cones | volumetric fog and shafts | Medium |
| Particles | CPU sprites | Niagara GPU with collision | Medium |
| Crowd | sprites/instances | Mass, VAT, MetaHuman Crowd | Medium |
| Geometry | 684k tris, 293 draws | Nanite, millions | Large, not decisive for a rink |
| AA / upscale | MSAA or none | TSR, FSR | Medium |
| 1080p High frame time | 8.0 ms [V] | about 8-11 ms [E] | Similar cost, much higher fidelity |
| Distribution | URL, instant | 3-8 GB package or Pixel Streaming | UE worse |

## 6. Web targets (brief; hosting covered elsewhere)

- Pixel Streaming: server GPU runs the UE app and encodes video via NVENC, AMF or VideoToolbox; one encode session per peer; designed for one app per player [V]. Consumer NVIDIA NVENC session limits (historically about 3) from a forum post, verify current [S]. Rough cost: a T4 instance (g4dn.xlarge about $0.53/h) serves 1-4 streams depending on scene [S]. AMF session limits and latency on a 6900 XT were not found. Added latency suits demos better than twitchy online play.
- WebGPU alternatives (three.js WebGPURenderer, Babylon, PlayCanvas): compute particles and better instancing, no Lumen/Nanite equivalent; would require migrating from r128 [U].

## 7. Recommended visual target and presets for a hockey prototype

Target: "broadcast arena" look at 1440p, 60+ fps on the 6900 XT, High preset: software Lumen, ice as clear-coat PBR (Substrate only if the spike justifies it) with Lumen reflections, VSM for characters, one key light rig plus emissive boards (MegaLights optional), height fog with light shafts, Niagara spray, instanced VAT crowd, TSR 75%, filmic tone mapping with local exposure.
Presets: Ultra (showcase, HWRT ice, 1440p TSR 75%, fps unverified); High (default dev); Medium (Lumen Medium, SSR fallback, 1080p TSR 100%); Performance (no Lumen, baked or SSGI lighting plus SSR, TSR 67%).
First step (1-2 days): empty arena with ice plane, 12 skeletal skaters, 3000 instanced spectators; capture stat gpu and Unreal Insights on the 6900 XT at 1080p/1440p/4K for software Lumen, HWRT reflections and SSR; record shader compile time and packaged size. Decide go or no-go only after those numbers.

## Sources

- Epic, Lumen Performance Guide: https://dev.epicgames.com/documentation/unreal-engine/lumen-performance-guide-for-unreal-engine
- Tom Looman, UE 5.7 Performance Highlights: https://tomlooman.com/unreal-engine-5-7-performance-highlights/
- UE 5.7 released (Epic forum): https://forums.unrealengine.com/t/unreal-engine-5-7-released/2673913 ; DigitalProduction https://digitalproduction.com/2025/11/12/unreal-engine-5-7-foliage-pcg-and-in-editor-ai/
- UE 5.8 coverage: https://gameworldobserver.com/2026/05/14/the-preview-version-of-unreal-engine-5-8-has-been-released , https://gamefromscratch.com/unreal-engine-5-8-preview-released/ , https://ludusengine.com/blog/unreal-engine-5-8-whats-new , https://forums.unrealengine.com/t/unreal-engine-5-8-released/2729274
- DSOGaming Aphelion (403 on fetch, snippet only): https://www.dsogaming.com/pc-performance-analyses/aphelion-benchmarks-pc-performance-analysis/
- Guru3D Silent Hill 2: https://www.guru3d.com/story/silent-hill-2-remake-gpu-performance-challenges-in-achieving-60-fps/ ; DSOGaming SH2: https://www.dsogaming.com/pc-performance-analyses/silent-hill-2-remake-pc-performance-analysis/
- NeoGAF early UE5 benchmarks: https://www.neogaf.com/threads/unreal-engine-5-benchmarks-6900xt-outperforms-3090-at-1440p-28-gb-ram-usage.1607654/
- Epic Pixel Streaming reference: https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-pixel-streaming-reference ; NVENC sessions thread https://forums.unrealengine.com/t/cannot-run-more-than-3-instances-of-pixel-streaming/479830
- Local: LIHL_MEGA_PASS_9_PERFORMANCE.md

Not verified: Epic's official 5.8 release notes; any RX 6900 XT HWRT-Lumen ms figure; AMF session limits; everything tagged [U] or [E].
