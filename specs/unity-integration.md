# 📝 Spec: Unity Integration & Bridge
> **Status:** Draft
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
- **Manager Script**: `UnityMessageManager.cs` (DontDestroyOnLoad) to parse incoming JSON and dispatch events to the scene.
- **Export Config**: iOS (`UnityFramework`), Android (`Export Project`).

## 4. Implementation Steps
- [ ] **Infrastructure**: Install `@azesmway/react-native-unity` and configure `react-native.config.js`.
- [ ] **Expo Plugin**: Create `plugins/withUnity.js` to automate `Podfile` and `build.gradle` modifications.
- [ ] **Unity Project**: Set up a clean Unity 2022 LTS project in `unity/` folder with AR Foundation.
- [ ] **Bridge**: Implement `SceneAction` JSON serialization (RN side) and parsing (C# side).
- [ ] **View**: Create `src/components/UnityArView.tsx`.
