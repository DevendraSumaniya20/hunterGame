import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import { io as connect, Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomView, ServerToClientEvents } from '@hunt/shared';
import { publicId } from '../src/transport/publicIds';
import { attachSocket } from '../src/transport/socket';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const http = createServer();
const { io: server } = attachSocket(http);
http.listen(0);
const url = `http://localhost:${(http.address() as AddressInfo).port}`;
const clients: Client[] = [];
after(() => (clients.forEach(c => c.close()), server.close()));

const client = (playerId: string) => {
  const c: Client = connect(url, { auth: { playerId }, forceNew: true });
  clients.push(c);
  return c;
};
const call = <T>(fn: (ack: (r: any) => void) => void) =>
  new Promise<T>((res, rej) => fn(r => (r.ok ? res(r.data) : rej(new Error(r.error)))));
const nextState = (c: Client) => new Promise<RoomView>(res => c.once('room:state', res));

test('create, join, filtered views, validation', async () => {
  const host = client('host-0001');
  const runner = client('runner-0001');

  const created = await call<RoomView>(ack => host.emit('room:create', { name: 'Hana', settings: { catchRadiusM: 999 } }, ack));
  assert.match(created.code, /^[A-Z2-9]{5}$/);
  assert.equal(created.settings.catchRadiusM, 100, 'settings clamped to limits');

  await assert.rejects(call(ack => runner.emit('room:join', { code: 'NOPE1', name: 'Rex' }, ack)), /not found/);
  await assert.rejects(call(ack => runner.emit('room:join', { code: created.code, name: '  ' }, ack)), /Name/);

  const hostSees = nextState(host);
  await call(ack => runner.emit('room:join', { code: created.code.toLowerCase(), name: 'Rex' }, ack));
  assert.equal((await hostSees).players.length, 2);

  host.emit('location:update', { lat: 1, lng: 1 });
  const v = await nextState(runner);
  assert.equal(v.players.find(p => p.id === publicId('host-0001'))!.location, null, 'runner cannot see hunter');
  assert.ok(v.nearestHunterM === null, 'runner has no fix yet');

  await assert.rejects(call(ack => runner.emit('game:start', ack)), /host/);
  await call(ack => host.emit('game:start', ack));
});

test('rejects missing playerId', async () => {
  const c = connect(url, { forceNew: true });
  clients.push(c);
  const err = await new Promise<Error>(res => c.once('connect_error', res));
  assert.match(err.message, /playerId/);
});

test('switching rooms stops updates from the old room', async () => {
  const hostA = client('host-a001');
  const hostB = client('host-b001');
  const mover = client('mover-001');
  const a = await call<RoomView>(ack => hostA.emit('room:create', { name: 'A' }, ack));
  const b = await call<RoomView>(ack => hostB.emit('room:create', { name: 'B' }, ack));
  await call(ack => mover.emit('room:join', { code: a.code, name: 'Mo' }, ack));
  await call(ack => mover.emit('room:join', { code: b.code, name: 'Mo' }, ack));

  const seen: string[] = [];
  mover.on('room:state', v => seen.push(v.code));
  hostA.emit('location:update', { lat: 1, lng: 1 });
  hostB.emit('location:update', { lat: 1, lng: 1 });
  await new Promise(r => setTimeout(r, 600));
  assert.ok(seen.length > 0);
  assert.ok(seen.every(code => code === b.code), `got states for ${seen}`);
});

test('garbage input never crashes the server', async () => {
  const c = client('fuzz-0001');
  await new Promise<void>(res => c.once('connect', () => res()));
  const raw = c as unknown as { emit: (...a: unknown[]) => void };
  raw.emit('room:join', null, () => {});
  raw.emit('room:join', { code: 42, name: {} }, () => {});
  raw.emit('room:create', 'nope'); // no ack
  raw.emit('location:update', { lat: 'x', lng: 1 });
  raw.emit('location:update', { lat: 999, lng: 0 });
  raw.emit('game:start');
  const r = await call<RoomView>(ack => c.emit('room:create', { name: '  A very long name that goes past twenty  ' }, ack));
  assert.equal(r.players[0].name, 'A very long name tha');
});

test('reconnect with the same playerId restores the seat; a second socket keeps you online', async () => {
  const host = client('host-rc01');
  const room = await call<RoomView>(ack => host.emit('room:create', { name: 'H' }, ack));
  const first = client('runner-rc01');
  await call(ack => first.emit('room:join', { code: room.code, name: 'R' }, ack));

  const second = client('runner-rc01'); // same player, new socket (e.g. app reconnect)
  const session = await new Promise<{ roomCode: string | null }>(res => second.once('session', res));
  assert.equal(session.roomCode, room.code);

  first.close();
  await new Promise(r => setTimeout(r, 400));
  const v = await new Promise<RoomView>(res => {
    host.once('room:state', res);
    host.emit('location:update', { lat: 1, lng: 1 });
  });
  assert.equal(v.players.find(p => p.id === publicId('runner-rc01'))!.connected, true);

  second.close();
  await new Promise(r => setTimeout(r, 400));
  const v2 = await new Promise<RoomView>(res => {
    host.once('room:state', res);
    host.emit('location:update', { lat: 1, lng: 2 });
  });
  assert.equal(v2.players.find(p => p.id === publicId('runner-rc01'))!.connected, false);
});

test('fresh player gets an empty session', async () => {
  const c = client('fresh-0001');
  const s = await new Promise<{ roomCode: string | null }>(res => c.once('session', res));
  assert.equal(s.roomCode, null);
});

test('secret player ids never reach other players', async () => {
  const host = client('secret-host-01');
  const runner = client('secret-runner-01');
  const room = await call<RoomView>(ack => host.emit('room:create', { name: 'H', color: '#AF52DE' }, ack));
  assert.equal(room.me, publicId('secret-host-01'));
  assert.equal(room.players[0].color, '#AF52DE');
  const hostSees = nextState(host);
  await call(ack => runner.emit('room:join', { code: room.code, name: 'R', color: 'not-a-colour' as never }, ack));
  const wire = JSON.stringify(await hostSees);
  assert.ok(!wire.includes('secret-'), wire);
  assert.match(wire, /"color":"#007AFF"/, 'invalid colour falls back to default');
});
