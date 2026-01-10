using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;
using UnityEngine.XR.ARFoundation;
using UnityEngine.InputSystem.XR;
using TMPro;
using UnityEngine.UI;

/// <summary>
/// Editor script to create and configure the AR Test Scene.
/// Menu: Tools > Create AR Test Scene (Advanced)
///
/// Features:
/// - Clean hierarchy (no duplicates)
/// - Scene meshing with classification
/// - Environment probes for realtime reflections
/// - Human body tracking 3D
/// - Plane detection
/// - Debug overlay
/// </summary>
public class ARSceneSetup : MonoBehaviour
{
    private const string SCENE_PATH = "Assets/Scenes/ARTestScene.unity";
    private const string AR_ORIGIN_PREFAB = "Assets/Prefabs/ARF XR Origin Set Up.prefab";
    private const string PLANE_PREFAB = "Assets/Prefabs/AR Feathered Plane.prefab";
    private const string MESH_PREFAB = "Assets/Prefabs/AR Mesh.prefab"; // Classification mesh prefab
    private const string BODY_PREFAB = "Assets/Prefabs/Body Tracking/Robot Kyle Body.prefab";

    [MenuItem("Tools/Create AR Test Scene (Advanced)")]
    public static void CreateAdvancedARTestScene()
    {
        Debug.Log("[ARSceneSetup] Creating Advanced AR Test Scene...");
        Debug.Log("[ARSceneSetup] Features: Meshing, Environment Probes, Body Tracking, Planes");

        // Create a new scene
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // 1. Add XR Origin prefab (contains AR Session, XR Origin, Camera, etc.)
        // This is the ONLY AR setup needed - no separate AR Session!
        GameObject arSetupGO = null;
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(AR_ORIGIN_PREFAB);
        if (prefab != null)
        {
            arSetupGO = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            arSetupGO.name = "ARF XR Origin Set Up"; // Keep original prefab name
            Debug.Log("[ARSceneSetup] Instantiated ARF XR Origin Set Up prefab (contains AR Session + XR Origin)");
        }
        else
        {
            Debug.LogError($"[ARSceneSetup] Prefab not found: {AR_ORIGIN_PREFAB}");
            Debug.LogError("[ARSceneSetup] Please ensure the AR Foundation samples are imported.");
            arSetupGO = CreateARSetupManually();
        }

        // Find the XR Origin inside the prefab to add managers
        var xrOrigin = arSetupGO.GetComponentInChildren<Unity.XR.CoreUtils.XROrigin>();
        if (xrOrigin == null)
        {
            Debug.LogError("[ARSceneSetup] No XROrigin found in prefab!");
            return;
        }
        var xrOriginGO = xrOrigin.gameObject;

        // 2. Add ARPlaneManager for plane detection
        var planeManager = xrOriginGO.GetComponent<ARPlaneManager>();
        if (planeManager == null)
        {
            planeManager = xrOriginGO.AddComponent<ARPlaneManager>();
        }
        planeManager.requestedDetectionMode = UnityEngine.XR.ARSubsystems.PlaneDetectionMode.Horizontal |
                                               UnityEngine.XR.ARSubsystems.PlaneDetectionMode.Vertical;

        var planePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(PLANE_PREFAB);
        if (planePrefab != null)
        {
            planeManager.planePrefab = planePrefab;
            Debug.Log("[ARSceneSetup] Added ARPlaneManager with prefab");
        }

        // 3. Add ARRaycastManager
        if (xrOriginGO.GetComponent<ARRaycastManager>() == null)
        {
            xrOriginGO.AddComponent<ARRaycastManager>();
            Debug.Log("[ARSceneSetup] Added ARRaycastManager");
        }

        // 4. Add ARMeshManager for scene meshing
        var meshManager = xrOriginGO.GetComponent<ARMeshManager>();
        if (meshManager == null)
        {
            meshManager = xrOriginGO.AddComponent<ARMeshManager>();
        }
        var meshPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(MESH_PREFAB);
        if (meshPrefab != null)
        {
            meshManager.meshPrefab = meshPrefab.GetComponent<MeshFilter>();
            Debug.Log("[ARSceneSetup] Added ARMeshManager with classification mesh prefab");
        }
        else
        {
            Debug.LogWarning("[ARSceneSetup] Mesh prefab not found - meshing will work but without visualization");
        }

        // 5. Add AREnvironmentProbeManager for realtime reflections
        if (xrOriginGO.GetComponent<AREnvironmentProbeManager>() == null)
        {
            var probeManager = xrOriginGO.AddComponent<AREnvironmentProbeManager>();
            probeManager.automaticPlacementRequested = true;
            Debug.Log("[ARSceneSetup] Added AREnvironmentProbeManager for realtime reflections");
        }

        // 6. Add ARHumanBodyManager for body tracking
        var bodyManager = xrOriginGO.GetComponent<ARHumanBodyManager>();
        if (bodyManager == null)
        {
            bodyManager = xrOriginGO.AddComponent<ARHumanBodyManager>();
        }
        bodyManager.pose3DRequested = true;  // Enable 3D body tracking
        bodyManager.pose2DRequested = true;  // Also enable 2D for wider compatibility

        var bodyPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(BODY_PREFAB);
        if (bodyPrefab != null)
        {
            bodyManager.humanBodyPrefab = bodyPrefab;
            Debug.Log("[ARSceneSetup] Added ARHumanBodyManager with Robot Kyle body prefab");
        }
        else
        {
            Debug.LogWarning("[ARSceneSetup] Body tracking prefab not found at: " + BODY_PREFAB);
        }

        // 7. Add AROcclusionManager for occlusion/depth - must be on the CAMERA, not XR Origin!
        var mainCamera = xrOrigin.Camera;
        if (mainCamera != null)
        {
            var cameraGO = mainCamera.gameObject;
            if (cameraGO.GetComponent<AROcclusionManager>() == null)
            {
                var occlusionManager = cameraGO.AddComponent<AROcclusionManager>();
                occlusionManager.requestedHumanDepthMode = UnityEngine.XR.ARSubsystems.HumanSegmentationDepthMode.Best;
                occlusionManager.requestedHumanStencilMode = UnityEngine.XR.ARSubsystems.HumanSegmentationStencilMode.Best;
                occlusionManager.requestedEnvironmentDepthMode = UnityEngine.XR.ARSubsystems.EnvironmentDepthMode.Best;
                Debug.Log("[ARSceneSetup] Added AROcclusionManager to Main Camera");
            }

            // Verify ARCameraManager and ARCameraBackground are present (they should be in prefab)
            if (cameraGO.GetComponent<ARCameraManager>() == null)
            {
                cameraGO.AddComponent<ARCameraManager>();
                Debug.LogWarning("[ARSceneSetup] Added missing ARCameraManager to Main Camera");
            }
            if (cameraGO.GetComponent<ARCameraBackground>() == null)
            {
                cameraGO.AddComponent<ARCameraBackground>();
                Debug.LogWarning("[ARSceneSetup] Added missing ARCameraBackground to Main Camera");
            }
        }
        else
        {
            Debug.LogError("[ARSceneSetup] XROrigin.Camera is null! Camera feed will not work.");
        }

        // 8. Add Directional Light
        var lightGO = new GameObject("Directional Light");
        var light = lightGO.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1f;
        light.shadows = LightShadows.Soft;
        lightGO.transform.rotation = Quaternion.Euler(50, -30, 0);
        Debug.Log("[ARSceneSetup] Added Directional Light");

        // 9. Add ARSessionLogger
        var loggerGO = new GameObject("AR Session Logger");
        loggerGO.AddComponent<ARSessionLogger>();
        Debug.Log("[ARSceneSetup] Added ARSessionLogger");

        // 10. Create Debug Overlay UI
        CreateDebugOverlay();

        // 11. Save the scene
        EditorSceneManager.SaveScene(scene, SCENE_PATH);
        Debug.Log($"[ARSceneSetup] Scene saved to {SCENE_PATH}");

        // 12. Add to build settings at index 0
        AddSceneToBuildSettings(SCENE_PATH);

        Debug.Log("===========================================");
        Debug.Log("[ARSceneSetup] Advanced AR Scene created!");
        Debug.Log("Features enabled:");
        Debug.Log("  - Plane Detection (Horizontal + Vertical)");
        Debug.Log("  - Scene Meshing with Classification");
        Debug.Log("  - Environment Probes (Realtime Reflections)");
        Debug.Log("  - Human Body Tracking 3D");
        Debug.Log("  - Occlusion/Depth");
        Debug.Log("  - Debug Overlay");
        Debug.Log("===========================================");
    }

