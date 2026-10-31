import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRateLimiter } from '../src/transport/rateLimit';

test('allows max hits per window per key, then resets', () => {
  let t = 0;
  const limit = createRateLimiter({ windowMs: 1000, max: 3 }, () => t);
  assert.deepEqual([1, 2, 3, 4].map(() => limit.hit('a')), [true, true, true, false]);
  assert.equal(limit.hit('b'), true, 'keys are independent');
  t = 1000;
  assert.equal(limit.hit('a'), true, 'new window');
});
