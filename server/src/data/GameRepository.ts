import type { DatabaseSync } from 'node:sqlite';
import {
  Board,
  DEFAULT_COLOR,
  GameDetail,
  GameSettings,
  GameSummary,
  LeaderboardRow,
  Period,
  PlayerColor,
  PlayerStats,
  Profile,
  Role,
  Winner,
  isHunterTeam,
} from '@hunt/shared';
import type { Room } from '../domain/Room';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LEADERBOARD_SIZE = 20;

interface PlayerRow {
  game_id: number;
  name: string;
  color: PlayerColor;
  start_role: 'hunter' | 'runner';
  final_role: Role;
  catches: number;
  caught_by: string | null;
  survival_sec: number | null;
  won: number;
}

interface SummaryRow extends PlayerRow {
  ended_at: number;
  winner: Winner;
  players: number;
}

/** All persistence: finished games, per-player results, profiles. */
export class GameRepository {
  constructor(private db: DatabaseSync, private now: () => number = Date.now) {}

  /** Stores a finished game and refreshes each player's profile name/colour. Returns the game id. */
  saveGame(room: Room): number {
    const endedAt = this.now();
    const chase = room.chaseStartedAt;
    const winner = room.winner!;
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO games (code, winner, settings, timeline, chase_started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        room.code,
        winner,
        JSON.stringify(room.settings),
        JSON.stringify(room.catches.map(c => ({ at: c.at, runnerName: c.runnerName, byName: c.byName }))),
        chase,
        endedAt,
      );
    const gameId = Number(lastInsertRowid);

    const insert = this.db.prepare(
      `INSERT INTO game_players (game_id, player_id, name, color, start_role, final_role, catches, caught_by, survival_sec, won)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const upsertProfile = this.db.prepare(
      `INSERT INTO players (id, name, color, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, updated_at = excluded.updated_at`,
    );
    for (const p of room.players.values()) {
      const startRole = p.id === room.hostId ? 'hunter' : 'runner';
      const caught = room.catches.find(c => c.runnerId === p.id);
      const survivalSec =
        startRole === 'runner' && chase !== null ? Math.round(((caught?.at ?? endedAt) - chase) / 1000) : null;
      const won = isHunterTeam(p.role) === (winner === 'hunters');
      insert.run(
        gameId,
        p.id,
        p.name,
        p.color,
        startRole,
        p.role,
        room.catches.filter(c => c.byId === p.id).length,
        caught?.byName ?? null,
        survivalSec,
        won ? 1 : 0,
      );
      upsertProfile.run(p.id, p.name, p.color, endedAt);
    }
    return gameId;
  }

  history(playerId: string, limit = 50, offset = 0): GameSummary[] {
    const rows = this.db
      .prepare(
        `SELECT gp.*, g.ended_at, g.winner, (SELECT COUNT(*) FROM game_players x WHERE x.game_id = g.id) AS players
         FROM game_players gp JOIN games g ON g.id = gp.game_id
         WHERE gp.player_id = ? ORDER BY g.ended_at DESC, g.id DESC LIMIT ? OFFSET ?`,
      )
      .all(playerId, limit, offset) as unknown as SummaryRow[];
    return rows.map(toSummary);
  }

  /** Only players who took part can open a game. */
  gameDetail(playerId: string, gameId: number): GameDetail | null {
    const me = this.db
      .prepare(
        `SELECT gp.*, g.ended_at, g.winner, (SELECT COUNT(*) FROM game_players x WHERE x.game_id = g.id) AS players
         FROM game_players gp JOIN games g ON g.id = gp.game_id WHERE gp.player_id = ? AND gp.game_id = ?`,
      )
      .get(playerId, gameId) as unknown as SummaryRow | undefined;
    if (!me) return null;
    const game = this.db
      .prepare('SELECT settings, timeline, chase_started_at, ended_at FROM games WHERE id = ?')
      .get(gameId) as { settings: string; timeline: string; chase_started_at: number | null; ended_at: number };
    const roster = this.db
      .prepare('SELECT * FROM game_players WHERE game_id = ? ORDER BY start_role, catches DESC, name')
      .all(gameId) as unknown as (PlayerRow & { player_id: string })[];
    return {
      ...toSummary(me),
      settings: JSON.parse(game.settings) as GameSettings,
      durationSec: game.chase_started_at ? Math.round((game.ended_at - game.chase_started_at) / 1000) : 0,
      timeline: JSON.parse(game.timeline),
      roster: roster.map(r => ({
        name: r.name,
        color: r.color,
        startRole: r.start_role,
        finalRole: r.final_role,
        catches: r.catches,
        isMe: r.player_id === playerId,
      })),
    };
  }

  stats(playerId: string): PlayerStats {
    const r = this.db
      .prepare(
        `SELECT COUNT(*) AS games, COALESCE(SUM(won), 0) AS wins, COALESCE(SUM(catches), 0) AS catches,
                COALESCE(SUM(caught_by IS NOT NULL), 0) AS timesCaught, COALESCE(MAX(survival_sec), 0) AS bestSurvivalSec
         FROM game_players WHERE player_id = ?`,
      )
      .get(playerId) as unknown as PlayerStats;
    return { ...r };
  }

  profile(playerId: string): Profile {
    const row = this.db.prepare('SELECT name, color FROM players WHERE id = ?').get(playerId) as
      | { name: string; color: PlayerColor }
      | undefined;
    return { name: row?.name ?? '', color: row?.color ?? DEFAULT_COLOR, stats: this.stats(playerId) };
  }

  saveProfile(playerId: string, name: string, color: PlayerColor) {
    this.db
      .prepare(
        `INSERT INTO players (id, name, color, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, updated_at = excluded.updated_at`,
      )
      .run(playerId, name, color, this.now());
  }

  leaderboard(board: Board, period: Period, me?: string): LeaderboardRow[] {
    const since = period === 'week' ? this.now() - WEEK_MS : 0;
    const value =
      board === 'hunters'
        ? 'SUM(gp.catches)'
        : "SUM(gp.start_role = 'runner' AND gp.caught_by IS NULL AND gp.survival_sec IS NOT NULL)";
    const rows = this.db
      .prepare(
        `SELECT gp.player_id, COALESCE(p.name, MAX(gp.name)) AS name, COALESCE(p.color, MAX(gp.color)) AS color,
                ${value} AS value, COUNT(*) AS games
         FROM game_players gp JOIN games g ON g.id = gp.game_id LEFT JOIN players p ON p.id = gp.player_id
         WHERE g.ended_at >= ?
         GROUP BY gp.player_id HAVING value > 0
         ORDER BY value DESC, games ASC, name ASC LIMIT ?`,
      )
      .all(since, LEADERBOARD_SIZE) as unknown as { player_id: string; name: string; color: PlayerColor; value: number; games: number }[];
    return rows.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      color: r.color,
      value: r.value,
      games: r.games,
      isMe: r.player_id === me,
    }));
  }
}

function toSummary(r: SummaryRow): GameSummary {
  return {
    id: r.game_id,
    endedAt: r.ended_at,
    winner: r.winner,
    startRole: r.start_role,
    finalRole: r.final_role,
    won: r.won === 1,
    catches: r.catches,
    caughtBy: r.caught_by,
    survivalSec: r.survival_sec,
    players: r.players,
  };
}
