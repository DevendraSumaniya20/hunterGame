# Setup, running and testing

## Requirements
- macOS with Xcode (iOS), Android SDK + an emulator or phone (Android), Node 22.5+ (built-in
  `node:sqlite`; developed on Node 26), CocoaPods via Ruby `bundle`, Watchman.
- Maestro for E2E tests (`brew install maestro`).

## First install
```bash
git clone https://github.com/DevendraSumaniya20/hunterGame.git && cd hunterGame
npm install                                   # root workspaces: shared + server
cd app && npm install && cd ios && bundle install && bundle exec pod install && cd ../..
```

## Configure
- `app/src/config.ts`: `DEV_HOST` = your computer's LAN IP (`ipconfig getifaddr en0`). Phones and
  simulators reach the dev server there. `PROD_SERVER_URL` = deployed https URL for release builds.
- Android maps: `MAPS_API_KEY=...` in `app/android/local.properties` (git-ignored), with "Maps SDK for
  Android" enabled in Google Cloud. Without it the game map crashes on Android.
- Server env: `PORT` (3000), `DB_PATH` (`data/hunt.db` relative to `server/`), `DEBUG=1` (logs +
  `/debug/rooms`), `TRUST_PROXY=1` (behind a hosting proxy).

## Run (development)
```bash
DEBUG=1 npm run server          # terminal 1: game server on :3000
npm run app                     # terminal 2: Metro on :8081
cd app && npx react-native run-ios --udid <simulator-udid>   # or: npx react-native run-android
```

### On your iPhone
1. Plug in the phone, unlock it, enable Settings > Privacy & Security > Developer Mode.
2. Xcode > Settings > Accounts: add your Apple ID. Open `app/ios/HuntingGame.xcworkspace`, target
   HuntingGame > Signing & Capabilities: Team = your team (currently `N9VZ752MDY`), bundle id
   `com.dsumniya.huntinggame`.
3. Build: `cd app/ios && xcodebuild -workspace HuntingGame.xcworkspace -scheme HuntingGame -configuration Debug
   -destination id=<phone-udid> -allowProvisioningUpdates -derivedDataPath build/device build`, then
   `xcrun devicectl device install app --device <phone-udid> build/device/Build/Products/Debug-iphoneos/HuntingGame.app`.
4. On the phone: Settings > General > VPN & Device Management > Apple Development: <you> > Trust.
5. Open the app, allow Local Network and Location. Phone and Mac must be on the same Wi-Fi.

`xcrun devicectl list devices` shows the phone's udid; `xcrun simctl list devices` the simulators'.

### Play against the simulator from a real phone
`e2e/live_host.sh` makes a simulator host a room and prints `ROOM_CODE=…`; it starts the game once
`PLAYERS` (default 2, host included) are in. `npx tsx e2e/bot.ts host|runner --code X --lat --lng` adds a
scripted player. With `DEBUG=1`, `curl localhost:3000/debug/rooms` shows positions; move a simulator with
`xcrun simctl location <udid> set <lat>,<lng>`.

## Tests
```bash
npm test                         # server (node:test) + app (jest)
npm run typecheck && (cd app && npx eslint .)
e2e/run.sh edge|clans|runner|host        # Maestro, DEVICE=<udid|emulator-5554> to pick a device
e2e/multi.sh <hostUdid> <raviUdid> <miaUdid>   # 3-simulator game, helper switch, team chat
```
Test plan and case catalog: `docs/QA.md`.

## Native dependencies
Not Expo. To add a native library: `cd app && npm install <lib>`, `cd ios && bundle exec pod install`,
then rebuild both apps (`run-ios`, `run-android` or the xcodebuild/gradle commands). Current native
libraries: react-native-maps, @react-native-community/geolocation, @react-native-async-storage/async-storage,
react-native-reanimated + react-native-worklets, react-native-gesture-handler,
react-native-keyboard-controller, react-native-safe-area-context.

## Troubleshooting
| Problem | Fix |
|---|---|
| App stuck on "Connecting to the game server…" | Server running? `DEV_HOST` correct? Same Wi-Fi? iOS: Local Network permission allowed. |
| "Untrusted Developer" on iPhone | Settings > General > VPN & Device Management > Trust. |
| `Signing for "HuntingGame" requires a development team` | Select your team in Xcode (see above). |
| Android crash `API key not found` on the map | Add `MAPS_API_KEY` to `app/android/local.properties` and rebuild. |
| Android "nearby devices" prompt | Expected in development (server on the LAN). Allow it. |
| iOS build error about deployment target 13.0 | Run `bundle exec pod install` again; the Podfile `post_install` raises old pod targets. |
| Players can't see you on the map | Grey location dot / "Waiting for GPS": no fix yet. Keep the app open (no background location). |
| `multi.sh`: device "not connected" | The extra simulators were deleted; create them with `xcrun simctl create "Hunt Ravi" "iPhone 17" <runtime>`. |
| E2E typing drops letters / first step fails on Android | Flows already retry; debug builds re-download the JS bundle after a data clear (up to 2 min). |
