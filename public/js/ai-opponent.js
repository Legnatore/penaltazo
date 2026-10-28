/**
 * Oponente inteligente para jugar en solitario / modo práctica contra la CPU.
 * En cada partida se selecciona aleatoriamente una parodia de un jugador o leyenda
 * famosa del fútbol mundial, con su propio estilo de juego, mañas, nivel y frases.
 */

const AI_PARODY_PLAYERS = {
  rolando: {
    id: 'rolando',
    name: 'Cristiano Rolando 🇵🇹',
    realPlayer: 'Cristiano Ronaldo',
    roleLabel: 'Delantero Letal',
    levelTitle: 'El Bicho de las Escuadras ⭐⭐⭐⭐⭐',
    intro: '🎙️ ¡En el césped está Cristiano Rolando! Ya está con las piernas abiertas listo para reventar las escuadras.',
    emotes: [
      { emoji: '🔥', text: '¡Siuuuuu! ¡Aquí mando yo!' },
      { emoji: '🚀', text: '¡Misil teledirigido a la escuadra!' },
      { emoji: '😠', text: '¡Inyusticia total! ¡Ese balón tenía efecto!' },
      { emoji: '💪', text: '¡El Bicho nunca perdona desde los 11 metros!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Obsesión con las escuadras y esquinas potentes
        if (rand < 0.70) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        if (rand < 0.92) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return { row: 0, col: 1 };
      } else {
        // Estiradas atléticas a los postes
        if (rand < 0.65) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      }
    }
  },

  missi: {
    id: 'missi',
    name: 'Leo Missi 🇦🇷',
    realPlayer: 'Lionel Messi',
    roleLabel: 'Genio Táctico',
    levelTitle: 'La Pulga Legendaria ⭐⭐⭐⭐⭐',
    intro: '🎙️ ¡Enfrente tienes a Leo Missi! Mirada gacha y frialdad milimétrica antes de ejecutar con el guante.',
    emotes: [
      { emoji: '🤫', text: '¿Qué mirás, bobo? Andá pa\' allá.' },
      { emoji: '🎯', text: 'La clavé con sutileza y mimo.' },
      { emoji: '🧠', text: 'Te leí el movimiento antes de que te tiraras.' },
      { emoji: '🇦🇷', text: 'Tranquilo, que esto recién empieza.' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Analiza dónde se tira el humano como portero y chuta al lado opuesto o mete vaselina
        if (ai.humanKeeperChoices.length >= 1 && rand < 0.75) {
          const lastKeeper = ai.humanKeeperChoices[ai.humanKeeperChoices.length - 1];
          const oppCol = lastKeeper.col === 0 ? 2 : (lastKeeper.col === 2 ? 0 : 1);
          // Si el portero se tiró al medio, la coloca en una esquina; si se tiró a esquina, pica suave
          if (lastKeeper.col === 1) return { row: Math.random() < 0.5 ? 0 : 1, col: Math.random() < 0.5 ? 0 : 2 };
          if (Math.random() < 0.35) return { row: 0, col: 1 }; // vaselina sutil
          return { row: Math.random() < 0.5 ? 0 : 1, col: oppCol };
        }
        if (rand < 0.40) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        if (rand < 0.70) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return { row: 0, col: 1 };
      } else {
        // Como portero: detecta patrones del humano con alta precisión
        if (ai.humanLastChoices.length >= 1 && rand < 0.70) {
          const lastShot = ai.humanLastChoices[ai.humanLastChoices.length - 1];
          return { row: lastShot.row, col: lastShot.col };
        }
        const corners = [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }];
        return corners[Math.floor(Math.random() * corners.length)];
      }
    }
  },

  dibu: {
    id: 'dibu',
    name: 'Dibu Martillo 🧤',
    realPlayer: 'Emiliano Martínez',
    roleLabel: 'Muralla Psicológica',
    levelTitle: 'El Devorador Mental ⭐⭐⭐⭐⭐',
    intro: '🎙️ ¡Bajo palos se mueve Dibu Martillo! Ya está bailando y hablándote para meterte presión psicológica.',
    emotes: [
      { emoji: '🧤', text: '¡Mirá que te como, hermano! ¡Te como!' },
      { emoji: '🕺', text: '¡Bailadita prohibida en el área!' },
      { emoji: '🤫', text: '¡Te pusiste nervioso y te lo paré!' },
      { emoji: '🔥', text: '¡Aquí mando yo desde el vestuario!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Tiro firme y decidido abajo a los palos
        if (rand < 0.60) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        if (rand < 0.85) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return { row: 1, col: 1 };
      } else {
        // Portero maestro en juego psicológico
        if (ai.humanLastChoices.length >= 2 && rand < 0.75) {
          const last = ai.humanLastChoices[ai.humanLastChoices.length - 1];
          const prev = ai.humanLastChoices[ai.humanLastChoices.length - 2];
          // Si el humano alternó lados, predecir el siguiente salto
          if (last.col !== prev.col) {
            const nextCol = last.col === 0 ? 2 : (last.col === 2 ? 0 : 1);
            return { row: last.row, col: nextCol };
          }
          return { row: last.row, col: last.col };
        }
        if (rand < 0.50) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }
  },

  casillas: {
    id: 'casillas',
    name: 'Iker Casi-llas 🧤',
    realPlayer: 'Iker Casillas',
    roleLabel: 'El Santo de los Milagros',
    levelTitle: 'Reflejos Prodigiosos ⭐⭐⭐⭐⭐',
    intro: '🎙️ ¡El mítico Iker Casi-llas defiende la portería! Hará falta un disparo perfecto para batirle.',
    emotes: [
      { emoji: '🧤', text: '¡El Santo ha vuelto a aparecer en el último segundo!' },
      { emoji: '👟', text: '¡Con la punta de la bota al milímetro!' },
      { emoji: '😇', text: 'La suerte acompaña al que nunca se rinde.' },
      { emoji: '🇪🇸', text: '¡Hasta el final, vamos!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        if (rand < 0.65) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return { row: 1, col: 1 };
      } else {
        // Reflejos milagrosos que llegan a las escuadras
        if (rand < 0.45) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        if (rand < 0.85) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return { row: 0, col: 1 };
      }
    }
  },

  haaland: {
    id: 'haaland',
    name: 'Erling Jamón 🇳🇴',
    realPlayer: 'Erling Haaland',
    roleLabel: 'Androide Romperedes',
    levelTitle: 'Potencia Cibernética ⭐⭐⭐⭐',
    intro: '🎙️ ¡Se acerca el gigante Erling Jamón! Cada penalti suyo parece lanzado por una catapulta.',
    emotes: [
      { emoji: '🤖', text: '¡Bip, bop! Trayectoria calculada al 99.9%.' },
      { emoji: '💥', text: '¡Comida para el androide! ¡Gol imparable!' },
      { emoji: '⚡', text: 'Recalibrando sensores tras el impacto.' },
      { emoji: '🇳🇴', text: '¡Modo gol activado!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // 80% disparos a media altura y arriba con brutal potencia
        if (rand < 0.60) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        if (rand < 0.85) return { row: 0, col: 1 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      } else {
        // Cubre mucho centro y arriba por su envergadura
        if (rand < 0.45) return Math.random() < 0.5 ? { row: 0, col: 1 } : { row: 1, col: 1 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }
  },

  zidane: {
    id: 'zidane',
    name: 'Zidán con Pelazo 🇫🇷',
    realPlayer: 'Zinedine Zidane',
    roleLabel: 'Maestro de la Elegancia',
    levelTitle: 'Especialista en Panenka ⭐⭐⭐⭐',
    intro: '🎙️ ¡Camina hacia el balón Zidán con Pelazo! Clase pura y maestría en la vaselina.',
    emotes: [
      { emoji: '🎩', text: 'La elegancia no se improvisa, mon ami.' },
      { emoji: '🥐', text: 'Una vaselina suave como un croissant.' },
      { emoji: '😎', text: 'Siempre un paso por delante.' },
      { emoji: '🇫🇷', text: '¡Magnifique!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Alto porcentaje de Panenka sutil arriba al centro
        if (rand < 0.40) return { row: 0, col: 1 };
        if (rand < 0.80) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      } else {
        // Aguanta sereno hasta el último instante
        if (rand < 0.35) return { row: 0, col: 1 };
        if (rand < 0.70) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      }
    }
  },

  mbappe: {
    id: 'mbappe',
    name: 'Kylian Empapé 🇫🇷',
    realPlayer: 'Kylian Mbappé',
    roleLabel: 'Tortuga Supersónica',
    levelTitle: 'Velocidad Letal ⭐⭐⭐⭐',
    intro: '🎙️ ¡Llega Kylian Empapé con su zancada supersónica! Disparos directos y afilados a la madera.',
    emotes: [
      { emoji: '⚡', text: '¡Demasiado rápido para tus ojos!' },
      { emoji: '🙅‍♂️', text: 'Brazos cruzados y a celebrarlo.' },
      { emoji: '💨', text: '¡Ni el viento alcanza este disparo!' },
      { emoji: '🐢', text: '¡La tortuga ninja golpea de nuevo!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Disparos rasos y secos o arriba a los postes
        if (rand < 0.50) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        if (rand < 0.85) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return { row: 1, col: 1 };
      } else {
        if (rand < 0.50) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }
  },

  robertocarlos: {
    id: 'robertocarlos',
    name: 'Roberto Carloso 🚀',
    realPlayer: 'Roberto Carlos',
    roleLabel: 'El Cañón de Tres Dedos',
    levelTitle: 'Efecto Imposible ⭐⭐⭐⭐',
    intro: '🎙️ ¡Carrerilla kilométrica de Roberto Carloso! ¡Se prepara para chutar con el exterior!',
    emotes: [
      { emoji: '🚀', text: '¡Desafiando las leyes de la física!' },
      { emoji: '💣', text: '¡Carrerilla de 30 metros y bombazo!' },
      { emoji: '🌪️', text: '¡El efecto banana nunca falla!' },
      { emoji: '🇧🇷', text: '¡Bomba atómica directa a la red!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // 85% a las escuadras con efecto exterior
        if (rand < 0.85) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      } else {
        if (rand < 0.70) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      }
    }
  },

  modric: {
    id: 'modric',
    name: 'Luka Modricito 🇭🇷',
    realPlayer: 'Luka Modrić',
    roleLabel: 'Mago del Exterior',
    levelTitle: 'Veteranía Quirúrgica ⭐⭐⭐⭐',
    intro: '🎙️ ¡Entra Luka Modricito ajustándose la cinta del pelo! Precisión de cirujano suizo con el exterior.',
    emotes: [
      { emoji: '🪄', text: 'La veteranía es un grado, chaval.' },
      { emoji: '👟', text: 'Con el exterior del pie entra más dulce.' },
      { emoji: '⏳', text: 'El tiempo se detiene en mi golpeo.' },
      { emoji: '🇭🇷', text: '¡Maestría balcánica!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        if (rand < 0.45) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        if (rand < 0.75) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return { row: 0, col: 1 };
      } else {
        if (ai.humanLastChoices.length > 0 && rand < 0.60) {
          const last = ai.humanLastChoices[ai.humanLastChoices.length - 1];
          return { row: last.row, col: last.col };
        }
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      }
    }
  },

  karius: {
    id: 'karius',
    name: 'Loris Kariusito 🧤',
    realPlayer: 'Loris Karius',
    roleLabel: 'Manos de Mantequilla',
    levelTitle: 'Nivel Cómico / Novato ⭐⭐',
    intro: '🎙️ ¡En la portería está Loris Kariusito! Se le ve algo nervioso secándose los guantes... ¡oportunidad de oro!',
    emotes: [
      { emoji: '🧈', text: '¡Uy, se me escurrió el balón de las manos!' },
      { emoji: '🤦‍♂️', text: '¿Por qué siempre me pasa a mí en las finales?' },
      { emoji: '💡', text: '¡Es que el foco del estadio me deslumbró!' },
      { emoji: '🐣', text: '¡No me tiréis muy fuerte, por favor!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Tira débil o flojo al centro
        if (rand < 0.50) return { row: 1, col: 1 };
        if (rand < 0.80) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return { row: 0, col: 1 };
      } else {
        // A menudo se queda clavado en el centro o se tira al lado equivocado
        if (rand < 0.45) return { row: 1, col: 1 };
        if (rand < 0.80) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }
  },

  neymar: {
    id: 'neymar',
    name: 'Neymar Rodando 🇧🇷',
    realPlayer: 'Neymar Jr.',
    roleLabel: 'La Paradinha Teatrera',
    levelTitle: 'Samba y Teatro ⭐⭐⭐',
    intro: '🎙️ ¡Salta Neymar Rodando haciendo virguerías con el balón! Cuidado con su paradinha antes del tiro.',
    emotes: [
      { emoji: '🤕', text: '¡Ay, me rozaron la bota! ¡Penalti otra vez!' },
      { emoji: '🕺', text: '¡Samba y paradinha, nunca falla!' },
      { emoji: '🔄', text: '¡Mírame dar tres volteretas en el césped!' },
      { emoji: '🤙', text: 'Toiss en la victoria y en la fiesta.' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        if (rand < 0.45) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        if (rand < 0.75) return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
        return { row: 1, col: 1 };
      } else {
        const corners = [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }];
        return corners[Math.floor(Math.random() * corners.length)];
      }
    }
  },

  panenka: {
    id: 'panenka',
    name: 'Panenka Loco 🇨🇿',
    realPlayer: 'Antonín Panenka',
    roleLabel: 'El Padre de la Vaselina',
    levelTitle: 'Bohemio del Punto de Penalti ⭐⭐⭐',
    intro: '🎙️ ¡Aparece el mítico Panenka Loco con su bigote inconfundible! Solo piensa en picar el balón al centro.',
    emotes: [
      { emoji: '☕', text: '¡Auténtica vaselina estilo Belgrado 1976!' },
      { emoji: '🎈', text: 'Si no la picas suave por el centro, no tiene gracia.' },
      { emoji: '🎨', text: 'El arte de torear al portero con sutileza.' },
      { emoji: '👴', text: 'Los clásicos nunca mueren.' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Obsesión con picarla al medio
        if (rand < 0.55) return Math.random() < 0.5 ? { row: 0, col: 1 } : { row: 1, col: 1 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      } else {
        // Como sabe que otros quieren hacerle la vaselina, a menudo se queda en el centro
        if (rand < 0.50) return Math.random() < 0.65 ? { row: 0, col: 1 } : { row: 1, col: 1 };
        return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
      }
    }
  },

  kane: {
    id: 'kane',
    name: 'Harry Canas 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    realPlayer: 'Harry Kane',
    roleLabel: 'Especialista Inglés',
    levelTitle: 'El Huracán Seguro ⭐⭐⭐⭐',
    intro: '🎙️ ¡Ahí está Harry Canas con flema británica! Especialista infalible en disparos rasos y secos.',
    emotes: [
      { emoji: '☕', text: 'Safe as houses! Directo al rincón de la red.' },
      { emoji: '👑', text: '¡Por la corona y los tres puntos!' },
      { emoji: '🎯', text: 'Golpeo seco con el empeine, sin florituras.' },
      { emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', text: 'It\'s coming home!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        // Seguridad británica abajo a los postes
        if (rand < 0.70) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      } else {
        if (rand < 0.60) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }
  },

  cholo: {
    id: 'cholo',
    name: 'Cholo Motivador 🇦🇷',
    realPlayer: 'Diego Simeone',
    roleLabel: 'Grinta y Presión Total',
    levelTitle: 'Partido a Partido ⭐⭐⭐⭐',
    intro: '🎙️ ¡Llega el Cholo Motivador trajeado de riguroso negro y aplaudiendo a rabiar para contagiar garra!',
    emotes: [
      { emoji: '🔥', text: '¡Corazón, garra y partido a partido!' },
      { emoji: '💪', text: '¡Aquí no se regala ni un milímetro de red!' },
      { emoji: '⚡', text: '¡Si se cree y se trabaja con garra, se para!' },
      { emoji: '🖤', text: '¡Intensidad pura hasta el último suspiro!' }
    ],
    decide(role, ai) {
      const rand = Math.random();
      if (role === 'shooter') {
        if (rand < 0.60) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        if (rand < 0.85) return { row: 0, col: 0 };
        return { row: 1, col: 1 };
      } else {
        if (rand < 0.55) return Math.random() < 0.5 ? { row: 1, col: 0 } : { row: 1, col: 2 };
        return Math.random() < 0.5 ? { row: 0, col: 0 } : { row: 0, col: 2 };
      }
    }
  }
};

class AIOpponent {
  constructor(preferredCharacterId = null) {
    this.history = [];
    this.humanLastChoices = [];
    this.humanKeeperChoices = [];
    this.character = this.pickCharacter(preferredCharacterId);
    this.name = this.character.name;
    this.personality = this.character.id;
  }

  /**
   * Elige un contrincante aleatorio entre las parodias de jugadores famosos
   */
  pickRandomCharacter(excludeId = null) {
    const keys = Object.keys(AI_PARODY_PLAYERS);
    const pool = (excludeId && keys.length > 1) ? keys.filter(k => k !== excludeId) : keys;
    const chosenKey = pool[Math.floor(Math.random() * pool.length)];
    return this.setCharacter(chosenKey);
  }

  pickCharacter(id) {
    if (id && AI_PARODY_PLAYERS[id]) {
      return AI_PARODY_PLAYERS[id];
    }
    // Mapeo retrocompatible de antiguos identificadores
    const legacyMap = {
      novato: 'karius',
      escuadras: 'rolando',
      psicologo: 'dibu',
      loco: 'panenka'
    };
    if (id && legacyMap[id]) {
      return AI_PARODY_PLAYERS[legacyMap[id]];
    }
    // Por defecto, selección aleatoria
    const keys = Object.keys(AI_PARODY_PLAYERS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return AI_PARODY_PLAYERS[randomKey];
  }

  setCharacter(id) {
    this.character = this.pickCharacter(id);
    this.name = this.character.name;
    this.personality = this.character.id;
    return this.character;
  }

  setPersonality(personality) {
    return this.setCharacter(personality);
  }

  getRandomBotName() {
    return this.name || (this.character && this.character.name) || 'Rival Famoso ⚽';
  }

  getRandomEmote() {
    if (!this.character || !this.character.emotes || this.character.emotes.length === 0) {
      return { emoji: '⚽', text: '¡Buen tiro!' };
    }
    return this.character.emotes[Math.floor(Math.random() * this.character.emotes.length)];
  }

  getIntro() {
    return (this.character && this.character.intro) || `🎙️ ¡Enfrentándote a ${this.name}!`;
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
   * Decide la casilla para la IA según el rol y la parodia del jugador famoso
   */
  decide(role = 'shooter') {
    if (this.character && typeof this.character.decide === 'function') {
      return this.character.decide(role, this);
    }
    const allCells = [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
    ];
    return allCells[Math.floor(Math.random() * allCells.length)];
  }
}

window.AIOpponent = AIOpponent;
window.AI_PARODY_PLAYERS = AI_PARODY_PLAYERS;
// Compatibilidad hacia atrás
window.AI_PERSONALITIES = AI_PARODY_PLAYERS;
