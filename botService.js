// Bot Intelligence Service for Codenames
// Permite partidas solo, testes rápidos e preenchimento de equipes incompletas

const BOT_NAMES = [
  'Bot Turing', 'Bot Lovelace', 'Bot Arquivista', 'Bot Oraculo',
  'Bot Sentinela', 'Bot Hermes', 'Bot Da Vinci', 'Bot Athena',
  'Bot Sherlock', 'Bot Arquimedes'
];

const BOT_CLUES = [
  'CONEXAO', 'MISTERIO', 'SIMBOLO', 'CONCEITO', 'MEMORIA',
  'LORE', 'ENTIDADE', 'ORIGEM', 'LEGADO', 'ELEMENTO',
  'FOCO', 'ALVO', 'DESTINO', 'CODIGO', 'ILUMINADO',
  'HISTORIA', 'ARQUIVO', 'SEGREDOS', 'ORDEM', 'UNIVERSO',
  'PODER', 'TEMPO', 'RAZAO', 'ALIANCA', 'ENIGMA'
];

function createBot(team, role, existingPlayers = []) {
  const usedNames = new Set(existingPlayers.map(p => p.name));
  let available = BOT_NAMES.filter(n => !usedNames.has(n));
  if (available.length === 0) available = BOT_NAMES;

  const name = available[Math.floor(Math.random() * available.length)];
  const botId = 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  return {
    id: botId,
    name: name,
    team: team,
    role: role,
    isBot: true,
    isHost: false
  };
}

class BotManager {
  constructor(io, getRoomFn, processClueFn, selectCardFn, confirmCardFn, endTurnFn) {
    this.io = io;
    this.getRoom = getRoomFn;
    this.processClue = processClueFn;
    this.selectCard = selectCardFn;
    this.confirmCard = confirmCardFn;
    this.endTurn = endTurnFn;
    this.activeTimeouts = new Map();
  }

  clearRoomBotTimers(roomId) {
    if (roomId && this.activeTimeouts.has(roomId)) {
      clearTimeout(this.activeTimeouts.get(roomId));
      this.activeTimeouts.delete(roomId);
    }
  }

  // Triggered whenever game state updates
  checkAndRunBots(room) {
    if (!room || room.status !== 'playing' || room.winner) {
      this.clearRoomBotTimers(room ? room.id : null);
      return;
    }

    const currentTeam = room.currentTurn;
    const currentPhase = room.turnPhase;
    const players = Object.values(room.players);

    // Case 1: Spymaster Bot's turn to give clue
    if (currentPhase === 'clue') {
      const spymaster = players.find(p => p.team === currentTeam && p.role === 'spymaster');
      if (spymaster && spymaster.isBot) {
        this.scheduleBotClue(room, spymaster);
        return;
      }
    }

    // Case 2: Operative Bot's turn to guess
    if (currentPhase === 'guess') {
      const teamOperatives = players.filter(p => p.team === currentTeam && p.role === 'operative');
      const botOperatives = teamOperatives.filter(p => p.isBot);
      const hasHumanOperative = teamOperatives.some(p => !p.isBot);

      if (botOperatives.length > 0) {
        // If human is on the team, give them 5 seconds to think, otherwise 2.2 seconds
        const delay = hasHumanOperative ? 5000 : 2200;
        const actingBot = botOperatives[Math.floor(Math.random() * botOperatives.length)];
        this.scheduleBotGuess(room, actingBot, delay);
        return;
      }
    }
  }

  scheduleBotClue(room, bot) {
    this.clearRoomBotTimers(room.id);

    const timer = setTimeout(() => {
      const currentRoom = this.getRoom(room.id);
      if (!currentRoom || currentRoom.status !== 'playing' || currentRoom.turnPhase !== 'clue') return;

      const myCards = currentRoom.board.filter(c => c.type === bot.team && !c.revealed);
      if (myCards.length === 0) return;

      // Filter clue pool to avoid words visible on the board
      const boardWordsUpper = new Set(currentRoom.board.map(c => c.word.toUpperCase()));
      const validClues = BOT_CLUES.filter(cl => !boardWordsUpper.has(cl));
      const pool = validClues.length > 0 ? validClues : ['ENIGMA', 'OCULTO', 'SINAL'];
      const clue = pool[Math.floor(Math.random() * pool.length)];

      // Choose count: 2 if multiple cards left, or 1
      const count = myCards.length >= 2 ? (Math.random() < 0.65 ? 2 : 1) : 1;

      this.processClue(currentRoom, bot, clue, count);
    }, 2200);

    this.activeTimeouts.set(room.id, timer);
  }

  scheduleBotGuess(room, bot, initialDelay = 2200) {
    this.clearRoomBotTimers(room.id);

    const timer = setTimeout(() => {
      const currentRoom = this.getRoom(room.id);
      if (!currentRoom || currentRoom.status !== 'playing' || currentRoom.turnPhase !== 'guess') return;

      // Unrevealed cards
      const unrevealed = currentRoom.board.filter(c => !c.revealed);
      if (unrevealed.length === 0) return;

      // Check if human teammate has already selected a card
      const teammateSelected = unrevealed.find(c => c.selectedBy && c.selectedBy.length > 0);

      let chosenCard = null;

      if (teammateSelected) {
        // Support and confirm teammate's choice
        chosenCard = teammateSelected;
      } else {
        const myCards = unrevealed.filter(c => c.type === bot.team);
        const neutrals = unrevealed.filter(c => c.type === 'neutral');
        const opponents = unrevealed.filter(c => c.type !== bot.team && c.type !== 'neutral' && c.type !== 'assassin');
        const assassin = unrevealed.find(c => c.type === 'assassin');

        const rand = Math.random();

        // Bot accuracy: 78% correct team card, 16% neutral, 6% opponent
        if (myCards.length > 0 && rand < 0.78) {
          chosenCard = myCards[Math.floor(Math.random() * myCards.length)];
        } else if (neutrals.length > 0 && rand < 0.94) {
          chosenCard = neutrals[Math.floor(Math.random() * neutrals.length)];
        } else if (opponents.length > 0) {
          chosenCard = opponents[Math.floor(Math.random() * opponents.length)];
        } else if (myCards.length > 0) {
          chosenCard = myCards[0];
        } else {
          chosenCard = assassin || unrevealed[0];
        }
      }

      if (!chosenCard) return;

      // Step 1: Bot selects card (adds its token)
      this.selectCard(currentRoom, bot, chosenCard.id);

      // Step 2: After short delay, bot confirms choice
      const confirmTimer = setTimeout(() => {
        const r2 = this.getRoom(room.id);
        if (!r2 || r2.status !== 'playing' || r2.turnPhase !== 'guess') return;

        const targetCard = r2.board.find(c => c.id === chosenCard.id);
        if (!targetCard || targetCard.revealed) return;

        this.confirmCard(r2, bot, chosenCard.id);

        // Small chance to pass or play safe after confirmation
        const passTimer = setTimeout(() => {
          const r3 = this.getRoom(room.id);
          if (r3 && r3.status === 'playing' && r3.turnPhase === 'guess' && r3.currentTurn === bot.team) {
            if (Math.random() < 0.35) {
              this.endTurn(r3, bot);
            }
          }
        }, 1500);

        this.activeTimeouts.set(room.id, passTimer);
      }, 1400);

      this.activeTimeouts.set(room.id, confirmTimer);
    }, initialDelay);

    this.activeTimeouts.set(room.id, timer);
  }
}

module.exports = {
  createBot,
  BotManager
};
