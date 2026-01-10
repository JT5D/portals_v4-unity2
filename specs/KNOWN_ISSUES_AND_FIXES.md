# Known Issues & Fixes Reference

> **Generated**: 2026-01-10 | Quick reference for common issues and their solutions

---

## Build Issues

### 1. `_mh_dylib_header undefined` (CRITICAL)
**Symptom**: Xcode linker error during Debug builds
**Root Cause**: react-native-unity references dynamic library symbols only available in Release
**Fix**: Always use `-configuration Release`
```bash
./scripts/build_minimal.sh  # Uses Release by default
```

### 2. `duplicate symbols` (Xcode 15+)
**Symptom**: Linker errors with IL2CPP symbols
**Root Cause**: Xcode 15+ new linker has issues with Unity IL2CPP
**Fix**: Already applied in scripts via `-Wl,-ld_classic` flag

### 3. `URP GlobalSettings not at last version`
**Symptom**: Unity console warning, may block builds
**Fix**:
```bash
rm unity/Assets/UniversalRenderPipelineGlobalSettings.asset
# Reopen Unity - it will regenerate
```

### 4. `XR Simulation asset move failed`
**Symptom**: Unity build fails with asset error
**Fix**:
```bash
rm -rf unity/Assets/XR/Temp/
rm unity/Assets/XR/Temp.meta
```

### 5. `scripts are compiling`
**Symptom**: Build script waits indefinitely
**Fix**: Wait for Unity compilation to finish (check Unity Editor status bar)

---

## Unity-RN Bridge Issues

### 1. Unity Shows But Never Initializes (CRITICAL)
**Symptom**:
- Unity view appears
- Status stuck on "Waiting for Unity to initialize"
- No crash, no error

**Root Cause**: RNUnityView not registered in Fabric component registry

**Diagnosis**:
```bash
# Check native logs
idevicesyslog | grep "RNUnity\|updateProps"
# Should see: "updateProps CALLED"
# If missing: Fabric registration failed
```

**Fix**:
```bash
./scripts/patch-fabric-registry.sh
cd ios && pod install
./scripts/build_minimal.sh
```

### 2. `unity_ready` Never Received
**Symptom**:
- Unity initializes (logs show it)
- RN never receives ready signal
- Buttons stay disabled

**Root Cause**: Fabric eventEmitter is nil when Unity sends early messages

**Diagnosis**:
```bash
# Check bridge_log.txt on device
# Should see: "TX unity_ready (attempt N/5)"
# If found but RN doesn't receive: message queue issue
```

**Fix**:
```bash
./scripts/patch-rn-unity-message-queue.sh
cd ios && pod install
./scripts/build_minimal.sh
```

### 3. 15 FPS Playback (60/4 = 15)
**Symptom**: Unity runs at exactly 15 FPS while RN shows 60 FPS

**Root Cause**: VSync=1 in Unity conflicts with RN render timing

**Diagnosis**:
```bash
# Check bridge_early.log on device
# Should see: "Frame rate initialized: vSync=0, targetFPS=60"
# If shows "vSync=1": VSync fix not applied
```

**Fix**: Already in BridgeTarget.cs (RuntimeInitializeOnLoadMethod). If issue persists:
```bash
UNITY_CLEAN_BUILD=1 ./scripts/build_minimal.sh
```

### 4. Wrong Scene Loads on Device
**Symptom**: Device loads old scene (e.g., UnityTestScene) after changing EditorBuildSettings

**Root Cause**: Unity Append mode caches scene data in `/tmp/unity-ios-export/`

**Fix**:
```bash
rm -rf /tmp/unity-ios-export
./scripts/build_minimal.sh
```

---

## Runtime Issues

### 1. AR Not Tracking
**Symptom**: Camera shows but no planes detected

**Diagnosis**:
```bash
# Check ar_debug_log.txt
# Should see: "AR State: Ready → SessionTracking"
# Should see: "Plane ADDED #1"
```

**Checklist**:
- [ ] ARSession component in scene
- [ ] ARSessionOrigin with ARCameraManager
- [ ] ARPlaneManager enabled
- [ ] Camera permission granted

### 2. VFX Not Spawning
**Symptom**: "Spawn VFX" button works but no visual effect

**Diagnosis**:
```bash
# Check bridge_log.txt
# Should see: "Processing spawnBrush action"
# Should see: "VFX spawned: Brush_XXXXX"
```

**Checklist**:
- [ ] `Resources/VFX/SimpleBrush.vfx` exists in Unity
- [ ] Asset marked as Addressable or in Resources
- [ ] Camera.main not null

### 3. Messages Not Reaching Unity
**Symptom**: RN sends message, Unity doesn't respond

**Diagnosis**:
```bash
# RN side (Metro console)
# Should see: "[UnityArView] TX #N: BridgeTarget.OnMessage(...)"

# Unity side (bridge_log.txt)
# Should see: "RX #N: ..."
```

**Checklist**:
- [ ] BridgeTarget GameObject in scene
- [ ] BridgeTarget.cs script attached
- [ ] OnMessage method public

---

## Device Connection Issues

### 1. `idevicesyslog` Hangs Forever
**Root Cause**: idevicesyslog is a streaming tool with no built-in timeout

**Fix**: Always use the timeout-protected script:
```bash
./scripts/capture_device_logs.sh 10 "Unity|Bridge"
# NOT: idevicesyslog | grep Unity (will hang!)
```

### 2. Device Not Detected
**Checklist**:
- [ ] Device unlocked
- [ ] Trust prompt accepted
- [ ] USB cable connected (not wireless)
- [ ] Run `idevice_id -l` to verify

**Fix**:
```bash
./scripts/pair_device.sh
```

### 3. Provisioning Profile Expired
**Symptom**: Build succeeds but install fails

**Fix**: Xcode → Preferences → Accounts → Manage Certificates → Renew

---

## Performance Issues

### 1. Memory Warning / Crash
**Checklist**:
- [ ] AR session properly paused when backgrounded
- [ ] Textures using compressed formats
- [ ] LOD system enabled for many objects

### 2. Frame Drops During Recording
**Root Cause**: Simultaneous AR + recording is GPU-intensive

**Mitigation**:
- Reduce render resolution during recording
- Disable VFX during recording
- Use compressed texture formats

---

## Clean Slate Protocol (Nuclear Option)

When stuck in a loop of failures:

```bash
# 1. Kill all processes
killall -9 "Unity Hub" Unity xcodebuild java node 2>/dev/null

# 2. Purge caches
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf unity/Library/ScriptAssemblies unity/Library/Bee
rm -rf ios/build ios/Pods ios/Podfile.lock
rm -rf /tmp/unity-ios-export
rm -rf node_modules

# 3. Reinstall
npm install
cd ios && pod install

# 4. Clean build
UNITY_CLEAN_BUILD=1 ./scripts/build_minimal.sh
```

---

## Diagnostic Commands Quick Reference

```bash
# Live device logs (timeout-safe)
./scripts/capture_device_logs.sh 10 "Unity|Bridge|fps"

# Color-coded live monitor
./scripts/monitor_unity_live.sh

# Unity console (via MCP)
# Use: mcp__UnityMCP__read_console

# Check running processes
pgrep -l Unity
pgrep -l xcodebuild

# Check build lock
cat /tmp/build_minimal.lock 2>/dev/null && echo "Build lock exists"
```

---

*Last Updated: 2026-01-10*
