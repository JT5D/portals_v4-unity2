#!/usr/bin/env bash
set -euo pipefail

# MINIMAL iOS BUILD - Only the essentials
# Designed to fail fast and clearly identify what broke

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

# Check Unity exists
[ -f "$UNITY_BIN" ] || die "Unity not found at $UNITY_BIN"

# Check device connected (before spending time on builds)
DEVICE_LINE=$(xcrun xctrace list devices 2>&1 | sed -n '/^== Devices ==$/,/^==/p' | grep -v "MacBook\|^==" | head -1)
DEVICE_UDID=$(echo "$DEVICE_LINE" | sed -E 's/.*\(([0-9A-F]{8}-[0-9A-F]{16})\).*/\1/')
[ -z "$DEVICE_UDID" ] && die "No iOS device connected. Connect device first."
log "Device found: $DEVICE_LINE (UDID: $DEVICE_UDID)"

# Check Xcode
XCODE_PATH="/Applications/Xcode-164.app/Contents/Developer"
[ -d "$XCODE_PATH" ] || XCODE_PATH=$(xcode-select -p)
export DEVELOPER_DIR="$XCODE_PATH"
log "Using Xcode: $XCODE_PATH"

log "All checks passed. Starting build..."

# =============================================================================
# 1. CLOSE UNITY (required - can't build while open)
# =============================================================================
log "Closing Unity..."
pkill -f "Unity.app/Contents/MacOS/Unity" 2>/dev/null || true
sleep 2

# =============================================================================
# 2. UNITY EXPORT (creates Xcode project at /tmp/unity-ios-export)
# =============================================================================
log "Exporting Unity project..."
mkdir -p "$PROJECT_ROOT/logs"
"$UNITY_BIN" -quit -batchmode \
    -projectPath "$UNITY_PROJECT" \
    -executeMethod BuildScript.PerformIOSBuild \
    -logFile "$PROJECT_ROOT/logs/unity_build.log" || die "Unity export failed. Check logs/unity_build.log"

# Verify export succeeded
[ -d "$EXPORT_PATH/Unity-iPhone.xcodeproj" ] || die "Unity export didn't create Xcode project"
log "Unity export complete"

# =============================================================================
# 3. BUILD GAMEASSEMBLY (creates il2cpp.a)
# =============================================================================
log "Building GameAssembly..."
cd "$EXPORT_PATH"
xcodebuild -project Unity-iPhone.xcodeproj \
    -target GameAssembly \
    -configuration Release \
    -sdk iphoneos \
    SYMROOT="$EXPORT_PATH/DerivedData/Build" \
    CONFIGURATION_BUILD_DIR="$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos" \
    build > "$PROJECT_ROOT/logs/gameassembly.log" 2>&1 || {
        tail -20 "$PROJECT_ROOT/logs/gameassembly.log"
        die "GameAssembly build failed"
    }

# Verify il2cpp.a exists
IL2CPP_PATH="$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/il2cpp.a"
[ -f "$IL2CPP_PATH" ] || die "il2cpp.a not found at $IL2CPP_PATH"
log "GameAssembly complete (il2cpp.a: $(du -h "$IL2CPP_PATH" | cut -f1))"

# =============================================================================
# 4. BUILD UNITYFRAMEWORK
# Why ld-classic? Xcode 15+ new linker has issues with Unity IL2CPP duplicate symbols
# Why force_load? Ensures all IL2CPP runtime symbols are included
# =============================================================================
log "Building UnityFramework..."
xcodebuild -project Unity-iPhone.xcodeproj \
    -scheme UnityFramework \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -derivedDataPath "$EXPORT_PATH/DerivedData" \
    OTHER_LDFLAGS="-Wl,-ld_classic -force_load $IL2CPP_PATH" \
    build > "$PROJECT_ROOT/logs/framework.log" 2>&1 || {
        tail -20 "$PROJECT_ROOT/logs/framework.log"
        die "UnityFramework build failed"
    }

# Verify framework
FRAMEWORK_PATH="$EXPORT_PATH/DerivedData/Build/Products/Release-iphoneos/UnityFramework.framework"
[ -d "$FRAMEWORK_PATH" ] || die "UnityFramework not found"
log "UnityFramework complete ($(du -sh "$FRAMEWORK_PATH" | cut -f1))"

# =============================================================================
# 5. COPY FRAMEWORK
# =============================================================================
log "Copying framework..."
mkdir -p "$FRAMEWORK_DEST"
rm -rf "$FRAMEWORK_DEST/UnityFramework.framework"
cp -R "$FRAMEWORK_PATH" "$FRAMEWORK_DEST/"

# Also sync to node_modules (pod install will do this too, but let's be explicit)
DEST="$PROJECT_ROOT/node_modules/@artmajeur/react-native-unity/ios"
rm -rf "$DEST/UnityFramework.framework"
cp -R "$FRAMEWORK_PATH" "$DEST/"
log "Framework synced"

# =============================================================================
# 6. POD INSTALL
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
# 7. BUILD & INSTALL APP
# CRITICAL: Must use Release - react-native-unity has a bug where DEBUG builds
# reference _mh_dylib_header which only exists in dynamic libraries, not executables
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

log "SUCCESS! App installed on device: $DEVICE_LINE"
