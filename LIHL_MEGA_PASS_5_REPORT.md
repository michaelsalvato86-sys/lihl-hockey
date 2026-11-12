# LIHL Mega Pass 5 report (2026-11-12)

Branch: mega-pass-5, started from 95c1353 (master). Honest scope: a focused subset of the brief, not all 22 scenarios. No NHL console parity is claimed.

## Audit (before changes)
Already working: unified shot/pass actions, buffered input, checking events, goalie save kinds with kind-based rebounds, stamina (drains with skating, recovers on the bench, scales speed), line changes with PP/PK units, difficulty scaling, authoritative server sim with 30 Hz snapshots.
Problems found: lines were not refreshed during stoppages (boxed, fighting or injured players stayed in seats, so skaters vanished and sometimes no defensemen); AI shot choice ignored lanes; non-pressing defenders drifted to fixed spots; faceoffs handed the puck to the winner; goalie rebounds ignored shot speed.

## Changes
- Subs fix: lines refresh during stoppages. Integrity test: 0 problems in 41,438 samples over 26 games (was 186 bad samples in the earlier probe).
- Situation awareness: late in the 3rd, a trailing team forechecks aggressively and shoots more, a leading team plays conservatively.
- Forecheck modes (conservative, standard, aggressive, two-player) change how many players pressure and when. Chosen by score and time; per-team preference field exists, no menu yet.
- Defensive coverage: non-pressing defenders pick up the nearest dangerous opponent goal side.
- Shot selection: AI shot probability now depends on distance, slot, lane clearance, goalie position, traffic and teammates at the net, so it passes or carries instead of always shooting.
- Pass leading: AI leads moving teammates.
- Faceoffs: winner pulls the puck back, 22 percent become scrambles.
- Goalie: rebound distance and freeze chance depend on shot speed; follows a pass across the crease. He still only tracks shots after release.
- Reception outcomes, fights and injuries are from pass 3.

## Tests
New server/test_p5.js (subs integrity, late-game posture, shot quality, faceoff mix, coverage): all pass. test_allteams 26 of 26, feel, net, net2, reconnect, ratings pass. Flow: goals per game 4.4, steals per minute 12, goalie 0.16 goals per shot.

## Not done or not tested
Rendered gameplay inspection of the new AI, breakout and neutral-zone systems, screens affecting goalie vision, board battles, contested-puck physics beyond reception, attribute rebalancing, fatigue-driven AI line changes, special-team set plays, a forecheck menu, multiplayer with several humans, performance profiling. Scenarios 1 to 6, 9, 11, 14, 15, 18 to 19 and 22 were not tested as separate scenarios.

## Update (second round)
- Forecheck menu: pause card, offline only (online matches use the standard mode). AI teams get a coaching personality (standard, aggressive, two-player or conservative) from their name.
- Contested pickups: loose-puck battles use checking, defense, fatigue and speed; 40 percent squirt loose, board battles bump the loser. About 20 per game.
- Fatigue: tired lines already changed early; now never while the puck is in their own danger zone.
- Attributes audited: speed drives top speed, acceleration and turning; shot drives power and accuracy; pass, checking, defense, stamina already matter; battles now use them too. No new attribute types were added.
- New tests in server/test_p5.js: outlet passes (about 10 per game), offensive-zone passes vs shots (about 4 to 1), winger space (about 21 ft), center support (about 21 ft), blue line (about half the samples within 6 ft), battles, rebounds after saves, goalie follows cross-crease pass, tired line change, forecheck pressure (conservative 1, standard 1, aggressive 2, two-player 2). All pass.
- Skating sound: pause card setting (Off, Very low, Low, Normal); default is now Low.
- Post-game summary: scoring list, shots, saves, hits, passes, faceoffs, penalty minutes, possession, three stars. Offline and online (the server sends the stats with the end message).
- Still not seen in a live rendered match: breakouts, neutral zone, two-on-ones. Multi-human online play is covered only by the existing two-client tests.
