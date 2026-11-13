"""Export the LIHL game data as Unreal Engine DataTable files plus matching C++ row structs.

Reads (same merge order as build.py): data/league.json, data/extra_teams.json, data/jerseys_store.json,
(optional) data/jerseys_user.json, data/color_overrides.json is already baked into league.json by tools/build_league.py.
data/roster.json is the merged file the game ships; the test compares our merge with it.
Writes into unreal/LIHL_UE5_HOCKEY_POC/:
  Content/Data/{Teams,Players,Goalies,Jerseys,AnimEvents}.{csv,json}
  Source/LIHL_UE5_HOCKEY_POC/Data/LihlDataRows.h   (generated FTableRowBase structs, same field names as the CSV columns)
  docs/UE5_DATA_SCHEMA.md, docs/UE5_EVENT_SCHEMA.md
NOTHING here was imported into Unreal (UE is not installed on this PC). The CSV/JSON follow the documented DataTable import format.

Usage: python tools/export_unreal_data.py   (run from anywhere)
"""
import csv, io, json, os, subprocess, sys, textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
UE = os.path.join(ROOT, 'unreal', 'LIHL_UE5_HOCKEY_POC')
DATA_OUT = os.path.join(UE, 'Content', 'Data')
HDR_OUT = os.path.join(UE, 'Source', 'LIHL_UE5_HOCKEY_POC', 'Data', 'LihlDataRows.h')
DOCS = os.path.join(ROOT, 'docs')


def P(*a): return os.path.join(ROOT, *a)


def jload(path):
    with open(path, encoding='utf-8') as f: return json.load(f)


# ---------------------------------------------------------------- sim math (ported from game.html) ----------------------------------
def clamp(v, a, b): return max(a, min(b, v))


def js_hash(s):
    """game.html line 287: hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)}"""
    h = 0
    for c in str(s):
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
        if h >= 0x80000000: h -= 0x100000000       # |0 wraps to int32
    return abs(h)


def skater_attrs(pid, rating):
    """game.html attrs() line 297-298. r0=(rating-20)/45 clamped, r=.3+.65*r0, j(k)=((hash(id+k)%100)/100-.5)*.22."""
    r0 = clamp((rating - 20) / 45, 0, 1)
    r = .3 + .65 * r0
    j = lambda k: ((js_hash(str(pid) + k) % 100) / 100 - .5) * .22
    return {
        'SimR': r,
        'SimSpd': clamp(.1 + .85 * r + j('a') * .7, 0, 1),
        'SimShot': clamp(r + j('b'), .05, 1),
        'SimPass': clamp(r + j('c'), .05, 1),
        'SimChk': clamp(r + j('d'), .05, 1),
        'SimDef': clamp(r + j('e'), .05, 1),
    }


def goalie_gl(rating, gaa, gp):
    """game.html mkTeam line 325. rated goalie: clamp(.38+.4*clamp((rating-20)/45,0,1),.38,.78); otherwise GAA blend:
    sh=(gaa*gp+3.4*4)/(gp+4); gl=clamp(.5+(3.4-sh)/11,.38,.78). Returns (gl, source)."""
    if rating is not None:
        return clamp(.38 + .4 * clamp((rating - 20) / 45, 0, 1), .38, .78), 'rating'
    g = float(gaa) if gaa not in (None, '') else 0.0   # JS: null*gp = 0
    sh = (g * gp + 3.4 * 4) / (gp + 4)
    return clamp(.5 + (3.4 - sh) / 11, .38, .78), 'gaa'


# ---------------------------------------------------------------- merge (build.py lines 52-86) ----------------------------------------
def norm_jersey(j):
    """build.py norm_jersey: store/extra jersey -> dict with color(body)/accent, drop None, source, confidence."""
    if isinstance(j, (list, tuple)): return {'slot': 'home', 'color': j[0], 'accent': j[1] if len(j) > 1 else '#ffffff'}
    o = {k: v for k, v in j.items() if v is not None and k not in ('source', 'confidence')}
    o['color'] = o.pop('body', None) or o.get('color')
    if 'accent' not in o: o['accent'] = o.get('stripe') or o.get('trim') or o.get('yoke') or '#ffffff'
    return o


