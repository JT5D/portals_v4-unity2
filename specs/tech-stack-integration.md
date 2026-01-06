# 🧭 Tech Stack Integration Matrix
> **Status:** Active Strategy
> **Parent Strategy:** [STRATEGY.md](../STRATEGY.md)
> **Reference For:** Developers, Architects

This document defines the rules of engagement for our mixed-technology stack. It explicitly addresses how these powerful but potentially conflicting technologies coexist within `portals_v4`.

---

## 🏗️ The "Strangler Fig" Migration Architecture

We are transitioning from ViroReact to Unity, while adding Needle Engine for web features. This requires a strict separation of concerns.

### 🔴 ViroReact (Legacy AR)
*   **Role**: Serves existing "Simple AR" screens (e.g., legacy Profile portal).
*   **Rule**: **NEVER active on the same screen as Unity.**
*   **Lifespan**: To be completely removed by Q3 2026.
*   **Conflict Risk**: High. Viro requires its own `GLSurfaceView` and Android Activity lifecycle hooks.
*   **Mitigation**:
    *   Viro screens must be unmounted (`navigation.replace`) before navigating to a Unity route.
    *   Do not nest Viro components inside Unity views or vice versa.

### 🟢 Unity AR Foundation (Future AR)
*   **Role**: The primary engine for "Figment" (Creation Suite), Geospatial Maps, and High-Fidelity AR.
*   **Library**: `@azesmway/react-native-unity`.
*   **Integration**:
    *   Runs as a Full-Screen Native Component.
    *   Owns the Camera and Sensors when active.
*   **Data Flow**:
    *   **In**: `App -> postMessage -> UnityMessageManager` (JSON Actions).
    *   **Out**: `Unity -> onMessage -> App` (Events like "Object Placed").

### 🟣 Needle Engine (Web Integration)
*   **Role**: "Portal Meetings" (Screensharing) and Web-based viewing of Portals.
*   **Technology**: Three.js wrapped in Needle's optimize runtime (WebXR).
*   **Host**: `react-native-webview` (Mobile) or Browser (Desktop).
*   **Why not React Three Fiber (R3F)?**
    *   Needle provides a **Unity-to-Web** workflow. We can design a room in Unity and export it to the Web. R3F requires rebuilding the scene in JSX.
    *   Needle handles efficient glTF loading (Draco/KTX2) and Networking (WebRTC) out of the box.
*   **Conflict Risk**: Low (Sandboxed in WebView).

---

## ⚔️ Coexistence Guidelines

| Interaction | Risk | Rule |
| :--- | :--- | :--- |
| **Viro <-> Unity** | 🚨 **CRITICAL** | **Exclusive Access Only**. Never run both engines simultaneously. On Android, this will crash the Activity due to conflicting GL context ownership. |
| **Unity <-> Needle** | ✅ Safe | Needle runs in a WebView, which is a separate OS process/surface. They can run simultaneously (e.g., Unity AR view with a floating PIP WebView). |
| **RN <-> Unity** | ⚠️ Moderate | Unity pauses when the app is backgrounded. State must be re-synced on `onResume`. |
| **Figment <-> Unity** | ℹ️ Info | "Figment" is our *feature name*, not a library. Figment's Redux state will drive the Unity Scene via the JSON Bridge. |

---

## 🛠️ Dependency Specifics

### `react-three-fiber` vs. Needle Engine
*   **Use R3F** if: Building a simple 3D UI element (like a rotating cube icon) inside the React Native app.
*   **Use Needle** if: Building a shared, multi-user 3D environment or porting assets from the main Unity project to the Web.

### `ARFoundation` vs. Viro Components
*   **Viro**: `ViroARScene` (Deprecated).
*   **Unity**: `ARSessionOrigin` + `ARCamera`.
*   **Migration**: We do not "convert" Viro code. We **rewrite** the logic in C# for Unity, using the `specs/unity-integration.md` bridge pattern.

### `glTF-Transform` vs. `gltf-pipeline`
*   **Standard**: We strictly use `glTF-Transform` for our Cloud Asset Pipeline because it works in **Serverless/Edge** environments (Cloudflare Workers) where Node.js `fs` is unavailable.

