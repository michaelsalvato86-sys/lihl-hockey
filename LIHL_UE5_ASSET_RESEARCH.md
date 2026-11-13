# LIHL UE5 Asset Research (Pass 10, Agent C)

Date: 2026-11-13. Research only. Nothing downloaded into the repo, no third party assets added, nothing deployed.
Tags: [V] verified this session from a fetched page or search result; [M] from memory or secondary source, UNVERIFIED, check before relying; [X] could not be checked (page blocked or not found).
Note: LIHL_MEGA_PASS_10_INITIAL_AUDIT.md does not exist in this worktree, so it was not read. Read: docs/research/08_quaternius_clips.md, 03_animation_ik.md, models/, skater3d.js, jerseys.js.

## 0. Bottom line

1. A convincing hockey player in UE5 is not obtainable for free. No free source provides hockey or skating mocap, a rigged hockey-gear character, or a rink environment kit. Free covers generic locomotion/falls/emotes (Quaternius UAL, Epic Game Animation Sample), a CC0 base body, and loose CC0/CC-BY gear props that are hard to find and must be checked one by one.
2. Cheapest credible path: our own 24k-tri LIHL skater (already hockey-shaped, with gear and jerseys) improved and re-exported to UE, procedural skating written in UE (speed-driven stride, lean, IK), plus two small paid hockey animation packs (about $20 each, Player and Goalie) on the Epic skeleton.
3. Quaternius characters and the UAL use UE-mannequin-style bone names, so IK Retargeter setup is low effort (3-spine vs 5-spine chain mapping is the main wrinkle).
4. Mixamo is usable commercially inside a shipped game, but raw files must not be redistributed. Never put Mixamo, Fab, Marketplace or Epic sample assets in the repo.

## 1. What no source provides (explicit)

- No free hockey or ice skating motion capture was found: not CMU, Mixamo, Rokoko free packs (unverified), Quaternius, or Epic samples. The only skating data found is FS-Jump3D (figure skating jumps, CC BY-NC-SA 4.0, non-commercial [V]); not hockey, not usable commercially.
- No free rigged hockey-equipped character (pads, helmet, gloves, skates, stick) with a verified CC0/CC-BY license.
- No free ice material or rink kit for UE verified. The only dedicated hockey environment found is paid ($249.99).
- No free shooting, checking, or goalie save clips. Goalie butterfly/glove saves exist only paid.
- Hand-and-stick IK, skate edge contact, and the stride cycle must be authored by us regardless of source.

## 2. Animation and character sources

