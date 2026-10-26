/**
 * Módulo de animación de resolución de penalti.
 * Controla la trayectoria del balón y de los guantes del portero en 3D/2.5D.
 */
class PenaltyAnimator {
  constructor(arenaElement, goalGrid) {
    this.arena = arenaElement;
    this.goalGrid = goalGrid;
    this.ball = document.getElementById('animated-ball');
    this.ballShadow = document.getElementById('ball-shadow');
    this.goalkeeper = document.getElementById('animated-keeper');
    this.penaltySpot = document.getElementById('penalty-spot');
    this.impactOverlay = document.getElementById('impact-overlay');
    this.bannerOverlay = document.getElementById('banner-overlay');
  }

  resetPositions() {
    // Restablecer balón al punto de penalti
    if (this.ball) {
      this.ball.style.transition = 'none';
      this.ball.style.transform = 'translate(-50%, -50%) scale(1.3) rotate(0deg)';
      this.ball.style.left = '50%';
      this.ball.style.top = '88%';
      this.ball.style.opacity = '1';
      this.ball.classList.remove('deflected', 'in-net');
    }

    if (this.ballShadow) {
      this.ballShadow.style.transition = 'none';
      this.ballShadow.style.transform = 'translate(-50%, -50%) scale(1)';
      this.ballShadow.style.left = '50%';
      this.ballShadow.style.top = '91%';
      this.ballShadow.style.opacity = '0.6';
    }

    // Restablecer portero al centro de la línea de gol
    if (this.goalkeeper) {
      this.goalkeeper.style.transition = 'none';
      this.goalkeeper.style.transform = 'translate(-50%, -50%) scale(1)';
      this.goalkeeper.style.left = '50%';
      this.goalkeeper.style.top = '48%';
      this.goalkeeper.classList.remove('diving-left', 'diving-right', 'diving-top', 'diving-bottom', 'saving', 'missed');
    }

    if (this.impactOverlay) {
      this.impactOverlay.className = 'impact-overlay hidden';
      this.impactOverlay.innerHTML = '';
    }

    if (this.bannerOverlay) {
      this.bannerOverlay.className = 'banner-overlay hidden';
      this.bannerOverlay.innerHTML = '';
    }
  }

