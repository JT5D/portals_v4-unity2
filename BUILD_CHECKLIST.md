# Build & Release Checklist

Use this checklist before exporting Unity or running native builds.

## Pre-build gates
- [ ] `npm test` (Jest) must pass
- [ ] Run Unity `MCP/Verify Tools` to confirm MCP scripts are active
- [ ] In Unity `File > Build Settings`, ensure `UnityTestScene.unity` (and any active scenes) are enabled
- [ ] (iOS on macOS 15) Xcode 26.1 selected: `export DEVELOPER_DIR=/Applications/Xcode-261.app/Contents/Developer` (download if needed: https://developer.apple.com/download/all/?q=Xcode%2026.1); classic linker flags are applied automatically by `scripts/build_and_run_ios.sh`

## Unity exports
- [ ] Re-export iOS `UnityFramework.framework` to `unity/builds/ios` (see unity/UNITY_BUILD_EXPORT_GUIDE.md)
- [ ] Re-run `npx expo prebuild --platform ios --clean` after iOS export to refresh Unity Data resources in Xcode
- [ ] Re-export Android with `Export Project` checked to `unity/builds/android`; strip launcher intent from `unityLibrary` manifest if present

## Bridge validation (post-export)
- [ ] Start tunnel: `npm run tunnel`
- [ ] iOS device: `npx expo run:ios --device`
- [ ] Open `UnityTestScene` and press the test button; expect log: `The button has been tapped!`

## Ready for release
- [ ] Pods/gradle refreshed as needed (`npm run setup` for full reset)
- [ ] CI (`.github/workflows/ci.yml`) green on PR
