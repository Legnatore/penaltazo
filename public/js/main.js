/**
 * Controlador principal de ¡PENALTAZO!
 * Conecta UI, Grid, Animador, Marcador, Red y el Sistema de Torneos Eliminatorios.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Elementos de pantalla
  const lobbyScreen = document.getElementById('lobby-screen');
  const waitingScreen = document.getElementById('waiting-screen');
  const tournamentLobbyScreen = document.getElementById('tournament-lobby-screen');
  const tournamentBracketScreen = document.getElementById('tournament-bracket-screen');
  const gameScreen = document.getElementById('game-screen');

  // Modales
  const gameOverModal = document.getElementById('game-over-modal');
  const tourneyCreateModal = document.getElementById('tourney-create-modal');
  const tourneyChampionModal = document.getElementById('tournament-champion-modal');

  // Elementos del lobby principal
  const playerNameInput = document.getElementById('player-name-input');
  const createRoomBtn = document.getElementById('create-room-btn');
  const openTourneyModalBtn = document.getElementById('open-tourney-modal-btn');
  const joinRoomInput = document.getElementById('join-room-input');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const playAiBtn = document.getElementById('play-ai-btn');

  // Elementos del modal de creación de torneo
  const tourneyNameInput = document.getElementById('tourney-name-input');
  const confirmCreateTourneyBtn = document.getElementById('confirm-create-tourney-btn');
  const cancelCreateTourneyBtn = document.getElementById('cancel-create-tourney-btn');

  // Elementos de sala de espera 1v1
  const waitingRoomCode = document.getElementById('waiting-room-code');
  const shareLinkInput = document.getElementById('share-link-input');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const copyToast = document.getElementById('copy-toast');
  const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
  const shareTelegramBtn = document.getElementById('share-telegram-btn');
  const shareTwitterBtn = document.getElementById('share-twitter-btn');
  const shareEmailBtn = document.getElementById('share-email-btn');
  const shareNativeBtn = document.getElementById('share-native-btn');
  const openSecondTabBtn = document.getElementById('open-second-tab-btn');
  const localIpsContainer = document.getElementById('local-ips-container');

  // Elementos del juego (Estadio de penaltis)
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
  const returnBracketBtn = document.getElementById('return-bracket-btn');
  const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

  // Elementos adicionales de navegación de torneo
  const tourneyLeaveBtn = document.getElementById('tourney-leave-btn');
  const bracketBackMenuBtn = document.getElementById('bracket-back-menu-btn');

  // Instancias de módulos
  const network = new NetworkManager();
  const scoreboard = new Scoreboard();
  let goalGrid = null;
  let animator = null;
  let tournamentView = null;

  // Estado local del cliente
  let myRole = 'P1'; // 'P1' | 'P2' | 'spectator'
  let playerNames = { P1: 'Jugador 1', P2: 'Jugador 2' };
  let lastScores = { P1: 0, P2: 0 };
  let lastHistory = { P1: [], P2: [] };
  let currentPenaltiesPerPlayer = 5;
  let currentShooterRole = 'P1';
  let currentKeeperRole = 'P2';
  let mySelectedCell = null;
  let hasConfirmedChoice = false;
  let isResolvingTurn = false;
  let serverLocalIps = [];
  let isInTournament = false;
  let activeTournament = null;
  let myUserId = null;

  // Inicializar Grid y Animador
  goalGrid = new GoalGrid(goalGridContainer, (row, col) => {
    if (hasConfirmedChoice || isResolvingTurn) return;
    mySelectedCell = { row, col };
    hasConfirmedChoice = true;
    goalGrid.disable();

    const rowName = row === 0 ? 'Arriba' : 'Raso';
    const colName = col === 0 ? 'Izquierda' : (col === 1 ? 'Centro' : 'Derecha');
    selectedZoneLabel.textContent = `Zona seleccionada: ${rowName} - ${colName}`;

    myStatusBadge.className = 'status-badge ready';
    myStatusBadge.innerHTML = '✅ ¡Elección enviada!';

    network.submitChoice(row, col);
  });

  animator = new PenaltyAnimator(stadiumArena, goalGrid);

  // Inicializar Gestor de Vistas de Torneo
  tournamentView = new TournamentView({
    onStartTournament: (tournamentId) => {
      network.startTournament(tournamentId);
    },
    onEnterMatch: (tournamentId, roundIndex, matchIndex) => {
      network.enterTournamentMatch(tournamentId, roundIndex, matchIndex);
    },
    onBackToLobby: () => {
      window.location.href = window.location.pathname;
    }
  });

  // Obtener IPs locales del servidor para conexiones por Wi-Fi
  fetch('/api/info')
    .then(r => r.json())
    .then(data => {
      serverLocalIps = data.localIps || [];
    })
    .catch(() => {});

  // Comprobar parámetros en la URL (?room=XYZ o ?tournament=COPA-XYZ)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const tournamentParam = urlParams.get('tournament');
  const directInviteBanner = document.getElementById('direct-invite-banner');
  const inviteBadgeTitle = document.getElementById('invite-badge-title');
  const inviteBadgeDesc = document.getElementById('invite-badge-desc');
  const directJoinBtn = document.getElementById('direct-join-btn');
  const lobbyFormatGroup = document.getElementById('lobby-format-group');

  // Guardar/recuperar el apodo del jugador en este navegador (ignorando nombres por defecto antiguos)
  const FORBIDDEN_DEFAULT_NAMES = ['jugador', 'jugador 1', 'jugador 2', 'organizador'];

  function isDefaultOrEmptyName(name) {
    if (!name) return true;
    return FORBIDDEN_DEFAULT_NAMES.includes(name.trim().toLowerCase());
  }

  function requireValidPlayerName() {
    const raw = playerNameInput.value.trim();
    if (isDefaultOrEmptyName(raw)) {
      playerNameInput.classList.remove('input-error');
      void playerNameInput.offsetWidth; // Reiniciar animación
      playerNameInput.classList.add('input-error');
      playerNameInput.focus();
      playerNameInput.select();
      showToast('⚠️ ¡Escribe tu nombre o apodo antes de entrar!');
      return null;
    }
    playerNameInput.classList.remove('input-error');
    localStorage.setItem('penaltazo_player_name', raw);
    return raw;
  }

  playerNameInput.addEventListener('input', () => {
    if (!isDefaultOrEmptyName(playerNameInput.value)) {
      playerNameInput.classList.remove('input-error');
    }
  });

  const savedPlayerName = localStorage.getItem('penaltazo_player_name');
  if (savedPlayerName && !isDefaultOrEmptyName(savedPlayerName)) {
    playerNameInput.value = savedPlayerName;
  } else {
    localStorage.removeItem('penaltazo_player_name');
    playerNameInput.value = '';
  }

  if (tournamentParam) {
    const cleanCode = tournamentParam.toUpperCase();
    joinRoomInput.value = cleanCode;
    if (directInviteBanner) {
      directInviteBanner.classList.remove('hidden');
      if (lobbyFormatGroup) lobbyFormatGroup.classList.add('hidden');
      inviteBadgeTitle.textContent = `🏆 TORNEO: ${cleanCode}`;
      inviteBadgeDesc.textContent = 'Pon tu nombre arriba y pulsa para entrar al torneo:';
      directJoinBtn.textContent = `⚡ ¡ENTRAR AL TORNEO ${cleanCode}!`;
      directJoinBtn.onclick = () => {
        const name = requireValidPlayerName();
        if (!name) return;
        isInTournament = true;
        network.joinTournament(cleanCode, name);
      };
    }
    // Si ya había entrado antes a este mismo torneo con un nombre válido y ha recargado la página, reconectar automáticamente
    const lastTourney = sessionStorage.getItem('penaltazo_active_tournament');
    if (lastTourney === cleanCode && savedPlayerName && !isDefaultOrEmptyName(savedPlayerName)) {
      isInTournament = true;
      network.joinTournament(cleanCode, savedPlayerName);
    }
  } else if (roomParam) {
    const cleanCode = roomParam.toUpperCase();
    joinRoomInput.value = cleanCode;
    if (directInviteBanner) {
      directInviteBanner.classList.remove('hidden');
      if (lobbyFormatGroup) lobbyFormatGroup.classList.add('hidden');
      inviteBadgeTitle.textContent = `⚽ DUELO 1 vs 1: SALA ${cleanCode}`;
      inviteBadgeDesc.textContent = 'Pon tu nombre arriba y pulsa para entrar a la partida:';
      directJoinBtn.textContent = `⚡ ¡ENTRAR A LA SALA ${cleanCode}!`;
      directJoinBtn.onclick = () => {
        const name = requireValidPlayerName();
        if (!name) return;
        isInTournament = false;
        network.initMultiplayer();
        network.joinRoom(cleanCode, name, getSelectedLobbyPenalties());
      };
    }
  }

  // --- GESTIÓN DE PANTALLAS ---
  function showScreen(screen) {
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    tournamentLobbyScreen.classList.add('hidden');
    tournamentBracketScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverModal.classList.add('hidden');

    screen.classList.remove('hidden');
  }

  // --- SELECTOR DE TEMA VISUAL Y AUDIO TOGGLE ---
  const themeSelect = document.getElementById('theme-select');
  const savedTheme = localStorage.getItem('penaltazo_theme') || 'festivo';
  document.body.setAttribute('data-theme', savedTheme);
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value || 'festivo';
      document.body.setAttribute('data-theme', selectedTheme);
      localStorage.setItem('penaltazo_theme', selectedTheme);
    });
  }

  soundToggleBtn.addEventListener('click', () => {
    const isMuted = window.soundEngine.toggleMute();
    soundToggleBtn.innerHTML = isMuted ? '🔇' : '🔊';
    soundToggleBtn.setAttribute('title', isMuted ? 'Sonido desactivado' : 'Sonido activado');
  });

  document.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.init();
  }, { once: true });

  // --- EVENTOS DEL LOBBY PRINCIPAL ---
  function getSelectedLobbyPenalties() {
    const el = document.querySelector('input[name="lobby-penalties"]:checked');
    return el ? parseInt(el.value, 10) : 5;
  }

  createRoomBtn.addEventListener('click', () => {
    const name = requireValidPlayerName();
    if (!name) return;
    isInTournament = false;
    const penaltiesPerPlayer = getSelectedLobbyPenalties();
    network.initMultiplayer();
    network.joinRoom(null, name, penaltiesPerPlayer);
  });

  // Abrir modal de creación de torneo
  openTourneyModalBtn.addEventListener('click', () => {
    const name = requireValidPlayerName();
    if (!name) return;
    tourneyCreateModal.classList.remove('hidden');
  });

  cancelCreateTourneyBtn.addEventListener('click', () => {
    tourneyCreateModal.classList.add('hidden');
  });

  confirmCreateTourneyBtn.addEventListener('click', () => {
    const playerName = requireValidPlayerName();
    if (!playerName) {
      tourneyCreateModal.classList.add('hidden');
      return;
    }
    const tourneyName = tourneyNameInput.value.trim() || 'Copa Penaltazo';
    const selectedSizeEl = document.querySelector('input[name="tourney-size"]:checked');
    const size = selectedSizeEl ? parseInt(selectedSizeEl.value, 10) : 8;
    const selectedPenaltiesEl = document.querySelector('input[name="tourney-penalties"]:checked');
    const penaltiesPerPlayer = selectedPenaltiesEl ? parseInt(selectedPenaltiesEl.value, 10) : 5;

    tourneyCreateModal.classList.add('hidden');
    isInTournament = true;

    network.createTournament(size, tourneyName, playerName, penaltiesPerPlayer);
  });

  joinRoomBtn.addEventListener('click', () => {
    const name = requireValidPlayerName();
    if (!name) return;

    const code = joinRoomInput.value.trim().toUpperCase();
    if (!code) {
      showToast('⚠️ Introduce un código de sala o torneo.');
      joinRoomInput.focus();
      return;
    }

    if (code.startsWith('COPA-')) {
      // Unirse a un torneo
      isInTournament = true;
      sessionStorage.setItem('penaltazo_active_tournament', code);
      network.joinTournament(code, name);
    } else {
      // Unirse a una sala 1v1
      isInTournament = false;
      network.initMultiplayer();
      network.joinRoom(code, name, getSelectedLobbyPenalties());
    }
  });

  playAiBtn.addEventListener('click', () => {
    isInTournament = false;
    const raw = playerNameInput.value.trim();
    const name = !isDefaultOrEmptyName(raw) ? raw : 'Jugador 1';
    const penaltiesPerPlayer = getSelectedLobbyPenalties();
    network.initAIMode('SOLO-CPU', name, penaltiesPerPlayer);
  });

  // Salir de torneo al menú
  if (tourneyLeaveBtn) {
    tourneyLeaveBtn.addEventListener('click', () => {
      window.location.href = window.location.pathname;
    });
  }
  if (bracketBackMenuBtn) {
    bracketBackMenuBtn.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas salir al menú principal?')) {
        window.location.href = window.location.pathname;
      }
    });
  }

  // --- SALA DE ESPERA 1v1 ---
  function setupWaitingRoom(roomId) {
    showScreen(waitingScreen);
    waitingRoomCode.textContent = roomId;
    headerRoomBadge.textContent = `Sala: ${roomId}`;
    headerRoomBadge.classList.remove('hidden');

    let baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/?room=${encodeURIComponent(roomId)}`;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (serverLocalIps.length > 0) {
        shareUrl = `http://${serverLocalIps[0]}:3000/?room=${encodeURIComponent(roomId)}`;
      }
    }

    shareLinkInput.value = shareUrl;

    const shareText = `⚽ ¡Te reto a una tanda de penaltis en ¡PENALTAZO! (Sala ${roomId})! Entra aquí para jugar contra mí:`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedFull = encodeURIComponent(`${shareText} ${shareUrl}`);

    if (shareWhatsappBtn) {
      shareWhatsappBtn.href = `https://api.whatsapp.com/send?text=${encodedFull}`;
    }
    if (shareTelegramBtn) {
      shareTelegramBtn.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    }
    if (shareTwitterBtn) {
      shareTwitterBtn.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    }
    if (shareEmailBtn) {
      const subject = encodeURIComponent(`⚽ ¡Reto de penaltis en ¡PENALTAZO! (Sala ${roomId})`);
      shareEmailBtn.href = `mailto:?subject=${subject}&body=${encodedFull}`;
    }
    if (shareNativeBtn) {
      shareNativeBtn.onclick = async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: '¡PENALTAZO! - Duelo de Penaltis',
              text: shareText,
              url: shareUrl
            });
          } catch (err) {
            // Cancelado por el usuario
          }
        } else {
          navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
            showToast('¡Invitación copiada al portapapeles!');
          });
        }
      };
    }

    if (localIpsContainer && serverLocalIps.length > 0) {
      localIpsContainer.innerHTML = `
        <span class="wifi-hint">Para jugar desde tu móvil en la misma Wi-Fi:</span>
        <code class="ip-code">${shareUrl}</code>
      `;
    }

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

  // --- EVENTOS DEL SISTEMA DE TORNEOS ---
  network.on('tournament_joined', ({ tournament, myId, isHost }) => {
    isInTournament = true;
    activeTournament = tournament;
    myUserId = myId;
    sessionStorage.setItem('penaltazo_active_tournament', tournament.id);

    headerRoomBadge.textContent = `Torneo: ${tournament.id}`;
    headerRoomBadge.classList.remove('hidden');

    if (tournament.status === 'lobby') {
      showScreen(tournamentLobbyScreen);
      tournamentView.renderLobby(tournament, myId, isHost);
    } else {
      showScreen(tournamentBracketScreen);
      tournamentView.renderBracket(tournament, myId);
    }
  });

  network.on('tournament_updated', (tournament) => {
    activeTournament = tournament;
    if (tournament.status === 'lobby') {
      tournamentView.renderLobby(tournament, myUserId);
    } else {
      tournamentView.renderBracket(tournament, myUserId);
    }
  });

  network.on('tournament_started', (tournament) => {
    activeTournament = tournament;
    showScreen(tournamentBracketScreen);
    tournamentView.renderBracket(tournament, myUserId);
    showToast('⚽ ¡El torneo ha comenzado! Revisa tu emparejamiento.');
  });

  network.on('tournament_match_finished', ({ tournament, matchId, winner, scores, tournamentCompleted }) => {
    activeTournament = tournament;
    tournamentView.renderBracket(tournament, myUserId);
  });

  network.on('tournament_error', ({ message }) => {
    alert(message || 'Error al unirse al torneo');
  });

  // --- ACTUALIZACIÓN DE INTERFAZ DEL JUEGO ---
  function prepareTurn({ turnIndex, shooterRole, keeperRole, isSuddenDeath, suddenDeathRound, penaltiesPerPlayer, roomState }) {
    isResolvingTurn = false;
    hasConfirmedChoice = false;
    mySelectedCell = null;
    currentShooterRole = shooterRole;
    currentKeeperRole = keeperRole;
    if (penaltiesPerPlayer !== undefined) {
      currentPenaltiesPerPlayer = penaltiesPerPlayer;
    } else if (roomState && roomState.penaltiesPerPlayer !== undefined) {
      currentPenaltiesPerPlayer = roomState.penaltiesPerPlayer;
    }

    animator.resetPositions();
    goalGrid.clearSelection();

    const amIShooter = (myRole === shooterRole);
    const amIKeeper = (myRole === keeperRole);

    if (amIShooter) {
      goalGrid.enable('shooter');
      roleInstructions.innerHTML = `
        <div class="role-title shooter">⚽ ERES EL TIRADOR</div>
        <p class="role-desc">Haz clic directamente en la zona a la que quieres disparar (cualquier tiro salvo raso al centro tiene un pequeño riesgo de irse fuera).</p>
      `;
    } else if (amIKeeper) {
      goalGrid.enable('keeper');
      roleInstructions.innerHTML = `
        <div class="role-title keeper">🧤 ERES EL PORTERO</div>
        <p class="role-desc">Haz clic directamente en la zona hacia la que quieras lanzarte a parar.</p>
      `;
    } else {
      goalGrid.disable();
      roleInstructions.innerHTML = `
        <div class="role-title spectator">👀 MODO ESPECTADOR</div>
        <p class="role-desc">Observando la tanda de penaltis en vivo.</p>
      `;
    }

    myStatusBadge.className = 'status-badge waiting';
    myStatusBadge.innerHTML = '⏳ Esperando tu elección...';

    rivalStatusBadge.className = 'status-badge waiting';
    rivalStatusBadge.innerHTML = '⏳ Rival pensando...';

    selectedZoneLabel.textContent = 'Haz clic en una de las 6 zonas de la portería para elegir al instante';

    if (roomState && roomState.players) {
      const p1 = roomState.players.find(p => p.role === 'P1');
      const p2 = roomState.players.find(p => p.role === 'P2');
      if (p1 && p1.name) playerNames.P1 = p1.name;
      if (p2 && p2.name) playerNames.P2 = p2.name;
      scoreboard.updatePlayerNames(
        p1 ? (p1.role === myRole ? `${p1.name} (Tú)` : p1.name) : 'Jugador 1',
        p2 ? (p2.role === myRole ? `${p2.name} (Tú)` : p2.name) : 'Jugador 2'
      );
    }

    if (roomState && roomState.scores) {
      lastScores = roomState.scores;
    }
    if (roomState && roomState.history) {
      lastHistory = roomState.history;
    }

    scoreboard.render({
      scores: lastScores,
      history: lastHistory,
      currentTurnIndex: turnIndex,
      shooterRole,
      keeperRole,
      isSuddenDeath,
      suddenDeathRound,
      penaltiesPerPlayer: currentPenaltiesPerPlayer,
      myRole
    });
  }

  // --- EVENTOS DE RED GENERALES ---
  network.on('joined_room', ({ roomId, role, roomState, tournamentContext }) => {
    myRole = role;
    headerRoomBadge.textContent = tournamentContext ? `Partido de Torneo` : `Sala: ${roomId}`;
    headerRoomBadge.classList.remove('hidden');

    if (!tournamentContext && roomState.state === 'waiting' && myRole === 'P1') {
      setupWaitingRoom(roomId);
    } else {
      showScreen(gameScreen);
    }
  });

  network.on('room_update', (roomState) => {
    if (roomState.players.length >= 2 && roomState.state === 'waiting') {
      showToast('¡Oponente conectado! Preparando el terreno de juego...');
    }
  });

  network.on('game_started', (data) => {
    showScreen(gameScreen);
    if (window.soundEngine) {
      window.soundEngine.playPenaltazoTheme();
    }
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

    myStatusBadge.className = 'status-badge resolving';
    myStatusBadge.innerHTML = '⚡ ¡Resolviendo penalti!';
    rivalStatusBadge.className = 'status-badge resolving';
    rivalStatusBadge.innerHTML = '⚡ ¡Resolviendo penalti!';

    const shooterName = playerNames[data.shooterRole] || (data.shooterRole === 'P1' ? 'Jugador 1' : 'Jugador 2');
    const keeperName = playerNames[data.keeperRole] || (data.keeperRole === 'P1' ? 'Jugador 1' : 'Jugador 2');

    // Actualizar el marcador en cuanto el balón impacta en la portería
    animator.playResolution({
      shooterChoice: data.shooterChoice,
      keeperChoice: data.keeperChoice,
      isGoal: data.isGoal,
      isOut: data.isOut,
      shooterName,
      keeperName,
      isMyShot: data.shooterRole === myRole,
      isMySave: data.keeperRole === myRole,
      onImpact: () => {
        lastScores = data.scores;
        lastHistory = data.history;
        if (data.penaltiesPerPlayer !== undefined) {
          currentPenaltiesPerPlayer = data.penaltiesPerPlayer;
        }
        scoreboard.render({
          scores: data.scores,
          history: data.history,
          currentTurnIndex: data.turnIndex,
          shooterRole: data.shooterRole,
          keeperRole: data.keeperRole,
          isSuddenDeath: data.nextIsSuddenDeath,
          suddenDeathRound: data.nextSuddenDeathRound,
          penaltiesPerPlayer: currentPenaltiesPerPlayer,
          myRole,
          showActiveDot: false
        });
      },
      onComplete: () => {
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

  // --- FIN DE PARTIDO & REVANCHA / RETORNO A TORNEO ---
  function showGameOverScreen(data) {
    setTimeout(() => {
      gameOverModal.classList.remove('hidden');

      if (window.soundEngine) {
        window.soundEngine.playPenaltazoTheme();
      }

      const iWon = (data.winner === myRole);
      const isSpectator = (myRole === 'spectator');

      if (isSpectator) {
        gameOverTitle.textContent = `🏆 ¡${data.winner === 'P1' ? 'Jugador 1' : 'Jugador 2'} se lleva el partido!`;
        gameOverSubtitle.textContent = 'Partidazo resuelto en la tanda.';
      } else if (iWon) {
        gameOverTitle.innerHTML = '🏆 ¡¡HAS GANADO LA TANDA!!';
        gameOverTitle.className = 'game-over-title victory';
        gameOverSubtitle.textContent = isInTournament ? '¡Avanzas a la siguiente ronda del torneo!' : '¡Precisión milimétrica y reflejos felinos!';
        if (window.soundEngine) window.soundEngine.playCrowdCheer(true);
      } else {
        gameOverTitle.innerHTML = '💔 DERROTA EN LOS PENALTIS';
        gameOverTitle.className = 'game-over-title defeat';
        gameOverSubtitle.textContent = isInTournament ? 'Has quedado apeado del torneo, pero puedes seguir como espectador.' : 'Esta vez la suerte cayó del lado del rival.';
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

      // Si estamos en un torneo, mostrar botón para regresar al cuadro del torneo
      if (isInTournament && activeTournament) {
        returnBracketBtn.classList.remove('hidden');
        rematchBtn.classList.add('hidden');
        rematchStatus.textContent = '';
      } else {
        returnBracketBtn.classList.add('hidden');
        rematchBtn.classList.remove('hidden');
        rematchStatus.textContent = '';
        rematchBtn.removeAttribute('disabled');
        rematchBtn.textContent = 'Pedir Revancha 🔄';
      }
    }, 1200);
  }

  // Botón para volver al cuadro del torneo
  returnBracketBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    showScreen(tournamentBracketScreen);
    if (activeTournament) {
      tournamentView.renderBracket(activeTournament, myUserId);
    }
  });

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
