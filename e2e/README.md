# E2E (Detox) Smoke Tests

These tests are intended for physical iOS devices because Unity does not run in the iOS simulator.

## Prerequisites
- Xcode 16.4+ selected
- Dev client installed on the device
- Metro running via tunnel (npm run tunnel)

## Build + Run (device)

```bash
npm run e2e:ios:build
npm run e2e:ios
```

## Notes
- The Unity test is currently skipped until navigation deep links or testIDs are wired to reach `UnityTestScene`.
