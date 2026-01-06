using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class UnityReadyNotifier
{
    private static class NativeAPI
    {
#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        public static extern void sendMessageToMobileApp(string message);
#endif
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void NotifyReady()
    {
        var sceneName = SceneManager.GetActiveScene().name;
        var payload = $"{{\"type\":\"unity_ready\",\"scene\":\"{sceneName}\"}}";

#if UNITY_ANDROID
        using (var jc = new AndroidJavaClass("com.azesmwayreactnativeunity.ReactNativeUnityViewManager"))
        {
            jc.CallStatic("sendMessageToMobileApp", payload);
        }
#elif UNITY_IOS && !UNITY_EDITOR
        NativeAPI.sendMessageToMobileApp(payload);
#else
        Debug.Log($"[UnityReadyNotifier] {payload}");
#endif
    }
}
