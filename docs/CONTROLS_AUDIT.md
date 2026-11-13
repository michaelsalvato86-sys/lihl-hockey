# Controls and mobile usability audit (Pass 9, Agent G)

All measurements are Playwright Chromium EMULATION (hasTouch, isMobile, DPR 3, iPhone UA). Not a physical device.

## Inventory (real behavior from game.html)
| Action | Keyboard | Touch | Gamepad (standard map) |
|---|---|---|---|
| Skate / backskate | WASD, arrows | floating stick (left half, below top 30%) | left stick, dead zone 0.2 rescaled |
| Shoot | hold SPACE, release (tap = snap, >0.6 = wrist, >0.85 = slap; full charge 520 ms) | SHOOT hold/release | A or RT, hold/release |
| Shoot without puck | sprint burst, or one-timer if a pass is inbound within 46 | same | same |
| Pass | E | PASS | X or LT (edge only, no repeat) |
| Pass without puck | selects nearest teammate to puck | same | same |
| Check | Q (burst + hit window) | HIT | B or RB |
| Change player | R, TAB | CHANGE | Y |
| Vision control | hold SHIFT | VIS (toggle) | hold LB |
| Camera | V | CAM | none |
| Pause | ESC, P | II | none |
Not present in the game (nothing to document or add): poke check, manual faceoff input, goalie control, manual goalie pull (automatic late in 3rd period).
HIT/PASS/SHOOT inputs are buffered 0.35 s while the skater is busy (existing behavior).

## Mismatches found
1. Help modal omitted vision control, camera, pause, the gamepad mapping, tap vs hold power, burst and one-timer behavior. FIXED (text in game.html, mirrored to index.html and server/game_index.html).
2. Pause and CAM buttons overlapped each other (10 px) and sat on the away scorebug at every viewport; PAUSE was 52x40 and the sound toggle 38x34, below 44 px. FIXED: sound, CAM, pause are a 44x44 column on the right edge (safe-area aware); right info panel steps left while touch controls are active.
3. Right-hand cluster at 568x320 had PASS overlapping VIS and CHANGE overlapping pause. FIXED with a max-height:340px compact layout.
4. Add-to-home-screen hints covered SHOOT/PASS/VIS 6 s into a game. FIXED: hidden while touch controls are active (still show in menus).
5. No double-tap guard on PASS/HIT/CHANGE, no contextmenu block, no touch-callout block. FIXED (140 ms same-action debounce; contextmenu prevented outside inputs; touch-action:none and user-select:none on controls). Already present: viewport user-scalable=no, gesture and dblclick prevention, 350 ms touchend double-tap guard, pointer events everywhere.
6. Safe-area: viewport-fit=cover was set but no inset was used. FIXED for sound/CAM/pause, joystick zone and action buttons (env(safe-area-inset-*)). Insets are 0 in emulation, so only the CSS wiring is checked.
Known leftover (cosmetic): at 568x320 CHANGE sits over the lower part of the right info panel (stamina/line text). Panel is pointer-events:none.
`ui_body.html` is an old template with a different #ctl (a "test PP" button); it is not what game.html/index.html serve, left untouched.

## Automated checks
- `python tools/test_controls_layout.py [url] [--shots dir]`: at 667x375, 740x360, 844x390, 932x430, 568x320 asserts 7 buttons >= 44 px, inside viewport, no pairwise overlap, zoom/select guards, and multi-touch (stick held while SHOOT pressed, via CDP touch points). Result: 0 fails (was 10).
- `python tools/test_controls_misc.py`: portrait 390x844 rotate overlay shows; `?q=high|std|mob|low` each sets R3.tier; downgrading high to std to mob to low mid-game keeps input.x/y, vision flag, game state and touch controls; gamepad dead zone, rescale, A/X/B/Y/LB mapping, no repeat on held button, A release fires shot. 0 fails. (Uses a faked navigator.getGamepads.)
Both serve from index.html; run with `python -m http.server 8142` in the repo root.

## Screenshots viewed
Before fix: 667x375 and 568x320 (showed overlaps). After: 568x320 and 932x430 (from the run just before the hint-hiding tweak; the 568 layout numbers are identical after it). Not viewed as images: 740x360, 844x390 (numbers only), 390x844 portrait (overlay asserted by DOM, not viewed).

## Could only be checked on a real device
Real thumb reach and comfort, iOS Safari rubber-banding and notch insets, Android back gesture, haptics, true multi-touch pressure, physical gamepad models (non-standard mapping, trigger analog values), 300 ms delay on old browsers, and long-press behavior on real iOS. Nobody played with these changes.
