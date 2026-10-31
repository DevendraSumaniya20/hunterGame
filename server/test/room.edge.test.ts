import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_PLAYERS, Room } from '../src/domain/Room';

const R = 15;
const settings = { headStartSec: 60, durationSec: 600, catchRadiusM: R };
const M_PER_DEG_LAT = 111_194.93; // haversine metres per degree of latitude (R = 6371 km)
const at = (northM: number) => ({ lat: 10 + northM / M_PER_DEG_LAT, lng: 20 });

function chase(runners: string[]) {
  const room = new Room('EDGE1', 'h', 'Hunter', settings);
  runners.forEach(id => room.join(id, id.toUpperCase()));
  room.start('h', 0);
  room.beginChase(1);
  return room;
}

test('catch radius boundary: just inside catches, just outside does not', () => {
  const room = chase(['in', 'out']);
  room.updateLocation('in', at(R - 0.1), 2);
  room.updateLocation('out', at(-(R + 0.1)), 2);
  const caught = room.updateLocation('h', at(0), 3);
  assert.deepEqual(caught.map(c => c.runnerId), ['in']);
});

test('one hunter move can catch several runners', () => {
  const room = chase(['a', 'b', 'c']);
  room.updateLocation('a', at(1), 1);
  room.updateLocation('b', at(-1), 1);
  room.updateLocation('c', at(500), 1);
  assert.equal(room.updateLocation('h', at(0), 2).length, 2);
  assert.equal(room.phase, 'chase');
});

test('hunter without a GPS fix catches nobody', () => {
  const room = chase(['a']);
  assert.deepEqual(room.updateLocation('a', at(0), 1), []);
  assert.equal(room.players.get('a')!.role, 'runner');
});

test('disconnected runner can still be caught at their last position', () => {
  const room = chase(['a', 'b']);
  room.updateLocation('a', at(0), 1);
  room.setConnected('a', false);
  assert.equal(room.updateLocation('h', at(2), 2)[0]?.runnerId, 'a');
});

test('room refuses players beyond MAX_PLAYERS', () => {
  const room = new Room('FULL1', 'h', 'Hunter', settings);
  for (let i = 1; i < MAX_PLAYERS; i++) room.join(`r${i}`, `R${i}`);
  assert.throws(() => room.join('late', 'Late'), /full/);
});

test('cannot start twice; updates for unknown players are ignored', () => {
  const room = chase(['a']);
  assert.throws(() => room.start('h', 5), /already started/);
  assert.deepEqual(room.updateLocation('ghost', at(0), 5), []);
});

test('timeUp only ends a chase', () => {
  const room = new Room('T1', 'h', 'Hunter', settings);
  room.join('a', 'A');
  room.timeUp();
  assert.equal(room.phase, 'lobby');
});

test('after the game everyone sees everyone', () => {
  const room = chase(['a', 'b']);
  room.updateLocation('b', at(900), 1);
  room.timeUp();
  const seen = room.viewFor('a').players.find(p => p.id === 'b')!.location;
  assert.deepEqual(seen, at(900));
});

test('a caught runner (helper) sees remaining runners; radar counts helpers', () => {
  const room = chase(['a', 'b']);
  room.updateLocation('a', at(0), 1);
  room.updateLocation('b', at(100), 1);
  room.updateLocation('h', at(1), 2); // a caught -> helper at 0 m
  assert.equal(room.players.get('a')!.role, 'helper');
  assert.deepEqual(room.viewFor('a').players.find(p => p.id === 'b')!.location, at(100));
  assert.equal(room.viewFor('b').nearestHunterM, 99); // helper a at 0 m is closer than hunter at 1 m
});
