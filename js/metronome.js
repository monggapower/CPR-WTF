'use strict';

/**
 * SoundFX — browser replacement for AudioServicesPlaySystemSound(1057 / 1322)
 * and AVFoundation playback used by the original app.
 */
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** Short "tink" metronome / countdown tick (≈ iOS system sound 1057) */
  tick() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /** Two-note success chime (≈ iOS system sound 1322) */
  success() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    [[1046.5, 0], [1568, 0.14]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.13, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.45);
    });
  }
}

/**
 * MetronomeManager — port of MetronomeManager.swift (110 BPM default)
 */
class MetronomeManager {
  constructor(sound) {
    this.sound = sound;
    this.isPlaying = false;
    this.bpm = 110.0;
    this._timer = null;
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const interval = 60000.0 / this.bpm;
    this._timer = setInterval(() => {
      if (this.sound) this.sound.tick();
    }, interval);
  }

  stop() {
    this.isPlaying = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
