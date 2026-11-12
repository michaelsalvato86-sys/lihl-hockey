# 02 Skating research (LIHL Hockey)

Finding: no open source ice-skating or hockey-skating controller exists on GitHub in usable form. Searches (gh API + web) returned only air hockey and table hockey. Build in our own skate().

## Current skate() (game.html L474-489), summary
Per-player facing p.fa (turn rate limited: om=(2.5+11*(1-sp/mx))*ag, cap 14 ctl / 7.5 AI), forward speed vf along facing and lateral slip vs. Accel a=(36*(1-(vf/mx)^1.4)+6)*ag. Braking 48, reverse-intent brake 90. Lateral grip exp(-(4+9*(1-sp/mx))*dt), 40% of killed lateral speed is converted to forward (carve energy). Backward skating only when intent is >2.3 rad behind, slow, no puck. No edge state, no stride phase, no stop type, no crossover.

## Candidates
| Name | URL | License | Last commit | Lang | Browser/three | Solves | Effort | Verdict |
|---|---|---|---|---|---|---|---|---|
| GMTurbo/Hockey | https://github.com/GMTurbo/Hockey | none found (no license = all rights reserved) | 2011-11 | JS | three.js old + jiglibjs | air hockey, not skating | n/a | reject |
| edwinzhng/otterpuck | https://github.com/edwinzhng/otterpuck | MIT | 2026-09 | unverified | unverified | hockey game, skating model not inspected | low to read | study only (unverified) |
| digitizdat/ski | https://github.com/digitizdat/ski | GPL-3.0 | 2025-09 | JS, three.js | yes | ski carving, edge-angle turn analog | GPL taints | study only, do not copy |
| orangeduck/Motion-Matching | https://github.com/orangeduck/Motion-Matching | MIT | 2025-02 | C++ | no | reference motion matching (feature vectors, KD search, inertialization) | very high, needs mocap | study only |
| sweriko/ai4anim-webgpu | https://github.com/sweriko/ai4anim-webgpu | NOASSERTION (API says "Other"; upstream AI4Animation is non-commercial) | 2026-04 | TS, WebGPU, three | WebGPU only | neural motion matching, walking/quadruped | very high, no skating data | reject |
| omimo/MocapJS | https://github.com/omimo/MocapJS | MIT | 2016-11 | JS, three | yes | BVH playback | needs skating mocap | reject |
| three.js CCDIKSolver / SkeletonUtils | https://github.com/mrdoob/three.js | MIT | active | JS | native | foot IK, retargeting | medium | adapt (only if we go skinned rigs) |

Papers/refs (read as web summaries, not full text): Ideal Carving Equation for ski turns (arXiv 1812.02539), turn radius R = L*cos(edge angle)/(2 sin(...)) style sidecut relation, directly analogous to skate edge radius; coaching/physics pages on crossovers (uaf.edu ffden-2 student pages, low authority). Holden et al. Phase-Functioned NN and Learned Motion Matching are walking-focused: do not confuse with skating.

## Concrete takeaways for our skate() (derived from the physics, not copied code)
1. Edge model. Add p.edge in [-1,1] (lean). Turn radius from lean: R = Rmin / max(|edge|, .05); yaw rate = vf / R. Replace the current free-rotating om with: omega = vf/R, so slow turns are tight only by pivoting (C-cut), fast turns are wide. Suggested Rmin ~ 2.2 world units at vf=mx (tune to rink W,H).
2. Lean smoothing: edge += (target - edge)*min(1, dt*8); target = clamp(diff/1.2,-1,1)*min(1, vf/(.5*mx)). Drives visual body roll = edge*0.45 rad.
3. Centripetal grip budget: lateral accel cap a_lat = mu*g_game, mu ~ 1.1*|edge|+0.2. If vs exceeds cap, slide (grip *0.35). That gives hockey stop: hard turn >90 deg at speed sets edge=1 and grip=exp(-14*dt) with snow spray; replaces vf-=90*dt hack, add stop-type flag p.stopT for FX.
4. Stride phase. p.ph += dt*(1.6+2.2*vf/mx) rad cycles; thrust only on push half: a = a0*max(0, sin(ph))*1.9 (mean preserved = a0). Gives accel surges, drives leg animation and ice-scrape sound; sync to server by sending ph quantized (6 bits) or derive from tick*speed.
5. Crossover: when |diff|>.5 and vf>.4*mx and edge sustained, add acceleration bonus +25% (outside leg push) and a 0.15 s lock on turn direction; state p.xo = {dir,t}. Otherwise turning above 0.7*mx without a crossover bleeds speed exp(-.35*|omega|*dt) (existing .1 is too low).
6. Backward skating: keep p.back but add hysteresis (enter at >2.3 rad, exit <1.6) and cap speed .6*mx, accel 0.6x; transition forward-to-back through a 0.25 s pivot (mohawk turn) state rather than instant, with vf decay 0.5.
7. Weight transfer: on shot/pass/check, set p.wt=1 decaying exp(-6dt), reduce turn om by (1-.5*wt) and add 0.15 s accel dead time. Cheap and adds commitment.
8. Server authority: keep all of this deterministic on the server with fixed dt; send only (x,y,vx,vy,fa,edge,ph). Clients interpolate and render lean/stride from edge/ph.
9. Foot placement: no IK needed for blocky skaters; plant "ice scrape" events at ph zero crossings instead.

## Top 3 recommendations
1. Implement takeaways 1-3 (edge-radius turning plus grip budget plus true hockey stop) in skate(); highest feel gain, ~60 lines, no dependencies.
2. Add stride phase (4) and crossover state (5) for surge and animation hooks, and send ph and edge to clients.
3. Skim edwinzhng/otterpuck (MIT) after verifying its movement code; otherwise skip external code. Do not adopt motion matching: no skating mocap dataset, huge cost.

## Could not verify
- Contents/quality of otterpuck, bhenriot/neon-hockey-3d, sentinel-slapshot2 (no code read).
- Licenses of sweriko repo (reported "Other") and GMTurbo/Hockey (no LICENSE seen).
- Exact numeric constants above are my tuned starting points, not sourced from a paper; the ski carving paper and crossover pages were seen via search snippets only.
- facebookresearch motion matching repo paths returned 404; no skating-specific mocap or published skating controller paper found.
