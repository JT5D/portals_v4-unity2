using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using TMPro;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Debug overlay that displays AR stats and logs in the bottom-left corner.
/// Designed for rapid iteration and device testing.
/// </summary>
public class ARDebugOverlay : MonoBehaviour
{
    // === NATIVE LOGGING (iOS) ===
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void NSLog_Native(string message);
#endif

    private static void NSLog(string message)
    {
#if UNITY_IOS && !UNITY_EDITOR
        try { NSLog_Native($"[ARDebug] {message}"); } catch { }
#endif
    }

    // === FILE LOGGING ===
    private static string _logFilePath;
    private static bool _fileLogInitialized;

    private static void InitFileLog()
    {
        if (_fileLogInitialized) return;
        try
        {
            _logFilePath = Path.Combine(Application.persistentDataPath, "ar_debug_log.txt");
            File.WriteAllText(_logFilePath, $"=== AR Debug Log {DateTime.Now:yyyy-MM-dd HH:mm:ss} ===\n");
            _fileLogInitialized = true;
        }
        catch (Exception e)
        {
            Debug.LogError($"[ARDebug] File log init failed: {e.Message}");
        }
    }

    private static void WriteFileLog(string message)
    {
        try
        {
            InitFileLog();
            var timestamp = DateTime.Now.ToString("HH:mm:ss.fff");
            File.AppendAllText(_logFilePath, $"[{timestamp}] {message}\n");
        }
        catch { /* Silently fail file writes */ }
    }

    // === CONFIGURATION ===
    [Header("UI References")]
    [SerializeField] private TextMeshProUGUI statsText;
    [SerializeField] private TextMeshProUGUI logText;

    [Header("Settings")]
    [SerializeField] private int maxLogMessages = 15;
    [SerializeField] private bool showFPS = true;
    [SerializeField] private bool showARState = true;
    [SerializeField] private bool showBridgeStats = true;

    // === INTERNAL STATE ===
    private static ARDebugOverlay _instance;
    private static readonly Queue<string> LogBuffer = new Queue<string>();
    private static readonly StringBuilder LogBuilder = new StringBuilder();

    // FPS calculation
    private float _deltaTime = 0f;
    private float _fps = 0f;
    private int _frameCount = 0;
    private float _fpsUpdateInterval = 0.5f;
    private float _fpsTimer = 0f;

    // AR references (cached)
    private ARSession _arSession;
    private ARPlaneManager _planeManager;

    // Bridge stats (fetched from BridgeTarget via reflection or public access)
    private int _bridgeRX = 0;
    private int _bridgesTX = 0;

    // === SINGLETON ACCESS ===
    public static ARDebugOverlay Instance => _instance;

    private void Awake()
    {
        if (_instance != null && _instance != this)
        {
            Destroy(gameObject);
            return;
        }
        _instance = this;
        DontDestroyOnLoad(gameObject);

        Log("[ARDebug] Overlay initialized");
    }

    private void Start()
    {
        // Cache AR references
        _arSession = FindAnyObjectByType<ARSession>();
        _planeManager = FindAnyObjectByType<ARPlaneManager>();

        if (_arSession == null)
            Log("[ARDebug] WARNING: No ARSession found in scene");
        if (_planeManager == null)
            Log("[ARDebug] WARNING: No ARPlaneManager found in scene");

        // Log build info prominently so user can verify rebuild
        Log($"[ARDebug] BUILD: {BuildInfo.TimestampFull}");
        Log($"[ARDebug] Platform: {Application.platform}");
        Log($"[ARDebug] Unity: {Application.unityVersion}");
        Log($"[ARDebug] Device: {SystemInfo.deviceModel}");
    }

    private void Update()
    {
        // FPS calculation
        _frameCount++;
        _fpsTimer += Time.unscaledDeltaTime;
        if (_fpsTimer >= _fpsUpdateInterval)
        {
            _fps = _frameCount / _fpsTimer;
            _frameCount = 0;
            _fpsTimer = 0f;
        }

        // Update UI
        UpdateStatsDisplay();
        UpdateLogDisplay();
    }

