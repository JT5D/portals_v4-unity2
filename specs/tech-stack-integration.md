# Portals V4: The "Deep Future" Architecture Strategy
**Date:** January 8, 2026
**Target Platforms:** iOS 17+ (Primary), Android 15+, VisionOS 2.0+, WebGL (Lite)
**Core Stack:** React Native 0.81 (Fabric) + Unity 6 (URP)

## 1. Executive Vision: "The OS and The Engine"
The most scalable approach for high-fidelity AR/AI apps in 2026 is **not** to choose between React Native and Unity, but to treat them as distinct layers of the stack:

1.  **The OS Layer (React Native)**: Handles the "Business of the App."
    *   Authentication, Social Graph, User Data, Feeds, Push Notifications, OTA Updates, Navigation.
    *   *Why?* It iterates 10x faster than Unity for UI.
2.  **The Reality Engine (Unity 6)**: Handles the "Magic."
    *   High-fidelity AR (LiDAR, Occlusion), Computer Vision, Physics, Complex VFX (Particles, Fluids).
    *   *Why?* React Native (even with Skia) cannot touch Unity's URP/VFX Graph performance for 3D simulation.

---

## 2. Advanced Architecture: "Unity as a Micro-Frontend"

To achieve the "Modular & Scalable" goal, we must stop treating the Unity project as a monolith. Instead, we treat it as a **Loadable Asset** that receives instruction from the React Native OS.

### A. The "Vibrating Bridge" Pattern (JSI + TurboModules)
Instead of the old async bridge, we leverage React Native's **TurboModules** (C++) to talk directly to the **Unity Runtime** (C++). We enforce a **State Separation** model:
*   **React Native**: Owns User, Session, Content Metadata.
*   **Unity**: Owns Spatial Transforms, Frame-accurate VFX.

*   **Shared Memory**: Pass large data (like 3D model buffers or LiDAR point clouds) via JSI/ArrayBuffers, avoiding JSON serialization overhead.
*   **Synchronous Hooks**: React Native can query `Unity.isReady()` properly without async race conditions.
*   **Framework Placement**: Adhere to official `@azesmway` guidance:
    *   iOS: `unity/builds/ios` (UnityFramework.framework)
    *   Android: `unity/builds/android/unityLibrary`

### B. The Content Pipeline (Addressables + Cloud)
**Problem:** Unity apps are huge (200MB+).
**Solution:** The "Shell" Strategy.
1.  **Binary:** The App Store build contains *only* the Unity Engine code + `BridgeTarget.cs` + 1 Empty Scene.
2.  **Content:** All AR experiences (The "Man in the Mirror" hologram, The "Portal" worlds) are bundled as **Unity Addressables**.
3.  **Delivery:** React Native asks AWS S3/CDN for the latest manifest. Unity downloads the specific `.catalog` and loads the assets.
    *   *Benefit:* You can ship a new Christmas AR effect without an App Store Review.

---

## 3. The "AI Hologram" Pipeline
**Goal:** Real-time AI avatars.
**Constraint:** LLMs are heavy; Animation is heavy.

**The Flow:**
1.  **Brain (Cloud/Edge):** React Native records audio -> Sends to OpenAI Realtime API / Gemini Flash.
2.  **Response:** React Native receives Streamed Audio + Phoneme Data.
3.  **Visualization (Unity):**
    *   Unity receives the audio buffer via the Bridge.
    *   **uLipSync** (or similar) processes the raw audio buffer into BlendShape weights.
    *   **VFX Graph** drives the "Hologram glitch" effects based on audio amplitude.
    *   **Directives**: Cloud LLM returns structured parameters (Density, Color, Decay, OcclusionMode) to drive the graph.
    *   **Latency Budget**: Target <120ms end-to-end. Use local fallback profiles if cloud spikes.
    *   **Rationale**: Unity is the *only* engine that can render sub-surface scattering skin shaders + million-particle VFX graphs at 60fps on iPhone.
    *   **References**: Study **Keijiro's** *Rcam4*, *Metavido*, and *SMRVFX* for RGBD/VFX pipelines.

---

