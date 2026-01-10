# Global Project Rules
- **Search Date**: Always include results through the current date (2026-01-08). Do not limit to '2025' or '2024'.
- **Priorities**: Align development with '_JT_PRIORITIES.md' from Portals V6.

## Debugging & Iteration Protocols
- **State-of-the-Art Debugging**:
  - **Isolate**: Use "Binary Search" to identify if the issue is Unity, React Native, the Bridge, or the Deployment pipeline.
  - **Verbose Manual Fallback**: If an automated script fails (e.g., `pod install`), immediately run the raw command with verbose flags (`pod install --verbose`) to capture the exact error. Do not guess.
  - **Automated Verification**: Use scripts like `verify_device_logs.sh` to confirm success/failure on the physical device immediately after deployment.

- **Iteration Speed (Hyper-Optimization)**:
  - **Skip Unchanged Steps**: Use build flags (`--skip-unity-export`, `--skip-pod-install`) to bypass 90% of the build time when only specific components have changed.
  - **Framework Persistence**: Be aware that `UnityFramework.framework` is ephemeral in `DerivedData`. If `pod install` fails, verify the framework exists in `node_modules` and force-restore it if necessary.
  - **Live Reload First**: Validate logical changes in React Native (fast refresh) or Unity Editor (Play Mode) *before* attempting a full native build.

- **Persistent Failures (Nuclear Option)**:
  - **Clean Slate Protocol**: When stuck in a "Linker Loop" or "Pod Install Failure", DO NOT retry incrementally.
  - **Kill**: `killall -9 Unity Hub xcodebuild java` (Kill all ghosts).
  - **Purge Caches**:
    - `rm -rf ~/Library/Developer/Xcode/DerivedData`
    - `rm -rf unity/Library/ScriptAssemblies unity/Library/Bee` (Force C# Recompile)
    - `rm -rf android/build ios/build ios/Pods`
  - **Reboot**: Restart the build daemon or machine if issues persist >30 mins.
  - **Disable Caching**: If debugging weird state, assume `ccache` (if installed) or `DerivedData` is lying. Purge them.

- **Best Practices (No Hacks)**:
  <!-- DISABLED: quick_iterate.sh needs debugging
  - **Fast Iteration Safety**: Use `quick_iterate.sh` ONLY for React Native logic or simple Native Code changes. If you touch Unity C# or Assets, you **MUST** run a full export/build.
  -->
  - **Single Source of Truth**: NEVER manually copy-paste binaries (e.g., UnityFramework) to fix a build. Fix the *pipeline* that generates them.
  - **Adhere to Standards**: If a standard tool (like CocoaPods or Unity Build Player) exists, use it. Do not invent custom shell scripts to bypass standard linking phases.
  - **Reproducibility**: If you can't script it, don't do it. Manual fixes are technical debt.

- **Research Strategy (Deep Accuracy)**:
  - **Verify Sources**: Before implementing a fix, confirm it via Official Docs, Trusted GitHub Repos, or Expert Forums.
  - **No Assumptions**: "I think this works" is not acceptable. "I verified this behavior in the 2025 Unity Manual" is required.
  - **Triple Check**: Validate architecture against current constraints (e.g., "Is this deprecated in React Native 0.81?") before writing code.
