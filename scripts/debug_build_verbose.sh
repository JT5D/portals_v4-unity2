#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VERBOSE DEBUG BUILD - Incremental debugging with full logging
# Purpose: Isolate exact failure point with comprehensive logs
# =============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_PROJECT="$PROJECT_ROOT/unity"
UNITY_BIN="/Applications/Unity/Hub/Editor/6000.2.14f1/Unity.app/Contents/MacOS/Unity"
EXPORT_PATH="/tmp/unity-ios-export"
FRAMEWORK_DEST="$PROJECT_ROOT/unity/builds/ios"
LOG_DIR="$PROJECT_ROOT/logs/debug_$(date +%Y%m%d_%H%M%S)"
XCODE_PROJECT="$EXPORT_PATH/Unity-iPhone.xcodeproj"

# Create timestamped log directory
mkdir -p "$LOG_DIR"

# =============================================================================
# Logging Functions
# =============================================================================

log() {
    local msg="[$(date '+%H:%M:%S')] [BUILD] $1"
    echo -e "\033[0;32m$msg\033[0m" | tee -a "$LOG_DIR/build.log"
}

warn() {
    local msg="[$(date '+%H:%M:%S')] [WARN] $1"
    echo -e "\033[1;33m$msg\033[0m" | tee -a "$LOG_DIR/build.log"
}

die() {
    local msg="[$(date '+%H:%M:%S')] [ERROR] $1"
    echo -e "\033[0;31m$msg\033[0m" | tee -a "$LOG_DIR/build.log"
    echo ""
    echo "=== LOGS SAVED TO: $LOG_DIR ==="
    echo "  - build.log (main log)"
    echo "  - unity_export.log"
    echo "  - xcode_gameassembly.log"
    echo "  - xcode_framework.log"
    exit 1
}

checkpoint() {
    local name="$1"
    local status="$2"
    echo "[$(date '+%H:%M:%S')] CHECKPOINT: $name - $status" >> "$LOG_DIR/checkpoints.log"
    if [ "$status" = "PASS" ]; then
        log "CHECKPOINT $name: PASS"
    else
        warn "CHECKPOINT $name: $status"
    fi
}

# =============================================================================
# Environment Info
# =============================================================================

log "=== DEBUG BUILD STARTED ==="
log "Log directory: $LOG_DIR"
log "Project root: $PROJECT_ROOT"

{
    echo "=== Environment Info ==="
    echo "Date: $(date)"
    echo "macOS: $(sw_vers -productVersion)"
    echo "Xcode: $(xcodebuild -version | head -1)"
    echo "Unity: $UNITY_BIN"
    echo ""
    echo "=== Xcode Developer Tools ==="
    xcode-select -p
    xcrun -f clang
    xcrun -f ld-classic 2>/dev/null || echo "ld-classic: NOT FOUND"
    echo ""
    echo "=== Device Info ==="
    xcrun xctrace list devices 2>&1 | grep -v "Simulator" | head -10
} > "$LOG_DIR/environment.log" 2>&1

log "Environment info saved to environment.log"

# =============================================================================
# STEP 0: Preflight Checks
# =============================================================================

log "=== STEP 0: Preflight Checks ==="

# Check Unity not running
if pgrep -f "Unity.app/Contents/MacOS/Unity" > /dev/null; then
    warn "Unity Editor is running. Closing..."
    pkill -f "Unity.app/Contents/MacOS/Unity" 2>/dev/null || true
    sleep 3
fi
checkpoint "Unity_Closed" "PASS"

# Check Xcode version
XCODE_VERSION=$(xcodebuild -version | head -1)
log "Using $XCODE_VERSION"
if [[ "$XCODE_VERSION" == *"16."* ]]; then
    log "Xcode 16.x detected - will use ld-classic workaround"
fi
checkpoint "Xcode_Version" "PASS"

# Check ld-classic exists
LD_CLASSIC=$(xcrun -f ld-classic 2>/dev/null || echo "")
if [ -z "$LD_CLASSIC" ]; then
    die "ld-classic not found. Required for Xcode 15+/Unity IL2CPP builds."
fi
log "ld-classic found at: $LD_CLASSIC"
checkpoint "LD_Classic" "PASS"

# =============================================================================
# STEP 1: Unity Export (Optional - skip if exists)
# =============================================================================

