(function () {
/* Event-to-animation system (cosmetic only; no sim state is read or written beyond p.ae delivery).
   One place for: (1) EVENTS, the mapping from every sim event to the animation that consumes it;
   (2) PRIO and the interruption rules (canInterrupt / admit) used by anim_ctrl and anim_goalie before an event starts an animation;
   (3) the dedupe guard (accept) so one gameplay event never starts an animation twice, and a same-tick conflict rule;
   (4) route(): defers follow-up events (goalie cover right after a save) so the first animation is not overwritten;
   (5) per-event stats (AEV.stats) read by the Playwright audit and by docs/ANIMATION_INVENTORY.md.
   Hooks (one line each): game.html AE() -> route/accept, game.html step() -> tick, anim_ctrl.js / anim_goalie.js event gate -> admit,
   net.js ev() -> accept + deliver, anim_celebrate.js tick -> celebAllowed. */
'use strict';
const AEV = {};

/* ---------- 1. event table ----------
   who: s skater, g goalie.  cls: priority class.  d: payload fields.  anim: state labels it produces.  src: where the sim emits it. */
AEV.EVENTS = {
  shotwind: { who: 's', cls: 'windup', d: 't,kind', anim: ['preparing_shot'], src: 'startAct (human shot press, AI shot decision)', note: 'drives p.act; the windup pose reads p.act, not this event' },
  passwind: { who: 's', cls: 'windup', d: 't,kind', anim: ['passing'], src: 'startAct (pass)', note: 'drives p.act' },
  actcancel: { who: 's', cls: 'cancel', d: '', anim: [], src: 'tickAct when stunned, possession lost or game over', note: 'only way a windup is cancelled' },
  shot: { who: 's', cls: 'release', d: 'kind,pw,a,z,len', anim: ['shot_wrist', 'shot_snap', 'shot_slap', 'shot_onetimer', 'shot_backhand', 'shot_quick', 'shot_volley'], src: 'shoot() at puck release' },
  pass: { who: 's', cls: 'release', d: 'a,len,sp', anim: ['passing', 'pass_saucer', 'pass_drop', 'pass_slap', 'pass_onehand', 'pass_bank', 'pass_backhand'], src: 'pass() at puck release' },
  recv: { who: 's', cls: 'recv', d: '', anim: ['receiving_pass'], src: 'pass() for the intended receiver' },
  gain: { who: 's', cls: 'recv', d: 'q,z,sp', anim: ['recv_glove', 'recv_tip', 'recv_cradle', 'recv_kick', 'recv_reach', 'recv_backhand'], src: 'puck pickup / reception resolution (clean, difficult, bobble, deflect, miss)' },
  otwind: { who: 's', cls: 'windup', d: 'eta', anim: ['one_timer_ready'], src: 'AI one-timer detect; human one-timer press' },
  poke: { who: 's', cls: 'contact', d: 'a', anim: ['poke_check', 'stick_lift', 'poke_dive'], src: 'step() poke-check strip of the carrier' },
  hitwind: { who: 's', cls: 'contact', d: 'a,d', anim: ['hit_windup'], src: 'human hit press (builds the lunge)' },
  hitcommit: { who: 's', cls: 'contact', d: 'a', anim: ['body_check'], src: 'step() hit contact frame (human lunge reaches target)' },
  hitmiss: { who: 's', cls: 'contact', d: '', anim: ['hit_miss'], src: 'step() hit lunge ends with no contact' },
  check: { who: 's', cls: 'contact', d: 'a,board,power,from,nf', anim: ['body_check', 'hit_*'], src: 'step() hit resolution; fight exchanges' },
  checked: { who: 's', cls: 'victim', d: 'power,board,dir,side,from,nf', anim: ['getting_checked', 'hit_*_victim'], src: 'step() hit resolution; fight exchanges' },
  fall: { who: 's', cls: 'fall', d: 'side,kind,power,from,dir,board,wrestle', anim: ['falling'], src: 'step() hit (hard), injury, fight loser, trip penalty reaction' },
  hookv: { who: 's', cls: 'foul', d: 'a,dir,side', anim: ['hit_hookv_victim'], src: 'HITS.pen on a Hooking call (offline sim and client only)' },
  holdv: { who: 's', cls: 'foul', d: 'a,dir,side', anim: ['hit_holdv_victim'], src: 'HITS.pen on a Holding call' },
  slashv: { who: 's', cls: 'foul', d: 'a,dir,side', anim: ['hit_slashv_victim'], src: 'HITS.pen on a Slashing call' },
  interfv: { who: 's', cls: 'foul', d: 'a,dir,side,power', anim: ['hit_interfv_victim'], src: 'HITS.pen on an Interference call' },
  liftv: { who: 's', cls: 'foul', d: 'a,dir,side', anim: ['hit_liftv_victim'], src: 'HITS.onEvent after a poke that strips the carrier' },
  draw: { who: 's', cls: 'misc', d: '', anim: ['faceoff_draw'], src: 'faceoff drop' },
  save: { who: 'g', cls: 'save', d: 'kind,side,dy,h,rc,z', anim: ['goalie_butterfly', 'goalie_glove_save', 'goalie_blocker_save', 'goalie_pad_save', 'goalie_stick_save', 'goalie_stack_pads', 'goalie_split_save', 'goalie_post_slide_vh', 'goalie_butterfly_slide', 'goalie_paddle_down', 'goalie_glove_squeeze', 'goalie_scramble'], src: 'step() save resolution' },
  cover: { who: 'g', cls: 'cover', d: '', anim: ['goalie_cover'], src: 'step() save followed by a freeze; deferred until the save animation is over' },
  goalagainst: { who: 'g', cls: 'react', d: 'v', anim: ['goalie_goal_against', 'goalie_bang_post', 'goalie_tap_pads'], src: 'goal() for the scored-on goalie' },
  poke_g: { who: 'g', cls: 'gpoke', d: 'side,tx,ty', anim: ['goalie_poke_check'], src: 'goalieStep poke check at a close carrier (sent as AE kind poke on the goalie)' },
  pull: { who: 'g', cls: 'bench', d: 'dx,dz,dur', anim: ['goalie_skate_bench'], src: 'step() when the coach pulls the goalie' },
  return: { who: 'g', cls: 'bench', d: 'dx,dz,dur', anim: ['goalie_skate_return'], src: 'step() when the goalie is put back' },
  idle: { who: 'g', cls: 'idle', d: 'v', anim: ['goalie_adjust_mask', 'goalie_water_bottle', 'goalie_stretch', 'goalie_shake_out', 'goalie_tap_pads'], src: 'not emitted by the sim; anim_goalie auto-generates during stoppage (c.gw.stop)', note: 'ambient' },
  celebrate: { who: 's', cls: 'celebrate', d: 'p.celeb>0', anim: ['celebrating'], src: 'goal() / net goal event -> CEL.onGoal sets p.celeb', note: 'state driven (p.celeb), not an AE' },
  dejected: { who: 's', cls: 'celebrate', d: 'p.celeb<0', anim: ['dejected'], src: 'CEL.onGoal (scored-on skaters) / CEL.onEnd (losers)', note: 'state driven' },
  win: { who: 's', cls: 'celebrate', d: 'p.celeb=6.5', anim: ['celebrating'], src: 'finish() / net showEnd -> CEL.onEnd', note: 'state driven' }
};
// the sim sends the goalie poke as AE kind 'poke' on the goalie; anim_goalie treats it as a poke variant
AEV.GOALIE_KINDS = { save: 1, cover: 1, goalagainst: 1, poke: 1, pull: 1, return: 1, idle: 1, pump: 1, peek: 1, play: 1 };

/* ---------- 2. priority and interruption ----------
   Higher number wins. Events of equal class replace each other only after the current one has passed its contact point.
   The sim is authoritative for fall / checked / cancel: they always start. */
AEV.PRIO = { fall: 100, victim: 92, save: 90, contact: 80, foul: 78, release: 75, windup: 70, gpoke: 66, cover: 60, react: 55, recv: 50, bench: 45, misc: 30, celebrate: 20, idle: 10, cancel: 200 };
AEV.RULES = [
  'fall interrupts everything (including check recovery) except a fall already in its first 0.35 s',
  'checked / check interrupt skating, carrying and receiving; a victim animation is not restarted while the fall is running',
  'a shot or pass release (t < contact) cannot be interrupted except by fall, checked or actcancel (the sim cancels with actcancel)',
  'while a fall is running only fall events start (nothing plays on a skater who is on the ice)',
  'while a celebration or dejection runs only fall starts; celebration only starts once the goal is confirmed',
  'goalie save interrupts ready, idle, play, peek, poke and bench; goalagainst never cuts a running save',
  'goalie cover is deferred until the save animation ends (route)',
  'incompatible layers never overlap on one player: fall x event, celebration x event, bench trip x save'
];
const cls = k => (AEV.EVENTS[k] ? AEV.EVENTS[k].cls : 'misc');
AEV.clsOf = (k, who) => (who === 'g' && k === 'poke') ? 'gpoke' : cls(k);
AEV.prio = (k, who) => AEV.PRIO[AEV.clsOf(k, who)] || 0;

/* cur: {k, t, contact, who} the animation running now (or null); incoming event kind. Returns true when the new event may start. */
AEV.canInterrupt = function (cur, k, who) {
  const pn = AEV.prio(k, who);
  if (k === 'fall') return !(cur && cur.k === 'fall' && cur.t < 0.35);
  if (k === 'actcancel') return true;
  if (k === 'checked') return !(cur && (cur.k === 'fall' || cur.k === 'celebrate'));
  if (!cur) return true;
  if (cur.k === 'fall') return false;
  if (cur.k === 'celebrate') return false;
  const pc = AEV.prio(cur.k, who);
  if (cur.k === 'save' && k === 'goalagainst') return false;
  if ((cur.k === 'shot' || cur.k === 'pass') && cur.t < (cur.contact || 0)) return false;
  if (who === 'g' && cur.k === 'save' && k === 'cover') return false;
  if (pn > pc) return true;
  if (pn === pc) return cur.t >= (cur.contact || 0.08);
  return cur.t >= (cur.dur || 0) * 0.9;   // lower priority only after the current one is almost over
};

/* the running animation of a skater (an from anim_ctrl) or goalie (an from anim_goalie), as the cur record above */
AEV.current = function (an, p) {
  if (!an) return null;
  if (p && p.celeb !== undefined && an.cel) return { k: 'celebrate', t: 0, contact: 0, dur: 9 };
  if (an.fall) return { k: 'fall', t: an.fall.t || 0, contact: 0, dur: 1.9 };
  const e = an.ev; if (!e) return null;
  return { k: e.k, t: e.t || 0, contact: e.t0 || 0, dur: e.dur || 0.5 };
};

AEV.stats = { seen: {}, played: {}, rejected: {}, deduped: {}, deferred: {}, reasons: {} };
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
AEV.statsReset = function () { for (const k in AEV.stats) AEV.stats[k] = {}; AEV.log.length = 0; };
AEV.log = [];

/* consumer gate. Returns true when the consumer should start the event, false when it must skip it. */
AEV.admit = function (an, p, k, d, who) {
  who = who || (p && p.gl ? 'g' : 's');
  const cur = AEV.current(an, p), ok = AEV.canInterrupt(cur, k, who);
  inc(AEV.stats.seen, k);
  if (ok) inc(AEV.stats.played, k); else { inc(AEV.stats.rejected, k); inc(AEV.stats.reasons, (cur ? cur.k : '-') + '>' + k); }
  if (AEV.log.length < 400) AEV.log.push({ id: p && p.id, k, ok, cur: cur && cur.k });
  return ok;
};

/* ---------- 3. dedupe and same-tick conflicts ---------- */
AEV.now = 0; AEV.tickN = 0;
AEV.tick = function (dt) { AEV.now += dt || 0; AEV.tickN++; if (AEV.pend.length) AEV.flush(); for (const g of AEV.bench) { g.benchT -= dt || 0; if (g.benchT <= 0) { g.benchT = 0; AEV.bench.delete(g); } } };
const seenKey = new WeakMap();
// same player + same kind within DEDUPE seconds of sim time is the same gameplay event (the sim, a replay feed and the net path may all report it)
AEV.DEDUPE = { default: 0.08, fall: 0.35, checked: 0.3, check: 0.3, save: 0.25, goalagainst: 1.0, cover: 0.5 };
AEV.accept = function (p, k, d) {
  if (!p) return false;
  let m = seenKey.get(p); if (!m) seenKey.set(p, m = {});
  const last = m[k], w = AEV.DEDUPE[k] || AEV.DEDUPE.default;
  if (last !== undefined && AEV.now - last < w && AEV.now >= last) { inc(AEV.stats.deduped, k); return false; }
  m[k] = AEV.now;
  // same tick, same player: the higher priority event keeps the slot (the single p.ae slot would otherwise just take the last one)
  if (p && p.ae && p.ae._tick === AEV.tickN && AEV.prio(p.ae.k, p.gl ? 'g' : 's') > AEV.prio(k, p.gl ? 'g' : 's') && k !== 'cover') { inc(AEV.stats.deduped, k); return false; }
  return true;
};
AEV.reset = function () { AEV.pend.length = 0; AEV.bench.clear(); AEV.goalAt = -1e9; AEV.goals = 0; AEV.now = 0; AEV.tickN = 0; AEV.statsReset(); };

/* ---------- 4. deferred follow-ups ---------- */
AEV.pend = [];
AEV.deliver = function (p, k, d) {
  const g = (typeof G !== 'undefined' && G) ? G : null;
  p.ae = { id: g ? (g.aeid = (g.aeid || 0) + 1) : ((p.ae && p.ae.id | 0) + 1), k, d: d || {} };
  AEV.mark(p);
};
AEV.flush = function () {
  for (let i = AEV.pend.length - 1; i >= 0; i--) { const q = AEV.pend[i]; if (AEV.now >= q.at) { AEV.pend.splice(i, 1); AEV.deliver(q.p, q.k, q.d); if (AEV.onDeliver) AEV.onDeliver(q.p, q.k, q.d); } }
};
// returns 1 = deliver now, 2 = deferred (delivered later by tick), 0 = dropped (duplicate or lower priority in the same tick)
AEV.route = function (p, k, d) {
  if (!AEV.accept(p, k, d)) return 0;
  inc(AEV.stats.seen, 'sim:' + k);
  if (p && p.gl && k === 'cover' && p.ae && p.ae.k === 'save' && AEV.now - (p.ae._at || 0) < 0.9) {
    AEV.pend.push({ p, k, d, at: (p.ae._at || AEV.now) + 0.85 }); inc(AEV.stats.deferred, k); return 2;
  }
  return 1;
};
// called right after the caller set p.ae: stamps it and starts the bench-trip visibility timer
AEV.mark = function (p) {
  if (!p || !p.ae) return; p.ae._tick = AEV.tickN; p.ae._at = AEV.now;
  if (p.gl && (p.ae.k === 'pull' || p.ae.k === 'return')) { p.benchT = (p.ae.d && p.ae.d.dur) || 1.8; AEV.bench.add(p); }
};
AEV.bench = new Set();

/* ---------- 5. celebration only after the goal is confirmed ---------- */
AEV.goalAt = -1e9; AEV.goals = 0;
AEV.noteGoal = function () { AEV.goalAt = AEV.now; AEV.goals++; };
AEV.celebAllowed = function (p) {
  if (typeof G === 'undefined' || !G) return true;            // test harness
  if (G.over || G.rp || G.attract) return true;              // game end, replay of the goal
  return AEV.now - AEV.goalAt < 12;                           // within 12 s of a confirmed goal
};

/* ---------- 6. harness checks ---------- */
AEV.checks = function (AT, chk) {
  const E = AEV.EVENTS, ks = Object.keys(E);
  // every event maps to at least one animation that is registered as a state label produced somewhere
  const labels = new Set(AEV.knownLabels());
  const bad = []; for (const k of ks) { const a = E[k].anim; if (!a.length && k !== 'actcancel') bad.push(k + ':none'); for (const s of a) if (s.indexOf('*') < 0 && !labels.has(s)) bad.push(k + ':' + s); }
  chk('event map: every event maps to a registered animation state (' + ks.length + ' events)', bad.length === 0, bad.join(','));
  chk('event map: every event has a priority class with a number', ks.every(k => AEV.PRIO[E[k].cls] > 0), ks.filter(k => !(AEV.PRIO[E[k].cls] > 0)).join(','));
  // priority table consistent: fall beats everything, cancel beats windup, victim beats contact, save beats react
  chk('priority: fall > victim > save > contact > release > windup > react > recv > celebrate > idle', ['fall', 'victim', 'save', 'contact', 'release', 'windup', 'react', 'recv', 'celebrate', 'idle'].every((c, i, a) => !i || AEV.PRIO[a[i - 1]] > AEV.PRIO[c]), JSON.stringify(AEV.PRIO));
  const cur = (k, t, c) => ({ k, t, contact: c || 0.05, dur: 0.6 });
  chk('interrupt: fall interrupts a check recovery', AEV.canInterrupt(cur('check', 0.4), 'fall', 's') === true, '');
  chk('interrupt: fall is not restarted by fall in its first 0.35 s', AEV.canInterrupt(cur('fall', 0.1), 'fall', 's') === false && AEV.canInterrupt(cur('fall', 0.5), 'fall', 's') === true, '');
  chk('interrupt: nothing but fall starts on a fallen skater', ['shot', 'pass', 'check', 'poke', 'recv', 'gain', 'hitwind'].every(k => AEV.canInterrupt(cur('fall', 0.6), k, 's') === false), '');
  chk('interrupt: shot release before contact cannot be interrupted by a check or a pass', AEV.canInterrupt(cur('shot', 0.02), 'check', 's') === false && AEV.canInterrupt(cur('shot', 0.02), 'pass', 's') === false, '');
  chk('interrupt: shot release is cancelled by fall, checked or actcancel', ['fall', 'checked', 'actcancel'].every(k => AEV.canInterrupt(cur('shot', 0.02), k, 's') === true), '');
  chk('interrupt: check interrupts a running pass animation after its contact', AEV.canInterrupt(cur('pass', 0.2), 'check', 's') === true, '');
  chk('interrupt: celebration blocks everything but fall', ['shot', 'check', 'pass', 'recv', 'checked'].every(k => AEV.canInterrupt({ k: 'celebrate', t: 0 }, k, 's') === false) && AEV.canInterrupt({ k: 'celebrate', t: 0 }, 'fall', 's') === true, '');
  chk('interrupt: goalie save interrupts ready, idle and poke', AEV.canInterrupt(null, 'save', 'g') && AEV.canInterrupt(cur('idle', 0.1), 'save', 'g') && AEV.canInterrupt(cur('poke', 0.1, 0.02), 'save', 'g'), '');
  chk('interrupt: goalagainst and cover never cut a running save', AEV.canInterrupt(cur('save', 0.2), 'goalagainst', 'g') === false && AEV.canInterrupt(cur('save', 0.2), 'cover', 'g') === false, '');
  // dedupe
  AEV.reset(); const P = { id: 77, team: { abbr: 'T' } };
  const a1 = AEV.accept(P, 'check', {}); AEV.tick(0.01); const a2 = AEV.accept(P, 'check', {}); AEV.tick(0.5); const a3 = AEV.accept(P, 'check', {});
  chk('dedupe: same event twice within the window starts once, a later one starts again', a1 && !a2 && a3, [a1, a2, a3].join());
  AEV.reset(); const Q = { id: 78, team: { abbr: 'T' } }, R2 = { id: 79, team: { abbr: 'T' } };
  chk('dedupe: different players with the same kind are independent', AEV.accept(Q, 'fall', {}) && AEV.accept(R2, 'fall', {}), '');
  // deferred cover after save
  AEV.reset(); const g = { id: 5, gl: true, team: { abbr: 'T' }, ae: null }; AEV.tickN = 1; AEV.deliver(g, 'save', {});
  const now1 = AEV.route(g, 'cover', {}); AEV.tick(0.5); const mid = g.ae.k; AEV.tick(0.5);
  chk('route: cover right after a save is deferred, then delivered after the save', now1 === 2 && mid === 'save' && g.ae.k === 'cover', now1 + ' ' + mid + ' ' + g.ae.k);
  // same-tick conflict: a lower priority event does not overwrite a higher one in the single slot
  AEV.reset(); const h = { id: 9, team: { abbr: 'T' } }; AEV.tickN = 5; AEV.deliver(h, 'checked', {});
  chk('same tick: poke does not overwrite checked in the p.ae slot', AEV.accept(h, 'poke', {}) === false, '');
  // admit logs
  AEV.reset();
  // no overlap: replay a stream of random events through admit on a model of the layers
  { let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296, ev = ['shot', 'pass', 'check', 'checked', 'fall', 'poke', 'recv', 'gain', 'hitwind', 'actcancel'];
    let cur2 = null, over = 0, t = 0;
    for (let i = 0; i < 4000; i++) {
      t += 0.02; if (cur2) { cur2.t += 0.02; if (cur2.t > cur2.dur) cur2 = null; }
      if (rnd() < 0.12) { const k = ev[(rnd() * ev.length) | 0]; if (AEV.canInterrupt(cur2, k, 's')) { if (cur2 && cur2.k === 'fall' && k !== 'fall' && k !== 'actcancel' && cur2.t < 1.9) over++; if (k !== 'actcancel') cur2 = { k, t: 0, contact: 0.05, dur: k === 'fall' ? 1.9 : 0.6 }; } }
    }
    chk('no overlap: 4000-step random event stream never starts an animation on a fallen skater', over === 0, over + ' overlaps'); }
  // celebration gate
  chk('celebration gate: allowed in the harness (no game) and reports a reason when a game is running', AEV.celebAllowed({}) === true, '');
};
AEV.knownLabels = function () {
  const L = ['skating', 'accelerating', 'sprint_skating', 'gliding', 'backward_skating', 'turning_left', 'turning_right', 'crossover_turn', 'stopping', 'pivoting', 'side_shuffle', 'bracing', 'ready', 'stickhandling', 'protecting_puck',
    'receiving_pass', 'passing', 'preparing_shot', 'one_timer_ready', 'one_timer_miss', 'poke_check', 'stick_lift', 'body_check', 'hit_windup', 'hit_miss', 'getting_checked', 'falling', 'faceoff_draw', 'faceoff_stance', 'celebrating', 'dejected',
    'shot_wrist', 'shot_snap', 'shot_slap', 'shot_onetimer', 'shot_backhand', 'shot_quick', 'shot_volley', 'pass_saucer', 'pass_drop', 'pass_slap', 'pass_onehand', 'pass_bank', 'pass_backhand',
    'recv_glove', 'recv_tip', 'recv_cradle', 'recv_kick', 'recv_reach', 'recv_backhand', 'poke_dive', 'hit_hookv_victim', 'hit_holdv_victim', 'hit_slashv_victim', 'hit_interfv_victim', 'hit_liftv_victim'];
  if (window.GOAL && GOAL.VD) for (const k in GOAL.VD) L.push(GOAL.VD[k].st);
  L.push('goalie_ready', 'goalie_shuffle', 'goalie_t_push', 'goalie_butterfly', 'goalie_glove_save', 'goalie_blocker_save', 'goalie_pad_save', 'goalie_stick_save', 'goalie_goal_against', 'goalie_cover');
  return L;
};

/* ---------- 7. animation variant registry (for the gallery and the inventory) ----------
   n name, g group, e triggering event ('' = state driven), s state label in the live game, h harness scenario (AT.sc / GS key / pair scenario), p pair scenario (two skaters) */
AEV.VARIANTS = [
  // movement
  ['forward_skate', 'movement', '', 'skating', 'skate'], ['backward_skate', 'movement', '', 'backward_skating', 'backskate'], ['crossover', 'movement', '', 'crossover_turn', 'crossover'], ['tight_turn', 'movement', '', 'pivoting', 'pivot'],
  ['hockey_stop', 'movement', '', 'stopping', 'stop'], ['accelerate', 'movement', '', 'accelerating', 'accelerate'], ['glide', 'movement', '', 'gliding', 'glide'], ['turn_left', 'movement', '', 'turning_left', 'turn_left'],
  ['side_shuffle', 'movement', '', 'side_shuffle', 'shuffle'], ['bracing', 'movement', '', 'bracing', 'brace'], ['losing_balance', 'movement', 'fall', 'falling', 'fall_stumble'],
  // puck control
  ['receive', 'puck', 'recv', 'receiving_pass', 'receive'], ['saucer_backhand_reception', 'puck', 'gain', 'recv_backhand', 'rc_backhand'], ['settle_cradle', 'puck', 'gain', 'recv_cradle', 'rc_cradle'], ['stickhandle', 'puck', '', 'stickhandling', 'carry'],
  ['protect_puck', 'puck', '', 'protecting_puck', 'protect'], ['lose_puck', 'puck', 'poke', 'poke_check', 'poke'], ['loose_pickup', 'puck', 'gain', 'recv_reach', 'rc_reach'], ['board_battle', 'puck', '', 'stick_battle', 'stick_battle'],
  ['rebound_tip', 'puck', 'gain', 'recv_tip', 'rc_tip'], ['poke', 'puck', 'poke', 'poke_check', 'poke'], ['stick_lift', 'puck', 'poke', 'stick_lift', 'lift'], ['diving_recovery', 'puck', 'poke', 'poke_dive', 'pk_dive'], ['glove_reception', 'puck', 'gain', 'recv_glove', 'rc_glove'], ['skate_kick_reception', 'puck', 'gain', 'recv_kick', 'rc_kick'],
  ['deke_forehand_backhand', 'puck', '', 'deke_forehand_backhand', 'dk_fb'], ['deke_toe_drag', 'puck', '', 'deke_toe_drag', 'dk_toe'], ['deke_between_legs', 'puck', '', 'deke_between_legs', 'dk_btl'], ['deke_spin', 'puck', '', 'deke_spin', 'dk_spin'],
  // shooting
  ['wrist_shot', 'shooting', 'shot', 'shot_wrist', 'wrist'], ['snap_shot', 'shooting', 'shot', 'shot_snap', 'snap'], ['slap_shot', 'shooting', 'shot', 'shot_slap', 'slap'], ['backhand_shot', 'shooting', 'shot', 'shot_backhand', 'sh_backhand'],
  ['one_timer', 'shooting', 'shot', 'shot_onetimer', 'onetimer'], ['quick_shot', 'shooting', 'shot', 'shot_quick', 'sh_quick'], ['windup_wrist', 'shooting', 'shotwind', 'preparing_shot', 'wrist_act'], ['windup_slap', 'shooting', 'shotwind', 'preparing_shot', 'slap_act'],
  ['volley_shot', 'shooting', 'shot', 'shot_volley', 'sh_volley'], ['one_timer_ready', 'shooting', 'otwind', 'one_timer_ready', 'otwind'], ['one_timer_miss', 'shooting', 'otmiss', 'one_timer_miss', 'otmiss'],
  // passing
  ['pass_standard', 'passing', 'pass', 'passing', 'pass'], ['pass_backhand', 'passing', 'pass', 'pass_backhand', 'ps_backhand'], ['pass_saucer', 'passing', 'pass', 'pass_saucer', 'ps_saucer'], ['pass_board', 'passing', 'pass', 'pass_bank', 'ps_bank'], ['pass_drop', 'passing', 'pass', 'pass_drop', 'ps_drop'],
  ['pass_slap', 'passing', 'pass', 'pass_slap', 'ps_slap'], ['pass_onehand', 'passing', 'pass', 'pass_onehand', 'ps_onehand'], ['pass_windup', 'passing', 'passwind', 'passing', 'pass_act'],
  // physical
  ['body_check', 'physical', 'check', 'body_check', 'check', 1], ['open_ice_hit', 'physical', 'check', 'hit_openice_side', 'openice_side', 1], ['board_hit', 'physical', 'check', 'hit_board', 'board', 1], ['missed_check', 'physical', 'hitmiss', 'hit_miss', 'hitmiss'],
  ['checked_victim', 'physical', 'checked', 'getting_checked', 'checked'], ['hit_windup', 'physical', 'hitwind', 'hit_windup', 'hit'], ['hook', 'physical', 'hookv', 'hit_hookv_victim', 'hookv', 1], ['holding', 'physical', 'holdv', 'hit_holdv_victim', 'holdv', 1],
  ['slash', 'physical', 'slashv', 'hit_slashv_victim', 'slashv', 1], ['stick_lift_foul', 'physical', 'liftv', 'hit_liftv_victim', 'liftv', 1], ['interference', 'physical', 'interfv', 'hit_interfv_victim', 'interfv', 1], ['trip', 'physical', 'fall', 'falling', 'trip', 1],
  ['fall_forward', 'physical', 'fall', 'falling', 'fall_fwd'], ['fall_back', 'physical', 'fall', 'falling', 'fall_back'], ['fall_board', 'physical', 'fall', 'falling', 'fall_board'], ['fall_knees', 'physical', 'fall', 'falling', 'fall_knees'], ['get_up', 'physical', 'fall', 'falling', 'fall'],
  ['fight', 'physical', 'check', 'fight_punch', 'fight', 1], ['penalty_reaction_hip', 'physical', 'check', 'hit_hip', 'hip', 1],
  // goalie
  ['g_ready', 'goalie', '', 'goalie_ready', 'g_ready'], ['g_butterfly', 'goalie', 'save', 'goalie_butterfly', 'g_butterfly'], ['g_slide', 'goalie', 'save', 'goalie_butterfly_slide', 'v_bslide'], ['g_glove', 'goalie', 'save', 'goalie_glove_save', 'g_glove'], ['g_blocker', 'goalie', 'save', 'goalie_blocker_save', 'g_blocker'],
  ['g_pad', 'goalie', 'save', 'goalie_pad_save', 'g_pad'], ['g_stack', 'goalie', 'save', 'goalie_stack_pads', 'v_stack'], ['g_split', 'goalie', 'save', 'goalie_split_save', 'v_split'], ['g_post_hug_rvh', 'goalie', '', 'goalie_ready', 'g_rvh'], ['g_vh', 'goalie', 'save', 'goalie_post_slide_vh', 'v_vh'],
  ['g_poke', 'goalie', 'poke', 'goalie_poke_check', 'v_poke'], ['g_cover', 'goalie', 'cover', 'goalie_cover', 'v_cover'], ['g_rebound_control', 'goalie', 'save', 'goalie_pad_save', 'g_rebound'], ['g_play_puck', 'goalie', 'play', 'goalie_play_puck', 'v_play'],
  ['g_recovery', 'goalie', 'save', 'goalie_ready', 'g_stick'], ['g_goal_against', 'goalie', 'goalagainst', 'goalie_goal_against', 'g_goal'], ['g_bang_post', 'goalie', 'goalagainst', 'goalie_bang_post', 'v_bang'], ['g_squeeze', 'goalie', 'save', 'goalie_glove_squeeze', 'v_squeeze'],
  ['g_paddle', 'goalie', 'save', 'goalie_paddle_down', 'v_paddle'], ['g_scramble', 'goalie', 'save', 'goalie_scramble', 'v_scramble'], ['g_pump', 'goalie', 'pump', 'goalie_glove_pump', 'v_pump'], ['g_peek', 'goalie', 'peek', 'goalie_peek', 'v_peek'],
  ['g_bench_pull', 'goalie', 'pull', 'goalie_skate_bench', 'v_pull'], ['g_bench_return', 'goalie', 'return', 'goalie_skate_return', 'v_return_'], ['g_idle_adjust', 'goalie', 'idle', 'goalie_adjust_mask', 'v_adjust'], ['g_idle_sip', 'goalie', 'idle', 'goalie_water_bottle', 'v_sip'],
  ['g_idle_stretch', 'goalie', 'idle', 'goalie_stretch', 'v_stretch'], ['g_idle_shake', 'goalie', 'idle', 'goalie_shake_out', 'v_shake'], ['g_idle_tap', 'goalie', 'idle', 'goalie_tap_pads', 'v_tap'],
  // celebrations
  ['cel_scorer_pump', 'celebration', 'celebrate', 'celebrating', 'cel_pump'], ['cel_scorer_stickraise', 'celebration', 'celebrate', 'celebrating', 'cel_stickraise'], ['cel_scorer_guitar', 'celebration', 'celebrate', 'celebrating', 'cel_guitar'], ['cel_scorer_point', 'celebration', 'celebrate', 'celebrating', 'cel_point'],
  ['cel_scorer_helmet', 'celebration', 'celebrate', 'celebrating', 'cel_helmet'], ['cel_scorer_glass', 'celebration', 'celebrate', 'celebrating', 'cel_glass'], ['cel_scorer_kneeslide', 'celebration', 'celebrate', 'celebrating', 'cel_kneeslide'], ['cel_scorer_jumpglide', 'celebration', 'celebrate', 'celebrating', 'cel_jumpglide'],
  ['cel_scorer_lap', 'celebration', 'celebrate', 'celebrating', 'cel_lap'], ['cel_scorer_huddle', 'celebration', 'celebrate', 'celebrating', 'cel_huddle'], ['cel_mate_cheer', 'celebration', 'celebrate', 'celebrating', 'cel_mateCheer'], ['cel_mate_helmet', 'celebration', 'celebrate', 'celebrating', 'cel_mateHelmet'],
  ['cel_mate_sticktap', 'celebration', 'celebrate', 'celebrating', 'cel_stickTap'], ['cel_mate_fistbump', 'celebration', 'celebrate', 'celebrating', 'cel_fistbump'], ['cel_mate_shoulder', 'celebration', 'celebrate', 'celebrating', 'cel_shoulder'], ['cel_mate_hug', 'celebration', 'celebrate', 'celebrating', 'cel_hug'],
  ['cel_scoredon_helmet', 'celebration', 'dejected', 'dejected', 'cel_sadHelmet'], ['cel_scoredon_knees', 'celebration', 'dejected', 'dejected', 'cel_sadKnees'], ['cel_scoredon_stick', 'celebration', 'dejected', 'dejected', 'cel_sadStick'], ['cel_win', 'celebration', 'win', 'celebrating', 'cel_win']
].map(a => ({ n: a[0], g: a[1], e: a[2], s: a[3], h: a[4], pair: !!a[5] }));

window.AEV = AEV;
if (typeof module !== 'undefined') module.exports = AEV;
})();
