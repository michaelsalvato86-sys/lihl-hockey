# UE5 setup requirements (LIHL Mega Pass 10)

Status: written from Epic documentation and community reports on 2026-11-13. NOTHING was installed or executed. Unreal Engine and Visual Studio are not on this PC.

## 1. Versions (verified against Epic docs, 2026-11-13)
- Unreal Engine 5.8 is released (June 2026; 5.8.1 exists per the Epic forum). The Epic docs site header already reads "5.9 Documentation", so the Launcher may offer a newer build: install the version the Launcher lists as latest, or 5.8.x if you want to match the scaffold (`EngineAssociation` is 5.8).
- Visual Studio per Epic's 5.8 setup page: VS 2022 17.14 or later, or VS 2026 18.0 or later. Epic says "Use Visual Studio 2026 for general development" for 5.8; VS 2026 was only Experimental for 5.7 and unsupported for 5.6 and earlier. Choose VS 2026 for 5.8+, or VS 2022 17.14+ as the safe fallback.
- Documented toolchain: MSVC minimum 14.38, recommended 14.50; Windows SDK minimum 10.0.22621.0, recommended 10.0.26100 or newer; .NET 10.0 for VS 2026; LLVM 18.1.8 minimum, 20.1.8 recommended.
- Epic recommended hardware: Windows 11, quad-core 2.5 GHz or faster, 32 GB RAM, 8 GB or more VRAM, DirectX 12 GPU with latest drivers. This PC (Ryzen 9 5950X, 128 GB, RX 6900 XT 16 GB) exceeds all of it.

## 2. Disk space (this PC: C: 463 GB free, D: 3,751 GB free)
- Engine download is about 39 GB (one forum report for 5.8.1; Epic publishes no official figure; verify in the Launcher install dialog).
- Installed engine with source-built modules and symbols is large: reports range 35 GB (reported size) to about 220 GB on disk; installer needs up to 120-130 GB free as scratch during install.
- Recommendation: install the engine on D: (Launcher > Install > Browse). Keep projects on D: too (for example `D:\UE\LIHL_UE5_HOCKEY_POC`). Derived Data Cache and shader caches grow to tens of GB; point the DDC to D: if C: gets tight.
- Visual Studio with the Game workload: about 20-40 GB, installs to C: by default (can relocate the shared components only partially). C: has room.
- Budget: D: 250 GB for the engine plus first project; C: 40 GB for Visual Studio.

## 3. Download sizes and times (estimates, not measured)
Engine about 40 GB, Visual Studio about 10-15 GB download. At 200 Mbps: engine about 30 minutes, VS about 10 minutes; at 50 Mbps: engine about 2 hours. Extraction and shader compilation on the first project open: 20-60 minutes on a 5950X. First full C++ build of a small module: a few minutes; the first editor launch compiles shaders (10-30 minutes once).

## 4. Visual Studio workloads and components (from Epic's setup page)
Workloads: Game development with C++ (required); Desktop development with C++; .NET desktop development; .NET Multi-platform App UI development.
Individual components under Game development with C++: C++ profiling tools, C++ AddressSanitizer, Windows 10 or 11 SDK (10.0.18362 or newer; prefer 10.0.26100), Unreal Engine installer (optional, the Launcher install is separate). Also tick the MSVC v143/v144 x64/x86 build tools matching the table above.

## 5. GPU driver notes (RX 6900 XT, RDNA2)
- Current driver on this PC: 32.0.21045.16010. Update to the latest AMD Adrenalin before first launch; UE5 DX12 SM6 stability depends heavily on recent drivers.
- RDNA2 supports DXR 1.1, so hardware Lumen and virtual shadow maps work, but hardware ray tracing is much slower than on comparable NVIDIA cards. Start with software Lumen (`r.Lumen.HardwareRayTracing=0`, already in the scaffold ini), compare frame time, then try hardware.
- If the editor crashes in DX12, try the launch flag `-dx11` once to isolate, and `-ForceRHI`-style flags only for diagnosis. Keep Windows Graphics hardware-accelerated scheduling at its default.
- No driver was changed in this pass.

## 6. Install steps (all by you; none done)
1. Install Epic Games Launcher (already present at `C:\Program Files (x86)\Epic Games\Launcher`; a `D:\Epic Games\Launcher` folder also exists). Sign in with your Epic account (YOUR step; credentials are never entered by Claude).
2. Launcher > Unreal Engine > Library > Install Engine, version 5.8.x, install location `D:\UE`. Options: keep Editor symbols off for debugging unless needed (saves about 30+ GB); Windows target only; Starter Content off.
3. Install Visual Studio 2026 (or 2022 17.14+) Community with the workloads in section 4. Reboot.
4. In the Launcher open the engine once ("Launch") to complete first-run setup and shader compile.
5. Update the AMD driver.

