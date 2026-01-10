# Quick Unity Integration Diagnostic

**Run this BEFORE we rebuild** to understand what's failing:

## What to Look For

### 1. Unity AR Test Screen Visual Check

Open app → Navigate to "Unity AR Test" screen

**Scenario A: Nothing renders**
- You see: Header, buttons, but NO black box, NO Unity view
- Means: UnityView component not mounting or has zero size
- Next: Check React Native console for component errors

**Scenario B: Black rectangle**
- You see: Header, buttons, and a BLACK rectangle where Unity should be
- Means: UnityView mounted, but Unity not initializing
- Next: Check native logs for Unity initialization errors

**Scenario C: Transparent/white area**
- You see: Header, buttons, and see-through area (can see black background)
- Means: Unity initializing but camera clear flags issue (should be fixed)
- Next: Verify UnityFramework has latest build

**Scenario D: Debug overlay visible but no cube**
- You see: Black debug overlay box at top showing Unity logs, but no cube
- Means: Unity IS running, BridgeTarget IS working, but rendering issue
- Next: Check Unity camera position/scene setup

**Scenario E: App crashes**
- App closes when navigating to Unity AR Test screen
- Means: Native crash (UnityFramework loading failure)
- Next: Check crash logs in Xcode

### 2. React Native Console Check

```bash
# If Metro is running, check the terminal for errors
# Look for:
- "[UnityArView] Component mounted" (should appear when screen loads)
- "[UnityView] Unity is ready!" (should appear 1-3 seconds after mounting)
- Any errors with "Unity" in them
```

### 3. Xcode Device Logs (if accessible)

```bash
# Open Xcode → Window → Devices and Simulators
# Select your iPad → View Device Logs
# Look for:
- "Unity" errors
- "UnityFramework" loading errors
- Crash reports
```

## Simple Fix Attempts

### If Nothing Renders (Scenario A)

**Possible Fix**: Component layout issue
```typescript
// Edit src/components/UnityArView.tsx
// Change line 65 from:
flex: 1,

// To:
flex: 1,
backgroundColor: 'red', // Temporary - to see if component has size
```

Rebuild and check - if you see RED rectangle, component HAS size but Unity isn't loading.

### If Black Rectangle (Scenario B)

**Possible Fix**: Unity not initializing

1. Check if app was built with latest UnityFramework:
```bash
ls -lh ~/Documents/GitHub/portals_v4/node_modules/@azesmway/react-native-unity/ios/UnityFramework.framework/Data/level0
# Should show: Jan 8 05:48 (today)
```

2. If old, rebuild:
```bash
cd ~/Documents/GitHub/portals_v4
./scripts/build_and_run_ios.sh --force-close-unity
```

### If Debug Overlay Shows but No Cube (Scenario D)

**Means**: Unity IS working! Just rendering issue.

Check Unity logs in the debug overlay for:
- "BridgeTarget ready" (should appear)
- "Camera.main is null" (would explain no cube)
- Any error messages

---

## Report Back

Please tell me:
1. Which scenario (A, B, C, D, or E) matches what you see
2. Any console errors you see in Metro terminal
3. What the debug overlay shows (if visible)

This will pinpoint the exact failure point.