    private static GameObject CreateARSetupManually()
    {
        Debug.Log("[ARSceneSetup] Creating AR setup manually (prefab not found)");

        // Root container (like the prefab structure)
        var rootGO = new GameObject("ARF XR Origin Set Up");

        // AR Session (inside the root, not separate!)
        var arSessionGO = new GameObject("AR Session");
        arSessionGO.transform.SetParent(rootGO.transform);
        arSessionGO.AddComponent<ARSession>();
        arSessionGO.AddComponent<ARInputManager>();

        // XR Origin
        var xrOriginGO = new GameObject("XR Origin");
        xrOriginGO.transform.SetParent(rootGO.transform);
        var xrOrigin = xrOriginGO.AddComponent<Unity.XR.CoreUtils.XROrigin>();

        // Camera Offset
        var cameraOffset = new GameObject("Camera Offset");
        cameraOffset.transform.SetParent(xrOriginGO.transform);
        xrOrigin.CameraFloorOffsetObject = cameraOffset;

        // Main Camera
        var cameraGO = new GameObject("Main Camera");
        cameraGO.transform.SetParent(cameraOffset.transform);
        cameraGO.tag = "MainCamera";

        var camera = cameraGO.AddComponent<Camera>();
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = Color.black;
        camera.nearClipPlane = 0.1f;
        camera.farClipPlane = 1000f;

        // AR Camera components
        cameraGO.AddComponent<ARCameraManager>();
        cameraGO.AddComponent<ARCameraBackground>();
        cameraGO.AddComponent<TrackedPoseDriver>();

        xrOrigin.Camera = camera;

        return rootGO;
    }

