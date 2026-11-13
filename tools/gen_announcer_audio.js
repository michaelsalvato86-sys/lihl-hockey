'use strict';
// Generates announcer clips with ElevenLabs (stock voices, free plan friendly). Never prints or stores the API key.
// Usage: node tools/gen_announcer_audio.js [--dry] [--budget=18000]
// Key: env ELEVENLABS_KEY or the file C:\Users\Quantum\.elevenlabs_key
const fs = require('fs'), path = require('path'), crypto = require('crypto'), https = require('https');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'audio', 'ann');
const DRY = process.argv.includes('--dry'), BUDGET = +((process.argv.find(a => a.startsWith('--budget=')) || '').split('=')[1] || 18000);
const VOICES = { // ElevenLabs premade voice ids
  'pro.pbp': 'TX3LPaxmHKxFdv7VOQHJ',   // Liam, energetic
  'pro.col': 'cgSgspJ2msm6clMCkdW9',   // Jessica, playful bright
  'locker.pbp': 'SOYHLrjzK2X1ezoPC6cr', // Harry, fierce
  'locker.col': 'FGY2WhTYpPnrIDTdsKH5'  // Laura, quirky
};
const SHARE = { 'pro.pbp': .34, 'pro.col': .30, 'locker.pbp': .18, 'locker.col': .18 }; // share of the character budget
// category priority (higher first); lines in important categories get more clips
const PRI = { goal: 9, tie: 8, lead: 8, clutch: 8, winner: 8, bigsave: 7, save: 6, breakaway: 6, check: 5, onetimer: 5, slap: 5, chance: 5, rebound: 4, pen: 5, pp: 4, ppstart: 4, ppend: 3, pstart: 4, pend: 4, fall: 3, poke: 3, shot: 3, draw: 2, cover: 2, gen: 4, quiet: 2, routine: 1 };
const key = (m, w, t) => crypto.createHash('sha1').update(m + '|' + w + '|' + t).digest('hex').slice(0, 10);
const gen = s => s.replace(/^\{p\}\s+/, 'He ').replace(/\bby \{p\}/g, 'there').replace(/\{g\}/g, 'the goalie').replace(/\{p\}/g, 'him');

const src = fs.readFileSync(path.join(ROOT, 'announcer.js'), 'utf8');
const m = src.match(/const L = \{[\s\S]*?\n  \};/); const S = s => s.split('|'); let L; eval('L' + m[0].slice(m[0].indexOf(' =')).replace(/;\s*$/, ''));
const items = [];
for (const mode of Object.keys(L)) for (const who of ['pbp', 'col']) {
  const vk = mode + '.' + who; if (!VOICES[vk] || !L[mode][who]) continue;
  for (const cat of Object.keys(L[mode][who])) { const a = L[mode][who][cat]; if (!Array.isArray(a)) continue;
    a.forEach((tpl, i) => { let txt = /\{/.test(tpl) ? gen(tpl) : tpl; if (/\{t\}|\{\w+\}/.test(txt)) return; if (txt.length > 90) return; items.push({ vk, mode, who, cat, tpl, txt, i, k: key(mode, who, tpl), pri: (PRI[cat] || 2) }); }); }
}
// choose within each voice budget: round-robin over categories weighted by priority
const chosen = [];
for (const vk of Object.keys(VOICES)) {
  const pool = items.filter(x => x.vk === vk), cats = {}; pool.forEach(x => (cats[x.cat] = cats[x.cat] || []).push(x));
  let left = BUDGET * (SHARE[vk] || .25); const order = Object.keys(cats).sort((a, b) => (PRI[b] || 2) - (PRI[a] || 2));
  const idx = {}; let progress = true;
  while (left > 0 && progress) { progress = false; for (const c of order) { const rounds = Math.max(1, Math.round((PRI[c] || 2) / 3)); for (let r = 0; r < rounds; r++) { const a = cats[c]; const j = idx[c] || 0; if (j >= a.length) break; const x = a[j]; if (x.txt.length > left) continue; idx[c] = j + 1; left -= x.txt.length; chosen.push(x); progress = true; } } }
}
{ const cnt = {}; chosen.forEach(x => { x.rk = cnt[x.vk] = (cnt[x.vk] || 0) + 1; }); chosen.sort((a, b) => a.rk - b.rk); }
const chars = chosen.reduce((n, x) => n + x.txt.length, 0);
console.log('lines', chosen.length, 'characters', chars, 'by voice', Object.keys(VOICES).map(v => v + ':' + chosen.filter(x => x.vk === v).length).join(' '));
if (DRY) process.exit(0);
const KEY = (process.env.ELEVENLABS_KEY || (fs.existsSync('C:/Users/Quantum/.elevenlabs_key') ? fs.readFileSync('C:/Users/Quantum/.elevenlabs_key', 'utf8') : '')).replace(/\s/g, '');
if (!KEY) { console.error('no key'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const MF = path.join(OUT, 'manifest.json'); const manifest = fs.existsSync(MF) ? JSON.parse(fs.readFileSync(MF, 'utf8')) : {};
function tts(voice, text) {
  const body = JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: { stability: .32, similarity_boost: .75, style: .55, use_speaker_boost: true } });
  return new Promise((res, rej) => { const r = https.request({ hostname: 'api.elevenlabs.io', path: '/v1/text-to-speech/' + voice + '?output_format=mp3_22050_32', method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, rs => { const b = []; rs.on('data', d => b.push(d)); rs.on('end', () => { const buf = Buffer.concat(b); if (rs.statusCode !== 200) return rej(new Error('HTTP ' + rs.statusCode + ' ' + buf.toString().slice(0, 160))); res(buf); }); }); r.on('error', rej); r.end(body); });
}
(async () => {
  let n = 0, bytes = 0, fail = 0, spent = 0;
  for (const x of chosen) {
    const f = x.k + '.mp3'; if (manifest[x.k] && fs.existsSync(path.join(OUT, f))) continue;
    try { const buf = await tts(VOICES[x.vk], x.txt); fs.writeFileSync(path.join(OUT, f), buf); manifest[x.k] = f; n++; bytes += buf.length; spent += x.txt.length; }
    catch (e) { fail++; console.error('fail', x.k, String(e.message).replace(KEY, '***')); if (/quota|402|401|429/.test(e.message)) break; }
    if (n % 20 === 0) fs.writeFileSync(MF, JSON.stringify(manifest));
  }
  fs.writeFileSync(MF, JSON.stringify(manifest));
  { const idx = {}; for (const x of chosen) if (manifest[x.k]) idx[x.mode + '|' + x.who + '|' + x.tpl] = manifest[x.k]; fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(idx)); console.log('index entries', Object.keys(idx).length); }
  console.log('generated', n, 'clips,', Math.round(bytes / 1024), 'KB, chars sent', spent, 'failures', fail);
})();
