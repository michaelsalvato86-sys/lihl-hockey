# 07 Open source hockey repos and assets (research, 2026-11-12)

Method: GitHub repo search (about 25 queries: hockey game, ice hockey, hockey three.js, puck physics, godot, unity, skating, rink, goalie, manager, simulation), then LICENSE files fetched from raw.githubusercontent.com. GitHub API rate limit hit mid-run, so some searches (rink, goalie, puck stick) were cut short.

Headline finding: there is NO open source 3D ice hockey game in three.js or any engine with real-skater physics. The field is air hockey clones, tiny student projects, and one fresh Godot arcade game.

## Candidates

| Name / URL | Dev | License (file read) | Last commit | Stack | Portable? | LIHL use | Verdict |
|---|---|---|---|---|---|---|---|
| Open Practice, https://github.com/wolfrats/hockey | wolfrats | GPL-3.0 (license.md read) | 2026-11-10 | Godot/GDScript, web export, local multiplayer, 1 star, created 2026-08 | Logic readable, GDScript to JS by hand; GPL means no copying into a closed game | Arcade skater feel, puck/stick handling, AI | Study only (GPL contaminates if copied; sprites are 2D) |
| MastersOfHockey, https://github.com/nikayou/MastersOfHockey | Nicolas Cailloux | MIT (read) | 2015-02 | Unity 2D C#, multiplayer ice hockey | C# netcode is old Unity; ideas only | Reference for player/puck rules and lobby | Study only (stale) |
| ArtlessHockey, https://github.com/BleckWolf25/ArtlessHockey | BleckWolf25 | MIT (read) | 2025-06 | Unity C# | Not portable | Puck/stick physics tuning values | Study only |
| AirHockeyWebGL, https://github.com/MortimerGoro/AirHockeyWebGL | MortimerGoro | MIT (read) | 2019-11 | JS, WebGL | Yes (JS), but air hockey paddle | Mallet-puck collision, mobile touch | Adapt (puck bounce/wall code only) |
| verold-airhockey, https://github.com/dweis/verold-airhockey | Derrick Weis | MIT (read) | 2013-12 | JS, three.js, Socket.IO, Box2D | JS and Socket.IO match our stack in shape; server is old | Example of three.js + socket multiplayer for a puck game | Study only (2013, outdated three.js) |
| GMTurbo/Hockey, https://github.com/GMTurbo/Hockey | GMTurbo | NONE (no license file, API license null) | 2011-11 | JS, three.js, jiglibjs | n/a | n/a | REJECT (unlicensed, ancient) |
| touchockey, https://github.com/jturcotte/touchockey | jturcotte | MIT per GitHub metadata (file not opened) | 2020-06 | C++/QtQuick, phones as controllers | No | Phone-as-controller idea | Study only |
| PuckOff, https://github.com/witnessmenow/PuckOff | witnessmenow | none found | 2013 | Java LibGDX top-down | n/a | n/a | REJECT (unlicensed) |
| tylerforgione/hockeysim | tylerforgione | none found | 2026-11-11 | C# | n/a | n/a | REJECT (unlicensed; also content not inspected) |
| workinmanstrokes/hockey-arcade | unknown | none found (no LICENSE at root) | 2026-11-08 | Python pygame 3rd-person | n/a | Third-person arcade camera idea | REJECT for code (unlicensed), idea only |
| ZenGM Hockey, https://github.com/zengm-games/zengm | ZenGM LLC | Custom "not open source" (read: forbids distributing playable forks) | 2026-11-11 | JS/TS, client side | Cannot reuse | Season/league/stat model ideas only | REJECT for code; league UX reference only |
| historicalsource/open-ice, https://github.com/historicalsource/open-ice | historicalsource | none; this is Midway's NHL Open Ice arcade source dump | 2021 | 68k assembly | n/a | n/a | REJECT (leaked/proprietary source, no grant) |
| Mhopkinsinc/NHLHockey | Mhopkinsinc | none; Genesis NHL disassembly | 2025-12 | M68K asm | n/a | n/a | REJECT (decompiled EA code) |
| Ice-Skating-Game (pkprajapati7402), MIT | pkprajapati7402 | MIT per metadata, not opened | 2024-05 | HTML | Tiny | Nothing | Reject (no value) |

Rejected as irrelevant to LIHL: all air hockey Unity/Python/Godot clones with no license; NHL-Analytics and computer vision repos (data, not games); hockey manager text sims (no real-time play).

## Asset sources (license page checked)

| Source | License | Hockey content | Verdict |
|---|---|---|---|
| Quaternius, https://quaternius.com | CC0 (statement present on site) | Has generic rigged characters and animation packs; no hockey pack confirmed | Use directly for base rigged humanoid and animations, hockey gear must be made |
| Kenney, https://kenney.nl | CC0 (statement present on site) | Sports and generic 3D kits; no ice hockey pack confirmed | Use directly for props, UI, sounds, after checking each pack |
| CGTrader / RenderHub hockey models | Marketplace licenses (mostly paid; one free goalie mask under "Royalty Free", not CC0) | Sticks, helmets, rinks, goalie mask | Do not use without reading each license; no AI-training/redistribution assurance |
| Sketchfab CC, OpenGameArt | Per model | Not searched in depth | Unverified |

## Top 3 finds

1. wolfrats/hockey (Open Practice). The only real open ice hockey game, current, web-playable, Godot. GPL-3.0, so study only unless LIHL itself goes GPL. Read its puck pickup, shot, and AI scripts for feel numbers (rewrite, do not copy).
2. Quaternius + Kenney CC0 packs. Safe, permissive path to a rigged skater base and animation set. Hockey-specific kit (stick, pads, goalie gear) must be built or sourced elsewhere.
3. MortimerGoro/AirHockeyWebGL and dweis/verold-airhockey (both MIT). JS puck collision and a three.js + Socket.IO puck game architecture. Small but legally adaptable for puck-vs-board bounce and server tick structure.

## Takeaway for LIHL

No existing codebase solves skater movement (edge/stopping glide), stick-puck carry, goalie, or server-authoritative hockey. LIHL has to write these itself; use the repos above only as feel references. Do not touch anything EA/NHL, Midway, or disassembly derived.

## Could not verify

- GitHub search was rate limited, so rink, goalie, "skating physics" and Godot/Unreal topic sweeps are incomplete. Unreal and Roblox hockey projects were not searched.
- Licenses of touchockey and Ice-Skating-Game taken from GitHub metadata, files not opened.
- Whether Quaternius or Kenney ship any hockey pack (site search not done pages-by-page); Sketchfab and OpenGameArt CC hockey models not surveyed.
- Asset licenses inside wolfrats/hockey (sprites, sounds) may differ from code GPL; not checked.
- Closed browser hockey games (Hockey Legends, Velocity Puck on itch.io) were not confirmed open source; treat as closed.
