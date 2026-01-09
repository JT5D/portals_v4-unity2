#!/bin/bash
# capture_device_logs.sh - Capture iOS device logs with proper timeout
# Prevents hanging processes that plague idevicesyslog usage

set -e

DURATION=${1:-10}  # Default 10 seconds
FILTER=${2:-"Unity|Bridge|ARDebug|Portals"}  # Default filter

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}[LOG]${NC} Capturing device logs for ${DURATION}s..."
echo -e "${GREEN}[LOG]${NC} Filter: ${FILTER}"

# Get device UDID
UDID=$(idevice_id -l 2>/dev/null | head -1)
if [ -z "$UDID" ]; then
    # Try xcrun as fallback
    UDID=$(xcrun xctrace list devices 2>/dev/null | grep -v "Simulator" | grep -v "Mac" | grep -oE '\([A-F0-9-]{25,}\)' | head -1 | tr -d '()')
fi

if [ -z "$UDID" ]; then
    echo -e "${RED}[ERROR]${NC} No iOS device found. Make sure device is:"
    echo "  - Connected via USB"
    echo "  - Unlocked"
    echo "  - Trusted on this Mac"
    exit 1
fi

echo -e "${GREEN}[LOG]${NC} Device: ${UDID}"

# Create temp file for output
TMPFILE=$(mktemp /tmp/device_logs_XXXXXX.txt)

# Use perl for timeout (always available on macOS)
# This properly kills the process after DURATION seconds
perl -e '
    use strict;
    use warnings;

    my $duration = $ARGV[0];
    my $udid = $ARGV[1];
    my $tmpfile = $ARGV[2];

    my $pid = fork();
    if ($pid == 0) {
        # Child process - run idevicesyslog
        my @cmd = ("idevicesyslog", "-u", $udid);
        open(my $fh, ">", $tmpfile) or die "Cannot open $tmpfile: $!";
        open(STDOUT, ">&", $fh) or die "Cannot redirect STDOUT: $!";
        open(STDERR, ">&", $fh) or die "Cannot redirect STDERR: $!";
        exec(@cmd) or die "Cannot exec: $!";
    } else {
        # Parent process - wait then kill
        sleep($duration);
        kill("TERM", $pid);
        waitpid($pid, 0);
    }
' "$DURATION" "$UDID" "$TMPFILE"

# Display filtered results
echo ""
echo -e "${GREEN}[LOG]${NC} Captured logs:"
echo "----------------------------------------"

if [ -s "$TMPFILE" ]; then
    grep -iE "$FILTER" "$TMPFILE" | head -100 || echo "(No matching logs found)"
else
    echo -e "${YELLOW}[WARN]${NC} No logs captured. Device may be locked or app not running."
fi

echo "----------------------------------------"
echo -e "${GREEN}[LOG]${NC} Full logs saved to: ${TMPFILE}"

# Cleanup old temp files (older than 1 hour)
find /tmp -name "device_logs_*.txt" -mmin +60 -delete 2>/dev/null || true
