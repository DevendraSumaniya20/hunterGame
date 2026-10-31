# Architecture

```
┌──────────── app (React Native CLI) ────────────┐        ┌────────────── server (Node) ───────────────┐
│ screens ── stores (zustand) ── data layer      │        │ transport ── services ── domain             │
│  Home/Lobby/Game/Result      gameStore  gameService ──socket.io──▶ socket.ts ─ RoomManager ─ Room       │
│  History/Leaderboard/Clans   chatStore  api (REST) ──HTTPS /api──▶ http.ts   ─ GameRepository ┐         │
│  Profile/Chat                profileStore storage                              ClanRepository ┴ SQLite │
└────────────────────────────────────────────────┘        └─────────────────────────────────────────────┘
                     shared/ (types, events, constants, distance) used by both
```

## Repository layout
- `shared/src/index.ts` — every contract: roles, phases, settings and limits, `RoomView`, socket event
  maps, REST DTOs, chat types, `distanceM` (haversine), `isHunterTeam`, `teamOf`.
- `server/` — npm workspace with `shared`. Run with `tsx` (TypeScript directly).
- `app/` — standalone RN project (not a workspace: RN CLI and hoisting do not mix well); it links
  `@hunt/shared` via `file:../shared` and Metro's `watchFolders`.
- `e2e/` — Maestro flows and helper scripts. `docs/` — documentation.

## Server layers
| Layer | Files | Responsibility |
|---|---|---|
| Domain | `domain/Room.ts`, `domain/ids.ts` | Pure rules. No I/O; callers pass `now`. Join, start, head start → chase, catches, end, per-viewer views, team chat logs. |
| Services | `services/RoomManager.ts` | Room registry, player→room index, phase timers (`setTimeout`, unref'd), ended-room expiry (10 min), `onEnded` hook fired once. |
| Data | `data/db.ts`, `data/GameRepository.ts`, `data/ClanRepository.ts` | SQLite (`node:sqlite`): schema, saved games, history, stats, leaderboards, profiles, clans. |
| Transport | `transport/socket.ts`, `transport/http.ts`, `transport/publicIds.ts`, `transport/rateLimit.ts` | socket.io events, REST router, input validation, secret→public id mapping, rate limits. |
| Entry | `index.ts` | Wires DB, repositories, HTTP server, socket.io; `/health`; `DEBUG` extras. |

### Game flow
1. `room:create` → `RoomManager.create` (5-letter code, settings clamped) → creator is hunter.
2. `room:join` → `Room.join` (lobby only, max 20, reconnect with the same id keeps the seat).
3. `game:start` (host) → phase `headstart`, timers scheduled for chase start and time-up.
4. `location:update` → `Room.updateLocation`; during `chase` `resolveCatches` turns runners within the
   radius into helpers, emits `game:caught`, ends the game when no runners remain.
5. Timer: `beginChase` (also resolves catches) → `timeUp` → `ended`. `onEnded` saves the game
   (`GameRepository.saveGame`) and arms the 10-minute expiry.
6. Every change calls `onChange`; the transport batches `room:state` broadcasts to at most one per
   250 ms per room, building a separate `RoomView` for each player.

### Visibility (`Room.viewFor`)
- A player always sees themselves. After the game everyone sees everyone.
- Hunter team: sees hunter-team players in lobby/head start, and everyone during the chase.
- Runners: see nobody else; they get `nearestHunterM` (distance to the closest hunter or helper).

### Identity
- The app's player id is a **secret** (bearer token for profile, history, clans, seat in a room).
- New installs call `POST /api/players` (24 random bytes, base64url). Older installs keep their id.
- Everything sent to other players goes through `publicId(secret)` (`sha256`, first 12 chars):
  `publicView`, `publicCatch`, `publicMessage`. Tests assert secrets never appear on the wire.

### Team chat
- `Room` keeps two logs (`hunters`, `runners`), 100 messages each, 300-character messages, 5 messages
  per 5 s per player, closed once the game ends.
- `chat:send` stores the message in the sender's current team log and emits `chat:message` only to
  sockets whose player is currently on that team (checked per socket at send time).
- `chat:history` returns only the caller's current team log, so a caught runner gets the hunters' log.

### Connections
- Each socket joins its room channel and a `player:<id>` channel. On disconnect the player is marked
  offline only if no other socket of the same player remains.
- On connect the server emits `session { roomCode }`; the app uses it to leave a game the server no
  longer knows (e.g. after a server restart).

## Database (SQLite, `DB_PATH`, default `server/data/hunt.db`)
| Table | Columns (key) | Notes |
|---|---|---|
| `players` | **id**, name, color, updated_at | Profile; updated on save and on profile edits. |
| `games` | **id**, code, winner, settings (JSON), timeline (JSON), chase_started_at, ended_at | One row per finished game. |
| `game_players` | **(game_id, player_id)**, name, color, start_role, final_role, catches, caught_by, survival_sec, won | Per-player result; `survival_sec` only for runners once the chase started. |
| `clans` | **id**, tag (unique code), name (unique, case-insensitive), description, color, created_at | |
| `clan_members` | **player_id** (one clan per player), clan_id, role (owner/member), joined_at | Cascade-deleted with the clan. |

## App layers
| Layer | Files | Responsibility |
|---|---|---|
| Data | `data/socketClient.ts`, `data/gameService.ts`, `data/api.ts`, `data/storage.ts` | Socket (auth with the stored id), live-game requests with acks and timeouts, REST client, AsyncStorage. |
| State | `store/gameStore.ts`, `store/chatStore.ts`, `store/profileStore.ts` | Live game view and actions; team chat following the player's current team; name/colour/haptics. |
| Hooks | `hooks/useLocationTracking.ts`, `useCountdown.ts`, `useApi.ts` | GPS watch + initial fix + 5 s heartbeat; countdown clock; load/reload REST data. |
| UI | `screens/*`, `components/*`, `theme.ts`, `format.ts` | Screens switch on the server phase (no navigation library); tab bar for home screens; Apple HIG tokens. |

### Key decisions
- **Server authoritative**: clients send GPS and intents only; distances, roles and catches are decided
  on the server.
- **No navigation library**: the live screen is derived from the game phase; home uses a custom tab bar
  and small in-tab stacks (History → detail, Clans → clan/form).
- **Location**: foreground only (`@react-native-community/geolocation`), `distanceFilter` 2 m, one
  initial fix and a 5 s heartbeat so a phone standing still is still visible; sends are `volatile`
  (dropped while offline instead of replayed).
- **Keyboard**: `KeyboardScroll` (react-native-keyboard-controller) on every screen with inputs; Gifted
  Chat handles the chat keyboard; closing chat dismisses the keyboard.
- **Single server instance**: live rooms are in memory, so production runs exactly one machine.
