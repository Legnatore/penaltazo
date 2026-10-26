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

class AIOpponent {
  constructor() {
    this.history = [];
    this.humanLastChoices = [];
    this.name = this.getRandomBotName();
  }

  getRandomBotName() {
    return FUNNY_AI_NAMES[Math.floor(Math.random() * FUNNY_AI_NAMES.length)];
  }

  reset() {
    this.history = [];
    this.humanLastChoices = [];
  }

  recordHumanChoice(row, col) {
    this.humanLastChoices.push({ row, col });
  }

  /**
   * Decide la casilla para la IA según el rol (Tirador o Portero)
   * Usa una mezcla de psicología de juego de penaltis y aleatoriedad ponderada
   */
  decide(role = 'shooter') {
    // 6 casillas posibles: [row, col]
    // [0,0] Escuadra Izq | [0,1] Centro Arriba | [0,2] Escuadra Dcha
    // [1,0] Raso Izq     | [1,1] Centro Raso   | [1,2] Raso Dcha

    const rand = Math.random();

    if (role === 'shooter') {
      // Como tirador: los humanos suelen disparar a las esquinas (65%), a veces raso al centro (20%), escuadra centro (15%)
      if (rand < 0.35) {
        // Escuadras arriba
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      } else if (rand < 0.70) {
        // Rasos pegados al palo
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      } else if (rand < 0.85) {
        // Al centro engañando al portero (panenka / raso centro)
        return { row: 1, col: 1 };
      } else {
        // Al centro arriba
        return { row: 0, col: 1 };
      }
    } else {
      // Como portero: intentar adivinar.
      // Si el humano tiró a una casilla en el turno anterior, hay un 75% de probabilidad de que NO repita la misma.
      if (this.humanLastChoices.length > 0 && Math.random() < 0.45) {
        const last = this.humanLastChoices[this.humanLastChoices.length - 1];
        // Predecir que cambiará de lado (de col 0 a col 2 o viceversa)
        const targetCol = last.col === 0 ? 2 : (last.col === 2 ? 0 : (Math.random() < 0.5 ? 0 : 2));
        const targetRow = Math.random() < 0.5 ? 0 : 1;
        return { row: targetRow, col: targetCol };
      }

      // Distribución general de estiradas del portero
      const allCells = [
        { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
        { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
      ];
      return allCells[Math.floor(Math.random() * allCells.length)];
    }
  }
}

window.AIOpponent = AIOpponent;
