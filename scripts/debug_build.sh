#!/usr/bin/env bash
set -euo pipefail

# Simplified debug build - minimal steps for faster iteration
# Usage: ./scripts/debug_build.sh [unity|ios|both]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[Debug] $1${NC}"; }
warn() { echo -e "${YELLOW}[Debug] $1${NC}"; }
error() { echo -e "${RED}[Debug] $1${NC}"; }
info() { echo -e "${CYAN}[Debug] $1${NC}"; }

MODE="${1:-both}"

# Step 1: Check Unity framework exists
check_framework() {
    log "Checking UnityFramework..."
    if [ -d "$PROJECT_ROOT/unity/builds/ios/UnityFramework.framework" ]; then
        local size=$(du -sh "$PROJECT_ROOT/unity/builds/ios/UnityFramework.framework" | cut -f1)
        log "✅ Framework exists: $size"

        # Check Data folder
        if [ -d "$PROJECT_ROOT/unity/builds/ios/UnityFramework.framework/Data" ]; then
            log "✅ Data folder exists"
            ls "$PROJECT_ROOT/unity/builds/ios/UnityFramework.framework/Data/" | head -5
        else
            error "❌ Data folder missing!"
            return 1
        fi
    else
        error "❌ UnityFramework not found. Run full build first."
        return 1
    fi
}

# Step 2: Sync framework to node_modules
sync_framework() {
    log "Syncing framework to node_modules..."
    local dest="$PROJECT_ROOT/node_modules/@artmajeur/react-native-unity/ios"

    if [ -d "$dest/UnityFramework.framework" ]; then
        rm -rf "$dest/UnityFramework.framework"
    fi

    cp -R "$PROJECT_ROOT/unity/builds/ios/UnityFramework.framework" "$dest/"
    log "✅ Framework synced"
}

# Step 3: Quick pod install (no cache clear)
quick_pod() {
    log "Running pod install (keeping cache)..."
    cd "$PROJECT_ROOT/ios"
    pod install --repo-update 2>&1 | tail -5
    cd "$PROJECT_ROOT"
    log "✅ Pods installed"
}

# Step 4: Build and install to device
build_ios() {
    log "Building iOS app..."

    # Find device
    local device_udid=$(xcrun xctrace list devices 2>&1 | grep -i "IMClab\|iPad\|iPhone" | grep -v "Simulator" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

    if [ -z "$device_udid" ]; then
        error "No device found"
        return 1
    fi

    log "Device UDID: $device_udid"

    # Find Xcode
    local xcode_path="/Applications/Xcode-164.app/Contents/Developer"
    if [ ! -d "$xcode_path" ]; then
        xcode_path=$(xcode-select -p)
    fi

    cd "$PROJECT_ROOT/ios"
    DEVELOPER_DIR="$xcode_path" xcodebuild \
        -workspace Portals.xcworkspace \
        -scheme Portals \
        -configuration Debug \
        -destination "id=$device_udid" \
        -allowProvisioningUpdates \
        DEVELOPMENT_TEAM=Z8622973EB \
        build install 2>&1 | grep -E "Build|error:|warning:|INSTALL" | tail -20

    cd "$PROJECT_ROOT"
    log "✅ Build complete"
}

# Step 5: Start Metro
start_metro() {
    log "Starting Metro..."

    # Kill existing
    pkill -f "expo start" 2>/dev/null || true

    cd "$PROJECT_ROOT"
    npx expo start --dev-client --tunnel --port 8081 &

    sleep 5
    log "✅ Metro started"
}

# Step 6: Launch app
launch_app() {
    log "Launching app..."

    local device_name=$(xcrun xctrace list devices 2>&1 | grep -i "IMClab\|iPad\|iPhone" | grep -v "Simulator" | head -1 | sed -E 's/^([^(]+).*/\1/' | xargs)

    xcrun devicectl device process launch \
        --device "$device_name" \
        --terminate-existing \
        com.h3mai.portals 2>&1 || warn "Launch may have failed - check device"

    log "✅ App launched"
}

# Main flow
info "=== Debug Build Mode: $MODE ==="

case "$MODE" in
    unity)
        warn "Unity-only not implemented yet. Use full build."
        ;;
    ios)
        check_framework
        sync_framework
        quick_pod
        build_ios
        launch_app
        ;;
    metro)
        start_metro
        ;;
    launch)
        launch_app
        ;;
    check)
        check_framework
        ;;
    both|*)
        check_framework
        sync_framework
        quick_pod
        build_ios
        start_metro
        launch_app
        ;;
esac

log "=== Done ==="
