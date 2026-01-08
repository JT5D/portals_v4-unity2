# portals_v4 - Unity XR Project Rules

**Global Rules**: See `~/GLOBAL_RULES.md` (loaded first)
**Project**: Unity 6000.2.14f1, AR Foundation 6.2.1, React Native 0.73.2

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
./scripts/build_and_run_ios.sh                      # Full build (asks before closing Unity)
./scripts/build_and_run_ios.sh --force-close-unity  # Full build (auto-closes Unity)
./scripts/build_and_run_ios.sh --skip-unity-export  # Skip Unity export (use existing)
./scripts/build_and_run_ios.sh --build-only         # Build framework only (no deploy)
```

### Build Troubleshooting

| Error | Fix |
|-------|-----|
| `scripts are compiling` | Wait for Unity compilation to finish, retry |
| `URP GlobalSettings not at last version` | Delete `Assets/UniversalRenderPipelineGlobalSettings.asset`, reopen Unity |
| `XR Simulation asset move failed` | Delete `Assets/XR/Temp/` folder and `.meta` |
| `NiceIO could not load` | Visual Scripting warning, non-blocking |

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
  build_and_run_ios.sh           # Automated iOS build pipeline
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
# Live device logs
idevicesyslog | grep -E "Bridge|UnityArView"
```

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
