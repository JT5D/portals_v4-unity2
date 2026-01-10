using System;
using UnityEngine;
using UnityEngine.XR.ARFoundation;

/// <summary>
/// Monitors AR Foundation events and sends verbose logs.
/// Designed for debugging AR initialization and plane detection.
/// </summary>
public class ARSessionLogger : MonoBehaviour
{
    // === CONFIGURATION ===
    [Header("Logging Settings")]
    [SerializeField] private bool logStateChanges = true;
    [SerializeField] private bool logPlaneEvents = true;
    [SerializeField] private bool logCameraEvents = true;
    [SerializeField] private bool sendToBridge = true;

    [Header("References (auto-find if null)")]
    [SerializeField] private ARSession arSession;
    [SerializeField] private ARPlaneManager planeManager;
    [SerializeField] private ARCameraManager cameraManager;

    // === INTERNAL STATE ===
    private ARSessionState _lastState = ARSessionState.None;
    private int _planesAdded = 0;
    private int _planesRemoved = 0;
    private float _initTime;

    private const string LOG_PREFIX = "[ARLogger]";

    private void Awake()
    {
        _initTime = Time.realtimeSinceStartup;
        Log("ARSessionLogger initializing...");
    }

    private void Start()
    {
        // Auto-find references if not set
        if (arSession == null)
            arSession = FindAnyObjectByType<ARSession>();
        if (planeManager == null)
            planeManager = FindAnyObjectByType<ARPlaneManager>();
        if (cameraManager == null)
            cameraManager = FindAnyObjectByType<ARCameraManager>();

        // Log what we found
        Log($"ARSession: {(arSession != null ? "Found" : "NOT FOUND")}");
        Log($"ARPlaneManager: {(planeManager != null ? "Found" : "NOT FOUND")}");
        Log($"ARCameraManager: {(cameraManager != null ? "Found" : "NOT FOUND")}");

        // Subscribe to events
        ARSession.stateChanged += OnARSessionStateChanged;

        if (planeManager != null)
        {
            planeManager.trackablesChanged.AddListener(OnPlanesChanged);
            Log($"PlaneManager detection mode: {planeManager.requestedDetectionMode}");
        }

        if (cameraManager != null)
        {
            cameraManager.frameReceived += OnCameraFrameReceived;
        }

        // Initial state
        Log($"Initial AR state: {ARSession.state}");
        _lastState = ARSession.state;
    }

    private void OnDestroy()
    {
        // Unsubscribe from events
        ARSession.stateChanged -= OnARSessionStateChanged;

        if (planeManager != null)
            planeManager.trackablesChanged.RemoveListener(OnPlanesChanged);

        if (cameraManager != null)
            cameraManager.frameReceived -= OnCameraFrameReceived;
    }

    // === EVENT HANDLERS ===

    private void OnARSessionStateChanged(ARSessionStateChangedEventArgs args)
    {
        if (!logStateChanges) return;

        var newState = args.state;
        var elapsed = (Time.realtimeSinceStartup - _initTime);

        Log($"AR State: {_lastState} → {newState} (at {elapsed:F1}s)");
        ARDebugOverlay.LogARState(newState);

        // Send to React Native
        if (sendToBridge)
        {
            SendBridgeMessage("ar_state", $"state={newState}");
        }

        // Special handling for key states
        switch (newState)
        {
            case ARSessionState.Unsupported:
                LogError("AR is NOT SUPPORTED on this device!");
                break;
            case ARSessionState.NeedsInstall:
                LogWarning("AR services need to be installed (ARCore)");
                break;
            case ARSessionState.SessionTracking:
                Log("AR is now TRACKING - ready for plane detection!");
                break;
        }

        _lastState = newState;
    }

    private void OnPlanesChanged(ARTrackablesChangedEventArgs<ARPlane> args)
    {
        if (!logPlaneEvents) return;

        // Log added planes
        foreach (var plane in args.added)
        {
            _planesAdded++;
            var alignment = plane.alignment;
            var size = plane.size;
            var pos = plane.transform.position;

            Log($"Plane ADDED #{_planesAdded}: {plane.trackableId}");
            Log($"  Alignment: {alignment}, Size: {size.x:F2}x{size.y:F2}m");
            Log($"  Position: ({pos.x:F2}, {pos.y:F2}, {pos.z:F2})");

            ARDebugOverlay.LogPlane("added", plane);

            if (sendToBridge)
            {
                SendBridgeMessage("ar_plane", $"action=added,id={plane.trackableId},size=[{size.x:F2},{size.y:F2}]");
            }
        }

        // Log updated planes (less verbose)
        if (args.updated.Count > 0)
        {
            Log($"Planes UPDATED: {args.updated.Count}");
        }

        // Log removed planes
        foreach (var plane in args.removed)
        {
            _planesRemoved++;
            Log($"Plane REMOVED: {plane.Key}");

            if (sendToBridge)
            {
                SendBridgeMessage("ar_plane", $"action=removed,id={plane.Key}");
            }
        }
    }

    private int _frameCount = 0;
    private float _lastCameraLogTime = 0f;

    private void OnCameraFrameReceived(ARCameraFrameEventArgs args)
    {
        if (!logCameraEvents) return;

        _frameCount++;

        // Log camera info every 5 seconds (avoid spam)
        if (Time.realtimeSinceStartup - _lastCameraLogTime >= 5f)
        {
            _lastCameraLogTime = Time.realtimeSinceStartup;

            if (args.lightEstimation.averageBrightness.HasValue)
            {
                Log($"Light: brightness={args.lightEstimation.averageBrightness.Value:F2}");
            }

            if (args.lightEstimation.averageColorTemperature.HasValue)
            {
                Log($"Light: colorTemp={args.lightEstimation.averageColorTemperature.Value:F0}K");
            }
        }
    }

    // === LOGGING HELPERS ===

    private void Log(string message)
    {
        Debug.Log($"{LOG_PREFIX} {message}");
        ARDebugOverlay.Log(message);
    }

    private void LogWarning(string message)
    {
        Debug.LogWarning($"{LOG_PREFIX} {message}");
        ARDebugOverlay.LogWarning(message);
    }

    private void LogError(string message)
    {
        Debug.LogError($"{LOG_PREFIX} {message}");
        ARDebugOverlay.LogError(message);
    }

    private BridgeTarget _bridge;

    private void SendBridgeMessage(string type, string data)
    {
        // Cache bridge reference
        if (_bridge == null)
            _bridge = FindAnyObjectByType<BridgeTarget>();

        if (_bridge == null)
        {
            Log($"[Bridge TX FAILED] No BridgeTarget found - type={type}, {data}");
            return;
        }

        // Route to appropriate BridgeTarget method
        switch (type)
        {
            case "ar_state":
                // Parse state from data (format: state=SessionTracking)
                if (data.StartsWith("state=") && Enum.TryParse<ARSessionState>(data.Substring(6), out var state))
                {
                    _bridge.SendARState(state);
                }
                break;

            case "ar_plane":
                // Generic AR event for planes
                _bridge.SendAREvent("plane", data);
                break;

            default:
                _bridge.SendAREvent(type, data);
                break;
        }
    }

    // === PUBLIC API ===

    /// <summary>
    /// Get a summary of AR session status.
    /// </summary>
    public string GetStatusSummary()
    {
        return $"State: {ARSession.state}, " +
               $"Planes: +{_planesAdded}/-{_planesRemoved}, " +
               $"Frames: {_frameCount}";
    }
}
