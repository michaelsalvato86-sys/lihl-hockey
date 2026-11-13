# LIHL open source sports technology research, Unreal Engine focus (2026-11-13)

Agent B, Mega Pass 10. Extends docs/research/01 to 09 and LIHL_OPEN_SOURCE_RESEARCH_REPORT.md. Items already judged there (wolfrats/hockey, helios-base, librcsc, Yuka, planck.js, AirHockeyWebGL, MastersOfHockey, ZenGM, GMTurbo, open-ice and others) are not re-evaluated. Status: research completed. Library tested: none. Code inspected: none (judged from GitHub API metadata, README pages and Epic docs; no repo was cloned, nothing was copied). Integrated: nothing.

Method: GitHub search API (about 30 queries: hockey, ice hockey, skating, soccer, football, rugby, basketball, roller derby, ski, Unreal sports, motion matching, replay, netcode, RoboCup, Rocket League), then README or LICENSE pages for the shortlisted repos, plus Epic documentation and the Epic forums. The GitHub API returned total_count 0 for several multi-term queries, so coverage of niche repos is partial. "Unverified" means I could not confirm it.

Legal reminder that applies to everything below. A UE5 game ships Epic engine code under the Unreal EULA (5% royalty above the free tier). Epic's EULA is reported to forbid combining engine code with licenses that force the engine under other terms (source: third-party EULA summary, not read in Epic's own text, so unverified, but assume it is true). Practical rule: GPL, LGPL (static or modified), AGPL and CC-BY-NC code or data must NOT go into the UE project. MIT, Apache-2.0, BSD and Unlicense are safe with a notice file. "Study only" means read the idea, write your own code.

## Summary table, sorted by usefulness for a UE5 hockey game

| # | Item | Kind | License | Verdict |
|---|---|---|---|---|
| 1 | Chaos Networked Physics + Network Physics Component (UE 5.7/5.8 engine) | Engine feature | Unreal EULA | Adopt (puck and skaters, server authoritative, client prediction) |
| 2 | Mover plugin (engine, Experimental) | Engine plugin | Unreal EULA | Adapt, prototype first; do not bet the project on it yet |
| 3 | Game Animation Sample Project (GASP) 5.7, Fab | Epic sample, many anims | Free on Fab; exact license text not verified | Adapt (locomotion architecture, motion matching setup); anims are walk/run, not skating |
| 4 | UE Replay System, DemoNetDriver + InMemoryNetworkReplayStreaming | Engine feature | Unreal EULA | Adopt (instant replay, goal replay) |
| 5 | Gameplay Cameras plugin (engine) | Engine plugin | Unreal EULA | Adopt (broadcast camera rigs, state tree director) |
| 6 | PanicPetal/ALS-Community | UE5 C++ locomotion | MIT (LICENSE read) | Study only (CMC based, last push 2024-07, UE 5.4) |
| 7 | BazkieBumpercar/GameplayFootball and fork vi3itor/GameplayFootball | C++ 3D soccer game with AI | Unlicense / Apache-2.0 (assets and engine license unverified) | Study only (best sports AI reference) |
| 8 | google-research/football | C++/Python soccer env | Apache-2.0 (LICENSE read) | Study only (archived 2026-08-19) |
| 9 | ZealanL/RocketSim | C++ fixed tick ball and car sim | MIT (LICENSE read) | Study only |
| 10 | orangeduck/Motion-Matching | C++ learned motion matching | Code MIT; data CC-BY-NC-ND 4.0 | Study only (never use the data) |
| 11 | tranek/GASDocumentation | GAS docs and sample | MIT | Study only (GAS for stamina, check cooldowns, status) |
| 12 | rcssserver (LGPL-3.0), RoboJackets/robocup-software (Apache-2.0), LARG/HFO (MIT) | Sports sim and tactics | as stated | Study only |
| 13 | RLBot/RLBot (MIT), RLGym (Apache-2.0) | Bot API frameworks | MIT / Apache-2.0 | Study only |
| 14 | Mknsri/HockeySlam | C custom engine hockey shootout | MIT (README and API; file not opened) | Study only |
| 15 | 9x25dillon/KoLd__FEEt.ice_skating_ | TypeScript skating physics design | "Other" (unclear) | Study only |
| 16 | Epic Sports Broadcast Motion Design Sample (Fab) | Graphics package | Fab license, not verified | Study only |
| 17 | JLPM22/MotionMatching, KamatMayur/UE5_MotionMatching | Unity / UE5 motion matching | MIT | Study only (superseded by Epic Pose Search) |
| 18 | E1P3/Learned_Motion_Matching_UE5 | UE5 | none | Reject (unlicensed) |
| 19 | UE air hockey student repos | UE4/5 | none | Reject |
| 20 | 3on3NHL-recomp (MIT), wg3d-recomp (GPL-3.0), bardown (GPL-3.0) | Recompiled commercial games | as stated | Reject |

