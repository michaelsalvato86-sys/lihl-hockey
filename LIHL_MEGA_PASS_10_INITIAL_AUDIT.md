# LIHL Mega Pass 10 initial audit (2026-11-13)

Branch mega-pass-10, started from mega-pass-9 (HEAD 3092e52; GitHub main/mega-pass-9 snapshot 15fff82). Production: https://lihl.duckdns.org (Oracle Always Free, 1 vCPU, 1 GB). No hosting, DNS, Fly or Oracle changes in this pass.

## Environment (checked read-only)
- Unreal Engine: NOT installed. Epic Games Launcher folders exist (C:\Program Files (x86)\Epic Games\Launcher, D:\Epic Games\Launcher, Fortnite) but no UE_5.x engine install, no UnrealEditor.exe, no LauncherInstalled.dat entry.
- Visual Studio / MSVC build tools: NOT installed (no Visual Studio folders). UE5 C++ projects need Visual Studio 2022 with the Game development with C++ workload (and Windows SDK, .NET).
- Hardware: AMD Ryzen 9 5950X (16 cores), 128 GB RAM, AMD Radeon RX 6900 XT (driver 32.0.21045.16010). Disk free: C 463 GB, D 3,751 GB.
- Consequence: a UE5.8 prototype cannot be compiled or executed in this pass until the engine and build tools are installed (a user step: Epic account sign-in in the Launcher, large downloads). Nothing in this pass will claim a compiled or executed Unreal build.

## Current game (what exists)
Browser game, vanilla JS + three.js r128, server-authoritative JS sim (game.html, runs in Node via server/sim_host.js) at 30 Hz, client net.js interpolation. 27 teams (26 LIHL + Whiskey Stick), jersey picker (home/away/alt), SKATE2 edge skating with hockey stops, puck height and swept collisions, goalie arc and save variants, procedural skater animation (anim_ctrl.js, anim_rig.js, skater_pose.js, anim_events.js, anim_celebrate.js, anim_hits.js, anim_shots.js, anim_goalie.js) with leg IK, replay, online replay break, announcer clips, player tracking. Test state at the end of Pass 9: harness 963/963, server suite passing, balance in range. No human playtest, no phone test.

## Limits of the current stack (from the Pass 9 reports)
Hand-authored procedural animation only (no motion capture or motion matching), skater model about 24k triangles each with no LOD, reflections and shadows cost 8 ms on high tier on a 6900 XT, backward skating and weight shift weak, many animations only numerically verified, graphics bounded by three.js r128 and mobile.

## Assets reusable in Unreal
Team and player data (data/league.json, extra_teams.json, jerseys_store.json), logos (photos/*.png), jersey designs (jerseys.js painter specs), Quaternius CC0 skater models (models/), rink dimensions and sim constants (game.html), announcer clips (audio/ann), event schema (anim_events.js table).

## Pass 10 plan
Parallel research agents (animation, open source sports, assets, graphics, architecture), a data-compatibility tool and an uncompiled UE5 C++ scaffold, then a final engine decision. See LIHL_MEGA_PASS_10_REPORT.md.
