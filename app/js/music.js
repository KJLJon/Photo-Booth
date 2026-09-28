/* Photo Booth music — little tunes synthesized with Web Audio (no audio files, works offline), mixed
   into recorded videos. "Happy Birthday" is in the public domain; the others are original loops. */
(function () {
  'use strict';

  const TUNES = [
    { id: 'none', label: '🔇 No music' },
    { id: 'birthday', label: '🎂 Happy Birthday' },
    { id: 'party', label: '🎉 Party' },
    { id: 'chill', label: '😎 Chill' },
    { id: 'drums', label: '🥁 Drumroll' }
  ];

  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);          // MIDI note → frequency
  const N = { C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81 };

  function tone(ac, out, t, midi, dur, type, vol, attack) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle'; o.frequency.value = hz(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(ac, out, t, dur, vol, freq, q, type) {
    if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'highpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.05);
  }
  function kick(ac, out, t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
  }
  const hat = (ac, out, t, vol) => noise(ac, out, t, 0.05, vol, 7000);
  const snare = (ac, out, t, vol) => { noise(ac, out, t, 0.18, vol, 1800, 0.8, 'bandpass'); tone(ac, out, t, 50, 0.1, 'triangle', vol * 0.6); };

  // Each tune schedules one loop starting at `t` and returns the loop's length in seconds.
  const LOOPS = {
    birthday(ac, out, t) {
      const b = 0.42;                                          // one beat (3/4 time)
      const mel = [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
        ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
        ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
        ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3]];
      let x = t;
      mel.forEach(([n, d]) => { tone(ac, out, x, N[n], d * b * 0.95, 'triangle', 0.22); tone(ac, out, x, N[n] + 12, d * b * 0.6, 'sine', 0.05); x += d * b; });
      // "oom-pah-pah" underneath
      const chords = [['C3', 'E4', 'G4'], ['C3', 'E4', 'G4'], ['G3', 'D4', 'F4'], ['G3', 'D4', 'F4'], ['G3', 'D4', 'F4'], ['C3', 'E4', 'G4'],
        ['C3', 'E4', 'G4'], ['F3', 'A4', 'C5'], ['C3', 'E4', 'G4'], ['G3', 'D4', 'F4'], ['C3', 'E4', 'G4'], ['C3', 'E4', 'G4']];
      let y = t + b;                                           // pickup note first
      chords.forEach(c => {
        tone(ac, out, y, N[c[0]], b * .9, 'sine', 0.16);
        for (const k of [1, 2]) { tone(ac, out, y + k * b, N[c[1]], b * .5, 'triangle', 0.05); tone(ac, out, y + k * b, N[c[2]], b * .5, 'triangle', 0.05); }
        y += 3 * b;
      });
      return x - t + b;
    },
    party(ac, out, t) {
      const b = 0.25;                                          // 120 bpm, 8th notes = b
      const prog = [[N.C3, [N.C4, N.E4, N.G4]], [N.G3, [N.B3, N.D4, N.G4]], [N.A3, [N.C4, N.E4, N.A4]], [N.F3, [N.C4, N.F4, N.A4]]];
      prog.forEach(([bass, ch], bar) => {
        const t0 = t + bar * 8 * b;
        for (let i = 0; i < 8; i++) {
          const ti = t0 + i * b;
          if (i % 2 === 0) kick(ac, out, ti, 0.5); else hat(ac, out, ti, 0.08);
          if (i === 2 || i === 6) snare(ac, out, ti, 0.18);
          tone(ac, out, ti, bass + (i % 2 ? 12 : 0), b * 0.9, 'square', 0.05);
          tone(ac, out, ti, ch[i % 3] + 12, b * 0.8, 'triangle', 0.08);
        }
      });
      return 32 * b;
    },
    chill(ac, out, t) {
      const b = 0.75;
      const prog = [[N.C3, [N.E4, N.G4, N.B4, N.D5]], [N.A3 - 12, [N.C4, N.E4, N.G4, N.B4]], [N.F3, [N.A4, N.C5, N.E5, N.G4]], [N.G3, [N.B3, N.D4, N.F4, N.A4]]];
      prog.forEach(([bass, ch], bar) => {
        const t0 = t + bar * 4 * b;
        tone(ac, out, t0, bass, 4 * b, 'sine', 0.18, 0.08);
        ch.forEach(n => tone(ac, out, t0, n, 4 * b, 'sine', 0.045, 0.4));
        for (let i = 0; i < 4; i++) {
          kick(ac, out, t0 + i * b, i % 2 ? 0.0001 : 0.25);
          hat(ac, out, t0 + i * b + b / 2, 0.04);
          if (i % 2) noise(ac, out, t0 + i * b, 0.12, 0.08, 1500, 0.7, 'bandpass');
        }
        tone(ac, out, t0 + b * 1.5, ch[bar % 4] + 12, b, 'triangle', 0.05);
      });
      return 16 * b;
    },
    drums(ac, out, t) {
      // a building snare roll, then a crash and a big boom
      let x = t, gap = 0.12;
      for (let i = 0; i < 26; i++) { snare(ac, out, x, 0.05 + i * 0.008); x += gap; gap = Math.max(0.045, gap * 0.95); }
      noise(ac, out, x, 1.6, 0.25, 5000); kick(ac, out, x, 0.9); tone(ac, out, x, N.C3 - 12, 1.2, 'sine', 0.3);
      return x - t + 1.8;
    }
  };

  // Plays `id` into `out` (an AudioNode), looping until stop() is called.
  function play(ac, out, id) {
    const loop = LOOPS[id];
    if (!loop) return { stop() {} };
    const bus = ac.createGain(); bus.gain.value = 0.9; bus.connect(out);
    let next = ac.currentTime + 0.05, timer = 0, stopped = false;
    const fill = () => { while (!stopped && next < ac.currentTime + 2) next += loop(ac, bus, next); };
    fill(); timer = setInterval(fill, 500);
    return {
      stop() {
        stopped = true; clearInterval(timer);
        bus.gain.setTargetAtTime(0, ac.currentTime, 0.08);
        setTimeout(() => bus.disconnect(), 400);
      }
    };
  }

  window.PBMusic = { TUNES, play };
})();