  /**
   * Ejecuta la secuencia completa de animación
   */
  async playResolution({ shooterChoice, keeperChoice, isGoal, shooterName, onComplete }) {
    this.resetPositions();

    // 1. Silbato inicial de preparación
    if (window.soundEngine) {
      window.soundEngine.playWhistle();
    }

    await this.wait(400);

    // Calcular coordenadas destino en el contenedor del estadio (arena)
    const arenaRect = this.arena.getBoundingClientRect();

    const shooterCellEl = this.goalGrid.getCellElement(shooterChoice.row, shooterChoice.col);
    const keeperCellEl = this.goalGrid.getCellElement(keeperChoice.row, keeperChoice.col);

    const shooterCellRect = shooterCellEl.getBoundingClientRect();
    const keeperCellRect = keeperCellEl.getBoundingClientRect();

    // Coordenadas relativas en porcentajes para que sea responsive
    const targetBallX = ((shooterCellRect.left + shooterCellRect.width / 2 - arenaRect.left) / arenaRect.width) * 100;
    const targetBallY = ((shooterCellRect.top + shooterCellRect.height / 2 - arenaRect.top) / arenaRect.height) * 100;

    const targetKeeperX = ((keeperCellRect.left + keeperCellRect.width / 2 - arenaRect.left) / arenaRect.width) * 100;
    const targetKeeperY = ((keeperCellRect.top + keeperCellRect.height / 2 - arenaRect.top) / arenaRect.height) * 100;

    // 2. Comienza la carrera y el Chut
    if (window.soundEngine) {
      window.soundEngine.playKick();
    }

    // Duración del vuelo del balón y estirada del portero
    const flightDuration = 850; // ms

    // Aplicar transiciones al balón
    this.ball.style.transition = `left ${flightDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top ${flightDuration}ms cubic-bezier(0.33, 1, 0.68, 1), transform ${flightDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    this.ball.style.left = `${targetBallX}%`;
    this.ball.style.top = `${targetBallY}%`;
    const rotation = (shooterChoice.col === 0 ? -720 : (shooterChoice.col === 2 ? 720 : 540));
    this.ball.style.transform = `translate(-50%, -50%) scale(0.72) rotate(${rotation}deg)`;

    // Sombra del balón
    if (this.ballShadow) {
      this.ballShadow.style.transition = `left ${flightDuration}ms linear, top ${flightDuration}ms linear, transform ${flightDuration}ms linear, opacity ${flightDuration}ms linear`;
      this.ballShadow.style.left = `${targetBallX}%`;
      this.ballShadow.style.top = `${Math.min(targetBallY + 5, 58)}%`;
      this.ballShadow.style.transform = `translate(-50%, -50%) scale(0.4)`;
      this.ballShadow.style.opacity = '0.2';
    }

    // Portero se lanza hacia la casilla que eligió
    const keeperDuration = 780; // el portero reacciona décimas de segundo
    this.goalkeeper.style.transition = `left ${keeperDuration}ms cubic-bezier(0.22, 1, 0.36, 1), top ${keeperDuration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${keeperDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    this.goalkeeper.style.left = `${targetKeeperX}%`;
    this.goalkeeper.style.top = `${targetKeeperY}%`;

    // Rotación del portero según dirección
    let diveAngle = 0;
    if (keeperChoice.col === 0) diveAngle = -28;
    else if (keeperChoice.col === 2) diveAngle = 28;
    if (keeperChoice.row === 1) diveAngle *= 0.6; // estirada a ras de suelo

    this.goalkeeper.style.transform = `translate(-50%, -50%) scale(0.9) rotate(${diveAngle}deg)`;

    // Esperar a que el balón y portero lleguen a su destino
    await this.wait(flightDuration - 20);

    // 3. Momento del IMPACTO
    if (isGoal) {
      // ¡¡GOL!!
      if (window.soundEngine) {
        window.soundEngine.playGoal();
      }

      this.ball.classList.add('in-net');
      shooterCellEl.classList.add('net-ripple');

      // Efecto visual de gol
      this.showCelebrationBanner('¡¡GOOOOOOL!!', 'goal', `¡Gran disparo de ${shooterName || 'Tirador'}!`);
      this.triggerGoalParticles(targetBallX, targetBallY);
    } else {
      // ¡¡PARADA!!
      if (window.soundEngine) {
        window.soundEngine.playSave();
      }

      this.ball.classList.add('deflected');
      this.goalkeeper.classList.add('saving');

      // Animación de rebote del balón repelido por los guantes
      const deflectX = targetBallX + (shooterChoice.col === 0 ? 15 : (shooterChoice.col === 2 ? -15 : 0));
      const deflectY = targetBallY + 18;
      this.ball.style.transition = 'left 400ms ease-out, top 400ms ease-out, transform 400ms ease-out';
      this.ball.style.left = `${deflectX}%`;
      this.ball.style.top = `${deflectY}%`;
      this.ball.style.transform = 'translate(-50%, -50%) scale(0.65) rotate(180deg)';

      // Efecto visual de parada
      this.showCelebrationBanner('¡¡PARADÓN!!', 'save', '¡El portero leyó las intenciones!');
      this.triggerSaveFlash(targetBallX, targetBallY);
    }

    // Resaltar casillas en la cuadrícula
    this.goalGrid.revealResolution(shooterChoice, keeperChoice, isGoal);

    // Dejar tiempo para disfrutar la repetición/celebración
    await this.wait(2600);

    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  showCelebrationBanner(title, type, subtitle) {
    if (!this.bannerOverlay) return;
    this.bannerOverlay.className = `banner-overlay active ${type}`;
    this.bannerOverlay.innerHTML = `
      <div class="banner-content">
        <div class="banner-icon">${type === 'goal' ? '⚽' : '🧤'}</div>
        <div class="banner-title">${title}</div>
        <div class="banner-sub">${subtitle}</div>
      </div>
    `;
  }

  triggerGoalParticles(xPercent, yPercent) {
    if (!this.impactOverlay) return;
    this.impactOverlay.className = 'impact-overlay active';
    this.impactOverlay.innerHTML = '';

    // Crear partículas de confeti de red
    const colors = ['#22c55e', '#ffffff', '#eab308', '#38bdf8', '#10b981'];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'particle particle-goal';
      const angle = Math.random() * 2 * Math.PI;
      const distance = 40 + Math.random() * 110;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.left = `${xPercent}%`;
      p.style.top = `${yPercent}%`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = color;
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      p.style.animationDelay = `${Math.random() * 0.1}s`;

      this.impactOverlay.appendChild(p);
    }
  }

  triggerSaveFlash(xPercent, yPercent) {
    if (!this.impactOverlay) return;
    this.impactOverlay.className = 'impact-overlay active save-flash';
    this.impactOverlay.innerHTML = `
      <div class="save-burst" style="left: ${xPercent}%; top: ${yPercent}%;">
        <div class="burst-circle"></div>
        <div class="burst-icon">🧤💥</div>
      </div>
    `;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.PenaltyAnimator = PenaltyAnimator;
