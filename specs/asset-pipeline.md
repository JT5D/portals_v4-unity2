# 📝 Spec: Hybrid Asset & Content Pipeline
**Owner:** @antigravity
**Status:** Active Strategy
**Parent:** [PORTALS_V4_DEEP_STRATEGY.md](./PORTALS_V4_DEEP_STRATEGY.md)

## 1. The Two-Lane Content Highway
We differentiate between "System Content" (shipped by us) and "User Content" (uploaded by users).

### Lane A: System Content ("The Shell Strategy")
*   **Definition**: Professional AR assets (Portals, Brushes, VFX Packs) created by H3M.
*   **Mechanism**: **Unity Addressables**.
*   **Workflow**:
    1.  Artist authors asset in Unity Editor.
    2.  Asset is flagged as `Addressable` in the "Remote" group.
    3.  CI Pipeline builds the Content Catalog (`.json`, `.hash`, `.bundle`).
    4.  Files are uploaded to AWS S3 / Cloudflare R2.
    5.  **Runtime**: React Native triggers `Addressables.UpdateCatalogs()`. Unity downloads the delta.

### Lane B: User Content ("The Runtime Loader")
*   **Definition**: 3D models (GLB/GLTF) uploaded by users for their personal portals.
*   **Mechanism**: **TriLib 2** (Runtime Import) + Cloud Optimization.
*   **Workflow**:
    1.  **Upload**: User uploads file to `R2/input` via React Native.
    2.  **Cloud Worker**:
        *   Validates geometry (vertex count check).
        *   Optimizes textures (KTX2 conversion).
        *   Exports as standard `.glb`.
    3.  **Runtime**:
        *   RN sends URL to Unity Bridge.
        *   Unity uses `TriLib` to load the URL directly into the scene.
        *   *V4 specific*: Apply a standard "Hologram Shader" to the imported mesh to ensure it fits the aesthetic.

## 2. Infrastructure
*   **Storage**: Cloudflare R2 (Zero egress fees).
*   **CDN**: Cloudflare.
*   **Optimization**: `gltf-transform` (Node.js) running on Cloudflare Workers.

## 3. VFX Asset Strategy
*   **Problem**: You cannot load a *new* C# script at runtime (IL2CPP restriction).
*   **Solution**: You CAN load a *new* VFX Graph Asset at runtime.
*   **Pattern**: All "Brushes" are really just **Data Objects** (ScriptableObjects) containing a reference to a `.vfx` asset. We ship new Brushes by shipping new Addressable Bundles containing these Data Objects.
