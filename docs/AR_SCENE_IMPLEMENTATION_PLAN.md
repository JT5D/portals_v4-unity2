# AR Scene Implementation Plan

**Objective**: Replace Unity test scene with a simple AR Foundation scene that demonstrates plane detection, includes verbose logging, and displays a debug overlay in the bottom-left corner.

**Branch**: `react-unity`
**Date**: 2026-01-09
**Last Updated**: 2026-01-10

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Create minimal AR scene | ✅ Complete | `ARTestScene.unity` created (1149 lines) |
| 2. Add debug overlay GUI | ✅ Complete | `ARDebugOverlay.cs` with on-screen panel |
| 3. Integrate BridgeTarget + AR events | ✅ Complete | `ARSessionLogger.cs` wired to bridge |
| 4. Build to iPhone | ✅ Complete | Successfully deployed |
| 5. Review logs & iterate | 🔄 In Progress | Testing AR features |

**Current Active Scene**: `ARTestScene.unity` (Scene 0 in EditorBuildSettings)

**Scene Components Implemented**:
- ✅ ARSession
- ✅ XR Origin (ARF XR Origin Set Up prefab)
- ✅ ARPlaneManager
- ✅ ARMeshManager
- ✅ ARCameraManager + ARCameraBackground
- ✅ Debug Canvas with overlay
- ✅ BridgeTarget (auto-creates)

---

## Phase Overview

| Phase | Description | Time | Verification |
|-------|-------------|------|--------------|
| 1 | Create minimal AR scene | 15 min | Unity Play mode |
| 2 | Add debug overlay GUI | 10 min | Visual confirmation |
| 3 | Integrate BridgeTarget + AR events | 10 min | Console logs |
| 4 | Build to iPhone | 15-20 min | Device launch |
| 5 | Review logs & iterate | Variable | Device logs clean |

**Total Estimated Time**: ~60 minutes first iteration

---

## Phase 1: Create Minimal AR Scene

### Goal
Create `ARTestScene.unity` with basic AR Foundation plane detection.

### Components Required
1. **ARSession** - Manages AR lifecycle
2. **XROrigin** - Camera rig and tracking space
3. **ARPlaneManager** - Detects horizontal/vertical planes
4. **ARRaycastManager** - Raycast against AR surfaces
5. **Directional Light** - For proper AR lighting
6. **BridgeTarget** - RN ↔ Unity messaging

### Scene Hierarchy
```
ARTestScene
├── ARSession (ARSession component)
├── XR Origin (Device-based)
│   └── Camera Offset
│       └── Main Camera (ARCameraManager, ARCameraBackground)
├── AR Plane Manager (ARPlaneManager + ARPlaneDebugVisualizer)
├── Directional Light
├── BridgeTarget (existing script, auto-creates via RuntimeInitializeOnLoadMethod)
└── Debug Canvas (Screen Space - Overlay)
    └── Debug Panel (bottom-left)
        └── Log Text (TextMeshProUGUI)
```

### Key Settings
- **AR Plane Manager**:
  - Detection Mode: Horizontal
  - Plane Prefab: `AR Feathered Plane.prefab`
- **XROrigin**:
  - Tracking Origin Mode: Device
  - Camera Y Offset: 0

---

## Phase 2: Add Debug Overlay GUI

### Goal
Create an always-visible debug panel in the bottom-left corner showing:
- FPS counter
- AR Session state
- Plane count
- Bridge message stats (RX/TX)
- Last 10 log messages

### UI Layout (Bottom-Left)
```
┌─────────────────────────────────┐
│ FPS: 60  |  AR: Running         │
│ Planes: 3  |  RX: 5  TX: 8      │
├─────────────────────────────────┤
│ [12:34:56] AR Session Ready     │
│ [12:34:57] Plane detected #1    │
│ [12:34:58] Bridge: unity_ready  │
│ [12:34:59] RN ping received     │
│ [12:35:00] Sent pong response   │
└─────────────────────────────────┘
```

