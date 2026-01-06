using UnityEngine;
using System.Runtime.InteropServices;

public class BridgeTarget : MonoBehaviour
{
    private static class NativeAPI
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        public static extern void sendMessageToMobileApp(string message);
#endif
    }

    public void OnMessage(string json)
    {
        // Basic pong reply
        var payload = "{\"type\":\"pong\",\"source\":\"unity\"}";
#if UNITY_ANDROID
        using (var jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
        {
            jc.CallStatic("sendMessageToMobileApp", payload);
        }
#elif UNITY_IOS && !UNITY_EDITOR
        NativeAPI.sendMessageToMobileApp(payload);
#else
        Debug.Log($"[BridgeTarget] Received: {json}");
        Debug.Log($"[BridgeTarget] Sending: {payload}");
#endif
    }
}
