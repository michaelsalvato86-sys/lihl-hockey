'use strict';
/* Runs the REAL game simulation (the inline script of the shipped index.html) headless inside a Node vm context.
   One context per room. The browser never decides goals, possession, penalties or the clock: only the server does. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, 'game_index.html'), 'utf8');
const m0 = /<script>\s*const ROSTER=/.exec(HTML);
if (!m0) throw new Error('game_index.html: simulation script not found (rebuild with build.py)');
const SIM_SRC = HTML.slice(m0.index + '<script>'.length, HTML.indexOf('</script>', m0.index));

// ---- DOM stubs: the simulation only touches the DOM for presentation, so every element is a permissive no-op ----
function makeStub() {
  const store = {};
  const U = new Proxy(function () { }, {
    get(t, k) { if (k === 'value') return store.value === undefined ? '' : store.value; if (k === Symbol.toPrimitive) return () => 0; if (k === 'length') return 0; if (k === 'then') return undefined; return U; },
    set(t, k, v) { if (k === 'value') store.value = v; return true; },
    apply() { return U; }, construct() { return U; }
  });
  return U;
}
function makeSandbox(events) {
  const els = {};
  const stub = makeStub();
  const doc = { getElementById: id => els[id] || (els[id] = makeStub()), createElement: () => makeStub(), addEventListener() { }, body: makeStub(), documentElement: makeStub(), querySelectorAll: () => [], scripts: [] };
  const sb = {
    document: doc, navigator: { userAgent: 'node', maxTouchPoints: 0 }, screen: { width: 1920, height: 1080 }, innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
    location: { search: '' }, performance: { now: () => Date.now() }, requestAnimationFrame() { }, addEventListener() { }, removeEventListener() { },
    Image: function () { }, console, setTimeout, clearTimeout, URLSearchParams, Math, JSON, Date, Number, String, Array, Object, Map, Set, Float32Array,
    AU: { sfx: n => events.push({ e: 'sfx', n }), crowd() { }, speak() { }, skate() { }, init() { } }, localStorage: { getItem: () => null, setItem() { } }
  };
  sb.window = sb;
  return sb;
}

// ---- server-side API injected after the simulation is loaded ----
const HOOKS = `
var EVQ = [];
AU = { sfx: function(n){ EVQ.push({e:'sfx', n:n}); }, crowd: function(){}, speak: function(){}, skate: function(){}, init: function(){} };
function pidOf(p){ if(!p) return -1; const ti = p.team===H1?0:1; const i = p.team.roster.indexOf(p); return ti*100 + (i<0?99:i); }
showBanner = function(im,a,b,secs,col){ EVQ.push({e:'bn', im: im||'', a: String(a||''), b: String(b||''), secs: secs||2, col: col||''}); };
AEHOOK = function(p,k,d){ EVQ.push({e:'ae', p: pidOf(p), k: k, d: d}); };
var _goal = goal;
goal = function(t,s){ _goal(t,s); EVQ.push({e:'goal', tm: t===H1?0:1, p: pidOf(s)}); };
function netStart(c){ $('mh').value=c.home; $('ma').value=c.away; $('mc').value='n'; $('ml').value=c.plen; newGame(false); G.humans=[]; G.net=1; G.tick=0; return true; }
function netHuman(side){ if(G.humans.find(h=>h.side===side)) return; const h = mkRemote(side===0?H1:A1); h.side=side; G.humans.push(h); }
function netDrop(side){ G.humans = G.humans.filter(h=>h.side!==side); }
function netInput(side,m){ const h=G.humans.find(x=>x.side===side); if(!h) return; const c=v=>Math.max(-1,Math.min(1,+v||0)); h.inp.x=c(m.x); h.inp.y=c(m.y);
  if(m.sh){ h.ev.sh=1; h.ev.pw=Math.max(.2,Math.min(1,+m.pw||.5)); } if(m.ps) h.ev.ps=1; if(m.hit) h.ev.hit=1; if(m.sw) h.ev.sw=1; h.inp.vs=m.vs?1:0; }
function r1(v){ return Math.round(v*10)/10; } function r2(v){ return Math.round(v*100)/100; }
function teamSnap(t){
  const seats = SL.map(s => t.seats[s] ? pidOf(t.seats[s]) : -1);
  const pl = []; for (const s of SL){ const p=t.seats[s]; if(p) pl.push([pidOf(p), r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), r2(p.fa), r1(p.turn||0), r2(p.acc01||0), p.back?1:0, r2(p.st===undefined?1:p.st)]); }
  const g = t.goalie;
  return { s: seats, pl: pl, g: [r1(g.x), r1(g.y)], pu: t.pull?1:0, pen: t.pen.map(e=>[pidOf(e.p), r1(e.t)]), lb: t.label };
}
function netSnap(){
  const hc = G.humans.map(h=>({side:h.side, p: pidOf(h.ctl)}));
  return { k:G.tick, c:r2(G.clock), pd:G.period, ot:G.ot?1:0, sc:G.score.slice(), sh:G.shots.slice(), pa: G.pause>0?r1(G.pause):0, fo: (G.fo&&G.fo.set&&!G.fo.dropped)?1:0, ov:G.over?1:0,
    pk:[r1(puck.x), r1(puck.y), r1(puck.vx), r1(puck.vy), pidOf(puck.owner)], t:[teamSnap(H1), teamSnap(A1)], nt: noteT>0?noteTxt:'', hc: hc };
}
function netTick(){ G.tick++; step(1/30); const o = JSON.stringify({ s: netSnap(), ev: EVQ }); EVQ.length = 0; return o; }
function netSummary(){ return JSON.stringify({ n: TEAMS.length, teams: TEAMS.map(t=>({abbr:t.abbr,name:t.name,color:t.color,n:t.players.length})) }); }
`;

function createSim() {
  const events = [];
  const ctx = vm.createContext(makeSandbox(events));
  vm.runInContext(SIM_SRC, ctx, { filename: 'sim.js' });
  vm.runInContext(HOOKS, ctx, { filename: 'hooks.js' });
  return {
    ctx,
    summary: () => JSON.parse(vm.runInContext('netSummary()', ctx)),
    start: c => vm.runInContext(`netStart(${JSON.stringify(c)})`, ctx),
    human: s => vm.runInContext(`netHuman(${s})`, ctx),
    drop: s => vm.runInContext(`netDrop(${s})`, ctx),
    input: (s, m) => { ctx.__m = m; vm.runInContext(`netInput(${s}, __m)`, ctx); },
    tick: () => vm.runInContext('netTick()', ctx),
    over: () => vm.runInContext('!!G.over', ctx),
    stats: () => JSON.parse(vm.runInContext('JSON.stringify({h:G.hits,p:G.pims,f:G.fow,a:G.passes,o:G.poss.map(Math.round),g:G.goals,s:G.pst,sv:G.saves,sh:G.shots})', ctx)),
    score: () => JSON.parse(vm.runInContext('JSON.stringify({sc:G.score,sh:G.shots,pd:G.period,ot:!!G.ot})', ctx))
  };
}
module.exports = { createSim };
