/**
 * Controlador principal de la aplicación.
 * Conecta UI, Grid, Animador, Marcador y Red.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Elementos de pantalla
  const lobbyScreen = document.getElementById('lobby-screen');
  const waitingScreen = document.getElementById('waiting-screen');
  const gameScreen = document.getElementById('game-screen');
  const gameOverModal = document.getElementById('game-over-modal');

  // Elementos del lobby
  const playerNameInput = document.getElementById('player-name-input');
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomInput = document.getElementById('join-room-input');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const playAiBtn = document.getElementById('play-ai-btn');

  // Elementos de sala de espera
  const waitingRoomCode = document.getElementById('waiting-room-code');
  const shareLinkInput = document.getElementById('share-link-input');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const copyToast = document.getElementById('copy-toast');
  const qrCanvas = document.getElementById('qr-canvas');
  const openSecondTabBtn = document.getElementById('open-second-tab-btn');
  const localIpsContainer = document.getElementById('local-ips-container');

  // Elementos del juego
  const goalGridContainer = document.getElementById('goal-grid');
  const stadiumArena = document.getElementById('stadium-arena');
  const confirmChoiceBtn = document.getElementById('confirm-choice-btn');
  const selectedZoneLabel = document.getElementById('selected-zone-label');
  const rivalStatusBadge = document.getElementById('rival-status-badge');
  const myStatusBadge = document.getElementById('my-status-badge');
  const roleInstructions = document.getElementById('role-instructions');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const headerRoomBadge = document.getElementById('header-room-badge');

  // Elementos de fin de juego
  const gameOverTitle = document.getElementById('game-over-title');
  const gameOverSubtitle = document.getElementById('game-over-subtitle');
  const gameOverScores = document.getElementById('game-over-scores');
  const rematchBtn = document.getElementById('rematch-btn');
  const rematchStatus = document.getElementById('rematch-status');
  const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

  // Instancias de módulos
  const network = new NetworkManager();
  const scoreboard = new Scoreboard();
  let goalGrid = null;
  let animator = null;

  // Estado local del cliente
  let myRole = 'P1'; // 'P1' | 'P2' | 'spectator'
  let currentShooterRole = 'P1';
  let currentKeeperRole = 'P2';
  let mySelectedCell = null;
  let hasConfirmedChoice = false;
  let isResolvingTurn = false;
  let serverLocalIps = [];

  // Inicializar Grid y Animador
  goalGrid = new GoalGrid(goalGridContainer, (row, col) => {
    mySelectedCell = { row, col };
    updateConfirmButton();
  });

  animator = new PenaltyAnimator(stadiumArena, goalGrid);

  // Obtener IPs locales del servidor para conexiones por Wi-Fi
  fetch('/api/info')
    .then(r => r.json())
    .then(data => {
      serverLocalIps = data.localIps || [];
    })
    .catch(() => {});

  // Comprobar parámetros en la URL (?room=XYZ)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    joinRoomInput.value = roomParam.toUpperCase();
    showToast(`Sala detectada: ${roomParam.toUpperCase()}. Introduce tu nombre y únete.`);
  }

  // --- GESTIÓN DE PANTALLAS ---
  function showScreen(screen) {
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverModal.classList.add('hidden');

    screen.classList.remove('hidden');
  }

  // --- AUDIO TOGGLE ---
  soundToggleBtn.addEventListener('click', () => {
    const isMuted = window.soundEngine.toggleMute();
    soundToggleBtn.innerHTML = isMuted ? '🔇' : '🔊';
    soundToggleBtn.setAttribute('title', isMuted ? 'Sonido desactivado' : 'Sonido activado');
  });

  // Habilitar audio al primer toque/clic
  document.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.init();
  }, { once: true });

  // --- EVENTOS DEL LOBBY ---
  createRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || 'Jugador 1';
    network.initMultiplayer();
    network.joinRoom(null, name);
  });

  joinRoomBtn.addEventListener('click', () => {
    const code = joinRoomInput.value.trim().toUpperCase();
    if (!code) {
      alert('Por favor introduce un código de sala válido.');
      return;
    }
    const name = playerNameInput.value.trim() || 'Jugador 2';
    network.initMultiplayer();
    network.joinRoom(code, name);
  });

  playAiBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || 'Jugador';
    network.initAIMode('SOLO-CPU', name);
  });

  // --- SALA DE ESPERA / COMPARTIR ---
  function setupWaitingRoom(roomId) {
    showScreen(waitingScreen);
    waitingRoomCode.textContent = roomId;
    headerRoomBadge.textContent = `Sala: ${roomId}`;
    headerRoomBadge.classList.remove('hidden');

    // Construir URL compartible
    let baseUrl = window.location.origin;
    // Si tenemos una IP local detectada y estamos en localhost, ofrecer la IP local
    let shareUrl = `${baseUrl}/?room=${encodeURIComponent(roomId)}`;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (serverLocalIps.length > 0) {
        shareUrl = `http://${serverLocalIps[0]}:3000/?room=${encodeURIComponent(roomId)}`;
      }
    }

    shareLinkInput.value = shareUrl;

    // Renderizar código QR
    if (window.renderQRCode && qrCanvas) {
      window.renderQRCode(qrCanvas, shareUrl, 160);
    }

    // Mostrar lista de IPs si existen
    if (localIpsContainer && serverLocalIps.length > 0) {
      localIpsContainer.innerHTML = `
        <span class="wifi-hint">Para jugar desde tu móvil en la misma Wi-Fi:</span>
        <code class="ip-code">${shareUrl}</code>
      `;
    }

    // Botón de abrir en otra pestaña para pruebas rápidas
    openSecondTabBtn.onclick = () => {
      window.open(`/?room=${encodeURIComponent(roomId)}`, '_blank');
    };
  }

  copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      showToast('¡Enlace de invitación copiado al portapapeles!');
    }).catch(() => {
      document.execCommand('copy');
      showToast('¡Enlace copiado!');
    });
  });

  function showToast(msg) {
    copyToast.textContent = msg;
    copyToast.classList.add('visible');
    setTimeout(() => {
      copyToast.classList.remove('visible');
    }, 3000);
  }

  // --- INTERACCIÓN CON LA CUADRÍCULA ---
  function updateConfirmButton() {
    if (mySelectedCell && !hasConfirmedChoice && !isResolvingTurn) {
      confirmChoiceBtn.removeAttribute('disabled');
      const rowName = mySelectedCell.row === 0 ? 'Arriba' : 'Raso';
      const colName = mySelectedCell.col === 0 ? 'Izquierda' : (mySelectedCell.col === 1 ? 'Centro' : 'Derecha');
      selectedZoneLabel.textContent = `Zona elegida: ${rowName} - ${colName}`;
    } else {
      confirmChoiceBtn.setAttribute('disabled', 'true');
      if (!mySelectedCell) {
        selectedZoneLabel.textContent = 'Haz clic en una de las 6 zonas de la portería';
      }
    }
  }

  confirmChoiceBtn.addEventListener('click', () => {
    if (!mySelectedCell || hasConfirmedChoice || isResolvingTurn) return;

    hasConfirmedChoice = true;
    confirmChoiceBtn.setAttribute('disabled', 'true');
    goalGrid.disable();

    // Actualizar estado propio
    myStatusBadge.className = 'status-badge ready';
    myStatusBadge.innerHTML = '✅ ¡Selección confirmada!';

    if (window.soundEngine) {
      window.soundEngine.playSelect();
    }

    // Enviar elección al servidor
    network.submitChoice(mySelectedCell.row, mySelectedCell.col);
  });

  // --- ACTUALIZACIÓN DE INTERFAZ DEL JUEGO ---
  function prepareTurn({ turnIndex, shooterRole, keeperRole, isSuddenDeath, suddenDeathRound, roomState }) {
    isResolvingTurn = false;
    hasConfirmedChoice = false;
    mySelectedCell = null;
    currentShooterRole = shooterRole;
    currentKeeperRole = keeperRole;

    animator.resetPositions();
    goalGrid.clearSelection();

    // Determinar si soy el tirador o el portero
    const amIShooter = (myRole === shooterRole);
    const amIKeeper = (myRole === keeperRole);

    // Habilitar la portería según rol
    if (amIShooter) {
      goalGrid.enable('shooter');
      roleInstructions.innerHTML = `
        <div class="role-title shooter">⚽ ERES EL TIRADOR</div>
        <p class="role-desc">Elige en secreto a cuál de las 6 zonas quieres disparar.</p>
      `;
    } else if (amIKeeper) {
      goalGrid.enable('keeper');
      roleInstructions.innerHTML = `
        <div class="role-title keeper">🧤 ERES EL PORTERO</div>
        <p class="role-desc">Adivina a qué zona se lanzará el tiro para atraparlo.</p>
      `;
    } else {
      goalGrid.disable();
      roleInstructions.innerHTML = `
        <div class="role-title spectator">👀 MODO ESPECTADOR</div>
        <p class="role-desc">Observando la tanda de penaltis en vivo.</p>
      `;
    }

    // Reiniciar badges de estado
    myStatusBadge.className = 'status-badge waiting';
    myStatusBadge.innerHTML = '⏳ Esperando tu elección...';

    rivalStatusBadge.className = 'status-badge waiting';
    rivalStatusBadge.innerHTML = '⏳ Rival pensando...';

    selectedZoneLabel.textContent = 'Haz clic en una de las 6 zonas de la portería';
    confirmChoiceBtn.setAttribute('disabled', 'true');

    // Actualizar nombres en el marcador
    if (roomState && roomState.players) {
      const p1 = roomState.players.find(p => p.role === 'P1');
      const p2 = roomState.players.find(p => p.role === 'P2');
      scoreboard.updatePlayerNames(
        p1 ? (p1.role === myRole ? `${p1.name} (Tú)` : p1.name) : 'Jugador 1',
        p2 ? (p2.role === myRole ? `${p2.name} (Tú)` : p2.name) : 'Jugador 2'
      );
    }

    // Renderizar marcador
    scoreboard.render({
      scores: roomState ? roomState.scores : { P1: 0, P2: 0 },
      history: roomState ? roomState.history : { P1: [], P2: [] },
      currentTurnIndex: turnIndex,
      shooterRole,
      keeperRole,
      isSuddenDeath,
      suddenDeathRound,
      myRole
    });
  }

  // --- EVENTOS DE RED ---
  network.on('joined_room', ({ roomId, role, roomState }) => {
    myRole = role;
    headerRoomBadge.textContent = `Sala: ${roomId}`;
    headerRoomBadge.classList.remove('hidden');

    if (roomState.state === 'waiting' && myRole === 'P1') {
      setupWaitingRoom(roomId);
    } else {
      showScreen(gameScreen);
    }
  });

  network.on('room_update', (roomState) => {
    if (roomState.players.length >= 2 && roomState.state === 'waiting') {
      // Ambos jugadores están conectados
      showToast('¡Oponente conectado! Preparando el terreno de juego...');
    }
  });

  network.on('game_started', (data) => {
    showScreen(gameScreen);
    prepareTurn(data);
  });

  network.on('choice_confirmed', ({ role }) => {
    if (role === myRole) {
      myStatusBadge.className = 'status-badge ready';
      myStatusBadge.innerHTML = '✅ ¡Tu elección está bloqueada!';
    } else {
      rivalStatusBadge.className = 'status-badge ready';
      rivalStatusBadge.innerHTML = '✅ ¡El rival ya ha elegido!';
    }
  });

  network.on('turn_resolved', (data) => {
    isResolvingTurn = true;
    goalGrid.disable();
    confirmChoiceBtn.setAttribute('disabled', 'true');

    myStatusBadge.className = 'status-badge resolving';
    myStatusBadge.innerHTML = '⚡ ¡Resolviendo penalti!';
    rivalStatusBadge.className = 'status-badge resolving';
    rivalStatusBadge.innerHTML = '⚡ ¡Resolviendo penalti!';

    const shooterName = data.shooterRole === myRole ? 'tu disparo' : 'el disparo rival';

    // Ejecutar la animación visual (balón y guantes)
    animator.playResolution({
      shooterChoice: data.shooterChoice,
      keeperChoice: data.keeperChoice,
      isGoal: data.isGoal,
      shooterName,
      onComplete: () => {
        // Actualizar el marcador tras finalizar la animación
        scoreboard.render({
          scores: data.scores,
          history: data.history,
          currentTurnIndex: data.nextTurnIndex,
          shooterRole: data.shooterRole,
          keeperRole: data.keeperRole,
          isSuddenDeath: data.nextIsSuddenDeath,
          suddenDeathRound: data.nextSuddenDeathRound,
          myRole
        });

        if (data.gameOver) {
          showGameOverScreen(data);
        }
      }
    });
  });

  network.on('next_turn_ready', (data) => {
    prepareTurn(data);
  });

  network.on('player_left', ({ role, name }) => {
    showToast(`⚠️ ${name || 'El oponente'} se ha desconectado.`);
    rivalStatusBadge.className = 'status-badge disconnected';
    rivalStatusBadge.innerHTML = '❌ Rival desconectado';
  });

  // --- FIN DE PARTIDA & REVANCHA ---
  function showGameOverScreen(data) {
    setTimeout(() => {
      gameOverModal.classList.remove('hidden');

      const iWon = (data.winner === myRole);
      const isSpectator = (myRole === 'spectator');

      if (isSpectator) {
        gameOverTitle.textContent = `🏆 ¡${data.winner === 'P1' ? 'Jugador 1' : 'Jugador 2'} es el Campeón!`;
        gameOverSubtitle.textContent = 'Partidazo resuelto en la tanda.';
      } else if (iWon) {
        gameOverTitle.innerHTML = '🏆 ¡¡HAS GANADO LA TANDA!!';
        gameOverTitle.className = 'game-over-title victory';
        gameOverSubtitle.textContent = '¡Precisión milimétrica y reflejos felinos!';
        if (window.soundEngine) window.soundEngine.playCrowdCheer(true);
      } else {
        gameOverTitle.innerHTML = '💔 DERROTA EN LOS PENALTIS';
        gameOverTitle.className = 'game-over-title defeat';
        gameOverSubtitle.textContent = 'Esta vez la suerte cayó del lado del rival.';
      }

      gameOverScores.innerHTML = `
        <div class="final-score-box">
          <div class="score-team">
            <span class="team-label">${myRole === 'P1' ? 'Tú (P1)' : 'Jugador 1'}</span>
            <span class="team-score">${data.scores.P1}</span>
          </div>
          <div class="score-vs">-</div>
          <div class="score-team">
            <span class="team-score">${data.scores.P2}</span>
            <span class="team-label">${myRole === 'P2' ? 'Tú (P2)' : 'Jugador 2'}</span>
          </div>
        </div>
      `;

      rematchStatus.textContent = '';
      rematchBtn.removeAttribute('disabled');
      rematchBtn.textContent = 'Pedir Revancha 🔄';
    }, 1200);
  }

  rematchBtn.addEventListener('click', () => {
    rematchBtn.setAttribute('disabled', 'true');
    rematchBtn.textContent = 'Esperando al rival...';
    rematchStatus.textContent = 'Has solicitado la revancha.';
    network.requestRematch();
  });

  network.on('rematch_status', ({ votes }) => {
    if (votes.includes(myRole === 'P1' ? 'P2' : 'P1')) {
      rematchStatus.textContent = '¡El rival quiere la revancha!';
    }
  });

  backToLobbyBtn.addEventListener('click', () => {
    window.location.href = window.location.pathname;
  });
});
