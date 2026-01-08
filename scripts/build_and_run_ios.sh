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
# Per @azesmway/react-native-unity docs: Unity exports to temp location OUTSIDE RN project
# Only the built UnityFramework.framework is copied to unity/builds/ios/
UNITY_EXPORT_PATH="/tmp/unity-ios-export"
FRAMEWORK_DEST="$UNITY_PROJECT/builds/ios"
XCODE_PROJECT="$UNITY_EXPORT_PATH/Unity-iPhone.xcodeproj"
DERIVED_DATA_ROOT="$HOME/Library/Developer/Xcode/DerivedData"
LOG_DIR="$PROJECT_ROOT/logs"
DERIVED_DATA_APP_PATTERN="$DERIVED_DATA_ROOT/Unity-iPhone-*"

# Load .env variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -o allexport
    source "$PROJECT_ROOT/.env"
    set +o allexport
fi

# Settings with defaults
[ -z "${UNITY_VERSION:-}" ] && UNITY_VERSION="6000.2.14f1"
UNITY_HUB_PATH="/Applications/Unity/Hub/Editor/${UNITY_VERSION}/Unity.app/Contents/MacOS/Unity"
DEVICE_NAME_PATTERN="${DEVICE_NAME:-IMClab 15}"
# Overwrite with env var if present
if [ -n "${IOS_DEVICE_NAME:-}" ]; then
    DEVICE_NAME_PATTERN="$IOS_DEVICE_NAME"
fi

# Resolve exact device name or UDID from xctrace (case-sensitive)
DEVICE_NAME=$(xcrun xctrace list devices 2>&1 | grep -i "$DEVICE_NAME_PATTERN" | grep -v "Simulator" | head -1 | sed -E 's/^([^(]+).*/\1/' | xargs)
DEVICE_UDID=$(xcrun xctrace list devices 2>&1 | grep -i "$DEVICE_NAME_PATTERN" | grep -v "Simulator" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

if [ -z "$DEVICE_NAME" ]; then
    echo "❌ Device not found matching pattern: $DEVICE_NAME_PATTERN" >&2
    echo "Available devices:" >&2
    xcrun xctrace list devices 2>&1 | grep -v "Simulator" | head -10 >&2
    exit 1
fi

# Note: build_log function defined later in script
# Will be shown again after functions are loaded
DEVICE_RESOLVED=1
XCODE_SCHEME="${IOS_SCHEME:-Portals}"
PORT="${PORT:-8081}"
URL_SCHEME="${EXPO_URL_SCHEME:-portals}"
IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-com.h3mai.portals}"
EXPO_TUNNEL_URL="${EXPO_TUNNEL_URL:-}"
PREFERRED_XCODE_VERSION="${PREFERRED_XCODE_VERSION:-16.4}"

BUILD_ONLY=false
SKIP_PREFLIGHT=false
SKIP_UNITY_EXPORT=false
KEEP_UNITY_OPEN=false
FORCE_CLOSE_UNITY=false
SKIP_POD_INSTALL=false

mkdir -p "$LOG_DIR"

# =============================================================================
# Helper Functions
# =============================================================================

build_log() { echo -e "${GREEN}[BuildScript] $1${NC}"; }
warn() { echo -e "${YELLOW}[BuildScript] $1${NC}" >&2; }
error() { echo -e "${RED}[BuildScript] $1${NC}"; }
unity_running() { pgrep -f "Unity.app/Contents/MacOS/Unity.*${UNITY_PROJECT}" >/dev/null 2>&1; }
xcode_running() { pgrep -f "xcodebuild" >/dev/null 2>&1; }
mcp_running() { pgrep -f "/Users/jamestunick/Applications/UnityMCP/UnityMcpServer/src server.py" >/dev/null 2>&1; }

ensure_ngrok() {
    if node -e "require('@expo/ngrok')" >/dev/null 2>&1; then
        return 0
    fi

    error "@expo/ngrok is required for tunnel mode. Install with: npm install -D @expo/ngrok@^4.1.0"
    exit 1
}

