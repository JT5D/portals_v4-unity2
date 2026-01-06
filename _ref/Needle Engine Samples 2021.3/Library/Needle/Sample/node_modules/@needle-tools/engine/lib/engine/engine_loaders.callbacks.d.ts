import { BufferGeometry, Object3D } from "three";
import { Context } from "./engine_setup.js";
import { CustomModel } from "./engine_types.js";
import { type NeedleMimetype } from "./engine_utils_format.js";
export type ValidLoaderReturnType = CustomModel | Object3D | BufferGeometry;
/** @internal */
export type CustomLoader = {
    /** The name of the loader. This is used for debugging purposes. */
    name?: string;
    /** Load the model from the given URL. This method should return a promise that resolves to the loaded model. */
    loadAsync: (url: string, onProgress?: ((event: ProgressEvent<EventTarget>) => void) | undefined) => Promise<ValidLoaderReturnType>;
    /** Load the model given a buffer. This method should return the loaded model. */
    parse: (buffer: ArrayBuffer | string, path: string) => ValidLoaderReturnType;
};
type CustomLoaderCallback = (args: {
    context: Context;
    url: string;
    mimetype: NeedleMimetype;
}) => CustomLoader | Promise<CustomLoader> | null | undefined | void;
/** @internal */
export declare const registeredModelLoaderCallbacks: Array<{
    name?: string;
    priority: number;
    callback: CustomLoaderCallback;
}>;
type MimetypeCallback = (args: {
    /** The URL of the file to load */
    url: string;
    /** The response of the range request with the first few bytes of the file (bytes are available in the 'args.bytes' property of this callback) */
    response: Response;
    /** The mimetype of the file as provided by the request header */
    contentType: string | null;
    /** The first few bytes of the file as a Uint8Array */
    bytes: Uint8Array;
}) => NeedleMimetype | null;
/** @internal */
export declare const registeredMimetypeCallbacks: Array<MimetypeCallback>;
/**
 * NeedleEngineModelLoader is a namespace that provides functions to register custom model loaders and mimetype callbacks.
 * It allows you to create custom loaders for specific file types and determine the mimetype of files based on their content.
 * @example
 * ```ts
 * import { NeedleEngineModelLoader } from "@needle-tools/engine";
 * import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
 *
 * NeedleEngineModelLoader.onCreateCustomModelLoader(args => {
 *    if (args.mimetype === "model/stl") {
 *       return new STLLoader();
 *  }
 * });
 *
 * NeedleEngineModelLoader.onDetermineModelMimetype((args) => {
 *   // detect stl mimetype
 *   const bytes = args.bytes;
 *   if (bytes[0] === 0x73 && bytes[1] === 0x74 && bytes[2] === 0x6c) {
 *      return "model/stl";
 *   }
 *   return null;
 * });
 * ```
 */
export declare namespace NeedleEngineModelLoader {
    type CustomLoaderOptions = {
        /** The name of the loader. This is used for debugging purposes. */
        name?: string;
        /**
         * The priority of the loader. Higher priority loaders will be called first.
         * @default 0
         */
        priority?: number;
    };
    /**
     * Register a custom loader callback. For every file that is requested this callback is called with the url and mimetype. It should return a custom loader or null if it does not want to handle the file.
     * @param callback The callback to register
     * @param opts Optional options for the loader (e.g. name, priority)
     * @returns A function to unregister the callback
     * @example
     * ```ts
     * import { onCreateModelLoader } from "@needle-tools/engine";
     * const unregister = onCreateModelLoader((url, mimetype) => {
     *     if (mimetype === "application/vnd.usdz+zip") {
     *         return new CustomLoader();
     *     }
     *     return null;
     * });
     * ```
     */
    export function onCreateCustomModelLoader(callback: CustomLoaderCallback, opts?: CustomLoaderOptions): () => void;
    /**
     * Register a callback to determine the mimetype of a file. This is to support custom loaders. The callback will provide the URL of the file to load + a range request response with the first few bytes of the file. The callback should return a mimetype or null if it does not want to handle the file.
     * @param callback The callback to register
     * @returns A function to unregister the callback
     *
     */
    export function onDetermineModelMimetype(callback: MimetypeCallback): (() => void);
    export {};
}
export {};
