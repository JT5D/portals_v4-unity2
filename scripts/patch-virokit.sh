#!/bin/bash
# scripts/patch-virokit.sh
# This script handles fixes that patch-package can't easily do (file creation and shell-based logic)

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIRO_FRAMEWORK_PATH="$PROJECT_DIR/node_modules/@reactvision/react-viro/ios/dist/ViroRenderer/ViroKit.framework"

echo "Running ViroKit post-install patches..."

# 1. Fix missing localization files that cause installation failures on physical devices
# This prevents: Error: ENOENT: no such file or directory, open ... GoogleKitHUD.strings
STRINGS_DIR="$VIRO_FRAMEWORK_PATH/GoogleKitHUD.bundle/Resources/he.lproj"
if [ -d "$VIRO_FRAMEWORK_PATH" ]; then
    mkdir -p "$STRINGS_DIR"
    if [ ! -f "$STRINGS_DIR/GoogleKitHUD.strings" ]; then
        touch "$STRINGS_DIR/GoogleKitHUD.strings"
        echo "✅ Created missing GoogleKitHUD localization files"
    fi
fi

# 2. Patch ViroKit.podspec for PromisesObjC (Secondary check, patch-package also handles this)
PODSPEC="$PROJECT_DIR/node_modules/@reactvision/react-viro/ios/dist/ViroRenderer/ViroKit.podspec"
if [ -f "$PODSPEC" ]; then
    if ! grep -q "PromisesObjC" "$PODSPEC"; then
        sed -i '' "s/s.dependency 'React'/s.dependency 'React'\n  s.dependency 'PromisesObjC', '~> 2.4'/" "$PODSPEC"
        echo "✅ Patched ViroKit.podspec"
    fi
fi

echo "Done."
