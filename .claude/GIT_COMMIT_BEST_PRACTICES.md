# Git Commit Message Best Practices

**Purpose**: Ensure commits provide maximum context for human developers and AI tools
**Audience**: Development team, future maintainers, AI code analysis tools
**Standards**: Git, Plastic SCM, Unity, React Native, Unix conventions

---

## Commit Message Structure

### Format Template

```
[Component] Short summary of change (50 chars max)

Detailed explanation of what changed and why. Wrap at 72 characters.
Explain the problem this solves and the approach taken. Include context
that isn't obvious from the code itself.

What Changed:
- Specific file or module modifications
- New functionality added
- Code refactoring details
- Configuration changes
- Dependency updates

Why:
- Root cause or motivation for change
- Business/technical context
- Impact on system behavior
- Performance implications
- Security considerations

Technical Details:
- Implementation approach
- Algorithm or pattern used
- Platform-specific considerations (iOS/Android/Unity)
- Breaking changes or compatibility notes
- Migration steps if needed

Testing:
- How to verify the change works
- What scenarios were tested
- Expected vs actual behavior
- Manual testing steps
- Automated test coverage

Known Issues/Limitations:
- Edge cases not handled
- Temporary workarounds
- Future improvements needed
- Performance bottlenecks

Impact:
- Affected features or modules
- User-facing changes
- Developer workflow changes
- Build/deployment changes

Related:
- Issue numbers: Fixes #123, Relates to #456
- Pull request numbers
- Related commits (SHA or description)
- Documentation updates
- External references (API docs, blog posts, Stack Overflow)

Next Steps:
- Follow-up work required
- Suggested improvements
- Known technical debt created
- Future refactoring opportunities

Co-Authored-By: Name <email@domain.com>
```

---

## Real-World Examples

### ❌ Poor Commit Message

```
fix bug

fixed the thing that was broken
```

**Problems**:
- No context about what bug
- No explanation of fix
- No way to verify
- Useless for git log, git blame, code review
- AI tools can't understand intent

### ✅ Good Commit Message

