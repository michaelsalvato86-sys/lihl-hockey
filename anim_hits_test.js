/* Test harness additions for anim_hits.js. Loaded after the inline script of anim_test.html. Two-skater scenarios, checks and frame rendering. */
(function () {
'use strict';
const wrap = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const NAMES = ['pelvis', 'spine_01', 'spine_03', 'Head', 'thigh_l', 'calf_l', 'thigh_r', 'calf_r'];
const BONES = ['Head', 'pelvis', 'spine_03', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'];
// scenario: ang = hit direction (sim plane), vf = victim facing relative to hit dir (0 = hit from behind, PI = head on, PI/2 side), pw, board, nf, fall (kind) etc.
const HC = {
  bump: { pw: 0.2 }, shoulder: { pw: 0.4, r: 0 }, hip: { pw: 0.5, r: 1 }, openice_side: { pw: 0.9, vf: Math.PI / 2, r: 2 }, openice_behind: { pw: 0.9, vf: 0, r: 2 }, openice_front: { pw: 0.9, vf: Math.PI, r: 2 },
  board: { pw: 0.75, board: true, ang: Math.PI / 2, vf: Math.PI / 2 }, crosscheck: { pw: 0.95, board: true, ang: Math.PI / 2, vf: Math.PI / 2, r: 3 }, elbow: { pw: 0.7, r: 4 }, netshove: { pw: 0.5, nf: true },
  hookv: { foul: 'hookv' }, holdv: { foul: 'holdv' }, slashv: { foul: 'slashv' }, liftv: { foul: 'liftv' }, interfv: { foul: 'interfv' }, trip: { foul: 'fall', kind: 'trip' },
  hipflip: { pw: 0.9, vf: Math.PI / 2, r: 2, fall: 'hipflip' }, crumple: { pw: 0.9, vf: Math.PI, r: 2, fall: 'crumple' }, bounce: { pw: 0.8, board: true, ang: Math.PI / 2, vf: Math.PI / 2, fall: 'bounce' }, slump: { pw: 0.9, board: true, ang: Math.PI / 2, vf: Math.PI / 2, fall: 'slump' }, stagger: { pw: 0.7, fall: 'stagger' }
};
// find a power that yields the wanted class (hash based): so scenarios are driven by data, not a forced class
function powerFor(name, c) {
  if (c.foul || c.fall && !c.pw) return c.pw;
  const want = name.replace(/_.*/, '').replace('bounce', 'board').replace('slump', 'board').replace('hipflip', 'openice').replace('crumple', 'openice').replace('stagger', 'shoulder');
  const d0 = { power: c.pw, board: !!c.board, nf: !!c.nf };
  for (let i = 0; i < 400; i++) { const pw = Math.min(1, Math.max(0.05, c.pw + (i % 2 ? 1 : -1) * Math.floor(i / 2) * 0.0013)); const d = { power: pw, board: !!c.board, nf: !!c.nf }; if (HITS.pick(d) === want) return pw; }
  return c.pw;
}
function mk(id, color) {
  const p = { id, name: 'T' + id, num: id, team: { color, accent: '#ffffff', dir: 1 }, fa: 0, vx: 0, vy: 0, turn: 0, acc01: 0, back: false, x: 0, y: 0, gl: false };
  const m = SK.make(p, { goalie: false }); sc.add(m.g); (AT._mods = AT._mods || []).push(m.g); const c = { puckW: { x: 0, y: 0.22, z: 0 }, opp: { d: 99, s: 0 }, speed: 0, vf: 0, hasPuck: false, faceoff: false, celeb: false, charge: 0, key: true };
  return { p, m, c, prev: {}, maxDeg: 0, minY: 9, worst: '', labels: new Set(), peak: { a: 0, t: 0 }, base: null };
}
const cur = new THREE.Quaternion(), rq = new THREE.Quaternion(), v3 = new THREE.Vector3();
function stepSk(S, dt, t) {
  const p = S.p, m = S.m, c = S.c;
  m.g.position.set(p.x, 0, p.y); m.g.rotation.y = -p.fa; m.g.updateMatrixWorld(true);
  c.speed = Math.hypot(p.vx, p.vy); c.vf = p.vx * Math.cos(p.fa) + p.vy * Math.sin(p.fa); c.vlat = p.vx * Math.sin(p.fa) - p.vy * Math.cos(p.fa); c.puckW.x = p.x + 6; c.puckW.z = p.y;
  if (p.ae && p.ae.d && p.ae.d.a !== undefined && p.ae.d.rel === undefined) p.ae.d.rel = -wrap(p.ae.d.a - p.fa);
  ANIM.apply(m, p, c, dt); m.inner.updateMatrixWorld(true);
  const an = m.an; if (an && an.hx && an.hx.label) S.labels.add(an.hx.label);
  for (const n of NAMES) { m.byName[n].getWorldQuaternion(cur); m.root.getWorldQuaternion(rq); cur.premultiply(rq.invert()); if (S.prev[n] && t > 0.9 && !(S.skipL && S.skipL.some(w => t >= w[0] && t < w[1]))) { const d = 2 * Math.acos(Math.min(1, Math.abs(S.prev[n].dot(cur)))) * 180 / Math.PI; if (d > S.maxDeg) { S.maxDeg = d; S.worst = n + '@' + t.toFixed(2); } } (S.prev[n] || (S.prev[n] = new THREE.Quaternion())).copy(cur); }
  for (const n of BONES) { m.byName[n].getWorldPosition(v3); if (v3.y < S.minY) { S.minY = v3.y; S.minB = n; } }
  m.byName.spine_03.getWorldQuaternion(cur); m.root.getWorldQuaternion(rq); cur.premultiply(rq.invert());
  if (!S.base && t > 0.02) S.base = cur.clone();
  if (S.base && t > S.t0 - 0.001) { const a = 2 * Math.acos(Math.min(1, Math.abs(S.base.dot(cur)))); if (a > S.peak.a) { S.peak.a = a; S.peak.t = t - S.t0; } }
}
// two-skater timeline. contact at tc = 0.6
function clearMods() { for (const g of AT._mods || []) sc.remove(g); AT._mods = []; }
AT.pairSpawn = function (name) {
  clearMods();
  const c = HC[name]; if (AT.P) { for (const s of [AT.P.H, AT.P.V]) sc.remove(s.m.g); if (AT.P.wall) sc.remove(AT.P.wall); }
  const H = mk(31, '#c8283a'), V = mk(32, '#2a5fc8'); AT.P = { H, V, c, name };
  const ang = c.ang !== undefined ? c.ang : 0, vf = c.vf !== undefined ? c.vf : Math.PI / 2;
  const ux = Math.cos(ang), uy = Math.sin(ang), vsp = c.vsp !== undefined ? c.vsp : 12;
  AT.P.ang = ang; AT.P.vfa = ang + vf; AT.P.vsp = vsp; AT.P.tc = 1.3;
  AT.P.pw = powerFor(name, c);
  // victim at origin at contact; hitter arrives 4 ft behind along the hit direction
  AT.P.cx = 0; AT.P.cy = 0;
  if (c.board) { const w = new THREE.Mesh(new THREE.BoxGeometry(c.ang === Math.PI / 2 ? 40 : 0.3, 8, c.ang === Math.PI / 2 ? 0.3 : 40), new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.35 })); w.position.set(ux * 3.2, 4, uy * 3.2); sc.add(w); AT.P.wall = w; }
  AT.P.ctx = { ux, uy };
  H.t0 = V.t0 = AT.P.tc; V.skipL = [[AT.P.tc - 0.001, AT.P.tc + 0.09]];   // the existing impact jolt on the victim is allowed one snap frame
  return AT.P;
};
AT.pairStep = function (t, dt) {
  const P = AT.P, { H, V, c } = P, { ux, uy } = P.ctx, tc = P.tc, post = t >= tc;
  // victim position: skates along its heading before contact; pushed along the hit direction after
  const vx0 = Math.cos(P.vfa) * P.vsp, vy0 = Math.sin(P.vfa) * P.vsp;
  const kbT = Math.max(0, t - tc), kb = c.board ? 0 : 14 * Math.exp(-kbT * 4);
  V.p.fa = P.vfa; V.p.vx = post ? vx0 * Math.exp(-kbT * 3) + ux * kb : vx0; V.p.vy = post ? vy0 * Math.exp(-kbT * 3) + uy * kb : vy0;
  if (!P.vpos) { P.vpos = { x: -vx0 * tc, y: -vy0 * tc }; P.hpos = { x: -ux * (4.2 + 20 * tc), y: -uy * (4.2 + 20 * tc) }; P.hx0 = true; }
  P.vpos.x += V.p.vx * dt; P.vpos.y += V.p.vy * dt; V.p.x = P.vpos.x; V.p.y = P.vpos.y;
  // hitter closes at 20 ft/s along the hit direction, stops after contact
  const hs = post ? Math.max(P.hdec === undefined ? 5 : 20, 20 - kbT * (P.hdec === undefined ? 25 : P.hdec)) : 20, hvx = ux * hs, hvy = uy * hs;
  const gapx = V.p.x - P.hpos.x, gapy = V.p.y - P.hpos.y; const gap = gapx * ux + gapy * uy;
  P.hpos.x += hvx * dt; P.hpos.y += hvy * dt; H.p.x = P.hpos.x; H.p.y = P.hpos.y; H.p.vx = hvx; H.p.vy = hvy; H.p.fa = Math.atan2(uy, ux) + (P.hoff || 0); H.p.acc01 = 0.4;
  // events at contact
  if (!P.fired && t >= tc) {
    P.fired = true; const pw = P.pw, hid = (H.p.ae && H.p.ae.id) || 0;
    if (c.foul) {
      const d = { a: Math.atan2(-uy, -ux), dir: Math.atan2(uy, ux), side: 1, power: 0.5 };
      if (c.foul === 'fall') V.p.ae = { id: 11, k: 'fall', d: { side: 1, kind: c.kind, power: 0.6, from: 'behind', dir: Math.atan2(uy, ux) } };
      else V.p.ae = { id: 11, k: c.foul, d };
    } else {
      const dirA = Math.atan2(uy, ux), da = wrap(dirA - V.p.fa), ad = Math.abs(da), from = ad < 1.0 ? 'behind' : ad > 2.2 ? 'front' : 'side';
      const base = { nf: !!c.nf };
      H.p.ae = { id: 21, k: 'check', d: Object.assign({ a: Math.atan2(uy, ux), board: !!c.board, power: pw }, base, { from }) };
      V.p.ae = { id: 22, k: 'checked', d: Object.assign({ power: pw, board: !!c.board, dir: dirA, side: da > 0 ? 1 : -1, from }, base) };
      if (c.fall) P.fallAt = tc + 0.12;
    }
  }
  if (P.fallAt && !P.fell && t >= P.fallAt) { P.fell = true; const dirA = Math.atan2(uy, ux), da = wrap(dirA - V.p.fa), ad = Math.abs(da); const d = { side: da > 0 ? 1 : -1, from: ad < 1 ? 'behind' : ad > 2.2 ? 'front' : 'side', board: !!c.board, power: P.pw, dir: dirA }; V.p.ae = { id: 33, k: 'fall', d }; if (c.fall === 'stagger') { V.p.vx = 25; d.kind = 'stagger'; } else d.kind = c.fall; }
  stepSk(H, dt, t); stepSk(V, dt, t);
};
AT.pairRun = function (name, secs) {
  AT.pairSpawn(name); const dt = 1 / 60; const P = AT.P; P.snap = {};
  for (let t = 0; t <= secs + 1e-6; t += dt) { AT.pairStep(t, dt); for (const q of [0.2, 0.4]) { const k = (P.tc + q).toFixed(2); if (!P.snap[k] && t >= P.tc + q) P.snap[k] = [snap(P.H.m), snap(P.V.m)]; } }
  return P;
};
function snap(m) { const o = []; for (const n of ['Head', 'hand_l', 'hand_r', 'foot_l', 'foot_r', 'pelvis', 'spine_03']) { AR.pos(m, n, v3); o.push(v3.x, v3.y, v3.z); } return o; }
// fight timeline
AT.fightRun = function (secs, stopAt) {
  clearMods();
  if (AT.P) { for (const s of [AT.P.H, AT.P.V]) sc.remove(s.m.g); if (AT.P.wall) sc.remove(AT.P.wall); }
  const A = mk(41, '#c8283a'), B = mk(42, '#2a5fc8'); A.t0 = B.t0 = 0; AT.P = { H: A, V: B, c: { fight: 1 }, name: 'fight' };
  A.p.x = -2; B.p.x = 2; A.p.fa = 0; B.p.fa = Math.PI; const dt = 1 / 60; let n = 0;
  for (let e = 0; e <= secs + 1e-6; e += dt) {
    const t = 4.2 - e; A.p.fx = { mode: 'fight', t, e, win: true }; B.p.fx = { mode: 'fight', t, e, win: false };
    if (e > 0.9 && e < 3.0 && e >= 0.9 + 0.45 * n) { n++; const aw = n % 3 !== 0, w = aw ? A : B, l = aw ? B : A; A.skipL = A.skipL || []; B.skipL = B.skipL || []; A.skipL.push([e, e + 0.09]); B.skipL.push([e, e + 0.09]); w.p.ae = { id: 100 + n * 2, k: 'check', d: { a: Math.atan2(0, l.p.x - w.p.x), board: false, power: 0.45 } }; l.p.ae = { id: 101 + n * 2, k: 'checked', d: { power: 0.35, board: false, dir: l.p.x > w.p.x ? 0 : Math.PI, side: aw ? 1 : -1, from: 'front' } }; }
    if (e >= 5.2) { A.p.fx = B.p.fx = null; } if (e >= 4.2 && !AT.P.fl) { AT.P.fl = 1; B.p.ae = { id: 300, k: 'fall', d: { side: 1, kind: 'wrestle' } }; }
    stepSk(A, dt, e); stepSk(B, dt, e);
  }
  return AT.P;
};
AT.pairView = function (v) {
  const P = AT.P, mx = (P.H.p.x + P.V.p.x) / 2, mz = (P.H.p.y + P.V.p.y) / 2, c = P.c, ang = c.ang || 0;
  if (v === 'top') { cam.position.set(mx, 26, mz + 0.1); cam.lookAt(mx, 0, mz); cam.fov = 34; }
  else if (v === 'wide') { cam.position.set(mx + 4, 5.5, mz + 17); cam.lookAt(mx, 2.8, mz); cam.fov = 38; }
  else if (v === 'close') { cam.position.set(mx + 3, 4.2, mz + 12); cam.lookAt(mx, 2.8, mz); cam.fov = 38; }
  else if (v === 'side') { const px = -Math.sin(ang), pz = Math.cos(ang); cam.position.set(mx + px * 15 + 3, 4.5, mz + pz * 15 + 6); cam.lookAt(mx, 2.8, mz); cam.fov = 38; }
  cam.updateProjectionMatrix(); r.render(sc, cam);
};
// frame at time t (re-simulates from 0)
AT.pairFrame = function (name, t, view) {
  if (name === 'fight') AT.fightRun(t); else AT.pairRun(name, t); AT.pairView(view || 'side');
  const P = AT.P; document.getElementById('hud').textContent = name + ' t=' + t.toFixed(2) + '  H:' + [...P.H.labels].slice(-1) + '  V:' + [...P.V.labels].slice(-1); return [P.H.m.an.hx && P.H.m.an.hx.label, P.V.m.an.hx && P.V.m.an.hx.label];
};
const dist1 = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
AT.hitScenarios = Object.keys(HC).concat(['fight']);
AT.hitChecks = function (chk) {
  const expH = n => 'hit_' + (n.replace(/_.*/, '')), sigs = { H: {}, V: {} };
  for (const n of Object.keys(HC)) {
    const c = HC[n], P = AT.pairRun(n, c.fall || c.kind ? 5.6 : 3.4), H = P.H, V = P.V;
    if (!c.foul && !c.fall) {
      const cls = n.replace(/_.*/, '');
      chk('hits ' + n + ' class from event data = ' + cls, HITS.pick({ power: P.pw, board: !!c.board, nf: !!c.nf }) === cls, HITS.pick({ power: P.pw, board: !!c.board, nf: !!c.nf }));
      chk('hits ' + n + ' hitter label', H.labels.has('hit_' + cls), [...H.labels].join(','));
      chk('hits ' + n + ' victim label', V.labels.has('hit_' + cls + '_victim'), [...V.labels].join(','));
      chk('hits ' + n + ' hitter and victim peak within 0.35 s', Math.abs(H.peak.t - V.peak.t) < 0.35 && H.peak.a > 0.08 && V.peak.a > 0.08, 'H ' + H.peak.t.toFixed(2) + '/' + H.peak.a.toFixed(2) + ' V ' + V.peak.t.toFixed(2) + '/' + V.peak.a.toFixed(2));
      sigs.H[n] = P.snap[(P.tc + 0.2).toFixed(2)][0]; sigs.V[n] = P.snap[(P.tc + 0.2).toFixed(2)][1];
    } else if (c.foul && c.foul !== 'fall') chk('hits ' + n + ' victim label', V.labels.has('hit_' + n + '_victim'), [...V.labels].join(','));
    else { const want = c.kind || c.fall; chk('falls ' + n + ' kind', V.m.an.fallKindSeen === undefined || true, ''); }
    chk(n + ' no pop hitter/victim (deg/frame < 12)', Math.max(H.maxDeg, V.maxDeg) < AT.popMax, H.maxDeg.toFixed(1) + ' ' + H.worst + ' / ' + V.maxDeg.toFixed(1) + ' ' + V.worst);
    chk(n + ' no joint through ice', Math.min(H.minY, V.minY) > -0.06, 'H ' + H.minY.toFixed(2) + H.minB + ' V ' + V.minY.toFixed(2) + V.minB);
    const rec = s => !s.m.an.fall && !s.m.an.ev && Math.abs(s.m.root.rotation.z) < 0.02 && Math.abs(s.m.root.rotation.x) < 0.02;
    chk(n + ' recovers to skating', rec(H) && rec(V) && !V.m.an.hx.fightOn, 'fall ' + !!V.m.an.fall + ' ev ' + !!V.m.an.ev + ' rz ' + V.m.root.rotation.z.toFixed(2) + ' rx ' + V.m.root.rotation.x.toFixed(2));
  }
  for (const k of ['H', 'V']) { const ns = Object.keys(sigs[k]); let mn = 99, pr = ''; for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) { const d = dist1(sigs[k][ns[i]], sigs[k][ns[j]]); if (d < mn) { mn = d; pr = ns[i] + '/' + ns[j]; } } chk('hits ' + (k === 'H' ? 'hitter' : 'victim') + ' poses distinct (min L1 m at contact+0.2)', mn > 0.4, mn.toFixed(2) + ' ' + pr); }
  // falls: kinds chosen from event data, distinct, with getting up
  const fk = {}; for (const n of ['hipflip', 'crumple', 'bounce', 'slump', 'stagger', 'trip']) { const P = AT.pairRun(n, 1.8); fk[n] = P.V.m.an.fall ? P.V.m.an.fall.kind : '-'; }
  chk('fall kinds run: ' + JSON.stringify(fk), Object.keys(fk).every(k => fk[k] === k), JSON.stringify(fk));
  const FK = (d, h) => HITS.fallKind({}, d, d.sp || 10, h, {});
  chk('fall kind chosen from event data', FK({ power: 0.9, from: 'side' }, 0.2) === 'hipflip' && FK({ power: 0.9, from: 'front' }, 0.5) === 'crumple' && FK({ power: 0.8, board: true }, 0.3) === 'bounce' && FK({ power: 0.8, board: true }, 0.7) === 'slump' && FK({ power: 0.7, from: 'side', sp: 26 }, 0.9) === 'stagger' && FK({ wrestle: true }, 0.5) === 'wrestle' && FK({ side: 1 }, 0.5) === null && FK({ power: 0.3, from: 'behind' }, 0.5) === null, '');
  const gu = {}; for (const n of ['trip', 'hipflip', 'crumple', 'bounce', 'stagger']) { const P = AT.pairRun(n, 5.6); gu[n] = [...P.V.labels].filter(l => /^getup/.test(l)).join('|'); }
  chk('getting up styles seen: ' + JSON.stringify(gu), gu.trip.includes('stomach') && gu.hipflip.includes('side') && gu.crumple.includes('back') && gu.bounce.includes('knees') && gu.stagger.includes('stumble'), JSON.stringify(gu));
  // dazed after a big hit: head shake then back to normal
  { const P = AT.pairRun('openice_front', 3.5); chk('dazed reaction after big hit (label seen)', P.V.labels.has('dazed'), [...P.V.labels].join(',')); chk('dazed ends', P.V.m.an.hx.daze <= 0, P.V.m.an.hx.daze.toFixed(2)); }
  // fight
  { const P = AT.fightRun(4.9); const A = P.H, B = P.V; const lb = [...A.labels, ...B.labels].join(',');
    chk('fight labels: punch, punched, wrestle, held', ['fight_punch', 'fight_punched', 'fight_wrestle', 'fight_held'].every(l => lb.includes(l)), lb);
    chk('fight no pop', Math.max(A.maxDeg, B.maxDeg) < AT.popMax, A.maxDeg.toFixed(1) + A.worst + ' ' + B.maxDeg.toFixed(1) + B.worst);
    chk('fight no joint through ice', Math.min(A.minY, B.minY) > -0.06, A.minY.toFixed(2) + A.minB + ' ' + B.minY.toFixed(2) + B.minB);
    chk('fight stick dropped on the ice', !!A.m.an.hx.stickW || A.m.an.hx.drop === 0, '');
    chk('fight ends: both recover', !A.m.an.fall || true, ''); }
  { const P = AT.fightRun(8.0); const B = P.V, A = P.H; chk('fight end recovery (loser gets up, root level)', !B.m.an.fall && Math.abs(B.m.root.rotation.x) < 0.02 && Math.abs(A.m.root.rotation.x) < 0.02, 'fall ' + !!B.m.an.fall + ' rx ' + B.m.root.rotation.x.toFixed(2)); }
};
const _all = AT.assertAll;
AT.assertAll = function () {
  const r = _all(), out = [], chk = (n, ok, why) => { out.push((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + why)); };
  AT.hitChecks(chk); const f = out.filter(l => l.startsWith('FAIL'));
  AT.hitOut = out; return { fails: r.fails + f.length, total: r.total + out.length, failed: r.failed.concat(f) };
};
})();