resolve_tunnel_url() {
    if [ -n "$EXPO_TUNNEL_URL" ]; then
        echo "$EXPO_TUNNEL_URL"
        return
    fi

    local url=""
    for i in {1..20}; do
        url=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 - <<'PY'
import json, sys
try:
    data = json.load(sys.stdin)
    for t in data.get("tunnels", []):
        url = t.get("public_url", "")
        if url.startswith("https://"):
            print(url)
            break
except Exception:
    pass
PY
)
        if [ -n "$url" ]; then
            echo "$url"
            return
        fi
        sleep 1
    done

    if [ -f "$PROJECT_ROOT/.expo/settings.json" ]; then
        url=$(python3 - <<PY
import json
import pathlib

settings = pathlib.Path(".expo/settings.json")
data = json.loads(settings.read_text())
randomness = data.get("urlRandomness", "")
if randomness:
    print(f"https://{randomness}-${PORT}.exp.direct")
PY
)
        if [ -n "$url" ]; then
            warn "Using exp.direct fallback from .expo/settings.json"
            echo "$url"
            return
        fi
    fi

    echo ""
}

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
    echo "  --build-only      Only build the UnityFramework, do not run pod install or launch app"
    echo "  --skip-preflight  Skip MCP checks and missing script validation"
    echo "  --skip-unity-export  Skip headless Unity export (use existing unity/builds/ios)"
    echo "  --keep-unity-open  Do not close Unity Editor (implies --skip-preflight)"
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
        --skip-unity-export)
            SKIP_UNITY_EXPORT=true
            shift
            ;;
        --keep-unity-open)
            KEEP_UNITY_OPEN=true
            SKIP_PREFLIGHT=true
            shift
            ;;
        --force-close-unity)
            FORCE_CLOSE_UNITY=true
            shift
            ;;
        --help)
            usage
            ;;
        --skip-pod-install)
            SKIP_POD_INSTALL=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ "$SKIP_UNITY_EXPORT" = true ]; then
    KEEP_UNITY_OPEN=true
    SKIP_PREFLIGHT=true
fi

# =============================================================================
# 1. Environment Check & Setup
# =============================================================================

build_log "Starting consolidated iOS build process..."
build_log "Resolved device: $DEVICE_NAME (UDID: $DEVICE_UDID)"
if [ "$BUILD_ONLY" = true ]; then build_log "Mode: Build Only"; fi
if [ "$SKIP_UNITY_EXPORT" = true ]; then build_log "Mode: Skip Unity export (Unity Editor friendly)"; fi

# 1a. Find Unity
UNITY_BIN=$(find_unity)
build_log "Using Unity: $UNITY_BIN"

# 1b. Find Xcode
if [ -z "${DEVELOPER_DIR:-}" ]; then
    warn "Looking for preferred Xcode version (${PREFERRED_XCODE_VERSION})..."
    if [ -f "$PROJECT_ROOT/scripts/find_xcode.py" ]; then
        DEVELOPER_DIR=$(python3 "$PROJECT_ROOT/scripts/find_xcode.py")
        export DEVELOPER_DIR
        build_log "Selected Xcode: $DEVELOPER_DIR"
    else
        warn "scripts/find_xcode.py not found, relying on system default Xcode."
    fi
fi

# =============================================================================
# 2. Preflight Checks (Optional)
# =============================================================================

if [ "$SKIP_PREFLIGHT" = false ]; then
    build_log "Running Preflight Checks..."

    # Detect running editor/builds and bail to avoid DB locks and batchmode failures.
    if unity_running; then
        if [ "$FORCE_CLOSE_UNITY" = true ]; then
            warn "Unity Editor is running. Force-closing due to --force-close-unity."
            pkill -f "Unity.app/Contents/MacOS/Unity.*${UNITY_PROJECT}" || true
            sleep 2
        else
            error "Unity Editor is running on this project. Please close Unity or use --force-close-unity."
            exit 1
        fi
    fi
    if xcode_running; then
        error "xcodebuild is running. Please wait or close it, then re-run."
        exit 1
    fi
    if mcp_running; then
        warn "Unity MCP server is running; will stop for build and restart after."
    fi

    # Kill stuck processes
    build_log "Cleaning stuck processes..."
    pkill -f "Unity-iPhone.xcodeproj" >/dev/null 2>&1 || true
    pkill -f "il2cpp" >/dev/null 2>&1 || true

    # MCP Verify
    build_log "Running Unity MCPTools.VerifyAndAutoFix..."
    mkdir -p "$LOG_DIR/headless"
    "$UNITY_BIN" -batchmode -nographics -quit \
        -projectPath "$UNITY_PROJECT" \
        -executeMethod MCPTools.VerifyAndAutoFix \
        -logFile "$LOG_DIR/headless/unity_preflight.log" || {
        warn "MCPTools.VerifyAndAutoFix returned non-zero (check $LOG_DIR/headless/unity_preflight.log)"
    }

    # Missing Scripts Check
    build_log "Checking for missing scripts..."
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

