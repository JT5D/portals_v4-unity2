using System.Collections;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.Management;

/// <summary>
/// Comprehensive AR diagnostics - logs everything to help debug camera issues.
/// Sends logs to both file AND React Native via bridge.
/// </summary>
public class ARDiagnostics : MonoBehaviour
{
    private static string _logPath;
    private static System.Text.StringBuilder _logBuffer = new System.Text.StringBuilder();
    
    private float _logInterval = 3f;
    private float _lastLogTime = 0f;
    private bool _initialized = false;
    
    private ARSession _arSession;
    private ARCameraManager _arCameraManager;
    private ARCameraBackground _arCameraBackground;
    private Camera _mainCamera;

    // Native bridge
    private static class NativeBridge
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        public static extern void sendMessageToMobileApp(string message);
#endif
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void AutoCreate()
    {
        Log("=== ARDiagnostics AutoCreate ===");
        if (FindAnyObjectByType<ARDiagnostics>() == null)
        {
            var go = new GameObject("ARDiagnostics");
            go.AddComponent<ARDiagnostics>();
            DontDestroyOnLoad(go);
            Log("ARDiagnostics created");
        }
    }

    static void Log(string msg)
    {
        // Initialize log path
        if (_logPath == null)
        {
            _logPath = Path.Combine(Application.persistentDataPath, "ar_diagnostics.log");
            try { File.WriteAllText(_logPath, $"=== AR Diagnostics {System.DateTime.Now} ===\n"); }
            catch { }
        }

        var timestamp = System.DateTime.Now.ToString("HH:mm:ss.fff");
        var logLine = $"[{timestamp}] {msg}";
        
        // Unity console
        Debug.Log($"[ARDiag] {msg}");
        
        // File
        try { File.AppendAllText(_logPath, logLine + "\n"); }
        catch { }
        
        // Buffer for sending to RN
        _logBuffer.AppendLine(logLine);
    }

    static void SendToRN(string type, string message)
    {
#if UNITY_IOS && !UNITY_EDITOR
        try
        {
            var json = $"{{\"type\":\"{type}\",\"source\":\"unity\",\"data\":\"{EscapeJson(message)}\"}}";
            NativeBridge.sendMessageToMobileApp(json);
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[ARDiag] Failed to send to RN: {e.Message}");
        }
#endif
    }

