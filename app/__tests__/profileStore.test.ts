import { api } from '../src/data/api';
import { useProfileStore } from '../src/store/profileStore';

const mem: Map<string, string> = jest.requireMock('../src/data/storage').__mem;

beforeEach(() => {
  mem.clear();
  jest.clearAllMocks();
  useProfileStore.setState({ name: '', color: '#007AFF', haptics: true, loaded: false });
});

test('fresh install loads defaults', async () => {
  await useProfileStore.getState().load();
  expect(useProfileStore.getState()).toMatchObject({ name: '', color: '#007AFF', haptics: true, loaded: true });
});

test('saved preferences come back after a restart', async () => {
  useProfileStore.getState().update({ name: 'Dev', color: '#FF2D55', haptics: false });
  await Promise.resolve();
  useProfileStore.setState({ name: '', color: '#007AFF', haptics: true });
  await useProfileStore.getState().load();
  expect(useProfileStore.getState()).toMatchObject({ name: 'Dev', color: '#FF2D55', haptics: false });
});

test('name/colour changes sync to the server; haptics stays local; no sync without a name', () => {
  useProfileStore.getState().update({ color: '#FF2D55' });
  expect(api.saveProfile).not.toHaveBeenCalled();
  useProfileStore.getState().update({ name: 'Dev' });
  expect(api.saveProfile).toHaveBeenLastCalledWith('Dev', '#FF2D55');
  useProfileStore.getState().update({ haptics: false });
  expect(api.saveProfile).toHaveBeenCalledTimes(1);
});
