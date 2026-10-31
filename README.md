# hunterGame

Outdoor GPS tag for phones. The host is the hunter; everyone else runs. After a head start the
hunter sees every runner on the map. Caught runners become **helpers** and hunt the rest.
Hunters win by catching everyone; runners win if anyone is free when the clock runs out.

- **App**: React Native CLI (iOS + Android), TypeScript, zustand, react-native-maps, Apple HIG styling
- **Server**: Node + TypeScript, socket.io for live games, REST + SQLite (`node:sqlite`) for history and stats
- **Shared**: `shared/` holds the event contracts and types used by both sides

## Features

- Rooms with a 5-letter code, configurable head start, game length and catch radius
- Live map: hunters see runners after the head start; runners get a distance radar
- Server-side catch detection; caught runners switch teams and get the hunter map
- Catch alerts with vibration, reconnect keeps your seat, server restart sends players home cleanly
- Tabs: Play, History (per-game detail), Leaderboard (hunters / survivors, week / all time), Clans, Profile
  (name, pin colour, games played, wins, catches, best escape, haptics, how to play)
- Clans: create, share a 6-character code, join by code, search by name or code, top clans
  (3 points per win + 1 per catch, this week / all time), owner can edit and remove members,
  ownership passes on when the owner leaves; clan code shows next to players in game lobbies
- Secret per-install player id; other players only ever see a hash of it

## Run

```bash
npm install && (cd app && npm install && cd ios && bundle exec pod install)
DEBUG=1 npm run server              # game server on :3000 (DEBUG adds logs and /debug/rooms)
npm run app                         # Metro on :8081
cd app && npx react-native run-ios  # or run-android
```

Set your computer's LAN IP in `app/src/config.ts` so phones on the same Wi-Fi can reach the server.
Android maps need a Google Maps key: add `MAPS_API_KEY=...` to `app/android/local.properties` (git-ignored).

## Test

```bash
npm test             # server (node:test) + app (jest)
npm run test:e2e     # Maestro flows on a simulator, with a bot player
e2e/multi.sh         # full game on 3 simulators
```

See [docs/QA.md](docs/QA.md) for the test plan and case catalog, and [PLAN.md](PLAN.md) for the architecture.
