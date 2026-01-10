#!/bin/bash
# scripts/verify_device_logs.sh
# Automates the verification of the running app on a connected iOS device.

# 1. Check for device
DEVICE_ID=$(idevice_id -l | head -n 1)
if [ -z "$DEVICE_ID" ]; then
    echo "❌ No device found. Please connect an iPhone via USB."
    exit 1
fi

echo "🔍 Monitoring logs on device $DEVICE_ID..."
echo "Waiting for 'Unity' activity... (Press Ctrl+C to stop manually)"

# 2. Grep for our specific success markers
# We look for:
# - "Bridge Status" (From our new OnGUI)
# - "Unity version" (Standard Unity boot log)
# - "Spawn Brush Request" (From our button press)

idevicesyslog -u "$DEVICE_ID" | grep --line-buffered -E "Bridge Status|Unity version|Spawn Brush|UnityTestScene|VisualEffect" | while read -r line ; do
    echo "$line"

    # Analyze the line
    if [[ "$line" == *"Bridge Status"* ]]; then
        echo "✅ SUCCESS: New BridgeTarget code is running!"
        exit 0
    fi

    if [[ "$line" == *"Spawn Brush Request"* ]]; then
        echo "✅ SUCCESS: Bridge received the Spawn command!"
    fi

    if [[ "$line" == *"Asset not found"* ]]; then
        echo "❌ FAILURE: Resources.Load failed to find the VFX asset."
        exit 1
    fi
done
