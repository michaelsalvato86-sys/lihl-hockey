# LIHL Mega Pass 8: AI Balance Report (Agent D)

Branch p9-bal (off mega-pass-9). Tools: `server/balance_study.js` (study), `server/test_balance.js` (acceptance check). No game code was changed.

## Method
- Real sim (`server/game_index.html` via `createSim`), AI vs AI, 3 periods of 180 s (9 min games), 30 Hz, no humans.
- **400 games per configuration**, same 400 seeds and team pairings for every configuration (Math.random replaced by a seeded mulberry32 per game). Games diverge after the first differing decision, so configs are independent-ish samples, not paired. 0 games hit the tick limit; 7 percent went to overtime.
- Switches are TEXT TRANSFORMS applied to the sim source inside the study (game.html has no flags): `noOT` (AI one-timer setup block in aiPlayer), `noSlot` (slot feed passes in carry), `slotShort` (slot feed range 40 ft cut to 20 ft), `noCrash` (net-front rebound crash positioning), `noScreen` (winger screen/net-front slot), `noAI` (noOT+noSlot+noCrash+noScreen). `old79` / `old1b` are whole older builds (79be478 pre-pass-7, 1b97238 initial pass-7), because the old goalie is inline in step() and cannot be swapped alone; those two also differ in puck physics, hits, shots, so they are not clean isolations.
- Values are means (ratios are ratio-of-sums, delta-method SE) with 95 percent CI half-widths. Bold z marks |z| >= 2.8 versus `base` (about 9 metrics x 8 configs compared, so a loose Bonferroni cut; treat as evidence, not proof).
- Definitions: shots = shoot() calls incl. blocked; goals/shot = shooting percent on attempts; save% = saves/(saves+goals); pass completion/intercept = outcome at next possession event within 4 s; one-timer = AI shot kind 'onetimer'; tap-in = shot taken within 10 ft of the goal line; poor angle = lateral offset > 1.2x depth; rebound shot = same team shot within 3 s of its previous shot; turnovers = possession-team changes. Snap/slap are 0 because AI shots are always power 0.6-0.85 (wrist).

## Why earlier samples looked wild
Per-game goals SD = 3.8, so a 4-game mean has SE 1.9. 7, 9 and 10.5 are all consistent with a true mean of 8.9. Goals per shot per game SD = 0.074, 4-game SE about 0.037, covering 0.176 to 0.216. Four-game samples cannot say anything.

