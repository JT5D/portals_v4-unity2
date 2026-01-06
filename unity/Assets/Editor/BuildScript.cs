using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;
using UnityEditor.Build;

public class BuildScript
{
    private static string GetBuildPathAndroid()
    {
        return Path.Combine(Application.dataPath, "../builds/android");
    }

    private static string GetBuildPathIOS()
    {
        return Path.Combine(Application.dataPath, "../builds/ios");
    }

    private static string[] GetScenePaths()
    {
        if (EditorBuildSettings.scenes.Length == 0)
        {
            string scenePath = "Assets/Scenes/SampleScene.unity";
            if (!Directory.Exists("Assets/Scenes")) Directory.CreateDirectory("Assets/Scenes");

            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, scenePath);

            return new[] { scenePath };
        }
        return EditorBuildSettingsScene.GetActiveSceneList(EditorBuildSettings.scenes);
    }

    [MenuItem("Tools/Build Android")]
    public static void PerformAndroidBuild()
    {
        Debug.Log("Starting Android Export...");
        string buildPath = GetBuildPathAndroid();

        EditorUserBuildSettings.exportAsGoogleAndroidProject = true;
        EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;
        PlayerSettings.Android.useCustomKeystore = false;

        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);

        BuildPlayerOptions buildOptions = new BuildPlayerOptions();
        buildOptions.scenes = GetScenePaths();
        buildOptions.locationPathName = buildPath;
        buildOptions.target = BuildTarget.Android;
        buildOptions.options = BuildOptions.AcceptExternalModificationsToPlayer;

        var report = BuildPipeline.BuildPlayer(buildOptions);

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("Android Export Succeeded: " + buildPath);
        }
        else
        {
            Debug.LogError("Android Export Failed");
            throw new Exception("Android Build Failed");
        }
    }

    [MenuItem("Tools/Build iOS")]
    public static void PerformIOSBuild()
    {
        Debug.Log("Starting iOS Build...");
        string buildPath = GetBuildPathIOS();

        // Clean XR temp folder to avoid AR Simulation move conflicts during build.
        var xrTempPath = System.IO.Path.Combine(Application.dataPath, "XR/Temp");
        if (System.IO.Directory.Exists(xrTempPath))
        {
            try { System.IO.Directory.Delete(xrTempPath, true); }
            catch (Exception e) { Debug.LogWarning($"Could not clean XR temp path: {xrTempPath}. {e.Message}"); }
        }

        // XR Simulation cleanup is optional; deleting assets can break ARFoundation's build processor.
        if (Environment.GetEnvironmentVariable("UNITY_CLEAN_XR_SIM") == "1")
        {
            var simAssets = new[]
            {
                "Assets/XR/UserSimulationSettings",
                "Assets/XR/Resources/XRSimulationRuntimeSettings.asset",
                "Assets/XR/Settings/XR Simulation Settings.asset",
                "Assets/XR/Settings/XRSimulationSettings.asset",
                "Assets/XR/Temp"
            };
            foreach (var asset in simAssets)
            {
                if (System.IO.Directory.Exists(asset))
                {
                    try { UnityEditor.AssetDatabase.DeleteAsset(asset); } catch { }
                }
                else if (System.IO.File.Exists(asset))
                {
                    try { UnityEditor.AssetDatabase.DeleteAsset(asset); } catch { }
                }
            }
        }

        // Switch to iOS platform
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.iOS, BuildTarget.iOS);
        EditorUserBuildSettings.iOSXcodeBuildConfig = XcodeBuildConfig.Release;

        // Configure IL2CPP settings for iOS
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
        PlayerSettings.iOS.sdkVersion = iOSSdkVersion.DeviceSDK;
        PlayerSettings.SetArchitecture(NamedBuildTarget.iOS, (int)AppleMobileArchitecture.ARM64);

        // Required for Unity as a Library
        PlayerSettings.iOS.hideHomeButton = false;
        PlayerSettings.iOS.requiresFullScreen = false;

        // Ensure proper bundle identifier
        if (string.IsNullOrEmpty(PlayerSettings.applicationIdentifier) || PlayerSettings.applicationIdentifier == "com.defaultcompany.unityproject")
        {
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.h3mai.portals");
        }

        // Ensure required iOS privacy strings are set to avoid build failures.
        const string cameraUsage = "Camera is used for AR features.";
        const string locationUsage = "Location is used for AR positioning.";

        if (string.IsNullOrEmpty(PlayerSettings.iOS.cameraUsageDescription))
        {
            PlayerSettings.iOS.cameraUsageDescription = cameraUsage;
        }
        else if (PlayerSettings.iOS.cameraUsageDescription.Trim().Length == 0)
        {
            PlayerSettings.iOS.cameraUsageDescription = cameraUsage;
        }

        if (string.IsNullOrEmpty(PlayerSettings.iOS.locationUsageDescription))
        {
            PlayerSettings.iOS.locationUsageDescription = locationUsage;
        }
        else if (PlayerSettings.iOS.locationUsageDescription.Trim().Length == 0)
        {
            PlayerSettings.iOS.locationUsageDescription = locationUsage;
        }

        BuildPlayerOptions buildOptions = new BuildPlayerOptions();
        buildOptions.scenes = GetScenePaths();
        buildOptions.locationPathName = buildPath;
        buildOptions.target = BuildTarget.iOS;
        buildOptions.options = BuildOptions.None; // Pure Release - no Development symbols

        var report = BuildPipeline.BuildPlayer(buildOptions);

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("iOS Build Succeeded: " + buildPath);
        }
        else
        {
            Debug.LogError("iOS Build Failed");
            throw new Exception("iOS Build Failed");
        }
    }
}
