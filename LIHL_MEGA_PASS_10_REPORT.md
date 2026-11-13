# LIHL Mega Pass 10 report (2026-11-13)

Branch mega-pass-10 (from mega-pass-9, HEAD 3092e52). Research and preparation pass; no gameplay code, hosting, DNS or production files changed.

## Status by item (research / downloaded / imported / implemented / compiled / executed / viewed / performance tested)
| Item | Researched | Downloaded | Imported | Implemented | Compiled | Executed | Viewed | Perf tested |
|---|---|---|---|---|---|---|---|---|
| UE5 animation research (LIHL_UE5_ANIMATION_RESEARCH.md, 8e25a31) | yes | no | no | no | no | no | n/a | n/a |
| Open source sports research (LIHL_OPEN_SOURCE_SPORTS_RESEARCH.md, 1f6261f) | yes (metadata and READMEs, not source) | no | no | no | no | no | n/a | n/a |
| Asset research (LIHL_UE5_ASSET_RESEARCH.md, 45ae965) | yes | no | no | no | no | no | n/a | n/a |
| Graphics research (LIHL_UE5_GRAPHICS_RESEARCH.md, d527b38) | yes; frame times are estimates | no | no | no | no | no | n/a | no |
| Architecture comparison (LIHL_ENGINE_ARCHITECTURE_COMPARISON.md, fec9f87) | yes; prices third-party | no | no | no | no | no | n/a | n/a |
| Data export to Unreal DataTables (tools/export_unreal_data.py, d6751ad) | n/a | no | n/a | YES | n/a (Python) | YES, about 90 checks, 0 failures | CSV and schema read | n/a |
| UE5 C++ scaffold (unreal/LIHL_UE5_HOCKEY_POC, fdffede) | n/a | no | n/a | written | NO | NO | no | no |
| Setup requirements and baseline capture (b7963df) | yes | no | n/a | yes | n/a | capture ran (software GL) | 5 baseline frames viewed | no |
| Unreal prototype (playable rink, skater, puck, goalie) | n/a | no | no | NOT BUILT | NO | NO | NO | NO |

Why the prototype was not built: Unreal Engine 5.x and Visual Studio are not installed (checked read-only). Installing needs your Epic account sign-in and a roughly 40 GB or larger download plus VS build tools; I did not install anything. Everything about Unreal gameplay, animation, graphics and performance in this pass is research or estimate, not a measurement.

## What the research found (short)
- No hockey mocap, free hockey rigs or rink kits exist; no open source hockey game exists in Unreal or any engine with real skater physics. Skating, stick IK and the stride cycle must be authored (about 10k to 60k USD and 2 to 4 months commissioned, or hand-keyed packs plus procedural, planning estimates).
- Unreal would clearly win on lighting, shadows, ice reflections and arena atmosphere; frame time estimates on the RX 6900 XT are close to our current high tier at 1080p (estimates).
- Unreal 5.8 released June 2026 per secondary sources (Epic pages were unreadable); Mover and Physics Control are still experimental, Chaos Networked Physics and the replay system need trials.
- The current JS simulation has 41 unseeded random calls, so a C++ port could only be statistically equivalent; keep a single simulation.
- Pixel Streaming costs about 0.81 to 1.41 USD per stream-hour: about 730 to 1,270 USD per month for 10 peak players, 3,640 to 6,350 for 50, 14,500 to 25,400 for 200. The 1 GB Oracle micro cannot host Unreal rendering.
- License flag found: the 472 announcer clips were made on ElevenLabs' free plan; its terms may require attribution or forbid commercial use (unverified). Read the current terms or buy a paid plan before treating the game as commercial.

## Scores (1 to 10; "evidence" says how much of the score is measured)
| Criterion | Three.js game now | Unreal (projected) | Evidence |
|---|---|---|---|
| Visual quality | 5 | 9 | now: seen frames; Unreal: research only |
| Character animation | 5 | 7 with bought hockey packs plus our own authoring, 5 without | no mocap exists to buy |
| Skating | 6 | 7 (custom Mover mode, experimental) | now: tests plus harness, no human play |
| Physics | 7 | 8 | Unreal projected |
| AI | 6 | 3 (nothing exists; must be ported or bridged) | repo and research |
| Multiplayer | 8 (server-authoritative, 16/16 parity test) | 6 as a client of our server, 5 with Unreal netcode | now: tested; Unreal: research |
| Performance | 7 on desktop (8 ms high tier, phone unmeasured) | 7 on the 6900 XT (estimate) | estimates |
| Browser accessibility | 10 | 2 (Pixel Streaming only) | |
| Native platform support | 4 | 9 | |
| Development complexity (10 = easy) | 7 | 3 | |
| Hosting cost (10 = cheapest) | 10 (0 USD) | 7 native with a small server, 2 for Pixel Streaming | architecture doc prices |
| Long-term potential | 5 | 8 | judgment |

## Blunt answers
1. Can Unreal deliver a meaningfully better LIHL experience? On visuals, almost certainly yes. On animation and skating feel, only if we pay for or author hockey animation; Unreal does not solve that by itself. It is not proven by this pass because no prototype was built.
2. How much of our game can be reused? Data, team and jersey content, rink dimensions, rating and attribute math, the event schema and the server and protocol (as a bridge) transfer well; the sim itself is JS with unseeded randomness, so keep it rather than port it.
3. Move the whole game to Unreal? No. A full rewrite is about 18 to 30 person-months (estimate) and would discard the balanced, tested simulation and phone reach.
4. Keep the browser game and build Unreal separately? Yes: keep the browser game as the main product and treat Unreal as an optional rendering client.
5. Share data and simulation services? Yes, through the existing server and a frozen versioned protocol (export tool and schema are built and tested).
6. What would a full migration require? 18 to 30 person-months (estimate), mocap or paid animation, C++ skills, Windows/Android/iOS pipelines, and new hosting for Unreal servers; see LIHL_ENGINE_ARCHITECTURE_COMPARISON.md.
7. Best next step: (a) with your authorization, install Unreal Engine 5.8 and Visual Studio on D: following docs/UE5_SETUP_REQUIREMENTS.md; (b) compile the scaffold and run the 1 to 2 day measurement spike (empty arena, 12 skaters, 3,000 instanced spectators; 1080p and 1440p) to replace the estimates; (c) meanwhile freeze a versioned client protocol, add a seeded RNG option to the sim and upgrade three.js (a 2021 build) behind a flag; (d) decide on a 6 to 10 week Unreal rendering-client prototype only after (b).

## Recommendation
Do not migrate. Keep and improve the browser game, run the cheap Unreal measurement spike, and only commit to a 6 to 10 week Unreal client prototype if the spike and a purchased hockey animation pack look good. This recommendation is a judgment from research and estimates, not from a built prototype.

## Not verified / limitations
No Unreal build, no screenshots or video from Unreal, no performance numbers from Unreal, no compile of the scaffold, no comparison of the C++ skate() port against the JS, no physical device. Research could not read several Epic and marketplace pages (HTTP 403), so 5.8 details and marketplace prices are partly secondary.
