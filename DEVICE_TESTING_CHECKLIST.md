# iOS Device Testing Checklist

**Device**: IMC Lab iPad Pro (2) - iOS 18.1
**Date**: 2026-01-08
**Build Status**: ✅ Already Deployed
**Metro Status**: ✅ Running on port 8081

---

## 🎯 What Was Fixed This Session

### 1. Discord Webhook Formatting ✅
- **Issue**: Line breaks too big, blank lines in Discord notifications
- **Fix**: Changed from `\n\n` to `\n` for compact formatting
- **File**: `/Users/jamestunick/.local/bin/post_commit_to_discord.sh`
- **Verification**: Check Discord channel for latest commit message

### 2. Unity Scene Analysis ✅
- **Scene**: [UnityTestScene.unity](unity/Assets/Scenes/UnityTestScene.unity)
- **Status**: Properly configured (camera, cube, BridgeTarget all correct)
- **Documentation**: [UNITY_SCENE_ANALYSIS.md](UNITY_SCENE_ANALYSIS.md)

### 3. Comprehensive Documentation Created ✅
- **Scene Analysis**: [UNITY_SCENE_ANALYSIS.md](UNITY_SCENE_ANALYSIS.md)
  - Architecture deep dive
  - Bridge communication flow
  - Testing strategy
  - Development workflow
  - Debugging techniques
  - Performance considerations

---

## 📱 Device Testing Steps

### Step 1: Open the App

1. On iPad, locate **Portals** app (should already be installed)
2. Tap to open
3. Wait for Metro connection (should show "Connected to Metro" banner)

### Step 2: Navigate to Unity AR Test

1. From home screen, look for navigation to "Unity AR Test" or similar
2. Tap to enter Unity test screen

### Step 3: Wait for Unity Initialization

**Expected Sequence** (2-5 seconds):
```
⏳ Initializing...
  ↓ (Unity loads)
  ↓ (Unity scene renders)
  ↓ (BridgeTarget sends unity_ready)
✅ Ready
  ↓ (Ping button becomes enabled)
```

**Visual Verification**:
- [ ] Unity scene visible (white cube in center)
- [ ] Status changes from "⏳ Initializing..." to "✅ Ready"
- [ ] Ping button enabled (not grayed out)
- [ ] Debug overlay visible in Unity view (top-left, black semi-transparent)

### Step 4: Test Ping Communication

1. Tap **"Ping Unity"** button
2. Observe:

**React Native Console** (visible in Metro terminal):
```
The button has been tapped!
[UnityTestScene] Unity responded: {type: "pong", source: "unity", ...}
```

**Unity Debug Overlay** (on device):
```
[Log] BridgeTarget ready
[Log] [BridgeTarget] Received: {"type":"ping",...}
[Log] [BridgeTarget] Sending: {"type":"pong",...}
```

**RN Debug Overlay** (below ping button):
```json
{
  "type": "pong",
  "source": "unity",
  "scene": "UnityTestScene",
  "note": "Unity received ping",
  "ts": 1234.567
}
```

### Step 5: Verification Checklist

**✅ Scene Rendering**:
- [ ] Unity view fills the designated area
- [ ] White cube visible and properly rendered
- [ ] No black/transparent areas
- [ ] Scene background matches expected color

**✅ Bridge Communication**:
- [ ] "✅ Ready" status appears after initialization
- [ ] Ping button becomes enabled
- [ ] Tapping ping button shows console log: "The button has been tapped!"
- [ ] Pong response appears in debug overlay
- [ ] Unity debug overlay shows received/sent messages

**✅ Performance**:
- [ ] Initialization completes in 2-5 seconds
- [ ] UI responsive (no lag)
- [ ] Unity scene renders smoothly (60 FPS target)

---

## 🐛 Troubleshooting

### Issue: Scene Not Visible

**Symptoms**: Unity view area is blank/black/transparent

**Checks**:
1. Verify Unity console (no errors):
   ```bash
   tail -f ~/Library/Logs/Unity/Editor.log | rg "error|warning"
   ```
2. Camera clear flags should be "Solid Color" (already fixed)
3. Rebuild if necessary:
   ```bash
   ios-full
   ```

