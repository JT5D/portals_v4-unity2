# TODO - portals_v4

## Active Tasks
- [ ] Test Unity incremental changes only (no clean build) to verify Append mode speedup

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

## Recent Test Results (2026-01-09)

| Test | Result | Notes |
|------|--------|-------|
| Unity Append Mode | ✅ Working | Build showed "iOS Build Mode: Append (incremental)" |
| ccache | ✅ Installed | First build warmed cache (0% → needs 2nd build to verify hits) |
| Build Time | ~4 min | 8:45 AM → 8:49 AM (includes Unity export + Xcode build + install) |
| App Install | ✅ Success | `com.h3mai.portals` v1.0.0 deployed to device |

---

*Last updated: 2026-01-09*
