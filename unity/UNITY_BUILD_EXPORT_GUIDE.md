# Unity Build Export Guide for React Native Integration

**Project:** Portals v4 - Unity Integration
**Package:** @azesmway/react-native-unity v1.0.11
**Unity Version:** 6000.2.14f1
**Last Updated:** 2026-01-06

---

## ✅ Current Status

### Completed Setup
- ✅ Unity project structure created
- ✅ UnityTestScene.unity created with basic AR camera setup
- ✅ SampleScene.unity exists as default scene
- ✅ Both scenes added to Build Settings
- ✅ Native bridge (Plugins/iOS/NativeCallProxy) copied from @azesmway package
- ✅ Unity Test Framework package installed (v1.1.33)
- ✅ Unity MCP package installed for automated testing
- ✅ Python `uv` tool manager installed

### Unity Package Dependencies
```json
{
  "com.unity.test-framework": "1.1.33",
  "com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity",
  "com.unity.multiplayer.center": "1.0.0",
  "com.unity.xr.management": "4.5.4"
}
```

---

## 🎯 Next Steps: Export Unity Builds

### Option 1: Unity MCP Automated Testing (Recommended)

Unity MCP enables automated builds and testing via Claude Code.

**1. Start Unity MCP Server**
```
Window > MCP for Unity
Transport: HTTP Local
Click "Start Server"
```

This starts the Python server on `http://localhost:8080/mcp`

**2. Verify Connection**
```bash
# Check if server is running
lsof -i :8080

# Test with curl
curl http://localhost:8080/mcp
```

**3. Use Claude Code to automate builds**
Once connected, Claude can use MCP tools to:
- Check console for errors
- Configure build settings
- Export iOS/Android builds
- Run automated tests

---

### Option 2: Manual Build Export (Standard Method)

Follow the official @azesmway/react-native-unity workflow:

#### iOS Build Export

**Step 1: Export Unity Project**
```
File > Build Settings
Platform: iOS
Switch Platform (if needed)
Build: Click "Build" (NOT "Build and Run")
Location: unity/builds/ios_export
```

**Step 2: Open in Xcode**
```bash
open unity/builds/ios_export/Unity-iPhone.xcodeproj
```

**Step 3: Configure UnityFramework**
1. Select `Data` folder in Project Navigator
2. In "Target Membership" section, check `UnityFramework`
3. Navigate to `Unity-iPhone/Libraries/Plugins/iOS/`
4. Select `NativeCallProxy.h`
5. Change target membership from "Project" to "Public" under UnityFramework

**Step 4: Build UnityFramework**
1. Select `UnityFramework` scheme
2. Product > Build (⌘B)
3. Right-click UnityFramework.framework in Products
4. Show in Finder

**Step 5: Copy Framework to React Native**
```bash
# Create destination if needed
mkdir -p unity/builds/ios

# Copy the framework
cp -R unity/builds/ios_export/Products/UnityFramework.framework unity/builds/ios/
```

**Step 6: Clean React Native iOS Build**
```bash
cd /Users/jamestunick/Documents/GitHub/portals_v4
rm -rf ios/Pods
rm -f ios/Podfile.lock
npx pod-install
```

#### Android Build Export

**Step 1: Export Unity Project**
```
File > Build Settings
Platform: Android
Switch Platform (if needed)
Export Project: ✅ CHECK THIS
Build: Click "Build"
Location: unity/builds/android
```

**Step 2: Clean Up AndroidManifest**
```bash
# Remove <intent-filter> to avoid launcher conflicts
# File: unity/builds/android/unityLibrary/src/main/AndroidManifest.xml

# Remove these lines:
<intent-filter>
  <action android:name="android.intent.action.MAIN" />
  <category android:name="android.intent.category.LAUNCHER" />
</intent-filter>
```

**Step 3: Build React Native Android**
```bash
npx expo run:android --device
```

---

## 📝 Unity → React Native Communication

### React Native Side
```typescript
// src/components/UnityArView.tsx
import UnityView from '@azesmway/react-native-unity';

const unityRef = useRef<UnityView>(null);

// Send message to Unity
unityRef.current?.postMessage(
  'GameObjectName',  // GameObject in Unity scene
  'MethodName',      // Method on the GameObject script
  'message'          // String message (usually JSON)
);

// Receive messages from Unity
<UnityView
  ref={unityRef}
  onUnityMessage={(event) => {
    console.log('Unity says:', event.nativeEvent.message);
  }}
/>
```

### Unity Side (iOS)
```csharp
// Send message to React Native
public class NativeAPI {
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")]
    public static extern void sendMessageToMobileApp(string message);
#endif
}

public void SendToRN() {
    #if UNITY_IOS && !UNITY_EDITOR
    NativeAPI.sendMessageToMobileApp("Hello from Unity!");
    #endif
}
```

### Unity Side (Android)
```csharp
// Send message to React Native
public void SendToRN() {
    using (AndroidJavaClass jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
    {
        jc.CallStatic("sendMessageToMobileApp", "Hello from Unity!");
    }
}
```

---

## 🐛 Troubleshooting

### iOS Build Issues
**"MTLTextureDescriptor has width of zero"**
- The UnityView needs a parent with dimensions > 0
- Solution: Add `style={{ flex: 1 }}` to UnityView

**Missing NativeCallProxy.h**
- You didn't copy the Plugins folder from node_modules
- Solution: Run `cp -r node_modules/@azesmway/react-native-unity/unity/Assets/Plugins unity/Assets/`

**Framework not found**
- UnityFramework.framework not in unity/builds/ios/
- Solution: Rebuild in Xcode and copy to correct location

### Android Build Issues
**App launches Unity instead of React Native**
- AndroidManifest has `<intent-filter>` in unityLibrary
- Solution: Remove the intent-filter from unityLibrary/AndroidManifest.xml

**Missing unityLibrary**
- Android build not exported to correct location
- Solution: Ensure "Export Project" is checked, export to `unity/builds/android`

### Unity MCP Issues
**Server won't start**
- Check if `uv` is installed: `which uv`
- Check Unity console for Python errors
- Try: `Window > MCP for Unity > Start Server`

**Port 8080 in use**
- Another process is using the port
- Solution: `lsof -i :8080` then kill the process or change port in Unity MCP settings

---

## 📚 References

- [@azesmway/react-native-unity README](https://github.com/azesmway/react-native-unity)
- [Unity MCP GitHub](https://github.com/CoplayDev/unity-mcp)
- [React Native Unity Integration Guide](https://medium.com/@selvaannies/integrating-unity-into-react-native-android-using-azesmway-react-native-unity-2905f47aa14d)

---

## 🔄 Quick Command Reference

```bash
# Open Unity project
open -a "Unity Hub" /Users/jamestunick/Documents/GitHub/portals_v4/unity

# Check Unity log for errors
tail -f ~/Library/Logs/Unity/Editor.log | rg "error CS"

# Test iOS build
npx expo run:ios --device

# Test Android build
npx expo run:android --device

# Clean React Native builds
rm -rf ios/Pods ios/Podfile.lock android/build android/app/build
npm run setup
```
