const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

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
      // Solo IPv4 y no internas
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

function createNewGameRoom(roomId) {
  return {
    id: roomId,
    players: [], // [{ id, socketId, role: 'P1'|'P2', name, connected: true }]
    spectators: [],
    state: 'waiting', // 'waiting', 'playing', 'resolving', 'game_over'
    turnIndex: 0,
    isSuddenDeath: false,
    suddenDeathRound: 0,
    scores: { P1: 0, P2: 0 },
    history: {
      P1: [], // array de { attempt, isGoal, shooterChoice, keeperChoice }
      P2: []
    },
    choices: { P1: null, P2: null },
    rematchVotes: new Set()
  };
}

// Devuelve los roles según el turnIndex actual
function getTurnRoles(turnIndex) {
  // Turno 0: P1 tira, P2 para
  // Turno 1: P2 tira, P1 para
  // Turno 2: P1 tira, P2 para ...
  const isP1Shooter = (turnIndex % 2 === 0);
  return {
    shooterRole: isP1Shooter ? 'P1' : 'P2',
    keeperRole: isP1Shooter ? 'P2' : 'P1'
  };
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerRole = null;

  socket.on('join_room', ({ roomId, playerName }) => {
    const cleanRoomId = (roomId || generateRoomId()).trim().toUpperCase();
    currentRoomId = cleanRoomId;

    let room = rooms.get(cleanRoomId);
    if (!room) {
      room = createNewGameRoom(cleanRoomId);
      rooms.set(cleanRoomId, room);
    }

    // Comprobar si el jugador ya estaba registrado por socket o si hay hueco
    const existingP1 = room.players.find(p => p.role === 'P1');
    const existingP2 = room.players.find(p => p.role === 'P2');

    if (!existingP1 || !existingP1.connected) {
      playerRole = 'P1';
      const name = (playerName && playerName.trim()) || 'Jugador 1';
      if (!existingP1) {
        room.players.push({ id: socket.id, role: 'P1', name, connected: true });
      } else {
        existingP1.id = socket.id;
        existingP1.name = name;
        existingP1.connected = true;
      }
    } else if (!existingP2 || !existingP2.connected) {
      playerRole = 'P2';
      const name = (playerName && playerName.trim()) || 'Jugador 2';
      if (!existingP2) {
        room.players.push({ id: socket.id, role: 'P2', name, connected: true });
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

    // Enviar confirmación al jugador
    socket.emit('joined_room', {
      roomId: cleanRoomId,
      role: playerRole,
      roomState: sanitizeRoomForClient(room)
    });

    // Notificar a toda la sala
    io.to(cleanRoomId).emit('room_update', sanitizeRoomForClient(room));

    // Si ambos jugadores están conectados y la sala estaba esperando, iniciar partida
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

    // Notificar a ambos que este jugador ha enviado su elección (SIN revelar la casilla elegida)
    io.to(currentRoomId).emit('choice_confirmed', {
      role: playerRole
    });

    // Si ambos jugadores han confirmado, resolver el turno
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

    // Si ambos votan revancha, reiniciar
    if (room.rematchVotes.has('P1') && room.rematchVotes.has('P2')) {
      resetGameForRematch(room);
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const p = room.players.find(pl => pl.id === socket.id);
    if (p) {
      p.connected = false;
      io.to(currentRoomId).emit('player_left', {
        role: p.role,
        name: p.name,
        roomState: sanitizeRoomForClient(room)
      });
    }

    // Si la sala queda completamente vacía tras 10 minutos, liberarla
    const activeSockets = io.sockets.adapter.rooms.get(currentRoomId);
    if (!activeSockets || activeSockets.size === 0) {
      setTimeout(() => {
        const checkRoom = rooms.get(currentRoomId);
        if (checkRoom && checkRoom.players.every(pl => !pl.connected)) {
          rooms.delete(currentRoomId);
        }
      }, 10 * 60 * 1000);
    }
  });
});

function startNewGame(room) {
  room.state = 'playing';
  room.turnIndex = 0;
  room.isSuddenDeath = false;
  room.suddenDeathRound = 0;
  room.scores = { P1: 0, P2: 0 };
  room.history = { P1: [], P2: [] };
  room.choices = { P1: null, P2: null };
  room.rematchVotes.clear();

  const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);

  io.to(room.id).emit('game_started', {
    turnIndex: room.turnIndex,
    shooterRole,
    keeperRole,
    isSuddenDeath: false,
    roomState: sanitizeRoomForClient(room)
  });
}

function resolveTurn(room) {
  room.state = 'resolving';

  const { shooterRole, keeperRole } = getTurnRoles(room.turnIndex);
  const shooterChoice = room.choices[shooterRole];
  const keeperChoice = room.choices[keeperRole];

  // Si coinciden las coordenadas: PARADA DEL PORTERO
  // Si no coinciden: GOL DEL TIRADOR
  const isGoal = (shooterChoice.row !== keeperChoice.row || shooterChoice.col !== keeperChoice.col);

  if (isGoal) {
    room.scores[shooterRole] += 1;
  }

  // Registrar en el historial del tirador
  const attemptNumber = room.history[shooterRole].length + 1;
  const turnRecord = {
    turnIndex: room.turnIndex,
    attempt: attemptNumber,
    isGoal,
    shooterChoice,
    keeperChoice,
    isSuddenDeath: room.isSuddenDeath
  };
  room.history[shooterRole].push(turnRecord);

  // Comprobar si el partido ha terminado o pasa a muerte súbita
  const nextTurnIndex = room.turnIndex + 1;
  let gameOver = false;
  let winner = null;
  let nextIsSuddenDeath = room.isSuddenDeath;
  let nextSuddenDeathRound = room.suddenDeathRound;

  // Los 5 primeros tiros de cada uno son turnos 0 a 9 (10 turnos en total: 5 de P1, 5 de P2)
  if (!room.isSuddenDeath) {
    if (nextTurnIndex >= 10) {
      // Ya han tirado los 5 penaltis ambos
      if (room.scores.P1 > room.scores.P2) {
        gameOver = true;
        winner = 'P1';
      } else if (room.scores.P2 > room.scores.P1) {
        gameOver = true;
        winner = 'P2';
      } else {
        // Empate al terminar los 5 penaltis: ¡MUERTE SÚBITA!
        nextIsSuddenDeath = true;
        nextSuddenDeathRound = 1;
      }
    }
  } else {
    // Estamos en Muerte Súbita.
    // Cada ronda de muerte súbita consta de 2 turnos:
    // Turno par (tira P1), Turno impar (tira P2).
    // Se decide únicamente tras completarse la pareja de tiros (al terminar el tiro de P2)
    if (nextTurnIndex % 2 === 0) {
      // Se acaba de completar la pareja de tiros
      if (room.scores.P1 > room.scores.P2) {
        gameOver = true;
        winner = 'P1';
      } else if (room.scores.P2 > room.scores.P1) {
        gameOver = true;
        winner = 'P2';
      } else {
        // Siguen empatados, siguiente ronda de muerte súbita
        nextSuddenDeathRound += 1;
      }
    }
  }

  // Enviar evento de resolución para que los clientes reproduzcan la animación
  io.to(room.id).emit('turn_resolved', {
    turnIndex: room.turnIndex,
    shooterRole,
    keeperRole,
    shooterChoice,
    keeperChoice,
    isGoal,
    scores: { ...room.scores },
    history: {
      P1: [...room.history.P1],
      P2: [...room.history.P2]
    },
    gameOver,
    winner,
    nextIsSuddenDeath,
    nextSuddenDeathRound,
    nextTurnIndex
  });

  // Limpiar elecciones y avanzar turno tras tiempo de animación
  room.choices = { P1: null, P2: null };
  room.turnIndex = nextTurnIndex;
  room.isSuddenDeath = nextIsSuddenDeath;
  room.suddenDeathRound = nextSuddenDeathRound;

  if (gameOver) {
    room.state = 'game_over';
  } else {
    // Dejar 4.5 segundos para la animación completa en los clientes antes de habilitar siguiente turno
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
    players: room.players.map(p => ({ role: p.role, name: p.name, connected: p.connected })),
    state: room.state,
    turnIndex: room.turnIndex,
    isSuddenDeath: room.isSuddenDeath,
    suddenDeathRound: room.suddenDeathRound,
    scores: room.scores,
    history: room.history,
    // NO exponer elecciones secretas
    p1Chosen: room.choices.P1 !== null,
    p2Chosen: room.choices.P2 !== null
  };
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
