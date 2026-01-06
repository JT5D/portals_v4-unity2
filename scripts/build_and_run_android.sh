#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_PROJECT="$PROJECT_ROOT/unity"
ANDROID_BUILD_PATH="$UNITY_PROJECT/builds/android"
LOG_DIR="$PROJECT_ROOT/logs"

# Load .env variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -o allexport
    source "$PROJECT_ROOT/.env"
    set +o allexport
fi

# Settings with defaults
[ -z "${UNITY_VERSION:-}" ] && UNITY_VERSION="6000.2.14f1"
UNITY_HUB_PATH="/Applications/Unity/Hub/Editor/${UNITY_VERSION}/Unity.app/Contents/MacOS/Unity"
SCHEME="${SCHEME:-Portals}"
PORT="${PORT:-8081}"

BUILD_ONLY=false
SKIP_PREFLIGHT=false

mkdir -p "$LOG_DIR"

# =============================================================================
# Helper Functions
# =============================================================================

log() { echo -e "${GREEN}[BuildScript] $1${NC}"; }
warn() { echo -e "${YELLOW}[BuildScript] $1${NC}"; }
error() { echo -e "${RED}[BuildScript] $1${NC}"; }

find_unity() {
    if [ -f "$UNITY_HUB_PATH" ]; then
        echo "$UNITY_HUB_PATH"
    elif command -v unity >/dev/null 2>&1; then
        command -v unity
    else
        # Allow override via env var, or fail
        if [ -n "${UNITY_PATH:-}" ]; then
            echo "$UNITY_PATH"
        else
            error "Unity Editor not found. expected at: $UNITY_HUB_PATH"
            exit 1
        fi
    fi
}

usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --build-only      Only build the Unity project, do not run expo run:android"
    echo "  --skip-preflight  Skip MCP checks and missing script validation"
    echo "  --help            Show this help"
    exit 0
}

# =============================================================================
# 0. Argument Parsing
# =============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --skip-preflight)
            SKIP_PREFLIGHT=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            shift
            ;;
    esac
done

# =============================================================================
# 1. Environment Check & Setup
# =============================================================================

log "Starting consolidated Android build process..."
if [ "$BUILD_ONLY" = true ]; then log "Mode: Build Only"; fi

# 1a. Find Unity
UNITY_BIN=$(find_unity)
log "Using Unity: $UNITY_BIN"

# =============================================================================
# 2. Preflight Checks (Optional)
# =============================================================================

if [ "$SKIP_PREFLIGHT" = false ]; then
    log "Running Preflight Checks..."

    # Kill stuck processes
    log "Cleaning stuck processes..."
    pkill -f "UnityMcpServer" >/dev/null 2>&1 || true
    pkill -f "Unity.app/Contents/MacOS/Unity" >/dev/null 2>&1 || true

    # MCP Verify
    log "Running Unity MCPTools.VerifyAndAutoFix..."
    mkdir -p "$LOG_DIR/headless"
    "$UNITY_BIN" -batchmode -nographics -quit \
        -projectPath "$UNITY_PROJECT" \
        -executeMethod MCPTools.VerifyAndAutoFix \
        -logFile "$LOG_DIR/headless/unity_preflight.log" || {
        warn "MCPTools.VerifyAndAutoFix returned non-zero (check $LOG_DIR/headless/unity_preflight.log)"
    }

    # Missing Scripts Check
    log "Checking for missing scripts..."
    if [ -f "$PROJECT_ROOT/scripts/check_missing_scripts.py" ]; then
        python3 "$PROJECT_ROOT/scripts/check_missing_scripts.py" \
          --project "$UNITY_PROJECT" \
          --scenes "$UNITY_PROJECT/Assets/Scenes" \
          > "$LOG_DIR/missing_scripts.log" || {
            error "Missing script GUIDs detected! Check $LOG_DIR/missing_scripts.log"
            exit 1
        }
    else
        warn "check_missing_scripts.py not found, skipping check."
    fi
fi

# =============================================================================
# 3. Clean & Prepare
# =============================================================================

log "Cleaning up previous processes..."
# Kill stale Metro
for port in 8080 8081; do
    lsof -ti tcp:$port | xargs -r kill || true
done

# Kill Unity if running
if pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null; then
    warn "Unity is running. Attempting to close it gracefully..."
    osascript -e 'tell application "Unity" to quit' || true
    # Wait loop
    for i in {1..5}; do
        pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null || break
        sleep 1
    done
    pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null && pkill -f "Unity.app/Contents/MacOS/Unity" || true
fi

# =============================================================================
# 4. Unity Export (Headless)
# =============================================================================

log "running Unity export..."
"$UNITY_BIN" -quit -batchmode \
    -projectPath "$UNITY_PROJECT" \
    -executeMethod BuildScript.PerformAndroidBuild \
    -logFile "$LOG_DIR/unity_android_build.log"

if grep -q "Android Export Succeeded" "$LOG_DIR/unity_android_build.log"; then
    log "Unity export successful."
else
    error "Unity export failed. Check $LOG_DIR/unity_android_build.log"
    tail -n 20 "$LOG_DIR/unity_android_build.log"
    exit 1
fi

if [ "$BUILD_ONLY" = true ]; then
    log "Build only mode complete. Exiting."
    exit 0
fi

# =============================================================================
# 5. Install to Device
# =============================================================================

log "Starting Metro Bundler..."
METRO_ENV="EXPO_DEV_SERVER_PORT=$PORT EXPO_METRO_PORT=$PORT EXPO_PACKAGER_PORT=$PORT LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8"
nohup bash -c "${METRO_ENV} npx expo start --dev-client --tunnel --scheme portals" > "$LOG_DIR/metro.log" 2>&1 &
echo $! > "$LOG_DIR/metro.pid"

log "Installing and Running on Android Device..."
# We use a subshell to capture exit code properly if needed
bash -c "${METRO_ENV} npx expo run:android"

log "Done!"
