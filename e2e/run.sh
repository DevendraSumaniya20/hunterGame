#!/usr/bin/env bash
# Usage: [DEVICE=<sim udid>] e2e/run.sh edge|runner|host   (server on :3000 and the app on a booted simulator must be running)
set -euo pipefail
cd "$(dirname "$0")/.."
BOT_LOG=$(mktemp)
DEVICE=${DEVICE:-$(xcrun simctl list devices booted | grep -oE "[0-9A-F-]{36}" | head -1)}
case "${1:-}" in
  edge)
    maestro --device "$DEVICE" test e2e/flows/edge_cases.yaml
    ;;
  runner)
    npx tsx e2e/bot.ts host > "$BOT_LOG" 2>&1 &
    BOT=$!
    trap 'kill $BOT 2>/dev/null; echo "--- bot log"; cat "$BOT_LOG"' EXIT
    for _ in $(seq 20); do grep -q ROOM_CODE= "$BOT_LOG" && break; sleep 0.5; done
    CODE=$(grep -o 'ROOM_CODE=[A-Z0-9]*' "$BOT_LOG" | cut -d= -f2)
    echo "Bot hosting room $CODE"
    maestro --device "$DEVICE" test -e ROOM_CODE="$CODE" e2e/flows/runner_caught.yaml
    ;;
  host)
    npx tsx e2e/bot.ts runner --listen 4001 > "$BOT_LOG" 2>&1 &
    BOT=$!
    trap 'kill $BOT 2>/dev/null; echo "--- bot log"; cat "$BOT_LOG"' EXIT
    sleep 2
    maestro --device "$DEVICE" test e2e/flows/host_hunts.yaml
    ;;
  *) echo "usage: e2e/run.sh edge|runner|host"; exit 1 ;;
esac
