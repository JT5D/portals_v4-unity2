#!/usr/bin/env bash
set -euo pipefail

# MINIMAL iOS BUILD - Simplified based on research (Jan 2026)
#
# KEY FINDINGS:
# 1. Unity's Xcode project has proper target dependencies:
#    UnityFramework → GameAssembly (automatically built)
# 2. il2cpp.a is already in Unity's OTHER_LDFLAGS - no manual force_load needed
# 3. -Wl,-ld_classic needed for Xcode 15+ linker compatibility
# 4. Release config required (react-native-unity DEBUG has _mh_dylib_header bug)
#
# References:
# - https://docs.unity3d.com/Manual/StructureOfXcodeProject.html
# - https://developer.apple.com/forums/thread/749458

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_PROJECT="$PROJECT_ROOT/unity"
UNITY_BIN="/Applications/Unity/Hub/Editor/6000.2.14f1/Unity.app/Contents/MacOS/Unity"
EXPORT_PATH="/tmp/unity-ios-export"
FRAMEWORK_DEST="$PROJECT_ROOT/unity/builds/ios"

log() { echo "[BUILD] $1"; }
die() { echo "[ERROR] $1"; exit 1; }

# =============================================================================
# FAIL-FAST CHECKS (< 5 seconds)
# =============================================================================
log "Running fail-fast checks..."

# Check if another build is already running
LOCK_FILE="/tmp/build_minimal.lock"
if [ -f "$LOCK_FILE" ]; then
    OTHER_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if kill -0 "$OTHER_PID" 2>/dev/null; then
        die "Another build is running (PID $OTHER_PID). Wait or kill it: kill $OTHER_PID"
    fi
fi
echo $$ > "$LOCK_FILE"
trap "rm -f '$LOCK_FILE'" EXIT

[ -f "$UNITY_BIN" ] || die "Unity not found at $UNITY_BIN"

DEVICE_LINE=$(xcrun xctrace list devices 2>&1 | sed -n '/^== Devices ==$/,/^==/p' | grep -v "MacBook\|^==" | head -1)
DEVICE_UDID=$(echo "$DEVICE_LINE" | sed -E 's/.*\(([0-9A-F]{8}-[0-9A-F]{16})\).*/\1/')
[ -z "$DEVICE_UDID" ] && die "No iOS device connected."
log "Device: $DEVICE_LINE"
DEVICE_NAME=$(echo "$DEVICE_LINE" | sed -E 's/ \([0-9.]+\) \([0-9A-F-]+\)$//')

BUNDLE_ID="com.h3mai.portals"

XCODE_PATH="/Applications/Xcode-164.app/Contents/Developer"
[ -d "$XCODE_PATH" ] || XCODE_PATH=$(xcode-select -p)
export DEVELOPER_DIR="$XCODE_PATH"
log "Xcode: $XCODE_PATH"

log "Checks passed. Starting build..."

# =============================================================================
# 1. CLOSE UNITY
# =============================================================================
log "Closing Unity..."
pkill -f "Unity.app/Contents/MacOS/Unity" 2>/dev/null || true
sleep 2

# =============================================================================
# 2. UNITY EXPORT
# =============================================================================
log "Exporting Unity project..."
mkdir -p "$PROJECT_ROOT/logs"
"$UNITY_BIN" -quit -batchmode \
    -projectPath "$UNITY_PROJECT" \
    -executeMethod BuildScript.PerformIOSBuild \
    -logFile "$PROJECT_ROOT/logs/unity_build.log" || die "Unity export failed. Check logs/unity_build.log"

[ -d "$EXPORT_PATH/Unity-iPhone.xcodeproj" ] || die "Unity export didn't create Xcode project"
log "Unity export complete"

# =============================================================================
# 3. BUILD UNITYFRAMEWORK
# Note: GameAssembly is built automatically due to Xcode target dependency
# -Wl,-ld_classic needed for Xcode 15+ linker compatibility with Unity IL2CPP
# =============================================================================
log "Building UnityFramework (includes GameAssembly via dependency)..."
cd "$EXPORT_PATH"
xcodebuild -project Unity-iPhone.xcodeproj \
    -scheme UnityFramework \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -derivedDataPath "$EXPORT_PATH/DerivedData" \
    OTHER_LDFLAGS='$(inherited) -Wl,-ld_classic' \
    build > "$PROJECT_ROOT/logs/framework.log" 2>&1 || {
        tail -20 "$PROJECT_ROOT/logs/framework.log"
        die "UnityFramework build failed"
    }

FRAMEWORK_PATH="$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/UnityFramework.framework"
[ -d "$FRAMEWORK_PATH" ] || die "UnityFramework not found"
log "UnityFramework complete ($(du -sh "$FRAMEWORK_PATH" | cut -f1))"

# =============================================================================
# 4. COPY FRAMEWORK
# =============================================================================
log "Copying framework..."
mkdir -p "$FRAMEWORK_DEST"
rm -rf "$FRAMEWORK_DEST/UnityFramework.framework"
cp -R "$FRAMEWORK_PATH" "$FRAMEWORK_DEST/"

DEST="$PROJECT_ROOT/node_modules/@artmajeur/react-native-unity/ios"
rm -rf "$DEST/UnityFramework.framework"
cp -R "$FRAMEWORK_PATH" "$DEST/"
log "Framework synced"

# =============================================================================
# 5. POD INSTALL
# =============================================================================
log "Running pod install..."
cd "$PROJECT_ROOT/ios"
rm -rf Pods Podfile.lock
pod install > "$PROJECT_ROOT/logs/pod_install.log" 2>&1 || {
    tail -20 "$PROJECT_ROOT/logs/pod_install.log"
    die "Pod install failed"
}
log "Pod install complete"

# =============================================================================
# 6. BUILD & INSTALL APP
# CRITICAL: Must use Release - react-native-unity DEBUG has _mh_dylib_header bug
# =============================================================================
log "Building and installing app..."
xcodebuild -workspace Portals.xcworkspace \
    -scheme Portals \
    -configuration Release \
    -destination "id=$DEVICE_UDID" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM=Z8622973EB \
    CODE_SIGN_STYLE=Automatic \
    build install > "$PROJECT_ROOT/logs/app_build.log" 2>&1 || {
        tail -30 "$PROJECT_ROOT/logs/app_build.log"
        die "App build failed"
    }

log "App installed on device: $DEVICE_LINE"

# =============================================================================
# 7. LAUNCH APP
# =============================================================================
log "Launching app..."
xcrun devicectl device process launch \
    --device "$DEVICE_NAME" \
    --terminate-existing \
    "$BUNDLE_ID" 2>&1 && log "SUCCESS! App launched on $DEVICE_NAME" || {
        log "Auto-launch failed (device may be locked). Open app manually."
    }