### Implementation
- Canvas: Screen Space - Overlay
- Panel: Anchored to bottom-left (0, 0)
- Size: 400x200 pixels
- Background: Semi-transparent black (0,0,0,0.7)
- Font: TextMeshPro, 12pt, monospace

---

## Phase 3: Integrate BridgeTarget with AR Events

### Goal
Wire AR Foundation events to verbose logging and RN communication.

### Events to Log
1. **ARSession State Changes**:
   - `None` → `CheckingAvailability` → `Installing` → `Ready` → `SessionTracking`
   - Log each transition with timestamp

2. **Plane Events**:
   - `planesChanged.added` - New plane detected
   - `planesChanged.updated` - Plane geometry updated
   - `planesChanged.removed` - Plane lost

3. **Camera Events**:
   - Light estimation values
   - Tracking state changes

### Bridge Messages (Unity → RN)
```json
{ "type": "ar_state", "state": "SessionTracking" }
{ "type": "ar_plane", "action": "added", "id": "plane_1", "size": [1.5, 2.0] }
{ "type": "ar_plane", "action": "removed", "id": "plane_1" }
{ "type": "ar_stats", "fps": 60, "planes": 3 }
```

---

## Phase 4: Build to iPhone

### Build Command
```bash
./scripts/build_minimal.sh
```

### Expected Output
1. Fail-fast checks pass
2. Unity exports to `/tmp/unity-ios-export/`
3. UnityFramework.framework built
4. App installed on device
5. App auto-launches

### Verification
1. App opens without crash
2. Camera permission prompt appears
3. Camera feed visible
4. Debug overlay visible in bottom-left
5. "AR: Initializing..." changes to "AR: Running"

---

## Phase 5: Review Logs & Iterate

### Device Log Commands
```bash
# Live Unity/Bridge logs
idevicesyslog | grep -E "Bridge|AR|Unity"

# Live RN logs (if Metro running)
npx react-native log-ios | grep -E "UnityArView|AR"

# Check Unity file log (after pulling from device)
# Located at: Documents/bridge_log.txt
```

### Success Criteria
- [x] No crash on launch
- [x] Camera permission granted
- [x] AR Session reaches "Running" state
- [ ] At least 1 plane detected on flat surface
- [x] Debug overlay shows live FPS
- [x] Bridge messages flowing (unity_ready → pong cycle)
- [ ] No error logs in device console

### Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Black screen | Missing ARCameraBackground | Add to Main Camera |
| No planes | Wrong detection mode | Set to Horizontal |
| Low FPS | URP not configured | Check Pipeline Asset |
| Bridge silent | BridgeTarget not in scene | Auto-creates, check logs |
| Crash on AR init | Missing privacy strings | Already in ProjectSettings |

---

## Files to Create/Modify

### New Files
1. `unity/Assets/Scenes/ARTestScene.unity` - New AR scene
2. `unity/Assets/Scripts/ARDebugOverlay.cs` - Debug UI controller
3. `unity/Assets/Scripts/ARSessionLogger.cs` - AR event logging

### Modified Files
1. `unity/Assets/Scripts/BridgeTarget.cs` - Add AR event handlers
2. `unity/ProjectSettings/EditorBuildSettings.asset` - Add ARTestScene to build

---

## Rapid Iteration Workflow

```
1. Make changes in Unity Editor
2. Save scene (Ctrl+S)
3. Run: ./scripts/build_minimal.sh
4. Wait ~5 min (incremental) or ~7 min (first)
5. App auto-launches on device
6. Check device logs: ./scripts/capture_device_logs.sh 10 "Bridge|AR"
7. If issues found, goto step 1
```

### Faster Iteration (Editor Only)
For quick testing without device build:
1. Enable XR Simulation in Unity (Window > XR > AR Foundation > XR Simulation)
2. Press Play in Unity Editor
3. Test AR features in simulation
4. When satisfied, build to device

---

## Next Steps After Phase 5

Once basic AR is working:
1. Add object placement on plane tap
2. Add plane visualization (feathered shader)
3. Add VFX spawning on detected planes
4. Integrate with RN UI for controls

---

*Created for portals_v4 react-unity branch*
