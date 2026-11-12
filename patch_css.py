import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('game.html', encoding='utf-8').read()

def sub(pattern, new):
    global s
    n = len(re.findall(pattern, s, flags=re.S))
    assert n == 1, (pattern[:40], n)
    s = re.sub(pattern, lambda m: new, s, count=1, flags=re.S)

sub(r"#menu,#end\{position:fixed;inset:0;background:#0a1620f2;[^}]*\}",
    "#menu,#end{position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 18%,rgba(79,209,197,.10),transparent 60%),radial-gradient(ellipse 100% 80% at 50% 100%,rgba(10,30,50,.95),#050a12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:9;padding:14px;text-align:center;overflow:hidden}\n#menu::before,#end::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.05) 2px,rgba(0,0,0,.05) 4px);pointer-events:none;opacity:.5}")
sub(r"h1\{margin:0;[^}]*\}h1 span\{[^}]*\}",
    "h1{margin:0;font-size:clamp(32px,6vw,52px);letter-spacing:4px;font-weight:800;text-transform:uppercase;background:linear-gradient(180deg,#fff 30%,#4fd1c5 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5)) drop-shadow(0 0 28px rgba(79,209,197,.35))}\nh1 span{color:#4fd1c5;-webkit-text-fill-color:#4fd1c5}")
sub(r"button\.go\{[^}]*\}",
    "button.go{background:linear-gradient(180deg,#5eead4,#2dd4bf);color:#022c26;font-weight:800;font-size:18px;letter-spacing:1.5px;padding:14px 42px;border-radius:14px;border:none;text-transform:uppercase;box-shadow:0 4px 20px rgba(45,212,191,.45),0 0 0 1px rgba(255,255,255,.2) inset;transition:transform .15s,box-shadow .15s}\nbutton.go:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(45,212,191,.55),0 0 0 1px rgba(255,255,255,.25) inset}button.go:active{transform:none}")
sub(r"#sb\{display:flex;[^}]*\}",
    "#sb{display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(12,28,45,.92),rgba(6,14,24,.95));backdrop-filter:blur(16px) saturate(1.4);border:1px solid rgba(79,209,197,.25);border-top:0;border-radius:0 0 20px 20px;padding:8px 22px;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset,0 0 40px rgba(79,209,197,.08);font-family:ui-monospace,'SF Mono',Consolas,monospace}")
sub(r"#sb img\{[^}]*\}#sb \.sc\{[^}]*\}",
    "#sb img{height:28px;width:28px;object-fit:contain}#sb .sc{font-size:28px;min-width:28px;text-align:center;text-shadow:0 0 18px rgba(79,209,197,.4)}")
open('game.html', 'w', encoding='utf-8').write(s)
print('css ok')
