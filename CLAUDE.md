# portals_v4 - Unity XR Project Rules

**Global Rules**: See `~/GLOBAL_RULES.md` (loaded first)
**Project**: Unity 6000.2.14f1, AR Foundation 6.2.1, React Native 0.81.5, Expo SDK 54

---

## Unity MCP Workflow (Port 6400)

**Server**: UnityMCP v9.0.3 (CoplayDev/unity-mcp)

**ALWAYS use Unity MCP first** (30 sec vs 10 min manual):
```python
read_console(action="get", types=["error", "warning"])
manage_editor(action="play")
manage_scene(action="load", name="Scene", path="Assets/...")
manage_gameobject(action="find", search_term="Player", search_method="by_name")
```

**After EVERY change**: `read_console` → Fix errors immediately

---

## Project Scripts

### Build & Deploy
```bash
./scripts/build_minimal.sh                          # Incremental build (~3-5 min)
UNITY_CLEAN_BUILD=1 ./scripts/build_minimal.sh      # Force clean Unity export
./scripts/build_and_run_ios.sh --skip-unity-export  # Skip Unity export (use existing)

# JS-only changes (no Unity rebuild needed) - ~30 sec:
cd ios && xcodebuild -workspace Portals.xcworkspace -scheme Portals \
    -configuration Release -destination "id=$(xcrun xctrace list devices 2>&1 | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' | head -1)" \
    -allowProvisioningUpdates DEVELOPMENT_TEAM=Z8622973EB build install
```

### When to Use Clean vs Incremental Build

| Use Incremental (default) | Use Clean (`UNITY_CLEAN_BUILD=1`) |
|---------------------------|-----------------------------------|
| C# script changes | Unity version upgrade |
| Scene modifications | Added/removed native plugins |
| Asset tweaks | Changed Player Settings (bundle ID, icons) |
| Prefab updates | IL2CPP or linker errors |
| Material/shader changes | Xcode project corruption |
| Day-to-day development | After `git pull` with major changes |

**Rule of thumb**: Use incremental unless something breaks, then try clean.

### When to Use ccache On vs Off

| ccache ON (default) | ccache OFF |
|---------------------|------------|
| Day-to-day development | Release/production builds |
| Iterative debugging | After Xcode/compiler upgrade |
| Frequent small changes | Build behaves unexpectedly |
| CI/CD builds | Debugging compiler issues |

```bash
# ccache ON (default - set in Podfile.properties.json)
./scripts/build_minimal.sh

# ccache OFF (bypass for this build)
USE_CCACHE=0 ./scripts/build_minimal.sh

# Clear ccache entirely (nuclear option)
ccache --clear
```

**Rule of thumb**: Keep ccache ON. Turn OFF if build output doesn't match code changes.

**Note (RN 0.81+)**: ccache has limited benefit because React Native core is prebuilt (`React-Core-prebuilt`). Most speedup comes from Unity Append mode and Xcode DerivedData caching.

### Build Troubleshooting

| Error | Fix |
|-------|-----|
| `_mh_dylib_header undefined` | **Must use Release config** - RN Unity bug with Debug builds |
| `scripts are compiling` | Wait for Unity compilation to finish, retry |
| `URP GlobalSettings not at last version` | Delete `Assets/UniversalRenderPipelineGlobalSettings.asset`, reopen Unity |
| `XR Simulation asset move failed` | Delete `Assets/XR/Temp/` folder and `.meta` |
| `duplicate symbols` (Xcode 15+) | Uses `-Wl,-ld_classic` flag (handled by scripts) |
| Unity shows but never initializes | **Fabric registration issue** - see "Fabric Component Fix" below |

### Fabric Component Fix (Critical for New Architecture)

**Symptom**: Unity view appears but stays stuck on "Waiting for Unity to initialize"
- Native logs show only `layoutSubviews` - no `updateProps`
- bridge_log.txt is never created
- No crash, no error - just silent failure

