"""Capture repeatable baseline stills of the CURRENT three.js game for the later Unreal side-by-side (docs/ENGINE_BASELINE_CAPTURE.md).
Requires Python Playwright with chromium (pip install playwright; playwright install chromium). Not installed? The scene table below is the spec: do it by hand.
Usage: python tools/capture_baseline.py [outdir]     (default docs/engine_baseline). Serves the repo with python -m http.server on a free port.
Method: start an exhibition game, freeze play (G.pause), then override the 3D camera inside WebGLRenderer.render so each scene uses exact fixed camera numbers.
Units are r3d.js world feet: x = sim x - 100 (along rink), z = sim y - 42.5 (across), y up. Cartoon player models only; no photos of people are rendered."""
import json, os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'docs', 'engine_baseline')
VIEW = (1280, 720)
# name: (camera position x,y,z ft, look-at x,y,z ft, fov deg, note)
SCENES = {
    'broadcast_side': ((0, 23, 38), (0, 0, 0), 40, 'default broadcast follow cam (r3d.js line 244: hgt 23, dist 38, fov 40) at centre ice'),
    'wide_high':      ((0, 60, 70), (0, 0, 0), 40, 'whole-rink overview'),
    'top_down':       ((0, 120, 0.01), (0, 0, 0), 40, 'orthogonal-ish top view, checks markings and dimensions'),
    'goal_end':       ((-55, 9, 0), (-89, 3, 0), 45, 'home goal and goalie from the slot (goal line x=-89)'),
    'skater_close':   (None, None, 38, 'camera 7 ft right, 4.5 ft up, 11 ft toward viewer of the first home skater, looking at his chest (player scale and team colors)'),
}


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def main():
    os.makedirs(OUT, exist_ok=True)
    port = free_port()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    meta = {'viewport': VIEW, 'scenes': {}}
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            ctx = br.new_context(viewport={'width': VIEW[0], 'height': VIEW[1]}, device_scale_factor=1)
            pg = ctx.new_page()
            pg.goto(f'http://127.0.0.1:{port}/index.html?q=high')
            pg.wait_for_function("typeof newGame==='function'"); pg.wait_for_timeout(1500)
            pg.evaluate("document.getElementById('go').click()"); pg.wait_for_timeout(2500)
            # freeze play and hide HUD overlays that are not part of the rink view
            # freeze play, hide HUD/touch controls, hide flat photo discs on the ice (they can show real people), and override the camera inside render()
            pg.evaluate("""()=>{G.pause=1e9;const css=document.createElement('style');
              css.textContent=['hud','sl','sr','snd','flash','banner','ctl','bcam','bpz','toast','vig'].map(i=>'#'+i).join(',')+'{display:none!important}';document.head.appendChild(css);
              let hid=0;R3.sc.traverse(m=>{if(m.isSprite||m.isPoints||(m.geometry&&m.geometry.type==="CircleGeometry"&&m.position.y<1&&m.geometry.parameters.radius<12)){m.visible=false;hid++}});window.__hid=hid;
              window.__camOv=null;const r=R3.r,o=r.render;r.render=function(s,c){const k=window.__camOv;if(k&&c&&c.isPerspectiveCamera){c.position.set(k.p[0],k.p[1],k.p[2]);c.lookAt(k.l[0],k.l[1],k.l[2]);c.fov=k.f;c.updateProjectionMatrix()}return o.call(this,s,c)}}""")
            print('hidden flat discs:', pg.evaluate("window.__hid"))
            for name, (pos, look, fov, note) in SCENES.items():
                if pos is None:
                    sk = pg.evaluate("()=>{const q=H1.roster.find(x=>x.on)||H1.roster[0];return [q.x-W/2,q.y-H/2]}")
                    pos = (sk[0] + 7, 4.5, sk[1] + 11); look = (sk[0], 3, sk[1])
                pg.evaluate("(h)=>R3.sc.children.forEach(m=>{if((m.isMesh||m.isGroup)&&m.position.y>15&&!m.isLight)m.visible=!h})", name == 'top_down')  # hang-high scoreboard blocks the top view
                pg.evaluate("(k)=>{window.__camOv=k}", {'p': list(pos), 'l': list(look), 'f': fov})
                pg.wait_for_timeout(500)
                path = os.path.join(OUT, name + '.png')
                pg.screenshot(path=path)
                meta['scenes'][name] = {'pos_ft': list(pos), 'look_ft': list(look), 'fov': fov, 'note': note, 'bytes': os.path.getsize(path)}
                print(name, os.path.getsize(path), 'bytes')
            meta['teams'] = pg.evaluate("()=>({home:H1.name,away:A1.name})")
            br.close()
    finally:
        srv.terminate()
    meta['git'] = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    with open(os.path.join(OUT, 'scenes.json'), 'w', encoding='utf-8') as f: json.dump(meta, f, indent=1)


if __name__ == '__main__':
    main()
