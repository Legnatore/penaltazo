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
  const cancelWaitBtn = document.getElementById('cancel-wait-btn');
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
  const gameOverHeatmap = document.getElementById('game-over-heatmap');
  const rematchBtn = document.getElementById('rematch-btn');
  const rematchStatus = document.getElementById('rematch-status');
  const returnBracketBtn = document.getElementById('return-bracket-btn');
  const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
  const shareResultWaBtn = document.getElementById('share-result-wa-btn');
  const downloadResultCardBtn = document.getElementById('download-result-card-btn');

  // Nuevos elementos de partido: H2H, Rey de la Pista, Reloj 12s, Carrusel y Emotes
  const h2hCounterBadge = document.getElementById('h2h-counter-badge');
  const kingQueueBadge = document.getElementById('king-queue-badge');
  const turnTimerBadge = document.getElementById('turn-timer-badge');
  const turnTimerSecondsEl = document.getElementById('turn-timer-seconds');
  const commentatorTextEl = document.getElementById('commentator-text');
  const emoteBar = document.getElementById('emote-bar');
  const emoteFloatingBanner = document.getElementById('emote-floating-banner');
  const aiPersonalitySelect = document.getElementById('ai-personality-select');

  // Elementos de Vitrina de Trofeos e Historial (localStorage)
  const careerKpiGrid = document.getElementById('career-kpi-grid');
  const careerTrophiesGrid = document.getElementById('career-trophies-grid');
  const careerStreakPill = document.getElementById('career-streak-pill');

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

    setCommentatorText(`🎯 Decisión tomada en secreto (${rowName} ${colName}). ¡Esperando el pitido del árbitro!`);
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
        activeTournament = null;
        network.initMultiplayer();
        network.joinRoom(cleanCode, name, getSelectedLobbyPenalties());
      };
    }
    // Si el jugador ya tiene su apodo guardado de una partida anterior (ej. al recibir un 2º enlace por WhatsApp), entrar directamente
    if (savedPlayerName && !isDefaultOrEmptyName(savedPlayerName)) {
      isInTournament = false;
      activeTournament = null;
      network.initMultiplayer();
      network.joinRoom(cleanCode, savedPlayerName, getSelectedLobbyPenalties());
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

  // --- REGISTRO DE SERVICE WORKER (PWA) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  // --- PERSONALIZACIÓN DE EQUIPOS Y TEMAS VISUALES ---
  const TEAM_KITS = {
    default: null,
    carbayon: {
      name: 'Azul Carbayón',
      primary: '#003399',
      secondary: '#ffffff',
      accent: '#facc15',
      shorts: '#ffffff'
    },
    rojiblanco: {
      name: 'Rojiblanco',
      primary: '#dc2626',
      secondary: '#ffffff',
      accent: '#1e3a8a',
      shorts: '#1e3a8a'
    },
    blaugrana: {
      name: 'Blaugrana',
      primary: '#991b1b',
      secondary: '#1e3a8a',
      accent: '#facc15',
      shorts: '#1e3a8a'
    },
    merengue: {
      name: 'Blanco Real',
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      accent: '#d97706',
      shorts: '#ffffff'
    },
    verdiblanco: {
      name: 'Verdiblanco',
      primary: '#16a34a',
      secondary: '#ffffff',
      accent: '#facc15',
      shorts: '#ffffff'
    },
    aurinegro: {
      name: 'Aurinegro',
      primary: '#facc15',
      secondary: '#0f172a',
      accent: '#f97316',
      shorts: '#0f172a'
    }
  };

  function applyTeamKit(kitKey) {
    const root = document.documentElement;
    const kit = TEAM_KITS[kitKey];
    if (!kit) {
      document.body.removeAttribute('data-kit');
      root.style.removeProperty('--team-primary');
      root.style.removeProperty('--team-secondary');
      root.style.removeProperty('--team-accent');
      root.style.removeProperty('--team-shorts');
      return;
    }
    document.body.setAttribute('data-kit', kitKey);
    root.style.setProperty('--team-primary', kit.primary);
    root.style.setProperty('--team-secondary', kit.secondary);
    root.style.setProperty('--team-accent', kit.accent);
    root.style.setProperty('--team-shorts', kit.shorts);
  }

  const teamKitSelect = document.getElementById('team-kit-select');
  const savedKit = localStorage.getItem('penaltazo_team_kit') || 'default';
  applyTeamKit(savedKit);
  if (teamKitSelect) {
    teamKitSelect.value = savedKit;
    teamKitSelect.addEventListener('change', () => {
      const selectedKit = teamKitSelect.value || 'default';
      applyTeamKit(selectedKit);
      localStorage.setItem('penaltazo_team_kit', selectedKit);
    });
  }

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
    activeTournament = null;
    const raw = playerNameInput.value.trim();
    const name = !isDefaultOrEmptyName(raw) ? raw : 'Jugador 1';
    const penaltiesPerPlayer = getSelectedLobbyPenalties();
    const personality = aiPersonalitySelect ? aiPersonalitySelect.value : 'psicologo';
    network.initAIMode('SOLO-CPU', name, penaltiesPerPlayer, personality);
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
    if (tournamentCompleted && winner && winner.id === myUserId) {
      recordTournamentVictoryInCareer();
    }
  });

  network.on('tournament_error', ({ message }) => {
    alert(message || 'Error al unirse al torneo');
  });

  // --- COMENTARISTA ESTILO CARRUSEL / PC FÚTBOL ---
  const CARRUSEL_INTRO_LINES = [
    '¡Ojo que toma carrerilla! Silencio sepulcral en la grada...',
    '¡Duelo psicológico en el área! ¿Asegurará al centro o buscará la escuadra?',
    '¡El portero se mueve sobre la línea de cal intentando poner nervioso al lanzador!',
    '¡Tensión máxima desde los once metros! Nadie quiere parpadear en el estadio.',
    '¡Atención a la mirada del delantero! En breves segundos saldremos de dudas...'
  ];

  function setCommentatorText(text, mood = 'normal') {
    if (!commentatorTextEl) return;
    commentatorTextEl.textContent = text;
    const ticker = document.getElementById('commentator-ticker');
    if (ticker) {
      ticker.setAttribute('data-mood', mood);
    }
  }

  // --- RELOJ DE POSESIÓN / TIEMPO LÍMITE DE TURNO (12 SEGUNDOS) ---
  let clientTurnInterval = null;
  let clientSecondsLeft = 12;

  function stopClientTurnTimer() {
    if (clientTurnInterval) {
      clearInterval(clientTurnInterval);
      clientTurnInterval = null;
    }
    if (turnTimerBadge) {
      turnTimerBadge.classList.remove('timer-urgent');
    }
  }

  function startClientTurnTimer(limitSeconds = 12) {
    stopClientTurnTimer();
    clientSecondsLeft = limitSeconds;
    if (turnTimerSecondsEl) turnTimerSecondsEl.textContent = String(clientSecondsLeft);

    clientTurnInterval = setInterval(() => {
      if (isResolvingTurn) {
        stopClientTurnTimer();
        return;
      }
      clientSecondsLeft = Math.max(0, clientSecondsLeft - 1);
      if (turnTimerSecondsEl) turnTimerSecondsEl.textContent = String(clientSecondsLeft);

      if (clientSecondsLeft <= 4 && clientSecondsLeft > 0) {
        if (turnTimerBadge) turnTimerBadge.classList.add('timer-urgent');
        if (clientSecondsLeft === 4 && !hasConfirmedChoice && myRole !== 'spectator') {
          setCommentatorText('⏱️ ¡¡Solo quedan 4 segundos en el reloj! ¡El árbitro se lleva el silbato a la boca!!', 'urgent');
        }
      }

      if (clientSecondsLeft <= 0) {
        stopClientTurnTimer();
        // Si estamos en modo IA y no hemos elegido en 12 segundos, disparar/tirarse al azar
        if (network.mode === 'ai' && !hasConfirmedChoice && !isResolvingTurn) {
          const randRow = Math.random() < 0.5 ? 0 : 1;
          const randCol = Math.floor(Math.random() * 3);
          hasConfirmedChoice = true;
          goalGrid.disable();
          myStatusBadge.className = 'status-badge ready';
          myStatusBadge.innerHTML = '⏱️ ¡Tiempo agotado (azar)!';
          setCommentatorText('⏱️ ¡Pitido del árbitro por límite de 12 segundos! Decisión automática al azar.', 'urgent');
          network.submitChoice(randRow, randCol);
        }
      }
    }, 1000);
  }

  // --- CONTADOR H2H Y COLA DE MODO "REY DE LA PISTA" ---
  let lastRoomState = null;

  function updateMatchMetaBar(roomState) {
    if (!roomState) return;
    lastRoomState = roomState;

    const p1 = roomState.players ? roomState.players.find(p => p.role === 'P1') : null;
    const p2 = roomState.players ? roomState.players.find(p => p.role === 'P2') : null;
    const p1Label = p1 ? p1.name : playerNames.P1;
    const p2Label = p2 ? p2.name : playerNames.P2;
    const sWins = roomState.seriesWins || { P1: 0, P2: 0 };
    const streak = roomState.kingStreak || 0;

    if (h2hCounterBadge) {
      const streakTxt = streak >= 2 ? ` • 👑 Racha: ${streak}` : '';
      h2hCounterBadge.innerHTML = `⚔️ H2H: <strong>${p1Label} ${sWins.P1 || 0}</strong> - <strong>${sWins.P2 || 0} ${p2Label}</strong>${streakTxt}`;
    }

    const queue = roomState.challengerQueue || [];
    if (kingQueueBadge) {
      if (queue.length > 0) {
        kingQueueBadge.classList.remove('hidden');
        const queueNames = queue.map(c => c.name).join(', ');
        kingQueueBadge.innerHTML = `👑 Rey de la Pista • En cola (${queue.length}): <strong>${queueNames}</strong>`;
      } else {
        kingQueueBadge.classList.add('hidden');
      }
    }
  }

  // --- SISTEMA DE HISTORIAL Y TROFEOS LOCALES (localStorage) ---
  const CAREER_STORAGE_KEY = 'penaltazo_career_stats_v1';
  const TROPHY_DEFINITIONS = [
    { id: 'debut', icon: '🏆', title: 'Debut Oficial', desc: 'Juega tu primera tanda de penaltis' },
    { id: 'muro', icon: '🧱', title: 'El Muro', desc: 'Para 3 o más penaltis en un partido' },
    { id: 'francotirador', icon: '🎯', title: 'Francotirador', desc: 'Anota 4 o más goles en una tanda' },
    { id: 'racha3', icon: '🔥', title: 'Imparable', desc: 'Logra una racha de 3 victorias seguidas' },
    { id: 'sangre_fria', icon: '⚡', title: 'Sangre Fría', desc: 'Gana un duelo en la Muerte Súbita' },
    { id: 'rey_copas', icon: '👑', title: 'Rey de Copas', desc: 'Proclámate campeón de un Torneo' }
  ];

  function loadCareerStats() {
    try {
      const raw = localStorage.getItem(CAREER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          matchesPlayed: Number(parsed.matchesPlayed) || 0,
          wins: Number(parsed.wins) || 0,
          currentStreak: Number(parsed.currentStreak) || 0,
          bestStreak: Number(parsed.bestStreak) || 0,
          goalsScored: Number(parsed.goalsScored) || 0,
          savesMade: Number(parsed.savesMade) || 0,
          tournamentsWon: Number(parsed.tournamentsWon) || 0,
          unlockedTrophies: Array.isArray(parsed.unlockedTrophies) ? parsed.unlockedTrophies : []
        };
      }
    } catch (e) {}
    return {
      matchesPlayed: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      goalsScored: 0,
      savesMade: 0,
      tournamentsWon: 0,
      unlockedTrophies: []
    };
  }

  function saveCareerStats(stats) {
    try {
      localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function renderCareerCabinet() {
    const stats = loadCareerStats();
    if (careerStreakPill) {
      careerStreakPill.textContent = `🔥 Racha: ${stats.currentStreak} (Récord: ${stats.bestStreak})`;
    }
    if (careerKpiGrid) {
      const winRate = stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;
      careerKpiGrid.innerHTML = `
        <div class="career-kpi-item">
          <span class="kpi-val">${stats.wins}/${stats.matchesPlayed}</span>
          <span class="kpi-lbl">Victorias (${winRate}%)</span>
        </div>
        <div class="career-kpi-item">
          <span class="kpi-val">⚽ ${stats.goalsScored}</span>
          <span class="kpi-lbl">Goles Totales</span>
        </div>
        <div class="career-kpi-item">
          <span class="kpi-val">🧤 ${stats.savesMade}</span>
          <span class="kpi-lbl">Paradas</span>
        </div>
        <div class="career-kpi-item">
          <span class="kpi-val">🏆 ${stats.tournamentsWon}</span>
          <span class="kpi-lbl">Copas</span>
        </div>
      `;
    }
    if (careerTrophiesGrid) {
      careerTrophiesGrid.innerHTML = TROPHY_DEFINITIONS.map(t => {
        const unlocked = stats.unlockedTrophies.includes(t.id);
        return `
          <div class="trophy-badge ${unlocked ? 'unlocked' : 'locked'}" title="${t.desc}">
            <span class="trophy-icon">${unlocked ? t.icon : '🔒'}</span>
            <div class="trophy-meta">
              <strong class="trophy-name">${t.title}</strong>
              <span class="trophy-desc">${t.desc}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function recordMatchInCareer(data) {
    if (myRole === 'spectator') return;
    const stats = loadCareerStats();
    const iWon = (data.winner === myRole);
    const rivalRole = (myRole === 'P1') ? 'P2' : 'P1';
    const myHistory = (data.history && data.history[myRole]) ? data.history[myRole] : [];
    const rivalHistory = (data.history && data.history[rivalRole]) ? data.history[rivalRole] : [];

    const myGoalsInMatch = myHistory.filter(h => h.isGoal).length;
    const mySavesInMatch = rivalHistory.filter(h => !h.isGoal && !h.isOut).length;
    const hadSuddenDeath = myHistory.some(h => h.isSuddenDeath) || rivalHistory.some(h => h.isSuddenDeath);

    stats.matchesPlayed += 1;
    stats.goalsScored += myGoalsInMatch;
    stats.savesMade += mySavesInMatch;

    if (iWon) {
      stats.wins += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    } else {
      stats.currentStreak = 0;
    }

    const newlyUnlocked = [];
    const unlock = (id) => {
      if (!stats.unlockedTrophies.includes(id)) {
        stats.unlockedTrophies.push(id);
        const def = TROPHY_DEFINITIONS.find(t => t.id === id);
        if (def) newlyUnlocked.push(def);
      }
    };

    unlock('debut');
    if (mySavesInMatch >= 3) unlock('muro');
    if (myGoalsInMatch >= 4) unlock('francotirador');
    if (stats.currentStreak >= 3) unlock('racha3');
    if (iWon && hadSuddenDeath) unlock('sangre_fria');

    saveCareerStats(stats);
    renderCareerCabinet();

    if (newlyUnlocked.length > 0) {
      showToast(`🏅 ¡Trofeo desbloqueado: ${newlyUnlocked.map(t => `${t.icon} ${t.title}`).join(', ')}!`);
    }
  }

  function recordTournamentVictoryInCareer() {
    const stats = loadCareerStats();
    stats.tournamentsWon += 1;
    if (!stats.unlockedTrophies.includes('rey_copas')) {
      stats.unlockedTrophies.push('rey_copas');
      showToast('👑 ¡Trofeo desbloqueado: Rey de Copas!');
    }
    saveCareerStats(stats);
    renderCareerCabinet();
  }

  renderCareerCabinet();

  // --- REACCIONES RÁPIDAS / EMOTES ("TRASH-TALK") ---
  let lastEmoteSentAt = 0;
  let emoteHideTimeout = null;

  if (emoteBar) {
    emoteBar.querySelectorAll('.emote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastEmoteSentAt < 1200) return;
        lastEmoteSentAt = now;
        const emoji = btn.getAttribute('data-emoji') || '⚽';
        const text = btn.getAttribute('data-text') || '';
        network.sendEmote(emoji, text);
      });
    });
  }

  network.on('emote_received', ({ role, playerName, emoji, text }) => {
    if (!emoteFloatingBanner) return;
    emoteFloatingBanner.classList.remove('hidden');
    emoteFloatingBanner.innerHTML = `<span class="emote-pop-emoji">${emoji}</span> <strong>${playerName}:</strong> "${text}"`;
    setCommentatorText(`💬 ¡Ojo al pique en el área! ${playerName} dice: "${text}" ${emoji}`, 'emote');

    if (emoteHideTimeout) clearTimeout(emoteHideTimeout);
    emoteHideTimeout = setTimeout(() => {
      emoteFloatingBanner.classList.add('hidden');
    }, 3200);
  });

  network.on('turn_timeout_auto', ({ timedOutRoles }) => {
    setCommentatorText('⏱️ ¡El árbitro hace sonar el silbato! Tiempo de 12 segundos agotado y decisión obligada al azar.', 'urgent');
    showToast('⏱️ ¡12 segundos agotados! Elección automática al azar.');
  });

  network.on('role_swapped', ({ myNewRole, newChallengerName, roomState }) => {
    myRole = myNewRole;
    if (roomState) updateMatchMetaBar(roomState);
    showToast(`👑 ¡Modo Rey de la Pista! Entra ${newChallengerName} a retar al campeón.`);
    setCommentatorText(`👑 ¡Salta al césped un nuevo retador: ${newChallengerName} busca destronar al Rey de la Pista!`, 'goal');
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
        <p class="role-desc">Haz clic directamente en la zona a la que quieres disparar (tienes 12 segundos).</p>
      `;
    } else if (amIKeeper) {
      goalGrid.enable('keeper');
      roleInstructions.innerHTML = `
        <div class="role-title keeper">🧤 ERES EL PORTERO</div>
        <p class="role-desc">Haz clic directamente en la zona hacia la que quieras lanzarte a parar (tienes 12 segundos).</p>
      `;
    } else {
      goalGrid.disable();
      const queue = (roomState && roomState.challengerQueue) ? roomState.challengerQueue : [];
      const myQueueIndex = queue.findIndex(c => c.clientId === network.clientId);
      const queueHint = myQueueIndex !== -1
        ? `¡Estás en el puesto #${myQueueIndex + 1} de la cola! Jugarás automáticamente contra el ganador.`
        : 'Observando la tanda de penaltis en vivo.';
      roleInstructions.innerHTML = `
        <div class="role-title spectator">👑 MODO REY DE LA PISTA / ESPECTADOR</div>
        <p class="role-desc">${queueHint}</p>
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

    // Actualizar pancartas de ánimo en las gradas del estadio para el jugador actual
    const cheerLeft = document.getElementById('cheer-banner-left');
    const cheerCenter = document.getElementById('cheer-banner-center');
    const cheerRight = document.getElementById('cheer-banner-right');
    const activeMyName = (myRole === 'P1' ? playerNames.P1 : (myRole === 'P2' ? playerNames.P2 : playerNames[shooterRole])) || 'CAMPEÓN';
    const upperName = activeMyName.toUpperCase();

    const shooterChants = [
      `🔥 ¡CHUTA A GOL, ${upperName}! 🔥`,
      `⚽ ¡${upperName} NUNCA FALLA! ⚽`,
      `🚀 ¡RÓMPELA, ${upperName}! 🚀`,
      `🏆 ¡A LA ESCUADRA, ${upperName}! 🏆`
    ];
    const keeperChants = [
      `🧤 ¡PÁRALO, ${upperName}, ERES UN MURO! 🧤`,
      `🧱 ¡SAN ${upperName} BAJO PALOS! 🧱`,
      `🦅 ¡VUELA, ${upperName}, QUE NO PASE! 🦅`,
      `🛡️ ¡PORTERÍA A CERO, ${upperName}! 🛡️`
    ];

    const chantIdx = (turnIndex || 0) % shooterChants.length;
    if (cheerLeft && cheerCenter && cheerRight) {
      if (amIShooter) {
        cheerLeft.textContent = `🚩 ¡VAMOS ${upperName}!`;
        cheerCenter.textContent = shooterChants[chantIdx];
        cheerRight.textContent = `🎺 ¡${upperName} GOL!`;
      } else if (amIKeeper) {
        cheerLeft.textContent = `🧤 ¡FUERZA ${upperName}!`;
        cheerCenter.textContent = keeperChants[chantIdx];
        cheerRight.textContent = `🚩 ¡MURO ${upperName}!`;
      } else {
        cheerLeft.textContent = `🚩 ¡VAMOS ${playerNames.P1.toUpperCase()}!`;
        cheerCenter.textContent = `⚽ ¡QUÉ PARTIDAZO DE PENALTIS! ⚽`;
        cheerRight.textContent = `🎺 ¡VAMOS ${playerNames.P2.toUpperCase()}!`;
      }
    }

    if (roomState) {
      updateMatchMetaBar(roomState);
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

    const shooterDisplayName = playerNames[shooterRole] || 'El delantero';
    const keeperDisplayName = playerNames[keeperRole] || 'el guardameta';
    if (isSuddenDeath) {
      setCommentatorText(`🔥 ¡MUERTE SÚBITA (Ronda ${suddenDeathRound})! Chuta ${shooterDisplayName} ante ${keeperDisplayName}. ¡El que falle se queda sin red!`, 'urgent');
    } else {
      const introLine = CARRUSEL_INTRO_LINES[(turnIndex || 0) % CARRUSEL_INTRO_LINES.length];
      setCommentatorText(`🎙️ Turno de ${shooterDisplayName} frente a ${keeperDisplayName}. ${introLine}`, 'normal');
    }

    startClientTurnTimer(12);
  }

  // --- EVENTOS DE RED GENERALES ---
  let pendingRematchVotes = [];

  network.on('joined_room', ({ roomId, role, roomState, tournamentContext }) => {
    myRole = role;
    if (!tournamentContext) {
      isInTournament = false;
      activeTournament = null;
    }
    if (roomState) {
      updateMatchMetaBar(roomState);
    }
    headerRoomBadge.textContent = tournamentContext ? `Partido de Torneo` : `Sala: ${roomId}`;
    headerRoomBadge.classList.remove('hidden');

    if (!tournamentContext && roomState.state === 'waiting') {
      setupWaitingRoom(roomId);
    } else if (roomState.state !== 'game_over') {
      showScreen(gameScreen);
    }
  });

  network.on('room_update', (roomState) => {
    updateMatchMetaBar(roomState);
    if (roomState.players.length >= 2 && roomState.state === 'waiting') {
      showToast('¡Oponente conectado! Preparando el terreno de juego...');
    }
  });

  // --- ESTADÍSTICAS Y MAPA DE CALOR 3x2 ---
  const ZONE_LABELS = [
    ['Escuadra Izq.', 'Arriba Centro', 'Escuadra Der.'],
    ['Raso Izq.', 'Raso Centro', 'Raso Der.']
  ];

  let matchZoneStats = createEmptyZoneStats();

  function createEmptyZoneStats() {
    const zones = [];
    for (let r = 0; r < 2; r++) {
      zones[r] = [];
      for (let c = 0; c < 3; c++) {
        zones[r][c] = { shots: 0, goals: 0, saves: 0, outs: 0, diveCount: 0 };
      }
    }
    return { totalShots: 0, zones };
  }

  function recordTurnStats({ shooterChoice, keeperChoice, isGoal, isOut }) {
    if (!shooterChoice || !keeperChoice) return;
    matchZoneStats.totalShots++;
    const sZone = matchZoneStats.zones[shooterChoice.row]?.[shooterChoice.col];
    const kZone = matchZoneStats.zones[keeperChoice.row]?.[keeperChoice.col];
    if (sZone) {
      sZone.shots++;
      if (isGoal) sZone.goals++;
      else if (isOut) sZone.outs++;
      else sZone.saves++;
    }
    if (kZone) {
      kZone.diveCount++;
    }
  }

  function renderHeatmapReportHTML() {
    const total = matchZoneStats.totalShots || 1;
    let cellsHtml = '';

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const z = matchZoneStats.zones[r][c];
        const shotSharePct = Math.round((z.shots / total) * 100);
        const goalAccuracyPct = z.shots > 0 ? Math.round((z.goals / z.shots) * 100) : 0;
        const heatAlpha = z.shots > 0 ? (0.18 + (z.shots / total) * 0.65).toFixed(2) : '0.06';
        const heatColor = z.goals > 0
          ? `rgba(34, 197, 94, ${heatAlpha})`
          : (z.shots > 0 ? `rgba(249, 115, 22, ${heatAlpha})` : `rgba(148, 163, 184, 0.12)`);

        cellsHtml += `
          <div class="heatmap-cell" style="background: ${heatColor};">
            <span class="heatmap-zone-name">${ZONE_LABELS[r][c]}</span>
            <strong class="heatmap-pct">${goalAccuracyPct}% Gol</strong>
            <span class="heatmap-sub">⚽ ${z.goals}/${z.shots} tiros (${shotSharePct}%) &bull; 🧤 ${z.diveCount} estiradas</span>
          </div>
        `;
      }
    }

    return `
      <div class="stats-heatmap-section">
        <h4 class="heatmap-title">🔥 Mapa de Calor y Eficacia por Zona (3x2)</h4>
        <div class="heatmap-grid-3x2">
          ${cellsHtml}
        </div>
      </div>
    `;
  }

  network.on('game_started', (data) => {
    matchZoneStats = createEmptyZoneStats();
    pendingRematchVotes = [];
    gameOverModal.classList.add('hidden');
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
    stopClientTurnTimer();
    goalGrid.disable();
    recordTurnStats(data);
    if (data.roomState) {
      updateMatchMetaBar(data.roomState);
    }

    myStatusBadge.className = 'status-badge resolving';
    myStatusBadge.innerHTML = '⚡ ¡Resolviendo penalti!';
    rivalStatusBadge.className = 'status-badge resolving';
    rivalStatusBadge.innerHTML = '⚡ ¡Resolviendo penalti!';

    const shooterName = playerNames[data.shooterRole] || (data.shooterRole === 'P1' ? 'Jugador 1' : 'Jugador 2');
    const keeperName = playerNames[data.keeperRole] || (data.keeperRole === 'P1' ? 'Jugador 1' : 'Jugador 2');
    const zoneLabel = ZONE_LABELS[data.shooterChoice?.row]?.[data.shooterChoice?.col] || 'la portería';

    setCommentatorText(`⚡ ¡Toma carrerilla ${shooterName}, golpea con el alma hacia ${zoneLabel}...!`);

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
        if (data.isGoal) {
          if (data.shooterChoice?.row === 0 && (data.shooterChoice?.col === 0 || data.shooterChoice?.col === 2)) {
            setCommentatorText(`⚽ ¡¡GOOOOOLAZO POR LA ESCUADRA DE ${shooterName.toUpperCase()}!! ¡Imposible para ${keeperName}, quitó las telarañas!`, 'goal');
          } else {
            setCommentatorText(`⚽ ¡¡GOOOOOL DE ${shooterName.toUpperCase()}!! Engañó por completo a ${keeperName} (${data.scores.P1}-${data.scores.P2}).`, 'goal');
          }
        } else if (data.isOut) {
          setCommentatorText(`💨 ¡¡FUERAAAA!! ¡${shooterName} buscó ajustar demasiado a ${zoneLabel} y el balón se marcha desviado! ¡Se lleva las manos a la cabeza!`, 'urgent');
        } else {
          setCommentatorText(`🧤 ¡¡PARADÓOOOON ANTOLÓGICO DE ${keeperName.toUpperCase()}!! ¡Adivinó la intención de ${shooterName} en ${zoneLabel} y voló como un gato!`, 'save');
        }

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
          recordMatchInCareer(data);
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
  function updateRematchUI(votes = pendingRematchVotes) {
    if (isInTournament && activeTournament) {
      returnBracketBtn.classList.remove('hidden');
      rematchBtn.classList.add('hidden');
      rematchStatus.textContent = '';
      rematchStatus.classList.remove('rematch-requested-alert');
      return;
    }

    returnBracketBtn.classList.add('hidden');
    rematchBtn.classList.remove('hidden');

    const queue = (lastRoomState && Array.isArray(lastRoomState.challengerQueue)) ? lastRoomState.challengerQueue : [];
    if (queue.length > 0 && !isInTournament) {
      const nextChallenger = queue[0].name;
      rematchStatus.innerHTML = `👑 <strong>¡Modo Rey de la Pista!</strong> Siguiente retador en cola: <strong>${nextChallenger}</strong>`;
      rematchStatus.classList.add('rematch-requested-alert');
      if (myRole === 'spectator') {
        rematchBtn.setAttribute('disabled', 'true');
        rematchBtn.textContent = `👑 Esperando a que el Rey acepte el reto de ${nextChallenger}...`;
      } else {
        rematchBtn.removeAttribute('disabled');
        rematchBtn.classList.remove('btn-primary');
        rematchBtn.classList.add('btn-confirm', 'pulse-btn');
        rematchBtn.innerHTML = `👑 ¡DEFENDER TRONO VS ${nextChallenger.toUpperCase()}!`;
      }
      return;
    }

    const rivalRole = (myRole === 'P1') ? 'P2' : 'P1';
    const rivalWantsRematch = Array.isArray(votes) && votes.includes(rivalRole);
    const iWantRematch = Array.isArray(votes) && votes.includes(myRole);

    if (rivalWantsRematch && !iWantRematch) {
      rematchStatus.innerHTML = '🔥 <strong>¡Tu rival pide la revancha!</strong> Pulsa el botón verde para aceptarla:';
      rematchStatus.classList.add('rematch-requested-alert');
      rematchBtn.removeAttribute('disabled');
      rematchBtn.classList.remove('btn-primary');
      rematchBtn.classList.add('btn-confirm', 'pulse-btn');
      rematchBtn.innerHTML = '✅ ¡ACEPTAR REVANCHA AHORA! 🔄';
    } else if (iWantRematch && !rivalWantsRematch) {
      rematchStatus.textContent = 'Has solicitado la revancha. Esperando a que tu rival acepte...';
      rematchStatus.classList.remove('rematch-requested-alert');
      rematchBtn.setAttribute('disabled', 'true');
      rematchBtn.classList.remove('btn-confirm', 'pulse-btn');
      rematchBtn.classList.add('btn-primary');
      rematchBtn.textContent = '⏳ Esperando al rival...';
    } else if (iWantRematch && rivalWantsRematch) {
      rematchStatus.textContent = '⚡ ¡Revancha aceptada! Iniciando nuevo partido...';
      rematchStatus.classList.remove('rematch-requested-alert');
      rematchBtn.setAttribute('disabled', 'true');
    } else {
      rematchStatus.textContent = '';
      rematchStatus.classList.remove('rematch-requested-alert');
      rematchBtn.removeAttribute('disabled');
      rematchBtn.classList.remove('btn-confirm', 'pulse-btn');
      rematchBtn.classList.add('btn-primary');
      rematchBtn.textContent = 'Pedir Revancha 🔄';
    }
  }

  let lastGameOverData = null;

  function showGameOverScreen(data) {
    lastGameOverData = data;
    setTimeout(() => {
      gameOverModal.classList.remove('hidden');
      const modalCard = gameOverModal.querySelector('.modal-card');
      if (modalCard) modalCard.scrollTop = 0;

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
            <span class="team-label">${myRole === 'P1' ? `${playerNames.P1} (Tú)` : playerNames.P1}</span>
            <span class="team-score">${data.scores.P1}</span>
          </div>
          <div class="score-vs">-</div>
          <div class="score-team">
            <span class="team-score">${data.scores.P2}</span>
            <span class="team-label">${myRole === 'P2' ? `${playerNames.P2} (Tú)` : playerNames.P2}</span>
          </div>
        </div>
      `;

      if (gameOverHeatmap) {
        gameOverHeatmap.innerHTML = renderHeatmapReportHTML();
      }

      updateRematchUI(pendingRematchVotes);
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
    if (!pendingRematchVotes.includes(myRole)) {
      pendingRematchVotes.push(myRole);
    }
    updateRematchUI(pendingRematchVotes);
    network.requestRematch();
  });

  network.on('rematch_status', ({ votes }) => {
    pendingRematchVotes = Array.isArray(votes) ? votes : [];
    // Si el modal aún no se había terminado de mostrar por el timeout, asegurarnos de actualizar su estado
    gameOverModal.classList.remove('hidden');
    updateRematchUI(pendingRematchVotes);
  });

  if (cancelWaitBtn) {
    cancelWaitBtn.addEventListener('click', () => {
      window.location.href = window.location.pathname;
    });
  }

  backToLobbyBtn.addEventListener('click', () => {
    window.location.href = window.location.pathname;
  });

  // --- COMPARTIR CRÓNICA Y TARJETA DE RESULTADO (IMAGEN CANVAS) PARA WHATSAPP ---
  function buildMatchChronicleText() {
    const scores = (lastGameOverData && lastGameOverData.scores) ? lastGameOverData.scores : lastScores;
    const winnerRole = (lastGameOverData && lastGameOverData.winner) ? lastGameOverData.winner : (scores.P1 >= scores.P2 ? 'P1' : 'P2');
    const loserRole = winnerRole === 'P1' ? 'P2' : 'P1';
    const winnerName = playerNames[winnerRole] || 'Campeón';
    const loserName = playerNames[loserRole] || 'Rival';
    const wScore = scores[winnerRole] ?? 0;
    const lScore = scores[loserRole] ?? 0;
    const sWins = (lastRoomState && lastRoomState.seriesWins) ? lastRoomState.seriesWins : { P1: 0, P2: 0 };

    let shareUrl = window.location.origin;
    if (network.mode === 'multiplayer' && network.roomId && !String(network.roomId).includes('_r')) {
      shareUrl = `${window.location.origin}/?room=${encodeURIComponent(network.roomId)}`;
    }

    return (
      `📰 *CRÓNICA OFICIAL ¡PENALTAZO!* ⚽\n` +
      `🏆 *¡${winnerName.toUpperCase()} TOMA LA PORTERÍA (${wScore} - ${lScore}) ANTE ${loserName.toUpperCase()}!*\n` +
      `⚔️ Balance H2H Serie: ${playerNames.P1} ${sWins.P1 || 0} - ${sWins.P2 || 0} ${playerNames.P2}\n` +
      `🔥 ¿Alguien se atreve a quitarle la corona desde los 11 metros?\n` +
      `👉 Entra aquí: ${shareUrl}`
    );
  }

  if (shareResultWaBtn) {
    shareResultWaBtn.addEventListener('click', () => {
      const text = buildMatchChronicleText();
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    });
  }

  if (downloadResultCardBtn) {
    downloadResultCardBtn.addEventListener('click', () => {
      const scores = (lastGameOverData && lastGameOverData.scores) ? lastGameOverData.scores : lastScores;
      const winnerRole = (lastGameOverData && lastGameOverData.winner) ? lastGameOverData.winner : (scores.P1 >= scores.P2 ? 'P1' : 'P2');
      const winnerName = playerNames[winnerRole] || 'Campeón';
      const sWins = (lastRoomState && lastRoomState.seriesWins) ? lastRoomState.seriesWins : { P1: 0, P2: 0 };

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 460;
      const ctx = canvas.getContext('2d');

      // Fondo estilo estadio nocturno deportivo
      const grad = ctx.createLinearGradient(0, 0, 800, 460);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.55, '#0369a1');
      grad.addColorStop(1, '#15803d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 460);

      // Marco arcade amarillo
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 8;
      ctx.strokeRect(16, 16, 768, 428);

      // Cabecera periódico deportivo
      ctx.fillStyle = '#facc15';
      ctx.font = '900 32px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚽ DIARIO ¡PENALTAZO! — MARCADOR OFICIAL', 400, 68);

      // Subtítulo del ganador
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 26px Montserrat, sans-serif';
      ctx.fillText(`🏆 ¡${winnerName.toUpperCase()} SE LLEVA LA TANDA DE PENALTIS!`, 400, 118);

      // Caja central del marcador
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(80, 148, 640, 165);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(80, 148, 640, 165);

      // Nombres y goles
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '800 24px Montserrat, sans-serif';
      ctx.fillText(String(playerNames.P1 || 'Jugador 1').slice(0, 18), 230, 195);
      ctx.fillText(String(playerNames.P2 || 'Jugador 2').slice(0, 18), 570, 195);

      ctx.fillStyle = '#facc15';
      ctx.font = '900 74px Montserrat, sans-serif';
      ctx.fillText(`${scores.P1 ?? 0}`, 230, 278);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px Montserrat, sans-serif';
      ctx.fillText('VS', 400, 265);
      ctx.fillStyle = '#facc15';
      ctx.font = '900 74px Montserrat, sans-serif';
      ctx.fillText(`${scores.P2 ?? 0}`, 570, 278);

      // Serie H2H
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 20px Montserrat, sans-serif';
      ctx.fillText(`⚔️ Balance H2H Serie: ${playerNames.P1} ${sWins.P1 || 0} - ${sWins.P2 || 0} ${playerNames.P2}`, 400, 358);

      // Pie de firma
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 16px Montserrat, sans-serif';
      ctx.fillText('⚽ Juego hecho por Legnatore en 2026 • ¡Juega gratis en tu navegador!', 400, 412);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'penaltazo-resultado.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: '¡PENALTAZO! - Resultado del Partido',
              text: buildMatchChronicleText(),
              files: [file]
            });
            return;
          } catch (e) {}
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'penaltazo-resultado.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('📸 ¡Tarjeta de resultado descargada!');
      }, 'image/png');
    });
  }

  // --- MODAL LEGAL (PRIVACIDAD, COOKIES Y CONDICIONES PARA ADSENSE) ---
  const legalModal = document.getElementById('legal-modal');
  const openPrivacyBtn = document.getElementById('open-privacy-btn');
  const openTermsBtn = document.getElementById('open-terms-btn');
  const closeLegalModalBtn = document.getElementById('close-legal-modal-btn');

  if (openPrivacyBtn && legalModal) {
    openPrivacyBtn.addEventListener('click', () => {
      legalModal.classList.remove('hidden');
    });
  }
  if (openTermsBtn && legalModal) {
    openTermsBtn.addEventListener('click', () => {
      legalModal.classList.remove('hidden');
    });
  }
  if (closeLegalModalBtn && legalModal) {
    closeLegalModalBtn.addEventListener('click', () => {
      legalModal.classList.add('hidden');
    });
  }
  if (legalModal) {
    legalModal.addEventListener('click', (e) => {
      if (e.target === legalModal) {
        legalModal.classList.add('hidden');
      }
    });
  }

  // --- INICIALIZACIÓN SEGURA DE BLOQUES GOOGLE ADSENSE ---
  function initAdSenseSlots() {
    try {
      const adSlots = document.querySelectorAll('ins.adsbygoogle');
      adSlots.forEach((slot) => {
        const client = slot.getAttribute('data-ad-client') || '';
        // Solo empujar si el usuario ya ha puesto su ca-pub real (distinto del placeholder 0000000000000000)
        if (client && !client.includes('0000000000000000') && !slot.getAttribute('data-adsbygoogle-status')) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          const placeholder = slot.parentElement?.querySelector('.ad-placeholder-banner');
          if (placeholder) placeholder.style.display = 'none';
        }
      });
    } catch (err) {
      // AdBlocker activo o AdSense aún no configurado
    }
  }

  initAdSenseSlots();
});