if [ "${SKIP_UNITY_EXPORT:-0}" = "1" ] && [ -d "$XCODE_PROJECT" ]; then
    log "=== STEP 1: Skipping Unity Export (SKIP_UNITY_EXPORT=1) ==="
    checkpoint "Unity_Export" "SKIPPED"
else
    log "=== STEP 1: Unity Export ==="

    # Clean previous export
    if [ -d "$EXPORT_PATH" ]; then
        log "Cleaning previous export at $EXPORT_PATH..."
        rm -rf "$EXPORT_PATH"
    fi

    log "Running Unity headless build..."
    "$UNITY_BIN" -quit -batchmode \
        -projectPath "$UNITY_PROJECT" \
        -executeMethod BuildScript.PerformIOSBuild \
        -logFile "$LOG_DIR/unity_export.log" 2>&1 || {
        warn "Unity export returned non-zero. Checking log..."
    }

    # Validate export
    if [ ! -d "$XCODE_PROJECT" ]; then
        die "Unity export failed. No Xcode project at $XCODE_PROJECT. Check $LOG_DIR/unity_export.log"
    fi

    if grep -q "iOS Build Succeeded" "$LOG_DIR/unity_export.log"; then
        log "Unity export succeeded!"
        checkpoint "Unity_Export" "PASS"
    else
        warn "Unity log doesn't contain success message. Proceeding anyway..."
        checkpoint "Unity_Export" "WARN"
    fi
fi

# =============================================================================
# STEP 2: Build GameAssembly (IL2CPP)
# =============================================================================

log "=== STEP 2: Build GameAssembly ==="

cd "$EXPORT_PATH"

# Use -scheme approach (like full script) instead of -target
log "Building GameAssembly with -scheme approach..."
{
    xcodebuild -project Unity-iPhone.xcodeproj \
        -scheme GameAssembly \
        -configuration Release \
        -destination "generic/platform=iOS" \
        -derivedDataPath "$EXPORT_PATH/DerivedData" \
        build 2>&1
} | tee "$LOG_DIR/xcode_gameassembly.log" || {
    checkpoint "GameAssembly_Build" "FAIL"
    die "GameAssembly build failed. Check $LOG_DIR/xcode_gameassembly.log"
}

# Find il2cpp.a - it can be in different locations depending on build setup
IL2CPP_PATH=""
for candidate in \
    "$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/il2cpp.a" \
    "$EXPORT_PATH/DerivedData/Build/Intermediates.noindex/Unity-iPhone.build/Release-iphoneos/artifacts/arm64/"*"/il2cpp.a" \
    "$EXPORT_PATH/DerivedData/Build/Unity-iPhone.build/Release-iphoneos/artifacts/arm64/"*"/il2cpp.a"; do
    if ls $candidate 2>/dev/null; then
        IL2CPP_PATH=$(ls $candidate 2>/dev/null | head -1)
        break
    fi
done

if [ -z "$IL2CPP_PATH" ] || [ ! -f "$IL2CPP_PATH" ]; then
    warn "il2cpp.a not found in expected locations. Searching..."
    IL2CPP_PATH=$(find "$EXPORT_PATH" -name "il2cpp.a" -type f 2>/dev/null | head -1)
fi

if [ -z "$IL2CPP_PATH" ] || [ ! -f "$IL2CPP_PATH" ]; then
    # Log what WAS created for debugging
    log "Files in DerivedData/Build/Products/Release-iphoneos:"
    ls -la "$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/" 2>&1 | tee -a "$LOG_DIR/build.log" || true

    log "All .a files in DerivedData:"
    find "$EXPORT_PATH/DerivedData" -name "*.a" 2>&1 | tee -a "$LOG_DIR/build.log" || true

    die "il2cpp.a not found after GameAssembly build!"
fi

log "Found il2cpp.a at: $IL2CPP_PATH"
log "Size: $(ls -lh "$IL2CPP_PATH" | awk '{print $5}')"
checkpoint "GameAssembly_Build" "PASS"

# =============================================================================
# STEP 3: Build UnityFramework
# =============================================================================

log "=== STEP 3: Build UnityFramework ==="

log "Building UnityFramework with ld-classic workaround..."
{
    xcodebuild -project Unity-iPhone.xcodeproj \
        -scheme UnityFramework \
        -configuration Release \
        -destination "generic/platform=iOS" \
        -derivedDataPath "$EXPORT_PATH/DerivedData" \
        OTHER_LDFLAGS="-Wl,-ld_classic -force_load $IL2CPP_PATH" \
        build 2>&1
} | tee "$LOG_DIR/xcode_framework.log" || {
    checkpoint "Framework_Build" "FAIL"
    die "UnityFramework build failed. Check $LOG_DIR/xcode_framework.log"
}

