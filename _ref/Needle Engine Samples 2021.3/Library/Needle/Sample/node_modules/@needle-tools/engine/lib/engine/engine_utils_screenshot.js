import { Color, FrontSide, Mesh, MirroredRepeatWrapping, PerspectiveCamera, PlaneGeometry, ShaderLib, ShaderMaterial, SRGBColorSpace, Texture, UniformsUtils, WebGLRenderTarget } from "three";
import { GameObject } from "../engine-components/Component.js";
import { Renderer } from "../engine-components/Renderer.js";
import { WebARCameraBackground } from "../engine-components/webxr/WebARCameraBackground.js";
import { setAutoFitEnabled } from "./engine_camera.js";
import { getComponentsInChildren } from "./engine_components.js";
import { ContextRegistry } from "./engine_context_registry.js";
import { registerFrameEventCallback } from "./engine_lifecycle_functions_internal.js";
import { FrameEvent } from "./engine_setup.js";
import { DeviceUtilities } from "./engine_utils.js";
import { updateTextureFromXRFrame } from "./engine_utils_screenshot.xr.js";
import { RGBAColor } from "./js-extensions/index.js";
import { setCustomVisibility } from "./js-extensions/Layers.js";
/**
 * Take a screenshot from the current scene.
 * **NOTE**: Use {@link screenshot2} for more options.
 *
 * @param context The context to take the screenshot from
 * @param width The width of the screenshot
 * @param height The height of the screenshot
 * @param mimeType The mime type of the image
 * @param camera The camera to use for the screenshot
 * @returns The data url of the screenshot. Returns null if the screenshot could not be taken.
 * @example
 * ```ts
 * const dataUrl = screenshot();
 * saveImage(dataUrl, "screenshot.png");
 * ```
 */
