const path = require('path');
const fs = require('fs');

let sqlite3 = null;
let db = null;
const memoryCustomDecks = new Map();

try {
  sqlite3 = require('sqlite3').verbose();
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (_) {}
  }

  const dbPath = path.join(dataDir, 'codenames.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.warn('Erro ao conectar ao SQLite. Usando fallback em memória:', err.message);
      db = null;
    } else {
      console.log('Banco de dados SQLite inicializado em:', dbPath);
    }
  });

  if (db) {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS custom_decks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          words_json TEXT NOT NULL,
          author TEXT DEFAULT 'Anônimo',
          created_at INTEGER
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS match_history (
          id TEXT PRIMARY KEY,
          room_id TEXT,
          winner TEXT,
          win_reason TEXT,
          rounds_count INTEGER,
          played_at INTEGER
        )
      `);
    });
  }
} catch (err) {
  console.warn('SQLite3 nativo não pôde ser carregado neste ambiente. Operando com armazenamento resiliente em memória.');
  db = null;
}

// Helper functions (Promise-based)
const dbService = {
  getAllCustomDecks() {
    return new Promise((resolve) => {
      if (db) {
        db.all('SELECT * FROM custom_decks ORDER BY created_at DESC', [], (err, rows) => {
          if (err) {
            console.error('Erro na consulta SQLite:', err);
            return resolve(Array.from(memoryCustomDecks.values()));
          }
          const decks = rows.map(r => ({
            id: r.id,
            name: r.name,
            words: JSON.parse(r.words_json || '[]'),
            author: r.author,
            createdAt: r.created_at
          }));
          resolve(decks);
        });
      } else {
        resolve(Array.from(memoryCustomDecks.values()));
      }
    });
  },

  saveCustomDeck(deck) {
    return new Promise((resolve, reject) => {
      memoryCustomDecks.set(deck.id, {
        id: deck.id,
        name: deck.name,
        words: deck.words,
        author: deck.author || 'Anônimo',
        createdAt: deck.createdAt || Date.now()
      });

      if (db) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO custom_decks (id, name, words_json, author, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(
          deck.id,
          deck.name,
          JSON.stringify(deck.words),
          deck.author || 'Anônimo',
          deck.createdAt || Date.now(),
          function (err) {
            if (err) return reject(err);
            resolve({ id: deck.id, changes: this.changes });
          }
        );
        stmt.finalize();
      } else {
        resolve({ id: deck.id, changes: 1 });
      }
    });
  },

  deleteCustomDeck(id) {
    return new Promise((resolve, reject) => {
      memoryCustomDecks.delete(id);
      if (db) {
        db.run('DELETE FROM custom_decks WHERE id = ?', [id], function (err) {
          if (err) return reject(err);
          resolve({ deleted: this.changes });
        });
      } else {
        resolve({ deleted: 1 });
      }
    });
  },

  saveMatch(match) {
    return new Promise((resolve, reject) => {
      if (db) {
        const stmt = db.prepare(`
          INSERT INTO match_history (id, room_id, winner, win_reason, rounds_count, played_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          match.id || ('match_' + Date.now()),
          match.roomId,
          match.winner,
          match.winReason,
          match.roundsCount || 0,
          Date.now(),
          function (err) {
            if (err) return reject(err);
            resolve();
          }
        );
        stmt.finalize();
      } else {
        resolve();
      }
    });
  }
};

module.exports = dbService;
