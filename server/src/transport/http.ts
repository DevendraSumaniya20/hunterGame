import type { IncomingMessage, ServerResponse } from 'node:http';
import { Board, PLAYER_COLORS, Period, PlayerColor } from '@hunt/shared';
import type { GameRepository } from '../data/GameRepository';

const PLAYER_ID = /^[\w-]{8,64}$/;
const MAX_BODY_BYTES = 1024;

type Handler = (m: RegExpMatchArray, url: URL, req: IncomingMessage) => Promise<unknown> | unknown;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** REST API under /api. Returns false when the request is not an API route. */
export function createApi(repo: GameRepository) {
  const routes: [string, RegExp, Handler][] = [
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
      if (!route) throw new HttpError(404, 'Not found');
      const data = await route[2](url.pathname.match(route[1])!, url, req);
      send(res, 200, data);
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      send(res, e instanceof HttpError ? e.status : 500, { error: e instanceof HttpError ? e.message : 'Server error' });
    }
    return true;
  };
}

function playerId(raw: string): string {
  const id = decodeURIComponent(raw);
  if (!PLAYER_ID.test(id)) throw new HttpError(400, 'Invalid player id');
  return id;
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
