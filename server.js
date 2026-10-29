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

const TURN_TIME_LIMIT_SEC = 12;

function createNewGameRoom(roomId, penaltiesPerPlayer = 5) {
  const basePenalties = [0, 3, 5].includes(Number(penaltiesPerPlayer)) ? Number(penaltiesPerPlayer) : 5;
  return {
    id: roomId,
    players: [], // [{ id, clientId, role: 'P1'|'P2', name, connected: true, isBot: false }]
    spectators: [],
    challengerQueue: [], // [{ id, clientId, name, connected: true }] -> Cola para Modo "Rey de la Pista"
    state: 'waiting', // 'waiting', 'playing', 'resolving', 'game_over'
    penaltiesPerPlayer: basePenalties,
    turnIndex: 0,
    isSuddenDeath: basePenalties === 0,
    suddenDeathRound: basePenalties === 0 ? 1 : 0,
    scores: { P1: 0, P2: 0 },
    seriesWins: { P1: 0, P2: 0 },
    h2hWins: {},
    kingRole: null,
    kingStreak: 0,
    lastWinnerRole: null,
    turnDeadline: null,
    turnTimer: null,
    history: {
      P1: [],
      P2: []
    },
    choices: { P1: null, P2: null },
    rematchVotes: new Set(),
    tournamentContext: null // { tournamentId, roundIndex, matchIndex, matchId }
  };
}

