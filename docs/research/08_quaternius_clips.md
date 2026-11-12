# 08 Quaternius Universal Animation Library (research only, nothing imported)

## Verified (fetched 2026-11-12)
Source: https://quaternius.com/packs/universalanimationlibrary.html
- License: CC0, "free to use in personal, educational and commercial projects"; no attribution required (we credit anyway).
- 120+ clips: eight-direction locomotion, jog, sprint, push, crawl, swim, sit, death, combat, gun, emotes.
- Tiers: Standard (roughly 60-70% of the pack, free), Pro (extra 30-40%, also free), Source (Blender files plus engine integrations, via Patreon or purchase).
- Rig described as a "universal humanoid rig", compatible with Unreal, Godot, Unity and "ready for retargeting".

## Our rig (verified in code, skater3d.js / anim_rig.js)
Bones: pelvis, spine_01..03, neck_01, Head, clavicle/upperarm/lowerarm/hand_{l,r}, thigh/calf/foot/ball_{l,r}, finger chains (index_01_l ...). Unreal-mannequin-like lowercase names, `_l`/`_r` suffixes.

## NOT verified (could not confirm from the page)
- Exact UAL bone names. The page does not list them. Do not assume they match ours (case such as `Head` vs `head`, `_l` vs `.L`, presence of ball_*/twist bones).
- Whether the glTF clips ship with the same bone hierarchy and rest pose as our Quaternius character models (different pack, may differ in proportions and T/A-pose).
- Which individual clips sit in the free Standard tier vs Pro.
- Any hockey/skating clip: none is listed; locomotion is walk/jog/sprint, so legs would be a poor skating match. Skating needs the procedural IK in this repo regardless.

## Recommended next step (small)
Download Standard glTF, list `skeleton.bones` names in a throwaway page, diff against SK.names. Only then consider retargeting idle/celebration/fall clips by bone-name map. Do not import locomotion for skating.
