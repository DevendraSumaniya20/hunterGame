#!/usr/bin/env bash
# Real 3-device game on 3 booted iOS simulators: Hana hosts, Ravi and Mia run.
# Usage: e2e/multi.sh [HOST_UDID RAVI_UDID MIA_UDID]   (defaults: first 3 booted simulators)
# Needs the server on :3000, Metro on :8081 and the app installed on each simulator.
set -uo pipefail
cd "$(dirname "$0")/.."
read -r -a BOOTED <<<"$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | sort -u | tr '\n' ' ')"
HOST=${1:-${BOOTED[0]}}; RAVI=${2:-${BOOTED[1]}}; MIA=${3:-${BOOTED[2]}}
LOGS=$(mktemp -d)
CODE_FILE="$LOGS/code"

# Tiny receiver for the room code the host flow publishes.
node -e "require('http').createServer((q,s)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{require('fs').writeFileSync('$CODE_FILE',b);s.end('ok')})}).listen(4002)" &
RECEIVER=$!
trap 'kill $RECEIVER 2>/dev/null' EXIT

echo "host=$HOST ravi=$RAVI mia=$MIA logs=$LOGS"
maestro --device "$HOST" test e2e/flows/multi/host.yaml >"$LOGS/host.log" 2>&1 &
H=$!

for _ in $(seq 120); do [ -s "$CODE_FILE" ] && break; sleep 1; done
CODE=$(cat "$CODE_FILE" 2>/dev/null)
[ -n "$CODE" ] || { echo "host never published a room code"; cat "$LOGS/host.log"; exit 1; }
echo "room $CODE"

maestro --device "$RAVI" test -e ROOM_CODE="$CODE" e2e/flows/multi/ravi.yaml >"$LOGS/ravi.log" 2>&1 &
R=$!
maestro --device "$MIA" test -e ROOM_CODE="$CODE" e2e/flows/multi/mia.yaml >"$LOGS/mia.log" 2>&1 &
M=$!

FAIL=0
for pair in "host:$H" "ravi:$R" "mia:$M"; do
  name=${pair%%:*}
  if wait "${pair##*:}"; then echo "PASS $name"; else echo "FAIL $name"; FAIL=1; fi
done
for name in host ravi mia; do
  echo "--- $name"; grep -E 'COMPLETED|FAILED' "$LOGS/$name.log" | sed 's/\.\.\. / /'
done
exit $FAIL
