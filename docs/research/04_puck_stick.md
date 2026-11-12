# 04 Puck, stick and blade physics (research, 2026-11-12)

## Current state (game.html)
shoot() sets puck velocity from an aimed angle plus noise; kind (wrist/snap/slap/onetimer) only scales error and speed. Defenders block/deflect by a lane test with a dice roll, teammates tip by a lane test. pass() leads the target and sets owner=null with a cooldown. The puck is a 2D point with scripted ownership. There is no blade contact, no elevation, no spin.

## Hockey mechanics, what matters for a game
- Puck: 170 g, 76 mm dia, 25 mm tall. Ice friction is very low (mu about 0.02 to 0.05), so ice drag is nearly negligible. A small linear damp is enough. Boards bring restitution about 0.6 to 0.75 with tangential loss. Posts are circles with restitution about 0.5.
- Shot speed comes from stick flex plus weight transfer. Typical numbers: wrist 70 to 90 mph, snap 80 to 95, slap 90 to 105 and more. Backhands are slower and rise more. Lift comes from blade angle at release and from puck contact point (heel to toe).
- Pass reception is a soft contact. The blade absorbs relative velocity (cushion), and a failed cushion pops the puck off. Deflections are a reflection about the blade face normal with high damping. One-timers add stick speed to puck speed and increase the error.
- Stickhandling and protection are not a physics engine job in a game. Use a possession constraint (puck held at a blade offset from the body, with a pull toward that point), and a strip or poke event resolved by reach, angle and a timer.
- Elevation: a single scalar z with gravity, a ground bounce and a height cutoff for blockers and sticks is enough. No 3D rigid body is required.

## Engines

| Candidate | URL | License | Last push | Browser + Node | Fit and cost | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| Rapier (JS/WASM) | https://github.com/dimforge/rapier (JS now in /typescript; https://github.com/dimforge/rapier.js archived 2026-07-12) | Apache-2.0 (API) | 2026-07-12 | Yes, both. rapier-compat embeds WASM as base64 | Docs claim cross-platform determinism for the WASM build (same version, same inputs, snapshot hash). Includes CCD, 2D and 3D. Fast per step. Async WASM init, and the vm sandbox needs WASM exposed to it | Medium-high | Adapt only if puck goes physical. Best technical option |
| cannon-es | https://github.com/pmndrs/cannon-es | MIT | 2024-01-06 | Yes, pure JS | No CCD, so a 40 m/s puck tunnels through a 76 mm body. Stale | Medium | Reject |
| Ammo.js | https://github.com/kripken/ammo.js | zlib-style (LICENSE text matches zlib; API reports NOASSERTION) | 2026-09-22 | Yes, large asm/WASM build | Full Bullet, heavy, awkward API, overkill | High | Reject |
| planck.js | https://github.com/piqnt/planck.js | MIT | 2026-10-23 | Yes, pure JS, no WASM | 2D Box2D port with bullet/CCD flag, restitution, friction, circle posts and rink walls. Pure JS floating point is deterministic on one engine (V8 both sides) given identical op order. Cheap for tens of bodies | Low-medium | Adapt. Best fit for a 2D puck |
| matter.js | https://github.com/liabru/matter-js | MIT | 2026-09-30 | Yes, pure JS | Weak CCD, soft solver, known to jitter and tunnel. Wrong for fast pucks | Low | Reject |
| GMTurbo/Hockey | https://github.com/GMTurbo/Hockey | None (all rights reserved) | 2011-11-23 | Browser, jiglibjs | Air hockey toy, 3 stars | n/a | Reject (cannot copy) |
| witnessmenow/PuckOff | https://github.com/witnessmenow/PuckOff | None found | 2013-12-17 | Java LibGDX | Top-down hockey, old, no license | n/a | Study only, not read in depth |
| Other hockey repos found by API search | n/a | All null or hobby | mostly 0 stars | n/a | I found no maintained open source game with real stick, blade and puck code. | n/a | Nothing to adopt |

## Recommendation: puck-only engine or hand-tune?
Hand-tune, with a small custom puck integrator. Reasons:
1. Server authority. The server runs the game script in a vm at 30 Hz. A WASM engine adds init, vm-exposure and snapshot concerns. Pure JS (planck) avoids that, but every extra dependency in the vm must also be loaded identically by clients for prediction. Both sides must step with a fixed dt and identical inputs, and the client puck must still be snapped to server state.
2. The problems we actually have are not rigid-body problems. They are contact rules: when a blade touches the puck, with what speed and angle, and what animation event triggers it. An engine does not give blade-to-puck semantics. We still must write them.
3. What the engine would buy (wall bounce, post bounce, CCD) is about 60 lines: circle vs rectangle-with-rounded-corners, circle vs post circle, swept test per tick, restitution and tangential damping.
4. Blade contact driven by animation events is straightforward without an engine: an animation event (windup, release, cushion, poke) opens a short contact window, and the server resolves the puck velocity by formula. In an engine you would make the blade a kinematic body, which adds sync cost for no gain.

If you later want true rebounds off goalie pads, skates and many bodies, planck.js is the one to add (puck as a bullet circle body, everything else static or kinematic). Do not choose Rapier unless you go full 3D.

## Top 3 recommendations
1. Replace the dice-roll blocks and tips with a deterministic swept-circle puck integrator (fixed 30 Hz substepped x2 to 4, CCD against boards, post circles, goalie and skater capsules) with restitution and tangential loss. Add scalar z, vz, gravity and a bounce. Roughly 1 to 2 days.
2. Add a blade contact model driven by animation events: events open a window, with blade position, blade velocity and face normal. Shot speed = base + k * stick tip speed, spin and lift from blade angle and heel-toe contact point. Reception uses relative velocity to decide cushion, pop-off or deflection (reflect about the face normal with damping). One-timer = stick speed added, accuracy penalty. Poke check = reach arc plus timing. Roughly 3 to 4 days.
3. Keep possession as a spring constraint to the carrier's blade offset (with protection as an angle and body-shield modifier against strips), not as engine physics. If the custom integrator proves insufficient, prototype planck.js in the same vm with a fixed step and a determinism test (hash of state after N ticks on server and client).

## What I could not verify
- Actual bundle sizes and per-step costs (no benchmark run). Rapier WASM is roughly in the low MBs, planck roughly 200 KB minified; these are from memory, not measured.
- Whether the repo vm sandbox allows WebAssembly, and whether Node and browser floating point match bit for bit for planck (same V8 math except Math.sin/cos/etc., which Rapier docs also warn about).
- The Rapier npm package names after the monorepo merge, and whether the Apache-2.0 is the only license (I read the API metadata, not the LICENSE file).
- Ammo.js license: LICENSE text reads like zlib; API listed NOASSERTION.
- Real-world numbers (restitution, shot speeds) are general hockey knowledge, not sourced from papers in this session.
- GitHub search is shallow: I found no hockey game with real stick/puck source, but searches are keyword based. Puckit! (johnedvard/gamedevjs2024, Phaser) was named by a search but I did not open the repo.
