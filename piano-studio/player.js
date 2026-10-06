'use strict';

const SongPlayer = (() => {
  let current = null, startTime = 0, isPlaying = false, rafId = null;
  let scheduledSet = new Set(), highlightTimers = [];

  function load(songKey) {
    stop();
    const song = SONGS[songKey];
    if (!song) return;

    const beatDuration = 60 / song.bpm / getSpeed();
    const lastBeat = song.notes.reduce(function(m, n) { return Math.max(m, n[1] + n[2]); }, 0);

    current = {
      title: song.title,
      bpm: song.bpm,
      notes: song.notes,
      beatDuration: beatDuration,
      duration: lastBeat * beatDuration + 1
    };

    scheduledSet.clear();
    setStatus('Loaded: ' + song.title);
  }

  function play() {
    if (!current) { setStatus('Pick a song first'); return; }
    if (isPlaying) { stop(); return; }

    AudioEngine.init();

    const start = function() {
      const ctx = AudioEngine.getContext();
      isPlaying = true;
      startTime = ctx.currentTime;
      scheduledSet.clear();
      setStatus('Playing: ' + current.title);
      tick();
    };

    const ctx = AudioEngine.getContext();
    if (ctx.state !== 'running') {
      AudioEngine.resume().then(start).catch(start);
    } else start();
  }

  function stop() {
    isPlaying = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    scheduledSet.clear();
    highlightTimers.forEach(function(t) { clearTimeout(t); });
    highlightTimers = [];
    Piano.clearHighlights();
    setStatus('Ready');
  }

  function tick() {
    if (!isPlaying || !current) return;
    const ctx = AudioEngine.getContext();
    const now = ctx.currentTime;
    const elapsed = now - startTime;

    for (let i = 0; i < current.notes.length; i++) {
      if (scheduledSet.has(i)) continue;
      const midi = current.notes[i][0], beatStart = current.notes[i][1], beatDur = current.notes[i][2];
      const noteTime = startTime + beatStart * current.beatDuration;
      if (noteTime < now + .06) {
        AudioEngine.playNote(midi, .85, Math.max(now, noteTime));
        scheduleHighlight(midi, noteTime, noteTime + beatDur * current.beatDuration, now);
        scheduledSet.add(i);
      }
    }

    if (elapsed > current.duration) { stop(); return; }
    rafId = requestAnimationFrame(tick);
  }

  function scheduleHighlight(midi, startAt, endAt, now) {
    const delayOn = Math.max(0, (startAt - now) * 1000);
    const delayOff = Math.max(0, (endAt - now) * 1000 + 180);
    highlightTimers.push(setTimeout(function() { Piano.highlight(midi, true); }, delayOn));
    highlightTimers.push(setTimeout(function() { Piano.highlight(midi, false); }, delayOff));
  }

  function getSpeed() {
    const el = document.getElementById('speed');
    return el ? parseFloat(el.value) || 2 : 2;
  }

  function setStatus(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
  }

  return {
    load: load,
    play: play,
    stop: stop,
    isPlaying: function() { return isPlaying; }
  };
})();