| Asset | URL | License | Price | Attribution | Commercial | Redistribute | Modify | Size | Quality / notes | Retarget effort | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Quaternius Universal Animation Library (UAL) | https://quaternius.com/packs/universalanimationlibrary.html | CC0 [V] | Standard (60-70%) and Pro (extra 30-40%) free per earlier notes; Source via Patreon: Silver $10/mo (15 credits), Gold $20 (30), Diamond $50 (75) [V]; per-tier prices are images only | none | yes [V] | yes | yes | not listed [X] | 120+ clips: 8-dir locomotion, jog, sprint, push, crawl, swim, sit, death, combat, gun, emotes. No skating, hockey or stick clips [V]. FBX, GLB, Blend [V] | Low: page says universal rig, tested in Unreal [V]. Bone names not on page [X]. UAL 2 exists [M] | USE (falls, get-ups, celebrations, idles, hit reactions) |
| Quaternius Universal Base Characters (what we ship) | https://quaternius.com/ | CC0 [V] (models/LICENSE_Quaternius_CC0.txt) | free Standard subset; Source version paid, includes Unreal project with shaders [V] | none | yes | yes | yes | models/Superhero_Male_FullBody: gltf 33 KB, bin 720 KB, about 3 MB textures [V] | Bones read from our gltf [V]: root, pelvis, spine_01..03, neck_01, Head, clavicle/upperarm/lowerarm/hand_l/_r, 5 finger chains x4 incl. leaf, thigh/calf/foot/ball_l/_r (+ball_leaf) | Low | USE as base body |
| Epic Game Animation Sample Project | https://www.unrealengine.com/blog/game-animation-sample | Epic content license: commercial UE projects OK, retarget freely, UE-only [V via CG Channel / Epic notes] | Free | not required [M] | yes, with Unreal only [V] | NO outside UE; do not commit to public repo | yes | multi-GB [M] | 500+ locomotion/traversal clips with Motion Matching on Manny/Quinn [V]. No hockey | Medium (Epic skeleton already) | USE for locomotion, learning Motion Matching |
| Manny / Quinn (UE5 mannequins) | Third Person template, Lyra, GASP | Epic content license; no clear official statement on shipping the mannequin mesh found [V ambiguity] | Free | n/a | yes in UE games (forum answers inconclusive) | UE only | yes | small | Retarget target and greybox | none | USE as target; ship our own mesh |
| Lyra Starter Game | Epic Launcher | Epic content license, UE-only [M] | Free | none | yes | UE only | yes | large [M] | Gameplay framework, modular anim layers reference | n/a | STUDY |
| Mixamo | https://www.mixamo.com | Adobe: royalty-free commercial use incl. games, no attribution; may not distribute raw character/animation files as the product, in game templates/blueprints/asset packs/DLC; no ML training; sharing within team OK [V via Adobe community FAQ post (2022, tech-preview era). helpx FAQ returned 403, so current text UNVERIFIED] | Free (Adobe ID) | none | yes (embedded in game) | NO raw files | edit for own use [M] | 1-20 MB per FBX [M] | Big generic library, no skating/hockey [M]. Auto-rigger for own humanoid mesh | Medium: mixamorig:Hips, Spine/Spine1/Spine2 maps cleanly; scale fix | USE only as gap filler, keep out of repo |
| Hockey Player Animated (Marketplace/Fab) | https://www.unrealengine.com/marketplace/en-US/product/hockey-player-animated | Marketplace/Fab Standard [M]; page 403 | $19.99 [V search snippet] | no [M] | yes [M] | no raw redistribution [M] | in project | [X] | 14 anims: idle, multi-direction skating, shooting; scaled to Epic skeleton [V snippet]. Quality unseen | Low (Epic skeleton to our mesh via Retargeter) | BUY first, after watching preview |
| Hockey Goalie Animated | https://unrealengine.com/marketplace/en-US/product/hockey-goalie-animated | same | $19.99 [V snippet] | | | | | [X] | 18 anims incl. butterfly, glove saves, skating [V snippet] | Low | BUY with player pack |
| Hockey set 1 | https://www.unrealengine.com/marketplace/en-US/product/hockey-set-1 | [X] | [X] | | | | | | listed in results, contents not fetched | | CHECK listing |
| Flipped Normals Ice Hockey (160 anims) | see docs/research/03 | paid | not verified | | | | | | from earlier research [M] | | OPTIONAL if $20 packs are thin |
| Fab free animation packs | https://www.fab.com/listings/8de31c5d-93bc-4bd4-9606-ca789ce91b99 , .../9e93d929-36e8-45f9-b925-325db1b9385d | Fab Standard | free | no | yes | UE only | yes | | generic, not hockey (titles only) | Low | skip unless gap |

### Public mocap libraries

| Library | License | Skating / hockey / stick? | Verdict |
|---|---|---|---|
| CMU Mocap | Free, may be included in commercial products, may not resell the data [V via Kaggle summary; Kaggle tags CC BY-ND which conflicts, original terms not fetched, so UNVERIFIED] | general plus some sports [M]; no skating or hockey known | low value, old BVH skeleton; skip |
| AMASS | Non-commercial research/education/artistic only; no commercial training; commercial via MPI (ps-license@tue.mpg.de) [V] | none known [M] | REJECT |
| FS-Jump3D | CC BY-NC-SA 4.0 [V] | figure skating jumps | REJECT (non-commercial, share-alike) |
| Rokoko free sports mocap | unverified [X] | unknown | verify before use |
| SFU, Bandai Namco, Truebones | not checked this session [X]. From memory: Bandai Namco dataset CC BY-NC [M], Truebones custom terms [M], SFU academic [M] | none known [M] | verify individually; assume no hockey |
| HockeyOrient, HockeyAI datasets | open licenses on Hugging Face [V] | video labels, not skeletal mocap | not usable for animation |

## 3. Character tools

| Tool | License | Notes | Verdict |
|---|---|---|---|
| Blender | GPL tool; exported art is yours [M] | glTF/FBX cleanup, rig edits, baking | USE |
| MakeHuman / MPFB | base mesh and targets CC0 [M]; some clothes CC-BY [M] | UE-compatible rig exports [M]; alternative body | optional |
| Quaternius Universal Base Characters | CC0 [V] | see section 2 | USE |
| Mixamo auto-rigger | see Mixamo | humanoid only | optional |
| MetaHuman | Epic license, UE-only [M] | too heavy for a full ice, not hockey | reject |

## 4. Hockey equipment, arenas, crowd, rink

Free equipment search was thin and unverified. Nothing below is confirmed CC0/CC-BY unless stated; open each page and read the license field before downloading, and record CC-BY authors.

