#!/bin/bash

# Automated Unity-RN Integration Verification
# Monitors device logs and Metro output to verify Unity scene is working

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[AutoVerify] Starting automated Unity-RN integration verification...${NC}"

# Configuration
TIMEOUT=30
METRO_LOG="/tmp/metro-verify.log"
DEVICE_LOG="/tmp/device-verify.log"
RESULTS="/tmp/verify-results.txt"

# Clear previous results
> "$RESULTS"

echo -e "${YELLOW}[AutoVerify] Step 1: Checking Metro bundler status...${NC}"

# Check Metro is running
if ! pgrep -f "expo start.*8081" > /dev/null; then
    echo -e "${RED}[AutoVerify] ❌ Metro bundler not running on port 8081${NC}"
    echo "FAILED: Metro not running" >> "$RESULTS"
    exit 1
fi

echo -e "${GREEN}[AutoVerify] ✅ Metro bundler is running${NC}"
echo "PASS: Metro running" >> "$RESULTS"

echo -e "${YELLOW}[AutoVerify] Step 2: Monitoring Metro logs for Unity messages...${NC}"

# Capture Metro logs for 5 seconds to see if Unity messages are coming through
tail -f ~/.expo/metro-*.log 2>/dev/null > "$METRO_LOG" &
TAIL_PID=$!
sleep 5
kill $TAIL_PID 2>/dev/null || true

# Check for Unity-related activity
if grep -q -i "unity\|bridge\|ready" "$METRO_LOG" 2>/dev/null; then
    echo -e "${GREEN}[AutoVerify] ✅ Unity-related Metro activity detected${NC}"
    echo "PASS: Metro Unity activity" >> "$RESULTS"
    grep -i "unity\|bridge\|ready" "$METRO_LOG" | head -5
else
    echo -e "${YELLOW}[AutoVerify] ⚠️  No Unity messages in Metro logs yet${NC}"
    echo "WARN: No Metro Unity messages" >> "$RESULTS"
fi

echo -e "${YELLOW}[AutoVerify] Step 3: Checking device connectivity...${NC}"

# Check if device is connected
DEVICE_COUNT=$(xcrun xctrace list devices 2>&1 | grep -c "iPad\|iPhone" | grep -v "Simulator" || echo "0")

if [ "$DEVICE_COUNT" -eq "0" ]; then
    echo -e "${RED}[AutoVerify] ❌ No iOS devices connected${NC}"
    echo "FAILED: No device connected" >> "$RESULTS"
    exit 1
fi

DEVICE_NAME=$(xcrun xctrace list devices 2>&1 | grep -i "ipad\|iphone" | grep -v "Simulator" | head -1 | sed 's/ ([0-9].*//')
echo -e "${GREEN}[AutoVerify] ✅ Device connected: $DEVICE_NAME${NC}"
echo "PASS: Device connected ($DEVICE_NAME)" >> "$RESULTS"

echo -e "${YELLOW}[AutoVerify] Step 4: Monitoring device logs...${NC}"

# Check if Console.app or log streaming is available
if command -v idevicesyslog > /dev/null; then
    echo -e "${BLUE}[AutoVerify] Using idevicesyslog for device log monitoring${NC}"

    # Monitor device logs for Unity initialization
    idevicesyslog 2>&1 | grep -i "unity\|bridgetarget\|ready" > "$DEVICE_LOG" &
    LOG_PID=$!

    sleep 10
    kill $LOG_PID 2>/dev/null || true
    wait $LOG_PID 2>/dev/null || true

    if [ -s "$DEVICE_LOG" ]; then
        echo -e "${GREEN}[AutoVerify] ✅ Unity logs detected on device${NC}"
        echo "PASS: Unity device logs" >> "$RESULTS"

        # Check for specific success indicators
        if grep -q "BridgeTarget ready" "$DEVICE_LOG"; then
            echo -e "${GREEN}[AutoVerify] ✅ BridgeTarget initialized${NC}"
            echo "PASS: BridgeTarget ready" >> "$RESULTS"
        fi

        if grep -q "unity_ready" "$DEVICE_LOG"; then
            echo -e "${GREEN}[AutoVerify] ✅ Unity ready signal sent${NC}"
            echo "PASS: Unity ready signal" >> "$RESULTS"
        fi

        echo -e "${BLUE}[AutoVerify] Device log sample:${NC}"
        head -10 "$DEVICE_LOG"
    else
        echo -e "${YELLOW}[AutoVerify] ⚠️  No Unity logs captured (may need app to be active)${NC}"
        echo "WARN: No device Unity logs" >> "$RESULTS"
    fi
else
    echo -e "${YELLOW}[AutoVerify] ⚠️  idevicesyslog not available${NC}"
    echo -e "${BLUE}[AutoVerify] Install with: brew install libimobiledevice${NC}"
    echo "SKIP: Device log monitoring (idevicesyslog not installed)" >> "$RESULTS"