```
[Unity/iOS] Fix UnityFramework mismatch causing bridge communication failure

The React Native Unity integration was failing to receive messages from
Unity despite scene being visible. Root cause: package's default
UnityFramework (without custom BridgeTarget methods) was loaded instead
of the custom-built framework.

What Changed:
- scripts/build_and_run_ios.sh: Auto-copy custom UnityFramework to
  node_modules/@azesmway/react-native-unity/ios/ after Unity export
- ios/Podfile: Added post_install hook to verify custom framework used
- Added framework checksum verification step

Why:
- CocoaPods was using package's bundled framework (outdated, no bridge)
- Custom UnityFramework has BridgeTarget native methods for RN↔Unity comm
- Build script didn't ensure node_modules had latest custom framework
- Manifested as: scene visible ✅, ping button non-functional ❌

Technical Details:
- Framework location: ios/Build/UnityFramework.framework
- Target location: node_modules/@azesmway/react-native-unity/ios/
- Copy happens after Unity export, before pod install
- Symlinks not used (CocoaPods resolves them, causing issues)

Testing:
1. Build iOS: ./scripts/build_and_run_ios.sh
2. Verify framework: ls -la node_modules/@azesmway/.../UnityFramework.framework/
3. Launch app, navigate to Unity AR Test
4. Tap "Ping Unity" - should show pong response in debug overlay
5. Console should log: "The button has been tapped!" and pong JSON

Known Issues/Limitations:
- Manual deletion of node_modules requires full rebuild
- No automated checksum verification yet (future improvement)
- Relies on build script always running (manual pod install will fail)

Impact:
- ✅ Fixes: Unity↔RN bridge communication
- ✅ Enables: Ping/pong testing, all future messaging
- ⚠️  Affects: Build workflow (requires build script, not direct pod install)
- 📊 Performance: No change (framework size identical)

Related:
- Fixes #234 - "Ping Unity button not working"
- Related to commit ca5d549 (Unity scene camera fix)
- See: UNITY_SCENE_ANALYSIS.md for architecture details
- Package issue: https://github.com/azesmway/react-native-unity/issues/123

Next Steps:
- Add framework checksum verification to build script
- Document manual pod install workaround
- Consider submitting PR to package for custom framework support
- Add automated test for bridge communication

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Why This Is Better**:
- ✅ Clear component scope: Unity/iOS
- ✅ Specific problem and solution
- ✅ Root cause analysis
- ✅ Exact files changed with reasoning
- ✅ Step-by-step verification
- ✅ Known limitations documented
- ✅ Impact on features and workflow
- ✅ Connections to related work
- ✅ Future improvements identified
- ✅ Searchable keywords (UnityFramework, bridge, CocoaPods)
- ✅ AI can parse structure and extract insights
- ✅ git log, git blame provide full context
- ✅ Code review has all info needed

---

## Component Prefixes

Use consistent prefixes to identify affected areas:

**Unity**:
- `[Unity/Core]` - Scene, GameObject, Component changes
- `[Unity/Scripts]` - C# script modifications
- `[Unity/Assets]` - Prefabs, materials, assets
- `[Unity/Build]` - Build settings, player settings
- `[Unity/iOS]` - iOS-specific Unity changes
- `[Unity/Android]` - Android-specific Unity changes

**React Native**:
- `[RN/UI]` - Screen, component, styling
- `[RN/Navigation]` - Navigation, routing
- `[RN/State]` - State management, context
- `[RN/Native]` - Native module bridges
- `[RN/iOS]` - iOS-specific RN changes
- `[RN/Android]` - Android-specific RN changes

**Build/Infrastructure**:
- `[Build]` - Build scripts, automation
- `[CI/CD]` - Continuous integration, deployment
- `[Config]` - Configuration files
- `[Deps]` - Dependency updates

**Documentation**:
- `[Docs]` - Documentation updates
- `[Readme]` - README changes
- `[Guide]` - Tutorial or guide additions

**Tooling**:
- `[Git]` - Git hooks, git configuration
- `[Scripts]` - Utility scripts
- `[DevOps]` - Developer operations, automation

**Examples**:
```
[Unity/iOS] Fix camera clear flags for RN rendering
[RN/UI] Add ready state tracking to UnityArView
[Build] Automate UnityFramework copy to node_modules
[Docs] Add comprehensive Unity scene architecture guide
[Git] Enhance Discord webhook with author name mapping
```

---

## Best Practices

### DO ✅

1. **Write for the future**: Assume reader has no context
2. **Explain why, not just what**: Code shows what, commits explain why
3. **Include verification steps**: How to test the change
4. **Link related issues/commits**: Build knowledge graph
5. **Document limitations**: Be honest about workarounds
6. **Suggest next steps**: Help future developers
7. **Use imperative mood**: "Fix bug" not "Fixed bug" or "Fixes bug"
8. **Wrap at 72 chars**: For terminal readability
9. **Separate subject from body**: Blank line between
10. **Use bullet points**: For scanability

### DON'T ❌

1. **Assume context**: Not everyone knows the background
2. **Be vague**: "Fix stuff" tells nothing
3. **Skip the body**: Unless change is trivial (typo fix)
4. **Mix unrelated changes**: One logical change per commit
5. **Commit broken code**: Every commit should be buildable
6. **Use past tense**: "Add feature" not "Added feature"
7. **Exceed 50 chars in subject**: Git log truncates
8. **Forget Co-Authored-By**: Credit collaborators (including AI)

---

## Platform-Specific Guidance

### Unity Commits

**Always Include**:
- Unity version (e.g., "Unity 6000.2.14f1")
- Target platform (iOS/Android/WebGL/Standalone)
- Package versions if relevant (AR Foundation, URP, XRI)
- Scene file changes (scenes are binary, explain what changed)
- Build settings impact
- Performance implications

**Example**:
```
[Unity/iOS] Optimize particle system for Quest 2 performance

Reduced draw calls from 45 to 12 by batching VFX Graph emissions.
Changed from GPU particles to CPU particles for better mobile performance.
Target: 90 FPS on Quest 2, 60 FPS on iPhone 12+.

What Changed:
- Assets/VFX/BrushParticles.vfx: Switched to CPU particles, enabled instancing
- Changed capacity from 10000 to 1000 (still sufficient for brush effect)
- Enabled mesh instancing for particle meshes

Performance:
- Before: 45 FPS (Quest 2), 30 FPS (iPhone 12)
- After: 90 FPS (Quest 2), 65 FPS (iPhone 12)
- Draw calls: 45 → 12 (73% reduction)

Testing:
- Tested on Quest 2 (v57 firmware)
- Tested on iPhone 12 (iOS 18.1)
- Profiled with Unity Profiler (see attached screenshot)

Unity Version: 6000.2.14f1
Packages: VFX Graph 17.0.2, URP 17.0.2
```

### React Native Commits

**Always Include**:
- React Native version
- Platform (iOS/Android/both)
- Native module changes
- Metro bundler impact
- Third-party package versions

**Example**:
```
[RN/Native] Add Unity ready state handshake to prevent message loss

React Native was sending messages to Unity before Unity initialized,
causing messages to be lost. Added two-way handshake: Unity signals
ready on Start(), RN waits for signal before enabling UI.

What Changed:
- src/components/UnityArView.tsx: Added onUnityMessage handler for unity_ready
- src/screens/UnityTestScene.tsx: Added unityReady state, disabled ping until ready
- unity/Assets/Scripts/BridgeTarget.cs: Send unity_ready message on Start()

Why:
- Unity initialization takes 2-5 seconds after view mounts
- RN Fabric architecture (New Architecture) mounts views asynchronously
- No built-in ready signal from @azesmway/react-native-unity package
- Race condition: user could tap ping before Unity receives messages

