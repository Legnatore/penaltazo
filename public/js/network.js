/**
 * Gestor de red y multijugador con Socket.io.
 * También soporta modo local/IA simulando el mismo protocolo de eventos.
 */
class NetworkManager {
  constructor() {
    this.socket = null;
    this.mode = 'multiplayer'; // 'multiplayer' | 'ai'
    this.roomId = null;
    this.playerRole = null;
    this.playerName = 'Tú';
    this.ai = new AIOpponent();
    this.callbacks = {};

    // Estado simulado para el modo IA
    this.localState = {
      turnIndex: 0,
      scores: { P1: 0, P2: 0 },
      history: { P1: [], P2: [] },
      isSuddenDeath: false,
      suddenDeathRound: 0,
      state: 'waiting'
    };
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
    if (typeof io !== 'undefined') {
      this.socket = io(serverUrl, {
        reconnectionAttempts: 5,
        timeout: 10000
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
    } else {
      console.warn('Socket.io no encontrado. Iniciando en modo offline/IA.');
      this.initAIMode();
    }
  }

  joinRoom(roomId, playerName) {
    this.playerName = playerName || 'Jugador 1';
    if (this.mode === 'multiplayer' && this.socket) {
      this.socket.emit('join_room', { roomId, playerName: this.playerName });
    } else {
      this.initAIMode(roomId, playerName);
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

  // --- MODO OFFLINE / CONTRA LA IA ---
  initAIMode(roomId = 'SOLO-AI', playerName = 'Tirador') {
    this.mode = 'ai';
    this.roomId = roomId;
    this.playerRole = 'P1';
    this.playerName = playerName;

    setTimeout(() => {
      this.trigger('joined_room', {
        roomId: this.roomId,
        role: 'P1',
        roomState: {
          id: this.roomId,
          players: [
            { role: 'P1', name: this.playerName, connected: true },
            { role: 'P2', name: 'Robot Portero (IA)', connected: true }
          ],
          state: 'waiting'
        }
      });
      this.startAIGame();
    }, 200);
  }

  startAIGame() {
    this.ai.reset();
    this.localState = {
      turnIndex: 0,
      scores: { P1: 0, P2: 0 },
      history: { P1: [], P2: [] },
      isSuddenDeath: false,
      suddenDeathRound: 0,
      state: 'playing'
    };

    this.trigger('game_started', {
      turnIndex: 0,
      shooterRole: 'P1',
      keeperRole: 'P2',
      isSuddenDeath: false,
      roomState: {
        id: this.roomId,
        players: [
          { role: 'P1', name: this.playerName, connected: true },
          { role: 'P2', name: 'Robot Portero (IA)', connected: true }
        ],
        scores: { P1: 0, P2: 0 },
        history: { P1: [], P2: [] }
      }
    });
  }

  handleAIChoice(humanRow, humanCol) {
    // Turno: si turnIndex es par: P1 (Humano) tira, P2 (IA) para
    // Si turnIndex es impar: P2 (IA) tira, P1 (Humano) para
    const isHumanShooter = (this.localState.turnIndex % 2 === 0);
    const shooterRole = isHumanShooter ? 'P1' : 'P2';
    const keeperRole = isHumanShooter ? 'P2' : 'P1';

    this.trigger('choice_confirmed', { role: 'P1' });

    // La IA elige con un leve retardo realista (400-800ms)
    setTimeout(() => {
      this.trigger('choice_confirmed', { role: 'P2' });

      const aiRoleType = isHumanShooter ? 'keeper' : 'shooter';
      const aiChoice = this.ai.decide(aiRoleType);

      const shooterChoice = isHumanShooter ? { row: humanRow, col: humanCol } : aiChoice;
      const keeperChoice = isHumanShooter ? aiChoice : { row: humanRow, col: humanCol };

      if (isHumanShooter) {
        this.ai.recordHumanChoice(humanRow, humanCol);
      }

      const isGoal = (shooterChoice.row !== keeperChoice.row || shooterChoice.col !== keeperChoice.col);

      if (isGoal) {
        this.localState.scores[shooterRole] += 1;
      }

      const turnRecord = {
        turnIndex: this.localState.turnIndex,
        attempt: this.localState.history[shooterRole].length + 1,
        isGoal,
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

      if (!this.localState.isSuddenDeath) {
        if (nextTurnIndex >= 10) {
          if (this.localState.scores.P1 > this.localState.scores.P2) {
            gameOver = true;
            winner = 'P1';
          } else if (this.localState.scores.P2 > this.localState.scores.P1) {
            gameOver = true;
            winner = 'P2';
          } else {
            nextIsSuddenDeath = true;
            nextSuddenDeathRound = 1;
          }
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

      this.trigger('turn_resolved', {
        turnIndex: this.localState.turnIndex,
        shooterRole,
        keeperRole,
        shooterChoice,
        keeperChoice,
        isGoal,
        scores: { ...this.localState.scores },
        history: {
          P1: [...this.localState.history.P1],
          P2: [...this.localState.history.P2]
        },
        gameOver,
        winner,
        nextIsSuddenDeath,
        nextSuddenDeathRound,
        nextTurnIndex
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
            suddenDeathRound: this.localState.suddenDeathRound
          });
        }, 4200);
      }
    }, 600);
  }
}

window.NetworkManager = NetworkManager;
