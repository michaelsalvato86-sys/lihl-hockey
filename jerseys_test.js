/* Jersey variant checks, run from anim_test.html (AT.assertAll). Texture generated once and cached, atlas colors correct, vertex colors neutral on cloth,
   no allocation per frame, Michael Salvato keeps the St. Beer jersey, plain jerseys unchanged. */
window.JERSEY_TEST = function (AT, chk) {
  if (typeof JT === 'undefined') { chk('jerseys.js loaded', false, 'JT missing'); return; }
  const WS = {
    ws_black: { style: 'ws_black', color: '#121316', accent: '#7a1f2d', number: '#efe3c3', numberTrim: '#7a1f2d' },
    ws_white: { style: 'ws_white', color: '#f4f4f2', accent: '#c4202e', number: '#111111', numberTrim: '#c4202e' },
    ws_purple: { style: 'ws_purple', color: '#4b3d8a', accent: '#a8714c', number: '#ede4cf', numberTrim: '#a8714c' } };
  const px = (cv, x, y) => { const d = cv.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
  const near = (a, hex, tol) => { const h = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)); return a.every((v, i) => Math.abs(v - h[i]) <= (tol || 6)); };
  const mk = (j, name) => SK.make({ id: 5, num: 17, name: name || 'Test Skater', team: { color: j.color, accent: j.accent, jersey: j } }, {});
  const cloth = m => { let c = null; m.root.parent && m.root.parent.traverse && 0; m.g.traverse(o => { if (o.isSkinnedMesh && o.material && o.material.vertexColors && o.geometry.attributes.color && o.geometry.attributes.position.count > 3000) c = o; }); return c; };
  const made0 = JT.made;
  const mb = mk(WS.ws_black), mb2 = mk(WS.ws_black), mw = mk(WS.ws_white), mp = mk(WS.ws_purple);
  chk('jersey atlas painted once per variant (3 variants, 4 skaters => 3 textures)', JT.made - made0 === 3, JT.made - made0);
  const cb = cloth(mb), cb2 = cloth(mb2), cw = cloth(mw), cp = cloth(mp);
  chk('styled cloth carries the shared variant texture', cb && cb.material.map && cb.material.map === cb2.material.map && cb.material.map !== cw.material.map);
  const tb = cb.material.map.image, tw = cw.material.map.image, tp = cp.material.map.image;
  chk('atlas is 512x512 on desktop (or 256 on mobile)', tb.width === (SK.mobile() ? 256 : 512) && tb.height === tb.width, tb.width);
  const S = tb.width / 512;
  chk('BLACK torso is black', near(px(tb, 256 * S | 0, 100 * S | 0), '#121316'), px(tb, 256 * S | 0, 100 * S | 0));
  chk('BLACK yoke is forest green', near(px(tb, 60 * S | 0, 8 * S | 0), '#1f5a3a'), px(tb, 60 * S | 0, 8 * S | 0));
  chk('BLACK pants are maroon', near(px(tb, 100 * S | 0, 330 * S | 0), '#7a1f2d'), px(tb, 100 * S | 0, 330 * S | 0));
  chk('WHITE torso is white', near(px(tw, 256 * S | 0, 100 * S | 0), '#f4f4f2'), px(tw, 256 * S | 0, 100 * S | 0));
  chk('WHITE pants are red', near(px(tw, 100 * S | 0, 330 * S | 0), '#b8202e'), px(tw, 100 * S | 0, 330 * S | 0));
  chk('PURPLE torso is PMS 7672C purple', near(px(tp, 256 * S | 0, 100 * S | 0), '#4b3d8a'), px(tp, 256 * S | 0, 100 * S | 0));
  chk('PURPLE pants are black', near(px(tp, 100 * S | 0, 330 * S | 0), '#101010'), px(tp, 100 * S | 0, 330 * S | 0));
  const ca = cb.geometry.attributes.color.array, C = SK.cloth.J, rid = C.rid; let bad = 0; for (let i = 0; i < rid.length; i++) if (rid[i] <= 2 && (ca[i * 3] < 0.99 || ca[i * 3 + 1] < 0.99 || ca[i * 3 + 2] < 0.99)) bad++;
  chk('vertex colors are neutral white on jersey/pants/socks (texture shows true colors)', bad === 0, bad);
  chk('styled cloth keeps one draw call: same mesh count as a plain skater', (() => { const n = o => { let k = 0; o.g.traverse(q => { if (q.isMesh || q.isSkinnedMesh) k++; }); return k; }; return n(mb) === n(mk({ color: '#c8283a', accent: '#fff' })); })());
  const uv = C.uv; let uvOk = true; for (let i = 0; i < uv.count; i++) { const v = uv.getY(i); if (!(v >= 0 && v <= 1)) uvOk = false; }
  chk('jersey UVs stay inside the atlas rows', uvOk);
  // no allocation per frame: posing 300 frames neither paints nor creates textures/geometries
  const gcount = () => { let k = 0; AT.renderer && 0; return k; };
  const made1 = JT.made, cache1 = Object.keys(JT.cache).length, geoUuid = cb.geometry.uuid;
  for (let i = 0; i < 300; i++) { try { SK.setPose(mb, SK.skatePose(mb, i * 0.1, 0.6, 0)); } catch (e) { } }
  chk('no jersey painting or texture creation while animating (300 frames)', JT.made === made1 && Object.keys(JT.cache).length === cache1 && cb.geometry.uuid === geoUuid);
  const mm = mk(WS.ws_black, 'Michael Salvato'), cm = cloth(mm);
  chk('Michael Salvato keeps the St. Beer jersey on any team (no Whiskey Stick atlas)', cm && !cm.material.map);
  const mj = mk({ color: '#c8283a', accent: '#ffffff' }), cj = cloth(mj);
  chk('plain jersey (no style) is unchanged: vertex-color cloth, no map', cj && !cj.material.map);
  const g = JT.generic({ slot: 'home', color: '#000c40', yoke: '#000c40', sleeve: '#000c40', stripe: '#d4b24a', trim: '#fff', accent: '#d4b24a' });
  chk('store jersey fields make a generic style (body, stripe)', g && g.body === '#000c40' && g.hem[0].c === '#d4b24a');
};
