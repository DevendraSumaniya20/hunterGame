import type { RoomView } from '@hunt/shared';

// Fake socket: lets tests push server events into the store.
const handlers: Record<string, (...a: any[]) => void> = {};
const emitted: unknown[][] = [];
jest.mock('../src/data/socketClient', () => {
  const s = {
    connected: true,
    on: (event: string, fn: (...a: any[]) => void) => (handlers[event] = fn),
    emit: (...a: unknown[]) => {
      emitted.push(a);
      const ack = a[a.length - 1];
      if (typeof ack === 'function' && a[0] === 'room:join') ack({ ok: true, data: view('ROOM1') });
    },
  };
  return { socket: { ...s, volatile: s }, playerId: 'p-test' };
});

import { useGameStore } from '../src/store/gameStore';
import { useProfileStore } from '../src/store/profileStore';

const view = (code: string, phase: RoomView['phase'] = 'lobby'): RoomView => ({
  code,
  hostId: 'h',
  me: 'p-test',
  phase,
  settings: { headStartSec: 60, durationSec: 600, catchRadiusM: 15 },
  players: [],
  phaseEndsAt: null,
  winner: null,
  catches: [],
  nearestHunterM: null,
});

beforeEach(() => useGameStore.setState({ view: null, busy: false, error: null, lastCatch: null }));

test('join stores the room from the ack', async () => {
  await useGameStore.getState().joinRoom('ROOM1', 'Dev');
  expect(useGameStore.getState().view?.code).toBe('ROOM1');
});

test('late room:state after leaving is ignored', () => {
  useGameStore.setState({ view: view('ROOM1') });
  useGameStore.getState().leave();
  handlers['room:state'](view('ROOM1', 'chase'));
  expect(useGameStore.getState().view).toBeNull();
  expect(emitted.some(e => e[0] === 'room:leave')).toBe(true);
});

test('room:state for the current room or during a join is applied', () => {
  useGameStore.setState({ busy: true });
  handlers['room:state'](view('ROOM2'));
  expect(useGameStore.getState().view?.code).toBe('ROOM2');
  useGameStore.setState({ busy: false });
  handlers['room:state'](view('ROOM2', 'chase'));
  expect(useGameStore.getState().view?.phase).toBe('chase');
});

test('state for a different room is ignored', () => {
  useGameStore.setState({ view: view('ROOM1') });
  handlers['room:state'](view('OTHER'));
  expect(useGameStore.getState().view?.code).toBe('ROOM1');
});

test('session without a room (server restarted) sends us home with a reason', () => {
  useGameStore.setState({ view: view('ROOM1') });
  handlers.session({ roomCode: null });
  expect(useGameStore.getState().view).toBeNull();
  expect(useGameStore.getState().error).toMatch(/no longer exists/);
});

test('empty session on the home screen shows no error', () => {
  handlers.session({ roomCode: null });
  expect(useGameStore.getState().error).toBeNull();
});

test('room:closed clears the game and keeps the reason', () => {
  useGameStore.setState({ view: view('ROOM1') });
  handlers['room:closed']('Host left the game');
  expect(useGameStore.getState()).toMatchObject({ view: null, error: 'Host left the game' });
});

test('the last used name is remembered for the next game', async () => {
  await useGameStore.getState().joinRoom('ROOM1', 'Dev');
  useGameStore.getState().leave();
  expect(useProfileStore.getState().name).toBe('Dev');
});

test('join sends the profile colour', async () => {
  useProfileStore.setState({ color: '#AF52DE' });
  await useGameStore.getState().joinRoom('ROOM1', 'Dev');
  const join = emitted.filter(e => e[0] === 'room:join').pop()!;
  expect(join[1]).toEqual({ code: 'ROOM1', name: 'Dev', color: '#AF52DE' });
});
