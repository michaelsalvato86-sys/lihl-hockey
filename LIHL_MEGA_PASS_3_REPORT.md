# LIHL Mega Pass 3 report (2026-11-12)

Ratings are my honest estimate of demonstrated results. "Seen" = a rendered frame or harness frame was inspected. No NHL 27 parity is claimed; this is a small browser game. Nothing was judged on a real phone.

## What changed
- Checking: the press no longer adds velocity. Sequence is anticipation (0.16 s coil, hitwind event), commitment (lunge toward the target starts at 0.16 s, new hitcommit event), contact, knockback, and recovery. Victim reaction now carries the hit direction (front, side, behind). A missed check leaves the hitter off balance (0.3 s stun, speed halved) with the existing hitmiss animation.
- Passing: wind-up is now 0.12 s (was 0.035), visible as a stick load in the renderer (offline and online), buffered input still works, cancelled if the carrier is hit or loses the puck.
- Receiving: pickup is no longer automatic. On puck contact the outcome is rolled from puck speed, angle to the blade, receiver skill, and stun: clean, difficult (0.28 s fumble lock), bobble (puck squirts loose), deflection (random redirect, slower), or miss (puck carries through). A receiver animation scales the cushion by outcome (anim_ctrl.js).
- One-timers: contact timing now matters. Pressing inside 0.34 s of arrival is tight (+15 percent), 0.34 to 0.62 s is normal (+5 percent), earlier than 0.62 s swings early and misses. Hard passes can still be fumbled.
- Shots: snap is quicker and more accurate (error x0.78, speed x0.9), slap is harder and wilder (speed x1.1, error x1.25), backhand (facing away from the net) is slower and less accurate (speed x0.78, error x1.25).
- Stick and puck: the carried puck rides the blade with a spring lag and a stickhandling sway instead of snapping to a fixed point; large gaps still snap.
- Fights and injuries (new): after a big hit a fight can start (stoppage, faceoff location, 4.2 s exchange of punches with check animations, a decision, matching major penalties for both). Hard hits can injure a player for the rest of the game (the bench fills in). Roughly 0.3 fights and 0.6 injuries per game in simulation.
- Jerseys: colors from the lihockey.org store images for 17 teams.

## Not done
Skating rework (C-cuts, crossovers, pivots, momentum), transitions, goalie-interference and delayed-penalty rules, shootout and 3-on-3 overtime, outgoing line-change skate-off, PP and PK formations, announcer lines for fights or injuries, a fight-specific animation (it reuses check and checked).

## Automated results
test_allteams 26 of 26, test_net, test_net2, test_reconnect_stale pass, test_ratings pass, test_feel pass (taps on target about 85 percent), measure_flow (goals per game 5 to 6, steals per minute about 12, pass interception about 18 percent), measure_goalie (0.11 goals per shot), anim harness 197 of 197.

## Visual inspection
Seen: a Hoagie's Heroes vs Silly Goose Squad frame (jerseys render; the first maroon looked pink, so it was darkened). Not seen in a live game: fights, injuries, bobbled receptions, the new pass wind-up. The ice shows a strong white specular glare in a headless render; unexplained.

## Ratings (0 to 100)
| Area | Rating |
|---|---|
| Checking | 58 |
| Passing | 52 |
| Receiving | 55 |
| One-timers | 55 |
| Shot variety | 55 |
| Stick and puck | 45 |
| Skating | 50 (unchanged) |
| Fights and injuries | 40 |
