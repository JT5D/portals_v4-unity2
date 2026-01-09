# Portals

**Portals** is a social AI + AR platform for creation of immersive AI-driven augented reality experiences. It is like TikTok for AI + spatial content creation. Users can collaborate, discover, create, and share location based AI+AR content -- earning FUEL rewards via engagement, connecting with communities & monetizing their creations.

![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-black?logo=expo)
![Unity](https://img.shields.io/badge/Unity-6000.2-white?logo=unity)
![Firebase](https://img.shields.io/badge/Firebase-12-orange?logo=firebase)
![ViroReact](https://img.shields.io/badge/ViroReact-2.43.6-purple)

---

## Quick Start - Build & Run on iPhone (React-Unity Branch)

```bash
# One command to build and launch on connected iPhone/iPad
./scripts/build_minimal.sh
```

This script performs: fail-fast checks → Unity export → UnityFramework build → pod install → app build/install → **auto-launch on device**

**Requirements**: iPhone/iPad connected via USB, device unlocked, Xcode 16.4 installed

> For detailed build troubleshooting and known issues, see [CRITICAL_README.md](CRITICAL_README.md)

---

## Branching Strategy

| Branch | Purpose | Build Command |
|--------|---------|---------------|
| **`react-unity`** | Active development with Unity integration | `./scripts/build_minimal.sh` |
| **`dev`** | Primary development for React-only features | `npx expo run:ios --device` |
| **`main`** | Stable, tested releases only | - |

### Workflow for Contributors:

1. Fork the repository
2. Create your feature branch from the appropriate base:
   ```bash
   # For Unity integration work:
   git checkout react-unity
   git checkout -b feature/unity-feature

   # For React-only work:
   git checkout dev
   git checkout -b feature/react-feature
   ```
3. Commit and push to your fork
4. Open a Pull Request targeting the appropriate branch

---

## Overview

Portals merges AI tools, social media & augmented reality, allowing users to:

- **Explore** AI+AR experiences pinned to real-world locations
- **Create** immersive 3D scenes with an intuitive editor
- **Share** video recordings & explorable AI + AR experiences
- **Collect** rare "Artifacts" by physically visiting locations
- **Earn** FUEL tokens through movement and engagement
- **Monetize** AI + AR creations by minting & dropping content

```
┌─────────────────────────────────────────────────────────────┐
│                        PORTALS APP                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Feed   │  │   Map   │  │ Create  │  │ Profile │        │
│  │ (Video) │  │ (AR)    │  │ (Editor)│  │ (Social)│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
│              ┌──────────┴──────────┐                        │
│              │   Firebase + R2     │                        │
│              │   (Auth, DB, CDN)   │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

# React-Unity Integration

The `react-unity` branch integrates Unity as a Library (UAAL) for advanced AR/XR experiences.

## Unity Architecture

| Component | Description |
|-----------|-------------|
| **UnityFramework** | iOS framework (~308MB) built from Unity project |
| **BridgeTarget** | C# script handling RN ↔ Unity messaging |
| **NativeCallProxy** | Native iOS bridge for Unity → RN communication |

### Unity Build Flow

```bash
# Automated (recommended)
./scripts/build_minimal.sh

# Manual steps:
# 1. Unity exports to /tmp/unity-ios-export/
# 2. xcodebuild creates UnityFramework.framework
# 3. Framework copied to unity/builds/ios/
# 4. pod install links framework to RN app
# 5. App built and installed on device
```

### Unity-React Native Messaging

**RN → Unity:**
```typescript
unityRef.current?.sendMessage('BridgeTarget', 'OnMessage', jsonPayload);
```

**Unity → RN:**
```csharp
[DllImport("__Internal")]
public static extern void sendMessageToMobileApp(string message);
```

### Key Unity Files

| File | Purpose |
|------|---------|
| `unity/Assets/Scripts/BridgeTarget.cs` | Message handler + ready ping |
| `unity/Assets/Plugins/iOS/NativeCallProxy.h/mm` | Native bridge |
| `unity/Assets/Editor/BuildScript.cs` | Headless build methods |
| `unity/Assets/Editor/IOSBuildPostProcessor.cs` | Post-export fixups |

---

# Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React Native 0.81 + Expo 54 |
| **AR Engine** | Unity 6000.2 (UAAL) + ViroReact 2.43.6 (legacy) |
| **State** | Zustand |
| **Auth** | Firebase Authentication |
| **Database** | Firebase Firestore |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Maps** | react-native-maps (Google/Apple) |
| **Video** | expo-video |

## Directory Structure

```
src/
├── screens/           # All app screens
│   ├── FeedScreen.tsx           # Main video feed with categories
│   ├── MapScreen.tsx            # AR discovery map
│   ├── ProfileScreen.tsx        # User profiles
│   ├── FigmentAR/               # AR scene editor (91 files)
│   │   ├── app.js               # Main Figment editor
│   │   ├── component/           # Editor UI panels
│   │   └── model/               # 3D model definitions
│   ├── Composer/                # Publishing flow
│   └── AR/                      # AR viewer screens
│
├── components/        # Reusable UI components
│   ├── FeedItem.tsx             # Single video post
│   ├── CommentsSheet.tsx        # Comments bottom sheet
│   ├── AnimatedBackground.tsx   # Premium gradients
│   └── VoiceOverlay.tsx         # Voice AI interface
│
├── services/          # Business logic & API
│   ├── auth.ts                  # Firebase authentication
│   ├── LocationService.ts       # GPS tracking
│   ├── FuelService.ts           # FUEL rewards engine
│   ├── notifications.ts         # Push notifications
│   ├── voice.ts                 # Voice AI commands
│   ├── storage/                 # R2 file uploads
│   └── scene/                   # Scene persistence
│
├── store/             # Zustand state management
│   └── index.ts                 # Global app state
│
├── navigation/        # React Navigation
│   ├── RootNavigator.tsx        # Auth flow + main nav
│   └── BottomTabNavigator.tsx   # Tab bar
│
└── theme/             # Design system
    └── theme.ts                 # Colors, typography

unity/                 # Unity project (react-unity branch)
├── Assets/
│   ├── Scenes/UnityTestScene.unity  # Main test scene
│   ├── Scripts/BridgeTarget.cs      # RN messaging bridge
│   ├── Plugins/iOS/                 # Native iOS bridge
│   └── Editor/                      # Build automation
└── builds/ios/
    └── UnityFramework.framework     # Built framework (~308MB)
```

---

## Core Features

### 1. Video Feed

TikTok-style vertical scrolling feed with category tabs:

- **Live** - Real-time streams
- **Feed** - All posts
- **Friends** - Posts from followed users
- **Artifacts** - Premium AR collectibles
- **Exclusive** - Limited edition content

**Key Files:** `FeedScreen.tsx`, `FeedItem.tsx`, `PostFeedScreen.tsx`

### 2. AR Map Discovery

Interactive map showing AR content nearby:

- Dark monochromatic styling
- Real walking directions (OSRM integration)
- Diamond markers for Artifacts
- FUEL earnings based on distance traveled

**Key Files:** `MapScreen.tsx`, `LocationService.ts`, `FuelService.ts`

### 3. Figment AR Editor

Full-featured 3D scene editor:

- **Object Library** - Primitives, animated models, user uploads
- **Transform Tools** - Move, rotate, scale with precision snapping
- **Materials** - PBR textures, colors, transparency
- **Effects** - Particles, post-processing
- **360° Backgrounds** - Skyboxes and 360 videos
- **AR Paint** - Draw in 3D space
- **AI Integration** - Voice commands, generative video

**Key Files:** `FigmentAR/app.js`, `ModelLibraryPanel.js`, `ObjectPropertiesPanel.js`

### 4. Social Features

- **Profiles** with followers/following
- **Direct Messaging** with real-time chat
- **Comments** with nested replies
- **Likes** and shares
- **Activity Feed** with notifications

**Key Files:** `ProfileScreen.tsx`, `ChatScreen.tsx`, `ActivityScreen.tsx`

### 5. FUEL Rewards System

Gamified engagement through:

- **Movement Rewards** - Earn FUEL by walking
- **Discovery Rewards** - Find new AR content
- **Creation Rewards** - Publish scenes
- **Artifact Collection** - Visit physical locations

**Key Files:** `FuelService.ts`, `store/index.ts`

---

## Environment Configuration

### Firebase Setup

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email, Google)
3. Create Firestore database
4. Download `GoogleService-Info.plist` (iOS) and `google-services.json` (Android)
5. Update `src/config/firebase.ts`

### Cloudflare R2 Setup

1. Create R2 bucket in Cloudflare dashboard
2. Create API token with R2 permissions
3. Configure public access for bucket
4. Update R2 credentials in upload service

---

## Database Schema

### Firestore Collections

```
users/{userId}
├── username, email, avatar, bio
├── following/{followedUserId}
├── followers/{followerUserId}
├── uploads/{uploadId}           # User's media library
└── artifacts/{artifactId}       # Collected artifacts

posts/{postId}
├── userId, caption, mediaUri, coverImage
├── sceneId, sceneData
├── locations[], tags[]
├── isArtifact, likes, comments, shares
└── comments/{commentId}

drafts/{draftId}
├── userId, title, sceneData
└── previewPath, createdAt

scenes/{sceneId}
├── objects[], background
└── metadata
```

---

## Design System

### Colors

```typescript
colors: {
  background: '#000000',      // Pure black
  surface: '#1A1A1A',         // Card backgrounds
  primary: '#00D9FF',         // Cyan accent
  secondary: '#FFD700',       // Gold (Artifacts)
  success: '#2ECC71',         // Green
  warning: '#F39C12',         // Orange (FUEL)
  error: '#E74C3C',           // Red
  text: '#FFFFFF',            // White
  textDim: 'rgba(255,255,255,0.6)'
}
```

### Typography

- **Headers:** System Bold, 24-32px
- **Body:** System Regular, 14-16px
- **Captions:** System Regular, 12px

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Build & Deployment

### React-Unity Branch (iOS)

```bash
# Full build with Unity export + device launch
./scripts/build_minimal.sh

# Skip Unity export (use existing framework)
./scripts/build_and_run_ios.sh --skip-unity-export

# Unity Editor fast loop (keep editor open)
npm run ios:editor
```

### Production Build

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

---

## Key Services

### LocationService

High-precision GPS tracking with:

- 1-second update interval
- 1-meter distance filter
- Heading/compass support
- Background tracking

### FuelService

FUEL token accumulation:

- Distance-based rewards
- Claim mechanics
- Balance tracking

### VoiceService

AI voice commands via Gemini:

- Natural language scene editing
- Navigation commands
- Content discovery

---

## Documentation & Strategy

We follow a **Spec-Driven Development** methodology. All major architectural decisions and feature plans are documented here:

* **[Strategy & Roadmap](STRATEGY.md)** (Start Here)
  * [Tech Stack Integration Matrix](specs/tech-stack-integration.md)
  * [Unity Integration Spec](specs/unity-integration.md)
  * [Needle Engine Spec](specs/needle-integration.md)
  * [Cloud Asset Pipeline Spec](specs/asset-pipeline.md)

---

# Legacy: React-Only Development

> **Note**: These commands apply to the **react-only workflow** (`dev`/`main` branches without Unity integration). For the `react-unity` branch, use `./scripts/build_minimal.sh` instead.

## Key Differences: react-unity vs Legacy (dev/main)

### Build & Configuration

| Setting | dev/main (Legacy) | react-unity |
|---------|-------------------|-------------|
| Config file | `app.json` | `app.config.js` |
| Bundle ID | `com.portals.app` | `com.h3mai.portals` |
| Build command | `npx expo run:ios --device` | `./scripts/build_minimal.sh` |
| Build configuration | Debug (hot reload) | Release (embedded bundle) |
| AR Engine | ViroReact 2.43.6 | Unity 6000.2 UAAL + ViroReact |

### Performance Metrics

| Metric | ViroReact (Legacy) | Unity UAAL |
|--------|-------------------|------------|
| Target FPS (iPhone 12+) | 30-60 FPS | 60 FPS stable |
| Target FPS (iPad Pro) | 60 FPS | 60-120 FPS (ProMotion) |
| Target FPS (Quest 2/3) | N/A | 72-90 FPS |
| iOS App Size | ~150 MB | ~450 MB (+UnityFramework) |
| Build Time (clean) | ~5 min | ~15-20 min |
| Build Time (incremental) | ~2 min | ~5-7 min |

### Graphics & VFX Capabilities

| Feature | ViroReact (Legacy) | Unity UAAL |
|---------|-------------------|------------|
| Hi-Fidelity Graphics | Basic PBR | URP/HDRP, Real-time GI |
| VFX Graph (GPU Particles) | ❌ | ✅ Advanced particle systems |
| Shader Graph | ❌ | ✅ Visual shader authoring |
| Post-Processing | Limited | ✅ Full stack (Bloom, DoF, etc.) |
| Real-time Shadows | Basic | ✅ Cascaded shadow maps |
| Reflection Probes | ❌ | ✅ |
| Occlusion Culling | ❌ | ✅ |

### Physics & Simulation

| Feature | ViroReact (Legacy) | Unity UAAL |
|---------|-------------------|------------|
| Physics Engine | Basic collision | ✅ PhysX / Unity Physics |
| Rigidbody Dynamics | Limited | ✅ Full simulation |
| Cloth Simulation | ❌ | ✅ |
| Particle Collisions | ❌ | ✅ |
| Joints & Constraints | ❌ | ✅ |
| Ragdoll Physics | ❌ | ✅ |

### Tracking & Computer Vision

| Feature | ViroReact (Legacy) | Unity UAAL |
|---------|-------------------|------------|
| Plane Detection | ✅ ARKit/ARCore | ✅ AR Foundation 6.x |
| Image Tracking | ✅ | ✅ |
| Object Tracking | ❌ | ✅ |
| Hand Tracking | ❌ | ✅ (Quest, Vision Pro) |
| Hand Pose Recognition | ❌ | ✅ XR Hands |
| Body Tracking | ❌ | ✅ ARKit Body Tracking |
| Face Tracking | ❌ | ✅ ARKit Face |
| Facial Expression | ❌ | ✅ 52 blend shapes |
| Eye Tracking | ❌ | ✅ (Vision Pro, Quest Pro) |
| Semantic Segmentation | ❌ | ✅ People occlusion |
| Object Classification | ❌ | ✅ Barracuda/Sentis ML |
| Mesh Classification | ❌ | ✅ AR Foundation |
| LiDAR Meshing | Basic | ✅ Real-time mesh |

### Generative AI Features

| Feature | ViroReact (Legacy) | Unity UAAL |
|---------|-------------------|------------|
| Voice UX | ✅ Gemini | ✅ Gemini + Native |
| Speech-to-Text | ✅ | ✅ |
| Text-to-3D | ❌ | ✅ (via Meshy/Tripo API) |
| Speech-to-3D | ❌ | ✅ Voice → 3D pipeline |
| Speech-to-World | ❌ | ✅ Voice scene generation |
| Speech-to-Avatar | ❌ | ✅ (Ready Player Me + LipSync) |
| AI NPCs | ❌ | ✅ Behavior trees + LLM |

### Platform Support

| Platform | ViroReact (Legacy) | Unity UAAL |
|----------|-------------------|------------|
| iPhone/iPad | ✅ | ✅ |
| Android | ✅ | ✅ |
| Meta Quest 2/3 | ❌ | ✅ Native build |
| Apple Vision Pro | ❌ | ✅ visionOS |
| WebXR/WebGL | ❌ | 🔶 Planned (Needle Engine) |

### Multiplayer & Networking

| Feature | ViroReact (Legacy) | Unity UAAL |
|---------|-------------------|------------|
| Live Multiplayer | Firebase only | ✅ Netcode for GameObjects |
| Real-time Sync | Firestore polling | ✅ State sync, RPCs |
| Voice Chat | ❌ | ✅ (Photon Voice / Vivox) |
| Shared AR Anchors | ❌ | ✅ Cloud Anchors |
| Spectator Mode | ❌ | ✅ |

## Prerequisites

- Node.js 18+
- Xcode 16.4 (macOS 15). Download: https://developer.apple.com/download/all/?q=Xcode%2016.4
- Android Studio (Android)
- Expo CLI

## Installation (React-Only)

```bash
# Clone repository
git clone https://github.com/ryanjbrant/portals_v4.git
cd portals_v4

# Switch to dev branch
git checkout dev

# Automated Setup (Recommended)
npm run setup

# Alternative: Manual Installation
npm install
cd ios && pod install && cd ..

# Start development server
npx expo start --dev-client --tunnel
```

## Running on Device (React-Only)

```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android --device
```

## Development Build (React-Only)

```bash
# Create dev client
npx expo run:ios --device
```

---

## License

Copyright © 2024 Portals. All rights reserved.

---

## Support

- **Documentation:** [docs.portals.app](https://docs.portals.app)
- **Discord:** [discord.gg/portals](https://discord.gg/portals)
- **Email:** support@portals.app
