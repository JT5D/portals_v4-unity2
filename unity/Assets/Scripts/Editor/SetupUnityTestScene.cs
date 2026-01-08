using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Editor utility to setup UnityTestScene.unity for React Native integration testing.
/// Ensures BridgeTarget GameObject exists and test objects are visible.
/// </summary>
public class SetupUnityTestScene : Editor
{
    [MenuItem("Tools/Setup Unity Test Scene")]
    public static void SetupScene()
    {
        // Load the Unity Test Scene
        var scenePath = "Assets/Scenes/UnityTestScene.unity";
        var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);

        bool madeChanges = false;

        // 1. Ensure BridgeTarget exists in the scene
        var bridgeTarget = GameObject.Find("BridgeTarget");
        var bridgeTargetType = System.Type.GetType("BridgeTarget, Assembly-CSharp");

        if (bridgeTargetType == null)
        {
            Debug.LogError("[Setup] BridgeTarget type not found! Make sure BridgeTarget.cs compiles successfully.");
            return;
        }

        if (bridgeTarget == null)
        {
            Debug.Log("[Setup] Creating BridgeTarget GameObject...");
            bridgeTarget = new GameObject("BridgeTarget");
            bridgeTarget.AddComponent(bridgeTargetType);
            madeChanges = true;
        }
        else
        {
            // Ensure it has the component
            if (bridgeTarget.GetComponent(bridgeTargetType) == null)
            {
                Debug.Log("[Setup] Adding BridgeTarget component...");
                bridgeTarget.AddComponent(bridgeTargetType);
                madeChanges = true;
            }
        }

        // 2. Fix the Cube position so it's visible
        var cube = GameObject.Find("Cube");
        if (cube != null)
        {
            var targetPos = new Vector3(0f, 1f, -5f);
            if (cube.transform.position != targetPos)
            {
                Debug.Log($"[Setup] Moving Cube from {cube.transform.position} to {targetPos}");
                cube.transform.position = targetPos;
                madeChanges = true;
            }
        }
        else
        {
            Debug.LogWarning("[Setup] Cube GameObject not found in scene");
        }

        // 3. Verify Main Camera exists
        var mainCamera = Camera.main;
        if (mainCamera == null)
        {
            Debug.LogError("[Setup] Main Camera not found! Unity scene needs a camera tagged 'MainCamera'");
        }
        else
        {
            Debug.Log($"[Setup] Main Camera found at {mainCamera.transform.position}");
        }

        // Save changes if any were made
        if (madeChanges)
        {
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
            Debug.Log($"[Setup] Scene saved: {scenePath}");
        }
        else
        {
            Debug.Log("[Setup] No changes needed - scene already configured");
        }

        // Report final state
        Debug.Log("=== Unity Test Scene Setup Complete ===");
        Debug.Log($"BridgeTarget: {(GameObject.Find("BridgeTarget") != null ? "✓" : "✗")}");
        Debug.Log($"Cube position: {(cube != null ? cube.transform.position.ToString() : "NOT FOUND")}");
        Debug.Log($"Main Camera: {(mainCamera != null ? "✓" : "✗")}");
    }

    [MenuItem("Tools/Test Unity Bridge (Play Mode)")]
    public static void TestBridge()
    {
        if (!EditorApplication.isPlaying)
        {
            Debug.LogWarning("[Test] Enter Play Mode first, then run this test");
            return;
        }

        var bridgeTarget = GameObject.Find("BridgeTarget");
        if (bridgeTarget == null)
        {
            Debug.LogError("[Test] BridgeTarget not found! Run 'Tools/Setup Unity Test Scene' first");
            return;
        }

        var bridgeTargetType = System.Type.GetType("BridgeTarget, Assembly-CSharp");
        var component = bridgeTarget.GetComponent(bridgeTargetType);
        if (component == null)
        {
            Debug.LogError("[Test] BridgeTarget component not found!");
            return;
        }

        // Simulate a ping from React Native using reflection
        var testMessage = "{\"type\":\"ping\",\"source\":\"editor_test\",\"ts\":12345}";
        Debug.Log($"[Test] Sending test message: {testMessage}");

        var onMessageMethod = bridgeTargetType.GetMethod("OnMessage");
        if (onMessageMethod != null)
        {
            onMessageMethod.Invoke(component, new object[] { testMessage });
            Debug.Log("[Test] Check console above for pong response");
        }
        else
        {
            Debug.LogError("[Test] OnMessage method not found!");
        }
    }
}