## Five most valuable findings for building hockey in UE5

1. Chaos Networked Physics (5.7 and 5.8) is the first engine feature that fits an authoritative puck: server simulates, autonomous proxy predicts, resimulation corrects. Caveats from Epic forum posts: Resimulation re-runs the whole physics scene, Resim and Predictive Interpolation conflict in 5.7, 5.8 adds a first "bubble resim", and one-shot impulses (shots, passes) land on different physics frames on client and server and can trigger resims. A stick hit is exactly that case, so prototype it early.
2. Mover is Epic's CMC replacement, runs on Network Prediction or Chaos Networked Physics, and has modular movement modes (a skating mode can be a custom mode). It is still Experimental in 5.7 and in the 5.9 docs, with APIs subject to change; Epic says CMC stays supported. Right architecture for edge based skating, but a schedule risk.
3. GASP 5.7 ships a Mover based character plus a motion matching anim blueprint (state machine, Chooser, Blend Stack, Pose Search). Best free, Epic supported reference for the locomotion stack. It has no skating or stick animation.
4. The in-memory replay streamer in DemoNetDriver gives goal replays and instant replays with a rolling in-memory window while live play continues. Documented by Epic and a community write-up (vorixo devtricks "Implementing Instant Replays"). Forum reports show rough edges, so treat as a spike.
5. Gameplay Football (C++ soccer) and RoboCup agent2d/rcssserver are the best real sports AI sources: formations, roles, passing and support logic in readable C++. Reading material only (license and UE EULA constraints), consistent with Pass 6.

## Detailed entries

### 1. Chaos Networked Physics (UE 5.7 / 5.8)
- URLs: https://dev.epicgames.com/documentation/unreal-engine/mover-in-unreal-engine ; https://vorixo.github.io/devtricks/phys-prediction-use/ (community guide for 5.8, updated 2026-09-23); Epic forum thread "Tutorial: Networked Physics - Pawn Tutorial" (MBobbo).
- C++/Blueprint, Unreal Engine. License: Unreal EULA (source available under the EULA, not open source). Activity: Epic internal; behaviour changed between 5.7 and 5.8.
- Capabilities: Physics Prediction project setting, UNetworkPhysicsComponent, physics history capture, replication modes Resimulation and Predictive Interpolation, networked actions with Predicted author style, Iris replication.
- Integration: native, no modification. Needs fixed async physics tick (60 Hz in the guide), Max Supported Latency Prediction setting, per object choice of Resim vs PI (guide advises against making every replicated object Resim).
- Risks: whole world resim cost, impulse timing, 5.7 vs 5.8 differences, no sports ball sample found (only a rolling boulder toy with no grounded checks).
- Commercial: fine under the EULA. Verdict: ADOPT for a spike. Unverified: performance with 10 skaters plus puck.

### 2. Mover plugin
- URL: https://dev.epicgames.com/documentation/unreal-engine/mover-in-unreal-engine ; status page https://unrealdirective.com/resources/engine-plugins/mover/
- Experimental since 5.4 or 5.5 (sources disagree), still Experimental in 5.7 and in the 5.9 docs. Modular movement modes, rollback networking; 5.7 added simple spring walking and smooth walking modes. A forum thread "Chaos Mover" ties it to Networked Physics.
- Integration: native plugin; write a custom Skating movement mode in C++. License: Unreal EULA. Verdict: ADAPT; prototype a skate mode (edge turn radius, grip budget) and compare with a CMC subclass. Unverified: Mover API changes in 5.8.

### 3. Game Animation Sample Project (GASP) 5.7
- URL: Fab listing "Game Animation Sample" by Epic; https://www.unrealengine.com/tech-blog/explore-the-updates-to-the-game-animation-sample-project-in-ue-5-7
- Free to download on Fab. Includes a Mover character and about 400 new animations (one source says about 1,378 total). License text not found; assume Epic Content License or Fab terms, UNVERIFIED. Read the Fab license page before shipping any of its animations.
- Relevance: Pose Search motion matching setup, Chooser tables, blend stack, obstacle avoidance and NPC bump. No skating or stick clips. Verdict: ADAPT the architecture, author our own skating animation set.

