const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const dbService = require('./db');
const { createBot, BotManager } = require('./botService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3333;

// Load base decks from data/decks.json
const decksPath = path.join(__dirname, 'data', 'decks.json');
let baseDecks = {};
try {
  baseDecks = JSON.parse(fs.readFileSync(decksPath, 'utf8'));
} catch (e) {
  console.error('Erro ao ler decks.json:', e);
}

app.use((req, res, next) => {
  if (req.url && req.url.startsWith('/socket.io/')) {
    io.engine.handleRequest(req, res);
  } else {
    next();
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API: Get base decks + persistent SQLite custom decks
app.get('/api/decks', async (req, res) => {
  try {
    const customDecksFromDb = await dbService.getAllCustomDecks();
    const response = { ...baseDecks };

    // Append database custom decks with clear ids
    customDecksFromDb.forEach(cd => {
      response[cd.id] = {
        id: cd.id,
        name: cd.name,
        description: `Baralho salvo no banco por ${cd.author}.`,
        words: cd.words,
        isCustom: true
      };
    });

    res.json(response);
  } catch (err) {
    console.error('Erro na rota /api/decks:', err);
    res.json(baseDecks);
  }
});

// API: Save custom deck to persistent SQLite DB
app.post('/api/custom-decks', async (req, res) => {
  try {
    const { name, words, author } = req.body;
    if (!name || !Array.isArray(words) || words.length < 5) {
      return res.status(400).json({ error: 'Nome e pelo menos 5 palavras são obrigatórios.' });
    }

    const deckId = 'custom_' + Date.now();
    await dbService.saveCustomDeck({
      id: deckId,
      name: name.trim(),
      words: words.map(w => String(w).trim()).filter(Boolean),
      author: author ? String(author).trim() : 'Membro Iluminado',
      createdAt: Date.now()
    });

    res.json({ success: true, id: deckId });
  } catch (err) {
    console.error('Erro ao salvar baralho no banco:', err);
    res.status(500).json({ error: 'Falha ao gravar no banco de dados.' });
  }
});

// API: Delete custom deck from SQLite
app.delete('/api/custom-decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.deleteCustomDeck(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir baralho:', err);
    res.status(500).json({ error: 'Falha ao excluir baralho.' });
  }
});

// Active game rooms map
const rooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function buildWordPool(selectedDeckIds, localCustomDecks = []) {
  let pool = [];
  const decksUsedNames = [];

  // 1. Check base decks
  if (Array.isArray(selectedDeckIds)) {
    for (const deckId of selectedDeckIds) {
      if (baseDecks[deckId]) {
        pool.push(...baseDecks[deckId].words);
        decksUsedNames.push(baseDecks[deckId].name);
      }
    }
  }

  // 2. Check SQLite persistent custom decks
  try {
    const dbDecks = await dbService.getAllCustomDecks();
    for (const dbDeck of dbDecks) {
      if (selectedDeckIds && selectedDeckIds.includes(dbDeck.id)) {
        pool.push(...dbDeck.words);
        decksUsedNames.push(dbDeck.name);
      }
    }
  } catch (e) {
    console.error('Erro ao buscar decks do banco:', e);
  }

  // 3. Check memory/passed custom decks
  if (Array.isArray(localCustomDecks)) {
    localCustomDecks.forEach(cDeck => {
      if (cDeck && Array.isArray(cDeck.words)) {
        pool.push(...cDeck.words);
        decksUsedNames.push(cDeck.name || 'Personalizado');
      }
    });
  }

  // Deduplicate
  const seen = new Set();
  const uniquePool = [];
  for (const w of pool) {
    const clean = String(w).trim();
    const lower = clean.toLowerCase();
    if (clean && !seen.has(lower)) {
      seen.add(lower);
      uniquePool.push(clean);
    }
  }

  return { uniquePool, decksUsedNames };
}

function generateBoard(wordPool, startingTeam, guaranteedWords = []) {
  if (wordPool.length < 25) {
    throw new Error('O acervo de palavras precisa ter pelo menos 25 palavras.');
  }

  // Deduplicate and sanitize guaranteed words
  const cleanGuaranteed = [];
  const guaranteedSet = new Set();
  if (Array.isArray(guaranteedWords)) {
    guaranteedWords.forEach(w => {
      const clean = String(w).trim();
      if (clean && !guaranteedSet.has(clean.toLowerCase())) {
        guaranteedSet.add(clean.toLowerCase());
        cleanGuaranteed.push(clean);
      }
    });
  }

  // Filter wordPool to remove words that are already in cleanGuaranteed
  const remainingPool = wordPool.filter(w => !guaranteedSet.has(String(w).trim().toLowerCase()));

  // Take up to 25 guaranteed words
  const chosenGuaranteed = cleanGuaranteed.slice(0, 25);
  const neededFromPool = Math.max(0, 25 - chosenGuaranteed.length);

  const shuffledFromPool = shuffle(remainingPool).slice(0, neededFromPool);
  const final25 = shuffle([...chosenGuaranteed, ...shuffledFromPool]);

  const secondTeam = startingTeam === 'red' ? 'blue' : 'red';
  const types = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('neutral'),
    'assassin'
  ];

  const shuffledTypes = shuffle(types);

  return final25.map((word, idx) => ({
    id: idx,
    word: word,
    type: shuffledTypes[idx],
    revealed: false,
    selectedBy: []
  }));
}

function startRoomTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  if (!room.settings.timerSeconds || room.settings.timerSeconds <= 0 || room.status !== 'playing' || room.winner) {
    room.timerRemaining = null;
    return;
  }

  room.timerRemaining = room.settings.timerSeconds;
  io.to(room.id).emit('TIMER_UPDATE', { remaining: room.timerRemaining });

  room.timerInterval = setInterval(() => {
    if (room.winner || room.status !== 'playing') {
      clearInterval(room.timerInterval);
      return;
    }

    room.timerRemaining--;
    io.to(room.id).emit('TIMER_UPDATE', { remaining: room.timerRemaining });

    if (room.timerRemaining <= 0) {
      clearInterval(room.timerInterval);
      handleTurnTimeout(room);
    }
  }, 1000);
}

function handleTurnTimeout(room) {
  if (room.winner || room.status !== 'playing') return;

  const nextTeam = room.currentTurn === 'red' ? 'blue' : 'red';
  room.board.forEach(c => c.selectedBy = []);

  if (room.turnPhase === 'clue') {
    room.currentTurn = nextTeam;
    room.turnPhase = 'clue';
    room.currentClue = null;
    addHistory(room, `Tempo esgotado para o Mestre. Turno transferido para o Time ${nextTeam === 'red' ? 'Vermelho' : 'Azul'}.`, 'system');
  } else {
    room.currentTurn = nextTeam;
    room.turnPhase = 'clue';
    room.currentClue = null;
    addHistory(room, `Tempo esgotado para os Agentes. Turno transferido para o Time ${nextTeam === 'red' ? 'Vermelho' : 'Azul'}.`, 'system');
  }

  startRoomTimer(room);
  broadcastRoomState(room);
  botManager.checkAndRunBots(room);
}

function addHistory(room, text, type = 'info') {
  const entry = {
    id: Date.now() + Math.random().toString(),
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    text,
    type
  };
  room.history.unshift(entry);
  if (room.history.length > 50) room.history.pop();
}

