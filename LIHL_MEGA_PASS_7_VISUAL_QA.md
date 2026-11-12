# LIHL Mega Pass 7 visual QA (2026-11-12)

Rendered frames were looked at by the agents in the Playwright harness (not by a person playing). The 26 scenarios from the brief:

| # | Scenario | Result |
|---|---|---|
| 1 | Forward skating | viewed, sound |
| 2 | Backward skating | viewed, trailing leg looks stretched |
| 3 | Crossovers | harness state only, frame not examined |
| 4 | Tight turn | viewed (front view) |
| 5 | Wide turn | not viewed |
| 6 | Hockey stop | viewed (two pose frames, one forced spray frame); not seen in a live game |
| 7 | Pivot | harness state only |
| 8 | Stickhandling | viewed (carry, top view) |
| 9 | Puck pickup | not visually verified |
| 10 | Forehand pass | viewed via pass_act release check numerically; frame not examined |
| 11 | Backhand pass | not verified |
| 12 | Receiving | not verified |
| 13 | One-timer | viewed ready stance and whiff |
| 14 | Wrist shot | harness state; frame not examined |
| 15 | Slap shot | viewed, blade on puck at release |
| 16 | Backhand shot | not verified |
| 17 | Body check | not verified beyond harness states |
| 18 | Board collision | viewed (board fall) |
| 19 | Fall | viewed forward, back, board, knees; stumble not examined |
| 20 | Recovery | knees recovery in harness only |
| 21 | Goalie butterfly | viewed |
| 22 | Goalie pad save | viewed |
| 23 | Goalie glove save | viewed |
| 24 | Rebound | numeric only |
| 25 | Goal replay | viewed replay frames, data test 0 mismatches |
| 26 | Multiplayer interaction | not visually verified (automated net tests only) |

Also viewed: ice before and after (glossy, reflections, shadows on high), faceoff, open play, goal zoom, celebration. Not viewed: phone portrait, low tier, goalie camera, penalty or line change mid replay.
Final merged build: 3,600 sim steps with draws ran with no script errors; a screenshot of it was not used because the browser lost its WebGL context after many test tabs.
