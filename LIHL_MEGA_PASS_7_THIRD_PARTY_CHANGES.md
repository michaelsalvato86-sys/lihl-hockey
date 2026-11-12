# LIHL Mega Pass 7 third party changes (2026-11-12)

- Added `lib/Reflector.js`: the three.js r128 `examples/js/objects/Reflector.js`, unmodified, MIT (r128 LICENSE checked). Loaded lazily on the high graphics tier only.
- No new npm dependencies. No physics engine. No GPL or unlicensed code copied.
- Quaternius Universal Animation Library: vendor page states CC0; bone names and rig compatibility not verified; nothing imported. Notes with sources in docs/research/08_quaternius_clips.md.
- Poly Haven HDRIs and Kenney assets: not added. The environment map is procedural.
- Graphics notes and sources: docs/research/09_graphics_pass7.md.
- Hosting: Oracle Cloud Always Free guide and script (deploy/oracle_setup.sh) use Docker (docker.io) and Caddy from Ubuntu packages on the server only.