def merge_game_data():
    data = jload(P('data', 'league.json'))
    ex = jload(P('data', 'extra_teams.json'))
    for k, v in ex['teams'].items():
        v = dict(v); v['jerseys'] = [norm_jersey(j) for j in v.get('jerseys', [])]
        if v['jerseys']: v['color'], v['accent'] = v['jerseys'][0]['color'], v['jerseys'][0]['accent']
        data['teams'][k] = v
    ids = {p['id'] for p in data['players']}
    data['players'] += [p for p in ex['players'] if p['id'] not in ids]
    gids = {g['id'] for g in data['goalies']}
    data['goalies'] += [g for g in ex['goalies'] if g['id'] not in gids]
    store = jload(P('data', 'jerseys_store.json'))
    for k, v in store.items():
        t = data['teams'].get(k)
        if t is None or t.get('jerseys'): continue
        js = [norm_jersey(j) for j in (v.get('jerseys') if isinstance(v, dict) else v) or []]
        if js and 'home' in {j.get('slot', 'home') for j in js}: t['jerseys'] = js
    if os.path.exists(P('data', 'jerseys_user.json')):
        for k, v in jload(P('data', 'jerseys_user.json')).items():
            t = data['teams'].get(k)
            if t is None or not t.get('jerseys'): continue
            have = {j.get('slot') for j in t['jerseys']}
            for j in v.get('jerseys', []):
                if j.get('slot') not in have: t['jerseys'].append(dict(norm_jersey(j), userSpecified=True))
    return data


