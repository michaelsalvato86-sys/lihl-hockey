/* Original synthesized game audio (WebAudio). No sample files, nothing licensed. Optional, with volume. */
const AU = {
  ctx: null, vol: 0.7, on: true, say: true, last: {}, skv: (function () { try { const v = localStorage.getItem('lihl_skv'); return v === null ? 0.35 : +v; } catch (e) { return 0.35; } })(), setSkate(v) { this.skv = v; try { localStorage.setItem('lihl_skv', v); } catch (e) { } },
  init() {
    if (this.ctx) { this.ctx.resume && this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C(); this.master = c.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(c.destination);
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    const loop = (freq, q, type, gain, f2) => {
      const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = Math.random(); const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = gain; s.connect(f); let last = f;
      if (f2) { const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = f2; f.connect(l); last = l; }
      last.connect(g); g.connect(this.master); s.start(); return { g, f };
    };
    const cb = loop(520, 0.35, 'bandpass', 0.05); this.cg = cb.g;           // crowd bed
    const cr = loop(1100, 0.5, 'bandpass', 0.0); this.rg = cr.g; this.rf = cr.f; // crowd roar (swells)
    const sk = loop(4200, 0.9, 'bandpass', 0, 7500); this.sg = sk.g; this.sf = sk.f; // skate hiss, band limited
  },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = this.on ? v : 0; },
  toggle() { this.on = !this.on; this.setVol(this.vol); return this.on; },
  _ok(name, gap) { const t = performance.now(); if (this.last[name] && t - this.last[name] < gap) return false; this.last[name] = t; return !!this.ctx && this.on; },
  tone(f0, dur, type, vol, f1, delay) {
    const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  burst(dur, vol, freq, q, type, delay) {
    const c = this.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  /* crowd(level): goal-size roar. swell(level): smaller rise for shots and saves. Both cheap (ramp existing loops). */
  crowd(level) {
    if (!this.cg) return; const t = this.ctx.currentTime, g = this.cg.gain, r = this.rg.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.05 + 0.3 * level, t + 0.25); g.linearRampToValueAtTime(0.05, t + 3.5);
    r.cancelScheduledValues(t); r.setValueAtTime(r.value, t); r.linearRampToValueAtTime(0.18 * level, t + 0.4); r.linearRampToValueAtTime(0.0, t + 4.2);
    this.rf.frequency.cancelScheduledValues(t); this.rf.frequency.setValueAtTime(this.rf.frequency.value, t); this.rf.frequency.linearRampToValueAtTime(1500, t + 0.5); this.rf.frequency.linearRampToValueAtTime(900, t + 4);
  },
  swell(level) {
    if (!this.cg || !this.on) return; level = Math.max(0, Math.min(1, level || 0.4)); const t = this.ctx.currentTime, r = this.rg.gain, now = Math.max(0, r.value);
    if (now > 0.12 * level + 0.02) return; // already swelling
    r.cancelScheduledValues(t); r.setValueAtTime(now, t); r.linearRampToValueAtTime(0.1 * level, t + 0.35); r.linearRampToValueAtTime(0.0, t + 1.8);
  },
  /* v 0..1 skater speed: more speed = louder and brighter hiss */
  skate(v) {
    if (!this.sg || !this.on) return; v = Math.max(0, Math.min(1, v || 0)); const t = this.ctx.currentTime;
    this.sg.gain.setTargetAtTime(v < 0.06 ? 0 : (0.012 + v * v * 0.05) * this.skv, t, 0.12);
    this.sf.frequency.setTargetAtTime(3000 + v * 3000, t, 0.15);
  },
  _note(f, t0, dur, type, vol) {
    const c = this.ctx, t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  sfx(n) {
    if (!this._ok(n, { puck: 70, stick: 80, pass: 90, shot: 120, hit: 150, board: 150, save: 200, post: 250, horn: 2500, whistle: 300 }[n] || 200)) return;
    switch (n) {
      case 'whistle': { // pea whistle: carrier with fast flutter
        const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(2950, t); o.frequency.linearRampToValueAtTime(2850, t + 0.5); l.frequency.value = 42; lg.gain.value = 90; l.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.02); g.gain.setValueAtTime(0.14, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(g); g.connect(this.master); o.start(t); l.start(t); o.stop(t + 0.6); l.stop(t + 0.6); this.burst(0.5, 0.05, 3400, 1.5, 'bandpass'); break;
      }
      case 'horn': // goal horn: two long detuned blasts, then a short original organ-style riff
        this.tone(155, 1.1, 'sawtooth', 0.11, 153); this.tone(157, 1.1, 'sawtooth', 0.09, 155); this.tone(310, 1.1, 'square', 0.04, 306);
        this.tone(155, 0.9, 'sawtooth', 0.11, 150, 1.25); this.tone(157, 0.9, 'sawtooth', 0.09, 152, 1.25); this.tone(310, 0.9, 'square', 0.04, 300, 1.25);
        { const r = [[392, 0], [392, .22], [523, .44], [392, .66], [494, .88], [587, 1.1], [523, 1.4]]; // stadium sting after the horn
          for (const [f, d] of r) { this._note(f, 2.4 + d, 0.2, 'square', 0.05); this._note(f / 2, 2.4 + d, 0.2, 'sawtooth', 0.04); }
          for (let i = 0; i < 4; i++) this.burst(0.05, 0.12, 2200, 1, 'bandpass', 2.4 + i * .44); } // claps
        this.swell(1); break;
      case 'buzzer': this.tone(118, 1.3, 'sawtooth', 0.13, 116); this.tone(121, 1.3, 'square', 0.08, 119); break;
      case 'shot': this.burst(0.14, 0.5, 1600, 0.8, 'bandpass'); this.tone(150, 0.12, 'sine', 0.35, 70); this.burst(0.05, 0.25, 900, 1.5, 'highpass'); this.swell(0.5); break;
      case 'pass': this.burst(0.06, 0.28, 2600, 1.2, 'bandpass'); this.tone(900, 0.04, 'triangle', 0.1, 600); break;
      case 'puck': this.burst(0.05, 0.3, 1300, 1.5, 'bandpass'); this.tone(110, 0.06, 'sine', 0.22, 70); break;
      case 'stick': this.tone(210, 0.05, 'triangle', 0.22, 120); this.burst(0.03, 0.22, 2400, 2, 'bandpass'); break; // wood tap
      case 'hit': this.burst(0.22, 0.6, 420, 0.7, 'lowpass'); this.tone(80, 0.2, 'sine', 0.5, 45); this.burst(0.07, 0.2, 1800, 1, 'bandpass'); break;
      case 'board': this.burst(0.3, 0.55, 300, 0.6, 'lowpass'); this.tone(62, 0.28, 'sine', 0.55, 38); this.burst(0.14, 0.14, 1400, 3, 'bandpass', 0.05); this.tone(180, 0.1, 'triangle', 0.1, 110, 0.03); break; // thump plus plexi rattle
      case 'save': this.burst(0.1, 0.4, 2000, 1, 'bandpass'); this.tone(320, 0.14, 'triangle', 0.18, 180); this.burst(0.18, 0.2, 500, 0.8, 'lowpass', 0.02); this.swell(0.7); break;
      case 'post': // steel ping: inharmonic partials with a short click
        this.burst(0.02, 0.35, 4200, 1.5, 'highpass'); this.tone(1180, 0.7, 'sine', 0.2, 1170); this.tone(1900, 0.5, 'sine', 0.13, 1890); this.tone(2790, 0.3, 'sine', 0.07, 2780); this.tone(520, 0.2, 'triangle', 0.12, 480); this.swell(0.8); break;
    }
  },
  speak(txt) { if (!this.on || !this.say || !window.speechSynthesis) return; try { const u = new SpeechSynthesisUtterance(txt); u.rate = 1.02; u.pitch = 0.75; u.volume = Math.min(1, this.vol); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } }
};
