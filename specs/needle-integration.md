# 📝 Spec: Needle Engine & Web Strategy
**Owner:** @antigravity
**Status:** Active Strategy (Hybrid Tier)
**Parent:** [PORTALS_V4_DEEP_STRATEGY.md](./PORTALS_V4_DEEP_STRATEGY.md)

## 1. The Strategy: "Web-First" via WebGPU
We use **Unity 6.1 + WebGPU** as the primary renderer for the web to share VFX compatibility with the native app. **Needle Engine** is used specifically for its lightweight Networking/WebXR capabilities where the full Unity runtime is too heavy.

## 2. The Graphics Tiering System
A single Unity project exports to multiple targets with automatic degradation.

| Feature | Tier 1: Native App (iOS) | Tier 2: WebGPU (Chrome/Edge) | Tier 3: WebGL 2 (Fallback) |
| :--- | :--- | :--- | :--- |
| **Renderer** | Metal / Vulkan | WebGPU | WebGL 2.0 |
| **Particles** | 1,000,000+ (Compute) | 500,000 (Compute) | 10,000 (CPU/Shuriken) |
| **VFX Graph** | Full Support | Full Support | **Not Supported** |
| **Simulation** | Real-time Fluid/Boids | Simplified Boids | Static/Baked |
| **AR** | LiDAR / Occlusion | Webcam Background | Webcam Background |

## 3. Needle Engine Integration (Specific Use Case)
We use Needle Engine *inside* the Unity project for:
1.  **Multiplayer Networking**: Needle's networking stack is simpler than Unity Netcode for simple transform sync.
2.  **Lightweight WebXR**: For "Instant App" experiences (e.g., a QR code on a restaurant table) where downloading the 30MB Unity WebGPU WASM is too slow.

### Workflow
*   **Editor**: Use Unity Editor to design the scene.
*   **Export Component**: Add `Needle Export` component to specific GameObjects.
*   **Build**:
    *   Build Target `iOS`: Ignores Needle components.
    *   Build Target `WebGL`:
        *   Profile A (High Fidelity): Builds standard Unity WebGPU.
        *   Profile B (Instant): Builds via Needle Exporter to Three.js/GLB.

## 4. Screensharing & Collaboration
*   See `PORTALS_V4_DEEP_STRATEGY.md` Section 9.
*   We use **React Native WebRTC** for the video stream data.
*   We use Unity strictly to *render* that texture on a 3D surface (The "Mirror").
