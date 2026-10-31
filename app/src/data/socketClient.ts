import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@hunt/shared';
import { SERVER_URL } from '../config';
import { storage } from './storage';

const ID_KEY = 'playerId';

/**
 * Secret id for this install: identifies the player to the server (seat, history, profile).
 * Never shown to other players; the server only shares a hash of it.
 */
export let playerId = '';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  auth: cb => cb({ playerId }),
  transports: ['websocket'],
  autoConnect: false,
});

const MAX_RETRY_MS = 30_000;

/** Asks the server for a new id (made with a cryptographic RNG), retrying with backoff until it answers. */
export async function requestPlayerId(
  wait = (ms: number) => new Promise<void>(r => setTimeout(() => r(), ms)),
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${SERVER_URL}/api/players`, { method: 'POST' });
      if (res.ok) return ((await res.json()) as { id: string }).id;
    } catch {
      // offline or server down: keep trying, the app shows "Connecting…" meanwhile
    }
    await wait(Math.min(MAX_RETRY_MS, 2_000 * 2 ** attempt));
  }
}

/** Loads the stored id (or gets a new one from the server), then connects. */
export async function connectSocket() {
  playerId = (await storage.getItem(ID_KEY).catch(() => null)) ?? '';
  if (!playerId) {
    playerId = await requestPlayerId();
    await storage.setItem(ID_KEY, playerId).catch(() => {}); // still playable this session if storage fails
  }
  socket.connect();
}
