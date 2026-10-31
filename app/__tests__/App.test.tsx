/**
 * @format
 */

import { formatClock } from '../src/hooks/useCountdown';

test('formatClock pads seconds', () => {
  expect(formatClock(0)).toBe('0:00');
  expect(formatClock(65)).toBe('1:05');
  expect(formatClock(600)).toBe('10:00');
});
