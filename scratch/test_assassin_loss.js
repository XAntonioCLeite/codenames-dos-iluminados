const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3333';

async function testAssassinLossMechanic() {
  console.log('Testing that revealing the Assassin card immediately triggers victory for the opposing team...');

  const spymasterSocket = io(SOCKET_URL);
  const operativeSocket = io(SOCKET_URL);

  let roomId = null;
  let clickedAssassin = false;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout in test')), 12000);

    spymasterSocket.on('connect', () => {
      spymasterSocket.emit('CREATE_ROOM', { nickname: 'HostSpy' });
    });

    spymasterSocket.on('ROOM_STATE_UPDATE', (state) => {
      if (state.status === 'lobby') {
        if (!roomId) {
          roomId = state.roomId;
          operativeSocket.emit('JOIN_ROOM', { roomId, nickname: 'AgenteRed' });
        } else if (state.players.some(p => p.name === 'AgenteRed') && !state.players.some(p => p.isBot)) {
          spymasterSocket.emit('SET_TEAM_ROLE', { team: 'red', role: 'spymaster' });
          operativeSocket.emit('SET_TEAM_ROLE', { team: 'red', role: 'operative' });
          spymasterSocket.emit('FILL_WITH_BOTS');
        } else if (state.players.some(p => p.isBot)) {
          spymasterSocket.emit('START_GAME');
        }
      } else if (state.status === 'playing') {
        const assassinCard = state.board.find(c => c.type === 'assassin');
        if (!assassinCard) return;

        if (state.currentTurn === 'red' && state.turnPhase === 'clue') {
          spymasterSocket.emit('GIVE_CLUE', { word: 'PERIGO', count: 1 });
        } else if (state.currentTurn === 'red' && state.turnPhase === 'guess' && !clickedAssassin) {
          clickedAssassin = true;
          console.log(`Operative clicking Assassin card "${assassinCard.word}" (ID: ${assassinCard.id})...`);
          operativeSocket.emit('SELECT_CARD', { cardId: assassinCard.id });
          setTimeout(() => {
            operativeSocket.emit('CONFIRM_CARD', { cardId: assassinCard.id });
          }, 100);
        }
      }

      if (state.winner) {
        console.log(`\nGame ended! Winner: ${state.winner}, Win Reason: "${state.winReason}"`);
        if (state.winner === 'blue' && state.winReason === 'assassin') {
          console.log('✓ SUCCESS: Red operative confirmed the Assassin card, Blue won immediately!');
          clearTimeout(timeout);
          resolve();
        } else {
          reject(new Error(`Unexpected winner=${state.winner}, reason=${state.winReason}`));
        }
      }
    });
  });

  spymasterSocket.disconnect();
  operativeSocket.disconnect();
  console.log('\n======================================================');
  console.log('ALL ASSASSIN LOSS & VICTORY MECHANICS VERIFIED!');
  console.log('======================================================\n');
  process.exit(0);
}

testAssassinLossMechanic().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
