import json, os, re, urllib.request, collections
os.chdir(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open('data/roster_raw.json', encoding='utf-8'))
rated = [p for p in raw if p['rating'] is not None]
cnt = collections.Counter(t['id'] for p in rated for t in p['teams'] if t['div'])
keep = {tid for tid, n in cnt.items() if n >= 8}
os.makedirs('photos', exist_ok=True)

def grab(url, name):
    if not url: return None
    from PIL import Image, ImageOps
    import io
    icon = name.startswith('team')
    path = f'photos/{name}.' + ('png' if icon else 'jpg')
    if not os.path.exists(path):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            im = ImageOps.exif_transpose(Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read())))
            if icon:
                im = im.convert('RGBA'); im.thumbnail((96, 96)); im.save(path, optimize=True)
            else:
                ImageOps.fit(im.convert('RGB'), (128, 128)).save(path, quality=80)
        except Exception as e:
            print('fail', url, e); return None
    return path

teams, players = {}, []
for p in rated:
    ts = [t for t in p['teams'] if t['id'] in keep]
    if not ts: continue
    for t in ts:
        if t['id'] not in teams:
            teams[t['id']] = {'abbr': t['abbr'], 'name': t['name'], 'div': t['div'], 'icon': grab(t['icon'], f"team{t['id']}")}
    players.append({'id': p['id'], 'name': p['name'], 'rating': p['rating'], 'band': p['band'],
                    'photo': grab(p['photo'], f"p{p['id']}"), 'teams': [t['id'] for t in ts]})
gl = []
for g in json.load(open('data/goalies.json')):
    if str(g['team']) in map(str, teams) or g['team'] in teams:
        gl.append({'id': g['id'], 'name': g['name'], 'gp': g['gp'], 'gaa': g['gaa'], 'team': g['team'], 'photo': grab(g['photo'], f"p{g['id']}")})
ex = {int(k): v for k, v in json.load(open('data/team_extra.json')).items()}
for tid, t in teams.items():
    t['color'], t['accent'] = ex[int(tid)]['c']
for p in players:
    for tid in p['teams']:
        n = ex[int(tid)]['nums'].get(str(p['id']))
        if n is not None: p['num'] = n; break
gl = []
for tid, e in ex.items():
    if tid in teams or str(tid) in teams:
        g = e['g']; gl.append({'id': g['id'], 'name': g['name'], 'gp': g['gp'], 'gaa': g['gaa'], 'team': tid, 'num': g['num'], 'photo': grab(g['photo'], f"p{g['id']}")})
data = {'teams': teams, 'players': players, 'goalies': gl}
if os.path.exists('data/league.json'):
    data = json.load(open('data/league.json', encoding='utf-8'))  # full league (all teams in the standings), see tools/build_league.py

# ---- extra (non-API) teams, e.g. Whiskey Stick (data/extra_teams.json) and per-team jerseys (data/jerseys_store.json) ----
def norm_jersey(j):
    """store/extra jersey -> {slot,name,color,accent,...style fields}; tolerant of [color,accent] arrays"""
    if isinstance(j, (list, tuple)): return {'slot': 'home', 'color': j[0], 'accent': j[1] if len(j) > 1 else '#ffffff'}
    o = {k: v for k, v in j.items() if v is not None and k not in ('source', 'confidence')}
    o['color'] = o.pop('body', None) or o.get('color')
    if 'accent' not in o: o['accent'] = o.get('stripe') or o.get('trim') or o.get('yoke') or '#ffffff'
    return o
if os.path.exists('data/extra_teams.json'):
    ex_t = json.load(open('data/extra_teams.json', encoding='utf-8'))
    for k, v in ex_t['teams'].items():
        v = dict(v); v['jerseys'] = [norm_jersey(j) for j in v.get('jerseys', [])]
        if v['jerseys']: v['color'], v['accent'] = v['jerseys'][0]['color'], v['jerseys'][0]['accent']
        data['teams'][k] = v
    ids = {p['id'] for p in data['players']}
    data['players'] += [p for p in ex_t['players'] if p['id'] not in ids]
    gids = {g['id'] for g in data['goalies']}
    data['goalies'] += [g for g in ex_t['goalies'] if g['id'] not in gids]
if os.path.exists('data/jerseys_store.json'):
    for k, v in json.load(open('data/jerseys_store.json', encoding='utf-8')).items():
        t = data['teams'].get(k)
        if t is None or t.get('jerseys'): continue            # never overwrite a team that already has its own jerseys; never invent
        js = [norm_jersey(j) for j in (v.get('jerseys') if isinstance(v, dict) else v) or []]
        slots = {j.get('slot', 'home') for j in js}
        if js and 'home' in slots: t['jerseys'] = js
if os.path.exists('data/jerseys_user.json'):   # jerseys specified by the user (not from the store); added only where that slot is missing
    for k, v in json.load(open('data/jerseys_user.json', encoding='utf-8')).items():
        t = data['teams'].get(k)
        if t is None or not t.get('jerseys'): continue
        have = {j.get('slot') for j in t['jerseys']}
        for j in v.get('jerseys', []):
            if j.get('slot') not in have: t['jerseys'].append(dict(norm_jersey(j), userSpecified=True))
json.dump(data, open('data/roster.json', 'w'), separators=(',', ':'))
html = open('game.html', encoding='utf-8').read()
html = re.sub(r'const ROSTER=.*?;//ROSTER', lambda m: 'const ROSTER=' + json.dumps(data, separators=(',', ':')) + ';//ROSTER', html, flags=re.S)
open('index.html', 'w', encoding='utf-8').write(html)
print(len(teams), 'teams', len(players), 'players')

import shutil
shutil.copy('index.html', 'server/game_index.html')
print('server sim copy updated')