Technical Details:
- Message format: {"type":"unity_ready","source":"unity","ts":123.456}
- RN receives via onUnityMessage callback
- Ping button disabled until unityReady === true
- Visual feedback: "⏳ Initializing..." → "✅ Ready"

Testing:
1. Launch app (Metro on port 8081)
2. Navigate to Unity AR Test screen
3. Observe status change from "Initializing" to "Ready" (2-5 sec)
4. Verify ping button becomes enabled only after "Ready"
5. Test rapid app launches (kill/relaunch 10x) - no race conditions

Impact:
- ✅ Fixes: Message loss on fast taps
- ✅ Improves: User experience with clear status
- 📊 Performance: Negligible (single message on startup)

React Native: 0.73.2
iOS: 18.1+
Android: Not tested yet

Related:
- Fixes #245 - "Ping sometimes doesn't work"
- See: UNITY_SCENE_ANALYSIS.md section on Bridge Communication

Next Steps:
- Add timeout if Unity doesn't send ready signal (fail gracefully)
- Add retry mechanism for lost messages
- Test on Android (message passing uses different native bridge)
```

---

## Git Log as Documentation

Your commit history is living documentation:

```bash
# Find all Unity-related changes
git log --grep="Unity" --oneline

# Find performance improvements
git log --grep="performance\|optimize" --oneline

# Find iOS-specific changes
git log --grep="iOS" --oneline

# See what changed in a file
git log --follow -- src/components/UnityArView.tsx

# Find commits by author
git log --author="James Tunick"

# Full context for a commit
git show <commit-hash>

# See commits that changed specific function
git log -L :FunctionName:path/to/file.ts
```

AI tools (Claude Code, GitHub Copilot, Cursor) parse these patterns for context.

---

## Commit Message Checklist

Before committing, ask:

- [ ] Does the subject line clearly describe the change?
- [ ] Is the subject line 50 chars or less?
- [ ] Did I explain WHY this change was needed?
- [ ] Did I list WHAT specifically changed?
- [ ] Did I include HOW to verify it works?
- [ ] Did I document any limitations or known issues?
- [ ] Did I link related issues/commits?
- [ ] Did I suggest next steps or improvements?
- [ ] Would a developer 6 months from now understand this?
- [ ] Would an AI tool be able to parse and understand this?
- [ ] Did I use imperative mood ("Add" not "Added")?
- [ ] Did I credit co-authors (including AI)?

---

## Tools Integration

### Discord Webhook

Commit messages are automatically posted to Discord via git post-push hook:
```
New Checkin: James Tunick (@imclab)
Repo: portals_v4
Branch: react-unity
Commit: [Your subject line]
https://github.com/...
```

**Optimize for Discord**:
- Subject line should be meaningful in isolation
- Keep subject under 50 chars (Discord truncates)
- Discord shows subject only, not body

### GitHub

**Optimize for GitHub**:
- First line becomes PR title if squash merged
- Body becomes PR description
- `Fixes #123` auto-closes issues
- `Co-Authored-By` shows multiple authors

### AI Code Analysis

**Optimize for AI**:
- Use structured sections (What/Why/Testing)
- Include component prefixes [Unity/RN/Build]
- Link related commits and docs
- Use consistent terminology
- Explain non-obvious decisions

---

## Common Patterns

### Bug Fix

```
[Component] Fix specific bug description

The bug manifested as [symptom]. Root cause was [explanation].

What Changed:
- file.ts: Specific code change

Why:
- Original code had [flaw]
- New code [fixes it by...]

Testing:
- Reproduce: [steps to reproduce original bug]
- Verify: [steps to verify fix]

Fixes #123
```

### Feature Addition

```
[Component] Add feature name

Adds [feature] to enable [use case]. Users can now [capability].

What Changed:
- New files: [list]
- Modified files: [list]
- New dependencies: [list]

Why:
- User need: [description]
- Business value: [description]

Testing:
- [Step-by-step usage]

Next Steps:
- [Future enhancements]
```

### Refactoring

```
[Component] Refactor X to improve Y

Refactored [module] to [improvement]. No behavior changes.

What Changed:
- Extracted [abstraction]
- Simplified [logic]
- Removed [dead code]

Why:
- Original code was [problem]
- New structure [benefit]

Testing:
- All existing tests pass
- No behavior changes (verified by [method])
```

### Documentation

```
[Docs] Add comprehensive guide for X

Created detailed documentation for [topic] covering [aspects].

What Changed:
- New file: [path]
- Updated: [related docs]

Why:
- Existing docs didn't cover [gap]
- Team needed [reference]

Includes:
- [Key sections]
```

---

**Remember**: Every commit is a message to your future self and your team. Write it like you're explaining to a colleague who will maintain this code for years.
