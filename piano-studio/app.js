'use strict';

document.addEventListener('DOMContentLoaded', function() {

  AudioEngine.init();
  Piano.build();

  const songSelect = document.getElementById('song');
  for (const key in SONGS) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = SONGS[key].title;
    songSelect.appendChild(opt);
  }

  songSelect.addEventListener('change', function() {
    if (this.value) {
      SongPlayer.load(this.value);
      setTimeout(function() { SongPlayer.play(); }, 30);
    } else SongPlayer.stop();
  });

  document.getElementById('play').addEventListener('click', function() {
    AudioEngine.resume();
    SongPlayer.play();
  });
  document.getElementById('stop').addEventListener('click', function() { SongPlayer.stop(); });

  document.getElementById('inst').addEventListener('change', function() {
    AudioEngine.setInstrument(this.value);
    document.getElementById('status').textContent = this.options[this.selectedIndex].text;
  });

  document.getElementById('oct-down').addEventListener('click', function() { Piano.shiftOctave(-1); });
  document.getElementById('oct-up').addEventListener('click', function() { Piano.shiftOctave(1); });

  // iOS / Android audio unlock
  const unlock = function() {
    AudioEngine.init();
    AudioEngine.resume();
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.addEventListener('pointerdown', unlock, { once: true });

  // Keyboard mapping for tablets/desktop
  const KEY_MAP = { a:0, w:1, s:2, e:3, d:4, f:5, t:6, g:7, y:8, h:9, u:10, j:11, k:12, o:13, l:14, p:15 };
  const keyDownSet = {};

  document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'z') { Piano.shiftOctave(-1); return; }
    if (k === 'x') { Piano.shiftOctave(1); return; }
    if (keyDownSet[k]) return;
    if (k in KEY_MAP) {
      keyDownSet[k] = true;
      Piano.press((Piano.getStartOctave() + 1) * 12 + KEY_MAP[k]);
    }
  });

  document.addEventListener('keyup', function(e) {
    const k = e.key.toLowerCase();
    delete keyDownSet[k];
    if (k in KEY_MAP) Piano.release((Piano.getStartOctave() + 1) * 12 + KEY_MAP[k]);
  });

  // Rebuild on resize / orientation change
  let rt;
  window.addEventListener('resize', function() { clearTimeout(rt); rt = setTimeout(function() { Piano.build(); }, 150); });
  window.addEventListener('orientationchange', function() { setTimeout(Piano.build, 300); });

  // Prevent scroll while playing
  document.addEventListener('touchmove', function(e) {
    if (e.target.closest('#piano')) e.preventDefault();
  }, { passive: false });

  // Prevent double-tap zoom
  let lastTap = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, { passive: false });

  const inst = document.getElementById('inst');
  document.getElementById('status').textContent = inst.options[inst.selectedIndex].text;
});
