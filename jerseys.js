/* Jersey variants (cosmetic only). A jersey is {slot,color,accent,number,numberTrim,crest,style,yoke,sleeve,stripe,trim,pants,socks}.
   Styled jerseys paint ONE shared canvas atlas per variant (cached in JT.cache, never per player or per frame) that is mapped onto the existing
   merged cloth mesh by a second UV set (SK.cloth.uvJ). Draw calls do not change. See docs/JERSEYS.md.
   Atlas (512 px design space, scaled to 256 on mobile): rows 0-192 torso (front panel left half, back panel right half),
   192-288 sleeve (cylinder around the arm, v along it), 288-400 pants, 400-512 socks. The last 4x4 px are white (used by gloves and skates). */
const JT = { cache: {}, R: { torso: [0, 192], sleeve: [192, 288], pants: [288, 400], socks: [400, 512] }, built: 0, made: 0 };
JT.TOP = 1.595; JT.HEM = 1.045; JT.WAIST = 1.10; JT.PHEM = 0.544; JT.SOCK_TOP = 0.545; JT.SOCK_BOT = 0.074; JT.SLV0 = 0.255; JT.SLV1 = 0.485; JT.HEMLIFT = 0.075;

/* hand-made styles for Whiskey Stick (colors sampled from the reference photos and the Mach 1 template) */
JT.STYLES = {
  ws_black: {
    gloves: '#16171a', body: '#121316', sleeve: '#121316', yoke: '#1f5a3a', yokeH: 0.115, vneck: { c: '#1f5a3a', trim: '#efe3c3', depth: 0.14, w: 0.085 }, yokeLine: [{ h: 0.02, c: '#7a1f2d' }, { h: 0.012, c: '#efe3c3' }],
    sleeveYoke: 0.3, sleeveBands: [{ t0: 0.42, t1: 0.5, c: '#7a1f2d' }, { t0: 0.5, t1: 0.56, c: '#efe3c3' }, { t0: 0.8, t1: 1, tribal: ['#efe3c3', '#7a1f2d', '#1f5a3a'] }],
    hem: [{ h: 0.03, c: '#7a1f2d' }, { h: 0.012, c: '#1f5a3a' }, { h: 0.075, tribal: ['#efe3c3', '#7a1f2d', '#1f5a3a'] }],
    pants: '#7a1f2d', pantsHem: [{ h: 0.03, c: '#efe3c3' }], socks: '#7a1f2d', sockBands: [{ y0: 0.40, y1: 0.47, tribal: ['#efe3c3', '#7a1f2d', '#1f5a3a'] }, { y0: 0.47, y1: 0.49, c: '#1f5a3a' }]
  },
  ws_white: {
    gloves: '#f1f1ef', body: '#f4f4f2', sleeve: '#f4f4f2', yoke: null, vneck: { c: '#111111', trim: '#c4202e', depth: 0.10, w: 0.07 },
    sleeveBands: [{ t0: 0.62, t1: 0.7, c: '#111111' }, { t0: 0.7, t1: 0.78, c: '#c4202e' }, { t0: 0.78, t1: 0.86, c: '#111111' }],
    hem: [{ h: 0.025, c: '#111111' }, { h: 0.02, c: '#c4202e' }, { h: 0.025, c: '#111111' }],
    pants: '#b8202e', pantsHem: [], socks: '#f4f4f2', sockBands: [{ y0: 0.38, y1: 0.42, c: '#111111' }, { y0: 0.42, y1: 0.46, c: '#c4202e' }, { y0: 0.46, y1: 0.5, c: '#111111' }], patch: 'flag'
  },
  ws_purple: {
    gloves: '#16171a', body: '#4b3d8a', sleeve: '#4b3d8a', yoke: null, vneck: { c: '#101010', trim: '#a8714c', depth: 0.10, w: 0.075 },
    sleeveBands: [{ t0: 0.5, t1: 0.9, bandsTribal: true }],
    hem: [{ h: 0.012, c: '#a8714c' }, { h: 0.008, c: '#101010' }, { h: 0.012, c: '#a8714c' }, { h: 0.075, tribal: ['#ede4cf', '#4b3d8a', '#4b3d8a'] }, { h: 0.01, c: '#101010' }, { h: 0.012, c: '#a8714c' }],
    pants: '#101010', pantsHem: [], socks: '#4b3d8a', sockBands: [{ y0: 0.38, y1: 0.44, c: '#ede4cf' }], patch: 'lihl'
  }
};
/* generic style from a league-store jersey (data/jerseys_store.json fields: body,yoke,sleeve,stripe,trim,pants,socks) */
JT.generic = function (j) {
  const body = j.color || j.body, yoke = j.yoke && j.yoke !== body ? j.yoke : null, st = j.stripe || j.accent, tr = j.trim || st;
  return { body, sleeve: j.sleeve || body, yoke, yokeH: 0.1, sleeveYoke: yoke ? 0.3 : 0, sleeveBands: [{ t0: 0.78, t1: 0.86, c: st }, { t0: 0.86, t1: 0.94, c: tr }],
    hem: [{ h: 0.03, c: st }, { h: 0.015, c: tr }], pants: j.pants || null, socks: j.socks || null, sockBands: [] };
};
JT.styleOf = function (j) { return j && (JT.STYLES[j.style] || (j.slot !== undefined && j.stripe !== undefined ? JT.generic(j) : null)); };

