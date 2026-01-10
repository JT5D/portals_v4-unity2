# 📝 Spec: Unity Addressables & Cloud Content Pipeline
**Owner:** @antigravity
**Status:** Active Strategy (Updated Jan 8, 2026)
**Parent:** [asset-pipeline.md](./asset-pipeline.md)

## 1. Executive Strategy
We use **Unity Addressables** to decouple the "App Binary" (Shell) from the "Experience Content". This enables Over-the-Air (OTA) updates for Christmas effects, new portals, and bug fixes without App Store Review.

**Storage Provider:** Cloudflare R2 (S3 Compatible).
*   *Why?* Zero egress fees. Massive cost savings over AWS S3.

## 2. Addressables Configuration (Profile Strategy)
We strictly separate **Development**, **Staging**, and **Production** via Addressables Profiles.

| Profile Name | RemoteLoadPath | CDN Caching |
| :--- | :--- | :--- |
| **Default** (Local) | `ServerData/Local` | N/A |
| **Staging** | `https://r2-staging.h3m.io/[BuildTarget]` | Disabled (Always fetch fresh) |
| **Production** | `https://cdn.h3m.io/assets/[BuildTarget]` | Enabled (1 Year TTL) |

**Key Settings (AddressableAssetSettings.asset):**
*   **Build Remote Catalog**: `true` (Crucial for OTA updates).
*   **Unique Bundle IDs**: `true` (Prevents hash collisions during mid-session updates).
*   **Optimize Service Connectivity**: `true`.

## 3. Group Strategy (The "Granularity" Rule)
Don't dump everything into "Default Local Group". Split strictly:

1.  **`Preload_Assets` (Install-Time)**:
    *   *Content:* Splash screen, loading spinner, base UI fonts.
    *   *Setting:* `Content Packing: Bundle together`. `Prevent Updates: Enabled`.
2.  **`Feature_VFX_Brushes` (Remote)**:
    *   *Content:* All `.vfx` assets and their textures.
    *   *Setting:* `Content Packing: Pack Separately` (One bundle per brush? No, one bundle per Category).
    *   *Update Strategy:* `Cannot Change Post Release`. (If we change a brush, we ship a NEW bundle name).
3.  **`Feature_Portals` (Remote)**:
    *   *Content:* The 3D Portal environments.
    *   *Setting:* `Content Packing: Pack Together by Label`.

## 4. The Update Workflow (The "Content Update" Script)
We **NEVER** do a full rebuild for a content update.

### Step A: The "Base" Build (App Store Submission)
1.  Run `AddressableAssetSettings.BuildPlayerContent()`.
2.  This generates `addressables_content_state.bin`.
3.  **Commit this .bin file to Git!** It is the "Anchor" for all future updates.

### Step B: The "Delta" Update (OTA)
1.  Modify a texture or VFX graph.
2.  Run **"Check for Content Update Restrictions"**.
3.  Unity moves modified assets to a new Group: `Content Update [Date]`.
4.  Run **"Update a Previous Build"** (Select the saved `.bin`).
5.  Result: A small `.bundle` delta and a new `.json` catalog.

### Step C: Deployment
1.  Upload **only** the new `.bundle`, `.hash`, and `.json` to `R2/production/iOS`.
2.  **Do NOT delete old bundles** (Old app versions still need them!).

## 5. Runtime Logic (BridgeTarget.cs Integration)
React Native controls *when* the update happens.

1.  **App Launch**: React Native checks API: "Is there a mandatory asset update?"
2.  **Yes**: RN displays "Downloading Magic..." UI.
3.  **Bridge Call**: RN sends `{ "action": "updateCatalogs" }`.
4.  **Unity**:
    ```csharp
    yield return Addressables.UpdateCatalogs();
    yield return Addressables.DownloadDependenciesAsync("Feature_VFX_Brushes");
    ```
5.  **Completion**: Unity sends `{ "type": "downloadComplete" }`.
6.  **Play**: RN removes loading screen.

## 6. S3/R2 Setup Guide
*   **Bucket Policy**: Public Read (or Signed URLs if premium content).
*   **CORS**: Must allow `GET` from `http://localhost` (Unity Editor) and `h3m://app`.
*   **MIME Types**: Ensure `.bundle` is served as `application/octet-stream`.

## 7. Operational Checklist
*   [ ] **Create Bucket**: `portals-assets-prod`.
*   [ ] **Configure CI**: GitHub Action to run `BuildContentUpdate` and upload to R2 via `rclone`.
*   [ ] **Verify Cache**: Set `Cache-Control: max-age=31536000` for `.bundle` files, but `max-age=0` for `.hash` and `.json` (Catalogs must never cache!).
