import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Board, PLAYER_COLORS, Period, PlayerColor } from '@hunt/shared';
import { ClanError, ClanRepository } from '../data/ClanRepository';
import type { GameRepository } from '../data/GameRepository';
import { clientIp, createRateLimiter } from './rateLimit';

const PLAYER_ID = /^[\w-]{8,64}$/;
const MAX_BODY_BYTES = 1024;

type Handler = (m: RegExpMatchArray, url: URL, req: IncomingMessage) => Promise<unknown> | unknown;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** REST API under /api. Returns false when the request is not an API route. */
export function createApi(repo: GameRepository, clans: ClanRepository) {
  // Per-IP limits: general API use, and new player ids (cheap to call, so tighter).
  const apiLimit = createRateLimiter({ windowMs: 60_000, max: 120 });
  const idLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 20 });

  const routes: [string, RegExp, Handler][] = [
    // New secret player id from a CSPRNG. The app asks once per install and stores it.
    [
      'POST',
      /^\/api\/players$/,
      (_m, _u, req) => {
        if (!idLimit.hit(clientIp(req))) throw new HttpError(429, 'Too many requests, try again later');
        return { id: `p-${randomBytes(24).toString('base64url')}` };
      },
    ],
    ['GET', /^\/api\/players\/([^/]+)$/, m => repo.profile(playerId(m[1]))],
    [
      'PUT',
      /^\/api\/players\/([^/]+)$/,
      async (m, _url, req) => {
        const id = playerId(m[1]);
        const body = (await readJson(req)) as { name?: unknown; color?: unknown };
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 20) : '';
        if (!name) throw new HttpError(400, 'Name is required');
        if (!PLAYER_COLORS.includes(body.color as PlayerColor)) throw new HttpError(400, 'Unknown colour');
        repo.saveProfile(id, name, body.color as PlayerColor);
        return repo.profile(id);
      },
    ],
    [
      'GET',
      /^\/api\/players\/([^/]+)\/games$/,
      (m, url) => repo.history(playerId(m[1]), intParam(url, 'limit', 50, 1, 100), intParam(url, 'offset', 0, 0, 1e6)),
    ],
    [
      'GET',
      /^\/api\/players\/([^/]+)\/games\/(\d+)$/,
      m => repo.gameDetail(playerId(m[1]), Number(m[2])) ?? notFound(),
    ],
    // ---- clans: actions on "my clan" use the secret id in the path, like the profile ----
    ['GET', /^\/api\/players\/([^/]+)\/clan$/, m => clans.myClan(playerId(m[1]))],
    ['POST', /^\/api\/players\/([^/]+)\/clan$/, async (m, _u, req) => clans.create(playerId(m[1]), await readObject(req))],
    ['PATCH', /^\/api\/players\/([^/]+)\/clan$/, async (m, _u, req) => clans.update(playerId(m[1]), await readObject(req))],
    [
      'POST',
      /^\/api\/players\/([^/]+)\/clan\/join$/,
      async (m, _u, req) => clans.join(playerId(m[1]), (await readObject(req)).tag),
    ],
    [
      'DELETE',
      /^\/api\/players\/([^/]+)\/clan$/,
      m => {
        clans.leave(playerId(m[1]));
        return { ok: true };
      },
    ],
    [
      'DELETE',
      /^\/api\/players\/([^/]+)\/clan\/members\/([\w-]{1,32})$/,
      m => clans.removeMember(playerId(m[1]), m[2]),
    ],
    ['GET', /^\/api\/clans$/, (_m, url) => clans.search(url.searchParams.get('q'))],
    [
      'GET',
      /^\/api\/clans\/top$/,
      (_m, url) => clans.top(url.searchParams.get('period') === 'week' ? 'week' : 'all', optionalId(url)),
    ],
    [
      'GET',
      /^\/api\/clans\/([A-Za-z0-9]{6})$/,
      (m, url) => clans.detail(m[1], optionalId(url)) ?? notFound(),
    ],
    [
      'GET',
      /^\/api\/leaderboard$/,
      (_m, url) => {
        const board = url.searchParams.get('board') === 'survivors' ? 'survivors' : 'hunters';
        const period = url.searchParams.get('period') === 'week' ? 'week' : 'all';
        const me = url.searchParams.get('me') ?? undefined;
        return repo.leaderboard(board as Board, period as Period, me);
      },
    ],
  ];

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = new URL(req.url ?? '/', 'http://local');
    if (!url.pathname.startsWith('/api/')) return false;
    const route = routes.find(([method, re]) => method === req.method && re.test(url.pathname));
    try {
      if (!apiLimit.hit(clientIp(req))) throw new HttpError(429, 'Too many requests, slow down');
      if (!route) throw new HttpError(404, 'Not found');
      const data = await route[2](url.pathname.match(route[1])!, url, req);
      send(res, 200, data);
    } catch (e) {
      const known = e instanceof HttpError || e instanceof ClanError;
      if (!known) console.error(e);
      send(res, known ? e.status : 500, { error: known ? e.message : 'Server error' });
    }
    return true;
  };
}

function playerId(raw: string): string {
  const id = decodeURIComponent(raw);
  if (!PLAYER_ID.test(id)) throw new HttpError(400, 'Invalid player id');
  return id;
}

/** `?me=` lets lists mark the viewer's own row; ignored if malformed. */
function optionalId(url: URL): string | undefined {
  const me = url.searchParams.get('me');
  return me && PLAYER_ID.test(me) ? me : undefined;
}

async function readObject(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readJson(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
  return body as Record<string, unknown>;
}

function notFound(): never {
  throw new HttpError(404, 'Not found');
}

function intParam(url: URL, key: string, fallback: number, min: number, max: number) {
  const n = Number(url.searchParams.get(key) ?? fallback);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) reject(new HttpError(413, 'Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new HttpError(400, 'Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(data));
}
