import type { GameSummary } from '@hunt/shared';
import { gameSubtitle, gameTitle, plural } from '../src/format';

const base: GameSummary = {
  id: 1, endedAt: 0, winner: 'hunters', startRole: 'runner', finalRole: 'runner',
  won: true, catches: 0, caughtBy: null, survivalSec: 600, players: 3,
};

test('titles from each point of view', () => {
  expect(gameTitle({ ...base, winner: 'runners' })).toBe('Escaped');
  expect(gameTitle({ ...base, caughtBy: 'Hana', finalRole: 'helper' })).toBe('Caught by Hana');
  expect(gameTitle({ ...base, startRole: 'hunter', finalRole: 'hunter' })).toBe('Caught everyone');
  expect(gameTitle({ ...base, startRole: 'hunter', finalRole: 'hunter', won: false })).toBe('Runners got away');
});

test('subtitles', () => {
  expect(gameSubtitle({ ...base, startRole: 'hunter', catches: 1 })).toBe('Hunter, 1 catch');
  expect(gameSubtitle({ ...base, survivalSec: 65 })).toBe('Runner, survived 1:05');
  expect(gameSubtitle({ ...base, survivalSec: 30, catches: 2, caughtBy: 'Hana' })).toBe(
    'Runner, survived 0:30, then 2 catches as helper',
  );
  expect(gameSubtitle({ ...base, survivalSec: null })).toBe('Runner');
});

test('plural', () => {
  expect(plural(1, 'game')).toBe('1 game');
  expect(plural(0, 'catch', 'catches')).toBe('0 catches');
});