JT.paint = function (st, mob) {
  const W = 512, S = mob ? 0.5 : 1, c = document.createElement('canvas'); c.width = c.height = W * S; const x = c.getContext('2d'); x.scale(S, S);
  const R = JT.R, ty = y => R.torso[0] + (JT.TOP - y) / (JT.TOP - JT.HEM) * (R.torso[1] - R.torso[0]), tpm = (R.torso[1] - R.torso[0]) / (JT.TOP - JT.HEM);
  const rect = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const tribal = (a, b, w, h, cols, ax) => {   // stepped pyramids: bg, foreground, small accent block on top
    rect(a, b, w, h, cols[0]); const uw = h * 1.5 * ax, th = h * 0.13; x.fillStyle = cols[1];
    for (let u = uw * 0.1; u < w; u += uw) {
      const hh = h - 2 * th, sw = uw * 0.8, st = hh / 3;
      for (let k = 0; k < 3; k++) x.fillRect(a + u + sw * k * 0.17, b + h - th - st * (k + 1), sw * (1 - 0.34 * k), st + 0.5);
      if (cols[2] && cols[2] !== cols[0] && cols[2] !== cols[1]) { x.fillStyle = cols[2]; x.fillRect(a + u + sw * 0.4, b + th + 1, sw * 0.2, st * 0.5); x.fillStyle = cols[1]; }
    }
    rect(a, b, w, th, cols[1]); rect(a, b + h - th, w, th, cols[1]);
  };
  // ---- torso ----
  rect(0, R.torso[0], W, R.torso[1] - R.torso[0], st.body);
  const hemH = (st.hem || []).reduce((s, b) => s + b.h, 0);
  if (st.yoke) { rect(0, R.torso[0], W, st.yokeH * tpm, st.yoke); let yy = R.torso[0] + st.yokeH * tpm; for (const l of st.yokeLine || []) { rect(0, yy, W, l.h * tpm, l.c); yy += l.h * tpm; } }
  if (st.vneck) {   // V at the front panel (u .25), pointing down
    const v = st.vneck, cx = 128, hw = v.w * 474, d = v.depth * tpm, y0 = R.torso[0];
    for (const [k, col] of [[1.35, v.trim], [1, v.c]]) { x.fillStyle = col; x.beginPath(); x.moveTo(cx - hw * k, y0 - 1); x.lineTo(cx + hw * k, y0 - 1); x.lineTo(cx, y0 + d * (k === 1 ? 1 : 1.18)); x.closePath(); x.fill(); }
    x.fillStyle = v.c; x.beginPath(); x.moveTo(384 - hw * 1.25, y0 - 1); x.lineTo(384 + hw * 1.25, y0 - 1); x.lineTo(384 + hw * 1.25, y0 + 0.05 * tpm); x.lineTo(384 - hw * 1.25, y0 + 0.05 * tpm); x.fill(); // back collar
  }
  let by = R.torso[1] - JT.HEMLIFT * tpm; { const f = (st.hem || [])[0]; rect(0, by, W, JT.HEMLIFT * tpm, f ? (f.c || f.tribal[0]) : st.body); }   // the belt hides the lowest 7 cm, so the hem bands start above it
  for (const b of st.hem || []) { by -= b.h * tpm; if (b.tribal) tribal(0, by, W, b.h * tpm, b.tribal, 1.35); else rect(0, by, W, b.h * tpm + 0.5, b.c); }
  // ---- sleeve (t along the arm: 0 shoulder, 1 cuff) ----
  const sr = R.sleeve, sh = sr[1] - sr[0]; rect(0, sr[0], W, sh, st.sleeve || st.body);
  if (st.yoke && st.sleeveYoke) rect(0, sr[0], W, sh * st.sleeveYoke, st.yoke);
  for (const b of st.sleeveBands || []) {
    if (b.bandsTribal) { const t0 = sr[0] + sh * 0.46, t1 = sh * 0.46; rect(0, sr[0] + sh * 0.40, W, sh * 0.04, '#a8714c'); rect(0, sr[0] + sh * 0.44, W, sh * 0.02, '#101010'); tribal(0, sr[0] + sh * 0.46, W, sh * 0.34, ['#ede4cf', '#4b3d8a', '#4b3d8a'], 3.2); rect(0, sr[0] + sh * 0.80, W, sh * 0.02, '#101010'); rect(0, sr[0] + sh * 0.82, W, sh * 0.04, '#a8714c'); }
    else if (b.tribal) tribal(0, sr[0] + sh * b.t0, W, sh * (b.t1 - b.t0), b.tribal, 3.4); else rect(0, sr[0] + sh * b.t0, W, sh * (b.t1 - b.t0), b.c);
  }
  if (st.patch === 'flag' || st.patch === 'lihl') {   // shoulder patch near the top of the sleeve (u .5 is the upward side of the arm)
    const px = 256 - 40, py = sr[0] + sh * 0.1, pw = 80, ph = sh * 0.3;
    if (st.patch === 'flag') { rect(px, py, pw, ph, '#ffffff'); for (let i = 0; i < 7; i++) rect(px, py + ph * i / 7, pw, ph / 13, '#c4202e'); rect(px, py, pw * 0.42, ph * 0.54, '#2a3f86'); }
    else { rect(px + 10, py, 60, ph, '#1a1a1e'); rect(px + 14, py + 3, 52, ph - 6, '#3b3b44'); x.fillStyle = '#d8d8e0'; x.font = 'bold ' + Math.round(ph * 0.6) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LIHL', px + 40, py + ph / 2); }
  }
  // ---- pants ----
  const pr = R.pants, ph2 = pr[1] - pr[0], ppm = ph2 / (JT.WAIST - JT.PHEM); rect(0, pr[0], W, ph2, st.pants || st.body);
  let py2 = pr[1]; for (const b of st.pantsHem || []) { py2 -= b.h * ppm; rect(0, py2, W, b.h * ppm, b.c); }
  // ---- socks ----
  const kr = R.socks, kh = kr[1] - kr[0], kpm = kh / (JT.SOCK_TOP - JT.SOCK_BOT); rect(0, kr[0], W, kh, st.socks || st.pants || st.body);
  for (const b of st.sockBands || []) { const yy = kr[0] + (JT.SOCK_TOP - b.y1) * kpm, hh = (b.y1 - b.y0) * kpm; if (b.tribal) tribal(0, yy, W, hh, b.tribal, 4.6); else rect(0, yy, W, hh, b.c); }
  rect(W - 4, W - 4, 4, 4, '#ffffff');
  JT.made++;
  return c;
};
/* shared, cached atlas texture for a jersey variant (null when the jersey is a plain color jersey) */
JT.texture = function (j, mob) {
  const st = JT.styleOf(j); if (!st) return null; const key = (j.style || ('g:' + j.color + j.accent + (j.yoke || '') + (j.stripe || ''))) + (mob ? 'm' : 'd');
  let t = JT.cache[key]; if (t) return t;
  t = new THREE.CanvasTexture(JT.paint(st, mob)); t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = mob ? 1 : 4; t.userData = { key };
  return JT.cache[key] = t;
};

/* second UV set for the merged cloth mesh: a duplicate-where-needed copy of SK.cloth (same attributes, new uv, same skinning) */
JT.buildCloth = function () {
  const C = SK.cloth; if (C.J) return C.J;
  const pos = C.position, n = pos.count, idx = C.index.array, R = JT.R, W = 512, TWO = Math.PI * 2;
  const grp = (t) => { const r = C.rid[idx[t]]; if (r === 0) { const cx = Math.abs(pos.getX(idx[t]) + pos.getX(idx[t + 1]) + pos.getX(idx[t + 2])) / 3; return cx > JT.SLV0 ? 1 : 0; } return r === 1 ? 2 : r === 2 ? 3 : 4; };
  const uvOf = (v, g) => {   // returns [u,vv] before seam unwrapping
    const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
    if (g === 0) { const front = z > -0.02; const u = front ? 0.25 + x * 0.89 : 0.75 - x * 0.89; return [u, (R.torso[0] + (JT.TOP - y) / (JT.TOP - JT.HEM) * (R.torso[1] - R.torso[0])) / W]; }
    if (g === 1) { const t = Math.min(1, Math.max(0, (Math.abs(x) - JT.SLV0) / (JT.SLV1 - JT.SLV0))); return [0.5 + Math.atan2(z + 0.065, y - 1.455) / TWO, (R.sleeve[0] + t * (R.sleeve[1] - R.sleeve[0])) / W]; }
    if (g === 2) { const xc = x < 0 ? -0.1143 : 0.1143; return [0.5 + Math.atan2(x - xc, z + 0.036) / TWO, (R.pants[0] + Math.min(1, Math.max(0, (JT.WAIST - y) / (JT.WAIST - JT.PHEM))) * (R.pants[1] - R.pants[0])) / W]; }
    if (g === 3) { const xc = x < 0 ? -0.1143 : 0.1143; return [0.5 + Math.atan2(x - xc, z + 0.036) / TWO, (R.socks[0] + Math.min(1, Math.max(0, (JT.SOCK_TOP - y) / (JT.SOCK_TOP - JT.SOCK_BOT))) * (R.socks[1] - R.socks[0])) / W]; }
    return [1 - 2 / W, 1 - 2 / W];
  };
  const map = new Map(), P = [], N = [], U = [], SI = [], SW = [], RID = [], I = [];
  for (let t = 0; t < idx.length; t += 3) {
    const g = grp(t), uv = [0, 1, 2].map(k => uvOf(idx[t + k], g)); let sh = [0, 0, 0];
    if (g === 0 || g === 1 || g === 2 || g === 3) { // unwrap the u seam per triangle
      for (let k = 1; k < 3; k++) sh[k] = Math.round(uv[0][0] - uv[k][0]);
    }
    for (let k = 0; k < 3; k++) {
      const v = idx[t + k], key = v + '|' + g + '|' + sh[k]; let j = map.get(key);
      if (j === undefined) {
        j = P.length / 3; map.set(key, j); P.push(pos.getX(v), pos.getY(v), pos.getZ(v)); N.push(C.normal.getX(v), C.normal.getY(v), C.normal.getZ(v)); U.push(uv[k][0] + sh[k], uv[k][1]);
        for (let q = 0; q < 4; q++) { SI.push(C.skinIndex.array[v * 4 + q]); SW.push(C.skinWeight.array[v * 4 + q]); } RID.push(C.rid[v]);
      }
      I.push(j);
    }
  }
  const J = C.J = { position: new THREE.BufferAttribute(new Float32Array(P), 3), normal: new THREE.BufferAttribute(new Float32Array(N), 3), uv: new THREE.BufferAttribute(new Float32Array(U), 2),
    skinIndex: new THREE.BufferAttribute(new Uint16Array(SI), 4), skinWeight: new THREE.BufferAttribute(new Float32Array(SW), 4), index: new THREE.BufferAttribute(new Uint32Array(I), 1), rid: new Uint8Array(RID) };
  return J;
};
