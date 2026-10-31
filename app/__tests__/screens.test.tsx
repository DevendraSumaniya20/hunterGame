import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '../src/data/api';
import { HistoryScreen } from '../src/screens/HistoryScreen';
import { LeaderboardScreen } from '../src/screens/LeaderboardScreen';

jest.mock('../src/data/socketClient', () => {
  const noop = { on() {}, emit() {} };
  return { socket: { ...noop, volatile: noop, connected: false }, playerId: 'p-test' };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function render(el: React.ReactElement) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>);
  });
  return tree;
}
const texts = (t: ReactTestRenderer) =>
  t.root.findAll(n => typeof n.children[0] === 'string').map(n => n.children[0] as string);

test('history lists games and opens one on tap', async () => {
  (api.history as jest.Mock).mockResolvedValue([
    { id: 7, endedAt: Date.UTC(2026, 9, 31), winner: 'hunters', startRole: 'runner', finalRole: 'helper',
      won: true, catches: 0, caughtBy: 'Hana', survivalSec: 30, players: 3 },
  ]);
  const onOpen = jest.fn();
  const t = await render(<HistoryScreen onOpen={onOpen} />);
  expect(texts(t)).toContain('Caught by Hana');
  await act(async () => t.root.findByProps({ testID: 'game-7' }).props.onPress());
  expect(onOpen).toHaveBeenCalledWith(7);
});

test('history empty and error states', async () => {
  (api.history as jest.Mock).mockResolvedValueOnce([]);
  expect(texts(await render(<HistoryScreen onOpen={jest.fn()} />))).toContain('No games yet');
  (api.history as jest.Mock).mockRejectedValueOnce(new Error('Can’t reach the game server'));
  expect(texts(await render(<HistoryScreen onOpen={jest.fn()} />))).toContain('Couldn’t load your games');
});

test('leaderboard reloads when switching board and period', async () => {
  (api.leaderboard as jest.Mock).mockResolvedValue([
    { rank: 1, name: 'Hana', color: '#007AFF', value: 3, games: 2, isMe: true },
  ]);
  const t = await render(<LeaderboardScreen />);
  expect(api.leaderboard).toHaveBeenLastCalledWith('hunters', 'week');
  expect(texts(t)).toEqual(expect.arrayContaining(['Hana (you)', '3 catches']));
  await act(async () => t.root.findByProps({ testID: 'board-survivors' }).props.onPress());
  expect(api.leaderboard).toHaveBeenLastCalledWith('survivors', 'week');
  await act(async () => t.root.findByProps({ testID: 'period-all' }).props.onPress());
  expect(api.leaderboard).toHaveBeenLastCalledWith('survivors', 'all');
  expect(texts(t)).toContain('3 escapes');
});
