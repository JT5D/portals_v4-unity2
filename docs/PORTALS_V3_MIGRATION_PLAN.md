# Portals_6 to portals_v4 Migration Plan

**Created**: January 10, 2025
**Source**: `/Users/jamestunick/wkspaces/Portals_6/` (Unity 6000.1.2f1)
**Target**: `/Users/jamestunick/Documents/GitHub/portals_v4/unity/` (Unity 6000.2.14f1)
**Aligned to**: H3M Portals Cross-Platform Hologram Roadmap

---

## Executive Summary

This document outlines the migration strategy from the mature Portals_6 Unity project to the new portals_v4 React Native integration. The goal is to leverage the extensive XR/VFX work already completed in Portals_6 while maintaining the clean React Native bridge architecture of portals_v4.

### Key Insight
Portals_6 has **production-ready XR infrastructure** (v3 scripts) that can accelerate Phase 1-2 of the roadmap significantly. The migration is not a rewrite but a selective integration.

---

## Current State Analysis

### portals_v4 (Target Project)

**Strengths**:
- Clean React Native + Unity bridge architecture
- Working iOS builds with Expo/New Architecture
- BridgeTarget.cs messaging system
- AR Foundation 6.2.1 (latest)
- Minimal, focused codebase

**Current Scripts**:
```
unity/Assets/Scripts/
├── BridgeTarget.cs          # RN ↔ Unity messaging (production-ready)
├── ARDebugOverlay.cs        # Debug UI
├── ARDiagnostics.cs         # Performance monitoring
├── ARSessionLogger.cs       # Session logging
└── Runtime/                 # AR Foundation samples
```

**Current Scenes**:
- ARTestScene.unity (main)
- SimpleAR/ folder with samples

---

### Portals_6 (Source Project)

**Strengths**:
- 5 production-ready v3 XR scripts (~1,500 lines)
- Extensive v2 feature library (20+ modules)
- VFX Graph integration patterns
- Cross-platform support (iOS/Quest/WebGL)
- Content library (prefabs, 3D models)

**v3 XR Core (PRIORITY MIGRATE)**:
```
Assets/[H3M]/Portals/Code/v3/XR/
├── XRUnifiedRigBootstrap.cs     # Platform detection (230 lines)
├── HandJointProvider.cs         # Hand tracking → VFX (306 lines)
├── BodyTrackingProvider.cs      # Quest body tracking (194 lines)
├── TrackingToVFXBridge.cs       # Unified VFX interface (217 lines)
└── GestureDetector.cs           # Pinch/grab gestures (280 lines)
```

**v2 Feature Modules (SELECTIVE MIGRATE)**:
```
Assets/[H3M]/Portals/Code/v2/
├── AR/                    # AR placement, interaction
├── FaceFilters/           # Face tracking effects
├── Gallery/               # Content gallery system
├── Importer/              # 3D model import
├── Maps/                  # AR location/mapping
├── Painting/              # AR drawing tools
├── MarketPlace/           # Content marketplace
├── Profile/               # User profiles
└── ... (20+ modules)
```

---

## Migration Priority Matrix

### Phase 1: Local Foundation (IMMEDIATE)

| Component | Source | Priority | Complexity | Notes |
|-----------|--------|----------|------------|-------|
| XRUnifiedRigBootstrap | v3/XR | HIGH | Low | Adapter needed for AR Foundation 6.2 |
| HandJointProvider | v3/XR | HIGH | Medium | Update XR Hands API for Unity 6 |
| GestureDetector | v3/XR | HIGH | Low | Pinch/grab for portal placement |
| TrackingToVFXBridge | v3/XR | MEDIUM | Low | VFX Graph integration |
| AR Placement | v2/AR | HIGH | Medium | Core portal placement logic |

**Estimated Effort**: 2-3 days

---

### Phase 2: Visual Effects Foundation

