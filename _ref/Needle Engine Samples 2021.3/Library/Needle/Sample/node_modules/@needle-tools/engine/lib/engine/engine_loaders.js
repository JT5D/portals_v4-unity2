import { BufferGeometry, Color, Mesh, MeshStandardMaterial, Object3D } from "three";
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { showBalloonMessage } from "./debug/index.js";
import { getLoader, registerLoader } from "./engine_gltf.js";
import { createBuiltinComponents, writeBuiltinComponentData } from "./engine_gltf_builtin_components.js";
import { registeredModelLoaderCallbacks } from "./engine_loaders.callbacks.js";
import * as loaders from "./engine_loaders.gltf.js";
import { registerPrewarmObject } from "./engine_mainloop_utils.js";
import { Context } from "./engine_setup.js";
import { postprocessFBXMaterials } from "./engine_three_utils.js";
import { isGLTFModel } from "./engine_types.js";
import * as utils from "./engine_utils.js";
import { tryDetermineMimetypeFromURL } from "./engine_utils_format.js";
import { invokeLoadedImportPluginHooks, registerComponentExtension, registerExtensions } from "./extensions/extensions.js";
/** @internal */
export class NeedleLoader {
    createBuiltinComponents(context, gltfId, gltf, seed, extension) {
        return createBuiltinComponents(context, gltfId, gltf, seed, extension);
    }
    writeBuiltinComponentData(comp, context) {
        return writeBuiltinComponentData(comp, context);
    }
    parseSync(context, data, path, seed) {
        return parseSync(context, data, path, seed);
    }
    loadSync(context, url, sourceId, seed, prog) {
        return loadSync(context, url, sourceId, seed, prog);
    }
}
registerLoader(NeedleLoader); // Register the loader
const printGltf = utils.getParam("printGltf") || utils.getParam("printgltf");
const debugFileTypes = utils.getParam("debugfileformat");
async function onCreateLoader(url, context, sourceId) {
    const type = await tryDetermineMimetypeFromURL(url, { useExtension: true }) || "unknown";
    if (debugFileTypes)
        console.debug(`Determined file type: '${type}' for url '${url}'`, { registeredModelLoaderCallbacks });
    for (const entry of registeredModelLoaderCallbacks) {
        const { callback } = entry;
        const loader = callback({ context, url, mimetype: type });
        if (loader instanceof Promise)
            await loader;
        if (loader) {
            console.debug(`Using custom loader (${entry.name || "unnamed"}) for ${type} at '${url}'`);
            return loader;
        }
    }
    switch (type) {
        case "unsupported":
            return null;
        default:
        case "unknown":
            {
                console.warn(`Unknown file type (${type}). Needle Engine will fallback to the GLTFLoader - To support more model formats please create a Needle loader plugin.\nUse import { NeedleEngineModelLoader } from \"@needle-tools/engine\" namespace to register your loader.`, url);
                const loader = new GLTFLoader();
                await registerExtensions(loader, context, url, sourceId);
                return loader;
            }
        case "model/fbx":
        case "model/vnd.autodesk.fbx":
            return new FBXLoader();
        case "model/obj":
            return new OBJLoader();
        case "model/vnd.usdz+zip":
        case "model/vnd.usd+zip":
        case "model/vnd.usda+zip":
            {
                console.warn(type.toUpperCase() + " files are not supported.");
                // return new USDZLoader();
                return null;
            }
        case "model/gltf+json":
        case "model/gltf-binary":
        case "model/vrm":
            {
                const loader = new GLTFLoader();
                await registerExtensions(loader, context, url, sourceId);
                return loader;
            }
    }
}
/**
 * Load a 3D model file from a remote URL
 * @param url URL to glTF, FBX or OBJ file
 * @param options
 * @returns A promise that resolves to the loaded model or undefined if the loading failed
 */
export function loadAsset(url, options) {
    return loadSync(options?.context || Context.Current, url, url, options?.seed || null, options?.onprogress);
}
/** Load a gltf file from a url. This is the core method used by Needle Engine to load gltf files. All known extensions are registered here.
 * @param context The current context
 * @param data The gltf data as string or ArrayBuffer
 * @param path The path to the gltf file
 * @param seed The seed for generating unique ids
 * @returns The loaded gltf object
 */
