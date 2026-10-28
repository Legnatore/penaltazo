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
  const openShareModalBtn = document.getElementById('open-share-modal-btn');
  const roomShareModal = document.getElementById('room-share-modal');
  const closeShareModalBtn = document.getElementById('close-share-modal-btn');
  const shareLinkInput = document.getElementById('share-link-input');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const copyToast = document.getElementById('copy-toast');
  const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
  const shareTelegramBtn = document.getElementById('share-telegram-btn');
  const shareSmsBtn = document.getElementById('share-sms-btn');
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
  const shareResultXBtn = document.getElementById('share-result-x-btn');
  const shareResultTgBtn = document.getElementById('share-result-tg-btn');
  const shareResultInstaBtn = document.getElementById('share-result-insta-btn');
  const shareResultFbBtn = document.getElementById('share-result-fb-btn');
  const shareResultCopyBtn = document.getElementById('share-result-copy-btn');
  const downloadResultCardBtn = document.getElementById('download-result-card-btn');
  const wordleResultPreview = document.getElementById('wordle-result-preview');
  const revengeAsyncBtn = document.getElementById('revenge-async-btn');

  // Elementos del Modo Asíncrono («Desafío por Enlace»)
  const startAsyncChallengeBtn = document.getElementById('start-async-challenge-btn');
  const asyncShareModal = document.getElementById('async-share-modal');
  const asyncRecordedSummary = document.getElementById('async-recorded-summary');
  const asyncChallengeUrlInput = document.getElementById('async-challenge-url-input');
  const asyncCopyUrlBtn = document.getElementById('async-copy-url-btn');
  const asyncSendWhatsappBtn = document.getElementById('async-send-whatsapp-btn');
  const asyncSendTelegramBtn = document.getElementById('async-send-telegram-btn');
  const asyncSendSmsBtn = document.getElementById('async-send-sms-btn');
  const asyncBackLobbyBtn = document.getElementById('async-back-lobby-btn');

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

    if (currentKeeperRole === myRole && animator) {
      animator.setPovGlovesDive(row, col);
    }

    const rowName = row === 0 ? 'Arriba' : 'Raso';
    const colName = col === 0 ? 'Izquierda' : (col === 1 ? 'Centro' : 'Derecha');
    selectedZoneLabel.textContent = `Zona seleccionada: ${rowName} - ${colName}`;

    myStatusBadge.className = 'status-badge ready';
    myStatusBadge.innerHTML = '✅ ¡Elección enviada!';

    setCommentatorText(`🎯 Decisión tomada en secreto (${rowName} ${colName}). ¡Esperando el pitido del árbitro!`);
    network.submitChoice(row, col);
  });

  animator = new PenaltyAnimator(stadiumArena, goalGrid);

  goalGrid.onCellHover = (row, col) => {
    if (hasConfirmedChoice || isResolvingTurn) return;
    if (currentKeeperRole === myRole && animator) {
      animator.setPovGlovesDive(row, col);
    }
  };

  goalGrid.onCellLeave = () => {
    if (hasConfirmedChoice || isResolvingTurn) return;
    if (currentKeeperRole === myRole && animator && !mySelectedCell) {
      animator.resetPovGloves();
    }
  };

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

  // --- CODIFICACIÓN Y SANITIZACIÓN SEGURA PARA EL MODO ASÍNCRONO (?desafio=...) ---
  function sanitizePlayerNickname(raw, fallback = 'Colega') {
    if (typeof raw !== 'string') return fallback;
    const cleaned = raw.replace(/[<>"'&\x00-\x1F\x7F]/g, '').trim().slice(0, 15);
    return cleaned || fallback;
  }

  function encodeAsyncChallengePayload({ p, s, d, k, n }) {
    const safeName = sanitizePlayerNickname(p, 'Colega');
    const sanitizeArr = (arr, fallback = [1, 1, 1, 1, 1]) => {
      const res = Array.isArray(arr)
        ? arr.slice(0, 5).map(val => {
            const num = Number(val);
            return Number.isInteger(num) && num >= 0 && num <= 5 ? num : 1;
          })
        : [...fallback];
      while (res.length < 5) res.push(1);
      return res;
    };

    const safeShots = sanitizeArr(s, [0, 2, 1, 3, 5]);
    const safeDives = sanitizeArr(d, [1, 1, 1, 1, 1]);

    const payload = {
      p: safeName,
      s: safeShots,
      d: safeDives
    };
    if (typeof k === 'string' && k.length <= 20) payload.k = k;
    if (Number.isInteger(n) && n >= 1 && n <= 99) payload.n = n;

    const jsonStr = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function decodeAndSanitizeAsyncChallenge(rawParam) {
    if (!rawParam || typeof rawParam !== 'string' || rawParam.length > 512) {
      return null;
    }
    try {
      // Soportar tanto Base64 estándar como Base64 URL-safe y espacios por +
      let normalized = rawParam.trim().replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
      while (normalized.length % 4 !== 0) {
        normalized += '=';
      }
      const binary = atob(normalized);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonStr = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const parsed = JSON.parse(jsonStr);

      if (!parsed || typeof parsed !== 'object') return null;
      if (!Array.isArray(parsed.d) || parsed.d.length !== 5) return null;

      const sanitizeArr = (arr, fallback = [1, 1, 1, 1, 1]) => {
        if (!Array.isArray(arr)) return fallback;
        const res = [];
        for (let i = 0; i < 5; i++) {
          const val = Number(arr[i]);
          if (!Number.isInteger(val) || val < 0 || val > 5) return fallback;
          res.push(val);
        }
        return res;
      };

      const sanitizedDives = sanitizeArr(parsed.d, [1, 1, 1, 1, 1]);
      const sanitizedShots = sanitizeArr(parsed.s, [0, 2, 1, 3, 5]);

      const safePlayerName = sanitizePlayerNickname(parsed.p, 'Colega');
      const safeKit = typeof parsed.k === 'string' ? parsed.k.replace(/[^a-z0-9_-]/gi, '').slice(0, 20) : null;
      const safeNumber = (Number.isInteger(Number(parsed.n)) && Number(parsed.n) >= 1 && Number(parsed.n) <= 99)
        ? Number(parsed.n)
        : null;

      return {
        p: safePlayerName,
        s: sanitizedShots,
        d: sanitizedDives,
        k: safeKit,
        n: safeNumber
      };
    } catch (err) {
      console.warn('Enlace de desafío asíncrono inválido o corrupto:', err);
      return null;
    }
  }

  // Comprobar parámetros en la URL (?room=XYZ, ?tournament=COPA-XYZ o ?desafio=BASE64)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const tournamentParam = urlParams.get('tournament');
  const desafioParam = urlParams.get('desafio');
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
  } else if (desafioParam) {
    const decodedChallenge = decodeAndSanitizeAsyncChallenge(desafioParam);
    if (!decodedChallenge) {
      setTimeout(() => {
        showToast('⚠️ El enlace de desafío está incompleto o corrupto.');
      }, 300);
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}
    } else {
      if (directInviteBanner) {
        directInviteBanner.classList.remove('hidden');
        if (lobbyFormatGroup) lobbyFormatGroup.classList.add('hidden');
        inviteBadgeTitle.textContent = `⚔️ ¡DESAFÍO DE PENALTIS DE ${decodedChallenge.p.toUpperCase()}!`;
        inviteBadgeDesc.textContent = `${decodedChallenge.p} ha dejado grabada su tanda completa (5 tiros y 5 paradas). Pon tu nombre para disputar la tanda frente a frente:`;
        directJoinBtn.textContent = `⚡ ¡DISPUTAR LA TANDA DE PENALTIS!`;
        directJoinBtn.onclick = () => {
          const name = requireValidPlayerName();
          if (!name) return;
          isInTournament = false;
          activeTournament = null;
          myRole = 'P2';
          network.initAsyncChallengePlay(decodedChallenge, name);
        };
      }
      // Si el Jugador B ya tenía su apodo guardado, lanzar directamente el desafío asíncrono
      if (savedPlayerName && !isDefaultOrEmptyName(savedPlayerName)) {
        setTimeout(() => {
          isInTournament = false;
          activeTournament = null;
          myRole = 'P2';
          network.initAsyncChallengePlay(decodedChallenge, savedPlayerName);
        }, 180);
      }
    }
  } else if (urlParams.get('ia') === '1') {
    setTimeout(() => {
      playerNameInput.value = 'Tirador';
      playAiBtn.click();
    }, 150);
  }

  // --- GESTIÓN DE PANTALLAS ---
  function showScreen(screen) {
    lobbyScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    tournamentLobbyScreen.classList.add('hidden');
    tournamentBracketScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverModal.classList.add('hidden');
    if (asyncShareModal) asyncShareModal.classList.add('hidden');
    if (roomShareModal) roomShareModal.classList.add('hidden');

    screen.classList.remove('hidden');

    if (screen === gameScreen) {
      document.body.classList.add('game-active');
    } else {
      document.body.classList.remove('game-active');
    }
  }

  // --- REGISTRO DE SERVICE WORKER (PWA) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => { if (reg) reg.update(); }).catch(() => {});
    });
  }

  // --- PERSONALIZACIÓN DE EQUIPOS Y TEMAS VISUALES ---
  const DEFAULT_LOCAL_KIT = {
    key: 'default',
    name: 'Celeste Titular',
    primary: '#0284c7',
    secondary: '#ffffff',
    accent: '#facc15',
    shorts: '#1e3a8a',
    numColor: '#ffffff'
  };

  const TEAM_KITS = {
    default: null,
    carbayon: {
      key: 'carbayon',
      name: 'Azul Carbayón',
      primary: '#003399',
      secondary: '#ffffff',
      accent: '#facc15',
      shorts: '#ffffff',
      numColor: '#facc15'
    },
    rojiblanco: {
      key: 'rojiblanco',
      name: 'Rojiblanco',
      primary: '#dc2626',
      secondary: '#ffffff',
      accent: '#1e3a8a',
      shorts: '#1e3a8a',
      numColor: '#ffffff'
    },
    blaugrana: {
      key: 'blaugrana',
      name: 'Blaugrana',
      primary: '#991b1b',
      secondary: '#1e3a8a',
      accent: '#facc15',
      shorts: '#1e3a8a',
      numColor: '#facc15'
    },
    merengue: {
      key: 'merengue',
      name: 'Blanco Real',
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      accent: '#d97706',
      shorts: '#1e293b',
      numColor: '#facc15'
    },
    verdiblanco: {
      key: 'verdiblanco',
      name: 'Verdiblanco',
      primary: '#16a34a',
      secondary: '#ffffff',
      accent: '#facc15',
      shorts: '#14532d',
      numColor: '#ffffff'
    },
    aurinegro: {
      key: 'aurinegro',
      name: 'Aurinegro',
      primary: '#facc15',
      secondary: '#0f172a',
      accent: '#f97316',
      shorts: '#0f172a',
      numColor: '#ffffff'
    },
    naranja: {
      key: 'naranja',
      name: 'Naranja Mecánica',
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#facc15',
      shorts: '#0f172a',
      numColor: '#ffffff'
    },
    violeta: {
      key: 'violeta',
      name: 'Violeta Imperial',
      primary: '#7c3aed',
      secondary: '#ffffff',
      accent: '#facc15',
      shorts: '#1e1b4b',
      numColor: '#facc15'
    }
  };

  const RIVAL_KIT_KEYS = ['carbayon', 'rojiblanco', 'blaugrana', 'merengue', 'verdiblanco', 'aurinegro', 'naranja', 'violeta'];

  // Estado persistente de dorsales y equipaciones por partida y por torneo
  let currentTournamentVisualId = null;
  let myTournamentJerseyNumber = null;
  const tournamentParticipantVisuals = new Map(); // nombre -> { kitKey, jerseyNumber }

  let myCurrentMatchNumber = 1;
  let rivalCurrentMatchNumber = 13;
  let rivalCurrentMatchKitKey = 'naranja';

  function generateRandomJerseyNumber(excludeNumber = null) {
    let num = Math.floor(Math.random() * 99) + 1;
    while (excludeNumber !== null && num === excludeNumber) {
      num = Math.floor(Math.random() * 99) + 1;
    }
    return num;
  }

  function getMySelectedKitKey() {
    const teamKitSelectEl = document.getElementById('team-kit-select');
    return (teamKitSelectEl && teamKitSelectEl.value) || localStorage.getItem('penaltazo_team_kit') || 'default';
  }

  function getMyActiveKitObject() {
    const key = getMySelectedKitKey();
    return TEAM_KITS[key] || DEFAULT_LOCAL_KIT;
  }

  function pickRandomDistinctKitKey(myKitKey) {
    const candidates = RIVAL_KIT_KEYS.filter(k => k !== myKitKey);
    return candidates[Math.floor(Math.random() * candidates.length)] || 'naranja';
  }

  function getRivalActiveKitObject() {
    const myKey = getMySelectedKitKey();
    if (!rivalCurrentMatchKitKey || rivalCurrentMatchKitKey === myKey) {
      rivalCurrentMatchKitKey = pickRandomDistinctKitKey(myKey);
    }
    return TEAM_KITS[rivalCurrentMatchKitKey] || TEAM_KITS.naranja;
  }

  function initMatchVisualIdentities(roomState) {
    const myKey = getMySelectedKitKey();
    const rivalRole = (myRole === 'P2') ? 'P1' : 'P2';
    const rivalPlayerObj = (roomState && roomState.players) ? roomState.players.find(p => p.role === rivalRole) : null;
    const rivalNameKey = (rivalPlayerObj && rivalPlayerObj.name) ? rivalPlayerObj.name : (playerNames[rivalRole] || 'Rival');

    if (isInTournament && activeTournament) {
      // En un torneo: el jugador local y cada participante mantienen el mismo dorsal y equipación todo el torneo
      if (currentTournamentVisualId !== activeTournament.id || !myTournamentJerseyNumber) {
        currentTournamentVisualId = activeTournament.id;
        myTournamentJerseyNumber = generateRandomJerseyNumber();
        tournamentParticipantVisuals.clear();
      }
      myCurrentMatchNumber = myTournamentJerseyNumber;

      if (!tournamentParticipantVisuals.has(rivalNameKey)) {
        tournamentParticipantVisuals.set(rivalNameKey, {
          kitKey: pickRandomDistinctKitKey(myKey),
          jerseyNumber: generateRandomJerseyNumber(myCurrentMatchNumber)
        });
      }
      const rivalVisual = tournamentParticipantVisuals.get(rivalNameKey);
      rivalCurrentMatchNumber = rivalVisual.jerseyNumber;
      rivalCurrentMatchKitKey = rivalVisual.kitKey === myKey ? pickRandomDistinctKitKey(myKey) : rivalVisual.kitKey;
    } else {
      // En partida 1v1, desafío asíncrono o contra la IA: dorsal y equipación mantenidos toda la tanda
      myCurrentMatchNumber = generateRandomJerseyNumber();
      if (network.mode === 'async_play' && network.asyncChallenger) {
        const chalKit = network.asyncChallenger.k;
        const chalNum = network.asyncChallenger.n;
        rivalCurrentMatchNumber = (Number.isInteger(chalNum) && chalNum >= 1 && chalNum <= 99)
          ? chalNum
          : generateRandomJerseyNumber(myCurrentMatchNumber);
        rivalCurrentMatchKitKey = (chalKit && TEAM_KITS[chalKit] && chalKit !== myKey)
          ? chalKit
          : pickRandomDistinctKitKey(myKey);
      } else {
        rivalCurrentMatchNumber = generateRandomJerseyNumber(myCurrentMatchNumber);
        rivalCurrentMatchKitKey = pickRandomDistinctKitKey(myKey);
      }
    }
  }

  function updateActiveKeeperAppearance(keeperRole = currentKeeperRole) {
    const keeperEl = document.getElementById('animated-keeper');
    const keeperNumberEl = document.getElementById('keeper-jersey-number');
    if (!keeperEl) return;

    const isLocalPlayerInGoal = (myRole === 'spectator')
      ? (keeperRole === 'P1')
      : (keeperRole === myRole);

    const activeKit = isLocalPlayerInGoal ? getMyActiveKitObject() : getRivalActiveKitObject();
    const activeNumber = isLocalPlayerInGoal ? myCurrentMatchNumber : rivalCurrentMatchNumber;

    keeperEl.style.setProperty('--keeper-primary', activeKit.primary);
    keeperEl.style.setProperty('--keeper-secondary', activeKit.secondary);
    keeperEl.style.setProperty('--keeper-accent', activeKit.accent);
    keeperEl.style.setProperty('--keeper-shorts', activeKit.shorts);
    keeperEl.style.setProperty('--keeper-num-color', activeKit.numColor || '#ffffff');

    const povGlovesEl = document.getElementById('keeper-pov-gloves');
    if (povGlovesEl) {
      povGlovesEl.style.setProperty('--keeper-accent', activeKit.accent);
    }

    if (keeperNumberEl) {
      keeperNumberEl.textContent = String(activeNumber);
    }

    // Colorear también las cajas de marcador P1 y P2 con los colores de cada uno para coherencia visual
    const p1ScoreBox = document.querySelector('.team-p1 .team-score');
    const p2ScoreBox = document.querySelector('.team-p2 .team-score');
    const myKit = getMyActiveKitObject();
    const rivKit = getRivalActiveKitObject();
    const p1Kit = (myRole === 'P2') ? rivKit : myKit;
    const p2Kit = (myRole === 'P2') ? myKit : rivKit;

    if (p1ScoreBox) {
      p1ScoreBox.style.background = `linear-gradient(180deg, ${p1Kit.primary} 0%, ${p1Kit.shorts} 140%)`;
      p1ScoreBox.style.color = p1Kit.accent;
    }
    if (p2ScoreBox) {
      p2ScoreBox.style.background = `linear-gradient(180deg, ${p2Kit.primary} 0%, ${p2Kit.shorts} 140%)`;
      p2ScoreBox.style.color = p2Kit.accent;
    }
  }

  function updateActiveShooterAppearance(shooterRole = currentShooterRole) {
    const shooterEl = document.getElementById('animated-shooter');
    const shooterNumberEl = document.getElementById('shooter-jersey-number');
    if (!shooterEl) return;

    const isLocalShooter = (myRole === 'spectator')
      ? (shooterRole === 'P1')
      : (shooterRole === myRole);

    const activeKit = isLocalShooter ? getMyActiveKitObject() : getRivalActiveKitObject();
    const activeNumber = isLocalShooter ? myCurrentMatchNumber : rivalCurrentMatchNumber;

    shooterEl.style.setProperty('--shooter-primary', activeKit.primary);
    shooterEl.style.setProperty('--shooter-secondary', activeKit.secondary);
    shooterEl.style.setProperty('--shooter-accent', activeKit.accent);
    shooterEl.style.setProperty('--shooter-shorts', activeKit.shorts);
    shooterEl.style.setProperty('--shooter-num-color', activeKit.numColor || '#ffffff');

    if (shooterNumberEl) {
      shooterNumberEl.textContent = String(activeNumber);
    }
  }

  function applyTeamKit(kitKey) {
    const root = document.documentElement;
    const kit = TEAM_KITS[kitKey];
    if (!kit) {
      document.body.removeAttribute('data-kit');
      root.style.removeProperty('--team-primary');
      root.style.removeProperty('--team-secondary');
      root.style.removeProperty('--team-accent');
      root.style.removeProperty('--team-shorts');
      updateActiveKeeperAppearance(currentKeeperRole);
      return;
    }
    document.body.setAttribute('data-kit', kitKey);
    root.style.setProperty('--team-primary', kit.primary);
    root.style.setProperty('--team-secondary', kit.secondary);
    root.style.setProperty('--team-accent', kit.accent);
    root.style.setProperty('--team-shorts', kit.shorts);
    updateActiveKeeperAppearance(currentKeeperRole);
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

  // --- FLUJO DE GRABACIÓN DEL MODO ASÍNCRONO («DESAFÍO POR ENLACE») ---
  const ASYNC_ZONE_SHORT_NAMES = [
    '↖️ Escuadra Izq.',
    '⬆️ Arriba Centro',
    '↗️ Escuadra Der.',
    '↙️ Raso Izq.',
    '⬇️ Raso Centro',
    '↘️ Raso Der.'
  ];

  function prepareAsyncRecordStep(stepNumber) {
    isResolvingTurn = false;
    hasConfirmedChoice = false;
    mySelectedCell = null;
    const isShooterStep = (stepNumber % 2 === 1);
    const roundNumber = Math.floor((stepNumber - 1) / 2) + 1;

    currentShooterRole = isShooterStep ? 'P1' : 'P2';
    currentKeeperRole = isShooterStep ? 'P2' : 'P1';
    animator.resetPositions();
    goalGrid.clearSelection();

    if (isShooterStep) {
      goalGrid.enable('shooter');
      updateActiveKeeperAppearance('P2');
      roleInstructions.innerHTML = '';
      roleInstructions.classList.add('hidden');
      myStatusBadge.className = 'status-badge waiting';
      myStatusBadge.innerHTML = `⚽ Elige disparo #${roundNumber}/5...`;
      selectedZoneLabel.textContent = `Ronda ${roundNumber} (Tiro ${roundNumber}/5): haz clic donde quieras disparar`;
      setCommentatorText(`🎯 Grabando tanda: Ronda ${roundNumber} de 5 (Tu Tiro). ¡Elige dónde vas a clavar el balón!`);
    } else {
      goalGrid.enable('keeper');
      updateActiveKeeperAppearance('P1');
      roleInstructions.innerHTML = '';
      roleInstructions.classList.add('hidden');
      myStatusBadge.className = 'status-badge waiting';
      myStatusBadge.innerHTML = `🧤 Elige estirada #${roundNumber}/5...`;
      selectedZoneLabel.textContent = `Ronda ${roundNumber} (Parada ${roundNumber}/5): haz clic hacia dónde lanzarte a parar`;
      setCommentatorText(`🧤 Grabando tanda: Ronda ${roundNumber} de 5 (Tu Parada). ¡Elige dónde vas a volar para pararlo!`, 'save');
    }

    rivalStatusBadge.className = 'status-badge ready';
    rivalStatusBadge.innerHTML = `🔗 Se guardará en el enlace`;
  }

  function startAsyncRecordingFlow(explicitName = null) {
    const name = explicitName || requireValidPlayerName();
    if (!name) return;

    isInTournament = false;
    activeTournament = null;
    myRole = 'P1';
    myCurrentMatchNumber = generateRandomJerseyNumber();
    rivalCurrentMatchNumber = generateRandomJerseyNumber(myCurrentMatchNumber);
    rivalCurrentMatchKitKey = pickRandomDistinctKitKey(getMySelectedKitKey());

    gameOverModal.classList.add('hidden');
    if (asyncShareModal) asyncShareModal.classList.add('hidden');
    if (roomShareModal) roomShareModal.classList.add('hidden');

    network.initAsyncRecordMode(name);
  }

  if (startAsyncChallengeBtn) {
    startAsyncChallengeBtn.addEventListener('click', () => {
      startAsyncRecordingFlow();
    });
  }

  if (revengeAsyncBtn) {
    revengeAsyncBtn.addEventListener('click', () => {
      const currentName = (!isDefaultOrEmptyName(playerNameInput.value) ? playerNameInput.value.trim() : playerNames.P2 || playerNames.P1) || 'Retador';
      startAsyncRecordingFlow(currentName);
    });
  }

  network.on('async_record_started', ({ playerName }) => {
    stopClientTurnTimer();
    if (turnTimerBadge) turnTimerBadge.classList.add('hidden');
    if (turnTimerBarTrack) turnTimerBarTrack.classList.add('hidden');

    showScreen(gameScreen);
    headerRoomBadge.textContent = 'Modo Asíncrono: Grabando Tanda (5 Tiros y 5 Paradas)';
    headerRoomBadge.classList.remove('hidden');

    playerNames.P1 = playerName;
    playerNames.P2 = 'Tu Colega';
    scoreboard.updatePlayerNames(`#${myCurrentMatchNumber} ${playerName} (Tus Tiros)`, '🧤 Tus Paradas');
    updateActiveKeeperAppearance('P2');

    if (h2hCounterBadge) {
      h2hCounterBadge.innerHTML = '⚔️ <strong>Modo Desafío Asíncrono</strong> • Graba tus 5 tiros y tus 5 paradas';
    }
    if (kingQueueBadge) kingQueueBadge.classList.add('hidden');

    scoreboard.render({
      scores: { P1: 0, P2: 0 },
      history: { P1: [], P2: [] },
      currentTurnIndex: 0,
      shooterRole: 'P1',
      keeperRole: 'P2',
      isSuddenDeath: false,
      suddenDeathRound: 0,
      penaltiesPerPlayer: 5,
      myRole: 'P1',
      showActiveDot: true,
      isAsyncChallenge: true
    });

    prepareAsyncRecordStep(1);
  });

  network.on('async_step_recorded', ({ stepNumber, totalSteps, role, round, row, col, cellIndex, recordedShots, recordedDives, isComplete }) => {
    isResolvingTurn = true;
    goalGrid.disable();

    if (role === 'shooter') {
      if (window.soundEngine) window.soundEngine.playKick();
      myStatusBadge.className = 'status-badge ready';
      myStatusBadge.innerHTML = `✅ Tiro #${round}/5 guardado`;
    } else {
      if (animator && animator.keeperEl) {
        animator.keeperEl.className = `goalkeeper-sprite dive-r${row}-c${col}`;
      }
      if (window.soundEngine) window.soundEngine.playSave();
      myStatusBadge.className = 'status-badge ready';
      myStatusBadge.innerHTML = `✅ Parada #${round}/5 guardada`;
    }

    const recordedHistoryP1 = recordedShots.map((idx, i) => ({
      turnIndex: i * 2,
      attempt: i + 1,
      isGoal: true,
      isOut: false,
      isPost: false
    }));

    const recordedHistoryP2 = recordedDives.map((idx, i) => ({
      turnIndex: i * 2 + 1,
      attempt: i + 1,
      isGoal: true,
      isOut: false,
      isPost: false
    }));

    scoreboard.render({
      scores: { P1: recordedShots.length, P2: recordedDives.length },
      history: { P1: recordedHistoryP1, P2: recordedHistoryP2 },
      currentTurnIndex: stepNumber,
      shooterRole: role === 'shooter' ? 'P2' : 'P1',
      keeperRole: role === 'shooter' ? 'P1' : 'P2',
      isSuddenDeath: false,
      suddenDeathRound: 0,
      penaltiesPerPlayer: 5,
      myRole: 'P1',
      showActiveDot: !isComplete,
      isAsyncChallenge: true
    });

    if (!isComplete) {
      setTimeout(() => {
        prepareAsyncRecordStep(stepNumber + 1);
      }, 460);
    } else {
      setCommentatorText('🔒 ¡Tanda completa (5 tiros y 5 paradas) grabada con éxito! Generando tu enlace...', 'goal');
      setTimeout(() => {
        openAsyncChallengeShareModal(network.playerName, recordedShots, recordedDives);
      }, 550);
    }
  });

  function openAsyncChallengeShareModal(challengerName, recordedShots, recordedDives) {
    const token = encodeAsyncChallengePayload({
      p: challengerName,
      s: recordedShots,
      d: recordedDives,
      k: getMySelectedKitKey(),
      n: myCurrentMatchNumber
    });

    let baseUrl = window.location.origin;
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && serverLocalIps.length > 0) {
      baseUrl = `http://${serverLocalIps[0]}:3000`;
    }
    const challengeUrl = `${baseUrl}/?desafio=${encodeURIComponent(token)}`;

    if (asyncRecordedSummary) {
      const shotsHtml = recordedShots
        .map((idx, i) => `<span class="async-dive-pill pill-shot"><strong>Tiro #${i + 1}:</strong> ${ASYNC_ZONE_SHORT_NAMES[idx] || 'Centro'}</span>`)
        .join('');
      const divesHtml = recordedDives
        .map((idx, i) => `<span class="async-dive-pill pill-dive"><strong>Parada #${i + 1}:</strong> ${ASYNC_ZONE_SHORT_NAMES[idx] || 'Centro'}</span>`)
        .join('');

      asyncRecordedSummary.innerHTML = `
        <div class="async-summary-label">⚽ Tus 5 tiros como lanzador:</div>
        <div class="async-dive-pills-row">${shotsHtml}</div>
        <div class="async-summary-label" style="margin-top: 0.6rem;">🧤 Tus 5 paradas como portero:</div>
        <div class="async-dive-pills-row">${divesHtml}</div>
      `;
    }

    if (asyncChallengeUrlInput) {
      asyncChallengeUrlInput.value = challengeUrl;
    }

    const challengeText =
      `⚔️ *¡DESAFÍO DE PENALTIS EN ¡PENALTAZO!* ⚽🧤\n` +
      `He grabado mi tanda completa (5 tiros y 5 paradas).\n` +
      `🎯 ¿Aceptas el reto de disputar la tanda de penaltis contra mí? 👉 ${challengeUrl}`;

    if (asyncSendWhatsappBtn) {
      asyncSendWhatsappBtn.onclick = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(challengeText)}`, '_blank', 'noopener,noreferrer');
      };
    }

    if (asyncSendTelegramBtn) {
      asyncSendTelegramBtn.onclick = () => {
        const tgText = `⚔️ ¡DESAFÍO DE PENALTIS EN ¡PENALTAZO! ⚽🧤\nHe grabado mi tanda completa (5 tiros y 5 paradas). ¿Aceptas el reto?`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(challengeUrl)}&text=${encodeURIComponent(tgText)}`, '_blank', 'noopener,noreferrer');
      };
    }

    if (asyncSendSmsBtn) {
      asyncSendSmsBtn.onclick = () => {
        const smsBody = `⚔️ ¡DESAFÍO EN ¡PENALTAZO! He grabado mi tanda completa (5 tiros y 5 paradas). ¿Aceptas el reto? Juega aquí: ${challengeUrl}`;
        window.location.href = `sms:?&body=${encodeURIComponent(smsBody)}`;
      };
    }

    if (asyncCopyUrlBtn) {
      asyncCopyUrlBtn.onclick = () => {
        copyTextWithFallback(challengeUrl, '📋 ¡Enlace del desafío copiado al portapapeles!');
      };
    }

    if (asyncShareModal) {
      asyncShareModal.classList.remove('hidden');
    }
  }

  if (asyncBackLobbyBtn) {
    asyncBackLobbyBtn.addEventListener('click', () => {
      window.location.href = window.location.pathname;
    });
  }

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
    if (shareSmsBtn) {
      shareSmsBtn.onclick = () => {
        window.location.href = `sms:?&body=${encodedFull}`;
      };
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

    if (openSecondTabBtn) {
      openSecondTabBtn.onclick = () => {
        window.open(`/?room=${encodeURIComponent(roomId)}`, '_blank');
      };
    }
  }

  // Pop-up modal para invitar oponente (Duelo 1v1)
  if (openShareModalBtn && roomShareModal) {
    openShareModalBtn.addEventListener('click', () => {
      roomShareModal.classList.remove('hidden');
    });
  }

  if (closeShareModalBtn && roomShareModal) {
    closeShareModalBtn.addEventListener('click', () => {
      roomShareModal.classList.add('hidden');
    });
  }

  if (roomShareModal) {
    roomShareModal.addEventListener('click', (e) => {
      if (e.target === roomShareModal) {
        roomShareModal.classList.add('hidden');
      }
    });
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
    if (currentTournamentVisualId !== tournament.id) {
      currentTournamentVisualId = tournament.id;
      myTournamentJerseyNumber = generateRandomJerseyNumber();
      tournamentParticipantVisuals.clear();
    }
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
  const turnTimerBarTrack = document.getElementById('turn-timer-bar-track');
  const turnTimerBarFill = document.getElementById('turn-timer-bar-fill');

  function updateTurnTimerBarState(secondsLeft, limitSeconds = 12) {
    if (!turnTimerBarFill) return;
    turnTimerBarFill.classList.remove('bar-ok', 'bar-warn', 'bar-danger');
    if (secondsLeft <= 4) {
      turnTimerBarFill.classList.add('bar-danger');
    } else if (secondsLeft <= 7) {
      turnTimerBarFill.classList.add('bar-warn');
    } else {
      turnTimerBarFill.classList.add('bar-ok');
    }
    if (turnTimerBarTrack) {
      turnTimerBarTrack.setAttribute('aria-valuemax', String(limitSeconds));
      turnTimerBarTrack.setAttribute('aria-valuenow', String(Math.max(0, secondsLeft)));
    }
  }

  function stopClientTurnTimer() {
    if (clientTurnInterval) {
      clearInterval(clientTurnInterval);
      clientTurnInterval = null;
    }
    if (turnTimerBadge) {
      turnTimerBadge.classList.remove('timer-urgent');
    }
    if (turnTimerBarFill && turnTimerBarTrack) {
      // Congelar la barra exactamente en el ancho actual cuando se resuelve el turno
      const trackWidth = turnTimerBarTrack.getBoundingClientRect().width;
      const fillWidth = turnTimerBarFill.getBoundingClientRect().width;
      const currentPct = trackWidth > 0 ? Math.max(0, Math.min(100, (fillWidth / trackWidth) * 100)) : 0;
      turnTimerBarFill.style.transition = 'none';
      turnTimerBarFill.style.width = `${currentPct.toFixed(1)}%`;
      turnTimerBarFill.classList.remove('bar-danger');
    }
  }

  function startClientTurnTimer(limitSeconds = 12) {
    stopClientTurnTimer();
    clientSecondsLeft = limitSeconds;
    if (turnTimerSecondsEl) turnTimerSecondsEl.textContent = String(clientSecondsLeft);

    if (turnTimerBarFill) {
      // Reiniciar al 100% instantáneamente y arrancar la transición lineal hacia el siguiente segundo
      turnTimerBarFill.style.transition = 'none';
      turnTimerBarFill.style.width = '100%';
      updateTurnTimerBarState(clientSecondsLeft, limitSeconds);
      void turnTimerBarFill.offsetWidth; // Forzar reflow para aplicar el 100% inicial
      turnTimerBarFill.style.transition = 'width 1s linear, background 0.25s ease';
      const nextPct = Math.max(0, ((clientSecondsLeft - 1) / limitSeconds) * 100);
      turnTimerBarFill.style.width = `${nextPct.toFixed(2)}%`;
    }

    clientTurnInterval = setInterval(() => {
      if (isResolvingTurn) {
        stopClientTurnTimer();
        return;
      }
      clientSecondsLeft = Math.max(0, clientSecondsLeft - 1);
      if (turnTimerSecondsEl) turnTimerSecondsEl.textContent = String(clientSecondsLeft);
      updateTurnTimerBarState(clientSecondsLeft, limitSeconds);

      if (turnTimerBarFill) {
        // Animar hacia el siguiente segundo para que el vaciado sea 100% continuo
        const targetAfterNextSec = Math.max(0, ((clientSecondsLeft - 1) / limitSeconds) * 100);
        turnTimerBarFill.style.width = clientSecondsLeft <= 0 ? '0%' : `${targetAfterNextSec.toFixed(2)}%`;
      }

      if (clientSecondsLeft <= 4 && clientSecondsLeft > 0) {
        if (turnTimerBadge) turnTimerBadge.classList.add('timer-urgent');
        if (clientSecondsLeft === 4 && !hasConfirmedChoice && myRole !== 'spectator') {
          setCommentatorText('⏱️ ¡¡Solo quedan 4 segundos en el reloj! ¡El árbitro se lleva el silbato a la boca!!', 'urgent');
        }
      }

      if (clientSecondsLeft <= 0) {
        if (turnTimerBarFill) {
          turnTimerBarFill.style.transition = 'none';
          turnTimerBarFill.style.width = '0%';
        }
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

    const amIShooter = (myRole === shooterRole);
    const amIKeeper = (myRole === keeperRole);

    animator.setPerspective(amIKeeper ? 'keeper' : 'shooter');
    goalGrid.clearSelection();

    if (amIShooter) {
      goalGrid.enable('shooter');
      roleInstructions.innerHTML = '';
      roleInstructions.classList.add('hidden');
    } else if (amIKeeper) {
      goalGrid.enable('keeper');
      roleInstructions.innerHTML = '';
      roleInstructions.classList.add('hidden');
    } else {
      goalGrid.disable();
      roleInstructions.classList.remove('hidden');
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

    if (network.mode === 'async_play') {
      rivalStatusBadge.className = 'status-badge ready';
      rivalStatusBadge.innerHTML = '🔒 Parada ya programada';
    } else {
      rivalStatusBadge.className = 'status-badge waiting';
      rivalStatusBadge.innerHTML = '⏳ Rival pensando...';
    }

    selectedZoneLabel.textContent = 'Haz clic en una de las 6 zonas de la portería para elegir al instante';

    if (roomState && roomState.players) {
      const p1 = roomState.players.find(p => p.role === 'P1');
      const p2 = roomState.players.find(p => p.role === 'P2');
      if (p1 && p1.name) playerNames.P1 = p1.name;
      if (p2 && p2.name) playerNames.P2 = p2.name;
      const p1Num = (myRole === 'P2') ? rivalCurrentMatchNumber : myCurrentMatchNumber;
      const p2Num = (myRole === 'P2') ? myCurrentMatchNumber : rivalCurrentMatchNumber;
      scoreboard.updatePlayerNames(
        p1 ? `#${p1Num} ${p1.role === myRole ? `${p1.name} (Tú)` : p1.name}` : `#${p1Num} Jugador 1`,
        p2 ? `#${p2Num} ${p2.role === myRole ? `${p2.name} (Tú)` : p2.name}` : `#${p2Num} Jugador 2`
      );
    }

    // Actualizar la equipación y el dorsal del portero y del tirador según el turno
    updateActiveKeeperAppearance(keeperRole);
    updateActiveShooterAppearance(shooterRole);

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
      myRole,
      isAsyncChallenge: network.mode === 'async_play'
    });

    const shooterDisplayName = playerNames[shooterRole] || 'El delantero';
    const keeperDisplayName = playerNames[keeperRole] || 'el guardameta';
    if (network.mode === 'async_play') {
      setCommentatorText(`⚔️ Desafío Asíncrono (Penalti #${(turnIndex || 0) + 1} de 5): ¡Chuta ${shooterDisplayName} contra la estirada programada de ${keeperDisplayName}!`, 'normal');
    } else if (isSuddenDeath) {
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
    if (asyncShareModal) asyncShareModal.classList.add('hidden');
    if (roomShareModal) roomShareModal.classList.add('hidden');

    if (turnTimerBadge) turnTimerBadge.classList.remove('hidden');
    if (turnTimerBarTrack) turnTimerBarTrack.classList.remove('hidden');

    if (data && data.isAsyncChallenge) {
      headerRoomBadge.textContent = '⚔️ Desafío Asíncrono';
      headerRoomBadge.classList.remove('hidden');
    }

    if (data && data.roomState && data.roomState.players) {
      const p1 = data.roomState.players.find(p => p.role === 'P1');
      const p2 = data.roomState.players.find(p => p.role === 'P2');
      if (p1 && p1.name) playerNames.P1 = p1.name;
      if (p2 && p2.name) playerNames.P2 = p2.name;
    }
    if (!data || !data.turnIndex || data.turnIndex === 0) {
      initMatchVisualIdentities(data ? data.roomState : null);
    }
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
      isPost: Boolean(data.isPost),
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
        } else if (data.isPost) {
          const isCrossbar = data.shooterChoice?.row === 0 && data.shooterChoice?.col === 1;
          setCommentatorText(`💥 ¡¡AL ${isCrossbar ? 'LARGUEROOOO' : 'PALOOOO'}!! ¡El derechazo de ${shooterName} hacia ${zoneLabel} revienta la madera y no entra!`, 'urgent');
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
          isSuddenDeath: Boolean(data.isSuddenDeath),
          suddenDeathRound: data.suddenDeathRound || 0,
          penaltiesPerPlayer: currentPenaltiesPerPlayer,
          myRole,
          showActiveDot: false,
          isAsyncChallenge: Boolean(data.isAsyncChallenge || network.mode === 'async_play')
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
  function updateRematchUI(votes = pendingRematchVotes) {
    if (revengeAsyncBtn) {
      if (network.mode === 'async_play') {
        revengeAsyncBtn.classList.remove('hidden');
        revengeAsyncBtn.innerHTML = '💥 Devolver el desafío / Venganza';
      } else {
        revengeAsyncBtn.classList.add('hidden');
      }
    }

    if (isInTournament && activeTournament) {
      returnBracketBtn.classList.remove('hidden');
      rematchBtn.classList.add('hidden');
      rematchStatus.textContent = '';
      rematchStatus.classList.remove('rematch-requested-alert');
      return;
    }

    returnBracketBtn.classList.add('hidden');
    rematchBtn.classList.remove('hidden');

    if (network.mode === 'async_play') {
      rematchStatus.textContent = '';
      rematchStatus.classList.remove('rematch-requested-alert');
      rematchBtn.removeAttribute('disabled');
      rematchBtn.classList.remove('btn-confirm', 'pulse-btn');
      rematchBtn.classList.add('btn-primary');
      rematchBtn.textContent = 'Reintentar este desafío 🔄';
      return;
    }

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
      const isAsync = Boolean(data.isAsyncChallenge || network.mode === 'async_play');
      const asyncRivalName = (network.asyncChallenger && network.asyncChallenger.p) ? network.asyncChallenger.p : playerNames.P2;

      if (isAsync) {
        if (data.winner === 'tie') {
          gameOverTitle.innerHTML = '🤝 ¡¡EMPATE TRAS LOS 10 PENALTIS!!';
          gameOverTitle.className = 'game-over-title victory';
          gameOverSubtitle.textContent = `Gran igualdad (${data.scores.P1} - ${data.scores.P2}) en la tanda ante ${asyncRivalName}. ¡Pídele la revancha o devuélvele el reto!`;
        } else if (iWon) {
          gameOverTitle.innerHTML = `🏆 ¡¡HAS GANADO LA TANDA ANTE ${asyncRivalName.toUpperCase()}!!`;
          gameOverTitle.className = 'game-over-title victory';
          gameOverSubtitle.textContent = `Te has impuesto por ${data.scores.P2} a ${data.scores.P1} goles frente a sus tiros y paradas grabadas.`;
          if (window.soundEngine) window.soundEngine.playCrowdCheer(true);
        } else {
          gameOverTitle.innerHTML = `💔 ${asyncRivalName.toUpperCase()} SE LLEVA LA TANDA`;
          gameOverTitle.className = 'game-over-title defeat';
          gameOverSubtitle.textContent = `${asyncRivalName} se impuso por ${data.scores.P1} a ${data.scores.P2} goles. ¡Devuélvele el reto y tómate la revancha!`;
        }
      } else if (isSpectator) {
        const winnerName = (data.winner === 'P1' ? playerNames.P1 : playerNames.P2) || (data.winner === 'P1' ? 'Jugador 1' : 'Jugador 2');
        gameOverTitle.textContent = `🏆 ¡${winnerName} se lleva el partido!`;
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
            <span class="team-score">${data.scores.P1}</span>
            <span class="team-label">${myRole === 'P1' ? `${playerNames.P1} (Tú)` : playerNames.P1}</span>
          </div>
          <div class="score-vs">-</div>
          <div class="score-team">
            <span class="team-score">${data.scores.P2}</span>
            <span class="team-label">${myRole === 'P2' ? `${playerNames.P2} (Tú)` : playerNames.P2}</span>
          </div>
        </div>
      `;

      if (wordleResultPreview) {
        wordleResultPreview.textContent = buildWordleShareText();
      }

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

  // --- GENERADOR DE RESULTADOS VIRALES («EFECTO WORDLE») Y TARJETA DE RESULTADO ---
  function formatShotEmojiStrip(shotList) {
    if (!Array.isArray(shotList) || shotList.length === 0) return '—';
    return shotList
      .map(shot => {
        if (shot.isGoal) return '⚽';
        if (shot.isOut || shot.isPost) return '❌';
        return '🧤';
      })
      .join('');
  }

  function buildWordleShareText() {
    const scores = (lastGameOverData && lastGameOverData.scores) ? lastGameOverData.scores : lastScores;
    const history = (lastGameOverData && lastGameOverData.history) ? lastGameOverData.history : lastHistory;
    const hadSuddenDeath = Boolean(lastGameOverData && lastGameOverData.isSuddenDeath);
    const isAsync = Boolean((lastGameOverData && lastGameOverData.isAsyncChallenge) || network.mode === 'async_play');

    const p1CleanName = (network.mode === 'async_play' && network.asyncChallenger && network.asyncChallenger.p)
      ? network.asyncChallenger.p
      : (playerNames.P1 || 'Jugador 1').replace(/\s*\(🧤 Grabado\)/i, '');
    const p2CleanName = (playerNames.P2 || 'Jugador 2').replace(/\s*\(🧤 Grabado\)/i, '');

    let suddenDeathTag = hadSuddenDeath
      ? '(¡En Muerte Súbita! 🔥)'
      : (isAsync ? '(Desafío Asíncrono ⚔️)' : '(Sin Muerte Súbita)');

    const p1Strip = formatShotEmojiStrip(history?.P1 || []);
    const p2Strip = formatShotEmojiStrip(history?.P2 || []);

    const stripsBlock = `${p1CleanName}: ${p1Strip}\n${p2CleanName}: ${p2Strip}`;

    let shareTargetUrl = 'https://penaltazo.com';
    if (isAsync && window.location.search.includes('desafio=')) {
      shareTargetUrl = `https://penaltazo.com/${window.location.search}`;
    } else if (network.mode === 'multiplayer' && network.roomId && !String(network.roomId).includes('_r')) {
      shareTargetUrl = `https://penaltazo.com/?room=${encodeURIComponent(network.roomId)}`;
    }

    return (
      `¡Acabo de disputar una tanda de penaltis en ¡PENALTAZO! ⚽🧤\n` +
      `Marcador: ${p1CleanName} ${scores.P1 ?? 0} - ${scores.P2 ?? 0} ${p2CleanName} ${suddenDeathTag}\n` +
      `${stripsBlock}\n` +
      `¿Aceptas el reto de superar mi resultado? 🎯 👉 ${shareTargetUrl}`
    );
  }

  function getShareTargetUrl() {
    const isAsync = Boolean((lastGameOverData && lastGameOverData.isAsyncChallenge) || network.mode === 'async_play');
    if (isAsync && window.location.search.includes('desafio=')) {
      return `https://penaltazo.com/${window.location.search}`;
    }
    if (network.mode === 'multiplayer' && network.roomId && !String(network.roomId).includes('_r')) {
      return `https://penaltazo.com/?room=${encodeURIComponent(network.roomId)}`;
    }
    return 'https://penaltazo.com';
  }

  function copyTextWithFallback(text, toastMessage = '📋 ¡Copiado al portapapeles! Pégalo en WhatsApp') {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => {
          showToast(toastMessage);
        })
        .catch(() => {
          fallbackExecCopy(text, toastMessage);
        });
    } else {
      fallbackExecCopy(text, toastMessage);
    }
  }

  function fallbackExecCopy(text, toastMessage) {
    try {
      const tempArea = document.createElement('textarea');
      tempArea.value = text;
      tempArea.setAttribute('readonly', '');
      tempArea.style.position = 'fixed';
      tempArea.style.opacity = '0';
      document.body.appendChild(tempArea);
      tempArea.select();
      document.execCommand('copy');
      tempArea.remove();
      showToast(toastMessage);
    } catch (e) {
      showToast('⚠️ No se pudo copiar automáticamente.');
    }
  }

  // Helper para generar el Canvas Blob de la tarjeta oficial
  function generateResultCardBlob(callback) {
    const scores = (lastGameOverData && lastGameOverData.scores) ? lastGameOverData.scores : lastScores;
    const winnerRole = (lastGameOverData && lastGameOverData.winner) ? lastGameOverData.winner : (scores.P1 >= scores.P2 ? 'P1' : 'P2');
    const winnerName = playerNames[winnerRole] || 'Campeón';
    const sWins = (lastRoomState && lastRoomState.seriesWins) ? lastRoomState.seriesWins : { P1: 0, P2: 0 };

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 460;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 800, 460);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.55, '#0369a1');
    grad.addColorStop(1, '#15803d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 460);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, 768, 428);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 32px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ DIARIO ¡PENALTAZO! — MARCADOR OFICIAL', 400, 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 26px Montserrat, sans-serif';
    ctx.fillText(`🏆 ¡${winnerName.toUpperCase()} SE LLEVA LA TANDA DE PENALTIS!`, 400, 118);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(80, 148, 640, 165);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 148, 640, 165);

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

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 20px Montserrat, sans-serif';
    ctx.fillText(`⚔️ Balance H2H Serie: ${playerNames.P1} ${sWins.P1 || 0} - ${sWins.P2 || 0} ${playerNames.P2}`, 400, 358);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 16px Montserrat, sans-serif';
    ctx.fillText('⚽ Juego hecho por Legnatore en 2026 • ¡Juega gratis en tu navegador!', 400, 412);

    canvas.toBlob((blob) => {
      callback(blob);
    }, 'image/png');
  }

  // 1. WhatsApp
  if (shareResultWaBtn) {
    shareResultWaBtn.addEventListener('click', () => {
      const text = buildWordleShareText();
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // 2. X (Twitter)
  if (shareResultXBtn) {
    shareResultXBtn.addEventListener('click', () => {
      const text = buildWordleShareText();
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(xUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // 3. Telegram
  if (shareResultTgBtn) {
    shareResultTgBtn.addEventListener('click', () => {
      const text = buildWordleShareText();
      const url = getShareTargetUrl();
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // 4. Stories de Instagram
  if (shareResultInstaBtn) {
    shareResultInstaBtn.addEventListener('click', () => {
      const text = buildWordleShareText();
      generateResultCardBlob(async (blob) => {
        if (!blob) {
          copyTextWithFallback(text, '📋 ¡Texto copiado! Pégalo en tus Stories de Instagram');
          return;
        }
        const file = new File([blob], 'penaltazo-resultado.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: '¡PENALTAZO! ⚽🧤',
              text,
              files: [file]
            });
            return;
          } catch (e) {
            if (e && e.name === 'AbortError') return;
          }
        }
        // Fallback en navegador que no soporte share con archivos
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'penaltazo-resultado.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        copyTextWithFallback(text, '📸 ¡Tarjeta descargada y texto copiado! Súbela a tus Stories de Instagram.');
      });
    });
  }

  // 5. Facebook
  if (shareResultFbBtn) {
    shareResultFbBtn.addEventListener('click', () => {
      const url = getShareTargetUrl();
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      window.open(fbUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // 6. Copiar para pegar en otra parte
  if (shareResultCopyBtn) {
    shareResultCopyBtn.addEventListener('click', () => {
      const text = buildWordleShareText();
      copyTextWithFallback(text, '📋 ¡Resultado copiado al portapapeles! Pégalo donde quieras');
    });
  }

  // 7. Descargar Tarjeta de Resultado (Imagen)
  if (downloadResultCardBtn) {
    downloadResultCardBtn.addEventListener('click', () => {
      generateResultCardBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'penaltazo-resultado.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: '¡PENALTAZO! - Resultado del Partido',
              text: buildWordleShareText(),
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
      });
    });
  }

  // --- MODAL POP-UP DE REGLAS Y PREGUNTAS FRECUENTES (FAQ) ---
  const rulesFaqModal = document.getElementById('rules-faq-modal');
  const openRulesFaqBtn = document.getElementById('open-rules-faq-btn');
  const closeRulesFaqModalBtn = document.getElementById('close-rules-faq-modal-btn');

  if (openRulesFaqBtn && rulesFaqModal) {
    openRulesFaqBtn.addEventListener('click', () => {
      rulesFaqModal.classList.remove('hidden');
    });
  }
  if (closeRulesFaqModalBtn && rulesFaqModal) {
    closeRulesFaqModalBtn.addEventListener('click', () => {
      rulesFaqModal.classList.add('hidden');
    });
  }
  if (rulesFaqModal) {
    rulesFaqModal.addEventListener('click', (e) => {
      if (e.target === rulesFaqModal) {
        rulesFaqModal.classList.add('hidden');
      }
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
