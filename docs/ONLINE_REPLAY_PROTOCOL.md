# Online goal replay and goalie wind-up flag

## Replay break
- Client hello adds `caps:{replay:1}`. The server uses the break only if every connected player has it; otherwise behavior is unchanged.
- After a goal the sim keeps running through the celebration pause. When the pause ends (just before the faceoff setup) the sim sets `G.rbWait`, the snapshot carries `rb:1`, and the server stops ticking that room.
- server -> client `{t:'rb', ms}`: play the replay (client uses its own ring of the last 200 snapshots, from 75 frames before to 9 after the goal event, at 0.6x, about 4.7 s).
- client -> server `{t:'rbdone', skip}`: replay finished or skipped (tap/key). A client with nothing to replay answers at once.
- server -> client `{t:'rbend'}`: sent when all connected players are done or after `RB_MS` (env, default 8000). Snapshots then resume with the normal faceoff; clock and score are untouched during the break.
- Disconnect during the break counts as done (existing grace logic unchanged); a reconnect during the break is marked done and gets `start rejoin`, then `rbend`.
- Spectators: none exist.

## Goalie wind-up
Team snapshot `g:[x,y]` gets a third element `1` only while the sim's `goalie.windT>0`. Client sets `goalie.windT=.4` from it. Cost is about 0.01 percent of snapshot bytes.
