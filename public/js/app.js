// CodeNames dos Iluminados - Client Engine
(function () {
  // Determine backend and API endpoints:
  // If frontend is hosted on Vercel, connect directly to persistent Render Node.js WebSocket backend!
  const isVercel = window.location.hostname.includes('vercel.app');
  const BACKEND_URL = isVercel
    ? 'https://codenames-dos-iluminados.onrender.com'
    : (window.location.protocol === 'file:' ? 'http://localhost:3333' : '');
  const API_BASE = isVercel ? 'https://codenames-dos-iluminados.onrender.com' : '';

  const socket = (typeof io !== 'undefined')
    ? io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 8,
        timeout: 12000
      })
    : null;

  // State
  let availableBaseDecks = {};
  let customDecks = [];
  let currentGameState = null;
  let spymasterKeycardActive = false;

  // Views
  const viewLanding = document.getElementById('viewLanding');
  const viewLobby = document.getElementById('viewLobby');
  const viewGame = document.getElementById('viewGame');

  // Header
  const brandBtn = document.getElementById('brandBtn');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const iconSoundOn = document.getElementById('iconSoundOn');
  const iconSoundOff = document.getElementById('iconSoundOff');
  const btnHeaderDecks = document.getElementById('btnHeaderDecks');
  const headerRoomPill = document.getElementById('headerRoomPill');
  const lblHeaderRoomCode = document.getElementById('lblHeaderRoomCode');
  const btnHeaderCopy = document.getElementById('btnHeaderCopy');

  // Landing
  const inputNickname = document.getElementById('inputNickname');
  const inputRoomCode = document.getElementById('inputRoomCode');
  const btnCreateRoom = document.getElementById('btnCreateRoom');
  const btnJoinRoom = document.getElementById('btnJoinRoom');

  // Lobby
  const lblLobbyRoomCode = document.getElementById('lblLobbyRoomCode');
  const btnCopyLobbyCode = document.getElementById('btnCopyLobbyCode');
  const lblBtnCopyCodeText = document.getElementById('lblBtnCopyCodeText');
  const btnCopyLobbyLink = document.getElementById('btnCopyLobbyLink');
  const lblBtnCopyLinkText = document.getElementById('lblBtnCopyLinkText');
  const btnJoinSpectators = document.getElementById('btnJoinSpectators');
  const lobbySpectatorsContainer = document.getElementById('lobbySpectatorsContainer');
  const lobbyBlueOperatives = document.getElementById('lobbyBlueOperatives');
  const lobbyBlueSpymaster = document.getElementById('lobbyBlueSpymaster');
  const lobbyRedOperatives = document.getElementById('lobbyRedOperatives');
  const lobbyRedSpymaster = document.getElementById('lobbyRedSpymaster');
  const lblLobbyActivePacks = document.getElementById('lblLobbyActivePacks');
  const lblLobbyTimerDesc = document.getElementById('lblLobbyTimerDesc');
  const btnOpenPacksModal = document.getElementById('btnOpenPacksModal');
  const btnCycleTimer = document.getElementById('btnCycleTimer');
  const btnFillBots = document.getElementById('btnFillBots');
  const btnResetTeams = document.getElementById('btnResetTeams');
  const btnRandomizeTeams = document.getElementById('btnRandomizeTeams');
  const btnToggleTeamLock = document.getElementById('btnToggleTeamLock');
  const btnStartGame = document.getElementById('btnStartGame');

  // Game Board
  const lblGameRoomCode = document.getElementById('lblGameRoomCode');
  const btnCopyGameLink = document.getElementById('btnCopyGameLink');
  const lblGameScoreRed = document.getElementById('lblGameScoreRed');
  const lblGameScoreBlue = document.getElementById('lblGameScoreBlue');
  const badgeScoreRed = document.getElementById('badgeScoreRed');
  const badgeScoreBlue = document.getElementById('badgeScoreBlue');
  const gameTimerPill = document.getElementById('gameTimerPill');
  const lblGameTimerSeconds = document.getElementById('lblGameTimerSeconds');
  const btnReturnToLobby = document.getElementById('btnReturnToLobby');

  const lblActiveTeamTag = document.getElementById('lblActiveTeamTag');
  const lblActiveTurnMessage = document.getElementById('lblActiveTurnMessage');
  const activeClueChip = document.getElementById('activeClueChip');
  const lblDisplayClueWord = document.getElementById('lblDisplayClueWord');
  const lblDisplayClueCount = document.getElementById('lblDisplayClueCount');
  const lblDisplayGuessesLeft = document.getElementById('lblDisplayGuessesLeft');

  const spymasterInputArea = document.getElementById('spymasterInputArea');
  const txtSpymasterWord = document.getElementById('txtSpymasterWord');
  const numSpymasterCount = document.getElementById('numSpymasterCount');
  const btnCountZero = document.getElementById('btnCountZero');
  const btnCountInfinity = document.getElementById('btnCountInfinity');
  const btnSendClue = document.getElementById('btnSendClue');
  const operativePassArea = document.getElementById('operativePassArea');
  const btnPassTurn = document.getElementById('btnPassTurn');
  const spymasterToggleWrap = document.getElementById('spymasterToggleWrap');
  const chkSpymasterKeycard = document.getElementById('chkSpymasterKeycard');
  const boardCardsGrid = document.getElementById('boardCardsGrid');

  // Sidebar Register & Events
  const tabBtnRegister = document.getElementById('tabBtnRegister');
  const tabBtnEvents = document.getElementById('tabBtnEvents');
  const tabContentRegister = document.getElementById('tabContentRegister');
  const tabContentEvents = document.getElementById('tabContentEvents');
  const roundsTimelineList = document.getElementById('roundsTimelineList');
  const eventsLogList = document.getElementById('eventsLogList');

  // Modals
  const modalPacks = document.getElementById('modalPacks');
  const btnClosePacksModal = document.getElementById('btnClosePacksModal');
  const packsChecklistContainer = document.getElementById('packsChecklistContainer');
  const lblModalTotalWords = document.getElementById('lblModalTotalWords');
  const btnApplyPacks = document.getElementById('btnApplyPacks');
  const btnOpenCustomManagerFromPacks = document.getElementById('btnOpenCustomManagerFromPacks');

  const modalCustomDecks = document.getElementById('modalCustomDecks');
  const btnCloseCustomDecksModal = document.getElementById('btnCloseCustomDecksModal');
  const customDecksItemsList = document.getElementById('customDecksItemsList');
  const txtDeckTitle = document.getElementById('txtDeckTitle');
  const txtDeckWordsRaw = document.getElementById('txtDeckWordsRaw');
  const lblDetectedWordCount = document.getElementById('lblDetectedWordCount');
  const btnSaveCustomDeck = document.getElementById('btnSaveCustomDeck');
  const btnExportCustomJSON = document.getElementById('btnExportCustomJSON');
  const btnImportCustomJSON = document.getElementById('btnImportCustomJSON');
  const fileDeckImport = document.getElementById('fileDeckImport');

  const modalVictory = document.getElementById('modalVictory');
  const lblVictoryHeading = document.getElementById('lblVictoryHeading');
  const lblVictoryDetails = document.getElementById('lblVictoryDetails');
  const btnVictoryRematch = document.getElementById('btnVictoryRematch');
  const btnVictoryLobby = document.getElementById('btnVictoryLobby');

  // Big Clue Splash Overlay Elements
  const clueSplashOverlay = document.getElementById('clueSplashOverlay');
  const clueSplashCard = document.getElementById('clueSplashCard');
  const clueSplashTeamBadge = document.getElementById('clueSplashTeamBadge');
  const clueSplashWord = document.getElementById('clueSplashWord');
  const clueSplashCount = document.getElementById('clueSplashCount');

  // Custom System Dialog Elements
  const modalSystemDialog = document.getElementById('modalSystemDialog');
  const systemDialogIcon = document.getElementById('systemDialogIcon');
  const systemDialogTitle = document.getElementById('systemDialogTitle');
  const systemDialogMessage = document.getElementById('systemDialogMessage');
  const btnSystemDialogCancel = document.getElementById('btnSystemDialogCancel');
  const btnSystemDialogConfirm = document.getElementById('btnSystemDialogConfirm');
  const toastContainer = document.getElementById('toastContainer');

  let dialogResolve = null;
  let activeClueTimeout = null;
  let lastReceivedClueSig = null;

  // Custom In-App Alert (Substituto de alert() nativo)
  function showSystemAlert(message, title = 'Aviso', isDanger = false) {
    return new Promise(resolve => {
      dialogResolve = resolve;
      systemDialogTitle.textContent = title;
      systemDialogMessage.textContent = message;
      systemDialogIcon.className = `system-dialog-icon ${isDanger ? 'danger' : ''}`;
      btnSystemDialogCancel.style.display = 'none';
      btnSystemDialogConfirm.textContent = 'Entendido';
      modalSystemDialog.classList.add('active');
      window.sounds.playClick();
    });
  }

  // Custom In-App Confirm (Substituto de confirm() nativo)
  function showSystemConfirm(message, title = 'Confirmar Ação', confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false) {
    return new Promise(resolve => {
      dialogResolve = resolve;
      systemDialogTitle.textContent = title;
      systemDialogMessage.textContent = message;
      systemDialogIcon.className = `system-dialog-icon ${isDanger ? 'danger' : ''}`;
      btnSystemDialogCancel.style.display = 'block';
      btnSystemDialogCancel.textContent = cancelText;
      btnSystemDialogConfirm.textContent = confirmText;
      modalSystemDialog.classList.add('active');
      window.sounds.playClick();
    });
  }

  btnSystemDialogConfirm.addEventListener('click', () => {
    modalSystemDialog.classList.remove('active');
    if (dialogResolve) {
      dialogResolve(true);
      dialogResolve = null;
    }
  });

  btnSystemDialogCancel.addEventListener('click', () => {
    modalSystemDialog.classList.remove('active');
    if (dialogResolve) {
      dialogResolve(false);
      dialogResolve = null;
    }
  });

  // Global override for any unexpected native alert calls
  window.alert = function (msg) {
    showSystemAlert(String(msg));
  };

  // Toast Notification System
  function showToast(message, type = 'info', duration = 3000) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-pill ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  // Big Clue Splash Overlay Trigger
  function triggerBigClueSplash(clueWord, clueCount, team) {
    if (!clueWord || !clueSplashOverlay) return;

    if (activeClueTimeout) {
      clearTimeout(activeClueTimeout);
      activeClueTimeout = null;
    }

    const isRed = team === 'red';
    clueSplashCard.className = `clue-splash-card ${isRed ? 'red' : 'blue'}`;
    clueSplashTeamBadge.textContent = isRed ? 'DICA DO TIME VERMELHO' : 'DICA DO TIME AZUL';
    clueSplashWord.textContent = clueWord.toUpperCase();

    const countText = (clueCount === 99 || clueCount === '∞') ? 'PALPITES ILIMITADOS' : (clueCount === 0 || clueCount === '0' ? 'ZERO PALAVRAS' : `${clueCount} PALAVRA${clueCount > 1 ? 'S' : ''}`);
    clueSplashCount.textContent = countText;

    clueSplashOverlay.classList.add('active');
    window.sounds.playClueGiven();

    activeClueTimeout = setTimeout(() => {
      clueSplashOverlay.classList.remove('active');
    }, 3200);
  }

  if (clueSplashOverlay) {
    clueSplashOverlay.addEventListener('click', () => {
      if (activeClueTimeout) {
        clearTimeout(activeClueTimeout);
        activeClueTimeout = null;
      }
      clueSplashOverlay.classList.remove('active');
    });
  }

  // Subtle Ambient Atmospheric Dust Motes
  function initAmbientAtmosphere() {
    const canvas = document.getElementById('ambientAtmosphereCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = [];
    const PARTICLE_COUNT = prefersReducedMotion ? 12 : 36;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.8,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -Math.random() * 0.25 - 0.05,
        alpha: Math.random() * 0.35 + 0.12,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulseVal: Math.random() * Math.PI
      });
    }

    function renderOnce() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (prefersReducedMotion) {
      renderOnce();
      return;
    }

    function loop() {
      ctx.clearRect(0, 0, width, height);
      const isRed = currentGameState && currentGameState.currentTurn === 'red';
      const isBlue = currentGameState && currentGameState.currentTurn === 'blue';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulseVal += p.pulseSpeed;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulseVal));
        let color = `rgba(212, 175, 55, ${currentAlpha})`;
        if (i % 3 === 0 && isRed) {
          color = `rgba(239, 68, 68, ${currentAlpha * 0.85})`;
        } else if (i % 3 === 0 && isBlue) {
          color = `rgba(96, 165, 250, ${currentAlpha * 0.85})`;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // ========================================================
  // INITIALIZATION
  // ========================================================
  function init() {
    initAmbientAtmosphere();

    // Restore nickname
    const savedNick = localStorage.getItem('codenames_nick');
    if (savedNick) inputNickname.value = savedNick;

    // Load custom decks
    loadCustomDecks();

    // Fetch base & database custom decks
    fetchAllDecks();

    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      inputRoomCode.value = roomParam.toUpperCase();
    }

    updateSoundIcons();

    // Tactile Audio Feedback Delegation (mouse devices only, zero touch interference)
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.addEventListener('mouseover', (e) => {
        try {
          const target = e.target.closest('button, .btn-primary-action, .btn-secondary-action, .btn-ghost-icon, .btn-card-small-action, .btn-count-quick, .quick-word-chip, .codenames-card:not(.revealed), .roster-player-chip, .score-pip');
          if (target && window.sounds) {
            window.sounds.playHoverTick();
          }
        } catch (_) {}
      }, { passive: true });
    }

    document.addEventListener('click', (e) => {
      try {
        const btn = e.target.closest('button, .btn-primary-action, .btn-secondary-action, .btn-ghost-icon, .btn-card-small-action, .btn-count-quick, .btn-remove-quick-word');
        if (btn && !btn.disabled && window.sounds) {
          window.sounds.playClick();
        }
      } catch (_) {}
    }, { passive: true });
  }

  async function fetchAllDecks() {
    try {
      const res = await fetch(`${API_BASE}/api/decks`);
      availableBaseDecks = await res.json();
      renderPacksChecklist();
      renderCustomDecksList();
    } catch (err) {
      console.error('Erro ao carregar baralhos:', err);
    }
  }

  function loadCustomDecks() {
    try {
      const stored = localStorage.getItem('codenames_custom_decks');
      customDecks = stored ? JSON.parse(stored) : [];
    } catch (e) {
      customDecks = [];
    }
  }

  function saveCustomDecks() {
    localStorage.setItem('codenames_custom_decks', JSON.stringify(customDecks));
    renderPacksChecklist();
    renderCustomDecksList();
  }

  function updateSoundIcons() {
    const isMuted = window.sounds.isMuted();
    iconSoundOn.style.display = isMuted ? 'none' : 'block';
    iconSoundOff.style.display = isMuted ? 'block' : 'none';
  }

  btnSoundToggle.addEventListener('click', () => {
    window.sounds.toggleMute();
    updateSoundIcons();
  });

  inputNickname.addEventListener('input', () => {
    localStorage.setItem('codenames_nick', inputNickname.value.trim());
  });

  brandBtn.addEventListener('click', async () => {
    if (currentGameState) {
      const confirmed = await showSystemConfirm('Deseja retornar ao menu inicial e sair da sala atual?', 'Sair da Sala', 'Sim, Sair', 'Permanecer');
      if (confirmed) {
        window.location.href = window.location.pathname;
      }
    }
  });

  // ========================================================
  // VIEW SWITCHER
  // ========================================================
  function switchView(viewName) {
    viewLanding.classList.remove('active');
    viewLobby.classList.remove('active');
    viewGame.classList.remove('active');

    if (viewName === 'lobby') {
      viewLobby.classList.add('active');
      if (headerRoomPill) headerRoomPill.style.display = 'inline-flex';
    } else if (viewName === 'game') {
      viewGame.classList.add('active');
      if (headerRoomPill) headerRoomPill.style.display = 'inline-flex';
    } else {
      viewLanding.classList.add('active');
      if (headerRoomPill) headerRoomPill.style.display = 'none';
    }
  }

  // ========================================================
  // LANDING ACTIONS
  // ========================================================
  btnCreateRoom.addEventListener('click', () => {
    try { if (window.sounds) window.sounds.playClick(); } catch (_) {}
    const nickname = inputNickname.value.trim() || 'Agente Iluminado';

    if (!socket) {
      showSystemAlert('Não foi possível inicializar a conexão com o servidor. Recarregue a página.', 'Erro de Conexão');
      return;
    }

    if (!socket.connected) {
      btnCreateRoom.disabled = true;
      btnCreateRoom.textContent = 'Conectando ao servidor...';

      const timeoutId = setTimeout(() => {
        btnCreateRoom.disabled = false;
        btnCreateRoom.textContent = 'Criar Nova Mesa';
        showSystemAlert('O servidor em tempo real está conectando. Aguarde alguns instantes e tente novamente.', 'Conectando...');
      }, 4000);

      socket.once('connect', () => {
        clearTimeout(timeoutId);
        btnCreateRoom.disabled = false;
        btnCreateRoom.textContent = 'Criar Nova Mesa';
        socket.emit('CREATE_ROOM', {
          nickname,
          selectedDeckIds: ['iluminados'],
          customDecks: customDecks,
          timerSeconds: 90
        });
      });
      return;
    }

    btnCreateRoom.disabled = true;
    btnCreateRoom.textContent = 'Criando Mesa...';
    setTimeout(() => {
      btnCreateRoom.disabled = false;
      btnCreateRoom.textContent = 'Criar Nova Mesa';
    }, 2500);

    socket.emit('CREATE_ROOM', {
      nickname,
      selectedDeckIds: ['iluminados'],
      customDecks: customDecks,
      timerSeconds: 90
    });
  });

  btnJoinRoom.addEventListener('click', () => {
    try { if (window.sounds) window.sounds.playClick(); } catch (_) {}
    const nickname = inputNickname.value.trim() || 'Agente Convidado';
    const code = inputRoomCode.value.trim();

    if (!code) {
      showSystemAlert('Informe o código da sala para entrar.', 'Código Obrigatório');
      return;
    }

    if (!socket) {
      showSystemAlert('Não foi possível conectar ao servidor.', 'Erro de Conexão');
      return;
    }

    if (!socket.connected) {
      btnJoinRoom.disabled = true;
      btnJoinRoom.textContent = 'Conectando...';

      const timeoutId = setTimeout(() => {
        btnJoinRoom.disabled = false;
        btnJoinRoom.textContent = 'Entrar na Sala';
        showSystemAlert('Aguardando conexão com o servidor multiplayer em tempo real...', 'Servidor Desconectado');
      }, 4000);

      socket.once('connect', () => {
        clearTimeout(timeoutId);
        btnJoinRoom.disabled = false;
        btnJoinRoom.textContent = 'Entrar na Sala';
        socket.emit('JOIN_ROOM', { roomId: code, nickname });
      });
      return;
    }

    btnJoinRoom.disabled = true;
    btnJoinRoom.textContent = 'Entrando...';
    setTimeout(() => {
      btnJoinRoom.disabled = false;
      btnJoinRoom.textContent = 'Entrar na Sala';
    }, 2500);

    socket.emit('JOIN_ROOM', { roomId: code, nickname });
  });

  // ========================================================
  // LOBBY ACTIONS & CONTROLS
  // ========================================================
  document.querySelectorAll('.btn-join-team').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget || e.target.closest('.btn-join-team');
      if (!button) return;
      const team = button.dataset.team;
      const role = button.dataset.role;
      socket.emit('SET_TEAM_ROLE', { team, role });
      try { if (window.sounds) window.sounds.playClick(); } catch (_) {}
    });
  });

  btnJoinSpectators.addEventListener('click', () => {
    socket.emit('SET_TEAM_ROLE', { team: 'spectator', role: 'spectator' });
    window.sounds.playClick();
  });

  if (btnFillBots) {
    btnFillBots.addEventListener('click', () => {
      socket.emit('FILL_WITH_BOTS');
      window.sounds.playClick();
    });
  }

  document.querySelectorAll('[data-action="add-bot"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const team = e.currentTarget.dataset.team;
      const role = e.currentTarget.dataset.role;
      socket.emit('ADD_BOT', { team, role });
      window.sounds.playClick();
    });
  });

  btnResetTeams.addEventListener('click', () => {
    socket.emit('RESET_TEAMS');
    window.sounds.playClick();
  });

  btnRandomizeTeams.addEventListener('click', () => {
    socket.emit('RANDOMIZE_TEAMS');
    window.sounds.playClick();
  });

  btnToggleTeamLock.addEventListener('click', () => {
    socket.emit('TOGGLE_TEAM_LOCK');
    window.sounds.playClick();
  });

  btnCycleTimer.addEventListener('click', () => {
    if (!currentGameState || !currentGameState.you || !currentGameState.you.isHost) return;
    const current = currentGameState.settings.timerSeconds || 0;
    const cycle = [0, 60, 90, 120];
    const nextIdx = (cycle.indexOf(current) + 1) % cycle.length;
    const nextTimer = cycle[nextIdx];

    socket.emit('UPDATE_ROOM_SETTINGS', {
      timerSeconds: nextTimer
    });
    window.sounds.playClick();
  });

  btnStartGame.addEventListener('click', () => {
    socket.emit('START_GAME');
    window.sounds.playClick();
  });

  // Quick Words in Lobby (sem precisar criar deck)
  const inputQuickWord = document.getElementById('inputQuickWord');
  const btnAddQuickWord = document.getElementById('btnAddQuickWord');

  function submitQuickWords() {
    if (!inputQuickWord) return;
    const raw = inputQuickWord.value.trim();
    if (!raw) return;

    socket.emit('ADD_EXTRA_WORDS', { words: raw });
    inputQuickWord.value = '';
    window.sounds.playClick();
  }

  if (btnAddQuickWord) {
    btnAddQuickWord.addEventListener('click', submitQuickWords);
  }
  if (inputQuickWord) {
    inputQuickWord.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitQuickWords();
      }
    });
  }

  // ========================================================
  // PACKS & DECKS MODAL
  // ========================================================
  btnOpenPacksModal.addEventListener('click', () => {
    if (!currentGameState || !currentGameState.you || !currentGameState.you.isHost) {
      showSystemAlert('Apenas o administrador da sala pode alterar os baralhos da partida.', 'Acesso Restrito');
      return;
    }
    modalPacks.classList.add('active');
    renderPacksChecklist();
    window.sounds.playClick();
  });

  btnClosePacksModal.addEventListener('click', () => {
    modalPacks.classList.remove('active');
  });

  btnHeaderDecks.addEventListener('click', () => {
    modalCustomDecks.classList.add('active');
    renderCustomDecksList();
    window.sounds.playClick();
  });

  btnOpenCustomManagerFromPacks.addEventListener('click', () => {
    modalPacks.classList.remove('active');
    modalCustomDecks.classList.add('active');
    renderCustomDecksList();
    window.sounds.playClick();
  });

  btnCloseCustomDecksModal.addEventListener('click', () => {
    modalCustomDecks.classList.remove('active');
  });

  function renderPacksChecklist() {
    packsChecklistContainer.innerHTML = '';
    const activeDeckIds = (currentGameState && currentGameState.settings && currentGameState.settings.selectedDeckIds) || ['iluminados'];

    // Base decks
    Object.values(availableBaseDecks).forEach(deck => {
      const isChecked = activeDeckIds.includes(deck.id);
      const row = document.createElement('label');
      row.className = 'roster-player-chip';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" class="pack-checkbox" value="${deck.id}" data-type="base" ${isChecked ? 'checked' : ''} style="accent-color: var(--gold-primary);">
          <strong>${deck.name}</strong>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-dim);">${deck.words.length} cartas</span>
      `;
      packsChecklistContainer.appendChild(row);
    });

    // Custom decks
    customDecks.forEach(cDeck => {
      const row = document.createElement('label');
      row.className = 'roster-player-chip';
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" class="pack-checkbox" value="${cDeck.id}" data-type="custom" checked style="accent-color: var(--gold-primary);">
          <strong>${cDeck.name}</strong>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-dim);">${cDeck.words.length} cartas</span>
      `;
      packsChecklistContainer.appendChild(row);
    });

    document.querySelectorAll('.pack-checkbox').forEach(cb => {
      cb.addEventListener('change', updateModalTotalWordCount);
    });

    updateModalTotalWordCount();
  }

  function updateModalTotalWordCount() {
    const selectedWords = new Set();
    document.querySelectorAll('.pack-checkbox:checked').forEach(cb => {
      if (cb.dataset.type === 'base' && availableBaseDecks[cb.value]) {
        availableBaseDecks[cb.value].words.forEach(w => selectedWords.add(w.toLowerCase().trim()));
      } else if (cb.dataset.type === 'custom') {
        const found = customDecks.find(d => d.id === cb.value);
        if (found) found.words.forEach(w => selectedWords.add(w.toLowerCase().trim()));
      }
    });

    lblModalTotalWords.textContent = selectedWords.size;
    if (selectedWords.size < 25) {
      lblModalTotalWords.style.color = '#ef4444';
    } else {
      lblModalTotalWords.style.color = 'var(--gold-primary)';
    }
  }

  btnApplyPacks.addEventListener('click', () => {
    const selectedDeckIds = [];
    const activeCustom = [];

    document.querySelectorAll('.pack-checkbox:checked').forEach(cb => {
      if (cb.dataset.type === 'base') {
        selectedDeckIds.push(cb.value);
      } else if (cb.dataset.type === 'custom') {
        const found = customDecks.find(d => d.id === cb.value);
        if (found) activeCustom.push(found);
      }
    });

    socket.emit('UPDATE_ROOM_SETTINGS', {
      selectedDeckIds,
      customDecks: activeCustom
    });

    modalPacks.classList.remove('active');
    window.sounds.playClick();
  });

  // Custom Decks Builder
  txtDeckWordsRaw.addEventListener('input', () => {
    const words = parseTokens(txtDeckWordsRaw.value);
    lblDetectedWordCount.textContent = words.length;
  });

  function parseTokens(str) {
    if (!str) return [];
    const list = str.split(/[\n,;]+/);
    const set = new Set();
    const result = [];
    list.forEach(item => {
      const clean = item.trim();
      if (clean && !set.has(clean.toLowerCase())) {
        set.add(clean.toLowerCase());
        result.push(clean);
      }
    });
    return result;
  }

  function renderCustomDecksList() {
    customDecksItemsList.innerHTML = '';

    // Collect all custom decks from database (availableBaseDecks) + local cache
    const dbCustomDecks = Object.values(availableBaseDecks).filter(d => d.isCustom);
    const combined = [...dbCustomDecks];

    // Add local ones that aren't already in db list
    customDecks.forEach(cd => {
      if (!combined.some(d => d.id === cd.id || d.name.toLowerCase() === cd.name.toLowerCase())) {
        combined.push(cd);
      }
    });

    if (combined.length === 0) {
      customDecksItemsList.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-dim); text-align: center; padding: 12px;">
          Nenhum baralho personalizado cadastrado no banco de dados.
        </div>
      `;
      return;
    }

    combined.forEach((deck) => {
      const item = document.createElement('div');
      item.className = 'roster-player-chip';
      item.innerHTML = `
        <div>
          <strong>${deck.name}</strong> (${deck.words.length} cartas)
          ${deck.author ? `<span style="font-size: 0.7rem; color: var(--text-dim); margin-left: 6px;">por ${deck.author}</span>` : ''}
        </div>
        <button type="button" class="btn-lobby-action" style="padding: 2px 8px; color: #ef4444;" data-deckid="${deck.id}">
          Excluir
        </button>
      `;
      item.querySelector('button').addEventListener('click', async () => {
        const confirmed = await showSystemConfirm(
          `Deseja excluir permanentemente o baralho "${deck.name}" do banco de dados?`,
          'Excluir Baralho',
          'Sim, Excluir',
          'Cancelar',
          true
        );
        if (confirmed) {
          try {
            await fetch(`${API_BASE}/api/custom-decks/${deck.id}`, { method: 'DELETE' });
            customDecks = customDecks.filter(d => d.id !== deck.id);
            saveCustomDecks();
            await fetchAllDecks();
            showToast(`Baralho "${deck.name}" excluído com sucesso.`, 'info');
          } catch (e) {
            console.warn(e);
            showSystemAlert('Erro ao excluir baralho: ' + e.message, 'Erro', true);
          }
        }
      });
      customDecksItemsList.appendChild(item);
    });
  }

  btnSaveCustomDeck.addEventListener('click', async () => {
    const title = txtDeckTitle.value.trim();
    const words = parseTokens(txtDeckWordsRaw.value);
    const author = inputNickname.value.trim() || 'Membro Iluminado';

    if (!title) {
      showSystemAlert('Dê um nome ao seu baralho antes de salvar.', 'Nome Obrigatório');
      return;
    }
    if (words.length < 5) {
      showSystemAlert('Insira pelo menos 5 palavras ou frases únicas para o baralho.', 'Poucas Palavras');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/custom-decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title, words, author })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no servidor');

      customDecks.push({
        id: data.id || ('custom_' + Date.now()),
        name: title,
        words: words,
        author: author
      });
      saveCustomDecks();
      await fetchAllDecks();

      txtDeckTitle.value = '';
      txtDeckWordsRaw.value = '';
      lblDetectedWordCount.textContent = '0';
      showToast(`Baralho "${title}" salvo com ${words.length} cartas!`, 'success');
      showSystemAlert(`Baralho "${title}" salvo com sucesso no banco de dados SQLite permanente!`, 'Baralho Salvo');
      window.sounds.playClick();
    } catch (err) {
      showSystemAlert('Erro ao salvar no banco de dados: ' + err.message, 'Erro no Banco', true);
    }
  });

  // Export & Import
  btnExportCustomJSON.addEventListener('click', () => {
    if (customDecks.length === 0) {
      showSystemAlert('Nenhum baralho personalizado disponível para exportar.', 'Exportar Baralhos');
      return;
    }
    const blob = new Blob([JSON.stringify(customDecks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iluminados_baralhos_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download do arquivo de baralhos iniciado!', 'info');
  });

  btnImportCustomJSON.addEventListener('click', () => fileDeckImport.click());

  fileDeckImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          customDecks = [...customDecks, ...imported];
          saveCustomDecks();
          showToast('Baralhos importados com sucesso!', 'success');
          showSystemAlert('Todos os baralhos foram carregados e salvos!', 'Importação Concluída');
        } else {
          showSystemAlert('O arquivo JSON selecionado não contém um formato de baralho válido.', 'Arquivo Inválido', true);
        }
      } catch (err) {
        showSystemAlert('Falha ao processar arquivo: ' + err.message, 'Erro de Importação', true);
      }
    };
    reader.readAsText(file);
    fileDeckImport.value = '';
  });

  // ========================================================
  // GAMEPLAY INTERACTIONS
  // ========================================================
  // ========================================================
  // CLIPBOARD & SHARE HELPERS
  // ========================================================
  function copyTextToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage, 'success');
      }).catch(() => {
        fallbackCopyText(text, successMessage);
      });
    } else {
      fallbackCopyText(text, successMessage);
    }
  }

  function fallbackCopyText(text, successMessage) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(successMessage, 'success');
    } catch (e) {
      window.prompt('Copie o link ou código:', text);
    }
  }

  if (lblLobbyRoomCode) {
    lblLobbyRoomCode.addEventListener('click', () => {
      if (!currentGameState || !currentGameState.roomId) return;
      window.sounds.playClick();
      copyTextToClipboard(currentGameState.roomId, `Código "${currentGameState.roomId}" copiado!`);
    });
  }

  if (btnCopyLobbyCode) {
    btnCopyLobbyCode.addEventListener('click', () => {
      if (!currentGameState || !currentGameState.roomId) return;
      window.sounds.playClick();
      copyTextToClipboard(currentGameState.roomId, `Código "${currentGameState.roomId}" copiado!`);
      if (lblBtnCopyCodeText) {
        lblBtnCopyCodeText.textContent = 'Copiado!';
        setTimeout(() => { lblBtnCopyCodeText.textContent = 'Copiar Código'; }, 2000);
      }
    });
  }

  if (btnCopyLobbyLink) {
    btnCopyLobbyLink.addEventListener('click', async () => {
      if (!currentGameState || !currentGameState.roomId) return;
      window.sounds.playClick();
      const url = `${window.location.origin}${window.location.pathname}?room=${currentGameState.roomId}`;

      // Native mobile share sheet (WhatsApp, Telegram, Discord, etc.)
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: 'Codenames dos Iluminados',
            text: `Bora jogar Codenames dos Iluminados! Código da mesa: ${currentGameState.roomId}`,
            url: url
          });
          showToast('Convite compartilhado!', 'success');
          return;
        } catch (e) {
          if (e.name === 'AbortError') return; // User cancelled
        }
      }

      copyTextToClipboard(url, 'Link de convite copiado para a área de transferência!');
      if (lblBtnCopyLinkText) {
        lblBtnCopyLinkText.textContent = 'Link Copiado!';
        setTimeout(() => { lblBtnCopyLinkText.textContent = 'Copiar Link de Convite'; }, 2000);
      }
    });
  }

  if (btnHeaderCopy) {
    btnHeaderCopy.addEventListener('click', () => {
      if (!currentGameState || !currentGameState.roomId) return;
      window.sounds.playClick();
      copyTextToClipboard(currentGameState.roomId, `Código "${currentGameState.roomId}" copiado!`);
    });
  }

  btnCopyGameLink.addEventListener('click', async () => {
    if (!currentGameState || !currentGameState.roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${currentGameState.roomId}`;

    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'Codenames dos Iluminados',
          text: `Bora jogar Codenames dos Iluminados! Código da mesa: ${currentGameState.roomId}`,
          url: url
        });
        showToast('Convite compartilhado!', 'success');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    copyTextToClipboard(url, 'Link da sala copiado com sucesso!');
    btnCopyGameLink.textContent = 'Copiado!';
    setTimeout(() => btnCopyGameLink.textContent = 'Copiar Link', 2000);
  });

  btnReturnToLobby.addEventListener('click', async () => {
    if (!currentGameState || !currentGameState.you || !currentGameState.you.isHost) {
      const leave = await showSystemConfirm('Deseja sair da sala de jogo e voltar ao menu?', 'Sair da Sala', 'Sim, Sair', 'Permanecer');
      if (leave) {
        window.location.href = window.location.pathname;
      }
      return;
    }
    const returnLobby = await showSystemConfirm('Retornar todos os jogadores da partida para o Lobby?', 'Retornar ao Lobby', 'Sim, Retornar', 'Cancelar');
    if (returnLobby) {
      socket.emit('RETURN_TO_LOBBY');
    }
  });

  // Spymaster Clue Input Quick Toggles
  btnCountZero.addEventListener('click', () => {
    numSpymasterCount.value = 0;
    btnCountZero.classList.add('selected');
    btnCountInfinity.classList.remove('selected');
  });

  btnCountInfinity.addEventListener('click', () => {
    numSpymasterCount.value = 99;
    btnCountInfinity.classList.add('selected');
    btnCountZero.classList.remove('selected');
  });

  numSpymasterCount.addEventListener('input', () => {
    btnCountZero.classList.remove('selected');
    btnCountInfinity.classList.remove('selected');
  });

  btnSendClue.addEventListener('click', () => {
    const word = txtSpymasterWord.value.trim();
    let count = numSpymasterCount.value.trim();

    if (!word) {
      showSystemAlert('Informe uma palavra válida para a dica.', 'Dica Obrigatória');
      return;
    }

    socket.emit('GIVE_CLUE', { word, count });
    txtSpymasterWord.value = '';
    btnCountZero.classList.remove('selected');
    btnCountInfinity.classList.remove('selected');
  });

  btnPassTurn.addEventListener('click', () => {
    socket.emit('END_TURN');
    window.sounds.playClick();
  });

  // Spymaster Keycard Safety Toggle
  chkSpymasterKeycard.addEventListener('change', () => {
    spymasterKeycardActive = chkSpymasterKeycard.checked;
    updateSpymasterGridVisuals();
    window.sounds.playClick();
  });

  function updateSpymasterGridVisuals() {
    if (spymasterKeycardActive) {
      boardCardsGrid.classList.add('spymaster-grid');
    } else {
      boardCardsGrid.classList.remove('spymaster-grid');
    }
  }

  // Sidebar Tabs (Register vs Events)
  tabBtnRegister.addEventListener('click', () => {
    tabBtnRegister.classList.add('active');
    tabBtnEvents.classList.remove('active');
    tabContentRegister.style.display = 'block';
    tabContentEvents.style.display = 'none';
  });

  tabBtnEvents.addEventListener('click', () => {
    tabBtnEvents.classList.add('active');
    tabBtnRegister.classList.remove('active');
    tabContentRegister.style.display = 'none';
    tabContentEvents.style.display = 'block';
  });

  // Victory rematch
  btnVictoryRematch.addEventListener('click', () => {
    socket.emit('NEW_GAME');
    modalVictory.classList.remove('active');
  });

  btnVictoryLobby.addEventListener('click', () => {
    socket.emit('RETURN_TO_LOBBY');
    modalVictory.classList.remove('active');
  });

  // ========================================================
  // SOCKET.IO RECEIVERS
  // ========================================================
  socket.on('ERROR', (data) => {
    showSystemAlert(data.message || 'Erro inesperado.', 'Aviso do Jogo', true);
  });

  socket.on('ROOM_CREATED', () => {
    // Will be updated by state update
  });

  socket.on('ROOM_JOINED', () => {
    // Will be updated by state update
  });

  socket.on('CARD_REVEALED_SOUND', ({ type, cardId, word }) => {
    // 1. Locate the card element
    let cardEl = cardId ? document.querySelector(`.codenames-card[data-id="${cardId}"]`) : null;
    if (!cardEl && word) {
      document.querySelectorAll('.codenames-card').forEach(el => {
        const textEl = el.querySelector('.card-text');
        if (textEl && textEl.textContent.trim().toUpperCase() === word.trim().toUpperCase()) {
          cardEl = el;
        }
      });
    }

    if (cardEl) {
      // Stage 1 (0-140ms): Press / Squish
      cardEl.classList.add('revealing-press');
      window.sounds.playCardSquish();

      // Stage 2 (140-340ms): 3D Flip with zoom
      setTimeout(() => {
        cardEl.classList.remove('revealing-press');
        cardEl.classList.add('revealing-flip');
        cardEl.classList.add('revealed');
        window.sounds.playCardFlip();
      }, 140);

      // Stage 3 (340-700ms): Shockwave pulse, particle sparks & sound impact
      setTimeout(() => {
        const shockwave = document.createElement('div');
        shockwave.className = `card-shockwave-pulse ${type || 'neutral'}`;
        cardEl.appendChild(shockwave);

        // Spawn high-impact particles
        spawnCardParticles(cardEl, type);

        if (type === 'assassin') {
          window.sounds.playAssassinDoom();
          document.body.classList.add('screen-assassin-shock');
          setTimeout(() => document.body.classList.remove('screen-assassin-shock'), 1200);
        } else if (type === 'neutral') {
          window.sounds.playNeutral();
        } else if (currentGameState && type === currentGameState.currentTurn) {
          window.sounds.playSuccess(type);
        } else {
          window.sounds.playOpponent();
        }

        setTimeout(() => {
          if (shockwave.parentNode) shockwave.parentNode.removeChild(shockwave);
          cardEl.classList.remove('revealing-flip');
        }, 700);
      }, 340);
    } else {
      // Fallback if card element not found in DOM
      window.sounds.playCardFlip();
      setTimeout(() => {
        if (type === 'assassin') {
          window.sounds.playAssassinDoom();
          document.body.classList.add('screen-assassin-shock');
          setTimeout(() => document.body.classList.remove('screen-assassin-shock'), 1200);
        } else if (type === 'neutral') {
          window.sounds.playNeutral();
        } else {
          window.sounds.playSuccess(type);
        }
      }, 180);
    }
  });

  function spawnCardParticles(cardEl, type) {
    if (!cardEl) return;
    const container = document.createElement('div');
    container.className = 'card-particle-canvas-container';
    const count = type === 'assassin' ? 16 : 10;

    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = `card-spark ${type || 'neutral'}`;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const distance = 35 + Math.random() * (type === 'assassin' ? 70 : 45);
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      spark.style.setProperty('--tx', `${tx}px`);
      spark.style.setProperty('--ty', `${ty}px`);
      spark.style.animationDelay = `${Math.random() * 0.04}s`;
      container.appendChild(spark);
    }

    cardEl.appendChild(container);
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 700);
  }

  socket.on('TIMER_UPDATE', ({ remaining }) => {
    const hudTurnTimerChip = document.getElementById('hudTurnTimerChip');
    const lblHudTimerSeconds = document.getElementById('lblHudTimerSeconds');
    const svgTimerRingFg = document.getElementById('svgTimerRingFg');

    if (remaining !== null && remaining !== undefined) {
      gameTimerPill.style.display = 'flex';
      lblGameTimerSeconds.textContent = `${remaining}s`;

      if (hudTurnTimerChip && lblHudTimerSeconds) {
        hudTurnTimerChip.style.display = 'inline-flex';
        lblHudTimerSeconds.textContent = remaining <= 10 ? `${remaining}...` : `${remaining}s`;
      }

      // Update SVG circular progress ring
      if (svgTimerRingFg && currentGameState && currentGameState.timer && currentGameState.timer.duration > 0) {
        const total = currentGameState.timer.duration;
        const progress = Math.max(0, Math.min(1, remaining / total));
        const circumference = 56.54; // 2 * PI * 9
        svgTimerRingFg.style.strokeDashoffset = (circumference * (1 - progress)).toFixed(2);
      }

      if (remaining <= 10 && remaining > 0) {
        gameTimerPill.classList.remove('warning');
        gameTimerPill.classList.add('urgent');
        if (hudTurnTimerChip) {
          hudTurnTimerChip.classList.remove('warning');
          hudTurnTimerChip.classList.add('urgent');
        }
        window.sounds.playTimerUrgent();
      } else if (remaining <= 20 && remaining > 10) {
        gameTimerPill.classList.remove('urgent');
        gameTimerPill.classList.add('warning');
        if (hudTurnTimerChip) {
          hudTurnTimerChip.classList.remove('urgent');
          hudTurnTimerChip.classList.add('warning');
        }
      } else if (remaining === 0) {
        window.sounds.playTimerExpired();
        gameTimerPill.classList.remove('urgent');
        gameTimerPill.classList.remove('warning');
        if (hudTurnTimerChip) {
          hudTurnTimerChip.classList.remove('urgent');
          hudTurnTimerChip.classList.remove('warning');
        }
      } else {
        gameTimerPill.classList.remove('urgent');
        gameTimerPill.classList.remove('warning');
        if (hudTurnTimerChip) {
          hudTurnTimerChip.classList.remove('urgent');
          hudTurnTimerChip.classList.remove('warning');
        }
      }
    } else {
      gameTimerPill.style.display = 'none';
      gameTimerPill.classList.remove('urgent');
      gameTimerPill.classList.remove('warning');
      if (hudTurnTimerChip) {
        hudTurnTimerChip.style.display = 'none';
        hudTurnTimerChip.classList.remove('urgent');
        hudTurnTimerChip.classList.remove('warning');
      }
    }
  });

  socket.on('ROOM_STATE_UPDATE', (state) => {
    currentGameState = state;

    if (state.status === 'lobby') {
      renderLobby(state);
    } else {
      renderGame(state);
    }
  });

  // ========================================================
  // RENDER LOBBY
  // ========================================================
  function renderLobby(state) {
    switchView('lobby');
    modalVictory.classList.remove('active');

    // Update room code displays across lobby & header
    if (lblLobbyRoomCode) lblLobbyRoomCode.textContent = state.roomId;
    if (lblHeaderRoomCode) lblHeaderRoomCode.textContent = state.roomId;
    if (headerRoomPill) headerRoomPill.style.display = 'inline-flex';

    // Keep browser URL synced with ?room=CODE
    if (window.history && window.history.replaceState && state.roomId) {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('room') !== state.roomId) {
        currentUrl.searchParams.set('room', state.roomId);
        window.history.replaceState(null, '', currentUrl.toString());
      }
    }

    // Spectators list
    lobbySpectatorsContainer.innerHTML = '';
    const spectators = state.players.filter(p => p.team === 'spectator');
    spectators.forEach(p => {
      const el = document.createElement('div');
      el.className = 'avatar-token';
      el.innerHTML = `
        ${p.isHost ? '<svg class="avatar-crown" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8 12 2"></polygon></svg>' : ''}
        <div class="avatar-circle">${p.name.charAt(0).toUpperCase()}</div>
        <div class="avatar-name" title="${p.name}">${p.name}</div>
      `;
      lobbySpectatorsContainer.appendChild(el);
    });

    // Teams rosters
    lobbyBlueOperatives.innerHTML = '';
    lobbyBlueSpymaster.innerHTML = '';
    lobbyRedOperatives.innerHTML = '';
    lobbyRedSpymaster.innerHTML = '';

    const blueOperatives = state.players.filter(p => p.team === 'blue' && p.role === 'operative');
    const blueSpymaster = state.players.find(p => p.team === 'blue' && p.role === 'spymaster');
    const redOperatives = state.players.filter(p => p.team === 'red' && p.role === 'operative');
    const redSpymaster = state.players.find(p => p.team === 'red' && p.role === 'spymaster');

    const isHost = state.you && state.you.isHost;

    // Helper to render player chip with bot tag and remove button
    function renderPlayerChip(p, isSpymasterRole = false, teamColor = '#70c9ff') {
      const botBadge = p.isBot ? `<span class="chip-tag-bot">BOT</span>` : '';
      const removeBtn = (isHost && p.isBot) ? `<button type="button" class="btn-chip-remove" data-botid="${p.id}" title="Remover Bot">×</button>` : '';
      const roleBadge = isSpymasterRole ? `<span style="font-size: 0.7rem; color: ${teamColor};">Mestre</span>` : '';
      return `
        <div class="roster-player-chip">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${p.name}</span>
            ${botBadge}
            ${roleBadge}
          </div>
          ${removeBtn}
        </div>
      `;
    }

    if (blueOperatives.length === 0) {
      lobbyBlueOperatives.innerHTML = '<div class="roster-slot-empty">✦ Vagas para Agentes</div>';
    } else {
      blueOperatives.forEach(p => {
        lobbyBlueOperatives.innerHTML += renderPlayerChip(p);
      });
    }

    if (blueSpymaster) {
      lobbyBlueSpymaster.innerHTML = renderPlayerChip(blueSpymaster, true, '#70c9ff');
    } else {
      lobbyBlueSpymaster.innerHTML = '<div class="roster-slot-empty">✦ Vaga para Mestre-Espião</div>';
    }

    if (redOperatives.length === 0) {
      lobbyRedOperatives.innerHTML = '<div class="roster-slot-empty">✦ Vagas para Agentes</div>';
    } else {
      redOperatives.forEach(p => {
        lobbyRedOperatives.innerHTML += renderPlayerChip(p);
      });
    }

    if (redSpymaster) {
      lobbyRedSpymaster.innerHTML = renderPlayerChip(redSpymaster, true, '#ff8a7e');
    } else {
      lobbyRedSpymaster.innerHTML = '<div class="roster-slot-empty">✦ Vaga para Mestre-Espião</div>';
    }

    // Attach bot removal listeners
    document.querySelectorAll('.btn-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const botId = e.currentTarget.dataset.botid;
        if (botId) {
          socket.emit('REMOVE_BOT', { botId });
          window.sounds.playClick();
        }
      });
    });

    // Active packs description
    lblLobbyActivePacks.textContent = (state.settings.decksUsed && state.settings.decksUsed.join(', ')) || 'Iluminados';

    // Timer description
    const timerSec = state.settings.timerSeconds || 0;
    lblLobbyTimerDesc.textContent = timerSec > 0 ? `${timerSec} Segundos` : 'Desligado';

    // Render Quick Match Words
    const quickWordsChipsList = document.getElementById('quickWordsChipsList');
    const lblQuickWordsCount = document.getElementById('lblQuickWordsCount');
    const extraWords = (state.settings && state.settings.extraWords) || [];

    if (lblQuickWordsCount) {
      lblQuickWordsCount.textContent = `${extraWords.length} adicionada${extraWords.length === 1 ? '' : 's'}`;
    }

    if (quickWordsChipsList) {
      quickWordsChipsList.innerHTML = '';
      if (extraWords.length === 0) {
        quickWordsChipsList.innerHTML = `<span class="quick-words-empty-hint">Nenhuma palavra rápida adicionada ainda.</span>`;
      } else {
        extraWords.forEach(word => {
          const chip = document.createElement('div');
          chip.className = 'quick-word-chip';
          chip.innerHTML = `
            <span class="chip-word-text">${word}</span>
            <button type="button" class="btn-remove-quick-word" data-word="${word}" title="Remover palavra">×</button>
          `;
          quickWordsChipsList.appendChild(chip);
        });

        quickWordsChipsList.querySelectorAll('.btn-remove-quick-word').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const w = e.currentTarget.dataset.word;
            if (w) {
              socket.emit('REMOVE_EXTRA_WORD', { word: w });
              window.sounds.playClick();
            }
          });
        });
      }
    }

    // Admin buttons lock state
    if (btnFillBots) btnFillBots.disabled = !isHost;
    btnResetTeams.disabled = !isHost;
    btnRandomizeTeams.disabled = !isHost;
    btnToggleTeamLock.disabled = !isHost;

    const isReadyToStart = (
      blueOperatives.length >= 1 && blueSpymaster &&
      redOperatives.length >= 1 && redSpymaster
    );
    if (btnStartGame) {
      btnStartGame.disabled = !isHost;
      btnStartGame.classList.toggle('ready-to-start', isReadyToStart && isHost);
      if (!isHost) {
        btnStartGame.title = 'Aguardando o anfitrião iniciar a partida';
      } else if (isReadyToStart) {
        btnStartGame.title = 'Equipes completas! Clique para Iniciar a Partida';
      } else {
        btnStartGame.title = 'Cada equipe precisa de 1 Mestre e pelo menos 1 Agente de campo';
      }
    }

    document.querySelectorAll('[data-action="add-bot"]').forEach(btn => {
      btn.disabled = !isHost;
      btn.style.opacity = isHost ? '1' : '0.5';
      btn.style.cursor = isHost ? 'pointer' : 'not-allowed';
    });

    if (state.lockTeamSwitching) {
      btnToggleTeamLock.classList.add('active-lock');
      btnToggleTeamLock.textContent = 'Troca de Equipes: Bloqueada';
    } else {
      btnToggleTeamLock.classList.remove('active-lock');
      btnToggleTeamLock.textContent = 'Permitir Troca de Equipes';
    }

    // Lock join buttons for non-hosts if locked
    if (state.lockTeamSwitching && !isHost) {
      document.querySelectorAll('.btn-join-team').forEach(b => b.disabled = true);
    } else {
      document.querySelectorAll('.btn-join-team').forEach(b => b.disabled = false);
    }
  }

  // ========================================================
  // RENDER GAME BOARD & SCORE PIPS
  // ========================================================
  let lastGameTurn = null;
  let lastTrackedScores = { red: null, blue: null };

  function renderScorePips(state) {
    const pipsTrackBlue = document.getElementById('pipsTrackBlue');
    const pipsTrackRed = document.getElementById('pipsTrackRed');
    const lblRemainingLabelBlue = document.getElementById('lblRemainingLabelBlue');
    const lblRemainingLabelRed = document.getElementById('lblRemainingLabelRed');
    const lblTargetTotalBlue = document.getElementById('lblTargetTotalBlue');
    const lblTargetTotalRed = document.getElementById('lblTargetTotalRed');
    if (!pipsTrackBlue || !pipsTrackRed) return;

    // Detect score changes to trigger pop animation & tactile sound
    if (lastTrackedScores.blue !== null && state.scores.blue < lastTrackedScores.blue) {
      lblGameScoreBlue.classList.add('pop');
      setTimeout(() => lblGameScoreBlue.classList.remove('pop'), 400);
    }
    if (lastTrackedScores.red !== null && state.scores.red < lastTrackedScores.red) {
      lblGameScoreRed.classList.add('pop');
      setTimeout(() => lblGameScoreRed.classList.remove('pop'), 400);
    }
    lastTrackedScores.blue = state.scores.blue;
    lastTrackedScores.red = state.scores.red;

    // Determine starting totals: count cards from state.board or use standard 9/8
    let totalBlue = 8;
    let totalRed = 8;
    if (state.board && state.board.length > 0) {
      const redCount = state.board.filter(c => c.type === 'red').length;
      const blueCount = state.board.filter(c => c.type === 'blue').length;
      if (redCount > 0) totalRed = redCount;
      if (blueCount > 0) totalBlue = blueCount;
    }

    const blueRemaining = Math.max(0, state.scores.blue || 0);
    const blueFound = Math.max(0, totalBlue - blueRemaining);
    if (lblRemainingLabelBlue) {
      lblRemainingLabelBlue.textContent = `${blueRemaining} RESTANTE${blueRemaining === 1 ? '' : 'S'}`;
    }

    pipsTrackBlue.innerHTML = '';
    for (let i = 0; i < totalBlue; i++) {
      const pip = document.createElement('div');
      const isActive = i < blueRemaining;
      pip.className = `score-pip ${isActive ? 'active-bar blue' : 'spent'}`;
      pip.title = isActive ? `Agente Azul restante` : `Agente Azul identificado`;
      pipsTrackBlue.appendChild(pip);
    }

    const redRemaining = Math.max(0, state.scores.red || 0);
    if (lblRemainingLabelRed) {
      lblRemainingLabelRed.textContent = `${redRemaining} RESTANTE${redRemaining === 1 ? '' : 'S'}`;
    }

    pipsTrackRed.innerHTML = '';
    for (let i = 0; i < totalRed; i++) {
      const pip = document.createElement('div');
      const isActive = i < redRemaining;
      pip.className = `score-pip ${isActive ? 'active-bar red' : 'spent'}`;
      pip.title = isActive ? `Agente Vermelho restante` : `Agente Vermelho identificado`;
      pipsTrackRed.appendChild(pip);
    }
  }

  let lastGameStatus = null;

  function renderGame(state) {
    switchView('game');

    // Cinematic Match Intro Curtain on entering game from lobby
    const matchIntroCurtain = document.getElementById('matchIntroCurtain');
    if (lastGameStatus === 'lobby' && matchIntroCurtain) {
      matchIntroCurtain.classList.add('active');
      window.sounds.playGameStart();
      setTimeout(() => {
        matchIntroCurtain.classList.remove('active');
      }, 1100);
    }
    lastGameStatus = state.status;

    // Atmospheric audio on turn change
    if (lastGameTurn && lastGameTurn !== state.currentTurn && !state.winner) {
      window.sounds.playTurnChange();
    }
    lastGameTurn = state.currentTurn;

    lblGameRoomCode.textContent = state.roomId;
    if (lblHeaderRoomCode) lblHeaderRoomCode.textContent = state.roomId;
    if (headerRoomPill) headerRoomPill.style.display = 'inline-flex';
    lblGameScoreRed.textContent = state.scores.red;
    lblGameScoreBlue.textContent = state.scores.blue;

    badgeScoreRed.classList.toggle('active-turn', state.currentTurn === 'red');
    badgeScoreBlue.classList.toggle('active-turn', state.currentTurn === 'blue');

    const isRedTurn = state.currentTurn === 'red';
    lblActiveTeamTag.className = `hud-turn-badge ${isRedTurn ? 'red' : 'blue'}`;
    const lblActiveTeamText = document.getElementById('lblActiveTeamText');
    if (lblActiveTeamText) {
      lblActiveTeamText.textContent = isRedTurn ? 'VEZ DO TIME VERMELHO' : 'VEZ DO TIME AZUL';
    }

    // Dynamic Board Ambient Aura (Shift smoothly behind 5x5 board)
    const arenaBoardAmbientAura = document.getElementById('arenaBoardAmbientAura');
    if (arenaBoardAmbientAura) {
      arenaBoardAmbientAura.className = `arena-board-ambient-aura ${isRedTurn ? 'red' : 'blue'}`;
    }

    // Render tournament scoreboard pips & score pop
    renderScorePips(state);

    const you = state.you;
    const isMyTeamTurn = you && you.team === state.currentTurn;
    const isSpymaster = you && you.role === 'spymaster';
    const isOperative = you && you.role === 'operative';

    // Check if the current acting role is handled by a bot
    let isActingBot = false;
    if (state.turnPhase === 'clue') {
      const activeSpy = state.players.find(p => p.team === state.currentTurn && p.role === 'spymaster');
      if (activeSpy && activeSpy.isBot) isActingBot = true;
    } else if (state.turnPhase === 'guess') {
      const teamOps = state.players.filter(p => p.team === state.currentTurn && p.role === 'operative');
      if (teamOps.length > 0 && teamOps.every(p => p.isBot)) isActingBot = true;
    }

    if (state.turnPhase === 'clue') {
      if (isActingBot) {
        lblActiveTurnMessage.innerHTML = `Mestre Bot calculando dica<span class="bot-thinking-dots"><span>.</span><span>.</span><span>.</span></span>`;
      } else {
        lblActiveTurnMessage.textContent = 'Mestre formulando a dica...';
      }
      activeClueChip.style.display = 'none';
      lastReceivedClueSig = null;
    } else {
      if (isActingBot) {
        lblActiveTurnMessage.innerHTML = `Agente Bot analisando palavras<span class="bot-thinking-dots"><span>.</span><span>.</span><span>.</span></span>`;
      } else {
        lblActiveTurnMessage.textContent = 'Agentes em campo deduzindo...';
      }
      if (state.currentClue) {
        activeClueChip.style.display = 'flex';
        lblDisplayClueWord.textContent = state.currentClue.word;
        lblDisplayClueCount.textContent = state.currentClue.count;
        lblDisplayGuessesLeft.textContent = state.currentClue.remainingGuesses === 99 ? '∞' : state.currentClue.remainingGuesses;

        // Trigger Big Clue Splash Overlay across entire screen
        const clueSig = `${state.currentTurn}_${state.currentClue.word}_${state.currentClue.count}`;
        if (lastReceivedClueSig !== clueSig) {
          lastReceivedClueSig = clueSig;
          triggerBigClueSplash(state.currentClue.word, state.currentClue.count, state.currentTurn);
        }
      }
    }

    // Spymaster input bar
    if (isMyTeamTurn && isSpymaster && state.turnPhase === 'clue' && !state.winner) {
      spymasterInputArea.style.display = 'flex';
    } else {
      spymasterInputArea.style.display = 'none';
    }

    // Operative Pass button
    if (isMyTeamTurn && isOperative && state.turnPhase === 'guess' && !state.winner) {
      operativePassArea.style.display = 'block';
    } else {
      operativePassArea.style.display = 'none';
    }

    // Spymaster Keycard safety view
    if (isSpymaster) {
      spymasterToggleWrap.style.display = 'flex';
      chkSpymasterKeycard.disabled = false;
      chkSpymasterKeycard.checked = true;
      spymasterKeycardActive = true;
    } else {
      spymasterToggleWrap.style.display = 'none';
      chkSpymasterKeycard.checked = false;
      spymasterKeycardActive = false;
    }
    updateSpymasterGridVisuals();

    // Render Side Columns (Blue & Red teams in arena)
    renderArenaTeams(state);

    // Render 5x5 Matrix
    renderBoardGrid(state.board, you, state);

    // Render Register Timeline & Events
    renderRoundsRegister(state.roundsHistory);
    renderEventsLog(state.history);

    // Victory modal
    if (state.winner) {
      showVictory(state.winner, state.winReason);
    } else {
      modalVictory.classList.remove('active');
    }
  }

  // Render Arena Team sidebars (Left Blue & Right Red)
  function renderArenaTeams(state) {
    const gameBlueOperatives = document.getElementById('gameBlueOperatives');
    const gameBlueSpymaster = document.getElementById('gameBlueSpymaster');
    const gameRedOperatives = document.getElementById('gameRedOperatives');
    const gameRedSpymaster = document.getElementById('gameRedSpymaster');
    const countBlueOperatives = document.getElementById('countBlueOperatives');
    const countRedOperatives = document.getElementById('countRedOperatives');

    const blueOps = state.players.filter(p => p.team === 'blue' && p.role === 'operative');
    const blueSpy = state.players.find(p => p.team === 'blue' && p.role === 'spymaster');
    const redOps = state.players.filter(p => p.team === 'red' && p.role === 'operative');
    const redSpy = state.players.find(p => p.team === 'red' && p.role === 'spymaster');

    if (countBlueOperatives) countBlueOperatives.textContent = blueOps.length;
    if (countRedOperatives) countRedOperatives.textContent = redOps.length;

    if (gameBlueOperatives) {
      gameBlueOperatives.innerHTML = blueOps.length > 0 ? blueOps.map(p => `
        <div class="arena-player-chip">
          <span class="chip-avatar blue">${p.name.charAt(0).toUpperCase()}</span>
          <span class="chip-name" title="${p.name}">${p.name}</span>
          ${p.isBot ? '<span class="chip-tag-bot">BOT</span>' : ''}
        </div>
      `).join('') : '<div class="arena-empty-role">Sem agentes</div>';
    }

    if (gameBlueSpymaster) {
      gameBlueSpymaster.innerHTML = blueSpy ? `
        <div class="arena-player-chip">
          <span class="chip-avatar blue">${blueSpy.name.charAt(0).toUpperCase()}</span>
          <span class="chip-name" title="${blueSpy.name}">${blueSpy.name}</span>
          ${blueSpy.isBot ? '<span class="chip-tag-bot">BOT</span>' : ''}
        </div>
      ` : '<div class="arena-empty-role">Sem mestre</div>';
    }

    if (gameRedOperatives) {
      gameRedOperatives.innerHTML = redOps.length > 0 ? redOps.map(p => `
        <div class="arena-player-chip">
          <span class="chip-avatar red">${p.name.charAt(0).toUpperCase()}</span>
          <span class="chip-name" title="${p.name}">${p.name}</span>
          ${p.isBot ? '<span class="chip-tag-bot">BOT</span>' : ''}
        </div>
      `).join('') : '<div class="arena-empty-role">Sem agentes</div>';
    }

    if (gameRedSpymaster) {
      gameRedSpymaster.innerHTML = redSpy ? `
        <div class="arena-player-chip">
          <span class="chip-avatar red">${redSpy.name.charAt(0).toUpperCase()}</span>
          <span class="chip-name" title="${redSpy.name}">${redSpy.name}</span>
          ${redSpy.isBot ? '<span class="chip-tag-bot">BOT</span>' : ''}
        </div>
      ` : '<div class="arena-empty-role">Sem mestre</div>';
    }
  }

  // Register Drawer Accordion toggle
  const btnToggleRegister = document.getElementById('btnToggleRegister');
  const arenaRegisterPanel = document.getElementById('arenaRegisterPanel');
  if (btnToggleRegister && arenaRegisterPanel) {
    btnToggleRegister.addEventListener('click', () => {
      arenaRegisterPanel.classList.toggle('open');
      window.sounds.playClick();
    });
  }

  // Render 5x5 Card Matrix with confirmation flow & in-place reconciliation
  function createCardElement(card, you, state) {
    const isOperativeTurn = you && you.team === state.currentTurn && you.role === 'operative' && state.turnPhase === 'guess' && !state.winner;
    const isSpymasterUser = you && you.role === 'spymaster';

    const cardEl = document.createElement('div');
    cardEl.className = `codenames-card ${card.revealed ? 'revealed' : ''}`;
    cardEl.dataset.id = card.id;

    const spyClass = card.type ? `spy-${card.type}` : '';

    let selectorsHtml = '';
    const hasSelections = card.selectedBy && card.selectedBy.length > 0;
    if (hasSelections) {
      selectorsHtml = `
        <div class="card-selectors-badge">
          ${card.selectedBy.map(name => `<span class="selector-token" title="${name}">${name}</span>`).join('')}
        </div>
      `;
    }

    let confirmBtnHtml = '';
    if (isOperativeTurn && !card.revealed && hasSelections) {
      confirmBtnHtml = `
        <button type="button" class="btn-confirm-guess" data-cardid="${card.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Confirmar
        </button>
      `;
    }

    let sandTopContent = `<span class="card-word-inverted">${card.word}</span>`;
    if (isSpymasterUser && card.type === 'assassin') {
      sandTopContent += `<span class="assassin-skull-mark">⚠ ASSASSINO (OCULTO)</span>`;
    } else if (isSpymasterUser && card.type) {
      const typeLabel = card.type === 'blue' ? 'AZUL' : (card.type === 'red' ? 'VERMELHO' : 'NEUTRO');
      sandTopContent += `<span class="spy-top-indicator ${card.type}">● ${typeLabel} (OCULTO)</span>`;
    }

    const backBadgeText = card.type === 'assassin' ? 'ASSASSINO' : (card.type === 'blue' ? 'TIME AZUL' : (card.type === 'red' ? 'TIME VERMELHO' : 'NEUTRO'));

    cardEl.innerHTML = `
      ${selectorsHtml}
      <div class="card-flipper">
        <div class="card-face front ${spyClass}">
          <div class="card-sand-top">
            ${sandTopContent}
          </div>
          <div class="card-word-plate">
            <span class="card-text">${card.word}</span>
          </div>
        </div>
        <div class="card-face back ${card.type || 'neutral'}">
          <div class="card-revealed-stamp">✓ REVELADA</div>
          <div class="card-back-badge">${backBadgeText}</div>
          <div class="card-word-plate back-plate">
            <span class="card-text">${card.word}</span>
          </div>
        </div>
      </div>
      ${confirmBtnHtml}
    `;

    attachCardEventListeners(cardEl, card);
    return cardEl;
  }

  function attachCardEventListeners(cardEl, card) {
    if (!card.revealed) {
      cardEl.addEventListener('mouseenter', () => {
        try {
          if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            if (window.sounds) window.sounds.playHoverTick();
          }
        } catch (_) {}
      });
    }

    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('.btn-confirm-guess')) return;
      if (card.revealed || (currentGameState && currentGameState.winner)) return;
      const s = currentGameState;
      const y = s && s.you;
      if (y && y.team === s.currentTurn && y.role === 'operative' && s.turnPhase === 'guess') {
        socket.emit('SELECT_CARD', { cardId: card.id });
        try { if (window.sounds) window.sounds.playSelectCard(); } catch (_) {}
      }
    });

    const btnConfirm = cardEl.querySelector('.btn-confirm-guess');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', (e) => {
        e.stopPropagation();
        cardEl.classList.add('revealing-press');
        try { if (window.sounds) window.sounds.playCardSquish(); } catch (_) {}
        socket.emit('CONFIRM_CARD', { cardId: card.id });
      });
    }
  }

  function updateCardElement(cardEl, card, you, state) {
    const isOperativeTurn = you && you.team === state.currentTurn && you.role === 'operative' && state.turnPhase === 'guess' && !state.winner;
    const isAnimating = cardEl.classList.contains('revealing-press') || cardEl.classList.contains('revealing-flip');

    if (!isAnimating && card.revealed) {
      cardEl.classList.add('revealed');
    }

    // Ensure back face has stamp
    const backFace = cardEl.querySelector('.card-face.back');
    if (backFace && !backFace.querySelector('.card-revealed-stamp')) {
      const stamp = document.createElement('div');
      stamp.className = 'card-revealed-stamp';
      stamp.textContent = '✓ REVELADA';
      backFace.insertBefore(stamp, backFace.firstChild);
    }

    // Update selectors badge
    let selBadge = cardEl.querySelector('.card-selectors-badge');
    const hasSelections = card.selectedBy && card.selectedBy.length > 0;
    if (hasSelections) {
      const newHtml = card.selectedBy.map(name => `<span class="selector-token" title="${name}">${name}</span>`).join('');
      if (selBadge) {
        selBadge.innerHTML = newHtml;
      } else {
        const badgeDiv = document.createElement('div');
        badgeDiv.className = 'card-selectors-badge';
        badgeDiv.innerHTML = newHtml;
        cardEl.insertBefore(badgeDiv, cardEl.firstChild);
      }
    } else if (selBadge) {
      selBadge.remove();
    }

    // Update confirm button for operative
    let confirmBtn = cardEl.querySelector('.btn-confirm-guess');
    if (isOperativeTurn && !card.revealed && hasSelections) {
      if (!confirmBtn) {
        confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'btn-confirm-guess';
        confirmBtn.dataset.cardid = card.id;
        confirmBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Confirmar
        `;
        confirmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          cardEl.classList.add('revealing-press');
          window.sounds.playCardSquish();
          socket.emit('CONFIRM_CARD', { cardId: card.id });
        });
        cardEl.appendChild(confirmBtn);
      }
    } else if (confirmBtn) {
      confirmBtn.remove();
    }
  }

  function renderBoardGrid(board, you, state) {
    if (!board || board.length === 0) {
      boardCardsGrid.innerHTML = '';
      return;
    }

    const existingCards = boardCardsGrid.querySelectorAll('.codenames-card');
    const matchesExisting = existingCards.length === board.length && 
      Array.from(existingCards).every((el, idx) => el.dataset.id === board[idx].id);

    if (!matchesExisting) {
      boardCardsGrid.innerHTML = '';
      board.forEach(card => {
        const el = createCardElement(card, you, state);
        boardCardsGrid.appendChild(el);
      });
    } else {
      board.forEach((card, idx) => {
        const cardEl = existingCards[idx];
        updateCardElement(cardEl, card, you, state);
      });
    }
  }

  // Structured Register of Rounds (Dica + Palavras Escolhidas + Resultado)
  function renderRoundsRegister(rounds) {
    roundsTimelineList.innerHTML = '';
    if (!rounds || rounds.length === 0) {
      roundsTimelineList.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-dim); text-align: center; padding: 20px;">
          Nenhuma dica registrada ainda.
        </div>
      `;
      return;
    }

    [...rounds].reverse().forEach(r => {
      const card = document.createElement('div');
      card.className = `round-entry-card ${r.team}`;

      let guessesHtml = '';
      if (r.guesses && r.guesses.length > 0) {
        guessesHtml = r.guesses.map(g => {
          let badgeText = '⚪ Neutro';
          if (g.result === 'correct') badgeText = '✓ Acertou';
          else if (g.result === 'opponent') badgeText = '⚠ Adversário';
          else if (g.result === 'assassin') badgeText = '☠️ Assassino';

          return `
            <div class="round-pick-pill ${g.result}">
              <span>${g.word} (${g.operative})</span>
              <span>${badgeText}</span>
            </div>
          `;
        }).join('');
      } else {
        guessesHtml = `<div style="font-size: 0.75rem; color: var(--text-dim);">Nenhum palpite confirmado.</div>`;
      }

      card.innerHTML = `
        <div class="round-entry-header">
          <span>Rodada ${r.roundNumber} - Time ${r.team === 'red' ? 'Vermelho' : 'Azul'}</span>
          <span>${r.spymaster}</span>
        </div>
        <div class="round-clue-title">"${r.clueWord}" (${r.clueCount})</div>
        <div class="round-picks-list">
          ${guessesHtml}
        </div>
      `;
      roundsTimelineList.appendChild(card);
    });

    // Auto-scroll timeline to bottom
    roundsTimelineList.scrollTop = roundsTimelineList.scrollHeight;
  }

  function renderEventsLog(history) {
    eventsLogList.innerHTML = '';
    history.forEach(item => {
      const row = document.createElement('div');
      row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      row.style.padding = '4px 0';
      row.innerHTML = `<span style="color: var(--text-dim);">${item.time}</span> - ${item.text}`;
      eventsLogList.appendChild(row);
    });
  }

  function spawnVictoryConfetti(team) {
    if (!modalVictory) return;
    const colors = team === 'red' ? ['#ef4444', '#f87171', '#d4af37', '#ffffff'] : ['#3b82f6', '#60a5fa', '#d4af37', '#ffffff'];
    const count = 36;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'victory-confetti-particle';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const sizeW = Math.random() * 8 + 4;
      const sizeH = Math.random() * 8 + 4;
      p.style.width = `${sizeW}px`;
      p.style.height = `${sizeH}px`;
      p.style.backgroundColor = color;
      p.style.left = `${Math.random() * 90 + 5}%`;
      p.style.top = '10%';

      const vx = (Math.random() - 0.5) * 260;
      const vy = Math.random() * 420 + 150;
      const vr = (Math.random() - 0.5) * 720;
      p.style.setProperty('--vx', `${vx}px`);
      p.style.setProperty('--vy', `${vy}px`);
      p.style.setProperty('--vr', `${vr}deg`);
      p.style.animationDelay = `${Math.random() * 0.4}s`;
      container.appendChild(p);
    }

    modalVictory.appendChild(container);
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 2800);
  }

  function showVictory(winner, reason) {
    modalVictory.classList.add('active');
    const isRed = winner === 'red';
    const you = currentGameState && currentGameState.you;
    const isWinner = you && you.team === winner;
    const isSpectator = !you || you.team === 'spectator';

    if (isWinner || isSpectator) {
      lblVictoryHeading.textContent = `VITÓRIA DO TIME ${isRed ? 'VERMELHO' : 'AZUL'}!`;
      lblVictoryHeading.style.color = isRed ? '#ef4444' : '#3b82f6';
      window.sounds.playVictory();
      spawnVictoryConfetti(isRed ? 'red' : 'blue');
    } else {
      lblVictoryHeading.textContent = `DERROTA - VITÓRIA DO TIME ${isRed ? 'VERMELHO' : 'AZUL'}`;
      lblVictoryHeading.style.color = '#ef4444';
      window.sounds.playDefeat();
    }

    if (reason === 'assassin') {
      lblVictoryDetails.textContent = 'O adversário confirmou a escolha do Assassino ☠️ e foi derrotado instantaneamente.';
    } else {
      lblVictoryDetails.textContent = 'Todos os agentes secretos da equipe foram identificados com sucesso.';
    }

    // Populate match summary stats
    const lblRounds = document.getElementById('lblVictoryStatsRounds');
    const lblBlue = document.getElementById('lblVictoryStatsBlue');
    const lblRed = document.getElementById('lblVictoryStatsRed');

    if (lblRounds && currentGameState) {
      lblRounds.textContent = (currentGameState.roundsHistory && currentGameState.roundsHistory.length) || 1;
    }
    if (lblBlue && currentGameState && currentGameState.scores) {
      const totalBlue = currentGameState.scores.blueTotal || 8;
      const foundBlue = Math.max(0, totalBlue - (currentGameState.scores.blue || 0));
      lblBlue.textContent = `${foundBlue}/${totalBlue}`;
    }
    if (lblRed && currentGameState && currentGameState.scores) {
      const totalRed = currentGameState.scores.redTotal || 8;
      const foundRed = Math.max(0, totalRed - (currentGameState.scores.red || 0));
      lblRed.textContent = `${foundRed}/${totalRed}`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