export async function parseSync(context, data, path, seed) {
    if (typeof path !== "string") {
        console.warn("Parse gltf binary without path, this might lead to errors in resolving extensions. Please provide the source path of the gltf/glb file", path, typeof path);
        path = "";
    }
    if (printGltf)
        console.log("Parse glTF", path);
    const loader = await onCreateLoader(path, context, path);
    if (!loader) {
        return undefined;
    }
    const { componentsExtension } = onBeforeLoad(loader, context);
    // Handle OBJ Loader
    if (loader instanceof OBJLoader) {
        if (typeof data !== "string") {
            data = new TextDecoder().decode(data);
        }
        const res = loader.parse(data);
        return await onAfterLoaded(loader, context, path, res, seed, componentsExtension);
    }
    // Handle any other loader that is not a GLTFLoader
    const isNotGLTF = !(loader instanceof GLTFLoader);
    if (isNotGLTF) {
        if (loader.parse === undefined) {
            console.error("Loader does not support parse");
            return undefined;
        }
        const res = loader.parse(data, path);
        return await onAfterLoaded(loader, context, path, res, seed, componentsExtension);
    }
    return new Promise((resolve, reject) => {
        try {
            // GltfLoader expects a base path for resolving referenced assets
            // https://threejs.org/docs/#examples/en/loaders/GLTFLoader.parse
            // so we make sure that "path" is never a file path
            let gltfLoaderPath = path.split("?")[0].trimEnd();
            // This assumes that the path is a FILE path and not already a directory
            // (it does not end with "/") – see https://linear.app/needle/issue/NE-6075
            // strip file from path
            const parts = gltfLoaderPath.split("/");
            // check if the last part is a /, otherwise remove it
            if (parts.length > 0 && parts[parts.length - 1] !== "")
                parts.pop();
            gltfLoaderPath = parts.join("/");
            if (!gltfLoaderPath.endsWith("/"))
                gltfLoaderPath += "/";
            loader.resourcePath = gltfLoaderPath;
            loader.parse(data, "", async (res) => {
                const model = await onAfterLoaded(loader, context, path, res, seed, componentsExtension);
                resolve(model);
            }, err => {
                console.error("Loading asset at \"" + path + "\" failed\n", err);
                resolve(undefined);
            });
        }
        catch (err) {
            console.error(err);
            reject(err);
        }
    });
}
/**
 * Load a gltf file from a url. This is the core method used by Needle Engine to load gltf files. All known extensions are registered here.
 * @param context The current context
 * @param url The url to the gltf file
 * @param sourceId The source id of the gltf file - this is usually the url
 * @param seed The seed for generating unique ids
 * @param prog A progress callback
 * @returns The loaded gltf object
 */
