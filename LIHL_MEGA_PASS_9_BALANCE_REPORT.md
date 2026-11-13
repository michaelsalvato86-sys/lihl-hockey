# Balance report (Pass 9)

Full 400-game study: LIHL_MEGA_PASS_8_BALANCE_REPORT.md (server/balance_study.js). Findings: 8.9 goals per game (95% CI 8.5 to 9.3); earlier 7, 9 and 10.5 were all consistent with that mean (per-game SD 3.8). The rise from about 6.7 goals per game at the end of Pass 6 came from shot volume (33 to 45 per game), mostly AI one-timers, while goals per shot stayed flat (0.20).

After the puck rework a one-timer age bug (G.clock counts down) made nearly every AI one-timer a miss: shots fell to 36 per game, pass completion to 0.695, one-timer share to 3 percent. Fixed; the 40-game check (server/test_balance.js) is back in range: goals per game 8.4, shots 41.2, goals per shot 0.205, save percent 0.647, pass completion 0.748, interception 0.080, one-timer share 0.146, penalties 3.85, home possession 0.498, tap-in goals 3.0.

No player or goalie was made worse to hit targets. Not studied: human-controlled play, longer games, the goalie in isolation.
