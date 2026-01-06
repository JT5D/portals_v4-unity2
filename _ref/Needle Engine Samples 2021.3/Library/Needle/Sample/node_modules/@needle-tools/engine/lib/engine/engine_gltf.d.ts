import { SerializationContext } from "./engine_serialization_core.js";
import { Context } from "./engine_setup.js";
import type { ConstructorConcrete, GLTF, Model, SourceIdentifier, UIDProvider } from "./engine_types.js";
import { NEEDLE_components } from "./extensions/NEEDLE_components.js";
export interface INeedleGltfLoader {
    createBuiltinComponents(context: Context, gltfId: SourceIdentifier, gltf: GLTF, seed: number | null | UIDProvider, extension?: NEEDLE_components): Promise<void>;
    writeBuiltinComponentData(comp: object, context: SerializationContext): any;
    parseSync(context: Context, data: string | ArrayBuffer, path: string, seed: number | UIDProvider | null): Promise<Model | undefined>;
    loadSync(context: Context, url: string, sourceId: string, seed: number | UIDProvider | null, prog?: (prog: ProgressEvent) => void): Promise<Model | undefined>;
}
export declare function getLoader(): INeedleGltfLoader;
export declare function registerLoader<T extends INeedleGltfLoader>(loader: ConstructorConcrete<T>): void;
