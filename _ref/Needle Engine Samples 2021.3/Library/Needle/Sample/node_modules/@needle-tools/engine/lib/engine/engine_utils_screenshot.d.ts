import { Camera, Color, ColorRepresentation, Mesh, Scene, ShaderMaterial, Texture, WebGLRenderer } from "three";
import { Context } from "./engine_setup.js";
import { ICamera } from "./engine_types.js";
import { RGBAColor } from "./js-extensions/index.js";
declare type ScreenshotImageMimeType = "image/webp" | "image/png" | "image/jpeg";
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
export declare function screenshot(context?: Context, width?: number, height?: number, mimeType?: ScreenshotImageMimeType, camera?: Camera | null): string | null;
/**
 * Options for the {@link screenshot2} function.
 */
export declare type ScreenshotOptions = {
    /**
     * The context to take the screenshot from. If not provided, the current context will be used.
     */
    context?: Pick<Context, "scene" | "renderer" | "mainCamera" | "renderNow" | "updateAspect" | "updateSize" | "currentFrameEvent" | "devicePixelRatio">;
    /**
     * The width of the screenshot - if not provided, the width of the current renderer will be used.
     */
    width?: number;
    /**
     * The height of the screenshot - if not provided, the height of the current renderer will be used.
     */
    height?: number;
    /**
     * The mime type of the image
     */
    mimeType?: ScreenshotImageMimeType;
    /**
     * The camera to use for the screenshot. If not provided, the main camera of the context will be used.
     */
    camera?: Camera | ICamera | null;
    /**
     * If true, the background will be transparent.
     */
    transparent?: boolean;
    /**
     * If true, the image will be trimmed to the non-transparent area. Has no effect if `transparent` is false.
     */
    trim?: boolean;
    /**
     * The background of the screenshot. If not provided, the currently set background of the renderer/scene will be used
     */
    background?: Color | RGBAColor | ColorRepresentation;
    /**
     * If true onBeforeRender and onAfterRender will be invoked on all renderers in the scene.
     * @default true
     */
    render_events?: boolean;
};
export declare type ScreenshotOptionsDataUrl = ScreenshotOptions & {
    /**
     * If set the screenshot will be downloaded using the provided filename.
     * NOTE: if you need more control you can manually download the returned image using {@link saveImage}
     * @default undefined
     */
    download_filename?: string;
};
export declare type ScreenshotOptionsTexture = ScreenshotOptions & {
    type: "texture";
    /**
     * If set the screenshot will be saved to the provided texture.
     * @default undefined
     */
    target?: Texture;
};
export declare type ScreenshotOptionsBlob = ScreenshotOptions & {
    type: "blob";
};
export declare type ScreenshotOptionsShare = ScreenshotOptions & {
    type: "share";
    filename?: string;
    file_type?: ScreenshotImageMimeType;
    title?: string;
    text?: string;
    url?: string;
};
declare type ScreenshotOptionsShareReturnType = {
    blob: Blob | null;
    shared: boolean;
};
/**
 * Take a screenshot from the current scene and return a {@link Texture}. This can applied to a surface in 3D space.
 * @param opts Provide `{ type: "texture" }` to get a texture instead of a data url.
 * @returns The texture of the screenshot. Returns null if the screenshot could not be taken.
 */
export declare function screenshot2(opts: ScreenshotOptionsTexture): Texture | null;
/**
 * Take a screenshot from the current scene.
 * @param opts
 * @returns The data url of the screenshot. Returns null if the screenshot could not be taken.
 * ```ts
 * const res = screenshot2({
 *    width: 1024,
 *   height: 1024,
 *  mimeType: "image/webp",
 * transparent: true,
 * })
 * // use saveImage to download the image
 * saveImage(res, "screenshot.webp");
 * ```
 */
export declare function screenshot2(opts: ScreenshotOptionsDataUrl): string | null;
/**
 * Take a screenshot asynchronously from the current scene.
 * @returns A promise that resolves with the blob of the screenshot. Returns null if the screenshot could not be taken.
 * @param {ScreenshotOptionsBlob} opts Set `{ type: "blob" }` to get a blob instead of a data url.
 */
export declare function screenshot2(opts: ScreenshotOptionsBlob): Promise<Blob | null>;
export declare function screenshot2(opts: ScreenshotOptionsShare): Promise<ScreenshotOptionsShareReturnType>;
/** Download a image (must be a data url).
 * @param dataUrl The data url of the image
 * @param filename The filename of the image
 * @example
 * ```ts
 * const dataUrl = screenshot();
 * saveImage(dataUrl, "screenshot.png");
 * ```
 */
export declare function saveImage(dataUrl: string | null, filename: string): void;
export declare namespace InternalScreenshotUtils {
    /**
     * Screenshot rendering for AR
     * @param args
     * @returns The canvas with the screenshot
     */
    export function compositeWithCameraImage(args: {
        scene: Scene;
        camera: Camera;
        renderer: WebGLRenderer;
        width: number;
        height: number;
    }): HTMLCanvasElement;
    type FullscreenPlane = Mesh & {
        setTexture: (texture: Texture) => void;
    };
    export function makeFullscreenPlane(options?: {
        material?: ShaderMaterial;
        defines?: {
            [key: string]: boolean | number;
        };
    }): FullscreenPlane;
    export {};
}
export {};