| Item | Source | License | Verdict |
|---|---|---|---|
| Hockey Stick | BlendSwap https://blendswap.com/3d/hockey | CC0 per snippet [V snippet, page not opened] | candidate; a stick is 20 min in Blender anyway |
| Hockey Goalie Mask | same page | CC-BY per snippet [V snippet] | candidate, attribution required |
| Olidal Sketchfab collection, 212 models | https://sketchfab.com/Olidal/collections/hockey-8088ba814d4348499e53a5a6541fa9ea | per model [X], not shown | go model by model, filter Downloadable + CC0/CC-BY. Names seen: Hockey Player Glove (StudioNG2), HD Hockey Player Helmet (StudioNG2), Hockey Skate (HKY), Instrike Hockey Pants (Guvenbulan), Hockey Net (StudioNG2), Stylized Hockey Stick (3DGameObjects). Expect decimation and re-skinning |
| Poly Pizza, OpenGameArt, Kenney, Quaternius hockey gear | nothing hockey-specific surfaced [V negative for the combined query only] | | not found |
| International Arena, Ice Hockey Environment (Fab, AnnaStakhiv) | https://www.fab.com/listings/b0bf34d1-3f2d-41dd-8b46-07ae8dbce393 | license type not shown on page [V]; Fab Standard assumed | $249.99 [V]. UE 5.5, 250+ meshes, 138 textures up to 4K, 27 materials, 8 BPs, crowd tool (5 fans, 5 activity phases), LED board toolkit, Nanite/Lumen/MegaLights [V]. Cinematic-weight. Consider only for the crowd and LED tools |
| Ice Hockey Arena Stadium (olegwer) | https://forums.unrealengine.com/t/2475183 | price/license [X] | UE 5.3.2, ice reflections, skate marks, glass, LED boards, markings [V snippet]; check price |
| Unity Ice Hockey Arena | Unity Asset Store | Unity only | not usable |
| Ice material, skate marks | no pack found [V negative] | | build ourselves: Lit material, low roughness, Lumen reflections, Runtime Virtual Texture or Niagara ribbons/decals for scratches (about 1-2 days) |
| Crowd | Fab crowd kits exist; free ones unverified [X] | | start with instanced low-poly or card crowd |
| Scoreboard | none found [X] | | author in UMG or render target |

## 5. Fab licensing facts [V from forum summaries; the EULA itself not read]
- Personal and Professional are pricing tiers of one Fab Standard License with the same usage rules; Personal applies under $100,000 gross revenue in the last 12 months. Free Fab assets carry the same terms as paid ones (Quixel staff). A third tier, Personal Reference Only, gives no source.
- A forum user says publishing project source containing Fab assets is not clearly covered. Treat as NOT redistributable; keep out of the repo.

## 6. Skeletons and retargeting

| Rig | Bone naming | Spine | Notes |
|---|---|---|---|
| Quaternius Universal (ours) [V] | pelvis, spine_01..03, neck_01, Head (capital), clavicle_l, upperarm_l, lowerarm_l, hand_l, thigh_l, calf_l, foot_l, ball_l, fingers, root, leaf bones | 3 | near UE4 mannequin naming; no twist bones [M] |
| UE5 Manny/Quinn [M] | pelvis, spine_01..05, neck_01..02, head, clavicle_l, upperarm_l, ... plus twist/corrective bones and IK bones (ik_foot_root etc.) | 5 | UE4 mannequin had 3 spine |
| Mixamo [M] | mixamorig:Hips, Spine, Spine1, Spine2, Neck, Head, LeftArm, LeftForeArm, LeftUpLeg, LeftLeg, LeftFoot, LeftToeBase | 3 | no root; cm scale fix |
| Paid hockey packs | Manny skeleton [V snippet "Scaled To Epic Skeleton"] | 5 | retarget Manny to our mesh |

Workflow (general UE5 knowledge, UE 5.8 UI not checked):
1. Import skeletal mesh (FBX preferred, see section 8). Create an IK Rig per skeleton (IK_Mannequin ships for Manny). Retarget root = pelvis. Chains: spine, neck/head, arms, legs, fingers, root.
2. Create IK Retargeter, source Manny, target ours. Fix the target retarget pose (A vs T pose). Check scale (gltf is metres, UE cm).
3. Enable foot IK goals in the retargeter to remove foot slide.
4. Batch export retargeted animations to our skeleton.

Root motion: for a networked sim where the movement component owns position, use in-place locomotion driven by speed (Blend Space by speed and direction) and avoid root motion. Root motion only for authored one-shots (celebrations, hits) if wanted.

Blending: Animation Blueprint, Blend Space 2D, Layered Blend per Bone (upper body shoot/pass over lower body skate), Linked Anim Layers, Pose Cache for goalie. Motion Matching (Pose Search) needs a mocap database; we have no skating data, so it only applies if we buy one.

