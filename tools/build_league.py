"""Builds data/league.json from the public LIHL API files in data/api (all teams in the standings).
Ratings: real rating when the player has one (data/roster_raw.json), otherwise a division default with small deterministic variation."""
import json, os, glob, io, statistics, urllib.request
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from PIL import Image, ImageOps
raw = {p['id']: p for p in json.load(open('data/roster_raw.json', encoding='utf-8'))}
os.makedirs('photos', exist_ok=True)


def grab(url, name, icon=False):
    path = f'photos/{name}.' + ('png' if icon else 'jpg')
    if os.path.exists(path): return path
    if not url: return None
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read())))
        if icon:
            im = im.convert('RGBA'); im.thumbnail((96, 96)); im.save(path, optimize=True)
        else:
            ImageOps.fit(im.convert('RGB'), (128, 128)).save(path, quality=80)
        return path
    except Exception as e:
        print('photo fail', name, e); return None


def band(r): return 'B' if r >= 61 else 'C' if r >= 41 else 'D'


teams, players, goalies = {}, {}, []
for f in sorted(glob.glob('data/api/*.json')):
    d = json.load(open(f, encoding='utf-8')); tid = d['id']; div = d['division']['name']
    name = d['name'].replace('�', '’')
    teams[str(tid)] = {'abbr': d['acronym'], 'name': name, 'div': div, 'icon': grab(d['icon_url'], f'team{tid}', True),
                       'color': d['main_color'] or '#2a6fd6', 'accent': d['accent_color'] or '#ffffff'}
    ros = [p for p in d['roster'] if p['status'] in ('ACTIVE', 'FILL_IN')]
    sk = [p for p in ros if p['position'] != 'goalie']
    rated = [raw[p['player_id']]['rating'] for p in sk if p['player_id'] in raw and raw[p['player_id']]['rating'] is not None]
    base = 55 if 'Tier 1' in div else 48 if 'Tier 2' in div else (int(statistics.median(rated)) if rated else 30)
    for p in sk:
        pid = p['player_id']; rr = raw.get(pid, {}).get('rating')
        if rr is None: rr = max(21, min(65, base + (pid * 7919 % 9) - 4))
        num = int(p['jersey_number']) if str(p['jersey_number']).isdigit() else None
        if pid in players:
            players[pid]['teams'].append(tid); continue
        players[pid] = {'id': pid, 'name': p['name'], 'rating': rr, 'band': band(rr), 'photo': grab(p['profile_image_url'] or raw.get(pid, {}).get('photo'), f'p{pid}'), 'teams': [tid], 'num': num}
    for i in range(max(0, 10 - len(sk))):
        pid = 910000 + tid * 10 + i
        players[pid] = {'id': pid, 'name': f"{d['acronym']} Skater {i + 1}", 'rating': base, 'band': band(base), 'photo': None, 'teams': [tid], 'num': 80 + i}
    gs = sorted([p for p in ros if p['position'] == 'goalie'], key=lambda p: -(p['goalie_games_played'] or 0))
    if gs:
        g = gs[0]; goalies.append({'id': g['player_id'], 'name': g['name'], 'gp': g['goalie_games_played'], 'gaa': g['gaa'], 'team': tid,
                                   'num': int(g['jersey_number']) if str(g['jersey_number']).isdigit() else 30, 'photo': grab(g['profile_image_url'] or raw.get(g['player_id'], {}).get('photo'), f"p{g['player_id']}")})
    else:
        goalies.append({'id': 900000 + tid, 'name': d['acronym'] + ' Goalie', 'gp': 0, 'gaa': 4.0, 'team': tid, 'num': 30, 'photo': None})
# jersey colour overrides (the league site's team colours do not match the real jerseys; source: lihockey.org/store)
OVR = json.load(open('data/color_overrides.json', encoding='utf-8')) if os.path.exists('data/color_overrides.json') else {}
for k, v in OVR.items():
    if k in teams: teams[k]['color'], teams[k]['accent'] = v[0], v[1]
out = {'teams': teams, 'players': list(players.values()), 'goalies': goalies}
json.dump(out, open('data/league.json', 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
print(len(teams), 'teams', len(out['players']), 'players', len(goalies), 'goalies')
