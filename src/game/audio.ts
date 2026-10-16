/**
 * Fail-safe Web Audio procedural sound synthesizer for Island Odyssey
 * Guaranteed to never crash or throw unhandled exceptions even if
 * browser autoplay policy suspends AudioContext or audio hardware is disabled.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmTimer: number | null = null;
  private currentTheme: 'cheerful' | 'mystic' | 'twilight' = 'cheerful';

  constructor() {}

  private initCtx() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // AudioContext creation silently failed, game continues without audio
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playTone(
    freq: number,
    duration: number = 0.35,
    type: OscillatorType = 'triangle',
    gainLevel: number = 0.12
  ) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainLevel, this.ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio synthesis hiccups
    }
  }

  public playJump() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.14);
    } catch {}
  }

  public playDoubleJump() {
    if (this.isMuted) return;
    try {
      this.playTone(523.25, 0.16, 'sine', 0.11);
      setTimeout(() => this.playTone(659.25, 0.20, 'sine', 0.13), 35);
    } catch {}
  }

  public playTripleJump() {
    if (this.isMuted) return;
    try {
      // 3-note ascending crystalline arpeggio for magical triple jump lift
      this.playTone(659.25, 0.15, 'sine', 0.12); // E5
      setTimeout(() => this.playTone(830.61, 0.18, 'sine', 0.14), 40); // G#5
      setTimeout(() => this.playTone(1046.5, 0.24, 'triangle', 0.15), 85); // C6
    } catch {}
  }

  public playBounce(superBounce: boolean = false) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = superBounce ? 'sine' : 'triangle';
      const baseFreq = superBounce ? 220 : 180;
      const targetFreq = superBounce ? 880 : 680;
      const duration = superBounce ? 0.35 : 0.25;

      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);

      gain.gain.setValueAtTime(superBounce ? 0.24 : 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + duration);

      if (superBounce) {
        // High crystalline shimmer tone for super bounce
        setTimeout(() => this.playTone(1174.66, 0.28, 'sine', 0.12), 30);
      }
    } catch {}
  }

  public playDash(chainCount: number = 1) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const duration = 0.15;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      // Pitch rises dynamically with consecutive chained air dashes
      const pitchMultiplier = Math.min(2.0, 1 + (chainCount - 1) * 0.25);
      filter.frequency.setValueAtTime(850 * pitchMultiplier, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.2, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();

      // Distinct melodic tonal whip for chained air dashes
      if (chainCount > 1) {
        const chainTone = 440 * pitchMultiplier;
        this.playTone(chainTone, 0.14, 'triangle', 0.1);
      }
    } catch {}
  }

  public playCollectPearl(count: number = 1) {
    if (this.isMuted) return;
    try {
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const pitch = scale[count % scale.length];
      this.playTone(pitch, 0.35, 'triangle', 0.14);
      setTimeout(() => this.playTone(pitch * 1.5, 0.25, 'sine', 0.08), 30);
    } catch {}
  }

  public playCollectFruit() {
    if (this.isMuted) return;
    try {
      this.playTone(440, 0.15, 'sine', 0.15);
      setTimeout(() => this.playTone(880, 0.25, 'sine', 0.15), 60);
    } catch {}
  }

  public playHurt() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.2);
    } catch {}
  }

  public playWaterSplash() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {}
  }

  public playTotemActivate() {
    if (this.isMuted) return;
    try {
      const chords = [392.0, 493.88, 587.33, 783.99];
      chords.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 1.2, 'sine', 0.12);
        }, idx * 120);
      });
    } catch {}
  }

  public playVictory() {
    if (this.isMuted) return;
    try {
      const fanfare = [
        { f: 523.25, d: 150 },
        { f: 659.25, d: 150 },
        { f: 783.99, d: 150 },
        { f: 1046.5, d: 400 },
      ];

      let delay = 0;
      fanfare.forEach((n) => {
        setTimeout(() => {
          this.playTone(n.f, n.d / 1000 + 0.2, 'triangle', 0.16);
        }, delay);
        delay += n.d;
      });
    } catch {}
  }

  public startBGM(theme: 'cheerful' | 'mystic' | 'twilight' = 'cheerful') {
    this.currentTheme = theme;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    const cheerfulNotes = [261.63, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
    const mysticNotes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 329.63];
    const twilightNotes = [196.0, 246.94, 293.66, 369.99, 392.0, 493.88];

    let step = 0;
    this.bgmTimer = window.setInterval(() => {
      if (this.isMuted) return;
      try {
        const notes =
          this.currentTheme === 'cheerful'
            ? cheerfulNotes
            : this.currentTheme === 'mystic'
            ? mysticNotes
            : twilightNotes;

        const note = notes[step % notes.length];
        if (step % 2 === 0) {
          this.playTone(note, 0.6, 'sine', 0.035);
        } else {
          this.playTone(note * 1.5, 0.4, 'triangle', 0.02);
        }
        step++;
      } catch {}
    }, 600);
  }

  public stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sound = new SoundEngine();