build_log "Cleaning up previous processes..."
# Kill stale Metro
for port in 8080 8081; do
    lsof -ti tcp:$port | xargs -r kill || true
done

# Kill Unity if running (unless we want to keep the editor open).
if [ "$KEEP_UNITY_OPEN" = false ]; then
    if pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null; then
        warn "Unity is running. Attempting to close it gracefully..."
        osascript -e 'tell application \"Unity\" to quit' || true
        # Wait loop
        for i in {1..5}; do
            pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null || break
            sleep 1
        done
        pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null && pkill -f "Unity.app/Contents/MacOS/Unity" || true
    fi
else
    warn "KEEP_UNITY_OPEN enabled; Unity Editor will not be closed."
fi

# Optional clean: remove DerivedData if FORCE_CLEAN=1 is set to recover from corrupted caches.
if [ "${FORCE_CLEAN:-0}" = "1" ]; then
    warn "FORCE_CLEAN=1: removing Xcode DerivedData for Unity-iPhone..."
    rm -rf $DERIVED_DATA_APP_PATTERN "$UNITY_EXPORT_PATH/DerivedData" || true
fi

# =============================================================================
# 4. Unity Export (Headless)
# =============================================================================

if [ "$SKIP_UNITY_EXPORT" = true ]; then
    build_log "Skipping Unity export (using existing Unity-iPhone.xcodeproj)."
    if [ ! -d "$XCODE_PROJECT" ]; then
        error "Missing Unity export at $XCODE_PROJECT. Export iOS from Unity Editor first."
        exit 1
    fi
else
    build_log "running Unity export..."
    # Stop MCP server just for the build to free ports and stdout hooks.
    if mcp_running; then
        warn "Stopping Unity MCP server for headless build..."
        pkill -f "/Users/jamestunick/Applications/UnityMCP/UnityMcpServer/src server.py" >/dev/null 2>&1 || true
    fi

    "$UNITY_BIN" -quit -batchmode \
        -projectPath "$UNITY_PROJECT" \
        -executeMethod BuildScript.PerformIOSBuild \
        -logFile "$LOG_DIR/unity_ios_build.log"

    # Note: Unity logs to file. We check log content for success message.
    if grep -q "iOS Build Succeeded" "$LOG_DIR/unity_ios_build.log"; then
        build_log "Unity export successful."
    else
        error "Unity export failed. Check $LOG_DIR/unity_ios_build.log"
        tail -n 20 "$LOG_DIR/unity_ios_build.log"
        # Restart MCP server if we stopped it
        if [ -n "${RESTART_MCP:-}" ] && [ "$RESTART_MCP" = "1" ]; then
            warn "Restarting Unity MCP server after failed build..."
            # Optional: add your launcher here if desired
        fi
        exit 1
    fi
fi

# =============================================================================
# 5. Build UnityFramework (xcodebuild)
# =============================================================================

