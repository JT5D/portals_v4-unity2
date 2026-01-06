#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_PROJECT="$PROJECT_ROOT/unity"
LOG_DIR="$PROJECT_ROOT/logs/headless"
UNITY_VERSION="${UNITY_VERSION:-6000.2.14f1}"
UNITY_HUB_PATH="/Applications/Unity/Hub/Editor/${UNITY_VERSION}/Unity.app/Contents/MacOS/Unity"
UNITY_BIN=""

mkdir -p "$LOG_DIR"

if [ -f "$UNITY_HUB_PATH" ]; then
  UNITY_BIN="$UNITY_HUB_PATH"
elif command -v unity >/dev/null 2>&1; then
  UNITY_BIN="$(command -v unity)"
elif [ -n "${UNITY_PATH:-}" ] && [ -f "$UNITY_PATH" ]; then
  UNITY_BIN="$UNITY_PATH"
fi

if [ -z "$UNITY_BIN" ]; then
  echo "[UnityValidate] Unity not found. Set UNITY_PATH or install Unity ${UNITY_VERSION}. Skipping."
  exit 0
fi

"$UNITY_BIN" -batchmode -nographics -quit \
  -projectPath "$UNITY_PROJECT" \
  -executeMethod MCPTools.VerifyAndAutoFix \
  -logFile "$LOG_DIR/unity_validate.log" || {
    echo "[UnityValidate] VerifyAndAutoFix failed. See $LOG_DIR/unity_validate.log"
    exit 1
  }

echo "[UnityValidate] OK"
