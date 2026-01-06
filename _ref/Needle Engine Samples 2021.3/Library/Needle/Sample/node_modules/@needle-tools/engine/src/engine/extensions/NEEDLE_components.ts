import { Object3D } from "three";
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { type GLTF, type GLTFLoaderPlugin, GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";

import { isDevEnvironment } from "../debug/debug.js";
import { builtinComponentKeyName } from "../engine_constants.js";
import { debugExtension } from "../engine_default_parameters.js";
import { getLoader } from "../engine_gltf.js";
import { type NodeToObjectMap, type ObjectToNodeMap, SerializationContext } from "../engine_serialization_core.js";
import { apply } from "../js-extensions/index.js";
import { maskGltfAssociation, resolveReferences } from "./extension_utils.js";

export const debug = debugExtension
const componentsArrayExportKey = "$___Export_Components";

export const EXTENSION_NAME = "NEEDLE_components";

class ExtensionData {
    [builtinComponentKeyName]?: Array<Record<string, any> | null>
}

class ExportData {
    node: Object3D;
    nodeIndex: number;
    nodeDef: any;

    constructor(node: Object3D, nodeIndex: number, nodeDef: any) {
        this.node = node;
        this.nodeIndex = nodeIndex;
        this.nodeDef = nodeDef;
    }
}

export class NEEDLE_components implements GLTFLoaderPlugin {

    get name(): string {
        return EXTENSION_NAME;
    }
    // #region export
    exportContext!: { [nodeIndex: number]: ExportData };
    objectToNodeMap: ObjectToNodeMap = {};
    context!: SerializationContext;
    writer?: any;

    registerExport(exp: GLTFExporter) {
        //@ts-ignore
        exp.register(writer => {
            // we want to hook into BEFORE user data is written
            // because we want to remove the components list (circular references)
            // and replace them with the serialized data
            // the write node callback is called after user data is serialized
            // we could also traverse everything before export and remove components
            // but doing it like that we avoid traversing multiple times
            if ("serializeUserData" in writer) {
                //@ts-ignore
                const originalFunction = writer.serializeUserData.bind(writer);
                this.writer = writer;
                //@ts-ignore
                writer.serializeUserData = (o, def) => {
                    try {
                        const hadUserData = this.serializeUserData(o, def);
                        if (hadUserData)
                            //@ts-ignore
                            writer.extensionsUsed[this.name] = true;
                        originalFunction(o, def);
                    }
                    finally {
                        this.afterSerializeUserData(o, def);
                    }
                }
            }
            return this;
        });
    }

    beforeParse() {
        this.exportContext = {};
        this.objectToNodeMap = {};
    }

    // https://github.com/mrdoob/three.js/blob/efbfc67edc7f65cfcc61a389ffc5fd43ea702bc6/examples/jsm/exporters/GLTFExporter.js#L532
    serializeUserData(node: Object3D, _nodeDef: any): boolean {
        const components = node.userData?.components;
        if (!components || components.length <= 0) return false;
        // delete components before serializing user data to avoid circular references
        delete node.userData.components;
        node[componentsArrayExportKey] = components;
        return true;
    }

    afterSerializeUserData(node: Object3D, _nodeDef) {
        if (node.type === "Scene") {
            if (debug)
                console.log("DONE", JSON.stringify(_nodeDef));
        }
        // reset userdata
        if (node[componentsArrayExportKey] === undefined) return;
        const components = node[componentsArrayExportKey];
        delete node[componentsArrayExportKey];
        if (components !== null) {
            node.userData.components = components;
        }

        // console.log(_nodeDef, _nodeDef.mesh);
    }

    writeNode(node: Object3D, nodeDef) {
        const nodeIndex = this.writer.json.nodes.length;
        if (debug)
            console.log(node.name, nodeIndex, node.uuid);
        const context = new ExportData(node, nodeIndex, nodeDef);
        this.exportContext[nodeIndex] = context;
        this.objectToNodeMap[node.uuid] = nodeIndex;
    };

    afterParse(input) {
        if (debug)
            console.log("AFTER", input);
        for (const i in this.exportContext) {
            const context = this.exportContext[i];
            const node = context.node;
            const nodeDef = context.nodeDef;
            const nodeIndex = context.nodeIndex;

            const components = node.userData?.components;
            if (!components || components.length <= 0) continue;
            // create data container
            const data: ExtensionData = new ExtensionData();
            nodeDef.extensions = nodeDef.extensions || {};
            nodeDef.extensions[this.name] = data;
            this.context.object = node;
            this.context.nodeId = nodeIndex;
            this.context.objectToNode = this.objectToNodeMap;

            const serializedComponentData: Array<object | null> = [];
            for (const comp of components) {
                this.context.target = comp;
                const res = getLoader().writeBuiltinComponentData(comp, this.context);
                if (res !== null) {
                    serializedComponentData.push(res);
                    // (comp as unknown as ISerializationCallbackReceiver)?.onAfterSerialize?.call(comp);
                }
            }
            if (serializedComponentData.length > 0) {
                data[builtinComponentKeyName] = serializedComponentData;
                if (debug)
                    console.log("DID WRITE", node, "nodeIndex", nodeIndex, serializedComponentData);
            }
        }
    }



    // -------------------------------------
    // #region import 
    parser?: GLTFParser;
    nodeToObjectMap: NodeToObjectMap = {};
    /** The loaded gltf */
    gltf: GLTF | null = null;


    beforeRoot() {
        if (debug)
            console.log("BEGIN LOAD");
        this.nodeToObjectMap = {};
        return null;
    }

    async afterRoot(result: GLTF): Promise<void> {
        this.gltf = result;

        const parser = result.parser;
        const ext = parser?.extensions;
        if (!ext) return;
        const hasExtension = ext[this.name];
        if (debug) console.log("After root", result, this.parser, ext);

        const loadComponents: Array<Promise<void>> = [];
        if (hasExtension === true) {
            const nodes = parser.json.nodes;
            if (nodes) {
                for (let i = 0; i < nodes.length; i++) {
                    const obj = await parser.getDependency('node', i);
                    this.nodeToObjectMap[i] = obj;
                }

                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    const index = i;// node.mesh;
                    const ext = node.extensions;
                    if (!ext) continue;
                    const data = ext[this.name];
                    if (!data) continue;
                    if (debug)
                        console.log("NODE", node);
                    const obj = this.nodeToObjectMap[index];
                    if (!obj) {
                        console.error("Could not find object for node index: " + index, node, parser);
                        continue;
                    }

                    apply(obj);

                    loadComponents.push(this.createComponents(result, node, obj, data));
                }
            }
        }
        await Promise.all(loadComponents);


        for (const instance of parser.associations.keys()) {
            const value = parser.associations.get(instance);
            if (value?.materials != undefined) {
                const key = "/materials/" + value.materials;
                maskGltfAssociation(instance, key);
            }
        }
    }

    private async createComponents(result: GLTF, node: Node, obj: Object3D, data: ExtensionData) {
        if (!data) return;
        const componentData = data[builtinComponentKeyName];
        if (componentData) {
            const tasks = new Array<Promise<any>>();
            if (debug)
                console.log(obj.name, componentData);
            for (const i in componentData) {
                const data = componentData[i];

                if (debug) console.log("Serialized data", JSON.parse(JSON.stringify(data)));

                // Fix for https://linear.app/needle/issue/NE-6779/blender-export-has-missing-sharedmaterials
                if (data?.name === "MeshRenderer" || data?.name === "SkinnedMeshRenderer") {
                    if (!data.sharedMaterials) {
                        let success = false;
                        if ("mesh" in node) {
                            const meshIndex = node.mesh;
                            if (typeof meshIndex === "number" && result.parser) {
                                const meshDef = result.parser.json.meshes?.[meshIndex];
                                if (meshDef?.primitives) {
                                    data.sharedMaterials =  meshDef.primitives.map(prim => {
                                        return "/materials/" + (prim.material ?? 0);
                                    });
                                    success = true;
                                }
                            }
                        }
                        if(!success && (debug || isDevEnvironment())) {
                            console.warn(`[NEEDLE_components] Component '${data.name}' on object '${obj.name}' is not added to a mesh or failed to retrieve materials from glTF.`);
                        }
                    }
                }

                if (data && this.parser) {
                    tasks.push(
                        resolveReferences(this.parser, data)
                            .catch(e => console.error(`Error while resolving references (see console for details)\n`, e, obj, data))
                    );
                }

                obj.userData = obj.userData || {};
                obj.userData[builtinComponentKeyName] = obj.userData[builtinComponentKeyName] || [];
                obj.userData[builtinComponentKeyName].push(data);
            }
            await Promise.all(tasks).catch((e) => {
                console.error("Error while loading components", e);
            });
        }
    }

    // parse function https://github.com/mrdoob/three.js/blob/efbfc67edc7f65cfcc61a389ffc5fd43ea702bc6/examples/jsm/loaders/GLTFLoader.js#L2290


    // createNodeAttachment(nodeIndex: number): null {
    //     // if(!this.parser){
    //     //     console.error("Parser not set, call registerLoad with on this");
    //     //     return null;
    //     // }
    //     // const node = this.parser.json.nodes[nodeIndex];
    //     // const extenstions = node.extensions;
    //     // const data = extenstions && extenstions[this.name];
    //     // if (!data) return null;
    //     // const components = data[builtinComponentKeyName];
    //     // if (!components) return null;
    //     // console.log(components);
    //     return null;
    // }
}


