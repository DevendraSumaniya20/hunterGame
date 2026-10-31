# Features and game rules

## Game rules

1. **Host a game.** The host creates a room and gets a 5-character room code (letters and digits,
   no `I`, `O`, `0`, `1`). The host is the **hunter**.
2. **Join.** Other players enter the code and their name. They are **runners**. Max 20 players per room.
   Players can only join while the room is in the lobby.
3. **Start.** Only the host can start, and only when at least one runner has joined.
4. **Head start** (default 60 s, 5–600 s). Runners move away. Hunters see a blindfold screen
   ("Eyes closed!") and no runner positions. No catches happen.
5. **Chase** (default 10 min, 30 s–60 min). The hunter team sees every runner on the map.
6. **Catching.** The server checks distances on every position update. If a hunter or helper is within
   the **catch radius** (default 15 m, 3–100 m) of a runner, that runner is caught and becomes a
   **helper**: they join the hunter team, see the hunter map, and can catch others. A disconnected runner
   can still be caught at their last known position. A hunter without a GPS fix catches nobody.
7. **Winning.** Hunters win when no runners are left (all caught, or the last runner left the game).
   Runners win if at least one runner is still free when the chase clock runs out.
8. **After the game** everyone sees everyone's position and the full catch list. The result is saved to
   history, stats, leaderboards and clan points. The room is deleted 10 minutes after the game ends.

Settings outside the limits are clamped (e.g. a 1 s head start becomes 5 s); invalid values fall back to
the defaults.

## Screens

### Play tab (Home)
- **Name** (required, max 20 characters, remembered for the next game).
- **Join a game**: room code field; *Join game* is enabled only with a name and a 5-character code.
  Errors from the server are shown under the form (e.g. "Room not found", "Game already started").
- **Host a game**: *Game settings* reveals head start (s), game length (min), catch radius (m);
  *Create game*.
- "Connecting to the game server…" shows while the socket is not connected.

### Lobby
- Large room code with **Share code** (system share sheet).
- **Players** list with avatar (pin colour), clan code, role and tags (you, host, offline).
- **Rules** (head start, game length, catch radius).
- Host: **Start game** (disabled with "Waiting for runners" until someone joins).
  Others: "Waiting for the host to start".
- **Team chat** button and **Leave game**. If the host leaves before the game ends, the room closes for
  everyone ("Host left the game").

### Game (map)
- Full-screen map (Apple Maps on iOS, Google Maps on Android).
- **Phase banner**: Head start / Chase with a countdown (turns red in the last 30 s) and a hint line.
- **Hunter team**: runner pins (filled with role colour, ring in the player's colour), catch-radius
  circles around hunters/helpers, *Show everyone* button, map auto-zooms when runners appear.
- **Runners**: only themselves on the map, plus the **radar**: distance to the nearest hunter or helper
  (red "Hunter right behind you. Move." under 50 m, orange "Hunter nearby" under 150 m, green "You're
  safe for now", grey "Looking for hunters" without data).
- **Catch toast** with vibration (longer pattern when you are the one caught).
- "Waiting for GPS. Other players can't see you yet." until the first position fix.
- Your name and role badge, and the **Team chat** button.

### Result
- "Hunters win!" / "Runners escaped!", a line for your outcome (e.g. "You were caught and joined the
  hunters. They won."), the list of catches and the final teams. **Done** returns home.

### History tab
- Every finished game, newest first: green/red dot (won/lost), title from your point of view
  ("Caught everyone", "Runners got away", "Escaped", "Caught by Hana"), date, and your role summary.
- Tap a game for **details**: your game (started as, ended as, catches, caught by, survived), game
  settings and chase length, catch timeline with times, all players with their final role.
- Pull down to refresh. Only players who took part can open a game.

### Leaderboard tab
- **Hunters** (runners caught, as hunter or helper) or **Survivors** (chases survived without being
  caught); **This week** or **All time**. Top 20, your row marked "(you)", games played per player.

### Clans tab
- **My clan**: create a clan, or join one with a 6-character code. In a clan: avatar, name, description,
  big **clan code** with **Share code**, stats (members x of 30, points, games played, wins), members
  (owner first, games and wins), **Edit clan** and **Remove** (owner only), **Leave clan** (confirmation).
- **Top clans**: ranking by points, this week or all time; your clan marked "(yours)".
- **Search**: by name (contains) or exact code, results as you type.
- Clan page from search/top: **Join clan**, or "Leave your current clan to join this one."
- Rules: one clan per player; 30 members max; names 3–24 characters and unique (any case);
  description up to 120 characters. Points = 3 per win + 1 per runner caught, by current members.
  When the owner leaves, the longest-standing member becomes owner; the last member leaving deletes the clan.
- Your clan code is shown next to your name in game lobbies.

### Profile tab
- Avatar, **name**, **pin colour** (6 choices).
- **Your stats**: games played, wins (with %), runners caught, times caught, longest escape.
- **Settings**: Vibrate on catches.
- **How to play**: the rules in five steps.
- Name and colour sync to the server (leaderboards, clans); haptics stay on the device.

### Team chat (lobby and game)
- Two channels: **Hunter team** (hunter and helpers) and **Runner team**. Only your current team gets
  your messages.
- When you are caught you move to the hunter chat: you see the hunters' earlier messages and a note
  "You were caught. You now chat with the hunters." The runner messages are no longer shown.
- Unread badge on the Team chat button; messages up to 300 characters; at most 5 messages per 5 seconds;
  the last 100 messages per team are kept. Chat closes when the game ends.

## Identity and privacy
- Each install has a **secret player id** (stored on the device, issued by the server). It works like a
  password for your profile, history and clan actions. Other players only ever see a one-way hash of it.
- Runners never receive other players' positions during a game; hunters receive runner positions only
  during the chase.
