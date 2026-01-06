import { Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, Texture, WebGLRenderer } from "three";

import { isDevEnvironment, showBalloonError } from "./debug/index.js";

// Adapted from WebARCameraBackground

/**
 * Assigns the camera feed to a texture - this must be called during the render loop
 */
export function updateTextureFromXRFrame(renderer: WebGLRenderer, target: Texture): boolean {

    const xrframe = renderer.xr.getFrame();

    if (!xrframe) {
        console.warn("No XRFrame available");
        return false;
    }


    // If camera feed is not present, then abort and hiden background
    const enabledFeatures = xrframe.session.enabledFeatures;
    if (enabledFeatures && !enabledFeatures.some(x => x === 'camera-access')) {
        console.error(`No camera feed available - please request the 'camera-access' feature before starting WebXR or add the ARCameraBackground component to your scene.

Example to request camera-access in global scope:
NeedleXRSession.onSessionRequestStart(evt => {
    evt.init.optionalFeatures = evt.init.optionalFeatures || [];
    evt.init.optionalFeatures.push('camera-access');
});
`);
        if (isDevEnvironment()) {
            showBalloonError("No camera feed available - please request the 'camera-access' feature before starting WebXR or add the ARCameraBackground component to your scene");
        }
        return false;
    }

    // https://chromium.googlesource.com/chromium/src/+/7c5ac3c0f95b97cf12be95a5c1c0a8ff163246d8/third_party/webxr_test_pages/webxr-samples/proposals/camera-access-barebones.html
    const pose = xrframe.getViewerPose(renderer.xr.getReferenceSpace()!);
    if (pose) {
        for (const view of pose.views) {
            // @ts-ignore
            if ('camera' in view && view.camera) {
                let binding = renderer.xr.getBinding();
                // not sure how / why this can be null, but we can recreate it here
                if (!binding) binding = new XRWebGLBinding(xrframe.session, renderer.getContext());

                if (binding) {
                    let glImage: WebGLTexture | null = null;
                    if ('getCameraImage' in binding) {

                        ensureTextureIsInitialized(renderer, target);

                        // discussion on exactly this:
                        // https://discourse.threejs.org/t/using-a-webgltexture-as-texture-for-three-js/46245/8
                        // HACK from https://stackoverflow.com/a/55084367 to inject a custom texture into three.js
                        const texProps = renderer.properties.get(target) as { __webglTexture: WebGLTexture | null };
                        if (texProps) {
                            // @ts-ignore
                            glImage = binding.getCameraImage(view.camera);
                            texProps.__webglTexture = glImage;
                            return true;
                        }
                        else {
                            console.warn("No texture properties found for target texture");
                        }
                    }
                }
                else {
                    console.error(view.camera, renderer.xr)
                }
            }
            else {
                console.error("NO CAMERA IN VIEW")
            }
        }
    }
    else {
        console.error(renderer.xr.getReferenceSpace(), xrframe);
    }

    return false;
}


const initcache = new WeakMap<Texture, WeakSet<WebGLRenderer>>();

function ensureTextureIsInitialized(renderer: WebGLRenderer, texture: Texture) {
    // ensure the texture is initialized
    const inits = initcache.get(texture) || new WeakSet();
    if (inits.has(renderer)) {
        return;
    }
    inits.add(renderer);
    initcache.set(texture, inits);

    console.debug("Initialize texture for camera feed");
    const material = new MeshBasicMaterial();
    const geometry = new PlaneGeometry();
    const scene = new Scene();
    scene.add(new Mesh(geometry, material));
    const camera = new PerspectiveCamera();
    material.map = texture;
    renderer.render(scene, camera);
};