// Builds ../dist : the shipped game with its own JavaScript obfuscated. Source files stay readable in the dev repo.
// Honest limit: browser code can be made harder to read, never private. Keep anything secret on the server.
const fs = require('fs'), path = require('path');
const JO = require('javascript-obfuscator');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'dist');
const OPT = { compact: true, simplify: true, renameGlobals: false, identifierNamesGenerator: 'hexadecimal', stringArray: true, stringArrayEncoding: [], stringArrayThreshold: 0.7, splitStrings: false, controlFlowFlattening: false, deadCodeInjection: false, selfDefending: false, debugProtection: false, disableConsoleOutput: false, unicodeEscapeSequence: false, target: 'browser' };
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const JS = ['r3d.js', 'skater3d.js', 'costumes.js', 'skater_pose.js', 'anim_rig.js', 'anim_ctrl.js', 'anim_goalie.js', 'anim_celebrate.js', 'anim_shots.js', 'audio.js', 'menu.js', 'net.js', 'announcer.js'];
JS.push('anim_hits.js', 'anim_events.js');
const COPY = ['manifest.json', 'sw.js', 'icon-180.png', 'icon-512.png', 'config.js', 'three.min.js', 'ui_style.css', 'ui_online.css'];
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// obfuscate the big inline simulation script (the one holding the roster)
const m = /<script>\s*const ROSTER=/.exec(html);
if (!m) throw new Error('inline sim script not found');
const s0 = m.index + '<script>'.length, s1 = html.indexOf('</script>', m.index);
const sim = html.slice(s0, s1);
const ob = JO.obfuscate(sim, OPT).getObfuscatedCode();
html = html.slice(0, s0) + ob + html.slice(s1);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const f of JS) { fs.writeFileSync(path.join(OUT, f), JO.obfuscate(fs.readFileSync(path.join(ROOT, f), 'utf8'), OPT).getObfuscatedCode()); }
for (const f of COPY) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
for (const d of ['models', 'photos', 'lib', 'audio']) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
const kb = p => (fs.statSync(p).size / 1024) | 0;
console.log('dist built: index.html', kb(path.join(OUT, 'index.html')), 'KB; r3d.js', kb(path.join(OUT, 'r3d.js')), 'KB');