# ---------------------------------------------------------------- schemas (single source for CSV, JSON, C++ and docs) -----------------
# (field, cpp type, description). Row name (first CSV column "Name") is separate and not a UPROPERTY.
TEAM_FIELDS = [
    ('TeamId', 'int32', 'LIHL team id (league site id; 990001 = Whiskey Stick, not an API team)'),
    ('Abbr', 'FString', 'Short code, e.g. QF'),
    ('DisplayName', 'FString', 'Full team name'),
    ('Division', 'FString', 'Division label from the league site'),
    ('IconPath', 'FString', 'Web-game logo path, relative to the repo (photos/teamNNN.png)'),
    ('IconAssetPath', 'FString', 'Suggested Unreal asset path after you import the PNG: /Game/Textures/TeamIcons/T_Team<id>'),
    ('Color', 'FString', 'Primary (jersey body) color #RRGGBB, after color_overrides'),
    ('Accent', 'FString', 'Accent color #RRGGBB'),
    ('HomeJersey', 'FString', 'Row name in Jerseys table for slot home ("" if none)'),
    ('AwayJersey', 'FString', 'Row name in Jerseys table for slot away ("" if none)'),
    ('AltJersey', 'FString', 'Row name in Jerseys table for slot alt ("" if none)'),
    ('PlayerCount', 'int32', 'Skaters exported with this team in TeamIds'),
    ('GoalieId', 'int32', 'Primary goalie id (most games played); 0 if none'),
]
PLAYER_FIELDS = [
    ('PlayerId', 'int32', 'LIHL player id (synthetic fill-ins use 910000+)'),
    ('DisplayName', 'FString', 'Player name'),
    ('PrimaryTeamId', 'int32', 'First team in TeamIds'),
    ('TeamIds', 'FString', 'All team ids, "|" separated (39 players are on two teams)'),
    ('JerseyNumber', 'int32', 'Jersey number; falls back to id%99 as game.html does when unpublished'),
    ('NumAssigned', 'bool', 'True when the number was not published and was assigned in the data'),
    ('Captaincy', 'FString', 'C or A or empty'),
    ('Rating', 'int32', 'Raw league rating 20..65 (real or division default)'),
    ('Band', 'FString', 'B (>=61), C (41..60), D (<=40)'),
    ('PhotoPath', 'FString', 'Web-game photo path or empty. Real photos: do NOT ship in a public build without consent'),
    ('SimR', 'float', 'Derived: .3+.65*clamp((Rating-20)/45,0,1)  (game.html attrs)'),
    ('SimSpd', 'float', 'Derived speed attribute 0..1, includes deterministic per-id jitter'),
    ('SimShot', 'float', 'Derived shot attribute .05..1'),
    ('SimPass', 'float', 'Derived pass attribute .05..1'),
    ('SimChk', 'float', 'Derived check attribute .05..1'),
    ('SimDef', 'float', 'Derived defense attribute .05..1'),
    ('SimStaminaStart', 'float', 'Stamina st at shift start (1.0); drains in the sim, not stored in data'),
    ('SimMaxSpeedFtS', 'float', 'Top speed ft/s at full stamina, normal difficulty: (24+20*SimSpd)*(.78+.22*1)'),
    ('SimAccelGain', 'float', 'ag=(.7+.6*SimSpd) used by skate() (x1.22 for the controlled player)'),
]
GOALIE_FIELDS = [
    ('GoalieId', 'int32', 'LIHL goalie id (synthetic 900000+team for teams without one)'),
    ('DisplayName', 'FString', 'Goalie name'),
    ('TeamId', 'int32', 'Team id'),
    ('JerseyNumber', 'int32', 'Number (default 30 in build_league.py, id%99 fallback in game.html)'),
    ('GamesPlayed', 'int32', 'gp'),
    ('Gaa', 'float', 'Goals against average; 0 when unpublished'),
    ('HasGaa', 'bool', 'False when the league site published no GAA'),
    ('Rating', 'int32', 'Raw rating when published (Whiskey Stick goalie, flat 60), else -1'),
    ('PhotoPath', 'FString', 'Web-game photo path or empty'),
    ('SimGl', 'float', 'Derived goalie skill 0.38..0.78. Rated: .38+.4*clamp((Rating-20)/45,0,1). Else GAA blend .5+(3.4-sh)/11'),
    ('SimGlSource', 'FString', 'rating or gaa: which formula produced SimGl'),
    ('SimReach', 'float', 'Save reach ft: 3.7+2.8*SimGl (game.html step(), save resolution)'),
    ('SimReactSec', 'float', 'Base reaction delay s: max(.1,.1+.07*(1-SimGl)) (goalieStep)'),
    ('SimMaxLateralFtS', 'float', 'vmax ft/s: 30+16*SimGl (goalieStep, difficulty 1.0)'),
]
JERSEY_FIELDS = [
    ('TeamId', 'int32', 'Owning team'),
    ('Slot', 'FString', 'home, away, alt or observed-loaner'),
    ('SlotIndex', 'int32', '0 home, 1 away, 2 alt, 3 observed-loaner (game uses JSLOTS home/away/alt only)'),
    ('JerseyName', 'FString', 'Descriptive name'),
    ('Style', 'FString', 'Painter style key (jerseys.js) or empty for the standard template'),
    ('Body', 'FString', 'Body color #RRGGBB (the "color" field)'),
    ('Accent', 'FString', 'Accent color'),
    ('Trim', 'FString', 'Trim color or empty'),
    ('Stripe', 'FString', 'Stripe color or empty'),
    ('Sleeve', 'FString', 'Sleeve color or empty'),
    ('Yoke', 'FString', 'Yoke color or empty'),
    ('Socks', 'FString', 'Socks color or empty'),
    ('NumberColor', 'FString', 'Number fill color or empty'),
    ('NumberTrim', 'FString', 'Number outline color or empty'),
    ('LogoPath', 'FString', 'Logo or crest path (web repo relative) or empty'),
    ('LogoPlacement', 'FString', 'e.g. chest crest'),
    ('Note', 'FString', 'Free text provenance note'),
]
EVENT_FIELDS = [
    ('EventId', 'FString', 'Animation event id as emitted by the sim (anim_events.js AEV.EVENTS key)'),
    ('Who', 'FString', 's skater, g goalie'),
    ('PriorityClass', 'FString', 'Priority class name'),
    ('Priority', 'int32', 'Numeric priority, higher wins (AEV.PRIO)'),
    ('PayloadFields', 'FString', 'Payload field names, "|" separated'),
    ('AnimStates', 'FString', 'Animation state labels this event can start, "|" separated'),
    ('DedupeSec', 'float', 'Same-event dedupe window seconds (AEV.DEDUPE, default .08)'),
    ('Source', 'FString', 'Where the sim emits it'),
    ('Note', 'FString', 'Notes'),
]
SCHEMAS = {
    'Teams': ('FLihlTeamRow', TEAM_FIELDS), 'Players': ('FLihlPlayerRow', PLAYER_FIELDS),
    'Goalies': ('FLihlGoalieRow', GOALIE_FIELDS), 'Jerseys': ('FLihlJerseyRow', JERSEY_FIELDS),
    'AnimEvents': ('FLihlAnimEventRow', EVENT_FIELDS),
}
SLOT_INDEX = {'home': 0, 'away': 1, 'alt': 2, 'observed-loaner': 3}


