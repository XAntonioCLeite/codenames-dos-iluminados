const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3333';

async function testSpymasterAssassinCard() {
  console.log('Testing Spymaster & Operative board state regarding Assassin card...');

  const spymasterSocket = io(SOCKET_URL);
  const operativeSocket = io(SOCKET_URL);

  let roomId = null;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout in test')), 12000);

    spymasterSocket.on('connect', () => {
      spymasterSocket.emit('CREATE_ROOM', { nickname: 'MestreSpymaster' });
    });

    spymasterSocket.on('ERROR', (err) => {
      console.error('Spymaster socket error:', err);
    });

    spymasterSocket.on('ROOM_STATE_UPDATE', (state) => {
      if (state.status === 'lobby') {
        if (!roomId) {
          roomId = state.roomId;
          console.log(`Room created: ${roomId}`);
          operativeSocket.emit('JOIN_ROOM', { roomId, nickname: 'AgenteOperative' });
        } else if (state.players.some(p => p.name === 'AgenteOperative') && !state.players.some(p => p.isBot)) {
          // Both humans are in, assign roles and fill with bots
          spymasterSocket.emit('SET_TEAM_ROLE', { team: 'red', role: 'spymaster' });
          operativeSocket.emit('SET_TEAM_ROLE', { team: 'red', role: 'operative' });
          spymasterSocket.emit('FILL_WITH_BOTS');
        } else if (state.players.some(p => p.isBot)) {
          // Bots are filled, verify roles exist
          const redSpy = state.players.find(p => p.team === 'red' && p.role === 'spymaster');
          const blueSpy = state.players.find(p => p.team === 'blue' && p.role === 'spymaster');
          const redOp = state.players.find(p => p.team === 'red' && p.role === 'operative');
          const blueOp = state.players.find(p => p.team === 'blue' && p.role === 'operative');

          if (redSpy && blueSpy && redOp && blueOp) {
            console.log('All roles filled! Emitting START_GAME...');
            spymasterSocket.emit('START_GAME');
          }
        }
      } else if (state.status === 'playing') {
        console.log('Game is playing! state.you is:', state.you);
        console.log('Board types received:', state.board.map(c => c.type));
        const spyBoard = state.board;
        const assassinCard = spyBoard.find(c => c.type === 'assassin');

        if (!assassinCard) {
          reject(new Error('FAIL: Assassin card not found with type === "assassin" for spymaster!'));
          return;
        }

        console.log(`✓ Spymaster sees Assassin card! Word: "${assassinCard.word}", Type: "${assassinCard.type}"`);

        // Check counts
        const redCards = spyBoard.filter(c => c.type === 'red').length;
        const blueCards = spyBoard.filter(c => c.type === 'blue').length;
        const neutralCards = spyBoard.filter(c => c.type === 'neutral').length;
        const assassinCards = spyBoard.filter(c => c.type === 'assassin').length;

        console.log(`✓ Board counts: Red=${redCards}, Blue=${blueCards}, Neutral=${neutralCards}, Assassin=${assassinCards}`);

        if (assassinCards !== 1) {
          reject(new Error(`FAIL: Expected 1 assassin card, found ${assassinCards}`));
          return;
        }

        clearTimeout(timeout);
        resolve();
      }
    });
  });

  spymasterSocket.disconnect();
  operativeSocket.disconnect();
  console.log('\n======================================================');
  console.log('TEST PASSED: Spymaster Keycard & Assassin Card verified!');
  console.log('======================================================\n');
  process.exit(0);
}

testSpymasterAssassinCard().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
