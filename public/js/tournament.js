/**
 * Módulo de cliente para la gestión y visualización de Torneos Eliminatorios.
 * Renderiza el cuadro (bracket) para 4, 8 y 16 jugadores,
 * gestiona la sala de espera del torneo y la navegación a los partidos.
 */
class TournamentView {
  constructor({ onStartTournament, onEnterMatch, onBackToLobby }) {
    this.onStartTournament = onStartTournament;
    this.onEnterMatch = onEnterMatch;
    this.onBackToLobby = onBackToLobby;

    this.currentTournament = null;
    this.myId = null;
    this.myClientId = null;
    this.myName = null;
    this.isHost = false;

    // Elementos del DOM
    this.lobbyScreen = document.getElementById('tournament-lobby-screen');
    this.bracketScreen = document.getElementById('tournament-bracket-screen');
    this.championModal = document.getElementById('tournament-champion-modal');

    // Elementos de la sala de espera de torneo
    this.titleEl = document.getElementById('tourney-lobby-title');
    this.codeEl = document.getElementById('tourney-lobby-code');
    this.slotsCountEl = document.getElementById('tourney-slots-count');
    this.participantsGridEl = document.getElementById('tourney-participants-grid');
    this.shareLinkInput = document.getElementById('tourney-share-link-input');
    this.copyLinkBtn = document.getElementById('tourney-copy-link-btn');
    this.shareWhatsappBtn = document.getElementById('tourney-share-whatsapp-btn');
    this.shareTelegramBtn = document.getElementById('tourney-share-telegram-btn');
    this.shareTwitterBtn = document.getElementById('tourney-share-twitter-btn');
    this.shareEmailBtn = document.getElementById('tourney-share-email-btn');
    this.shareNativeBtn = document.getElementById('tourney-share-native-btn');
    this.startBtn = document.getElementById('tourney-start-btn');
    this.guestWaitingMsg = document.getElementById('tourney-guest-waiting-msg');

    // Elementos del cuadro eliminatorio
    this.bracketTitleEl = document.getElementById('tourney-bracket-title');
    this.bracketStageBadgeEl = document.getElementById('tourney-stage-badge');
    this.bracketContainerEl = document.getElementById('tourney-bracket-container');
    this.myMatchAlertEl = document.getElementById('tourney-my-match-alert');

    // Modal de Campeón
    this.championNameEl = document.getElementById('tourney-champion-name');
    this.championPodiumEl = document.getElementById('tourney-podium-details');
    this.championBackBtn = document.getElementById('tourney-champion-back-btn');

    this.bindEvents();
  }

