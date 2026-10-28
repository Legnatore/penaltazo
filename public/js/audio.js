/**
 * PenaltazoAudio - Motor de sonido procedimental y reactivo para ¡PENALTAZO!
 * Implementado 100% con Web Audio API nativa (sin librerías externas ni mp3).
 * Latencia cero, envolventes ADSR precisas y compatibilidad total con móviles.
 */
class PenaltazoAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('penaltazo_muted') === 'true';
    this.activeNodes = new Set();
    this.tensionState = null;
    this.whiteNoiseBuffer = null;

    // Escuchar interacción del usuario para desbloquear AudioContext en móviles
    this.bindUnlockEvents();
  }

  /**
   * Vincula eventos táctiles y de ratón para despertar el AudioContext
   */
  bindUnlockEvents() {
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'running') {
        ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
          document.removeEventListener(evt, unlock);
        });
      }
    };
    ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlock, { passive: true });
    });
  }

  /**
   * Inicializa y reanuda el AudioContext en el primer toque/click
   */
  init() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext no inicializado aún:', e);
    }
  }

  /**
   * Genera o reutiliza un buffer de ruido blanco de alta fidelidad
   */
  getWhiteNoiseBuffer(duration = 2.5) {
    if (!this.ctx) return null;
    if (this.whiteNoiseBuffer && this.whiteNoiseBuffer.duration >= duration) {
      return this.whiteNoiseBuffer;
    }
    const sampleRate = this.ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
    return buffer;
  }

  /**
   * Registra nodos de audio para detenerlos si se activa el mute o nuevo efecto
   */
  registerNode(node) {
    if (!node) return;
    this.activeNodes.add(node);
    const cleanup = () => {
      this.activeNodes.delete(node);
    };
    if (typeof node.addEventListener === 'function') {
      node.addEventListener('ended', cleanup, { once: true });
    } else {
      node.onended = cleanup;
    }
  }

  /**
   * Detiene inmediatamente los sonidos efímeros en curso
   */
  stopActiveEffects() {
    this.activeNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    this.activeNodes.clear();
  }

  /**
   * Interruptor de silencio con persistencia en localStorage
   */
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('penaltazo_muted', String(this.muted));
    if (this.muted) {
      this.stopActiveEffects();
      this.stopTension(50);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // =========================================================================
  // 1. playTension(): Desactivado por solicitud (el zumbido/murmullo resultaba molesto)
  // =========================================================================
  playTension() {
    // Silenciado de forma permanente
    return;
  }

  stopTension(fadeMs = 250) {
    if (!this.tensionState || !this.ctx) return;
    const { osc1, osc2, lfo, noiseSource, masterGain } = this.tensionState;
    this.tensionState = null;

    try {
      const now = this.ctx.currentTime;
      const fadeTime = Math.max(fadeMs / 1000, 0.05);
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeTime);

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          lfo.stop();
          if (noiseSource) noiseSource.stop();
          masterGain.disconnect();
        } catch (e) {}
      }, fadeMs + 30);
    } catch (e) {}
  }

  // =========================================================================
  // 2. playWhistle(): Silbato del árbitro (doble oscilador 2.8kHz y 3.2kHz + trémolo)
  // =========================================================================
  playWhistle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    this.stopTension(80);

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    // Frecuencias agudas de silbato reglamentario
    osc1.frequency.setValueAtTime(2820, now);
    osc2.frequency.setValueAtTime(3210, now);

    // LFO rápido a ~36Hz para el aleteo metálico ("pealess / pea vibration")
    const lfo = this.ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.setValueAtTime(36, now);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(110, now);

    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);

    // Envolvente ADSR de silbato: ataque cortante y decaimiento limpio
    const dur = 0.32;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.015);
    gain.gain.setValueAtTime(0.22, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    this.registerNode(osc1);
    this.registerNode(osc2);
    this.registerNode(lfo);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    lfo.stop(now + dur);
    osc1.stop(now + dur);
    osc2.stop(now + dur);
  }

  // =========================================================================
  // 3. playKick(power): Golpe seco al balón (tono 150Hz -> 40Hz + chasquido de ataque)
  // =========================================================================
  playKick(power = 1.0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const p = Math.max(0.4, Math.min(power || 1.0, 1.8));

    // 1. Cuerpo del balón: caída rápida de tono grave 155Hz -> 38Hz
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155 * Math.min(p, 1.25), now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.42 * p, now + 0.004);
    oscGain.gain.exponentialRampToValueAtTime(0.002, now + 0.13);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // 2. Chasquido de ataque (la bota impactando el cuero)
    const noiseBuffer = this.getWhiteNoiseBuffer(0.08);
    if (noiseBuffer) {
      const snap = this.ctx.createBufferSource();
      snap.buffer = noiseBuffer;

      const snapFilter = this.ctx.createBiquadFilter();
      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(1450, now);
      snapFilter.Q.setValueAtTime(2.2, now);

      const snapGain = this.ctx.createGain();
      snapGain.gain.setValueAtTime(0.28 * p, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      snap.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.ctx.destination);

      snap.start(now);
      snap.stop(now + 0.03);
      this.registerNode(snap);
    }

    this.registerNode(osc);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // =========================================================================
  // 4. playNet(): Balón entrando en la red (filtro paso-bajo + ruido blanco suave)
  // =========================================================================
  playNet() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = 0.42;
    const noiseBuffer = this.getWhiteNoiseBuffer(dur);
    if (!noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filtro paso-bajo para dar la textura esponjosa y acolchada de las mallas
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(580, now);
    lowpass.frequency.linearRampToValueAtTime(340, now + dur);
    lowpass.Q.setValueAtTime(1.8, now);

    // Filtro resonante secundario que simula el crujido de cuerdas
    const ropeFilter = this.ctx.createBiquadFilter();
    ropeFilter.type = 'peaking';
    ropeFilter.frequency.setValueAtTime(420, now);
    ropeFilter.gain.setValueAtTime(6.0, now);
    ropeFilter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(lowpass);
    lowpass.connect(ropeFilter);
    ropeFilter.connect(gain);
    gain.connect(this.ctx.destination);

    this.registerNode(noise);
    noise.start(now);
    noise.stop(now + dur);
  }

  // =========================================================================
  // 5. playPost(): Impacto metálico hueco y resonante en poste o larguero
  // =========================================================================
  playPost() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const ringDuration = 1.25;

    // 1. Clonk hueco inicial (cuerpo del tubo de acero)
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(190, now);
    thud.frequency.exponentialRampToValueAtTime(58, now + 0.08);

    thudGain.gain.setValueAtTime(0.40, now);
    thudGain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(now);
    thud.stop(now + 0.11);
    this.registerNode(thud);

    // 2. Resonancia metálica armónica prolongada (~980Hz, ~1850Hz y ~420Hz)
    const metallicFreqs = [
      { f: 980, type: 'sine', gain: 0.38, decay: 1.2 },
      { f: 1840, type: 'sine', gain: 0.22, decay: 0.8 },
      { f: 420, type: 'triangle', gain: 0.26, decay: 0.95 }
    ];

    metallicFreqs.forEach(({ f, type, gain, decay }) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(f, now);
      // Ligero micro-bend de tensión metálica
      osc.frequency.exponentialRampToValueAtTime(f * 0.985, now + decay);

      // Filtro pasobanda estrecho de alta resonancia (Q alto)
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(f, now);
      bandpass.Q.setValueAtTime(16, now);

      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(gain, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(bandpass);
      bandpass.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + decay + 0.02);
      this.registerNode(osc);
    });
  }

  // =========================================================================
  // 6. playSave(): Palmada con guante / desvío seco del portero
  // =========================================================================
  playSave() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Impacto mate del cuerpo del guante (210Hz -> 65Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(215, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.38, now + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // 2. Ráfaga corta de fricción de látex / palma
    const noiseBuffer = this.getWhiteNoiseBuffer(0.06);
    if (noiseBuffer) {
      const slap = this.ctx.createBufferSource();
      slap.buffer = noiseBuffer;

      const slapFilter = this.ctx.createBiquadFilter();
      slapFilter.type = 'bandpass';
      slapFilter.frequency.setValueAtTime(880, now);
      slapFilter.Q.setValueAtTime(2.6, now);

      const slapGain = this.ctx.createGain();
      slapGain.gain.setValueAtTime(0.24, now);
      slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      slap.connect(slapFilter);
      slapFilter.connect(slapGain);
      slapGain.connect(this.ctx.destination);

      slap.start(now);
      slap.stop(now + 0.045);
      this.registerNode(slap);
    }

    this.registerNode(osc);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // =========================================================================
  // 7. playCheer(duration): Rugido de la grada al marcar gol
  // =========================================================================
  playCheer(duration = 2.4) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = Math.max(1.2, duration);
    const noiseBuffer = this.getWhiteNoiseBuffer(dur);
    if (!noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filtro dinámico que se abre rápido (fans poniéndose en pie: ¡¡GOOOL!!)
    const crowdFilter = this.ctx.createBiquadFilter();
    crowdFilter.type = 'lowpass';
    crowdFilter.frequency.setValueAtTime(750, now);
    crowdFilter.frequency.linearRampToValueAtTime(2400, now + 0.35);
    crowdFilter.frequency.exponentialRampToValueAtTime(950, now + dur);
    crowdFilter.Q.setValueAtTime(1.5, now);

    // Formante vocal colectivo en medios
    const formant = this.ctx.createBiquadFilter();
    formant.type = 'peaking';
    formant.frequency.setValueAtTime(1150, now);
    formant.gain.setValueAtTime(7.5, now);
    formant.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.36, now + 0.22);
    gain.gain.setValueAtTime(0.32, now + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(crowdFilter);
    crowdFilter.connect(formant);
    formant.connect(gain);
    gain.connect(this.ctx.destination);

    // Capa armónica eufórica adicional (grada cantando en coro)
    const chord = [220, 277.18, 329.63]; // Acorde mayor (La, Do#, Mi)
    chord.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const fFilter = this.ctx.createBiquadFilter();
      fFilter.type = 'lowpass';
      fFilter.frequency.setValueAtTime(650, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.045, now + 0.3);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (dur * 0.75));

      osc.connect(fFilter);
      fFilter.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + dur * 0.75 + 0.05);
      this.registerNode(osc);
    });

    this.registerNode(noise);
    noise.start(now);
    noise.stop(now + dur);
  }

  // =========================================================================
  // 8. playDisappointment(duration): "¡Uyyy!" colectivo al fallar o ir al poste
  // =========================================================================
  playDisappointment(duration = 1.6) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = Math.max(1.0, duration);
    const noiseBuffer = this.getWhiteNoiseBuffer(dur);
    if (!noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filtro con barrido descendente emulando la vocal colectiva "Uuuuuyyy"
    const vocalFilter = this.ctx.createBiquadFilter();
    vocalFilter.type = 'bandpass';
    vocalFilter.frequency.setValueAtTime(820, now);
    vocalFilter.frequency.exponentialRampToValueAtTime(260, now + dur);
    vocalFilter.Q.setValueAtTime(3.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.12);
    gain.gain.setValueAtTime(0.26, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(vocalFilter);
    vocalFilter.connect(gain);
    gain.connect(this.ctx.destination);

    // Tono sutil descendente de suspiro
    const sigh = this.ctx.createOscillator();
    const sighGain = this.ctx.createGain();
    sigh.type = 'sine';
    sigh.frequency.setValueAtTime(280, now);
    sigh.frequency.exponentialRampToValueAtTime(110, now + dur);

    sighGain.gain.setValueAtTime(0.001, now);
    sighGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
    sighGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    sigh.connect(sighGain);
    sighGain.connect(this.ctx.destination);

    sigh.start(now);
    sigh.stop(now + dur);
    this.registerNode(sigh);

    this.registerNode(noise);
    noise.start(now);
    noise.stop(now + dur);
  }

  // =========================================================================
  // MÉTODOS DE COMPATIBILIDAD Y EFECTOS ADICIONALES
  // =========================================================================

  /**
   * Clic acústico nítido para selección de celda y botones
   */
  playSelect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
    this.registerNode(osc);
  }

  /**
   * Resuelve la reacción compuesta de un gol (red + clamor o lamento)
   */
  playGoal(isGoodForMe = true) {
    this.playNet();
    if (isGoodForMe) {
      this.playCheer(2.5);
      this.playVictoryFanfare();
    } else {
      this.playDisappointment(1.8);
    }
  }

  /**
   * Resuelve la reacción compuesta de un fallo
   */
  playMiss(isGoodForMe = true) {
    if (isGoodForMe) {
      this.playCheer(1.8);
    } else {
      this.playDisappointment(1.6);
    }
  }

  /**
   * Fanfarria triunfal sintetizada por osciladores
   */
  playVictoryFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + idx * 0.08;
      const dur = idx === notes.length - 1 ? 0.45 : 0.16;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.16, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
      this.registerNode(osc);
    });
  }

  /**
   * Himno/melodía procedimental de Penaltazo (sin dependencias mp3)
   */
  playPenaltazoTheme() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    this.stopActiveEffects();
    const now = this.ctx.currentTime;

    // Fanfarria arcade épica de inicio de partido
    const melody = [
      { f: 440.00, t: 0.00, d: 0.14 }, // La4
      { f: 554.37, t: 0.14, d: 0.14 }, // Do#5
      { f: 659.25, t: 0.28, d: 0.14 }, // Mi5
      { f: 880.00, t: 0.42, d: 0.35 }, // La5
      { f: 783.99, t: 0.77, d: 0.14 }, // Sol5
      { f: 880.00, t: 0.91, d: 0.55 }  // La5
    ];

    melody.forEach(({ f, t, d }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + t;

      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.20, startTime + 0.02);
      gain.gain.setValueAtTime(0.18, startTime + d - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d + 0.02);
      this.registerNode(osc);
    });
  }

  // Alias retrocompatible
  playCrowdCheer(isGoal = true) {
    if (isGoal) {
      this.playCheer();
    } else {
      this.playDisappointment();
    }
  }
}

// Exportación global
window.PenaltazoAudio = PenaltazoAudio;
window.SoundEngine = PenaltazoAudio;
window.soundEngine = new PenaltazoAudio();
