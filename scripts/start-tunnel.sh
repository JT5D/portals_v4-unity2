#!/bin/bash

# Kill any stale processes
pkill -f ngrok 2>/dev/null
lsof -ti :8081 | xargs kill -9 2>/dev/null
rm -rf .expo 2>/dev/null

echo "🚀 Starting Expo with tunnel..."
echo ""

# Start Expo in the background
npx expo start --dev-client --tunnel &
EXPO_PID=$!

# Wait for tunnel to be ready
echo "⏳ Waiting for tunnel..."
for i in {1..30}; do
    sleep 1
    TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$TUNNEL_URL" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🌐 TUNNEL URL: $TUNNEL_URL"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📱 Enter this URL in your dev client app on your phone"
        echo ""
        break
    fi
done

# Bring Expo back to foreground
wait $EXPO_PID