**Root Cause**: `@artmajeur/react-native-unity` is NOT auto-registered with Fabric's component registry. The codegen doesn't discover `RNUnityView` because the package is missing `ios.componentProvider` in its codegenConfig.

**Fix Applied** (automatic via hooks):
1. `postinstall` script patches the package's codegenConfig
2. Podfile `post_install` hook runs `patch-fabric-registry.sh` as backup
3. The patch adds to `ios/build/generated/ios/RCTThirdPartyComponentsProvider.mm`:
   ```objc
   @"RNUnityView": NSClassFromString(@"RNUnityView"), // react-native-unity
   ```

**Manual Fix** (if hooks fail):
```bash
./scripts/patch-fabric-registry.sh
# Then rebuild iOS
```

**Verification**: After navigating to Unity scene, check `Documents/unity_init.log` for:
- ✅ `updateProps CALLED` (Fabric lifecycle working)
- ✅ `initUnityModule` (Unity initialization started)
- ✅ `initUnityModule COMPLETE` (Unity running)

### Message Queue Fix (Unity-to-RN Messages)

**Symptom**: Unity initializes successfully (logs show `initUnityModule COMPLETE`) but:
- Buttons remain grayed out
- Status shows "Waiting for Unity to initialize"
- `bridge_log.txt` shows Unity sending `unity_ready` but RN never receives it

**Root Cause**: Fabric's `_eventEmitter` is nil when Unity sends early messages. The `onUnityMessage` callback silently drops messages because it checks `if (_eventEmitter != nil)` before forwarding.

**Fix Applied** (automatic via `postinstall`):
- Script: `./scripts/patch-rn-unity-message-queue.sh`
- Adds `_pendingMessages` queue to buffer messages before eventEmitter is ready
- Modified `updateEventEmitter` flushes buffered messages when Fabric wires up

**Verification**: Check `Documents/unity_init.log` for:
- ✅ `updateEventEmitter CALLED, pending messages: N` (where N > 0)
- ✅ `Flushing N pending messages`
- ✅ `Pending messages flushed`

### FPS Fix (Unity-RN VSync Conflict)

**Symptom**: Unity shows 15 FPS while React Native shows 60 FPS (exactly 4:1 ratio)

**Root Cause**: VSync synchronization mismatch between Unity and React Native render loops. Unity's default Medium quality has `vSyncCount: 1`, which conflicts with RN's render timing, causing 4:1 frame dropping.

**Fix Applied** (in `BridgeTarget.cs`):
```csharp
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSplashScreen)]
private static void LogBeforeSplashScreen()
{
    QualitySettings.vSyncCount = 0;  // Disable VSync
    Application.targetFrameRate = 60; // Match iOS refresh
}
```

**Verification**: Check `Documents/bridge_early.log` for:
- ✅ `Frame rate initialized: vSync=0, targetFPS=60 (was vSync=1)`

**Note**: This fix runs at the earliest possible point (before splash screen) to ensure it applies before any frames are rendered.

### Build Internals (Why These Flags?)

| Flag | Why Needed |
|------|------------|
| `-Wl,-ld_classic` | Xcode 15+ new linker has issues with Unity IL2CPP duplicate symbols |
| `-configuration Release` | react-native-unity bug: DEBUG references `_mh_dylib_header` (only in dylibs) |

**NOT needed** (Unity handles automatically):
- `force_load il2cpp.a` - Already in Unity's OTHER_LDFLAGS
- Separate GameAssembly build - Built via Xcode target dependency

