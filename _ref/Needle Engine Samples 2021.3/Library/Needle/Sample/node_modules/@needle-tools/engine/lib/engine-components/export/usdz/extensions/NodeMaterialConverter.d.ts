import { Texture, Vector4 } from "three";
declare type TextureMap = {
    [name: string]: {
        texture: Texture;
        scale?: Vector4;
    };
};
type MeshPhysicalNodeMaterial = import("three/src/materials/nodes/MeshPhysicalNodeMaterial.js").default;
declare function buildNodeMaterial(nodeMaterial: MeshPhysicalNodeMaterial, materialName: string, textures: TextureMap): string;
export { buildNodeMaterial };