    static string EscapeJson(string s)
    {
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "");
    }

    void Start()
    {
        Log("=== ARDiagnostics.Start() ===");
        Log($"Platform: {Application.platform}");
        Log($"Unity: {Application.unityVersion}");
        Log($"Scene: {UnityEngine.SceneManagement.SceneManager.GetActiveScene().name}");
        
        StartCoroutine(DiagnoseAR());
    }

    IEnumerator DiagnoseAR()
    {
        Log("=== Starting AR Diagnosis ===");
        yield return null;
        
        // 1. XR Management
        Log("--- XR Management ---");
        var xrSettings = XRGeneralSettings.Instance;
        if (xrSettings == null)
        {
            Log("CRITICAL: XRGeneralSettings.Instance is NULL!");
            Log("AR CANNOT WORK without XR initialization!");
        }
        else
        {
            Log($"XRGeneralSettings: OK");
            var mgr = xrSettings.Manager;
            if (mgr == null)
            {
                Log("CRITICAL: XRManagerSettings is NULL!");
            }
            else
            {
                Log($"XR Manager init complete: {mgr.isInitializationComplete}");
                var loader = mgr.activeLoader;
                if (loader == null)
                {
                    Log("CRITICAL: No active XR Loader! ARKit not initialized!");
                }
                else
                {
                    Log($"Active XR Loader: {loader.name} (GOOD!)");
                }
            }
        }
        
        // 2. ARSession
        Log("--- AR Session ---");
        _arSession = FindAnyObjectByType<ARSession>();
        if (_arSession == null)
        {
            Log("CRITICAL: No ARSession in scene!");
        }
        else
        {
            Log($"ARSession: {_arSession.gameObject.name} (enabled={_arSession.enabled})");
            Log($"ARSession.state: {ARSession.state}");
            if (ARSession.state == ARSessionState.None || ARSession.state == ARSessionState.Unsupported)
            {
                Log($"CRITICAL: ARSession state is {ARSession.state}!");
            }
        }
        
        // 3. Camera
        Log("--- Camera ---");
        _mainCamera = Camera.main;
        if (_mainCamera == null)
        {
            Log("CRITICAL: No Main Camera!");
            var allCams = FindObjectsByType<Camera>(FindObjectsSortMode.None);
            Log($"Found {allCams.Length} cameras:");
            foreach (var c in allCams) Log($"  {c.name} tag={c.tag} enabled={c.enabled}");
        }
        else
        {
            Log($"Main Camera: {_mainCamera.name}");
            Log($"  clearFlags: {_mainCamera.clearFlags}");
            Log($"  background: {_mainCamera.backgroundColor}");
            
            // Check if clearFlags is Skybox (1) - that's the problem!
            if (_mainCamera.clearFlags == CameraClearFlags.Skybox)
            {
                Log("WARNING: Camera clearFlags is SKYBOX - should be SolidColor or Depth for AR!");
            }
        }
        
        // 4. ARCameraManager
        Log("--- ARCameraManager ---");
        _arCameraManager = FindAnyObjectByType<ARCameraManager>();
        if (_arCameraManager == null)
        {
            Log("CRITICAL: No ARCameraManager! Camera feed won't render!");
        }
        else
        {
            Log($"ARCameraManager: {_arCameraManager.gameObject.name} (enabled={_arCameraManager.enabled})");
            _arCameraManager.frameReceived += OnCameraFrameReceived;
        }
        
        // 5. ARCameraBackground
        Log("--- ARCameraBackground ---");
        _arCameraBackground = FindAnyObjectByType<ARCameraBackground>();
        if (_arCameraBackground == null)
        {
            Log("CRITICAL: No ARCameraBackground! This renders the camera feed!");
        }
        else
        {
            Log($"ARCameraBackground: {_arCameraBackground.gameObject.name} (enabled={_arCameraBackground.enabled})");
            Log($"  useCustomMaterial: {_arCameraBackground.useCustomMaterial}");
            Log($"  material: {(_arCameraBackground.material != null ? _arCameraBackground.material.name : "NULL")}");
        }
        
        // 6. XROrigin
        Log("--- XROrigin ---");
        var xrOrigin = FindAnyObjectByType<Unity.XR.CoreUtils.XROrigin>();
        if (xrOrigin == null)
        {
            Log("CRITICAL: No XROrigin!");
        }
        else
        {
            Log($"XROrigin: {xrOrigin.gameObject.name}");
            Log($"  Camera ref: {(xrOrigin.Camera != null ? xrOrigin.Camera.name : "NULL")}");
            if (xrOrigin.Camera == null)
            {
                Log("CRITICAL: XROrigin.Camera is NULL!");
            }
        }
        
        // 7. Hierarchy dump
        Log("--- Hierarchy ---");
        var roots = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects();
        foreach (var r in roots)
        {
            DumpHierarchy(r.transform, 0);
        }
        
        Log("=== Diagnosis Complete ===");
        _initialized = true;
        
        // Send summary to RN
        yield return new WaitForSeconds(1f);
        SendToRN("ar_diagnostics", _logBuffer.ToString());
    }

    void DumpHierarchy(Transform t, int d)
    {
        var indent = new string(' ', d * 2);
        var comps = t.GetComponents<Component>();
        var names = new System.Collections.Generic.List<string>();
        foreach (var c in comps)
        {
            if (c != null) names.Add(c.GetType().Name);
        }
        Log($"{indent}{t.name} [{string.Join(",", names)}]");
        foreach (Transform child in t) DumpHierarchy(child, d + 1);
    }

    private bool _firstFrame = false;
    void OnCameraFrameReceived(ARCameraFrameEventArgs args)
    {
        if (!_firstFrame)
        {
            _firstFrame = true;
            Log("*** CAMERA FRAME RECEIVED! AR IS WORKING! ***");
            SendToRN("ar_camera_working", "First camera frame received!");
        }
    }

    void Update()
    {
        if (!_initialized) return;
        
        if (Time.time - _lastLogTime > _logInterval)
        {
            _lastLogTime = Time.time;
            var state = ARSession.state.ToString();
            var reason = ARSession.notTrackingReason.ToString();
            Log($"[t={Time.time:F0}s] ARState={state} Reason={reason} FirstFrame={_firstFrame}");
        }
    }

    void OnDestroy()
    {
        if (_arCameraManager != null)
            _arCameraManager.frameReceived -= OnCameraFrameReceived;
    }
}