  bindEvents() {
    if (this.copyLinkBtn && this.shareLinkInput) {
      this.copyLinkBtn.addEventListener('click', () => {
        this.shareLinkInput.select();
        navigator.clipboard.writeText(this.shareLinkInput.value).then(() => {
          this.showToast('¡Enlace del torneo copiado al portapapeles!');
        }).catch(() => {
          document.execCommand('copy');
          this.showToast('¡Enlace copiado!');
        });
      });
    }

    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        if (typeof this.onStartTournament === 'function' && this.currentTournament) {
          this.startBtn.setAttribute('disabled', 'true');
          this.startBtn.innerHTML = '⏳ Rellenando con IA y generando cuadro...';
          this.onStartTournament(this.currentTournament.id);
        }
      });
    }

    if (this.championBackBtn) {
      this.championBackBtn.addEventListener('click', () => {
        if (typeof this.onBackToLobby === 'function') {
          this.onBackToLobby();
        }
      });
    }
  }

  showToast(msg) {
    const toast = document.getElementById('copy-toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 3000);
    }
  }

  setTournamentData(tournament, myId, isHost, myClientId, myName) {
    this.currentTournament = tournament;
    if (myId) this.myId = myId;
    if (typeof isHost === 'boolean') this.isHost = isHost;
    if (myClientId) this.myClientId = myClientId;
    if (myName) this.myName = myName;
  }

  isParticipantMe(p) {
    if (!p || p.isBot) return false;
    if (this.myClientId && p.clientId && p.clientId === this.myClientId) return true;
    if (this.myId && (p.id === this.myId || p.socketId === this.myId)) return true;
    if (this.myName && p.name && p.name.trim().toLowerCase() === this.myName.trim().toLowerCase()) return true;
    return false;
  }

  /**
   * Renderiza la sala de espera con las plazas y participantes actuales
   */
  renderLobby(tournament, myId, isHost, myClientId, myName) {
    this.setTournamentData(tournament, myId, isHost, myClientId, myName);

    if (this.titleEl) this.titleEl.textContent = tournament.name;
    if (this.codeEl) this.codeEl.textContent = tournament.id;

    const humanCount = tournament.participants.filter(p => !p.isBot).length;
    const totalSlots = tournament.size;
    const emptySlots = totalSlots - humanCount;

    if (this.slotsCountEl) {
      const formatLabel = tournament.penaltiesPerPlayer === 0
        ? '🔥 Muerte Súbita directa'
        : `⚽ ${tournament.penaltiesPerPlayer || 5} Penaltis por jugador`;
      this.slotsCountEl.innerHTML = `
        <strong>${humanCount}</strong> de <strong>${totalSlots}</strong> plazas cubiertas por humanos &bull; <strong>${formatLabel}</strong>
        <span class="slots-sub">(${emptySlots} plazas se completarán automáticamente con IA al iniciar)</span>
      `;
    }

    // Configurar enlace y botones de compartir en redes
    let baseUrl = window.location.origin;
    let shareUrl = `${baseUrl}/?tournament=${encodeURIComponent(tournament.id)}`;
    if (this.shareLinkInput) {
      this.shareLinkInput.value = shareUrl;
    }

    const shareText = `🏆 ¡Únete a mi torneo eliminatorio "${tournament.name}" (${tournament.id}) en ¡PENALTAZO!! Entra aquí:`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedFull = encodeURIComponent(`${shareText} ${shareUrl}`);

    if (this.shareWhatsappBtn) {
      this.shareWhatsappBtn.href = `https://api.whatsapp.com/send?text=${encodedFull}`;
    }
    if (this.shareTelegramBtn) {
      this.shareTelegramBtn.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    }
    if (this.shareTwitterBtn) {
      this.shareTwitterBtn.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    }
    if (this.shareEmailBtn) {
      const subject = encodeURIComponent(`🏆 Torneo ${tournament.name} en ¡PENALTAZO! (${tournament.id})`);
      this.shareEmailBtn.href = `mailto:?subject=${subject}&body=${encodedFull}`;
    }
    if (this.shareNativeBtn) {
      this.shareNativeBtn.onclick = async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Torneo ${tournament.name} - ¡PENALTAZO!`,
              text: shareText,
              url: shareUrl
            });
          } catch (err) {
            // Cancelado por el usuario
          }
        } else {
          navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
            this.showToast('¡Invitación del torneo copiada al portapapeles!');
          });
        }
      };
    }

    // Renderizar tarjetas de participantes y plazas vacías
    if (this.participantsGridEl) {
      this.participantsGridEl.innerHTML = '';

      for (let i = 0; i < totalSlots; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'tourney-participant-slot';

        if (i < tournament.participants.length) {
          const p = tournament.participants[i];
          const isMe = this.isParticipantMe(p);
          slotEl.classList.add('slot-filled');
          if (isMe) slotEl.classList.add('slot-is-me');

          slotEl.innerHTML = `
            <div class="participant-avatar">${p.isHost ? '👑' : '⚽'}</div>
            <div class="participant-info">
              <span class="participant-name">${p.name} ${isMe ? '(Tú)' : ''}</span>
              <span class="participant-tag">${p.isHost ? 'Organizador' : 'Jugador'}</span>
            </div>
            <div class="participant-status ${p.connected ? 'online' : 'offline'}"></div>
          `;
        } else {
          slotEl.classList.add('slot-empty');
          slotEl.innerHTML = `
            <div class="participant-avatar empty-avatar">🤖</div>
            <div class="participant-info">
              <span class="participant-name empty-name">Plaza libre #${i + 1}</span>
              <span class="participant-tag empty-tag">Se cubrirá con IA de jugador famoso</span>
            </div>
          `;
        }

        this.participantsGridEl.appendChild(slotEl);
      }
    }

    // Controles de anfitrión vs invitado
    if (this.isHost) {
      if (this.startBtn) {
        this.startBtn.classList.remove('hidden');
        this.startBtn.removeAttribute('disabled');
        this.startBtn.innerHTML = `
          <span class="btn-icon">⚡</span>
          <span class="btn-text">¡Empezar Torneo Ahora! (Rellenar huecos con IA)</span>
        `;
      }
      if (this.guestWaitingMsg) this.guestWaitingMsg.classList.add('hidden');
    } else {
      if (this.startBtn) this.startBtn.classList.add('hidden');
      if (this.guestWaitingMsg) {
        this.guestWaitingMsg.classList.remove('hidden');
        this.guestWaitingMsg.innerHTML = `
          <div class="pulse-loader"></div>
          <span>Esperando a que el anfitrión comience el torneo...</span>
        `;
      }
    }
  }

  /**
   * Renderiza el cuadro eliminatorio completo (Bracket) con actualización en tiempo real de marcadores
   */
  renderBracket(tournament, myId, myClientId, myName) {
    this.setTournamentData(tournament, myId, undefined, myClientId, myName);

    if (this.bracketTitleEl) this.bracketTitleEl.textContent = `🏆 ${tournament.name}`;

    const currentRound = tournament.bracket[tournament.currentRoundIndex];
    if (this.bracketStageBadgeEl && currentRound) {
      this.bracketStageBadgeEl.textContent = currentRound.name.toUpperCase();
    }

    // Comprobar si el usuario actual tiene un partido listo para jugar
    this.checkMyUpcomingMatch(tournament);

    if (!this.bracketContainerEl) return;

    const existingTree = this.bracketContainerEl.querySelector(`.bracket-tree.bracket-size-${tournament.size}`);

    if (existingTree) {
      // Actualización en tiempo real sin destruir el DOM para no resetear scroll ni provocar parpadeos
      tournament.bracket.forEach((round, rIndex) => {
        const roundCol = existingTree.querySelector(`.bracket-round-col.round-${rIndex}`);
        if (roundCol) {
          if (rIndex === tournament.currentRoundIndex) {
            roundCol.classList.add('active-round');
          } else {
            roundCol.classList.remove('active-round');
          }
        }

        round.matches.forEach((match, mIndex) => {
          this.updateMatchCardInPlace(match, rIndex, mIndex, tournament);
        });
      });
    } else {
      // Primera construcción o cambio de tamaño del torneo
      this.bracketContainerEl.innerHTML = '';

      const bracketWrapper = document.createElement('div');
      bracketWrapper.className = `bracket-tree bracket-size-${tournament.size}`;

      tournament.bracket.forEach((round, rIndex) => {
        const roundCol = document.createElement('div');
        roundCol.className = `bracket-round-col round-${rIndex}`;
        if (rIndex === tournament.currentRoundIndex) {
          roundCol.classList.add('active-round');
        }

        const roundHeader = document.createElement('div');
        roundHeader.className = 'bracket-round-header';
        roundHeader.innerHTML = `<span>${round.name}</span>`;
        roundCol.appendChild(roundHeader);

        const matchesList = document.createElement('div');
        matchesList.className = 'bracket-matches-list';

        round.matches.forEach((match, mIndex) => {
          const matchCard = this.createMatchCard(match, rIndex, mIndex, tournament);
          matchesList.appendChild(matchCard);
        });

        roundCol.appendChild(matchesList);
        bracketWrapper.appendChild(roundCol);
      });

      this.bracketContainerEl.appendChild(bracketWrapper);
    }

    // Si el torneo ha terminado, mostrar modal de campeón
    if (tournament.status === 'completed' && tournament.champion) {
      this.showChampionModal(tournament);
    }
  }

  createMatchCard(match, roundIndex, matchIndex, tournament) {
    const card = document.createElement('div');
    const isMeInMatch = this.isParticipantMe(match.p1) || this.isParticipantMe(match.p2);
    card.className = `bracket-match-card status-${match.status}${isMeInMatch ? ' match-is-mine' : ''}`;
    card.dataset.matchId = match.id;
    card.dataset.roundIndex = roundIndex;
    card.dataset.matchIndex = matchIndex;

    const p1 = match.p1;
    const p2 = match.p2;
    const isPlaying = (match.status === 'playing');

    const p1IsWinner = match.winner && p1 && (match.winner.id === p1.id || (p1.clientId && match.winner.clientId === p1.clientId));
    const p2IsWinner = match.winner && p2 && (match.winner.id === p2.id || (p2.clientId && match.winner.clientId === p2.clientId));

    // Etiqueta de estado en directo o finalizado
    let statusLabel = '';
    if (match.status === 'finished') {
      statusLabel = '<span class="match-badge finished">Finalizado</span>';
    } else if (isPlaying) {
      statusLabel = '<span class="match-badge playing live-pulse"><span class="live-dot"></span> EN VIVO</span>';
    } else if (match.status === 'ready') {
      statusLabel = '<span class="match-badge ready">Listo</span>';
    } else {
      statusLabel = '<span class="match-badge pending">Pendiente</span>';
    }

    const p1ScoreText = (match.score && match.score.p1 !== null)
      ? match.score.p1
      : (isPlaying ? '0' : '-');

    const p2ScoreText = (match.score && match.score.p2 !== null)
      ? match.score.p2
      : (isPlaying ? '0' : '-');

    card.innerHTML = `
      <div class="match-card-header">
        <span class="match-num">P${matchIndex + 1}</span>
        ${statusLabel}
      </div>
      <div class="match-participants">
        <div class="match-row ${p1IsWinner ? 'is-winner' : ''} ${match.winner && !p1IsWinner ? 'is-loser' : ''}">
          <div class="match-p-info">
            <span class="p-avatar">${p1 ? (p1.isBot ? '🤖' : '⚽') : '⚪'}</span>
            <span class="p-name">${p1 ? p1.name : 'Por definir'}</span>
          </div>
          <span class="match-p-score ${isPlaying ? 'live-score' : ''}" data-score-for="p1">${p1ScoreText}</span>
        </div>

        <div class="match-row ${p2IsWinner ? 'is-winner' : ''} ${match.winner && !p2IsWinner ? 'is-loser' : ''}">
          <div class="match-p-info">
            <span class="p-avatar">${p2 ? (p2.isBot ? '🤖' : '⚽') : '⚪'}</span>
            <span class="p-name">${p2 ? p2.name : 'Por definir'}</span>
          </div>
          <span class="match-p-score ${isPlaying ? 'live-score' : ''}" data-score-for="p2">${p2ScoreText}</span>
        </div>
      </div>
    `;

    // Si el usuario humano participa en este partido y está listo o en juego, añadir botón de entrar
    if (isMeInMatch && (match.status === 'ready' || match.status === 'playing')) {
      const playBtn = document.createElement('button');
      playBtn.className = 'btn btn-primary btn-play-match';
      playBtn.innerHTML = `⚽ JUGAR PARTIDO AHORA`;
      playBtn.addEventListener('click', () => {
        if (typeof this.onEnterMatch === 'function') {
          this.onEnterMatch(tournament.id, roundIndex, matchIndex);
        }
      });
      card.appendChild(playBtn);
    }

    return card;
  }

  updateMatchCardInPlace(match, roundIndex, matchIndex, tournament) {
    const card = this.bracketContainerEl.querySelector(`[data-match-id="${match.id}"]`);
    if (!card) return;

    const p1 = match.p1;
    const p2 = match.p2;
    const isMeInMatch = this.isParticipantMe(p1) || this.isParticipantMe(p2);
    const isPlaying = (match.status === 'playing');

    card.className = `bracket-match-card status-${match.status}${isMeInMatch ? ' match-is-mine' : ''}`;

    const p1IsWinner = match.winner && p1 && (match.winner.id === p1.id || (p1.clientId && match.winner.clientId === p1.clientId));
    const p2IsWinner = match.winner && p2 && (match.winner.id === p2.id || (p2.clientId && match.winner.clientId === p2.clientId));

    // 1. Actualizar cabecera y etiqueta de estado (badge)
    const headerEl = card.querySelector('.match-card-header');
    if (headerEl) {
      let statusLabel = '';
      if (match.status === 'finished') {
        statusLabel = '<span class="match-badge finished">Finalizado</span>';
      } else if (isPlaying) {
        statusLabel = '<span class="match-badge playing live-pulse"><span class="live-dot"></span> EN VIVO</span>';
      } else if (match.status === 'ready') {
        statusLabel = '<span class="match-badge ready">Listo</span>';
      } else {
        statusLabel = '<span class="match-badge pending">Pendiente</span>';
      }

      headerEl.innerHTML = `
        <span class="match-num">P${matchIndex + 1}</span>
        ${statusLabel}
      `;
    }

    // 2. Actualizar participantes y marcadores en tiempo real
    const p1Row = card.querySelector('.match-row:nth-child(1)');
    const p2Row = card.querySelector('.match-row:nth-child(2)');

    if (p1Row) {
      p1Row.className = `match-row ${p1IsWinner ? 'is-winner' : ''} ${match.winner && !p1IsWinner ? 'is-loser' : ''}`;
      const nameEl = p1Row.querySelector('.p-name');
      if (nameEl) nameEl.textContent = p1 ? p1.name : 'Por definir';
      const avatarEl = p1Row.querySelector('.p-avatar');
      if (avatarEl) avatarEl.textContent = p1 ? (p1.isBot ? '🤖' : '⚽') : '⚪';

      const scoreEl = p1Row.querySelector('[data-score-for="p1"]') || p1Row.querySelector('.match-p-score');
      if (scoreEl) {
        scoreEl.dataset.scoreFor = 'p1';
        const newScoreText = (match.score && match.score.p1 !== null)
          ? String(match.score.p1)
          : (isPlaying ? '0' : '-');
        const oldScoreText = scoreEl.textContent.trim();

        if (oldScoreText !== newScoreText && oldScoreText !== '-' && newScoreText !== '-') {
          scoreEl.classList.remove('score-bump');
          void scoreEl.offsetWidth; // forzar reflujo CSS para reiniciar animación
          scoreEl.classList.add('score-bump');
        }

        scoreEl.textContent = newScoreText;
        scoreEl.className = `match-p-score ${isPlaying ? 'live-score' : ''}`;
      }
    }

    if (p2Row) {
      p2Row.className = `match-row ${p2IsWinner ? 'is-winner' : ''} ${match.winner && !p2IsWinner ? 'is-loser' : ''}`;
      const nameEl = p2Row.querySelector('.p-name');
      if (nameEl) nameEl.textContent = p2 ? p2.name : 'Por definir';
      const avatarEl = p2Row.querySelector('.p-avatar');
      if (avatarEl) avatarEl.textContent = p2 ? (p2.isBot ? '🤖' : '⚽') : '⚪';

      const scoreEl = p2Row.querySelector('[data-score-for="p2"]') || p2Row.querySelector('.match-p-score');
      if (scoreEl) {
        scoreEl.dataset.scoreFor = 'p2';
        const newScoreText = (match.score && match.score.p2 !== null)
          ? String(match.score.p2)
          : (isPlaying ? '0' : '-');
        const oldScoreText = scoreEl.textContent.trim();

        if (oldScoreText !== newScoreText && oldScoreText !== '-' && newScoreText !== '-') {
          scoreEl.classList.remove('score-bump');
          void scoreEl.offsetWidth;
          scoreEl.classList.add('score-bump');
        }

        scoreEl.textContent = newScoreText;
        scoreEl.className = `match-p-score ${isPlaying ? 'live-score' : ''}`;
      }
    }

    // 3. Botón para jugar si corresponde
    let playBtn = card.querySelector('.btn-play-match');
    if (isMeInMatch && (match.status === 'ready' || match.status === 'playing')) {
      if (!playBtn) {
        playBtn = document.createElement('button');
        playBtn.className = 'btn btn-primary btn-play-match';
        playBtn.innerHTML = `⚽ JUGAR PARTIDO AHORA`;
        playBtn.addEventListener('click', () => {
          if (typeof this.onEnterMatch === 'function') {
            this.onEnterMatch(tournament.id, roundIndex, matchIndex);
          }
        });
        card.appendChild(playBtn);
      }
    } else if (playBtn) {
      playBtn.remove();
    }
  }

  checkMyUpcomingMatch(tournament) {
    if (!this.myMatchAlertEl) return;

    if (tournament.status === 'completed') {
      this.myMatchAlertEl.classList.add('hidden');
      return;
    }

    // 1. Buscar si el usuario tiene un partido listo para jugar en cualquier ronda disponible
    let myReadyMatch = null;
    let matchRound = null;

    for (let r = 0; r < tournament.bracket.length; r++) {
      const round = tournament.bracket[r];
      for (let i = 0; i < round.matches.length; i++) {
        const m = round.matches[i];
        const isMe = this.isParticipantMe(m.p1) || this.isParticipantMe(m.p2);
        if (isMe && (m.status === 'ready' || m.status === 'playing')) {
          myReadyMatch = m;
          matchRound = round;
          break;
        }
      }
      if (myReadyMatch) break;
    }

    if (myReadyMatch && matchRound) {
      const isP1Me = this.isParticipantMe(myReadyMatch.p1);
      const opponent = isP1Me ? myReadyMatch.p2 : myReadyMatch.p1;
      const opponentName = opponent ? opponent.name : 'Rival';

      this.myMatchAlertEl.classList.remove('hidden');
      this.myMatchAlertEl.innerHTML = `
        <div class="alert-content">
          <div class="alert-icon">⚡</div>
          <div class="alert-texts">
            <strong>¡ES TU TURNO DE SALIR AL CAMPO!</strong>
            <span>Te enfrentas a <strong>${opponentName}</strong> en ${matchRound.name}. Pulsa en tu partido del cuadro para jugar.</span>
          </div>
        </div>
      `;
      return;
    }

    // 2. Comprobar si el usuario ha sido eliminado
    let hasBeenEliminated = false;
    for (const round of tournament.bracket) {
      for (const m of round.matches) {
        if (m.status === 'finished') {
          const wasInMatch = this.isParticipantMe(m.p1) || this.isParticipantMe(m.p2);
          if (wasInMatch && m.winner && !this.isParticipantMe(m.winner)) {
            hasBeenEliminated = true;
          }
        }
      }
    }

    if (hasBeenEliminated) {
      this.myMatchAlertEl.classList.remove('hidden');
      this.myMatchAlertEl.innerHTML = `
        <div class="alert-content">
          <div class="alert-icon">🍿</div>
          <div class="alert-texts">
            <strong>Modo Espectador</strong>
            <span>Has caído con honor. Disfruta de la emoción del resto de eliminatorias del torneo en vivo.</span>
          </div>
        </div>
      `;
      return;
    }

    // 3. Si no está eliminado y no tiene partido listo aún, está esperando que terminen otros cruces
    const currentRound = tournament.bracket[tournament.currentRoundIndex];
    const roundName = currentRound ? currentRound.name : 'la ronda';
    this.myMatchAlertEl.classList.remove('hidden');
    this.myMatchAlertEl.innerHTML = `
      <div class="alert-content">
        <div class="alert-icon">⏳</div>
        <div class="alert-texts">
          <strong>Esperando a tus rivales...</strong>
          <span>Los demás partidos de ${roundName} se están disputando. En cuanto acaben, se generará tu siguiente cruce.</span>
        </div>
      </div>
    `;
  }

  showChampionModal(tournament) {
    if (!this.championModal) return;
    this.championModal.classList.remove('hidden');

    const champ = tournament.champion;
    const runner = tournament.runnerUp;

    if (this.championNameEl && champ) {
      this.championNameEl.innerHTML = `
        <div class="trophy-bounce">🏆</div>
        <div class="champ-title">¡¡CAMPEÓN DEL TORNEO!!</div>
        <div class="champ-name">${champ.name} ${champ.isBot ? '(IA)' : ''}</div>
      `;
    }

    if (this.championPodiumEl && champ && runner) {
      this.championPodiumEl.innerHTML = `
        <div class="podium-card gold">
          <span class="medal">🥇 Campeón</span>
          <strong>${champ.name}</strong>
        </div>
        <div class="podium-card silver">
          <span class="medal">🥈 Subcampeón</span>
          <strong>${runner.name}</strong>
        </div>
      `;
    }

    if (window.soundEngine) {
      window.soundEngine.playGoal();
      window.soundEngine.playCrowdCheer(true);
    }
  }
}

window.TournamentView = TournamentView;