def s(v): return '' if v is None else str(v)


def jersey_rowname(tid, slot): return f'T{tid}_{slot}'


# ---------------------------------------------------------------- row builders ----------------------------------------------------------
def build_rows(data):
    teams, players, goalies, jerseys = [], [], [], []
    for tid_s, t in data['teams'].items():
        tid = int(tid_s)
        slots = {}
        for j in t.get('jerseys', []):
            slot = j.get('slot', 'home')
            if slot in slots: continue          # first wins, keeps RowNames unique
            slots[slot] = j
            jerseys.append(('Name', {
                'TeamId': tid, 'Slot': slot, 'SlotIndex': SLOT_INDEX.get(slot, 9), 'JerseyName': s(j.get('name')),
                'Style': s(j.get('style')), 'Body': s(j.get('color')), 'Accent': s(j.get('accent')), 'Trim': s(j.get('trim')),
                'Stripe': s(j.get('stripe')), 'Sleeve': s(j.get('sleeve')), 'Yoke': s(j.get('yoke')), 'Socks': s(j.get('socks')),
                'NumberColor': s(j.get('number')), 'NumberTrim': s(j.get('numberTrim')),
                'LogoPath': s(j.get('logo') or j.get('crest')), 'LogoPlacement': s(j.get('logoPlacement')), 'Note': s(j.get('note'))}, jersey_rowname(tid, slot)))
        gs = sorted([g for g in data['goalies'] if g['team'] == tid], key=lambda g: -(g.get('gp') or 0))
        teams.append(('Name', {
            'TeamId': tid, 'Abbr': t['abbr'], 'DisplayName': t['name'], 'Division': s(t.get('div')), 'IconPath': s(t.get('icon')),
            'IconAssetPath': f'/Game/Textures/TeamIcons/T_Team{tid}', 'Color': t['color'], 'Accent': t['accent'],
            'HomeJersey': jersey_rowname(tid, 'home') if 'home' in slots else '',
            'AwayJersey': jersey_rowname(tid, 'away') if 'away' in slots else '',
            'AltJersey': jersey_rowname(tid, 'alt') if 'alt' in slots else '',
            'PlayerCount': sum(1 for p in data['players'] if tid in p['teams']),
            'GoalieId': gs[0]['id'] if gs else 0}, f'T{tid}'))
    for p in data['players']:
        num = p.get('num'); pid = p['id']
        row = {'PlayerId': pid, 'DisplayName': p['name'], 'PrimaryTeamId': p['teams'][0], 'TeamIds': '|'.join(str(x) for x in p['teams']),
               'JerseyNumber': num if num is not None else pid % 99, 'NumAssigned': bool(p.get('numAssigned')), 'Captaincy': s(p.get('cap')),
               'Rating': p['rating'], 'Band': p['band'], 'PhotoPath': s(p.get('photo'))}
        a = skater_attrs(pid, p['rating']); row.update(a)
        row['SimStaminaStart'] = 1.0
        row['SimMaxSpeedFtS'] = (24 + 20 * a['SimSpd']) * (.78 + .22 * 1.0)
        row['SimAccelGain'] = .7 + .6 * a['SimSpd']
        players.append(('Name', row, f'P{pid}'))
    for g in data['goalies']:
        gl, src = goalie_gl(g.get('rating'), g.get('gaa'), g.get('gp') or 0)
        gaa = g.get('gaa')
        goalies.append(('Name', {
            'GoalieId': g['id'], 'DisplayName': g['name'], 'TeamId': g['team'], 'JerseyNumber': g['num'] if g.get('num') is not None else g['id'] % 99,
            'GamesPlayed': g.get('gp') or 0, 'Gaa': float(gaa) if gaa not in (None, '') else 0.0, 'HasGaa': gaa not in (None, ''),
            'Rating': g['rating'] if g.get('rating') is not None else -1, 'PhotoPath': s(g.get('photo')),
            'SimGl': gl, 'SimGlSource': src, 'SimReach': 3.7 + 2.8 * gl, 'SimReactSec': max(.1, .1 + .07 * (1 - gl)),
            'SimMaxLateralFtS': 30 + 16 * gl}, f"G{g['id']}"))
    return {'Teams': teams, 'Players': players, 'Goalies': goalies, 'Jerseys': jerseys}