function getClientGameState(room, socketId) {
  const player = room.players[socketId];
  const isSpymaster = player && player.role === 'spymaster';
  const isGameOver = room.winner !== null;

  const filteredBoard = room.board.map(card => {
    if (card.revealed || isSpymaster || isGameOver) {
      return { ...card };
    }
    return {
      ...card,
      type: null
    };
  });

  const redRemaining = room.board.filter(c => c.type === 'red' && !c.revealed).length;
  const blueRemaining = room.board.filter(c => c.type === 'blue' && !c.revealed).length;

  return {
    roomId: room.id,
    status: room.status,
    board: filteredBoard,
    currentTurn: room.currentTurn,
    turnPhase: room.turnPhase,
    currentClue: room.currentClue,
    startingTeam: room.startingTeam,
    winner: room.winner,
    winReason: room.winReason,
    lockTeamSwitching: room.lockTeamSwitching,
    scores: {
      red: redRemaining,
      blue: blueRemaining,
      redTotal: room.startingTeam === 'red' ? 9 : 8,
      blueTotal: room.startingTeam === 'blue' ? 9 : 8
    },
    players: Object.values(room.players),
    history: room.history,
    roundsHistory: room.roundsHistory,
    timer: {
      duration: room.settings.timerSeconds,
      remaining: room.timerRemaining
    },
    settings: {
      selectedDeckIds: room.settings.selectedDeckIds,
      decksUsed: room.settings.decksUsed,
      timerSeconds: room.settings.timerSeconds,
      totalWordsPool: room.wordPool.length,
      extraWords: room.settings.extraWords || []
    },
    you: player || null
  };
}

function broadcastRoomState(room) {
  for (const socketId in room.players) {
    if (!room.players[socketId].isBot) {
      const state = getClientGameState(room, socketId);
      io.to(socketId).emit('ROOM_STATE_UPDATE', state);
    }
  }
}

// Bot Manager Core Action Handlers
function executeClueSubmission(room, player, word, count) {
  const cleanWord = String(word).trim().toUpperCase();
  if (!cleanWord) return;

  const isZero = count === '0' || count === 0;
  const isUnlimited = count === 'unlimited' || count === '∞' || count === 'infinito' || count === 99;
  
  let num;
  if (isUnlimited) {
    num = '∞';
  } else if (isZero) {
    num = 0;
  } else {
    const parsed = parseInt(count, 10);
    num = (isNaN(parsed) || parsed < 0) ? 1 : Math.min(parsed, 25);
  }

  const remainingGuesses = (isZero || isUnlimited) ? 99 : (num + 1);

  room.currentClue = {
    word: cleanWord,
    count: num,
    remainingGuesses: remainingGuesses
  };

  const roundEntry = {
    roundNumber: room.roundsHistory.length + 1,
    team: room.currentTurn,
    spymaster: player.name,
    clueWord: cleanWord,
    clueCount: num,
    guesses: []
  };
  room.roundsHistory.push(roundEntry);

  room.turnPhase = 'guess';
  room.board.forEach(c => c.selectedBy = []);

  addHistory(room, `Mestre ${player.name}: "${cleanWord}" (${num}).`, 'clue');

  startRoomTimer(room);
  broadcastRoomState(room);
  botManager.checkAndRunBots(room);
}

function executeSelectCard(room, player, cardId) {
  const card = room.board.find(c => c.id === cardId);
  if (!card || card.revealed) return;

  const idx = card.selectedBy.indexOf(player.name);
  if (idx >= 0) {
    card.selectedBy.splice(idx, 1);
  } else {
    card.selectedBy.push(player.name);
  }

  broadcastRoomState(room);
}