function clearTurnTimer(room) {
  if (room && room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

function scheduleTurnTimer(room) {
  clearTurnTimer(room);
  if (!room || room.state !== 'playing') return;

  room.turnDeadline = Date.now() + TURN_TIME_LIMIT_SEC * 1000;
  room.turnTimer = setTimeout(() => {
    if (!room || room.state !== 'playing') return;
    const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);
    const timedOutRoles = [];

    if (room.choices.P1 === null) {
      const p1Type = shooterRole === 'P1' ? 'shooter' : 'keeper';
      room.choices.P1 = getBotChoice(p1Type);
      timedOutRoles.push('P1');
      io.to(room.id).emit('choice_confirmed', { role: 'P1', autoTimeout: true });
    }
    if (room.choices.P2 === null) {
      const p2Type = shooterRole === 'P2' ? 'shooter' : 'keeper';
      room.choices.P2 = getBotChoice(p2Type);
      timedOutRoles.push('P2');
      io.to(room.id).emit('choice_confirmed', { role: 'P2', autoTimeout: true });
    }

    if (timedOutRoles.length > 0) {
      io.to(room.id).emit('turn_timeout_auto', { timedOutRoles });
    }

    if (room.choices.P1 !== null && room.choices.P2 !== null) {
      resolveTurn(room);
    }
  }, (TURN_TIME_LIMIT_SEC * 1000) + 400);
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
  socket.on('join_room', ({ roomId, playerName, penaltiesPerPlayer, clientId, isAutoReconnect }) => {
    const cleanRoomId = (roomId || generateRoomId()).trim().toUpperCase();

    // Si el socket estaba en otra sala distinta anteriormente, limpiarlo de esa sala
    if (currentRoomId && currentRoomId !== cleanRoomId) {
      socket.leave(currentRoomId);
      const prevRoom = rooms.get(currentRoomId);
      if (prevRoom) {
        const prevP = prevRoom.players.find(pl => pl.id === socket.id);
        if (prevP) prevP.connected = false;
      }
    }

    currentRoomId = cleanRoomId;

    let room = rooms.get(cleanRoomId);
    if (!room) {
      room = createNewGameRoom(cleanRoomId, penaltiesPerPlayer !== undefined ? penaltiesPerPlayer : 5);
      rooms.set(cleanRoomId, room);
    }

    // Si todos los jugadores de una sala anterior estaban desconectados y no es una autoreconexión de quien acaba de crearla,
    // o si alguien entra explícitamente por enlace a una sala cuyo partido ya había terminado
    const existingP1Before = room.players.find(p => p.role === 'P1');
    const existingP2Before = room.players.find(p => p.role === 'P2');
    const bothConnected = Boolean(existingP1Before && existingP1Before.connected && existingP2Before && existingP2Before.connected);

    if (room.state === 'game_over' && !isAutoReconnect && !bothConnected) {
      room.state = 'waiting';
      room.rematchVotes.clear();
    }

    const existingP1 = room.players.find(p => p.role === 'P1');
    const existingP2 = room.players.find(p => p.role === 'P2');
    let isReconnectingSamePlayer = false;
    let isReplacedPlayer = false;

    // 1. Comprobar si es el mismo jugador reconectando (ej. al volver de WhatsApp al navegador móvil)
    if (existingP1 && ((clientId && existingP1.clientId === clientId) || existingP1.id === socket.id)) {
      playerRole = 'P1';
      isReconnectingSamePlayer = true;
      existingP1.id = socket.id;
      if (clientId) existingP1.clientId = clientId;
      if (playerName && playerName.trim()) existingP1.name = playerName.trim();
      existingP1.connected = true;
    } else if (existingP2 && ((clientId && existingP2.clientId === clientId) || existingP2.id === socket.id)) {
      playerRole = 'P2';
      isReconnectingSamePlayer = true;
      existingP2.id = socket.id;
      if (clientId) existingP2.clientId = clientId;
      if (playerName && playerName.trim()) existingP2.name = playerName.trim();
      existingP2.connected = true;
    } else if (!existingP1) {
      // 2. No hay P1 todavía -> asignar P1
      playerRole = 'P1';
      const name = (playerName && playerName.trim()) || 'Jugador 1';
      room.players.push({ id: socket.id, clientId: clientId || socket.id, role: 'P1', name, connected: true, isBot: false });
    } else if (!existingP2) {
      // 3. Ya existe P1 (incluso si P1 está temporalmente en segundo plano enviando el enlace por WhatsApp) -> asignar P2 al invitado
      playerRole = 'P2';
      const name = (playerName && playerName.trim()) || 'Jugador 2';
      room.players.push({ id: socket.id, clientId: clientId || socket.id, role: 'P2', name, connected: true, isBot: false });
    } else if (!existingP1.connected) {
      // 4. Ambos existían pero P1 se desconectó y entra un jugador nuevo
      playerRole = 'P1';
      isReplacedPlayer = true;
      existingP1.id = socket.id;
      existingP1.clientId = clientId || socket.id;
      existingP1.name = (playerName && playerName.trim()) || 'Jugador 1';
      existingP1.connected = true;
    } else if (!existingP2.connected) {
      // 5. Ambos existían pero P2 se desconectó y entra un jugador nuevo
      playerRole = 'P2';
      isReplacedPlayer = true;
      existingP2.id = socket.id;
      existingP2.clientId = clientId || socket.id;
      existingP2.name = (playerName && playerName.trim()) || 'Jugador 2';
      existingP2.connected = true;
    } else {
      // 6. Modo "Rey de la Pista": ambos puestos están ocupados -> entra como retador en cola y espectador en directo
      playerRole = 'spectator';
      const challengerName = (playerName && playerName.trim()) || `Retador ${room.challengerQueue.length + 1}`;
      const existingChallenger = room.challengerQueue.find(c => (clientId && c.clientId === clientId) || c.id === socket.id);
      if (existingChallenger) {
        existingChallenger.id = socket.id;
        existingChallenger.name = challengerName;
        existingChallenger.connected = true;
      } else {
        room.challengerQueue.push({
          id: socket.id,
          clientId: clientId || socket.id,
          name: challengerName,
          connected: true
        });
      }
    }

    socket.join(cleanRoomId);

    socket.emit('joined_room', {
      roomId: cleanRoomId,
      role: playerRole,
      roomState: sanitizeRoomForClient(room)
    });

    io.to(cleanRoomId).emit('room_update', sanitizeRoomForClient(room));

    const hasP1 = room.players.some(p => p.role === 'P1');
    const hasP2 = room.players.some(p => p.role === 'P2');

    if (hasP1 && hasP2) {
      if (room.state === 'waiting' || isReplacedPlayer) {
        // Ambos jugadores ya están registrados en la sala: iniciar partida
        startNewGame(room);
      } else if ((isReconnectingSamePlayer || playerRole === 'spectator') && (room.state === 'playing' || room.state === 'resolving')) {
        // Sincronizar pantalla para el jugador reconectado o el nuevo retador en cola ("Rey de la Pista")
        const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);
        socket.emit('game_started', {
          turnIndex: room.turnIndex,
          shooterRole,
          keeperRole,
          isSuddenDeath: room.isSuddenDeath,
          suddenDeathRound: room.suddenDeathRound,
          penaltiesPerPlayer: room.penaltiesPerPlayer,
          turnTimeLimit: TURN_TIME_LIMIT_SEC,
          roomState: sanitizeRoomForClient(room)
        });
        if (room.choices.P1 !== null) {
          socket.emit('choice_confirmed', { role: 'P1' });
        }
        if (room.choices.P2 !== null) {
          socket.emit('choice_confirmed', { role: 'P2' });
        }
      } else if (isReconnectingSamePlayer && room.state === 'game_over') {
        if (room.rematchVotes.size > 0) {
          socket.emit('rematch_status', {
            votes: Array.from(room.rematchVotes)
          });
        }
      }
    }
  });

  socket.on('submit_choice', ({ row, col }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.state !== 'playing') return;

    const activePlayer = room.players.find(p => p.id === socket.id);
    const activeRole = activePlayer ? activePlayer.role : playerRole;
    if (!activeRole || activeRole === 'spectator') return;

    if (row < 0 || row > 1 || col < 0 || col > 2) return;

    room.choices[activeRole] = { row, col };

    io.to(currentRoomId).emit('choice_confirmed', {
      role: activeRole
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

  socket.on('send_emote', ({ emoji, text }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const activePlayer = room.players.find(p => p.id === socket.id);
    const queuedChallenger = room.challengerQueue.find(c => c.id === socket.id);
    const senderRole = activePlayer ? activePlayer.role : (queuedChallenger ? 'spectator' : playerRole);
    const senderName = activePlayer ? activePlayer.name : (queuedChallenger ? queuedChallenger.name : 'Aficionado');

    io.to(currentRoomId).emit('emote_received', {
      role: senderRole || 'spectator',
      playerName: senderName,
      emoji: String(emoji || '⚽').slice(0, 8),
      text: String(text || '').slice(0, 48)
    });
  });

  socket.on('request_rematch', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.state !== 'game_over') return;

    const activePlayer = room.players.find(p => p.id === socket.id);
    const activeRole = activePlayer ? activePlayer.role : playerRole;
    if (!activeRole || activeRole === 'spectator') return;

    // Filtrar retadores conectados en la cola de "Rey de la Pista"
    room.challengerQueue = (room.challengerQueue || []).filter(c => c.connected !== false);

    if (room.challengerQueue.length > 0 && !room.tournamentContext) {
      // MODO REY DE LA PISTA: El ganador defiende el trono y entra el primer retador de la cola
      const nextChallenger = room.challengerQueue.shift();
      const winnerRole = room.lastWinnerRole || 'P1';
      const loserRole = (winnerRole === 'P1') ? 'P2' : 'P1';
      const loserIdx = room.players.findIndex(p => p.role === loserRole);

      if (loserIdx !== -1) {
        const previousLoser = room.players[loserIdx];
        if (previousLoser && previousLoser.connected && !previousLoser.isBot) {
          room.challengerQueue.push({
            id: previousLoser.id,
            clientId: previousLoser.clientId,
            name: previousLoser.name,
            connected: true
          });
        }
        room.players[loserIdx] = {
          id: nextChallenger.id,
          clientId: nextChallenger.clientId,
          role: loserRole,
          name: nextChallenger.name,
          connected: true,
          isBot: false
        };
      }

      // Reiniciar el H2H parcial de la tanda pero mantener el historial h2hWins y kingStreak
      room.seriesWins = { P1: 0, P2: 0 };

      const p1Obj = room.players.find(p => p.role === 'P1');
      const p2Obj = room.players.find(p => p.role === 'P2');

      io.to(currentRoomId).emit('role_swapped', {
        p1ClientId: p1Obj ? p1Obj.clientId : null,
        p2ClientId: p2Obj ? p2Obj.clientId : null,
        kingRole: winnerRole,
        newChallengerName: nextChallenger.name,
        roomState: sanitizeRoomForClient(room)
      });

      startNewGame(room);
      return;
    }

    room.rematchVotes.add(activeRole);
    io.to(currentRoomId).emit('rematch_status', {
      votes: Array.from(room.rematchVotes)
    });

    if (room.rematchVotes.has('P1') && room.rematchVotes.has('P2')) {
      resetGameForRematch(room);
    }
  });

  // --- GESTIÓN DE TORNEOS ELIMINATORIOS ---
  socket.on('create_tournament', ({ size, name, playerName, penaltiesPerPlayer, clientId }) => {
    const tournament = tournamentManager.createTournament({
      hostSocketId: socket.id,
      hostName: playerName,
      clientId,
      size,
      name,
      penaltiesPerPlayer
    });

    currentTournamentId = tournament.id;
    socket.join(tournament.id);

    socket.emit('tournament_joined', {
      tournament: tournamentManager.sanitizeTournament(tournament),
      myId: socket.id,
      myClientId: clientId || socket.id,
      isHost: true
    });
  });

  socket.on('join_tournament', ({ tournamentId, playerName, clientId }) => {
    const cleanId = (tournamentId || '').trim().toUpperCase();
    const result = tournamentManager.joinTournament({
      tournamentId: cleanId,
      socketId: socket.id,
      playerName,
      clientId
    });

    if (!result.success) {
      socket.emit('tournament_error', { message: result.error });
      return;
    }

    currentTournamentId = cleanId;
    socket.join(cleanId);

    const isHost = (result.tournament.hostSocketId === socket.id) ||
      (clientId && result.tournament.hostClientId === clientId);

    socket.emit('tournament_joined', {
      tournament: tournamentManager.sanitizeTournament(result.tournament),
      myId: socket.id,
      myClientId: clientId || socket.id,
      isHost
    });

    io.to(cleanId).emit('tournament_updated', tournamentManager.sanitizeTournament(result.tournament));
  });

  socket.on('leave_tournament', ({ tournamentId, clientId }) => {
    const cleanId = (tournamentId || '').trim().toUpperCase();
    const result = tournamentManager.leaveTournament({
      tournamentId: cleanId,
      socketId: socket.id,
      clientId
    });

    if (result && result.success) {
      socket.leave(cleanId);
      if (currentTournamentId === cleanId) {
        currentTournamentId = null;
      }
      if (!result.tournamentDeleted && result.tournament) {
        io.to(cleanId).emit('tournament_updated', tournamentManager.sanitizeTournament(result.tournament));
      }
    }
  });

  socket.on('start_tournament', ({ tournamentId, clientId }) => {
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament) return;

    // Permitir iniciar si coincide el hostSocketId, o el hostClientId, o si el socket está marcado como isHost
    const isAuthorizedHost = (tournament.hostSocketId === socket.id) ||
      (clientId && tournament.hostClientId === clientId) ||
      tournament.participants.some(p => p.isHost && (p.socketId === socket.id || (clientId && p.clientId === clientId)));

    if (!isAuthorizedHost) return;

    const startedTournament = tournamentManager.startTournament(tournamentId);
    if (!startedTournament) return;

    io.to(tournamentId).emit('tournament_started', tournamentManager.sanitizeTournament(startedTournament));

    // Iniciar simulación progresiva de partidos BOT vs BOT de la primera ronda
    runBotMatchesSimulation(startedTournament);
  });

  socket.on('enter_tournament_match', ({ tournamentId, roundIndex, matchIndex, clientId, playerName }) => {
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

    // Configurar rol asignado utilizando clientId unívoco primero, socket.id, o nombre de participante
    let myRoleAssigned = 'spectator';
    const isP1 = match.p1 && !match.p1.isBot && (
      (clientId && match.p1.clientId && match.p1.clientId === clientId) ||
      match.p1.id === socket.id ||
      match.p1.socketId === socket.id ||
      (playerName && match.p1.name && match.p1.name.toLowerCase() === playerName.trim().toLowerCase())
    );
    const isP2 = match.p2 && !match.p2.isBot && (
      (clientId && match.p2.clientId && match.p2.clientId === clientId) ||
      match.p2.id === socket.id ||
      match.p2.socketId === socket.id ||
      (playerName && match.p2.name && match.p2.name.toLowerCase() === playerName.trim().toLowerCase())
    );

    if (isP1) {
      myRoleAssigned = 'P1';
    } else if (isP2) {
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
        clientId: match.p1.clientId || match.p1.id,
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
        clientId: match.p2.clientId || match.p2.id,
        role: 'P2',
        name: match.p2.name,
        connected: true,
        isBot: true
      });
    }

    // Registrar o re-sincronizar al jugador humano en la sala con su rol real
    if (myRoleAssigned === 'P1' || myRoleAssigned === 'P2') {
      const humanData = myRoleAssigned === 'P1' ? match.p1 : match.p2;
      const existingHuman = room.players.find(p => p.role === myRoleAssigned);
      if (!existingHuman) {
        room.players.push({
          id: socket.id,
          clientId: clientId || socket.id,
          role: myRoleAssigned,
          name: humanData ? humanData.name : (playerName || 'Jugador'),
          connected: true,
          isBot: false
        });
      } else {
        existingHuman.id = socket.id;
        if (clientId) existingHuman.clientId = clientId;
        existingHuman.connected = true;
      }
    }

    match.status = (room.state === 'playing' || room.state === 'resolving') ? 'playing' : match.status;
    io.to(tournamentId).emit('tournament_updated', tournamentManager.sanitizeTournament(tournament));

    socket.emit('joined_room', {
      roomId: matchRoomId,
      role: playerRole,
      roomState: sanitizeRoomForClient(room),
      tournamentContext: room.tournamentContext
    });

    // Si ambos participantes están listos (o uno es bot) y el partido aún no arrancó, arrancar
    const hasP1 = room.players.some(p => p.role === 'P1');
    const hasP2 = room.players.some(p => p.role === 'P2');
    if (hasP1 && hasP2 && room.state === 'waiting') {
      match.status = 'playing';
      io.to(tournamentId).emit('tournament_updated', tournamentManager.sanitizeTournament(tournament));
      startNewGame(room);
    } else if (hasP1 && hasP2 && (room.state === 'playing' || room.state === 'resolving')) {
      // Sincronizar inmediatamente para el jugador reconectado en medio del partido
      const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);
      socket.emit('game_started', {
        turnIndex: room.turnIndex,
        shooterRole,
        keeperRole,
        isSuddenDeath: room.isSuddenDeath,
        suddenDeathRound: room.suddenDeathRound,
        penaltiesPerPlayer: room.penaltiesPerPlayer,
        turnTimeLimit: TURN_TIME_LIMIT_SEC,
        roomState: sanitizeRoomForClient(room)
      });
      if (room.choices.P1 !== null) {
        socket.emit('choice_confirmed', { role: 'P1' });
      }
      if (room.choices.P2 !== null) {
        socket.emit('choice_confirmed', { role: 'P2' });
      }
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
        if (room.challengerQueue) {
          const c = room.challengerQueue.find(ch => ch.id === socket.id);
          if (c) {
            c.connected = false;
            room.challengerQueue = room.challengerQueue.filter(ch => ch.connected !== false);
            io.to(currentRoomId).emit('room_update', sanitizeRoomForClient(room));
          }
        }
        if (!room.players.some(pl => pl.connected && !pl.isBot)) {
          clearTurnTimer(room);
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

  scheduleTurnTimer(room);

  const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);

  io.to(room.id).emit('game_started', {
    turnIndex: room.turnIndex,
    shooterRole,
    keeperRole,
    isSuddenDeath: room.isSuddenDeath,
    suddenDeathRound: room.suddenDeathRound,
    penaltiesPerPlayer: room.penaltiesPerPlayer,
    turnTimeLimit: TURN_TIME_LIMIT_SEC,
    roomState: sanitizeRoomForClient(room)
  });
}

