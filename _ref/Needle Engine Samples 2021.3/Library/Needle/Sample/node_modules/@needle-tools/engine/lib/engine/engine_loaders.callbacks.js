/** @internal */
export const registeredModelLoaderCallbacks = [];
/** @internal */
export const registeredMimetypeCallbacks = [];
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
export var NeedleEngineModelLoader;
(function (NeedleEngineModelLoader) {
    // export type Plugin = {
    //     readonly name: string;
    //     canLoad: (mimetype: string, url: string) => boolean,
    //     createLoader: (url: string, mimetype: string) => Promise<CustomLoader>,
    // }
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
    function onCreateCustomModelLoader(callback, opts) {
        const entry = { name: opts?.name, priority: opts?.priority ?? 0, callback };
        registeredModelLoaderCallbacks.push(entry);
        // sort plugins by priority. Higher priority first
        registeredModelLoaderCallbacks.sort((a, b) => {
            if (a.priority === b.priority)
                return 0;
            if (a.priority > b.priority)
                return -1;
            return 1;
        });
        return () => {
            const index = registeredModelLoaderCallbacks.indexOf(entry);
            if (index >= 0) {
                registeredModelLoaderCallbacks.splice(index, 1);
            }
        };
    }
    NeedleEngineModelLoader.onCreateCustomModelLoader = onCreateCustomModelLoader;
    /**
     * Register a callback to determine the mimetype of a file. This is to support custom loaders. The callback will provide the URL of the file to load + a range request response with the first few bytes of the file. The callback should return a mimetype or null if it does not want to handle the file.
     * @param callback The callback to register
     * @returns A function to unregister the callback
     *
     */
    function onDetermineModelMimetype(callback) {
        registeredMimetypeCallbacks.push(callback);
        return () => {
            const index = registeredMimetypeCallbacks.indexOf(callback);
            if (index >= 0) {
                registeredMimetypeCallbacks.splice(index, 1);
            }
        };
    }
    NeedleEngineModelLoader.onDetermineModelMimetype = onDetermineModelMimetype;
})(NeedleEngineModelLoader || (NeedleEngineModelLoader = {}));
//# sourceMappingURL=engine_loaders.callbacks.js.map