build_log "Building GameAssembly first (contains il2cpp.a)..."
(
    cd "$UNITY_EXPORT_PATH"
    # Use -sdk instead of -destination, and SYMROOT instead of -derivedDataPath for -target builds
    xcodebuild -project Unity-iPhone.xcodeproj \
        -target GameAssembly \
        -configuration Release \
        -sdk iphoneos \
        SYMROOT="$UNITY_EXPORT_PATH/DerivedData/Build" \
        CONFIGURATION_BUILD_DIR="$UNITY_EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos" \
        build \
        > "$LOG_DIR/xcodebuild_gameassembly.log" 2>&1
) || {
    error "GameAssembly build failed. Check $LOG_DIR/xcodebuild_gameassembly.log"
    tail -n 20 "$LOG_DIR/xcodebuild_gameassembly.log"
    exit 1
}

build_log "Building UnityFramework (Release)..."
(
    cd "$UNITY_EXPORT_PATH"

    # Strategy: Force Classic Linker (ld-classic) via LDFLAGS
    # CRITICAL: Force-load il2cpp.a which contains the IL2CPP runtime symbols
    LD_CLASSIC_PATH=$(xcrun -f ld-classic 2>/dev/null || echo "")
    IL2CPP_LIB="$UNITY_EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/il2cpp.a"

    if [ -n "$LD_CLASSIC_PATH" ]; then
        build_log "Found Classic Linker at: $LD_CLASSIC_PATH"
        build_log "Force-loading il2cpp.a: $IL2CPP_LIB"
        EXTRA_BUILD_ARGS=(
           "OTHER_LDFLAGS=-Wl,-ld_classic -force_load $IL2CPP_LIB"
        )
    else
        warn "ld-classic not found. Falling back to -no_deduplicate."
        EXTRA_BUILD_ARGS=(
            "OTHER_LDFLAGS=-Wl,-no_deduplicate -force_load $IL2CPP_LIB"
        )
    fi

    xcodebuild -project Unity-iPhone.xcodeproj \
        -scheme UnityFramework \
        -configuration Release \
        -destination "generic/platform=iOS" \
        -derivedDataPath "$UNITY_EXPORT_PATH/DerivedData" \
        "${EXTRA_BUILD_ARGS[@]}" \
        build \
        > "$LOG_DIR/xcodebuild_framework.log" 2>&1
) || {
    error "Framework build failed. Check $LOG_DIR/xcodebuild_framework.log"
    tail -n 20 "$LOG_DIR/xcodebuild_framework.log"
    exit 1
}

# Copy ONLY the framework to the plugin's expected location
# Per @azesmway/react-native-unity docs: unity/builds/ios should contain ONLY UnityFramework.framework
LATEST_FRAMEWORK="$UNITY_EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/UnityFramework.framework"
if [ ! -d "$LATEST_FRAMEWORK" ]; then
    error "Framework artifact not found at $LATEST_FRAMEWORK"
    exit 1
fi

# Ensure destination exists and contains ONLY the framework (not full Unity export)
mkdir -p "$FRAMEWORK_DEST"
rm -rf "$FRAMEWORK_DEST/UnityFramework.framework"
cp -R "$LATEST_FRAMEWORK" "$FRAMEWORK_DEST/"
build_log "✅ Framework copied to unity/builds/ios/UnityFramework.framework"

# Note: The podspec's prepare_command will copy from unity/builds/ios/ to node_modules during pod install
# No need to manually copy to node_modules here - pod install handles it via:
#   cp -R ../../../unity/builds/ios/ ios/
build_log "Framework will be installed to node_modules via pod install"

# Restart MCP server if it was running before build and user opted-in.
if mcp_running && [ "${RESTART_MCP:-0}" = "1" ]; then
    warn "Unity MCP server was running before build; restarting..."
    # TODO: insert your MCP server launch command if desired.
fi

if [ "$BUILD_ONLY" = true ]; then
    build_log "Build only mode complete. Exiting."
    exit 0
fi

# =============================================================================
# 6. Pod Install & Install to Device
# =============================================================================

if [ "$SKIP_POD_INSTALL" = false ]; then
    # Per @azesmway/react-native-unity docs: Clear Pods cache before install
    # This ensures the podspec's prepare_command runs fresh and copies the new framework
    build_log "Clearing Pods cache to ensure fresh framework install..."
    rm -rf "$PROJECT_ROOT/ios/Pods"
    rm -f "$PROJECT_ROOT/ios/Podfile.lock"

    build_log "Running Pod Install..."
    (
        cd "$PROJECT_ROOT/ios"
        LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install > "$LOG_DIR/pod_install.log" 2>&1
    ) || {
        error "Pod install failed. Check $LOG_DIR/pod_install.log"
        tail -n 20 "$LOG_DIR/pod_install.log"
        exit 1
    }
