/**
 * Componente del marcador visual de la tanda de penaltis.
 * Muestra los 5 intentos de cada jugador, goles en verde, paradas en rojo,
 * y se expande dinámicamente en muerte súbita.
 */
class Scoreboard {
  constructor(containerElement) {
    this.container = containerElement;
    this.p1ScoreEl = document.getElementById('p1-score');
    this.p2ScoreEl = document.getElementById('p2-score');
    this.p1NameEl = document.getElementById('p1-name');
    this.p2NameEl = document.getElementById('p2-name');
    this.p1RoleEl = document.getElementById('p1-role-badge');
    this.p2RoleEl = document.getElementById('p2-role-badge');
    this.p1DotsContainer = document.getElementById('p1-dots');
    this.p2DotsContainer = document.getElementById('p2-dots');
    this.roundInfoEl = document.getElementById('round-info-text');
    this.suddenDeathBanner = document.getElementById('sudden-death-banner');
  }

  updatePlayerNames(p1Name, p2Name) {
    if (this.p1NameEl) this.p1NameEl.textContent = p1Name || 'Jugador 1';
    if (this.p2NameEl) this.p2NameEl.textContent = p2Name || 'Jugador 2';
  }

  render({
    scores = { P1: 0, P2: 0 },
    history = { P1: [], P2: [] },
    currentTurnIndex = 0,
    shooterRole = 'P1',
    keeperRole = 'P2',
    isSuddenDeath = false,
    suddenDeathRound = 0,
    myRole = 'P1'
  }) {
    // 1. Actualizar números del marcador
    if (this.p1ScoreEl) this.p1ScoreEl.textContent = scores.P1;
    if (this.p2ScoreEl) this.p2ScoreEl.textContent = scores.P2;

    // 2. Actualizar insignias de rol de cada jugador
    if (this.p1RoleEl) {
      const isShooter = shooterRole === 'P1';
      this.p1RoleEl.className = `role-badge ${isShooter ? 'role-shooter' : 'role-keeper'}`;
      this.p1RoleEl.innerHTML = isShooter ? '⚽ Tirador' : '🧤 Portero';
    }

    if (this.p2RoleEl) {
      const isShooter = shooterRole === 'P2';
      this.p2RoleEl.className = `role-badge ${isShooter ? 'role-shooter' : 'role-keeper'}`;
      this.p2RoleEl.innerHTML = isShooter ? '⚽ Tirador' : '🧤 Portero';
    }

    // 3. Determinar número total de intentos a mostrar (5 normales + rondas de muerte súbita)
    const baseAttempts = 5;
    const totalSlots = Math.max(
      baseAttempts,
      history.P1.length + (shooterRole === 'P1' ? 1 : 0),
      history.P2.length + (shooterRole === 'P2' ? 1 : 0)
    );

    // 4. Renderizar puntos de P1 y P2
    this.renderDots(this.p1DotsContainer, history.P1, totalSlots, shooterRole === 'P1');
    this.renderDots(this.p2DotsContainer, history.P2, totalSlots, shooterRole === 'P2');

    // 5. Banner de muerte súbita
    if (this.suddenDeathBanner) {
      if (isSuddenDeath) {
        this.suddenDeathBanner.classList.remove('hidden');
        this.suddenDeathBanner.innerHTML = `
          <span class="sd-flame">🔥</span>
          <strong>¡MUERTE SÚBITA!</strong> Ronda de desempate #${suddenDeathRound || 1}
        `;
      } else {
        this.suddenDeathBanner.classList.add('hidden');
      }
    }

    // 6. Texto de información del turno
    if (this.roundInfoEl) {
      if (isSuddenDeath) {
        const roundNum = Math.floor(currentTurnIndex / 2) + 1;
        this.roundInfoEl.innerHTML = `Muerte Súbita - Tiro #${currentTurnIndex + 1}`;
      } else {
        const roundNum = Math.floor(currentTurnIndex / 2) + 1;
        this.roundInfoEl.innerHTML = `Ronda ${roundNum} de 5 &bull; Penalti #${currentTurnIndex + 1}`;
      }
    }
  }

  renderDots(container, historyArray, totalSlots, isCurrentShooter) {
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < totalSlots; i++) {
      const dot = document.createElement('div');
      dot.className = 'penalty-dot';

      if (i < historyArray.length) {
        const result = historyArray[i];
        if (result.isGoal) {
          dot.classList.add('dot-goal');
          dot.innerHTML = '⚽';
          dot.setAttribute('title', `Tiro ${i + 1}: ¡Gol!`);
        } else {
          dot.classList.add('dot-saved');
          dot.innerHTML = '✕';
          dot.setAttribute('title', `Tiro ${i + 1}: ¡Parada/Fallo!`);
        }
      } else if (i === historyArray.length && isCurrentShooter) {
        dot.classList.add('dot-active');
        dot.innerHTML = '•';
        dot.setAttribute('title', `Tiro ${i + 1}: En curso`);
      } else {
        dot.classList.add('dot-pending');
        dot.innerHTML = '';
        dot.setAttribute('title', `Tiro ${i + 1}: Pendiente`);
      }

      // Si es de muerte súbita (más de 5), añadir indicador especial
      if (i >= 5) {
        dot.classList.add('dot-sudden-death');
      }

      container.appendChild(dot);
    }
  }
}

window.Scoreboard = Scoreboard;
