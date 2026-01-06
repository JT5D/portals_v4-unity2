import { type INeedleGltfLoader } from "./engine_gltf.js";
import { SerializationContext } from "./engine_serialization_core.js";
import { Context } from "./engine_setup.js";
import { Model, type UIDProvider } from "./engine_types.js";
import { NEEDLE_components } from "./extensions/NEEDLE_components.js";
/** @internal */
export declare class NeedleLoader implements INeedleGltfLoader {
    createBuiltinComponents(context: Context, gltfId: string, gltf: any, seed: number | UIDProvider | null, extension?: NEEDLE_components | undefined): Promise<void>;
    writeBuiltinComponentData(comp: any, context: SerializationContext): object | null;
    parseSync(context: Context, data: string | ArrayBuffer, path: string, seed: number | UIDProvider | null): Promise<Model | undefined>;
    loadSync(context: Context, url: string, sourceId: string, seed: number | UIDProvider | null, prog?: ((ProgressEvent: any) => void) | undefined): Promise<Model | undefined>;
}
/**
 * Load a 3D model file from a remote URL
 * @param url URL to glTF, FBX or OBJ file
 * @param options
 * @returns A promise that resolves to the loaded model or undefined if the loading failed
 */
export declare function loadAsset(url: string, options?: {
    context?: Context;
    path?: string;
    seed?: number;
    onprogress?: (evt: ProgressEvent) => void;
}): Promise<Model | undefined>;
/** Load a gltf file from a url. This is the core method used by Needle Engine to load gltf files. All known extensions are registered here.
 * @param context The current context
 * @param data The gltf data as string or ArrayBuffer
 * @param path The path to the gltf file
 * @param seed The seed for generating unique ids
 * @returns The loaded gltf object
 */
export declare function parseSync(context: Context, data: string | ArrayBuffer, path: string, seed: number | UIDProvider | null): Promise<Model | undefined>;
/**
 * Load a gltf file from a url. This is the core method used by Needle Engine to load gltf files. All known extensions are registered here.
 * @param context The current context
 * @param url The url to the gltf file
 * @param sourceId The source id of the gltf file - this is usually the url
 * @param seed The seed for generating unique ids
 * @param prog A progress callback
 * @returns The loaded gltf object
 */
export declare function loadSync(context: Context, url: string, sourceId: string, seed: number | UIDProvider | null, prog?: (ProgressEvent: any) => void): Promise<Model | undefined>;