| Component | Source | Priority | Complexity | Notes |
|-----------|--------|----------|------------|-------|
| VFX Graph Templates | Portals_6 | HIGH | Medium | Hand particle effects |
| EnchantedPortal prefabs | v3/XR/EnchantedPortal | HIGH | Low | Portal visual assets |
| Painting system | v2/Painting | MEDIUM | High | AR drawing |
| Face filters | v2/FaceFilters | LOW | Medium | Future feature |

**Estimated Effort**: 3-5 days

---

### Phase 3-8: Roadmap Alignment

| Roadmap Phase | Portals_6 Assets | Migration Strategy |
|---------------|------------------|-------------------|
| Phase 3: UI/UX | v2/Gallery, v2/Main | Selective port with RN adaptation |
| Phase 4: Content | Content/Prefabs, Content/3DModels | Asset copy, update materials for URP |
| Phase 5: Multiplayer | (None - use Normcore) | New implementation |
| Phase 6: Location | v2/Maps, ARLocation | Evaluate vs new implementation |
| Phase 7: Advanced XR | BodyTrackingProvider | Quest-specific features |
| Phase 8: MMO Scale | (None) | Future architecture |

---

## Migration Tasks

### Task 1: XR Core Scripts (Phase 1)

**Files to migrate**:
```bash
# From Portals_6
cp "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/XRUnifiedRigBootstrap.cs" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scripts/XR/"

cp "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/HandJointProvider.cs" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scripts/XR/"

cp "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/GestureDetector.cs" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scripts/XR/"

cp "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/TrackingToVFXBridge.cs" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scripts/XR/"
```

**Required Adaptations**:
1. Update namespace from `H3M.Portals.XR` to `Portals.XR`
2. Verify XR Hands API compatibility with AR Foundation 6.2.1
3. Wire to existing BridgeTarget.cs for RN messaging
4. Test iOS build compatibility

---

### Task 2: VFX Integration (Phase 2)

**Files to migrate**:
```bash
# VFX Graph assets
cp -r "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/EnchantedPortal" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/VFX/"

# EnchantedScenes (sample scenes)
cp -r "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/EnchantedScenes" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scenes/VFX/"
```

**Required Adaptations**:
1. Update URP shader references for Unity 6000.2
2. Configure VFX Graph exposed properties for hand tracking
3. Integrate with TrackingToVFXBridge

---

### Task 3: BridgeTarget Integration

Add XR events to existing BridgeTarget.cs messaging:

```csharp
// Messages TO React Native (Unity → RN)
public enum XRMessageType
{
    gesture_detected,      // Pinch, grab events
    hand_tracking_status,  // Tracking quality
    portal_placed,         // Portal spawn event
    vfx_event              // VFX triggers
}

// Messages FROM React Native (RN → Unity)
public enum RNCommandType
{
    spawn_portal,         // Create portal at position
    set_vfx_preset,       // Change VFX style
    toggle_hand_tracking, // Enable/disable tracking
    capture_snapshot      // Screenshot request
}
```

---

## Dependency Analysis

### Package Requirements

**Already in portals_v4**:
- AR Foundation 6.2.1
- XR Plugin Management
- Universal RP

**Need to Add**:
```json
// manifest.json additions
{
  "com.unity.xr.hands": "1.4.1",           // Hand tracking API
  "com.unity.visualeffectgraph": "17.0.3", // VFX Graph
  "com.meta.xr.sdk.core": "69.0.1"         // Quest support (optional)
}
```

### Platform Compatibility

| Feature | iOS | Quest | WebGL |
|---------|-----|-------|-------|
| Hand Tracking | Yes (ARKit) | Yes (Meta SDK) | Future (WebXR) |
| Body Tracking | No | Yes (Meta SDK) | No |
| VFX Graph | Yes | Yes | Limited |
| Face Tracking | Yes | Yes (Passthrough) | No |

---

## Risk Assessment

### High Risk
- **XR Hands API version mismatch**: Portals_6 uses XR Hands 1.4.x, verify compatibility
- **VFX Graph performance**: iOS mobile GPUs may need optimization
- **React Native bridge**: Additional message types may need protocol updates

