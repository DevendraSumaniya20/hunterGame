import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import { io as connect, Socket } from 'socket.io-client';
import type { ClientToServerEvents, GameDetail, GameSummary, LeaderboardRow, Profile, RoomView, ServerToClientEvents } from '@hunt/shared';
import { openDb } from '../src/data/db';
import { GameRepository } from '../src/data/GameRepository';
import { createApi } from '../src/transport/http';
import { attachSocket } from '../src/transport/socket';

const repo = new GameRepository(openDb(':memory:'));
const api = createApi(repo);
const http = createServer(async (req, res) => {
  if (!(await api(req, res))) res.writeHead(404).end();
});
const { io } = attachSocket(http, repo);
http.listen(0);
const base = `http://localhost:${(http.address() as AddressInfo).port}`;
const sockets: Socket[] = [];
after(() => (sockets.forEach(s => s.close()), io.close()));

const get = async <T>(path: string) => {
  const r = await fetch(base + path);
  return { status: r.status, body: (await r.json()) as T };
};
const put = async (path: string, body: unknown) => {
  const r = await fetch(base + path, { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};

test('profile: defaults, save, validation', async () => {
  assert.deepEqual((await get<Profile>('/api/players/player-0001')).body.name, '');
  assert.equal((await put('/api/players/player-0001', { name: '  Dev  ', color: '#FF2D55' })).body.name, 'Dev');
  assert.equal((await get<Profile>('/api/players/player-0001')).body.color, '#FF2D55');
  assert.equal((await put('/api/players/player-0001', { name: '', color: '#FF2D55' })).status, 400);
  assert.equal((await put('/api/players/player-0001', { name: 'X', color: 'red' })).status, 400);
  assert.equal((await put('/api/players/player-0001', '{bad json')).status, 400);
  assert.equal((await put('/api/players/player-0001', { name: 'x'.repeat(2000), color: '#FF2D55' })).status, 413);
  assert.equal((await get('/api/players/bad id!')).status, 400);
  assert.equal((await get('/api/nope')).status, 404);
});

test('a finished game is saved and shows in history, detail and leaderboard', async () => {
  type C = Socket<ServerToClientEvents, ClientToServerEvents>;
  const host: C = connect(base, { auth: { playerId: 'api-host-01' }, forceNew: true });
  const runner: C = connect(base, { auth: { playerId: 'api-runner-01' }, forceNew: true });
  sockets.push(host, runner);
  const call = <T>(fn: (ack: (r: any) => void) => void) =>
    new Promise<T>((res, rej) => fn(r => (r.ok ? res(r.data) : rej(new Error(r.error)))));

  const room = await call<RoomView>(ack => host.emit('room:create', { name: 'Hana', settings: { headStartSec: 5 } }, ack));
  await call(ack => runner.emit('room:join', { code: room.code, name: 'Ravi' }, ack));
  await call(ack => host.emit('game:start', ack));
  runner.emit('location:update', { lat: 1, lng: 1 });
  host.emit('location:update', { lat: 1, lng: 1 });
  // Head start is 5 s (minimum); the catch happens as the chase begins.
  const ended = await new Promise<RoomView>(res => host.on('room:state', v => v.phase === 'ended' && res(v)));
  assert.equal(ended.winner, 'hunters');

  const history = (await get<GameSummary[]>('/api/players/api-runner-01/games')).body;
  assert.equal(history.length, 1);
  assert.equal(history[0].caughtBy, 'Hana');
  const detail = await get<GameDetail>(`/api/players/api-runner-01/games/${history[0].id}`);
  assert.equal(detail.body.roster.length, 2);
  assert.equal((await get(`/api/players/someone-else/games/${history[0].id}`)).status, 404);

  const board = (await get<LeaderboardRow[]>('/api/leaderboard?board=hunters&period=week&me=api-host-01')).body;
  assert.deepEqual(board.map(r => [r.name, r.value, r.isMe]), [['Hana', 1, true]]);
  assert.equal((await get<Profile>('/api/players/api-host-01')).body.stats.wins, 1);
});
