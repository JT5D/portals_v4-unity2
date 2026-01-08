#!/bin/bash

# Common utilities for all build/test scripts
# Source this file: source "$(dirname "$0")/common.sh"

# Color codes
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export RED='\033[0;31m'
export BLUE='\033[0;34m'
export NC='\033[0m'

# Cleanup function - call at start of every script
cleanup_processes() {
    local script_name="$1"
    echo -e "${BLUE}[Cleanup] Checking for stale processes before starting ${script_name}...${NC}"

    local cleaned=false

    # Kill stale idevicesyslog processes
    if pgrep -f "idevicesyslog" > /dev/null; then
        echo -e "${YELLOW}[Cleanup] Killing existing idevicesyslog processes...${NC}"
        pkill -f "idevicesyslog" 2>/dev/null
        cleaned=true
    fi

    # Kill stale monitoring scripts
    if pgrep -f "monitor_unity" > /dev/null; then
        echo -e "${YELLOW}[Cleanup] Killing existing monitoring scripts...${NC}"
        pkill -f "monitor_unity" 2>/dev/null
        cleaned=true
    fi

    # Kill stale build scripts (but not current one)
    if pgrep -f "build_and_run_ios.sh\|build_and_run_android.sh" > /dev/null; then
        local current_pid=$$
        pgrep -f "build_and_run" | while read pid; do
            if [ "$pid" != "$current_pid" ] && [ "$pid" != "$PPID" ]; then
                echo -e "${YELLOW}[Cleanup] Killing stale build script (PID: $pid)...${NC}"
                kill "$pid" 2>/dev/null
                cleaned=true
            fi
        done
    fi

    # Kill stale test automation processes
    if pgrep -f "test_ios_device\|test_unity_editor\|verify_device_unity" > /dev/null; then
        echo -e "${YELLOW}[Cleanup] Killing existing test automation processes...${NC}"
        pkill -f "test_ios_device\|test_unity_editor\|verify_device_unity" 2>/dev/null
        cleaned=true
    fi

    # Kill any background tail processes (log monitoring)
    if pgrep -f "tail.*metro.*log\|tail.*unity.*log" > /dev/null; then
        echo -e "${YELLOW}[Cleanup] Killing background log monitoring processes...${NC}"
        pkill -f "tail.*metro.*log\|tail.*unity.*log" 2>/dev/null
        cleaned=true
    fi

    # Kill stale Unity MCP processes if building (they'll restart)
    if [[ "$script_name" == *"build"* ]]; then
        if pgrep -f "mcp-for-unity" > /dev/null; then
            echo -e "${YELLOW}[Cleanup] Stopping Unity MCP servers for build...${NC}"
            pkill -f "mcp-for-unity" 2>/dev/null
            cleaned=true
        fi
    fi

    # Kill stale Unity processes if building
    if [[ "$script_name" == *"build"* ]]; then
        if pgrep -f "Unity.app" > /dev/null; then
            echo -e "${YELLOW}[Cleanup] Found Unity Editor running (will handle per --force-close-unity flag)${NC}"
        fi
    fi

    # Check for multiple Metro instances (warn but don't kill - might be intentional)
    local metro_count=$(pgrep -f "expo start.*8081" | wc -l)
    if [ "$metro_count" -gt 1 ]; then
        echo -e "${YELLOW}[Cleanup] Warning: Multiple Metro bundlers detected on port 8081${NC}"
        echo -e "${YELLOW}[Cleanup] This may cause conflicts. Consider: pkill -f 'expo start'${NC}"
    fi

    # Clean up any zombie processes related to app testing
    if ps aux | grep -i "portals\|unity" | grep -i "defunct\|zombie" | grep -v grep > /dev/null; then
        echo -e "${YELLOW}[Cleanup] Found zombie processes, cleaning up...${NC}"
        pkill -9 -f "portals\|unity" 2>/dev/null || true
        cleaned=true
    fi

    if [ "$cleaned" = true ]; then
        echo -e "${GREEN}[Cleanup] ✓ Cleanup complete, proceeding...${NC}"
        sleep 1
    else
        echo -e "${GREEN}[Cleanup] ✓ No stale processes found${NC}"
    fi
    echo ""
}

# Verify required tools are installed
check_required_tools() {
    local tools=("$@")
    local missing=()

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing+=("$tool")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}[Error] Missing required tools: ${missing[*]}${NC}"
        echo -e "${YELLOW}[Error] Install with: brew install ${missing[*]}${NC}"
        return 1
    fi

    return 0
}

# Check if Metro is running
check_metro_running() {
    if ! pgrep -f "expo start.*8081" > /dev/null; then
        echo -e "${RED}[Error] Metro bundler not running on port 8081${NC}"
        echo -e "${YELLOW}[Error] Start with: npm start${NC}"
        return 1
    fi
    echo -e "${GREEN}[Check] ✓ Metro bundler running${NC}"
    return 0
}

# Check if device is connected
check_device_connected() {
    local device_count=$(xcrun xctrace list devices 2>&1 | grep -c "iPad\|iPhone" | grep -v "Simulator" || echo "0")

    if [ "$device_count" -eq "0" ]; then
        echo -e "${RED}[Error] No iOS devices connected${NC}"
        echo -e "${YELLOW}[Error] Connect device via USB and ensure it's trusted${NC}"
        return 1
    fi

    local device_name=$(xcrun xctrace list devices 2>&1 | grep -i "ipad\|iphone" | grep -v "Simulator" | head -1 | sed 's/ ([0-9].*//')
    echo -e "${GREEN}[Check] ✓ Device connected: $device_name${NC}"
    return 0
}

# Print section header
print_header() {
    local title="$1"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $title${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

# Print success message
print_success() {
    local message="$1"
    echo -e "${GREEN}✓ $message${NC}"
}

# Print warning message
print_warning() {
    local message="$1"
    echo -e "${YELLOW}⚠ $message${NC}"
}

# Print error message
print_error() {
    local message="$1"
    echo -e "${RED}✗ $message${NC}"
}
