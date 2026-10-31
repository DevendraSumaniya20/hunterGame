import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../src/services/RoomManager';

function setup() {
  const calls = { change: 0, close: [] as string[] };
  const manager = new RoomManager({
    onChange: () => calls.change++,
    onCatch: () => {},
    onClose: (_room, reason) => calls.close.push(reason),
  });
  const room = manager.create('host-1', 'Hana', { headStartSec: 5 });
  manager.join('run-1', room.code, 'Ravi');
  manager.start('host-1');
  manager.updateLocation('host-1', { lat: 1, lng: 1 });
  room.beginChase(Date.now());
  manager.updateLocation('run-1', { lat: 1, lng: 1 }); // caught, game over
  assert.equal(room.phase, 'ended');
  return { manager, room, calls };
}

test('location updates after the game are ignored (no rebroadcast, expiry not reset)', () => {
  const { manager, calls } = setup();
  const before = calls.change;
  manager.updateLocation('run-1', { lat: 2, lng: 2 });
  assert.equal(calls.change, before);
});

test('host leaving an ended game keeps the room for the others', () => {
  const { manager, room, calls } = setup();
  manager.leave('host-1');
  assert.deepEqual(calls.close, []);
  assert.equal(manager.roomOf('run-1'), room);
});

test('host leaving before the end closes the room', () => {
  const calls: string[] = [];
  const manager = new RoomManager({ onChange: () => {}, onCatch: () => {}, onClose: (_r, why) => calls.push(why) });
  const room = manager.create('host-1', 'Hana');
  manager.join('run-1', room.code, 'Ravi');
  manager.leave('host-1');
  assert.deepEqual(calls, ['Host left the game']);
  assert.equal(manager.roomOf('run-1'), undefined);
});
