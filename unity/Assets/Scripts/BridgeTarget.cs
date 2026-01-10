using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.XR.ARFoundation;

public class BridgeTarget : MonoBehaviour
{
    // === DEBUG CONFIGURATION ===
    // Set to false for production builds to eliminate logging overhead
    private const bool DEBUG_ENABLED = true;
    private const bool FILE_LOGGING_ENABLED = true; // Write to file for device testing
    private const string LOG_PREFIX = "[Bridge]";

    // Stats tracking (only in debug mode)
    private static int _messagesReceived = 0;
    private static int _messagesSent = 0;
    private static float _lastMessageTime = 0f;

    private const int MaxLogs = 15;

    // Cached VFX asset (loaded once, reused for all brush spawns)
    private static UnityEngine.VFX.VisualEffectAsset _cachedBrushVFX;

    // File logging
    private static string _logFilePath;
    private static bool _logFileInitialized = false;

    private static class NativeAPI
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        public static extern void sendMessageToMobileApp(string message);
#endif
    }

    // === FILE LOGGING ===
    private static void InitFileLog()
    {
        if (_logFileInitialized) return;
        try
        {
            // Try multiple paths to find one that works
            string[] pathsToTry = new string[]
            {
                Path.Combine(Application.persistentDataPath, "bridge_log.txt"),
                // iOS Documents path workaround
                Path.Combine(Application.dataPath, "..", "Documents", "bridge_log.txt"),
            };

            foreach (var path in pathsToTry)
            {
                try
                {
                    var dir = Path.GetDirectoryName(path);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                        Directory.CreateDirectory(dir);

                    File.WriteAllText(path, $"=== Bridge Log Started {System.DateTime.Now:HH:mm:ss} ===\n");
                    File.AppendAllText(path, $"Path: {path}\n");
                    File.AppendAllText(path, $"persistentDataPath: {Application.persistentDataPath}\n");
                    File.AppendAllText(path, $"dataPath: {Application.dataPath}\n");
                    _logFilePath = path;
                    _logFileInitialized = true;
                    Debug.Log($"{LOG_PREFIX} Log file created at: {path}");
                    return;
                }
                catch (System.Exception ex)
                {
                    Debug.LogWarning($"{LOG_PREFIX} Failed path {path}: {ex.Message}");
                }
            }
            Debug.LogError($"{LOG_PREFIX} Could not create log file at any path!");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"{LOG_PREFIX} Failed to init log file: {e.Message}");
        }
    }

    private static void WriteToLogFile(string message)
    {
        if (!FILE_LOGGING_ENABLED) return;
        try
        {
            InitFileLog();
            var timestamp = System.DateTime.Now.ToString("HH:mm:ss.fff");
            File.AppendAllText(_logFilePath, $"[{timestamp}] {message}\n");
        }
        catch { /* Silently fail file logging */ }
    }

    // === LOGGING HELPERS ===
    private static void LogDebug(string message)
    {
        WriteToLogFile(message);
        if (!DEBUG_ENABLED) return;
        Debug.Log($"{LOG_PREFIX} {message}");
    }

    private static void LogWarning(string message)
    {
        WriteToLogFile($"WARN: {message}");
        if (!DEBUG_ENABLED) return;
        Debug.LogWarning($"{LOG_PREFIX} {message}");
    }

    private static void LogError(string message)
    {
        WriteToLogFile($"ERROR: {message}");
        // Always log errors even in production
        Debug.LogError($"{LOG_PREFIX} {message}");
    }

    private static void LogStats()
    {
        var statsMsg = $"[Stats] RX:{_messagesReceived} TX:{_messagesSent} LastMsg:{_lastMessageTime:F1}s ago";
        WriteToLogFile(statsMsg);
        if (!DEBUG_ENABLED) return;
        Debug.Log($"{LOG_PREFIX} {statsMsg}");
    }

    // === EARLY INITIALIZATION LOGGING ===
    // These run at different stages to help diagnose where initialization fails

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSplashScreen)]
    private static void LogBeforeSplashScreen()
    {
        // This is the EARLIEST point we can log - even before splash screen
        WriteEarlyLog("BeforeSplashScreen - Unity C# runtime started");

        // CRITICAL: Disable VSync and set explicit frame rate for React Native embedding
        // VSync causes timing conflicts with RN's render loop, resulting in 15 FPS (60/4)
        int originalVSync = QualitySettings.vSyncCount;
        QualitySettings.vSyncCount = 0;  // Disable VSync to prevent RN sync conflicts
        Application.targetFrameRate = 60; // Match iOS display refresh rate
        WriteEarlyLog($"Frame rate initialized: vSync=0, targetFPS=60 (was vSync={originalVSync})");
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void LogSubsystemRegistration()
    {
        WriteEarlyLog("SubsystemRegistration - Subsystems initializing");
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterAssembliesLoaded)]
    private static void LogAfterAssembliesLoaded()
    {
        WriteEarlyLog("AfterAssembliesLoaded - All assemblies loaded");
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void LogBeforeSceneLoad()
    {
        WriteEarlyLog($"BeforeSceneLoad - About to load scene, persistentDataPath={Application.persistentDataPath}");
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void EnsureBridgeTarget()
    {
        WriteEarlyLog("AfterSceneLoad - Scene loaded, creating BridgeTarget");
        if (FindAnyObjectByType<BridgeTarget>() != null)
        {
            WriteEarlyLog("BridgeTarget already exists in scene");
            return;
        }
        var go = new GameObject("BridgeTarget");
        go.AddComponent<BridgeTarget>();
        DontDestroyOnLoad(go);
        WriteEarlyLog("BridgeTarget created and marked DontDestroyOnLoad");
    }

    // Ultra-early logging that doesn't depend on InitFileLog completing
    private static void WriteEarlyLog(string message)
    {
        var timestamp = System.DateTime.Now.ToString("HH:mm:ss.fff");
        var logLine = $"[{timestamp}] [BridgeInit] {message}\n";

        // Log to Unity console (may not appear in device logs)
        Debug.Log($"[BridgeInit] {message}");

        // Try to write to file immediately
        try
        {
            // Use persistentDataPath directly - don't wait for InitFileLog
            var earlyLogPath = Path.Combine(Application.persistentDataPath, "bridge_early.log");
            File.AppendAllText(earlyLogPath, logLine);
        }
        catch (System.Exception ex)
        {
            // If persistentDataPath fails, try Documents folder
            try
            {
                var docsPath = Path.Combine(Application.dataPath, "..", "Documents", "bridge_early.log");
                var dir = Path.GetDirectoryName(docsPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);
                File.AppendAllText(docsPath, logLine);
            }
            catch { /* Last resort failed */ }
        }
    }

    private void Start()
    {
        LogDebug($"Initialized on GameObject '{gameObject.name}' | Scene: {SceneManager.GetActiveScene().name}");
        LogDebug($"Platform: {Application.platform} | Unity: {Application.unityVersion}");
        // Delay slightly to ensure RN has registered the native API
        StartCoroutine(SendReadyWithRetry());
    }

    private void Update()
    {
        // Track time since last message for debugging stale connections
        if (_lastMessageTime > 0)
            _lastMessageTime += Time.deltaTime;
    }

    private System.Collections.IEnumerator SendReadyWithRetry()
    {
        // Initial delay to let RN register
        yield return new WaitForSeconds(0.5f);

        // Send ready message with retries
        for (int i = 0; i < 5; i++)
        {
            LogDebug($"TX unity_ready (attempt {i + 1}/5)");
            SendToMobileApp(BuildJSON("unity_ready", "Portals v4 Reality Engine Loaded"));
            yield return new WaitForSeconds(1.0f);
        }
        LogDebug("Ready sequence complete - listening for messages");
    }

    // --- The Core Router ---
    public void OnMessage(string json)
    {
        _messagesReceived++;
        _lastMessageTime = 0f;

        // Truncate long messages for logging
        var logJson = json.Length > 100 ? json.Substring(0, 100) + "..." : json;
        LogDebug($"RX #{_messagesReceived}: {logJson}");

        // Simple manual JSON parsing (Fast, no allocs)
        if (json.Contains("\"action\":\"spawnBrush\""))
        {
            HandleSpawnBrush(json);
        }
        else if (json.Contains("\"type\":\"ping\""))
        {
            LogDebug("Received ping, sending pong");
            SendToMobileApp(BuildJSON("pong", "Unity Alive"));
        }
        else
        {
            LogWarning($"Unknown message type: {logJson}");
        }
    }

    private void HandleSpawnBrush(string json)
    {
        LogDebug("Processing spawnBrush action");

        // 1. Get cached VFX asset (load once, reuse forever)
        if (_cachedBrushVFX == null)
        {
            _cachedBrushVFX = Resources.Load<UnityEngine.VFX.VisualEffectAsset>("VFX/SimpleBrush");
            if (_cachedBrushVFX != null)
                LogDebug("VFX asset cached successfully");
        }

        if (_cachedBrushVFX == null)
        {
            LogError("Failed to load VFX/SimpleBrush from Resources");
            SendToMobileApp(BuildJSON("error", "Asset not found"));
            return;
        }
        var vfxAsset = _cachedBrushVFX;

        // 2. Spawn the Container
        var brushGO = new GameObject($"Brush_{Time.frameCount}");
        var cam = Camera.main;
        if (cam != null)
        {
            brushGO.transform.position = cam.transform.position + (cam.transform.forward * 0.5f);
            LogDebug($"Spawned at camera forward: {brushGO.transform.position}");
        }
        else
        {
            brushGO.transform.position = Vector3.zero;
            LogWarning("No main camera found, spawning at origin");
        }

        // 3. Add VFX Component
        var vfx = brushGO.AddComponent<UnityEngine.VFX.VisualEffect>();
        vfx.visualEffectAsset = vfxAsset;
        vfx.Play();

        LogDebug($"VFX spawned: {brushGO.name}");
        SendToMobileApp(BuildJSON("ack", $"Spawned {brushGO.name}"));
    }

    // --- Helpers ---
    private string BuildJSON(string type, string note)
    {
        // Manual string concat allows us to avoid internal JSON serializers for speed
        return $"{{\"type\":\"{type}\",\"source\":\"unity\",\"note\":\"{note}\"}}";
    }

    private void SendToMobileApp(string payload)
    {
        _messagesSent++;
        var logPayload = payload.Length > 80 ? payload.Substring(0, 80) + "..." : payload;
        LogDebug($"TX #{_messagesSent}: {logPayload}");

#if UNITY_ANDROID
        try
        {
            using (var jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
            {
                jc.CallStatic("sendMessageToMobileApp", payload);
            }
        }
        catch (System.Exception e)
        {
            LogError($"Android sendMessage failed: {e.Message}");
        }
#elif UNITY_IOS && !UNITY_EDITOR
        try
        {
            NativeAPI.sendMessageToMobileApp(payload);
        }
        catch (System.Exception e)
        {
            LogError($"iOS sendMessage failed: {e.Message}");
        }
#else
        LogDebug($"[Editor Mock] Would send: {logPayload}");
#endif
    }

    // Public method to dump stats (can be called from RN for debugging)
    public void DumpStats()
    {
        LogStats();
        SendToMobileApp(BuildJSON("stats", $"RX:{_messagesReceived} TX:{_messagesSent}"));
    }

    // === AR EVENT METHODS ===
    // These can be called by ARSessionLogger or other AR components

    /// <summary>
    /// Send AR session state change to React Native.
    /// </summary>
    public void SendARState(ARSessionState state)
    {
        LogDebug($"AR State changed: {state}");
        SendToMobileApp($"{{\"type\":\"ar_state\",\"source\":\"unity\",\"state\":\"{state}\"}}");
    }

    /// <summary>
    /// Send AR plane event to React Native.
    /// </summary>
    public void SendARPlaneEvent(string action, string planeId, float width, float height)
    {
        LogDebug($"AR Plane {action}: {planeId} ({width:F2}x{height:F2}m)");
        SendToMobileApp($"{{\"type\":\"ar_plane\",\"source\":\"unity\",\"action\":\"{action}\",\"id\":\"{planeId}\",\"size\":[{width:F2},{height:F2}]}}");
    }

    /// <summary>
    /// Send AR stats to React Native (can be called periodically).
    /// </summary>
    public void SendARStats(int fps, int planeCount, ARSessionState state)
    {
        LogDebug($"AR Stats: FPS={fps}, Planes={planeCount}, State={state}");
        SendToMobileApp($"{{\"type\":\"ar_stats\",\"source\":\"unity\",\"fps\":{fps},\"planes\":{planeCount},\"state\":\"{state}\"}}");

        // Also update debug overlay if present
        var overlay = FindAnyObjectByType<ARDebugOverlay>();
        overlay?.UpdateBridgeStats(_messagesReceived, _messagesSent);
    }

    /// <summary>
    /// Send a generic AR event to React Native.
    /// </summary>
    public void SendAREvent(string eventType, string details)
    {
        LogDebug($"AR Event: {eventType} - {details}");
        SendToMobileApp($"{{\"type\":\"ar_event\",\"source\":\"unity\",\"event\":\"{eventType}\",\"details\":\"{details}\"}}");
    }
}
