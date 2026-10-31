import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Room } from '../src/domain/Room';

const settings = { headStartSec: 60, durationSec: 600, catchRadiusM: 15 };
const HOME = { lat: 51.5, lng: -0.12 };
const NEAR = { lat: 51.50005, lng: -0.12 }; // ~5.5 m north
const FAR = { lat: 51.51, lng: -0.12 }; // ~1.1 km north

function setup() {
  const room = new Room('ABCDE', 'h', 'Hunter', settings);
  room.join('r1', 'Ann');
  room.join('r2', 'Bob');
  return room;
}

test('start needs host and a runner', () => {
  const empty = new Room('X', 'h', 'Hunter', settings);
  assert.throws(() => empty.start('h', 0), /runner/);
  const room = setup();
  assert.throws(() => room.start('r1', 0), /host/);
  room.start('h', 0);
  assert.equal(room.phase, 'headstart');
  assert.equal(room.phaseEndsAt, 60_000);
});

test('no catches during head start, catch after it ends', () => {
  const room = setup();
  room.start('h', 0);
  room.updateLocation('h', HOME, 1);
  assert.deepEqual(room.updateLocation('r1', NEAR, 2), []);
  room.updateLocation('r2', FAR, 3);

  const caught = room.beginChase(60_000);
  assert.equal(caught.length, 1);
  assert.equal(caught[0].runnerId, 'r1');
  assert.equal(room.players.get('r1')!.role, 'helper');
  assert.equal(room.phase, 'chase');
});

test('helper can catch, last runner caught ends game for hunters', () => {
  const room = setup();
  room.start('h', 0);
  room.updateLocation('h', HOME, 1);
  room.updateLocation('r1', NEAR, 1);
  room.updateLocation('r2', FAR, 1);
  room.beginChase(60_000);

  const caught = room.updateLocation('r1', FAR, 70_000); // helper r1 walks to r2
  assert.equal(caught[0].byId, 'r1');
  assert.equal(room.phase, 'ended');
  assert.equal(room.winner, 'hunters');
});

test('time up with runners left means runners win', () => {
  const room = setup();
  room.start('h', 0);
  room.beginChase(60_000);
  room.timeUp();
  assert.equal(room.winner, 'runners');
});

test('late join rejected, reconnect with same id allowed', () => {
  const room = setup();
  room.start('h', 0);
  assert.throws(() => room.join('r3', 'Cat'), /started/);
  room.setConnected('r1', false);
  room.join('r1', 'Ann');
  assert.equal(room.players.get('r1')!.connected, true);
});

test('runners see only themselves plus radar; hunters see runners only in chase', () => {
  const room = setup();
  room.updateLocation('h', HOME, 0);
  room.updateLocation('r1', NEAR, 0);
  room.updateLocation('r2', FAR, 0);
  room.start('h', 0);

  const runnerView = room.viewFor('r1');
  assert.equal(runnerView.players.find(p => p.id === 'h')!.location, null);
  assert.equal(runnerView.players.find(p => p.id === 'r2')!.location, null);
  assert.deepEqual(runnerView.players.find(p => p.id === 'r1')!.location, NEAR);
  assert.ok(runnerView.nearestHunterM! > 0 && runnerView.nearestHunterM! < 15);

  assert.equal(room.viewFor('h').players.find(p => p.id === 'r2')!.location, null);
  room.beginChase(60_000);
  assert.deepEqual(room.viewFor('h').players.find(p => p.id === 'r2')!.location, FAR);
});

test('last runner leaving mid-chase ends the game', () => {
  const room = new Room('X', 'h', 'Hunter', settings);
  room.join('r1', 'Ann');
  room.start('h', 0);
  room.beginChase(1);
  room.leave('r1');
  assert.equal(room.winner, 'hunters');
});

test('last runner leaving during head start ends the game', () => {
  const room = new Room('X', 'h', 'Hunter', settings);
  room.join('r1', 'Ann');
  room.start('h', 0);
  room.leave('r1');
  assert.equal(room.phase, 'ended');
  assert.equal(room.winner, 'hunters');
});
