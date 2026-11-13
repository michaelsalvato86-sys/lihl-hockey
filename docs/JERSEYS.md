# Jerseys (home / away / alt)

Cosmetic only. A jersey choice never reaches the sim: `game.html` reads it only in `newGame` to set `team.jersey`, `team.color`, `team.accent`.

## Model
Every team def has `jerseys`: a list of `{slot, color, accent, ...}` with `slot` one of `home`, `away`, `alt` (int 0, 1, 2 everywhere a small number is stored or sent). `jerseysOf(def)` returns only the slots that exist (always at least `home`; a team without data gets `{home, def.color, def.accent}`). No jersey is ever invented: a slot the data does not have is not shown.
Optional fields (from `data/jerseys_store.json`): `yoke, sleeve, stripe, trim, number, numberTrim, pants, socks` (hex or null). Whiskey Stick adds `style` (hand-made variant), `crest` (png) and `number/numberTrim`.
Other slots in the data (`observed-loaner`, QF and SCRP) are ignored by the game.

## Data flow
`data/league.json` (LIHL API, untouched) + `data/extra_teams.json` (Whiskey Stick, team id 990001, 23 skaters + goalie, flat rating 60) + `data/jerseys_store.json` (other agent, store scrape) are merged by `build.py` into `ROSTER` (game.html / index.html / server/game_index.html). `body` is renamed `color`, `accent` = stripe/trim. The store file is tolerant: arrays `[color, accent]` or objects; a team's own `jerseys` are never overwritten.
Coverage now: 26 LIHL teams have home + away (16 real store reversibles; 9 are STANDARD TEMPLATES, low confidence: QF LIK PLT SALT SCRP QNS PPC C D5, not their real jerseys; PIMP away is a USER-SPECIFIED white version of the pink). Only Whiskey Stick has an ALT (purple). The game UI shows only HOME / AWAY (ALT only for Whiskey Stick); the template origin is documented here and in JERSEY_STORE_REPORT.md.

## Rendering (`jerseys.js`, `skater3d.js`)
* Plain jersey (no data beyond color/accent): the original vertex-color cloth.
* Styled jersey (`style` set, or store fields present): ONE canvas atlas per variant (512 px desktop, 256 mobile), painted once and cached in `JT.cache`; every skater of that variant shares the texture. The merged cloth mesh gets a second UV set (`SK.cloth.J`, built once, vertices duplicated only where a UV seam needs it, about 5% more vertices). Same mesh count and draw calls as before. Nothing is allocated per frame.
* Atlas rows: torso (front panel left half, back panel right half), sleeve (cylinder around the arm), pants, socks; last 4x4 px white (gloves/skates).
* Whiskey Stick styles: `ws_black` (forest green yoke and V-neck, maroon and cream stripes, cream/maroon/green stepped band at hem, sleeves and socks, maroon pants and socks, pinup oval crest), `ws_white` (black/red/black bands at hem and sleeves, flag patch, framed crest, red pants, white socks with black and red bands), `ws_purple` (PMS 7672C purple, cream and tan stepped bands with black pinstripes, black V-neck and pants, purple socks, Long Island crest, LIHL patch). Colors sampled from the reference photos and the Mach 1 template; hem bands start 7.5 cm above the belt because the belt hides the lowest part. Patches appear on both sleeves (the cloth is mirrored), the real jerseys have one.
* Michael Salvato (#68) always wears the St. Beer jersey (cream, blue accents) whichever team he is on (hook in `SK.make`).
* Logos: `photos/ws_pinup.png`, `ws_island.png`, `ws_framed.png`, cropped by `tools/make_ws_logos.py` from `assets_raw/whiskey_sticks` (not tracked).

## Picker, persistence, auto-away
* Offline team select: a HOME / AWAY / ALT row (44 px buttons) in each team panel before PLAY. Choice per team abbreviation in `localStorage` `lihl_jersey` (try/catch, default home).
* Clash: `jerseyPair()` compares the two body colors in CIE Lab, dE76 < 30 is a clash (30 = clearly different at a glance). The VISITING team then switches to away, then alt, then home, the first that is not a clash (panel shows "AUTO AWAY: colors clash"). If nothing resolves it, the older color fallback in `newGame` still runs.
* Online: lobby row per player (your own is clickable, the opponent's is shown). Client sends `{t:'jer', v:0|1|2}`; the server accepts only integers 0..2 that exist for that player's team (else ignored or reset to home), stores `player.jer`, and sends `players[i].jer` plus `jr:[homeSlot, awaySlot, auto]` (the clash result computed by the SERVER with the same `jerseyPair` in the sim vm) in every `room` message. The `start` message carries `jer:[homeSlot, awaySlot]` (resolved); clients render exactly that (`window.JNET`). Tests: `server/test_jersey_lobby.js`.

## Whiskey Stick (real team)
Island Ice Hockey, Weekend D2, Fall 2026, 5-1. WSK, 27th team. Numbers 8, 9, 11, 12, 13, 14 were not published and are assigned (`numAssigned`). Positions are not published: the sim builds lines itself from the (flat) ratings and the id-based jitter. All 23 skaters and the goalie are rated 60 (skater attribute map `.3+.65*(rating-20)/45`; goalie `gl = .38+.4*(rating-20)/45`, same 20..65 scale).
