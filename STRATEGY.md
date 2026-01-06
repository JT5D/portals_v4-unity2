# 🗺️ Strategic Implementation Spec
> **Status:** Active Strategy
> **Driver:** @antigravity
> **Approver:** @james
> **Methodology:** [Spec-Driven Development (Spec Kit)](https://github.com/github/spec-kit)

## 1. Context & Problem Space
The `portals_v4` project aims to build a "Gold Standard" AR social platform. However, the current codebase faces architectural fragmentation and feature gaps that hinder scalability and user experience.

### The Problem
1.  **Engine Fragmentation:** AR features are split between legacy ViroReact (maintenance mode) and future-state Unity (powerful but complex integration).
2.  **Asset Bottleneck:** Users cannot upload their own 3D content (FBX/OBJ) or animations; the app is limited to hardcoded assets.
3.  **Collaboration Gap:** There is no shared, cross-platform (Web + Mobile) 3D space for real-time collaboration.
4.  **Fragile Builds:** The build process is undocumented and flaky, causing high integration friction.

### The Vision
A unified, automated, and powerful AR platform where users can **upload any asset**, **visualize it in AR**, and **collaborate in real-time** across iOS, Android, and Web, powered by the best engine for the task (Unity for high-fidelity AR, Needle for Web/Collaboration).

---

## 2. Appetite (Scope & Constraints)
*   **Timeframe:** ongoing strategic roadmap (Q1-Q2 2026).
*   **Budget:** Willing to invest in specific paid tools (`TriLib 2`, Cloudflare R2) to solve hard problems ("buy vs build").
*   **Quality Bar:** "State of the Art" (SOTA). Solutions must match industry leaders (like Sketchfab) in performance and UX.
*   **Anti-Goal:** Do NOT rebuild the entire app in Unity immediately. We must maintain the React Native shell and migrate features incrementally.
*   **XR Strategy (VisionOS/Quest):** For immersive headsets, we will NOT wrap React Native. We will deploy **Pure Unity** builds sharing the same C# logic.
*   **Legacy EOL:** `ViroReact` is strictly maintenance-only and will be removed by **Q3 2026**.

---

## 3. The Solution Strategy

### 🟢 Initiative A: Unity Migration (The core engine)
*   **Strategy**: "Strangler Fig" pattern. We will keep ViroReact for existing simple screens but build ALL new complex AR features (Geospatial, complex VFX, Shared AR) in Unity.
*   **Integration Architecture**:
    *   **Embed**: Unity as a Full Screen library inside React Native.
    *   **Bridge**: JSON-based message bus for bi-directional communication (RN UI <-> Unity Logic).
    *   **State**: Global state (Redux/Zustand) lives in RN; Unity is a "renderer" of that state.

### 🟣 Initiative B: Needle Engine (Spatial Collaboration)
*   **Strategy**: Hyrid WebView. Use Needle Engine (WebXR) for "lightweight" collaboration features like easy URL-based sharing and "Meeting Rooms."
*   **Integration**:
    *   Host Needle app on Vercel/Cloudflare.
    *   Embed in RN via `react-native-webview`.
    *   Sync coordinates via `postMessage` bridge.
*   **Use Case**: "Portal Meetings" – a user sends a link, and anyone (desktop/mobile) joins a 3D room.

### 📦 Initiative C: SOTA 3D Asset Pipeline (Upload & Process)
*   **Strategy**: "Cloud-First Optimization." Never trust the client device to convert assets.
*   **Flow**:
    1.  **Ingest**: User uploads raw (FBX, OBJ, BLEND) to Cloudflare R2 (`/raw`).
    2.  **Process (Cloud)**:
        *   Standardize to **glTF 2.0**.
        *   Apply **Draco Compression** (Geometry).
        *   Convert textures to **KTX2** (GPU Optimized).
        *   **AI Rigging**: Auto-rig static meshes (e.g., via Tripo/DeepMotion).
    3.  **Deliver**:
        *   **Unity**: Load optimized GLB via `UnityGLTF`.
        *   **Unity (Preview)**: Load raw FBX via `TriLib 2` (local only).
        *   **Web/Needle**: Stream via `gltf-progressive`.

---

## 4. Rabbit Holes (Risks & Unknowns)
*   **Complexity of Unity as a Library**: Managing the lifecycle (suspend/resume) of the Unity engine inside a React Native view is notoriously difficult on Android. *Mitigation: Strict testing on physical Android devices early.*
*   **Asset Conversion Costs**: Cloud conversion workers (e.g., AWS Lambda) can get expensive if users upload massive uncached files. *Mitigation: Strict file size limits and aggressive caching on R2.*
*   **AI Rigging Quality**: Auto-rigging services may produce "homunculus" results on non-standard meshes. *Mitigation: Mark this feature as "Beta/Experimental" in UI.*

---

## 5. No-Gos (Out of Scope)
*   **No "In-App Modeling"**: We are not building a 3D modeling tool (like Blender) on the phone. Users view/place assets, they don't edit geometry.
*   **No Custom Physics Engine**: We rely strictly on Unity's PhysX or Needle's Rapier. We do not write custom physics solvers.

---

## 6. Implementation Plan (Specs)
*   [ ] **Spec 0**: [Tech Stack Integration Matrix (The Constitution)](./specs/tech-stack-integration.md)
*   [ ] **Spec 1**: [Setup Unity Integration & Bridge](./specs/unity-integration.md)
*   [ ] **Spec 2**: [Needle Engine Screensharing](./specs/needle-integration.md)
*   [ ] **Spec 3**: [Cloud Asset Pipeline (Worker)](./specs/asset-pipeline.md)
