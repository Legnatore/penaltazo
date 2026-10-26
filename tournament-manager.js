/**
 * Gestor de torneos eliminatorios (4, 8 y 16 participantes).
 * Genera cuadros, rellena huecos vacíos con bots de nombres cómicos
 * y gestiona el avance de rondas hasta coronar al campeón.
 */

const FUNNY_BOT_NAMES = [
  'Cristiano Rolando 🇵🇹',
  'Leo Missi 🇦🇷',
  'Kylian Empapé 🇫🇷',
  'Erling Jamón 🇳🇴',
  'Dibu Martillo 🧤',
  'Iker Casi-llas 🧤',
  'Luka Modricito 🇭🇷',
  'Zidán con Pelazo 🇫🇷',
  'Vini con Queso 🇧🇷',
  'Lewandogski 🇵🇱',
  'Cholo Furioso 🇦🇷',
  'Karim Benzemago 🇫🇷',
  'Pedri Pan 🇪🇸',
  'Gaviota Gavi 🇪🇸',
  'Cortois de Palo 🧤',
  'Neymar Rodando 🇧🇷',
  'Puyol de Piedra 🇪🇸',
  'Ronalgordito 🇧🇷',
  'Bekam Gomina 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Iniesta Pelón 🇪🇸',
  'Ramos Roja 🟥',
  'Griezmann Chef 🇫🇷',
  'Suárez Bocado 🇺🇾',
  'Ter Stegen Muro 🧤',
  'Fede Halcón 🇺🇾',
  'Kroos Cartabón 🇩🇪',
  'Lamine Tamal 🇪🇸',
  'Bellingjamón 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Julián Arañita 🕷️',
  'Drogba-uette 🇨🇮'
];

class TournamentManager {
  constructor() {
    this.tournaments = new Map();
  }

