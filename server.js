const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const tournamentManager = require('./tournament-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Obtener IPs locales para facilitar conexión en red local (móviles/otros PCs)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

app.get('/api/info', (req, res) => {
  res.json({
    port: PORT,
    localIps: getLocalIpAddresses()
  });
});

// Estado de las salas en memoria
const rooms = new Map();

function generateRoomId() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let code = '';
  for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  code += '-';
  for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  return code;
}

function createNewGameRoom(roomId, penaltiesPerPlayer = 5) {
  const basePenalties = [0, 3, 5].includes(Number(penaltiesPerPlayer)) ? Number(penaltiesPerPlayer) : 5;
  return {
    id: roomId,
    players: [], // [{ id, socketId, role: 'P1'|'P2', name, connected: true, isBot: false }]
    spectators: [],
    state: 'waiting', // 'waiting', 'playing', 'resolving', 'game_over'
    penaltiesPerPlayer: basePenalties,
    turnIndex: 0,
    isSuddenDeath: basePenalties === 0,
    suddenDeathRound: basePenalties === 0 ? 1 : 0,
    scores: { P1: 0, P2: 0 },
    history: {
      P1: [],
      P2: []
    },
    choices: { P1: null, P2: null },
    rematchVotes: new Set(),
    tournamentContext: null // { tournamentId, roundIndex, matchIndex, matchId }
  };
}

function getTurnRoles(turnIndex) {
  const isP1Shooter = (turnIndex % 2 === 0);
  return {
    shooterRole: isP1Shooter ? 'P1' : 'P2',
    keeperRole: isP1Shooter ? 'P2' : 'P1'
  };
}