function resolveTurn(room) {
  clearTurnTimer(room);
  room.state = 'resolving';

  const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);
  const shooterChoice = room.choices[shooterRole];
  const keeperChoice = room.choices[keeperRole];

  // Cualquier disparo que NO sea raso al centro (row: 1, col: 1) tiene una pequeña probabilidad (14%) de ir al palo (7%) o fuera (7%)
  const isLowCenter = (shooterChoice.row === 1 && shooterChoice.col === 1);
  const missRoll = !isLowCenter ? Math.random() : 1;
  const isPost = missRoll < 0.07;
  const isOut = !isPost && missRoll < 0.14;

  const isGoal = !isOut && !isPost && (shooterChoice.row !== keeperChoice.row || shooterChoice.col !== keeperChoice.col);

  if (isGoal) {
    room.scores[shooterRole] += 1;
  }

  const attemptNumber = room.history[shooterRole].length + 1;
  const turnRecord = {
    turnIndex: room.turnIndex,
    attempt: attemptNumber,
    isGoal,
    isOut: isOut || isPost,
    isPost,
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
  const basePenalties = room.penaltiesPerPlayer || 0;
  const totalRegularTurns = basePenalties * 2;
  let isMathematicalVictory = false;

  if (!room.isSuddenDeath) {
    const rem1 = Math.max(0, basePenalties - room.history.P1.length);
    const rem2 = Math.max(0, basePenalties - room.history.P2.length);

    // Si P2 ya no tiene tiros suficientes para al menos empatar a P1
    if (room.scores.P1 > room.scores.P2 + rem2) {
      gameOver = true;
      winner = 'P1';
      isMathematicalVictory = (nextTurnIndex < totalRegularTurns);
    }
    // Si P1 ya no tiene tiros suficientes para al menos empatar a P2
    else if (room.scores.P2 > room.scores.P1 + rem1) {
      gameOver = true;
      winner = 'P2';
      isMathematicalVictory = (nextTurnIndex < totalRegularTurns);
    }
    // Si se completaron todos los lanzamientos regulares
    else if (nextTurnIndex >= totalRegularTurns) {
      if (room.scores.P1 > room.scores.P2) {
        gameOver = true;
        winner = 'P1';
      } else if (room.scores.P2 > room.scores.P1) {
        gameOver = true;
        winner = 'P2';
      } else {
        // Empate al terminar la tanda -> Muerte Súbita
        nextIsSuddenDeath = true;
        nextSuddenDeathRound = 1;
      }
    }
  } else {
    // En Muerte Súbita, la tanda se decide tras tiros en parejas iguales
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

  if (gameOver && winner) {
    room.lastWinnerRole = winner;
    room.seriesWins[winner] = (room.seriesWins[winner] || 0) + 1;
    const winnerPlayer = room.players.find(p => p.role === winner);
    if (winnerPlayer && winnerPlayer.name) {
      room.h2hWins[winnerPlayer.name] = (room.h2hWins[winnerPlayer.name] || 0) + 1;
    }
    if (room.kingRole === winner) {
      room.kingStreak = (room.kingStreak || 1) + 1;
    } else {
      room.kingRole = winner;
      room.kingStreak = 1;
    }
  }

  const enteringSuddenDeath = !room.isSuddenDeath && nextIsSuddenDeath;

  io.to(room.id).emit('turn_resolved', {
    turnIndex: room.turnIndex,
    shooterRole,
    keeperRole,
    shooterChoice,
    keeperChoice,
    isGoal,
    isOut: isOut || isPost,
    isPost,
    isSuddenDeath: room.isSuddenDeath,
    suddenDeathRound: room.suddenDeathRound,
    scores: { ...room.scores },
    history: {
      P1: [...room.history.P1],
      P2: [...room.history.P2]
    },
    gameOver,
    winner,
    isMathematicalVictory,
    nextIsSuddenDeath,
    nextSuddenDeathRound,
    nextTurnIndex,
    penaltiesPerPlayer: room.penaltiesPerPlayer,
    roomState: sanitizeRoomForClient(room)
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
        scheduleTurnTimer(room);
        const nextRoles = getTurnRoles(room.turnIndex);
        io.to(room.id).emit('next_turn_ready', {
          turnIndex: room.turnIndex,
          shooterRole: nextRoles.shooterRole,
          keeperRole: nextRoles.keeperRole,
          isSuddenDeath: room.isSuddenDeath,
          suddenDeathRound: room.suddenDeathRound,
          penaltiesPerPlayer: room.penaltiesPerPlayer,
          turnTimeLimit: TURN_TIME_LIMIT_SEC,
          roomState: sanitizeRoomForClient(room)
        });
      }
    }, 2200);
  }
}

function resetGameForRematch(room) {
  startNewGame(room);
}

function sanitizeRoomForClient(room) {
  const kingPlayer = room.kingRole ? room.players.find(p => p.role === room.kingRole) : null;
  return {
    id: room.id,
    players: room.players.map(p => ({
      role: p.role,
      name: p.name,
      connected: p.connected,
      isBot: p.isBot
    })),
    challengerQueue: (room.challengerQueue || [])
      .filter(c => c.connected !== false)
      .map(c => ({ name: c.name, clientId: c.clientId })),
    seriesWins: room.seriesWins || { P1: 0, P2: 0 },
    h2hWins: room.h2hWins || {},
    kingRole: room.kingRole || null,
    kingName: kingPlayer ? kingPlayer.name : null,
    kingStreak: room.kingStreak || 0,
    turnTimeLimit: TURN_TIME_LIMIT_SEC,
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
