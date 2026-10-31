import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Radar } from '../src/components/Radar';
import { outcome } from '../src/screens/ResultScreen';

// ResultScreen pulls in the store; keep the real socket from dialing the server.
jest.mock('../src/data/socketClient', () => {
  const noop = { on() {}, emit() {} };
  return { socket: { ...noop, volatile: noop, connected: false }, playerId: 'p-test' };
});

const radarText = (d: number | null) => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Radar distanceM={d} />);
  });
  return tree!.root.findAll(n => typeof n.children[0] === 'string').map(n => n.children[0]).join('|');
};

test.each([
  [null, 'Looking for hunters'],
  [0, 'Hunter right behind you. Move.'],
  [49, 'Hunter right behind you. Move.'],
  [50, 'Hunter nearby'],
  [149, 'Hunter nearby'],
  [150, 'You’re safe for now'],
])('radar at %p m says %s', (d, label) => {
  expect(radarText(d)).toContain(label);
});

test('result wording per role and winner', () => {
  expect(outcome('runner', 'runners')).toBe('You escaped.');
  expect(outcome('helper', 'hunters')).toMatch(/caught and joined the hunters/);
  expect(outcome('helper', 'runners')).toMatch(/other runners escaped/);
  expect(outcome('hunter', 'hunters')).toBe('You caught every runner.');
  expect(outcome('hunter', 'runners')).toMatch(/got away/);
});
