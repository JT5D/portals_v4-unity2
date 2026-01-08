using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;

public class BridgeTarget : MonoBehaviour
{
    private const int MaxLogs = 15;
    private static readonly Queue<string> LogBuffer = new();

    private static class NativeAPI
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        public static extern void sendMessageToMobileApp(string message);
#endif
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void EnsureBridgeTarget()
    {
        if (FindObjectOfType<BridgeTarget>() != null) return;
        var go = new GameObject("BridgeTarget");
        go.AddComponent<BridgeTarget>();
        DontDestroyOnLoad(go);
    }

    private void Start()
    {
        Debug.Log("[Bridge] Ready and listening.");
        SendToMobileApp(BuildJSON("unity_ready", "Portals v4 Reality Engine Loaded"));
    }

    // --- The Core Router ---
    public void OnMessage(string json)
    {
        Debug.Log($"[Bridge] Received: {json}");

        // Simple manual JSON parsing (Fast, no allocs)
        if (json.Contains("\"action\":\"spawnBrush\""))
        {
            HandleSpawnBrush(json);
        }
        else if (json.Contains("\"action\":\"ping\""))
        {
            SendToMobileApp(BuildJSON("pong", "Unity Alive"));
        }
    }

    private void HandleSpawnBrush(string json)
    {
        Debug.Log("[Bridge] Spawn Brush Request Received");

        // 1. Load the Asset (No "Resources" prefix needed in path)
        var vfxAsset = Resources.Load<UnityEngine.VFX.VisualEffectAsset>("VFX/SimpleBrush");
        if (vfxAsset == null)
        {
            Debug.LogError("[Bridge] Failed to load VFX/SimpleBrush from Resources");
            SendToMobileApp(BuildJSON("error", "Asset not found"));
            return;
        }

        // 2. Spawn the Container
        var brushGO = new GameObject($"Brush_{Time.frameCount}");
        brushGO.transform.position = Camera.main ? Camera.main.transform.position + (Camera.main.transform.forward * 0.5f) : Vector3.zero;

        // 3. Add VFX Component
        var vfx = brushGO.AddComponent<UnityEngine.VFX.VisualEffect>();
        vfx.visualEffectAsset = vfxAsset;
        vfx.Play();

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
#if UNITY_ANDROID
        using (var jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
        {
            jc.CallStatic("sendMessageToMobileApp", payload);
        }
#elif UNITY_IOS && !UNITY_EDITOR
        NativeAPI.sendMessageToMobileApp(payload);
#else
        Debug.Log($"[Bridge-Mock] Sending: {payload}");
#endif
    }
}
