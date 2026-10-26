/**
 * Oponente inteligente para jugar en solitario / modo práctica contra la CPU.
 */
const FUNNY_AI_NAMES = [
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
  'Karim Benzemago 🇫🇷',
  'Cortois de Palo 🧤',
  'Neymar Rodando 🇧🇷',
  'Ronalgordito 🇧🇷',
  'Iniesta Pelón 🇪🇸',
  'Suárez Bocado 🇺🇾',
  'Ter Stegen Muro 🧤',
  'Lamine Tamal 🇪🇸',
  'Bellingjamón 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Julián Arañita 🕷️'
];

const AI_PERSONALITIES = {
  novato: {
    id: 'novato',
    label: '🐣 Novato',
    names: ['Paco Mantequilla 🐣', 'Benito Camelas 🐣', 'Cono Arbeloa 🚧', 'Loris Kariusito 🧤'],
    emotes: [
      { emoji: '😰', text: '¡Uy, qué grande es la portería!' },
      { emoji: '🐣', text: '¡No me tires muy fuerte!' },
      { emoji: '😅', text: '¡Casi la veo pasar!' }
    ]
  },
  escuadras: {
    id: 'escuadras',
    label: '🚀 Cazador de Escuadras',
    names: ['Roberto Carloso 🚀', 'CR7 Misil 🇵🇹', 'Erling Jamón 🇳🇴', 'Zlatan Humilde 🦁'],
    emotes: [
      { emoji: '🎯', text: '¡Donde duermen las arañas!' },
      { emoji: '🚀', text: '¡Te voy a romper la red!' },
      { emoji: '🔥', text: '¡A la escuadra siempre!' }
    ]
  },
  psicologo: {
    id: 'psicologo',
    label: '🧠 El Psicólogo',
    names: ['Dibu Martillo 🧠', 'Iker Casi-llas 🧤', 'Profesor Xabi 🧠', 'Cortois Mental 🧤'],
    emotes: [
      { emoji: '🤫', text: 'Sé perfectamente a dónde vas a tirar...' },
      { emoji: '🧠', text: 'Te tengo estudiado el mapa de calor.' },
      { emoji: '🧤', text: '¡Mírame a los ojos, que te como!' }
    ]
  },
  loco: {
    id: 'loco',
    label: '🤪 El Portero Loco',
    names: ['René Higüita 🦂', 'Loco Gatti 🤪', 'Chilavert Bravo 🇵🇾', 'Jorge Camposo 🌈'],
    emotes: [
      { emoji: '😂', text: '¡Hazme un Panenka si te atreves!' },
      { emoji: '🤪', text: '¡La paro haciendo el escorpión!' },
      { emoji: '🔥', text: '¡Aquí mando yo en el área!' }
    ]
  }
};

class AIOpponent {
  constructor(personality = 'psicologo') {
    this.personality = AI_PERSONALITIES[personality] ? personality : 'psicologo';
    this.history = [];
    this.humanLastChoices = [];
    this.humanKeeperChoices = [];
    this.name = this.getRandomBotName();
  }

  setPersonality(personality) {
    if (AI_PERSONALITIES[personality]) {
      this.personality = personality;
      this.name = this.getRandomBotName(personality);
    }
  }

  getRandomBotName(personality = this.personality) {
    const p = AI_PERSONALITIES[personality];
    if (p && p.names && p.names.length > 0) {
      return p.names[Math.floor(Math.random() * p.names.length)];
    }
    return FUNNY_AI_NAMES[Math.floor(Math.random() * FUNNY_AI_NAMES.length)];
  }

  getRandomEmote() {
    const p = AI_PERSONALITIES[this.personality] || AI_PERSONALITIES.psicologo;
    return p.emotes[Math.floor(Math.random() * p.emotes.length)];
  }

  reset() {
    this.history = [];
    this.humanLastChoices = [];
    this.humanKeeperChoices = [];
  }

  recordHumanChoice(row, col) {
    this.humanLastChoices.push({ row, col });
  }

  recordHumanKeeperChoice(row, col) {
    this.humanKeeperChoices.push({ row, col });
  }

