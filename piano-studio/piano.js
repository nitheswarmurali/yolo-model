'use strict';

const Piano = (() => {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

  const state = {
    startOctave: 3,
    numOctaves: 3,
    heldVoices: {},
    keyElements: {}
  };

  function isWhite(midi) { return WHITE_SEMITONES.indexOf(midi % 12) > -1; }
  function noteName(midi) { return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1); }

  function chooseOctaves() {
    const w = window.innerWidth, h = window.innerHeight;
    const landscape = w > h;
    const targetKeyWidth = w < 420 ? 44 : 50;
    const maxWhiteKeys = Math.floor(w / targetKeyWidth);
    let octaves = Math.floor((maxWhiteKeys - 1) / 7);
    octaves = Math.max(2, Math.min(7, octaves));
    if (landscape && h < 500) octaves = Math.min(6, octaves + 1);
    return octaves;
  }

  function build() {
    const container = document.getElementById('piano');
    if (!container) return;

    state.numOctaves = chooseOctaves();
    const maxStart = Math.max(0, 8 - state.numOctaves);
    state.startOctave = Math.max(0, Math.min(maxStart, state.startOctave));
    if (state.startOctave < 1) state.startOctave = 3;

    container.innerHTML = '';
    state.keyElements = {};

    const W = container.clientWidth, H = container.clientHeight;
    if (W < 50 || H < 50) { setTimeout(build, 100); return; }

    const totalWhite = state.numOctaves * 7 + 1;
    const whiteWidth = W / totalWhite;
    const blackWidth = whiteWidth * .62;
    const startMidi = (state.startOctave + 1) * 12;

    let whiteCount = 0;
    for (let i = 0; i <= state.numOctaves * 12; i++) {
      const midi = startMidi + i;
      if (!isWhite(midi)) continue;
      const k = document.createElement('div');
      k.className = 'k w';
      k.style.left = (whiteCount * whiteWidth) + 'px';
      k.style.width = whiteWidth + 'px';
      k.style.height = '100%';
      k.innerHTML = '<div class="n">' + noteName(midi) + '</div>';
      attachEvents(k, midi);
      container.appendChild(k);
      state.keyElements[midi] = k;
      whiteCount++;
    }

    let whiteIndex = 0;
    for (let i = 0; i <= state.numOctaves * 12; i++) {
      const midi = startMidi + i;
      if (!isWhite(midi)) {
        const k = document.createElement('div');
        k.className = 'k b';
        k.style.left = (whiteIndex * whiteWidth - blackWidth / 2) + 'px';
        k.style.width = blackWidth + 'px';
        k.style.height = '62%';
        k.innerHTML = '<div class="n">' + noteName(midi) + '</div>';
        attachEvents(k, midi);
        container.appendChild(k);
        state.keyElements[midi] = k;
      } else whiteIndex++;
    }
    updateOctaveLabel();
  }

  function attachEvents(el, midi) {
    el.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch(err) {}
      press(midi);
      if (navigator.vibrate) navigator.vibrate(8);
    });
    el.addEventListener('pointerup', function(e) { e.preventDefault(); release(midi); });
    el.addEventListener('pointercancel', function() { release(midi); });
    el.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  }

  function press(midi) {
    if (state.heldVoices[midi]) return;
    const voice = AudioEngine.playNote(midi, .85);
    if (!voice) return;
    state.heldVoices[midi] = voice;
    if (state.keyElements[midi]) state.keyElements[midi].classList.add('on');
  }

  function release(midi) {
    const voice = state.heldVoices[midi];
    if (!voice) return;
    delete state.heldVoices[midi];
    if (state.keyElements[midi]) state.keyElements[midi].classList.remove('on');
    voice.release();
  }

  function shiftOctave(delta) {
    const maxStart = Math.max(0, 8 - state.numOctaves);
    state.startOctave = Math.max(0, Math.min(maxStart, state.startOctave + delta));
    build();
  }

  function updateOctaveLabel() {
    const label = document.getElementById('oct-label');
    if (label) label.textContent = 'C' + state.startOctave + '–C' + (state.startOctave + state.numOctaves);
  }

  function highlight(midi, on) {
    const el = state.keyElements[midi];
    if (el) el.classList.toggle('hint', on);
  }

  function clearHighlights() {
    Object.values(state.keyElements).forEach(function(el) { el.classList.remove('hint'); });
  }

  return {
    build: build,
    press: press,
    release: release,
    shiftOctave: shiftOctave,
    highlight: highlight,
    clearHighlights: clearHighlights,
    getStartOctave: function() { return state.startOctave; },
    getNumOctaves: function() { return state.numOctaves; }
  };
})();
