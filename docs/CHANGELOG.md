# Changelog

All work on `main` at github.com/DevendraSumaniya20/hunterGame.

## e422fda — Production setup for sharing
- `POST /api/players` issues secret player ids from a CSPRNG; the app requests one on first launch
  (retry with backoff).
- Per-IP REST rate limits (120/min, 20 new ids/hour), `TRUST_PROXY` support.
- Release builds use `PROD_SERVER_URL` (https); debug builds keep the LAN server.
- `Dockerfile`, `.dockerignore`, `fly.toml` (one machine, `/data` volume, no `DEBUG`), `DEPLOY.md`.

## 4148d84 — Keyboard-aware scrolling
- `KeyboardScroll` on Play, Profile, Clans and the clan form: the focused field scrolls above the keyboard.
- Fixed: host's chat sometimes titled "Runner team" (team now read from live game state).

## 88eb509 — Team chat
- Gifted Chat over socket.io: separate hunter/runner channels, delivery only to the sender's current
  team, caught runners move to the hunter chat, unread badge, limits (300 chars, 5 per 5 s, 100 kept).
- Fixed: Android keyboard stayed open after closing chat and covered the Leave button; duplicate
  deliveries counted twice as unread; a library warning toast covered the Done button.
- `CLAUDE.md` project briefing.

## 9a750e7 — Clans
- Create, share code, join by code, search, top clans (points), owner edit/remove, ownership hand-over,
  clan code next to players in lobbies.

## 74092a8 — First public commit
- Game: rooms, head start, chase, server-side catches, helpers, results.
- Map with role pins and catch circles, runner radar, catch toast with vibration, phase banner.
- Persistence (SQLite): history with game details, stats, leaderboards, profiles.
- Tabs: Play, History, Leaderboard, Profile. Apple HIG design. Stable player id (AsyncStorage).
- Hardening and fixes found while testing:
  - phones standing still were invisible (initial fix + 5 s heartbeat);
  - map snapped back to the user and started zoomed out (centre on first fix, auto-fit for hunters);
  - code review fixes: room switching kept old updates, ended rooms never expired, stale state after
    leaving, host's Done wiped others' results, last runner leaving in head start, broadcast flood,
    offline position bursts, disconnect scan, Android pins, fractional minutes;
  - name not remembered between games; Android room-code typing garbled by live uppercasing;
    "1 games" wording; colour picker state not announced by VoiceOver;
  - secret ids hidden from other players (public hashes).
- Tests: node:test server suite, jest app suite, Maestro flows (single device, bot player, 3 simulators).
