import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
g = open('game.html', encoding='utf-8').read()
m = open('menu.js', encoding='utf-8').read()
online_html = open('ui_online.html', encoding='utf-8').read()
online_css = open('ui_online.css', encoding='utf-8').read()


def rep(txt, a, b, tag):
    assert txt.count(a) == 1, tag + ' count=%d: ' % txt.count(a) + a[:90]
    return txt.replace(a, b, 1)


if 'id="online"' not in g:
    g = rep(g, '<div id="end">', online_html + '\n<div id="end">', 'online html')
    g = rep(g, '<button id="bset">Settings</button>', '<button id="bonline">Online Play</button><button id="bset">Settings</button>', 'bonline')
    g = rep(g, '</style>', online_css + '\n</style>', 'online css')
    g = rep(g, '<script src="menu.js"></script></body></html>', '<script src="menu.js"></script>\n<script src="config.js"></script><script src="net.js"></script></body></html>', 'scripts')
    g = rep(g, "for(let i=0;i<n;i++)step(dt*(SPEED<1?SPEED:1));", "if(G.net){if(window.netFrame)netFrame(dt)}else for(let i=0;i<n;i++)step(dt*(SPEED<1?SPEED:1));", 'loop')

if 'window.showMenu' not in m:
    m = rep(m, "$('again').onclick = () => { $('end').style.display = 'none'; $('menu').style.display = 'flex'; document.body.classList.remove('ingame'); document.body.classList.add('inmenu'); attract(); };",
            "window.showMenu = () => { $('end').style.display = 'none'; $('menu').style.display = 'flex'; document.body.classList.remove('ingame', 'netgame'); document.body.classList.add('inmenu'); attract(); };\n  $('again').onclick = window.showMenu;", 'showMenu')
open('game.html', 'w', encoding='utf-8').write(g)
open('menu.js', 'w', encoding='utf-8').write(m)
if not os.path.exists('config.js'):
    open('config.js', 'w').write("// Set this to your deployed multiplayer server (wss://...). Leave empty to disable Online Play on the public site.\nwindow.LIHL_SERVER = '';\n")
print('ok')
