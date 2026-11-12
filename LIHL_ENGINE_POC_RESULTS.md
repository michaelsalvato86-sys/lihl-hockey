# LIHL proof of concept results (2026-11-12)

Only one proof of concept was built: skating, in server/poc_skate.js (not integrated into the game). The animation/IK and puck proofs of concept were NOT built.

Method: the real `skate()` from game.html (run inside the server vm) versus a prototype with edge-radius turning, a grip budget and a hard-edge stop branch, both at a top speed of 40 ft/s and 60 steps per second. Numbers are seconds and feet.

| Measure | Current | Prototype |
|---|---|---|
| Time to 90 percent speed | 1.37 | 1.40 |
| Coast to a stop after releasing input | 4.82 s, 56.5 ft | 4.98 s, 63.0 ft |
| 90 degree turn at full speed | 0.35 s, 11.7 ft ahead, 3.3 ft sideways | 0.50 s, 8.8 ft ahead, 14.4 ft sideways |
| Hard reverse input at full speed | turns around and skates away (no stop) | same, the stop branch did not hold |

Findings
- Acceleration is equivalent, so the current model is not broken there.
- The current model turns 90 degrees at full speed in 0.35 s inside about 12 ft, which is much tighter than real skating; the prototype gives a wider arc that grows with speed. Whether that feels better in play is unknown.
- The hockey stop in the prototype did not produce a stop in this test (it turned around), so the claim that it fixes stopping is NOT proven. Not integrated.
- No screenshots or recordings; no performance difference measured (both are a few arithmetic operations per skater per step).

Status: Research completed. Proof of concept partially working (skating numbers only). Integrated: no. Visually verified in gameplay: no.