  generateTournamentId() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let code = 'COPA-';
    for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += '-';
    for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    return code;
  }

  createTournament({ id, hostSocketId, hostName, size = 8, name = 'Copa Penaltazo', penaltiesPerPlayer = 5 }) {
    const tournamentId = id || this.generateTournamentId();
    const tournamentSize = [4, 8, 16].includes(Number(size)) ? Number(size) : 8;
    const basePenalties = [0, 3, 5].includes(Number(penaltiesPerPlayer)) ? Number(penaltiesPerPlayer) : 5;

    const tournament = {
      id: tournamentId,
      name: name.trim() || `Copa Penaltazo #${Math.floor(100 + Math.random() * 900)}`,
      size: tournamentSize,
      penaltiesPerPlayer: basePenalties,
      status: 'lobby', // 'lobby' | 'in_progress' | 'completed'
      hostSocketId,
      participants: [
        {
          id: hostSocketId,
          socketId: hostSocketId,
          name: (hostName && hostName.trim()) || 'Anfitrión',
          isBot: false,
          isHost: true,
          connected: true
        }
      ],
      bracket: [], // rondas con partidos
      currentRoundIndex: 0,
      champion: null,
      runnerUp: null
    };

    this.tournaments.set(tournamentId, tournament);
    return tournament;
  }

  getTournament(id) {
    return this.tournaments.get(id);
  }

  joinTournament({ tournamentId, socketId, playerName }) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Torneo no encontrado' };

    const cleanName = (playerName || '').trim();

    // Comprobar si ya estaba dentro por socketId o por nombre (permite reconectar aunque el torneo ya esté en marcha)
    const existing = tournament.participants.find(p =>
      !p.isBot && (p.socketId === socketId || (cleanName && p.name.toLowerCase() === cleanName.toLowerCase()))
    );
    if (existing) {
      const oldId = existing.id;
      existing.id = socketId;
      existing.socketId = socketId;
      if (cleanName) existing.name = cleanName;
      existing.connected = true;

      // Actualizar también las referencias dentro del cuadro (bracket) si el torneo ya ha empezado
      if (tournament.bracket) {
        for (const round of tournament.bracket) {
          for (const match of round.matches) {
            if (match.p1 && (match.p1.id === oldId || match.p1.name.toLowerCase() === existing.name.toLowerCase())) {
              match.p1.id = socketId;
              match.p1.socketId = socketId;
              match.p1.connected = true;
            }
            if (match.p2 && (match.p2.id === oldId || match.p2.name.toLowerCase() === existing.name.toLowerCase())) {
              match.p2.id = socketId;
              match.p2.socketId = socketId;
              match.p2.connected = true;
            }
          }
        }
      }

      return { success: true, tournament, isRejoin: true };
    }

    if (tournament.status !== 'lobby') {
      return { success: false, error: 'El torneo ya ha comenzado y no quedan plazas para nuevos jugadores' };
    }

    if (tournament.participants.length >= tournament.size) {
      return { success: false, error: 'El torneo ya está completo' };
    }

    const name = cleanName || `Jugador ${tournament.participants.length + 1}`;
    tournament.participants.push({
      id: socketId,
      socketId,
      name,
      isBot: false,
      isHost: false,
      connected: true
    });

    return { success: true, tournament };
  }

  handleDisconnect(socketId) {
    for (const [id, tournament] of this.tournaments) {
      const p = tournament.participants.find(part => part.socketId === socketId);
      if (p) {
        p.connected = false;
        return { tournamentId: id, participant: p };
      }
    }
    return null;
  }

  startTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'lobby') return null;

    // 1. Rellenar huecos vacíos con bots de nombres cómicos
    const currentCount = tournament.participants.length;
    const neededBots = tournament.size - currentCount;

    if (neededBots > 0) {
      // Barajar nombres de bots para que no se repitan
      const shuffledBotNames = [...FUNNY_BOT_NAMES].sort(() => 0.5 - Math.random());
      for (let i = 0; i < neededBots; i++) {
        const botName = shuffledBotNames[i % shuffledBotNames.length];
        const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
        tournament.participants.push({
          id: botId,
          socketId: null,
          name: botName,
          isBot: true,
          isHost: false,
          connected: true
        });
      }
    }

    // 2. Barajar emparejamientos iniciales para que sea emocionante
    // Mantener al anfitrión en una posición visible o barajar a todos
    const shuffledParticipants = [...tournament.participants].sort(() => 0.5 - Math.random());

    // 3. Crear el cuadro eliminatorio según el tamaño
    tournament.bracket = this.buildEmptyBracket(tournament.size);

    // Asignar participantes a la Primera Ronda (Ronda 0)
    const round0 = tournament.bracket[0];
    for (let i = 0; i < round0.matches.length; i++) {
      const p1 = shuffledParticipants[i * 2];
      const p2 = shuffledParticipants[i * 2 + 1];
      round0.matches[i].p1 = p1;
      round0.matches[i].p2 = p2;
      round0.matches[i].status = 'ready';
    }

    tournament.status = 'in_progress';
    tournament.currentRoundIndex = 0;

    return tournament;
  }

  buildEmptyBracket(size) {
    const bracket = [];
    let roundCount;
    let roundNames;

    if (size === 4) {
      roundCount = 2;
      roundNames = ['Semifinales', 'Gran Final'];
    } else if (size === 8) {
      roundCount = 3;
      roundNames = ['Cuartos de Final', 'Semifinales', 'Gran Final'];
    } else { // 16
      roundCount = 4;
      roundNames = ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Gran Final'];
    }

    let matchesInRound = size / 2;
    for (let r = 0; r < roundCount; r++) {
      const matches = [];
      for (let m = 0; m < matchesInRound; m++) {
        matches.push({
          id: `match_r${r}_m${m}`,
          roundIndex: r,
          matchIndex: m,
          p1: null,
          p2: null,
          winner: null,
          score: { p1: null, p2: null },
          status: 'pending' // 'pending' | 'ready' | 'playing' | 'finished'
        });
      }
      bracket.push({
        roundIndex: r,
        name: roundNames[r],
        matches
      });
      matchesInRound /= 2;
    }

    return bracket;
  }

  recordMatchResult(tournamentId, roundIndex, matchIndex, winnerPlayer, score) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const round = tournament.bracket[roundIndex];
    if (!round) return null;

    const match = round.matches[matchIndex];
    if (!match) return null;

    match.winner = winnerPlayer;
    match.score = score;
    match.status = 'finished';

    // Determinar si era la Gran Final
    const isFinal = (roundIndex === tournament.bracket.length - 1);
    if (isFinal) {
      tournament.status = 'completed';
      tournament.champion = winnerPlayer;
      tournament.runnerUp = (winnerPlayer.id === match.p1.id) ? match.p2 : match.p1;
      return { tournament, roundCompleted: true, tournamentCompleted: true };
    }

    // Avanzar al ganador a la siguiente ronda
    const nextRoundIndex = roundIndex + 1;
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextMatch = tournament.bracket[nextRoundIndex].matches[nextMatchIndex];

    if (matchIndex % 2 === 0) {
      nextMatch.p1 = winnerPlayer;
    } else {
      nextMatch.p2 = winnerPlayer;
    }

    // Si ambos participantes de la siguiente ronda ya están definidos, marcar listo
    if (nextMatch.p1 && nextMatch.p2) {
      nextMatch.status = 'ready';
    }

    // Comprobar si todos los partidos de la ronda actual han finalizado
    const allMatchesFinished = round.matches.every(m => m.status === 'finished');
    if (allMatchesFinished) {
      tournament.currentRoundIndex = nextRoundIndex;
    }

    return {
      tournament,
      roundCompleted: allMatchesFinished,
      tournamentCompleted: false
    };
  }

  /**
   * Simula un partido entre dos bots de la IA con resultados de tanda realistas
   */
  simulateBotMatch(match, penaltiesPerPlayer = 5) {
    let s1 = 0;
    let s2 = 0;

    // Simular los tiros reglamentarios comprobando victoria matemática anticipada
    for (let i = 0; i < penaltiesPerPlayer; i++) {
      // Tira P1
      if (Math.random() < 0.72) s1++;
      const p1RemAfterP1 = penaltiesPerPlayer - (i + 1);
      const p2RemAfterP1 = penaltiesPerPlayer - i;
      if (s1 > s2 + p2RemAfterP1 || s2 > s1 + p1RemAfterP1) break;

      // Tira P2
      if (Math.random() < 0.72) s2++;
      const p1RemAfterP2 = penaltiesPerPlayer - (i + 1);
      const p2RemAfterP2 = penaltiesPerPlayer - (i + 1);
      if (s1 > s2 + p2RemAfterP2 || s2 > s1 + p1RemAfterP2) break;
    }

    // Si empatan (o si empezó en muerte súbita directa), decidir en rondas de muerte súbita
    while (s1 === s2) {
      if (Math.random() < 0.72) s1++;
      if (Math.random() < 0.72) s2++;
    }

    const winner = s1 > s2 ? match.p1 : match.p2;
    return {
      winner,
      score: { p1: s1, p2: s2 }
    };
  }

  sanitizeTournament(tournament) {
    if (!tournament) return null;
    return {
      id: tournament.id,
      name: tournament.name,
      size: tournament.size,
      penaltiesPerPlayer: tournament.penaltiesPerPlayer !== undefined ? tournament.penaltiesPerPlayer : 5,
      status: tournament.status,
      hostSocketId: tournament.hostSocketId,
      participants: tournament.participants.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        isHost: p.isHost,
        connected: p.connected
      })),
      bracket: tournament.bracket,
      currentRoundIndex: tournament.currentRoundIndex,
      champion: tournament.champion,
      runnerUp: tournament.runnerUp
    };
  }
}

module.exports = new TournamentManager();
