#!/bin/bash
# patch-fabric-registry.sh
# Patches RCTThirdPartyComponentsProvider.mm to register RNUnityView with Fabric
#
# WHY THIS IS NEEDED:
# @artmajeur/react-native-unity is NOT auto-registered with React Native's
# Fabric (New Architecture) component registry. Without this registration,
# Fabric doesn't call updateProps, which means initUnityModule never runs.
#
# SYMPTOMS OF MISSING FIX:
# - Unity view shows "Waiting for Unity to initialize" forever
# - No crash, no error logs
# - Native logs show layoutSubviews but never updateProps
#
# WHEN TO RUN:
# After pod install, expo prebuild, or any native file regeneration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REGISTRY_FILE="$PROJECT_ROOT/ios/build/generated/ios/RCTThirdPartyComponentsProvider.mm"

# Check if the file exists
if [ ! -f "$REGISTRY_FILE" ]; then
    echo "[patch-fabric-registry] File not found: $REGISTRY_FILE"
    echo "[patch-fabric-registry] Run 'pod install' first to generate native files"
    exit 0  # Exit gracefully, not an error
fi

# Check if already patched
if grep -q "RNUnityView.*react-native-unity" "$REGISTRY_FILE"; then
    echo "[patch-fabric-registry] ✅ RNUnityView already registered in Fabric"
    exit 0
fi

# Find the line to insert after (last entry before closing brace)
# We insert before the closing }; of the thirdPartyComponents dictionary
if grep -q "@\"RNSSplitViewScreen\"" "$REGISTRY_FILE"; then
    # Insert after RNSSplitViewScreen line (or the last existing entry)
    sed -i '' 's/@"RNSSplitViewScreen": NSClassFromString(@"RNSSplitViewScreenComponentView"), \/\/ react-native-screens/@"RNSSplitViewScreen": NSClassFromString(@"RNSSplitViewScreenComponentView"), \/\/ react-native-screens\
		@"RNUnityView": NSClassFromString(@"RNUnityView"), \/\/ react-native-unity/' "$REGISTRY_FILE"

    if grep -q "RNUnityView.*react-native-unity" "$REGISTRY_FILE"; then
        echo "[patch-fabric-registry] ✅ Successfully added RNUnityView to Fabric registry"
    else
        echo "[patch-fabric-registry] ❌ Failed to patch file"
        exit 1
    fi
else
    echo "[patch-fabric-registry] ⚠️ Could not find insertion point in registry file"
    echo "[patch-fabric-registry] Manual fix needed: Add this line to thirdPartyFabricComponents:"
    echo '    @"RNUnityView": NSClassFromString(@"RNUnityView"), // react-native-unity'
    exit 1
fi
