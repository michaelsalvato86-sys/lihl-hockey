# Multiplayer QA (Pass 9)

Method: server/test_net_parity.js (two ws bot clients, 25 s of random input, then a reconnect and a disconnect during the replay break), test_net, test_net2, test_reconnect_stale, test_net_replay. No browser pairs, no human players, no physical devices.

Results: 16/16 parity checks. Both clients logged 163 identical events (kind, id, player, sim tick, order); no duplicate ids; ticks monotonic; goal events carry a goal number; a reconnect mid-celebration receives the goal event; a disconnect during the replay break leaves the other client receiving the end-of-break message; logs agree again after the rejoin over 60 events.

Fixes: clients now use the server event ids (animation variants were seeded from per-client counters, so the same save could look different on each screen); client dedupe by id and goal number; stale events over 0.7 s dropped; wind-up pose expires on its own; win pose online.

Cost: about 7 bytes per event, around 0.2 percent of a snapshot. loadtest with 2 and 4 rooms: about 0.025 to 0.031 core per room (baseline 0.022; within noise on a shared machine).

Not tested: drawing equality on two real pages; foul reactions with two clients; long outages; real-network jitter.