### 4. UE Replay System (DemoNetDriver, memory streamer)
- URLs: https://dev.epicgames.com/documentation/unreal-engine/using-the-replay-system-in-unreal-engine ; https://dev.epicgames.com/documentation/en-us/unreal-engine/demonetdriver-and-streamers-in-unreal-engine ; https://vorixo.github.io/devtricks/killcam/
- Mechanism: URL option ReplayStreamerOverride=InMemoryNetworkReplayStreaming, rolling window of configurable length, static levels excluded to save cost, replay viewable while live play continues. Community write-up describes a circular buffer and GetActorForGUID to find the scoring player.
- Third party: CAMongrel/UnrealReplayServer (MIT, 16 stars, 2024-03, UE4 HTTP replay streaming) is minor. AceOfBacons/UE5-ReplaySystemDemo has no license (reject).
- Verdict: ADOPT as spike. Unverified: UE 5.8 behaviour with Iris and Networked Physics (resimulated physics may not replay deterministically). Forum reports are mostly UE4 era.

### 5. Gameplay Cameras plugin
- URL: https://dev.epicgames.com/documentation/unreal-engine/gameplay-camera-system-overview
- Camera rigs and a camera director (Blueprint, Single, or State Tree director), priority queue director. No sports sample found. Use: broadcast follow cam, goal cam, face off cam, switching by game state. License: Unreal EULA. Verdict: ADOPT.

### 6. PanicPetal/ALS-Community
- https://github.com/PanicPetal/ALS-Community ; MIT (LICENSE read; copyright Dogan Can Yanikoglu and LongmireLocomotion). 2,689 stars, last push 2024-07-10, UE 5.4, CMC based, replicated. Commercial use fine with notice. Weak fit: ground locomotion with traversal states, no skating, and Epic is moving to Mover and GASP. Verdict: study only.

### 7. GameplayFootball (BazkieBumpercar, fork vi3itor)
- https://github.com/BazkieBumpercar/GameplayFootball (Unlicense per GitHub, 253 stars, 120 forks, 18 commits, last push 2021-03, discontinued, no support); https://github.com/vi3itor/GameplayFootball (Apache-2.0 per API, 161 stars, last push 2024-01-16).
- C++ on the author's multithreaded engine Blunted2, CMake. Original by Bastiaan Konings Schuiling (also the origin of google-research/football). 3D arcade football with player AI and formations. I did not inspect the source tree (README shows only src and CMakeModules).
- Licensing is murky: the two repos state different licenses; asset and Blunted2 licenses were NOT verified. Verdict: STUDY ONLY for AI structure. A newer fork zocram4cc/GameplayFootball (Apache-2.0, 2 stars, 2026-10, tactics and formations) is unvetted.

### 8. google-research/football
- https://github.com/google-research/football ; Apache-2.0 (LICENSE read); 3,674 stars; archived by owner 2026-08-19 (read only); Python plus C++ engine; README credits Konings Schuiling's open source game; points to research-football.dev as the new server. Built in AI opponent, RL environment. Verdict: study only (idea: scripted bots versus trained policy for AI evaluation).

### 9. ZealanL/RocketSim
- https://github.com/ZealanL/RocketSim ; MIT (LICENSE read, copyright ZealanL 2022); 208 stars; last push 2026-11-03; C++ library simulating Rocket League (ball, car, arena collision) at high step rates. Idea value: fixed tick deterministic arcade ball and arena collision, headless server sim. Not hockey, not Unreal. Verdict: study only. Unverified: whether it needs extracted proprietary game data (assume yes, do not use).

### 10. orangeduck/Motion-Matching
- https://github.com/orangeduck/Motion-Matching ; code MIT; README says the animation data comes from the Ubisoft La Forge dataset under CC-BY-NC-ND 4.0, which forbids commercial use and derivatives (a database or network trained on it is unsafe commercially). 940 stars, last push 2025-02-06. Verdict: study only. Epic's Pose Search covers the use in UE5.

### 11. tranek/GASDocumentation
- https://github.com/tranek/GASDocumentation ; MIT; 5,998 stars; last push 2024-04-06; docs and multiplayer GAS sample for UE5. Useful for stamina, hit stun, cooldowns and check windows as GameplayEffects with prediction keys. GAS itself is an engine plugin (EULA). Verdict: study only.

### 12. RoboCup stack
- https://github.com/rcsoccersim/rcssserver LGPL-3.0, 168 stars, last push 2026-11-05 (helios-base and librcsc already covered in Pass 6). https://github.com/RoboJackets/robocup-software Apache-2.0, 194 stars, 2026-11-12 (Small Size League robots; path planning and play selection). https://github.com/LARG/HFO MIT, 238 stars, last push 2022-08 (half field offense RL env). https://github.com/open-starlab/R2DRL Apache-2.0, 7 stars, 2026-11-10 (unverified quality). LGPL means no copying into the UE project. Verdict: study only; value is formations, roles and play selection structure.

