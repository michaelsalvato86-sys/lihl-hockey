# Running LIHL Hockey from your own PC

Everything needed is in this folder (`C:\Users\Quantum\rec-hockey`, its own git repo).

1. Double-click `RUN_LOCAL.bat` (needs Node, already installed). The server also serves the game page.
2. Play yourself: http://localhost:8090
3. Friends:
   - Same Wi-Fi: http://<this PC's LAN IP>:8090
   - Tailscale (they install Tailscale and join your network): http://100.91.131.20:8090
   - Anyone on the internet needs a tunnel (cloudflared is installed: `cloudflared tunnel --url http://localhost:8090`) or a hosted server (Fly.io).
4. After editing the game, run `python build.py` (refreshes index.html and the server copy).

Fly.io copy: `deploy/` holds the deploy bundle (`flyctl deploy` from that folder). Rebuild it with:
`node tools/protect.js` then copy `dist` to `deploy/web` and `index.html` to `deploy/game_index.html`.