def load_events():
    """Runs anim_events.js under node with a stub window (the file is cosmetic and exports module.exports)."""
    code = "global.window={};const A=require(process.argv[1]);process.stdout.write(JSON.stringify({EVENTS:A.EVENTS,PRIO:A.PRIO,RULES:A.RULES,DEDUPE:A.DEDUPE,GOALIE_KINDS:A.GOALIE_KINDS}))"
    out = subprocess.run(['node', '-e', code, P('anim_events.js')], capture_output=True, text=True, check=True, encoding='utf-8').stdout
    return json.loads(out)


def build_event_rows(ev):
    rows = []
    for k, e in ev['EVENTS'].items():
        cls = 'gpoke' if k == 'poke_g' else e['cls']
        rows.append(('Name', {
            'EventId': k, 'Who': e['who'], 'PriorityClass': cls, 'Priority': ev['PRIO'].get(cls, 0),
            'PayloadFields': '|'.join(x for x in e['d'].split(',') if x), 'AnimStates': '|'.join(e['anim']),
            'DedupeSec': ev['DEDUPE'].get(k, ev['DEDUPE']['default']), 'Source': e.get('src', ''), 'Note': e.get('note', '')}, k))
    return rows


# ---------------------------------------------------------------- writers ---------------------------------------------------------------
def fmt(v, cpp):
    if cpp == 'bool': return 'True' if v else 'False'
    if cpp == 'float': return repr(round(float(v), 6))
    if cpp == 'int32': return str(int(v))
    return str(v)


def write_csv(path, fields, rows):
    buf = io.StringIO(newline='')
    w = csv.writer(buf, lineterminator='\n')
    w.writerow(['Name'] + [f[0] for f in fields])
    for _, row, rn in rows:
        w.writerow([rn] + [fmt(row[f[0]], f[1]) for f in fields])
    with open(path, 'w', encoding='utf-8', newline='') as f: f.write(buf.getvalue())


def write_json(path, fields, rows):
    out = []
    for _, row, rn in rows:
        o = {'Name': rn}
        for fn, cpp, _d in fields:
            v = row[fn]
            o[fn] = bool(v) if cpp == 'bool' else int(v) if cpp == 'int32' else round(float(v), 6) if cpp == 'float' else str(v)
        out.append(o)
    with open(path, 'w', encoding='utf-8') as f: json.dump(out, f, indent=1, ensure_ascii=False); f.write('\n')


def gen_header():
    L = ['// GENERATED by tools/export_unreal_data.py. Do not edit by hand; rerun the tool.',
         '// NOT COMPILED: Unreal Engine is not installed on the authoring PC. Field names equal the CSV/JSON column names exactly.',
         '// Colors are #RRGGBB strings (FString) so the DataTable CSV imports without custom parsers; use LihlHexToColor() to convert.',
         '#pragma once', '', '#include "CoreMinimal.h"', '#include "Engine/DataTable.h"', '#include "LihlDataRows.generated.h"', '']
    for tbl, (st, fields) in SCHEMAS.items():
        L += ['/** Row of DataTable "%s" (Content/Data/%s.csv). */' % (tbl, tbl), 'USTRUCT(BlueprintType)',
              'struct %s : public FTableRowBase' % st, '{', '\tGENERATED_BODY()', '']
        for fn, cpp, d in fields:
            dflt = {'int32': ' = 0', 'float': ' = 0.f', 'bool': ' = false'}.get(cpp, '')
            L += ['\t/** %s */' % d, '\tUPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "LIHL")', '\t%s %s%s;' % (cpp, fn, dflt), '']
        L += ['};', '']
    L += ['/** Convert "#RRGGBB" (or "" -> fallback) to FLinearColor in sRGB-to-linear space. */',
          'inline FLinearColor LihlHexToColor(const FString& Hex, const FLinearColor& Fallback = FLinearColor::White)',
          '{', '\tif (Hex.IsEmpty()) { return Fallback; }',
          '\treturn FLinearColor::FromSRGBColor(FColor::FromHex(Hex)); // TODO(verify on compile): FColor::FromHex signature', '}', '']
    return '\n'.join(L)


def md_table(fields):
    L = ['| Column (UPROPERTY) | C++ type | Meaning |', '|---|---|---|']
    for fn, cpp, d in fields: L.append(f'| `{fn}` | `{cpp}` | {d.replace("|", "/")} |')
    return '\n'.join(L)