    private static void CreateDebugOverlay()
    {
        Debug.Log("[ARSceneSetup] Creating Debug Overlay UI...");

        // Canvas
        var canvasGO = new GameObject("Debug Canvas");
        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100; // On top of everything

        var scaler = canvasGO.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        scaler.matchWidthOrHeight = 0.5f;

        canvasGO.AddComponent<GraphicRaycaster>();

        // Debug Panel (bottom-left)
        var panelGO = new GameObject("Debug Panel");
        panelGO.transform.SetParent(canvasGO.transform);

        var panelRect = panelGO.AddComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0, 0); // Bottom-left
        panelRect.anchorMax = new Vector2(0, 0);
        panelRect.pivot = new Vector2(0, 0);
        panelRect.anchoredPosition = new Vector2(10, 10);
        panelRect.sizeDelta = new Vector2(500, 280);

        var panelImage = panelGO.AddComponent<Image>();
        panelImage.color = new Color(0, 0, 0, 0.75f);

        // Vertical Layout
        var layoutGroup = panelGO.AddComponent<VerticalLayoutGroup>();
        layoutGroup.padding = new RectOffset(10, 10, 10, 10);
        layoutGroup.spacing = 5;
        layoutGroup.childControlWidth = true;
        layoutGroup.childControlHeight = false;
        layoutGroup.childForceExpandWidth = true;
        layoutGroup.childForceExpandHeight = false;

        // Stats Text (top of panel)
        var statsGO = new GameObject("Stats Text");
        statsGO.transform.SetParent(panelGO.transform);

        var statsRect = statsGO.AddComponent<RectTransform>();
        statsRect.sizeDelta = new Vector2(0, 50);

        var statsText = statsGO.AddComponent<TextMeshProUGUI>();
        statsText.text = "FPS: -- | AR: Initializing...\nMeshes: 0 | Probes: 0 | Bodies: 0";
        statsText.fontSize = 14;
        statsText.color = Color.white;
        statsText.alignment = TextAlignmentOptions.Left;

        // Log Text (scrollable area)
        var logGO = new GameObject("Log Text");
        logGO.transform.SetParent(panelGO.transform);

        var logRect = logGO.AddComponent<RectTransform>();
        logRect.sizeDelta = new Vector2(0, 200);

        var logText = logGO.AddComponent<TextMeshProUGUI>();
        logText.text = "Waiting for logs...";
        logText.fontSize = 11;
        logText.color = new Color(0.8f, 0.8f, 0.8f);
        logText.alignment = TextAlignmentOptions.TopLeft;
        logText.overflowMode = TextOverflowModes.Truncate;
        logText.enableWordWrapping = true;

        // Add ARDebugOverlay component
        var overlayComponent = canvasGO.AddComponent<ARDebugOverlay>();

        // Use SerializedObject to set references
        var so = new SerializedObject(overlayComponent);
        so.FindProperty("statsText").objectReferenceValue = statsText;
        so.FindProperty("logText").objectReferenceValue = logText;
        so.ApplyModifiedProperties();

