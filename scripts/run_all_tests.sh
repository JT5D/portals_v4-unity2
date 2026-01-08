#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Complete Unity-RN Integration Test Suite
# ============================================================================
# Runs both Unity Editor and iOS device tests in sequence
# Usage: ./scripts/run_all_tests.sh

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Complete Unity-RN Integration Test Suite"
echo "==========================================="
echo ""

# Phase 1: Unity Editor Tests
echo "═══════════════════════════════════════════"
echo "Phase 1: Unity Editor Testing"
echo "═══════════════════════════════════════════"
echo ""

./scripts/test_unity_editor.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Unity Editor tests failed"
    echo "   Fix Unity Editor issues before testing on device"
    exit 1
fi

echo ""
echo "✅ Unity Editor tests passed!"
echo ""
read -p "Continue to iOS device testing? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping iOS device tests"
    exit 0
fi

# Phase 2: iOS Device Tests
echo ""
echo "═══════════════════════════════════════════"
echo "Phase 2: iOS Device Testing"
echo "═══════════════════════════════════════════"
echo ""

./scripts/test_ios_device.sh

echo ""
echo "✅ All tests complete!"
echo ""
echo "📊 Test Summary:"
echo "  ✓ Unity Editor: BridgeTarget functional"
echo "  ✓ iOS Device: Scene visible, messaging works"
echo ""
echo "🎉 Unity-React Native integration verified!"