function executeConfirmCard(room, player, cardId) {
  const card = room.board.find(c => c.id === cardId);
  if (!card || card.revealed) return;

  card.revealed = true;
  const currentTeam = room.currentTurn;
  const otherTeam = currentTeam === 'red' ? 'blue' : 'red';

  room.board.forEach(c => c.selectedBy = []);

  addHistory(room, `Palpite confirmado em "${card.word}" por ${player.name}.`, 'guess');

  const currentRound = room.roundsHistory[room.roundsHistory.length - 1];
  let guessResult = 'neutral';
  if (card.type === currentTeam) guessResult = 'correct';
  else if (card.type === otherTeam) guessResult = 'opponent';
  else if (card.type === 'assassin') guessResult = 'assassin';

  if (currentRound) {
    currentRound.guesses.push({
      word: card.word,
      type: card.type,
      result: guessResult,
      operative: player.name
    });
  }

  io.to(room.id).emit('CARD_REVEALED_SOUND', { type: card.type, cardId: card.id, word: card.word });

  if (card.type === 'assassin') {
    room.winner = otherTeam;
    room.winReason = 'assassin';
    room.status = 'game_over';
    addHistory(room, `O Assassino foi revelado! Vitória do Time ${otherTeam === 'red' ? 'Vermelho' : 'Azul'}!`, 'game_over');
    if (room.timerInterval) clearInterval(room.timerInterval);
    dbService.saveMatch({ roomId: room.id, winner: room.winner, winReason: room.winReason, roundsCount: room.roundsHistory.length });
  } else if (card.type === currentTeam) {
    addHistory(room, `Acerto! Carta do Time ${currentTeam === 'red' ? 'Vermelho' : 'Azul'}.`, 'success');

    const remainingTeam = room.board.filter(c => c.type === currentTeam && !c.revealed).length;
    if (remainingTeam === 0) {
      room.winner = currentTeam;
      room.winReason = 'all_found';
      room.status = 'game_over';
      addHistory(room, `Vitória do Time ${currentTeam === 'red' ? 'Vermelho' : 'Azul'}! Todos os agentes foram localizados.`, 'game_over');
      if (room.timerInterval) clearInterval(room.timerInterval);
      dbService.saveMatch({ roomId: room.id, winner: room.winner, winReason: room.winReason, roundsCount: room.roundsHistory.length });
    } else {
      if (room.currentClue && room.currentClue.remainingGuesses !== 99) {
        room.currentClue.remainingGuesses--;
        if (room.currentClue.remainingGuesses <= 0) {
          addHistory(room, `Limite de palpites atingido. Vez do Time ${otherTeam === 'red' ? 'Vermelho' : 'Azul'}.`, 'info');
          room.currentTurn = otherTeam;
          room.turnPhase = 'clue';
          room.currentClue = null;
          startRoomTimer(room);
        }
      }
    }
  } else if (card.type === otherTeam) {
    addHistory(room, `Agente adversário revelado! Ponto para o Time ${otherTeam === 'red' ? 'Vermelho' : 'Azul'}. Turno finalizado.`, 'warning');

    const remainingOpp = room.board.filter(c => c.type === otherTeam && !c.revealed).length;
    if (remainingOpp === 0) {
      room.winner = otherTeam;
      room.winReason = 'all_found';
      room.status = 'game_over';
      addHistory(room, `Vitória do Time ${otherTeam === 'red' ? 'Vermelho' : 'Azul'}!`, 'game_over');
      if (room.timerInterval) clearInterval(room.timerInterval);
      dbService.saveMatch({ roomId: room.id, winner: room.winner, winReason: room.winReason, roundsCount: room.roundsHistory.length });
    } else {
      room.currentTurn = otherTeam;
      room.turnPhase = 'clue';
      room.currentClue = null;
      startRoomTimer(room);
    }
  } else {
    addHistory(room, `Espectador neutro revelado. Turno finalizado.`, 'neutral');
    room.currentTurn = otherTeam;
    room.turnPhase = 'clue';
    room.currentClue = null;
    startRoomTimer(room);
  }

  broadcastRoomState(room);
  botManager.checkAndRunBots(room);
}

function executeEndTurn(room, player) {
  const otherTeam = room.currentTurn === 'red' ? 'blue' : 'red';
  room.board.forEach(c => c.selectedBy = []);

  addHistory(room, `${player.name} passou a vez para o Time ${otherTeam === 'red' ? 'Vermelho' : 'Azul'}.`, 'info');

  room.currentTurn = otherTeam;
  room.turnPhase = 'clue';
  room.currentClue = null;

  startRoomTimer(room);
  broadcastRoomState(room);
  botManager.checkAndRunBots(room);
}

// Instantiate Bot Manager
const botManager = new BotManager(
  io,
  (id) => rooms.get(id),
  executeClueSubmission,
  executeSelectCard,
  executeConfirmCard,
  executeEndTurn
);

