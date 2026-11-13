# LIHL_UE5_HOCKEY_POC (scaffold)

**STATUS: NOT COMPILED. NOT OPENED IN UNREAL. NOT EXECUTED.**
Unreal Engine and Visual Studio are not installed on the authoring PC (Mega Pass 10 audit), so nothing in this folder has been built or run.
The only things that were actually executed are the Python data exporter and its tests (`tools/export_unreal_data.py`, `tools/test_export_unreal_data.py`)
and a static consistency check (`tools/check_unreal_scaffold.py`, include targets and brace balance only, not a compile).
Expect compile errors on the first build. Lines tagged `TODO(verify on compile)` are the API calls I was least sure of.

## What is here
| Path | Purpose |
|---|---|
| `LIHL_UE5_HOCKEY_POC.uproject` | EngineAssociation `5.8` (Epic docs show 5.8 as current at authoring; docs site header already says 5.9, so check the Launcher). Switch to the installed version. |
| `Source/LIHL_UE5_HOCKEY_POC/LihlSimMath.h` | Engine-free C++17 port of `skate()` (game.html 561-592), goalie arc and save selection (736-756, 690-697), constants. Unit-testable outside Unreal. |
| `LihlRink`, `LihlPuck`, `LihlSkater`, `LihlGoalie`, `LihlGameMode`, `LihlBroadcastCamera`, `LihlHUD` | Actor classes (header/cpp pairs) with game.html line references in comments. |
| `Source/.../Data/LihlDataRows.h` | GENERATED FTableRowBase structs (FLihlTeamRow, FLihlPlayerRow, FLihlGoalieRow, FLihlJerseyRow, FLihlAnimEventRow). |
| `Content/Data/*.csv, *.json` | GENERATED DataTable files (27 teams, 385 players, 27 goalies, 57 jerseys, 31 anim events). Schema: `docs/UE5_DATA_SCHEMA.md`. |
| `Config/DefaultEngine.ini` | Starting graphics settings for the RX 6900 XT (Lumen software with a hardware RT toggle, Nanite, VSM, TSR, DX12 SM6). |
| `Tools/setup_editor.py` | Editor Python: imports the CSVs as DataTables. Unrun, API names from memory. |

## What is ported and what is not
Ported (math, from game.html): SKATE2 edge-radius turning, grip budget, hockey stop latch and pivot, backward skating, acceleration/momentum curve, max speed formula,
puck vertical physics and bounce, swept post collision, goal line crossing with crossbar logic, rounded-rink boards (keepIn), puck friction by state, carried-puck easing
with a capped step, pickup by blade contact, goalie arc targeting, lateral motion, reaction delay, save probability and save kind by puck height, broadcast camera follow.

NOT ported (the browser game is the reference): shooting kinds, aim error and one-timers, passing and reception rolls, checking and fights, penalties, line changes and
AI, faceoffs, overtime, replay, announcer, rebounds and freezes after saves, jersey painting, animation (no skeletal mesh or AnimInstance exists), audio, networking.

## Parity test idea (cheap, needs only a C++ compiler, no Unreal)
`LihlSimMath.h` has no Unreal includes. Compile it with MSVC/clang, feed `SkateStep` a recorded input sequence exported from the web game (`p.dvx, p.dvy, mx` and
resulting `p.vx, p.vy, p.fa`) and compare tick by tick. Do this BEFORE trusting the port; it is not done yet.

## Exact next steps
1. Do the install steps in `docs/UE5_SETUP_REQUIREMENTS.md` (Epic account sign-in is yours; Visual Studio 2022 with the Game development with C++ workload; engine on D:).
2. Right click `LIHL_UE5_HOCKEY_POC.uproject` > Switch Unreal Engine version (pick the installed one) > Generate Visual Studio project files.
3. Open the generated `.sln`, set `LIHL_UE5_HOCKEY_POCEditor` / `Development Editor` / `Win64`, Build. Fix compile errors (start with the `TODO(verify on compile)` lines). Report them; do not assume the scaffold builds.
4. Launch the editor from VS or by double clicking the uproject. Create folders `/Game/Maps` and `/Game/Data`.
5. Run `Tools/setup_editor.py` (Tools > Execute Python Script) or drag each `Content/Data/*.csv` into `/Game/Data` and choose the matching row struct.
6. Create Enhanced Input assets: `IA_Move` (Axis2D), `IA_Shoot`, `IA_Pass` (Digital), `IMC_Skater` mapping WASD/left stick to IA_Move, assign them on a Blueprint child of `LihlSkater`, and set that class as `SkaterClass` in the GameMode defaults.
7. Save an empty map `/Game/Maps/L_RinkPOC` and play. Expected first visible result: a boxy rink, a puck at centre, ten capsules, a goalie capsule each end, a scoreboard line. No models, no animation.
8. Capture baseline views per `docs/ENGINE_BASELINE_CAPTURE.md` and compare against `docs/engine_baseline/`.
