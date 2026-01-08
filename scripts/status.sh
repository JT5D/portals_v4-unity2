#!/usr/bin/env bash
# Quick status check for Unity-RN integration

echo "🔍 Unity-RN Integration Status"
echo "=============================="
echo ""

# Check Unity Editor
if pgrep -f "Unity.app.*portals_v4" >/dev/null 2>&1; then
    echo "✅ Unity Editor: Running"
    if lsof -i :6400 >/dev/null 2>&1; then
        echo "✅ Unity MCP: Connected (port 6400)"
    else
        echo "⚠️  Unity MCP: Not connected"
    fi
else
    echo "❌ Unity Editor: Not running"
fi

# Check Metro
if lsof -i :8081 >/dev/null 2>&1; then
    echo "✅ Metro: Running (port 8081)"
else
    echo "❌ Metro: Not running"
fi

# Check device connection
DEVICES=$(xcrun xctrace list devices 2>&1 | grep -iE "iphone|ipad" | grep -v "Simulator" | head -1 || echo "")
if [ -n "$DEVICES" ]; then
    DEVICE_NAME=$(echo "$DEVICES" | sed -E 's/^([^(]+).*/\1/' | xargs)
    echo "✅ iOS Device: $DEVICE_NAME (paired)"
else
    echo "⚠️  iOS Device: Not paired (run ./scripts/pair_device.sh)"
fi

# Check critical files
echo ""
echo "📁 Critical Files:"
[ -f ".claudeignore" ] && echo "✅ .claudeignore" || echo "❌ .claudeignore missing"
[ -f "unity/Assets/Scenes/UnityTestScene.unity" ] && echo "✅ UnityTestScene.unity" || echo "❌ Scene missing"
[ -d "node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework" ] && echo "✅ Custom UnityFramework in node_modules" || echo "⚠️  UnityFramework not copied"

# Check git status
echo ""
echo "📊 Git Status:"
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"
UNCOMMITTED=$(git status --short | wc -l | xargs)
if [ "$UNCOMMITTED" -eq 0 ]; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  $UNCOMMITTED uncommitted file(s)"
fi

# Next steps
echo ""
echo "🚀 Next Steps:"
if [ -z "$DEVICES" ]; then
    echo "  → Run: ./scripts/pair_device.sh"
else
    echo "  → Run: ios-fast  (or ios-full for full rebuild)"
    echo "  → Test: Navigate to Unity AR Test in app"
fi
