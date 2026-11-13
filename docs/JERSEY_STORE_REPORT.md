# Jersey store report

Source: https://lihockey.org/store (88 products, 43 jerseys), read 2026-11-13. Each store team sells a Reversible (home + away) and a Single Color jersey. Slots: home = dark/main side, away = light side shown on the reversible mockup. No store team has a third/alternate jersey, so no alt slots exist. Colors sampled from product images with PIL palette clustering plus visual judgment; hex values are approximate.

| Abbr | Team | Jerseys | Slots |
|---|---|---|---|
| QF | Queens Finest | 0 | - |
| BREW | Brew Crew | 2 | home, away |
| LIK | Long Island Kings | 0 | - |
| PLT | Psychedelic Love Toast | 0 | - |
| SALT | Salty Dawgs | 0 | - |
| SCRP | Scrappers | 0 | - |
| QNS | Queens Spartans | 0 | - |
| BIRD | Dirty Birds | 2 | home, away |
| KCO | Kraken Cold Ones | 2 | home, away |
| SP | Slashing Pumpkins | 2 | home, away |
| AJ | Average Joes | 2 | home, away |
| BAB | Band-aid Brigade | 2 | home, away |
| HT | Hockey Time | 2 | home, away |
| HH | Hoagie's Heroes | 2 | home, away |
| SGS | Silly Goose Squad | 2 | home, away |
| PSS | Puck Slinging Slashers | 2 | home, away |
| MBH | Meatball Heroes | 2 | home, away |
| HTV | Hometown Villains | 2 | home, away |
| WOOL | Wooly Bullies | 2 | home, away |
| GG | Golden Goons | 2 | home, away |
| PIMP | Big Pimps | 2 | home (store), away (user-specified white version, not from the store) |
| OTL | Outlaws | 2 | home, away |
| GAHS | Greatest American Heroes | 2 | home, away |
| PPC | Paddyâ€™s Pub Crawlers | 0 | - |
| C | Chaos | 0 | - |
| D5 | District 5 | 0 | - |

Totals: 2 jerseys: 16; 1 jersey: 1; 3+: 0; none: 9.

## TEAMS WITH NO JERSEY IN THE STORE (nothing invented)
- QF Queens Finest
- LIK Long Island Kings
- PLT Psychedelic Love Toast
- SALT Salty Dawgs
- SCRP Scrappers
- QNS Queens Spartans
- PPC Paddyâ€™s Pub Crawlers
- C Chaos
- D5 District 5

## Teams with only ONE store jersey
- PIMP Big Pimps
(PIMP: the store shows only the pink side. PIMP now ALSO has a user-specified WHITE away (source "user request 2026-11-13", confidence "user-specified"), so the picker offers HOME and AWAY for it; the away is not a store jersey.)

## Store teams not in league.json
Tre Ol (navy home / white away, gold stripes), Roosters (black / white), Portuguese Man O War (black+blue / white+blue), Seal Team Six (black + neon green, single image), St. Beer (limited single jersey, stained glass; no team entry). Hometown Heroes store tag maps to HH (Hoagie's Heroes) by colors and HH tag (medium confidence on that mapping).

## Low or medium confidence
- BIRD, GG: low. Mockup photos with lighting; GG is Vegas style gold with grey sleeves.
- Medium: all others except AJ, BREW, HT, SP, WOOL (flat-lay templates, high).
- Away number and trim colors are read from the small away thumbnail; medium at best.
- Pants not extracted (null everywhere). Sock hex only set where product text states it (KCO purple/white, SP black/white, WOOL black/white, BAB navy/white).
- Pant shells exist for several teams but were not parsed.
- Product detail pages were not opened (store listing page and its images only).

## Follow-up: the 9 teams with no store jersey (site research)

Searched lihockey.org team pages, schedule, 7 completed game pages (QF, LIK, PLT, SALT, SCRP, PPC, C, D5 games), game photo galleries and the Hall of Champions. Result: team pages show only logo, colors and roster (no jersey images); the game pages checked have empty photo galleries (only game 705, a different team, has photos). No jersey photo of any of the 9 teams in this fall's jerseys was found. QNS has no games on the schedule yet.

All 9 therefore get a STANDARD TEMPLATE (source "standard-template (logo and colors from site)", confidence low): home = team color body, white away with team color trim, same logo (photos/teamN.png) as chest crest. These are NOT real jerseys and the away is NOT the team's real away jersey.

| Team | What was found | Confidence |
|---|---|---|
| QF Queens Finest | logo + colors #0061fe/#1a1a1a; template. Spring 2026 champion photo (old team_id 76) shows the team in white orange/blue Islanders style jerseys with an HTH crest, so likely league loaners, not their own | low |
| LIK Long Island Kings | logo + #4f2e78/#f7c945; template | low |
| PLT Psychedelic Love Toast | logo + #fb56ae/#ffe224; template | low |
| SALT Salty Dawgs | logo + #b92d5d/white; template | low |
| SCRP Scrappers | logo + white/#b51a00; template uses red accent as home body because the site main color is white. Summer 2026 champion photo (team_id 129) shows royal blue home and white away loaner style jerseys with HTH crest | low |
| QNS Queens Spartans | logo + #ffab01/#cc0005; template. No games scheduled, no photos | low |
| PPC Paddy's Pub Crawlers | logo + #01a000/#fffffa; template | low |
| C Chaos | logo + white/#ff0202; template uses red accent as home body (site main color is white) | low |
| D5 District 5 | logo + #009df5/#0077cc; template | low |

QF and SCRP also carry an "observed-loaner" entry (low confidence, colors eyeballed from screenshots, not sampled) describing the league standard blue/white/orange set seen in their champion photos. Not their own team design.

PIMP: added away entry "PIMP away: white version of the pink, user-specified" (confidence "user-specified"; trim colors reused from the home mockup).

Could not verify: any real jersey for these 9 teams this season; photos were not browsed beyond the pages above (the player profile photos and the 180-photo gallery of game 705 were not searched); loaner colors were not pixel-sampled.
