# TODO - portals_v4

## Active Tasks
- [x] Test Unity incremental changes only (no clean build) to verify Replace mode behavior
- [ ] Document SimpleBrush.vfx and VFX system usage
- [ ] Create Firebase schema documentation
- [x] Document AR scene current state vs planned state
- [ ] Add performance baselines (FPS, memory, network)

## ccache Investigation (2026-01-09)

**Finding**: ccache shows 0% usage despite being properly configured.

**Root Cause**: React Native 0.81+ uses `React-Core-prebuilt` - Meta pre-compiles the C++ core, so there's minimal local C++ compilation. The CC override is set correctly but there's almost nothing to cache.

**Impact**: ccache provides minimal benefit for this project because:
1. React Native core is prebuilt (no local C++ compilation)
2. Third-party pods (lottie, etc.) use Swift or direct clang
3. Unity IL2CPP is compiled separately (not via Pods)

**Recommendation**: Keep ccache enabled (costs nothing) but don't expect significant speedups. Focus on:
- Unity Append mode (verified working)
- Xcode DerivedData caching (automatic)
- Skipping unnecessary steps (--skip-unity-export)

## Build Optimization (Completed)
- [x] Enable ccache in `ios/Podfile.properties.json`
- [x] Add build lock mechanism to prevent concurrent builds
- [x] Document JS-only reinstall command in CLAUDE.md
- [x] Simplify Claude Code permissions (191 → 9 wildcards)
- [x] Implement Unity Append mode for incremental IL2CPP builds

## Backlog
- [ ] Evaluate if pod install can be skipped when only JS changes

---

## Debug Workflow (Standard Pattern)

```bash
# 1. Build & deploy
./scripts/build_minimal.sh

# 2. Watch device logs (separate terminal)
idevicesyslog | grep -E "Bridge|Unity|Error"

# 3. JS-only iteration (no Unity rebuild)
cd ios && xcodebuild -workspace Portals.xcworkspace -scheme Portals \
    -configuration Release -destination "id=$(xcrun xctrace list devices 2>&1 | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' | head -1)" \
    -allowProvisioningUpdates DEVELOPMENT_TEAM=Z8622973EB build install

# 4. Check Unity console (via MCP)
# Use: mcp__UnityMCP__read_console
```

---

## Recent Test Results (2026-01-10)

| Test | Result | Notes |
|------|--------|-------|
| Unity Append Mode | ✅ Working | Build showed "iOS Build Mode: Append (incremental)" |
| ccache | ⚠️ Limited | RN 0.81+ uses prebuilt core - minimal C++ to cache |
| Build Time | ~5 min | Incremental (Unity + Xcode + install) |
| App Install | ✅ Success | `com.h3mai.portals` v1.0.0 deployed to device |
| AR Session | ✅ Working | Reaches "Running" state on device |
| Bridge Handshake | ✅ Working | `unity_ready` → UI enabled |
| Debug Overlay | ✅ Working | FPS counter visible |

---

---

## Architecture Audit Findings (2026-01-10)

**New Spec Docs Created**:
- `specs/ARCHITECTURE_AUDIT_2026.md` - Comprehensive architecture overview
- `specs/KNOWN_ISSUES_AND_FIXES.md` - Issue troubleshooting guide

**Documentation Gaps Identified**:
1. SimpleBrush.vfx and VFX system undocumented
2. Firebase schema missing
3. AR scene current state vs planned unclear
4. Performance baselines not defined
5. Sample assets (URP/VFX) purpose unclear

**Component Inventory**:
- 27 screen components
- 13 shared components
- 15+ services
- 26 Unity packages
- 58 npm dependencies

---

## Current AR Testing State (2026-01-10)

**Active Scene**: `ARTestScene.unity` (Scene 0 in build)

| Component | Status | Notes |
|-----------|--------|-------|
| ARSession | ✅ Working | Reaches "Running" state |
| ARMeshManager | ✅ Added | Mesh reconstruction |
| ARPlaneManager | 🔄 Testing | Plane detection (horizontal) |
| XR Origin | ✅ Working | `ARF XR Origin Set Up.prefab` |
| Debug Overlay | ✅ Working | `ARDebugOverlay.cs` shows FPS |
| BridgeTarget | ✅ Working | RN ↔ Unity messaging |

**Remaining Phase 5 Criteria**:
- [ ] Confirm plane detection on flat surface
- [ ] Clear error logs in device console

**Build Times** (optimized):
- `build_minimal.sh`: ~5 min (incremental)
- `build_and_run_ios.sh`: ~7 min (full)

*Last updated: 2026-01-10*
