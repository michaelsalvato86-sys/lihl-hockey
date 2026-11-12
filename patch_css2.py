import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('game.html', encoding='utf-8').read()
extra = """
/* NHL-style polish layer */
.side{top:52px;background:rgba(6,14,24,.75);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;line-height:1.4}
.pp{text-shadow:0 0 10px rgba(124,252,0,.4)}.pk{text-shadow:0 0 10px rgba(255,123,123,.4)}
#banner{background:linear-gradient(135deg,rgba(8,18,32,.95),rgba(12,28,48,.95));backdrop-filter:blur(16px);border:2px solid rgba(79,209,197,.55);border-radius:18px;padding:12px 26px;gap:16px;box-shadow:0 12px 40px rgba(0,0,0,.5),0 0 30px rgba(79,209,197,.2)}
#banner img{width:68px;height:68px;box-shadow:0 0 16px rgba(79,209,197,.4)}
#jb{border:3px solid rgba(255,255,255,.35);box-shadow:0 0 20px rgba(79,209,197,.15)}#jk{background:rgba(255,255,255,.9);box-shadow:0 0 12px rgba(255,255,255,.4)}
.btn{font-weight:800;letter-spacing:.5px;border:3px solid rgba(255,255,255,.45);box-shadow:0 6px 20px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.15) inset;transition:transform .1s}
.btn:active{transform:scale(.94)}
#bs{width:108px;height:108px;font-size:18px;background:linear-gradient(160deg,#5eead4,#14b8a6);color:#022c26}
#bp{width:78px;height:78px;background:linear-gradient(160deg,#fcd34d,#f59e0b);color:#422006}
#bh{background:linear-gradient(160deg,#fca5a5,#ef4444);color:#450a0a}
select,button{background:rgba(20,40,60,.85);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px)}
select:focus,button:focus{outline:none;border-color:rgba(79,209,197,.5);box-shadow:0 0 0 3px rgba(79,209,197,.15)}
button.go{border:none;background:linear-gradient(180deg,#5eead4,#2dd4bf)}
"""
assert '</style>' in s
s = s.replace('</style>', extra + '</style>', 1)
open('game.html', 'w', encoding='utf-8').write(s)
print('ok')
