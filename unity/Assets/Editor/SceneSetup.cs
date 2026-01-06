using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;

public class SceneSetup
{
    [MenuItem("Tools/Setup Sample Scene")]
    public static void CreateSampleScene()
    {
        string scenePath = "Assets/Scenes/SampleScene.unity";

        // Ensure directory exists
        if (!System.IO.Directory.Exists("Assets/Scenes"))
        {
            System.IO.Directory.CreateDirectory("Assets/Scenes");
        }

        // Create a new scene
        Scene scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

        // Create a Cube to see something 3D
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.transform.position = new Vector3(0, 0, 3);
        cube.transform.Rotate(10, 20, 30);

        // Add a rotating script to the cube so we know it's alive
        // (We do this viaAddComponent, but since we don't have a Rotator script file, we'll skip logic for now or add a simple one if we had it)

        // Create the Bridge Object (Receiver)
        GameObject bridgeObj = new GameObject("UnityMessageManager");
        // This object is where we'd attach a script to receive messages from React Native if we had one.

        // Add ButtonBehavior to the Cube to allow sending messages on click
        cube.AddComponent<ButtonBehavior>();


        // For now, just saving the scene with a Cube is better than an empty scene.
        EditorSceneManager.SaveScene(scene, scenePath);
        Debug.Log("Created SampleScene with a Cube at " + scenePath);
    }
}
