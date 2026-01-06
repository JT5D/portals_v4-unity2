#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;
#if UNITY_XR_MANAGEMENT
using UnityEngine.XR;
#endif
#if HAS_ADDRESSABLES
using UnityEngine.AddressableAssets;
#endif

/// <summary>
/// Lightweight MCP tooling verifier designed for AI-assisted IDEs (Claude Code, Codex, Windsurf, etc.).
/// Emits machine-readable log lines so any model can parse tool status without external docs.
/// </summary>
public static class MCPTools
{
    private const string LogPrefix = "MCP_VERIFY";
    private const string SessionKey = "MCPTools.AutoVerified";
    private static readonly string[] CommonUvPaths =
    {
        "/opt/homebrew/bin/uv",
        "/usr/local/bin/uv",
        "/usr/bin/uv",
        "/usr/bin/env uv",
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".local", "bin", "uv")
    };

    [InitializeOnLoadMethod]
    private static void AutoVerifyOncePerSession()
    {
        // Silent, one-time check on editor start so automated agents can detect readiness without user clicks.
        if (SessionState.GetBool(SessionKey, false))
        {
            return;
        }
        SessionState.SetBool(SessionKey, true);
        RunChecks(verbose: false, autoFix: false);
    }

    [MenuItem("MCP/Verify Tools")]
    public static void Verify() => RunChecks(verbose: true, autoFix: false);

    [MenuItem("MCP/Verify & Auto-Fix")]
    public static void VerifyAndAutoFix() => RunChecks(verbose: true, autoFix: true);

    private static void RunChecks(bool verbose, bool autoFix)
    {
        LogCheck("unityVersion", Application.unityVersion);
        LogCheck("mcpPackage", PackageInstalled("com.coplaydev.unity-mcp") ? "present" : "missing");
        LogCheck("testFramework", PackageInstalled("com.unity.test-framework") ? "present" : "missing");
        LogExecutable("uv");

        var portFree = IsPortFree(8080);
        LogCheck("port8080", portFree ? "free" : "in_use");
        var recommendedPort = portFree ? 8080 : FindFirstFreePort(8081, 20);
        LogCheck("portRecommended", recommendedPort > 0 ? recommendedPort.ToString() : "none_found");

        var xrPackagePresent = PackageInstalled("com.unity.xr.management");
        LogCheck("xrPackage", xrPackagePresent ? "present" : "missing");
        var selectedGroup = EditorUserBuildSettings.selectedBuildTargetGroup;
        var namedTarget = NamedBuildTarget.FromBuildTargetGroup(selectedGroup);
#if UNITY_XR_MANAGEMENT
        LogCheck("xrDefined", "true");
        LogCheck("xrDeviceActive", XRSettings.isDeviceActive ? "true" : "false");
#else
        LogCheck("xrDefined", "false");
        LogCheck("xrDeviceActive", "false");
        if (xrPackagePresent && autoFix)
        {
            TryAddDefine(namedTarget, "UNITY_XR_MANAGEMENT", "xrDefineAdded");
        }
        else if (xrPackagePresent)
        {
            LogCheck("xrDefineNeeded", "true");
        }
#endif

        var addressablesPackagePresent = PackageInstalled("com.unity.addressables");
        LogCheck("addressablesPackage", addressablesPackagePresent ? "present" : "missing");

    #if HAS_ADDRESSABLES
        LogCheck("addressablesDefined", "true");
        LogCheck("addressablesReady", Addressables.ResourceManager != null ? "true" : "false");
    #else
        LogCheck("addressablesDefined", "false");
        LogCheck("addressablesReady", "false");
        if (addressablesPackagePresent && autoFix)
        {
            TryAddDefine(namedTarget, "HAS_ADDRESSABLES", "addressablesDefineAdded");
        }
        else if (addressablesPackagePresent)
        {
            LogCheck("addressablesDefineNeeded", "true");
        }
    #endif

        Debug.Log($"{LogPrefix}:summary={(verbose ? "ok_menu" : "ok_auto")}");
        if (verbose)
        {
            Debug.Log("MCP Tools: ✓ Active");
        }
    }

    private static void LogCheck(string key, string value)
    {
        Debug.Log($"{LogPrefix}:{key}={value}");
    }

    private static void LogExecutable(string executableName)
    {
        var found = TryFindExecutable(executableName, out var resolvedPath);
        LogCheck(executableName, found ? "present" : "missing");
        if (!string.IsNullOrEmpty(resolvedPath))
        {
            LogCheck($"{executableName}Path", resolvedPath);
        }
    }

    private static bool PackageInstalled(string packageName)
    {
        // Fast path: check Packages/<packageName>/package.json
        var packagePath = Path.Combine("Packages", packageName, "package.json");
        if (File.Exists(packagePath))
        {
            return true;
        }

        // Fallback: scan manifest dependencies without loading PackageManager APIs.
        var manifestPath = Path.Combine("Packages", "manifest.json");
        if (!File.Exists(manifestPath))
        {
            return false;
        }

        try
        {
            var manifestText = File.ReadAllText(manifestPath);
            return manifestText.Contains($"\"{packageName}\"", StringComparison.Ordinal);
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static bool TryFindExecutable(string executableName, out string resolvedPath)
    {
        resolvedPath = null;

        foreach (var candidatePath in CommonUvPaths)
        {
            if (File.Exists(candidatePath))
            {
                resolvedPath = candidatePath;
                return true;
            }
        }

        var envPath = Environment.GetEnvironmentVariable("PATH");
        if (string.IsNullOrEmpty(envPath))
        {
            return false;
        }

        var separator = Application.platform == RuntimePlatform.WindowsEditor ? ';' : ':';
        foreach (var dir in envPath.Split(separator))
        {
            if (string.IsNullOrEmpty(dir))
            {
                continue;
            }
            var candidate = Path.Combine(dir, executableName);
            if (File.Exists(candidate))
            {
                resolvedPath = candidate;
                return true;
            }
        }

        return false;
    }

    private static bool IsPortFree(int port)
    {
        try
        {
            using var client = new TcpClient();
            var result = client.BeginConnect("127.0.0.1", port, null, null);
            var success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(150));
            if (!success)
            {
                return true; // Timed out means likely free (no listener responded).
            }

            client.EndConnect(result);
            return false; // Connected, so port is in use.
        }
        catch (SocketException)
        {
            return true; // Connection failed, port likely free.
        }
        catch (Exception)
        {
            return true;
        }
    }

    private static int FindFirstFreePort(int startPort, int range)
    {
        for (var port = startPort; port < startPort + range; port++)
        {
            if (IsPortFree(port))
            {
                return port;
            }
        }

        return -1;
    }

    private static void TryAddDefine(NamedBuildTarget buildTarget, string define, string logKey)
    {
        var defines = PlayerSettings.GetScriptingDefineSymbols(buildTarget);
        var current = defines.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
        if (current.Any(d => d == define))
        {
            LogCheck(logKey, "present");
            return;
        }

        var updated = current.Concat(new[] { define });
        var defineString = string.Join(";", updated);
        PlayerSettings.SetScriptingDefineSymbols(buildTarget, defineString);
        LogCheck(logKey, "added");
    }
}
#endif