## Baseline and isolation (400 games each)
| metric | base (n=400) | noOT (n=400) | noSlot (n=400) | slotShort (n=400) | noCrash (n=400) | noScreen (n=400) | noAI (n=400) | old79 (n=400) | old1b (n=400) |
|---|---|---|---|---|---|---|---|---|---|
| goals/game | 8.912 +-0.373 | 8.350 +-0.358 | 9.035 +-0.378 | 9.085 +-0.357 | 8.865 +-0.376 | 8.508 +-0.371 | 8.137 +-0.341 **z=-3.0** | 6.725 +-0.315 **z=-8.8** | 7.325 +-0.351 **z=-6.1** |
| shots/game | 45.44 +-0.767 | 38.61 +-0.663 **z=-13.2** | 44.55 +-0.760 | 44.59 +-0.742 | 45.05 +-0.759 | 43.34 +-0.724 **z=-3.9** | 35.80 +-0.613 **z=-19.3** | 33.15 +-0.651 **z=-24.0** | 39.93 +-0.759 **z=-10.0** |
| shoot% (goals/shot) | 0.196 +-0.007 | 0.216 +-0.008 **z=3.7** | 0.203 +-0.007 | 0.204 +-0.007 | 0.197 +-0.007 | 0.196 +-0.007 | 0.227 +-0.008 **z=5.5** | 0.203 +-0.009 | 0.183 +-0.008 |
| saves/game | 16.63 +-0.468 | 13.44 +-0.414 **z=-10.0** | 15.90 +-0.464 | 16.23 +-0.444 | 16.66 +-0.460 | 15.70 +-0.429 **z=-2.9** | 12.52 +-0.390 **z=-13.2** | 14.07 +-0.432 **z=-7.9** | 17.23 +-0.528 |
| save% (sv/(sv+g)) | 0.657 +-0.010 | 0.622 +-0.012 **z=-4.3** | 0.643 +-0.011 | 0.645 +-0.010 | 0.658 +-0.010 | 0.654 +-0.011 | 0.610 +-0.012 **z=-5.7** | 0.683 +-0.011 **z=3.3** | 0.707 +-0.011 **z=6.4** |
| pass compl. | 0.779 +-0.004 | 0.767 +-0.004 **z=-4.2** | 0.774 +-0.004 | 0.783 +-0.004 | 0.777 +-0.004 | 0.780 +-0.004 | 0.767 +-0.004 **z=-4.2** | 0.778 +-0.004 | 0.791 +-0.003 **z=4.8** |
| pass intercept | 0.095 +-0.003 | 0.094 +-0.003 | 0.095 +-0.003 | 0.092 +-0.003 | 0.094 +-0.003 | 0.092 +-0.003 | 0.094 +-0.002 | 0.078 +-0.002 **z=-9.4** | 0.078 +-0.002 **z=-9.8** |
| passes/game | 130 +-1.317 | 131 +-1.345 | 126 +-1.314 **z=-4.1** | 129 +-1.274 | 128 +-1.253 | 130 +-1.266 | 128 +-1.374 | 133 +-1.326 | 135 +-1.356 **z=4.4** |
| one-timers/game | 10.38 +-0.343 | 2.402 +-0.154 **z=-41.6** | 8.400 +-0.318 **z=-8.3** | 9.508 +-0.327 **z=-3.6** | 10.36 +-0.338 | 9.807 +-0.324 | 1.663 +-0.130 **z=-46.5** | 1.650 +-0.123 **z=-46.9** | 9.057 +-0.320 **z=-5.5** |
| 1T share of shots | 0.228 +-0.006 | 0.062 +-0.004 **z=-44.3** | 0.189 +-0.006 **z=-9.0** | 0.213 +-0.006 **z=-3.4** | 0.230 +-0.006 | 0.226 +-0.006 | 0.046 +-0.004 **z=-49.7** | 0.050 +-0.004 **z=-48.6** | 0.227 +-0.006 |
| 1T goals/game | 1.317 +-0.123 | 0.375 +-0.063 **z=-13.4** | 1.067 +-0.104 **z=-3.0** | 1.262 +-0.116 | 1.340 +-0.119 | 1.075 +-0.114 **z=-2.8** | 0.195 +-0.044 **z=-16.8** | 0.240 +-0.047 **z=-16.0** | 1.085 +-0.109 |
| 1T conv (g/shot) | 0.127 +-0.011 | 0.156 +-0.024 | 0.127 +-0.011 | 0.133 +-0.011 | 0.129 +-0.010 | 0.110 +-0.011 | 0.117 +-0.024 | 0.145 +-0.026 | 0.120 +-0.011 |
| rebound shots/game | 8.908 +-0.374 | 6.508 +-0.307 **z=-9.7** | 8.700 +-0.369 | 8.730 +-0.379 | 8.885 +-0.358 | 7.700 +-0.345 **z=-4.7** | 4.947 +-0.244 **z=-17.4** | 4.942 +-0.276 **z=-16.7** | 7.540 +-0.352 **z=-5.2** |
| rebound goals/game | 1.772 +-0.134 | 1.290 +-0.126 **z=-5.2** | 1.683 +-0.127 | 1.725 +-0.132 | 1.640 +-0.129 | 1.530 +-0.118 | 1.110 +-0.104 **z=-7.7** | 1.115 +-0.113 **z=-7.4** | 1.505 +-0.128 **z=-2.8** |
| tap-in shots/game | 15.00 +-0.487 | 14.38 +-0.434 | 15.17 +-0.496 | 15.19 +-0.482 | 14.82 +-0.469 | 13.00 +-0.433 **z=-6.0** | 12.40 +-0.417 **z=-7.9** | 7.508 +-0.292 **z=-25.9** | 8.875 +-0.351 **z=-20.0** |
| tap-in goals/game | 3.743 +-0.213 | 3.542 +-0.210 | 3.828 +-0.229 | 3.760 +-0.205 | 3.717 +-0.207 | 3.265 +-0.200 **z=-3.2** | 3.413 +-0.197 | 2.075 +-0.156 **z=-12.4** | 2.230 +-0.162 **z=-11.1** |
| tap-in conv | 0.249 +-0.011 | 0.246 +-0.012 | 0.252 +-0.012 | 0.248 +-0.011 | 0.251 +-0.011 | 0.251 +-0.013 | 0.275 +-0.013 **z=3.0** | 0.276 +-0.018 | 0.251 +-0.015 |
| poor-angle shots/game | 3.125 +-0.175 | 3.112 +-0.183 | 3.192 +-0.180 | 3.080 +-0.184 | 3.163 +-0.183 | 3.132 +-0.185 | 3.140 +-0.176 | 2.055 +-0.131 **z=-9.6** | 2.022 +-0.148 **z=-9.4** |
| poor-angle conv | 0.310 +-0.025 | 0.292 +-0.027 | 0.302 +-0.027 | 0.311 +-0.027 | 0.281 +-0.025 | 0.290 +-0.027 | 0.350 +-0.028 | 0.282 +-0.033 | 0.288 +-0.032 |
| loc <10ft /g | 8.885 +-0.361 | 8.297 +-0.335 | 8.828 +-0.367 | 9.047 +-0.370 | 8.512 +-0.352 | 7.125 +-0.311 **z=-7.2** | 6.600 +-0.298 **z=-9.6** | 3.170 +-0.187 **z=-27.6** | 4.545 +-0.253 **z=-19.3** |
| loc 10-20 /g | 15.39 +-0.396 | 15.11 +-0.390 | 15.53 +-0.404 | 15.56 +-0.423 | 15.51 +-0.427 | 14.54 +-0.395 **z=-3.0** | 14.15 +-0.355 **z=-4.6** | 14.58 +-0.455 | 15.02 +-0.459 |
| loc 20-30 /g | 7.313 +-0.267 | 5.920 +-0.235 **z=-7.7** | 6.985 +-0.269 | 7.010 +-0.263 | 7.168 +-0.278 | 6.855 +-0.251 | 5.893 +-0.237 **z=-7.8** | 5.867 +-0.258 **z=-7.6** | 7.355 +-0.273 |
| loc 30-45 /g | 7.440 +-0.263 | 2.967 +-0.162 **z=-28.3** | 6.728 +-0.240 **z=-3.9** | 6.760 +-0.243 **z=-3.7** | 7.418 +-0.279 | 8.425 +-0.283 **z=5.0** | 3.058 +-0.165 **z=-27.6** | 3.225 +-0.174 **z=-26.2** | 6.620 +-0.250 **z=-4.4** |
| loc 45+ /g | 6.418 +-0.234 | 6.317 +-0.265 | 6.478 +-0.239 | 6.210 +-0.227 | 6.440 +-0.245 | 6.393 +-0.249 | 6.100 +-0.241 | 6.310 +-0.247 | 6.388 +-0.263 |
| wrist/g | 35.06 +-0.640 | 36.20 +-0.642 | 36.15 +-0.647 | 35.08 +-0.613 | 34.68 +-0.654 | 33.53 +-0.629 **z=-3.3** | 34.14 +-0.592 | 31.50 +-0.630 **z=-7.8** | 30.87 +-0.623 **z=-9.2** |
| snap/g | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 |
| slap/g | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 | 0.000 +-0.000 |
| turnovers/game | 203 +-1.789 | 200 +-1.697 | 201 +-1.712 | 201 +-1.667 | 201 +-1.522 | 201 +-1.596 | 198 +-1.561 **z=-3.8** | 199 +-1.908 **z=-3.2** | 200 +-1.958 |
| pokes/game | 110 +-1.437 | 110 +-1.325 | 110 +-1.376 | 110 +-1.345 | 110 +-1.314 | 110 +-1.337 | 111 +-1.302 | 115 +-1.458 **z=4.7** | 113 +-1.481 **z=3.0** |
| penalties/game | 3.950 +-0.227 | 4.018 +-0.227 | 4.065 +-0.229 | 4.060 +-0.236 | 4.213 +-0.232 | 3.880 +-0.227 | 3.955 +-0.227 | 4.617 +-0.241 **z=4.0** | 4.447 +-0.239 **z=3.0** |
| home poss share | 0.496 +-0.009 | 0.496 +-0.009 | 0.497 +-0.009 | 0.495 +-0.009 | 0.497 +-0.009 | 0.492 +-0.009 | 0.497 +-0.009 | 0.492 +-0.012 | 0.494 +-0.011 |
| home faceoff win% | 0.498 +-0.021 | 0.496 +-0.020 | 0.511 +-0.021 | 0.503 +-0.020 | 0.493 +-0.020 | 0.506 +-0.021 | 0.503 +-0.021 | 0.492 +-0.020 | 0.495 +-0.021 |
| hits/game | 71.71 +-1.108 | 72.05 +-1.095 | 73.05 +-1.093 | 72.55 +-1.095 | 72.33 +-1.129 | 72.05 +-1.037 | 72.77 +-1.134 | 76.61 +-1.200 **z=5.9** | 75.94 +-1.223 **z=5.0** |
| home goals | 4.365 +-0.337 | 4.060 +-0.340 | 4.402 +-0.342 | 4.385 +-0.332 | 4.365 +-0.342 | 4.072 +-0.339 | 3.962 +-0.329 | 3.107 +-0.297 **z=-5.5** | 3.435 +-0.335 **z=-3.8** |
| away goals | 4.548 +-0.369 | 4.290 +-0.353 | 4.633 +-0.376 | 4.700 +-0.362 | 4.500 +-0.382 | 4.435 +-0.375 | 4.175 +-0.340 | 3.618 +-0.346 **z=-3.6** | 3.890 +-0.379 |
| goals P1 | 2.895 +-0.189 | 2.705 +-0.172 | 2.885 +-0.186 | 2.803 +-0.178 | 2.730 +-0.183 | 2.752 +-0.181 | 2.692 +-0.171 | 2.183 +-0.157 **z=-5.7** | 2.252 +-0.164 **z=-5.0** |
| goals P2 | 2.895 +-0.185 | 2.792 +-0.183 | 2.928 +-0.184 | 3.055 +-0.185 | 2.917 +-0.176 | 2.817 +-0.182 | 2.647 +-0.166 | 2.325 +-0.162 **z=-4.5** | 2.513 +-0.187 **z=-2.9** |
| goals P3 | 3.050 +-0.176 | 2.813 +-0.172 | 3.183 +-0.183 | 3.172 +-0.181 | 3.163 +-0.191 | 2.873 +-0.178 | 2.748 +-0.167 | 2.172 +-0.148 **z=-7.5** | 2.493 +-0.166 **z=-4.5** |
| goals OT | 0.072 +-0.025 | 0.040 +-0.019 | 0.040 +-0.019 | 0.055 +-0.022 | 0.055 +-0.022 | 0.065 +-0.024 | 0.050 +-0.021 | 0.045 +-0.020 | 0.068 +-0.025 |
| OT games frac | 0.072 +-0.025 | 0.040 +-0.019 | 0.040 +-0.019 | 0.055 +-0.022 | 0.055 +-0.022 | 0.065 +-0.024 | 0.050 +-0.021 | 0.045 +-0.020 | 0.068 +-0.025 |


