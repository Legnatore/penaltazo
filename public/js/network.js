/**
 * Gestor de red y multijugador con Socket.io.
 * Soporta partidas rápidas 1v1, torneos eliminatorios de 4, 8 y 16 competidores,
 * y modo local/IA simulando el mismo protocolo de eventos.
 */
class NetworkManager {
  constructor() {
    this.socket = null;
    this.mode = 'multiplayer'; // 'multiplayer' | 'ai'
    this.roomId = null;
    this.activeTournamentId = null;
    this.playerRole = null;
    this.playerName = 'Tú';
    this.penaltiesPerPlayer = 5;
    this.ai = new AIOpponent();
    this.callbacks = {};

    // Identificador único de pestaña para reconexiones transparentes al volver de WhatsApp/Telegram
    let savedClientId = null;
    try {
      savedClientId = sessionStorage.getItem('penaltazo_client_id');
      if (!savedClientId) {
        savedClientId = 'cid_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        sessionStorage.setItem('penaltazo_client_id', savedClientId);
      }
    } catch (e) {
      savedClientId = 'cid_' + Math.random().toString(36).substring(2, 10);
    }
    this.clientId = savedClientId;

    // Estado simulado para el modo IA
    this.localState = {
      turnIndex: 0,
      scores: { P1: 0, P2: 0 },
      history: { P1: [], P2: [] },
      isSuddenDeath: false,
      suddenDeathRound: 0,
      state: 'waiting'
    };

    // Cuando el usuario vuelve de la app de WhatsApp/Telegram al navegador móvil, reconectar y sincronizar sala
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.mode === 'multiplayer' && this.socket) {
          if (!this.socket.connected) {
            this.socket.connect();
          } else if (this.roomId && !this.activeTournamentId && !String(this.roomId).includes('_r')) {
            this.socket.emit('join_room', {
              roomId: this.roomId,
              playerName: this.playerName,
              penaltiesPerPlayer: this.penaltiesPerPlayer,
              clientId: this.clientId,
              isAutoReconnect: true
            });
          }
        }
      });
    }
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  initMultiplayer(serverUrl = '') {
    this.mode = 'multiplayer';
    if (this.socket) return; // Ya inicializado

    if (typeof io !== 'undefined') {
      this.socket = io(serverUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        // Si estábamos en una sala 1v1 y el socket se reconectó (ej. tras volver de WhatsApp), re-entrar automáticamente
        if (this.mode === 'multiplayer' && this.roomId && !this.activeTournamentId && !String(this.roomId).includes('_r')) {
          this.socket.emit('join_room', {
            roomId: this.roomId,
            playerName: this.playerName,
            penaltiesPerPlayer: this.penaltiesPerPlayer,
            clientId: this.clientId,
            isAutoReconnect: true
          });
        } else if (this.mode === 'multiplayer' && this.activeTournamentId) {
          this.socket.emit('join_tournament', {
            tournamentId: this.activeTournamentId,
            playerName: this.playerName
          });
        }
      });

      this.socket.on('joined_room', (data) => {
        this.roomId = data.roomId;
        this.playerRole = data.role;
        this.trigger('joined_room', data);
      });

      this.socket.on('room_update', (data) => {
        this.trigger('room_update', data);
      });

      this.socket.on('game_started', (data) => {
        this.trigger('game_started', data);
      });

      this.socket.on('choice_confirmed', (data) => {
        this.trigger('choice_confirmed', data);
      });

      this.socket.on('turn_resolved', (data) => {
        this.trigger('turn_resolved', data);
      });

      this.socket.on('next_turn_ready', (data) => {
        this.trigger('next_turn_ready', data);
      });

      this.socket.on('player_left', (data) => {
        this.trigger('player_left', data);
      });

      this.socket.on('rematch_status', (data) => {
        this.trigger('rematch_status', data);
      });

      this.socket.on('emote_received', (data) => {
        this.trigger('emote_received', data);
      });

      this.socket.on('turn_timeout_auto', (data) => {
        this.trigger('turn_timeout_auto', data);
      });

      this.socket.on('role_swapped', (data) => {
        if (data && data.p1ClientId === this.clientId) {
          this.playerRole = 'P1';
        } else if (data && data.p2ClientId === this.clientId) {
          this.playerRole = 'P2';
        } else {
          this.playerRole = 'spectator';
        }
        this.trigger('role_swapped', {
          ...data,
          myNewRole: this.playerRole
        });
      });

      // Eventos del sistema de torneos
      this.socket.on('tournament_joined', (data) => {
        if (data && data.tournament && data.tournament.id) {
          this.activeTournamentId = data.tournament.id;
        }
        this.trigger('tournament_joined', data);
      });

      this.socket.on('tournament_updated', (data) => {
        this.trigger('tournament_updated', data);
      });

      this.socket.on('tournament_started', (data) => {
        this.trigger('tournament_started', data);
      });

      this.socket.on('tournament_match_finished', (data) => {
        this.trigger('tournament_match_finished', data);
      });

      this.socket.on('tournament_error', (data) => {
        this.trigger('tournament_error', data);
      });

    } else {
      console.warn('Socket.io no encontrado. Iniciando en modo offline/IA.');
      this.initAIMode();
    }
  }

  // --- PARTIDAS 1v1 ---
  joinRoom(roomId, playerName, penaltiesPerPlayer = 5, isAutoReconnect = false) {
    this.playerName = playerName || 'Jugador 1';
    this.penaltiesPerPlayer = penaltiesPerPlayer;
    this.activeTournamentId = null;
    if (this.mode === 'multiplayer' && this.socket) {
      this.socket.emit('join_room', {
        roomId,
        playerName: this.playerName,
        penaltiesPerPlayer,
        clientId: this.clientId,
        isAutoReconnect
      });
    } else {
      this.initAIMode(roomId, playerName, penaltiesPerPlayer);
    }
  }

  submitChoice(row, col) {
    if (this.mode === 'multiplayer' && this.socket) {
      this.socket.emit('submit_choice', { row, col });
    } else if (this.mode === 'ai') {
      this.handleAIChoice(row, col);
    }
  }

  requestRematch() {
    if (this.mode === 'multiplayer' && this.socket) {
      this.socket.emit('request_rematch');
    } else if (this.mode === 'ai') {
      this.startAIGame();
    }
  }

  sendEmote(emoji, text) {
    if (this.mode === 'multiplayer' && this.socket) {
      this.socket.emit('send_emote', { emoji, text });
    } else if (this.mode === 'ai') {
      this.trigger('emote_received', {
        role: 'P1',
        playerName: this.playerName,
        emoji,
        text
      });
      // La IA responde con un emote de su personalidad
      if (Math.random() < 0.78) {
        setTimeout(() => {
          const aiEmote = this.ai.getRandomEmote();
          this.trigger('emote_received', {
            role: 'P2',
            playerName: this.aiName || 'IA',
            emoji: aiEmote.emoji,
            text: aiEmote.text
          });
        }, 750);
      }
    }
  }

  // --- SISTEMA DE TORNEOS ---
  createTournament(size, name, playerName, penaltiesPerPlayer = 5) {
    this.initMultiplayer();
    if (this.socket) {
      this.socket.emit('create_tournament', { size, name, playerName, penaltiesPerPlayer });
    }
  }

  joinTournament(tournamentId, playerName) {
    this.initMultiplayer();
    if (this.socket) {
      this.socket.emit('join_tournament', { tournamentId, playerName });
    }
  }

  startTournament(tournamentId) {
    if (this.socket) {
      this.socket.emit('start_tournament', { tournamentId });
    }
  }

  enterTournamentMatch(tournamentId, roundIndex, matchIndex) {
    if (this.socket) {
      this.socket.emit('enter_tournament_match', { tournamentId, roundIndex, matchIndex });
    }
  }

  // --- MODO OFFLINE / CONTRA LA IA ---
  initAIMode(roomId = 'SOLO-AI', playerName = 'Tirador', penaltiesPerPlayer = 5, personality = 'psicologo') {
    this.mode = 'ai';
    this.roomId = roomId;
    this.playerRole = 'P1';
    this.playerName = playerName;
    this.ai.setPersonality(personality || 'psicologo');
    this.aiName = this.ai.getRandomBotName(this.ai.personality);
    this.penaltiesPerPlayer = [0, 3, 5].includes(Number(penaltiesPerPlayer)) ? Number(penaltiesPerPlayer) : 5;
    this.localSeriesWins = { P1: 0, P2: 0 };
    this.localKingRole = null;
    this.localKingStreak = 0;

    setTimeout(() => {
      this.trigger('joined_room', {
        roomId: this.roomId,
        role: 'P1',
        roomState: {
          id: this.roomId,
          penaltiesPerPlayer: this.penaltiesPerPlayer,
          seriesWins: { ...this.localSeriesWins },
          kingStreak: this.localKingStreak,
          challengerQueue: [],
          players: [
            { role: 'P1', name: this.playerName, connected: true },
            { role: 'P2', name: this.aiName, connected: true }
          ],
          state: 'waiting'
        }
      });
      this.startAIGame();
    }, 200);
  }

  startAIGame() {
    this.ai.reset();
    if (!this.aiName) this.aiName = this.ai.getRandomBotName(this.ai.personality);
    if (!this.localSeriesWins) this.localSeriesWins = { P1: 0, P2: 0 };
    const basePenalties = this.penaltiesPerPlayer !== undefined ? this.penaltiesPerPlayer : 5;
    this.localState = {
      penaltiesPerPlayer: basePenalties,
      turnIndex: 0,
      scores: { P1: 0, P2: 0 },
      history: { P1: [], P2: [] },
      isSuddenDeath: basePenalties === 0,
      suddenDeathRound: basePenalties === 0 ? 1 : 0,
      state: 'playing'
    };

    this.trigger('game_started', {
      turnIndex: 0,
      shooterRole: 'P1',
      keeperRole: 'P2',
      isSuddenDeath: this.localState.isSuddenDeath,
      suddenDeathRound: this.localState.suddenDeathRound,
      penaltiesPerPlayer: basePenalties,
      turnTimeLimit: 12,
      roomState: {
        id: this.roomId,
        penaltiesPerPlayer: basePenalties,
        seriesWins: { ...this.localSeriesWins },
        kingRole: this.localKingRole,
        kingStreak: this.localKingStreak || 0,
        challengerQueue: [],
        players: [
          { role: 'P1', name: this.playerName, connected: true },
          { role: 'P2', name: this.aiName, connected: true }
        ],
        scores: { P1: 0, P2: 0 },
        history: { P1: [], P2: [] }
      }
    });
  }

  handleAIChoice(humanRow, humanCol) {
    const isHumanShooter = (this.localState.turnIndex % 2 === 0);
    const shooterRole = isHumanShooter ? 'P1' : 'P2';
    const keeperRole = isHumanShooter ? 'P2' : 'P1';

    this.trigger('choice_confirmed', { role: 'P1' });

    setTimeout(() => {
      this.trigger('choice_confirmed', { role: 'P2' });

      const aiRoleType = isHumanShooter ? 'keeper' : 'shooter';
      const aiChoice = this.ai.decide(aiRoleType);

      const shooterChoice = isHumanShooter ? { row: humanRow, col: humanCol } : aiChoice;
      const keeperChoice = isHumanShooter ? aiChoice : { row: humanRow, col: humanCol };

      if (isHumanShooter) {
        this.ai.recordHumanChoice(humanRow, humanCol);
      } else {
        this.ai.recordHumanKeeperChoice(humanRow, humanCol);
      }

      // Cualquier disparo que NO sea raso al centro (row: 1, col: 1) tiene una mínima probabilidad (12%) de irse fuera
      const isLowCenter = (shooterChoice.row === 1 && shooterChoice.col === 1);
      const isOut = !isLowCenter && (Math.random() < 0.12);

      const isGoal = !isOut && (shooterChoice.row !== keeperChoice.row || shooterChoice.col !== keeperChoice.col);

      if (isGoal) {
        this.localState.scores[shooterRole] += 1;
      }

      const turnRecord = {
        turnIndex: this.localState.turnIndex,
        attempt: this.localState.history[shooterRole].length + 1,
        isGoal,
        isOut,
        shooterChoice,
        keeperChoice,
        isSuddenDeath: this.localState.isSuddenDeath
      };
      this.localState.history[shooterRole].push(turnRecord);

      const nextTurnIndex = this.localState.turnIndex + 1;
      let gameOver = false;
      let winner = null;
      let nextIsSuddenDeath = this.localState.isSuddenDeath;
      let nextSuddenDeathRound = this.localState.suddenDeathRound;
      const basePenalties = this.localState.penaltiesPerPlayer || 0;
      const totalRegularTurns = basePenalties * 2;

      if (!this.localState.isSuddenDeath) {
        const p1Remaining = Math.max(0, basePenalties - this.localState.history.P1.length);
        const p2Remaining = Math.max(0, basePenalties - this.localState.history.P2.length);

        if (this.localState.scores.P1 > this.localState.scores.P2 + p2Remaining) {
          gameOver = true;
          winner = 'P1';
        } else if (this.localState.scores.P2 > this.localState.scores.P1 + p1Remaining) {
          gameOver = true;
          winner = 'P2';
        } else if (nextTurnIndex >= totalRegularTurns) {
          nextIsSuddenDeath = true;
          nextSuddenDeathRound = 1;
        }
      } else {
        if (nextTurnIndex % 2 === 0) {
          if (this.localState.scores.P1 > this.localState.scores.P2) {
            gameOver = true;
            winner = 'P1';
          } else if (this.localState.scores.P2 > this.localState.scores.P1) {
            gameOver = true;
            winner = 'P2';
          } else {
            nextSuddenDeathRound += 1;
          }
        }
      }

      if (gameOver && winner) {
        if (!this.localSeriesWins) this.localSeriesWins = { P1: 0, P2: 0 };
        this.localSeriesWins[winner] = (this.localSeriesWins[winner] || 0) + 1;
        if (this.localKingRole === winner) {
          this.localKingStreak = (this.localKingStreak || 1) + 1;
        } else {
          this.localKingRole = winner;
          this.localKingStreak = 1;
        }
      }

      this.trigger('turn_resolved', {
        turnIndex: this.localState.turnIndex,
        shooterRole,
        keeperRole,
        shooterChoice,
        keeperChoice,
        isGoal,
        isOut,
        scores: { ...this.localState.scores },
        history: {
          P1: [...this.localState.history.P1],
          P2: [...this.localState.history.P2]
        },
        gameOver,
        winner,
        nextIsSuddenDeath,
        nextSuddenDeathRound,
        nextTurnIndex,
        penaltiesPerPlayer: this.localState.penaltiesPerPlayer,
        roomState: {
          id: this.roomId,
          penaltiesPerPlayer: this.localState.penaltiesPerPlayer,
          seriesWins: { ...(this.localSeriesWins || { P1: 0, P2: 0 }) },
          kingRole: this.localKingRole,
          kingStreak: this.localKingStreak || 0,
          challengerQueue: [],
          players: [
            { role: 'P1', name: this.playerName, connected: true },
            { role: 'P2', name: this.aiName || 'Robot IA', connected: true }
          ],
          scores: { ...this.localState.scores },
          history: {
            P1: [...this.localState.history.P1],
            P2: [...this.localState.history.P2]
          }
        }
      });

      this.localState.turnIndex = nextTurnIndex;
      this.localState.isSuddenDeath = nextIsSuddenDeath;
      this.localState.suddenDeathRound = nextSuddenDeathRound;

      if (!gameOver) {
        setTimeout(() => {
          const nextRoles = {
            shooterRole: (this.localState.turnIndex % 2 === 0) ? 'P1' : 'P2',
            keeperRole: (this.localState.turnIndex % 2 === 0) ? 'P2' : 'P1'
          };
          this.trigger('next_turn_ready', {
            turnIndex: this.localState.turnIndex,
            shooterRole: nextRoles.shooterRole,
            keeperRole: nextRoles.keeperRole,
            isSuddenDeath: this.localState.isSuddenDeath,
            suddenDeathRound: this.localState.suddenDeathRound,
            penaltiesPerPlayer: this.localState.penaltiesPerPlayer,
            turnTimeLimit: 12,
            roomState: {
              id: this.roomId,
              penaltiesPerPlayer: this.localState.penaltiesPerPlayer,
              seriesWins: { ...(this.localSeriesWins || { P1: 0, P2: 0 }) },
              kingRole: this.localKingRole,
              kingStreak: this.localKingStreak || 0,
              challengerQueue: [],
              players: [
                { role: 'P1', name: this.playerName, connected: true },
                { role: 'P2', name: this.aiName || 'Robot IA', connected: true }
              ],
              scores: { ...this.localState.scores },
              history: {
                P1: [...this.localState.history.P1],
                P2: [...this.localState.history.P2]
              }
            }
          });
        }, 4200);
      }
    }, 600);
  }
}

window.NetworkManager = NetworkManager;
