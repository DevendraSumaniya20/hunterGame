import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openDb } from '../src/data/db';
import { GameRepository } from '../src/data/GameRepository';
import { Room } from '../src/domain/Room';

const DAY = 24 * 60 * 60 * 1000;
const near = { lat: 1, lng: 1 };
const far = { lat: 2, lng: 2 };

/** Hana hosts; Ravi gets caught 30 s into the chase; Mia escapes when time runs out. */
function playedRoom(t0: number) {
  const room = new Room('AAAAA', 'hana', 'Hana', { headStartSec: 5, durationSec: 60, catchRadiusM: 15 }, '#FF2D55');
  room.join('ravi', 'Ravi', '#5AC8FA');
  room.join('mia', 'Mia');
  room.start('hana', t0);
  room.beginChase(t0 + 5_000);
  room.updateLocation('mia', far, t0 + 6_000);
  room.updateLocation('ravi', near, t0 + 6_000);
  room.updateLocation('hana', near, t0 + 35_000); // Ravi caught after 30 s of chase
  room.timeUp(); // Mia escapes
  return room;
}

function setup() {
  let now = 1_000 * DAY;
  const repo = new GameRepository(openDb(':memory:'), () => now);
  return { repo, at: (t: number) => (now = t), get now() { return now; } };
}

test('saved game shows in each player history from their point of view', () => {
  const { repo, at } = setup();
  const t0 = 1_000 * DAY;
  at(t0 + 65_000);
  const id = repo.saveGame(playedRoom(t0));

  const [ravi] = repo.history('ravi');
  assert.deepEqual(ravi, {
    id, endedAt: t0 + 65_000, winner: 'runners', startRole: 'runner', finalRole: 'helper',
    won: false, catches: 0, caughtBy: 'Hana', survivalSec: 30, players: 3,
  });
  const [mia] = repo.history('mia');
  assert.equal(mia.won, true);
  assert.equal(mia.survivalSec, 60);
  const [hana] = repo.history('hana');
  assert.equal(hana.catches, 1);
  assert.equal(hana.survivalSec, null);
  assert.deepEqual(repo.history('stranger'), []);
});

test('game detail is only for players who took part, and never exposes ids', () => {
  const { repo, at } = setup();
  at(1_000 * DAY + 65_000);
  const id = repo.saveGame(playedRoom(1_000 * DAY));
  assert.equal(repo.gameDetail('stranger', id), null);
  const d = repo.gameDetail('mia', id)!;
  assert.equal(d.durationSec, 60);
  assert.deepEqual(d.timeline.map(t => `${t.byName}>${t.runnerName}`), ['Hana>Ravi']);
  assert.deepEqual(d.roster.map(r => [r.name, r.isMe]).sort(), [['Hana', false], ['Mia', true], ['Ravi', false]]);
  assert.ok(!JSON.stringify(d).includes('"mia"'), 'secret ids must not leak');
});

test('stats add up across games', () => {
  const { repo, at } = setup();
  at(1_000 * DAY);
  repo.saveGame(playedRoom(1_000 * DAY - 70_000));
  repo.saveGame(playedRoom(1_000 * DAY - 70_000));
  assert.deepEqual(repo.stats('ravi'), { games: 2, wins: 0, catches: 0, timesCaught: 2, bestSurvivalSec: 30 });
  assert.deepEqual(repo.stats('hana'), { games: 2, wins: 0, catches: 2, timesCaught: 0, bestSurvivalSec: 0 });
  assert.deepEqual(repo.stats('nobody'), { games: 0, wins: 0, catches: 0, timesCaught: 0, bestSurvivalSec: 0 });
});

test('leaderboards rank hunters by catches and survivors by escapes; week excludes old games', () => {
  const s = setup();
  s.at(900 * DAY);
  s.repo.saveGame(playedRoom(900 * DAY - 70_000)); // old game
  s.at(1_000 * DAY);
  s.repo.saveGame(playedRoom(1_000 * DAY - 70_000));

  const hunters = s.repo.leaderboard('hunters', 'all', 'hana');
  assert.deepEqual(hunters.map(r => [r.rank, r.name, r.value, r.isMe]), [[1, 'Hana', 2, true]]);
  assert.equal(s.repo.leaderboard('hunters', 'week')[0].value, 1);
  const survivors = s.repo.leaderboard('survivors', 'all');
  assert.deepEqual(survivors.map(r => [r.name, r.value, r.isMe]), [['Mia', 2, false]]);
});

test('profile defaults, then saved name and colour win over game names', () => {
  const { repo, at } = setup();
  assert.deepEqual(repo.profile('new'), {
    name: '', color: '#007AFF', stats: { games: 0, wins: 0, catches: 0, timesCaught: 0, bestSurvivalSec: 0 },
  });
  at(1_000 * DAY);
  repo.saveGame(playedRoom(1_000 * DAY - 70_000));
  assert.equal(repo.profile('ravi').color, '#5AC8FA');
  repo.saveProfile('hana', 'Hana B', '#AF52DE');
  assert.equal(repo.profile('hana').name, 'Hana B');
  assert.equal(repo.leaderboard('hunters', 'all')[0].name, 'Hana B');
});