// Bot AI selector para partidos de torneo contra la máquina
function getBotChoice(role) {
  const rand = Math.random();
  if (role === 'shooter') {
    if (rand < 0.35) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
    if (rand < 0.70) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
    if (rand < 0.85) return { row: 1, col: 1 };
    return { row: 0, col: 1 };
  } else {
    const all = [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
    ];
    return all[Math.floor(Math.random() * all.length)];
  }
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerRole = null;
  let currentTournamentId = null;

  // --- PARTIDAS RÁPIDAS / 1v1 ---
  socket.on('join_room', ({ roomId, playerName, penaltiesPerPlayer }) => {
    const cleanRoomId = (roomId || generateRoomId()).trim().toUpperCase();
    currentRoomId = cleanRoomId;

    let room = rooms.get(cleanRoomId);
    if (!room) {
      room = createNewGameRoom(cleanRoomId, penaltiesPerPlayer !== undefined ? penaltiesPerPlayer : 5);
      rooms.set(cleanRoomId, room);
    }

    const existingP1 = room.players.find(p => p.role === 'P1');
    const existingP2 = room.players.find(p => p.role === 'P2');

    if (!existingP1 || !existingP1.connected) {
      playerRole = 'P1';
      const name = (playerName && playerName.trim()) || 'Jugador 1';
      if (!existingP1) {
        room.players.push({ id: socket.id, role: 'P1', name, connected: true, isBot: false });
      } else {
        existingP1.id = socket.id;
        existingP1.name = name;
        existingP1.connected = true;
      }
    } else if (!existingP2 || !existingP2.connected) {
      playerRole = 'P2';
      const name = (playerName && playerName.trim()) || 'Jugador 2';
      if (!existingP2) {
        room.players.push({ id: socket.id, role: 'P2', name, connected: true, isBot: false });
      } else {
        existingP2.id = socket.id;
        existingP2.name = name;
        existingP2.connected = true;
      }
    } else {
      playerRole = 'spectator';
      room.spectators.push({ id: socket.id, name: playerName || 'Espectador' });
    }

    socket.join(cleanRoomId);

    socket.emit('joined_room', {
      roomId: cleanRoomId,
      role: playerRole,
      roomState: sanitizeRoomForClient(room)
    });

    io.to(cleanRoomId).emit('room_update', sanitizeRoomForClient(room));

    const p1 = room.players.find(p => p.role === 'P1' && p.connected);
    const p2 = room.players.find(p => p.role === 'P2' && p.connected);

    if (p1 && p2 && room.state === 'waiting') {
      startNewGame(room);
    }
  });

  socket.on('submit_choice', ({ row, col }) => {
    if (!currentRoomId || !playerRole || playerRole === 'spectator') return;
    const room = rooms.get(currentRoomId);
    if (!room || room.state !== 'playing') return;

    if (row < 0 || row > 1 || col < 0 || col > 2) return;

    room.choices[playerRole] = { row, col };

    io.to(currentRoomId).emit('choice_confirmed', {
      role: playerRole
    });

    // Si el oponente es un BOT en un partido de torneo, responder automáticamente
    const botOpponent = room.players.find(p => p.isBot);
    if (botOpponent && room.choices[botOpponent.role] === null) {
      setTimeout(() => {
        if (room.state !== 'playing') return;
        const botRoles = getTurnRoles(room.turnIndex);
        const botTurnType = (botRoles.shooterRole === botOpponent.role) ? 'shooter' : 'keeper';
        room.choices[botOpponent.role] = getBotChoice(botTurnType);

        io.to(currentRoomId).emit('choice_confirmed', {
          role: botOpponent.role
        });

        if (room.choices.P1 !== null && room.choices.P2 !== null) {
          resolveTurn(room);
        }
      }, 750);
      return;
    }

    if (room.choices.P1 !== null && room.choices.P2 !== null) {
      resolveTurn(room);
    }
  });

  socket.on('request_rematch', () => {
    if (!currentRoomId || !playerRole || playerRole === 'spectator') return;
    const room = rooms.get(currentRoomId);
    if (!room || room.state !== 'game_over') return;

    room.rematchVotes.add(playerRole);
    io.to(currentRoomId).emit('rematch_status', {
      votes: Array.from(room.rematchVotes)
    });

    if (room.rematchVotes.has('P1') && room.rematchVotes.has('P2')) {
      resetGameForRematch(room);
    }
  });

  // --- GESTIÓN DE TORNEOS ELIMINATORIOS ---
  socket.on('create_tournament', ({ size, name, playerName, penaltiesPerPlayer }) => {
    const tournament = tournamentManager.createTournament({
      hostSocketId: socket.id,
      hostName: playerName,
      size,
      name,
      penaltiesPerPlayer
    });

    currentTournamentId = tournament.id;
    socket.join(tournament.id);

    socket.emit('tournament_joined', {
      tournament: tournamentManager.sanitizeTournament(tournament),
      myId: socket.id,
      isHost: true
    });
  });

  socket.on('join_tournament', ({ tournamentId, playerName }) => {
    const cleanId = (tournamentId || '').trim().toUpperCase();
    const result = tournamentManager.joinTournament({
      tournamentId: cleanId,
      socketId: socket.id,
      playerName
    });

    if (!result.success) {
      socket.emit('tournament_error', { message: result.error });
      return;
    }

    currentTournamentId = cleanId;
    socket.join(cleanId);

    const isHost = (result.tournament.hostSocketId === socket.id);
    socket.emit('tournament_joined', {
      tournament: tournamentManager.sanitizeTournament(result.tournament),
      myId: socket.id,
      isHost
    });

    io.to(cleanId).emit('tournament_updated', tournamentManager.sanitizeTournament(result.tournament));
  });

  socket.on('start_tournament', ({ tournamentId }) => {
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament || tournament.hostSocketId !== socket.id) return;

    const startedTournament = tournamentManager.startTournament(tournamentId);
    if (!startedTournament) return;

    io.to(tournamentId).emit('tournament_started', tournamentManager.sanitizeTournament(startedTournament));

    // Iniciar simulación progresiva de partidos BOT vs BOT de la primera ronda
    runBotMatchesSimulation(startedTournament);
  });

  socket.on('enter_tournament_match', ({ tournamentId, roundIndex, matchIndex }) => {
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament || tournament.status !== 'in_progress') return;

    const round = tournament.bracket[roundIndex];
    if (!round) return;
    const match = round.matches[matchIndex];
    if (!match || match.status === 'finished') return;

    const matchRoomId = `${tournamentId}_r${roundIndex}_m${matchIndex}`;
    currentRoomId = matchRoomId;

    let room = rooms.get(matchRoomId);
    if (!room) {
      room = createNewGameRoom(matchRoomId, tournament.penaltiesPerPlayer !== undefined ? tournament.penaltiesPerPlayer : 5);
      room.tournamentContext = {
        tournamentId,
        roundIndex,
        matchIndex,
        matchId: match.id,
        p1Data: match.p1,
        p2Data: match.p2
      };
      rooms.set(matchRoomId, room);
    }

    // Configurar jugadores según quién es humano y quién es bot (o P1 vs P2 humanos)
    let myRoleAssigned = 'spectator';
    if (match.p1 && (match.p1.id === socket.id || match.p1.socketId === socket.id)) {
      myRoleAssigned = 'P1';
    } else if (match.p2 && (match.p2.id === socket.id || match.p2.socketId === socket.id)) {
      myRoleAssigned = 'P2';
    } else if (match.p1 && !match.p1.isBot && match.p2 && match.p2.isBot) {
      myRoleAssigned = 'P1';
    } else if (match.p2 && !match.p2.isBot && match.p1 && match.p1.isBot) {
      myRoleAssigned = 'P2';
    }
    playerRole = myRoleAssigned;

    socket.join(matchRoomId);

    // Si P1 es BOT, agregar al bot en la sala como P1
    if (match.p1 && match.p1.isBot && !room.players.some(p => p.role === 'P1')) {
      room.players.push({
        id: match.p1.id,
        role: 'P1',
        name: match.p1.name,
        connected: true,
        isBot: true
      });
    }

    // Si P2 es BOT, agregar al bot en la sala como P2
    if (match.p2 && match.p2.isBot && !room.players.some(p => p.role === 'P2')) {
      room.players.push({
        id: match.p2.id,
        role: 'P2',
        name: match.p2.name,
        connected: true,
        isBot: true
      });
    }

    // Registrar al jugador humano en la sala con su rol real
    if (myRoleAssigned === 'P1' || myRoleAssigned === 'P2') {
      const humanData = myRoleAssigned === 'P1' ? match.p1 : match.p2;
      const existingHuman = room.players.find(p => p.role === myRoleAssigned);
      if (!existingHuman) {
        room.players.push({
          id: socket.id,
          role: myRoleAssigned,
          name: humanData ? humanData.name : 'Jugador',
          connected: true,
          isBot: false
        });
      } else {
        existingHuman.id = socket.id;
        existingHuman.connected = true;
      }
    }

    match.status = 'playing';
    io.to(tournamentId).emit('tournament_updated', tournamentManager.sanitizeTournament(tournament));

    socket.emit('joined_room', {
      roomId: matchRoomId,
      role: playerRole,
      roomState: sanitizeRoomForClient(room),
      tournamentContext: room.tournamentContext
    });

    // Si ambos participantes están listos (o uno es bot), arrancar partido
    const hasP1 = room.players.some(p => p.role === 'P1');
    const hasP2 = room.players.some(p => p.role === 'P2');
    if (hasP1 && hasP2 && room.state === 'waiting') {
      startNewGame(room);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const p = room.players.find(pl => pl.id === socket.id);
        if (p) {
          p.connected = false;
          io.to(currentRoomId).emit('player_left', {
            role: p.role,
            name: p.name,
            roomState: sanitizeRoomForClient(room)
          });
        }
      }
    }

    if (currentTournamentId) {
      const disc = tournamentManager.handleDisconnect(socket.id);
      if (disc) {
        const t = tournamentManager.getTournament(currentTournamentId);
        if (t) {
          io.to(currentTournamentId).emit('tournament_updated', tournamentManager.sanitizeTournament(t));
        }
      }
    }
  });
});

