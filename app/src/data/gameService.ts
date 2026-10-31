import type { Ack, ChatMessage, GameSettings, LatLng, PlayerColor, RoomView, Team } from '@hunt/shared';
import { socket } from './socketClient';

type AckResult<T> = Parameters<Ack<T>>[0];

const TIMEOUT_MS = 8000;

function request<T>(send: (ack: Ack<T>) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server not reachable')), TIMEOUT_MS);
    send((res: AckResult<T>) => {
      clearTimeout(timer);
      if (res.ok) resolve(res.data);
      else reject(new Error(res.error));
    });
  });
}

/** The only place the app talks to the game server. */
export const gameService = {
  createRoom: (name: string, color: PlayerColor, settings: Partial<GameSettings>) =>
    request<RoomView>(ack => socket.emit('room:create', { name, color, settings }, ack)),
  joinRoom: (code: string, name: string, color: PlayerColor) =>
    request<RoomView>(ack => socket.emit('room:join', { code, name, color }, ack)),
  startGame: () => request<undefined>(ack => socket.emit('game:start', ack)),
  leaveRoom: () => socket.emit('room:leave'),
  // volatile: drop fixes while offline instead of replaying a burst on reconnect (the heartbeat resends).
  sendLocation: (p: LatLng) => socket.volatile.emit('location:update', p),
  sendChat: (text: string) => request<ChatMessage>(ack => socket.emit('chat:send', { text }, ack)),
  chatHistory: () => request<{ team: Team; messages: ChatMessage[] }>(ack => socket.emit('chat:history', ack)),
};
