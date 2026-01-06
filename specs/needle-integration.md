# 📝 Spec: Needle Engine Screensharing
> **Status:** Draft
> **Parent Strategy:** [STRATEGY.md](../STRATEGY.md)
> **Owner:** @antigravity

## 1. Problem
We lack a way for mobile AR users and desktop web users to collaborate in real-time in a shared 3D space.

## 2. Proposed Solution
Integrate **Needle Engine** (WebXR) via a hybrid WebView. This enables "Portal Meetings" where users can share screens or 3D interactions via a simple URL, with no app install required for guests.

## 3. Technical Architecture
### A. The Web Client (Needle)
- **Host**: Deployed to Vercel/Cloudflare Pages.
- **Engine**: Needle Engine (Three.js) + WebRTC Networking.
- **Features**: `ScreenCapture` component for streaming, `VideoPlayer` for rendering on curved 3D surfaces.

### B. The Native Host (React Native)
- **Component**: `NeedlePortal` wrappring `react-native-webview`.
- **Bridge**: Syncs local AR camera position to the WebVR scene via `postMessage`.
- **Stream**: Injects local camera/screen frames into the WebView (if native WebRTC support is limited).

## 4. Implementation Steps
- [ ] **Sample Port**: Copy `_ref/Needle Engine Samples 2021.3/Screensharing` logic to a new Needle project.
- [ ] **Deploy**: setup deployment pipeline to `portals-web.vercel.app`.
- [ ] **Component**: Create `src/components/NeedlePortal.tsx`.
- [ ] **Sync**: Implement coordinate sync (Unity Vector3 <-> Three.js Vector3).
