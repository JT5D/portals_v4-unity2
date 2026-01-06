#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PORT="${PORT:-8081}"
URL_SCHEME="${EXPO_URL_SCHEME:-portals}"
XCODE_SCHEME="${IOS_SCHEME:-Portals}"
DEVICE_NAME="${IOS_DEVICE_NAME:-${DEVICE_NAME:-IMClab 15}}"
BUNDLE_ID="${IOS_BUNDLE_ID:-com.h3mai.portals}"

mkdir -p "$LOG_DIR"

export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

log() { echo "[RunIOS] $1"; }
warn() { echo "[RunIOS] WARN: $1"; }

if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  log "Port $PORT is in use; stopping stale Metro."
  lsof -ti tcp:$PORT | xargs -r kill || true
fi

log "Starting Metro (tunnel) on port $PORT..."
METRO_ENV="EXPO_DEV_SERVER_PORT=$PORT EXPO_METRO_PORT=$PORT EXPO_PACKAGER_PORT=$PORT LANG=$LANG LC_ALL=$LC_ALL"
nohup bash -c "${METRO_ENV} npx expo start --dev-client --tunnel --scheme ${URL_SCHEME} --port ${PORT}" > "$LOG_DIR/metro.log" 2>&1 &
echo $! > "$LOG_DIR/metro.pid"

log "Validating Unity exports..."
UNITY_CHECK_ANDROID=0 bash "$PROJECT_ROOT/scripts/check_unity_exports.sh"

for i in {1..60}; do
  if rg -q "Tunnel ready" "$LOG_DIR/metro.log"; then
    log "Metro tunnel ready."
    break
  fi
  sleep 2
done

if ! rg -q "Tunnel ready" "$LOG_DIR/metro.log"; then
  log "Metro tunnel not ready. Check $LOG_DIR/metro.log"
  tail -n 40 "$LOG_DIR/metro.log"
  exit 1
fi

URL_RANDOMNESS=""
if [ -f "$PROJECT_ROOT/.expo/settings.json" ]; then
  URL_RANDOMNESS=$(node -e "const s=require('./.expo/settings.json'); process.stdout.write(s.urlRandomness || '')" || true)
fi

TUNNEL_URL=""
if [ -n "$URL_RANDOMNESS" ]; then
  TUNNEL_URL="https://${URL_RANDOMNESS}-${PORT}.exp.direct"
fi

log "Building and installing on device: $DEVICE_NAME"
export PREFERRED_XCODE_VERSION="${PREFERRED_XCODE_VERSION:-16.4}"
LANG=$LANG LC_ALL=$LC_ALL npx expo run:ios --device "$DEVICE_NAME" --scheme "$XCODE_SCHEME"

if [ -n "$TUNNEL_URL" ]; then
  log "Opening dev client tunnel: $TUNNEL_URL"
  xcrun devicectl device process launch \
    --device "$DEVICE_NAME" \
    --payload-url "${URL_SCHEME}://expo-development-client/?url=${TUNNEL_URL}" \
    --terminate-existing \
    "$BUNDLE_ID" || warn "devicectl launch failed; open the dev client manually."
else
  warn "No tunnel URL found. Open the dev client manually."
fi
