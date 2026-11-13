# LIHL Mega Pass 8 + 9 report (2026-11-13)

Branch mega-pass-9, started at 82bbec6 (baseline doc commit 439e8f6). Briefs for Pass 8 and Pass 9 were combined. No physical device was used and nobody played this build: everything below is automated tests, headless-browser frames, or two-bot network tests.

## What was done (merged on mega-pass-9)
| Area | Result | Verification |
|---|---|---|
| Event-to-animation system (anim_events.js: 31 events, priority and interruption table, dedupe, celebration gate) | Implemented (p9-evt d9a498c) | Harness 946/946; 90 s real-page run saw 52 distinct states, 0 script errors |
| New real sim events: goalie pull/return, cover on whistle, poke lunge, goal-against, win pose online | Implemented | State counts in the real page; frames not viewed for most |
| Animation gallery (anim_gallery.html, dev only) and docs/ANIMATION_INVENTORY.md | Implemented | Loaded in a browser, no errors |
| Saucer pass with real lift and landing, backhand reception with cushion, one-timer window and misses, board pass bounce, puck separation (p9-puck2) | Implemented | poc_puck 69/69; one saucer in flight and one backhand settle viewed |
| One-timer age bug (clock counts down) | Fixed | test_balance in range |
| Online event parity (server event ids, dedupe, stale drop, wind-up expiry, celebration on reconnect, win pose) (p9-parity bcf250c) | Implemented | test_net_parity 16/16 (two bots, identical event logs); no browser test |
| Balance study, 400 games per config (p9-bal 12f7c24) | Done; no game change needed at that point | LIHL_MEGA_PASS_8_BALANCE_REPORT.md |
| Reflection swim (reflection skipped every 2nd frame), double tone mapping (r128 maps per material and again in the final pass), ice paint markings, replay shows only recorded players, replay camera clamp (p9-gfx3) | Fixed | Marker error 2.2 to 5.5 px down to 0.65 px; desktop, phone, 6 jersey and 5 replay frames viewed |
| Leg-flip bug (stops and crossover), leg rate limiter, planted-foot soft hold, backward slip angle, online foul reactions via the penalty banner (p9-body) | Fixed / implemented | Per-frame joint jump 83 to 9-11 degrees on recorded sim traces; contact sheets viewed |
| Controls and mobile: help text matches code, overlapping buttons fixed, 44 px targets, hint banners, debounce, safe-area wiring (p9-ctl ce12cb6) | Fixed | tools/test_controls_layout.py 0 fails at 5 viewports (emulation only) |
| test_replay expectation (a penalty legitimately leaves 9 skaters) | Fixed | 15/15 runs pass |
| Announcer: prefer lines with recorded clips | Shipped earlier as a hotfix | Live file matches the build |

## Final gates on the merged build
test_allteams 26 teams 0 failures; test_net, test_net2, test_reconnect_stale, test_ratings, test_goalie, test_replay, test_net_replay, test_net_parity, poc_skate, poc_puck (69), test_feel pass; test_p5 three runs no FAIL; test_balance all 10 metrics in range; animation harness 946/946; real page 5,400 steps with draws, 0 errors; snapshot 833 bytes average (baseline 849), 0.17 ms per tick.

## Not done or not verified
- No physical phone or desktop playtest, no Safari or iOS. Feel, timing and "does it look like NHL" are unjudged.
- Many animation variants are only numerically checked; see docs/ANIMATION_INVENTORY.md and LIHL_MEGA_PASS_9_VISUAL_QA.md.
- Backward skating still reads as a low squat with a long trailing leg on some frames; weight shift went from 3 to 5 cm but was not judged by eye.
- Foul reactions online were tested by calling the handler directly, not with two clients.
- Fight trigger conditions and referee/linesman consistency were not audited.
- Goalie play-the-puck, screen peek, stoppage idles and stick battles are state-driven, not sim-driven. The pulled goalie is not recorded in the replay.
- Reflector: only camera translation was swept, not fast rotation or zoom.
- Online replay: scorer and assist context in the replay HUD not reviewed.
- Between-the-legs deke and skate kick are approximate; the saucer is visible only as the puck arc.
