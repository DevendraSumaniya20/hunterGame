import type { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { Ack, ClientToServerEvents, LatLng, PLAYER_COLORS, PlayerColor, ServerToClientEvents } from '@hunt/shared';
import type { GameRepository } from '../data/GameRepository';
import { GameError, Room } from '../domain/Room';
import { RoomManager } from '../services/RoomManager';
import { publicCatch, publicView } from './publicIds';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, { playerId: string }>;

// GPS fixes arrive often; batch the per-viewer room:state fan-out to at most one per window.
const BROADCAST_MS = 250;
// Every socket of a player joins this room, so "is this player still online?" is a set lookup.
const playerChannel = (playerId: string) => `player:${playerId}`;

export function attachSocket(http: HttpServer, repo?: GameRepository) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, { playerId: string }>(http, {
    cors: { origin: '*' },
  });

  const socketsIn = (room: Room) =>
    [...(io.sockets.adapter.rooms.get(room.code) ?? [])]
      .map(id => io.sockets.sockets.get(id) as GameSocket | undefined)
      .filter((s): s is GameSocket => !!s);

  const queued = new Set<string>();
  const manager = new RoomManager({
    // Each player gets their own filtered view, so no plain room broadcast.
    onChange: room => {
      if (queued.has(room.code)) return;
      queued.add(room.code);
      setTimeout(() => {
        queued.delete(room.code);
        socketsIn(room).forEach(s => s.emit('room:state', publicView(room.viewFor(s.data.playerId))));
      }, BROADCAST_MS).unref();
    },
    onCatch: (room, events) =>
      events.forEach(e => {
        debug(`catch ${room.code} ${e.byName} caught ${e.runnerName}`);
        io.to(room.code).emit('game:caught', publicCatch(e));
      }),
    onEnded: room => {
      try {
        repo?.saveGame(room);
      } catch (e) {
        console.error('Could not save game', room.code, e); // never break the live game over storage
      }
    },
    onClose: (room, reason) => {
      io.to(room.code).emit('room:closed', reason);
      io.in(room.code).socketsLeave(room.code);
    },
  });

  io.use((socket, next) => {
    const id = socket.handshake.auth?.playerId;
    if (typeof id !== 'string' || !/^[\w-]{8,64}$/.test(id)) return next(new Error('Invalid playerId'));
    socket.data.playerId = id;
    next();
  });

  io.on('connection', (socket: GameSocket) => {
    const { playerId } = socket.data;
    socket.join(playerChannel(playerId));
    // A player switching rooms must stop receiving the old room's broadcasts.
    const roomSwitcher = () => {
      const prev = manager.roomOf(playerId);
      return (room: Room) => {
        if (prev && prev !== room) socket.leave(prev.code);
        socket.join(room.code);
      };
    };

    // Reconnect: put the socket back in its room and refresh everyone.
    const existing = manager.roomOf(playerId);
    debug(`connect ${playerId} ${socket.handshake.address} room=${existing?.code ?? '-'}`);
    socket.emit('session', { roomCode: existing?.code ?? null });
    if (existing) {
      socket.join(existing.code);
      manager.setConnected(playerId, true);
    }

    socket.on('room:create', (p, ack) =>
      handle(ack, () => {
        const switchRooms = roomSwitcher();
        const room = manager.create(playerId, cleanName(p?.name), p?.settings ?? {}, cleanColor(p?.color));
        debug(`create ${room.code} ${playerId} ${p.name}`);
        switchRooms(room);
        return publicView(room.viewFor(playerId));
      }),
    );

    socket.on('room:join', (p, ack) =>
      handle(ack, () => {
        const code = String(p?.code ?? '').trim().toUpperCase();
        const switchRooms = roomSwitcher();
        const room = manager.join(playerId, code, cleanName(p?.name), cleanColor(p?.color));
        debug(`join ${room.code} ${playerId} ${p.name}`);
        switchRooms(room);
        manager.setConnected(playerId, true); // broadcasts the new player to the lobby
        return publicView(room.viewFor(playerId));
      }),
    );

    socket.on('room:leave', () => {
      const room = manager.roomOf(playerId);
      if (room) socket.leave(room.code);
      manager.leave(playerId);
    });

    socket.on('game:start', ack => handle(ack, () => {
      manager.start(playerId);
      return undefined;
    }));

    socket.on('location:update', p => {
      if (!isLatLng(p)) return;
      debug(`loc ${playerId} ${p.lat},${p.lng}`);
      manager.updateLocation(playerId, { lat: p.lat, lng: p.lng });
    });

    socket.on('disconnect', reason => {
      debug(`disconnect ${playerId} ${reason}`);
      // Rooms are already left here, so any remaining member is another live socket of this player.
      if (!io.sockets.adapter.rooms.get(playerChannel(playerId))?.size) manager.setConnected(playerId, false);
    });
  });

  return { io, manager };
}

const debug = (msg: string) => {
  if (process.env.DEBUG) console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
};

function handle<T>(ack: Ack<T> | undefined, fn: () => T) {
  if (typeof ack !== 'function') return;
  try {
    ack({ ok: true, data: fn() });
  } catch (e) {
    if (!(e instanceof GameError)) console.error(e);
    ack({ ok: false, error: e instanceof GameError ? e.message : 'Server error' });
  }
}

function cleanName(name: unknown): string {
  const n = typeof name === 'string' ? name.trim().slice(0, 20) : '';
  if (!n) throw new GameError('Name is required');
  return n;
}

function cleanColor(color: unknown): PlayerColor | undefined {
  return PLAYER_COLORS.includes(color as PlayerColor) ? (color as PlayerColor) : undefined;
}

function isLatLng(p: unknown): p is LatLng {
  const { lat, lng } = (p ?? {}) as LatLng;
  return (
    typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}
