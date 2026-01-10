# Architecture Audit - January 2026

> **Generated**: 2026-01-10 | **Branch**: react-unity | **Unity**: 6000.2.14f1 | **RN**: 0.81.5

## Executive Summary

**Portals V4** is a production-grade hybrid React Native + Unity AR application implementing the "OS and Reality Engine" architecture pattern. This audit documents the complete system architecture, dependencies, services, known issues, and operational procedures.

---

## Current AR Testing Setup

**Active Scene**: `ARTestScene.unity` (1149 lines)
**Build Settings**: Scene 0 in EditorBuildSettings

**Scene Components**:
- ARF XR Origin Set Up (prefab instance)
- ARMeshManager (mesh reconstruction)
- ARPlaneManager (plane detection)
- ARSession (AR lifecycle)
- Canvas with debug UI (sorting order 100)

**Key Files**:
| File | Purpose |
|------|---------|
| `unity/Assets/Scenes/ARTestScene.unity` | Main AR test scene |
| `unity/Assets/Prefabs/ARF XR Origin Set Up.prefab` | XR Origin with camera |
| `unity/Assets/Scripts/BridgeTarget.cs` | RN message handler |
| `unity/Assets/Scripts/ARDebugOverlay.cs` | On-screen debug panel |

---

## 1. Tech Stack Overview

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **UI Framework** | React Native | 0.81.5 | Cross-platform app framework (New Architecture/Fabric) |
| **Build System** | Expo SDK | 54.0.30 | Prebuild + managed workflow |
| **JavaScript VM** | Hermes | (Expo default) | Fast JS execution, smaller bundles |
| **Reality Engine** | Unity | 6000.2.14f1 | AR rendering, VFX, physics |
| **AR Framework** | AR Foundation | 6.3.2 | Cross-platform AR (ARKit/ARCore) |
| **State Management** | Zustand | 5.0.9 | Lightweight state container |
| **Backend** | Firebase | 12.7.0 | Auth, Firestore, Storage, FCM |
| **Object Storage** | Cloudflare R2 | S3-compatible | Scene data, user uploads |
| **AI Services** | Google Gemini | 0.24.1 | Voice commands, chat |

---

## 2. Project Structure

```
portals_v4/
├── src/                          # React Native source
│   ├── screens/                  # 27 screen components
│   │   ├── AR/                   # ARViewerScreen, ViroTestScreen
│   │   ├── Composer/             # 3D scene editor
│   │   └── FigmentAR/            # Figment AR module (Redux-based)
│   ├── components/               # 13 shared components
│   │   └── UnityArView.tsx       # CRITICAL: Unity bridge wrapper
│   ├── services/                 # 15+ service modules
│   │   ├── scene/                # Scene persistence (Firestore + R2)
│   │   ├── cache/                # MediaCache for performance
│   │   └── messaging/            # Real-time messaging
│   ├── store/                    # Zustand store + Redux slices
│   ├── ar/                       # AR utilities (LOD, paint system)
│   ├── bridges/                  # NeedleBridge (WebView communication)
│   └── types/                    # TypeScript interfaces
│
├── unity/                        # Unity 6000.2.14f1 project
│   ├── Assets/
│   │   ├── Scripts/              # C# game logic
│   │   │   ├── BridgeTarget.cs   # CRITICAL: RN message handler
│   │   │   ├── ARDebugOverlay.cs # On-screen AR debugging
│   │   │   └── ARSessionLogger.cs# AR Foundation event logging
│   │   ├── Plugins/iOS/          # Native iOS bridge
│   │   │   ├── NativeCallProxy.h
│   │   │   └── NativeCallProxy.mm
│   │   ├── Scenes/               # Unity scenes
│   │   ├── Prefabs/              # Reusable objects
│   │   └── Resources/VFX/        # VFX assets (SimpleBrush.vfx)
│   ├── Packages/manifest.json    # Unity package dependencies (26 packages)
│   └── Editor/BuildScript.cs     # Headless build automation
│
├── ios/                          # Xcode workspace
│   ├── Portals.xcworkspace       # Main workspace
│   ├── Podfile                   # CocoaPods config (2858 pods)
│   └── Podfile.properties.json   # Build properties (ccache, newArch)
│
├── scripts/                      # Build & debug automation (19 scripts)
│   ├── build_minimal.sh          # Primary build script (~5 min)
│   ├── debug_build_verbose.sh    # Verbose build with checkpoints
│   ├── capture_device_logs.sh    # Device log capture
│   ├── monitor_unity_live.sh     # Color-coded live logs
│   ├── patch-fabric-registry.sh  # Fabric component registration fix
│   └── patch-rn-unity-message-queue.sh # Message queue fix
│
├── specs/                        # Architecture documentation (11 specs)
├── docs/                         # Development guides
├── plugins/                      # Expo config plugins (withUnity.js)
└── patches/                      # npm patch-package patches
```

