import type { DatabaseSync } from 'node:sqlite';
import {
  CLAN_DESCRIPTION_MAX,
  CLAN_MAX_MEMBERS,
  CLAN_NAME_LIMITS,
  ClanDetail,
  ClanMember,
  ClanRole,
  ClanSummary,
  PLAYER_COLORS,
  Period,
  PlayerColor,
  RankedClan,
} from '@hunt/shared';
import { publicId } from '../domain/ids';

const TAG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const LIST_SIZE = 20;

/** Rule violations; `status` maps to the HTTP response. */
export class ClanError extends Error {
  constructor(readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

export interface ClanInput {
  name?: unknown;
  description?: unknown;
  color?: unknown;
}

interface ClanRow {
  id: number;
  tag: string;
  name: string;
  color: PlayerColor;
  description: string;
  created_at: number;
  memberCount: number;
  points: number;
}

/** Points = 3 per win + 1 per catch by current members, for games that ended since `since`. */
const CLAN_COLUMNS = `
  c.id, c.tag, c.name, c.color, c.description, c.created_at,
  (SELECT COUNT(*) FROM clan_members m WHERE m.clan_id = c.id) AS memberCount,
  COALESCE((SELECT SUM(gp.won * 3 + gp.catches)
            FROM clan_members m JOIN game_players gp ON gp.player_id = m.player_id JOIN games g ON g.id = gp.game_id
            WHERE m.clan_id = c.id AND g.ended_at >= ?), 0) AS points`;

export class ClanRepository {
  constructor(private db: DatabaseSync, private now: () => number = Date.now) {}

  /** Share code of the player's clan, if any (shown next to their name in games). */
  tagOf(playerId: string): string | null {
    return this.membership(playerId)?.tag ?? null;
  }

  myClan(playerId: string): ClanDetail | null {
    const m = this.membership(playerId);
    return m ? this.detail(m.tag, playerId) : null;
  }

  create(playerId: string, input: ClanInput): ClanDetail {
    if (this.membership(playerId)) throw new ClanError(409, 'Leave your clan before creating a new one');
    const name = cleanName(input.name);
    const description = cleanDescription(input.description);
    const color = cleanColor(input.color);
    return this.transaction(() => {
      let tag: string;
      do tag = randomTag();
      while (this.db.prepare('SELECT 1 FROM clans WHERE tag = ?').get(tag));
      try {
        this.db
          .prepare('INSERT INTO clans (tag, name, description, color, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(tag, name, description, color, this.now());
      } catch (e) {
        if (String(e).includes('clans.name')) throw new ClanError(409, 'That clan name is taken');
        throw e;
      }
      const { id } = this.db.prepare('SELECT id FROM clans WHERE tag = ?').get(tag) as { id: number };
      this.addMember(id, playerId, 'owner');
      return this.detail(tag, playerId)!;
    });
  }

  join(playerId: string, rawTag: unknown): ClanDetail {
    const tag = String(rawTag ?? '').trim().toUpperCase();
    const current = this.membership(playerId);
    if (current?.tag === tag) return this.detail(tag, playerId)!;
    if (current) throw new ClanError(409, 'Leave your clan before joining another');
    const clan = this.row(tag);
    if (!clan) throw new ClanError(404, 'No clan with that code');
    if (clan.memberCount >= CLAN_MAX_MEMBERS) throw new ClanError(409, 'That clan is full');
    this.addMember(clan.id, playerId, 'member');
    return this.detail(tag, playerId)!;
  }

  /** Owner leaving hands the clan to the longest-standing member; the last one out deletes it. */
  leave(playerId: string) {
    const m = this.membership(playerId);
    if (!m) throw new ClanError(404, 'You are not in a clan');
    this.transaction(() => {
      this.db.prepare('DELETE FROM clan_members WHERE player_id = ?').run(playerId);
      const next = this.db
        .prepare('SELECT player_id FROM clan_members WHERE clan_id = ? ORDER BY joined_at, rowid LIMIT 1')
        .get(m.clan_id) as { player_id: string } | undefined;
      if (!next) this.db.prepare('DELETE FROM clans WHERE id = ?').run(m.clan_id);
      else if (m.role === 'owner')
        this.db.prepare("UPDATE clan_members SET role = 'owner' WHERE player_id = ?").run(next.player_id);
    });
  }

  removeMember(ownerId: string, memberPublicId: string): ClanDetail {
    const m = this.requireOwner(ownerId);
    if (memberPublicId === publicId(ownerId)) throw new ClanError(400, 'Use Leave clan to leave your own clan');
    const ids = this.db.prepare('SELECT player_id FROM clan_members WHERE clan_id = ?').all(m.clan_id) as { player_id: string }[];
    const target = ids.find(r => publicId(r.player_id) === memberPublicId);
    if (!target) throw new ClanError(404, 'That player is not in your clan');
    this.db.prepare('DELETE FROM clan_members WHERE player_id = ?').run(target.player_id);
    return this.detail(m.tag, ownerId)!;
  }

  update(ownerId: string, input: ClanInput): ClanDetail {
    const m = this.requireOwner(ownerId);
    const current = this.row(m.tag)!;
    const name = input.name === undefined ? current.name : cleanName(input.name);
    const description = input.description === undefined ? current.description : cleanDescription(input.description);
    const color = input.color === undefined ? current.color : cleanColor(input.color);
    try {
      this.db.prepare('UPDATE clans SET name = ?, description = ?, color = ? WHERE id = ?').run(name, description, color, m.clan_id);
    } catch (e) {
      if (String(e).includes('clans.name')) throw new ClanError(409, 'That clan name is taken');
      throw e;
    }
    return this.detail(m.tag, ownerId)!;
  }

  detail(rawTag: string, viewerId?: string): ClanDetail | null {
    const clan = this.row(rawTag.toUpperCase());
    if (!clan) return null;
    const members = this.db
      .prepare(
        `SELECT m.player_id, m.role, COALESCE(p.name, 'Player') AS name, COALESCE(p.color, ?) AS color,
                COUNT(gp.game_id) AS games, COALESCE(SUM(gp.won), 0) AS wins, COALESCE(SUM(gp.catches), 0) AS catches
         FROM clan_members m LEFT JOIN players p ON p.id = m.player_id LEFT JOIN game_players gp ON gp.player_id = m.player_id
         WHERE m.clan_id = ? GROUP BY m.player_id
         ORDER BY m.role = 'owner' DESC, wins * 3 + catches DESC, name`,
      )
      .all(PLAYER_COLORS[0], clan.id) as { player_id: string; role: ClanRole; name: string; color: PlayerColor; games: number; wins: number; catches: number }[];
    const roster: ClanMember[] = members.map(r => ({
      id: publicId(r.player_id),
      name: r.name,
      color: r.color,
      role: r.role,
      games: r.games,
      wins: r.wins,
      catches: r.catches,
      isMe: r.player_id === viewerId,
    }));
    const viewer = viewerId ? this.membership(viewerId) : null;
    return {
      ...summary(clan),
      description: clan.description,
      createdAt: clan.created_at,
      games: roster.reduce((n, r) => n + r.games, 0),
      wins: roster.reduce((n, r) => n + r.wins, 0),
      roster,
      myRole: viewer?.clan_id === clan.id ? viewer.role : null,
      inOtherClan: !!viewer && viewer.clan_id !== clan.id,
    };
  }

  /** By name (contains) or exact share code. */
  search(rawQuery: unknown): ClanSummary[] {
    const q = String(rawQuery ?? '').trim().slice(0, 30);
    if (!q) return [];
    const like = `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`;
    return (
      this.db
        .prepare(
          `SELECT ${CLAN_COLUMNS} FROM clans c
           WHERE c.name LIKE ? ESCAPE '\\' OR c.tag = ?
           ORDER BY c.tag = ? DESC, points DESC, c.name LIMIT ?`,
        )
        .all(0, like, q.toUpperCase(), q.toUpperCase(), LIST_SIZE) as unknown as ClanRow[]
    ).map(summary);
  }

  top(period: Period, viewerId?: string): RankedClan[] {
    const since = period === 'week' ? this.now() - WEEK_MS : 0;
    const mine = viewerId ? this.membership(viewerId)?.clan_id : undefined;
    const rows = this.db
      .prepare(`SELECT ${CLAN_COLUMNS} FROM clans c ORDER BY points DESC, memberCount DESC, c.name LIMIT ?`)
      .all(since, LIST_SIZE) as unknown as ClanRow[];
    return rows.map((r, i) => ({ ...summary(r), rank: i + 1, isMine: r.id === mine }));
  }

  private row(tag: string): ClanRow | undefined {
    return this.db.prepare(`SELECT ${CLAN_COLUMNS} FROM clans c WHERE c.tag = ?`).get(0, tag) as unknown as ClanRow | undefined;
  }

  private membership(playerId: string) {
    return this.db
      .prepare('SELECT m.clan_id, m.role, c.tag FROM clan_members m JOIN clans c ON c.id = m.clan_id WHERE m.player_id = ?')
      .get(playerId) as { clan_id: number; role: ClanRole; tag: string } | undefined;
  }

  private requireOwner(playerId: string) {
    const m = this.membership(playerId);
    if (!m) throw new ClanError(404, 'You are not in a clan');
    if (m.role !== 'owner') throw new ClanError(403, 'Only the clan owner can do that');
    return m;
  }

  private addMember(clanId: number, playerId: string, role: ClanRole) {
    this.db
      .prepare('INSERT INTO clan_members (player_id, clan_id, role, joined_at) VALUES (?, ?, ?, ?)')
      .run(playerId, clanId, role, this.now());
  }

  private transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

function summary(r: ClanRow): ClanSummary {
  return { tag: r.tag, name: r.name, color: r.color, memberCount: r.memberCount, points: r.points };
}

function randomTag() {
  return Array.from({ length: 6 }, () => TAG_ALPHABET[Math.floor(Math.random() * TAG_ALPHABET.length)]).join('');
}

function cleanName(v: unknown): string {
  const name = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  const [min, max] = CLAN_NAME_LIMITS;
  if (name.length < min || name.length > max) throw new ClanError(400, `Clan name must be ${min}–${max} characters`);
  return name;
}

function cleanDescription(v: unknown): string {
  const d = typeof v === 'string' ? v.trim() : '';
  if (d.length > CLAN_DESCRIPTION_MAX) throw new ClanError(400, `Description can be at most ${CLAN_DESCRIPTION_MAX} characters`);
  return d;
}

function cleanColor(v: unknown): PlayerColor {
  if (v === undefined) return PLAYER_COLORS[0];
  if (!PLAYER_COLORS.includes(v as PlayerColor)) throw new ClanError(400, 'Unknown colour');
  return v as PlayerColor;
}
