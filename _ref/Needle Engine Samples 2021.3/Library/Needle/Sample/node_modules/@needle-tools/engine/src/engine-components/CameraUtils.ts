import { Color, PerspectiveCamera, PMREMGenerator } from "three";

import { getCameraController } from "../engine/engine_camera.js";
import { addNewComponent, getOrAddComponent } from "../engine/engine_components.js";
import { Context } from "../engine/engine_context.js";
import { ContextEvent, ContextRegistry } from "../engine/engine_context_registry.js";
import type { ICamera, IContext } from "../engine/engine_types.js";
import { getParam } from "../engine/engine_utils.js";
import { NeedleEngineWebComponent } from "../engine/webcomponents/needle-engine.js";
import { Camera, ClearFlags } from "./Camera.js";
import { OrbitControls } from "./OrbitControls.js";
import { EnvironmentScene } from "./utils/EnvironmentScene.js";

const debug = getParam("debugmissingcamera");

/**
 * Handler for missing camera events. Creates a default fallback camera when no camera is found in the scene.
 * Sets up camera properties based on the context and HTML element attributes.
 * 
 * @param evt The context event containing scene and configuration information
 * @returns The created camera component
 */
ContextRegistry.registerCallback(ContextEvent.MissingCamera, (evt) => {
    if (debug) console.warn("Creating missing camera")
    const scene = evt.context.scene;

    const cameraObject = new PerspectiveCamera();
    cameraObject.name = "Default Fallback Camera"
    scene.add(cameraObject);

    const camInstance = new Camera();
    camInstance.sourceId = evt.files?.[0]?.src ?? "unknown"
    camInstance.fieldOfView = 35;

    const transparentAttribute = evt.context.domElement.getAttribute("transparent");
    if (transparentAttribute != undefined) {
        camInstance.clearFlags = ClearFlags.Uninitialized;
    }
    // Set the clearFlags to a skybox if we have one OR if the user set a background-image attribute
    else if (evt.context.domElement.getAttribute("background-image")?.length || (evt.context as Context).lightmaps.tryGetSkybox(camInstance.sourceId)) {
        camInstance.clearFlags = ClearFlags.Skybox;
    }
    else {
        camInstance.clearFlags = ClearFlags.SolidColor;

        // Don't set the background color if the user set a background color in the <needle-engine> element
        if (!evt.context.domElement.getAttribute("background-color")) {
            let backgroundColor = "#efefef";
            if (typeof window !== undefined && (window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                backgroundColor = "#1f1f1f";
            }
            scene.background = new Color(backgroundColor); // dont set it on the camera because this might be controlled from "background-color" attribute which is set on the scene directly. If the camera has a background color, it will override the scene's background color
        }

        // Generate a default environment map if none is set
        if (!scene.environment) {
            const pmremGenerator = new PMREMGenerator(evt.context.renderer);
            const env = new EnvironmentScene("neutral");
            scene.environment = pmremGenerator.fromScene(env, .025).texture;
        }
    }


    const cam = addNewComponent(cameraObject, camInstance, true) as ICamera;
    cameraObject.position.x = 0;
    cameraObject.position.y = 1;
    cameraObject.position.z = 2;

    const engineElement = evt.context.domElement as NeedleEngineWebComponent
    // If the camera is missing and the <needle-engine controls> is not set to false, create default camera controls
    // That way we still create controls if the attribute is not added to <needle-engine> at all
    if (engineElement?.cameraControls != false) {
        createDefaultCameraControls(evt.context, cam);
    }

    return cam;
});

/**
 * Handler for context creation events. Checks if camera controls should be added
 * to the main camera when the context is created.
 * 
 * @param evt The context creation event containing the context information
 */
ContextRegistry.registerCallback(ContextEvent.ContextCreated, (evt) => {
    if (!evt.context.mainCamera) {
        if (debug) console.log("Will not auto-fit because a default camera exists");
        return;
    }

    // check if <needle-engine camera-controls> attribute is present or enabled
    const engineElement = evt.context.domElement as NeedleEngineWebComponent
    if (engineElement?.cameraControls == true) {

        // Check if something else already acts as a camera controller
        const existing = getCameraController(evt.context.mainCamera);
        if (existing?.isCameraController == true) {
            if (debug) console.log("Will not auto-fit because a camera controller exists");
            return;
        }
        createDefaultCameraControls(evt.context);
    }
})

/**
 * Creates default orbit camera controls for the specified camera.
 * Configures auto-rotation and auto-fit settings based on HTML attributes.
 * 
 * @param context The rendering context
 * @param cam Optional camera component to attach controls to (uses main camera if not specified)
 */
function createDefaultCameraControls(context: IContext, cam?: ICamera) {

    cam = cam ?? context.mainCameraComponent;
    const cameraObject = cam?.gameObject;
    if (debug) console.log("Creating default camera controls", cam?.name)
    if (cameraObject) {
        const orbit = getOrAddComponent(cameraObject, OrbitControls) as OrbitControls;
        orbit.sourceId = cam?.sourceId ?? "unknown";
        // /enable auto-rotate if the auto-rotate attribute is provided
        const autoRotate = context.domElement.getAttribute("auto-rotate");
        orbit.autoRotate = autoRotate != "0" && autoRotate?.toLowerCase() != "false";
        const autoRotateSpeed = Number.parseFloat(autoRotate || ".5");
        orbit.autoRotateSpeed = !isNaN(autoRotateSpeed) ? autoRotateSpeed : .5;
        if(debug) console.log("Auto-rotate", orbit.autoRotate, "speed:", orbit.autoRotateSpeed);
        const autoFit = context.domElement.getAttribute("auto-fit");
        orbit.autoFit = autoFit !== "0" && autoFit?.toLowerCase() != "false";
        orbit.autoTarget = true;
    }
    else {
        console.warn("Missing camera object, can not add orbit controls")
    }
}