Hand and stick IK: stick as socket on hand_r; second hand via Two Bone IK or Control Rig to a shaft socket; blade orientation from shot direction in code. This ports directly from anim_rig.js (two-bone arm IK).

Foot and skate contact: flat ice, so ground trace only for height (constant). Lean and edge from lateral acceleration, stride phase from speed. Crossovers and pivots need clips (the $20 pack has multi-direction skating) or procedural legs.

Procedural stick positioning: port existing JS logic into Control Rig rather than clips.

## 7. Can our own LIHL models be improved and reused?

Repo facts [V]: Quaternius skeleton (65 bones per docs/research/03), vertex-colored materials (MeshStandardMaterial vertexColors), merged cloth mesh with second UV set (uvJ) for the jersey atlas, procedurally built gear meshes in JS (skater3d.js). About 24k triangles per skater is from the brief, not recounted.
- Reuse: yes. The body is CC0, skin weights carry over, names match UE4-style. Procedural gear must be baked: export merged skinned mesh with three GLTFExporter, then in Blender split into body, jersey, pants, socks, gloves, helmet, skates.
- Improvements by value: (1) real UV-unwrapped gear in separate material slots, replacing vertex colors; (2) LODs at about 24k, 8k, 2.5k; (3) twist bones only if arm bending looks bad; (4) baked AO map; (5) normal maps for pads and helmet.
- Jersey and logo pipeline in UE. Approach A (recommended): render the existing jerseys.js atlas (512 or 1024 px; torso 0-192, sleeve 192-288, pants 288-400, socks 400-512 rows) offline to PNGs, import as textures, one Material Instance per team via a Data Table; uvJ becomes UV channel 1. Approach B: runtime Render Target per team (mirrors JT.cache, no per-player cost). Numbers and names: a texture array or atlas of digits sampled by UV rect with per-player Dynamic Material Instance scalar parameters, or a second material slot decal. Logos: SVG to PNG into the crest region. data/jerseys_store.json exports to a Data Table CSV.

## 8. Converting the current Quaternius glTF to UE
- UE 5.x imports glTF through Interchange [M]; skeletal glTF support is historically weaker than FBX [M]. Recommended: Blender import glTF, export FBX (scale 100, no leaf bones, apply modifiers), import FBX.
- Expected problems: leaf bones (index_04_leaf_l, ball_leaf_l) clutter; Head vs head casing; metres vs cm; vertex-color materials do not become UE materials (bake or use a Vertex Color node); second UV set; Y-up/Z-up and handedness (check mirroring); root bone orientation; PBR materials need rebuilding; 3 spine bones vs 5 on Manny.
- Quaternius Source tier ($10-$50 Patreon, credits) includes a ready UE project with shaders [V]; likely fastest for the body. Per-pack prices are in images only [V].

## 9. Shopping list (ranked by value)

| # | Item | Cost | Why |
|---|---|---|---|
| 1 | Quaternius UAL Standard + Pro, Base Characters | $0 | falls, get-ups, celebrations, idles; retargetable |
| 2 | Epic Game Animation Sample + Third Person template | $0 | Manny skeleton, locomotion, Motion Matching study |
| 3 | Hockey Player Animated | $19.99 | only dedicated skating/shot clips found; preview first |
| 4 | Hockey Goalie Animated | $19.99 | save clips unavailable free |
| 5 | Own LIHL skater cleanup in Blender | $0 (time) | hockey look already exists |
| 6 | Blender, optional MPFB | $0 | tooling |
| 7 | Ice material and skate-mark system | $0 (1-2 days) | no pack exists |
| 8 | Open-license gear props (stick CC0, goalie mask CC-BY, Sketchfab picks) | $0 | verify each, keep attribution list |
| 9 | Quaternius Source tier, one month Silver | $10 | UE-ready project, optional |
| 10 | International Arena Ice Hockey Environment | $249.99 | rink shell, crowd tool, LED boards, only if wanted |
| 11 | Flipped Normals Ice Hockey animations | unverified | if the $20 packs are thin |

Free path: $0 (skating and goalie via procedural IK and UAL only, more engineering time).
Mixed path: about $40, or about $50 with the Patreon month.
Paid path: about $40 + $250 arena + optional bigger anim pack = roughly $300-$450 (estimate [M]).

## 10. To verify before spending money
1. Open both hockey animation pack pages in a browser (fetch returned 403): skeleton, clip list, UE 5.8 support, license, whether a mesh is included.
2. Read Adobe's current Mixamo FAQ (helpx, 403 here) and the Fab EULA.
3. Check each Sketchfab/BlendSwap gear license field.
4. UE 5.8 specifics (Interchange glTF behaviour, Retargeter UI) were not checked.
5. Whether the Manny/Quinn mesh may be shipped is unclear; plan to ship our own LIHL mesh.