function startNewGame(room) {
  room.state = 'playing';
  room.turnIndex = 0;
  room.isSuddenDeath = (room.penaltiesPerPlayer === 0);
  room.suddenDeathRound = (room.penaltiesPerPlayer === 0) ? 1 : 0;
  room.scores = { P1: 0, P2: 0 };
  room.history = { P1: [], P2: [] };
  room.choices = { P1: null, P2: null };
  room.rematchVotes.clear();

  const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);

  io.to(room.id).emit('game_started', {
    turnIndex: room.turnIndex,
    shooterRole,
    keeperRole,
    isSuddenDeath: room.isSuddenDeath,
    suddenDeathRound: room.suddenDeathRound,
    penaltiesPerPlayer: room.penaltiesPerPlayer,
    roomState: sanitizeRoomForClient(room)
  });
}

function resolveTurn(room) {
  room.state = 'resolving';

  const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);
  const shooterChoice = room.choices[shooterRole];
  const keeperChoice = room.choices[keeperRole];

  // Cualquier disparo que NO sea raso al centro (row: 1, col: 1) tiene una mínima probabilidad (12%) de irse fuera
  const isLowCenter = (shooterChoice.row === 1 && shooterChoice.col === 1);
  const isOut = !isLowCenter && (Math.random() < 0.12);

  const isGoal = !isOut && (shooterChoice.row !== keeperChoice.row || shooterChoice.col !== keeperChoice.col);

  if (isGoal) {
    room.scores[shooterRole] += 1;
  }

  const attemptNumber = room.history[shooterRole].length + 1;
  const turnRecord = {
    turnIndex: room.turnIndex,
    attempt: attemptNumber,
    isGoal,
    isOut,
    shooterChoice,
    keeperChoice,
    isSuddenDeath: room.isSuddenDeath
  };
  room.history[shooterRole].push(turnRecord);

  const nextTurnIndex = room.turnIndex + 1;
  let gameOver = false;
  let winner = null;
  let nextIsSuddenDeath = room.isSuddenDeath;
  let nextSuddenDeathRound = room.suddenDeathRound;
  const totalRegularTurns = (room.penaltiesPerPlayer || 0) * 2;

  if (!room.isSuddenDeath) {
    if (nextTurnIndex >= totalRegularTurns) {
      if (room.scores.P1 > room.scores.P2) {
        gameOver = true;
        winner = 'P1';
      } else if (room.scores.P2 > room.scores.P1) {
        gameOver = true;
        winner = 'P2';
      } else {
        nextIsSuddenDeath = true;
        nextSuddenDeathRound = 1;
      }
    }
  } else {
    if (nextTurnIndex % 2 === 0) {
      if (room.scores.P1 > room.scores.P2) {
        gameOver = true;
        winner = 'P1';
      } else if (room.scores.P2 > room.scores.P1) {
        gameOver = true;
        winner = 'P2';
      } else {
        nextSuddenDeathRound += 1;
      }
    }
  }

  io.to(room.id).emit('turn_resolved', {
    turnIndex: room.turnIndex,
    shooterRole,
    keeperRole,
    shooterChoice,
    keeperChoice,
    isGoal,
    isOut,
    scores: { ...room.scores },
    history: {
      P1: [...room.history.P1],
      P2: [...room.history.P2]
    },
    gameOver,
    winner,
    nextIsSuddenDeath,
    nextSuddenDeathRound,
    nextTurnIndex,
    penaltiesPerPlayer: room.penaltiesPerPlayer
  });

  room.choices = { P1: null, P2: null };
  room.turnIndex = nextTurnIndex;
  room.isSuddenDeath = nextIsSuddenDeath;
  room.suddenDeathRound = nextSuddenDeathRound;

  if (gameOver) {
    room.state = 'game_over';

    // Si este partido pertenece a un torneo, registrar el resultado en el cuadro
    if (room.tournamentContext) {
      const { tournamentId, roundIndex, matchIndex, p1Data, p2Data } = room.tournamentContext;
      const winnerParticipant = (winner === 'P1') ? p1Data : p2Data;
      const matchScore = { p1: room.scores.P1, p2: room.scores.P2 };

      const outcome = tournamentManager.recordMatchResult(
        tournamentId,
        roundIndex,
        matchIndex,
        winnerParticipant,
        matchScore
      );

      if (outcome) {
        io.to(tournamentId).emit('tournament_match_finished', {
          tournament: tournamentManager.sanitizeTournament(outcome.tournament),
          matchId: room.tournamentContext.matchId,
          winner: winnerParticipant,
          scores: matchScore,
          tournamentCompleted: outcome.tournamentCompleted
        });

        io.to(tournamentId).emit('tournament_updated', tournamentManager.sanitizeTournament(outcome.tournament));

        // Si hay nuevos partidos bot vs bot listos para simular
        runBotMatchesSimulation(outcome.tournament);
      }
    }
  } else {
    setTimeout(() => {
      if (room.state === 'resolving') {
        room.state = 'playing';
        const nextRoles = getTurnRoles(room.turnIndex);
        io.to(room.id).emit('next_turn_ready', {
          turnIndex: room.turnIndex,
          shooterRole: nextRoles.shooterRole,
          keeperRole: nextRoles.keeperRole,
          isSuddenDeath: room.isSuddenDeath,
          suddenDeathRound: room.suddenDeathRound,
          penaltiesPerPlayer: room.penaltiesPerPlayer,
          roomState: sanitizeRoomForClient(room)
        });
      }
    }, 4200);
  }
}

