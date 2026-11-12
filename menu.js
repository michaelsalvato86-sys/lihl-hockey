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