  /**
   * Decide la casilla para la IA según el rol (Tirador o Portero) y su personalidad
   */
  decide(role = 'shooter') {
    const rand = Math.random();

    // 1. NOVATO: Tira casi siempre raso o al centro, y como portero rara vez llega a las escuadras
    if (this.personality === 'novato') {
      if (role === 'shooter') {
        if (rand < 0.50) return { row: 1, col: 1 };
        if (rand < 0.85) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return { row: 0, col: 1 };
      } else {
        if (rand < 0.45) return { row: 1, col: 1 };
        if (rand < 0.85) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }

    // 2. CAZADOR DE ESCUADRAS: Obsesionado con los ángulos superiores
    if (this.personality === 'escuadras') {
      if (role === 'shooter') {
        if (rand < 0.72) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        if (rand < 0.88) return { row: 0, col: 1 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      } else {
        if (rand < 0.65) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      }
    }

    // 3. EL PORTERO LOCO: Se queda mucho en el centro y hace cosas inesperadas
    if (this.personality === 'loco') {
      if (role === 'shooter') {
        if (rand < 0.45) return Math.random() < 0.5 ? { row: 0, col: 1 } : { row: 1, col: 1 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      } else {
        if (rand < 0.48) return Math.random() < 0.65 ? { row: 1, col: 1 } : { row: 0, col: 1 };
        const corners = [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }];
        return corners[Math.floor(Math.random() * corners.length)];
      }
    }

    // 4. EL PSICÓLOGO (Por defecto): Analiza patrones del humano en tiempo real
    if (role === 'shooter') {
      // Si tenemos datos de a dónde se tira el humano como portero, tirar a la zona que menos defiende
      if (this.humanKeeperChoices.length >= 2 && Math.random() < 0.65) {
        const counts = [
          [0, 0, 0],
          [0, 0, 0]
        ];
        this.humanKeeperChoices.forEach(c => {
          if (counts[c.row] && counts[c.row][c.col] !== undefined) counts[c.row][c.col]++;
        });
        let minCount = Infinity;
        const leastDefended = [];
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            if (counts[r][c] < minCount) {
              minCount = counts[r][c];
              leastDefended.length = 0;
              leastDefended.push({ row: r, col: c });
            } else if (counts[r][c] === minCount) {
              leastDefended.push({ row: r, col: c });
            }
          }
        }
        if (leastDefended.length > 0) {
          return leastDefended[Math.floor(Math.random() * leastDefended.length)];
        }
      }

      if (rand < 0.35) {
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      } else if (rand < 0.70) {
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      } else if (rand < 0.85) {
        return { row: 1, col: 1 };
      } else {
        return { row: 0, col: 1 };
      }
    } else {
      // Como portero psicólogo: analizar la zona favorita del humano o predecir cambio de lado
      if (this.humanLastChoices.length >= 2 && Math.random() < 0.65) {
        const counts = [
          [0, 0, 0],
          [0, 0, 0]
        ];
        this.humanLastChoices.forEach(c => {
          if (counts[c.row] && counts[c.row][c.col] !== undefined) counts[c.row][c.col]++;
        });
        let maxCount = -1;
        let favZone = null;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            if (counts[r][c] > maxCount) {
              maxCount = counts[r][c];
              favZone = { row: r, col: c };
            }
          }
        }
        if (favZone && maxCount >= 2) {
          return favZone;
        }
      }

      if (this.humanLastChoices.length > 0 && Math.random() < 0.5) {
        const last = this.humanLastChoices[this.humanLastChoices.length - 1];
        const targetCol = last.col === 0 ? 2 : (last.col === 2 ? 0 : (Math.random() < 0.5 ? 0 : 2));
        const targetRow = Math.random() < 0.5 ? 0 : 1;
        return { row: targetRow, col: targetCol };
      }

      const allCells = [
        { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
        { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
      ];
      return allCells[Math.floor(Math.random() * allCells.length)];
    }
  }
}

window.AIOpponent = AIOpponent;
window.AI_PERSONALITIES = AI_PERSONALITIES;
