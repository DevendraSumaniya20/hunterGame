import { createServer } from 'node:http';
import { ClanRepository } from './data/ClanRepository';
import { openDb } from './data/db';
import { GameRepository } from './data/GameRepository';
import { createApi } from './transport/http';
import { attachSocket } from './transport/socket';

const PORT = Number(process.env.PORT ?? 3000);

const db = openDb(process.env.DB_PATH ?? 'data/hunt.db');
const games = new GameRepository(db);
const clans = new ClanRepository(db);
const api = createApi(games, clans);

const http = createServer(async (req, res) => {
  if (await api(req, res)) return;
  if (req.url === '/health') return res.writeHead(200).end('ok');
  // Exposes every player's position, so only in DEBUG mode.
  if (process.env.DEBUG && req.url === '/debug/rooms') {
    return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(manager.debugSnapshot(), null, 2));
  }
  res.writeHead(404).end();
});

const { manager } = attachSocket(http, { games, clans });
http.listen(PORT, () => console.log(`Hunting game server on :${PORT}`));
