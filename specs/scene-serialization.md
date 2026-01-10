# 📝 Spec: Universal Scene Serialization (The "Command Pattern")
**Owner:** @antigravity
**Status:** Draft Strategy
**Parent:** [PORTALS_V4_DEEP_STRATEGY.md](./PORTALS_V4_DEEP_STRATEGY.md)

## 1. The Challenge
We need to save scenes containing heterogeneous data:
*   **Static Assets**: 3D Models (GLB/USDZ), Images, Videos.
*   **Procedural Data**: Paint Strokes (Vertex Lists), Splines.
*   **Simulation Data**: VFX Graph Parameters, Gaussian Splat configs.
*   **Reference Data**: WebViews (URLs), Audio clips.

**Legacy approach (Portals V3):** Storing `GameObject` transforms directly.
**New approach (Portals V4):** Storing the **Intent (Command History)**.

## 2. The Architecture: "The Scene is a Log"
taking inspiration from **Open Brush (Tilt Brush)** and **Normcore**, we treat the scene not as a static list of objects, but as a **deterministic sequence of commands**.

### A. The Data Schema (JSON)
Every object in the scene is represented by a `SceneNode` JSON object:

```json
{
  "version": "4.0",
  "nodes": [
    {
      "uuid": "7f8c...",
      "type": "brush_stroke",
      "position": [0, 1, 0],
      "rotation": [0, 0, 0, 1],
      "scale": [1, 1, 1],
      "data": {
        "brushId": "fire_vfx",
        "points": "base64_blob_of_vertices...",
        "color": "#FF0000"
      }
    },
    {
      "uuid": "9a2b...",
      "type": "model_glb",
      "data": {
        "url": "https://r2.h3m.io/assets/cat.glb",
        "animation": "idle"
      }
    },
    {
       "uuid": "8c3d...",
       "type": "vfx_graph",
       "data": {
          "asset": "rain_storm",
          "properties": { "rate": 500, "wind": 2.5 }
       }
    }
  ]
}
```

### B. Binary vs JSON
*   **Metadata**: Stored in JSON (Human readable, diffable, debuggable).
*   **Heavy Data**: Paint Strokes (thousands of points) and Splines are stored in **Binary Files** (`.bin`) referenced by the JSON.
*   *Why?* Parsing 10MB of JSON on mobile causes frame drops. Reading a binary stream into a `NativeArray` is instant.

## 3. The "Command Pattern" (Undo/Redo + Multiplayer)
To make Multiplayer (Sync) easy later, we do not just "Create Objects". We execute Commands.
1.  **User Action**: "Draw Stroke" -> React Native Bridge.
2.  **Command Created**: `CmdSpawnStroke(points, color)`.
3.  **Execution**: Unity executes the command (renders stroke).
4.  **History**: Command is pushed to `CommandStack`.
5.  **Multiplayer**: The *Command* is sent to other clients (Normcore/WebRTC), not the geometry.

## 4. Implementation Strategy
*   **Save System**:
    1.  Unity serializes `SceneGraph` to JSON string.
    2.  Unity sends JSON to React Native via Bridge.
    3.  React Native saves to `AsyncStorage` (Local) or `Firestore` (Cloud).
*   **Load System**:
    1.  React Native fetches JSON.
    2.  React Native sends `LoadScene(json)` to Bridge.
    3.  Unity clears scene and replays the creation commands.

## 5. Handling Specific Types
*   **3D Models (GLB)**: Store URL + Transform. Load via `TriLib` / `UnityGLTF`.
*   **VFX Graphs**: Store AssetPath (Addressable ID) + Exposed Parameter Values.
*   **Paint Strokes**: Store Control Points (Spline) + Brush ID. Re-tessellate mesh on load (Open Brush style) to adapt to different device LODs.
*   **Gaussian Splats**: Store URL to `.splat` file + Cutout/Crop parameters.

## 6. Future Proofing (Multiplayer)
By using `UUIDs` for every node, we support **Normcore / Needle**:
*   If User A moves Object X, they send `{ "op": "update", "uuid": "X", "pos": [...] }`.
*   Because we save the *State*, not the network packets, we can save a multiplayer session and reload it as a single-player session easily.
