# LIHL Mega Pass 7 performance (2026-11-12)

Measured on a desktop RX 6900 XT, Chromium via Playwright, median of 3 runs x 60 frames, so only ratios mean anything. No phone was measured.

| Tier | Draw calls | Triangles | ms per frame |
|---|---|---|---|
| before, desktop 1280x720 | 168 | 335k | 3.3 |
| high (reflection plus 2048 shadow) | 291 | 764k | 7.8 |
| std (1024 shadow) | 232 | 621k | 4.4 |
| before, mobile 844x390 | 129 | 276k | 4.1 |
| mob (512 shadow) | 178 | 541k | 3.4 |
| low | 116 | 276k | 5.0 (noise, same geometry as before) |

Auto downgrade: smoothed frame time above 25 ms on two 90 frame checks steps high to std to low, or mob to low. Manual override `?q=high|std|mob|low`. The shadow pass doubles triangle count because each skater is about 25k triangles; a low-poly shadow proxy is the next saving.

Server: average snapshot 811 to 853 bytes (+5 percent, mostly the packed skate field and puck z); max 1196. CPU per tick 0.16 to 0.23 ms. About 25 KB/s per client at 30 Hz.

Not measured: phone frame rate, memory leaks in long sessions, ping separation on the live server.
