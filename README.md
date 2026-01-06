# Portals

**Portals** is a social AI + AR platform for creation of immersive AI-driven augented reality experiences. It is like TikTok for AI + spatial content creation. Users can collaborate, discover, create, and share location based AI+AR content -- earning FUEL rewards via engagement, connecting with communities & monetizing their creations.

![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-black?logo=expo)
![Firebase](https://img.shields.io/badge/Firebase-12-orange?logo=firebase)
![ViroReact](https://img.shields.io/badge/ViroReact-2.50-purple)

---

## 📱 Overview

Portals merges social media with augmented reality, allowing users to:

- **Explore** AR experiences pinned to real-world locations
- **Create** immersive 3D scenes with an intuitive editor
- **Share** video recordings &  explorable AI + AR experiences
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

---

## 🏗️ Architecture

### Tech Stack

| Layer               | Technology                       |
| ------------------- | -------------------------------- |
| **Framework** | React Native 0.81 + Expo 54      |
| **AR Engine** | ViroReact 2.50                   |
| **State**     | Zustand                          |
| **Auth**      | Firebase Authentication          |
| **Database**  | Firebase Firestore               |
| **Storage**   | Cloudflare R2 (S3-compatible)    |
| **Maps**      | react-native-maps (Google/Apple) |
| **Video**     | expo-video                       |

### Directory Structure

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
```

---

## 🎯 Core Features

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

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+ (iOS)
- Android Studio (Android)
- Expo CLI

### Installation

```bash
# Clone repository
git clone https://github.com/ryanjbrant/portals_v4.git
cd portals_v4

# Switch to dev branch (CRITICAL)
git checkout dev

# Automated Setup (Recommended)
npm run setup

# Alternative: Manual Installation
npm install
cd ios && pod install && cd ..

# Start development server
npx expo start --dev-client --tunnel
```

### Running on Device

```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android --device
```

---

## 🔐 Environment Configuration

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

## 📊 Database Schema

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

## 🎨 Design System

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

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 📦 Build & Deployment

### Development Build

```bash
# Create dev client
npx expo run:ios --device
```

### Production Build

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

---

## 🔧 Key Services

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

## 📄 License

Copyright © 2024 Portals. All rights reserved.

---

## 🌳 Branching Strategy

To maintain stability, we use a simple branching model:

1. **`main`**: Production-ready code. Only merged from `dev` after testing.
2. **`dev`**: The primary integration branch. **All developers should push their code here.**
3. **Feature branches**: Created from `dev` for individual tasks (e.g., `feature/amazing-ar`).

### Workflow for Contributors:

1. Fork the repository.
2. Create your feature branch from the **`dev`** branch:
   ```bash
   git checkout dev
   git checkout -b feature/amazing-feature
   ```
3. Commit and push to your fork.
4. Open a Pull Request targeting the **`dev`** branch of the main repository.

---

---

---

## Next Steps

### Documentation & Strategy

We follow a **Spec-Driven Development** methodology. All major architectural decisions and feature plans are documented here:

* **[🎯 Strategy &amp; Roadmap](STRATEGY.md)** (Start Here)
  * [Tech Stack Integration Matrix](specs/tech-stack-integration.md)
  * [Unity Integration Spec](specs/unity-integration.md)
  * [Needle Engine Spec](specs/needle-integration.md)
  * [Cloud Asset Pipeline Spec](specs/asset-pipeline.md)

---

## 📞 Support

- **Documentation:** [docs.portals.app](https://docs.portals.app)
- **Discord:** [discord.gg/portals](https://discord.gg/portals)
- **Email:** support@portals.app
