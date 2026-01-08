# Project Knowledge Base Entry: Portals V4 Architecture

> **Canonical Definition**: This document defines the architectural source of truth for Portals V4. All AI agents and developers must adhere to these principles.

## 1. Core Philosophy: "The OS and The Reality Engine"
*   **The OS (React Native)**: "The Brain". Owns Business Logic, User Data, Networking, Voice Intents (LLM), and UI Overlay.
*   **The Reality Engine (Unity 6)**: "The Hands". Owns Rendering, Physics, AR Tracking, VFX Graph, and Spatial Interactions.
*   **Mantra**: "If it is Logic, write it in React Native. If it is 10,000 Particles, write it in Unity VFX Graph. Do not mix them."

## 2. The Tech Stack
*   **Mobile**: React Native 0.81 (Fabric) + Unity 6 (URP).
*   **Bridge**: JSI / TurboModules (C++ Shared Memory) for high-performance state sync.
*   **Web**: Unity 6.1 WebGPU (Targeting Chrome/Edge/Safari 18+) for high-fidelity marketing/shareable experiences.

## 3. The "Hologram" Pipeline (Audio -> VFX)
1.  **Input**: User speaks -> React Native records.
2.  **Processing**: RN sends to Cloud LLM -> Returns Audio Stream + "VFX Directives" (JSON).
3.  **Visualization**: Unity Bridge receives Directives -> Drives VFX Graph (GPU Particles) + uLipSync (BlendShapes).

## 4. Operational Rules (Anti-Gravity)
*   **Context**: Use `specs/PORTALS_V4_DEEP_STRATEGY.md` as the "Context Cache".
*   **Builds**: Use `scripts/build_and_run_ios.sh`. Trust terminal output over "guessing".
*   **Logs**: `adb logcat -s Unity` (Android) or `idevicesyslog` (iOS).

## 5. Key Documentation Links
*   [Deep Strategy & Roadmap](./PORTALS_V4_DEEP_STRATEGY.md)
*   [Unity Integration Guide](./unity-integration.md) (Synced copy)
*   [Tech Stack Integration](./tech-stack-integration.md) (Synced copy)

*Last Updated: January 8, 2026*