fi

echo -e "${YELLOW}[AutoVerify] Step 5: Checking app installation...${NC}"

# Check if app is installed on device
APP_ID="com.h3mai.portals"
if command -v ideviceinstaller > /dev/null; then
    # Try to list apps, handle "No device found" gracefully
    if APP_LIST=$(ideviceinstaller -l 2>&1); then
        if echo "$APP_LIST" | grep -q "$APP_ID"; then
            echo -e "${GREEN}[AutoVerify] ✅ Portals app is installed on device${NC}"
            echo "PASS: App installed" >> "$RESULTS"
        else
            echo -e "${YELLOW}[AutoVerify] ⚠️  App not found (may need device unlock/trust)${NC}"
            echo "WARN: App not verified (device may need unlock)" >> "$RESULTS"
        fi
    else
        echo -e "${YELLOW}[AutoVerify] ⚠️  Cannot access device (unlock and trust device)${NC}"
        echo "WARN: Device not accessible" >> "$RESULTS"
    fi
else
    echo -e "${YELLOW}[AutoVerify] ⚠️  ideviceinstaller not available (cannot verify app)${NC}"
    echo -e "${BLUE}[AutoVerify] Install with: brew install ideviceinstaller${NC}"
    echo "SKIP: App installation check" >> "$RESULTS"
fi

echo -e "${YELLOW}[AutoVerify] Step 6: Verifying Unity scene files...${NC}"

# Check Unity scene is current
SCENE_PATH="unity/Assets/Scenes/UnityTestScene.unity"
if [ -f "$SCENE_PATH" ]; then
    SCENE_MOD=$(stat -f "%m" "$SCENE_PATH")
    CURRENT_TIME=$(date +%s)
    AGE=$((CURRENT_TIME - SCENE_MOD))

    if [ $AGE -lt 86400 ]; then  # Less than 24 hours old
        echo -e "${GREEN}[AutoVerify] ✅ Unity scene is current (modified $(($AGE / 3600)) hours ago)${NC}"
        echo "PASS: Scene current" >> "$RESULTS"
    else
        echo -e "${YELLOW}[AutoVerify] ⚠️  Unity scene is $(($AGE / 86400)) days old${NC}"
        echo "WARN: Scene older than 24h" >> "$RESULTS"
    fi

    # Verify BridgeTarget is in scene
    if grep -q "BridgeTarget" "$SCENE_PATH"; then
        echo -e "${GREEN}[AutoVerify] ✅ BridgeTarget found in scene${NC}"
        echo "PASS: BridgeTarget in scene" >> "$RESULTS"
    else
        echo -e "${RED}[AutoVerify] ❌ BridgeTarget not found in scene${NC}"
        echo "FAILED: No BridgeTarget in scene" >> "$RESULTS"
    fi
else
    echo -e "${RED}[AutoVerify] ❌ Unity scene file not found${NC}"
    echo "FAILED: Scene file missing" >> "$RESULTS"
fi

echo -e "${YELLOW}[AutoVerify] Step 7: Generating verification report...${NC}"

# Count results
PASS_COUNT=$(grep -c "^PASS:" "$RESULTS" || echo "0")
FAIL_COUNT=$(grep -c "^FAILED:" "$RESULTS" || echo "0")
WARN_COUNT=$(grep -c "^WARN:" "$RESULTS" || echo "0")
SKIP_COUNT=$(grep -c "^SKIP:" "$RESULTS" || echo "0")

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           AUTOMATED VERIFICATION REPORT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Passed:${NC}  $PASS_COUNT"
echo -e "${RED}Failed:${NC}  $FAIL_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo -e "Skipped: $SKIP_COUNT"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo ""
    echo "Failed checks:"
    grep "^FAILED:" "$RESULTS" | sed 's/FAILED: /  - /'
    echo ""
    echo -e "${YELLOW}Manual intervention required. See DEVICE_TESTING_CHECKLIST.md${NC}"
    exit 1
elif [ $WARN_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  VERIFICATION PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings:"
    grep "^WARN:" "$RESULTS" | sed 's/WARN: /  - /'
    echo ""
    echo -e "${BLUE}Recommend manual verification to confirm full functionality${NC}"
    echo -e "${BLUE}See: FINAL_VERIFICATION.md for manual testing steps${NC}"
    exit 0
else
    echo -e "${GREEN}✅ ALL AUTOMATED CHECKS PASSED${NC}"
    echo ""
    echo "What was verified:"
    grep "^PASS:" "$RESULTS" | sed 's/PASS: /  ✓ /'
    echo ""
    echo -e "${GREEN}System is ready for Unity AR development!${NC}"
    echo -e "${BLUE}Optional: Run manual verification for 100% confidence${NC}"
    exit 0
fi
