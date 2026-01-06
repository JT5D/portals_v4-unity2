import { Camera, HemisphereLightHelper, Object3D, PerspectiveCamera, Vector2, WebGLRenderer } from "three";

import { Mathf } from "./engine_math.js";
import type { ICameraController } from "./engine_types.js";
import { getParam } from "./engine_utils.js";


const $cameraController = "needle:cameraController";

/** Get the camera controller for the given camera (if any)
 */
export function getCameraController(cam: Camera): ICameraController | null {
    return cam[$cameraController];
}

/** Set the camera controller for the given camera */
export function setCameraController(cam: Camera, cameraController: ICameraController, active: boolean) {
    if (active)
        cam[$cameraController] = cameraController;
    else {
        if (cam[$cameraController] === cameraController)
            cam[$cameraController] = null;
    }
}


const autofit = "needle:autofit";

/** 
 * Used by e.g. getBoundingBox via ContactShadows or OrbitControls when fitting the camera or shadow planes. Objects can be marked to be excluded from bounding box calculations via `setAutoFitEnabled(obj, <bool>)`
 * @see setAutoFitEnabled
 * @internal 
 */
export function useForAutoFit(obj: Object3D): boolean {
    // if autofit is not defined we assume it may be included
    if (obj[autofit] === undefined) return true;
    // otherwise if anything is set except false we assume it should be included
    return obj[autofit] !== false;
}

/**
 * Enable or disable autofitting for the given object. Objects that are 'disabled' will be excluded in getBoundingBox calculations.   
 * This is used by ContactShadows or OrbitControls when fitting the shadow plane or camera to the given objects or scene.
 * @see useForAutoFit
 */
export function setAutoFitEnabled(obj: Object3D, enabled: boolean): void {
    obj[autofit] = enabled;
}



export type FocusRectSettings = {
    /** Lower values will result in faster alignment with the rect (value ~= seconds to reach target) 
     * Minimum value is 0.
     */
    damping: number,

    /** X offset in camera coordinates. Used by ViewBox component */
    offsetX: number,
    /** Y offset in camera coordinates. Used by ViewBox component */
    offsetY: number,
    /** Zoom factor. Used by ViewBox component */
    zoom: number,
}
export type FocusRect = DOMRect | Element | { x: number, y: number, width: number, height: number };

let rendererRect: DOMRect | undefined = undefined;
const overlapRect = { x: 0, y: 0, width: 0, height: 0 };
const _testTime = 1;
const debug = getParam("debugfocusrect");

/** Used internally by the Needle Engine context via 'setFocusRect(<rect>)'  */
export function updateCameraFocusRect(focusRect: FocusRect, settings: FocusRectSettings, dt: number, camera: PerspectiveCamera, renderer: WebGLRenderer) {

    if (focusRect instanceof Element) {
        if(debug && focusRect instanceof HTMLElement) {
            focusRect.style.outline = "2px dashed rgba(255, 150, 0, .8)";
        }
        focusRect = focusRect.getBoundingClientRect();
    }
    rendererRect = renderer.domElement.getBoundingClientRect();

    const rect = overlapRect;
    rect.x = focusRect.x;
    rect.y = focusRect.y;
    rect.width = focusRect.width;
    rect.height = focusRect.height;

    rect.x -= rendererRect.x;
    rect.y -= rendererRect.y;

    const sourceWidth = rendererRect.width;
    const sourceHeight = rendererRect.height;

    const view = camera.view as PerspectiveCamera["view"];

    // Apply zoom
    const zoom = settings.zoom;
    let offsetX = view?.offsetX || 0;
    let offsetY = view?.offsetY || 0;

    let width = rendererRect.width;
    let height = rendererRect.height;
    width /= zoom;
    height /= zoom;
    offsetX = width * (zoom - 1) * .5;
    offsetY = height * (zoom - 1) * .5;

    const focusRectCenterX = rect.x + rect.width * .5;
    const focusRectCenterY = rect.y + rect.height * .5;
    const rendererCenterX = rendererRect.width * .5;
    const rendererCenterY = rendererRect.height * .5;

    const diffx = focusRectCenterX - rendererCenterX;
    const diffy = focusRectCenterY - rendererCenterY;
    offsetX -= diffx / zoom;
    offsetY -= diffy / zoom;
    if (settings.offsetX !== undefined) {
        offsetX += settings.offsetX * (rendererRect.width * .5);
    }
    if (settings.offsetY !== undefined) {
        offsetY -= settings.offsetY * (rendererRect.height * .5);
    }


    const currentOffsetX = view?.offsetX || offsetX;
    const currentOffsetY = view?.offsetY || offsetY;
    offsetX = Mathf.lerp(currentOffsetX, offsetX, dt);
    offsetY = Mathf.lerp(currentOffsetY, offsetY, dt);
    const currentWidth = view?.width || sourceWidth;
    const currentHeight = view?.height || sourceHeight;
    width = Mathf.lerp(currentWidth, width, dt);
    height = Mathf.lerp(currentHeight, height, dt);

    camera.setViewOffset(sourceWidth, sourceHeight, offsetX, offsetY, width, height);
    camera.updateProjectionMatrix();

    if (settings.damping > 0) {
        settings.damping *= (1.0 - dt);
        if (settings.damping < 0.01) settings.damping = 0;
        settings.damping = Math.max(0, settings.damping);
    }
}
