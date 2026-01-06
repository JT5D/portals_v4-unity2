import { Camera, Object3D, PerspectiveCamera, WebGLRenderer } from "three";
import type { ICameraController } from "./engine_types.js";
/** Get the camera controller for the given camera (if any)
 */
export declare function getCameraController(cam: Camera): ICameraController | null;
/** Set the camera controller for the given camera */
export declare function setCameraController(cam: Camera, cameraController: ICameraController, active: boolean): void;
/**
 * Used by e.g. getBoundingBox via ContactShadows or OrbitControls when fitting the camera or shadow planes. Objects can be marked to be excluded from bounding box calculations via `setAutoFitEnabled(obj, <bool>)`
 * @see setAutoFitEnabled
 * @internal
 */
export declare function useForAutoFit(obj: Object3D): boolean;
/**
 * Enable or disable autofitting for the given object. Objects that are 'disabled' will be excluded in getBoundingBox calculations.
 * This is used by ContactShadows or OrbitControls when fitting the shadow plane or camera to the given objects or scene.
 * @see useForAutoFit
 */
export declare function setAutoFitEnabled(obj: Object3D, enabled: boolean): void;
export type FocusRectSettings = {
    /** Lower values will result in faster alignment with the rect (value ~= seconds to reach target)
     * Minimum value is 0.
     */
    damping: number;
    /** X offset in camera coordinates. Used by ViewBox component */
    offsetX: number;
    /** Y offset in camera coordinates. Used by ViewBox component */
    offsetY: number;
    /** Zoom factor. Used by ViewBox component */
    zoom: number;
};
export type FocusRect = DOMRect | Element | {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** Used internally by the Needle Engine context via 'setFocusRect(<rect>)'  */
export declare function updateCameraFocusRect(focusRect: FocusRect, settings: FocusRectSettings, dt: number, camera: PerspectiveCamera, renderer: WebGLRenderer): void;
