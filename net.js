/* LIHL Hockey online client: lobby UI + a mirror of the server's authoritative game state.
   The browser sends only inputs. Positions, puck, clock, score and penalties all come from the server. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHAT = ['Good game', 'Nice shot', 'Nice save', 'Ready?', 'Rematch?', 'One moment'];
  let tok = null, nm = ''; try { tok = sessionStorage.getItem('lihl_tok'); nm = localStorage.getItem('lihl_name') || ''; } catch (e) { }
  const NET = window.NET = { ws: null, token: tok, name: nm, room: null, side: 0, names: ['', ''], ping: 0, buf: [], on: false, acc: 0, delay: 110, cur: null, tries: 0, rematchMe: false, lastPong: 0 };

  function serverUrl() {
    const p = qs.get('server'); if (p) return p;
    if (window.LIHL_SERVER) return window.LIHL_SERVER;
    if (/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname)) return 'ws://' + location.hostname + ':8090';
    if (!/github\.io$/.test(location.hostname)) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    return '';
  }
  NET.send = o => { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(o)); };
  function setStatus(s) { const e = $('onStatus'); if (e) e.textContent = s; }
  function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.display = 'none', ms || 2600); }
  function peer(msg) { const b = $('peerbar'); if (!msg) { b.style.display = 'none'; return; } b.textContent = msg; b.style.display = 'block'; }
  function view(id) { ['onHome', 'onJoinV', 'onQueueV', 'onLobby'].forEach(v => $(v).style.display = v === id ? 'flex' : 'none'); }

  function connect() {
    return new Promise((res, rej) => {
      if (NET.ws && NET.ws.readyState === 1) return res();
      const url = serverUrl(); if (!url) return rej(new Error('The online server is not configured for this site yet.'));
      let ws, done = false; try { ws = new WebSocket(url); } catch (e) { return rej(e); }
      NET.ws = ws;
      ws.onopen = () => NET.send({ t: 'hello', name: NET.name || 'Player', token: NET.token });
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (m.t === 'welcome' && !done) { done = true; res(); } onMsg(m); };
      ws.onclose = () => { NET.connected = false; if (!done) { done = true; rej(new Error('Could not reach the server. Is it running?')); } onClose(); };
      ws.onerror = () => { };
    });
  }
  function onClose() {
    setStatus('OFFLINE'); $('netdot').style.background = '#e05252';
    if (NET.token && (NET.room || NET.on) && NET.tries < 40) { NET.tries++; peer('CONNECTION LOST - RECONNECTING...'); setTimeout(() => connect().catch(() => { }), 1500); }
  }

  // ---------------- messages ----------------
  function onMsg(m) {
    switch (m.t) {
      case 'welcome': NET.token = m.token; NET.connected = true; NET.tries = 0; try { sessionStorage.setItem('lihl_tok', m.token); } catch (e) { } if (!NET.name) NET.name = m.name; $('onName').value = NET.name; setStatus('CONNECTED'); if (m.back) peer(''); startPing(); break;
      case 'room': NET.room = m; NET.side = m.you; renderLobby(); break;
      case 'err': toast(m.m, 3500); break;
      case 'list': renderList(m.rooms); break;
      case 'queued': view('onQueueV'); break;
      case 'unqueued': view('onHome'); break;
      case 'matched': toast('Opponent found: ' + m.code); break;
      case 'cd': $('cdwin').style.display = 'flex'; $('cdn').textContent = m.n > 0 ? m.n : 'GO'; break;
      case 'start': begin(m); break;
      case 's': snap(m); break;
      case 'peer': if (m.left) { peer('OPPONENT LEFT - CPU TAKES OVER'); setTimeout(() => peer(''), 4000); } else if (m.conn === false) { let t = Math.round(m.grace / 1000); peer('OPPONENT DISCONNECTED - WAITING ' + t + 's'); clearInterval(NET.pi); NET.pi = setInterval(() => { t--; if (t <= 0) { clearInterval(NET.pi); peer(''); } else peer('OPPONENT DISCONNECTED - WAITING ' + t + 's'); }, 1000); } else { clearInterval(NET.pi); peer(''); toast('Opponent reconnected'); } break;
      case 'end': showEnd(m); break;
      case 'chat': toast((m.name || 'Player') + ': ' + CHAT[m.i], 3000); break;
      case 'rematch': if (m.slot !== NET.side) { toast('Opponent wants a rematch', 3500); } break;
      case 'pong': NET.ping = Math.round(performance.now() - m.ts); NET.lastPong = performance.now(); pingUI(); break;
    }
  }
  function startPing() { clearInterval(NET.pt); NET.pt = setInterval(() => { NET.send({ t: 'ping', ts: performance.now() }); if (NET.lastPong && performance.now() - NET.lastPong > 6000) pingUI(true); }, 2000); }
  function pingUI(lag) { const d = $('netdot'), p = $('netping'); if (lag) { d.style.background = '#e05252'; p.textContent = 'LAG'; return; } d.style.background = NET.ping < 80 ? '#3ddc84' : NET.ping < 160 ? '#f2c744' : '#e05252'; p.textContent = NET.ping + ' ms \u00b7 ' + Math.round(NET.fps || 0) + ' fps'; }

  // ---------------- lobby ----------------
  function link() { return location.origin + location.pathname + '?room=' + (NET.room ? NET.room.code : ''); }
  function nextTeam(cur, d, taken) { const n = TEAMS.length; let i = cur; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (i !== taken) return i; } return cur; }
  function renderLobby() {
    const r = NET.room; if (!r) return; if (r.state === 'playing') return;
    $('online').style.display = 'flex'; $('menu').style.display = 'none'; view('onLobby'); setStatus('ROOM ' + r.code);
    $('lbCode').textContent = r.code; $('lbLink').textContent = link();
    const card = slot => {
      const p = r.players[slot], role = slot === 0 ? 'HOME' : 'AWAY', you = slot === r.you, el = $(slot === 0 ? 'lbH' : 'lbA');
      if (!p) { el.style.setProperty('--tc', '#445'); el.innerHTML = `<div class="role">${role}</div><div class="who"><b>WAITING FOR PLAYER...</b></div><div class="tm"><small>Send them the room code or invite link</small></div>`; return; }
      const t = TEAMS[p.team], other = r.players[1 - slot];
      el.style.setProperty('--tc', t.color || '#2a6fd6');
      el.innerHTML = `<div class="role">${role}${you ? ' &middot; YOU' : ''}${slot === 0 ? ' &middot; HOST' : ''}</div>
        <div class="who"><span class="dot ${p.conn ? 'on' : 'off'}"></span><b>${esc(p.name)}</b><span class="badge ${p.ready ? 'rdy' : ''}">${p.ready ? 'READY' : 'NOT READY'}</span></div>
        <div class="tm"><img src="${esc(t.icon || '')}" onerror="this.style.visibility='hidden'"><h3>${esc(t.name)}</h3>${you ? '<div class="nav"><button data-d="-1">&#9664;</button> <button data-d="1">&#9654;</button></div>' : ''}</div>`;
      el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => NET.send({ t: 'team', idx: nextTeam(p.team, +b.dataset.d, other ? other.team : -1) }));
    };
    card(1); card(0);
    const host = r.you === 0;
    $('lbPlen').innerHTML = host ? [120, 180, 300].map(v => `<button class="${r.plen === v ? 'on' : ''}" data-p="${v}" style="${r.plen === v ? 'background:#fff;color:#0a1220' : ''}">${v / 60}:00</button>`).join(' ') : 'PERIOD ' + (r.plen / 60) + ':00';
    $('lbPlen').querySelectorAll('[data-p]').forEach(b => b.onclick = () => NET.send({ t: 'plen', v: +b.dataset.p }));
    const me = r.players[r.you], both = r.players[0] && r.players[1];
    $('lbMsg').textContent = !both ? 'WAITING FOR OPPONENT...' : r.state === 'countdown' ? 'STARTING...' : (me && me.ready ? 'WAITING FOR OPPONENT TO READY UP' : 'PICK YOUR TEAM, THEN PRESS READY');
    const rb = $('lbReady'); rb.disabled = !both || r.state === 'countdown'; rb.textContent = me && me.ready ? 'CANCEL' : 'READY';
    const ch = $('lbChat'); if (!ch.firstChild) CHAT.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c; b.onclick = () => NET.send({ t: 'chat', i }); ch.appendChild(b); });
  }
  function renderList(rooms) {
    const el = $('onList'); if (!rooms.length) { el.textContent = 'No public games right now. Create one!'; return; }
    el.innerHTML = rooms.map(r => `<div class="onrow"><b>${esc(r.host)}</b><span>${esc(TEAMS[r.team] ? TEAMS[r.team].name : '')}</span><span>${esc(r.code)}</span><button data-c="${esc(r.code)}">JOIN</button></div>`).join('');
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => NET.send({ t: 'join', code: b.dataset.c }));
  }

  // ---------------- match ----------------
  function begin(m) {
    $('cdwin').style.display = 'none'; $('online').style.display = 'none'; $('oend').style.display = 'none'; $('menu').style.display = 'none'; peer('');
    NET.side = m.side; NET.names = m.names || ['', '']; NET.buf = []; NET.cur = null; NET.rematchMe = false;
    $('mh').value = m.home; $('ma').value = m.away; $('mc').value = 'n'; $('ml').value = m.plen;
    document.body.classList.remove('inmenu'); document.body.classList.add('ingame', 'netgame');
    newGame(false); G.net = 1; G.humans = []; G.hum = null; $('ctl').style.display = 'block'; NET.on = true; AU.init();
    buildChat(); pingUI();
  }
  function pid2p(pid) { if (pid < 0) return null; const t = pid < 100 ? H1 : A1, i = pid % 100; return i === 99 ? t.goalie : t.roster[i]; }
  const lerp = (a, b, k) => a + (b - a) * k;
  function snap(m) {
    const now = performance.now(); NET.buf.push({ rt: now, s: m.s }); if (NET.buf.length > 40) NET.buf.shift();
    if (NET.lastSnap) { const gp = now - NET.lastSnap; NET.gm = (NET.gm || 33) * .95 + gp * .05; NET.gd = (NET.gd || 5) * .95 + Math.abs(gp - NET.gm) * .05; NET.delay = Math.max(100, Math.min(230, 66 + 4 * NET.gd)); } NET.lastSnap = now;
    NET.evq = NET.evq || []; for (const e of m.ev) NET.evq.push({ at: now + NET.delay, e });
  }
  function ev(e) {
    if (e.e === 'sfx') { AU.sfx(e.n); if (e.n === 'horn') AU.crowd(1); if (e.n === 'hit') { shakeT = .3; G.excite = Math.max(G.excite || 0, .4); } }
    else if (e.e === 'ae') { const q = pid2p(e.p); if (q) { q.ae = { id: (G.aeid = (G.aeid || 0) + 1), k: e.k, d: e.d || {} }; if (e.k === 'shotwind') { const T = (e.d && e.d.t) || .2; q.act = { k: 'shot', t: T, T }; } else if (e.k === 'actcancel' || e.k === 'shot' || e.k === 'passwind') q.act = null; if (window.ANN) ANN.ev(q, e.k, e.d || {}); } }
    else if (e.e === 'bn') showBanner(e.im || null, e.a, e.b, e.secs, e.col || null);
    else if (e.e === 'goal') {
      const t = e.tm === 0 ? H1 : A1, p = pid2p(e.p); G.cele = { p: p, t: 2.6 }; if (p) { p.celeb = 2.6; for (const m of onIce(t)) if (m !== p) m.celeb = 2.4; } G.gfx = { d: t.dir > 0 ? -1 : 1, t: 3.2 }; G.excite = 1; shakeT = .7;
      const f = $('flash'); f.style.background = t.color; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); if (window.ANN && ANN.mode !== 'off') ANN.goal(p, t); else AU.speak('Goal! ' + (p ? p.name : t.name));
    }
  }
  function discrete(S) {
    G.clock = S.c; G.period = S.pd; swapSides(S.pd === 2); G.ot = !!S.ot; G.score = S.sc; G.shots = S.sh; G.pause = S.pa || 0; G.fo = { set: true, dropped: !S.fo };
    [H1, A1].forEach((t, ti) => {
      const ts = S.t[ti]; t.roster.forEach(p => { p.on = false; p.box = false; });
      const seats = {}; SL.forEach((s, i) => { const p = pid2p(ts.s[i]); seats[s] = p || null; if (p) { p.on = true; p.slot = s; } }); t.seats = seats; t.label = ts.lb || '';
      t.pen = ts.pen.map(e => { const p = pid2p(e[0]); if (p) p.box = true; return { p, t: e[1], why: '' }; }).filter(e => e.p);
    });
    puck.owner = pid2p(S.pk[4]); noteTxt = S.nt || ''; noteT = S.nt ? 1 : 0;
    const me = S.hc.find(h => h.side === NET.side); ctl = me ? pid2p(me.p) : null;
  }
  function positions(A, B, al) {
    [H1, A1].forEach((t, ti) => {
      const ma = new Map(A.t[ti].pl.map(e => [e[0], e]));
      for (const e of B.t[ti].pl) {
        const p = pid2p(e[0]); if (!p) continue; const a = ma.get(e[0]);
        if (a) { p.x = lerp(a[1], e[1], al); p.y = lerp(a[2], e[2], al); p.fa = lerpA(a[5], e[5], Math.min(1, al)); } else { p.x = e[1]; p.y = e[2]; p.fa = e[5]; }
        p.vx = e[3]; p.vy = e[4]; p.turn = e[6]; p.acc01 = e[7]; p.back = e[8]; p.st = e[9];
      }
      const ga = A.t[ti].g, gb = B.t[ti].g; t.goalie.x = lerp(ga[0], gb[0], al); t.goalie.y = lerp(ga[1], gb[1], al);
    });
    puck.x = lerp(A.pk[0], B.pk[0], al); puck.y = lerp(A.pk[1], B.pk[1], al); puck.vx = B.pk[2]; puck.vy = B.pk[3];
  }
  window.netFrame = function (dt) {
    if (!NET.on || !G) return;
    NET.acc += dt;
    if (NET.acc >= 1 / 30) { NET.acc = 0; const I = readLocal(); NET.send({ t: 'in', x: +I.nx.toFixed(2), y: +I.ny.toFixed(2), sh: I.sh ? 1 : 0, pw: +(I.pw || .5).toFixed(2), ps: I.ps ? 1 : 0, hit: I.hit ? 1 : 0, sw: I.sw ? 1 : 0 }); }
    { const q = NET.evq; if (q && q.length) { const nowt = performance.now(); while (q.length && q[0].at <= nowt) ev(q.shift().e); } }
    { const nw = performance.now(); if (NET.fT) NET.fps = (NET.fps || 60) * .92 + (1000 / Math.max(4, nw - NET.fT)) * .08; NET.fT = nw; }
    const buf = NET.buf; if (!buf.length) return; const rt = performance.now() - NET.delay;
    let a = buf[0], b = buf[buf.length - 1];
    for (let i = buf.length - 1; i > 0; i--) if (buf[i - 1].rt <= rt) { a = buf[i - 1]; b = buf[i]; break; }
    if (rt < buf[0].rt) a = b = buf[0];
    const al = a === b ? 1 : Math.max(0, Math.min(1.25, (rt - a.rt) / (b.rt - a.rt)));
    if (NET.cur !== b.s) { NET.cur = b.s; discrete(b.s); }
    positions(a.s, b.s, al);
  };
  // show player names under the scoreboard in online games
  const _hud = window.hud; window.hud = function () { _hud(); if (G && G.net) { const s = $('sub'); s.innerHTML = `<span>${esc(NET.names[1])}</span>` + s.innerHTML + `<span>${esc(NET.names[0])}</span>`; } };

  function buildChat() {
    const c = $('ochat'); if (c.firstChild) return;
    const tg = document.createElement('button'); tg.textContent = 'CHAT'; const list = document.createElement('div'); list.style.cssText = 'display:none;flex-direction:column;gap:3px';
    CHAT.forEach((m, i) => { const b = document.createElement('button'); b.textContent = m; b.onclick = () => { NET.send({ t: 'chat', i }); list.style.display = 'none'; }; list.appendChild(b); });
    tg.onclick = () => list.style.display = list.style.display === 'none' ? 'flex' : 'none'; c.appendChild(list); c.appendChild(tg);
  }
  function showEnd(m) {
    NET.on = false; const my = m.sc[NET.side], opp = m.sc[1 - NET.side];
    $('oet').textContent = my > opp ? 'VICTORY' : my < opp ? 'DEFEAT' : 'FINAL (TIE)';
    $('oes').textContent = `${TEAMS[m.away] ? TEAMS[m.away].abbr : ''} ${m.sc[1]} - ${m.sc[0]} ${TEAMS[m.home] ? TEAMS[m.home].abbr : ''}`;
    $('oesub').textContent = `SHOTS ${m.sh[1]} - ${m.sh[0]}  ·  ${NET.names[1]} (AWAY) vs ${NET.names[0]} (HOME)`;
    $('oRe').textContent = 'REMATCH'; $('oRe').disabled = false; $('oend').style.display = 'flex';
    const ch = $('oChat'); if (!ch.firstChild) CHAT.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c; b.onclick = () => NET.send({ t: 'chat', i }); ch.appendChild(b); });
  }
  function leaveToMenu() {
    NET.send({ t: 'leave' }); NET.room = null; NET.on = false; if (G) G.net = 0; peer('');
    $('oend').style.display = 'none'; $('online').style.display = 'none'; $('cdwin').style.display = 'none'; document.body.classList.remove('netgame');
    if (window.showMenu) window.showMenu();
  }

  // ---------------- online menu wiring ----------------
  function open() {
    $('menu').style.display = 'none'; $('online').style.display = 'flex'; view('onHome'); setStatus('CONNECTING...'); $('onName').value = NET.name;
    connect().then(() => setStatus('CONNECTED')).catch(e => { setStatus('OFFLINE'); toast(e.message, 5000); });
  }
  function need(fn) { return () => { NET.name = ($('onName').value || NET.name || 'Player').slice(0, 14); try { localStorage.setItem('lihl_name', NET.name); } catch (e) { } connect().then(() => { NET.send({ t: 'name', name: NET.name }); fn(); }).catch(e => toast(e.message, 5000)); }; }
  const bo = $('bonline'); if (bo) bo.onclick = open;
  $('onBack').onclick = () => { $('online').style.display = 'none'; if (window.showMenu) window.showMenu(); };
  $('onCreate').onclick = need(() => NET.send({ t: 'create', pub: false }));
  $('onCreatePub').onclick = need(() => NET.send({ t: 'create', pub: true }));
  $('onJoin').onclick = need(() => { view('onJoinV'); NET.send({ t: 'list' }); });
  $('onQuick').onclick = need(() => NET.send({ t: 'queue' }));
  $('onGo').onclick = need(() => NET.send({ t: 'join', code: $('onCode').value }));
  $('onRefresh').onclick = () => NET.send({ t: 'list' }); $('onJBack').onclick = () => view('onHome');
  $('onQCancel').onclick = () => NET.send({ t: 'unqueue' });
  $('lbLeave').onclick = () => { NET.send({ t: 'leave' }); NET.room = null; view('onHome'); setStatus('CONNECTED'); };
  $('lbReady').onclick = () => { const me = NET.room && NET.room.players[NET.room.you]; NET.send({ t: 'ready', v: !(me && me.ready) }); };
  $('lbCopy').onclick = () => { const l = link(); if (navigator.clipboard) navigator.clipboard.writeText(l).then(() => toast('Invite link copied'), () => toast(l, 6000)); else toast(l, 6000); };
  $('oRe').onclick = () => { NET.send({ t: 'rematch' }); $('oRe').textContent = 'WAITING FOR OPPONENT...'; $('oRe').disabled = true; };
  $('oLeave').onclick = leaveToMenu;
  // invitation links: ?room=LIHL-XXXX
  const inv = qs.get('room'); if (inv) { const go = () => { open(); setTimeout(() => { $('onCode').value = inv.toUpperCase(); need(() => NET.send({ t: 'join', code: inv }))(); }, 350); }; if (window.onReady) { const o = window.onReady; window.onReady = () => { o(); go(); }; } else window.addEventListener('load', go); }
})();