// Socket.io Events
io.on('connection', (socket) => {
  let currentRoomId = null;

  // 1. Create Room
  socket.on('CREATE_ROOM', async ({ nickname, selectedDeckIds, customDecks, timerSeconds }) => {
    try {
      const roomId = generateRoomId();
      const { uniquePool, decksUsedNames } = await buildWordPool(selectedDeckIds || ['iluminados'], customDecks || []);

      if (uniquePool.length < 25) {
        socket.emit('ERROR', { message: `São necessárias pelo menos 25 palavras únicas nos baralhos (atual: ${uniquePool.length}).` });
        return;
      }

      const room = {
        id: roomId,
        status: 'lobby',
        wordPool: uniquePool,
        startingTeam: 'red',
        currentTurn: 'red',
        turnPhase: 'clue',
        currentClue: null,
        winner: null,
        winReason: null,
        board: [],
        history: [],
        roundsHistory: [],
        players: {},
        lockTeamSwitching: false,
        timerInterval: null,
        timerRemaining: null,
        settings: {
          selectedDeckIds: selectedDeckIds || ['iluminados'],
          timerSeconds: parseInt(timerSeconds, 10) || 0,
          decksUsed: decksUsedNames,
          customDecks: customDecks || [],
          extraWords: []
        }
      };

      const player = {
        id: socket.id,
        name: nickname || 'Membro Iluminado',
        team: 'spectator',
        role: 'spectator',
        isHost: true,
        isBot: false
      };

      room.players[socket.id] = player;
      rooms.set(roomId, room);

      socket.join(roomId);
      currentRoomId = roomId;

      addHistory(room, `Sala criada por ${player.name}.`, 'system');

      socket.emit('ROOM_CREATED', { roomId });
      broadcastRoomState(room);
    } catch (err) {
      console.error('Erro ao criar sala:', err);
      socket.emit('ERROR', { message: err.message || 'Erro ao criar sala.' });
    }
  });

  // 2. Join Room
  socket.on('JOIN_ROOM', ({ roomId, nickname }) => {
    const code = String(roomId).trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('ERROR', { message: `Sala ${code} não encontrada.` });
      return;
    }

    const player = {
      id: socket.id,
      name: nickname || 'Convidado ' + (Object.keys(room.players).length + 1),
      team: 'spectator',
      role: 'spectator',
      isHost: Object.keys(room.players).length === 0,
      isBot: false
    };

    room.players[socket.id] = player;
    socket.join(code);
    currentRoomId = code;

    addHistory(room, `${player.name} entrou na sala como espectador.`, 'info');
    socket.emit('ROOM_JOINED', { roomId: code });
    broadcastRoomState(room);
  });

  // 3. Set Team and Role
  socket.on('SET_TEAM_ROLE', ({ team, role }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    if (room.lockTeamSwitching && !player.isHost) {
      socket.emit('ERROR', { message: 'A troca de equipes está bloqueada pelo administrador da sala.' });
      return;
    }

    if (role === 'spymaster' && team !== 'spectator') {
      const existing = Object.values(room.players).find(p => p.team === team && p.role === 'spymaster' && p.id !== socket.id);
      if (existing) {
        if (existing.isBot) {
          delete room.players[existing.id];
          addHistory(room, `${player.name} assumiu a função de Mestre no lugar de ${existing.name}.`, 'system');
        } else {
          socket.emit('ERROR', { message: `O time ${team === 'red' ? 'Vermelho' : 'Azul'} já possui um Mestre (${existing.name}).` });
          return;
        }
      }
    }

    player.team = team;
    player.role = team === 'spectator' ? 'spectator' : role;

    addHistory(room, `${player.name} entrou no ${team === 'spectator' ? 'grupo de Espectadores' : (team === 'red' ? 'Time Vermelho' : 'Time Azul') + ' como ' + (role === 'spymaster' ? 'Mestre' : 'Agente')}.`, 'info');
    broadcastRoomState(room);
  });

  // 4. Add Bot to Room (Host only)
  socket.on('ADD_BOT', ({ team, role }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode adicionar bots.' });
      return;
    }

    // Check spymaster limit
    if (role === 'spymaster') {
      const existing = Object.values(room.players).find(p => p.team === team && p.role === 'spymaster');
      if (existing) {
        socket.emit('ERROR', { message: `A equipe ${team === 'red' ? 'Vermelha' : 'Azul'} já possui um Mestre (${existing.name}).` });
        return;
      }
    }

    const bot = createBot(team, role, Object.values(room.players));
    room.players[bot.id] = bot;

    addHistory(room, `${bot.name} foi adicionado ao Time ${team === 'red' ? 'Vermelho' : 'Azul'} como ${role === 'spymaster' ? 'Mestre' : 'Agente'}.`, 'system');
    broadcastRoomState(room);
  });

  // 5. Remove Bot (Host only)
  socket.on('REMOVE_BOT', ({ botId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) return;

    if (room.players[botId] && room.players[botId].isBot) {
      const botName = room.players[botId].name;
      delete room.players[botId];
      addHistory(room, `${botName} foi removido da sala.`, 'system');
      broadcastRoomState(room);
    }
  });

  // 6. Fill with Bots (Quick 1-Click Game Prep)
  socket.on('FILL_WITH_BOTS', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) return;

    const currentPlayers = Object.values(room.players);

    // Ensure Red Spymaster
    if (!currentPlayers.some(p => p.team === 'red' && p.role === 'spymaster')) {
      const bot = createBot('red', 'spymaster', Object.values(room.players));
      room.players[bot.id] = bot;
    }

    // Ensure Blue Spymaster
    if (!Object.values(room.players).some(p => p.team === 'blue' && p.role === 'spymaster')) {
      const bot = createBot('blue', 'spymaster', Object.values(room.players));
      room.players[bot.id] = bot;
    }

    // Ensure at least 1 operative each
    if (!Object.values(room.players).some(p => p.team === 'red' && p.role === 'operative')) {
      const bot = createBot('red', 'operative', Object.values(room.players));
      room.players[bot.id] = bot;
    }
    if (!Object.values(room.players).some(p => p.team === 'blue' && p.role === 'operative')) {
      const bot = createBot('blue', 'operative', Object.values(room.players));
      room.players[bot.id] = bot;
    }

    addHistory(room, `${caller.name} preencheu as equipes com Bots.`, 'system');
    broadcastRoomState(room);
  });

  // 7. Randomize Teams (Admin only)
  socket.on('RANDOMIZE_TEAMS', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode randomizar as equipes.' });
      return;
    }

    const allPlayers = Object.values(room.players);
    if (allPlayers.length < 2) {
      socket.emit('ERROR', { message: 'São necessários pelo menos 2 jogadores para randomizar as equipes.' });
      return;
    }

    const shuffled = shuffle(allPlayers);
    const mid = Math.ceil(shuffled.length / 2);
    const blueGroup = shuffled.slice(0, mid);
    const redGroup = shuffled.slice(mid);

    blueGroup.forEach((p, idx) => {
      p.team = 'blue';
      p.role = idx === 0 ? 'spymaster' : 'operative';
    });

    redGroup.forEach((p, idx) => {
      p.team = 'red';
      p.role = idx === 0 ? 'spymaster' : 'operative';
    });

    addHistory(room, `${caller.name} randomizou as equipes.`, 'system');
    broadcastRoomState(room);
  });

  // 8. Reset Teams to Spectators (Admin only)
  socket.on('RESET_TEAMS', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode redefinir as equipes.' });
      return;
    }

    Object.values(room.players).forEach(p => {
      if (p.isBot) {
        delete room.players[p.id];
      } else {
        p.team = 'spectator';
        p.role = 'spectator';
      }
    });

    addHistory(room, `${caller.name} redefiniu todas as equipes para espectadores.`, 'system');
    broadcastRoomState(room);
  });

  // 9. Toggle Team Lock (Admin only)
  socket.on('TOGGLE_TEAM_LOCK', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode alterar o bloqueio de equipes.' });
      return;
    }

    room.lockTeamSwitching = !room.lockTeamSwitching;
    addHistory(room, `A troca de equipes foi ${room.lockTeamSwitching ? 'bloqueada' : 'desbloqueada'} pelo administrador.`, 'system');
    broadcastRoomState(room);
  });

  // 10. Update Room Settings in Lobby (Admin only)
  socket.on('UPDATE_ROOM_SETTINGS', async ({ selectedDeckIds, customDecks, timerSeconds }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode alterar as configurações.' });
      return;
    }

    const { uniquePool, decksUsedNames } = await buildWordPool(
      selectedDeckIds || room.settings.selectedDeckIds,
      customDecks || room.settings.customDecks
    );

    if (uniquePool.length < 25) {
      socket.emit('ERROR', { message: `São necessárias pelo menos 25 palavras únicas (atual: ${uniquePool.length}).` });
      return;
    }

    room.wordPool = uniquePool;
    room.settings.selectedDeckIds = selectedDeckIds || room.settings.selectedDeckIds;
    room.settings.decksUsed = decksUsedNames;
    if (customDecks) room.settings.customDecks = customDecks;
    if (timerSeconds !== undefined) room.settings.timerSeconds = parseInt(timerSeconds, 10) || 0;

    addHistory(room, `Configurações atualizadas (${uniquePool.length} palavras disponíveis).`, 'system');
    broadcastRoomState(room);
  });

  // 10b. Add Extra Quick Words (Without creating a deck)
  socket.on('ADD_EXTRA_WORDS', ({ words }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller) return;

    if (!room.settings.extraWords) room.settings.extraWords = [];

    const rawList = Array.isArray(words) ? words : String(words || '').split(/[\n,;]+/);
    let addedCount = 0;

    rawList.forEach(w => {
      const clean = String(w).trim();
      if (clean && clean.length <= 35) {
        const alreadyIn = room.settings.extraWords.some(ew => ew.toLowerCase() === clean.toLowerCase());
        if (!alreadyIn) {
          room.settings.extraWords.push(clean);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      addHistory(room, `${caller.name} adicionou ${addedCount} palavra(s) rápida(s) à rodada.`, 'system');
      broadcastRoomState(room);
    }
  });

  // 10c. Remove Extra Quick Word
  socket.on('REMOVE_EXTRA_WORD', ({ word }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.settings.extraWords) return;

    const clean = String(word).trim().toLowerCase();
    const initialLen = room.settings.extraWords.length;
    room.settings.extraWords = room.settings.extraWords.filter(w => w.toLowerCase() !== clean);

    if (room.settings.extraWords.length < initialLen) {
      broadcastRoomState(room);
    }
  });

  // 11. Start Game (Admin only)
  socket.on('START_GAME', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador da sala pode iniciar o jogo.' });
      return;
    }

    const redSpymaster = Object.values(room.players).find(p => p.team === 'red' && p.role === 'spymaster');
    const blueSpymaster = Object.values(room.players).find(p => p.team === 'blue' && p.role === 'spymaster');
    const redOperative = Object.values(room.players).find(p => p.team === 'red' && p.role === 'operative');
    const blueOperative = Object.values(room.players).find(p => p.team === 'blue' && p.role === 'operative');

    if (!redSpymaster || !blueSpymaster) {
      socket.emit('ERROR', { message: 'Cada equipe (Vermelha e Azul) precisa de 1 Mestre-Espião definido antes de iniciar. Você pode adicionar com "+ Bot".' });
      return;
    }

    if (!redOperative || !blueOperative) {
      socket.emit('ERROR', { message: 'Cada equipe precisa de pelo menos 1 Agente de campo. Use "+ Bot" ou "Preencher com Bots".' });
      return;
    }

    const starter = Math.random() < 0.5 ? 'red' : 'blue';
    room.startingTeam = starter;
    room.currentTurn = starter;
    room.turnPhase = 'clue';
    room.currentClue = null;
    room.winner = null;
    room.winReason = null;
    room.roundsHistory = [];
    room.board = generateBoard(room.wordPool, starter, room.settings.extraWords || []);
    room.status = 'playing';

    addHistory(room, `Partida iniciada! Time inicial: ${starter === 'red' ? 'Vermelho (9 cartas)' : 'Azul (9 cartas)'}.`, 'system');

    startRoomTimer(room);
    broadcastRoomState(room);
    botManager.checkAndRunBots(room);
  });

  // 12. Spymaster Submits Clue
  socket.on('GIVE_CLUE', ({ word, count }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.status !== 'playing' || room.winner) return;

    const player = room.players[socket.id];
    if (!player) return;

    if (player.team !== room.currentTurn || player.role !== 'spymaster' || room.turnPhase !== 'clue') {
      socket.emit('ERROR', { message: 'Aguarde o momento da sua equipe ou verifique sua função.' });
      return;
    }

    executeClueSubmission(room, player, word, count);
  });

  // 13. Select / Ping Card
  socket.on('SELECT_CARD', ({ cardId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.status !== 'playing' || room.winner || room.turnPhase !== 'guess') return;

    const player = room.players[socket.id];
    if (!player || player.team !== room.currentTurn || player.role !== 'operative') return;

    executeSelectCard(room, player, cardId);
  });

  // 14. Confirm Selected Card
  socket.on('CONFIRM_CARD', ({ cardId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.status !== 'playing' || room.winner || room.turnPhase !== 'guess') return;

    const player = room.players[socket.id];
    if (!player || player.team !== room.currentTurn || player.role !== 'operative') {
      socket.emit('ERROR', { message: 'Apenas Agentes do time em jogo podem confirmar palpites.' });
      return;
    }

    executeConfirmCard(room, player, cardId);
  });

  // 15. End Turn
  socket.on('END_TURN', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.status !== 'playing' || room.winner || room.turnPhase !== 'guess') return;

    const player = room.players[socket.id];
    if (!player || player.team !== room.currentTurn || player.role !== 'operative') return;

    executeEndTurn(room, player);
  });

  // 16. Rematch
  socket.on('NEW_GAME', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode iniciar nova partida.' });
      return;
    }

    try {
      botManager.clearRoomBotTimers(room.id);
      if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
      }
      room.timerRemaining = null;

      const nextStarter = room.startingTeam === 'red' ? 'blue' : 'red';
      room.startingTeam = nextStarter;
      room.currentTurn = nextStarter;
      room.turnPhase = 'clue';
      room.currentClue = null;
      room.winner = null;
      room.winReason = null;
      room.roundsHistory = [];
      room.board = generateBoard(room.wordPool, nextStarter, room.settings.extraWords || []);
      room.status = 'playing';

      addHistory(room, `Nova rodada iniciada! Time inicial: ${nextStarter === 'red' ? 'Vermelho' : 'Azul'}.`, 'system');

      startRoomTimer(room);
      broadcastRoomState(room);
      botManager.checkAndRunBots(room);
    } catch (err) {
      socket.emit('ERROR', { message: err.message || 'Erro ao reiniciar o jogo.' });
    }
  });

  // 17. Return to Lobby
  socket.on('RETURN_TO_LOBBY', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const caller = room.players[socket.id];
    if (!caller || !caller.isHost) {
      socket.emit('ERROR', { message: 'Apenas o administrador pode retornar ao lobby.' });
      return;
    }

    room.status = 'lobby';
    room.winner = null;
    room.winReason = null;
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    room.timerRemaining = null;
    io.to(room.id).emit('TIMER_UPDATE', { remaining: null });
    botManager.clearRoomBotTimers(room.id);

    addHistory(room, `A sala retornou para o Lobby de preparação.`, 'system');
    broadcastRoomState(room);
  });

  // 18. Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room && room.players[socket.id]) {
        const wasHost = room.players[socket.id].isHost;
        const playerName = room.players[socket.id].name;
        delete room.players[socket.id];
        addHistory(room, `${playerName} saiu da sala.`, 'system');

        const remainingHumans = Object.values(room.players).filter(p => !p.isBot);
        if (wasHost && remainingHumans.length > 0) {
          remainingHumans[0].isHost = true;
          addHistory(room, `${remainingHumans[0].name} assumiu como administrador da sala.`, 'system');
        }

        if (remainingHumans.length === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          botManager.clearRoomBotTimers(room.id);
          setTimeout(() => {
            const r = rooms.get(currentRoomId);
            if (r && Object.values(r.players).filter(p => !p.isBot).length === 0) {
              rooms.delete(currentRoomId);
            }
          }, 15 * 60 * 1000);
        } else {
          broadcastRoomState(room);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`CodeNames dos Iluminados ativo na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`===============================================`);
});

module.exports = app;

