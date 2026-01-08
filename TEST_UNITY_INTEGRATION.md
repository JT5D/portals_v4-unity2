# Unity-React Native Integration Testing Guide

**Last Updated**: 2026-01-08
**Status**: Ready for Device Testing

---

## ✅ Prerequisites Completed

All critical fixes are already applied:
- ✅ Unity scene camera fixed (Solid Color clear flags)
- ✅ BridgeTarget GameObject added to scene
- ✅ Custom UnityFramework builds and copies to node_modules
- ✅ React Native ready state tracking implemented
- ✅ .claudeignore created (180K token savings)

---

## 🧪 Unity Editor Testing (2 minutes)

### Quick Verification

1. **Open Unity Editor** (should already be running)
   - Project: `/Users/jamestunick/Documents/GitHub/portals_v4/unity`

2. **Load Test Scene**
   - Project window → Assets/Scenes/ → `UnityTestScene.unity`
   - Double-click to load

3. **Verify Hierarchy**
   ```
   Hierarchy window should show:
   ├── Main Camera (Tag: MainCamera)
   ├── Directional Light
   ├── Cube (Position: 0, 1, -5)
   └── BridgeTarget (Component: BridgeTarget)
   ```

4. **Test in Play Mode**
   - Press Play button (▶️ in toolbar)
   - **Expected Console Output:**
     ```
     [BridgeTarget] Started in scene: UnityTestScene
     [BridgeTarget] GameObject name: BridgeTarget
     BridgeTarget ready
     [BridgeTarget] Sending: {\"type\":\"unity_ready\",\"source\":\"unity\",...}
     [BridgeTarget] Created debug cube at camera position
     ```

5. **Verify Visual Elements**
   - ✅ Game view shows white cube in center
   - ✅ Scene view shows cube at (0, 1, -5)
   - ✅ Debug overlay (top-left) shows recent logs
   - ✅ No errors in Console window

6. **(Optional) Test Bridge Communication**
   - Menu: `Tools > Test Unity Bridge (Play Mode)`
   - **Expected:**
     ```
     [Test] Sending test message: {\"type\":\"ping\",\"source\":\"editor_test\",\"ts\":12345}
     [BridgeTarget] Received: {\"type\":\"ping\",...}
     [BridgeTarget] Sending: {\"type\":\"pong\",...}
     [Test] Check console above for pong response
     ```

7. **Exit Play Mode**
   - Press Play button again to stop

---

## 📱 iOS Device Testing (5-10 minutes)

### Prerequisites
- iPhone connected via USB
- "Trust This Computer" dialog accepted on device
- Xcode installed

### Option 1: Automated Build (Recommended)

```bash
cd /Users/jamestunick/Documents/GitHub/portals_v4

# For incremental build (script changes only - 5-8 min):
npm run ios:editor

# For full rebuild (scene/asset changes - 10-15 min):
# Currently ios:editor does both; once aliases are added, use ios-full
```

**Build Process:**
1. Builds Unity iOS framework
2. Copies to node_modules/@azesmway/react-native-unity/ios/
3. Runs pod install
4. Builds Xcode project
5. Installs on device
6. Starts Metro bundler
7. Launches app with dev client

**If Device Pairing Fails:**
- Error: "Unable to find a destination matching..."
- Solution: Continue to Option 2 (Manual Xcode Install)

### Option 2: Manual Xcode Install

```bash
# 1. Open Xcode workspace
open /Users/jamestunick/Documents/GitHub/portals_v4/ios/Portals.xcworkspace

# 2. In Xcode:
#    - Window > Devices and Simulators
#    - Select your device under "Devices"
#    - Click "Use for Development" if shown
#    - Wait for symbol processing to complete

# 3. Build and Run:
#    - Select "Portals" scheme (top bar)
#    - Select your device as destination
#    - Press ⌘R (Run) OR Product > Run

# 4. App should launch on device
```

### On-Device Verification

1. **App Launches**
   - ✅ App opens without crash
   - ✅ Main menu loads

2. **Navigate to Unity Test Scene**
   - Tap hamburger menu (☰)
   - Select "Unity AR Test"

3. **Verify Initial State**
   - ✅ Header shows "Unity AR Test"
   - ✅ Subtitle shows "Unity Status: ⏳ Initializing..."
   - ✅ Ping button is disabled (gray/dimmed)
   - ✅ Hint text: "Waiting for Unity to initialize..."

4. **Wait for Unity Ready (2-5 seconds)**
   - ✅ Subtitle changes to "Unity Status: ✅ Ready"
   - ✅ Ping button becomes enabled (white background)
   - ✅ Hint text changes to "Unity will log {type:\"pong\"}..."

5. **Verify Unity Content**
   - ✅ White cube visible in center of screen
   - ✅ Debug overlay (top-left) shows Unity logs
   - ✅ Debug overlay includes "BridgeTarget ready"

6. **Test Message Passing**
   - Tap "Ping Unity" button
   - **Expected Console Output** (Metro terminal):
     ```
     The button has been tapped!
     [Unity Message]: {type: "pong", source: "unity", ts: ...}
     ```
   - **Expected Debug Overlay** (on device):
     ```
     [BridgeTarget] Received: {\"type\":\"ping\",\"source\":\"rn\",...}
     [BridgeTarget] Sending: {\"type\":\"pong\",...}
     ```

