import { Object3D } from "three";
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { type GLTF, type GLTFLoaderPlugin, GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type NodeToObjectMap, type ObjectToNodeMap, SerializationContext } from "../engine_serialization_core.js";
export declare const debug: string | number | boolean;
export declare const EXTENSION_NAME = "NEEDLE_components";
declare class ExportData {
    node: Object3D;
    nodeIndex: number;
    nodeDef: any;
    constructor(node: Object3D, nodeIndex: number, nodeDef: any);
}
export declare class NEEDLE_components implements GLTFLoaderPlugin {
    get name(): string;
    exportContext: {
        [nodeIndex: number]: ExportData;
    };
    objectToNodeMap: ObjectToNodeMap;
    context: SerializationContext;
    writer?: any;
    registerExport(exp: GLTFExporter): void;
    beforeParse(): void;
    serializeUserData(node: Object3D, _nodeDef: any): boolean;
    afterSerializeUserData(node: Object3D, _nodeDef: any): void;
    writeNode(node: Object3D, nodeDef: any): void;
    afterParse(input: any): void;
    parser?: GLTFParser;
    nodeToObjectMap: NodeToObjectMap;
    /** The loaded gltf */
    gltf: GLTF | null;
    beforeRoot(): null;
    afterRoot(result: GLTF): Promise<void>;
    private createComponents;
}
export {};
