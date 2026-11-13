"""Tests for tools/export_unreal_data.py. Run: python tools/test_export_unreal_data.py
Validates the generated files only. NOTHING here proves the files import into Unreal (UE is not installed)."""
import csv, json, math, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export_unreal_data as X

fails = []
def chk(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

X.main()
D = X.DATA_OUT
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
def rd_csv(n):
    with open(os.path.join(D, n + '.csv'), encoding='utf-8', newline='') as f: return list(csv.reader(f))
def rd_json(n):
    with open(os.path.join(D, n + '.json'), encoding='utf-8') as f: return json.load(f)

ship = X.jload(X.P('data', 'roster.json'))
merged = X.merge_game_data()
chk(set(merged['teams']) == set(ship['teams']), 'merge reproduces roster.json team ids')
chk({p['id'] for p in merged['players']} == {p['id'] for p in ship['players']}, 'merge reproduces roster.json player ids')
chk({g['id'] for g in merged['goalies']} == {g['id'] for g in ship['goalies']}, 'merge reproduces roster.json goalie ids')
chk(all(merged['teams'][k]['color'] == ship['teams'][k]['color'] for k in ship['teams']), 'team colors equal roster.json')

tabs = {}
for tbl, (st, fields) in X.SCHEMAS.items():
    rows = rd_csv(tbl)
    hdr, body = rows[0], rows[1:]
    chk(hdr == ['Name'] + [f[0] for f in fields], f'{tbl}: header = Name + schema columns')
    chk(all(len(r) == len(hdr) for r in body), f'{tbl}: every row has {len(hdr)} cells')
    names = [r[0] for r in body]
    chk(len(set(names)) == len(names) and all(names), f'{tbl}: RowNames unique and non-empty ({len(names)})')
    chk(not any(re.search(r'\bnan\b|\binf\b', c, re.I) for r in body for c in r if c in ('nan', 'inf', '-inf', 'NaN')), f'{tbl}: no NaN/inf cells')
    # round trip: CSV cells parse back to the in-memory values
    ok = True
    for r, (_, row, rn) in zip(body, X.build_rows(merged)[tbl] if tbl != 'AnimEvents' else X.build_event_rows(X.load_events())):
        if r[0] != rn: ok = False; break
        for cell, (fn, cpp, _d) in zip(r[1:], fields):
            v = row[fn]
            if cpp == 'int32': good = int(cell) == int(v)
            elif cpp == 'float': good = abs(float(cell) - float(v)) < 1e-6 and math.isfinite(float(cell))
            elif cpp == 'bool': good = (cell == 'True') == bool(v) and cell in ('True', 'False')
            else: good = cell == str(v)
            if not good: ok = False; print('   mismatch', tbl, rn, fn, cell, v)
    chk(ok, f'{tbl}: CSV parses back to the same values (round trip)')
    js = rd_json(tbl if tbl != 'AnimEvents' else 'AnimEventsTable')
    chk(len(js) == len(body) and [j['Name'] for j in js] == names, f'{tbl}: JSON twin has same rows and order')
    chk(all(list(j.keys()) == ['Name'] + [f[0] for f in fields] for j in js), f'{tbl}: JSON keys = schema')
    chk(all(isinstance(j[f[0]], (int, float)) and not isinstance(j[f[0]], bool) and math.isfinite(j[f[0]]) for j in js for f in fields if f[1] in ('int32', 'float')), f'{tbl}: JSON numerics finite')
    tabs[tbl] = [dict(zip(hdr, r)) for r in body]

T, Pl, G, J = tabs['Teams'], tabs['Players'], tabs['Goalies'], tabs['Jerseys']
chk(len(T) == 27, 'Teams: 27 rows')
chk(len(Pl) == len(ship['players']) == 385, f'Players: {len(Pl)} = roster.json players')
chk(len(G) == 27 and len(G) == len(ship['goalies']), 'Goalies: 27 rows = roster.json goalies')
chk({int(g['TeamId']) for g in G} == {int(t['TeamId']) for t in T}, 'every team has exactly one goalie row team')
chk(all(HEX.match(t['Color']) and HEX.match(t['Accent']) for t in T), 'Teams: Color and Accent are #RRGGBB')
bad = [(j['Name'], c) for j in J for c in ('Body', 'Accent', 'Trim', 'Stripe', 'Sleeve', 'Yoke', 'Socks', 'NumberColor', 'NumberTrim') if j[c] and not HEX.match(j[c])]
chk(not bad, f'Jerseys: all non-empty color cells are #RRGGBB {bad[:3]}')
chk(all(HEX.match(j['Body']) and HEX.match(j['Accent']) for j in J), 'Jerseys: Body and Accent always present')
jn = {j['Name']: j for j in J}
chk(all(t['HomeJersey'] in jn and t['AwayJersey'] in jn for t in T), 'Teams: every team has home and away jersey rows that exist')
chk(all(not t['AltJersey'] or t['AltJersey'] in jn for t in T), 'Teams: AltJersey references resolve')
chk(all(jn[t['HomeJersey']]['TeamId'] == t['TeamId'] and jn[t['HomeJersey']]['Slot'] == 'home' for t in T), 'Jerseys: home slot rows belong to the right team')
chk(all(int(j['TeamId']) in {int(t['TeamId']) for t in T} for j in J), 'Jerseys: no orphan team ids')
chk(len({(j['TeamId'], j['Slot']) for j in J}) == len(J), 'Jerseys: (team, slot) unique')
chk(sum(1 for j in J if j['Slot'] == 'alt') == 1 and sum(1 for t in T if t['AltJersey']) == 1, 'Jerseys: exactly one alt jersey (Whiskey Stick)')
diff = [t['Abbr'] for t in T if t['Color'].lower() != jn[t['HomeJersey']]['Body'].lower()]
print('     info: teams whose Color differs from home jersey Body (color_overrides vs store):', diff)
chk(all(int(t['PlayerCount']) == sum(1 for p in Pl if int(t['TeamId']) in [int(x) for x in p['TeamIds'].split('|')]) for t in T), 'Teams: PlayerCount matches Players')
chk(all(int(t['GoalieId']) in {int(g['GoalieId']) for g in G} for t in T), 'Teams: GoalieId resolves')
chk(all(int(p['PrimaryTeamId']) in {int(t['TeamId']) for t in T} for p in Pl), 'Players: PrimaryTeamId resolves')
chk(all(20 <= int(p['Rating']) <= 65 for p in Pl), 'Players: raw rating within 20..65')
for k in ('SimR', 'SimSpd', 'SimShot', 'SimPass', 'SimChk', 'SimDef'):
    chk(all(0 <= float(p[k]) <= 1 for p in Pl), f'Players: {k} within 0..1')
chk(all(float(p['SimShot']) >= .05 and float(p['SimDef']) >= .05 for p in Pl), 'Players: attribute floors .05 held')
chk(all(0.38 <= float(g['SimGl']) <= 0.78 for g in G), 'Goalies: SimGl within .38..78')
chk(any(g['SimGlSource'] == 'rating' for g in G) and any(g['SimGlSource'] == 'gaa' for g in G), 'Goalies: both formula branches exercised')
wsk = [g for g in G if g['SimGlSource'] == 'rating'][0]
chk(abs(float(wsk['SimGl']) - (.38 + .4 * (60 - 20) / 45)) < 1e-6, 'Goalie rating 60 -> gl = .38+.4*(40/45)')

# js_hash and attrs vs real JS (node), 5 samples
js = """const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
function attrs(p){const r0=clamp((p.rating-20)/45,0,1),r=.3+.65*r0,j=k=>((hash(p.id+k)%100)/100-.5)*.22;
return{r,spd:clamp(.1+.85*r+j('a')*.7,0,1),shot:clamp(r+j('b'),.05,1),pass:clamp(r+j('c'),.05,1),chk:clamp(r+j('d'),.05,1),def:clamp(r+j('e'),.05,1)}}
const R=JSON.parse(process.argv[1]);process.stdout.write(JSON.stringify(R.map(p=>attrs(p))))"""
samp = ship['players'][::40]
out = json.loads(subprocess.run(['node', '-e', js, json.dumps([{'id': p['id'], 'rating': p['rating']} for p in samp])], capture_output=True, text=True, check=True).stdout)
good = True
for p, a in zip(samp, out):
    b = X.skater_attrs(p['id'], p['rating'])
    for k, kk in (('r', 'SimR'), ('spd', 'SimSpd'), ('shot', 'SimShot'), ('pass', 'SimPass'), ('chk', 'SimChk'), ('def', 'SimDef')):
        if abs(a[k] - b[kk]) > 1e-12: good = False; print('   js mismatch', p['id'], k, a[k], b[kk])
chk(good, f'Python attrs equal game.html attrs() run in Node ({len(samp)} players)')

# header vs CSV columns
hdr_txt = open(X.HDR_OUT, encoding='utf-8').read()
for tbl, (st, fields) in X.SCHEMAS.items():
    m = re.search(r'struct %s : public FTableRowBase\s*\{(.*?)\n\};' % st, hdr_txt, re.S)
    props = re.findall(r'\n\t(?:int32|float|bool|FString) (\w+)(?: = [^;]+)?;', m.group(1)) if m else []
    chk(props == [f[0] for f in fields], f'C++ {st} fields equal CSV columns ({len(props)})')

# events
ev = json.load(open(os.path.join(D, 'AnimEvents.json'), encoding='utf-8'))
chk(len(ev['events']) == 31 and {e['id'] for e in ev['events']} >= {'shot', 'pass', 'save', 'check', 'fall', 'cover'}, 'AnimEvents.json has 31 events incl. shot/pass/save/check/fall/cover')
chk(all(e['priority'] > 0 for e in ev['events']), 'AnimEvents: every event has a priority')
chk(ev['priorities']['fall'] == 100 and ev['priorities']['cancel'] == 200, 'AnimEvents: PRIO values carried')
for f in ('UE5_DATA_SCHEMA.md', 'UE5_EVENT_SCHEMA.md'):
    chk(os.path.getsize(os.path.join(X.DOCS, f)) > 1000, f'docs/{f} written')
chk(not any(chr(0x2014) in open(os.path.join(X.DOCS, f), encoding='utf-8').read() for f in ('UE5_DATA_SCHEMA.md', 'UE5_EVENT_SCHEMA.md')), 'no em dashes in generated docs')

print('\n%d failures' % len(fails))
sys.exit(1 if fails else 0)
