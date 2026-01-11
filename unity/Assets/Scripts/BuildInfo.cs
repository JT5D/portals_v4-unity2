using System;
using System.Reflection;
using UnityEngine;

/// <summary>
/// Provides compile-time build information for verifying Unity rebuilds.
/// The timestamp is baked in at IL2CPP compilation time.
/// </summary>
public static class BuildInfo
{
    // This gets evaluated at compile time and baked into the IL2CPP output
    private static readonly DateTime CompileTime = DateTime.Now;

    // Formatted timestamp for display
    public static string Timestamp => CompileTime.ToString("MMM dd HH:mm");

    // Full timestamp with seconds for detailed logging
    public static string TimestampFull => CompileTime.ToString("yyyy-MM-dd HH:mm:ss");

    // Short format for UI display
    public static string TimestampShort => CompileTime.ToString("MM/dd HH:mm");

    /// <summary>
    /// Get build info as JSON for sending to React Native.
    /// </summary>
    public static string ToJSON()
    {
        return $"\"build\":{{\"timestamp\":\"{TimestampFull}\",\"unity\":\"{Application.unityVersion}\"}}";
    }

    /// <summary>
    /// Log build info to console (called on startup).
    /// </summary>
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void LogBuildInfo()
    {
        Debug.Log($"[BuildInfo] Unity Build: {TimestampFull} | Unity {Application.unityVersion}");
    }
}
