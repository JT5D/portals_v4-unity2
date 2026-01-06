# Build & Release Checklist

Use this checklist before exporting Unity or running native builds.

## Pre-build gates (Status: Active)
- [ ] `npm test` (Jest) must pass
- [ ] `npm run unity:validate` (batchmode Unity compile check)
- [ ] Run Unity `MCP/Verify Tools` to confirm MCP scripts are active
- [ ] In Unity `File > Build Settings`, ensure `UnityTestScene.unity` (and any active scenes) are enabled
- [ ] `.env` exists locally (copy from `.env.example`); never commit secrets or share real keys in logs/builds
- [ ] (iOS on macOS 15) Xcode 16.4 selected: `export DEVELOPER_DIR=/Applications/Xcode-164.app/Contents/Developer` (download if needed: https://developer.apple.com/download/all/?q=Xcode%2016.4); classic linker flags are applied automatically by `scripts/build_and_run_ios.sh`

## Unity exports (Status: Active)
- [ ] Re-export iOS `UnityFramework.framework` to `unity/builds/ios` (see unity/UNITY_BUILD_EXPORT_GUIDE.md)
- [ ] `npm run unity:check` (verify iOS Data + Android unityLibrary present)
- [ ] Re-run `cd ios && pod install` (or `npm run setup`) after iOS export to refresh UnityFramework + Data in Pods
- [ ] Re-export Android with `Export Project` checked to `unity/builds/android`; strip launcher intent from `unityLibrary` manifest if present

## Bridge validation (post-export) (Status: Active)
- [ ] Start tunnel + install: `npm run ios`
- [ ] Open `UnityTestScene` and press the test button; expect log: `The button has been tapped!`

## Ready for release (Status: Active)
- [ ] Pods/gradle refreshed as needed (`npm run setup` for full reset)
- [ ] CI (`.github/workflows/ci.yml`) green on PR
