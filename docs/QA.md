# QA architecture

Tests follow the code's layers. Most rules are checked in fast unit tests; only behaviour that needs a real
socket, a real app or a real phone goes higher up.

```
            ┌───────────────────────┐
            │ Field test (manual)   │  real phones, real GPS, outdoors
          ┌─┴───────────────────────┴─┐
          │ E2E – Maestro (simulator) │  full games, 1–3 devices + bot player
        ┌─┴───────────────────────────┴─┐
        │ Integration – socket.io       │  real server + clients on a random port
      ┌─┴───────────────────────────────┴─┐
      │ Unit – domain, manager, store, UI │  pure logic, mock clock, fake socket
      └───────────────────────────────────┘
```

| Layer | Where | Runner | Time |
|---|---|---|---|
| Domain rules | `server/test/room*.test.ts` | node:test via tsx | < 1 s |
| Room manager + timers | `server/test/roomManager*.test.ts` | node:test, `mock.timers` | < 1 s |
| Socket integration | `server/test/socket.test.ts` | node:test + socket.io-client | ~3 s |
| App store / UI | `app/__tests__/*` | jest (`@react-native/jest-preset`) | ~5 s |
| E2E | `e2e/flows/*.yaml` | Maestro on iOS simulator / Android emulator | 1–3 min each |
| Field | checklist below | people | 15 min |

## Commands

```bash
npm test                    # server + app unit/integration
npm run test:e2e            # edge cases, runner flow, host flow (1 simulator + bot)
e2e/multi.sh                # 3-simulator game (host + 2 runners)
DEVICE=emulator-5554 e2e/run.sh runner   # same flows on Android
```

E2E needs: `DEBUG=1 npm run server`, Metro (`npm run app`) and the app installed on the device.

## Test-case catalog

### Game rules (domain)
| ID | Case | Test |
|---|---|---|
| R1 | Only host can start; needs ≥ 1 runner | room.test `start needs host and a runner` |
| R2 | No catches during head start; catch when chase begins | room.test |
| R3 | Helper (caught runner) can catch; last catch ends game, hunters win | room.test |
| R4 | Time up with runners left: runners win | room.test |
| R5 | Late join rejected; reconnect with same id allowed | room.test |
| R6 | Runners see only themselves + radar; hunters see runners only in chase | room.test |
| R7 | Last runner leaving in chase **or head start** ends the game | room.test |
| R8 | Catch radius boundary: 14.9 m caught, 15.1 m not | room.edge |
| R9 | One move catches several runners | room.edge |
| R10 | Hunter without GPS catches nobody | room.edge |
| R11 | Disconnected runner still catchable at last position | room.edge |
| R12 | Room full at 20 players | room.edge |
| R13 | Double start rejected; unknown player updates ignored | room.edge |
| R14 | After the game everyone sees everyone | room.edge |
| R15 | Helper sees runners; runner radar counts helpers | room.edge |

### Room lifecycle (manager)
| ID | Case | Test |
|---|---|---|
| M1 | Head start → chase → time up → room expires after 10 min (mock clock) | roomManager.timers |
| M2 | Settings clamped to limits, rounded, junk → defaults | roomManager.timers |
| M3 | Host creating a new room closes the old one | roomManager.timers |
| M4 | Start outside a room / join missing room fail cleanly | roomManager.timers |
| M5 | Location after game end ignored (no rebroadcast, expiry not reset) | roomManager |
| M6 | Host leaving an **ended** game keeps results for others | roomManager |
| M7 | Host leaving before the end closes the room | roomManager |

### Transport (socket)
| ID | Case | Test |
|---|---|---|
| S1 | Create/join, filtered views, validation errors, settings clamp | socket.test |
| S2 | Missing/invalid `playerId` rejected | socket.test |
| S3 | Switching rooms stops old room's updates | socket.test |
| S4 | Garbage payloads never crash; names trimmed to 20 chars | socket.test |
| S5 | Reconnect restores seat; second socket keeps player online | socket.test |
| S6 | Fresh player gets empty `session` | socket.test |

### App
| ID | Case | Test |
|---|---|---|
| A1 | Late `room:state` after Leave is ignored | gameStore.test |
| A2 | `room:state` applied for current room / during join; other rooms ignored | gameStore.test |
| A3 | Server restart (`session` null) → Home with reason; no error on fresh launch | gameStore.test |
| A4 | `room:closed` keeps reason | gameStore.test |
| A5 | Name remembered after a game | gameStore.test + edge_cases.yaml |
| A6 | Radar thresholds 49/50/149/150 m and no-signal | ui.test |
| A7 | Result wording per role × winner | ui.test |
| A8 | Clock formatting | App.test |

### End to end
| ID | Case | Flow |
|---|---|---|
| E1 | Disabled buttons, short code, unknown code error, leave lobby, rejoin closed room | edge_cases.yaml |
| E2 | Runner joins bot host, gets caught at chase start, result screen | runner_caught.yaml |
| E3 | Host sets head start, bot joins, blindfold, walks onto runner, wins | host_hunts.yaml |
| E4 | 3 devices: host catches Ravi → Ravi becomes helper → catches Mia | multi/*.yaml |

## Field test checklist (real phones)

Run with `DEBUG=1`; watch `curl <server>:3000/debug/rooms`.

- [ ] Phones and server on the same Wi-Fi; app shows no "Connecting…" line
- [ ] Location + Local Network permission granted (iOS)
- [ ] Standing still, each phone appears in `/debug/rooms` within 5 s
- [ ] Runner radar changes colour at ~150 m and ~50 m
- [ ] Hunter map shows every runner after head start; "Show everyone" fits all pins
- [ ] Walk within 15 m: runner buzzes, turns Helper, sees the hunter map
- [ ] Lock one phone 30 s, unlock: it reconnects and keeps its role
- [ ] Turn Wi-Fi off 30 s, on: no burst of old positions, game continues
- [ ] Host taps Done on results: other players keep their result screen

## Known gaps

- Background location is not supported: phones must keep the app open.
- Android map needs a Google Maps key (`MAPS_API_KEY` in `app/android/local.properties`).
- Multi-simulator E2E can be flaky on the 3rd simulator (Maestro driver lag), not the app.