---

## 3. Unity-React Native Bridge Architecture

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Native (OS Layer)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UnityTestScene.tsx                                       │   │
│  │    │                                                      │   │
│  │    ▼                                                      │   │
│  │  UnityArView.tsx (forwardRef wrapper)                     │   │
│  │    │  sendMessage(gameObject, method, payload)            │   │
│  │    ▼                                                      │   │
│  │  @artmajeur/react-native-unity                            │   │
│  │    │  Commands.postMessage() [Fabric Codegen]             │   │
│  └────┼──────────────────────────────────────────────────────┘   │
│       │                                                          │
├───────┼──────────────────────────────────────────────────────────┤
│       ▼  Native Bridge (Objective-C++)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RNUnityView.mm                                           │   │
│  │    │  postMessage: → UnityFramework sendMessage:          │   │
│  │    │                                                      │   │
│  │    │  onUnityMessage: ← _eventEmitter (Fabric events)     │   │
│  │    │  [_pendingMessages queue for early messages]         │   │
│  └────┼──────────────────────────────────────────────────────┘   │
│       │                                                          │
├───────┼──────────────────────────────────────────────────────────┤
│       ▼  Unity (Reality Engine)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BridgeTarget.cs                                          │   │
│  │    │  OnMessage(json) ← routes to handlers                │   │
│  │    │  HandleSpawnBrush(), HandlePing(), etc.              │   │
│  │    │                                                      │   │
│  │    │  SendToMobileApp(payload) → NativeCallProxy          │   │
│  │    ▼                                                      │   │
│  │  NativeCallProxy.mm                                       │   │
│  │    sendMessageToMobileApp() → RNUnityView callback        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Message Protocol

| Direction | Message Type | Payload Example | Purpose |
|-----------|-------------|-----------------|---------|
| Unity → RN | `unity_ready` | `{"type":"unity_ready","source":"unity"}` | Bridge established |
| RN → Unity | `ping` | `{"type":"ping","timestamp":123456}` | Connectivity test |
| Unity → RN | `pong` | `{"type":"pong","timestamp":123456}` | Ping response |
| RN → Unity | `spawnBrush` | `{"action":"spawnBrush","x":0,"y":0,"z":0}` | Spawn VFX |
| Unity → RN | `ack` | `{"type":"ack","note":"Spawned Brush_123"}` | Action confirmation |
| Unity → RN | `ar_state` | `{"type":"ar_state","state":"SessionTracking"}` | AR status |

### Critical Initialization Sequence

1. **T+0.0s**: `RuntimeInitializeOnLoadMethod(BeforeSplashScreen)` → VSync disabled
2. **T+0.3s**: Scene loads → BridgeTarget.Start() executes
3. **T+0.6s**: Unity sends `unity_ready` (Fabric _eventEmitter may be nil)
4. **T+1.6s**: Fabric wires up → `updateEventEmitter` flushes pending messages
5. **T+1.7s**: RN receives `unity_ready` → enables UI buttons

---

## 4. Key Dependencies

### React Native / Expo (58 direct packages)

