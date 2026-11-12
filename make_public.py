# Builds index_public.html: same game, but WITHOUT the online UI and net scripts (multiplayer stays unpublished until a server is hosted).
import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
h = open('index.html', encoding='utf-8').read()
h = h.replace('<button id="bonline">Online Play</button>', '')
h = re.sub(r'<script src="config\.js"></script><script src="net\.js"></script>', '', h)
# keep the DOM ids net.js expects out of the way: remove the online overlay block entirely
a = h.index('<div id="online" class="ov-full">'); b = h.index('<div id="end">')
h = h[:a] + h[b:]
open('index_public.html', 'w', encoding='utf-8').write(h)
print('index_public.html', len(h))
