# Git Commit Message Best Practices

**Quick Reference**: Write detailed commits for human and AI understanding.

---

## Structure

```
[Component] Short summary (50 chars max)

What Changed:
- Specific file/module modifications
- New functionality or refactoring

Why:
- Root cause or motivation
- Impact on system behavior

Testing:
- How to verify it works
- Expected behavior

Impact:
- Affected features
- Performance/security implications

Related:
- Fixes #123
- See: docs/file.md

Next Steps:
- Follow-up work needed

Co-Authored-By: Name <email>
```

---

## Example: Good Commit

```
[Unity/iOS] Fix UnityFramework mismatch causing bridge communication failure

React Native Unity integration failed to receive messages despite visible
scene. Root cause: package's default UnityFramework loaded instead of
custom build with BridgeTarget methods.

What Changed:
- scripts/build_and_run_ios.sh: Auto-copy custom UnityFramework to
  node_modules/@azesmway/react-native-unity/ios/
- ios/Podfile: Added post_install hook for verification

Why:
- CocoaPods used package's bundled framework (outdated, no bridge)
- Custom framework has BridgeTarget native methods for RN↔Unity comm
- Manifested as: scene visible ✅, ping button non-functional ❌

Testing:
1. Build: ./scripts/build_and_run_ios.sh
2. Verify: ls -la node_modules/@azesmway/.../UnityFramework.framework/
3. Launch app → Unity AR Test → Tap "Ping Unity"
4. Console logs: "The button has been tapped!" and pong JSON

Impact:
- ✅ Fixes Unity↔RN bridge communication
- ✅ Enables all future messaging features
- ⚠️  Affects build workflow (requires build script)

Related:
- Fixes #234
- See: UNITY_SCENE_ANALYSIS.md

Next Steps:
- Add framework checksum verification
- Document manual pod install workaround

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Component Prefixes

- `[Unity/Core]` - Scene, GameObject, Component
- `[Unity/Scripts]` - C# scripts
- `[Unity/iOS]` - iOS-specific Unity
- `[RN/UI]` - Screen, component, styling
- `[RN/Native]` - Native module bridges
- `[Build]` - Build scripts, automation
- `[Docs]` - Documentation
- `[Git]` - Git hooks, configuration

---

## Best Practices

**DO ✅**:
- Explain WHY (code shows what)
- Include verification steps
- Link issues/commits
- Document limitations
- Use imperative mood ("Fix" not "Fixed")
- Wrap body at 72 chars

**DON'T ❌**:
- Assume context
- Be vague ("fix stuff")
- Skip the body (unless trivial)
- Mix unrelated changes
- Use past tense

---

## Platform-Specific

**Unity**: Include version, platform, packages, performance impact
**React Native**: Include RN version, platform, native modules, Metro impact

---

## Checklist

- [ ] Subject line clear? (50 chars max)
- [ ] Explained WHY needed?
- [ ] Listed WHAT changed?
- [ ] Included HOW to verify?
- [ ] Documented limitations?
- [ ] Linked related work?
- [ ] Suggested next steps?
- [ ] Would future dev understand?
- [ ] Can AI parse structure?
- [ ] Used imperative mood?
- [ ] Credited co-authors?

---

**Remember**: Every commit is documentation. Write for your future self and your team.
