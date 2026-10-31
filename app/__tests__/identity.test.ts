jest.mock('socket.io-client', () => ({ io: () => ({ connect: jest.fn(), on: jest.fn() }) }));

import { connectSocket, playerId, requestPlayerId, socket } from '../src/data/socketClient';

const mem: Map<string, string> = jest.requireMock('../src/data/storage').__mem;
const fetchMock = jest.fn();
(globalThis as any).fetch = fetchMock;

beforeEach(() => {
  mem.clear();
  fetchMock.mockReset();
});

test('new install gets its id from the server, stores it, then connects', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'p-secure-from-server' }) });
  await connectSocket();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/players$/), { method: 'POST' });
  expect(mem.get('playerId')).toBe('p-secure-from-server');
  expect(playerId).toBe('p-secure-from-server');
  expect(socket.connect).toHaveBeenCalled();
});

test('existing install reuses its stored id without asking the server', async () => {
  mem.set('playerId', 'p-already-stored');
  await connectSocket();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(playerId).toBe('p-already-stored');
});

test('retries with backoff while the server is unreachable', async () => {
  fetchMock
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p-third-time' }) });
  const waits: number[] = [];
  const id = await requestPlayerId(async ms => {
    waits.push(ms);
  });
  expect(id).toBe('p-third-time');
  expect(waits).toEqual([2000, 4000]);
});
