import { Camera, Object3D, PerspectiveCamera, Vector3, Vector3Like } from "three";

import { GroundProjectedEnv } from "../engine-components/GroundProjection.js";
import type { OrbitControls } from "../engine-components/OrbitControls.js";
import { findObjectOfType } from "./engine_components.js";
import { Context } from "./engine_context.js";
import { Gizmos } from "./engine_gizmos.js";
import { getBoundingBox } from "./engine_three_utils.js";
import { NeedleXRSession } from "./xr/NeedleXRSession.js";


/**
 * Options for fitting a camera to the scene or specific objects.
 * 
 * Used by {@link OrbitControls.fitCamera} and the {@link fitCamera}.
 * 
 */
export type FitCameraOptions = {
    /** When enabled debug rendering will be shown */
    debug?: boolean,

    /**
     * If true the camera position and target will be applied immediately
     * @default true
     */
    autoApply?: boolean,

    /**
     * The context to use. If not provided the current context will be used
     */
    context?: Context,

    /**
     * The camera to fit. If not provided the current camera will be used
     */
    camera?: Camera,

    /**
     * The current zoom level of the camera (used to avoid clipping when fitting)
     */
    currentZoom?: number,
    /**
     * Minimum and maximum zoom levels for the camera (e.g. if zoom is constrained by OrbitControls)
     */
    minZoom?: number,
    /**
     * Maximum zoom level for the camera (e.g. if zoom is constrained by OrbitControls)
     */
    maxZoom?: number,

    /**
     * The objects to fit the camera to. If not provided the scene children will be used
     */
    objects?: Object3D[] | Object3D;

    /**
     * A factor to control padding around the fitted objects.  
     * 
     * Values &gt; 1 will add more space around the fitted objects, values &lt; 1 will zoom in closer.
     * 
     * @default 1.1
     */
    fitOffset?: number,

    /** The direction from which the camera should be fitted in worldspace. If not defined the current camera's position will be used */
    fitDirection?: Vector3Like,

    /** If set to "y" the camera will be centered in the y axis */
    centerCamera?: "none" | "y",
    /** Set to 'auto' to update the camera near or far plane based on the fitted-objects bounds */
    cameraNearFar?: "keep" | "auto",

    /**
     * Offset the camera position in world space
     */
    cameraOffset?: Partial<Vector3Like>,
    /**
     * Offset the camera position relative to the size of the objects being focused on (e.g. x: 0.5).  
     * Value range: -1 to 1
     */
    relativeCameraOffset?: Partial<Vector3Like>,

    /**
     * Offset the camera target position in world space
     */
    targetOffset?: Partial<Vector3Like>,
    /**
     * Offset the camera target position relative to the size of the objects being focused on.  
     * Value range: -1 to 1
     */
    relativeTargetOffset?: Partial<Vector3Like>,

    /**
     * Target field of view (FOV) for the camera
     */
    fov?: number,
}

export type FitCameraReturnType = {
    camera: Camera,
    position: Vector3,
    lookAt: Vector3,
    fov: number | undefined
}

/**
 * Fit the camera to the specified objects or the whole scene.    
 * Adjusts the camera position and optionally the FOV to ensure all objects are visible.
 * 
 * @example Fit the main camera to the entire scene:
 * ```ts
 * import { fitCamera } from '@needle-tools/engine';
 * 
 * // Fit the main camera to the entire scene
 * fitCamera();
 * ```
 * @example Fit a specific camera to specific objects with custom options:
 * ```ts
 * import { fitCamera } from '@needle-tools/engine';
 * 
 * // Fit a specific camera to specific objects with custom options
 * const myCamera = ...; // your camera
 * const objectsToFit = [...]; // array of objects to fit
 * fitCamera({
 *    camera: myCamera,
 *    objects: objectsToFit,
 *    fitOffset: 1,
 *    fov: 20,
 * });
 * ```
 * 
 * @param options Options for fitting the camera
 * @returns 
 */