(Full table also in docs/balance_study_400.md.)

## Findings
1. **Baseline: 8.9 goals (CI 8.5 to 9.3), 45.4 shots, 19.6 percent of attempts score, save% 0.657, pass completion 0.78, interception 0.095, home possession 0.496, home faceoff 0.498, 0.4 percent home bias in goals (4.4 v 4.5).** No home/away skew, no stuck games.
2. **What moved goals per game since pass 6: up from 6.7 to 8.9 (z=-8.8 for old79 vs base), real.** It is shot VOLUME (33 to 45 shots), not accuracy: goals per shot is flat (0.203 v 0.196, overlapping). Much of the extra volume is close-range shots (under 10 ft: 3.2 to 8.9 per game; 30 to 45 ft: 3.2 to 7.4). The old1b build (initial pass 7) already had 7.3 goals and 39.9 shots; the rest came later or from non-AI pass-7 changes. This study cannot attribute the whole 6.7 to 8.9 to one cause.
3. **AI one-timers are the main driver of shot volume**: noOT cuts shots 45.4 to 38.6 (z=-13) and one-timers from 10.4 to 2.4 per game (23 percent of shots down to 6 percent). But goals/game only moves 8.91 to 8.35 (CI overlap, z about 2.1, not significant) because one-timers convert at only 12.7 percent (below the 19.6 percent average), so they add volume at below-average quality. Shooting percent rises when they are removed (0.216). Statement supported: one-timers raise shots/game strongly; their effect on goals/game is at most about 0.6 and is NOT established.
4. **Slot feeds, slot range, and rebound crash (noSlot, slotShort, noCrash): no detectable effect on goals** (all within CI of base; slot feed only trims one-timers 10.4 to 8.4 and passes). noScreen lowers tap-in goals (3.74 to 3.27, z=-3.2) and tap-in shots (z=-6) with total goals 8.5 (not significant). noAI together: 8.14 goals (z=-3.0, borderline) and 35.8 shots. Effects are small and individually unproven for goals.
5. **Goalie**: save% is 0.683 (old79) and 0.707 (old1b) versus 0.657 now; the current goalie saves less of what it faces, but shots are also closer and more frequent (tap-in shots 7.5 to 15), and shot quality is not equal across builds. Not a clean goalie isolation. No evidence of an artificially weak goalie by itself; saves per game rose (14.1 to 16.6).
6. Poor-angle shots are 7 percent of shots (3.1 per game) and score at about 31 percent, similar to other close shots; not a measured problem. Pass interception rose from 0.078 (older builds) to 0.095 with completion unchanged (0.78): mild, not a defect (hits also fell 76 to 72 per game).
7. Penalties 4.0/game, pokes 110/game, turnovers 203/game, hits 72/game, goals by period 2.9/2.9/3.05 + 0.07 OT: stable and even.

