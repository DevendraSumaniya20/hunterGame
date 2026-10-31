# Sharing the game

Three pieces: a server reachable from the internet, a release app pointing at it, and a way to install it.

## 1. Put the server online

### Fly.io (recommended, 24/7)

```bash
brew install flyctl
fly auth signup            # or: fly auth login
fly launch --no-deploy --copy-config      # uses fly.toml; pick a new app name if "hunter-game-dsumniya" is taken
fly volumes create hunt_data --region bom --size 1
fly deploy
fly scale count 1          # live games live in memory: keep exactly one machine
curl https://<app>.fly.dev/health          # -> ok
```

If the app name differs, update both `app` in `fly.toml` and `PROD_SERVER_URL` in `app/src/config.ts`.

### Railway / Render (alternative)

Create a service from the GitHub repo; it builds the root `Dockerfile`. Add a volume mounted at `/data`,
keep one instance, and use the https URL it gives you as `PROD_SERVER_URL`.

### Cloudflare Tunnel (quick test from your Mac, free)

```bash
brew install cloudflared
npm run server                                   # without DEBUG
cloudflared tunnel --url http://localhost:3000   # prints https://<random>.trycloudflare.com
```

Put that URL in `PROD_SERVER_URL` and build a release app. It only works while your Mac and the tunnel run,
and the URL changes each time.

## 2. Build the app for other people

Release builds use `PROD_SERVER_URL` (debug builds keep using your Mac on the LAN).

- **Android APK** (send the file, friends allow "install unknown apps"):
  ```bash
  cd app/android && ./gradlew assembleRelease
  # -> app/build/outputs/apk/release/app-release.apk
  ```
  It is signed with the debug key, which is fine for sideloading. Google Play needs your own upload key.
  Add `MAPS_API_KEY=...` to `app/android/local.properties` first, or the game map crashes on Android.
- **iPhone**: TestFlight needs the paid Apple Developer Program. In Xcode: scheme HuntingGame, Release,
  Product > Archive > Distribute App > TestFlight. With the free team you can only install on your own
  devices, and builds expire after 7 days.

## 3. Production checklist

- [x] `DEBUG` is not set in the Dockerfile / fly.toml (`/debug/rooms` would expose live positions).
- [x] New player ids come from the server's CSPRNG (`POST /api/players`).
- [x] REST rate limits per IP (120/min, 20 new ids/hour); chat has its own limit. `TRUST_PROXY=1` reads the
      real client IP behind Fly/Railway/Render.
- [x] Database on a persistent volume (`DB_PATH=/data/hunt.db`).
- [ ] Android Maps key.
- [ ] Back up `/data/hunt.db` now and then (`fly ssh sftp get /data/hunt.db`).
