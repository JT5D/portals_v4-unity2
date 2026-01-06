# 🎯 Portals Strategy: Unity & Architecture

This document outlines the long-term technical strategy for Portals, focusing on the migration from ViroReact to Unity AR Foundation and the high-level system architecture.

---

## 🏗️ Deep Technical Architecture

### 1. Navigation Shell (`src/navigation`)
The app uses a nested navigation structure built with **React Navigation**:
- **RootNavigator**: Switches between `AuthStack` (Login/Register) and `MainStack`.
- **BottomTabNavigator**: The main interface landing points:
  - `Feed`: Infinite scroll of AR posts.
  - `Map`: Geo-spatial discovery.
  - `Figment`: The immersive AR creation suite.
  - `Activity`: Notifications and social interactions.
  - `Profile`: User settings, worlds, and collections.
- **Modals**: High-priority screens like `TagPeople` or `LocationPicker` use native transparent/full-screen modal presentations.

### 2. Dual-State Management
To balance social features with high-performance AR, we use two state managers:
- **Zustand (`src/store`)**: Handles "lightweight" and persistent app data like User sessions, Feed lists, and Social relationships.
- **Redux (`src/screens/FigmentAR/redux`)**: Exclusively handles the high-frequency updates required for the AR scene (object transforms, animation states, physics properties).

### 3. Native & Infrastructure Stack
- **Custom Native Modules (`modules/ar-view-recorder`)**: A dedicated Expo Module that bridges to native iOS scripts for capturing high-quality video of the AR viewport, bypassing standard screen-record limitations.
- **Firebase Stack**:
  - `Firestore`: Real-time post metadata, user data, and collaborative scene locks.
  - `Auth`: Phone/Email session management.
- **Cloudflare R2 (`src/services/storage/r2.ts`)**: S3-compatible storage for heavy assets. All 3D models (`.glb`) and captured videos are stored here to keep Firestore lean.
- **Dynamic Asset Resolution**: URLs starting with `r2://` are automatically resolved at runtime via `getDownloadUrl` in the Store.

### 4. The Creative Pipeline
- **Capture**: `ArViewRecorder` + `VideoMerger` (Native) -> Local MP4.
- **Enhance**: Local MP4 -> `aiVideoService.ts` -> **Decart/Lucy API** -> Stylized MP4.
- **Publish**: Stylized MP4 + Scene JSON -> `saveSceneToStorage` -> R2 + Firestore.

---

## 🌳 Branching Strategy

- **`dev`**: The new primary development branch. This is where active development happens and where developers should push/PR their code.
- **`main`**: Reserved for stable, tested releases. Merges into `main` only happen from `dev`.

---

## 🏗️ Unity & AR Foundation Migration Strategy

This section outlines the plan for porting current **ViroReact** features to **Unity + AR Foundation** while maintaining the React Native social shell.

