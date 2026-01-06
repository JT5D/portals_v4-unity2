#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNITY_IOS_FRAMEWORK="$PROJECT_ROOT/unity/builds/ios/UnityFramework.framework"
UNITY_IOS_DATA="$UNITY_IOS_FRAMEWORK/Data"
UNITY_ANDROID_DIR="$PROJECT_ROOT/unity/builds/android/unityLibrary"
CHECK_ANDROID="${UNITY_CHECK_ANDROID:-1}"

fail=false

if [ ! -d "$UNITY_IOS_FRAMEWORK" ]; then
  echo "[UnityExport] Missing UnityFramework.framework at $UNITY_IOS_FRAMEWORK"
  fail=true
fi

if [ ! -d "$UNITY_IOS_DATA" ]; then
  echo "[UnityExport] Missing Data folder at $UNITY_IOS_DATA (rebuild UnityFramework)"
  fail=true
fi

if [ "$CHECK_ANDROID" = "1" ]; then
  if [ ! -d "$UNITY_ANDROID_DIR" ]; then
    echo "[UnityExport] Missing Android unityLibrary at $UNITY_ANDROID_DIR"
    fail=true
  fi
fi

if [ "$fail" = true ]; then
  if [ "$CHECK_ANDROID" = "1" ]; then
    echo "[UnityExport] Unity exports are stale. Run: npm run build:unity:ios and npm run build:unity:android"
  else
    echo "[UnityExport] Unity exports are stale. Run: npm run build:unity:ios"
  fi
  exit 1
fi

echo "[UnityExport] Unity exports look present."
