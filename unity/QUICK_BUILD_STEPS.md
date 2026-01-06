# Quick Unity Build Export Steps

**Current Status:** Unity project ready to build (0 errors, scenes configured)

## Option 1: Manual Export (5-10 minutes, Standard Method)

### iOS Build
```
1. Open Unity Editor
   → Double-click: unity/portals_v4.unity

2. In Unity: File → Build Settings
   → Platform: iOS
   → Switch Platform (if needed)
   → Click "Build" button
   → Location: unity/builds/ios_export
   → Wait for export (~2-5 min)

3. Open in Xcode
   → open unity/builds/ios_export/Unity-iPhone.xcodeproj

4. Configure UnityFramework
   → Select "Data" folder → Target Membership → Check "UnityFramework"
   → Navigate to Libraries/Plugins/iOS/NativeCallProxy.h
   → Target Membership → Change to "Public" (UnityFramework)

5. Build Framework
   → Select "UnityFramework" scheme
   → Product → Build (⌘B)
   → Right-click UnityFramework.framework → Show in Finder

6. Copy to RN project
   mkdir -p unity/builds/ios
   cp -R [path-from-finder]/UnityFramework.framework unity/builds/ios/

7. Clean & rebuild RN
   rm -rf ios/Pods ios/Podfile.lock
   npx pod-install
```

### Android Build
```
1. In Unity: File → Build Settings
   → Platform: Android
   → Switch Platform (if needed)
   → ✅ CHECK "Export Project"
   → Click "Build"
   → Location: unity/builds/android
   → Wait for export (~2-5 min)

2. Clean AndroidManifest
   → Edit: unity/builds/android/unityLibrary/src/main/AndroidManifest.xml
   → Remove the <intent-filter> block

3. Build RN Android
   npx expo run:android --device
```

## Option 2: Use Unity MCP (One-Time Setup Required)

**First time only:**
```
1. Open Unity Editor
2. Window → MCP for Unity
3. Transport: HTTP Local
4. Click "Start Server"
5. Verify: lsof -i :8080
```

**Then Claude can automate builds via MCP tools**

---

**Ready to build?** Just need to run steps above. The Unity project is fully configured and compiles with 0 errors.
