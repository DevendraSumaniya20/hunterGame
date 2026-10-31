import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CLAN_MAX_MEMBERS } from '@hunt/shared';
import { ClanRepository } from '../src/data/ClanRepository';
import { openDb } from '../src/data/db';
import { GameRepository } from '../src/data/GameRepository';
import { publicId } from '../src/domain/ids';
import { Room } from '../src/domain/Room';

const DAY = 24 * 60 * 60 * 1000;

function setup() {
  let now = 1_000 * DAY;
  const db = openDb(':memory:');
  const clock = () => now;
  return {
    clans: new ClanRepository(db, clock),
    games: new GameRepository(db, clock),
    tick: (ms: number) => (now += ms),
    at: (t: number) => (now = t),
  };
}

/** Hunter `h` catches runner `r` and wins. */
function play(games: GameRepository, h: string, r: string) {
  const room = new Room('ROOM1', h, h.toUpperCase());
  room.join(r, r.toUpperCase());
  room.start(h, 0);
  room.beginChase(1);
  room.updateLocation(r, { lat: 1, lng: 1 }, 2);
  room.updateLocation(h, { lat: 1, lng: 1 }, 3);
  games.saveGame(room);
}

const msg = (re: RegExp) => (e: unknown) => re.test((e as Error).message);

test('create: owner, share code, validation and unique names', () => {
  const { clans } = setup();
  const c = clans.create('owner-01', { name: '  Night   Wolves ', description: 'We run at night', color: '#AF52DE' });
  assert.match(c.tag, /^[A-Z2-9]{6}$/);
  assert.equal(c.name, 'Night Wolves');
  assert.equal(c.memberCount, 1);
  assert.equal(c.myRole, 'owner');
  assert.equal(clans.tagOf('owner-01'), c.tag);

  assert.throws(() => clans.create('p2', { name: 'ab' }), msg(/3–24/));
  assert.throws(() => clans.create('p2', { name: 'x'.repeat(25) }), msg(/3–24/));
  assert.throws(() => clans.create('p2', { name: 'Okay', description: 'x'.repeat(121) }), msg(/120/));
  assert.throws(() => clans.create('p2', { name: 'Okay', color: 'red' }), msg(/colour/));
  assert.throws(() => clans.create('p2', { name: 'night wolves' }), msg(/taken/));
  assert.throws(() => clans.create('owner-01', { name: 'Second' }), msg(/Leave your clan/));
});

test('join by code (any case), one clan per player, full clans refuse', () => {
  const { clans } = setup();
  const a = clans.create('owner-a', { name: 'Alpha' });
  const b = clans.create('owner-b', { name: 'Bravo' });
  assert.equal(clans.join('p1', a.tag.toLowerCase()).memberCount, 2);
  assert.equal(clans.join('p1', a.tag).memberCount, 2, 'joining your own clan again is a no-op');
  assert.throws(() => clans.join('p1', b.tag), msg(/Leave your clan/));
  assert.throws(() => clans.join('p2', 'NOPE99'), msg(/No clan/));
  for (let i = clans.detail(b.tag)!.memberCount; i < CLAN_MAX_MEMBERS; i++) clans.join(`fill-${i}`, b.tag);
  assert.throws(() => clans.join('late', b.tag), msg(/full/));
});

test('leaving: owner hands over to the longest member, last one out deletes the clan', () => {
  const { clans, tick } = setup();
  const c = clans.create('owner', { name: 'Charlie' });
  tick(1000);
  clans.join('first', c.tag);
  tick(1000);
  clans.join('second', c.tag);

  clans.leave('owner');
  assert.equal(clans.detail(c.tag, 'first')!.myRole, 'owner');
  assert.equal(clans.tagOf('owner'), null);
  clans.leave('second');
  clans.leave('first');
  assert.equal(clans.detail(c.tag), null);
  assert.throws(() => clans.leave('first'), msg(/not in a clan/));
});

test('only the owner removes members, never themselves', () => {
  const { clans } = setup();
  const c = clans.create('owner', { name: 'Delta' });
  clans.join('m1', c.tag);
  clans.join('m2', c.tag);
  assert.throws(() => clans.removeMember('m1', publicId('m2')), msg(/Only the clan owner/));
  assert.throws(() => clans.removeMember('owner', publicId('owner')), msg(/Leave clan/));
  assert.throws(() => clans.removeMember('owner', 'unknown'), msg(/not in your clan/));
  assert.equal(clans.removeMember('owner', publicId('m1')).memberCount, 2);
  assert.equal(clans.tagOf('m1'), null);
});

test('owner edits name, description and colour', () => {
  const { clans } = setup();
  clans.create('other', { name: 'Taken' });
  const c = clans.create('owner', { name: 'Echo' });
  clans.join('m1', c.tag);
  assert.throws(() => clans.update('m1', { name: 'New' }), msg(/Only the clan owner/));
  assert.throws(() => clans.update('owner', { name: 'taken' }), msg(/taken/));
  const u = clans.update('owner', { description: 'Fast and quiet', color: '#FFCC00' });
  assert.deepEqual([u.name, u.description, u.color], ['Echo', 'Fast and quiet', '#FFCC00']);
});

test('search by name or exact code; wildcards in the query are literal', () => {
  const { clans } = setup();
  const w = clans.create('a', { name: 'Wolf Pack' });
  clans.create('b', { name: 'Lone Wolf' });
  clans.create('c', { name: '100% Fox' });
  assert.deepEqual(clans.search('wolf').map(c => c.name).sort(), ['Lone Wolf', 'Wolf Pack']);
  assert.deepEqual(clans.search(w.tag.toLowerCase()).map(c => c.name), ['Wolf Pack']);
  assert.deepEqual(clans.search('%').map(c => c.name), ['100% Fox']);
  assert.deepEqual(clans.search('   '), []);
});

test('top clans: 3 per win + 1 per catch by members; week ignores old games; marks mine', () => {
  const { clans, games, at } = setup();
  const hunters = clans.create('h1', { name: 'Hunters' });
  clans.join('h2', hunters.tag);
  clans.create('r1', { name: 'Runners' });

  at(900 * DAY);
  play(games, 'h1', 'r1'); // old: h1 +3 win +1 catch, r1 (helper, team won) +3
  at(1_000 * DAY);
  play(games, 'h2', 'r1'); // h2 +4, r1 +3

  const all = clans.top('all', 'h2');
  assert.deepEqual(all.map(c => [c.rank, c.name, c.points, c.isMine]), [
    [1, 'Hunters', 8, true],
    [2, 'Runners', 6, false],
  ]);
  assert.deepEqual(clans.top('week').map(c => [c.name, c.points]), [['Hunters', 4], ['Runners', 3]]);

  const d = clans.detail(hunters.tag, 'r1')!;
  assert.equal(d.games, 2);
  assert.equal(d.inOtherClan, true);
  assert.deepEqual(d.roster.map(m => [m.role, m.games, m.catches]), [['owner', 1, 1], ['member', 1, 1]]);
  assert.ok(!JSON.stringify(d).includes('"h1"'), 'secret ids must not leak');
});
