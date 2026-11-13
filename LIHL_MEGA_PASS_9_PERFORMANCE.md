# Performance (Pass 9)

Desktop headless Chromium on a shared machine, median of 3 runs x 60 frames with gl.finish; only ratios matter, noise about 1 ms. No phone.

| Tier | ms | draw calls | triangles |
|---|---|---|---|
| high (reflector every frame) | 8.0 | 293 | 684k |
| std | 3.9 | 155 | 342k |
| mob | 2.9 | 155 | 342k |
| low | 2.8 | 149 | 338k |

High tier cost rose from about 5.2 ms to 8.0 ms because the reflection now renders every frame (this fixes the swim). Auto downgrade verified by forcing 40 ms frames: high to std at frame about 359, then to low at about 539; score, clock, controlled player and camera preserved. No automatic upgrade path exists.

Server: test_sim average snapshot 833 bytes (baseline 849), 0.17 ms per tick, about 24 KB/s per client. Oracle micro (1 vCPU, 1 GB) safe estimate from docs/LOAD_TEST.md: about 2 rooms; MAX_ROOMS is set to 3.

Not measured: real phone frame rate, memory over long sessions, ping versus render separation on a device.
