# portals_v4 - Unity XR Project Rules

**Global Rules**: See `~/GLOBAL_RULES.md` (loaded first)
**Project**: Unity 6000.2.14f1, AR Foundation 6.2.1, React Native 0.73.2

---

## Unity MCP Workflow (Port 6400)

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
ios-full        # Full build with Unity export (5-15 min)
ios-fast        # Incremental build (5-8 min)
android-full    # Android build
```

### Verification
```bash
./scripts/verify_device_unity.sh     # Automated infrastructure checks (30 sec)
./scripts/monitor_unity_live.sh      # Live device log monitoring
```

### Testing
- Manual checklist: [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md)
- Device testing: [DEVICE_TESTING_CHECKLIST.md](DEVICE_TESTING_CHECKLIST.md)

---

## Project Structure

```
Assets/
  Scenes/UnityFramework.unity    # Main scene (BridgeTarget for RN communication)
  Scenes/SampleScene.unity       # Unity Editor test scene
  Scripts/BridgeTarget.cs        # React Native message handler
ios/
  UnityFramework/                # Custom Unity export location
scripts/
  common.sh                      # Shared utilities (process cleanup)
  build_and_run_ios.sh          # Automated iOS build
  verify_device_unity.sh         # Infrastructure verification
```

---

## Unity-React Native Integration

**Bridge Pattern**:
- React Native → Unity: `UnityView.sendMessage()`
- Unity → React Native: `GetComponent<BridgeTarget>().SendMessageToRN()`

**Ready State Handshake** (prevents race conditions):
1. Unity scene loads → sends "ready" to RN
2. RN receives "ready" → enables UI
3. User taps button → RN sends message to Unity

**Architecture**: See [UNITY_SCENE_ANALYSIS.md](UNITY_SCENE_ANALYSIS.md)

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
