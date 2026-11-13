"""STATIC consistency check of the uncompiled UE5 scaffold. This is NOT a compile: it only checks things Python can see
(include targets exist, each .cpp has its header, UCLASS headers end with their .generated.h include, balanced braces, no em dashes,
and that identifiers used across files are declared in the header). Run: python tools/check_unreal_scaffold.py"""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'unreal', 'LIHL_UE5_HOCKEY_POC', 'Source', 'LIHL_UE5_HOCKEY_POC')
fails = []
def chk(c, m):
    print(('ok   ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

files = []
for d, _, fs in os.walk(SRC):
    for f in fs:
        if f.endswith(('.h', '.cpp', '.cs')): files.append(os.path.join(d, f))
txt = {f: open(f, encoding='utf-8').read() for f in files}
engine_prefixes = ('CoreMinimal', 'GameFramework/', 'Components/', 'Engine/', 'Kismet/', 'Camera/', 'Blueprint/', 'UObject/', 'Modules/', 'EnhancedInput',
                   'InputActionValue', 'EngineUtils', 'TimerManager')
for f, t in txt.items():
    rel = os.path.relpath(f, SRC)
    if f.endswith(('.h', '.cpp')):
        for inc in re.findall(r'#include "([^"]+)"', t):
            if inc.endswith('.generated.h'):
                base = inc[:-len('.generated.h')]
                chk(os.path.exists(os.path.join(os.path.dirname(f), base + '.h')) or os.path.exists(os.path.join(SRC, base + '.h')), f'{rel}: generated include {inc} belongs to an existing header')
                continue
            if inc.startswith(engine_prefixes): continue
            ok = os.path.exists(os.path.join(os.path.dirname(f), inc)) or os.path.exists(os.path.join(SRC, inc))
            chk(ok, f'{rel}: include "{inc}" resolves')
    code = re.sub(r'//.*', '', re.sub(r'"(\\.|[^"\\])*"', '""', t))
    chk(code.count('{') == code.count('}'), f'{rel}: braces balanced ({code.count("{")})')
    chk(code.count('(') == code.count(')'), f'{rel}: parentheses balanced')
    chk(chr(0x2014) not in t, f'{rel}: no em dashes')
    if f.endswith('.h') and 'UCLASS' in t:
        incs = re.findall(r'#include "[^"]+"', t)
        chk(incs and incs[-1].endswith('.generated.h"'), f'{rel}: .generated.h is the last include')
    if f.endswith('.cpp') and os.path.basename(f) != 'LIHL_UE5_HOCKEY_POC.cpp':
        chk(os.path.basename(f)[:-4] + '.h' in t, f'{rel}: includes its own header')
    chk('NOT COMPILED' in t or f.endswith('.cs') or 'GENERATED' in t, f'{rel}: carries the NOT COMPILED banner')
# every ALihl/ULihl method defined in a cpp is declared in its header
for f, t in txt.items():
    if not f.endswith('.cpp'): continue
    h = f[:-4] + '.h'
    if h not in txt: continue
    for cls, meth in re.findall(r'^[\w:<>\*& ]+?\s+((?:A|U)Lihl\w+)::(\w+)\(', t, re.M):
        if meth == cls[1:]: continue
        chk(re.search(r'\b' + meth + r'\s*\(', txt[h]) is not None, f'{os.path.basename(f)}: {cls}::{meth} declared in header')
print('\n%d failures (static only; this is not a compile)' % len(fails))
sys.exit(1 if fails else 0)
