# Mega Pass 10 third party licenses

Status words: Imported = actually in the repo or the shipped game. Referenced = only read for research. Nothing from this pass imported any third party code or asset. Licenses below come from the research agents' notes (sources in the per-topic research files) and several are unverified; "unverified" means do not rely on it without reading the license text yourself.

| Item | License | Commercial use | Redistribution | Status | Notes |
|---|---|---|---|---|---|
| three.js r128 (three.min.js) | MIT | yes | yes, keep notice | Imported (Pass 1) | existing |
| three.js Reflector.js (r128 examples) | MIT | yes | yes | Imported (Pass 7) | existing |
| Quaternius character models | CC0 per vendor | yes | yes | Imported (existing models/) | existing |
| Quaternius Universal Animation Library | CC0 per vendor site | yes | yes | Referenced | no skating or hockey clips; bone-name compatibility with our rig is good (UE4-mannequin style names) |
| ElevenLabs generated announcer clips (472 files, stock voices, free plan) | ElevenLabs terms | UNVERIFIED: the free plan has historically required attribution and may not allow commercial use | unverified | Imported (audio/ann, Pass 8) | ACTION NEEDED: read the current ElevenLabs free-plan terms before treating the game as commercial; a paid plan removes the question |
| Epic Game Animation Sample Project | Epic EULA, license text not found | free for use inside Unreal per summaries | Unreal only | Referenced | verify before use |
| Unreal Engine 5.8 | Epic EULA; royalty 5 percent above 1 million USD lifetime gross (third-party sources) | yes, with royalty | n/a | Referenced, not installed | |
| Mixamo animations | Adobe terms: royalty-free in a shipped game, raw files not redistributable | yes (per 2022 Adobe FAQ, current page unreadable) | no | Referenced | never commit raw Mixamo files |
| Hockey Player Animated (14 clips, 59.99 USD, Unity listing) | marketplace license, unverified | unverified | unverified | Referenced, not bought | Unreal listing price unverified |
| Hockey Goalie Animated (18 clips, 19.99 USD) | marketplace license, unverified | unverified | unverified | Referenced, not bought | |
| Roller Bladers pack (135 clips, 9.99 USD) | unverified | unverified | unverified | Referenced | |
| International Arena, Ice Hockey Environment (Fab, 249.99 USD, UE 5.5) | Fab license, unverified | unverified | unverified | Referenced, not bought | |
| CC0 hockey stick and CC-BY goalie mask (BlendSwap) | CC0 and CC-BY | yes (CC-BY needs attribution) | yes | Referenced | exact pages need a manual check |
| Olidal Sketchfab hockey collection (212 models) | per-model, unchecked | unchecked | unchecked | Referenced | |
| FS-Jump3D figure skating dataset | CC BY-NC-SA 4.0 | NO | share-alike | Rejected | non-commercial |
| AMASS motion data | non-commercial | NO | no | Rejected | |
| orangeduck/Motion-Matching | code MIT, animation data CC-BY-NC-ND | code yes, data NO | code yes | Referenced | never use the data |
| Recompiled NHL game projects (3on3NHL-recomp, wg3d-recomp, bardown) | derived from commercial binaries, two GPL | NO | NO | Rejected | proprietary derived content; do not use |
| wolfrats/hockey (Godot) | GPL-3.0 | only if our whole game is GPL | copyleft | Referenced, study only | from Pass 6 |
| Gameplay Football (C++ soccer) | two repos state different licenses; assets and engine unverified | unverified | unverified | Referenced, study only | |
| RoboCup agent2d / helios-base / librcsc | GPL/LGPL family (see Pass 6 notes) | copyleft implications | copyleft | Referenced, study only | |
| Chaos Networked Physics, Mover, DemoNetDriver (Unreal features) | part of Unreal under Epic EULA | yes | engine terms | Referenced | Mover is experimental |
| Yuka, planck.js, glTF-Transform, Poly Haven, Kenney | MIT / MIT / MIT / CC0 / CC0 | yes | yes | Referenced (Pass 6) | none imported |

Rules kept: no proprietary EA Sports NHL code, assets, animations or decompiled content was used. No third party code was copied. Players' photos and the team logos in the repo are league-supplied or team-supplied for this game; the Whiskey Stick logo crops come from the team's own jerseys (reference photos stay out of git).
