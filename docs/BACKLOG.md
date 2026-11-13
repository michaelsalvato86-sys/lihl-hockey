# LIHL backlog (do when there is a free block of tokens)

## 1. DONE 2026-11-13: Michael's team, the Whiskey Sticks (27th team, 3 jerseys, home/away/alt picker for all teams; deployed). Notes below kept for reference.
Goal: Michael's regular team plays in the game as a real team with real roster and jerseys.
- League: Island Ice Hockey (islandicehockey.com), weekend D2 division.
- Roster page (from Michael, 2026-11-13): https://www.islandicehockey.com/leagues/stats_1team.cfm?leagueID=6195&teamID=683802&clientID=2495 (Whiskey Sticks team stats and roster). Start here; fetch it with the browser or WebFetch, check names, numbers, positions, goalies. Find the Whiskey Sticks roster there (names, numbers, positions, goalies). Not LIHL, so this is a second league source.
- Jersey references (photos saved locally in assets_raw/whiskey_sticks/ref_01..06.jpg, NOT in git because they show people; assets_raw is already excluded from GitHub pushes). What the photos show:
  - DARK jersey (ref_01, 02, 06): black body, forest green shoulders and V-neck yoke, maroon/red and cream stripes at the chest and sleeves, a cream/maroon/green stepped tribal pattern band on the cuffs and hem, maroon pants and socks with the same pattern at the knees, black gloves. Front crest: the oval "Whiskey Stick" logo (pinup girl with hockey stick sitting on a whiskey bottle, red/orange script "Whiskey Stick", dark oval frame with radiating red rays). Numbers in cream with maroon trim (examples seen: 17, 27, 68). C and A patches.
  - WHITE jersey (ref_04, 05): white body, black and red stripes (two black bands with red between) at hem and sleeves, American flag patch on the shoulder, front crest: ornate framed oval "Whiskey Stick Hockey Club, est. 2023, Long Island, New York" with the pinup figure, red pants, small "Whiskey Stick Hockey Club Long Island NY" text on the pant leg, black and red numbers (examples: 1, 7, 8, 27, 66, 68, 91).
  - Logos (ref_03 is the hoodie): (1) oval pinup-on-bottle "Whiskey Stick" logo, (2) text logo "WHISKEY STICK HOCKEY CLUB" in red/gray varsity lettering around a gold hockey stick, (3) framed crest version with est. 2023 text.
  - Team numbers seen across photos: 1 (goalie), 4, 7, 8, 10, 17, 27 (captain), 66, 68, 91, among others; use the islandicehockey roster for the real list.
  - Colors to start from: black, forest green, maroon, cream, red; white, black, red.
- Jerseys: the team has two sets with about three different jersey designs in total. Pictures are in Michael's email (Gmail connector can search) or somewhere on his machine. Ask him to confirm which design is home and away before building.
- Build steps: add the team to data (see tools/build_league.py and data/color_overrides.json for how LIHL teams and colors are built), ratings from available stats or sensible defaults, jersey colors and stripes per design in the jersey system (costumes/skater3d jersey colors), add to the team picker and test_allteams (should become 27 teams), rebuild, run the test suite, deploy to https://lihl.duckdns.org and push to GitHub.
- UPDATE 2026-11-13 from Michael (requirements for the Whiskey Sticks build):
  - Goalie: Alex Andronikides. Other players: pull names from the islandicehockey roster; Discord handles can be found on the team Discord if needed.
  - Ratings: every Whiskey Sticks player gets a 60 rating (flat).
  - Michael is on this team: his skater uses the St. Beer jersey (existing St. Beer hook in skater3d.js), the rest of the team wears Whiskey Stick jerseys.
  - Three Whiskey Stick jerseys: BLACK (black, forest green yoke, maroon and cream, tribal trim), WHITE (black and red stripes, framed crest), PURPLE (new Mach 1 Gamewear design dated 1/31/26: purple PMS 7672C body, cream TCX-12-0804 and tan PMS 4645C stepped tribal bands at hem and sleeves with black pinstripes, cream numbers with tan and black outline, black V-neck collar, black pants, purple socks, Long Island map crest with pinup oval and 'Whiskey Stick' script, LIHL shoulder patch). Reference image saved locally as assets_raw/whiskey_sticks/ref_07_purple_template.jpg.
  - ALL LIHL teams get selectable HOME / AWAY / ALTERNATE jerseys: use the lihockey.org store (the same source as the existing jersey colors) to find each team's second and third jersey; where the store has no extra jersey for a team, list those teams for Michael instead of inventing one. Add a jersey picker (home/away/alt) to team selection, and make the game auto-use away for the visiting team when colors clash.
- Rule: if Michael is ever in the game he wears only the St. Beer jersey (separate memory note). The Whiskey Sticks are a separate team.
- Needs from Michael when we start: confirm roster page URL or division name, photos of the three jerseys.

## 2. Other open items
- Bigger Oracle machine (4 CPU ARM, 24 GB): all three Ashburn domains were out of capacity on 2026-11-12. Retry the create form at a quieter hour or try 2 CPU 12 GB.
- ElevenLabs: free plan only; wrestler and anime-gamer voices need a paid plan (Starter about 5 dollars a month). Clips for 472 lines already shipped with stock voices. About 2,900 free credits left this month.
- Rotate the ElevenLabs API key (it was pasted in chat).
- Hit and goalie animation variants that were only numerically checked: see LIHL_MEGA_PASS_7_REPORT.md.
- Play test on a phone and report feel issues (skating, hits, shots).
