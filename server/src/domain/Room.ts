import {
  CHAT_MAX_LENGTH,
  CatchEvent,
  ChatMessage,
  DEFAULT_COLOR,
  DEFAULT_SETTINGS,
  GameSettings,
  LatLng,
  Phase,
  PlayerColor,
  Role,
  RoomView,
  Team,
  Winner,
  distanceM,
  isHunterTeam,
  teamOf,
} from '@hunt/shared';

export const MAX_PLAYERS = 20;
const CHAT_HISTORY = 100;
/** at most CHAT_BURST messages per player within CHAT_WINDOW_MS */
const CHAT_BURST = 5;
const CHAT_WINDOW_MS = 5_000;

export class GameError extends Error {}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  clanTag: string | null;
  role: Role;
  connected: boolean;
  location: LatLng | null;
}

/** Pure game rules. No sockets, no timers: callers pass `now` and schedule phase changes. */
export class Room {
  readonly players = new Map<string, Player>();
  phase: Phase = 'lobby';
  phaseEndsAt: number | null = null;
  winner: Winner | null = null;
  catches: CatchEvent[] = [];
  /** epoch ms the chase began, for survival times; null until then */
  chaseStartedAt: number | null = null;
  /** Separate logs so a team never sees the other team's messages. fromId holds the secret id. */
  private chat: Record<Team, ChatMessage[]> = { hunters: [], runners: [] };
  private chatTimes = new Map<string, number[]>();
  private chatSeq = 0;

  constructor(
    readonly code: string,
    readonly hostId: string,
    hostName: string,
    readonly settings: GameSettings = DEFAULT_SETTINGS,
    hostColor: PlayerColor = DEFAULT_COLOR,
    hostClanTag: string | null = null,
  ) {
    this.players.set(hostId, {
      id: hostId,
      name: hostName,
      color: hostColor,
      clanTag: hostClanTag,
      role: 'hunter',
      connected: true,
      location: null,
    });
  }

  get runners() {
    return [...this.players.values()].filter(p => p.role === 'runner');
  }

  /** Adds a runner, or reconnects an existing player with the same id. */
  join(id: string, name: string, color: PlayerColor = DEFAULT_COLOR, clanTag: string | null = null) {
    const existing = this.players.get(id);
    if (existing) {
      existing.connected = true;
      return;
    }
    if (this.phase !== 'lobby') throw new GameError('Game already started');
    if (this.players.size >= MAX_PLAYERS) throw new GameError('Room is full');
    this.players.set(id, { id, name, color, clanTag, role: 'runner', connected: true, location: null });
  }

  setConnected(id: string, connected: boolean) {
    const p = this.players.get(id);
    if (p) p.connected = connected;
  }

  leave(id: string) {
    this.players.delete(id);
    const inGame = this.phase === 'headstart' || this.phase === 'chase';
    if (inGame && this.runners.length === 0) this.end('hunters');
  }

  start(byId: string, now: number) {
    if (byId !== this.hostId) throw new GameError('Only the host can start');
    if (this.phase !== 'lobby') throw new GameError('Game already started');
    if (this.runners.length === 0) throw new GameError('Need at least one runner');
    this.phase = 'headstart';
    this.phaseEndsAt = now + this.settings.headStartSec * 1000;
  }

  /** Head start over. Returns catches made by players already standing together. */
  beginChase(now: number): CatchEvent[] {
    if (this.phase !== 'headstart') return [];
    this.phase = 'chase';
    this.chaseStartedAt = now;
    this.phaseEndsAt = now + this.settings.durationSec * 1000;
    return this.resolveCatches(now);
  }

  timeUp() {
    if (this.phase === 'chase') this.end(this.runners.length ? 'runners' : 'hunters');
  }

  updateLocation(id: string, location: LatLng, now: number): CatchEvent[] {
    const p = this.players.get(id);
    if (!p || this.phase === 'ended') return [];
    p.location = location;
    return this.phase === 'chase' ? this.resolveCatches(now) : [];
  }

  private resolveCatches(now: number): CatchEvent[] {
    const hunters = [...this.players.values()].filter(p => isHunterTeam(p.role) && p.location);
    const caught: CatchEvent[] = [];
    for (const runner of this.runners) {
      if (!runner.location) continue;
      const by = hunters.find(h => distanceM(h.location!, runner.location!) <= this.settings.catchRadiusM);
      if (!by) continue;
      runner.role = 'helper';
      const e = { runnerId: runner.id, runnerName: runner.name, byId: by.id, byName: by.name, at: now };
      caught.push(e);
      this.catches.push(e);
    }
    if (this.runners.length === 0) this.end('hunters');
    return caught;
  }

  private end(winner: Winner) {
    this.phase = 'ended';
    this.phaseEndsAt = null;
    this.winner = winner;
  }

  /** Team chat: goes to the sender's current team only. Open until the game ends. */
  say(id: string, rawText: unknown, now: number): ChatMessage {
    const p = this.players.get(id);
    if (!p) throw new GameError('Not in this game');
    if (this.phase === 'ended') throw new GameError('Chat is closed, the game is over');
    const text = typeof rawText === 'string' ? rawText.trim().slice(0, CHAT_MAX_LENGTH) : '';
    if (!text) throw new GameError('Message is empty');
    const recent = (this.chatTimes.get(id) ?? []).filter(t => now - t < CHAT_WINDOW_MS);
    if (recent.length >= CHAT_BURST) throw new GameError('Slow down a little');
    this.chatTimes.set(id, [...recent, now]);

    const team = teamOf(p.role);
    const msg = { id: `${now}-${++this.chatSeq}`, team, fromId: id, name: p.name, color: p.color, text, at: now };
    const log = this.chat[team];
    log.push(msg);
    if (log.length > CHAT_HISTORY) log.shift();
    return msg;
  }

  /** The caller's current team and its messages (a caught runner gets the hunters' log). */
  chatFor(id: string): { team: Team; messages: ChatMessage[] } {
    const p = this.players.get(id);
    if (!p) throw new GameError('Not in this game');
    const team = teamOf(p.role);
    return { team, messages: [...this.chat[team]] };
  }

  teamOfPlayer(id: string): Team | null {
    const p = this.players.get(id);
    return p ? teamOf(p.role) : null;
  }

  /** Builds what `viewerId` may see: runners never see other players' positions mid-game. */
  viewFor(viewerId: string): RoomView {
    const viewer = this.players.get(viewerId);
    const viewerIsHunter = !!viewer && isHunterTeam(viewer.role);
    const canSee = (p: Player) =>
      p.id === viewerId ||
      this.phase === 'ended' ||
      (viewerIsHunter && (this.phase === 'chase' || isHunterTeam(p.role)));

    let nearestHunterM: number | null = null;
    if (viewer?.role === 'runner' && viewer.location) {
      for (const p of this.players.values()) {
        if (!isHunterTeam(p.role) || !p.location) continue;
        const d = distanceM(viewer.location, p.location);
        if (nearestHunterM === null || d < nearestHunterM) nearestHunterM = Math.round(d);
      }
    }

    return {
      code: this.code,
      hostId: this.hostId,
      me: viewerId,
      phase: this.phase,
      settings: this.settings,
      players: [...this.players.values()].map(p => ({ ...p, location: canSee(p) ? p.location : null })),
      phaseEndsAt: this.phaseEndsAt,
      winner: this.winner,
      catches: this.catches,
      nearestHunterM,
    };
  }
}
