'use strict';

const AudioEngine = (() => {
  const INSTRUMENTS = {
    grand:    { p: [[1,1],[2,.5],[3,.25],[4,.12],[5,.06]],         a:.01,  d:6,  b:3500 },
    electric: { p: [[1,1],[2,.35],[3,.15],[4,.08]],                 a:.005, d:4.5,b:2800 },
    bright:   { p: [[1,1],[2,.7],[3,.4],[4,.2],[5,.1]],             a:.003, d:5,  b:6000 },
    musicbox: { p: [[1,1],[2,.15],[3,.05]],                         a:.001, d:3,  b:8000 },
    organ:    { p: [[1,1],[2,.7],[3,.5],[4,.3],[6,.15],[8,.08]],    a:.05,  d:20, b:4000 },
    harp:     { p: [[1,1],[2,.4],[3,.2],[4,.1],[5,.05],[6,.03]],    a:.002, d:3.5,b:5000 },
    synth:    { p: [[1,1],[2,.5],[3,.25],[4,.1]],                   a:.4,   d:8,  b:2500 }
  };

  let ctx = null, masterBus = null, currentInstrument = 'grand';

  function init() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { console.error('Web Audio not supported'); return null; }

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.attack.value = .008; comp.release.value = .25;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1; limiter.ratio.value = 20;
    limiter.attack.value = .003; limiter.release.value = .1;

    const out = ctx.createGain(); out.gain.value = .9;
    masterBus = ctx.createGain(); masterBus.gain.value = .85;

    masterBus.connect(comp); comp.connect(limiter); limiter.connect(out); out.connect(ctx.destination);
    return ctx;
  }

  function setInstrument(name) { if (INSTRUMENTS[name]) currentInstrument = name; }

  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function playNote(midi, velocity, when) {
    if (!ctx) return null;
    velocity = velocity || .85;
    when = when || 0;
    const inst = INSTRUMENTS[currentInstrument];
    const freq = midiToFreq(midi);
    const t0 = Math.max(when, ctx.currentTime);

    const voiceGain = ctx.createGain(); voiceGain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = .6;
    filter.frequency.setValueAtTime(900 + velocity * inst.b, t0);
    filter.frequency.exponentialRampToValueAtTime(200, t0 + inst.d);

    const oscs = [];
    for (let i = 0; i < inst.p.length; i++) {
      const ratio = inst.p[i][0], gain = inst.p[i][1];
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      osc.detune.value = (Math.random() - .5) * 4;
      const g = ctx.createGain(); g.gain.value = gain;
      osc.connect(g); g.connect(filter);
      osc.start(t0);
      oscs.push(osc);
    }

    const amp = .1 + Math.pow(velocity, 1.4) * .7;
    const decay = Math.max(1, 6 - Math.log2(freq / 55) * .7);

    voiceGain.gain.setValueAtTime(0, t0);
    voiceGain.gain.linearRampToValueAtTime(amp, t0 + inst.a);
    voiceGain.gain.exponentialRampToValueAtTime(.0001, t0 + decay);

    filter.connect(voiceGain);
    voiceGain.connect(masterBus);

    return {
      release: function(when) {
        try {
          const t = Math.max(when || ctx.currentTime, ctx.currentTime);
          voiceGain.gain.cancelScheduledValues(t);
          voiceGain.gain.setValueAtTime(Math.max(voiceGain.gain.value, .0001), t);
          voiceGain.gain.exponentialRampToValueAtTime(.0001, t + .3);
          oscs.forEach(function(o) { o.stop(t + .35); });
        } catch (e) {}
      }
    };
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') return ctx.resume();
    return Promise.resolve();
  }

  return {
    init: init,
    playNote: playNote,
    setInstrument: setInstrument,
    resume: resume,
    getContext: function() { return ctx; },
    isReady: function() { return ctx && ctx.state === 'running'; }
  };
})();
