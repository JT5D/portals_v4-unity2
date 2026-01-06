# CRITICAL_README.md - iOS App Launch Requirements

> ⚠️ **READ THIS BEFORE RUNNING THE APP** ⚠️

This document outlines critical issues with the iOS build and how they are managed.

---

## 🚨 Known Issues & Fixes

### 1. ViroReact Version (CRITICAL)

**Problem**: ViroReact 2.50.0 causes native crashes on iOS due to missing dynamic framework dependencies (`GTMSessionFetcher`, `GoogleToolboxForMac`).

**Fix**: `@reactvision/react-viro` is pinned to version `2.43.6` exactly.

```json
// package.json - DO NOT CHANGE THIS
"@reactvision/react-viro": "2.43.6"
```

⚠️ **Never use `^2.43.6`** - the caret allows npm to install newer broken versions.

---

### 2. ViroMaterials Asset Registry Patch (CRITICAL)

**Problem**: ViroMaterials.js uses `__importDefault` wrapper but React Native 0.81.5's AssetRegistry only has named exports. This causes:
```
TypeError: Cannot read property 'getAssetByID' of undefined
```

**Fix**: A patch is applied automatically via `patch-package`.

**Files involved**:
- `patches/@reactvision+react-viro+2.43.6.patch` - The fix
- `package.json` → `"postinstall": "patch-package"` - Auto-applies on install

⚠️ **The `patches/` directory MUST be committed to git.**

---

### 3. Metro Connection Issues on Physical Device

**Problem**: Physical iOS devices show "No development servers found" when using local network.

**Fix**: Use tunnel mode for reliable connectivity:

```bash
npx expo start --dev-client --tunnel
```

The tunnel URL will be displayed (e.g., `portals://expo-development-client/?url=https://xxxxx-8081.exp.direct`). Scan the QR code or enter the URL manually on device.

**If tunnel shows localhost instead of the ngrok URL:**

1. Ensure `@expo/ngrok` is installed locally:
   ```bash
   npm install --save-dev @expo/ngrok@^4.1.0
   ```

2. Copy the global install to local node_modules if needed:
   ```bash
   cp -r $(npm root -g)/@expo/ngrok node_modules/@expo/
   ```

3. Kill stale ngrok processes:
   ```bash
   pkill -f ngrok
   ```

4. Ensure the Android directory has the matching URI scheme:
   ```bash
   npx expo prebuild --platform android --clean
   ```

---

## 📋 Automation & Setup (NEW)

We have automated the most common fixes to ensure a "one-click" build experience for team members.

### 1. The "Magic" Setup Command
If you are setting up for the first time or after a major update, just run:
```bash
npm run setup
```
This command performs:
- `npm install` (and applies all patches)
- `npx expo prebuild` (refreshes native files cleanly)
- `pod install` (with custom automation for New Arch, Maps, and Teams)

### 2. Native Automation (Podfile)
The `ios/Podfile` now automatically:
- Sets the **Development Team** to `Z8622973EB`.
- Corrects **Swift Explicit Modules** (prevents "no such module Expo").
- Fixes **react-native-maps** and **RNSVG** "Undefined symbols" at runtime.

### 3. Critical Patches
The `patches/` directory now includes a comprehensive fix for `@reactvision/react-viro@2.43.6`:
- **PromisesObjC**: Adds the missing dependency to `ViroKit.podspec`.
- **AssetRegistry**: Fixes the `getAssetByID` crash in React Native 0.81.
- **GoogleKitHUD**: `scripts/patch-virokit.sh` automatically creates missing localization files.

---

## 🔧 Manual Troubleshooting
If the app still fails:
1. **App crashes on launch**: Run `npm run setup` to ensure all native code and API keys are correctly injected.
2. **"No development servers found"**: Use tunnel mode: `npx expo start --dev-client --tunnel`

### Videos/content not loading
- Ensure device has internet connectivity
- Use tunnel mode instead of local network

---

## 📦 For TestFlight / Production Builds

The patches are automatically applied during the build process:

1. ✅ `patch-package` is in devDependencies
2. ✅ `postinstall` script applies patches after `npm install`
3. ✅ **Commit the `patches/` directory to git**

No manual intervention needed for CI/CD builds.

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `package.json` | ViroReact version + postinstall script |
| `patches/@reactvision+react-viro+2.43.6.patch` | AssetRegistry fix |
| `ios/Podfile` | CocoaPods configuration |
| `ios/Podfile.lock` | Locked pod versions |

---

*Last updated: January 5, 2026*

---

## 🌍 Cross-Platform & Geospatial Configuration

### Expo Plugin
ViroReact's Expo plugin is configured in `app.json`:
```json
["@reactvision/react-viro", {
  "android": { "xRMode": ["AR"] }
}]
```

### Geospatial Features (Future)
To enable Cloud Anchors or Geospatial API, add your Google Cloud API key:
```json
["@reactvision/react-viro", {
  "googleCloudApiKey": "YOUR_ARCORE_API_KEY",
  "geospatialAnchorProvider": "arcore",
  "cloudAnchorProvider": "arcore",
  "android": { "xRMode": ["AR"] }
}]
```

Get an API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and enable the ARCore API.

### Android Build
For Android, run `npx expo prebuild` then build through Android Studio or:
```bash
npx expo run:android --device
```

### iOS Bundle Identifier
Set in `app.json`: `com.portals.app`
Update this if deploying to App Store.
