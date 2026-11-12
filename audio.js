/* Original synthesized game audio (WebAudio). No sample files, nothing licensed. Optional, with volume. */
const AU = {
  ctx: null, vol: 0.7, on: true, say: true, last: {},
  init() {
    if (this.ctx) { this.ctx.resume && this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C(); this.master = c.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(c.destination);
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    const loop = (freq, q, type, gain) => { const s = c.createBufferSource(); s.buffer = b; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = gain; s.connect(f); f.connect(g); g.connect(this.master); s.start(); return g; };
    this.cg = loop(520, 0.35, 'bandpass', 0.05);   // crowd bed
    this.sg = loop(3200, 0.7, 'highpass', 0);      // skate hiss
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
  crowd(level) { if (!this.cg) return; const t = this.ctx.currentTime, g = this.cg.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.05 + 0.3 * level, t + 0.25); g.linearRampToValueAtTime(0.05, t + 3.5); },
  skate(v) { if (!this.sg || !this.on) return; const t = this.ctx.currentTime; this.sg.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.05, t, 0.08); },
  sfx(n) {
    if (!this._ok(n, { puck: 70, pass: 90, shot: 120, hit: 150, save: 200 }[n] || 200)) return;
    switch (n) {
      case 'whistle': this.tone(2900, 0.5, 'square', 0.09, 2850); this.tone(3100, 0.5, 'square', 0.06, 3000); break;
      case 'horn': this.tone(165, 1.6, 'sawtooth', 0.12, 160); this.tone(167, 1.6, 'sawtooth', 0.1, 163); this.tone(330, 1.6, 'square', 0.04, 322); break;
      case 'buzzer': this.tone(118, 1.3, 'sawtooth', 0.13, 116); this.tone(121, 1.3, 'square', 0.08, 119); break;
      case 'shot': this.burst(0.14, 0.5, 1600, 0.8, 'bandpass'); this.tone(150, 0.12, 'sine', 0.35, 70); break;
      case 'pass': this.burst(0.06, 0.28, 2600, 1.2, 'bandpass'); this.tone(900, 0.04, 'triangle', 0.1, 600); break;
      case 'puck': this.burst(0.05, 0.3, 1300, 1.5, 'bandpass'); this.tone(110, 0.06, 'sine', 0.22, 70); break;
      case 'hit': this.burst(0.22, 0.6, 420, 0.7, 'lowpass'); this.tone(80, 0.2, 'sine', 0.5, 45); break;
      case 'save': this.burst(0.1, 0.4, 2000, 1, 'bandpass'); this.tone(320, 0.14, 'triangle', 0.18, 180); break;
      case 'post': this.tone(1100, 0.35, 'triangle', 0.25, 900); this.burst(0.08, 0.3, 3000, 2, 'bandpass'); break;
    }
  },
  speak(txt) { if (!this.on || !this.say || !window.speechSynthesis) return; try { const u = new SpeechSynthesisUtterance(txt); u.rate = 1.02; u.pitch = 0.75; u.volume = Math.min(1, this.vol); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } }
};
