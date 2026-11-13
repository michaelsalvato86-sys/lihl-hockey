# LIHL UE5 Animation Research (Mega Pass 10, Agent A)

Date: 2026-11-13. Branch p10-anim. Status: RESEARCH ONLY. Nothing here was built, installed, downloaded or run. Unreal Engine is not installed on this PC. Every claim carries a source link; claims marked [UNVERIFIED] come from background knowledge or a single secondary source and must be checked before anyone plans around them.

Note: LIHL_MEGA_PASS_10_INITIAL_AUDIT.md did not exist in this worktree when I started. I read LIHL_MEGA_PASS_9_REPORT.md, docs/ANIMATION_INVENTORY.md, anim_ctrl.js and anim_rig.js.

## 1. Epic Game Animation Sample Project (GASP) for UE 5.8

Epic's own tech-blog page (https://www.unrealengine.com/tech-blog/download-the-latest-game-animation-sample-project-now-updated-for-ue-5-8) returned HTTP 403 to my fetch tool, so I could not read the primary text. What follows is from two secondary write-ups that agree with each other and with Epic's X post summary (https://x.com/UnrealEngine/status/2087541168108384350, seen only as a search snippet):

- https://www.projprod.com/post/game-animation-sample-project-unreal-engine-5-8 (article dated "Aug 12", no year given)
- https://www.therookies.co/blog/headlines/unreal-engines-game-animation-sample-project (published 2026-08-24)

Reported UE 5.8 GASP contents:

| Feature | What it is | Status flag |
|---|---|---|
| Physics Control Component + Physics Control Asset | Drives a physics asset with linear and angular motors, per-body state profiles | "Experimental" (projprod) |
| SandboxCharacter_Mover_Ragdoll pawn | Powered ragdoll for falls, injuries, rolling; recovers with motion-matched get-up animations that blend out of the physics pose | Sample content |
| Pose Search Interaction Assets, "Motion Match Multi" | Motion matching across several skeletal meshes at once with motion warping to keep contact points aligned; demoed as shoves, tackles, takedowns from any angle | Not stated; Epic reportedly says the interaction demo is not a full interaction system |
| Additive Look-At solver (Control Rig) | Layers over existing animation, per-body-part control, test level included | "Experimental" |
| Mover pawn blendstack rework | Chooser with a revamped Pose Match Column selecting among several Pose Search Databases; new slope animations with Blend Spaces | Mover itself is Experimental, see section 2 |
| Smart Objects + State Tree | Bench sitting | Single-source claim |
| RagdollLevel | Obstacle course for testing ragdoll auto-roll | Sample content |

Not verified for 5.8: exact UE 5.8 release date, exact animation count and mocap hours, the license (neither article states it; distribution is free via Fab, listing terms not read), hardware requirements.

Baseline GASP facts from Epic docs (https://dev.epicgames.com/documentation/en-us/unreal-engine/game-animation-sample-project-in-unreal-engine; the page is for UE 5.9 and does not mention 5.8): Motion Matching third-person locomotion with capsule-driven movement, traversal (ledges, vault, climb), Choosers that filter Pose Search Databases by context, Orientation Warping, Leg IK, an experimental Offset Root Bone node, aim offset, additive lean, import of your own characters and MetaHumans, IK Rig and IK Retargeter. No clip count or hours are given. A video title claims "over 500 FREE animations" (https://www.youtube.com/watch?v=TUSkvkmI5Ws, title only, refers to an earlier version, not verified). Epic's 5.7 GASP blog (https://www.unrealengine.com/tech-blog/explore-the-updates-to-the-game-animation-sample-project-in-ue-5-7) also returned 403; a search summary says it added Mover movement modes and calls Mover experimental.

Observation: Epic docs pages now say UE 5.9, so 5.8 is no longer the newest engine. Re-check the version choice.

What GASP does NOT contain: ice skating, hockey stick, skate edges, or hockey contact. It is land locomotion, climbing, ragdoll and shove/tackle interactions. It is the best free reference architecture, not a skating asset.

## 2. Technologies, as documented

From Epic's Motion Matching doc (https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine, UE 5.9 page; I did not diff against 5.8).

**Motion Matching / Pose Search** (plugin "Pose Search"). Each frame the node searches a Pose Search Database for the clip frame that best matches the query, then blends in via the blend stack.
- Schema channels: Trajectory (past and future sample offsets, flags, weights, fed by the Character Trajectory component), Pose, Position, Velocity, Heading, Phase, Group, plus debug and padding channels. Experimental: Crashing Legs, Permutation Time.
- Database authoring: create a schema, add Animation Sequences, Composites or Blendspaces (Montages are not supported by the AnimBP node), set per-asset extrapolation and looping cost bias, optional Normalization Sets, tags as metadata. Locomotion clips must contain root motion.
- Search modes: Brute Force (default) and PCAKDTree are production-usable; VPTree is experimental.
- Cost: sum of weighted channel costs, auto-normalized unless the preprocessor is None; continuing-pose and looping biases tune stickiness. The doc warns that weights cannot fix a mismatch between gameplay speed and clip speed.
- Experimental (not for production per the doc): VPTree, Crashing Legs, Permutation Time, Motion Matched Stitching, montage playback via the Character Blueprint function.

**Mover vs Character Movement Component.** Mover is Experimental in 5.7 per Epic's blog (search summary) and listed as v1.0 Experimental for 5.8 by the third-party tracker https://unrealdirective.com/resources/engine-plugins/mover/ . Blueprint custom movement modes are said to be possible (5.7 GASP blog, summary only). A claim that Epic warns APIs may change is a secondary quote [UNVERIFIED]. For a custom skating model: (a) CMC with a custom movement mode in C++ (low friction, ice acceleration, edge-limited turning), or (b) a Mover custom mode (Epic's direction, but experimental). Our sim is already server-authoritative in JS, so a UE client would most likely drive characters from sim state; the movement component then matters mostly for root-motion plumbing and trajectory input.

**Other tech, background knowledge, [UNVERIFIED] against 5.8 docs (pages not fetched):** Animation Blueprints (state machines, layered blend per bone, additive slots, Linked Anim Layers); Control Rig (procedural rigs, runtime IK, Full Body IK solver, also hosts the Additive Look-At solver above); IK Rig and IK Retargeter (retarget clips between skeletons, used by GASP per the docs page); Chaos ragdoll via Physics Assets and now Physics Control; Orientation Warping, Stride Warping and Leg IK nodes; Motion Warping.

## 3. Hockey requirements: why generic locomotion is not sufficient

Missing from GASP, Mannequin sets and Mixamo-type libraries:
1. Skating gait: push-and-glide strides with long glide phases, inside/outside edges, lean into turns, foot speed not matching ground speed. Walk and run databases assume planted feet, which fights Leg IK and Stride Warping on ice.
2. Backward skating, forward and backward crossovers, tight turns with lean, Mohawk turns, C-cuts, forward/backward transitions, short-push starts, glide decelerations.
3. Hockey stops (two-foot plow with spray), one-foot stops, stop-and-start sequences.
4. Two-hand stick carry in every gait, stick on ice, stick lift transitions, puck handling (toe drag, deke, protect).
5. Shots (wrist, snap, slap, backhand, one-timer), passes (saucer, backhand, drop), receptions, with wind-up and follow-through while moving.
6. Contact: body checks, board hits, victim reactions, falls, slides, get-ups on ice.
7. Goalie: butterfly, RVH post integration, shuffles and T-pushes, pad/glove/blocker saves, recovery. Goalie motion is mostly pose-driven, not gait-driven.

Motion Matching needs coverage of every speed, heading change and gait the player can produce; per Epic's doc, weights cannot fix speed mismatch, so a skating database must be captured at the speeds our sim reaches.

## 4. Resources found (hockey or skating)

Searched Fab, the legacy Marketplace and general web. No hockey mocap library of any size was found. Prices as displayed on listing pages on 2026-11-13, tax excluded:

| Resource | What | Price | Mocap? | License | Notes |
|---|---|---|---|---|---|
| Hockey Goalie Animated, https://www.fab.com/listings/c203c3a3-7cb4-43b7-95d1-d13cae8881f7 | 18 clips: butterfly, down-left/right, glove, blocker, trapper saves, idle, skating FWD/BWD/L/R each with start, loop, stop | $19.99 | No, "crafted (no motion capture)" | Listing shows no terms; Fab standard terms likely [UNVERIFIED] | 3ds Max Biped on Epic skeleton; low clip count |
| Hockey Player Animated (Unity build), https://www.fab.com/listings/bd016510-f222-4f6a-aa27-9145b6f177ca | 14 clips: idle, shooting, skating FWD/BWD/L/R with start and stop | $59.99 | No, hand-crafted | No terms shown | This is the UNITY listing; the UE Marketplace twin https://www.unrealengine.com/marketplace/en-US/product/hockey-player-animated returned 403, price and contents [UNVERIFIED] |
| Roller Bladers Animations, https://www.fab.com/listings/6f2824d6-3ea8-453b-9492-bd73e319c391 | 135 roller-skating clips, UE and Unity | $9.99 | Not stated | No terms shown | Closest to a gliding gait; roller not ice; no stick; quality unseen |
| Movement and Mobility 25, https://www.fab.com/listings/4df2e9bd-7b21-44ea-84e0-1de88747ed18 | 25 mocap general locomotion, root motion and in-place | not read | Yes | not read | Not skating; useful only as a Motion Matching data-format reference |
| Rokoko 12 free sports animations, https://www.rokoko.com/resources/rokoko-mocap-12-free-sports-animations | Generic sports mocap, FBX | free | Yes | not read | Hockey content not confirmed |
| Animium skate spin, https://animium.com/2014/10/skate-spin-mocap | one skating spin | not read | Yes | not read | Figure-skating style, marginal |
| FS-Jump3D, https://github.com/ryota-skating/FS-Jump3D | Figure skating jump mocap, C3D + JSON | free | Markerless | check repo [UNVERIFIED] | Jumps only, wrong sport |
| Hockey biomechanics papers: https://www.diva-portal.org/smash/get/diva2:1414910/FULLTEXT01.pdf (on-ice shooting mocap), https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9790001/ (wearable skating metrics) | Measured data in papers | free | Lab data | Raw files not public as far as found | Reference for stride rate, lean, joint angles; not clips |

Honest summary: purchasable hockey animation is a few dozen hand-keyed clips with no stick variety, no checking and no mocap. Motion Matching on that is not viable (too few clips). Real hockey mocap would be commissioned.

## 5. Stick IK, grip, skate and ice contact

These are design approaches using documented Epic features; none were tested.
- Stick as a socket-attached or separate mesh. Bottom-hand and top-hand grip targets act as IK goals; Control Rig two-bone IK or the Full Body IK solver places both hands on the shaft. Stick pose comes from gameplay (carry angle, shot phase) and the hands follow. This is how our anim_rig.js already works (two-bone arm IK plus a free stick), so the concept transfers directly.
- IK Rig with hand goals keeps the grip while body animation plays.
- Foot IK on ice: the surface is flat so ground alignment is trivial; the hard part is that sliding is intentional. Do not use planted-foot locking from Leg IK while gliding; lock only during stops (blades dug in). Orientation Warping can rotate the pelvis toward travel direction while feet follow the blade direction, which is the useful part for edges.
- Blade spray: a small Niagara effect driven by stop and edge values [UNVERIFIED, untested].

## 6. Production approaches (estimates are mine, not quotes)

A. Commissioned hockey mocap plus Motion Matching. Epic gives no hour count for a database [UNVERIFIED]. My estimate for a skater: 1 to 3 hours of cleaned, rooted data covering speeds, turn radii, directions, crossovers, stops and starts, with and without puck and stick. Cost range roughly US$10k to $60k including skater, capture on a rink or synthetic ice, cleanup and retargeting, plus 2 to 4 months of a technical animator for schema and cost tuning. [UNVERIFIED, no vendor quote obtained.]

B. Purchased packs plus own keyframing. Buy Hockey Goalie Animated ($19.99) and Roller Bladers ($9.99) as references and a base, then hand-author 40 to 80 key clips (starts, stops, crossovers, shots, checks, falls, get-ups, goalie saves). Estimate: 1 to 3 days per polished cyclic locomotion clip and 0.5 to 1 day per one-off, so about 60 clips is 2 to 4 months for one animator [UNVERIFIED]. Quality ceiling below mocap but fully controllable.

C. No mocap: procedural plus a few authored clips. Blend spaces for speed and direction, Control Rig for lean, pelvis drop, edge roll and stick/hand IK, Additive Look-At for head tracking, a few authored clips for stops, shots and checks, ragdoll from the 5.8 sample for falls. This most resembles what LIHL already has.

## 7. Comparison with our current procedural system

Today (anim_ctrl.js 434 lines, anim_rig.js 159, anim_events.js, anim_goalie.js, anim_hits.js, anim_celebrate.js; docs/ANIMATION_INVENTORY.md): a three.js procedural skeleton with a skate pose generator (lean, acceleration, backward, crossover, stop state), planted-foot soft hold, two-bone arm IK with a free stick, 31 sim events mapped to 116 listed variants with priority and interruption rules, a 946-case harness and 52 distinct states seen live. Known limits from LIHL_MEGA_PASS_9_REPORT.md: backward skating still reads as a low squat on some frames; between-the-legs deke and skate kick approximate; most variants never judged by eye; no playtest.

| Aspect | Current LIHL | UE5 Motion Matching | UE5 procedural |
|---|---|---|---|
| Natural weight and secondary motion | Hand-tuned formulas, can read mechanical | Best, comes from mocap | Moderate |
| Transitions | Smoothed state values plus event admit rules | Automatic via blend stack and cost | Blend space plus AnimBP |
| Input responsiveness | Immediate | Good with trajectory, some clip-commit latency | Immediate |
| Data need | None | Hours of skating mocap (not purchasable) | A few clips |
| Edge cases (stops, falls) | Formula-authored; per-frame joint jump cut from 83 to 9-11 degrees | Needs coverage clips; ragdoll sample exists in 5.8 | Needs authored clips |
| Cost and risk | Built, works in browser and on phones | High: engine port, pipeline, content | Medium |
| Runs in browser / phone | Yes | No (native or pixel streaming) | No |

Everything about UE is Researched (read about); nothing was tested and no UE feel was judged.

## 8. Recommendation

Minimum animation stack for a convincing UE5 hockey skater (a design proposal, not validated):
1. Epic Mannequin-style skeleton; IK Retargeter to receive purchased or commissioned clips.
2. Locomotion: Motion Matching ONLY if skating mocap is commissioned (about 1 to 3 hours, 6A). Otherwise speed-by-direction blend spaces with start, loop, stop clips (the Hockey Goalie pack shows this structure).
3. Control Rig layer: lean and pelvis roll from sim turn rate, knee flexion, torso pitch on acceleration, two-hand stick IK (two-bone or FBIK), Additive Look-At for head.
4. Authored one-shots (montage or state machine): hockey stop, shots, passes, receptions, check, victim hit, falls, get-ups, face-off.
5. Ragdoll for hard falls via the 5.8 Physics Control sample and motion-matched get-up, only if the Experimental flag is acceptable.
6. Goalie as a separate pose-driven state machine plus Control Rig for glove and blocker reach.
7. Movement: drive pawns from the existing authoritative sim; custom CMC mode only if client prediction is needed.

Risks:
- No hockey mocap exists to buy; Motion Matching quality depends on commissioned data and a skilled technical animator. Biggest cost and schedule risk.
- Mover and several 5.8 sample features (Physics Control, Additive Look-At) are Experimental, and the Motion Matching doc lists experimental sub-features; APIs may change.
- Epic's primary 5.8 page was unreadable (403); GASP license and clip counts are unverified.
- Engine version drift: Epic docs already show 5.9.
- A UE5 port abandons the browser and phone delivery model that current tests and multiplayer parity assume; animation is only part of that decision.
- Skating feel (glide, edge) is where generic motion matching is weakest, so expect a procedural lean and foot layer on top regardless.
- Cost and time numbers in section 6 are planning estimates, not quotes.
