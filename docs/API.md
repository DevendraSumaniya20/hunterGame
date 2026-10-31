# API reference

Types are defined in `shared/src/index.ts`. Ids in anything a player receives about **other** players are
public ids (hashes). `:id` in REST paths is the caller's **secret** player id.

## Socket.io (live games)

Connect to the server URL with `auth: { playerId }` (8–64 chars of `[A-Za-z0-9_-]`) and
`transports: ['websocket']`. Invalid ids are rejected with `connect_error: Invalid playerId`.

Requests with an ack reply `{ ok: true, data }` or `{ ok: false, error }`.

### Client → server
| Event | Payload | Ack data | Errors |
|---|---|---|---|
| `room:create` | `{ name, color?, settings?: { headStartSec?, durationSec?, catchRadiusM? } }` | `RoomView` | `Name is required` |
| `room:join` | `{ code, name, color? }` (code any case) | `RoomView` | `Room not found`, `Game already started`, `Room is full`, `Name is required` |
| `room:leave` | — | — | — |
| `game:start` | — | `undefined` | `Only the host can start`, `Game already started`, `Need at least one runner`, `Not in a room` |
| `location:update` | `{ lat, lng }` (invalid values ignored) | — | — |
| `chat:send` | `{ text }` | `ChatMessage` | `Not in a game`, `Message is empty`, `Slow down a little`, `Chat is closed, the game is over` |
| `chat:history` | — | `{ team, messages: ChatMessage[] }` | `Not in a game` |

Names are trimmed and cut to 20 characters. Unknown colours fall back to the default.
Settings are clamped: head start 5–600 s, duration 30–3600 s, catch radius 3–100 m.

### Server → client
| Event | Payload | When |
|---|---|---|
| `session` | `{ roomCode: string \| null }` | On every connect. `null` while the app shows a game → go home. |
| `room:state` | `RoomView` (filtered for this player) | Any change; batched to ≤ 1 per 250 ms per room. |
| `game:caught` | `CatchEvent { runnerId, runnerName, byId, byName, at }` | A runner was caught. |
| `room:closed` | `reason` (`Host left the game`, `Room expired`) | Room deleted. |
| `chat:message` | `ChatMessage { id, team, fromId, name, color, text, at }` | Only to players currently on `team`. |

`RoomView`: `code, hostId, me, phase (lobby|headstart|chase|ended), settings, players[] { id, name, color,
clanTag, role (hunter|runner|helper), connected, location|null }, phaseEndsAt, winner, catches[],
nearestHunterM`.

## REST (`/api`)

JSON in and out. Errors: `{ "error": "message" }` with status 400 (invalid input), 403 (not allowed),
404 (not found), 409 (conflict), 413 (body over 1 KB), 429 (rate limit), 500.
Rate limits per IP: 120 requests/minute overall; 20 new ids/hour.

### Players
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/players` | — | `{ id }` new secret id (CSPRNG) |
| GET | `/api/players/:id` | — | `Profile { name, color, stats { games, wins, catches, timesCaught, bestSurvivalSec } }` |
| PUT | `/api/players/:id` | `{ name, color }` | `Profile` (name 1–20 chars, colour from `PLAYER_COLORS`) |
| GET | `/api/players/:id/games?limit=50&offset=0` | — | `GameSummary[]` newest first |
| GET | `/api/players/:id/games/:gameId` | — | `GameDetail` (404 unless the player took part) |

### Leaderboard
| Method | Path | Response |
|---|---|---|
| GET | `/api/leaderboard?board=hunters\|survivors&period=week\|all&me=:id` | `LeaderboardRow[]` top 20 `{ rank, name, color, value, games, isMe }` |

### Clans
| Method | Path | Body | Response / errors |
|---|---|---|---|
| GET | `/api/players/:id/clan` | — | `ClanDetail` or `null` |
| POST | `/api/players/:id/clan` | `{ name, description?, color? }` | `ClanDetail`; 400 name/description/colour, 409 already in a clan or name taken |
| PATCH | `/api/players/:id/clan` | `{ name?, description?, color? }` | `ClanDetail`; 403 not owner, 409 name taken |
| POST | `/api/players/:id/clan/join` | `{ tag }` (any case) | `ClanDetail`; 404 no clan, 409 in another clan or clan full |
| DELETE | `/api/players/:id/clan` | — | `{ ok: true }`; 404 not in a clan |
| DELETE | `/api/players/:id/clan/members/:memberId` | — | `ClanDetail`; 403 not owner, 400 removing yourself, 404 not a member |
| GET | `/api/clans?q=` | — | `ClanSummary[]` by name (contains) or exact code, top 20 |
| GET | `/api/clans/top?period=week\|all&me=:id` | — | `RankedClan[]` top 20 by points |
| GET | `/api/clans/:tag?me=:id` | — | `ClanDetail` (with `myRole`, `inOtherClan` for the viewer); 404 |

`ClanDetail`: `tag, name, color, memberCount, points, description, createdAt, games, wins,
roster[] { id (public), name, color, role, games, wins, catches, isMe }, myRole, inOtherClan`.

## Other endpoints
| Path | Notes |
|---|---|
| `GET /health` | `ok` (used by Fly health checks) |
| `GET /debug/rooms` | Only with `DEBUG=1`: every room with players and positions. Never enable in production. |
