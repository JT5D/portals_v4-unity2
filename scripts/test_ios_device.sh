#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# iOS Device Automated Testing Script
# ============================================================================
# Builds app, deploys to device, and provides testing instructions
# Usage: ./scripts/test_ios_device.sh [--skip-build]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

SKIP_BUILD=false
if [ "${1:-}" = "--skip-build" ]; then
    SKIP_BUILD=true
fi

echo "📱 iOS Device Testing"
echo "===================="
echo ""

# Check for connected devices
echo "🔍 Checking for connected iOS devices..."
DEVICE_LIST=$(xcrun xctrace list devices 2>&1 | grep -E "iPhone|iPad" | grep -v "Simulator" || true)

if [ -z "$DEVICE_LIST" ]; then
    echo "❌ No iOS devices found"
    echo ""
    echo "Please:"
    echo "  1. Connect your iPhone via USB"
    echo "  2. Unlock the device"
    echo "  3. Trust this computer when prompted"
    echo ""
    exit 1
fi

echo "✅ Found devices:"
echo "$DEVICE_LIST"
echo ""

# Extract device name
DEVICE_NAME=$(echo "$DEVICE_LIST" | head -1 | sed -E 's/^([^(]+).*/\1/' | xargs)
echo "📱 Using device: $DEVICE_NAME"
echo ""

# Build if not skipped
if [ "$SKIP_BUILD" = false ]; then
    echo "🏗️  Building app..."
    echo "   This will take 5-15 minutes depending on changes"
    echo ""

    # Check if Unity Editor is open
    if pgrep -f "Unity.app" >/dev/null 2>&1; then
        echo "   Using incremental build (Unity Editor open)..."
        ./scripts/build_and_run_ios.sh --skip-unity-export --keep-unity-open
    else
        echo "   Using full build..."
        ./scripts/build_and_run_ios.sh
    fi

    echo ""
    echo "✅ Build complete"
    echo ""
else
    echo "⏩ Skipping build (--skip-build flag)"
    echo ""
fi

# Check if Metro is running
if ! lsof -i :8081 >/dev/null 2>&1; then
    echo "⚠️  Metro bundler not running"
    echo "   Starting Metro..."
    npm start -- --tunnel &
    METRO_PID=$!
    echo "   Metro PID: $METRO_PID"
    sleep 10
else
    echo "✅ Metro bundler running on port 8081"
fi

echo ""
echo "📲 App should be launching on device..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🧪 MANUAL TESTING CHECKLIST"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "ON YOUR DEVICE:"
echo ""
echo "1. ✓ App launches without crash"
echo ""
echo "2. Navigate to Unity Test Scene:"
echo "   • Tap hamburger menu (☰)"
echo "   • Select 'Unity AR Test'"
echo ""
echo "3. Verify Initial State:"
echo "   ✓ Header: 'Unity AR Test'"
echo "   ✓ Subtitle: 'Unity Status: ⏳ Initializing...'"
echo "   ✓ Ping button DISABLED (gray)"
echo ""
echo "4. Wait 2-5 seconds for Unity to initialize"
echo ""
echo "5. Verify Ready State:"
echo "   ✓ Subtitle: 'Unity Status: ✅ Ready'"
echo "   ✓ Ping button ENABLED (white)"
echo ""
echo "6. Verify Unity Content:"
echo "   ✓ WHITE CUBE visible in center of screen"
echo "   ✓ Debug overlay (top-left) shows logs"
echo "   ✓ Debug overlay includes 'BridgeTarget ready'"
echo ""
echo "7. Test Message Passing:"
echo "   • Tap 'Ping Unity' button"
echo ""
echo "   IN METRO CONSOLE (this terminal):"
echo "   ✓ Should see: 'The button has been tapped!'"
echo "   ✓ Should see: '[Unity Message]: {type: \"pong\", ...}'"
echo ""
echo "   ON DEVICE (debug overlay):"
echo "   ✓ Should see: '[BridgeTarget] Received: ...'"
echo "   ✓ Should see: '[BridgeTarget] Sending: ...'"
echo ""
echo "8. Stress Test:"
echo "   • Tap ping button 5-10 times rapidly"
echo "   ✓ All messages logged"
echo "   ✓ No crashes or freezes"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🎯 SUCCESS CRITERIA:"
echo "   ✅ Unity scene visible (white cube)"
echo "   ✅ Ready state works (⏳ → ✅)"
echo "   ✅ Ping button functional"
echo "   ✅ Messages logged in Metro console"
echo "   ✅ Debug overlay shows Unity logs"
echo ""
echo "❌ FAILURE INDICATORS:"
echo "   • Black screen (no Unity content)"
echo "   • Stuck on '⏳ Initializing...'"
echo "   • Ping button does nothing"
echo "   • No Metro console output"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# Monitor Metro logs
if [ -f logs/metro.pid ]; then
    echo "📊 Monitoring Metro logs (Ctrl+C to stop)..."
    echo "   Watch for:"
    echo "   - 'The button has been tapped!'"
    echo "   - '[Unity Message]: {type: \"pong\", ...}'"
    echo ""
    tail -f logs/metro*.log 2>/dev/null || true
fi
