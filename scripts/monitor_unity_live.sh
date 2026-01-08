#!/bin/bash

# Live Unity-RN Integration Monitor
# Run this WHILE testing the app on device

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Live Unity-RN Integration Monitor             ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${YELLOW}Instructions:${NC}"
echo "1. Unlock your iPad and open Portals app"
echo "2. Navigate to Unity AR Test screen"
echo "3. Watch this terminal for real-time logs"
echo "4. Tap Ping Unity button and verify response appears"
echo ""
echo -e "${BLUE}Monitoring Unity logs... (Ctrl+C to stop)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Monitor device logs with color coding
idevicesyslog 2>&1 | while IFS= read -r line; do
    # Filter Unity-related logs
    if echo "$line" | grep -q -i "unity\|bridge\|portals"; then
        # Color code based on content
        if echo "$line" | grep -q -i "error\|exception\|fail"; then
            echo -e "${RED}[ERROR]${NC} $line"
        elif echo "$line" | grep -q -i "ready\|success\|initialized"; then
            echo -e "${GREEN}[✓]${NC} $line"
        elif echo "$line" | grep -q -i "ping\|pong\|message"; then
            echo -e "${BLUE}[MSG]${NC} $line"
        else
            echo -e "${YELLOW}[INFO]${NC} $line"
        fi
    fi
done