### Issue: Status Stuck on "⏳ Initializing..."

**Symptoms**: Never changes to "✅ Ready", ping button stays disabled

**Checks**:
1. Unity console for `BridgeTarget ready` log
2. React Native console for `unity_ready` message
3. Verify BridgeTarget script attached to GameObject in scene
4. Restart app and try again

**Fix**:
```bash
# Kill and restart app
killall Portals  # On device
# Re-open app
```

### Issue: Ping Button Doesn't Work

**Symptoms**: Tapping ping button does nothing or shows error

**Checks**:
1. Verify `unityReady` state is true
2. Check React Native console for errors
3. Verify UnityFramework is custom build (not package default):
   ```bash
   ls -la node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/
   ```

**Fix**:
```bash
# Rebuild with full process
ios-full
```

### Issue: Metro Connection Lost

**Symptoms**: "Could not connect to Metro" error

**Checks**:
```bash
# Check Metro is running
ps aux | grep "node.*8081" | grep -v grep

# If not running, start it
npm start
```

---

## 🎯 Success Criteria

### All Tests Pass When:

1. ✅ Unity scene renders with visible white cube
2. ✅ Initialization completes within 5 seconds
3. ✅ Status updates to "✅ Ready"
4. ✅ Ping button becomes enabled
5. ✅ Ping test produces:
   - Console log: "The button has been tapped!"
   - Pong response in debug overlay
   - Unity logs in debug overlay
6. ✅ No errors in console or Unity log
7. ✅ Performance is smooth (no lag, 60 FPS)

---

## 📊 What to Report

### If All Tests Pass ✅

**Report**:
```
✅ All tests passed!
- Unity scene renders correctly
- Bridge communication works
- Ping/pong verified
- Ready for AR feature development
```

**Next Steps**:
1. Start building AR features
2. Reference [UNITY_SCENE_ANALYSIS.md](UNITY_SCENE_ANALYSIS.md) for workflow
3. Use [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md) as reference

### If Tests Fail ❌

**Report** (include this info):
1. Which step failed (1-5 above)
2. Exact error message (from console or Unity log)
3. Screenshot of issue (if visual)
4. Device restart attempted? (yes/no)
5. Metro connection status (connected/disconnected)

**Logs to Check**:
```bash
# Unity Editor log
tail -100 ~/Library/Logs/Unity/Editor.log

# Metro bundler log
tail -100 metro-bundler.log

# iOS device logs (if Xcode available)
# Window → Devices → Select iPad → Open Console → Filter: Unity
```

---

## 🔗 Quick Reference

### Commands

```bash
# Navigate to project
portals-cd

# Rebuild (if needed)
ios-fast    # Script changes only (5-8 min)
ios-full    # Full rebuild with Unity export (10-15 min)

# Check Metro
ps aux | grep "node.*8081"

# Start Metro (if not running)
npm start

# Check connected devices
xcrun xctrace list devices 2>&1 | grep -v Simulator
```

### Documentation

- **Scene Analysis**: [UNITY_SCENE_ANALYSIS.md](UNITY_SCENE_ANALYSIS.md)
- **Complete Summary**: [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md)
- **Testing Guide**: [TEST_UNITY_INTEGRATION.md](TEST_UNITY_INTEGRATION.md)
- **Unity-RN Workflow**: `~/.claude/docs/UNITY_RN_INTEGRATION_WORKFLOW.md`

### Key Files

- Unity Scene: [unity/Assets/Scenes/UnityTestScene.unity](unity/Assets/Scenes/UnityTestScene.unity)
- Bridge Script: [unity/Assets/Scripts/BridgeTarget.cs](unity/Assets/Scripts/BridgeTarget.cs)
- RN Screen: [src/screens/UnityTestScene.tsx](src/screens/UnityTestScene.tsx)
- RN Component: [src/components/UnityArView.tsx](src/components/UnityArView.tsx)
- Build Script: [scripts/build_and_run_ios.sh](scripts/build_and_run_ios.sh)

---

**Ready to Test!** Follow the steps above and report results. 🚀