# Validate framework was created
FRAMEWORK_PATH="$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/UnityFramework.framework"
if [ ! -d "$FRAMEWORK_PATH" ]; then
    # Try alternate location
    FRAMEWORK_PATH=$(find "$EXPORT_PATH/DerivedData" -name "UnityFramework.framework" -type d 2>/dev/null | head -1)
fi

if [ ! -d "$FRAMEWORK_PATH" ]; then
    warn "Framework not found. Checking build products..."
    find "$EXPORT_PATH/DerivedData/Build/Products" -type d -name "*.framework" 2>&1 | tee -a "$LOG_DIR/build.log"
    die "UnityFramework.framework not found!"
fi

log "Framework built at: $FRAMEWORK_PATH"
log "Framework size: $(du -sh "$FRAMEWORK_PATH" | cut -f1)"
checkpoint "Framework_Build" "PASS"

# =============================================================================
# STEP 4: Copy Framework
# =============================================================================

log "=== STEP 4: Copy Framework ==="

mkdir -p "$FRAMEWORK_DEST"
rm -rf "$FRAMEWORK_DEST/UnityFramework.framework"
cp -R "$FRAMEWORK_PATH" "$FRAMEWORK_DEST/"

log "Framework copied to: $FRAMEWORK_DEST/UnityFramework.framework"
checkpoint "Framework_Copy" "PASS"

# =============================================================================
# STEP 5: Sync to node_modules (let pod install handle this)
# =============================================================================

log "=== STEP 5: Pod Install Preparation ==="

# Note: The podspec's prepare_command copies from unity/builds/ios/ to node_modules
# We just need to clear the cache so it runs fresh
log "Framework will be synced via pod install's prepare_command"
checkpoint "NodeModules_Prep" "PASS"

# =============================================================================
# STEP 6: Pod Install
# =============================================================================

log "=== STEP 6: Pod Install ==="

cd "$PROJECT_ROOT/ios"
log "Clearing Pods cache..."
rm -rf Pods Podfile.lock

log "Running pod install..."
{
    LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install 2>&1
} | tee "$LOG_DIR/pod_install.log" || {
    checkpoint "Pod_Install" "FAIL"
    die "Pod install failed. Check $LOG_DIR/pod_install.log"
}

checkpoint "Pod_Install" "PASS"

# =============================================================================
# STEP 7: Build & Install App (Optional)
# =============================================================================

if [ "${BUILD_ONLY:-0}" = "1" ]; then
    log "=== BUILD_ONLY=1, skipping device install ==="
    checkpoint "Device_Install" "SKIPPED"
else
    log "=== STEP 7: Build & Install to Device ==="

    # Find device
    DEVICE_LINE=$(xcrun xctrace list devices 2>&1 | sed -n '/^== Devices ==$/,/^==/p' | grep -v "MacBook\|^==" | head -1)
    DEVICE_UDID=$(echo "$DEVICE_LINE" | sed -E 's/.*\(([0-9A-F]{8}-[0-9A-F]{16})\).*/\1/')

    if [ -z "$DEVICE_UDID" ]; then
        warn "No iOS device found. Skipping install."
        checkpoint "Device_Install" "SKIPPED"
    else
        log "Installing to device: $DEVICE_LINE"
        log "UDID: $DEVICE_UDID"

        {
            xcodebuild -workspace Portals.xcworkspace \
                -scheme Portals \
                -configuration Release \
                -destination "id=$DEVICE_UDID" \
                -allowProvisioningUpdates \
                DEVELOPMENT_TEAM=Z8622973EB \
                build install 2>&1
        } | tee "$LOG_DIR/xcode_app.log" || {
            checkpoint "Device_Install" "FAIL"
            die "App build/install failed. Check $LOG_DIR/xcode_app.log"
        }

        checkpoint "Device_Install" "PASS"
    fi
fi

# =============================================================================
# Summary
# =============================================================================

log ""
log "=== BUILD COMPLETE ==="
log "Logs saved to: $LOG_DIR"
log ""
log "Checkpoints:"
cat "$LOG_DIR/checkpoints.log"
log ""
log "SUCCESS!"
