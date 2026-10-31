import type { IncomingMessage } from 'node:http';

/** Fixed-window counter per key. `hit` returns false once `max` is exceeded in the window. */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }, now: () => number = Date.now) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    hit(key: string): boolean {
      const t = now();
      const w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        if (windows.size > 10_000) for (const [k, v] of windows) if (t - v.start >= windowMs) windows.delete(k);
        return true;
      }
      w.count++;
      return w.count <= max;
    },
  };
}

/** Caller IP. Behind a proxy (Fly, Railway, Render) set TRUST_PROXY=1 to read the forwarded header. */
export function clientIp(req: IncomingMessage): string {
  if (process.env.TRUST_PROXY) {
    const fwd = req.headers['fly-client-ip'] ?? req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}
