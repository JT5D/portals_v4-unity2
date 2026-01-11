# Branch Comparison Audit: react-unity vs main

**Date**: 2026-01-11
**Auditor**: Claude Code

---

## Executive Summary

**Critical Finding**: The `react-unity` branch is **NOT a mirror of `main`**. It contains extensive Unity integration work with 4,633+ source file changes.

---

## Quantitative Differences

| Category | Files Changed | Notes |
|----------|---------------|-------|
| `unity/` | 4,578 | Full Unity project with AR Foundation |
| `src/` | 55 | React Native screens/components |
| `scripts/` | 25 | Build automation scripts |
| `ios/` config | ~10 | Podfile, xcodeproj, Info.plist |
| Markdown docs | ~40 | Documentation and specs |
| `_ref/` | ~20,000 | Reference material (Needle Engine samples) |
| `node_modules/` | ~66,000 | Dependencies (should be gitignored) |

**Total**: ~91,000 files differ between branches

---

## Key Architectural Differences

### 1. AR Engine

| Feature | `main` branch | `react-unity` branch |
|---------|---------------|----------------------|
| Primary AR | ViroReact 2.43.6 only | Unity 6000.2 UAAL + ViroReact |
| Framework size | ~150 MB | ~450 MB (+UnityFramework) |
| Build command | `npx expo run:ios --device` | `./scripts/build_minimal.sh` |
| Build config | Debug (hot reload) | Release (embedded bundle) |

### 2. Package Dependencies

`package.json` has 19 insertions, 17 deletions including:
- `@artmajeur/react-native-unity` - Unity bridge package
- Patched via `patches/@artmajeur+react-native-unity+0.0.6.patch`

### 3. Build Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `scripts/build_minimal.sh` | Automated Unity+RN build | **New** |
| `scripts/common.sh` | Shared build utilities | **New** |
| `ios/Podfile` | CocoaPods with Unity | **Modified** |
| `metro.config.js` | Metro bundler config | **Modified** |
| `app.config.js` | Expo config (dynamic) | **New** (replaces app.json) |

### 4. Unity Project Structure

```
unity/
├── Assets/
│   ├── Scenes/ARTestScene.unity     # AR scene with XR Origin
│   ├── Scripts/BridgeTarget.cs      # RN messaging bridge
│   ├── Plugins/iOS/NativeCallProxy  # Native bridge
│   └── Editor/BuildScript.cs        # Headless build
└── builds/ios/
    └── UnityFramework.framework     # ~308MB built artifact
```

---

## Source Code Changes (src/)

### Modified Files (55 total)

**Components**:
- `UnityArView.tsx` - Unity integration view
- `DebugOverlay.tsx` - AR debug panel
- `MapBottomSheet.tsx`, `PurchaseModal.tsx`

**Screens**:
- `ARNavigationScreen.tsx` - AR navigation with Unity
- `UnityTestScene.tsx` - Unity test harness
- `FigmentAR/*` - AR editor components
- Various settings screens

**Services**:
- `LibraryService.ts`, `PortalService.ts`
- `scene/SceneSerializer.ts`
- `storage/r2.ts`

**Store**:
- `authSlice.ts`, `feedSlice.ts`

---

## Potential Build Issues

### 1. Unity Framework Not Built
If `unity/builds/ios/UnityFramework.framework` doesn't exist or is stale, the build will fail.

**Solution**: Run full build with Unity export:
```bash
./scripts/build_minimal.sh
```

### 2. Missing Native Patches
The react-native-unity package requires Fabric registration patches.

**Patches applied via**:
- `postinstall` script in package.json
- `scripts/patch-fabric-registry.sh`
- `scripts/patch-rn-unity-message-queue.sh`

### 3. Build Configuration Mismatch
**Critical**: react-native-unity has a bug with Debug builds:
- Uses `_mh_dylib_header` symbol only available in dylibs
- **Must use Release configuration**

### 4. Node Modules Issues
91,000+ files in node_modules differ - suggests potential:
- Different package versions
- Missing `npm install` / `pod install`
- Stale lock files

**Solution**:
```bash
rm -rf node_modules ios/Pods
npm install
cd ios && pod install
```

### 5. TypeScript Errors
16+ type errors exist in the codebase (not blocking build but indicate code issues):
- Missing `category` property in mock data
- Missing exports in `ar-view-recorder` module
- Implicit `any` types

---

## Build Verification Steps

1. **Check Unity framework exists**:
   ```bash
   ls -la unity/builds/ios/UnityFramework.framework
   ```

2. **Verify Xcode version** (requires 16.4):
   ```bash
   xcodebuild -version
   ```

3. **Check device connection**:
   ```bash
   xcrun xctrace list devices
   ```

4. **Run build**:
   ```bash
   ./scripts/build_minimal.sh
   ```

5. **Check logs on failure**:
   ```bash
   tail -100 logs/unity_build.log
   tail -100 logs/framework.log
   tail -100 logs/app_build.log
   ```

---

## Recommendations

1. **Do NOT treat react-unity as a mirror of main** - it's a feature branch with significant changes

2. **For Unity builds**: Always use `./scripts/build_minimal.sh`

3. **For React-only work**: Use `dev` or `main` branch with `npx expo run:ios --device`

4. **Clean rebuild if issues**:
   ```bash
   UNITY_CLEAN_BUILD=1 ./scripts/build_minimal.sh
   ```

---

## Current Build Issue (2026-01-11)

### Error
```
xcodebuild: error: Timed out waiting for all destinations matching the provided destination specifier to become available

Available destinations for the "Portals" scheme:
  { platform:iOS, arch:arm64, id:00008130-001E55443409001C, name:IMClab 15, error:The developer disk image could not be mounted on this device. }
```

### Analysis
- **Device**: IMClab 15 running iOS 26.1
- **Xcode**: 16.4
- **Issue**: Xcode 16.4 doesn't have developer disk images for iOS 26.1

### Potential Solutions
1. **Update Xcode** to a version that supports iOS 26.1
2. **Downgrade device iOS** (not recommended)
3. **Use Simulator** (loses AR capabilities)
4. **Download disk image manually** from Apple Developer

### Build Steps That Succeeded
| Step | Status | Duration |
|------|--------|----------|
| Unity Export | ✅ | ~2 min |
| IL2CPP Compile | ✅ | 735 objects |
| UnityFramework Build | ✅ | 140 sec |
| Pod Install | ✅ | 17 sec |
| App Build | ✅ | - |
| Device Install | ❌ | Developer disk image error |

---

## Sources

- [Expo TypeScript Documentation](https://docs.expo.dev/guides/typescript/)
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [Unity iOS as Library](https://docs.unity3d.com/6000.2/Documentation/Manual/UnityasaLibrary-iOS.html)
- Project CLAUDE.md and README.md