def gen_data_doc(counts):
    return textwrap.dedent('''\
    # UE5 data schema (generated by tools/export_unreal_data.py)

    Status: NOT IMPORTED INTO UNREAL. Unreal Engine is not installed on this PC (Mega Pass 10 audit), so these files are validated only by
    `tools/test_export_unreal_data.py` (row counts, unique row names, required columns, hex colors, jersey slot consistency, CSV round trip).
    The C++ row structs in `Source/LIHL_UE5_HOCKEY_POC/Data/LihlDataRows.h` have never been compiled.

    ## Files (unreal/LIHL_UE5_HOCKEY_POC/Content/Data/)
    Teams.csv (%(Teams)d rows), Players.csv (%(Players)d), Goalies.csv (%(Goalies)d), Jerseys.csv (%(Jerseys)d), AnimEvents.csv (%(AnimEvents)d), each with a `.json` twin.
    CSV format: UE DataTable import. First column header `Name` is the RowName; one column per UPROPERTY. Booleans are `True`/`False`.
    JSON format: array of objects, each with `"Name"` (RowName) plus one key per property (UE JSON DataTable import).
    Import in the editor: drag the CSV into the Content Browser, pick the matching row struct (FLihlTeamRow etc.), or in code use `UDataTable::CreateDataTableFromCSVString`.

    ## Source and merge order
    Same as build.py: data/league.json (built by tools/build_league.py, includes color_overrides.json) then data/extra_teams.json (Whiskey Stick, team 990001,
    own jerseys and a flat 60 rating), then data/jerseys_store.json for teams without jerseys of their own, then optional data/jerseys_user.json.
    The test compares this merge with data/roster.json (the file the game ships).

    ## Attribute scale (ported from game.html)
    - Raw `Rating` is 20..65. Skater `SimR=.3+.65*clamp((Rating-20)/45,0,1)` (game.html attrs(), line 297).
      `SimSpd=clamp(.1+.85*r+j('a')*.7,0,1)`, `SimShot/Pass/Chk/Def=clamp(r+j(k),.05,1)`, where `j(k)=((hash(id+k)%%100)/100-.5)*.22`
      and `hash` is the 31-multiplier int32 string hash (js_hash). Python reproduces JS exactly (tested against known values).
    - `SimMaxSpeedFtS=(24+20*SimSpd)*(.78+.22*st)` with st=1; the sim also multiplies by difficulty (`spd` .84/1/1.07), puck carry .97 and a controlled-player 1.06.
    - Goalie `SimGl`: rated goalies `clamp(.38+.4*clamp((rating-20)/45,0,1),.38,.78)`; others `clamp(.5+(3.4-sh)/11,.38,.78)` with `sh=(gaa*gp+3.4*4)/(gp+4)`.
    - Positions are not stored: the sim derives D/F lines per team from `(shot+spd)-(def+chk)` at game start (game.html line 318), so the table carries no position column.
    - Stamina `st` is runtime state, only its start value is exported.
    - Units: the sim is in FEET (rink 200 x 85 ft), time in seconds, 30 Hz server tick.

    ## Row structs
    ### FLihlTeamRow (Teams)
    %(t)s

    ### FLihlPlayerRow (Players). RowName `P<id>`
    %(p)s

    ### FLihlGoalieRow (Goalies). RowName `G<id>`
    %(g)s

    ### FLihlJerseyRow (Jerseys). RowName `T<teamId>_<slot>`
    Team rows reference these names in HomeJersey/AwayJersey/AltJersey. Every team has home and away; one team has alt; two teams carry an
    `observed-loaner` photo-observed jersey (kept for provenance, not offered by the game picker).
    %(j)s

    ### FLihlAnimEventRow (AnimEvents). RowName = event id
    %(e)s

    ## Known data caveats
    - `Rating` is real only for some players; others are division defaults with deterministic variation (build_league.py).
    - Players with real photos: PhotoPath references the web game's photo files; do not import them into a build that may be published.
    - Jersey `Body` for teams without their own jerseys is the standard template (confidence low in jerseys_store.json).
    ''') % {**counts, 't': md_table(TEAM_FIELDS), 'p': md_table(PLAYER_FIELDS), 'g': md_table(GOALIE_FIELDS), 'j': md_table(JERSEY_FIELDS), 'e': md_table(EVENT_FIELDS)}