### 13. RLBot and RLGym
- https://github.com/RLBot/RLBot (MIT, 622 stars, 2026-07-08), https://github.com/RLGym/rlgym (Apache-2.0, 255 stars, 2026-05-16). A clean external bot interface and gym style env for a ball sport. Possible later use: train AI opponents against a headless sim. Verdict: study only. Unverified: fitness for non Rocket League games.

### 14. Mknsri/HockeySlam
- https://github.com/Mknsri/HockeySlam ; MIT per README and API (LICENSE file not opened); 54 stars, 5 commits, last push 2023-07-10; C with a hand written engine and physics, Android and Windows; hockey shootout only, no team AI or multiplayer. Verdict: study only (shot and goalie interaction ideas). Not portable to UE.

### 15. KoLd__FEEt.ice_skating_
- https://github.com/9x25dillon/KoLd__FEEt.ice_skating_ ; license "Other" (NOASSERTION), 1 star, created 2026-09-03, TypeScript, one author. Mostly a design document with a browser "ice-lab" modelling two blade steering, edge bite, slip and an ice wear grid. Closest thing found to open skate locomotion physics, but figure skating, young, unreviewed, unclear license. Verdict: study only, never copy. Academic background: "A model of ice friction for a speed skate blade" (Springer, Sports Engineering, 2013) and "Ice friction of flared ice hockey skate blades" (ResearchGate); neither read in full.

### 16. Epic Sports Broadcast Motion Design Sample
- Reported by digitalproduction.com and awn.com (Sept 2025), built with Capacity Studios; free sports graphics package using Motion Design. License not verified (Fab Standard License is described as allowing commercial use in any engine). Use: scoreboard and lower third visual language. Verdict: study only until its license is read.

### 17. Motion matching extras
- JLPM22/MotionMatching (MIT, 608 stars, 2026-04-24, Unity), KamatMayur/UE5_MotionMatching (MIT, 8 stars, 2022), E1P3/Learned_Motion_Matching_Training (MIT, 16 stars, 2024). E1P3/Learned_Motion_Matching_UE5 has no license (reject). Verdict: study only.

### 18. Rejected or irrelevant
- UE air hockey student projects fullpotat0/GE_AirHockey_Multi, maj86/Air-Hockey-Game, Mat729/AirHockey, rustCoul/Air_hockey_Game: no license, tutorial grade.
- Recompilation ports Wndwsqrrl/3on3NHL-recomp (MIT, 13 stars), geno55/wg3d-recomp (GPL-3.0), griby-man/bardown (NHL 14, GPL-3.0): derived from commercial game binaries, legal exposure, and GPL. Do not use.
- Others seen: berabera54152-cell/3D-Soccer-Game-Engine (Unity, MIT, 0 stars, 2026-09, appears AI generated, unverified), cyntler/football2d (MIT), levans902/hockey-vr, PeiyuChen1005/VR-IceHockey, pugilist339/Hockey-Club, McChinz/CHL-2026-Vita-Hockey (all no license). None adds capability.
- Fab: no free hockey rink, skate or hockey animation asset found. A "skate pack environment" Marketplace item exists (likely skatepark; unverified).

## What does not exist (honest list)

- No open source hockey game in Unreal Engine at any quality. The only UE hockey repos are student air hockey projects with no license.
- No open source 3D ice hockey game with real skater physics in any engine (confirms docs/research/07 after more queries across Unity, Godot, UE, C++, Java, Rust). Best are Open Practice (GPL Godot), HockeySlam (shootout) and recompiled commercial games.
- No open source skate locomotion plugin or Mover/CMC skating mode; Epic's Mover has no ice sample.
- No free skating or stick handling animation pack under a clear commercial license (GASP is ground locomotion only).
- No open source puck or ball spin and swept collision plugin for UE; no stick to puck contact example found.
- No open source goalkeeper AI for UE (soccer repos are the closest, reading only).
- No packaged sports camera system for UE beyond the engine Gameplay Cameras plugin and Epic's broadcast graphics sample.
- No sports specific replay system for UE, only the engine DemoNetDriver and a community write-up.
- Not verified: GASP animation license; Mover API state in 5.8; Resim behaviour for 10 skaters plus puck at 60 Hz; Epic's own EULA text on copyleft.

## Recommendation
Build skating as a custom Mover movement mode (CMC subclass as fallback), the puck as a Chaos Networked Physics object with blade contact driven by gameplay events, replays on the memory streamer, cameras via Gameplay Cameras, locomotion layering from the GASP architecture, and port tactics from RoboCup and Gameplay Football by hand. Spike items 1, 2 and 4 first because they carry the schedule risk.
