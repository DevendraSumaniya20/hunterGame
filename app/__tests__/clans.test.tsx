import React from 'react';
import { Alert } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ClanDetail } from '@hunt/shared';
import { api } from '../src/data/api';
import { ClanFormScreen } from '../src/screens/ClanFormScreen';
import { ClansScreen } from '../src/screens/ClansScreen';

jest.mock('../src/data/socketClient', () => {
  const noop = { on() {}, emit() {} };
  return { socket: { ...noop, volatile: noop, connected: false }, playerId: 'p-test' };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const mocked = api as jest.Mocked<typeof api>;

const clan = (over: Partial<ClanDetail> = {}): ClanDetail => ({
  tag: 'WOLF22', name: 'Wolves', color: '#AF52DE', memberCount: 2, points: 7, description: '', createdAt: 0,
  games: 3, wins: 2, myRole: 'owner', inOtherClan: false,
  roster: [
    { id: 'pub-me', name: 'Dev', color: '#007AFF', role: 'owner', games: 2, wins: 2, catches: 1, isMe: true },
    { id: 'pub-mo', name: 'Mo', color: '#FF2D55', role: 'member', games: 1, wins: 0, catches: 0, isMe: false },
  ],
  ...over,
});

async function render(el: React.ReactElement) {
  let t!: ReactTestRenderer;
  await act(async () => {
    t = renderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>);
  });
  return t;
}
const texts = (t: ReactTestRenderer) => t.root.findAll(n => typeof n.children[0] === 'string').map(n => n.children[0] as string);
const byId = (t: ReactTestRenderer, id: string) => t.root.findAll(n => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const queryId = (t: ReactTestRenderer, id: string) => t.root.findAll(n => n.props.testID === id).length > 0;
const hub = (props: Partial<React.ComponentProps<typeof ClansScreen>> = {}) => (
  <ClansScreen version={0} onOpen={jest.fn()} onCreate={jest.fn()} onEdit={jest.fn()} onMembershipChange={jest.fn()} {...props} />
);

beforeEach(() => jest.clearAllMocks());

test('without a clan: create button and join by code', async () => {
  mocked.myClan.mockResolvedValue(null);
  mocked.joinClan.mockResolvedValue(clan({ myRole: 'member' }));
  const onCreate = jest.fn();
  const onMembershipChange = jest.fn();
  const t = await render(hub({ onCreate, onMembershipChange }));
  expect(texts(t)).toContain('You’re not in a clan');

  await act(async () => byId(t, 'create-clan').props.onPress());
  expect(onCreate).toHaveBeenCalled();

  const input = t.root.findAll(n => n.props.testID === 'clan-code-input' && n.props.onChangeText)[0];
  await act(async () => input.props.onChangeText('wolf22'));
  await act(async () => byId(t, 'join-with-code').props.onPress());
  expect(mocked.joinClan).toHaveBeenCalledWith('WOLF22');
  expect(onMembershipChange).toHaveBeenCalledWith(expect.objectContaining({ tag: 'WOLF22' }));
});

test('join by code shows the server error', async () => {
  mocked.myClan.mockResolvedValue(null);
  mocked.joinClan.mockRejectedValue(new Error('No clan with that code'));
  const t = await render(hub());
  const input = t.root.findAll(n => n.props.testID === 'clan-code-input' && n.props.onChangeText)[0];
  await act(async () => input.props.onChangeText('NOPE99'));
  await act(async () => byId(t, 'join-with-code').props.onPress());
  expect(texts(t)).toContain('No clan with that code');
});

test('owner sees code, members, Remove for others and Edit', async () => {
  mocked.myClan.mockResolvedValue(clan());
  mocked.removeMember.mockResolvedValue(clan({ memberCount: 1 }));
  const t = await render(hub());
  expect(texts(t)).toEqual(expect.arrayContaining(['WOLF22', 'Dev (you)', 'Mo', '2 of 30']));
  expect(queryId(t, 'remove-Mo')).toBe(true);
  expect(queryId(t, 'remove-Dev')).toBe(false);
  expect(queryId(t, 'edit-clan')).toBe(true);

  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1].onPress?.());
  await act(async () => byId(t, 'remove-Mo').props.onPress());
  expect(alert).toHaveBeenCalledWith('Remove Mo?', expect.any(String), expect.any(Array));
  expect(mocked.removeMember).toHaveBeenCalledWith('pub-mo');
});