**Sources**: [Unity Xcode Structure](https://docs.unity3d.com/Manual/StructureOfXcodeProject.html), [Apple Dev Forums](https://developer.apple.com/forums/thread/749458)

### Build Optimization Internals

**Unity Append Mode** (`unity/Assets/Editor/BuildScript.cs`):
- Uses `BuildOptions.AcceptExternalModificationsToPlayer` for incremental IL2CPP builds
- Detects existing export via `/tmp/unity-ios-export/Unity-iPhone.xcodeproj/project.pbxproj`
- Falls back to clean build if `UNITY_CLEAN_BUILD=1` or export doesn't exist
- **Benefit**: Recompiles only changed C# scripts (~2-3 min vs 8-10 min)

**Build Lock Mechanism** (`scripts/build_minimal.sh`):
- Uses `/tmp/build_minimal.lock` to prevent concurrent builds
- Checks PID validity before blocking (stale locks auto-clear)
- Prevents wasted resources from parallel builds corrupting artifacts

**ccache Configuration** (`ios/Podfile.properties.json`):
- `apple.ccacheEnabled: "true"` enables during `pod install`
- Configures `CC` to use `react-native/scripts/xcode/ccache-clang.sh`
- **Limitation**: RN 0.81+ uses prebuilt core, so minimal C++ to cache

### Metro Configuration (Critical)

**BlockList**: Must use **anchored regex** to avoid blocking react-native-unity package:
```javascript
// metro.config.js - CORRECT
config.resolver.blockList = [
    /^unity\/.*/,             // Anchored: only blocks ./unity/ at project root
    /\/ios\/.*\.xcodeproj/,   // Blocks Xcode project files
    /\/ios\/.*\.xcworkspace/, // Blocks Xcode workspace files
];

// WRONG - blocks node_modules/@artmajeur/react-native-unity too!
// config.resolver.blockList = [/unity\/.*/];  // Matches "unity" anywhere
```

**App Config**: Team ID via env var (set `EXPO_PUBLIC_DEVELOPMENT_TEAM` in `.env`):
- Build scripts pass `DEVELOPMENT_TEAM=Z8622973EB` directly to xcodebuild
- Config loads in ~10ms (no shell commands at load time)

<!-- DISABLED: Fast Iteration (needs debugging)
### Fast Iteration (use these!)
```bash
./scripts/quick_iterate.sh rn      # Hot reload for RN (<1 sec)
./scripts/quick_iterate.sh unity   # Unity Editor Play (<5 sec)
./scripts/quick_iterate.sh fast    # Skip Unity export (~5 min)
./scripts/quick_iterate.sh status  # Check what's running
```
**Full guide**: [docs/FAST_ITERATION.md](docs/FAST_ITERATION.md)
-->

### Verification
```bash
./scripts/verify_device_logs.sh    # Live Device Logs
```

### Testing
- Manual checklist: [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md)
- Device testing: [DEVICE_TESTING_CHECKLIST.md](DEVICE_TESTING_CHECKLIST.md)

---

## Project Structure

```
unity/
  Assets/
    Scenes/UnityTestScene.unity  # Main scene (BridgeTarget for RN communication)
    Scripts/BridgeTarget.cs      # React Native message handler
    Editor/BuildScript.cs        # Headless build methods
  builds/ios/
    UnityFramework.framework     # ~308MB (only this, not full 9GB export)
ios/
  Portals.xcworkspace            # Main Xcode workspace
scripts/
  build_minimal.sh               # Fast fail-fast build (~15 min)
  build_and_run_ios.sh           # Full build with all checks (~20 min)
  debug_build_verbose.sh         # Verbose debug build with checkpoints
  common.sh                      # Shared utilities (process cleanup)
  find_xcode.py                  # Xcode version selector (prefers 16.4)
  check_missing_scripts.py       # Pre-build GUID validation
```

**Build Artifacts** (not in repo):
- `/tmp/unity-ios-export/` - Full Unity iOS export (~9GB)
- `unity/builds/ios/UnityFramework.framework` - Built framework (~308MB)

---

## Unity as a Library (iOS)

**Official Docs**: [Unity 6000.2 UAAL](https://docs.unity3d.com/6000.2/Documentation/Manual/UnityasaLibrary-iOS.html)
**UAAL Example**: [Unity-Technologies/uaal-example](https://github.com/Unity-Technologies/uaal-example/blob/master/docs/ios.md)
**Package**: `@artmajeur/react-native-unity@0.0.6` (fork of @azesmway with New Arch optimizations)
**Reference**: [YourArtOfficial/react-native-unity](https://github.com/YourArtOfficial/react-native-unity) - Canonical implementation reference

> **Package Comparison**: See `~/.claude/knowledgebase/_REACT_NATIVE_UNITY_PACKAGES.md`
> Includes 3-way comparison with alternative `react-native-unity2` (fusetools)

### Critical Requirements (All Verified)

| Requirement | Status | Notes |
|-------------|--------|-------|
| `setExecuteHeader` | ✅ | Required for CrashReporter |
| `setDataBundleId` | ✅ | Sets Data folder location |
| `runEmbeddedWithArgc` | ✅ | Must use for RN (not `runUIApplicationMainWithArgc`) |
| NativeCallProxy | ✅ | In `unity/Assets/Plugins/iOS/` |

### iOS Build Flow

```bash
# 1. Unity exports OUTSIDE RN project
/tmp/unity-ios-export/

# 2. xcodebuild creates UnityFramework.framework

# 3. Copy ONLY framework to RN project
unity/builds/ios/UnityFramework.framework  # ~300MB, not 9GB!

# 4. Clear pods cache (prevents stale framework)
rm -rf ios/Pods ios/Podfile.lock

# 5. Fresh pod install
cd ios && pod install
```

### Messaging Bridge

**RN → Unity** (via UnityFramework API):
```typescript
// Uses sendMessageToGOWithName:functionName:message: under the hood
unityRef.current?.sendMessage('BridgeTarget', 'OnMessage', jsonPayload);
```

**Unity → RN** (via NativeCallProxy):
```csharp
// BridgeTarget.cs
[DllImport("__Internal")]
public static extern void sendMessageToMobileApp(string message);
```

### Ready State Handshake

1. Unity scene loads → BridgeTarget sends "unity_ready"
2. RN receives "unity_ready" → enables UI buttons
3. User taps button → RN sends message to Unity
4. Unity processes → sends acknowledgment back

### Known Limitations

- **Full-screen only** - Unity cannot render partial screen
- **Single instance** - Cannot load multiple Unity runtimes
- Third-party plugins may need adaptation

### Debug Logging

Both sides have structured logging with toggles:
- Unity: `DEBUG_ENABLED` in BridgeTarget.cs, prefix `[Bridge]`
- RN: `__DEV__` in UnityArView.tsx, prefix `[UnityArView]`

```bash
# ⚠️ NEVER use raw idevicesyslog - it hangs forever!
# Always use the timeout-protected script:
./scripts/capture_device_logs.sh 10 "Unity|Bridge|fps"

# Alternative: Check app-generated log files
# (Unity writes to Documents/bridge_early.log, ar_debug_log.txt)
```

**⚠️ WARNING - idevicesyslog Hangs**: Raw `idevicesyslog` is a streaming tool that runs indefinitely. macOS has no native `timeout` command. Using it directly in scripts or background processes creates zombie processes. Always use `capture_device_logs.sh` which uses Perl for proper timeout handling.

**Full Documentation**: See `~/.claude/knowledgebase/_UNITY_AS_A_LIBRARY_IOS.md`

---

## Platform-Specific

### iOS (iPad Pro)
```bash
idevicesyslog | grep Unity    # Live logs (device must be unlocked)
xcrun xctrace list devices    # Check device connectivity
```

### Quest 2/3
```bash
adb logcat -v color -s Unity  # Live logs
adb install -r path/to.apk    # Deploy
```

---

## Performance Targets
- Quest 2: 90 FPS minimum
- iPhone 12+: 60 FPS minimum
- iPad Pro: 60 FPS minimum

---

## Automation Status
- Build & Deploy: 100% automated (one command)
- Infrastructure Verification: 100% automated (30 sec)
- Manual UX Testing: 2 minutes (tap 4 buttons)

**Total Time**: ~18 min first build, ~7 min incremental

See: [AUTOMATION_STATUS.md](AUTOMATION_STATUS.md)