def gen_event_doc(ev):
    L = ['# UE5 animation event schema (generated by tools/export_unreal_data.py from anim_events.js)', '',
         'Status: NOT consumed by any Unreal code yet. Unreal is not installed on this PC; the JSON was generated by running `anim_events.js` under Node.',
         'Purpose: lets an Unreal AnimInstance / event dispatcher listen to the same event ids the sim already emits (AE(player, kind, payload)).', '',
         '## Events', '', '| Event id | Who | Class | Priority | Payload | Animation states | Dedupe s |', '|---|---|---|---|---|---|---|']
    for k, e in ev['EVENTS'].items():
        cls = 'gpoke' if k == 'poke_g' else e['cls']
        L.append(f"| `{k}` | {e['who']} | {cls} | {ev['PRIO'].get(cls, 0)} | {e['d'].replace(',', ', ') or '-'} | {', '.join(e['anim']) or '-'} | {ev['DEDUPE'].get(k, ev['DEDUPE']['default'])} |")
    L += ['', '## Priority classes (higher wins)', '', ', '.join(f'{k}={v}' for k, v in sorted(ev['PRIO'].items(), key=lambda kv: -kv[1])), '',
          '## Interruption rules (verbatim from anim_events.js)', ''] + [f'- {r}' for r in ev['RULES']] + [
          '', '## Goalie event kinds', '', ', '.join(ev['GOALIE_KINDS'].keys()), '',
          '## Files', '', 'Content/Data/AnimEvents.json (full table: events, priorities, rules, dedupe, goalie kinds) and AnimEvents.csv (FLihlAnimEventRow).',
          '', '## Notes', '- `celebrate`, `dejected`, `win` are state-driven in the web game (p.celeb), not discrete events; an Unreal port should emit them explicitly.',
          '- `poke_g` is sent by the sim as kind `poke` on the goalie; anim_goalie maps it. The table lists it separately with class gpoke.', '']
    return '\n'.join(L)


def main():
    data = merge_game_data()
    tables = build_rows(data)
    ev = load_events()
    tables['AnimEvents'] = build_event_rows(ev)
    os.makedirs(DATA_OUT, exist_ok=True); os.makedirs(os.path.dirname(HDR_OUT), exist_ok=True)
    for tbl, (st, fields) in SCHEMAS.items():
        write_csv(os.path.join(DATA_OUT, tbl + '.csv'), fields, tables[tbl])
        if tbl != 'AnimEvents': write_json(os.path.join(DATA_OUT, tbl + '.json'), fields, tables[tbl])
    # AnimEvents.json is the rich document (not the flat DataTable twin); AnimEventsTable.json is the flat DataTable JSON
    write_json(os.path.join(DATA_OUT, 'AnimEventsTable.json'), EVENT_FIELDS, tables['AnimEvents'])
    rich = {'note': 'Generated from anim_events.js by tools/export_unreal_data.py. Not consumed by Unreal yet.',
            'events': [{'id': k, 'who': e['who'], 'class': 'gpoke' if k == 'poke_g' else e['cls'],
                        'priority': ev['PRIO'].get('gpoke' if k == 'poke_g' else e['cls'], 0),
                        'payload': [x for x in e['d'].split(',') if x], 'anims': e['anim'], 'dedupeSec': ev['DEDUPE'].get(k, ev['DEDUPE']['default']),
                        'src': e.get('src', ''), 'note': e.get('note', '')} for k, e in ev['EVENTS'].items()],
            'priorities': ev['PRIO'], 'dedupe': ev['DEDUPE'], 'rules': ev['RULES'], 'goalieKinds': list(ev['GOALIE_KINDS'].keys())}
    with open(os.path.join(DATA_OUT, 'AnimEvents.json'), 'w', encoding='utf-8') as f: json.dump(rich, f, indent=1, ensure_ascii=False); f.write('\n')
    with open(HDR_OUT, 'w', encoding='utf-8', newline='\n') as f: f.write(gen_header())
    counts = {k: len(v) for k, v in tables.items()}
    with open(os.path.join(DOCS, 'UE5_DATA_SCHEMA.md'), 'w', encoding='utf-8', newline='\n') as f: f.write(gen_data_doc(counts))
    with open(os.path.join(DOCS, 'UE5_EVENT_SCHEMA.md'), 'w', encoding='utf-8', newline='\n') as f: f.write(gen_event_doc(ev))
    print('exported', counts)


if __name__ == '__main__':
    main()
