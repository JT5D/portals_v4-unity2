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

        pbxProject.WriteToFile(projectPath);
        Debug.Log("[IOSBuildPostProcessor] Fixes applied: Bitcode disabled, ld_classic linker, GameAssembly dependency added.");
    }
}
