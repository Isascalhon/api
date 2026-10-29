export default class AudioManager {
  constructor() {
    this.context = null;
    this.engine = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.turbo = null;
    this.turboGain = null;
    this.effectsVolume = 0.65;
    this.musicVolume = 0.18;
    this.muted = false;
    this.musicEnabled = true;
    this.nextNoteAt = 0;
    this.noteIndex = 0;
    this.notes = [130.81, 164.81, 196, 246.94, 196, 164.81];
  }

  async unlock() {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.engine = this.context.createOscillator();
      this.engine.type = 'sawtooth';
      this.engineGain = this.context.createGain();
      this.engineFilter = this.context.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 420;
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.context.destination);
      this.engine.start();

      this.turbo = this.context.createOscillator();
      this.turbo.type = 'triangle';
      this.turbo.frequency.value = 92;
      this.turboGain = this.context.createGain();
      this.turboGain.gain.value = 0;
      this.turbo.connect(this.turboGain).connect(this.context.destination);
      this.turbo.start();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setVolumes({ effectsVolume, musicVolume, muted, musicEnabled } = {}) {
    if (effectsVolume !== undefined) this.effectsVolume = effectsVolume;
    if (musicVolume !== undefined) this.musicVolume = musicVolume;
    if (muted !== undefined) this.muted = muted;
    if (musicEnabled !== undefined) this.musicEnabled = musicEnabled;
  }

  update(speed, boosting, active) {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const volume = this.muted ? 0 : this.effectsVolume;
    const engineLevel = active ? volume * (0.025 + Math.min(speed / 60, 1) * 0.055) : 0;
    this.engineGain.gain.setTargetAtTime(engineLevel, now, 0.08);
    this.engine.frequency.setTargetAtTime(58 + Math.min(speed, 60) * 5.2, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(220 + Math.min(speed, 60) * 22, now, 0.08);
    this.turboGain.gain.setTargetAtTime(boosting ? volume * 0.075 : 0, now, 0.06);
    this.turbo.frequency.setTargetAtTime(boosting ? 145 + speed * 3 : 75, now, 0.1);

    if (active && this.musicEnabled && !this.muted && now >= this.nextNoteAt) {
      this.playTone(this.notes[this.noteIndex % this.notes.length], 0.28, 'triangle', this.musicVolume * 0.11);
      this.noteIndex += 1;
      this.nextNoteAt = now + 0.46;
    }
  }

  playTone(frequency, duration = 0.16, type = 'sine', volume = null) {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume ?? this.effectsVolume * 0.12), now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  collect() {
    this.playTone(740, 0.12, 'sine', this.effectsVolume * 0.19);
    setTimeout(() => this.playTone(1110, 0.1, 'sine', this.effectsVolume * 0.13), 70);
  }

  hit() { this.playTone(115, 0.25, 'square', this.effectsVolume * 0.2); }
  boost() { this.playTone(260, 0.4, 'sawtooth', this.effectsVolume * 0.12); }
  countdown() { this.playTone(440, 0.12, 'square', this.effectsVolume * 0.12); }
  go() { this.playTone(880, 0.35, 'triangle', this.effectsVolume * 0.18); }
  finish(won) { this.playTone(won ? 659 : 220, 0.55, 'triangle', this.effectsVolume * 0.18); }

  dispose() {
    if (this.context && this.context.state !== 'closed') this.context.close();
    this.context = null;
  }
}