        Debug.Log("[ARSceneSetup] Debug Overlay created");
    }

    private static void AddSceneToBuildSettings(string scenePath)
    {
        var scenes = EditorBuildSettings.scenes;

        // Remove if already exists (to re-add at index 0)
        var sceneList = new System.Collections.Generic.List<EditorBuildSettingsScene>(scenes);
        sceneList.RemoveAll(s => s.path == scenePath);

        // Add at index 0
        sceneList.Insert(0, new EditorBuildSettingsScene(scenePath, true));

        EditorBuildSettings.scenes = sceneList.ToArray();
        Debug.Log($"[ARSceneSetup] Scene set as build index 0: {scenePath}");
    }

    [MenuItem("Tools/Fix AR Scene Camera")]
    public static void FixARSceneCamera()
    {
        Debug.Log("[ARSceneSetup] Fixing AR Scene camera references...");

        // Find all XROrigin components
        var xrOrigins = FindObjectsByType<Unity.XR.CoreUtils.XROrigin>(FindObjectsSortMode.None);
        Debug.Log($"[ARSceneSetup] Found {xrOrigins.Length} XROrigin components");

        // Find the main camera
        var mainCamera = Camera.main;
        if (mainCamera == null)
        {
            Debug.LogError("[ARSceneSetup] No Main Camera found!");
            return;
        }
        Debug.Log($"[ARSceneSetup] Main Camera found at: {GetHierarchyPath(mainCamera.transform)}");

        // Set camera on all XROrigin components
        int fixedCount = 0;
        foreach (var xrOrigin in xrOrigins)
        {
            if (xrOrigin.Camera == null)
            {
                xrOrigin.Camera = mainCamera;
                EditorUtility.SetDirty(xrOrigin);
                Debug.Log($"[ARSceneSetup] Fixed camera reference on: {xrOrigin.gameObject.name}");
                fixedCount++;
            }
            else
            {
                Debug.Log($"[ARSceneSetup] Camera already set on: {xrOrigin.gameObject.name}");
            }
        }

        // Save scene
        EditorSceneManager.SaveOpenScenes();
        Debug.Log($"[ARSceneSetup] Fixed {fixedCount} camera references, scene saved.");
    }

    [MenuItem("Tools/Validate AR Scene")]
    public static void ValidateARScene()
    {
        Debug.Log("[ARSceneSetup] Validating current scene...");

        var issues = 0;
        var warnings = 0;

        // Check for duplicates first
        var arSessions = FindObjectsByType<ARSession>(FindObjectsSortMode.None);
        if (arSessions.Length > 1)
        {
            Debug.LogError($"[DUPLICATE] Found {arSessions.Length} ARSession components! Should be exactly 1.");
            issues++;
        }
        else if (arSessions.Length == 1)
        {
            Debug.Log("[OK] ARSession found (1 instance)");
        }
        else
        {
            Debug.LogError("[MISSING] ARSession not found!");
            issues++;
        }

        var xrOrigins = FindObjectsByType<Unity.XR.CoreUtils.XROrigin>(FindObjectsSortMode.None);
        if (xrOrigins.Length > 1)
        {
            Debug.LogWarning($"[DUPLICATE] Found {xrOrigins.Length} XROrigin components. Expected 1.");
            warnings++;
        }
        else if (xrOrigins.Length == 1)
        {
            Debug.Log("[OK] XROrigin found (1 instance)");

            var xrOrigin = xrOrigins[0];
            if (xrOrigin.Camera == null)
            {
                Debug.LogError("[MISSING] XROrigin camera not assigned!");
                issues++;
            }
            else
            {
                Debug.Log("[OK] XROrigin camera assigned");
            }
        }
        else
        {
            Debug.LogError("[MISSING] XROrigin not found!");
            issues++;
        }

        // Check AR managers
        CheckManager<ARPlaneManager>("ARPlaneManager");
        CheckManager<ARRaycastManager>("ARRaycastManager");
        CheckManager<ARMeshManager>("ARMeshManager (Scene Meshing)");
        CheckManager<AREnvironmentProbeManager>("AREnvironmentProbeManager (Reflections)");
        CheckManager<ARHumanBodyManager>("ARHumanBodyManager (Body Tracking)");
        CheckManager<AROcclusionManager>("AROcclusionManager (Depth/Occlusion)");
        CheckManager<ARDebugOverlay>("ARDebugOverlay");
        CheckManager<ARSessionLogger>("ARSessionLogger");

        // Summary
        Debug.Log("-------------------------------------------");
        if (issues == 0 && warnings == 0)
        {
            Debug.Log("[ARSceneSetup] Validation PASSED - scene is ready!");
        }
        else
        {
            Debug.LogWarning($"[ARSceneSetup] Found {issues} errors, {warnings} warnings");
        }
    }

    private static void CheckManager<T>(string name) where T : Component
    {
        var manager = FindAnyObjectByType<T>();
        if (manager == null)
        {
            Debug.LogWarning($"[MISSING] {name}");
        }
        else
        {
            Debug.Log($"[OK] {name}");
        }
    }

    private static string GetHierarchyPath(Transform transform)
    {
        string path = transform.name;
        while (transform.parent != null)
        {
            transform = transform.parent;
            path = transform.name + "/" + path;
        }
        return path;
    }
}
