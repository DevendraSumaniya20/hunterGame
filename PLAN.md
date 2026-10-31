# Hunting Game — Plan

Real-world GPS tag game. Host = hunter. Runners get a head start, then hunter chases.
Caught runner becomes a **helper** on the hunter's team. Hunters win when every runner is caught;
runners win if the clock runs out.

## Game rules
1. Host creates room → gets 5-letter code. Runners join with code + name.
2. Host presses Start → **head start** (default 60 s). Hunters see no runner positions.
3. **Chase** phase (default 10 min). Hunter team sees every runner live on the map.
4. Server checks distance on every location update. Hunter/helper within catch radius
   (default 15 m) of a runner → runner caught → becomes helper.
5. All runners caught → hunters win. Timer ends → surviving runners win.

## Extra features (suggested, included)
- Runners see only themselves plus a **radar**: distance to nearest hunter, with warning colours.
- Catch feed + haptic buzz when anyone is caught.
- Reconnect: player keeps identity (client `playerId` in socket auth), so a dropped connection rejoins the same seat.
- Host can tune head start / duration / catch radius when creating the room.
- Server is authoritative: clients only send GPS; server decides catches and filters what each player sees.

## Architecture
```
shared/   @hunt/shared — types, socket event contracts, constants, haversine distance
server/   Node + TypeScript + socket.io
  domain/Room.ts          pure game rules (no socket code) — unit tested
  services/RoomManager.ts room registry, timers
  transport/socket.ts     event handlers, input validation, per-player views
app/      React Native CLI (bare) + TypeScript, Apple HIG styling (PlatformColor, light/dark)
  src/data/        socket client + gameService (talks to server)
  src/store/       zustand game store
  src/hooks/       useLocationTracking, useCountdown
  src/components/  Button, Screen, LargeTitle, Section, Row, InputRow, RoleBadge, PlayerList,
                   PhaseBanner, Radar, CatchToast, GameMap
  src/screens/     Home, Lobby, Game, Result (switched by game phase, no router needed)
e2e/      Maestro flows + bot script (node socket client that plays the other side)
```

Packages: socket.io / socket.io-client, zustand, @react-native-community/geolocation,
react-native-maps (Apple Maps on iOS, no key). Haptics via RN core `Vibration`.

## Steps
1. Monorepo (npm workspaces) + shared package
2. Server domain + tests
3. Server transport + room manager
4. RN CLI app: data layer, store, hooks
5. Reusable components + screens
6. iOS build on simulator
7. Maestro flows: host flow, runner-gets-caught flow (bot plays the other side)
8. 3-simulator game: host + 2 runners, catch -> helper -> helper catches last runner

All steps done.

## Run
```bash
npm install && (cd app && npm install && cd ios && bundle exec pod install)
npm run server                      # game server :3000
npm run app                         # Metro :8081
cd app && npx react-native run-ios  # or run-android
```
Real phones: set your computer's LAN IP in `app/src/config.ts`.

## Test
```bash
npm test                                  # server unit + socket tests
cd app && npm run typecheck && npx jest
e2e/run.sh runner | e2e/run.sh host       # 1 simulator + bot player
e2e/multi.sh [HOST RAVI MIA udids]        # 3 simulators, full game
npx tsx e2e/bot.ts host|runner --code X   # bot player for manual play-testing
```
