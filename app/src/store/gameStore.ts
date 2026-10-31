import { Vibration } from 'react-native';
import { create } from 'zustand';
import type { CatchEvent, GameSettings, PlayerView, RoomView } from '@hunt/shared';
import { gameService } from '../data/gameService';
import { socket } from '../data/socketClient';
import { useProfileStore } from './profileStore';

interface GameState {
  view: RoomView | null;
  connected: boolean;
  busy: boolean;
  error: string | null;
  lastCatch: CatchEvent | null;
  createRoom(name: string, settings: Partial<GameSettings>): Promise<void>;
  joinRoom(code: string, name: string): Promise<void>;
  startGame(): Promise<void>;
  leave(): void;
  clearError(): void;
}

export const useGameStore = create<GameState>((set, get) => {
  const run = async (fn: () => Promise<RoomView | undefined>) => {
    set({ busy: true, error: null });
    try {
      const view = await fn();
      set(view ? { view, busy: false } : { busy: false });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  };

  socket.on('connect', () => set({ connected: true }));
  socket.on('disconnect', () => set({ connected: false }));
  socket.on('room:state', view => {
    // Drop late updates for a room we already left; accept while a create/join is in flight.
    const { busy, view: current } = get();
    if (busy || current?.code === view.code) set({ view });
  });
  socket.on('room:closed', reason => set({ view: null, lastCatch: null, error: reason }));
  // After a server restart we may still be showing a game the server no longer knows.
  socket.on('session', ({ roomCode }) => {
    if (get().view && !roomCode) set({ view: null, lastCatch: null, error: 'That game no longer exists' });
  });
  socket.on('game:caught', e => {
    if (useProfileStore.getState().haptics) Vibration.vibrate(e.runnerId === get().view?.me ? [0, 400, 150, 400] : 200);
    set({ lastCatch: e });
  });

  return {
    view: null,
    connected: socket.connected,
    busy: false,
    error: null,
    lastCatch: null,
    createRoom: (name, settings) => {
      useProfileStore.getState().update({ name });
      return run(() => gameService.createRoom(name, useProfileStore.getState().color, settings));
    },
    joinRoom: (code, name) => {
      useProfileStore.getState().update({ name });
      return run(() => gameService.joinRoom(code, name, useProfileStore.getState().color));
    },
    startGame: () => run(() => gameService.startGame()),
    leave: () => {
      gameService.leaveRoom();
      set({ view: null, lastCatch: null });
    },
    clearError: () => set({ error: null }),
  };
});

// Derived selectors, kept here so screens stay dumb.
export const selectMe = (s: GameState): PlayerView | undefined =>
  s.view?.players.find(p => p.id === s.view?.me);
export const selectIsHost = (s: GameState) => !!s.view && s.view.hostId === s.view.me;