else
    build_log "Skipping Pod Install (requested via --skip-pod-install)"
fi

ensure_ngrok

build_log "Starting Metro Bundler..."
METRO_ENV="EXPO_DEV_SERVER_PORT=$PORT EXPO_METRO_PORT=$PORT EXPO_PACKAGER_PORT=$PORT LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8"
nohup bash -c "${METRO_ENV} npx expo start --dev-client --tunnel --scheme \"$URL_SCHEME\" --port \"$PORT\"" > "$LOG_DIR/metro.log" 2>&1 &
echo $! > "$LOG_DIR/metro.pid"

build_log "Waiting for Metro to listen on :$PORT..."
METRO_READY=false
for i in {1..30}; do
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        METRO_READY=true
        break
    fi
    sleep 1
done
if [ "$METRO_READY" = false ]; then
    warn "Metro did not start on :$PORT (check $LOG_DIR/metro.log)."
fi

TUNNEL_URL="$(resolve_tunnel_url)"
if [ -n "$TUNNEL_URL" ]; then
    echo "$TUNNEL_URL" > "$LOG_DIR/metro_url.txt"
    build_log "Tunnel URL: $TUNNEL_URL"
else
    warn "Could not determine tunnel URL. Set EXPO_TUNNEL_URL to override."
fi

build_log "Installing and Running on Device: $DEVICE_NAME (UDID: $DEVICE_UDID)..."
# Bypass expo (it lowercases UDIDs), use xcodebuild directly
cd ios
xcodebuild -workspace Portals.xcworkspace \
    -scheme "$XCODE_SCHEME" \
    -configuration Release \
    -destination "id=$DEVICE_UDID" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM=Z8622973EB \
    CODE_SIGN_STYLE=Automatic \
    build install
cd ..

build_log "Launching dev client with tunnel URL..."
if [ -z "$TUNNEL_URL" ]; then
    TUNNEL_URL="$(resolve_tunnel_url)"
fi

if [ -n "$TUNNEL_URL" ]; then
    EXPO_URL="$TUNNEL_URL"
    build_log "Tunnel URL: $EXPO_URL"
    PAYLOAD_URL=$(
        EXPO_URL="$EXPO_URL" URL_SCHEME="$URL_SCHEME" python3 - <<'PY'
import urllib.parse
import os

scheme = os.environ["URL_SCHEME"]
url = os.environ["EXPO_URL"]
print(f"{scheme}://expo-development-client/?url=" + urllib.parse.quote(url, safe=""))
PY
    )
    LAUNCH_OUTPUT=$(xcrun devicectl device process launch \
        --device "$DEVICE_NAME" \
        --terminate-existing \
        --payload-url "$PAYLOAD_URL" \
        "$IOS_BUNDLE_ID" 2>&1)
    LAUNCH_EXIT_CODE=$?

    if [ $LAUNCH_EXIT_CODE -ne 0 ]; then
        if echo "$LAUNCH_OUTPUT" | grep -q "device was not.*unlocked"; then
            error "❌ Device is LOCKED. Please unlock your device and run:"
            echo ""
            echo "  xcrun devicectl device process launch --device \"$DEVICE_NAME\" --payload-url \"$PAYLOAD_URL\" $IOS_BUNDLE_ID"
            echo ""
            warn "Or manually open the Portals app on your device."
        else
            warn "devicectl launch failed. Open $EXPO_URL in the dev client manually (bundle id: $IOS_BUNDLE_ID)."
            if [ -n "$LAUNCH_OUTPUT" ]; then
                echo "$LAUNCH_OUTPUT" | head -10
            fi
        fi
    else
        build_log "✅ App launched successfully"
    fi
else
    warn "Could not determine tunnel URL. Set EXPO_TUNNEL_URL or open the dev client manually."
fi

build_log "Done!"
