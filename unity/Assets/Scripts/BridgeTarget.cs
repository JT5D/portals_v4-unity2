using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;

public class BridgeTarget : MonoBehaviour
{
    // === DEBUG CONFIGURATION ===
    // Set to false for production builds to eliminate logging overhead
    private const bool DEBUG_ENABLED = true;
    private const string LOG_PREFIX = "[Bridge]";

    // Stats tracking (only in debug mode)
    private static int _messagesReceived = 0;
    private static int _messagesSent = 0;
    private static float _lastMessageTime = 0f;

    private const int MaxLogs = 15;
    private static readonly Queue<string> LogBuffer = new();

    private static class NativeAPI
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        public static extern void sendMessageToMobileApp(string message);
#endif
    }

    // === LOGGING HELPERS ===
    private static void LogDebug(string message)
    {
        if (!DEBUG_ENABLED) return;
        Debug.Log($"{LOG_PREFIX} {message}");
    }

    private static void LogWarning(string message)
    {
        if (!DEBUG_ENABLED) return;
        Debug.LogWarning($"{LOG_PREFIX} {message}");
    }

    private static void LogError(string message)
    {
        // Always log errors even in production
        Debug.LogError($"{LOG_PREFIX} {message}");
    }

    private static void LogStats()
    {
        if (!DEBUG_ENABLED) return;
        Debug.Log($"{LOG_PREFIX} [Stats] RX:{_messagesReceived} TX:{_messagesSent} LastMsg:{_lastMessageTime:F1}s ago");
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void EnsureBridgeTarget()
    {
        if (FindAnyObjectByType<BridgeTarget>() != null) return;
        var go = new GameObject("BridgeTarget");
        go.AddComponent<BridgeTarget>();
        DontDestroyOnLoad(go);
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

        // 1. Load the Asset (No "Resources" prefix needed in path)
        var vfxAsset = Resources.Load<UnityEngine.VFX.VisualEffectAsset>("VFX/SimpleBrush");
        if (vfxAsset == null)
        {
            LogError("Failed to load VFX/SimpleBrush from Resources");
            SendToMobileApp(BuildJSON("error", "Asset not found"));
            return;
        }

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
}
