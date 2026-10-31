import { CatchEvent, DEFAULT_SETTINGS, GameSettings, LatLng, PlayerColor, SETTINGS_LIMITS } from '@hunt/shared';
import { GameError, Room } from '../domain/Room';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid misreads
const ENDED_ROOM_TTL_MS = 10 * 60_000;

export interface RoomHooks {
  onChange(room: Room): void;
  onCatch(room: Room, events: CatchEvent[]): void;
  onClose(room: Room, reason: string): void;
  /** Called once when a game finishes, e.g. to save the result. */
  onEnded?(room: Room): void;
}

/** Owns every live room, the player→room index, and phase timers. */
export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoom = new Map<string, string>();
  private timers = new Map<string, NodeJS.Timeout[]>();
  /** Ended rooms whose expiry timer is already armed, so later events don't push it back. */
  private expiring = new Set<string>();

  constructor(private hooks: RoomHooks, private now: () => number = Date.now) {}

  roomOf(playerId: string): Room | undefined {
    const code = this.playerRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  create(hostId: string, name: string, settings: Partial<GameSettings> = {}, color?: PlayerColor): Room {
    this.leave(hostId);
    let code: string;
    do {
      code = Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, hostId, name, clampSettings(settings), color);
    this.rooms.set(code, room);
    this.playerRoom.set(hostId, code);
    return room;
  }

  join(playerId: string, code: string, name: string, color?: PlayerColor): Room {
    const room = this.rooms.get(code);
    if (!room) throw new GameError('Room not found');
    if (this.roomOf(playerId) !== room) this.leave(playerId);
    room.join(playerId, name, color);
    this.playerRoom.set(playerId, code);
    return room;
  }

  leave(playerId: string) {
    const room = this.roomOf(playerId);
    if (!room) return;
    this.playerRoom.delete(playerId);
    // After the game the host leaving must not wipe everyone else's result screen.
    if (playerId === room.hostId && room.phase !== 'ended') return this.close(room, 'Host left the game');
    room.leave(playerId);
    this.afterChange(room);
  }

  start(playerId: string) {
    const room = this.roomOf(playerId);
    if (!room) throw new GameError('Not in a room');
    room.start(playerId, this.now());
    const { headStartSec, durationSec } = room.settings;
    this.timers.set(room.code, [
      setTimeout(() => {
        const caught = room.beginChase(this.now());
        if (caught.length) this.hooks.onCatch(room, caught);
        this.afterChange(room);
      }, headStartSec * 1000),
      setTimeout(() => {
        room.timeUp();
        this.afterChange(room);
      }, (headStartSec + durationSec) * 1000),
    ].map(t => t.unref()));
    this.hooks.onChange(room);
  }

  updateLocation(playerId: string, location: LatLng) {
    const room = this.roomOf(playerId);
    if (!room || room.phase === 'ended') return;
    const caught = room.updateLocation(playerId, location, this.now());
    if (caught.length) this.hooks.onCatch(room, caught);
    this.afterChange(room);
  }

  setConnected(playerId: string, connected: boolean) {
    const room = this.roomOf(playerId);
    if (!room) return;
    room.setConnected(playerId, connected);
    this.hooks.onChange(room);
  }

  /** Dev-only view of every room, positions included. */
  debugSnapshot() {
    return [...this.rooms.values()].map(r => ({
      code: r.code,
      phase: r.phase,
      winner: r.winner,
      players: [...r.players.values()],
    }));
  }

  private afterChange(room: Room) {
    this.hooks.onChange(room);
    if (room.phase === 'ended' && !this.expiring.has(room.code)) {
      this.clearTimers(room);
      this.expiring.add(room.code);
      this.hooks.onEnded?.(room);
      // Keep the result screen readable for a while, then free memory.
      this.timers.set(room.code, [setTimeout(() => this.close(room, 'Room expired'), ENDED_ROOM_TTL_MS).unref()]);
    }
  }

  private close(room: Room, reason: string) {
    this.clearTimers(room);
    this.expiring.delete(room.code);
    this.rooms.delete(room.code);
    for (const id of room.players.keys()) if (this.playerRoom.get(id) === room.code) this.playerRoom.delete(id);
    this.hooks.onClose(room, reason);
  }

  private clearTimers(room: Room) {
    this.timers.get(room.code)?.forEach(clearTimeout);
    this.timers.delete(room.code);
  }
}

function clampSettings(input: Partial<GameSettings>): GameSettings {
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(SETTINGS_LIMITS) as (keyof GameSettings)[]) {
    const v = input[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const [min, max] = SETTINGS_LIMITS[key];
    out[key] = Math.min(max, Math.max(min, Math.round(v)));
  }
  return out;
}
