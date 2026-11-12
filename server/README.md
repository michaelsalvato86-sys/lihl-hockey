# LIHL Hockey multiplayer server

Authoritative game server for online play. The browser sends only inputs (stick direction and button presses).
The server runs the real game simulation (the same code as the single player game, loaded from `game_index.html`),
and sends back positions, puck, clock, score, penalties and events at 30 Hz. Clients cannot report goals, possession
or scores, and a client can only ever control the team bound to its own socket.

## Status
- Built and tested locally. NOT deployed. The public GitHub Pages site does not include the Online Play button yet.
- Tested with scripts and a real two-browser run: rooms and invite links, public list, quick match, ready and countdown,
  a full game to FINAL, rematch, disconnect pause, reconnect, grace expiry (CPU takes over), host leaving, origin allow-list.
- Not done: client-side prediction (inputs feel RTT + about 110 ms of interpolation delay), phone touch testing of the lobby.

## Run it locally
```
cd server
npm install
npm start                      # listens on :8090
npm test                       # headless sim test (needs no network)
node test_net.js ; node test_net2.js   # end to end WebSocket tests (they start their own server)
```
Open the game from `localhost` (or a LAN address) and press Online Play. On localhost the page connects to ws://localhost:8090 automatically.

## Configuration (environment variables)
| Variable | Default | Meaning |
|---|---|---|
| PORT | 8090 | Port to listen on (hosts set this for you) |
| ALLOWED_ORIGINS | (empty = any) | Comma list of site origins allowed to connect. Set to `https://michaelsalvato86-sys.github.io` in production |
| GRACE_MS | 45000 | How long a match waits for a disconnected player before the CPU takes their team |
| MAX_ROOMS | 40 | Hard cap on simultaneous rooms |
| LIHL_TEST | unset | Test only: allows very short periods |

There are no secrets or API keys anywhere. Nothing sensitive goes into the frontend.

## Hosting options (verify current prices before choosing)
All three run the included Dockerfile and support WebSockets. Use `wss://` (the host provides TLS).
1. **Fly.io** (recommended): `fly launch --no-deploy`, `fly deploy`. A small always-on machine is a few dollars a month. `fly.toml` is included and keeps one machine running.
2. **Render**: new Blueprint from `render.yaml`. The free plan sleeps when idle (first connection waits about 30 s), a paid plan stays awake.
3. **Railway**: new project from this folder, set the variables above, it detects the Dockerfile.
Cost grows with simultaneous matches, not with total players: each running match uses about 0.1 ms of CPU per tick (3 ms per second) and 20 to 25 KB/s of bandwidth per player.
A single small instance comfortably runs dozens of matches. `MAX_ROOMS` protects it.

## Turning Online Play on for the public site
1. Deploy the server and note its URL, for example `wss://lihl-hockey-server.fly.dev`.
2. Put it in `config.js`: `window.LIHL_SERVER = 'wss://lihl-hockey-server.fly.dev';`
3. Publish the full build (`index.html`, `net.js`, `config.js`) instead of the public variant without online code (`make_public.py`).
4. Invitation links look like `https://michaelsalvato86-sys.github.io/lihl-hockey/?room=LIHL-7K92`.
You can also test any server without editing files: add `?server=wss://host` to the game URL.

## How reconnects work
The browser keeps a random token in sessionStorage. If the connection drops, it retries every 1.5 s and sends the token.
During the grace period the match is paused for both players. If the player returns, the match resumes. If not, the
remaining player continues against the CPU, and a leaving host does not end the match for the guest.

## Limits and honest notes
- Rooms live in memory. Restarting the server ends running matches.
- Anyone with a room code can join an open room, so share codes only with friends. Public rooms are listed.
- Names are cleaned to letters, numbers and basic punctuation. Messages are size and rate limited.
- No accounts and no persistence by design.
