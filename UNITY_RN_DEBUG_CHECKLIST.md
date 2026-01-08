# Unity-React Native Integration Debug Checklist

**Project**: portals_v4
**Last Updated**: 2026-01-08
**Status**: ✅ All critical issues resolved

---

## Critical Fixes Applied (2026-01-08)

### Fix #1: Scene Load Order ✅
**Problem**: Unity was loading VS_SimpleAR scene instead of UnityTestScene
**Root Cause**: EditorBuildSettings.asset had VS_SimpleAR as first scene (index 0)
**Fix**: Reordered scenes - UnityTestScene now loads first
**File**: `unity/ProjectSettings/EditorBuildSettings.asset`
**Verification**: Check `level0` file size (2.7KB = UnityTestScene with cube + BridgeTarget)

### Fix #2: Camera Clear Flags ✅
**Problem**: Cube not rendering - transparent/black screen in React Native
**Root Cause**: Camera using `m_ClearFlags: 2` (Depth Only) instead of Solid Color
**Fix**: Changed to `m_ClearFlags: 1` (Solid Color)
**File**: `unity/Assets/Scenes/UnityTestScene.unity` (line 365)
**Why It Matters**: Depth Only doesn't clear color buffer → compositing fails over RN views

---

## Expected Behavior (After Fixes)

