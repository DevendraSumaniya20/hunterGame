import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,           -- secret player id from the app
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL,
  winner           TEXT NOT NULL,
  settings         TEXT NOT NULL,        -- JSON GameSettings
  timeline         TEXT NOT NULL,        -- JSON [{ at, runnerName, byName }]
  chase_started_at INTEGER,
  ended_at         INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS game_players (
  game_id      INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL,
  start_role   TEXT NOT NULL,
  final_role   TEXT NOT NULL,
  catches      INTEGER NOT NULL,
  caught_by    TEXT,
  survival_sec INTEGER,                  -- runners only, once the chase started
  won          INTEGER NOT NULL,
  PRIMARY KEY (game_id, player_id)
);
CREATE INDEX IF NOT EXISTS game_players_player ON game_players(player_id);
CREATE INDEX IF NOT EXISTS games_ended_at ON games(ended_at);
`;

/** Opens (and creates if needed) the SQLite database. Use ':memory:' in tests. */
export function openDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}
