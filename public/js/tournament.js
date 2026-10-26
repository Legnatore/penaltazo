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

  setTournamentData(tournament, myId, isHost) {
    this.currentTournament = tournament;
    if (myId) this.myId = myId;
    if (typeof isHost === 'boolean') this.isHost = isHost;
  }

  /**
   * Renderiza la sala de espera con las plazas y participantes actuales
   */
  renderLobby(tournament, myId, isHost) {
    this.setTournamentData(tournament, myId, isHost);

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
          const isMe = (p.id === this.myId || p.socketId === this.myId);
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
   * Renderiza el cuadro eliminatorio completo (Bracket)
   */
  renderBracket(tournament, myId) {
    this.setTournamentData(tournament, myId);

    if (this.bracketTitleEl) this.bracketTitleEl.textContent = `🏆 ${tournament.name}`;

    const currentRound = tournament.bracket[tournament.currentRoundIndex];
    if (this.bracketStageBadgeEl && currentRound) {
      this.bracketStageBadgeEl.textContent = currentRound.name.toUpperCase();
    }

    // Comprobar si el usuario actual tiene un partido listo para jugar
    this.checkMyUpcomingMatch(tournament);

    if (!this.bracketContainerEl) return;
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

    // Si el torneo ha terminado, mostrar modal de campeón
    if (tournament.status === 'completed' && tournament.champion) {
      this.showChampionModal(tournament);
    }
  }

  createMatchCard(match, roundIndex, matchIndex, tournament) {
    const card = document.createElement('div');
    card.className = `bracket-match-card status-${match.status}`;

    const p1 = match.p1;
    const p2 = match.p2;

    const isMeInMatch = (p1 && (p1.id === this.myId || p1.socketId === this.myId)) ||
                        (p2 && (p2.id === this.myId || p2.socketId === this.myId));

    if (isMeInMatch) {
      card.classList.add('match-is-mine');
    }

    const p1IsWinner = match.winner && p1 && match.winner.id === p1.id;
    const p2IsWinner = match.winner && p2 && match.winner.id === p2.id;

    // Etiqueta de estado
    let statusLabel = '';
    if (match.status === 'finished') statusLabel = '<span class="match-badge finished">Finalizado</span>';
    else if (match.status === 'playing') statusLabel = '<span class="match-badge playing">⚽ En juego</span>';
    else if (match.status === 'ready') statusLabel = '<span class="match-badge ready">Listo</span>';
    else statusLabel = '<span class="match-badge pending">Pendiente</span>';

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
          <span class="match-p-score">${match.score.p1 !== null ? match.score.p1 : '-'}</span>
        </div>

        <div class="match-row ${p2IsWinner ? 'is-winner' : ''} ${match.winner && !p2IsWinner ? 'is-loser' : ''}">
          <div class="match-p-info">
            <span class="p-avatar">${p2 ? (p2.isBot ? '🤖' : '⚽') : '⚪'}</span>
            <span class="p-name">${p2 ? p2.name : 'Por definir'}</span>
          </div>
          <span class="match-p-score">${match.score.p2 !== null ? match.score.p2 : '-'}</span>
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

  checkMyUpcomingMatch(tournament) {
    if (!this.myMatchAlertEl) return;

    if (tournament.status === 'completed') {
      this.myMatchAlertEl.classList.add('hidden');
      return;
    }

    const currentRound = tournament.bracket[tournament.currentRoundIndex];
    if (!currentRound) return;

    let myReadyMatch = null;
    let rIdx = tournament.currentRoundIndex;
    let mIdx = 0;

    for (let i = 0; i < currentRound.matches.length; i++) {
      const m = currentRound.matches[i];
      const isP1Me = m.p1 && (m.p1.id === this.myId || m.p1.socketId === this.myId);
      const isP2Me = m.p2 && (m.p2.id === this.myId || m.p2.socketId === this.myId);

      if ((isP1Me || isP2Me) && (m.status === 'ready' || m.status === 'playing')) {
        myReadyMatch = m;
        mIdx = i;
        break;
      }
    }

    if (myReadyMatch) {
      const opponent = (myReadyMatch.p1.id === this.myId || myReadyMatch.p1.socketId === this.myId)
        ? myReadyMatch.p2
        : myReadyMatch.p1;

      this.myMatchAlertEl.classList.remove('hidden');
      this.myMatchAlertEl.innerHTML = `
        <div class="alert-content">
          <div class="alert-icon">⚡</div>
          <div class="alert-texts">
            <strong>¡ES TU TURNO DE SALIR AL CAMPO!</strong>
            <span>Te enfrentas a <strong>${opponent.name}</strong> en ${currentRound.name}. Pulsa en tu partido del cuadro para jugar.</span>
          </div>
        </div>
      `;
    } else {
      // Comprobar si el usuario ha sido eliminado
      let hasBeenEliminated = false;
      for (const round of tournament.bracket) {
        for (const m of round.matches) {
          if (m.status === 'finished') {
            const wasP1 = m.p1 && (m.p1.id === this.myId || m.p1.socketId === this.myId);
            const wasP2 = m.p2 && (m.p2.id === this.myId || m.p2.socketId === this.myId);
            if ((wasP1 || wasP2) && m.winner && m.winner.id !== this.myId && m.winner.socketId !== this.myId) {
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
      } else {
        this.myMatchAlertEl.classList.remove('hidden');
        this.myMatchAlertEl.innerHTML = `
          <div class="alert-content">
            <div class="alert-icon">⏳</div>
            <div class="alert-texts">
              <strong>Esperando a tus rivales...</strong>
              <span>Los otros partidos de la ronda se están disputando. En cuanto acaben, se generará tu siguiente cruce.</span>
            </div>
          </div>
        `;
      }
    }
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
