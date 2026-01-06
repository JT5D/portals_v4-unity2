import { Camera, Object3D, Vector3, Vector3Like } from "three";
import { Context } from "./engine_context.js";
/**
 * Options for fitting a camera to the scene or specific objects.
 *
 * Used by {@link OrbitControls.fitCamera} and the {@link fitCamera}.
 *
 */
export type FitCameraOptions = {
    /** When enabled debug rendering will be shown */
    debug?: boolean;
    /**
     * If true the camera position and target will be applied immediately
     * @default true
     */
    autoApply?: boolean;
    /**
     * The context to use. If not provided the current context will be used
     */
    context?: Context;
    /**
     * The camera to fit. If not provided the current camera will be used
     */
    camera?: Camera;
    /**
     * The current zoom level of the camera (used to avoid clipping when fitting)
     */
    currentZoom?: number;
    /**
     * Minimum and maximum zoom levels for the camera (e.g. if zoom is constrained by OrbitControls)
     */
    minZoom?: number;
    /**
     * Maximum zoom level for the camera (e.g. if zoom is constrained by OrbitControls)
     */
    maxZoom?: number;
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
    fitOffset?: number;
    /** The direction from which the camera should be fitted in worldspace. If not defined the current camera's position will be used */
    fitDirection?: Vector3Like;
    /** If set to "y" the camera will be centered in the y axis */
    centerCamera?: "none" | "y";
    /** Set to 'auto' to update the camera near or far plane based on the fitted-objects bounds */
    cameraNearFar?: "keep" | "auto";
    /**
     * Offset the camera position in world space
     */
    cameraOffset?: Partial<Vector3Like>;
    /**
     * Offset the camera position relative to the size of the objects being focused on (e.g. x: 0.5).
     * Value range: -1 to 1
     */
    relativeCameraOffset?: Partial<Vector3Like>;
    /**
     * Offset the camera target position in world space
     */
    targetOffset?: Partial<Vector3Like>;
    /**
     * Offset the camera target position relative to the size of the objects being focused on.
     * Value range: -1 to 1
     */
    relativeTargetOffset?: Partial<Vector3Like>;
    /**
     * Target field of view (FOV) for the camera
     */
    fov?: number;
};
export type FitCameraReturnType = {
    camera: Camera;
    position: Vector3;
    lookAt: Vector3;
    fov: number | undefined;
};
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
export declare function fitCamera(options?: FitCameraOptions): null | FitCameraReturnType;