| Category | Key Packages | Version |
|----------|--------------|---------|
| **Core** | react, react-native, expo | 19.1.0, 0.81.5, 54.0.30 |
| **Navigation** | @react-navigation/* | 7.x |
| **Unity Bridge** | @artmajeur/react-native-unity | 0.0.6 (forked) |
| **VR/AR** | @reactvision/react-viro | 2.43.6 |
| **State** | zustand, redux | 5.0.9, 5.0.1 |
| **Cloud** | firebase, @aws-sdk/* | 12.7.0, 3.955.0 |
| **Media** | expo-camera, expo-av, expo-video | Latest SDK 54 |
| **AI** | @google/generative-ai, @fal-ai/client | 0.24.1, 1.7.2 |

### Unity Packages (26 packages)

| Category | Packages | Version |
|----------|----------|---------|
| **AR/XR** | com.unity.xr.arfoundation, arkit, arcore | 6.3.2 |
| **Hand Tracking** | com.unity.xr.hands | 1.7.1 |
| **Rendering** | com.unity.render-pipelines.universal | 17.3.0 |
| **VFX** | com.unity.visualeffectgraph | 17.3.0 |
| **Networking** | com.unity.netcode.gameobjects | 2.7.0 |
| **MCP** | com.coplaydev.unity-mcp | Git (latest) |

### iOS Native Pods (2858 pods)

- React Native Fabric architecture pods
- Hermes JavaScript engine
- ViroReact + ViroKit (3D rendering)
- Firebase suite (Auth, Firestore, Storage, FCM)

---

## 5. Services Architecture

### React Native Services (`src/services/`)

| Service | File | Purpose |
|---------|------|---------|
| **Auth** | auth.ts | Firebase auth (register, login, logout) |
| **Feed** | feed.ts | Post interactions (like, comment, reply) |
| **Notifications** | notifications.ts | Real-time Firestore notifications |
| **Scene** | scene/SceneService.ts | Scene save/load (Firestore + R2) |
| **Storage** | storage/r2.ts | R2 uploads, presigned URLs |
| **Location** | LocationService.ts | GPS tracking (singleton) |
| **Fuel** | FuelService.ts | Rewards/currency system |
| **Voice** | voice.ts | Voice input/output |
| **AI Video** | aiVideoService.ts | AI video generation |

### State Management

```typescript
// Zustand store (src/store/index.ts)
useAppStore = create({
  // Session
  currentUser, isAuthenticated, login(), logout(),

  // Feed
  feed, toggleLike(), fetchFeed(), deletePost(),

  // Comments
  comments, addComment(), addReply(),

  // Notifications (real-time)
  notifications, setNotifications(), markAsRead(),

  // Social
  relationships, sendInvite(), followUser(),

  // Drafts & Scenes
  drafts, saveDraft(), loadDraft(), saveWorld(),

  // Voice
  isVoiceActive, voiceContext, setVoiceContext(),

  // Collaboration
  sendCollaborationInvite(), respondToCollabInvite(),
})
```

---

## 6. Log Locations & Debugging

### Device Log Files

| File | Location | Creator | Content |
|------|----------|---------|---------|
| `bridge_log.txt` | Documents/ | BridgeTarget.cs | RN-Unity messages |
| `bridge_early.log` | Documents/ | BridgeTarget.cs | Ultra-early init (VSync) |
| `ar_debug_log.txt` | Documents/ | ARDebugOverlay.cs | AR state, planes |
| `unity_init.log` | Documents/ | RNUnityView.mm | Fabric initialization |

### Debug Flags

| Flag | Location | Default | Purpose |
|------|----------|---------|---------|
| `DEBUG_ENABLED` | BridgeTarget.cs | `true` | Console logging |
| `FILE_LOGGING_ENABLED` | BridgeTarget.cs | `true` | File logging |
| `__DEV__` | React Native | `true` (dev) | RN debug mode |

### Log Capture Commands

```bash
# Live device logs (with timeout protection)
./scripts/capture_device_logs.sh 10 "Unity|Bridge|fps"

# Color-coded live monitor
./scripts/monitor_unity_live.sh

# Verbose build with checkpoints
./scripts/debug_build_verbose.sh
```

---

## 7. Known Issues & Fixes

### Critical Issues (Build-Breaking)

| Issue | Symptom | Root Cause | Fix |
|-------|---------|-----------|-----|
| **Fabric Registration** | Unity shows but never initializes | RNUnityView not in Fabric registry | `./scripts/patch-fabric-registry.sh` |
| **Message Queue** | `unity_ready` never received | eventEmitter nil at startup | `./scripts/patch-rn-unity-message-queue.sh` |
| **15 FPS Playback** | Unity runs at 60/4 = 15 FPS | VSync=1 conflicts with RN | BridgeTarget sets vSync=0 at startup |
| **Scene Caching** | Wrong scene loads on device | Unity Append mode cache | Always use Replace mode in BuildScript.cs |
| **Duplicate Symbols** | Xcode 15+ linker errors | IL2CPP symbol conflicts | `-Wl,-ld_classic` flag |

### Build Issues

| Error | Fix |
|-------|-----|
| `_mh_dylib_header undefined` | Use `-configuration Release` (not Debug) |
| `scripts are compiling` | Wait for Unity compilation, retry |
| `URP GlobalSettings not at version` | Delete `Assets/UniversalRenderPipelineGlobalSettings.asset` |
| `XR Simulation asset move failed` | Delete `Assets/XR/Temp/` folder |

### Runtime Issues

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| White Unity screen | Check bridge_log.txt for init | Verify BridgeTarget in scene |
| Buttons stay disabled | Check unity_init.log for `unity_ready` | Run patch scripts, rebuild |
| AR not tracking | Check ar_debug_log.txt | Verify ARSession in scene |

---

## 8. Build System

### Primary Scripts

| Script | Purpose | Time |
|--------|---------|------|
| `build_minimal.sh` | Full build + deploy | ~5 min |
| `build_and_run_ios.sh --skip-unity-export` | RN-only rebuild | ~3 min |
| `debug_build_verbose.sh` | Verbose build + logs | ~7 min |

### Build Optimization

| Optimization | Status | Benefit |
|--------------|--------|---------|
| Unity Replace mode | Enabled | Reliable scene updates |
| Xcode DerivedData | Automatic | Cached compilation |
| ccache | Enabled (limited) | Minimal (RN prebuilt) |
| Build lock | Enabled | Prevents concurrent builds |

### Environment Variables

```bash
UNITY_CLEAN_BUILD=1     # Force clean Unity export
SKIP_UNITY_EXPORT=1     # Skip Unity (use existing)
BUILD_ONLY=1            # Build without install
USE_CCACHE=0            # Disable ccache
```

---

## 9. Component Inventory

### Screen Components (27)

| Category | Screens |
|----------|---------|
| **Auth** | LoginScreen, RegisterScreen, OnboardingScreen |
| **Feed** | FeedScreen, PostFeedScreen, PostDetailsScreen |
| **Profile** | ProfileScreen, ProfileSettingsScreen, ProfileGalleryScreen |
| **Social** | PeopleScreen, SearchScreen, ActivityScreen, ChatScreen |
| **AR** | ARViewerScreen, ViroTestScreen, ARNavigationScreen |
| **Creation** | ComposerEditorScreen, ComposerPublishScreen, CreateCaptureScreen |
| **Utility** | MapScreen, ShopScreen, LocationPickerScreen, TagPeopleScreen |
| **Testing** | UnityTestScene |

### Shared Components (13)

| Component | Purpose |
|-----------|---------|
| **UnityArView** | Unity bridge wrapper (CRITICAL) |
| **FeedItem** | Post renderer |
| **CommentsSheet** | Comments bottom sheet |
| **VoiceOverlay** | Voice assistant UI |
| **DebugOverlay** | In-app debug console |
| **NavigationHUD** | AR navigation HUD |
| **ErrorBoundary** | React error boundary |

---

## 10. Performance Targets

| Platform | Target FPS | Current Status |
|----------|-----------|----------------|
| iPhone 12+ | 60 FPS | VSync fix applied |
| iPad Pro | 60 FPS | VSync fix applied |
| Quest 2/3 | 90 FPS | Not yet verified |

### Memory Considerations

- Unity AR scene: ~150MB active memory
- React Native base: ~50MB
- Scene assets: Variable (Addressables planned)

---

## 11. Future Architecture (Planned)

### Addressables OTA Updates (`specs/addressables-strategy.md`)
- System content via Addressables bundles
- User content via TriLib 2 runtime loader
- CDN delivery via Cloudflare R2

### Multiplayer (`specs/normcore-integration.md`)
- Normcore SDK for voice chat
- Collaborative drawing with RealtimeArray
- Avatar synchronization

### AI Hologram Pipeline
- Audio → LLM → Phonemes → uLipSync
- VFX directives from AI responses

---

*Last Updated: 2026-01-10*