### 1. Recommended Integration Stack (2025 Best Practice)
Based on deep research, the standard for stable, large-scale apps is **[@azesmway/react-native-unity](https://github.com/azesmway/react-native-unity)**. It is preferred over the older YourArtOfficial approach due to its superior support for the New React Native Architecture and robust Expo Config Plugin support.

**Key Technical Decisions:**
- **Bridge**: Use `@azesmway/react-native-unity` to embed native Unity as a `UnityView` component.
- **Communication**: Implement an **App-to-Unity** message bus using `postMessage(gameObject, method, data)` and a **Unity-to-App** bus using `UnityMessageManager`.
- **AR Engine**: Replace Viro with **Unity AR Foundation** (ARKit + ARCore + MetaXR plugins) to gain access to LiDAR, advanced occlusion, and hand tracking.

### 2. Migration Roadmap: Viro to Unity

#### Phase 1: The "Portal" Component
- **Viro Feature**: `<ViroPortalScene>`
- **Unity Port**: A custom Shader Graph utilizing **Stencil Buffers**. The "Window" is a mesh that masks the interior world. This is significantly more performant in Unity than Viro's native portal implementation.

#### Phase 2: AI Composer Integration
- **Viro Feature**: `aiSceneComposer.ts` -> Redux actions.
- **Unity Port**: Maintain the Gemini-based `SceneAction` JSON structure in React Native. Instead of dispatching to Redux, send the JSON string via `postMessage` to a "SceneManager" C# script in Unity.

#### Phase 3: Spatial Persistence
- **Viro Feature**: World Tracking + ARHitTest.
- **Unity Port**: Use **ARFoundation's ARAnchorManager** and **Google Geospatial API / Azure Spatial Anchors** for persistent cross-platform world-linking, which Viro lacks.

### 3. Implementation Steps for Developers
1. **Export Unity as Library**: Build Unity project using "Export Project" (Android) or `UnityFramework` target (iOS).
2. **Setup Expo Config Plugin**: Create `plugins/withUnity.js` to automate Podfile/Gradle modifications required for `UnityFramework`.
3. **UnityView Component**: Wrap the 3D canvas in a React Native screen.

### 4. Why Migrate?
- **Performance**: Unity's DOTS and optimized C# backend handle 10x more objects than Viro's JS bridge.
- **Ecosystem**: Direct access to the **Unity Asset Store** for high-quality shaders, VFX (Visual Effect Graph), and optimized avatars.
- **Platform Reach**: Unity allows for easier reach into VisionPro (visionOS) and Quest 3 (Meta XR) in the future.

---

### 📦 Existing AR Functionality Mapping (Viro to Unity)

To ensure a seamless transition, the following Viro-specific components have been mapped to their Unity/ARFoundation equivalents:

| Viro Component | Unity Equivalent | Mapping Logic / Strategy |
|----------------|------------------|--------------------------|
| `Viro3DObject` | `GameObject + MeshRenderer` | Map `modelIndex` from `ModelItems.js` to a Unity Prefab via a `ScriptableObject` registry. |
| `ViroPortalScene` | `Portal Shader + Stencil Mesh` | Use a custom Shader to render a separate Skybox/Scene inside a masked boundary. |
| `ViroParticleEmitter` | `Unity VFX Graph` | Higher performance particles with GPU acceleration. Map `emitter_name` keys. |
| `ViroSpatialSound` | `AudioSource + Spatializer` | Direct mapping; use Unity's built-in 3D audio engine for proximity/HRTF. |
| `ViroARHitTest` | `ARRaycastManager` | Standard ARFoundation raycasting for surface placement. |
| `ViroQuad (Shadow)` | `Shadow Catcher Shader` | Use a transparent quad with a custom shadow-receiver shader (Universal Render Pipeline). |

---

## 📡 Spatial Collaboration: Needle Engine Integration

Beyond the core AR foundation, we are integrating **Needle Engine** (specifically the `Screensharing` logic found in `_ref/Needle Engine Samples 2021.3`) to power real-time, peer-to-peer collaborative experiences.

### 1. The Strategy: "Spatial Meeting Rooms"
By leveraging Needle Engine's lightweight WebGL/WebXR stack, we can create "Portals" that act as collaborative shared spaces. Unlike traditional video calls, these are 3D-integrated streams pinned in the user's actual physical environment.

**Key Use Case**: A user starts a screen-share from their mobile device or desktop. This stream is projected onto a 3D "Curved Screen" in a shared Portal. Other participants can walk around this screen in AR, interacting with the content while seeing each other's 3D avatars/pointers.

### 2. Technical Implementation via `ScreenCapture`
The integration focuses on the Needle `ScreenCapture` and `VideoPlayer` components:
- **WebRTC Networking**: Use Needle’s built-in networking (WebRTC) for ultra-low latency streaming of cameras, screens, and audio.
- **WebView Bridge**: Implement a `NeedlePortal` React Native component that wraps an Expo `WebView`.
- **Hybrid Sync**:
  - **React Native**: Handles room management, authentication, and overlay UI.
  - **Needle Engine**: Handles 3D rendering of the shared stream, spatial audio, and WebRTC handshakes.
  - **Communication**: Use `postMessage` for syncing Portals' local AR anchors with Needle’s world coordinates.

### 3. Integration with `Screensharing` Sample
- **Curved Surface Rendering**: Port the `CurvedScreen` prefab logic from the samples to ensure shared content remains legible and immersive at various angles.
- **Stream Injection**: Interface the mobile device's camera/screen stream directly into the Needle `VideoPlayer` instance within the WebView.
- **Interactive Pointers**: Leverage Needle's `IPointerClickHandler` to allow users to "click" on the shared screen in 3D, triggering events that sync across all connected clients.

### 4. Why Needle?
- **WebXR Native**: Seamlessly transitions from mobile AR to browser-based viewing.
- **Zero-Install Persistence**: Allows users without the Portals app to view shared streams via a simple web link.
- **High Performance**: Optimized for mobile browsers, ensuring the screensharing doesn't impact the high-fidelity native AR tracking on the device.

---

#### Critical Logic to Port:
1. **Scene Serializer**: The `FigmentSceneSerializer.js` logic must be rewritten in C# using `JsonUtility` or `Newtonsoft.Json` to ensure Unity can load Portals created in the Viro version.
2. **Dynamic UI**: Move the `ModelLibraryPanel.js` and `ObjectPropertiesPanel.js` interactions to Unity's **UI Toolkit** or **Canvas** system for faster touch response.
3. **AI Scene Actions**: The `BATCH_TRANSFORM` logic in `aiSceneComposer.ts` (Cluster, Spread, Formation) needs to be implemented as a C# command pattern.

---

---

## 📦 SOTA 3D Asset Pipeline (2025/2026 Strategy)

To achieve the goal of "uploading any 3D file & animation," we will implement a state-of-the-art (SOTA) cloud-native pipeline. This moves beyond simple file conversion to an intelligent, automated optimization workflow comparable to industry leaders like Sketchfab or dedicated AR content management systems.

### 1. Unified Upload & Ingestion
- **"Any Format" Support**: Accepted inputs: `.fbx`, `.obj`, `.stl`, `.glb`, `.gltf`, `.abc`, `.usd/usdz`, `.blend`.
- **Intelligent Ingestion**:
  - **Storage**: Upload raw assets to `R2/raw/{uuid}/`.
  - **Manifest Generation**: A serverless function (Lambda/Worker) extracts metadata: vertex count, bone count, animation clips, and texture dimensions.

### 2. The Transformation Engine (Cloud)
We will deploy a containerized processing worker (e.g., using Blender Python API or specialized CLI tools) to perform the following SOTA operations:

#### A. Format Standardization: The "Super GLB"
The pipeline targets **GLTF/GLB (v2.0)** as the universal runtime delivery format, optimized specifically for mobile AR.
- **Geometry Compression**: Apply **Draco Compression** (Google) to reduce geometry size by ~90% without visible loss.
- **Texture Super-compression**: Convert textures to **KTX2 (Basis Universal)**. This allows textures to remain compressed on the GPU, significantly reducing RAM usage and load times compared to standard PNG/JPG.
- **LOD Generation**: Automatically generate 3 Levels of Detail (LOD0, LOD1, LOD2) to ensure performance on older devices.

#### B. AI-Assisted Rigging & Remediation (2025 Feature)
For static meshes uploaded by users that need animation:
- **Auto-Rigging**: Integrate an AI service (e.g., *Tripo AI*, *DeepMotion*, or custom models based on *UniRig*) to infer skeletons and skin weights for humanoid and quadruped meshes.
- **Animation Retargeting**: Automatically retarget standard animation sets (Idle, Walk, Dance) onto the newly rigged character.

### 3. Engine-Specific Runtime Loading Strategy

#### 🟢 Unity / AR Foundation (The "Pro" Standard)
- **Local Preview (Instant)**: Use **[TriLib 2](https://ricardoreis.net/trilib-2/)** for direct runtime loading of FBX, OBJ, and GLB files from the device storage. This allows users to see their raw files immediately before cloud processing finishes.
- **Cloud Assets**: Use **UnityGLTF** or **UniGLTF** (from VRM) to load the optimized, Draco-compressed, KTX2-textured GLBs streamed from R2. This ensures maximum performance for shared content.

#### 🔵 ViroReact (Legacy Support)
- **Fallback**: Continue using the legacy `.vrx` pipeline for Viro, but prioritize migrating these views to Unity via `UnityView`. Viro does not natively support KTX2 or Draco well.

#### 🟣 Needle Engine (Web/Needle/Three.js)
- **Native Power**: Needle is built on **Three.js**, which has first-class support for the modern stack.
- **Loaders**:
  - `GLTFLoader` with `DRACOLoader` and `KTX2Loader` extensions.
  - **Progressive Loading**: Use `@needle-tools/gltf-progressive` to stream massive scenes (e.g., photogrammetry scans) in chunks, preventing frame drops.
- **React-Three-Fiber (R3F)**: If implementing web pipelines directly, use `useGLTF` from `@react-three/drei` which handles Draco/CDN caching automatically.

### 4. Implementation Priorities
1. **TriLib 2 Integration**: Purchase and integrate TriLib 2 into the Unity export to solve the "raw FBX at runtime" problem immediately.
2. **Cloud Worker Prototype**: Set up a basic Node.js script using `gltf-pipeline` to test FBX -> GLB + Draco conversion on a local machine.
3. **AI Prototype**: Test the *Tripo AI* API or similar for converting a user-uploaded static mesh into a rigged GLB.

---

### 📚 Technical Reference (Unity Integration)

For Android & iOS specific build integration details (including native call proxy and framework placement), see the [react-native-unity documentation](./_ref/react-native-unity-main/README.md).