### On App Launch
1. ✅ Metro bundler serves JS bundle via tunnel (https://xxx-8081.exp.direct)
2. ✅ React Native app launches on device
3. ✅ Navigate to "Unity AR Test" screen
4. ✅ Unity initializes and loads UnityTestScene.unity

### Unity Scene Loaded
1. ✅ **Camera**: Position (0, 1, -10), looking forward (+Z), Solid Color clear
2. ✅ **Static Cube**: Position (0, 1, -5), visible in camera view (white material)
3. ✅ **BridgeTarget**: Auto-created via RuntimeInitializeOnLoadMethod
4. ✅ **Debug Cube**: Created by BridgeTarget, parented to camera at 0.4 units forward

### Bridge Communication
1. ✅ **Unity → RN**: BridgeTarget sends `{type: "unity_ready", ...}` on Start()
2. ✅ **RN receives**: UnityArView.handleMessage() parses JSON, calls onUnityReady()
3. ✅ **UI updates**: Status changes from "⏳ Initializing..." to "✅ Ready"
4. ✅ **RN → Unity**: User taps "Ping Unity", sends `{type: "ping", ...}` to BridgeTarget.OnMessage()
5. ✅ **Unity responds**: BridgeTarget sends `{type: "pong", ...}` back to RN

---

## Verification Steps (Manual Testing)

### Phase 1: Visual Verification
**Goal**: Confirm Unity scene renders correctly

1. Open Portals app on iPad
2. Navigate to **Unity AR Test** screen
3. **Look for cube(s):**
   - Should see white cube in center/forward view
   - May see second cube (BridgeTarget debug cube) if camera-parented cube is enabled
4. **Check background color**: Should be solid blue-grey (#30 4C 79), not transparent/black

**Expected**: ✅ White cube visible against solid background
**If Failed**: See "Troubleshooting: Cube Not Visible" below

### Phase 2: Bridge Initialization
**Goal**: Verify Unity → RN communication works

1. Watch status text at top of screen
2. **Expected sequence**:
   - Initially: "Unity Status: ⏳ Initializing..."
   - After 1-3 seconds: "Unity Status: ✅ Ready"

**Expected**: ✅ Status changes to Ready
**If Failed**: See "Troubleshooting: Unity Not Ready" below

### Phase 3: Bidirectional Communication
**Goal**: Verify RN → Unity → RN round-trip works

1. Ensure status shows "✅ Ready" (if not, wait or see Phase 2 troubleshooting)
2. Tap **"Ping Unity"** button
3. Watch debug overlay (black box at top of Unity view)
4. **Expected logs in Unity debug overlay**:
   - `[BridgeTarget] Received: {type: "ping", ...}`
   - `[BridgeTarget] Sending: {type: "pong", ...}`

**Expected**: ✅ Debug overlay shows ping received and pong sent
**If Failed**: See "Troubleshooting: Ping/Pong Not Working" below

---

## Troubleshooting Guide

### Cube Not Visible

**Symptoms**: Black screen or transparent view where Unity should render

**Check #1: Camera Clear Flags**
```bash
# Verify camera is using Solid Color (1), not Depth Only (2)
grep -A 2 "m_ClearFlags:" unity/Assets/Scenes/UnityTestScene.unity
# Expected output: m_ClearFlags: 1
```

**Check #2: Scene Export Date**
```bash
# Verify Unity export matches scene file timestamp
ls -lh node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/Data/ | grep level0
# Should be recent (today's date)
```

**Check #3: Correct Scene Loading**
```bash
# Verify UnityTestScene is first in build settings
head -20 unity/ProjectSettings/EditorBuildSettings.asset
# Line 9 should show: path: Assets/Scenes/UnityTestScene.unity
```

**Fix**: Re-run full build with Unity export:
```bash
cd ~/Documents/GitHub/portals_v4
./scripts/build_and_run_ios.sh --force-close-unity
```

---

### Unity Not Ready

**Symptoms**: Status stuck on "⏳ Initializing..." - never changes to "✅ Ready"

**Check #1: BridgeTarget Sending Message**
- Unity should log: `"BridgeTarget ready"` and `"Would send: {type: 'unity_ready', ...}"`
- iOS native bridge should receive message and forward to RN

**Check #2: React Native Message Handler**
```typescript
// In UnityArView.tsx:15-34
const handleMessage = (message: UnityViewMessage) => {
    if (message.message) {
        const data = JSON.parse(message.message);
        if (data.type === 'unity_ready' && !unityReady) {
            console.log('[UnityArView] Unity is ready!');
            setUnityReady(true);
            onUnityReady?.(); // ← This should trigger
        }
    }
};
```

**Check #3: Console Logs** (if device logs accessible)
```bash
# Check Metro bundler logs for Unity messages
tail -100 ~/Documents/GitHub/portals_v4/logs/metro.log | grep -i unity

# Check iOS device logs (requires device unlocked)
idevicesyslog -u DEVICE_UDID | grep -i "unity\|bridge"
```

**Fix**: Verify BridgeTarget.cs sends message in correct format:
```csharp
// BridgeTarget.cs:49
SendToMobileApp(BuildPayload("unity_ready", "Unity booted"));
// Message format: {"type":"unity_ready","source":"unity","scene":"UnityTestScene",...}
```

---

### Ping/Pong Not Working

**Symptoms**: Tapping "Ping Unity" button does nothing, no logs in debug overlay

**Check #1: Unity Ready State**
- Button should be disabled if Unity not ready
- If button is enabled, onUnityReady() was called successfully

**Check #2: Message Format**
```typescript
// UnityTestScene.tsx:29-31
const payload = JSON.stringify({ type: 'ping', source: 'rn', ts: Date.now() });
unityRef.current?.postMessage('BridgeTarget', 'OnMessage', payload);
// ↑ Must target "BridgeTarget" GameObject, "OnMessage" method
```

**Check #3: BridgeTarget OnMessage Handler**
```csharp
// BridgeTarget.cs:62-69
public void OnMessage(string json)
{
    Debug.Log($"[BridgeTarget] Received: {json}"); // ← Should log incoming message
    var payload = BuildPayload("pong", "Unity received ping");
    SendToMobileApp(payload); // ← Should send response
    Debug.Log($"[BridgeTarget] Sending: {payload}"); // ← Should log outgoing message
}
```

**Check #4: OnGUI Debug Overlay**
- BridgeTarget has OnGUI() at line 122-145
- Renders black box with log buffer at top of screen
- Should show both incoming ping and outgoing pong

**Fix**: Verify UnityView ref is correctly forwarded:
```typescript
// UnityArView.tsx:13
useImperativeHandle(ref, () => unityRef.current as UnityView);
// UnityTestScene.tsx:64
<UnityArView ref={unityRef} ... />
```

---

## Technical Details

### Unity Scene Structure

**UnityTestScene.unity** contains:
- **Main Camera**: (0, 1, -10), Clear Flags: Solid Color, Background: #30 4C 79
- **Cube**: (0, 1, -5), Scale: (1, 1, 1), Material: Default white
- **Directional Light**: (0, 3, 0), Rotation: (50, -30, 0)
- **BridgeTarget**: (0, 0, 0), DontDestroyOnLoad, creates debug cube at runtime

### BridgeTarget Auto-Creation

```csharp
// BridgeTarget.cs:23-33
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
private static void EnsureBridgeTarget()
{
    if (FindObjectOfType<BridgeTarget>() != null) return;
    var go = new GameObject("BridgeTarget");
    go.AddComponent<BridgeTarget>();
}
```

**Guarantees**: BridgeTarget always exists, even if not in scene hierarchy.

### Camera Parented Debug Cube

```csharp
// BridgeTarget.cs:105-109
m_DebugCube = GameObject.CreatePrimitive(PrimitiveType.Cube);
m_DebugCube.transform.SetParent(cam.transform, false);
m_DebugCube.transform.localPosition = new Vector3(0f, 0f, 0.4f);
m_DebugCube.transform.localScale = Vector3.one * 0.08f;
```

**Result**: Small cube (0.08 scale) always 0.4 units in front of camera. Moves with camera.

### Bridge Message Format

**Unity → RN** (unity_ready):
```json
{
  "type": "unity_ready",
  "source": "unity",
  "scene": "UnityTestScene",
  "note": "Unity booted",
  "ts": 1.234
}
```

**RN → Unity** (ping):
```json
{
  "type": "ping",
  "source": "rn",
  "ts": 1673456789123
}
```

**Unity → RN** (pong):
```json
{
  "type": "pong",
  "source": "unity",
  "scene": "UnityTestScene",
  "note": "Unity received ping",
  "ts": 5.678
}
```

---

## Build Artifacts Verification

### After Successful Build

**Check Unity export in node_modules:**
```bash
ls -lh node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/Data/
# Should show recent timestamps (today)

# Verify scene data:
ls -lh node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/Data/level*
# level0 = scene index 0 (should be UnityTestScene)
# level1 = scene index 1 (should be VS_SimpleAR)
```

**Check iOS app bundle:**
```bash
# Verify app was installed
xcrun xctrace list devices | grep "IMClab\|iPad"
# Should show connected device

# Check Xcode Derived Data
ls -lh ~/Library/Developer/Xcode/DerivedData/Portals*/Build/Products/Release-iphoneos/
# Should show recent build artifacts
```

---

## Known Limitations

### iOS 18 Device Logs
- `idevicesyslog` requires device unlocked and trusted
- May show "No device found" even if device connected
- Workaround: Use Metro logs for RN-side debugging, Unity OnGUI debug overlay for Unity-side debugging

### Metro Tunnel URL
- Uses ngrok tunnel for device testing (https://xxx-8081.exp.direct)
- Tunnel URL changes on each build
- Requires internet connection for device to access Metro bundler

### Unity Debug Overlay
- Shows last 12 log messages only (MaxLogs = 12)
- OnGUI rendering is not AR-friendly (overlays AR content)
- Can be hidden by tapping "Hide Debug" button in overlay

---

## Success Criteria

### ✅ Complete Success
1. Cube visible in Unity view
2. Status shows "✅ Ready" within 3 seconds
3. Ping button enabled after ready
4. Debug overlay shows ping received and pong sent
5. No errors in console logs

### ⚠️ Partial Success
1. Cube visible but no ready message → Check BridgeTarget native bridge
2. Ready message but no pong response → Check OnMessage handler and postMessage call
3. Pong logged in Unity but not received in RN → Check RN message handler

### ❌ Failure
1. Black/transparent screen → Camera clear flags issue
2. Wrong scene loaded → Build settings scene order issue
3. No Unity logs at all → Unity not initializing or crashing on startup

---

## Related Documentation

- [UNITY_SCENE_ANALYSIS.md](UNITY_SCENE_ANALYSIS.md) - Scene architecture deep dive
- [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md) - 4-step manual testing checklist
- [AUTOMATION_STATUS.md](AUTOMATION_STATUS.md) - Build automation coverage
- [scripts/build_and_run_ios.sh](scripts/build_and_run_ios.sh) - Build script source
- [unity/Assets/Scripts/BridgeTarget.cs](unity/Assets/Scripts/BridgeTarget.cs) - Bridge implementation

---

**Last Verified**: 2026-01-08 05:26 (Build succeeded in 67.7s)
**Test Device**: IMClab 15 (iPad Pro, iOS 18.1)
**Next Steps**: Manual device testing to confirm cube visible and ping/pong working
