# 📝 Spec: Unity Integration & Bridge
> **Status:** ✅ **Implemented**
> **Parent Strategy:** [STRATEGY.md](../STRATEGY.md)
> **Owner:** @antigravity

## 1. Problem
The current ViroReact AR engine is deprecated and lacks support for modern features like Geospatial API, occlusion, and performant complex VFX. We need a "Strangler Fig" migration path to Unity.

## 2. Proposed Solution
Integrate **Unity as a Library (UaaL)** using the `@azesmway/react-native-unity` package. This allows us to render Unity as a standard React Native component (`<UnityView>`) and communicate via a JSON-based message bus.

## 3. Technical Architecture
### A. The Shell (React Native)
- **Library**: `@azesmway/react-native-unity`
- **Component**: `<UnityView style={{flex:1}} />`
- **Messages**:
  - `postMessage('GameObjectName', 'MethodName', 'JSONString')` to send data.
  - `onMessage={(msg) => handleUnityMessage(msg)}` to receive data.

### B. The Engine (Unity)
- **Messaging**: Uses standard Unity `UnitySendMessage()` API (no custom manager needed)
- **Native Bridge**: `NativeCallProxy.h|mm` for iOS communication
- **Export Config**: iOS (`UnityFramework`), Android (`Export Project`)

## 4. Implementation Steps
- [x] **Infrastructure**: Install `@azesmway/react-native-unity` (pinned for patch compatibility).
- [x] **Expo Plugin**: Create `plugins/withUnity.js` to automate Android gradle modifications + iOS UnityFramework sanity checks.
- [x] **iOS Export Fixups**: `unity/Assets/Editor/IOSBuildPostProcessor.cs` adds Unity Data to UnityFramework resources and marks `NativeCallProxy.h` as Public.
- [x] **Unity Project**: Set up Unity 6 (6000.2.14f1) project in `unity/` folder.
- [x] **Unity Scenes**: Create UnityTestScene.unity and configure build settings.
- [x] **Native Bridge**: Copy Plugins/iOS from @azesmway package for RN communication.
- [x] **Unity MCP**: Install Unity MCP package for automated testing.
- [x] **Bridge**: Implement `UnityArView.tsx` component wrapper.
- [x] **View**: Create `src/components/UnityArView.tsx` and `src/screens/UnityTestScene.tsx`.
- [x] **Unity Builds**: Re-export iOS builds with UnityTestScene included (UnityFramework copied to `unity/builds/ios`).
- [ ] **Android Export**: Export unityLibrary with UnityTestScene.
- [ ] **Build & Test**: Test on physical iOS and Android devices.

## 5. Current Status

### ✅ Unity Project Setup Complete (2026-01-06)
- Unity 6000.2.14f1 project configured
- UnityTestScene.unity created with AR camera setup
- Both scenes (UnityTestScene + SampleScene) added to build settings
- Native bridge (Plugins/iOS/NativeCallProxy) installed
- Unity Test Framework package installed (v1.1.33)
- Unity MCP package installed for automated testing
- Project compiles with 0 errors

### 🔄 Pending: Android Export
- Android unityLibrary export still needed with UnityTestScene.

### ✅ React Native Integration
- `@azesmway/react-native-unity` v1.0.11 installed (pinned)
- `UnityArView` component wraps UnityView with type safety
- `UnityTestScene` ready for testing; Unity sends a ready ping via `UnityReadyNotifier` on scene load
- Expo plugin configured for Android gradle setup + iOS UnityFramework checks

## 6. Next Steps
1. **Export Fresh Unity Builds** (see unity/UNITY_BUILD_EXPORT_GUIDE.md)
   - iOS: Build UnityFramework.framework with new scenes
   - Android: Export unityLibrary with new scenes
2. **Refresh iOS pods** after Unity export (`npm run setup` or `cd ios && pod install`)
3. **Test on Physical Devices**
   - iOS: `npx expo run:ios --device`
   - Android: `npx expo run:android --device`
4. **Add Unity AR Foundation Features**
   - Plane detection
   - Image tracking
   - AR session management
5. **Implement Bidirectional Messaging**
   - Unity → RN: AR event notifications (ready ping already implemented)
   - RN → Unity: Portal placement commands

## 7. Unity Editor Fast Loop
When iterating on scenes in the Unity Editor:
1. Export iOS from Unity (`Tools/Build iOS`) to `unity/builds/ios`.
2. Run `npm run ios:editor` to build the UnityFramework and launch the device via tunnel.