function resetGameForRematch(room) {
  startNewGame(room);
}

function sanitizeRoomForClient(room) {
  return {
    id: room.id,
    players: room.players.map(p => ({
      role: p.role,
      name: p.name,
      connected: p.connected,
      isBot: p.isBot
    })),
    state: room.state,
    penaltiesPerPlayer: room.penaltiesPerPlayer,
    turnIndex: room.turnIndex,
    isSuddenDeath: room.isSuddenDeath,
    suddenDeathRound: room.suddenDeathRound,
    scores: room.scores,
    history: room.history,
    p1Chosen: room.choices.P1 !== null,
    p2Chosen: room.choices.P2 !== null,
    tournamentContext: room.tournamentContext
  };
}

// Simula progresivamente partidos entre dos bots con pausas realistas
function runBotMatchesSimulation(tournament) {
  if (!tournament || tournament.status !== 'in_progress') return;

  const currentRound = tournament.bracket[tournament.currentRoundIndex];
  if (!currentRound) return;

  currentRound.matches.forEach((match, idx) => {
    if (match.status === 'ready' && match.p1 && match.p2 && match.p1.isBot && match.p2.isBot) {
      match.status = 'playing';
      // Simular con una breve pausa de tensión (1.2 a 2.5s)
      const delay = 1200 + idx * 800;
      setTimeout(() => {
        const simResult = tournamentManager.simulateBotMatch(match, tournament.penaltiesPerPlayer);
        const outcome = tournamentManager.recordMatchResult(
          tournament.id,
          match.roundIndex,
          match.matchIndex,
          simResult.winner,
          simResult.score
        );

        if (outcome) {
          io.to(tournament.id).emit('tournament_match_finished', {
            tournament: tournamentManager.sanitizeTournament(outcome.tournament),
            matchId: match.id,
            winner: simResult.winner,
            scores: simResult.score,
            tournamentCompleted: outcome.tournamentCompleted
          });
          io.to(tournament.id).emit('tournament_updated', tournamentManager.sanitizeTournament(outcome.tournament));

          // Si la ronda se completó con este partido, revisar si la siguiente tiene bots
          if (outcome.roundCompleted && !outcome.tournamentCompleted) {
            runBotMatchesSimulation(outcome.tournament);
          }
        }
      }, delay);
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`⚽ ¡PENALTAZO! - TANDA DE PENALTIS A CIEGAS 🧤`);
  console.log(`Servidor activo en puerto ${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    console.log(`Acceso en red local (móviles/otros PCs):`);
    ips.forEach(ip => console.log(`   http://${ip}:${PORT}`));
  }
  console.log(`===============================================`);
});
