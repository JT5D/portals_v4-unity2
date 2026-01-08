#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Device Pairing Helper Script
# ============================================================================
# Opens Xcode to pair devices, then retries iOS deployment
# Usage: ./scripts/pair_device.sh

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📱 iOS Device Pairing Helper"
echo "============================"
echo ""
echo "This script will:"
echo "  1. Open Xcode Devices window for pairing"
echo "  2. Wait for you to pair the device"
echo "  3. Retry iOS deployment automatically"
echo ""

# Check for connected devices via USB
echo "🔍 Checking USB connections..."
DEVICES=$(system_profiler SPUSBDataType 2>/dev/null | grep -i "iphone\|ipad" || true)

if [ -z "$DEVICES" ]; then
    echo "❌ No iOS devices found via USB"
    echo ""
    echo "Please:"
    echo "  1. Connect your iPhone/iPad via USB cable"
    echo "  2. Unlock the device"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ iOS device detected via USB"
echo ""

# Open Xcode Devices window
echo "🚀 Opening Xcode Devices window..."
open -a Xcode ios/Portals.xcworkspace

sleep 3

# Use AppleScript to open Devices window
osascript <<'APPLESCRIPT' || true
tell application "Xcode"
    activate
end tell

tell application "System Events"
    tell process "Xcode"
        keystroke "2" using {command down, shift down}
    end tell
end tell
APPLESCRIPT

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 PAIRING INSTRUCTIONS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "In the Xcode Devices window that just opened:"
echo ""
echo "1. ✓ Select your device in the left sidebar"
echo ""
echo "2. If you see 'Trust This Computer?' on your device:"
echo "   • Unlock your device"
echo "   • Tap 'Trust'"
echo "   • Enter device passcode"
echo ""
echo "3. In Xcode, you may see:"
echo "   • 'Use for Development' button → Click it"
echo "   • 'Register Device' → Click it"
echo "   • Symbol processing progress → Wait for it to complete"
echo ""
echo "4. When you see your device with:"
echo "   • Green status indicator"
echo "   • Device name and iOS version"
echo "   • No warnings/errors"
echo ""
echo "   ▶️  You're ready!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Press ENTER when device pairing is complete..." -r
echo ""

# Verify device is now visible to xcodebuild
echo "🔍 Verifying device is now paired..."
DEVICE_NAME=$(xcrun xctrace list devices 2>&1 | grep -i "iphone\|ipad" | grep -v "Simulator" | head -1 | sed -E 's/^([^(]+).*/\1/' | xargs || echo "")

if [ -z "$DEVICE_NAME" ]; then
    echo "❌ Device still not visible to Xcode command line tools"
    echo ""
    echo "This usually means:"
    echo "  • Trust dialog not completed on device"
    echo "  • Device not unlocked"
    echo "  • Need to restart Xcode"
    echo ""
    echo "Try:"
    echo "  1. Restart Xcode (Xcode > Quit Xcode)"
    echo "  2. Reconnect USB cable"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Device paired: $DEVICE_NAME"
echo ""

# Offer to deploy now
echo "🚀 Device is paired! Ready to deploy."
echo ""
read -p "Deploy app now? (Y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    echo "🏗️  Deploying to device..."
    echo ""
    ./scripts/build_and_run_ios.sh --skip-unity-export --skip-preflight
else
    echo ""
    echo "✅ Device paired! Deploy later with:"
    echo "   ios-fast  (or ./scripts/build_and_run_ios.sh --skip-unity-export)"
fi
