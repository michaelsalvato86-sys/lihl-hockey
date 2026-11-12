"""Local research agent: reads public Steam data for Tape to Tape (store text + player reviews) and has a local Ollama model
distill what players praise and criticise about hockey-game feel, then translate that into concrete LIHL ideas.
Zero Claude tokens. Output: docs/TAPE_TO_TAPE_RESEARCH.md. Everything is summarized in the model's own words (no copying)."""
import json, os, re, sys, time, urllib.request
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'qwen3.8:latest'
APP = 1566200


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf-8', 'ignore')


def llm(prompt, num_ctx=16384):
    body = json.dumps({'model': MODEL, 'prompt': prompt, 'stream': False, 'options': {'num_ctx': num_ctx, 'temperature': 0.3}}).encode()
    r = urllib.request.urlopen(urllib.request.Request('http://localhost:11434/api/generate', body, {'Content-Type': 'application/json'}), timeout=1800)
    t = json.loads(r.read())['response']
    return re.sub(r'<think>.*?</think>', '', t, flags=re.S).strip()


store = json.loads(get(f'https://store.steampowered.com/api/appdetails?appids={APP}&l=english'))[str(APP)]['data']
desc = re.sub(r'<[^>]+>', ' ', store.get('about_the_game', '') + ' ' + store.get('short_description', ''))[:3000]
revs = []
for flt in ('all', 'recent'):
    cur = '*'
    for _ in range(2):
        try:
            d = json.loads(get(f'https://store.steampowered.com/appreviews/{APP}?json=1&language=english&filter={flt}&num_per_page=100&purchase_type=all&cursor={urllib.parse.quote(cur)}'))
        except Exception as e:
            print('review fetch fail', e); break
        for r in d.get('reviews', []):
            revs.append(('+' if r['voted_up'] else '-') + ' ' + re.sub(r'\s+', ' ', r['review'])[:450])
        cur = d.get('cursor', '*')
seen = set(); revs = [r for r in revs if not (r in seen or seen.add(r))]
print(len(revs), 'reviews gathered')
notes = []
for i in range(0, len(revs), 30):
    chunk = '\n'.join(revs[i:i + 30])
    notes.append(llm('You analyse player reviews of a hockey video game called Tape to Tape. Reviews (+ positive, - negative):\n' + chunk +
                     '\n\nList in short bullets (own words, no quotes): what players praise or criticise about gameplay feel: skating, puck control, passing, shooting, checking, goalies, AI, camera, presentation, modes, controls, multiplayer, performance. Max 14 bullets.'))
    print('chunk', i // 30 + 1, 'done')
final = llm('Store description of the game Tape to Tape:\n' + desc + '\n\nSummaries of player reviews:\n' + '\n\n'.join(notes) +
            '\n\nWrite a research brief for the developer of a browser 3D hockey game (LIHL Hockey: real league rosters, 5v5, server-authoritative multiplayer, two-handed stick animation, on-ice announcers). Sections: 1) What the game is. 2) What players love (ranked). 3) What players dislike (ranked). 4) Ten concrete, original improvement ideas for LIHL inspired by those findings, each with: the problem, the change, and the gameplay feel it produces. 5) Pitfalls to avoid. Do not copy any assets, text or branding; ideas only.', 32768)
os.makedirs('docs', exist_ok=True)
open('docs/TAPE_TO_TAPE_RESEARCH.md', 'w', encoding='utf-8').write(f'# Tape to Tape research brief (generated locally by {MODEL})\n\nSources: Steam store text and {len(revs)} public player reviews. Machine-written; verify before relying on it.\n\n' + final + '\n')
print('written docs/TAPE_TO_TAPE_RESEARCH.md')
