import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { RoomManager } from '../src/services/RoomManager';

test('phase timers: head start -> chase -> time up -> room expires', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const closed: string[] = [];
    const manager = new RoomManager({ onChange: () => {}, onCatch: () => {}, onClose: (_r, why) => closed.push(why) });
    const room = manager.create('h', 'Hana', { headStartSec: 5, durationSec: 30 });
    manager.join('r', room.code, 'Ravi');
    manager.start('h');
    assert.equal(room.phase, 'headstart');

    mock.timers.tick(5_000);
    assert.equal(room.phase, 'chase');
    assert.equal(room.phaseEndsAt, Date.now() + 30_000);

    mock.timers.tick(30_000);
    assert.equal(room.phase, 'ended');
    assert.equal(room.winner, 'runners');

    mock.timers.tick(10 * 60_000);
    assert.deepEqual(closed, ['Room expired']);
    assert.equal(manager.roomOf('r'), undefined);
  } finally {
    mock.timers.reset();
  }
});

test('settings are clamped, rounded, and junk falls back to defaults', () => {
  const manager = new RoomManager({ onChange: () => {}, onCatch: () => {}, onClose: () => {} });
  const lo = manager.create('a', 'A', { headStartSec: 1, durationSec: 1, catchRadiusM: 0 }).settings;
  assert.deepEqual(lo, { headStartSec: 5, durationSec: 30, catchRadiusM: 3 });
  const hi = manager.create('b', 'B', { headStartSec: 1e9, durationSec: 1e9, catchRadiusM: 1e9 }).settings;
  assert.deepEqual(hi, { headStartSec: 600, durationSec: 3600, catchRadiusM: 100 });
  const junk = manager.create('c', 'C', { headStartSec: NaN, durationSec: '90' as unknown as number, catchRadiusM: 12.6 }).settings;
  assert.deepEqual(junk, { headStartSec: 60, durationSec: 600, catchRadiusM: 13 });
});

test('creating a new room as host of another closes the old one', () => {
  const closed: string[] = [];
  const manager = new RoomManager({ onChange: () => {}, onCatch: () => {}, onClose: (r, why) => closed.push(`${r.code}:${why}`) });
  const first = manager.create('h', 'Hana');
  const second = manager.create('h', 'Hana');
  assert.deepEqual(closed, [`${first.code}:Host left the game`]);
  assert.equal(manager.roomOf('h'), second);
});

test('start outside a room and joining a missing room fail cleanly', () => {
  const manager = new RoomManager({ onChange: () => {}, onCatch: () => {}, onClose: () => {} });
  assert.throws(() => manager.start('nobody'), /Not in a room/);
  assert.throws(() => manager.join('x', 'ZZZZZ', 'X'), /not found/);
});