## Conclusion on fixes
Data show a higher-scoring game than pass 6 but nothing broken: no stuck games, no home bias, even periods, sane completion and shooting percent, and the one measurable AI effect (one-timer volume) comes with BELOW-average conversion, so it is not inflating goals demonstrably. Per the brief, game code was left alone. If a lower scoring rate is wanted as a design choice, the supported lever is AI one-timer frequency (noOT removes 7 shots/game); this report does not show it changes goals/game.

## Acceptance ranges (`server/test_balance.js`, 40 games, about 20 to 30 s with 8 workers)
Mean of 40 games must lie in: goals/game 6.5 to 11.5; shots 38 to 53; goals/shot 0.15 to 0.25; save% 0.55 to 0.76; pass completion 0.72 to 0.84; interception 0.05 to 0.14; one-timer share 0.12 to 0.34; penalties 2.0 to 6.5; home possession 0.43 to 0.57; tap-in goals 2.2 to 5.5; no game may hit the tick limit. Ranges are about the 0.1 to 99.9 percent bootstrap band of 40-game means from the 400-game baseline, widened slightly. Two runs passed (offset 0: 9.6 goals, 47.6 shots; random offset 321107).

## Limitations / not verified
- Seeds make runs reproducible; with the default offset test_balance is deterministic (detects code changes, not luck). Use `--seed random` for fresh samples; a true-baseline run can still fail about once in a thousand.
- AI-vs-AI only, 9-minute games: human-controlled play, 12-15 minute defaults, penalties kill-time and shootouts are not covered. Real-hockey comparison (goals/shot) was not done; 0.20 per attempt is high versus real hockey but there is no external target here.
- Isolation switches change flow and are not paired; z values are Welch-style with no formal multiple-test correction. Old-build comparisons are confounded by unrelated pass-7 changes. The goalie was not isolated by code swap.
- Rebound/tap-in/angle categories are heuristics from shot origin; goal-to-shot attribution uses the last same-team shot within 3 s (tips and deflections attributed to the original shooter).
- Parity with the browser build or the online server was not checked; test_allteams, test_goalie, test_ratings, test_feel and test_sim were not rerun because game.html was not edited.
