# 📝 Spec: Multiplayer Architecture (Normcore Integration)
**Owner:** @antigravity
**Status:** Strategy Defined
**Parent:** [PORTALS_V4_DEEP_STRATEGY.md](./PORTALS_V4_DEEP_STRATEGY.md)

## 1. Executive Summary
We are choosing **Normcore** (by Normal VR) as the multiplayer backbone for Portals V4.
*   **Why Normcore?** It is the *only* Unity networking solution built specifically for XR. It handles **Voice Chat**, **Inverse Kinematics** (Avatars), and **State Sync** (Drawings) out of the box with zero dev-ops.
*   **Constraint:** It costs money ($/CCU). We must optimize bandwidth.

## 2. Core Features
1.  **Shared Presence**: See other users' head/hands (XR Avatars).
2.  **Voice Chat**: High-quality spatial audio (OPUS codec).
3.  **Collaborative Drawing**: Users can draw together in real-time.
4.  **State Persistence**: Room state persists even if everyone leaves (Cloud Rooms).

## 3. Architecture: "The Realtime Model"
Normcore uses a `RealtimeModel` (C# Class) to define the schema of a networked object.

### A. The Avatar
*   **Prefab**: `RealtimeAvatar`.
*   **Components**: `RealtimeTransform` (Head/Hands), `RealtimeAvatarVoice` (Mic).
*   **V4 Specific**: We replace the default geometry with our "Hologram" shader to make users look like energetic light beings.

### B. The Brush Stroke (The Hard Part)
Drawing in 3D requires syncing thousands of points per second.
*   **Naive Approach**: Send every `Vector3` position as an RPC. -> **Explodes Bandwidth**.
*   **Normcore Approach**: Sync the **Control Points** via `RealtimeArray`.
    1.  User starts drawing -> Instantiate `NetworkedStroke` prefab.
    2.  User moves hand -> Add local point.
    3.  Every 50ms -> Push new points to `StrokeModel`.
    4.  All Clients -> `StrokeModel` updates -> Rebuild Mesh.

## 4. Implementation Plan
### Phase 1: Connection & Voice (Hours 1-4)
- [ ] Import Normcore SDK.
- [ ] Create `MultiplayerManager.cs` (Wraps `Realtime` component).
- [ ] Connect `BridgeTarget.cs` to trigger `MultiplayerManager.Connect("RoomX")`.
- [ ] Verify Voice Chat works between 2 devices.

### Phase 2: Avatars (Hours 4-8)
- [ ] Create `PortalsAvatar` prefab.
- [ ] Map `ARCamera` and `XRController` positions to the Avatar.
- [ ] Apply "Glitch" material to the Avatar mesh.

### Phase 3: Collaborative Drawing (Hours 8-20)
- [ ] Create `BrushStrokeModel` (Normcore Data Class).
- [ ] Create `BrushStroke` component (Mesh Generator).
- [ ] Update `H3MBrushManager` to instantiate `NetworkedStroke` instead of local LineRenderer when connected.

## 5. Bandwidth Optimization Strategy
*   **Quantization**: Compress Vector3 (12 bytes) to Shorts (6 bytes) for positions relative to the stroke origin.
*   **Update Rate**: Only sync stroke updates at 10Hz, interpolate locally at 60Hz (Catmull-Rom Splines).
*   **Audio**: Normcore creates a reliable audio stream; ensure we don't double-process the microphone (Unity Mic vs iOS Voice Processing).

## 6. Resources
*   **Key Tutorial**: [Normcore Multiplayer Drawing Guide](https://normcore.io/documentation/guides/creating-a-multiplayer-drawing-app.html)
*   **Repo**: `NormalVR/Normcore-Examples` on GitHub.

## 7. Integration with React Native
*   React Native holds the "Room ID".
*   RN sends `{ "action": "joinRoom", "room": "portal-123" }` to Unity Bridge.
*   Unity executes `Realtime.Connect("portal-123")`.
*   Unity sends `{ "type": "playerJoined", "count": 2 }` back to RN to update the HUD.