export async function loadSync(context, url, sourceId, seed, prog) {
    checkIfUserAttemptedToLoadALocalFile(url);
    // better to create new loaders every time
    // (maybe we can cache them...)
    // but due to the async nature and potentially triggering multiple loads at the same time
    // we need to make sure the extensions dont override each other
    // creating new loaders should not be expensive as well
    const loader = await onCreateLoader(url, context, sourceId);
    if (!loader) {
        return undefined;
    }
    const { componentsExtension } = onBeforeLoad(loader, context);
    // Handle any loader that is not a GLTFLoader
    if (!(loader instanceof GLTFLoader)) {
        const res = await loader.loadAsync(url, prog);
        return await onAfterLoaded(loader, context, url, res, seed, componentsExtension);
    }
    return new Promise((resolve, reject) => {
        try {
            loader.load(url, async (res) => {
                const model = await onAfterLoaded(loader, context, sourceId, res, seed, componentsExtension);
                resolve(model);
            }, evt => {
                prog?.call(loader, evt);
            }, err => {
                console.error("Loading asset at \"" + url + "\" failed\n", err);
                resolve(undefined);
            });
        }
        catch (err) {
            console.error(err);
            reject(err);
        }
    });
}
/** Call before loading a model */
function onBeforeLoad(loader, context) {
    const componentsExtension = registerComponentExtension(loader);
    if (loader instanceof GLTFLoader) {
        loaders.addDracoAndKTX2Loaders(loader, context);
    }
    return { componentsExtension };
}
/** Call after a 3d model has been loaded to compile shaders and construct the needle engine model structure with relevant metadata (if necessary) */
async function onAfterLoaded(loader, context, gltfId, model, seed, componentsExtension) {
    if (printGltf)
        console.warn("Loaded", gltfId, model);
    // Handle loader was registered but no model was returned - should not completely break the engine
    if (model == null) {
        console.error(`Loaded model is null '${gltfId}' - please make sure the loader is registered correctly`);
        return {
            scene: new Object3D(),
            animations: [],
            scenes: []
        };
    }
    else if (typeof model !== "object") {
        console.error(`Loaded model is not an object '${gltfId}' - please make sure the loader is registered correctly`);
        return {
            scene: new Object3D(),
            animations: [],
            scenes: []
        };
    }
    // Handle OBJ or FBX loader results
    if (model instanceof Object3D) {
        model = {
            scene: model,
            animations: model.animations,
            scenes: [model]
        };
    }
    // Handle STL loader results
    else if (model instanceof BufferGeometry) {
        const mat = new MeshStandardMaterial({
            color: new Color(0xdddddd)
        });
        const mesh = new Mesh(model, mat);
        model = {
            scene: mesh,
            animations: [],
            scenes: [mesh]
        };
    }
    else if (Array.isArray(model.scenes) === false) {
        console.error(`[Needle Engine] The loaded model object does not have a scenes property '${gltfId}' - please make sure the loader is registered correctly and three.js is not imported multiple times.`);
    }
    // Remove query parameters from gltfId
    if (gltfId.includes("?")) {
        gltfId = gltfId.split("?")[0];
    }
    // E.g. fbx material cleanup
    postprocessLoadedFile(loader, model);
    // load components
    if (isGLTFModel(model)) {
        invokeLoadedImportPluginHooks(gltfId, model, context);
        await getLoader().createBuiltinComponents(context, gltfId, model, seed, componentsExtension || undefined);
    }
    // Warmup the scene
    await compileAsync(model.scene, context, context.mainCamera);
    return model;
}
async function compileAsync(scene, context, camera) {
    if (!camera)
        camera = context.mainCamera;
    try {
        if (camera) {
            await context.renderer.compileAsync(scene, camera, context.scene)
                .catch(err => {
                console.warn(err.message);
            });
        }
        else
            registerPrewarmObject(scene, context);
    }
    catch (err) {
        console.warn(err?.message || err);
    }
}
function checkIfUserAttemptedToLoadALocalFile(url) {
    const fullurl = new URL(url, window.location.href).href;
    if (fullurl.startsWith("file://")) {
        const msg = "Hi - it looks like you are trying to load a local file which will not work. You need to use a webserver to serve your files.\nPlease refer to the documentation on <a href=\"https://fwd.needle.tools/needle-engine/docs/local-server\">https://docs.needle.tools</a> or ask for help in our <a href=\"https://discord.needle.tools\">discord community</a>";
        showBalloonMessage(msg);
        console.warn(msg);
    }
}
// function _downloadGltf(data: string | ArrayBuffer) {
//     if (typeof data === "string") {
//         const a = document.createElement("a") as HTMLAnchorElement;
//         a.href = data;
//         a.download = data.split("/").pop()!;
//         a.click();
//     }
//     else {
//         const blob = new Blob([data], { type: "application/octet-stream" });
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement("a") as HTMLAnchorElement;
//         a.href = url;
//         a.download = "download.glb";
//         a.click();
//     }
// }
/**
 * Postprocess the loaded file. This is used to apply any custom postprocessing to the loaded file.
 */
function postprocessLoadedFile(loader, model) {
    // assign animations of loaded glTF to all scenes
    if ("scenes" in model) {
        for (const scene of model.scenes) {
            if (scene && !scene.animations?.length) {
                for (const anim of model.animations) {
                    if (!scene.animations.includes(anim)) {
                        scene.animations.push(anim);
                    }
                }
            }
        }
    }
    if (loader instanceof FBXLoader || loader instanceof OBJLoader) {
        let obj = model;
        if (!(obj instanceof Object3D)) {
            obj = model.scene || model.scenes.find(s => s);
        }
        obj.traverse((child) => {
            const mesh = child;
            // See https://github.com/needle-tools/three.js/blob/b8df3843ff123ac9dc0ed0d3ccc5b568f840c804/examples/webgl_loader_multiple.html#L377
            if (mesh?.isMesh) {
                postprocessFBXMaterials(mesh, mesh.material);
            }
        });
    }
}
//# sourceMappingURL=engine_loaders.js.map