export function fitCamera(options?: FitCameraOptions): null | FitCameraReturnType {

    if (NeedleXRSession.active) {
        // camera fitting in XR is not supported
        console.warn('[OrbitControls] Can not fit camera while XR session is active');
        return null;
    }

    const context = Context.Current;
    if (!context) {
        console.warn('[OrbitControls] No context found');
        return null;
    }
    const camera = options?.camera || context.mainCamera;

    // const controls = this._controls as ThreeOrbitControls | null;

    if (!camera) {
        console.warn("No camera or controls found to fit camera to objects...");
        return null;
    }

    if (!options) options = {}
    options.autoApply = options.autoApply !== false; // default to true
    options.minZoom ||= 0;
    options.maxZoom ||= Infinity;

    const {
        centerCamera,
        cameraNearFar = "auto",
        fitOffset = 1.1,
        fov = camera instanceof PerspectiveCamera ? camera?.fov : -1
    } = options;

    const size = new Vector3();
    const center = new Vector3();
    const aspect = camera instanceof PerspectiveCamera ? camera.aspect : 1;
    const objects = options.objects || context.scene;
    // TODO would be much better to calculate the bounds in camera space instead of world space - 
    // we would get proper view-dependant fit.
    // Right now it's independent from where the camera is actually looking from,
    // and thus we're just getting some maximum that will work for sure.
    const box = getBoundingBox(objects, undefined, camera?.layers);
    const boxCopy = box.clone();
    box.getCenter(center);

    const box_size = new Vector3();
    box.getSize(box_size);

    // project this box into camera space
    if (camera instanceof PerspectiveCamera) camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    box.applyMatrix4(camera.matrixWorldInverse);

    box.getSize(size);
    box.setFromCenterAndSize(center, size);
    if (Number.isNaN(size.x) || Number.isNaN(size.y) || Number.isNaN(size.z)) {
        console.warn("Camera fit size resultet in NaN", camera, box);
        return null;
    }
    if (size.length() <= 0.0000000001) {
        console.warn("Camera fit size is zero", box);
        return null;
    }

    const verticalFov = fov;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * Math.PI / 360 / 2) * aspect) / Math.PI * 360;
    const fitHeightDistance = size.y / (2 * Math.atan(Math.PI * verticalFov / 360));
    const fitWidthDistance = size.x / (2 * Math.atan(Math.PI * horizontalFov / 360));

    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance) + size.z / 2;
    options.maxZoom = distance * 10;
    options.minZoom = distance * 0.01;

    if (options.debug === true) {
        console.log("Fit camera to objects", { fitHeightDistance, fitWidthDistance, distance, verticalFov, horizontalFov });
    }

    const verticalOffset = 0.05;
    const lookAt = center.clone();
    lookAt.y -= size.y * verticalOffset;
    if (options.targetOffset) {
        if (options.targetOffset.x !== undefined) lookAt.x += options.targetOffset.x;
        if (options.targetOffset.y !== undefined) lookAt.y += options.targetOffset.y;
        if (options.targetOffset.z !== undefined) lookAt.z += options.targetOffset.z;
    }
    if (options.relativeTargetOffset) {
        if (options.relativeTargetOffset.x !== undefined) lookAt.x += options.relativeTargetOffset.x * size.x;
        if (options.relativeTargetOffset.y !== undefined) lookAt.y += options.relativeTargetOffset.y * size.y;
        if (options.relativeTargetOffset.z !== undefined) lookAt.z += options.relativeTargetOffset.z * size.z;
    }
    // this.setLookTargetPosition(lookAt, immediate);
    // this.setFieldOfView(options.fov, immediate);

    if (cameraNearFar == undefined || cameraNearFar == "auto") {
        // Check if the scene has a GroundProjectedEnv and include the scale to the far plane so that it doesnt cut off
        const groundprojection = findObjectOfType(GroundProjectedEnv);
        const groundProjectionRadius = groundprojection ? groundprojection.radius : 0;
        const boundsMax = Math.max(box_size.x, box_size.y, box_size.z, groundProjectionRadius);
        // TODO: this doesnt take the Camera component nearClipPlane into account
        if (camera instanceof PerspectiveCamera) {
            camera.near = (distance / 100);
            camera.far = boundsMax + distance * 10;
            camera.updateProjectionMatrix();
        }

        // adjust maxZoom so that the ground projection radius is always inside
        if (groundprojection) {
            options.maxZoom = Math.max(Math.min(options.maxZoom, groundProjectionRadius * 0.5), distance);
        }
    }

    // ensure we're not clipping out of the current zoom level just because we're fitting
    if (options.currentZoom !== undefined) {
        if (options.currentZoom < options.minZoom) options.minZoom = options.currentZoom * 0.9;
        if (options.currentZoom > options.maxZoom) options.maxZoom = options.currentZoom * 1.1;
    }

    const direction = center.clone();
    if (options.fitDirection) {
        direction.sub(new Vector3().copy(options.fitDirection).multiplyScalar(1_000_000));
    }
    else {
        direction.sub(camera.worldPosition);
    }
    if (centerCamera === "y")
        direction.y = 0;
    direction.normalize();
    direction.multiplyScalar(distance);
    if (centerCamera === "y")
        direction.y += -verticalOffset * 4 * distance;

    let cameraLocalPosition = center.clone().sub(direction);
    if (options.cameraOffset) {
        if (options.cameraOffset.x !== undefined) cameraLocalPosition.x += options.cameraOffset.x;
        if (options.cameraOffset.y !== undefined) cameraLocalPosition.y += options.cameraOffset.y;
        if (options.cameraOffset.z !== undefined) cameraLocalPosition.z += options.cameraOffset.z;
    }
    if (options.relativeCameraOffset) {
        if (options.relativeCameraOffset.x !== undefined) cameraLocalPosition.x += options.relativeCameraOffset.x * size.x;
        if (options.relativeCameraOffset.y !== undefined) cameraLocalPosition.y += options.relativeCameraOffset.y * size.y;
        if (options.relativeCameraOffset.z !== undefined) cameraLocalPosition.z += options.relativeCameraOffset.z * size.z;
    }
    if (camera.parent) {
        cameraLocalPosition = camera.parent.worldToLocal(cameraLocalPosition);
    }
    // this.setCameraTargetPosition(cameraLocalPosition, immediate);

    if (options.debug) {
        Gizmos.DrawWireBox3(box, 0xffff33, 10);
        Gizmos.DrawWireBox3(boxCopy, 0x00ff00, 10);
    }

    if (options.autoApply) {
        camera.position.copy(cameraLocalPosition);
        camera.lookAt(lookAt);
        if (fov > 0 && camera instanceof PerspectiveCamera) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
    }

    return {
        camera: camera,
        position: cameraLocalPosition,
        lookAt: lookAt,
        fov: options.fov,
    }
}