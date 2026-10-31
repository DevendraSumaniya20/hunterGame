// Scripted second player for e2e tests and solo play-testing.
//   host:   tsx e2e/bot.ts host [--head 5] [--start-after 3]   prints ROOM_CODE=XXXXX, starts once a runner joins
//   runner: tsx e2e/bot.ts runner --code XXXXX                  joins and stands still
//   runner: tsx e2e/bot.ts runner --listen 4001                 waits for POST /join with the code as body (Maestro)
// Bot stands at --lat/--lng (default Apple Park, the simulator's default spot).
import { createServer } from 'node:http';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@hunt/shared';

const [mode, ...rest] = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = rest.indexOf(`--${k}`);
  return i >= 0 ? rest[i + 1] : d;
};
const url = arg('url', 'http://localhost:3000');
const spot = { lat: Number(arg('lat', '37.3349')), lng: Number(arg('lng', '-122.009')) };

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
  auth: { playerId: `bot-${mode}-${Date.now()}` },
});
const log = (...a: unknown[]) => console.log(`[bot:${mode}]`, ...a);

socket.on('connect_error', e => log('connect error', e.message));
socket.on('game:caught', e => log(`CAUGHT ${e.runnerName} by ${e.byName}`));
socket.on('chat:message', m => log(`CHAT ${m.team} ${m.name}: ${m.text}`));
socket.on('room:closed', r => (log('room closed:', r), process.exit(0)));

let started = false;
socket.on('room:state', v => {
  log(`phase=${v.phase} players=${v.players.map(p => `${p.name}:${p.role}`).join(',')}`);
  if (v.phase === 'ended') log(`WINNER=${v.winner}`);
  if (mode === 'host' && !started && v.phase === 'lobby' && v.players.some(p => p.role === 'runner')) {
    started = true;
    // Hunter-team message: runners must never receive it.
    socket.emit('chat:send', { text: 'BOT HUNTER SECRET' }, r => log('chat', r.ok ? 'sent' : r.error));
    setTimeout(() => socket.emit('game:start', r => log('start', r.ok ? 'ok' : r.error)), Number(arg('start-after', '3')) * 1000);
  }
});

// Re-send position so the server always has a fresh fix.
setInterval(() => socket.emit('location:update', spot), 2000);
socket.emit('location:update', spot);

if (mode === 'host') {
  socket.emit(
    'room:create',
    { name: 'BotHunter', settings: { headStartSec: Number(arg('head', '5')), catchRadiusM: 30 } },
    r => (r.ok ? console.log(`ROOM_CODE=${r.data.code}`) : log(r.error)),
  );
} else if (mode === 'runner') {
  const join = (code: string) =>
    socket.emit('room:join', { code, name: 'BotRunner' }, r => log('join', r.ok ? r.data.code : r.error));
  const port = arg('listen', '');
  if (port) {
    createServer((req, res) => {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => (join(body.trim()), res.end('ok')));
    }).listen(Number(port), () => log(`waiting for POST :${port}/join`));
  } else join(arg('code', ''));
} else {
  console.error('usage: bot.ts host|runner [--code X] [--listen PORT]');
  process.exit(1);
}
