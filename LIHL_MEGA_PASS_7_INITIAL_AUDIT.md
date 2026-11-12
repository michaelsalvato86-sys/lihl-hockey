# LIHL Mega Pass 7 initial audit (2026-11-12)

Baseline: master at 79be478 (ahead of mega-pass-6; no remote tracking), branch mega-pass-7 created from it. Working tree clean.

## Verified in source
- skate() in game.html already has momentum, speed-dependent turn rate, backskate, carrier slowdown. A reverse input at speed brakes at 90 ft/s^2 while the body turns slowly, so there is a stop of sorts but no sideways hockey stop with edge spray. Pass 6 prototype did not produce a stop and is not integrated.
- One-timers: only humans could set up one (oneT set in the human input path). The AI never one-timed. Fixed in this pass.
- Tips/deflections exist in shoot() (lane check on teammates). Rebound crash and back-door positioning were missing. Added.
- Puck is 2D (no height or spin). Leg IK and foot planting do not exist. Not started this pass.

## Research note (video not watchable here)
Only text sources were readable: EA's NHL 26 ICE-Q 2.0 deep dive describes players with preferred shooting spots (Ovechkin's office on the power play), real tracking data driving decisions, and a consecutive-saves goalie system. Forum posts say AI one-timers and tap-ins score too easily and AI picks odd shot types. Takeaways applied: limit one-timer volume (about 20 percent of shots), shooters take them from the slot only.
