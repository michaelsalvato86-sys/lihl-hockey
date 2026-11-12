/* Main menu: team selection with roster previews, mode/period, settings, controls. Runs a CPU "attract" game behind it. */
(function () {
  const $ = id => document.getElementById(id);
  let hi = Math.min(1, TEAMS.length - 1), ai = 0, mode = qs.get('auto') ? 'n' : 'h', plen = 180, ready = false;
  const idxOf = ab => TEAMS.findIndex(t => t.abbr === ab);
  if (idxOf('BAB') >= 0) hi = idxOf('BAB'); if (idxOf('AJ') >= 0) ai = idxOf('AJ');
  const avg = t => Math.round(t.players.reduce((s, p) => s + p.rating, 0) / t.players.length);
  const goalie = t => (ROSTER.goalies || []).filter(g => g.team === t.id).sort((a, b) => b.gp - a.gp)[0];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function panel(el, idx, role, setIdx) {
    const t = TEAMS[idx], top = t.players.slice().sort((a, b) => b.rating - a.rating).slice(0, 6), g = goalie(t);
    el.style.setProperty('--tc', t.color || '#2a6fd6');
    el.innerHTML = `<div class="role">${role}</div>
     <div class="hd"><img src="${esc(t.icon || '')}" onerror="this.style.visibility='hidden'"><div><h2>${esc(t.name)}</h2><small>${esc(t.div || '')}</small></div>
      <div class="nav"><button data-d="-1">&#9664;</button><button data-d="1">&#9654;</button></div></div>
     <div class="ov"><span><b>${avg(t)}</b>TEAM</span><span><b>${t.players.length}</b>SKATERS</span><span><b>${g ? esc(g.name.split(' ').pop()) : '-'}</b>GOALIE</span></div>
     <div class="roster">${top.map(p => `<div class="pl"><img src="${esc(p.photo || '')}" onerror="this.style.visibility='hidden'"><span>${p.num != null ? '#' + p.num + ' ' : ''}${esc(p.name)}</span><b>${p.rating}</b></div>`).join('')}</div>
     <div class="chips">${TEAMS.map((x, i) => `<i data-i="${i}" class="${i === idx ? 'on' : ''}" style="background-image:url('${esc(x.icon || '')}')" title="${esc(x.name)}"></i>`).join('')}</div>`;
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => setIdx((idx + (+b.dataset.d) + TEAMS.length) % TEAMS.length));
    el.querySelectorAll('[data-i]').forEach(c => c.onclick = () => setIdx(+c.dataset.i));
  }
  function seg(el, opts, cur, set) {
    el.innerHTML = opts.map(o => `<button data-v="${o[0]}" class="${String(o[0]) === String(cur) ? 'on' : ''}">${o[1]}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { set(b.dataset.v); render(false); });
  }
  let attractTimer = 0;
  function sync() { $('mh').value = hi; $('ma').value = ai; $('mc').value = mode; $('ml').value = plen; }
  function attract() {
    if (!ready) return; clearTimeout(attractTimer);
    attractTimer = setTimeout(() => { $('mh').value = hi; $('ma').value = ai; $('mc').value = 'n'; $('ml').value = 300; newGame(true); document.body.classList.add('inmenu'); document.body.classList.remove('ingame'); }, 120);
  }
  function render(restart) {
    panel($('tpA'), ai, 'AWAY' + (mode === 'a' ? '  ★ YOU CONTROL' : ''), i => { if (i === hi) hi = ai; ai = i; render(true); });
    panel($('tpH'), hi, 'HOME' + (mode === 'h' ? '  ★ YOU CONTROL' : ''), i => { if (i === ai) ai = hi; hi = i; render(true); });
    seg($('segM'), [['h', 'YOU: HOME'], ['a', 'YOU: AWAY'], ['n', 'WATCH']], mode, v => mode = v);
    seg($('segL'), [[120, '2:00'], [180, '3:00'], [300, '5:00']], plen, v => plen = +v);
    seg($('segD'), [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], DIFFV, v => setDiff(v));
    sync(); if (restart) attract();
  }
  window.onReady = function () { ready = true; const b = $('go'); b.disabled = false; b.textContent = 'PLAY'; attract(); };
  try { const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = navigator.standalone || matchMedia('(display-mode: fullscreen)').matches; if (ios && !standalone && !localStorage.getItem('lihl_ios_hint')) { const h = document.getElementById('iosHint'); h.style.display = 'block'; document.getElementById('iosHintX').onclick = () => { h.style.display = 'none'; try { localStorage.setItem('lihl_ios_hint', '1'); } catch (e) { } }; } } catch (e) { }

  /* ---------- Season mode (local, offline): single round robin vs every other team, results and standings saved in the browser ---------- */
  const SK = 'lihl_season';
  const sload = () => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { return null; } };
  const ssave = s => { try { localStorage.setItem(SK, JSON.stringify(s)); } catch (e) { } };
  const rat = ab => { const t = TEAMS.find(x => x.abbr === ab); return t ? avg(t) : 60; };
  function snew(ab) {
    const opp = TEAMS.map(t => t.abbr).filter(a => a !== ab); for (let i = opp.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opp[i], opp[j]] = [opp[j], opp[i]]; }
    const lg = {}; TEAMS.forEach(t => lg[t.abbr] = { w: 0, l: 0, otl: 0, gf: 0, ga: 0 });
    return { team: ab, i: 0, sched: opp.map((o, k) => ({ o, home: k % 2 === 0 })), res: [], lg, pl: {} };
  }
  const pois = l => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  function simOthers(s, skip) {   // one round of games between the other teams, decided by rating
    const ids = TEAMS.map(t => t.abbr).filter(a => !skip.includes(a)); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    for (let k = 0; k + 1 < ids.length; k += 2) {
      const a = ids[k], b = ids[k + 1], d = (rat(a) - rat(b)) / 40; let ga = pois(3.2 + d), gb = pois(3.2 - d), ot = false;
      if (ga === gb) { ot = true; if (Math.random() < .5 + d / 4) ga++; else gb++; }
      const A = s.lg[a], B = s.lg[b]; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
      if (ga > gb) { A.w++; if (ot) B.otl++; else B.l++; } else { B.w++; if (ot) A.otl++; else A.l++; }
    }
  }
  function srecord(G) {
    const s = sload(), fx = window.__seasonGame; if (!s || !fx || fx.i !== s.i) return; window.__seasonGame = null;
    const me = s.team, g = s.sched[s.i], myHome = g.home, gf = G.score[myHome ? 0 : 1], ga = G.score[myHome ? 1 : 0], ot = !!G.ot || G.period > 3;
    const L = s.lg[me], O = s.lg[g.o]; L.gf += gf; L.ga += ga; O.gf += ga; O.ga += gf;
    if (gf > ga) { L.w++; if (ot) O.otl++; else O.l++; } else if (gf < ga) { O.w++; if (ot) L.otl++; else L.l++; } else { L.otl++; O.otl++; }
    s.res.push({ o: g.o, home: myHome, gf, ga, ot });
    for (const p of Object.values(G.pst || {})) if (p.t === (myHome ? 0 : 1) && !p.goalie) { const r = s.pl[p.n] || (s.pl[p.n] = { g: 0, a: 0, s: 0 }); r.g += p.g; r.a += p.a || 0; r.s += p.s; }
    simOthers(s, [me, g.o]); s.i++; ssave(s);
  }
  window.onGameEnd = srecord;
  function srender() {
    let el = $('mseason'); if (!el) { el = document.createElement('div'); el.id = 'mseason'; el.style.cssText = 'position:fixed;inset:0;z-index:12;display:none;align-items:center;justify-content:center;background:rgba(3,8,16,.92);color:#fff;font:600 13px system-ui'; document.body.appendChild(el); }
    const s = sload(); let h = '<div style="max-width:min(94vw,560px);max-height:92vh;overflow:auto;background:#0f1a2c;border:1px solid #3d5a8a;border-radius:14px;padding:14px 16px;text-align:left"><h3 style="margin:0 0 8px;letter-spacing:.14em">SEASON</h3>';
    if (!s) { h += '<div>Pick your team. You play every other team once (' + (TEAMS.length - 1) + ' games). Results, standings and player stats are saved on this device.</div><div style="margin:10px 0"><select id="sTeam" style="font-size:15px;padding:6px">' + TEAMS.map(t => '<option value="' + t.abbr + '">' + esc(t.name) + '</option>').join('') + '</select> <button id="sStart" class="go">START SEASON</button></div>'; }
    else {
      const rows = Object.entries(s.lg).map(([k, v]) => ({ k, ...v, gp: v.w + v.l + v.otl, pts: v.w * 2 + v.otl })).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
      const me = s.lg[s.team], next = s.sched[s.i], done = s.i >= s.sched.length;
      h += '<div>' + esc(TEAMS.find(t => t.abbr === s.team).name) + ': ' + me.w + '-' + me.l + '-' + me.otl + ' &middot; game ' + Math.min(s.i + 1, s.sched.length) + ' of ' + s.sched.length + '</div>';
      h += done ? '<div style="margin:8px 0"><b>Season complete.</b> Final place: ' + (rows.findIndex(r => r.k === s.team) + 1) + ' of ' + rows.length + '</div>' : '<div style="margin:8px 0">Next: ' + (next.home ? 'vs ' : 'at ') + esc(TEAMS.find(t => t.abbr === next.o).name) + ' <button id="sPlay" class="go">PLAY GAME</button></div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="opacity:.7"><td>#</td><td>TEAM</td><td>GP</td><td>W</td><td>L</td><td>OTL</td><td>PTS</td><td>GF</td><td>GA</td></tr>' + rows.map((r, i) => '<tr style="' + (r.k === s.team ? 'background:#1d3357;font-weight:800' : '') + '"><td>' + (i + 1) + '</td><td>' + r.k + '</td><td>' + r.gp + '</td><td>' + r.w + '</td><td>' + r.l + '</td><td>' + r.otl + '</td><td>' + r.pts + '</td><td>' + r.gf + '</td><td>' + r.ga + '</td></tr>').join('') + '</table>';
      const top = Object.entries(s.pl).map(([n, v]) => ({ n, ...v, p: v.g + v.a })).sort((a, b) => b.p - a.p || b.g - a.g).slice(0, 8);
      if (top.length) h += '<div style="margin-top:10px;opacity:.7">YOUR TOP SCORERS (G / A / P)</div>' + top.map(r => '<div>' + esc(r.n) + ' &mdash; ' + r.g + ' / ' + r.a + ' / ' + r.p + '</div>').join('');
      h += '<div style="margin-top:10px"><button id="sReset">RESET SEASON</button></div>';
    }
    h += '<div style="margin-top:12px"><button id="sClose">CLOSE</button></div></div>'; el.innerHTML = h; el.style.display = 'flex';
    $('sClose').onclick = () => { el.style.display = 'none'; };
    if ($('sStart')) $('sStart').onclick = () => { ssave(snew($('sTeam').value)); srender(); };
    if ($('sReset')) $('sReset').onclick = () => { if (confirm('Erase this season?')) { try { localStorage.removeItem(SK); } catch (e) { } srender(); } };
    if ($('sPlay')) $('sPlay').onclick = () => {
      const g = s.sched[s.i], mine = TEAMS.findIndex(t => t.abbr === s.team), opp = TEAMS.findIndex(t => t.abbr === g.o);
      hi = g.home ? mine : opp; ai = g.home ? opp : mine; mode = g.home ? 'h' : 'a'; window.__seasonGame = { i: s.i }; el.style.display = 'none'; render(true); $('go').onclick();
    };
  }
  (function () { const b = document.createElement('button'); b.id = 'bseason'; b.textContent = 'Season'; const bo = $('bonline'); if (bo && bo.parentNode) bo.parentNode.insertBefore(b, bo); b.onclick = srender; })();
  $('go').onclick = () => {
    if (AU) AU.init(); sync(); document.body.classList.remove('inmenu'); document.body.classList.add('ingame');
    try { if (innerWidth < 900 || innerHeight < 500) { const de = document.documentElement; (de.requestFullscreen || de.webkitRequestFullscreen || function () { }).call(de); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } } catch (e) { }
    const rt = document.getElementById('rot'); if (rt) { rt.classList.remove('off'); rt.onclick = () => rt.classList.add('off'); }
    G && (G.attract = false); newGame(false);
  };
  window.showMenu = () => { $('end').style.display = 'none'; $('menu').style.display = 'flex'; document.body.classList.remove('ingame', 'netgame'); document.body.classList.add('inmenu'); attract(); };
  $('again').onclick = window.showMenu;
  // settings / help
  $('bset').onclick = () => $('mset').style.display = 'flex'; $('setX').onclick = () => $('mset').style.display = 'none';
  $('bhelp').onclick = () => $('mhelp').style.display = 'flex'; $('helpX').onclick = () => $('mhelp').style.display = 'none';
  $('setSnd').onchange = e => { AU.on = e.target.checked; AU.setVol(AU.vol); $('snd').innerHTML = AU.on ? '&#128266;' : '&#128263;'; };
  $('setVol').oninput = e => AU.setVol(e.target.value / 100);
  $('setSay').onchange = e => AU.say = e.target.checked;
  if ($('setView')) { $('setView').value = VIEWM; $('setView').onchange = e => setView(e.target.value); }
  if ($('setCol') && window.ANN) { $('setCol').value = ANN.col; $('setCol').onchange = e => ANN.setCol(e.target.value); }
  if ($('setAnn') && window.ANN) { $('setAnn').value = ANN.mode; $('setAnn').onchange = e => ANN.setMode(e.target.value); }
  $('snd').onclick = () => { const on = AU.toggle(); $('snd').innerHTML = on ? '&#128266;' : '&#128263;'; $('setSnd').checked = on; };
  document.body.classList.add('inmenu');
  render(false);
  // keep browser from scrolling/zooming while playing
  ['gesturestart', 'gesturechange'].forEach(n => document.addEventListener(n, e => e.preventDefault()));
  document.addEventListener('touchmove', e => { if (document.body.classList.contains('ingame')) e.preventDefault(); }, { passive: false });
})();
