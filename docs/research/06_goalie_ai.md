# 06 Sports AI and Goalie Behavior (research)

Date 2026-11-12. GitHub API rate limit hit mid-research, so some candidates are unverified (listed at end).

## Current LIHL goalie (read from game.html ~L555-600)
- Goalie moves on Y only. X is fixed at ownGX + 3.2..5 (no depth, no arc, no angle cutting).
- Target Y = puck Y, or shot-line intercept (with wall reflection), plus carrier vy*.32 lean. Clamped to MY +-4.4.
- Save is a dice roll (ps) with reach; save kind is cosmetic (pad/butterfly/glove/blocker/stick) and picks rebound angle/speed.
- Gaps: no angle management (depth by puck distance), no post-lean/RVH, no rebound steering to corners, no pass-aware cross-crease read beyond a single target hack, no "challenge out" on breakaways.

## Candidates
| Name | URL | License | Last push | Browser JS | Solves | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| Yuka | https://github.com/Mugen87/yuka | MIT | 2026-10-20 | Yes, vanilla JS, three.js friendly | Steering (arrive, pursuit, interpose, offset pursuit, separation, obstacle avoid), goal-driven arbitration, fuzzy module, state machines | Low to medium | ADAPT: lift Interpose/Arrive/Pursuit math or use directly for skater steering; do not need the whole engine |
| HELIOS base (agent2d successor) https://github.com/helios-base/helios-base | same | MIT (repo LICENSE) | 2026-10-24 | No, C++ | Situation-based formation: ball position drives Delaunay-triangulated formation-point interpolation; passes scored by lane/receiver quality | High to port, low to copy the idea | STUDY ONLY, port the concept |
| librcsc | https://github.com/helios-base/librcsc | LGPL-3.0 | 2026-07-13 | No, C++ | Underlying lib (body intercept, pass search, offside lines) | n/a | STUDY ONLY (LGPL, do not copy code) |
| rcssserver | https://github.com/rcsoccersim/rcssserver | LGPL-3.0 | 2026-11-05 | No | Simulator, not AI | n/a | REJECT |
| Google Research Football (Gameplay Football engine) | https://github.com/google-research/football | Apache-2.0 | 2025-06-17 (stale) | No, C++/Python | Built-in rule-based AI: role positions as formation offsets, pressing, marking | High | STUDY ONLY |
| OpenSteer | https://github.com/meshula/OpenSteer | NOASSERTION in GitHub metadata (MIT-style per upstream, unread) | 2023-03-31 | No, C++ | Same steering set as Yuka | n/a | REJECT, Yuka covers it |
| gdx-ai | https://github.com/libgdx/gdx-ai | Apache-2.0 | 2024-10-01 | No, Java | Reference BT, utility, steering design | n/a | STUDY ONLY |
| Buckland "Simple Soccer" (Programming Game AI by Example) | book code, ports unverified | unknown | unknown | ports exist, not verified | Support-spot scoring, goalie tending (interpose between ball and goal at a set distance), state machines | Low (concept) | ADAPT the algorithms from the book, no port needed |

## Algorithms to port (all small, pure JS, no dependency)

1. Goalie angle arc (Buckland GoalKeeper "TendGoal" idea, hockey-adapted).
   Goalie stands on a shallow arc in front of the crease. Compute unit vector from net center to puck (a). Position = netCenter + a * depth, where depth = clamp(0.35 + 0.012*puckDist, 0.5, 1.6) in game units scaled to your crease (cap by crease radius). This bisects the shooting angle automatically and fixes the "stays on goal line" look. Replace the fixed x term at L598. Challenge: if carrier is alone, dist < 22 and no defender between, step depth up by 40% (lower on deke because speed is capped by existing flipT).
2. Post integration. If puck is below the goal line behind net plane or at |y-MY| > 8 with x near the end boards, snap goalie to the near post (y offset 0.8 from post, x on line) instead of following Y. Cheap and stops wraparound goals.
3. Interpose with lead (Yuka InterposeBehavior): target = point on segment goal center to puck at fraction depth; for a shot use existing intercept but compute it in the arc coordinates, then lerp toward it with reaction delay = (1.0 - gl)*0.12s so rating changes reaction, not just reach.
4. Save-type from geometry (replace random hh): high shot (z or speed class) glove/blocker by side, low and wide pad or butterfly with reach penalty, close low central butterfly, rebound steering: bias rebound angle away from the slot toward the nearest corner (you already do cs bias; scale by goalie gl so good goalies steer rebounds, add freeze probability when no attacker within 6 units of puck).
5. Support-spot scoring (Buckland SupportSpot calculator). Grid candidate spots near the carrier; score = pass-safe (+1 if lane clear, uses your laneClear) + shot-chance (+ shotQ at spot) + distance-to-ideal-pass-range (gaussian around 25). Best spot becomes the supporting forward's target. Replaces ad hoc offense formation offsets.
6. Situation-based formation (HELIOS/agent2d). Store 3 to 5 formation anchor sets (puck in D zone left, neutral, offensive, etc.) per role. Blend between anchor sets by puck position with inverse-distance weights (cheaper than Delaunay, same effect). Add role modifiers: F1 pressure puck carrier, F2 slot support, F3 high lane, D pinch only when a teammate covers. This is a drop-in for formation().
7. Passing lane cost. Lane blocked if any defender within 1.2 units of the segment AND closing faster than the puck pass time; pass score = lane clearance * receiver openness - interception risk. Already partly in laneClear; extend with time-to-intercept (distance / skater speed vs pass time).
8. Forecheck/backcheck. F1 pursues with Yuka Pursuit (predict carrier by dist/speed), F2 cuts the nearest outlet lane (offset between carrier and best outlet), F3 holds high. Backcheck: after turnover, nearest forward goes goal-side of the carrier (interpose between carrier and own net), others fall to net-front zones.
9. Utility selection. Do not add a BT library. A single scoring loop (score each action, pick max, hysteresis of 0.25s) inside aiPlayer is enough; libraries add weight in a no-build vanilla codebase.

## Top 3 recommendations
1. Goalie arc + post integration + reaction delay (items 1 to 3). Smallest change (edit ~3 lines at L598), largest visible win, zero dependencies. Medium risk: re-test goals/game to keep scoring around current level.
2. Situation-based formation blending plus role modifiers (item 6, 8). Fixes bunching and puck chasing, fits formation()/cover().
3. Support-spot scoring for the non-carriers (item 5) and time-aware pass lanes (item 7). Improves passing and shot variety; extends shotQ and laneClear.
Yuka: copy only the Interpose/Pursuit formulas by reading the MIT source; adding the full lib is optional.

## Could not verify
- GitHub rate limit hit: no repo search for JS behavior-tree/utility libs, no hockey AI repos, no Buckland ports. Their names/licenses are NOT claimed.
- Did not read helios-base source; formation (Delaunay interpolation) claim comes from the README's cited paper and my background knowledge, not from code I read.
- OpenSteer exact license text not read (metadata says NOASSERTION).
- Google Football built-in AI details from memory, not source reading.
- Last meaningful commit dates are repo pushed_at, which may include trivial commits.
- Proposed numbers (depth, reaction delay) are starting points, untested in LIHL.
