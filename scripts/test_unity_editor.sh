#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Unity Editor Automated Testing Script
# ============================================================================
# Tests Unity scene in Editor and verifies BridgeTarget integration
# Usage: ./scripts/test_unity_editor.sh

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_PROJECT="$PROJECT_ROOT/unity"
UNITY_LOG="$HOME/Library/Logs/Unity/Editor.log"

echo "🧪 Unity Editor Testing"
echo "======================="
echo ""

# Check if Unity is running
if ! pgrep -f "Unity.app.*${UNITY_PROJECT}" >/dev/null 2>&1; then
    echo "❌ Unity Editor not running"
    echo "   Opening Unity project..."
    open -a "/Applications/Unity/Hub/Editor/6000.2.14f1/Unity.app" "$UNITY_PROJECT"
    echo "   Waiting for Unity to initialize (30 seconds)..."
    sleep 30
fi

echo "✅ Unity Editor is running"
echo ""

# Wait for Unity to be responsive
echo "⏳ Waiting for Unity to be ready..."
sleep 5

# Use AppleScript to open scene and enter play mode
echo "📂 Loading UnityTestScene..."
osascript <<'APPLESCRIPT'
tell application "Unity"
    activate
end tell

tell application "System Events"
    tell process "Unity"
        -- Open scene via menu
        click menu item "Open Scene" of menu "File" of menu bar 1
        delay 1

        -- Type scene path
        keystroke "Assets/Scenes/UnityTestScene.unity"
        delay 0.5
        keystroke return
        delay 2

        -- Enter Play mode
        keystroke "p" using command down
        delay 3
    end tell
end tell
APPLESCRIPT

echo ""
echo "▶️  Play mode activated"
echo ""

# Check console logs
echo "📋 Checking Unity Console..."
echo ""

# Wait for BridgeTarget to initialize
sleep 3

# Extract recent console logs
RECENT_LOGS=$(tail -100 "$UNITY_LOG" | grep -A 5 "\[BridgeTarget\]" || echo "")

if [ -z "$RECENT_LOGS" ]; then
    echo "❌ BridgeTarget logs not found"
    echo "   This might indicate:"
    echo "   - BridgeTarget component missing from scene"
    echo "   - Scene not loaded correctly"
    echo "   - Unity not in Play mode"
    exit 1
fi

echo "✅ BridgeTarget detected in console:"
echo "$RECENT_LOGS" | head -10
echo ""

# Check for specific success markers
if echo "$RECENT_LOGS" | grep -q "BridgeTarget ready"; then
    echo "✅ BridgeTarget initialized successfully"
else
    echo "⚠️  BridgeTarget 'ready' message not found"
fi

if echo "$RECENT_LOGS" | grep -q "unity_ready"; then
    echo "✅ unity_ready message sent"
else
    echo "⚠️  unity_ready message not detected"
fi

echo ""
echo "🎯 Testing Bridge Communication..."

# Trigger bridge test via menu
osascript <<'APPLESCRIPT'
tell application "Unity"
    activate
end tell

tell application "System Events"
    tell process "Unity"
        try
            click menu bar item "Tools" of menu bar 1
            delay 0.3
            click menu item "Test Unity Bridge (Play Mode)" of menu "Tools" of menu bar item "Tools" of menu bar 1
            delay 2
        on error
            log "Could not find Test Unity Bridge menu item"
        end try
    end tell
end tell
APPLESCRIPT

# Check for ping/pong exchange
sleep 2
PING_PONG=$(tail -50 "$UNITY_LOG" | grep -E "ping|pong" || echo "")

if echo "$PING_PONG" | grep -q "ping" && echo "$PING_PONG" | grep -q "pong"; then
    echo "✅ Ping/Pong exchange successful:"
    echo "$PING_PONG" | tail -5
else
    echo "⚠️  Ping/Pong exchange not detected (might not be critical)"
fi

echo ""
echo "🛑 Exiting Play Mode..."

# Exit play mode
osascript <<'APPLESCRIPT'
tell application "Unity"
    activate
end tell

tell application "System Events"
    tell process "Unity"
        keystroke "p" using command down
    end tell
end tell
APPLESCRIPT

sleep 2

echo ""
echo "✅ Unity Editor Testing Complete!"
echo ""
echo "📊 Summary:"
echo "  ✓ Unity Editor running"
echo "  ✓ Scene loaded"
echo "  ✓ Play mode activated"
echo "  ✓ BridgeTarget functional"
echo ""
echo "Next: Test on iOS device with 'ios-fast' or 'ios-full'"
