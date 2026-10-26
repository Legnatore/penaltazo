/**
 * Motor de audio sintetizado con Web Audio API.
 * 100% autónomo, sin dependencias externas ni archivos mp3.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.themeAudio = new Audio('assets/audio/penaltazo.mp3');
    this.themeAudio.preload = 'auto';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.themeAudio) {
      this.themeAudio.pause();
      this.themeAudio.currentTime = 0;
    }
    return this.muted;
  }

  playPenaltazoTheme() {
    if (this.muted) return;
    try {
      this.themeAudio.currentTime = 0;
      this.themeAudio.play().catch(() => {});
    } catch (e) {}
  }

  playWhistle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    // Frecuencias clásicas de silbato de árbitro
    osc1.frequency.setValueAtTime(2800, now);
    osc2.frequency.setValueAtTime(2850, now);

    // Modulación de trémolo (vibración del guisante del silbato)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(35, now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(80, now);
    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);
    lfo.start(now);
    lfo.stop(now + 0.35);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  playKick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Golpe seco y grave (impacto de la bota contra el cuero)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    // Ruido de textura para el impacto
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    noise.connect(noiseGain);
    gain.connect(this.ctx.destination);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.16);
    noise.stop(now + 0.07);
  }

  playSave(isGoodForMe = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Golpe de guantes (manotazo contundente)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Sonido victorioso si paraste tú, o de derrota si te la paró el rival
    if (isGoodForMe) {
      this.playVictoryFanfare();
    } else {
      this.playDefeatSound();
    }
  }

  playGoal(isGoodForMe = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Sonido de red estremeciéndose
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filtro pasa banda para emular las cuerdas de la red
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(3, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.26);

    // Sonido victorioso si marcaste tú, o de derrota si te metieron gol
    if (isGoodForMe) {
      this.playVictoryFanfare();
    } else {
      this.playDefeatSound();
    }
  }

  playMiss(isGoodForMe = true) {
    if (this.muted) return;
    if (isGoodForMe) {
      this.playVictoryFanfare();
    } else {
      this.playDefeatSound();
    }
  }

  playVictoryFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Clamor alegre de la grada + acorde ascendente triunfal
    this.playCrowdCheer(true);

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + idx * 0.08;
      const dur = idx === notes.length - 1 ? 0.45 : 0.16;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
    });
  }

  playDefeatSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Lamento de la grada + notas descendentes de decepción
    this.playCrowdCheer(false);

    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63]; // Sol4, Fa4, Mi♭4, Do4
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const startTime = now + idx * 0.12;
      const dur = idx === notes.length - 1 ? 0.5 : 0.18;

      osc.frequency.setValueAtTime(freq, startTime);
      if (idx === notes.length - 1) {
        osc.frequency.linearRampToValueAtTime(freq * 0.92, startTime + dur);
      }

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
    });
  }

  playCrowdCheer(isGoal = true) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = isGoal ? 1.8 : 1.2;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      let envelope = 1;
      if (t < 0.2) envelope = t / 0.2;
      else envelope = Math.exp(-(t - 0.2) * (isGoal ? 1.2 : 2.0));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isGoal ? 1200 : 700, now);
    if (isGoal) {
      filter.frequency.linearRampToValueAtTime(1600, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(600, now + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isGoal ? 0.3 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  playSelect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

window.soundEngine = new SoundEngine();
