#!/usr/bin/env bash
# Simulator hosts a live game for a real phone. Prints the room code to type on the phone.
# Usage: [DEVICE=<sim udid>] [PLAYERS=2] e2e/live_host.sh   (PLAYERS counts the host)
set -uo pipefail
cd "$(dirname "$0")/.."
DEVICE=${DEVICE:-$(xcrun simctl list devices booted | grep -oE "[0-9A-F-]{36}" | head -1)}
CODE_FILE=$(mktemp)
node -e "require('http').createServer((q,s)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{require('fs').writeFileSync('$CODE_FILE',b);s.end('ok')})}).listen(4002)" &
RECEIVER=$!
trap 'kill $RECEIVER 2>/dev/null' EXIT
maestro --device "$DEVICE" test -e PLAYERS="${PLAYERS:-2}" e2e/flows/live_host.yaml &
FLOW=$!
for _ in $(seq 120); do [ -s "$CODE_FILE" ] && break; sleep 1; done
echo "ROOM_CODE=$(cat "$CODE_FILE")"
wait $FLOW
