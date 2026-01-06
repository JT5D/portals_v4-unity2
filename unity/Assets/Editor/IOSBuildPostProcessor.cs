using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;
using UnityEngine;

public class IOSBuildPostProcessor
{
    [PostProcessBuild(1000)]
    public static void OnPostProcessBuild(BuildTarget buildTarget, string buildPath)
    {
        if (buildTarget != BuildTarget.iOS) return;

        string projectPath = PBXProject.GetPBXProjectPath(buildPath);
        PBXProject pbxProject = new PBXProject();
        pbxProject.ReadFromFile(projectPath);

        string mainTargetGuid = pbxProject.GetUnityMainTargetGuid();
        string unityFrameworkTargetGuid = pbxProject.GetUnityFrameworkTargetGuid();

        Debug.Log("[IOSBuildPostProcessor] Applying fixes for Xcode 15/16 + Unity 6...");

        // 1. Disable Bitcode (Deprecated)
        pbxProject.SetBuildProperty(mainTargetGuid, "ENABLE_BITCODE", "NO");
        pbxProject.SetBuildProperty(unityFrameworkTargetGuid, "ENABLE_BITCODE", "NO");

        // 2. Linker flags are handled by build_and_run_ios.sh to force Classic Linker via Environment Variables.
        // This is more reliable than pbxproj flags for Xcode 16.1.

        // 3. Ensure Always Embed Swift Standard Libraries (for plugins)
        pbxProject.SetBuildProperty(mainTargetGuid, "ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES", "YES");

        // 4. CRITICAL FIX: Explicitly link GameAssembly (which contains il2cpp.a)
        // Unity 6 + Xcode 16.1 bug: GameAssembly dependency not properly set for UnityFramework
        string gameAssemblyTargetGuid = pbxProject.TargetGuidByName("GameAssembly");
        if (!string.IsNullOrEmpty(gameAssemblyTargetGuid))
        {
            // Add GameAssembly as a target dependency
            pbxProject.AddTargetDependency(unityFrameworkTargetGuid, gameAssemblyTargetGuid);
            Debug.Log("[IOSBuildPostProcessor] Added GameAssembly as UnityFramework dependency");
        }

        AddDataFolderToUnityFramework(pbxProject, buildPath, unityFrameworkTargetGuid);
        EnsureNativeCallProxyHeaderIsPublic(pbxProject, unityFrameworkTargetGuid);

        pbxProject.WriteToFile(projectPath);
        Debug.Log("[IOSBuildPostProcessor] Fixes applied: Bitcode disabled, GameAssembly dependency added, UnityFramework resources + headers updated.");
    }

    private static void AddDataFolderToUnityFramework(PBXProject pbxProject, string buildPath, string unityFrameworkTargetGuid)
    {
        string dataPath = Path.Combine(buildPath, "Data");
        if (!Directory.Exists(dataPath))
        {
            Debug.LogWarning($"[IOSBuildPostProcessor] Unity Data folder missing at {dataPath}. Framework will be missing assets.");
            return;
        }

        const string dataProjectPath = "Data";
        string dataGuid = pbxProject.FindFileGuidByProjectPath(dataProjectPath);
        if (string.IsNullOrEmpty(dataGuid))
        {
            dataGuid = pbxProject.AddFolderReference(dataPath, dataProjectPath, PBXSourceTree.Source);
        }

        if (pbxProject.BuildFilesGetForSourceFile(unityFrameworkTargetGuid, dataGuid) == null)
        {
            string resourcesPhase = pbxProject.GetResourcesBuildPhaseByTarget(unityFrameworkTargetGuid);
            pbxProject.AddFileToBuildSection(unityFrameworkTargetGuid, resourcesPhase, dataGuid);
            Debug.Log("[IOSBuildPostProcessor] Added Data folder to UnityFramework resources.");
        }
    }

    private static void EnsureNativeCallProxyHeaderIsPublic(PBXProject pbxProject, string unityFrameworkTargetGuid)
    {
        const string nativeCallProxyPath = "Libraries/Plugins/iOS/NativeCallProxy.h";
        string nativeCallProxyGuid = pbxProject.FindFileGuidByProjectPath(nativeCallProxyPath);
        if (string.IsNullOrEmpty(nativeCallProxyGuid))
        {
            Debug.LogWarning("[IOSBuildPostProcessor] NativeCallProxy.h not found in Xcode project. Did you copy the react-native-unity unity/ folder into the Unity project?");
            return;
        }

        if (pbxProject.BuildFilesGetForSourceFile(unityFrameworkTargetGuid, nativeCallProxyGuid) != null)
        {
            pbxProject.BuildFilesRemove(unityFrameworkTargetGuid, nativeCallProxyGuid);
        }

        pbxProject.AddPublicHeaderToBuild(unityFrameworkTargetGuid, nativeCallProxyGuid);
        Debug.Log("[IOSBuildPostProcessor] Marked NativeCallProxy.h as Public in UnityFramework target.");
    }
}
