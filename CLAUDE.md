# CLAUDE.md — hunterGame

Outdoor GPS tag. Host = hunter, others = runners. After a head start the hunter team sees runners on a
map; the server catches a runner when a hunter/helper is within the catch radius, and the runner becomes
a **helper** (hunter team). Hunters win if everyone is caught; runners win if anyone is free at time-up.
Extras: history, stats, leaderboards, clans, per-team chat.

Repo: github.com/DevendraSumaniya20/hunterGame (branch `main`). Docs: `docs/FEATURES.md` (rules, screens),
`docs/ARCHITECTURE.md`, `docs/API.md` (all events/endpoints), `docs/SETUP.md`, `docs/QA.md`, `DEPLOY.md`.
Keep these docs updated in the same change as the code.

## Layout

```
shared/src/index.ts      ALL contracts: types, socket events, REST DTOs, constants, distanceM, teamOf
server/src/
  domain/Room.ts         pure game rules (no I/O, caller passes `now`): join/start/chase/catch/end, chat, viewFor
  domain/ids.ts          publicId(secret) = sha256 slice — the only id other players ever see
  services/RoomManager   room registry, phase timers (unref'd), onEnded hook (saves the game once)
  data/db.ts             node:sqlite schema (players, games, game_players, clans, clan_members)
  data/GameRepository    save game, history, game detail, stats, leaderboard, profiles
  data/ClanRepository    clans: create/join/leave/remove/update/search/top; ClanError(status)
  transport/socket.ts    socket.io handlers, validation, per-viewer filtered views, team-only chat delivery
  transport/http.ts      REST under /api (tiny regex router)
  transport/publicIds.ts maps secret ids -> public ids on everything sent to clients
  index.ts               wiring; DEBUG=1 adds logs + GET /debug/rooms
app/                     React Native CLI 0.88 (NOT Expo), TypeScript, zustand
  App.tsx                providers (GestureHandler, KeyboardProvider, SafeArea); screen = server phase
  src/config.ts          DEV_HOST = Mac LAN IP (update when it changes)
  src/data/              socketClient (secret id in AsyncStorage), gameService (socket), api (REST), storage
  src/store/             gameStore (live game), profileStore (name/colour/haptics), chatStore (team chat)
  src/screens/           Home(Play), Lobby, Game, Result, HomeTabs, History, GameDetail, Leaderboard,
                         Clans, ClanDetail, ClanForm, Profile, Chat (Gifted Chat in a Modal)
  src/components/        Screen, LargeTitle, Section, Row, InputRow, Button, SegmentedControl, TabBar,
                         TabIcon, Avatar, ColorPicker, PlayerList, PlayerMarker, GameMap, PhaseBanner,
                         Radar, CatchToast, ClanView, ChatButton, EmptyState, KeyboardScroll
  src/theme.ts           Apple HIG tokens: PlatformColor semantic colours, type scale, spacing
e2e/                     Maestro flows + bot.ts (scripted second player) + run.sh / multi.sh / live_host.sh
```

## Commands

```bash
DEBUG=1 npm run server                 # :3000, sqlite at server/data/hunt.db (git-ignored)
npm run app                            # Metro :8081
cd app && npx react-native run-ios     # or run-android; device build needs team N9VZ752MDY selected
npm test                               # server (node:test) + app (jest) — must stay green
npm run typecheck && (cd app && npx eslint .)
e2e/run.sh edge|clans|runner|host      # Maestro on one simulator (DEVICE=<udid|emulator-5554>)
e2e/multi.sh HOST RAVI MIA             # 3-simulator game incl. helper switch + team chat
e2e/live_host.sh                       # simulator hosts a room for a real phone (prints ROOM_CODE)
```

## Sharing / production

See `DEPLOY.md`. Debug builds use `DEV_HOST` (LAN); release builds use `PROD_SERVER_URL` (https) in
`app/src/config.ts`. Server ships via the root `Dockerfile` + `fly.toml` (one machine, volume at /data,
no DEBUG, TRUST_PROXY=1). New installs get their secret id from `POST /api/players` (CSPRNG, rate-limited).

## Rules for changes

- Contracts live in `shared/`; change them first, then server, then app.
- Server is authoritative. Clients only send GPS/intent; never trust client roles, distances or ids.
- **Secret ids**: the app's player id is a bearer secret (profile, history, clan actions). Anything sent
  to *other* players must go through `publicId` / `publicView` / `publicMessage`. Tests assert no leaks.
- Visibility: runners never see other positions mid-game; hunters see runners only in `chase`.
- Chat is per team (`teamOf(role)`): delivery is filtered per socket at send time; a caught runner moves
  to hunter chat and does not keep runner history. Chat closes when the game ends.
- Keep layers: domain has no I/O; repositories have no socket code; screens stay dumb (logic in stores).
- UI: Apple HIG look via `theme.ts` tokens and the existing components; reuse before adding new ones.
- Any screen with text fields scrolls with `KeyboardScroll` (keyboard-controller's KeyboardAwareScrollView),
  never a bare ScrollView/KeyboardAvoidingView; chat uses Gifted Chat's own keyboard handling.
- Every behaviour change gets a test at the lowest layer that can prove it; UI flows get a Maestro step.
- Commit/push only when asked; conventional-commit messages.

## Gotchas (learned the hard way)

- Not Expo. Add native libs with npm + `cd app/ios && bundle exec pod install`, then rebuild native.
- Podfile `post_install` raises old pod deployment targets (AsyncStorage resource bundle declared iOS 13).
- `babel.config.js`: `react-native-worklets/plugin` must stay last (Reanimated 4, needed by Gifted Chat).
- `LogBox.ignoreLogs` hides one harmless Gifted Chat/Reanimated warning; its toast covered buttons in E2E.
- Android Google Maps needs `MAPS_API_KEY` in `app/android/local.properties`; without it the game map
  crashes on Android (iOS uses Apple Maps, no key). Android E2E covers edge + clans only for now.
- Android dev shows a "nearby devices" (local network) prompt because the server is on the LAN.
- Debug builds download the JS bundle after a data clear: `common/launch.yaml` waits up to 2 min.
- Maestro: iOS joins a pressable row's texts into one label → match with regex (`"Caught by X.*"`);
  first keystrokes can drop → text entry is wrapped in `retry` + `assertVisible`; `copyTextFrom` returns
  the accessibility label ("Room code A B C D E") → strip it.
- jest: `jest.mock` factories may only use variables named `mock*`; keep fake state inside the factory.
  `jest.setup.js` mocks storage, the REST api and react-native-keyboard-controller (its own mock is ESM).
- iOS simulators here use the hardware keyboard, so the on-screen keyboard never shows; check keyboard
  layout on the Android emulator (screenshot `e2e/screens/clans_keyboard`).
- macOS `sed` has no `\b`; use python for multi-line or word-boundary edits.
- This Mac has no Simulator.app GUI; simulators run headless (`xcrun simctl`), and extra simulators have
  been deleted between sessions — recreate with `xcrun simctl create` if `multi.sh` reports "not connected".
- E2E runs write to the dev database (many "BotHunter"/"E2E …" rows). Point `DB_PATH` elsewhere for clean demos.

## Status (2026-10-31)

Done: game loop, map/radar, helpers, history/stats/leaderboards, clans, team chat, HIG UI, 3-device E2E.
Open: deploy (needs the user's Fly/Railway account); Android Maps key; rebuild + reinstall on the user's
iPhone (new native libs); background location. Docker image not test-built locally (no Docker on this Mac).
