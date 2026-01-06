using UnityEditor;
using System;

public class CLIBuild
{
    static void BuildIOS()
    {
        BuildPipeline.BuildPlayer(
            EditorBuildSettings.scenes,
            "builds/ios_export",
            BuildTarget.iOS,
            BuildOptions.None
        );
    }
}
