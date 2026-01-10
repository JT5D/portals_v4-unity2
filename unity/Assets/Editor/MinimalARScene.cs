using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.XR.ARFoundation;

public class MinimalARScene
{
    private const string SCENE_PATH = "Assets/Scenes/MinimalARTest.unity";
    private const string AR_ORIGIN_PREFAB = "Assets/Prefabs/ARF XR Origin Set Up.prefab";

    [MenuItem("Tools/Create Minimal AR Scene")]
    public static void CreateMinimalScene()
    {
        Debug.Log("[MinimalAR] Creating minimal AR scene - prefab only, no extra components");

        // New empty scene
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // Add XR Origin prefab - NOTHING ELSE
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(AR_ORIGIN_PREFAB);
        if (prefab != null)
        {
            var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            go.name = "ARF XR Origin Set Up";
            Debug.Log("[MinimalAR] Prefab instantiated - that's all!");
        }
        else
        {
            Debug.LogError("[MinimalAR] Prefab not found!");
            return;
        }

        // Add just a directional light
        var lightGO = new GameObject("Directional Light");
        var light = lightGO.AddComponent<Light>();
        light.type = LightType.Directional;
        lightGO.transform.rotation = Quaternion.Euler(50, -30, 0);

        // Save
        EditorSceneManager.SaveScene(scene, SCENE_PATH);
        Debug.Log("[MinimalAR] Scene saved to " + SCENE_PATH);

        // Set as build scene 0
        var buildScenes = new EditorBuildSettingsScene[] {
            new EditorBuildSettingsScene(SCENE_PATH, true),
            new EditorBuildSettingsScene("Assets/Scenes/ARTestScene.unity", true)
        };
        EditorBuildSettings.scenes = buildScenes;
        Debug.Log("[MinimalAR] Set as first build scene");
    }
}
