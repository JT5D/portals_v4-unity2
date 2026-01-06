using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;

public class BridgeTarget : MonoBehaviour
{
    private const int MaxLogs = 12;
    private static readonly Queue<string> LogBuffer = new();
    private bool m_ShowOverlay = true;
    private GameObject m_DebugCube;
    private float m_LastCameraCheck;

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
        if (FindObjectOfType<BridgeTarget>() != null)
        {
            return;
        }

        var go = new GameObject("BridgeTarget");
        go.AddComponent<BridgeTarget>();
    }

    private void Awake()
    {
        DontDestroyOnLoad(gameObject);
        Application.logMessageReceived += HandleLog;
    }

    private void OnDestroy()
    {
        Application.logMessageReceived -= HandleLog;
    }

    private void Start()
    {
        Debug.Log("BridgeTarget ready");
        SendToMobileApp(BuildPayload("unity_ready", "Unity booted"));
        TryCreateDebugCube();
    }

    private void Update()
    {
        if (m_DebugCube == null && Time.unscaledTime - m_LastCameraCheck > 1f)
        {
            m_LastCameraCheck = Time.unscaledTime;
            TryCreateDebugCube();
        }
    }

    public void OnMessage(string json)
    {
        Debug.Log($"[BridgeTarget] Received: {json}");

        var payload = BuildPayload("pong", "Unity received ping");
        SendToMobileApp(payload);
        Debug.Log($"[BridgeTarget] Sending: {payload}");
    }

    private static string BuildPayload(string type, string note)
    {
        var sceneName = SceneManager.GetActiveScene().name;
        var timestamp = Time.realtimeSinceStartup.ToString("0.000", CultureInfo.InvariantCulture);
        return $"{{\\\"type\\\":\\\"{type}\\\",\\\"source\\\":\\\"unity\\\",\\\"scene\\\":\\\"{sceneName}\\\",\\\"note\\\":\\\"{note}\\\",\\\"ts\\\":{timestamp}}}";
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
        Debug.Log($"[BridgeTarget] Would send: {payload}");
#endif
    }

    private void TryCreateDebugCube()
    {
        if (m_DebugCube != null)
        {
            return;
        }

        var cam = Camera.main;
        if (cam == null)
        {
            return;
        }

        m_DebugCube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        m_DebugCube.name = "UnityBridgeDebugCube";
        m_DebugCube.transform.SetParent(cam.transform, false);
        m_DebugCube.transform.localPosition = new Vector3(0f, 0f, 0.4f);
        m_DebugCube.transform.localScale = Vector3.one * 0.08f;
    }

    private static void HandleLog(string logString, string stackTrace, LogType type)
    {
        if (LogBuffer.Count >= MaxLogs)
        {
            LogBuffer.Dequeue();
        }

        LogBuffer.Enqueue($"[{type}] {logString}");
    }

    private void OnGUI()
    {
        if (!m_ShowOverlay)
        {
            return;
        }

        GUI.color = new Color(0f, 0f, 0f, 0.6f);
        GUI.Box(new Rect(10, 10, Screen.width - 20, 200), GUIContent.none);
        GUI.color = Color.white;

        GUILayout.BeginArea(new Rect(20, 20, Screen.width - 40, 180));
        GUILayout.Label("Unity Bridge Debug", GUI.skin.label);
        foreach (var line in LogBuffer)
        {
            GUILayout.Label(line, GUI.skin.label);
        }

        if (GUILayout.Button("Hide Debug"))
        {
            m_ShowOverlay = false;
        }
        GUILayout.EndArea();
    }
}
