"""Crops the Whiskey Stick logos from the reference photos (assets_raw is NOT tracked; only the small crops in photos/ are).
Usage: python tools/make_ws_logos.py [path to assets_raw/whiskey_sticks]"""
import sys, os
from PIL import Image, ImageDraw
import numpy as np
from collections import deque
SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Quantum\rec-hockey\assets_raw\whiskey_sticks'
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def keyout(im, bg, tol):
    """flood fill from the border: pixels within tol of the bg colour (and connected to the edge) become transparent"""
    a = np.array(im.convert('RGBA')).astype(int); h, w = a.shape[:2]
    d = np.abs(a[:, :, :3] - np.array(bg)).sum(2) < tol if bg is not None else ((a[:, :, :3].max(2) < tol) & ((a[:, :, :3].max(2) - a[:, :, :3].min(2)) < 40))
    seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if d[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if d[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and d[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
    a[seen, 3] = 0
    return Image.fromarray(a.astype('uint8'), 'RGBA')

def save(im, name, mx):
    im.thumbnail((mx, mx), Image.LANCZOS); im.save(f'photos/{name}.png', optimize=True); print(name, im.size, os.path.getsize(f'photos/{name}.png'))

# 1 pinup-on-whiskey-bottle oval (black shirt background, ref_03)
im = Image.open(f'{SRC}/ref_03.jpg').convert('RGB'); s = 1.01
c = im.crop((int(495 * s), int(1085 * s), int(985 * s), int(1625 * s)))
bgc = np.array(c.crop((0, 0, 30, 30))).reshape(-1, 3).mean(0)
save(keyout(c, None, 95), 'ws_pinup', 192)
# 2 Long Island crest with pinup oval and script (purple template background, ref_07)
im = Image.open(f'{SRC}/ref_07_purple_template.jpg').convert('RGB'); s = 1.06
c = im.crop((int(740 * s), int(1190 * s), int(1195 * s), int(1440 * s)))
bgc = np.array(c.crop((0, 0, 20, 20))).reshape(-1, 3).mean(0)
print('purple bg', bgc)
save(keyout(c, bgc, 60), 'ws_island', 256)
# 3 framed crest (white jersey, ref_05), kept opaque (it is printed on white)
im = Image.open(f'{SRC}/ref_05.jpg').convert('RGB')
c = im.crop((470, 262, 612, 470)); save(c.convert('RGBA'), 'ws_framed', 160)
