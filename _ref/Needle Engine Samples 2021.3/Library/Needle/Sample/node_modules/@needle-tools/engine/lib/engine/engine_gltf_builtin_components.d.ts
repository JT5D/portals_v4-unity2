import "./codegen/register_types.js";
import { Object3D } from "three";
import { type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SerializationContext } from "./engine_serialization_core.js";
import { Context } from "./engine_setup.js";
import type { IComponent, SourceIdentifier, UIDProvider } from "./engine_types.js";
import { NEEDLE_components } from "./extensions/NEEDLE_components.js";
export declare function writeBuiltinComponentData(comp: IComponent, context: SerializationContext): object | null;
export declare function createBuiltinComponents(context: Context, gltfId: SourceIdentifier, gltf: GLTF & {
    children?: Array<Object3D>;
}, seed?: number | null | UIDProvider, extension?: NEEDLE_components): Promise<void>;