export function screenshot(context, width, height, mimeType = "image/webp", camera) {
    return screenshot2({ context, width, height, mimeType, camera });
}
export function screenshot2(opts) {
    if (!opts)
        opts = {};
    const { transparent = false } = opts;
    let { mimeType, context, width, height, camera } = opts;
    if (!context) {
        context = ContextRegistry.Current;
        if (!context) {
            console.error("Can not save screenshot: No needle-engine context found or provided.");
            return null;
        }
    }
    if (!camera) {
        camera = context.mainCamera;
        if (!camera) {
            console.error("No camera found");
            return null;
        }
    }
    const renderer = context.renderer;
    const isXRScreenshot = renderer.xr.enabled && renderer.xr.isPresenting;
    // Perform XR screenshot in onBeforeRender (after the screenshot we want to render the original camera view)
    // If we do it in onAfterRender we will see one frame of a wrong image which is not what we want
    if (isXRScreenshot && context.currentFrameEvent != FrameEvent.EarlyUpdate) {
        console.warn("Screenshot: defer to access XR frame");
        const ret = new Promise(resolve => {
            registerFrameEventCallback(_ => {
                // TODO: why is the return type not correct?
                const screenshotResult = screenshot2(opts);
                resolve(screenshotResult);
            }, FrameEvent.EarlyUpdate, { once: true });
        });
        /** @ts-expect-error */
        return ret;
    }
    const domElement = renderer.domElement;
    const prevWidth = domElement.width;
    const prevHeight = domElement.height;
    if (!width)
        width = prevWidth;
    if (!height)
        height = prevHeight;
    const renderWidth = width;
    const renderHeight = height;
    // Apply page zoom
    let zoomLevel = (window.devicePixelRatio || 1);
    let contextZoomLevel = 1;
    // Apply context zoom level
    if (context.devicePixelRatio === 'auto' || context.devicePixelRatio === 'manual')
        contextZoomLevel = 1;
    else
        contextZoomLevel = context.devicePixelRatio / window.devicePixelRatio;
    zoomLevel *= contextZoomLevel;
    width /= zoomLevel;
    height /= zoomLevel;
    width = Math.floor(width);
    height = Math.floor(height);
    // save XR state and reset it for screenshot
    const xrframe = renderer.xr.isPresenting && renderer.xr.getFrame();
    const previousXRState = renderer.xr.enabled;
    renderer.xr.enabled = false;
    renderer.xr.isPresenting = false;
    // reset style during screenshot
    domElement.style.width = `${width}px`;
    domElement.style.height = `${height}px`;
    const prevRenderTarget = renderer.getRenderTarget();
    const previousClearColor = renderer.getClearColor(new Color());
    const previousClearAlpha = renderer.getClearAlpha();
    const previousBackground = context.scene.background;
    const previousAspect = "aspect" in camera ? camera.aspect : null;
    try {
        // Calling onBeforeRender to update objects with reflection probes. https://linear.app/needle/issue/NE-5112
        const callRenderEvents = opts.render_events !== false;
        const renderers = new Array();
        if (callRenderEvents) {
            getComponentsInChildren(context.scene, Renderer, renderers);
            renderers.forEach(r => {
                r?.onBeforeRender();
                if (r.isInstancingActive && r.instances) {
                    for (let i = 0; i < r.instances?.length; i++) {
                        const handle = r.instances[i];
                        setCustomVisibility(handle.object, true);
                    }
                }
            });
        }
        if (transparent) {
            context.scene.background = null;
            renderer.setClearColor(0x000000, 0);
        }
        if (opts.background) {
            context.scene.background = null;
            renderer.setClearColor(opts.background);
            if (opts.background instanceof RGBAColor) {
                renderer.setClearAlpha(opts.background.a);
            }
        }
        if (transparent) {
            renderer.setClearAlpha(0);
        }
        // set the desired output size
        renderer.setSize(width, height, false);
        // If a camera component was provided
        if ("cam" in camera) {
            camera = camera.threeCamera;
        }
        // update the camera aspect and matrix
        if (camera instanceof PerspectiveCamera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        const textureOutput = "type" in opts && opts.type === "texture";
        let targetTexture = null;
        if (textureOutput) {
            targetTexture = new WebGLRenderTarget(width, height, {
                wrapS: MirroredRepeatWrapping,
                wrapT: MirroredRepeatWrapping,
                format: 1023,
            });
            renderer.setRenderTarget(targetTexture);
        }
        let outputCanvas = domElement;
        if (isXRScreenshot) {
            // Special rendering path since in XR rendering doesn't go into the domElement
            // and we also want to composite the camera-access image if available.
            if (targetTexture) {
                console.error('Taking XR screenshots with { type: "texture" } is currently not supported.');
            }
            // Note: this method must be invoked during the render loop when we get the XR frame
            outputCanvas = InternalScreenshotUtils.compositeWithCameraImage({
                width: renderWidth,
                height: renderHeight,
                scene: context.scene,
                camera: camera,
                renderer: renderer,
            });
        }
        else {
            // Render normally, as we can just use the domElement for rendering
            context.renderNow(camera || null);
        }
        // restore
        if (camera instanceof PerspectiveCamera && previousAspect != null) {
            camera.aspect = previousAspect;
            camera.updateProjectionMatrix();
        }
        if (callRenderEvents)
            renderers.forEach(r => r.onAfterRender());
        if (!mimeType) {
            if ("download_filename" in opts && opts.download_filename) {
                const ext = opts.download_filename.split(".").pop()?.toLowerCase();
                switch (ext) {
                    case "png":
                        mimeType = "image/png";
                        break;
                    case "jpg":
                    case "jpeg":
                        mimeType = "image/jpeg";
                        break;
                    case "webp":
                        mimeType = "image/webp";
                        break;
                }
            }
        }
        if (transparent && opts.trim === true) {
            const trimmed = trimCanvas(outputCanvas);
            if (trimmed)
                outputCanvas = trimmed;
        }
        if ("type" in opts) {
            if (opts.type === "texture") {
                if (!targetTexture) {
                    console.error("No target texture found");
                    return null;
                }
                if (opts.target) {
                    opts.target.image = targetTexture?.texture.image;
                    opts.target.needsUpdate = true;
                }
                targetTexture.texture.offset.set(0, -1);
                targetTexture.texture.needsUpdate = true;
                return targetTexture.texture;
            }
            else if (opts.type === "blob") {
                const promise = new Promise((resolve, _) => {
                    outputCanvas.toBlob(blob => {
                        resolve(blob);
                    }, mimeType);
                });
                return promise;
            }
            else if (opts.type === "share") {
                const promise = new Promise((resolve, _) => {
                    outputCanvas.toBlob(blob => {
                        if (blob && "share" in navigator) {
                            let mimetype = "file_type" in opts ? opts.file_type || mimeType : mimeType;
                            if (!mimeType) {
                                mimetype = "image/png";
                            }
                            const ext = mimetype?.split("/")[1] || "png";
                            const file = new File([blob], "filename" in opts ? opts.filename || `screenshot.${ext}` : `screenshot.${ext}`, { type: mimetype });
                            return navigator.share({
                                title: "title" in opts ? opts.title : undefined,
                                text: "text" in opts ? opts.text : undefined,
                                url: "url" in opts ? opts.url : undefined,
                                files: [file],
                            })
                                .catch(err => {
                                console.warn("User cancelled share", err.message);
                            })
                                .finally(() => {
                                resolve({ blob, shared: true });
                            });
                        }
                        return {
                            blob: blob,
                            shared: false
                        };
                    }, mimeType);
                });
                return promise;
            }
        }
        const dataUrl = outputCanvas.toDataURL(mimeType);
        if ("download_filename" in opts && opts.download_filename) {
            let download_name = opts.download_filename;
            // On mobile we don't want to see the dialogue for every screenshot
            if (DeviceUtilities.isMobileDevice() && typeof window !== "undefined") {
                const key = download_name + "_screenshots";
                const parts = download_name.split(".");
                const ext = parts.pop()?.toLowerCase();
                let count = 0;
                if (localStorage.getItem(key)) {
                    count = parseInt(sessionStorage.getItem(key) || "0");
                }
                if (count > 0) {
                    // const timestamp = new Date().toLocaleString();
                    download_name = `${parts.join()}-${count}.${ext}`;
                }
                count += 1;
                sessionStorage.setItem(key, count.toString());
            }
            saveImage(dataUrl, download_name);
        }
        return dataUrl;
    }
    finally {
        renderer.setRenderTarget(prevRenderTarget);
        context.scene.background = previousBackground;
        renderer.setSize(prevWidth, prevHeight, false);
        renderer.setClearColor(previousClearColor, previousClearAlpha);
        // Make sure to reset the aspect ratio. This is crucial if the main camera is not the currently active rendering camera
        // For example if we did a screenshot from a different camera that has a different aspect ratio / fov
        if (previousAspect != null && camera instanceof PerspectiveCamera) {
            camera.aspect = previousAspect;
            camera.updateProjectionMatrix();
        }
        renderer.xr.enabled = previousXRState;
        renderer.xr.isPresenting = isXRScreenshot;
        if (!isXRScreenshot)
            context.updateSize(true);
    }
    return null;
}
// trim to transparent pixels
function trimCanvas(originalCanvas) {
    if (!("document" in globalThis))
        return null;
    // Copy the original canvas to a new canvas
    const canvas = document.createElement('canvas');
    canvas.width = originalCanvas.width;
    canvas.height = originalCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return null;
    ctx.drawImage(originalCanvas, 0, 0);
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    // Calculate the bounding box of non-transparent pixels
    let top = height, left = width, bottom = 0, right = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const alpha = data[index + 3];
            if (alpha !== 0) {
                if (x < left)
                    left = x;
                if (x > right)
                    right = x;
                if (y < top)
                    top = y;
                if (y > bottom)
                    bottom = y;
            }
        }
    }
    // Create new canvas with trimmed dimensions
    const trimmedWidth = right - left + 1;
    const trimmedHeight = bottom - top + 1;
    const trimmedCanvas = document.createElement('canvas');
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx)
        return null;
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    // Draw the trimmed area onto the new canvas
    trimmedCtx.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
    return trimmedCanvas;
}
let saveImageElement = null;
/** Download a image (must be a data url).
 * @param dataUrl The data url of the image
 * @param filename The filename of the image
 * @example
 * ```ts
 * const dataUrl = screenshot();
 * saveImage(dataUrl, "screenshot.png");
 * ```
 */
