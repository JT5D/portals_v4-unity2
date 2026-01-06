# 📝 Spec: Cloud Asset Pipeline (Worker)
> **Status:** Draft
> **Parent Strategy:** [STRATEGY.md](../STRATEGY.md)
> **Owner:** @antigravity

## 1. Problem
Users cannot upload their own 3D assets (FBX/OBJ) because mobile devices lack the power to reliably convert and optimize them for AR runtime.

## 2. Proposed Solution
A "Cloud-First" pipeline. Users upload raw files to Cloudflare R2, and a serverless worker (or containerized service) processes them into optimized, standardized formats (glTF 2.0 + Draco + KTX2).

## 3. Technical Architecture
### A. Ingestion
- **Source**: App uploads to `R2/raw/{uuid}`.
- **Trigger**: File upload triggers a Cloudflare Worker / AWS Lambda.

### B. The Optimizers (The "Black Box")
- **Geometry**: `gltf-pipeline` with Draco compression (-90% size).
- **Textures**: `ktx2-encoder` (BasisU) for GPU-ready textures.
- **Rigging**: API call to *Tripo AI* or *DeepMotion* to auto-rig static humanoid meshes.

### C. Consumption
- **Unity**: Loads `.glb` via `UnityGLTF` (Runtime).
- **RN**: Stores metadata (dimensions, anims) in Firestore.

## 4. Implementation Steps
- [ ] **Storage**: Configure Cloudflare R2 bucket `portals-assets`.
- [ ] **Worker**: Create a Node.js script using `gltf-pipeline` to test local conversion.
- [ ] **API**: Set up a simple endpoint for the app to request an upload URL (`PUT`).
- [ ] **Loader**: Test `TriLib 2` in Unity for local preview of raw files.