## 4. VisionOS Strategy (The 2026 Frontier)
**Approach:** "PolySpatial Hybrid"
1.  **React Native VisionOS:** Use this for the 2D "Windowed" UI. It allows users to browse their feed, settings, and chat using native visionOS glass capabilities.
2.  **Unity PolySpatial:** When the user opens a "Portal," we launch an **Immersive Space**.
    *   *Tech:* Use Unity's **Play to Device** for iteration.
    *   *Integration:* The `react-native-unity` library allows booting the Unity Runtime into a SwiftUI/RealityKit storage container.
    *   *Note:* As of Jan 8, 2026, `react-native-visionos` is stable enough for the UI, but Unity is **mandatory** for the Volume/Immersive processing.

---

## 5. Modularization Checklist (The "Simpler" Approach)
To avoid the "Monolith" trap:

- [ ] **Decouple Logic:** Split `BridgeTarget.cs` into:
    *   `UnityBridgeRuntime`: Message transport & lifecycle.
    *   `UnitySceneSignals`: Ready/Loaded events.
    *   `UnityTelemetryOverlay`: Debug visuals (feature flagged).
- [ ] **Handshake Protocol:** Enforce a strict `bridge_ready` -> `unity_ready` loop with versioned schemas (e.g., `{ "v": 1, "msg": ... }`).
- [ ] **Package-Based Unity:** Move your core AR tools (LiDAR, Meshing) into a local Unity Package (`com.h3m.portals.core`). This lets you reuse them in `Portals V5` or other apps easily.
- [ ] **Strict Typing:** Generate TypeScript definitions from your C# Bridge structs. (Tools like `TypeGen` can automate this).

---

## 6. Project Knowledge Base Entry
*This summary has been committed to `specs/PROJECT_KNOWLEDGE_BASE_ENTRY.md` for team reference.*

---

## 7. Operational Usage & Workflow (Anti-Gravity Optimized)

This section defines the "Golden Path" for developing Portals V4 while maintaining minimal token usage and maximum velocity.

### A. The "3-Step" Build Loop
To avoid "Context Thrashing" where the Agent forgets where it is:

1.  **Unity Changes**:
    *   **Action**: `manage_asset` (MCP) or simple edits to C#.
    *   **Build**: Run `build:unity:ios`. **Do NOT** ask to "open Xcode". The script handles export.
2.  **React Native Changes**:
    *   **Action**: Edit `.tsx`.
    *   **Build**: Metro hot-reloads automatically. No rebuild needed.
3.  **Bridge Changes**:
    *   **Action**: Updating `BridgeTarget.cs` AND `UnityArView.tsx`.
    *   **Verify**: Use the "Ping" button. Do not write new test scripts.

### B. Gemini / AntiGravity Token Strategy
**Rule:** Never read `ProjectSettings.asset`, `Podfile.lock`, or large binaries unless specific lines are needed.

*   **Wrong**: `read_file path/to/ProjectSettings.asset` (20k tokens)
*   **Right**: `grep "productName" path/to/ProjectSettings.asset` (50 tokens)
*   **Best**: Check `specs/PORTALS_V4_DEEP_STRATEGY.md` first. It is the "Context Cache".

### C. Debugging Workflows
*   **"Unity is Black Screen"**:
    1.  Check `manage_scene(action="get_active")` -> Is the scene loaded?
    2.  Check `UnityArView.tsx` -> Is `flex: 1` set?
    3.  Check Logs -> `adb logcat` (Android) or `idevicesyslog` (iOS).