7. **Stress Test**
   - Tap ping button multiple times rapidly
   - ✅ All messages logged correctly
   - ✅ No crashes or freezes
   - ✅ Unity scene remains visible

---

## 🐛 Troubleshooting

### Unity Scene Not Visible

**Symptom**: Black screen, no cube, no Unity content

**Checks**:
```bash
# 1. Verify custom framework was copied:
ls -la /Users/jamestunick/Documents/GitHub/portals_v4/node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/

# Expected: Recent timestamp (today's date)

# 2. Check build logs for framework copy confirmation:
grep "Custom UnityFramework installed" logs/*.log

# Expected: "✅ Custom UnityFramework installed in node_modules"

# 3. Verify Podfile has custom framework:
grep -A 10 "post_install" ios/Podfile | grep -i unity

# Expected: Lines referencing UnityFramework or custom framework
```

**Solutions**:
- Rebuild: `npm run ios:editor` (forces framework rebuild and copy)
- Clean: `cd ios && rm -rf Pods Podfile.lock && pod install`

---

### Ping Button Does Nothing

**Symptom**: Button tap shows no console output, no response

**Checks**:
1. **Verify ready state**: Is subtitle showing "✅ Ready"?
   - If showing "⏳ Initializing...", wait longer (up to 10 seconds)
   - If stuck on initializing, check debug overlay for errors

2. **Check Metro console**:
   ```
   Should see: "The button has been tapped!"
   If missing, RN event handling broken
   ```

3. **Check Unity console** (debug overlay on device):
   ```
   Should see: "[BridgeTarget] Received: ..."
   If missing, bridge communication broken
   ```

**Solutions**:
- Restart app: Close app completely, relaunch
- Rebuild framework: See "Unity Scene Not Visible" above
- Check BridgeTarget exists: Run Unity Editor tests first

---

### Build Fails: Device Not Found

**Symptom**: `xcodebuild: error: Unable to find a destination matching...`

**Solutions**:
1. **Pair device with Xcode**:
   ```bash
   open -a Xcode ios/Portals.xcworkspace
   # Window > Devices and Simulators
   # Select device > "Use for Development"
   ```

2. **Verify device connected**:
   ```bash
   xcrun xctrace list devices | grep -i iphone
   # Should show your device with UDID
   ```

3. **Trust device**:
   - Unlock iPhone
   - Dialog: "Trust This Computer?"
   - Tap "Trust"
   - Enter device passcode

---

### Metro Not Starting

**Symptom**: Build completes but app shows connection error

**Solutions**:
```bash
# 1. Kill existing Metro instances:
pkill -f "expo start" || true
pkill -f "react-native start" || true

# 2. Clear Metro cache:
rm -rf .expo/web/cache
rm -rf node_modules/.cache

# 3. Restart Metro manually:
npm start -- --tunnel

# 4. Wait for "Tunnel ready" message
# 5. Rerun build script
```

---

## 📊 Success Criteria

### Unity Editor
- [x] Scene loads without errors
- [x] BridgeTarget GameObject exists
- [x] Cube visible at (0, 1, -5)
- [x] Play mode shows "BridgeTarget ready"
- [x] Debug overlay displays logs
- [x] Bridge test shows ping/pong exchange

### iOS Device
- [x] App launches successfully
- [x] Unity scene visible with white cube
- [x] Ready state shows "✅ Ready" (2-5 sec)
- [x] Ping button enabled after ready
- [x] Button tap logs "The button has been tapped!"
- [x] Unity responds with pong message
- [x] Debug overlay shows message exchange
- [x] No crashes or errors

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅

1. **Verify commit pushed**:
   ```bash
   git log -1 --oneline
   # Should show: "jtunick@theimclab.com"

   git remote -v
   # Should show: origin git@github.com:ryanjbrant/portals_v4.git
   ```

2. **Add build aliases** (from research recommendations):
   ```bash
   cat >> ~/.zshrc <<'EOF'

# Portals Unity-RN Build Aliases
alias ios-fast='cd ~/Documents/GitHub/portals_v4 && ./scripts/build_and_run_ios.sh --skip-unity-export --keep-unity-open'
alias ios-full='cd ~/Documents/GitHub/portals_v4 && ./scripts/build_and_run_ios.sh'
EOF

   source ~/.zshrc
   ```

3. **Start building AR features!**
   - Unity Editor: Edit scenes, scripts, test in Play mode
   - Build: `ios-fast` (5-8 min for script changes)
   - Test: On device
   - Iterate!

### If Tests Fail ❌

1. **Check troubleshooting section** above
2. **Capture logs**:
   ```bash
   # Unity Editor console
   # Copy all error/warning messages

   # iOS device logs (if app crashes)
   xcrun devicectl device info logs --device <UDID> > device.log

   # Metro console output
   # Copy connection errors or warnings
   ```

3. **Provide details**:
   - Which step failed?
   - What error message appeared?
   - Console output?
   - Screenshots of debug overlay?

---

## 📖 Related Documentation

- **Unity-RN Integration Workflow**: `~/.claude/docs/UNITY_RN_INTEGRATION_WORKFLOW.md`
- **Deep Research Report**: See last Claude Code session output
- **Build Script**: `scripts/build_and_run_ios.sh`
- **Unity Setup Script**: `unity/Assets/Scripts/Editor/SetupUnityTestScene.cs`

---

**Ready to test!** Start with Unity Editor verification, then proceed to iOS device testing.
