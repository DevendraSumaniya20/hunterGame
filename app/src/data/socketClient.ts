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

const newId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

/** Loads (or creates) the stored id, then connects. */
export async function connectSocket() {
  playerId = (await storage.getItem(ID_KEY).catch(() => null)) ?? '';
  if (!playerId) {
    playerId = newId();
    await storage.setItem(ID_KEY, playerId).catch(() => {}); // still playable this session if storage fails
  }
  socket.connect();
}