*   **"Bridge Not Working"**:
    1.  Confirm `BridgeTarget` GameObject exists in scene.
    2.  Check JSON formatting (quotes must be escaped in C#).

### D. Reusable Prompts (Copy/Paste)
*   *"Update the Unity Bridge to handle a 'UserLogin' event from RN"*
*   *"Export the current Unity scene to Addressables and update the manifest"*
*   *"Run the iOS build script and filter for linker errors"*

### E. Scaling to VisionOS
When you are ready to target Vision Pro:
1.  **Switch Branch**: Create `feature/visionos`.
2.  **Install**: `npm install @callstack/react-native-visionos`.
3.  **Unity**: Enable **PolySpatial** in Package Manager.
4.  **Strategy**: Do not rewrite the app. Just add the VisionOS target to the existing Expo config using the "out-of-tree" platform pattern.

---

## 7b. Operational Usage & Workflow (Windsurf Optimized)

This section optimizes the workflow specifically for **Windsurf** users leveraging **Claude 3.5 Sonnet (Code)**, while remaining compatible with other models (Gemini, Kodex) and CLI tools.

### A. The "Cascade" Context Strategy
Windsurf's "Cascade" AI has a unique context window. To maximize it:
1.  **Active File Priority**: Only open the *exact* 2-3 files you are working on (e.g., `BridgeTarget.cs` + `UnityTestScene.tsx`). Close everything else.
2.  **Terminal is Truth**: Windsurf reads terminal output perfectly. Instead of asking "What is the error?", run the build script. The AI will see the error in the output stream automatically.
3.  **Do Not Dump**: Avoid pasting 500 lines of logs into the chat. Instead, use `grep` to filter relevant lines before asking for help.

### B. Multi-Model Handoffs
Since you switch between Claude (Reasoning/Arch) and Gemini/AntiGravity (Execution/Search):
*   **Claude (Architect)**: Use for writing complex C# logic, shader code, or React Native architecture. It understands context best.
*   **AntiGravity (Executor)**: Use for "Run Build", "Search Documentation", or "Find Files". It excels at tool use.
*   **Kodex/Others**: Use for specific code generation snippets if needed.

### C. The ".windsurfignore" Protocol
We must aggressively ignore Unity's generated files to prevent AI hallucination.
*   **Ignored**: `Library/`, `Temp/`, `Logs/`, `Builds/`.
*   **Visible**: `Assets/Scripts/`, `Packages/manifest.json`, `ProjectSettings/ProjectSettings.assets`.
*   *Tip:* If the AI says "I can't see the file", checking `.windsurfignore` is the first debugging step.

### D. Fast-Path Prompts for Windsurf
*   **Explain**: "@BridgeTarget.cs Explain how the JSON payload is parsed."
*   **Refactor**: "@UnityTestScene.tsx Extract the message handler into a custom hook."
*   **Fix**: "I am seeing a linker error in the terminal. Fix the Podfile to address the 'undefined symbol' issue." (Windsurf will read the terminal history).

---

## 8. Alternative Strategy: The "Web-First" Pivot (Needle Engine)

If the friction of Native Unity Builds becomes too high, **Needle Engine** is the best alternative.

### Pros:
1.  **Zero-Install AR**: Works in Safari/Chrome via WebXR.
2.  **Multiplayer Native**: Has a built-in WebSocket stack that is arguably simpler than Unity Netcode.
3.  **Unity Workflow**: You still design in Unity Editor, but it "compiles" to three.js.

### Cons:
1.  **No VFX Graph**: You lose the high-end particle simulations critical for the "Man in the Mirror" glitch effects.
2.  **No Native AR Features**: On iOS (Safari), WebXR is still limited. You cannot access Raw LiDAR Depth or Mesh Occlusion natively in the browser without an App wrapper.

### The Hybrid Compromise
We can use Needle's **Networking Stack** inside our Native Unity app.
*   *Why?* Needle's networking is lightweight and cross-platform (JS/C# compatible).
*   *How?* Use Needle for the "Multiplayer State" logic, but keep Unity URP for the rendering.

**Final Verdict:** Stick to **Native Unity (Strategy #1)** for Portals V4 because "Visual Fidelity" (Holograms) is the core value proposition. Move to Needle only if "Web Access" becomes more important than "Visual Quality".

---

## 8b. The "Web-First" Native Strategy (Unity WebGPU)

**Goal:** Deliver "Native Fidelity" (VFX Graph, Compute Shaders) to the Web Browser (PC/Mobile/VisionOS) without abandoning the Native Unity app.

### A. The Tech Stack (Unity 6.1 + WebGPU)
As of **April 2025 (Unity 6.1)**, Unity officially supports **WebGPU**. This is the game-changer that allows Compute Shaders (and thus VFX Graph) to run in the browser.
*   **Platform:** WebGL 2.0 (Legacy) is dead for us. We target **WebGPU**.
*   **Browser Support (2026):** Chrome (Android/PC), Edge, and Safari (Experimental WebGPU on iOS 18+).

### B. The "Progressive Hologram" Architecture
How to maintain one codebase for both Native (iOS App) and Web (Marketing Site):

1.  **The "Core" Package**: Logic, Physics, and Game State live in `com.h3m.portals.core`. This compiles to both IL2CPP (iOS) and Wasm (Web).
2.  **The "VFX Tiering" System**:
    *   **Native App (Tier 1)**: Renders 1M particles/sec using raw Compute Shaders on Metal.
    *   **WebGPU (Tier 2)**: Renders 500k particles/sec. Uses the *same* VFX Graph assets (if supported) or fallbacks to **Needle + Shuriken** export (reduced particle counts, baked lighting) if mobile WebGPU support is patchy.
    *   **WebGL 2.0 Fallback (Tier 3)**: Renders standard Particle Systems (CPU-based) for older phones.
    *   *Implementation:* A `GraphicsTierManager` script detects the platform at runtime and sets the LOD (Level of Detail).

### C. WebAR Limitations & Workarounds
*   **The Wall:** Browsers (even with WebXR) cannot access the **LiDAR Depth Mesh** or **Raw Camera Feed** as efficiently as a Native App due to privacy sandboxing.
*   **The Workaround**:
    *   **Reflective AR**: Instead of "World AR" (placing portals in your room), the Web version defaults to **"Selfie AR"** or **"Gyro Window"** mode (360 viewer).
    *   **QR Handoff**: The Web version is the "Teaser". If the user wants the full LiDAR Mesh experience, the Web app displays a Smart App Banner to download the Native App.

### D. VisionOS Web Usage
*   **Safari Spatial**: VisionOS Safari supports `<model-viewer>` and WebXR.
*   **Strategy**: For VisionOS Web, we do **not** use the full Unity WebGL build (too heavy). instead, we export individual **GLB Models** from Unity and display them using standard Web Technologies. The "Full" experience is always the Native App (PolySpatial).

**Verdict:** We build **ONE** Unity Project. We export to iOS/Android for the Product, and we export to **WebGPU** for the Marketing/Shareable links, with reduced particle counts automatically handled by our scripts.

---

## 9. UI Strategy: The Hybrid Toolkit Pattern

**Goal:** Easier updates for non-devs while preserving performance.

### A. The Separation of Concerns
*   **React Native UI (App Logic):** Use for Menus, Auth, Maps, Feed, Settings.
    *   *Reason:* Native keyboard support, accessibility, safe area handling, push notifications.
*   **Unity UI Toolkit (World-Space):** Use for **HUDs**, Hologram Controls, and "in-world" buttons.
    *   *Reason:* It renders *inside* the AR world, subject to post-processing (Bloom, Glitch effects).

### B. Unity UI Toolkit (The New Standard)
We will strictly use **UI Toolkit** (USS/UXML) over the old Unity Canvas (UGUI).
*   **Performance:** UI Toolkit uses a retained-mode rendering system (like HTML DOM), reducing draw calls compared to UGUI's constant rebuilding.
*   **Workflow for Non-Devs:**
    1.  **UI Builder:** A drag-and-drop visual editor inside Unity (similar to Figma/Webflow).
    2.  **USS Styles:** Styling is separated into CSS-like files. Designers can change colors/fonts without touching code.
    3.  **Live Updates:** USS files can be loaded via **Addressables**, meaning you can update the theme OTA.

### C. Adaptation Recommendation
*   **Do NOT** port the React Native UI to Unity.
*   **DO** expose a "Theme" JSON from React Native to Unity so the AR HUD matches the App Colors.
    *   *Mechanism:* `BridgeTarget` receives `{ "primaryColor": "#FF0000" }` -> Updates `PanelSettings` in Unity UI Toolkit.

**Efficiency Verdict:** This separation ensures the CPU is free for AR tracking (handled by Unity Native) while the App logic sits on the efficient OS UI thread.

---

## 10. The Portals V6 Feature Migration (P0 - P2)

Based on the `_JT_PRIORITIES.md` and `_ADVANCED_AR_FEATURES_IMPLEMENTATION_PLAN.md` from the V6 workspace, here is the prioritized roadmap for Portals V4 content.

### P0: Critical Foundation (Fix First)
*   **Security**: Ensure `H3MLogin.cs` logging is stripped. (Already handled by RN Auth in V4, so this is resolved by architecture!)
*   **Particle Brush System**: The V3 system uses inefficient `Instantiate/Destroy`.
    *   *V4 Strategy*: Rebuild using **VFX Graph** (GPU Particles) immediately. Do not port the C# particle system. Use `H3MBrushDescriptor` concept but mapped to VFX Graph assets.

### P1: Core AR Features (The "Wow" Factor)
*   **Hand Tracking Painting**: V6 uses HoloKit.
    *   *V4 Strategy*: Port `HandPaintParticleController.cs` but adapt it to use **XR Hands** (Unity standard) for broader compatibility (Quest/VisionOS).
*   **Audio Reactive Brushes**:
    *   *V4 Strategy*: Use `AudioSource.GetSpectrumData` in Unity, drive VFX Graph "Size" block exposed parameters.
*   **Body Tracking VFX** (`PeopleOcclusionVFXManager` in V6):
    *   *V4 Strategy*: This is already "Done" in V6. Port the `PeopleVFX.vfx` and the Compute Shader. Ideally, move to **Human Segmentation** (ARKit) for the "Man in the Mirror" effect.

### P2: Advanced & Experimental
*   **Speech-to-Object (Whisper + Icosa)**:
    *   *V4 Strategy*: Handle Speech-to-Text in **React Native** (iOS Dictation is free/native). Send text string to Unity. Unity calls Icosa API.
*   **LiDAR Depth Effects (Echovision)**:
    *   *V4 Strategy*: Use **AR Foundation 6.3** Meshing. No need for custom depth shaders; use the standard Environment Depth in URP.
*   **Multiplayer (Fungisync)**:
    *   *V4 Strategy*: Use **React Native** for the WebSocket connection (Socket.io or equivalent). Pass "Spawn Event" to Unity Bridge. Do not use Normcore unless heavy physics sync is needed.

**Hub Repos to Track:**
*   **Keijiro**: Rcam4, Metavido, SMRVFX (VFX + RGBD patterns).
*   **Open Brush**: High-performance brush geometry patterns.
*   **Normcore Samples**: Authoritative multiplayer sync patterns.
*   **Needle Engine**: WebXR + glTF export references.

### Summary
We are **not** porting the V3 codebase 1:1. We are porting the **Assets (VFX/Models)** and rewriting the **Controllers** to be cleaner, "V4-Native" scripts that listen to the Bridge.

---

## 11. Voice Command Strategy: "The Creator's Voice" (LLMR Architecture)

**Goal:** Enable users to "speak the world into existence" (Jaron Lanier / Microsoft LLMR style), controlling procedural generation and complex agent behaviors via natural language.

### A. The Debate: React Native Voice vs. Unity Whisper
We weighed two approaches for the primary voice interface:
1.  **React Native Voice / OpenAI Realtime (The "Brain" Approach)** -> **SELECTED**
2.  **Whisper in Unity (The "Embedded" Approach)**

### B. The Strategy: "RN Ears, Unity Hands"
We select **React Native** as the primary Voice Interface Handler for 3 reasons:
1.  **Logic Ownership**: Complex prompt engineering (e.g., "Create a flock of boids that avoid my hand") requires LLM reasoning, which lives in the Cloud/RN layer.
2.  **Performance**: Offloading Speech-to-Text to the OS (iOS Dictation) or Cloud (OpenAI) frees up the Unity Main Thread for rendering 60fps AR.
3.  **UI Feedback**: React Native can display the *Live Transcript* and *Intent Confirmation* overlays natively, which feels snappier than building 3D UI text.

### C. The "LLM-MR" Workflow
To achieve the complexity of the `microsoft/LLMR` repo:
1.  **Input**: User creates a "Voice Intent" via RN UI (Mic Button).
2.  **Reasoning**: RN sends audio/text to **OpenAI Realtime API**.
    *   *System Prompt*: "You are an expert Unity Script generator. Output JSON directives for Spawning, modifying materials, or attaching logic components."
3.  **Execution (The Bridge)**:
    *   RN receives: `{ "action": "generate_script", "code": "...boid logic..." }`
    *   RN forwards to Unity Bridge.
    *   **Unity (Runtime Compiler)**: Uses `Roslyn C#` (or a simplified Lua interpreter) to attach the new behavior to the target GameObject at runtime.
    *   *Result*: The user says "Make them spin", and they spin.

### D. Exception: Audio Reactivity
For features that need *Raw Signal* (e.g., "Brush size pulses with voice volume"):
*   **Mechanism**: Unity accesses `Microphone.Start()` *only* to get the **Spectrum Data** (Volume/Frequency). It does *not* do speech recognition.
*   *Conflict Management*: Ensure iOS Audio Session is set to `PlayAndRecord` with `MixWithOthers` so RN and Unity don't fight over the mic.

**Summary:** React Native handles the **Language** (Meaning). Unity handles the **Signal** (Physics/Visuals).

---

## 12. Final Implementation Roadmap (Next 48 Hours)

This quick summary simplifies the complex document into 5 actionable steps for the developer.

1.  **Immediate: Update React Native Specs (30 mins)**
    *   **Action**: Copy the "Executive Vision" (Section 1) and "Hybrid UI Pattern" (Section 9) into your main `README.md` or `specs/README.md`.
    *   *Why?* Aligns the entire team (and future AI agents) on the "OS vs Engine" separation.

2.  **Phase 1: The "VFX Brush" Prototype (2-4 Hours)**
    *   **Action**: Create **ONE** VFX Graph in Unity (`Assets/VFX/SimpleBrush.vfx`).
    *   **Action**: Update `BridgeTarget.cs` to listen for `{ "action": "spawnBrush", "x": 0, "y": 0, "z": 0 }`.
    *   *Goal*: Prove the pipeline (RN Touch -> Bridge -> VFX Graph) works without the C# particle system legacy code.

3.  **Phase 2: The UI Logic Split (2-4 Hours)**
    *   **Action**: Remove any complex UI logic from Unity (Canvas, Panels).
    *   **Action**: Create a strict interface in `BridgeTarget.cs`: `public void MessageFromReact(string json)`.
    *   *Goal*: Ensure Unity is *dumb*. It only knows how to render what React Native tells it to.

4.  **Phase 3: The Build Validation (1 Hour)**
    *   **Action**: Run `build:unity:ios`.
    *   **Action**: Deploy to Physical Device.
    *   *Goal*: Confirm the **WebGPU/Metal** shaders compile correctly on iOS (the "Pink Texture" check).

## 13. Strategic Validation & Research Notes (Triple Verified)
*Verified Jan 8, 2026*

**1. Multiplayer Strategy: Normcore vs. Unity Netcode**
*   **Decision**: STICK WITH NORMCORE.
*   **Why?**: While Unity Netcode (NGO) + Relay is free for <50 CCU, it requires separate solutions for Voice (Vivox/Agora) and Avatar IK. Integrating 3 separate SDKs violates our "Simplicity" rule. Normcore handles State + Voice + Avatars in **one SDK**. The time saved (approx. 100+ hours) outweighs the server cost for V4.

**2. Voice Strategy: RN Ears vs. Unity Whisper**
*   **Decision**: STICK WITH REACT NATIVE.
*   **Why?**: Unity's microphone APIs are ancient (blocking main thread). React Native has access to native iOS 17 speech processing and non-blocking networking. It is the "Brain", Unity is the "Hands".

**3. App Architecture: Micro-Frontend Pattern**
*   **Validation**: The industry (Meta, Snap) is moving toward "Native UI + Engine Surface". Our "BridgeTarget" router is the leanest possible implementation of this pattern.

**4. Cost & Dependencies**
*   **Storage**: Cloudflare R2 verified as $0 Egress (saving potentially thousands vs AWS S3).
*   **Server**: Normcore is the *only* paid dependency. Everything else (Addressables, WebGPU, RN) is free/open-source.

---

## 14. Final Implementation Roadmap
*(Proceed to Execute Phase)*

**Phase 1: The "Visual" Prototype (VFX + Bridge)**
1.  **VFX Integration**: Get `SimpleBrush.vfx` spawning via JSON command. (DONE)
2.  **UI Wiring**: Connect the "Spawn" button in RN to the Bridge. (DONE)
3.  **Validate**: Build to Device and see particles.

**Phase 2: The "System" Upgrade (Addressables)**
1.  **Refactor**: Move `SimpleBrush` to an Addressable Group `Feature_VFX_Brushes`.
2.  **Cloud**: Setup Cloudflare R2 bucket.
3.  **Test**: Build a content update, upload, and see it appear without reinstalling.

**Phase 3: The "Social" Layer (Normcore)**
1.  **SDK**: Import Normcore.
2.  **Sync**: Replace `Instantiate` with `Realtime.Instantiate`.
3.  **Voice**: Add `RealtimeAvatarVoice`.

---
**Developer Mantra**: "If it is Logic, write it in React Native. If it is 10,000 Particles, write it in Unity VFX Graph. Do not mix them."
