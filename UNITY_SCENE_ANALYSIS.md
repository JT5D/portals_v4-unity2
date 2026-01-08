# Unity Scene Deep Analysis & Workflow

**Date**: 2026-01-08
**Project**: Portals v4 - Unity-React Native Integration
**Scene**: [UnityTestScene.unity](unity/Assets/Scenes/UnityTestScene.unity)
**Status**: ✅ Fully Functional - Ready for Device Testing

---

## 🎯 Scene Architecture

### Scene Hierarchy

```
UnityTestScene
├── Main Camera (Tag: MainCamera)
│   ├── Clear Flags: Solid Color
│   ├── Background: rgba(0.19, 0.30, 0.47, 1.0)
│   └── Position: (0, 1, -10)
├── Directional Light
│   ├── Position: (0, 3, 0)
│   └── Rotation: (50, -30, 0)
├── Cube (Visual Test Object)
│   ├── Position: (0, 1, -5)
│   ├── Material: Default Unity Material
│   └── BoxCollider: Enabled
└── BridgeTarget (React Native Bridge)
    ├── Position: (0, 0, 0)
    ├── Script: BridgeTarget.cs
    └── DontDestroyOnLoad: true
```

### Critical Configuration

**Camera Settings** ([UnityTestScene.unity:365-366](unity/Assets/Scenes/UnityTestScene.unity#L365-L366)):
- `m_ClearFlags: 2` → Solid Color (NOT Skybox, NOT Depth Only)
- `m_BackGroundColor: {r: 0.19, g: 0.30, b: 0.47, a: 1}` → Full alpha required for React Native rendering

**Why This Matters**:
- Skybox mode breaks when rendering over React Native views
- Depth Only mode creates transparent areas where Unity doesn't render
- Solid Color with alpha=1 ensures proper compositing with RN layer

---

## 🔌 Bridge Communication Flow

### 1. Unity Initialization

**[BridgeTarget.cs:46-51](unity/Assets/Scripts/BridgeTarget.cs#L46-L51)**:
```csharp
private void Start()
{
    Debug.Log("BridgeTarget ready");
    SendToMobileApp(BuildPayload("unity_ready", "Unity booted"));
    TryCreateDebugCube();
}
```

**Sequence**:
1. Unity scene loads
2. BridgeTarget `Start()` executes
3. Sends `{type: "unity_ready", source: "unity", ...}` to React Native
4. React Native receives message via `onUnityMessage`
5. RN updates state: `setUnityReady(true)`
6. UI shows "✅ Ready", enables ping button

### 2. React Native → Unity (Ping)

**[UnityTestScene.tsx:24-32](src/screens/UnityTestScene.tsx#L24-L32)**:
```typescript
const handlePingUnity = () => {
    if (!unityReady) {
        console.warn('[UnityTestScene] Unity not ready yet, please wait...');
        return;
    }
    const payload = JSON.stringify({ type: 'ping', source: 'rn', ts: Date.now() });
    console.log('The button has been tapped!');
    unityRef.current?.postMessage('BridgeTarget', 'OnMessage', payload);
};
```

**[BridgeTarget.cs:62-69](unity/Assets/Scripts/BridgeTarget.cs#L62-L69)**:
```csharp
public void OnMessage(string json)
{
    Debug.Log($"[BridgeTarget] Received: {json}");

    var payload = BuildPayload("pong", "Unity received ping");
    SendToMobileApp(payload);
    Debug.Log($"[BridgeTarget] Sending: {payload}");
}
```

**Message Flow**:
```
[RN] User taps "Ping Unity" button
  ↓
[RN] Checks unityReady state
  ↓
[RN] postMessage('BridgeTarget', 'OnMessage', '{"type":"ping",...}')
  ↓
[Unity] BridgeTarget.OnMessage() receives JSON
  ↓
[Unity] Logs received message
  ↓
[Unity] Sends pong: {"type":"pong","source":"unity",...}
  ↓
[RN] onUnityMessage() receives pong
  ↓
[RN] Updates debug overlay, logs to console
```

### 3. Platform-Specific Native Bridges

**iOS** ([BridgeTarget.cs:85-86](unity/Assets/Scripts/BridgeTarget.cs#L85-L86)):
```csharp
#elif UNITY_IOS && !UNITY_EDITOR
    NativeAPI.sendMessageToMobileApp(payload);
```
Uses `[DllImport("__Internal")]` to call Swift/Objective-C bridge.

**Android** ([BridgeTarget.cs:80-84](unity/Assets/Scripts/BridgeTarget.cs#L80-L84)):
```csharp
#if UNITY_ANDROID
    using (var jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
    {
        jc.CallStatic("sendMessageToMobileApp", payload);
    }
```

**Editor** (Testing):
```csharp
#else
    Debug.Log($"[BridgeTarget] Would send: {payload}");
```
Logs to Unity console instead of actually sending.

---

## 🧪 Testing Strategy

### Phase 1: Unity Editor Testing (30 seconds)

**Purpose**: Verify scene structure and BridgeTarget functionality before expensive iOS builds.

**Automated Test**:
```bash
./scripts/test_unity_editor.sh
```

**Manual Verification**:
1. Open Unity Editor → [UnityTestScene.unity](unity/Assets/Scenes/UnityTestScene.unity)
2. Press Play ▶️
3. Check Console for:
   ```
   BridgeTarget ready
   [BridgeTarget] Would send: {"type":"unity_ready","source":"unity",...}
   ```
4. Verify:
   - White cube visible at center
   - Debug overlay appears (top-left, black semi-transparent)
   - No errors in Console

**Expected Result**: Scene loads cleanly, BridgeTarget initializes, debug cube renders.

### Phase 2: iOS Device Testing (5-15 minutes)

**Purpose**: Verify Unity-RN integration works on actual device with full rendering pipeline.

**Build & Deploy**:
```bash
# Incremental build (script changes only)
ios-fast

# Full rebuild (Unity export + iOS build)
ios-full
```

**Automated Test**:
```bash
./scripts/test_ios_device.sh
```

**Manual Verification Checklist**:

1. **App Launch** (0-5 seconds):
   - App opens without crash
   - Navigate to "Unity AR Test" screen

2. **Unity Initialization** (2-5 seconds):
   - Status shows "⏳ Initializing..."
   - Unity scene renders with white cube
   - Status updates to "✅ Ready"
   - Ping button becomes enabled

3. **Ping Test**:
   - Tap "Ping Unity" button
   - Console log: `The button has been tapped!`
   - Debug overlay shows: `{type: "pong", source: "unity", ...}`
   - Console log: `[UnityTestScene] Unity responded: {...}`

4. **Visual Verification**:
   - Unity scene fills the designated view area
   - White cube visible and properly rendered
   - No black/transparent areas (camera clear flags correct)
   - Debug overlay readable

**Troubleshooting**:
- If scene not visible → Check camera clear flags (should be Solid Color)
- If ping fails → Check Unity console for errors (`adb logcat -s Unity` on Android)
- If "not ready" persists → Verify `unity_ready` message sent (check BridgeTarget.cs:49)
- If framework mismatch → Verify custom UnityFramework copied to node_modules

---

## 🔧 Development Workflow

### Iterative Development Cycle

#### Scenario 1: C# Script Changes Only

**Time**: 5-8 minutes (incremental build)

**Workflow**:
1. Edit C# scripts in VS Code or Unity Editor
2. Save changes
3. **Skip Unity export** (no asset/scene changes)
4. Build iOS:
   ```bash
   ios-fast
   # OR
   ./scripts/build_and_run_ios.sh --skip-unity-export
   ```
5. Deploy to device
6. Test changes

**Optimization**: Unity Editor doesn't need to export if only scripts changed.

#### Scenario 2: Scene/Asset Changes

**Time**: 10-15 minutes (full rebuild)

**Workflow**:
1. Edit scene or assets in Unity Editor
2. Save scene
3. **Export Unity project** (required for iOS build)
4. Build iOS:
   ```bash
   ios-full
   # OR
   ./scripts/build_and_run_ios.sh
   ```
5. Deploy to device
6. Test changes

**Critical**: Unity must export changes before iOS build sees them.

#### Scenario 3: React Native UI Changes

**Time**: 10-30 seconds (Metro hot reload)

**Workflow**:
1. Edit [UnityTestScene.tsx](src/screens/UnityTestScene.tsx) or [UnityArView.tsx](src/components/UnityArView.tsx)
2. Save changes
3. Metro auto-reloads on device
4. Test changes immediately

**Optimization**: No rebuild required! Metro handles hot reload.

### Quick Decision Matrix

| Change Type | Unity Export? | iOS Build? | Time | Command |
|-------------|---------------|------------|------|---------|
| C# scripts only | ❌ No | ✅ Yes | 5-8 min | `ios-fast` |
| Scene/assets | ✅ Yes | ✅ Yes | 10-15 min | `ios-full` |
| React Native UI | ❌ No | ❌ No | 10-30 sec | (Metro auto-reload) |
| Bridge changes | ❌ No | ✅ Yes | 5-8 min | `ios-fast` |

---

## 🐛 Debugging Techniques

### 1. Unity Console Monitoring

**Editor**:
```bash
tail -f ~/Library/Logs/Unity/Editor.log | rg "error|warning|BridgeTarget"
```

**iOS Device** (via Xcode):
1. Window → Devices and Simulators
2. Select connected device
3. Open Console
4. Filter: "Unity"

**iOS Device** (via command line):
```bash
idevicesyslog | grep Unity
```

### 2. React Native Console

**Metro Bundler**:
```bash
# Check Metro logs
tail -f metro-bundler.log
```

**Chrome DevTools**:
1. Shake device → "Debug"
2. Opens Chrome at `http://localhost:8081/debugger-ui`
3. Console shows all `console.log()` output

### 3. Debug Overlay (On-Device)

**Unity Side** ([BridgeTarget.cs:122-145](unity/Assets/Scripts/BridgeTarget.cs#L122-L145)):
- Semi-transparent black box, top-left corner
- Shows last 12 Unity logs
- "Hide Debug" button to dismiss
- Useful when Xcode console unavailable

**React Native Side** ([UnityTestScene.tsx:77-88](src/screens/UnityTestScene.tsx#L77-L88)):
- Shows last Unity message JSON
- Updates in real-time when Unity sends messages

### 4. Binary Search Debugging

When encountering issues:

1. **Isolate the Layer**:
   - Unity Editor works? → Problem in iOS build or RN integration
   - Unity Editor fails? → Problem in Unity scene/script
   - RN UI works but Unity blank? → Check camera clear flags
   - Messages not received? → Check bridge platform code

2. **Cut Problem Space in Half**:
   - Test minimal scene (just camera + BridgeTarget)
   - Test with hardcoded messages (bypass JSON parsing)
   - Test in simulator vs device
   - Test with debug logs at each step

3. **Verify Assumptions**:
   - Is custom UnityFramework actually loaded?
   - Is BridgeTarget script actually attached?
   - Is Metro bundler running?
   - Is device connected and paired?

---

## 📊 Performance Considerations

### Unity Scene Optimization

**Current Scene**: Minimal (1 cube, 1 light, 1 camera)
- Draw calls: ~2-3
- Vertices: ~24 (cube mesh)
- FPS target: 60 FPS (90 FPS on Quest)

**When Adding AR Features**:
- Use object pooling for spawned objects
- Limit active particle systems
- Use LOD (Level of Detail) for complex meshes
- Profile with Unity Profiler before deploying

### Build Size

**Current**:
- Unity export: ~50-100 MB
- UnityFramework.framework: ~150 MB
- Total iOS build: ~200-250 MB

**Optimization Opportunities**:
- Strip unused Unity modules (Player Settings → Stripping Level)
- Compress textures (iOS: ASTC, Android: ETC2)
- Remove unused assets before export

---

## 🚀 Optimal Workflow Summary

### 1. Start of Session
```bash
# Navigate to project
portals-cd

# Start Metro bundler (in background)
npm start &

# Open Unity Editor (if making Unity changes)
open -a Unity unity/
```

### 2. Development Loop

**For Unity Changes**:
1. Make changes in Unity Editor
2. Test in Play mode (30 sec)
3. If scene/asset change: `ios-full`
4. If script only: `ios-fast`
5. Deploy and verify on device

**For React Native Changes**:
1. Edit TypeScript files
2. Save → Metro auto-reloads
3. Verify on device (no build!)

### 3. Testing Checklist

Before committing:
```bash
# 1. Unity Editor test
./scripts/test_unity_editor.sh

# 2. iOS device test
./scripts/test_ios_device.sh

# 3. Complete test suite
./scripts/run_all_tests.sh
```

### 4. Git Workflow

```bash
# Stage changes
git add .

# Commit (triggers Discord webhook)
git commit -m "Your message"

# Push to react-unity branch
git push origin react-unity

# Check Discord for commit notification
```

---

## 🎓 Key Learnings

### 1. Camera Clear Flags Matter

**Problem**: Unity scene not visible in React Native view.

**Root Cause**: Camera clear flags set to "Skybox" or "Depth Only" breaks rendering over RN views.

**Solution**: Set to "Solid Color" with alpha=1.

**Location**: [UnityTestScene.unity:365](unity/Assets/Scenes/UnityTestScene.unity#L365)

### 2. Ready State Tracking Essential

**Problem**: Messages sent to Unity before initialization are lost.

**Root Cause**: Unity takes 2-5 seconds to initialize after RN view mounts.

**Solution**: Two-way handshake:
1. Unity sends `unity_ready` on Start()
2. RN waits for this message before enabling ping button
3. UI shows initialization status

**Files**:
- [BridgeTarget.cs:48-49](unity/Assets/Scripts/BridgeTarget.cs#L48-L49)
- [UnityArView.tsx:19-22](src/components/UnityArView.tsx#L19-L22)

### 3. Framework Mismatch Detection

**Problem**: Ping button not working despite visible scene.

**Root Cause**: Package's default UnityFramework (without BridgeTarget methods) loaded instead of custom build.

**Solution**: Build script auto-copies custom framework to `node_modules/@azesmway/react-native-unity/ios/`.

**Verification**:
```bash
ls -la node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/
```

**File**: [build_and_run_ios.sh:120-135](scripts/build_and_run_ios.sh#L120-L135)

---

## 📚 Related Documentation

- **Testing Guide**: [TEST_UNITY_INTEGRATION.md](TEST_UNITY_INTEGRATION.md)
- **Complete Summary**: [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md)
- **Unity-RN Workflow**: `~/.claude/docs/UNITY_RN_INTEGRATION_WORKFLOW.md`
- **Build Scripts**: [scripts/build_and_run_ios.sh](scripts/build_and_run_ios.sh)

---

**Last Updated**: 2026-01-08
**Next Steps**: Device testing, then start building AR features!
