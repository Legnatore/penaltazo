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
    this.shooter = document.getElementById('animated-shooter');
    this.povGloves = document.getElementById('keeper-pov-gloves');
    this.penaltySpot = document.getElementById('penalty-spot');
    this.impactOverlay = document.getElementById('impact-overlay');
    this.bannerOverlay = document.getElementById('banner-overlay');
    this.currentPerspective = 'shooter'; // 'shooter' | 'keeper'
  }

  setPerspective(perspective = 'shooter') {
    this.currentPerspective = perspective;
    if (this.arena) {
      this.arena.classList.toggle('view-keeper', perspective === 'keeper');
      this.arena.classList.toggle('view-shooter', perspective === 'shooter');
    }
    this.resetPositions();
  }

  setPovGlovesDive(row, col) {
    if (!this.povGloves || this.currentPerspective !== 'keeper') return;
    this.povGloves.className = `keeper-pov-gloves dive-r${row}-c${col}`;
  }

  resetPovGloves() {
    if (!this.povGloves || this.currentPerspective !== 'keeper') return;
    this.povGloves.className = 'keeper-pov-gloves';
  }

  resetPositions() {
    const isKeeperView = (this.currentPerspective === 'keeper');

    if (this.shooter) {
      this.shooter.classList.remove('kicking');
      this.shooter.style.transition = 'none';
    }

    if (this.povGloves) {
      this.povGloves.className = 'keeper-pov-gloves';
      this.povGloves.style.transition = 'none';
    }

    // Restablecer balón al punto de penalti
    if (this.ball) {
      this.ball.style.transition = 'none';
      this.ball.classList.remove('deflected', 'in-net');
      this.ball.style.opacity = '1';
      if (isKeeperView) {
        // En vista de portero: el balón está a los pies del tirador en el punto de penalti
        this.ball.style.left = '50%';
        this.ball.style.top = '65%';
        this.ball.style.transform = 'translate(-50%, -50%) scale(0.92) rotate(0deg)';
      } else {
        // En vista de tirador: el balón está en el punto de penalti en primer plano
        this.ball.style.left = '50%';
        this.ball.style.top = '88%';
        this.ball.style.transform = 'translate(-50%, -50%) scale(1.3) rotate(0deg)';
      }
    }

    if (this.ballShadow) {
      this.ballShadow.style.transition = 'none';
      this.ballShadow.style.left = '50%';
      this.ballShadow.style.top = isKeeperView ? '68%' : '91%';
      this.ballShadow.style.transform = isKeeperView ? 'translate(-50%, -50%) scale(0.7)' : 'translate(-50%, -50%) scale(1)';
      this.ballShadow.style.opacity = '0.6';
    }

    // Restablecer portero al centro de la línea de gol (de pie en la zona baja central)
    if (this.goalkeeper) {
      this.goalkeeper.style.transition = 'none';
      this.goalkeeper.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)';
      this.goalkeeper.style.left = '50%';
      this.goalkeeper.style.top = '70%';
      this.goalkeeper.classList.remove('diving', 'jumping', 'crouching', 'diving-left', 'diving-right', 'diving-top', 'diving-bottom', 'saving', 'missed');
    }

    if (this.impactOverlay) {
      this.impactOverlay.className = 'impact-overlay hidden';
      this.impactOverlay.innerHTML = '';
    }

    if (this.bannerOverlay) {
      this.bannerOverlay.className = 'banner-overlay hidden';
      this.bannerOverlay.innerHTML = '';
    }

    if (this.arena) {
      this.arena.classList.remove('crowd-celebrating');
    }
  }

  /**
   * Ejecuta la secuencia cinemática completa de resolución del penalti:
   * 1. Fase de Carrera y Disparo (0 a 350ms): Inicio de golpeo, kick audio y salida del balón.
   * 2. Fase de Tensión y Micro-Ralentí: Deceleración del 80% y zoom a portería si va al palo o cerca del portero.
   * 3. Fase de Impacto y Clímax: Deformación de red, screen shake en postes, flash en celdas, sonido y haptics.
   * Duración total contenida entre 1.9 y 2.1 segundos para máxima agilidad de juego.
   */
  async playResolution({ shooterChoice, keeperChoice, isGoal, isOut, isPost, shooterName, keeperName, isMyShot, isMySave, onImpact, onComplete }) {
    this.resetPositions();

    // 0. Silbato inicial de preparación
    if (window.soundEngine) {
      if (typeof window.soundEngine.stopTension === 'function') {
        window.soundEngine.stopTension(60);
      }
      window.soundEngine.playWhistle();
    }

    // Comprobar si el disparo genera máxima tensión (tiro adyacente/mismo del portero o va al poste)
    const isSameCell = (shooterChoice.row === keeperChoice.row && shooterChoice.col === keeperChoice.col);
    const isAdjacentCell = (
      Math.abs(shooterChoice.row - keeperChoice.row) <= 1 &&
      Math.abs(shooterChoice.col - keeperChoice.col) <= 1
    );
    const isTensionMoment = isSameCell || isAdjacentCell || isPost;

    // FASE 1: Carrera del tirador (0 a ~290ms)
    await this.wait(150);

    const isKeeperPOV = (this.currentPerspective === 'keeper');

    if (isKeeperPOV && this.shooter) {
      this.shooter.classList.add('kicking');
    }

    await this.wait(140);

    // Momento del impacto de la bota: audio reactivo de chut
    if (window.soundEngine) {
      window.soundEngine.playKick(1.0);
    }

    // Coordenadas relativas responsivas del estadio (arena)
    const arenaRect = this.arena.getBoundingClientRect();
    const shooterCellEl = this.goalGrid.getCellElement(shooterChoice.row, shooterChoice.col);
    const keeperCellEl = this.goalGrid.getCellElement(keeperChoice.row, keeperChoice.col);

    const shooterCellRect = shooterCellEl.getBoundingClientRect();
    const keeperCellRect = keeperCellEl.getBoundingClientRect();

    let targetBallX = ((shooterCellRect.left + shooterCellRect.width / 2 - arenaRect.left) / arenaRect.width) * 100;
    let targetBallY = ((shooterCellRect.top + shooterCellRect.height / 2 - arenaRect.top) / arenaRect.height) * 100;

    const goalStructEl = this.goalkeeper ? this.goalkeeper.parentElement : this.arena;
    const goalStructRect = goalStructEl.getBoundingClientRect();

    // Ajuste de trayectoria para palos o disparos fuera
    if (isPost) {
      const crossbarY = ((goalStructRect.top - arenaRect.top) / arenaRect.height) * 100;
      const leftPostX = ((goalStructRect.left - arenaRect.left) / arenaRect.width) * 100;
      const rightPostX = ((goalStructRect.right - arenaRect.left) / arenaRect.width) * 100;

      if (shooterChoice.row === 0 && shooterChoice.col === 1) {
        targetBallY = crossbarY;
      } else if (shooterChoice.col === 0) {
        targetBallX = leftPostX;
        if (shooterChoice.row === 0) targetBallY = crossbarY + 2;
      } else if (shooterChoice.col === 2) {
        targetBallX = rightPostX;
        if (shooterChoice.row === 0) targetBallY = crossbarY + 2;
      }
    } else if (isOut) {
      if (shooterChoice.row === 0 && shooterChoice.col === 1) {
        targetBallY -= 16;
      } else if (shooterChoice.col === 0) {
        targetBallX -= 14;
        if (shooterChoice.row === 0) targetBallY -= 10;
      } else if (shooterChoice.col === 2) {
        targetBallX += 14;
        if (shooterChoice.row === 0) targetBallY -= 10;
      }
    }

    const targetKeeperX = ((keeperCellRect.left + keeperCellRect.width / 2 - goalStructRect.left) / goalStructRect.width) * 100;
    const targetKeeperY = ((keeperCellRect.top + keeperCellRect.height / 2 - goalStructRect.top) / goalStructRect.height) * 100;

    const startX = 50;
    const startY = isKeeperPOV ? 65 : 72;
    const rotation = (shooterChoice.col === 0 ? -720 : (shooterChoice.col === 2 ? 720 : 540));
    const finalScale = isKeeperPOV ? 1.65 : 0.72;

    // FASE 2: Trayectoria fluida y estirada sincronizada del portero (~520ms)
    const flightDuration = 520;
    this.ball.style.transition = `left ${flightDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1), top ${flightDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1), transform ${flightDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
    this.ball.style.left = `${targetBallX}%`;
    this.ball.style.top = `${targetBallY}%`;
    this.ball.style.transform = `translate(-50%, -50%) scale(${finalScale}) rotate(${rotation}deg)`;

    if (this.ballShadow) {
      this.ballShadow.style.transition = `left ${flightDuration}ms linear, top ${flightDuration}ms linear, transform ${flightDuration}ms linear, opacity ${flightDuration}ms linear`;
      this.ballShadow.style.left = `${targetBallX}%`;
      this.ballShadow.style.top = `${Math.min(targetBallY + (isKeeperPOV ? 8 : 5), isKeeperPOV ? 76 : 58)}%`;
      this.ballShadow.style.transform = `translate(-50%, -50%) scale(${isKeeperPOV ? 1.1 : 0.4})`;
    }

    // Estirada sincronizada del portero hacia su casilla designada
    if (isKeeperPOV) {
      this.setPovGlovesDive(keeperChoice.row, keeperChoice.col);
    } else if (this.goalkeeper) {
      let diveAngle = 0;
      this.goalkeeper.classList.remove('diving', 'jumping', 'crouching');

      if (keeperChoice.col === 0) {
        diveAngle = keeperChoice.row === 0 ? -48 : -68;
        this.goalkeeper.classList.add('diving');
      } else if (keeperChoice.col === 2) {
        diveAngle = keeperChoice.row === 0 ? 48 : 68;
        this.goalkeeper.classList.add('diving');
      } else if (keeperChoice.row === 0 && keeperChoice.col === 1) {
        diveAngle = 0;
        this.goalkeeper.classList.add('jumping');
      } else {
        diveAngle = 0;
        this.goalkeeper.classList.add('crouching');
      }

      const kDur = flightDuration;
      this.goalkeeper.style.transition = `left ${kDur}ms cubic-bezier(0.22, 1, 0.36, 1), top ${kDur}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${kDur}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      this.goalkeeper.style.left = `${targetKeeperX}%`;
      this.goalkeeper.style.top = `${targetKeeperY}%`;
      this.goalkeeper.style.transform = `translate(-50%, -50%) scale(0.92) rotate(${diveAngle}deg)`;
    }

    await this.wait(flightDuration - 20);

    // FASE 3: Impacto, Clímax y Feedback Háptico
    // Feedback háptico en móviles compatibles
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (isPost) {
          navigator.vibrate([20, 35, 45]);
        } else if (isGoal) {
          navigator.vibrate([35]);
        } else {
          navigator.vibrate([40]);
        }
      } catch (e) {}
    }

    if (isKeeperPOV) {
      if (isGoal) {
        if (window.soundEngine) {
          window.soundEngine.playNet();
          window.soundEngine.playDisappointment();
        }
        this.ball.classList.add('in-net');
        shooterCellEl.classList.add('net-deform', 'net-ripple');
        this.showCelebrationBanner('¡¡GOOOOOOL!!', 'goal', `¡Gran disparo de ${shooterName || 'el rival'}!`, false);
        this.triggerGoalParticles(targetBallX, targetBallY);
      } else if (isPost) {
        if (window.soundEngine) {
          window.soundEngine.playPost();
          window.soundEngine.playCheer(1.6);
        }
        if (goalStructEl) {
          goalStructEl.classList.add('screen-shake-post');
          setTimeout(() => goalStructEl.classList.remove('screen-shake-post'), 350);
        }
        this.ball.classList.add('deflected');
        const reboundX = targetBallX + (shooterChoice.col === 0 ? -12 : (shooterChoice.col === 2 ? 12 : 0));
        const reboundY = shooterChoice.row === 0 && shooterChoice.col === 1 ? targetBallY - 8 : targetBallY + 14;
        this.ball.style.transition = 'left 360ms ease-out, top 360ms ease-out, transform 360ms ease-out';
        this.ball.style.left = `${reboundX}%`;
        this.ball.style.top = `${reboundY}%`;
        this.ball.style.transform = 'translate(-50%, -50%) scale(1.2) rotate(360deg)';

        const isCrossbar = shooterChoice.row === 0 && shooterChoice.col === 1;
        const postTitle = isCrossbar ? '¡¡AL LARGUERO!!' : '¡¡AL PALOOO!!';
        this.showCelebrationBanner(postTitle, 'save', `¡El disparo de ${shooterName || 'el rival'} reventó ${isCrossbar ? 'el larguero' : 'el palo'}!`, true);
        this.triggerSaveFlash(targetBallX, targetBallY);
      } else if (isOut) {
        if (window.soundEngine) {
          window.soundEngine.playDisappointment();
        }
        this.ball.style.transition = 'transform 340ms ease-out, opacity 340ms ease-out';
        this.ball.style.transform = 'translate(-50%, -50%) scale(2.2) rotate(900deg)';
        this.ball.style.opacity = '0';
        this.showCelebrationBanner('¡¡FUERAAA!!', 'save', `¡El disparo de ${shooterName || 'el rival'} se marchó fuera!`, true);
      } else {
        // ¡¡PARADA EN 1ª PERSONA!!
        if (window.soundEngine) {
          window.soundEngine.playSave();
          window.soundEngine.playCheer(2.0);
        }
        if (this.povGloves) {
          this.povGloves.classList.add('saving-impact');
        }
        keeperCellEl.classList.add('save-flash-cell');
        this.ball.classList.add('deflected');
        const deflectX = targetBallX + (shooterChoice.col === 0 ? 12 : (shooterChoice.col === 2 ? -12 : 0));
        const deflectY = targetBallY + 16;
        this.ball.style.transition = 'left 380ms ease-out, top 380ms ease-out, transform 380ms ease-out';
        this.ball.style.left = `${deflectX}%`;
        this.ball.style.top = `${deflectY}%`;
        this.ball.style.transform = 'translate(-50%, -50%) scale(1.15) rotate(180deg)';

        this.showCelebrationBanner('¡¡PARADÓN!!', 'save', '¡Adivinaste la intención y blocaste el penalti!', true);
        this.triggerSaveFlash(targetBallX, targetBallY);
      }
    } else {
      // PERSPECTIVA DE TIRADOR
      if (isGoal) {
        if (window.soundEngine) {
          window.soundEngine.playNet();
          if (isMyShot) {
            window.soundEngine.playCheer();
            window.soundEngine.playVictoryFanfare();
          } else {
            window.soundEngine.playDisappointment();
          }
        }

        this.ball.classList.add('in-net');
        shooterCellEl.classList.add('net-deform', 'net-ripple');

        const goalMsg = isMyShot
          ? '¡Qué gran disparo acabas de marcar!'
          : `¡Gran disparo de ${shooterName || 'el rival'}!`;
        this.showCelebrationBanner('¡¡GOOOOOOL!!', 'goal', goalMsg, Boolean(isMyShot));
        this.triggerGoalParticles(targetBallX, targetBallY);
      } else if (isPost) {
        if (window.soundEngine) {
          window.soundEngine.playPost();
          if (isMySave) {
            window.soundEngine.playCheer(1.6);
          } else {
            window.soundEngine.playDisappointment(1.8);
          }
        }

        if (goalStructEl) {
          goalStructEl.classList.add('screen-shake-post');
          setTimeout(() => goalStructEl.classList.remove('screen-shake-post'), 350);
        }

        this.ball.classList.add('deflected');
        const reboundX = targetBallX + (shooterChoice.col === 0 ? -16 : (shooterChoice.col === 2 ? 16 : (Math.random() < 0.5 ? -12 : 12)));
        const reboundY = shooterChoice.row === 0 && shooterChoice.col === 1 ? targetBallY - 12 : targetBallY + 14;
        this.ball.style.transition = 'left 360ms ease-out, top 360ms ease-out, transform 360ms ease-out';
        this.ball.style.left = `${reboundX}%`;
        this.ball.style.top = `${reboundY}%`;
        this.ball.style.transform = 'translate(-50%, -50%) scale(0.58) rotate(540deg)';

        const isCrossbar = shooterChoice.row === 0 && shooterChoice.col === 1;
        const postTitle = isCrossbar ? '¡¡AL LARGUERO!!' : '¡¡AL PALOOO!!';
        const postMsg = isMyShot
          ? `¡Tu disparo se estrelló contra ${isCrossbar ? 'el larguero' : 'el poste'} y salió repelido!`
          : `¡El disparo de ${shooterName || 'el rival'} reventó ${isCrossbar ? 'el larguero' : 'el palo'}!`;
        this.showCelebrationBanner(postTitle, 'save', postMsg, Boolean(isMySave));
        this.triggerSaveFlash(targetBallX, targetBallY);
      } else if (isOut) {
        if (window.soundEngine) {
          if (isMySave) {
            window.soundEngine.playCheer(1.6);
          } else {
            window.soundEngine.playDisappointment(1.8);
          }
        }

        this.ball.style.transition = 'transform 340ms ease-out, opacity 340ms ease-out';
        this.ball.style.transform = 'translate(-50%, -50%) scale(0.45) rotate(900deg)';
        this.ball.style.opacity = '0.5';

        const outMsg = isMyShot
          ? '¡Buscaste ajustar demasiado y el balón se marchó fuera!'
          : `¡El disparo de ${shooterName || 'el rival'} se ha ido directamente fuera!`;
        this.showCelebrationBanner('¡¡FUERAAA!!', 'save', outMsg, Boolean(isMySave));
      } else {
        // PARADA DEL PORTERO
        if (window.soundEngine) {
          window.soundEngine.playSave();
          if (isMySave) {
            window.soundEngine.playCheer(2.0);
          } else {
            window.soundEngine.playDisappointment(1.8);
          }
        }

        keeperCellEl.classList.add('save-flash-cell');
        this.ball.classList.add('deflected');
        this.goalkeeper.classList.add('saving');

        const deflectX = targetBallX + (shooterChoice.col === 0 ? 15 : (shooterChoice.col === 2 ? -15 : 0));
        const deflectY = targetBallY + 18;
        this.ball.style.transition = 'left 380ms ease-out, top 380ms ease-out, transform 380ms ease-out';
        this.ball.style.left = `${deflectX}%`;
        this.ball.style.top = `${deflectY}%`;
        this.ball.style.transform = 'translate(-50%, -50%) scale(0.65) rotate(180deg)';

        const saveMsg = isMySave
          ? '¡Adivinaste la intención y detuviste el penalti!'
          : `¡${keeperName || 'El portero'} adivinó la dirección del tiro!`;
        this.showCelebrationBanner('¡¡PARADÓN!!', 'save', saveMsg, Boolean(isMySave));
        this.triggerSaveFlash(targetBallX, targetBallY);
      }
    }

    // Resaltar casillas y actualizar marcador exactamente al impacto
    this.goalGrid.revealResolution(shooterChoice, keeperChoice, isGoal);
    if (typeof onImpact === 'function') {
      onImpact();
    }

    // Clímax y celebración: 950ms (mantiene la duración total de la secuencia en ~1.95 a 2.05 segundos)
    await this.wait(950);

    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  showCelebrationBanner(title, type, subtitle, isFavorable = true) {
    if (this.arena) {
      this.arena.classList.add('crowd-celebrating');
    }
    if (!this.bannerOverlay) return;
    const outcomeClass = isFavorable ? 'banner-favorable' : 'banner-unfavorable';
    this.bannerOverlay.className = `banner-overlay active ${type} ${outcomeClass}`;
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
