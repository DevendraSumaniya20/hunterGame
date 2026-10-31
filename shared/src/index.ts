// Contracts shared by server and app. Keep this file free of runtime dependencies.

export type Role = 'hunter' | 'runner' | 'helper';
export type Phase = 'lobby' | 'headstart' | 'chase' | 'ended';
export type Winner = 'hunters' | 'runners';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GameSettings {
  headStartSec: number;
  durationSec: number;
  catchRadiusM: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  headStartSec: 60,
  durationSec: 600,
  catchRadiusM: 15,
};

export const SETTINGS_LIMITS: Record<keyof GameSettings, [number, number]> = {
  headStartSec: [5, 600],
  durationSec: [30, 3600],
  catchRadiusM: [3, 100],
};

/** Pin colours a player can pick in their profile. */
export const PLAYER_COLORS = ['#007AFF', '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00', '#8E8E93'] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];
export const DEFAULT_COLOR: PlayerColor = PLAYER_COLORS[0];

export interface PlayerView {
  /** Public id: safe to share. A player's own secret id never leaves their device and the server. */
  id: string;
  name: string;
  color: PlayerColor;
  /** clan share code, shown next to the name */
  clanTag: string | null;
  role: Role;
  connected: boolean;
  /** null when the viewer is not allowed to see this player, or no fix yet */
  location: LatLng | null;
}

export interface CatchEvent {
  runnerId: string;
  runnerName: string;
  byId: string;
  byName: string;
  at: number;
}

/** What one player is allowed to see of a room. Built per viewer on the server. */
export interface RoomView {
  code: string;
  hostId: string;
  me: string;
  phase: Phase;
  settings: GameSettings;
  players: PlayerView[];
  /** epoch ms when the current phase ends (headstart/chase), else null */
  phaseEndsAt: number | null;
  winner: Winner | null;
  catches: CatchEvent[];
  /** runners only: metres to closest hunter-team player, null if unknown */
  nearestHunterM: number | null;
}

// ---- Team chat ----

export type Team = 'hunters' | 'runners';
export const CHAT_MAX_LENGTH = 300;

export interface ChatMessage {
  id: string;
  team: Team;
  /** public id of the sender */
  fromId: string;
  name: string;
  color: PlayerColor;
  text: string;
  at: number;
}

export type Ack<T = undefined> = (res: { ok: true; data: T } | { ok: false; error: string }) => void;

export interface ClientToServerEvents {
  'room:create': (
    p: { name: string; color?: PlayerColor; settings?: Partial<GameSettings> },
    ack: Ack<RoomView>,
  ) => void;
  'room:join': (p: { code: string; name: string; color?: PlayerColor }, ack: Ack<RoomView>) => void;
  'room:leave': () => void;
  'game:start': (ack: Ack) => void;
  'location:update': (p: LatLng) => void;
  'chat:send': (p: { text: string }, ack: Ack<ChatMessage>) => void;
  /** messages of the caller's current team */
  'chat:history': (ack: Ack<{ team: Team; messages: ChatMessage[] }>) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'room:closed': (reason: string) => void;
  'game:caught': (e: CatchEvent) => void;
  /** only delivered to players on the message's team */
  'chat:message': (m: ChatMessage) => void;
  /** Sent on every connect: the room this player is in, or null (e.g. after a server restart). */
  session: (p: { roomCode: string | null }) => void;
}

// ---- REST API (/api) ----

export interface PlayerStats {
  games: number;
  wins: number;
  catches: number;
  timesCaught: number;
  /** longest time survived as a runner during the chase, seconds */
  bestSurvivalSec: number;
}

export interface Profile {
  name: string;
  color: PlayerColor;
  stats: PlayerStats;
}

/** One past game, from the requesting player's point of view. */
export interface GameSummary {
  id: number;
  endedAt: number;
  winner: Winner;
  startRole: 'hunter' | 'runner';
  finalRole: Role;
  won: boolean;
  catches: number;
  caughtBy: string | null;
  survivalSec: number | null;
  players: number;
}

export interface GameDetail extends GameSummary {
  settings: GameSettings;
  durationSec: number;
  timeline: { at: number; runnerName: string; byName: string }[];
  roster: { name: string; color: PlayerColor; startRole: 'hunter' | 'runner'; finalRole: Role; catches: number; isMe: boolean }[];
}

export type Board = 'hunters' | 'survivors';
export type Period = 'week' | 'all';

export interface LeaderboardRow {
  rank: number;
  name: string;
  color: PlayerColor;
  /** hunters: total catches; survivors: games escaped */
  value: number;
  games: number;
  isMe: boolean;
}

// ---- Clans ----

export const CLAN_MAX_MEMBERS = 30;
export const CLAN_NAME_LIMITS: [number, number] = [3, 24];
export const CLAN_DESCRIPTION_MAX = 120;

export type ClanRole = 'owner' | 'member';

export interface ClanSummary {
  /** 6-character share code */
  tag: string;
  name: string;
  color: PlayerColor;
  memberCount: number;
  /** 3 per win + 1 per catch by current members in the period */
  points: number;
}

export interface ClanMember {
  /** public id, used to remove a member */
  id: string;
  name: string;
  color: PlayerColor;
  role: ClanRole;
  games: number;
  wins: number;
  catches: number;
  isMe: boolean;
}

export interface ClanDetail extends ClanSummary {
  description: string;
  createdAt: number;
  games: number;
  wins: number;
  roster: ClanMember[];
  /** viewer's role in this clan, null if not a member */
  myRole: ClanRole | null;
  /** viewer is in another clan, so cannot join this one */
  inOtherClan: boolean;
}

export interface RankedClan extends ClanSummary {
  rank: number;
  isMine: boolean;
}

/** Sent in socket.io handshake `auth` so a reconnect keeps the same seat. */
export interface HandshakeAuth {
  playerId: string;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export const isHunterTeam = (role: Role) => role !== 'runner';
export const teamOf = (role: Role): Team => (isHunterTeam(role) ? 'hunters' : 'runners');