test('a plain member sees no Remove/Edit; leaving asks first', async () => {
  mocked.myClan.mockResolvedValue(clan({ myRole: 'member' }));
  mocked.leaveClan.mockResolvedValue({ ok: true });
  const onMembershipChange = jest.fn();
  const t = await render(hub({ onMembershipChange }));
  expect(queryId(t, 'remove-Mo')).toBe(false);
  expect(queryId(t, 'edit-clan')).toBe(false);

  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); // user taps nothing yet
  await act(async () => byId(t, 'leave-clan').props.onPress());
  expect(alert).toHaveBeenCalled();
  expect(mocked.leaveClan).not.toHaveBeenCalled();
  await act(async () => alert.mock.calls[0][2]![1].onPress!());
  expect(mocked.leaveClan).toHaveBeenCalled();
  expect(onMembershipChange).toHaveBeenCalledWith(null);
});

test('search is debounced and shows an empty result', async () => {
  jest.useFakeTimers();
  mocked.myClan.mockResolvedValue(null);
  mocked.searchClans.mockResolvedValue([]);
  const t = await render(hub());
  await act(async () => t.root.findByProps({ testID: 'clans-segment-search' }).props.onPress());
  const input = t.root.findAll(n => n.props.testID === 'clan-search-input' && n.props.onChangeText)[0];
  await act(async () => {
    input.props.onChangeText('w');
    input.props.onChangeText('wo');
    input.props.onChangeText('wolf');
  });
  expect(mocked.searchClans).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(300));
  expect(mocked.searchClans).toHaveBeenCalledTimes(1);
  expect(mocked.searchClans).toHaveBeenCalledWith('wolf');
  expect(texts(t)).toContain('No clans found');
  jest.useRealTimers();
});

test('top clans by period', async () => {
  mocked.myClan.mockResolvedValue(null);
  mocked.topClans.mockResolvedValue([{ tag: 'WOLF22', name: 'Wolves', color: '#AF52DE', memberCount: 2, points: 7, rank: 1, isMine: true }]);
  const onOpen = jest.fn();
  const t = await render(hub({ onOpen }));
  await act(async () => t.root.findByProps({ testID: 'clans-segment-top' }).props.onPress());
  expect(mocked.topClans).toHaveBeenLastCalledWith('week');
  expect(texts(t)).toEqual(expect.arrayContaining(['Wolves (yours)', '7 pts']));
  await act(async () => t.root.findByProps({ testID: 'clan-period-all' }).props.onPress());
  expect(mocked.topClans).toHaveBeenLastCalledWith('all');
  await act(async () => byId(t, 'clan-WOLF22').props.onPress());
  expect(onOpen).toHaveBeenCalledWith('WOLF22');
});

test('form: name required, create and edit call the right endpoint, errors shown', async () => {
  mocked.createClan.mockRejectedValueOnce(new Error('That clan name is taken')).mockResolvedValueOnce(clan());
  const onDone = jest.fn();
  const t = await render(<ClanFormScreen onDone={onDone} onCancel={jest.fn()} />);
  expect(byId(t, 'save-clan').props.disabled).toBe(true);
  const name = t.root.findAll(n => n.props.testID === 'clan-name-input' && n.props.onChangeText)[0];
  await act(async () => name.props.onChangeText('Wolves'));
  await act(async () => byId(t, 'save-clan').props.onPress());
  expect(texts(t)).toContain('That clan name is taken');
  await act(async () => byId(t, 'save-clan').props.onPress());
  expect(mocked.createClan).toHaveBeenLastCalledWith({ name: 'Wolves', description: '', color: '#007AFF' });
  expect(onDone).toHaveBeenCalled();

  mocked.updateClan.mockResolvedValue(clan());
  const e = await render(<ClanFormScreen clan={clan()} onDone={jest.fn()} onCancel={jest.fn()} />);
  await act(async () => byId(e, 'save-clan').props.onPress());
  expect(mocked.updateClan).toHaveBeenCalledWith({ name: 'Wolves', description: '', color: '#AF52DE' });
});
