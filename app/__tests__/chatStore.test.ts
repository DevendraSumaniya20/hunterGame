import type { ChatMessage, RoomView } from '@hunt/shared';

// The fake socket keeps its own state (factories run before this file's variables exist).
jest.mock('../src/data/socketClient', () => {
  const state = {
    handlers: {} as Record<string, (...a: any[]) => void>,
    team: 'runners' as 'runners' | 'hunters',
    history: {} as Record<string, unknown[]>,
    sendError: null as string | null,
  };
  const s = {
    connected: true,
    on: (event: string, fn: (...a: any[]) => void) => (state.handlers[event] = fn),
    emit: (event: string, ...args: any[]) => {
      const ack = args[args.length - 1];
      if (event === 'chat:history') ack({ ok: true, data: { team: state.team, messages: state.history[state.team] ?? [] } });
      if (event === 'chat:send')
        ack(
          state.sendError
            ? { ok: false, error: state.sendError }
            : { ok: true, data: { id: `mine-${Date.now()}`, team: state.team, fromId: 'me', name: 'me', color: '#007AFF', text: args[0].text, at: Date.now() } },
        );
    },
  };
  return { socket: { ...s, volatile: s }, playerId: 'p-test', __state: state };
});

import { useChatStore } from '../src/store/chatStore';
import { useGameStore } from '../src/store/gameStore';

const fake = jest.requireMock('../src/data/socketClient').__state;
const mockHandlers = fake.handlers;

function mockMsg(id: string, text: string, t: 'runners' | 'hunters', fromId = 'other'): ChatMessage {
  return { id, team: t, fromId, name: fromId, color: '#007AFF', text, at: Number(id.replace(/\D/g, '')) || Date.now() };
}

const view = (role: 'runner' | 'helper' | 'hunter'): RoomView => ({
  code: 'ROOM1', hostId: 'host', me: 'me', phase: 'chase',
  settings: { headStartSec: 60, durationSec: 600, catchRadiusM: 15 },
  players: [{ id: 'me', name: 'Dev', color: '#007AFF', clanTag: null, role, connected: true, location: null }],
  phaseEndsAt: null, winner: null, catches: [], nearestHunterM: null,
});
const flush = () => new Promise<void>(r => setTimeout(() => r(), 0));

beforeEach(() => {
  useGameStore.setState({ view: null });
  fake.team = 'runners';
  fake.sendError = null;
  fake.history.runners = [mockMsg('m1', 'runner history', 'runners')];
  fake.history.hunters = [mockMsg('m2', 'hunter history', 'hunters')];
});

test('joining loads your team history', async () => {
  useGameStore.setState({ view: view('runner') });
  await flush();
  expect(useChatStore.getState().team).toBe('runners');
  expect(useChatStore.getState().items.map(i => i.text)).toEqual(['runner history']);
});

test('other team messages are ignored; unread counts only others while closed', async () => {
  useGameStore.setState({ view: view('runner') });
  await flush();
  mockHandlers['chat:message'](mockMsg('m10', 'hunters secret', 'hunters'));
  mockHandlers['chat:message'](mockMsg('m11', 'go left', 'runners'));
  mockHandlers['chat:message'](mockMsg('m12', 'my echo', 'runners', 'me'));
  mockHandlers['chat:message'](mockMsg('m11', 'go left', 'runners')); // duplicate delivery
  const s = useChatStore.getState();
  expect(s.items.map(i => i.text)).toEqual(['runner history', 'go left', 'my echo']);
  expect(s.unread).toBe(1);
  s.setOpen(true);
  expect(useChatStore.getState().unread).toBe(0);
  mockHandlers['chat:message'](mockMsg('m13', 'while open', 'runners'));
  expect(useChatStore.getState().unread).toBe(0);
});

test('getting caught moves you to the hunters chat with a notice', async () => {
  useGameStore.setState({ view: view('runner') });
  await flush();
  fake.team = 'hunters';
  useGameStore.setState({ view: view('helper') });
  await flush();
  const s = useChatStore.getState();
  expect(s.team).toBe('hunters');
  // older hunter messages first, then the notice from the moment you switched
  expect(s.items.map(i => i.text)).toEqual(['hunter history', 'You were caught. You now chat with the hunters.']);
  expect(s.items.some(i => i.text === 'runner history')).toBe(false);
});

test('send shows server errors; success appends', async () => {
  useGameStore.setState({ view: view('runner') });
  await flush();
  fake.sendError = 'Slow down a little';
  await useChatStore.getState().send('spam');
  expect(useChatStore.getState().error).toBe('Slow down a little');
  fake.sendError = null;
  await useChatStore.getState().send('hello team');
  expect(useChatStore.getState().error).toBeNull();
  expect(useChatStore.getState().items.map(i => i.text)).toContain('hello team');
});

test('leaving the game clears the chat', async () => {
  useGameStore.setState({ view: view('runner') });
  await flush();
  useChatStore.getState().setOpen(true);
  useGameStore.setState({ view: null });
  expect(useChatStore.getState()).toMatchObject({ team: null, items: [], open: false, unread: 0 });
});