    private void UpdateStatsDisplay()
    {
        if (statsText == null) return;

        var sb = new StringBuilder();

        // Build timestamp (always show first so user can verify rebuild)
        sb.Append($"<color=#88ff88>Build: {BuildInfo.TimestampShort}</color>");

        // FPS
        if (showFPS)
        {
            var fpsColor = _fps >= 55 ? "green" : (_fps >= 30 ? "yellow" : "red");
            sb.Append($"  |  <color={fpsColor}>FPS: {_fps:F0}</color>");
        }

        // AR State
        if (showARState && _arSession != null)
        {
            var state = ARSession.state;
            var stateColor = state == ARSessionState.SessionTracking ? "green" :
                             state == ARSessionState.Ready ? "yellow" : "red";
            sb.Append($"  |  <color={stateColor}>AR: {state}</color>");
        }

        // Plane count
        if (_planeManager != null)
        {
            var planeCount = _planeManager.trackables.count;
            sb.Append($"  |  Planes: {planeCount}");
        }

        // Bridge stats
        if (showBridgeStats)
        {
            sb.Append($"  |  RX:{_bridgeRX} TX:{_bridgesTX}");
        }

        statsText.text = sb.ToString();
    }

    private void UpdateLogDisplay()
    {
        if (logText == null) return;

        lock (LogBuffer)
        {
            LogBuilder.Clear();
            foreach (var msg in LogBuffer)
            {
                LogBuilder.AppendLine(msg);
            }
            logText.text = LogBuilder.ToString();
        }
    }

    // === PUBLIC API ===

    /// <summary>
    /// Add a log message to the overlay.
    /// Thread-safe, can be called from any thread.
    /// Logs to: Unity Console, NSLog (iOS), File, On-screen overlay
    /// </summary>
    public static void Log(string message)
    {
        var timestamp = DateTime.Now.ToString("HH:mm:ss");
        var formatted = $"[{timestamp}] {message}";

        // 1. Unity console (visible in Xcode debugger)
        Debug.Log($"[ARDebug] {message}");

        // 2. iOS native log (visible in Console.app and idevicesyslog)
        NSLog(message);

        // 3. File log (can be pulled from device)
        WriteFileLog(message);

        // 4. On-screen overlay
        lock (LogBuffer)
        {
            LogBuffer.Enqueue(formatted);

            // Keep buffer size limited
            while (LogBuffer.Count > (_instance?.maxLogMessages ?? 15))
            {
                LogBuffer.Dequeue();
            }
        }
    }

    /// <summary>
    /// Log a warning message (yellow in console).
    /// </summary>
    public static void LogWarning(string message)
    {
        Debug.LogWarning($"[ARDebug] {message}");
        Log($"<color=yellow>WARN: {message}</color>");
    }

    /// <summary>
    /// Log an error message (red in console).
    /// </summary>
    public static void LogError(string message)
    {
        Debug.LogError($"[ARDebug] {message}");
        Log($"<color=red>ERROR: {message}</color>");
    }

    /// <summary>
    /// Update bridge message stats (called by BridgeTarget).
    /// </summary>
    public void UpdateBridgeStats(int rx, int tx)
    {
        _bridgeRX = rx;
        _bridgesTX = tx;
    }

    /// <summary>
    /// Log an AR session state change.
    /// </summary>
    public static void LogARState(ARSessionState state)
    {
        var stateStr = state switch
        {
            ARSessionState.None => "None (not initialized)",
            ARSessionState.Unsupported => "UNSUPPORTED (device can't do AR)",
            ARSessionState.CheckingAvailability => "Checking availability...",
            ARSessionState.NeedsInstall => "Needs ARCore/ARKit install",
            ARSessionState.Installing => "Installing AR services...",
            ARSessionState.Ready => "Ready (not tracking yet)",
            ARSessionState.SessionInitializing => "Session initializing...",
            ARSessionState.SessionTracking => "TRACKING (AR active!)",
            _ => state.ToString()
        };
        Log($"AR State: {stateStr}");
    }

    /// <summary>
    /// Log a plane detection event.
    /// </summary>
    public static void LogPlane(string action, ARPlane plane)
    {
        if (plane == null) return;
        var size = plane.size;
        Log($"Plane {action}: {plane.trackableId} ({size.x:F2}m x {size.y:F2}m)");
    }
}
