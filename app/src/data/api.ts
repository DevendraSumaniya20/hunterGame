import type { Board, GameDetail, GameSummary, LeaderboardRow, Period, PlayerColor, Profile } from '@hunt/shared';
import { SERVER_URL } from '../config';
import { playerId } from './socketClient';

const TIMEOUT_MS = 8000;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SERVER_URL}/api${path}`, { ...init, signal: controller.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
    return body as T;
  } catch (e) {
    throw (e as Error).name === 'AbortError' || e instanceof TypeError ? new Error('Can’t reach the game server') : e;
  } finally {
    clearTimeout(timer);
  }
}

const me = () => encodeURIComponent(playerId);

/** REST endpoints for stats, history and leaderboards (live games use the socket). */
export const api = {
  profile: () => call<Profile>(`/players/${me()}`),
  saveProfile: (name: string, color: PlayerColor) =>
    call<Profile>(`/players/${me()}`, { method: 'PUT', body: JSON.stringify({ name, color }) }),
  history: () => call<GameSummary[]>(`/players/${me()}/games`),
  game: (id: number) => call<GameDetail>(`/players/${me()}/games/${id}`),
  leaderboard: (board: Board, period: Period) =>
    call<LeaderboardRow[]>(`/leaderboard?board=${board}&period=${period}&me=${me()}`),
};