## 7. Open and build the scaffold
1. Copy or open `unreal/LIHL_UE5_HOCKEY_POC` (from the p10-poc branch) at a short path, for example `D:\UE\LIHL_UE5_HOCKEY_POC` (Windows path limits bite UE projects).
2. Right click `LIHL_UE5_HOCKEY_POC.uproject` > Switch Unreal Engine version > pick the installed one > Generate Visual Studio project files.
3. Open `LIHL_UE5_HOCKEY_POC.sln`. Configuration `Development Editor`, platform `Win64`, startup project `LIHL_UE5_HOCKEY_POC`. Build (Ctrl+B).
4. Command line alternative (adjust the engine path):
   `"D:\UE\UE_5.8\Engine\Build\BatchFiles\Build.bat" LIHL_UE5_HOCKEY_POCEditor Win64 Development -Project="D:\UE\LIHL_UE5_HOCKEY_POC\LIHL_UE5_HOCKEY_POC.uproject" -WaitMutex`
   and project file generation: `"D:\UE\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe" -projectfiles -project="...uproject" -game -engine`.
5. Expect compile errors the first time: the scaffold was written without a compiler. Fix the lines tagged `TODO(verify on compile)` first and report them; see `unreal/LIHL_UE5_HOCKEY_POC/README.md`.

## 8. Enable Lumen, Nanite, Virtual Shadow Maps
Already set in `Config/DefaultEngine.ini` (DX12, SM6, Lumen GI and reflections, VSM, Nanite enabled project-wide, TSR). In the editor verify under Project Settings > Engine > Rendering: Dynamic Global Illumination Method = Lumen, Reflection Method = Lumen, Shadow Map Method = Virtual Shadow Maps, Support Nanite on, Default RHI = DirectX 12, Anti-Aliasing = TSR. Enable Nanite on static meshes (rink, stands) in the mesh editor; skeletal skaters are not Nanite. 5.8 also ships "Lumen Lite" and MegaLights per release news; evaluate later, not part of the scaffold.

## 9. First test
1. Create `/Game/Maps/L_RinkPOC`, import the DataTables (README step 5), create Enhanced Input assets (README step 6), press Play.
2. Pass criteria for the first run: it launches without crash; rink boxes and puck appear; scoreboard text shows; WASD moves a skater; console `stat unit` shows frame time; a puck shot into the goal volume increments the score.
3. Record frame time and compare to the web baseline (`docs/ENGINE_BASELINE_CAPTURE.md`).

## 10. What you must authorize (not done by Claude)
- Epic account sign-in and Epic EULA acceptance.
- Large downloads (engine about 40 GB, Visual Studio about 10-15 GB) and installing on D:.
- Installing Visual Studio and driver updates (admin rights, reboot).
- Any Marketplace or Fab asset acquisition (not needed for the POC; do not download third party assets without the license review in `LIHL_THIRD_PARTY_LICENSES.md`).
- Giving Claude permission to run builds on your PC.

## 11. What could break
- Windows path length or a project path with spaces/OneDrive: use a short D: path.
- Mismatched VS and engine versions (VS 2026 on UE 5.6 or earlier is unsupported).
- Missing Windows SDK or MSVC component: UBT reports "no compiler found".
- Scaffold compile errors (expected, see TODOs). Generated header `Data/LihlDataRows.h` must be regenerated with `python tools/export_unreal_data.py` if the data schema changes.
- DataTable import fails if the CSV does not match the row struct: columns are generated from the same schema, but never imported in Unreal yet.
- RDNA2 driver issues in DX12 or heavy hardware Lumen cost; fall back to software Lumen or lower Scalability.
- Fixed 30 Hz sim vs variable frame rate: the sim port runs per frame (variable dt), unlike the 30 Hz server tick; behavior may differ until a fixed-step accumulator is added.
- Real player photos referenced in `Players.csv` must not be imported into a build that may be published.
- Disk: engine plus DDC can pass 250 GB on D:.

Sources: Epic docs "Hardware and Software Specifications for Unreal Engine" and "Setting Up Visual Studio Development Environment for C++ Projects in Unreal Engine" (dev.epicgames.com, fetched 2026-11-13); Epic forum thread "Storage required to install unreal engine 5.8.1" (user reports); unrealengine.com news "Unreal Engine 5.8 is now available".