### Medium Risk
- **Unity version differences**: 6000.1.2 → 6000.2.14 (minor, but verify)
- **Shader compatibility**: URP version differences
- **Asset serialization**: Meta files may need regeneration

### Low Risk
- **Script namespace changes**: Mechanical refactor
- **Scene references**: Standard Unity workflow

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All 4 v3 XR scripts compile in portals_v4
- [ ] XRUnifiedRigBootstrap detects iOS platform correctly
- [ ] HandJointProvider initializes on device
- [ ] GestureDetector fires pinch events to RN via bridge
- [ ] 60+ FPS maintained on iPhone 12+

### Phase 2 Complete When:
- [ ] VFX Graph renders hand particles
- [ ] Portal spawn VFX plays on gesture
- [ ] 60+ FPS maintained with VFX

---

## Quick Start Commands

```bash
# 1. Create XR scripts folder
mkdir -p /Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scripts/XR

# 2. Copy core scripts
for script in XRUnifiedRigBootstrap HandJointProvider GestureDetector TrackingToVFXBridge; do
  cp "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/${script}.cs" \
     "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/Scripts/XR/"
done

# 3. Create VFX folder
mkdir -p /Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/VFX

# 4. Copy VFX assets
cp -r "/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/XR/EnchantedPortal" \
   "/Users/jamestunick/Documents/GitHub/portals_v4/unity/Assets/VFX/"

# 5. Install XR Hands package
# (Run in Unity: Window → Package Manager → Add package → com.unity.xr.hands)

# 6. Build and test
UNITY_CLEAN_BUILD=1 ./scripts/build_minimal.sh
```

---

## Architecture Diagram (Post-Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native (Expo)                          │
│                                                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│   │ AR View     │  │ Portal List │  │ VFX Controls        │     │
│   │ Component   │  │ Component   │  │ Component           │     │
│   └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘     │
│          │                │                     │                 │
│          └────────────────┼─────────────────────┘                 │
│                           │                                       │
│                    ┌──────▼──────┐                                │
│                    │ UnityModule │                                │
│                    │ (Bridge)    │                                │
│                    └──────┬──────┘                                │
└───────────────────────────┼───────────────────────────────────────┘
                            │ sendMessage / onMessage
┌───────────────────────────┼───────────────────────────────────────┐
│                    ┌──────▼──────┐                                │
│                    │BridgeTarget │                                │
│                    │   (v4)      │                                │
│                    └──────┬──────┘                                │
│                           │                                       │
│    ┌──────────────────────┼──────────────────────┐               │
│    │                      │                      │                │
│  ┌─▼───────────────┐  ┌──▼──────────────┐  ┌───▼────────────┐   │
│  │XRUnifiedRig     │  │HandJointProvider│  │GestureDetector │   │
│  │Bootstrap        │  │(XR Hands)       │  │(Pinch/Grab)    │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬───────┘   │
│           │                    │                     │            │
│           └────────────────────┼─────────────────────┘            │
│                                │                                  │
│                     ┌──────────▼──────────┐                       │
│                     │TrackingToVFXBridge  │                       │
│                     └──────────┬──────────┘                       │
│                                │                                  │
│                     ┌──────────▼──────────┐                       │
│                     │   VFX Graph         │                       │
│                     │   (Particles)       │                       │
│                     └─────────────────────┘                       │
│                                                                   │
│                     Unity Framework (portals_v4)                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Review this plan** - Confirm migration priorities align with roadmap
2. **Start Task 1** - Copy and adapt v3 XR scripts
3. **Test incrementally** - One script at a time, verify compilation
4. **Document issues** - Log any API changes needed

---

## References

- [Portals v3 Implementation Guide](/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/PORTALS_V3_IMPLEMENTATION_GUIDE.md)
- [Portals v3 Project Status](/Users/jamestunick/wkspaces/Portals_6/Assets/[H3M]/Portals/Code/v3/PROJECT_STATUS.md)
- [Unity XR Hands Documentation](https://docs.unity3d.com/Packages/com.unity.xr.hands@1.4)
- [VFX Graph Documentation](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.0)