export function saveImage(dataUrl, filename) {
    if (!dataUrl) {
        return;
    }
    if (!dataUrl.startsWith("data:image")) {
        console.error("Can not save image: Data url is not an image", dataUrl);
        return;
    }
    if (!saveImageElement) {
        saveImageElement = document.createElement("a");
    }
    saveImageElement.href = dataUrl;
    saveImageElement.download = filename;
    saveImageElement.click();
}
export var InternalScreenshotUtils;
(function (InternalScreenshotUtils) {
    let backgroundPlane = null;
    let otherPlaneMesh = null;
    let rtTexture = null;
    let threeTexture = null;
    let customCanvas = null;
    /**
     * Screenshot rendering for AR
     * @param args
     * @returns The canvas with the screenshot
     */
    function compositeWithCameraImage(args) {
        const { renderer, width, height } = args;
        const prevXREnabled = renderer.xr.enabled;
        const prevRT = renderer.getRenderTarget();
        const prevAutoClear = renderer.autoClear;
        // Initialize the render target and canvas. Width and height should already take DPI into account
        const expectedWidth = width;
        const expectedHeight = height;
        const aspect = width / height;
        if (!rtTexture || rtTexture.width !== expectedWidth || rtTexture.height !== expectedHeight) {
            rtTexture ??= new WebGLRenderTarget(expectedWidth, expectedHeight, { colorSpace: SRGBColorSpace });
            rtTexture.width = expectedWidth;
            rtTexture.height = expectedHeight;
            rtTexture.samples = 4;
            // necessary to match texture orientation from the exported meshes it seems
            rtTexture.texture.repeat.y = -1;
            rtTexture.texture.offset.y = 1;
        }
        if (!customCanvas || customCanvas.width !== expectedWidth || customCanvas.height !== expectedHeight) {
            customCanvas = document.createElement('canvas');
            customCanvas.width = expectedWidth;
            customCanvas.height = expectedHeight;
            customCanvas.style.position = "fixed";
            customCanvas.style.top = "0px";
            customCanvas.style.right = "0px";
            customCanvas.style.width = "300px";
            customCanvas.style.height = `${300 / aspect}px`;
            customCanvas.style.zIndex = "1000";
            customCanvas.style.pointerEvents = "none";
            customCanvas.style.opacity = "1.0";
            customCanvas.style.willChange = "contents";
        }
        if (!backgroundPlane) {
            backgroundPlane = makeFullscreenPlane({
                defines: {
                    DECODE_VIDEO_TEXTURE: true
                },
            });
        }
        if (!otherPlaneMesh) {
            otherPlaneMesh = makeFullscreenPlane();
        }
        if (!threeTexture) {
            threeTexture = new Texture();
        }
        const manager = renderer.xr;
        manager.updateCamera(args.camera);
        // adjust aspect on currentCamera
        // doesn't seem to be necessary since updateCamera
        // if (args.camera.type === "PerspectiveCamera") {
        //     const cam = args.camera as PerspectiveCamera;
        //     cam.aspect = aspect;
        //     cam.updateProjectionMatrix();
        // }
        renderer.xr.enabled = false;
        renderer.autoClear = false;
        renderer.clear();
        renderer.setSize(expectedWidth, expectedHeight);
        renderer.setRenderTarget(rtTexture);
        // First we update the render texture which will hold the camera image
        if (!updateTextureFromXRFrame(args.renderer, threeTexture)) {
            console.error("Could not update texture from XR frame");
        }
        const camBg = GameObject.findObjectOfType(WebARCameraBackground);
        if (camBg) {
            // the scene uses WebARCameraBackground, so we make sure it has the latest camera-access texture
            camBg.setTexture(threeTexture);
        }
        else {
            // the scene doesn't use WebARCameraBackground, so we render the camera feed fullscreen
            backgroundPlane.setTexture(threeTexture);
            renderer.render(backgroundPlane, args.camera);
        }
        renderer.clearDepth();
        renderer.setSize(expectedWidth, expectedHeight);
        renderer.render(args.scene, args.camera);
        // Blit the render texture first into our renderer on the GPU,
        // then into a canvas so we can process it further on the CPU
        renderer.setRenderTarget(null);
        otherPlaneMesh.setTexture(rtTexture.texture);
        renderer.render(otherPlaneMesh, args.camera);
        const _context = customCanvas.getContext('2d', { alpha: false });
        _context.drawImage(renderer.domElement, 0, 0, customCanvas.width, customCanvas.height);
        renderer.setRenderTarget(prevRT);
        renderer.xr.enabled = prevXREnabled;
        renderer.autoClear = prevAutoClear;
        return customCanvas;
    }
    InternalScreenshotUtils.compositeWithCameraImage = compositeWithCameraImage;
    const backgroundFragment = /* glsl */ `
uniform sampler2D t2D;
varying vec2 vUv;

void main() {

    vec4 texColor = texture2D( t2D, vUv );

    #ifdef DECODE_VIDEO_TEXTURE

        // inline sRGB decode (TODO: Remove this code when https://crbug.com/1256340 is solved)
        texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );

    #endif

    gl_FragColor = texColor;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
    function makeFullscreenPlane(options) {
        const planeMaterial = options?.material || new ShaderMaterial({
            name: 'BackgroundMaterial',
            uniforms: UniformsUtils.clone(ShaderLib.background.uniforms),
            vertexShader: ShaderLib.background.vertexShader,
            fragmentShader: backgroundFragment,
            defines: options?.defines,
            side: FrontSide,
            depthTest: false,
            depthWrite: false,
            fog: false
        });
        // add "map" material property so the renderer can evaluate it like for built-in materials
        Object.defineProperty(planeMaterial, 'map', {
            get: function () {
                return this.threeTexture;
            }
        });
        const planeMesh = new Mesh(new PlaneGeometry(2, 2), planeMaterial);
        setAutoFitEnabled(planeMesh, false);
        planeMesh.geometry.deleteAttribute('normal');
        // Option 1: add the planeMesh to our scene for rendering.
        // This is useful for applying custom shader effects on the background (instead of using the system composite)
        planeMesh.renderOrder = -1000000; // render first
        // should be a class, for now lets just define a method for the weird way the texture needs to be set
        planeMesh.setTexture = function (texture) {
            planeMaterial.uniforms.t2D.value = texture;
        };
        return planeMesh;
    }
    InternalScreenshotUtils.makeFullscreenPlane = makeFullscreenPlane;
})(InternalScreenshotUtils || (InternalScreenshotUtils = {}));
//# sourceMappingURL=engine_utils_screenshot.js.map